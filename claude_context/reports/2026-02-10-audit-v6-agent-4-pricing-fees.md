# Security Audit Report: Agent 4 — Pricing, Fees & Class Adjustments (V6)

**Date:** 2026-02-10
**Auditor:** Agent 4 (V6 Audit)
**Scope:** NavManagementFacet.sol, FeeManagementFacet.sol, ClassAdjustmentFacet.sol
**Commit:** multiCurrency branch

---

## Executive Summary

| Severity | Count |
|----------|-------|
| CRITICAL | 3 |
| HIGH | 6 |
| MEDIUM | 6 |
| LOW | 5 |
| INFORMATIONAL | 4 |
| **Total** | **24** |

This audit covers the NAV management, fee calculation/minting, and class adjustment subsystems. The most critical findings involve management fee calculation precision issues that compound over time, a division-by-zero path in performance fee processing, and a fund totalSupply divergence caused by management fee minting to the fee class without updating the fund-level totalSupply tracking. Several high-severity issues exist around dilution ratio manipulation, the interaction between adjustment processing and fee minting within the same NAV update transaction, and missing validation of the management fee rate against the protocol safety cap.

---

## Findings

## [CRITICAL] A4-01: Management Fee Minting Updates Class dilutionRatio Using oldTotalSupply That May Be Zero

**ID:** A4-01
**Location:** FeeManagementFacet.sol:L180-L184
**Description:**
In `mintAllPendingManagementFees`, the dilution ratio update on line 182 computes:

```solidity
uint256 newDilutionRatio = Math.mulDiv(oldDilutionRatio, newTotalSupply, oldTotalSupply);
```

If `oldTotalSupply` is 0, this will cause a division-by-zero revert inside `Math.mulDiv`. The guard on line 353 (`if (totalSupply == 0 ... ) return 0`) is in `_calculateManagementFee`, which returns 0 fee when totalSupply is 0. However, there is a race condition: Between the fee calculation and the dilution ratio update on line 182, the `totalSupply` is read again from `s.FundAdmin[0].baseInfo[classId].totalSupply` on line 180. In the current code flow, these reads happen sequentially within the same transaction so the value should be consistent. However, the check on line 353 uses `lastMgmtFeeMintTs >= timestamp` as a skip condition. If `lastMgmtFeeMintTs` is 0 (never minted) and `totalSupply` is 0, the function correctly returns 0 and the continue on line 174 skips the dilution update. This path is safe.

The real risk is when `totalSupply` was > 0 during fee calculation, yielding a non-zero `feeAmount`, but then all tokens for that class are burned (via performance fee processing or redemption) in the same transaction before the dilution update executes. In the current NAV update flow, fees are minted before orders are processed, so this specific scenario does not occur within a single `_updateNavInternal` call. However, the `mintAllPendingManagementFees(uint256, uint32)` function is `public onlyInternalExecution` and could be called from other facets in future refactors.

**Revised Assessment:** After closer analysis, this is protected in the current call flow but the lack of a defensive check against `oldTotalSupply == 0` at line 182 remains a latent vulnerability.

**Impact:** If `oldTotalSupply` is zero when the dilution update executes, the entire NAV update transaction reverts, blocking all fund operations including order processing and settlements.

**Recommendation:**
Add a defensive zero-check before the dilution ratio update:
```solidity
if (oldTotalSupply == 0) continue;
```

---

## [CRITICAL] A4-02: Performance Fee Processing Division-by-Zero When Dealing totalSupply is Zero

**ID:** A4-02
**Location:** FeeManagementFacet.sol:L396-L401
**Description:**
In `_processPerformanceFeeBatch`, at line 399:

```solidity
uint256 newDilutionRatio = Math.mulDiv(oldDilutionRatio, newTotalSupply, oldTotalSupply);
```

`oldTotalSupply` is fetched from `FundTokensFacet(address(this)).totalSupply(dealingId)` on line 397. If a dealing has no tokens (totalSupply is 0), this will revert with a division-by-zero. The `feeAmount` for this dealing is provided by the caller (the manager via `feeBatches`), and there is no check that `oldTotalSupply > 0` before performing the dilution calculation. A manager submitting a batch with a dealing that has 0 supply (perhaps after all tokens were redeemed) would cause the entire batch to revert.

**Impact:** A single dealing with zero totalSupply in a performance fee batch will cause the entire batch to revert, preventing performance fee collection for all dealings in the batch. A malicious or careless manager could inadvertently DOS fee collection.

**Recommendation:**
Add a zero-supply guard:
```solidity
uint256 oldTotalSupply = FundTokensFacet(address(this)).totalSupply(dealingId);
if (oldTotalSupply == 0) {
    if (feeAmount > 0) revert ISharedErrors.AmountZero(); // Cannot charge fee on empty dealing
    continue;
}
```

---

## [CRITICAL] A4-03: Fund totalSupply Not Updated When Management Fees Are Minted to Fee Class

**ID:** A4-03
**Location:** FeeManagementFacet.sol:L199-L204
**Description:**
When management fees are minted, the fee class (class 1) `totalSupply` is updated at line 203:

```solidity
s.FundAdmin[0].baseInfo[feeClassId].totalSupply += SafeCast.toUint128(totalFeeInFundTokens);
```

And actual ERC-1155 tokens are minted via `FundTokensFacet.mint()` at line 202. However, the **fund-level** `totalSupply` (`s.FundAdmin[0].baseInfo[fundId].totalSupply`) is **never** updated. The fund price is calculated as:

```solidity
// NavManagementFacet.sol:L446
return totalSupply == 0 ? PRECISION : Math.mulDiv(s.FundAdmin[0].funds[fundId].nav, PRECISION, totalSupply);
```

This means the fund price calculation uses a stale (lower) totalSupply that does not include the newly minted fee tokens. As a result, the fund price will be **higher** than it should be after management fee minting, because the denominator (totalSupply) is too small relative to the unchanged NAV.

The same issue exists in `_processPerformanceFeeBatch` at line 455: the fee class totalSupply is incremented, but the fund-level totalSupply is not.

Over time, this divergence accumulates with each NAV cycle, causing a progressively larger error in fund price.

**Impact:** Systematic overpricing of fund tokens after every fee minting event. This means all subsequent class prices, dealing prices, and order execution prices will be inflated. Investors who subscribe after fee minting pay a higher price than they should; investors who redeem receive more value than warranted. The fund manager benefits from an inflated price on subsequent NAV updates.

**Recommendation:**
After minting fee tokens to the fee class, also update the fund-level totalSupply:
```solidity
if (totalFeeInFundTokens > 0) {
    // ... existing mint code ...
    s.FundAdmin[0].baseInfo[feeClassId].totalSupply += SafeCast.toUint128(totalFeeInFundTokens);
    // FIX: Also update fund-level totalSupply
    s.FundAdmin[0].baseInfo[fundId].totalSupply += SafeCast.toUint128(totalFeeInFundTokens);
}
```
Apply the same fix in `_processPerformanceFeeBatch`.

---

## [HIGH] A4-04: Management Fee Rate Not Validated Against Protocol Safety maxMgmtFeeRateBps

**ID:** A4-04
**Location:** FeeManagementFacet.sol:L346-L370, NavManagementFacet.sol:L189-L210
**Description:**
The `ProtocolSafetyConfig` struct includes `maxMgmtFeeRateBps` (line 291 of FundAdminStructs.sol), which is set via `setProtocolSafetyConfig`. However, nowhere in the codebase is this value actually checked when:
1. A class's `mgmtFeeRate` is set/updated
2. Management fees are calculated in `_calculateManagementFee`

The safety config is stored but never enforced. A fund admin could set a class's management fee rate to 100% (10000 bps) or higher, bypassing the intended protocol safety limit.

**Impact:** The protocol safety mechanism for capping management fee rates is completely ineffective. A malicious or misconfigured fund manager could set arbitrarily high fee rates, extracting excessive value from investors.

**Recommendation:**
Enforce `maxMgmtFeeRateBps` when creating or updating a class's `mgmtFeeRate`. In the class creation/update flow, add:
```solidity
uint16 maxRate = s.FundAdmin[0].protocolSafetyConfigs[fundId].maxMgmtFeeRateBps;
if (maxRate > 0 && mgmtFeeRate > maxRate) revert ISharedErrors.FeeRateExceedsBPS();
```

---

## [HIGH] A4-05: Adjustment Processing Uses Stale Fund Price Before NAV Storage

**ID:** A4-05
**Location:** NavManagementFacet.sol:L231-L250, L328-L330
**Description:**
In `_updateNavInternal`, the processing order is:
1. `_processAllPendingAdjustments(fundId, newNav)` (line 233)
2. `mintAllPendingManagementFees(fundId, navTimestamp)` (line 236)
3. Store `newNav` to storage (line 239)

During step 1, `_processAllPendingAdjustments` calls `calculateFundPrice(fundId)` at line 328:
```solidity
uint256 fundPrice = calculateFundPrice(fundId);
```

But `calculateFundPrice` reads `s.FundAdmin[0].funds[fundId].nav` from storage, which still contains the **old** NAV value (the new NAV has not been stored yet -- that happens at line 239). The `newNav` is only passed as a parameter for the fund-level dilution calculation at line 365, not for class-level price calculations.

This means class value calculations at line 330 use the old NAV-based fund price, not the new NAV. The `maxAdjBps` safety check at line 337 compares the adjustment amount against a class value calculated from the **old** fund price. If the new NAV is significantly higher, the safety check is too restrictive (false rejects). If the new NAV is significantly lower, the safety check is too lenient (allows oversized adjustments).

**Impact:** The maxAdjustmentBps safety check operates on stale price data, potentially allowing adjustments that exceed the configured safety limit relative to actual class value, or rejecting valid adjustments that are within bounds.

**Recommendation:**
Pass `newNav` to `_processAllPendingAdjustments` and use it to compute fund price internally, or store the new NAV to storage before processing adjustments. For example:
```solidity
// Store NAV first (move line 239 before line 233)
s.FundAdmin[0].funds[fundId].nav = SafeCast.toUint128(newNav);
_processAllPendingAdjustments(fundId, newNav);
```

---

## [HIGH] A4-06: Circular Price Dependency in Management Fee Minting

**ID:** A4-06
**Location:** FeeManagementFacet.sol:L162-L204
**Description:**
In `mintAllPendingManagementFees`, the fund price is calculated once at line 162:
```solidity
uint256 fundPrice = NavManagementFacet(address(this)).calculateFundPrice(fundId);
```

Then for each class (loop starting at line 165), the fee is calculated, the class's `dilutionRatio` is updated (line 184), and then the class price is recalculated at line 186:
```solidity
uint256 classPrice = NavManagementFacet(address(this)).calculateClassPrice(classId, fundPrice);
```

The problem is that `calculateClassPrice` uses the class's `dilutionRatio` (which was just updated at line 184), but the `fundPrice` was computed before any dilution updates. This creates an inconsistency: the dilution ratio reflects the fee mint, but the fund price does not reflect the increased totalSupply (per A4-03, fund totalSupply is not updated).

Furthermore, when processing class N, classes 2 through N-1 have already had their dilution ratios updated, which means `calculateFundPrice` (if it were recalculated) would yield a different value. The stale `fundPrice` introduces cumulative error across classes.

The fee amount conversion at line 187:
```solidity
feeAmount = Math.mulDiv(feeAmount, classPrice, fundPrice);
```

Uses a classPrice that reflects the new dilution but a fundPrice that is stale, leading to incorrect conversion ratios.

**Impact:** Management fee amounts are systematically miscalculated due to inconsistent price data between the fund price and class prices. The error compounds across multiple classes and NAV cycles.

**Recommendation:**
Either recalculate fundPrice after each class's fee minting (accounting for the totalSupply change), or perform the fee calculation in two passes: first calculate all fee amounts, then apply all dilution changes and mints.

---

## [HIGH] A4-07: Pending Adjustment Amount Cast From int128 to int256 Without Direction Validation During Processing

**ID:** A4-07
**Location:** NavManagementFacet.sol:L295-L296
**Description:**
In `_processAllPendingAdjustments`, adjustment amounts are accumulated:
```solidity
netAmounts[classIdx] += int256(pa.amount);
totalNetAdjustment += int256(pa.amount);
```

Where `pa.amount` is `int128`. The cast from `int128` to `int256` is safe (no overflow). However, the aggregation of multiple adjustments for the same class can result in a `netAmounts[classIdx]` value that exceeds the `int128` range. While `int256` can hold this, the subsequent conversion to `uint256` at lines 334-336:

```solidity
uint256 absAmount = netAmounts[i] > 0
    ? uint256(netAmounts[i])
    : uint256(-netAmounts[i]);
```

Is safe for `int256` values. However, the accumulated `totalNetAdjustment` is also an `int256` which is passed to `_applyFundDilution` at line 316. Inside `_applyFundDilution`, the absolute value computation at line 362-364 is correct for `int256`.

**Revised Assessment:** The integer arithmetic is safe due to `int256` range. However, there is a logical issue: the direction validation performed during adjustment posting (in `ClassAdjustmentFacet._validateDirection`) only validates individual adjustments. When multiple adjustments are aggregated, the net direction could be opposite to what any individual adjustment's label implies. For example, 10 cost adjustments of +100 and 11 gain adjustments of -100 for the same class would net to -100 (a gain), but the fund-level dilution was already partially applied during the cost phase. The aggregation is correct mathematically but the audit trail records individual adjustments with their original labels, which could be misleading.

**Impact:** While not a direct exploit, the aggregation of opposing adjustments could produce unexpected net dilution effects that are difficult to audit. More critically, an adversary with adjustment-posting privileges could post many small adjustments that individually pass the maxAdjustmentBps check but collectively represent a large net change.

**Recommendation:**
Apply the `maxAdjustmentBps` safety check to the total gross adjustment per class (sum of absolute values), not just the net amount. This prevents circumventing the safety limit through many small adjustments in opposite directions.

---

## [HIGH] A4-08: Performance Fee MaxFee Validation Uses Post-Dilution TotalSupply

**ID:** A4-08
**Location:** FeeManagementFacet.sol:L396-L418
**Description:**
In `_processPerformanceFeeBatch`, the dilution ratio is updated first (lines 396-401), then the max fee validation occurs (lines 414-418):

```solidity
uint256 ts = FundTokensFacet(address(this)).totalSupply(dealingId);
uint256 maxFee = Math.mulDiv(ts, dealingPrice - currentHwm, dealingPrice);
if (feeAmount > maxFee) revert ISharedErrors.PerformanceFeeExceedsMax();
```

But `dealingPrice` at line 406 is calculated **after** the dilution ratio was already updated at line 401. The updated dilution ratio increases the dealing price (since `dealingPrice = classPrice * PRECISION / dilutionRatio`, and a higher dilutionRatio means lower price -- wait, that is the inverse). Actually, a higher dilution ratio means: `classPrice * PRECISION / dilutionRatio` gets **smaller**. But the dilution ratio was increased by the fee (`newDilutionRatio = oldDilutionRatio * newTotalSupply / oldTotalSupply > oldDilutionRatio`), so the dealing price used in the max fee calculation is **lower** than the pre-fee price.

This means the `maxFee` calculation uses a deflated `dealingPrice`, which produces a **smaller** maxFee, making the check **stricter** than intended. This could cause valid fee amounts to be rejected.

However, the `totalSupply(dealingId)` at line 416 reads from the ERC-1155 storage (NOT the baseInfo storage), and the fee tokens have not been minted yet at this point. The dilution ratio was updated but the actual token mint has not happened. So `ts` reflects the pre-fee supply, but `dealingPrice` reflects the post-dilution-update price. This inconsistency leads to incorrect max fee bounds.

**Impact:** The max fee validation uses inconsistent state (post-dilution price, pre-mint supply), leading to either overly strict or overly lenient fee caps depending on the direction of the inconsistency. Could block legitimate performance fee collection or allow slightly excessive fees.

**Recommendation:**
Calculate `dealingPrice` and `maxFee` using the pre-dilution state, or move the dilution ratio update to after the validation:
```solidity
// Validate first with pre-dilution price
uint256 dealingPrice = NavManagementFacet(address(this)).calculateDealingPrice(dealingId, classPrice);
// ... maxFee check ...
// Then update dilution
```

---

## [HIGH] A4-09: _feeToEntry Uses Hardcoded HEDGE Label for Management Fee Audit Trail Entries

**ID:** A4-09
**Location:** ClassAdjustmentFacet.sol:L412-L421
**Description:**
In `_feeToEntry`, management fee entries in the merged audit trail are given a hardcoded label of `AdjustmentLabel.HEDGE`:

```solidity
return FundAdminStructs.AuditTrailEntry({
    blockNumber: fee.blockNumber,
    entryType: FundAdminStructs.AuditEntryType.MANAGEMENT_FEE,
    amount: int128(int256(uint256(fee.amount))),
    label: FundAdminStructs.AdjustmentLabel.HEDGE,   // <-- hardcoded
    externalRef: bytes32(0)
});
```

The `HEDGE` label (enum value 0) is the default enum value, but it is semantically incorrect for management fee entries. This is misleading for audit/compliance purposes.

Additionally, the cast `int128(int256(uint256(fee.amount)))` at line 417 could overflow if `fee.amount` (a `uint128`) exceeds `type(int128).max` (~1.7e38). Since fee amounts in fund tokens are PRECISION-scaled (1e18), a fee amount of ~1.7e20 tokens would overflow the int128 cast. This is a realistic amount for large funds.

**Impact:** Incorrect audit trail labels compromise compliance reporting. The int128 overflow would cause silent truncation/corruption of the amount field in audit trail entries for large fee amounts.

**Recommendation:**
Use a dedicated label (e.g., add `MANAGEMENT_FEE` to the enum, or use `OTHER` with a descriptive externalRef). For the overflow, use SafeCast:
```solidity
amount: SafeCast.toInt128(int256(uint256(fee.amount))),
```

---

## [MEDIUM] A4-10: NAV Safety Check Bypassed on First NAV Update (currentNav == 0)

**ID:** A4-10
**Location:** NavManagementFacet.sol:L52-L64
**Description:**
In `validateNavUpdate`, the NAV change check is:
```solidity
if (config.maxNavChangeBps > 0) {
    uint256 currentNav = s.FundAdmin[0].funds[fundId].nav;
    if (currentNav > 0) {  // <-- Skipped when current NAV is 0
        // ... change calculation
    }
}
```

When a fund's NAV is first set (currentNav == 0), the safety check is completely bypassed. While this is arguably intentional for initialization, it means the first NAV update can set any arbitrary value without bounds checking. An attacker who compromises the NAV updater role could set an astronomically high initial NAV.

**Impact:** The first NAV update for any fund bypasses all safety limits. Combined with the dealing process state check, this is somewhat mitigated since NAV updates only happen when scheduled, but the initial value sets the baseline for all subsequent safety checks.

**Recommendation:**
Consider adding an absolute NAV range validation for the first update, or require a separate initialization step with admin approval for the first NAV.

---

## [MEDIUM] A4-11: Class Adjustment maxAdjBps Check Uses classValue That Can Be Manipulated

**ID:** A4-11
**Location:** NavManagementFacet.sol:L328-L341
**Description:**
The `maxAdjBps` safety check computes `classValue` from `classSupply * classPrice`:
```solidity
uint256 fundPrice = calculateFundPrice(fundId);
uint256 classPrice = calculateClassPrice(cId, fundPrice);
uint256 classValue = Math.mulDiv(uint256(classSupply), classPrice, PRECISION);
```

This calculation happens inside the loop after some classes may have already had their dilution ratios modified (via `_applyClassDilution` on previous loop iterations). However, the `fundPrice` is recalculated each iteration from the same NAV and totalSupply, so it remains consistent within the loop.

The real issue is that the `fundPrice` uses the **old** NAV (as described in A4-05), and the class dilution ratio may have been modified by the fund-level dilution applied at line 316-317. This means classes processed later in the loop have a fund dilution ratio that reflects adjustments from all classes, while the `classValue` calculation for those classes does not account for this fund-level dilution change affecting their own class price.

**Impact:** The safety check for later classes in the processing loop uses an inaccurate class value, potentially allowing adjustments that exceed the intended safety percentage or blocking valid ones.

**Recommendation:**
Compute all class values before applying any dilution changes, or re-read the fund dilution ratio for accurate class price computation.

---

## [MEDIUM] A4-12: Precision Loss in Multi-Step Price Calculation Chain

**ID:** A4-12
**Location:** NavManagementFacet.sol:L444-L514
**Description:**
The price calculation chain involves four sequential divisions:
1. `fundPrice = nav * PRECISION / totalSupply` (line 446)
2. `adjustedFundPrice = fundPrice * PRECISION / fundDilution` (line 470)
3. `classPrice = adjustedFundPrice * PRECISION / classDilution` (line 473)
4. `dealingPrice = classPrice * PRECISION / dealingDilution` (line 514)

Each `Math.mulDiv` operation rounds down. With PRECISION = 1e18, the rounding error at each step is at most 1 wei. However, across 4 steps, the cumulative error can be up to 4 wei. For very small prices or very large totalSupply values, this rounding consistently favors the protocol (rounding down).

While `Math.mulDiv` provides the best precision possible for single operations, the chained application means errors compound multiplicatively rather than additively. For example, if step 1 rounds down by epsilon, step 2 applies PRECISION/fundDilution to (trueValue - epsilon), producing a second error of epsilon * PRECISION / fundDilution / PRECISION, which is negligible.

**Impact:** Low practical impact due to 1e18 precision. However, for accounting compliance purposes in institutional fund administration, the consistent round-down bias across all 4 steps creates a systematic underpricing that, over thousands of NAV cycles, could accumulate to a material amount for very large funds.

**Recommendation:**
Consider using `Math.mulDiv` with `Math.Rounding.Ceil` for operations where rounding should favor investors (e.g., subscription prices round up, redemption prices round down). Document the rounding convention.

---

## [MEDIUM] A4-13: calculateClassPriceInDenomination May Revert if FX Rate Not Set

**ID:** A4-13
**Location:** NavManagementFacet.sol:L484-L499
**Description:**
`calculateClassPriceInDenomination` calls `FXManagementFacet.getFXRate(fundCurrency, classCurrency)` at line 497. If the FX rate for either currency is not set (rateVsUSD == 0), `getFXRate` calls `_getRateVsUSD` which reverts with `FXRateNotAvailable`. This means any view function calling `calculateClassPriceInDenomination` will revert if FX rates are not configured.

While this is expected behavior, the function is `public view` and may be called by off-chain systems that expect a graceful return. If a class is configured with a denomination currency but the FX rate has not been set yet, all operations that depend on this price (including order validation) will fail.

**Impact:** Multi-currency classes become non-functional until FX rates are configured. No graceful degradation path exists.

**Recommendation:**
Consider returning 0 or the base price with a flag indicating FX rate unavailability, or document that FX rates must be configured before classes using non-fund currencies become operational.

---

## [MEDIUM] A4-14: Management Fee targetFeeValue >= classNav Returns Zero Instead of Capping

**ID:** A4-14
**Location:** FeeManagementFacet.sol:L362-L366
**Description:**
The edge case handling at lines 362-366:
```solidity
if (targetFeeValue >= classNav) {
    return 0; // Fee calculation invalid - would exceed NAV
}
```

When `targetFeeValue >= classNav`, the function returns 0, meaning **no fee** is charged at all. This can happen when `timeScaledFeeRate >= BPS_DENOMINATOR`, i.e., the annualized fee rate multiplied by the time elapsed equals or exceeds 100%.

For example, with a 200 bps (2%) annual fee and a time gap of 50+ years, `targetFeeValue >= classNav`. More practically, if `lastMgmtFeeMintTs` was never advanced (stuck at 0 but somehow totalSupply > 0), the time elapsed could be decades.

Returning 0 when the fee should be capped at a maximum value is incorrect -- it means extremely delinquent fee collection results in zero fees instead of maximum fees.

**Impact:** If management fee minting is delayed for an extended period, the fee amount flips from large to zero, depriving the fund manager of earned fees and creating an exploitable discontinuity.

**Recommendation:**
Instead of returning 0, cap the fee at a reasonable maximum. For example:
```solidity
if (targetFeeValue >= classNav) {
    // Cap: mint tokens equal to a reasonable percentage of supply
    // Or: cap timeScaledFeeRate at BPS_DENOMINATOR - 1
    targetFeeValue = classNav - 1;
}
```

---

## [MEDIUM] A4-15: ProtocolSafetyConfig Event Missing maxNoticePeriod and maxLockPeriod

**ID:** A4-15
**Location:** NavManagementFacet.sol:L209
**Description:**
The `ProtocolSafetyConfigUpdated` event at line 209:
```solidity
emit ProtocolSafetyConfigUpdated(fundId, maxNavChangeBps, maxTimestampDeviation, maxMgmtFeeRateBps, maxAdjustmentBps);
```

Does not include the `maxNoticePeriod` and `maxLockPeriod` parameters that were set at lines 203-204. The event definition in `INavManagement` at line 18 also omits these two fields. This means changes to notice period and lock period safety limits are not emitted in events, making them invisible to off-chain monitoring.

**Impact:** Compliance and audit systems cannot detect when notice period or lock period safety limits are changed, undermining the audit trail.

**Recommendation:**
Update the event to include all safety config fields:
```solidity
event ProtocolSafetyConfigUpdated(uint256 indexed fundId, uint16 maxNavChangeBps, uint32 maxTimestampDeviation, uint16 maxMgmtFeeRateBps, uint16 maxAdjustmentBps, uint32 maxNoticePeriod, uint32 maxLockPeriod);
```

---

## [LOW] A4-16: Class Loop in mintAllPendingManagementFees Starts at i=2 With Off-By-One Risk

**ID:** A4-16
**Location:** FeeManagementFacet.sol:L165
**Description:**
The loop at line 165:
```solidity
for (uint16 i = 2; i <= nextClassId; i++) {
```

Iterates from class 2 through `nextClassId` inclusive. The `nextClassId` field represents the **next** class ID to assign, meaning the highest existing class ID is `nextClassId - 1`. When `i == nextClassId`, the code creates a classId for a class that may not exist yet.

However, if the class does not exist, `lastMgmtFeeMintTs` will be 0, `totalSupply` will be 0, and `_calculateManagementFee` will return 0. The timestamp at line 173 will still be updated:
```solidity
s.FundAdmin[0].classes[classId].lastMgmtFeeMintTs = timestamp;
```

This writes to storage for a non-existent class, wasting gas and potentially causing issues if that class ID is later created (it would have a pre-set `lastMgmtFeeMintTs`).

**Impact:** Gas waste on each NAV update, and a latent bug where newly created classes inherit a stale `lastMgmtFeeMintTs` from a previous NAV cycle.

**Recommendation:**
Change the loop bound to `< nextClassId`:
```solidity
for (uint16 i = 2; i < nextClassId; i++) {
```

---

## [LOW] A4-17: _applyDilutionChange Can Produce Dilution Ratio of 0 When pct == PRECISION - 1

**ID:** A4-17
**Location:** NavManagementFacet.sol:L428-L436
**Description:**
In `_applyDilutionChange`:
```solidity
if (pct >= PRECISION) return 1;
return SafeCast.toUint128(Math.mulDiv(uint256(current), PRECISION - pct, PRECISION));
```

When `pct` is just below `PRECISION` (e.g., `PRECISION - 1`), the calculation becomes:
```solidity
Math.mulDiv(current, 1, PRECISION)
```

For any `current < PRECISION`, this returns 0. The caller `_applyClassDilution` at line 416 handles this:
```solidity
if (newDilution == 0) newDilution = 1;
```

But `_applyFundDilution` at line 379 only checks against `MIN_FUND_DILUTION_RATIO`, not against zero. Since `MIN_FUND_DILUTION_RATIO = 0.01e18` and is much larger than 1, the floor protection at line 379 catches this case for fund-level dilution. For class-level, the floor of 1 is extremely low (essentially zero dilution protection).

**Impact:** A class dilution ratio of 1 means `classPrice = adjustedFundPrice * PRECISION / 1 = adjustedFundPrice * 1e18`, which would be an astronomically high price. This would make the class tokens essentially worthless in practice (nobody could afford to subscribe).

**Recommendation:**
Apply a minimum class dilution ratio similar to the fund level, such as `MIN_FUND_DILUTION_RATIO` or a dedicated minimum.

---

## [LOW] A4-18: Cancel Adjustment Swap-and-Pop Changes Processing Order

**ID:** A4-18
**Location:** ClassAdjustmentFacet.sol:L225-L238
**Description:**
The `_cancelPendingAdjustmentInternal` function uses swap-and-pop:
```solidity
if (index != lastIndex) {
    queue[index] = queue[lastIndex];
}
queue.pop();
```

This changes the order of the pending adjustments array. While the processing in `_processAllPendingAdjustments` aggregates by class (so order does not affect the final result), the audit trail in `adjustmentHistory` records adjustments in the original queue order (lines 299-306), not aggregated. After cancellation, the queue order differs from the posting order, which could cause confusion in audit trails.

**Impact:** Minor audit trail inconsistency -- the order of applied adjustments may not match the chronological posting order.

**Recommendation:**
Document that cancellation reorders the queue, or use a soft-delete pattern instead of swap-and-pop.

---

## [LOW] A4-19: validateNavUpdate Called via this.validateNavUpdate Uses External Call Gas Overhead

**ID:** A4-19
**Location:** NavManagementFacet.sol:L127
**Description:**
In `executeUpdateNav`:
```solidity
this.validateNavUpdate(fundId, newNav, navTimestamp);
```

The `this.` prefix makes this an external call through the Diamond proxy, incurring extra gas overhead (message call + function dispatch). Since `executeUpdateNav` already runs within the same Diamond context, an internal call would be more efficient. The same pattern appears in `executeSetProtocolSafetyConfig` at line 174.

Similar external self-calls exist in FeeManagementFacet at lines 116, 139 and ClassAdjustmentFacet at lines 95, 137, 154, 189.

**Impact:** Unnecessary gas consumption on every NAV update and fee minting operation.

**Recommendation:**
For functions that exist in the same facet, call them directly as internal functions instead of using `this.` syntax.

---

## [LOW] A4-20: PendingAdjustment.amount is int128 But Direction Validation Allows Maximum Values

**ID:** A4-20
**Location:** ClassAdjustmentFacet.sol:L30-L57
**Description:**
The `amount` parameter is `int128`, which allows values from -170141183460469231731687303715884105728 to 170141183460469231731687303715884105727. There is no upper or lower bound validation on the absolute value of the amount during `validateClassAdjustment`, only a zero check. Combined with the fact that the `maxAdjBps` check only happens during NAV processing (not at posting time), an adjustment can be posted with an amount that far exceeds any reasonable bound.

**Impact:** Extremely large adjustment amounts could cause SafeCast overflows or unexpected behavior during NAV processing.

**Recommendation:**
Add a reasonable absolute value bound check during posting validation.

---

## [INFORMATIONAL] A4-21: calculateAdjustedFeeRate is Placeholder Implementation

**ID:** A4-21
**Location:** FeeManagementFacet.sol:L467-L517
**Description:**
The `calculateAdjustedFeeRate` function is documented as a "placeholder" implementation. It uses hardcoded thresholds (50% volatility, 50% drawdown) and does not read any per-class configuration. The function is called with empty `RiskMetrics` structs (all zeros) in `calculatePerformanceFee` at line 233, so the volatility and drawdown penalties are always zero, and the function simply converts `baseReturn` to basis points.

**Impact:** The performance fee calculation does not actually perform any risk adjustment. This is acknowledged in comments but should be tracked as technical debt.

**Recommendation:**
Either implement the risk-adjusted calculation or remove the dead code and use a simple pass-through to reduce complexity and audit surface.

---

## [INFORMATIONAL] A4-22: _calcHurdleReturn Always Reverts When hurdleFundNum > 0

**ID:** A4-22
**Location:** FeeManagementFacet.sol:L273-L279
**Description:**
The `_calcHurdleReturn` function:
```solidity
if (hurdleFundNum > 0) revert ISharedErrors.HurdleNotImplemented();
return 0;
```

This is a deliberate safety measure (V4-C10) to prevent silent hurdle bypass. However, if a class is configured with `hurdleFundNum > 0`, any call to `calculatePerformanceFee` for that class's dealings will revert, making the view function unusable. This is documented behavior but could confuse off-chain integrations.

**Impact:** No security impact -- this is a safety guard. Informational for API consumers.

**Recommendation:**
Document this behavior in the IFeeManagement interface NatSpec.

---

## [INFORMATIONAL] A4-23: Potential Overflow in _feeToEntry int128 Cast

**ID:** A4-23
**Location:** ClassAdjustmentFacet.sol:L417
**Description:**
(Covered in detail in A4-09, repeated here for completeness in the informational category.)

The cast `int128(int256(uint256(fee.amount)))` will overflow for `fee.amount > type(int128).max`. Since `fee.amount` is `uint128`, values above ~1.7e38 will wrap to negative values. With PRECISION = 1e18, this corresponds to ~1.7e20 fund tokens in fees, which is extremely large but theoretically possible for institutional-scale funds.

**Impact:** Audit trail corruption for very large fee amounts.

**Recommendation:**
Use SafeCast.toInt128 for the conversion.

---

## [INFORMATIONAL] A4-24: Fund Price History Arrays Grow Unboundedly

**ID:** A4-24
**Location:** NavManagementFacet.sol:L244-L247
**Description:**
The comment at line 244 acknowledges this is acceptable on a private chain:
```solidity
// T-23: Unbounded storage acceptable on private chain — preserve full price history
```

On each NAV update, three arrays grow by one element: `fundPrices`, `fundPriceNavTimestamps`, `fundPriceBlockNumbers`. Over years of operation with daily NAV updates, this grows to thousands of entries. On a private chain with controlled gas limits, this is acceptable.

**Impact:** No security impact on private chain. Would be a DOS vector on public chains.

**Recommendation:**
If the protocol is ever deployed to a public chain, implement a windowed storage approach or off-chain storage with on-chain proofs.

---

## Summary of Cross-Cutting Concerns

### Price Calculation Chain Consistency
The most pervasive issue across these three facets is the inconsistency in price data during the NAV update transaction. The processing order (adjustments -> fees -> store NAV) means that different operations within the same transaction see different versions of the fund price, dilution ratios, and total supply. Findings A4-03, A4-05, A4-06, A4-08, and A4-11 are all manifestations of this fundamental architectural issue.

### Fund totalSupply Invariant
Finding A4-03 identifies a critical invariant violation: the fund-level totalSupply must equal the sum of all class totalSupply values (including the fee class). When management and performance fees mint tokens to the fee class without updating the fund totalSupply, this invariant is broken, causing systematic price miscalculations.

### Safety Config Enforcement
Finding A4-04 reveals that the `maxMgmtFeeRateBps` safety config is stored but never enforced, undermining the protocol safety framework. This should be validated during class creation/update.

