# V7 Audit — Phase 3: Per-Facet Audit Summary

**Date:** 2026-02-12
**Agents:** 6 blockchain-auditor subagents

## Raw Finding Totals (Before Deduplication)

| Agent | Scope | C | H | M | L | I | Total |
|-------|-------|---|---|---|---|---|-------|
| 1 | Account & Access Control | 0 | 4 | 4 | 5 | 2 | 15 |
| 2 | Fund Management & Lifecycle | 1 | 2 | 4 | 4 | 1 | 12 |
| 3 | Order Processing | 1 | 3 | 4 | 2 | 2 | 12 |
| 4 | NAV, Fees & Pricing | 2 | 3 | 5 | 4 | 2 | 16 |
| 5 | Tokens, FX & Settlement | 0 | 3 | 4 | 4 | 2 | 13 |
| 6 | View Functions | 0 | 0 | 3 | 5 | 4 | 12 |
| **Total** | | **4** | **15** | **24** | **24** | **13** | **80** |

## Critical Findings (Pre-Dedup)

1. **Agent 2 V7-A2-01:** Dealing schedule timestamps completely unvalidated (V6-C-05 persists)
2. **Agent 3 V7-C-01:** Subscribe order tokenId mutation corrupts subsequent partial fill pricing
3. **Agent 4 V7-C-01:** Fund-level baseInfo.totalSupply not updated during fee minting (V6-C-01 variant)
4. **Agent 4 V7-C-02:** Performance fee BPS cap not enforced at processing time (V6-C-03 persists)

## Known Duplicates (Cross-Agent)

These findings were reported by multiple agents and need deduplication in Phase 7:

1. **Uncapped perf fee (100%):** Agent 3 V7-H-02 = Agent 4 V7-C-02 (same finding, Agent 4 has better analysis)
2. **Unbounded processOrders:** Agent 3 V7-H-03 (V6-C-06 reclassified as HIGH in Agent 3, MEDIUM in others)
3. **FX bypass via zero defaults:** Agent 5 V7-H-02 + V7-M-01 overlap with Agent 2 V7-A2-02
4. **FX cross-rate validation in orders:** Agent 3 V7-H-01 (orders path) vs Agent 5 (settlement path fixed)
5. **Dual totalSupply divergence:** Agent 4 V7-C-01 + V7-H-03 overlap (both about fee minting divergence)

## Prior Finding Status Summary (Across All Agents)

### Verified FIXED
- C-01 (multisig threshold), C-03/C-04 (eligibility), C-07 (fee rate type), C-08 (NAV safety)
- V3-C01 (proposeTransaction ACL), V3-C02 (mintAllPending ACL), V3-C03 (perf fee validation)
- V5-C01 (settlement reentrancy), V5-C02 (FX cross-rate), V5-H03 (perf fee double-deduct)
- H-06 (settlement FX), V3-H03 (FX staleness), V5-H08 (FX timestamp)
- H-07 (view loops fixed), H-16 (pagination fixed), V3-H04 (countFundInvestors)
- PHASE5-01 (reentrancy guard added)

### STILL PRESENT (Open or Acknowledged)
- V6-C-02: FX validation bypass via zero defaults — **STILL OPEN**
- V6-C-03: Uncapped performance fee — **STILL OPEN**
- V6-C-05: Dealing schedule timestamps unvalidated — **STILL OPEN**
- V6-C-06: Unbounded processOrders — **STILL OPEN**
- V6-C-01: Dual totalSupply divergence (fee minting path) — **STILL OPEN**
- V6-C-07: Perf fee div-by-zero — **PARTIALLY FIXED** (still reverts on zero supply dealing in batch)
- C-02: Cross-umbrella fund isolation — ACKNOWLEDGED
- H-05: Fund closure ignores pending orders — REVERTED
- H-09: Zero-balance holdings never removed — ACKNOWLEDGED
- H-10: Forced redemption TOCTOU — ACKNOWLEDGED
- H-18: Rounding asymmetry — ACKNOWLEDGED

## Key Themes for Phase 4 Cross-Facet Analysis

1. **Fee minting → price corruption cascade** (Agents 3, 4): fee mint updates ERC1155 but not baseInfo, inflating fund price
2. **FX bypass paths** (Agents 3, 5): order processing + settlement both have FX validation weaknesses
3. **Reentrancy gaps** (Agents 1, 5): proposal system protected, but direct ERC1155 transfers are not
4. **Partial fill state corruption** (Agent 3): tokenId mutation cascades through pricing and dealing creation
5. **Zero-default safety configs** (Agents 2, 4, 5): multiple safety mechanisms disabled by default
