# Security Audit V9 — Final Report (2026-03-03)

**Auditor:** Claude Opus 4.6 (AI-assisted)
**Methodology:** 7-phase Trail of Bits methodology (automated + manual + cross-facet + maturity)
**Scope:** All 19 Diamond facets, shared libraries, BlockFacet (new), 20 V8 fixes
**Branch:** errorCorrectionEngine
**Test Baseline:** 1488/1488 forge tests passing, 0 failures, 0 skipped

---

## Executive Summary

**V9 is a post-fix verification + delta audit** following the V8 extended audit (86 findings) and 20 fixes applied on 2026-03-02.

| Metric | Value |
|--------|-------|
| V8 Fixes Verified | **18/20 correct** (Fix 1 partial, Fix 3 partial) |
| V8 Findings Resolved | 22 FIXED, 4 BY DESIGN, 3 FALSE POSITIVE |
| V8 Findings Still Present | 6 (V8-A1-M03, V8-T03, V8-6-01, V8-T04, V8-CF06, V8-CF07) |
| New V9 Findings | **31 total** (0C, 1H, 7M, 13L, 10I) |
| Code Maturity | **2.22/4.0** (Moderate, improved from 1.89/4.0) |
| Security Properties | 8 defined, 1 VIOLATED (SP-8: fund-level blocking) |

### Top 3 Improvements Since V8
1. ARCH-01 (CRITICAL) fixed — ERC1155 callback reentrancy blocked via `inExternalCallback` guard
2. Emergency pause mechanism deployed (BlockFacet with `whenNotBlocked` on all execute functions)
3. Performance fee safety hardened (fail-closed risk adjustor, caps at SET + APPLICATION time, configurable staleness)

### Top 3 Remaining Risks
1. **V9-CF-01 (HIGH):** Fund-level blocking is entirely non-functional on-chain — `_requireFundNotBlocked` exists but is never called
2. **V9-A-C01 (MEDIUM):** Batch ERC1155 callback lacks `inExternalCallback` guard — latent bypass of ARCH-01 fix
3. **V9-CF-02 (MEDIUM):** Token transfers and `_update` bypass protocol block — incomplete emergency pause

---

## Fix Verification Summary

### Fixes Verified CORRECT (18/20)

| Fix | Finding | Verdict |
|-----|---------|---------|
| Fix 1 | ARCH-01 / V8-A1-C01 | **PARTIALLY FIXED** — single callback protected, batch callback gap (V9-A-C01) |
| Fix 2 | V8-A1-C02 / E-BC22 | **FIXED** — local dealingId, tokenId never mutated |
| Fix 3 | V8-P01 | **PARTIALLY FIXED** — protocol block works, fund-level block non-functional (V9-CF-01) |
| Fix 4 | V8-A1-H03 | **FIXED** — only owner or proposer can cancel |
| Fix 5 | V8-PFS-02 | **FIXED** — 128-byte minimum params check at SET time |
| Fix 6 | V8-PFS-08 + V8-A1-H02 | **FIXED** — maxPerfFeeRateBps in ProtocolSafetyConfig |
| Fix 7 | V8-PFS-07 | **FIXED** — DealingNotInClass check |
| Fix 8 | V8-A1-H02 | **FIXED** — cap at APPLICATION time in both fee paths |
| Fix 9 | V8-A1-H01 | **FIXED** — future+sorted+non-zero timestamp validation |
| Fix 10 | V8N-12 | **FIXED** — NavTimestampNotIncreasing forward-only check |
| Fix 11 | V8-FMV-05 | **FIXED** — skip perfFeeSelector check when bytes4(0) |
| Fix 12 | V8-FMV-02 | **FIXED** — umbrella.exists check added |
| Fix 13 | V8A4-M01 / V8-CF01 | **FIXED** — maxAdjustmentBps at posting time |
| Fix 14 | V8-A1-M04 | **FIXED** — threshold vs operator count validation |
| Fix 15 | V8-A5-07 | **FIXED** — dependent order PENDING status check |
| Fix 16 | V8-A5-02 | **FIXED** — cross-rate getFXRate(from, to) |
| Fix 17 | V8A4-H02 | **FIXED** — SafeCast.toInt128 |
| Fix 18 | V8-PFS-03 | **FIXED** — hurdleFundId existence + ACTIVE check |
| Fix 19 | V8-PFS-01 | **FIXED** — fail-closed RiskAdjustorFailed |
| Fix 20 | V8-PFS-06 | **FIXED** — configurable maxBenchmarkStaleness |

### Prior Findings Re-Assessed

| Finding | V8 Status | V9 Status | Rationale |
|---------|-----------|-----------|-----------|
| V8-A1-M01 | OPEN | **FALSE POSITIVE** | All functions guarded: onlyInternalExecution or _validateAndPropose |
| V8-A1-M03 | OPEN | **STILL PRESENT** | Threshold re-computed at confirmation time from CURRENT config |
| V8-T01 | BY DESIGN | **BY DESIGN confirmed** | Dual totalSupply tracks different things intentionally |
| V8-T03 | OPEN | **STILL PRESENT (LOW)** | FundTokens[0].owner = deployer EOA, no setter |
| V8-T04 | BY DESIGN | **STILL PRESENT (MEDIUM)** | Cash token baseInfo.totalSupply never updated; views return 0 |
| V8N-01 | OPEN | **BY DESIGN** | Management fees use OLD NAV — correct for period accrual |
| V8N-02 | OPEN | **FIXED** | Future timestamp guard present |
| V8N-03 | OPEN | **ADDRESSED** | Empty arrays with lastBatch=true advance state |
| V8A4-M02 | OPEN | **ACCEPTED (LOW)** | Non-sequential transitions intentional; admin role required |
| V8A4-M04 | OPEN | **LOW** | Bounded by admin-controlled arrays, view context only |
| V8A4-M05 | OPEN | **LOW** | Remaining missing validation operationally benign |
| V8-6-01 | OPEN | **CONFIRMED BUG (MEDIUM)** | Off-by-one on both class AND dealing loops; single-class funds report 0 investors |
| V8-6-04 | OPEN | **LOW** | FX fallback only affects legacy classes |
| V8-CF03 | HIGH | **INFORMATIONAL** | Price calculation uses dilution ratios, not supply directly |
| V8-CF05 | HIGH | **FIXED (via Fix 5)** | SET-time params validation prevents abi.decode panic |
| V8-CF06 | MEDIUM | **STILL PRESENT** | lastPerfMintAtNavT stale during drawdowns; hurdle bias |
| V8-CF07 | MEDIUM | **STILL PRESENT** | Single dealing crystallisation failure blocks fund |

---

## New V9 Findings

### HIGH (1)

#### V9-CF-01: Fund-Level Blocking Entirely Non-Functional On-Chain

**Severity:** HIGH
**Category:** Access Control / Emergency Mechanism
**Location:** `BaseFacet.sol:110-112`, `BlockFacet.sol:57-71,100-108`, all execute* functions
**Compound of:** V9-A-H01, V9-D04, V9-D05

**Description:**
The fund-level blocking mechanism has three components:
1. `BlockFacet.executeSetFundBlock()` writes `s.FundAdmin[0].fundBlocked[fundId] = true` — WORKS
2. `BaseFacet._requireFundNotBlocked(fundId)` reads the flag and reverts — EXISTS
3. **No execute* function calls `_requireFundNotBlocked`** — NEVER USED

The helper function exists but is dead code for on-chain enforcement. Confirmed by three independent audit agents (A, D, E) across different facets.

**Impact:**
During incident response, admin blocks a fund thinking operations are halted. In reality:
- NAV updates continue (NavManagementFacet)
- Orders can be submitted and processed (OrderManagementFacet)
- Fees continue minting (FeeManagementFacet)
- Settlement proceeds (SettlementFacet)
- Forced redemptions execute (FundLifecycleFacet)
- Only off-chain API enforcement blocks operations

**Recommendation:**
Add `_requireFundNotBlocked(fundId)` to all fund-scoped execute* functions. Priority targets: `executeUpdateNav`, `executeProcessOrders`, `executeConfirmCashFundSettlement`, `executeForceSubmitRedemptionOrder`, `executeCancelPendingSubscribes`.

**Status:** OPEN

---

### MEDIUM (7)

#### V9-A-C01: Batch ERC1155 Callback Lacks inExternalCallback Guard

**Severity:** MEDIUM (downgraded from CRITICAL — not currently exploitable)
**Category:** Reentrancy
**Location:** `FundTokensFacet.sol:502-529`

**Description:**
`_checkOnERC1155BatchReceived` does NOT set `s.inExternalCallback = true` before the external callback to `onERC1155BatchReceived`. The single-item counterpart `_checkOnERC1155Received` (line 481) correctly sets this guard. No internal execution path currently triggers batch callbacks (all mints use singleton arrays), so this is latent risk.

**Impact:** Future code adding batch mints during execute* flow would bypass ARCH-01 guard.

**Recommendation:** Add `s.inExternalCallback = true/false` wrapping to `_checkOnERC1155BatchReceived`.

**Status:** OPEN

---

#### V9-CF-02: Token Operations Bypass Protocol Block

**Severity:** MEDIUM
**Category:** Emergency Mechanism / Standards Conformance
**Location:** `FundTokensFacet.sol:194,231,299-380`
**Merges:** V9-A-M03, V9-TOB-01

**Description:**
Two gaps in the emergency pause:
1. `safeTransferFrom` and `safeBatchTransferFrom` lack `whenNotBlocked` — tokens move during protocol block
2. `_update()` function has no pause check — unlike OZ's `ERC1155Pausable._update()` pattern

**Impact:** Incomplete emergency pause. Token transfers continue during protocol-level block.

**Recommendation:** Add `if (s.FundAdmin[0].protocolBlocked) revert ProtocolBlocked();` inside `_update()`.

**Status:** OPEN

---

#### V9B-05: Swap Linking Currency Mismatch

**Severity:** MEDIUM
**Category:** Logic Error
**Location:** `OrderManagementFacet.sol:593,1298`

**Description:**
`_handleSwapLinking` uses `result.value` (fund reporting currency) for the dependent subscribe order's amount increase. For cross-currency intra-umbrella swaps, this adds fund-currency value to a class-denomination-currency amount without FX conversion.

**Impact:** Subscribe order fill detection incorrect for cross-currency swaps — may never be marked FILLED or marked prematurely.

**Recommendation:** Convert `result.value` to subscribe class denomination currency using FX rate.

**Status:** OPEN

---

#### V9-FMF-05: Stale classPrice in Batch Performance Fee Processing

**Severity:** MEDIUM
**Category:** Arithmetic
**Location:** `FeeManagementFacet.sol:838-868`

**Description:**
`classPrice` computed once before the dealing loop. Each dealing's dilution ratio update changes the effective class price, but subsequent dealings still use the original `classPrice`. Error compounds across dealings in the same batch.

**Impact:** Slightly incorrect class token burn and fee token mint amounts. Magnitude depends on number of dealings and fee sizes relative to NAV.

**Recommendation:** Recalculate `classPrice` after each dealing's dilution update, or document as accepted approximation.

**Status:** OPEN

---

#### V9-D01: cancelPendingSubscribes Batch Fails Atomically

**Severity:** MEDIUM
**Category:** Logic Error
**Location:** `FundLifecycleFacet.sol:638`

**Description:**
`_cancelPendingSubscribesInternal` calls `executeCancelOrder` without try-catch. If any single order cannot be cancelled (e.g., dealing in PROCESSING state), the entire batch reverts.

**Impact:** All orders remain uncancelled if one fails.

**Recommendation:** Wrap in try-catch for individual failure handling.

**Status:** OPEN

---

#### V9-CF-03: ProtocolSafetyConfig All-or-Nothing Update

**Severity:** MEDIUM
**Category:** Access Control
**Location:** `NavManagementFacet.sol:151-172`

**Description:**
`setProtocolSafetyConfig` requires all 8 parameters. Updating one parameter requires re-passing all others. Accidentally setting any to 0 disables that safety check (E-BC18 pattern).

**Impact:** Admin updating one safety parameter could accidentally disable another (e.g., `maxPerfFeeRateBps=0` → uncapped performance fees).

**Recommendation:** Add per-field update functions, or require non-zero for safety-critical parameters.

**Status:** OPEN

---

#### V9-TOB-03: No Rate Limiting on Safety Config Updates

**Severity:** MEDIUM
**Category:** Access Control
**Location:** `NavManagementFacet.sol:151-172`

**Description:**
Safety configuration can be updated unlimited times with no timelock or rate limit. A compromised admin can rapidly toggle safety parameters within the multisig threshold.

**Impact:** Compressed attack window — disable and re-enable safety in rapid succession.

**Recommendation:** Add timelock for safety-critical parameter changes, or ensure off-chain monitoring alerts on rapid changes.

**Status:** OPEN

---

### LOW (13)

| ID | Location | Description |
|----|----------|-------------|
| V9-A-M01 | AccountFacet.sol:403-456 | Threshold not re-validated after operator removal |
| V9-A-M02 | AccountFacet.sol:154-158 | Account address uses block.number (non-deterministic) |
| V9B-01 | OrderManagementFacet.sol:513 | Ignored getFXRate return (E-BC17 residual, intentional guard) |
| V9B-02 | OrderManagementFacet.sol:972 | Redeem minimum holding subtraction underflow → unhelpful revert |
| V9B-04 | FundManagementFacet.sol:869 | No max length on dealing schedule timestamps array |
| V9-FMF-01 | FeeManagementFacet.sol:204-206 | Reentrancy in mgmt fee mint (ARCH-01 mitigated) |
| V9-FMF-02 | FeeManagementFacet.sol:864-867 | Reentrancy in batch perf fee (ARCH-01 mitigated) |
| V9-FMF-04 | FeeManagementFacet.sol:289-306 | maxPerfFeeRateBps only enforced for standard calculator selector |
| V9-FMF-06 | FeeManagementFacet.sol:431-482 | No class existence check in crystalliseSingleDealing |
| V9-FMF-07 | FeeManagementFacet.sol:730-739 | No class existence check in executeSetCrystallisationPeriod |
| V9-D07 | ClassAdjustmentFacet.sol:245-258 | Swap-and-pop index invalidation in multisig |
| V9-E01 | ViewCalls2Facet.sol:75 | Eligible classes includes fee class (classNum=1) |
| V9-E07 | ViewCallsFacet.sol:1346-1348 | _calculateAvailableBalance underflow on state inconsistency |

### INFORMATIONAL (10)

| ID | Location | Description |
|----|----------|-------------|
| V9B-03 | NavManagementFacet.sol:226 | ProtocolSafetyConfig event omits 3/8 params |
| V9-PFS-01 | PerfFeeStandardFacet.sol:24 | MAX_PRICE_STALENESS naming inconsistency |
| V9-FMF-08 | FeeManagementFacet.sol:205,566,867 | Fee class totalSupply additive-only |
| V9-D02 | SettlementFacet.sol:177 | Cumulative settlement amount (safe due to checked arithmetic) |
| V9-D03 | FXManagementFacet.sol:268-270 | Asymmetric deviation formula (industry standard) |
| V9-D06 | ClassAdjustmentFacet.sol:61-73 | Price-dependent adjustment validation timing |
| V9-D08 | FXManagementFacet.sol:197-203 | Missing change block tracking for FX safety config |
| V9-E02 | AdminViewCallsFacet.sol:357-424 | State-changing functions missing events |
| V9-E03 | AdminViewCallsFacet.sol | Naming mismatch: "ViewCalls" facet has state-changing functions |
| V9-E06 | AdminViewCallsFacet.sol:69-73 | Unbounded account loop (mitigated by paginated variant) |
| V9-TOB-02 | FundTokensFacet.sol:86-89 | Missing ERC165 Diamond interface registration |

---

## Still Present V8 Findings

| ID | Severity | Description | V9 Assessment |
|----|----------|-------------|---------------|
| V8-A1-M03 | MEDIUM | Multisig threshold retroactive lowering | Owner must actively change config; primarily misconfiguration risk |
| V8-6-01 | MEDIUM | _hasAnyDealingBalance off-by-one | **Confirmed bug** — single-class funds report 0 investors |
| V8-T04 | MEDIUM | Cash token baseInfo.totalSupply never updated | Views return 0 for cash tokens; E-BC25 manifestation |
| V8-CF06 | MEDIUM | lastPerfMintAtNavT stale during drawdowns | Design trade-off; hurdle bias during recovery |
| V8-CF07 | MEDIUM | Single dealing crystallisation failure blocks fund | No skip mechanism; emergency measures required |
| V8-T03 | LOW | FundTokens[0].owner = deployer EOA | No setter; deployer key compromise risk |

---

## Slither Analysis (Phase 1)

**Total: 49 findings (4 High, 45 Medium)**

| Detector | Count | Assessment |
|----------|-------|------------|
| uninitialized-state (HIGH) | 4 | ALL FALSE POSITIVE — Diamond proxy AppStorageRoot.s |
| reentrancy-no-eth | 15 | Mitigated by Fix 1 (inExternalCallback); CEI patterns remain |
| uninitialized-local | 13 | ALL FALSE POSITIVE — Solidity default init to 0 |
| incorrect-equality | 10 | Mostly FALSE POSITIVE — null/unset checks |
| unused-return | 5 | 2 genuine (V9B-01, V9-D01), 3 false positive |
| divide-before-multiply | 2 | LOW risk — sequential penalty application in fee calc |

---

## Security Properties (Trail of Bits Methodology)

| ID | Property | Status |
|----|----------|--------|
| SP-1 | Token Supply Consistency | HOLDS |
| SP-2 | Locked Balance Invariant | HOLDS |
| SP-3 | Fund Isolation | HOLDS |
| SP-4 | Proposal System Integrity | HOLDS (batch callback gap latent) |
| SP-5 | NAV Monotonic Timestamps | HOLDS |
| SP-6 | Fee Cap Enforcement | HOLDS |
| SP-7 | Dealing State Machine Validity | HOLDS |
| SP-8 | Block Enforcement | **VIOLATED** — `_requireFundNotBlocked` never called |

---

## Code Maturity Scorecard

| # | Category | Rating | Score |
|---|----------|--------|-------|
| 1 | Arithmetic | Moderate | 2/4 |
| 2 | Auditing/Logging | Moderate | 2/4 |
| 3 | Auth/Access Control | Satisfactory | 3/4 |
| 4 | Complexity | Moderate | 2/4 |
| 5 | Decentralization | Weak | 1/4 |
| 6 | Documentation | Moderate | 2/4 |
| 7 | Transaction Ordering | Satisfactory | 3/4 |
| 8 | Low-Level Code | Moderate | 2/4 |
| 9 | Testing | Satisfactory | 3/4 |

**Overall: 2.22/4.0 (Moderate)** — improved from V8's 1.89/4.0

---

## Recommended Fix Priority

### Immediate (before next deployment)
1. **V9-CF-01** — Add `_requireFundNotBlocked(fundId)` to all fund-scoped execute* functions
2. **V9-A-C01** — Add `inExternalCallback` guard to `_checkOnERC1155BatchReceived`
3. **V8-6-01** — Fix `<` to `<=` in `_hasAnyDealingBalance` class and dealing loops

### Short-term (1-2 weeks)
4. **V9-CF-02** — Add pause check inside `_update()`
5. **V9B-05** — Fix swap linking currency conversion for cross-currency orders
6. **V9-FMF-05** — Recalculate classPrice per dealing in batch processing
7. **V9-D01** — Add try-catch to cancelPendingSubscribes batch

### Medium-term (1 month)
8. **V9-CF-03** — Per-field safety config update functions
9. **V9-TOB-03** — Timelock on safety parameter changes
10. **V8-T03** — Add `setOwner` function or transfer to Diamond address
11. **V8-T04** — Sync cash token baseInfo.totalSupply in onramp/offramp

---

## Audit History

| Version | Date | Total | CRIT | HIGH | MEDIUM | LOW | INFO | Maturity |
|---------|------|-------|------|------|--------|-----|------|----------|
| **V9** | **2026-03-03** | **31 new** | **0** | **1** | **7** | **13** | **10** | **2.22/4.0** |
| V8 (ext.) | 2026-03-02 | 86 | 2 | 12 | 27 | 34 | 11 | 1.89/4.0 |
| V7 | 2026-02-12 | 82 | 5 | 16 | 24 | 22 | 15 | 2.3/4.0 |
| V6 | 2026-02-10 | 83 | 7 | 19 | 26 | 18 | 13 | 2.4/4.0 |
| V5 | 2026-02-09 | 87 | 15 | 22 | 24 | 17 | 9 | 2.0/4.0 |

---

## Phase Reports

| Phase | File | Summary |
|-------|------|---------|
| 1 | `2026-03-03-audit-v9-phase1-automated.md` | Slither 49 findings + 1488/1488 tests pass |
| 2 | `2026-03-03-audit-v9-phase2-architecture.md` | Fix interaction map, trust boundaries |
| 3 | `2026-03-03-audit-v9-phase3-progress.md` | Per-facet running totals (agents A-C) |
| 3a | `2026-03-03-audit-v9-agent-a-tokens.md` | FundTokensFacet, AccountFacet, BlockFacet |
| 3b | `2026-03-03-audit-v9-agent-b-orders.md` | OrderManagementFacet, NavManagementFacet |
| 3c | `2026-03-03-audit-v9-agent-c-fees.md` | FeeManagementFacet, PerfFeeStandardFacet |
| 3d | `2026-03-03-audit-v9-agent-d-management.md` | FundManagementFacet, FundLifecycleFacet, Settlement, FX |
| 3e | `2026-03-03-audit-v9-agent-e-views.md` | ViewCallsFacet, AdminViewCallsFacet, EligibilityFacet |
| 4 | `2026-03-03-audit-v9-phase4-cross-facet.md` | 7 attack chains, 3 new compound findings |
| 5 | `2026-03-03-audit-v9-phase5-tob.md` | Security properties, Echidna, maturity 2.22/4.0 |
