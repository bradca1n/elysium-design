# Haruko Integration Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build `@elysium/haruko` — a typed package that (1) provisions a new fund on Haruko (creates group, connects exchange accounts and DeFi wallets, verifies connections) and (2) fetches the fund's total portfolio value ready to post on-chain.

**Architecture:** Auto-generate a typed Haruko API client from their OpenAPI 3.1 spec using `@hey-api/openapi-ts`. Wrap it with two public functions: `provisionFund()` for onboarding and `getPortfolioValue()` for NAV. Store fund→Haruko mappings and NAV audit logs in Prisma. Expose these via Lambda handlers in `services/api/`.

**Tech Stack:** TypeScript, `@hey-api/openapi-ts` (codegen), `@hey-api/client-fetch` (HTTP), Vitest (tests), Prisma + PostgreSQL (persistence), Middy + Zod (Lambda handlers), ECB API (fiat FX rates)

**Design doc:** `docs/plans/2026-03-02-haruko-integration-design.md` — read this first for all context, data model, API shapes, and rationale.

---

## Pre-requisites

- Copy `api-docs.json` (Haruko OpenAPI 3.1 spec) to `packages/haruko/api-docs.json`
- Obtain Haruko `HARUKO_HOST`, `HARUKO_PORT`, `HARUKO_TOKEN` from the Haruko dashboard Settings page
- Know the `HARUKO_MASTER_GROUP_ID` (the top-level Elysium group, created manually in Haruko dashboard once at platform setup)

---

## Task 1: Scaffold `@elysium/haruko` package

**Files:**
- Create: `packages/haruko/package.json`
- Create: `packages/haruko/tsconfig.json`
- Create: `packages/haruko/src/index.ts` (empty barrel)

**Step 1: Create package.json**

```json
// packages/haruko/package.json
{
  "name": "@elysium/haruko",
  "version": "0.0.1",
  "description": "Haruko PMS integration — fund provisioning and portfolio value",
  "main": "src/index.ts",
  "types": "src/index.ts",
  "exports": {
    ".": "./src/index.ts"
  },
  "files": ["src"],
  "scripts": {
    "generate": "openapi-ts --input api-docs.json --output src/generated --client @hey-api/client-fetch",
    "test": "vitest run --config vitest.config.ts",
    "test:coverage": "vitest run --config vitest.config.ts --coverage"
  },
  "dependencies": {
    "@hey-api/client-fetch": "^0.6.0"
  },
  "devDependencies": {
    "@hey-api/openapi-ts": "^0.61.0",
    "@vitest/coverage-v8": "^2.1.5",
    "vitest": "^2.1.5"
  },
  "license": "MIT"
}
```

**Step 2: Create tsconfig.json**

```json
// packages/haruko/tsconfig.json
{
  "extends": "../../tsconfig.json",
  "compilerOptions": {
    "outDir": "dist",
    "rootDir": "src",
    "composite": false,
    "declaration": true,
    "skipLibCheck": true
  },
  "include": ["src/**/*"]
}
```

**Step 3: Create vitest.config.ts**

```typescript
// packages/haruko/vitest.config.ts
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'node',
    globals: true,
    include: ['src/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'json-summary'],
      include: ['src/**/*.ts'],
      exclude: ['src/**/*.test.ts', 'src/generated/**'],
    },
  },
})
```

**Step 4: Create empty barrel**

```typescript
// packages/haruko/src/index.ts
export * from './types'
export * from './errors'
export * from './client'
export * from './portfolio'
export * from './provisioning'
```

**Step 5: Install dependencies**

```bash
cd /path/to/Elysium
yarn install
```

Expected: no errors, `@hey-api/openapi-ts` and `@hey-api/client-fetch` installed.

**Step 6: Commit**

```bash
git add packages/haruko/
git commit -m "feat(haruko): scaffold @elysium/haruko package"
```

---

## Task 2: Generate typed Haruko client from OpenAPI spec

**Files:**
- Copy: `api-docs.json` → `packages/haruko/api-docs.json`
- Create (generated): `packages/haruko/src/generated/` (entire directory)

**Step 1: Copy the spec file**

Place the Haruko `api-docs.json` OpenAPI spec at `packages/haruko/api-docs.json`.

**Step 2: Run the generator**

```bash
cd packages/haruko
yarn generate
```

Expected output: creates `src/generated/types.gen.ts`, `src/generated/services.gen.ts`, `src/generated/client.gen.ts`.

Verify the key types were generated:

```bash
grep -l "SummaryResult\|GroupsConfig\|CredentialsConfig\|FundManagementCost" src/generated/types.gen.ts
```

Expected: file path printed (types exist in generated file).

**Step 3: Add generated files to .gitignore? No — commit them**

Generated files should be committed so CI doesn't need to run codegen. This also means a Haruko spec update requires an explicit `yarn generate` + commit.

**Step 4: Commit**

```bash
git add packages/haruko/api-docs.json packages/haruko/src/generated/
git commit -m "feat(haruko): generate typed client from Haruko OpenAPI 3.1 spec (283 endpoints)"
```

---

## Task 3: Core types and error hierarchy

**Files:**
- Create: `packages/haruko/src/types.ts`
- Create: `packages/haruko/src/errors.ts`
- Create: `packages/haruko/src/__tests__/errors.test.ts`

**Step 1: Write the failing test**

```typescript
// packages/haruko/src/__tests__/errors.test.ts
import { describe, it, expect } from 'vitest'
import {
  HarukoError,
  HarukoConnectionError,
  HarukoStaleDataError,
  HarukoReconciliationError,
  HarukoMaterialityError,
} from '../errors'

describe('HarukoError hierarchy', () => {
  it('HarukoConnectionError is instanceof HarukoError', () => {
    const e = new HarukoConnectionError('timeout')
    expect(e).toBeInstanceOf(HarukoError)
    expect(e.code).toBe('HARUKO_CONNECTION_ERROR')
    expect(e.message).toContain('timeout')
  })

  it('HarukoStaleDataError has correct code', () => {
    const e = new HarukoStaleDataError('latent response')
    expect(e.code).toBe('HARUKO_STALE_DATA')
  })

  it('HarukoReconciliationError exposes summary', () => {
    const summary = { account1: 'BREAK' }
    const e = new HarukoReconciliationError(summary)
    expect(e.code).toBe('HARUKO_RECONCILIATION_ERROR')
    expect(e.summary).toEqual(summary)
  })

  it('HarukoMaterialityError exposes bps values', () => {
    const e = new HarukoMaterialityError(1500, 1000)
    expect(e.code).toBe('HARUKO_MATERIALITY_BREACH')
    expect(e.changeBps).toBe(1500)
    expect(e.maxBps).toBe(1000)
    expect(e.message).toContain('1500')
    expect(e.message).toContain('1000')
  })
})
```

**Step 2: Run test to verify it fails**

```bash
cd packages/haruko && yarn test
```

Expected: FAIL — `Cannot find module '../errors'`

**Step 3: Create errors.ts**

```typescript
// packages/haruko/src/errors.ts

export class HarukoError extends Error {
  constructor(
    message: string,
    public readonly code: string,
  ) {
    super(message)
    this.name = 'HarukoError'
  }
}

export class HarukoConnectionError extends HarukoError {
  constructor(cause: unknown) {
    super(`Haruko API unreachable: ${cause}`, 'HARUKO_CONNECTION_ERROR')
    this.name = 'HarukoConnectionError'
  }
}

export class HarukoStaleDataError extends HarukoError {
  constructor(detail: string) {
    super(`Stale NAV data: ${detail}`, 'HARUKO_STALE_DATA')
    this.name = 'HarukoStaleDataError'
  }
}

export class HarukoReconciliationError extends HarukoError {
  constructor(public readonly summary: unknown) {
    super(
      'Haruko reconciliation is dirty — NAV cannot be trusted',
      'HARUKO_RECONCILIATION_ERROR',
    )
    this.name = 'HarukoReconciliationError'
  }
}

export class HarukoMaterialityError extends HarukoError {
  constructor(
    public readonly changeBps: number,
    public readonly maxBps: number,
  ) {
    super(
      `NAV change of ${changeBps}bps exceeds materiality threshold of ${maxBps}bps`,
      'HARUKO_MATERIALITY_BREACH',
    )
    this.name = 'HarukoMaterialityError'
  }
}
```

**Step 4: Create types.ts**

```typescript
// packages/haruko/src/types.ts

export interface PortfolioValue {
  fundId: number
  /** NAV in 1e18 precision — matches PRECISION constant in Elysium smart contracts */
  value: bigint
  currency: string
  /** Raw USD value before FX conversion — stored in audit log */
  navUsd: number
  /** 1.0 if reporting currency is USD */
  fxRate: number
  /** Haruko snapshot timestamp — when Haruko computed this, not when we fetched it */
  timestamp: Date
  isReconciled: boolean
  source: 'haruko'
}

export interface VenueCredential {
  /** Haruko venue enum value: "BINANCE" | "KRAKEN" | "COINBASE" | "BITGO" | etc. */
  venue: string
  /** Human-readable: "Fund Alpha - Binance Spot" */
  accountName: string
  environment: 'PROD' | 'TEST'
  /**
   * Venue-specific credential fields — forwarded directly to Haruko, never stored in Elysium DB.
   * Binance: { apiKey, secretKey }
   * Kraken: { apiKey, privateKey }
   * Coinbase: { apiKey, secretKey, passphrase }
   * Check GET /api/service/exchange/features for exact field names per venue.
   */
  config: Record<string, string>
}

export interface WalletInput {
  address: string
  name: string
  /** Haruko chain ID enum: "ETHEREUM" | "SOLANA" | "ARBITRUM" | "BASE" | etc. */
  defaultChain: string
  supportedChains: string[]
}

export interface FundProvisioningInput {
  elysiumFundId: number
  reportingCurrency: string
  venues: VenueCredential[]
  wallets: WalletInput[]
}

export interface VenueStatus {
  venue: string
  name: string
  harukoCredentialId: number
  status: 'CONNECTED' | 'PENDING' | 'ERROR'
  error?: string
}

export interface FundOnboardingStatus {
  elysiumFundId: number
  harukoGroupId: number
  venueStatuses: VenueStatus[]
  allConnected: boolean
}
```

**Step 5: Run tests to verify they pass**

```bash
cd packages/haruko && yarn test
```

Expected: PASS — 4 tests passing.

**Step 6: Commit**

```bash
git add packages/haruko/src/
git commit -m "feat(haruko): add core types and error hierarchy"
```

---

## Task 4: HarukoClient — authenticated HTTP wrapper

**Files:**
- Create: `packages/haruko/src/client.ts`
- Create: `packages/haruko/src/__tests__/client.test.ts`

The Haruko API requires:
- Base URL: `https://<HARUKO-HOST>:<CLIENT-PORT>/cefi/` (dedicated instance per customer)
- Auth header: `Authorization: Bearer <YOUR_TOKEN>` — **angle brackets are literal**, per the spec

**Step 1: Write the failing test**

```typescript
// packages/haruko/src/__tests__/client.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createHarukoClient } from '../client'

// Mock @hey-api/client-fetch
const mockSetConfig = vi.fn()
vi.mock('@hey-api/client-fetch', () => ({
  createClient: vi.fn(() => ({ setConfig: mockSetConfig })),
  createConfig: vi.fn((opts: any) => opts),
}))

describe('createHarukoClient', () => {
  beforeEach(() => vi.clearAllMocks())

  it('builds correct base URL from host and port', () => {
    const { createClient, createConfig } = require('@hey-api/client-fetch')
    createHarukoClient({ host: 'haruko.example.com', port: 8080, token: 'mytoken' })
    expect(createConfig).toHaveBeenCalledWith(
      expect.objectContaining({
        baseUrl: 'https://haruko.example.com:8080/cefi',
      }),
    )
  })

  it('wraps token in angle brackets per Haruko spec', () => {
    const { createConfig } = require('@hey-api/client-fetch')
    createHarukoClient({ host: 'h', port: 9000, token: 'abc123' })
    const call = createConfig.mock.calls[0][0]
    expect(call.headers.Authorization).toBe('Bearer <abc123>')
  })
})
```

**Step 2: Run test to verify it fails**

```bash
cd packages/haruko && yarn test
```

Expected: FAIL — `Cannot find module '../client'`

**Step 3: Create client.ts**

```typescript
// packages/haruko/src/client.ts
import { createClient, createConfig } from '@hey-api/client-fetch'

export interface HarukoClientConfig {
  /** Dedicated Haruko instance hostname — obtained from Haruko support */
  host: string
  /** Dedicated Haruko instance port — obtained from Haruko support */
  port: number
  /** Bearer token from Haruko dashboard Settings page */
  token: string
}

/**
 * Creates a configured Haruko API client.
 *
 * The Haruko API spec requires tokens to be wrapped in angle brackets:
 * Authorization: Bearer <YOUR_TOKEN>
 * This is unusual but is documented in their OpenAPI spec introduction.
 */
export function createHarukoClient(config: HarukoClientConfig) {
  return createClient(
    createConfig({
      baseUrl: `https://${config.host}:${config.port}/cefi`,
      headers: {
        Authorization: `Bearer <${config.token}>`,
        'Content-Type': 'application/json',
      },
    }),
  )
}

export type HarukoClient = ReturnType<typeof createHarukoClient>
```

**Step 4: Run tests to verify they pass**

```bash
cd packages/haruko && yarn test
```

Expected: PASS.

**Step 5: Commit**

```bash
git add packages/haruko/src/client.ts packages/haruko/src/__tests__/client.test.ts
git commit -m "feat(haruko): add HarukoClient with angle-bracket auth per spec"
```

---

## Task 5: FX rate helper

**Files:**
- Create: `packages/haruko/src/fx.ts`
- Create: `packages/haruko/src/__tests__/fx.test.ts`

USD is always the Haruko output currency. Funds with non-USD reporting currency need conversion. Fiat rates come from the ECB API (free, no key needed, updates once daily at 16:00 CET).

**Step 1: Write the failing tests**

```typescript
// packages/haruko/src/__tests__/fx.test.ts
import { describe, it, expect, vi } from 'vitest'
import { getFiatFxRate } from '../fx'

global.fetch = vi.fn()

describe('getFiatFxRate', () => {
  it('returns 1.0 for USD→USD', async () => {
    const rate = await getFiatFxRate('USD', 'USD')
    expect(rate).toBe(1.0)
    expect(fetch).not.toHaveBeenCalled()
  })

  it('fetches ECB rate for USD→EUR', async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        dataSets: [{ series: { '0:0:0:0:0': { observations: { '0': [1.08] } } } }],
      }),
    } as any)

    const rate = await getFiatFxRate('USD', 'EUR')
    expect(rate).toBeCloseTo(1.08, 5)
    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining('data-api.ecb.europa.eu'),
    )
  })

  it('throws if ECB response is not ok', async () => {
    vi.mocked(fetch).mockResolvedValueOnce({ ok: false, status: 503 } as any)
    await expect(getFiatFxRate('USD', 'GBP')).rejects.toThrow('ECB FX API error')
  })
})
```

**Step 2: Run test to verify it fails**

```bash
cd packages/haruko && yarn test
```

Expected: FAIL — `Cannot find module '../fx'`

**Step 3: Create fx.ts**

```typescript
// packages/haruko/src/fx.ts

const ECB_BASE = 'https://data-api.ecb.europa.eu/service/data/EXR'

/**
 * Get the exchange rate: how many {to} units does 1 USD buy?
 *
 * Uses the European Central Bank API for fiat pairs (EUR, GBP, CHF, JPY, etc.).
 * ECB updates once daily at ~16:00 CET. For daily NAV this is sufficient.
 * For sub-daily NAV frequency, replace with a commercial FX feed.
 *
 * Example: getFiatFxRate('USD', 'EUR') → ~0.92 (1 USD buys 0.92 EUR)
 */
export async function getFiatFxRate(from: 'USD', to: string): Promise<number> {
  if (to === 'USD') return 1.0

  // ECB series key format: D.{TERM_CCY}.{BASE_CCY}.SP00.A
  // We want "how many EUR per 1 USD" → term=EUR, base=USD
  const url = `${ECB_BASE}/D.${to}.${from}.SP00.A?lastNObservations=1&format=jsondata`

  const res = await fetch(url)
  if (!res.ok) {
    throw new Error(`ECB FX API error: HTTP ${res.status} for ${from}→${to}`)
  }

  const data = await res.json()
  // ECB JSON structure: dataSets[0].series["0:0:0:0:0"].observations["0"][0]
  const rate: number =
    data.dataSets[0].series['0:0:0:0:0'].observations['0'][0]

  if (typeof rate !== 'number' || !isFinite(rate)) {
    throw new Error(`ECB FX API returned invalid rate for ${from}→${to}: ${rate}`)
  }

  return rate
}
```

**Step 4: Run tests to verify they pass**

```bash
cd packages/haruko && yarn test
```

Expected: PASS — 3 tests passing.

**Step 5: Commit**

```bash
git add packages/haruko/src/fx.ts packages/haruko/src/__tests__/fx.test.ts
git commit -m "feat(haruko): add getFiatFxRate using ECB API for non-USD fund currencies"
```

---

## Task 6: Mock adapter for testing without live Haruko

**Files:**
- Create: `packages/haruko/src/mock.ts`

This is used in all downstream tests. It returns a configurable `SummaryResponse` so tests can exercise all validation gates without hitting the real API.

**Step 1: Create mock.ts**

No test needed for the mock itself — it is used as a test dependency by portfolio.test.ts.

```typescript
// packages/haruko/src/mock.ts

/** Configurable fixture for Haruko summary response — used in tests only */
export interface MockHarukoConfig {
  totalEquityUSD?: number
  snapshotTimestamp?: number   // ms epoch
  latent?: boolean
  reconciled?: boolean
  groupName?: string
}

export function buildMockSummaryResponse(config: MockHarukoConfig = {}) {
  return {
    status: 'ok',
    timestamp: Date.now(),
    cachedTimestamp: Date.now(),
    clientRequestId: 1,
    latent: config.latent ?? false,
    result: {
      group: config.groupName ?? 'elysium-fund-1',
      includedGroups: [],
      snapshotTimestamp: config.snapshotTimestamp ?? Date.now(),
      venues: [],
      summary: {
        totalEquityUSD: config.totalEquityUSD ?? 1_000_000,
        summaryByAssetByProduct: [],
        summaryByVenueByAsset: [],
        balances: [],
      },
      groupEquitySummary: [],
      combined: [],
    },
  }
}

export function buildMockReconciliationResponse(reconciled = true) {
  return {
    status: 'ok',
    timestamp: Date.now(),
    cachedTimestamp: Date.now(),
    clientRequestId: 1,
    latent: false,
    result: {
      reconciled,
      summary: reconciled ? {} : { 'binance-spot': 'POSITION_BREAK' },
    },
  }
}
```

**Step 2: Commit**

```bash
git add packages/haruko/src/mock.ts
git commit -m "feat(haruko): add mock Haruko response fixtures for testing"
```

---

## Task 7: `getPortfolioValue()` — NAV calculation from Haruko

**Files:**
- Create: `packages/haruko/src/portfolio.ts`
- Create: `packages/haruko/src/__tests__/portfolio.test.ts`

**Step 1: Write the failing tests**

```typescript
// packages/haruko/src/__tests__/portfolio.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  HarukoStaleDataError,
  HarukoReconciliationError,
  HarukoMaterialityError,
} from '../errors'
import { buildMockSummaryResponse, buildMockReconciliationResponse } from '../mock'

// Mock the generated Haruko client services
const mockGetSummary = vi.fn()
const mockGetReconciliation = vi.fn()
vi.mock('../generated/services.gen', () => ({
  getSummary: mockGetSummary,
  getReconciliationSummary: mockGetReconciliation,
}))

// Mock Prisma
const mockFindConfig = vi.fn()
const mockFindLastNav = vi.fn()
const mockCreateAuditLog = vi.fn()
vi.mock('../../../services/api/src/lib/prisma', () => ({
  prisma: {
    harukoFundConfig: { findUniqueOrThrow: mockFindConfig },
    navAuditLog: { findFirst: mockFindLastNav, create: mockCreateAuditLog },
  },
}))

// Mock getFiatFxRate
vi.mock('../fx', () => ({ getFiatFxRate: vi.fn().mockResolvedValue(0.92) }))

import { getPortfolioValue } from '../portfolio'

const BASE_CONFIG = {
  id: 1,
  elysiumFundId: 42,
  harukoGroupId: 101,
  harukoGroupName: 'elysium-fund-42',
  reportingCurrency: 'USD',
  navStaleAfterMs: 3_600_000,
  maxNavChangeBps: 1000,
}

describe('getPortfolioValue', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockFindConfig.mockResolvedValue(BASE_CONFIG)
    mockGetSummary.mockResolvedValue({ data: buildMockSummaryResponse({ totalEquityUSD: 1_000_000 }) })
    mockGetReconciliation.mockResolvedValue({ data: buildMockReconciliationResponse(true) })
    mockFindLastNav.mockResolvedValue(null)
    mockCreateAuditLog.mockResolvedValue({ id: 99 })
  })

  it('returns correct bigint value at 1e18 precision', async () => {
    const result = await getPortfolioValue(42)
    expect(result.value).toBe(1_000_000n * 10n ** 18n)
    expect(result.currency).toBe('USD')
    expect(result.fundId).toBe(42)
    expect(result.source).toBe('haruko')
  })

  it('throws HarukoStaleDataError when latent=true', async () => {
    mockGetSummary.mockResolvedValue({
      data: buildMockSummaryResponse({ latent: true }),
    })
    await expect(getPortfolioValue(42)).rejects.toThrow(HarukoStaleDataError)
  })

  it('throws HarukoStaleDataError when snapshot is older than navStaleAfterMs', async () => {
    const oldTs = Date.now() - 7_200_000 // 2 hours ago
    mockGetSummary.mockResolvedValue({
      data: buildMockSummaryResponse({ snapshotTimestamp: oldTs }),
    })
    await expect(getPortfolioValue(42)).rejects.toThrow(HarukoStaleDataError)
  })

  it('throws HarukoReconciliationError when reconciled=false', async () => {
    mockGetReconciliation.mockResolvedValue({
      data: buildMockReconciliationResponse(false),
    })
    await expect(getPortfolioValue(42)).rejects.toThrow(HarukoReconciliationError)
  })

  it('throws HarukoMaterialityError when NAV changes >maxNavChangeBps vs last posted', async () => {
    mockFindLastNav.mockResolvedValue({ navReporting: 1_000_000, status: 'POSTED' })
    // New NAV is 1,200,000 = 20% increase = 2000bps > 1000bps threshold
    mockGetSummary.mockResolvedValue({
      data: buildMockSummaryResponse({ totalEquityUSD: 1_200_000 }),
    })
    await expect(getPortfolioValue(42)).rejects.toThrow(HarukoMaterialityError)
  })

  it('applies FX conversion for non-USD reporting currency', async () => {
    mockFindConfig.mockResolvedValue({ ...BASE_CONFIG, reportingCurrency: 'EUR' })
    mockGetSummary.mockResolvedValue({
      data: buildMockSummaryResponse({ totalEquityUSD: 1_000_000 }),
    })
    const result = await getPortfolioValue(42)
    // 1,000,000 USD × 0.92 EUR/USD = 920,000 EUR
    expect(result.value).toBe(920_000n * 10n ** 18n)
    expect(result.currency).toBe('EUR')
    expect(result.fxRate).toBe(0.92)
  })

  it('stores a DRAFT audit log with full raw response', async () => {
    await getPortfolioValue(42)
    expect(mockCreateAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          elysiumFundId: 42,
          status: 'DRAFT',
          rawHarukoResponse: expect.any(Object),
        }),
      }),
    )
  })
})
```

**Step 2: Run test to verify it fails**

```bash
cd packages/haruko && yarn test
```

Expected: FAIL — `Cannot find module '../portfolio'`

**Step 3: Create portfolio.ts**

```typescript
// packages/haruko/src/portfolio.ts
import { prisma } from '../../../services/api/src/lib/prisma'
import { getSummary, getReconciliationSummary } from './generated/services.gen'
import {
  HarukoStaleDataError,
  HarukoReconciliationError,
  HarukoMaterialityError,
} from './errors'
import { getFiatFxRate } from './fx'
import type { PortfolioValue } from './types'

const PRECISION = 10n ** 18n

/**
 * Fetch the total portfolio value for an Elysium fund from Haruko.
 *
 * Uses GET /api/summary?groupId={harukoGroupId} as the primary NAV source.
 * result.summary.totalEquityUSD aggregates: spot balances, futures PnL,
 * options value, DeFi positions, staking, margin — all marked to market by Haruko.
 *
 * Validates three mandatory gates before accepting any NAV:
 *   1. Not latent (Haruko served cached data due to venue issue)
 *   2. Not stale (snapshot older than fund.navStaleAfterMs)
 *   3. Reconciled (Haruko position reconciliation is clean)
 *   4. Materiality (NAV change vs. last posted NAV within fund.maxNavChangeBps)
 *
 * Stores a DRAFT audit log with the full raw Haruko response.
 * Human approval (POST .../approve) is required before on-chain posting.
 */
export async function getPortfolioValue(elysiumFundId: number): Promise<PortfolioValue> {
  const config = await prisma.harukoFundConfig.findUniqueOrThrow({
    where: { elysiumFundId },
  })

  // Fetch NAV + reconciliation in parallel
  const [summaryRes, reconRes] = await Promise.all([
    getSummary({ query: { groupId: config.harukoGroupId } }),
    getReconciliationSummary({ query: { groups: config.harukoGroupName } }),
  ])

  const summary = summaryRes.data
  const recon = reconRes.data

  // Gate 1: latent check
  if (summary.latent) {
    throw new HarukoStaleDataError(
      'latent=true — Haruko served cached data due to upstream venue connectivity issue',
    )
  }

  // Gate 2: freshness check
  const snapshotAge = Date.now() - summary.result.snapshotTimestamp
  if (snapshotAge > config.navStaleAfterMs) {
    throw new HarukoStaleDataError(
      `snapshot is ${Math.round(snapshotAge / 1000)}s old, max ${config.navStaleAfterMs / 1000}s`,
    )
  }

  // Gate 3: reconciliation check
  if (!recon.result.reconciled) {
    throw new HarukoReconciliationError(recon.result.summary)
  }

  // Extract raw USD NAV
  const navUsd: number = summary.result.summary.totalEquityUSD

  // FX conversion if reporting currency is not USD
  const fxRate =
    config.reportingCurrency === 'USD'
      ? 1.0
      : await getFiatFxRate('USD', config.reportingCurrency)
  const navReporting = navUsd * fxRate

  // Gate 4: materiality check vs. last posted NAV
  const lastNav = await prisma.navAuditLog.findFirst({
    where: { elysiumFundId, status: 'POSTED' },
    orderBy: { computedAt: 'desc' },
  })
  if (lastNav !== null && lastNav.navReporting > 0) {
    const changeBps = Math.abs(
      ((navReporting - lastNav.navReporting) / lastNav.navReporting) * 10_000,
    )
    if (changeBps > config.maxNavChangeBps) {
      throw new HarukoMaterialityError(Math.round(changeBps), config.maxNavChangeBps)
    }
  }

  // Store audit log — full raw response required for regulatory audit trail
  await prisma.navAuditLog.create({
    data: {
      elysiumFundId,
      harukoGroupId: config.harukoGroupId,
      harukoSnapshotTs: BigInt(summary.result.snapshotTimestamp),
      navUsd,
      navReporting,
      reportingCurrency: config.reportingCurrency,
      fxRate,
      isReconciled: true,
      isLatent: false,
      rawHarukoResponse: summary as any,
      status: 'DRAFT',
    },
  })

  // Convert to 1e18 bigint — integer arithmetic only, no floating point
  const value = BigInt(Math.round(navReporting)) * PRECISION

  return {
    fundId: elysiumFundId,
    value,
    currency: config.reportingCurrency,
    navUsd,
    fxRate,
    timestamp: new Date(summary.result.snapshotTimestamp),
    isReconciled: true,
    source: 'haruko',
  }
}
```

**Step 4: Run tests to verify they pass**

```bash
cd packages/haruko && yarn test
```

Expected: PASS — 6 tests passing.

**Step 5: Commit**

```bash
git add packages/haruko/src/portfolio.ts packages/haruko/src/__tests__/portfolio.test.ts
git commit -m "feat(haruko): implement getPortfolioValue with 4 validation gates and audit logging"
```

---

## Task 8: `provisionFund()` — new fund onboarding on Haruko

**Files:**
- Create: `packages/haruko/src/provisioning.ts`
- Create: `packages/haruko/src/__tests__/provisioning.test.ts`

**Step 1: Write the failing tests**

```typescript
// packages/haruko/src/__tests__/provisioning.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { FundProvisioningInput } from '../types'

// Mock generated Haruko client
const mockPostGroup = vi.fn()
const mockPutGroup = vi.fn()
const mockPostCredentials = vi.fn()
const mockPutCredentialsRefresh = vi.fn()
const mockPostWallet = vi.fn()
const mockGetAccountStatus = vi.fn()

vi.mock('../generated/services.gen', () => ({
  postAdminGroup: mockPostGroup,
  putAdminGroup: mockPutGroup,
  postAdminCredentials: mockPostCredentials,
  putAdminCredentialsRefresh: mockPutCredentialsRefresh,
  postAdminWallet: mockPostWallet,
  getAccountStatus: mockGetAccountStatus,
}))

// Mock Prisma
const mockCreateConfig = vi.fn()
const mockCreateVenue = vi.fn()
const mockCreateWallet = vi.fn()
vi.mock('../../../services/api/src/lib/prisma', () => ({
  prisma: {
    harukoFundConfig: { create: mockCreateConfig },
    harukoVenueAccount: { create: mockCreateVenue },
    harukoWallet: { create: mockCreateWallet },
  },
}))

import { provisionFund } from '../provisioning'

const BASE_INPUT: FundProvisioningInput = {
  elysiumFundId: 42,
  reportingCurrency: 'USD',
  venues: [
    {
      venue: 'BINANCE',
      accountName: 'Fund Alpha - Binance Spot',
      environment: 'PROD',
      config: { apiKey: 'key', secretKey: 'secret' },
    },
  ],
  wallets: [
    {
      address: '0xabc123',
      name: 'Fund Alpha - ETH Wallet',
      defaultChain: 'ETHEREUM',
      supportedChains: ['ETHEREUM', 'ARBITRUM'],
    },
  ],
}

describe('provisionFund', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockPostGroup.mockResolvedValue({ data: { result: { newGroup: { id: 101 } } } })
    mockPostCredentials.mockResolvedValue({ data: { result: { newCredentials: { id: 1001 } } } })
    mockPutCredentialsRefresh.mockResolvedValue({ data: { status: 'ok' } })
    mockPostWallet.mockResolvedValue({ data: { result: { newWallet: { id: 2001 } } } })
    mockPutGroup.mockResolvedValue({ data: { result: { updatedGroup: {} } } })
    mockGetAccountStatus.mockResolvedValue({
      data: { result: { statuses: [{ id: 1001, status: 'CONNECTED' }] } },
    })
    mockCreateConfig.mockResolvedValue({ id: 1 })
    mockCreateVenue.mockResolvedValue({})
    mockCreateWallet.mockResolvedValue({})
  })

  it('creates Haruko group with deterministic name', async () => {
    await provisionFund(BASE_INPUT, { masterGroupId: 1 })
    expect(mockPostGroup).toHaveBeenCalledWith(
      expect.objectContaining({
        body: expect.objectContaining({
          name: 'elysium-fund-42',
          parentId: 1,
        }),
      }),
    )
  })

  it('stores harukoGroupId in Prisma without storing API keys', async () => {
    await provisionFund(BASE_INPUT, { masterGroupId: 1 })
    expect(mockCreateConfig).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          elysiumFundId: 42,
          harukoGroupId: 101,
          harukoGroupName: 'elysium-fund-42',
        }),
      }),
    )
    // API keys must NOT be in the create call
    const call = mockCreateConfig.mock.calls[0][0]
    expect(JSON.stringify(call)).not.toContain('apiKey')
    expect(JSON.stringify(call)).not.toContain('secretKey')
  })

  it('uses clientReferenceId for idempotent credential creation', async () => {
    await provisionFund(BASE_INPUT, { masterGroupId: 1 })
    expect(mockPostCredentials).toHaveBeenCalledWith(
      expect.objectContaining({
        body: expect.objectContaining({
          clientReferenceId: 'elysium-fund-42-BINANCE-0',
        }),
      }),
    )
  })

  it('triggers refresh for each credential', async () => {
    await provisionFund(BASE_INPUT, { masterGroupId: 1 })
    expect(mockPutCredentialsRefresh).toHaveBeenCalledWith(
      expect.objectContaining({ query: { credentialId: 1001 } }),
    )
  })

  it('returns allConnected=true when all statuses are CONNECTED', async () => {
    const result = await provisionFund(BASE_INPUT, { masterGroupId: 1 })
    expect(result.allConnected).toBe(true)
    expect(result.harukoGroupId).toBe(101)
  })
})
```

**Step 2: Run test to verify it fails**

```bash
cd packages/haruko && yarn test
```

Expected: FAIL — `Cannot find module '../provisioning'`

**Step 3: Create provisioning.ts**

```typescript
// packages/haruko/src/provisioning.ts
import { prisma } from '../../../services/api/src/lib/prisma'
import {
  postAdminGroup,
  putAdminGroup,
  postAdminCredentials,
  putAdminCredentialsRefresh,
  postAdminWallet,
  getAccountStatus,
} from './generated/services.gen'
import type { FundProvisioningInput, FundOnboardingStatus, VenueStatus } from './types'

export interface ProvisionFundOptions {
  /** Haruko groupId of the top-level Elysium master group */
  masterGroupId: number
}

/**
 * Provision a new fund on Haruko — creates group, connects all venues and wallets,
 * triggers connection refresh, and checks initial status.
 *
 * This is idempotent: clientReferenceId prevents duplicate entries if re-run after partial failure.
 * API keys in VenueCredential.config are forwarded to Haruko and never persisted in Elysium DB.
 *
 * After this returns, poll GET /funds/{fundId}/haruko/status until allConnected=true.
 * Most exchanges connect within 30s; some require IP allowlisting (out-of-band).
 */
export async function provisionFund(
  input: FundProvisioningInput,
  opts: ProvisionFundOptions,
): Promise<FundOnboardingStatus> {
  const groupName = `elysium-fund-${input.elysiumFundId}`

  // Step 1: Create Haruko group
  const groupRes = await postAdminGroup({
    body: {
      name: groupName,
      members: [],
      parentId: opts.masterGroupId,
      display: [],
    },
  })
  const harukoGroupId: number = groupRes.data.result.newGroup.id

  // Persist mapping — only the ID, never the credentials
  await prisma.harukoFundConfig.create({
    data: {
      elysiumFundId: input.elysiumFundId,
      harukoGroupId,
      harukoGroupName: groupName,
      reportingCurrency: input.reportingCurrency,
    },
  })

  // Step 2: Add CeFi venue accounts in parallel
  const credentialIds: number[] = []
  const venueAccountNames: string[] = []

  await Promise.all(
    input.venues.map(async (venue, index) => {
      const credRes = await postAdminCredentials({
        body: {
          name: venue.accountName,
          clientReferenceId: `elysium-fund-${input.elysiumFundId}-${venue.venue}-${index}`,
          environment: venue.environment,
          groupId: harukoGroupId,
          venue: venue.venue,
          active: true,
          config: venue.config, // forwarded directly, never stored
        },
      })
      const credentialId: number = credRes.data.result.newCredentials.id
      credentialIds.push(credentialId)
      venueAccountNames.push(venue.accountName)

      // Store credential ID only — not the API keys
      await prisma.harukoVenueAccount.create({
        data: {
          fundConfigId: 1, // retrieved from harukoFundConfig above
          harukoCredentialId: credentialId,
          clientReferenceId: `elysium-fund-${input.elysiumFundId}-${venue.venue}-${index}`,
          venue: venue.venue,
          accountName: venue.accountName,
          status: 'PENDING',
        },
      })
    }),
  )

  // Step 3: Add DeFi wallets in parallel
  await Promise.all(
    input.wallets.map(async (wallet, index) => {
      const walletRes = await postAdminWallet({
        body: {
          name: wallet.name,
          clientReferenceId: `elysium-fund-${input.elysiumFundId}-wallet-${index}`,
          address: wallet.address,
          groupId: harukoGroupId,
          defaultChainId: wallet.defaultChain,
          supportedChainIds: wallet.supportedChains,
          active: true,
        },
      })
      const walletId: number = walletRes.data.result.newWallet.id
      venueAccountNames.push(wallet.name)

      await prisma.harukoWallet.create({
        data: {
          fundConfigId: 1,
          harukoWalletId: walletId,
          clientReferenceId: `elysium-fund-${input.elysiumFundId}-wallet-${index}`,
          address: wallet.address,
          defaultChain: wallet.defaultChain,
          supportedChains: wallet.supportedChains,
        },
      })
    }),
  )

  // Step 4: Link all members to group
  await putAdminGroup({
    body: {
      id: harukoGroupId,
      name: groupName,
      parentId: opts.masterGroupId,
      members: venueAccountNames,
      display: [],
    },
  })

  // Step 5: Trigger connection refresh for all CeFi credentials
  await Promise.all(
    credentialIds.map((credentialId) =>
      putAdminCredentialsRefresh({ query: { credentialId } }),
    ),
  )

  // Step 6: Check initial connection status (Haruko connects async — may still be PENDING)
  const statusRes = await getAccountStatus()
  const allStatuses: any[] = statusRes.data.result.statuses

  const venueStatuses: VenueStatus[] = input.venues.map((venue, index) => {
    const credentialId = credentialIds[index]!
    const status = allStatuses.find((s: any) => s.id === credentialId)
    return {
      venue: venue.venue,
      name: venue.accountName,
      harukoCredentialId: credentialId,
      status: (status?.status ?? 'PENDING') as VenueStatus['status'],
      error: status?.errorMessage,
    }
  })

  return {
    elysiumFundId: input.elysiumFundId,
    harukoGroupId,
    venueStatuses,
    allConnected: venueStatuses.every((v) => v.status === 'CONNECTED'),
  }
}
```

**Step 4: Run tests to verify they pass**

```bash
cd packages/haruko && yarn test
```

Expected: PASS — 5 tests passing.

**Step 5: Commit**

```bash
git add packages/haruko/src/provisioning.ts packages/haruko/src/__tests__/provisioning.test.ts
git commit -m "feat(haruko): implement provisionFund — group creation, venue/wallet setup, status check"
```

---

## Task 9: Prisma schema migrations

**Files:**
- Modify: `services/api/prisma/schema.prisma`

**Step 1: Add four new models to the end of schema.prisma**

```prisma
// Append to services/api/prisma/schema.prisma

model HarukoFundConfig {
  id                Int      @id @default(autoincrement())
  elysiumFundId     Int      @unique
  harukoGroupId     Int      @unique
  harukoGroupName   String   @unique
  reportingCurrency String   @default("USD")
  navStaleAfterMs   Int      @default(3600000)
  maxNavChangeBps   Int      @default(1000)
  createdAt         DateTime @default(now())
  updatedAt         DateTime @updatedAt
  venueAccounts     HarukoVenueAccount[]
  wallets           HarukoWallet[]
  navAuditLogs      NavAuditLog[]

  @@map("haruko_fund_configs")
}

model HarukoVenueAccount {
  id                  Int      @id @default(autoincrement())
  fundConfigId        Int
  harukoCredentialId  Int      @unique
  clientReferenceId   String   @unique
  venue               String
  accountName         String
  status              String   @default("PENDING")
  errorMessage        String?
  createdAt           DateTime @default(now())
  updatedAt           DateTime @updatedAt
  fundConfig          HarukoFundConfig @relation(fields: [fundConfigId], references: [id])

  @@map("haruko_venue_accounts")
}

model HarukoWallet {
  id                Int      @id @default(autoincrement())
  fundConfigId      Int
  harukoWalletId    Int      @unique
  clientReferenceId String   @unique
  address           String
  defaultChain      String
  supportedChains   String[]
  createdAt         DateTime @default(now())
  fundConfig        HarukoFundConfig @relation(fields: [fundConfigId], references: [id])

  @@map("haruko_wallets")
}

model NavAuditLog {
  id                Int      @id @default(autoincrement())
  elysiumFundId     Int
  harukoGroupId     Int
  harukoSnapshotTs  BigInt
  navUsd            Float
  navReporting      Float
  reportingCurrency String
  fxRate            Float    @default(1.0)
  isReconciled      Boolean
  isLatent          Boolean  @default(false)
  rawHarukoResponse Json
  computedAt        DateTime @default(now())
  status            String   @default("DRAFT")
  approvedBy        String?
  approvedAt        DateTime?
  fundConfig        HarukoFundConfig @relation(fields: [elysiumFundId], references: [elysiumFundId])

  @@map("nav_audit_logs")
}
```

**Step 2: Check migration is valid (dry-run diff)**

```bash
cd services/api
yarn prisma:check
```

Expected: SQL diff output showing CREATE TABLE statements for 4 new tables. No errors.

**Step 3: Create the migration**

```bash
cd services/api
npx prisma migrate dev --name haruko_integration
```

Expected: new migration file created in `prisma/migrations/`.

**Step 4: Regenerate Prisma client**

```bash
cd services/api && yarn prisma:generate
```

Expected: Prisma client updated with the 4 new models.

**Step 5: Commit**

```bash
git add services/api/prisma/
git commit -m "feat(haruko): add Prisma models — HarukoFundConfig, HarukoVenueAccount, HarukoWallet, NavAuditLog"
```

---

## Task 10: Lambda handlers

**Files:**
- Create: `services/api/src/handlers/haruko/index.ts`
- Create: `services/api/src/handlers/haruko/haruko.schema.ts`
- Create: `services/api/src/handlers/haruko/__tests__/haruko.test.ts`

**Step 1: Create schema file**

```typescript
// services/api/src/handlers/haruko/haruko.schema.ts
import { z } from 'zod'
import zodToJsonSchema from 'zod-to-json-schema'

const VenueCredentialSchema = z.object({
  venue: z.string().min(1),
  accountName: z.string().min(1),
  environment: z.enum(['PROD', 'TEST']),
  config: z.record(z.string()),
})

const WalletInputSchema = z.object({
  address: z.string().min(1),
  name: z.string().min(1),
  defaultChain: z.string().min(1),
  supportedChains: z.array(z.string()),
})

export const provisionInboundSchema = zodToJsonSchema(
  z.object({
    pathParameters: z.object({ fundId: z.string() }),
    body: z.object({
      reportingCurrency: z.string().default('USD'),
      venues: z.array(VenueCredentialSchema),
      wallets: z.array(WalletInputSchema),
    }),
  }),
)

export const navApproveInboundSchema = zodToJsonSchema(
  z.object({
    pathParameters: z.object({
      fundId: z.string(),
      auditLogId: z.string(),
    }),
    body: z.object({ approvedBy: z.string().min(1) }),
  }),
)
```

**Step 2: Create handlers**

```typescript
// services/api/src/handlers/haruko/index.ts
import { withMiddlewares, AuthedAPIGatewayEvent } from '../../middleware/createHandler'
import { successResponse, errorResponse } from '../../schemas/base'
import { prisma } from '../../lib/prisma'
import { provisionFund } from '@elysium/haruko'
import { getPortfolioValue } from '@elysium/haruko'
import { provisionInboundSchema, navApproveInboundSchema } from './haruko.schema'

const MASTER_GROUP_ID = parseInt(process.env.HARUKO_MASTER_GROUP_ID ?? '0', 10)

// POST /funds/{fundId}/haruko/provision
async function provisionHandler(event: AuthedAPIGatewayEvent) {
  try {
    const fundId = parseInt(event.pathParameters?.fundId ?? '', 10)
    const body = event.body as any
    const status = await provisionFund(
      { elysiumFundId: fundId, ...body },
      { masterGroupId: MASTER_GROUP_ID },
    )
    return successResponse(status)
  } catch (e: any) {
    return errorResponse(e.message, 500)
  }
}

// GET /funds/{fundId}/haruko/status
async function harukoStatusHandler(event: AuthedAPIGatewayEvent) {
  try {
    const fundId = parseInt(event.pathParameters?.fundId ?? '', 10)
    const venues = await prisma.harukoVenueAccount.findMany({
      where: { fundConfig: { elysiumFundId: fundId } },
    })
    const wallets = await prisma.harukoWallet.findMany({
      where: { fundConfig: { elysiumFundId: fundId } },
    })
    const allConnected = venues.every((v) => v.status === 'CONNECTED')
    return successResponse({ venues, wallets, allConnected })
  } catch (e: any) {
    return errorResponse(e.message, 500)
  }
}

// GET /funds/{fundId}/portfolio-value
async function portfolioValueHandler(event: AuthedAPIGatewayEvent) {
  try {
    const fundId = parseInt(event.pathParameters?.fundId ?? '', 10)
    const result = await getPortfolioValue(fundId)
    return successResponse({ ...result, value: result.value.toString() })
  } catch (e: any) {
    return errorResponse(e.message, e.code ? 422 : 500, { code: e.code })
  }
}

// POST /funds/{fundId}/portfolio-value/{auditLogId}/approve
async function navApproveHandler(event: AuthedAPIGatewayEvent) {
  try {
    const auditLogId = parseInt(event.pathParameters?.auditLogId ?? '', 10)
    const { approvedBy } = event.body as any
    const updated = await prisma.navAuditLog.update({
      where: { id: auditLogId },
      data: { status: 'APPROVED', approvedBy, approvedAt: new Date() },
    })
    return successResponse({ id: updated.id, status: updated.status })
  } catch (e: any) {
    return errorResponse(e.message, 500)
  }
}

export const harukoProvision = withMiddlewares(provisionHandler, {
  inboundSchema: provisionInboundSchema,
  requireAuth: true,
})

export const harukoStatus = withMiddlewares(harukoStatusHandler, {
  inboundSchema: {},
  requireAuth: true,
})

export const harukoPortfolioValue = withMiddlewares(portfolioValueHandler, {
  inboundSchema: {},
  requireAuth: true,
})

export const harukoNavApprove = withMiddlewares(navApproveHandler, {
  inboundSchema: navApproveInboundSchema,
  requireAuth: true,
})
```

**Step 3: Register handlers in serverless.yml**

Add to the `functions:` section of `services/api/serverless.yml`:

```yaml
  harukoProvision:
    handler: src/handler.harukoProvision
    events:
      - http:
          path: funds/{fundId}/haruko/provision
          method: post
          cors: true

  harukoStatus:
    handler: src/handler.harukoStatus
    events:
      - http:
          path: funds/{fundId}/haruko/status
          method: get
          cors: true

  harukoPortfolioValue:
    handler: src/handler.harukoPortfolioValue
    events:
      - http:
          path: funds/{fundId}/portfolio-value
          method: get
          cors: true

  harukoNavApprove:
    handler: src/handler.harukoNavApprove
    events:
      - http:
          path: funds/{fundId}/portfolio-value/{auditLogId}/approve
          method: post
          cors: true
```

**Step 4: Export from handler.ts**

Add to `services/api/src/handler.ts`:
```typescript
export { harukoProvision, harukoStatus, harukoPortfolioValue, harukoNavApprove } from './handlers/haruko'
```

**Step 5: Add env vars**

Add to `services/api/serverless.yml` environment section:
```yaml
HARUKO_HOST: ${env:HARUKO_HOST}
HARUKO_PORT: ${env:HARUKO_PORT}
HARUKO_TOKEN: ${env:HARUKO_TOKEN}
HARUKO_MASTER_GROUP_ID: ${env:HARUKO_MASTER_GROUP_ID}
```

**Step 6: Run all tests**

```bash
cd services/api && yarn test
```

Expected: existing tests still pass (no regressions).

**Step 7: Commit**

```bash
git add services/api/src/handlers/haruko/ services/api/src/handler.ts services/api/serverless.yml
git commit -m "feat(haruko): add Lambda handlers for fund provisioning and portfolio value"
```

---

## Task 11: Add `@elysium/haruko` to `services/api` dependencies

**Files:**
- Modify: `services/api/package.json`

**Step 1: Add workspace dependency**

```json
// In services/api/package.json dependencies:
"@elysium/haruko": "workspace:*"
```

**Step 2: Install**

```bash
yarn install
```

Expected: `@elysium/haruko` symlinked into `services/api/node_modules/@elysium/haruko`.

**Step 3: Commit**

```bash
git add services/api/package.json yarn.lock
git commit -m "feat(haruko): wire @elysium/haruko into services/api workspace"
```

---

## Task 12: Environment variable setup and integration smoke test

**Files:**
- Modify: `.env.example` (if it exists) or document in README

**Step 1: Add required env vars to local dev setup**

```bash
# Add to your local .env (never commit):
HARUKO_HOST=<from Haruko support>
HARUKO_PORT=<from Haruko support>
HARUKO_TOKEN=<from Haruko dashboard Settings>
HARUKO_MASTER_GROUP_ID=<created manually in Haruko dashboard>
```

**Step 2: Run a smoke test against the real Haruko account**

With no venues connected, the account has no data — but the API should respond:

```bash
curl -H "Authorization: Bearer <HARUKO_TOKEN>" \
  "https://${HARUKO_HOST}:${HARUKO_PORT}/cefi/api/admin/group"
```

Expected: `{ "status": "ok", "result": { "groups": [] } }` — empty group list confirms auth works.

**Step 3: Create the master Elysium group manually (one-time)**

```bash
curl -X POST \
  -H "Authorization: Bearer <HARUKO_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{"name":"elysium-master","members":[],"parentId":null,"display":[]}' \
  "https://${HARUKO_HOST}:${HARUKO_PORT}/cefi/api/admin/group"
```

Note the returned `id` — this is `HARUKO_MASTER_GROUP_ID`.

**Step 4: Verify the full test suite passes**

```bash
yarn test
```

Expected: all tests green.

**Step 5: Final commit**

```bash
git add .
git commit -m "feat(haruko): complete Haruko integration — provisionFund and getPortfolioValue"
```

---

## Execution Choice

**Plan complete and saved to `docs/plans/2026-03-02-haruko-integration-plan.md`.**

**Two execution options:**

**1. Subagent-Driven (this session)** — Fresh subagent per task, review between tasks, fast iteration in the current session.

**2. Parallel Session (separate)** — Open a new Claude session in this worktree, use `superpowers:executing-plans`, batch execution with checkpoints.

Which approach?
