# Audit V7 — Agent 3: Order Processing

**Date:** 2026-02-12
**Scope:** `OrderManagementFacet.sol`, `OrderValidationFacet.sol`
**Auditor:** Agent 3 (Order Processing)

---

## Prior Finding Verification

### C-02: Fund isolation breach in cross-umbrella swaps
**Status: STILL PRESENT (ACKNOWLEDGED)**
**Evidence:** `OrderManagementFacet.sol` lines 1280-1313 — `_executeSwapOrder` decomposes SWAP into a REDEEM order in one fund and a SUBSCRIBE order in another. Cross-umbrella swaps link orders across umbrellas via `dependentUmbrellaId` and `dependentFundNum`. The NatSpec at line 1278-1279 documents this as a client responsibility. The cross-umbrella boundary is by design. No code change observed since V6 — finding remains acknowledged.

### H-05: Fund closure ignores pending orders
**Status: STILL PRESENT (REVERTED)**
**Evidence:** `FundLifecycleFacet.sol` line 722-732 — `validateOrderLifecycle` checks entity status but does not scan for pending orders during closure. This was explicitly reverted as infeasible for millions of orders. The closure path relies on `totalSupply == 0` check elsewhere. No change.

### H-10: Forced redemption TOCTOU vulnerability
**Status: STILL PRESENT (ACKNOWLEDGED)**
**Evidence:** `OrderValidationFacet.sol` line 80 — `isForcedRedemption` flag prevents user cancellation. The TOCTOU gap between submission and execution remains (balance could change). However, `_executeOrderTransfer` at line 1193 burns dealing tokens from the investor — if they don't have sufficient balance, the burn reverts. NatSpec documents that execution re-checks balance and caps at current holdings. No code change since V6.

### H-18: Rounding error in order fill detection
**Status: STILL PRESENT (ACKNOWLEDGED)**
**Evidence:** `OrderManagementFacet.sol` line 564-565 — `ROUND_TOLERANCE = 1e10 + 2` is applied with intentional asymmetric rounding favoring the fund. NatSpec at line 564 documents this. No code change.

### V5-H01: Cancel unlock incorrect for partial target-amount redeems
**Status: VERIFIED CORRECT**
**Evidence:** `OrderManagementFacet.sol` lines 168-181 — NatSpec at line 168-171 documents the behavior. `current.amount` tracks the REMAINING target value, not the original. Conversion via `minPrice` yields only the remaining locked dealing tokens. The unlock correctly matches what was locked.

### V5-H03: Performance fee double-deducted for target-amount redeems
**Status: FIXED**
**Evidence:** `OrderManagementFacet.sol` lines 446-453 — The `validationPrice` is reduced by perf fee BPS for target-amount redeems to gross-up the token burn amount. This is applied once in `_calculateOrderResults`, and the canonical fee deduction at lines 524-528 handles the actual fee extraction. No double-deduction.

### V6-C-06: Unbounded processOrders — no limit on orders array length
**Status: STILL PRESENT**
**Evidence:** `OrderManagementFacet.sol` line 245-381 — `_processOrdersImpl` loops over `ordersToProcess.length` twice (Step 1 validation at line 270, Step 2 execution at line 286) with no maximum length check. The only guard is `ordersToProcess.length == 0` at line 250. No cap introduced since V6.

### E-BC22: TokenId storage mutation on partial fill
**Status: STILL PRESENT**
**Evidence:** `OrderManagementFacet.sol` line 302 — `order.tokenId = dealingId` permanently mutates the subscribe order's tokenId from classId to dealingId during first processing. See finding V7-C-01 below for full analysis.

---

## New Findings

### V7-C-01: Subscribe Order TokenId Mutation Corrupts Subsequent Partial Fill Pricing

**Severity:** CRITICAL
**Category:** Logic Error
**Location:** `src/facets/OrderManagementFacet.sol` lines 302, 444, 1146-1162

**Description:**
When a subscribe order is partially filled, `order.tokenId` is permanently mutated from the classId to the dealingId at line 302 (`order.tokenId = dealingId`). On subsequent processing batches for the same order, `_calculateOrderPrices` at line 1151-1154 treats the now-dealingId as a classId:

```solidity
if (orderType == FundAdminStructs.OrderType.SUBSCRIBE) {
    classId = tokenId;  // tokenId is now a dealingId after first partial fill
    classPrice = NavManagementFacet(address(this)).calculateClassPrice(classId, fundPrice);
    validationPrice = classPrice;
}
```

`calculateClassPrice(dealingId, fundPrice)` reads `baseInfo[dealingId].dilutionRatio` (the dealing's dilution ratio, which starts at PRECISION but diverges as fees are minted) instead of the class's dilutionRatio. This produces incorrect class prices for all subsequent partial fills.

Additionally, at lines 293-302 in Step 2 of the subsequent batch, `getClassNum(order.tokenId)` correctly extracts the class number from the dealingId, but `createDealing(order.tokenId, 0, 0)` passes the old dealingId as the `classId` parameter. `createDealing` then increments `classes[oldDealingId].nextDealingId` (a ClassInfo struct at a dealing token ID — undefined behavior) and creates a new dealing under this phantom "class".

**Impact:**
- Incorrect pricing for all partial fill subscribe orders after the first fill
- Creation of phantom dealings under non-existent classes
- NAV corruption from mispriced subscriptions
- Potential loss of investor funds (buying shares at wrong price)

**Recommendation:**
Store the original classId separately in the Order struct and always use it for price calculation:

```solidity
// In Order struct:
uint256 originalClassId; // Set once at submission, never mutated

// In _calculateOrderPrices for SUBSCRIBE:
classId = order.originalClassId; // Use stored classId, not mutated tokenId
```

Alternatively, derive the classId from the dealingId at processing time:
```solidity
classId = TokenIdUtils.toClassTokenId(order.tokenId); // Works for both classId and dealingId
```

**Status:** OPEN

---

### V7-H-01: FX Rate Deviation Validation Compares Cross-Rate Against USD Rate

**Severity:** HIGH
**Category:** Logic Error
**Location:** `src/facets/OrderManagementFacet.sol` lines 504-511

**Description:**
When processing an order with an FX rate (class denomination differs from fund reporting currency), the validation at line 509 calls:

```solidity
FXManagementFacet(address(this)).validateFxRateDeviation(classCurrency, uint128(fxRate));
```

The `fxRate` parameter is `orderToProcess.fxRateToFund` — a cross-rate from class denomination currency to fund reporting currency (e.g., GBP to EUR). However, `validateFxRateDeviation` in FXManagementFacet (line 223-234) compares the provided rate against `fxRegistry[classCurrency].rateVsUSD` — the rate of the class currency versus USD.

When the fund's reporting currency is NOT USD (e.g., EUR), the comparison is mathematically meaningless: a GBP->EUR cross-rate (~1.17) is compared against the GBP->USD rate (~1.27). These are fundamentally different quantities. The deviation check becomes ineffective — it may approve manipulated rates or reject valid rates depending on the currency pair involved.

Line 508 calls `getFXRate(classCurrency, fundCurrency)` but discards the result, missing the opportunity to compute the expected cross-rate for comparison.

**Impact:**
- Admin can supply manipulated FX rates for order processing that pass deviation checks
- Valid FX rates may be rejected, blocking legitimate order processing
- Incorrect cash amounts calculated for multi-currency orders (line 516 for subscribe, line 532 for redeem)
- This is the same logical bug class as V5-C02 (fixed in settlement) but present in order processing

**Recommendation:**
Compare the provided rate against the computed cross-rate, not the single-currency USD rate:

```solidity
if (classCurrency != fundCurrency) {
    uint256 expectedCrossRate = FXManagementFacet(address(this)).getFXRate(classCurrency, fundCurrency);
    FXManagementFacet(address(this)).validateFxRateDeviationFromReference(
        uint128(fxRate), 
        uint128(expectedCrossRate)
    );
}
```

**Status:** OPEN
**Reference:** E-BC23, V5-C02 (same bug class)

---

### V7-H-02: Uncapped Performance Fee Allows Up To 100% Extraction

**Severity:** HIGH
**Category:** Logic Error
**Location:** `src/facets/OrderManagementFacet.sol` line 429

**Description:**
The performance fee validation in `_validateOrderPreconditions` only checks:

```solidity
if (orderToProcess.perfFeeBps > BPS_DENOMINATOR) revert InvalidPerformanceFee(orderToProcess.perfFeeBps);
```

This allows `perfFeeBps` up to 10000 (100% fee). The protocol defines `MAX_ADJUSTED_FEE_RATE_BPS = 2000` (20%) in `Constants.sol` line 86, but this constant is never enforced at order processing time.

An admin calling `processOrders` can specify `perfFeeBps = 10000`, extracting the entire redemption value as a performance fee. Combined with forced redemption (where the investor cannot cancel), this enables complete fund drain.

**Impact:**
- Admin can extract 100% of a redemption's value as performance fees
- Combined with forced redemption: complete investor fund drain
- The `MAX_ADJUSTED_FEE_RATE_BPS` constant is effectively dead code

**Recommendation:**
Enforce the protocol cap:

```solidity
if (orderToProcess.perfFeeBps > Constants.MAX_ADJUSTED_FEE_RATE_BPS) {
    revert InvalidPerformanceFee(orderToProcess.perfFeeBps);
}
```

**Status:** OPEN
**Reference:** V6-C-03, E-BC28

---

### V7-H-03: No Limit on processOrders Array Length Enables Gas DoS

**Severity:** HIGH
**Category:** Denial of Service
**Location:** `src/facets/OrderManagementFacet.sol` lines 245-381

**Description:**
`_processOrdersImpl` iterates over `ordersToProcess` twice (Step 1: validation at line 270, Step 2: execution at line 286) with no maximum length check. Each order iteration involves multiple cross-facet calls (`calculateFundPrice`, `calculateClassPrice`, `calculateDealingPrice`, `validateOrderLifecycle`, `isEligible`, etc.), dynamic memory allocations (`OrderValidationResult[]`), and storage reads/writes.

The gas cost per order is substantial:
- Step 1: ~50k-100k gas per order (view calls, price calculations, class rule checks)
- Step 2: ~200k-400k gas per order (unlock, burn, mint, storage writes, events)

With a private chain's block gas limit, a sufficiently large array could still exceed limits or cause timeouts.

**Impact:**
- Transaction revert if array is too large for block gas limit
- Memory allocation failure for large `OrderValidationResult[]` array
- Potential DoS of the dealing process — if processOrders always reverts, the dealing state machine is stuck in PROCESSING

**Recommendation:**
Add a configurable maximum batch size:

```solidity
uint256 constant MAX_ORDERS_PER_BATCH = 200;
if (ordersToProcess.length > MAX_ORDERS_PER_BATCH) revert BatchTooLarge();
```

**Status:** OPEN
**Reference:** V6-C-06

---

### V7-M-01: Duplicate Order Index in processOrders Causes Batch Revert

**Severity:** MEDIUM
**Category:** Logic Error / Denial of Service
**Location:** `src/facets/OrderManagementFacet.sol` lines 267-351

**Description:**
If the same `orderIndex` appears twice in the `ordersToProcess` array, Step 1 (validation) succeeds for both since no state is modified. In Step 2 (execution), the first iteration processes the order normally (unlock, burn, mint). The second iteration attempts to unlock the same tokens again, which reverts at `unlockTokens` because the locked balance was already reduced.

This causes the entire `processOrders` transaction to revert, including all valid orders in the batch. An admin (or a malicious co-signer in a multisig) could accidentally or intentionally include a duplicate to block order processing.

**Impact:**
- Entire batch of orders fails to process due to one duplicate
- Potential DoS of dealing process if admin keeps submitting batches with duplicates
- No graceful handling — revert with opaque error from FundTokensFacet

**Recommendation:**
Check for duplicate order indices before processing:

```solidity
for (uint256 i = 0; i < ordersToProcess.length; i++) {
    for (uint256 j = i + 1; j < ordersToProcess.length; j++) {
        if (ordersToProcess[i].orderIndex == ordersToProcess[j].orderIndex) {
            revert DuplicateOrderIndex(ordersToProcess[i].orderIndex);
        }
    }
}
```

Or use a bitmap for order indices already processed.

**Status:** OPEN

---

### V7-M-02: Unbounded Iteration in _hasUmbrellaBalance During Order Processing

**Severity:** MEDIUM
**Category:** Gas Optimization / Denial of Service
**Location:** `src/facets/OrderManagementFacet.sol` lines 724-735

**Description:**
`_hasUmbrellaBalance` iterates over ALL user holdings (`getUserHoldings(account)`) and makes an external `balanceOf` call for each holding matching the umbrella. This is called from `_handleMinimumSubscriptionOnRedeem` (line 789) during order processing for every REDEEM order.

A user with many holdings (e.g., 100+ dealing tokens across multiple funds) causes significant gas overhead per redeem order. Combined with the unbounded `ordersToProcess` array (V7-H-03), this creates an O(n*m) gas cost where n = orders and m = user holdings.

Similarly, `_getClassBalanceValue` (line 975-994) iterates class holdings with external calls per dealing token. It is called from `_checkClassRulesAtProcessing` (line 583) for EVERY order, adding further O(k) cost per order where k = class holdings.

**Impact:**
- Gas cost of processOrders grows unpredictably with user holding counts
- Could push gas cost over block limits for users with many positions
- Amplifies the DoS risk from V7-H-03

**Recommendation:**
- Consider maintaining a counter for per-umbrella balance (increment on mint, decrement on burn) instead of iterating all holdings
- Add early termination in `_hasUmbrellaBalance` (already present at line 730-731, but the loop itself is the issue)
- Cap the maximum number of holdings iterated

**Status:** OPEN

---

### V7-M-03: validateOrderForProcessing Is Public External — Exposes Internal Pricing

**Severity:** MEDIUM
**Category:** Information Disclosure
**Location:** `src/facets/OrderManagementFacet.sol` lines 392-412

**Description:**
`validateOrderForProcessing` is an `external view` function exposed on the Diamond proxy. It reveals:
- Current fund price, class price, dealing price for any order
- Exact amounts that would be processed, including performance fee calculations
- Fill detection results and partial fill amounts
- FX rate validation results

While view functions are generally not security-sensitive, this function exposes precise internal pricing calculations that could be used by a frontrunner to optimize their attack strategy. On a private chain this is lower risk, but the function accepts arbitrary `OrderToProcess` parameters allowing any caller to simulate processing with different FX rates and fee values.

**Impact:**
- Enables precise price discovery for potential frontrunning on non-private chains
- Allows simulation of arbitrary fee/FX rate combinations before submitting malicious processOrders

**Recommendation:**
Add access control if this function should only be called by authorized parties:
```solidity
function validateOrderForProcessing(...) external view onlyAuthorized returns (...) {
```

Or accept the risk since this is a private chain deployment.

**Status:** OPEN

---

### V7-M-04: Intra-Umbrella Swap Linking Assumes Same Currency for Redeem Cash and Subscribe Fund

**Severity:** MEDIUM
**Category:** Logic Error
**Location:** `src/facets/OrderManagementFacet.sol` lines 1267-1275

**Description:**
In `_handleSwapLinking`, for intra-umbrella swaps (where `redeemToCashFundTokenId == 0`), the code at line 1274 locks cash tokens for the dependent subscribe order:

```solidity
FundTokensFacet(address(this)).lockTokens(
    dependentOrder.investor, 
    _resolveCashFundToken(depFundId),  // Uses fund's reportingCurrency
    validationResult.value             // Value in fund reporting currency
);
```

The cash token resolved is for the subscribe fund's reporting currency. However, the cash minted to the investor during redeem processing (line 1194) is in the class denomination currency (`validationResult.cashTokenId`). If the redeem class's denomination currency differs from the subscribe fund's reporting currency within the same umbrella, the lock will fail because the investor has no balance in the subscribe fund's cash token.

**Impact:**
- Intra-umbrella swaps between classes with different denomination currencies revert
- Orders get stuck in processing state if this path is hit
- The cross-umbrella path (with settlement) must be used for cross-currency swaps regardless of umbrella boundaries

**Recommendation:**
Either:
1. Validate at swap submission that intra-umbrella swaps require same currency, or
2. Route cross-currency swaps to the settlement path even within the same umbrella:

```solidity
// In _executeSwapOrder:
bool isCrossCurrency = classDenomination(redeemParams) != fundReportingCurrency(subscribeFundId);
uint256 redeemToCash = (redeemUmbrella != subscribeUmbrella || isCrossCurrency) 
    ? _resolveCashFundToken(subscribeFundId) : 0;
```

**Status:** OPEN

---

### V7-L-01: Dependent Order Link Clearing Not Emitted as Event

**Severity:** LOW
**Category:** Missing Events
**Location:** `src/facets/OrderManagementFacet.sol` lines 185-196

**Description:**
When a swap order is cancelled, the dependent order's link fields are cleared at lines 192-194:
```solidity
linkedOrder.dependentFundNum = 0;
linkedOrder.dependentUmbrellaId = 0;
linkedOrder.dependentOrderId = 0;
```

No event is emitted for this state change. Off-chain systems tracking order dependencies cannot detect that a linked order has been unlinked.

**Impact:**
- Off-chain order tracking systems may show stale dependency information
- Audit trail incomplete for swap order lifecycle

**Recommendation:**
Emit an event when clearing the dependency link:
```solidity
emit OrderDependencyCleared(dependentFundId, linkedOrderId);
```

**Status:** OPEN

---

### V7-L-02: Holding Limit Underflow Produces Opaque Revert at Processing Time

**Severity:** LOW
**Category:** Error Handling
**Location:** `src/facets/OrderManagementFacet.sol` line 966

**Description:**
At processing time, `_validateOrderRules` calculates:
```solidity
uint256 finalBalanceValue = currentBalanceValue - valueToCheck;
```

If `valueToCheck > currentBalanceValue` (possible when prices moved significantly between submission and processing), this produces an arithmetic underflow revert rather than a descriptive error.

**Impact:**
- Opaque revert message makes debugging difficult
- Could block legitimate order processing if class balance value dropped due to NAV changes

**Recommendation:**
Add an explicit check:
```solidity
if (valueToCheck > currentBalanceValue) {
    revert HoldingBelowMinimum(0, minHolding); // or a specific error
}
```

**Status:** OPEN

---

### V7-L-03: Cancel of Cross-Umbrella Redeem Uses Mutated tokenId for Cash Resolution

**Severity:** LOW
**Category:** Logic Error (Mitigated)
**Location:** `src/facets/OrderManagementFacet.sol` lines 163-166

**Description:**
For cross-umbrella redeem cancellation at line 165:
```solidity
FundTokensFacet(address(this)).unlockTokens(
    accountAddress, 
    _resolveCashFundTokenForClass(order.tokenId), // tokenId could be dealingId after partial fill
    order.cashPendingSwap
);
```

If the redeem order was partially filled before cancellation, `order.tokenId` remains the original dealingId (redeem orders don't mutate tokenId — only subscribe orders do at line 302). So this is actually safe.

However, for subscribe orders in the cross-umbrella path (line 159-162), `order.paymentCashFundTokenId` is used directly, which is set at submission and never mutated. This is also safe.

**Impact:** None — the analysis confirms correctness. This is documented for completeness.

**Status:** NOT APPLICABLE (confirmed correct)

---

### V7-I-01: Missing Validation That fxRateToFund Is PRECISION When Currencies Match

**Severity:** INFORMATIONAL
**Category:** Input Validation
**Location:** `src/facets/OrderManagementFacet.sol` lines 499-511

**Description:**
The FX rate validation at line 504 only validates when `fxRate != Constants.PRECISION`. If admin provides `fxRateToFund = 0` (which becomes PRECISION at line 501), no validation occurs. If admin provides `fxRateToFund = PRECISION` for a cross-currency order, validation is also skipped — the order processes at a 1:1 rate regardless of actual exchange rates.

There is no check that `fxRateToFund != PRECISION` when `classCurrency != fundCurrency`. An admin could submit a cross-currency order with `fxRateToFund = 0`, processing it at a 1:1 FX rate.

**Impact:**
- Admin can bypass FX rate validation by setting `fxRateToFund = 0` or `PRECISION`
- Cross-currency orders processed at 1:1 rate regardless of actual FX rates
- On a private chain with trusted admin, this is informational

**Recommendation:**
When currencies differ, require a non-PRECISION FX rate:
```solidity
if (classCurrency != fundCurrency && fxRate == Constants.PRECISION) {
    revert FXRateRequiredForCrossCurrency();
}
```

**Status:** OPEN

---

### V7-I-02: Step 1 classId Derivation Reads Mutated tokenId for Subscribe Orders

**Severity:** INFORMATIONAL
**Category:** Code Quality
**Location:** `src/facets/OrderManagementFacet.sol` line 425

**Description:**
In `_validateOrderPreconditions` at line 425:
```solidity
uint256 classId = order.orderType == FundAdminStructs.OrderType.SUBSCRIBE 
    ? order.tokenId 
    : TokenIdUtils.toClassTokenId(order.tokenId);
```

For subscribe orders that were partially filled in a prior batch, `order.tokenId` is a dealingId (mutated at line 302). This passes a dealingId to `validateOrderLifecycle` as the classId. The function checks `classes[dealingId].status` — since no class exists at the dealing token ID, the status defaults to 0 (ACTIVE), so the check passes vacuously. This does not cause incorrect behavior but is semantically wrong.

**Impact:** None — the lifecycle check passes because default enum value is ACTIVE. But it demonstrates that the tokenId mutation has side effects throughout the codebase.

**Recommendation:** Use `TokenIdUtils.toClassTokenId(order.tokenId)` for all subscribe order cases, which correctly strips the dealing bits:
```solidity
uint256 classId = TokenIdUtils.toClassTokenId(order.tokenId);
```

**Status:** OPEN

---

## Summary

| Severity | Count | IDs |
|----------|-------|-----|
| CRITICAL | 1 | V7-C-01 |
| HIGH | 3 | V7-H-01, V7-H-02, V7-H-03 |
| MEDIUM | 4 | V7-M-01, V7-M-02, V7-M-03, V7-M-04 |
| LOW | 2 | V7-L-01, V7-L-02 |
| INFORMATIONAL | 2 | V7-I-01, V7-I-02 |
| **Total** | **12** | |

### Prior Finding Status Summary

| Prior ID | Status |
|----------|--------|
| C-02 | STILL PRESENT (ACKNOWLEDGED) |
| H-05 | STILL PRESENT (REVERTED) |
| H-10 | STILL PRESENT (ACKNOWLEDGED) |
| H-18 | STILL PRESENT (ACKNOWLEDGED) |
| V5-H01 | VERIFIED CORRECT |
| V5-H03 | FIXED |
| V6-C-06 | STILL PRESENT (= V7-H-03) |
| E-BC22 | STILL PRESENT (= V7-C-01) |
