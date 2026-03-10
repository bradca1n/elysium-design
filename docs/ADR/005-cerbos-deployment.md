# Cerbos Deployment Architecture

> Date: 2026-02-25
> Status: Approved
> Authors: Engineering

---

## 1. Problem Statement

ADR-002 (Authorization Architecture) decided to use Cerbos PDP as the policy decision point, deployed as an "ECS Fargate sidecar." That decision captured *what* and *why*; this ADR captures *how*: the deployment topology, policy distribution model, availability configuration, and networking within the AWS stack.

The concrete question is: how do Lambda functions running in a private VPC reach a Cerbos instance reliably and at low latency, without introducing an unacceptable operational burden or external dependency?

---

## 2. Context & Constraints

**Background:**

- Lambda functions run in private subnets (`private_a`, `private_b`) inside a VPC provisioned by Terraform
- The existing stack is entirely AWS-managed (Lambda, RDS, Secrets Manager, ECS is available but not yet used)
- Cerbos is a stateless HTTP server; it loads policies at startup and evaluates them in-memory
- Policies are version-controlled YAML files in `cerbos/policies/` — they must be updated on policy change without a full Lambda redeploy
- The local development environment already runs Cerbos via `docker-compose.yml`; the production deployment model should closely mirror local

**Constraints:**

- Cerbos must be reachable from Lambda functions without an internet egress path (security)
- Must fail closed — if Cerbos is unreachable, authorization must deny all access, not fall back permissively
- Policy changes must be deployable without a full API Lambda redeploy (policy-only CI path)
- Terraform-managed (consistent with all other infrastructure in `infra/terraform/`)
- V1 load: <1,000 fund records; Cerbos decision latency target <5ms for `planResources`, <10ms for `checkResources` batch

**Non-Goals:**

- High-availability across AWS regions (single-region is acceptable for V1)
- Lambda extension deployment model (evaluated below; rejected for V1)
- Autoscaling Cerbos beyond a fixed task count (a single Fargate task is sufficient at V1 load)

---

## 3. Options Considered

### Option A: ECS Fargate in the VPC (private subnet) + AWS Cloud Map

Run Cerbos as an ECS Fargate task in `private_a`. Policies are fetched from S3 at startup. Lambda functions resolve the Cerbos endpoint via AWS Cloud Map service discovery (private DNS: `cerbos.local:3592`).

#### Pros

- No EC2 management — AWS manages the container host, OS patching, and restarts
- Stays entirely within the private VPC: no NAT egress, no public exposure, low-latency (sub-millisecond network hops to Lambda)
- Policies stored in S3 and referenced at startup: policy-only deploys work by pushing new YAML to S3 and restarting the task
- Cloud Map provides stable DNS (`cerbos.local`) — Lambda `CERBOS_URL` env var never changes after initial setup
- Flat cost: ~$15–20/month for a `0.25 vCPU / 0.5 GB` Fargate task (well within budget)
- Architecture mirrors local `docker-compose` exactly (same image, same port, same config structure)
- ECS health checks + auto-restart without manual intervention

#### Cons

- Adds a new AWS service (ECS) to the Terraform state — first use of ECS in the project
- Cloud Map adds minor Terraform complexity
- Single task in a single AZ — no multi-AZ redundancy in V1

---

### Option B: EC2 instance in the VPC

Run Cerbos on a dedicated EC2 instance in `private_a`, similar to the existing Avalanche node.

#### Pros

- Same VPC placement as Option A
- Familiar pattern (Avalanche node uses the same approach)

#### Cons

- Requires OS management, patching, and SSH key maintenance
- Instance failure requires manual intervention or custom Auto Recovery configuration
- No built-in restart on process crash
- More expensive than Fargate for a workload that needs guaranteed restart but not persistent storage

---

### Option C: Cerbos Hub (managed SaaS)

Use [Cerbos Hub](https://www.cerbos.dev/cerbos-hub) — Cerbos's hosted control plane. Lambda functions call the Hub HTTPS endpoint. Policies are managed via the Hub UI and synced from git.

#### Pros

- Zero infrastructure to operate
- Policy management UI, audit logs, and branch-based deployments included
- No VPC routing required

#### Cons

- Every authorization call crosses the public internet (~20–50ms latency vs. sub-millisecond VPC-internal)
- External SaaS dependency introduces a new availability risk surface; if Hub is degraded, authorization is degraded
- Per-decision pricing model (opaque at scale); flat cost advantage of self-hosted Cerbos is lost
- Lambda functions must have internet access (NAT gateway) to reach Hub — the existing NAT is already present, but adding a security-sensitive dependency on internet reachability is undesirable

---

### Option D: Lambda Extension (co-located sidecar)

Run Cerbos as a [Lambda extension](https://docs.cerbos.dev/cerbos/latest/deployment/aws_lambda.html), co-located with each Lambda function invocation. Policies are bundled into the extension layer.

#### Pros

- No separate networking — Cerbos runs on `localhost` in the same execution environment
- No Cloud Map or Fargate needed

#### Cons

- Cold start penalty: Cerbos must initialize on every cold Lambda start (adds ~300–500ms)
- Policy updates require a Lambda layer redeploy, which redeploys all Lambda functions — this defeats the "policy-only deploy" constraint
- Memory overhead per Lambda invocation (~100 MB for Cerbos)
- Officially supported by Cerbos but not widely production-tested at the time of this ADR

---

## 4. Decision

> We are deploying Cerbos as an **ECS Fargate task in the private VPC subnet**, with **policies stored in S3** and **AWS Cloud Map service discovery** providing a stable internal DNS name for Lambda functions to resolve.
>
> Infrastructure is managed in Terraform (`infra/terraform/cerbos.tf`).

**Deployment specifics:**

| Component | Value |
|-----------|-------|
| Container image | `ghcr.io/cerbos/cerbos:latest` (pinned by digest in production) |
| vCPU / memory | 0.25 vCPU / 512 MB (Fargate) |
| Subnet | `private_a` (same AZ as Lambda cold-start preference) |
| Port | 3592 (HTTP) |
| Policy source | S3 bucket `${project}-${stage}-cerbos-policies` |
| Service discovery | AWS Cloud Map — `cerbos.${stage}.local:3592` |
| Lambda env var | `CERBOS_URL=http://cerbos.${stage}.local:3592` |
| Health check | `GET /_cerbos/health` — ECS restarts task on failure |
| Task count | 1 (V1) |

---

## 5. Rationale

ECS Fargate is the best fit for three reasons:

**1. VPC-internal networking removes the internet from the authorization path.** Authorization decisions touch every API request. Routing these through the public internet (Option C) adds latency, an external availability dependency, and a larger attack surface. Fargate in a private subnet keeps authorization traffic on the AWS private network, with no internet exposure.

**2. Managed container removes the operational overhead that made EC2 undesirable.** The Avalanche node (EC2) requires SSH key management and manual recovery on crash. Fargate provides automatic restarts via ECS health checks and OS-level management without an SSH footprint. For a stateless workload like Cerbos, Fargate is strictly better than EC2.

**3. S3-backed policies enable policy-only deploys.** A policy change should not require a Lambda redeploy — it should be: push YAML to S3, restart the Fargate task, done. The Lambda extension model (Option D) breaks this constraint because policy updates require rebuilding the Lambda layer. The S3 approach keeps the policy CI path independent of the application CI path.

Cerbos Hub was rejected primarily on latency: a sub-millisecond VPC hop vs. 20–50ms internet round-trip on every API request is unacceptable for a synchronous authorization call in the hot path. The Hub is noted as a revisit condition if operational complexity becomes a constraint (see §9).

---

## 6. Risks & Mitigations

- **Risk: Single Fargate task is a single point of failure**

  If the Cerbos task fails between ECS restart cycles, all authorization calls fail (closed, not open — per the fail-closed constraint in ADR-002).

  **Mitigation:** ECS health check (`/_cerbos/health`) triggers automatic restart within ~30 seconds. Alert on health check failures. V1 availability target is 99.5% — a 30-second restart window is acceptable. Increase task count to 2 (multi-AZ) if SLA tightens.

- **Risk: Cold start on Fargate task restart causes authorization downtime**

  Cerbos takes ~2–5 seconds to start and load policies from S3.

  **Mitigation:** ECS `minimumHealthyPercent: 100` on rolling updates — the old task stays up until the new task passes health checks. For crash-restart (not deploy), the 30-second window applies.

- **Risk: S3 policy fetch fails at Cerbos startup**

  If S3 is unavailable when the task starts, Cerbos has no policies to load and will fail to start.

  **Mitigation:** Cerbos supports a `watchForChanges` polling interval — if S3 is temporarily unavailable, the task retries. For initial startup failure, ECS will restart the task. An S3 bucket policy and VPC endpoint for S3 eliminate the need for NAT egress for policy fetches.

- **Risk: Lambda `CERBOS_URL` env var points to a stale task IP**

  ECS tasks get new private IPs on restart. Hardcoded IPs would break after a task restart.

  **Mitigation:** Cloud Map provides a stable DNS name (`cerbos.${stage}.local`) that always resolves to the current task IP. Lambda functions use the DNS name, not an IP.

- **Risk: Fargate task in a single AZ — AZ failure takes down authorization**

  **Mitigation:** Acceptable for V1. If multi-AZ is required, increase task count to 2 and spread across `private_a` and `private_b`. Noted as a revisit condition.

---

## 7. Impact

- **Teams:** DevOps/infra (new ECS cluster + Fargate task in Terraform). Backend engineering (set `CERBOS_URL` env var in `serverless.yml`, already done in `services/api/src/lib/cerbos.ts`).
- **Systems:** `services/api/src/lib/cerbos.ts` — `CERBOS_URL` env var used by the `@cerbos/http` client. `infra/terraform/` — new `cerbos.tf` module. New S3 bucket for policies. CI/CD — policy deploy step (push to S3, restart task).
- **Users:** No user-visible change. Authorization decisions are transparent.

---

## 8. Success Criteria

- `terraform apply` creates ECS cluster, Fargate task, Cloud Map namespace, and S3 policy bucket without errors
- Lambda functions resolve `cerbos.${stage}.local:3592` and receive `200 OK` from `/_cerbos/health`
- `planResources` round-trip from Lambda: <5ms (measured via CloudWatch Lambda duration delta)
- `checkResources` batch (10 resources × 6 actions): <10ms
- Policy-only deploy: push updated YAML to S3 → ECS task restart → new policy in effect — without any Lambda redeploy
- ECS task auto-restarts on simulated crash within 60 seconds
- Cerbos health check failure triggers CloudWatch alarm

---

## 9. Revisit Conditions

- **Operational complexity of Fargate/ECS becomes a burden** (e.g., team lacks ECS expertise or the task requires frequent manual intervention) → evaluate Cerbos Hub
- **Authorization latency becomes a bottleneck** at higher load → increase Fargate task count, add an internal NLB, or evaluate Cerbos's built-in clustering
- **Multi-AZ availability requirement is formalized** → increase task count to 2, spread across `private_a` and `private_b`
- **Policy change frequency drops to quarterly or less** and operational simplicity is prioritized → evaluate Cerbos Hub as a lower-maintenance alternative
- **Lambda extension cold start penalty decreases** significantly (e.g., Cerbos optimizes startup time to <50ms) → re-evaluate Lambda extension for co-location benefits

---

## 10. References

- [ADR-002: Authorization Architecture](./002-authorization-architecture.md)
- [Cerbos deployment documentation](https://docs.cerbos.dev/cerbos/latest/deployment/)
- [Cerbos AWS Lambda deployment](https://docs.cerbos.dev/cerbos/latest/deployment/aws_lambda.html)
- [AWS Cloud Map service discovery](https://docs.aws.amazon.com/cloud-map/latest/dg/what-is-cloud-map.html)
- [Cerbos Hub](https://www.cerbos.dev/cerbos-hub)
- `infra/terraform/cerbos.tf` (implementation)
- `cerbos/conf.yaml` (local configuration, mirrors production)

---

### One-Sentence Summary

> We deploy Cerbos as an ECS Fargate task in the private VPC subnet with S3-backed policies and Cloud Map DNS, because it keeps authorization traffic off the internet, eliminates EC2 management overhead, and enables policy-only deploys independent of the Lambda release cycle.
