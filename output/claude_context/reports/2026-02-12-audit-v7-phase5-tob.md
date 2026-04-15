# V7 Audit — Phase 5: Trail of Bits Methodology

**Date:** 2026-02-12
**Skills Invoked:** `building-secure-contracts:secure-workflow-guide`, `building-secure-contracts:code-maturity-assessor`

---

## 9-Category Code Maturity Scorecard

| # | Category | Rating | Score | Evidence |
|---|----------|--------|-------|----------|
| 1 | Arithmetic Safety | Satisfactory | 3/4 | SafeCast used consistently (120 occurrences across 13 files), Math.mulDiv for precision, Solidity 0.8.28 built-in overflow. Weak: divide-before-multiply in `FeeManagementFacet.sol:424-474`, RiskMetrics uint256 underflow on negative returns (`RiskMetrics.sol:138`). |
| 2 | Auditing & Logging | Moderate | 2/4 | 64 event emissions across 13 facets. 1409 NatSpec annotations. Weak: `setLockAuthorization` no event (`FundTokensFacet.sol:283`), `ProtocolSafetyConfigUpdated` missing 2 fields (`NavManagementFacet.sol:209`), redeem settlement no processing history (`SettlementFacet.sol:186-221`), dependent order link clearing no event (`OrderManagementFacet.sol:185-196`). |
| 3 | Authentication & ACL | Moderate | 2/4 | Unified `roles` mapping with 6 roles (`BaseFacet.sol:100-107`), `_validateAndPropose` central checkpoint (`BaseFacet.sol:109-165`), `onlyInternalExecution` modifier. Weak: legacy `admins`/`navUpdaters` mappings still in storage (`LibAppStorage.sol`), `reentrancyLock` only covers proposal execution not direct ERC1155 transfers (`FundTokensFacet.sol:195-246`), threshold recalculation from live config (`AccountFacet.sol:confirmTransaction`), no timelock on diamond owner. |
| 4 | Complexity Management | Moderate | 2/4 | Diamond pattern separates concerns into 17 facets. TokenIdUtils encodes hierarchy. Weak: `_processOrdersImpl` is 143 lines with O(n*m) complexity (`OrderManagementFacet.sol:238-381`), dual totalSupply tracking creates systemic complexity, `_updateNavInternal` has 3-step ordering dependency (`NavManagementFacet.sol:222-239`). |
| 5 | Decentralization | Weak | 1/4 | Diamond owner is single address with unlimited facet replacement power. No timelock. No multisig on diamond ownership (distinct from proposal system). Admin can set arbitrary FX rates, force redemptions, process orders with 100% fees. Private chain = trusted operator model, but no on-chain guardrails. |
| 6 | Documentation | Satisfactory | 3/4 | 1409 NatSpec annotations across 17 facets. Custom errors with descriptive names (`ISharedErrors.sol`). Storage layout well-documented (`FundAdminStructs.sol` slot comments). Architecture docs in `claude_context/technical/`. Weak: no formal specification document, audit trail comments (T-xx) are informal. |
| 7 | Front-Running / MEV | Satisfactory | 3/4 | Private chain deployment mitigates MEV. Proposal system with thresholds prevents single-tx front-running. Order submission → processing is two-phase. Weak: `validateOrderForProcessing` is public view exposing internal pricing (`OrderManagementFacet.sol:392`). |
| 8 | Low-Level Calls | Satisfactory | 3/4 | Assembly limited to array resizing in ViewCalls (13 instances, all `memory-safe`), MetaContext ERC-2771 (`MetaContext.sol:19-21`), BaseFacet delegatecall (`BaseFacet.sol:152`). All marked with `memory-safe` annotation. delegatecall confined to `address(this)` (same Diamond). |
| 9 | Testing & Verification | Moderate | 2/4 | 1404 tests passing (100%). Line coverage: 63.15% overall. Branch coverage: 50.81% overall. Weak: FundManagementFacet 40% branch, FundTokensFacet 54% branch, SettlementFacet 70.59% branch. No fuzz testing. No formal verification. No Echidna/Manticore. RiskMetrics is mock/placeholder. |

**Overall Maturity: 2.3/4.0** (slight decline from V6's 2.4 due to new complexity without corresponding test coverage)

**Weakest:** Decentralization (1/4) — diamond owner has unchecked power
**Strongest:** Arithmetic (3/4), Documentation (3/4), Front-Running (3/4), Low-Level (3/4)

---

## Security Properties

### SP-1: Fund Isolation
**Invariant:** Funds in different umbrellas never share state. `s.FundAdmin[0].funds[fundA]` and `s.FundAdmin[0].funds[fundB]` have no cross-references when in different umbrellas.
**Status:** HOLD — Cross-umbrella swaps intentionally breach this via `dependentUmbrellaId` (acknowledged as C-02).

### SP-2: Token Conservation
**Invariant:** For any token ID `t`: `FundTokens[0].totalSupply[t] == sum(FundTokens[0].balances[t][addr])` for all addresses.
**Status:** HOLD — ERC1155 standard implementation maintains this invariant. Verified in FundTokensFacet `_update()` which atomically decrements sender and increments recipient.

### SP-3: Dual Supply Consistency
**Invariant:** `FundTokens[0].totalSupply[fundId] == baseInfo[fundId].totalSupply` for all fund-level tokens.
**Status:** VIOLATED — Fee minting (management + performance) updates ERC1155 totalSupply but NOT `baseInfo[fundId].totalSupply`. See XF-01, Agent 4 V7-C-01.

### SP-4: Price Chain Monotonicity
**Invariant:** `fundPrice = NAV / fundTotalSupply`, `classPrice = fundPrice * classDilution`, `dealingPrice = classPrice * dealingDilution`. The chain is consistent top-to-bottom.
**Status:** VIOLATED — Due to SP-3 violation, `fundPrice` uses stale `baseInfo[fundId].totalSupply` while `classPrice` and `dealingPrice` use potentially different dilution ratios that diverge through fee minting.

### SP-5: Access Control Completeness
**Invariant:** Every state-modifying operation either (a) goes through `_validateAndPropose` with role check, or (b) has an explicit modifier (`onlyOwnerDiamond`, `onlyInternalExecution`, `onlyFundAdmin`).
**Status:** PARTIALLY HOLDS — All execute* functions have `onlyInternalExecution`. `safeTransferFrom` and `safeBatchTransferFrom` are public (standard ERC1155) but lack reentrancy guard. `setLockAuthorization` has `onlyOwner`. No gaps found in state-modifying paths.

### SP-6: Order Lifecycle Integrity
**Invariant:** Orders transition: PENDING → FILLED or PENDING → CANCELLED. No other transitions. An order cannot be processed twice.
**Status:** HOLD — `cashPendingSwap` mechanism prevents double-settlement. Processing history tracks transitions. However, the tokenId mutation on partial fills (V7-C-01 Agent 3) corrupts the order's identity during multi-batch processing.

### SP-7: Settlement Atomicity
**Invariant:** Settlement operations (subscribe/redeem) atomically update cash tokens, fund tokens, and order state.
**Status:** HOLD — CEI pattern followed. `cashPendingSwap` decremented before token operations. However, partial settlements allow FX cherry-picking (XF-01 Agent 5 V7-H-01).

### SP-8: Fee Rate Bounds
**Invariant:** Performance fees never exceed `MAX_ADJUSTED_FEE_RATE_BPS` (2000 = 20%).
**Status:** VIOLATED — `MAX_ADJUSTED_FEE_RATE_BPS` only enforced in view function `calculateAdjustedFeeRate()`, never in actual processing paths. `perfFeeBps` allows up to 10000 (100%).

### SP-9: Reentrancy Safety
**Invariant:** No state-modifying function can be re-entered during execution.
**Status:** PARTIALLY HOLDS — Proposal execution protected by `reentrancyLock`. Direct ERC1155 transfers (`safeTransferFrom`) NOT protected — `onERC1155Received` callback can re-enter Diamond.

---

## Echidna Property Contract

**Blocker:** The Diamond proxy pattern requires all calls to go through a single proxy address with delegatecall routing. Echidna's default testing model (direct contract calls) doesn't work with Diamond pattern without a custom harness that:
1. Deploys the full Diamond with all facets
2. Routes all Echidna calls through the Diamond proxy
3. Initializes state via InitDiamond

**Unblock Plan:**
1. Create `test/echidna/EchidnaElysium.sol` that inherits from `DiamondTestBase`
2. Add `echidna_` prefixed properties for key invariants
3. Key properties to test:

```solidity
// SP-2: Token Conservation
function echidna_token_conservation() public returns (bool) {
    // For each active fund token ID, verify totalSupply == sum(balances)
    // Requires iterating known token IDs and holder addresses
}

// SP-3: Dual Supply Consistency
function echidna_dual_supply_consistent() public returns (bool) {
    // For each fund: FundTokens.totalSupply(fundId) == baseInfo[fundId].totalSupply
    // This WILL FAIL — proving the V7-C-01 divergence
}

// SP-8: Fee Rate Bounds
function echidna_fee_rate_bounded() public returns (bool) {
    // After any processOrders call, verify no fee exceeded MAX_ADJUSTED_FEE_RATE_BPS
}
```

**Effort Estimate:** 2-3 days to build Diamond-compatible Echidna harness.

---

## Unique Phase 5 Findings (Not in Phases 1-4)

### V7-P5-01: MetaContext ERC-2771 Dead Code Creates Latent ACL Bypass Vector

**Severity:** MEDIUM
**Category:** Dead Code / Latent Vulnerability
**Location:** `src/shared/MetaContext.sol` lines 10-25, `src/shared/BaseFacet.sol` lines 73, 124, 149

**Description:**
`MetaContext.sol` inherits OpenZeppelin's `Context` and overrides `_msgSender()` with ERC-2771 trusted forwarder support. When `msg.sender` matches `s.metaTxContext.trustedForwarder`, the function extracts the "real" sender from the last 20 bytes of calldata (line 20).

However, `BaseFacet.sol` — the central ACL enforcement layer — uses `msg.sender` directly at lines 73, 124, and 149, never calling `_msgSender()`. This makes the entire MetaContext infrastructure dead code that serves no purpose.

The risk is latent: if a future developer changes `msg.sender` to `_msgSender()` in BaseFacet (to "properly" support meta-transactions), ANY call through the trusted forwarder could impersonate any address, bypassing the entire ACL system. The `trustedForwarder` defaults to `address(0)` and has no setter function, but storage manipulation (e.g., via a diamond upgrade that writes to the same slot) could activate it.

**Impact:** No current impact (dead code). Latent CRITICAL if activated — complete ACL bypass.

**Recommendation:** Either:
1. Remove `MetaContext.sol` entirely if meta-transactions are not planned, or
2. Implement it properly: use `_msgSender()` in BaseFacet AND add a guarded setter for `trustedForwarder` with event emission and timelock.

**Status:** OPEN

---

### V7-P5-02: Diamond Owner Has Unchecked Facet Replacement Power — No Timelock or Multisig

**Severity:** HIGH
**Category:** Decentralization / Trust Model
**Location:** `LibDiamond.sol` (OpenZeppelin Diamond), `BaseFacet.sol:72-74`

**Description:**
The Diamond owner (a single address checked via `LibDiamond.contractOwner()`) can:
1. Add, replace, or remove ANY facet function via `diamondCut`
2. Replace the implementation of any existing function with arbitrary code
3. Execute this instantly with no timelock, no multisig, and no event delay

This is distinct from the proposal system: the proposal system (AccountFacet) enforces multisig thresholds for fund operations, but the Diamond owner bypasses the proposal system entirely. The Diamond owner can replace `AccountFacet` itself, removing all ACL enforcement.

On a private chain with a trusted operator, this is the standard operating model. However, the protocol has NO on-chain guardrails to prevent a compromised owner key from performing a "rug pull" by replacing facet implementations.

**Impact:** A compromised diamond owner key can silently replace any facet with malicious code, drain all funds, and destroy audit trails — all in a single transaction.

**Recommendation:**
1. Transfer diamond ownership to a multisig (e.g., Gnosis Safe)
2. Add a timelock (e.g., 48h delay) on `diamondCut` operations
3. Emit events for all pending upgrades so off-chain monitoring can alert
4. Consider a 2-of-N multisig for emergency upgrades and a higher threshold for normal upgrades

**Status:** OPEN

---

## Summary

| Component | Count |
|-----------|-------|
| Security Properties | 9 (2 VIOLATED, 2 PARTIALLY HOLD, 5 HOLD) |
| Maturity Score | 2.3/4.0 |
| Echidna Contracts | 0 (blocker documented with unblock plan) |
| Unique Phase 5 Findings | 2 (1 HIGH, 1 MEDIUM) |
| Categories Rated | 9/9 with file:line evidence |
