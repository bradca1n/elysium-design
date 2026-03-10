# User Onboard Service Design

**Date:** 2026-03-03
**Status:** Approved
**Author:** Claude (brainstorming session)

## Overview

A TypeScript service (`services/user-onboard/`) that handles the complete blockchain onboarding flow for new users. After a user signs up to Elysium and obtains a wallet address, this service executes all required on-chain operations to make them investment-ready.

## Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Invocation model | Exportable async functions | Caller (API, script, test) decides how to use them |
| Config source | Function parameters | No hardcoded values, most testable |
| Signer | Admin only (no deployer) | Admin already has ROLE_ADMIN, can do all needed ops |
| Role support | Investor + optional manager | Admin/navUpdater require deployer key (onlyOwnerDiamond) — rare manual ops |
| Architecture | Individual step functions + orchestrator wrapper | Each on-chain call is independently usable |
| Language | TypeScript ES modules | Matches error-engine pattern, strict mode |
| Blockchain lib | viem | Matches all existing services |

## Service Structure

```
services/user-onboard/
├── package.json          # @elysium/user-onboard, deps: viem, tsx
├── tsconfig.json
└── src/
    ├── index.ts          # Re-exports all public functions
    ├── onboard.ts        # onboardUser() orchestrator
    ├── types.ts          # All interfaces
    ├── steps/
    │   ├── create-account.ts       # getOrCreateAccount()
    │   ├── set-attributes.ts       # setAccountAttributes()
    │   ├── set-permissions.ts      # setManagerPermissions()
    │   ├── send-gas.ts             # sendGasTokens()
    │   ├── onramp-tokens.ts        # onrampBaseTokens()
    │   └── verify.ts               # verifyOnboarding()
    └── utils/
        ├── clients.ts    # viem client/wallet factories
        ├── diamond.ts    # getContract helper
        └── token-ids.ts  # createCashFundTokenId() port
```

## Core Types

### OnboardConfig (service-level config, passed by caller)

```typescript
interface ChainConfig {
  id: number
  name: string
  nativeCurrency: { decimals: number; name: string; symbol: string }
}

interface OnboardConfig {
  rpcUrl: string
  chain: ChainConfig
  diamondAddress: `0x${string}`
  adminPrivateKey: `0x${string}`
  adminWalletAddress: `0x${string}`
  gasTokenAmount: bigint              // Default gas to send per user
  baseTokenAmount: bigint             // Default cash tokens to onramp per user
  umbrellaId: number                  // For cash token ID computation
  currencyId: number                  // For cash token ID computation
}
```

### OnboardUserParams (per-user, passed per call)

```typescript
interface InvestorAttributes {
  kycVerified: boolean
  accreditedInvestor: boolean
  qualifiedPurchaser: boolean
  jurisdiction: string                // 2-char ISO 3166-1 alpha-2 (e.g. "US")
  investorType: number                // 1=individual, 2=institution, etc.
  tags: string[]                      // 2-char tags (e.g. ["VI"])
}

interface OnboardUserParams {
  walletAddress: `0x${string}`
  accountName: string
  accountType: number                 // 1=standard, 2=institution, etc.
  attributes: InvestorAttributes
  roles?: {
    managerFundIds?: bigint[]         // Fund IDs to manage
  }
  gasTokenAmount?: bigint             // Override config default
  baseTokenAmount?: bigint            // Override config default
}
```

### OnboardResult

```typescript
interface OnboardResult {
  accountAddress: `0x${string}`
  steps: StepResult[]
  verified: boolean
}

interface StepResult {
  step: string
  txHash?: `0x${string}`
  skipped: boolean
  error?: string
}
```

## Step Functions

### 1. getOrCreateAccount(config, walletAddress, accountName, accountType, attributes)

- Calls `diamond.getAccounts(walletAddress)` to check if account exists
- If exists, returns existing account address (idempotent)
- If not, calls `diamond.createAccount(adminAccount, wallet, name, type, emptyAttributes)` via admin
- Returns the account address

**Contract calls:** `getAccounts()` (read), `createAccount()` (write, admin TX)
**Signer:** Admin

### 2. setAccountAttributes(config, accountAddress, attributes)

- Builds `InvestorAttributesUpdate` struct with all update flags set to true
- Calls `diamond.setAccountAttributes(adminAccount, targetAccount, update)`
- Converts jurisdiction string to bytes2, tags to bytes2[]

**Contract calls:** `setAccountAttributes()` (write, admin TX)
**Signer:** Admin

### 3. setManagerPermissions(config, accountAddress, fundIds)

- For each fundId: calls `diamond.setAccountManager(adminAccount, account, fundId, true)`
- Skips if fundIds array is empty

**Contract calls:** `setAccountManager()` per fund (write, admin TX)
**Signer:** Admin

### 4. sendGasTokens(config, walletAddress, amount)

- Sends native tokens from admin wallet to user wallet
- Uses viem walletClient.sendTransaction

**Contract calls:** None (native ETH transfer)
**Signer:** Admin

### 5. onrampBaseTokens(config, accountAddress, amount)

- Computes cashFundTokenId from config.umbrellaId + config.currencyId
- Calls `diamond.onramp(adminAccount, accountAddress, cashTokenId, amount)`

**Contract calls:** `onramp()` (write, admin TX)
**Signer:** Admin

### 6. verifyOnboarding(config, walletAddress)

- Read-only verification:
  - `getAccounts(wallet)` — account exists
  - `wallet.balance` — gas tokens received
  - `balanceOf(accountAddress, cashTokenId)` — base tokens received
- Returns verification result

**Contract calls:** `getAccounts()`, `balanceOf()` (read-only)
**Signer:** None (public client)

## Orchestrator: onboardUser(config, params)

Sequence:
1. Resolve admin account: `getAccounts(config.adminWalletAddress)[0]`
2. `getOrCreateAccount()` — skip if exists
3. `setAccountAttributes()`
4. `setManagerPermissions()` — skip if no roles
5. `sendGasTokens()`
6. `onrampBaseTokens()`
7. `verifyOnboarding()`

Returns `OnboardResult` with account address, per-step TX hashes, and verification status.

## Utility Functions

### token-ids.ts — TokenIdUtils port

```typescript
// Mirrors contracts/src/libs/TokenIdUtils.sol
function createCashFundTokenId(umbrellaId: number, currencyId: number): bigint {
  return (BigInt(umbrellaId) << 48n) | (BigInt(currencyId) << 16n)
}
```

### clients.ts — viem client factories

```typescript
function createPublicClient(config: OnboardConfig): PublicClient
function createWalletClient(config: OnboardConfig): WalletClient
```

### diamond.ts — Contract helper

```typescript
function getDiamondContract(config: OnboardConfig): Contract
function getAdminAccount(config: OnboardConfig): Promise<`0x${string}`>
```

## Contract Function Signatures (from IDiamondProxy)

```solidity
// Account creation (admin via proposal)
function createAccount(address adminAccountAddress, address owner, string name, uint8 accountType, InvestorAttributesUpdate eligibility) returns (TransactionResult)

// Attribute setting (admin via proposal)
function setAccountAttributes(address accountAddress, address targetAccountAddress, InvestorAttributesUpdate update) returns (TransactionResult)

// Manager role (admin via proposal)
function setAccountManager(address adminAccountAddress, address accountAddress, uint256 fundId, bool isManager) returns (TransactionResult)

// Token onramp (admin via proposal)
function onramp(address accountAddress, address user, uint256 cashFundTokenId, uint256 amount) returns (TransactionResult)

// Read functions
function getAccounts(address wallet) view returns (address[])
function balanceOf(address account, uint256 id) view returns (uint256)
```

## ABI Source

Load from `contracts/src/generated/abi.json` (same pattern as order-processor/utils/abis.js).

## Dependencies

- `viem` — blockchain client
- `tsx` (devDep) — TypeScript execution
- `@types/node` (devDep) — Node.js types
