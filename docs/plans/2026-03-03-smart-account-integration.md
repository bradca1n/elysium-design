# Smart Account Integration Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Wire the diamond's on-chain smart account system into the API — create accounts on user confirmation and resolve them for all on-chain view calls.

**Architecture:** On `postConfirmation` the Lambda signs a `createAccount` call using a platform service wallet loaded from Secrets Manager. All view calls (REST + GraphQL) first resolve the user's smart account address via `getAccounts(walletAddress)` on-chain, then pass that address to the contract. `/me` returns the full `smartAccounts` array.

**Tech Stack:** viem (wallet client for signing), @aws-sdk/client-secrets-manager, Prisma (no schema changes), vitest for tests.

---

### Task 1: Create smart account in `postConfirmation`

**Files:**
- Modify: `services/api/src/handlers/cognito/postConfirmation.ts`
- Modify: `services/api/src/handlers/cognito/__tests__/postConfirmation.test.ts`

**New env vars (also add to `serverless.yml` under the handler's environment):**
- `PLATFORM_WALLET_SECRET_ARN` — ARN of the Secrets Manager secret holding the platform wallet private key

**Background:** `createAccount(adminAccountAddress, owner, name, accountType, eligibility)` is on the diamond proxy (same address as `VIEW_CALLS_ADDRESS`). `accountType`: investor=1, manager=2, admin=3. All eligibility fields default to false. This should only run for new entities (`isNewEntity === true`), same guard as the wallet key secret.

---

**Step 1: Add failing tests for smart account creation**

In `postConfirmation.test.ts`, add mocks for `viemClient` at the top of the existing mock block:

```typescript
// Add to existing mocks at top of file
const mockWriteContract = vi.fn().mockResolvedValue('0xtxhash');

vi.mock('../../../lib/viemClient', () => ({
  getViewCallsAddress: vi.fn().mockReturnValue('0xDiamondAddress'),
  createNewWalletClient: vi.fn().mockReturnValue({
    writeContract: mockWriteContract,
  }),
}));
```

Add `GetSecretValueCommand` to the existing Secrets Manager mock:

```typescript
// In the existing vi.mock('@aws-sdk/client-secrets-manager', ...) block, extend it:
GetSecretValueCommand: vi.fn().mockImplementation((input: unknown) => ({ input })),
```

Update `mockSecretsManagerSend` to handle both get (returns private key) and create calls:

```typescript
mockSecretsManagerSend.mockImplementation((cmd: any) => {
  if (cmd.input?.SecretId) return Promise.resolve({ SecretString: '0xplatformkey' });
  return Promise.resolve({});
});
```

Add to `beforeEach`:

```typescript
process.env.PLATFORM_WALLET_SECRET_ARN = 'arn:aws:secretsmanager:eu-west-1:123:secret:platform';
```

Add new test case after the existing "creates investor entity" test:

```typescript
it('calls createAccount on diamond for new investor', async () => {
  mockInvestorFindUnique.mockResolvedValueOnce(null);
  mockInvestorUpsert.mockResolvedValueOnce({
    id: 'uuid-1',
    cognitoSub: 'sub-1',
    email: 'test@example.com',
    walletAddress: '0xGeneratedAddress',
  });

  const { handler } = await import('../postConfirmation');
  const event = buildEvent({ userPoolId: 'investor-pool-id', userName: 'sub-1' });
  await handler(event, {} as any, () => {});

  expect(mockWriteContract).toHaveBeenCalledWith(
    expect.objectContaining({
      functionName: 'createAccount',
      args: [
        '0xAdminAccount',
        '0xGeneratedAddress',
        'sub-1',
        1,
        expect.objectContaining({ updateKYC: false }),
      ],
    }),
  );
});

it('skips createAccount on re-trigger (entity already exists)', async () => {
  mockInvestorFindUnique.mockResolvedValueOnce({ id: 'uuid-2' });
  mockInvestorUpsert.mockResolvedValueOnce({ id: 'uuid-2', cognitoSub: 'sub-2', email: null, walletAddress: '0xexisting' });

  const { handler } = await import('../postConfirmation');
  await handler(buildEvent({ userPoolId: 'investor-pool-id', userName: 'sub-2' }), {} as any, () => {});

  expect(mockWriteContract).not.toHaveBeenCalled();
});

it('uses accountType=2 for manager pool', async () => {
  mockManagerFindUnique.mockResolvedValueOnce(null);
  mockManagerUpsert.mockResolvedValueOnce({ id: 'uuid-3', cognitoSub: 'mgr-1', email: null, walletAddress: '0xGeneratedAddress' });

  const { handler } = await import('../postConfirmation');
  await handler(buildEvent({ userPoolId: 'manager-pool-id', userName: 'mgr-1' }), {} as any, () => {});

  expect(mockWriteContract).toHaveBeenCalledWith(
    expect.objectContaining({ args: expect.arrayContaining(['0xAdminAccount', '0xGeneratedAddress', 'mgr-1', 2]) }),
  );
});

it('does not throw if createAccount fails (fire-and-forget)', async () => {
  mockInvestorFindUnique.mockResolvedValueOnce(null);
  mockInvestorUpsert.mockResolvedValueOnce({ id: 'uuid-5', cognitoSub: 'sub-5', email: null, walletAddress: '0xGeneratedAddress' });
  mockWriteContract.mockRejectedValueOnce(new Error('revert'));

  const { handler } = await import('../postConfirmation');
  const event = buildEvent({ userPoolId: 'investor-pool-id', userName: 'sub-5' });
  await expect(handler(event, {} as any, () => {})).resolves.toBe(event);
});
```

**Step 2: Run tests to verify they fail**

```bash
cd services/api && npx vitest run src/handlers/cognito/__tests__/postConfirmation.test.ts
```

Expected: new tests fail — `createNewWalletClient` not imported / `writeContract` not called.

**Step 3: Implement the changes in `postConfirmation.ts`**

Add imports at the top:

```typescript
import {
  SecretsManagerClient,
  CreateSecretCommand,
  GetSecretValueCommand,
  SecretsManagerServiceException,
} from '@aws-sdk/client-secrets-manager';
import { createNewWalletClient, getViewCallsAddress } from '../../lib/viemClient';
import { IDiamondProxyABI } from '@elysium/abi';
```

Add the `accountType` map and helper after the `getPoolType` function:

```typescript
const ACCOUNT_TYPE: Record<PoolType, number> = { investor: 1, manager: 2, admin: 3 };

const EMPTY_ELIGIBILITY = {
  updateKYC: false,
  kycVerified: false,
  updateAccredited: false,
  accreditedInvestor: false,
  updateQualifiedPurchaser: false,
  qualifiedPurchaser: false,
  updateJurisdiction: false,
  jurisdiction: '0x0000' as `0x${string}`,
  updateInvestorType: false,
  investorType: 0,
  updateTags: false,
  tags: [] as `0x${string}`[],
};
```

Replace the `if (isNewEntity)` block (currently only creates the wallet key secret) with:

```typescript
if (isNewEntity) {
  const secretName = `/${process.env.STAGE}/wallet/${poolType}/${entityId}`;
  try {
    await secretsManager.send(
      new CreateSecretCommand({ Name: secretName, SecretString: privateKey }),
    );
  } catch (err: unknown) {
    const smErr = err as SecretsManagerServiceException;
    if (smErr.name !== 'ResourceExistsException') {
      throw err;
    }
  }

  // Create on-chain smart account (fire-and-forget)
  try {
    const platformSecretResult = await secretsManager.send(
      new GetSecretValueCommand({ SecretId: process.env.PLATFORM_WALLET_SECRET_ARN }),
    );
    const platformPrivateKey = platformSecretResult.SecretString as `0x${string}`;
    const platformAccount = privateKeyToAccount(platformPrivateKey);
    const walletClient = createNewWalletClient({ account: platformAccount });

    await walletClient.writeContract({
      address: getViewCallsAddress(),
      abi: IDiamondProxyABI,
      functionName: 'createAccount',
      args: [
        platformAccount.address,
        account.address,
        cognitoSub,
        ACCOUNT_TYPE[poolType],
        EMPTY_ELIGIBILITY,
      ],
      chain: null,
    });
  } catch (err: unknown) {
    console.error('[postConfirmation] createAccount failed:', err);
    // Non-fatal: Cognito user is already confirmed. Account can be created later.
  }
}
```

**Step 4: Run tests to verify they pass**

```bash
cd services/api && npx vitest run src/handlers/cognito/__tests__/postConfirmation.test.ts
```

Expected: all tests pass.

**Step 5: Typecheck**

```bash
cd services/api && npx tsc --noEmit
```

Expected: no new errors.

**Step 6: Commit**

```bash
git add services/api/src/handlers/cognito/postConfirmation.ts \
        services/api/src/handlers/cognito/__tests__/postConfirmation.test.ts
git commit -m "feat: create on-chain smart account on user post-confirmation"
```

---

### Task 2: Add `smartAccounts` to `/me` (REST + GraphQL)

**Files:**
- Modify: `services/api/src/handlers/me/index.ts`
- Modify: `services/api/src/graphql/resolvers/user.ts`
- Modify: `services/api/src/graphql/typeDefs.ts`

**Background:** `getAccounts(walletAddress)` is a read-only call on the diamond (same `VIEW_CALLS_ADDRESS`). Returns `address[]`. If `walletAddress` is null (edge case before confirmation), return `[]`.

---

**Step 1: Write failing test for REST `/me`**

In `services/api/src/handlers/me/__tests__/me.test.ts`, add a mock for `viemClient` and a test:

```typescript
// Add at top with other mocks
const mockReadContract = vi.fn().mockResolvedValue(['0xSmartAccount1']);

vi.mock('../../../lib/viemClient', () => ({
  getPublicClient: vi.fn().mockReturnValue({ readContract: mockReadContract }),
  getViewCallsAddress: vi.fn().mockReturnValue('0xDiamond'),
}));
```

Add test:

```typescript
it('includes smartAccounts in response', async () => {
  // ... set up existing mock entity ...
  const result = await meHandler(buildEvent({ walletAddress: '0xWallet' }));
  expect(result.body).toContain('"smartAccounts":["0xSmartAccount1"]');
  expect(mockReadContract).toHaveBeenCalledWith(
    expect.objectContaining({ functionName: 'getAccounts', args: ['0xWallet'] }),
  );
});

it('returns empty smartAccounts when walletAddress is null', async () => {
  // ... entity with null walletAddress ...
  const result = await meHandler(buildEvent({ walletAddress: null }));
  expect(result.body).toContain('"smartAccounts":[]');
  expect(mockReadContract).not.toHaveBeenCalled();
});
```

**Step 2: Run to verify failure**

```bash
cd services/api && npx vitest run src/handlers/me/__tests__/me.test.ts
```

Expected: FAIL — `smartAccounts` not in response.

**Step 3: Implement in `handlers/me/index.ts`**

Add imports:

```typescript
import { IDiamondProxyABI } from '@elysium/abi';
import { getPublicClient, getViewCallsAddress } from '../../lib/viemClient';
```

After loading the entity, add account resolution before `successResponse`:

```typescript
let smartAccounts: string[] = [];
if (entity.walletAddress) {
  const publicClient = getPublicClient();
  const accounts = await publicClient.readContract({
    address: getViewCallsAddress(),
    abi: IDiamondProxyABI,
    functionName: 'getAccounts',
    args: [entity.walletAddress as `0x${string}`],
  }) as `0x${string}`[];
  smartAccounts = [...accounts];
}

return successResponse({
  id: entity.id,
  cognitoSub: entity.cognitoSub,
  email: entity.email,
  walletAddress: entity.walletAddress,
  smartAccounts,
  poolType: event.userPoolType,
});
```

**Step 4: Update GraphQL `typeDefs.ts` — add field to `User` type**

In the `User` type block, add `smartAccounts`:

```graphql
type User {
  id: ID!
  cognitoSub: String!
  email: String
  walletAddress: String
  smartAccounts: [String!]!
  poolType: String!
}
```

**Step 5: Implement in `graphql/resolvers/user.ts`**

Add imports at top:

```typescript
import { IDiamondProxyABI } from '@elysium/abi';
import { getPublicClient, getViewCallsAddress } from '../../lib/viemClient';
```

In the `me` resolver, after loading the entity but before `return`, add:

```typescript
let smartAccounts: string[] = [];
if (entity.walletAddress) {
  const publicClient = getPublicClient();
  const accounts = await publicClient.readContract({
    address: getViewCallsAddress(),
    abi: IDiamondProxyABI,
    functionName: 'getAccounts',
    args: [entity.walletAddress as `0x${string}`],
  }) as `0x${string}`[];
  smartAccounts = [...accounts];
}

return {
  id: entity.id,
  cognitoSub: entity.cognitoSub,
  email: entity.email,
  walletAddress: entity.walletAddress,
  smartAccounts,
  poolType,
};
```

**Step 6: Run tests and typecheck**

```bash
cd services/api && npx vitest run src/handlers/me/__tests__/me.test.ts
cd services/api && npx tsc --noEmit
```

Expected: tests pass, no type errors.

**Step 7: Commit**

```bash
git add services/api/src/handlers/me/index.ts \
        services/api/src/handlers/me/__tests__/me.test.ts \
        services/api/src/graphql/resolvers/user.ts \
        services/api/src/graphql/typeDefs.ts
git commit -m "feat: return smartAccounts array on /me endpoint"
```

---

### Task 3: Resolve smart account in GraphQL view resolvers (orders, holdings, events, transfers)

**Files:**
- Modify: `services/api/src/graphql/resolvers/orders.ts`
- Modify: `services/api/src/graphql/resolvers/holdings.ts`
- Modify: `services/api/src/graphql/resolvers/events.ts`
- Modify: `services/api/src/graphql/resolvers/transfers.ts`

**Pattern for every resolver below:**

```typescript
// 1. Resolve smart account
const publicClient = getPublicClient();
const viewCallsAddress = getViewCallsAddress();
const accounts = await publicClient.readContract({
  address: viewCallsAddress,
  abi: IDiamondProxyABI,
  functionName: 'getAccounts',
  args: [ctx.walletAddress as `0x${string}`],
}) as `0x${string}`[];
const accountAddress = accounts[0];
if (!accountAddress) return []; // no smart account yet

// 2. Use accountAddress (not ctx.walletAddress) in the existing readContract call
```

---

**Step 1: Update `graphql/resolvers/orders.ts`**

Replace `ctx.walletAddress as \`0x\${string}\`` in the `getOrders` args with `accountAddress`, after adding the account resolution block above the existing `readContract` call. The `publicClient` and `viewCallsAddress` variables are already declared in that resolver — move the `getAccounts` call to use them before the existing `readContract` call:

```typescript
// After: const publicClient = getPublicClient(); const viewCallsAddress = getViewCallsAddress();
const accounts = await publicClient.readContract({
  address: viewCallsAddress,
  abi: IDiamondProxyABI,
  functionName: 'getAccounts',
  args: [ctx.walletAddress as `0x${string}`],
}) as `0x${string}`[];
const accountAddress = accounts[0];
if (!accountAddress) return [];

// Then in the existing readContract call, replace:
//   ctx.walletAddress as `0x${string}`,
// with:
//   accountAddress,
```

**Step 2: Update `graphql/resolvers/holdings.ts`** — same pattern, `getHoldings` first arg becomes `accountAddress`, return `[]` if no account.

**Step 3: Update `graphql/resolvers/events.ts`** — same pattern, `getPortfolioEvents` arg becomes `accountAddress`, return `[]` if no account.

**Step 4: Update `graphql/resolvers/transfers.ts`** — same pattern, `getTransfers` first arg becomes `accountAddress`, return `[]` if no account.

**Step 5: Typecheck**

```bash
cd services/api && npx tsc --noEmit
```

**Step 6: Commit**

```bash
git add services/api/src/graphql/resolvers/orders.ts \
        services/api/src/graphql/resolvers/holdings.ts \
        services/api/src/graphql/resolvers/events.ts \
        services/api/src/graphql/resolvers/transfers.ts
git commit -m "feat: resolve smart account for orders/holdings/events/transfers view calls"
```

---

### Task 4: Resolve smart account in GraphQL portfolio, funds, and mutations resolvers

**Files:**
- Modify: `services/api/src/graphql/resolvers/portfolio.ts`
- Modify: `services/api/src/graphql/resolvers/funds.ts`
- Modify: `services/api/src/graphql/resolvers/mutations.ts`
- Modify: `services/api/src/services/portfolio.service.ts` (rename param for clarity)
- Modify: `services/api/src/services/historicalPortfolio.service.ts` (rename param for clarity)
- Modify: `services/api/src/services/investableFunds.service.ts` (rename param for clarity)

**Background:** The services (`getPortfolio`, `getRawPortfolio`, `getHistoricalPortfolio`, `getInvestableFunds`, `getFundNAV`) currently accept a `walletAddress` parameter and pass it directly to the contract. Rename the parameter to `accountAddress` throughout to make it clear the caller is responsible for resolution. The services themselves don't change logic.

---

**Step 1: Rename parameter in services (no logic change)**

In `portfolio.service.ts`:
- `getPortfolio(walletAddress: string)` → `getPortfolio(accountAddress: string)`
- `getRawPortfolio(walletAddress: string)` → `getRawPortfolio(accountAddress: string)`
- In both function bodies, replace `walletAddress as \`0x\${string}\`` with `accountAddress as \`0x\${string}\``

In `historicalPortfolio.service.ts`:
- `getHistoricalPortfolio(walletAddress: string, ...)` → `getHistoricalPortfolio(accountAddress: string, ...)`
- Replace all `walletAddress` references in the function body with `accountAddress`

In `investableFunds.service.ts`:
- `getInvestableFunds(userAddress: \`0x\${string}\`)` → `getInvestableFunds(accountAddress: \`0x\${string}\`)`
- `getFundNAV(fundNum: number, userAddress: \`0x\${string}\`)` → `getFundNAV(fundNum: number, accountAddress: \`0x\${string}\`)`
- Replace internal references accordingly

**Step 2: Add account resolution helper to `portfolio.ts` resolver**

Add imports:

```typescript
import { IDiamondProxyABI } from '@elysium/abi';
import { getPublicClient, getViewCallsAddress } from '../../lib/viemClient';
```

Add a local helper at the top of the resolvers object (or inline in each resolver):

```typescript
async function resolveAccount(walletAddress: string): Promise<`0x${string}` | null> {
  const accounts = await getPublicClient().readContract({
    address: getViewCallsAddress(),
    abi: IDiamondProxyABI,
    functionName: 'getAccounts',
    args: [walletAddress as `0x${string}`],
  }) as `0x${string}`[];
  return accounts[0] ?? null;
}
```

In the `portfolio` resolver, replace `getPortfolio(ctx.walletAddress)` with:

```typescript
const accountAddress = await resolveAccount(ctx.walletAddress);
if (!accountAddress) return { totalValue: 0n, totalUnlockedValue: 0n, totalAvailableValue: 0n, blockNumber: 0n, blockTimestamp: 0, timestamp: 0, funds: [] };
return getPortfolio(accountAddress);
```

In the `historicalPortfolio` resolver, replace `getHistoricalPortfolio(ctx.walletAddress, ...)` with:

```typescript
const accountAddress = await resolveAccount(ctx.walletAddress);
if (!accountAddress) return { snapshots: [], latestBlockNumber: 0n, oldestBlockNumber: 0n, hasMore: false };
return getHistoricalPortfolio(accountAddress, parsed.data);
```

**Step 3: Update `funds.ts` resolver**

Add the same `resolveAccount` helper (or import from a shared location if you extract it).

Replace `getRawPortfolio(ctx.walletAddress)` with:

```typescript
const accountAddress = await resolveAccount(ctx.walletAddress);
if (!accountAddress) return [];
const portfolio = await getRawPortfolio(accountAddress);
```

Replace `getInvestableFunds(ctx.walletAddress as \`0x\${string}\`)` with:

```typescript
const accountAddress = await resolveAccount(ctx.walletAddress);
if (!accountAddress) return [];
return getInvestableFunds(accountAddress);
```

Replace `getFundNAV(fundNum, ctx.walletAddress as \`0x\${string}\`)` with:

```typescript
const accountAddress = await resolveAccount(ctx.walletAddress);
if (!accountAddress) return null;
const fund = await getFundNAV(fundNum, accountAddress);
```

**Step 4: Update `mutations.ts` — `encodeSubmitOrder`**

The `submitOrder` ABI function signature is `submitOrder(address accountAddress, OrderRequest)`. The current `encodeFunctionData` call omits the `accountAddress` arg. Fix this:

Add account resolution imports if not already present:

```typescript
import { IDiamondProxyABI } from '@elysium/abi';
import { getPublicClient, getViewCallsAddress } from '../../lib/viemClient';
```

In `encodeSubmitOrder`:

```typescript
const accounts = await getPublicClient().readContract({
  address: getViewCallsAddress(),
  abi: IDiamondProxyABI,
  functionName: 'getAccounts',
  args: [ctx.walletAddress as `0x${string}`],
}) as `0x${string}`[];
const accountAddress = accounts[0];
if (!accountAddress) {
  throw new GraphQLError('No smart account found for user', { extensions: { code: 'NOT_FOUND' } });
}

const calldata = encodeFunctionData({
  abi: IDiamondProxyABI,
  functionName: 'submitOrder',
  args: [
    accountAddress,
    {
      requestType: orderRequest.requestType,
      redeemParams: toOrderParams(orderRequest.redeemParams),
      subscribeParams: toOrderParams(orderRequest.subscribeParams),
    },
  ],
});
```

**Step 5: Typecheck**

```bash
cd services/api && npx tsc --noEmit
```

**Step 6: Commit**

```bash
git add services/api/src/services/portfolio.service.ts \
        services/api/src/services/historicalPortfolio.service.ts \
        services/api/src/services/investableFunds.service.ts \
        services/api/src/graphql/resolvers/portfolio.ts \
        services/api/src/graphql/resolvers/funds.ts \
        services/api/src/graphql/resolvers/mutations.ts
git commit -m "feat: resolve smart account for portfolio/funds/mutations view calls"
```

---

### Task 5: Resolve smart account in REST view handlers

**Files:**
- Modify: `services/api/src/handlers/portfolio/index.ts`
- Modify: `services/api/src/handlers/investable-funds/index.ts`
- Modify: `services/api/src/handlers/holdings/index.ts`
- Modify: `services/api/src/handlers/orders/index.ts`

**Pattern for every REST handler:** After the existing `userAddress` null check, add:

```typescript
const publicClient = getPublicClient();
const viewCallsAddress = getViewCallsAddress();
const accounts = await publicClient.readContract({
  address: viewCallsAddress,
  abi: IDiamondProxyABI,
  functionName: 'getAccounts',
  args: [userAddress as `0x${string}`],
}) as `0x${string}`[];
const accountAddress = accounts[0];
if (!accountAddress) return successResponse(/* empty response appropriate to handler */);
```

Then replace `userAddress` with `accountAddress` in the downstream service call or `readContract` args.

---

**Step 1: Update `handlers/portfolio/index.ts`**

Add imports:

```typescript
import { IDiamondProxyABI } from '@elysium/abi';
import { getPublicClient, getViewCallsAddress } from '../../lib/viemClient';
```

After the `userAddress` check, add account resolution, then replace `getPortfolio(userAddress)` with `getPortfolio(accountAddress)`. Return empty portfolio on no account:

```typescript
const accounts = await getPublicClient().readContract({
  address: getViewCallsAddress(),
  abi: IDiamondProxyABI,
  functionName: 'getAccounts',
  args: [userAddress as `0x${string}`],
}) as `0x${string}`[];
const accountAddress = accounts[0];
if (!accountAddress) {
  return successResponse({ totalValue: 0n, totalUnlockedValue: 0n, totalAvailableValue: 0n, blockNumber: 0n, blockTimestamp: 0, timestamp: 0, funds: [] });
}
return successResponse(await getPortfolio(accountAddress));
```

**Step 2: Update `handlers/investable-funds/index.ts`** — same pattern, empty `[]` on no account.

**Step 3: Update `handlers/holdings/index.ts`** — same pattern, replace `userAddress` in `getHoldings` args with `accountAddress`, empty `[]` on no account.

**Step 4: Update `handlers/orders/index.ts`** — same pattern, replace `userAddress` in `getOrders` args with `accountAddress`, empty `[]` on no account.

**Step 5: Typecheck and run full test suite**

```bash
cd services/api && npx tsc --noEmit
cd services/api && npx vitest run
```

Expected: all tests pass.

**Step 6: Commit**

```bash
git add services/api/src/handlers/portfolio/index.ts \
        services/api/src/handlers/investable-funds/index.ts \
        services/api/src/handlers/holdings/index.ts \
        services/api/src/handlers/orders/index.ts
git commit -m "feat: resolve smart account for REST portfolio/investable-funds/holdings/orders handlers"
```

---

## Implementation Notes

- `getViewCallsAddress()` returns the diamond proxy address — used for both reads and writes
- `chain: null` in `walletClient.writeContract` tells viem to skip chain validation (needed for private chains without a viem chain definition)
- The `resolveAccount` helper pattern is duplicated across resolvers intentionally (YAGNI — no shared helper file needed for now)
- Empty/null returns when no account exists are safe: the user's account creation is async and may not have mined yet
- `getAccounts` returns `readonly \`0x\${string}\`[]` from viem — spread to `string[]` where needed
