# User Onboard Service Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a TypeScript service that onboards new users to the Elysium blockchain — creating accounts, setting investor attributes, sending gas tokens, and onramping base tokens via the Diamond proxy contract.

**Architecture:** Individual async step functions (each independently importable) + an orchestrator `onboardUser()` wrapper that calls them in sequence. All config passed as function params — zero hardcoded values. Single signer (admin key) for all operations.

**Tech Stack:** TypeScript ES modules, viem for blockchain interaction, tsx for execution.

**Design doc:** `docs/plans/2026-03-03-user-onboard-service-design.md`

---

### Task 1: Project Scaffolding

**Files:**
- Create: `services/user-onboard/package.json`
- Create: `services/user-onboard/tsconfig.json`

**Step 1: Create package.json**

```json
{
  "name": "@elysium/user-onboard",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "scripts": {
    "start": "tsx src/index.ts",
    "typecheck": "tsc --noEmit"
  },
  "dependencies": {
    "viem": "^2.39.2"
  },
  "devDependencies": {
    "@types/node": "^22.0.0",
    "tsx": "^4.19.0",
    "typescript": "^5.7.0"
  }
}
```

**Step 2: Create tsconfig.json**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "outDir": "dist",
    "rootDir": ".",
    "resolveJsonModule": true,
    "declaration": true
  },
  "include": ["src/**/*"]
}
```

**Step 3: Install dependencies**

Run: `cd services/user-onboard && yarn install`

**Step 4: Commit**

```bash
git add services/user-onboard/package.json services/user-onboard/tsconfig.json
git commit -m "feat(user-onboard): scaffold project with package.json and tsconfig"
```

---

### Task 2: Types

**Files:**
- Create: `services/user-onboard/src/types.ts`

**Step 1: Write all type definitions**

```typescript
// services/user-onboard/src/types.ts

// ================================
// Config Types
// ================================

export interface ChainConfig {
  id: number
  name: string
  nativeCurrency: {
    decimals: number
    name: string
    symbol: string
  }
}

export interface OnboardConfig {
  /** RPC URL for the blockchain node */
  rpcUrl: string
  /** Chain configuration */
  chain: ChainConfig
  /** Diamond proxy contract address */
  diamondAddress: `0x${string}`
  /** Admin private key — used for all write operations */
  adminPrivateKey: `0x${string}`
  /** Admin wallet address — used to resolve admin account on-chain */
  adminWalletAddress: `0x${string}`
  /** Default amount of native gas tokens to send to new wallets (in wei) */
  gasTokenAmount: bigint
  /** Default amount of base/cash tokens to onramp to new accounts (in wei) */
  baseTokenAmount: bigint
  /** Umbrella ID for cash fund token ID computation */
  umbrellaId: number
  /** Currency ID for cash fund token ID computation */
  currencyId: number
}

// ================================
// User Params
// ================================

export interface InvestorAttributes {
  kycVerified: boolean
  accreditedInvestor: boolean
  qualifiedPurchaser: boolean
  /** ISO 3166-1 alpha-2 jurisdiction code (e.g., "US", "FR") */
  jurisdiction: string
  /** Investor type: 1=individual, 2=institution, etc. */
  investorType: number
  /** Commercial tags, each 2 chars (e.g., ["VI"]) */
  tags: string[]
}

export interface OnboardUserParams {
  /** Wallet address of the user to onboard */
  walletAddress: `0x${string}`
  /** Display name for the on-chain account */
  accountName: string
  /** Account type: 1=standard, 2=institution, etc. */
  accountType: number
  /** Investor eligibility attributes */
  attributes: InvestorAttributes
  /** Optional role assignments */
  roles?: {
    /** Fund IDs to grant manager role for */
    managerFundIds?: bigint[]
  }
  /** Override config default gas token amount */
  gasTokenAmount?: bigint
  /** Override config default base token amount */
  baseTokenAmount?: bigint
}

// ================================
// Result Types
// ================================

export interface StepResult {
  step: string
  txHash?: `0x${string}`
  skipped: boolean
  error?: string
}

export interface OnboardResult {
  accountAddress: `0x${string}`
  adminAccountAddress: `0x${string}`
  steps: StepResult[]
  verified: boolean
}

// ================================
// Contract Types (mirrors Solidity structs)
// ================================

/** Mirrors Solidity TransactionStatus enum */
export enum TransactionStatus {
  EXECUTED = 0,
  PROPOSED = 1,
  CONFIRMED = 2,
}

/** Mirrors Solidity InvestorAttributesUpdate struct */
export interface InvestorAttributesUpdateStruct {
  updateKYC: boolean
  updateAccredited: boolean
  updateQualifiedPurchaser: boolean
  updateJurisdiction: boolean
  updateInvestorType: boolean
  updateTags: boolean
  kycVerified: boolean
  accreditedInvestor: boolean
  qualifiedPurchaser: boolean
  jurisdiction: `0x${string}`
  investorType: number
  tags: `0x${string}`[]
}
```

**Step 2: Verify types compile**

Run: `cd services/user-onboard && npx tsc --noEmit src/types.ts`
Expected: No errors

**Step 3: Commit**

```bash
git add services/user-onboard/src/types.ts
git commit -m "feat(user-onboard): add type definitions for config, params, and results"
```

---

### Task 3: Utility — Token ID Utils

**Files:**
- Create: `services/user-onboard/src/utils/token-ids.ts`

**Step 1: Implement TokenIdUtils port**

Port the relevant functions from `contracts/src/libs/TokenIdUtils.sol`. The token ID structure is:
`[16 bits umbrella][16 bits fund][16 bits class][16 bits dealing]` packed into a uint256.

Cash fund token = umbrella in bits 48-63, currencyId in bits 16-31, everything else 0.

```typescript
// services/user-onboard/src/utils/token-ids.ts

const UMBRELLA_SHIFT = 48n
const CLASS_SHIFT = 16n

/**
 * Create a cash fund token ID for an umbrella and currency.
 * Mirrors TokenIdUtils.createCashFundTokenId() in Solidity.
 *
 * Token ID layout: [umbrella:16][fund:16][class:16][dealing:16]
 * Cash fund token: umbrella != 0, fund = 0, class = currencyId, dealing = 0
 */
export function createCashFundTokenId(umbrellaId: number, currencyId: number): bigint {
  return (BigInt(umbrellaId) << UMBRELLA_SHIFT) | (BigInt(currencyId) << CLASS_SHIFT)
}
```

**Step 2: Verify it compiles**

Run: `cd services/user-onboard && npx tsc --noEmit src/utils/token-ids.ts`
Expected: No errors

**Step 3: Commit**

```bash
git add services/user-onboard/src/utils/token-ids.ts
git commit -m "feat(user-onboard): port TokenIdUtils.createCashFundTokenId to TypeScript"
```

---

### Task 4: Utility — Viem Client Factories

**Files:**
- Create: `services/user-onboard/src/utils/clients.ts`

**Step 1: Implement client factories**

Follow the pattern from `services/order-processor/utils/chain.js` but in TypeScript.

```typescript
// services/user-onboard/src/utils/clients.ts

import {
  createPublicClient as viemCreatePublicClient,
  createWalletClient as viemCreateWalletClient,
  http,
  defineChain,
  type PublicClient,
  type WalletClient,
  type HttpTransport,
  type Chain,
} from 'viem'
import { privateKeyToAccount } from 'viem/accounts'
import type { OnboardConfig } from '../types.js'

/**
 * Build a viem Chain definition from OnboardConfig.
 */
export function buildChain(config: OnboardConfig): Chain {
  return defineChain({
    id: config.chain.id,
    name: config.chain.name,
    nativeCurrency: config.chain.nativeCurrency,
    rpcUrls: {
      default: { http: [config.rpcUrl] },
    },
  })
}

/**
 * Create a public (read-only) viem client.
 */
export function createPublicClient(config: OnboardConfig): PublicClient<HttpTransport, Chain> {
  const chain = buildChain(config)
  return viemCreatePublicClient({ chain, transport: http(config.rpcUrl) })
}

/**
 * Create a wallet client for the admin private key.
 */
export function createAdminWalletClient(config: OnboardConfig): WalletClient {
  const chain = buildChain(config)
  const account = privateKeyToAccount(config.adminPrivateKey)
  return viemCreateWalletClient({ chain, account, transport: http(config.rpcUrl) })
}
```

**Step 2: Verify it compiles**

Run: `cd services/user-onboard && npx tsc --noEmit src/utils/clients.ts`
Expected: No errors

**Step 3: Commit**

```bash
git add services/user-onboard/src/utils/clients.ts
git commit -m "feat(user-onboard): add viem client factories (public + admin wallet)"
```

---

### Task 5: Utility — Diamond Contract Helper

**Files:**
- Create: `services/user-onboard/src/utils/diamond.ts`

**Step 1: Implement Diamond helper**

Loads the generated ABI from `contracts/src/generated/abi.json` and creates a typed contract instance. Also provides `getAdminAccount()` to resolve the admin account address on-chain.

```typescript
// services/user-onboard/src/utils/diamond.ts

import { getContract, type GetContractReturnType, type PublicClient, type WalletClient } from 'viem'
import { readFileSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import type { OnboardConfig } from '../types.js'
import { createPublicClient, createAdminWalletClient } from './clients.js'

const __dirname = dirname(fileURLToPath(import.meta.url))

/**
 * Load the Diamond ABI from the generated abi.json file.
 * Path: contracts/src/generated/abi.json (relative to this file)
 */
function loadDiamondAbi(): readonly unknown[] {
  const abiPath = resolve(__dirname, '../../../../contracts/src/generated/abi.json')
  const raw = readFileSync(abiPath, 'utf8')
  const abi = JSON.parse(raw)
  if (!Array.isArray(abi)) {
    throw new Error(`Invalid ABI format at ${abiPath}`)
  }
  return abi
}

let cachedAbi: readonly unknown[] | null = null

function getAbi(): readonly unknown[] {
  if (!cachedAbi) {
    cachedAbi = loadDiamondAbi()
  }
  return cachedAbi
}

/**
 * Get a viem contract instance for the Diamond proxy.
 * Usable for both read (publicClient) and write (walletClient) operations.
 */
export function getDiamondContract(config: OnboardConfig) {
  const abi = getAbi()
  const publicClient = createPublicClient(config)
  const walletClient = createAdminWalletClient(config)

  return getContract({
    address: config.diamondAddress,
    abi,
    client: { public: publicClient, wallet: walletClient },
  })
}

/**
 * Resolve the admin account address on-chain.
 * Calls getAccounts(adminWalletAddress) and returns the first account.
 */
export async function getAdminAccount(config: OnboardConfig): Promise<`0x${string}`> {
  const publicClient = createPublicClient(config)
  const abi = getAbi()

  const accounts = await publicClient.readContract({
    address: config.diamondAddress,
    abi,
    functionName: 'getAccounts',
    args: [config.adminWalletAddress],
  }) as `0x${string}`[]

  if (accounts.length === 0) {
    throw new Error(
      `No accounts found for admin wallet ${config.adminWalletAddress}. ` +
      `Ensure the admin account has been created via DiamondSetup.`
    )
  }

  return accounts[0]
}
```

**Step 2: Verify it compiles**

Run: `cd services/user-onboard && npx tsc --noEmit src/utils/diamond.ts`
Expected: No errors

**Step 3: Commit**

```bash
git add services/user-onboard/src/utils/diamond.ts
git commit -m "feat(user-onboard): add Diamond contract helper with ABI loading and admin account resolution"
```

---

### Task 6: Step — getOrCreateAccount

**Files:**
- Create: `services/user-onboard/src/steps/create-account.ts`

**Step 1: Implement getOrCreateAccount**

```typescript
// services/user-onboard/src/steps/create-account.ts

import type { OnboardConfig, StepResult, InvestorAttributesUpdateStruct } from '../types.js'
import { TransactionStatus } from '../types.js'
import { createPublicClient, createAdminWalletClient } from '../utils/clients.js'
import { getAdminAccount } from '../utils/diamond.js'
import { readFileSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))

function loadAbi(): readonly unknown[] {
  const abiPath = resolve(__dirname, '../../../../contracts/src/generated/abi.json')
  return JSON.parse(readFileSync(abiPath, 'utf8'))
}

/** Build an empty InvestorAttributesUpdate struct (all update flags false). */
function buildEmptyAttributes(): InvestorAttributesUpdateStruct {
  return {
    updateKYC: false,
    updateAccredited: false,
    updateQualifiedPurchaser: false,
    updateJurisdiction: false,
    updateInvestorType: false,
    updateTags: false,
    kycVerified: false,
    accreditedInvestor: false,
    qualifiedPurchaser: false,
    jurisdiction: '0x0000',
    investorType: 0,
    tags: [],
  }
}

/**
 * Check if an account already exists for the wallet, create one if not.
 * Returns the account address.
 *
 * Idempotent: if the wallet already has an account, returns the existing one.
 *
 * @param config - Service configuration
 * @param adminAccountAddress - Pre-resolved admin account address
 * @param walletAddress - Wallet to create account for
 * @param accountName - Display name for the account
 * @param accountType - Account type (1=standard, etc.)
 * @returns { accountAddress, stepResult }
 */
export async function getOrCreateAccount(
  config: OnboardConfig,
  adminAccountAddress: `0x${string}`,
  walletAddress: `0x${string}`,
  accountName: string,
  accountType: number,
): Promise<{ accountAddress: `0x${string}`; stepResult: StepResult }> {
  const abi = loadAbi()
  const publicClient = createPublicClient(config)
  const walletClient = createAdminWalletClient(config)

  // Check if account already exists
  const existingAccounts = await publicClient.readContract({
    address: config.diamondAddress,
    abi,
    functionName: 'getAccounts',
    args: [walletAddress],
  }) as `0x${string}`[]

  if (existingAccounts.length > 0) {
    return {
      accountAddress: existingAccounts[0],
      stepResult: {
        step: 'createAccount',
        skipped: true,
      },
    }
  }

  // Create account via admin
  const emptyAttributes = buildEmptyAttributes()

  const txHash = await walletClient.writeContract({
    address: config.diamondAddress,
    abi,
    functionName: 'createAccount',
    args: [adminAccountAddress, walletAddress, accountName, accountType, emptyAttributes],
  })

  // Wait for confirmation
  const receipt = await publicClient.waitForTransactionReceipt({ hash: txHash })

  // Read back the created account address
  const accounts = await publicClient.readContract({
    address: config.diamondAddress,
    abi,
    functionName: 'getAccounts',
    args: [walletAddress],
  }) as `0x${string}`[]

  if (accounts.length === 0) {
    throw new Error(`Account creation TX succeeded (${txHash}) but getAccounts returned empty`)
  }

  return {
    accountAddress: accounts[accounts.length - 1],
    stepResult: {
      step: 'createAccount',
      txHash,
      skipped: false,
    },
  }
}
```

**Step 2: Verify it compiles**

Run: `cd services/user-onboard && npx tsc --noEmit src/steps/create-account.ts`
Expected: No errors

**Step 3: Commit**

```bash
git add services/user-onboard/src/steps/create-account.ts
git commit -m "feat(user-onboard): add getOrCreateAccount step (idempotent account creation)"
```

---

### Task 7: Step — setAccountAttributes

**Files:**
- Create: `services/user-onboard/src/steps/set-attributes.ts`

**Step 1: Implement setAccountAttributes**

```typescript
// services/user-onboard/src/steps/set-attributes.ts

import type { OnboardConfig, InvestorAttributes, StepResult, InvestorAttributesUpdateStruct } from '../types.js'
import { createPublicClient, createAdminWalletClient } from '../utils/clients.js'
import { readFileSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { toHex } from 'viem'

const __dirname = dirname(fileURLToPath(import.meta.url))

function loadAbi(): readonly unknown[] {
  const abiPath = resolve(__dirname, '../../../../contracts/src/generated/abi.json')
  return JSON.parse(readFileSync(abiPath, 'utf8'))
}

/**
 * Convert a 2-char string (e.g. "US") to a bytes2 hex string.
 * Pads with zero if less than 2 chars.
 */
function stringToBytes2(str: string): `0x${string}` {
  const padded = str.padEnd(2, '\0')
  const byte1 = padded.charCodeAt(0)
  const byte2 = padded.charCodeAt(1)
  return `0x${byte1.toString(16).padStart(2, '0')}${byte2.toString(16).padStart(2, '0')}`
}

/**
 * Build the InvestorAttributesUpdate struct from our InvestorAttributes type.
 * Sets all update flags to true so every field is written.
 */
function buildAttributesUpdate(attrs: InvestorAttributes): InvestorAttributesUpdateStruct {
  return {
    updateKYC: true,
    updateAccredited: true,
    updateQualifiedPurchaser: true,
    updateJurisdiction: true,
    updateInvestorType: true,
    updateTags: attrs.tags.length > 0,
    kycVerified: attrs.kycVerified,
    accreditedInvestor: attrs.accreditedInvestor,
    qualifiedPurchaser: attrs.qualifiedPurchaser,
    jurisdiction: stringToBytes2(attrs.jurisdiction),
    investorType: attrs.investorType,
    tags: attrs.tags.map(stringToBytes2),
  }
}

/**
 * Set investor attributes (KYC, eligibility, jurisdiction, etc.) on an account.
 *
 * @param config - Service configuration
 * @param adminAccountAddress - Pre-resolved admin account address
 * @param targetAccountAddress - Account to set attributes on
 * @param attributes - Investor attributes to set
 */
export async function setAccountAttributes(
  config: OnboardConfig,
  adminAccountAddress: `0x${string}`,
  targetAccountAddress: `0x${string}`,
  attributes: InvestorAttributes,
): Promise<StepResult> {
  const abi = loadAbi()
  const publicClient = createPublicClient(config)
  const walletClient = createAdminWalletClient(config)

  const update = buildAttributesUpdate(attributes)

  const txHash = await walletClient.writeContract({
    address: config.diamondAddress,
    abi,
    functionName: 'setAccountAttributes',
    args: [adminAccountAddress, targetAccountAddress, update],
  })

  await publicClient.waitForTransactionReceipt({ hash: txHash })

  return {
    step: 'setAccountAttributes',
    txHash,
    skipped: false,
  }
}
```

**Step 2: Verify it compiles**

Run: `cd services/user-onboard && npx tsc --noEmit src/steps/set-attributes.ts`
Expected: No errors

**Step 3: Commit**

```bash
git add services/user-onboard/src/steps/set-attributes.ts
git commit -m "feat(user-onboard): add setAccountAttributes step with string-to-bytes2 conversion"
```

---

### Task 8: Step — setManagerPermissions

**Files:**
- Create: `services/user-onboard/src/steps/set-permissions.ts`

**Step 1: Implement setManagerPermissions**

```typescript
// services/user-onboard/src/steps/set-permissions.ts

import type { OnboardConfig, StepResult } from '../types.js'
import { createPublicClient, createAdminWalletClient } from '../utils/clients.js'
import { readFileSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))

function loadAbi(): readonly unknown[] {
  const abiPath = resolve(__dirname, '../../../../contracts/src/generated/abi.json')
  return JSON.parse(readFileSync(abiPath, 'utf8'))
}

/**
 * Assign manager role for specific funds to an account.
 * Calls setAccountManager for each fund ID.
 *
 * @param config - Service configuration
 * @param adminAccountAddress - Pre-resolved admin account address
 * @param targetAccountAddress - Account to make manager
 * @param fundIds - Fund IDs to grant manager role for
 * @returns Array of StepResults (one per fund)
 */
export async function setManagerPermissions(
  config: OnboardConfig,
  adminAccountAddress: `0x${string}`,
  targetAccountAddress: `0x${string}`,
  fundIds: bigint[],
): Promise<StepResult[]> {
  if (fundIds.length === 0) {
    return [{
      step: 'setManagerPermissions',
      skipped: true,
    }]
  }

  const abi = loadAbi()
  const publicClient = createPublicClient(config)
  const walletClient = createAdminWalletClient(config)
  const results: StepResult[] = []

  for (const fundId of fundIds) {
    const txHash = await walletClient.writeContract({
      address: config.diamondAddress,
      abi,
      functionName: 'setAccountManager',
      args: [adminAccountAddress, targetAccountAddress, fundId, true],
    })

    await publicClient.waitForTransactionReceipt({ hash: txHash })

    results.push({
      step: `setManagerPermission(fund=${fundId})`,
      txHash,
      skipped: false,
    })
  }

  return results
}
```

**Step 2: Verify it compiles**

Run: `cd services/user-onboard && npx tsc --noEmit src/steps/set-permissions.ts`
Expected: No errors

**Step 3: Commit**

```bash
git add services/user-onboard/src/steps/set-permissions.ts
git commit -m "feat(user-onboard): add setManagerPermissions step (per-fund manager assignment)"
```

---

### Task 9: Step — sendGasTokens

**Files:**
- Create: `services/user-onboard/src/steps/send-gas.ts`

**Step 1: Implement sendGasTokens**

```typescript
// services/user-onboard/src/steps/send-gas.ts

import type { OnboardConfig, StepResult } from '../types.js'
import { createPublicClient, createAdminWalletClient } from '../utils/clients.js'
import { parseEther } from 'viem'

/**
 * Send native gas tokens from admin wallet to user wallet.
 *
 * @param config - Service configuration
 * @param walletAddress - Recipient wallet address
 * @param amount - Amount in wei (overrides config.gasTokenAmount if provided)
 */
export async function sendGasTokens(
  config: OnboardConfig,
  walletAddress: `0x${string}`,
  amount?: bigint,
): Promise<StepResult> {
  const sendAmount = amount ?? config.gasTokenAmount

  if (sendAmount === 0n) {
    return {
      step: 'sendGasTokens',
      skipped: true,
    }
  }

  const publicClient = createPublicClient(config)
  const walletClient = createAdminWalletClient(config)

  const txHash = await walletClient.sendTransaction({
    to: walletAddress,
    value: sendAmount,
  })

  await publicClient.waitForTransactionReceipt({ hash: txHash })

  return {
    step: 'sendGasTokens',
    txHash,
    skipped: false,
  }
}
```

**Step 2: Verify it compiles**

Run: `cd services/user-onboard && npx tsc --noEmit src/steps/send-gas.ts`
Expected: No errors

**Step 3: Commit**

```bash
git add services/user-onboard/src/steps/send-gas.ts
git commit -m "feat(user-onboard): add sendGasTokens step (native token transfer to wallet)"
```

---

### Task 10: Step — onrampBaseTokens

**Files:**
- Create: `services/user-onboard/src/steps/onramp-tokens.ts`

**Step 1: Implement onrampBaseTokens**

```typescript
// services/user-onboard/src/steps/onramp-tokens.ts

import type { OnboardConfig, StepResult } from '../types.js'
import { createPublicClient, createAdminWalletClient } from '../utils/clients.js'
import { createCashFundTokenId } from '../utils/token-ids.js'
import { readFileSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))

function loadAbi(): readonly unknown[] {
  const abiPath = resolve(__dirname, '../../../../contracts/src/generated/abi.json')
  return JSON.parse(readFileSync(abiPath, 'utf8'))
}

/**
 * Onramp (mint) cash fund tokens to a user's account.
 * Computes the cashFundTokenId from config.umbrellaId + config.currencyId.
 *
 * @param config - Service configuration
 * @param adminAccountAddress - Pre-resolved admin account address
 * @param targetAccountAddress - Account to receive tokens
 * @param amount - Amount in wei (overrides config.baseTokenAmount if provided)
 */
export async function onrampBaseTokens(
  config: OnboardConfig,
  adminAccountAddress: `0x${string}`,
  targetAccountAddress: `0x${string}`,
  amount?: bigint,
): Promise<StepResult> {
  const onrampAmount = amount ?? config.baseTokenAmount

  if (onrampAmount === 0n) {
    return {
      step: 'onrampBaseTokens',
      skipped: true,
    }
  }

  const abi = loadAbi()
  const publicClient = createPublicClient(config)
  const walletClient = createAdminWalletClient(config)

  const cashTokenId = createCashFundTokenId(config.umbrellaId, config.currencyId)

  const txHash = await walletClient.writeContract({
    address: config.diamondAddress,
    abi,
    functionName: 'onramp',
    args: [adminAccountAddress, targetAccountAddress, cashTokenId, onrampAmount],
  })

  await publicClient.waitForTransactionReceipt({ hash: txHash })

  return {
    step: 'onrampBaseTokens',
    txHash,
    skipped: false,
  }
}
```

**Step 2: Verify it compiles**

Run: `cd services/user-onboard && npx tsc --noEmit src/steps/onramp-tokens.ts`
Expected: No errors

**Step 3: Commit**

```bash
git add services/user-onboard/src/steps/onramp-tokens.ts
git commit -m "feat(user-onboard): add onrampBaseTokens step (cash fund token minting)"
```

---

### Task 11: Step — verifyOnboarding

**Files:**
- Create: `services/user-onboard/src/steps/verify.ts`

**Step 1: Implement verifyOnboarding**

```typescript
// services/user-onboard/src/steps/verify.ts

import type { OnboardConfig } from '../types.js'
import { createPublicClient } from '../utils/clients.js'
import { createCashFundTokenId } from '../utils/token-ids.js'
import { readFileSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))

function loadAbi(): readonly unknown[] {
  const abiPath = resolve(__dirname, '../../../../contracts/src/generated/abi.json')
  return JSON.parse(readFileSync(abiPath, 'utf8'))
}

export interface VerificationResult {
  accountExists: boolean
  accountAddress: `0x${string}` | null
  gasTokenBalance: bigint
  baseTokenBalance: bigint
  verified: boolean
}

/**
 * Verify that onboarding completed successfully by reading on-chain state.
 *
 * Checks:
 * 1. Account exists for wallet (getAccounts)
 * 2. Wallet has gas tokens (native balance)
 * 3. Account has base tokens (balanceOf for cash fund token)
 *
 * @param config - Service configuration
 * @param walletAddress - Wallet to verify
 */
export async function verifyOnboarding(
  config: OnboardConfig,
  walletAddress: `0x${string}`,
): Promise<VerificationResult> {
  const abi = loadAbi()
  const publicClient = createPublicClient(config)

  // 1. Check account exists
  const accounts = await publicClient.readContract({
    address: config.diamondAddress,
    abi,
    functionName: 'getAccounts',
    args: [walletAddress],
  }) as `0x${string}`[]

  const accountExists = accounts.length > 0
  const accountAddress = accountExists ? accounts[0] : null

  // 2. Check gas token balance
  const gasTokenBalance = await publicClient.getBalance({ address: walletAddress })

  // 3. Check base token balance (on account, not wallet)
  let baseTokenBalance = 0n
  if (accountAddress) {
    const cashTokenId = createCashFundTokenId(config.umbrellaId, config.currencyId)
    baseTokenBalance = await publicClient.readContract({
      address: config.diamondAddress,
      abi,
      functionName: 'balanceOf',
      args: [accountAddress, cashTokenId],
    }) as bigint
  }

  return {
    accountExists,
    accountAddress,
    gasTokenBalance,
    baseTokenBalance,
    verified: accountExists && gasTokenBalance > 0n && baseTokenBalance > 0n,
  }
}
```

**Step 2: Verify it compiles**

Run: `cd services/user-onboard && npx tsc --noEmit src/steps/verify.ts`
Expected: No errors

**Step 3: Commit**

```bash
git add services/user-onboard/src/steps/verify.ts
git commit -m "feat(user-onboard): add verifyOnboarding step (read-only on-chain verification)"
```

---

### Task 12: Orchestrator — onboardUser

**Files:**
- Create: `services/user-onboard/src/onboard.ts`

**Step 1: Implement onboardUser orchestrator**

```typescript
// services/user-onboard/src/onboard.ts

import type { OnboardConfig, OnboardUserParams, OnboardResult, StepResult } from './types.js'
import { getAdminAccount } from './utils/diamond.js'
import { getOrCreateAccount } from './steps/create-account.js'
import { setAccountAttributes } from './steps/set-attributes.js'
import { setManagerPermissions } from './steps/set-permissions.js'
import { sendGasTokens } from './steps/send-gas.js'
import { onrampBaseTokens } from './steps/onramp-tokens.js'
import { verifyOnboarding } from './steps/verify.js'

/**
 * Full user onboarding orchestrator.
 *
 * Executes all onboarding steps in sequence:
 * 1. Resolve admin account
 * 2. Create account (or reuse existing)
 * 3. Set investor attributes
 * 4. Set manager permissions (if requested)
 * 5. Send gas tokens to wallet
 * 6. Onramp base tokens to account
 * 7. Verify everything
 *
 * Each step is independently callable — this function just wires them together.
 *
 * @param config - Service configuration (chain, keys, diamond, defaults)
 * @param params - Per-user parameters (wallet, attributes, amounts)
 * @returns OnboardResult with account address, step results, and verification
 */
export async function onboardUser(
  config: OnboardConfig,
  params: OnboardUserParams,
): Promise<OnboardResult> {
  const steps: StepResult[] = []

  // 1. Resolve admin account address
  const adminAccountAddress = await getAdminAccount(config)

  // 2. Create account (idempotent)
  const { accountAddress, stepResult: createResult } = await getOrCreateAccount(
    config,
    adminAccountAddress,
    params.walletAddress,
    params.accountName,
    params.accountType,
  )
  steps.push(createResult)

  // 3. Set investor attributes
  const attrResult = await setAccountAttributes(
    config,
    adminAccountAddress,
    accountAddress,
    params.attributes,
  )
  steps.push(attrResult)

  // 4. Set manager permissions (optional)
  const fundIds = params.roles?.managerFundIds ?? []
  const permResults = await setManagerPermissions(
    config,
    adminAccountAddress,
    accountAddress,
    fundIds,
  )
  steps.push(...permResults)

  // 5. Send gas tokens
  const gasResult = await sendGasTokens(
    config,
    params.walletAddress,
    params.gasTokenAmount,
  )
  steps.push(gasResult)

  // 6. Onramp base tokens
  const onrampResult = await onrampBaseTokens(
    config,
    adminAccountAddress,
    accountAddress,
    params.baseTokenAmount,
  )
  steps.push(onrampResult)

  // 7. Verify
  const verification = await verifyOnboarding(config, params.walletAddress)

  return {
    accountAddress,
    adminAccountAddress,
    steps,
    verified: verification.verified,
  }
}
```

**Step 2: Verify it compiles**

Run: `cd services/user-onboard && npx tsc --noEmit src/onboard.ts`
Expected: No errors

**Step 3: Commit**

```bash
git add services/user-onboard/src/onboard.ts
git commit -m "feat(user-onboard): add onboardUser orchestrator (wires all steps in sequence)"
```

---

### Task 13: Index — Re-exports

**Files:**
- Create: `services/user-onboard/src/index.ts`

**Step 1: Write barrel exports**

```typescript
// services/user-onboard/src/index.ts

// Types
export type {
  ChainConfig,
  OnboardConfig,
  InvestorAttributes,
  OnboardUserParams,
  StepResult,
  OnboardResult,
  InvestorAttributesUpdateStruct,
} from './types.js'
export { TransactionStatus } from './types.js'

// Orchestrator
export { onboardUser } from './onboard.js'

// Individual step functions
export { getOrCreateAccount } from './steps/create-account.js'
export { setAccountAttributes } from './steps/set-attributes.js'
export { setManagerPermissions } from './steps/set-permissions.js'
export { sendGasTokens } from './steps/send-gas.js'
export { onrampBaseTokens } from './steps/onramp-tokens.js'
export { verifyOnboarding } from './steps/verify.js'
export type { VerificationResult } from './steps/verify.js'

// Utilities
export { createCashFundTokenId } from './utils/token-ids.js'
export { createPublicClient, createAdminWalletClient, buildChain } from './utils/clients.js'
export { getDiamondContract, getAdminAccount } from './utils/diamond.js'
```

**Step 2: Full typecheck**

Run: `cd services/user-onboard && npx tsc --noEmit`
Expected: No errors (all files compile together)

**Step 3: Commit**

```bash
git add services/user-onboard/src/index.ts
git commit -m "feat(user-onboard): add barrel index with all public exports"
```

---

### Task 14: Final Verification & Cleanup

**Step 1: Full typecheck from scratch**

Run: `cd services/user-onboard && npx tsc --noEmit`
Expected: 0 errors

**Step 2: Verify directory structure**

Run: `find services/user-onboard -type f | sort`
Expected:
```
services/user-onboard/package.json
services/user-onboard/src/index.ts
services/user-onboard/src/onboard.ts
services/user-onboard/src/steps/create-account.ts
services/user-onboard/src/steps/onramp-tokens.ts
services/user-onboard/src/steps/send-gas.ts
services/user-onboard/src/steps/set-attributes.ts
services/user-onboard/src/steps/set-permissions.ts
services/user-onboard/src/steps/verify.ts
services/user-onboard/src/types.ts
services/user-onboard/src/utils/clients.ts
services/user-onboard/src/utils/diamond.ts
services/user-onboard/src/utils/token-ids.ts
services/user-onboard/tsconfig.json
```

**Step 3: Final commit**

```bash
git add -A services/user-onboard/
git commit -m "feat(user-onboard): complete user onboarding service v0.1.0"
```

---

## Reference: Contract Interaction Summary

| Step | Contract Function | Signer | Access Control |
|------|------------------|--------|----------------|
| createAccount | `createAccount(admin, owner, name, type, attrs)` | Admin wallet | ROLE_ADMIN via proposal |
| setAccountAttributes | `setAccountAttributes(admin, target, update)` | Admin wallet | ROLE_ADMIN via proposal |
| setAccountManager | `setAccountManager(admin, target, fundId, true)` | Admin wallet | ROLE_ADMIN via proposal |
| onramp | `onramp(admin, user, cashTokenId, amount)` | Admin wallet | ROLE_ADMIN via proposal |
| sendGasTokens | Native ETH transfer | Admin wallet | N/A |
| getAccounts | `getAccounts(wallet)` | Read-only | Public view |
| balanceOf | `balanceOf(account, tokenId)` | Read-only | Public view |

## Reference: Config Example (Testnet)

```typescript
const config: OnboardConfig = {
  rpcUrl: 'https://testnet-apparentco-z3e61.avax-test.network/ext/bc/.../rpc?token=...',
  chain: {
    id: 2201,
    name: 'Avalanche Testnet Custom',
    nativeCurrency: { decimals: 18, name: 'X', symbol: 'X' },
  },
  diamondAddress: '0x350Cc4E0247f54Ec311d0A69C95668a9D7bD3973',
  adminPrivateKey: '0x7c852118294e51e653712a81e05800f419141751be58f605c371e15141b007a6',
  adminWalletAddress: '0x90F79bf6EB2c4f870365E785982E1f101E93b906',
  gasTokenAmount: 1000000000000000000n, // 1 native token
  baseTokenAmount: 1000000000000000000000000n, // 1M base tokens
  umbrellaId: 1,
  currencyId: 1,
}
```

## Reference: User Params Example

```typescript
const params: OnboardUserParams = {
  walletAddress: '0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC',
  accountName: 'Investor Account',
  accountType: 1,
  attributes: {
    kycVerified: true,
    accreditedInvestor: true,
    qualifiedPurchaser: false,
    jurisdiction: 'US',
    investorType: 1,
    tags: [],
  },
}
```
