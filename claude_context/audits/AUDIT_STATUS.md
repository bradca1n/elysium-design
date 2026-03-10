# Audit Status — V9 Post-Fix Verification (2026-03-03)
<!-- Updated 2026-03-03: V9 fix round — 11 V9 findings fixed (V9-CF-01, V9-A-C01, V9-CF-02, V9-A-M01, V9-FMF-04/06/07, V9B-03, V9-D08, V9-E02, V8-6-01); 2 V8 partial fixes now complete (ARCH-01, V8-P01) -->
<!-- Updated 2026-03-03: V9 audit completed — 20 V8 fixes verified (18 correct, 2 partial), 31 new findings (0C/1H/7M/13L/10I), maturity 2.22/4.0 -->
<!-- Updated 2026-03-02: V8 audit extended with FundManagementValidationFacet + PerfFeeStandardFacet (2 previously unaudited facets) + full 18-facet cross-facet redo -->

<!-- ~9000 tokens -->

<!-- Updated 2026-03-02: Code investigation completed for all V8 findings; false positives identified; fix plan at docs/plans/2026-03-02-audit-fix-plan.md -->
<!-- Updated 2026-03-02: All 17 V8 fixes implemented; 1477/1477 forge tests pass -->
<!-- Updated 2026-03-02: Fixes 18/19/20 added (V8-PFS-03 hurdleFundId, V8-PFS-01 fail-closed, V8-PFS-06 configurable staleness); 1488/1488 forge tests pass. V8-T01 BY DESIGN, V8-FMV-01 BY DESIGN, V8N-07 NOT PRESENT confirmed. -->

## Investigation Summary (2026-03-02)

After thorough code investigation with sequential-thinking analysis, the following corrections to the V8 status table apply:

| Finding | Previous Status | Corrected Status | Evidence |
|---------|----------------|-----------------|----------|
| V8-T01, V8-T04 | OPEN | **BY DESIGN** | Dual totalSupply is intentional architecture — dealing level = real ownership, class/fund level = accounting |
| V8-P02 | OPEN | **FALSE POSITIVE** | `FundTokensFacet._update` checks `availableBalance = balance - lockedBalance`; locked tokens cannot be burned |
| V8-PFS-04 | OPEN | **ALREADY FIXED** | `DealingInfo.lastPerfMintAtNavT` initialized to `navUpdatedAt` at `FundManagementFacet.sol:362` |
| V8-PFS-05 | OPEN | **BY DESIGN** | Negative/flat benchmark → no hurdle deduction → full gain above HWM. Absolute return logic intended |
| V8-A1-M01 | OPEN | **FALSE POSITIVE** | All three functions already guarded: `executeCreateFund` has `onlyInternalExecution`; `createDealing` same; `mintAllPendingManagementFees(uint256,uint32)` is `public onlyInternalExecution`. Propose functions are intentionally public |
| V8A4-M02 | OPEN | **FALSE POSITIVE** | `validateFundStatusTransition` properly validates all transitions; double-checked at both propose and execute phase |
| V8-6-01 | OPEN | **FALSE POSITIVE** | `_hasAnyDealingBalance` outer `classNum < nextClassId` and inner `d < nextDealingId` both correct for 1-indexed IDs with nextId = last+1 semantic |
| V8A4-M05 (createFund) | OPEN | **ALREADY FIXED** | `validateFundCreation` already checks `umbrellaFunds[umbrellaId].exists` AND `.status == ACTIVE` |
| V8-CF05 (chain) | OPEN | **PARTIALLY RECLASSIFIED** | Panic does NOT cause NAV deadlock — `executeUpdateNav` calls management fees only, not `calcStandardPerfFee`. Impact is `batchMintPerformanceFees` failure. Fix: validate params at SET time (covered by V8-PFS-02 fix) |
| V8N-02 | OPEN | **ALREADY ADDRESSED** | Internal version has `if (timestamp > block.timestamp) revert FutureTimestamp()` at line 160; no additional change needed |

**17 real fixes planned** — see `docs/plans/2026-03-02-audit-fix-plan.md`

## Audit History

| Version | Date | Total | CRIT | HIGH | MEDIUM | LOW | INFO | Maturity |
|---------|------|-------|------|------|--------|-----|------|---------|
| **V9** | **2026-03-03** | **31 new** | **0** | **1** | **7** | **13** | **10** | **2.22/4.0** |
| V8 (extended) | 2026-03-02 | 86 | 2 | 12 | 27 | 34 | 11 | 1.89/4.0 |
| V8 (base) | 2026-03-02 | 67 | 2 | 9 | 21 | 28 | 7 | 1.89/4.0 |
| V7 | 2026-02-12 | 82 | 5 | 16 | 24 | 22 | 15 | 2.3/4.0 |
| V6 | 2026-02-10 | 83 | 7 | 19 | 26 | 18 | 13 | 2.4/4.0 |
| V5 | 2026-02-09 | 87 | 15 | 22 | 24 | 17 | 9 | 2.0/4.0 |

## V8 Findings Tracking Table

### CRITICAL (2)

| ID | Title | Location | E-BC | V7 Status | V8 Status | Remediation |
|----|-------|----------|------|-----------|-----------|-------------|
| ARCH-01 / V8-A1-C01 | ERC1155 callback bypasses proposal system via internalExecutionContext=true | AccountFacet + any mint path | E-BC20, E-BC24, E-BC30 | OPEN | **FIXED (Fix 1 + V9-A-C01 fix, 2026-03-03)** | Both single and batch callbacks now protected with `inExternalCallback` guard |
| V8-A1-C02 / E-BC22 | TokenId mutated classId→dealingId on partial fill corrupts pricing | OrderManagementFacet.sol:304 | E-BC22 | OPEN | **FIXED (Fix 2, 2026-03-02)** | Local `dealingId` variable; `order.tokenId` never mutated |

### HIGH (9)

| ID | Title | Location | E-BC | V7 Status | V8 Status | Remediation |
|----|-------|----------|------|-----------|-----------|-------------|
| V8-T01 | Dual totalSupply — _batchConvertDealingTokens, fee mint, onramp never update baseInfo | FundTokensFacet + OrderMgmt + FeeMgmt | E-BC25 | OPEN | **BY DESIGN** — dealing-level totalSupply tracks real ownership; class/fund level tracks administrative accounting. Two genuinely different things per product design |
| V8-A1-H01 | Unvalidated dealing schedule timestamps | executeSetDealingSchedule | E-BC27 | OPEN | **FIXED (Fix 9, 2026-03-02)** | Future+sorted+non-zero validation in executeSetDealingSchedule |
| V8-A1-H02 | Uncapped performance fee BPS at runtime | OrderManagementFacet | E-BC28 | PARTIAL FIX (HWM/maxFee fixed, cap missing) | **FIXED (Fix 6+8, 2026-03-02)** | Cap at SET time (Fix 6) + cap at application time (Fix 8) |
| V8-A1-H03 | Any operator can cancel any proposal (griefing) | AccountFacet cancel function | — | OPEN | **FIXED (Fix 4, 2026-03-02)** | Only owner or original proposer can cancel |
| V8A4-H01 | Bulk cancel atomically reverts on single failure | FundLifecycleFacet.executeBulkCancelOrders | — | OPEN | **SKIPPED (user decision)** | — |
| V8A4-H02 | Unsafe int128 cast on fee.amount (overflow → sign inversion) | ClassAdjustmentFacet.sol:417 | — | NEW | **FIXED (Fix 17, 2026-03-02)** | SafeCast.toInt128 in _feeToEntry |
| V8-CF01 | Adjustment queue saturation → NAV deadlock (NEW cross-facet) | ClassAdjustmentFacet × NavMgmt × FeeMgmt | E-BC31 residual | NEW | **FIXED (Fix 13, 2026-03-02)** | maxAdjustmentBps enforced at posting time in validateClassAdjustment |
| V8-P01 | No emergency pause mechanism on any facet | All facets — systemic | E-BC32 | NOT PRESENT | **FIXED (Fix 3 + V9-CF-01 fix, 2026-03-03)** | Protocol-level AND fund-level blocking both functional; `_requireFundNotBlocked` added to 30+ execute* functions |
| V8-P02 | ARCH-01 compound: burn-without-unlock corrupts lock ledger | FundTokensFacet burn + ARCH-01 | E-BC30 | NOT PRESENT | **RESOLVED via Fix 1** | ARCH-01 fixed; burn paths already check lock state |

### MEDIUM (21)

| ID | Title | V8 Status |
|----|-------|-----------|
| V8-A1-M01 | createFund/createDealing/mintMgmtFees exposed public without onlyInternalExecution | **FALSE POSITIVE (V9)** — all guarded by onlyInternalExecution or _validateAndPropose |
| V8-A1-M02 | O(n×m) eligibility tag matching — unbounded loop | OPEN |
| V8-A1-M03 | Multisig threshold re-computed at confirmation (retroactive lowering attack) | OPEN |
| V8-A1-M04 | executeSetMultisigConfig allows threshold > operator count | **FIXED (Fix 14, 2026-03-02)** |
| V8-T03 | FundTokens[0].owner = deployer, not Diamond; no transfer function | OPEN |
| V8-T04 | Cash token onramp/offramp never updates baseInfo[cashId].totalSupply | OPEN |
| V8N-01 | Mgmt fee uses OLD stored NAV (before navUpdatedAt write) | **BY DESIGN (V9)** — fees accrue on old NAV for correct period attribution |
| V8N-02 | Direct mintManagementFee bypasses per-class lastMgmtFeeMintTs guard | **FIXED (V9)** — future timestamp guard + onlyInternalExecution |
| V8N-03 | Dealing state deadlock in AWAITS_FEE_PROCESSING | **ADDRESSED (V9)** — empty arrays with lastBatch=true advance state; residual operational complexity LOW |
| V8N-07 | Risk adjustor fail-open (staticcall failure → zero risk factor) | **NOT PRESENT** — NavManagementFacet has no staticcall / risk adjustor code. Finding refers to PerfFeeStandardFacet (= V8-PFS-01, now fixed by Fix 19) |
| V8N-12 | No forward-only check on navTimestamp (past timestamps skip fee) | **FIXED (Fix 10, 2026-03-02)** |
| V8A4-M01 | maxAdjustmentBps not enforced at posting time | **FIXED (Fix 13, 2026-03-02)** |
| V8A4-M02 | Fund status transitions not validated sequentially | OPEN |
| V8A4-M03 | setInvestorTags always replaces all tags atomically | OPEN |
| V8A4-M04 | Unbounded O(n×m) loop in tag matching per order | OPEN |
| V8A4-M05 | Missing input validation in createUmbrella/createFund | OPEN |
| V8-A5-01 | FX safety config never initialized in InitDiamond | **SKIPPED (user decision)** |
| V8-A5-02 | getFXRate return discarded; validateFxRateDeviation uses wrong rate | **FIXED (Fix 16, 2026-03-02)** |
| V8-A5-07 | _settleRedeem modifies dependent order without validation | **FIXED (Fix 15, 2026-03-02)** |
| V8-6-01 | _hasAnyDealingBalance uses d < nextDealingId (off-by-one) | **FIXED (2026-03-03)** — both class and dealing loops changed from `<` to `<=` |
| V8-6-04 | Silent FX fallback to base price (wrong currency) | OPEN |

### Extension Findings — FundManagementValidationFacet (V8-FMV-*)

| ID | Severity | Location | Description | Status |
|----|----------|----------|-------------|--------|
| V8-FMV-01 | MEDIUM | `FundManagementValidationFacet.sol:42-45` | E-BC18: `maxMgmtFeeRateBps=0` (default) disables mgmt fee rate cap for all new funds | **BY DESIGN** — default no-cap is intentional; operators must explicitly configure caps via setProtocolSafetyConfig |
| V8-FMV-02 | LOW | `FundManagementValidationFacet.sol:87-95` | `validateOfframp` missing `umbrella.exists` check (asymmetric with `validateOnramp`) | OPEN |
| V8-FMV-03 | INFO | `FundManagementValidationFacet.sol:17` | All validate* functions externally callable; no additional info beyond existing public views | OPEN (by design) |
| V8-FMV-04 | LOW | `FundManagementValidationFacet.sol:93` | Diamond self-call creates coupling; if FundTokensFacet removed via diamondCut, validateOfframp breaks | OPEN |
| V8-FMV-05 | MEDIUM | `FundManagementValidationFacet.sol:64-69` | `lastPerfMintAtNavT` equality check can permanently block dealing conversions if fee processing is non-uniform | **FIXED (Fix 11, 2026-03-02)** — skip check when no perfFeeSelector |
| V8-FMV-06 | LOW | `FundManagementValidationFacet.sol:19-41` | No upper bound on fund/umbrella/class name length | OPEN |
| V8-FMV-07 | LOW | `FundManagementValidationFacet.sol:105-110` | Subscription rule range uses 0-disables pattern (intentional "no limit" semantic) | OPEN (by design) |
| V8-FMV-08 | INFO | `FundManagementValidationFacet.sol:72-95` | Onramp/offramp asymmetry intentional (V3-H08) but onramp lacks documentation | OPEN |
| V8-FMV-02 | LOW | `FundManagementValidationFacet.sol:87-95` | `validateOfframp` missing `umbrella.exists` check | **FIXED (Fix 12, 2026-03-02)** |

### Extension Findings — PerfFeeStandardFacet (V8-PFS-*)

| ID | Severity | Location | Description | Status |
|----|----------|----------|-------------|--------|
| V8-PFS-01 | HIGH | `PerfFeeStandardFacet.sol:140-156` | E-BC31 second instance: `_applyRiskAdjustor` staticcall fail-open — any failure silently returns full gain | **FIXED (Fix 19, 2026-03-02)** — fail-closed: revert `RiskAdjustorFailed` on any staticcall failure or adjusted > gain |
| V8-PFS-02 | HIGH | `PerfFeeStandardFacet.sol:46-48` | `abi.decode` panics on empty/short `perfFeeParams` → permanent dealing pipeline deadlock (V8-CF05) | **FIXED (Fix 5, 2026-03-02)** — 128-byte minimum check at SET time |
| V8-PFS-03 | HIGH | `FeeManagementFacet.sol:executeSetPerfFeeCalculator` | `hurdleFundId` never validated → manager can point to non-existent/retired fund → hurdle silently skipped (V8-CF04) | **FIXED (Fix 18, 2026-03-02)** — createdAt != 0 + ACTIVE status check; any umbrella allowed |
| V8-PFS-04 | MEDIUM | `PerfFeeStandardFacet.sol:118, 122` | `lastPerfMintAtNavT=0` for new dealings breaks hurdle in first fee period (both directions wrong) | **ALREADY FIXED** — `lastPerfMintAtNavT` initialized to `navUpdatedAt` at dealing creation (FundManagementFacet:362) |
| V8-PFS-05 | MEDIUM | `PerfFeeStandardFacet.sol:178` | Negative/flat benchmark return yields zero hurdle; correct for absolute, wrong for asymmetric hurdle | **BY DESIGN** — absolute return hurdle intended; zero hurdle on negative benchmark is correct behavior |
| V8-PFS-06 | MEDIUM | `PerfFeeStandardFacet.sol:24` | `MAX_PRICE_STALENESS=7d` hardcoded; manager controlling benchmark fund can stop updates to eliminate hurdle | **FIXED (Fix 20, 2026-03-02)** — `maxBenchmarkStaleness` added to ProtocolSafetyConfig; fail-closed revert `BenchmarkPriceMissing` on stale/missing data |
| V8-PFS-07 | MEDIUM | `PerfFeeStandardFacet.sol:41-67` | No classId/dealingId membership validation; mismatched IDs produce wrong fee BPS stored in state | **FIXED (Fix 7, 2026-03-02)** — DealingNotInClass check in calculatePerformanceFees |
| V8-PFS-08 | LOW | `PerfFeeStandardFacet.sol:47, 95` | `feeRateBps` (max 655%) not capped against `MAX_ADJUSTED_FEE_RATE_BPS` (2000 BPS); extends E-BC28 | **FIXED (Fix 6, 2026-03-02)** — maxPerfFeeRateBps in ProtocolSafetyConfig |
| V8-PFS-09 | LOW | `PerfFeeStandardFacet.sol:249` | Staleness check safe but fragile: depends on sorted timestamp array invariant not enforced in _updateNavInternal | OPEN |
| V8-PFS-10 | INFO | `PerfFeeStandardFacet.sol:52-53, 80` | Three cross-facet view calls through Diamond proxy add ~2400 gas overhead; no security impact | OPEN |
| V8-PFS-11 | INFO | `PerfFeeStandardFacet.sol` (entire) | No events for fee calculation intermediates; view-only facet cannot emit events | OPEN (by design) |

### New Cross-Facet Chains (V8-CF02 through V8-CF07)

| ID | Severity | Facets | Description | Status |
|----|----------|--------|-------------|--------|
| V8-CF02 | CRITICAL | AccountFacet, FundTokensFacet, FundManagementFacet, FundManagementValidationFacet | ARCH-01 + V8-FMV-01: callback reentrancy creates share class with 655% fee rate bypassing multisig | OPEN |
| V8-CF03 | HIGH | OrderMgmt, FundTokens, NavMgmt, PerfFeeStandard, FeeMgmt | E-BC25 dual totalSupply → inflated price → PerfFeeStandard overcharges fees → excess fee mint further inflates supply → self-reinforcing loop | OPEN |
| V8-CF04 | HIGH | FundMgmt, FundMgmtValidation, PerfFeeStandard, FeeMgmt | Manager sets invalid/self-controlled hurdleFundId → hurdle permanently eliminated → max perf fee | **FIXED (Fix 18, 2026-03-02)** — hurdleFundId validated at SET time: createdAt != 0 + ACTIVE; fail-closed at calculation time (Fix 19+20) |
| V8-CF05 | HIGH | FundMgmt, PerfFeeStandard, FeeMgmt, NavMgmt | Empty perfFeeParams abi.decode panic → executeUpdateNav reverts → permanent NAV deadlock | OPEN |
| V8-CF06 | MEDIUM | ClassAdjustment, NavMgmt, PerfFeeStandard | V8-CF01 deadlock freezes lastPerfMintAtNavT; benchmark goes stale; when unblocked, full perf fee charged for locked period without hurdle | **STILL PRESENT (V9)** — design trade-off; hurdle bias during recovery |
| V8-CF07 | MEDIUM | PerfFeeStandard, FeeMgmt, FundMgmtValidation | Asymmetric fee mint failure (V8-PFS-02 partial) → lastPerfMintAtNavT diverges → V8-FMV-05 equality check blocks all dealing conversions | **STILL PRESENT (V9)** — no skip mechanism; requires emergency measures |

## V9 New Findings (2026-03-03)

### V9 HIGH (1)

| ID | Title | Location | Description | Status |
|----|-------|----------|-------------|--------|
| V9-CF-01 | Fund-level blocking non-functional | BaseFacet.sol:110, all execute* functions | `_requireFundNotBlocked` exists but is NEVER called; fund block is dead code on-chain | **FIXED (2026-03-03)** — `_requireFundNotBlocked(fundId)` added to 30+ execute* functions across 9 facets |

### V9 MEDIUM (7)

| ID | Title | Location | Description | Status |
|----|-------|----------|-------------|--------|
| V9-A-C01 | Batch ERC1155 callback lacks inExternalCallback guard | FundTokensFacet.sol:502-529 | `_checkOnERC1155BatchReceived` missing guard; latent, not currently exploitable | **FIXED (2026-03-03)** — `s.inExternalCallback` set/cleared around batch callback |
| V9-CF-02 | Token operations bypass protocol block | FundTokensFacet.sol:194,231,299-380 | safeTransferFrom + _update lack whenNotBlocked; transfers during pause | **FIXED (2026-03-03)** — `whenNotBlocked` modifier added to safeTransferFrom + safeBatchTransferFrom |
| V9B-05 | Swap linking currency mismatch | OrderManagementFacet.sol:593,1298 + SettlementFacet.sol | Fund-currency value used for cross-currency dependent order amount | **FIXED (2026-03-03)** — 9 changes across OrderManagementFacet + SettlementFacet. Smart routing (`redeemCash == subscribeCash`) replaces umbrella-only check. Settlement uses class denomination via `_resolveOrderCashCurrency`. Swap linking uses `cashTokenId`/`cashAmount`. Same-fund swap orderId fix. 10-test matrix covers all combos. |
| V9-FMF-05 | Stale classPrice in batch perf fee | FeeManagementFacet.sol:838-868 | classPrice not recalculated after dilution updates in dealing loop | OPEN |
| V9-D01 | cancelPendingSubscribes batch fails atomically | FundLifecycleFacet.sol:638 | No try-catch; single cancel failure reverts entire batch | OPEN |
| V9-CF-03 | ProtocolSafetyConfig all-or-nothing update | NavManagementFacet.sol:151-172 | All 8 params required; accidental 0 disables safety check | OPEN |
| V9-TOB-03 | No rate limiting on safety config updates | NavManagementFacet.sol:151-172 | No timelock; rapid toggle attack window | OPEN |

### V9 LOW (13)

| ID | Title | Location | Status |
|----|-------|----------|--------|
| V9-A-M01 | Threshold not re-validated after operator removal | AccountFacet.sol:403-456 | **FIXED (2026-03-03)** — revert if threshold > remaining operators after removal |
| V9-A-M02 | Account address uses block.number | AccountFacet.sol:154-158 | OPEN |
| V9B-01 | Ignored getFXRate return (E-BC17 residual) | OrderManagementFacet.sol:513 | OPEN |
| V9B-02 | Redeem minimum holding underflow | OrderManagementFacet.sol:972 | OPEN |
| V9B-04 | No max length on dealing schedule timestamps | FundManagementFacet.sol:869 | OPEN |
| V9-FMF-01 | Reentrancy in mgmt fee mint (mitigated) | FeeManagementFacet.sol:204-206 | OPEN |
| V9-FMF-02 | Reentrancy in batch perf fee (mitigated) | FeeManagementFacet.sol:864-867 | OPEN |
| V9-FMF-04 | maxPerfFeeRateBps only for standard calculator | FeeManagementFacet.sol:289-306 | **FIXED (2026-03-03)** — universal cap for all calculator selectors via first ABI slot convention |
| V9-FMF-06 | No class existence in crystallisation | FeeManagementFacet.sol:431-482 | **FIXED (2026-03-03)** — `_requireClassExists(classId)` added to `_crystalliseSingleDealing` |
| V9-FMF-07 | No class existence in setCrystallisationPeriod | FeeManagementFacet.sol:730-739 | **FIXED (2026-03-03)** — `_requireClassExists(classId)` added to `executeSetCrystallisationPeriod` |
| V9-D07 | Swap-and-pop index invalidation | ClassAdjustmentFacet.sol:245-258 | OPEN |
| V9-E01 | Eligible classes includes fee class | ViewCalls2Facet.sol:75 | OPEN |
| V9-E07 | _calculateAvailableBalance underflow | ViewCallsFacet.sol:1346-1348 | OPEN |

### V9 INFORMATIONAL (10)

| ID | Title | Location | Status |
|----|-------|----------|--------|
| V9B-03 | SafetyConfig event omits 3 params | NavManagementFacet.sol:226 | **FIXED (2026-03-03)** — all 8 params now emitted in ProtocolSafetyConfigUpdated event |
| V9-PFS-01 | MAX_PRICE_STALENESS naming | PerfFeeStandardFacet.sol:24 | OPEN |
| V9-FMF-08 | Fee class totalSupply additive-only | FeeManagementFacet.sol:205,566,867 | OPEN |
| V9-D02 | Cumulative settlement amount | SettlementFacet.sol:177 | OPEN |
| V9-D03 | Asymmetric FX deviation formula | FXManagementFacet.sol:268-270 | OPEN |
| V9-D06 | Adjustment validation timing | ClassAdjustmentFacet.sol:61-73 | OPEN |
| V9-D08 | Missing FX safety config audit trail | FXManagementFacet.sol:197-203 | **FIXED (2026-03-03)** — `block.number` added to FXSafetyConfigUpdated event |
| V9-E02 | State-changing functions missing events | AdminViewCallsFacet.sol:357-424 | **FIXED (2026-03-03)** — CurrencyRegistered, CurrencyDeactivated, FxUpdaterChanged, LockAuthorizationChanged events added |
| V9-E03 | AdminViewCallsFacet naming mismatch | AdminViewCallsFacet.sol | OPEN |
| V9-E06 | Unbounded getSystemOverview loop | AdminViewCallsFacet.sol:69-73 | OPEN |
| V9-TOB-02 | Missing ERC165 Diamond registration | FundTokensFacet.sol:86-89 | OPEN |

### Findings Fixed Since V7

| Finding | Fixed In | Description |
|---------|---------|-------------|
| E-BC07 Fund/Class dilution | V8 | Direction confirmed correct in both facets |
| E-BC04 Dealing ID (main usage) | V8 | Main iteration loops fixed; residual in ViewCallsFacet (LOW) |
| E-BC10 Role scoping | V8 | ROLE_MANAGER per-fund correctly implemented |
| E-BC12 Storage layout | V8 | Append-only pattern followed |
| E-BC20 Double settlement (proposal path) | V8 | reentrancyLock blocks _executeProposal re-entry |
| E-BC21 CEI violation in settlement | V8 | cashPendingSwap decremented before token ops |
| E-BC23 Cross-rate FX (settlement) | V8 | FX settlement validation corrected |
| E-BC28 HWM + maxFee validation | V8 | HWM correctly maintained; fee cap partially enforced |
| E-BC29 NAV stale cascade | V8 | Correct ordering: store nav first, then process |

### V8 Addendum Fixes (2026-03-02 — all 20 fixes, 1488/1488 tests pass)

| Fix # | Finding | Description |
|-------|---------|-------------|
| Fix 1 | ARCH-01 / V8-A1-C01 | inExternalCallback guard in FundTokensFacet prevents re-entrant executeXxx during ERC1155 callbacks |
| Fix 2 | E-BC22 / V8-A1-C02 | Local dealingId variable in OrderManagementFacet; order.tokenId never mutated |
| Fix 3 | V8-P01 | BlockFacet: fund-level + protocol-level blocking; whenNotBlocked on all executeXxx |
| Fix 4 | V8-A1-H03 | cancelProposal: only owner or original proposer can cancel |
| Fix 5 | V8-PFS-02 | 128-byte minimum for perfFeeParams at SET time; prevents abi.decode panic |
| Fix 6 | V8-PFS-08 + V8-A1-H02 | maxPerfFeeRateBps in ProtocolSafetyConfig; checked at executeSetPerfFeeCalculator |
| Fix 7 | V8-PFS-07 / V8-CF04 | DealingNotInClass check in calculatePerformanceFees |
| Fix 8 | V8-A1-H02 | Cap at application time in executeBatchMintPerformanceFees + executeCalculateRedemptionPerfFees |
| Fix 9 | V8-A1-H01 | executeSetDealingSchedule: future, sorted, non-zero timestamp validation |
| Fix 10 | V8N-12 | validateNavUpdate: NavTimestampNotIncreasing check (forward-only) |
| Fix 11 | V8-FMV-05 | validateDealingConversion: skip lastPerfMintAtNavT check when perfFeeSelector == bytes4(0) |
| Fix 12 | V8-FMV-02 | validateOfframp: umbrella.exists check added |
| Fix 13 | V8A4-M01 / V8-CF01 | validateClassAdjustment: maxAdjustmentBps enforced at posting time |
| Fix 14 | V8-A1-M04 | setMultisigConfig: operatorThreshold must not exceed operator count |
| Fix 15 | V8-A5-07 | _settleRedeem: dependent order must be PENDING before modification |
| Fix 16 | V8-A5-02 | validateFxRateDeviation: uses proper cross-rate getFXRate(from, to) |
| Fix 17 | V8A4-H02 | _feeToEntry: SafeCast.toInt128 prevents silent overflow on fee.amount cast |
| Fix 18 | V8-PFS-03 / V8-CF04 | executeSetPerfFeeCalculator: hurdleFundId validated — createdAt != 0 + ACTIVE status (any umbrella allowed) |
| Fix 19 | V8-PFS-01 / E-BC31 | _applyRiskAdjustor: fail-closed — revert RiskAdjustorFailed on staticcall failure or adjusted > gain |
| Fix 20 | V8-PFS-06 | maxBenchmarkStaleness added to ProtocolSafetyConfig; _findPriceAtOrBefore reverts BenchmarkPriceMissing when stale/missing (fail-closed) |

## E-BC Catalog Reference

| Code | Title | Status |
|------|-------|--------|
| E-BC01 | via_ir Stack-Too-Deep | Guidance only |
| E-BC02 | String errors | Guidance only |
| E-BC03 | Magic numbers | Guidance only |
| E-BC04 | Dealing ID off-by-one | PARTIALLY FIXED (residual in views) |
| E-BC05 | Wrong order timing in tests | Guidance only |
| E-BC06 | Missing gemforge build | Guidance only |
| E-BC07 | Fund vs class dilution direction | FIXED |
| E-BC08 | Wrong classes() destructuring | Guidance only |
| E-BC09 | Cash token per-umbrella confusion | Guidance only |
| E-BC10 | Role-scoped access confusion | FIXED |
| E-BC11 | EIP-170 contract size limit | Guidance only |
| E-BC12 | Storage layout modification | FIXED |
| E-BC13 | Run forge test during audits | Guidance only |
| E-BC14 | Cross-facet interactions | Guidance only |
| E-BC15 | Force/admin bypass safety checks | BY DESIGN — document intentional skips |
| E-BC16 | Public functions without ACL in Diamond | PARTIALLY FIXED (some remain) |
| E-BC17 | FX rate deviation wrong quantities | PARTIALLY FIXED (settlement fixed; order processing still wrong) |
| E-BC18 | Safety config disabled-at-zero | STILL PRESENT (by design; recommendation: set non-zero defaults) |
| E-BC19 | Dual state tracking across facets | STILL PRESENT (E-BC25 is the active instance) |
| E-BC20 | ERC1155 callback reentrancy | PARTIALLY FIXED (single callback protected by Fix 1; batch callback gap = E-BC34/V9-A-C01) |
| E-BC21 | CEI violation in settlement | FIXED |
| E-BC22 | TokenId mutation on partial fill | FIXED (local dealingId variable, Fix 2) |
| E-BC23 | Cross-rate vs single-rate FX | PARTIALLY FIXED (settlement fixed; order processing still wrong) |
| E-BC24 | No Diamond-level reentrancy guard | STILL PRESENT |
| E-BC25 | Dual totalSupply divergence | BY DESIGN — dealing-level and class/fund-level track different things intentionally |
| E-BC26 | FX safety config default-zero bypass | STILL PRESENT |
| E-BC27 | Unvalidated schedule timestamps | FIXED (future+sorted+non-zero validation, Fix 9) |
| E-BC28 | Uncapped caller-supplied fee BPS | SUBSTANTIALLY FIXED (SET-time cap Fix 6 + apply-time cap Fix 8; both path types covered) |
| E-BC29 | NAV update stale data cascade | FIXED |
| E-BC30 | ERC1155 callback bypasses execute* ACL | PARTIALLY FIXED (= ARCH-01, single path fixed by Fix 1; batch path = E-BC34) |
| E-BC31 | Risk adjustor fail-open design | FIXED (NavManagementFacet: NOT PRESENT; PerfFeeStandardFacet: fail-closed via Fix 19) |
| E-BC32 | No emergency pause mechanism | PARTIALLY FIXED (protocol-level blocking works; fund-level = E-BC35; token transfers bypass = E-BC36) |
| E-BC34 | Batch ERC1155 callback missing guard | OPEN (V9-A-C01: latent, not currently exploitable) |
| E-BC35 | Dead code guard functions | OPEN (V9-CF-01: `_requireFundNotBlocked` never called) |
| E-BC36 | Incomplete emergency pause | OPEN (V9-CF-02: token operations bypass block) |
| E-BC37 | Safety config all-or-nothing update | OPEN (V9-CF-03: accidental 0 disables safety) |
