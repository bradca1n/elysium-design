# Security Audit V7 — Agent 6: View Functions

**Date:** 2026-02-12
**Scope:** ViewCallsFacet, ViewCalls2Facet, AdminViewCallsFacet, ManagerViewCallsFacet
**Auditor:** Agent 6 (View Functions)

---

## Prior Finding Verification

### H-07: Unbounded view function loops
**Status: FIXED**
**Evidence:** All view functions now use O(1) `_getOrderBookSize` (tail - 1) for counts. Order queries use `getProcessableOrders` with pagination (`startIndex`, `maxOrders`). Transfer queries use `(offset, limit)`. `getEligibleClasses` is bounded by `MAX_ELIGIBLE_CLASSES = 10000`. The `_collectUserTransferIndices` k-way merge is bounded by the user's actual holdings.

### H-16: Pagination double-offset bug
**Status: FIXED**
**Evidence:** In `_getOrdersForAllUsers` (ViewCallsFacet.sol lines 448-501), offset is applied during index collection, and then `_filterAndPaginateOrders` is called with `offset=0` (line 498). No double-offset. The `_filterAndPaginateTransfers` similarly applies offset correctly via the `skipped` counter.

### V3-H04: `_countFundInvestors` off-by-one
**Status: FIXED**
**Evidence:** `_countFundInvestors` (ManagerViewCallsFacet.sol lines 330-347) now iterates `allAccounts` with proper `offset/limit` bounds. The investor counting logic itself has a separate bug (see V7-M01 below), but the original off-by-one in the counter itself is fixed.

### V3-H05: `pendingOrderCount` reports total not pending
**Status: PARTIALLY FIXED**
**Evidence:** `getPendingOrderCount` in ManagerViewCallsFacet (line 224) still uses `_getOrderBookSize` which returns `tail - 1` (total orders ever created, not just pending). However, `getPendingOrderCountPaginated` (lines 236-256) correctly checks individual order status. The non-paginated version remains a misnomer. Additionally, `getSystemOverview` in AdminViewCallsFacet (line 59) uses `_getOrderBookSize` and labels it `totalPendingOrders` -- same issue. See V7-M02.

---

## New Findings

### V7-M01: `_hasAnyDealingBalance` Misses Last Class (Off-by-One)

**Severity:** MEDIUM
**Category:** Logic Error
**Location:** `src/facets/ManagerViewCallsFacet.sol` lines 358-362

**Description:**
The `_hasAnyDealingBalance` function uses `classNum < nextClassId` to iterate classes, but `nextClassId` is pre-incremented then used during class creation (FundManagementFacet.sol line 285-286), meaning `nextClassId` equals the **last created class ID**. Using strict `<` excludes the last class from the investor count check.

In comparison:
- `getPendingManagementFees` at line 271 correctly uses `classNum <= fund.nextClassId`
- `_collectEligibleClassesForFund` in ViewCalls2Facet at line 75 correctly uses `classNum <= fund.nextClassId`

This is the same error pattern as E-BC04 (dealing ID off-by-one) but applied to classNum.

**Impact:**
`getFundInvestorCount`, `getFundSummary`, and `getManagedFundSummaries` will undercount investors who only hold tokens in the highest-numbered class. This affects dashboard accuracy for manager and admin views.

**Recommendation:**
Change line 358 from:
```solidity
for (uint16 classNum = Constants.FIRST_USER_CLASS_ID; classNum < nextClassId; ++classNum) {
```
to:
```solidity
for (uint16 classNum = Constants.FIRST_USER_CLASS_ID; classNum <= nextClassId; ++classNum) {
```

**Status:** OPEN

---

### V7-M02: `_getOrderBookSize` Counts All Orders, Not Just Pending

**Severity:** MEDIUM
**Category:** Logic Error
**Location:** `src/facets/AdminViewCallsFacet.sol` lines 59, 311-314; `src/facets/ManagerViewCallsFacet.sol` lines 224-226, 376-379

**Description:**
`_getOrderBookSize` returns `tail - 1`, which is the total number of orders ever submitted (including completed, cancelled, settled, and rejected orders). However, it is used in multiple places labeled as "pending orders":
- `AdminViewCallsFacet.getSystemOverview()` line 59: `totalPendingOrders += _getOrderBookSize(fundId)` — field named `totalPendingOrders`
- `AdminViewCallsFacet.getSystemOverviewPaginated()` line 115: same
- `ManagerViewCallsFacet.getPendingOrderCount()` line 224-226: function named `getPendingOrderCount` but returns total count
- `ManagerViewCallsFacet.getFundSummary()` line 38: `pendingOrderCount`

The only accurate pending count is `getPendingOrderCountPaginated()` (ManagerViewCallsFacet lines 236-256) which actually checks each order's status.

**Impact:**
Admin and manager dashboards display inflated "pending order" counts. Over time, as orders are processed, cancelled, and settled, the displayed count will grow monotonically and never decrease, giving operators a false impression of the system's workload.

**Recommendation:**
Either:
1. Rename the field and function to `totalOrderCount` / `getTotalOrderCount` to accurately describe the semantics, OR
2. Implement a proper pending counter maintained during order state transitions (increment on submit, decrement on process/cancel/settle)

**Status:** OPEN

---

### V7-M03: `_hasAnyDealingBalance` Misses Last Dealing (Off-by-One)

**Severity:** MEDIUM
**Category:** Logic Error
**Location:** `src/facets/ManagerViewCallsFacet.sol` line 362

**Description:**
Per E-BC04, `nextDealingId` is pre-incremented then used, so it equals the **last created dealing ID**. The loop `for (uint16 d = 1; d < nextDealingId; d++)` excludes the last dealing. The correct pattern per E-BC04 is `for (d = 1; d <= nextDealingId; d++)`.

**Impact:**
Same as V7-M01: investors holding tokens only in the last dealing of a class will not be counted. Combined with V7-M01, this means investors in the last class AND/OR the last dealing of any class are missed.

**Recommendation:**
Change line 362 from:
```solidity
for (uint16 d = 1; d < nextDealingId; d++) {
```
to:
```solidity
for (uint16 d = 1; d <= nextDealingId; d++) {
```

**Status:** OPEN

---

### V7-L01: `_calculateAvailableBalance` Potential Arithmetic Underflow

**Severity:** LOW
**Category:** Arithmetic
**Location:** `src/facets/ViewCallsFacet.sol` line 1340

**Description:**
The function `_calculateAvailableBalance` (lines 1328-1341) computes `balance - locked` at line 1340 without verifying that `balance >= locked`. While the locking mechanism in FundTokensFacet enforces `currentBalance >= currentLocked + amount` during `lockTokens`, the view function reads raw storage values. In Solidity 0.8.28 this would revert with an arithmetic underflow rather than silently returning a wrong value.

If any storage inconsistency occurs (e.g., from an upgrade or storage collision), the `getPortfolio` call would revert entirely, breaking the portfolio view for that user.

The public `availableBalance` function in FundTokensFacet (line 184) has the same pattern: `balanceOf(account, tokenId) - lockedBalances[account][tokenId]`.

**Impact:**
If `locked > balance` due to any storage inconsistency, the entire `getPortfolio` call reverts. This is a denial-of-service risk for the portfolio view. Since this is a view function, it cannot cause fund loss, but it could prevent users from seeing their portfolio.

**Recommendation:**
Add a safety check:
```solidity
return balance >= locked ? balance - locked : 0;
```

**Status:** OPEN

---

### V7-L02: `getEligibleClasses` Includes Fee Class (classNum=1)

**Severity:** LOW
**Category:** Logic Error
**Location:** `src/facets/ViewCalls2Facet.sol` line 75

**Description:**
`_collectEligibleClassesForFund` iterates from `classNum = 1` (line 75), which includes the fee class (class 1 is reserved for fees per Constants.FIRST_USER_CLASS_ID = 2). The eligibility check via `EligibilityFacet.isEligible` may return true for the fee class if it has no restrictions configured. This means `getEligibleClasses` and `getInvestableFunds` could return the fee class as an investable option.

Other iteration points in the codebase (e.g., `getPendingManagementFees` at ManagerViewCallsFacet line 271, `_hasAnyDealingBalance` at line 358) correctly start from `Constants.FIRST_USER_CLASS_ID` (2).

**Impact:**
The fee class could appear in the list of eligible/investable classes for users. If the frontend uses this list to render investment options, users might see a class they should not interact with. No fund loss since order submission would likely fail for the fee class, but it creates UI confusion.

**Recommendation:**
Change line 75 from:
```solidity
for (uint16 classNum = 1; classNum <= fund.nextClassId; ++classNum) {
```
to:
```solidity
for (uint16 classNum = Constants.FIRST_USER_CLASS_ID; classNum <= fund.nextClassId; ++classNum) {
```

**Status:** OPEN

---

### V7-L03: Unbounded Fee History Iteration in `_sumFees`

**Severity:** LOW
**Category:** Gas / DoS
**Location:** `src/facets/ManagerViewCallsFacet.sol` lines 482-487

**Description:**
The `_sumFees` function iterates over the entire `feeHistory[classId]` array with no pagination. On a private chain with unlimited gas, this is acceptable for moderate-sized histories. However, `feeHistory` is an append-only array that grows with every fee minting event. Over years of operation, this could grow to thousands of entries per class.

This function is called by `getClassPerformance` and `getClassPerformanceInRange`, meaning performance queries for long-running classes could become increasingly expensive.

**Impact:**
On a private chain, this is unlikely to cause OOG. However, it represents increasing gas cost over time. If the chain has any gas limits, long-running classes could eventually make performance queries fail.

**Recommendation:**
Consider either:
1. Maintaining a running total of fees minted (O(1) lookup), or
2. Adding pagination to `_sumFees`, or
3. Documenting this as acceptable for private chain deployment

**Status:** OPEN

---

### V7-L04: `getPortfolioEvents` Reverts on Unmatched Transfers

**Severity:** LOW
**Category:** Robustness
**Location:** `src/facets/ViewCalls2Facet.sol` line 584

**Description:**
The `_constructEventsFromTransfers` function at line 584 reverts with `UnmatchedTransfer(i)` if any transfer cannot be classified as subscribe, redeem, onramp, offramp, or transfer. This means that if a new type of token operation is added to the system (e.g., a fee distribution, a direct admin transfer, or a flash loan), the entire `getPortfolioEvents` call will revert for any user who has participated in that operation.

The matching logic relies on specific patterns (e.g., "cash burn followed by dealing mint in the same block" = subscribe). If the transaction ordering within a block changes or new multi-step operations are introduced, existing patterns may not match.

**Impact:**
Adding new token operation types without updating the event matching logic would break `getPortfolioEvents` for affected users. This is a maintenance burden and a forward-compatibility risk.

**Recommendation:**
Instead of reverting, introduce an `UNKNOWN` event type for unmatched transfers:
```solidity
if (!r.matched) {
    r = EventMatchResult(true, false, uint8(EventType.UNKNOWN), currentTokenId, current.amount, 0);
}
```

**Status:** OPEN

---

### V7-L05: `_buildAccountSummary` Only Returns First Managed Fund

**Severity:** LOW
**Category:** Logic Error
**Location:** `src/facets/AdminViewCallsFacet.sol` lines 321-334

**Description:**
The `_buildAccountSummary` function finds the first fund where the account is a manager and returns that single `managedFundId`. If an account manages multiple funds, only the first one found is returned, and the `isManager` flag is set to true. The `AccountSummary` struct has a single `managedFundId` field, not an array.

**Impact:**
For multi-fund managers, the account summary dashboard will show only one managed fund. This is a data completeness issue. No fund loss, but operational dashboards may miss managed funds.

**Recommendation:**
Either change `managedFundId` to `managedFundIds` (array), or document this limitation clearly. Alternatively, add a `getManagedFundIds(address)` query function.

**Status:** OPEN

---

### V7-I01: No Access Control on View Functions Exposing Sensitive Data

**Severity:** INFORMATIONAL
**Category:** Information Leakage
**Location:** All four facets

**Description:**
All view functions are public and unrestricted. This means any address can query:
- `getSystemOverview`: total AUM, fund count, account count, admin count
- `getRoleAssignments`: list of all admin addresses, NAV updater addresses, managers
- `getAccountSummary`: account owner, name, type, role information
- `getAllAccounts`: complete list of all account addresses
- `getPortfolio(account)`: any user's complete portfolio (holdings, values, balances)
- `getOrders(account, ...)`: any user's order history

On a private chain, this may be acceptable if the chain itself restricts access. On a public chain or if the RPC is exposed, this would leak sensitive financial and identity data.

**Impact:**
On a permissioned private chain, this is acceptable. If the RPC endpoint is ever exposed publicly, all portfolio data, AUM figures, role assignments, and account information become publicly queryable.

**Recommendation:**
Document this as a deployment constraint: the RPC endpoint must be access-controlled. If public chain deployment is ever considered, add `onlyAdmin` or similar modifiers to sensitive view functions.

**Status:** OPEN

---

### V7-I02: `getAllDealingProcessStates` Gas Consumption Scales with Fund Count

**Severity:** INFORMATIONAL
**Category:** Gas
**Location:** `src/facets/ViewCallsFacet.sol` lines 137-199

**Description:**
`getAllDealingProcessStates` iterates all umbrellas and all funds with no pagination. For each fund, it calls `NavManagementFacet.dealingProcessState()` via external call (`address(this)`). This creates N external calls where N is the total fund count across all umbrellas.

Unlike the paginated views, this function has no offset/limit parameters.

**Impact:**
On a private chain, this is acceptable for reasonable fund counts. However, as the system scales to hundreds or thousands of funds, this view could become expensive. Since it's a view function, it doesn't consume gas when called via `eth_call`, but it does consume computation time.

**Recommendation:**
Consider adding pagination parameters or a fund range filter, consistent with other paginated views in the system.

**Status:** OPEN

---

### V7-I03: Portfolio Event Matching Assumes Strict Transfer Ordering

**Severity:** INFORMATIONAL
**Category:** Fragile Logic
**Location:** `src/facets/ViewCalls2Facet.sol` lines 501-564

**Description:**
The portfolio event matching logic (`_matchSubscribe`, `_matchRedeem`, `_matchOnramp`, `_matchOfframp`) depends on specific transfer ordering within a block:
- Subscribe: cash burn at index `i`, dealing mint at index `i+1`, same block
- Redeem: dealing burn at index `i`, cash mint at index `i+1`, same block

If the settlement code ever changes to emit transfers in a different order, or if batch operations emit interleaved transfers, the matching will fail with `UnmatchedTransfer`.

**Impact:**
Tight coupling between event reconstruction logic and settlement implementation. Any changes to settlement transfer ordering require corresponding updates to the event matching logic.

**Recommendation:**
Consider using explicit event emission during settlement (e.g., `SubscriptionSettled`, `RedemptionSettled` events) rather than reconstructing events from transfer patterns. This would decouple the view from the settlement implementation.

**Status:** OPEN

---

### V7-I04: `_collectUserTransferIndices` Memory Overhead for Large Portfolios

**Severity:** INFORMATIONAL
**Category:** Gas
**Location:** `src/facets/ViewCallsFacet.sol` lines 756-836

**Description:**
The k-way merge in `_collectUserTransferIndices` allocates arrays proportional to the total number of transfers across all tokens the user has ever interacted with. For an active user with many token interactions over time, this could be substantial. The function allocates:
1. `allHoldings` array (numTokens)
2. `lengths` array (numTokens)
3. `indices` array (maxSize = sum of all transfer indices)
4. `pointers` array (numTokens)

Additionally, `_findMinCandidateIndex` is called once per transfer index, with O(numTokens) work each time, giving O(totalTransfers * numTokens) total work.

**Impact:**
For users with hundreds of tokens and thousands of transfers, this could become slow. Private chain deployment mitigates gas concerns, but the computation time could still impact RPC response times.

**Recommendation:**
Consider adding a pagination layer to `getTransfers` that limits the number of tokens merged, or use a single sorted global index per user.

**Status:** OPEN

---

## Summary

| Severity | Count | IDs |
|----------|-------|-----|
| MEDIUM | 3 | V7-M01, V7-M02, V7-M03 |
| LOW | 5 | V7-L01, V7-L02, V7-L03, V7-L04, V7-L05 |
| INFORMATIONAL | 4 | V7-I01, V7-I02, V7-I03, V7-I04 |
| **Total** | **12** | |

## Prior Findings Status

| ID | Status | Evidence |
|----|--------|----------|
| H-07 | FIXED | O(1) order book size + pagination throughout |
| H-16 | FIXED | Offset applied once in `_getOrdersForAllUsers`, then 0 passed to filter |
| V3-H04 | FIXED | `_countFundInvestors` rewritten with proper bounds |
| V3-H05 | PARTIALLY FIXED | `getPendingOrderCountPaginated` is accurate; `getPendingOrderCount` and `getSystemOverview.totalPendingOrders` still return total count, not pending |

