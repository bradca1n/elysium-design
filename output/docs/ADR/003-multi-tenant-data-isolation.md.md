# ADR-003: 003-multi-tenant-data-isolation.md

> Date: 2026-02-23
> Status: Draft

---

## 1. Problem Statement

Elysium's fund hierarchy has a natural tenant boundary: a **management company** owns umbrella funds, which own funds, which have share classes. Not every platform entity is a management company, but when multiple management companies exist, their data must be isolated from one another — a manager at Company A must not be able to read, query, or accidentally mutate Company B's records.

This ADR explores three approaches to enforcing that isolation and documents the migration paths between them. A concrete choice is **deliberately deferred** until the second management company is onboarded and the operational requirements are clearer. The goal of this document is to ensure that whichever path is chosen, the team makes it with full awareness of the trade-offs and reversal costs.

---

## 2. Context & Constraints

**Hierarchy:**

```
Management Company
  └── UmbrellaFund  ← tenant boundary lives here
        └── Fund
              └── Share Class
```

Not every entity in the system is a management company. The distinction is:
- **Management company**: an organisational entity that owns and administers one or more umbrella funds on the platform. This is the tenant boundary.
- **Other entities** (investors, fund managers as individuals) are associated with funds but do not own the fund hierarchy.

**Placement of the tenant discriminator:**

`managementCompanyId` belongs on `UmbrellaFund` only — not on every table in the system. `Fund` and `ShareClass` are isolated transitively through foreign keys (`Fund.umbrellaFundId → UmbrellaFund.managementCompanyId`). Stamping it on every downstream table would create a denormalized redundancy with inconsistency risk and no query-time benefit that a single join cannot provide.

Entities that are **not** part of the fund hierarchy ownership chain do not receive the discriminator:
- **Investors / Users**: platform-level entities. An investor may hold positions across funds owned by different management companies. No stamp.
- **Orders / Transactions**: implicitly scoped to a tenant through their FK to `Fund`. No stamp.
- **Fund managers (as individuals)**: associated with UmbrellaFunds or Funds via join tables. Tenant-scoped through the relationship, not a direct column.

If a query on `Fund` or `ShareClass` in a hot path makes the one-level join measurably expensive, `managementCompanyId` can be selectively denormalized as a performance optimization at that time — enforced consistent with the `UmbrellaFund` FK via a DB constraint or trigger.

**Current state:**
- The Prisma schema is empty (no fund hierarchy tables exist yet). This is the lowest-cost moment to make this decision — or to defer it consciously, knowing the cost of retrofitting.
- The authorization layer (Cerbos, ADR-002) already scopes fund access via `assignedUmbrellaFundIds` on the principal. This is a form of logical isolation at the application layer, not at the database layer.
- ADR-001 established that platforms have independent entity types. The management company concept is specific to the manager platform.

**Constraints:**

- Prisma is the ORM. Any isolation mechanism must be compatible with Prisma's model of a single schema and a single connection string unless explicitly worked around.
- The application runs on AWS Lambda (serverless). Connection pooling is already constrained; any solution that multiplies connection strings or schemas adds operational overhead.
- There is currently one management company on the platform. A second is not imminent, but is expected.

**Security & Auditing Requirements:**

Elysium handles financial assets on behalf of investors. The data isolation decision directly determines the security posture of the system. Key requirements:

- **Defence in depth**: isolation must not rely solely on application-layer correctness. A single misplaced query or missing WHERE clause must not be sufficient to expose another tenant's data. At minimum, one layer of enforcement below the application (DB-level RLS or structural schema isolation) must exist before the second tenant is onboarded.
- **Audit trail**: every data access event must be attributable to a principal, a tenant, and a timestamp. Regulatory contexts (MiFID II, GDPR) require that the platform can answer "who accessed investor X's data and when" per tenant. The isolation mechanism must not fragment audit logs in a way that makes this query impractical.
- **Additive hardening**: the chosen approach must support tightening security requirements without a schema rewrite. Specifically, RLS policies and column-level encryption must be addable as layers on top of whatever mechanism is in place.
- **No silent cross-tenant bleed**: a bug in application code must not silently return another tenant's data. Whether this is enforced by structural separation (Option B) or DB-enforced RLS (Option A hardened) is a key selection criterion.

Neither option is inherently more secure from day one — Option A hardened with PostgreSQL RLS gives comparable protection to Option B at lower operational cost, provided the RLS policies are correctly authored and tested. Option B's structural isolation is stronger against application-layer bugs but does not eliminate the need for audit logging and access controls.

**Non-Goals:**

- Investor-level data isolation within a single management company — this is handled by the Cerbos authorization layer.
- Network-level isolation (separate VPCs, separate RDS instances per tenant) — this ADR covers logical/schema-level isolation only.
- Cross-tenant admin queries — admin-level cross-tenant visibility is out of scope for V1.

---

## 3. Options Considered

### Option A: `managementCompanyId` Discriminator Column (Row-Level Isolation)

Add a `managementCompanyId` foreign key to every table in the fund hierarchy (`UmbrellaFund`, `Fund`, `ShareClass`, and any associated join tables). Every query that touches these tables must include a `WHERE managementCompanyId = ?` predicate. This can be enforced at the application layer (Prisma query filters, Cerbos principal attributes) or at the database layer (PostgreSQL Row Level Security policies).

#### Pros

- Standard pattern, directly supported by Prisma — no framework workarounds required.
- Single schema means a single migration path. Applying a Prisma migration affects all tenants simultaneously, which is the correct behaviour during V1 development.
- Cross-tenant queries (for admin/reporting) are trivial — omit or modify the filter.
- Compatible with existing Cerbos architecture: `managementCompanyId` maps naturally onto a principal attribute and can be enforced as a Cerbos condition, making the isolation policy auditable.
- PostgreSQL RLS (optional hardening): if discrimination at the application layer is deemed insufficient, RLS policies can be added later as a belt-and-suspenders measure without changing the schema.

#### Cons

- Every query must carry the filter. A bug that omits the predicate silently returns cross-tenant data. This is the most common class of multi-tenant data leak in shared-schema systems.
- Does not provide cryptographic or structural isolation — a DB user with table access can read all rows. Compliance requirements that mandate "no shared table" are not satisfiable by this approach.
- Joins across the hierarchy must carry the discriminator at every level, or trust that FK relationships prevent cross-tenant traversal (they do, but it requires careful schema design to guarantee it).

---

### Option B: Schema-Per-Tenant (PostgreSQL Schema Isolation)

Create a separate PostgreSQL schema for each management company (e.g., `mgmt_acme`, `mgmt_vanguard`). All fund hierarchy tables exist within the tenant's schema. A shared `public` schema holds platform-level tables (`User`, `Investor`, etc.) that span tenants.

Prisma would need to be configured to set `search_path` per request (via a Prisma middleware or a connection-per-tenant model). Migrations must be applied to each schema independently.

#### Pros

- True structural isolation: a bug that omits a tenant filter cannot return another tenant's data, because the tables themselves are separate.
- Tenant onboarding/offboarding is clean: `CREATE SCHEMA mgmt_x` + run migrations; `DROP SCHEMA mgmt_x CASCADE` for removal.
- Satisfies "no shared table" compliance requirements if they arise.
- PostgreSQL schema-level permissions mean a schema owner DB user can be granted to a tenant's operational tools without touching other tenants.

#### Cons

- Prisma has no native schema-per-tenant support. The `search_path` must be set on every connection or transaction via a `$executeRaw` in Prisma middleware, or via separate `PrismaClient` instances per tenant. This is a non-trivial workaround.
- Schema migrations must be fanned out. Every deployment that modifies the fund hierarchy schema must apply the migration to N tenant schemas. At V1 (one tenant) this is trivial; at 10+ tenants it requires a migration runner to fan out and handle partial failures.
- Connection pooling (PgBouncer, RDS Proxy) operates on `(user, database)` not `(user, schema)`. `search_path` changes within a pooled connection require `pool_mode = session` rather than `transaction` mode, which reduces pool efficiency.
- Prisma introspection and type generation is schema-specific — managing multiple tenant schemas in a single codebase requires careful tooling.
- **Cross-tenant investor queries are structurally broken.** An investor may hold positions in funds across multiple management companies. Their identity lives in `public`, but their positions live in each tenant's schema. Fetching a full investor portfolio requires querying N schemas — either via application fan-out (loop over all management companies, query in parallel, merge), or via dynamic `UNION ALL` SQL with `$queryRaw`. Neither approach is Prisma-native. Cross-schema JOINs in PostgreSQL are possible but require hardcoding or dynamically enumerating schema names at query time.
- **Admin "god view" requires cross-schema aggregation.** Any query that must span all management companies — aggregate reporting, compliance dashboards, platform-wide investor lookups — faces the same N-schema fan-out problem. Pagination across a `UNION ALL` of N schemas cannot be done with a single SQL query; either all rows must be fetched and sliced in application code, or a separate aggregate layer (ETL, materialized views, read replica) must be maintained. Every new tenant onboarded adds to the fan-out surface. Cross-schema views in `public` are one mitigation, but they must be recreated on every tenant onboard/offboard and are not managed by Prisma.
- **Audit queries are fragmented.** A compliance audit requiring "show me all activity touching investor X's data" must query every tenant schema independently. There is no single SQL query that answers this without an aggregate layer.

---

### Option C: Naive (No Formal Isolation)

Build the fund hierarchy tables without a tenant discriminator. Rely on application-level code to ensure that queries return the correct data. No enforcement mechanism exists at the database layer.

#### Pros

- No design work required now. Maximum simplicity during early development.
- Works correctly as long as there is exactly one management company.

#### Cons

- There is no structural signal in the data about which records belong to which tenant. When a second management company is onboarded, retrofitting isolation requires:
  1. Adding a `managementCompanyId` column to every affected table.
  2. Back-filling existing records with the correct value — which is only possible if the ownership of every row is deterministically recoverable from other data in the schema.
  3. Updating every query to carry the filter.
  If any of these steps fail or are incomplete, a data leak exists and may not be immediately visible.
- The longer this approach is in production with real data, the harder it is to retrofit. With a single tenant and limited data it is recoverable; with years of data and multiple code paths it may not be.
- Strongly discouraged for financial data. The cost of a cross-tenant data leak in a regulated context far exceeds the cost of adding a discriminator column.

---

## 4. Migration Paths

This section documents how reversible each choice is, and what migration from one approach to another costs.

### Naive → Discriminator Column (Option C → A)

**Feasibility:** Achievable if ownership of existing records is deterministically recoverable.

**Steps:**
1. Add `managementCompanyId` (nullable) to all fund hierarchy tables.
2. Backfill from known tenant ownership (this is straightforward if there has only ever been one tenant — every row gets that tenant's ID).
3. Make the column non-nullable; add the FK constraint.
4. Add the WHERE filter to all queries touching these tables.
5. Optionally add Cerbos policy conditions enforcing the filter.

**Cost:** Low if done while there is one tenant and limited data. Increases rapidly once multiple tenants or large datasets exist.

---

### Naive → Schema-Per-Tenant (Option C → B)

**Feasibility:** Harder than C → A. Requires all the work of C → A plus full schema restructuring.

**Steps:**
1. Determine tenant ownership of every existing row (same as C → A step 2).
2. Create per-tenant schemas and run migrations to create the tables within them.
3. Copy/move rows from the shared tables into the correct tenant schema.
4. Remove the shared tables (or repurpose them as the `public` layer).
5. Update all Prisma queries to include schema routing middleware.
6. Update migration tooling to fan out to all tenant schemas.

**Cost:** High. This is a full data migration plus a Prisma architecture change. Not recommended as a first step — go via A first.

---

### Discriminator Column → Schema-Per-Tenant (Option A → B)

**Feasibility:** Achievable. This is the natural upgrade path if Option A proves insufficient.

**Steps:**
1. For each management company, create a schema (`mgmt_<id>`) and run the migration to create the fund hierarchy tables within it.
2. Copy rows for each tenant from the shared tables into their schema, keyed by `managementCompanyId`.
3. Drop `managementCompanyId` columns from the per-tenant tables (no longer needed; the schema boundary enforces isolation).
4. Update Prisma client to route by tenant schema (middleware that sets `search_path`).
5. Update migration tooling.
6. Validate and cut over; drop the now-empty shared tables.

**Cost:** Medium. Data migration is mechanical and reversible (discriminator column is still present until cutover). The Prisma middleware layer is the main implementation risk.

---

### Summary: Reversal Cost Matrix

| From → To | Cost | Notes |
|-----------|------|-------|
| Naive → Discriminator | Low–Medium | Only safe while data volume is small and ownership is recoverable. |
| Naive → Schema-per-tenant | High | Not recommended directly; use Naive → Discriminator → Schema-per-tenant. |
| Discriminator → Schema-per-tenant | Medium | Mechanical migration; Prisma routing layer is main risk. |
| Schema-per-tenant → Discriminator | Medium | Merge schemas back into shared tables; adds discriminator column. |
| Discriminator → Naive | Not recommended | Removing isolation from a live financial system is not a valid operation. |

---

## 5. Decision

> **Deferred.** No formal tenant isolation mechanism is adopted until the second management company is onboarded.
>
> In the interim, the fund hierarchy schema **must be designed with Option A in mind** — specifically, `managementCompanyId` must be a planned field on all fund hierarchy models, even if it is initially populated with a single value. This keeps the C → A migration cost near-zero when the trigger condition is met.
>
> The intent is to implement **Option A (discriminator column)** as the default unless a specific compliance or structural isolation requirement makes Option B necessary at onboarding time.

---

## 6. Rationale

Option C (naive) is excluded from serious consideration for a financial application. The cost of a cross-tenant data leak exceeds the cost of any structural mitigation, and the naive approach has no structural mitigation.

Option A is the default recommendation because it is directly compatible with the existing stack (Prisma, Cerbos, Lambda), requires no framework workarounds, and is the most reversible starting point. The Cerbos authorization architecture (ADR-002) already propagates `assignedUmbrellaFundIds` as a principal attribute — `managementCompanyId` fits naturally into the same pattern and can be enforced at the policy layer without additional infrastructure.

Critically, Option A also handles the cross-tenant query patterns that Option B cannot: an investor's full portfolio across multiple management companies, admin aggregate views, and platform-wide compliance queries all work as standard Prisma queries. Option B structurally cannot serve these use cases without an application fan-out layer or a separate aggregate replica — both of which add operational complexity and introduce a secondary source of truth.

On security: Option A is not inherently weaker than Option B. PostgreSQL Row Level Security can be applied to Option A to enforce tenant isolation at the database engine level — below the application and below the ORM. A correctly authored RLS policy means a raw database connection cannot return cross-tenant rows, regardless of query construction. This gives comparable protection to Option B's structural isolation, without fragmenting audit logs or breaking cross-tenant queries. RLS should be added as the second step after the discriminator column, before the second tenant is onboarded.

Option B is not ruled out. It becomes the right choice if:
- A compliance framework mandates structural table-level isolation (i.e., "no shared table") between management companies.
- A management company requires their data to be in a schema they own, with guaranteed co-location with no other tenant — a contractual requirement that RLS cannot satisfy because the rows still physically coexist in the same tables.
- The number of management companies is small (under ~10), bounded, and none of them require cross-tenant investor portfolio views or admin aggregates — making the fan-out cost manageable.

None of these conditions currently apply. Option B should be reconsidered at onboarding of the second management company, when the actual isolation requirements will be contractually defined.

The deferred stance is consistent with ADR-001's approach: avoid building correlation machinery before the problem is real, but design data structures that make the upgrade cheap.

---

## 7. Risks & Mitigations

- **Risk:** `UmbrellaFund` is built without `managementCompanyId`, making the C → A migration harder when the second tenant arrives.

  **Mitigation:** Include `managementCompanyId` as a planned (nullable) FK column on `UmbrellaFund` from the start. Make it non-nullable when the second management company is onboarded. Do not add it to `Fund`, `ShareClass`, or downstream tables — isolation propagates through FK relationships.

- **Risk:** The decision is deferred past the point where a second tenant's data has been created, at which point backfilling is more complex.

  **Mitigation:** The revisit trigger below is a hard gate — this ADR must be resolved before the second management company's data is written to production.

- **Risk:** Application-layer discrimination (Option A without RLS) is silently bypassed by a query bug, causing a cross-tenant data leak.

  **Mitigation:** PostgreSQL Row Level Security must be added as a hardening layer before the second management company is onboarded. RLS enforces the tenant filter at the DB engine level — it cannot be bypassed by a missing WHERE clause or a raw SQL query. Authoring and testing RLS policies in staging before production go-live is required. RLS does not require a schema change and can be added without downtime.

- **Risk:** Audit logs are insufficient to reconstruct a cross-tenant access incident.

  **Mitigation:** Enable `pgaudit` on RDS PostgreSQL to log all DML operations with principal attribution. Structure application-layer logs to include `managementCompanyId`, `userId`, and a request correlation ID on every fund-hierarchy query. Compliance queries ("show all accesses to management company X's data in a date range") must be answerable from logs without requiring cross-schema fan-out.

- **Risk:** Option B's schema-fan-out migrations cause a partial failure during a deployment, leaving tenants on different schema versions.

  **Mitigation:** If Option B is adopted, the migration runner must be idempotent and must verify all schemas are at the target version before marking a deployment complete. Partial failures must roll back the entire deployment.

---

## 8. Impact

- **Teams:** Backend engineering (schema design for fund hierarchy tables). Any engineer adding a new fund hierarchy model must include `managementCompanyId` in the planned design.
- **Systems:** Prisma schema, fund hierarchy resolvers, Cerbos policies for fund access.
- **Users:** No user-visible impact at V1 (single tenant). Isolation becomes visible to management company users when multi-tenancy is live.

---

## 9. Success Criteria

- `UmbrellaFund` includes `managementCompanyId` as a designed field before the first production data is written, even if it is initially populated with a single value. `Fund`, `ShareClass`, and downstream transactional tables are scoped implicitly via FK — they do not receive the discriminator column.
- At second management company onboarding, Option A or Option B is chosen, implemented, and verified before any data is written for the new tenant.
- No cross-tenant fund data is readable by a manager authenticated to a different management company (verified by integration test).

---

## 10. Revisit Conditions

- **A second management company is being onboarded** — this is a hard trigger. The decision must be made and implemented before their data is written.
- **A management company states a contractual or regulatory requirement for structural data isolation** — evaluate Option B at that point.
- **A cross-tenant data leak occurs in testing** — escalate to Option B regardless of timeline.
- **Schema migration fan-out becomes a development bottleneck** — reassess Option B's operational cost versus its isolation guarantees.

---

## 11. References

- [ADR-001: Authentication Architecture](001-authentication-architecture.md) — established independent entity types per platform; the deferred soft-link pattern is precedent for this approach.
- [ADR-002: Authorization Architecture](002-authorization-architecture.md) — Cerbos principal includes `assignedUmbrellaFundIds`; `managementCompanyId` would extend this pattern.
- [PostgreSQL Row Level Security](https://www.postgresql.org/docs/current/ddl-rowsecurity.html)
- [Prisma multi-schema support](https://www.prisma.io/docs/orm/prisma-schema/data-model/multi-schema)

---

### One-Sentence Summary

> We deferred the choice between discriminator-column and schema-per-tenant isolation, accepting a single-tenant naive state in the interim on the condition that `managementCompanyId` is designed into all fund hierarchy tables from the start, making the Option A implementation near-zero-cost when the second management company is onboarded.
