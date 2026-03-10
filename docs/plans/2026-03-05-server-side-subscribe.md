# Server-Side Subscribe Flow — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Complete the subscribe mutation so it signs and submits transactions server-side (via Secrets Manager), creates a `ChainOpLog` DB record per order, and exposes a `chainOp` query for status polling.

**Architecture:** The `subscribe` mutation creates a `ChainOpLog` record (PENDING), fetches the investor's private key from AWS Secrets Manager, calls `writeContract(submitOrder)` on the diamond, and updates the record to IN_PROGRESS+txHash. The `ChainOpLog` schema is identical to `feature/queues` so that future queue migration is a trivial swap. A new `chainOp(operationId)` query lets the frontend poll status.

**Tech Stack:** Prisma (PostgreSQL), Apollo Server 4 (GraphQL), viem, AWS Secrets Manager SDK, vitest

**Design doc:** `docs/plans/2026-03-05-server-side-subscribe-design.md`

---

## Task 1: Add ChainOpLog to Prisma schema + generate migration

**Files:**
- Modify: `services/api/prisma/schema.prisma`

**Step 1: Add enum and model to schema**

Add immediately after the `FundTag` model at line 87:

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

**Step 2: Generate migration**

```bash
cd services/api
yarn prisma migrate dev --name add_chain_op_log
```

Expected: A new migration file created at `services/api/prisma/migrations/<timestamp>_add_chain_op_log/migration.sql`

If running against a local DB, this applies the migration. If no local DB, use `yarn prisma migrate diff` to preview, or skip apply for now — just generating the migration file is sufficient for the plan.

**Step 3: Regenerate Prisma client**

```bash
cd services/api
yarn workspace @elysium/api prisma:generate
```

Expected: `.prisma/client` updated with `chainOpLog` and `ChainOpStatus` types.

**Step 4: Commit**

```bash
git add services/api/prisma/schema.prisma services/api/prisma/migrations/
git commit -m "feat(api): add ChainOpLog model and ChainOpStatus enum"
```

---

## Task 2: Add `signingWallet` lib (Secrets Manager key fetch)

**Files:**
- Create: `services/api/src/lib/signingWallet.ts`
- Create: `services/api/src/lib/__tests__/signingWallet.test.ts`

**Step 1: Write the failing test**

```typescript
// services/api/src/lib/__tests__/signingWallet.test.ts
/// <reference types="vitest" />
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockSend = vi.fn();
const mockGetSecretValueCommand = vi.fn();

vi.mock('@aws-sdk/client-secrets-manager', () => ({
  SecretsManagerClient: vi.fn(() => ({ send: mockSend })),
  GetSecretValueCommand: vi.fn((...args: any[]) => {
    mockGetSecretValueCommand(...args);
    return { args };
  }),
}));

vi.mock('viem', async (importOriginal) => {
  const actual: any = await importOriginal();
  return {
    ...actual,
    createWalletClient: vi.fn(() => ({ type: 'walletClient' })),
    http: vi.fn((url: string) => ({ url })),
  };
});

vi.mock('viem/accounts', () => ({
  privateKeyToAccount: vi.fn(() => ({ address: '0xacc' })),
}));

describe('getSigningWalletClient', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.STAGE = 'test';
    process.env.RPC_URL = 'https://rpc';
  });

  it('fetches key from correct Secrets Manager path', async () => {
    mockSend.mockResolvedValueOnce({ SecretString: '0xprivkey' });
    const { getSigningWalletClient } = await import('../signingWallet');

    await getSigningWalletClient('user-123', 'investor');

    expect(mockGetSecretValueCommand).toHaveBeenCalledWith({ SecretId: '/test/wallet/investor/user-123' });
  });

  it('throws KeyNotFoundError when SecretString is empty', async () => {
    mockSend.mockResolvedValueOnce({ SecretString: undefined });
    const { getSigningWalletClient, KeyNotFoundError } = await import('../signingWallet');

    await expect(getSigningWalletClient('user-999', 'investor')).rejects.toBeInstanceOf(KeyNotFoundError);
  });

  it('returns a walletClient when secret is found', async () => {
    mockSend.mockResolvedValueOnce({ SecretString: '0xprivkey' });
    const { getSigningWalletClient } = await import('../signingWallet');

    const client = await getSigningWalletClient('user-1', 'investor');

    expect(client).toEqual({ type: 'walletClient' });
  });
});
```

**Step 2: Run test to verify it fails**

```bash
cd services/api
yarn vitest run src/lib/__tests__/signingWallet.test.ts
```

Expected: FAIL — `getSigningWalletClient` and `KeyNotFoundError` don't exist yet.

**Step 3: Implement the lib**

```typescript
// services/api/src/lib/signingWallet.ts
import { SecretsManagerClient, GetSecretValueCommand } from '@aws-sdk/client-secrets-manager';
import { createWalletClient, http } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';

export type PrincipalType = 'investor' | 'manager' | 'admin';

export class KeyNotFoundError extends Error {
  constructor(path: string) {
    super(`Signing key not found at Secrets Manager path: ${path}`);
    this.name = 'KeyNotFoundError';
  }
}

function getSecretsClient(): SecretsManagerClient {
  return new SecretsManagerClient({
    region: process.env.AWS_REGION ?? 'eu-west-1',
    ...(process.env.AWS_ENDPOINT_URL ? { endpoint: process.env.AWS_ENDPOINT_URL } : {}),
  });
}

export async function getSigningWalletClient(userId: string, principalType: PrincipalType) {
  const stage = process.env.STAGE ?? 'dev';
  const path = `/${stage}/wallet/${principalType}/${userId}`;

  const result = await getSecretsClient().send(new GetSecretValueCommand({ SecretId: path }));

  if (!result.SecretString) {
    throw new KeyNotFoundError(path);
  }

  const account = privateKeyToAccount(result.SecretString as `0x${string}`);

  return createWalletClient({
    account,
    transport: http(process.env.RPC_URL),
  });
}
```

**Step 4: Run tests to verify they pass**

```bash
cd services/api
yarn vitest run src/lib/__tests__/signingWallet.test.ts
```

Expected: PASS (3 tests).

**Step 5: Commit**

```bash
git add services/api/src/lib/signingWallet.ts services/api/src/lib/__tests__/signingWallet.test.ts
git commit -m "feat(api): add signingWallet lib for Secrets Manager key fetch"
```

---

## Task 3: Rewrite the `subscribe` GraphQL resolver

**Files:**
- Modify: `services/api/src/graphql/resolvers/mutations.ts`
- Create: `services/api/src/graphql/resolvers/__tests__/mutations.test.ts`

**Step 1: Write the failing tests**

```typescript
// services/api/src/graphql/resolvers/__tests__/mutations.test.ts
/// <reference types="vitest" />
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { GraphQLError } from 'graphql';

const KNOWN_UUID = 'aaaabbbb-cccc-dddd-eeee-ffffffffffff';

const mockChainOpLogCreate = vi.fn();
const mockChainOpLogUpdate = vi.fn();
const mockGetSmartAccounts = vi.fn();
const mockGetSigningWalletClient = vi.fn();
const mockWriteContract = vi.fn();
const mockGetViewCallsAddress = vi.fn(() => '0xdiamondproxy');

vi.mock('uuid', () => ({ v4: vi.fn().mockReturnValue(KNOWN_UUID) }));

vi.mock('../../lib/smartAccount', () => ({
  getSmartAccounts: mockGetSmartAccounts,
}));

vi.mock('../../lib/signingWallet', () => ({
  getSigningWalletClient: mockGetSigningWalletClient,
  KeyNotFoundError: class KeyNotFoundError extends Error {},
}));

vi.mock('../../lib/viemClient', () => ({
  getViewCallsAddress: mockGetViewCallsAddress,
}));

const mockPrisma = {
  chainOpLog: {
    create: mockChainOpLogCreate,
    update: mockChainOpLogUpdate,
  },
};

const baseCtx = {
  userId: 'user-123',
  walletAddress: '0xwallet',
  platformAccessType: 'investor',
  prisma: mockPrisma,
} as any;

const baseInput = {
  fundId: 'fund-42',
  orderRequest: {
    requestType: 1,
    subscribeParams: {
      tokenId: '12345',
      amount: '1000000000000000000',
      minPrice: '0',
      maxPrice: '0',
      dueDate: 0,
      isTargetAmount: false,
      noPartialFill: false,
    },
  },
};

describe('subscribe mutation resolver', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetSmartAccounts.mockResolvedValue(['0xsmartaccount']);
    mockWriteContract.mockResolvedValue('0xtxhash');
    mockGetSigningWalletClient.mockResolvedValue({ writeContract: mockWriteContract });
    mockChainOpLogCreate.mockResolvedValue(undefined);
    mockChainOpLogUpdate.mockResolvedValue(undefined);
  });

  it('throws UNAUTHENTICATED when userId is missing', async () => {
    const { mutationResolvers } = await import('../mutations');
    const ctx = { ...baseCtx, userId: '' };

    await expect(
      mutationResolvers.Mutation.subscribe({}, { input: baseInput }, ctx),
    ).rejects.toMatchObject({ extensions: { code: 'UNAUTHENTICATED' } });
  });

  it('throws UNAUTHENTICATED when walletAddress is missing', async () => {
    const { mutationResolvers } = await import('../mutations');
    const ctx = { ...baseCtx, walletAddress: null };

    await expect(
      mutationResolvers.Mutation.subscribe({}, { input: baseInput }, ctx),
    ).rejects.toMatchObject({ extensions: { code: 'UNAUTHENTICATED' } });
  });

  it('creates ChainOpLog with PENDING status before submitting', async () => {
    const { mutationResolvers } = await import('../mutations');

    await mutationResolvers.Mutation.subscribe({}, { input: baseInput }, baseCtx);

    expect(mockChainOpLogCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        operationId: KNOWN_UUID,
        operationType: 'SUBMIT_ORDER',
        fundId: 'fund-42',
        requestedBy: 'user-123',
        principalType: 'investor',
        status: 'PENDING',
        payload: baseInput.orderRequest,
      }),
    });
  });

  it('fetches signing wallet with userId and principalType', async () => {
    const { mutationResolvers } = await import('../mutations');

    await mutationResolvers.Mutation.subscribe({}, { input: baseInput }, baseCtx);

    expect(mockGetSigningWalletClient).toHaveBeenCalledWith('user-123', 'investor');
  });

  it('calls writeContract with diamond address, accountAddress, and orderRequest', async () => {
    const { mutationResolvers } = await import('../mutations');

    await mutationResolvers.Mutation.subscribe({}, { input: baseInput }, baseCtx);

    expect(mockWriteContract).toHaveBeenCalledWith(
      expect.objectContaining({
        address: '0xdiamondproxy',
        functionName: 'submitOrder',
        args: ['0xsmartaccount', expect.objectContaining({ requestType: 1 })],
      }),
    );
  });

  it('updates ChainOpLog to IN_PROGRESS with txHash on success', async () => {
    const { mutationResolvers } = await import('../mutations');

    await mutationResolvers.Mutation.subscribe({}, { input: baseInput }, baseCtx);

    expect(mockChainOpLogUpdate).toHaveBeenCalledWith({
      where: { operationId: KNOWN_UUID },
      data: expect.objectContaining({ status: 'IN_PROGRESS', txHash: '0xtxhash' }),
    });
  });

  it('returns operationId, status IN_PROGRESS, and txHash', async () => {
    const { mutationResolvers } = await import('../mutations');

    const result = await mutationResolvers.Mutation.subscribe({}, { input: baseInput }, baseCtx);

    expect(result).toEqual({
      operationId: KNOWN_UUID,
      status: 'IN_PROGRESS',
      txHash: '0xtxhash',
    });
  });

  it('updates ChainOpLog to FAILED and throws when writeContract fails', async () => {
    const { mutationResolvers } = await import('../mutations');
    mockWriteContract.mockRejectedValueOnce(new Error('revert: not eligible'));

    await expect(
      mutationResolvers.Mutation.subscribe({}, { input: baseInput }, baseCtx),
    ).rejects.toBeInstanceOf(GraphQLError);

    expect(mockChainOpLogUpdate).toHaveBeenCalledWith({
      where: { operationId: KNOWN_UUID },
      data: expect.objectContaining({ status: 'FAILED', errorMessage: 'revert: not eligible' }),
    });
  });

  it('updates ChainOpLog to FAILED when wallet key not found', async () => {
    const { mutationResolvers } = await import('../mutations');
    mockGetSigningWalletClient.mockRejectedValueOnce(new Error('Key not found'));

    await expect(
      mutationResolvers.Mutation.subscribe({}, { input: baseInput }, baseCtx),
    ).rejects.toBeInstanceOf(GraphQLError);

    expect(mockChainOpLogUpdate).toHaveBeenCalledWith({
      where: { operationId: KNOWN_UUID },
      data: expect.objectContaining({ status: 'FAILED' }),
    });
  });
});
```

**Step 2: Run tests to verify they fail**

```bash
cd services/api
yarn vitest run src/graphql/resolvers/__tests__/mutations.test.ts
```

Expected: FAIL — `subscribe` resolver has old shape.

**Step 3: Rewrite the subscribe resolver in `mutations.ts`**

Replace the existing `subscribe` resolver with the following (keep `encodeSubmitOrder` untouched):

```typescript
import { IDiamondProxyABI } from '@elysium/abi';
import { encodeFunctionData } from 'viem';
import { GraphQLError } from 'graphql';
import { v4 as uuidv4 } from 'uuid';
import { getSmartAccounts } from '../../lib/smartAccount';
import { getSigningWalletClient, type PrincipalType } from '../../lib/signingWallet';
import { getViewCallsAddress } from '../../lib/viemClient';
import type { GraphQLContext } from '../context';

interface OrderParamsInput {
  tokenId: string;
  amount: string;
  minPrice: string;
  maxPrice: string;
  dueDate: number;
  isTargetAmount: boolean;
  noPartialFill: boolean;
}

interface OrderRequestInput {
  requestType: number;
  subscribeParams?: OrderParamsInput;
  redeemParams?: OrderParamsInput;
}

const EMPTY_ORDER_PARAMS = {
  tokenId: 0n,
  amount: 0n,
  minPrice: 0n,
  maxPrice: 0n,
  dueDate: 0,
  isTargetAmount: false,
  noPartialFill: false,
};

function toOrderParams(params?: OrderParamsInput) {
  if (!params) return EMPTY_ORDER_PARAMS;
  return {
    tokenId: BigInt(params.tokenId),
    amount: BigInt(params.amount),
    minPrice: BigInt(params.minPrice),
    maxPrice: BigInt(params.maxPrice),
    dueDate: params.dueDate,
    isTargetAmount: params.isTargetAmount,
    noPartialFill: params.noPartialFill,
  };
}

export const mutationResolvers = {
  Mutation: {
    subscribe: async (
      _: unknown,
      args: { input: { fundId: string; orderRequest: OrderRequestInput } },
      ctx: GraphQLContext,
    ) => {
      if (!ctx.userId || !ctx.walletAddress) {
        throw new GraphQLError('Unauthenticated', { extensions: { code: 'UNAUTHENTICATED' } });
      }

      const { fundId, orderRequest } = args.input;
      const operationId = uuidv4();
      const principalType = (ctx.platformAccessType ?? 'investor') as PrincipalType;

      // Resolve the smart account that will own the order on-chain
      let accountAddress: `0x${string}`;
      try {
        const accounts = await getSmartAccounts(ctx.walletAddress);
        if (!accounts[0]) {
          throw new GraphQLError('No smart account found for user', { extensions: { code: 'NOT_FOUND' } });
        }
        accountAddress = accounts[0];
      } catch (err: any) {
        if (err instanceof GraphQLError) throw err;
        throw new GraphQLError('Failed to resolve user accounts', { extensions: { code: 'INTERNAL_SERVER_ERROR' } });
      }

      // Write a durable record before touching chain
      await ctx.prisma.chainOpLog.create({
        data: {
          operationId,
          operationType: 'SUBMIT_ORDER',
          fundId,
          requestedBy: ctx.userId,
          principalType,
          status: 'PENDING',
          payload: orderRequest as object,
        },
      });

      // Fetch signing wallet from Secrets Manager
      let walletClient: Awaited<ReturnType<typeof getSigningWalletClient>>;
      try {
        walletClient = await getSigningWalletClient(ctx.userId, principalType);
      } catch (err: any) {
        await ctx.prisma.chainOpLog.update({
          where: { operationId },
          data: { status: 'FAILED', errorMessage: err?.message ?? 'Failed to retrieve signing key' },
        });
        throw new GraphQLError('Failed to retrieve signing key', { extensions: { code: 'INTERNAL_SERVER_ERROR' } });
      }

      // Submit transaction
      let txHash: string;
      try {
        txHash = await walletClient.writeContract({
          address: getViewCallsAddress(),
          abi: IDiamondProxyABI,
          functionName: 'submitOrder',
          args: [
            accountAddress,
            {
              requestType: orderRequest.requestType,
              subscribeParams: toOrderParams(orderRequest.subscribeParams),
              redeemParams: toOrderParams(orderRequest.redeemParams),
              paymentCashFundTokenId: 0n,
              redeemToCashFundTokenId: 0n,
            },
          ],
        });
      } catch (err: any) {
        const errorMessage = err?.message ?? 'Transaction submission failed';
        await ctx.prisma.chainOpLog.update({
          where: { operationId },
          data: { status: 'FAILED', errorMessage },
        });
        throw new GraphQLError(errorMessage, { extensions: { code: 'INTERNAL_SERVER_ERROR' } });
      }

      await ctx.prisma.chainOpLog.update({
        where: { operationId },
        data: { status: 'IN_PROGRESS', txHash },
      });

      return { operationId, status: 'IN_PROGRESS', txHash };
    },

    encodeSubmitOrder: async (
      // ... keep existing encodeSubmitOrder implementation unchanged
    ),
  },
};
```

Note: copy the existing `encodeSubmitOrder` resolver verbatim from the current file.

**Step 4: Run tests to verify they pass**

```bash
cd services/api
yarn vitest run src/graphql/resolvers/__tests__/mutations.test.ts
```

Expected: PASS (8 tests).

**Step 5: Commit**

```bash
git add services/api/src/graphql/resolvers/mutations.ts services/api/src/graphql/resolvers/__tests__/mutations.test.ts
git commit -m "feat(api): server-side subscribe — sign and submit via Secrets Manager"
```

---

## Task 4: Add `chainOp` query resolver

**Files:**
- Create: `services/api/src/graphql/resolvers/chainOp.ts`
- Create: `services/api/src/graphql/resolvers/__tests__/chainOp.test.ts`

**Step 1: Write failing tests**

```typescript
// services/api/src/graphql/resolvers/__tests__/chainOp.test.ts
/// <reference types="vitest" />
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { GraphQLError } from 'graphql';

const mockChainOpLogFindUnique = vi.fn();

vi.mock('../../lib/prisma', () => ({
  getPrisma: vi.fn().mockResolvedValue({
    chainOpLog: { findUnique: mockChainOpLogFindUnique },
  }),
}));

describe('chainOp query resolver', () => {
  beforeEach(() => vi.clearAllMocks());

  it('throws UNAUTHENTICATED when userId is missing', async () => {
    const { chainOpResolvers } = await import('../chainOp');

    await expect(
      chainOpResolvers.Query.chainOp({}, { operationId: 'op-1' }, { userId: '' } as any),
    ).rejects.toMatchObject({ extensions: { code: 'UNAUTHENTICATED' } });
  });

  it('returns null when record not found', async () => {
    mockChainOpLogFindUnique.mockResolvedValueOnce(null);
    const { chainOpResolvers } = await import('../chainOp');

    const result = await chainOpResolvers.Query.chainOp(
      {}, { operationId: 'op-404' }, { userId: 'user-1' } as any,
    );

    expect(result).toBeNull();
  });

  it('returns null when record.requestedBy !== ctx.userId (ownership check)', async () => {
    mockChainOpLogFindUnique.mockResolvedValueOnce({
      operationId: 'op-1',
      requestedBy: 'other-user',
      createdAt: new Date('2026-01-01T00:00:00.000Z'),
      completedAt: null,
      status: 'PENDING',
    });
    const { chainOpResolvers } = await import('../chainOp');

    const result = await chainOpResolvers.Query.chainOp(
      {}, { operationId: 'op-1' }, { userId: 'user-1' } as any,
    );

    expect(result).toBeNull();
  });

  it('returns record with ISO createdAt when found and owned', async () => {
    const createdAt = new Date('2026-02-15T12:00:00.000Z');
    mockChainOpLogFindUnique.mockResolvedValueOnce({
      operationId: 'op-1',
      requestedBy: 'user-1',
      createdAt,
      completedAt: null,
      status: 'IN_PROGRESS',
    });
    const { chainOpResolvers } = await import('../chainOp');

    const result = await chainOpResolvers.Query.chainOp(
      {}, { operationId: 'op-1' }, { userId: 'user-1' } as any,
    );

    expect(result).not.toBeNull();
    expect(result!.createdAt).toBe(createdAt.toISOString());
    expect(result!.completedAt).toBeNull();
  });

  it('returns completedAt as ISO string when set', async () => {
    const completedAt = new Date('2026-02-16T15:30:00.000Z');
    mockChainOpLogFindUnique.mockResolvedValueOnce({
      operationId: 'op-2',
      requestedBy: 'user-1',
      createdAt: new Date(),
      completedAt,
      status: 'COMPLETED',
    });
    const { chainOpResolvers } = await import('../chainOp');

    const result = await chainOpResolvers.Query.chainOp(
      {}, { operationId: 'op-2' }, { userId: 'user-1' } as any,
    );

    expect(result!.completedAt).toBe(completedAt.toISOString());
  });
});
```

**Step 2: Run tests to verify they fail**

```bash
cd services/api
yarn vitest run src/graphql/resolvers/__tests__/chainOp.test.ts
```

Expected: FAIL — module not found.

**Step 3: Implement chainOp resolver**

```typescript
// services/api/src/graphql/resolvers/chainOp.ts
import { GraphQLError } from 'graphql';
import { getPrisma } from '../../lib/prisma';
import type { GraphQLContext } from '../context';

export const chainOpResolvers = {
  Query: {
    chainOp: async (_: unknown, args: { operationId: string }, ctx: GraphQLContext) => {
      if (!ctx.userId) {
        throw new GraphQLError('Unauthenticated', { extensions: { code: 'UNAUTHENTICATED' } });
      }

      const prisma = await getPrisma();
      const record = await prisma.chainOpLog.findUnique({
        where: { operationId: args.operationId },
      });

      if (!record) return null;
      if (record.requestedBy !== ctx.userId) return null;

      return {
        ...record,
        createdAt: record.createdAt.toISOString(),
        completedAt: record.completedAt?.toISOString() ?? null,
      };
    },
  },
};
```

**Step 4: Run tests to verify they pass**

```bash
cd services/api
yarn vitest run src/graphql/resolvers/__tests__/chainOp.test.ts
```

Expected: PASS (5 tests).

**Step 5: Register in resolvers/index.ts**

In `services/api/src/graphql/resolvers/index.ts`, add:

```typescript
import { chainOpResolvers } from './chainOp';
```

And in the `Query` spread:

```typescript
Query: {
  ...chainOpResolvers.Query,
  // ... existing entries
},
```

**Step 6: Commit**

```bash
git add services/api/src/graphql/resolvers/chainOp.ts services/api/src/graphql/resolvers/__tests__/chainOp.test.ts services/api/src/graphql/resolvers/index.ts
git commit -m "feat(api): add chainOp query resolver with ownership check"
```

---

## Task 5: Update GraphQL schema SDL and typeDefs

**Files:**
- Modify: `services/api/schema.graphql` (lines 52, 356–370)
- Modify: `services/api/src/graphql/typeDefs.ts` (mirrors schema.graphql)

**Step 1: Update schema.graphql**

Make these changes:

1. Add `chainOp` query to the `Query` type (after `transfers`):
```graphql
"""Returns the status of a queued on-chain operation."""
chainOp(operationId: ID!): ChainOpLog
```

2. Update the `subscribe` mutation return type:
```graphql
subscribe(input: SubscribeInput!): SubscribeQueueResult!
```

3. Replace the `SubscribeInput` and `SubscribeResult` block (lines 354–370) with:
```graphql
# ─── Mutations: Subscribe ──────────────────────────────────────────────────────

input SubscribeInput {
  fundId:       String!
  orderRequest: OrderRequestInput!
}

type SubscribeQueueResult {
  operationId: String!
  status:      String!
  txHash:      String
}

# ─── ChainOp ──────────────────────────────────────────────────────────────────

enum ChainOpStatus {
  PENDING
  IN_PROGRESS
  COMPLETED
  FAILED
}

type ChainOpLog {
  operationId:   ID!
  operationType: String!
  fundId:        String!
  requestedBy:   String!
  status:        ChainOpStatus!
  txHash:        String
  errorMessage:  String
  createdAt:     String!
  completedAt:   String
}
```

Note: `OrderRequestInput` and `OrderParamsInput` already exist in schema (shared with `encodeSubmitOrder`). Do not duplicate them.

**Step 2: Sync typeDefs.ts**

`typeDefs.ts` is the in-memory copy of `schema.graphql`. Apply the same changes there — they must be byte-for-byte identical in content (the file comment says "AUTO-GENERATED from schema.graphql"). The fastest way:

```bash
# From repo root:
node -e "
const fs = require('fs');
const schema = fs.readFileSync('services/api/schema.graphql', 'utf8');
const content = '// AUTO-GENERATED from schema.graphql — do not edit manually\nexport const typeDefs = /* GraphQL */ \`\n' + schema + '\`;\n';
fs.writeFileSync('services/api/src/graphql/typeDefs.ts', content);
"
```

Verify the file looks correct after running this.

**Step 3: Run full API typecheck**

```bash
cd services/api && npx tsc --noEmit
```

Expected: No new errors (resolver types should now align with updated schema).

**Step 4: Commit**

```bash
git add services/api/schema.graphql services/api/src/graphql/typeDefs.ts
git commit -m "feat(api): update schema — SubscribeQueueResult, ChainOpLog, chainOp query"
```

---

## Task 6: Update frontend GraphQL operations and run codegen

**Files:**
- Modify: `packages/data/src/graphql/operations/mutations.graphql`
- Modify: `packages/data/src/graphql/operations/queries.graphql`
- Generated: `packages/data/src/graphql/generated/` (after codegen)

**Step 1: Update mutations.graphql**

Replace the `Subscribe` mutation:

```graphql
mutation Subscribe($input: SubscribeInput!) {
  subscribe(input: $input) {
    operationId
    status
    txHash
  }
}

mutation EncodeSubmitOrder($input: EncodeSubmitOrderInput!) {
  encodeSubmitOrder(input: $input) {
    calldata
  }
}
```

**Step 2: Add chainOp query to queries.graphql**

Append to `packages/data/src/graphql/operations/queries.graphql`:

```graphql
query ChainOp($operationId: ID!) {
  chainOp(operationId: $operationId) {
    operationId
    operationType
    fundId
    status
    txHash
    errorMessage
    createdAt
    completedAt
  }
}
```

**Step 3: Run codegen**

```bash
yarn workspace @elysium/data codegen
```

Expected: `packages/data/src/graphql/generated/graphql.ts` and `gql.ts` regenerated with new `SubscribeInput`, `SubscribeQueueResult`, `ChainOpLog`, and `ChainOpDocument`.

**Step 4: Commit**

```bash
git add packages/data/src/graphql/operations/ packages/data/src/graphql/generated/
git commit -m "feat(data): update subscribe mutation + add chainOp query, regenerate types"
```

---

## Task 7: Update useSubscribe frontend hook

**Files:**
- Modify: `packages/app/hooks/domain/subscription/useSubscribe.ts`

**Step 1: Review the current hook**

Read `packages/app/hooks/domain/subscription/useSubscribe.ts` lines 1–102.

Key changes needed:
- Remove `ChainInfoDocument` import and `useChainInfo` usage
- Remove signing stub and all `identityToken`/wallet references
- Replace mutation call to use new `SubscribeDocument` with `{ fundId, orderRequest }` input
- Return `{ operationId, status, txHash }` instead of old shape

**Step 2: Rewrite the hook**

```typescript
// packages/app/hooks/domain/subscription/useSubscribe.ts
'use client';

import { useState, useCallback } from 'react';
import { useApolloClient } from '@apollo/client';
import { SubscribeDocument } from 'app/data';

export interface SubscribeOrderParams {
  tokenId: string;       // ERC-1155 token ID (string, as in Apollo scalar)
  amount: string;
  minPrice: string;
  maxPrice: string;
  dueDate: number;
  isTargetAmount: boolean;
  noPartialFill: boolean;
}

export interface SubscribeParams {
  fundId: string;
  requestType: number;
  subscribeParams: SubscribeOrderParams;
}

export interface SubscribeResult {
  operationId: string;
  status: string;
  txHash?: string | null;
}

export interface UseSubscribeOptions {
  onSuccess?: (data: SubscribeResult) => void;
  onError?: (error: Error) => void;
}

export function useSubscribe(options?: UseSubscribeOptions) {
  const apolloClient = useApolloClient();

  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const mutateAsync = useCallback(async (params: SubscribeParams): Promise<SubscribeResult> => {
    setIsPending(true);
    setError(null);

    try {
      const { data } = await apolloClient.mutate({
        mutation: SubscribeDocument,
        variables: {
          input: {
            fundId: params.fundId,
            orderRequest: {
              requestType: params.requestType,
              subscribeParams: params.subscribeParams,
            },
          },
        },
      });

      const result: SubscribeResult = {
        operationId: data.subscribe.operationId,
        status: data.subscribe.status,
        txHash: data.subscribe.txHash,
      };

      options?.onSuccess?.(result);
      return result;
    } catch (e) {
      const err = e as Error;
      setError(err);
      options?.onError?.(err);
      throw err;
    } finally {
      setIsPending(false);
    }
  }, [apolloClient, options]);

  return {
    mutateAsync,
    isPending,
    isError: !!error,
    error,
  };
}
```

Note: `useChainInfo` export is still useful for other callers — keep it if it exists elsewhere. Remove only from this hook.

**Step 3: Typecheck packages/app**

```bash
npx tsc --noEmit -p packages/app/tsconfig.json
```

Expected: No new errors related to `useSubscribe`.

**Step 4: Commit**

```bash
git add packages/app/hooks/domain/subscription/useSubscribe.ts
git commit -m "feat(app): update useSubscribe — remove client signing, use server-side submit"
```

---

## Task 8: Run all tests and typecheck

**Step 1: Run API tests**

```bash
cd services/api
yarn vitest run
```

Expected: All tests pass. Note that the old `subscribe.test.ts` (REST handler tests) will need updating or deletion since the handler now has a different shape — update assertions to match new schema or remove tests for the REST layer if that endpoint is being deprecated.

**Step 2: Typecheck API**

```bash
cd services/api && npx tsc --noEmit
```

Expected: Clean.

**Step 3: Typecheck packages/data and packages/app**

```bash
npx tsc --noEmit -p packages/data/tsconfig.json
npx tsc --noEmit -p packages/app/tsconfig.json
```

Expected: Clean (or only known pre-existing errors from MEMORY.md).

**Step 4: Fix any issues found, commit**

```bash
git add -p
git commit -m "fix: resolve typecheck issues from server-side subscribe"
```

---

## Queue Migration Reference (not in scope — for future PR)

When `feature/queues` is merged, the only change to `mutations.ts` is:

**Replace** steps 3–6 in the subscribe resolver:
```typescript
// Current (synchronous)
walletClient = await getSigningWalletClient(ctx.userId, principalType);
txHash = await walletClient.writeContract(...);
await ctx.prisma.chainOpLog.update({ status: 'IN_PROGRESS', txHash });
return { operationId, status: 'IN_PROGRESS', txHash };
```

**With** (queue pattern from feature/queues):
```typescript
// Future (queue)
import { publishChainOp } from '../../lib/eventBridge';
import { OperationType } from '@elysium/queue';
await publishChainOp({ operationId, operationType: OperationType.SUBMIT_ORDER, ... });
return { operationId, status: 'PENDING', fundId };
```

The `ChainOpLog` record shape, `chainOp` query, and frontend polling all carry forward unchanged.
