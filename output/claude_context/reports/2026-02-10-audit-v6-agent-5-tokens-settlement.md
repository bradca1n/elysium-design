# Audit V6 Agent 5: Tokens, Settlement & FX

**Date:** 2026-02-10
**Auditor:** Agent 5 (Claude Opus 4.6)
**Scope:** FundTokensFacet.sol, SettlementFacet.sol, FXManagementFacet.sol
**Dependencies reviewed:** BaseFacet.sol, TokenIdUtils.sol, Constants.sol, FundAdminStructs.sol, LibAppStorage.sol, MetaContext.sol, AccountFacet.sol (reentrancy guard)

---

## CRITICAL FINDINGS

---

## [CRITICAL] Dual totalSupply Divergence — FundTokensStorage vs FundAdminStorage Not Atomically Updated
**ID:** A5-01
**Location:** `FundTokensFacet.sol:336-363` (FundTokensStorage.totalSupply) vs `OrderManagementFacet.sol:1179-1220` (FundAdminStorage.baseInfo.totalSupply)
**Description:** The system maintains two independent totalSupply tracking mechanisms:
1. `s.FundTokens[0].totalSupply[id]` — updated inside `FundTokensFacet._update()` on every mint/burn
2. `s.FundAdmin[0].baseInfo[id].totalSupply` — updated separately in `OrderManagementFacet._executeOrderTransfer()`, `FeeManagementFacet`, and `NavManagementFacet`

These are NOT updated atomically. When `SettlementFacet._settleSubscribe()` or `_settleRedeem()` calls `FundTokensFacet.mint()` and `FundTokensFacet.burn()`, only `FundTokens[0].totalSupply` is updated. The `FundAdmin[0].baseInfo` totalSupply is NOT updated because settlement only mints/burns **cash fund tokens**, and `baseInfo` tracks fund/class/dealing tokens.

However, if any code path ever calls `FundTokensFacet.mint()` or `burn()` directly for fund/class/dealing tokens (as `FeeManagementFacet` does for fee class tokens at line 202), the `FundAdmin[0].baseInfo` totalSupply may diverge if the update there is skipped or has different rounding.

**Impact:** NAV calculations, dilution ratio calculations, and fee computations that rely on `baseInfo.totalSupply` could use stale values, leading to incorrect pricing and fee extraction. The `FeeManagementFacet` at line 203 does update `baseInfo.totalSupply` after its own mint, but if a new facet is added that mints fund tokens via `FundTokensFacet.mint()` without updating `baseInfo`, silent divergence occurs.

**Recommendation:** Either:
1. Remove the dual tracking and use a single authoritative source, OR
2. Add a hook/callback inside `FundTokensFacet._update()` that automatically syncs `baseInfo.totalSupply` for fund/class/dealing token IDs, OR
3. Document clearly that `FundTokensFacet.mint/burn` must NEVER be called for fund/class/dealing tokens without a corresponding `baseInfo` update.

---

## [CRITICAL] Settlement Does Not Validate sourceAmount > 0 — Zero-Amount Settlement Inflates Processing History
**ID:** A5-02
**Location:** `SettlementFacet.sol:59-110`
**Description:** The `executeConfirmCashFundSettlement` function does not validate that `sourceAmount > 0`. When `sourceAmount == 0`:
- Line 83: `0 > order.cashPendingSwap` is false, so the check passes
- Line 87: `targetAmount = mulDiv(0, effectiveFxRate, PRECISION) = 0`
- Line 175/198: `order.cashPendingSwap -= 0` is a no-op
- Lines 180-183: `unlockTokens(investor, sourceCash, 0)` reverts with `InvalidLockAmount` because `amount == 0`

So in practice, the zero-amount case is caught by `unlockTokens` reverting. However, if the order has `cashPendingSwap == 0` (already fully settled), `sourceAmount == 0` would pass the check at line 83 but still revert at unlock. The real issue is that the settlement can be called repeatedly with tiny dust amounts (e.g., `sourceAmount = 1 wei`) since `cashPendingSwap -= sourceAmount` only decrements by the tiny amount each time, allowing unbounded processing history growth and event spam.

**Impact:** Gas griefing via repeated tiny settlements. Each call appends to `processingHistory`, `cashFundChangeBlocks`, and emits events. A malicious settlement operator could inflate storage costs.

**Recommendation:** Add `if (sourceAmount == 0) revert ISharedErrors.AmountZero();` and consider adding a minimum settlement amount threshold.

---

## HIGH FINDINGS

---

## [HIGH] FX Rate Staleness Not Checked at Settlement Time
**ID:** A5-03
**Location:** `SettlementFacet.sol:118-153`, `FXManagementFacet.sol:112-121`
**Description:** The `_validateSettlementFxRate` function calls `FXManagementFacet.getFXRate()` to get a reference cross-rate, and validates the provided `actualFxRate` against it. However, `getFXRate()` (line 112-121) and `_getRateVsUSD()` (line 244-249) only check that the stored rate is non-zero — they do NOT check the rate's timestamp for staleness.

FX rate staleness is validated at **write time** in `executeUpdateFXRates()` (line 55-57: `rateTimestamp` must be within `DEFAULT_MAX_FX_RATE_AGE` of `block.timestamp`). But once stored, the rate can sit in storage indefinitely. If no rate updates occur for days or weeks, settlement transactions will still use the stale reference rate for deviation validation.

**Impact:** On a private blockchain with infrequent rate updates, settlements could be validated against rates that are days or weeks old. This could allow settlement operators to extract value through stale rate arbitrage, or alternatively, legitimate settlements could be blocked if the stale reference rate has diverged significantly from the actual market rate.

**Recommendation:** Add a staleness check in `_getRateVsUSD()` or `getFXRate()`:
```solidity
FundAdminStructs.FXRateData storage data = s.FundAdmin[0].fxRegistry[currencyCode];
if (data.rateVsUSD == 0) revert ISharedErrors.FXRateNotAvailable(currencyCode, Constants.ISO_USD);
if (block.timestamp - data.timestamp > Constants.DEFAULT_MAX_FX_RATE_AGE) 
    revert ISharedErrors.FXRateTimestampTooOld();
```

---

## [HIGH] ERC1155 Receiver Callback Reentrancy in Settlement — Partial Mitigation
**ID:** A5-04
**Location:** `SettlementFacet.sol:180-183` (subscribe), `SettlementFacet.sol:201-203` (redeem), `FundTokensFacet.sol:452` (_mint calls _updateWithAcceptanceCheck)
**Description:** Settlement operations call `FundTokensFacet.mint()` which internally calls `_updateWithAcceptanceCheck()`, which calls `_checkOnERC1155Received()` on the recipient if it is a contract. This is a cross-facet external call that could trigger reentrancy.

The reentrancy guard in `AccountFacet._executeProposal()` (line 1034-1057) protects the proposal execution path. Since settlement goes through `_validateAndPropose -> AccountFacet.proposeTransactionWithProposer -> confirmTransaction -> _executeProposal`, the reentrancy lock IS active during the ERC1155 callback.

However, the reentrancy guard is set and cleared at the `_executeProposal` level. If the callback re-enters through a non-proposal path (e.g., direct `safeTransferFrom`, `setApprovalForAll`, or any view function that reads state being modified), it could observe inconsistent state. Specifically, during `_settleSubscribe`, between the `burn` at line 181 and `mint` at line 182, the investor's source cash balance is reduced but target cash is not yet minted — a callback at this point could see an inconsistent portfolio.

**Impact:** On a private blockchain, exploitation is limited since external users cannot deploy arbitrary contracts. However, if any whitelisted contract implements `onERC1155Received` with complex logic, it could observe and act on intermediate state.

**Recommendation:** Consider using the `_update` function (without acceptance check) for internal settlement operations where the recipient is a known account address, or add a settlement-specific reentrancy flag.

---

## [HIGH] Missing Validation: FX maxFxSettlementDeviationBps = 0 Disables All FX Rate Validation
**ID:** A5-05
**Location:** `SettlementFacet.sol:144`, `FXManagementFacet.sol:224-225`
**Description:** If `maxFxSettlementDeviationBps` is set to 0 (default), the deviation check is completely skipped (line 144: `if (maxDeviationBps > 0)`). Similarly, `maxFxRateChangeBps = 0` disables rate change validation in `executeUpdateFXRates` (line 78: `if (maxChangeBps > 0 && existingRate > 0)`).

Since the default `FXSafetyConfig` struct has both values at 0, all FX safety checks are disabled by default. A settlement operator or FX updater could submit any rate without validation until an admin explicitly configures safety limits.

**Impact:** An FX updater could set extreme rates (e.g., 1 USD = 1000 EUR) or a settlement operator could provide wildly inaccurate settlement FX rates, causing incorrect token amounts to be minted/burned. Combined with the absence of staleness checks, this creates a significant value extraction vector.

**Recommendation:** Either set sensible defaults at diamond initialization (e.g., `maxFxRateChangeBps = 1000` = 10%, `maxFxSettlementDeviationBps = 500` = 5%), or revert on 0 values instead of treating them as "no limit".

---

## [HIGH] Inconsistent Holdings Return Values: Packed uint64 vs Proper Token IDs
**ID:** A5-06
**Location:** `FundTokensFacet.sol:818`, `FundTokensFacet.sol:832`, `FundTokensFacet.sol:859`
**Description:** Three internal query functions return `uint256(holdings.allDealings[indices[i]])` directly, which yields the **packed uint64** value cast to uint256. Compare this with `_getUmbrellaHoldingsFromHierarchicalSystem` (line 794-798) which properly unpacks via `_unpackHierarchicalDealing` and then reconstructs via `TokenIdUtils.createTokenId`.

In the current implementation, the packing format is:
- `encodeTokenId(uint256 tokenId) -> uint64(tokenId)` (just truncate)
- `decodeTokenId(uint64 packed) -> uint256(packed)` (just zero-extend)
- `createTokenId(u, f, c, d)` produces a value in the lower 64 bits

Since `encodeTokenId` is literally `uint64(tokenId)` and `decodeTokenId` is `uint256(packed)`, the direct cast `uint256(packed)` IS equivalent to going through `_unpackHierarchicalDealing` + `createTokenId`. So this is **not a bug** in the current implementation, but it is inconsistent — `_getUmbrellaHoldingsFromHierarchicalSystem` does the full unpack/repack while three other functions do a direct cast. If the encoding ever changes, the direct-cast functions would break silently.

**Impact:** Currently no functional bug. But a maintenance hazard: if the token ID encoding changes (e.g., to use bits above 64), the three direct-cast functions would return wrong token IDs while the unpack/repack function would still be correct.

**Recommendation:** Use the same unpack/repack pattern in all four functions for consistency. Or document the equivalence explicitly.

---

## MEDIUM FINDINGS

---

## [MEDIUM] Unbounded Transfer History Array Growth — Gas DoS for View Functions
**ID:** A5-07
**Location:** `FundTokensFacet.sol:597-610` (transfers array), `FundTokensFacet.sol:616-617` (userTokenTransferIndices)
**Description:** Every mint, burn, and transfer appends to `s.FundTokens[0].transfers` (a global array) and to `s.FundTokens[0].userTokenTransferIndices[from/to][tokenId]` (per-user, per-token arrays). These arrays grow without bound and are never pruned.

The `transfers` array is accessed via `getTransfer(index)` which is O(1), but `getUserTokenTransferIndices` returns the entire array. For a heavily-traded token with thousands of operations, this array becomes expensive to read.

**Impact:** View functions that iterate over transfer indices could exceed block gas limits on queries. On a private blockchain with higher gas limits this may be tolerable, but for any external RPC calls, large arrays could cause timeouts.

**Recommendation:** Add pagination to `getUserTokenTransferIndices`, or cap the number of entries tracked per user-token pair, or provide a paginated view function.

---

## [MEDIUM] Zero-Amount Mint/Burn Not Validated at Entry Point
**ID:** A5-08
**Location:** `FundTokensFacet.sol:252-258`
**Description:** The `mint` and `burn` external functions do not validate that `amount > 0`. While the `validateTokenTransfer` view function (line 80) checks `value == 0`, it is not called during mint/burn. The `_update` function (line 299-377) processes zero amounts without reverting — it just does nothing (no balance change, no supply change). However, it still emits a `TransferSingle` event with value=0 and appends to transfer history (line 592: `if (from != to && values[i] > 0)` — the `values[i] > 0` check in `_trackTransferHistoryAndUpdateHoldings` does correctly skip zero values).

Wait — re-reading line 592: the condition `values[i] > 0` means zero-value transfers skip history tracking. And the `_update` function's loops process zero values as no-ops (adding/subtracting 0). So the only observable effect is the `TransferSingle` event emission with value=0 on line 369. This event emission is per ERC1155 spec but is misleading.

**Impact:** Low practical impact since the diamond is the only entity that can call `mint`/`burn` (via `onlyFundAdmin`). But emitting transfer events with zero values pollutes event logs and could confuse off-chain indexers.

**Recommendation:** Add `if (amount == 0) revert ISharedErrors.AmountZero();` to both `mint` and `burn` functions.

---

## [MEDIUM] _validateSettlementFxRate Is Internal View — Return Value Not Relevant But Function Could Silently Skip Validation
**ID:** A5-09
**Location:** `SettlementFacet.sol:90-92`
**Description:** The `_validateSettlementFxRate` function at line 91 is called but it is `internal view` and reverts on failure (via `revert ISharedErrors.FXRateDeviationExceedsLimit`). The function does NOT return a value — it either succeeds silently or reverts. This is correct behavior.

However, at line 90, the validation is only called when `effectiveFxRate != Constants.PRECISION`. This means same-currency settlements (where `actualFxRate == 0`, resolved to `PRECISION` at line 86) skip FX validation entirely. This is intentional for same-currency, but a settlement operator could bypass FX validation by passing `actualFxRate = 0` even for cross-currency settlements.

Looking more closely: if `actualFxRate == 0`, then `effectiveFxRate = PRECISION`, and `targetAmount = sourceAmount * PRECISION / PRECISION = sourceAmount`. So the operator would be saying "1:1 exchange rate". For cross-currency pairs, this would mint the wrong amount of target tokens. The validation skip at line 90 means this would go through unchecked.

Wait — the check at line 138 (`if (sourceCurrency != targetCurrency)`) inside `_validateSettlementFxRate` would catch this... but line 90 prevents the function from even being called when `effectiveFxRate == PRECISION`. So if the currencies are different but the operator provides `actualFxRate = 0` (meaning 1:1), the validation is skipped.

**Impact:** A settlement operator could force a 1:1 exchange rate on cross-currency settlements by passing `actualFxRate = 0`. For EUR/USD this would mean ~8% value extraction. This is constrained by the fact that settlement operators are trusted roles on a private blockchain, but it bypasses the FX safety guardrails that were designed to catch exactly this.

**Recommendation:** After resolving `effectiveFxRate`, check whether the currencies are actually the same before skipping validation:
```solidity
if (sourceCurrency != targetCurrency && effectiveFxRate == Constants.PRECISION) {
    revert ISharedErrors.SameCurrencyRateMustBePrecision();
}
```
Or always call `_validateSettlementFxRate` and let it handle the same-currency case internally.

---

## [MEDIUM] Hierarchical Holdings Never Pruned — Monotonic Growth
**ID:** A5-10
**Location:** `FundTokensFacet.sol:700-716`
**Description:** The `_updateHierarchicalHoldingsForTransfer` function adds entries to the hierarchical holdings system when a recipient receives dealing tokens (line 705-708), but explicitly does NOT remove entries when the sender's balance reaches zero (line 712-716, with comment "We don't remove tokens from holdings when balance becomes 0").

While this design is intentional (for historical tracking), the `allDealings` array and all index arrays grow monotonically. The `_filterZeroBalanceTokens` function (line 900-943) iterates over the full unfiltered array to filter out zero-balance entries, doubling the iteration cost.

**Impact:** For users who participate in many dealing periods across many funds, the unfiltered arrays grow large. The double-iteration in `_filterZeroBalanceTokens` (once to count, once to copy) means gas cost scales as O(2n) with total historical holdings. On a private blockchain this may be acceptable, but for users with hundreds of dealings, view functions become expensive.

**Recommendation:** Consider adding an optional pruning function that authorized callers can invoke to remove zero-balance entries, or maintain a separate count of non-zero entries to avoid the counting pass.

---

## [MEDIUM] FX Rate Cross-Rate Precision Loss in Triangulation
**ID:** A5-11
**Location:** `FXManagementFacet.sol:120`
**Description:** The cross-rate formula at line 120 is:
```solidity
return (quoteVsUSD * Constants.PRECISION) / baseVsUSD;
```
This performs integer division, which truncates. For currencies with very similar rates (e.g., EUR at 0.92e18 and GBP at 0.79e18), the cross-rate EUR->GBP:
```
= (0.79e18 * 1e18) / 0.92e18
= 0.79e36 / 0.92e18
= ~0.8587e18
```
The precision loss from integer division is at most 1 wei (1e-18), which is negligible for practical purposes. However, for settlement validation at line 148-149:
```solidity
uint256 deviationBps = (diff * Constants.BPS_DENOMINATOR) / referenceCrossRate;
```
The 1 wei truncation error in the cross-rate could compound with the truncation in deviation calculation, potentially causing legitimate settlement rates to be rejected if `maxDeviationBps` is set very tight (e.g., 1 bps).

**Impact:** Very tight FX deviation limits (1-5 bps) could incorrectly reject valid settlement rates due to precision loss in triangulation. This affects operational efficiency but not security directly.

**Recommendation:** Document the minimum practical value for `maxFxSettlementDeviationBps` (e.g., at least 10 bps to account for precision loss), or use `Math.mulDiv` with rounding up for the cross-rate calculation when used for validation.

---

## [MEDIUM] Settlement Can Process Orders in Wrong State — FILLED Accepted for Redeem
**ID:** A5-12
**Location:** `SettlementFacet.sol:74-81`
**Description:** The settlement logic accepts FILLED status for redeem settlements (line 78: `current.status != FundAdminStructs.OrderStatus.FILLED && current.status != FundAdminStructs.OrderStatus.PENDING`). This means a redeem order that has already been fully processed (FILLED) can still have settlement applied to it, as long as `cashPendingSwap > 0`.

The logic is: a redeem order is first filled (dealing tokens burned, cash minted and locked), then settlement is needed to swap the cash cross-umbrella. So FILLED is the expected state for redeem settlement. This is architecturally correct BUT creates a subtle issue: if `cashPendingSwap` was set incorrectly or if partial settlement has already occurred, additional settlement calls could mint extra target tokens.

The protection is `sourceAmount > order.cashPendingSwap` (line 83), which limits total settlement to the original pending swap amount. Since `cashPendingSwap` is decremented on each settlement (line 198), this is bounded.

**Impact:** Low — the `cashPendingSwap` accounting provides the necessary guard. But the multi-state acceptance (PENDING or FILLED) increases the attack surface and could be confusing.

**Recommendation:** No immediate fix needed, but add documentation clarifying why both states are accepted for redeem settlement.

---

## LOW FINDINGS

---

## [LOW] Missing Event for setLockAuthorization
**ID:** A5-13
**Location:** `FundTokensFacet.sol:283-285`
**Description:** The `setLockAuthorization` function changes the `canLockTokens` mapping but does not emit an event. This is a state change that affects access control (who can lock/unlock tokens) and should be logged for audit trail purposes.

**Impact:** Off-chain systems cannot track changes to lock authorization without monitoring storage directly. Makes debugging and compliance auditing more difficult.

**Recommendation:** Add an event:
```solidity
event LockAuthorizationChanged(address indexed locker, bool authorized);
```

---

## [LOW] Missing Event for setApprovalForAll via MetaContext
**ID:** A5-14
**Location:** `FundTokensFacet.sol:191-193`
**Description:** The `setApprovalForAll` function uses `_msgSender()` from `MetaContext`, which supports meta-transactions via a trusted forwarder. If a meta-transaction sets approval, the emitted `ApprovalForAll` event will show the meta-transaction sender (the extracted address) as the account, not `msg.sender`. This is correct behavior for ERC2771, but off-chain systems must be aware of this distinction.

**Impact:** Informational — no security issue, but off-chain indexers that filter by `msg.sender` could miss meta-transaction approvals.

**Recommendation:** Document the meta-transaction behavior for event consumers.

---

## [LOW] Operator Approval System Enables Token Theft by Approved Operators
**ID:** A5-15
**Location:** `FundTokensFacet.sol:191-202`
**Description:** The standard ERC1155 `setApprovalForAll` + `safeTransferFrom` pattern allows an approved operator to transfer any token on behalf of the approver. On a public blockchain this is standard, but in a B2B fund administration context, an operator approved for one purpose could transfer tokens the user did not intend.

The `safeTransferFrom` function (line 195-203) checks `isApprovedForAll(from, sender)` and then executes the transfer. There is no per-token or per-amount approval mechanism.

**Impact:** Low on a private blockchain with known participants. But if an investor approves an operator (e.g., for a specific workflow), that operator has blanket authority over all the investor's tokens.

**Recommendation:** Consider implementing a more granular approval mechanism (per-token-type or per-amount) for production use, or document the risks of blanket approval in user-facing documentation.

---

## [LOW] addressZeroHoldings Tracks Non-Dealing Tokens Incorrectly
**ID:** A5-16
**Location:** `FundTokensFacet.sol:623-638`
**Description:** The `_addToAddressZeroHoldings` is called for all token types (cash, fund, class, dealing) during mints. However, `getUserHoldingsFromHierarchicalSystem(address(0))` (line 873-881) returns these packed uint64 values as token IDs. For cash fund tokens and other non-dealing tokens, these entries exist in `addressZeroHoldings` but are not part of the hierarchical holdings system (which only tracks dealing tokens, per line 702).

The `getUserHoldings(address(0))` correctly filters via `_filterZeroBalanceTokens` checking `totalSupply(tokenId) > 0`. But the raw `getUserHoldingsFromHierarchicalSystem(address(0))` returns all tokens including burned ones, which could be misleading.

**Impact:** Low — view function returns potentially stale data for address(0) queries. The filtered `getUserHoldings` is correct.

**Recommendation:** Document that `getUserHoldingsFromHierarchicalSystem(address(0))` may include tokens with zero totalSupply and should be filtered.

---

## INFORMATIONAL FINDINGS

---

## [INFO] FX Rate maxChangeBps Bypass on First Rate Update
**ID:** A5-17
**Location:** `FXManagementFacet.sol:78`
**Description:** The rate change check `if (maxChangeBps > 0 && existingRate > 0)` is bypassed when `existingRate == 0` (first-time rate). This allows the first rate to be any value up to `MAX_FX_RATE_MULTIPLIER * PRECISION` (1000e18). This is by design (you need to set an initial rate), but means the first rate update for any new currency has no change limit.

**Impact:** Informational — expected behavior but worth noting for audit completeness.

---

## [INFO] Cash Fund Token Isolation Is Correctly Enforced by Token ID Encoding
**ID:** A5-18
**Location:** `TokenIdUtils.sol:88-90`
**Description:** Cash fund token IDs encode the umbrella ID in bits 48-63 and the currency code in bits 16-31 (class field). Two cash tokens from different umbrellas will have different umbrella IDs, making them distinct tokens with separate balances. There is no cross-umbrella token ID collision possible because the umbrella field differs.

Token ID collision between cash tokens and dealing tokens is also impossible because cash tokens have `fund=0` while dealing tokens have `fund!=0`.

**Impact:** None — the isolation is correctly enforced by the encoding scheme.

---

## [INFO] SafeCast Usage Prevents uint32 Overflow for Block Numbers and Timestamps
**ID:** A5-19
**Location:** `FundTokensFacet.sol:590,604,612`
**Description:** `SafeCast.toUint32(block.timestamp)` and `SafeCast.toUint32(block.number)` will revert if these values exceed uint32 max (4,294,967,295). For timestamps, this occurs in year 2106. For block numbers on a private blockchain, this depends on block production rate.

**Impact:** Informational — no near-term risk.

---

## SUMMARY TABLE

| ID | Severity | Title | File |
|----|----------|-------|------|
| A5-01 | CRITICAL | Dual totalSupply divergence risk | FundTokensFacet.sol + OrderManagementFacet.sol |
| A5-02 | CRITICAL | Settlement accepts zero/dust sourceAmount | SettlementFacet.sol:59-110 |
| A5-03 | HIGH | FX rate staleness not checked at settlement time | SettlementFacet.sol:118-153, FXManagementFacet.sol:244-249 |
| A5-04 | HIGH | ERC1155 callback reentrancy during settlement (partial mitigation) | SettlementFacet.sol:180-183 |
| A5-05 | HIGH | Default FX safety config disables all validation | FXManagementFacet.sol, SettlementFacet.sol |
| A5-06 | HIGH | Inconsistent holdings return: packed uint64 vs proper unpack | FundTokensFacet.sol:818,832,859 |
| A5-07 | MEDIUM | Unbounded transfer history array growth | FundTokensFacet.sol:597-617 |
| A5-08 | MEDIUM | Zero-amount mint/burn not validated | FundTokensFacet.sol:252-258 |
| A5-09 | MEDIUM | Settlement FX validation bypass via actualFxRate=0 | SettlementFacet.sol:86-92 |
| A5-10 | MEDIUM | Hierarchical holdings never pruned | FundTokensFacet.sol:700-716 |
| A5-11 | MEDIUM | FX cross-rate precision loss in triangulation | FXManagementFacet.sol:120 |
| A5-12 | MEDIUM | Settlement accepts FILLED status for redeem | SettlementFacet.sol:74-81 |
| A5-13 | LOW | Missing event for setLockAuthorization | FundTokensFacet.sol:283-285 |
| A5-14 | LOW | Meta-transaction approval event attribution | FundTokensFacet.sol:191-193 |
| A5-15 | LOW | Operator approval enables blanket token transfer | FundTokensFacet.sol:191-202 |
| A5-16 | LOW | addressZeroHoldings includes non-dealing tokens | FundTokensFacet.sol:623-638 |
| A5-17 | INFO | FX rate maxChangeBps bypass on first update | FXManagementFacet.sol:78 |
| A5-18 | INFO | Cash fund token isolation correctly enforced | TokenIdUtils.sol:88-90 |
| A5-19 | INFO | SafeCast uint32 overflow year 2106 | FundTokensFacet.sol:590-612 |

**Totals:** 2 Critical, 4 High, 6 Medium, 4 Low, 3 Informational = 19 findings
