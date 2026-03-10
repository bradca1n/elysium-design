# Error Correction Engine

<!-- ~12000 tokens -->
**Last Updated:** 2026-02-12

---

## Executive Summary

The Error Correction Engine is a general-purpose "what-if" replay system that answers: **"What should the on-chain state be now, if a past error hadn't occurred?"** It forks the blockchain before the error, injects the correction, replays all subsequent transactions, and produces a state diff that can be atomically applied on-chain.

**Key design decisions:**

- **Error-type-agnostic.** The engine handles all error types (pricing, FX, fee, share count, allocation, performance fee) identically: fork → inject → replay → diff. Multiple errors are N corrections injected before a single replay.
- **Transaction-preserving.** Every transaction that historically succeeded must succeed in replay. Regulatory requirement (CSSF 24/856): transactions are irrevocable facts; correction is compensation, not reversal. Divergent transactions are handled via state injection, classified as COMPENSATORY (real economic difference) or PASSTHROUGH (technical bypass, restored after execution).
- **Three outputs.** (1) State diff → on-chain atomic correction via `applyErrorCorrection()`. (2) Compensation ledger → per-investor settlement. (3) Notification log → product decisions for edge cases (e.g., min price violations).

**Recommended implementation:** TypeScript + viem + Anvil. Anvil forks the full node, handles all EVM execution via RPC. TypeScript orchestrates replay logic, injection strategies, and diff extraction. ~600 lines, 1-2 days to build PoC. Port to Rust + revm if performance requires it.

---

## Table of Contents

1. [Problem Statement](#1-problem-statement)
2. [Regulatory Framework](#2-regulatory-framework)
3. [Architecture Overview](#3-architecture-overview)
4. [Implementation: RPC, EVM, and Language Options](#4-implementation-rpc-evm-and-language-options)
5. [Transaction Divergence](#5-transaction-divergence)
6. [Injection Taxonomy](#6-injection-taxonomy)
7. [Injection Strategy Table](#7-injection-strategy-table)
8. [State Diff Extraction](#8-state-diff-extraction)
9. [On-Chain Correction Function](#9-on-chain-correction-function)
10. [Three Outputs](#10-three-outputs)
11. [End-to-End Pipeline](#11-end-to-end-pipeline)
12. [Cross-References](#12-cross-references)

---

## 1. Problem Statement

When a NAV error enters the system (wrong price, bad FX rate, incorrect fee, wrong share count), it propagates through all downstream operations: every subsequent price calculation, fee accrual, order execution, and dilution update is contaminated. The three-level dilution system (`fundDilution → classDilution → dealingDilution`) means errors cascade through the entire price chain.

The core question: **"What should the correct state be now, given that the error happened at block N?"**

The logic is always the same regardless of error type:

1. Fork blockchain state at the block before the error
2. Inject the corrected state (fix NAV, FX rate, fee rate, etc.)
3. Replay ALL subsequent transactions in original order
4. Compare the resulting state to the actual current state
5. The diff IS the correction

Error types do not matter to the engine — they are all handled identically via fork→inject→replay→diff. Multiple errors are simply N corrections injected before a single replay.

---

## 2. Regulatory Framework

### Materiality Determines Method

| Error Size | Method | Procedure |
|-----------|--------|-----------|
| **Above threshold** (0.5–1.0% of NAV per CSSF/CBI) | **Full restatement** | Recalculate correct NAV for every affected date, identify all affected investors, compute per-investor compensation |
| **Below threshold** | **Prospective correction** | Correct input going forward, book one-time adjustment, no investor-level reprocessing |

There is no regulatory choice between "restatement" and "as-of correction." The materiality threshold determines the method. The replay engine implements the full restatement calculation.

### The No-Reversal Principle

Across all jurisdictions (CSSF Circular 24/856, CBI CP130, SEC Rule 22c-1): **transactions are irrevocable facts. Correction is compensation, not reversal.**

- The restatement recalculates what the correct outcome **should have been**
- The difference between actual and correct = compensation amount
- No transaction is ever reversed or undone
- Large administrators already have "NAV rerun engines" that replay the entire calculation chain — this engine is the on-chain equivalent

### Compensation Asymmetry

| Investor Type | Benefited from Error | Harmed by Error |
|--------------|---------------------|-----------------|
| **Retail** | Cannot claw back — fund absorbs loss | Must compensate |
| **Professional/Institutional** | Can request reimbursement | Must compensate |

**Notification thresholds:** CSSF: 4–8 weeks from detection. Auditor special report if compensation >EUR 50,000 total or >EUR 5,000 per investor. CBI: similar. SEC: industry practice ~0.50% of NAV.

---

## 3. Architecture Overview

```
Full Node (Reth)              Anvil (forked)              TypeScript Wrapper
────────────────              ──────────────              ──────────────────
Historical state  ◄── lazy    Fork at block N             Orchestration
Historical txs         load   State injection             Injection logic
Current state                 TX execution                Diff comparison
Traces                        Traces                      Output formatting
                              "What-if" timeline
READ ONLY                     READ/WRITE                  LOGIC
(source of truth)             (simulation sandbox)        (brain)
```

Three components with clean separation of concerns:

1. **Full node** (existing Reth/Geth): Provides historical state, historical transactions, and current state for comparison. Read-only — performs zero simulation.
2. **Anvil** (forked from full node): The execution sandbox. Forks at the error block, accepts state injections, executes replayed transactions, provides traces.
3. **TypeScript wrapper**: Orchestrates the replay loop, applies injection strategies, computes diffs, formats outputs.

### Key Properties

- **All transactions replayed**: No filtering. Diamond's shared `AppStorage` means everything is interconnected — account creation, eligibility changes, cross-fund operations all affect shared state.
- **Block timestamps matched**: Replay sets each block's timestamp to match the original via `evm_setNextBlockTimestamp`, ensuring accurate time-dependent calculations (fee accruals, dealing schedules).
- **Private chain advantage is convenience, not capability**: Free archive nodes, no external dependencies. The technique works on any EVM chain.

---

## 4. Implementation: RPC, EVM, and Language Options

### Why a Separate Simulation Environment is Required

Standard Ethereum JSON-RPC cannot support sequential replay:

- **`eth_call` with `stateOverrides`** simulates a single call with modified state, but state changes **do not persist** between calls. Each call executes against the same base state.
- To replay N sequential transactions (where each depends on the previous one's state changes), you would need to accumulate all SSTOREs as overrides — growing to thousands of slots, O(N²) total work, wrong block context. Impractical beyond ~100 transactions.
- **No standard RPC method for persistent state injection.** Geth and Reth have no `setStorageAt` equivalent — only Anvil and Hardhat dev nodes support this.

**Conclusion:** The full node provides data; a separate execution environment (Anvil or embedded EVM) provides the simulation sandbox.

### Relevant RPC Methods

| Method | Available On | Purpose in Engine |
|--------|-------------|-------------------|
| `eth_getBlockByNumber(block, true)` | All clients | Fetch original transactions for replay |
| `eth_getStorageAt(addr, slot, block)` | All clients | Read historical/current state for comparison |
| `debug_traceTransaction(hash, {tracer})` | Geth, Reth, Anvil | Trace original execution (SLOADs, state changes) |
| `trace_replayBlockTransactions(block, ["stateDiff"])` | Reth, Erigon | Per-tx state diffs for original execution |
| `anvil_setStorageAt(addr, slot, value)` | Anvil only | **Persistent** state injection |
| `anvil_impersonateAccount(addr)` | Anvil only | Send txs as any account without signatures |
| `evm_setNextBlockTimestamp(ts)` | Anvil, Hardhat | Match original block timestamps |
| `evm_snapshot() / evm_revert(id)` | Anvil, Hardhat | Save/restore state during injection retries |

### Three Implementation Approaches

#### A. Anvil + TypeScript/Python Wrapper (Recommended)

Anvil forks the full node at block N, lazily loads state on demand. The wrapper script orchestrates replay via RPC calls.

| Aspect | Detail |
|--------|--------|
| Execution | Anvil handles all EVM execution |
| State injection | `anvil_setStorageAt` (persistent) |
| TX replay | `eth_sendRawTransaction` or impersonated `eth_sendTransaction` |
| Traces | `debug_traceTransaction` on Anvil |
| State comparison | `eth_getStorageAt` on both node and Anvil |
| Performance | ~1,000-5,000 txs/sec locally; 50K txs in 30-120 seconds |
| Dev effort | ~600 lines TypeScript, 1-2 days |

#### B. Embedded EVM (Rust revm / Python pyrevm)

Load state from node RPC into an in-memory EVM, modify directly, execute directly.

| Aspect | Detail |
|--------|--------|
| Execution | revm in-process, no RPC overhead |
| State injection | Direct memory write (`db.insert_account_storage`) |
| State diff | Native `Inspector` trait — zero-cost SSTORE tracking |
| Performance | 5-20 seconds for 50K txs |
| Dev effort | ~2,000 lines Rust, 1-2 weeks |

Advantage: fastest execution, maximum control. Disadvantage: highest development effort. Justified when replay involves millions of transactions or when the engine runs as a production service.

#### C. Pure Node RPC (Not Viable)

Accumulating `stateOverrides` across sequential `eth_call` / `debug_traceCall` invocations. O(N²), wrong block context, no nonce tracking. **Impractical beyond ~100 transactions.**

### Language Comparison

| | TypeScript + Anvil | Python + Anvil | Rust + revm |
|---|---|---|---|
| **Dev time** | 1-2 days | 2-3 days | 1-2 weeks |
| **Lines of code** | ~600 | ~800 | ~2,000 |
| **RPC library** | viem (excellent Anvil integration) | web3.py (manual Anvil RPCs) | alloy (good, newer) |
| **Revert decoding** | `decodeErrorResult` built-in | Manual ABI decode | Manual ABI decode |
| **Performance** | Good (Anvil handles execution) | Good (Anvil handles execution) | Best (no RPC overhead) |
| **Production path** | Wrap as API service | Wrap as API service | Compile to binary |

### Recommendation

**PoC: TypeScript + viem + Anvil.** viem's `createTestClient` has first-class methods for every Anvil RPC (`setStorageAt`, `impersonateAccount`, `mine`, `snapshot`, `revert`). Built-in `decodeErrorResult` for parsing custom error revert data. The entire injection strategy table + replay loop + diff output fits in ~600 lines.

**Production (if needed): port to Rust + revm.** The architecture is identical — only the execution layer changes. No design rework required.

---

## 5. Transaction Divergence

When replaying with corrected state, each original transaction falls into one of four scenarios:

| Scenario | Original | Replay | Handling |
|----------|----------|--------|----------|
| **A** | Success | Success | Normal — different numerical outcomes, both execute |
| **B** | Revert | Revert | Normal — both failed, no state change |
| **C** | Revert | Would succeed | **Nonce no-op** — replace with self-transfer to consume nonce without state change. The user already experienced the failure and adapted. |
| **D** | Success | Would revert | **Inject-and-track** — inject state to prevent revert, track injection. The transaction happened and cannot be undone (§6). |

### Why Flag-and-Skip Fails

Skipping a divergent transaction corrupts all downstream state. If a subscription is skipped: NAV is too low, fixed costs propagate as higher percentage, all subsequent NAVs are wrong. The correction becomes useless until manual resolution. Building the inject-and-track system is simpler than handling cascading errors from skipped transactions.

### Nonce Handling

Reverted transactions still consume nonces. Scenario C (revert→would succeed): replace with impersonated self-transfer (`{from: sender, to: sender, value: 0}`) at the same nonce. Consumes nonce, changes no state.

---

## 6. Injection Taxonomy

Every state modification during replay falls into one of three categories:

| Type | Purpose | Lifetime | Part of Correction? | Output |
|------|---------|----------|--------------------|---------|
| **CORRECTIVE** | Fix the original error | Permanent (initial) | Yes — it IS the correction | State diff |
| **COMPENSATORY** | Prevent balance-related revert | Permanent | Yes — real economic difference | Compensation ledger |
| **PASSTHROUGH** | Bypass non-balance condition | **Temporary — restored after tx** | **No** | Notification log |

### CORRECTIVE

The initial error fix applied at the fork point (e.g., NAV $1.00 → $1.10). Injected once before replay begins.

### COMPENSATORY

Balance/quantity injections to prevent insufficient-balance reverts. Example: investor has 909 shares (corrected) but historically redeemed 1000. Inject +91 shares so the redemption processes.

The deficit amount IS the regulatory compensation figure. After injection and execution:

```
Before injection: investor has 909 shares, totalSupply = X
Inject 91:        investor has 1000, totalSupply = X + 91
Redeem 1000:      investor has 0,    totalSupply = X - 909
Net: totalSupply decreased by 909 (correct), not 1000 (original/wrong)
```

The injection produces the correct final state while preserving the transaction's execution.

### PASSTHROUGH

Condition bypasses for validation checks (min price, max price, capacity, eligibility) where the condition was not met under corrected state but the transaction historically executed.

- Applied before the transaction, **restored immediately after**
- Not a debt, not a payment, not an economic correction
- Generates a notification for product/ops review
- Example: min price $1.05, corrected dealing price $1.03. Order historically executed at $1.06 (above min). Bypass allows execution at corrected price. Notification: "Order #42 min price not met — product decision required."

### Lifecycle During Replay

```
for each transaction:
  1. Save current state of passthrough target slots
  2. Apply COMPENSATORY injections (permanent)
  3. Apply PASSTHROUGH injections (temporary)
  4. Execute transaction
  5. RESTORE passthrough slots to saved values
  6. Record: compensatory → compensation ledger, passthrough → notification log
```

---

## 7. Injection Strategy Table

The engine framework is general (try → fail → parse revert → look up strategy → inject → retry). The strategy table is domain-specific — a mapping from Solidity custom error names to injection logic:

```typescript
interface InjectionStrategy {
    errorName: string;
    type: 'COMPENSATORY' | 'PASSTHROUGH';
    computeInjection: (errorArgs, originalChain) => SlotModification[];
    revertAfterTx: boolean;
    notificationTemplate: string;
}
```

| Custom Error | Type | Injection | Revert After? |
|-------------|------|-----------|---------------|
| `ERC1155InsufficientBalance` | COMPENSATORY | Set balance to `needed` | No |
| `InsufficientCashBalance` | COMPENSATORY | Set cash balance to needed | No |
| `OrderMinPriceNotMet` | PASSTHROUGH | Set minPrice to 0 | Yes |
| `OrderMaxPriceExceeded` | PASSTHROUGH | Set maxPrice to max uint | Yes |
| `FundCapacityExceeded` | PASSTHROUGH | Set capacity to max uint | Yes |
| `InvestorNotEligible` | PASSTHROUGH | Set eligibility to true | Yes |
| `DealingNotOpen` | PASSTHROUGH | Set dealing state to open | Yes |

~10-15 entries for our Diamond. Static — only changes when the contract's revert conditions change.

### Combined Failures

When a transaction has multiple failing conditions (e.g., insufficient balance AND min price not met), the retry loop handles them naturally — each iteration peels off one revert reason:

```
Attempt 1 → ERC1155InsufficientBalance → inject balance (COMPENSATORY)
Attempt 2 → OrderMinPriceNotMet → inject min price (PASSTHROUGH)
Attempt 3 → succeeds
After tx → restore min price, keep balance injection
```

### Unknown Reverts

If a revert reason is not in the strategy table: flag for manual review, replace transaction with nonce no-op, continue replay.

### Why Trace-Guided Injection Doesn't Work

Identifying the "gate slot" via EVM opcode trace (finding the SLOAD before REVERT) is unreliable: balance may be loaded many SLOADs before the `require` check; revert conditions can depend on calculations from multiple SLOADs; optimized bytecode obfuscates the data flow.

The revert reason (custom error name + parameters) is the reliable signal. Custom errors are machine-parseable and their parameters contain the values needed to compute the injection slot (e.g., `ERC1155InsufficientBalance` provides `account`, `tokenId`, `balance`, `needed`).

---

## 8. State Diff Extraction

### Slot-Level Diff (Complete)

After replay, compare storage at known entity slots between the original chain and the replay fork. For known entities (fund IDs, class IDs, dealing IDs, account addresses — all discoverable from events emitted during replay):

```
slot = keccak256(abi.encode(entityId, baseSlot)) + memberOffset
```

`baseSlot` and `memberOffset` come from Foundry's storage layout (`forge inspect <Facet> storage-layout --json`). The layout provides struct member offsets and mapping base slots but does NOT resolve specific mapping keys. Key resolution requires computing `keccak256(key, baseSlot)` for known keys — the universe of keys is bounded and known from events.

### View Function Diff (Human-Readable)

Call `funds()`, `classes()`, `baseInfo()`, `balanceOf()`, `dealings()` on both chains for all known entities:

```
baseInfo[classId=0x0001000100010001].totalSupply:  1000000 → 998500
baseInfo[classId=0x0001000100010001].dilutionRatio: 1.05e18 → 1.048e18
funds[fundId=0x00010001].nav:                      5000000 → 4985000
dealings[dealingId].hwm:                           1.12e18 → 1.10e18
balanceOf[investor][dealingId]:                     500 → 495
```

**Use both:** Slot-level for completeness (nothing missed), view functions for readability (human review).

---

## 9. On-Chain Correction Function

A general-purpose assembly `sstore` function in the Diamond. Since all storage is in the same contract (EIP-2535), a single facet function can write any `AppStorage` slot.

```solidity
function applyErrorCorrection(
    uint256 correctionId,
    uint256 affectedFundId,
    uint256 errorBlockNumber,
    bytes32[] calldata slots,
    bytes32[] calldata expectedOldValues,
    bytes32[] calldata newValues
) external onlyRole(ROLE_ADMIN) {
    require(slots.length == expectedOldValues.length
         && slots.length == newValues.length, "length mismatch");

    for (uint256 i = 0; i < slots.length; i++) {
        bytes32 slot = slots[i];
        bytes32 current;
        assembly { current := sload(slot) }

        require(current == expectedOldValues[i], "stale correction");

        assembly { sstore(slot, newValues[i]) }

        emit SlotCorrected(slot, current, newValues[i]);
    }

    emit ErrorCorrectionApplied(correctionId, affectedFundId, errorBlockNumber, slots.length, msg.sender);
}
```

### Design Properties

- **Compare-and-swap (CAS)**: If ANY slot changed between replay and application (e.g., new transaction came in), the entire correction atomically reverts. Rerun engine, try again.
- **Atomic**: Single transaction, all-or-nothing.
- **Direct mapping**: Engine output `(slot[], old[], new[])` maps 1:1 to function parameters. Zero translation layer.
- **Safe from Diamond collision**: `AppStorage` (slot 0) and `DiamondStorage` (`keccak256("diamond.standard.diamond.storage")`) occupy different slot namespaces.
- **Access control**: Restricted to highest privilege. Production: multisig + timelock.
- **Audit trail**: Per-slot events + correction-level event with business context (correctionId, fundId, error block).

---

## 10. Three Outputs

| # | Output | Source | Consumer | Purpose |
|---|--------|--------|----------|---------|
| 1 | **State diff** `(slot[], old[], new[])` | CORRECTIVE + COMPENSATORY | `applyErrorCorrection()` | Atomic on-chain state update |
| 2 | **Compensation ledger** (per-investor) | COMPENSATORY only | Finance / settlement team | Checks, share issuance, clawback requests |
| 3 | **Notification log** (per-tx) | PASSTHROUGH only | Product / ops team | Edge case decisions (min price, capacity, eligibility) |

The state diff does NOT include PASSTHROUGH modifications (those are restored during replay). The compensation ledger provides the regulatory-required per-investor impact assessment. The notification log captures product-level decisions that no algorithm can make.

---

## 11. End-to-End Pipeline

```
DISCOVERY          REPLAY ENGINE          REVIEW             ON-CHAIN           OFF-CHAIN
─────────          ─────────────          ──────             ────────           ─────────

Error detected     1. Start Anvil         3. Review          4. applyError      5. Compensation
(recon, audit,        forked at block N      state diff         Correction()       checks
investor query)    2. Inject correction      (readable)         (atomic CAS        Clawback
                      Replay ALL txs         Review               sstore)          requests
                      Match block times      compensation      Events for         CSSF/CBI
                      Inject-and-track       ledger             audit trail        notification
                      divergent txs          Review                                Auditor
                      Nonce-noop             notifications                         special report
                      reversed txs           Approve                               (if >€50K)

                   OUTPUT:
                   ├─ State diff ──────────────────────────> applyErrorCorrection()
                   ├─ Compensation ledger ──────────────────────────────────────> Settlement
                   └─ Notification log ─────────────────────────────────────────> Ops review
```

### Replay Engine Loop (Pseudocode)

```typescript
// 1. Setup
const node = createPublicClient({ transport: http(nodeRpcUrl) });
const anvil = createTestClient({ mode: 'anvil', transport: http(anvilRpcUrl) });

// 2. Inject corrections
for (const { slot, value } of corrections) {
    await anvil.setStorageAt({ address: diamond, index: slot, value });
}

// 3. Replay
for (const block of getBlocks(node, forkBlock + 1, headBlock)) {
    await anvil.setNextBlockTimestamp({ timestamp: block.timestamp });

    for (const tx of block.transactions) {
        if (originalReceipts[tx.hash].status === 'reverted') {
            await sendNonceNoop(anvil, tx.from, tx.nonce);
            continue;
        }

        const injections: Injection[] = [];

        while (true) {
            const result = await tryReplay(anvil, tx);
            if (result.success) break;

            const { errorName, args } = decodeErrorResult({
                abi: diamondAbi, data: result.revertData
            });
            const strategy = STRATEGIES[errorName];

            if (!strategy) {
                notifications.push({ type: 'UNKNOWN_REVERT', tx, error: errorName });
                await sendNonceNoop(anvil, tx.from, tx.nonce);
                break;
            }

            const mods = await strategy.computeInjection(args, node, tx);
            for (const mod of mods) {
                if (strategy.revertAfterTx) {
                    mod.saved = await anvil.getStorageAt({
                        address: diamond, slot: mod.slot
                    });
                }
                await anvil.setStorageAt({
                    address: diamond, index: mod.slot, value: mod.newValue
                });
            }
            injections.push({ strategy, mods });
        }

        for (const inj of injections) {
            if (inj.strategy.revertAfterTx) {
                for (const mod of inj.mods) {
                    await anvil.setStorageAt({
                        address: diamond, index: mod.slot, value: mod.saved
                    });
                }
                notifications.push(formatPassthrough(inj, tx));
            } else {
                compensations.push(formatCompensation(inj, tx));
            }
        }
    }

    await anvil.mine({ blocks: 1 });
}

// 4. Extract diff
const stateDiff = await compareState(node, anvil, knownEntities);
```

---

## 12. Cross-References

### Internal

- **`domain/ERROR_CORRECTION.md`** — Error propagation mechanics, correction approaches, performance fee complexity, compensation formulas, regulatory thresholds
- **`domain/ERROR_SCENARIOS_AND_CRISIS.md`** — Error taxonomy, crisis playbooks
- **`domain/NAV_METHODOLOGY.md`** — NAV calculation chain, materiality thresholds (CSSF 24/856, CBI CP130, SEC), swing pricing
- **`domain/RECONCILIATION_AND_OPS.md`** — NAV error correction procedure (Section 7), daily NAV production cycle
- **`technical/SMART_CONTRACTS.md`** — Diamond architecture, AppStorage layout, token ID encoding, price chain, dealing state machine
- **`contracts/CLAUDE.md`** — Test helpers, build commands, return value destructuring

### External

- [CSSF Circular 24/856 — Dechert Analysis](https://www.dechert.com/knowledge/onpoint/2024/4/new-cssf-circular-on-nav-errors-and-investment-rule-breaches.html)
- [EY Luxembourg — Circular 24/856](https://www.ey.com/en_lu/insights/wealth-asset-management/circular-24-856-nav-calculation-errors)
- [Harneys — CSSF Circular 24/856 Guidelines](https://www.harneys.com/our-blogs/regulatory/key-guidelines-of-cssf-circular-24-856-on-investor-protection-nav-errors-breach-of-investment-restrictions-and-other-errors/)
- [SEC NAV Error Reimbursement — FinOps](https://finopsinfo.com/investors/sec-no-shortcuts-when-reimbursing-investors-for-nav-errors/)
- [CBI CP130 — Treatment of Errors in Investment Funds](https://www.mccannfitzgerald.com/knowledge/asset-management-and-investment-funds/central-bank-of-ireland-consults-on-treatment-correction-and-redress-of-errors-in-investment-funds)
- [CSSF FAQ on Circular 24/856](https://www.cssf.lu/en/2024/12/the-cssf-issues-the-new-faq-on-circular-cssf-24-856-concerning-the-protection-of-investors-in-case-of-an-nav-calculation-error-an-instance-of-non-compliance-with-the-investment-rules-and-other-errors/)
