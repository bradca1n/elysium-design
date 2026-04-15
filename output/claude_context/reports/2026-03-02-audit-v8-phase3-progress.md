# Audit V8 — Phase 3 Progress Summary (Agents 1-3)
<!-- MID-PHASE-3 GATE — 2026-03-02 -->

## Summary Table

| Agent | Scope | C | H | M | L | I | Total |
|-------|-------|---|---|---|---|---|-------|
| Agent 1 | AccountFacet + OrderManagementFacet | 2 | 3 | 4 | 3 | 0 | 12 |
| Agent 2 | FundTokensFacet + FundManagementFacet | 0 | 2 | 3 | 3 | 1 | 9 |
| Agent 3 | NavManagementFacet + FeeManagementFacet | 0 | 0 | 4 | 6 | 2 | 12 |
| **Subtotal** | | **2** | **5** | **11** | **12** | **3** | **33** |

---

## Critical Findings (Agents 1-3)

### ARCH-01 / V8-A1-C01 / V8-T02: internalExecutionContext Bypass
**Confirmed by:** Agent 1 (multisig path) AND Agent 2 (FundTokensFacet mint path)
- During `_executeProposal`, `reentrancyLock=true` and `internalExecutionContext=true`
- Any ERC1155 token recipient can directly call `execute*` functions because `onlyInternalExecution` only checks `internalExecutionContext`, NOT `reentrancyLock`
- ALL execute* functions are callable by any smart contract that receives ERC1155 tokens
- **Fix:** Add `reentrancyLock` check to `onlyInternalExecution` modifier, or implement diamond-level guard

### V8-A1-C02: TokenId Mutation on Partial Fill (E-BC22 STILL PRESENT)
- `order.tokenId` overwritten from classId to dealingId at `OrderManagementFacet.sol:304`
- Subsequent partial fills use dealingId as classId in price calculation → wrong prices
- **Fix:** Store original classId separately; don't overwrite tokenId

---

## High Findings (Agents 1-3)

| ID | Title | Status |
|----|-------|--------|
| V8-A1-H01 | Schedule timestamps not validated (E-BC27) | STILL PRESENT |
| V8-A1-H02 | MAX_ADJUSTED_FEE_RATE_BPS never enforced (E-BC28) | PARTIAL FIX |
| V8-A1-H03 | Any operator can cancel any proposal (DoS) | NEW |
| V8-T01 | Dual totalSupply divergence — dealing conversion (E-BC25) | STILL PRESENT |

---

## Medium Findings (Agents 1-3)

| ID | Title |
|----|-------|
| V8-A1-M01 | Account address uses block.number → non-deterministic |
| V8-A1-M02 | Operator cycling inflates confirmation count |
| V8-A1-M03 | Threshold re-computed at confirmation time (owner can lower mid-proposal) |
| V8-A1-M04 | Missing events for tokenId mutation + NAV change during processing |
| V8-T03 | Dual owner model — FundTokens owner ≠ Diamond owner (ARCH-03) |
| V8-T04 | Cash token onramp/offramp never updates baseInfo.totalSupply |
| V8-T05 | Unvalidated dealing schedule timestamps (E-BC27 reconfirmation) |
| V8N-01 | Management fee calculated using OLD stored NAV (1 block delay) |
| V8N-03 | Dealing state can deadlock in AWAITS_FEE_PROCESSING |
| V8N-05 | Dual totalSupply divergence — fee dealing level |
| V8N-07 | Risk adjustor fail-open → full fee charged if adjustor removed |

---

## Catalog Pattern Status After Agents 1-3

| E-BC ID | Description | Status |
|---------|-------------|--------|
| E-BC04 | Dealing ID off-by-one | FIXED |
| E-BC07 | Fund vs class dilution direction | FIXED |
| E-BC12 | Storage layout append-only | NOT VIOLATED |
| E-BC16 | Public functions without access control | FIXED |
| E-BC18 | Safety config disabled-at-zero | STILL PRESENT (by design) |
| E-BC19 | Dual state tracking | STILL PRESENT |
| E-BC20 | ERC1155 callback reentrancy | STILL PRESENT |
| E-BC22 | TokenId mutation on partial fill | STILL PRESENT |
| E-BC24 | No Diamond-level reentrancy guard | STILL PRESENT |
| E-BC25 | Dual totalSupply divergence | STILL PRESENT |
| E-BC27 | Unvalidated schedule timestamps | STILL PRESENT |
| E-BC28 | Uncapped caller-supplied fee BPS | PARTIALLY FIXED |
| E-BC29 | NAV stale data cascade | FIXED |

---

## Key Insight: The Most Pervasive Issue

**Dual totalSupply divergence (E-BC25)** is the most architecturally pervasive finding. It manifests in at least 3 independent code paths:
1. `_batchConvertDealingTokensInternal` — burns/mints without updating `baseInfo.totalSupply`
2. `_onrampInternal` / `_offrampInternal` — cash token mint/burn without updating `baseInfo.totalSupply`
3. `mintAllPendingManagementFees` — dealing-level `baseInfo.totalSupply` not updated

The root cause is that `FundTokensFacet._update()` and `FundAdminStorage.baseInfo[].totalSupply` are two independent accounting systems with no synchronization hook.

---

*Written: 2026-03-02 — MID-PHASE-3 GATE checkpoint*
