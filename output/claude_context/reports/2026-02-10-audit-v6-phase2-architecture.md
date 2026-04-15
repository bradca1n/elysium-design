# Security Audit V6 — Phase 2: Architecture Review

**Date:** 2026-02-10
**Branch:** multiCurrency

---

## 1. Access Control Map

### Pattern A: `_validateAndPropose` (Account-Based Role Check)
The primary access control pattern. External function → `_validateAndPropose(account, selector, role, scope, data)` → checks account exists + caller has OPERATOR permission + account has required role → creates/executes proposal via delegatecall.

| Facet | Function | Role | Scope |
|-------|----------|------|-------|
| **OrderManagementFacet** | submitOrder | ROLE_USER | 0 |
| **OrderManagementFacet** | cancelOrder | ROLE_USER | 0 |
| **OrderManagementFacet** | processOrders | ROLE_ADMIN | 0 |
| **NavManagementFacet** | updateNav | ROLE_NAV_UPDATER | 0 |
| **NavManagementFacet** | setProtocolSafetyConfig | ROLE_ADMIN | 0 |
| **FeeManagementFacet** | batchMintPerformanceFees | ROLE_MANAGER | fundId |
| **FeeManagementFacet** | setWindowDays | ROLE_ADMIN | 0 |
| **FundManagementFacet** | createUmbrellaFund | ROLE_ADMIN | 0 |
| **FundManagementFacet** | createFund | onlyOwnerDiamond (direct) | — |
| **FundManagementFacet** | createShareClass | ROLE_MANAGER | fundId |
| **FundManagementFacet** | setDealingSchedule | ROLE_MANAGER | fundId |
| **FundManagementFacet** | setClassSubscriptionRules | ROLE_MANAGER | fundId |
| **FundManagementFacet** | onramp | ROLE_ADMIN | 0 |
| **FundManagementFacet** | offramp | ROLE_ADMIN | 0 |
| **FundManagementFacet** | batchConvertDealingTokens | ROLE_MANAGER | fundId |
| **FundManagementFacet** | setMaxCapacity | ROLE_MANAGER | fundId |
| **FundManagementFacet** | setPerformanceFeeCalculator | ROLE_MANAGER | fundId |
| **FundManagementFacet** | setHurdleFund | ROLE_MANAGER | fundId |
| **FundLifecycleFacet** | retireFund/Class | ROLE_MANAGER | fundId |
| **FundLifecycleFacet** | closeFund/Class | ROLE_ADMIN | 0 |
| **FundLifecycleFacet** | reactivateFund/Class | ROLE_ADMIN | 0 |
| **FundLifecycleFacet** | forceSubmitRedemptionOrder | ROLE_ADMIN | 0 |
| **FundLifecycleFacet** | cancelPendingSubscribes | ROLE_ADMIN | 0 |
| **SettlementFacet** | confirmCashFundSettlement | ROLE_SETTLEMENT | 0 |
| **FXManagementFacet** | updateFXRates | ROLE_FX_UPDATER | 0 |
| **FXManagementFacet** | setFXSafetyConfig | ROLE_ADMIN | 0 |
| **ClassAdjustmentFacet** | postClassAdjustment | ROLE_ADMIN | 0 |
| **ClassAdjustmentFacet** | cancelPendingAdjustment | ROLE_ADMIN | 0 |
| **EligibilityFacet** | setAccountAttributes | ROLE_ADMIN | 0 |
| **EligibilityFacet** | setClassEligibilityRequirements | ROLE_MANAGER | fundId |
| **AccountFacet** | createAccount | ROLE_ADMIN | 0 |
| **AccountFacet** | updateAccountEligibility | ROLE_ADMIN | 0 |
| **AccountFacet** | setAccountManager | ROLE_ADMIN | 0 |
| **FundTokensFacet** | transferTokenFromAccount | ROLE_USER | 0 |
| **AdminViewCallsFacet** | activateUmbrellaCurrency | ROLE_ADMIN | 0 |
| **AdminViewCallsFacet** | deactivateUmbrellaCurrency | ROLE_ADMIN | 0 |

### Pattern B: `onlyOwnerDiamond` (Diamond Owner Direct)
Only the Diamond contract owner can call these.

| Facet | Function |
|-------|----------|
| **FundManagementFacet** | createFundWithCurrency, setNavUpdater, updateAdmin, setSettlementOperator |
| **AdminViewCallsFacet** | registerCurrency, deactivateCurrency, setFxUpdater |

### Pattern C: `onlyInternalExecution` (Execute Functions)
All 48 `execute*` functions across all facets use this modifier. Only callable when `s.internalExecutionContext == true`, which is ONLY set by `_validateAndPropose` during its delegatecall.

### Pattern D: `onlyFundAdmin` / `onlyAuthorizedLocker` (FundTokensFacet)
Custom modifiers for token operations:
- `onlyFundAdmin`: `_msgSender() == s.FundTokens[0].fundAdmin` — gates mint/burn
- `onlyAuthorizedLocker`: `s.FundTokens[0].canLockTokens[_msgSender()]` — gates lockTokens/unlockTokens

### Pattern E: No Access Control (View Functions)
ALL view functions across ViewCallsFacet, ViewCalls2Facet, AdminViewCallsFacet, ManagerViewCallsFacet have **NO access control**. Any address with RPC access can call admin and manager views.

### Pattern F: Standard ERC1155 (FundTokensFacet)
safeTransferFrom, safeBatchTransferFrom, setApprovalForAll use standard `_msgSender()` + approval pattern. No additional role checks.

---

## 2. Architecture Findings

### ARCH-01: [MEDIUM] MetaContext Trusted Forwarder — Spoofable `_msgSender()`

**Location:** `src/shared/MetaContext.sol:15-25`

`_msgSender()` can return a spoofed sender if `msg.sender == trustedForwarder`. The forwarder is stored in `s.metaTxContext.trustedForwarder`. If this is set (non-zero), anyone who can call through the forwarder can impersonate any address.

**Impact:** Affects FundTokensFacet (safeTransferFrom, mint, burn, lock, unlock all use `_msgSender()`). Could allow unauthorized token operations.

**Note:** Appears uninitialized (address(0)) by default, making it inactive. But no function to set it was found in facets — it may be set in InitDiamond or left as dead code.

### ARCH-02: [HIGH] Any Facet Can Mint/Burn Tokens

**Location:** `src/facets/FundTokensFacet.sol:51-54`

The `onlyFundAdmin` modifier checks `_msgSender() != s.FundTokens[0].fundAdmin`. For cross-facet calls like `FundTokensFacet(address(this)).mint(...)`, the `msg.sender` inside the Diamond proxy delegatecall context is the Diamond proxy itself. So `fundAdmin` is set to `address(this)`.

This means **any facet** can call mint/burn/lock/unlock on FundTokensFacet, since all facets execute within the Diamond proxy context. There's no per-facet authorization.

**Impact:** A compromised or buggy facet could mint unlimited tokens. The Diamond proxy's trust model relies on ALL facets being correct.

### ARCH-03: [MEDIUM] `internalExecutionContext` Flag Reset After Failed delegatecall

**Location:** `src/shared/BaseFacet.sol:151-153`

```solidity
s.internalExecutionContext = true;
(bool success, bytes memory returnData) = address(this).delegatecall(callData);
s.internalExecutionContext = false;
```

The flag is set to `false` after the delegatecall regardless of success. However, if the delegatecall itself triggers another `_validateAndPropose` (nested proposal), the flag would be overwritten. After the inner call returns, the outer call sets it back to `false`.

**Impact:** Nested proposals could cause the flag to be `false` during execution of the outer proposal. However, `onlyInternalExecution` is checked at the START of execute functions, so this is likely safe unless there's a mid-execution check.

### ARCH-04: [HIGH] `reentrancyLock` Exists But Usage Unclear

**Location:** `src/libs/LibAppStorage.sol:484`

`AppStorage` has `bool reentrancyLock` field, but a global search shows it's only used in AccountFacet._executeProposal. The 15 reentrancy warnings from Slither (SL-M-01 through SL-M-13) suggest many cross-facet call paths are NOT protected by this lock.

**Impact:** If any cross-facet call path triggers an ERC1155 callback (via `onERC1155Received`), it could re-enter the Diamond. On a private blockchain the risk is lower (no untrusted contracts), but the architecture doesn't enforce it.

### ARCH-05: [INFORMATIONAL] View Functions Lack Role-Based Access Control

**Location:** AdminViewCallsFacet, ManagerViewCallsFacet (all functions)

Admin and manager view functions return sensitive data (system overview, fund summaries, all accounts, role assignments) to ANY caller. No role verification.

**Impact:** Information leakage. On a private blockchain this is mitigated by network access control, but the contract itself doesn't enforce it.

### ARCH-06: [MEDIUM] AccountFacet.createAccount — Diamond Owner Bypass

**Location:** `src/facets/AccountFacet.sol:89-100`

The `createAccount` function has two code paths:
1. If called by diamond owner (`msg.sender == LibDiamond.contractOwner()`): creates account directly without going through _validateAndPropose
2. Otherwise: goes through ROLE_ADMIN + _validateAndPropose

The diamond owner bypass means account creation doesn't go through multisig. This is intentional for bootstrap but creates a persistent backdoor.

---

## 3. Storage Namespace Writers

### `s.FundAdmin[0]` — Written by 10 facets:
| Field Group | Writers |
|-------------|---------|
| funds, baseInfo, classes, dealings | FundManagementFacet, FundManagementValidationFacet, NavManagementFacet |
| orderBook, userOrderIndices | OrderManagementFacet, SettlementFacet, FundLifecycleFacet |
| protocolSafetyConfigs | NavManagementFacet |
| feeHistory, redemptionFeeHistory | FeeManagementFacet |
| pendingAdjustments, adjustmentHistory | ClassAdjustmentFacet, NavManagementFacet (via processAllPendingAdjustments) |
| roles | FundManagementFacet (onlyOwnerDiamond functions), AdminViewCallsFacet |
| currencies, fxRegistry, fxSafetyConfig | FXManagementFacet, AdminViewCallsFacet |
| umbrellaFunds, umbrellaCurrencies | FundManagementFacet, AdminViewCallsFacet |
| cashFundChangeBlocks, classConfigChangeBlocks, fundConfigChangeBlocks | Multiple (audit trail) |

### `s.FundTokens[0]` — Written by 2 facets:
| Field Group | Writers |
|-------------|---------|
| balances, totalSupply, totalSupplyAll | FundTokensFacet |
| lockedBalances | FundTokensFacet |
| transfers, userTokenTransferIndices | FundTokensFacet |
| userHoldings, addressZeroHoldings | FundTokensFacet |
| operatorApprovals | FundTokensFacet |

### `s.Account[0]` — Written by 2 facets:
| Field Group | Writers |
|-------------|---------|
| accounts, allAccounts | AccountFacet |
| walletToAccounts, accountToWallets, accountPermissions | AccountFacet |
| proposals, proposalConfirmations | AccountFacet |
| accountChangeBlocks | AccountFacet, EligibilityFacet |

### `s.PerformanceFeeCalculator[0]` — Written by 1 facet:
| Field Group | Writers |
|-------------|---------|
| windowDays | FeeManagementFacet |

### Global AppStorage fields:
| Field | Writers |
|-------|---------|
| `internalExecutionContext` | BaseFacet._validateAndPropose |
| `reentrancyLock` | AccountFacet._executeProposal |
| `diamondInitialized` | InitDiamond |

---

## 4. Trust Boundaries

### Level 0: Diamond Owner (highest privilege)
- Can add/remove facets (Diamond standard)
- Can call onlyOwnerDiamond functions directly
- Can create funds, set roles, register currencies
- Single point of failure — no multisig at this level

### Level 1: ROLE_ADMIN
- Account-based, goes through _validateAndPropose (supports multisig)
- Can create accounts, manage lifecycle, set safety configs, post adjustments
- Can onramp/offramp cash tokens (effectively mint/burn money)

### Level 2: ROLE_NAV_UPDATER / ROLE_FX_UPDATER / ROLE_SETTLEMENT
- Trusted off-chain services with specific roles
- NAV updater: controls fund pricing (critical — wrong NAV = wrong prices)
- FX updater: controls currency rates (critical — wrong FX = wrong settlement)
- Settlement operator: confirms cross-umbrella cash swaps

### Level 3: ROLE_MANAGER
- Scoped to specific fund (checked via `s.FundAdmin[0].funds[scope].manager == accountAddress`)
- Can create classes, set dealing schedules, configure fees
- Can batch convert dealing tokens, set subscription rules

### Level 4: ROLE_USER (bytes32(0))
- Any valid account — no role check needed
- Can submit/cancel orders, transfer tokens

### Level 5: External callers (no account)
- Can call view functions (all are unprotected)
- Can call ERC1155 standard functions (safeTransferFrom if approved)
- Cannot interact with account-based functions

---

## 5. Cross-Facet Call Graph (State-Changing Paths)

```
OrderManagementFacet → FundTokensFacet (lock/unlock/mint/burn)
                     → FundManagementFacet (createDealing)
                     → NavManagementFacet (price calculations)
                     → EligibilityFacet (eligibility checks)
                     → FXManagementFacet (FX rate queries)

NavManagementFacet   → FeeManagementFacet (mintAllPendingManagementFees)
                     → ClassAdjustmentFacet (processAllPendingAdjustments)
                     → FXManagementFacet (FX rates for multi-currency prices)

FeeManagementFacet   → FundTokensFacet (mint fee tokens)
                     → NavManagementFacet (price calculations)

SettlementFacet      → FundTokensFacet (unlock/burn/mint/lock)
                     → FXManagementFacet (FX rate validation)

FundLifecycleFacet   → OrderManagementFacet (cancel orders)
                     → FundTokensFacet (lock tokens for forced redemption)

AccountFacet         → ALL facets (via delegatecall proposal execution)
```

---

## 6. Key Risks for Phase 3-4

1. **Reentrancy via ERC1155 callbacks**: FundTokensFacet._mint calls onERC1155Received on the recipient. If recipient is a contract, it could re-enter the Diamond.
2. **NAV/FX updater trust**: These off-chain services control pricing. Wrong values = wrong token amounts.
3. **Diamond owner is god mode**: Can add malicious facet, bypass all access control.
4. **Dual totalSupply**: FundTokensStorage.totalSupply vs FundAdminStorage.baseInfo.totalSupply must stay in sync.
5. **Fee minting inflation**: Management/performance fee minting creates new tokens, must correctly update all supply fields.
