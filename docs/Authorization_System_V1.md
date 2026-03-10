# Authorization System V1

> Implementation-focused specification for Elysium's authorization system. Distilled from the [Authorization Review](./Authorization_Review.md) and subsequent critical analysis. Focuses on the decided stack with V1 simplifications.
>
> Date: 2026-02-12
> Status: Draft — pending spike verification

---

## Table of Contents

1. [Stack Decision](#1-stack-decision)
2. [How It Works](#2-how-it-works)
3. [V1 Simplifications](#3-v1-simplifications)
4. [Cerbos Policies](#4-cerbos-policies)
5. [AuthQueryEngine (Simplified)](#5-authqueryengine-simplified)
6. [GraphQL Integration](#6-graphql-integration)
7. [Data Sources & Resolvers](#7-data-sources--resolvers)
8. [Spike Requirements](#8-spike-requirements)
9. [Unsolved Issues & Open Questions](#9-unsolved-issues--open-questions)
10. [Implementation Roadmap](#10-implementation-roadmap)
11. [Future Optimization Path](#11-future-optimization-path)

---

## 1. Stack Decision

| Component | Technology | Why |
|-----------|-----------|-----|
| **Policy engine** | Cerbos PDP (sidecar) | Derived roles, PlanResources→Prisma, flat pricing, YAML policies |
| **Identity** | Cognito | Already in place, JWT claims, groups |
| **Relationships** | Postgres | 1-hop relationships, already needed for app data |
| **ORM** | Prisma | Already in place, `@cerbos/orm-prisma` V2 adapter (5K+ weekly downloads) |
| **Blockchain data** | Direct eth_call via multicall | Never duplicated, always fresh, block-pinned per request |
| **External API data** | Haruko REST API | Master key + post-filtering |
| **API layer** | GraphQL | Field-level auth, DataLoader batching, client-controlled cost |
| **Future relationship store** | SpiceDB | When hierarchy exceeds 2 hops — NOT for V1 |

**Why Cerbos over Cedar:** Derived roles (first-class context-aware elevation), PlanResources→Prisma (eliminates policy-query duplication), flat infrastructure pricing (~$15/mo vs $5-150/1M calls), hierarchy functions. Cedar is better if zero-ops or formal policy analysis is the priority. See [Authorization Review §3](./Authorization_Review.md#3-technology-evaluation) for full comparison.

---

## 2. How It Works

### The Core Flow (4 Phases)

```
Request arrives → extract principal from JWT
         │
         ▼
Phase 1: PLAN — Cerbos PlanResources
         │     Input: principal + resource kind + action
         │     Output: KIND_ALWAYS_ALLOWED / KIND_ALWAYS_DENIED / KIND_CONDITIONAL (AST)
         │
         │  ┌─ KIND_ALWAYS_ALLOWED → skip to plain Prisma query
         │  ├─ KIND_ALWAYS_DENIED  → return []
         │  └─ KIND_CONDITIONAL    → continue ▼
         │
         ▼
Phase 2: PRE-FILTER — Prisma query with DB conditions only
         │     AST → @cerbos/orm-prisma adapter (maps DB fields only)
         │     External/unmapped conditions → ignored (overfetch is OK)
         │     Result: candidate set (superset of final result)
         │
         ▼
Phase 3: HYDRATE — Resolve external data for candidates
         │     Blockchain: multicall for all candidates (block-pinned)
         │     Haruko: batch API call with master key
         │     All sources resolved in parallel via DataLoaders
         │
         ▼
Phase 4: DECIDE — Cerbos CheckResources (batch)
         │     Input: principal + each candidate with ALL attributes (DB + blockchain + Haruko)
         │     Output: per-candidate allow/deny decision
         │     Filter to allowed only → return final result
```

### Why This Works

- **Phase 1** (PlanResources): Cerbos treats ALL resource attributes as unknowns. Conditions referencing `R.attr.*` appear in the AST as variables. The adapter maps known DB fields to Prisma WHERE clauses and ignores the rest.
- **Phase 2** (Pre-filter): DB conditions (KYC status, jurisdiction, manager relationship, whitelist, fund status) typically eliminate ~90% of candidates. This is the key optimization — external data is only fetched for the surviving ~10%.
- **Phase 3** (Hydrate): Backend always has access to all data sources (blockchain node, Haruko master key). DataLoaders batch and deduplicate calls. Same cache serves both auth and display resolvers.
- **Phase 4** (Decide): With fully hydrated attributes, Cerbos evaluates ALL conditions correctly — including derived roles, external data comparisons, and complex boolean logic. Post-filtering guarantees security.

### Critical Design Principle: R.attr for Per-Resource External Data

Per-resource data (token balance, NAV, fee structure) MUST use `R.attr` (resource attributes), NOT `P.attr` (principal attributes). During PlanResources, resource attributes are unknown — they become AST conditions. Principal attributes are evaluated immediately.

```yaml
# CORRECT — R.attr becomes AST condition, resolved in Phase 3-4
- name: token_holder
  parentRoles: ["investor"]
  condition:
    match:
      expr: R.attr.holderBalance > 0

# WRONG — P.attr evaluated at plan time, but balance is per-fund
- name: token_holder
  parentRoles: ["investor"]
  condition:
    match:
      expr: P.attr.holderBalance > 0
```

### Block-Pinning for Consistency

All blockchain reads within a single request use the same block number:

```typescript
// At request start
const blockNumber = await provider.getBlockNumber();
ctx.requestBlockNumber = blockNumber;

// All subsequent blockchain calls
const result = await multicall.aggregate(calls, { blockTag: ctx.requestBlockNumber });
```

This provides an atomic blockchain snapshot per request, eliminating time-of-check/time-of-use inconsistencies.

---

## 3. V1 Simplifications

What the [Authorization Review](./Authorization_Review.md) proposed vs what V1 actually builds:

| Review Proposed | V1 Does Instead | Why |
|----------------|-----------------|-----|
| Custom AST splitter (partial evaluator) | Ignore unmapped fields, overfetch + post-filter | AST splitting is a compiler problem. Overfetch is acceptable at startup scale |
| Config-driven YAML attribute registry | Simple TypeScript source map | Zero-code extensibility isn't needed when auth rules change quarterly |
| Transform DSL (`{ gt: 0 }`, `{ pick: "level" }`) | TypeScript resolver functions | DSL grows into a language; TypeScript has better tooling and type safety |
| Template interpolation for blockchain calls | Hardcoded resolver functions per attribute | Generalization adds complexity without V1 benefit |
| Generic `resolve(attribute)` GraphQL field | Typed GraphQL fields | Type safety on GraphQL; resolvers can be generic internally |
| Staged resolution pipeline (Appendix C) | Parallel resolution (all sources at once) | Simpler; latency dominated by slowest resolver anyway |
| AuthQueryEngine on EVERY list field | AuthQueryEngine on security-relevant lists only | Reduce overhead; add to remaining lists when policy demands it |
| SpiceDB for hierarchy | Cerbos hierarchy functions + Postgres | 1-hop relationships don't need a graph database |

### What V1 Builds

```
Auth-specific new code:
├── Cerbos deployment (ECS Fargate sidecar)
├── YAML policies (resource policies + derived roles)
├── AuthQueryEngine (simplified 4-phase flow, ~200-300 lines)
├── Prisma adapter wrapper (handle unmapped fields gracefully, ~50 lines)
├── @auth GraphQL directive with batch permission pre-fetch (~100 lines)
├── "Explain access" debug endpoint (~100 lines)
└── Cerbos policy tests in CI

Infrastructure needed anyway (not auth-specific):
├── DataLoaders for blockchain (multicall batching)
├── DataLoaders for Haruko API
├── GraphQL server + schema + resolvers
├── Prisma + Postgres
└── Cognito JWT validation middleware
```

Estimated auth-specific effort: **1-2 weeks**.

---

## 4. Cerbos Policies

### 4.1 Derived Roles

```yaml
apiVersion: api.cerbos.dev/v1
derivedRoles:
  name: fund_roles
  definitions:
    # Manager of this specific fund
    - name: fund_manager
      parentRoles: ["manager"]
      condition:
        match:
          expr: R.attr.managerId == P.id

    # Manager of the umbrella containing this fund
    - name: umbrella_manager
      parentRoles: ["manager"]
      condition:
        match:
          expr: R.attr.umbrellaId == P.attr.umbrellaId

    # Investor who holds tokens in this fund (blockchain data — deferred to Phase 4)
    - name: token_holder
      parentRoles: ["investor"]
      condition:
        match:
          expr: R.attr.holderBalance > 0

    # Investor whitelisted for this fund (DB data — resolved in Phase 2)
    - name: whitelisted_investor
      parentRoles: ["investor"]
      condition:
        match:
          expr: R.attr.whitelistedUserIds.contains(P.id)

    # Platform admin sees everything
    - name: platform_admin
      parentRoles: ["admin"]
```

### 4.2 Resource Policy — Fund

```yaml
apiVersion: api.cerbos.dev/v1
resourcePolicy:
  resource: "fund"
  version: "default"
  importDerivedRoles:
    - fund_roles
  rules:
    # Fund visibility (list filtering via PlanResources)
    - actions: ["view_metadata"]
      effect: EFFECT_ALLOW
      derivedRoles:
        - fund_manager
        - umbrella_manager
        - token_holder
        - whitelisted_investor
        - platform_admin
    - actions: ["view_metadata"]
      effect: EFFECT_ALLOW
      condition:
        match:
          expr: R.attr.isPublic == true

    # Financial data (field-level via CheckResources)
    - actions: ["view_financials"]
      effect: EFFECT_ALLOW
      derivedRoles:
        - fund_manager
        - umbrella_manager
        - token_holder
        - platform_admin

    # Positions / portfolio (Haruko data)
    - actions: ["view_positions"]
      effect: EFFECT_ALLOW
      derivedRoles:
        - fund_manager
        - umbrella_manager
        - platform_admin

    # Investor list
    - actions: ["view_investors"]
      effect: EFFECT_ALLOW
      derivedRoles:
        - fund_manager
        - umbrella_manager
        - platform_admin

    # Mutations
    - actions: ["place_order"]
      effect: EFFECT_ALLOW
      derivedRoles:
        - token_holder
      condition:
        match:
          expr: R.attr.dealingOpen == true

    - actions: ["manage"]
      effect: EFFECT_ALLOW
      derivedRoles:
        - fund_manager
        - platform_admin
```

### 4.3 How Conditions Map to Phases

| Condition in Policy | Source | Resolved In |
|--------------------|--------|-------------|
| `R.attr.managerId == P.id` | Postgres | Phase 2 (Prisma WHERE) |
| `R.attr.umbrellaId == P.attr.umbrellaId` | Postgres | Phase 2 (Prisma WHERE) |
| `R.attr.isPublic == true` | Postgres | Phase 2 (Prisma WHERE) |
| `R.attr.whitelistedUserIds.contains(P.id)` | Postgres (relation) | Phase 2 (Prisma WHERE with relation filter) |
| `R.attr.holderBalance > 0` | Blockchain | Phase 3 (hydrate) → Phase 4 (decide) |
| `R.attr.dealingOpen == true` | Blockchain | Phase 3 (hydrate) → Phase 4 (decide) |

**DB conditions pre-filter; blockchain conditions post-filter.** This is the design.

---

## 5. AuthQueryEngine (Simplified)

### 5.1 Core Implementation

```typescript
interface AuthQueryOptions<T> {
  principal: CerbosPrincipal;
  resourceKind: string;
  action: string;
  prismaModel: PrismaDelegate<T>;
  prismaWhere?: Record<string, unknown>;   // parent-scoping (e.g., { fundId: fund.id })
  prismaInclude?: Record<string, unknown>;
  dbFieldMapper: Record<string, string>;   // Cerbos attr path → Prisma field name
  hydrateExternal?: (candidates: T[], ctx: RequestContext) => Promise<Map<string, Record<string, unknown>>>;
}

async function queryAuthorized<T extends { id: string }>(
  options: AuthQueryOptions<T>,
  ctx: RequestContext,
): Promise<T[]> {
  // Phase 1: PLAN
  const plan = await ctx.cerbos.planResources({
    principal: options.principal,
    resource: { kind: options.resourceKind },
    action: options.action,
  });

  if (plan.kind === PlanKind.ALWAYS_DENIED) return [];

  // Phase 2: PRE-FILTER
  let dbWhere = options.prismaWhere ?? {};

  if (plan.kind === PlanKind.CONDITIONAL) {
    const prismaFilter = queryPlanToPrismaFilter(plan, options.dbFieldMapper);
    dbWhere = { AND: [dbWhere, prismaFilter] };
  }

  const candidates = await options.prismaModel.findMany({
    where: dbWhere,
    include: options.prismaInclude,
  });

  if (candidates.length === 0) return [];

  // If no external data needed OR KIND_ALWAYS_ALLOWED, return as-is
  if (plan.kind === PlanKind.ALWAYS_ALLOWED && !options.hydrateExternal) {
    return candidates;
  }

  // Phase 3: HYDRATE
  let externalAttrs = new Map<string, Record<string, unknown>>();
  if (options.hydrateExternal) {
    externalAttrs = await options.hydrateExternal(candidates, ctx);
  }

  // Phase 4: DECIDE
  const checkResult = await ctx.cerbos.checkResources({
    principal: options.principal,
    resources: candidates.map(c => ({
      resource: {
        kind: options.resourceKind,
        id: c.id,
        attr: {
          ...dbAttrsFrom(c),
          ...(externalAttrs.get(c.id) ?? {}),
        },
      },
      actions: [options.action],
    })),
  });

  return candidates.filter(c =>
    checkResult.isAllowed({ resource: { kind: options.resourceKind, id: c.id }, action: options.action })
  );
}
```

### 5.2 Prisma Adapter Wrapper

The `@cerbos/orm-prisma` adapter must handle unmapped fields gracefully. If the AST contains conditions on blockchain attributes that aren't in the `dbFieldMapper`, the adapter should ignore them (overfetch) rather than throw.

```typescript
function queryPlanToPrismaFilter(
  plan: PlanResourcesResponse,
  dbFieldMapper: Record<string, string>,
): Record<string, unknown> {
  try {
    const result = queryPlanToPrisma({
      queryPlan: plan,
      fieldNameMapper: dbFieldMapper,
    });

    if (result.kind === PlanKind.ALWAYS_ALLOWED) return {};
    if (result.kind === PlanKind.ALWAYS_DENIED) return { id: "__IMPOSSIBLE__" };
    return result.filters;
  } catch (e) {
    // If adapter throws on unmapped fields, fall back to overfetch:
    // fetch ALL candidates, let Phase 4 CheckResources handle filtering.
    // This is correct but less efficient.
    // TODO: Investigate if @cerbos/orm-prisma can be configured to skip unmapped fields.
    //       If not, implement a simple AST pre-processor that strips unmapped conditions.
    console.warn("Prisma adapter could not translate full query plan, falling back to overfetch", e);
    return {};
  }
}
```

**IMPORTANT — Spike item:** Test what `@cerbos/orm-prisma` does with unmapped fields. See [Section 8](#8-spike-requirements).

### 5.3 Attribute Source Map (V1 — Simple TypeScript)

```typescript
// V1: Simple map. No YAML registry, no template DSL.
const FUND_DB_FIELDS: Record<string, string> = {
  "request.resource.attr.isPublic": "isPublic",
  "request.resource.attr.managerId": "managerId",
  "request.resource.attr.umbrellaId": "umbrellaId",
  "request.resource.attr.status": "status",
  // whitelistedUserIds maps to a Prisma relation filter
  "request.resource.attr.whitelistedUserIds": "whitelistedUsers.some.userId",
};

// Blockchain attributes — resolved by hydrator, NOT mapped to Prisma
const FUND_BLOCKCHAIN_ATTRS = ["holderBalance", "dealingOpen", "managementFee", "navPerShare"] as const;

// Haruko attributes — resolved by hydrator
const FUND_HARUKO_ATTRS = ["hasOpenPositions", "riskLevel"] as const;
```

### 5.4 External Data Hydrator

```typescript
async function hydrateFundExternalData(
  candidates: Fund[],
  ctx: RequestContext,
): Promise<Map<string, Record<string, unknown>>> {
  const result = new Map<string, Record<string, unknown>>();
  const addresses = candidates.map(f => f.contractAddress);

  // Blockchain: all calls use pinned block number, batched via multicall
  const [balances, dealingStatuses] = await Promise.all([
    ctx.loaders.balanceOf.loadMany(addresses.map(a => ({ address: a, user: ctx.user.walletAddress }))),
    ctx.loaders.dealingOpen.loadMany(addresses),
  ]);

  // Haruko: batch API call (only if any policy references Haruko attrs)
  // Skipped for V1 if no Haruko-dependent policies exist yet

  candidates.forEach((fund, i) => {
    result.set(fund.id, {
      holderBalance: balances[i] ?? 0n,
      dealingOpen: dealingStatuses[i] ?? false,
      // Add more as policies reference them
    });
  });

  return result;
}
```

---

## 6. GraphQL Integration

### 6.1 Two-Level Authorization

| Level | What It Controls | Mechanism |
|-------|-----------------|-----------|
| **Query-level** (list filtering) | Which funds can you see? | AuthQueryEngine (PlanResources → Prisma → hydrate → CheckResources) |
| **Field-level** | Which fields on those funds? | @auth directive with batch permission pre-fetch (CheckResources) |
| **Mutation guard** | Can you do this action? | Cerbos CheckResource (single point check) |

### 6.2 Schema (Typed — No Generic `resolve()`)

```graphql
type Query {
  """Returns only funds the authenticated user can see"""
  visibleFunds(first: Int, after: String): FundConnection!

  """Single fund — null if unauthorized"""
  fund(id: ID!): Fund
}

type Fund {
  id: ID!
  name: String!
  isPublic: Boolean!
  status: FundStatus!

  # Financial data — field-level auth
  pricing: FundPricing       @auth(action: "view_financials")

  # Portfolio data — field-level auth
  positions: [Position!]!    @auth(action: "view_positions")

  # Investor list — field-level auth
  investors: [Investor!]!    @auth(action: "view_investors")

  # Nested lists — AuthQueryEngine where needed
  classes: [ShareClass!]!
  orders: [Order!]!
}

type FundPricing {
  nav: BigInt!
  sharePrice: BigInt!
  managementFee: Int!
  lastUpdated: DateTime!
}
```

### 6.3 Batch Permission Pre-fetch

One Cerbos call per fund checks ALL field-level actions. @auth directives read from cached result.

```typescript
async function prefetchPermissions(
  fund: Fund,
  ctx: GraphQLContext,
): Promise<CheckResourceResult> {
  if (fund._permissions) return fund._permissions;

  // Hydrate external data BEFORE permission check
  // DataLoader deduplicates: if AuthQueryEngine already fetched this data, it's cached
  const externalAttrs = await hydrateFundExternalData([fund], ctx);
  const attrs = { ...dbAttrsFrom(fund), ...externalAttrs.get(fund.id) };

  const result = await ctx.cerbos.checkResource({
    principal: ctx.principal,
    resource: { kind: "fund", id: fund.id, attr: attrs },
    actions: FUND_FIELD_ACTIONS, // ["view_financials", "view_positions", "view_investors"]
  });

  fund._permissions = result;
  return result;
}
```

**Key: hydrate external data before CheckResources.** The backend always has access to all sources. DataLoader cache means no duplicate fetches.

### 6.4 Pagination — 2x Overfetch

```typescript
// V1: overfetch 2x, filter, return page
async function visibleFundsPaginated(
  first: number,
  after: string | null,
  ctx: GraphQLContext,
): Promise<FundConnection> {
  const overfetchFactor = 2;

  const allAuthorized = await queryAuthorized({
    principal: ctx.principal,
    resourceKind: "fund",
    action: "view_metadata",
    prismaModel: prisma.fund,
    prismaWhere: after ? { id: { gt: after } } : undefined,
    dbFieldMapper: FUND_DB_FIELDS,
    hydrateExternal: hydrateFundExternalData,
  });

  // Take requested page size
  const page = allAuthorized.slice(0, first);
  const hasNextPage = allAuthorized.length > first;

  return {
    edges: page.map(f => ({ node: f, cursor: f.id })),
    pageInfo: { hasNextPage, endCursor: page.at(-1)?.id ?? null },
  };
}
```

Note: V1 doesn't limit the DB query to `first * overfetchFactor` — it fetches all authorized results and slices. This is fine for <1000 funds. Optimize when scale demands.

---

## 7. Data Sources & Resolvers

### 7.1 Source Map

| Source | Access Pattern | Caching | Auth Model |
|--------|---------------|---------|------------|
| **Postgres** | Prisma ORM | Connection pool, same-VPC | Direct — conditions in Prisma WHERE |
| **Blockchain** | ethers.js multicall | DataLoader per request, block-pinned | Phase 3-4 — hydrate then CheckResources |
| **Haruko** | REST API, master key | DataLoader per request | Phase 3-4 — hydrate then post-filter |
| **Cognito** | JWT claims | Per-request extraction | Principal attributes for Cerbos |

### 7.2 DataLoader Setup

```typescript
function createRequestLoaders(ctx: RequestContext) {
  return {
    // Blockchain — all calls use ctx.requestBlockNumber
    balanceOf: new DataLoader<BalanceKey, bigint>(async (keys) => {
      const calls = keys.map(k => ({
        target: k.address,
        callData: fundInterface.encodeFunctionData("balanceOf", [k.user]),
      }));
      const results = await multicall.aggregate.staticCall(calls, { blockTag: ctx.requestBlockNumber });
      return results.map((r, i) => fundInterface.decodeFunctionResult("balanceOf", r)[0]);
    }),

    dealingOpen: new DataLoader<string, boolean>(async (addresses) => {
      const calls = addresses.map(addr => ({
        target: addr,
        callData: fundInterface.encodeFunctionData("isDealingOpen", []),
      }));
      const results = await multicall.aggregate.staticCall(calls, { blockTag: ctx.requestBlockNumber });
      return results.map(r => fundInterface.decodeFunctionResult("isDealingOpen", r)[0]);
    }),

    fundPricing: new DataLoader<string, FundPricing>(async (addresses) => {
      // Batch multicall for nav, sharePrice, managementFee
      // ... similar pattern
    }),

    // Haruko
    harukoPositions: new DataLoader<string, Position[]>(async (fundIds) => {
      const response = await harukoClient.post("/v1/positions/batch", { fundIds: [...fundIds] });
      return response.data.positions;
    }),
  };
}
```

### 7.3 Auth + Display Share DataLoader Cache

Both the AuthQueryEngine (Phase 3 hydration) and GraphQL field resolvers use the same DataLoader instances. If `holderBalance` was fetched during auth, the `Fund.pricing` resolver gets it from cache:

```typescript
// Auth hydrator fetches balanceOf for authorization
const balance = await ctx.loaders.balanceOf.load({ address: fund.contractAddress, user: ctx.user.walletAddress });

// GraphQL field resolver fetches balanceOf for display — cached, no duplicate call
Fund: {
  pricing: async (fund, _, ctx) => {
    return ctx.loaders.fundPricing.load(fund.contractAddress);
    // fundPricing DataLoader may share underlying multicall with balanceOf DataLoader
  },
}
```

---

## 8. Spike Requirements

**Before committing to implementation, verify these unknowns:**

### Spike 1: PlanResources + R.attr Derived Roles (CRITICAL)

Write a test Cerbos policy with a derived role using `R.attr`:
```yaml
- name: token_holder
  parentRoles: ["investor"]
  condition:
    match:
      expr: R.attr.holderBalance > 0
```
Call PlanResources with this policy. Inspect the AST output.

**Verify:**
- [ ] Does the AST contain `request.resource.attr.holderBalance > 0` as a condition?
- [ ] Or does Cerbos try to evaluate the derived role eagerly and fail (because R isn't provided)?
- [ ] What happens when multiple derived roles reference different R.attr fields?
- [ ] Does PlanResources return KIND_CONDITIONAL with the derived role conditions expanded inline?

**If derived role R.attr conditions do NOT appear in the AST:** The architecture needs adjustment. Fallback: use resource policy conditions directly (not via derived roles) for external data, OR use a two-pass approach (PlanResources for DB conditions only + batch CheckResources for external).

### Spike 2: @cerbos/orm-prisma with Unmapped Fields

Use the adapter with a query plan that contains conditions on fields NOT in the fieldNameMapper:
```typescript
queryPlanToPrisma({
  queryPlan: planWithBlockchainCondition,
  fieldNameMapper: {
    // Only DB fields mapped — holderBalance deliberately omitted
    "request.resource.attr.isPublic": "isPublic",
  },
});
```

**Verify:**
- [ ] Does it throw an error?
- [ ] Does it silently skip unmapped conditions?
- [ ] Does it return KIND_ALWAYS_DENIED?
- [ ] If it throws, can we pre-process the AST to strip unmapped conditions (simple tree filter)?

### Spike 3: Cerbos Sidecar Latency (ECS Fargate)

Deploy Cerbos as an ECS sidecar. Measure round-trip latency for:
- [ ] PlanResources call (simple policy)
- [ ] PlanResources call (complex policy with 5+ derived roles)
- [ ] CheckResources batch (10 resources × 6 actions)
- [ ] Sequential: PlanResources → CheckResources pipeline

**Target:** <5ms per PlanResources call, <10ms for batch CheckResources.

### Spike 4: End-to-End Auth Flow

Wire up the simplified 4-phase flow for the `visibleFunds` query:
1. PlanResources → Prisma WHERE (DB conditions only)
2. Prisma query → candidates
3. Multicall for holderBalance
4. CheckResources with full attributes → filtered result

**Measure:** Total latency for 10 funds, 100 funds, 500 funds.

---

## 9. Unsolved Issues & Open Questions

### 9.1 Confirmed Issues (Need Solutions Before Production)

| Issue | Severity | Description | Proposed Approach |
|-------|----------|-------------|-------------------|
| **Policy testing in CI** | High | Config-only policy changes need automated tests | Use Cerbos test framework (YAML test cases). Every policy file gets a corresponding test file. Run in CI. |
| **Pagination correctness** | Medium | Post-filtering on external conditions can return fewer results than requested | 2x overfetch for V1. Acceptable at startup scale. Monitor fill rate. |
| **Audit trail** | Medium | Authorization decisions span multiple phases | Structured logging with request-scoped correlation ID at each phase. Cerbos decision logs. |
| **Cerbos PDP availability** | Medium | Sidecar down = entire platform down | Health checks, ECS auto-restart. Fail closed (deny all) on Cerbos unavailability. No fallback. |
| **Unmapped field handling** | Medium | Unknown how @cerbos/orm-prisma handles fields not in mapper | Spike #2 determines approach. Worst case: simple AST pre-processor (~50 lines). |

### 9.2 Open Questions (Investigate During Implementation)

| Question | Impact | When to Answer |
|----------|--------|---------------|
| How does Cerbos handle derived roles with R.attr during PlanResources? | Architecture-level | **Spike #1 — before starting** |
| Can CheckResources batch across multiple resource kinds in one call? | Performance optimization | During GraphQL integration |
| What's the max multicall batch size before gas limits? | Scale limit | During load testing |
| Does Cerbos support policy hot-reload or does it require restart? | Deployment story | During Cerbos deployment |
| Archive node latency for investment tenure queries | Feature feasibility | When tenure-based auth is needed |
| Haruko API rate limits and batch size limits | Integration constraint | During Haruko integration |

### 9.3 Accepted Trade-offs (V1)

| Trade-off | What We Lose | What We Gain |
|-----------|-------------|-------------|
| Overfetch instead of AST splitting | DB fetches more candidates than needed | No custom compiler; correct results via CheckResources |
| Typed GraphQL instead of generic `resolve()` | New blockchain attribute = schema change + deploy | Full type safety, codegen, IDE support |
| Hardcoded resolvers instead of config-driven registry | New attribute = code change + deploy | Standard TypeScript, testable, debuggable |
| 2x pagination overfetch | Slightly more DB load | Simple implementation, correct results |
| AuthQueryEngine on select lists (not all) | Adding auth to a new list = code change | Less overhead on unrestricted lists |
| Parallel resolution (not staged) | May fetch Haruko data for candidates that blockchain would eliminate | Simpler; latency = max(blockchain, Haruko) not sum |

---

## 10. Implementation Roadmap

### Phase 0: Spike (2-3 days)

- [ ] Spike #1: PlanResources + R.attr derived roles
- [ ] Spike #2: @cerbos/orm-prisma unmapped field handling
- [ ] Spike #3: Cerbos sidecar latency
- [ ] Decision: proceed with plan or adjust based on findings

### Phase 1: Foundation (3-4 days)

- [ ] Deploy Cerbos PDP as ECS Fargate sidecar
- [ ] Write fund resource policy + derived roles YAML
- [ ] Write policy test cases (YAML) + CI integration
- [ ] Implement AuthQueryEngine (simplified 4-phase)
- [ ] Implement Prisma adapter wrapper (unmapped field handling)

### Phase 2: GraphQL Integration (3-4 days)

- [ ] Wire `visibleFunds` query through AuthQueryEngine
- [ ] Implement @auth directive with batch permission pre-fetch
- [ ] Implement blockchain DataLoaders (multicall, block-pinned)
- [ ] Wire field-level auth for Fund type (pricing, positions, investors)
- [ ] Add external data hydration before permission pre-fetch

### Phase 3: Hardening (2-3 days)

- [ ] Structured logging at each auth phase (correlation IDs)
- [ ] "Explain access" admin/debug endpoint
- [ ] Error handling: Cerbos unavailable, blockchain timeout, Haruko failure
- [ ] Pagination with overfetch
- [ ] Load test: measure end-to-end latency at 10/100/500 fund scale

### Phase 4: Extend (ongoing)

- [ ] Add resource policies for ShareClass, Order, Holding, Document
- [ ] Add Haruko data hydrator when portfolio auth rules needed
- [ ] Add mutation guards (place_order, manage, whitelist_investor)
- [ ] Monitoring: auth decision latency, overfetch ratio, Cerbos call volume

---

## 11. Future Optimization Path

When V1 reaches scale limits, these optimizations are available without architectural changes:

| Optimization | Trigger | What Changes |
|-------------|---------|-------------|
| **AST pre-processing** | Unmapped fields cause too much overfetch | Simple tree filter strips external conditions from AST before Prisma adapter |
| **Config-driven attribute registry** | New attributes needed monthly instead of quarterly | Move source map to YAML, add template interpolation for blockchain calls |
| **Staged resolution pipeline** | Haruko API calls are expensive / rate-limited | Resolve blockchain first, filter, then Haruko for survivors |
| **AuthQueryEngine on all lists** | Policy changes require code changes to wire new lists | Wire AuthQueryEngine universally (KIND_ALWAYS_ALLOWED fast path makes it free) |
| **SpiceDB for relationships** | Org hierarchy exceeds 2 hops, complex graph traversal needed | Add SpiceDB resolver to hydration step. Cerbos policies unchanged |
| **Cerbos Hub** | Team grows, non-developers need to manage policies | Managed control plane for policy distribution, testing UI |
| **Per-resource pipeline configs** | Different resources have different optimal resolution orders | Map resource kind → resolution pipeline (e.g., `fund: ["db", "blockchain", "haruko"]`) |

---

## References

- [Authorization Review (full technology evaluation)](./Authorization_Review.md)
- [Cerbos Documentation](https://docs.cerbos.dev/)
- [Cerbos PlanResources API](https://docs.cerbos.dev/cerbos/latest/api/index.html)
- [Cerbos Derived Roles](https://docs.cerbos.dev/cerbos/latest/policies/derived_roles.html)
- [@cerbos/orm-prisma V2.0](https://www.cerbos.dev/blog/cerbos-prisma-integration-v2-0)
- [Cerbos Query Plan Adapters (GitHub)](https://github.com/cerbos/query-plan-adapters)
- [Zanzibar Paper (Google)](https://research.google/pubs/zanzibar-googles-consistent-global-authorization-system/)
