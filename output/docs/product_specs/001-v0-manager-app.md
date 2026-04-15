# Manager App — Product Requirements

**Last Updated:** 2026-02-23
**Status:** draft
**Tags:** manager, fund-admin, next.js, requirements

---

> **Scope:** A Next.js web application for fund managers and fund administrators to manage funds, investors, orders, NAV, and reporting — the operational counterpart to the investor-facing app.

---

## 1. Scope Definition

### What This Is

The manager app allows fund managers to complete their POD workflow and view important fund related data, including aggregate data. Managers can create and manage funds and share classes, as well as invite users to join their fund. Managers can view their NAV, AUM, Liquidity, Dealings, Orders, and Actions.

### What This Is NOT

- The investor-facing app (`apps/next/`) — investors use a separate surface
- A smart-contract admin tool — on-chain configuration is handled separately
- An internal Elysium platform admin tool — admin role has its own surface (TBD)

---

## 2. User Roles

The following roles may access the manager app. Define the access boundary for each.

| Role | Description | Access Boundary |
|------|-------------|-----------------|
| `manager` | Fund manager assigned to one or more funds within an umbrella | Sees only their assigned funds within their umbrella(s). Cannot see other managers' funds or cross-umbrella funds. Can create funds, configure share classes and dealings, and invite investors. |
| `fund-admin` | Owns a management company (a grouping of one or more umbrella funds — see ADR-003). | Full visibility across all umbrella funds within their management company. Can create and manage any fund within their company. |
| `admin` | Platform-level Elysium staff | Out of scope. Platform-level Elysium staff use a separate admin surface (not yet defined). |

**Notes:**
- Authorization is enforced via Cerbos policies (see §6). Role boundaries defined here feed directly into policy YAML.
- A user may hold multiple roles (e.g., a `fund-admin` who is also a `manager` for one fund).
- In V1, `manager` and `fund-admin` share a single login experience — no UI differentiation between roles. Cerbos policy boundaries may be tightened in future iterations.
- The `admin` role is **out of scope** for this app. Platform admin uses a separate surface (TBD).
- The management company is the tenant boundary (see ADR-003). All fund hierarchy data is scoped to a `managementCompanyId`.

---

## 3. Feature Domains

Each domain section follows the same structure:
- **Priority** — MVP / P1 / P2 / TBD
- **Purpose** — what this domain enables
- **Users** — which roles interact with it
- **User Stories** — fill in with concrete stories
- **Screens / Views** — list the screens/pages in this domain
- **Data Needed** — GraphQL queries/mutations or new API operations required
- **Open Questions** — unresolved decisions for this domain

---

### 3.1 Dashboard / Home

**Priority: MVP**

#### Purpose

A manager logs in to an overview of all funds they manage or administer: current AUM, latest NAV date, dealing status, and any items requiring attention. The dashboard is the primary operational entry point — it surfaces pending orders awaiting a dealing window, overdue NAV submissions, and recent activity across their funds.

#### Users

- `manager` — sees dashboard scoped to their assigned funds
- `fund-admin` — sees dashboard scoped to their management company's umbrella(s)

#### User Stories

- [ ] As a manager, I can see a summary of all my funds (AUM, NAV date, status) on login
- [ ] As a manager, I can see any pending actions that require my attention (e.g., orders awaiting processing, NAV due)
- [ ] As a manager, I can invite a user to join my fund, so that the user can sign up as an investor and see my fund in their list of available funds.
- [ ] As a manager, I can create a fund and share classes within a fund, so that investors can invest in my fund.

#### Screens / Views

| Screen | Description | Widgets |
|--------|-------------|---------|
| `/dashboard` | |`Total AUM` `Pending Orders` `Needs Action` `Funds List` `Recent Activity` `Pending Orders` `Invite Investor` `New Fund`  |
| `/fund/:fundId`| | `Fund Performance Chart` `Fund Status` `Performance Overview` `Active Orders` `Share Classes` `Assets Overview` `Activity Overview` `Fund Details  - Description` `Fund Details  - Summary`   |
| `/fund/:fundId/share-class/:shareClassId`| | `Share Class Performance Chart` `Share Class Status` `Share Class Fees` `Active Orders` `Dealing Status` `Share Class Performance Overview` `Share Class Activity` `Share Class Configuration` `Share Class Investors List` `Share Class Fees List` `Share Class Adjustments List` `Share Class Audit Trail`   |
| `/fund/:fundId/nav`| | `Fund NAV Price` `Fund NAV Breakdown` `Fund NAV Stats - YTD Return, Sharpe Ratio, Sortino Ratio, Max Drawdown, Volatility, Beta` `Position Summary Table`  |
| `/fund/:fundId/liquidity`| | `Fund NAV Price` `Fund Cash Position` `Fund Next Dealing Projections`  |
| `/fund/:fundId/dealings`| | `Fund Current Dealing Cycle` `Fund Dealing Orders` `Fund Dealing Schedule`  |
| `/fund/:fundId/orders`| | `Fund Pending Orders` `Fund Past Orders`  |
| `/fund/:fundId/investors`| | `Investor table` `Invite investor`   |
| `/fund/:fundId/fees`| | `Fund Collect pending fees` `Fund Fees Total` `Fund Cumulative Fees Collected` `Fund Fee Collection History Table`  |
| `/fund/:fundId/actions`| | `Fund Actions Table`  |
| `/new-fund`| `Set up a new fund` | `Fund Actions Table`  |

#### Data Needed

- `ManagerViewCallsFacet` — fund summaries, class performance metrics (on-chain)
- [FILL: additional GraphQL operations or REST endpoints]

#### Open Questions

None.

---

### 3.2 Fund & Class Management

**Priority: MVP**

#### Purpose

Creating and configuring funds and share classes. Both managers and fund-admins can create funds in V1. Once a fund exists, users configure share classes — fee structure, dealing schedule, notice period, lock period, and eligibility rules — and view fund-level parameters.

#### Users

- `manager` — creates and configures funds they manage
- `fund-admin` — can create and edit any fund within their management company's umbrella(s)

#### User Stories

- [ ] As a fund-admin, I can create a new fund within my umbrella
- [ ] As a fund-admin, I can create a new share class on an existing fund
- [ ] As a manager, I can create a new fund
- [ ] As a manager, I can view the configuration of my fund(s) (max capacity, dealing schedule, reporting currency)
- [ ] As a manager, I can update fund-level parameters (max capacity, dealing schedule, redemption suspension, fund status)
- [ ] As a manager, I can view and manage share class parameters (notice period, lock period, fee rates, eligibility rules)
- [ ] [FILL: additional stories]

#### Screens / Views

| Screen | Description |
|--------|-------------|
| `/funds` | Fund list — all funds in scope for the logged-in role |
| `/funds/[fundId]` | Fund detail — config, classes, current NAV, status |
| `/funds/[fundId]/classes/[classId]` | Class detail — fee structure, eligibility, dealing history |
| `/funds/[fundId]/classes/new` | Create share class form — in scope for MVP |
| `/funds/new` | Create fund form — in scope for MVP |
| [FILL] | [FILL] |

#### Data Needed

- `FundManagementFacet` — fund/class/dealing creation and config (on-chain writes)
- `ManagerViewCallsFacet` — fund summaries, class metrics (on-chain reads)
- GraphQL: `Fund`, `InvestableFund`, `InvestableClass` types (already in schema)
- [FILL: any new GraphQL operations needed?]

#### Open Questions

- Both managers and fund-admins can create funds in V1.
- Write operations (create fund, create class) are in scope for MVP.
- Dealing schedule is configured via this UI, triggering on-chain `FundManagementFacet` calls. Parameters: frequency, cut-off time, valuation point, settlement period.

---

### 3.2.1 Fund Creation Wizard

**Priority: MVP**

#### Purpose

Fund creation is a multi-step wizard at `/funds/new`. Each step captures a logical group of configuration; incomplete wizards can be saved as drafts. Steps marked **MVP** must be completed before a fund can be activated. Steps marked **P1** are required before first investor subscription. Steps marked **P2** are optional enrichment.

---

#### Step 1 — Fund Structure

**Priority: MVP**

Establishes where this fund sits in the hierarchy and who manages it.

| Field | Description | Notes |
|-------|-------------|-------|
| Umbrella | Create a new umbrella fund OR select an existing one owned by this management company | Manager defines their own umbrella name (e.g. "Alpha Capital Umbrella Fund") |
| Fund name | Legal name of the fund / segregated portfolio | |
| Fund type | Open-ended / Closed-ended | Determines dealing and redemption rules |
| Multi-manager | Can multiple managers be assigned to this fund? | Optional in V1; defaults to single manager |
| Assigned managers | List of manager accounts with access to this fund | |

**Open questions:**
- [FILL: Is umbrella creation a one-time onboarding step, or can a fund-admin create multiple umbrellas over time?]
- [FILL: What is the legal relationship between the umbrella and Elysium's Cayman SPC structure? Is the umbrella the SPC with each fund as a segregated portfolio, or is the SPC the management company entity and the umbrella a separate naming construct?]

---

#### Step 2 — Jurisdiction & Classification

**Priority: MVP**

Regulatory and investor classification settings that gate eligibility checks and reporting obligations.

| Field | Description | Notes |
|-------|-------------|-------|
| Fund domicile | Cayman Islands / Ireland / Luxembourg / Other | Determines regulatory regime |
| Regulatory regime | CIMA Section 4(3) / CBI UCITS / CBI AIF / Other | Auto-suggested based on domicile |
| Permitted investor types | Retail / Professional / Accredited / Qualified Purchaser | Multi-select; drives `EligibilityFacet` rules |
| Permitted jurisdictions | Allow-list of investor jurisdictions (ISO 3166) | Drives `EligibilityFacet` jurisdiction check |
| Excluded jurisdictions | Block-list (e.g. OFAC-sanctioned countries) | |
| FATCA/CRS classification | PFFI / Registered Deemed-Compliant FFI / Exempt / Other | Required for tax reporting (Phase 3) |
| GIIN | Global Intermediary Identification Number | If FATCA-registered |

**Open questions:**
- [FILL: Is domicile always Cayman in V1, or are other jurisdictions supported at launch?]

---

#### Step 3 — Fund Details & Investment Strategy

**Priority: MVP**

Human-readable description of the fund's mandate, used in the investor-facing app (if discoverable) and in regulatory documents.

| Field | Description | Notes |
|-------|-------------|-------|
| Fund description | Short summary of the fund (1–3 sentences) | Shown to investors in discovery |
| Investment mandate | Full investment objective and strategy | |
| Instrument universe | Permitted asset types: CEX spot, perpetual futures, dated futures, options, stablecoins, DeFi (staking, lending, LP), other | Multi-select; drives Haruko/pricing integration and mandate monitoring |
| Benchmark | Optional benchmark index or strategy | Used for performance reporting |
| Target return | Optional (e.g. "CTA benchmark + 5%") | Marketing only; not enforced on-chain |
| Fund logo / branding | Image upload | Used in investor-facing discovery |

---

#### Step 4 — Custodians & Trade Services

**Priority: P1**

Operational counterparties. Required before first subscription to satisfy fund admin and compliance obligations.

| Field | Description | Notes |
|-------|-------------|-------|
| Prime broker(s) | Exchange / prime brokerage relationships (e.g. Binance, OKX, Deribit) | Multi-entry; drives reconciliation config |
| Custodian | On-chain custodian or exchange custody arrangement | |
| Fund administrator | Third-party administrator (if any) or Elysium-administered | |
| Auditor | Audit firm | Required for Phase 2 financial statements |
| Legal counsel | Fund counsel | |

**Open questions:**
- [FILL: Is Haruko the fund admin / trade service provider, or a separate PMS integration?]
- [FILL: Are custodian relationships stored here for display/reconciliation only, or do they drive on-chain config?]

---

#### Step 5 — Investment Policy

**Priority: P1**

Risk and exposure constraints. Defines the mandate boundary; breaches surface as alerts in the dashboard.

| Field | Description | Notes |
|-------|-------------|-------|
| Max gross leverage | e.g. 3× NAV | Soft or hard limit |
| Max net exposure | e.g. 150% long / 50% short | |
| Max single-asset concentration | % of NAV | |
| Max counterparty exposure | % of NAV per exchange/prime broker | |
| Max drawdown limit | Threshold triggering manager alert | Soft alert only in V1 |
| VaR limit | Optional | |
| Prohibited instruments | Asset types or specific tokens that may not be held | |

**Notes:**
- **Mandate monitoring** is the process of checking that the fund's live portfolio stays within the limits configured here. For example: if max leverage is 3×, the system checks actual open positions and alerts (or blocks) if the limit is breached. The source of position data for this check is Haruko (live CEX positions), not the on-chain NAV snapshot.

**Open questions:**
- [FILL: Are investment policy limits enforced as hard blocks (pre-trade) or soft dashboard alerts (post-trade) in V1?]
- [FILL: Does mandate monitoring run in the manager app UI, or is it a background service that posts alerts to the dashboard?]

---

#### Step 6 — Fund Characteristics

**Priority: MVP**

Core operational parameters that define how the fund runs.

| Field | Description | Notes |
|-------|-------------|-------|
| Base currency | USD / EUR / GBP / Other | Reporting and NAV currency |
| NAV calculation frequency | Daily / Weekly / Monthly | Determines dealing cycle length |
| Dealing day | Day of week / month (e.g. every Friday, last business day of month) | |
| Cut-off time | Deadline for order submission (e.g. 17:00 UTC) | |
| Valuation point | When NAV is struck (e.g. 00:00 UTC following cut-off) | |
| Settlement period | T+1 / T+2 / T+3 / Custom | |
| Liquidity structure | Open-ended (rolling dealing) / Gated / Semi-liquid | |
| Redemption gate | % of NAV redeemable per dealing day (e.g. 15%) | Optional; `FEATURES.md` P2 gap |
| Max AUM cap | Hard cap on total fund AUM (0 = no cap) | Drives `subscriptionQueueMode` |
| Minimum subscription (fund-level) | Min investment per subscriber | |
| Minimum redemption | Min redemption amount per transaction | |

---

#### Step 7 — Share Classes

**Priority: MVP**

At least one share class must be created to activate the fund. Additional classes can be added later via `/funds/[fundId]/classes/new`.

Each share class requires:

| Field | Description | Notes |
|-------|-------------|-------|
| Class name | e.g. Class A, Class F, Class B | |
| Class currency | USD / EUR / GBP / Other | May differ from fund base currency |
| Management fee rate | Annual % (e.g. 2.0%) | Accrued daily: `(rate / 365) × NAV` |
| Performance fee rate | % of returns above hurdle (e.g. 20%) | |
| Hurdle type | Hard hurdle / Soft hurdle / None | |
| Hurdle rate | % annual (e.g. 0%, 6%, SOFR+2%) | |
| High water mark | Enabled / Disabled | Series-based HWM (per `FEES_AND_EQUALIZATION.md`) |
| Crystallization frequency | Monthly / Quarterly / Annual | |
| Lock-up period | Months before first redemption (e.g. 0, 6, 12, 24) | |
| Redemption notice period | Days advance notice required (e.g. 0, 30, 60, 90) | |
| Minimum investment | Per-class minimum (e.g. USD 100,000) | |
| Target investor type | Professional / Accredited / Qualified / All permitted | Drives eligibility filter for this class |

---

#### Step 8 — Discoverability

**Priority: MVP**

Controls whether and how this fund appears to investors in the investor-facing app.

| Field | Description | Notes |
|-------|-------------|-------|
| Visibility | Public (any eligible investor can discover) / Invite-only (invite link required) / Private (not listed) | |
| Fund listing | Show in investor app discovery feed? | Only relevant if Visibility = Public |
| Invite-only whitelist | Pre-approved investor list for invite flow | Optional; manager can add emails |
| Fund documents | Upload offering memorandum, KID, factsheet | Visible to investors after eligibility check |

**Notes:**
- Elysium ops must review and approve a fund before it becomes visible to investors. This is a manual compliance review process taking several weeks. The fund remains in `PENDING_APPROVAL` state until approved.

**Open questions:**
- [FILL: For public funds, does discoverability require a prospectus / OM to be uploaded first?]

---

#### Wizard Summary

| Step | Priority | On-chain | Off-chain (Prisma) |
|------|----------|----------|--------------------|
| 1 — Fund Structure | MVP | `FundManagementFacet` (fund/umbrella creation) | Management company, umbrella, manager assignments |
| 2 — Jurisdiction & Classification | MVP | `EligibilityFacet` (permitted types/jurisdictions) | Domicile, regime, FATCA/CRS classification |
| 3 — Details & Investment Strategy | MVP | — | Description, mandate, instrument universe, branding |
| 4 — Custodians & Trade Services | P1 | — | Prime brokers, custodian, admin, auditor |
| 5 — Investment Policy | P1 | — | Risk limits, leverage, concentration limits |
| 6 — Fund Characteristics | MVP | `FundManagementFacet` (dealing schedule, caps) | Base currency, liquidity structure |
| 7 — Share Classes | MVP | `FundManagementFacet` (class creation), `FeeManagementFacet` (fee config) | Class names, currencies |
| 8 — Discoverability | MVP | — | Visibility setting, documents, whitelist |

---

### 3.3 NAV Management

**Priority: P1**

#### Purpose

Enables managers to post NAV to trigger dealing windows. Supports two paths: (1) automated Haruko PMS feed (MVP), where NAV values flow in from Haruko and are confirmed in this UI; (2) manual entry, where a manager enters a NAV value directly as an override or fallback. Either path invokes `NavManagementFacet` on-chain and advances the dealing state machine. No two-person sign-off in V1 (single user type, no checker role yet). NAV correction is out of scope until smart contract support exists (see `FEATURES.md` P0 gap: no `correctNav()`).

#### Users

- `manager` — posts NAV for their fund(s)
- `fund-admin` — same NAV posting access as manager in V1; no separate approval role

#### User Stories

- [ ] As a manager, I can post a new NAV for a fund class via Haruko feed confirmation or manual entry
- [ ] As a manager, I can view the NAV history for a fund class
- [ ] As a manager, I can see which dealing windows are open or upcoming
- [ ] [FILL: additional stories]

#### Screens / Views

| Screen | Description |
|--------|-------------|
| `/funds/[fundId]/nav` | NAV history and current NAV per class |
| `/funds/[fundId]/nav/post` | NAV posting form — manual entry or Haruko feed confirmation |
| [FILL] | [FILL] |

#### Data Needed

- `NavManagementFacet` — NAV updates, price history, dealing state machine (on-chain writes)
- Haruko PMS NAV feed — NAV values sourced from Haruko for the primary automated flow; manual entry available as override

#### Open Questions

- NAV posting is in scope for P1. Both Haruko feed and manual entry are supported from MVP.
- NAV correction (`correctNav()` / `restateNav()`) is out of scope — P0 smart contract gap per `FEATURES.md`.

---

### 3.4 Order Processing

**Priority: P1**

#### Purpose

Provides read-only visibility into subscription and redemption order queues. Order processing is automated (to be built separately, likely via Fargate — see existing infra docs). Managers monitor pending orders, review order details, and view dealing window status and processed history. No manual `processOrders()` trigger in V1.

#### Users

- `manager` — monitors order status for their fund(s)
- `fund-admin` — same read-only access as manager in V1

#### User Stories

- [ ] As a manager, I can view all pending orders (subscriptions and redemptions) for my fund(s)
- [ ] As a manager, I can view order details (investor, amount, class, submission time)
- [ ] As a manager, I can view conditional orders and their trigger status
- [ ] As a manager, I can view processed order history
- [ ] [FILL: additional stories]

#### Screens / Views

| Screen | Description |
|--------|-------------|
| `/funds/[fundId]/orders` | Order queue — pending and recently processed orders |
| `/funds/[fundId]/orders/[orderId]` | Order detail |
| [FILL] | [FILL] |

#### Data Needed

- `OrderManagementFacet` — order processing (on-chain writes)
- `ViewCallsFacet` — paginated orders, portfolio events (on-chain reads)
- Investor name and KYC status from Prisma `User` table joined at API layer

#### Open Questions

- Order processing is automated/scheduled (Fargate, to be built separately). No UI trigger in V1.
- Individual order cancellation is not currently supported on-chain.
- Order reversal/adjustment is a P1 gap per `FEATURES.md`.

---

### 3.5 Investor Registry & Eligibility

**Priority: MVP**

#### Purpose

Provides visibility into the investors in a manager's fund(s). Investor onboarding is invite-based — manager sends an invite link; the investor completes onboarding (KYC, accreditation, document submission) in the investor-facing app. Manager does not perform KYC in this app. Manager can view KYC status, investor holdings per class, and order history, and can update fund-level eligibility flags (whitelist/blacklist).

#### Users

- `manager` — views investors in their fund(s); can update fund-level eligibility flags
- `fund-admin` — can configure eligibility rules (allowed investor types, jurisdictions, whitelist/blacklist) for funds in their umbrella

#### User Stories

- [ ] As a manager, I can view a list of all investors in my fund(s)
- [ ] As a manager, I can view an investor's profile: KYC status, accreditation, jurisdiction, investor type
- [ ] As a manager, I can view an investor's current holdings per fund class
- [ ] As a manager, I can view an investor's order and transaction history
- [ ] As a manager, I can update an investor's fund-level eligibility flags (whitelist/blacklist) — MVP; full KYC edit is out of scope
- [ ] As a fund-admin, I can configure eligibility rules for a fund class (allowed investor types, jurisdictions)
- [ ] As a manager, I can send an invite link to a prospective investor; they complete onboarding in the investor app
- [ ] [FILL: additional stories]

#### Screens / Views

| Screen | Description |
|--------|-------------|
| `/investors` | Investor registry — all investors in scope for this role |
| `/investors/[investorId]` | Investor profile — KYC, holdings, history |
| `/investors/[investorId]/eligibility` | Eligibility detail / edit screen |
| `/funds/[fundId]/investors` | Fund-scoped investor list |
| [FILL] | [FILL] |

#### Data Needed

- `EligibilityFacet` — KYC, accreditation, jurisdiction, investor type (on-chain)
- `AccountFacet` — account management (on-chain)
- `ViewCallsFacet` — holdings, orders per investor (on-chain)
- Prisma `User`, `PlatformAccess` — off-chain investor identity and profile data
- Investor PII (name, email) is stored in Prisma `User` off-chain and joined at the API layer

#### Open Questions

- Investor onboarding: invite-link model. Manager sends invite; investor completes in investor app.
- KYC/accreditation expiry: post-MVP (smart contract P1 gap per `FEATURES.md`).
- FATCA/CRS data fields: post-MVP (Phase 3 per MVP requirements).
- Manager updates fund-level eligibility flags; full eligibility rule configuration is fund-admin territory.

---

### 3.6 Fee & Performance Reporting

**Priority: P2**

#### Purpose

Gives managers visibility into fee accrual, performance fee state, and collection history. Managers view management fee accrual per class, performance fee state (HWM, accrued amount, series HWM tracking), and fee collection history. All fee viewing is MVP-eligible; fee configuration (rates, hurdle, HWM) is a governance action and not self-service in V1.

#### Users

- `manager` — views fee accrual and performance metrics for their fund(s)
- `fund-admin` — same view access as manager in V1; fee configuration changes are a governance action, not self-service

#### User Stories

- [ ] As a manager, I can view the current management fee accrual for each class
- [ ] As a manager, I can view the performance fee state (HWM, accrued performance fee) per class
- [ ] As a manager, I can view the fee history (minted fees per dealing)
- [ ] As a manager, I can view risk metrics (Sharpe ratio, Sortino ratio) for my fund(s)
- [ ] As a manager, I can trigger fee minting (crystallization) for a class — P1 candidate; TBD whether automated
- [ ] [FILL: additional stories]

#### Screens / Views

| Screen | Description |
|--------|-------------|
| `/funds/[fundId]/fees` | Fee summary — accrual, HWM, performance fee state per class |
| `/funds/[fundId]/fees/history` | Fee minting history |
| [FILL] | [FILL] |

#### Data Needed

- `FeeManagementFacet` — fee minting, risk metrics, audit history (on-chain)
- `ManagerViewCallsFacet` — class performance metrics (on-chain)
- [FILL: any off-chain fee reporting needed?]

#### Open Questions

- Fee configuration (changing mgmtFeeRate, perfFeeCalculator) is out of scope for V1.
- Class-specific cost/gain adjustments (`ClassAdjustmentFacet`) are out of scope for V1.

---

### 3.7 Reporting & Analytics

**Priority: P2**

#### Purpose

[FILL: What reports does a manager need? Fund performance, AUM trends, investor activity, regulatory reports?]

#### Users

- `manager` — views reports for their fund(s)
- `fund-admin` — views reports across their umbrella

#### User Stories

- [ ] As a manager, I can view AUM over time for my fund(s)
- [ ] As a manager, I can view NAV history and performance charts per class
- [ ] As a manager, I can view a summary of inflows/outflows (subscriptions vs. redemptions) over a period
- [ ] As a manager, I can export a report [FILL: CSV? PDF? format TBD]
- [ ] [FILL: regulatory reporting — are any standard reports needed (e.g., investor statements, fund factsheets)?]
- [ ] [FILL: additional stories]

#### Screens / Views

| Screen | Description |
|--------|-------------|
| `/funds/[fundId]/reports` | [FILL: report selection / dashboard] |
| `/funds/[fundId]/reports/performance` | [FILL: performance chart, NAV history] |
| `/funds/[fundId]/reports/flows` | [FILL: inflow/outflow analysis] |
| [FILL] | [FILL] |

#### Data Needed

- `ManagerViewCallsFacet` — fund summaries, class metrics (on-chain)
- `ViewCallsFacet` — portfolio events, order history (on-chain)
- [FILL: off-chain analytics? time-series data store?]

#### Open Questions

- [FILL: Is there a data warehouse or off-chain analytics layer, or is all data queried live from the chain?]
- [FILL: What export formats are required?]
- [FILL: Are investor statements (sent to investors) generated from this app?]

---

### 3.8 Fund Lifecycle Management

**Priority: P2**

#### Purpose

[FILL: What lifecycle operations does a manager need? Transitioning fund/class status, managing dealing schedules, suspending redemptions?]

#### Users

- `manager` — manages lifecycle of their fund(s)
- `fund-admin` — umbrella-level lifecycle operations

#### User Stories

- [ ] As a manager, I can view the current lifecycle status of my fund(s) and class(es) (ACTIVE / RETIRED / CLOSED)
- [ ] As a manager, I can transition a class to RETIRED or CLOSED status
- [ ] As a manager, I can manage the dealing schedule (next dealing timestamps) for a fund
- [ ] As a manager, I can suspend redemptions for a fund [FILL: is redemption gate in scope? See `FEATURES.md` P2 gap]
- [ ] [FILL: additional stories]

#### Screens / Views

| Screen | Description |
|--------|-------------|
| `/funds/[fundId]/lifecycle` | [FILL: lifecycle status, transition controls, dealing schedule] |
| [FILL] | [FILL] |

#### Data Needed

- `FundLifecycleFacet` — status transitions, forced redemptions (on-chain)
- `FundManagementFacet` — dealing schedule management (on-chain)
- [FILL: any off-chain audit trail for lifecycle events?]

#### Open Questions

- [FILL: Who can trigger status transitions — manager, fund-admin, or both?]
- [FILL: Is forced redemption (e.g., on fund closure) in scope?]
- [FILL: Redemption gates — `FEATURES.md` P2 gap. Needed here?]

---

## 4. Shared Infrastructure (Reuse from Investor App)

The manager app is a new Next.js application (`apps/manager/`) that shares packages with the existing investor app (`apps/next/`).

### What to Reuse

| Item | Source | Notes |
|------|--------|-------|
| Authentication | `packages/auth/` — Cognito-based auth (Privy is being replaced across all apps) | Separate manager Cognito pool; `packages/auth/` will be updated to support Cognito |
| Apollo Client | `packages/data/` — Apollo Client 3 + codegen | Same GraphQL endpoint; new manager-scoped codegen operations needed |
| UI components | `packages/app/components/` | Gluestack UI components, NativeWind/Tailwind |
| Env config | `packages/env/` | May need manager-specific env vars |
| Logging | `packages/logger/` | Same logger |

### What is Different

| Item | Investor App | Manager App |
|------|-------------|-------------|
| Auth | `investor` Cognito pool | `manager` Cognito pool (separate) |
| Apollo operations | Investor queries/mutations | Manager-scoped queries/mutations (new codegen operations) |
| Route structure | `/portfolio`, `/discover` | `/dashboard`, `/funds`, `/investors` (see §5) |
| Cerbos principal | Investor principal | Manager/fund-admin principal; scoped to `managementCompanyId` |
| Wallet connectors | Needed (investor wallet connectivity) | Not needed — platform-managed wallets |

---

## 5. Navigation / Route Structure

```
/                          → redirect to /dashboard
/dashboard                 → Home dashboard (MVP)
/funds                     → Fund list (MVP)
/funds/new                 → Create fund (MVP)
/funds/[fundId]            → Fund overview (MVP)
/funds/[fundId]/classes/[classId]   → Class detail (MVP)
/funds/[fundId]/classes/new         → Create share class (MVP)
/funds/[fundId]/nav        → NAV history (P1)
/funds/[fundId]/nav/post   → Post NAV (P1)
/funds/[fundId]/orders     → Order queue (P1)
/funds/[fundId]/investors  → Fund investor list (MVP)
/investors                 → Global investor registry (MVP)
/investors/[investorId]    → Investor profile (MVP)
/funds/[fundId]/fees       → Fee summary (P2)
/funds/[fundId]/reports    → Reports (P2)
/funds/[fundId]/lifecycle  → Lifecycle management (P2)
/auth/login                → Login (Cognito — manager pool)
/auth/logout               → Logout
```

---

## 6. Authorization Requirements

The manager app must enforce access control via Cerbos. The following Cerbos policy surfaces are needed:

| Resource | Actions | Notes |
|----------|---------|-------|
| `fund` | `view`, `edit`, `create` | Manager sees only assigned funds; fund-admin sees all funds in their management company's umbrella(s). All scoped by `managementCompanyId` (ADR-003). |
| `class` | `view`, `edit`, `create` | Same boundary as fund — manager limited to their funds' classes; fund-admin sees umbrella |
| `investor` | `view`, `edit-eligibility` | Manager can view investors and update fund-level eligibility flags; fund-admin can configure eligibility rules |
| `order` | `view` | Processing is automated; no process/cancel action in UI in V1 |
| `nav` | `view`, `post` | Both roles can post NAV (manual entry or Haruko confirmation). No approval workflow in V1. |
| `fee` | `view` | View-only in MVP. Fee configuration is a governance action, out of scope for V1. |

**Existing Cerbos infrastructure:** Docker sidecar (`docker-compose.yml`), policies at `cerbos/policies/`, client at `services/api/src/lib/cerbos.ts`.

New resource policies will need to be added for manager-app-specific actions.

---

## 7. Non-Functional Requirements

| Requirement | Description |
|-------------|-------------|
| Authentication | Cognito-based (separate manager pool). Manager/fund-admin login only — no investor access. |
| Authorization | Fail-closed via Cerbos. If Cerbos is unavailable, deny all access. |
| Responsive | Desktop-only (professional B2B tool) |
| Performance | Page load < 3s; on-chain query latency up to 2s acceptable |
| Accessibility | WCAG 2.1 AA |
| Audit logging | Yes — NAV posts and fee crystallization triggers are logged off-chain |
| Environment | Separate deployment from investor app (`apps/manager/`). Separate Cognito pool and deploy pipeline. |

---

## 8. Explicitly Out of Scope

| Excluded Item | Reason |
|---------------|--------|
| Investor-facing views | Handled by `apps/next/` (investor app) |
| Platform admin (Elysium staff) | Separate surface, separate role — TBD |
| Smart contract deployment/upgrade | Ops tooling, not a manager-facing concern |
| KYC verification workflow | Handled in the investor-facing app. Manager app sends invite links only. |
| Investor onboarding (account creation) | Out of scope. Manager sends invite links; investor completes onboarding in the investor app. |
| Haruko PMS full integration | NAV feed is in scope for MVP. Full Haruko PMS integration (position data, reconciliation) is post-MVP. |
| Mobile (native) | Web only (`apps/manager/` as Next.js, not Expo) |
| Wallet connectivity | Not needed — platform-managed wallets. No wallet connection UI. |
| Multi-tenant data isolation (formal) | Deferred per ADR-003. `managementCompanyId` will be designed into all fund hierarchy tables from the start. |

---

## 9. Open Questions

| # | Question | Owner | Status |
|---|----------|-------|--------|
| 1 | What priority is NAV Management (§3.3)? Is NAV posted in this UI or via Haruko/direct contract call? | — | **Resolved:** P1. Both Haruko feed and manual entry supported from MVP. |
| 2 | Is the `admin` (Elysium staff) role in scope for this app, or a separate surface? | — | **Resolved:** Out of scope. Separate admin surface TBD. |
| 3 | Does the manager app live at a separate domain/subdomain from the investor app? | [FILL] | Partially resolved: separate deployment and Cognito pool confirmed. Domain TBD. |
| 4 | Are write operations (create fund, create class) in scope for MVP? | — | **Resolved:** Yes. Both in scope for MVP. |
| 5 | Who is responsible for investor onboarding? Manager app, separate flow, or Elysium ops? | — | **Resolved:** Invite-link model. Manager sends invite; investor completes in investor app. |
| 6 | Is there a NAV approval workflow (two-person rule, NAV checker role)? | — | **Resolved:** Not in V1. Single user type, no checker role. |
| 7 | KYC/accreditation expiry (`FEATURES.md` P1 gap) — needed for MVP investor registry? | — | **Resolved:** Not needed for MVP. Smart contract gap, post-MVP. |
| 8 | Are on-chain write operations (process orders, post NAV) gated by wallet signature in this UI? | — | **Resolved:** No. Platform-managed wallets — no wallet signature required in UI. |
| 9 | Multi-tenant data isolation strategy (discriminator column vs schema-per-tenant)? | — | **Deferred per ADR-003.** Revisit before second management company is onboarded. |

---

## Cross-References

| Topic | Source |
|-------|--------|
| Entity model (Umbrella / Fund / Class / Dealing hierarchy) | `claude_context/product/ENTITY_MODEL.md` |
| Feature inventory and gaps | `claude_context/product/FEATURES.md` |
| Authorization architecture (Cerbos) | `docs/ADR/002-authorization-architecture.md` |
| Authentication architecture (Cognito) | `docs/ADR/001-authentication-architecture.md` |
| Multi-tenant data isolation | `docs/ADR/003-database-silo.md` |
| Fund-level customization features | `docs/fund-level-customization-features.md` |
| Transfer agency / order processing domain | `claude_context/domain/TRANSFER_AGENCY.md` |
| Investor onboarding domain | `claude_context/domain/INVESTOR_ONBOARDING_AND_SERVICING.md` |
| Fee and equalization domain | `claude_context/domain/FEES_AND_EQUALIZATION.md` |
| MVP product requirements (current) | `claude_context/product/MVP_PRODUCT_REQUIREMENTS_V3.md` |
