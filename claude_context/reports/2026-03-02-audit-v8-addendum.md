# V8 Audit Addendum — 2026-03-02
## Extension: FundManagementValidationFacet + PerfFeeStandardFacet

<!-- Extends: 2026-03-02-security-audit-v8-report.md -->
<!-- Extension design: docs/plans/2026-03-02-audit-v8-extension-design.md -->

---

## Overview

This addendum extends the V8 security audit to cover two previously unaudited facets and redoes the full Phase 4 cross-facet attack chain analysis with all 18 facets in scope.

**New facets audited:**
- `FundManagementValidationFacet` — 8 `external view/pure` validation functions extracted from `FundManagementFacet` for EIP-170 compliance
- `PerfFeeStandardFacet` — HWM + optional hurdle + pluggable risk adjustor performance fee calculator

**Phase 4 update:** Full 18-facet attack chain redo via sequential-thinking (14 thoughts). See `2026-03-02-audit-v8-phase4-xchain-v2.md`.

---

## Finding Totals: Before and After Extension

| Category | V8 Base | Extension (FMV) | Extension (PFS) | V8 Extended Total |
|----------|---------|-----------------|-----------------|-------------------|
| CRITICAL | 2 | 0 | 0 | **2** |
| HIGH | 9 | 0 | 3 | **12** |
| MEDIUM | 21 | 2 | 4 | **27** |
| LOW | 28 | 4 | 2 | **34** |
| INFO | 7 | 2 | 2 | **11** |
| **Total findings** | **67** | **8** | **11** | **86** |
| Cross-facet chains | 7 | +6 new (CF02–CF07) | — | **13 total** (1 fixed, 12 open) |

---

## Extension Findings: FundManagementValidationFacet (V8-FMV-*)

**Audited file:** `contracts/src/facets/FundManagementValidationFacet.sol` (112 lines)
**Full report:** `claude_context/reports/2026-03-02-audit-v8-agent-7-fmv.md`

| ID | Severity | Location | Description |
|----|----------|----------|-------------|
| V8-FMV-01 | MEDIUM | `FundManagementValidationFacet.sol:42-45` | E-BC18 pattern: `maxMgmtFeeRateBps=0` (default) disables the management fee rate safety check; all new funds have zero fee rate protection |
| V8-FMV-02 | LOW | `FundManagementValidationFacet.sol:87-95` | `validateOfframp` missing `umbrella.exists` check (asymmetric with `validateOnramp`); mitigated by downstream balance check |
| V8-FMV-03 | INFO | `FundManagementValidationFacet.sol:17` | All validate* functions externally callable without ACL; no info beyond existing public views; by design |
| V8-FMV-04 | LOW | `FundManagementValidationFacet.sol:93` | Diamond self-call `FundTokensFacet(address(this)).availableBalance()` creates coupling; if FundTokensFacet is removed via diamondCut, validateOfframp breaks |
| V8-FMV-05 | MEDIUM | `FundManagementValidationFacet.sol:64-69` | `lastPerfMintAtNavT` equality check can permanently block legitimate dealing conversions if perf fee processing is non-uniform across dealings |
| V8-FMV-06 | LOW | `FundManagementValidationFacet.sol:19-41` | No upper bound on fund/umbrella/class name length; could cause gas issues for off-chain indexers |
| V8-FMV-07 | LOW | `FundManagementValidationFacet.sol:105-110` | Subscription rule range uses 0-disables pattern (intentional "no limit" semantic; NOT a safety concern — included for completeness) |
| V8-FMV-08 | INFO | `FundManagementValidationFacet.sol:72-95` | Onramp/offramp status asymmetry is intentional (V3-H08) but `validateOnramp` lacks corresponding NatSpec documentation |

### Notable Detail: V8-FMV-01 (E-BC18 in validateShareClassCreation)

```solidity
// FundManagementValidationFacet.sol:42-45
uint16 maxMgmtFeeRateBps = s.FundAdmin[0].protocolSafetyConfigs[fundId].maxMgmtFeeRateBps;
if (maxMgmtFeeRateBps > 0 && mgmtFeeRate > maxMgmtFeeRateBps) {
    revert IFundManagement.MgmtFeeRateExceedsLimit(mgmtFeeRate, maxMgmtFeeRateBps);
}
```

`protocolSafetyConfigs` is a `mapping(uint256 => struct)` — default is zero for all fields. `maxMgmtFeeRateBps=0` means the check `maxMgmtFeeRateBps > 0` is `false` and the entire safety gate is bypassed. Combined with V8-CF02 (ARCH-01 callback + this bypass), a malicious operator can create a share class with 655% fee rates without multisig approval.

### Notable Detail: V8-FMV-05 (Conversion Deadlock)

The `lastPerfMintAtNavT` equality check ensures both dealings are at the same NAV epoch before conversion. If FeeManagementFacet mints fees on one dealing but not its pair (due to V8-PFS-02 panic or mid-iteration failure), the timestamps diverge permanently — dealing conversions are blocked until an admin manually resets the timestamps via diamondCut.

---

## Extension Findings: PerfFeeStandardFacet (V8-PFS-*)

**Audited file:** `contracts/src/facets/PerfFeeStandardFacet.sol` (252 lines)
**Full report:** `claude_context/reports/2026-03-02-audit-v8-agent-8-pfs.md`

| ID | Severity | Location | Description |
|----|----------|----------|-------------|
| V8-PFS-01 | HIGH | `PerfFeeStandardFacet.sol:140-156` | E-BC31 second instance: `_applyRiskAdjustor` staticcall fail-open — any failure silently returns full gain; manager can remove adjustor facet via diamondCut to maximize fees |
| V8-PFS-02 | HIGH | `PerfFeeStandardFacet.sol:46-48` | `abi.decode(params, (uint16, uint256, uint16, uint16))` panics on empty/short `perfFeeParams`; class with empty params permanently deadlocks the dealing pipeline for the entire fund |
| V8-PFS-03 | HIGH | `PerfFeeStandardFacet.sol:117-120` | `hurdleFundId` never validated (no existence check, no same-umbrella check); manager can set non-existent or self-controlled fund ID to permanently eliminate hurdle deduction |
| V8-PFS-04 | MEDIUM | `PerfFeeStandardFacet.sol:118, 122` | `lastPerfMintAtNavT=0` for new dealings: fund-based hurdle skipped for first period; fixed hurdle computes ~54-year elapsed time and absorbs all gain — both directions are wrong |
| V8-PFS-05 | MEDIUM | `PerfFeeStandardFacet.sol:178` | Negative/flat benchmark return yields zero hurdle deduction; correct for absolute hurdle but incorrect if asymmetric benchmark-relative hurdle is intended |
| V8-PFS-06 | MEDIUM | `PerfFeeStandardFacet.sol:24` | `MAX_PRICE_STALENESS = 7 days` hardcoded; manager controlling benchmark fund can stop NAV updates for 8+ days to eliminate hurdle deduction for targeted periods |
| V8-PFS-07 | MEDIUM | `PerfFeeStandardFacet.sol:41-67` | No validation that `classId` exists or `dealingIds` belong to `classId`; mismatched IDs produce wrong fee BPS stored in state; cross-class fee miscalculation possible |
| V8-PFS-08 | LOW | `PerfFeeStandardFacet.sol:47, 95` | `feeRateBps` (uint16, max 65535 BPS = 655%) not capped against `MAX_ADJUSTED_FEE_RATE_BPS` (2000); manager can configure 100%+ perf fee rate; extends E-BC28 |
| V8-PFS-09 | LOW | `PerfFeeStandardFacet.sol:249` | Staleness check `targetTimestamp - priceTimestamp` is safe (checked arithmetic + binary search guarantees), but depends on sorted `fundPriceNavTimestamps` invariant not enforced in `_updateNavInternal` |
| V8-PFS-10 | INFO | `PerfFeeStandardFacet.sol:52-53, 80` | Three cross-facet view calls through Diamond proxy add ~2400 gas overhead vs direct storage reads; no security impact |
| V8-PFS-11 | INFO | `PerfFeeStandardFacet.sol` (entire file) | No events for fee calculation intermediates (hurdle return, risk adjustment); reduced audit trail; by design (view-only facet cannot emit events) |

### Notable Detail: V8-PFS-01 (E-BC31 Second Instance)

```solidity
// PerfFeeStandardFacet.sol:140-156
function _applyRiskAdjustor(bytes4 selector, uint256 classId, uint256 gain) internal view returns (uint256) {
    if (selector == bytes4(0)) return gain;
    (bool ok, bytes memory riskResult) = address(this).staticcall(
        abi.encodeWithSelector(selector, classId, gain)
    );
    if (ok && riskResult.length >= 32) {
        uint256 adjusted = abi.decode(riskResult, (uint256));
        if (adjusted <= gain) return adjusted;
    }
    return gain; // Fail-open: any failure silently skips risk adjustment
}
```

This is architecturally identical to the E-BC31 pattern in `NavManagementFacet`. The pattern now spans two independent facets.

### Notable Detail: V8-PFS-03 (hurdleFundId Manipulation)

A manager who controls benchmark fund `F_B` can:
1. Set `hurdleFundId = F_B.fundId` at class creation
2. Stop publishing NAV updates to `F_B` for >7 days → all prices stale → `_calcHurdleReturn` returns 0
3. Investors receive zero hurdle deduction for all fee periods when manager controls the timing
4. Alternatively: set `hurdleFundId` to a non-existent ID → hurdle is permanently 0 for the class lifetime

---

## New Cross-Facet Chains: V8-CF02 through V8-CF07

**Full chain analysis:** `claude_context/reports/2026-03-02-audit-v8-phase4-xchain-v2.md`

| ID | Severity | Status | Facets | Description |
|----|----------|--------|--------|-------------|
| V8-CF02 | CRITICAL | OPEN | AccountFacet, FundTokensFacet, FundManagementFacet, FundManagementValidationFacet | ARCH-01 callback + V8-FMV-01 fee cap bypass → malicious share class with 655% fee rate created without multisig; enables immediate fund drain via fee extraction |
| V8-CF03 | HIGH | OPEN | OrderManagementFacet, FundTokensFacet, NavManagementFacet, PerfFeeStandardFacet, FeeManagementFacet | E-BC25 dual totalSupply → inflated fund price → PerfFeeStandardFacet overcharges performance fees → excess fee token mint further inflates totalSupply → self-reinforcing divergence loop |
| V8-CF04 | HIGH | OPEN | FundManagementFacet, FundManagementValidationFacet, PerfFeeStandardFacet, FeeManagementFacet | Manager sets invalid/self-controlled hurdleFundId (V8-PFS-03) + stops NAV updates for 8+ days (V8-PFS-06) → hurdle permanently eliminated → full performance fee charged without benchmark deduction |
| V8-CF05 | HIGH | OPEN | FundManagementFacet, PerfFeeStandardFacet, FeeManagementFacet, NavManagementFacet | Empty perfFeeParams stored for a class → FeeManagementFacet collectFees → abi.decode panic (V8-PFS-02) → entire executeUpdateNav reverts → permanent NAV deadlock for all investors in fund |
| V8-CF06 | MEDIUM | OPEN | ClassAdjustmentFacet, NavManagementFacet, PerfFeeStandardFacet | V8-CF01 adjustment queue deadlock freezes lastPerfMintAtNavT; benchmark fund also becomes stale (V8-PFS-06); when deadlock resolves, investors charged full performance fee for locked period with no hurdle protection |
| V8-CF07 | MEDIUM | OPEN (conditional) | PerfFeeStandardFacet, FeeManagementFacet, FundManagementValidationFacet | If FeeManagementFacet processes dealings independently (try/catch): V8-PFS-02 causes asymmetric fee mint failure → lastPerfMintAtNavT diverges between dealing pair → V8-FMV-05 equality check permanently blocks dealing conversions |

### V8-CF02 Detail: CRITICAL New Chain

**This is the most severe new finding from the extension.**

Attack path:
1. Attacker is an operator (or exploits an operator) — triggers any `execute*` call containing an ERC1155 mint
2. `internalExecutionContext = true` during the call
3. From `onERC1155Received`, attacker calls `FundManagementFacet.executeCreateShareClass` directly
4. `validateShareClassCreation` checks `if (maxMgmtFeeRateBps > 0 && mgmtFeeRate > maxMgmtFeeRateBps)` — with default `maxMgmtFeeRateBps=0`, condition is false → passes
5. Share class created with `mgmtFeeRate = 10000 BPS` (100%), zero perf fee cap, no multisig approval
6. Investors onboarding to this class face immediate complete fee extraction

**Severity rationale:** Inherits ARCH-01's CRITICAL severity. V8-FMV-01 turns the abstract ARCH-01 bypass into a concrete, low-complexity fund drain vector.

**Remediation priority:** Fix ARCH-01 first (reentrancy guard inside `onlyInternalExecution`). Fix V8-FMV-01 second (require explicit protocol safety config before share class creation).

---

## Updated ARCH-01 Chain (Chain 1 Addendum)

The original Chain 1 description in `2026-03-02-audit-v8-phase4-cross-facet.md` listed abstract "any execute*" exploitation. Two new concrete sub-paths are now documented:

1. **Fee cap bypass sub-path** (via FundManagementValidationFacet + V8-FMV-01): See V8-CF02 above.
2. **Double fee-mint sub-path** (via PerfFeeStandardFacet + V8-PFS-07): During `executeUpdateNav` callback, attacker calls `executeMintFees` with arbitrary dealing IDs — no classId/dealingId validation passes → fees double-minted for same period.

---

## Updated Remediation Priority List (Post-Extension)

Priority order combines base V8 findings with extension findings:

| Priority | ID | Severity | Description |
|----------|-----|----------|-------------|
| 1 | ARCH-01 | CRITICAL | Fix ERC1155 callback reentrancy (add reentrancyLock check inside onlyInternalExecution) |
| 2 | E-BC22 | CRITICAL | Fix order.tokenId mutation at OrderManagementFacet:304 |
| 3 | V8-CF02 | CRITICAL | Blocked by ARCH-01 fix — fix V8-FMV-01 as second step |
| 4 | V8-PFS-02 | HIGH | Add params length guard in calcStandardPerfFee; validate at class creation |
| 5 | V8-PFS-03 | HIGH | Validate hurdleFundId at class creation time |
| 6 | V8-PFS-01 | HIGH | Change risk adjustor to fail-closed (revert on staticcall failure) |
| 7 | V8-CF05 | HIGH | Blocked by V8-PFS-02 fix |
| 8 | V8-CF03 | HIGH | Blocked by E-BC25 fix |
| 9 | V8-CF04 | HIGH | Blocked by V8-PFS-03 fix |
| 10 | E-BC25 | HIGH | Unify dual totalSupply |
| 11 | V8-FMV-01 | MEDIUM | Require non-zero maxMgmtFeeRateBps or enforce protocol default |
| 12 | V8-FMV-05 | MEDIUM | Ensure NAV update sets lastPerfMintAtNavT for ALL dealings uniformly |
| 13 | V8-PFS-06 | MEDIUM | Make MAX_PRICE_STALENESS configurable or fail-closed on stale benchmark |
| 14 | V8-PFS-07 | MEDIUM | Add classId/dealingId membership validation in calcStandardPerfFee |
| 15–20 | (remaining MEDIUM) | MEDIUM | V8-PFS-04, V8-PFS-05, V8-CF06, V8-CF07 — address in next sprint |
