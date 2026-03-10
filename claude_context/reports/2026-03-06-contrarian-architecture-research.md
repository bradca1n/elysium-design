# Contrarian Architecture Research for Fund Administration Platforms

<!-- Created 2026-03-06: Research on alternative architectural opinions for fintech/fund administration -->

## Executive Summary

This report compiles contrarian architectural opinions from experienced practitioners (2024-2026) that challenge the default "event-driven microservices on serverless" stack. The core finding: for an early-stage fund administration platform like Elysium, architectural simplicity is likely more valuable than distributed systems sophistication. The strongest arguments converge on a **modular monolith with database-backed queuing** as the pragmatic starting point, with event sourcing applied selectively (only for compliance-critical audit trails) and serverless used judiciously (not for core transaction processing).

---

## 1. "You Don't Need Event-Driven Architecture"

### The Case Against EDA for Financial Platforms

**Error Handling Becomes the Product.** In choreography-based EDA, there is no centralized mechanism to manage errors, retries, or compensations. Each service must implement its own failure-handling logic. For financial platforms, this means a crashed service could lose track of whether a payment was completed, resulting in double charges or missed transactions. ([Temporal Blog](https://temporal.io/blog/building-resilient-event-driven-architecture-for-finserv-with-temporal))

**Debugging is Archaeology.** Choreography distributes state across services, hiding it in local databases, queues, and event logs. Tracking the status of any business transaction requires understanding many different services and querying data to observe progress, making troubleshooting a single business transaction span dozens of events across multiple services. ([Growin Blog](https://www.growin.com/blog/event-driven-architecture-scale-systems-2025/))

**Eventual Consistency vs. Financial Accuracy.** Services become consistent only after some delay. Goldman Sachs shared how its EDA for trading had to build compensating mechanisms to ensure trades were correctly reflected across services within seconds. For NAV calculation and fund accounting, "eventually consistent" is often unacceptable. ([Journal Article](https://aimjournals.com/index.php/ijmcsit/article/view/448))

**Message Ordering is a Trap.** Event brokers generally preserve order within partitions but not globally. Delivery guarantees are a critical trade-off: at-most-once risks data loss, at-least-once risks duplicates, and exactly-once adds significant cost and complexity. For fund transactions that must process in order, this becomes a constant source of bugs. ([Growin Blog](https://www.growin.com/blog/event-driven-architecture-scale-systems-2025/))

### When Request-Response is Better

- CRUD-heavy fund administration workflows (investor onboarding, document management)
- Operations requiring immediate confirmation (order placement, NAV queries)
- Small team (<10 developers) where the cognitive overhead of async messaging is not justified
- Any workflow where you need to answer "did this succeed?" synchronously

### The Alternative: Orchestration Over Choreography

Temporal (used by 3 of the 5 largest U.S. banks) offers durable execution as an alternative to choreography. Instead of services reacting to events, a central workflow orchestrator manages the process. This gives you: centralized error handling, automatic compensations (SAGA pattern), full visibility into business process state, and eliminates the need for dead-letter queues and poison pill handling. ([Temporal Blog](https://temporal.io/blog/top-engineering-predictions-for-financial-services-in-2025), [FINOS](https://www.finos.org/blog/preventing-payment-failures-temporal))

### Relevance to Elysium

Elysium's order processing pipeline (submit order -> validate -> execute on-chain -> confirm) is a workflow, not an event stream. An orchestration approach (even a simple state machine in the database) would be simpler than EventBridge choreography. Event-driven makes sense for truly decoupled concerns (notifications, analytics), but the core transaction pipeline benefits from explicit orchestration.

---

## 2. "Serverless is Wrong for Fintech"

### The Case Against Lambda for Core Financial Processing

**Cold Starts in Financial Transactions.** Serverless functions experience delays of hundreds of milliseconds or more when not recently invoked, making them unsuitable for time-sensitive financial operations. While "largely solved" for web APIs, cold starts remain problematic for infrequently-triggered but latency-sensitive financial workflows. ([Infravo Blog](https://infravo.tech.blog/2025/04/14/serverless-in-2025-benefits-bottlenecks-when-to-avoid-it/), [BuzzClan](https://buzzclan.com/cloud/serverless-computing/))

**Debugging is Fundamentally Harder.** Serverless functions are distributed, ephemeral, and harder to trace than containers. Traditional logging and tracing tools fall short, requiring specialized observability stacks (OpenTelemetry, X-Ray). For financial platforms where you need to trace every transaction end-to-end for audit purposes, this is a real cost. ([Infravo Blog](https://infravo.tech.blog/2025/04/14/serverless-in-2025-benefits-bottlenecks-when-to-avoid-it/))

**Compliance Demands Infrastructure Control.** Financial data is heavily regulated (GDPR, PCI DSS). Serverless necessitates meticulous governance frameworks to ensure security, traceability, and data sovereignty. Certain regulatory requirements demand deeper control over underlying infrastructure that serverless providers may not support. ([ResearchGate](https://www.researchgate.net/publication/392514144_The_Evolution_and_Impact_of_Serverless_Architectures_in_Modern_Fintech_Platforms))

**Vendor Lock-In is Real.** Using AWS Lambda means adopting proprietary frameworks and workflows that are hard to migrate. The true danger is data lock-in -- as data accumulates, it is economically disincentivized to leave by platform pricing. ([HN Discussion](https://news.ycombinator.com/item?id=19080875))

**15-Minute Execution Limit.** Long-running processes like batch NAV calculations, reconciliation runs, or large fund report generation cannot run in Lambda. These require containers or traditional servers. ([Infravo Blog](https://infravo.tech.blog/2025/04/14/serverless-in-2025-benefits-bottlenecks-when-to-avoid-it/))

### The 37signals Counter-Example

DHH and 37signals saved $7M+ annually by moving off AWS entirely to owned hardware. Their compute repatriation cut cloud bills by $2M/year (after $700K in Dell servers), and their storage migration eliminated a $1.5M/year S3 bill. While extreme, it demonstrates that cloud/serverless costs compound and can become the dominant line item. ([The Register](https://www.theregister.com/2025/05/09/37signals_cloud_repatriation_storage_savings/), [Inspectural](https://inspectural.com/blog/dhh-was-right-37signals-analysis/))

### When Containers/Kubernetes Win

- Core transaction processing requiring consistent latency
- Long-running batch processes (NAV calculation, reconciliation)
- Workloads requiring local state or in-memory caching
- Teams needing full observability and step-through debugging
- Compliance scenarios demanding infrastructure audit trails

### Relevance to Elysium

Elysium's current `services/api/` runs on Lambda. For the API layer (investor queries, CRUD operations), this is fine. But the order processor (`services/order-processor/`) interacts with blockchain (variable latency, retries, long-running confirmations) -- this would be better served by a container-based service (ECS/Fargate or even a simple Node.js process) with proper state management.

---

## 3. "Simple Monolith Beats Microservices"

### The Evidence

**The 10-Developer Rule.** Experts have reached consensus that below 10 developers, monoliths perform better. Microservices benefits only appear with larger teams. Docker adds complexity without clear benefits for small teams. ([Foojay](https://foojay.io/today/monolith-vs-microservices-2025/))

**Real Fintech Experience.** A developer who built two fintech marketplaces under tight deadlines chose a monolith "simply because there was no time for anything else" -- one codebase, one deployment, one database on NestJS. It worked. ([Sergei Shekshuev on Medium](https://frombadge.medium.com/microservices-vs-monolith-what-i-learned-building-two-fintech-marketplaces-under-insane-deadlines-fe7a4256b63a))

**Amazon Prime Video's 90% Cost Cut.** Amazon's Video Quality Analysis team moved from distributed serverless microservices (Step Functions + S3) to a single ECS task, cutting infrastructure costs 90%. The key issue: inter-service communication overhead (Tier-1 S3 calls for video frame passing) was eliminated by in-memory data transfer. ([The New Stack](https://thenewstack.io/return-of-the-monolith-amazon-dumps-microservices-for-video-monitoring/), [DEV Community](https://dev.to/indika_wimalasuriya/amazon-prime-videos-90-cost-reduction-throuh-moving-to-monolithic-k4a))

**Coordination Costs Exceed Benefits.** Microservices cannot rely on traditional two-phase commit protocols, requiring compensating transaction patterns. Business logic becomes scattered across multiple services, creating fragile interdependencies. Full end-to-end testing becomes labor-intensive. ([Temporal Blog](https://temporal.io/blog/top-engineering-predictions-for-financial-services-in-2025))

### The Modular Monolith Alternative

The 2024-2025 consensus converges on the **modular monolith** as the pragmatic middle ground:

- Single deployment unit with clearly separated internal modules
- Module boundaries enforced by code (not network calls)
- Can be decomposed into services later when team/traffic justifies it
- Used successfully by Shopify, Root Insurance, and recommended by Google's Service Weaver

**For fintech specifically:** Modular monoliths keep complexity in check while preserving a clear path toward service decomposition. They avoid microservices' inter-service communication overhead, data consistency challenges, and expanded security attack surface. ([HackerNoon](https://hackernoon.com/modular-monoliths-the-future-of-efficient-software-architecture-in-fintech-payment-systems), [Nasscom](https://community.nasscom.in/communities/fintech/microservices-vs-monolith-what-works-best-fintech-apps))

### Relevance to Elysium

Elysium currently has: `services/api/` (Lambda), `services/order-processor/` (separate service), `contracts/` (on-chain), `packages/app/` + `apps/` (frontend). This is already a reasonable separation. The question is whether the API layer should be further split into microservices. The contrarian answer: no. Keep `services/api/` as a modular monolith with clear internal module boundaries (fund management, orders, users, NAV) until the team exceeds 10 developers or specific modules have dramatically different scaling needs.

---

## 4. "Just Use a Database Queue"

### Postgres SKIP LOCKED as Queue

PostgreSQL's `SELECT FOR UPDATE SKIP LOCKED` (since 9.5) enables multiple workers to claim jobs simultaneously without blocking each other or creating race conditions. This pattern has replaced entire RabbitMQ setups, with benchmarks showing p95 latency dropping from 340ms to 210ms. ([Inferable Blog](https://www.inferable.ai/blog/posts/postgres-skip-locked), [Medium](https://medium.com/@the_atomic_architect/postgresql-replaced-my-message-queue-and-taught-me-skip-locked-along-the-way-87d59e5b9525))

### 37signals' Solid Queue: Proof at Scale

37signals replaced Redis/Sidekiq with Solid Queue, a database-backed job queue using `FOR UPDATE SKIP LOCKED`. Production numbers from HEY:

- **5.6 million jobs/day** processed through the database
- **1,300 polling queries/second** with 110 microsecond average query time
- **0.02 rows examined per query** on average
- Supports delayed jobs, concurrency controls, queue pausing, priorities, and cron-style recurring jobs

Their philosophy: "Having everything stored in a relational DB, interfaced by Active Record, has made debugging job-related issues significantly easier." Solid Queue became the default for Rails 8. ([37signals Dev Blog](https://dev.37signals.com/introducing-solid-queue/))

### The Transactional Outbox Pattern

For cases where you need guaranteed event delivery alongside database writes, the transactional outbox pattern writes an event record to an outbox table within the same database transaction as your business data. A separate process reads the outbox and publishes to external systems. This is:

- **Atomic** with your business data (no dual-write problem)
- **Debuggable** (events are in your database, queryable with SQL)
- **Simpler** than EventBridge + SQS + Step Functions
- **Can use Postgres logical replication** for push-based delivery without polling

([microservices.io](https://microservices.io/patterns/data/transactional-outbox.html), [Event-Driven.io](https://event-driven.io/en/push_based_outbox_pattern_with_postgres_logical_replication/))

### PGMQ and Other Tools

PGMQ is a Postgres extension implementing a self-regulating queue with visibility timeouts (similar to SQS semantics). Other tools: PG Boss (Node.js), PGQueuer (Python), Solid Queue (Ruby). The ecosystem is mature and growing. ([Tembo Blog](https://legacy.tembo.io/blog/pgmq-self-regulating-queue/))

### Relevance to Elysium

Elysium's order processor currently appears to be a standalone service. Consider whether EventBridge/SQS is needed, or whether a simple Postgres-backed queue (using the outbox pattern) would suffice. Benefits:

- Orders and queue state in the same transaction (no lost orders)
- Full SQL queryability for debugging and auditing
- No additional AWS services to manage, monitor, or pay for
- Easy to add workers that poll for specific order types

The pattern breaks down at very high throughput (millions of events/second), but fund administration platforms typically process thousands to low millions of transactions per day, well within Postgres queue capabilities.

---

## 5. "Over-Engineering Kills Startups"

### The Carbn Story

A startup founder spent GBP 600/month on enterprise-grade AWS infrastructure (Multi-AZ Aurora cluster, NAT gateways, Bastion hosts, RDS proxy, 900+ lines of CloudFormation YAML) when a GBP 5-20 VPS would have sufficed for their actual traffic. They also created deployment hacks (`sed` scripts to rewrite imports for Lambda compatibility, random hex-named Lambda functions to trick CloudFormation) that consumed engineering time without adding business value. A simple Docker setup (PostgreSQL + Flask + Nginx) at GBP 20-50/month would have been adequate. ([Jacob's Tech Tavern](https://blog.jacobstechtavern.com/p/my-terrible-startup-architecture))

### Event Sourcing Regret

Chris Kiehl's widely-cited "Event Sourcing is Hard" post documents these production problems:

- **Massive upfront engineering costs**: Entire sprints consumed by plumbing code (infrastructure, deployment, message processing, retry logic) instead of application features
- **Coupling, not decoupling**: Services subscribing to raw event streams destroys service boundaries
- **Event fidelity degradation**: As requirements shift, previously "immutable facts" become irrelevant, but rewriting events destroys historical accuracy
- **Materialization lag**: Growing data made it impossible to materialize projections in reasonable time, introducing 404s, stale data, and duplicates
- **Projection maintenance burden**: Each new data view doubled code touching the event stream

His recommendation: "A good old-fashioned history table gets you 80% of the value of event sourcing with far less complexity." ([Chris Kiehl](https://chriskiehl.com/article/event-sourcing-is-hard))

### Real Fintech Event Sourcing: When It Works

A consulting example from a medium-sized fintech trading platform shows event sourcing CAN work when applied selectively:

- Used ONLY for the Transaction-Portfolio Service (compliance/audit requirement)
- NOT applied to all services universally
- Required snapshot-based delta replay to handle performance degradation (50,000 daily events per active account)
- Required correlation IDs and distributed tracing (Jaeger) for debugging
- Schema evolution was a constant challenge

The consultant's advice: "Use event sourcing only where justified -- specifically for compliance-critical data." ([DEV Community](https://dev.to/lukasniessen/event-sourcing-cqrs-and-micro-services-real-fintech-example-from-my-consulting-career-1j9b))

### Oskar Dudycz's "When Not to Use Event Sourcing"

Dudycz (leading Event Sourcing practitioner) recommends "Start Small -- Grow Big": begin with non-critical functionality where failure won't have serious consequences. Common anti-patterns he identifies: "CRUD sourcing" (wrapping CRUD in events for no reason), "Clickbait events" (meaningless event names), and "Passive Aggressive Events" (hiding commands in event names). ([Event-Driven.io](https://event-driven.io/en/when_not_to_use_event_sourcing/), [Kafka Summit London 2024](https://www.confluent.io/events/kafka-summit-london-2024/event-modeling-anti-patterns/))

### Relevance to Elysium

Elysium is pre-revenue with a small team. Every hour spent on infrastructure plumbing is an hour not spent on fund administration features. The contrarian position:

1. **Don't event-source everything.** Event-source ONLY the order/transaction ledger (regulatory requirement). Use simple CRUD + history tables for everything else.
2. **Don't build for 10x scale today.** Build for current needs with clean module boundaries that allow scaling later.
3. **Don't add services prematurely.** Every new service adds deployment complexity, monitoring needs, and failure modes.

---

## 6. Fund Administration Platform Architectures

### How Incumbents Actually Work

**SS&C Technologies** operates primarily through acquisitions (ADVENT, Globe Op, Eze Software). Their technology stack is largely legacy .NET/SQL Server monoliths modernized incrementally. SS&C's fund administration platform processes $72.4T in assets. The architecture is integration-heavy: specialized modules for NAV calculation, investor servicing, compliance, and reporting connected through internal APIs and batch processes -- fundamentally a modular monolith pattern. ([SEC Filing](https://www.sec.gov/Archives/edgar/data/1402436/000095017025050404/2024_annual_report.pdf))

**BNY Mellon** ($57.8T AUC/A) is investing heavily in blockchain/tokenization. Their LiquidityDirect platform, integrated with Goldman Sachs DAP, enables tokenized money market fund subscriptions. They use a "digital transfer agent smart contract using multiple oracle networks to create a unified golden record." BNY's architecture combines traditional fund admin systems with blockchain middleware. ([BNY Newsroom](https://www.bny.com/corporate/global/en/about-us/newsroom/company-news/securitize-launches-tokenized-aaa-clo-fund-with-services-provided-by-bny-bringing-institutional-structured-credit-on-chain.html), [Goldman Sachs](https://www.goldmansachs.com/pressroom/press-releases/2025/bny-goldman-sachs-launch-tokenized-money-market-funds-solution))

**Apex Group** uses a platform called "Nexus" for fund administration. They recently acquired "Flow" for private markets. Their modernization approach: Windows 365 for employee access (40% cost savings), modular platform with API-first design. Architecture appears to be traditional enterprise with modern integration layers. ([Apex Group](https://www.apexgroup.com/technology-platforms/nexus-fund-administration-platform/))

### Modern Tokenization Architecture Layers

From the Growth Turbine analysis of tokenization infrastructure:

1. **Token Design Layer** -- ERC-20 (fungible shares), ERC-721 (unique positions), hybrid models
2. **Metadata & Compliance Layer** -- Legal identifiers, economic structures, provenance records
3. **Ledger Layer** -- Public chains (Ethereum, L2s) vs. permissioned (Hyperledger, Corda)
4. **Oracle & Verification Layer** -- Data oracles (NAV feeds), attestation oracles (KYC), proof-of-reserve oracles
5. **Smart Contract Layer** -- Transfer restrictions, role-based permissions, on-chain cap tables
6. **Custody & Settlement Layer** -- Institutional custody with tokenized proof

Key insight: Multi-oracle models combining several oracle types minimize single points of failure. MAS published an Operational Guide for Tokenized Funds (November 2025) providing a shared framework for governance and NAV calculation. ([Growth Turbine](https://www.growthturbine.com/blogs/technology-architecture-of-tokenization-infrastructure), [Tokeny](https://tokeny.com/how-tokenys-platform-empowers-fund-administrators-to-act-in-onchain-finance/))

### NAV Fund Services (Modern Competitor)

NAV Fund Services rolled out scripting support for multicurrency and tokenized funds, weighted-average ROR calculations, expense reallocation, and financial statement validation. Their API Gateway handles 80M+ requests in 2025. Architecture: API-first with data warehouse integration. ([NAV Fund Services](https://www.navfundservices.com/articles/technology-development-focused-on-client-features-workflow-upgrades-in-2025))

### Relevance to Elysium

The incumbents' architectures are fundamentally simpler than what startups often build. SS&C runs on modular monoliths connected by internal APIs. BNY adds blockchain as a layer on top of traditional systems. Nobody is running event-sourced, CQRS, microservices architectures for core fund accounting.

Elysium's differentiator (smart contracts as the source of truth) is already architectural innovation. The off-chain services supporting those contracts (API, order processing, user management) don't need additional architectural complexity. A boring, well-tested stack is the correct companion to on-chain innovation.

---

## Synthesis: Recommendations for Elysium

### What the Contrarians Agree On

| Principle | Implication for Elysium |
|-----------|------------------------|
| Start with a monolith, split later | Keep `services/api/` as one deployable unit with internal modules |
| Database queues beat message brokers at small scale | Consider Postgres outbox pattern for order processing instead of EventBridge |
| Event source only what regulations require | Event-source the transaction ledger; CRUD + history tables for everything else |
| Orchestration beats choreography for financial workflows | Use explicit workflow orchestration (state machine or Temporal) for order processing |
| Serverless is fine for APIs, wrong for core processing | Keep API on Lambda; move order processor to containers |
| Observability is more important than architecture | Invest in tracing, structured logging, and monitoring before adding architectural complexity |
| The incumbents use boring technology | SS&C and BNY run on modular monoliths with integration layers; follow their lead for off-chain services |

### Suggested Architecture Evolution

```
Current:                          Proposed Simplification:

Lambda API (services/api/)   -->  Lambda API (keep, it works for CRUD)
  + EventBridge                     + Postgres transactional outbox
  + SQS                             + Simple state machine for order workflow
  + Step Functions

Order Processor (standalone) -->  Order Processor (ECS/Fargate container)
                                    + Direct DB access for queue
                                    + Explicit workflow states

Smart Contracts (on-chain)   -->  Smart Contracts (unchanged -- this IS the innovation)
```

### Key Takeaway

"The best architecture is the simplest one that meets your requirements today while maintaining clean boundaries for tomorrow." The on-chain smart contracts are where Elysium's architectural innovation lives. Everything off-chain should be as boring and reliable as possible.
