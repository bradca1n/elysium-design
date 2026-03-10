# GraphQL Context Architecture

## Problem

The current `buildContext` (`services/api/src/graphql/context.ts`) eagerly loads everything on every request:

- **Blockchain RPC call** to pin block number — no resolver uses it yet
- **Two DB queries** (User + PlatformAccess with joins) — most resolvers only need `walletAddress`
- **Privy token verification** — always needed, this is fine

Every request pays the full cost regardless of which resolver runs. Auth checks are also scattered: every resolver manually checks `if (!ctx.walletAddress) throw`.

## Target Architecture

Separate three concerns that are currently tangled together.

### Layer 1: Authentication (Context)

Context becomes a thin identity envelope. Only verify the token and extract cheap, always-needed values:

```typescript
export async function buildContext(event: APIGatewayProxyEventV2): Promise<GraphQLContext> {
  const appPlatform = event.headers?.['x-app-platform'] ?? null;
  const privyUser = await verifyToken(event); // or null

  return {
    privyUser,
    walletAddress: null,       // populated lazily
    appPlatform,
    // lazy getters and hydrators below
    getPrincipal: lazyMemo(() => loadPrincipal(privyUser, appPlatform)),
    getBlockNumber: lazyMemo(() => getPublicClient().getBlockNumber()),
    hydrators: createHydrators(privyUser),
    loaders: createRequestLoaders(),
  };
}
```

No DB calls. No RPC calls. Just token verification.

### Layer 2: Authorization

Two complementary patterns, solving different problems.

#### `@auth` Directive — Access Gates

For binary "can you access this field at all?" checks. Replaces the repeated `if (!ctx.walletAddress) throw` boilerplate:

```graphql
type Query {
  me: User! @auth
  portfolio: Portfolio! @auth(requires: INVESTOR)
  funds: [Fund!]! @auth(requires: [INVESTOR, FUND_ADMIN])
  chainInfo: ChainInfo!  # public, no directive
}
```

The directive:
1. Checks `ctx.privyUser` exists (authn)
2. Lazy-loads principal attrs from DB (first access only, then cached)
3. Calls Cerbos `isAllowed()` for coarse role checks
4. Caches principal on context for downstream use

#### `planResources` — Data Scoping

For "which subset of resources can this user see?" filtering. This lives **inside resolvers**, not in directives, because it produces a Prisma WHERE clause that shapes the query itself:

```typescript
// funds resolver
funds: async (_, args, ctx) => {
  const fundAttrs = await ctx.hydrators.fund();
  const principal = buildCerbosPrincipal({ ...await ctx.getPrincipal(), ...fundAttrs });
  const authFilter = await planFundsQuery(principal);

  return prisma.fund.findMany({
    where: { AND: [authFilter, args.filter ?? {}] },
  });
}
```

### Layer 3: Data Loading

All DB and chain reads move to **DataLoaders** and **resolvers**. DataLoaders handle batching and deduplication — if multiple resolvers need the same record, it's fetched once.

```
buildContext (fast)
  → @auth directive fires (lazy-loads principal, checks Cerbos)
  → resolver body (uses DataLoaders for DB/chain reads)
  → child resolvers (share same loaders, deduped)
```

## Multi-Source Authorization: Hydrate → Plan → Query

Some authorization decisions depend on data from multiple heterogeneous sources. For example, "user subscribable funds" combines:

| Source | Data | How |
|--------|------|-----|
| On-chain | Funds user holds tokens in | View call to diamond proxy |
| Database | Funds a manager invited the user to | Prisma query on invitations |
| Static | Publicly listed funds | Prisma query on fund visibility |

These can't all live in a single Prisma WHERE clause because some data is on-chain. The solution: **hydrate first, then plan**.

### Flow

```
1. HYDRATE — Gather attrs from all sources
   ┌──────────┐  ┌──────────┐  ┌──────────┐
   │ On-chain │  │    DB    │  │  Static  │
   │ balances │  │ invites  │  │  rules   │
   └────┬─────┘  └────┬─────┘  └────┬─────┘
        └──────┬──────┘─────────────┘
               ▼
2. BUILD principal with hydrated attrs
   { subscribableFundIds: [1, 2, 3, 4, 5], role: 'investor' }
               ▼
3. PLAN — Cerbos planResources(principal, 'fund:read')
               ▼
4. QUERY — Prisma WHERE from Cerbos plan
   { id: { in: [1, 2, 3, 4, 5] } }
```

### Hydration Example

```typescript
async function hydrateSubscribableFunds(
  walletAddress: string,
  userId: string,
): Promise<number[]> {
  const [onChainFunds, invitedFunds, publicFunds] = await Promise.all([
    // Source 1: on-chain token balances
    getPortfolioFundIds(walletAddress),
    // Source 2: DB — accepted invitations
    prisma.fundInvitation.findMany({
      where: { userId, status: 'ACCEPTED' },
      select: { fundId: true },
    }).then(rows => rows.map(r => r.fundId)),
    // Source 3: DB — public funds
    prisma.fund.findMany({
      where: { visibility: 'PUBLIC' },
      select: { id: true },
    }).then(rows => rows.map(r => r.id)),
  ]);

  return [...new Set([...onChainFunds, ...invitedFunds, ...publicFunds])];
}
```

### Cerbos Policy

The policy references the hydrated attrs on the principal:

```yaml
# cerbos/policies/fund.yaml
resourcePolicy:
  resource: fund
  version: default
  rules:
    - actions: ["read"]
      roles: ["investor"]
      condition:
        match:
          expr: request.resource.id in request.principal.attr.subscribableFundIds

    - actions: ["read"]
      roles: ["fund-admin"]
      effect: EFFECT_ALLOW  # fund admins see all funds in their umbrella
      condition:
        match:
          expr: >
            request.resource.attr.umbrellaFundId in
            request.principal.attr.assignedUmbrellaFundIds
```

`planResources` translates these conditions into a Prisma WHERE clause via `@cerbos/orm-prisma`.

## Per-Resource Hydrators

Different resource types need different authorization data. Use lazy, memoized, per-resource hydrators on context so each resolver only pays for what it needs:

```typescript
export type GraphQLContext = {
  // Identity (always available, cheap)
  privyUser: PrivyUser | null;
  appPlatform: string | null;

  // Lazy auth (loaded on first access, cached)
  getPrincipal: () => Promise<PrincipalAttrs>;
  getBlockNumber: () => Promise<bigint>;

  // Per-resource hydrators (each loaded independently, cached)
  hydrators: {
    fund: () => Promise<{ subscribableFundIds: number[] }>;
    portfolio: () => Promise<{ portfolioFundIds: number[] }>;
    // add more as needed
  };

  // DataLoaders (batching + dedup)
  loaders: RequestLoaders;
};
```

### `lazyMemo` Helper

```typescript
function lazyMemo<T>(fn: () => Promise<T>): () => Promise<T> {
  let cached: Promise<T> | null = null;
  return () => {
    if (!cached) cached = fn();
    return cached;
  };
}
```

### Resolver Usage

```typescript
const resolvers = {
  Query: {
    funds: async (_, args, ctx) => {
      // Directive already checked auth
      const [principal, fundAttrs] = await Promise.all([
        ctx.getPrincipal(),
        ctx.hydrators.fund(),
      ]);
      const filter = await planFundsQuery({ ...principal, ...fundAttrs });
      return prisma.fund.findMany({ where: filter });
    },

    portfolio: async (_, __, ctx) => {
      // Only needs walletAddress — no hydration cost
      const { walletAddress } = await ctx.getPrincipal();
      return getPortfolio(walletAddress);
    },
  },
};
```

## Multi-Role Access: Same Endpoint, Different Views

Different user types see different data from the same `Query.funds` endpoint. The resolver doesn't branch on role — Cerbos policies handle that. Each role just needs different **principal attrs** hydrated before the plan call.

### Role → Hydration → Policy Flow

| Role | What they see | Hydration source | Principal attr |
|------|--------------|------------------|----------------|
| **Investor** | Funds they hold tokens in + invited + public | On-chain balances, DB invitations, DB visibility | `subscribableFundIds` |
| **Manager** | All funds in their umbrella fund(s) | DB: UmbrellaFundAdmin join | `assignedUmbrellaFundIds` |
| **Fund Admin** | All funds (unrestricted) | None needed | Role alone is sufficient |

The key insight: the **resolver is identical** for all roles. What changes is:
1. Which principal attrs the hydrator populates (based on `platformAccessType`)
2. Which Cerbos policy rule matches (based on role + attrs)

### Hydrator: Role-Aware Fund Hydration

The fund hydrator checks the user's roles and gathers the relevant attrs:

```typescript
function createFundHydrator(
  getPrincipal: () => Promise<PrincipalAttrs>,
): () => Promise<FundHydrationAttrs> {
  return lazyMemo(async () => {
    const principal = await getPrincipal();

    // Fund admin — Cerbos policy grants ALWAYS_ALLOWED, no extra attrs needed
    if (principal.platformAccessType === 'fund-admin') {
      return {};
    }

    // Manager — needs to know which umbrella funds they manage
    // (already on principal from DB via PlatformAccess join)
    if (principal.platformAccessType === 'manager') {
      return {
        assignedUmbrellaFundIds: principal.assignedUmbrellaFundIds,
      };
    }

    // Investor — needs subscribable fund IDs from multiple sources
    const [onChainFunds, invitedFunds, publicFunds] = await Promise.all([
      getPortfolioFundIds(principal.walletAddress),
      prisma.fundInvitation.findMany({
        where: { userId: principal.userId, status: 'ACCEPTED' },
        select: { fundId: true },
      }).then(rows => rows.map(r => r.fundId)),
      prisma.fund.findMany({
        where: { visibility: 'PUBLIC' },
        select: { id: true },
      }).then(rows => rows.map(r => r.id)),
    ]);

    return {
      subscribableFundIds: [...new Set([...onChainFunds, ...invitedFunds, ...publicFunds])],
    };
  });
}
```

### Cerbos Policy: One Resource, Multiple Rules

Each rule matches a different role. Cerbos evaluates them top-down — the first match wins:

```yaml
# cerbos/policies/fund.yaml
resourcePolicy:
  resource: fund
  version: default
  rules:
    # Fund admins see everything
    - actions: ["read"]
      roles: ["fund-admin"]
      effect: EFFECT_ALLOW

    # Managers see funds in their umbrella fund(s)
    - actions: ["read"]
      roles: ["manager"]
      effect: EFFECT_ALLOW
      condition:
        match:
          expr: >
            request.resource.attr.umbrellaFundId in
            request.principal.attr.assignedUmbrellaFundIds

    # Investors see funds they're subscribed to
    - actions: ["read"]
      roles: ["investor"]
      effect: EFFECT_ALLOW
      condition:
        match:
          expr: >
            request.resource.id in
            request.principal.attr.subscribableFundIds
```

### What `planResources` Returns Per Role

| Role | Plan result | Generated Prisma WHERE |
|------|------------|----------------------|
| Fund Admin | `ALWAYS_ALLOWED` | `{}` (no filter) |
| Manager | `CONDITIONAL` | `{ umbrellaFundId: { in: [1, 2] } }` |
| Investor | `CONDITIONAL` | `{ id: { in: [3, 5, 7, 12] } }` |
| No role | `ALWAYS_DENIED` | `{ id: { lt: 0 } }` (matches nothing) |

### The Resolver: Role-Agnostic

The resolver doesn't need to know about roles at all. It just calls the hydrator and passes everything to Cerbos:

```typescript
funds: async (_, args, ctx) => {
  const [principal, fundAttrs] = await Promise.all([
    ctx.getPrincipal(),
    ctx.hydrators.fund(),
  ]);

  // Cerbos figures out the right filter based on role + attrs
  const authFilter = await planFundsQuery({ ...principal, ...fundAttrs });

  return prisma.fund.findMany({
    where: { AND: [authFilter, args.filter ?? {}] },
  });
}
```

A manager and an investor can call the exact same query:

```graphql
query {
  funds {
    id
    name
    nav
  }
}
```

The manager gets funds in their umbrella. The investor gets funds they hold tokens in plus public funds. The resolver code is identical — the policy decides.

### Adding a New Role

To add a new role (e.g., "auditor" who can see all funds but read-only):

1. **Add a Cerbos rule** in `fund.yaml` for the `auditor` role
2. **Update the hydrator** if the role needs new attrs (auditor probably doesn't — `ALWAYS_ALLOWED` like fund-admin)
3. **No resolver changes** — the same endpoint just works

## The PlanResources AST: How It Drives Data Fetching

Cerbos `planResources` is an existing API that returns an **Abstract Syntax Tree (AST)** — a structured expression tree representing the conditions under which a user can access a resource. The `@cerbos/orm-prisma` adapter that maps this AST to Prisma WHERE clauses is also an existing library (already used in `planFundsQuery.ts`).

What we need to build on top of this is a **4-phase flow** that extends the AST-driven approach to handle external data sources (blockchain, Haruko). Phases 1-2 (plan + Prisma pre-filter) are already implemented. Phases 3-4 (external data hydration + `checkResources` post-filter) are **not yet built** and require spike verification first.

> **Open spikes before implementation:**
> - **Spike 1 — Derived roles with `R.attr`:** When a derived role condition references a resource attribute (e.g., `R.attr.holderBalance > 0`), does `planResources` include it in the AST? Or does Cerbos try to evaluate it eagerly and fail? This determines whether derived roles can reference blockchain data.
> - **Spike 2 — Unmapped fields in `@cerbos/orm-prisma`:** When the AST contains conditions on fields not in the mapper (e.g., `holderBalance`), does the adapter throw, silently skip them, or return `ALWAYS_DENIED`? The overfetch strategy depends on it silently skipping.

### What the AST Is

When you call `planResources`, Cerbos doesn't evaluate the policy — it can't, because the resource attributes are unknown (we haven't queried for resources yet). Instead, it returns one of three results:

| Result | Meaning | What to do |
|--------|---------|------------|
| `KIND_ALWAYS_ALLOWED` | Policy grants access regardless of resource attrs | Skip filtering, return all |
| `KIND_ALWAYS_DENIED` | Policy denies access regardless | Return empty |
| `KIND_CONDITIONAL` | Access depends on resource attributes | **AST contains the conditions** |

The `CONDITIONAL` case is where the AST matters. It's a tree of boolean expressions referencing resource and principal attributes:

```
AND
├── OR
│   ├── request.resource.attr.isPublic == true          ← DB field
│   ├── request.resource.attr.managerId == "pa_abc"     ← DB field
│   └── request.resource.attr.holderBalance > 0         ← Blockchain field
└── request.resource.attr.status == "active"            ← DB field
```

### Splitting the AST: DB vs External

The AST contains conditions that reference **different data sources**. The `@cerbos/orm-prisma` adapter maps the ones it knows about to Prisma WHERE clauses and skips the rest:

```
AST from Cerbos
│
├─ Mapped fields (DB)               ──→  Prisma WHERE clause (Phase 2)
│  • isPublic, managerId, status,
│  • umbrellaId, whitelistedUserIds
│
└─ Unmapped fields (external)        ──→  Ignored at query time (Phase 3-4)
   • holderBalance, dealingOpen,
   • hasOpenPositions
```

This "ignore unmapped" behavior means Phase 2 **overfetches** — it returns candidates that might fail the external conditions. That's intentional. The external conditions are resolved later.

### Concrete Example: Investor Querying Funds

**Policy** (simplified):
```yaml
rules:
  - actions: ["view_metadata"]
    roles: ["investor"]
    condition:
      match:
        all:
          of:
            - expr: request.resource.attr.status == "active"
            - any:
                of:
                  - expr: request.resource.attr.isPublic == true
                  - expr: request.resource.attr.holderBalance > 0
                  - expr: request.resource.attr.whitelistedUserIds.contains(P.id)
```

**Step 1 — `planResources` returns this AST:**

```typescript
// Pseudocode representation of the AST Cerbos returns
{
  kind: "KIND_CONDITIONAL",
  condition: {
    operator: "AND",
    operands: [
      {
        operator: "eq",
        // DB field — adapter can map this
        field: "request.resource.attr.status",
        value: "active"
      },
      {
        operator: "OR",
        operands: [
          {
            operator: "eq",
            // DB field — adapter can map this
            field: "request.resource.attr.isPublic",
            value: true
          },
          {
            operator: "gt",
            // Blockchain field — adapter CANNOT map this
            field: "request.resource.attr.holderBalance",
            value: 0
          },
          {
            operator: "contains",
            // DB relation — adapter can map this
            field: "request.resource.attr.whitelistedUserIds",
            value: "user_123"
          }
        ]
      }
    ]
  }
}
```

**Step 2 — `@cerbos/orm-prisma` maps what it can:**

```typescript
const fieldMapper = {
  "request.resource.attr.status":             { field: "status" },
  "request.resource.attr.isPublic":           { field: "isPublic" },
  "request.resource.attr.whitelistedUserIds": { relation: { name: "whitelist", field: "userId" } },
  // holderBalance deliberately NOT mapped — it's blockchain data
};

const prismaFilter = queryPlanToPrisma({ queryPlan: plan, mapper: fieldMapper });
```

The adapter produces a Prisma WHERE that covers DB conditions only. Because `holderBalance > 0` is unmapped, the OR branch becomes more permissive (overfetch):

```typescript
// Generated Prisma WHERE (Phase 2 — DB pre-filter)
{
  AND: [
    { status: "active" },
    {
      OR: [
        { isPublic: true },
        // holderBalance condition SKIPPED — overfetch is OK
        { whitelist: { some: { userId: "user_123" } } },
      ]
    }
  ]
}
```

This returns, say, 50 candidate funds from the DB.

**Step 3 — Hydrate external data for candidates:**

```typescript
// Only fetch blockchain data for the 50 candidates, not all funds
const externalAttrs = await hydrateFundExternalData(candidates, ctx);
// Uses DataLoader + multicall, block-pinned
// Result: Map<fundId, { holderBalance: bigint, dealingOpen: boolean }>
```

**Step 4 — `checkResources` with full attributes:**

```typescript
// Now Cerbos has ALL the data — DB attrs + blockchain attrs
const checkResult = await cerbos.checkResources({
  principal,
  resources: candidates.map(fund => ({
    resource: {
      kind: "fund",
      id: fund.id,
      attr: {
        status: fund.status,                            // DB
        isPublic: fund.isPublic,                        // DB
        whitelistedUserIds: fund.whitelist.map(w => w.userId), // DB
        holderBalance: externalAttrs.get(fund.id)?.holderBalance ?? 0n, // Blockchain
      },
    },
    actions: ["view_metadata"],
  })),
});

// Filter to only allowed funds — the holderBalance condition is now evaluated
const authorizedFunds = candidates.filter(fund =>
  checkResult.isAllowed({ resource: { kind: "fund", id: fund.id }, action: "view_metadata" })
);
// Result: 30 of the 50 candidates pass (the 20 rejected had holderBalance == 0
// and weren't public or whitelisted)
```

### Why This Matters

The AST is what makes the 4-phase flow possible without duplicating policy logic in application code:

| Without AST | With AST |
|------------|----------|
| Developer writes Prisma WHERE clauses that mirror Cerbos policies | Cerbos generates the WHERE clause from the policy |
| Policy change = code change | Policy change = YAML change only |
| DB conditions and blockchain conditions handled separately by hand | AST splits them automatically |
| Easy to have policy drift (code says one thing, policy says another) | Single source of truth (Cerbos policy) |

The trade-off is overfetch — when the AST contains unmapped external conditions, Phase 2 returns more candidates than will ultimately be authorized. Phase 4 post-filtering corrects this. At V1 scale (<1000 funds), this is acceptable. See [Authorization_System_V1.md §11](./Authorization_System_V1.md) for the optimization path when this becomes a bottleneck.

### How This Fits With the Hydrator Pattern

The hydrator pattern described earlier in this document handles a **different problem**: populating *principal* attributes (what the user has access to) before calling `planResources`. The AST handles *resource* attributes (properties of each fund/resource) after the plan call.

Both work together in the full flow:

```
1. Hydrator populates PRINCIPAL attrs     →  "This investor subscribes to funds [1,2,3]"
2. planResources returns AST              →  "Show funds where status=active AND (isPublic OR holderBalance>0)"
3. @cerbos/orm-prisma maps DB conditions  →  Prisma WHERE { status: "active", isPublic: true }
4. Hydrate RESOURCE attrs for candidates  →  Fetch holderBalance from chain for each candidate
5. checkResources with full attrs         →  Final allow/deny per candidate
```

Steps 1-2 use principal attributes (known upfront). Steps 3-5 use the AST to determine which resource attributes to fetch and when.

## Summary

| Layer | What | Where | When |
|-------|------|-------|------|
| Authentication | Verify token, extract identity | `buildContext` | Every request |
| Coarse authorization | Role/access gates | `@auth` directive | Per protected field |
| Principal hydration | Gather attrs from chain + DB | `ctx.hydrators.*` | Lazily, per resource type |
| Fine authorization | Query scoping via Cerbos plans | `planResources` in resolver | List queries |
| Data fetching | DB/chain reads | DataLoaders + resolvers | On demand |
