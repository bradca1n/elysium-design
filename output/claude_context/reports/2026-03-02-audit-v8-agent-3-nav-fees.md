# Audit V8 Agent 3: NavManagementFacet + FeeManagementFacet

**Date:** 2026-03-02
**Scope:** NavManagementFacet.sol, FeeManagementFacet.sol, PerfFeeStandardFacet.sol
**Auditor:** Claude Opus 4.6 (Agent 3 — NAV & Fees)

---

## Catalog Pattern Verification

| Pattern | Status | Evidence |
|---------|--------|----------|
| E-BC07 (Fund vs class dilution direction) | FIXED | `_applyFundDilution` at line 362-380: fund dilution DOWN for costs (line 376: `increase=false`), class dilution UP for costs (line 413: `increase=true`). Correctly opposite directions. |
| E-BC18 (Safety config disabled-at-zero) | STILL PRESENT | NavManagementFacet.sol:54 `if (config.maxNavChangeBps > 0)` — zero means disabled (no validation), not reject-all. Same at line 69 for `maxTimestampDeviation`. By design per docs, but see V8N-02. |
| E-BC25 (Dual totalSupply divergence) | STILL PRESENT | FeeManagementFacet.sol:203-204 mints fee tokens via `FundTokensFacet.mint()` (updates `FundTokens[0].totalSupply[feeDealingId]`) AND separately updates `baseInfo[feeClassId].totalSupply`. These are two independent storage locations. See V8N-05. |
| E-BC28 (Uncapped caller-supplied fee BPS) | FIXED | `batchMintPerformanceFees` path (line 842-846): validates `feeAmount > maxFee` where `maxFee = ts * (dealingPrice - currentHwm) / dealingPrice`. Also HWM monotonicity enforced (line 839). Crystallisation path also validates via calculator. |
| E-BC29 (NAV stale data cascade) | FIXED | `_updateNavInternal` (lines 233-253): Order is (1) process adjustments, (2) mint mgmt fees, (3) store NAV+prices. Fees are calculated using the NEW nav parameter passed to `_updateNavInternal`, not the stored value. NAV is stored last at line 243. Correct order. |

---

## Findings

### V8N-01: Management Fee Minting Uses Old NAV for Fund Price Calculation

**Severity:** Medium
**Location:** `FeeManagementFacet.sol:163`
**Description:** In `mintAllPendingManagementFees(fundId, timestamp)`, the fund price is calculated at line 163 via `calculateFundPrice(fundId)` which reads `s.FundAdmin[0].funds[fundId].nav` (the stored NAV). When called from `_updateNavInternal`, this occurs at line 240 BEFORE the new NAV is stored at line 243. This means management fees are calculated using the OLD NAV, not the new NAV being submitted.

The call chain is:
1. `_updateNavInternal` receives `newNav` parameter
2. Line 240: calls `mintAllPendingManagementFees(fundId, navTimestamp)` — this is a cross-facet call via `IFeeManagement(address(this))`
3. Inside that function, line 163: `calculateFundPrice(fundId)` reads `s.FundAdmin[0].funds[fundId].nav` — still the OLD value
4. Line 243: `s.FundAdmin[0].funds[fundId].nav = SafeCast.toUint128(newNav)` — stores new NAV AFTER fees

**Impact:** Management fees are systematically calculated based on the previous period's NAV rather than the current NAV. If NAV increased, fees are undercharged. If NAV decreased, fees are overcharged. For a fund with 1% daily NAV movement and 2% annual management fee, the per-period error is ~0.01% of the fee amount — small but persistent and always in the same direction during trending markets.

**Recommendation:** Store the new NAV before calling `mintAllPendingManagementFees`, or pass `newNav` into the fee calculation. Example reorder in `_updateNavInternal`:
```solidity
// Store NAV first
s.FundAdmin[0].funds[fundId].nav = SafeCast.toUint128(newNav);
// Then calculate fees using the new NAV
IFeeManagement(address(this)).mintAllPendingManagementFees(fundId, navTimestamp);
// Then store price history
```

**Status:** OPEN

---

### V8N-02: Safety Config Zero-Means-Disabled Creates Unsafe Default

**Severity:** Low
**Location:** `NavManagementFacet.sol:54, 69`
**Description:** The `ProtocolSafetyConfig` struct defaults all fields to zero, and zero means "no limit" (disabled). This means a newly created fund has NO safety checks on NAV changes, timestamp deviation, management fee rates, or adjustments. The pattern `if (config.maxNavChangeBps > 0) { validate }` silently skips validation when unconfigured.

This is documented behavior (E-BC18) and intentional, but creates a window where a ROLE_NAV_UPDATER can submit arbitrarily large NAV changes before an admin configures safety limits. In a B2B context where funds are set up by administrators, this is lower risk, but remains a defense-in-depth gap.

**Impact:** Until `setProtocolSafetyConfig` is called by an admin, there are no guardrails on NAV updates. A compromised or malicious NAV updater could submit a 1000x NAV change.

**Recommendation:** Consider requiring `setProtocolSafetyConfig` to be called during fund creation (in `_createFundAndActivate`), or set reasonable defaults (e.g., `maxNavChangeBps = 5000` for 50%). Alternatively, add a `requiresSafetyConfig` flag that must be set before the first NAV update.

**Status:** OPEN

---

### V8N-03: Dealing Process State Can Get Stuck in AWAITS_FEE_PROCESSING

**Severity:** Medium
**Location:** `NavManagementFacet.sol:588-600`
**Description:** The `dealingProcessState` function determines state based on comparing `navUpdatedAt` against dealing timestamps and `redemptionFeesCalcAtNavT`. The transition from `AWAITS_FEE_PROCESSING` to `PROCESSING` requires `redemptionFeesCalcAtNavT == navUpdatedAt` (line 596).

This value is only set in `executeCalculateRedemptionPerfFees` when `lastBatch == true` (line 642). If the manager calls `calculateRedemptionPerfFees` with `lastBatch = false` for all batches, or if the transaction for the final batch reverts, the fund will remain stuck in `AWAITS_FEE_PROCESSING` indefinitely. There is no timeout or admin override to force the state forward.

Additionally, the crystallisation ordering requirement (line 612-616: `crystallisedAtNavT != navTs` causes revert) means if crystallisation fails or is incomplete, redemption fee calculation is blocked, which blocks order processing.

**Impact:** A fund can become permanently stuck in fee processing state, blocking all order processing. This requires a new NAV update to reset the dealing cycle, but `updateNav` requires `AWAITS_NAV_UPDATE` or `IDLE` state (line 46-48), creating a potential deadlock if the fund is in `AWAITS_FEE_PROCESSING`.

**Recommendation:** Add an admin-only emergency function to force-advance the dealing process state, or add a timeout mechanism. Example:
```solidity
function forceAdvanceDealingState(address accountAddress, uint256 fundId) external {
    // ROLE_ADMIN only, sets redemptionFeesCalcAtNavT = navUpdatedAt
}
```

**Status:** OPEN

---

### V8N-04: Class Loop Uses Off-by-One Upper Bound (nextClassId)

**Severity:** Low
**Location:** `FeeManagementFacet.sol:166`
**Description:** The management fee minting loop iterates `for (uint16 i = 2; i <= nextClassId; i++)`. The field `nextClassId` represents the NEXT class ID to be assigned (i.e., one past the last created class). This means the loop iterates over `nextClassId` which does not yet exist as a class.

However, this is safe because `_calculateManagementFee` will return 0 for a non-existent class (since `totalSupply == 0` and `lastMgmtFeeMintTs == 0`). The `calculateClassPrice` call may revert due to `classDilution == 0` though (NavManagementFacet.sol:467 — `revert ClassNotInitialized`). Whether this reverts depends on whether the nonexistent class has `dilutionRatio == 0`.

Wait — reviewing more carefully: `i <= nextClassId` means when `nextClassId = 3` (classes 1 and 2 exist), the loop iterates i=2 and i=3. Class 3 does not exist. If `baseInfo[class3].totalSupply == 0`, the function returns 0 early at line 781 before calling `calculateClassPrice`. So it is safe.

**Impact:** Wasted gas iterating one extra non-existent class, but no functional impact due to early return on `totalSupply == 0`.

**Recommendation:** Change loop bound to `i < nextClassId` to avoid iterating over a non-existent class ID. This saves gas and is cleaner:
```solidity
for (uint16 i = 2; i < nextClassId; i++) {
```

**Status:** OPEN

---

### V8N-05: Dual TotalSupply Maintained in Two Storage Locations (E-BC25 Confirmed)

**Severity:** Medium
**Location:** `FeeManagementFacet.sol:182-204`, `FundTokensFacet.sol:344`
**Description:** Two separate total supply trackers exist:
1. `FundTokensStorage.totalSupply[tokenId]` — updated by `FundTokensFacet.mint/burn` (ERC1155 layer)
2. `FundAdminStorage.baseInfo[tokenId].totalSupply` — updated manually by FeeManagementFacet and OrderManagementFacet

In `mintAllPendingManagementFees` (lines 180-205):
- Line 182: reads `oldTotalSupply = s.FundAdmin[0].baseInfo[classId].totalSupply`
- Line 203: mints via `FundTokensFacet.mint(fundManager, feeDealingId, ...)` — updates `FundTokens[0].totalSupply[feeDealingId]`
- Line 204: manually updates `s.FundAdmin[0].baseInfo[feeClassId].totalSupply += ...`

Note the asymmetry: line 182 reads class-level supply, line 203 mints at dealing-level, and line 204 updates class-level supply. The dealing-level `baseInfo` totalSupply for the fee dealing is NOT updated in this function, only the class-level one. Meanwhile `FundTokens[0].totalSupply[feeDealingId]` IS updated by the mint.

**Impact:** If any code path reads `baseInfo[feeDealingId].totalSupply` instead of `FundTokensFacet.totalSupply(feeDealingId)`, it will get a stale value. Currently the `_processPerformanceFeeBatch` function reads from `FundTokensFacet.totalSupply(dealingId)` (line 825), so the correct value is used. However, this dual-tracking pattern is fragile and a future code change could introduce divergence.

**Recommendation:** Consolidate to a single source of truth for total supply, or add invariant checks that both values match after each operation. Consider a helper function that updates both atomically.

**Status:** OPEN

---

### V8N-06: Crystallisation Fee Minting Reduces Class TotalSupply Without Proportional Fund Supply Update

**Severity:** Low
**Location:** `FeeManagementFacet.sol:521-544`
**Description:** In `_mintCrystallisationFeeTokens`, the class total supply is reduced (line 536) and new fund tokens are minted to the fee class (line 543-544). However, the fund-level `baseInfo[fundId].totalSupply` is not adjusted. This is because fee tokens represent a reallocation within the fund (from investor class to manager fee class), not a change in total fund tokens.

Reviewing more carefully, the dealing-level dilution ratio IS updated in `_calculateAndMintCrystallisationFee` (line 496-497), which adjusts the dealing price to reflect the fee extraction. This is the correct mechanism — dilution handles the value transfer rather than supply changes at the fund level.

**Impact:** No immediate vulnerability — the dilution mechanism correctly handles value transfer. However, the `baseInfo[classId].totalSupply` reduction (line 536) without corresponding `baseInfo[fundId].totalSupply` reduction means fund-level supply accounting diverges from the sum of class supplies. This is acceptable if fund-level supply is only used for `calculateFundPrice` (which divides NAV by supply), but could cause confusion in auditing.

**Recommendation:** Add a comment documenting that fund-level totalSupply intentionally includes both investor and fee class tokens, and that the price impact is handled via dilution ratios.

**Status:** OPEN

---

### V8N-07: Risk Adjustor Fail-Open Design Could Be Exploited

**Severity:** Medium
**Location:** `PerfFeeStandardFacet.sol:140-156`
**Description:** The risk adjustor mechanism in `_applyRiskAdjustor` uses a fail-open pattern (line 155: `return gain` if staticcall fails). If the risk adjustor contract has a bug, runs out of gas, or is removed from the Diamond without clearing `riskAdjustorSelector`, the performance fee calculation will silently skip risk adjustment and charge the full unadjusted fee.

Additionally, the risk adjustor is called via `staticcall` to `address(this)` (line 150), meaning it must be a facet registered in the Diamond. If the facet is cut (removed), the staticcall will fail silently and fees will be calculated without risk adjustment.

**Impact:** A manager could remove the risk adjustor facet from the Diamond (if they have Diamond admin access) to bypass risk-adjusted fee reductions, extracting higher performance fees from investors. Even without malice, a misconfigured or buggy risk adjustor silently defaults to maximum fees.

**Recommendation:** Change to fail-closed design: if a `riskAdjustorSelector` is configured but the call fails, revert rather than proceeding without adjustment:
```solidity
if (riskSelector != bytes4(0)) {
    (bool ok, bytes memory riskResult) = address(this).staticcall(riskCall);
    if (!ok) revert RiskAdjustorCallFailed(classId);
    uint256 adjusted = abi.decode(riskResult, (uint256));
    if (adjusted <= gain) return adjusted;
    // If adjustor returns higher gain, revert (invalid behavior)
    revert RiskAdjustorInvalidResult(classId, gain, adjusted);
}
```

**Status:** OPEN

---

### V8N-08: No Maximum Bound on Management Fee Rate at Runtime

**Severity:** Low
**Location:** `FeeManagementFacet.sol:786-787`
**Description:** The management fee rate is stored as `uint160` in `ClassInfo.mgmtFeeRate` (which allows values up to 2^160). While `FundManagementValidationFacet.sol:42-44` checks `maxMgmtFeeRateBps` at class creation time, this check uses the same zero-means-disabled pattern. If `maxMgmtFeeRateBps == 0` (default), any fee rate up to `uint160.max` can be set.

The `_calculateManagementFee` function has a safety check at line 792: `if (targetFeeValue >= classNav) return 0` which prevents fees exceeding NAV. But a fee rate of, say, 9999 BPS (99.99%) would be accepted and would result in nearly all class value being extracted as fees each year.

**Impact:** Without safety config, extremely high management fee rates can be set. The `targetFeeValue >= classNav` check prevents immediate drain but allows very high ongoing extraction.

**Recommendation:** Add a hard-coded maximum management fee rate constant (e.g., `MAX_MGMT_FEE_RATE_BPS = 5000` for 50%) that is always enforced regardless of safety config.

**Status:** OPEN

---

### V8N-09: Pending Adjustments Queue Not Bounded by MAX_PENDING_ADJUSTMENTS in Processing

**Severity:** Low
**Location:** `NavManagementFacet.sol:267-316`
**Description:** The `_processAllPendingAdjustments` function iterates over all pending adjustments with a nested loop (O(n*m) where n = adjustments and m = unique classes). While `Constants.MAX_PENDING_ADJUSTMENTS` is defined (value 100 based on the constant name), the processing loop at line 282-316 does not check this bound. The bound is presumably enforced at submission time (in ClassAdjustmentFacet), but if it is bypassed or the limit is changed, the processing loop could consume excessive gas.

On a private blockchain this is lower risk due to higher gas limits, but unbounded loops remain a code quality concern.

**Impact:** Gas exhaustion if too many adjustments accumulate, potentially blocking NAV updates.

**Recommendation:** Add an explicit length check at the start of `_processAllPendingAdjustments`:
```solidity
if (queue.length > Constants.MAX_PENDING_ADJUSTMENTS) revert TooManyAdjustments();
```

**Status:** OPEN

---

### V8N-10: HWM Reset Protection Analysis

**Severity:** Informational
**Location:** `FeeManagementFacet.sol:500-501, 839, 850`
**Description:** The HWM (High Water Mark) is protected against decrease in two paths:
1. `batchMintPerformanceFees` (line 839): `if (dealingPrice < currentHwm) revert HWMCannotDecrease()`
2. `_calculateAndMintCrystallisationFee` (line 501): `s.FundAdmin[0].dealings[dealingId].hwm = SafeCast.toUint128(dealingPrice)` — but only after checking `dealingPrice > dealingHwm` at line 481.

The HWM is stored as `uint128` in `DealingInfo.hwm`. There is no direct setter function for HWM — it can only be updated through the fee minting paths. The `setPerfFeeCalculator` function (line 286-288) only updates `perfFeeSelector` and `perfFeeParams`, not the HWM.

**Impact:** HWM reset attack is not possible through normal contract interfaces. A manager cannot reset HWM to extract excess fees. This is correctly implemented.

**Recommendation:** None — correctly implemented. Consider adding an explicit comment documenting this invariant.

**Status:** N/A (No vulnerability)

---

### V8N-11: Fee Minting Always Goes to Fund Manager Address

**Severity:** Informational
**Location:** `FeeManagementFacet.sol:162, 203, 542-543`
**Description:** All fee minting (both management and performance) sends tokens to `s.FundAdmin[0].funds[fundId].manager`. This is the fund manager's account address. The fee class (class 1) and fee dealing (dealing 1 of class 1) are fixed by construction.

There is no configurable fee recipient address separate from the fund manager. This means if the fund manager address needs to change, fee destination changes too. This is likely intentional for simplicity.

**Impact:** No vulnerability — fee destination is deterministic and cannot be directed to arbitrary addresses.

**Recommendation:** None — correctly scoped.

**Status:** N/A (No vulnerability)

---

### V8N-12: Timestamp Validation Allows Arbitrary Past navTimestamp

**Severity:** Low
**Location:** `NavManagementFacet.sol:69-77`
**Description:** The `maxTimestampDeviation` check validates that `navTimestamp` is within `maxTimestampDeviation` seconds of `block.timestamp`. However, when `maxTimestampDeviation == 0` (default), ANY timestamp is accepted — including timestamps far in the past or future.

The `mintAllPendingManagementFees` function rejects future timestamps (line 160: `if (timestamp > block.timestamp) revert FutureTimestamp()`), but the navTimestamp itself is used to set `navUpdatedAt` which drives dealing process state transitions. A past timestamp could cause unexpected state transitions.

Additionally, there is no check that `navTimestamp >= previous navUpdatedAt`. A NAV updater could submit a timestamp older than the previous NAV update, which would cause `mintAllPendingManagementFees` to skip fee minting (line 169: `timestamp <= lastTs`) for classes that already minted fees up to a later timestamp.

**Impact:** With default config (no timestamp deviation limit), a NAV updater could submit an old timestamp that skips management fee accrual for the current period, effectively giving investors a free ride. Requires ROLE_NAV_UPDATER access.

**Recommendation:** Add a check that `navTimestamp > previous navUpdatedAt`:
```solidity
uint32 prevNavTs = s.FundAdmin[0].funds[fundId].navUpdatedAt;
if (navTimestamp > 0 && prevNavTs > 0 && navTimestamp <= prevNavTs) {
    revert NavTimestampNotAdvancing(navTimestamp, prevNavTs);
}
```

**Status:** OPEN

---

## Summary

| ID | Severity | Title |
|----|----------|-------|
| V8N-01 | Medium | Mgmt fee uses old NAV for fund price calculation |
| V8N-02 | Low | Safety config zero-means-disabled creates unsafe default |
| V8N-03 | Medium | Dealing state can get stuck in AWAITS_FEE_PROCESSING |
| V8N-04 | Low | Class loop off-by-one (iterates non-existent class) |
| V8N-05 | Medium | Dual totalSupply divergence risk (E-BC25 confirmed) |
| V8N-06 | Low | Class supply reduction without fund supply adjustment |
| V8N-07 | Medium | Risk adjustor fail-open design exploitable |
| V8N-08 | Low | No hard-coded max on management fee rate |
| V8N-09 | Low | Pending adjustments queue unbounded in processing |
| V8N-10 | Info | HWM reset protection — correctly implemented |
| V8N-11 | Info | Fee minting always to fund manager — correctly scoped |
| V8N-12 | Low | navTimestamp allows non-advancing values |

**Totals:** 0 Critical, 0 High, 4 Medium, 6 Low, 2 Informational
