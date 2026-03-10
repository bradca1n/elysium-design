# Unified Data Model — Visual Guide

> Six focused diagrams, each answering one question about the Elysium architecture.
> All diagrams render natively in GitHub and VS Code (Mermaid).
>
> **Story flow:** Domain Structure (1-2) → Cross-Source Architecture (3) → Authorization (4) → Implementation (5-6)
>
> Companion to: [Unified_Data_Model.md](./Unified_Data_Model.md) · [Data_Model_v2.md](./Data_Model_v2.md) · [Authorization_System_V1.md](./Authorization_System_V1.md)

---

## Color Legend (consistent across all diagrams)

| Color | Source | Example |
|-------|--------|---------|
| 🟢 Green | **Avalanche Subnet** (on-chain smart contracts) | Fund, Order, Token balances |
| 🔵 Blue | **PostgreSQL** (off-chain structured data) | Investor PII, KYC, Reports |
| 🟠 Orange | **Haruko API** (portfolio management) | Positions, Risk, Shadow NAV |
| 🔴 Red/Pink | **AWS S3** (document storage) | PDFs, reports, raw API responses |
| 🟣 Purple | **AWS Cognito/KMS** (auth & secrets) | JWT, signing keys |
| ⚪ Grey | **Computed** (derived at query time) | Prices, portfolio values |

---

## Part I: Domain Structure

### Diagram 1 — Fund Domain

> **Question answered:** *What is the core fund accounting data structure?*

The fund hierarchy is entirely on-chain. This is the business model — everything else serves it.

```mermaid
erDiagram
    UmbrellaFund ||--o{ Fund : contains
    Fund ||--o{ ShareClass : "has classes"
    ShareClass ||--o{ Dealing : "has dealings"
    Fund ||--o{ Order : "has orders"
    Account ||--o{ Order : "places"
    Fund ||--|| Portfolio : "portfolio (Haruko)"

    UmbrellaFund {
        uint16 id PK "🟢 CHAIN"
        string name
        EntityStatus status
        uint128 minSubscription
    }

    Fund {
        uint16 id PK "🟢 CHAIN"
        string name
        address manager
        uint128 nav
        uint128 totalSupply
        uint128 dilutionRatio
        uint16 reportingCurrency
    }

    ShareClass {
        uint256 tokenId PK "🟢 CHAIN"
        string name
        uint160 mgmtFeeRate
        uint16 denomCurrency
        address perfFeeCalc
    }

    Dealing {
        uint256 tokenId PK "🟢 CHAIN"
        uint128 totalSupply
        uint128 hwm
        uint128 dilutionRatio
    }

    Order {
        uint128 id PK "🟢 CHAIN"
        address investor
        OrderType type
        uint128 amount
        uint256 tokenId
    }

    Account {
        address id PK "🟢 CHAIN"
        address owner
        string name
        bool kycVerified
    }

    Portfolio {
        string fundId PK "🟠 HARUKO"
        BigDecimal gav
        json positions
        json riskMetrics
    }
```

**Key insight:** The entire fund hierarchy (Umbrella → Fund → Class → Dealing) lives on-chain and is queryable at any historical block via `eth_call`. Portfolio data comes from Haruko — the only cross-source link in this domain.

---

### Diagram 2 — Investor & Compliance Domain

> **Question answered:** *What is the investor identity, compliance, and tenant structure?*

This domain is primarily off-chain (PostgreSQL). The bridge to the Fund Domain is through `Account`, which lives on-chain.

```mermaid
erDiagram
    ManagementCompany ||--o{ Investor : "tenant scope"
    ManagementCompany ||--o{ Contract : "tenant scope"
    Investor ||--o{ Account : "owns (cross-source)"
    Investor ||--o{ KYCRecord : compliance
    Investor ||--o{ Document : documents
    Investor ||--o{ BankAccount : banking
    KYCRecord ||--o{ SanctionsScreening : screening
    KYCRecord ||--o{ BeneficialOwnership : UBOs

    ManagementCompany {
        UUID id PK "🔵 POSTGRES"
        string name
        string jurisdiction
        string regulatoryStatus
    }

    Investor {
        UUID id PK "🔵 POSTGRES"
        UUID mgmtCompanyId FK "tenant"
        string legalName "encrypted PII"
        string nationality
        InvestorType type
    }

    Account {
        address id PK "🟢 CHAIN"
        address owner
        bool kycVerified
        bytes2 jurisdiction
    }

    KYCRecord {
        UUID id PK "🔵 POSTGRES"
        KYCStatus status
        RiskTier riskTier
        int riskScore
        timestamp expiresAt
    }

    SanctionsScreening {
        UUID id PK "🔵 POSTGRES"
        ScreeningResult result
        timestamp screenedAt
    }

    BeneficialOwnership {
        UUID id PK "🔵 POSTGRES"
        string name
        float ownershipPct
        bool pepStatus
    }

    Document {
        UUID id PK "🔵 POSTGRES"
        DocumentType type
        AccessTier accessTier
        string s3Key "🔴 S3 file"
    }

    BankAccount {
        UUID id PK "🔵 POSTGRES"
        string bankName
        string currency
        string iban "encrypted"
    }

    Contract {
        UUID id PK "🔵 POSTGRES"
        ContractType type
        ContractStatus status
        string signedDocS3Key "🔴 S3"
    }
```

```mermaid
graph LR
    SAR["🔵 SuspiciousActivityReport<br/><b>DISCONNECTED</b><br/>MLRO + compliance only<br/>No link to Investor graph"]

    style SAR fill:#fadbd8,stroke:#e74c3c,stroke-width:3px,stroke-dasharray: 5 5
```

**Key insight:** The `Account` entity (green/CHAIN) bridges the two domains — it's on-chain but linked to an off-chain `Investor`. SAR is deliberately disconnected from the Investor graph to prevent tipping-off (Criminal Justice Act / BVI AML).

---

## Part II: Cross-Source Architecture

### Diagram 3 — Entity Source Resolution

> **Question answered:** *How does one logical entity unify data from multiple physical sources?*

Four representative entities showing every source pattern in the system. The domain model entity is in the center; colored arrows show where each field comes from.

```mermaid
graph LR
    subgraph CHAIN["🟢 Avalanche Subnet"]
        C_fund["name, nav, totalSupply<br/>dilutionRatio, manager<br/>reportingCurrency"]
        C_acct["owner, kycVerified<br/>jurisdiction, tags"]
        C_order["investor, orderType<br/>amount, tokenId<br/>processingHistory"]
    end

    subgraph POSTGRES["🔵 PostgreSQL"]
        P_meta["domicile, regulatoryRegime<br/>launchDate, fundStructure"]
        P_investor["legalName, nationality<br/>investorType, riskProfile"]
        P_settle["direction, currency<br/>amount, status<br/>expectedValueDate"]
        P_docmeta["type, accessTier<br/>entityType, fileName<br/>generatedAt"]
    end

    subgraph HARUKO["🟠 Haruko API"]
        H_portfolio["gav, positions<br/>cashBalances<br/>riskMetrics"]
    end

    subgraph S3["🔴 AWS S3"]
        S_file["pre-signed download URL<br/>raw file bytes"]
    end

    subgraph COMPUTED["⚪ Computed"]
        X_price["price = nav/totalSupply<br/>adjustedPrice = price/dilution<br/>classPrice, dealingPrice"]
    end

    C_fund -->|"core fields"| FUND
    P_meta -->|"metadata"| FUND
    H_portfolio -->|"portfolio"| FUND
    X_price -->|"derived"| FUND

    P_investor -->|"PII"| INVESTOR
    C_acct -->|"on-chain account"| INVESTOR

    C_order -->|"order data"| ORDER
    P_settle -->|"settlement"| ORDER

    P_docmeta -->|"metadata"| DOCUMENT
    S_file -->|"file"| DOCUMENT

    FUND["<b>Fund</b><br/>3 sources + computed"]
    INVESTOR["<b>Investor</b><br/>2 sources (cross-chain)"]
    ORDER["<b>Order</b><br/>2 sources (cross-domain)"]
    DOCUMENT["<b>Document</b><br/>2 sources (DB + object store)"]

    style CHAIN fill:#d5f5e3,stroke:#27ae60,stroke-width:2px
    style POSTGRES fill:#d6eaf8,stroke:#2980b9,stroke-width:2px
    style HARUKO fill:#fdebd0,stroke:#e67e22,stroke-width:2px
    style S3 fill:#fadbd8,stroke:#e74c3c,stroke-width:2px
    style COMPUTED fill:#f2f3f4,stroke:#95a5a6,stroke-width:2px
    style FUND fill:#fef9e7,stroke:#f39c12,stroke-width:3px
    style INVESTOR fill:#fef9e7,stroke:#f39c12,stroke-width:3px
    style ORDER fill:#fef9e7,stroke:#f39c12,stroke-width:3px
    style DOCUMENT fill:#fef9e7,stroke:#f39c12,stroke-width:3px
```

**Key insight:** The client queries a unified `Fund` entity. The resolver knows (from source annotations) that `name` comes from chain, `domicile` from Postgres, `gav` from Haruko, and `price` is computed. DataLoaders batch and cache these calls. The client never sees the split.

**These four patterns cover ALL entities in the system:**

| Pattern | Example | Sources |
|---------|---------|---------|
| Multi-source aggregate | Fund | CHAIN + POSTGRES + HARUKO + COMPUTED |
| Cross-source identity bridge | Investor ↔ Account | POSTGRES ↔ CHAIN |
| Cross-domain join | Order → Settlement | CHAIN → POSTGRES |
| Metadata + object store | Document | POSTGRES + S3 |

Every other entity follows one of these four patterns.

---

## Part III: Authorization

### Diagram 4a — Derived Role Hierarchy

> **Question answered:** *How does a generic "manager" become authorized for THIS specific fund?*

```mermaid
graph TB
    subgraph BASE["Cognito Base Roles"]
        admin["admin"]
        manager["manager"]
        investor["investor"]
    end

    subgraph DB_ROLES["Derived Roles — resolved in Phase 2 (DB pre-filter)"]
        fund_mgr["<b>fund_manager</b><br/>managerId == P.id"]
        umbrella_mgr["<b>umbrella_manager</b><br/>umbrellaId match"]
        whitelisted["<b>whitelisted_investor</b><br/>whitelistedUserIds ∋ P.id"]
        order_owner["<b>order_owner</b><br/>accountId == P.accountId"]
        doc_grantee["<b>document_grantee</b><br/>granteeIds ∋ P.id"]
        tenant["<b>tenant_member</b><br/>mgmtCompanyId match"]
        kyc_reviewer["<b>kyc_reviewer</b><br/>permission flag"]
        mlro["<b>mlro</b><br/>permission flag"]
    end

    subgraph CHAIN_ROLES["Derived Roles — resolved in Phase 3-4 (chain hydration)"]
        token_holder["<b>token_holder</b><br/>holderBalance > 0<br/>⚡ requires blockchain call"]
    end

    subgraph ALWAYS["Always-On"]
        platform_admin["<b>platform_admin</b><br/>all access"]
    end

    admin --> platform_admin
    admin --> tenant
    manager --> fund_mgr
    manager --> umbrella_mgr
    manager --> kyc_reviewer
    manager --> mlro
    manager --> tenant
    investor --> token_holder
    investor --> whitelisted
    investor --> order_owner
    investor --> doc_grantee
    investor --> tenant

    style BASE fill:#e8daef,stroke:#8e44ad,stroke-width:2px
    style DB_ROLES fill:#d6eaf8,stroke:#2980b9,stroke-width:2px
    style CHAIN_ROLES fill:#d5f5e3,stroke:#27ae60,stroke-width:2px
    style ALWAYS fill:#fef9e7,stroke:#f39c12,stroke-width:2px
```

**Key insight:** Most derived roles use DB conditions (blue) — these become Prisma WHERE clauses that pre-filter 90% of candidates. Only `token_holder` (green) requires a blockchain call, which happens in Phase 3 for the surviving 10%.

---

### Diagram 4b — 4-Phase Authorization Flow

> **Question answered:** *What happens at runtime when a user queries data?*

```mermaid
sequenceDiagram
    actor Client
    participant GQL as GraphQL Server
    participant Cerbos as Cerbos PDP
    participant DB as PostgreSQL
    participant Chain as Blockchain
    participant Haruko as Haruko API

    Client->>GQL: query { visibleFunds { name, nav, portfolio { gav } } }
    Note over GQL: Extract principal from JWT<br/>(Cognito: role=manager, id=0x...)

    rect rgb(230, 240, 255)
        Note over GQL,Cerbos: Phase 1: PLAN
        GQL->>Cerbos: PlanResources(principal, "fund", "view")
        Cerbos-->>GQL: CONDITIONAL — AST with conditions
        Note over GQL: Extract DB-mappable conditions<br/>(managerId, isPublic, whitelistedUsers)
    end

    rect rgb(214, 234, 248)
        Note over GQL,DB: Phase 2: PRE-FILTER
        GQL->>DB: SELECT * FROM funds WHERE<br/>managerId = '0x...' OR isPublic = true
        DB-->>GQL: 12 candidates (from 200 total funds)
        Note over GQL: ~90% eliminated by DB pre-filter
    end

    rect rgb(213, 245, 227)
        Note over GQL,Haruko: Phase 3: HYDRATE (parallel)
        par Chain data
            GQL->>Chain: multicall: balanceOf(12 funds)<br/>dealingOpen(12 funds)<br/>block-pinned
            Chain-->>GQL: Chain attributes for 12 candidates
        and Haruko data
            GQL->>Haruko: POST /v1/portfolios/batch<br/>{fundIds: [12 funds]}
            Haruko-->>GQL: Portfolio data for 12 candidates
        end
    end

    rect rgb(254, 249, 231)
        Note over GQL,Cerbos: Phase 4: DECIDE
        GQL->>Cerbos: CheckResources(principal,<br/>12 candidates with ALL attributes)
        Cerbos-->>GQL: Per-candidate: 8 ALLOW, 4 DENY
        Note over GQL: Filter to 8 allowed funds
    end

    GQL-->>Client: { visibleFunds: [8 funds with name, nav, portfolio] }
```

---

## Part IV: Implementation Guide

### Diagram 5 — Bounded Context Map

> **Question answered:** *How do we organize the codebase? What are the natural service boundaries?*

Each module is color-coded by primary data source. Dotted lines show cross-context dependencies.

```mermaid
graph LR
    subgraph FM["<b>Fund Management</b><br/>🟢 Chain-primary"]
        FM_1["Fund"]
        FM_2["ShareClass"]
        FM_3["Dealing"]
        FM_4["UmbrellaFund"]
        FM_5["FundMetadata 🔵"]
        FM_6["DealingSchedule 🔵"]
    end

    subgraph OP["<b>Order Processing</b><br/>🟢 Chain-primary"]
        OP_1["Order"]
    end

    subgraph IA["<b>Identity & Access</b><br/>🔵🟢 Mixed"]
        IA_1["Investor 🔵"]
        IA_2["Account 🟢"]
        IA_3["MgmtCompany 🔵"]
    end

    subgraph CO["<b>Compliance</b><br/>🔵 Postgres-primary"]
        CO_1["KYCRecord"]
        CO_2["SAR ⛔"]
    end

    subgraph SB["<b>Settlement</b><br/>🔵 Postgres-primary"]
        SB_1["Settlement"]
        SB_2["BankAccount"]
        SB_3["BankTransaction"]
    end

    subgraph DR["<b>Docs & Reporting</b><br/>🔵🔴 Postgres + S3"]
        DR_1["Document"]
        DR_2["Report"]
        DR_3["Contract"]
    end

    subgraph PV["<b>Portfolio</b><br/>🟠 Haruko-primary"]
        PV_1["Portfolio"]
        PV_2["HarukoSnapshot 🔵"]
    end

    subgraph OPS["<b>Operations</b><br/>🔵 Postgres-primary"]
        OPS_1["CorrectionRun"]
        OPS_2["ServiceExecution"]
    end

    %% Cross-context references (dotted = cross-context, bold = cross-source)
    OP_1 -.->|"investor"| IA_2
    OP_1 -.->|"in fund"| FM_1
    OP_1 -.->|"settles via"| SB_1
    IA_1 -.->|"owns"| IA_2
    IA_1 -.->|"compliance"| CO_1
    FM_1 -.->|"portfolio"| PV_1
    FM_1 -.->|"documents"| DR_1
    FM_1 -.->|"corrections"| OPS_1
    DR_2 -.->|"for fund"| FM_1
    SB_1 -.->|"investor"| IA_1

    style FM fill:#d5f5e3,stroke:#27ae60,stroke-width:2px
    style OP fill:#d5f5e3,stroke:#27ae60,stroke-width:2px
    style IA fill:#e8f8f5,stroke:#1abc9c,stroke-width:2px
    style CO fill:#d6eaf8,stroke:#2980b9,stroke-width:2px
    style SB fill:#d6eaf8,stroke:#2980b9,stroke-width:2px
    style DR fill:#fef9e7,stroke:#f39c12,stroke-width:2px
    style PV fill:#fdebd0,stroke:#e67e22,stroke-width:2px
    style OPS fill:#f2f3f4,stroke:#7f8c8d,stroke-width:2px
```

**V1: Modular monolith** — all 8 modules in one GraphQL server. Each module has its own resolvers, DataLoaders, and Cerbos policies.

**Future:** Any module can become an Apollo Federation subgraph by adding `@key` and `__resolveReference`. The dotted cross-context lines become federation entity references.

---

### Diagram 6 — Resolver Pipeline

> **Question answered:** *What is the runtime data-fetching architecture from request to response?*

```mermaid
graph TB
    subgraph REQUEST["Incoming Request"]
        REQ["GraphQL Query<br/>+ JWT token"]
    end

    subgraph AUTH_LAYER["Auth Layer"]
        JWT["JWT → Principal<br/>(Cognito sub, role, groups)"]
        BLOCK["Block pinning<br/>blockNumber = latest"]
    end

    subgraph RESOLVER_LAYER["Resolver Layer"]
        RES["Field resolvers<br/>read source annotations<br/>route to correct DataLoader"]
    end

    subgraph DATALOADER_LAYER["DataLoader Layer (per-request, batched)"]
        DL_C["🟢 chainLoader<br/>multicall batching<br/>all calls at same block<br/>deduplicates across auth + display"]
        DL_P["🔵 prismaLoader<br/>Prisma findMany<br/>RLS auto-applied<br/>tenant-isolated"]
        DL_H["🟠 harukoLoader<br/>REST batch API<br/>master key<br/>post-filtered by auth"]
        DL_S["🔴 s3Loader<br/>pre-signed URL generation<br/>time-limited access"]
    end

    subgraph SOURCES["Physical Sources"]
        S_C["🟢 Avalanche Subnet<br/>eth_call(block=N)"]
        S_P["🔵 PostgreSQL<br/>+ Row Level Security"]
        S_H["🟠 Haruko API<br/>REST endpoints"]
        S_S["🔴 AWS S3<br/>object storage"]
    end

    REQ --> JWT
    JWT --> BLOCK
    BLOCK --> RES

    RES -->|"CHAIN fields"| DL_C
    RES -->|"POSTGRES fields"| DL_P
    RES -->|"HARUKO fields"| DL_H
    RES -->|"S3 fields"| DL_S

    DL_C --> S_C
    DL_P --> S_P
    DL_H --> S_H
    DL_S --> S_S

    style REQUEST fill:#f5f5f5,stroke:#333,stroke-width:2px
    style AUTH_LAYER fill:#e8daef,stroke:#8e44ad,stroke-width:2px
    style RESOLVER_LAYER fill:#fef9e7,stroke:#f39c12,stroke-width:2px
    style DATALOADER_LAYER fill:#eaf2f8,stroke:#2c3e50,stroke-width:2px
    style SOURCES fill:#f0e6f6,stroke:#8e44ad,stroke-width:1px
    style DL_C fill:#d5f5e3,stroke:#27ae60
    style DL_P fill:#d6eaf8,stroke:#2980b9
    style DL_H fill:#fdebd0,stroke:#e67e22
    style DL_S fill:#fadbd8,stroke:#e74c3c
```

**Key properties:**
- **Block pinning:** All chain reads use the same block → atomic snapshot per request
- **Cache sharing:** Auth hydration (Phase 3) and display resolvers share the same DataLoader instances → no duplicate fetches
- **Tenant isolation:** PostgreSQL RLS enforces `management_company_id` filtering automatically
- **Source transparency:** Resolvers don't know (or care) about physical sources — they call `ctx.loaders.{source}.{entity}.load(id)`

---

## Quick Reference

### Entity Source Matrix

| Entity | 🟢 Chain | 🔵 Postgres | 🟠 Haruko | 🔴 S3 | Cerbos Resource |
|--------|:--------:|:-----------:|:---------:|:-----:|:---------------:|
| **Fund** | **primary** | metadata | — | — | `fund` |
| **ShareClass** | **primary** | — | — | — | `share_class` |
| **Dealing** | **primary** | — | — | — | *(child)* |
| **UmbrellaFund** | **primary** | — | — | — | `umbrella_fund` |
| **Order** | **primary** | settlement | — | — | `order` |
| **Account** | **primary** | investor link | — | — | `account` |
| **Investor** | — | **primary** | — | — | `investor` |
| **Portfolio** | — | snapshots | **primary** | — | `portfolio` |
| **Document** | — | **metadata** | — | **files** | `document` |
| **KYCRecord** | — | **primary** | — | docs | `kyc_record` |
| **SAR** | — | **primary** | — | — | `sar` |
| **Report** | — | **primary** | — | generated | `report` |
| **Settlement** | — | **primary** | — | — | `settlement` |
| **Contract** | — | **primary** | — | signed | `contract` |
| **CorrectionRun** | — | **primary** | — | — | `correction_run` |
| **MgmtCompany** | — | **primary** | — | — | `mgmt_company` |

### Aggregate Root Decision

| Is it an aggregate root? | Test | Examples |
|--------------------------|------|----------|
| **Yes** — independently fetchable by ID | Can a client query this by ID without knowing its parent? | Fund, Investor, Order, Document |
| **No** — always accessed via parent | Does this entity only make sense in context of its parent? | Dealing (→ShareClass), Position (→Portfolio), FeeMint (→ShareClass) |
| **Disconnected** — no graph traversal path | Must this entity be unreachable from certain graph paths? | SAR (no link to Investor) |
