# V9 Phase 1: Automated Analysis — 2026-03-03

## Forge Test Baseline

**Result: 1488/1488 tests passed, 0 failed, 0 skipped**

All V8 fixes are covered by existing tests. No regressions detected.

## Slither Static Analysis

**Total findings: 49 (4 High, 45 Medium)**

Excluded paths: lib/, test/, node_modules/, script/

### HIGH Impact (4) — All FALSE POSITIVE

All 4 are `uninitialized-state` for `AppStorageRoot.s` (src/shared/AppStorageRoot.sol:16).
This is the Diamond Proxy pattern — storage lives at slot 0 and is initialized via InitDiamond. Slither doesn't understand Diamond storage.

### MEDIUM Impact by Detector

#### reentrancy-no-eth (15 findings)

Cross-facet delegatecall reentrancy patterns. Key instances:

| Location | Description | Assessment |
|----------|-------------|------------|
| AccountFacet._executeProposal:996-1029 | `internalExecutionContext = false` after delegatecall | Mitigated by Fix 1 (inExternalCallback) and reentrancyLock |
| SettlementFacet._settleSubscribe:151-171 | unlock+burn+mint sequence | State updated after token ops — CEI concern |
| SettlementFacet._settleRedeem:174-203 | unlock+burn+mint sequence | Same pattern as subscribe |
| SettlementFacet.executeConfirmCashFundSettlement:58-109 | Calls _settleSubscribe/_settleRedeem | Wrapper inherits child reentrancy |
| FeeManagementFacet._processPerformanceFeeBatch:362-414 | mint then update baseInfo | baseInfo.totalSupply updated AFTER mint (CEI concern) |
| FeeManagementFacet.mintAllPendingManagementFees:156-195 | mint then update totalSupply | Same pattern — totalSupply after mint |
| NavManagementFacet._updateNavInternal:222-239 | mintAllPendingManagementFees then store NAV | Cross-facet reentrancy via fee mint |
| OrderManagementFacet._processOrdersImpl:238-368 | createDealing + token ops | Complex reentrancy surface |
| OrderManagementFacet._submitOrder:1023-1093 | lockTokens then write order state | State after lock |
| OrderManagementFacet._executeSwapOrder:1250-1283 | _submitOrder with lock | Inherited reentrancy |
| OrderManagementFacet.executeCancelOrder:140-192 | unlockTokens then update order | State after unlock |
| OrderManagementFacet._executeOrderTransfer:1151-1196 (x2) | burn/mint/unlock sequences | Two variants |
| FundLifecycleFacet._forceSubmitRedemptionOrderInternal:516-563 | lockTokens then write indices | State after lock |

**Assessment:** Fix 1 (inExternalCallback guard) prevents ERC1155 callback exploitation. However, the CEI pattern violations remain — if a Diamond-level reentrancy guard (E-BC24) were added, these would be protected. Currently relies on Fix 1 and reentrancyLock.

#### uninitialized-local (13 findings) — All FALSE POSITIVE

Loop counters and accumulators (totalCount, idx, fi, ai, classValue, etc.) — Solidity default-initializes to 0. These are intentional.

#### incorrect-equality (10 findings) — Mostly FALSE POSITIVE

Strict equality checks against 0 for existence checks (`createdAt == 0`, `currency == 0`, `dealingsPerClass[x] == 0`). These are the established pattern for null/unset checks.

#### unused-return (5 findings) — MIXED

| Location | Description | Assessment |
|----------|-------------|------------|
| SettlementFacet._validateSettlementFxRate:139 | `getFXRate` return ignored | **INVESTIGATE** — Fix 16 was supposed to fix this area |
| OrderManagementFacet._calculateOrderResults:490 | `getFXRate` return ignored | **GENUINE** — E-BC17 residual (order processing path still wrong) |
| FundLifecycleFacet._cancelPendingSubscribesInternal:632 | `executeCancelOrder` return ignored | **INVESTIGATE** — cancel failures silently swallowed |
| EligibilityFacet.isEligible:63 | `isAccountEligible` return ignored | **INVESTIGATE** |
| ViewCalls2Facet._collectEligibleClassesForFund:77 | `isEligible` return ignored | LOW — view function, no state impact |

#### divide-before-multiply (2 findings) — LOW RISK

Both in `FeeManagementFacet.calculateAdjustedFeeRate:424-474`. Sequential penalty application (volatility then drawdown) causes minor precision loss. Unlikely to be exploitable given PRECISION = 1e18.

## Key Findings Requiring Further Investigation

1. **SettlementFacet getFXRate return (line 139)** — May indicate Fix 16 is incomplete
2. **OrderManagementFacet getFXRate return (line 490)** — Known E-BC17 residual
3. **FundLifecycleFacet cancel return ignored (line 632)** — Silent failure in bulk cancel
4. **15 reentrancy patterns** — Fix 1 mitigates but E-BC24 (Diamond reentrancy guard) remains open
5. **FeeManagementFacet totalSupply update after mint** — CEI concern for dual totalSupply (V8-T01/E-BC25)
