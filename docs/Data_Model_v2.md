# Elysium Data Model v2

> Comprehensive map of all data in the Elysium platform — where it lives, what it contains, how sources relate, what is computed vs stored, and how it maps to regulatory requirements.
>
> Covers on-chain state (smart contracts), external portfolio data (Haruko), off-chain business data (PostgreSQL + S3), external services (AWS), cached/derived data, and data lineage.
>
> Date: 2026-02-20 · Supersedes: Data_Model.md (2026-02-12)

---

## Table of Contents

1. [Data Source Architecture](#1-data-source-architecture)
2. [On-Chain Data Model](#2-on-chain-data-model)
3. [Haruko Data Model](#3-haruko-data-model)
4. [Off-Chain Data Model](#4-off-chain-data-model)
5. [External Services](#5-external-services)
6. [Cross-Platform Identity Map](#6-cross-platform-identity-map)
7. [Off-Chain Process Attachments](#7-off-chain-process-attachments)
8. [Contracts & Legal](#8-contracts--legal)
9. [Middleware — NAV Service](#9-middleware--nav-service)
10. [Derived Data Catalog](#10-derived-data-catalog)
11. [Data Lineage](#11-data-lineage)
12. [Cache & Materialized Views](#12-cache--materialized-views)
13. [Multi-Tenancy Model](#13-multi-tenancy-model)
14. [Regulatory Mapping](#14-regulatory-mapping)
15. [Scope Exclusions](#15-scope-exclusions)
16. [Schema Evolution Strategy](#16-schema-evolution-strategy)
17. [Data Source Summary](#17-data-source-summary)

---

## 1. Data Source Architecture

Elysium's data lives across five systems. Each is the source of truth for its domain — data is never duplicated between systems.

```
┌─────────────────────────────────────────────────────────────────────┐
│                        ELYSIUM PLATFORM                            │
│                                                                     │
│  ┌──────────────┐  ┌──────────────┐  ┌───────────────────────────┐ │
│  │  On-Chain     │  │   Haruko     │  │     Off-Chain (Elysium)   │ │
│  │  (Avalanche   │  │  (External   │  │                           │ │
│  │   Subnet)     │  │   API)       │  │  PostgreSQL   S3          │ │
│  │              │  │              │  │  (business    (documents,  │ │
│  │  Fund acctg  │  │  Portfolio   │  │   data)      contracts)   │ │
│  │  Tokens      │  │  Positions   │  │                           │ │
│  │  Orders      │  │  Trades      │  │  Identity    Compliance   │ │
│  │  Fees        │  │  Risk        │  │  KYC/AML     Reporting    │ │
│  │  FX/Currency │  │  Prices      │  │  Contracts   Billing      │ │
│  │  Access ctrl │  │  Cash bal.   │  │  Comms       Processes    │ │
│  └──────────────┘  └──────────────┘  └───────────────────────────┘ │
│                                                                     │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │                    External Services                         │  │
│  │  AWS Cognito (auth)  ·  AWS KMS (signing keys)              │  │
│  │  AWS Secrets Manager (API keys, credentials)                 │  │
│  │  CloudWatch (access audit logs, metrics)                     │  │
│  │  KYC Provider  ·  Banks  ·  Custodians  ·  Exchanges        │  │
│  └──────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────┘
```

**Key architectural properties:**

- **On-chain is temporally complete:** Every piece of on-chain state is queryable at any historical block via `eth_call`. Config change block arrays enable precise reconstruction of fund/class/account state at any point in time.
- **On-chain is both storage and compute:** Dilution ratios, class prices, dealing prices, fee accruals — all computed on-chain via view functions. The chain is the fund accounting engine, not just a ledger.
- **Haruko is read-only:** Master API key, post-filtered by authorization. Elysium never writes to Haruko. Snapshots cached locally for regulatory compliance (CBI independent records requirement).
- **Off-chain owns PII and processes:** Investor identity, compliance, legal documents, and business workflows live off-chain. On-chain stores only anonymized flags (KYC verified, accredited, jurisdiction code).
- **Credentials never in DB:** API keys, signing keys, and secrets live in AWS Secrets Manager / KMS. The database stores only ARN references.
- **Access audit via CloudWatch:** Cerbos policy decisions logged to CloudWatch Logs, not PostgreSQL. Mutation audit tracked in PostgreSQL.
- **Multi-tenant by design:** All off-chain entities carry `management_company_id` for client isolation via PostgreSQL Row Level Security.
- **All timestamps in UTC.** Timezone context derived from fund domicile / dealing schedule config.

**Storage target annotations** — each entity in this document specifies its storage:
- **On-chain** — Diamond Proxy (EIP-2535) on Avalanche Subnet
- **PostgreSQL** — Structured business data, moderate volume
- **S3** — Documents, raw API responses, generated reports
- **CloudWatch Logs** — High-volume access audit, Cerbos decisions, service metrics

---

## 2. On-Chain Data Model

**Storage: Avalanche Subnet · Diamond Proxy (EIP-2535) · 16 facets · ~40 storage mappings · 35+ view functions · ERC1155 token standard**

**Storage layout:** All state in `AppStorage` at slot 0, namespaced: `s.FundAdmin[0]`, `s.FundTokens[0]`, `s.Account[0]`, `s.PerformanceFeeCalculator[0]`.

### 2.1 Fund Structure

#### Fund (`FundInfo` + `BaseInfo`)

| Field | Type | Business Meaning |
|-------|------|------------------|
| `manager` | address | Fund manager address (ROLE_MANAGER) |
| `status` | EntityStatus | ACTIVE, RETIRED, CLOSED |
| `name` | string | Fund display name |
| `nav` | uint128 | Current Net Asset Value (external source) |
| `navUpdatedAt` | uint32 | Last NAV update timestamp |
| `totalSupply` | uint128 | Total fund tokens in circulation |
| `maxCapacity` | uint128 | Maximum fund capacity (0 = unlimited) |
| `reportingCurrency` | uint16 | ISO 4217 code for NAV reporting currency |
| `umbrellaFundId` | uint16 | Umbrella assignment (0 = none) |
| `dilutionRatio` | uint128 | Fund-level dilution (starts at PRECISION) |
| `createdAt` | uint32 | Creation timestamp |
| `nextClassId` | uint16 | Next class ID counter |
| `nextDealingTimestamps` | uint32[] | Scheduled dealing timestamps |
| `fundPrices` | uint128[] | Historical fund prices |
| `fundPriceNavTimestamps` | uint32[] | NAV timestamps per historical price |
| `fundPriceBlockNumbers` | uint32[] | Block numbers per historical price |

#### Umbrella Fund (`UmbrellaFund`)

| Field | Type | Business Meaning |
|-------|------|------------------|
| `name` | string | Umbrella name |
| `minimumInitialSubscription` | uint128 | Minimum across all funds |
| `fundIds` | uint16[] | Funds in this umbrella |
| `createdAt` | uint32 | Creation timestamp |
| `status` | EntityStatus | ACTIVE, RETIRED, CLOSED |

#### Protocol Safety Configuration

| Field | Type | Business Meaning |
|-------|------|------------------|
| `maxNavChangeBps` | uint16 | Max NAV change per update (e.g., 1000 = 10%) |
| `maxTimestampDeviation` | uint32 | Max seconds NAV timestamp can deviate |
| `maxMgmtFeeRateBps` | uint16 | Max management fee rate cap |
| `maxAdjustmentBps` | uint16 | Max single class adjustment as % of class value |
| `maxNoticePeriod` | uint32 | Max notice period |
| `maxLockPeriod` | uint32 | Max lock period |

### 2.2 Share Classes

#### Class (`ClassInfo` + `BaseInfo`)

| Field | Type | Business Meaning |
|-------|------|------------------|
| `status` | EntityStatus | Class lifecycle status |
| `name` | string | Class name |
| `totalSupply` | uint128 | Total class tokens |
| `dilutionRatio` | uint128 | Class-level dilution |
| `mgmtFeeRate` | uint160 | Annual management fee (BPS) |
| `lastMgmtFeeMintTs` | uint32 | Last fee mint timestamp |
| `perfFeeCalculator` | address | Performance fee calculator contract (pluggable) |
| `noticePeriod` | uint32 | Notice period (seconds) |
| `lockPeriod` | uint32 | Lock period (seconds) |
| `hurdleFundNum` | uint16 | Hurdle fund number (0 = none) |
| `denominationCurrency` | uint16 | ISO 4217 investor-facing currency |
| `createdAt` | uint32 | Creation timestamp |

**Eligibility rules (enforced on every transfer):**

| Field | Type | Business Meaning |
|-------|------|------------------|
| `requiresKYC` | bool | KYC verification required |
| `requiresAccredited` | bool | Accredited investor required |
| `requiresQualifiedPurchaser` | bool | Qualified purchaser required |
| `allowedInvestorTypes` | uint8[] | Allowed types (individual, institution, trust, etc.) |
| `allowedJurisdictions` | bytes2[] | Allowed ISO 3166-1 alpha-2 codes |
| `requiredTags` | bytes2[] | Required commercial tags (OR logic) |
| `minimumInitialSubscription` | uint128 | Class-level minimum |
| `minimumOrderSize` | uint128 | Min order size |
| `maximumOrderSize` | uint128 | Max order size |
| `minimumHoldingAmount` | uint128 | Min holding amount |
| `maximumHoldingAmount` | uint128 | Max holding amount |

#### Dealing (`DealingInfo` + `BaseInfo`)

| Field | Type | Business Meaning |
|-------|------|------------------|
| `name` | string | Dealing name (timestamp-based) |
| `totalSupply` | uint128 | Total dealing tokens |
| `dilutionRatio` | uint128 | Dealing-level dilution (performance fee) |
| `hwm` | uint128 | High water mark for performance fee |
| `lastPerfMintAtNavT` | uint32 | Last performance fee mint timestamp |
| `unlockTs` | uint32 | Unlock timestamp (creation + lockPeriod) |
| `createdAt` | uint32 | Dealing creation timestamp |

### 2.3 Token System (ERC1155)

**Token ID encoding** (lower 64 bits of uint256):
```
[Umbrella 16b] [Fund 16b] [Class 16b] [Dealing 16b]
  bits 48-63    bits 32-47  bits 16-31   bits 0-15
```

Special types: Fund token `[u][f][0][0]`, Class token `[u][f][c][0]`, Dealing token `[u][f][c][d]`, Cash fund token `[u][0][0][currencyISO]`.

| Data | Type | Business Meaning |
|------|------|------------------|
| `balances[tokenId][account]` | uint256 | Token balance per account |
| `totalSupply[tokenId]` | uint256 | Total supply per token ID |
| `lockedBalances[account][tokenId]` | uint256 | Locked during order processing |
| `operatorApprovals[owner][operator]` | bool | ERC1155 operator approval |

**Transfer history** (append-only):

| Field | Type | Business Meaning |
|-------|------|------------------|
| `from` | address | Sender (address(0) for mints) |
| `to` | address | Receiver (address(0) for burns) |
| `amount` | uint128 | Transfer amount |
| `timestamp` | uint32 | Block timestamp |
| `blockNumber` | uint32 | Block number |
| `umbrellaId/fundId/classId/dealingId` | uint16 each | Extracted from tokenId |

**Hierarchical holdings index:** Per-account tracking at umbrella → fund → class → dealing levels via `HierarchicalIndexedHoldings` struct.

### 2.4 Orders

| Field | Type | Business Meaning |
|-------|------|------------------|
| `investor` | address | Investor account address |
| `orderType` | OrderType | SUBSCRIBE or REDEEM (SWAP decomposed) |
| `noPartialFill` | bool | Must be filled completely |
| `isTargetAmount` | bool | Amount is desired output |
| `isForcedRedemption` | bool | Admin/manager forced, cannot cancel |
| `tokenId` | uint256 | SUBSCRIBE: classId; REDEEM: dealingId |
| `minPrice` / `maxPrice` | uint128 | Price limits (0 = no limit) |
| `dependentOrderId` | uint128 | Linked order for SWAP |
| `dependentFundNum` / `dependentUmbrellaId` | uint16 | Cross-fund/umbrella swap target |
| `dueDate` | uint32 | Earliest processing time |
| `processingHistory` | OrderProcessingStatus[] | Append-only lifecycle (timestamp, status, amount) |
| `cashPendingSwap` | uint128 | Source cash awaiting off-chain swap |
| `cashPendingSubscribe` | uint128 | Target cash awaiting subscribe |
| `paymentCashFundTokenId` | uint256 | Source cash token (cross-umbrella) |
| `redeemToCashFundTokenId` | uint256 | Target cash token (cross-umbrella) |

**User order tracking:** `userOrderIndices[user]` → packed (fundId, orderId) pairs.

### 2.5 Pricing & NAV

All prices **computed on-chain** via view functions (see [Section 11: Data Lineage](#11-data-lineage) for full computation chain):

```
fundPrice = nav × PRECISION / fundTotalSupply
adjustedFundPrice = fundPrice × PRECISION / fundDilution
classPrice = adjustedFundPrice × PRECISION / classDilution
dealingPrice = classPrice × PRECISION / dealingDilution
classPriceInDenomination = classPrice × fxRate(fundCurrency → classCurrency) / PRECISION
```

Key view functions: `calculateFundPrice()`, `calculateClassPrice()`, `calculateClassPriceInDenomination()`, `calculateDealingPrice()`, `getFundPriceHistory()`.

### 2.6 Fees

**Fee waterfall — computation ordering:**
1. Management fee (dilutes fund-level `dilutionRatio`)
2. Class-specific cost adjustments (dilute class-level `dilutionRatio`)
3. Performance fee (dilutes dealing-level `dilutionRatio`, computed against HWM net of above)

This ordering ensures performance fees are calculated on performance NET of management fees and costs.

**Management fees:** Dilution-based minting. Accrued continuously, minted at each NAV update. Rate stored per class (`mgmtFeeRate`). History in `feeHistory[classId]` → `FeeMint[]` (amount, blockNumber).

**Performance fees:** Per-dealing high water mark (HWM). Computed via external calculator contract (pluggable — different methodologies can coexist). History in `redemptionFeeHistory[dealingId]` → `FeeMint[]`.

**Class-specific cost adjustments** (13 labels):

| Label | Direction | Examples |
|-------|-----------|---------|
| HEDGE | Bidirectional | Hedging P&L allocated to hedged class |
| DISTRIBUTION_FEE | Cost only | Distributor commissions |
| PLATFORM_FEE | Cost only | Elysium platform fees |
| AUDIT_FEE | Cost only | External audit costs |
| LEGAL_FEE | Cost only | Legal counsel costs |
| REGULATORY_FEE | Cost only | Regulatory filings |
| SETUP_COST | Cost only | Fund launch costs |
| CUSTODY_FEE | Cost only | Custodian charges |
| TAX_PROVISION | Bidirectional | Tax provisions and releases |
| TAX_RECLAIM | Gain only | Recovered withholding tax |
| TRANSACTION_COST | Cost only | Trading costs |
| REBATE | Gain only | Fee rebates to specific classes |
| OTHER | Bidirectional | Uncategorized |

Pending adjustments queue (max 100 per fund) with `PendingAdjustment` struct: classId, signed amount, label, externalRef, postedAt, postedBlock. Applied adjustment history per class with block numbers.

**Investor-specific rebates:** Modeled as class-level REBATE adjustments targeting specific share classes created for rebate-eligible investors (e.g., a "Seed Investor" class with lower fee class + REBATE adjustments). Alternatively, side letters captured off-chain with manual adjustment posting.

### 2.7 Multi-Currency & FX

**Currency registry:**

| Field | Type | Business Meaning |
|-------|------|------------------|
| `alphaCode` | bytes3 | ISO 4217 alpha (USD, EUR, GBP, ...) |
| `decimals` | uint8 | Currency decimals (2 for USD, 0 for JPY) |
| `isActive` | bool | Active for new use |
| `registeredAt` | uint32 | Registration timestamp |

**FX rate registry** (USD as numeraire):

| Field | Type | Business Meaning |
|-------|------|------------------|
| `rateVsUSD` | uint128 | 1 USD = X currency (PRECISION-scaled) |
| `timestamp` | uint32 | Rate update timestamp |
| `blockNumber` | uint32 | Block number for audit trail |

Cross-rates derived via USD triangulation: `rate(A→B) = rateB / rateA`.

**FX safety:** `maxFxRateChangeBps`, `maxFxSettlementDeviationBps`.

**Cash fund tokens:** One per umbrella per currency. Token ID: `[umbrella][0][0][currencyISO]`. Track cash balances across currency pools within an umbrella.

**Umbrella currency tracking:** `umbrellaCurrencies[umbrellaId]` → active currency codes.

**Hedging data flow:** Currency hedge positions, costs, and P&L are sourced from Haruko (portfolio management domain). Hedge impact is allocated to specific classes via the HEDGE adjustment label. The on-chain model stores the RESULT of hedging (the adjustment amount), not the hedge positions themselves.

### 2.8 Access Control & Accounts

**Roles:**

| Role | Scope | Purpose |
|------|-------|---------|
| ROLE_USER | Global | Any valid account |
| ROLE_ADMIN | Global | Platform administration |
| ROLE_MANAGER | Per-fund | Fund management |
| ROLE_NAV_UPDATER | Global | NAV update authority |
| ROLE_FX_UPDATER | Global | FX rate update authority |
| ROLE_SETTLEMENT | Global | Settlement operator |

**Account system:**

| Field | Type | Business Meaning |
|-------|------|------------------|
| `owner` | address | Owner wallet |
| `name` | string | Account name |
| `accountType` | uint8 | Pension, standard, etc. |
| `nonce` | uint256 | Proposal counter |

**Investor attributes (on-chain eligibility):**

| Field | Type | Business Meaning |
|-------|------|------------------|
| `kycVerified` | bool | KYC verification flag |
| `accreditedInvestor` | bool | Accredited status |
| `qualifiedPurchaser` | bool | Qualified purchaser status |
| `jurisdiction` | bytes2 | ISO 3166-1 alpha-2 |
| `investorType` | uint8 | 1=individual, 2=institution, 3=trust, ... |
| `tags` | bytes2[] | Commercial tags (referral programs, etc.) |
| `lastUpdated` | uint32 | Attributes update timestamp |

**Multisig:** `ownerThreshold`, `operatorThreshold`, `ownerRequiresApproval`, `operatorsRequireApproval`. Proposal system with confirmations, execution tracking, per-account history.

**Account permissions:** `accountPermissions[account][wallet]` → NONE, OPERATOR, OWNER. Per-function permissions via `accountFunctionPermissions[account][selector]`.

### 2.9 Audit Trail

All on-chain data is historically queryable via `eth_call` at any block. Additionally, explicit change tracking:

| Mapping | Business Meaning |
|---------|------------------|
| `classConfigChangeBlocks[classId]` | Block numbers when class config changed |
| `fundConfigChangeBlocks[fundId]` | Block numbers when fund config changed |
| `umbrellaChangeBlocks[umbrellaId]` | Block numbers when umbrella changed |
| `cashFundChangeBlocks[cashTokenId]` | Block numbers when cash fund changed |
| `accountChangeBlocks[account]` | Block numbers when account changed |

These enable targeted historical queries: "what was this class's fee rate on January 15th?" → find the right block number → `eth_call` at that block.

**Key view functions for audit:** `getClassAuditTrail(classId, offset, limit)` → merged fees + adjustments. `getFeeHistory(classId)` → management fees. `getRedemptionFeeHistory(dealingId)` → performance fees.

### 2.10 Constants

| Constant | Value | Meaning |
|----------|-------|---------|
| PRECISION | 1e18 | All price/amount arithmetic |
| BPS_DENOMINATOR | 10000 | 10000 = 100% |
| SECONDS_PER_YEAR | 31536000 | Fee annualization |
| FIRST_FUND_NUM | 1 | Funds start at 1 |
| FIRST_USER_CLASS_ID | 2 | Class 1 = fee class; user classes from 2 |
| MAX_PENDING_ADJUSTMENTS | 100 | Per fund |
| MAX_ADJUSTED_FEE_RATE_BPS | 2000 | Performance fee cap (20%) |

**Precision requirements:** On-chain: 18 decimal places (PRECISION = 1e18). Off-chain: minimum 8 decimal places for amounts, 10 for FX rates. NEVER use float/double for monetary values.

---

## 3. Haruko Data Model

Haruko is a digital asset portfolio management system that aggregates data across 100+ CEXs, custodians, and 250+ DeFi protocols. Elysium uses a **master API key** — all data is post-filtered by authorization.

**Critical: Elysium caches Haruko data locally** (see `HarukoSnapshot` in [Section 4.11](#411-haruko-data-cache)) to satisfy CBI independent records requirements.

### 3.1 Portfolio Positions

| Data | Description | Granularity |
|------|-------------|-------------|
| Holdings | Token/asset holdings across all venues | Per venue, per asset |
| Cash balances | Fiat and stablecoin balances | Per venue, per currency |
| DeFi positions | LP positions, staking, lending, borrowing | Per protocol, per chain |
| Venue breakdown | Which custodian/exchange holds what | Per venue |

### 3.2 Pricing & Valuation

| Data | Description | Use in Elysium |
|------|-------------|---------------|
| Shadow NAV (GAV) | Fund-level gross asset value with capital flows | Input to NAV Service → on-chain NAV |
| Asset prices | Configurable waterfall: CEX → composite → model | Fair value hierarchy |
| Position valuation | Mark-to-market per position | Reporting, reconciliation |
| Historical valuations | Time-series NAV and position values | Performance attribution |

### 3.3 Trading & Execution

| Data | Description | Use in Elysium |
|------|-------------|---------------|
| Trade blotter | All executed trades across venues | Audit trail, reconciliation |
| Order status | Open orders on exchanges | Risk monitoring |
| Execution analytics | Slippage, fill rates, timing | Reporting |

### 3.4 Risk Metrics

| Data | Description | Use in Elysium |
|------|-------------|---------------|
| Sharpe ratio | Risk-adjusted return | Performance reporting |
| Sortino ratio | Downside-only risk-adjusted return | Investor reporting |
| Volatility | Historical and implied | Risk monitoring |
| Max drawdown | Worst peak-to-trough | Risk reporting |
| VaR / CVaR | Value-at-risk measures | Regulatory reporting |

### 3.5 Strategy-Tagged P&L

| Data | Description | Use in Elysium |
|------|-------------|---------------|
| P&L by strategy | Realized + unrealized per strategy tag | Class-specific cost allocation |
| P&L by asset | Per-position P&L | Detailed reporting |
| Attribution | Performance breakdown by factor | Investor reporting |

### 3.6 Reconciliation Data

| Data | Description | Use in Elysium |
|------|-------------|---------------|
| Admin vs custodian | Position/cash discrepancies | Daily recon |
| Admin vs Haruko | Haruko vs internal ledger | Verification |
| Three-way recon | Admin vs custodian vs Haruko | Operational |

### 3.7 What Haruko Does NOT Provide

Share class accounting, investor-level accounting, fee waterfalls, transfer agency, smart contract interaction, traditional asset data (equities, bonds), investor identity/compliance, legal documents.

---

## 4. Off-Chain Data Model

**Storage: PostgreSQL (structured data) + S3 (documents, generated files) + CloudWatch Logs (access audit)**

**Multi-tenancy:** Every entity below carries `management_company_id` (UUID, FK to `ManagementCompany`). PostgreSQL Row Level Security enforces tenant isolation. See [Section 13](#13-multi-tenancy-model).

### 4.1 Investor Identity & PII

> PII split: authentication data in Cognito, business PII in Elysium DB.

**Investor Profile:**

| Field | Type | Description |
|-------|------|-------------|
| `id` | UUID | Internal identifier |
| `management_company_id` | UUID | Tenant isolation |
| `cognito_sub` | string | Link to Cognito identity |
| `legal_name` | string | Full legal name |
| `date_of_birth` | date | DOB |
| `nationality` | string | ISO 3166-1 alpha-2 |
| `residential_address` | jsonb | Structured address |
| `tax_residencies` | jsonb[] | Multiple jurisdictions possible |
| `tax_identification_numbers` | jsonb[] | TINs per jurisdiction |
| `investor_type` | enum | INDIVIDUAL, INSTITUTION, TRUST, PENSION, CHARITY |
| `source_of_wealth` | text | Description |
| `source_of_funds` | text | Description |
| `expected_investment_range` | int4range | Expected investment amount |
| `risk_profile` | enum | CONSERVATIVE, MODERATE, AGGRESSIVE |
| `preferred_language` | string | ISO 639-1 (default: "en") |
| `created_at` | timestamp | Registration date |
| `updated_at` | timestamp | Last update |

### 4.2 KYC/AML & Compliance

**KYC Records:**

| Field | Type | Description |
|-------|------|-------------|
| `id` | UUID | Record identifier |
| `investor_id` | UUID | FK to investor |
| `provider` | string | KYC provider name |
| `status` | enum | PENDING, VERIFIED, REJECTED, EXPIRED |
| `risk_score` | int | AML risk score (8-40 scale) |
| `risk_tier` | enum | LOW, MEDIUM, HIGH, PEP |
| `verified_at` | timestamp | Verification date |
| `expires_at` | timestamp | Expiry date |
| `review_frequency` | interval | Based on risk tier |
| `documents` | UUID[] | References to KYC documents in S3 |
| `notes` | text | Reviewer notes |

**KYC Documents** (metadata in DB, files in S3):

| Field | Type | Description |
|-------|------|-------------|
| `id` | UUID | Document identifier |
| `investor_id` | UUID | FK to investor |
| `type` | enum | PASSPORT, UTILITY_BILL, SOURCE_OF_FUNDS, BANK_STATEMENT, TAX_CERT, ... |
| `s3_key` | string | S3 object key |
| `file_name` | string | Original filename |
| `mime_type` | string | File type |
| `uploaded_at` | timestamp | Upload date |
| `verified_by` | UUID? | Reviewer |
| `status` | enum | PENDING, ACCEPTED, REJECTED |

**Beneficial Ownership (UBO):**

| Field | Type | Description |
|-------|------|-------------|
| `id` | UUID | UBO record |
| `entity_investor_id` | UUID | The institutional investor |
| `ubo_name` | string | Beneficial owner name |
| `ownership_percentage` | decimal | Ownership % (25%+ threshold) |
| `kyc_record_id` | UUID? | Link to UBO's KYC |
| `pep_status` | bool | Politically Exposed Person |

**Sanctions Screening:**

| Field | Type | Description |
|-------|------|-------------|
| `id` | UUID | Screening record |
| `investor_id` | UUID | FK to investor |
| `lists_checked` | string[] | OFAC, EU, UN, UK_HMT |
| `result` | enum | CLEAR, MATCH, POTENTIAL_MATCH |
| `screened_at` | timestamp | Screening date |
| `next_screening` | timestamp | Next scheduled screening |

**Suspicious Activity Report** (restricted access — MLRO + compliance only):

| Field | Type | Description |
|-------|------|-------------|
| `id` | UUID | Report identifier |
| `investor_id` | UUID | Subject (**encrypted column, restricted access**) |
| `reporter_id` | UUID | Who raised the suspicion |
| `mlro_id` | UUID | Money Laundering Reporting Officer |
| `type` | enum | INTERNAL_STR, EXTERNAL_SAR |
| `description` | text | Activity description |
| `indicators` | string[] | AML red flags triggered |
| `transaction_refs` | string[]? | On-chain order IDs |
| `decision` | enum | ESCALATE_TO_FIU, NO_FURTHER_ACTION, MONITORING |
| `fiu_reference` | string? | FIU filing reference |
| `filed_at` | timestamp? | When filed with FIU |
| `status` | enum | DRAFT, REVIEWED, FILED, CLOSED |
| `created_at` | timestamp | When created |

> **Tipping-off prevention:** Under BVI AML Regulations and Irish Criminal Justice Act, informing a subject that an SAR exists is a criminal offense. Cerbos policies MUST restrict SAR access to MLRO + compliance. Standard investor API queries MUST NOT indicate SAR existence.

### 4.3 Documents

**Fund Documents:**

| Document Type | Access Tier | Description |
|--------------|-------------|-------------|
| Prospectus / PPM | RESTRICTED | Core legal document |
| Supplements | RESTRICTED | Per-class terms and conditions |
| KIID / KID | PUBLIC | Key Investor Information Document |
| Factsheet | PUBLIC | Monthly/quarterly performance summary |
| Annual report | RESTRICTED | Audited financial statements |
| Semi-annual report | RESTRICTED | Unaudited financials |

**Investor Documents:**

| Document Type | Access Tier | Description |
|--------------|-------------|-------------|
| Contract note | PRIVATE | Per-transaction confirmation |
| Statement | PRIVATE | Periodic holding statement |
| Tax certificate | PRIVATE | Annual tax documentation |
| Distribution notice | PRIVATE | Income distribution details |
| Redemption confirmation | PRIVATE | Settlement confirmation |

**Document metadata:**

| Field | Type | Description |
|-------|------|-------------|
| `id` | UUID | Document identifier |
| `management_company_id` | UUID | Tenant isolation |
| `type` | enum | PROSPECTUS, SUPPLEMENT, FACTSHEET, CONTRACT_NOTE, STATEMENT, ... |
| `entity_type` | enum | FUND, CLASS, INVESTOR, UMBRELLA |
| `entity_id` | UUID | Related entity |
| `access_tier` | enum | PUBLIC, RESTRICTED, PRIVATE |
| `version` | int | Document version |
| `s3_key` | string | S3 object key |
| `file_name` | string | Display name |
| `generated_at` | timestamp | Generation/upload date |
| `valid_from` | date? | Effective date |
| `valid_to` | date? | Superseded date |

**Document access grants:**

| Field | Type | Description |
|-------|------|-------------|
| `document_id` | UUID | FK to document |
| `grantee_id` | UUID | User/role granted access |
| `grantee_type` | enum | USER, ROLE, FUND_INVESTORS |
| `granted_at` | timestamp | Grant date |
| `viewed_at` | timestamp? | First view (audit) |

### 4.4 Communications

**Notifications:**

| Field | Type | Description |
|-------|------|-------------|
| `id` | UUID | Notification identifier |
| `recipient_id` | UUID | Target user |
| `type` | enum | ORDER_CONFIRMED, NAV_UPDATED, COMPLIANCE_ALERT, DOCUMENT_AVAILABLE, ... |
| `channel` | enum | IN_APP, EMAIL, SMS |
| `title` | string | Notification title |
| `body` | text | Notification content |
| `entity_ref` | jsonb? | Related entity |
| `sent_at` | timestamp | Send time |
| `read_at` | timestamp? | Read time |

**Manager-Investor Communications:**

| Field | Type | Description |
|-------|------|-------------|
| `id` | UUID | Message identifier |
| `thread_id` | UUID | Conversation thread |
| `sender_id` | UUID | Sender |
| `recipient_ids` | UUID[] | Recipients |
| `body` | text | Message content |
| `attachments` | UUID[] | Document references |
| `sent_at` | timestamp | Send time |

**Research Articles & Posts:**

| Field | Type | Description |
|-------|------|-------------|
| `id` | UUID | Article identifier |
| `author_id` | UUID | Manager who wrote it |
| `title` | string | Article title |
| `body` | text | Content (markdown) |
| `fund_ids` | UUID[] | Related funds |
| `visibility` | enum | PUBLIC, FUND_INVESTORS, PRIVATE |
| `published_at` | timestamp | Publication date |

**Relationships:**

| Field | Type | Description |
|-------|------|-------------|
| `id` | UUID | Relationship identifier |
| `type` | enum | HOLDING_SHARE, FRIEND, DELEGATION, REFERRAL |
| `from_user_id` | UUID | Initiator |
| `to_user_id` | UUID | Target |
| `entity_ref` | jsonb? | Related entity |
| `permissions` | jsonb | What the relationship grants |
| `created_at` | timestamp | Creation date |
| `status` | enum | PENDING, ACTIVE, REVOKED |

### 4.5 Operations & Settlement

**Reconciliation Results:**

| Field | Type | Description |
|-------|------|-------------|
| `id` | UUID | Recon record |
| `fund_id` | UUID | Fund |
| `recon_date` | date | Reconciliation date |
| `type` | enum | CASH, POSITION, NAV |
| `source_a` | string | First source (e.g., "on-chain") |
| `source_b` | string | Second source (e.g., "custodian") |
| `source_c` | string? | Third source (e.g., "Haruko") |
| `discrepancies` | jsonb | List of discrepancies with amounts |
| `status` | enum | MATCHED, DISCREPANCY, RESOLVED |
| `resolved_by` | UUID? | Resolver |
| `resolved_at` | timestamp? | Resolution time |

**Settlement Instructions:**

| Field | Type | Description |
|-------|------|-------------|
| `id` | UUID | Instruction identifier |
| `order_id` | string | On-chain order reference |
| `fund_id` | UUID | Fund |
| `investor_id` | UUID | Investor |
| `direction` | enum | INBOUND (subscription), OUTBOUND (redemption) |
| `currency` | string | ISO 4217 |
| `amount` | decimal | Settlement amount |
| `bank_account_id` | UUID | Target bank account |
| `ssi_id` | UUID? | FK to StandardSettlementInstruction |
| `payment_method` | enum | WIRE, ACH, SEPA, CRYPTO, INTERNAL |
| `swift_message_ref` | string? | MT103/MT202 reference |
| `expected_value_date` | date | When funds should arrive |
| `actual_value_date` | date? | When funds actually arrived |
| `matched_bank_tx_id` | UUID? | FK to matched BankTransaction |
| `status` | enum | PENDING, INSTRUCTED, SETTLED, FAILED |
| `retry_count` | int | Retry attempts |
| `failure_reason` | text? | If FAILED |
| `instructed_at` | timestamp? | When instruction sent |
| `settled_at` | timestamp? | When confirmed |

**Standard Settlement Instructions (SSI):**

| Field | Type | Description |
|-------|------|-------------|
| `id` | UUID | SSI identifier |
| `entity_type` | enum | FUND, CUSTODIAN, COUNTERPARTY |
| `entity_id` | UUID | Entity this SSI belongs to |
| `currency` | string | ISO 4217 |
| `bank_account_id` | UUID | FK to BankAccount |
| `intermediary_bank` | jsonb? | Intermediary bank details (BIC, account) |
| `reference_format` | string? | Expected payment reference pattern |
| `is_default` | bool | Default SSI for this entity+currency |
| `effective_from` | date | When SSI became active |
| `superseded_at` | date? | When replaced |

**Settlement Routing Rules:**

| Field | Type | Description |
|-------|------|-------------|
| `id` | UUID | Rule identifier |
| `fund_id` | UUID | Fund |
| `currency` | string | ISO 4217 |
| `direction` | enum | INBOUND, OUTBOUND |
| `min_amount` | decimal? | Amount threshold |
| `ssi_id` | UUID | FK to SSI to use |
| `priority` | int | Rule priority (lower = higher priority) |

**Netting:** Subscriptions and redemptions within the same dealing cycle are netted to minimize cash movement. Netting is computed by the settlement service — the net result is captured in the `amount` field of `SettlementInstruction`. No separate netting entity is needed; the `ServiceExecution` for the settlement run captures netting details in `output_summary`.

**Bank Transactions** (imported from bank statements/feeds):

| Field | Type | Description |
|-------|------|-------------|
| `id` | UUID | Transaction identifier |
| `bank_account_id` | UUID | FK to BankAccount |
| `transaction_date` | date | Transaction date |
| `value_date` | date | Value/settlement date |
| `amount` | decimal | Signed amount (+inbound, -outbound) |
| `currency` | string | ISO 4217 |
| `counterparty_name` | string? | Sender/receiver |
| `reference` | string? | Payment reference |
| `bank_reference` | string? | Bank's internal ref |
| `source` | enum | STATEMENT_IMPORT, API_FEED, MANUAL |
| `imported_at` | timestamp | When imported |
| `matched_to` | UUID? | FK to SettlementInstruction |
| `match_confidence` | enum? | AUTO_EXACT, AUTO_FUZZY, MANUAL |
| `matched_by` | UUID? | Who confirmed (if manual) |

### 4.6 Regulatory Reporting

| Report | Jurisdiction | Frequency | Key Data |
|--------|-------------|-----------|----------|
| AIFMD Annex IV | EU | Quarterly | 300+ fields: AuM, strategy, leverage, liquidity, risk |
| Form PF | US (SEC) | Quarterly/Annual | AuM, strategy, leverage, counterparty exposure |
| FATCA/CRS | Global | Annual | Investor tax residency, account balances, income |
| Cayman FAR | Cayman | Annual | Fund details, service providers, AuM |

**Report entity:**

| Field | Type | Description |
|-------|------|-------------|
| `id` | UUID | Report identifier |
| `type` | enum | AIFMD_ANNEX_IV, FORM_PF, FATCA_CRS, CAYMAN_FAR |
| `fund_id` | UUID | Fund |
| `period` | daterange | Reporting period |
| `status` | enum | DRAFT, REVIEW, SUBMITTED, ACCEPTED |
| `data` | jsonb | Report data payload |
| `s3_key` | string? | Generated report file |
| `submitted_at` | timestamp? | Submission date |
| `filing_reference` | string? | Regulator reference number |

### 4.7 Tax

| Field | Type | Description |
|-------|------|-------------|
| `investor_id` | UUID | FK to investor |
| `jurisdiction` | string | Tax jurisdiction |
| `tin` | string (encrypted) | Tax Identification Number |
| `self_cert_type` | enum | W8_BEN, W8_BEN_E, W9, CRS_SELF_CERT |
| `self_cert_doc_id` | UUID | S3 document reference |
| `withholding_rate` | decimal | Applicable rate (treaty-adjusted) |
| `certified_at` | timestamp | Certification date |
| `expires_at` | timestamp | Certification expiry |

### 4.8 Billing & Invoicing

**Platform Invoices (Elysium → Managers/Funds):**

| Field | Type | Description |
|-------|------|-------------|
| `id` | UUID | Invoice identifier |
| `fund_id` | UUID | Billed fund |
| `manager_id` | UUID | Billed manager |
| `period` | daterange | Billing period |
| `line_items` | jsonb | Breakdown (AuM fee, per-class fee, transaction fees, ...) |
| `total_amount` | decimal | Total |
| `currency` | string | Invoice currency |
| `status` | enum | DRAFT, SENT, PAID, OVERDUE |
| `due_date` | date | Payment due date |
| `paid_at` | timestamp? | Payment date |

**Fund-Submitted Invoices (Third parties → Fund):**

| Field | Type | Description |
|-------|------|-------------|
| `id` | UUID | Invoice identifier |
| `fund_id` | UUID | Fund being charged |
| `vendor_name` | string | Invoice source |
| `adjustment_label` | enum | Maps to on-chain AdjustmentLabel |
| `target_class_id` | string? | Specific class (null = pro-rata) |
| `amount` | decimal | Invoice amount |
| `currency` | string | Invoice currency |
| `s3_key` | string | Invoice document |
| `status` | enum | RECEIVED, APPROVED, POSTED, REJECTED |
| `approved_by` | UUID? | Approver |
| `on_chain_ref` | string? | On-chain adjustment tx hash |

### 4.9 Compliance & Governance

| Entity | Key Fields | Description |
|--------|-----------|-------------|
| **Complaint register** | investor, description, received_at, acknowledged_at (5-day SLA), resolved_at (40-day SLA), resolution | Regulatory requirement |
| **Breach log** | fund, restriction_type, breach_description, detected_at, remediation, reported_to_regulator | Investment restriction violations |
| **Board records** | fund, meeting_date, attendees, minutes_doc_id, resolutions | Board meeting documentation |

### 4.10 Service Execution Tracking

**Storage: PostgreSQL**

Every backend service (NAV Service, error_engine, report generator, settlement processor, etc.) logs each run for operational visibility, debugging, audit, and SLA monitoring.

**`ServiceExecution`:**

| Field | Type | Description |
|-------|------|-------------|
| `id` | UUID | Execution identifier |
| `management_company_id` | UUID | Tenant isolation |
| `service` | enum | NAV_SERVICE, ERROR_ENGINE, REPORT_GENERATOR, DEALING_SCHEDULER, SETTLEMENT_PROCESSOR, RECON_ENGINE, FX_UPDATER, COMPLIANCE_SCREENING, FEE_PROCESSOR |
| `trigger` | enum | SCHEDULED, MANUAL, EVENT, RETRY |
| `triggered_by` | UUID? | User (if MANUAL) |
| `trigger_event` | string? | Event reference (if EVENT) |
| `scope_type` | enum? | FUND, UMBRELLA, INVESTOR, GLOBAL |
| `scope_id` | string? | Specific entity processed |
| `started_at` | timestamp | Run start |
| `completed_at` | timestamp? | Run end |
| `status` | enum | RUNNING, COMPLETED, FAILED, PARTIAL |
| `input_summary` | jsonb | Key inputs (service-specific) |
| `output_summary` | jsonb | Key outputs (service-specific) |
| `on_chain_tx_hashes` | string[]? | On-chain transactions posted |
| `error_message` | text? | If FAILED/PARTIAL |
| `artifacts` | UUID[]? | Documents/reports produced |
| `duration_ms` | int? | Execution duration |
| `parent_execution_id` | UUID? | Parent in multi-step orchestration |

### 4.11 Haruko Data Cache

**Storage: PostgreSQL (metadata + structured fields) + S3 (raw API responses)**

CBI requires the fund administrator to maintain independent records, not rely solely on third-party API availability. Every NAV computation captures a snapshot of the Haruko data that fed into it.

**`HarukoSnapshot`:**

| Field | Type | Description |
|-------|------|-------------|
| `id` | UUID | Snapshot identifier |
| `management_company_id` | UUID | Tenant isolation |
| `fund_id` | UUID | Elysium fund |
| `haruko_portfolio_id` | string | Haruko reference |
| `snapshot_date` | date | Business date |
| `snapshot_type` | enum | NAV_INPUT, DAILY_POSITION, DAILY_RISK |
| `gav` | decimal? | Gross Asset Value (Shadow NAV) |
| `positions` | jsonb | Full position snapshot |
| `cash_balances` | jsonb | Cash per currency per venue |
| `risk_metrics` | jsonb? | Sharpe, Sortino, VaR, etc. |
| `raw_response_s3_key` | string | Complete API response in S3 (immutable) |
| `captured_at` | timestamp | When captured |
| `service_execution_id` | UUID? | FK to the NAV run that used this data |

### 4.12 Error Correction Artifacts

**Storage: PostgreSQL**

The error correction engine (`apps/backend/error_engine`) fixes wrong on-chain entries, propagates corrections to current block, and creates compensation records. These entities track the ARTIFACTS of that process.

**`CorrectionRun`:**

| Field | Type | Description |
|-------|------|-------------|
| `id` | UUID | Correction run identifier |
| `management_company_id` | UUID | Tenant isolation |
| `service_execution_id` | UUID | FK to ServiceExecution |
| `fund_id` | UUID | Affected fund |
| `error_type` | enum | NAV_ERROR, FX_ERROR, FEE_ERROR, ORDER_ERROR, ADJUSTMENT_ERROR |
| `original_block` | uint32 | Block where error originated |
| `corrected_block` | uint32 | Block where correction posted |
| `affected_block_range` | int4range | All blocks with downstream impact |
| `materiality_bps` | int | Error magnitude in basis points |
| `is_material` | bool | Exceeds materiality threshold |
| `description` | text | Human-readable error description |
| `approved_by` | UUID? | Approver (for material corrections) |
| `status` | enum | PENDING_APPROVAL, COMPLETED, FAILED |
| `compensation_ledger_id` | UUID? | FK to CompensationLedger |

**`CompensationLedger`:**

| Field | Type | Description |
|-------|------|-------------|
| `id` | UUID | Ledger identifier |
| `correction_run_id` | UUID | FK to CorrectionRun |
| `fund_id` | UUID | Fund |
| `total_compensation` | decimal | Net total |
| `currency` | string | Compensation currency |
| `status` | enum | CALCULATED, APPROVED, PARTIALLY_PAID, FULLY_PAID |
| `approved_by` | UUID? | Approver |

**`CompensationEntry`:**

| Field | Type | Description |
|-------|------|-------------|
| `id` | UUID | Entry identifier |
| `ledger_id` | UUID | FK to CompensationLedger |
| `investor_id` | UUID | Affected investor |
| `direction` | enum | OWED_TO_INVESTOR, OWED_TO_FUND |
| `amount` | decimal | Compensation amount |
| `affected_orders` | string[] | On-chain order IDs |
| `payment_status` | enum | PENDING, PAID, WAIVED |
| `payment_ref` | string? | Settlement instruction reference |

### 4.13 Audit Trail (Off-Chain)

**Access Audit — Storage: CloudWatch Logs**

Cerbos policy decisions on every API request. Schema for log entries (emitted as JSON to CloudWatch):

| Field | Type | Description |
|-------|------|-------------|
| `timestamp` | ISO 8601 | Request time |
| `principal_id` | string | User or service ID |
| `principal_type` | string | USER, SERVICE, SYSTEM |
| `action` | string | Cerbos action (read, update, delete) |
| `resource_type` | string | Cerbos resource kind |
| `resource_id` | string | Specific resource |
| `decision` | string | ALLOW, DENY |
| `policy_version` | string | Cerbos policy version |
| `ip_address` | string | Client IP |
| `request_id` | string | API request correlation ID |

Queryable via CloudWatch Log Insights. Long-term retention via S3 export.

**Mutation Audit — Storage: PostgreSQL**

**`DataChangeEntry`:**

| Field | Type | Description |
|-------|------|-------------|
| `id` | UUID | Entry identifier |
| `timestamp` | timestamp | Change time |
| `changed_by` | UUID | User |
| `entity_type` | string | Table/entity |
| `entity_id` | UUID | Record |
| `operation` | enum | CREATE, UPDATE, DELETE |
| `field_changes` | jsonb | `{ "field": { "old": X, "new": Y } }` |
| `request_id` | string | Correlation to API request |

### 4.14 Report Lifecycle

**Storage: PostgreSQL + S3 (generated documents)**

**`ReportRun`:**

| Field | Type | Description |
|-------|------|-------------|
| `id` | UUID | Run identifier |
| `management_company_id` | UUID | Tenant isolation |
| `service_execution_id` | UUID? | FK to ServiceExecution |
| `report_type` | enum | FACTSHEET, INVESTOR_STATEMENT, CONTRACT_NOTE, TAX_CERTIFICATE, NAV_REPORT, BOARD_PACK, REGULATORY |
| `scope_type` | enum | FUND, CLASS, INVESTOR, UMBRELLA |
| `scope_id` | string | Entity |
| `period_start` | date? | Period start (null for point-in-time) |
| `period_end` | date? | Period end |
| `as_of_block` | uint32? | On-chain block used for data extraction |
| `parameters` | jsonb | Currency, language, format, template version |
| `triggered_by` | enum | SCHEDULED, MANUAL, EVENT |
| `status` | enum | QUEUED, GENERATING, GENERATED, REVIEW, PUBLISHED, FAILED |
| `output_document_id` | UUID? | FK to Document (Section 4.3) |
| `structured_data` | jsonb? | Report data payload for UI rendering without regeneration |
| `reviewed_by` | UUID? | Reviewer |
| `published_at` | timestamp? | Publication time |
| `started_at` | timestamp | Generation start |
| `completed_at` | timestamp? | Generation end |

The `structured_data` field caches the computed report content (holdings, fees, performance) so the UI can render reports without re-querying the chain. This is invalidated when error corrections affect the report period.

**`ReportSchedule`** (Phase 2 — manual triggers sufficient for MVP):

| Field | Type | Description |
|-------|------|-------------|
| `id` | UUID | Schedule identifier |
| `report_type` | enum | Same as ReportRun |
| `scope_type` | enum | FUND, CLASS, INVESTOR, UMBRELLA |
| `scope_id` | string | Specific entity or `ALL` |
| `frequency` | enum | DAILY, WEEKLY, MONTHLY, QUARTERLY, SEMI_ANNUAL, ANNUAL, ON_EVENT |
| `trigger_event` | string? | If ON_EVENT: `order_settled`, `nav_updated` |
| `day_offset` | int? | Days after period end to generate |
| `parameters` | jsonb | Default parameters |
| `requires_review` | bool | Human review required |
| `is_active` | bool | Active/paused |
| `next_run_at` | timestamp? | Next scheduled run |

**`ReportDistribution`** (Phase 2):

| Field | Type | Description |
|-------|------|-------------|
| `report_run_id` | UUID | FK to ReportRun |
| `recipient_id` | UUID | Investor or manager |
| `channel` | enum | IN_APP, EMAIL, API_WEBHOOK |
| `delivered_at` | timestamp? | Delivery confirmation |
| `viewed_at` | timestamp? | First view |

### 4.15 Dealing Schedule Configuration

**Storage: PostgreSQL**

The on-chain model stores dealing timestamps (RESULTS). This off-chain entity stores the RULES that a dealing schedule service uses to compute them.

**`DealingScheduleConfig`:**

| Field | Type | Description |
|-------|------|-------------|
| `id` | UUID | Config identifier |
| `management_company_id` | UUID | Tenant isolation |
| `fund_id` | string | On-chain fund reference |
| `frequency` | enum | DAILY, WEEKLY, BIWEEKLY, MONTHLY, QUARTERLY, CUSTOM |
| `dealing_day` | int? | Day of week (1-5) or day of month (1-28) |
| `cutoff_time` | time | Order cutoff (e.g., 12:00 UTC) |
| `cutoff_offset_days` | int | Days before dealing (T-1 = -1) |
| `valuation_point` | time | When NAV is struck |
| `timezone` | string | IANA timezone (e.g., "Europe/Dublin") |
| `settlement_cycle_sub` | int | T+N for subscriptions |
| `settlement_cycle_red` | int | T+N for redemptions |
| `calendar_id` | UUID? | FK to BusinessCalendar (Phase 2) |
| `gate_percentage_bps` | int? | Max redemption per dealing as BPS |
| `effective_from` | date | When rules took effect |
| `superseded_at` | date? | Replaced by new config |

**`BusinessCalendar`** (Phase 2 — manual holiday management for MVP):

| Field | Type | Description |
|-------|------|-------------|
| `id` | UUID | Calendar identifier |
| `name` | string | E.g., "London + New York" |
| `jurisdictions` | string[] | ISO 3166-1 codes |
| `year` | int | Calendar year |
| `holidays` | date[] | Non-business days |
| `source` | string | Data provider |
| `loaded_at` | timestamp | Last updated |

### 4.16 Consent Tracking

**Storage: PostgreSQL**

**`InvestorConsent`:**

| Field | Type | Description |
|-------|------|-------------|
| `id` | UUID | Consent record |
| `investor_id` | UUID | Investor |
| `consent_type` | enum | FUND_TERMS, PRIVACY_POLICY, MARKETING, DATA_SHARING |
| `document_id` | UUID? | Document version agreed to |
| `fund_id` | UUID? | Fund-specific consent |
| `granted_at` | timestamp | When given |
| `withdrawn_at` | timestamp? | When withdrawn |
| `ip_address` | string? | For electronic consent |

### 4.17 Outsourcing Register

**Storage: PostgreSQL**

CBI requires documented outsourcing arrangements with risk assessment and ongoing oversight.

**`OutsourcingArrangement`:**

| Field | Type | Description |
|-------|------|-------------|
| `id` | UUID | Arrangement identifier |
| `management_company_id` | UUID | Tenant isolation |
| `provider_name` | string | Service provider (Haruko, AWS, KYC provider, etc.) |
| `service_description` | text | What's outsourced |
| `criticality` | enum | CRITICAL, IMPORTANT, NON_CRITICAL |
| `contract_id` | UUID? | FK to Contract |
| `risk_assessment_date` | date | Last risk assessment |
| `next_review_date` | date | Next scheduled review |
| `oversight_contact` | UUID | Internal oversight owner |
| `status` | enum | ACTIVE, UNDER_REVIEW, TERMINATED |

### 4.18 Fund Metadata (Off-Chain)

**Storage: PostgreSQL**

Supplements the on-chain fund structure with jurisdiction and regulatory context.

**`FundMetadata`:**

| Field | Type | Description |
|-------|------|-------------|
| `fund_id` | string | On-chain fund reference |
| `management_company_id` | UUID | Tenant isolation |
| `fund_domicile` | string | ISO 3166-1: VG (BVI), IE, KY, LU, ... |
| `regulatory_regime` | string[] | `["SIBA", "AIFMD", "CBI_FA"]` |
| `governing_law` | string | Jurisdiction of governing law |
| `fund_structure` | enum | UNIT_TRUST, COMPANY, LP, LLC |
| `auditor` | string? | External auditor name |
| `legal_counsel` | string? | Legal counsel name |
| `fiscal_year_end` | string | Month-day (e.g., "12-31") |
| `launch_date` | date | Fund launch date |

### 4.19 Tiered Fee Configuration (Phase 2)

**Storage: PostgreSQL**

AuM-bracket-based management fee tiers for institutional investors.

**`TieredFeeConfig`:**

| Field | Type | Description |
|-------|------|-------------|
| `id` | UUID | Config identifier |
| `class_id` | string | On-chain class reference |
| `tiers` | jsonb | `[{ "aum_min": 0, "aum_max": 10000000, "rate_bps": 200 }, { "aum_min": 10000000, "rate_bps": 150 }]` |
| `calculation_method` | enum | TIERED (each bracket), BLENDED (weighted average) |
| `effective_from` | date | When config took effect |
| `superseded_at` | date? | When replaced |

### 4.20 Suitability Assessment (Phase 2)

**Storage: PostgreSQL**

MiFID II requires appropriateness/suitability assessment when distributing to EU/UK investors.

**`SuitabilityAssessment`:**

| Field | Type | Description |
|-------|------|-------------|
| `id` | UUID | Assessment identifier |
| `investor_id` | UUID | FK to investor |
| `fund_id` | UUID | Fund |
| `class_id` | string? | Specific class |
| `assessment_type` | enum | SUITABILITY, APPROPRIATENESS |
| `investor_risk_profile` | enum | From investor profile |
| `product_risk_classification` | enum | CONSERVATIVE, MODERATE, AGGRESSIVE, SPECULATIVE |
| `result` | enum | SUITABLE, NOT_SUITABLE, APPROPRIATE, NOT_APPROPRIATE |
| `override` | bool | Manager overrode negative result |
| `override_reason` | text? | Justification |
| `assessed_at` | timestamp | Assessment date |
| `assessed_by` | UUID | Assessor |
| `valid_until` | timestamp? | Reassessment deadline |

### 4.21 Income Distributions (Phase 2)

For expansion into UCITS or distributing share classes.

**On-chain addition to ClassInfo:**

| Field | Type | Description |
|-------|------|-------------|
| `distributionPolicy` | uint8 | 0=ACCUMULATING, 1=DISTRIBUTING |
| `distributionFrequency` | uint8 | 0=none, 1=monthly, 4=quarterly, 12=annual |

**On-chain: `Distribution` struct:**

| Field | Type | Description |
|-------|------|-------------|
| `classId` | uint16 | Class |
| `amount` | uint128 | Total distribution amount |
| `perUnitAmount` | uint128 | Amount per token unit |
| `exDate` | uint32 | Ex-distribution timestamp |
| `recordDate` | uint32 | Record date |
| `paymentDate` | uint32 | Payment date |
| `reinvestmentDealingId` | uint16? | If auto-reinvested |

**Off-chain distribution tracking:**

| Field | Type | Description |
|-------|------|-------------|
| `on_chain_ref` | string | Block + classId |
| `tax_withholdings` | jsonb | Per-investor withholding amounts by jurisdiction |
| `payment_instructions` | UUID[] | FK to SettlementInstructions |

---

## 5. External Services

### 5.1 AWS Cognito (Authentication)

**What lives in Cognito:**

| Attribute | Description |
|-----------|-------------|
| `sub` | Unique user identifier (UUID) |
| `email` | Login email |
| `phone_number` | Phone (for MFA) |
| `name` | Display name |
| `custom:role` | Platform role (admin, manager, investor) |
| `groups` | Cognito group memberships |

**Boundary principle:** Cognito stores authentication data. Business PII lives in Elysium DB under encryption.

### 5.2 AWS KMS / Secrets Manager

**KMS:** Per-user private keys for private chain operations. Key never leaves AWS; signing via KMS `Sign` API. CloudTrail logs every operation.

**Secrets Manager:** Haruko API key, exchange API keys, custodian API keys, bank API credentials, KYC provider API key. DB stores only ARN references.

### 5.3 Three-Way Wallet Mapping

```
Public blockchain wallet (user's own, e.g., MetaMask)
    ↕ linked via signature verification
Elysium user identity (Cognito sub + DB profile)
    ↕ generated at registration
Private chain wallet (AWS KMS key, on Elysium's Avalanche subnet)
```

**Wallet mapping entity:**

| Field | Type | Description |
|-------|------|-------------|
| `user_id` | UUID | Elysium user |
| `wallet_type` | enum | PUBLIC_EXTERNAL, PRIVATE_CHAIN |
| `address` | string | Wallet address |
| `chain_id` | int? | Which blockchain |
| `kms_key_arn` | string? | For PRIVATE_CHAIN type |
| `verified_at` | timestamp | Ownership verification date |
| `is_primary` | bool | Primary wallet for this type |

---

## 6. Cross-Platform Identity Map

### 6.1 The Problem

```
One fund on five platforms:
  On-chain:    fundId = 3 (uint16 in smart contract)
  Elysium DB:  fund_id = "a1b2c3..." (UUID)
  Haruko:      portfolio_id = "HRK-PF-0042" (string)
  BitGo:       wallet_id = "enterprise/abc123/wallet/def456"
  Binance:     sub_account = "fund3_trading"
  Bank:        IBAN = "CH93 0076 2011 6238 5295 7"
```

### 6.2 Entity Mapping

| Field | Type | Description |
|-------|------|-------------|
| `id` | UUID | Mapping record |
| `management_company_id` | UUID | Tenant isolation |
| `entity_type` | enum | FUND, MANAGER, INVESTOR, UMBRELLA |
| `entity_id` | UUID | Elysium internal ID |
| `platform` | enum | ON_CHAIN, HARUKO, BITGO, FIREBLOCKS, BINANCE, OKX, BANK, ... |
| `platform_entity_id` | string | ID on that platform |
| `platform_account_type` | string | "trading", "custody", "settlement", "view_only" |
| `credentials_ref` | string? | AWS Secrets Manager ARN |
| `chain_id` | int? | For blockchain addresses |
| `currency` | string? | For bank accounts |
| `is_active` | bool | Active / deactivated |
| `verified_at` | timestamp | Mapping verification date |
| `metadata` | jsonb | Platform-specific data |

### 6.3 Bank Account Entity

| Field | Type | Description |
|-------|------|-------------|
| `id` | UUID | Account identifier |
| `management_company_id` | UUID | Tenant isolation |
| `entity_type` | enum | FUND, INVESTOR |
| `entity_id` | UUID | Fund or investor |
| `bank_name` | string | Bank name |
| `account_number` | string (encrypted) | Account number |
| `iban` | string (encrypted) | IBAN if applicable |
| `swift_bic` | string | SWIFT/BIC code |
| `sort_code` | string? | UK sort code |
| `routing_number` | string? | US routing number |
| `account_holder_name` | string | Registered name |
| `currency` | string | Account currency |
| `is_verified` | bool | Verification status |
| `verified_at` | timestamp? | Verification date |
| `is_primary` | bool | Primary for this currency |

---

## 7. Off-Chain Process Attachments

### 7.1 Event-Process Mapping

| On-Chain Event | Off-Chain Process | Required Artifacts |
|---------------|-------------------|--------------------|
| **Fund created** | Legal entity formation, regulatory registration | Formation docs, regulatory filing, admin agreement |
| **Share class added** | Supplement drafted, compliance review, board approval | Supplement, board resolution, compliance sign-off |
| **Class config changed** | Amendment, investor notification (30-90 days) | Amendment doc, notification records |
| **Order placed** (sub) | KYC check, source of funds verification, AML screening | KYC report, SoF declaration, screening results |
| **Order settled** | Contract note generation, statement update | Contract note PDF, updated statement |
| **Fund → RETIRED** | Soft close notice, regulatory notification | Notice letter, filing confirmation |
| **Fund → CLOSED** | Final NAV, liquidation, deregistration | Final accounts, liquidation report |
| **Investor onboarded** | KYC/AML workflow, eligibility assessment | KYC docs, assessment result |

### 7.2 Process Attachment Entity

| Field | Type | Description |
|-------|------|-------------|
| `id` | UUID | Process identifier |
| `management_company_id` | UUID | Tenant isolation |
| `on_chain_event_type` | enum | FUND_CREATED, CLASS_ADDED, ORDER_PLACED, ... |
| `on_chain_ref` | string | Transaction hash or (fundId, blockNumber) |
| `entity_type` | enum | FUND, CLASS, ORDER, INVESTOR, MANAGER |
| `entity_id` | UUID | Related entity |
| `process_status` | enum | PENDING, IN_PROGRESS, COMPLETED, BLOCKED |
| `required_artifacts` | string[] | Required document types |
| `completed_artifacts` | UUID[] | Uploaded documents |
| `assigned_to` | UUID? | Person responsible |
| `due_date` | timestamp? | Deadline |
| `completed_at` | timestamp? | Completion date |
| `notes` | text? | Process notes |

---

## 8. Contracts & Legal

Three categories, managed via composable modular templates.

### 8.1 Contract Types

| Category | Contract Types |
|----------|---------------|
| **Platform** (Elysium ↔ Manager) | Administration agreement, fee schedule, SLA terms, DPA, onboarding terms |
| **Investor** (Investor ↔ Fund) | Subscription agreement, side letter, power of attorney, NDA |
| **Vendor** (Elysium ↔ Provider) | Haruko, AWS, Avalanche, KYC provider, external auditor, legal counsel |

### 8.2 Template Entity

| Field | Type | Description |
|-------|------|-------------|
| `id` | UUID | Template identifier |
| `template_type` | enum | ADMIN_AGREEMENT, SUBSCRIPTION, SIDE_LETTER, VENDOR, FEE_SCHEDULE, ... |
| `version` | int | Template version |
| `modules` | jsonb | Composable sections |
| `variables` | jsonb | Configurable parameters |
| `status` | enum | DRAFT, REVIEW, SIGNED, ACTIVE, TERMINATED |

### 8.3 Contract Instance

| Field | Type | Description |
|-------|------|-------------|
| `id` | UUID | Contract instance |
| `management_company_id` | UUID | Tenant isolation |
| `template_id` | UUID | Source template |
| `template_version` | int | Template version used |
| `counterparty_type` | enum | MANAGER, INVESTOR, VENDOR |
| `counterparty_id` | UUID | Counterparty |
| `entity_type` | enum | FUND, UMBRELLA, PLATFORM |
| `entity_id` | UUID? | Related fund/umbrella |
| `variables_filled` | jsonb | Filled parameters |
| `generated_doc_s3_key` | string | Generated document in S3 |
| `signed_doc_s3_key` | string? | Signed version in S3 |
| `status` | enum | DRAFT, REVIEW, SENT, SIGNED, ACTIVE, TERMINATED |
| `signed_at` | timestamp? | Signature date |
| `effective_from` | date | Contract start |
| `expires_at` | date? | Contract end (null = indefinite) |
| `terminated_at` | timestamp? | Early termination |
| `termination_reason` | text? | Reason |

---

## 9. Middleware — NAV Service

The NAV Service is a **data combiner + transaction poster**. It reads from Haruko and on-chain, combines into a fund-level NAV figure, and posts to the smart contract. It does not compute dilution, class adjustments, or fees — those are on-chain.

### 9.1 Data Flow

```
1. READ  Haruko: fund-level GAV, positions, P&L, cash balances
2. CACHE Haruko data → HarukoSnapshot (Section 4.11)
3. READ  On-chain: current NAV, dilution ratios, class configs, pending adjustments
4. READ  External FX source: current exchange rates
5. COMBINE into fund-level NAV figure
6. POST  to chain: updateNav(fundId, navValue)
7. POST  to chain: updateFXRates(rates[])
8. TRIGGER: processOrders()
9. LOG   ServiceExecution record (Section 4.10)
```

### 9.2 What On-Chain Handles (Not NAV Service)

| Function | Why On-Chain |
|----------|-------------|
| Dilution factor computation | Programmatic, deterministic |
| Class-specific cost adjustments | Auditable, immutable |
| Performance fee HWM tracking | Series accounting integrity |
| Management fee accrual | Time-based, deterministic |
| Pro-rata P&L allocation | Dilution cascade math |
| Order processing & settlement | Atomic, auditable |

---

## 10. Derived Data Catalog

These data points are **computed, not stored**. The source of truth is always the blockchain or Haruko. They can be regenerated at any time.

| Derived Data | Inputs | Computation | Granularity | Freshness |
|-------------|--------|-------------|-------------|-----------|
| Fund price | NAV, totalSupply | `calculateFundPrice()` on-chain | Per fund | Real-time (any block) |
| Adjusted fund price | Fund price, fund dilutionRatio | `calculateFundPrice()` on-chain | Per fund | Real-time |
| Class price | Adjusted fund price, class dilutionRatio | `calculateClassPrice()` on-chain | Per class | Real-time |
| Dealing price | Class price, dealing dilutionRatio | `calculateDealingPrice()` on-chain | Per dealing | Real-time |
| Denominated class price | Class price, FX rate | `calculateClassPriceInDenomination()` on-chain | Per class | Real-time |
| Investor portfolio | `balanceOf()` × price, all token IDs | API aggregation | Per investor | On-demand |
| Fund AuM | totalSupply × fundPrice | Computed | Per fund | Real-time |
| Trial balance | Mint/burn/transfer history | Derived view: mint=credit, burn=debit | Per fund | On-demand |
| Fee waterfall | feeHistory + adjustments | `getClassAuditTrail()` on-chain | Per class | Real-time |
| TWRR per investor | Order history + price history at order blocks | Computed by reporting service | Per investor | Cached daily |
| MWRR per investor | Cash flows + valuations | Computed by reporting service | Per investor | Cached daily |
| Share register | On-chain balances + off-chain investor profiles | Derived view | Per fund | On-demand |
| Investor statement | Portfolio + orders + fees + performance for period | Assembled by report generator | Per investor per period | Cached per ReportRun |
| Performance attribution | Dilution ratio changes decomposed by source | Computed from feeHistory + adjustments | Per class | On-demand |
| Cash flow summary | Order amounts by type per period | Aggregated from order processingHistory | Per fund | On-demand |

**Share register** (derived view required by Irish Unit Trusts Act): Combines on-chain `balanceOf()` per investor per tokenId with off-chain investor name, address, and acquisition dates from transfer history. No separate stored entity — this is a JOIN between chain state and off-chain investor profiles.

---

## 11. Data Lineage

Every financial value in Elysium has a **traceable computation path** with citable block numbers. This is architecturally superior to incumbent black-box calculators.

### 11.1 NAV → Price Chain

```
Haruko GAV (captured in HarukoSnapshot)
    ↓ NAV Service combines + posts
updateNav(fundId, navValue) → stored at block N
    ↓
fundPrice = nav × PRECISION / fundTotalSupply                    [block N, verifiable]
    ↓
adjustedFundPrice = fundPrice × PRECISION / fundDilutionRatio    [block N, verifiable]
    ↓ (per class)
classPrice = adjustedFundPrice × PRECISION / classDilutionRatio  [block N, verifiable]
    ↓ (per dealing)
dealingPrice = classPrice × PRECISION / dealingDilutionRatio     [block N, verifiable]
    ↓ (with FX)
denominatedPrice = classPrice × fxRate / PRECISION               [block N, verifiable]
```

Every step: **independently verifiable** via `eth_call` at block N. No trust required in any intermediate system.

### 11.2 Fee Lineage

```
Management fee:
  mgmtFeeRate (per class, stored at config block) ×
  timeElapsed (lastMgmtFeeMintTs → current) ×
  classTotalSupply →
  fee tokens minted → dilutionRatio updated
  Recorded in feeHistory[classId] with block number

Performance fee:
  dealingPrice at current block vs HWM →
  if price > HWM: fee = (price - HWM) × perfFeeRate × dealingTotalSupply →
  fee tokens minted → dealingDilutionRatio updated
  Recorded in redemptionFeeHistory[dealingId] with block number

Adjustment:
  postAdjustments(fundId, adjustments[]) → pending queue →
  applied during processOrders() → classDilutionRatio updated
  Recorded in appliedAdjustmentHistory[classId] with block number
```

### 11.3 Error Correction Lineage

```
Original value at block N (preserved on-chain, never overwritten)
    ↓ error_engine detects error
CorrectionRun created (off-chain, references original block)
    ↓ error_engine posts correction
Corrected value at block M (new on-chain transaction)
    ↓ downstream recalculation
All dependent values recomputed from block N to current
    ↓ investor impact
CompensationLedger created with per-investor entries
```

Both original and corrected values remain on-chain — full lineage, not overwrite.

---

## 12. Cache & Materialized Views

**Phase 2 — not needed at MVP scale (10-50 funds, 500-5,000 investors).**

Cache tables store pre-computed aggregates to avoid expensive multi-block on-chain queries. Always rebuildable from chain. Invalidated when error corrections affect source data.

| Cache Entity | Source | Refresh Trigger | Invalidation |
|-------------|--------|----------------|--------------|
| `InvestorHoldingSnapshot` | On-chain balances × prices | Daily / on-demand | NAV update, error correction |
| `FundPerformanceCache` | On-chain prices + flows | Daily | NAV update, error correction |
| `FeeReportCache` | On-chain fee/adjustment history | Daily | Fee mint, adjustment, error correction |

All cache records reference `as_of_block` for verifiability against chain state.

---

## 13. Multi-Tenancy Model

**`ManagementCompany`:**

| Field | Type | Description |
|-------|------|-------------|
| `id` | UUID | Identifier |
| `name` | string | Company name |
| `jurisdiction` | string | Incorporation jurisdiction |
| `regulatory_status` | string | License type/number |
| `on_chain_manager_addresses` | string[] | Linked on-chain addresses |
| `onboarded_at` | timestamp | Platform onboarding date |
| `status` | enum | ACTIVE, SUSPENDED, OFFBOARDED |

**Enforcement:**
- Every off-chain entity carries `management_company_id` (FK)
- PostgreSQL Row Level Security (RLS) policies enforce isolation
- Cerbos policies include `management_company_id` in resource context
- S3 objects prefixed by management company ID
- On-chain isolation via `manager` address per fund (natural multi-tenancy)

Even with a single client at MVP, the schema includes `management_company_id` on all tables to avoid a painful retrofit later.

---

## 14. Regulatory Mapping

Every data entity mapped to the regulation that requires it. Enables rapid response to regulatory inspections: "show me how you comply with X" → point to entity.

### 14.1 BVI (Fund Domicile)

| Regulation | Required Entities |
|-----------|-------------------|
| SIBA 2010 (Securities and Investment Business Act) | FundInfo, ClassInfo, UmbrellaFund, FundMetadata |
| BVI AML Regulations 2008 | KYCRecord, SanctionsScreening, **SuspiciousActivityReport**, BeneficialOwnership |
| BVI Business Companies Act | ManagementCompany, ContractInstance (formation docs) |
| CRS (signed 2017) | TaxRecord, RegulatoryReport (FATCA_CRS) |

### 14.2 Ireland (Fund Admin Jurisdiction)

| Regulation | Required Entities |
|-----------|-------------------|
| CBI Fund Administration Guidance | **HarukoSnapshot** (independent records), ServiceExecution (process oversight), ReconciliationResult, ReportRun, **DataChangeEntry** |
| Criminal Justice Act 2010 (AML) | KYCRecord, SanctionsScreening, **SuspiciousActivityReport** |
| CP86 (Fund Management Company) | **OutsourcingArrangement**, BoardRecords, ComplianceRegisters |
| GDPR | **InvestorConsent**, AccessAuditLog (CloudWatch), **DataChangeEntry**, InvestorProfile (encrypted PII) |
| AIFMD | RegulatoryReport (AIFMD_ANNEX_IV), HarukoSnapshot (risk metrics) |
| Irish Unit Trusts Act 1990 | Share Register (derived view — see Section 10) |
| Investment Funds Companies Act 2005 | FundMetadata, ContractInstance |

### 14.3 Phase 2 Regulatory Extensions

| Regulation | Required Entities | Trigger |
|-----------|-------------------|---------|
| MiFID II (EU distribution) | **SuitabilityAssessment** | Distributing to EU retail |
| PRIIPs (EU) | Document (KID type) | Distributing PRIIPs to EU retail |
| FATCA (US) | TaxRecord (W-8BEN/W-9) | US investors |
| UK FCA | All of Ireland + UK-specific | UK distribution |
| Luxembourg (CSSF) | All of Ireland + CSSF-specific | LU fund domicile |
| Cayman (CIMA) | RegulatoryReport (CAYMAN_FAR) | KY fund domicile |

### 14.4 Data Retention Requirements

| Jurisdiction | Retention Period | Applies To |
|-------------|-----------------|------------|
| Ireland | 6 years post fund termination | All off-chain fund admin records |
| BVI | 5 years post fund termination | AML records, fund records |
| GDPR | Until purpose fulfilled + legal obligation | Investor PII (erasure on request unless legal basis) |
| On-chain | Permanent | All on-chain data (blockchain-native) |

---

## 15. Scope Exclusions

Deliberately out of scope, with rationale:

| Excluded Feature | Reason | Impact |
|-----------------|--------|--------|
| **Partnership accounting** | Elysium uses tokenized fund shares, not partnership interests. Capital accounts, allocations, draws, clawback are partnership constructs. | None — different product type |
| **Multi-GAAP** | Fund produces one set of financials. GAAP presentation (IFRS vs US GAAP) is a report formatting concern, not a data model concern. | Report template variation |
| **Corporate actions on underlying assets** | Stock splits, mergers, dividends on held assets are Haruko's domain (portfolio management). | Haruko integration |
| **Traditional asset data** | Equities, bonds, derivatives pricing requires Bloomberg/IB. Elysium targets digital assets via Haruko. | Haruko + price feeds |
| **Trade execution** | Elysium administers funds, it doesn't execute trades. Haruko + direct exchange integrations handle execution. | Integration concern |
| **Carried interest / PE waterfall** | Private equity fund economics (preferred return, catch-up, clawback) are structurally different from open-ended fund accounting. | Could be Phase 3 if PE funds targeted |

**Side pockets** are in scope as an architectural PATTERN: a side pocket is modeled as a separate share class with `status = RETIRED` (no new subscriptions) and independent NAV. No additional data model entity required.

**Fund mergers / conversions** are handled operationally: redeem-all from source → subscribe-all to target at conversion ratio. A `FundEvent` marker (type = MERGER, CONVERSION) in `ProcessAttachment` tracks that these were administrative actions, not investor-initiated.

---

## 16. Schema Evolution Strategy

### 16.1 On-Chain Evolution

- **Diamond Proxy (EIP-2535):** Facets can be added, replaced, or removed without migrating storage
- **AppStorage slot 0:** New fields appended to end of structs. Never reorder or remove existing fields.
- **New storage namespaces:** Add at new slots (e.g., `s.NewFeature[0]`) for clean separation
- **Backward compatibility:** View functions maintain stable interfaces. New return fields added as additional return values.

### 16.2 Off-Chain Evolution

- **Prisma migrations:** Schema changes via Prisma Migrate with zero-downtime deploy
- **Expand-contract pattern:** Add new column (nullable) → migrate data → make non-null → remove old column
- **jsonb flexibility:** Fields like `input_summary`, `output_summary`, `parameters`, `metadata` absorb new data without schema changes
- **Enum extension:** New enum values added via migration. Existing values never removed or renamed.

### 16.3 Cross-Reference Stability

- **On-chain ID scheme (uint16):** Stable interface. Max 65,535 funds per deployment — sufficient for years.
- **Cross-platform identity map:** Absorbs new platform integrations without schema changes (new `platform` enum value + mapping row).
- **UUID off-chain:** No sequential dependency, safe to merge across deployments.

---

## 17. Data Source Summary

### 17.1 Where Each Data Domain Lives

| Domain | Source of Truth | Storage | Historical | Auth |
|--------|---------------|---------|-----------|------|
| Fund structure & config | **On-chain** | Avalanche Subnet | Any block | Cerbos + on-chain |
| Share classes & dealings | **On-chain** | Avalanche Subnet | Any block | Cerbos + on-chain |
| Token holdings & transfers | **On-chain** | Avalanche Subnet | Any block | Cerbos + on-chain |
| Orders & settlement | **On-chain** | Avalanche Subnet | Any block | Cerbos + on-chain |
| Pricing (NAV, prices) | **On-chain** | Avalanche Subnet | Any block | Cerbos |
| Fees (mgmt, perf, adjustments) | **On-chain** | Avalanche Subnet | Any block | Cerbos |
| Multi-currency & FX rates | **On-chain** | Avalanche Subnet | Any block | Cerbos |
| Access control & roles | **On-chain** | Avalanche Subnet | Any block | On-chain + Cerbos |
| Investor eligibility flags | **On-chain** | Avalanche Subnet | Any block | On-chain |
| Portfolio positions & P&L | **Haruko** (cached in HarukoSnapshot) | Haruko API + PostgreSQL/S3 | Via Haruko + snapshots | Cerbos |
| Risk metrics | **Haruko** (cached in HarukoSnapshot) | Haruko API + PostgreSQL | Via Haruko + snapshots | Cerbos |
| Trade blotter | **Haruko** | Haruko API | Via Haruko | Cerbos |
| Shadow NAV (GAV) | **Haruko** (cached in HarukoSnapshot) | Haruko API + PostgreSQL | Via snapshots | Cerbos |
| User authentication | **Cognito** | AWS Cognito | Cognito logs | Cognito + Cerbos |
| Private signing keys | **AWS KMS** | AWS KMS | N/A | AWS IAM |
| API keys & credentials | **AWS Secrets Manager** | AWS | Versioned | AWS IAM |
| Investor PII | **Elysium DB** | PostgreSQL (encrypted) | DB + audit log | Cerbos (strictest) |
| KYC/AML records | **Elysium DB** + KYC provider | PostgreSQL | DB | Cerbos |
| Suspicious activity reports | **Elysium DB** | PostgreSQL (encrypted) | DB | Cerbos (MLRO only) |
| Documents (all types) | **S3** + DB metadata | S3 + PostgreSQL | Versioned in S3 | Cerbos (per-doc tier) |
| Cross-platform ID mappings | **Elysium DB** | PostgreSQL | DB | Cerbos |
| Bank accounts & routing | **Elysium DB** | PostgreSQL (encrypted) | DB | Cerbos (restricted) |
| Bank transactions | **Elysium DB** | PostgreSQL | DB | Cerbos |
| Legal contracts | **S3** + DB metadata | S3 + PostgreSQL | Versioned in S3 | Cerbos |
| Process attachments | **Elysium DB** | PostgreSQL | DB | Cerbos |
| Notifications & comms | **Elysium DB** | PostgreSQL | DB | Cerbos |
| Regulatory reports | **Elysium DB** + S3 | PostgreSQL + S3 | Versioned | Cerbos |
| Tax records | **Elysium DB** | PostgreSQL (encrypted) | DB | Cerbos (restricted) |
| Invoices & billing | **Elysium DB** | PostgreSQL | DB | Cerbos |
| Reconciliation results | **Elysium DB** | PostgreSQL | DB | Cerbos |
| Compliance & governance | **Elysium DB** | PostgreSQL | DB | Cerbos |
| Service execution tracking | **Elysium DB** | PostgreSQL | DB | Cerbos |
| Error corrections & compensation | **Elysium DB** + on-chain | PostgreSQL + Avalanche | DB + chain | Cerbos (restricted) |
| Access audit log | **CloudWatch Logs** | CloudWatch → S3 | Log retention | System-only |
| Mutation audit log | **Elysium DB** | PostgreSQL | DB | Cerbos (restricted) |
| Report lifecycle | **Elysium DB** + S3 | PostgreSQL + S3 | DB | Cerbos |
| Dealing schedule rules | **Elysium DB** | PostgreSQL (versioned) | DB | Cerbos |
| Haruko snapshots | **Elysium DB** + S3 | PostgreSQL + S3 | DB + S3 | Cerbos |
| Consent records | **Elysium DB** | PostgreSQL | DB | Cerbos (restricted) |
| Outsourcing register | **Elysium DB** | PostgreSQL | DB | Cerbos |
| Fund metadata | **Elysium DB** | PostgreSQL | DB | Cerbos |
| Management companies | **Elysium DB** | PostgreSQL | DB | Cerbos (admin) |
| Wallet mappings | **Elysium DB** | PostgreSQL | DB | Cerbos |

### 17.2 Scale Estimates (Day-One Target)

| Metric | Estimate | Scaling Factor |
|--------|----------|---------------|
| Management companies | 1-5 | Per contract |
| Funds | 10-50 | Per manager |
| Share classes | 50-200 | 2-5 per fund |
| Investors | 500-5,000 | Per fund: 50-500 |
| Orders per month | 1,000-10,000 | Dealing frequency × investors |
| Documents | 10,000+ | ~20 per fund per year + per investor |
| Cross-platform mappings | 500-2,000 | ~10 per fund + ~2 per investor |
| Haruko API calls/day | 100-1,000 | Per fund: ~20 calls/day |
| On-chain transactions/day | 50-500 | NAV updates + order processing |
| HarukoSnapshots/day | 10-50 | ~1 per fund per NAV cycle |
| ServiceExecutions/day | 50-200 | ~4-5 services × 10-50 funds |
| BankTransactions/month | 500-5,000 | ~1 per settlement instruction |
| Access audit entries/day | 10,000-100,000 | Every API request (CloudWatch) |
| DataChangeEntries/day | 100-1,000 | Mutations only (PostgreSQL) |

### 17.3 Change Characteristics

| Change Type | Deploy Required? | Propagation |
|-------------|-----------------|-------------|
| Restrict/open access to existing data | **No** — Cerbos policy only | Immediate |
| New blockchain view attribute for auth | **No** — attribute registry + policy | Hot-reload |
| New off-chain entity | **Yes** — Prisma migration | Full deploy |
| New Haruko data source | **No** — config + policy | Hot-reload |
| New external platform integration | **Yes** — integration code + enum | Full deploy |
| New document type | **No** — enum value + policy | Small deploy |
| New regulatory report type | **Yes** — report generator code | Full deploy |
| New management company (tenant) | **No** — data insert | Immediate |
| New service type in ServiceExecution | **No** — enum value | Small deploy |
| New cache/materialized view | **Yes** — table + compute service | Full deploy |
