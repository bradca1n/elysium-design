# V8 Phase 4 v2: Full Cross-Facet Attack Chain Analysis (All 18 Facets)
<!-- 2026-03-02 | V8 Audit Extension | Sequential-thinking 14-thought redo -->

> **Supersedes:** `2026-03-02-audit-v8-phase4-cross-facet.md` (16-facet analysis)
> **New facets added:** FundManagementValidationFacet (#18), PerfFeeStandardFacet (#17)

---

## Summary Table

| Chain ID | Title | Severity | Status | Facets |
|----------|-------|----------|--------|--------|
| Chain 1 | ARCH-01 privilege escalation via ERC1155 callback | CRITICAL | OPEN | AccountFacet, FundTokensFacet, + all execute* |
| Chain 2 | E-BC20 double-settlement | — | FIXED (V7) | SettlementFacet |
| Chain 3 | E-BC22 × E-BC25 compound price cascade (extended) | CRITICAL | OPEN | OrderMgmt, FundTokens, NavMgmt, PerfFee, FeeMgmt |
| Chain 4 | NAV timestamp manipulation → fee skip (extended) | HIGH | OPEN | NavMgmt, FeeMgmt, PerfFeeStandardFacet |
| Chain 5 | FX rate manipulation → cross-currency drain | HIGH | OPEN | FXMgmt, SettlementFacet |
| Chain 6 | V8-CF01 adjustment queue saturation → NAV deadlock | HIGH | OPEN | ClassAdjustment, NavMgmt, FeeMgmt |
| Chain 7 | Threshold retroactive lowering | MEDIUM | OPEN | AccountFacet |
| **V8-CF02** | **ARCH-01 + fee cap bypass → malicious share class** | **CRITICAL** | **NEW / OPEN** | AccountFacet, FundTokensFacet, FundMgmt, FundMgmtValidation |
| **V8-CF03** | **Dual totalSupply → perf fee overcharge feedback loop** | **HIGH** | **NEW / OPEN** | OrderMgmt, FundTokens, NavMgmt, PerfFeeStandard, FeeMgmt |
| **V8-CF04** | **Manager hurdle elimination via invalid hurdleFundId** | **HIGH** | **NEW / OPEN** | FundMgmt, FundMgmtValidation, PerfFeeStandard, FeeMgmt |
| **V8-CF05** | **Empty perfFeeParams abi.decode panic → NAV deadlock** | **HIGH** | **NEW / OPEN** | FundMgmt, PerfFeeStandard, FeeMgmt, NavMgmt |
| **V8-CF06** | **CF01 deadlock + benchmark staleness → fee during lockout** | **MEDIUM** | **NEW / OPEN** | ClassAdjustment, NavMgmt, PerfFeeStandard |
| **V8-CF07** | **Asymmetric fee mint → lastPerfMintAtNavT divergence → conversion deadlock** | **MEDIUM** | **NEW / OPEN (conditional)** | PerfFeeStandard, FeeMgmt, FundMgmtValidation |

**New chains discovered in extension: 6** (1 CRITICAL, 3 HIGH, 2 MEDIUM)

---

## All 18 Facets In Scope

```
1.  AccountFacet              — multisig proposals, execute* functions, onlyInternalExecution gating
2.  OrderManagementFacet      — order processing, tokenId mutation (E-BC22), fee BPS
3.  OrderValidationFacet      — view validation for orders
4.  FundTokensFacet           — ERC1155 mint/burn/transfer, lock/unlock, onERC1155Received callbacks
5.  FundManagementFacet       — fund/class/dealing creation, calls this.validate*() into facet 18
6.  NavManagementFacet        — NAV update, price calculation, risk adjustor (E-BC31)
7.  FeeManagementFacet        — management fee minting, calls calcStandardPerfFee (facet 17)
8.  ClassAdjustmentFacet      — adjustment queue, int128 cast (V8A4-H02), maxAdjustmentBps
9.  EligibilityFacet          — investor tags, O(n×m) matching
10. FundLifecycleFacet        — lifecycle transitions, bulk cancel
11. FXManagementFacet         — FX rate registry, USD-triangulated cross-rates
12. SettlementFacet           — cross-umbrella settlement
13. ViewCallsFacet            — paginated queries, off-by-one
14. ViewCalls2Facet           — eligible classes, silent FX fallback
15. AdminViewCallsFacet       — admin dashboard views
16. ManagerViewCallsFacet     — manager views
17. PerfFeeStandardFacet      — HWM+hurdle+risk-adjustor fee; calls NavMgmt(address(this)); E-BC31 #2
18. FundManagementValidationFacet — validation fns extracted from facet 5; calls FundTokensFacet(address(this))
```

---

## Original Chains (Updated Where Extended)

#### Chain 1: ARCH-01 — ERC1155 Callback Privilege Escalation

**Severity:** CRITICAL
**Status:** OPEN (unfixed since V3)
**Facets involved:** AccountFacet, FundTokensFacet, all execute* facets
**Finding:** ARCH-01

**Attack path:**
1. Attacker is an operator (or exploits an existing operator via social engineering)
2. Submits a proposal to call any `execute*` function through AccountFacet
3. Proposal executes → `internalExecutionContext = true`
4. During execution, an ERC1155 mint fires `FundTokensFacet.onERC1155Received`
5. Callback fires with `internalExecutionContext == true` → `onlyInternalExecution` modifier passes
6. From callback, attacker calls any other `execute*` function directly (bypasses reentrancyLock since it only guards `_executeProposal`)
7. Nested `execute*` runs without multisig approval

**New vectors from V8 extension:**
- **V8-CF02 sub-path:** During `executeCreateShareClass` callback, call back to `executeCreateShareClass` with `mgmtFeeRate=10000 BPS`; `V8-FMV-01` (maxMgmtFeeRateBps=0 skips cap check) allows this to succeed → share class with 655% fee rate created without governance approval
- **PFS double-mint sub-path:** During `executeUpdateNav` callback, call `executeMintFees` with arbitrary dealing IDs (`V8-PFS-07` — no classId/dealingId validation); fees double-minted for same period

---

#### Chain 2: E-BC20 Double-Settlement

**Severity:** N/A
**Status:** FIXED (V7)
**Notes:** No new vectors from extension facets.

---

#### Chain 3: E-BC22 × E-BC25 Compound Price Cascade (Extended)

**Severity:** CRITICAL
**Status:** OPEN
**Facets involved:** AccountFacet, OrderManagementFacet, FundTokensFacet, NavManagementFacet, PerfFeeStandardFacet, FeeManagementFacet
**Findings:** E-BC22, E-BC25

**Original attack path (steps 1-4):**
1. Partial order fill at OrderManagementFacet:304 → `order.tokenId` mutated from `classId` to `dealingId` (E-BC22)
2. Corrupted tokenId used in class price lookup → wrong mint/burn calculation
3. `FundTokensStorage.totalSupply` diverges from `baseInfo.totalSupply` (E-BC25)
4. NavManagementFacet reads wrong totalSupply → mispriced NAV

**New extension steps 5-7 (PerfFeeStandardFacet feedback loop):**
5. `PerfFeeStandardFacet.calcStandardPerfFee` calls `calculateFundPrice` → reads mispriced NAV → inflated gain above HWM
6. `FeeManagementFacet` mints excess performance fee tokens based on inflated gain → further inflates totalSupply (E-BC25 compound)
7. `lastPerfMintAtNavT` updated at inflated NAV timestamp → next fee calculation uses wrong baseline → error compounds over subsequent fee periods

**Severity upgrade rationale:** Extension from 4-step to 7-step loop with positive feedback. Each fee mint worsens the totalSupply divergence, which worsens the next price, which leads to larger fee mints. Self-reinforcing divergence over time.

---

#### Chain 4: NAV Timestamp Manipulation → Fee Skip (Extended)

**Severity:** HIGH
**Status:** OPEN
**Facets involved:** NavManagementFacet, FeeManagementFacet, PerfFeeStandardFacet
**Findings:** E-BC27, V8-PFS-06

**Attack path:**
1. Manager submits a series of `executeUpdateNav` calls with timestamps far in the future (E-BC27: unvalidated schedule timestamps)
2. NavManagementFacet records these future timestamps in the price history array
3. FeeManagementFacet fee processing skips periods where timestamp > current block time

**New extension (V8-PFS-06 staleness bypass):**
4. If manager controls the benchmark fund (`hurdleFundId`), they stop updating its NAV for >7 days
5. `PerfFeeStandardFacet._calcHurdleReturn` → `_findPriceAtOrBefore(hurdleFundId, fromTs)` returns `(0, 0)` when all prices are stale
6. Hurdle deduction skipped → full gain above HWM charged without benchmark hurdle benefit
7. Investor pays maximum performance fee despite fund underperforming its benchmark

---

#### Chain 5: FX Rate Manipulation → Cross-Currency Drain

**Severity:** HIGH
**Status:** OPEN
**Facets involved:** FXManagementFacet, SettlementFacet
**Notes:** No new vectors from extension facets. ViewCalls2Facet's silent FX fallback (V8-6-04) affects off-chain clients only, not the on-chain settlement path.

---

#### Chain 6: V8-CF01 — Adjustment Queue Saturation → NAV Deadlock

**Severity:** HIGH
**Status:** OPEN
**Facets involved:** ClassAdjustmentFacet, NavManagementFacet, FeeManagementFacet
**Findings:** V8-CF01, V8A4-H01

**Attack path:** (unchanged from V8 original)
1. Attacker submits 100 adjustment entries to ClassAdjustmentFacet (queue saturation)
2. `executeUpdateNav` iterates the queue → hits gas limit → reverts
3. NAV update permanently blocked → all dealing processing halted (deadlock)

**New interaction note (V8-CF06):** See V8-CF06 below for compound effect when benchmark fund also becomes stale during the deadlock window.

---

#### Chain 7: Threshold Retroactive Lowering

**Severity:** MEDIUM
**Status:** OPEN
**Facets involved:** AccountFacet
**Notes:** No new vectors from extension facets.

---

## New Chains Discovered in V8 Extension

#### V8-CF02: ARCH-01 + Fee Cap Bypass → Malicious Share Class Creation

**Severity:** CRITICAL
**Status:** NEW / OPEN
**Facets involved:** AccountFacet, FundTokensFacet, FundManagementFacet, FundManagementValidationFacet
**Root findings:** ARCH-01, V8-FMV-01
**Parent chain:** Extension of Chain 1

**Attack path:**
1. Attacker triggers an ERC1155 mint during any `execute*` call → `internalExecutionContext == true`
2. From within the `onERC1155Received` callback, attacker calls `FundManagementFacet.executeCreateShareClass` directly (no multisig required — ARCH-01 bypass)
3. Attacker supplies `mgmtFeeRate = 10000 BPS` (100%) and `maxMgmtFeeRateBps = 0` (disables cap)
4. `FundManagementValidationFacet.validateShareClassCreation` evaluates `if (maxMgmtFeeRateBps > 0 && mgmtFeeRate > maxMgmtFeeRateBps)` — condition is `false` because `maxMgmtFeeRateBps == 0` (V8-FMV-01)
5. Validation passes → malicious share class created with 100% (or up to 655.35%) management fee rate
6. `PerfFeeStandardFacet` perf fee rate also uncapped (V8-PFS-08) → compound fee extraction enabled
7. Legitimate investors onboarding to this share class face immediate near-total fee extraction

**Impact:** Total fund drain via fee extraction. Created without governance/multisig approval. Requires only a single operator-controlled transaction to trigger.

**Remediation:**
- Fix ARCH-01 (add `if (s.reentrancyLock) revert ReentrancyDetected()` inside `onlyInternalExecution`)
- Fix V8-FMV-01 (require `maxMgmtFeeRateBps > 0` to enforce the cap; or require explicit zero to mean "explicitly unlimited" with separate flag)

---

#### V8-CF03: Dual TotalSupply → Performance Fee Overcharge Feedback Loop

**Severity:** HIGH
**Status:** NEW / OPEN
**Facets involved:** OrderManagementFacet, FundTokensFacet, NavManagementFacet, PerfFeeStandardFacet, FeeManagementFacet
**Root findings:** E-BC25, V8-PFS-01 (amplifier)

**Attack path:**
1. `FundTokensStorage.totalSupply` diverges from `baseInfo.totalSupply` via partial fill or batch conversion (E-BC25)
2. `NavManagementFacet.calculateFundPrice` reads the wrong totalSupply → inflated fund unit price
3. `PerfFeeStandardFacet.calcStandardPerfFee` calls `calculateFundPrice` → sees inflated price → computes artificially large gain above HWM
4. `FeeManagementFacet` mints excess performance fee tokens
5. Excess token mint further inflates `FundTokensStorage.totalSupply` relative to `baseInfo.totalSupply`
6. Next NAV update → further inflated price → step 3 repeats with larger error
7. Self-reinforcing loop: divergence grows each fee period; investors bear compounding dilution

**If V8-PFS-01 (risk adjustor fail-open) fires simultaneously:** Risk adjustment is silently skipped → even larger performance fee charged → feedback loop accelerates.

**Remediation:**
- Fix E-BC25 (unify totalSupply into a single authoritative source)
- Fix V8-PFS-01 (risk adjustor fail-closed)

---

#### V8-CF04: Manager Hurdle Elimination via Invalid hurdleFundId

**Severity:** HIGH
**Status:** NEW / OPEN
**Facets involved:** FundManagementFacet, FundManagementValidationFacet, PerfFeeStandardFacet, FeeManagementFacet
**Root findings:** V8-PFS-03, V8-PFS-06
**Actor:** Malicious/negligent fund manager

**Attack path:**
1. Manager creates a share class with `hurdleFundType = FUND` and sets `hurdleFundId` to an arbitrary fund ID they control (or a non-existent ID)
2. `FundManagementValidationFacet.validateShareClassCreation` does NOT validate that `hurdleFundId` is a real fund in the same umbrella (V8-PFS-03)
3. Share class is created with a "hurdle rate" that is effectively disabled
4. On fee calculation dates: `PerfFeeStandardFacet._calcHurdleReturn` calls `_findPriceAtOrBefore(hurdleFundId, fromTs)` → returns `(0, 0)` for non-existent fund
5. `hurdleReturn = 0` → hurdle deduction = 0 → full gain above HWM charged as performance fee
6. If using a self-controlled benchmark fund: manager stops NAV updates for >7 days (V8-PFS-06 staleness) → same result via staleness rather than non-existence
7. Investors were marketed a "hurdle-protected" fee structure; they receive none of the protection

**Impact:** Material financial harm. Manager extracts full performance fees without benchmark benchmark hurdle. The deception is encoded at share class creation and persists for the lifetime of the class.

**Remediation:**
- Validate `hurdleFundId` exists and is accessible at class creation time
- Emit an event logging `hurdleFundId` for off-chain monitoring
- Consider requiring `hurdleFundId` to be in same umbrella

---

#### V8-CF05: Empty perfFeeParams abi.decode Panic → Permanent NAV Deadlock

**Severity:** HIGH
**Status:** NEW / OPEN
**Facets involved:** FundManagementFacet, PerfFeeStandardFacet, FeeManagementFacet, NavManagementFacet
**Root finding:** V8-PFS-02

**Attack path:**
1. A share class is created (intentionally or by misconfiguration) with empty `perfFeeParams` bytes — no performance fee configured
2. Share class creation succeeds (no validation that `perfFeeParams` is well-formed if perf fee type is set)
3. Later, `FeeManagementFacet.collectFees` is called (part of `executeUpdateNav` flow)
4. `collectFees` iterates all share classes and calls `PerfFeeStandardFacet.calcStandardPerfFee(classId, dealingIds)` for each class with a performance fee type
5. For the malformed class: `abi.decode(params, (uint16, uint256, uint16, uint16))` panics on empty bytes → reverts entire `executeUpdateNav` call
6. NAV update is permanently blocked for the entire fund (not just the malformed class)
7. All dealing processing (onramps, offramps, conversions) is halted for all investors in the fund

**Notes:** This can be triggered by admin error (deploying a class with wrong params) or by a malicious operator who knows the params encoding. Recovery requires a diamondCut to patch the fee processing logic or a separate administrative function to clear the malformed class.

**Remediation:**
- Add try/catch around `abi.decode` or validate params at class creation time
- Require non-empty, validly-sized `perfFeeParams` during `validateShareClassCreation` when perf fee type is set

---

#### V8-CF06: V8-CF01 Deadlock + Benchmark Staleness → Fee Overcharge During Lockout

**Severity:** MEDIUM
**Status:** NEW / OPEN
**Facets involved:** ClassAdjustmentFacet, NavManagementFacet, PerfFeeStandardFacet
**Root findings:** V8-CF01, V8-PFS-06

**Attack path:**
1. ClassAdjustmentFacet adjustment queue saturates (V8-CF01) → NAV updates blocked → investors cannot redeem
2. Deadlock persists for days/weeks (requires diamondCut or admin intervention to fix)
3. During the deadlock, `lastPerfMintAtNavT` is frozen at the pre-deadlock value
4. Simultaneously, the benchmark fund's price history also becomes stale (no updates for >7 days)
5. When deadlock resolves and NAV update finally succeeds: `PerfFeeStandardFacet` calculates gain over the entire deadlock period (potentially months)
6. `_calcHurdleReturn` finds no benchmark prices → hurdle skipped (V8-PFS-06)
7. Investors charged full performance fee for the locked period where they couldn't exit, without hurdle protection

**Impact:** Investors are double-penalized: locked (can't exit) AND charged unreduced fees for the lockout period.

**Remediation:**
- Fix V8-CF01 (prevent queue saturation)
- Add cap on fee calculation period to a reasonable max (e.g., 90 days) to prevent multi-month fee catch-up
- Ensure staleness handling is fail-safe (keep hurdle at last known rate rather than zero)

---

#### V8-CF07: Asymmetric Fee Mint → lastPerfMintAtNavT Divergence → Conversion Deadlock

**Severity:** MEDIUM
**Status:** NEW / OPEN (conditional — depends on FeeManagementFacet try/catch pattern)
**Facets involved:** PerfFeeStandardFacet, FeeManagementFacet, FundManagementValidationFacet
**Root findings:** V8-PFS-02, V8-FMV-05

**Condition:** This chain activates if `FeeManagementFacet.collectFees` processes dealings independently (try/catch per dealing), rather than as an atomic transaction for all dealings.

**Attack path (if condition holds):**
1. Share class has two dealings (A and B). Dealing A has valid `perfFeeParams`; dealing B has malformed/empty params (V8-PFS-02).
2. `FeeManagementFacet.collectFees` processes dealings independently with try/catch.
3. Dealing A: fee minted successfully → `dealing.lastPerfMintAtNavT = currentNavTimestamp` (updated).
4. Dealing B: `abi.decode` panic caught → this dealing's fee mint skipped → `lastPerfMintAtNavT` stays at old value.
5. `dealing A.lastPerfMintAtNavT != dealing B.lastPerfMintAtNavT` (diverged).
6. `FundManagementValidationFacet.validateDealingConversion` checks equality of `lastPerfMintAtNavT` between source and target dealings → rejects all conversions between A and B.
7. Investors holding A tokens cannot convert to B tokens (and vice versa) — permanently blocked unless both lastPerfMintAtNavT timestamps are re-synchronized.

**Verification needed:** Confirm whether FeeManagementFacet uses try/catch per dealing or atomic revert-all for fee processing. If atomic: this chain cannot fire (V8-PFS-02 blocks ALL dealings uniformly → no divergence, but the V8-CF05 deadlock chain fires instead).

**Remediation:**
- Fix V8-PFS-02 (validate params at class creation)
- Consider removing the equality check in validateDealingConversion (V8-FMV-05) in favor of a "same epoch" check

---

## Facet Coverage Summary

All 18 facets appear in at least one chain:

| # | Facet | Chains |
|---|-------|--------|
| 1 | AccountFacet | Chain 1, V8-CF02 |
| 2 | OrderManagementFacet | Chain 3, V8-CF03 |
| 3 | OrderValidationFacet | Chain 3 (indirect) |
| 4 | FundTokensFacet | Chain 1, Chain 3, V8-CF02, V8-CF03 |
| 5 | FundManagementFacet | V8-CF02, V8-CF04, V8-CF05, V8-CF07 |
| 6 | NavManagementFacet | Chain 4, V8-CF03, V8-CF05, V8-CF06 |
| 7 | FeeManagementFacet | Chain 3, V8-CF03, V8-CF04, V8-CF05, V8-CF07 |
| 8 | ClassAdjustmentFacet | Chain 6, V8-CF06 |
| 9 | EligibilityFacet | Chain 3 (indirect via onramp) |
| 10 | FundLifecycleFacet | Chain 6 (lifecycle blocks withdrawal) |
| 11 | FXManagementFacet | Chain 5 |
| 12 | SettlementFacet | Chain 2 (fixed), Chain 5 |
| 13 | ViewCallsFacet | Chain 3 (off-chain info leak) |
| 14 | ViewCalls2Facet | Chain 5 (silent FX fallback — off-chain) |
| 15 | AdminViewCallsFacet | Chain 7 (admin config misuse) |
| 16 | ManagerViewCallsFacet | V8-CF04 (manager hurdle config) |
| 17 | PerfFeeStandardFacet | V8-CF03, V8-CF04, V8-CF05, V8-CF06, V8-CF07 |
| 18 | FundManagementValidationFacet | Chain 1 ext, V8-CF02, V8-CF04, V8-CF07 |
