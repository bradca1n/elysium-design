# Elysium Data Model

> Comprehensive map of all data in the Elysium platform — where it lives, what it contains, and how sources relate. Covers on-chain state (smart contracts), external portfolio data (Haruko), off-chain business data (PostgreSQL + S3), and external services (AWS KMS, Cognito, Secrets Manager).
>
> Date: 2026-02-12

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
10. [Data Source Summary](#10-data-source-summary)

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
│  │  KYC Provider  ·  Banks  ·  Custodians  ·  Exchanges        │  │
│  └──────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────┘
```

**Key architectural properties:**

- **On-chain is temporally complete:** Every piece of on-chain state is queryable at any historical block via `eth_call`. Config change block arrays enable precise reconstruction of fund/class/account state at any point in time. The blockchain is a complete time-series database of all financial data.
- **On-chain is both storage and compute:** Dilution ratios, class prices, dealing prices, fee accruals — all computed on-chain via view functions. The chain is the fund accounting engine, not just a ledger.
- **Haruko is read-only:** Master API key, post-filtered by authorization. Elysium never writes to Haruko.
- **Off-chain owns PII and processes:** Investor identity, compliance, legal documents, and business workflows live off-chain. On-chain stores only anonymized flags (KYC verified, accredited, jurisdiction code).
- **Credentials never in DB:** API keys, signing keys, and secrets live in AWS Secrets Manager / KMS. The database stores only ARN references.
- **Authorization can use any data:** Cerbos policies can reference data from any source for access decisions (see Authorization_Review.md).

---

## 2. On-Chain Data Model

**Infrastructure:** Diamond Proxy (EIP-2535), 16 facets, ~40 storage mappings, 35+ view functions, ERC1155 token standard.

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
| `perfFeeCalculator` | address | Performance fee calculator contract |
| `noticePeriod` | uint32 | Notice period (seconds) |
| `lockPeriod` | uint32 | Lock period (seconds) |
| `hurdleFundNum` | uint16 | Hurdle fund number (0 = none) |
| `denominationCurrency` | uint16 | ISO 4217 investor-facing currency |
| `createdAt` | uint32 | Creation timestamp |

**Eligibility Rules (enforced on transfers):**

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

**Hierarchical holdings index:** Per-account tracking at umbrella → fund → class → dealing levels via `HierarchicalIndexedHoldings` struct. Enables efficient portfolio queries at any granularity.

### 2.4 Orders

#### Order

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

**User order tracking:** `userOrderIndices[user]` → packed (fundId, orderId) pairs for efficient portfolio-wide order queries.

### 2.5 Pricing & NAV

All prices are **computed on-chain** via view functions:

```
fundPrice = nav × PRECISION / fundTotalSupply
adjustedFundPrice = fundPrice × PRECISION / fundDilution
classPrice = adjustedFundPrice × PRECISION / classDilution
dealingPrice = classPrice × PRECISION / dealingDilution
classPriceInDenomination = classPrice × fxRate(fundCurrency → classCurrency) / PRECISION
```

Key view functions: `calculateFundPrice()`, `calculateClassPrice()`, `calculateClassPriceInDenomination()`, `calculateDealingPrice()`, `getFundPriceHistory()`.

Historical prices queryable at any block via `eth_call` + stored block number arrays.

### 2.6 Fees

**Management fees:** Dilution-based minting. Accrued continuously, minted at each NAV update. Rate stored per class (`mgmtFeeRate`). History in `feeHistory[classId]` → `FeeMint[]` (amount, blockNumber).

**Performance fees:** Per-dealing high water mark (HWM). Computed via external calculator contract. History in `redemptionFeeHistory[dealingId]` → `FeeMint[]`.

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

Pending adjustments queue (max 100 per fund) with `PendingAdjustment` struct: classId, signed amount, label, externalRef, postedAt, postedBlock. Applied adjustment history per class with block numbers for audit trail.

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

### 2.8 Access Control & Accounts

**Roles:**

| Role | Scope | Purpose |
|------|-------|---------|
| ROLE_USER | Global | Any valid account |
| ROLE_ADMIN | Global | Platform administration |
| ROLE_MANAGER | Per-fund | Fund management (stored in `funds[fundId].manager`) |
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

---

## 3. Haruko Data Model

Haruko is a digital asset portfolio management system that aggregates data across 100+ CEXs, custodians, and 250+ DeFi protocols. Elysium uses a **master API key** — all data is post-filtered by authorization before reaching clients.

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

- Share class accounting, investor-level accounting, fee waterfalls
- Transfer agency (subscriptions, redemptions)
- Smart contract interaction
- Traditional asset data (equities, bonds — would need Bloomberg/IB)
- Investor identity, compliance, regulatory reporting
- Legal documents, contracts

---

## 4. Off-Chain Data Model

Everything that is PII, regulatory, operational, or relational that doesn't belong on-chain or in Haruko. Stored in **PostgreSQL** (structured data) and **S3** (documents, generated files).

### 4.1 Investor Identity & PII

> PII split: authentication data in Cognito, business PII in Elysium DB. See Section 5.1 for boundary.

**Investor Profile (Elysium DB):**

| Field | Type | Description |
|-------|------|-------------|
| `id` | UUID | Internal identifier |
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

**KYC Documents (metadata in DB, files in S3):**

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
| Financial statements | RESTRICTED | Per-period accounting |

**Investor Documents:**

| Document Type | Access Tier | Description |
|--------------|-------------|-------------|
| Contract note | PRIVATE | Per-transaction confirmation |
| Statement | PRIVATE | Periodic holding statement |
| Tax certificate | PRIVATE | Annual tax documentation |
| Distribution notice | PRIVATE | Income distribution details |
| Redemption confirmation | PRIVATE | Settlement confirmation |

**Document metadata entity:**

| Field | Type | Description |
|-------|------|-------------|
| `id` | UUID | Document identifier |
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

### 4.4 Communications & Social

**Notifications:**

| Field | Type | Description |
|-------|------|-------------|
| `id` | UUID | Notification identifier |
| `recipient_id` | UUID | Target user |
| `type` | enum | ORDER_CONFIRMED, NAV_UPDATED, COMPLIANCE_ALERT, DOCUMENT_AVAILABLE, ... |
| `channel` | enum | IN_APP, EMAIL, SMS |
| `title` | string | Notification title |
| `body` | text | Notification content |
| `entity_ref` | jsonb? | Related entity (fund, order, document) |
| `sent_at` | timestamp | Send time |
| `read_at` | timestamp? | Read time |

**Manager-Investor Communications:**

| Field | Type | Description |
|-------|------|-------------|
| `id` | UUID | Message identifier |
| `thread_id` | UUID | Conversation thread |
| `sender_id` | UUID | Sender |
| `recipient_ids` | UUID[] | Recipients (individual or fund-wide) |
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
| `entity_ref` | jsonb? | Related entity (fund for holding shares) |
| `permissions` | jsonb | What the relationship grants |
| `created_at` | timestamp | Creation date |
| `status` | enum | PENDING, ACTIVE, REVOKED |

### 4.5 Operations & Reconciliation

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
| `status` | enum | PENDING, INSTRUCTED, SETTLED, FAILED |
| `instructed_at` | timestamp? | When instruction sent |
| `settled_at` | timestamp? | When confirmed |

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

**Fund-Submitted Invoices (Third parties → Fund, for class-specific cost allocation):**

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
| `on_chain_ref` | string? | On-chain adjustment tx hash after posting |

### 4.9 Compliance & Governance

| Entity | Key Fields | Description |
|--------|-----------|-------------|
| **Complaint register** | investor, description, received_at, acknowledged_at (5-day SLA), resolved_at (40-day SLA), resolution | Regulatory requirement |
| **Breach log** | fund, restriction_type, breach_description, detected_at, remediation, reported_to_regulator | Investment restriction violations |
| **Board records** | fund, meeting_date, attendees, minutes_doc_id, resolutions | Board meeting documentation |

---

## 5. External Services

### 5.1 AWS Cognito / Amplify (Authentication)

**What lives in Cognito:**

| Attribute | Description |
|-----------|-------------|
| `sub` | Unique user identifier (UUID) |
| `email` | Login email |
| `phone_number` | Phone (for MFA) |
| `name` | Display name |
| `custom:role` | Platform role (admin, manager, investor) |
| `groups` | Cognito group memberships |

**What does NOT live in Cognito** (lives in Elysium DB instead): legal name, DOB, nationality, residential address, passport number, tax residency, source of wealth, KYC records.

**Boundary principle:** Cognito stores what's needed for authentication and basic session claims. Business PII that's only needed during specific workflows (KYC, reporting, tax) lives in the Elysium database under encryption.

### 5.2 AWS KMS / Secrets Manager (Key Management)

**KMS — Signing Keys:**

| Data | Description |
|------|-------------|
| Per-user private key | Generated at registration for private chain operations |
| Key never leaves AWS | Signing happens via KMS `Sign` API |
| Key rotation policy | Per-user, configurable |
| Audit trail | CloudTrail logs every signing operation |

**Secrets Manager — API Credentials:**

| Data | Description |
|------|-------------|
| Haruko API key | Master key for portfolio data |
| Exchange API keys | Per-fund, per-exchange (stored by ARN reference in DB) |
| Custodian API keys | Per-fund, per-custodian |
| Bank API credentials | If programmatic banking integration |
| KYC provider API key | For automated screening |

**Security invariant:** The Elysium database never stores secrets directly. It stores AWS Secrets Manager ARN references. Retrieval requires AWS IAM authorization.

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
| `verified_at` | timestamp | When ownership was verified |
| `is_primary` | bool | Primary wallet for this type |

---

## 6. Cross-Platform Identity Map

Every entity in Elysium exists on multiple platforms with different IDs, account structures, and access credentials. This is the integration backbone.

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

Each platform has its own entity IDs, authentication, and API structure. The cross-platform identity map connects them.

### 6.2 Entity Mapping

**Core mapping table:**

| Field | Type | Description |
|-------|------|-------------|
| `id` | UUID | Mapping record |
| `entity_type` | enum | FUND, MANAGER, INVESTOR, UMBRELLA |
| `entity_id` | UUID | Elysium internal ID |
| `platform` | enum | ON_CHAIN, HARUKO, BITGO, FIREBLOCKS, BINANCE, OKX, BANK, ... |
| `platform_entity_id` | string | ID on that platform |
| `platform_account_type` | string | "trading", "custody", "settlement", "view_only" |
| `credentials_ref` | string? | AWS Secrets Manager ARN for API keys |
| `chain_id` | int? | For blockchain addresses — which chain |
| `currency` | string? | For bank accounts — account currency |
| `is_active` | bool | Active / deactivated |
| `verified_at` | timestamp | When mapping was verified |
| `metadata` | jsonb | Platform-specific data |

### 6.3 Fund-Level Mapping

```
Elysium Fund (on-chain uint16 + off-chain UUID)
  ├── Haruko Portfolio ID
  ├── Custodian Accounts (per custodian — BitGo, Fireblocks, etc.)
  │     └── API credentials (AWS Secrets Manager ARN)
  ├── Exchange Accounts (per exchange — Binance, OKX, etc.)
  │     └── API key + secret (AWS Secrets Manager ARN)
  │     └── Sub-account ID
  ├── Bank Accounts (per currency)
  │     ├── IBAN / account number
  │     ├── Bank routing (SWIFT, sort code)
  │     └── Account holder name
  └── Blockchain Addresses (deposit addresses per chain)
```

### 6.4 Manager-Level Mapping

```
Elysium Manager (Cognito user + DB profile)
  ├── Haruko User ID (API access to their portfolios)
  ├── Custodian Portal Logins (per custodian)
  ├── Exchange Sub-Account Admin (per exchange)
  ├── Bank Signatory (authorized signer on fund bank accounts)
  └── On-chain address (ROLE_MANAGER on specific funds)
```

### 6.5 Investor-Level Mapping

```
Elysium Investor (Cognito user + DB profile)
  ├── Public wallet address (deposits/withdrawals)
  ├── Private chain wallet (AWS KMS, for on-chain operations)
  ├── Bank Account (fiat subscriptions/redemptions)
  │     └── Verified via bank detail change controls
  └── Custodian Sub-Account (rare — only if direct custody)
```

### 6.6 Bank Account Entity

| Field | Type | Description |
|-------|------|-------------|
| `id` | UUID | Account identifier |
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
| `is_primary` | bool | Primary account for this currency |

---

## 7. Off-Chain Process Attachments

On-chain events have corresponding off-chain workflows. These track the process state and required artifacts.

### 7.1 Event-Process Mapping

| On-Chain Event | Off-Chain Process | Required Artifacts |
|---------------|-------------------|--------------------|
| **Fund created** | Legal entity formation, regulatory registration, admin contract signing | Formation docs, regulatory filing, signed admin agreement |
| **Share class added** | Supplement drafted, compliance review, board approval | Supplement, board resolution, compliance sign-off |
| **Class config changed** | Amendment to supplement, investor notification (30-90 days) | Amendment doc, notification records, acknowledgments |
| **Order placed** (subscription) | KYC check, source of funds verification, AML screening | KYC report, SoF declaration, screening results |
| **Order settled** | Contract note generation, statement update | Contract note PDF, updated statement |
| **Fund → RETIRED** | Soft close notice, regulatory notification | Notice letter, filing confirmation |
| **Fund → CLOSED** | Final NAV, liquidation, deregistration, record retention | Final accounts, liquidation report, deregistration filing |
| **Investor onboarded** | KYC/AML workflow, eligibility assessment | KYC docs, assessment result, welcome pack |
| **Manager onboarded** | Platform contract, compliance check | Signed admin agreement, compliance review |

### 7.2 Process Attachment Entity

| Field | Type | Description |
|-------|------|-------------|
| `id` | UUID | Process identifier |
| `on_chain_event_type` | enum | FUND_CREATED, CLASS_ADDED, ORDER_PLACED, ... |
| `on_chain_ref` | string | Transaction hash or (fundId, blockNumber) |
| `entity_type` | enum | FUND, CLASS, ORDER, INVESTOR, MANAGER |
| `entity_id` | UUID | Related entity |
| `process_status` | enum | PENDING, IN_PROGRESS, COMPLETED, BLOCKED |
| `required_artifacts` | string[] | List of required document types |
| `completed_artifacts` | UUID[] | References to uploaded documents |
| `assigned_to` | UUID? | Person responsible |
| `due_date` | timestamp? | Deadline |
| `completed_at` | timestamp? | Completion date |
| `notes` | text? | Process notes |

---

## 8. Contracts & Legal

Three categories of contracts, managed via a composable modular template system.

### 8.1 Platform Contracts (Elysium ↔ Managers/Funds)

| Contract Type | Parties | Key Terms |
|--------------|---------|-----------|
| Administration agreement | Elysium ↔ Fund | Core service contract, scope, responsibilities |
| Fee schedule | Elysium ↔ Fund/Manager | What Elysium charges (AuM-based, flat, hybrid) |
| SLA terms | Elysium ↔ Fund | NAV delivery times, recon frequency, uptime |
| Data processing agreement | Elysium ↔ Fund | GDPR compliance |
| Onboarding terms | Elysium ↔ Manager | Platform access, acceptable use |

### 8.2 Investor Contracts

| Contract Type | Parties | Key Terms |
|--------------|---------|-----------|
| Subscription agreement | Investor ↔ Fund | Per fund/class, investment terms |
| Side letter | Investor ↔ Fund | Bespoke terms for large investors |
| Power of attorney | Investor ↔ Delegate | Delegation of investment authority |
| NDA | Investor ↔ Fund | For non-public fund information |

### 8.3 Vendor Contracts (Elysium ↔ Service Providers)

| Vendor | Service | Key Terms |
|--------|---------|-----------|
| Haruko | Portfolio management system | API access, data rights, SLA |
| AWS | Infrastructure, KMS, hosting | Service terms, pricing |
| Avalcloud / Ava Labs | Blockchain hosting (Avalanche subnet) | Validator SLA, pricing |
| KYC provider | Identity verification | Per-check pricing, data retention |
| External auditor | Fund audit | Engagement letter, scope, fees |
| Legal counsel | Fund legal work | Retainer, scope, jurisdiction |

### 8.4 Composable Contract Template System

Managers configure contracts on the website by selecting modules and filling parameters. The system assembles a complete legal document.

| Field | Type | Description |
|-------|------|-------------|
| `id` | UUID | Template identifier |
| `template_type` | enum | ADMIN_AGREEMENT, SUBSCRIPTION, SIDE_LETTER, VENDOR, FEE_SCHEDULE, ... |
| `version` | int | Template version |
| `modules` | jsonb | Composable sections (fee schedule, SLA, jurisdiction clauses, ...) |
| `variables` | jsonb | Configurable parameters (fund name, fee %, dates, ...) |
| `status` | enum | DRAFT, REVIEW, SIGNED, ACTIVE, TERMINATED |

**Contract instance (generated from template):**

| Field | Type | Description |
|-------|------|-------------|
| `id` | UUID | Contract instance |
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
| `terminated_at` | timestamp? | Early termination date |
| `termination_reason` | text? | Reason for termination |

---

## 9. Middleware — NAV Service

The NAV Service is a **data combiner + transaction poster**. It reads from Haruko and on-chain, combines into a fund-level NAV figure, and posts transactions to the smart contract. It does not compute dilution, class adjustments, or fees — those are on-chain.

### 9.1 What It Does

```
1. READ  Haruko: fund-level GAV, positions, P&L, cash balances
2. READ  On-chain: current NAV, dilution ratios, class configs, pending adjustments
3. READ  External FX source: current exchange rates
4. COMBINE into fund-level NAV figure
5. POST  to chain: updateNav(fundId, navValue)
6. POST  to chain: updateFXRates(rates[])
7. TRIGGER: processOrders()
```

### 9.2 What It Does NOT Do (On-Chain Handles)

| Function | Where It Runs | Why On-Chain |
|----------|--------------|-------------|
| Dilution factor computation | Smart contract | Programmatic, deterministic |
| Class-specific cost adjustments | Smart contract (postAdjustments) | Auditable, immutable |
| Performance fee HWM tracking | Smart contract (per-dealing) | Series accounting integrity |
| Management fee accrual | Smart contract (mintManagementFees) | Time-based, deterministic |
| Pro-rata P&L allocation | Smart contract (dilution cascade) | Fund → class → dealing math |
| Order processing & settlement | Smart contract (processOrders) | Atomic, auditable |

### 9.3 Data Flow

```
Haruko API ──→ ┐
               ├──→ NAV Service ──→ Smart Contract
On-chain   ──→ ┘      │
FX Source  ──→────────→│
                       │
               updateNav()
               updateFXRates()
               processOrders()
```

---

## 10. Data Source Summary

### 10.1 Where Each Data Domain Lives

| Domain | Source of Truth | Historical | Authorization |
|--------|---------------|-----------|---------------|
| Fund structure & config | **On-chain** | Any block (eth_call) | Cerbos + on-chain roles |
| Share classes & dealings | **On-chain** | Any block | Cerbos + on-chain eligibility |
| Token holdings & transfers | **On-chain** | Any block | Cerbos + on-chain balances |
| Orders & settlement | **On-chain** | Any block | Cerbos + on-chain order state |
| Pricing (NAV, fund/class/dealing) | **On-chain** | Any block | Cerbos |
| Fees (management, performance) | **On-chain** | Any block | Cerbos |
| Class-specific cost adjustments | **On-chain** | Any block | Cerbos |
| Multi-currency & FX rates | **On-chain** | Any block | Cerbos |
| Access control & roles | **On-chain** | Any block | On-chain + Cerbos |
| Investor eligibility flags | **On-chain** | Any block | On-chain (enforced on transfer) |
| Portfolio positions & P&L | **Haruko** | Via Haruko API | Cerbos + Haruko master key |
| Risk metrics | **Haruko** | Via Haruko API | Cerbos |
| Trade blotter | **Haruko** | Via Haruko API | Cerbos |
| Asset prices | **Haruko** + price feeds | Via Haruko API | Cerbos |
| Shadow NAV (GAV) | **Haruko** | Via Haruko API | Cerbos |
| User authentication | **Cognito** | Cognito logs | Cognito + Cerbos |
| Private signing keys | **AWS KMS** | N/A (signing only) | AWS IAM |
| API keys & credentials | **AWS Secrets Manager** | Versioned | AWS IAM |
| Investor PII | **Elysium DB** | DB + audit log | Cerbos (strictest tier) |
| KYC/AML records | **Elysium DB** + KYC provider | DB | Cerbos |
| Documents (all types) | **S3** + DB metadata | Versioned in S3 | Cerbos (per-doc access tier) |
| Cross-platform ID mappings | **Elysium DB** | DB | Cerbos |
| Bank accounts & routing | **Elysium DB** | DB | Cerbos (restricted) |
| Legal contracts | **S3** + DB metadata | Versioned in S3 | Cerbos |
| Process attachments | **Elysium DB** | DB | Cerbos |
| Notifications & comms | **Elysium DB** | DB | Cerbos |
| Regulatory reports | **Elysium DB** + S3 | Versioned | Cerbos |
| Tax records | **Elysium DB** | DB | Cerbos (restricted) |
| Invoices & billing | **Elysium DB** | DB | Cerbos |
| Reconciliation results | **Elysium DB** | DB | Cerbos |
| Compliance & governance | **Elysium DB** | DB | Cerbos |
| Wallet mappings | **Elysium DB** | DB | Cerbos |

### 10.2 Change Characteristics

| Change Type | Deploy Required? | Propagation |
|-------------|-----------------|-------------|
| Restrict/open access to existing data | **No** — Cerbos policy only | Immediate |
| New blockchain view attribute for auth | **No** — attribute registry + policy | Hot-reload |
| New off-chain entity | **Yes** — schema migration + resolver | Full deploy |
| New Haruko data source | **No** — config + policy | Hot-reload |
| New external platform integration | **Yes** — integration code | Full deploy |
| New document type | **No** — enum value + policy | Small deploy |
| New regulatory report type | **Yes** — report generator code | Full deploy |

### 10.3 Scale Estimates (Day-One Target)

| Metric | Estimate | Scaling Factor |
|--------|----------|---------------|
| Funds | 10-50 | Per manager |
| Share classes | 50-200 | 2-5 per fund |
| Investors | 500-5,000 | Per fund: 50-500 |
| Orders per month | 1,000-10,000 | Dealing frequency × investors |
| Documents | 10,000+ | ~20 per fund per year + per investor |
| Cross-platform mappings | 500-2,000 | ~10 per fund + ~2 per investor |
| Haruko API calls/day | 100-1,000 | Per fund: ~20 calls/day |
| On-chain transactions/day | 50-500 | NAV updates + order processing |
