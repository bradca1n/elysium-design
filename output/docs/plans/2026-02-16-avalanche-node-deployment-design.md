# Avalanche Node EC2 Deployment — Design

**Date:** 2026-02-16
**Branch:** `deployAvalancheInstance` → merge to `dev`
**Status:** Approved

---

## Goal

Deploy an Avalanche RPC (non-validating) node inside the existing Elysium VPC to sync with the ApparentCo L1 on Fuji testnet. The node provides an in-VPC RPC endpoint accessible by Lambda, bastion, and any future VPC resource — replacing external AvaCloud RPC calls with a private, low-latency endpoint.

## Architecture

```
┌─── VPC 10.0.0.0/16 ───────────────────────────────┐
│                                                     │
│  public-a (10.0.0.0/24)                           │
│  ┌──────────┐  ┌──────────────┐                    │
│  │ Bastion   │  │ NAT Gateway  │                    │
│  │ t3.micro  │  │ EIP: 34.248  │                    │
│  └──────────┘  └──────┬───────┘                    │
│                        │                            │
│  private-a (10.0.1.0/24)                           │
│  ┌──────────────────┐  ┌─────────┐                 │
│  │ Avalanche Node   │  │ RDS     │                  │
│  │ t3.large         │  │ Postgres│                  │
│  │ IP: 10.0.1.50    │  │         │                  │
│  │ :9650 (RPC)      │  │ :5432   │                  │
│  └────────┬─────────┘  └─────────┘                 │
│           │                                         │
│           │ outbound via NAT → 34.248.253.38        │
│           ↓                                         │
│      AvaCloud validators (8 NodeIDs)                │
└─────────────────────────────────────────────────────┘
```

## Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Subnet | Private (`private-a`) | No inbound P2P needed. Outbound via NAT sufficient for private L1 with 8 known validators |
| Instance type | `t3.large` (2 vCPU, 8GB) | Non-validating RPC node on low-traffic private L1. Burstable for sync periods |
| Storage | 100 GB gp3 | Pruned + state-sync. Expandable live via EBS |
| Private IP | Fixed `10.0.1.50` | Predictable, hardcodeable in configs |
| RPC access | VPC-wide (10.0.0.0/16 on port 9650) | Lambda, bastion, any future VPC resource can reach it |
| Setup automation | Manual via SSM | Docker + node setup done by hand after SSM-ing in. More control for initial setup |
| Key pair | `rf-ely-1` (same as bastion) | Consistency. Not used with SSM but available |

## Cost Estimate

| Resource | Monthly |
|----------|---------|
| t3.large (on-demand) | ~$61 |
| 100 GB gp3 EBS | ~$8 |
| NAT Gateway data (existing) | ~$1-5 |
| **Total** | **~$70-74/month** |

## Terraform Changes

### New resources in `main.tf`:
1. **`aws_security_group.avalanche`** — inbound 9650 from VPC CIDR, inbound all from bastion SG, outbound all
2. **`aws_instance.avalanche`** — t3.large, private-a, fixed IP 10.0.1.50, 100GB gp3, SSM via bastion IAM profile, user_data installs Docker

### New variables in `variables.tf`:
- `avalanche_instance_type` (default: `t3.large`)
- `avalanche_volume_size` (default: `100`)

### New outputs in `outputs.tf`:
- `avalanche_instance_id` — for SSM connect
- `avalanche_private_ip` — for RPC URL construction

### GitHub workflow changes in `deploy-dev.yml`:
- Read and log new Terraform outputs (avalanche_instance_id, avalanche_private_ip)
- No new environment variables needed (defaults handle everything)

## P2P Networking

The node is in a private subnet with outbound-only internet via NAT. This works because:
- AvalancheGo discovers validators via P-chain using `--track-subnets`
- The node **initiates** outbound TCP connections to the 8 AvaCloud validators
- NAT maintains connection tracking — responses flow back through the same mapping
- No inbound P2P needed for a listener/RPC node on a private L1

## Post-Deployment Manual Steps

1. SSM into the instance: `aws ssm start-session --target <id> --profile elysium`
2. Install Docker and docker-compose
3. Copy/clone `avalanche_node` setup (Dockerfile, docker-compose.yml, setup.sh, .env)
4. Run `setup.sh` to build image and start node
5. Get NodeID from logs → send to AvaCloud for allowedNodes whitelist
6. Update docker-compose with `--allowed-nodes` and `--validator-only` flags
7. Restart node and verify sync: `curl http://localhost:9650/ext/health`

## RPC Endpoint (after sync)

```
http://10.0.1.50:9650/ext/bc/{BLOCKCHAIN_ID}/rpc
```

Accessible from any VPC resource (Lambda, bastion, future services).
