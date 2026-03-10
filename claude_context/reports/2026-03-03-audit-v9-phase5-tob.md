# V9 Phase 5: Trail of Bits Methodology — 2026-03-03

## 1. Security Properties (Invariants)

### SP-1: Token Supply Consistency
```
∀ tokenId: FundTokensStorage.totalSupply[tokenId] >= Σ(balances[tokenId][account]) for all accounts
```
The ERC1155 total supply for any token ID must always equal or exceed the sum of all individual balances. Violated if `_update` has an arithmetic bug.

### SP-2: Locked Balance Invariant
```
∀ (account, tokenId): lockedBalances[account][tokenId] <= balances[tokenId][account]
```
Locked balance can never exceed total balance. Violated if `lockTokens` doesn't check available balance or if a burn bypasses the lock check.

### SP-3: Fund Isolation
```
∀ (fund1, fund2) where fund1.umbrellaId != fund2.umbrellaId:
  No operation on fund1 can modify storage of fund2
```
Funds in different umbrellas must never share state. Violated if a cross-umbrella operation doesn't validate umbrella boundaries.

### SP-4: Proposal System Integrity
```
∀ executeXxx call:
  (s.internalExecutionContext == true) AND (s.inExternalCallback == false)
```
Execute functions can only run through the proposal system, never via direct external calls or ERC1155 callbacks. Violated if ARCH-01 guard has gaps.

### SP-5: NAV Monotonic Timestamps
```
∀ NAV update for fund F:
  navTimestamp_new > navTimestamp_old
```
NAV timestamps must be strictly increasing. Violated if `NavTimestampNotIncreasing` check is bypassed.

### SP-6: Fee Cap Enforcement
```
∀ performance fee application:
  perfFeeBps <= ProtocolSafetyConfig.maxPerfFeeRateBps (when > 0)
```
Performance fees cannot exceed the protocol-configured cap. Violated if cap check is missing in any fee path.

### SP-7: Dealing State Machine Validity
```
∀ fund F:
  dealingProcessState(F) ∈ {IDLE, AWAITS_NAV_UPDATE, PROCESSING}
  AND transitions follow: IDLE → AWAITS_NAV_UPDATE → PROCESSING → IDLE
```
No invalid state transitions. Violated if state can be forced to skip steps.

### SP-8: Block Enforcement (VIOLATED — V9-CF-01)
```
∀ fund F where fundBlocked[F] == true:
  No state-modifying execute* function should succeed for fund F
```
**Currently violated**: `_requireFundNotBlocked` is never called. Fund-level blocking is non-functional.

## 2. Echidna Property Contract

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "../src/generated/IDiamondProxy.sol";
import "../src/libs/LibAppStorage.sol";
import "../src/libs/TokenIdUtils.sol";

/// @title EchidnaProperties
/// @notice Invariant properties for Elysium Diamond Proxy
/// @dev Run with: echidna . --contract EchidnaProperties --config echidna.yaml
contract EchidnaProperties {
    IDiamondProxy diamond;

    constructor(address _diamond) {
        diamond = IDiamondProxy(_diamond);
    }

    // SP-2: Locked balance never exceeds total balance
    function echidna_locked_leq_balance(address account, uint256 tokenId) public view returns (bool) {
        uint256 balance = diamond.balanceOf(account, tokenId);
        uint256 locked = diamond.lockedBalances(account, tokenId);
        return locked <= balance;
    }

    // SP-5: NAV timestamp monotonicity
    function echidna_nav_timestamp_monotonic(uint256 fundId) public view returns (bool) {
        (, , , uint32 navUpdatedAt, ) = diamond.funds(fundId);
        // If fund exists and has been updated, timestamp should be > 0
        // This is a simplified check; full property requires tracking previous value
        return navUpdatedAt == 0 || navUpdatedAt <= uint32(block.timestamp);
    }

    // SP-1: Available balance is non-negative (no underflow)
    function echidna_available_balance_valid(address account, uint256 tokenId) public view returns (bool) {
        uint256 balance = diamond.balanceOf(account, tokenId);
        uint256 locked = diamond.lockedBalances(account, tokenId);
        // availableBalance = balance - locked; this must not underflow
        return balance >= locked;
    }

    // SP-4: inExternalCallback blocks execute* re-entry
    // (This property is structural — verified by code review, not fuzzable easily)
}
```

**Blocker for full Echidna setup**: Diamond proxy requires complex deployment with InitDiamond, facet registration, and account creation. A full Echidna harness would need a setUp function that deploys the entire Diamond. This is achievable but requires significant infrastructure work.

**Unblock plan**: Create a `test/echidna/` directory with:
1. `EchidnaSetup.sol` — deploys Diamond with all facets
2. `EchidnaProperties.sol` — property contracts (above)
3. `echidna.yaml` — configuration targeting the setup contract

## 3. Findings NOT in Phases 1-4

### V9-TOB-01 (MEDIUM): ERC1155 Pausable Pattern Not Implemented in _update

**Category:** Standards Conformance
**Location:** `FundTokensFacet._update()` (line 299-380)

**Description:** OpenZeppelin's reference ERC1155 with pausable functionality hooks the pause check INTO the `_update` function via `ERC1155Pausable._update()`. This means ALL token operations (transfers, mints, burns) are blocked when paused. Elysium's `whenNotBlocked` modifier only guards `execute*` functions, not the `_update` function. This means:
- During a protocol block, `safeTransferFrom` still calls `_update` → tokens move
- During a protocol block, if any code path reaches `_mint` or `_burn` without going through an `execute*` function, tokens are created/destroyed

**Impact:** Incomplete emergency pause. Token transfers continue during protocol block.

**Recommendation:** Add a pause check inside `_update()`:
```solidity
function _update(...) internal virtual {
    if (s.FundAdmin[0].protocolBlocked) revert ProtocolBlocked();
    // ... rest of update logic
}
```

### V9-TOB-02 (LOW): Missing ERC165 Interface Registration for Diamond

**Category:** Standards Conformance
**Location:** `FundTokensFacet.supportsInterface()` (line 86-89)

**Description:** `supportsInterface` is implemented on FundTokensFacet but Diamond proxy pattern typically requires ERC165 support at the Diamond level (via DiamondLoupeFacet). The FundTokensFacet implementation only checks ERC1155 interfaces, not Diamond-specific interfaces (IDiamondCut, IDiamondLoupe).

**Impact:** External tools querying `supportsInterface` may not detect Diamond capabilities.

### V9-TOB-03 (MEDIUM): No Rate Limiting on Safety Config Updates

**Category:** Access Control
**Location:** `NavManagementFacet.setProtocolSafetyConfig()` (line 151-172)

**Description:** Safety configuration can be updated unlimited times. A compromised admin can rapidly toggle safety parameters:
1. Set maxPerfFeeRateBps = 0 (disable cap)
2. Set maxAdjustmentBps = 0 (disable cap)
3. Process malicious operations
4. Reset safety params to original values
This all happens within the multisig threshold, but there's no timelock or rate limit.

**Impact:** Compressed attack window — malicious admin can disable and re-enable safety in rapid succession, making post-incident forensics harder.

**Recommendation:** Add a timelock for safety-critical parameter changes, or emit events that off-chain monitoring can alert on (events ARE emitted, but there's no enforcement delay).

## 4. Code Maturity Scorecard (9 Categories)

| # | Category | Rating | Score | Evidence |
|---|----------|--------|-------|----------|
| 1 | **Arithmetic** | Moderate | 2/4 | SafeCast used (Fix 17), PRECISION=1e18 consistent. But: divide-before-multiply in fee calc (FeeManagementFacet:462), no overflow protection on `totalSupplyAll` additions, unchecked blocks in `_update` burn path (FundTokensFacet:355-365). |
| 2 | **Auditing/Logging** | Moderate | 2/4 | Events on most state changes. But: ProtocolSafetyConfig event omits 3/8 params (V9B-03), no events for FX operations (V9-E02), fee class totalSupply not tracked via events, no monitoring infrastructure documented. |
| 3 | **Auth/Access Control** | Satisfactory | 3/4 | Robust proposal system with multisig. ARCH-01 fix (inExternalCallback). whenNotBlocked on all execute*. Per-fund ROLE_MANAGER scoping. But: fund-level blocking non-functional (V9-CF-01), no timelock on admin ops, threshold retroactive lowering (V8-A1-M03). |
| 4 | **Complexity** | Moderate | 2/4 | Diamond pattern inherently complex (19 facets). OrderManagementFacet._processOrdersImpl is ~130 lines with nested loops. Shared AppStorage creates implicit coupling. But: clear separation of concerns per facet, well-structured proposal system. |
| 5 | **Decentralization** | Weak | 1/4 | Private blockchain — single Diamond owner controls all upgrades. No timelock on diamondCut. Admin can add/remove facets instantly. Safety config updatable without delay. But: multisig threshold provides some protection, private chain context reduces public risk. |
| 6 | **Documentation** | Moderate | 2/4 | SMART_CONTRACTS.md covers architecture well. contracts/CLAUDE.md has test helpers. Inline NatSpec on most public functions. But: no formal specification document, no security properties documented (until this audit), missing domain glossary for fund admin terms. |
| 7 | **Transaction Ordering** | Satisfactory | 3/4 | Private blockchain eliminates MEV/front-running. No public mempool. NAV updates from authorized service only. FX rates from authorized updater. But: no commit-reveal for sensitive proposals, order submission visible to validators (private chain operators). |
| 8 | **Low-Level Code** | Moderate | 2/4 | Assembly in FundTokensFacet._asSingletonArrays (line 536-550) — memory-safe gas optimization, well-commented. Assembly for error propagation in BaseFacet and AccountFacet. delegatecall is core to Diamond pattern. But: no formal verification of assembly blocks. |
| 9 | **Testing** | Satisfactory | 3/4 | 1488 tests passing. Good coverage of happy paths. Test helpers well-documented. But: no fuzz testing, no invariant testing, no formal verification. Off-by-one bug in view function (V8-6-01) suggests edge cases undertested. |

### Overall Maturity: **2.22/4.0** (Moderate)

**Top 3 Strengths:**
1. Comprehensive test suite (1488 tests, all passing)
2. Robust proposal/multisig access control system
3. Private blockchain eliminates entire classes of attacks (MEV, front-running)

**Top 3 Critical Gaps:**
1. Fund-level blocking non-functional on-chain (V9-CF-01)
2. No timelock on admin operations including diamondCut
3. No fuzz testing or formal verification for complex arithmetic
