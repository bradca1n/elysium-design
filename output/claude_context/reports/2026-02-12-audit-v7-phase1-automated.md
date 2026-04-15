# V7 Audit — Phase 1: Automated Analysis

**Date:** 2026-02-12
**Branch:** multiCurrency
**Baseline:** 1404/1404 tests passing, 0 failed

## Slither Static Analysis Results

**Total findings:** 49 (4 High, 45 Medium)
**Excluded paths:** lib/, test/, node_modules/

### HIGH Impact (4) — All False Positives

All 4 are `uninitialized-state` for `AppStorageRoot.s` in `AppStorageRoot.sol:16`. This is a known Diamond proxy false positive — storage is initialized in the Diamond's context via delegatecall, not in individual facet contracts.

**Verdict:** FP — no action needed.

### MEDIUM Impact (45) — Breakdown by Detector

#### 1. reentrancy-no-eth (15 findings) — REVIEW IN PHASE 3

State variables written after external calls (delegatecalls to other facets):

| # | Location | External Call | State Write After |
|---|----------|---------------|-------------------|
| 1 | `AccountFacet._executeProposal:996-1029` | `delegatecall(callData)` | `internalExecutionContext = false` |
| 2 | `SettlementFacet._settleSubscribe:151-171` | `unlockTokens/burn/mint` | Cash/order state |
| 3 | `SettlementFacet._settleRedeem:174-203` | `unlockTokens/burn/mint` | Cash/order state |
| 4 | `SettlementFacet.executeConfirmCashFundSettlement:58-109` | `_settleSubscribe/_settleRedeem` | Settlement state |
| 5 | `FeeManagementFacet._processPerformanceFeeBatch:362-414` | `mint(feeDealingId)` | `baseInfo[].totalSupply` |
| 6 | `FeeManagementFacet.mintAllPendingManagementFees:156-195` | `mint(feeDealingId)` | `baseInfo[feeClassId].totalSupply` |
| 7 | `NavManagementFacet._updateNavInternal:222-239` | `mintAllPendingManagementFees` | `funds[].nav`, price history |
| 8 | `OrderManagementFacet._processOrdersImpl:238-368` | `createDealing/unlockTokens/burn/mint` | Multiple order/dealing state |
| 9 | `OrderManagementFacet._submitOrder:1023-1093` | `lockTokens` | Order state fields |
| 10 | `OrderManagementFacet._executeOrderTransfer:1151-1196` | `burn/mint` | Order amounts, status |
| 11 | `OrderManagementFacet.executeCancelOrder:140-192` | `unlockTokens` | Order status |
| 12 | `OrderManagementFacet._executeSwapOrder:1250-1283` | `_submitOrder` | Swap state |
| 13 | `FundLifecycleFacet._forceSubmitRedemptionOrderInternal:516-563` | `lockTokens` | User order indices |
| 14-15 | `OrderManagementFacet._processOrdersImpl` (2 paths) | Multiple | Multiple |

**Assessment:** These delegatecalls go to `address(this)` (same Diamond), so traditional reentrancy via external contract is limited. However, ERC1155 callbacks during mint/transfer operations remain a vector (see V5-C01, PHASE5-01). Verify reentrancy guard effectiveness in Phase 3.

#### 2. uninitialized-local (13 findings) — Mostly Benign

Variables intentionally initialized to default zero values (counters, accumulators). Key ones to verify:
- `FeeManagementFacet.mintAllPendingManagementFees:160` — `totalFeeInFundTokens` starts at 0, accumulated in loop
- `FeeManagementFacet.calculatePerformanceFee:222` — `emptyMetrics` intentional empty struct
- `ClassAdjustmentFacet._mergeAuditEntries:384-385` — merge indices `fi`, `ai` start at 0

**Verdict:** All intentional. Low risk.

#### 3. incorrect-equality (10 findings) — Intentional

All are existence/sentinel checks (`== 0` for uninitialized state):
- `createdAt == 0` → entity doesn't exist
- `currency == 0` → no denomination currency set
- `umbrellaId == 0` → invalid umbrella
- `totalSupply == 0` → empty fund
- `dealingsPerClass[classNum] == 0` → no dealing created yet

**Verdict:** All intentional design patterns. Low risk.

#### 4. unused-return (5 findings) — Worth Investigating

| # | Location | Ignored Return |
|---|----------|----------------|
| 1 | `FundLifecycleFacet._cancelPendingSubscribesInternal:632` | `executeCancelOrder` return |
| 2 | `SettlementFacet._validateSettlementFxRate:139` | `getFXRate` return |
| 3 | `OrderManagementFacet._calculateOrderResults` | `getFXRate` return |
| 4 | `EligibilityFacet.isEligible:63` | `isAccountEligible` return |
| 5 | `ViewCalls2Facet._collectEligibleClassesForFund:77` | `isEligible` return |

**Assessment:** #2 and #3 (FX rate return ignored) need manual verification — could indicate missing validation. #1 (cancel return) and #4-5 (eligibility) likely intentional.

#### 5. divide-before-multiply (2 findings) — Precision Concern

Both in `FeeManagementFacet.calculateAdjustedFeeRate:424-474`:
- Sequential `(adjustedReturn * (PRECISION - penalty)) / PRECISION` operations
- Each division truncates, then result is multiplied again
- Precision loss compounds with each penalty application

**Assessment:** MEDIUM risk. Cumulative precision loss could understate fee adjustments.

## Test Coverage Summary (Source Files Only)

| File | Lines | Branches | Functions |
|------|-------|----------|-----------|
| AccountFacet | 93.19% | 66.23% | 100% |
| AdminViewCallsFacet | 85.07% | 68.97% | 95.65% |
| ClassAdjustmentFacet | 94.92% | 90.00% | 100% |
| EligibilityFacet | 97.20% | 100% | 91.67% |
| FXManagementFacet | **100%** | **100%** | **100%** |
| FeeManagementFacet | 87.96% | **70.27%** | 100% |
| FundLifecycleFacet | 97.32% | 72.73% | 100% |
| FundManagementFacet | 96.59% | **40.00%** | 98.25% |
| FundManagementValidationFacet | 95.92% | 68.18% | 100% |
| FundTokensFacet | 86.23% | **54.05%** | 86.44% |
| ManagerViewCallsFacet | 96.43% | 71.43% | 100% |
| NavManagementFacet | 98.90% | 85.71% | 100% |
| OrderManagementFacet | 95.52% | 75.20% | 100% |
| OrderValidationFacet | 99.20% | 84.13% | 100% |
| SettlementFacet | 93.67% | **70.59%** | 100% |
| ViewCalls2Facet | **74.63%** | 66.67% | 82.61% |
| ViewCallsFacet | 97.91% | 87.06% | 100% |
| BaseFacet | 96.97% | 73.33% | 100% |
| TokenIdUtils | 89.04% | 100% | 85.71% |
| RiskMetrics | 92.37% | 75.00% | 88.89% |

### Low Coverage Areas (Higher Scrutiny Needed)

1. **FundManagementFacet** — 40% branch coverage. Many validation branches untested.
2. **FundTokensFacet** — 54% branch coverage, 86% function coverage. Hierarchical holdings paths undertested.
3. **SettlementFacet** — 70.59% branch coverage. Settlement edge cases need more testing.
4. **FeeManagementFacet** — 70.27% branch coverage. Fee calculation edge cases.
5. **ViewCalls2Facet** — 74.63% line, 82.61% function coverage. Several view functions untested.

## Key Takeaways for Phase 3 Agents

1. **15 reentrancy paths** flagged — verify reentrancy guard (`reentrancyLock`) covers all state-modifying entry points
2. **FX rate returns ignored** in Settlement and OrderManagement — verify FX validation is complete
3. **Low branch coverage** in FundManagement (40%), FundTokens (54%), Settlement (70%) — these need extra scrutiny
4. **Precision loss** in fee rate calculation — compound truncation in `calculateAdjustedFeeRate`
5. **All 1404 tests pass** — baseline is clean
