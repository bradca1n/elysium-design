# Authorization Architecture Review

> Definitive reference for Elysium's authorization architecture. Evaluates 10+ authorization technologies, designs the AuthQueryEngine pattern for hybrid on-chain/off-chain/external data, and recommends Cerbos + Postgres + GraphQL as the day-one architecture.
>
> Date: 2026-02-11 (Final) | Revised: 2026-02-16
>
> **Revision Notes (2026-02-16):** Updated OPA evaluation (v1.9.0 now has native SQL compilation + official Prisma adapter); strengthened Oso Cloud rejection (`listLocal` doesn't support context facts); rewrote AST splitting logic with progressive OR short-circuit evaluation and fail-safe `stripNonDb` implementation; added Section 4.10 (Implementation Complexity) covering AST splitter size, multicall cost analysis, and cost classification model; re-confirmed Cerbos recommendation.

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Core Authorization Concepts](#2-core-authorization-concepts)
3. [Technology Evaluation](#3-technology-evaluation)
4. [The AuthQueryEngine Pattern](#4-the-authqueryengine-pattern)
5. [GraphQL Integration](#5-graphql-integration)
6. [Elysium-Specific Architecture](#6-elysium-specific-architecture)
7. [The Established Industry Pattern](#7-the-established-industry-pattern)
8. [Recommended Architecture](#8-recommended-architecture)
9. [Migration Path](#9-migration-path)
10. [Key Decisions & Trade-offs](#10-key-decisions--trade-offs)

---

## 1. Executive Summary

### Problem

Elysium needs an authorization system that handles:

- **Multi-level permissions**: platform admin > umbrella manager > fund manager > class manager > investor
- **Hybrid data sources**: relationships in Postgres, token state on blockchain, portfolio data in Haruko, identity in Cognito
- **Dynamic access**: token holdings change on every transfer, authorization must reflect current state
- **List filtering**: "what funds can this user see?" (not just "can user X see fund Y?")
- **Field-level granularity**: same fund, different fields visible to different roles (metadata vs positions vs transaction history)
- **No data duplication**: on-chain data (blockchain) must never be copied to authorization stores

### Recommendation

**Cerbos PDP + Postgres + AuthQueryEngine + GraphQL.**

Cerbos is chosen over Cedar, OPA, and other engines for four durable architectural reasons:

1. **Derived roles** — context-aware role elevation computed at evaluation time (e.g., `investor` → `token_holder` when balance > 0). No other engine has this as a first-class concept.
2. **Flat infrastructure pricing** — deployed as a sidecar on ECS Fargate (~$15/mo regardless of volume). GraphQL field-level checks multiply authorization calls; per-call pricing (Cedar at $5-150/1M) becomes expensive.
3. **Hierarchy functions** — built-in `ancestorOf`/`descendantOf` for organizational path traversal, avoiding SpiceDB for moderate hierarchy depth.
4. **PlanResources API** — generates query plan ASTs that convert to database WHERE clauses, eliminating policy-query duplication for list filtering. The structured AST is inspectable and splittable by data source — critical for the AuthQueryEngine pattern with hybrid DB/blockchain/API data. Prisma adapter exists today via `@cerbos/orm-prisma`; if we migrate ORMs, the AST is engine-agnostic and other adapters can be written.

**Note (updated 2026-02-16):** OPA v1.9.0 (Sep 2025) closed the Prisma adapter gap with `@open-policy-agent/ucast-prisma` and native SQL compilation. However, Cerbos remains recommended due to derived roles (first-class vs DIY), lower learning curve (YAML+CEL vs Rego), and the structured PlanResources AST that enables the AuthQueryEngine's condition splitting. Oso Cloud's `listLocal` was found to explicitly not support context facts, making it unsuitable for hybrid blockchain/DB authorization. See Sections 3.3, 3.5, and 10.1 for details.

For data that can't live in SQL (blockchain state, Haruko portfolio data), the **AuthQueryEngine** pattern splits Cerbos query plans into DB-resolvable conditions (pushed to Prisma) and deferred conditions (resolved in parallel via registered batch handlers for blockchain multicalls and Haruko API calls), then reunifies the results. All external data is post-filtered — even if a master API key fetches more than the user can see, only authorized results are returned.

Migrate relationship storage to **SpiceDB** if/when the organization hierarchy deepens beyond 2 hops. Cerbos stays as the policy engine — no policy migration needed.

### Key Insight

No single system handles both point checks and list filtering with dynamic per-resource context from heterogeneous data sources. The architecturally correct solution is a **data federation layer** (the AuthQueryEngine) that:
1. Gets a query plan from the policy engine (Cerbos PlanResources)
2. Splits it into DB-resolvable vs external-resolvable conditions
3. Pre-filters via Prisma for DB conditions
4. Batch-resolves external data (blockchain + Haruko) in parallel for remaining conditions
5. Evaluates deferred conditions via Cerbos batch check
6. Returns unified, post-filtered results

AuthQueryEngine is wired to **every list field** in the GraphQL schema by default. When a list has no restrictions, Cerbos returns `KIND_ALWAYS_ALLOWED` in <1ms and the engine short-circuits to a simple query. This makes the universal wiring nearly free while ensuring all permission changes are pure policy updates — no code deploys needed.

The attribute registry is **config-driven**: blockchain attributes are defined in YAML using ABI function signatures as a self-describing codec. Adding a new blockchain attribute (e.g., NFT gate, new fee type) requires only a registry entry + Cerbos policy — zero code, zero deploy. Auth and display resolvers share the same DataLoader cache, so data fetched for authorization is reused for the GraphQL response with no duplication. See Section 5.9 for the full generic resolver architecture.

This is the same pattern Google Drive uses (search index → batch Zanzibar Check), extended for multiple external data sources and made fully policy-driven.

### Technology Landscape Summary

| Technology | Type | List Filtering | Best For | Elysium Fit |
|-----------|------|---------------|----------|-------------|
| **Cerbos** | Policy engine (sidecar) | **PlanResources → Prisma** | App authz with query plans | **RECOMMENDED** |
| Cedar (AVP) | Policy engine (managed) | None | Simple point checks, AWS-native | Good for point checks, bad for lists |
| OPA | Policy engine (general) | Partial eval → native SQL/Prisma (v1.9+) | K8s + infra policy | Strong alternative, steep Rego learning curve |
| SpiceDB | Relationship store | LookupResources | Deep hierarchies, graph traversal | Future — when hierarchy deepens |
| OpenFGA | Relationship store | ListObjects | ReBAC at scale | Alternative to SpiceDB |
| Oso Cloud | Policy engine (SaaS) | listLocal → SQL (no context facts) | ORM-integrated authz | Weak — listLocal can't use external data |
| Casbin | Policy library (embedded) | None | Multi-language embedded | Too limited for list filtering |
| Permit.io | Meta-framework | Via underlying engine | Enterprise UI + multi-engine | More abstraction than needed |
| Topaz/Aserto | OPA + Zanzibar bundle | Via both engines | Combined policy + relationships | Interesting but OPA complexity |
| WorkOS FGA | Managed Zanzibar | TBD (Q1 2026) | Part of broader auth platform | Too early |

---

## 2. Core Authorization Concepts

### 2.1 The PARC Model

Every authorization decision has four inputs:

| Element | What It Is | Example |
|---------|-----------|---------|
| **P**rincipal | Who is requesting | `User::"alice"`, `ServiceAccount::"api-v2"` |
| **A**ction | What operation | `Action::"viewMetadata"`, `Action::"placeOrder"` |
| **R**esource | Target of the action | `Fund::"fund-001"`, `Holding::"alice:fund-001"` |
| **C**ontext | Request metadata | IP address, MFA status, token balance, timestamp |

### 2.2 Point Checks vs List Filtering

| Operation | Question | Example |
|-----------|----------|---------|
| **Point check** | "Can user X do action Y on resource Z?" | "Can alice view fund-A's NAV?" |
| **List filtering** | "What resources can user X access?" | "What funds can alice see?" |

Point checks are straightforward in all authorization systems. List filtering is the hard problem — it requires either pre-computing the answer (relationship index), generating database queries from policies (query plans), or querying candidates then filtering.

**This distinction is the decisive factor in technology selection.** See Section 3.7 for a detailed comparison.

### 2.3 Authorization Models

| Model | How Decisions Work | Example |
|-------|-------------------|---------|
| **RBAC** (Role-Based) | User has role → role has permissions | "Managers can view positions" |
| **ABAC** (Attribute-Based) | Attributes on user/resource/context determine access | "Users with balance > 1000 get premium tier" |
| **ReBAC** (Relationship-Based) | Graph of relationships determines access | "Alice manages Fund-A which is in Umbrella-1, so Alice can see Umbrella-1 reports" |

Elysium needs all three: RBAC for platform roles, ABAC for dynamic conditions (token balance, MFA), ReBAC for organizational hierarchy. Most engines support combinations.

### 2.4 Static Rules vs Dynamic Context

| Data Type | Where It Lives | How Often It Changes | Examples |
|-----------|---------------|---------------------|----------|
| **Policies** (rules) | Authorization engine | Rarely (business rule changes) | "Holders with balance > 1000 can view NAV" |
| **Identity** (who you are) | Cognito/OIDC | At signup, role changes | User ID, groups, attributes |
| **Relationships** (who is connected to what) | Database or SpiceDB | On explicit user actions | Whitelists, friendships, invitations |
| **Dynamic state** (current facts) | Blockchain, computed | Continuously | Token balance, tenure, MFA status |
| **External aggregations** | Haruko / external APIs | On-demand | Portfolio positions, trades, risk parameters |

### 2.5 Default-Deny Decision Logic

Both Cedar and Cerbos use default-deny:

1. If **any deny/EFFECT_DENY** matches → **DENY** (always wins)
2. If **at least one allow/EFFECT_ALLOW** matches and no deny → **ALLOW**
3. If **nothing matches** → **DENY** (implicit deny)

---

## 3. Technology Evaluation

### 3.1 Cerbos (RECOMMENDED)

**What it is:** A purpose-built authorization engine deployed as a sidecar or standalone service. Policies written in human-readable YAML with CEL (Common Expression Language) conditions. Stateless — evaluates policies against data pushed by the application.

**Architecture:**
- **PDP (Policy Decision Point)**: Open-source, stateless evaluation engine
- **Cerbos Hub** (commercial): Managed control plane for policy distribution, testing, CI/CD
- Deployment: Docker sidecar, standalone service, or embedded library
- 17x faster than OPA (built custom engine, moved away from OPA internals)

**Policy syntax (YAML + CEL):**

```yaml
apiVersion: api.cerbos.dev/v1
resourcePolicy:
  resource: "fund"
  version: "default"
  importDerivedRoles:
    - fund_roles
  rules:
    - actions: ["view_metadata"]
      effect: EFFECT_ALLOW
      derivedRoles: ["fund_manager", "umbrella_manager", "token_holder", "whitelisted"]

    - actions: ["view_positions"]
      effect: EFFECT_ALLOW
      derivedRoles: ["fund_manager", "umbrella_manager"]

    - actions: ["view_positions"]
      effect: EFFECT_DENY
      roles: ["investor"]
      condition:
        match:
          expr: P.attr.accessLevel != "full"
```

**Derived roles (context-aware role elevation):**

```yaml
apiVersion: api.cerbos.dev/v1
derivedRoles:
  name: fund_roles
  definitions:
    - name: fund_manager
      parentRoles: ["manager"]
      condition:
        match:
          expr: R.attr.managerId == P.id

    - name: umbrella_manager
      parentRoles: ["manager"]
      condition:
        match:
          expr: R.attr.umbrellaId == P.attr.umbrellaId

    - name: token_holder
      parentRoles: ["investor"]
      condition:
        match:
          expr: P.attr.holderBalance > 0

    - name: whitelisted
      parentRoles: ["investor"]
      condition:
        match:
          expr: R.attr.whitelistedUserIds.contains(P.id)
```

**Key APIs:**

| API | Purpose | For Elysium |
|-----|---------|-------------|
| `CheckResource` | Point check: can user X do action on resource Y? | Field-level auth, @auth directive |
| `CheckResources` | Batch: check multiple resources in one call | Phase 6 of AuthQueryEngine |
| `PlanResources` | Generate query conditions for list filtering | Phase 1 of AuthQueryEngine → Prisma |

**PlanResources — query plan generation:**

Returns one of three results:
- `KIND_ALWAYS_ALLOWED` — user can see everything (e.g., platform admin)
- `KIND_ALWAYS_DENIED` — user can see nothing
- `KIND_CONDITIONAL` — AST of conditions that resources must satisfy

The AST is converted to Prisma WHERE clauses via `@cerbos/orm-prisma`:

```typescript
import { queryPlanToPrisma, PlanKind } from "@cerbos/orm-prisma";

const result = queryPlanToPrisma({
  queryPlan,
  fieldNameMapper: {
    "request.resource.attr.isPublic": "isPublic",
    "request.resource.attr.umbrellaId": "umbrellaId",
    "request.resource.attr.managerId": "managerId",
  }
});

if (result.kind === PlanKind.CONDITIONAL) {
  const funds = await prisma.fund.findMany({ where: result.filters });
  // → { OR: [{ isPublic: true }, { umbrellaId: "umb-123" }] }
}
```

**CEL built-in functions:**

| Category | Functions | Example |
|----------|-----------|---------|
| Hierarchy | `ancestorOf`, `descendantOf`, `immediateChildOf` | `hierarchy(P.attr.orgPath).ancestorOf(hierarchy(R.attr.orgPath))` |
| Time | `now()`, `timeSince()`, `duration()` | `now() < timestamp(R.attr.deadline)` |
| IP | `inIPAddrRange()` | `P.attr.ip.inIPAddrRange("10.0.0.0/8")` |
| Sets | `intersect()`, `has_intersection()`, `is_subset()` | `has_intersection(P.attr.teams, R.attr.allowedTeams)` |
| Existence | `has()` | `has(R.attr.optionalField)` |

**Critical limitation:** Cerbos does NOT fetch data from external sources. ALL data must be pushed by the application in the request. No built-in blockchain, database, or API calls from within policies. This is by design (speed + predictability) and is addressed by the AuthQueryEngine pattern (Section 4).

**Strengths:** Derived roles (context-aware elevation), flat infrastructure pricing, hierarchy functions, PlanResources + Prisma adapter, sub-millisecond evaluation, YAML readability, batch checks, GitOps-friendly, Cerbos Hub for team management.

**Limitations:** Must run PDP infrastructure (ECS Fargate), no formal policy analysis (Cedar has this), limited ReBAC (not a graph database), no AWS CloudTrail integration (custom audit logging needed).

### 3.2 Cedar (AWS Verified Permissions)

**What it is:** A purpose-built authorization policy language created by AWS. Stateless — evaluates policies against request data, stores nothing about users or relationships.

**Policy syntax:**

```cedar
permit(principal in App::Group::"fundManagers", action, resource);

permit(principal, action == App::Action::"viewMetadata", resource)
when { context.balance > 0 };

forbid(principal, action == App::Action::"placeOrder", resource)
unless { context.mfaVerified };
```

**Deployment options:**

| Option | Latency | Ops Burden |
|--------|---------|------------|
| AWS Verified Permissions (managed) | ~5-15ms via PrivateLink | Zero |
| Self-hosted Cedar SDK (Rust/WASM) | <1ms in-process | You manage policy storage |

**Pricing (Verified Permissions):**

| API | Cost |
|-----|------|
| Single auth (`isAuthorized`) | $5 / 1M requests |
| Batch auth (`batchIsAuthorized`) | $150 / 1M (first 40M), tiered down |
| Policy management (CRUD) | $40 / 1M |

**Strengths:** Managed service (zero ops), rich `when`/`unless` expressions, native AWS integration (Cognito, API Gateway, CloudTrail), formal policy analysis ("can user X ever reach resource Y?"), human-readable syntax.

**Limitations:** **Cannot generate query plans** — no PlanResources equivalent. This means every list-filtering endpoint requires manually written DB queries that duplicate policy logic. Also: no reverse lookup, no relationship storage, per-call pricing adds up with GraphQL field-level checks.

**Why not chosen for Elysium:** The lack of query plans means "accepted trade-off" of policy-query duplication. With 3-5 list endpoints this is manageable, but with Cerbos's PlanResources this duplication is eliminated entirely. Cedar remains a strong alternative if formal policy analysis or zero-ops managed service is the top priority.

### 3.3 OPA (Open Policy Agent)

**What it is:** General-purpose policy engine using the Rego language. CNCF graduated project. Used broadly for Kubernetes admission control, Terraform validation, and application authorization.

**Policy syntax (Rego):**

```rego
allow {
    input.user.role == "manager"
    data.funds[input.resource.fund_id].umbrella_id == input.user.umbrella_id
}
```

**Partial evaluation (Compile API):** OPA can partially evaluate policies with "unknowns" and return residual conditions as an AST. As of **OPA v1.9.0 (Sep 2025)**, the previously Enterprise-only SQL compilation was open-sourced — the `/v1/compile/filters` endpoint now natively generates PostgreSQL, MySQL, SQLite, and SQL Server WHERE clauses. An official **`@open-policy-agent/ucast-prisma`** package converts UCAST (Universal Conditions AST) output into Prisma `where` objects.

```typescript
import { OPAClient } from "@open-policy-agent/opa";

const opa = new OPAClient("http://localhost:8181");
const { query, mask } = await opa.getFilters("filters/include", { user }, "funds");
// `query` is directly usable as a Prisma where clause
const funds = await prisma.fund.findMany({ where: query });
```

OPA also supports fetching external data during **full** evaluation via `http.send` (HTTP calls from within Rego policies) and data bundles. However, `http.send` only works for point checks — during partial evaluation, external data must be provided as known input, not resolved dynamically. This means the same two-phase pattern (resolve blockchain data first, then partial-evaluate with DB unknowns only) is required.

**Strengths:** General-purpose (infra + app), CNCF graduated, large community, Kubernetes-native, partial evaluation with native SQL compilation, official Prisma adapter, column masking.

**Limitations:** Steep Rego learning curve (1-2 weeks vs 1-2 days for Cerbos YAML+CEL), no derived roles (must be built manually in Rego), OPA founders hired by Apple acqui-hire (Aug 2025) — though project remains actively maintained under CNCF governance (5 minor releases in 4 months post-acqui-hire). Partial evaluation cannot split conditions across heterogeneous data sources (GitHub Issue #855, open since Jan 2022, inactive).

**Why not chosen for Elysium:** Rego's learning curve remains the primary barrier. While the Prisma adapter gap is now closed, Cerbos offers derived roles as a first-class concept (critical for Elysium's `token_holder`, `fund_manager` dynamic elevation), lower learning curve, and a structured PlanResources AST that integrates cleanly with the AuthQueryEngine's condition splitting. OPA is the strongest alternative if Rego expertise exists on the team.

### 3.4 Zanzibar / SpiceDB

**What it is:** Google Zanzibar is a relationship-based authorization system. SpiceDB is the leading open-source implementation. Unlike policy engines, it **stores relationships** in a graph database and supports graph traversal.

**Schema syntax (SpiceDB):**

```zed
definition user {}

caveat has_balance(balance int, threshold int) {
    balance >= threshold
}

definition fund {
    relation manager: user
    relation whitelisted: user
    relation investor: user with has_balance

    permission view_metadata = manager + whitelisted + investor
    permission view_positions = manager
}
```

**Key APIs:**

| API | Purpose | In Original Zanzibar Paper? |
|-----|---------|---------------------------|
| `Check` | "Can user X access resource Y?" | Yes |
| `LookupResources` | "What resources can user X access?" | **No** (added by SpiceDB) |
| `LookupSubjects` | "Who can access resource Y?" | No |
| `Write` | Add/remove relationship | Yes |
| `Watch` | Stream permission changes | Yes |

**LookupResources limitation:** Requires a single context per request. Per-resource dynamic context (different balance per fund) doesn't compose. For list filtering with dynamic per-resource data, you're back to DB queries + batch checks.

**Strengths:** Stores relationships, graph traversal for inheritance, caveats for dynamic context, Watch API, proven at Google scale.

**Limitations:** LookupResources doesn't handle per-resource dynamic context. Operational overhead. Not a policy engine — can't express complex business rules. Best combined with a policy engine (Cerbos) rather than used alone.

**Role in Elysium:** Future relationship store when hierarchy deepens beyond 2 hops. Cerbos stays as policy engine.

### 3.5 Oso Cloud

**What it is:** Authorization-as-a-service with Polar policy language. The open-source Oso library was deprecated in Dec 2023; the company pivoted to Oso Cloud (managed service, active as of 2026, v2.5.1 Jan 2026).

**Key feature — `listLocal`:** Generates SQL conditions from policies via a YAML data-bindings config that maps Polar predicates to SQL queries against your local database. Returns raw SQL string fragments. Also offers `list()` which returns authorized resource IDs directly (all evaluation in Oso Cloud). A self-hosted option exists (AWS-only, private beta as of May 2025).

**Pricing:** Free (100K events/mo), $500/mo Startup (1M events, 99.95% SLA), Enterprise custom.

**Strengths:** SQL generation from policies, managed service with edge nodes (~7-10ms latency), clean Polar syntax, active development (pivoting toward AI agent authorization).

**Limitations:** No Prisma adapter — `listLocal` returns raw SQL strings requiring `$queryRawUnsafe` (bypasses Prisma's type safety); `list()` returns IDs usable with `{ in: [...] }` but requires all facts synced to Oso Cloud. **Critical for Elysium: `listLocal()` explicitly does not support context facts** — blockchain/external data cannot participate in SQL generation at all. This is a harder limitation than network latency: even with self-hosted deployment, you cannot push on-chain conditions into the list filter. Additionally, `listLocal` returns an opaque SQL string (not an inspectable AST like Cerbos PlanResources), so conditions cannot be split by data source for the AuthQueryEngine pattern. PostgreSQL-only (minimum 14.10).

**Why not chosen for Elysium:** The `listLocal` comparison to Cerbos PlanResources is misleading — PlanResources returns a structured, inspectable AST that the AuthQueryEngine can split into DB-resolvable vs deferred conditions, while `listLocal` returns an opaque SQL string. More critically, `listLocal`'s lack of context fact support means blockchain state can never participate in list filtering — forcing all on-chain authorization into a separate post-filter layer with no engine integration. The SaaS dependency (even with self-hosted beta) and lack of Prisma adapter compound this.

### 3.6 Other Notable Technologies

**Casbin** — Embedded authorization library supporting 11+ languages and the most access control models (ACL, RBAC, ABAC, ReBAC, PBAC, etc.). Great for polyglot environments. But: no query plan generation, no partial evaluation. Point checks only. Proposed for Apache Incubator (2026). Managed option via Casdoor ($35M funding, Feb 2025).

**Permit.io** — Meta-framework built on OPA + OPAL. Provides UI + SDK layer on top of OPA/Cedar. RBAC/ABAC/ReBAC. Strong AI-agent security story. Good if you want managed enterprise features, but adds abstraction on top of OPA.

**Topaz/Aserto** — Combines OPA (Rego) with a built-in Zanzibar-inspired relationship directory. OPA + SpiceDB in one binary. ~1ms decisions. Interesting architecture, but inherits OPA's Rego complexity.

**OpenFGA** — Auth0/Okta's Zanzibar implementation, CNCF incubation. Pure ReBAC. Used by Grafana Labs, Docker, Canonical. Best if relationships are the primary model. Alternative to SpiceDB.

**Permify** — Zanzibar implementation supporting RBAC/ABAC/ReBAC. Acquired by FusionAuth (2026). Good open-source option.

**WorkOS FGA** — WorkOS acquired Warrant. Part of a bigger auth platform (SSO, SCIM, CIAM). FGA endpoints coming Q1 2026. Too early to evaluate.

### 3.7 Comprehensive Comparison Matrix

| Capability | Cerbos | Cedar (AVP) | OPA | SpiceDB | Oso Cloud | Casbin |
|-----------|--------|-------------|-----|---------|-----------|--------|
| **Deployment** | Sidecar/Service | Managed/Embedded | Sidecar/Service | Service/Managed | SaaS + local | Embedded library |
| **Policy language** | YAML + CEL | Cedar DSL | Rego | Schema DSL | Polar | CONF + matchers |
| **Learning curve** | Low | Low | High | Medium | Low | Medium |
| **Point checks** | Excellent | Excellent | Excellent | Excellent | Excellent | Excellent |
| **List filtering** | **PlanResources** | **None** | **Partial eval → native SQL** | LookupResources (limited) | **listLocal** (no context facts) | **None** |
| **Query plan → ORM** | **Prisma adapter** | No | **Prisma adapter** (`ucast-prisma`) | No | Raw SQL only (no Prisma) | No |
| **RBAC** | Yes | Yes | DIY | Via relationships | Yes | Yes |
| **ABAC** | Yes (CEL) | Yes (when/unless) | Yes (Rego) | Caveats (CEL) | Yes | Partial |
| **ReBAC** | Limited | No | DIY | **Native** | Yes | Yes |
| **Relationship storage** | None | None | None | **Yes (graph)** | None | None |
| **Hierarchy functions** | `ancestorOf/descendantOf` | No | DIY | **Native graph** | No | No |
| **Derived roles** | **Yes** | No | DIY | Via schema | No | No |
| **Managed service** | Cerbos Hub | AVP ($5/1M) | Styra (sunsetting) | AuthZed | Oso Cloud ($500/mo) | Casdoor |
| **Formal analysis** | No | **Yes** | No | Limited | No | No |
| **AWS integration** | Manual | **Native** | Manual | Manual | Manual | Manual |
| **Audit trail** | Custom | CloudTrail | Custom | Built-in | Built-in | Custom |
| **Per-check cost** | Infrastructure only | $5-150/1M | Infrastructure only | Infrastructure only | Events-based | Free |
| **Batch checks** | CheckResources | batchIsAuthorized | Custom | Bulk Check | Bulk API | Enforce loops |
| **Community** | Growing (4yr) | AWS-backed (2yr) | **CNCF graduated (8yr)** | Active (5yr) | Active (8yr) | **Apache proposal (8yr)** |

---

## 4. The AuthQueryEngine Pattern

### 4.1 Problem Statement

Authorization data in Elysium comes from multiple sources:
- **PostgreSQL**: whitelists, invitations, fund metadata, user profiles
- **Blockchain**: token balances, management fees, NAV per share, dealing schedules
- **Haruko**: portfolio positions, trades, risk parameters (accessed via master API key)
- **Future: SpiceDB**: organizational hierarchy relationships

A policy may reference data from any combination of these sources. Cerbos PlanResources can generate Prisma WHERE clauses for DB-stored data, but blockchain and Haruko data can't be in a SQL WHERE clause. We need a unified flow that handles all sources transparently.

### 4.2 Core Design

The AuthQueryEngine is a **data federation layer for authorization** — the same concept as GraphQL's resolver pattern, applied to authorization predicates.

```
Cerbos PlanResources
        │
        ▼
  ┌─────────────┐
  │  AST Split   │  ← knows which attrs are DB vs blockchain vs API
  └──┬───────┬───┘
     │       │
     ▼       ▼
  DB part   Deferred conditions (external unknowns)
     │       │
     ▼       │
  Prisma     │
  query      │
     │       │
     ▼       │
  Candidates ─┼──► For each candidate, batch-resolve unknowns
              │    in PARALLEL via registered handlers
              │    (blockchain multicall + Haruko API)
              ▼
         Hydrated candidates
              │
              ▼
         Cerbos batch check (with full attributes)
              │
              ▼
         Final filtered results (post-filtered — user sees only allowed data)
```

### 4.3 Attribute Registry

Each resource attribute is declared with its source and resolution strategy. The registry is the single place where ALL attributes are defined — both for authorization (Cerbos conditions) and display (GraphQL resolvers) can reference it.

#### 4.3.1 Config-Driven Registry (Recommended for Blockchain)

Because every EVM view call follows the same shape — `(address, functionSignature, params) → ABI-decoded result` — blockchain attributes can be declared entirely in configuration. The ABI function signature is a self-describing codec: it contains everything needed to encode parameters and decode return values at runtime, with no generated TypeScript bindings required.

```yaml
# config/attribute-registry.yaml
attributes:
  # DB attributes → pushed to Prisma WHERE clause
  isPublic:       { source: db, prismaField: "isPublic" }
  umbrellaId:     { source: db, prismaField: "umbrellaId" }
  managerId:      { source: db, prismaField: "managerId" }
  status:         { source: db, prismaField: "status" }

  # Blockchain attributes → generic resolver (zero code per attribute)
  holderBalance:
    source: blockchain
    target: "{{resource.attr.contractAddress}}"
    call:
      function: "balanceOf(address)"
      params: ["{{principal.attr.walletAddress}}"]
      returns: "uint256"

  managementFee:
    source: blockchain
    target: "{{resource.attr.contractAddress}}"
    call:
      function: "getManagementFee()"
      params: []
      returns: "uint256"

  # Adding a new blockchain attribute = add entry here + Cerbos policy. Zero code.
  # Example: NFT gate
  hasNFT:
    source: blockchain
    target: "{{resource.attr.nftContract}}"
    call:
      function: "balanceOf(address,uint256)"
      params: ["{{principal.attr.walletAddress}}", "{{resource.attr.nftTokenId}}"]
      returns: "uint256"
    transform: { gt: 0 }  # uint256 → boolean

  # Haruko API attributes → per-endpoint resolver (semi-generic, see Section 5.9.3)
  hasOpenPositions:
    source: api
    endpoint: "/portfolios/{{resource.attr.harukoPortfolioId}}/positions"
    transform: { count_gt: 0 }

  riskLevel:
    source: api
    endpoint: "/portfolios/{{resource.attr.harukoPortfolioId}}/risk"
    transform: { pick: "level" }
```

The generic blockchain resolver handles all `source: blockchain` entries identically:

```typescript
class GenericBlockchainResolver {
  private loader: DataLoader<CallSpec, unknown>;

  constructor(private registry: AttributeRegistry) {
    this.loader = new DataLoader(async (calls: CallSpec[]) => {
      // ONE multicall batches ALL blockchain attribute reads
      const results = await multicall.aggregate(
        calls.map(c => ({
          target: c.target,
          callData: encodeFunctionData(c.functionSig, c.params),
        }))
      );
      return results.map((raw, i) =>
        decodeFunctionResult(calls[i].returnType, raw)
      );
    }, {
      cacheKeyFn: (c) => `${c.target}:${c.functionSig}:${c.params.join(",")}`,
    });
  }

  async resolve(attrName: string, resource: Resource, principal: Principal) {
    const def = this.registry.get(attrName);
    const target = interpolate(def.target, { resource, principal });
    const params = def.call.params.map(p => interpolate(p, { resource, principal }));

    const raw = await this.loader.load({
      target, functionSig: def.call.function, params, returnType: def.call.returns,
    });
    return def.transform ? applyTransform(def.transform, raw) : raw;
  }
}
```

Template interpolation is restricted to known paths (`resource.attr.*`, `resource.id`, `principal.attr.*`, `principal.id`) to prevent injection. The registry is validated at startup against an allowlist of contract addresses and function signatures.

#### 4.3.2 Code-Driven Registry (For Complex Resolvers)

For attributes that need custom logic beyond a simple view call (e.g., combining multiple API responses, complex transformations), the code-driven approach is still available:

```typescript
const fundAttrRegistry: Record<string, AttrDefinition> = {
  // DB attributes (same in both approaches)
  "request.resource.attr.isPublic":     { source: "db", prismaField: "isPublic" },
  "request.resource.attr.umbrellaId":   { source: "db", prismaField: "umbrellaId" },

  // Blockchain — delegates to generic resolver (config-driven under the hood)
  "request.resource.attr.holderBalance": {
    source: "blockchain",
    batchResolver: (ctx) => ctx.genericResolver.batchResolve("holderBalance", ctx),
  },

  // Haruko — per-endpoint with custom transformation
  "request.resource.attr.hasOpenPositions": {
    source: "api",
    batchResolver: async (ctx) => {
      const positions = await haruko.batchGetPositions(ctx.resourceIds);
      return new Map(ctx.resourceIds.map((id, i) => [
        id, positions[i]?.length > 0
      ]));
    }
  },
};
```

### 4.4 Seven-Phase Execution Flow

```typescript
async function queryAuthorizedResources<T>(options: AuthQueryOptions<T>): Promise<T[]> {
  // Phase 1: Get query plan from Cerbos
  const queryPlan = await cerbos.planResources({
    principal: options.principal,
    resource: { kind: options.resourceKind },
    action: options.action,
  });

  // Fast paths
  if (queryPlan.kind === "KIND_ALWAYS_DENIED") return [];
  if (queryPlan.kind === "KIND_ALWAYS_ALLOWED") {
    return options.prismaModel.findMany({ include: options.prismaInclude });
  }

  // Phase 2: Split AST into DB-resolvable vs deferred
  const split = splitQueryPlan(queryPlan.condition, options.attrRegistry);

  // Phase 3: Execute DB query with DB-only conditions via Prisma
  let candidates = await queryWithDbConditions(split.dbConditions, options);
  if (candidates.length === 0) return [];

  // Phase 4: If no deferred conditions, we're done
  if (!split.deferredConditions) return candidates;

  // Phase 5: Batch-resolve ALL external unknowns in PARALLEL
  // Blockchain multicalls + Haruko API calls run concurrently
  const resolvedAttrs = await batchResolveExternalAttrs(candidates, options);

  // Phase 6: Cerbos batch check with fully hydrated attributes
  const checkResult = await cerbos.checkResources({
    principal: options.principal,
    resources: candidates.map(c => ({
      resource: { kind: options.resourceKind, id: c.id, attr: mergeAttrs(c, resolvedAttrs) },
      actions: [options.action],
    })),
  });

  // Phase 7: Filter to allowed only (post-filtering guarantees security)
  return candidates.filter(c => checkResult.isAllowed(options.action, c.id));
}
```

### 4.5 AST Splitting Logic

The splitter classifies each AST node by whether all its referenced attributes are DB-resolvable, then strips non-DB conditions to produce a safe (over-fetching) Prisma WHERE clause. The Cerbos batch check in Phase 6 is the security backstop — the splitter is a performance optimization, not a security boundary.

**Classification rules:**

- **Leaf conditions**: Classified by attribute registry source lookup.
- **AND nodes**: Strip non-DB children, keep DB children. Safe because AND narrows — removing a conjunct makes the query less restrictive (returns a superset). The stripped conditions are enforced later in Phase 6.
- **OR nodes — progressive short-circuit evaluation**: Evaluate DB-resolvable branches first against fetched candidates. Resources passing ANY DB branch are immediately allowed (skip external checks). Only evaluate external branches for remaining resources that failed all DB branches. This avoids unnecessary external calls while remaining correct — if any OR branch is satisfied, the whole expression is true.
- **NOT nodes**: If the inner condition is DB-resolvable, keep it. Otherwise strip the whole NOT.

**OR optimization example** — policy: `isPublic OR holderBalance > 0`:

1. Fetch all candidate funds from DB (with any surrounding AND conditions in Prisma WHERE)
2. Mark `isPublic == true` candidates as allowed (DB branch, in-memory check)
3. Only check blockchain `balanceOf` for the remaining non-public funds
4. Result = public funds + non-public funds with balance > 0

If 150 of 200 funds are public, this avoids 150 unnecessary blockchain lookups. For multiple OR branches with different external sources, order by cost (cheapest first) to maximize short-circuiting.

**Cost classification simplification**: Blockchain reads via multicall are effectively free (50 vs 500 `balanceOf` calls cost the same — one RPC round-trip, see Section 4.10). The OR optimization therefore only provides meaningful savings for expensive API sources (Haruko, rate-limited endpoints). For blockchain-only external conditions, it is simpler to always batch-resolve all candidates.

**Core implementation** (~50 lines — strips non-DB conditions from AST for safe Prisma WHERE generation):

```typescript
function stripNonDb(node: PlanExpression, dbFields: Set<string>): PlanExpression | null {
  if ('variable' in node) return dbFields.has(node.variable) ? node : null;
  if ('value' in node) return node;

  const { operator, operands } = node.expression;

  // Comparisons: keep only if all variables are DB fields
  if (operator !== 'and' && operator !== 'or' && operator !== 'not') {
    const vars = operands.filter(op => 'variable' in op).map(op => op.variable);
    return vars.every(v => dbFields.has(v)) ? node : null;
  }

  // AND: strip non-DB children, keep rest (safe: over-fetches)
  if (operator === 'and') {
    const kept = operands.map(op => stripNonDb(op, dbFields)).filter(Boolean);
    if (kept.length === 0) return null;
    if (kept.length === 1) return kept[0];
    return { expression: { operator: 'and', operands: kept } };
  }

  // OR: if ANY child is non-DB, strip the ENTIRE OR (safe: over-fetches)
  if (operator === 'or') {
    const children = operands.map(op => stripNonDb(op, dbFields));
    if (children.some(c => c === null)) return null;
    return { expression: { operator: 'or', operands: children } };
  }

  // NOT: strip if inner is non-DB
  if (operator === 'not') {
    const inner = stripNonDb(operands[0], dbFields);
    return inner ? { expression: { operator: 'not', operands: [inner] } } : null;
  }

  return null; // unknown operator → strip (fail-safe)
}
```

**Fail-safe property**: Every stripping decision makes the Prisma query *less* restrictive (returns more rows). Bugs in the splitter can only cause over-fetching (slower performance), never under-fetching (security holes). The Cerbos batch check with fully-hydrated attributes in Phase 6 is the authoritative filter.

### 4.6 Batch Resolver Design

**Blockchain — Multicall batching:**

```typescript
export async function batchBalanceOf(
  fundAddresses: string[], userAddress: string
): Promise<bigint[]> {
  // Single multicall for ALL balances — 200 funds = 1 RPC call
  const calls = fundAddresses.map(addr => ({
    target: addr,
    callData: fundInterface.encodeFunctionData("balanceOf", [userAddress]),
  }));
  const results = await multicall.aggregate.staticCall(calls);
  return results.map(r => fundInterface.decodeFunctionResult("balanceOf", r)[0]);
}
```

**Haruko API — batch call with master key:**

```typescript
export async function batchGetPositions(fundIds: string[]): Promise<Position[][]> {
  // Master API key gives access to all data — post-filtering in Phase 7
  // ensures user only sees authorized results
  const response = await harukoClient.post("/v1/positions/batch", {
    fundIds,
  });
  return response.data.positions;
}
```

**Parallel resolution in Phase 5:**

```typescript
async function batchResolveExternalAttrs(
  candidates: any[], options: AuthQueryOptions
): Promise<Map<string, Record<string, any>>> {
  // Group deferred attributes by source
  const blockchainAttrs = getDeferredBySource("blockchain", options);
  const apiAttrs = getDeferredBySource("api", options);

  // Resolve ALL sources in parallel
  const [blockchainResults, apiResults] = await Promise.all([
    resolveAttrs(blockchainAttrs, candidates, options),
    resolveAttrs(apiAttrs, candidates, options),
  ]);

  // Merge results per candidate
  return mergeResolvedAttrs(candidates, blockchainResults, apiResults);
}
```

### 4.7 Adding a New Attribute

#### Blockchain attribute — zero code (config + policy only)

Because the generic blockchain resolver handles any view call via the ABI:

```yaml
# 1. Add to attribute-registry.yaml
performanceFee:
  source: blockchain
  target: "{{resource.attr.contractAddress}}"
  call:
    function: "getPerformanceFee()"
    params: []
    returns: "uint256"

# 2. Use in Cerbos policy
# condition: expr: R.attr.performanceFee < 2000

# 3. Done. Zero code changes. Hot-reload registry + policy.
```

#### Haruko attribute — config + optional transform

```yaml
# 1. Add to attribute-registry.yaml
portfolioValueUSD:
  source: api
  endpoint: "/portfolios/{{resource.attr.harukoPortfolioId}}/valuations"
  transform: { pick: "totalValueUSD" }

# 2. Use in Cerbos policy
# condition: expr: R.attr.portfolioValueUSD > 1000000

# 3. Done for auth use. Display may need response shape knowledge (see Section 5.9.3).
```

#### New data source type — requires code

Adding an entirely new source type (e.g., Bloomberg alongside Haruko) requires implementing a new resolver class and registering it as a source handler. This is a full deploy.

### 4.8 Engine Independence

The AuthQueryEngine works with any authorization engine:

| Engine | Query Plan API | Integration Quality |
|--------|---------------|-------------------|
| **Cerbos** | PlanResources | Excellent — Prisma adapter exists, structured AST enables condition splitting |
| OPA | Compile API (v1.9+) | Good — official Prisma adapter (`ucast-prisma`), native SQL compilation; structured AST but no derived roles |
| Oso Cloud | listLocal | Poor for hybrid data — returns opaque SQL string (not splittable), `listLocal` does not support context facts |
| Cedar | None | Degraded — fetches all candidates, batch checks everything |
| Casbin | None | Degraded — same as Cedar |

With Cedar/Casbin (no query plan), Phase 2-3 are skipped — all candidates are fetched, all go through batch check. The result is correct but less efficient.

### 4.9 Performance Characteristics

| Phase | Latency | Depends On |
|-------|---------|-----------|
| Phase 1: Cerbos PlanResources | <1ms (sidecar) | Policy complexity |
| Phase 2: AST splitting | <1ms (in-memory) | AST size |
| Phase 3: Prisma query | 5-50ms | Table size, index quality |
| Phase 5: Blockchain batch resolve | 50-200ms | Number of multicalls |
| Phase 5: Haruko API batch resolve | 50-300ms | Payload size |
| Phase 5: Combined (parallel) | 50-300ms | Slowest resolver wins |
| Phase 6: Cerbos batch check | <5ms (sidecar) | Number of candidates |
| **Total (with external data)** | **60-360ms** | Dominated by external calls |
| **Total (DB-only policies)** | **6-52ms** | Dominated by Prisma query |

When policies only reference DB attributes (no blockchain/Haruko data), Phases 4-6 are skipped entirely — you get pure Prisma query performance.

**Note on blockchain batch resolve cost**: The 50-200ms range for blockchain is dominated by the single RPC network round-trip, not computation. Whether the multicall batches 50 or 500 `balanceOf` calls, the wall-clock time is nearly identical (see Section 4.10 for the full analysis). This means there is no performance benefit to reducing the number of blockchain attribute resolutions via OR short-circuiting — always resolve all candidates.

### 4.10 Implementation Complexity

This section provides engineering guidance for implementing the AuthQueryEngine, based on analysis of the PlanResources AST structure, multicall costs, and the `@cerbos/orm-prisma` adapter.

#### 4.10.1 AST Splitter

The splitter (Section 4.5) is ~60-80 lines of TypeScript — a simple recursive tree walk over PlanResources' three node types (`variable`, `value`, `expression`). Total production code including helpers and integration glue: ~100 lines. Test suite: ~150 lines covering AND/OR/mixed/edge cases.

**Fail-safe by design**: The splitter's correctness invariant is that it only makes the Prisma query *less* restrictive. A table of failure modes:

| Bug Type | Effect | Security Impact |
|----------|--------|-----------------|
| Accidentally strip a DB condition | DB query returns more results | None — Phase 6 batch check filters |
| Accidentally keep a non-DB condition | Prisma adapter throws (unmapped field) | Fails loud, no silent leak |
| Strip too aggressively (return null) | Fetch all candidates, batch check everything | Slower, but correct |

The Cerbos batch check in Phase 6 is the security boundary. The splitter is purely a performance optimization.

#### 4.10.2 Blockchain Multicall Cost Analysis

Each `balanceOf(address)` call inside a Multicall3 aggregate costs ~3,000 gas (SLOAD ~2,100 + loop overhead ~700 + dispatch ~200) and transfers 68 bytes (36 in, 32 out). The cost scales linearly but is dominated by the single RPC network round-trip:

| Fund Count | Gas Used | Calldata | Response | Wall-Clock Time |
|------------|----------|----------|----------|-----------------|
| 50 | ~150K | 1.8 KB | 1.6 KB | ~50-100ms (1 RPC round-trip) |
| 500 | ~1.5M | 18 KB | 16 KB | ~50-120ms (same round-trip) |
| 2,000 | ~6M | 72 KB | 64 KB | ~60-150ms (still 1 round-trip) |
| 5,000 | ~15M | 180 KB | 160 KB | ~80-200ms (approaching gas limit) |

**Ceiling**: Most RPC providers enforce `eth_call` gas limits of 25-50M. At ~3,000 gas per `balanceOf`, the ceiling is ~8,000-16,000 calls per multicall. Beyond that, split into parallel multicalls.

**Implication**: For a fund platform with <2,000 funds, the difference between resolving 50 vs 500 blockchain attributes is effectively zero. Always batch-resolve all candidates via multicall — the OR short-circuit optimization (Section 4.5) provides no meaningful blockchain savings.

**Caveat — complex view calls**: The ceiling drops for expensive view functions. A `getFullFundState()` reading 20 storage slots costs ~50,000 gas per call, dropping the ceiling to ~500 funds per multicall. Design attribute registry `call.function` entries to be minimal (single SLOAD when possible).

#### 4.10.3 Cost Classification Model

The AST splitter and OR short-circuit logic only need two cost categories, not three:

| Category | Sources | Strategy | Rationale |
|----------|---------|----------|-----------|
| **Cheap** | DB + blockchain (multicall) | Always resolve all candidates | Multicall cost is flat (one RPC round-trip); no benefit to reducing count |
| **Expensive** | Rate-limited APIs (Haruko, Bloomberg) | OR short-circuit + minimize calls | Per-call cost or rate limits make reduction worthwhile |

This simplification means the splitter only needs to distinguish "can be pushed to Prisma WHERE" (DB attributes) from "must be post-resolved" (everything else). The OR optimization within post-resolution only matters when expensive API sources are involved.

#### 4.10.4 Where Real Complexity Lives

The AST splitter is the simplest component. Ranked by implementation effort:

| Component | Effort | Why |
|-----------|--------|-----|
| AST splitter (`stripNonDb`) | Low (~100 lines) | Simple tree walk, fail-safe |
| Cerbos policy design | Medium | Getting derived roles + conditions right for the domain |
| Attribute registry YAML → runtime | Medium | Template interpolation, validation, startup checks |
| Blockchain batch resolver | Medium | Multicall batching, ABI encoding, DataLoader cache |
| Merging resolved attrs for Cerbos batch check | Medium | Hydrating the right attrs onto the right candidates |
| `@cerbos/orm-prisma` edge cases | Low-Medium | Low adoption (~2 downloads/week) — treat as reference impl to fork if needed |

---

## 5. GraphQL Integration

### 5.1 Why GraphQL Matters for Authorization

GraphQL is an API query language where the client describes exactly what data it wants. Unlike REST's one-endpoint-one-permission model, a single GraphQL query can touch multiple resources at different permission levels:

```graphql
query {
  fund(id: "fund-A") {
    name              # anyone whitelisted
    nav               # only token holders
    investorList { }  # only compliance officers
    feeStructure { }  # only fund managers
  }
}
```

One request, four different permission levels. Authorization must happen at the **field level**, not the endpoint level.

### 5.2 Two-Level Authorization in GraphQL

| Level | What It Controls | Mechanism | Risk If Missing |
|-------|-----------------|-----------|-----------------|
| **Query-level** (list filtering) | Which funds can you see at all? | AuthQueryEngine + PlanResources | Unauthorized fund access |
| **Field-level** | Which fields of those funds can you see? | @auth directive + Cerbos CheckResource | Unauthorized data exposure |

Plus a critical third concern:

| Level | What It Controls | Mechanism | Risk If Missing |
|-------|-----------------|-----------|-----------------|
| **Predicate-level** | Which fields can you filter/sort by? | Server-defined queries only | Information leakage via side-channel |

**The predicate problem (real CVEs exist):** If a user can filter by a field they can't see (e.g., `funds(where: { nav: { gt: 100 } })`), they can binary-search to extract restricted values. **Solution:** Server-defined query entry points, never arbitrary `where` clauses.

### 5.3 GraphQL Schema Design

```graphql
type Query {
  """Returns only funds the authenticated user can see"""
  visibleFunds: [Fund!]!                    # ← AuthQueryEngine

  """Returns only holdings the user can access (own + shared)"""
  viewableHoldings: [Holding!]!             # ← AuthQueryEngine

  """Single fund access — null if unauthorized"""
  fund(id: ID!): Fund                       # ← AuthQueryEngine (point check)
}

type Fund {
  id: ID!
  name: String!              @auth(action: "view_metadata")
  isPublic: Boolean!

  # Blockchain-sourced fields — only fetched if requested (DataLoader)
  pricing: FundPricing       @auth(action: "view_financials")

  # Haruko-sourced fields — only fetched if requested (DataLoader)
  positions: [Position!]!    @auth(action: "view_positions")
  riskParameters: RiskParams @auth(action: "view_risk")

  # Nested lists — each uses AuthQueryEngine
  classes: [ShareClass!]!                   # ← AuthQueryEngine per fund
  orders: [Order!]!                         # ← AuthQueryEngine per fund
}

type FundPricing {
  nav: BigInt!
  sharePrice: BigInt!
  managementFee: Int!
  lastUpdated: DateTime!
}
```

Every list field uses AuthQueryEngine. Every non-trivial scalar/object field uses @auth. Both are backed by Cerbos — same policies, same engine, different APIs (PlanResources for lists, CheckResource for fields). See Section 5.8 for why this is efficient.

> **Note:** The typed blockchain fields above (`pricing`, `positions`) are the default approach. Section 5.9 describes a fully generic alternative where all blockchain and external data is exposed via `resolve(attribute)` / `resolveMany(attributes)` fields, making new attributes entirely config-driven with zero schema changes.

### 5.4 Query-Level Resolvers (AuthQueryEngine)

```typescript
const resolvers = {
  Query: {
    visibleFunds: async (_, __, context) => {
      return context.authQuery.authorized({
        principal: context.currentUser,
        resourceKind: "fund",
        action: "view_metadata",
        attrRegistry: fundAttrRegistry,
        prismaModel: prisma.fund,
      });
    },

    viewableHoldings: async (_, __, context) => {
      // Combines own holdings + shared holdings via AuthQueryEngine
      // Own holdings: AuthQueryEngine filters funds where user has balance > 0
      // Shared holdings: AuthQueryEngine filters via holding_shares table
      const [ownFunds, sharedWithMe] = await Promise.all([
        context.authQuery.authorized({
          principal: context.currentUser,
          resourceKind: "holding",
          action: "view_own",
          attrRegistry: holdingAttrRegistry,
          prismaModel: prisma.holding,
        }),
        context.authQuery.authorized({
          principal: context.currentUser,
          resourceKind: "holding",
          action: "view_shared",
          attrRegistry: holdingAttrRegistry,
          prismaModel: prisma.holdingShare,
          prismaWhere: { sharedWithUserId: context.currentUser.id },
        }),
      ]);
      return [...ownFunds, ...sharedWithMe];
    },
  },

  Fund: {
    // Blockchain fields — generic resolver handles any view call (see Section 4.3.1)
    pricing: (fund, _, context) =>
      context.loaders.fundPricing.load(fund.contractAddress),

    // Haruko fields via DataLoader (per-endpoint, see Section 5.9.3)
    positions: (fund, _, context) =>
      context.loaders.harukoPositions.load(fund.id),

    riskParameters: (fund, _, context) =>
      context.loaders.harukoRisk.load(fund.id),

    // ALL nested lists use AuthQueryEngine — consistent pattern
    classes: (fund, _, context) =>
      context.authQuery.authorized({
        principal: context.currentUser,
        resourceKind: "share_class",
        action: "view",
        attrRegistry: classAttrRegistry,
        prismaModel: prisma.shareClass,
        prismaWhere: { fundId: fund.id },
      }),

    orders: (fund, _, context) =>
      context.authQuery.authorized({
        principal: context.currentUser,
        resourceKind: "order",
        action: "view",
        attrRegistry: orderAttrRegistry,
        prismaModel: prisma.order,
        prismaWhere: { fundId: fund.id },
      }),
  },
};
```

### 5.5 Field-Level @auth Directive with Batch Permission Pre-fetch

Instead of making one Cerbos call per field, we pre-fetch ALL permissions for a parent object in a single batch call. Each @auth directive then reads from the cached result — zero additional Cerbos calls per field:

```typescript
// Step 1: Batch pre-fetch ALL permissions per parent object
// Called once per Fund object, checks ALL actions in one Cerbos call
async function prefetchPermissions(source: any, context: GraphQLContext, typeName: string) {
  if (source._permissions) return source._permissions; // already cached

  const result = await context.cerbos.checkResource({
    principal: context.currentUser,
    resource: {
      kind: typeName.toLowerCase(),
      id: source.id,
      attr: source,
    },
    actions: [
      "view_metadata", "view_financials", "view_positions",
      "view_risk", "view_investors", "view_fees",
    ],
  });
  source._permissions = result; // cache on the object
  return result;
}

// Step 2: @auth directive reads from pre-fetched permissions
const authDirective = (schema) => {
  return mapSchema(schema, {
    [MapperKind.OBJECT_FIELD]: (fieldConfig) => {
      const authArgs = getDirective(schema, fieldConfig, "auth");
      if (!authArgs) return fieldConfig;

      const originalResolve = fieldConfig.resolve;
      fieldConfig.resolve = async (source, args, context, info) => {
        const permissions = await prefetchPermissions(
          source, context, info.parentType.name
        );
        if (!permissions.isAllowed(authArgs.action)) return null;
        return originalResolve(source, args, context, info);
      };
      return fieldConfig;
    },
  });
};
```

This means: 12 funds × 6 actions = **12 Cerbos calls total** (one per fund), not 12 × 6 = 72. Each call is sub-millisecond (sidecar). All backed by the same Cerbos YAML policies.

### 5.6 DataLoader for Batching External Data

GraphQL's DataLoader pattern automatically batches all external calls across all resources in a response:

```typescript
function createLoaders(userId: string) {
  return {
    // Blockchain DataLoaders — grouped pricing data
    fundPricing: new DataLoader<string, FundPricing>(async (fundAddresses) => {
      return blockchain.batchGetPricing([...fundAddresses]);
      // Returns { nav, sharePrice, managementFee, lastUpdated } per fund
    }),
    balanceOf: new DataLoader<string, bigint>(async (fundAddresses) => {
      return blockchain.batchBalanceOf([...fundAddresses], userId);
    }),

    // Haruko DataLoaders (master key — post-filtered by @auth directive)
    harukoPositions: new DataLoader<string, Position[]>(async (fundIds) => {
      return haruko.batchGetPositions([...fundIds]);
    }),
    harukoRisk: new DataLoader<string, RiskParams>(async (fundIds) => {
      return haruko.batchGetRiskParameters([...fundIds]);
    }),
  };
}
```

The client controls the cost: requesting `{ id name }` = 1 Prisma query + 1 Cerbos call + 1 batch permission pre-fetch. Requesting `{ id name pricing { nav } positions { ticker } }` = same + 1 blockchain multicall + 1 Haruko API call. Fields not requested = zero external calls.

> **Under the hood**, the blockchain DataLoaders delegate to the generic blockchain resolver (Section 4.3.1), which uses a single multicall DataLoader keyed by `(target, functionSig, params)`. Both auth resolvers and display resolvers share this cache — if AuthQueryEngine already fetched `balanceOf` for authorization, the GraphQL field resolver gets the cached result for free. See Section 5.9 for the full shared-cache architecture.

### 5.7 Complete Execution Flow

```
GraphQL Query:
  query {
    visibleFunds {                ← AuthQueryEngine: which funds?
      id
      name                        ← @auth(view_metadata) via batch pre-fetch
      pricing {                   ← @auth(view_financials) via batch pre-fetch
        nav                       ← DataLoader → blockchain multicall
        sharePrice
      }
      positions {                 ← @auth(view_positions) via batch pre-fetch
        ticker                    ← DataLoader → Haruko API
        quantity
      }
      classes {                   ← AuthQueryEngine: which classes per fund?
        id
        currency
      }
      orders {                    ← AuthQueryEngine: which orders per fund?
        type
        amount
      }
    }
  }

Execution:
  1. visibleFunds → AuthQueryEngine
     a. Cerbos PlanResources → AST
     b. Split: DB conditions → Prisma WHERE clause
     c. External attrs needed? Batch resolve in parallel (blockchain + Haruko)
     d. Cerbos batch check → filtered funds [Fund-A, Fund-C, ...]

  2. For each fund, batch permission pre-fetch
     → 1 Cerbos CheckResource per fund, checking ALL actions at once
     → Results cached on fund object for @auth directive

  3. For each fund, GraphQL resolves requested fields
     a. name → @auth reads cached permissions → YES → default resolver
     b. pricing → @auth reads cached permissions → YES → DataLoader → multicall
     c. positions → @auth reads cached permissions → YES → DataLoader → Haruko
     d. classes → AuthQueryEngine(share_class, fundId) → Cerbos PlanResources
     e. orders → AuthQueryEngine(order, fundId) → Cerbos PlanResources

  4. DataLoader auto-batches ALL external calls across ALL funds
     (10 funds requesting positions = 1 Haruko API call, not 10)
```

### 5.8 Advanced: Fully Policy-Driven Architecture

> This section explains WHY the "AuthQueryEngine everywhere + batch pre-fetch" approach works efficiently. The core architecture (Sections 5.1-5.7) is sufficient to understand the system; this section is for those who want to understand the optimization guarantees.

#### 5.8.1 KIND_ALWAYS_ALLOWED — Why Universal AuthQueryEngine Is Free

When AuthQueryEngine calls Cerbos PlanResources and the policy has no restrictions for this user/action, Cerbos returns `KIND_ALWAYS_ALLOWED`. The AuthQueryEngine short-circuits:

```typescript
// Phase 1 result
if (queryPlan.kind === "KIND_ALWAYS_ALLOWED") {
  // Skip ALL filtering — direct Prisma query, no AST split, no blockchain
  return options.prismaModel.findMany({
    where: options.prismaWhere,  // only parent-scoping (e.g., fundId)
    include: options.prismaInclude,
  });
}
```

This means calling AuthQueryEngine on a list that has no restrictions costs exactly: **one sub-millisecond Cerbos sidecar call** + the same Prisma query you'd write anyway.

**Overhead measurement:**
```
Query returning 12 funds, each with classes and orders:
  1× AuthQueryEngine(fund)     → Cerbos call      ~0.5ms
  12× AuthQueryEngine(class)   → 12 Cerbos calls  ~6ms (all return KIND_ALWAYS_ALLOWED)
  12× AuthQueryEngine(order)   → 12 Cerbos calls   ~6ms
  12× batch permission pre-fetch → 12 Cerbos calls ~6ms

  Total overhead: ~19ms of sub-millisecond Cerbos sidecar calls
  In exchange: ALL permission changes are pure policy updates, zero code deploys
```

#### 5.8.2 Four Authorization Patterns

Every field in the GraphQL schema maps to exactly one of four patterns. All are backed by the same Cerbos PDP and YAML policies:

| Pattern | Cerbos API | Used For | Example |
|---------|-----------|----------|---------|
| **AuthQueryEngine** | `PlanResources` | Every list field | `visibleFunds`, `Fund.classes`, `Fund.orders` |
| **@auth (batch pre-fetch)** | `CheckResources` | Every non-trivial scalar/object field | `Fund.pricing`, `Fund.positions` |
| **Inherited** | None | Optimization — skip auth when profiling proves it's unnecessary | Only after measurement |
| **Mutation guard** | `CheckResource` | Write operations | `createOrder`, `whitelistInvestor` |

**Decision logic:**

```
Is this a list field?         → AuthQueryEngine (PlanResources)
Is this a write operation?    → Mutation guard (CheckResource)
Is this a scalar/object field? → @auth with batch pre-fetch (CheckResources)
```

The "Inherited" pattern (skipping auth for a field) is a **performance optimization applied after profiling**, not a default. Start with everything going through Cerbos.

#### 5.8.3 Change Propagation Model

Because every field goes through Cerbos, permission changes propagate based on what type of change it is:

| Change Type | What Changes | Deploy Required? | Example |
|-------------|-------------|-----------------|---------|
| **Restrict a list** | Cerbos YAML policy | **No** — policy update only | "Investors can only see classes matching their currency" |
| **Restrict a field** | Cerbos YAML policy | **No** — policy update only | "Only managers can see pricing data" |
| **Open a restriction** | Cerbos YAML policy | **No** — policy update only | "All users can now see fund names" (→ KIND_ALWAYS_ALLOWED) |
| **Add derived role** | Cerbos YAML policy | **No** — policy update only | "Users with balance > 1000 get 'premium_holder' role" |
| **New attribute on existing source** | Attribute registry + policy | **Small deploy** — one registry entry | "Add riskLevel from Haruko to fund authorization" |
| **New resource type** | Code + registry + policy | **Full deploy** — new resolver, registry, policy | "Add Document resource with its own access rules" |
| **New data source** | Code + registry | **Full deploy** — new batch resolver | "Add Bloomberg as a data source alongside Haruko" |

**Key guarantee:** Any change to WHO can see WHAT on EXISTING resources is a pure Cerbos policy update. No code, no deploy, no downtime.

#### 5.8.4 When to Optimize to Inherited

Only apply the "Inherited" pattern (skipping AuthQueryEngine/auth) when ALL of these are true:

1. Profiling shows the Cerbos calls add measurable latency (>50ms total for this query)
2. The field will **provably never** need independent authorization
3. The field's parent authorization logically implies access to this field
4. Product team confirms this field won't need per-user filtering in the foreseeable future

In practice, most fields should stay wired through Cerbos. The overhead is negligible; the flexibility for future policy changes is significant.

### 5.9 Generic Resolver Architecture

> This section builds on the config-driven attribute registry (Section 4.3.1) to show how both **authorization** and **display** can share the same resolver infrastructure. The core idea: because EVM view calls are self-describing via the ABI, blockchain attributes need zero code for both auth and display. Haruko attributes are semi-generic — generic call, but per-endpoint response shape.

#### 5.9.1 Auth and Display Share One Resolver

There are two resolver systems in the architecture:

| System | Purpose | Input | Output |
|--------|---------|-------|--------|
| **AuthQueryEngine** attribute resolvers | Fetch data for Cerbos conditions | Cerbos AST condition (e.g., `R.attr.holderBalance > 0`) | Attribute values for Cerbos batch check |
| **GraphQL** field resolvers | Fetch data to return to the client | Client query field (e.g., `fund { pricing { nav } }`) | Response payload |

These are **logically independent** but often resolve to the **same underlying data source**. Without sharing, this creates duplication:

```
Auth:    balanceOf(user, fund) → blockchain call #1
Display: balanceOf(user, fund) → blockchain call #2 (duplicate)
```

The solution is that both systems share the **same DataLoader cache** via the generic blockchain resolver:

```typescript
// Both auth and display call the same function
context.genericResolver.resolve("holderBalance", fund, principal)
// → DataLoader deduplicates: ONE blockchain call serves BOTH purposes

// Auth resolver (feeds Cerbos):
const attrRegistry = {
  holderBalance: {
    resolve: (resource, ctx) => ctx.genericResolver.resolve("holderBalance", resource, ctx.principal),
  },
};

// GraphQL field resolver (feeds client):
Fund: {
  holderBalance: (fund, _, ctx) => ctx.genericResolver.resolve("holderBalance", fund, ctx.principal),
}
```

The DataLoader is the natural unification point — no shared state to manage, no special coupling. It handles both deduplication (same key = one fetch) and batching (multiple keys = one multicall).

#### 5.9.2 Fully Generic GraphQL Fields

Rather than declaring a typed GraphQL field for each blockchain attribute, the schema can expose a generic resolver:

```graphql
type Fund {
  # Core identity — typed, from DB (always present, stable schema)
  id: ID!
  name: String!              @auth(action: "view_metadata")
  contractAddress: String!
  isPublic: Boolean!

  # Blockchain/external data — generic, policy-gated
  resolve(attribute: String!): JSON              @auth(action: "resolve")
  resolveMany(attributes: [String!]!): JSON      @auth(action: "resolve")

  # Nested lists — still use AuthQueryEngine
  classes: [ShareClass!]!
  orders: [Order!]!
}
```

Client usage:

```graphql
query {
  visibleFunds {
    id
    name
    tokenBalance: resolve(attribute: "holderBalance")
    pricing: resolveMany(attributes: ["nav", "sharePrice", "managementFee"])
    nftAccess: resolve(attribute: "hasNFT")
    classes { id currency }
  }
}
```

The resolver implementation is trivial:

```typescript
Fund: {
  resolve: (fund, { attribute }, context) =>
    context.genericResolver.resolve(attribute, fund, context.principal),

  resolveMany: async (fund, { attributes }, context) => {
    const entries = await Promise.all(
      attributes.map(async (attr) => [
        attr,
        await context.genericResolver.resolve(attr, fund, context.principal),
      ])
    );
    return Object.fromEntries(entries);
    // All calls batched into one multicall by DataLoader regardless
  },
}
```

**Per-attribute Cerbos actions** provide fine-grained control:

```yaml
# Cerbos policy: control which attributes each role can resolve
rules:
  - actions: ["resolve:holderBalance", "resolve:nav", "resolve:sharePrice"]
    effect: EFFECT_ALLOW
    derivedRoles: ["investor", "fund_manager"]

  - actions: ["resolve:hasNFT", "resolve:managementFee"]
    effect: EFFECT_ALLOW
    derivedRoles: ["fund_manager", "admin"]

  - actions: ["resolve:*"]
    effect: EFFECT_ALLOW
    roles: ["super_admin"]
```

**Two-gate security model:**
1. **Registry allowlist** — only registered attributes can be resolved. Unknown attribute → error.
2. **Cerbos per-attribute action** — even registered attributes are gated per user/role.

#### 5.9.3 Two Tiers of Genericity

Blockchain and Haruko have fundamentally different levels of genericity:

| Aspect | Blockchain | Haruko (REST API) |
|--------|-----------|-------------------|
| Making the call | Generic (`target + selector + params`) | Semi-generic (`baseURL + endpoint + path params`) |
| Encoding params | Generic (ABI encodes from signature) | Semi-generic (path interpolation, query string) |
| Decoding response | **Generic** (ABI decodes from return type) | **Not generic** (each endpoint returns different JSON shape) |
| Self-describing | **Yes** — function signature IS the full codec | **No** — requires API docs or OpenAPI spec per endpoint |

**Why this matters:**

- **Blockchain**: Fully generic. Adding `hasNFT` = config entry + policy. Zero code, zero deploy. The ABI function signature (e.g., `"balanceOf(address,uint256)"`) contains everything needed to encode params and decode results at runtime.
- **Haruko auth**: Mostly generic. Cerbos conditions use scalars (`positionCount > 0`, `portfolioValue > 1000000`), and simple transforms (`count`, `pick`) can extract scalars from any JSON response.
- **Haruko display**: Semi-generic. The generic HTTP caller works, but each endpoint returns a different JSON shape that the client needs to understand. For display, you either return raw JSON (client handles shape) or keep typed DataLoaders per endpoint.

```
Blockchain:  (address, "balanceOf(address)", [user]) → uint256
             (address, "hasRole(bytes32,address)", [role, user]) → bool
             All uniform — ABI is the universal codec

Haruko:      GET /portfolios/{id}/positions   → [{ asset, quantity, value, ... }]
             GET /portfolios/{id}/valuations  → { nav, timestamp, ... }
             Each endpoint = different response schema
```

#### 5.9.4 Typed vs Generic — Decision Framework

| Data Source | Approach | Reason |
|-------------|----------|--------|
| DB identity (id, name, status) | **Typed fields** | Stable schema, always present, strong typing |
| DB relations (classes, orders) | **Typed lists + AuthQueryEngine** | Graph structure, list filtering |
| Blockchain data (balances, roles, fees, NFTs) | **Generic `resolve()`** | Dynamic, uniform ABI shape, zero-code extensibility |
| Haruko data for auth | **Generic (via transform)** | Scalar extraction for Cerbos conditions |
| Haruko data for display | **Typed or generic** | Typed for type safety; generic if DX tradeoff is acceptable |

**DX mitigations** for the generic approach (if type safety is a concern):
- GraphQL **enum** for attribute names → compile-time validation of what you can query
- Registry-generated **type metadata** alongside values: `{ value: 1000, type: "uint256" }`
- Client-side **codegen from the registry** → typed wrappers around `resolve()`

#### 5.9.5 Zero-Code Change Flow

Adding a new blockchain attribute to both auth and display:

```
1. attribute-registry.yaml → add entry          (config, hot-reload)
2. Cerbos policy → reference new attribute       (policy, hot-reload)
3. Client query → resolve(attribute: "newAttr")  (client code)

Code changes: ZERO
Backend deploys: ZERO (hot-reload registry + policy)
```

This is the strongest form of the policy-driven architecture: the registry defines WHAT data exists, Cerbos policies define WHO can access it, and the generic resolver handles HOW to fetch it — all without touching application code.

---

## 6. Elysium-Specific Architecture

### 6.1 Data Sources

Elysium's authorization data comes from four distinct systems:

**On-chain (ground truth — NEVER duplicate):**

| Data | Source | Access Pattern |
|------|--------|---------------|
| Token balance | `balanceOf(user, fund)` | Direct eth_call / multicall |
| Investment tenure | `balanceOf()` at historical block | Archive node eth_call |
| On-chain roles | Contract storage | Direct eth_call |
| Total supply | `totalSupply(fund)` | Direct eth_call |
| Management fee | `getManagementFee(fund)` | Direct eth_call |
| NAV per share | `getNAVPerShare(fund)` | Direct eth_call |
| Dealing schedule | `getDealingSchedule(fund)` | Direct eth_call |

**Off-chain (Postgres):**

| Data | Store | When Written |
|------|-------|-------------|
| Manager whitelists investor | Postgres | Explicit manager action |
| User shares holdings with friend | Postgres | Explicit user action |
| Platform roles (admin, compliance) | Cognito groups | Admin action |
| Manager invitations | Postgres | Manager invites user |
| Fund metadata (name, status, public flag) | Postgres | Fund setup/update |

**Haruko (external portfolio aggregation):**

| Data | Access | Authentication |
|------|--------|---------------|
| Portfolio positions (all trades) | Haruko REST API | Master API key |
| Risk parameters | Haruko REST API | Master API key |
| Performance analytics | Haruko REST API | Master API key |
| Position snapshots | Haruko REST API | Master API key |

**Haruko security model:** Elysium authenticates to Haruko with a master API key that grants access to all portfolio data. This is secure because: (1) all Haruko data flows through our backend — never exposed directly to clients, (2) the AuthQueryEngine's post-filtering (Phase 7) ensures users only see data they're authorized for, (3) Haruko data never leaves the authorization pipeline unfiltered. Narrowing Haruko API calls to user-scoped data is an efficiency and defense-in-depth optimization (see Appendix C) but not a security requirement for the first implementation.

**Principle:** On-chain data is always read fresh via eth_call (batched via multicall) and injected by the AuthQueryEngine's batch resolvers. Haruko data is fetched via API calls and likewise injected. Neither is copied to a database or authorization store. Off-chain relationships are stored in Postgres and referenced in Cerbos policies via the Prisma adapter.


### 6.2 Relationship Types and Hop Count

| Relationship | Hops | Frequency of Change | Store |
|-------------|------|-------------------|-------|
| User holds tokens in fund | 1 | Every transfer (high) | On-chain (context via AuthQueryEngine) |
| Manager whitelists investor for fund | 1 | Explicit action (low) | Postgres → Cerbos PlanResources |
| Manager invites user to specific fund | 1 | Explicit action (low) | Postgres → Cerbos PlanResources |
| User shares holdings with friend | 1 | Explicit action (low) | Postgres → Cerbos PlanResources |
| Umbrella manager auto-whitelisted | 1 | On fund creation (rare) | Postgres (trigger) |
| Platform admin sees all | 0 | Role assignment (rare) | Cognito group → Cerbos derived role |
| **Friend of manager sees fund** | **2** | Composition of above | SQL JOIN / future: SpiceDB |
| **Admin → Umbrella → Fund → Class** | **3+** | Org hierarchy (rare) | **Future: SpiceDB** |

Key finding: most day-one relationships are **1-hop** (direct). Multi-hop inheritance (3+) is a future need that triggers SpiceDB migration.

### 6.3 Layered Authorization Model

```
Level 1: FUND (can I see this fund exists?)
│  Resource: Fund
│  Rules: whitelist, holdings, friendship, invitation, public flag
│  Auth: AuthQueryEngine → PlanResources + batch blockchain check
│
├── Level 2: HOLDING (can I see someone's position?)
│   Resource: Holding (user × fund)
│   Rules: own data (always), shared, manager
│   Auth: Cerbos CheckResource with derived roles
│   │
│   ├── Level 3: BALANCE → always yes if Level 2 is yes (on-chain)
│   ├── Level 3: TRANSACTION HISTORY → own: yes, shared: conditional
│   └── Level 3: COST BASIS / PNL → own: yes, shared: conditional
│
├── Level 2: PORTFOLIO DATA (can I see positions/risk for this fund?)
│   Resource: Fund (portfolio action)
│   Rules: fund_manager, umbrella_manager, compliance
│   Auth: Cerbos CheckResource → Haruko DataLoader → post-filter
│
└── Level 2: INVESTOR LIST (who holds this fund?)
    Resource: Fund (different permission)
    Rules: manager + compliance only
    Auth: Cerbos CheckResource with derived roles
```

### 6.4 Shared Holdings (GraphQL Resolver Pattern)

The `viewableHoldings` query combines own holdings + shared holdings, fully expressed as GraphQL resolvers:

```typescript
// GraphQL resolver — client queries: { viewableHoldings { fund { name } balance source } }
const resolvers = {
  Query: {
    viewableHoldings: async (_, __, context) => {
      const userId = context.currentUser.id;

      // Own holdings + shared holdings resolved in parallel via AuthQueryEngine
      const [ownHoldings, sharedHoldings] = await Promise.all([
        context.authQuery.authorized({
          principal: context.currentUser,
          resourceKind: "holding",
          action: "view_own",
          attrRegistry: holdingAttrRegistry,
          prismaModel: prisma.holding,
        }),
        context.authQuery.authorized({
          principal: context.currentUser,
          resourceKind: "holding",
          action: "view_shared",
          attrRegistry: holdingAttrRegistry,
          prismaModel: prisma.holdingShare,
          prismaWhere: { sharedWithUserId: userId },
        }),
      ]);

      return [
        ...ownHoldings.map(h => ({ ...h, source: "own" })),
        ...sharedHoldings.map(h => ({
          ...h, source: "shared", sharedBy: h.ownerUserId,
        })),
      ];
      // Actual balances resolved lazily via DataLoader in Holding field resolvers
    },
  },

  Holding: {
    balance: (holding, _, context) =>
      context.loaders.balanceOf.load(holding.contractAddress),
    fund: (holding, _, context) =>
      context.loaders.fund.load(holding.fundId),
  },
};
```

### 6.5 Hierarchy & Role Inheritance

**Current (day one) — flat, auto-whitelisting:**

```sql
-- On fund creation: auto-whitelist umbrella manager
CREATE TRIGGER trg_auto_whitelist
AFTER INSERT ON funds
FOR EACH ROW EXECUTE FUNCTION auto_whitelist_umbrella_manager();
```

**Cerbos derived roles handle the rest:**

```yaml
derivedRoles:
  name: fund_roles
  definitions:
    - name: fund_manager
      parentRoles: ["manager"]
      condition:
        match:
          expr: R.attr.managerId == P.id

    - name: umbrella_manager
      parentRoles: ["manager"]
      condition:
        match:
          expr: R.attr.umbrellaId == P.attr.umbrellaId
```

**Future (when complexity grows) — SpiceDB hierarchy:**

```zed
definition platform { relation admin: user }
definition umbrella {
    relation platform: platform
    relation manager: user
    permission admin = manager + platform->admin
}
definition fund {
    relation umbrella: umbrella
    relation manager: user
    relation invited_viewer: user
    permission view_metadata = manager + invited_viewer + umbrella->admin
    permission view_positions = manager + umbrella->admin
}
```

### 6.6 Cerbos Hierarchy Functions (Alternative to SpiceDB)

For moderate hierarchy depth, Cerbos's built-in hierarchy functions may suffice without SpiceDB:

```yaml
# Model org hierarchy as dot-separated path strings in DB
# P.attr.orgPath = "platform.umbrella1"
# R.attr.orgPath = "platform.umbrella1.fundA.classX"

condition:
  match:
    expr: hierarchy(P.attr.orgPath).ancestorOf(hierarchy(R.attr.orgPath))
    # → true: umbrella manager can see class-level resources
```

This avoids adding SpiceDB as long as the hierarchy is expressible as path strings and doesn't require complex graph traversal (intersections, exclusions, transitive sharing).

---

## 7. The Established Industry Pattern

### 7.1 What Google Actually Does

The original Zanzibar paper (2019) defines five APIs: **Check, Read, Expand, Watch, Write**. Notably, **LookupResources ("what can user X see?") is NOT in the original paper**. It was added later by SpiceDB and others.

The paper states: *"Clients that offer search capabilities to their users, such as Drive, often issue tens to hundreds of authorization checks to serve a single set of search results."*

Google Drive architecture:

```
1. User searches → Drive's SEARCH INDEX returns candidate files
2. Drive calls Zanzibar Check on each candidate (batched)
3. Only allowed files are returned to user
```

### 7.2 Industry-Wide Pattern

| Company | List Candidates From | Auth Check Via | Pattern |
|---------|---------------------|---------------|---------|
| Google Drive | Search index | Zanzibar Check (batched) | Post-filter |
| GitHub | Database (repos by org) | Internal Zanzibar-inspired | Pre-filter + Check |
| Airbnb | Search/DB | Himeji (Zanzibar-inspired) | Post-filter |
| Slack | Channel membership DB | Permission check | Pre-filter |
| Shopify | Product search | Shop permissions | Post-filter |

### 7.3 How Elysium's AuthQueryEngine Extends This Pattern

The industry pattern is: DB for candidates + authz for confirmation. The AuthQueryEngine adds:

1. **Automatic candidate generation** — Cerbos PlanResources generates the DB query (no manual SQL)
2. **Multi-source resolution** — batch resolvers for blockchain and Haruko data alongside DB data
3. **Unified policy** — one YAML policy drives both the DB query and the point checks
4. **Attribute registry** — declarative mapping of where each attribute lives
5. **Parallel external resolution** — blockchain multicalls and Haruko API calls execute concurrently

This is the same architecture, made more systematic and extended for multiple heterogeneous data sources.

---

## 8. Recommended Architecture

### 8.1 Day-One Architecture

```
Cognito (identity)
├── Users, groups (investor, manager, admin)
├── JWT tokens with claims
│
Cerbos PDP (policy evaluation — ECS Fargate sidecar)
├── YAML policies in git (GitOps)
├── PlanResources → Prisma WHERE clauses
├── CheckResource/CheckResources → point checks + batch checks
├── Derived roles for context-aware role elevation
│
Postgres (relationships + app data)
├── fund_whitelists (user_id, fund_id, access_level)
├── holding_shares (owner_id, fund_id, shared_with, full_access)
├── manager_invitations (manager_id, invited_user_id, fund_id)
├── funds, orders, documents (application data)
│
Blockchain (ground truth — never copied)
├── balanceOf(user, fund) — token holdings
├── getManagementFee(fund) — fee structure
├── getNAVPerShare(fund) — pricing
├── Historical balances — investment tenure
│
Haruko (external portfolio aggregation — master API key)
├── Portfolio positions, trades
├── Risk parameters
├── Performance analytics
├── Data stays in backend — post-filtered before reaching client
│
AuthQueryEngine (data federation layer — on EVERY list)
├── Config-driven attribute registry (YAML — see Section 4.3.1)
│   ├── Blockchain attrs: fully generic (ABI = universal codec, zero code per attr)
│   ├── Haruko attrs: semi-generic (generic call, per-endpoint response shape)
│   └── DB attrs: Prisma field mapping
├── Generic blockchain resolver (one implementation handles ALL view calls)
├── AST splitting (db conditions → Prisma, rest → deferred)
├── Parallel batch resolvers (multicall + Haruko API)
├── KIND_ALWAYS_ALLOWED fast path (<1ms for unrestricted lists)
├── Post-filtering — user only sees authorized results
├── Unified queryAuthorizedResources() API
│
GraphQL API
├── Query resolvers → AuthQueryEngine (every list)
├── Field resolvers → @auth directive with batch permission pre-fetch
├── Generic resolve()/resolveMany() for blockchain/external data (Section 5.9)
├── DataLoader → shared cache between auth and display resolvers
├── All permission changes = Cerbos policy update, no code deploy
├── New blockchain attribute = config + policy only, no code deploy
```

### 8.2 Usage — AuthQueryEngine on Every List

```typescript
// EVERY list field uses AuthQueryEngine — same pattern everywhere
const resolvers = {
  Query: {
    visibleFunds: (_, __, ctx) => ctx.authQuery.authorized({
      principal: ctx.currentUser,
      resourceKind: "fund",
      action: "view_metadata",
      attrRegistry: fundAttrRegistry,
      prismaModel: prisma.fund,
    }),
  },

  Fund: {
    // Nested lists — same AuthQueryEngine, scoped to parent
    classes: (fund, _, ctx) => ctx.authQuery.authorized({
      principal: ctx.currentUser,
      resourceKind: "share_class",
      action: "view",
      attrRegistry: classAttrRegistry,
      prismaModel: prisma.shareClass,
      prismaWhere: { fundId: fund.id },
    }),

    orders: (fund, _, ctx) => ctx.authQuery.authorized({
      principal: ctx.currentUser,
      resourceKind: "order",
      action: "view",
      attrRegistry: orderAttrRegistry,
      prismaModel: prisma.order,
      prismaWhere: { fundId: fund.id },
    }),
  },
};

// Today: classes have no restrictions → Cerbos returns KIND_ALWAYS_ALLOWED → <1ms
// Tomorrow: restrict classes by currency → change Cerbos policy only, no code change
```

### 8.3 Where Logic Lives

| Concern | Handled By | Changes When Rules Change? |
|---------|-----------|---------------------------|
| Who exists, what groups | Cognito | Admin actions |
| Access rules | Cerbos YAML policies | **Policy update, no code change** |
| Current state (balances) | Blockchain | Continuous (not our concern) |
| Portfolio data | Haruko API | On-demand via DataLoader |
| Relationships (whitelists) | Postgres | Event-driven writes |
| List filtering (all lists) | AuthQueryEngine → Cerbos PlanResources | **Policy update, no code change** |
| Field-level access | @auth → Cerbos batch pre-fetch | **Policy update, no code change** |
| Post-filtering guarantee | AuthQueryEngine Phase 7 | Always on — architectural invariant |
| Restrict existing resource | Cerbos YAML policy | **Policy-only — no deploy** |
| New blockchain attribute | Attribute registry + Cerbos policy | **Config-only — no code deploy** |
| New Haruko attribute (auth) | Attribute registry + Cerbos policy | **Config-only — no code deploy** |
| New resource type | Code + registry + policy | Full deploy |
| Audit trail | Custom logging (CloudWatch/Datadog) | Infrastructure concern |

### 8.4 The Duplication Problem — Solved

The previous Cedar-based recommendation accepted that list-filtering logic appears in two places (Cedar policy + manual SQL queries). With Cerbos:

```
BEFORE (Cedar):
  Cedar policy: when { context.isPublic || context.isWhitelisted }
  DB query:     SELECT ... WHERE is_public = true UNION SELECT ... FROM whitelists
  → DUPLICATED. Change rules = update both.

AFTER (Cerbos):
  Cerbos policy: expr: R.attr.isPublic == true || R.attr.whitelisted.contains(P.id)
  DB query:      AUTO-GENERATED by PlanResources → Prisma adapter
  → SINGLE SOURCE OF TRUTH. Change policy = query changes automatically.
```

For blockchain/Haruko-dependent conditions, the duplication is unavoidable (no SQL can call eth_call or an external API), but the AuthQueryEngine isolates this to the resolver layer, not the policy layer.

### 8.5 Deployment Architecture

```
┌─────────────────────────────────────────────────┐
│                  AWS VPC                         │
│                                                  │
│  ┌──────────────┐    ┌──────────────────┐       │
│  │ Lambda / ECS  │───►│ Cerbos PDP       │       │
│  │ (API + GraphQL)│   │ (ECS Fargate)    │       │
│  └──────┬───────┘    │ YAML policies    │       │
│         │            │ from git/S3       │       │
│         │            └──────────────────┘       │
│         │                                        │
│  ┌──────▼───────┐    ┌──────────────────┐       │
│  │ Postgres (RDS)│    │ Blockchain RPC    │       │
│  │ relationships │    │ (private node     │       │
│  │ + app data    │    │  or Alchemy)      │       │
│  └──────────────┘    └──────────────────┘       │
│                                                  │
│  ┌──────────────┐    ┌──────────────────┐       │
│  │ Cognito       │    │ Haruko API        │       │
│  │ (identity)    │    │ (external, via    │       │
│  └──────────────┘    │  master API key)  │       │
│                       └──────────────────┘       │
└─────────────────────────────────────────────────┘
```

### 8.6 Cost Estimates

| Scale | Monthly Auth Calls | Cerbos Cost | Cedar (AVP) Cost (comparison) |
|-------|-------------------|-------------|-------------------------------|
| 50 users, 100 checks/day | ~150K | ECS Fargate: ~$15/mo | $0.75/mo |
| 500 users, 200 checks/day | ~3M | ECS Fargate: ~$15/mo | $15/mo |
| 5,000 users, 500 checks/day | ~75M | ECS Fargate: ~$15-30/mo | $375/mo |
| 50,000 users (with field-level) | ~500M+ | ECS Fargate: ~$30-60/mo | $2,500+/mo |

Cerbos has **flat infrastructure cost** (ECS Fargate) regardless of check volume. Cedar's per-call pricing becomes expensive at scale, especially with GraphQL field-level checks multiplying call count.

---

## 9. Migration Path

### 9.1 Migration Trigger

Do NOT migrate preemptively. Migrate when you feel specific pain:

| Not a trigger | Is a trigger |
|--------------|-------------|
| "We might need hierarchy someday" | "The Cerbos hierarchy functions can't express our org structure" |
| "SpiceDB looks cool" | "We need Admin → Umbrella → Fund → Class permission inheritance with exclusions" |
| "Google uses Zanzibar" | "Adding a new role type requires changes in 4 layers" |
| "We want better ReBAC" | "Transitive sharing (friend of friend) is an actual product requirement" |

### 9.2 Three-Tier Evolution

**Tier 1 (Day One): Cerbos + Postgres**
- Policies in YAML (GitOps)
- Relationships in Postgres tables
- AuthQueryEngine on every list field (KIND_ALWAYS_ALLOWED fast path for unrestricted lists)
- Batch permission pre-fetch for field-level @auth (one Cerbos call per object, all actions)
- Blockchain + Haruko data resolved in parallel via batch resolvers
- All permission changes = policy update only, no code deploy
- GraphQL with @auth directives + DataLoader

**Tier 2 (Team Growth): Add Cerbos Hub**
- Managed control plane for policy distribution, testing, CI/CD
- PDPs still run in our VPC
- Policy authoring UI for non-developers
- No code changes required

**Tier 3 (Hierarchy Deepens): Add SpiceDB**
- SpiceDB stores organizational relationships
- Register SpiceDB resolvers in AuthQueryEngine attribute registry
- Cerbos stays as policy engine — no policy migration needed
- The attribute registry makes this a new resolver registration, not a rewrite

### 9.3 SpiceDB Migration Steps (When Needed)

```
Phase 1: Deploy SpiceDB alongside existing system
  → Define schema mirroring Postgres relationship tables
  → No changes to application code

Phase 2: Dual-write
  → Every relationship write goes to Postgres AND SpiceDB
  → AuthQueryEngine still reads from Postgres

Phase 3: Backfill
  → One-time script copies all existing relationships to SpiceDB
  → Verify data consistency

Phase 4: Switch reads
  → Register SpiceDB batch resolvers in AuthQueryEngine attribute registry
  → Change source: "db" → source: "spicedb" for relationship attrs
  → Cerbos policies: unchanged
  → GraphQL schema, frontend: UNCHANGED

Phase 5: Drop Postgres relationship tables
  → fund_whitelists, manager_invitations, holding_shares removed
  → Postgres retains application data (funds, orders, documents)
```

### 9.4 Cerbos + SpiceDB Coexistence

The two systems work together naturally:

```typescript
// SpiceDB resolver in AuthQueryEngine
"request.resource.attr.hasRelationship": {
  source: "spicedb",
  batchResolver: async (ctx) => {
    const checks = await spicedb.bulkCheckPermission(
      ctx.resourceIds.map(id => ({
        resource: { objectType: "fund", objectId: id },
        permission: "view_metadata",
        subject: { object: { objectType: "user", objectId: ctx.principalId } },
      }))
    );
    return new Map(ctx.resourceIds.map((id, i) => [id, checks[i].allowed]));
  }
},
```

SpiceDB handles relationship graph traversal. Cerbos handles policy evaluation combining relationship results + blockchain data + Haruko data + other context. The AuthQueryEngine orchestrates all sources.

---

## 10. Key Decisions & Trade-offs

### 10.1 Decision Log

| Decision | Chosen | Runner-Up | Reason |
|----------|--------|-----------|--------|
| Policy engine | **Cerbos** | Cedar (AVP) | Derived roles, flat pricing, hierarchy functions, PlanResources |
| Auth wiring | **AuthQueryEngine everywhere** | Selective per field | KIND_ALWAYS_ALLOWED makes universal wiring free; enables pure policy-driven changes |
| Field-level auth | **Batch permission pre-fetch** | Per-field CheckResource | One Cerbos call per object vs N calls per field; same policies |
| Relationship store (day one) | **Postgres** | SpiceDB | Already needed for app data, relationships are 1-hop |
| Future relationship store | **SpiceDB** | OpenFGA | More mature, caveats for ABAC, natural Cerbos pairing |
| On-chain data handling | **Always read fresh** | Event-driven indexer | Blockchain is ground truth; duplication causes sync errors |
| External API data (Haruko) | **Master key + post-filter** | Per-user scoped keys | Simpler integration; post-filtering guarantees security |
| External data resolution | **Parallel (all sources)** | Staged pipeline | Simpler; staged ordering is optimization for later (Appendix C) |
| Blockchain resolver | **Generic (config-driven)** | Per-attribute code | ABI is self-describing codec; zero code for new blockchain attrs (Section 4.3.1) |
| Blockchain display fields | **Generic `resolve()`** | Typed per-field | Zero-code extensibility; DX tradeoff mitigated by enum + codegen (Section 5.9) |
| Attribute security | **Two-gate (registry + Cerbos)** | Cerbos only | Registry allowlist prevents unknown attrs; Cerbos gates per user/role |
| List filtering | **AuthQueryEngine** | Manual DB queries | Unified pattern, automatic query generation, extensible |
| API style | **GraphQL** | REST | Field-level auth, client-controlled cost, DataLoader batching |
| GraphQL filtering | **Server-defined queries** | Arbitrary `where` clauses | Prevents information leakage side-channel |
| OPA | Not chosen | — | Steep Rego curve (1-2 weeks), no derived roles; Prisma adapter now exists (v1.9.0) but learning curve + governance risk (Apple acqui-hire) remain |
| Casbin | Not chosen | — | No query plan generation, point checks only |
| Oso Cloud | Not chosen | — | `listLocal` does not support context facts (no blockchain in list filtering), returns opaque SQL (not inspectable AST), no Prisma adapter |
| Cerbos re-confirmed | **2026-02-16** | OPA | OPA v1.9.0 closed Prisma gap; Cerbos still wins on derived roles, learning curve, structured AST for AuthQueryEngine splitting |

### 10.2 Why Cerbos Over Cedar

| Factor | Cerbos | Cedar |
|--------|--------|-------|
| **Derived roles** | **Native — first-class concept** | Manual (via policy groups) |
| **Pricing model** | **Flat infrastructure (~$15/mo)** | Per-call ($5-150/1M) |
| **Hierarchy functions** | **`ancestorOf`/`descendantOf` built-in** | None |
| **List filtering** | PlanResources → query plan AST | None (manual DB queries) |
| Query plan → ORM | Prisma adapter today; AST is ORM-agnostic | N/A |
| Query duplication | Eliminated | "Accepted trade-off" |
| Managed service | Cerbos Hub (control plane) | AVP (fully managed) |
| Formal analysis | Not available | **Available** |
| AWS integration | Manual | **Native (CloudTrail, Cognito)** |
| Ops overhead | ECS Fargate (~$15/mo) | **Zero** |

**The top three differentiators are architectural, not adapter-specific:**

1. **Derived roles** are unique to Cerbos. No other engine computes context-aware role elevation as a first-class concept. For Elysium, `investor` → `token_holder` when `balance > 0` is a core pattern.

2. **Flat pricing** matters because GraphQL field-level checks multiply authorization calls. At 500M+ checks/month (realistic for field-level auth with 50K users), Cedar costs $2,500+/mo while Cerbos costs ~$30-60/mo.

3. **Hierarchy functions** (`ancestorOf`/`descendantOf`) handle moderate organizational depth without adding SpiceDB. This delays SpiceDB adoption until truly needed.

PlanResources + Prisma adapter is a significant convenience but not the primary reason for choosing Cerbos. The AST output is engine-agnostic — if we migrate ORMs, a new adapter can be written against the same AST format.

**Cedar is better if:** formal policy analysis is critical, zero-ops is the top priority, or the application is pure Lambda with no ECS infrastructure.

**Cerbos is better if:** derived roles are needed, authorization volume is high (flat pricing), or hierarchy support matters.

### 10.3 Event-Driven Write Strategy

| Event | Frequency | Write to Auth Store? | Why |
|-------|-----------|---------------------|-----|
| Token transfer | Very high | **No** — read fresh via multicall | Continuous state, always current |
| Haruko data update | Continuous | **No** — read fresh via API | On-demand, always current |
| Manager whitelists investor | Low | **Yes** — Postgres | Discrete on/off action |
| User shares holdings | Low | **Yes** — Postgres | Discrete on/off action |
| Fund created | Very rare | **Yes** — auto-whitelist trigger | One-time setup |
| User assigned role | Very rare | **Yes** — Cognito group | Admin action |

### 10.4 What We Avoid

| Anti-Pattern | Why It's Bad | What We Do Instead |
|-------------|-------------|-------------------|
| Duplicating blockchain data to a DB | Sync errors, stale data, ground truth divergence | Read fresh via eth_call + multicall |
| Duplicating Haruko data locally | Sync complexity, stale portfolio data | Read fresh via API, post-filter results |
| Manual DB queries for list filtering | Duplicates policy logic, maintenance overhead | Cerbos PlanResources → Prisma |
| Arbitrary GraphQL `where` clauses | Information leakage via binary search | Server-defined query entry points |
| Single authorization system for everything | No system handles point checks + list filtering + multi-source data | AuthQueryEngine federation layer |
| Pre-mature SpiceDB adoption | Ops overhead for 1-hop relationships | Postgres now, SpiceDB when pain is felt |
| User-scoped Haruko API keys | Key management complexity, per-user provisioning | Master key + post-filtering (see Appendix C for optimization) |

---

## Appendix A: Technology Links

**Cerbos:**
- [Cerbos Official](https://www.cerbos.dev/)
- [Cerbos PDP Documentation](https://docs.cerbos.dev/)
- [Cerbos Hub](https://www.cerbos.dev/product-cerbos-hub)
- [@cerbos/orm-prisma (NPM)](https://www.npmjs.com/package/@cerbos/orm-prisma)
- [PlanResources API](https://docs.cerbos.dev/cerbos/latest/api/index.html)
- [Derived Roles](https://docs.cerbos.dev/cerbos/latest/policies/derived_roles.html)
- [CEL Conditions](https://docs.cerbos.dev/cerbos/latest/policies/conditions.html)
- [Filtering Database Results With Query Plans](https://www.cerbos.dev/blog/filtering-database-results-with-cerbos-query-plans)

**Cedar / AWS:**
- [Cedar Policy Language Docs](https://docs.cedarpolicy.com/)
- [Amazon Verified Permissions](https://aws.amazon.com/verified-permissions/)
- [Cedar Interactive Playground](https://www.cedarpolicy.com/)
- [CDK Verified Permissions Constructs](https://github.com/cdklabs/cdk-verified-permissions)

**SpiceDB / Zanzibar:**
- [SpiceDB GitHub](https://github.com/authzed/spicedb)
- [SpiceDB Documentation](https://authzed.com/docs/spicedb/getting-started/discovering-spicedb)
- [Zanzibar Original Paper](https://research.google/pubs/zanzibar-googles-consistent-global-authorization-system/)
- [Zanzibar Annotated by AuthZed](https://authzed.com/zanzibar)

**Other:**
- [OPA Documentation](https://www.openpolicyagent.org/docs/)
- [OPA Partial Evaluation](https://www.openpolicyagent.org/docs/filtering/partial-evaluation)
- [Oso Cloud](https://www.osohq.com/)
- [Casbin](https://www.casbin.org/)
- [OpenFGA](https://openfga.dev/)
- [Permit.io](https://www.permit.io/)
- [Topaz/Aserto](https://www.aserto.com/)
- [GraphQL Authorization — Oso](https://www.osohq.com/post/graphql-authorization)

**External Data:**
- [Haruko](https://www.haruko.io/) — Portfolio data aggregation for digital assets

## Appendix B: Glossary

| Term | Definition |
|------|-----------|
| **ABAC** | Attribute-Based Access Control — decisions based on attributes (role, balance, IP) |
| **RBAC** | Role-Based Access Control — decisions based on assigned roles |
| **ReBAC** | Relationship-Based Access Control — decisions based on graph relationships |
| **PARC** | Principal-Action-Resource-Context — the four inputs to an authorization decision |
| **PDP** | Policy Decision Point — the component that evaluates authorization requests |
| **CEL** | Common Expression Language — Google's expression language used by Cerbos and SpiceDB |
| **Caveat** | A condition attached to a SpiceDB relationship, evaluated at check time (CEL) |
| **Derived role** | A Cerbos role computed dynamically from attributes at evaluation time |
| **PlanResources** | Cerbos API that generates query conditions for list filtering (returns AST) |
| **Predicate pushdown** | Embedding authorization filters into database queries before execution |
| **LookupResources** | SpiceDB reverse query: "what resources can user X access?" (not in original Zanzibar) |
| **Context assembler** | Application middleware that gathers data from multiple sources before an auth check |
| **AuthQueryEngine** | Elysium's data federation layer that splits, resolves, and reunifies authorization queries |
| **DataLoader** | GraphQL pattern for batching and deduplicating data fetching across resolvers |
| **Multicall** | Smart contract that batches multiple eth_calls into a single RPC request |
| **AST splitting** | Separating a query plan AST into DB-resolvable and deferred (external) conditions |
| **Batch resolver** | Function that resolves an attribute for multiple resources in one call (e.g., multicall) |
| **Attribute registry** | Declarative mapping of policy attributes to their data sources and resolution strategies |
| **Post-filtering** | Architectural guarantee that all data is filtered through authorization before reaching the client |
| **Master API key** | A privileged credential used server-side to access all data from an external service (e.g., Haruko) |
| **KIND_ALWAYS_ALLOWED** | Cerbos PlanResources fast path — when a policy has no restrictions for this user/action, returns immediately (<1ms) |
| **Batch permission pre-fetch** | One Cerbos CheckResources call per parent object checking ALL actions, cached for @auth directives |
| **Inherited access** | Performance optimization where a field skips auth because parent authorization implies access (use only after profiling) |
| **Generic blockchain resolver** | Single resolver implementation that handles any EVM view call via config-driven attribute registry (Section 4.3.1) |
| **ABI as universal codec** | EVM function signatures (e.g., `"balanceOf(address)"`) are self-describing — they contain everything needed to encode params and decode results at runtime, enabling fully generic blockchain resolvers |
| **Two-gate security** | Security model where generic resolvers are gated by both (1) registry allowlist and (2) Cerbos per-attribute actions |
| **`resolve()` / `resolveMany()`** | Generic GraphQL fields that delegate to the attribute registry, enabling zero-code extensibility for blockchain/external data (Section 5.9.2) |

## Appendix C: Advanced — Staged Resolution Pipeline (Optimization)

> This appendix describes an optimization for the AuthQueryEngine's Phase 5 (external data resolution). The standard parallel execution described in Section 4.4 is correct and sufficient for the first implementation. The staged pipeline is an efficiency and defense-in-depth optimization for later.

### C.1 Motivation

In the standard flow, all external data sources (blockchain, Haruko, SpiceDB) are resolved in parallel during Phase 5. This is optimal for latency but has two potential inefficiencies:

1. **Over-fetching**: If blockchain data alone would eliminate 80% of candidates, Haruko API calls for those candidates are wasted.
2. **Defense-in-depth**: For sensitive data sources (e.g., Haruko with a master API key), narrowing the request scope reduces the blast radius of a compromised backend.

### C.2 Staged Pipeline Design

Instead of parallel resolution, external sources are resolved sequentially with intermediate filtering:

```
Phase 5a: Resolve blockchain data (multicall)
    │
    ▼
Phase 5b: Security gate — filter candidates using blockchain results
    │
    ▼
Phase 5c: Resolve Haruko data (API) — only for surviving candidates
    │
    ▼
Phase 5d: Security gate — filter using Haruko results
    │
    ▼
Phase 6: Cerbos batch check (fully hydrated)
```

### C.3 Gate Correctness Problem

Naive gates on OR conditions can cause false negatives:

```
Policy: ALLOW IF (holderBalance > 0) OR (hasOpenPositions == true)
```

If a gate after blockchain resolution rejects a candidate because `holderBalance == 0`, it might still qualify via `hasOpenPositions == true` (from Haruko). The gate incorrectly filters it out.

**Solution — EarlyAllowed optimization (Phase 3b):**

After blockchain resolution, candidates that are *already fully satisfiable* (all their ALLOW conditions met with available data) skip remaining gates and proceed directly to Phase 6. Only candidates with unresolved conditions continue through the pipeline.

```typescript
// Phase 3b: EarlyAllowed check
const earlyCheck = await cerbos.checkResources({
  principal,
  resources: candidatesWithBlockchainData.map(c => ({
    resource: { kind: resourceKind, id: c.id, attr: c.partialAttrs },
    actions: [action],
  })),
});

const earlyAllowed = candidates.filter(c => earlyCheck.isAllowed(action, c.id));
const needsMoreData = candidates.filter(c => !earlyCheck.isAllowed(action, c.id));
// Only needsMoreData proceeds to Haruko resolution
```

### C.4 Resource-Specific Pipelines

Different resource types may warrant different resolution orders:

| Resource Type | Pipeline Order | Rationale |
|--------------|---------------|-----------|
| **Fund visibility** | DB → Blockchain → Haruko | Most candidates eliminated by whitelist (DB), then token balance (blockchain) |
| **Portfolio positions** | DB → Haruko → Blockchain | Haruko has position data; blockchain only needed for balance confirmation |
| **On-chain transactions** | DB → Blockchain | No Haruko data needed |
| **Risk reports** | DB → Haruko | No blockchain data needed |

```typescript
const pipelineConfig: Record<string, AttrSource[]> = {
  fund: ["db", "blockchain", "api"],
  portfolio: ["db", "api", "blockchain"],
  transaction: ["db", "blockchain"],
  risk_report: ["db", "api"],
};
```

### C.5 Error Handling in Staged Pipelines

Each resolver stage follows **fail closed** semantics:

- **Resolver failure**: If a blockchain multicall or Haruko API call fails, all candidates depending on that data are denied (fail closed).
- **Partial failure**: If one resolver in a batch fails, only the affected candidates are denied — others proceed normally.
- **Graceful degradation**: The response includes metadata about which data sources failed, allowing the client to show appropriate UI (e.g., "portfolio data temporarily unavailable").

### C.6 When to Implement

Implement the staged pipeline when:
- Phase 5 latency exceeds acceptable thresholds (>500ms consistently)
- Haruko API call volume needs to be minimized for cost reasons
- Security review requires narrowing master key API calls as defense-in-depth
- Monitoring shows >50% of external calls are for candidates that are ultimately denied

Do NOT implement preemptively — the standard parallel resolution is simpler, correct, and sufficient for launch.
