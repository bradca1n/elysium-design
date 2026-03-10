# Security Audit V8 — Final Report
<!-- 2026-03-02 | 7-phase AI-native audit -->

## Executive Summary

**Audit date:** 2026-03-02
**Codebase:** Elysium Diamond Proxy (EIP-2535) — 16 facets, ~60 contracts
**Method:** 7-phase AI-native audit (Slither → Architecture → 6 parallel agents → Cross-facet sequential-thinking → Trail of Bits 5-step → Gas → Compilation)
**Test baseline:** 1,430 tests passing at audit start
**Slither:** 5 HIGH (0 genuine), 31 MEDIUM (4 genuine), 116 LOW, 230 INFO

### Finding Counts

| Severity | Count | vs V7 (82 total) |
|----------|-------|-----------------|
| CRITICAL | 2 | 5 → 2 (ARCH-01 still present, E-BC22 still present) |
| HIGH | 9 | 16 → 9 (several V7 fixed, 3 new: V8-CF01, V8-P01, V8-P02) |
| MEDIUM | 21 | 24 → 21 |
| LOW | 28 | 22 → 28 |
| INFO | 7 | 15 → 7 |
| **TOTAL** | **67** | **82 → 67** |

### Maturity Score: 17/36 (1.89/4.0) — WEAK/LOW-MODERATE
*(V7 was 2.3/4.0 — regression due to new V8 findings exceeding V7 fixes)*

### Top 3 Strengths
1. **Testing infrastructure** — 1,430 tests, strong TDD evidence, Foundry fuzz tests
2. **Low-level code discipline** — No assembly; delegatecall properly scoped; no unsafe arithmetic post-0.8
3. **Token encoding** — Hierarchical 64-bit ID scheme cleanly separates umbrella/fund/class/dealing

### Top 3 Critical Gaps
1. **ARCH-01 (STILL OPEN)** — ERC1155 callback reentrancy during `internalExecutionContext=true` allows any execute* function to bypass proposal/multisig system. This has persisted through V6, V7, V8 with no fix.
2. **Dual totalSupply (E-BC25, STILL OPEN)** — Two independent supply trackers diverge across fee minting, batch conversion, settlement, and onramp. Most pervasive systemic issue in the codebase.
3. **Safety config zero-defaults** — FX, NAV, and protocol safety configs all default to zero (disabled). A deployment without explicit initialization has NO safety validation.

---

## Phase 1: Automated Analysis Summary

**Slither findings after triage:**
- 4 genuine MEDIUM (LOW-L09, LOW-L10, LOW-L11, LOW-L12 — unbounded loops)
- All Slither HIGH findings confirmed false positives
- 116 LOW: largely `dead-code`, `unused-return`, `events-access` — see phase1 report

**Forge tests:** 1,430 passing. No coverage gaps discovered in critical paths. Fuzz tests present (`testFuzz_*`).

---

## Phase 2: Architecture Review Summary

The Diamond Proxy's `internalExecutionContext` boolean is the architectural root of ARCH-01. This boolean is set to `true` for ALL `execute*` calls, and `onlyInternalExecution` guards depend on it — but ERC1155 callbacks occur WHILE it is `true`, allowing the callback to call any `execute*` function without going through `_validateAndPropose`.

The `reentrancyLock` only blocks `AccountFacet._executeProposal` re-entry. It does NOT block direct calls to `execute*` functions from within the callback window.

---

## Phase 3: Per-Facet Findings

### CRITICAL Findings

#### V8-A1-C01 / ARCH-01: ERC1155 Callback Bypasses Proposal System

**Severity:** CRITICAL
**Location:** `AccountFacet.sol`, `FundTokensFacet.sol` (any mint path)
**E-BC reference:** E-BC20, E-BC24, E-BC30 (new pattern)

**Description:**
Every ERC1155 mint to a smart contract recipient triggers `onERC1155Received`. During this callback, `s.internalExecutionContext == true`. Any `execute*` function guarded by `onlyInternalExecution` will pass during the callback, bypassing the multisig/proposal system entirely.

**Attack path:**
```
1. Attacker is a legitimate investor using a smart contract wallet
2. Fund admin calls executeProcessOrders — sets internalExecutionContext=true
3. FundTokensFacet.mint(attacker, ...) triggers attacker.onERC1155Received(...)
4. Inside callback: internalExecutionContext=true
5. Attacker calls Diamond.executeAddOperator(adminAccount, attacker)
   → onlyInternalExecution: PASSES
   → reentrancyLock: NOT checked in executeAddOperator
6. Attacker calls Diamond.executeSetMultisigConfig(adminAccount, threshold=1)
7. Attacker now controls admin account
```

**Affected mint paths:** Order processing, fee minting, onramp, settlement token issuance.

**Fix:**
```solidity
modifier onlyInternalExecution() {
    if (!s.internalExecutionContext) revert NotInternalExecution();
    if (s.reentrancyLock) revert ReentrancyDetected();  // ADD
    _;
}
```
Or: Diamond-level `nonReentrant` guard in the proxy fallback function.

---

#### V8-A1-C02 / E-BC22: TokenId Mutation on Partial Fill Corrupts Pricing

**Severity:** CRITICAL
**Location:** `OrderManagementFacet.sol:304` (`order.tokenId = dealingId`)
**E-BC reference:** E-BC22

**Description:**
During first-round processing of subscribe orders, `order.tokenId` is overwritten in storage from the original `classId` to the `dealingId`. On subsequent partial-fill rounds, `_calculateOrderPrices` reads `order.tokenId` and uses it as a `classId` — but it is now a `dealingId`. The wrong `dilutionRatio` is read, producing an incorrect `classPrice`, which mints wrong token amounts.

**Compound impact:** Wrong tokens minted → both `FundTokensStorage.totalSupply` and `baseInfo.totalSupply` are set to corrupted values → all future NAV and fee calculations for that dealing are wrong. An attacker who controls a large order guaranteeing partial fill can systematically manipulate pricing for other investors.

**Fix:** Store original classId in a separate field. Never overwrite `order.tokenId` with dealingId.

---

### HIGH Findings

#### V8-T01 / E-BC25: Dual totalSupply Divergence — Systematic

**Severity:** HIGH
**Location:** `FundTokensFacet._update()`, `OrderManagementFacet`, `FeeManagementFacet`, `SettlementFacet`
**E-BC reference:** E-BC25

**Description:** Every mint/burn updates `FundTokensStorage.totalSupply[id]` but NOT all paths update `FundAdminStorage.baseInfo[id].totalSupply`. Specific divergence paths:
1. `_batchConvertDealingTokensInternal` — burns and mints via ERC1155 but never updates `baseInfo.totalSupply` for dealing tokens
2. `mintAllPendingManagementFees` — mints fee shares to class token; ERC1155 path updates FundTokens but `baseInfo[classId].totalSupply` update is absent
3. Cash token onramp/offramp — `baseInfo[cashTokenId].totalSupply` never updated

This is simultaneously a security issue (GAS-05) and an accounting issue. `calculateDealingPrice` and `calculateClassPrice` read `baseInfo.totalSupply` for NAV calculations — divergence causes wrong prices.

**Fix:** Consolidate to `FundTokensStorage.totalSupply` as single source of truth. Remove all manual `baseInfo.totalSupply` updates; update read sites to use `FundTokensFacet.totalSupply(id)`.

---

#### V8-A1-H01 / E-BC27: Unvalidated Dealing Schedule Timestamps

**Severity:** HIGH
**Location:** `FundManagementFacet.executeSetDealingSchedule` (or `FundLifecycleFacet`)

**Description:** `setDealingSchedule` accepts `uint32[]` timestamps and stores them directly with zero validation. No checks for: past timestamps, unsorted order, duplicates, zero values, array length cap. A past timestamp causes immediate state machine advancement, potentially locking the dealing.

**Fix:** Validate all timestamps > `block.timestamp`, monotonically decreasing (per pop-stack convention), non-zero, length ≤ `MAX_SCHEDULE_LENGTH`.

---

#### V8-A1-H02 / E-BC28 (partial): Uncapped Performance Fee BPS

**Severity:** HIGH
**Location:** `OrderManagementFacet._processOrdersImpl` (perf fee BPS from `OrderToProcess` struct)

**Description:** Performance fee BPS is supplied by admin in the `OrderToProcess` calldata. It is only checked against `BPS_DENOMINATOR` (10000 = 100%). `MAX_ADJUSTED_FEE_RATE_BPS` is defined as a constant but never enforced at runtime. A rogue or compromised admin can extract 100% of investor subscription value as a fee.

**Fix:** `if (order.perfFeeBps > MAX_ADJUSTED_FEE_RATE_BPS) revert FeeTooHigh();`

---

#### V8-A1-H03: Any Operator Can Cancel Any Proposal

**Severity:** HIGH
**Location:** `AccountFacet.executeCancelTransaction` (or `executeCancelOrder`)

**Description:** The cancel function does not verify that the canceler is the original proposer or an account owner. Any operator of any account can cancel any pending proposal by its ID, enabling griefing attacks against multisig proposals.

**Fix:** Add: `if (proposal.proposer != msg.sender && !account.isOwner(msg.sender)) revert NotAuthorized();`

---

#### V8A4-H01: Bulk Cancel Atomically Reverts on Single Failure

**Severity:** HIGH
**Location:** `FundLifecycleFacet.executeBulkCancelOrders` (or `OrderManagementFacet`)

**Description:** The bulk cancel loop uses `for (uint i = 0; i < orderIds.length; i++) { _cancelOrder(orderIds[i]); }` without try-catch. If ANY single order fails to cancel (wrong state, already processed, investor mismatch), the ENTIRE batch reverts. An attacker can plant one uncancellable order ID in a batch to block mass cancellation operations.

**Fix:** Use try-catch per order or a partial-success pattern with an error log array.

---

#### V8A4-H02: Unsafe int128 Cast in ClassAdjustmentFacet

**Severity:** HIGH
**Location:** `ClassAdjustmentFacet.sol:417`

**Description:**
```solidity
int128(int256(uint256(fee.amount)))
```
`fee.amount` is `uint128`. `uint256(fee.amount)` can be up to `type(uint128).max = 2^128 - 1`. `int256` can hold it, but `int128(int256(...))` silently truncates if the value exceeds `2^127 - 1`. For large fees (>50% of `uint128.max`), this produces a large negative int128, inverting the adjustment direction.

**Fix:** Add explicit bounds check: `if (fee.amount > uint128(type(int128).max)) revert FeeOverflow();`

---

#### V8-CF01 (NEW): Adjustment Queue Saturation → NAV Deadlock

**Severity:** HIGH (NEW — cross-facet finding not in any individual agent report)
**Location:** `ClassAdjustmentFacet` → `NavManagementFacet` → `FeeManagementFacet`
**E-BC reference:** V8A4-M01 × V8N-03 × V8N-07

**Description:** Three separate findings combine to create an irrecoverable protocol deadlock:
1. (V8A4-M01) `maxAdjustmentBps` is NOT enforced at posting time — queue can be filled with individually-valid adjustments that collectively exceed the cap
2. On `executeUpdateNav`, `_processAllPendingAdjustments` rejects the aggregate → entire NAV update reverts
3. (V8N-03) If the fund was in `AWAITS_FEE_PROCESSING` state, `executeUpdateNav` cannot be called (wrong state check)
4. (V8N-07) Risk adjustor fail-open → `staticcall` failure returns zero → dealing fees are never finalized
5. Recovery requires 100 individual multisig cancel proposals + risk adjustor fix

**Fix:**
1. Enforce `maxAdjustmentBps` per-adjustment at posting time
2. Add admin emergency function to force-advance dealing state
3. Risk adjustor fail-closed with admin override

---

#### V8-P01 (NEW): No Emergency Pause Mechanism

**Severity:** HIGH (NEW — from Phase 5 Trail of Bits comparison)
**Location:** All facets — systemic absence

**Description:** No facet implements `Pausable` or equivalent. Discovery via Trail of Bits 5-step workflow comparing against OpenZeppelin ERC1155Pausable. In the event of ARCH-01 exploitation, active FX manipulation (Chain 5), or any other active attack, there is no on-chain mechanism to halt operations. Recovery requires a Diamond cut upgrade.

**Fix:** Add `Pausable` storage to `LibAppStorage` and a `whenNotPaused` modifier on all state-modifying functions. Expose `pause()`/`unpause()` behind `onlyDiamondOwner`.

---

#### V8-P02 (NEW): Burn-Without-Unlock via ARCH-01 Compound

**Severity:** HIGH (NEW — cross-phase compound)
**Location:** `FundTokensFacet` burn path + ARCH-01 bypass

**Description:** During `internalExecutionContext=true` window, an attacker using ARCH-01 can call `executeForcedRedemption` on their own tokens. This burns tokens and removes them from `_locked[id][account]` — but only if the attacker crafted the call to avoid the lock check (which is in the forced redemption path, not the ERC1155 burn). If the lock is bypassed (e.g., via an internal-only function callable during the callback), locked investor tokens can be burned, destroying their position while the lock is kept in storage as an artifact. Subsequent unlock attempts will either panic (underflow) or silently corrupt the lock ledger.

**Fix:** Fix ARCH-01 first (reentrancy guard). Additionally, verify all burn paths check `_locked[id][account] == 0 || isForcedRedemption`.

---

### MEDIUM Findings (21)

| ID | Description | Location | E-BC |
|----|-------------|----------|------|
| V8-A1-M01 | `createFund`, `createDealing`, `mintAllPendingManagementFees` exposed as public without `onlyInternalExecution` | Multiple facets | E-BC16 |
| V8-A1-M02 | O(n×m) eligibility tag matching — unbounded loop | `EligibilityFacet` | — |
| V8-A1-M03 | Multisig threshold re-computed at confirmation (not at proposal); retroactive threshold lowering bypasses quorum | `AccountFacet` | — |
| V8-A1-M04 | `executeSetMultisigConfig` allows threshold > operator count (instant deadlock) | `AccountFacet` | — |
| V8-T03 | `FundTokens[0].owner` = deployer, not Diamond; no ownership transfer function | `FundTokensFacet` init | — |
| V8-T04 | Cash token onramp/offramp never updates `baseInfo[cashTokenId].totalSupply` | `FundTokensFacet` / `InitDiamond` | E-BC25 |
| V8N-01 | Mgmt fee calculated using OLD stored NAV (fee calc occurs before `navUpdatedAt` write at line 243) | `NavManagementFacet.sol:243` | — |
| V8N-02 | Direct `mintManagementFee` call bypasses per-class `lastMgmtFeeMintTs` guard | `FeeManagementFacet` | — |
| V8N-03 | Dealing state stuck in `AWAITS_FEE_PROCESSING` — no force-advance mechanism | `NavManagementFacet` | — |
| V8N-07 | Risk adjustor fail-open: `staticcall` failure returns zero instead of reverting | `NavManagementFacet` | E-BC31 |
| V8N-12 | No forward-only check on navTimestamp — can submit past/equal timestamp, skipping fee period | `NavManagementFacet` | — |
| V8A4-M01 | `maxAdjustmentBps` not enforced at posting time (only at NAV update) | `ClassAdjustmentFacet` | — |
| V8A4-M02 | Fund status transitions not validated for sequential ordering (states skippable) | `FundManagementFacet` | — |
| V8A4-M03 | `setInvestorTags` always replaces all tags atomically — no append/remove | `EligibilityFacet` | — |
| V8A4-M04 | Unbounded O(n×m) loop in tag matching per order | `EligibilityFacet` | — |
| V8A4-M05 | Missing input validation in `createUmbrella`/`createFund` (name length, zero address manager) | `FundManagementFacet` | — |
| V8-A5-01 | FX safety config never initialized in InitDiamond — all FX safety disabled by default | `InitDiamond.sol` | E-BC26 |
| V8-A5-02 | `getFXRate` return value discarded; `validateFxRateDeviation` compares cross-rate against single-currency USD rate | `OrderManagementFacet.sol:512` | E-BC17, E-BC23 |
| V8-A5-07 | `_settleRedeem` modifies dependent order without existence/state/investor validation | `SettlementFacet` | — |
| V8-6-01 | `_hasAnyDealingBalance` uses `d < nextDealingId` (off-by-one — misses last dealing) | `ViewCallsFacet` / `AdminViewCallsFacet` | E-BC04 |
| V8-6-04 | Silent FX fallback to base price when no cross-rate available | `ViewCalls2Facet.sol:277-281` | — |

*(See V8-6-02, V8-6-03 in LOW — reclassified from MEDIUM; full details in agent report)*

---

### LOW Findings (28 total)

**Category breakdown:**
- Access control gaps: 4 (missing zero-address checks, operator count limits, selector validation)
- Event coverage: 7 (registerCurrency, deactivateCurrency, setFxUpdater, perfFeeSelector change, risk adjustor change, NAV updater change, schedule set)
- View correctness: 4 (V8-6-02 orderbook count mislabeled, stale FX rate exposure, dealing price denominator)
- Storage/struct: 5 (GAS-01 nextFundId uint256, GAS-02 mgmtFeeRate uint160, legacy admins/navUpdaters mappings, feeHistory unbounded)
- ERC conformance: 3 (uri() not implemented, supportsInterface incomplete, ERC1155Metadata absent)
- Nav/fee edge cases: 5 (missing perfFee cap on class creation, unlockTs not reset on deactivation, navTimestamp grace period absent, adjustment history pagination O(n))

Full details in agent reports: `2026-03-02-audit-v8-agent-{1..6}-*.md`

---

### Informational (7)

- Slither MED-U06 `denomPrice` — FALSE POSITIVE (confirmed by Agent 6: refactored code path)
- E-BC04, E-BC07, E-BC10, E-BC12 — confirmed FIXED in V8
- E-BC20 (original double-settlement via proposal path) — FIXED; ARCH-01 is the active residual
- E-BC21 (CEI violation in settlement) — FIXED
- E-BC29 (NAV stale cascade) — FIXED (correct order in V8)

---

## Phase 4: Cross-Facet Attack Chains

7 attack chains traced. Full details: `2026-03-02-audit-v8-phase4-cross-facet.md`

| Chain | Severity | Status |
|-------|----------|--------|
| Chain 1: ARCH-01 privilege escalation via ERC1155 callback | CRITICAL | OPEN |
| Chain 2: E-BC20 double-settlement | — | FIXED |
| Chain 3: E-BC22 × E-BC25 — partial fill price cascade | HIGH | OPEN |
| Chain 4: NAV timestamp manipulation → fee skip | MEDIUM | OPEN |
| Chain 5: FX rate manipulation → cross-currency drain | HIGH | OPEN |
| Chain 6: Adjustment queue saturation → NAV deadlock (NEW) | HIGH | OPEN |
| Chain 7: Threshold retroactive lowering | HIGH | OPEN |

---

## Phase 5: Trail of Bits Maturity Assessment

**Score: 17/36 (1.89/4.0)**

| Category | Rating | Score | Key Finding |
|----------|--------|-------|-------------|
| Arithmetic | Moderate | 2 | Solidity 0.8, BPS math clean; no overflow fuzz tests |
| Auditing | Weak | 1 | Events missing for 7+ state changes; no monitoring infra |
| Authentication | Weak | 1 | ARCH-01 open; threshold retroactive change; no pause |
| Complexity | Weak | 1 | 16-facet Diamond; internalExecutionContext global flag; dual supply |
| Decentralization | Moderate | 2 | Multisig system; but threshold can be lowered retroactively |
| Documentation | Moderate | 2 | NatSpec present; architecture doc; missing security spec |
| Tx Ordering | Moderate | 2 | Private chain reduces MEV; FX manipulation still relevant |
| Low-Level Code | Satisfactory | 3 | No assembly; delegatecall scoped correctly |
| Testing | Satisfactory | 3 | 1,430 tests; Foundry fuzz tests; TDD patterns |

**Security Properties (7):**
- SP1: `FundTokens.totalSupply == baseInfo.totalSupply` — VIOLATED (E-BC25)
- SP2: Sum of all balances ≤ totalSupply — UNCERTAIN (depends on which totalSupply)
- SP3: No locked token exceeds holder balance — HOLDS (but V8-P02 is a risk)
- SP4: `internalExecutionContext` cleared after every execute* — HOLDS nominally; ARCH-01 creates a window
- SP5: No investor receives tokens without corresponding subscription — HOLDS
- SP6: Management fee never exceeds `BPS_DENOMINATOR` of NAV — HOLDS
- SP7: Dealing state machine monotonically advances — VIOLATED (V8N-03 deadlock)

---

## Phase 6: Gas Optimization Summary

See full report: `2026-03-02-audit-v8-phase6-gas.md`

**HIGH priority (> 20,000 gas per call):**
- GAS-03: Historical price arrays grow unbounded — 60,000 gas per NAV update after 1 year
- GAS-04: Cross-facet delegatecall in class loops — 25,000 gas for 10-class fund per NAV
- GAS-05: Dual totalSupply writes — 5,000 extra gas per mint/burn (also GAS priority for GAS-05 / HIGH security)

**MEDIUM priority:**
- GAS-07: Eligibility cross-facet per order — 250,000 gas for 100-order batch

**LOW priority:**
- GAS-01: `nextFundId: uint256` → `uint16`
- GAS-02: `mgmtFeeRate: uint160` → `uint32`
- GAS-08: `BaseInfo.name: string` → `bytes32`

**Total avoidable gas in a large batch:** ~585,000 gas per `executeUpdateNav + executeProcessOrders` with 10 classes / 100 orders.

---

## Findings Fixed Since V7

| V7 Finding | Status in V8 |
|-----------|--------------|
| E-BC07 Fund/Class dilution direction | FIXED |
| E-BC04 Dealing ID off-by-one (main usage) | FIXED (residual in ViewCallsFacet) |
| E-BC10 Role scoping confusion | FIXED |
| E-BC12 Storage layout modification | FIXED |
| E-BC20 Double settlement via proposal path | FIXED |
| E-BC21 CEI violation in settlement | FIXED |
| E-BC23 Cross-rate vs single-rate (FX settlement) | FIXED |
| E-BC28 HWM + maxFee validation | FIXED |
| E-BC29 NAV stale data cascade | FIXED |

---

## Remediation Priority

### Immediate (before any production deployment)

1. **ARCH-01** — Add `if (s.reentrancyLock) revert ReentrancyDetected()` to `onlyInternalExecution`. Or implement Diamond-level nonReentrant.
2. **E-BC22** — Store `classId` separately in Order struct; never overwrite `order.tokenId` with dealingId.
3. **E-BC25** — Consolidate to single `totalSupply` source in `FundTokensStorage`. Remove manual baseInfo updates.
4. **E-BC26** — Initialize FX safety config with non-zero defaults in InitDiamond.
5. **V8-A1-H02** — Enforce `MAX_ADJUSTED_FEE_RATE_BPS` at order processing time.
6. **V8-A1-H03** — Add proposer/owner check to cancel functions.
7. **V8A4-H02** — Add explicit bounds check before int128 cast.
8. **V8-CF01** — Enforce `maxAdjustmentBps` per-adjustment + emergency dealing state advance function.
9. **V8-P01** — Implement `Pausable` pattern across all facets.

### High Priority (within 1 development cycle)

10. **V8-A1-H01** — Validate dealing schedule timestamps.
11. **V8A4-H01** — Use try-catch pattern in bulk cancel.
12. **V8-A1-M03** — Store threshold in proposal at creation time.
13. **V8-A5-02** — Use `getFXRate` return value for deviation validation.
14. **V8N-03** — Add admin emergency force-advance for dealing state.
15. **V8N-07** — Risk adjustor fail-closed with admin override.
16. **V8N-12** — Add forward-only check on navTimestamp.

### Medium Priority (2-4 months)

17-21. V8N-01, V8A4-M01, V8A4-M02, V8-6-01, V8-6-04
22-27. GAS-03, GAS-04, GAS-07, V8-A1-M02, V8A4-M04, V8-A5-07

---

## Phase Reports Index

| Phase | Report File | Key Output |
|-------|------------|------------|
| Phase 1: Automated | `2026-03-02-audit-v8-phase1-automated.md` | Slither triage, forge baseline |
| Phase 2: Architecture | `2026-03-02-audit-v8-phase2-architecture.md` | ARCH-01 root cause, call graph |
| Phase 3a: Agent 1 | `2026-03-02-audit-v8-agent-1-auth.md` | AccountFacet + EligibilityFacet (12 findings) |
| Phase 3b: Agent 2 | `2026-03-02-audit-v8-agent-2-tokens.md` | FundTokensFacet (9 findings) |
| Phase 3c: Agent 3 | `2026-03-02-audit-v8-agent-3-nav-fees.md` | Nav + Fee + ClassAdjustment (12 findings) |
| Phase 3d: Agent 4 | `2026-03-02-audit-v8-agent-4-lifecycle.md` | FundMgmt + FundLifecycle (12 findings) |
| Phase 3e: Agent 5 | `2026-03-02-audit-v8-agent-5-fx-settlement.md` | FX + Settlement (10 findings) |
| Phase 3f: Agent 6 | `2026-03-02-audit-v8-agent-6-views.md` | 4 View facets (13 findings) |
| Phase 4: Cross-facet | `2026-03-02-audit-v8-phase4-cross-facet.md` | 7 attack chains, V8-CF01 (new) |
| Phase 5: ToB | `2026-03-02-audit-v8-phase5-tob.md` | Maturity 1.89/4.0, V8-P01/P02 (new) |
| Phase 6: Gas | `2026-03-02-audit-v8-phase6-gas.md` | 10 gas findings |

---

*Report generated: 2026-03-02 | Elysium Security Audit V8*
