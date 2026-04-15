# Cognito Auth Migration Design

> Date: 2026-02-24
> Status: Approved — implementation in progress
> Branch: `feature/cognito-setup`

---

## Context

Elysium is replacing Privy with AWS Cognito as the authentication provider across all three platforms:
the investor app (Expo + Next.js), the manager dashboard (Next.js), and future admin tooling.

Privy's core value proposition is embedded wallet management — creating and managing on-chain wallets
on behalf of users. Elysium provisions and controls wallet infrastructure directly, so Privy's primary
capability provides zero value. We were paying for wallet management we don't use. Continuing with
Privy couples our auth layer to an on-chain abstraction service that is architecturally irrelevant.

This migration implements the decisions recorded in ADR-001 (Authentication Architecture):
- **Provider**: AWS Cognito
- **Pool structure**: Option 4 — three independent pools (Investor, Manager, Admin)
- **Client SDK**: `amazon-cognito-identity-js`
- **Server JWT validation**: `aws-jwt-verify`

---

## Design Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Client SDK | `amazon-cognito-identity-js` | Lighter than Amplify (~50KB vs 300KB+), full control over flow |
| Server JWT validation | `aws-jwt-verify` | AWS-official, JWKS-cached, zero external calls after first use |
| Login methods | Email + password (SRP) only | V1 scope; passkeys and social login are per-pool additions later |
| Offline auth | Not implemented | Requirement dropped; requires active network to authenticate |
| Wallet creation trigger | Cognito Post-Confirmation Lambda | Automatic on email verification, no extra client call needed |
| Wallet key path | `/{stage}/wallet/{poolType}/{entityId}` | DB entity UUID, not cognitoSub — survives future auth provider migrations |
| DB identity field | `cognitoSub` | Explicit link to Cognito; renamed from `privyId` |
| Cognito infra | Terraform (`infra/terraform/cognito.tf`) | Alongside existing VPC/RDS Terraform, managed in CI/CD |
| Pool count | 3 (Investor, Manager, Admin) | ADR-001 Option 4: hermetic auth domains per platform |
| IAM for wallet secrets | Terraform inline policy on Lambda execution role | Scoped to `/{stage}/wallet/*` |

---

## Architecture Overview

Three independent Cognito User Pools, each issuing its own JWTs. The Lambda middleware validates any
incoming JWT against the correct pool using `aws-jwt-verify` (pool detected from JWT `iss` claim).
Three separate DB entity types, each identified by `cognitoSub`.

```
┌──────────────┐   ┌──────────────────┐   ┌──────────────────┐
│  Expo / Next │   │ Manager (Next.js) │   │  Admin (Future)  │
│  (Investor)  │   │                  │   │                  │
└──────┬───────┘   └────────┬─────────┘   └────────┬─────────┘
       │                    │                       │
       ▼                    ▼                       ▼
┌──────────────┐   ┌──────────────────┐   ┌──────────────────┐
│ Investor     │   │ Manager Cognito  │   │ Admin Cognito    │
│ Cognito Pool │   │ Pool             │   │ Pool             │
└──────┬───────┘   └────────┬─────────┘   └────────┬─────────┘
       │                    │                       │
       └────────────────────┼───────────────────────┘
                            ▼
              ┌─────────────────────────┐
              │  Lambda API (middleware) │
              │  aws-jwt-verify         │
              │  detect pool from iss   │
              └────────────┬────────────┘
                           ▼
              ┌─────────────────────────┐
              │  PostgreSQL (Prisma)    │
              │  Investor / Manager /   │
              │  Admin entity tables    │
              └─────────────────────────┘
```

---

## Wallet Creation Flow

Wallets are created server-side at signup via a Cognito Post-Confirmation Lambda trigger. The trigger
fires automatically when a user confirms their email address — no additional API call from the client.

```
Client                       Cognito                Post-Confirm Lambda
  │                              │                         │
  ├─ signUp(email, pw) ─────────▶│                         │
  │◀─ user created (unconfirmed) │                         │
  │                              │                         │
  ├─ confirmSignUp(email, code) ─▶│                         │
  │                              ├──── trigger ───────────▶│
  │                              │              determine poolType from userPoolId
  │                              │              DB upsert(cognitoSub, email)
  │                              │              generatePrivateKey() (viem)
  │                              │              store at /{stage}/wallet/{poolType}/{entityId}
  │                              │              update walletAddress on entity
  │◀─ confirmed                  │◀─ success               │
  │                              │                         │
  ├─ signIn(email, pw) ──────────▶│                         │
  │◀─ idToken + refreshToken     │                         │
  │                              │                         │
  ├─ GET /v1/me ────────────────────────────────────────────▶│
  │  Bearer: idToken             │              entity already exists
  │◀─ { investor profile }       │                         │
```

The wallet private key is stored at `/{stage}/wallet/{poolType}/{entityId}` in AWS Secrets Manager.
The wallet address is stored on the entity record (`Investor.walletAddress`, etc.).

---

## Database Schema

Three entity types replace the single `User` model:

```prisma
model Investor {
  id            String    @id @default(uuid())
  cognitoSub    String    @unique   // Cognito user sub claim
  email         String?   @unique
  walletAddress String?             // EOA address, set by Post-Confirmation Lambda
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt
  lastSeenAt    DateTime? @default(now())
}

model Manager {
  id            String    @id @default(uuid())
  cognitoSub    String    @unique
  email         String?   @unique
  walletAddress String?
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt
}

model Admin {
  id            String    @id @default(uuid())
  cognitoSub    String    @unique
  email         String?   @unique
  walletAddress String?
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt
}
```

Migration: rename `User` → `Investor`, rename `privyId` → `cognitoSub`, create `Manager` + `Admin`.

---

## Token Model

Cognito issues three tokens per session:

| Token | Use | Lifetime |
|-------|-----|----------|
| `idToken` | Bearer token for API calls (contains `sub`, `email`, `iss`) | 1 hour |
| `accessToken` | Cognito API operations | 1 hour |
| `refreshToken` | Silent re-auth | 30 days |

**Storage:**
- Expo (native): `refreshToken` in `expo-secure-store` (OS-encrypted); `idToken` in memory
- Next.js (web): `idToken` + `refreshToken` in `sessionStorage` (cleared on tab close)

**Auto-refresh:** `useIdentityToken()` schedules refresh 5 minutes before `idToken` expiry.

---

## packages/auth/ New Structure

```
packages/auth/src/
  index.ts                   ← public exports
  types.ts                   ← AuthUser, AuthState types
  context.tsx                ← AuthProvider, useAuth(), useIdentityToken()
  providers/cognito/
    config.ts                ← CognitoUserPool config from env
    index.tsx                ← signIn, signUp, confirmSignUp, signOut, refreshSession
  storage/
    index.ts                 ← Web: sessionStorage adapter
    index.native.ts          ← Native: expo-secure-store adapter
```

**Deleted:**
- `src/providers/privy/` — all Privy code
- `src/adapters/privy.tsx` — legacy stub
- `src/offline/` — offline auth caching (not needed)

---

## CI/CD: Two-Pass Terraform

The Post-Confirmation Lambda trigger creates a chicken-and-egg problem: Cognito needs the Lambda ARN
to configure the trigger, but the Lambda needs VPC config from Terraform. Solved with two Terraform
passes in the CI workflow:

```
Pass 1: terraform apply (TF_VAR_post_confirmation_lambda_arn="")
  → Creates Cognito pools without trigger
  → Outputs pool IDs + client IDs

Deploy API Lambda (uses Cognito pool IDs from TF outputs)

Pass 2: terraform apply (TF_VAR_post_confirmation_lambda_arn=<real ARN>)
  → Attaches post-confirmation trigger to all three pools
  → Creates lambda:InvokeFunction permissions
```

---

## Environment Variables

**Removed:**
- `PRIVY_APP_ID`, `PRIVY_APP_SECRET`, `PRIVY_VERIFICATION_KEY` (GitHub secrets)
- `PRIVY_CLIENT_ID` (frontend env)

**Added (API, from Terraform outputs):**
- `COGNITO_INVESTOR_USER_POOL_ID`, `COGNITO_INVESTOR_CLIENT_ID`
- `COGNITO_MANAGER_USER_POOL_ID`, `COGNITO_MANAGER_CLIENT_ID`
- `COGNITO_ADMIN_USER_POOL_ID`, `COGNITO_ADMIN_CLIENT_ID`

**Added (frontend, set locally):**
- `COGNITO_USER_POOL_ID` (the investor pool for investor-facing apps)
- `COGNITO_CLIENT_ID`
- `COGNITO_REGION`

---

## Manual Steps (One-Time)

After the implementation is merged and deployed:

1. **Remove GitHub secrets**: `PRIVY_APP_ID`, `PRIVY_VERIFICATION_KEY`, `PRIVY_APP_SECRET`

2. **Verify GitHub repository variables** are still present:
   `TF_BACKEND_BUCKET`, `TF_LOCK_TABLE`, `AWS_REGION`, `PROJECT`, `STAGE`, `VPC_CIDR`, etc.

3. **Update local `.env.local`** (Next.js) and `app.config.js` (Expo) with Cognito values from
   `terraform output` after first deployment:
   ```
   NEXT_PUBLIC_COGNITO_USER_POOL_ID=us-east-1_xxxxx
   NEXT_PUBLIC_COGNITO_CLIENT_ID=xxxxxxxx
   NEXT_PUBLIC_COGNITO_REGION=us-east-1
   ```

4. **Run Prisma migration locally** for development:
   ```bash
   yarn workspace @elysium/api prisma:migrate
   ```

---

## Verification Checklist

- [ ] `terraform plan` shows Cognito pools + IAM policy as new resources (no unexpected changes)
- [ ] Push to `dev` branch → CI completes both Terraform passes without error
- [ ] Sign up new investor → Post-Confirmation Lambda fires (CloudWatch logs confirm)
- [ ] DB: `Investor` table has `cognitoSub` + `walletAddress` populated
- [ ] Secrets Manager: key exists at `/{stage}/wallet/investor/{investorId}`
- [ ] Sign in → `GET /v1/me` → 200 with investor profile
- [ ] Manager-pool JWT rejected on investor endpoint → 403
- [ ] `npx tsc --noEmit` across all packages → no new type errors

---

## References

- [ADR-001: Authentication Architecture](../ADR/001-authentication-architecture.md)
- [ADR-002: Authorization Architecture](../ADR/002-authorization-architecture.md)
- [Implementation Plan](../../.claude/plans/sunny-plotting-whale.md)
