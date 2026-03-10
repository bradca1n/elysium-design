# Security Audit V6 — Phase 1: Automated Analysis

**Date:** 2026-02-10
**Branch:** multiCurrency
**Baseline:** 1,404 tests, 0 failures

---

## Project Overview (Slither)

| Metric | Count |
|--------|-------|
| Total contracts | 59 |
| Concrete contracts | 22 |
| Abstract contracts | 4 |
| Interfaces | 24 |
| Libraries | 9 |
| Total declared functions | 976 |
| Inherited functions | 233 |
| External functions | 600 |
| Public functions | 35 |
| Internal functions | 329 |
| Private functions | 12 |

**Complexity distribution:**
- Small (< 20 lines): 676 functions
- Medium (20-50 lines): 197 functions
- Large (50-100 lines): 78 functions
- Very large (> 100 lines): 25 functions

---

## Slither Detector Results

### Summary

| Impact | Count | Real Issues |
|--------|-------|-------------|
| High | 5 | 0 (all false positive — Diamond proxy AppStorageRoot.s "uninitialized") |
| Medium | 48 | ~30 (excluding strict-equality design patterns) |
| Low | 94 | TBD (calls-loop: 56, timestamp: 21, others) |
| Informational | 217 | TBD (unused-state: 130, assembly: 40, naming: 20) |

### HIGH Findings (5 — All False Positive)

**SL-H-01 to SL-H-05: `AppStorageRoot.s` never initialized**
- Location: `src/shared/AppStorageRoot.sol:16`
- Used by all facets via inheritance
- **FALSE POSITIVE:** This is standard Diamond proxy pattern. `s` is at storage slot 0, shared across all facets via delegatecall. It's initialized by `InitDiamond` during diamond deployment, not in the contract constructor.

### MEDIUM Findings (48)

#### Reentrancy (15 instances) — REQUIRES MANUAL REVIEW

| # | Location | Description |
|---|----------|-------------|
| SL-M-01 | AccountFacet._executeProposal:996-1029 | delegatecall to execute proposals, state updated after |
| SL-M-02 | OrderManagementFacet._executeSwapOrder:1250-1283 | Two _submitOrder calls for REDEEM+SUBSCRIBE |
| SL-M-03 | SettlementFacet._settleSubscribe:151-171 | FundTokensFacet.mint after state reads |
| SL-M-04 | SettlementFacet._settleRedeem:174-203 | FundTokensFacet.unlockTokens + burn |
| SL-M-05 | SettlementFacet.executeConfirmCashFundSettlement:58-109 | Multiple external calls to settle |
| SL-M-06 | FeeManagementFacet._processPerformanceFeeBatch:362-414 | FundTokensFacet.mint for fee tokens |
| SL-M-07 | FeeManagementFacet.mintAllPendingManagementFees:156-195 | FundTokensFacet.mint for mgmt fees |
| SL-M-08 | NavManagementFacet._updateNavInternal:222-239 | Calls mintAllPendingManagementFees |
| SL-M-09 | OrderManagementFacet._executeOrderTransfer:1151-1196 | FundTokensFacet operations (2 instances) |
| SL-M-10 | OrderManagementFacet._submitOrder:1023-1093 | FundTokensFacet.lockTokens after state |
| SL-M-11 | OrderManagementFacet.executeCancelOrder:140-192 | FundTokensFacet.unlockTokens |
| SL-M-12 | OrderManagementFacet._processOrdersImpl:238-368 | Multiple delegatecalls (2 instances) |
| SL-M-13 | FundLifecycleFacet._forceSubmitRedemptionOrderInternal:516-563 | FundTokensFacet.lockTokens |

**Note:** These are cross-facet delegatecalls within the same Diamond proxy, not external contract calls. Risk depends on whether `s.reentrancyLock` is properly used and whether ERC1155 callbacks could trigger reentry.

#### Dangerous Strict Equality (10 instances) — Mostly Design Patterns

| # | Location | Check |
|---|----------|-------|
| SL-M-14 | BaseFacet._requireFundExists:82-84 | `createdAt == 0` (existence check — by design) |
| SL-M-15 | BaseFacet._requireClassExists:87-89 | `createdAt == 0` (existence check — by design) |
| SL-M-16 | OrderManagementFacet._resolveCashFundToken:1285-1289 | `currency == 0` (default check) |
| SL-M-17 | OrderManagementFacet._resolveCashFundTokenForClass:1292-1302 | `currency == 0` (2x) |
| SL-M-18 | OrderManagementFacet.getMinimumSubscriptionStatus:599-630 | `umbrellaId == 0` |
| SL-M-19 | OrderManagementFacet._processOrdersImpl:238-368 | `dealingId == 0`, `baseInfo.totalSupply` checks |
| SL-M-20 | FundManagementFacet.createDealing:371-392 | `unlockTs == 0` |

#### Multiply After Divide (2 instances) — Precision Loss Risk

| # | Location | Description |
|---|----------|-------------|
| SL-M-21 | FeeManagementFacet.calculateAdjustedFeeRate:424-474 | Multiplication on result of division (precision loss) |
| SL-M-22 | FeeManagementFacet.calculateAdjustedFeeRate:424-474 | Second instance same function |

#### Uninitialized Local Variables (11 instances)

| # | Location | Variable |
|---|----------|----------|
| SL-M-23 | ClassAdjustmentFacet._mergeAuditEntries:384-385 | `fi`, `ai` (index counters — 0 by design) |
| SL-M-24 | ViewCallsFacet._buildSingleClassInfo:1169-1171 | `classValue`, `classAvailableValue`, `classUnlockedValue` |
| SL-M-25 | FeeManagementFacet.mintAllPendingManagementFees:160 | `totalFeeInFundTokens` (accumulator) |
| SL-M-26 | FeeManagementFacet.calculatePerformanceFee:222 | `emptyMetrics` |
| SL-M-27 | ViewCalls2Facet._buildClassView:241 | `denomPrice` |
| SL-M-28 | FundTokensFacet._getFundHoldingsFromHierarchicalSystem:799,804 | `totalCount`, `idx` |
| SL-M-29 | FundTokensFacet._getClassHoldingsFromHierarchicalSystem:834,842 | `totalCount`, `idx` |

#### Ignored Return Values (4 instances) — Potential Logic Bugs

| # | Location | Ignored Call |
|---|----------|-------------|
| SL-M-30 | FundLifecycleFacet._cancelPendingSubscribesInternal:609-638 | `executeCancelOrder` return value |
| SL-M-31 | SettlementFacet._validateSettlementFxRate:116-142 | `getFXRate` return value |
| SL-M-32 | EligibilityFacet.isEligible:51-64 | `isAccountEligible` return value |
| SL-M-33 | ViewCalls2Facet._collectEligibleClassesForFund:65-85 | Eligibility check return value |

---

## Low-Level Call Analysis

3 functions use low-level calls (all internal, all delegatecall):
1. `LibDiamond.initializeDiamondCut` — standard Diamond initialization
2. `AccountFacet._executeProposal` — proposal execution via delegatecall
3. `BaseFacet._validateAndPropose` — proposal creation via delegatecall + assembly for error propagation

---

## Dead Code Analysis

**0 dead functions found.** All internal functions have callers.

---

## Test Baseline

- **1,404 tests passed**, 0 failed, 0 skipped
- Includes: unit tests, integration tests, invariant tests, gas benchmarks
- Notable invariant tests: `cleanSupplyNeverExceedsTotalSupply`, `conversionPreservesTotalValue`
- Test suites cover: AccountFacet, OrderBook, ViewCalls, FundLifecycle, Eligibility, ClassAdjustment, MultiCurrency, CrossUmbrella, Settlement, FX

---

## Key Findings for Manual Review Priority

1. **REENTRANCY (15 instances):** Cross-facet delegatecall patterns — verify `reentrancyLock` usage
2. **PRECISION LOSS (2 instances):** `calculateAdjustedFeeRate` multiply-after-divide
3. **IGNORED RETURNS (4 instances):** Especially `_cancelPendingSubscribesInternal` and `_validateSettlementFxRate`
4. **UNINITIALIZED VARS (11 instances):** Verify intentional zero-initialization vs bugs
5. **56 calls-in-loop** (Low): Unbounded gas consumption in batch operations
