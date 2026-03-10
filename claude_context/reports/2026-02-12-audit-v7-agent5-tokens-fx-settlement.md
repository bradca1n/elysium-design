# Audit V7 — Agent 5: Tokens, FX & Settlement

**Date:** 2026-02-12
**Scope:** `FundTokensFacet.sol`, `FXManagementFacet.sol`, `SettlementFacet.sol`
**Auditor:** Agent 5 (Tokens, FX & Settlement)

---

## Prior Finding Verification

### H-06: Settlement FX validation wrong comparison target
**Status:** FIXED
**Evidence:** `SettlementFacet._validateSettlementFxRate()` (lines 118-153) now correctly computes the reference cross-rate via `FXManagementFacet(address(this)).getFXRate(sourceCurrency, targetCurrency)` and validates the deviation of `effectiveFxRate` against that computed cross-rate. This is the correct approach — no longer comparing against a single-currency USD rate.

### H-09: Zero-balance holdings never removed from index
**Status:** STILL PRESENT (ACKNOWLEDGED)
**Evidence:** `_updateHierarchicalHoldingsForTransfer()` (FundTokensFacet.sol lines 700-716) explicitly does NOT remove tokens from holdings when balance becomes 0, as documented in the comment at line 712-715. View functions `getUserHoldings()`, `getUmbrellaHoldings()`, etc. filter via `_filterZeroBalanceTokens()`. This is an intentional design decision for historical tracking. The append-only design is a gas optimization tradeoff — no swap-and-pop overhead on every transfer — but creates unbounded growth in `allDealings` array per user.

### V3-H02: Settlement callable repeatedly (FX cherry-pick)
**Status:** PARTIALLY FIXED
**Evidence:** There is NO `SETTLED` status in the `OrderStatus` enum (only `UNINITIALIZED`, `PENDING`, `FILLED`, `CANCELLED` at `FundAdminStructs.sol` lines 19-24). However, re-call protection exists through a different mechanism: `cashPendingSwap` is decremented before token operations (CEI pattern at `SettlementFacet.sol` lines 175, 198), and the check `if (sourceAmount > order.cashPendingSwap) revert SettlementAmountExceeded()` at line 83 prevents settling more than the pending amount. Once `cashPendingSwap` reaches 0, no more settlement is possible. This is functionally equivalent to a SETTLED status for single settlements, but partial settlements are intentionally supported (settle portion of sourceAmount at a time). The FX cherry-picking risk remains for partial settlements — see finding V7-H-01.

### V3-H03: FX rate staleness, no expiry
**Status:** FIXED
**Evidence:** `FXManagementFacet.executeUpdateFXRates()` at lines 54-57 validates: (1) `rateTimestamp > uint32(block.timestamp)` reverts with `FXRateTimestampInFuture`; (2) `block.timestamp - rateTimestamp > Constants.DEFAULT_MAX_FX_RATE_AGE` (1 day) reverts with `FXRateTimestampTooOld`. Both checks are enforced on every FX rate update.

### V5-C01: Settlement reentrancy via ERC1155 callback
**Status:** FIXED
**Evidence:** Settlement functions (`_settleSubscribe`, `_settleRedeem`) follow CEI pattern — state updates (`cashPendingSwap -= sourceAmount`) happen at lines 175 and 198 BEFORE token operations at lines 180-183 and 201-203. Additionally, the entire proposal execution path is protected by `reentrancyLock` in `AccountFacet._executeProposal()` (lines 1035-1057). Since `executeConfirmCashFundSettlement` requires `onlyInternalExecution`, it can only be called during proposal execution when the reentrancy lock is held.

### V5-C02: FX rate validation compares cross-rate vs USD rate
**Status:** FIXED
**Evidence:** `_validateSettlementFxRate()` at line 140 computes `referenceCrossRate = FXManagementFacet(address(this)).getFXRate(sourceCurrency, targetCurrency)` which performs USD triangulation (`quoteVsUSD * PRECISION / baseVsUSD`). The deviation check at lines 145-149 compares `effectiveFxRate` against this computed cross-rate. This is mathematically correct.

### V5-H07: Settlement order status not updated after completion
**Status:** PARTIALLY FIXED
**Evidence:** `_settleSubscribe()` appends a processing history entry at line 177 with `PENDING` status and updated amount. `_settleRedeem()` does NOT append processing history for the primary order (only for the dependent order at line 215 if applicable). When all `cashPendingSwap` is consumed, the order remains in its last status (PENDING or FILLED) with no explicit "settlement complete" marker. See finding V7-M-02.

### V5-H08: FX rate timestamp not validated against block.timestamp
**Status:** FIXED
**Evidence:** Lines 55-57 of `FXManagementFacet.sol` validate both future and stale timestamps.

### V6-C-02: FX validation bypass via actualFxRate=0 + zero safety defaults
**Status:** STILL PRESENT
**Evidence:** At `SettlementFacet.sol` line 86: `uint256 effectiveFxRate = actualFxRate == 0 ? Constants.PRECISION : actualFxRate;`. When `actualFxRate=0`, it resolves to `PRECISION` (1:1 rate). Then at line 90: `if (effectiveFxRate != Constants.PRECISION)` — this skips FX validation entirely because `PRECISION == PRECISION`. Combined with the fact that `fxSafetyConfig` is never initialized in `InitDiamond.sol` (defaults to `{maxFxRateChangeBps: 0, maxFxSettlementDeviationBps: 0}` — both meaning "no limit"), a settlement operator can force 1:1 FX rate on any cross-currency settlement by passing `actualFxRate=0`. See finding V7-H-02.

### PHASE5-01: No reentrancy guard
**Status:** FIXED
**Evidence:** `reentrancyLock` exists at `LibAppStorage.sol` line 484, checked in `AccountFacet._executeProposal()` at lines 1035-1036, cleared at line 1057. All state-modifying operations that go through the proposal system are protected.

---

## New Findings

### V7-H-01: Partial Settlement FX Cherry-Picking

**Severity:** HIGH
**Category:** Logic Error
**Location:** `src/facets/SettlementFacet.sol` lines 83-98

**Description:**
Settlement supports partial fills via `sourceAmount <= order.cashPendingSwap`. Each partial settlement can specify a different `actualFxRate`. A settlement operator can exploit this by splitting a large settlement into small partial settlements, using favorable FX rates when rates move in their favor and waiting when they don't.

For example, with a 1000 EUR -> GBP settlement:
1. When EUR/GBP is favorable (e.g., 0.88), settle 100 EUR at 0.88
2. When EUR/GBP is unfavorable (e.g., 0.84), wait
3. When favorable again, settle another portion
4. Repeat, always cherry-picking the best rate

The `maxFxSettlementDeviationBps` only limits how far each individual rate can deviate from the reference, but does not prevent timing attacks across multiple partial settlements.

**Impact:**
Settlement operators can systematically extract value from investors by cherry-picking favorable FX rates across partial settlements. The cumulative deviation can far exceed the per-settlement limit.

**Recommendation:**
Either (1) require the same FX rate for all partial settlements of a single order (store the first-used rate), (2) add a maximum time window for completing all partial settlements, or (3) require full settlement in a single transaction.

**Status:** OPEN

---

### V7-H-02: FX Validation Bypass via actualFxRate=0 on Cross-Currency Settlements

**Severity:** HIGH
**Category:** Logic Error
**Location:** `src/facets/SettlementFacet.sol` lines 86, 90

**Description:**
When `actualFxRate=0` is passed to `confirmCashFundSettlement`, it resolves to `PRECISION` (1e18, i.e., 1:1 rate) at line 86. The FX validation at line 90 checks `if (effectiveFxRate != Constants.PRECISION)` and SKIPS validation when the rate equals PRECISION. This means a 1:1 rate is always accepted without validation, even for cross-currency settlements where the actual rate should be significantly different (e.g., EUR/JPY ~162).

This is compounded by the fact that `fxSafetyConfig` defaults to all zeros in `InitDiamond.sol` (no safety limits configured), meaning even if the check were reached, it would pass.

**Impact:**
A settlement operator can force 1:1 exchange rates on cross-currency settlements (e.g., 1 EUR = 1 JPY instead of 1 EUR = 162 JPY), causing massive losses for investors in the target currency.

**Recommendation:**
1. Remove the special-case bypass for `actualFxRate=0`. Instead, require explicit FX rates for cross-currency settlements:
```solidity
if (sourceCurrency != targetCurrency) {
    if (actualFxRate == 0) revert FXRateRequired();
}
```
2. Set non-zero defaults for `fxSafetyConfig` in `InitDiamond.sol` (e.g., `maxFxSettlementDeviationBps = 500` for 5% max deviation).
3. Alternatively, when currencies differ, automatically use the reference cross-rate if `actualFxRate=0`.

**Status:** OPEN

---

### V7-H-03: ERC1155 safeTransferFrom Lacks Reentrancy Guard

**Severity:** HIGH
**Category:** Reentrancy
**Location:** `src/facets/FundTokensFacet.sol` lines 195-203, 232-246

**Description:**
The `safeTransferFrom` and `safeBatchTransferFrom` functions are `public virtual` and can be called directly by any address (as sender or approved operator) without going through the proposal system. These functions call `_updateWithAcceptanceCheck`, which triggers `onERC1155Received` or `onERC1155BatchReceived` callbacks on the recipient. The reentrancy guard (`reentrancyLock`) is only checked in `AccountFacet._executeProposal()`, not in these direct transfer paths.

A malicious contract receiving tokens via `safeTransferFrom` could re-enter the Diamond proxy during the `onERC1155Received` callback. At this point, the sender's balance has already been decreased and the recipient's balance increased (state is consistent), but the transfer history tracking (`_trackTransferHistoryAndUpdateHoldings`) has not yet completed for all tokens in a batch transfer. More critically, the re-entrant call could invoke other state-modifying functions on any facet.

**Impact:**
During the callback window, a malicious recipient contract can call any Diamond facet function. While the immediate token state is consistent (balances updated before callback), cross-facet operations could be exploited. For example, the recipient could submit orders, modify approvals, or trigger other settlement operations while mid-transfer.

**Recommendation:**
Add the reentrancy guard to the direct transfer entry points:
```solidity
function safeTransferFrom(...) public virtual {
    if (s.reentrancyLock) revert ReentrancyGuardViolation();
    s.reentrancyLock = true;
    // ... existing logic ...
    s.reentrancyLock = false;
}
```
Or better: create a `nonReentrant` modifier that checks/sets/clears the lock.

**Status:** OPEN

---

### V7-M-01: FX Safety Config Defaults to Disabled (Zero = No Limit)

**Severity:** MEDIUM
**Category:** Configuration / Safety
**Location:** `src/init/InitDiamond.sol` (missing), `src/facets/FXManagementFacet.sol` lines 76-83, 224-225

**Description:**
`FXSafetyConfig` is never initialized in `InitDiamond.sol`. The struct defaults to `{maxFxRateChangeBps: 0, maxFxSettlementDeviationBps: 0}`. In both `executeUpdateFXRates` (line 78: `if (maxChangeBps > 0 && existingRate > 0)`) and `validateFxRateDeviation` (line 225: `if (maxDeviationBps == 0) return`), zero means "skip validation entirely."

This means a freshly deployed Diamond has no FX rate change limits and no settlement deviation limits. If the admin forgets to call `setFXSafetyConfig`, the system operates without any FX safety guardrails.

**Impact:**
Without explicit configuration, FX rates can change by any amount between updates, and settlement operators can use any FX rate without deviation checks. This was identified in V6-C-02 (E-BC26) but remains unfixed.

**Recommendation:**
Set sensible defaults in `InitDiamond.sol`:
```solidity
s.FundAdmin[0].fxSafetyConfig = FundAdminStructs.FXSafetyConfig({
    maxFxRateChangeBps: 1000,  // 10% max change per update
    maxFxSettlementDeviationBps: 500  // 5% max settlement deviation
});
```

**Status:** OPEN

---

### V7-M-02: Redeem Settlement Does Not Update Order Processing History

**Severity:** MEDIUM
**Category:** Logic Error / Audit Trail
**Location:** `src/facets/SettlementFacet.sol` lines 186-221

**Description:**
`_settleRedeem` updates `cashPendingSwap` (line 198) but does NOT append to the order's `processingHistory` for the primary order. Compare with `_settleSubscribe` which does call `_appendProcessingHistory` at line 177. For the redeem path, only the dependent order gets a processing history update (line 215), and only if `dependentFundNum > 0`.

This means redeem settlements leave no on-chain audit trail of when they occurred. The order's `processingHistory` only shows the original FILLED status from order processing, not the settlement event.

**Impact:**
1. Off-chain systems cannot track when a redeem settlement occurred by examining processing history
2. Partial redeem settlements are invisible in the order's history
3. Inconsistent behavior between subscribe and redeem settlement paths

**Recommendation:**
Add `_appendProcessingHistory` to `_settleRedeem` for the primary order:
```solidity
function _settleRedeem(...) internal {
    ...
    order.cashPendingSwap -= sourceAmount;
    _appendProcessingHistory(order, FundAdminStructs.OrderStatus.FILLED, 
        _getCurrentProcessingStatus(order).amount);
    ...
}
```

**Status:** OPEN

---

### V7-M-03: FX Rate Staleness Not Checked at Settlement Time

**Severity:** MEDIUM
**Category:** Logic Error
**Location:** `src/facets/SettlementFacet.sol` lines 118-153

**Description:**
The `_validateSettlementFxRate` function computes the reference cross-rate from stored FX registry data but does NOT check whether those stored rates are stale. The staleness check (`DEFAULT_MAX_FX_RATE_AGE = 1 days`) is only enforced when new rates are WRITTEN via `executeUpdateFXRates` (line 57). At settlement time, the reference rates used for cross-rate computation could be days or weeks old.

For example:
1. FX rates updated at time T
2. At time T + 30 days, a settlement is executed
3. The cross-rate used for deviation validation is 30-day-old data
4. The settlement operator's `actualFxRate` could deviate significantly from the current market rate but still pass the deviation check against the stale reference

**Impact:**
Stale reference rates allow settlement operators to use outdated FX rates for deviation validation, potentially allowing rates that deviate significantly from current market rates.

**Recommendation:**
Add a staleness check in `_validateSettlementFxRate`:
```solidity
FundAdminStructs.FXRateData memory sourceData = s.FundAdmin[0].fxRegistry[sourceCurrency];
FundAdminStructs.FXRateData memory targetData = s.FundAdmin[0].fxRegistry[targetCurrency];
if (block.timestamp - sourceData.timestamp > Constants.DEFAULT_MAX_FX_RATE_AGE) 
    revert ISharedErrors.FXRateTimestampTooOld();
if (block.timestamp - targetData.timestamp > Constants.DEFAULT_MAX_FX_RATE_AGE) 
    revert ISharedErrors.FXRateTimestampTooOld();
```

**Status:** OPEN

---

### V7-M-04: Missing Event for FX Safety-Critical State Changes

**Severity:** MEDIUM
**Category:** Missing Events
**Location:** `src/facets/FundTokensFacet.sol` lines 283-285

**Description:**
`setLockAuthorization` changes who can lock/unlock tokens (a security-critical permission) but does NOT emit an event. This makes it impossible to track changes to lock authorization via on-chain event logs.

**Impact:**
Off-chain monitoring cannot detect when lock authorization is granted or revoked. A compromised owner could silently grant lock authorization to an attacker address.

**Recommendation:**
Add an event:
```solidity
event LockAuthorizationChanged(address indexed locker, bool authorized);

function setLockAuthorization(address locker, bool authorized) external onlyOwner {
    s.FundTokens[0].canLockTokens[locker] = authorized;
    emit LockAuthorizationChanged(locker, authorized);
}
```

**Status:** OPEN

---

### V7-L-01: Asymmetric Deviation Calculation in FXManagementFacet

**Severity:** LOW
**Category:** Logic Error
**Location:** `src/facets/FXManagementFacet.sol` lines 256-258

**Description:**
`_calculateDeviationBps` divides by `b` (the second parameter): `(diff * BPS_DENOMINATOR) / b`. This means the deviation percentage depends on which value is passed as `b`. For rate change validation (line 79), `b = existingRate`. For settlement deviation (line 230), `b = referenceRate`. In `_validateSettlementFxRate` (SettlementFacet line 148), `b = referenceCrossRate`.

This is technically correct for "percentage change from reference" but creates an asymmetry: a rate of 200 vs reference 100 gives 100% deviation, but a rate of 100 vs reference 200 gives 50% deviation. This is standard practice but worth noting as it slightly favors downward deviations.

**Impact:**
The asymmetry means downward FX rate deviations are slightly more permissive than upward ones. For a `maxDeviationBps` of 500 (5%): an upward deviation of 5.26% would be accepted, while a downward deviation of exactly 5% would be at the limit.

**Recommendation:**
If symmetric behavior is desired, use the average of the two values as the denominator:
```solidity
return (diff * BPS_DENOMINATOR * 2) / (a + b);
```
Otherwise, document the intentional asymmetry.

**Status:** OPEN

---

### V7-L-02: FundTokensFacet.onlyFundAdmin Modifier Uses Hardcoded Index

**Severity:** LOW
**Category:** Access Control
**Location:** `src/facets/FundTokensFacet.sol` lines 51-54

**Description:**
The `onlyFundAdmin` modifier checks `s.FundTokens[0].fundAdmin`. This is initialized to the diamond address in `InitDiamond.sol` (line 29). The `mint` and `burn` functions use this modifier, which means only the diamond itself (via delegatecall from other facets) can mint/burn. This is the correct behavior for the current architecture — other facets call `FundTokensFacet(address(this)).mint(...)` which executes as a delegatecall within the Diamond.

However, if `fundAdmin` were ever changed to an external address (via a future admin function), it would break the architecture since external calls to `mint`/`burn` would bypass the Diamond's access control system.

**Impact:**
Low — the current architecture is correct. This is a maintenance risk if `fundAdmin` is ever made configurable.

**Recommendation:**
Consider using `onlyInternalExecution` instead of `onlyFundAdmin` for `mint` and `burn`, or add a comment documenting that `fundAdmin` must always be the diamond address.

**Status:** OPEN

---

### V7-L-03: Transfer History Unbounded Growth

**Severity:** LOW
**Category:** Gas / DoS
**Location:** `src/facets/FundTokensFacet.sol` lines 584-641

**Description:**
`_trackTransferHistoryAndUpdateHoldings` appends to `s.FundTokens[0].transfers` (line 597-610) and `s.FundTokens[0].userTokenTransferIndices` (lines 616-617) on every transfer. These arrays grow without bound. Additionally, `transferIndex` is cast to `uint32` (line 612), limiting total transfers to ~4.29 billion before overflow.

**Impact:**
Over time, view functions that iterate these arrays will become increasingly expensive. The `uint32` cast will silently overflow after ~4.29 billion transfers, causing incorrect index references.

**Recommendation:**
1. Add pagination to transfer history queries (already partially done)
2. Consider using `SafeCast` consistently or documenting the uint32 limit
3. Add a maximum transfer history length or pruning mechanism

**Status:** OPEN

---

### V7-L-04: ERC1155 Burn Calls Acceptance Check Unnecessarily

**Severity:** LOW
**Category:** Gas Optimization
**Location:** `src/facets/FundTokensFacet.sol` lines 455-461

**Description:**
`_burn` calls `_updateWithAcceptanceCheck(from, address(0), ids, values, "")`. While `_updateWithAcceptanceCheck` correctly skips the callback when `to == address(0)` (line 387), calling the wrapper function adds unnecessary overhead. Standard ERC1155 implementations (OpenZeppelin) call `_update` directly for burns.

**Impact:**
Minor gas waste on every burn operation.

**Recommendation:**
Call `_update` directly in `_burn`:
```solidity
function _burn(address from, uint256 id, uint256 value) internal {
    if (from == address(0)) revert ERC1155InvalidSender(address(0));
    (uint256[] memory ids, uint256[] memory values) = _asSingletonArrays(id, value);
    _update(from, address(0), ids, values);
}
```

**Status:** OPEN

---

### V7-I-01: validateTokenTransfer External Self-Call Pattern

**Severity:** INFORMATIONAL
**Category:** Design
**Location:** `src/facets/FundTokensFacet.sol` line 956

**Description:**
`executeTransferToken` calls `this.validateTokenTransfer(...)` using an external call to itself (line 956). This is also done in `transferTokenFromAccount` (line 222). The validation is simple view logic that could be called internally. The external self-call wastes gas and creates a slightly confusing call pattern.

**Impact:**
Minor gas overhead. No security impact.

**Recommendation:**
Extract validation logic into an `internal` function and call it directly.

**Status:** OPEN

---

### V7-I-02: Settlement Does Not Validate Source/Target Cash Token Existence

**Severity:** INFORMATIONAL
**Category:** Input Validation
**Location:** `src/facets/SettlementFacet.sol` lines 164-221

**Description:**
`_settleSubscribe` and `_settleRedeem` resolve `targetCash` via `_resolveCashFundToken(fundId)` which constructs a cash token ID from the fund's umbrella and reporting currency. If the cash token was never created (no `baseInfo` entry), the mint will succeed but the token will exist without proper metadata/registration. The `burn` will also succeed if the investor has balance.

**Impact:**
Very low — in practice, cash tokens are created during umbrella setup. This is a defense-in-depth concern.

**Recommendation:**
Add a check that the resolved cash token ID has been properly registered.

**Status:** OPEN

---

## Summary

| Severity | Count |
|----------|-------|
| CRITICAL | 0 |
| HIGH | 3 |
| MEDIUM | 4 |
| LOW | 4 |
| INFORMATIONAL | 2 |
| **Total** | **13** |

### Prior Findings Status
| ID | Status |
|----|--------|
| H-06 | FIXED |
| H-09 | STILL PRESENT (ACKNOWLEDGED) |
| V3-H02 | PARTIALLY FIXED (cashPendingSwap mechanism, no SETTLED status) |
| V3-H03 | FIXED |
| V5-C01 | FIXED |
| V5-C02 | FIXED |
| V5-H07 | PARTIALLY FIXED (subscribe path only) |
| V5-H08 | FIXED |
| V6-C-02 | STILL PRESENT |
| PHASE5-01 | FIXED |
