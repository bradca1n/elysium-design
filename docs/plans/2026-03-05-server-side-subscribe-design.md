# Server-Side Subscribe Flow — Design

**Date:** 2026-03-05
**Branch:** feature/add-smartaccounts-me
**Status:** Approved

## Problem

The `subscribe` mutation previously required the client to sign the transaction (Phase 12 stub). With Cognito auth, private keys are stored in AWS Secrets Manager — signing must happen server-side. No DB record was created for orders, making it impossible to show users pending state.

## Goals

1. Complete the subscribe flow with zero client-side signing
2. Create a `ChainOpLog` record per order — identical shape to `feature/queues` so the queue migration is a trivial swap
3. Add a `chainOp(operationId)` query so UIs can poll status
4. Keep `encodeSubmitOrder` for any future use case

## Non-Goals

- EventBridge / SQS queue (future, `feature/queues`)
- Receipt confirmation polling (Lambda timeout constraint; chain-processor handles this)
- Redeem flow (same pattern, separate task)

---

## Architecture

### Flow

```
Client                       API (Lambda)                  Chain
  |                               |                           |
  |-- subscribe(fundId, order) -->|                           |
  |                               |-- getSmartAccounts() ---->|
  |                               |<-- accountAddress --------|
  |                               |                           |
  |                               |-- ChainOpLog.create(PENDING)
  |                               |                           |
  |                               |-- SecretsManager.get(/{stage}/wallet/investor/{userId})
  |                               |                           |
  |                               |-- writeContract(submitOrder, [accountAddress, order]) -->|
  |                               |<-- txHash -------------------------------------------|
  |                               |                           |
  |                               |-- ChainOpLog.update(IN_PROGRESS, txHash)
  |                               |                           |
  |<-- { operationId, status: IN_PROGRESS, txHash } ----------|
```

### Queue Migration Path

When `feature/queues` is merged, steps 3–5 above are replaced with:
```
prisma.chainOpLog.create(PENDING) → publishChainOp(event) → return { operationId, status: PENDING }
```
The `ChainOpLog` schema, GraphQL types, and frontend are unchanged.

---

## Changes

### 1. Prisma Schema (`services/api/prisma/schema.prisma`)

Add:
```prisma
enum ChainOpStatus {
  PENDING
  IN_PROGRESS
  COMPLETED
  FAILED
}

model ChainOpLog {
  operationId   String        @id
  operationType String
  fundId        String
  requestedBy   String
  principalType String
  status        ChainOpStatus @default(PENDING)
  txHash        String?
  errorMessage  String?
  payload       Json
  createdAt     DateTime      @default(now())
  updatedAt     DateTime      @updatedAt
  completedAt   DateTime?
}
```

Migration SQL from `feature/queues:services/api/prisma/migrations/20260227102830_add_chain_op_log/migration.sql` can be ported directly.

### 2. New lib: `services/api/src/lib/walletClient.ts`

Fetch investor private key from Secrets Manager and return a viem `WalletClient`:

```
Secret path: /{stage}/wallet/investor/{userId}
```

Mirrors the implementation in `feature/queues:services/chain-processor/src/lib/walletClient.ts`.

### 3. `subscribe` mutation resolver (`services/api/src/graphql/resolvers/mutations.ts`)

**Input** (matches queues branch shape):
```graphql
input SubscribeInput {
  fundId:       String!
  orderRequest: OrderRequestInput!
}
```

**Return type**:
```graphql
type SubscribeQueueResult {
  operationId: String!
  status:      String!
  txHash:      String
}
```

**Resolver steps:**
1. Guard: `ctx.userId` + `ctx.walletAddress` required
2. `accountAddress = getSmartAccounts(walletAddress)[0]`
3. `operationId = uuidv4()`
4. `prisma.chainOpLog.create({ status: PENDING, operationType: SUBMIT_ORDER, ... })`
5. `walletClient = getWalletClient(userId, 'investor')`
6. `txHash = walletClient.writeContract(submitOrder, [accountAddress, orderRequest])`
7. `prisma.chainOpLog.update({ status: IN_PROGRESS, txHash })`
8. Return `{ operationId, status: 'IN_PROGRESS', txHash }`
9. On failure: `prisma.chainOpLog.update({ status: FAILED, errorMessage })`, throw `GraphQLError`

### 4. New `chainOp` query resolver (`services/api/src/graphql/resolvers/chainOp.ts`)

```graphql
type Query {
  chainOp(operationId: ID!): ChainOpLog
}
```

Ownership check: `chainOpLog.requestedBy === ctx.userId`. Returns `null` if not found or not owned.

### 5. GraphQL schema (`services/api/schema.graphql`)

- Add `ChainOpStatus` enum
- Add `ChainOpLog` type
- Add `chainOp` query
- Replace `SubscribeResult` → `SubscribeQueueResult`
- Update `SubscribeInput` (remove `signedTransaction`, add `fundId` + `orderRequest`)

### 6. Frontend hook (`packages/app/hooks/domain/subscription/useSubscribe.ts`)

- Remove all signing code and `ChainInfoDocument` dependency
- New `subscribe` mutation call: `{ input: { fundId, orderRequest } }`
- Return `{ operationId, status, txHash }` — expose `operationId` for callers to poll

### 7. Frontend codegen

Run `yarn workspace @elysium/data codegen` after schema changes to regenerate types.

---

## Files Touched

| File | Change |
|------|--------|
| `services/api/prisma/schema.prisma` | Add `ChainOpLog` model + `ChainOpStatus` enum |
| `services/api/prisma/migrations/*/migration.sql` | New migration |
| `services/api/src/lib/walletClient.ts` | New — Secrets Manager key fetch |
| `services/api/src/graphql/resolvers/mutations.ts` | Rewrite `subscribe` resolver |
| `services/api/src/graphql/resolvers/chainOp.ts` | New — `chainOp` query resolver |
| `services/api/src/graphql/resolvers/index.ts` | Register `chainOp` resolver |
| `services/api/src/graphql/typeDefs.ts` | Add new types/inputs |
| `services/api/schema.graphql` | Update schema SDL |
| `services/api/src/handlers/subscribe/index.ts` | Remove old REST handler (or leave as dead code for now) |
| `services/api/src/handlers/subscribe/subscribe.schema.ts` | Update/remove `signedTransaction` |
| `packages/app/hooks/domain/subscription/useSubscribe.ts` | Remove signing, update mutation |
| `packages/data/src/graphql/operations/mutations.graphql` | Update `subscribe` mutation |
| `packages/data/src/graphql/generated/` | Regenerated |

---

## Testing

- Unit: `mutations.ts` resolver — mock Secrets Manager, Prisma, viem `writeContract`
- Unit: `chainOp.ts` resolver — ownership check, not-found returns null
- Integration: full subscribe → chainOp poll flow (local docker stack)
