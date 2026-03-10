# Audit V9 - Agent D: Fund Management & Settlement Facets

**Date:** 2026-03-03
**Auditor:** Claude Opus 4.6 (Agent D)
**Scope:** FundManagementFacet, FundLifecycleFacet, ClassAdjustmentFacet, SettlementFacet, FXManagementFacet
**Branch:** errorCorrectionEngine

---

## Prior Finding Verification

### V8A4-H02: Unsafe int128 cast on fee.amount — **FIXED**
**Location:** `ClassAdjustmentFacet.sol:437` (`_feeToEntry`)
**Evidence:** Line 437 now uses `SafeCast.toInt128(int256(uint256(fee.amount)))` instead of a raw cast. The `SafeCast` import is present at line 11. The conversion chain is `uint128 -> uint256 -> int256 -> int128`, and `SafeCast.toInt128` will revert if the value exceeds `type(int128).max`. Since `fee.amount` is `uint128`, the maximum value is `2^128 - 1`, which exceeds `type(int128).max = 2^127 - 1`. However, in practice, fee amounts denominated in fund tokens at 1e18 precision would need to exceed ~170 trillion tokens to overflow, which is operationally impossible. The SafeCast guard is correct and sufficient.
**Status: FIXED**

### V8A4-M01: maxAdjustmentBps not enforced at posting time — **FIXED**
**Location:** `ClassAdjustmentFacet.sol:58-73` (`validateClassAdjustment`)
**Evidence:** Lines 58-73 now validate the single-adjustment magnitude against `maxAdjustmentBps` at posting time. The check computes `adjustmentBps = absAmount * BPS_DENOMINATOR / classValue` and reverts with `AdjustmentExceedsClassValue()` if it exceeds the configured limit. This prevents oversized adjustments from being queued and blocking NAV processing at NAV time.
**Status: FIXED**

### V8-A5-02: getFXRate return discarded in validateFxRateDeviation — **FIXED**
**Location:** `FXManagementFacet.sol:232-246` (`validateFxRateDeviation`), `SettlementFacet.sol:118-153` (`_validateSettlementFxRate`)
**Evidence:** In `FXManagementFacet.validateFxRateDeviation` (line 239), the return value of `getFXRate(fromCurrency, toCurrency)` is now properly assigned to `referenceRate` and used for deviation calculation. In `SettlementFacet._validateSettlementFxRate` (line 140), the return value of `getFXRate(sourceCurrency, targetCurrency)` is assigned to `referenceCrossRate` and used correctly. The Slither flag about line 139 appears to be a false positive — the return IS captured in the `referenceCrossRate` variable on line 140.
**Status: FIXED**

### V8-A5-07: _settleRedeem modifies dependent order without validation — **FIXED**
**Location:** `SettlementFacet.sol:213-218`
**Evidence:** Lines 213-218 now validate that the dependent order's current status is `PENDING` before modifying it: `if (depCurrent.status != FundAdminStructs.OrderStatus.PENDING) revert ISharedErrors.DependentOrderNotPending()`. This prevents corruption of cancelled or filled dependent orders.
**Status: FIXED**

### V8-CF01: Adjustment queue saturation leading to NAV deadlock — **FIXED**
**Location:** `ClassAdjustmentFacet.sol:54-56`, `Constants.sol:104`
**Evidence:** Queue size is capped at `MAX_PENDING_ADJUSTMENTS = 100` (Constants.sol:104). `validateClassAdjustment` enforces this at line 54. Combined with the V8A4-M01 fix (maxAdjustmentBps enforcement at posting time), oversized adjustments cannot be queued, preventing NAV-time processing failures.
**Status: FIXED**

### V8A4-M02: Fund status transitions not validated sequentially — **STILL PRESENT (Accepted Risk)**
**Location:** `FundLifecycleFacet.sol:30-57` (`validateFundStatusTransition`)
**Description:** The state machine allows CLOSED -> ACTIVE transition (line 48-53 does not prevent it), meaning a fund can skip RETIRED and go directly from CLOSED to ACTIVE. This is permissive but intentional — the `reactivateFund` function on line 257-277 only allows ACTIVE or RETIRED as targets but restricts CLOSED -> ACTIVE to require ROLE_ADMIN (line 265-266). The validator at line 40-44 allows CLOSED -> CLOSED to be caught but allows any non-CLOSED status to transition to CLOSED (ACTIVE -> CLOSED is permitted, skipping RETIRED).
**Assessment:** This is a design decision, not a vulnerability. CLOSED -> ACTIVE requires admin role escalation. The non-sequential transitions are intentional for operational flexibility. **RE-ASSESSED as LOW / ACCEPTED RISK**.

### V8A4-M03: setInvestorTags always replaces all tags atomically — **NOT FOUND IN SCOPE**
**Description:** The `setInvestorTags` function was not found in the audited facets (FundManagement, FundLifecycle, ClassAdjustment, Settlement, FXManagement). Investor tag management appears to be in EligibilityFacet or AccountFacet, which are outside this agent's scope.
**Status: NOT FOUND (out of scope for Agent D)**

### V8A4-M04: Unbounded O(n x m) loop in tag matching per order — **STILL PRESENT**
**Location:** `EligibilityFacet.sol:128-143` (out of direct scope but examined for context)
**Description:** The tag matching loop at EligibilityFacet lines 131-139 is O(requiredTags.length * investorTags.length). Both arrays are unbounded in schema (bytes2[] in InvestorAttributes and ClassInfo). While `requiredTags` is typically small (set by manager), `investorTags` could grow large if tags are appended without limit.
**Assessment:** This is a gas concern, not a security vulnerability per se, since this is a view-adjacent check. However, in an `executeFillOrder` call path, excessive gas consumption could cause orders to fail. **RE-ASSESSED as LOW** — operational bound exists since managers control requiredTags length and the private blockchain has higher gas limits.

### V8A4-M05: Missing input validation in createUmbrella/createFund — **PARTIALLY FIXED**
**Location:** `FundManagementValidationFacet.sol:19-33`, `FundManagementFacet.sol:521-573`
**Evidence:** `validateUmbrellaFundCreation` (line 19-21) validates name is non-empty. `validateFundCreation` (lines 23-33) validates name non-empty, umbrella exists, umbrella is ACTIVE, currency is non-zero, and currency is active in umbrella. However, `minimumInitialSubscription` in `createUmbrellaFund` is NOT validated — a value of 0 is accepted silently, and there is no upper bound check. Similarly, `createFundWithCurrency` does not validate reportingCurrency code against the ISO standard (only checks umbrella currency active status).
**Assessment:** **RE-ASSESSED as LOW** — the missing validation is on `minimumInitialSubscription` (0 = no minimum, which is valid) and currency code range (validated indirectly via umbrella currency registry). No security impact.

### V8-6-04: Silent FX fallback to base price (wrong currency) — **STILL PRESENT**
**Location:** `OrderManagementFacet.sol:1350-1355`
**Description:** When `denominationCurrency` is 0 for a class, the code falls back to fund reporting currency, then to `Constants.ISO_USD`. This silent multi-stage fallback could result in orders being priced in the wrong currency if a class has `denominationCurrency = 0` and the fund has a non-USD reporting currency. The chain: class denom (0) -> fund reporting currency -> USD. If the fund's reporting currency is EUR but the class was intended to be priced in GBP, the fallback silently picks EUR.
**Assessment:** **RE-ASSESSED as LOW** — in `_createShareClassInternalWithCurrency` (line 281-282), if `denominationCurrency == 0`, it defaults to fund's reporting currency. So new classes always get a proper denomination set. The fallback in OrderManagement only triggers for classes created before this logic was added. This is a legacy migration concern, not an active vulnerability.

### V8-CF06: Deadlock freezes lastPerfMintAtNavT; stale benchmark — **STILL PRESENT**
**Location:** `FeeManagementFacet.sol:524`, `PerfFeeStandardFacet.sol:119-125`
**Description:** `lastPerfMintAtNavT` is only updated when `feeAmount > 0` (FeeManagementFacet.sol:497-524). If a dealing has negative performance (price below HWM), `lastPerfMintAtNavT` is NOT updated. This means the hurdle return window keeps stretching from the original timestamp. When performance eventually turns positive, the hurdle calculation uses the stale `lastPerfMintAtNavT`, potentially computing a much larger hurdle than intended (especially for fixed-rate hurdles where `_calcFixedHurdleReturn` compounds over the elapsed period).
**Assessment:** **RE-ASSESSED as MEDIUM** — this is a design trade-off. The HWM mechanism is standard (only charge fees on new highs), and not updating the timestamp during drawdowns is typical. However, the interaction with time-dependent hurdles creates a subtle bias: during recovery from a drawdown, the hurdle is computed over the entire drawdown+recovery period, making it harder to charge fees even when the fund has genuinely outperformed.

### V8-CF07: Asymmetric fee mint failure diverges lastPerfMintAtNavT — **STILL PRESENT**
**Location:** `FeeManagementFacet.sol:489-537`
**Description:** In `_calculateAndMintCrystallisationFee`, the function updates `lastPerfMintAtNavT` at line 524 BEFORE the mint call at line 533. If `_mintCrystallisationFeeTokens` reverts (e.g., supply underflow beyond dust tolerance at line 555), the entire transaction reverts, so both HWM and timestamp are rolled back together. However, the `_verifyCrystallisationComplete` function (line 573-586) checks `crystallisedInCycleCount != activeDealingCount`. If one dealing's crystallisation reverts, the count check prevents NAV updates until the issue is resolved. This creates a potential deadlock: if any single dealing's crystallisation permanently fails, the entire fund's NAV processing is blocked.
**Assessment:** **RE-ASSESSED as MEDIUM** — the `BlockFacet` provides an emergency halt mechanism, but there is no mechanism to skip a problematic dealing during crystallisation. An admin would need to either fix the underlying issue or use emergency measures.

---

## New Findings

### V9-D01: Silent failure in cancelPendingSubscribes — executeCancelOrder return value ignored

**Severity:** MEDIUM
**Category:** Logic Error
**Location:** `FundLifecycleFacet.sol:638`

**Description:**
In `_cancelPendingSubscribesInternal`, the call to `OrderManagementFacet(address(this)).executeCancelOrder(order.investor, functionData)` on line 638 ignores the return value (`bool success`). This is a delegatecall through the Diamond proxy. If `executeCancelOrder` reverts (e.g., due to `validateOrderCancellation` failing because `order.investor` does not match `accountAddress` — note: `executeCancelOrder` validates that `accountAddress == order.investor`, and the passed `order.investor` IS the investor, so this specific failure is unlikely), the revert will propagate. However, if the function returns `false` for some reason without reverting, the failure is silently ignored and `cancelledCount` is still incremented.

More critically, `executeCancelOrder` calls `validateOrderCancellation` which checks `dealingProcessState != PROCESSING`. If orders are being processed during this call, the validation will revert, causing the ENTIRE batch cancellation to fail — not just the individual order. There is no try-catch to handle individual order cancellation failures gracefully.

**Impact:**
If any single order in the batch cannot be cancelled (e.g., dealing is in PROCESSING state), the entire batch operation reverts, leaving all orders uncancelled.

**Recommendation:**
Wrap the `executeCancelOrder` call in a try-catch to handle individual failures gracefully:
```solidity
try OrderManagementFacet(address(this)).executeCancelOrder(order.investor, functionData) returns (bool) {
    cancelledCount++;
} catch {
    // Individual order cancellation failed — skip and continue
    emit OrderCancellationSkipped(fundId, orderIds[i]);
}
```

**Status:** OPEN

---

### V9-D02: _settleSubscribe updates amount field with cumulative value, potential overflow

**Severity:** LOW
**Category:** Arithmetic
**Location:** `SettlementFacet.sol:177`

**Description:**
In `_settleSubscribe`, line 177 appends a new processing history entry with `current.amount + targetAmount`. The `current.amount` is a `uint128` and `targetAmount` is also `uint128`. The addition could theoretically overflow if `current.amount` is very large and `targetAmount` pushes it past `type(uint128).max`. However, `_appendProcessingHistory` uses `uint128` for the `newAmount` parameter, meaning the Solidity 0.8+ checked arithmetic would revert on overflow.

**Impact:**
In practice, token amounts at 1e18 precision would need to exceed ~340 billion tokens to overflow uint128, making this effectively unreachable. However, the cumulative addition pattern means repeated partial settlements could grow the amount unboundedly.

**Recommendation:**
No code change needed — the Solidity 0.8+ overflow check provides sufficient protection. Document the maximum settlement amount assumptions.

**Status:** OPEN (Informational)

---

### V9-D03: FXManagementFacet deviation calculation uses asymmetric formula

**Severity:** LOW
**Category:** Logic Error
**Location:** `FXManagementFacet.sol:268-270`

**Description:**
The `_calculateDeviationBps` function calculates deviation as `|a - b| * BPS_DENOMINATOR / b`. This formula uses `b` (the reference/existing rate) as the denominator. This means deviation is asymmetric: a rate moving from 100 to 110 yields `10 * 10000 / 100 = 1000 bps`, but a rate moving from 110 to 100 yields `10 * 10000 / 110 = 909 bps`. The same absolute change produces different deviation values depending on direction.

This function is used in two places:
1. `executeUpdateFXRates` (line 79): checks new rate vs existing rate — `b = existingRate`
2. `_validateSettlementFxRate` (line 148): checks effective rate vs reference — `b = referenceCrossRate`

**Impact:**
Rate updates from high-to-low are slightly more permissive than low-to-high updates. For a `maxChangeBps` of 500 (5%), a rate could decrease by ~5.26% but only increase by 5.00%. This is a minor inconsistency but standard in financial rate comparison.

**Recommendation:**
This is industry-standard behavior (deviation from reference). No change recommended unless symmetric deviation is a specific business requirement, in which case use `max(a,b)` as denominator.

**Status:** OPEN (Informational)

---

### V9-D04: SettlementFacet lacks fund-level block check

**Severity:** MEDIUM
**Category:** Access Control
**Location:** `SettlementFacet.sol:59-110`

**Description:**
`executeConfirmCashFundSettlement` uses the `whenNotBlocked` modifier (line 62) which only checks `protocolBlocked` (global halt). It does NOT call `_requireFundNotBlocked(fundId)`. This means settlements can proceed for a fund that has been specifically blocked via `BlockFacet.blockFund()`.

Compare with other execute functions in the codebase that operate on specific funds — they should also check fund-level blocking.

**Impact:**
If an admin blocks a specific fund (e.g., due to suspicious activity), settlement operations on that fund's orders continue to execute. Cash tokens are burned and minted, and order states are modified, potentially allowing the suspicious activity to complete.

**Recommendation:**
Add `_requireFundNotBlocked(fundId)` after decoding the function parameters:
```solidity
function executeConfirmCashFundSettlement(
    address accountAddress,
    bytes memory functionData
) external onlyInternalExecution whenNotBlocked returns (bool) {
    (uint256 fundId, ...) = abi.decode(...);
    _requireFundNotBlocked(fundId);  // Add this
    ...
}
```

**Status:** OPEN

---

### V9-D05: FundLifecycleFacet.forceSubmitRedemptionOrder lacks fund-level block check

**Severity:** MEDIUM
**Category:** Access Control
**Location:** `FundLifecycleFacet.sol:506-516`

**Description:**
`executeForceSubmitRedemptionOrder` has `whenNotBlocked` (protocol-level) but does not call `_requireFundNotBlocked(fundId)`. A forced redemption on a fund-blocked entity should not be allowed, as fund-level blocking is intended to freeze all operations on that specific fund.

Similarly, `executeCancelPendingSubscribes` (line 607) lacks fund-level blocking.

**Impact:**
Forced redemptions and bulk cancellations can proceed on a fund that an admin has explicitly blocked.

**Recommendation:**
Add `_requireFundNotBlocked(fundId)` in both execute functions.

**Status:** OPEN

---

### V9-D06: ClassAdjustmentFacet.validateClassAdjustment relies on current price for magnitude check

**Severity:** LOW
**Category:** Logic Error
**Location:** `ClassAdjustmentFacet.sol:61-73`

**Description:**
The `maxAdjustmentBps` validation computes `classValue` using the CURRENT class price (via `calculateFundPrice` and `calculateClassPrice`). Between proposal time (when this validation runs in `postClassAdjustment`) and execution time (when it runs again in `executePostClassAdjustment`), the class price could change significantly (e.g., after a NAV update). An adjustment that was within limits at proposal time could be borderline at execution time, or vice versa.

For multisig flows, there can be a meaningful delay between proposal and execution. The double validation (both at proposal and execution) mitigates this, but the reference price changes between the two checks.

**Impact:**
Low impact — the double validation ensures the adjustment is valid at execution time. The concern is that a manager could propose an adjustment that passes at proposal time but fails at execution time (requiring re-submission), which is an operational inconvenience, not a security issue.

**Recommendation:**
This is acceptable behavior. Document that the bps check uses the price at time of validation, which may differ between proposal and execution.

**Status:** OPEN (Informational)

---

### V9-D07: cancelPendingAdjustment swap-and-pop changes index semantics

**Severity:** LOW
**Category:** Logic Error
**Location:** `ClassAdjustmentFacet.sol:245-258`

**Description:**
`_cancelPendingAdjustmentInternal` uses swap-and-pop to remove an adjustment at a given index. After cancellation, the adjustment that was previously at the LAST index is now at the cancelled index. If a user has cached the indices of pending adjustments (e.g., from `getPendingAdjustments` view call), the cached indices become invalid after any cancellation.

In a multisig flow: if two cancellation proposals are created for different indices, executing the first one invalidates the second one's index (the second proposal's index now points to a different adjustment or is out of bounds).

**Impact:**
The second cancellation proposal would either cancel the wrong adjustment or revert (if index is now out of bounds). The `validateCancelPendingAdjustment` re-validation at execution time (line 209) catches out-of-bounds, but swapped-position cancellation would succeed silently on the wrong adjustment.

**Recommendation:**
Consider using adjustment IDs instead of array indices for cancellation targeting. Alternatively, document the index invalidation risk prominently and ensure the off-chain system re-validates indices before multisig confirmation.

**Status:** OPEN

---

### V9-D08: No event emitted for FX safety config changes tracking

**Severity:** LOW
**Category:** Missing Events
**Location:** `FXManagementFacet.sol:197-203`

**Description:**
`executeSetFXSafetyConfig` does emit `FXSafetyConfigUpdated` (line 202), which is correct. However, the function does NOT track the change in any audit trail array (no `cashFundChangeBlocks` or equivalent push). Other configuration functions in the codebase consistently push to `*ChangeBlocks` arrays for historical `eth_call` queries.

**Impact:**
Historical queries cannot determine exactly when FX safety parameters were changed by scanning block numbers. The event is available but not the block-number index.

**Recommendation:**
Add a safety config change block tracking array, or accept that the emitted event is sufficient for audit trail purposes.

**Status:** OPEN (Informational)

---

## Slither Flags Analysis

### Slither: SettlementFacet._validateSettlementFxRate:139 ignores getFXRate return
**Verdict: FALSE POSITIVE.** Line 140 assigns the return to `referenceCrossRate`. The Slither detector likely flagged the function call pattern but the return IS captured and used in the deviation calculation at lines 145-151. Fix 16 is complete.

### Slither: FundLifecycleFacet._cancelPendingSubscribesInternal:632 ignores executeCancelOrder return
**Verdict: VALID.** Documented as V9-D01 above. The bool return value is not captured.

### Slither: SettlementFacet reentrancy in _settleSubscribe and _settleRedeem
**Verdict: MITIGATED.** Both functions follow checks-effects-interactions pattern:
- `_settleSubscribe`: Effects (lines 175-177: order state updates) before Interactions (lines 180-183: cross-facet calls)
- `_settleRedeem`: Effects (line 198: `cashPendingSwap -= sourceAmount`) before Interactions (lines 201-203: cross-facet calls)
Additionally, the `onlyInternalExecution` modifier combined with `inExternalCallback` flag (BaseFacet.sol:71-73) prevents re-entrancy through ERC1155 callbacks. The `reentrancyLock` in AppStorage provides additional protection.

---

## Summary

| ID | Severity | Status | Description |
|----|----------|--------|-------------|
| V8A4-H02 | HIGH | **FIXED** | SafeCast.toInt128 added in _feeToEntry |
| V8A4-M01 | MEDIUM | **FIXED** | maxAdjustmentBps enforced at posting time |
| V8-A5-02 | MEDIUM | **FIXED** | getFXRate return properly used in cross-rate validation |
| V8-A5-07 | MEDIUM | **FIXED** | Dependent order PENDING status validated |
| V8-CF01 | HIGH | **FIXED** | Queue cap + magnitude check prevents NAV deadlock |
| V8A4-M02 | MEDIUM | **ACCEPTED** | Non-sequential transitions are intentional design |
| V8A4-M03 | MEDIUM | **OUT OF SCOPE** | setInvestorTags not in audited facets |
| V8A4-M04 | MEDIUM | **LOW** | O(n*m) tag loop bounded by operational constraints |
| V8A4-M05 | MEDIUM | **LOW** | Remaining missing validation is operationally benign |
| V8-6-04 | MEDIUM | **LOW** | FX fallback only affects legacy classes |
| V8-CF06 | MEDIUM | **STILL PRESENT** | lastPerfMintAtNavT stale during drawdowns |
| V8-CF07 | MEDIUM | **STILL PRESENT** | Single dealing crystallisation failure blocks fund |
| V9-D01 | MEDIUM | **NEW** | executeCancelOrder return ignored; batch fails atomically |
| V9-D04 | MEDIUM | **NEW** | SettlementFacet missing fund-level block check |
| V9-D05 | MEDIUM | **NEW** | ForceRedemption/CancelSubscribes missing fund-level block check |
| V9-D02 | LOW | **NEW** | Cumulative settlement amount (informational) |
| V9-D03 | LOW | **NEW** | Asymmetric deviation formula (informational) |
| V9-D06 | LOW | **NEW** | Price-dependent adjustment validation timing |
| V9-D07 | LOW | **NEW** | Swap-and-pop index invalidation in multisig |
| V9-D08 | LOW | **NEW** | Missing audit trail for FX safety config |

**Totals: 5 FIXED, 2 STILL PRESENT (MEDIUM), 3 RE-ASSESSED (LOW), 1 ACCEPTED, 1 OUT OF SCOPE, 3 NEW MEDIUM, 5 NEW LOW/INFO**
