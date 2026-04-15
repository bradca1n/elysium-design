# Audit Report: V9 Agent C -- Fee & Performance Facets

**Date:** 2026-03-03
**Scope:** FeeManagementFacet.sol, PerfFeeStandardFacet.sol, FundManagementValidationFacet.sol
**Auditor:** Agent C (automated security review)

---

## Prior Finding Verification

### V8-PFS-01 -- Risk adjustor staticcall fail-open
**Status: FIXED**

**Evidence:** `PerfFeeStandardFacet.sol:143-157`. The `_applyRiskAdjustor` function now implements fail-closed behavior:
- Line 154: `if (!ok || riskResult.length < 32) revert ISharedErrors.RiskAdjustorFailed();`
- Line 156: `if (adjusted > gain) revert ISharedErrors.RiskAdjustorFailed();`

Both failure paths (staticcall failure AND adjustor returning value > gain) now revert. This is correct.

---

### V8-PFS-02 -- abi.decode panics on empty/short perfFeeParams
**Status: FIXED**

**Evidence:** `FeeManagementFacet.sol:289-294` in `executeSetPerfFeeCalculator`:
```solidity
if (selector != bytes4(0) && selector == PerfFeeStandardFacet(address(this)).calcStandardPerfFee.selector) {
    if (params.length < 128) revert ISharedErrors.InvalidPerfFeeParams();
```
The 128-byte minimum is correct for 4 ABI-encoded slots (uint16 + uint256 + uint16 + uint16 = 4 x 32 bytes). Additional validation: dual-hurdle check (line 294) prevents conflicting hurdle configurations.

---

### V8-PFS-03 -- hurdleFundId never validated in executeSetPerfFeeCalculator
**Status: FIXED**

**Evidence:** `FeeManagementFacet.sol:296-301`:
```solidity
if (hurdleFundId != 0) {
    if (s.FundAdmin[0].baseInfo[hurdleFundId].createdAt == 0)
        revert ISharedErrors.HurdleFundNotFound();
    if (s.FundAdmin[0].funds[hurdleFundId].status != FundAdminStructs.EntityStatus.ACTIVE)
        revert ISharedErrors.FundNotActive();
}
```
Both existence (createdAt != 0) and ACTIVE status checks are present. This is correct.

---

### V8-PFS-06 -- MAX_PRICE_STALENESS=7d hardcoded
**Status: FIXED**

**Evidence:** `PerfFeeStandardFacet.sol:255-260` in `_findPriceAtOrBefore`:
```solidity
uint32 maxStaleness = s.FundAdmin[0].protocolSafetyConfigs[subjectFundId].maxBenchmarkStaleness;
if (maxStaleness == 0) maxStaleness = MAX_PRICE_STALENESS;
if (targetTimestamp - priceTimestamp > maxStaleness) {
    revert ISharedErrors.BenchmarkPriceMissing(hurdleFundId, targetTimestamp);
}
```
Configurable `maxBenchmarkStaleness` in `ProtocolSafetyConfig` (FundAdminStructs.sol:313) with 7-day fallback default. Reverts with `BenchmarkPriceMissing` when stale. This is correct.

---

### V8-PFS-07 -- No classId/dealingId membership validation
**Status: FIXED**

**Evidence:** `FeeManagementFacet.sol:224-230` in `calculatePerformanceFees`:
```solidity
for (uint256 i = 0; i < dealingIds.length; i++) {
    if (TokenIdUtils.toClassTokenId(dealingIds[i]) != classId) {
        revert ISharedErrors.DealingNotInClass(dealingIds[i], classId);
    }
}
```
Every dealing ID is validated to belong to the specified class before routing to the calculator. This is correct.

---

### V8-PFS-08 -- feeRateBps not capped
**Status: FIXED**

**Evidence:** `FeeManagementFacet.sol:302-305` in `executeSetPerfFeeCalculator`:
```solidity
uint16 capBps = s.FundAdmin[0].protocolSafetyConfigs[fundId].maxPerfFeeRateBps;
if (capBps > 0 && feeRateBps > capBps) revert ISharedErrors.PerfFeeRateExceedsLimit();
```
`maxPerfFeeRateBps` field confirmed in `ProtocolSafetyConfig` (FundAdminStructs.sol:312). Cap enforcement at both SET time (above) and APPLICATION time (FeeManagementFacet.sol:660-662, 891-896). This is correct.

---

### V8-FMV-05 -- lastPerfMintAtNavT equality check blocks dealing conversions
**Status: FIXED**

**Evidence:** `FundManagementValidationFacet.sol:64-75` in `validateDealingConversion`:
```solidity
uint256 classTokenId = TokenIdUtils.toClassTokenId(fromDealingId);
if (s.FundAdmin[0].classes[classTokenId].perfFeeSelector != bytes4(0)) {
    if (
        s.FundAdmin[0].dealings[fromDealingId].lastPerfMintAtNavT
            != s.FundAdmin[0].dealings[toDealingId].lastPerfMintAtNavT
    ) {
        revert IFundManagement.DifferentNavTimestamps();
    }
}
```
When `perfFeeSelector == bytes4(0)` (no performance fee configured), the equality check is skipped, allowing conversion between dealings with different `lastPerfMintAtNavT`. This is correct.

---

### V8-FMV-02 -- validateOfframp missing umbrella.exists check
**Status: FIXED**

**Evidence:** `FundManagementValidationFacet.sol:98-99` in `validateOfframp`:
```solidity
// V8-FMV-02: Check existence before status
if (!umbrella.exists) revert IFundManagement.UmbrellaFundNotFound();
```
Existence check added before status check, preventing default ACTIVE (0) bypass. Also confirmed in `validateOnramp` (line 83). This is correct.

---

### V8-CF03 -- Dual totalSupply inflated price, PerfFeeStandard overcharges
**Status: STILL PRESENT (INFORMATIONAL -- mitigated by design)**

**Evidence:** The system maintains two totalSupply values:
1. `s.FundAdmin[0].baseInfo[tokenId].totalSupply` (used for price calculations in `calculateFundPrice`, NavManagementFacet.sol:467)
2. `s.FundTokens[0].totalSupply[tokenId]` (ERC1155 totalSupply used for actual token accounting in FundTokensFacet.sol:137)

`PerfFeeStandardFacet` does NOT directly use either totalSupply for its fee BPS calculation. It calculates fees as: `feeBps = feeRateBps * gain / dealingPrice` (PerfFeeStandardFacet.sol:95). The `dealingPrice` is derived from `calculateDealingPrice` which uses dilution ratios, not totalSupply directly. The fee BPS is then applied to totalSupply in `_processPerformanceFeeBatch` (FeeManagementFacet.sol) where it uses `FundTokensFacet.totalSupply(dealingId)` (the ERC1155 supply).

The dual supply concern remains as a design complexity. The `baseInfo.totalSupply` is updated in `mintAllPendingManagementFees` (line 205) and `_processPerformanceFeeBatch` (line 867) but NOT in the ERC1155 `_update` path (which updates `FundTokens.totalSupply`). These two supplies serve different purposes:
- `baseInfo.totalSupply`: accounting/price calculation supply (includes class-level supply tracking)
- `FundTokens.totalSupply`: actual token balances

For performance fee calculation specifically: PerfFeeStandardFacet computes fee BPS based on prices (which use dilution ratios), and the actual token amount is derived from ERC1155 totalSupply. The overcharge risk is limited because the fee BPS is a ratio of gain to price, not dependent on supply directly.

**RE-ASSESSMENT:** Downgrade from HIGH to INFORMATIONAL. The price calculation path through dilution ratios (not supply directly) isolates the fee computation from supply discrepancies.

---

### V8-CF05 -- Empty perfFeeParams panic leads to NAV deadlock
**Status: FIXED (via V8-PFS-02)**

**Evidence:** With Fix 5 (V8-PFS-02), `executeSetPerfFeeCalculator` now requires `params.length >= 128` at SET time (FeeManagementFacet.sol:290). This prevents empty or short params from ever being stored, eliminating the downstream `abi.decode` panic in `calcStandardPerfFee` (PerfFeeStandardFacet.sol:47-48).

The SET-time validation is the correct approach because:
1. It prevents the bad state from being stored at all
2. Existing classes without perf fees have `perfFeeSelector == bytes4(0)`, so `calcStandardPerfFee` is never called for them
3. The `calculatePerformanceFees` router (FeeManagementFacet.sol:233-236) returns all-zeros when selector is bytes4(0)

---

### V8-PFS-04 -- lastPerfMintAtNavT=0 breaks hurdle
**Status: CONFIRMED FIXED**

**Evidence:** `FundManagementFacet.sol:361-362`:
```solidity
s.FundAdmin[0].dealings[dealingId] =
    FundAdminStructs.DealingInfo({hwm: hwm, lastPerfMintAtNavT: navUpdatedAt, unlockTs: finalUnlockTs});
```
At dealing creation, `lastPerfMintAtNavT` is initialized to `navUpdatedAt` (which is always > 0 because dealings are only created during order processing after NAV update, as documented on line 358). This ensures the hurdle calculation has a valid start timestamp.

---

### V8-PFS-05 -- Negative/flat benchmark returns zero hurdle
**Status: CONFIRMED BY DESIGN**

**Evidence:** `PerfFeeStandardFacet.sol:182`:
```solidity
if (endPrice <= startPrice) return 0; // Negative/flat return = no hurdle (V8-PFS-05, by design)
```
When the benchmark fund has flat or negative returns, the hurdle is zero, meaning the full gain above HWM is subject to performance fees. This is a design choice documented in the code comment. The rationale: if the benchmark underperformed, the fund manager's outperformance is the full gain.

---

## New Findings

### V9-FMF-01: Reentrancy in mintAllPendingManagementFees -- baseInfo.totalSupply updated after mint
**Severity:** LOW
**Location:** `FeeManagementFacet.sol:204-206`
**Description:** In `mintAllPendingManagementFees`, the `FundTokensFacet.mint()` call (line 204) triggers `_updateWithAcceptanceCheck` which calls `_checkOnERC1155Received` on the manager address. If the manager is a contract, it receives an `onERC1155Received` callback BEFORE `baseInfo[feeClassId].totalSupply` is updated on line 205.

However, this is mitigated by:
1. The `ARCH-01` pattern: `s.inExternalCallback` is set true during the callback (FundTokensFacet.sol:479), which blocks re-entry via `onlyInternalExecution` modifier.
2. The `baseInfo.totalSupply` for the fee class (class 1) is not used in price calculations for the same operation.
3. The `s.FundTokens[0].totalSupply` (ERC1155) IS updated inside `_update` BEFORE the callback.

**Impact:** Minimal. The ARCH-01 guard prevents re-entry. The state inconsistency window (between mint and baseInfo update) cannot be exploited because no re-entrant call can pass `onlyInternalExecution`.
**Recommendation:** For defense-in-depth, consider updating `baseInfo.totalSupply` before the mint call, matching the checks-effects-interactions pattern. This would eliminate the window entirely.
**Reference:** SWC-107

---

### V9-FMF-02: Reentrancy in _processPerformanceFeeBatch -- same pattern
**Severity:** LOW
**Location:** `FeeManagementFacet.sol:864-867`
**Description:** Same pattern as V9-FMF-01. `FundTokensFacet.mint()` (line 865) occurs before `baseInfo[feeClassId].totalSupply += ...` (line 867). Same mitigations apply (ARCH-01 guard).
**Impact:** Same as V9-FMF-01 -- minimal due to ARCH-01.
**Recommendation:** Same as V9-FMF-01 -- update supply before mint.
**Reference:** SWC-107

---

### V9-FMF-03: Slither-flagged calculateAdjustedFeeRate divide-before-multiply
**Severity:** NOT APPLICABLE
**Location:** N/A
**Description:** The function `calculateAdjustedFeeRate` referenced by Slither does not exist in the current codebase. It has been removed or renamed. The Slither finding is stale.
**Impact:** None.
**Recommendation:** No action needed. Re-run Slither on the current codebase.

---

### V9-FMF-04: maxPerfFeeRateBps cap only enforced for calcStandardPerfFee selector
**Severity:** LOW
**Location:** `FeeManagementFacet.sol:289-306`
**Description:** In `executeSetPerfFeeCalculator`, the `maxPerfFeeRateBps` cap and 128-byte params validation (lines 289-305) are ONLY applied when the selector matches `calcStandardPerfFee.selector`. For any other (future) calculator selector, the feeRateBps cap is NOT enforced at SET time.

The APPLICATION-time cap (FeeManagementFacet.sol:660-662 and 891-896) provides a secondary guard, but it applies to the computed BPS output, not the input rate. For a custom calculator that computes fees differently, the SET-time cap is bypassed.

**Impact:** Low currently (only one calculator exists). When additional calculator facets are added, fee rates could be set above the protocol cap. The application-time cap provides a partial safety net, but it checks against computed BPS (which includes gain ratios), not the raw rate.
**Recommendation:** Consider either:
1. Adding a generic `maxPerfFeeRateBps` validation for all non-zero selectors, or
2. Documenting that application-time cap is the primary enforcement for custom calculators.

---

### V9-PFS-01: PerfFeeStandardFacet uses hardcoded MAX_PRICE_STALENESS constant alongside configurable value
**Severity:** INFORMATIONAL
**Location:** `PerfFeeStandardFacet.sol:24`
**Description:** `MAX_PRICE_STALENESS` is still defined as a `uint32 constant` (7 days) at line 24, even though the fix for V8-PFS-06 makes this configurable via `protocolSafetyConfigs[subjectFundId].maxBenchmarkStaleness`. The constant serves only as a fallback default when the config value is 0. This is not a vulnerability but adds code clarity confusion.
**Impact:** None -- the fallback behavior is correct.
**Recommendation:** Consider renaming to `DEFAULT_MAX_PRICE_STALENESS` for clarity, or move to Constants.sol.

---

### V9-FMF-05: _processPerformanceFeeBatch class totalSupply reduction uses stale classPrice
**Severity:** MEDIUM
**Location:** `FeeManagementFacet.sol:838-868`
**Description:** In `_processPerformanceFeeBatch`, `classPrice` is computed once (line 838) before the loop over dealings. Inside `_applyDealingPerfFee`, the dilution ratio of each dealing is updated (line 908), and then `dealingPrice` is calculated using the original `classPrice` (line 911). After each dealing's dilution ratio changes, the effective class price changes too (because class price depends on the aggregate dilution). However, `classPrice` is NOT recalculated between dealings.

The `classTokenBurn` for each dealing (returned by `_applyDealingPerfFee`, line 938) uses `Math.mulDiv(feeAmount, dealingPrice, classPrice)` with the stale `classPrice`. This means:
- For the first dealing: correct conversion
- For subsequent dealings: `classPrice` is stale (dilution ratios have changed but classPrice was not re-derived)

**Impact:** The error compounds across dealings in the same batch. Each dealing's dilution ratio update shifts the effective class price, but subsequent dealings still use the original `classPrice`. This results in slightly incorrect class token burn amounts and fee token mint amounts. The magnitude depends on the number of dealings and the size of individual fees relative to class NAV. For typical institutional funds with moderate fee sizes relative to NAV, the error is small.

**Recommendation:** Recalculate `classPrice` after each dealing's dilution ratio update, or document this as an accepted approximation for gas optimization.

---

### V9-FMF-06: No class existence check in crystalliseSingleDealing
**Severity:** LOW
**Location:** `FeeManagementFacet.sol:431-482`
**Description:** `_crystalliseSingleDealing` validates that the dealing belongs to the fund (line 438-440) but does not check that the class exists (createdAt > 0) or is ACTIVE. The class could theoretically be in RETIRED or CLOSED status while crystallisation is attempted.

However, the class's `crystallisationPeriod` check (line 454-460) would skip processing if not configured, and the `calculatePerformanceFees` router validates the dealing belongs to the class. The risk is low because the dealing process state machine (`AWAITS_FEE_PROCESSING`) already ensures we're in a valid processing window.

**Impact:** Low -- the state machine provides adequate guard.
**Recommendation:** Consider adding an explicit class existence and status check for defense-in-depth.

---

### V9-FMF-07: executeSetCrystallisationPeriod lacks class existence check
**Severity:** LOW
**Location:** `FeeManagementFacet.sol:730-739`
**Description:** `executeSetCrystallisationPeriod` sets `crystallisationPeriod` on a class without verifying the class exists. While the `_validateAndPropose` call in `setCrystallisationPeriod` (line 708-722) would check manager authorization (which implicitly requires a valid fund), it does not explicitly check class existence.

Compare to `executeSetRiskAdjustor` where the public function calls `_requireClassExists` (line 759), but `executeSetCrystallisationPeriod` does not have an equivalent check in either the public or execute function.

**Impact:** Low. An invalid classId would write to an unused storage slot. The manager authorization check provides an implicit guard since the fund must exist for the manager to be authorized.
**Recommendation:** Add `_requireClassExists(classId)` in `executeSetCrystallisationPeriod` for consistency.

---

### V9-FMF-08: Fee class (class 1) totalSupply tracking in baseInfo is additive-only
**Severity:** INFORMATIONAL
**Location:** `FeeManagementFacet.sol:205, 566, 867`
**Description:** Fee class (class 1) `baseInfo.totalSupply` is incremented at three locations (management fee minting, crystallisation fee minting, batch perf fee minting) but never decremented. If fee class tokens are later burned or transferred, the `baseInfo.totalSupply` for the fee class may drift above the actual ERC1155 totalSupply.

The fee class's `baseInfo.totalSupply` is used in `calculateFundPrice` (NavManagementFacet.sol:467) as part of the fund's total supply. However, class 1 is the fee class and its `baseInfo.totalSupply` appears to be tracked separately from the fund's `baseInfo.totalSupply` (fund-level supply at the fund token ID level).

**Impact:** Informational. If fee class tokens are never burned, no discrepancy occurs. If they are (e.g., manager redemption), the inconsistency does not affect price calculations because fund price uses fund-level `baseInfo.totalSupply`, not class-level.
**Recommendation:** Document that fee class totalSupply in baseInfo is for audit trail only and may not perfectly match ERC1155 supply after burns.

---

## Slither Finding Assessment

### 1. FeeManagementFacet.calculateAdjustedFeeRate divide-before-multiply
**Assessment:** STALE FINDING. Function does not exist in current codebase.

### 2. FeeManagementFacet._processPerformanceFeeBatch reentrancy
**Assessment:** TRUE POSITIVE but LOW SEVERITY. Mint occurs before baseInfo.totalSupply update. Mitigated by ARCH-01 (inExternalCallback guard). See V9-FMF-02.

### 3. FeeManagementFacet.mintAllPendingManagementFees reentrancy
**Assessment:** TRUE POSITIVE but LOW SEVERITY. Same pattern as above. Mitigated by ARCH-01. See V9-FMF-01.

---

## Summary

| ID | Severity | Status | Description |
|----|----------|--------|-------------|
| V8-PFS-01 | was HIGH | FIXED | Risk adjustor fail-closed |
| V8-PFS-02 | was HIGH | FIXED | perfFeeParams 128-byte check |
| V8-PFS-03 | was HIGH | FIXED | hurdleFundId validation |
| V8-PFS-06 | was MEDIUM | FIXED | Configurable maxBenchmarkStaleness |
| V8-PFS-07 | was MEDIUM | FIXED | DealingNotInClass check |
| V8-PFS-08 | was LOW | FIXED | maxPerfFeeRateBps cap |
| V8-FMV-05 | was MEDIUM | FIXED | perfFeeSelector bypass for conversions |
| V8-FMV-02 | was LOW | FIXED | umbrella.exists check |
| V8-CF03 | was HIGH | INFORMATIONAL | Dual totalSupply -- mitigated by design |
| V8-CF05 | was HIGH | FIXED | Empty params panic via V8-PFS-02 |
| V8-PFS-04 | was MEDIUM | FIXED | lastPerfMintAtNavT initialized at creation |
| V8-PFS-05 | was MEDIUM | BY DESIGN | Negative benchmark = zero hurdle |
| V9-FMF-01 | LOW | NEW | Reentrancy in mgmt fee mint (ARCH-01 mitigated) |
| V9-FMF-02 | LOW | NEW | Reentrancy in perf fee batch (ARCH-01 mitigated) |
| V9-FMF-03 | N/A | STALE | Slither calculateAdjustedFeeRate not found |
| V9-FMF-04 | LOW | NEW | maxPerfFeeRateBps only for standard calculator |
| V9-PFS-01 | INFO | NEW | Hardcoded constant naming clarity |
| V9-FMF-05 | MEDIUM | NEW | Stale classPrice in batch perf fee processing |
| V9-FMF-06 | LOW | NEW | No class existence check in crystallisation |
| V9-FMF-07 | LOW | NEW | No class existence check in setCrystallisationPeriod |
| V9-FMF-08 | INFO | NEW | Fee class totalSupply additive-only tracking |
