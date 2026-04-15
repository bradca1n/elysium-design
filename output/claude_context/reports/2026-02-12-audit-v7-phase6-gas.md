# V7 Audit — Phase 6: Gas Optimization

**Date:** 2026-02-12
**Baseline:** 1404/1404 tests passing

---

## Gas Findings

### G-01: Unbounded Loop in _processOrdersImpl — O(n) External Calls Per Order

**Location:** `OrderManagementFacet.sol:238-381`
**Current Cost:** ~250k-500k gas per order (varies with cross-facet calls)

Two passes over the orders array: Step 1 (validation) calls `calculateFundPrice`, `calculateClassPrice`, `calculateDealingPrice`, `validateOrderLifecycle`, `isEligible` per order. Step 2 (execution) calls `unlockTokens`/`burn`/`mint`/`createDealing` per order.

**Recommendation:** Add `MAX_ORDERS_PER_BATCH` constant (e.g., 200). Cache `fundPrice` and `classPrice` outside the loop since they don't change within a batch for the same fund.

---

### G-02: Redundant SLOADs in Fee Minting Loop

**Location:** `FeeManagementFacet.sol:160-204`
**Issue:** `mintAllPendingManagementFees` loops over classes and reads `s.FundAdmin[0].funds[fundId]` and `s.FundAdmin[0].baseInfo[fundId]` on each iteration. These don't change within the loop.

**Recommendation:** Cache fund-level data before the loop:
```solidity
uint128 fundNav = s.FundAdmin[0].funds[fundId].nav;
uint128 fundTotalSupply = s.FundAdmin[0].baseInfo[fundId].totalSupply;
```

---

### G-03: Cross-Facet Delegatecall Overhead for View Data

**Location:** Multiple facets calling `FXManagementFacet(address(this)).getFXRate()`
**Issue:** Each cross-facet view call via `address(this).delegatecall` costs ~2600 gas (CALL opcode) even though it reads the same storage space. The data is in `s.FundAdmin[0].fxRegistry` which is directly accessible.

**Recommendation:** For pure storage reads, use internal library functions instead of cross-facet calls. Create `LibFXRate.getFXRate()` that reads storage directly.

---

### G-04: Array Memory Allocation in ViewCalls

**Location:** `ViewCallsFacet.sol` (13 assembly resize blocks)
**Issue:** View functions allocate maximum-size memory arrays then use assembly to resize. While gas doesn't matter for view calls (no transaction), this pattern increases deployment size due to the assembly blocks.

**Recommendation:** Low priority — view functions don't consume user gas. Assembly resize is the standard optimization.

---

### G-05: _hasUmbrellaBalance Iterates All Holdings

**Location:** `OrderManagementFacet.sol:724-735`
**Issue:** Called during order processing for every REDEEM order. Iterates ALL user holdings and makes `balanceOf` call for each matching umbrella token. Users with many positions create gas spikes.

**Recommendation:** Maintain a `umbrellaBalanceCount` mapping (increment on mint, decrement on burn to zero) to avoid iteration.

---

### G-06: Transfer History Append on Every Transfer

**Location:** `FundTokensFacet.sol:584-641`
**Issue:** Every token transfer appends to `s.FundTokens[0].transfers` array (SSTORE) and two index arrays (`senderTransferIndices`, `recipientTransferIndices`). Cost: ~40k gas per transfer (3x SSTORE for new array slots).

**Recommendation:** Consider making transfer history optional via a configuration flag, or using events-only tracking for non-critical transfers.

---

### G-07: Duplicate Price Calculations Across Steps

**Location:** `OrderManagementFacet.sol` Steps 1 and 2
**Issue:** `_calculateOrderPrices` is called in Step 1 (validation) and then Step 2 re-reads prices for execution. Fund price and class price don't change between steps within the same batch.

**Recommendation:** Store Step 1 price results and reuse in Step 2. The `OrderValidationResult` struct already exists but prices are not cached there.

---

### G-08: Multiple SafeCast Calls for Same Value

**Location:** `FundManagementFacet.sol:125-126`, `FeeManagementFacet.sol:203`
**Issue:** `SafeCast.toUint128(Constants.PRECISION)` is called at class/dealing creation. Since `PRECISION = 1e18` is a constant that always fits in uint128, the SafeCast check is unnecessary overhead.

**Recommendation:** Use a pre-cast constant: `uint128 constant PRECISION_U128 = uint128(PRECISION)`.

---

## Summary

| ID | Location | Savings Estimate | Priority |
|----|----------|-----------------|----------|
| G-01 | processOrders | ~20-30% per batch | HIGH |
| G-02 | Fee minting | ~5k gas per class | MEDIUM |
| G-03 | Cross-facet views | ~2.6k per call | MEDIUM |
| G-04 | ViewCalls assembly | Deploy size only | LOW |
| G-05 | Holdings iteration | Varies (O(n)) | HIGH |
| G-06 | Transfer history | ~40k per transfer | MEDIUM |
| G-07 | Duplicate prices | ~50k per batch | HIGH |
| G-08 | SafeCast constants | ~200 gas each | LOW |

**Total Findings:** 8 gas optimizations
