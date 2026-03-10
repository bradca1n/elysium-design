# Audit V8 — Phase 2: Architecture Review
<!-- 2026-03-02 -->

## Architecture Overview

Elysium uses the **Diamond Proxy pattern (EIP-2535)** with 18 contracts (16 business facets + DiamondProxy + InitDiamond). All facets share `AppStorage` at storage slot 0 via `AppStorageRoot`.

### Storage Layout (AppStorage)

```
AppStorage (slot 0)
├── diamondInitialized: bool
├── internalExecutionContext: bool  ← CRITICAL: set during all execute* calls
├── reentrancyLock: bool            ← Only guards _executeProposal
├── metaTxContext: MetaTxContextStorage (trustedForwarder address)
├── FundAdmin: mapping[0 → FundAdminStorage]
├── FundTokens: mapping[0 → FundTokensStorage]
├── PerformanceFeeCalculator: mapping[0 → PerformanceFeeCalculatorStorage]
└── Account: mapping[0 → AccountStorage]
```

### Execution Flow

```
External Call → Diamond fallback → delegatecall → Facet function
    │
    └─ Non-execute* functions: → _validateAndPropose() → proposeTransactionWithProposer
                                    → if threshold met: _executeProposal()
                                         → reentrancyLock = true
                                         → internalExecutionContext = true
                                         → delegatecall to execute* function
                                         → internalExecutionContext = false
                                         → reentrancyLock = false
```

### Role System

| Role | Type | Enforcement |
|------|------|-------------|
| ROLE_USER | bytes32(0) | No check required |
| ROLE_MANAGER | keccak("MANAGER") | Per-fund: `funds[fundId].manager == account` |
| ROLE_ADMIN | keccak("ADMIN") | Global: `roles[ROLE_ADMIN][account]` |
| ROLE_NAV_UPDATER | keccak("NAV_UPDATER") | Global unified roles mapping |
| ROLE_FX_UPDATER | keccak("FX_UPDATER") | Global unified roles mapping |
| ROLE_SETTLEMENT | keccak("SETTLEMENT") | Global unified roles mapping |

### Trust Boundaries

**Fully trusted (Diamond Owner):** Can upgrade facets via diamondCut, set FundTokens owner, transfer ownership
**Admin role:** Can set protocol safety config, register currencies, manage roles
**Manager role (per-fund):** Can create classes, set dealing schedules, manage fund settings
**NAV Updater:** Calls updateNav — highest operational impact (sets fund prices)
**FX Updater:** Updates FX rates — affects all cross-currency calculations
**Settlement operator:** Confirms cash fund settlements — moves tokens

---

## Critical Finding: internalExecutionContext Bypass (ARCH-01)

### Description

`internalExecutionContext` is a single shared boolean in AppStorage that enables `onlyInternalExecution` modifiers. It is set to `true` for the duration of ANY `execute*` function call. Since ERC1155 mint/burn operations trigger `onERC1155Received` callbacks on recipient contracts, a malicious recipient contract can **directly call ANY `execute*` function on the Diamond** while `internalExecutionContext = true`.

### Attack Path

```
1. Legitimate user calls Diamond → propose/confirm → _executeProposal →
   internalExecutionContext = true → executeConfirmCashFundSettlement
2. Settlement function calls FundTokensFacet.mint(maliciousContract, ...)
3. Diamond calls maliciousContract.onERC1155Received(...)
4. maliciousContract calls Diamond.executeCreateFund(addr, encodedData)
   — onlyInternalExecution passes! (internalExecutionContext is still true)
5. Fund created with attacker's parameters, bypassing proposal/multisig system
```

### Impact

- **All execute* functions** (createFund, createDealing, createClass, mintAllPendingManagementFees, confirmCashFundSettlement, cancelOrder, processOrders, updateNav, updateFxRates, etc.) are callable by ANY address that can receive ERC1155 tokens
- Bypasses multisig/threshold requirements entirely
- Bypasses role checks that are encoded in `functionData` (the role check happens in `_validateAndPropose`, not in `execute*` functions)

**NOTE:** The `reentrancyLock` does NOT protect against this — it only prevents re-entering `_executeProposal` via `confirmTransaction`. Direct calls to execute* functions are not guarded by `reentrancyLock`.

### Severity: CRITICAL (new finding, not in E-BC catalog)

### Mitigation

Extend `reentrancyLock` to protect ALL entry points via the Diamond fallback, or add a second guard specifically for `internalExecutionContext` that prevents direct external calls when the flag is set from an active execution chain.

---

## Architecture Finding ARCH-02: reentrancyLock Scope

### Description

`reentrancyLock` exists in AppStorage and is correctly applied in `AccountFacet._executeProposal` (lines 1036-1058). This prevents re-entering via `confirmTransaction → _executeProposal`. However, it does NOT protect:
- Direct calls to execute* functions (see ARCH-01)
- `_validateAndPropose` calls initiated during ERC1155 callbacks
- Any function callable without going through `_executeProposal`

### Severity: HIGH (partial protection)

---

## Architecture Finding ARCH-03: Dual Authorization Models

### Description

`FundTokensFacet` has its own separate `owner` and `fundAdmin` storage fields (`s.FundTokens[0].owner`) that are distinct from the Diamond owner (LibDiamond). `setLockAuthorization` uses `onlyOwner` (FundTokens owner), not `onlyOwnerDiamond` (Diamond owner). The `canLockTokens` allowlist determines who can call `lockTokens`/`unlockTokens`.

**Risk:** If `s.FundTokens[0].owner` is initialized to a compromised address or address(0), the lock authorization system can be modified without Diamond owner knowledge.

**Also:** `MetaContext._msgSender()` uses a trusted forwarder pattern — need to verify this is properly initialized and cannot be manipulated.

### Severity: MEDIUM (needs Phase 3 verification)

---

## Architecture Finding ARCH-04: Unchecked MAX_ADJUSTED_FEE_RATE_BPS

### Description

`Constants.MAX_ADJUSTED_FEE_RATE_BPS = 2000` (20% max performance fee) is defined but its enforcement at runtime needs verification. E-BC28 identified that `OrderToProcess.perfFeeBps` from admin input may only be checked against `BPS_DENOMINATOR` (100%), not `MAX_ADJUSTED_FEE_RATE_BPS`. Phase 3 agents must verify.

### Severity: HIGH (to verify in Phase 3)

---

## Call Graph Summary (from Slither)

### Primary Risk Chains

**Chain 1: Settlement → ERC1155 callback (ARCH-01 vector)**
```
confirmTransaction → _executeProposal → executeConfirmCashFundSettlement
  → _settleSubscribe → FundTokensFacet.mint → onERC1155Received [ATTACK POINT]
  → _settleRedeem → FundTokensFacet.burn/mint → onERC1155Received [ATTACK POINT]
```

**Chain 2: NAV Update → Fee Mint → ERC1155 callback**
```
executeUpdateNav → _updateNavInternal → mintAllPendingManagementFees
  → FundTokensFacet.mint → onERC1155Received [ATTACK POINT]
```

**Chain 3: Order Processing → Token Transfer → ERC1155 callback**
```
executeProcessOrders → _processOrdersImpl → _executeOrderTransfer
  → FundTokensFacet.mint/burn → onERC1155Received [ATTACK POINT]
```

### Cross-Facet Delegatecall Dependencies (dotted arrows in graph)

| Caller | Callee | Purpose |
|--------|--------|---------|
| FeeManagementFacet | FundTokensFacet | mint (fee tokens) |
| FeeManagementFacet | NavManagementFacet | calculateClassPrice, calculateFundPrice |
| SettlementFacet | FundTokensFacet | burn/mint/lock/unlock |
| OrderManagementFacet | FundTokensFacet | mint/burn/lock/unlock |
| FundManagementFacet | FundTokensFacet | mint/burn (dealing conversion) |
| FundManagementFacet | NavManagementFacet | calculateClassPrice/DealingPrice |
| FundLifecycleFacet | FundTokensFacet | lockTokens |
| ViewCallsFacet | NavManagementFacet | calculateFundPrice/ClassPrice |
| ViewCalls2Facet | NavManagementFacet | calculateFundPrice/ClassPrice |

---

## Key Architecture Rules Verified

1. ✅ AppStorage at slot 0 via `AppStorageRoot` (Slither false positive on HIGH)
2. ✅ All `execute*` functions have `onlyInternalExecution` (partial — see E-BC16 for exceptions)
3. ✅ `reentrancyLock` present and used in proposal execution path
4. ⚠️ `reentrancyLock` scope is insufficient (ARCH-01/ARCH-02)
5. ✅ Storage structs are append-only (verified comment in LibAppStorage)
6. ✅ Custom errors used throughout (E-BC02 compliant)
7. ✅ No magic numbers in business logic — Constants library used (E-BC03)
8. ⚠️ `canLockTokens` access controlled by separate FundTokens owner (ARCH-03)
9. ⚠️ `MAX_ADJUSTED_FEE_RATE_BPS` enforcement at runtime needs Phase 3 verification (ARCH-04)
