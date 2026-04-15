# Unified Abstract Data Model

> The domain entity model that sits **above** physical storage and naturally maps to GraphQL (query interface), Cerbos (authorization), and physical data sources.
>
> **Purpose:** One canonical entity catalog drives GraphQL schema, Cerbos policies, and resolver routing. No impedance mismatch between layers.
>
> Date: 2026-02-20 · References: [Data_Model_v2.md](./Data_Model_v2.md), [Authorization_System_V1.md](./Authorization_System_V1.md)

---

## Table of Contents

1. [Architecture: Three Layers](#1-architecture-three-layers)
2. [Design Principle: Triple Alignment](#2-design-principle-triple-alignment)
3. [Entity Catalog](#3-entity-catalog)
4. [Bounded Contexts](#4-bounded-contexts)
5. [Aggregate Roots & Relationships](#5-aggregate-roots--relationships)
6. [GraphQL Projection](#6-graphql-projection)
7. [Cerbos Projection](#7-cerbos-projection)
8. [Resolver Architecture](#8-resolver-architecture)
9. [Derived Roles](#9-derived-roles)
10. [Edge Cases & Solutions](#10-edge-cases--solutions)
11. [Query Walkthrough](#11-query-walkthrough)
12. [Entity Definitions](#12-entity-definitions)
13. [MVP Scope](#13-mvp-scope)

---

## 1. Architecture: Three Layers

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                     Layer 1: QUERY INTERFACE                                │
│                                                                             │
│  GraphQL Schema    ─────────────────────────────────────────────────────    │
│  ~35 types         Each type = domain entity. Fields include computed       │
│  ~19 with @key     fields resolved from any source transparently.          │
│                    Client sees ONE unified graph. Never knows about         │
│                    blockchain vs Postgres vs Haruko.                        │
├─────────────────────────────────────────────────────────────────────────────┤
│                     Layer 2: DOMAIN MODEL (this document)                   │
│                                                                             │
│  ~15 aggregate roots, ~35 entity types                                     │
│  Each entity field annotated with source: CHAIN | POSTGRES | HARUKO |      │
│  S3 | COGNITO | COMPUTED                                                   │
│                                                                             │
│  This layer IS the canonical model. GraphQL and Cerbos are projections     │
│  of it. Physical storage is an implementation detail beneath it.           │
│                                                                             │
│  DDD aggregate root = GraphQL entity type (@key) = Cerbos resource         │
├─────────────────────────────────────────────────────────────────────────────┤
│                     Layer 3: PHYSICAL SOURCES                               │
│                                                                             │
│  ┌────────────┐ ┌────────────┐ ┌────────────┐ ┌──────┐ ┌────────────────┐ │
│  │ Avalanche  │ │ PostgreSQL │ │   Haruko   │ │  S3  │ │ AWS (Cognito,  │ │
│  │  Subnet    │ │  (Prisma)  │ │   API      │ │      │ │  KMS, CW Logs) │ │
│  │            │ │            │ │            │ │      │ │                │ │
│  │ Fund acctg │ │ PII, KYC   │ │ Portfolio  │ │ Docs │ │ Auth, keys,    │ │
│  │ Tokens     │ │ Compliance │ │ Prices     │ │      │ │ access logs    │ │
│  │ Orders     │ │ Operations │ │ Risk       │ │      │ │                │ │
│  │ Fees, FX   │ │ Reports    │ │ Trades     │ │      │ │                │ │
│  └────────────┘ └────────────┘ └────────────┘ └──────┘ └────────────────┘ │
└─────────────────────────────────────────────────────────────────────────────┘
```

**The domain model is the anchor.** Everything else is a projection or an implementation:

| Concern | Relates to Domain Model as... |
|---------|-------------------------------|
| GraphQL schema | 1:1 projection of entity types + computed fields |
| Cerbos resources | Subset projection — aggregate roots only |
| Prisma schema | Physical storage for POSTGRES-sourced fields |
| Smart contract storage | Physical storage for CHAIN-sourced fields |
| Haruko API client | Physical access for HARUKO-sourced fields |
| DataLoaders | Batching + caching layer between domain and physical |

---

## 2. Design Principle: Triple Alignment

The architecture's power comes from a single invariant:

> **DDD Aggregate Root = GraphQL Entity Type = Cerbos Resource**

This means:

1. **One entity catalog** — not three separate schemas that must be kept in sync.
2. **Natural correspondence** — a "Fund" is the same concept whether you're querying it (GraphQL), authorizing access to it (Cerbos), or storing it (chain + Postgres).
3. **No mapping tables** — the entity name IS the GraphQL type name IS the Cerbos resource kind.

### Why aggregate roots, not every entity?

- **Cerbos resources** should be coarse-grained: you authorize access to a `Fund`, not to a `DilutionRatio`. The dilution ratio is a field ON a fund.
- **GraphQL entity types** (with `@key`) represent independently fetchable nodes. A `Dealing` can be fetched by ID; a `FeeMint` is always accessed through its parent `ShareClass`.
- **Aggregate roots** are the natural unit: they own child entities that don't exist independently.

### What about non-root entities?

Non-root entities (child value objects, embedded types) appear as:
- **GraphQL**: nested types WITHOUT `@key` (not independently resolvable)
- **Cerbos**: fields/attributes on the parent resource (not separate resources)
- **Storage**: fields, arrays, or sub-tables linked to the aggregate root

---

## 3. Entity Catalog

Every entity in the domain model, organized by bounded context. Source annotations tell resolvers where to fetch each field.

### Source Annotations

| Source | Meaning | Resolver |
|--------|---------|----------|
| `CHAIN` | Avalanche Subnet smart contract | `chainLoader` (multicall, block-pinned) |
| `POSTGRES` | Elysium PostgreSQL database | `prismaLoader` (Prisma ORM) |
| `HARUKO` | Haruko portfolio management API | `harukoLoader` (REST API) |
| `S3` | AWS S3 object storage | `s3Loader` (pre-signed URLs) |
| `COGNITO` | AWS Cognito user pool | `cognitoLoader` (JWT claims) |
| `COMPUTED` | Derived from other fields | Resolver function (no loader) |
| `CLOUDWATCH` | AWS CloudWatch Logs | Not exposed in GraphQL — admin tools only |

### Entity Summary Table

| Entity | Aggregate Root? | Primary Source | Cerbos Resource? | GraphQL @key? |
|--------|:-:|----------------|:-:|:-:|
| **Fund** | **Yes** | CHAIN + POSTGRES | **Yes** | **Yes** |
| **ShareClass** | **Yes** | CHAIN | **Yes** | **Yes** |
| **Dealing** | No (child of ShareClass) | CHAIN | No | No |
| **UmbrellaFund** | **Yes** | CHAIN | **Yes** | **Yes** |
| **Order** | **Yes** | CHAIN | **Yes** | **Yes** |
| **Account** | **Yes** | CHAIN + POSTGRES | **Yes** | **Yes** |
| **Investor** | **Yes** | POSTGRES + CHAIN | **Yes** | **Yes** |
| **TokenHolding** | No (computed) | CHAIN | No | No |
| **Currency** | No (reference) | CHAIN | No | No |
| **FXRate** | No (reference) | CHAIN | No | No |
| **Portfolio** | **Yes** | HARUKO | **Yes** | **Yes** |
| **Position** | No (child of Portfolio) | HARUKO | No | No |
| **RiskMetrics** | No (child of Portfolio) | HARUKO | No | No |
| **Document** | **Yes** | POSTGRES + S3 | **Yes** | **Yes** |
| **KYCRecord** | **Yes** | POSTGRES | **Yes** | **Yes** |
| **SanctionsScreening** | No (child of KYCRecord) | POSTGRES | No | No |
| **BeneficialOwnership** | No (child of KYCRecord) | POSTGRES | No | No |
| **SuspiciousActivityReport** | **Yes** | POSTGRES | **Yes** | **Yes** |
| **Contract** | **Yes** | POSTGRES + S3 | **Yes** | **Yes** |
| **SettlementInstruction** | **Yes** | POSTGRES | **Yes** | **Yes** |
| **BankAccount** | No (child of Account) | POSTGRES | No | No |
| **BankTransaction** | No (child of BankAccount) | POSTGRES | No | No |
| **ReconciliationResult** | No | POSTGRES | No | No |
| **Notification** | No | POSTGRES | No | No |
| **CommunicationThread** | No | POSTGRES | No | No |
| **Report** | **Yes** | POSTGRES + S3 | **Yes** | **Yes** |
| **RegulatoryReport** | No (child of Report) | POSTGRES + S3 | No | No |
| **ServiceExecution** | No (operational) | POSTGRES | No | No |
| **CorrectionRun** | **Yes** | POSTGRES | **Yes** | **Yes** |
| **CompensationEntry** | No (child of CorrectionRun) | POSTGRES | No | No |
| **HarukoSnapshot** | No (operational) | POSTGRES + S3 | No | No |
| **ManagementCompany** | **Yes** | POSTGRES | **Yes** | **Yes** |
| **Invoice** | No | POSTGRES | No | No |
| **EntityMapping** | No (infrastructure) | POSTGRES | No | No |
| **ProcessAttachment** | No | POSTGRES | No | No |
| **InvestorConsent** | No (child of Investor) | POSTGRES | No | No |
| **TaxRecord** | No (child of Investor) | POSTGRES | No | No |
| **DealingScheduleConfig** | No (child of Fund) | POSTGRES | No | No |
| **FundMetadata** | No (child of Fund) | POSTGRES | No | No |
| **OutsourcingArrangement** | No (operational) | POSTGRES | No | No |

**Counts:** ~35 entity types · ~15 aggregate roots · ~15 Cerbos resources · ~15 GraphQL `@key` types

---

## 4. Bounded Contexts

Bounded contexts group related entities. Each becomes a module in the GraphQL server (and later, an Apollo Federation subgraph if we split).

```
┌──────────────────────────────────────────────────────────────────┐
│  FUND MANAGEMENT              │  ORDER PROCESSING               │
│  ─────────────                │  ────────────────                │
│  Fund (root)                  │  Order (root)                   │
│  ShareClass (root)            │  OrderProcessingStatus (value)  │
│  Dealing (child)              │                                  │
│  UmbrellaFund (root)          │                                  │
│  FundMetadata (child)         │                                  │
│  DealingScheduleConfig (child)│                                  │
├───────────────────────────────┼──────────────────────────────────┤
│  IDENTITY & ACCESS            │  COMPLIANCE                     │
│  ──────────────               │  ──────────                     │
│  Investor (root)              │  KYCRecord (root)               │
│  Account (root)               │  SanctionsScreening (child)     │
│  ManagementCompany (root)     │  BeneficialOwnership (child)    │
│  InvestorConsent (child)      │  SuspiciousActivityReport (root)│
│  TaxRecord (child)            │  InvestorConsent (child)        │
├───────────────────────────────┼──────────────────────────────────┤
│  SETTLEMENT & BANKING         │  DOCUMENTS & REPORTING          │
│  ────────────────────         │  ─────────────────────          │
│  SettlementInstruction (root) │  Document (root)                │
│  BankAccount (child)          │  Report (root)                  │
│  BankTransaction (child)      │  RegulatoryReport (child)       │
│  ReconciliationResult (value) │  Contract (root)                │
│  EntityMapping (infra)        │  ProcessAttachment (value)      │
├───────────────────────────────┼──────────────────────────────────┤
│  FEE MANAGEMENT               │  PORTFOLIO & VALUATION          │
│  ──────────────                │  ─────────────────────          │
│  [embedded in Fund/Class]      │  Portfolio (root)               │
│  FeeHistory (value on Class)   │  Position (child)               │
│  AdjustmentRecord (value)      │  RiskMetrics (child)            │
│  PerfFeeRecord (value)         │  HarukoSnapshot (operational)   │
├───────────────────────────────┼──────────────────────────────────┤
│  OPERATIONS                    │  BILLING                        │
│  ──────────                    │  ───────                        │
│  ServiceExecution (value)      │  Invoice (value)                │
│  CorrectionRun (root)          │  OutsourcingArrangement (value) │
│  CompensationEntry (child)     │                                  │
└───────────────────────────────┴──────────────────────────────────┘
```

**Inter-context references** use entity IDs (not object references). Example: `Order.investorAccountId → Account.id`. In GraphQL, these become `@provides` directives or reference resolvers.

---

## 5. Aggregate Roots & Relationships

```
                           ManagementCompany
                                  │ owns (tenant)
                    ┌─────────────┼─────────────┐
                    │             │             │
              UmbrellaFund    Investor      Contract
                    │             │
              ┌─────┤         ┌───┤
              │     │         │   │
            Fund  Fund     Account KYCRecord
              │               │        │
        ┌─────┼─────┐        │    SanctionsScreening
        │     │     │     Order    BeneficialOwnership
   ShareClass │  FundMetadata
        │     │
     Dealing  DealingScheduleConfig
              │
        SettlementInstruction ──── BankAccount
                                       │
                                  BankTransaction

        Fund ────── Portfolio (Haruko)
                        │
                   ┌────┼────┐
                Position  RiskMetrics

        Fund ────── Report
                        │
                   Document (S3)

        Fund ────── CorrectionRun
                        │
                   CompensationEntry

        Fund ────── SuspiciousActivityReport (restricted)
```

**Key relationships:**

| From | To | Cardinality | Cross-source? |
|------|----|:-----------:|:---:|
| UmbrellaFund → Fund | parent-child | 1:N | CHAIN → CHAIN |
| Fund → ShareClass | parent-child | 1:N | CHAIN → CHAIN |
| ShareClass → Dealing | parent-child | 1:N | CHAIN → CHAIN |
| Fund → Order | ownership | 1:N | CHAIN → CHAIN |
| Account → Order | ownership | 1:N | CHAIN → CHAIN |
| Investor → Account | identity link | 1:N | POSTGRES → CHAIN |
| Fund → Portfolio | data link | 1:1 | CHAIN → HARUKO |
| Fund → FundMetadata | extension | 1:1 | CHAIN → POSTGRES |
| Fund → DealingScheduleConfig | config | 1:1 | CHAIN → POSTGRES |
| Investor → KYCRecord | compliance | 1:N | POSTGRES → POSTGRES |
| Order → SettlementInstruction | settlement | 1:1 | CHAIN → POSTGRES |
| Fund → Report | reporting | 1:N | CHAIN → POSTGRES+S3 |
| ManagementCompany → * | tenant | 1:N | POSTGRES → * |

**Cross-source relationships** (marked ✓) are the most architecturally important — they require the resolver layer to join data from different physical sources transparently.

---

## 6. GraphQL Projection

### 6.1 Type → Entity Mapping

Every domain entity becomes a GraphQL type. Aggregate roots get `@key` for federation readiness.

```graphql
# ─── FUND MANAGEMENT ─────────────────────────────────

type Fund @key(fields: "id") {
  id: ID!                                # CHAIN (fundId)
  name: String!                          # CHAIN
  status: FundStatus!                    # CHAIN
  manager: Account!                      # CHAIN (resolve via managerId)
  umbrella: UmbrellaFund                 # CHAIN
  reportingCurrency: Currency!           # CHAIN
  maxCapacity: BigInt                    # CHAIN

  # Pricing — COMPUTED from chain (real-time at any block)
  nav: BigInt!                           # CHAIN
  navUpdatedAt: DateTime!                # CHAIN
  price: BigInt!                         # COMPUTED (nav / totalSupply)
  adjustedPrice: BigInt!                 # COMPUTED (price / dilutionRatio)
  totalSupply: BigInt!                   # CHAIN
  priceHistory: [PricePoint!]!           # CHAIN (array)

  # Children
  classes: [ShareClass!]!               # CHAIN
  orders(status: OrderStatus): [Order!]! # CHAIN

  # Cross-source fields
  metadata: FundMetadata                 # POSTGRES
  dealingSchedule: DealingScheduleConfig # POSTGRES
  portfolio: Portfolio                   # HARUKO
  documents: [Document!]!               # POSTGRES+S3

  # Fee data
  pendingAdjustments: [PendingAdjustment!]! # CHAIN
  protocolSafety: ProtocolSafetyConfig   # CHAIN

  # Temporal query support
  atBlock: Int                           # Propagated to all chain resolvers
}

type ShareClass @key(fields: "id") {
  id: ID!                                # CHAIN (packed tokenId)
  name: String!                          # CHAIN
  status: FundStatus!                    # CHAIN
  fund: Fund!                            # CHAIN (parent)
  totalSupply: BigInt!                   # CHAIN
  price: BigInt!                         # COMPUTED
  priceInDenomination: BigInt!           # COMPUTED (price × FX)
  denominationCurrency: Currency!        # CHAIN
  managementFeeRate: Int!                # CHAIN (BPS)
  noticePeriod: Int!                     # CHAIN (seconds)
  lockPeriod: Int!                       # CHAIN (seconds)

  # Eligibility
  eligibility: ClassEligibility!         # CHAIN (embedded)

  # Children
  dealings: [Dealing!]!                  # CHAIN

  # Fee history
  feeHistory: [FeeMint!]!               # CHAIN
  adjustmentHistory: [AdjustmentRecord!]! # CHAIN
  auditTrail: ClassAuditTrail!           # CHAIN (merged view)
}

type Dealing {
  id: ID!                                # CHAIN
  name: String!                          # CHAIN
  class: ShareClass!                     # CHAIN (parent)
  totalSupply: BigInt!                   # CHAIN
  price: BigInt!                         # COMPUTED
  hwm: BigInt!                           # CHAIN
  unlockTimestamp: DateTime!             # CHAIN
  createdAt: DateTime!                   # CHAIN
  perfFeeHistory: [FeeMint!]!           # CHAIN
}

type UmbrellaFund @key(fields: "id") {
  id: ID!                                # CHAIN
  name: String!                          # CHAIN
  status: FundStatus!                    # CHAIN
  minimumInitialSubscription: BigInt!    # CHAIN
  funds: [Fund!]!                        # CHAIN
  currencies: [Currency!]!               # CHAIN
  createdAt: DateTime!                   # CHAIN
}

# ─── ORDERS ───────────────────────────────────────────

type Order @key(fields: "id") {
  id: ID!                                # CHAIN
  fund: Fund!                            # CHAIN
  investor: Account!                     # CHAIN
  orderType: OrderType!                  # CHAIN
  amount: BigInt!                        # CHAIN
  status: OrderStatus!                   # COMPUTED (from processingHistory)
  tokenId: BigInt!                       # CHAIN
  priceLimits: PriceLimits              # CHAIN
  dueDate: DateTime                      # CHAIN
  processingHistory: [OrderProcessingStatus!]! # CHAIN

  # Cross-source
  settlementInstruction: SettlementInstruction # POSTGRES
}

# ─── IDENTITY ─────────────────────────────────────────

type Account @key(fields: "id") {
  id: ID!                                # CHAIN (address)
  owner: String!                         # CHAIN (address)
  name: String!                          # CHAIN
  accountType: AccountType!              # CHAIN

  # On-chain attributes
  kycVerified: Boolean!                  # CHAIN
  accreditedInvestor: Boolean!           # CHAIN
  jurisdiction: String!                  # CHAIN
  investorType: Int!                     # CHAIN

  # Cross-source: off-chain investor profile
  investor: Investor                     # POSTGRES (linked via wallet mapping)

  # Holdings
  holdings: [TokenHolding!]!             # CHAIN (computed)
  orders: [Order!]!                      # CHAIN
}

type Investor @key(fields: "id") {
  id: ID!                                # POSTGRES
  legalName: String!                     # POSTGRES (PII)
  nationality: String!                   # POSTGRES
  investorType: InvestorType!            # POSTGRES
  riskProfile: RiskProfile               # POSTGRES

  # Children
  accounts: [Account!]!                  # CHAIN (reverse lookup via wallet mapping)
  kycRecords: [KYCRecord!]!             # POSTGRES
  taxRecords: [TaxRecord!]!             # POSTGRES
  consents: [InvestorConsent!]!          # POSTGRES
  documents: [Document!]!               # POSTGRES+S3
  bankAccounts: [BankAccount!]!          # POSTGRES
}

type ManagementCompany @key(fields: "id") {
  id: ID!                                # POSTGRES
  name: String!                          # POSTGRES
  jurisdiction: String!                  # POSTGRES
  regulatoryStatus: String!              # POSTGRES
  status: CompanyStatus!                 # POSTGRES

  # Children / relationships
  funds: [Fund!]!                        # CHAIN (via manager addresses)
  investors: [Investor!]!               # POSTGRES
  outsourcing: [OutsourcingArrangement!]! # POSTGRES
}

# ─── COMPLIANCE ───────────────────────────────────────

type KYCRecord @key(fields: "id") {
  id: ID!                                # POSTGRES
  investor: Investor!                    # POSTGRES
  provider: String!                      # POSTGRES
  status: KYCStatus!                     # POSTGRES
  riskScore: Int!                        # POSTGRES
  riskTier: RiskTier!                    # POSTGRES
  verifiedAt: DateTime                   # POSTGRES
  expiresAt: DateTime                    # POSTGRES

  # Children
  documents: [Document!]!               # POSTGRES+S3
  screenings: [SanctionsScreening!]!    # POSTGRES
  beneficialOwners: [BeneficialOwnership!]! # POSTGRES
}

type SuspiciousActivityReport @key(fields: "id") {
  # RESTRICTED — Cerbos: mlro + compliance ONLY
  # Deliberately NOT connected to Investor in GraphQL graph (tipping-off)
  id: ID!                                # POSTGRES
  type: SARType!                         # POSTGRES
  status: SARStatus!                     # POSTGRES
  decision: SARDecision                  # POSTGRES
  createdAt: DateTime!                   # POSTGRES
  # investor_id is resolved ONLY for authorized principals
}

# ─── PORTFOLIO (Haruko) ──────────────────────────────

type Portfolio @key(fields: "fundId") {
  fundId: ID!                            # mapping (Fund → Haruko portfolio ID)
  gav: BigInt                            # HARUKO (Shadow NAV)
  positions: [Position!]!               # HARUKO
  cashBalances: [CashBalance!]!         # HARUKO
  riskMetrics: RiskMetrics               # HARUKO
  tradeBlotter: [Trade!]!               # HARUKO
  latestSnapshot: HarukoSnapshot         # POSTGRES (cached)
}

# ─── DOCUMENTS & REPORTS ─────────────────────────────

type Document @key(fields: "id") {
  id: ID!                                # POSTGRES
  type: DocumentType!                    # POSTGRES
  entityType: EntityType!                # POSTGRES
  entityId: ID!                          # POSTGRES
  accessTier: AccessTier!               # POSTGRES (→ Cerbos)
  version: Int!                          # POSTGRES
  fileName: String!                      # POSTGRES
  downloadUrl: String!                   # S3 (pre-signed)
  generatedAt: DateTime!                 # POSTGRES
  validFrom: Date                        # POSTGRES
  validTo: Date                          # POSTGRES
}

type Report @key(fields: "id") {
  id: ID!                                # POSTGRES
  reportType: ReportType!               # POSTGRES
  scopeType: ScopeType!                  # POSTGRES
  scopeId: ID!                           # POSTGRES
  period: DateRange                      # POSTGRES
  status: ReportStatus!                  # POSTGRES
  asOfBlock: Int                         # POSTGRES (chain block used)
  structuredData: JSON                   # POSTGRES (cached content)
  document: Document                     # POSTGRES+S3
  publishedAt: DateTime                  # POSTGRES
}

type Contract @key(fields: "id") {
  id: ID!                                # POSTGRES
  templateType: ContractType!            # POSTGRES
  counterparty: ContractCounterparty!    # POSTGRES
  status: ContractStatus!               # POSTGRES
  signedAt: DateTime                     # POSTGRES
  effectiveFrom: Date!                   # POSTGRES
  expiresAt: Date                        # POSTGRES
  document: Document                     # POSTGRES+S3
}

# ─── SETTLEMENT ───────────────────────────────────────

type SettlementInstruction @key(fields: "id") {
  id: ID!                                # POSTGRES
  order: Order!                          # CHAIN (cross-source)
  fund: Fund!                            # CHAIN (cross-source)
  investor: Investor!                    # POSTGRES
  direction: SettlementDirection!        # POSTGRES
  currency: String!                      # POSTGRES
  amount: BigDecimal!                    # POSTGRES
  paymentMethod: PaymentMethod!          # POSTGRES
  status: SettlementStatus!             # POSTGRES
  expectedValueDate: Date!               # POSTGRES
  actualValueDate: Date                  # POSTGRES
  matchedBankTransaction: BankTransaction # POSTGRES
}

# ─── CORRECTIONS ──────────────────────────────────────

type CorrectionRun @key(fields: "id") {
  id: ID!                                # POSTGRES
  fund: Fund!                            # CHAIN (cross-source)
  errorType: ErrorType!                  # POSTGRES
  originalBlock: Int!                    # POSTGRES
  correctedBlock: Int!                   # POSTGRES
  materialityBps: Int!                   # POSTGRES
  isMaterial: Boolean!                   # POSTGRES
  status: CorrectionStatus!             # POSTGRES
  compensationEntries: [CompensationEntry!]! # POSTGRES
}
```

### 6.2 Non-Root Types (Embedded / Value Objects)

These appear in GraphQL but are NOT independently resolvable — always nested under an aggregate root.

```graphql
# Value objects — no @key, no Cerbos resource
type TokenHolding { tokenId: BigInt!, balance: BigInt!, price: BigInt!, value: BigInt! }
type PricePoint { nav: BigInt!, price: BigInt!, timestamp: DateTime!, blockNumber: Int! }
type FeeMint { amount: BigInt!, blockNumber: Int!, timestamp: DateTime! }
type AdjustmentRecord { label: AdjustmentLabel!, amount: BigInt!, blockNumber: Int! }
type PendingAdjustment { classId: Int!, amount: BigInt!, label: AdjustmentLabel! }
type OrderProcessingStatus { status: OrderStatus!, amount: BigInt!, timestamp: DateTime! }
type PriceLimits { minPrice: BigInt, maxPrice: BigInt }
type ClassEligibility { requiresKYC: Boolean!, requiresAccredited: Boolean!, jurisdictions: [String!]! }
type ProtocolSafetyConfig { maxNavChangeBps: Int!, maxTimestampDeviation: Int! }
type ClassAuditTrail { entries: [AuditTrailEntry!]!, totalCount: Int! }
type Currency { code: String!, alphaCode: String!, decimals: Int! }
type FXRate { currency: Currency!, rateVsUSD: BigInt!, timestamp: DateTime! }
type Position { asset: String!, venue: String!, quantity: BigDecimal!, value: BigDecimal! }
type CashBalance { currency: String!, venue: String!, amount: BigDecimal! }
type RiskMetrics { sharpe: Float, sortino: Float, volatility: Float, maxDrawdown: Float, var95: Float }
type Trade { asset: String!, side: String!, quantity: BigDecimal!, price: BigDecimal!, executedAt: DateTime! }
type BankAccount { id: ID!, bankName: String!, currency: String!, isPrimary: Boolean! }
type BankTransaction { id: ID!, amount: BigDecimal!, date: Date!, reference: String }
type SanctionsScreening { result: ScreeningResult!, screenedAt: DateTime!, listsChecked: [String!]! }
type BeneficialOwnership { name: String!, ownershipPercentage: Float!, pepStatus: Boolean! }
type CompensationEntry { investorId: ID!, direction: CompDirection!, amount: BigDecimal!, paymentStatus: PaymentStatus! }
type TaxRecord { jurisdiction: String!, selfCertType: String!, witholdingRate: Float! }
type InvestorConsent { consentType: ConsentType!, grantedAt: DateTime!, withdrawnAt: DateTime }
type FundMetadata { domicile: String!, regulatoryRegime: [String!]!, fundStructure: FundStructure!, launchDate: Date! }
type DealingScheduleConfig { frequency: DealingFrequency!, cutoffTime: String!, timezone: String! }
type OutsourcingArrangement { providerName: String!, criticality: Criticality!, status: ArrangementStatus! }
type HarukoSnapshot { snapshotDate: Date!, gav: BigDecimal, capturedAt: DateTime! }
type ContractCounterparty { type: CounterpartyType!, id: ID!, name: String! }
type DateRange { start: Date!, end: Date! }
```

---

## 7. Cerbos Projection

### 7.1 Resource Catalog

Only aggregate roots become Cerbos resources. Each resource lists its actions and the attribute sources needed for authorization decisions.

| Cerbos Resource | Actions | Attributes (DB) | Attributes (Chain) | Attributes (Haruko) |
|----------------|---------|-----------------|-------------------|-------------------|
| `fund` | view_metadata, view_financials, view_positions, view_investors, manage, place_order | managerId, umbrellaId, isPublic, status, whitelistedUserIds | holderBalance, dealingOpen, mgmtFeeRate | — |
| `share_class` | view, manage | fundId, managerId | status, eligibility.* | — |
| `umbrella_fund` | view, manage | — | managerId, status | — |
| `order` | view, cancel, process | investorAccountId, fundId | orderStatus, amount | — |
| `account` | view, manage_permissions, manage_operators | ownerId | roles | — |
| `investor` | view_profile, view_pii, update_profile, view_kyc | managementCompanyId | — | — |
| `management_company` | view, manage_settings, manage_users | — (tenant-scoped) | — | — |
| `kyc_record` | view, update, review | investorId, status, riskTier | — | — |
| `sar` | view, create, file | mlroId (MLRO-only) | — | — |
| `portfolio` | view_positions, view_risk, view_trades | fundId, managerId | — | hasPositions |
| `document` | view, upload, delete | accessTier, entityType, entityId, granteeIds | — | — |
| `report` | view, generate, publish | scopeType, scopeId, reportType | — | — |
| `contract` | view, sign, terminate | counterpartyId, entityId | — | — |
| `settlement` | view, instruct, confirm | fundId, investorId, status | — | — |
| `correction_run` | view, approve, execute | fundId, materialityBps | — | — |

### 7.2 Attribute Source Map (per resource)

This is the bridge between Cerbos policies and the 4-phase authorization flow from [Authorization_System_V1.md](./Authorization_System_V1.md).

```typescript
// Each resource defines which Cerbos attributes come from which source.
// DB attributes → Phase 2 (Prisma WHERE). External attributes → Phase 3-4 (hydrate + decide).

const RESOURCE_ATTRIBUTE_SOURCES: Record<string, AttributeSourceMap> = {
  fund: {
    db: {
      "managerId": "managerId",
      "umbrellaId": "umbrellaId",
      "isPublic": "isPublic",
      "status": "status",
      "whitelistedUserIds": "whitelistedUsers.some.userId",
    },
    chain: ["holderBalance", "dealingOpen", "mgmtFeeRate", "navPerShare"],
    haruko: [],  // No Haruko-dependent fund auth rules in V1
  },
  investor: {
    db: {
      "managementCompanyId": "managementCompanyId",
    },
    chain: [],
    haruko: [],
  },
  document: {
    db: {
      "accessTier": "accessTier",
      "entityType": "entityType",
      "entityId": "entityId",
    },
    chain: [],
    haruko: [],
  },
  // ... pattern repeats for all resources
};
```

**DB attributes pre-filter (Phase 2). Chain/Haruko attributes post-filter (Phase 3-4).** This is the core performance optimization — external data is only fetched for candidates that survive the DB pre-filter.

---

## 8. Resolver Architecture

### 8.1 DataLoader Per Source

Every physical source gets a dedicated DataLoader. All chain DataLoaders use the same block number (request-pinned).

```
Request arrives
    │
    ├── ctx.blockNumber = await provider.getBlockNumber()
    │
    ├── ctx.loaders = {
    │     chain: {
    │       fundInfo:     DataLoader<fundId, FundInfo>        (multicall)
    │       classInfo:    DataLoader<classId, ClassInfo>      (multicall)
    │       balanceOf:    DataLoader<{tokenId,account}, uint> (multicall)
    │       orderBook:    DataLoader<fundId, Order[]>         (multicall)
    │       fxRate:       DataLoader<currencyCode, FXRate>    (multicall)
    │       ...all use ctx.blockNumber
    │     },
    │     postgres: {
    │       investor:     DataLoader<investorId, Investor>    (Prisma)
    │       fundMetadata: DataLoader<fundId, FundMetadata>    (Prisma)
    │       documents:    DataLoader<entityId, Document[]>    (Prisma)
    │       ...
    │     },
    │     haruko: {
    │       portfolio:    DataLoader<portfolioId, Portfolio>  (REST API)
    │       positions:    DataLoader<portfolioId, Position[]> (REST API)
    │       ...
    │     },
    │     s3: {
    │       presignedUrl: DataLoader<s3Key, string>           (AWS SDK)
    │     }
    │   }
    │
    └── Resolvers use ctx.loaders.{source}.{entity}.load(id)
```

### 8.2 Resolver Routing By Source Annotation

Each field on a domain entity has a source annotation. The resolver for that field uses the corresponding DataLoader:

```typescript
const FundResolvers = {
  Fund: {
    // CHAIN fields — all use chainLoader, all block-pinned
    name:          (fund) => fund.name,        // already loaded with fundInfo
    nav:           (fund) => fund.nav,
    totalSupply:   (fund) => fund.totalSupply,

    // COMPUTED fields — pure functions of chain data
    price:         (fund) => (fund.nav * PRECISION) / fund.totalSupply,
    adjustedPrice: (fund) => fund.price * PRECISION / fund.dilutionRatio,

    // POSTGRES fields — cross-source resolution
    metadata:      (fund, _, ctx) => ctx.loaders.postgres.fundMetadata.load(fund.id),
    dealingSchedule: (fund, _, ctx) => ctx.loaders.postgres.dealingScheduleConfig.load(fund.id),

    // HARUKO fields — cross-source resolution
    portfolio:     (fund, _, ctx) => ctx.loaders.haruko.portfolio.load(fund.harukoPortfolioId),

    // CHAIN children — same source, DataLoader batching
    classes:       (fund, _, ctx) => ctx.loaders.chain.classesByFund.load(fund.id),
    orders:        (fund, args, ctx) => ctx.loaders.chain.ordersByFund.load({ fundId: fund.id, status: args.status }),
  },
};
```

### 8.3 Cross-Source Resolution Pattern

When a GraphQL field requires data from a different source than its parent:

```
Fund (CHAIN) → metadata (POSTGRES)
                  │
                  └─ Resolver calls ctx.loaders.postgres.fundMetadata.load(fund.id)
                     The fund.id (on-chain uint16) maps to FundMetadata.fund_id (string)
                     via EntityMapping table OR direct convention ("fund:3" → metadata row)
```

**The client never sees this.** A single GraphQL query like:

```graphql
query {
  fund(id: "3") {
    name           # ← from chain
    nav            # ← from chain
    price          # ← computed from chain
    metadata {
      domicile     # ← from Postgres
      launchDate   # ← from Postgres
    }
    portfolio {
      gav          # ← from Haruko
      positions {
        asset      # ← from Haruko
        value      # ← from Haruko
      }
    }
  }
}
```

...triggers three DataLoaders (chain, postgres, haruko) transparently. The domain model source annotations tell each resolver which loader to use.

### 8.4 Temporal Query Support

On-chain data is queryable at any historical block. The `atBlock` parameter propagates through the resolver context:

```graphql
query {
  fund(id: "3", atBlock: 12345678) {
    nav            # ← chain state at block 12345678
    price          # ← computed from chain at block 12345678
    classes {
      price        # ← chain state at block 12345678
    }
  }
}
```

```typescript
// If atBlock provided, override ctx.blockNumber for ALL chain DataLoaders
if (args.atBlock) {
  ctx.blockNumber = args.atBlock;
  ctx.loaders.chain = createChainLoaders(ctx.blockNumber);  // fresh loaders pinned to historical block
}
```

**Constraint:** `atBlock` only affects CHAIN-sourced fields. POSTGRES and HARUKO fields always return current state. This is correct — off-chain data doesn't have block-level history (except HarukoSnapshots which have snapshot_date).

---

## 9. Derived Roles

Derived roles bridge Cognito base roles (admin, manager, investor) with per-resource context. They are the mechanism that makes Cerbos authorization context-aware.

| Derived Role | Parent Role | Condition | Source |
|-------------|-------------|-----------|--------|
| `fund_manager` | manager | `R.attr.managerId == P.id` | DB (Phase 2) |
| `umbrella_manager` | manager | `R.attr.umbrellaId == P.attr.umbrellaId` | DB (Phase 2) |
| `token_holder` | investor | `R.attr.holderBalance > 0` | Chain (Phase 3-4) |
| `whitelisted_investor` | investor | `R.attr.whitelistedUserIds.contains(P.id)` | DB (Phase 2) |
| `order_owner` | investor | `R.attr.investorAccountId == P.attr.accountId` | DB (Phase 2) |
| `document_grantee` | * | `R.attr.granteeIds.contains(P.id)` | DB (Phase 2) |
| `kyc_reviewer` | manager | `P.attr.permissions.includes("kyc_review")` | Cognito |
| `mlro` | manager | `P.attr.permissions.includes("mlro")` | Cognito |
| `tenant_member` | * | `R.attr.managementCompanyId == P.attr.managementCompanyId` | DB (Phase 2) |
| `platform_admin` | admin | (always) | Cognito |

**Phase 2 roles** (DB conditions) drive Prisma WHERE clauses — this is the pre-filter that eliminates ~90% of candidates before any external data is fetched.

**Phase 3-4 roles** (chain conditions like `token_holder`) require hydration from blockchain before Cerbos can evaluate them. These are post-filter roles.

---

## 10. Edge Cases & Solutions

### Edge Case 1: Temporal Queries

**Problem:** `fund(id: "3", atBlock: 12345678)` — what block do we use for authorization?

**Solution:** Authorization always uses CURRENT state (`ctx.blockNumber = latest`). Only display data uses the historical block. Rationale: "Can you see this fund?" is a present-tense question. "What was the NAV?" is a past-tense data question.

```typescript
// Auth resolvers: always current block
const authBlock = await provider.getBlockNumber();
// Display resolvers: use atBlock if provided
const displayBlock = args.atBlock ?? authBlock;
```

### Edge Case 2: Cross-Source Computed Fields

**Problem:** `investorPortfolioValue` = `balanceOf(tokenId, account)` (CHAIN) × `harukoGAV / totalSupply` (HARUKO + CHAIN). This mixes sources.

**Solution:** Computed fields in the COMPUTED source annotation can reference any loader. The resolver composes:

```typescript
investorPortfolioValue: async (investor, _, ctx) => {
  const [balance, fundInfo, portfolio] = await Promise.all([
    ctx.loaders.chain.balanceOf.load({ tokenId, account: investor.address }),
    ctx.loaders.chain.fundInfo.load(fundId),
    ctx.loaders.haruko.portfolio.load(harukoId),
  ]);
  return balance * portfolio.gav / fundInfo.totalSupply;
};
```

### Edge Case 3: SAR Tipping-Off Prevention

**Problem:** SuspiciousActivityReport must exist in the data model but must NEVER be discoverable by the subject investor. Even a `null` response vs 403 could leak information.

**Solution:**
1. SAR is a **separate Cerbos resource** with its own policy (mlro + compliance only).
2. SAR is **NOT connected** to Investor in the GraphQL schema. There is no `investor.suspiciousActivityReports` field.
3. SAR is queried via a **standalone query**: `sars(filters: {...})` — only accessible to mlro/compliance.
4. The `investor_id` field on SAR is an opaque ID, not a relationship resolver. No reverse traversal.

```graphql
# SAR is completely disconnected from the investor graph
type Query {
  # Only accessible to mlro + compliance (Cerbos: sar.view)
  sars(status: SARStatus, dateRange: DateRange): [SuspiciousActivityReport!]!
}

# NO field like this exists:
# type Investor { sars: [SuspiciousActivityReport!]! }  ← NEVER DO THIS
```

### Edge Case 4: Cross-Source Filtering

**Problem:** "Show me all orders where settlement is pending" — `Order` is on-chain, `SettlementInstruction.status` is in Postgres. Can't filter on-chain data by off-chain criteria efficiently.

**Solution:** The AuthQueryEngine filters by the DB side first (since settlement data is in Postgres), then hydrates with chain data for the order details. The resolver composes:

```typescript
ordersWithPendingSettlement: async (fund, _, ctx) => {
  // 1. Query Postgres for pending settlement instructions
  const pendingSettlements = await prisma.settlementInstruction.findMany({
    where: { fundId: fund.id, status: 'PENDING' },
  });
  // 2. Load corresponding on-chain orders via DataLoader
  const orderIds = pendingSettlements.map(s => s.orderId);
  return ctx.loaders.chain.ordersByIds.loadMany(orderIds);
};
```

### Edge Case 5: Cerbos Attribute Subset

**Problem:** Cerbos CheckResources needs resource attributes, but different actions need different attributes. `view_metadata` needs only DB attributes; `place_order` needs chain attributes too.

**Solution:** The attribute source map (Section 7.2) defines which attributes each resource needs. The hydration step only fetches what's needed for the action being checked. But in practice, the V1 simplification is: always hydrate all attributes for a resource. At startup scale, the overhead is negligible. Optimize when profiling shows it matters.

### Edge Case 6: Multi-Tenancy in Cross-Source Joins

**Problem:** Fund exists on-chain (no `management_company_id`). FundMetadata is in Postgres (has `management_company_id`). How do we enforce tenant isolation on cross-source data?

**Solution:** Tenant isolation is enforced at two levels:
1. **Postgres RLS** — automatically filters all off-chain queries by `management_company_id`.
2. **On-chain** — funds are naturally isolated by `manager` address. The manager address is linked to a management company via the EntityMapping table.
3. **Cerbos** — `tenant_member` derived role checks `R.attr.managementCompanyId == P.attr.managementCompanyId` on all resources.

The chain is the one source that doesn't natively enforce tenancy. But since all chain access goes through the GraphQL layer (which applies Cerbos), tenancy is always enforced at the query level.

---

## 11. Query Walkthrough

Five real queries traced through all three layers to verify the model works end-to-end.

### Query 1: Investor Portfolio View

```graphql
query InvestorPortfolio($accountId: ID!) {
  account(id: $accountId) {         # CHAIN (Account aggregate)
    name                             # CHAIN
    holdings {                       # CHAIN (computed: balanceOf for all tokenIds)
      tokenId                        # CHAIN
      balance                        # CHAIN
      price                          # CHAIN (computed)
      value                          # COMPUTED (balance × price)
    }
    investor {                       # POSTGRES (cross-source: wallet → investor)
      legalName                      # POSTGRES (PII — Cerbos: view_pii)
      kycRecords {                   # POSTGRES
        status                       # POSTGRES
        expiresAt                    # POSTGRES
      }
    }
    orders(status: PENDING) {        # CHAIN
      orderType                      # CHAIN
      amount                         # CHAIN
      dueDate                        # CHAIN
    }
  }
}
```

**Auth flow:**
1. Cerbos `account.view` — DB pre-filter (ownerId matches principal)
2. Cerbos `investor.view_pii` — field-level check (fund_manager or platform_admin)
3. Cerbos `order.view` — order_owner or fund_manager

**Sources touched:** CHAIN (account, holdings, orders) → POSTGRES (investor profile, KYC) — 2 sources, transparently composed.

### Query 2: Fund Manager Dashboard

```graphql
query ManagerDashboard {
  visibleFunds {                     # Fund[] filtered by Cerbos
    id                               # CHAIN
    name                             # CHAIN
    nav                              # CHAIN
    price                            # COMPUTED
    totalSupply                      # CHAIN
    metadata {
      domicile                       # POSTGRES
      regulatoryRegime               # POSTGRES
    }
    portfolio {
      gav                            # HARUKO
      riskMetrics {
        sharpe                       # HARUKO
        maxDrawdown                  # HARUKO
      }
    }
    classes {
      name                           # CHAIN
      totalSupply                    # CHAIN
      price                          # COMPUTED
      feeHistory {                   # CHAIN
        amount                       # CHAIN
      }
    }
  }
}
```

**Auth flow:**
1. PlanResources → Prisma WHERE (managerId = principal) → pre-filtered fund list
2. Hydrate: chain (holderBalance, dealingOpen) + Haruko (portfolio data)
3. CheckResources → final filtering
4. Field-level: `view_financials` for pricing, `view_positions` for portfolio

**Sources touched:** CHAIN + POSTGRES + HARUKO — all three, unified in one query.

### Query 3: Compliance KYC Review

```graphql
query KYCReview($investorId: ID!) {
  investor(id: $investorId) {        # POSTGRES
    legalName                         # POSTGRES
    kycRecords {                     # POSTGRES
      status                          # POSTGRES
      riskTier                        # POSTGRES
      documents {                    # POSTGRES + S3
        type                          # POSTGRES
        downloadUrl                  # S3 (pre-signed)
      }
      screenings {                   # POSTGRES
        result                        # POSTGRES
        listsChecked                  # POSTGRES
      }
      beneficialOwners {             # POSTGRES
        name                          # POSTGRES
        ownershipPercentage           # POSTGRES
        pepStatus                     # POSTGRES
      }
    }
  }
}
```

**Auth flow:** Cerbos `investor.view_kyc` — kyc_reviewer derived role required.

**Sources touched:** POSTGRES + S3 — no chain data needed.

### Query 4: Temporal Fund State

```graphql
query FundAtBlock($fundId: ID!, $block: Int!) {
  fund(id: $fundId, atBlock: $block) {
    nav                               # CHAIN at $block
    price                             # COMPUTED from CHAIN at $block
    classes {
      price                           # COMPUTED from CHAIN at $block
      managementFeeRate               # CHAIN at $block
    }
  }
}
```

**Auth flow:** Uses CURRENT block for authorization, `$block` for display data.

**Sources touched:** CHAIN only (historical block query via `eth_call`).

### Query 5: SAR Tipping-Off Test

```graphql
# As MLRO — works
query { sars(status: DRAFT) { id, type, decision } }
# → Returns matching SARs

# As fund_manager — denied
query { sars(status: DRAFT) { id } }
# → [] (Cerbos: sar.view → DENIED for fund_manager)

# As investor — no such query visible
# The Investor type has NO sars field. Cannot even construct the query path.
```

**Result:** Tipping-off prevention satisfied at schema level (no traversal path) AND policy level (Cerbos denies non-MLRO access).

---

## 12. Entity Definitions

This section defines every entity in the domain model with source annotations per field. This is the canonical reference from which GraphQL schemas, Cerbos policies, and Prisma schemas are generated or validated.

### 12.1 Entity Definition Format

```yaml
EntityName:
  aggregate_root: true|false
  cerbos_resource: "resource_name"|null
  graphql_key: ["field1", "field2"]|null
  primary_source: CHAIN|POSTGRES|HARUKO
  fields:
    fieldName:
      type: String|Int|BigInt|Boolean|DateTime|...
      source: CHAIN|POSTGRES|HARUKO|S3|COMPUTED|COGNITO
      nullable: true|false
      description: "..."
  relationships:
    relName:
      target: EntityName
      cardinality: 1:1|1:N|N:1
      cross_source: true|false
```

### 12.2 Core Entities (Abbreviated — key field sources only)

**Fund**
```yaml
Fund:
  aggregate_root: true
  cerbos_resource: "fund"
  graphql_key: ["id"]
  primary_source: CHAIN
  fields:
    id:                { source: CHAIN, type: ID }
    name:              { source: CHAIN, type: String }
    status:            { source: CHAIN, type: FundStatus }
    managerId:         { source: CHAIN, type: ID }          # on-chain address
    nav:               { source: CHAIN, type: BigInt }
    navUpdatedAt:      { source: CHAIN, type: DateTime }
    totalSupply:       { source: CHAIN, type: BigInt }
    dilutionRatio:     { source: CHAIN, type: BigInt }
    reportingCurrency: { source: CHAIN, type: Int }         # ISO 4217
    umbrellaFundId:    { source: CHAIN, type: Int }
    maxCapacity:       { source: CHAIN, type: BigInt }
    # Computed
    price:             { source: COMPUTED, type: BigInt }    # nav * PRECISION / totalSupply
    adjustedPrice:     { source: COMPUTED, type: BigInt }    # price * PRECISION / dilutionRatio
    # Cross-source
    domicile:          { source: POSTGRES, type: String }    # via FundMetadata
    regulatoryRegime:  { source: POSTGRES, type: "[String]" } # via FundMetadata
    harukoPortfolioId: { source: POSTGRES, type: String }    # via EntityMapping
  relationships:
    umbrella:          { target: UmbrellaFund, cardinality: "N:1", cross_source: false }
    classes:           { target: ShareClass, cardinality: "1:N", cross_source: false }
    orders:            { target: Order, cardinality: "1:N", cross_source: false }
    metadata:          { target: FundMetadata, cardinality: "1:1", cross_source: true }
    dealingSchedule:   { target: DealingScheduleConfig, cardinality: "1:1", cross_source: true }
    portfolio:         { target: Portfolio, cardinality: "1:1", cross_source: true }
    documents:         { target: Document, cardinality: "1:N", cross_source: true }
    reports:           { target: Report, cardinality: "1:N", cross_source: true }
    corrections:       { target: CorrectionRun, cardinality: "1:N", cross_source: true }
```

**Investor**
```yaml
Investor:
  aggregate_root: true
  cerbos_resource: "investor"
  graphql_key: ["id"]
  primary_source: POSTGRES
  fields:
    id:                   { source: POSTGRES, type: ID }
    managementCompanyId:  { source: POSTGRES, type: ID }
    legalName:            { source: POSTGRES, type: String }      # PII, encrypted
    dateOfBirth:          { source: POSTGRES, type: Date }        # PII, encrypted
    nationality:          { source: POSTGRES, type: String }
    investorType:         { source: POSTGRES, type: InvestorType }
    riskProfile:          { source: POSTGRES, type: RiskProfile }
    cognitoSub:           { source: COGNITO, type: String }       # auth link
  relationships:
    accounts:            { target: Account, cardinality: "1:N", cross_source: true }  # POSTGRES → CHAIN
    kycRecords:          { target: KYCRecord, cardinality: "1:N", cross_source: false }
    taxRecords:          { target: TaxRecord, cardinality: "1:N", cross_source: false }
    consents:            { target: InvestorConsent, cardinality: "1:N", cross_source: false }
    documents:           { target: Document, cardinality: "1:N", cross_source: false }
    bankAccounts:        { target: BankAccount, cardinality: "1:N", cross_source: false }
```

**Account**
```yaml
Account:
  aggregate_root: true
  cerbos_resource: "account"
  graphql_key: ["id"]
  primary_source: CHAIN
  fields:
    id:               { source: CHAIN, type: ID }       # on-chain address
    owner:            { source: CHAIN, type: String }    # wallet address
    name:             { source: CHAIN, type: String }
    accountType:      { source: CHAIN, type: Int }
    kycVerified:      { source: CHAIN, type: Boolean }
    accreditedInvestor: { source: CHAIN, type: Boolean }
    jurisdiction:     { source: CHAIN, type: String }    # bytes2
    investorType:     { source: CHAIN, type: Int }
  relationships:
    investor:          { target: Investor, cardinality: "N:1", cross_source: true }  # CHAIN → POSTGRES
    orders:            { target: Order, cardinality: "1:N", cross_source: false }
    holdings:          { target: TokenHolding, cardinality: "1:N", cross_source: false }  # computed
```

**Order**
```yaml
Order:
  aggregate_root: true
  cerbos_resource: "order"
  graphql_key: ["id"]
  primary_source: CHAIN
  fields:
    id:              { source: CHAIN, type: ID }
    fundId:          { source: CHAIN, type: Int }
    investorAccount: { source: CHAIN, type: ID }     # on-chain address
    orderType:       { source: CHAIN, type: OrderType }
    amount:          { source: CHAIN, type: BigInt }
    tokenId:         { source: CHAIN, type: BigInt }
    status:          { source: COMPUTED, type: OrderStatus }  # from processingHistory[-1]
    dueDate:         { source: CHAIN, type: DateTime }
  relationships:
    fund:             { target: Fund, cardinality: "N:1", cross_source: false }
    investor:         { target: Account, cardinality: "N:1", cross_source: false }
    settlement:       { target: SettlementInstruction, cardinality: "1:1", cross_source: true }
```

---

## 13. MVP Scope

### What to implement first

The unified model is complete, but MVP doesn't need all ~35 types on day one. Implement in phases:

**Phase 1 — Core (MVP):**
- Fund, ShareClass, Dealing, UmbrellaFund (CHAIN only — already exist)
- Order (CHAIN only — already exists)
- Account (CHAIN only — already exists)
- Investor, KYCRecord (POSTGRES — new Prisma schema)
- Document (POSTGRES+S3 — new)
- ManagementCompany (POSTGRES — new)
- FundMetadata (POSTGRES — new)

**Phase 2 — Cross-source + Auth:**
- Portfolio (HARUKO integration)
- Cerbos policies for all Phase 1 resources
- DataLoaders for chain + Postgres
- Cross-source resolution (Fund → metadata, Investor → accounts)
- Temporal query support (atBlock)

**Phase 3 — Full model:**
- SettlementInstruction, BankAccount, BankTransaction
- Report, RegulatoryReport
- CorrectionRun, CompensationEntry
- SuspiciousActivityReport
- Contract
- Remaining compliance entities

**Phase 4 — Optimization:**
- Apollo Federation subgraph split (if scale demands)
- Cache/materialized view entities
- DealingScheduleConfig, BusinessCalendar
- TieredFeeConfig, SuitabilityAssessment

### What stays constant across phases

The **entity catalog** (Section 3) and **source annotations** (Section 12) are stable from day one. Adding a new phase means implementing resolvers and Cerbos policies for entities already defined — not redesigning the model.

---

## Appendix A: Design Decisions

| Decision | Chosen | Rejected | Why |
|----------|--------|----------|-----|
| Aggregate roots as Cerbos resources | ~15 resources | Every entity (~35 resources) | Cerbos policies stay manageable. Child entities inherit parent auth. |
| Source annotations per field | Yes (in entity definitions) | Per entity only | Fund has both CHAIN and POSTGRES fields. Per-entity would lose precision. |
| GraphQL monolith first | Modular monolith (10 modules) | Apollo Federation from day one | Federation is premature at 1-5 management companies. Modules ready to split later. |
| SAR disconnected from Investor | Standalone type + query | Investor.sars field with @auth | Schema-level tipping-off prevention. @auth alone risks leaking existence via error/null. |
| atBlock on display, not auth | Current block for auth | Same block for both | Authorization is a present-tense question. "Can you see this?" ≠ "What was the NAV?" |
| Dealing as child, not root | Child of ShareClass | Independent aggregate root | Dealings don't exist outside their class. Always queried via class. |
| Portfolio as Haruko projection | Separate type with @key | Fields on Fund | Clean separation. Fund stays chain-pure. Portfolio owns all Haruko data. |
| Tenant isolation via RLS + Cerbos | Both | RLS only (database) or Cerbos only (API) | Defense in depth. RLS catches bugs in Cerbos policies. Cerbos handles cross-source. |

## Appendix B: Glossary

| Term | Definition |
|------|-----------|
| **Aggregate Root** | DDD concept: an entity that owns other entities. The root is the only entry point for external access. Child entities are accessed through the root. |
| **Source Annotation** | Per-field marker indicating which physical data source holds that field's data. Drives resolver routing. |
| **Triple Alignment** | The design principle that DDD aggregate roots = GraphQL entity types (with @key) = Cerbos resources. |
| **DataLoader** | Per-request batching + caching layer (from Facebook). Deduplicates fetches within a single request. |
| **Block-Pinning** | All chain reads within one request use the same block number, creating an atomic snapshot. |
| **Derived Role** | Cerbos concept: a role computed from context (e.g., "fund_manager" = manager whose managerId matches this fund). |
| **Hydration** | Phase 3 of the auth flow: fetching external (chain/Haruko) attributes for candidates that survived DB pre-filtering. |
| **Pre-filter** | Phase 2 of the auth flow: using DB conditions from the Cerbos PlanResources AST to reduce the candidate set via Prisma WHERE. |

## Appendix C: Production Changeability

The domain entity model is the **cheapest layer to change** in the entire stack. It has no runtime artifact — no database table, no compiled binary, no deployed container. It's a design-time abstraction that drives three things: GraphQL schema shape, Cerbos policy structure, and resolver wiring. All three can be updated independently.

### Change Cost Matrix

| Change Type | Cost | What's Involved | Downtime |
|-------------|:----:|-----------------|:--------:|
| **Restructure domain entities** (e.g., nest ShareRegister inside Fund) | Low | Update doc, move resolver wiring, adjust GraphQL schema, update Cerbos YAML | None |
| **Add field to existing entity** | Low | Add resolver + DataLoader call, update GraphQL schema | None |
| **Promote child → aggregate root** (e.g., Dealing becomes independently queryable) | Low | Add `@key` to GraphQL type, add Cerbos resource + policy, add root query | None |
| **Demote aggregate root → child** (e.g., merge entity into parent) | Low | Remove `@key`, remove Cerbos resource, deprecate standalone query | None |
| **Change Cerbos resource boundaries** | Low | YAML policy change, hot-reloadable via Cerbos PDP | None |
| **Add new Cerbos action to existing resource** | Low | YAML policy change + GraphQL `@auth` directive | None |
| **Remove a GraphQL field** | Medium | Deprecation period for API clients → then remove | None |
| **Remove a GraphQL query/type** | Medium | Deprecation period → redirect clients → then remove | None |
| **Add new physical field to PostgreSQL** | Medium | Prisma migration (expand-contract pattern) | None (zero-downtime) |
| **Move field between sources** (e.g., POSTGRES → CHAIN) | High | Data migration, dual-read period, backfill, update resolver routing | Planned |
| **Change on-chain storage layout** | High | Diamond facet upgrade, append-only storage slot rules | Planned |

### Why Domain Model Changes Are Cheap

The domain model sits between two immovable layers and acts as a shock absorber:

```
┌─────────────────────────────────────┐
│  GraphQL API (client-facing)        │  ← Hard to change (clients depend on it)
│  Deprecation cycles required        │
├─────────────────────────────────────┤
│  DOMAIN ENTITY MODEL                │  ← Cheap to change (no runtime artifact)
│  Entity boundaries, relationships,  │
│  aggregate root decisions           │
├─────────────────────────────────────┤
│  Physical storage (chain, DB, API)  │  ← Hard to change (data migration)
│  On-chain layout is append-only     │
└─────────────────────────────────────┘
```

Key reasons:

1. **DataLoaders are source-oriented, not entity-oriented.** `chainLoader.fundInfo(id)` doesn't care whether Fund is an aggregate root or a child. It fetches the same data either way. Entity restructuring doesn't touch DataLoaders.

2. **Resolver logic is just wiring.** Moving a resolver from `ShareRegisterResolvers.entries` to `FundResolvers.shareRegister.entries` is a code move, not a logic change. The underlying data assembly is identical.

3. **Cerbos policies are hot-reloadable YAML.** Changing resource boundaries (merge two resources into one, split one into two) is a policy file edit deployed without code changes.

4. **GraphQL schema changes don't require data migration.** Adding or removing a type/field is a schema change only — the data stays where it is.

### Worked Example: ShareRegister Refactoring

**Before:** ShareRegister is a separate aggregate root.

```
Domain:   ShareRegister (root, @key, Cerbos: share_register)
GraphQL:  query { shareRegister(fundId: "3") { entries { investor, balance } } }
Cerbos:   resource: "share_register", actions: [view]
Resolver: chainLoader.balanceOf(all investors) + prismaLoader.investorProfile(ids)
Storage:  CHAIN (balances) + POSTGRES (investor names)
```

**After:** ShareRegister is a field on Fund.

```
Domain:   Fund.shareRegister (child field, no @key, no Cerbos resource)
GraphQL:  query { fund(id: "3") { shareRegister { entries { investor, balance } } } }
Cerbos:   fund.view_investors (existing action covers it)
Resolver: same chainLoader + prismaLoader calls, attached to Fund type
Storage:  CHAIN (balances) + POSTGRES (investor names) — UNCHANGED
```

**Changes required:**

| Layer | Change | Lines of code |
|-------|--------|:-------------:|
| Physical storage | None | 0 |
| DataLoaders | None | 0 |
| Resolver logic | Move function to Fund resolvers | ~5 |
| GraphQL schema | Remove `ShareRegister` type, add `shareRegister` field to `Fund` | ~10 |
| Cerbos policy | Remove `share_register.yaml`, add action to `fund.yaml` | ~5 |
| Domain model doc | Update entity catalog | ~10 |
| **Total** | | **~30 lines** |

For backwards compatibility, keep the old query working during a transition period:

```graphql
type Query {
  shareRegister(fundId: ID!): ShareRegister @deprecated(reason: "Use fund.shareRegister")
  fund(id: ID!): Fund
}
```

### Rules of Thumb for Production Changes

1. **Keep old GraphQL queries working** — add `@deprecated`, add new queries alongside. Remove after clients migrate. Never break the API contract without a deprecation period.

2. **Cerbos resource boundary changes are free** — hot-reload YAML. No deploy needed. Merge or split resources as the authorization model evolves.

3. **DataLoaders never change for entity restructuring** — they're organized by physical source (chain, postgres, haruko), not by domain entity. This is by design.

4. **The only expensive change is moving data between physical sources** — e.g., "this field used to come from Haruko but now we compute it on-chain." That requires data migration, dual-read periods, and backfill. This is a storage problem, not a domain model problem.

5. **On-chain storage is append-only** — new fields are appended to the end of structs in `AppStorage`. Fields are never removed or reordered. Diamond Proxy (EIP-2535) allows facet upgrades without storage migration.
