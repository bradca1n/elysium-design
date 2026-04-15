# Security Audit Report: Agent 2 - Order Management

**Audit Date:** 2026-02-10
**Auditor:** Agent 2 (V6 Audit)
**Scope:** `OrderManagementFacet.sol` (1,346 lines), `OrderValidationFacet.sol` (292 lines)
**Severity Rating:** Uses CRITICAL / HIGH / MEDIUM / LOW / INFORMATIONAL

---

## Executive Summary

Comprehensive manual security audit of the order management system covering order submission, cancellation, processing, swap decomposition, cross-umbrella settlement, conditional orders, class rules, and FX validation. The audit reviewed all 1,638 lines of in-scope code plus supporting contracts (BaseFacet, FundAdminStructs, TokenIdUtils, Constants, ISharedErrors, IOrderManagement, NavManagementFacet, FXManagementFacet, FundTokensFacet, FundLifecycleFacet).

| Severity | Count |
|----------|-------|
| CRITICAL | 2     |
| HIGH     | 5     |
| MEDIUM   | 7     |
| LOW      | 6     |
| INFORMATIONAL | 4 |
| **Total** | **24** |

---

## CRITICAL Findings

---

## [CRITICAL] A2-01: Unbounded Order Processing Loop Enables Gas Griefing / DoS

**ID:** A2-01
**Location:** `/Users/timoneumann/Elysium/Elysium/contracts/src/facets/OrderManagementFacet.sol:270-351`
**Description:** The `_processOrdersImpl` function iterates twice over `ordersToProcess` (lines 270-283 for validation, lines 286-351 for execution) with no upper bound on the array length. Each iteration performs multiple cross-facet delegatecalls (`validateOrderForProcessing`, `unlockTokens`, `isEligible`, `mint`, `burn`, `calculateFundPrice`, `calculateClassPrice`, `calculateDealingPrice`) and storage writes (processing history append, totalSupply update, NAV update).

The `ordersToProcess` array is provided by the caller (admin) and can be arbitrarily long. On a private blockchain this may have higher block gas limits, but there is still no programmatic guard. An admin submitting a very large batch could cause the transaction to exceed gas limits, leaving the dealing state stuck in `PROCESSING` indefinitely if the `nextDealingTimestamps` entry is not popped.

**Impact:** If a `processOrders` call runs out of gas, the dealing state remains `PROCESSING` (the `nextDealingTimestamps.pop()` at line 380 never executes). In this state:
- No orders can be cancelled (line 82-84 in OrderValidationFacet checks `DealingInProgress`).
- No new NAV updates can occur (requires `AWAITS_NAV_UPDATE`).
- The fund is effectively frozen until a smaller batch succeeds.
- Each order iteration involves ~6 cross-facet delegatecalls and ~4-5 storage writes, compounding gas consumption.

**Recommendation:** Add a maximum batch size constant and enforce it:
```solidity
uint256 constant MAX_ORDERS_PER_BATCH = 50; // adjust based on gas analysis
if (ordersToProcess.length > MAX_ORDERS_PER_BATCH) revert BatchTooLarge();
```
This ensures deterministic gas bounds and prevents accidental or malicious oversize batches from locking the fund state machine.

**Reference:** SWC-128 (DoS With Block Gas Limit)

---

## [CRITICAL] A2-02: Performance Fee BPS Passed by Caller with Insufficient Upper Bound Validation

**ID:** A2-02
**Location:** `/Users/timoneumann/Elysium/Elysium/contracts/src/facets/OrderManagementFacet.sol:429`
**Description:** The `perfFeeBps` for each order is supplied by the admin in the `OrderToProcess` struct and validated only against `BPS_DENOMINATOR` (10000):

```solidity
// Line 429
if (orderToProcess.perfFeeBps > BPS_DENOMINATOR) revert InvalidPerformanceFee(orderToProcess.perfFeeBps);
```

This allows an admin to set `perfFeeBps` to any value from 0 to 10000 (i.e., 0% to 100%). A 100% performance fee would confiscate the entire redemption value to the fund manager. There is also a `MAX_ADJUSTED_FEE_RATE_BPS` constant (2000 = 20%) defined in `Constants.sol:86`, but it is **never enforced** during order processing.

The performance fee calculator address exists in the class info (`perfFeeCalculator`), but the actual `perfFeeBps` value in `OrderToProcess` is completely admin-supplied and not validated against any on-chain fee rate or calculator.

**Impact:** A malicious or compromised admin can set performance fees up to 100% on any redemption order, confiscating investor funds. Even a well-intentioned admin could accidentally set an unreasonable fee rate. This breaks the trust model where investors expect fee rates to be bounded by what was agreed in fund documentation.

**Recommendation:** Validate `perfFeeBps` against the on-chain `MAX_ADJUSTED_FEE_RATE_BPS` constant:
```solidity
if (orderToProcess.perfFeeBps > Constants.MAX_ADJUSTED_FEE_RATE_BPS) 
    revert InvalidPerformanceFee(orderToProcess.perfFeeBps);
```
Or better, validate against the class's registered performance fee calculator to ensure the fee matches on-chain calculation.

**Reference:** SWC-105 (Access Control), Trail of Bits "excessive admin privilege" pattern

---

## HIGH Findings

---

## [HIGH] A2-03: Swap Order Subscribe Amount Starts at Zero - Susceptible to Starvation

**ID:** A2-03
**Location:** `/Users/timoneumann/Elysium/Elysium/contracts/src/facets/OrderManagementFacet.sol:1078-1080`
**Description:** For swap orders (intra-umbrella), the subscribe side is created with `initialAmount = 0` because `dependentFundNum > 0`:

```solidity
// Line 1078-1080
bool deferredAmount = (orderType == FundAdminStructs.OrderType.SUBSCRIBE)
    && (dependentFundNum > 0 || paymentCashFundTokenId != 0);
uint128 initialAmount = deferredAmount ? 0 : SafeCast.toUint128(params.amount);
```

The subscribe order's amount is only increased when the linked redeem order is processed (via `_handleSwapLinking` at line 1272). However, if the redeem side is processed with a partial fill, the subscribe order gets a proportional amount increase. If the redeem is never fully processed or if the redeem order is processed with `amount = 0` (which would revert due to line 428), the subscribe order remains at amount 0 and can never be processed.

Furthermore, since the subscribe order has `noPartialFill` semantics from the swap validation (`SwapSubscribeRequiresNoPartialFill` at line 193), any mismatch in partial fills between the redeem and subscribe sides could leave the subscribe order stranded.

**Impact:** In a swap order scenario, if the redeem side encounters processing issues (price constraints hit, partial fills, or the fund enters an unexpected lifecycle state), the subscribe order with amount 0 is orphaned. The investor's tokens locked for the redeem remain locked, but the subscribe side never executes.

**Recommendation:** 
1. Add explicit handling for orphaned swap subscribe orders (allow cancellation even if amount is 0)
2. Ensure that if a redeem side of a swap is cancelled, the subscribe side is also automatically cancelled (currently line 185-196 only clears dependency links but does not cancel the linked order)
3. Consider validating that partial fills on redeem properly cascade to the subscribe side

**Reference:** Business logic vulnerability - linked order atomicity

---

## [HIGH] A2-04: Redeem Order Holding Check Underflow in Validation at Submission

**ID:** A2-04
**Location:** `/Users/timoneumann/Elysium/Elysium/contracts/src/facets/OrderManagementFacet.sol:966` and `/Users/timoneumann/Elysium/Elysium/contracts/src/facets/OrderValidationFacet.sol:265`
**Description:** In both `_validateOrderRules` (OrderManagementFacet:966) and `_checkClassRulesAtSubmission` (OrderValidationFacet:265), the minimum holding check for redeem orders computes:

```solidity
uint256 finalBalanceValue = currentBalanceValue - orderValueInBaseTokens;
```

If `orderValueInBaseTokens > currentBalanceValue`, this subtraction underflows (reverts in Solidity 0.8+), which is a denial of service for legitimate redemption orders. This can happen because:
1. `currentBalanceValue` is calculated from current dealing prices which may have changed since the order was created
2. For `isTargetAmount` orders, the `orderValueInBaseTokens` is the target cash amount, not the token amount, and may exceed the current balance value if prices dropped

While the revert is "safe" (no state corruption), it prevents valid redemptions when prices move unfavorably, effectively trapping investor funds.

**Impact:** Investors may be unable to submit or have processed legitimate full redemption orders if the calculated order value exceeds their balance value due to price movements. This is particularly problematic during market stress when investors most need to redeem.

**Recommendation:** Add an underflow guard:
```solidity
uint256 finalBalanceValue = currentBalanceValue >= orderValueInBaseTokens 
    ? currentBalanceValue - orderValueInBaseTokens 
    : 0;
```
A final balance of 0 (full redemption) should always be allowed regardless of minimum holding requirements.

**Reference:** SWC-101 (Integer Overflow/Underflow)

---

## [HIGH] A2-05: FX Rate Validation Uses Wrong Currency Pair Direction

**ID:** A2-05
**Location:** `/Users/timoneumann/Elysium/Elysium/contracts/src/facets/OrderManagementFacet.sol:504-510`
**Description:** The FX rate validation logic at processing time performs:

```solidity
if (fxRate != Constants.PRECISION) {
    uint16 classCurrency = s.FundAdmin[0].classes[result.classId].denominationCurrency;
    uint16 fundCurrency = s.FundAdmin[0].funds[TokenIdUtils.toFundTokenId(order.tokenId)].reportingCurrency;
    if (classCurrency != fundCurrency) {
        FXManagementFacet(address(this)).getFXRate(classCurrency, fundCurrency);
        FXManagementFacet(address(this)).validateFxRateDeviation(classCurrency, uint128(fxRate));
    }
}
```

Two issues:
1. `getFXRate(classCurrency, fundCurrency)` is called but its return value is **discarded** (line 508). This only checks that rates exist but does not compare the result to the provided `fxRate`.
2. `validateFxRateDeviation(classCurrency, uint128(fxRate))` validates the provided rate against the `classCurrency`'s rate vs USD, but the `fxRateToFund` parameter represents the conversion rate from class denomination to fund reporting currency. This is a cross-rate, not a direct rate vs USD. The deviation check against the class currency's USD rate may not catch manipulated cross-rates.

**Impact:** An admin could provide an FX rate that deviates significantly from the true cross-rate between class denomination and fund reporting currencies, as long as it stays within the deviation bounds of the class currency's USD rate. This could result in incorrect order valuations, allowing over/under-valued subscriptions or redemptions.

**Recommendation:**
1. Actually use the return value of `getFXRate` to compare against the provided rate:
```solidity
uint256 referenceRate = FXManagementFacet(address(this)).getFXRate(classCurrency, fundCurrency);
// Validate provided fxRate against referenceRate using deviation bounds
```
2. Or validate the cross-rate deviation directly rather than validating against single-currency USD rate.

**Reference:** Business logic - FX rate manipulation

---

## [HIGH] A2-06: Double Validation in Submit Path Wastes Gas but Does Not Prevent TOCTOU

**ID:** A2-06
**Location:** `/Users/timoneumann/Elysium/Elysium/contracts/src/facets/OrderManagementFacet.sol:73,95`
**Description:** The order submission flow calls `OrderValidationFacet.validateOrderSubmission()` twice:

1. Line 73: In `submitOrder()` before `_validateAndPropose()`
2. Line 95: In `executeSubmitOrder()` when the proposal is executed

The first call is a view check that can be frontrun in a multisig scenario. Between proposal and execution, the fund state can change (prices, eligibility, lifecycle status). The second call in `executeSubmitOrder` is the real TOCTOU defense. However, the first call at line 73 is wasted gas for single-signer accounts where `_validateAndPropose` immediately executes the proposal.

More importantly, this double-call pattern creates a **false sense of security** for the `cancelOrder` path: `cancelOrder` (line 126) also validates before `_validateAndPropose`, and `executeCancelOrder` (line 150) re-validates. But the cancel validation at line 82-84 of `OrderValidationFacet` prevents cancellation during PROCESSING state. If a dealing transitions from IDLE to PROCESSING between proposal and execution of cancellation, the user's cancel proposal will fail, but they cannot re-submit because the state has changed.

**Impact:** Gas waste on every submission (double validation in single-signer path). More critically, the cancel flow can be denied by dealing state transitions between proposal and execution in multisig setups.

**Recommendation:** Consider making the first validation call optional (only for UI feedback) or removing it from the on-chain flow, relying solely on execution-time validation. For cancellation, consider allowing cancellation proposals to remain pending across dealing cycles rather than reverting.

**Reference:** TOCTOU (Time-of-Check Time-of-Use)

---

## [HIGH] A2-07: Order Cancel During Swap Does Not Cancel the Linked Order

**ID:** A2-07
**Location:** `/Users/timoneumann/Elysium/Elysium/contracts/src/facets/OrderManagementFacet.sol:185-196`
**Description:** When cancelling a swap order (one side), lines 185-196 only clear the dependency links on the **linked** order:

```solidity
if (order.dependentFundNum > 0) {
    // ...
    if (linkedCurrent.status == FundAdminStructs.OrderStatus.PENDING) {
        linkedOrder.dependentFundNum = 0;
        linkedOrder.dependentUmbrellaId = 0;
        linkedOrder.dependentOrderId = 0;
    }
}
```

This orphans the linked order as a standalone order. For a SWAP, if the redeem side is cancelled:
1. The subscribe side (initially amount=0 for intra-umbrella, or deferred for cross-umbrella) remains PENDING with amount 0
2. The subscribe order's dependency links are cleared, converting it to a standalone subscribe with 0 amount
3. This order can never be processed (amount 0 fails validation) and can never be filled
4. Tokens locked for the subscribe side (if any) remain locked

Similarly, if the subscribe side is cancelled, the redeem side becomes a standalone redeem without the swap linkage, but may still have locked tokens.

**Impact:** Cancelling one side of a swap leaves the other side in an inconsistent state. The orphaned order occupies storage and may have locked tokens that cannot be recovered without a separate cancellation transaction. In edge cases with cross-umbrella swaps, this could lead to permanently locked pipeline counters.

**Recommendation:** When cancelling a swap order, automatically cancel the linked order if it is still PENDING. This ensures atomic swap cancellation:
```solidity
if (linkedCurrent.status == FundAdminStructs.OrderStatus.PENDING) {
    _appendProcessingHistory(linkedOrder, FundAdminStructs.OrderStatus.CANCELLED, linkedCurrent.amount);
    // Also unlock any locked tokens for the linked order
}
```

**Reference:** Business logic - linked order lifecycle integrity

---

## MEDIUM Findings

---

## [MEDIUM] A2-08: Rounding Direction in Redeem Amount Calculation Favors Redeemer

**ID:** A2-08
**Location:** `/Users/timoneumann/Elysium/Elysium/contracts/src/facets/OrderManagementFacet.sol:456-457`
**Description:** The `amountToProcess` for redemptions is calculated using `Math.mulDiv` with default rounding (round down):

```solidity
result.amountToProcess = order.orderType == FundAdminStructs.OrderType.SUBSCRIBE
    ? orderToProcess.amount
    : Math.mulDiv(orderToProcess.amount, PRECISION, result.validationPrice);
```

For redemptions, `amountToProcess` represents dealing tokens to burn. Rounding down means fewer tokens are burned, which favors the redeemer (they keep a tiny residual). Later at line 520, value is calculated as `dealingAmount * dealingPrice / PRECISION` which rounds down, somewhat compensating. However, the asymmetry in rounding across multiple calculation steps can compound over many orders.

**Impact:** Over many redemption orders, small rounding errors systematically favor redeemers at the expense of the fund's NAV accuracy. The impact per order is negligible (sub-wei), but across thousands of orders it can accumulate.

**Recommendation:** Use `Math.Rounding.Ceil` when calculating amounts that should favor the fund (burn more tokens):
```solidity
Math.mulDiv(orderToProcess.amount, PRECISION, result.validationPrice, Math.Rounding.Ceil);
```

**Reference:** Trail of Bits - rounding direction analysis

---

## [MEDIUM] A2-09: classPrice Used for New Dealing Instead of Proper Dealing Price

**ID:** A2-09
**Location:** `/Users/timoneumann/Elysium/Elysium/contracts/src/facets/OrderManagementFacet.sol:483,487`
**Description:** When a new dealing needs to be created for a subscribe order (lines 480-491):

```solidity
if (dealingsPerClass[classNum] == 0) {
    uint16 nextDealingId = uint16(s.FundAdmin[0].classes[order.tokenId].nextDealingId + 1);
    result.dealingId = TokenIdUtils.toDealingTokenId(order.tokenId, nextDealingId);
    result.dealingPrice = result.classPrice; // Uses class price directly
} else {
    result.dealingId = dealingsPerClass[classNum];
    if (s.FundAdmin[0].baseInfo[result.dealingId].dilutionRatio == 0) {
        result.dealingPrice = result.classPrice; // Also uses class price when dilution is 0
    }
}
```

Using `classPrice` as `dealingPrice` for a not-yet-created dealing is correct by design (dilutionRatio = PRECISION at creation, so `classPrice * PRECISION / PRECISION = classPrice`). However, the `_calculateOrderResults` function is `view` and calculates `dealingId` based on `nextDealingId + 1`, but the actual dealing creation happens later in `_processOrdersImpl` at line 299 via `createDealing`. If dealing creation assigns a different ID (e.g., if `nextDealingId` was incremented between validation and execution by another operation), the pre-calculated `dealingId` would be wrong.

**Impact:** In the current single-threaded execution model, this is unlikely to cause issues since validation and execution happen in the same transaction. However, in the two-step validate-then-execute pattern, the `dealingsPerClass` tracking could be stale.

**Recommendation:** Add an assertion after dealing creation that the returned dealingId matches the pre-calculated one, or use the actual dealingId returned from `createDealing` to override the validation result.

**Reference:** TOCTOU pattern

---

## [MEDIUM] A2-10: No Event Emitted for Swap Link Clearing on Cancellation

**ID:** A2-10
**Location:** `/Users/timoneumann/Elysium/Elysium/contracts/src/facets/OrderManagementFacet.sol:185-196`
**Description:** When a swap order is cancelled and the linked order's dependency is cleared, no event is emitted to inform off-chain systems that the linked order has been modified. The `OrderCancelled` event is emitted only for the order being cancelled (line 183), not for the linked order whose dependency was cleared.

**Impact:** Off-chain monitoring systems cannot detect that a swap linkage has been broken. The linked order silently transitions from a swap-dependent order to a standalone order. This breaks auditability and could cause off-chain processing systems to act on stale swap relationship data.

**Recommendation:** Emit an event when swap dependencies are cleared:
```solidity
emit SwapLinkCleared(dependentFundId, linkedOrderId);
```

**Reference:** SWC-116 (Missing Events for Critical State Changes) - adapted for business events

---

## [MEDIUM] A2-11: Holding Value Calculation Uses Current Prices Not Locked Prices

**ID:** A2-11
**Location:** `/Users/timoneumann/Elysium/Elysium/contracts/src/facets/OrderManagementFacet.sol:975-993` and `/Users/timoneumann/Elysium/Elysium/contracts/src/facets/OrderValidationFacet.sol:274-291`
**Description:** The `_getClassBalanceValue` function calculates an account's current holding value by iterating all dealing tokens and computing their current market value. This is used for `maximumHoldingAmount` and `minimumHoldingAmount` checks in class rules. However, the balance includes **locked** tokens (tokens committed to pending orders).

When a user has pending orders, their locked balance is still counted in `balanceOf()`. This means:
1. For subscribe maximum holding check: the current balance includes locked cash tokens from pending subscribe orders, potentially blocking valid new subscriptions
2. For redeem minimum holding check: locked dealing tokens (from pending redemptions) are still counted as held, allowing a user to submit multiple overlapping redemptions that would individually pass the minimum holding check

**Impact:** Users could bypass minimum holding limits by submitting multiple small redemption orders where each passes the minimum holding check independently, but collectively they would reduce the balance below the minimum. Conversely, maximum holding limits may reject valid subscriptions due to locked token inclusion.

**Recommendation:** Use available balance (balance - locked) instead of total balance for holding limit calculations:
```solidity
uint256 balance = FundTokensFacet(address(this)).balanceOf(account, dealingId);
uint256 locked = FundTokensFacet(address(this)).lockedBalance(account, dealingId);
uint256 availableBalance = balance - locked;
```

**Reference:** Business logic - double-counting locked tokens

---

## [MEDIUM] A2-12: `nextDealingTimestamps.pop()` on Empty Array for Zero-Order Processing

**ID:** A2-12
**Location:** `/Users/timoneumann/Elysium/Elysium/contracts/src/facets/OrderManagementFacet.sol:251`
**Description:** When `_processOrdersImpl` is called with an empty `ordersToProcess` array, it pops the last dealing timestamp:

```solidity
if (ordersToProcess.length == 0) {
    s.FundAdmin[0].funds[fundId].nextDealingTimestamps.pop();
    return;
}
```

The dealing state check at line 247-249 ensures the fund is in `PROCESSING` state, which requires `nextDealingTimestamps` to be non-empty (checked in `dealingProcessState`). So the `.pop()` should not revert on empty. However, calling `processOrders` with an empty array allows an admin to advance the dealing state machine without processing any orders. This is by design (skip dealing round), but there is no event emitted for this skip.

Additionally, the `dealingProcessState` check happens in `_processOrdersImpl` (line 247) but NOT in `processOrders`/`executeProcessOrders`. The check happens after ABI decoding, which means the admin can propose a process-orders transaction when the fund is NOT in PROCESSING state, and it will only revert during execution.

**Impact:** An admin can silently skip dealing rounds. Investors who submitted orders expecting processing have no on-chain notification that their orders were skipped. The dealing timestamp is consumed without any order processing.

**Recommendation:** Emit a `DealingSkipped(fundId)` event when processing with zero orders. Consider requiring an explicit "skip dealing" function rather than allowing zero-length order arrays.

**Reference:** Missing events for state changes

---

## [MEDIUM] A2-13: Stale NAV Risk - No Maximum Age Check for NAV at Processing Time

**ID:** A2-13
**Location:** `/Users/timoneumann/Elysium/Elysium/contracts/src/facets/OrderManagementFacet.sol:257`
**Description:** During order processing, the fund price is calculated from the current NAV:

```solidity
fundPrice: NavManagementFacet(address(this)).calculateFundPrice(fundId),
```

The NAV is set during `updateNav` which happens before `processOrders` in the dealing workflow. However, there is no check that the NAV is "fresh" — i.e., that it was updated recently or as part of the current dealing cycle. The dealing state machine transitions to `PROCESSING` when `nextTs <= block.timestamp && nextTs > navUpdatedAt`, meaning the NAV was updated after the dealing time. But there is no maximum age on the NAV relative to the processing timestamp.

If an admin updates NAV at time T, then waits days before calling `processOrders`, the orders are processed with a stale NAV. The `dealingProcessState` will remain `PROCESSING` indefinitely until orders are processed.

**Impact:** Orders could be processed with significantly outdated prices if there is a long delay between NAV update and order processing. This could systematically advantage or disadvantage investors depending on market movements during the delay.

**Recommendation:** Add a maximum staleness check for NAV at processing time:
```solidity
uint32 navAge = uint32(block.timestamp) - s.FundAdmin[0].funds[fundId].navUpdatedAt;
if (navAge > MAX_NAV_STALENESS) revert NavTooStale();
```

**Reference:** Business logic - stale price attack

---

## [MEDIUM] A2-14: totalNavChange Can Overflow int128 Range

**ID:** A2-14
**Location:** `/Users/timoneumann/Elysium/Elysium/contracts/src/facets/OrderManagementFacet.sol:341`
**Description:** The `totalNavChange` field in `OrderProcessData` is declared as `int128` (from FundAdminStructs:218), and it accumulates nav changes from all orders:

```solidity
processData.totalNavChange += validationResult.navChange; // line 341
```

Each individual `navChange` is bounded by `SafeCast.toInt128` (line 539-540), but the **sum** of many nav changes is not bounded. Processing a large batch of subscribe orders could cause `totalNavChange` to overflow `int128`. The `int128` max is ~1.7e38, which at PRECISION=1e18 represents ~1.7e20 base tokens. While unlikely in practice for single transactions, it is not protected.

**Impact:** If `totalNavChange` overflows, the SafeCast at line 539-540 prevents individual overflow, but the unchecked `+=` at line 341 could silently wrap around in Solidity 0.8+ causing a revert. This would make large batches impossible to process, which is a DoS vector for high-value funds.

**Recommendation:** Use `int256` for `totalNavChange` accumulation and only cast to `uint128` at the final NAV write.

**Reference:** SWC-101 (Integer Overflow)

---

## LOW Findings

---

## [LOW] A2-15: Order Cancel Does Not Check Dealing Lock Period

**ID:** A2-15
**Location:** `/Users/timoneumann/Elysium/Elysium/contracts/src/facets/OrderValidationFacet.sol:69-85`
**Description:** Order cancellation validation checks: order ownership, pending status, not forced redemption, and not in PROCESSING state. But it does not check whether the dealing's lock period has been reached. While dealing lock is checked at submission (line 142), cancelling and re-submitting an order could be used to circumvent time-based restrictions if the lock period changes between submission and re-submission.

**Impact:** Low - lock period is enforced at submission time, and the admin controls the dealing schedule, making exploitation difficult.

**Recommendation:** Consider whether this is an acceptable business flow or if additional checks are needed.

---

## [LOW] A2-16: `_hasUmbrellaBalance` Iterates All User Holdings

**ID:** A2-16
**Location:** `/Users/timoneumann/Elysium/Elysium/contracts/src/facets/OrderManagementFacet.sol:724-735`
**Description:** The `_hasUmbrellaBalance` function calls `getUserHoldings(account)` which returns ALL holdings for a user, then iterates through all of them to check if any belong to the specified umbrella. For users with many holdings across multiple umbrellas, this is O(n) in the total number of holdings.

This is called from `_handleMinimumSubscriptionOnRedeem` during order processing, which is already within the main processing loop.

**Impact:** Gas cost scales linearly with user's total holdings count, not just holdings in the target umbrella. For power users with many positions, this could significantly increase processing gas costs.

**Recommendation:** Use the hierarchical holdings index (umbrella-level) instead of iterating all holdings:
```solidity
// Use getUmbrellaHoldings(account, umbrellaId) if available
```

---

## [LOW] A2-17: Missing Zero-Price Check After `calculateFundPrice`

**ID:** A2-17
**Location:** `/Users/timoneumann/Elysium/Elysium/contracts/src/facets/OrderManagementFacet.sol:257`
**Description:** `calculateFundPrice` returns `PRECISION` when `totalSupply == 0`, and `nav * PRECISION / totalSupply` otherwise. If NAV is 0 and totalSupply > 0, the fund price would be 0. This would cause division by zero in subsequent calculations like `result.fundTokensDelta = Math.mulDiv(result.value, PRECISION, result.fundPrice)` at line 537.

The `NavManagementFacet.calculateFundPrice` does not revert on zero price. While `ZeroPrice` error exists in ISharedErrors, it is not used in the processing path.

**Impact:** If NAV is somehow set to 0 with outstanding supply (should be prevented by business logic), order processing would revert with an opaque math error instead of a descriptive error.

**Recommendation:** Add explicit zero-price check:
```solidity
if (processData.fundPrice == 0) revert ISharedErrors.ZeroPrice();
```

---

## [LOW] A2-18: Forced Redemption Bypasses Class Rules Validation

**ID:** A2-18
**Location:** `/Users/timoneumann/Elysium/Elysium/contracts/src/facets/FundLifecycleFacet.sol:522-569` (context), `/Users/timoneumann/Elysium/Elysium/contracts/src/facets/OrderManagementFacet.sol:322-333`
**Description:** Forced redemption orders created via `_forceSubmitRedemptionOrderInternal` bypass all class rules validation at submission. During processing (lines 322-333), class minimum subscription and class-level rules ARE checked via `_handleMinimumSubscriptionOnRedeem` and `_handleClassMinimumOnRedeem`. However, `_checkClassRulesAtProcessing` (line 583, called from `_determineOrderOutcome`) does validate class rules including minimum holding amount.

If a forced redemption for a partial amount leaves the investor's balance below `minimumHoldingAmount`, it will revert during processing. This means a manager/admin who initiated a forced partial redemption would get an unexpected revert.

**Impact:** Forced partial redemptions may fail if they violate class rules. The manager must either force a full redemption or adjust class rules first.

**Recommendation:** Document this behavior or skip class rules for forced redemptions during processing.

---

## [LOW] A2-19: `dueDate` Can Be Set to `type(uint32).max` Preventing Processing

**ID:** A2-19
**Location:** `/Users/timoneumann/Elysium/Elysium/contracts/src/facets/OrderManagementFacet.sol:1120-1133`
**Description:** The `_calculateDueDate` function accepts a `params.dueDate` of up to `type(uint32).max` (year 2106). An order with such a far-future due date would pass submission validation but could never be processed (line 430: `if (block.timestamp < order.dueDate) revert DueDateNotReached`).

**Impact:** An investor could submit an order with an extremely distant due date, permanently occupying a slot in the order book and locking tokens without any practical intent to be processed.

**Recommendation:** Add a maximum due date bound (e.g., current time + 365 days):
```solidity
if (params.dueDate > currentTimestamp + MAX_DUE_DATE_OFFSET) revert DueDateTooFar();
```

---

## [LOW] A2-20: `validateOrderForProcessing` Is External View but Modifies Conceptual State

**ID:** A2-20
**Location:** `/Users/timoneumann/Elysium/Elysium/contracts/src/facets/OrderManagementFacet.sol:392-412`
**Description:** `validateOrderForProcessing` is marked `external view` and called via `this.validateOrderForProcessing()` at line 273. This creates a cross-facet external call within the Diamond. While the function correctly uses `view` and does not modify state, the `this.` call pattern means it goes through the Diamond's fallback function, paying the gas cost of function selector lookup and delegatecall. This is called once per order in the processing batch.

**Impact:** Unnecessary gas overhead per order in the processing loop due to external call overhead through the Diamond proxy.

**Recommendation:** Consider making this an `internal` function or at minimum an `internal view` that is also exposed externally for off-chain use via a separate wrapper.

---

## INFORMATIONAL Findings

---

## [INFORMATIONAL] A2-21: Floating Pragma

**ID:** A2-21
**Location:** `/Users/timoneumann/Elysium/Elysium/contracts/src/facets/OrderManagementFacet.sol:2`, `/Users/timoneumann/Elysium/Elysium/contracts/src/facets/OrderValidationFacet.sol:2`
**Description:** Both contracts use `pragma solidity ^0.8.28;` which allows compilation with any 0.8.x compiler >= 0.8.28. While this is acceptable for development, production deployments should pin to a specific version.

**Impact:** Different compiler versions may have different optimization behaviors or bugfixes.

**Recommendation:** Pin to exact version: `pragma solidity 0.8.28;`

**Reference:** SWC-103 (Floating Pragma)

---

## [INFORMATIONAL] A2-22: Supply Dust Tolerance May Accumulate

**ID:** A2-22
**Location:** `/Users/timoneumann/Elysium/Elysium/contracts/src/facets/OrderManagementFacet.sol:1206-1222`
**Description:** The supply decrement logic uses `SUPPLY_DUST_TOLERANCE` (1e8) to handle rounding:

```solidity
if (validationResult.classTokensDelta > classSupply) {
    if (validationResult.classTokensDelta - classSupply > Constants.SUPPLY_DUST_TOLERANCE) revert ISharedErrors.SupplyUnderflow();
    s.FundAdmin[0].baseInfo[validationResult.classId].totalSupply = 0;
}
```

Each time dust tolerance is used, up to 1e8 tokens of "phantom supply" is absorbed. Over many orders, this systematic absorption could accumulate to measurable amounts.

**Impact:** Negligible in practice (1e8 / 1e18 = 1e-10 tokens per occurrence).

**Recommendation:** Monitor dust absorption events in off-chain analytics. Consider emitting an event when dust tolerance is applied.

---

## [INFORMATIONAL] A2-23: `executedDealingAmount` Parameter in `_checkClassRules` Is Never Used

**ID:** A2-23
**Location:** `/Users/timoneumann/Elysium/Elysium/contracts/src/facets/OrderManagementFacet.sol:849`
**Description:** The `_checkClassRules` function accepts an `executedDealingAmount` parameter (line 849) but never uses it in the function body. It is passed from `_checkClassRulesAtProcessing` at line 1023 but serves no purpose in the validation logic.

**Impact:** Dead parameter - no security impact but increases code complexity and gas (marginal).

**Recommendation:** Remove the unused parameter.

---

## [INFORMATIONAL] A2-24: Cross-Umbrella Cash Pipeline Counter Not Validated at Processing

**ID:** A2-24
**Location:** `/Users/timoneumann/Elysium/Elysium/contracts/src/facets/OrderManagementFacet.sol:1187-1189`
**Description:** During subscribe execution for cross-umbrella orders, `cashPendingSubscribe` is decremented:

```solidity
uint128 consumed = SafeCast.toUint128(validationResult.cashAmount);
order.cashPendingSubscribe -= consumed > order.cashPendingSubscribe ? order.cashPendingSubscribe : consumed;
```

The clamping logic (`consumed > order.cashPendingSubscribe ? ...`) prevents underflow but silently absorbs any excess. If the amount processed exceeds what was settled through the pipeline, the difference is silently ignored.

**Impact:** The pipeline counter is a tracking mechanism, not a security invariant. Silent clamping may mask off-chain settlement errors.

**Recommendation:** Consider reverting instead of clamping to catch pipeline inconsistencies early:
```solidity
if (consumed > order.cashPendingSubscribe) revert PipelineCounterMismatch();
```

---

## Cross-Cutting Observations

### Access Control Model
The order management system uses a two-tier access control:
- **USER role**: Submit and cancel orders (via `_validateAndPropose` with `ROLE_USER`)
- **ADMIN role**: Process orders (via `_validateAndPropose` with `ROLE_ADMIN`)

The `onlyInternalExecution` modifier on all `execute*` functions correctly prevents direct external calls, requiring all execution to go through the proposal system. The `internalExecutionContext` flag is properly set/unset in `BaseFacet._validateAndPropose()` with the reset in a non-reverting path (line 153).

### Reentrancy Assessment
The system makes extensive cross-facet calls via `FacetName(address(this)).function()` which are delegatecalls through the Diamond proxy. These are all internal to the Diamond and share the same storage, so traditional reentrancy via external calls is not a concern. The `reentrancyLock` in AppStorage exists but is not used in the order management facets — it appears to be used in the AccountFacet proposal execution flow.

### Integer Safety
Solidity 0.8.28 provides built-in overflow/underflow protection. `SafeCast` from OpenZeppelin is used consistently for downcasting. `Math.mulDiv` is used for multiplication-then-division to avoid intermediate overflow.

### State Machine Integrity
The dealing state machine (IDLE -> AWAITS_NAV -> PROCESSING -> IDLE) is enforced via `dealingProcessState()` checks. The `nextDealingTimestamps` array acts as a stack (push/pop). Processing pops the timestamp at the end. Key risk: if processing reverts after partial execution, the state remains PROCESSING.
