# Authorization System ADR

> Date: 2026-02-19
> Status: Active — spikes verified, implementation in progress
> Authors: Engineering

---

## 1. Problem Statement

The API needs to authorize access to fund resources whose eligibility spans **multiple heterogeneous data sources**: a Postgres database (fund metadata, manager relationships, whitelists), a blockchain (per-user token balances, dealing-window state), and an external REST API (Haruko, for portfolio/position data).

**The blockchain is the final source of truth** for fund ownership and dealing state. We deliberately avoid introducing a blockchain indexer — doing so would add operational complexity, introduce sync lag, and create a secondary source of truth that can drift from on-chain reality. Authorization decisions that depend on chain state (e.g., "does this investor hold tokens in this fund?") must query the chain directly, not a cached copy.

This creates a structural problem: relational databases are queryable with WHERE clauses, but blockchain state is not. A single-source approach — Prisma WHERE clauses alone — cannot express blockchain conditions. Pre-loading all accessible resource IDs onto the principal breaks down when conditions are per-resource (e.g., "investor holds tokens *in this specific fund*"), not per-user. The authorization system must handle both DB-queryable conditions and live blockchain reads within the same request, without duplicating policy logic across the two planes.

The system also needs field-level authorization (e.g., financials visible only to token holders) on top of list-level scoping. The GraphQL layer requires a consistent, auditable mechanism to enforce both.

This decision is needed now because the API layer is being built and the authorization pattern needs to be established before resolvers proliferate — retrofitting is far more costly.

---

## 2. Context & Constraints

**Background:**

- **Identity**: Authentication provider-issued JWTs, already validated in middleware. Privy the current choice, see ./Authentication ADR.md
- **Data sources for auth decisions**: Postgres (fund status, manager IDs, umbrella membership, investor whitelists), on-chain (ERC-20 `balanceOf`, `isDealingOpen`), Haruko REST API (portfolio positions).
- **Roles**: `investor`, `manager`, `fund-admin`, `admin`. Access rules differ per role and per resource.
- **Existing stack**: Serverless AWS Lambda, Apollo Server GraphQL, Prisma ORM (Postgres), DataLoaders for batching.
- **V1 scale**: <1,000 funds. Performance optimization can be deferred.

**Constraints:**

- Must **fail closed**: if the policy engine is unavailable, deny all access — no fallback to permissive mode.
- Blockchain reads within a single request must be **block-pinned** (atomic snapshot) to prevent time-of-check/time-of-use inconsistencies.
- Authorization logic must be **auditable** (structured decision logs with correlation IDs).
- Policy changes for existing attribute types must **not require code deployments** — only YAML + CI.
- Auth-specific new code budget: ~1–2 weeks. Infrastructure that would be needed regardless (DataLoaders, Prisma, GraphQL) does not count against this.

**Non-Goals (V1):**

- Graph-relationship traversal beyond 1 hop (no SpiceDB).
- A generic config-driven system for declaring blockchain/external attributes and their fetch logic in YAML — new blockchain attributes require a TypeScript code change, not just a config edit.
- Generic `resolve(attribute)` GraphQL field — typed GraphQL fields only.
- Staged resolution pipeline (parallel resolution is simpler and sufficient at V1 scale).
- AuthQueryEngine on every list field — only security-relevant lists.

---

## 3. Options Considered

### Option A: Cerbos PDP with 4-Phase AuthQueryEngine

A Cerbos policy decision point (PDP) runs as a sidecar. Authorization uses a 4-phase flow per list query:

1. **Plan** — `planResources(principal, resourceKind, action)` → returns `ALWAYS_ALLOWED`, `ALWAYS_DENIED`, or `CONDITIONAL` (AST of conditions).
2. **Pre-filter** — `@cerbos/orm-prisma` adapter translates DB-mappable AST conditions into a Prisma `WHERE` clause; unmapped (blockchain) conditions are ignored (overfetch).
3. **Hydrate** — External data (blockchain via multicall, Haruko via batch API) resolved in parallel for candidate set only.
4. **Decide** — `checkResources(principal, candidates-with-full-attrs)` → per-resource allow/deny; filter to allowed set.

Field-level auth uses a `@auth` GraphQL directive with batch `checkResource` pre-fetch (one Cerbos call per fund checks all field-level actions).

Policies are YAML files (`cerbos/policies/`), version-controlled, tested in CI via the Cerbos test framework.

#### Pros

- `planResources` eliminates policy-query duplication: the Prisma WHERE clause is derived from the policy, not reimplemented alongside it.
- Derived roles (e.g., `token_holder`, `fund_manager`) are first-class in Cerbos — contextual elevation without if/else in application code.
- `@cerbos/orm-prisma` V2 adapter handles AST→Prisma translation with ~50 lines of wrapper code.
- Flat infrastructure pricing (~$15/mo as ECS Fargate sidecar vs. per-call pricing on managed services).
- YAML policies are reviewable by non-developers and testable in CI without deploying application code.
- DataLoader cache means auth hydration and display resolver hydration share the same fetched data — no double-fetching.
- Single source of truth: policy change = YAML change only, no application code change.

#### Cons

- Adds a new infrastructure dependency (Cerbos sidecar) — availability risk if sidecar is down.
- Two critical behaviors need spike verification before implementation can proceed (see §6): (a) whether derived role `R.attr` conditions appear in the `planResources` AST, and (b) whether `@cerbos/orm-prisma` silently skips unmapped fields or throws.
- Overfetch on external conditions: Phase 2 returns more DB candidates than will ultimately be authorized. Acceptable at <1,000 funds; requires monitoring.
- Pagination interacts poorly with post-filtering: page of N may return fewer than N results. Mitigated by 2× overfetch, but not eliminated.

---

### Option B: Cedar (AWS) as Policy Engine

Cedar is AWS's policy language (used in Amazon Verified Permissions). Policies are formal and verifiable. AWS manages the runtime.

#### Pros

- Zero infrastructure to operate — managed service.
- Formal policy verification (catch policy errors at write-time).
- Native AWS integration with Cognito.

#### Cons

- No `planResources` equivalent — Cedar has no built-in mechanism to generate database query predicates from policies. The DB filter must be manually kept in sync with Cedar policies, creating policy drift risk.
- Per-call pricing ($5–$150/1M calls) is unpredictable at scale vs. flat Cerbos sidecar cost.
- Derived roles are not a native concept — context-aware role elevation requires custom logic.
- No `@cerbos/orm-prisma`-style adapter in the Cedar ecosystem.
- The key design advantage (AST → Prisma pre-filter → external hydration → post-filter) is not achievable without significant custom engineering.

---

### Option C: Custom Application-Level Authorization

Write authorization logic directly in resolvers and service code: role checks via Cognito claims, DB-scoping queries hardcoded per resolver, blockchain condition checked in-memory post-query.

#### Pros

- No new infrastructure dependencies.
- No learning curve on policy engines.
- Full control over execution model.

#### Cons

- Policy logic scattered across resolver code — no single source of truth. A policy change requires finding and updating all affected resolvers.
- Policy drift is guaranteed at scale: the Prisma WHERE and the post-filter logic must be kept in sync manually.
- No structured policy tests — authorization correctness is verified only via integration tests.
- Adding a new role or condition requires code changes and a deployment.
- Field-level auth requires bespoke per-resolver code rather than a declarative directive.
- Auditing authorization decisions requires custom instrumentation everywhere.

---

## 4. Decision

> We are implementing authorization using **Cerbos PDP as an ECS Fargate sidecar**, with a **4-phase AuthQueryEngine** (Plan → Enrich → Pre-filter → Decide) and a **`@auth` GraphQL directive** for field-level access gates.
>
> Spikes have been completed and verified in code (see §6). Implementation is in progress.

**Selected stack:**

| Component | Technology |
|-----------|-----------|
| Policy engine | Cerbos PDP (ECS Fargate sidecar) |
| Identity | Cognito JWT claims |
| Relationships | Postgres via Prisma |
| ORM adapter | `@cerbos/orm-prisma` V2 |
| Blockchain data | multicall via viem.js, block-pinned per request |
| External API data | Haruko REST API, master key, batch endpoint |
| API layer | GraphQL with `@auth` directive |
| Future hierarchy | SpiceDB (when >1 hop needed — not V1) |

---

## 5. Rationale

Cerbos is the best tradeoff given our constraints for three reasons:

**1. Eliminates policy-query duplication.** The `planResources` API returns an AST of the conditions under which access is granted. The `@cerbos/orm-prisma` adapter translates that AST into a Prisma `WHERE` clause automatically. Without this, every policy change requires a matching code change to the DB query — a maintenance burden that compounds with every new role and condition. With Cerbos, the policy *is* the query predicate.

**2. Enables multi-source authorization without custom compiler work.** The 4-phase flow (Plan → Enrich → Pre-filter → Decide) handles the fundamental problem: DB conditions can be pushed into Prisma WHERE, but blockchain conditions cannot. When the Cerbos plan contains unmapped blockchain conditions, the ENRICH phase fetches on-chain data once (e.g., the investor's portfolio) and converts those conditions into a DB-queryable form (e.g., `fundNum IN [...]`), narrowing the pre-filter query rather than overfetching. The same on-chain data is reused in the DECIDE phase for `checkResources`, so there is no double-fetching. This avoids building a custom AST splitter (a compiler-level problem) while keeping DB and blockchain conditions coordinated.

**3. Derived roles are policy-native, not code-native.** Contextual role elevation (e.g., an investor who holds tokens becomes a `token_holder` with additional privileges) is expressed in YAML and tested in CI — not scattered across application code. This makes the authorization model readable, reviewable, and independently testable.

Cedar was rejected because it lacks `planResources` (the key mechanism for DB pre-filtering) and per-call pricing is unpredictable. Custom application-level auth was rejected because it guarantees policy drift and has no path to auditable, testable policy management.

The V1 simplifications (overfetch over AST splitting, TypeScript field maps over YAML registry, hardcoded hydrators over template DSL) keep implementation scope to ~1–2 weeks while preserving a clear upgrade path for each trade-off.

---

## 6. Risks & Mitigations

- ~~**Risk: Derived role `R.attr` conditions may not appear in `planResources` AST (Spike 1 — CRITICAL)**~~ **RESOLVED**

  **Finding:** `planResources` DOES include `R.attr` derived role conditions in the AST. Cerbos does not evaluate them eagerly — they appear as conditional expressions in the returned plan.

  **Actual behaviour:** The `@cerbos/orm-prisma` adapter passes unmapped conditions through as literal object keys containing the full CEL path string (e.g., `"request.resource.attr.holderBalance": { gt: 0 }`). These are not valid Prisma fields but do not cause an exception.

  **Architecture adopted (differs from original spec):** Rather than pure overfetch (fetch all DB candidates, then hydrate each with blockchain data), the implementation uses a smarter ENRICH phase (1.5): when `hasUnmappedConditions` is detected, fetch the investor's on-chain portfolio once, then convert the blockchain condition into a DB-queryable form (`fundNum IN [...heldFundNums]`) and OR it into the WHERE clause. One chain call, reused for both WHERE narrowing and Phase 3 `checkResources` attribute hydration. See `authQueryEngine.ts`.

- ~~**Risk: `@cerbos/orm-prisma` throws on unmapped fields instead of skipping (Spike 2)**~~ **RESOLVED**

  **Finding:** The adapter does NOT throw. Instead it passes unmapped CEL paths through as dotted string keys in the output filters object (e.g., `"request.resource.attr.holderBalance": { gt: 0 }`).

  **Solution implemented:** `planFundsQuery.ts` contains two utilities — `hasKeysWithDots()` detects the presence of unmapped conditions in the adapter output, and `stripUnmappedKeys()` recursively removes them before returning the cleaned Prisma `WHERE`. The `hasUnmappedConditions` boolean flag is returned alongside `where` so the engine knows whether to run the ENRICH phase. A catch fallback remains for adapter errors: overfetch (`where: {}`) with `hasUnmappedConditions: true`.

- **Risk: Cerbos PDP sidecar unavailability**

  If the Cerbos sidecar is down, authorization cannot proceed.

  **Mitigation:** Fail closed — return empty set / 403 on Cerbos errors, never fail open. ECS auto-restart with health checks. No cached fallback (stale decisions are a security risk). Alert on sidecar health degradation.

- **Risk: Pagination correctness under post-filtering**

  A page request for N funds may return fewer than N if many candidates are rejected in Phase 4 (post-filter on blockchain conditions).

  **Mitigation:** V1 uses 2× overfetch (fetch all authorized, then slice). Acceptable at <1,000 funds. Monitor fill rate in production; if overfetch ratio degrades, promote staged resolution (blockchain first, filter, then Haruko) from the future optimization path.

- **Risk: Policy testing gap**

  Authorization policy changes that don't touch application code have no automated safety net without an explicit CI step.

  **Mitigation:** Every Cerbos policy file (`cerbos/policies/*.yaml`) must have a corresponding YAML test file. Cerbos test runner executes in CI. PRs that modify policy files must include updated test assertions.

- **Risk: Audit trail across 4 phases is incomplete**

  Authorization decisions span Cerbos, Prisma, blockchain, and application code. Without correlation, incidents are hard to reconstruct.

  **Mitigation:** Request-scoped correlation ID propagated through all 4 phases. Structured log entry at each phase boundary. Cerbos decision log enabled. Log schema documented before Phase 3 hardening.

---

## 7. Impact

- **Teams:** Backend engineering (implements AuthQueryEngine, DataLoaders, directive, policy YAML). DevOps (deploys and monitors Cerbos ECS sidecar). Any team touching fund-related GraphQL resolvers.
- **Systems:** All GraphQL resolvers on security-relevant list fields (`visibleFunds`, nested lists). `buildContext` (refactored to lazy principal loading). Prisma fund queries. Blockchain multicall DataLoader. Haruko API client.
- **Users:** Investors (see only funds they hold tokens in, are whitelisted for, or are public). Managers (see all funds in their umbrella). Fund admins (unrestricted). Unauthorized users (empty results, not errors).

---

## 8. Success Criteria

- Spike 1 confirms `planResources` includes `R.attr` derived role conditions in the AST (or fallback is chosen and documented).
- Spike 2 confirms `@cerbos/orm-prisma` silently skips unmapped fields (or AST pre-processor is implemented).
- Cerbos sidecar round-trip: <5ms for `planResources`, <10ms for `checkResources` batch of 10 resources × 6 actions (measured on ECS Fargate).
- All four access patterns work correctly end-to-end: investor (token-gated + public + whitelisted), manager (umbrella-scoped), fund-admin (unrestricted), unauthenticated (empty/403).
- A Cerbos policy change (new derived role, modified condition) requires no application code change — only YAML + CI pipeline + deploy of updated policy to sidecar.
- Every policy file has a corresponding YAML test file that runs in CI.
- Field-level auth (`pricing`, `positions`, `investors`) correctly blocks access by role, verified by integration test.
- `buildContext` makes no DB or RPC calls at request start — all expensive operations are lazy.

---

## 9. Revisit Conditions

- **Org hierarchy exceeds 2 hops** (e.g., sub-funds of sub-funds, complex delegation chains) → evaluate SpiceDB as a relationship resolver feeding into Cerbos principal attributes.
- **Fund count exceeds ~1,000** and overfetch causes measurable latency regression → promote staged resolution pipeline (blockchain → filter → Haruko) from optimization path.
- **Policy change frequency increases to monthly** and non-developers need to author/test policies without engineering involvement → evaluate Cerbos Hub (managed control plane with policy testing UI).
- **Haruko API rate limits become a constraint** on the hydration phase → promote staged resolution to avoid hydrating candidates that blockchain would have eliminated.
- **Cedar releases a `planResources`-equivalent API** (query plan generation from policy) → re-evaluate Cedar for zero-ops advantage.
- **Cerbos sidecar availability SLA proves insufficient** despite ECS auto-restart → evaluate Cerbos Cloud or co-located Lambda extension deployment model.

---

## 10. References

- [Authorization System V1 — Implementation Spec](../Authorization_System_V1.md)
- [GraphQL Context Architecture](../graphql-context-architecture.md)
- [Authorization Review — Full Technology Evaluation](../Authorization_Review.md)
- [Cerbos PlanResources API](https://docs.cerbos.dev/cerbos/latest/api/index.html)
- [Cerbos Derived Roles](https://docs.cerbos.dev/cerbos/latest/policies/derived_roles.html)
- [@cerbos/orm-prisma V2.0 Release](https://www.cerbos.dev/blog/cerbos-prisma-integration-v2-0)
- [Cerbos Query Plan Adapters (GitHub)](https://github.com/cerbos/query-plan-adapters)
- [Zanzibar: Google's Consistent Global Authorization System](https://research.google/pubs/zanzibar-googles-consistent-global-authorization-system/)

---

### One-Sentence Summary

> We decided to use Cerbos PDP with a 4-phase AuthQueryEngine (Plan → Enrich → Pre-filter → Hydrate → Decide) because it eliminates policy-query duplication via `planResources`→Prisma AST translation and natively handles multi-source authorization, accepting overfetch risk and a new sidecar dependency to achieve a single auditable policy source of truth.
