# Audit V8 Agent 2: FundTokensFacet + FundManagementFacet

**Date:** 2026-03-02
**Scope:** `FundTokensFacet.sol`, `FundManagementFacet.sol`, `LibAppStorage.sol`, `TokenIdUtils.sol`
**Auditor:** Claude Opus 4.6 (Agent 2 - Tokens & Fund Management)

---

## Catalog Pattern Verification

| Pattern | Status | Evidence |
|---------|--------|----------|
| E-BC04 (Dealing ID off-by-one) | FIXED | `createDealing` at FundManagementFacet.sol:358-360 uses `++nextDealingId` (pre-increment writes, then reads) so `nextDealingId` equals the last created ID. Iteration elsewhere uses `<= nextDealingId`. |
| E-BC12 (Storage layout append-only) | NOT FOUND (no violation) | AppStorage uses mapping-based subdomain pattern (`mapping(uint256 => FundAdminStorage)`). No reordering detected. Final comment in LibAppStorage.sol:519-522 warns append-only. |
| E-BC16 (Public functions without access control) | FIXED for createFund/createDealing | `createFund` goes through `_validateAndPropose` requiring ROLE_ADMIN. `createDealing` has `onlyInternalExecution` modifier (FundManagementFacet.sol:353). |
| E-BC19 (Dual state tracking) | STILL PRESENT | `FundTokensStorage.totalSupply[id]` updated in `_update()`. `FundAdminStorage.baseInfo[id].totalSupply` updated separately in OrderManagementFacet and FeeManagementFacet. See V8-T01. |
| E-BC20 (ERC1155 callback reentrancy) | STILL PRESENT | `_updateWithAcceptanceCheck` calls `_update` (state changes) then `_checkOnERC1155Received` (external callback). State is updated before callback, but no reentrancy guard on FundTokensFacet entry points. See V8-T02. |
| E-BC25 (Dual totalSupply divergence) | STILL PRESENT | `_batchConvertDealingTokensInternal` burns/mints via FundTokensFacet (updates `FundTokensStorage.totalSupply`) but does NOT update `baseInfo.totalSupply` for dealing tokens. See V8-T01. |

---

## Findings

### V8-T01: Dual totalSupply Divergence in Dealing Token Conversion

**Severity:** HIGH
**Location:** `FundManagementFacet.sol:803-836` (`_batchConvertDealingTokensInternal`)
**Description:**
When dealing tokens are converted via `_batchConvertDealingTokensInternal`, the function calls `FundTokensFacet.burn()` and `FundTokensFacet.mint()` which update `FundTokensStorage.totalSupply[id]`. However, `FundAdminStorage.baseInfo[dealingId].totalSupply` is NEVER updated during this conversion. The `_update()` function in FundTokensFacet only manages `FundTokensStorage.totalSupply`, while `baseInfo.totalSupply` is independently managed by `OrderManagementFacet` (lines 1198-1239) and `FeeManagementFacet` (lines 181-204, 531-544). The conversion path is a third code path that only updates one tracker.

Additionally, `FundTokensFacet._update()` does NOT update `baseInfo.totalSupply` at the fund or class level for any mint/burn operation. The fund-level and class-level `baseInfo.totalSupply` are only updated in `OrderManagementFacet._processSubscriptions/_processRedemptions`. If any other code path mints or burns tokens (e.g., `_onrampInternal` minting cash tokens, `_batchConvertDealingTokensInternal`), only `FundTokensStorage.totalSupply` is updated.

**Impact:**
- `baseInfo[dealingId].totalSupply` becomes stale after conversions, potentially producing wrong price calculations in `NavManagementFacet.calculateDealingPrice()` which reads `baseInfo.totalSupply`.
- NAV calculations using stale `baseInfo.totalSupply` could lead to incorrect fund/class prices, affecting all subscription and redemption pricing.
- `activeDealingCount` is decremented when `FundTokensFacet.totalSupply(fromDealingId) == 0` (line 831), which uses the correct tracker, but downstream price logic may read the wrong one.

**Recommendation:**
Add a hook inside `FundTokensFacet._update()` that auto-syncs `baseInfo.totalSupply` for fund/class/dealing token IDs whenever totalSupply changes, or update `baseInfo.totalSupply` explicitly in `_batchConvertDealingTokensInternal` after each burn/mint pair.

**Status:** OPEN

---

### V8-T02: ERC1155 Callback During internalExecutionContext Window

**Severity:** HIGH
**Location:** `FundTokensFacet.sol:382-400` (`_updateWithAcceptanceCheck`), `FundTokensFacet.sol:470-494` (`_checkOnERC1155Received`)
**Description:**
When `mint()` is called (e.g., from `_onrampInternal` at FundManagementFacet.sol:695, or during order processing), the flow is: `_mint` -> `_updateWithAcceptanceCheck` -> `_update` (balance/supply changes) -> `_checkOnERC1155Received` (external callback to recipient).

The `_update` function correctly updates all balances and totalSupply BEFORE the callback fires (checks-effects-interactions is followed within `_update` itself). However, the issue is that during mint operations triggered by `executeOnramp` or other `execute*` functions, `internalExecutionContext` is `true` (set in AccountFacet.sol:1051). A malicious recipient contract could, in its `onERC1155Received` callback, call any `execute*` function on the diamond, bypassing the proposal/multisig system entirely since `onlyInternalExecution` only checks `s.internalExecutionContext`.

The `reentrancyLock` in AccountFacet (line 1036) protects the proposal execution path specifically, but does NOT protect direct calls to `execute*` functions when `internalExecutionContext` is already true from an outer call.

**Impact:**
On a private blockchain where recipient contracts are controlled, this is lower risk. However, if any account address is a smart contract (multisig wallet, account abstraction), it could:
- Call `executeCreateFund`, `executeOnramp`, `executeSetDealingSchedule` etc. without going through the proposal system.
- Mint unlimited cash tokens via `executeOnramp`.
- Create unauthorized funds or classes.

**Recommendation:**
1. Add a Diamond-level reentrancy guard that prevents re-entry into ANY facet function while an ERC1155 callback is in progress.
2. Or, set `internalExecutionContext = false` before any external call (mint/transfer) and restore it after.
3. The `reentrancyLock` in AccountFacet should be checked in `onlyInternalExecution` modifier as well, or use OpenZeppelin's ReentrancyGuard adapted for Diamond storage.

**Status:** OPEN

---

### V8-T03: Dual Owner Model - FundTokens Owner vs Diamond Owner

**Severity:** MEDIUM
**Location:** `FundTokensFacet.sol:55-58` (`onlyOwner`), `InitDiamond.sol:30`, `BaseFacet.sol:72-75` (`onlyOwnerDiamond`)
**Description:**
FundTokensFacet defines its own `onlyOwner` modifier checking `s.FundTokens[0].owner`, which is set to `msg.sender` (deployer) in `InitDiamond.sol:30`. This is a DIFFERENT address than the Diamond owner (`LibDiamond.contractOwner()`), which is checked by `onlyOwnerDiamond` in BaseFacet.

`setLockAuthorization` (line 283) uses `onlyOwner` (FundTokens owner = deployer), not `onlyOwnerDiamond`. There is no function to transfer `FundTokens[0].owner` after initialization. If the deployer address loses access or is compromised:
- Lock authorization can never be updated.
- If Diamond ownership is transferred, the new Diamond owner cannot manage lock authorizations.

**Impact:**
- Permanent inability to add/remove lock authorizers if deployer key is lost.
- Privilege separation that may be unintentional: Diamond owner can upgrade facets but cannot manage token locking directly.
- No transfer function for `FundTokens[0].owner` means this is a permanent assignment.

**Recommendation:**
Either:
1. Add an `onlyOwnerDiamond` modifier to `setLockAuthorization` (align with Diamond's access control).
2. Or add a `transferFundTokensOwnership` function gated by `onlyOwnerDiamond`.
3. At minimum, document this architectural decision explicitly.

**Status:** OPEN

---

### V8-T04: No Dealing-Level baseInfo.totalSupply Update on Cash Token Onramp/Offramp

**Severity:** MEDIUM
**Location:** `FundManagementFacet.sol:694-698` (`_onrampInternal`), `FundManagementFacet.sol:747-752` (`_offrampInternal`)
**Description:**
When cash tokens are minted via `_onrampInternal`, the function calls `FundTokensFacet.mint()` which updates `FundTokensStorage.totalSupply[cashFundTokenId]`. However, `FundAdminStorage.baseInfo[cashFundTokenId].totalSupply` is never updated. The same applies to `_offrampInternal` calling `burn()`.

Cash tokens have a `baseInfo` entry (created in `_createUmbrellaFundInternal` line 565-570 and `InitDiamond.sol:54-59`) with `totalSupply: 0`, but this value is never incremented on onramp or decremented on offramp.

**Impact:**
- Any view function or off-chain system reading `baseInfo[cashTokenId].totalSupply` will always see 0, regardless of actual cash token supply.
- If NAV calculations or settlement logic ever reference `baseInfo.totalSupply` for cash tokens, they will get incorrect values.

**Recommendation:**
Update `baseInfo[cashFundTokenId].totalSupply` in `_onrampInternal` and `_offrampInternal` alongside the ERC1155 mint/burn.

**Status:** OPEN

---

### V8-T05: Unvalidated Dealing Schedule Timestamps (E-BC27 Reconfirmation)

**Severity:** MEDIUM
**Location:** `FundManagementFacet.sol:867-877` (`executeSetDealingSchedule`)
**Description:**
The `executeSetDealingSchedule` function directly stores timestamps to storage without any validation:
```solidity
s.FundAdmin[0].funds[fundId].nextDealingTimestamps = timestamps;
```
There is no check for:
- Past timestamps (already expired).
- Zero timestamps.
- Unsorted order (the system pops from the end, expecting descending order).
- Duplicate timestamps.
- Unbounded array length (DoS via gas).

This was previously documented as E-BC27 in the error catalog.

**Impact:**
- Past timestamps could trigger immediate state transitions in the dealing state machine, potentially locking dealing processing permanently.
- Zero timestamps could cause undefined behavior in timestamp comparisons.
- An excessively large array could cause out-of-gas on functions that iterate over the schedule.

**Recommendation:**
Add validation in `executeSetDealingSchedule`:
- All timestamps must be > `block.timestamp`.
- Timestamps must be monotonically decreasing (for pop convention).
- Non-zero values only.
- Reasonable array length cap (e.g., <= 365).

**Status:** OPEN

---

### V8-T06: Holdings System Never Removes Zero-Balance Entries

**Severity:** LOW
**Location:** `FundTokensFacet.sol:703-719` (`_updateHierarchicalHoldingsForTransfer`)
**Description:**
The hierarchical holdings tracking system adds entries when tokens are received but explicitly does NOT remove entries when balance becomes zero (comment at line 715-718 explains this is intentional for historical tracking). The `getUserHoldings` and similar functions filter out zero-balance entries at query time via `_filterZeroBalanceTokens`.

While this is documented as intentional, it means:
- `allDealings` array grows monotonically and is never compacted.
- `umbrellaIndices`, `fundIndices`, `classIndices` arrays also grow monotonically.
- Over time, query functions become more expensive as they iterate over an ever-growing array and filter.
- The `IndexLocation` and reverse lookup data for zero-balance entries consume permanent storage.

**Impact:**
- Increasing gas costs for holdings queries over time.
- Storage bloat that cannot be reclaimed.
- On a private blockchain this is less critical, but long-lived funds with many dealing periods will accumulate significant dead entries.

**Recommendation:**
Consider adding an optional cleanup function that can be called by authorized addresses to remove zero-balance entries from the holdings arrays (using the existing `IndexLocation` reverse lookup for efficient removal).

**Status:** OPEN

---

### V8-T07: _getFundHoldingsFromHierarchicalSystem Returns Raw Packed Dealing Instead of Token ID

**Severity:** LOW
**Location:** `FundTokensFacet.sol:807-824` (`_getFundHoldingsFromHierarchicalSystem`)
**Description:**
The `_getFundHoldingsFromHierarchicalSystem` function (line 821) returns `uint256(holdings.allDealings[indices[i]])` which is a raw `uint64` packed dealing cast to `uint256`. This is the encoded token ID (since `encodeTokenId` just does `uint64(tokenId)` and `decodeTokenId` does `uint256(packed)`).

However, `_getUmbrellaHoldingsFromHierarchicalSystem` (lines 796-801) unpacks and reconstructs via `_unpackHierarchicalDealing` then `createTokenId`. The `getUserHoldingsFromHierarchicalSystem` function (lines 888-894) also unpacks. This inconsistency means `_getFundHoldingsFromHierarchicalSystem` returns raw packed values while other query functions return properly reconstructed token IDs.

Since `encodeTokenId`/`decodeTokenId` are identity operations on the lower 64 bits (line 267-268: `return uint64(tokenId)` and line 276-277: `return uint256(packed)`), the values are numerically equivalent for token IDs that fit in 64 bits. So this is functionally correct but introduces a maintenance risk.

The same inconsistency exists in `_getClassHoldingsFromHierarchicalSystem` (line 862) and `_getFundHoldingsFromHierarchicalSystemByKey` (line 834).

**Impact:**
- Currently no functional bug because token IDs fit within 64 bits and the pack/unpack is an identity operation.
- If token ID encoding ever changes to use more than 64 bits (e.g., adding metadata above bit 63), these functions would silently truncate and return wrong values.
- Code maintenance confusion: different query paths use different patterns.

**Recommendation:**
Standardize all query functions to use the same unpack-then-reconstruct pattern used by `_getUmbrellaHoldingsFromHierarchicalSystem` and `getUserHoldingsFromHierarchicalSystem`.

**Status:** OPEN

---

### V8-T08: No maxCapacity Check in Dealing Token Conversion

**Severity:** LOW
**Location:** `FundManagementFacet.sol:803-836` (`_batchConvertDealingTokensInternal`)
**Description:**
When dealing tokens are converted from one dealing to another, the function mints new tokens in the target dealing without checking the fund's `maxCapacity`. While the conversion is typically supply-neutral (burns from source, mints to target), rounding in the price conversion (`Math.mulDiv`) could result in slightly more tokens being minted than burned (when `fromPrice > toPrice`).

The capacity check in `OrderManagementFacet` (line 362-364) only triggers during NAV update processing, not during manual dealing conversion.

**Impact:**
- Minor: rounding could cause very small increases in effective fund supply.
- The capacity constraint is primarily economic, and conversions are admin-only operations.

**Recommendation:**
Add a post-conversion assertion that verifies the fund's total effective supply does not exceed `maxCapacity` after conversion.

**Status:** OPEN

---

### V8-T09: Assembly in _asSingletonArrays Is Safe

**Severity:** INFORMATIONAL
**Location:** `FundTokensFacet.sol:526-547` (`_asSingletonArrays`)
**Description:**
The assembly block in `_asSingletonArrays` is a standard pattern that:
1. Reads the free memory pointer (line 533: `mload(0x40)`).
2. Stores array length 1 at the pointer.
3. Stores the element at pointer + 0x20.
4. Places the second array at pointer + 0x40.
5. Updates the free memory pointer to pointer + 0x80.

This is safe and gas-efficient. The memory layout is: `[len1=1][elem1][len2=1][elem2]` consuming exactly 4 words (128 bytes). The `"memory-safe"` annotation is correct.

**Impact:** None. This is a verification note.

**Status:** NOT AN ISSUE

---

## Summary

| Severity | Count |
|----------|-------|
| HIGH | 2 |
| MEDIUM | 3 |
| LOW | 3 |
| INFORMATIONAL | 1 |

**Critical Patterns Still Present:**
- E-BC19/E-BC25: Dual totalSupply divergence remains the most significant systemic issue. Multiple code paths (onramp, offramp, dealing conversion, fee minting) update `FundTokensStorage.totalSupply` via ERC1155 mint/burn but do NOT update `FundAdminStorage.baseInfo.totalSupply`.
- E-BC20: ERC1155 callback reentrancy during `internalExecutionContext=true` window remains exploitable in principle, though mitigated by the private blockchain environment.
