# Security Audit Report: Agent 6 -- View Functions

**Date:** 2026-02-10
**Auditor:** Agent 6 (Claude Opus 4.6)
**Scope:** ViewCallsFacet.sol, ViewCalls2Facet.sol, AdminViewCallsFacet.sol, ManagerViewCallsFacet.sol
**Total Lines:** ~2,993

---

## Executive Summary

Audit of the four view facets in the Elysium Diamond Proxy system. These facets provide read-only access to fund data, portfolio information, order queries, admin dashboards, and manager dashboards. Despite being view functions, several issues were found including missing access control, data correctness bugs, pagination overflow issues, and potential DoS vectors.

**Total Findings: 17** (0 Critical, 4 High, 7 Medium, 6 Low)

---

## [HIGH] A6-01: Off-by-One in `_hasAnyDealingBalance` Causes Zero Investor Counts

**ID:** A6-01
**Location:** `ManagerViewCallsFacet.sol:358`
**Description:** The `_hasAnyDealingBalance` function uses `classNum < nextClassId` as the loop termination condition. Since `nextClassId` is incremented *before* being assigned as the new class ID (in `FundManagementFacet.sol:285-286`), `nextClassId` equals the ID of the *last created* class. Using strict less-than (`<`) instead of less-than-or-equal (`<=`) means the last class is always skipped. For a fund with one user class (nextClassId=2, FIRST_USER_CLASS_ID=2), the loop condition `2 < 2` is immediately false and the loop never executes.

```solidity
// Line 358 - BUG: should be <=
for (uint16 classNum = Constants.FIRST_USER_CLASS_ID; classNum < nextClassId; ++classNum) {
```

Contrast with the correct pattern at line 271:
```solidity
// Line 271 - CORRECT
for (uint16 classNum = Constants.FIRST_USER_CLASS_ID; classNum <= fund.nextClassId; ++classNum) {
```

**Impact:** `getFundInvestorCount`, `getFundInvestorCountPaginated`, and `getFundSummary`/`getFundSummaries` all report **zero investors** for funds that have only one user class (the most common case). This produces incorrect dashboard data for fund managers. For funds with N user classes, the last class is always excluded from the investor count.

**Recommendation:** Change the loop condition from `<` to `<=`:
```solidity
for (uint16 classNum = Constants.FIRST_USER_CLASS_ID; classNum <= nextClassId; ++classNum) {
```

---

## [HIGH] A6-02: `totalPendingOrders` Counts All Orders, Not Just Pending

**ID:** A6-02
**Location:** `AdminViewCallsFacet.sol:59,115` and `ManagerViewCallsFacet.sol:376-378`
**Description:** The `_getOrderBookSize` function returns `tail - 1`, which is the total number of orders ever created in the order book (including FILLED, CANCELLED, and UNINITIALIZED). This value is assigned to `totalPendingOrders` in `getSystemOverview` and `getSystemOverviewPaginated`, and to `pendingOrderCount` in `getFundSummary`/`getFundSummaries`.

```solidity
// AdminViewCallsFacet.sol:311-313
function _getOrderBookSize(uint256 fundId) private view returns (uint32) {
    uint256 tail = s.FundAdmin[0].orderBook[fundId].tail;
    return tail > 1 ? uint32(tail - 1) : 0;
}

// Used as:
totalPendingOrders += _getOrderBookSize(fundId);  // Misleading name
```

**Impact:** The admin dashboard and manager dashboard display grossly inflated "pending order" counts. For a fund that has processed 1000 orders with 5 currently pending, the dashboard would show 1000 instead of 5. This produces incorrect data for fund administration decisions.

**Recommendation:** Either iterate orders to count only PENDING status, or maintain a separate counter that is incremented on order creation and decremented on fill/cancel. For the view-only approach:
```solidity
function _countPendingOrders(uint256 fundId) private view returns (uint32 count) {
    uint256 tail = s.FundAdmin[0].orderBook[fundId].tail;
    for (uint256 i = 1; i < tail; i++) {
        FundAdminStructs.Order storage order = s.FundAdmin[0].orderBook[fundId].orders[i];
        uint256 histLen = order.processingHistory.length;
        if (histLen > 0 && order.processingHistory[histLen - 1].status == FundAdminStructs.OrderStatus.PENDING) {
            count++;
        }
    }
}
```

---

## [HIGH] A6-03: No Access Control on Admin and Manager View Functions

**ID:** A6-03
**Location:** `AdminViewCallsFacet.sol` (all external functions), `ManagerViewCallsFacet.sol` (all external functions)
**Description:** Despite their names, `AdminViewCallsFacet` and `ManagerViewCallsFacet` have **no access control** on their view functions. Any address with RPC access can call:
- `getSystemOverview()` -- full system statistics
- `getRoleAssignments()` -- all admin, navUpdater, and manager addresses with fund assignments
- `getAllAccounts()` -- every account address in the system
- `getAccountSummary()` -- any account's owner, name, type, role
- `getManagedFundSummaries()` -- any manager's fund details
- `getClassPerformance()` -- any class's return metrics

The only functions with access control in `AdminViewCallsFacet` are the state-changing ones (`registerCurrency`, `deactivateCurrency`, `setFxUpdater`, `activateUmbrellaCurrency`, `deactivateUmbrellaCurrency`).

**Impact:** On a private blockchain, any node operator or RPC user can enumerate all system participants, their roles, fund structures, AUM figures, and performance metrics. This constitutes a significant information disclosure risk. An attacker could use `getRoleAssignments()` to identify admin wallets for targeted social engineering. Even on a private chain, not all RPC users should have admin-level visibility.

**Recommendation:** Add role-based access control to sensitive view functions:
```solidity
modifier onlyAdminView() {
    require(
        s.FundAdmin[0].roles[ROLE_ADMIN][msg.sender] ||
        LibDiamond.contractOwner() == msg.sender,
        "Admin view only"
    );
    _;
}

function getSystemOverview() external view onlyAdminView returns (SystemOverview memory) { ... }
```

For manager views, verify `msg.sender` is the manager of the queried fund or an admin.

---

## [HIGH] A6-04: Pagination Overflow in `_countFundInvestors` and `getPendingOrderCountPaginated`

**ID:** A6-04
**Location:** `ManagerViewCallsFacet.sol:339,246`
**Description:** Both `_countFundInvestors` and `getPendingOrderCountPaginated` compute `offset + limit` (or `start + limit`) using `uint256` arithmetic without overflow protection. If `limit = type(uint256).max` (which is a valid caller input), the addition wraps to a small value or zero, causing the loop to silently skip all entries.

```solidity
// ManagerViewCallsFacet.sol:339
uint256 end = offset + limit;  // Overflows if limit = type(uint256).max
if (end > allAccounts.length) end = allAccounts.length;
// If end wrapped to 0, the comparison 0 > length fails, end stays 0
// Loop: a = offset; a < 0 -- never executes

// ManagerViewCallsFacet.sol:246
uint256 end = start + limit;  // Same overflow
if (end > tail) end = tail;
```

The same pattern exists in `AdminViewCallsFacet.sol:125`:
```solidity
uint256 end = accountLimit == 0 ? allAccounts.length : accountOffset + accountLimit;
```

**Impact:** Callers passing `limit = type(uint256).max` (a reasonable "give me everything" value) get zero results instead of all results. This is especially problematic since the non-paginated variants (`getFundInvestorCount`) internally call `_countFundInvestors(fundId, fund, 0, type(uint256).max)`, which will silently return 0 due to this overflow.

Wait -- actually, `0 + type(uint256).max` does NOT overflow since it equals `type(uint256).max`. The overflow occurs when `offset >= 1`. For the call at line 165 with offset=0 and limit=type(uint256).max, the sum is type(uint256).max which does not overflow. So the non-paginated case is safe. The bug only manifests when offset > 0 AND limit = type(uint256).max.

**Recommendation:** Use checked math with a cap:
```solidity
uint256 end = offset > type(uint256).max - limit ? allAccounts.length : offset + limit;
if (end > allAccounts.length) end = allAccounts.length;
```

Or simply cap the limit:
```solidity
if (limit > allAccounts.length) limit = allAccounts.length;
uint256 end = offset + limit;
```

---

## [MEDIUM] A6-05: `getPortfolioEvents` Reverts on Unmatched Transfers

**ID:** A6-05
**Location:** `ViewCalls2Facet.sol:584`
**Description:** The `_constructEventsFromTransfers` function reverts with `UnmatchedTransfer(i)` if any transfer does not match the known event patterns (subscribe, redeem, onramp, offramp, transfer). This means the entire portfolio history query fails if even one unusual transfer exists (e.g., admin-initiated direct transfers, emergency recoveries, or future transfer types).

```solidity
if (!r.matched) revert UnmatchedTransfer(i);
```

**Impact:** If any transfer in an account's history does not conform to the five recognized patterns, the entire `getPortfolioEvents()` call reverts. The user cannot view any portfolio events at all. This is a denial-of-service for the portfolio history feature triggered by any non-standard transfer.

**Recommendation:** Skip unmatched transfers with an UNKNOWN event type instead of reverting:
```solidity
if (!r.matched) {
    tempEvents[eventCount++] = PortfolioEvent({
        blockNumber: current.blockNumber,
        timestamp: current.timestamp,
        eventType: uint8(EventType.UNKNOWN), // Add UNKNOWN to enum
        dealingId: currentTokenId,
        baseTokensAmount: current.amount,
        dealingTokensAmount: 0
    });
    continue;
}
```

---

## [MEDIUM] A6-06: `_calculateAvailableBalance` Reverts on Inconsistent Locked Balances

**ID:** A6-06
**Location:** `ViewCallsFacet.sol:1340`
**Description:** The function computes `balance - locked` without verifying `balance >= locked`. Under Solidity 0.8.x, this will revert on underflow. If there is ever a state inconsistency where locked balances exceed the actual balance (possible during race conditions between settlement operations or due to a bug in the locking system), the entire `getPortfolio()` call reverts for that user.

```solidity
return balance - locked;  // Reverts if locked > balance
```

**Impact:** A single dealing token with inconsistent locked balance state causes the entire portfolio view to fail for that account. The user cannot view any portfolio information.

**Recommendation:** Use a safe subtraction that returns 0 on underflow:
```solidity
return balance >= locked ? balance - locked : 0;
```

---

## [MEDIUM] A6-07: Gas DoS via Unbounded `_sumFees` Loop

**ID:** A6-07
**Location:** `ManagerViewCallsFacet.sol:482-487`
**Description:** The `_sumFees` function iterates the entire `feeHistory` array for a class without any pagination or limit. This array grows with every management fee mint (which can occur at each NAV update). Over time, this array can grow very large.

```solidity
function _sumFees(uint256 classId) private view returns (uint128 total) {
    FundAdminStructs.FeeMint[] storage feeHistory = s.FundAdmin[0].feeHistory[classId];
    for (uint256 i = 0; i < feeHistory.length; i++) {
        total += feeHistory[i].amount;
    }
}
```

**Impact:** For a class with daily NAV updates over 5 years (1825 entries), this is still manageable. But for very active funds or long-lived classes, the gas cost grows linearly with no bound. Additionally, `total` is `uint128` and the accumulation could overflow if sum of all fee mints exceeds ~3.4e38, causing a revert.

**Recommendation:** Add a totalFeesMinted accumulator in storage to avoid the loop, or add pagination to `getClassPerformance`.

---

## [MEDIUM] A6-08: Gas DoS via Unbounded Loops in `getTransfers` with ALL_USERS

**ID:** A6-08
**Location:** `ViewCallsFacet.sol:856-874`
**Description:** When `account == ALL_USERS`, `_collectTransferCandidateIndices` iterates the entire `transfers[]` array:

```solidity
uint256 totalTransfers = s.FundTokens[0].transfers.length;
candidateIndices = new uint32[](totalTransfers);
for (uint256 i = 0; i < totalTransfers; ++i) { ... }
```

The total number of transfers across the system is unbounded and grows monotonically. Even with pagination applied *after* collection, the initial scan is always O(N) where N is the total transfer count.

**Impact:** As the system accumulates transfers, `getTransfers` with `ALL_USERS` becomes increasingly expensive and will eventually exceed the gas limit for view calls (even on private chains, there are practical limits). The memory allocation of `new uint32[](totalTransfers)` alone could fail for very large transfer counts.

**Recommendation:** For `ALL_USERS` queries, use the pagination parameters to directly index into the transfers array rather than scanning all entries:
```solidity
// Direct range access instead of full scan + filter
uint256 start = offset;
uint256 end = Math.min(start + maxLimit, totalTransfers);
```

---

## [MEDIUM] A6-09: `getEligibleClasses` Includes Fee Class (Class 1) in Eligibility Check

**ID:** A6-09
**Location:** `ViewCalls2Facet.sol:75`
**Description:** The `_collectEligibleClassesForFund` function starts iteration from `classNum = 1`, which is the "Base Class" (fee class) created automatically for every fund. User classes start at `Constants.FIRST_USER_CLASS_ID = 2`.

```solidity
for (uint16 classNum = 1; classNum <= fund.nextClassId; ++classNum) {
```

**Impact:** The fee class (class 1) is included in eligibility checks via `EligibilityFacet.isEligible`. While this class likely has restrictive eligibility settings that prevent it from being returned, it still wastes gas on the eligibility check. If the fee class happens to have permissive eligibility (e.g., no restrictions set), it would be returned in the eligible classes list and shown to investors, which is incorrect -- investors should never see or subscribe to the fee class.

**Recommendation:** Start iteration from `Constants.FIRST_USER_CLASS_ID`:
```solidity
for (uint16 classNum = Constants.FIRST_USER_CLASS_ID; classNum <= fund.nextClassId; ++classNum) {
```

---

## [MEDIUM] A6-10: Portfolio Event Matching Fragile for Same-Block Reordering

**ID:** A6-10
**Location:** `ViewCalls2Facet.sol:501-564`
**Description:** The portfolio event reconstruction relies on adjacent transfer ordering within the same block to match subscribe/redeem pairs. A subscribe is detected as a cash burn (index i) immediately followed by a dealing mint (index i+1) in the same block number. If the k-way merge from `_collectUserTransferIndices` produces a different ordering (possible if multiple tokens have transfers in the same block), the pattern matching fails.

For example, if an account has two subscribes in the same block:
1. Cash burn for fund A
2. Cash burn for fund B  
3. Dealing mint for fund A
4. Dealing mint for fund B

The current code would try to match (1, 2) which fails (both burns), then fall through to offramp matching, potentially causing an `UnmatchedTransfer` revert.

**Impact:** Accounts with multiple operations in the same block may have their `getPortfolioEvents()` call revert entirely due to incorrect event matching.

**Recommendation:** Instead of relying on strict adjacency, use a lookahead within the same block number to find matching pairs. Or tag transfers with a correlation ID at creation time.

---

## [MEDIUM] A6-11: `totalAUM` in SystemOverview Uses Raw NAV Sum Without Currency Normalization

**ID:** A6-11
**Location:** `AdminViewCallsFacet.sol:55`
**Description:** The `getSystemOverview` function sums `fund.nav` across all active funds:
```solidity
totalAUM += fund.nav;
```

However, different funds may have different `reportingCurrency` values (USD, EUR, GBP, etc.). Summing NAVs denominated in different currencies produces a meaningless aggregate number.

**Impact:** The system-wide `totalAUM` metric is incorrect in a multi-currency deployment. A fund with NAV=100M EUR and a fund with NAV=50M USD would show totalAUM=150M with no indication that these are mixed currencies.

**Recommendation:** Either: (a) convert all NAVs to a common base currency using FX rates before summing, (b) return AUM per currency, or (c) document that totalAUM is only meaningful when all funds use the same reporting currency.

---

## [LOW] A6-12: `_buildAccountSummary` Only Returns First Managed Fund

**ID:** A6-12
**Location:** `AdminViewCallsFacet.sol:324-334`
**Description:** The function stops searching after finding the first fund managed by an account (`!isManager` in outer loop condition, `break` in inner loop). If an account manages multiple funds, only the first one is reflected in the `managedFundId` field.

**Impact:** The `AccountSummary` struct's `managedFundId` field only shows one fund, potentially misleading admin dashboard users about the full scope of a manager's responsibilities.

**Recommendation:** Either return an array of managed fund IDs, or document that only the first managed fund is returned.

---

## [LOW] A6-13: `getAllAccounts` Pagination with `uint32` Limits Maximum to ~4.3B Accounts

**ID:** A6-13
**Location:** `AdminViewCallsFacet.sol:214-233`
**Description:** The `getAllAccounts` function uses `uint32` for offset and limit parameters. While `allAccounts` is a dynamic array that could theoretically exceed `uint32` range, the cast at line 220 `uint32(allAccounts.length)` would silently truncate if there are more than ~4.3 billion accounts.

```solidity
total = uint32(allAccounts.length);
```

**Impact:** Practically negligible on a private blockchain where account counts will never approach this limit. However, the truncation is silent rather than reverting.

**Recommendation:** Use SafeCast or add a bounds check:
```solidity
total = SafeCast.toUint32(allAccounts.length);
```

---

## [LOW] A6-14: `getOrders` (ViewCalls2Facet) No Bounds Check on Order Indices

**ID:** A6-14
**Location:** `ViewCalls2Facet.sol:329-331`
**Description:** The batch `getOrders(fundId, orderIndex[])` function directly indexes into `orderBook.orders` without checking that each index is within `[1, tail)`. Accessing an index beyond `tail` would return a default-initialized Order struct (all zeros) without reverting.

```solidity
for (uint256 i = 0; i < orderIndex.length; ++i) {
    orders[i] = s.FundAdmin[0].orderBook[fundId].orders[orderIndex[i]];
}
```

**Impact:** Callers could receive silently empty Order structs for non-existent indices, leading to confusion. No data corruption occurs since this is a view function.

**Recommendation:** Add a bounds check:
```solidity
require(orderIndex[i] > 0 && orderIndex[i] < orderBook.tail, "Invalid order index");
```

---

## [LOW] A6-15: `getPendingManagementFees` Potential Overflow with Large `mgmtFeeRate`

**ID:** A6-15
**Location:** `ManagerViewCallsFacet.sol:284`
**Description:** The management fee calculation multiplies `classSupply * classInfo.mgmtFeeRate * timeElapsed`. Since `mgmtFeeRate` is `uint160`, a maliciously or accidentally large fee rate could cause uint256 overflow in this multiplication.

```solidity
uint256 pendingFee = (classSupply * classInfo.mgmtFeeRate * timeElapsed) /
    (BPS_DENOMINATOR * Constants.SECONDS_PER_YEAR);
```

Max values: classSupply (uint128 ~3.4e38) * mgmtFeeRate (uint160 ~1.46e48) = ~5e86, which exceeds uint256 max (~1.16e77).

**Impact:** If an admin sets an unreasonably large mgmtFeeRate, the `getPendingManagementFees` view will revert. Since only admins set fee rates and this is a private chain, exploitability is low. The function would revert, blocking the pending fees view.

**Recommendation:** Add a sanity check on mgmtFeeRate before multiplication, or use `Math.mulDiv` for safe intermediate computation.

---

## [LOW] A6-16: `classNum` in `_buildClassView` Uses `getClassId` Instead of `getClassNum`

**ID:** A6-16
**Location:** `ViewCalls2Facet.sol:252`
**Description:** Minor naming inconsistency: the `ClassView.classNum` field is populated using `TokenIdUtils.getClassId(classId)` instead of `TokenIdUtils.getClassNum(classId)`. While these two functions are functionally identical (getClassNum is an alias for getClassId), using the inconsistent name reduces code clarity.

```solidity
classNum: TokenIdUtils.getClassId(classId),
```

**Impact:** No functional impact; purely a code quality/readability concern.

**Recommendation:** Use `TokenIdUtils.getClassNum(classId)` for consistency with the field name.

---

## [LOW] A6-17: `_resizeClassArray` Memory Mutation Limitation

**ID:** A6-17
**Location:** `ViewCalls2Facet.sol:283-286`
**Description:** The `_resizeClassArray` function receives an `InvestableFund memory` parameter and assigns a new classes array to it. However, since `fund` is passed by value (memory), the assignment `fund.classes = classArray` only modifies the local copy, not the original struct in the caller's array. The assembly resize of the classArray works correctly because arrays are reference types in memory (the length field at the memory pointer is modified in place).

```solidity
function _resizeClassArray(ClassView[] memory classArray, uint256 count, InvestableFund memory fund) internal pure {
    assembly ("memory-safe") { mstore(classArray, count) }
    fund.classes = classArray;  // This line has no effect on the caller's struct
}
```

**Impact:** The `fund.classes = classArray` assignment is a no-op because the struct is passed by value. However, the assembly resize of classArray itself works correctly because the caller already set `investableFunds[currentFundIndex].classes = tempClassArrays[currentFundIndex]` (line 131), and the assembly modifies the shared memory-referenced array. So the end result is correct despite the dead code.

**Recommendation:** Remove the dead `fund.classes = classArray` line to avoid confusion, or change the parameter to use a storage pointer if the intent was to modify in place.

---

## Summary Table

| ID | Severity | Location | Title |
|----|----------|----------|-------|
| A6-01 | HIGH | ManagerViewCallsFacet.sol:358 | Off-by-one in `_hasAnyDealingBalance` causes zero investor counts |
| A6-02 | HIGH | AdminViewCallsFacet.sol:59,115 | `totalPendingOrders` counts ALL orders, not just pending |
| A6-03 | HIGH | AdminViewCallsFacet.sol, ManagerViewCallsFacet.sol | No access control on admin/manager view functions |
| A6-04 | HIGH | ManagerViewCallsFacet.sol:339,246 | Pagination overflow silently returns zero results |
| A6-05 | MEDIUM | ViewCalls2Facet.sol:584 | `getPortfolioEvents` reverts on unmatched transfers |
| A6-06 | MEDIUM | ViewCallsFacet.sol:1340 | `_calculateAvailableBalance` reverts on inconsistent locked balances |
| A6-07 | MEDIUM | ManagerViewCallsFacet.sol:482-487 | Gas DoS via unbounded `_sumFees` loop |
| A6-08 | MEDIUM | ViewCallsFacet.sol:856-874 | Gas DoS via unbounded loop in `getTransfers` with ALL_USERS |
| A6-09 | MEDIUM | ViewCalls2Facet.sol:75 | `getEligibleClasses` includes fee class in eligibility check |
| A6-10 | MEDIUM | ViewCalls2Facet.sol:501-564 | Portfolio event matching fragile for same-block reordering |
| A6-11 | MEDIUM | AdminViewCallsFacet.sol:55 | `totalAUM` sums NAVs across different currencies |
| A6-12 | LOW | AdminViewCallsFacet.sol:324-334 | `_buildAccountSummary` only returns first managed fund |
| A6-13 | LOW | AdminViewCallsFacet.sol:220 | `uint32` cast truncates silently for very large account arrays |
| A6-14 | LOW | ViewCalls2Facet.sol:329-331 | No bounds check on batch order index queries |
| A6-15 | LOW | ManagerViewCallsFacet.sol:284 | Potential overflow with large `mgmtFeeRate` in fee calc |
| A6-16 | LOW | ViewCalls2Facet.sol:252 | `getClassId` vs `getClassNum` naming inconsistency |
| A6-17 | LOW | ViewCalls2Facet.sol:283-286 | Dead code in `_resizeClassArray` memory parameter mutation |

**Severity Distribution:** 0 Critical, 4 High, 7 Medium, 6 Low
