# Security Audit V7 — Final Report

**Date:** 2026-02-12
**Branch:** multiCurrency
**Auditor:** Claude Opus 4.6 (automated)
**Methodology:** 7-phase audit: Automated → Architecture → Per-Facet (6 agents) → Cross-Facet → Trail of Bits → Gas → Report
**Baseline:** 1404/1404 tests passing
**Code Maturity:** 2.3/4.0 (Trail of Bits 9-category framework)

---

## Executive Summary

V7 is a comprehensive re-audit of all 17 Diamond facets on the `multiCurrency` branch. **82 deduplicated security findings** (5 Critical, 16 High, 24 Medium, 22 Low, 15 Informational) plus **10 cross-facet attack chains** and **8 gas optimizations** = **100 total items**.

Key themes:
1. **Fee minting breaks pricing** — fund-level totalSupply divergence creates compounding price inflation (XF-01)
2. **Uncapped performance fees persist** — 100% fee extraction still possible via forced redemption (XF-02)
3. **FX validation has 3 independent bypass paths** — zero-rate, wrong comparison, zero config (XF-04)
4. **Partial fill tokenId mutation** — normal operation corrupts pricing and creates phantom state (XF-03)
5. **5 of 7 V6 CRITICAL findings still present** — C-01, C-02, C-03, C-05, C-06 unfixed

Of the V6 CRITICAL findings: **2 FIXED** (C-04 partially, C-07 partially), **5 STILL PRESENT** (C-01, C-02 acknowledged, C-03, C-05, C-06).

### Security Properties Status

| Property | Status |
|----------|--------|
| SP-1: Fund Isolation | HOLD (cross-umbrella by design) |
| SP-2: Token Conservation | HOLD |
| SP-3: Dual Supply Consistency | **VIOLATED** |
| SP-4: Price Chain Monotonicity | **VIOLATED** |
| SP-5: Access Control Completeness | PARTIALLY HOLDS |
| SP-6: Order Lifecycle Integrity | HOLD (partial fill mutation risk) |
| SP-7: Settlement Atomicity | HOLD (FX cherry-pick risk) |
| SP-8: Fee Rate Bounds | **VIOLATED** |
| SP-9: Reentrancy Safety | PARTIALLY HOLDS |

---

## Findings by Severity

### CRITICAL (5)

#### V7-C-01: Fund-Level baseInfo.totalSupply Not Updated During Fee Minting
**Source:** Agent 4, XF-01
**Location:** `FeeManagementFacet.sol:199-204, 437-456`
**Description:** Management and performance fee minting calls `FundTokensFacet.mint()` (updates ERC1155 totalSupply) and updates `baseInfo[feeClassId].totalSupply`, but NEVER updates `baseInfo[fundId].totalSupply`. Since `calculateFundPrice()` divides NAV by `baseInfo[fundId].totalSupply`, the fund price is systematically inflated after each fee cycle. This is a positive feedback loop — inflated prices trigger more performance fees.
**Impact:** Compounding price inflation (~1%/cycle). All class prices corrupted. Subscribers overpay. Phantom gains trigger more fees.
**Prior:** V6-C-01 (declared "BY DESIGN" but divergence path through fees is real)

#### V7-C-02: Performance Fee BPS Cap Not Enforced at Processing Time
**Source:** Agent 3 + Agent 4, XF-02
**Location:** `OrderManagementFacet.sol:429`, `FeeManagementFacet.sol:387-435`
**Description:** `perfFeeBps` validated only as `<= BPS_DENOMINATOR` (10000 = 100%). The `MAX_ADJUSTED_FEE_RATE_BPS = 2000` constant is only enforced in the view-only `calculateAdjustedFeeRate()`, never during actual processing. Combined with forced redemptions, enables complete fund drain.
**Impact:** Manager can extract 100% of investor redemptions as performance fees.
**Prior:** V6-C-03, V6-C-04

#### V7-C-03: Subscribe Order TokenId Mutation Corrupts Partial Fill Pricing
**Source:** Agent 3, XF-03
**Location:** `OrderManagementFacet.sol:302, 1146-1162`
**Description:** First partial fill permanently mutates `order.tokenId` from classId to dealingId. Subsequent batches treat dealingId as classId, reading wrong dilutionRatio and creating phantom dealings under non-existent classes.
**Impact:** Wrong prices for all partial-fill subscriptions. Phantom class/dealing state. Silent NAV corruption.
**Prior:** E-BC22

#### V7-C-04: FX Validation Triple Bypass
**Source:** Agent 3 + Agent 5, XF-04
**Location:** `SettlementFacet.sol:86-90`, `OrderManagementFacet.sol:504-511`, `InitDiamond.sol` (missing)
**Description:** Three independent FX bypass vectors: (A) `actualFxRate=0` resolves to PRECISION, skipping all validation; (B) order processing validates cross-rate against USD rate (wrong comparison); (C) `fxSafetyConfig` defaults to zero (no limits).
**Impact:** Arbitrary FX rates on any cross-currency operation. EUR/JPY at 1:1 = 99.4% loss.
**Prior:** V6-C-02, V5-C02 (fixed in settlement, NOT in orders)

#### V7-C-05: Dealing Schedule Timestamps Completely Unvalidated
**Source:** Agent 2
**Location:** `FundManagementFacet.sol:342-365`
**Description:** `createDealing` accepts any timestamp values with no validation (past timestamps, backwards ordering, zeros). Can freeze the dealing state machine.
**Impact:** Fund operations frozen. Orders blocked indefinitely.
**Prior:** V6-C-05

---

### HIGH (16)

#### V7-H-01: Partial Settlement FX Cherry-Picking
**Source:** Agent 5
**Location:** `SettlementFacet.sol:83-98`
**Description:** Partial settlements can each use different FX rates. Settlement operator can cherry-pick favorable rates across multiple partial fills.
**Impact:** Systematic value extraction from investors via FX timing.

#### V7-H-02: FX Validation Bypass via actualFxRate=0 on Cross-Currency Settlements
**Source:** Agent 5
**Location:** `SettlementFacet.sol:86, 90`
**Description:** `actualFxRate=0` → PRECISION (1:1) → skips ALL FX validation for cross-currency settlements.
**Impact:** 1:1 FX rates forced on any cross-currency settlement.
**Note:** Subsumed by V7-C-04 Path A but listed separately for remediation tracking.

#### V7-H-03: ERC1155 safeTransferFrom Lacks Reentrancy Guard
**Source:** Agent 5
**Location:** `FundTokensFacet.sol:195-203, 232-246`
**Description:** Direct ERC1155 transfers trigger `onERC1155Received` callback without `reentrancyLock`. Re-entrant calls can invoke any Diamond facet during transfer.
**Impact:** Cross-facet state inconsistency during ERC1155 callback window.

#### V7-H-04: FX Cross-Rate Deviation Validated Against USD Rate in Order Processing
**Source:** Agent 3
**Location:** `OrderManagementFacet.sol:504-511`
**Description:** `validateFxRateDeviation(classCurrency, crossRate)` compares GBP→EUR cross-rate against GBP→USD rate — different quantities.
**Impact:** Manipulated FX rates pass validation. Valid rates may be rejected.
**Note:** Component of V7-C-04 Path B.

#### V7-H-05: NAV Update Uses Stale Fund Price for Adjustment Safety Check
**Source:** Agent 4
**Location:** `NavManagementFacet.sol:328-331`
**Description:** `_processAllPendingAdjustments(newNav)` calls `calculateFundPrice(fundId)` which reads OLD nav from storage, not the new nav being set.
**Impact:** Over-sized adjustments pass when NAV decreases; legitimate adjustments rejected when NAV increases.

#### V7-H-06: Performance Fee Batch Division by Zero on Empty Dealing
**Source:** Agent 4
**Location:** `FeeManagementFacet.sol:399`
**Description:** `Math.mulDiv(oldDilutionRatio, newTotalSupply, oldTotalSupply)` reverts when `oldTotalSupply == 0` (fully redeemed dealing). Causes entire batch to fail.
**Impact:** Single empty dealing blocks all performance fee collection for the class.

#### V7-H-07: Management Fee Dilution Uses Different Supply Than ERC1155 Mint
**Source:** Agent 4
**Location:** `FeeManagementFacet.sol:180-203`
**Description:** Dilution ratio updated from `baseInfo[classId].totalSupply` but mint targets ERC1155 `totalSupply[feeDealingId]`. These can diverge.
**Impact:** Class dilution drifts from actual supply dilution, corrupting class prices over time.

#### V7-H-08: Reentrancy Guard Only Covers _executeProposal
**Source:** Agent 1
**Location:** `AccountFacet.sol:1035-1057`
**Description:** `reentrancyLock` checked only in `_executeProposal`. Direct function calls through other entry points are unprotected.
**Impact:** Re-entrancy possible through non-proposal paths (ERC1155 callbacks).

#### V7-H-09: confirmTransaction Recalculates Threshold from Live Config
**Source:** Agent 1
**Location:** `AccountFacet.sol:confirmTransaction`
**Description:** Threshold recalculated on each confirmation from current config. Config changes during pending confirmations cause unexpected execution or permanent blocking.
**Impact:** Proposals may execute or become unexecutable based on config changes.

#### V7-H-10: Account Address Uses block.number (Non-Deterministic)
**Source:** Agent 1
**Location:** `AccountFacet.sol:createAccount`
**Description:** Account address generation uses `block.number`, making addresses non-deterministic across chains/forks.
**Impact:** Account addresses differ between test and production environments.

#### V7-H-11: Operator Can Cancel Owner Proposals
**Source:** Agent 1
**Location:** `AccountFacet.sol:cancelTransaction`
**Description:** Operators have permission to cancel proposals created by the account owner.
**Impact:** Operators can block owner-initiated operations.

#### V7-H-12: Protocol Safety Config Zero-Defaults Disable All Safety
**Source:** Agent 2
**Location:** `NavManagementFacet.sol`, `InitDiamond.sol`
**Description:** `ProtocolSafetyConfig` defaults to all zeros. Every safety check is `if (limit > 0) { ... }`, silently disabled when zero.
**Impact:** Freshly deployed funds have no safety bounds on NAV changes, fees, adjustments, FX rates.

#### V7-H-13: CLOSED→ACTIVE Fund Reactivation Bypass
**Source:** Agent 2
**Location:** `FundLifecycleFacet.sol`
**Description:** Admin can reactivate a CLOSED fund to ACTIVE, bypassing the intended lifecycle finality.
**Impact:** Closed funds can be reopened, potentially reviving stale state.

#### V7-H-14: Unbounded processOrders Array Length
**Source:** Agent 3
**Location:** `OrderManagementFacet.sol:245-381`
**Description:** No maximum length check on `ordersToProcess`. Gas cost grows linearly with array size.
**Impact:** Transaction revert on large batches. Dealing state machine stuck if processOrders always reverts.
**Prior:** V6-C-06

#### V7-H-15: Diamond Owner Has Unchecked Facet Replacement Power
**Source:** Phase 5
**Location:** `LibDiamond.sol`, `BaseFacet.sol:72-74`
**Description:** Diamond owner (single address) can replace any facet instantly with no timelock or multisig. More powerful than the proposal system.
**Impact:** Compromised owner key = complete protocol takeover in one transaction.

#### V7-H-16: FX Rate Staleness Not Checked at Settlement Time
**Source:** Agent 5
**Location:** `SettlementFacet.sol:118-153`
**Description:** Settlement FX validation uses stored reference rates without checking staleness. Rates could be days/weeks old.
**Impact:** Outdated reference rates allow manipulated settlement FX to pass deviation checks.

---

### MEDIUM (24)

| ID | Title | Source | Location |
|----|-------|--------|----------|
| V7-M-01 | Duplicate orderIndex causes full batch revert | Agent 3 | `OrderManagementFacet.sol:267-351` |
| V7-M-02 | Unbounded _hasUmbrellaBalance iteration | Agent 3 | `OrderManagementFacet.sol:724-735` |
| V7-M-03 | validateOrderForProcessing exposes internal pricing | Agent 3 | `OrderManagementFacet.sol:392-412` |
| V7-M-04 | Intra-umbrella swap currency mismatch reverts | Agent 3 | `OrderManagementFacet.sol:1267-1275` |
| V7-M-05 | Safety config zero-default bypasses adjustment bounds | Agent 4 | `NavManagementFacet.sol:276, 333` |
| V7-M-06 | Unbounded price history arrays | Agent 4 | `NavManagementFacet.sol:245-247` |
| V7-M-07 | lastMgmtFeeMintTs=0 causes first fee period loss | Agent 4 | `FundManagementFacet.sol:292` |
| V7-M-08 | RiskMetrics underflow on negative returns | Agent 4 | `RiskMetrics.sol:138` |
| V7-M-09 | RiskMetrics Sharpe/Sortino negative cast to uint256 | Agent 4 | `RiskMetrics.sol:176, 246` |
| V7-M-10 | FX safety config defaults to disabled | Agent 5 | `InitDiamond.sol` (missing) |
| V7-M-11 | Redeem settlement missing processing history | Agent 5 | `SettlementFacet.sol:186-221` |
| V7-M-12 | setLockAuthorization missing event | Agent 5 | `FundTokensFacet.sol:283-285` |
| V7-M-13 | _hasAnyDealingBalance off-by-one (classes) | Agent 6 | ViewCalls2Facet |
| V7-M-14 | _getOrderBookSize counts all orders not just pending | Agent 6 | ViewCallsFacet |
| V7-M-15 | _hasAnyDealingBalance off-by-one (dealings) | Agent 6 | ViewCalls2Facet |
| V7-M-16 | MetaContext ERC-2771 dead code with latent ACL bypass | Phase 5 | `MetaContext.sol:10-25` |
| V7-M-17 | Currency reactivation corrupts cash token baseInfo | Agent 2 | FundManagementFacet |
| V7-M-18 | Fund closure doesn't check class-level supply | Agent 2 | FundLifecycleFacet |
| V7-M-19 | Missing threshold change event for pending proposals | Agent 1 | AccountFacet |
| V7-M-20 | Batch eligibility update no per-item error | Agent 1 | EligibilityFacet |
| V7-M-21 | Account recovery overwrites without event | Agent 1 | AccountFacet |
| V7-M-22 | Divide-before-multiply in calculateAdjustedFeeRate | Phase 1 | `FeeManagementFacet.sol:424-474` |
| V7-M-23 | FX unused-return in Settlement validateFxRate | Phase 1 | `SettlementFacet.sol:139` |
| V7-M-24 | FX unused-return in OrderManagement calculateOrderResults | Phase 1 | `OrderManagementFacet.sol` |

---

### LOW (22)

| ID | Title | Source |
|----|-------|--------|
| V7-L-01 | Dependent order link clearing no event | Agent 3 |
| V7-L-02 | Holding limit underflow opaque revert | Agent 3 |
| V7-L-03 | ProtocolSafetyConfigUpdated missing 2 fields | Agent 4 |
| V7-L-04 | Fee class skip undocumented (class 1) | Agent 4 |
| V7-L-05 | Aggregation bounds (informational) | Agent 4 |
| V7-L-06 | Fee history loses original denomination amount | Agent 4 |
| V7-L-07 | Asymmetric deviation calculation in FX | Agent 5 |
| V7-L-08 | onlyFundAdmin hardcoded to diamond address | Agent 5 |
| V7-L-09 | Transfer history unbounded growth + uint32 | Agent 5 |
| V7-L-10 | _burn calls acceptance check unnecessarily | Agent 5 |
| V7-L-11 | Dealing cutoff leaks to view functions | Agent 6 |
| V7-L-12 | getInvestorOrders no status filter | Agent 6 |
| V7-L-13 | Pagination edge case on exact boundary | Agent 6 |
| V7-L-14 | countFundInvestors double-counts | Agent 6 |
| V7-L-15 | getActiveDealing cache miss on closed fund | Agent 6 |
| V7-L-16 | Dealing ID off-by-one in createDealing (classes) | Agent 2 |
| V7-L-17 | No event for fund maxCapacity change | Agent 2 |
| V7-L-18 | Legacy storage fields unused | Agent 2 |
| V7-L-19 | Class creation allows duplicate names | Agent 2 |
| V7-L-20 | Wallet-account mapping never cleaned | Agent 1 |
| V7-L-21 | Proposal expiry not enforced | Agent 1 |
| V7-L-22 | Empty operator array allows zero-threshold | Agent 1 |

---

### INFORMATIONAL (15)

| ID | Title | Source |
|----|-------|--------|
| V7-I-01 | fxRateToFund=0 bypasses FX for cross-currency | Agent 3 |
| V7-I-02 | Lifecycle check uses mutated dealingId as classId | Agent 3 |
| V7-I-03 | Floating pragma (^0.8.28) | Agent 4 |
| V7-I-04 | RiskMetrics is placeholder/mock | Agent 4 |
| V7-I-05 | validateTokenTransfer external self-call | Agent 5 |
| V7-I-06 | Settlement no cash token existence check | Agent 5 |
| V7-I-07 | Missing return value on view calls | Agent 6 |
| V7-I-08 | Empty array return on nonexistent fund | Agent 6 |
| V7-I-09 | getClassTokens iterates from 0 not 1 | Agent 6 |
| V7-I-10 | AdminViewCalls exports unused struct | Agent 6 |
| V7-I-11 | Diamond facet order dependency | Agent 2 |
| V7-I-12 | Account creation nonce pattern | Agent 1 |
| V7-I-13 | Redundant permission checks | Agent 1 |
| V7-I-14 | Uninitialized-local variables (Slither) | Phase 1 |
| V7-I-15 | Incorrect-equality sentinel checks (Slither) | Phase 1 |

---

## Cross-Facet Attack Chains (10)

| ID | Chain | Severity |
|----|-------|----------|
| XF-01 | Fee Minting → Price Inflation Cascade (SELF-AMPLIFYING) | CRITICAL |
| XF-02 | Uncapped Fee + Forced Redemption → Fund Drain | CRITICAL |
| XF-03 | TokenId Mutation → Phantom Dealing → NAV Corruption | CRITICAL |
| XF-04 | FX Validation Triple Bypass | CRITICAL |
| XF-05 | ERC1155 Direct Transfer Reentrancy | HIGH |
| XF-06 | Dealing Schedule State Machine Freeze | HIGH |
| XF-07 | Proposal Threshold Live Recalculation | HIGH |
| XF-08 | NAV Update Stale Price Cascade | HIGH |
| XF-09 | Cross-Umbrella Settlement FX Amplification | MEDIUM |
| XF-10 | Eligibility TOCTOU (mitigated by re-check) | LOW |

---

## Gas Optimizations (8)

| ID | Title | Priority |
|----|-------|----------|
| G-01 | Unbounded processOrders loop | HIGH |
| G-02 | Redundant SLOADs in fee minting | MEDIUM |
| G-03 | Cross-facet delegatecall for view data | MEDIUM |
| G-04 | ViewCalls assembly resize overhead | LOW |
| G-05 | _hasUmbrellaBalance iterates all holdings | HIGH |
| G-06 | Transfer history append on every transfer | MEDIUM |
| G-07 | Duplicate price calculations across steps | HIGH |
| G-08 | SafeCast on known-safe constants | LOW |

---

## V6 Finding Remediation Status

| V6 Finding | Status in V7 |
|------------|-------------|
| V6-C-01: Dual totalSupply divergence | **STILL PRESENT** → V7-C-01 |
| V6-C-02: FX validation bypass | **STILL PRESENT** → V7-C-04 |
| V6-C-03: Uncapped perf fee | **STILL PRESENT** → V7-C-02 |
| V6-C-04: Uncapped adjusted fee | PARTIALLY FIXED (view only) |
| V6-C-05: Dealing schedule unvalidated | **STILL PRESENT** → V7-C-05 |
| V6-C-06: Unbounded processOrders | **STILL PRESENT** → V7-H-14 |
| V6-C-07: Perf fee div-by-zero | PARTIALLY FIXED → V7-H-06 |

---

## Code Maturity Scorecard (Trail of Bits)

| Category | Rating | Score |
|----------|--------|-------|
| Arithmetic Safety | Satisfactory | 3/4 |
| Auditing & Logging | Moderate | 2/4 |
| Authentication & ACL | Moderate | 2/4 |
| Complexity Management | Moderate | 2/4 |
| Decentralization | Weak | 1/4 |
| Documentation | Satisfactory | 3/4 |
| Front-Running / MEV | Satisfactory | 3/4 |
| Low-Level Calls | Satisfactory | 3/4 |
| Testing & Verification | Moderate | 2/4 |
| **Overall** | | **2.3/4.0** |

---

## Detailed Report Files

| Phase | File |
|-------|------|
| Phase 1 | `2026-02-12-audit-v7-phase1-automated.md` |
| Phase 2 | `2026-02-12-audit-v7-phase2-architecture.md` |
| Phase 3 Agents | `2026-02-12-audit-v7-agent[1-6]-*.md` (6 files) |
| Phase 3 Summary | `2026-02-12-audit-v7-phase3-summary.md` |
| Phase 4 | `2026-02-12-audit-v7-phase4-cross-facet.md` |
| Phase 5 | `2026-02-12-audit-v7-phase5-tob.md` |
| Phase 6 | `2026-02-12-audit-v7-phase6-gas.md` |
| Phase 7 | `2026-02-12-security-audit-v7-report.md` (this file) |

---

## Recommendations Priority

### Immediate (CRITICAL)
1. Fix `baseInfo[fundId].totalSupply` update in fee minting paths (V7-C-01)
2. Enforce `MAX_ADJUSTED_FEE_RATE_BPS` in `_validateOrderPreconditions` (V7-C-02)
3. Fix tokenId mutation — store original classId separately (V7-C-03)
4. Fix FX validation: require non-zero rate for cross-currency, validate cross-rate not USD rate, set non-zero defaults (V7-C-04)
5. Add dealing schedule timestamp validation (V7-C-05)

### Short-Term (HIGH)
6. Add reentrancy guard to `safeTransferFrom`/`safeBatchTransferFrom` (V7-H-03)
7. Add batch size limit to `processOrders` (V7-H-14)
8. Fix settlement FX staleness check (V7-H-16)
9. Transfer diamond ownership to multisig with timelock (V7-H-15)
10. Add zero-supply guard in perf fee batch (V7-H-06)

### Medium-Term
11. Set non-zero ProtocolSafetyConfig defaults in InitDiamond (V7-H-12)
12. Initialize `lastMgmtFeeMintTs` at class creation (V7-M-07)
13. Remove dead MetaContext code (V7-M-16)
14. Build Echidna property harness for SP-2, SP-3, SP-8
15. Increase branch coverage to >80% for FundManagement, FundTokens, Settlement
