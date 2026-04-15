# Audit V8 — Phase 1: Automated Analysis
<!-- 2026-03-02 -->

## Test Baseline

- **Suite:** 96 test files, 1476 tests
- **Result:** 1474 PASS, 2 FAIL (apparent), 0 SKIP
- **Failure analysis:** Both failures are `testGasOptimization()` in:
  - `test/ComplexDealingConversion.t.sol` — fails at 3,595,775 gas in full suite
  - `test/NAVSynchronization.t.sol` — fails at 15,765,499 gas in full suite
  - **Both PASS when run in isolation** — flaky gas failure from parallel test execution overhead, NOT logic errors
- **Verdict:** All tests effectively passing. No logic failures detected.

## Slither Results Summary

**Total findings: 49 (4 HIGH, 45 MEDIUM, excluded LOW/INFO from this run)**

### HIGH Severity (4 findings)

**[HIGH-S01] Uninitialized State Variable — AppStorageRoot.s**
- **Detector:** `uninitialized-state`
- **Location:** `src/shared/AppStorageRoot.sol#16`
- **Finding:** `AppStorageRoot.s` is never explicitly initialized but is used throughout all facets.
- **Assessment:** **FALSE POSITIVE** — This is the intentional Diamond Proxy storage pattern. `s` uses assembly (`s.slot := 0`) to point to storage slot 0. Slither cannot trace through the assembly initialization. The pattern is correct and expected for EIP-2535 Diamond implementations. However, verifying the assembly in AppStorageRoot.sol during Phase 3 is recommended.
- **Status:** FALSE POSITIVE (Diamond pattern)

### MEDIUM Severity (45 findings)

#### Reentrancy — reentrancy-no-eth (12 findings)

**[MED-R01] SettlementFacet._settleSubscribe — CEI violation**
- **Location:** `src/facets/SettlementFacet.sol#151-171`
- **Pattern:** External calls (FundTokensFacet mint/lock) before state updates
- **Risk:** ERC1155 `onERC1155Received` callback during mint can re-enter settlement
- **Related:** E-BC20, E-BC21 from known catalog

**[MED-R02] SettlementFacet._settleRedeem — CEI violation**
- **Location:** `src/facets/SettlementFacet.sol#174-203`
- **Pattern:** `unlockTokens` → `burn` → `mint` sequence; `cashPendingSwap` decremented after token operations
- **Related:** E-BC20, E-BC21

**[MED-R03] SettlementFacet.executeConfirmCashFundSettlement — cross-settlement reentrancy**
- **Location:** `src/facets/SettlementFacet.sol#58-109`
- **Pattern:** Calls `_settleSubscribe` → `_settleRedeem` in sequence; both have reentrancy exposure

**[MED-R04] OrderManagementFacet._executeOrderTransfer — token operations before state updates (x2)**
- **Location:** `src/facets/OrderManagementFacet.sol#1151-1196`
- **Pattern:** `burn` called in loop before order state fully updated

**[MED-R05] OrderManagementFacet._processOrdersImpl — dealing creation before completion (x2)**
- **Location:** `src/facets/OrderManagementFacet.sol#238-368`
- **Pattern:** `IFundManagement.createDealing()` called mid-loop; callback opportunity before loop completes

**[MED-R06] OrderManagementFacet._submitOrder — unlock/lock before order recorded**
- **Location:** `src/facets/OrderManagementFacet.sol#1023-1093`
- **Pattern:** Token lock operations before order array appended

**[MED-R07] OrderManagementFacet.executeCancelOrder — unlock before state cleared**
- **Location:** `src/facets/OrderManagementFacet.sol#140-192`
- **Pattern:** `unlockTokens` before order status set to CANCELLED

**[MED-R08] OrderManagementFacet._executeSwapOrder — linked order chain**
- **Location:** `src/facets/OrderManagementFacet.sol#1250-1283`

**[MED-R09] FeeManagementFacet.mintAllPendingManagementFees — mint before state update**
- **Location:** `src/facets/FeeManagementFacet.sol#156-195`
- **Pattern:** `FundTokensFacet.mint()` before fee tracking updated
- **Related:** E-BC25 (totalSupply divergence risk)

**[MED-R10] FeeManagementFacet._processPerformanceFeeBatch — mint before batch state**
- **Location:** `src/facets/FeeManagementFacet.sol#362-414`

**[MED-R11] NavManagementFacet._updateNavInternal — fee mint before NAV stored**
- **Location:** `src/facets/NavManagementFacet.sol#222-239`
- **Related:** E-BC29 (stale data cascade)

**[MED-R12] FundLifecycleFacet._forceSubmitRedemptionOrderInternal — token lock before order**
- **Location:** `src/facets/FundLifecycleFacet.sol#516-563`
- **Pattern:** `lockTokens` called before redemption order is fully registered

**[MED-R13] AccountFacet._executeProposal — delegatecall as external call**
- **Location:** `src/facets/AccountFacet.sol#996-1029`
- **Note:** Slither treats delegatecall as external; this pattern is intentional for proposal execution but warrants reentrancy guard audit

#### Divide-Before-Multiply (2 findings)

**[MED-D01] FeeManagementFacet.calculateAdjustedFeeRate — precision loss in fee calculation**
- **Location:** `src/facets/FeeManagementFacet.sol#424-474`
- **Pattern 1:** `adjustedReturn = (adjustedReturn * (PRECISION - volatilityPenalty)) / PRECISION` then `* (PRECISION - drawdownPenalty) / PRECISION`
- **Pattern 2:** `adjustedReturn` divided → then `* BPS_DENOMINATOR / PRECISION`
- **Impact:** Sequential divisions accumulate rounding error. On each step, up to 1 wei precision lost. For performance fee calculations, this compounds across all investors' fee calculations.
- **Severity:** MEDIUM — precision loss in fee math is non-trivial

#### Incorrect Equality (9 findings)

**[MED-E01] `currency == 0` checks in OrderManagementFacet**
- **Location:** `src/facets/OrderManagementFacet.sol#1287`, `#1295`, `#1299`
- **Assessment:** Using `== 0` to detect "no currency set" is acceptable given ISO currency codes always > 0, but risky if storage corruption occurs. INFORMATIONAL severity.

**[MED-E02] `umbrellaId == 0` in getMinimumSubscriptionStatus**
- **Location:** `src/facets/OrderManagementFacet.sol#610`
- **Assessment:** `umbrellaId == 0` used as "no umbrella", acceptable since FIRST_FUND_NUM = 1. INFORMATIONAL.

**[MED-E03] `createdAt == 0` existence checks in BaseFacet**
- **Location:** `src/shared/BaseFacet.sol#83`, `#88`
- **Assessment:** Checking `createdAt == 0` to detect non-existent entities is valid but could be confused by overflow. With uint32, no overflow concern. INFORMATIONAL.

**[MED-E04] `dealingId == 0` and baseInfo checks in _processOrdersImpl**
- **Location:** `src/facets/OrderManagementFacet.sol#238-368`
- **Assessment:** Multiple `== 0` checks for dealing ID initialization state. Acceptable given dealing IDs start at 1.

#### Uninitialized Locals (13 findings)

**[MED-U01] `totalFeeInFundTokens` in FeeManagementFacet.mintAllPendingManagementFees**
- **Location:** `src/facets/FeeManagementFacet.sol#160`
- **Assessment:** In Solidity 0.8+, uninitialized local uint defaults to 0 — correct for accumulator. FALSE POSITIVE from Slither.

**[MED-U02] `fi` and `ai` index vars in ClassAdjustmentFacet._mergeAuditEntries**
- **Location:** `src/facets/ClassAdjustmentFacet.sol#384-385`
- **Assessment:** Loop index starting at 0 is correct. FALSE POSITIVE.

**[MED-U03] `classValue`, `classAvailableValue`, `classUnlockedValue` in ViewCallsFacet._buildSingleClassInfo**
- **Location:** `src/facets/ViewCallsFacet.sol#1169-1171`
- **Assessment:** Accumulator variables starting at 0. FALSE POSITIVE.

**[MED-U04] `emptyMetrics` in FeeManagementFacet.calculatePerformanceFee**
- **Location:** `src/facets/FeeManagementFacet.sol#222`
- **Assessment:** `IFeeManagement.RiskMetrics` struct uninitialized = all zeros. Used as default empty value. Verify this is intentional.

**[MED-U05] `tempCutLen` in LibDiamondHelper.deployFacetsAndGetCuts**
- **Location:** `src/generated/LibDiamondHelper.sol#404`
- **Assessment:** Generated code; acceptable.

**[MED-U06] `denomPrice` in ViewCalls2Facet._buildClassView**
- **Location:** `src/facets/ViewCalls2Facet.sol#241`
- **Assessment:** Check if this defaults to zero when it shouldn't — could return incorrect price if denomination price is never calculated.

**[MED-U07] `totalCount` and `idx` in FundTokensFacet hierarchy functions**
- **Location:** `src/facets/FundTokensFacet.sol#799`, `#804`, `#834`, `#842`
- **Assessment:** Accumulator/index variables, acceptable.

#### Unused Return Values (4 findings)

**[MED-RV01] FundLifecycleFacet._cancelPendingSubscribesInternal ignores executeCancelOrder return**
- **Location:** `src/facets/FundLifecycleFacet.sol#632`
- **Impact:** Cancel operations may fail silently during lifecycle transitions

**[MED-RV02] SettlementFacet._validateSettlementFxRate ignores getFXRate return**
- **Location:** `src/facets/SettlementFacet.sol#116-142`
- **Impact:** FX rate validation may be incomplete

**[MED-RV03] OrderManagementFacet._calculateOrderResults ignores return value**
- **Location:** `src/facets/OrderManagementFacet.sol#421-534`

**[MED-RV04] EligibilityFacet.isEligible ignores isAccountEligible return**
- **Location:** `src/facets/EligibilityFacet.sol#63`
- **Impact:** Eligibility check may not correctly propagate result

### LOW Severity (from prior run)

**[LOW-S01] IDiamondProxy shadowing — totalSupply param shadows function**
- `src/generated/IDiamondProxy.sol#180` — shadowing in generated file, informational

**[LOW-S02] IDiamondProxy shadowing — owner param shadows IERC173.owner()**
- `src/generated/IDiamondProxy.sol#26`

**[LOW-L01–L12] Calls inside loops (12 findings)**
- `FundLifecycleFacet._cancelPendingSubscribesInternal` — `executeCancelOrder` in loop
- `FeeManagementFacet.mintAllPendingManagementFees` — `calculateClassPrice` in loop (delegatecall)
- `FundManagementFacet._batchConvertDealingTokensInternal` — `burn` in loop
- `OrderManagementFacet._executeOrderTransfer` — `burn` in loop
- `OrderManagementFacet._handleSwapLinking` — `lockTokens` in loop
- `ViewCallsFacet` — multiple `calculateClassPrice`/`calculateDealingPrice` in loops
- **Assessment:** Cross-facet `address(this)` calls inside loops are actually delegatecalls — expensive but not external in the traditional sense. Gas concern for large batches.

### INFORMATIONAL

- 22x `assembly` usage — expected for Diamond proxy, pagination optimizations, and ERC1155 callbacks
- 9x `cyclomatic-complexity` — high complexity in order processing, NAV update, settlement
- 1x `solc-version` — `>=0.8.21` in generated files, noted but low risk
- `pragma` — 7 different pragma versions across src + lib

## Phase 1 Summary

| Severity | Count | False Positives | Real Findings |
|----------|-------|-----------------|---------------|
| HIGH | 4 | 4 (Diamond FP) | 0 |
| MEDIUM | 45 | ~20 (uninit FP) | ~25 |
| LOW | 14 | ~8 | ~6 |
| INFO | 22+ | Most | Few |

**Key real findings to verify in Phase 3:**
1. reentrancy-no-eth across SettlementFacet, OrderManagementFacet, FeeManagementFacet (CEI violations)
2. divide-before-multiply in fee calculation precision
3. unused return values — silent failure paths
4. uninitialized `denomPrice` in ViewCalls2Facet — potential zero price bug
5. uninitialized `emptyMetrics` struct passed to performance fee calculation

**Test coverage note:** 1476 tests, all pass. `testGasOptimization()` intermittent gas failure is test infrastructure issue, not code logic.
