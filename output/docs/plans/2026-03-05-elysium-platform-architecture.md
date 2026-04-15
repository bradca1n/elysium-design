# Elysium Platform Architecture

> The definitive architecture reference for the Elysium fund administration platform. Covers event-driven design, workflow orchestration, blockchain transaction safety, observability, security, compliance, analytics, and the developer playbook.

---

## Executive Summary

Elysium is a B2B fund administration platform built on a private blockchain. Tokenized fund shares, automated NAV processing, multi-currency settlement, and class-specific cost allocation — replacing legacy systems like SS&C and BNY for institutional fund managers.

The platform coordinates operations across three fundamentally different systems: **external venues** (custodians, exchanges, FX providers, brokers), a **private blockchain** (on-chain ledger of shares, NAV, positions), and an **off-chain backend** (database, portfolio management, authentication). These systems have different APIs, different latencies, and different failure modes. The architecture uses **events** (immutable facts) and **Step Functions workflows** (orchestrated, retryable sequences) to keep them in sync — with a unified audit trail for every operation.

**Core design rule:** Reads go through API Gateway → Lambda. Everything that mutates state — whether it's a blockchain transaction, a custodian transfer, or sending a welcome email — runs as a Step Functions workflow. No exceptions.

**Who should read this:**
- **Engineers:** Sections 1-5, 8, 10 (Developer Playbook)
- **Architects:** Full document, especially Appendix A (Decision Log)
- **Compliance/auditors:** Sections 6, 7
- **New team members:** Start with sections 1-4

---

## Table of Contents

1. [The Core Problem](#1-the-core-problem)
2. [Event-Driven Core (EventBridge)](#2-event-driven-core-eventbridge)
3. [Workflow Engine (Step Functions)](#3-workflow-engine-step-functions)
4. [Blockchain Transaction Safety](#4-blockchain-transaction-safety)
5. [Observability & Operations](#5-observability--operations)
6. [Data Lake & Business Intelligence](#6-data-lake--business-intelligence)
7. [Security & Compliance](#7-security--compliance)
8. [Resilience Patterns](#8-resilience-patterns)
9. [Infrastructure](#9-infrastructure)
10. [Developer Playbook](#10-developer-playbook-adding-a-new-feature)
- [Appendix A: Decision Log](#appendix-a-decision-log)
- [Appendix B: Setup Checklist](#appendix-b-setup-checklist)

---

## 1. The Core Problem

Elysium coordinates money movement across three categories of systems:

1. **External venues** — custodians, exchanges (Kraken, Coinbase), FX providers, brokers, prime brokers, OTC desks. Each has its own API, webhook patterns, authentication, and settlement times (seconds to hours).
2. **Blockchain** — private EVM chain serving as the on-chain ledger of fund shares, NAV, investor positions, and FX rates. Transactions take ~2-5 seconds to confirm.
3. **Off-chain backend** — PostgreSQL database (application state, audit records), portfolio management system (Haruko), authentication (Cognito), authorization (Cerbos).

These systems must stay in sync, but they're fundamentally different — REST APIs, blockchain transactions, and SQL writes. Operations take variable time: a custodian withdrawal might need multi-sig approval and take hours, a blockchain transaction takes seconds, a database write is instant.

A traditional synchronous API approach breaks down because:

- Blockchain transactions can't finish within an HTTP request timeout
- If the server crashes mid-operation, what happened? Did the money move? Did the ledger update?
- You can't retry a half-completed operation safely
- There's no audit trail beyond application logs

The architecture solves this by decomposing everything into **events** (immutable facts about what happened) and **workflows** (orchestrated, retryable sequences of steps).

### The Two Rings

```
┌──────────────────────────────────────────────────────┐
│  OUTER: Observability + Compliance                    │
│  Prove everything worked correctly.                   │
│  CloudWatch, X-Ray, EMF metrics, SNS alerts,          │
│  Firehose → S3 → Glue → Athena, CloudTrail,          │
│  GuardDuty, SOC 2 mapping, immutability               │
│                                                       │
│  ┌──────────────────────────────────────────────┐    │
│  │  INNER: Events + Workflows                    │    │
│  │  Coordinate all multi-system operations.      │    │
│  │  EventBridge bus, Step Functions,              │    │
│  │  event envelope, wait-for-callback,            │    │
│  │  chain-ops Lambda (isolated IAM + key),        │    │
│  │  circuit breaker, retry, exactly-once          │    │
│  └──────────────────────────────────────────────┘    │
└──────────────────────────────────────────────────────┘
```

Each ring is independently valuable. The event bus works without the data pipeline. The data pipeline works without Step Functions. Together they form a complete production-grade fintech stack.

### Principles

1. **Everything is an event.** Every significant action produces an immutable, structured event. Events are facts — they describe what happened, not what should happen.
2. **Reads are Lambda, actions are Step Functions.** Synchronous reads go through API Gateway → Lambda. Everything that mutates state runs as a Step Functions workflow. No exceptions, no tiers.
3. **Attribute every action.** Every event records WHO (actor), WHAT (payload), and WHY it's connected to other events (correlationId, causationId). SOC 2 requires this.
4. **Observe everything.** Structured logs, custom metrics, distributed traces, and alerts — from day 1, not retrofitted.
5. **Fail visibly, recover automatically.** Retries are built into workflows. Persistent failures surface as alerts. Silent failures are the worst outcome.
6. **Immutable audit trail.** Event logs are append-only. Compliance archives use S3 Object Lock (WORM). No UPDATE or DELETE on audit records.

---

## 2. Event-Driven Core (EventBridge)

### Why an Event Bus

Without a central bus, every service needs to know about every other service. The order processor would need to call the custodian directly, and also update the database, and also log to CloudWatch, and also send an email. That's tight coupling — change one thing and everything breaks.

With EventBridge, the order processor just says: "I processed a batch of orders" and publishes that fact as an event. It doesn't know or care who's listening. Separately, routing rules say:

- "When orders are processed → start the settlement workflow"
- "When orders are processed → stream to analytics"
- "When orders are processed → log for compliance"

Adding a new consumer is a routing rule change, not a code change in the producer.

### EventBridge Bus

All Elysium services share a single EventBridge bus: `elysium-events`.

```
PRODUCERS                    EVENTBRIDGE                     CONSUMERS
─────────                    ──────────                      ─────────
API Lambda ──────┐           elysium-events bus              ┌── Step Functions (workflows)
Order Processor ─┤                  │                        ├── Kinesis Firehose (analytics)
Venue Webhooks ──┤     ┌────────────┼────────────┐          ├── Lambda (notifications)
Haruko Service ──┤     │            │            │          └── EventBridge Archive (replay)
Scheduler ───────┘     ▼            ▼            ▼
                   Rules route events to consumers
                   by source + detailType
```

### Event Envelope

Every event across the entire platform uses this standardized format:

```json
{
  "source": "elysium.custody-ops",
  "detailType": "DEPOSIT_CONFIRMED",
  "detail": {
    "eventId": "550e8400-e29b-41d4-a716-446655440000",
    "correlationId": "7c9e6679-7425-40de-944b-e07fc1f90ae7",
    "causationId": "f47ac10b-58cc-4372-a567-0e02b2c3d479",
    "timestamp": "2026-03-05T14:30:00.000Z",
    "version": "1.0",
    "environment": "prod",
    "actor": {
      "type": "system",
      "id": "venue-webhook-handler",
      "ip": "63.33.117.167"
    },
    "payload": {
      "fundId": "fund-123",
      "investorId": "inv-456",
      "amount": "10000.00",
      "currency": "USDC",
      "venueOrderId": "ord-789"
    }
  }
}
```

| Field | Purpose | Compliance Value |
|-------|---------|-----------------|
| `eventId` | Unique identifier for this event | Deduplication, reference |
| `correlationId` | Traces a complete user journey across services | End-to-end audit trail |
| `causationId` | Direct causal link (this event was caused by that event) | Causal chain reconstruction |
| `actor` | Who/what triggered this event | SOC 2 CC6.1 — action attribution |
| `version` | Schema version for forwards compatibility | Schema evolution |

The `correlationId` is the key compliance piece. When an investor deposits money, that single action triggers a chain: deposit detected → sender verified → deposit confirmed → investor subscribes → settlement transfer → share minting. All share the same `correlationId`. An auditor can query "show me everything that happened for this deposit" and get the complete chain.

The `causationId` is a direct parent-child link. Event B was caused by Event A. This reconstructs the exact causal graph, not just "these events are related."

### Event Categories

| Source | Event Types | Description |
|--------|-----------|-------------|
| `elysium.custody-ops` | `DEPOSIT_DETECTED`, `DEPOSIT_CONFIRMED`, `SETTLEMENT_REQUESTED`, `SETTLEMENT_COMPLETED`, `OFFRAMP_REQUESTED`, `OFFRAMP_COMPLETED` | External venue money movement (custodian deposits, exchange settlements, offramps) |
| `elysium.chain-ops` | `FUND_CREATED`, `NAV_POSTED`, `ORDER_PROCESSED`, `ONRAMP_EXECUTED`, `OFFRAMP_EXECUTED`, `FX_UPDATED` | Blockchain state changes |
| `elysium.lifecycle` | `INVESTOR_ONBOARDED`, `WALLET_REGISTERED`, `KYC_COMPLETED`, `DEALING_OPENED`, `DEALING_CLOSED` | Business lifecycle |
| `elysium.admin` | `FUND_PROVISIONED`, `CREDENTIALS_ROTATED`, `RECONCILIATION_PASSED`, `RECONCILIATION_FAILED` | Administrative operations |
| `elysium.alerts` | `CRITICAL_FAILURE`, `RECONCILIATION_MISMATCH`, `CIRCUIT_BREAKER_OPENED` | Operational alerts |

Source naming pattern: `elysium.{domain}`

### EventBridge Archive

All events are archived automatically with 365-day retention. This enables:
- **Event replay** — reprocess events after a consumer bug fix
- **Forensic analysis** — investigate incidents by replaying the event timeline
- **Testing** — replay production events against a staging consumer to verify a fix before deploying

---

## 3. Workflow Engine (Step Functions)

### The Unified Rule

> **Reads = direct Lambda. Everything else = Step Functions.**

Every operation that mutates state runs as a Step Functions workflow. This includes the obvious (blockchain transactions, custodian transfers, order processing) and the seemingly trivial (sending a welcome email, rotating credentials, generating a report).

**Why unify even simple operations?** In regulated fund administration:
- Audit trail for every action has compliance value — even "investor X received welcome email at time Y"
- One pattern for developers to learn, not two or three
- BI/analytics gets complete operational data without additional instrumentation
- The cost difference is irrelevant: at fund admin volumes (~100-1000 actions/day), Step Functions costs $2-45/month. When managing hundreds of millions in AUM, operational clarity matters more than saving $40/month.

The only exception is synchronous reads (portfolio view, balance check, fund list). These go through API Gateway → Lambda directly because they don't mutate state and have no audit trail requirement beyond API Gateway access logs.

### Why Step Functions

Consider a deposit flow: (1) venue webhook arrives, (2) look up sender wallet, (3) validate deposit, (4) record in database, (5) emit event.

If this were a single Lambda function and it crashes between step 3 and step 4, you've validated the deposit but never recorded it. Is the money there? Did the investor get credited? You'd need to build your own retry logic, your own state tracking, your own idempotency checks. That's exactly what Step Functions already provides as a managed service.

AWS Step Functions is a managed state machine with:

- **Exactly-once execution** — critical for money movement (Standard Workflows)
- **Visual state machine** — auditors and regulators can inspect every execution visually
- **Wait for callback** — workflow pauses until external event (e.g., venue webhook), at zero compute cost
- **Built-in retry** — exponential backoff per step, no custom code
- **90-day execution history** — full input/output at every step, visual debugging
- **220+ native AWS integrations** — invoke Lambda, send to EventBridge, query DynamoDB, all without code

### Why NOT Alternatives

| Alternative | Advantages | Why NOT for Elysium |
|-------------|-----------|----------------------|
| **Lambda Durable Functions** (GA Dec 2025) | Code-first (TypeScript, not ASL JSON), testable with Jest, 3x cheaper per operation ($8/M vs $25/M) | **At-least-once only** — no exactly-once semantics. Must build custom idempotency for every step that has side effects. No visual execution graph (replay-based logs with duplication noise). Only 3 months old with zero production war stories. **Re-evaluate mid-2027** if they add exactly-once. |
| **Temporal.io** | Code-first, exactly-once, visual UI, used by JP Morgan/Coinbase/Stripe | Self-hosted ~$1,500/month + ops burden (Cassandra cluster). Adds vendor dependency. Step Functions at Elysium's volume costs $2-45/month with zero ops. **Migration path** if Step Functions costs >$500/month at 10M+ state transitions. |
| **Kafka (MSK)** | Battle-tested streaming, infinite retention, consumer groups | Over-engineered for fund admin. Kafka is for high-throughput streaming (millions/sec). Elysium processes ~100 actions/day. MSK minimum ~$200/month. No built-in workflow orchestration — you'd still need Step Functions or custom code on top. |
| **Direct Lambda (no orchestration)** | Simpler, fewer services | No built-in audit trail, no exactly-once, no visual debugging, no wait-for-callback. You'd rebuild Step Functions poorly. |

**The key insight:** For regulated fund admin on AWS, boring = Step Functions (GA 2016, 10 years) + Lambda (GA 2014) + EventBridge (GA 2019). These ARE the proven, boring services.

### Standard Workflow Structure

Every workflow follows this pattern:

```
START
  │
  ▼
VALIDATE INPUT (Lambda)
  │ Verify all required fields, check idempotency
  │
  ▼
EXECUTE STEPS (Lambda × N)
  │ Each step: single external call + state update
  │ Retry: { MaxAttempts: 3, IntervalSeconds: 5, BackoffRate: 6 }
  │ Catch: route to ERROR_HANDLER
  │
  ├── [if external callback needed]
  │   WAIT FOR TASK TOKEN
  │   └── Webhook/event calls SendTaskSuccess(token, result)
  │
  ▼
RECORD OUTCOME (Lambda)
  │ Write to audit_log, emit completion event
  │
  ▼
END (Success)

ERROR_HANDLER:
  │ Log error details
  │ Emit CRITICAL alert event
  │ Write failure to audit_log
  │
  ▼
END (Failed)
```

### Wait-for-Callback: The Key Pattern

The most powerful capability for our use case. Consider settlement: you tell a custodian to move $50,000. The custodian says "okay, processing" — but it might take minutes or hours (especially with multi-sig approval).

Without Step Functions, you'd need to either poll (wasteful, error-prone) or store state in a database and have a separate process check for completions (fragile).

With Wait-for-Callback:

```
Step Function generates taskToken
    │
    ▼
Lambda: Submit venue transfer, store taskToken in DB
    │   (keyed by venueOrderId)
    │
    ▼
Step Function: WAIT (paused, zero compute cost)
    │
    │ ... minutes/hours later ...
    │
    ▼
Venue webhook fires → Webhook Lambda
    │ Look up taskToken by venueOrderId
    │ Call sfn.sendTaskSuccess(taskToken, result)
    │
    ▼
Step Function RESUMES → next step
```

The workflow literally sleeps until the external event arrives. This eliminates an entire class of bugs: missed polls, stale state, race conditions, wasted compute.

### Workflow Categories

**Custody & Settlement Operations**
- Deposit Processing (venue webhook → validate → record → emit event)
- Subscribe/Redeem Settlement (order processed → initiate venue transfer → wait for confirmation)
- Offramp Processing (redemption → fiat conversion → venue withdrawal)
- Fund Custody Provisioning (set up custody accounts at venues)

**On-Chain Operations**
- Fund Creation (validate → create DB entity → submit chain tx → confirm → activate)
- NAV Posting (validate → compute NAV → post on-chain → confirm)
- Order Batch Processing (validate → submit chain tx → confirm → emit event)
- FX Rate Update, Onramp/Offramp Recording

**Lifecycle Operations**
- Investor Onboarding (KYC → create account → register wallet → provision venue address)
- Dealing Cycle (open → cutoff → NAV → process orders → settle → close)
- Reconciliation (daily 3-way match: venue balances vs on-chain vs database)

**Administrative Operations**
- Fund Setup Wizard (chain + PMS + venue + database provisioning)
- Credential Rotation (venue API keys, PMS tokens)
- Fee Crystallization

> On-chain transaction steps use the chain-ops Lambda with dedicated IAM and ephemeral signing key (Section 4). It is invoked as a regular Step Functions step — the workflow handles validation, error routing, and event emission; the Lambda handles the chain interaction.

---

## 4. Blockchain Transaction Safety

### The Isolated Chain-Ops Lambda

A dedicated Lambda function — completely separate from API handlers — is the only component allowed to submit on-chain transactions. It has no API Gateway, no HTTP trigger. It is invoked exclusively by Step Functions as a workflow step. Three reasons for this isolation:

1. **Signing key isolation** — the private key that authorizes on-chain transactions is the most sensitive secret in the system. The chain-ops Lambda loads it from Secrets Manager at invocation, uses it for ~2–5 seconds during transaction signing, and discards it when execution completes. If an API Lambda gets compromised, the attacker cannot sign transactions — the key is only accessible to the chain-ops Lambda's dedicated IAM role.

2. **Blast radius** — the chain-ops Lambda has a dedicated IAM role with access only to Secrets Manager (signing key) and the blockchain RPC endpoint. It cannot read the database, cannot call venue APIs, cannot access S3. If compromised, the damage is limited to unauthorized transactions — which are further constrained by on-chain access controls (Diamond proxy roles).

3. **Timeout** — Lambda invoked by Step Functions (not API Gateway) has a 15-minute timeout. On our private chain with ~2–5s block time, transaction confirmation fits comfortably within this limit.

**Why Lambda over Fargate?** The original architecture proposal used Fargate because "Lambda has a 29-second timeout" — but that's the API Gateway timeout, not Lambda itself. Lambda invoked by Step Functions has 15 minutes. Lambda offers: (1) shorter key residence time (~2–5s vs always-in-memory), (2) simpler infrastructure (no ECS cluster, task definitions, health checks), (3) lower cost (~$0.50/month vs ~$15–30/month).

### Chain-Ops as a Workflow Step

The chain-ops Lambda is not a separate service with its own queue — it's a step within whatever Step Functions workflow needs a blockchain transaction:

```
Step Function: NAV Posting
  │
  Step 1: Validate NAV data (Lambda — general)
  Step 2: Compute portfolio value (Lambda — general)
  Step 3: Submit NAV on-chain (Lambda — chain-ops, dedicated IAM)  ← isolated
  Step 4: Wait for confirmation (Lambda — chain-ops, polls receipt)
  Step 5: Update DB status (Lambda — general)
  Step 6: Emit NAV_POSTED event (EventBridge native integration)
```

Step 3 is the chain-ops Lambda. It has its own IAM role and only it can access the signing key. Steps 1, 2, 5 are regular Lambdas with standard IAM. Step Functions handles the orchestration, retry, and error routing.

### Nonce Management

On-chain transactions require sequential nonces per wallet address. If two Step Function executions for the same fund wallet submit transactions concurrently, they might read the same nonce, causing one to fail.

**Launch strategy: let it fail, Step Functions retries.**

At fund admin volume (~10-100 txs/day per fund), two transactions for the same wallet within a 10-second window is near-impossible. If it does happen:
- One transaction succeeds
- The other fails with "nonce too low"
- Step Functions catches the error and retries with exponential backoff
- On retry, the Lambda reads the updated nonce and succeeds

This is not a hack — Step Functions retry with backoff is designed for transient failures. The blockchain confirms in ~2-5 seconds, so the retry window is short.

**Future optimization: atomic nonce allocation from RDS.**

If collision frequency increases:

```sql
CREATE TABLE nonce_tracker (
  wallet_address TEXT PRIMARY KEY,
  next_nonce BIGINT NOT NULL DEFAULT 0
);

-- Atomic allocation (PostgreSQL row lock serializes concurrent calls)
UPDATE nonce_tracker
SET next_nonce = next_nonce + 1
WHERE wallet_address = $1
RETURNING next_nonce - 1 AS allocated_nonce;
```

### The Hybrid Pending Entity Pattern

When creating a resource that exists in both the database and on-chain (like a fund):

1. API validates and creates the DB entity with `status: PENDING_CHAIN`
2. API returns `201 Created` immediately — frontend has a stable ID to poll
3. Step Function workflow starts: validate → submit chain tx → wait for confirmation
4. Chain-ops Lambda confirms the transaction → status becomes `ACTIVE`
5. On failure → status becomes `FAILED`, Step Functions error handler emits alert

This avoids blocking HTTP requests on chain confirmation while giving the frontend an immediately-queryable entity in a visible pending state.

---

## 5. Observability & Operations

### What AWS Gives You Free (Zero Configuration)

| Service | Built-in Metrics/Features | What It Tells You |
|---------|--------------------------|-------------------|
| **Step Functions** | Visual state diagram per execution, input/output at every step, retry history, 90-day retention | Which step a workflow is on, where it failed, what data caused the failure |
| **Step Functions** | Built-in "Running" / "Failed" / "Timed Out" execution filters | What's stuck, what failed, what timed out — no queries needed |
| **Lambda** | Invocations, Errors, Duration (P50/P99/max), Throttles, ConcurrentExecutions | Per-function health, latency, error rate |
| **EventBridge** | FailedInvocations, MatchedEvents, TriggeredRules | Are events flowing? Are rules matching? Any delivery failures? |

None of this requires configuration. These metrics exist in CloudWatch the moment you deploy the resources.

For ops: if a customer says "my deposit didn't go through," you go to the Step Functions console, filter executions by fund ID or correlation ID, and visually see exactly where the workflow stopped. No queries, no dashboards needed.

### Distributed Tracing (X-Ray)

X-Ray provides flame graphs, service maps, and automatic trace propagation across API Gateway → Lambda → Step Functions → Lambda. Setup is one Terraform property per resource:

```hcl
# Lambda
resource "aws_lambda_function" "this" {
  tracing_config { mode = "Active" }
}

# API Gateway
resource "aws_api_gateway_stage" "this" {
  xray_tracing_enabled = true
}

# Step Functions (in state machine definition or Terraform)
# tracingEnabled = true
```

**Zero code changes required.** The toggles add outer trace segments (function boundaries, state transitions) automatically. For deeper visibility into what a Lambda does internally (SDK calls to DynamoDB, external HTTP), add the Powertools Tracer per-Lambda (~5 lines) when actively debugging that function.

**Cost:** Well within the 100K free tier traces/month at Elysium's volume. Effectively $0.

**What it adds over structured logging + correlationId:**
- Visual flame graph (instant latency breakdown: is it DynamoDB or the venue API?)
- Service map (live dependency graph with latency/error rates per edge)
- Fault isolation without log diving (failed segment is red — click to see error)

### What We Configure (Terraform, Not Code)

**CloudWatch Alarms (~15-20 alarms, ~200 lines Terraform):**

```
CRITICAL (→ PagerDuty):
  Step Functions execution failed
  Lambda error rate > 5% for any critical function
  Step Functions execution stuck > 30 minutes

WARNING (→ Slack):
  Lambda P99 duration > 10 seconds
  Venue API error rate > 10% in 5 minutes
  Step Functions execution duration > 2x normal
  EventBridge FailedInvocations > 0

INFO (→ Email, daily):
  Reconciliation passed/failed summary
  Daily deposit/settlement volume
  Workflow execution counts
```

**SNS Topics (3 topics, ~30 lines Terraform):**

```
CloudWatch Alarm (threshold breach)
    │
    ▼
SNS Topic (severity-based)
    │
    ├── elysium-alerts-critical → PagerDuty
    │   (workflow failure, reconciliation mismatch, GuardDuty critical finding)
    │
    ├── elysium-alerts-warning → Slack
    │   (elevated error rates, workflow timeouts, circuit breaker open)
    │
    └── elysium-alerts-info → Email
        (daily summary, reconciliation report)
```

### What We Build (Custom Code)

**Structured Logger (~50 lines, in `packages/logger`):**

Every Lambda must log in consistent JSON. This is the single piece of code that unlocks the entire querying capability.

```json
{
  "level": "INFO",
  "timestamp": "2026-03-05T14:30:00.000Z",
  "service": "custody-ops",
  "function": "processDeposit",
  "correlationId": "7c9e6679-7425-40de-944b-e07fc1f90ae7",
  "message": "Deposit confirmed",
  "data": {
    "venueOrderId": "ord-789",
    "amount": "10000.00",
    "currency": "USDC",
    "investorId": "inv-456"
  },
  "duration_ms": 234
}
```

Without structured logging, CloudWatch Logs Insights queries don't work — you can't filter by `correlationId` if it's not a structured field.

**Log retention:**
- CloudWatch: 30 days (hot, queryable via Logs Insights)
- S3 export: 6 years (compliance, queryable via Athena)

**EMF Metrics Wrapper (~30 lines, in `packages/logger`):**

Embedded Metric Format embeds metric data in log lines. CloudWatch automatically extracts them as custom metrics — zero additional cost versus a separate metrics API.

**Metrics catalog:**

| Category | Metrics |
|----------|---------|
| Per workflow | `ExecutionCount` (started/succeeded/failed), `ExecutionDuration` (P50/P95/P99), `RetryCount` |
| Venue APIs | `VenueApiLatency`, `VenueApiErrors`, `VenueRateLimitHits` |
| Haruko API | `HarukoApiLatency`, `HarukoApiErrors` |
| Blockchain | `BlockchainRpcLatency`, `BlockchainRpcErrors` |
| Business | `DepositsProcessed`, `DepositVolume`, `SettlementsCompleted`, `SettlementVolume`, `ReconciliationStatus` |

### Saved Queries (CloudWatch Logs Insights)

Write once, save in the CloudWatch console. Any ops person can run them.

```sql
-- Trace a complete operation by correlation ID
filter correlationId = "abc-123"
| sort @timestamp
| display @timestamp, service, function, level, message

-- All errors in the last hour, grouped by service
filter level = "ERROR"
| stats count() by service, function
| sort count desc

-- Venue API latency over time (5-minute buckets)
filter service = "custody-ops" and message = "Venue API call"
| stats avg(duration_ms), max(duration_ms), pct(duration_ms, 99) by bin(5m)

-- Customer complaint: "my deposit didn't work"
filter service = "custody-ops" and investorId = "inv-456"
| sort @timestamp
| display @timestamp, function, message, level

-- Daily operation summary
filter level = "INFO" and message like /completed|confirmed|settled/
| stats count() by detailType, bin(1d) as day
| sort day desc

-- Slow operations (>5 seconds)
filter duration_ms > 5000
| sort duration_ms desc
| display @timestamp, service, function, message, duration_ms
```

### Day-to-Day Operations

**Morning Check (3 minutes):**

1. CloudWatch Alarms dashboard — any red alarms?
2. Step Functions console — any failed executions overnight?
3. GuardDuty console — any new findings? (should be zero)
4. Reconciliation email should have arrived — passed or failed?

If everything is green, you're done. The system is designed so "no news is good news" — alerts are pushed to you.

**Customer Complaint: "My Deposit Didn't Go Through"**

1. Get the investor ID or wallet address
2. CloudWatch Logs Insights: `filter investorId = "inv-456" | sort @timestamp`
3. This shows every log line across every service for that investor
4. If a Step Functions execution exists, open it — visual diagram shows exactly which step failed
5. If no execution exists, check the webhook handler logs — did the venue even send the webhook?
6. If no webhook, check the venue's dashboard — did the underlying transaction confirm?
7. X-Ray: search by correlationId to see the flame graph across all services
8. Time to diagnose: 2–5 minutes

---

## 6. Data Lake & Business Intelligence

### Three Data Layers

The architecture produces queryable data at three layers, each serving a different consumer:

| Layer | Storage | Latency | Consumer | Query Type |
|-------|---------|---------|----------|------------|
| **Application data** | RDS PostgreSQL | <10ms | Fund manager UI | "Show my order status", "What's my portfolio NAV?" |
| **Execution history** | Step Functions Console | Interactive | Operations team | "What happened to order #123?" (visual click-through) |
| **Analytics / BI** | S3 → Glue → Athena | 2-5 seconds | Dashboards, compliance, reports | "Monthly deposit volume by fund", "P99 settlement latency" |

These layers are not redundant — each serves a different latency requirement and consumer. RDS for API-speed UI queries. Step Functions Console for visual operational debugging. Athena for analytics and compliance queries where 2-5 second latency is acceptable.

### Architecture

```
EventBridge (elysium-events)
    │
    ▼
Kinesis Data Firehose
    │ Buffer: 5 min or 128 MB
    │
    ▼
S3 (elysium-event-lake)
    │ Partition: /year={}/month={}/day={}/source={}/detailType={}/
    │ Lifecycle: Standard → IA (90d) → Glacier (1yr)
    │
    ▼
Glue Data Catalog
    │ Table definitions + partitions over S3 data
    │ Glue Crawler runs weekly to discover schema
    │
    ▼
Athena (serverless SQL)
    │
    ├── Compliance queries ("all transfers for Fund X in 2026")
    ├── Business intelligence ("monthly AUM trends")
    └── Operational analysis ("P99 settlement latency by fund")
```

**Why Glue Data Catalog from day 1:** Without it, event data accumulates in S3 but nobody can query it. Glue is ~$1/month. Compliance data doubles as BI data from launch.

**Why Athena over Redshift/Snowflake?** Serverless, pay-per-query (~$5/TB scanned), scales to zero. At fund admin event volumes, Athena is orders of magnitude cheaper. Athena has a hard latency floor of ~1-2 seconds per query (serverless startup overhead) — fine for dashboards, not for UI APIs.

**Future optimization — Parquet conversion:** JSON queries work fine at low volume. When queries start taking >5 seconds or scan costs increase, add a nightly Glue job for JSON → Parquet conversion (columnar format, 10-100x less data scanned).

### Query Examples

```sql
-- Compliance: All money movements for a fund
SELECT timestamp, detailType, payload.amount, payload.currency, actor.id
FROM elysium_events
WHERE source = 'elysium.custody-ops'
  AND payload.fundId = 'fund-123'
  AND year = '2026'
ORDER BY timestamp;

-- Business: Daily deposit volume
SELECT DATE(timestamp) as day, SUM(CAST(payload.amount AS DECIMAL)) as volume
FROM elysium_events
WHERE detailType = 'DEPOSIT_CONFIRMED'
GROUP BY DATE(timestamp)
ORDER BY day;
```

### Cost

At 10 GB events/month (generous for a fund admin platform):
- Firehose: ~$0.35/month
- S3: ~$0.23/month
- Athena: ~$0.05/query (scans ~1 GB)
- Glue: ~$1/month (weekly crawl)
- **Total: < $5/month** for a complete analytics and BI pipeline

---

## 7. Security & Compliance

### Secrets Management

ALL secrets in AWS Secrets Manager. Never in environment variables, SSM Parameter Store, or code.

```
/${stage}/db                    — Database credentials (auto-rotated)
/${stage}/venues/{name}/api-key — Venue API credentials (per venue)
/${stage}/haruko/token          — Haruko JWT token
/${stage}/chain/signing-key     — Blockchain transaction signing key
```

Access pattern: Lambda reads secret at cold start, caches in execution context. IAM policy grants `secretsmanager:GetSecretValue` only for the specific secrets each function needs. The webhook handler can read the webhook verification secret but not the signing key. Blast radius is minimized per component.

### Encryption

| Layer | Mechanism | Key |
|-------|-----------|-----|
| S3 (event lake) | SSE-KMS | Custom CMK `elysium-events-key` |
| S3 (compliance archive) | SSE-KMS + Object Lock (WORM) | Same CMK, compliance mode |
| RDS | KMS | Default AWS-managed key |
| Secrets Manager | KMS | Default AWS-managed key |
| In transit | TLS 1.2+ | Enforced by API Gateway, verified for outbound |

### Threat Detection (GuardDuty)

GuardDuty is a passive threat detection service — zero code changes, purely observes AWS-internal log streams (CloudTrail, VPC Flow Logs, DNS). It detects threats that matter for a financial platform:

| Category | Example Finding | Severity |
|----------|----------------|----------|
| **Credential compromise** | `AttackSequence:IAM/CompromisedCredentials` — full credential compromise chain | Critical |
| **Data exfiltration** | `Exfiltration:S3/AnomalousBehavior` — bulk download of fund documents at 3am | High |
| **Database brute force** | `CredentialAccess:RDS/AnomalousBehavior.SuccessfulBruteForce` — DB password cracked | High |
| **Audit trail tampering** | `Stealth:IAMUser/CloudTrailLoggingDisabled` — attacker disabling audit trail | High |
| **Anonymous access** | `UnauthorizedAccess:S3/TorIPCaller` — S3 access from anonymized network | High |

Setup is ~20 lines Terraform:

```hcl
resource "aws_guardduty_detector" "main" {
  enable                       = true
  finding_publishing_frequency = "FIFTEEN_MINUTES"
}

resource "aws_guardduty_detector_feature" "s3" {
  detector_id = aws_guardduty_detector.main.id
  name        = "S3_DATA_EVENTS"
  status      = "ENABLED"
}

resource "aws_guardduty_detector_feature" "rds" {
  detector_id = aws_guardduty_detector.main.id
  name        = "RDS_LOGIN_EVENTS"
  status      = "ENABLED"
}
```

**Cost:** $3-15/month at Elysium's scale. **Must be enabled from day 1** — it does not analyze historical data, so every day it's off is a blind spot.

GuardDuty findings route to EventBridge, which can trigger SNS alerts or automated response (e.g., auto-revoke compromised IAM credentials).

### SOC 2 Mapping

| Trust Criteria | Requirement | AWS Service |
|---------------|-------------|-------------|
| CC6.1 | Logical access controls | Cognito (MFA enforced) + IAM + Cerbos |
| CC6.3 | Role-based access | Cerbos policies (fund-scoped) |
| CC7.1 | System monitoring | CloudWatch Metrics + Alarms + X-Ray |
| CC7.2 | Anomaly detection | GuardDuty (automatic, no baseline needed) |
| CC7.3 | Security event logging | CloudTrail + GuardDuty |
| CC8.1 | Change management | GitHub Actions + Terraform + PR reviews |
| A1.2 | Recovery objectives | EventBridge Archive replay, RDS PITR, S3 versioning |

### API Read Audit (View Calls)

On-chain reads and API data queries are synchronous — they don't go through Step Functions. But SOC 2 requires audit logging for all access, including reads. Three automatic layers cover this:

1. **API Gateway access logs** — every HTTP request logged with timestamp, source IP, path, method, status. Zero code — enable access logging on the API Gateway stage.
2. **Structured app logs** — the structured logger records the authenticated actor (from Cognito JWT), endpoint, fund/investor context, and `correlationId`.
3. **Cerbos authorization logs** — every authorization decision logged: who was authorized (or denied) to access what resource.

Together these satisfy CC6.1 for read operations without Step Functions overhead for synchronous calls.

### SOC 2 Gap Analysis

The architecture covers ~85% of SOC 2 requirements from day 1 (up from ~75% with the addition of GuardDuty and X-Ray).

**Gaps (documentation/process, not architecture):**

| Gap | Type | Effort | Priority |
|-----|------|--------|----------|
| Information Security Policy | Document | 2–3 days | Pre-audit |
| Incident Response Procedure | Document | 1–2 days | Pre-audit |
| Risk Register | Document | 1–2 days | Pre-audit |
| Access Review Process | Process | 1 day setup + quarterly execution | Pre-audit |
| Vendor Assessment (venues, Haruko, AWS) | Document | 2–3 days | Pre-audit |

These gaps are documentation and process work — the architecture supports all of them.

### Data Classification

| Classification | Examples | Encryption | Retention | Access |
|---------------|----------|------------|-----------|--------|
| PUBLIC | Fund NAV, blockchain data | Standard | Indefinite | Anyone |
| INTERNAL | Operational logs, workflow state | SSE-S3 | 30 days hot, 6 years archive | Engineering |
| CONFIDENTIAL | Investor PII, transfer details | SSE-KMS | 6 years (CBI requirement) | Authorized roles only |
| RESTRICTED | API secrets, signing keys | Secrets Manager KMS | Until rotated | IAM policy per-function |

### Immutability

Audit records are append-only at every level:

- **PostgreSQL audit tables:** INSERT-only (no UPDATE/DELETE grants for application role). Audit history cannot be modified even by the application.
- **S3 compliance bucket:** Object Lock in COMPLIANCE mode (WORM). Cannot be deleted even by a root AWS account. Enabled from day 1.
- **EventBridge Archive:** Managed by AWS, immutable by design.

---

## 8. Resilience Patterns

### Retry Strategy

All Step Functions steps use exponential backoff:

```json
{
  "Retry": [{
    "ErrorEquals": ["States.ALL"],
    "IntervalSeconds": 5,
    "MaxAttempts": 3,
    "BackoffRate": 6
  }]
}
```

Attempt 1: immediate → Attempt 2: 5s → Attempt 3: 30s → Attempt 4: 180s → Error handler + alert

Most real-world failures are transient (network blip, API momentarily overloaded) and resolve within seconds. Retries handle these without human intervention.

### Circuit Breaker

If a venue API fails repeatedly (5 failures in 1 minute), the circuit breaker "opens" — pausing new requests:

- Track consecutive failures in CloudWatch Metric
- Alarm triggers when threshold breached
- EventBridge rule pauses workflow triggers during circuit-open period
- Canary Lambda tests API health every 30s
- Auto-close circuit when canary succeeds

This prevents cascading failures. Without it, a venue outage would cause all workflows to retry simultaneously, potentially overwhelming both systems when the outage resolves.

### Idempotency

Every operation has a unique key:

| System | Idempotency Key |
|--------|----------------|
| Venue API | `externalOrderId` (unique per portfolio) |
| On-chain | Transaction hash |
| Step Functions | Standard workflows are exactly-once by nature |
| Database | UNIQUE constraint on `(operationType, externalReference)` |

If the same operation is attempted twice (EventBridge replay, duplicate webhook), the system checks "did I already complete this?" and skips silently.

### Error Handling (Step Functions Native)

When a workflow step fails after all retries, Step Functions routes to the error handler:

```
Step fails after 3 retries
    │
    ▼
ERROR_HANDLER Lambda
    │ Log full error details (correlationId, input, error)
    │ Emit CRITICAL_FAILURE event to EventBridge
    │ Write failure to PostgreSQL audit_log
    │
    ▼
SNS CRITICAL alert → PagerDuty

Failed execution stays in Step Functions console:
    → Visual diagram shows exactly which step failed
    → Full input/output at every step for debugging
    → Can restart execution with same input after fix
```

Failed-after-3-retries means something is fundamentally wrong. A human investigates via the Step Functions console and decides. The execution can be restarted with the original input once the root cause is fixed.

### Lambda Concurrency & Scaling

Lambda auto-scales by creating new instances per concurrent invocation. The account default is 1,000 concurrent executions across all functions.

**No reserved concurrency for any Lambda (including chain-ops).** At fund admin volume (~100 txs/day), contention for Lambda slots is near-impossible. If the account limit is reached (all 1,000 slots in use):
- Step Functions: auto-retries with exponential backoff
- API Gateway: returns 429 to client

The 1,000 limit is a **soft limit** — request an increase via AWS Service Quotas (common to go to 3,000-10,000).

### Disaster Recovery

| Component | RPO | RTO | Mechanism |
|-----------|-----|-----|-----------|
| Database | 5 min | < 1 hour | RDS automated backups, PITR (35 days) |
| Events | 0 | < 30 min | EventBridge Archive replay |
| Workflows | 0 | Immediate | Step Functions re-execution with same input |
| Secrets | 0 | Immediate | Secrets Manager (replicated within region) |
| Event lake | 0 | N/A | S3 (11 nines durability) |

---

## 9. Infrastructure

### AWS Service Map

```
┌──────────────────────────────────────────────────────────────┐
│                      ELYSIUM PLATFORM                        │
│                                                              │
│  COMPUTE          MESSAGING            DATA                  │
│  ┌──────────┐     ┌──────────────┐     ┌──────────────┐     │
│  │ Lambda   │     │ EventBridge  │     │ RDS Postgres │     │
│  │ (API +   │     │ (event bus)  │     │ (app state)  │     │
│  │  steps + │     ├──────────────┤     ├──────────────┤     │
│  │  chain-  │     │ SNS         │     │ S3           │     │
│  │  ops)    │     │ (alerts)    │     │ (event lake, │     │
│  ├──────────┤     └──────────────┘     │  compliance) │     │
│  │ Step     │                          ├──────────────┤     │
│  │ Functions│                          │ DynamoDB     │     │
│  │ (workflow│     OBSERVABILITY        │ (webhook     │     │
│  │  engine) │     ┌──────────────┐     │  dedup)      │     │
│  ├──────────┤     │ CloudWatch   │     └──────────────┘     │
│  │ Fargate  │     │ (logs,       │                           │
│  │ (Cerbos) │     │  metrics,    │     ANALYTICS             │
│  └──────────┘     │  alarms)     │     ┌──────────────┐     │
│                    ├──────────────┤     │ Firehose     │     │
│  SECURITY          │ X-Ray       │     │ (stream→S3)  │     │
│  ┌──────────┐     │ (traces)    │     ├──────────────┤     │
│  │ Cognito  │     ├──────────────┤     │ Glue         │     │
│  │ (authn)  │     │ CloudTrail   │     │ (catalog)    │     │
│  ├──────────┤     │ (audit)     │     ├──────────────┤     │
│  │ Cerbos   │     └──────────────┘     │ Athena       │     │
│  │ (authz)  │                          │ (SQL on S3)  │     │
│  ├──────────┤                          └──────────────┘     │
│  │ GuardDuty│                                                │
│  │ (threats)│     INFRA                                      │
│  ├──────────┤     ┌──────────────┐                           │
│  │ Secrets  │     │ Terraform    │                           │
│  │ Manager  │     │ (IaC)        │                           │
│  ├──────────┤     ├──────────────┤                           │
│  │ KMS      │     │ GitHub       │                           │
│  ├──────────┤     │ Actions (CI) │                           │
│  │ IAM      │     └──────────────┘                           │
│  ├──────────┤                                                │
│  │ VPC      │                                                │
│  └──────────┘                                                │
└──────────────────────────────────────────────────────────────┘
```

| Service | Purpose |
|---------|---------|
| Lambda | API handlers, workflow steps, webhook receivers, chain-ops processor (isolated IAM) |
| Step Functions | Workflow orchestration for all state-mutating operations |
| EventBridge | Central event bus, routing, scheduling, archive |
| CloudWatch | Logs, metrics (EMF), alarms |
| X-Ray | Distributed tracing (flame graphs, service map) |
| CloudTrail | AWS API audit logging (~$2/month) |
| GuardDuty | Threat detection — credential compromise, data exfiltration, brute force ($3-15/month) |
| Secrets Manager | All credentials and API keys |
| SNS | Alert routing (PagerDuty, Slack, email) |
| S3 | Event lake, compliance archive (Object Lock WORM) |
| DynamoDB | Webhook deduplication (TTL-based) |
| Kinesis Firehose | Event stream to S3 |
| Glue Data Catalog | Table definitions over S3 data (~$1/month) |
| Athena | Serverless SQL over S3 for BI and compliance queries |

### Naming Conventions

| Resource | Pattern | Example |
|----------|---------|---------|
| EventBridge bus | `elysium-events` | `elysium-events` |
| EventBridge rule | `elysium-{source}-{detailType}` | `elysium-custody-deposit-confirmed` |
| Step Function | `elysium-{workflow-name}` | `elysium-deposit-processing` |
| SNS topic | `elysium-alerts-{severity}` | `elysium-alerts-critical` |
| Lambda function | `elysium-{service}-{function}` | `elysium-custody-webhook-handler` |
| Secret | `/${stage}/{service}/{key}` | `/prod/venues/copper/api-key` |
| S3 bucket | `elysium-{purpose}-${stage}` | `elysium-event-lake-prod` |
| Log group | `/elysium/${stage}/{service}` | `/elysium/prod/custody-ops` |

Event source pattern: `elysium.{domain}` — domains: `custody-ops`, `chain-ops`, `lifecycle`, `admin`, `alerts`

### Error Codes

| Code | Meaning |
|------|---------|
| `VENUE_TRANSFER_FAILED` | Venue API rejected transfer |
| `VENUE_TIMEOUT` | Venue didn't respond in time |
| `CHAIN_TX_FAILED` | On-chain transaction reverted |
| `CHAIN_TX_TIMEOUT` | On-chain transaction not mined in time |
| `CHAIN_NONCE_CONFLICT` | Nonce collision, Step Functions will retry |
| `RECONCILIATION_MISMATCH` | Venue balance ≠ on-chain balance |
| `IDEMPOTENCY_CONFLICT` | Operation already processed |
| `VALIDATION_ERROR` | Input validation failed |

### What Ships at Launch vs. Future Optimizations

Everything above ships at launch. The following are the only items deferred:

| Optimization | Why defer | When to add |
|-------------|-----------|-------------|
| Parquet conversion | JSON queries work fine at low volume | When Athena queries take >5s |
| CloudWatch Anomaly Detection | Needs 2+ weeks of baseline data to be useful | After launch, once baseline accumulates |
| QuickSight / Metabase dashboards | Athena console + saved queries work initially | When non-technical users need self-serve BI |
| Automated SOC 2 evidence collection | Manual collection works for first audit | Before second annual audit |
| X-Ray Powertools SDK instrumentation | Toggles provide outer traces; deep instrumentation is per-Lambda when debugging | When actively debugging a specific function |
| Order status history UI | Frontend only needs current status for launch | When product requires transition history in UI |
| Atomic nonce allocation | Retry strategy is sufficient at launch volume | If nonce collisions are observed |

---

## 10. Developer Playbook: Adding a New Feature

> Once the scaffold is deployed, every new feature follows this exact recipe. **Infrastructure is configuration and business logic is the only code** — Step Functions handles retry/state/error routing, EventBridge handles event routing. The only thing that changes per feature is the 5–30 lines of business logic inside each step Lambda.

### Step 0: Define Your Feature (~15 minutes)

Before touching any code, answer three questions:

| Question | Example (Investor Onboarding) |
|----------|------------------------------|
| **EVENTS:** What facts does this feature produce? | `INVESTOR_ONBOARDED`, `WALLET_REGISTERED`, `KYC_COMPLETED` |
| **WORKFLOW:** What are the steps? Do any wait on external systems? | Validate → create DB record → register wallet on-chain → wait for venue address → emit event |
| **TRIGGER:** What starts this? | API call (`POST /investors`) |

These three answers determine everything in Steps 1–5.

### Step 1: Events — Register Event Types

**Where:** `packages/events/src/catalog.ts`

```typescript
export const EVENT_CATALOG = {
  // ... existing events ...

  'elysium.lifecycle': {
    INVESTOR_ONBOARDED: {
      source: 'elysium.lifecycle',
      description: 'Investor account created and verified',
      payload: z.object({
        investorId: z.string().uuid(),
        fundId: z.string().uuid(),
        walletAddress: z.string(),
        kycStatus: z.enum(['PENDING', 'APPROVED']),
      }),
    },
  },
} as const
```

The catalog serves two purposes: (1) runtime validation — malformed events fail at the source, not three hops downstream, and (2) living documentation of every event in the system.

### Step 2: Workflow — Write the State Machine

**Where:** `infra/workflows/{feature-name}.asl.json`

Every workflow uses this skeleton — copy an existing one and rename:

```json
{
  "Comment": "Investor Onboarding",
  "StartAt": "Validate",
  "States": {
    "Validate": {
      "Type": "Task",
      "Resource": "${ValidateLambdaArn}",
      "Next": "CreateRecord",
      "Retry": [{ "ErrorEquals": ["States.ALL"], "IntervalSeconds": 5, "MaxAttempts": 3, "BackoffRate": 6 }],
      "Catch": [{ "ErrorEquals": ["States.ALL"], "Next": "HandleError" }]
    },
    "CreateRecord": {
      "Type": "Task",
      "Resource": "${CreateRecordLambdaArn}",
      "Next": "RegisterWalletOnChain",
      "Retry": [{ "ErrorEquals": ["States.ALL"], "IntervalSeconds": 5, "MaxAttempts": 3, "BackoffRate": 6 }],
      "Catch": [{ "ErrorEquals": ["States.ALL"], "Next": "HandleError" }]
    },
    "RegisterWalletOnChain": {
      "Type": "Task",
      "Resource": "${ChainOpsLambdaArn}",
      "Next": "WaitForConfirmation",
      "Retry": [{ "ErrorEquals": ["States.ALL"], "IntervalSeconds": 5, "MaxAttempts": 3, "BackoffRate": 6 }],
      "Catch": [{ "ErrorEquals": ["States.ALL"], "Next": "HandleError" }]
    },
    "WaitForConfirmation": {
      "Type": "Task",
      "Resource": "arn:aws:states:::lambda:invoke.waitForTaskToken",
      "Parameters": {
        "FunctionName": "${ConfirmationLambdaArn}",
        "Payload": {
          "taskToken.$": "$$.Task.Token",
          "txHash.$": "$.txHash"
        }
      },
      "TimeoutSeconds": 300,
      "Next": "EmitCompletion",
      "Catch": [{ "ErrorEquals": ["States.TaskTimedOut"], "Next": "HandleTimeout" }]
    },
    "EmitCompletion": {
      "Type": "Task",
      "Resource": "arn:aws:states:::events:putEvents",
      "Parameters": {
        "Entries": [{
          "Source": "elysium.lifecycle",
          "DetailType": "INVESTOR_ONBOARDED",
          "EventBusName": "elysium-events",
          "Detail.$": "$.eventPayload"
        }]
      },
      "End": true
    },
    "HandleError": {
      "Type": "Task",
      "Resource": "${HandleErrorLambdaArn}",
      "End": true
    },
    "HandleTimeout": {
      "Type": "Task",
      "Resource": "${HandleTimeoutLambdaArn}",
      "End": true
    }
  }
}
```

**The pattern is always:**
- First state → Validate
- Middle states → your business steps (one Lambda each)
- If a step needs a blockchain transaction → use the chain-ops Lambda (isolated IAM)
- If waiting on external system → `waitForTaskToken` state (zero compute while paused)
- Last state before End → emit completion event via EventBridge native integration
- Two catch states → HandleError + HandleTimeout

### Step 3: Lambda Functions — One Per Workflow Step

**Where:** `services/{domain}/src/handlers/{workflow-name}/`

```
services/
  lifecycle/                          ← service (one per domain)
    src/
      handlers/
        investor-onboarding/          ← one folder per workflow
          validate.ts                 ← step 1
          create-record.ts            ← step 2
          handle-error.ts             ← shared error handler
    package.json
    tsconfig.json
  chain-ops/                          ← shared chain-ops Lambda
    src/
      handler.ts                      ← isolated, dedicated IAM role
```

**Every step Lambda uses this skeleton:**

```typescript
import { createLogger } from '@elysium/logger'
import { emitMetric } from '@elysium/logger/emf'

const log = createLogger('lifecycle')

interface Input {
  correlationId: string
  investorId: string
  // ... step-specific fields
}

export async function handler(input: Input) {
  const startTime = Date.now()

  log.info('Validating investor onboarding', {
    correlationId: input.correlationId,
    investorId: input.investorId,
  })

  // ── YOUR BUSINESS LOGIC (5-30 lines) ──

  emitMetric('Elysium/Lifecycle', 'ValidateInvestorDuration', Date.now() - startTime, 'Milliseconds')

  return { ...input, validatedAt: new Date().toISOString() }
}
```

Rules:
- Import the structured logger. Log entry with `correlationId` at the start.
- Do your business logic. This is the only part that varies per step.
- Emit a duration metric via EMF.
- Return data for the next step. Step Functions passes the return value as input to the next state.
- **Do NOT** add retry logic, error handling, or state management — Step Functions does all of that.

**The error handler is standardized (one per service, shared across all workflows):**

```typescript
import { createLogger } from '@elysium/logger'
import { emitEvent } from '@elysium/events'

const log = createLogger('lifecycle')

export async function handler(input: { correlationId: string; error: { Error: string; Cause: string } }) {
  log.error('Workflow failed', input.error, { correlationId: input.correlationId })

  await emitEvent({
    source: 'elysium.alerts',
    detailType: 'CRITICAL_FAILURE',
    correlationId: input.correlationId,
    actor: { type: 'system', id: 'investor-onboarding-workflow' },
    payload: { workflow: 'investor-onboarding', error: input.error },
  })
}
```

### Step 4: Terraform — Wire It All Together

**Where:** `infra/modules/{domain}/`

```
infra/
  modules/
    _lambda/               ← shared Lambda module (write once)
      main.tf
      variables.tf
    custody-ops/           ← domain module
    lifecycle/             ← domain module
      main.tf              ← Step Function + Lambda modules
      eventbridge.tf       ← routing rules
      alarms.tf            ← CloudWatch alarms
      variables.tf
      outputs.tf
    chain-ops/             ← shared chain-ops Lambda (isolated IAM)
  workflows/
    deposit-processing.asl.json
    investor-onboarding.asl.json
```

**Shared `_lambda` module (write once, used by every Lambda):**

```hcl
resource "aws_lambda_function" "this" {
  function_name = var.function_name
  handler       = var.handler
  runtime       = "nodejs20.x"
  timeout       = var.timeout       # default 30s, chain-ops overrides to 300s
  memory_size   = var.memory        # default 256MB
  role          = var.iam_role_arn
  tracing_config { mode = "Active" }   # X-Ray — one line
  environment {
    variables = {
      STAGE        = var.stage
      SERVICE_NAME = var.service_name
      EVENT_BUS    = "elysium-events"
    }
  }
}

resource "aws_cloudwatch_log_group" "this" {
  name              = "/elysium/${var.stage}/${var.service_name}"
  retention_in_days = 30
}
```

**Domain module — `main.tf`:**

```hcl
resource "aws_sfn_state_machine" "investor_onboarding" {
  name       = "elysium-investor-onboarding"
  role_arn   = aws_iam_role.sfn_lifecycle.arn
  definition = templatefile("${path.module}/../../workflows/investor-onboarding.asl.json", {
    ValidateLambdaArn       = module.validate_investor.arn
    CreateRecordLambdaArn   = module.create_investor_record.arn
    ChainOpsLambdaArn       = data.aws_lambda_function.chain_ops.arn
    ConfirmationLambdaArn   = module.confirm_wallet.arn
    HandleErrorLambdaArn    = module.handle_lifecycle_error.arn
    HandleTimeoutLambdaArn  = module.handle_lifecycle_timeout.arn
  })
  tracing_configuration { enabled = true }   # X-Ray — one line
}

module "validate_investor" {
  source        = "../_lambda"
  function_name = "elysium-lifecycle-validate-investor"
  handler       = "handlers/investor-onboarding/validate.handler"
  service_name  = "lifecycle"
  iam_role_arn  = aws_iam_role.lifecycle_lambda.arn
}
# ... same pattern for each step
```

### Step 5: Observability — Add Saved Queries

**Where:** CloudWatch Logs Insights console (or Terraform `aws_cloudwatch_query_definition`)

Each feature adds 2–3 saved queries:

```sql
-- Trace a specific operation
filter correlationId = "REPLACE_ME" and service = "lifecycle"
| sort @timestamp
| display @timestamp, function, level, message

-- All failures in last 24h for this service
filter service = "lifecycle" and level = "ERROR"
| stats count() by function
| sort count desc
```

### Step 6: Deploy and Verify

```bash
# 1. Deploy
cd infra && terraform apply

# 2. Trigger manually
aws stepfunctions start-execution \
  --state-machine-arn arn:aws:states:...:elysium-investor-onboarding \
  --input '{"correlationId":"test-123","investorId":"inv-test"}'

# 3. Verify in Step Functions console (visual state diagram)
# 4. Verify logs in CloudWatch Logs Insights
# 5. Verify X-Ray trace in X-Ray console (service map + flame graph)
# 6. Verify alarm fires on failure (failed execution → SNS)
```

### Quick Reference Checklist

```
┌─────────────────────────────────────────────────────────────┐
│  NEW FEATURE CHECKLIST                                       │
│                                                              │
│  □ Step 0  Define events, workflow steps, trigger            │
│                                                              │
│  □ Step 1  packages/events/src/catalog.ts                    │
│            Add event types + Zod payload schemas             │
│                                                              │
│  □ Step 2  infra/workflows/{name}.asl.json                   │
│            Copy skeleton, rename states, swap Lambda ARNs    │
│                                                              │
│  □ Step 3  services/{domain}/src/handlers/{name}/*.ts        │
│            One file per step — logger, logic, metric, return │
│                                                              │
│  □ Step 4  infra/modules/{domain}/                           │
│            main.tf       — Step Function + Lambda modules    │
│            eventbridge.tf — routing rules for your events    │
│            alarms.tf     — failed execution alarm            │
│                                                              │
│  □ Step 5  CloudWatch saved queries (2-3 per feature)        │
│                                                              │
│  □ Step 6  terraform apply → trigger → verify (+ X-Ray)     │
│                                                              │
│  New files: ~6-10  |  Modified files: 1-2  |  Time: 1-2 days│
└─────────────────────────────────────────────────────────────┘
```

---

## Appendix A: Decision Log

| # | Decision | Choice | Alternatives Considered | Rationale |
|---|----------|--------|------------------------|-----------|
| 1 | **Orchestration paradigm** | Everything (except reads) is a Step Function | Tiered approach (critical vs simple); direct Lambda for everything | Unified audit trail has compliance value even for trivial operations. One pattern for developers. Cost is $2-45/month — irrelevant when managing hundreds of millions in AUM. |
| 2 | **Workflow engine** | Step Functions Standard | Lambda Durable Functions; Temporal.io; Kafka (MSK); custom state machine | Exactly-once execution, visual execution graph, 10 years maturity, 220+ AWS integrations, zero ops. Durable Functions lack exactly-once (3 months old). Temporal adds $1,500/month ops. Kafka is for streaming, not orchestration. |
| 3 | **On-chain pipeline** | Chain-ops Lambda as a Step Function step | SQS FIFO → dedicated consumer (original ADR-004); Fargate process | Step Functions orchestrates the workflow — a separate queue adds complexity without value. Lambda as a step preserves isolation (dedicated IAM, ephemeral key) without SQS overhead. |
| 4 | **Chain-ops compute** | Lambda (isolated IAM) | Fargate (ECS) | Shorter key residence (~2-5s vs always-in-memory), simpler infra, lower cost. Lambda timeout is 15 min when invoked by Step Functions. |
| 5 | **Lambda concurrency** | No reserved concurrency | Reserved concurrency = 5 for chain-ops | Caps throughput at 0.5 tx/s when blockchain handles 10-100 tx/s. Nonce management belongs at the application layer, not concurrency layer. |
| 6 | **Nonce management** | Let-it-fail + retry; atomic RDS allocation if needed | Per-wallet SQS queues; DynamoDB lock; nonce pools | Two txs for the same wallet within 10s is near-impossible at fund admin volume. Step Functions retry handles it automatically. |
| 7 | **Event bus** | EventBridge | Direct SNS fan-out; SQS point-to-point | Native archive (365-day replay), rule-based routing, schema registry. Adding a consumer is a routing rule, not a code change. |
| 8 | **Analytics** | S3 + Glue + Athena (from day 1) | Redshift; Snowflake; BigQuery | Serverless, pay-per-query, scales to zero. Glue from day 1 (~$1/month) ensures compliance data doubles as BI. Athena has 1-2s floor — fine for dashboards, not for UI APIs. |
| 9 | **Distributed tracing** | X-Ray (from day 1, toggles only) | Datadog APM; Jaeger; defer to later | One Terraform property per resource, $0 at this volume, cannot retroactively trace past requests. Deep SDK instrumentation added per-Lambda when needed. |
| 10 | **Threat detection** | GuardDuty (from day 1) | Defer to later; manual monitoring | ~$3-15/month, zero code changes, 20 lines Terraform. Does not analyze historical data — every day off is a blind spot. Detects credential compromise, data exfiltration, brute force. |
| 11 | **Compliance archive** | S3 Object Lock WORM (from day 1) | Defer to later; regular S3 | Bucket-level config. Makes audit records tamper-proof from first event. Cannot retroactively lock existing objects. |
| 12 | **Logging** | CloudWatch + EMF | Datadog; ELK/OpenSearch; Splunk | Native AWS integration, zero additional cost for metrics via EMF. Add external tools if needed. |
| 13 | **Secrets** | Secrets Manager | SSM Parameter Store; HashiCorp Vault | Rotation support, audit via CloudTrail, KMS encryption, per-secret IAM policies. |
| 14 | **Architecture style** | Serverless event-driven | Express.js monolith; Fargate microservices | Greenfield startup gets orchestration + monitoring + audit trail from managed services. Zero ops for a small team. Ephemeral Lambda key model superior to long-running process. |

### Upgrade Path

| Trigger | Migration |
|---------|-----------|
| Durable Functions adds exactly-once (est. mid-2027) | Re-evaluate. Lambda handlers stay the same — only orchestration layer changes. |
| Step Functions costs >$500/month (10M+ state transitions) | Evaluate Temporal.io. Code-first, exactly-once, used by JP Morgan/Coinbase/Stripe. |
| Need to leave AWS | Temporal is cloud-agnostic. Lambda handlers portable to any Node.js runtime. EventBridge events → Kafka topics. |

---

## Appendix B: Setup Checklist

### Custom Code

| Deliverable | Estimate | Purpose |
|-------------|----------|---------|
| Structured logger utility (`packages/logger`) | ~50 lines | Consistent JSON logging with `correlationId` across all Lambdas |
| EMF metrics wrapper (`packages/logger`) | ~30 lines | Automatic CloudWatch custom metric emission from log lines |
| Event envelope builder (`packages/events`) | ~40 lines | Utility to construct compliant events with correlation/causation IDs |

### Terraform Configuration

| Resource | Quantity | Purpose |
|----------|----------|---------|
| EventBridge bus + archive | 1 | Central event routing + 365-day archive |
| EventBridge rules | ~15 | Route events to Step Functions, Firehose, Lambda |
| Step Functions state machines | 8+ | Custody, on-chain, lifecycle, admin workflows |
| Lambda functions | ~20 | Webhook handlers, workflow steps, chain-ops (isolated IAM) |
| CloudWatch alarms | ~15-20 | Threshold monitoring for all critical metrics |
| SNS topics | 3 | Alert routing (critical/warning/info) |
| DynamoDB table | 1 | Webhook deduplication (TTL-based) |
| Secrets Manager entries | ~8 | Venue credentials, Haruko token, chain signing key, DB |
| IAM roles | ~12 | Minimal per-Lambda permissions (**chain-ops has dedicated role**) |
| API Gateway routes | 2+ | Venue webhook endpoints |
| CloudTrail | 1 | AWS API audit logging (~$2/month) |
| GuardDuty detector + features | 1 | Threat detection (~$3-15/month) |
| X-Ray | — | One property per Lambda, API Gateway, Step Function |
| Kinesis Firehose | 1 | EventBridge → S3 event streaming |
| Glue Data Catalog | 1 | Table definitions over S3 (~$1/month) |
| S3 buckets | 2 | Event lake + compliance archive (Object Lock WORM) |
| EventBridge Scheduler | 1+ | Reconciliation trigger, dealing cycle automation |

### One-Time Setup

| Task | Details |
|------|---------|
| PagerDuty integration | Connect SNS critical topic to PagerDuty service |
| Slack integration | Connect SNS warning topic to Slack channel webhook |
| Email subscription | Subscribe ops email to SNS info topic |
| Saved Logs Insights queries | Save ~10 queries in CloudWatch console (see Section 5) |
| Venue staging credentials | Obtain API keys for staging environments |
| Cognito MFA enforcement | Enable MFA requirement in Cognito User Pool configuration |
