# V8 Audit Agent 8: PerfFeeStandardFacet Security Audit

**Date:** 2026-03-02
**Scope:** `contracts/src/facets/PerfFeeStandardFacet.sol` (252 lines)
**Auditor:** Claude Opus 4.6 (subagent 8)

## Summary

| Severity | Count |
|----------|-------|
| CRITICAL | 0 |
| HIGH | 3 |
| MEDIUM | 4 |
| LOW | 2 |
| INFO | 2 |
| **Total** | **11** |

---

## Findings

### V8-PFS-01: Risk Adjustor Fail-Open (E-BC31 Second Instance)

**Severity:** HIGH
**Category:** Logic Error / Fail-Open Design
**Location:** `src/facets/PerfFeeStandardFacet.sol` lines 140-156

**Description:**
The `_applyRiskAdjustor` function performs a `staticcall` to `address(this)` with a configurable `riskAdjustorSelector`. If the staticcall fails for any reason (selector not registered in Diamond, adjustor facet removed via Diamond cut, adjustor reverts due to bad data, return data too short), the function silently returns the original `gain` value unchanged. This is the exact E-BC31 pattern already documented in `NavManagementFacet` but now present in a second facet.

Failure modes include:
1. Adjustor facet removed from Diamond via `diamondCut` -- staticcall returns `success=false`
2. Adjustor function reverts (e.g., division by zero, bad storage) -- `success=false`
3. Adjustor returns less than 32 bytes -- `riskResult.length < 32` check fails
4. Adjustor returns a value > gain -- caught by `adjusted <= gain` check, falls through to `return gain`

In all cases, the risk adjustment is silently skipped and the full gain is used for fee calculation.

**Impact:**
If the risk adjustor is intended to reduce gain (e.g., for volatile or illiquid assets), any failure silently results in higher performance fees charged to investors. A manager who controls Diamond cuts could intentionally remove the risk adjustor facet to maximize their fees, with no on-chain evidence of the bypass.

**Recommendation:**
Change to fail-closed: if `riskAdjustorSelector != bytes4(0)` and the staticcall fails, revert with a descriptive error. Provide an explicit admin override (separate from removing the adjustor) if risk adjustment is to be intentionally disabled.

**Status:** OPEN

---

### V8-PFS-02: Empty perfFeeParams Causes Unrecoverable Panic

**Severity:** HIGH
**Category:** Input Validation
**Location:** `src/facets/PerfFeeStandardFacet.sol` lines 46-48

**Description:**
Line 48 performs `abi.decode(params, (uint16, uint256, uint16, uint16))` on the class's `perfFeeParams` bytes. This ABI decode expects exactly 128 bytes (32+32+32+32 after ABI encoding). If `perfFeeParams` is empty bytes (`""`) or shorter than 128 bytes, `abi.decode` will revert with a Solidity panic (0x41 or similar), not a meaningful custom error.

Looking at `FundManagementFacet._createShareClassInternalWithCurrency` (line 331), `perfFeeParams` is stored directly from caller input. The validation at line 281 only runs `if (perfFeeParams.length >= 72)`, meaning shorter params (including empty bytes) pass validation and are stored. If a class is created with `perfFeeSelector` pointing to `calcStandardPerfFee` but with empty or malformed `perfFeeParams`, any subsequent call to calculate performance fees for that class will panic.

The call chain is: `FeeManagementFacet.calculatePerformanceFees` -> staticcall to `calcStandardPerfFee` -> panic on `abi.decode`. The `calculatePerformanceFees` function catches the `staticcall` failure and reverts with `PerfFeeCalculationFailed`, so the system does not brick, but:
1. All fee calculations for that class fail permanently
2. `calculateRedemptionPerfFees` cannot proceed, blocking the dealing state machine at `AWAITS_FEE_PROCESSING`
3. The fund enters a deadlocked state where orders cannot be processed

**Impact:**
A misconfigured class (valid perfFeeSelector but empty/short perfFeeParams) permanently blocks the dealing pipeline for the entire fund, since `calculateRedemptionPerfFees` reverts and `dealingProcessState` never transitions past `AWAITS_FEE_PROCESSING`.

**Recommendation:**
Add a guard at the top of `calcStandardPerfFee`:
```solidity
if (params.length < 128) revert InvalidPerfFeeParams();
```
Also validate `perfFeeParams.length >= 128` in `FundManagementFacet` and `FeeManagementFacet.executeSetPerfFeeCalculator` when `perfFeeSelector != bytes4(0)`.

**Status:** OPEN

---

### V8-PFS-03: Unvalidated hurdleFundId Enables Manager-Controlled Hurdle Manipulation

**Severity:** HIGH
**Category:** Access Control / Input Validation
**Location:** `src/facets/PerfFeeStandardFacet.sol` lines 117-120, `src/facets/FeeManagementFacet.sol` lines 277-284

**Description:**
The `hurdleFundId` stored in `perfFeeParams` is a full `uint256` token ID that is never validated to be a legitimate, active fund. Validation in both `FundManagementFacet` (line 281) and `FeeManagementFacet.executeSetPerfFeeCalculator` (line 278) only checks that `hurdleFundId` and `fixedHurdleRateBps` are not both non-zero. There is no check that:
1. `hurdleFundId` refers to an existing fund (`baseInfo[hurdleFundId].createdAt > 0`)
2. `hurdleFundId` refers to a fund in the same umbrella (fund isolation)
3. `hurdleFundId` is not the fund's own ID (self-referencing hurdle)
4. The fund has price history

A manager can set `hurdleFundId` to:
- A non-existent fund ID: `_findPriceAtOrBefore` returns `(0, 0)` for both prices, `_calcHurdleReturn` returns 0, hurdle is effectively skipped, full gain above HWM is charged as fee.
- A fund they control with artificially flat or negative price history: hurdle return is 0 (line 178 `endPrice <= startPrice`), no hurdle deduction.
- Their own fund ID: the hurdle equals the fund's own return, which means `gain - hurdleGain` could be artificially reduced to zero (benefiting the investor only if the manager intentionally wants lower fees; more likely the manager controls the benchmark fund to keep it flat).

**Impact:**
A fund manager can set an arbitrary or non-existent hurdle fund ID to eliminate the hurdle rate entirely, charging maximum performance fees on all gain above HWM without any benchmark deduction. This is a direct economic attack on investors who expect benchmark-relative performance fees.

**Recommendation:**
Validate `hurdleFundId` at configuration time:
1. Check `baseInfo[hurdleFundId].createdAt > 0` (fund exists)
2. Check the hurdle fund belongs to the same umbrella (fund isolation)
3. Consider requiring the hurdle fund to have price history (`fundPrices.length > 0`)

**Status:** OPEN

---

### V8-PFS-04: First Fee Period Hurdle Skipped (fromTs == 0)

**Severity:** MEDIUM
**Category:** Logic Error
**Location:** `src/facets/PerfFeeStandardFacet.sol` lines 118, 122

**Description:**
For a newly created dealing, `lastPerfMintAtNavT` is initialized to 0 (default uint32). When `_applyHurdle` reads `fromTs = s.FundAdmin[0].dealings[dealingId].lastPerfMintAtNavT`, it gets 0 for the first fee period.

For the fund-based hurdle path (line 120): `_calcHurdleReturn(hurdleFundId, 0, toTs)` calls `_findPriceAtOrBefore(hurdleFundId, 0)`. Since `targetTimestamp = 0` is less than any recorded price timestamp (all > 0), the function returns `(0, 0)` at line 226. `_calcHurdleReturn` then returns 0 (line 177: `startPrice == 0`). The hurdle deduction is zero for the entire first fee period.

For the fixed hurdle path (line 124): `_calcFixedHurdleReturn(fixedRateBps, 0, toTs)` computes `elapsed = toTs - 0 = toTs`, which equals the entire time since Unix epoch. At current timestamps (~1.7 billion seconds, ~54 years), a 5% annual fixed hurdle would yield: `500 * 1.7e9 * 1e18 / (365 days * 10000)` which is approximately `500 * 1.7e9 / 315360000000 * 1e18 = 2.7e18` (270% hurdle return). This would likely exceed any realistic gain, so the hurdle would absorb all gain and `return 0` from `_applyHurdle`. This is the opposite problem: for fixed hurdle, the first period has an absurdly large hurdle that eliminates all fees.

**Impact:**
For fund-based hurdle: investors pay full performance fees without any hurdle deduction for the first fee period of every new dealing. For fixed hurdle: no fees are charged for the first period regardless of performance. Both outcomes are incorrect.

**Recommendation:**
Initialize `lastPerfMintAtNavT` to the dealing's creation timestamp (or the first NAV timestamp after dealing creation) when the dealing is created. Alternatively, handle `fromTs == 0` explicitly in `_applyHurdle` by using the dealing's `createdAt` timestamp from `baseInfo[dealingId].createdAt`.

**Status:** OPEN

---

### V8-PFS-05: Negative/Flat Benchmark Return Gives Zero Hurdle (Manager-Favorable)

**Severity:** MEDIUM
**Category:** Logic Error / Economic Design
**Location:** `src/facets/PerfFeeStandardFacet.sol` line 178

**Description:**
When the benchmark fund (hurdleFundId) has a negative or flat return (`endPrice <= startPrice`), `_calcHurdleReturn` returns 0. This means the full gain above HWM is charged as performance fee with no hurdle deduction.

In traditional fund management, when a benchmark declines while the fund gains, the outperformance is even larger than the absolute gain. The correct hurdle behavior depends on the fee agreement:
- **Absolute hurdle**: fund must gain more than X% -- current behavior is correct.
- **Relative hurdle (benchmark-relative)**: fund must outperform the benchmark -- when benchmark declines, this should benefit the manager (lower bar to clear), which is what the current code does.
- **Asymmetric hurdle**: when benchmark drops, the investor should benefit from a "negative hurdle" that effectively increases the deduction -- this is NOT implemented.

The NatSpec says "optional hurdle" but does not specify the convention. If the intent is benchmark-relative outperformance, a declining benchmark should still result in a non-zero hurdle calculation (the hurdle gain would be negative, meaning the manager gets credit for the benchmark decline).

**Impact:**
If the business intent is that investors benefit from negative benchmark returns (asymmetric hurdle), the current implementation overcharges fees when the benchmark declines. The magnitude depends on the benchmark volatility. In a market downturn where the fund gains 5% but the benchmark drops 10%, the manager should only charge on 5% gain above a -10% benchmark (i.e., on 15% outperformance), but the current code charges on the full 5% gain.

However, if the intent is a simple "earn above benchmark return" model (typical in hedge funds), the current behavior is correct: a flat/negative benchmark means the entire gain is fee-eligible. This finding is severity MEDIUM pending business requirement clarification.

**Recommendation:**
Document the intended hurdle convention explicitly. If asymmetric hurdle is needed, modify `_calcHurdleReturn` to return a signed value and handle negative hurdle returns in `_applyHurdle`. If the current behavior is intended, add a NatSpec comment explaining why negative benchmark returns yield zero hurdle.

**Status:** OPEN

---

### V8-PFS-06: MAX_PRICE_STALENESS Hardcoded, Not Configurable Per Class

**Severity:** MEDIUM
**Category:** Configuration / Centralization Risk
**Location:** `src/facets/PerfFeeStandardFacet.sol` line 24

**Description:**
`MAX_PRICE_STALENESS` is hardcoded as `uint32 constant = 7 days`. This value:
1. Cannot be configured per class or per fund
2. Cannot be updated without a Diamond cut to replace the facet
3. Is the same for all benchmark funds regardless of their NAV update frequency

A manager who controls a benchmark fund could intentionally stop updating its NAV. After 7 days of no updates, `_findPriceAtOrBefore` returns `(0, 0)` due to the staleness check (line 249), causing `_calcHurdleReturn` to return 0 (line 177), which eliminates the hurdle deduction entirely.

The attack sequence:
1. Manager sets hurdleFundId to a fund they manage
2. Manager stops updating NAV for the benchmark fund for 8 days
3. All performance fee calculations for the affected class have no hurdle deduction
4. Manager resumes benchmark NAV updates after fee crystallisation

**Impact:**
A manager who controls the benchmark fund can selectively disable the hurdle rate by ceasing benchmark NAV updates for >7 days. This allows charging full performance fees without hurdle deduction during targeted periods. The cost of the attack is only the operational inconvenience of not updating the benchmark NAV.

**Recommendation:**
1. Make staleness configurable per class (store in `perfFeeParams` or `ClassInfo`)
2. Alternatively, revert when benchmark price is stale rather than silently returning 0 (fail-closed instead of fail-open)
3. Require that `hurdleFundId` refers to a fund with a different manager than the fee-charging class's fund

**Status:** OPEN

---

### V8-PFS-07: calcStandardPerfFee Has No Existence Validation

**Severity:** MEDIUM
**Category:** Input Validation
**Location:** `src/facets/PerfFeeStandardFacet.sol` lines 41-67

**Description:**
`calcStandardPerfFee` is an `external view` function with no access control and no validation that:
1. `classId` refers to an existing class
2. `dealingIds` refer to existing dealings
3. `dealingIds` belong to the same class as `classId`

Any caller can invoke it with arbitrary IDs. While the function is `view` (no state changes), there are potential issues:
- For a non-existent class, `perfFeeParams` is empty bytes, causing a panic (see V8-PFS-02)
- For non-existent dealings, `hwm = 0` and `dealingPrice` comes from `calculateDealingPrice` which returns `classPrice` when `dilutionRatio == 0`
- For dealings from a different class, the calculation uses the wrong class's parameters

This function is called via `staticcall` from `FeeManagementFacet.calculatePerformanceFees`, which also does not validate that dealingIds belong to the specified class. The `executeCalculateRedemptionPerfFees` does validate `TokenIdUtils.toFundTokenId(dealingId) != fundId` but not class membership.

**Impact:**
Incorrect fee calculations if called with mismatched class/dealing IDs. Since this is `view`, no direct state corruption, but the results feed into `executeCalculateRedemptionPerfFees` which stores fee BPS values used during order processing. A dealing from ClassA could have its fee calculated using ClassB's parameters.

**Recommendation:**
Add validation: `require(TokenIdUtils.toClassTokenId(dealingId) == classId)` inside the loop. Also add `_requireClassExists(classId)` or a length check on `perfFeeParams` at the top.

**Status:** OPEN

---

### V8-PFS-08: feeRateBps Not Capped Against MAX_ADJUSTED_FEE_RATE_BPS

**Severity:** LOW
**Category:** Input Validation
**Location:** `src/facets/PerfFeeStandardFacet.sol` lines 47, 95

**Description:**
`Constants.MAX_ADJUSTED_FEE_RATE_BPS` is defined as 2000 (20%) but is never enforced in `PerfFeeStandardFacet`. The `feeRateBps` decoded from `perfFeeParams` is a `uint16` (max 65535 = 655.35%), and there is no check against the protocol cap. The `maxFeeBps` field (line 98-100) is a separate, per-class configurable cap set by the manager.

This means a manager could configure `feeRateBps = 10000` (100%) and `maxFeeBps = 0` (no cap) to extract the entire gain as performance fee. The E-BC28 error catalog documents this as a known issue at the `OrderToProcess` level, but the same unbounded fee rate also exists at the calculator level.

**Impact:**
A malicious manager configuration can set arbitrarily high performance fee rates. On a private blockchain with known participants this may be mitigated by off-chain governance, but there is no on-chain enforcement of the protocol maximum.

**Recommendation:**
Enforce `MAX_ADJUSTED_FEE_RATE_BPS` at either configuration time (in `executeSetPerfFeeCalculator`) or at calculation time (in `_calcSingleDealingFee`):
```solidity
if (feeBps > Constants.MAX_ADJUSTED_FEE_RATE_BPS) feeBps = Constants.MAX_ADJUSTED_FEE_RATE_BPS;
```

**Status:** OPEN

---

### V8-PFS-09: Staleness Check uint32 Subtraction Is Safe But Fragile

**Severity:** LOW
**Category:** Arithmetic Safety
**Location:** `src/facets/PerfFeeStandardFacet.sol` line 249

**Description:**
Line 249: `targetTimestamp - priceTimestamp > MAX_PRICE_STALENESS`. Both are `uint32` values. If `targetTimestamp < priceTimestamp`, this would underflow (wrapping to a very large number in unchecked context, or reverting in checked context).

In Solidity ^0.8.x, this subtraction is checked and would revert on underflow. Examining the code flow: the binary search (lines 226-245) guarantees `priceTimestamp <= targetTimestamp` because:
- Line 226: `targetTimestamp < timestamps[0]` returns early (no subtraction reached)
- Lines 229-231: `targetTimestamp >= timestamps[len-1]` means `priceTimestamp = timestamps[len-1] <= targetTimestamp`
- Lines 236-245: binary search finds `timestamps[low] <= targetTimestamp`

So the subtraction is safe. However, the correctness depends on the binary search being correct AND `timestamps` array being sorted. If `fundPriceNavTimestamps` is ever stored out of order (e.g., by a bug in `_updateNavInternal`), the binary search could return a `priceTimestamp > targetTimestamp`, causing a revert. The `_updateNavInternal` function in `NavManagementFacet` pushes `navTimestamp` (caller-supplied) to the array without checking monotonicity against the previous entry.

**Impact:**
If `fundPriceNavTimestamps` has out-of-order entries (possible if `navTimestamp` is set to a past value), the binary search may return incorrect results or the staleness check may revert, blocking fee calculations.

**Recommendation:**
Add a comment documenting the sorted-array invariant. Consider adding `assert(targetTimestamp >= priceTimestamp)` before the subtraction for defense-in-depth. Validate monotonicity in `_updateNavInternal`.

**Status:** OPEN

---

### V8-PFS-10: Cross-Facet View Calls Through Diamond Proxy

**Severity:** INFO
**Category:** Architecture
**Location:** `src/facets/PerfFeeStandardFacet.sol` lines 52-53, 80

**Description:**
The facet makes three cross-facet calls via `NavManagementFacet(address(this))`:
- `calculateFundPrice(fundId)` (line 52)
- `calculateClassPrice(classId, fundPrice)` (line 53)
- `calculateDealingPrice(dealingId, classPrice)` (line 80)

These are `view` calls routed through the Diamond proxy's fallback. Since `calcStandardPerfFee` is itself a `view` function, and it's called via `staticcall` from `FeeManagementFacet.calculatePerformanceFees`, the entire call chain is read-only. ARCH-01 (ERC1155 callback reentrancy) does not apply here because no state modifications or token operations occur.

However, the gas cost of routing three separate calls through the Diamond proxy fallback (SLOAD for facet lookup each time) is notable. These could be direct internal reads of storage.

**Impact:**
No security impact. Minor gas inefficiency from three Diamond proxy lookups for view functions.

**Recommendation:**
Consider reading NAV, totalSupply, and dilutionRatio directly from `s.FundAdmin[0]` storage instead of routing through the Diamond proxy. This would save ~2400 gas per call (3 x ~800 gas for proxy SLOAD + delegatecall overhead).

**Status:** OPEN

---

### V8-PFS-11: No Events Emitted for Fee Calculations

**Severity:** INFO
**Category:** Observability
**Location:** `src/facets/PerfFeeStandardFacet.sol` (entire file)

**Description:**
The facet is entirely `view` functions and emits no events. This is architecturally correct (view functions cannot emit events). However, the fee calculation results are only observable through the return values and the subsequent storage writes in `FeeManagementFacet`. There is no direct audit trail of which calculator was used, what parameters were applied, or what intermediate values (hurdle return, risk adjustment) contributed to the final fee.

**Impact:**
Reduced observability for compliance and audit trail purposes. Intermediate calculation values (hurdle return, risk-adjusted gain) are not independently verifiable from on-chain data.

**Recommendation:**
Consider adding a separate non-view function or event emission in `FeeManagementFacet` that logs the calculator address, parameters used, and intermediate values alongside the final fee BPS.

**Status:** OPEN

---

## Cross-Reference with Known Issues

| Known Issue | Applicable Here? | Notes |
|---|---|---|
| ARCH-01 (ERC1155 callback) | No | All functions are `view`, no token operations |
| E-BC31 (risk adjustor fail-open) | **Yes** | V8-PFS-01 is a second instance in PerfFeeStandardFacet |
| E-BC25 (dual totalSupply) | Indirect | `calculateFundPrice` reads `baseInfo.totalSupply`, not `FundTokensStorage.totalSupply`. If these diverge, fund price is wrong, propagating to all fee calculations |
| E-BC22 (tokenId mutation) | No direct impact | This facet receives dealing IDs, not order tokenIds |
| E-BC28 (uncapped fee BPS) | **Yes** | V8-PFS-08 documents the same pattern at the calculator level |

---

## Conclusion

PerfFeeStandardFacet has three HIGH-severity findings: a second instance of the documented fail-open risk adjustor pattern (V8-PFS-01), an unrecoverable panic on empty perfFeeParams (V8-PFS-02), and unvalidated hurdleFundId enabling hurdle manipulation (V8-PFS-03). The four MEDIUM findings relate to first-period hurdle miscalculation, ambiguous benchmark return handling, hardcoded staleness enabling manager manipulation, and missing input validation. The facet's view-only nature limits the blast radius (no direct state corruption), but the calculated fee values feed into state-modifying operations that affect investor economics.
