# V9 Phase 4: Cross-Facet Analysis — 2026-03-03

## Attack Chains Analyzed

### Chain 1: Batch Callback Bypass (V9-A-C01) — DOWNGRADED to MEDIUM

**Path:** FundTokensFacet._checkOnERC1155BatchReceived → no inExternalCallback guard
**Analysis:** No internal execution path currently triggers batch callbacks. All mints use singleton arrays via `_mint`. Even nested callbacks from within a single-token callback maintain `inExternalCallback=true` from the outer callback.
**Exploitability:** NOT CURRENTLY EXPLOITABLE
**Residual risk:** Future code adding batch mints during internal execution would bypass ARCH-01 guard.
**Recommendation:** Add `inExternalCallback` guard to `_checkOnERC1155BatchReceived` for consistency.

### Chain 2: V9-CF-01 — Fund-Level Blocking Non-Functional (NEW, HIGH)

**Compound finding from:** V9-A-H01, V9-D04, V9-D05
**Facets affected:** BlockFacet × ALL other facets

The fund-level blocking mechanism has three components:
1. `BlockFacet.executeSetFundBlock()` → writes `s.FundAdmin[0].fundBlocked[fundId] = true` ✓
2. `BaseFacet._requireFundNotBlocked(fundId)` → reads the flag and reverts ✓
3. **No execute* function calls `_requireFundNotBlocked`** ✗

The helper function exists but is NEVER used. Fund-level blocking is dead code for on-chain enforcement.

**Impact:** During incident response, admin blocks a fund thinking operations are halted. In reality:
- NAV updates continue
- Orders can be submitted and processed
- Fees continue minting
- Settlement proceeds normally
- Only off-chain API enforcement would block operations

**Recommendation:** Add `_requireFundNotBlocked(fundId)` to all fund-scoped execute* functions. Extract fundId from functionData where necessary.

### Chain 3: V9-CF-02 — Protocol Block Allows Token Transfers (LOW)

**Facets affected:** BlockFacet × FundTokensFacet
**Analysis:** `safeTransferFrom` and `safeBatchTransferFrom` lack `whenNotBlocked` modifier. During a protocol-level block, token transfers continue freely.
**Mitigated by:** Private blockchain — all access via Elysium API which can enforce blocking. No external DEXes or bridges for value extraction.
**Recommendation:** Consider adding a check, but evaluate ERC1155 compliance implications.

### Chain 4: V8-CF06/CF07 Residual — Risk Adjustor Removal Deadlock (MEDIUM)

**Status:** Mostly fixed by Fixes 5, 7, 13, 19, 20.
**Residual scenario:**
1. Admin configures risk adjustor on class C (selector routes to RiskAdjustorFacet)
2. Admin removes RiskAdjustorFacet via diamondCut
3. Performance fee processing for class C → `staticcall` to removed selector → fails
4. Fix 19's fail-closed behavior reverts with `RiskAdjustorFailed`
5. ALL performance fee batch processing for the fund that includes class C is blocked
6. If perf fee processing is required for dealing conversion (V8-FMV-05), dealing pipeline also blocked

**Impact:** Admin operational error causes permanent perf fee deadlock for affected fund.
**Recommendation:** Before diamondCut removes a facet, validate no active configuration references the facet's selectors.

### Chain 5: V9-CF-03 — ProtocolSafetyConfig All-or-Nothing Update (NEW, MEDIUM)

**Facets affected:** NavManagementFacet (setProtocolSafetyConfig)
**Analysis:** `setProtocolSafetyConfig` requires all 8 parameters. Updating one parameter requires re-passing all others. Accidentally setting any to 0 disables that safety check (E-BC18 pattern).
**Impact:** Admin updating one safety parameter could accidentally disable another:
- `maxPerfFeeRateBps = 0` → uncapped performance fees
- `maxAdjustmentBps = 0` → uncapped adjustments
- `maxBenchmarkStaleness = 0` → 7-day default (safe, actually)
**Recommendation:** Add per-field update functions, or require non-zero values for safety-critical parameters, or require explicit "disable" flag rather than zero.

### Chain 6: V8-6-01 Off-By-One Confirmed (MEDIUM)

**Facets affected:** ViewCallsFacet
**Analysis:** `_hasAnyDealingBalance` uses `d < nextDealingId` instead of `d <= nextDealingId`. Same facet uses correct `<=` in `getPendingManagementFees`, confirming this is a bug.
**Impact:** View-only — incorrect API responses. Could affect off-chain decisions about fund closure.

### Chain 7: V9B-05 Swap Currency Mismatch (MEDIUM)

**Facets affected:** OrderManagementFacet
**Analysis:** Swap linking uses fund-currency `result.value` for cross-currency dependent order amount. In multi-currency swaps, the fill detection may use wrong currency denomination.
**Impact:** Dependent subscribe order in a different currency gets wrong amount.

## Summary of Cross-Facet Findings

| ID | Severity | Description |
|----|----------|-------------|
| V9-CF-01 | HIGH | Fund-level blocking entirely non-functional on-chain |
| V9-CF-02 | LOW | Protocol block allows token transfers |
| V9-CF-03 | MEDIUM | ProtocolSafetyConfig all-or-nothing update risk |
| V9-A-C01 | MEDIUM (downgraded) | Batch callback gap — latent, not exploitable |
| V8-CF06/07 | MEDIUM (residual) | Risk adjustor removal causes perf fee deadlock |
