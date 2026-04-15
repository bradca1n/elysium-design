# Haruko Integration Design

**Date:** 2026-03-02
**Status:** Approved
**Scope:** `@elysium/haruko` package — fund provisioning on Haruko + portfolio value calculation
**Out of scope:** On-chain NAV posting, frontend onboarding UI, class allocation, fee calculation

---

## 1. Context and Purpose

Elysium is a B2B fund administration platform. Fund managers bring their crypto portfolios — live on exchanges, custodians, and DeFi protocols — and Elysium handles share class accounting, NAV calculation, order processing, and investor reporting via smart contracts.

**Haruko** is the data layer. It is an institutional-grade portfolio management platform (crypto equivalent of Bloomberg PORT) that connects to 100+ centralised exchanges, 4+ major custodians, 30+ blockchains, and 250+ DeFi protocols. It aggregates positions, marks them to market, and computes a fund-level **shadow NAV** (`totalEquityUSD`).

Elysium has one dedicated Haruko instance (not shared SaaS). The Haruko API base URL is:
```
https://<HARUKO-HOST>:<CLIENT-PORT>/cefi/
```

Auth on every request: `Authorization: Bearer <<YOUR_TOKEN>>` (angle brackets are literal, per spec).

This design covers two capabilities:
1. **Fund provisioning** — programmatically create a Haruko group for a new fund, connect all its venues, and verify the pipeline is live.
2. **Portfolio value** — fetch the fund's total portfolio value from Haruko and return it in a form ready for on-chain posting.

---

## 2. Haruko Account Architecture

Haruko organises accounts into **Groups**. Each group aggregates one or more venue accounts (CeFi exchange API connections) and wallets (DeFi public addresses). `GET /api/summary?groupId={id}` returns the combined portfolio value for a group.

Elysium creates **one group per fund**, nested under a master Elysium parent group:

```
Haruko instance (Elysium's dedicated)
  └─ Group: "elysium-master" (parentId=null, created manually at setup)
       ├─ Group: "elysium-fund-42"  (parentId=master, harukoGroupId=101)
       │    ├─ venue account: Binance Spot   (credentialId=1001)
       │    ├─ venue account: Binance Futures (credentialId=1002)
       │    ├─ venue account: BitGo Custody  (credentialId=1003)
       │    └─ wallet: 0xabc... ETH/Arbitrum (walletId=2001)
       └─ Group: "elysium-fund-43"  (parentId=master, harukoGroupId=102)
            └─ venue account: Kraken         (credentialId=1004)
```

**Group naming convention:** `elysium-fund-{elysiumFundId}` — deterministic and recoverable from the DB mapping even if the DB is lost.

**The Haruko groupId cannot be set** — it is auto-assigned as an integer by Haruko. The Elysium DB stores the `elysiumFundId → harukoGroupId` mapping.

---

## 3. Package Structure: `@elysium/haruko`

Located at `packages/haruko/`, following the existing monorepo pattern (`main: "src/index.ts"`, TypeScript source served directly).

```
packages/haruko/
  src/
    generated/           — auto-generated from api-docs.json, never hand-edited
      types.gen.ts       — all request/response types (Balance, FuturesPosition, etc.)
      services.gen.ts    — typed API functions
      client.gen.ts      — fetch client base
    client.ts            — HarukoClient: injects base URL, auth header, angle-bracket quirk
    provisioning.ts      — provisionFund(), addCeFiVenue(), addWallet(), verifyConnections()
    portfolio.ts         — getPortfolioValue()
    fx.ts                — getFxRate() (Haruko for crypto, ECB for fiat cross-rates)
    errors.ts            — HarukoError hierarchy
    types.ts             — Elysium domain types (PortfolioValue, FundProvisioningInput, etc.)
    mock.ts              — MockHarukoAdapter for testing
    index.ts             — public exports
  api-docs.json          — Haruko OpenAPI 3.1 spec (committed, versioned)
  package.json
  tsconfig.json
```

**Client generation script** (in `package.json`):
```json
"scripts": {
  "generate": "openapi-ts --input api-docs.json --output src/generated --client @hey-api/client-fetch"
}
```

Re-run when Haruko provides a new spec version. Commit the generated output.

---

## 4. Core Types

```typescript
// src/types.ts

export interface PortfolioValue {
  fundId: number            // Elysium on-chain fundId
  value: bigint             // in 1e18 precision (PRECISION from smart contracts)
  currency: string          // fund reporting currency, e.g. "USD"
  navUsd: number            // raw USD value before FX conversion (for audit)
  fxRate: number            // 1.0 if USD, otherwise USD→reportingCurrency rate
  timestamp: Date           // Haruko snapshot timestamp (not fetch time)
  isReconciled: boolean
  source: 'haruko'
}

export interface VenueCredential {
  venue: string             // "BINANCE" | "KRAKEN" | "COINBASE" | etc.
  accountName: string       // human-readable, e.g. "Fund Alpha - Binance Spot"
  environment: 'PROD' | 'TEST'
  config: Record<string, string>  // venue-specific: { apiKey, secretKey, ... }
  // NOTE: config is forwarded to Haruko immediately, never stored in Elysium DB
}

export interface WalletInput {
  address: string
  name: string
  defaultChain: string      // "ETHEREUM" | "SOLANA" | "BASE" | etc. (from Haruko enum)
  supportedChains: string[]
}

export interface FundProvisioningInput {
  elysiumFundId: number
  reportingCurrency: string
  venues: VenueCredential[]
  wallets: WalletInput[]
}

export interface FundOnboardingStatus {
  elysiumFundId: number
  harukoGroupId: number
  venueStatuses: { venue: string; name: string; status: 'CONNECTED' | 'PENDING' | 'ERROR'; error?: string }[]
  allConnected: boolean
  firstNavAvailable: boolean
}
```

---

## 5. Fund Provisioning Flow

### 5.1 `provisionFund(input: FundProvisioningInput): Promise<FundOnboardingStatus>`

Orchestrates the full setup. Steps are sequential — each step depends on the previous.

**Step 1 — Create Haruko group**
```
POST /cefi/api/admin/group
Body: {
  name:     "elysium-fund-{elysiumFundId}",
  members:  [],
  parentId: ELYSIUM_MASTER_GROUP_ID,   // env config
  display:  []
}
→ result.newGroup.id = harukoGroupId
```

Persist immediately:
```sql
INSERT INTO haruko_fund_configs
  (elysium_fund_id, haruko_group_id, haruko_group_name, reporting_currency)
VALUES (42, 101, 'elysium-fund-42', 'USD')
```

**Step 2 — Add CeFi venues** (in parallel, all for this fund)
```
POST /cefi/api/admin/credentials
Body: {
  name:              "{fundName} - {venueName}",
  clientReferenceId: "elysium-fund-{fundId}-{venue}-{suffix}",  // unique, for recovery
  environment:       "PROD",
  groupId:           harukoGroupId,
  venue:             "BINANCE",
  active:            true,
  config:            { apiKey: "...", secretKey: "..." }   // ← forwarded, never stored
}
→ result.newCredentials.id = credentialId (int)
```

Store only the ID (not the keys):
```sql
INSERT INTO haruko_venue_accounts
  (fund_config_id, haruko_credential_id, client_reference_id, venue, account_name, status)
VALUES (1, 1001, 'elysium-fund-42-binance-spot', 'BINANCE', 'Fund Alpha - Binance Spot', 'PENDING')
```

**Step 3 — Add DeFi wallets** (in parallel)
```
POST /cefi/api/admin/wallet
Body: {
  name:              "{fundName} - {chainName} Wallet",
  clientReferenceId: "elysium-fund-{fundId}-wallet-{addressPrefix}",
  address:           "0xabc...",
  groupId:           harukoGroupId,
  defaultChainId:    "ETHEREUM",
  supportedChainIds: ["ETHEREUM", "ARBITRUM", "BASE", "OPTIMISM"],
  active:            true
}
→ result.newWallet.id = walletId (int)
```

**Step 4 — Link members to group**
```
PUT /cefi/api/admin/group
Body: {
  id:       harukoGroupId,
  name:     "elysium-fund-{elysiumFundId}",
  parentId: ELYSIUM_MASTER_GROUP_ID,
  members:  ["Fund Alpha - Binance Spot", "Fund Alpha - ETH Wallet"],  // account names
  display:  []
}
```

**Step 5 — Trigger connection refresh** (per credential)
```
PUT /cefi/api/admin/credentials_refresh?credentialId={id}
```
Haruko connects async in the background. DeFi wallets connect automatically.

**Step 6 — Verify connections** (poll with backoff)
```
GET /cefi/api/account_status
→ result.statuses[].status   // "CONNECTED" | "ERROR" | "PENDING"
```

Poll every 10s, up to 5 minutes. Filter to this fund's credentialIds.
Update `haruko_venue_accounts.status` for each account.

Surface specific failure reasons to the fund admin dashboard:
- `ERROR` with auth failure → wrong API key
- `PENDING` after 5min → IP allowlist not set at exchange (show Haruko's IP ranges)
- `ERROR` with permissions → key lacks required read permissions

**Step 7 — First portfolio value check**
```typescript
const nav = await getPortfolioValue(elysiumFundId)
// nav.value may be 0n if no positions yet — this is valid
// nav.isReconciled = true means pipeline is working
```

Mark fund `status = 'LIVE'` in Elysium DB.

### 5.2 Idempotency

`clientReferenceId` is unique per credential/wallet and deterministic. If provisioning fails partway, re-running `provisionFund()` skips already-created resources (check `GET /api/admin/credentials` for existing `clientReferenceId` before creating).

### 5.3 Key Rotation

When a manager rotates their exchange API key:
```
PUT /cefi/api/admin/credentials_replace
Body: { id: existingCredentialId, config: { apiKey: newKey, secretKey: newSecret }, ...rest }

PUT /cefi/api/admin/credentials_refresh?credentialId={id}
```

`credentials_replace` (not `credentials` PUT) is required — it triggers a full reconnect.

### 5.4 Fund Decommissioning

Must follow this order (group can only be deleted when empty):
1. `DELETE /api/admin/credentials?credentialId={id}` for each venue account
2. `DELETE /api/admin/wallet?walletId={id}` for each wallet
3. `DELETE /api/admin/group?groupId={harukoGroupId}`
4. Mark `HarukoFundConfig` as archived in Prisma

### 5.5 Venue Credential Shapes

The `config: {}` field in `POST /api/admin/credentials` is venue-specific. Confirm exact field names per exchange using `GET /api/service/exchange/features`. Known shapes:

| Venue | Required `config` fields |
|---|---|
| `BINANCE`, `BINANCE_FUTURES`, `BINANCE_OPTIONS` | `apiKey`, `secretKey` |
| `KRAKEN` | `apiKey`, `privateKey` |
| `COINBASE` | `apiKey`, `secretKey`, `passphrase` |
| `OKEX` | `apiKey`, `secretKey`, `passphrase` |
| `DERIBIT` | `apiKey`, `secretKey` |
| `BYBIT` | `apiKey`, `secretKey` |
| `BITGO` | `accessToken`, `walletId` (or similar — confirm with Haruko) |
| `GEMINI` | `apiKey`, `secretKey` |
| `CRYPTO.COM` | `apiKey`, `secretKey` |

All keys must be **read-only** (no trading, no withdrawal permissions). Manager sets this at the exchange before providing keys.

---

## 6. Portfolio Value Calculation

### 6.1 `getPortfolioValue(elysiumFundId: number): Promise<PortfolioValue>`

```typescript
async function getPortfolioValue(elysiumFundId: number): Promise<PortfolioValue> {
  // 1. Look up Haruko mapping
  const config = await prisma.harukoFundConfig.findUniqueOrThrow({
    where: { elysiumFundId }
  })

  // 2. Fetch NAV + reconciliation in parallel
  const [summary, recon] = await Promise.all([
    haruko.get(`/api/summary?groupId=${config.harukoGroupId}`),
    haruko.get(`/api/reconciliation_summary?groups=${config.harukoGroupName}`)
  ])

  // 3. Gate 1: latent check — Haruko served cached data due to venue issue
  if (summary.result.latent) {
    throw new HarukoStaleDataError('latent response — upstream venue connectivity issue')
  }

  // 4. Gate 2: freshness check
  const snapshotAge = Date.now() - summary.result.snapshotTimestamp
  if (snapshotAge > config.navStaleAfterMs) {
    throw new HarukoStaleDataError(`snapshot is ${snapshotAge}ms old, max ${config.navStaleAfterMs}ms`)
  }

  // 5. Gate 3: reconciliation check
  if (!recon.result.reconciled) {
    throw new HarukoReconciliationError(recon.result.summary)
  }

  // 6. Extract NAV — always USD from Haruko
  const navUsd: number = summary.result.summary.totalEquityUSD

  // 7. FX conversion (if reporting currency != USD)
  const fxRate = config.reportingCurrency === 'USD'
    ? 1.0
    : await getFxRate('USD', config.reportingCurrency)
  const navReporting = navUsd * fxRate

  // 8. Materiality check vs. last approved NAV
  const lastNav = await prisma.navAuditLog.findFirst({
    where: { elysiumFundId, status: 'POSTED' },
    orderBy: { computedAt: 'desc' }
  })
  if (lastNav && lastNav.navReporting > 0) {
    const changeBps = Math.abs((navReporting - lastNav.navReporting) / lastNav.navReporting * 10000)
    if (changeBps > config.maxNavChangeBps) {
      throw new HarukoMaterialityError(changeBps, config.maxNavChangeBps)
    }
  }

  // 9. Store audit log — full raw response required for regulatory compliance
  await prisma.navAuditLog.create({
    data: {
      elysiumFundId,
      harukoGroupId: config.harukoGroupId,
      harukoSnapshotTs: BigInt(summary.result.snapshotTimestamp),
      navUsd,
      navReporting,
      reportingCurrency: config.reportingCurrency,
      fxRate,
      isReconciled: recon.result.reconciled,
      isLatent: false,
      rawHarukoResponse: summary,
      status: 'DRAFT'
    }
  })

  // 10. Convert to 1e18 bigint (PRECISION in smart contracts)
  // Use integer arithmetic — never floating point for on-chain values
  const PRECISION = 1_000_000_000_000_000_000n
  const value = BigInt(Math.round(navReporting)) * PRECISION

  return {
    fundId: elysiumFundId,
    value,
    currency: config.reportingCurrency,
    navUsd,
    fxRate,
    timestamp: new Date(summary.result.snapshotTimestamp),
    isReconciled: true,
    source: 'haruko'
  }
}
```

### 6.2 What `totalEquityUSD` Includes

Haruko marks every position type to market and sums them into `totalEquityUSD`. Elysium relies on this entirely — no custom pricing logic required.

| Position type | How Haruko values it | What flows into NAV |
|---|---|---|
| **Spot (CEX / Custody)** | `qty × markPrice` per asset | Market value |
| **Perpetual futures** | `pnlUsd` — open unrealised P&L only | P&L delta, NOT notional |
| **Dated futures** | `pnlUsd` | P&L delta |
| **Options** | Model price (SVI/SABR/Heston vol surface) × qty | Premium value + unrealised P&L |
| **Margin borrows** | `borrowed` → negative liability | Reduces NAV |
| **Collateral posted** | `collateral` → positive asset | Adds to NAV |
| **DeFi LP positions** | Underlying assets at market price (impermanent loss resolved) | Redeemable value |
| **Staking / validators** | `staked + pendingRewards` | Staked principal + accrued yield |
| **DeFi lending (Aave etc.)** | Supplied asset + accrued interest | Redeemable value |
| **OTC unsettled** | Contracted price | Receivable/payable |

A fund running $100M notional in BTC perpetuals does NOT show $100M in NAV — only the unrealised P&L enters. This is correct fund accounting. Haruko handles this correctly.

### 6.3 FX Rate Sourcing

Haruko always returns USD values. Currency conversion is Elysium's responsibility.

```typescript
async function getFxRate(from: 'USD', to: string): Promise<number> {
  if (to === 'USD') return 1.0

  // Crypto pairs — Haruko has these
  if (isCryptoCurrency(to)) {
    const res = await haruko.get(`/api/price?asset=${to}`)
    return 1 / res.result.price  // price is "1 {to} = X USD", invert for USD→to
  }

  // Fiat pairs (EUR, GBP, CHF, JPY etc.) — ECB API (free, updates 16:00 CET daily)
  // GET https://data-api.ecb.europa.eu/service/data/EXR/D.USD.{TO}.SP00.A?lastNObservations=1
  return fetchEcbFxRate('USD', to)
}
```

**FX staleness:** ECB updates once daily. For daily NAV this is sufficient. If intraday frequency is required, use a commercial FX feed (Open Exchange Rates, etc.).

### 6.4 Error Hierarchy

```typescript
// src/errors.ts

export class HarukoError extends Error {
  constructor(message: string, public readonly code: string) { super(message) }
}

export class HarukoConnectionError extends HarukoError {
  constructor(cause: unknown) {
    super(`Haruko API unreachable: ${cause}`, 'HARUKO_CONNECTION_ERROR')
  }
}

export class HarukoStaleDataError extends HarukoError {
  constructor(detail: string) {
    super(`Stale NAV data: ${detail}`, 'HARUKO_STALE_DATA')
  }
}

export class HarukoReconciliationError extends HarukoError {
  constructor(public readonly summary: unknown) {
    super('Haruko reconciliation is dirty — NAV cannot be trusted', 'HARUKO_RECONCILIATION_ERROR')
  }
}

export class HarukoMaterialityError extends HarukoError {
  constructor(public readonly changeBps: number, public readonly maxBps: number) {
    super(
      `NAV change of ${changeBps}bps exceeds materiality threshold of ${maxBps}bps`,
      'HARUKO_MATERIALITY_BREACH'
    )
  }
}
```

---

## 7. Prisma Schema Additions

Add to `services/api/prisma/schema.prisma`:

```prisma
model HarukoFundConfig {
  id                Int      @id @default(autoincrement())
  elysiumFundId     Int      @unique
  harukoGroupId     Int      @unique
  harukoGroupName   String   @unique        // "elysium-fund-{elysiumFundId}"
  reportingCurrency String   @default("USD")
  navStaleAfterMs   Int      @default(3600000)   // 1 hour
  maxNavChangeBps   Int      @default(1000)       // 10% — CSSF materiality gate
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
  clientReferenceId   String   @unique   // "elysium-fund-{fundId}-{venue}-{suffix}"
  venue               String
  accountName         String
  status              String   @default("PENDING")  // PENDING|CONNECTED|ERROR
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
  rawHarukoResponse Json                    // full API response — regulatory requirement
  computedAt        DateTime @default(now())
  status            String   @default("DRAFT")  // DRAFT|APPROVED|REJECTED|POSTED
  approvedBy        String?
  approvedAt        DateTime?
  fundConfig        HarukoFundConfig @relation(fields: [elysiumFundId], references: [elysiumFundId])
  @@map("nav_audit_logs")
}
```

---

## 8. Lambda API Surface

New handlers in `services/api/`:

| Method | Path | Description |
|---|---|---|
| `POST` | `/funds/{fundId}/haruko/provision` | Full provisioning flow (Steps 1–6) |
| `GET` | `/funds/{fundId}/haruko/status` | Account health for all venues |
| `GET` | `/funds/{fundId}/portfolio-value` | Compute and store draft NAV |
| `POST` | `/funds/{fundId}/portfolio-value/{auditLogId}/approve` | Fund admin sign-off |
| `DELETE` | `/funds/{fundId}/haruko` | Decommission all Haruko resources |

The `approve` endpoint sets `NavAuditLog.status = 'APPROVED'` and is the handoff point to the On-Chain Poster service (future scope).

---

## 9. Security

| Concern | Mitigation |
|---|---|
| Exchange API keys | Never stored in Elysium DB. Forwarded directly to Haruko (SOC 2). Only `credentialId` stored. |
| Haruko bearer token | Stored in AWS Secrets Manager. Injected at Lambda cold start. Never logged. |
| Request logging | Logging middleware must strip `config.*` fields before writing logs. |
| Haruko token scope | One token controls all admin + read operations. Rotate quarterly. Store in Secrets Manager with IAM access control. |
| IP allowlisting | Haruko's IP ranges must be allowlisted at each exchange. Surfaced in onboarding UI. |
| API key permissions | Keys must be read-only. Verify via `GET /api/account_status` after connection — no trading permission flags. |

---

## 10. NAV Sign-Off and Compliance

For a regulated Irish fund administrator (CBI), every published NAV must have:

1. **Audit trail** — `NavAuditLog.rawHarukoResponse` stores the full Haruko response JSON that produced this NAV. Reproducible at any time.
2. **Human approval** — `DRAFT` NAV requires fund admin sign-off (`POST .../approve`) before `POSTED`. Automated posting without approval is not permitted.
3. **Materiality gate** — `maxNavChangeBps` (default 1000 = 10%) blocks automatic processing if exceeded. Configurable per fund to match CSSF Circular 24/856 thresholds (0.5–1.0% for standard funds).
4. **Reconciliation gate** — `isReconciled = false` blocks NAV at source. Never waivable by code.
5. **Staleness gate** — `navStaleAfterMs` (default 1 hour) blocks stale data. Tighten for higher-frequency funds.

---

## 11. What Is Not Haruko / Custom Code Required

| Concern | Owner |
|---|---|
| Share class allocation (pro-rata by AUM) | On-chain dilution model |
| Management fee accrual | On-chain (mintManagementFees) |
| Performance fee / HWM | On-chain (dealing dilution) |
| Class-specific adjustments (hedging P&L, audit fees) | Fund admin posts via Elysium UI → on-chain adjustment system |
| FX rates for non-crypto pairs (EUR/USD, GBP/USD) | ECB API (custom code) |
| Capital flows uploaded to Haruko (for P&L attribution) | Future: Elysium pushes subscription/redemption data back to Haruko via `POST /api/fund_management/subscriptions` |
| On-chain NAV posting | On-Chain Poster service (future, separate design) |

---

## 12. Out-of-Scope (Noted for Future Design Docs)

- **On-chain poster service** — signs and submits `updateNav()`, `updateFXRates()` transactions
- **Frontend onboarding wizard** — `apps/next/` UI for manager to enter venue credentials
- **WebSocket real-time feed** — `/ws/v2` endpoint for sub-second NAV updates
- **Haruko fund_management subscriptions feed** — push Elysium order data back to Haruko for correct P&L attribution
- **Traditional asset support** — IB API / Bloomberg for hybrid crypto+TradFi funds (Haruko is crypto-only)

---

## 13. Implementation Phases

| Phase | Deliverable | Files |
|---|---|---|
| 1 | Generate Haruko client from spec | `packages/haruko/src/generated/` |
| 2 | Core types + HarukoClient wrapper + errors | `types.ts`, `client.ts`, `errors.ts` |
| 3 | `getPortfolioValue()` + validation gates + FX | `portfolio.ts`, `fx.ts` |
| 4 | `provisionFund()`, `addCeFiVenue()`, `addWallet()`, `verifyConnections()` | `provisioning.ts` |
| 5 | Prisma schema migrations | `services/api/prisma/schema.prisma` |
| 6 | Lambda handlers | `services/api/src/handlers/haruko*.ts` |
| 7 | Mock adapter for testing | `mock.ts` |
| 8 | Integration tests (real Haruko account, zero positions) | `*.test.ts` |
