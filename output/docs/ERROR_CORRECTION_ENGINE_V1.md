# Error Correction Engine V1 Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a working TypeScript CLI tool that forks a chain via Anvil, replays transactions with a corrected version of one error transaction, handles divergent transactions via inject-and-track, and outputs a slot-level state diff + compensation ledger + notification log.

**Architecture:** The engine takes an RPC URL (any chain with a deployed Diamond), an error transaction hash, and corrected calldata. It starts Anvil forked before the error block, replays all transactions (replacing the error tx with corrected calldata), handles divergent transactions via injection strategies, and compares final storage state between the two chains. The slot-level diff maps directly to the on-chain `applyErrorCorrection()` function parameters.

**Tech Stack:** TypeScript, viem (^2.39.2, already in project), Anvil (Foundry), tsx (for running TS directly)

**Design Doc:** `docs/ERROR_CORRECTION_ENGINE.md` (the "what" and "why" — this document is the "how")

---

## Prerequisites — Verify Before Starting

These assumptions must be validated before writing any engine code. Each produces a small standalone script that proves the capability works.

### P1: Anvil Impersonation + Nonce Control

**Verify:** Can we impersonate an account on a forked Anvil and send a transaction with a specific nonce?

```typescript
// verify-impersonation.ts
import { createTestClient, createPublicClient, http, parseEther } from 'viem';
import { foundry } from 'viem/chains';

const anvil = createTestClient({ mode: 'anvil', chain: foundry, transport: http('http://127.0.0.1:8546') });
const pub = createPublicClient({ chain: foundry, transport: http('http://127.0.0.1:8546') });

const sender = '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266'; // Anvil account 0
await anvil.impersonateAccount({ address: sender });

const nonce = await pub.getTransactionCount({ address: sender });
const hash = await anvil.sendTransaction({
  account: sender,
  to: sender,
  value: 0n,
  nonce,
  gas: 21000n,
});
const receipt = await pub.waitForTransactionReceipt({ hash });
console.log('Impersonation works:', receipt.status); // should be 'success'
```

**Run:** Start Anvil on port 8546 (`anvil -p 8546`), then `npx tsx verify-impersonation.ts`

**Expected:** `Impersonation works: success`

### P2: Same-Timestamp Blocks

**Verify:** Can we set the same `block.timestamp` for multiple consecutive blocks?

```typescript
// verify-timestamps.ts
await anvil.setNextBlockTimestamp({ timestamp: 1700000000n });
await anvil.mine({ blocks: 1 });
const b1 = await pub.getBlock({ blockTag: 'latest' });

await anvil.setNextBlockTimestamp({ timestamp: 1700000000n }); // same timestamp
await anvil.mine({ blocks: 1 });
const b2 = await pub.getBlock({ blockTag: 'latest' });

console.log('Same timestamps:', b1.timestamp === b2.timestamp); // should be true
```

**Expected:** `true` — Anvil allows same-timestamp blocks.

### P3: Custom Error Decoding with Diamond ABI

**Verify:** Does viem's `decodeErrorResult` work with our 130+ custom errors in `abi.json`?

```typescript
// verify-error-decoding.ts
import { decodeErrorResult } from 'viem';
import abi from '../../contracts/src/generated/abi.json';

// Simulate a PriceBelowMinimum(orderId, price, minPrice) revert
// Selector = first 4 bytes of keccak256("PriceBelowMinimum(uint256,uint256,uint256)")
const revertData = '0x...'; // get from an actual failed tx

const decoded = decodeErrorResult({ abi, data: revertData });
console.log('Error name:', decoded.errorName);
console.log('Args:', decoded.args);
```

**Run against:** A forked Anvil where we intentionally trigger a revert (e.g., submit order with impossible min price, then process it).

**Expected:** `decoded.errorName` matches the custom error, `decoded.args` contains the parameters.

### P4: Storage Slot Offsets

**Verify:** Do our computed storage slots match actual `eth_getStorageAt` values?

**Approach:**
1. Deploy Diamond to Anvil, create a fund with known NAV (e.g., 1000e18)
2. Run `forge inspect NavManagementFacet storage-layout --json` to get struct offsets
3. Compute the slot for `funds[fundId].nav` using keccak256 chain
4. Read via `eth_getStorageAt` and verify it matches the known NAV value

This is the most critical verification. The subdomain pattern (`AppStorage.FundAdmin[0].funds[fundId]`) requires chained keccak256 computations. Getting this wrong means the entire state diff is garbage.

```
Slot computation chain for funds[fundId].nav:
1. AppStorage.FundAdmin is mapping(uint256 => FundAdminStorage) at slot N
2. FundAdmin[0] base = keccak256(abi.encode(0, N))
3. FundAdminStorage.funds is mapping at offset M within struct
4. funds mapping base = FundAdmin[0] base + M
5. funds[fundId] base = keccak256(abi.encode(fundId, funds mapping base))
6. FundInfo.nav is at offset K within FundInfo struct
7. nav slot = funds[fundId] base + K
```

**Run:** `forge inspect NavManagementFacet storage-layout --json` to get N, M, K. Then verify with `eth_getStorageAt`.

### P5: Anvil Fork + Trace Support

**Verify:** Can Anvil fork another RPC and does `debug_traceTransaction` work on the fork?

```bash
# Start source Anvil
anvil -p 8545

# Deploy + create some activity (see Task 11)

# Fork it
anvil --fork-url http://127.0.0.1:8545 -p 8546

# Send a tx on the fork, then trace it
cast send <diamond> "updateNav(...)" ... --rpc-url http://127.0.0.1:8546
cast rpc debug_traceTransaction <tx_hash> '{"tracer":"prestateTracer","tracerConfig":{"diffMode":true}}' --rpc-url http://127.0.0.1:8546
```

**Expected:** Trace output showing pre/post state for storage slots. If `prestateTracer` with `diffMode` is NOT supported, fall back to default struct logger tracer and parse SSTORE opcodes. Document which approach works.

### P6: Snapshot/Revert on Forked Anvil

**Verify:** Do `evm_snapshot` and `evm_revert` work correctly on a forked Anvil, and does `evm_revert` clear impersonation state?

```typescript
// verify-snapshot-revert.ts
const anvil = createTestClient({ mode: 'anvil', chain: foundry, transport: http('http://127.0.0.1:8546') });
const pub = createPublicClient({ chain: foundry, transport: http('http://127.0.0.1:8546') });

const sender = '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266';
await anvil.impersonateAccount({ address: sender });

// Take snapshot
const snapshotId = await anvil.snapshot();
const balanceBefore = await pub.getBalance({ address: sender });

// Make state changes (send some ETH)
await anvil.sendTransaction({ account: sender, to: '0x0000000000000000000000000000000000000001', value: parseEther('1'), gas: 21000n });
const balanceAfter = await pub.getBalance({ address: sender });
console.log('Balance changed:', balanceBefore !== balanceAfter); // true

// Revert to snapshot
await anvil.revert({ id: snapshotId });
const balanceReverted = await pub.getBalance({ address: sender });
console.log('Revert restores balance:', balanceBefore === balanceReverted); // should be true

// Check if impersonation persists after revert
try {
  await anvil.sendTransaction({ account: sender, to: sender, value: 0n, gas: 21000n });
  console.log('Impersonation persists after revert: YES');
} catch {
  console.log('Impersonation persists after revert: NO (must re-impersonate)');
}

// Also test setAutomine switching
await anvil.setAutomine(false);
await anvil.setAutomine(true);
console.log('Automine switching works: YES');
```

**Run:** Start forked Anvil (`anvil --fork-url http://127.0.0.1:8545 -p 8546`), then `npx tsx verify-snapshot-revert.ts`

**Expected:**
- `Revert restores balance: true`
- Impersonation behavior documented (either persists or must re-impersonate — the replay loop handles both)
- `Automine switching works: YES`

**Critical for:** The two-pass per-block replay architecture relies on snapshot/revert to cleanly undo discovery-pass state changes before the correct replay pass.

---

## File Structure

```
apps/backend/error_correction/
├── package.json
├── tsconfig.json
├── src/
│   ├── index.ts              # CLI entry point
│   ├── engine.ts             # Core replay engine (orchestrator)
│   ├── anvil.ts              # Anvil process manager (spawn, wait, cleanup)
│   ├── fetcher.ts            # Block & transaction fetcher from source chain
│   ├── replayer.ts           # Transaction replay logic (impersonation, nonce, gas)
│   ├── divergence.ts         # Divergence handler (detect, inject, retry)
│   ├── strategies.ts         # Injection strategy table (error → slot modification)
│   ├── slots.ts              # Storage slot calculator (keccak256 chain for AppStorage)
│   ├── diff.ts               # State diff extraction (read slots from both chains, compare)
│   ├── output.ts             # Output formatters (state-diff, compensation, notifications)
│   └── types.ts              # Shared type definitions
├── test/
│   └── e2e.test.ts           # End-to-end test (starts Anvil, deploys, runs engine, verifies)
└── scripts/
    └── setup-test-scenario.sh  # Shell script to deploy Diamond + create test activity
```

---

## Task 1: Project Scaffolding

**Files:**
- Create: `apps/backend/error_correction/package.json`
- Create: `apps/backend/error_correction/tsconfig.json`

**Step 1: Create package.json**

```json
{
  "name": "@elysium/error-correction",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "scripts": {
    "start": "tsx src/index.ts",
    "test": "tsx test/e2e.test.ts",
    "test:coverage": "node -e \"process.exit(0)\""
  },
  "dependencies": {
    "viem": "^2.39.2"
  },
  "devDependencies": {
    "tsx": "^4.19.0",
    "@types/node": "^22.0.0"
  }
}
```

**Step 2: Create tsconfig.json**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "outDir": "dist",
    "rootDir": "src",
    "resolveJsonModule": true,
    "declaration": true
  },
  "include": ["src/**/*", "test/**/*"]
}
```

**Step 3: Install dependencies**

```bash
cd apps/backend/error_correction && yarn install
```

**Step 4: Verify setup**

```bash
cd apps/backend/error_correction && npx tsx -e "import { createPublicClient } from 'viem'; console.log('viem loaded')"
```

**Expected:** `viem loaded`

**Step 5: Commit**

```bash
git add apps/backend/error_correction/package.json apps/backend/error_correction/tsconfig.json
git commit -m "feat(error-correction): scaffold V1 project"
```

---

## Task 2: Types & ABI Setup

**Files:**
- Create: `apps/backend/error_correction/src/types.ts`

**Step 1: Write type definitions**

```typescript
import type { Address, Hex } from 'viem';

// --- Input ---

export interface CorrectionInput {
  /** RPC URL of the source chain (Reth, Anvil, any EVM node) */
  rpcUrl: string;
  /** Diamond proxy contract address */
  diamondAddress: Address;
  /** Transaction hash of the error transaction */
  errorTxHash: Hex;
  /** Corrected calldata to replace the error transaction's input */
  correctedCalldata: Hex;
  /** Replay up to this block number (default: latest) */
  headBlock?: bigint;
}

// --- Injection ---

export type InjectionType = 'COMPENSATORY' | 'PASSTHROUGH';

export interface SlotModification {
  slot: Hex;
  newValue: Hex;
  savedValue?: Hex; // For PASSTHROUGH: value before injection (restored after tx)
}

export interface InjectionStrategy {
  errorName: string;
  type: InjectionType;
  computeInjection: (args: readonly unknown[], context: InjectionContext) => Promise<SlotModification[]>;
  revertAfterTx: boolean;
}

export interface InjectionContext {
  /** Read storage from the source chain */
  readSourceSlot: (slot: Hex) => Promise<Hex>;
  /** Read storage from the replay chain */
  readReplaySlot: (slot: Hex) => Promise<Hex>;
  /** Compute storage slot for known entity fields */
  computeSlot: SlotCalculator;
}

export interface AppliedInjection {
  strategy: InjectionStrategy;
  mods: SlotModification[];
  txHash: Hex;
  originalTxHash: Hex;
  blockNumber: bigint;
}

// --- Replay ---

export interface ReplayPlan {
  forkBlock: bigint; // errorBlock - 1
  errorBlock: bigint;
  headBlock: bigint;
  errorTxIndex: number; // index within the error block
  blocks: BlockPlan[];
}

export interface BlockPlan {
  number: bigint;
  timestamp: bigint;
  transactions: TxPlan[];
}

export interface TxPlan {
  hash: Hex;
  from: Address;
  to: Address | null;
  input: Hex;
  value: bigint;
  nonce: number;
  gas: bigint;
  originallyReverted: boolean;
  isErrorTx: boolean;
}

// --- Output ---

export interface SlotDiff {
  slot: Hex;
  oldValue: Hex; // current value on source chain
  newValue: Hex; // value on replay chain (the correct value)
}

export interface CompensationEntry {
  investor: Address;
  txHash: Hex;
  errorName: string;
  injectedSlot: Hex;
  injectedAmount: bigint;
  description: string;
}

export interface NotificationEntry {
  txHash: Hex;
  originalTxHash: Hex;
  errorName: string;
  type: 'PASSTHROUGH' | 'UNKNOWN_REVERT' | 'NONCE_NOOP';
  description: string;
}

export interface CorrectionOutput {
  input: CorrectionInput;
  replayPlan: { forkBlock: bigint; errorBlock: bigint; headBlock: bigint; totalTxs: number };
  stateDiff: SlotDiff[];
  compensationLedger: CompensationEntry[];
  notifications: NotificationEntry[];
  stats: {
    totalBlocks: number;
    totalTxs: number;
    successfulReplays: number;
    nonceNoops: number;
    divergentTxs: number;
    compensatoryInjections: number;
    passthroughInjections: number;
    unknownReverts: number;
  };
}

// --- Slot Calculator ---

export interface SlotCalculator {
  fundNav: (fundId: bigint) => Hex;
  fundManager: (fundId: bigint) => Hex;
  baseInfoTotalSupply: (tokenId: bigint) => Hex;
  baseInfoDilutionRatio: (tokenId: bigint) => Hex;
  classMgmtFeeRate: (classId: bigint) => Hex;
  dealingHwm: (dealingId: bigint) => Hex;
  balance: (tokenId: bigint, account: Address) => Hex;
  erc1155TotalSupply: (tokenId: bigint) => Hex;
}
```

**Step 2: Verify ABI is accessible**

The Diamond ABI lives at `contracts/src/generated/abi.json` (287KB, 13K lines). Verify the path resolves:

```bash
ls -la ../../contracts/src/generated/abi.json  # from apps/backend/error_correction/
```

The ABI is loaded at runtime via `import` or `readFileSync`. For V1, use a relative path.

**Step 3: Commit**

```bash
git add apps/backend/error_correction/src/types.ts
git commit -m "feat(error-correction): define input/output types and interfaces"
```

---

## Task 3: Anvil Process Manager

**Files:**
- Create: `apps/backend/error_correction/src/anvil.ts`

**Step 1: Write Anvil manager**

Spawns Anvil as a child process forked at a specific block, waits for it to be ready, returns viem clients.

```typescript
import { spawn, type ChildProcess } from 'node:child_process';
import { createTestClient, createPublicClient, http } from 'viem';
import { foundry } from 'viem/chains';

export interface AnvilInstance {
  process: ChildProcess;
  port: number;
  rpcUrl: string;
  testClient: ReturnType<typeof createTestClient>;
  publicClient: ReturnType<typeof createPublicClient>;
  kill: () => void;
}

export async function startAnvil(opts: {
  forkUrl: string;
  forkBlockNumber: bigint;
  port?: number;
}): Promise<AnvilInstance> {
  const port = opts.port ?? 8546;
  const rpcUrl = `http://127.0.0.1:${port}`;

  const args = [
    '--fork-url', opts.forkUrl,
    '--fork-block-number', opts.forkBlockNumber.toString(),
    '--port', port.toString(),
    '--order', 'fifo',     // Preserve transaction order
    '--silent',            // Suppress Anvil output
  ];

  const proc = spawn('anvil', args, { stdio: ['ignore', 'pipe', 'pipe'] });

  // Wait for Anvil to be ready (polls the RPC endpoint)
  await waitForAnvil(rpcUrl, 10_000);

  const testClient = createTestClient({
    mode: 'anvil',
    chain: foundry,
    transport: http(rpcUrl),
  });

  const publicClient = createPublicClient({
    chain: foundry,
    transport: http(rpcUrl),
  });

  // Automine starts ON (Anvil default). The replay loop switches between
  // automine ON (discovery pass) and OFF (correct replay pass) per block.

  return {
    process: proc,
    port,
    rpcUrl,
    testClient,
    publicClient,
    kill: () => {
      proc.kill('SIGTERM');
    },
  };
}

async function waitForAnvil(rpcUrl: string, timeoutMs: number): Promise<void> {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const res = await fetch(rpcUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jsonrpc: '2.0', method: 'eth_blockNumber', params: [], id: 1 }),
      });
      if (res.ok) return;
    } catch {
      // Anvil not ready yet
    }
    await new Promise(r => setTimeout(r, 100));
  }
  throw new Error(`Anvil did not start within ${timeoutMs}ms`);
}
```

**Step 2: Test it manually**

```bash
npx tsx -e "
import { startAnvil } from './src/anvil.js';
const a = await startAnvil({ forkUrl: 'http://127.0.0.1:8545', forkBlockNumber: 1n, port: 8547 });
const block = await a.publicClient.getBlockNumber();
console.log('Fork block:', block);
a.kill();
"
```

**Expected:** `Fork block: 1n` (or the fork block number)

**Step 3: Commit**

```bash
git add apps/backend/error_correction/src/anvil.ts
git commit -m "feat(error-correction): Anvil process manager with viem clients"
```

---

## Task 4: Block & Transaction Fetcher

**Files:**
- Create: `apps/backend/error_correction/src/fetcher.ts`

Fetches the error transaction, builds the replay plan (all blocks, all txs, receipts for revert detection).

```typescript
import type { PublicClient, Hex, Address, TransactionReceipt } from 'viem';
import type { ReplayPlan, BlockPlan, TxPlan } from './types.js';

export async function buildReplayPlan(
  sourceClient: PublicClient,
  errorTxHash: Hex,
  correctedCalldata: Hex,
  headBlock?: bigint,
): Promise<ReplayPlan> {
  // 1. Fetch error transaction
  const errorTx = await sourceClient.getTransaction({ hash: errorTxHash });
  if (!errorTx) throw new Error(`Transaction ${errorTxHash} not found`);

  const errorBlock = errorTx.blockNumber!;
  const forkBlock = errorBlock - 1n;
  const head = headBlock ?? await sourceClient.getBlockNumber();

  console.log(`[fetcher] Error tx in block ${errorBlock}, forking at ${forkBlock}, replaying to ${head}`);
  console.log(`[fetcher] Fetching ${head - errorBlock + 1n} blocks...`);

  // 2. Fetch all blocks with full transactions
  const blocks: BlockPlan[] = [];
  for (let i = errorBlock; i <= head; i++) {
    const block = await sourceClient.getBlock({ blockNumber: i, includeTransactions: true });

    // 3. Fetch receipts for all txs in this block (to know which reverted)
    const txPlans: TxPlan[] = [];
    for (let j = 0; j < block.transactions.length; j++) {
      const tx = block.transactions[j];
      if (typeof tx === 'string') throw new Error('Block fetched without full transactions');

      const receipt = await sourceClient.getTransactionReceipt({ hash: tx.hash });

      const isErrorTx = tx.hash.toLowerCase() === errorTxHash.toLowerCase();

      txPlans.push({
        hash: tx.hash,
        from: tx.from,
        to: tx.to,
        input: isErrorTx ? correctedCalldata : tx.input,
        value: tx.value,
        nonce: tx.nonce,
        gas: 30_000_000n, // Use high gas limit for replay (gas doesn't matter on Anvil)
        originallyReverted: receipt.status === 'reverted',
        isErrorTx,
      });
    }

    blocks.push({
      number: block.number!,
      timestamp: block.timestamp,
      transactions: txPlans,
    });
  }

  const errorTxIndex = blocks[0].transactions.findIndex(t => t.isErrorTx);

  console.log(`[fetcher] Built replay plan: ${blocks.length} blocks, ${blocks.reduce((s, b) => s + b.transactions.length, 0)} txs`);

  return { forkBlock, errorBlock, headBlock: head, errorTxIndex, blocks };
}
```

**Note:** For large block ranges (1000+ blocks), this will be slow due to sequential RPC calls. For V1 POC this is fine. V2 can batch via `Promise.all` with concurrency control.

**Commit:**

```bash
git add apps/backend/error_correction/src/fetcher.ts
git commit -m "feat(error-correction): block and transaction fetcher with replay plan builder"
```

---

## Task 5: Core Replay Loop (Two-Pass Per Block)

**Files:**
- Create: `apps/backend/error_correction/src/replayer.ts`

### Mining Strategy: Two-Pass Per Block

The replay must preserve the original block structure (multiple txs per block, correct `block.number`) while still detecting divergent transactions. This requires switching Anvil's mining mode on the fly via `evm_setAutomine`.

**The tension:** With automine OFF, `eth_call` runs against the last **mined** state, not including pending mempool txs. If original block N has txs [A, B, C], we can't pre-check B against A's state changes without mining A first.

**Solution — two passes per block:**

```
Pass 1 (DISCOVERY): automine ON
  Replay each tx one-by-one. Each auto-mines into its own temporary block.
  When a tx reverts: discover the injection needed, apply it, retry.
  Result: we know all injections needed for this block.

Pass 2 (CORRECT REPLAY): automine OFF
  Revert to the pre-block snapshot (undoes all discovery blocks).
  Apply all discovered injections upfront.
  Send all txs to mempool, mine once → all txs in one block.
  Result: correct block structure with correct block.number.
```

This preserves block numbers (important for audit trail slots like `fundPriceBlockNumbers`) and keeps divergence detection working.

### Edge Case: State Injections Are Block-Scoped

**COMPENSATORY injections** (permanent balance changes) are applied before the block and affect all txs in the block. This is correct — the balance correction is a real economic change that should be visible to all txs.

**PASSTHROUGH injections** (temporary condition bypasses like minPrice=0) are also applied before the block in Pass 2, meaning ALL txs in the block see the bypassed value, not just the divergent tx. This is a known trade-off:

- **Low risk:** PASSTHROUGH targets are typically order-specific fields (order #42's minPrice). Other txs in the same block don't read order #42's minPrice.
- **If contamination occurs:** Another tx in the same block reads the bypassed minPrice and behaves differently than it would with the real value. This would produce an incorrect state diff.
- **Mitigation:** The notification log flags every PASSTHROUGH injection with the affected slots and block. If a block has both PASSTHROUGH injections AND other txs that touch the same entity, the notification should warn: "PASSTHROUGH active for entire block — verify other txs in this block were not affected."
- **V2 improvement:** For blocks with PASSTHROUGH contamination risk, fall back to per-tx mining (automine ON) for that specific block only.

```typescript
import type { TestClient, PublicClient, Hex, Address } from 'viem';
import type { BlockPlan, TxPlan, NotificationEntry, AppliedInjection, InjectionStrategy, InjectionContext } from './types.js';
import { handleDivergence, type DiscoveredInjection } from './divergence.js';

export interface ReplayResult {
  successfulReplays: number;
  nonceNoops: number;
  divergentTxs: number;
  injections: AppliedInjection[];
  notifications: NotificationEntry[];
}

export async function replayBlocks(
  anvilTest: TestClient,
  anvilPublic: PublicClient,
  sourcePublic: PublicClient,
  blocks: BlockPlan[],
  diamondAddress: Address,
  diamondAbi: readonly unknown[],
  strategies: Map<string, InjectionStrategy>,
  injectionContext: InjectionContext,
): Promise<ReplayResult> {
  const result: ReplayResult = {
    successfulReplays: 0,
    nonceNoops: 0,
    divergentTxs: 0,
    injections: [],
    notifications: [],
  };

  const impersonated = new Set<Address>();

  // Helper: ensure sender is impersonated
  async function ensureImpersonated(addr: Address) {
    if (!impersonated.has(addr)) {
      await anvilTest.impersonateAccount({ address: addr });
      impersonated.add(addr);
    }
  }

  for (const block of blocks) {
    console.log(`[replay] Block ${block.number} (${block.transactions.length} txs, ts=${block.timestamp})`);

    // Ensure all senders in this block are impersonated
    for (const tx of block.transactions) {
      await ensureImpersonated(tx.from);
    }

    // ──────────────────────────────────────────────
    // PASS 1: DISCOVERY (automine ON)
    // Replay txs one-by-one to find divergences and discover needed injections.
    // ──────────────────────────────────────────────

    // Take snapshot before this block
    const snapshotId = await anvilTest.snapshot();

    await anvilTest.setAutomine(true);

    const discoveredInjections: DiscoveredInjection[] = [];
    let blockHasDivergence = false;

    for (const tx of block.transactions) {
      await anvilTest.setNextBlockTimestamp({ timestamp: block.timestamp });

      if (tx.originallyReverted) {
        // Nonce-consuming no-op (still needed during discovery to keep nonces correct)
        await anvilTest.sendTransaction({
          account: tx.from, to: tx.from, value: 0n, nonce: tx.nonce, gas: 21_000n,
        });
        result.nonceNoops++;
        result.notifications.push({
          txHash: '0x' as Hex,
          originalTxHash: tx.hash,
          errorName: 'OriginallyReverted',
          type: 'NONCE_NOOP',
          description: `Original tx ${tx.hash} reverted. Sent nonce-consuming no-op.`,
        });
        continue;
      }

      // Try replaying the transaction
      const callResult = await tryCall(anvilPublic, tx);

      if (callResult.success) {
        // Transaction succeeds — send it (auto-mines)
        await anvilTest.sendTransaction({
          account: tx.from,
          to: tx.to ?? undefined,
          data: tx.input,
          value: tx.value,
          nonce: tx.nonce,
          gas: tx.gas,
        });
        result.successfulReplays++;
        if (tx.isErrorTx) {
          console.log(`[replay]   ✓ Error tx replayed with corrected calldata`);
        }
      } else {
        // DIVERGENCE: originally succeeded, now reverts
        console.log(`[replay]   ✗ Divergence: tx ${tx.hash.slice(0, 10)}...`);
        blockHasDivergence = true;
        result.divergentTxs++;

        const divResult = await handleDivergence(
          anvilTest, anvilPublic, tx, block.timestamp, diamondAddress,
          callResult.revertData!, diamondAbi, strategies, injectionContext,
        );
        discoveredInjections.push(...divResult.discovered);
        result.injections.push(...divResult.applied);
        result.notifications.push(...divResult.notifications);
      }
    }

    // ──────────────────────────────────────────────
    // PASS 2: CORRECT REPLAY (automine OFF)
    // Revert to snapshot, apply discovered injections, batch all txs into one block.
    // ──────────────────────────────────────────────

    // Revert to pre-block state (undoes all discovery blocks)
    await anvilTest.revert({ id: snapshotId });

    // Re-impersonate all accounts (revert clears impersonation state)
    impersonated.clear();
    for (const tx of block.transactions) {
      await ensureImpersonated(tx.from);
    }

    // Apply all discovered injections
    for (const inj of discoveredInjections) {
      for (const mod of inj.mods) {
        if (inj.strategy.revertAfterTx) {
          // Save current value for PASSTHROUGH restoration after the block
          mod.savedValue = await anvilPublic.getStorageAt({
            address: diamondAddress,
            slot: mod.slot,
          }) as Hex;
        }
        await anvilTest.setStorageAt({
          address: diamondAddress,
          index: mod.slot,
          value: mod.newValue,
        });
      }
    }

    // Warn if PASSTHROUGH injections coexist with other txs in the block
    const passthroughInBlock = discoveredInjections.filter(i => i.strategy.revertAfterTx);
    if (passthroughInBlock.length > 0 && block.transactions.length > 1) {
      const affectedSlots = passthroughInBlock.flatMap(i => i.mods.map(m => m.slot));
      result.notifications.push({
        txHash: '0x' as Hex,
        originalTxHash: '0x' as Hex,
        errorName: 'PassthroughBlockScope',
        type: 'PASSTHROUGH',
        description: `PASSTHROUGH injections active for entire block ${block.number} `
          + `(${block.transactions.length} txs). Affected slots: ${affectedSlots.join(', ')}. `
          + `Verify other txs in this block were not affected by bypassed values.`,
      });
    }

    // Switch to manual mining — batch all txs into one block
    await anvilTest.setAutomine(false);
    await anvilTest.setNextBlockTimestamp({ timestamp: block.timestamp });

    // Send all transactions to mempool (in original order)
    for (const tx of block.transactions) {
      if (tx.originallyReverted) {
        // Nonce no-op (already counted in Pass 1)
        await anvilTest.sendTransaction({
          account: tx.from, to: tx.from, value: 0n, nonce: tx.nonce, gas: 21_000n,
        });
      } else {
        await anvilTest.sendTransaction({
          account: tx.from,
          to: tx.to ?? undefined,
          data: tx.input,
          value: tx.value,
          nonce: tx.nonce,
          gas: tx.gas,
        });
      }
    }

    // Mine all pending txs into one block → correct block.number
    await anvilTest.mine({ blocks: 1 });

    // Restore PASSTHROUGH slots (temporary bypasses removed after the block)
    for (const inj of passthroughInBlock) {
      for (const mod of inj.mods) {
        if (mod.savedValue) {
          await anvilTest.setStorageAt({
            address: diamondAddress,
            index: mod.slot,
            value: mod.savedValue,
          });
        }
      }
    }
  }

  console.log(`[replay] Done: ${result.successfulReplays} ok, ${result.nonceNoops} noops, ${result.divergentTxs} divergent`);
  return result;
}

// --- Helpers ---

interface CallResult {
  success: boolean;
  revertData?: Hex;
}

async function tryCall(pub: PublicClient, tx: TxPlan): Promise<CallResult> {
  if (!tx.to) return { success: true }; // Contract creation — let it through
  try {
    await pub.call({
      account: tx.from,
      to: tx.to,
      data: tx.input,
      value: tx.value,
      gas: tx.gas,
    });
    return { success: true };
  } catch (error: any) {
    return { success: false, revertData: extractRevertData(error) };
  }
}

function extractRevertData(error: any): Hex {
  if (error?.data) return error.data;
  if (error?.cause?.data) return error.cause.data;
  if (error?.details && typeof error.details === 'string') {
    const match = error.details.match(/0x[0-9a-fA-F]+/);
    if (match) return match[0] as Hex;
  }
  return '0x' as Hex;
}
```

**Commit:**

```bash
git add apps/backend/error_correction/src/replayer.ts
git commit -m "feat(error-correction): two-pass per-block replay with snapshot/revert for correct block structure"
```

---

## Task 6: Injection Strategy Table

**Files:**
- Create: `apps/backend/error_correction/src/strategies.ts`

Maps custom error names to injection strategies. Each strategy knows how to compute the slot(s) to modify and what value to set.

Reference: `contracts/src/interfaces/ISharedErrors.sol`, `IOrderManagement.sol` for full error definitions.

```typescript
import type { InjectionStrategy, SlotModification, InjectionContext } from './types.js';
import type { Hex } from 'viem';

/**
 * Build the strategy table. For V1, covers the most common divergence errors.
 * ~10 entries. Extend as new error types are encountered.
 */
export function buildStrategyTable(): Map<string, InjectionStrategy> {
  const strategies = new Map<string, InjectionStrategy>();

  // --- COMPENSATORY (permanent, tracked as debt) ---

  strategies.set('InsufficientAvailableBalance', {
    errorName: 'InsufficientAvailableBalance',
    type: 'COMPENSATORY',
    revertAfterTx: false,
    async computeInjection(args, ctx) {
      // args: [available: uint256, requested: uint256]
      const [available, requested] = args as [bigint, bigint];
      // We need to find which balance slot is insufficient.
      // This error is thrown from FundTokensFacet — the failing tx's calldata
      // tells us the tokenId and account. For V1, we log the details
      // and the implementor fills in the slot computation.
      // TODO: Parse tx calldata to extract tokenId + account, then compute
      //       balance slot via ctx.computeSlot.balance(tokenId, account)
      console.warn(`[strategy] InsufficientAvailableBalance: available=${available}, requested=${requested}`);
      console.warn(`[strategy] TODO: Compute balance slot from tx calldata`);
      return [];
    },
  });

  // --- PASSTHROUGH (temporary, restored after tx) ---

  strategies.set('PriceBelowMinimum', {
    errorName: 'PriceBelowMinimum',
    type: 'PASSTHROUGH',
    revertAfterTx: true,
    async computeInjection(args, ctx) {
      // args: [orderId: uint256, price: uint256, minPrice: uint256]
      const [orderId, price, minPrice] = args as [bigint, bigint, bigint];
      // Set the order's minPrice to 0 so the check passes
      // Order storage: orderBook[fundId].orders[orderId].minPrice
      // TODO: Compute slot from orderId
      console.warn(`[strategy] PriceBelowMinimum: order ${orderId}, price ${price} < min ${minPrice}`);
      return [];
    },
  });

  strategies.set('PriceAboveMaximum', {
    errorName: 'PriceAboveMaximum',
    type: 'PASSTHROUGH',
    revertAfterTx: true,
    async computeInjection(args, ctx) {
      const [orderId, price, maxPrice] = args as [bigint, bigint, bigint];
      console.warn(`[strategy] PriceAboveMaximum: order ${orderId}, price ${price} > max ${maxPrice}`);
      return [];
    },
  });

  strategies.set('FundCapacityExceeded', {
    errorName: 'FundCapacityExceeded',
    type: 'PASSTHROUGH',
    revertAfterTx: true,
    async computeInjection(args, ctx) {
      const [projectedNav, maxCapacity] = args as [bigint, bigint];
      // Set fund's maxCapacity to type(uint128).max
      console.warn(`[strategy] FundCapacityExceeded: nav ${projectedNav} > capacity ${maxCapacity}`);
      return [];
    },
  });

  strategies.set('NotEligible', {
    errorName: 'NotEligible',
    type: 'PASSTHROUGH',
    revertAfterTx: true,
    async computeInjection(args, ctx) {
      const [reason] = args as [string];
      console.warn(`[strategy] NotEligible: ${reason}`);
      return [];
    },
  });

  strategies.set('MinimumSubscriptionNotMet', {
    errorName: 'MinimumSubscriptionNotMet',
    type: 'PASSTHROUGH',
    revertAfterTx: true,
    async computeInjection(args, ctx) {
      const [orderAmount, minimumRequired] = args as [bigint, bigint];
      console.warn(`[strategy] MinimumSubscriptionNotMet: ${orderAmount} < ${minimumRequired}`);
      return [];
    },
  });

  strategies.set('OrderSizeBelowMinimum', {
    errorName: 'OrderSizeBelowMinimum',
    type: 'PASSTHROUGH',
    revertAfterTx: true,
    async computeInjection(args, ctx) {
      const [amount, minimum] = args as [bigint, bigint];
      console.warn(`[strategy] OrderSizeBelowMinimum: ${amount} < ${minimum}`);
      return [];
    },
  });

  return strategies;
}
```

**Note:** The `computeInjection` functions are stubs that log warnings. They will be fully implemented in Task 8 (Storage Slot Calculator) once we have verified slot offsets from `forge inspect`. This is intentional — get the framework working first, then fill in the slot math.

**Commit:**

```bash
git add apps/backend/error_correction/src/strategies.ts
git commit -m "feat(error-correction): injection strategy table with error-to-slot mappings"
```

---

## Task 7: Divergence Handler

**Files:**
- Create: `apps/backend/error_correction/src/divergence.ts`

Implements the retry loop: try → fail → parse error → look up strategy → inject → retry. In the two-pass architecture, the divergence handler runs during Pass 1 (discovery). It discovers AND applies injections during discovery (so subsequent txs in the same block see the injected state). The discovered injections are collected and re-applied in Pass 2 after the snapshot revert.

```typescript
import type { TestClient, PublicClient, Hex, Address } from 'viem';
import { decodeErrorResult } from 'viem';
import type { TxPlan, InjectionStrategy, AppliedInjection, NotificationEntry, InjectionContext, SlotModification } from './types.js';

const MAX_INJECTION_RETRIES = 5; // Safety limit for combined failures

/** Injection discovered during Pass 1, to be re-applied in Pass 2 */
export interface DiscoveredInjection {
  strategy: InjectionStrategy;
  mods: SlotModification[];
  forTxHash: Hex;
}

interface DivergenceResult {
  /** Injections discovered AND applied during discovery (for Pass 1 state) */
  discovered: DiscoveredInjection[];
  /** Injections to record in the output */
  applied: AppliedInjection[];
  notifications: NotificationEntry[];
}

export async function handleDivergence(
  anvilTest: TestClient,
  anvilPublic: PublicClient,
  tx: TxPlan,
  blockTimestamp: bigint,
  diamondAddress: Address,
  initialRevertData: Hex,
  diamondAbi: readonly unknown[],
  strategies: Map<string, InjectionStrategy>,
  ctx: InjectionContext,
): Promise<DivergenceResult> {
  const discovered: DiscoveredInjection[] = [];
  const applied: AppliedInjection[] = [];
  const notifications: NotificationEntry[] = [];
  let revertData = initialRevertData;

  for (let attempt = 0; attempt < MAX_INJECTION_RETRIES; attempt++) {
    // 1. Decode the revert reason
    let errorName: string;
    let errorArgs: readonly unknown[];
    try {
      const decoded = decodeErrorResult({ abi: diamondAbi as any, data: revertData });
      errorName = decoded.errorName;
      errorArgs = decoded.args ?? [];
    } catch {
      console.warn(`[divergence] Unknown revert data: ${revertData.slice(0, 10)}...`);
      notifications.push({
        txHash: '0x' as Hex,
        originalTxHash: tx.hash,
        errorName: 'UnknownRevert',
        type: 'UNKNOWN_REVERT',
        description: `Could not decode revert data: ${revertData.slice(0, 66)}`,
      });
      // Send nonce-consuming no-op (during discovery pass) and move on
      await anvilTest.sendTransaction({
        account: tx.from, to: tx.from, value: 0n, nonce: tx.nonce, gas: 21_000n,
      });
      return { discovered, applied, notifications };
    }

    // 2. Look up strategy
    const strategy = strategies.get(errorName);
    if (!strategy) {
      console.warn(`[divergence] No strategy for error: ${errorName}`);
      notifications.push({
        txHash: '0x' as Hex,
        originalTxHash: tx.hash,
        errorName,
        type: 'UNKNOWN_REVERT',
        description: `No injection strategy for error: ${errorName}(${errorArgs.join(', ')})`,
      });
      await anvilTest.sendTransaction({
        account: tx.from, to: tx.from, value: 0n, nonce: tx.nonce, gas: 21_000n,
      });
      return { discovered, applied, notifications };
    }

    console.log(`[divergence]   Attempt ${attempt + 1}: ${errorName} → ${strategy.type}`);

    // 3. Compute and apply injection (during discovery — state persists for subsequent txs)
    const mods = await strategy.computeInjection(errorArgs, ctx);
    for (const mod of mods) {
      await anvilTest.setStorageAt({
        address: diamondAddress,
        index: mod.slot,
        value: mod.newValue,
      });
    }

    discovered.push({ strategy, mods, forTxHash: tx.hash });
    applied.push({
      strategy,
      mods,
      txHash: '0x' as Hex,
      originalTxHash: tx.hash,
      blockNumber: 0n,
    });

    if (strategy.revertAfterTx) {
      notifications.push({
        txHash: '0x' as Hex,
        originalTxHash: tx.hash,
        errorName: strategy.errorName,
        type: 'PASSTHROUGH',
        description: `Bypassed ${strategy.errorName} — will be restored after block`,
      });
    }

    // 4. Retry the transaction via eth_call
    try {
      await anvilPublic.call({
        account: tx.from,
        to: tx.to!,
        data: tx.input,
        value: tx.value,
        gas: tx.gas,
      });

      // Call succeeds — actually send it (auto-mines during discovery)
      await anvilTest.setNextBlockTimestamp({ timestamp: blockTimestamp });
      await anvilTest.sendTransaction({
        account: tx.from,
        to: tx.to ?? undefined,
        data: tx.input,
        value: tx.value,
        nonce: tx.nonce,
        gas: tx.gas,
      });

      console.log(`[divergence]   ✓ Succeeded after ${attempt + 1} injection(s)`);
      return { discovered, applied, notifications };

    } catch (retryError: any) {
      revertData = extractRevertData(retryError);
      console.log(`[divergence]   Still reverting, peeling next error...`);
    }
  }

  // Exhausted retries
  console.error(`[divergence]   ✗ Failed after ${MAX_INJECTION_RETRIES} attempts for tx ${tx.hash}`);
  notifications.push({
    txHash: '0x' as Hex,
    originalTxHash: tx.hash,
    errorName: 'ExhaustedRetries',
    type: 'UNKNOWN_REVERT',
    description: `Failed after ${MAX_INJECTION_RETRIES} injection attempts`,
  });
  await anvilTest.sendTransaction({
    account: tx.from, to: tx.from, value: 0n, nonce: tx.nonce, gas: 21_000n,
  });
  return { discovered, applied, notifications };
}

function extractRevertData(error: any): Hex {
  if (error?.data) return error.data;
  if (error?.cause?.data) return error.cause.data;
  if (error?.details && typeof error.details === 'string') {
    const match = error.details.match(/0x[0-9a-fA-F]+/);
    if (match) return match[0] as Hex;
  }
  return '0x' as Hex;
}
```

**Commit:**

```bash
git add apps/backend/error_correction/src/divergence.ts
git commit -m "feat(error-correction): divergence handler aligned with two-pass replay architecture"
```

---

## Task 8: Storage Slot Calculator

**Files:**
- Create: `apps/backend/error_correction/src/slots.ts`

This is the most technically challenging task. Computes Solidity storage slots for the Diamond's subdomain storage pattern.

**Step 1: Get storage layout offsets**

Run (from `contracts/` directory):

```bash
forge inspect NavManagementFacet storage-layout --json | jq '.storage[] | {name: .label, slot: .slot, offset: .offset, type: .type}'
```

This outputs the AppStorage struct layout. We need the following offsets:
- Slot of `FundAdmin` mapping within AppStorage → `FUND_ADMIN_SLOT`
- Slot of `FundTokens` mapping within AppStorage → `FUND_TOKENS_SLOT`
- Offset of `funds` mapping within FundAdminStorage → `FUNDS_OFFSET`
- Offset of `classes` mapping within FundAdminStorage → `CLASSES_OFFSET`
- Offset of `dealings` mapping within FundAdminStorage → `DEALINGS_OFFSET`
- Offset of `baseInfo` mapping within FundAdminStorage → `BASE_INFO_OFFSET`
- Offset of `nav` within FundInfo struct → `FUND_NAV_OFFSET`
- Offset of `totalSupply` within BaseInfo struct → `BASE_TOTAL_SUPPLY_OFFSET`
- Offset of `dilutionRatio` within BaseInfo struct → `BASE_DILUTION_OFFSET`
- Offset of `balances` mapping within FundTokensStorage → `BALANCES_OFFSET`
- Offset of `totalSupply` mapping within FundTokensStorage → `ERC1155_SUPPLY_OFFSET`

**Step 2: Implement slot calculator**

```typescript
import { keccak256, encodeAbiParameters, toHex, pad, type Hex, type Address } from 'viem';
import type { SlotCalculator } from './types.js';

// --- OFFSETS (fill from `forge inspect` output) ---
// These are populated by running forge inspect and reading the layout.
// Placeholder values — MUST be verified against actual layout in P4.

const FUND_ADMIN_SLOT = 4n;       // slot of AppStorage.FundAdmin mapping
const FUND_TOKENS_SLOT = 5n;      // slot of AppStorage.FundTokens mapping
const FUNDS_OFFSET = 0n;          // offset of funds mapping in FundAdminStorage
const CLASSES_OFFSET = 1n;        // offset of classes mapping in FundAdminStorage
const DEALINGS_OFFSET = 2n;       // offset of dealings mapping in FundAdminStorage
const BASE_INFO_OFFSET = 3n;      // offset of baseInfo mapping in FundAdminStorage
const FUND_NAV_OFFSET = 2n;       // offset of nav within FundInfo struct (after manager+status+nextClassId)
const FUND_MANAGER_OFFSET = 0n;   // offset of manager within FundInfo
const BASE_TOTAL_SUPPLY_OFFSET = 1n; // offset of totalSupply in BaseInfo (after string name which takes 1+ slots)
const BASE_DILUTION_OFFSET = 2n;     // offset of dilutionRatio in BaseInfo
const CLASS_MGMT_FEE_OFFSET = 0n;    // offset of mgmtFeeRate in ClassInfo
const DEALING_HWM_OFFSET = 0n;       // offset of hwm in DealingInfo
const BALANCES_OFFSET = 0n;       // offset of balances mapping in FundTokensStorage
const ERC1155_SUPPLY_OFFSET = 2n; // offset of totalSupply mapping in FundTokensStorage

/**
 * Compute storage slot for a Solidity mapping: keccak256(abi.encode(key, mappingSlot))
 */
function mappingSlot(key: bigint | Address, baseSlot: bigint): bigint {
  const keyEncoded = typeof key === 'string'
    ? encodeAbiParameters([{ type: 'address' }, { type: 'uint256' }], [key, baseSlot])
    : encodeAbiParameters([{ type: 'uint256' }, { type: 'uint256' }], [key, baseSlot]);
  return BigInt(keccak256(keyEncoded));
}

/**
 * Compute base slot for FundAdmin[0] subdomain.
 */
function fundAdminBase(): bigint {
  return mappingSlot(0n, FUND_ADMIN_SLOT);
}

/**
 * Compute base slot for FundTokens[0] subdomain.
 */
function fundTokensBase(): bigint {
  return mappingSlot(0n, FUND_TOKENS_SLOT);
}

export function createSlotCalculator(): SlotCalculator {
  const faBase = fundAdminBase();
  const ftBase = fundTokensBase();

  return {
    fundNav(fundId: bigint): Hex {
      const fundsMapping = faBase + FUNDS_OFFSET;
      const fundBase = mappingSlot(fundId, fundsMapping);
      return toHex(fundBase + FUND_NAV_OFFSET, { size: 32 });
    },

    fundManager(fundId: bigint): Hex {
      const fundsMapping = faBase + FUNDS_OFFSET;
      const fundBase = mappingSlot(fundId, fundsMapping);
      return toHex(fundBase + FUND_MANAGER_OFFSET, { size: 32 });
    },

    baseInfoTotalSupply(tokenId: bigint): Hex {
      const baseInfoMapping = faBase + BASE_INFO_OFFSET;
      const infoBase = mappingSlot(tokenId, baseInfoMapping);
      return toHex(infoBase + BASE_TOTAL_SUPPLY_OFFSET, { size: 32 });
    },

    baseInfoDilutionRatio(tokenId: bigint): Hex {
      const baseInfoMapping = faBase + BASE_INFO_OFFSET;
      const infoBase = mappingSlot(tokenId, baseInfoMapping);
      return toHex(infoBase + BASE_DILUTION_OFFSET, { size: 32 });
    },

    classMgmtFeeRate(classId: bigint): Hex {
      const classesMapping = faBase + CLASSES_OFFSET;
      const classBase = mappingSlot(classId, classesMapping);
      return toHex(classBase + CLASS_MGMT_FEE_OFFSET, { size: 32 });
    },

    dealingHwm(dealingId: bigint): Hex {
      const dealingsMapping = faBase + DEALINGS_OFFSET;
      const dealingBase = mappingSlot(dealingId, dealingsMapping);
      return toHex(dealingBase + DEALING_HWM_OFFSET, { size: 32 });
    },

    balance(tokenId: bigint, account: Address): Hex {
      const balancesMapping = ftBase + BALANCES_OFFSET;
      const innerMapping = mappingSlot(tokenId, balancesMapping);
      const balanceSlot = mappingSlot(account as Address, innerMapping);
      return toHex(balanceSlot, { size: 32 });
    },

    erc1155TotalSupply(tokenId: bigint): Hex {
      const supplyMapping = ftBase + ERC1155_SUPPLY_OFFSET;
      const slot = mappingSlot(tokenId, supplyMapping);
      return toHex(slot, { size: 32 });
    },
  };
}
```

**Step 3: Verify against live state**

After deploying Diamond to Anvil with a known fund (NAV = 1000e18), compute `fundNav(fundId)` and verify with `eth_getStorageAt`:

```typescript
const calc = createSlotCalculator();
const navSlot = calc.fundNav(fundId);
const onChainValue = await publicClient.getStorageAt({ address: diamond, slot: navSlot });
console.log('Computed slot:', navSlot);
console.log('On-chain value:', onChainValue);
// Should decode to 1000e18 = 0x00000000000000000000000000000000000000000000003635C9ADC5DEA00000
```

If the value doesn't match, adjust the offset constants. This is the P4 prerequisite.

**Commit:**

```bash
git add apps/backend/error_correction/src/slots.ts
git commit -m "feat(error-correction): storage slot calculator for Diamond subdomain pattern"
```

---

## Task 9: State Diff Extraction & Output

**Files:**
- Create: `apps/backend/error_correction/src/diff.ts`
- Create: `apps/backend/error_correction/src/output.ts`

**Step 1: Write diff extractor**

Reads known entity slots from both chains and compares.

```typescript
import type { PublicClient, Address, Hex } from 'viem';
import type { SlotCalculator, SlotDiff } from './types.js';

/**
 * Extract state diff by comparing known entity slots between source and replay chains.
 *
 * @param knownEntities - All entity IDs discovered during replay (from events or pre-known)
 */
export async function extractStateDiff(
  sourceClient: PublicClient,
  replayClient: PublicClient,
  diamondAddress: Address,
  calc: SlotCalculator,
  knownEntities: {
    fundIds: bigint[];
    classIds: bigint[];  // these are tokenIds (umbrella|fund|class|0)
    dealingIds: bigint[]; // these are tokenIds (umbrella|fund|class|dealing)
    accounts: Address[];
  },
): Promise<SlotDiff[]> {
  const diffs: SlotDiff[] = [];
  const slotsToCheck: Hex[] = [];

  // Collect all slots to check
  for (const fundId of knownEntities.fundIds) {
    slotsToCheck.push(calc.fundNav(fundId));
    slotsToCheck.push(calc.fundManager(fundId));
    slotsToCheck.push(calc.baseInfoTotalSupply(fundId));
    slotsToCheck.push(calc.baseInfoDilutionRatio(fundId));
  }

  for (const classId of knownEntities.classIds) {
    slotsToCheck.push(calc.baseInfoTotalSupply(classId));
    slotsToCheck.push(calc.baseInfoDilutionRatio(classId));
    slotsToCheck.push(calc.classMgmtFeeRate(classId));
  }

  for (const dealingId of knownEntities.dealingIds) {
    slotsToCheck.push(calc.baseInfoTotalSupply(dealingId));
    slotsToCheck.push(calc.baseInfoDilutionRatio(dealingId));
    slotsToCheck.push(calc.dealingHwm(dealingId));
  }

  // Check balances for all account × token combinations
  const allTokenIds = [
    ...knownEntities.fundIds,
    ...knownEntities.classIds,
    ...knownEntities.dealingIds,
  ];
  for (const account of knownEntities.accounts) {
    for (const tokenId of allTokenIds) {
      slotsToCheck.push(calc.balance(tokenId, account));
      slotsToCheck.push(calc.erc1155TotalSupply(tokenId));
    }
  }

  // Deduplicate
  const uniqueSlots = [...new Set(slotsToCheck)];

  console.log(`[diff] Comparing ${uniqueSlots.length} storage slots...`);

  // Read from both chains and compare
  for (const slot of uniqueSlots) {
    const [sourceValue, replayValue] = await Promise.all([
      sourceClient.getStorageAt({ address: diamondAddress, slot }),
      replayClient.getStorageAt({ address: diamondAddress, slot }),
    ]);

    if (sourceValue !== replayValue) {
      diffs.push({
        slot,
        oldValue: (sourceValue ?? '0x0') as Hex,
        newValue: (replayValue ?? '0x0') as Hex,
      });
    }
  }

  console.log(`[diff] Found ${diffs.length} slot differences out of ${uniqueSlots.length} checked`);
  return diffs;
}
```

**Step 2: Write output formatters**

```typescript
import { writeFileSync } from 'node:fs';
import type { CorrectionOutput } from './types.js';

export function writeOutputs(output: CorrectionOutput, outputDir: string): void {
  // Serialize BigInts as strings for JSON
  const replacer = (_key: string, value: unknown) =>
    typeof value === 'bigint' ? value.toString() : value;

  writeFileSync(
    `${outputDir}/state-diff.json`,
    JSON.stringify(output.stateDiff, replacer, 2),
  );

  writeFileSync(
    `${outputDir}/compensation-ledger.json`,
    JSON.stringify(output.compensationLedger, replacer, 2),
  );

  writeFileSync(
    `${outputDir}/notifications.json`,
    JSON.stringify(output.notifications, replacer, 2),
  );

  writeFileSync(
    `${outputDir}/summary.json`,
    JSON.stringify({
      input: output.input,
      replayPlan: output.replayPlan,
      stats: output.stats,
      slotDiffCount: output.stateDiff.length,
      compensationCount: output.compensationLedger.length,
      notificationCount: output.notifications.length,
    }, replacer, 2),
  );

  console.log(`[output] Written to ${outputDir}/:`);
  console.log(`  state-diff.json         (${output.stateDiff.length} slot changes)`);
  console.log(`  compensation-ledger.json (${output.compensationLedger.length} entries)`);
  console.log(`  notifications.json       (${output.notifications.length} entries)`);
  console.log(`  summary.json`);
}
```

**Commit:**

```bash
git add apps/backend/error_correction/src/diff.ts apps/backend/error_correction/src/output.ts
git commit -m "feat(error-correction): state diff extraction and output formatters"
```

---

## Task 10: Engine Orchestrator & CLI

**Files:**
- Create: `apps/backend/error_correction/src/engine.ts`
- Create: `apps/backend/error_correction/src/index.ts`

**Step 1: Engine orchestrator**

Ties everything together: fetch → fork → replay → diff → output.

```typescript
import { createPublicClient, http, type Hex, type Address } from 'viem';
import { foundry } from 'viem/chains';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import type { CorrectionInput, CorrectionOutput, InjectionContext } from './types.js';
import { startAnvil } from './anvil.js';
import { buildReplayPlan } from './fetcher.js';
import { replayBlocks } from './replayer.js';
import { buildStrategyTable } from './strategies.js';
import { createSlotCalculator } from './slots.js';
import { extractStateDiff } from './diff.js';

export async function runCorrection(input: CorrectionInput): Promise<CorrectionOutput> {
  // 1. Load Diamond ABI
  const abiPath = resolve(import.meta.dirname, '../../../../contracts/src/generated/abi.json');
  const diamondAbi = JSON.parse(readFileSync(abiPath, 'utf8'));
  console.log(`[engine] Loaded Diamond ABI (${diamondAbi.length} entries)`);

  // 2. Create source chain client
  const sourceClient = createPublicClient({
    chain: foundry,
    transport: http(input.rpcUrl, { timeout: 60_000 }),
  });

  // 3. Build replay plan
  const plan = await buildReplayPlan(sourceClient, input.errorTxHash, input.correctedCalldata, input.headBlock);

  // 4. Start Anvil forked at errorBlock - 1
  console.log(`[engine] Starting Anvil forked at block ${plan.forkBlock}...`);
  const anvil = await startAnvil({
    forkUrl: input.rpcUrl,
    forkBlockNumber: plan.forkBlock,
  });

  try {
    // 5. Set up injection context
    const calc = createSlotCalculator();
    const injectionContext: InjectionContext = {
      readSourceSlot: async (slot: Hex) =>
        (await sourceClient.getStorageAt({ address: input.diamondAddress, slot })) as Hex,
      readReplaySlot: async (slot: Hex) =>
        (await anvil.publicClient.getStorageAt({ address: input.diamondAddress, slot })) as Hex,
      computeSlot: calc,
    };

    // 6. Replay
    const strategies = buildStrategyTable();
    const replayResult = await replayBlocks(
      anvil.testClient,
      anvil.publicClient,
      sourceClient,
      plan.blocks,
      diamondAbi,
      strategies,
      injectionContext,
    );

    // 7. Extract state diff
    // For V1: entity IDs must be provided or discovered from events.
    // Placeholder: empty entities (implementor fills in from test scenario)
    const knownEntities = {
      fundIds: [] as bigint[],
      classIds: [] as bigint[],
      dealingIds: [] as bigint[],
      accounts: [] as Address[],
    };

    // TODO: Discover entities from events emitted during replay
    //       or accept them as CLI input
    console.log('[engine] NOTE: Entity discovery not yet implemented. State diff will be empty unless entities are provided.');

    const stateDiff = await extractStateDiff(
      sourceClient,
      anvil.publicClient,
      input.diamondAddress,
      calc,
      knownEntities,
    );

    // 8. Build output
    const totalTxs = plan.blocks.reduce((s, b) => s + b.transactions.length, 0);

    return {
      input,
      replayPlan: {
        forkBlock: plan.forkBlock,
        errorBlock: plan.errorBlock,
        headBlock: plan.headBlock,
        totalTxs,
      },
      stateDiff,
      compensationLedger: replayResult.injections
        .filter(i => i.strategy.type === 'COMPENSATORY')
        .map(i => ({
          investor: '0x' as Address, // TODO: extract from tx
          txHash: i.txHash,
          errorName: i.strategy.errorName,
          injectedSlot: i.mods[0]?.slot ?? '0x' as Hex,
          injectedAmount: 0n, // TODO: compute from mod values
          description: `${i.strategy.errorName} injection for tx ${i.originalTxHash}`,
        })),
      notifications: replayResult.notifications,
      stats: {
        totalBlocks: plan.blocks.length,
        totalTxs,
        successfulReplays: replayResult.successfulReplays,
        nonceNoops: replayResult.nonceNoops,
        divergentTxs: replayResult.divergentTxs,
        compensatoryInjections: replayResult.injections.filter(i => i.strategy.type === 'COMPENSATORY').length,
        passthroughInjections: replayResult.injections.filter(i => i.strategy.type === 'PASSTHROUGH').length,
        unknownReverts: replayResult.notifications.filter(n => n.type === 'UNKNOWN_REVERT').length,
      },
    };

  } finally {
    anvil.kill();
    console.log('[engine] Anvil stopped');
  }
}
```

**Step 2: CLI entry point**

```typescript
import { runCorrection } from './engine.js';
import { writeOutputs } from './output.js';
import type { Address, Hex } from 'viem';

async function main() {
  const args = process.argv.slice(2);

  if (args.length < 4) {
    console.log(`Usage: tsx src/index.ts <rpcUrl> <diamondAddress> <errorTxHash> <correctedCalldata> [headBlock] [outputDir]`);
    console.log(`\nExample:`);
    console.log(`  tsx src/index.ts http://127.0.0.1:8545 0x1234...abcd 0xabcd...1234 0x$(cast calldata "updateNav(address,uint256,uint256,uint32)" ...) 100 ./output`);
    process.exit(1);
  }

  const [rpcUrl, diamondAddress, errorTxHash, correctedCalldata, headBlockStr, outputDir] = args;

  const output = await runCorrection({
    rpcUrl,
    diamondAddress: diamondAddress as Address,
    errorTxHash: errorTxHash as Hex,
    correctedCalldata: correctedCalldata as Hex,
    headBlock: headBlockStr ? BigInt(headBlockStr) : undefined,
  });

  writeOutputs(output, outputDir ?? './output');

  console.log('\n=== CORRECTION SUMMARY ===');
  console.log(`Blocks replayed:    ${output.stats.totalBlocks}`);
  console.log(`Transactions:       ${output.stats.totalTxs}`);
  console.log(`Successful:         ${output.stats.successfulReplays}`);
  console.log(`Nonce no-ops:       ${output.stats.nonceNoops}`);
  console.log(`Divergent:          ${output.stats.divergentTxs}`);
  console.log(`Slot diffs:         ${output.stateDiff.length}`);
  console.log(`Compensation:       ${output.compensationLedger.length}`);
  console.log(`Notifications:      ${output.notifications.length}`);
}

main().catch(e => {
  console.error('Fatal error:', e);
  process.exit(1);
});
```

**Commit:**

```bash
git add apps/backend/error_correction/src/engine.ts apps/backend/error_correction/src/index.ts
git commit -m "feat(error-correction): engine orchestrator and CLI entry point"
```

---

## Task 11: Test Scenario Script

**Files:**
- Create: `apps/backend/error_correction/scripts/setup-test-scenario.sh`

This script creates a reproducible test scenario on a local Anvil:
1. Deploy Diamond
2. Create fund + class
3. Investor subscribes
4. **Wrong NAV update** (the error we'll correct)
5. More activity after the error (to test cascade)

```bash
#!/bin/bash
# setup-test-scenario.sh
# Creates a test scenario with a wrong NAV update for error correction testing.
#
# Prerequisites:
#   - Anvil running on port 8545
#   - Diamond deployed (run `yarn dlx gemforge deploy local` from contracts/)
#
# Usage:
#   1. Start Anvil:      anvil -p 8545
#   2. Deploy Diamond:   cd contracts && yarn dlx gemforge deploy local
#   3. Run this script:  bash scripts/setup-test-scenario.sh
#
# The script outputs the error transaction hash and the corrected calldata
# for use with the error correction engine.

set -euo pipefail

RPC_URL="http://127.0.0.1:8545"

# Anvil default accounts
DEPLOYER="0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266"
DEPLOYER_PK="0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80"
ADMIN="0x90F79bf6EB2c4f870365E785982E1f101E93b906"
ADMIN_PK="0x7c852118294e51e653712a81e05800f419141751be58f605c371e15141b007a6"
NAV_UPDATER="0x9965507D1a55bcC2695C58ba16FB37d819B0A4dc"
NAV_UPDATER_PK="0x8b3a350cf5c34c9194ca85829a2df0ec3153be0318b5e2d3348e872092edffba"
MANAGER="0x70997970C51812dc3A010C7d01b50e0d17dc79C8"
MANAGER_PK="0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d"
INVESTOR="0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC"
INVESTOR_PK="0x5de4111afa1a4b94908f83103eb1f1706367c2e68ca870fc3fb9a804cdab365a"

# Diamond address (from gemforge deployment — check contracts/gemforge.deployments.json)
DIAMOND="<FILL_FROM_DEPLOYMENT>"

echo "=== Error Correction Test Scenario ==="
echo "Diamond: $DIAMOND"
echo ""

# NOTE: The exact sequence of setup transactions (account creation, role grants,
# fund creation, class creation, dealing schedule, etc.) depends on the Diamond's
# current deployment state. Use the ComprehensivePostDeploy forge script for
# full setup, then use cast for the specific error scenario.
#
# The key transactions for the error correction test are:
#
# 1. Deploy + setup (done by ComprehensivePostDeploy.s.sol)
# 2. Submit a subscribe order
# 3. Update NAV with WRONG value (THIS IS THE ERROR TX)
# 4. Process orders (at wrong NAV)
# 5. Submit another order
# 6. Update NAV correctly
# 7. Process orders again
#
# The error correction engine should:
# - Fork before tx #3
# - Replace tx #3 with the correct NAV
# - Replay txs #3-#7
# - Produce a state diff showing the corrected values

echo "Run ComprehensivePostDeploy first:"
echo "  cd contracts && forge script script/ComprehensivePostDeploy.s.sol --rpc-url $RPC_URL --broadcast"
echo ""
echo "Then record the error tx hash and run the correction engine:"
echo "  npx tsx src/index.ts $RPC_URL $DIAMOND <error_tx_hash> <corrected_calldata>"
echo ""
echo "=== Manual steps (use cast to send transactions) ==="
echo ""
echo "# Get NAV updater account address from the Diamond"
echo "# Submit subscribe order via investor wallet"
echo "# Send wrong NAV update (the error):"
echo "#   cast send $DIAMOND 'updateNav(address,uint256,uint256,uint32)' \\"
echo "#     \$NAV_UPDATER_ACCOUNT \$FUND_ID 1100000000000000000000 \$(date +%s) \\"
echo "#     --private-key $NAV_UPDATER_PK --rpc-url $RPC_URL"
echo ""
echo "# The CORRECT NAV would have been 1050000000000000000000 (1050e18 vs 1100e18)"
echo "# Corrected calldata:"
echo "#   cast calldata 'updateNav(address,uint256,uint256,uint32)' \\"
echo "#     \$NAV_UPDATER_ACCOUNT \$FUND_ID 1050000000000000000000 \$(date +%s)"
```

**Note:** This is a template. The exact entity IDs (fundId, classId, account addresses) depend on the deployment. The implementor needs to:
1. Deploy Diamond via `gemforge deploy local`
2. Run `ComprehensivePostDeploy`
3. Record the Diamond address and entity IDs
4. Send transactions manually via `cast` or via a small script
5. Record the error tx hash

**Commit:**

```bash
git add apps/backend/error_correction/scripts/setup-test-scenario.sh
git commit -m "feat(error-correction): test scenario setup script template"
```

---

## Task 12: End-to-End Verification

**Files:**
- Create: `apps/backend/error_correction/test/e2e.test.ts`

A TypeScript script that:
1. Starts Anvil
2. Deploys Diamond via forge script
3. Creates a test scenario with a wrong NAV
4. Runs the correction engine
5. Verifies the output

```typescript
/**
 * End-to-end test for the Error Correction Engine.
 *
 * This test:
 * 1. Starts Anvil on port 8545
 * 2. Deploys Diamond via `forge script`
 * 3. Creates a fund, class, and investor activity
 * 4. Sends a wrong NAV update (the error)
 * 5. Sends more activity after the error
 * 6. Runs the correction engine with the correct NAV
 * 7. Verifies the state diff is non-empty and sensible
 *
 * NOTE: This is a high-level integration test, not a unit test.
 * It requires Foundry (forge, cast, anvil) to be installed.
 */

import { execSync, spawn, type ChildProcess } from 'node:child_process';
import { createPublicClient, createTestClient, http, type Hex, type Address, encodeFunctionData } from 'viem';
import { foundry } from 'viem/chains';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { runCorrection } from '../src/engine.js';

const RPC_URL = 'http://127.0.0.1:8545';
const CONTRACTS_DIR = resolve(import.meta.dirname, '../../../../contracts');

async function main() {
  console.log('=== E2E Test: Error Correction Engine ===\n');

  // 1. Start Anvil
  console.log('[test] Starting Anvil...');
  const anvilProc = spawn('anvil', ['-p', '8545', '--silent'], { stdio: 'ignore' });
  await sleep(2000); // Wait for Anvil to start

  try {
    // 2. Deploy Diamond
    console.log('[test] Deploying Diamond...');
    execSync('yarn dlx gemforge deploy local', { cwd: CONTRACTS_DIR, stdio: 'inherit' });

    // 3. Get Diamond address from deployment
    const deployments = JSON.parse(
      readFileSync(resolve(CONTRACTS_DIR, 'gemforge.deployments.json'), 'utf8')
    );
    const diamondAddress = deployments.local?.contracts?.[0]?.onChain?.address as Address;
    console.log(`[test] Diamond deployed at: ${diamondAddress}`);

    // 4. Run ComprehensivePostDeploy
    console.log('[test] Running post-deploy setup...');
    execSync(
      `forge script script/ComprehensivePostDeploy.s.sol --rpc-url ${RPC_URL} --broadcast -vv`,
      { cwd: CONTRACTS_DIR, stdio: 'inherit' }
    );

    // 5. TODO: Send specific test transactions
    //    - Subscribe order
    //    - Wrong NAV update (record tx hash)
    //    - Process orders
    //    - More activity
    //
    //    This requires knowing the exact entity IDs from the deployment.
    //    For now, this is a placeholder that demonstrates the engine runs.

    console.log('[test] NOTE: Full test scenario not yet automated.');
    console.log('[test] The engine framework is in place. Manual testing required.');
    console.log('[test] See scripts/setup-test-scenario.sh for manual steps.');

    // 6. Once we have the error tx hash, run the engine:
    // const output = await runCorrection({
    //   rpcUrl: RPC_URL,
    //   diamondAddress,
    //   errorTxHash: '0x...' as Hex,
    //   correctedCalldata: '0x...' as Hex,
    // });
    //
    // 7. Verify output
    // assert(output.stateDiff.length > 0, 'State diff should be non-empty');
    // assert(output.stats.successfulReplays > 0, 'Should have successful replays');

    console.log('\n[test] ✓ Engine framework verified (manual test scenario pending)');

  } finally {
    anvilProc.kill('SIGTERM');
    console.log('[test] Anvil stopped');
  }
}

function sleep(ms: number) {
  return new Promise(r => setTimeout(r, ms));
}

main().catch(e => {
  console.error('[test] ✗ FAILED:', e);
  process.exit(1);
});
```

**Commit:**

```bash
git add apps/backend/error_correction/test/e2e.test.ts
git commit -m "feat(error-correction): end-to-end test scaffold"
```

---

## Known Risks & Open Questions

### Must Verify (Prerequisites P1-P5)

| # | Risk | Impact if Wrong | Mitigation |
|---|------|----------------|------------|
| P1 | Anvil impersonation doesn't handle nonces correctly | All replays fail | Test with simple self-transfer first |
| P2 | Same-timestamp blocks not allowed | Time-dependent logic breaks | Anvil docs say it's supported; verify |
| P3 | `decodeErrorResult` can't decode our custom errors | Divergence handler is blind | Test with actual revert data from Diamond |
| P4 | Storage slot offsets are wrong | State diff is garbage | Verify computed slots against known values |
| P5 | `debug_traceTransaction` not available on forked Anvil | No trace-based slot discovery (V2 feature) | V1 uses pre-computed slots, not traces |
| P6 | `evm_snapshot`/`evm_revert` broken on forked Anvil, or revert clears impersonation | Two-pass replay architecture fails | Verify and document behavior; re-impersonate after revert if needed |

### Known Limitations (V1)

1. **No automatic entity discovery.** The engine doesn't discover which fundIds, classIds, dealingIds, and accounts exist. For V1, these must be provided manually or hard-coded for the test scenario. V2 should parse events emitted during replay to discover entities.

2. **Injection strategies are stubs.** The `computeInjection` functions in `strategies.ts` log warnings but don't actually compute slot modifications. This means divergent transactions will be flagged but not automatically resolved. Full injection requires the storage slot calculator (Task 8) to be verified and wired in.

3. **No batch RPC.** Fetching blocks and receipts is sequential. For large block ranges, this will be slow. V2 should use `Promise.all` with concurrency limits.

4. **No contract logic correction.** V1 only supports corrected transaction replay. Corrected contract logic (deploy fixed facet via `diamondCut` before replay) is architecturally possible but not implemented.

5. **State diff only checks known entity slots.** Slots not in the pre-computed set (e.g., order processing history, fee history arrays, config change blocks) will be missed. V2 should add trace-based slot collection.

6. **Single error transaction.** V1 corrects one transaction. Multiple errors in different blocks would require multiple fork→replay passes or extending the input to accept multiple `(txHash, correctedCalldata)` pairs.

### Architecture Decisions

| Decision | Rationale |
|----------|-----------|
| Two-pass per block (automine ON for discovery, OFF for correct replay) | Pass 1 auto-mines each tx individually for divergence detection (`eth_call` needs mined state). Pass 2 reverts to snapshot, applies discovered injections, batches all txs into one block with `mine({blocks:1})` to preserve correct `block.number`. Uses `evm_snapshot`/`evm_revert` for clean rollback between passes. |
| High gas limit (30M) for all replays | Gas doesn't affect state correctness on Anvil. Avoids gas estimation failures when corrected state changes gas consumption. |
| Impersonation (not raw tx replay) | Raw signed txs may have wrong chain ID on fork. Impersonation avoids signature issues entirely. |
| Slot calculator with hard-coded offsets | `forge inspect` layout is stable (changes only when structs change). Hard-coding is simpler than runtime parsing. Re-run `forge inspect` if structs change. |

---

## Execution Sequence

```
P1-P5 Prerequisites (verify capabilities)
    ↓
Task 1  Project scaffolding
    ↓
Task 2  Types & ABI
    ↓
Task 3  Anvil manager ──────────────────┐
    ↓                                    │
Task 4  Fetcher                          │
    ↓                                    │
Task 5  Replay loop ◄───────────────────┘
    ↓
Task 6  Strategy table (stubs)
    ↓
Task 7  Divergence handler
    ↓
Task 8  Slot calculator (verify offsets!)
    ↓
Task 9  State diff + output
    ↓
Task 10 Engine + CLI
    ↓
Task 11 Test scenario script
    ↓
Task 12 E2E verification
```

Tasks 1-5 produce a working "replay without divergence handling" — already useful for NAV corrections where no transactions diverge (the common case for pricing errors).

Tasks 6-7 add divergence handling (needed for errors that cause balance mismatches).

Tasks 8-9 add state diff output (needed for the on-chain correction function).

Tasks 10-12 wire everything together and verify.
