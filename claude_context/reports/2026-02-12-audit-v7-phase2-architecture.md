# V7 Audit — Phase 2: Architecture Review

**Date:** 2026-02-12

## Storage Architecture

**Root:** `AppStorage` at slot 0 with 4 namespaced domains:
- `s.FundAdmin[0]` — funds, classes, dealings, orders, umbrellas, currencies, FX, adjustments
- `s.FundTokens[0]` — ERC1155 balances, supply, transfers, hierarchical holdings
- `s.Account[0]` — accounts, permissions, proposals, wallet-account registry
- `s.PerformanceFeeCalculator[0]` — fee calculation window config

**Global flags (AppStorage root):**
- `diamondInitialized` (bool) — prevents re-initialization
- `internalExecutionContext` (bool) — set during execute* delegatecalls
- `reentrancyLock` (bool) — reentrancy guard for proposal execution

## Access Control Model

### _validateAndPropose() (BaseFacet.sol:109-165)
Central permission checkpoint. All state-modifying operations route through this:
1. Verify account exists
2. Check caller has OPERATOR permission for account
3. Verify role (MANAGER per-fund, others global, USER = no check)
4. Encode and delegatecall to `proposeTransactionWithProposer`
5. Sets `internalExecutionContext = true` BEFORE delegatecall, `false` AFTER

**Architecture Risk:** Between delegatecall and reset (lines 151-153), `internalExecutionContext` is `true`. If the delegatecall triggers an ERC1155 callback that re-enters, the guard is already set.

### Role Hierarchy
| Role | Scope | Storage |
|------|-------|---------|
| ROLE_USER | None | No check |
| ROLE_MANAGER | Per-fund | `funds[fundId].manager` |
| ROLE_ADMIN | Global | `roles[ROLE_ADMIN][addr]` |
| ROLE_NAV_UPDATER | Global | `roles[ROLE_NAV_UPDATER][addr]` |
| ROLE_FX_UPDATER | Global | `roles[ROLE_FX_UPDATER][addr]` |
| ROLE_SETTLEMENT | Global | `roles[ROLE_SETTLEMENT][addr]` |

**Note:** Legacy `admins`, `navUpdaters`, `settlementOperators` mappings still exist in storage alongside the unified `roles` mapping. Verify no code path uses the legacy mappings.

## Dual Supply Tracking (V6 C-01 — BY DESIGN)

Two independent totalSupply trackers remain:
1. `FundTokensStorage.totalSupply[id]` (line 106) — actual ERC1155 token count
2. `FundAdminStorage.baseInfo[id].totalSupply` — pricing cascade multiplier

Per AUDIT_STATUS.md T-40: "BY DESIGN — different purposes." V5-C04 was FALSE POSITIVE.
**However:** V6 C-01 found specific divergence paths where fee minting updates FundTokens but not baseInfo. This needs Phase 3 verification.

## FX Safety Config

`FXSafetyConfig fxSafetyConfig` — single global struct (not per-fund).
**InitDiamond does NOT set FX safety defaults** — all fields default to zero.
This is the root cause of V6 C-02 (FX bypass via zero defaults).

Key config fields to verify:
- `maxFxRateDeviation` — 0 = no deviation check
- `maxFxRateAge` — 0 = no age check (but DEFAULT_MAX_FX_RATE_AGE constant exists at 1 day)

## Trust Boundaries

```
External Wallet → Diamond Proxy
  ↓ delegatecall
Facet Function (validateAndPropose checks permissions)
  ↓ delegatecall (if threshold met)
execute* Function (onlyInternalExecution modifier)
  ↓ delegatecall
FundTokensFacet (mint/burn/lock/unlock/transfer)
  ↓ external call
ERC1155 Callback (onERC1155Received) → REENTRANCY VECTOR
```

## Cross-Facet Call Map (Key Paths)

| Caller | Callee | Method |
|--------|--------|--------|
| NavManagement | FeeManagement | `mintAllPendingManagementFees` |
| OrderManagement | FundManagement | `createDealing` |
| OrderManagement | FundTokens | `lockTokens/unlockTokens/mint/burn` |
| Settlement | FundTokens | `unlockTokens/burn/mint` |
| Settlement | FXManagement | `getFXRate` |
| FeeManagement | FundTokens | `mint` |
| FundLifecycle | OrderManagement | `executeCancelOrder` |
| FundLifecycle | FundTokens | `lockTokens` |
| ClassAdjustment | NavManagement | (reads price data) |

## InitDiamond Observations

1. Registers 5 currencies (USD, EUR, GBP, CHF, JPY) — no CNY/SGD/HKD (defined as constants but not registered)
2. Creates Elysium umbrella (ID 1) with USD cash token
3. Sets PerformanceFeeCalculator windowDays = 252
4. **Does NOT set FX safety config** — all safety checks defaulted to disabled
5. **Does NOT set protocol safety config** — per-fund safety also defaulted to disabled
6. canLockTokens grants to diamond address only

## Key Architecture Risks for Phase 3

1. **Reentrancy via ERC1155 callbacks** — reentrancyLock exists but need to verify all entry points are covered
2. **Dual totalSupply divergence** — BY DESIGN claim needs verification against fee minting paths
3. **FX safety defaults zero** — deployment without explicit safety config = no validation
4. **Legacy storage fields** — old admins/navUpdaters mappings alongside unified roles
5. **internalExecutionContext race** — set true before delegatecall, reset after
6. **Unbounded arrays** — price history, fee history, adjustment history, user order indices
