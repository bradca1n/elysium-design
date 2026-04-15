# V9 Audit Report — Agent B: Order & NAV Processing Facets

**Date:** 2026-03-03
**Auditor:** Claude Opus 4.6 (Subagent B)
**Scope:** OrderManagementFacet.sol, OrderValidationFacet.sol, NavManagementFacet.sol
**Supporting Context:** BaseFacet.sol, LibAppStorage.sol, Constants.sol, TokenIdUtils.sol, FundAdminStructs.sol, FeeManagementFacet.sol (for prior finding verification)

---

## Prior Finding Verification

### V8-A1-C02: TokenId Mutation on Partial Fill — **FIXED**

**Evidence:** In `_processOrdersImpl` (OrderManagementFacet.sol, approx lines 292-306), the code uses a local `dealingId` variable from `processData.dealingsPerClass[classNum]` and explicitly documents:

```solidity
// E-BC22: Do NOT mutate order.tokenId — it must stay as the original classId in storage.
// dealingId is used by validationResult.dealingId in _executeOrderTransfer.
```

The `order.tokenId` is never assigned a new value anywhere in the processing loop. The `validationResult.dealingId` carries the dealing ID separately. **FIXED** — the tokenId is never mutated.

### V8-A1-H01: Unvalidated Dealing Schedule Timestamps — **FIXED**

**Evidence:** In `FundManagementFacet.executeSetDealingSchedule` (line ~863-868):

```solidity
// V8-A1-H01: Validate timestamps are future, non-zero, and strictly ascending.
for (uint256 i = 0; i < timestamps.length; i++) {
    if (timestamps[i] == 0) revert IFundManagement.ZeroTimestamp();
    if (timestamps[i] < block.timestamp) revert IFundManagement.TimestampNotFuture();
    if (i > 0 && timestamps[i] <= timestamps[i - 1]) revert IFundManagement.TimestampsNotSorted();
}
```

All three validations (non-zero, future, strictly ascending) are present. **FIXED**.

### V8-A1-H02: Uncapped Performance Fee BPS — **FIXED** (both SET-time and APPLICATION-time)

**Evidence — Fix 6 (SET-time cap):** In `FeeManagementFacet.executeSetPerfFeeCalculator` (line ~302-305):

```solidity
// V8-PFS-08: Enforce protocol-level maxPerfFeeRateBps cap at SET time
uint256 fundId = TokenIdUtils.toFundTokenId(classId);
uint16 capBps = s.FundAdmin[0].protocolSafetyConfigs[fundId].maxPerfFeeRateBps;
if (capBps > 0 && feeRateBps > capBps) revert ISharedErrors.PerfFeeRateExceedsLimit();
```

**Evidence — Fix 8a (APPLICATION-time in executeBatchMintPerformanceFees):** In `_applyDealingPerfFee` (line ~891-896):

```solidity
// V8-A1-H02: Apply BPS cap — feeAmount must not exceed capBps% of dealing totalSupply.
if (capBps > 0 && feeAmount > 0) {
    uint256 ts = FundTokensFacet(address(this)).totalSupply(dealingId);
    uint256 maxByBps = Math.mulDiv(ts, capBps, BPS_DENOMINATOR);
    if (feeAmount > maxByBps) feeAmount = maxByBps;
}
```

The `capBps` is retrieved from `protocolSafetyConfigs[fundId].maxPerfFeeRateBps` in `_processPerformanceFeeBatch` (line ~841).

**Evidence — Fix 8b (APPLICATION-time in executeCalculateRedemptionPerfFees):** Lines ~659-662:

```solidity
// V8-A1-H02: Apply protocol-level maxPerfFeeRateBps cap at application time.
uint128 computedFeeBps = SafeCast.toUint128(feeResults[0]);
uint16 capBps = s.FundAdmin[0].protocolSafetyConfigs[fundId].maxPerfFeeRateBps;
if (capBps > 0 && computedFeeBps > capBps) computedFeeBps = capBps;
```

**FIXED** — both SET-time and APPLICATION-time caps exist in all three paths.

### V8N-01: Management Fee Uses OLD Stored NAV — **BY DESIGN (NOT A BUG)**

**Evidence:** In `NavManagementFacet._updateNavInternal` (lines 248-272), the processing order is:

1. `_processAllPendingAdjustments(fundId, newNav)` — uses the NEW nav for dilution
2. `IFeeManagement(address(this)).mintAllPendingManagementFees(fundId, navTimestamp)` — uses adjustment-corrected prices
3. Store NAV: `s.FundAdmin[0].funds[fundId].nav = SafeCast.toUint128(newNav)`
4. Store timestamp: `s.FundAdmin[0].funds[fundId].navUpdatedAt = navTimestamp`

The management fee calculation in `_calculateManagementFee` (FeeManagementFacet line ~800-824) calls `NavManagementFacet.calculateFundPrice(fundId)` which reads `s.FundAdmin[0].funds[fundId].nav`. At step 2, the NAV has NOT been written yet, so it reads the OLD NAV.

**Re-assessment:** This is **by design**. Management fees accrue over the period BETWEEN the last fee mint timestamp and the current navTimestamp. The fee should be calculated on the NAV that was in effect during that period (the old NAV), not the new NAV which represents the current valuation. Using the new NAV would incorrectly apply current-period returns to the fee calculation for a prior period. The adjustments in step 1 modify dilutionRatio which feeds into the class price used for fee calculation — this is correct behavior since adjustments are retroactive corrections to the pricing model.

**STATUS: BY DESIGN — no fix needed.**

### V8N-02: Direct mintManagementFee Bypasses Guard — **FIXED**

**Evidence:** In `FeeManagementFacet.mintAllPendingManagementFees(uint256 fundId, uint32 timestamp)` (line ~160-161):

```solidity
function mintAllPendingManagementFees(uint256 fundId, uint32 timestamp) public onlyInternalExecution {
    if (timestamp > block.timestamp) revert ISharedErrors.FutureTimestamp();
```

The function has:
1. `onlyInternalExecution` modifier — prevents direct external calls
2. `if (timestamp > block.timestamp) revert FutureTimestamp()` — prevents advancing `lastMgmtFeeMintTs` beyond current time
3. The per-class guard at line 170: `if (lastTs > 0 && timestamp <= lastTs) continue` — prevents double-minting

**FIXED** — future timestamp guard is present and `onlyInternalExecution` prevents unauthorized calls.

### V8N-03: Dealing State Deadlock in AWAITS_FEE_PROCESSING — **ADDRESSED (LOW RESIDUAL RISK)**

**Evidence:** The `dealingProcessState` function (NavManagementFacet lines 592-604) enters `AWAITS_FEE_PROCESSING` when:
```solidity
if (s.FundAdmin[0].funds[fundId].redemptionFeesCalcAtNavT != s.FundAdmin[0].funds[fundId].navUpdatedAt) {
    return FundAdminStructs.DealingProcessState.AWAITS_FEE_PROCESSING;
}
```

To exit this state, `executeCalculateRedemptionPerfFees` must be called with `lastBatch=true`, which sets `redemptionFeesCalcAtNavT = navTs` (line ~668).

The function DOES accept an empty `dealingIds` array with `lastBatch=true` — the loop at line 640 simply iterates zero times, and the `lastBatch` block at line 667 writes the `redemptionFeesCalcAtNavT`. So the operator CAN pass through the state with no dealings.

However, if crystallisation is due for any class, `executeCalculateRedemptionPerfFees` requires `crystallisedAtNavT == navUpdatedAt` (lines 634-638). This means `executeCrystallisePerfFees` with `lastBatch=true` must also be called first (which also accepts empty dealingIds). The admin must call TWO transactions in sequence to advance past AWAITS_FEE_PROCESSING when crystallisation is due but there are no dealings. This is operationally complex but not a deadlock.

**STATUS: ADDRESSED — empty arrays with lastBatch=true allow state advancement. Residual operational complexity is LOW severity.**

### V8N-12: No Forward-Only Check on navTimestamp — **FIXED**

**Evidence:** In `NavManagementFacet.validateNavUpdate` (lines 53-57):

```solidity
// V8N-12: Enforce forward-only navTimestamp to protect priceHistory binary search integrity.
uint32 currentNavTs = s.FundAdmin[0].funds[fundId].navUpdatedAt;
if (currentNavTs > 0 && navTimestamp <= currentNavTs) {
    revert NavTimestampNotIncreasing(navTimestamp, currentNavTs);
}
```

The check uses `<=` (strictly increasing), protects against both equal and backward timestamps, and only skips the check when `currentNavTs == 0` (first NAV update). **FIXED**.

---

## New Findings

### V9B-01: Ignored getFXRate Return Value in Order Processing

**Severity:** LOW
**Category:** Logic Error
**Location:** `src/facets/OrderManagementFacet.sol` line 513

**Description:**
In `_calculateOrderResults`, when validating cross-currency orders, `getFXRate` is called but its return value is discarded:
```solidity
FXManagementFacet(address(this)).getFXRate(classCurrency, fundCurrency);
// V8-A5-02: Pass both currencies so deviation is checked against the cross-rate
FXManagementFacet(address(this)).validateFxRateDeviation(classCurrency, fundCurrency, uint128(fxRate));
```

The `getFXRate` call is used as a staleness/existence check (it reverts if the rate is stale or missing). The actual FX rate used for the order comes from `orderToProcess.fxRateToFund` (an off-chain supplied value), which is then validated against the reference rate via `validateFxRateDeviation`. This is a known residual (E-BC17) where the function call serves as a guard rather than a data source.

**Impact:** Minimal — the call serves its intended purpose (revert if rate is stale). The discarded return value is not needed because the actual rate is operator-supplied and deviation-checked.

**Recommendation:** Add a comment explicitly documenting the intentional ignore, or capture the return value and assert it is non-zero for clarity.

**Status:** OPEN (informational)

### V9B-02: Redeem Order Minimum Holding Check May Underflow

**Severity:** LOW
**Category:** Arithmetic Safety
**Location:** `src/facets/OrderManagementFacet.sol` line 972 (in `_validateOrderRules`)

**Description:**
In the redeem holding-limit check:
```solidity
uint256 finalBalanceValue = currentBalanceValue - valueToCheck;
```

If `valueToCheck > currentBalanceValue` (possible due to rounding in price calculations between submission and processing), this subtraction will underflow and revert. Since Solidity 0.8.x has built-in overflow protection, this causes a revert rather than a wrap-around, which is safe but produces an unhelpful error message.

**Impact:** Legitimate redemptions near the full balance could revert with an arithmetic underflow error instead of a descriptive error. This is a UX issue rather than a security vulnerability.

**Recommendation:** Add an explicit check:
```solidity
if (valueToCheck > currentBalanceValue) {
    // Full redemption — no minimum holding check needed
} else {
    uint256 finalBalanceValue = currentBalanceValue - valueToCheck;
    if (finalBalanceValue > 0 && finalBalanceValue < minHolding) {
        revert IOrderManagement.HoldingBelowMinimum(finalBalanceValue, minHolding);
    }
}
```

**Status:** OPEN

### V9B-03: ProtocolSafetyConfig Event Does Not Emit All Parameters

**Severity:** INFORMATIONAL
**Category:** Missing Events
**Location:** `src/facets/NavManagementFacet.sol` line 226

**Description:**
The `ProtocolSafetyConfigUpdated` event emits only 5 of 8 config parameters:
```solidity
emit ProtocolSafetyConfigUpdated(fundId, maxNavChangeBps, maxTimestampDeviation, maxMgmtFeeRateBps, maxAdjustmentBps, maxPerfFeeRateBps);
```

Missing from the event: `maxNoticePeriod`, `maxLockPeriod`, `maxBenchmarkStaleness`. While the full config can be queried via `getProtocolSafetyConfig`, the event provides incomplete audit trail information for off-chain indexers.

**Impact:** Incomplete off-chain event indexing for safety config changes. No on-chain security impact.

**Recommendation:** Add the missing parameters to the event, or emit a separate event for the remaining fields.

**Status:** OPEN

### V9B-04: No Maximum Length Check on Dealing Schedule Timestamps Array

**Severity:** LOW
**Category:** Denial of Service
**Location:** `src/facets/FundManagementFacet.sol` line ~869

**Description:**
`executeSetDealingSchedule` validates each timestamp but does not limit the array length. While the validation loop would consume gas proportional to the array length, the stored array `nextDealingTimestamps` is only consumed by `dealingProcessState` which reads `schedule[schedule.length - 1]` (the last element), so the extra elements would just waste storage.

On a private chain, this is a minor gas concern rather than a DoS vector, since the manager role is trusted and the block gas limit is likely high.

**Impact:** Trusted manager could waste storage by submitting very large timestamp arrays. No security impact on private chain.

**Recommendation:** Add `if (timestamps.length > MAX_DEALING_TIMESTAMPS) revert` with a reasonable bound (e.g., 52 for weekly dealings over a year).

**Status:** OPEN

### V9B-05: _handleSwapLinking Uses result.value (Fund Currency) for Cross-Currency Dependent Order

**Severity:** MEDIUM
**Category:** Logic Error
**Location:** `src/facets/OrderManagementFacet.sol` line 593

**Description:**
In `_determineOrderOutcome`, the swap linking amount is set to:
```solidity
result.dependentOrderAmountIncrease = SafeCast.toUint128(result.value);
```

`result.value` is in fund reporting currency. For intra-umbrella swaps, `_handleSwapLinking` (line 1298) adds this to the dependent subscribe order amount:
```solidity
uint128 newAmount = dependentCurrent.amount + validationResult.dependentOrderAmountIncrease;
```

The dependent subscribe order's `amount` field tracks value in base tokens (class denomination currency). If the redeem class and subscribe class are in different currencies, this adds fund-currency value to a class-denomination-currency amount without FX conversion.

However, examining the subscribe order processing path: the `orderToProcess.amount` (passed by the off-chain admin) drives the actual subscription value, and the order's `amount` field is used for fill detection in `_determineOrderOutcome`. The fill detection compares the processed amount against `current.amount`, so a currency mismatch could cause the subscribe leg to appear unfilled or overfilled.

**Impact:** For cross-currency intra-umbrella swaps, the subscribe order fill detection could be incorrect if the redeem class currency differs from the subscribe class currency. Could result in the subscribe order never being marked as FILLED, or being marked FILLED prematurely.

**Recommendation:** Convert `result.value` to the subscribe class denomination currency using the FX rate before setting `dependentOrderAmountIncrease`.

**Status:** OPEN

### V9B-06: Reentrancy Mitigated by inExternalCallback Guard

**Severity:** INFORMATIONAL
**Category:** Reentrancy
**Location:** `src/shared/BaseFacet.sol` lines 70-74

**Description:**
Slither flagged multiple reentrancy-no-eth findings in `_processOrdersImpl`, `_submitOrder`, `executeCancelOrder`, and `_executeOrderTransfer`. These are all protected by:

1. `onlyInternalExecution` modifier which checks both `s.internalExecutionContext` AND `!s.inExternalCallback`
2. The `inExternalCallback` flag is set to `true` in `FundTokensFacet._doSafeTransferAcceptanceCheck` before calling `onERC1155Received`, and reset to `false` after the callback returns
3. This prevents any `executeXxx` function from being called during an ERC1155 callback

**Impact:** None — reentrancy via ERC1155 callbacks is fully mitigated. The Slither findings are false positives due to the non-standard guard pattern.

**Status:** MITIGATED (informational)

---

## Summary

| ID | Severity | Status | Description |
|---|---|---|---|
| V8-A1-C02 | (was CRITICAL) | FIXED | TokenId mutation on partial fill |
| V8-A1-H01 | (was HIGH) | FIXED | Unvalidated dealing schedule timestamps |
| V8-A1-H02 | (was HIGH) | FIXED | Uncapped performance fee BPS (SET + APPLICATION) |
| V8N-01 | (was MEDIUM) | BY DESIGN | Management fee uses old NAV — correct for period accrual |
| V8N-02 | (was MEDIUM) | FIXED | Direct mintManagementFee future timestamp guard |
| V8N-03 | (was MEDIUM) | ADDRESSED | Dealing state deadlock — empty arrays advance state |
| V8N-12 | (was MEDIUM) | FIXED | Forward-only navTimestamp check |
| V9B-01 | LOW | OPEN | Ignored getFXRate return value (known residual) |
| V9B-02 | LOW | OPEN | Redeem minimum holding check potential underflow |
| V9B-03 | INFO | OPEN | ProtocolSafetyConfig event missing 3 parameters |
| V9B-04 | LOW | OPEN | No max length on dealing schedule timestamps array |
| V9B-05 | MEDIUM | OPEN | Swap linking currency mismatch for cross-currency swaps |
| V9B-06 | INFO | MITIGATED | Reentrancy via ERC1155 callbacks — inExternalCallback guard |

**Total: 5 prior findings FIXED, 1 BY DESIGN, 1 ADDRESSED | 1 new MEDIUM, 3 new LOW, 2 new INFORMATIONAL**
