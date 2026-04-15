# Audit V7 Agent 4: NAV, Fees & Pricing

**Date:** 2026-02-12
**Scope:** NavManagementFacet, FeeManagementFacet, ClassAdjustmentFacet, RiskMetrics
**Auditor:** Agent 4 (NAV, Fees & Pricing)

---

## Prior Finding Verification

### C-07: Fee rate type mismatch (uint160 vs BPS)
**Status: FIXED**
**Evidence:** `FundManagementFacet.sol:253` — `if (mgmtFeeRate > Constants.BPS_DENOMINATOR) revert ISharedErrors.FeeRateExceedsBPS();` validates the mgmtFeeRate is within BPS range at share class creation time.

### C-08: NAV safety bypassed when currentNav==0
**Status: FIXED**
**Evidence:** `NavManagementFacet.sol:54` — `if (currentNav > 0)` check means when `currentNav == 0` (first NAV update), the NAV change safety check is simply skipped, which is correct behavior — there's no prior NAV to compare against. The `HurdleNotImplemented` revert at `FeeManagementFacet.sol:277` prevents hurdle bypass.

### C-09: Management fee timestamp advances when fee==0
**Status: INTENTIONAL (as documented)**
**Evidence:** `FeeManagementFacet.sol:171-174` — Comment explicitly documents: "C-09: Advance timestamp even when fee is zero — prevents retroactive fee accumulation when an investor subscribes to a previously-empty class." The timestamp advances before the `if (feeAmount == 0) continue;` check.

### V3-C02: `mintAllPendingManagementFees` public no ACL
**Status: FIXED**
**Evidence:** `FeeManagementFacet.sol:158` — The two-argument overload has `onlyInternalExecution` modifier. The public-facing overload at line 74 goes through `_validateAndPropose` with `ROLE_MANAGER`. The cross-facet call from `NavManagementFacet._updateNavInternal()` at line 236 calls via `IFeeManagement(address(this)).mintAllPendingManagementFees(fundId, navTimestamp)` which hits the `onlyInternalExecution` guarded version (since `internalExecutionContext` is already `true` during `executeUpdateNav`).

### V3-C03: Performance fee amounts not validated on-chain
**Status: FIXED**
**Evidence:** `FeeManagementFacet.sol:411` — HWM monotonicity enforced via `if (dealingPrice < currentHwm) revert ISharedErrors.HWMCannotDecrease();`. Fee cap at line 417-418: `uint256 maxFee = Math.mulDiv(ts, dealingPrice - currentHwm, dealingPrice); if (feeAmount > maxFee) revert ISharedErrors.PerformanceFeeExceedsMax();`

### V6-C-01: Fund totalSupply not updated when fees minted — NAV corruption
**Status: STILL PRESENT**
**Evidence:** See finding V7-C-01 below. `FeeManagementFacet.mintAllPendingManagementFees()` at line 203 updates `baseInfo[feeClassId].totalSupply` but NOT `baseInfo[fundId].totalSupply`. Same for `_processPerformanceFeeBatch()` at line 455. The `FundTokensFacet.mint()` updates `FundTokens[0].totalSupply[feeDealingId]` (ERC1155 layer) but there is no hook to sync `baseInfo[fundId].totalSupply`. Since `calculateFundPrice()` at `NavManagementFacet.sol:445` reads `baseInfo[fundId].totalSupply`, this causes fund price to be calculated from a stale (lower) total supply, inflating the price.

### V6-C-03: Uncapped performance fee (100% allowed) + force redemption = manager fund drain
**Status: STILL PRESENT**
**Evidence:** See finding V7-C-02 below. `OrderManagementFacet.sol:429` only checks `perfFeeBps > BPS_DENOMINATOR` (allowing up to 100%). `MAX_ADJUSTED_FEE_RATE_BPS` (2000 = 20%) is only enforced in the view-only `calculateAdjustedFeeRate()` at `FeeManagementFacet.sol:514`, which is NOT called during order processing or batch performance fee minting.

### V6-C-04: Uncapped adjusted fee rate
**Status: PARTIALLY FIXED**
**Evidence:** `calculateAdjustedFeeRate()` at line 514 does cap at `MAX_ADJUSTED_FEE_RATE_BPS`. However, this function is not called in the actual fee minting path. It is only used in the read-only `calculatePerformanceFee()` view function. The actual enforcement during `_processPerformanceFeeBatch` relies only on the HWM-based cap at line 417, which limits fees to the price appreciation above HWM but does NOT enforce a BPS cap.

### V6-C-07: Performance fee div-by-zero
**Status: PARTIALLY FIXED**
**Evidence:** The `calculateDealingPrice()` at `NavManagementFacet.sol:511` handles `dilutionRatio == 0` by returning `classPrice`. However, in `_processPerformanceFeeBatch` at `FeeManagementFacet.sol:397-399`, `Math.mulDiv(oldDilutionRatio, newTotalSupply, oldTotalSupply)` will revert if `oldTotalSupply == 0` (from `FundTokensFacet.totalSupply(dealingId)`). There is no guard for zero totalSupply before this division. The dealing price calculation at line 406 also has a path where `dealingPrice` could be 0 if `classPrice` is 0 (which happens if `fundPrice` is 0, i.e. `nav` is 0), leading to division-by-zero in `Math.mulDiv` at lines 417 and 427.

### V6-XF-01: NAV Update Price Inconsistency Cascade
**Status: PARTIALLY FIXED**
**Evidence:** See finding V7-H-01 below. The processing order was corrected: adjustments run FIRST (line 233), then fees (line 236), then store NAV (line 239). However, `_processAllPendingAdjustments` at line 263 receives `newNav` (line 233) but `calculateFundPrice()` at line 328 reads `s.FundAdmin[0].funds[fundId].nav` which is still the OLD nav. The `newNav` parameter is only used for fund-level dilution at line 365 (`_applyFundDilution`). The class-level dilution safety check at lines 328-331 uses the old fund price (from old nav), creating a mild inconsistency.

---

## New Findings

### V7-C-01: Fund-Level baseInfo.totalSupply Not Updated During Fee Minting

**Severity:** CRITICAL
**Category:** Logic Error / Dual State Inconsistency
**Location:** `src/facets/FeeManagementFacet.sol` lines 199-204 and 437-456

**Description:**
When management fees or performance fees are minted, the code updates `baseInfo[feeClassId].totalSupply` (the fee class supply) and calls `FundTokensFacet.mint()` which updates the ERC1155 `FundTokens[0].totalSupply[feeDealingId]`. However, `baseInfo[fundId].totalSupply` is NEVER updated during fee minting. Since `calculateFundPrice()` at `NavManagementFacet.sol:445` divides NAV by `baseInfo[fundId].totalSupply`, the fund price is calculated from a stale (lower) total supply after each fee mint, causing systematic price inflation.

**Impact:**
After each NAV update that mints management fees:
- Fund price is inflated because the denominator (`baseInfo[fundId].totalSupply`) is lower than actual supply
- This inflated fund price propagates to all class prices via `calculateClassPrice()`
- New subscribers pay too much per token (overpay)
- Existing investors receive inflated valuation (unrealized gains that don't exist)
- The divergence compounds with every fee mint cycle
- Example: Fund has 1000 tokens, NAV = 1,000,000. Fee mint creates 10 tokens. `baseInfo[fundId].totalSupply` stays at 1000. `calculateFundPrice()` = 1,000,000 / 1000 = 1000 per token. Correct price = 1,000,000 / 1010 = 990.1 per token. Error: ~1% per cycle.

**Recommendation:**
Add fund-level totalSupply update when fees are minted:
```solidity
// In mintAllPendingManagementFees, after mint:
s.FundAdmin[0].baseInfo[feeClassId].totalSupply += SafeCast.toUint128(totalFeeInFundTokens);
s.FundAdmin[0].baseInfo[fundId].totalSupply += SafeCast.toUint128(totalFeeInFundTokens); // ADD THIS

// Same in _processPerformanceFeeBatch, after mint:
s.FundAdmin[0].baseInfo[feeClassId].totalSupply += SafeCast.toUint128(fundTokensToMint);
s.FundAdmin[0].baseInfo[fundId].totalSupply += SafeCast.toUint128(fundTokensToMint); // ADD THIS
```

**Status:** OPEN
**Reference:** E-BC25, V6-C-01

---

### V7-C-02: Performance Fee BPS Cap Not Enforced at Processing Time

**Severity:** CRITICAL
**Category:** Logic Error / Missing Validation
**Location:** `src/facets/OrderManagementFacet.sol` line 429 and `src/facets/FeeManagementFacet.sol` lines 387-435

**Description:**
The protocol defines `MAX_ADJUSTED_FEE_RATE_BPS = 2000` (20%) in Constants.sol as the maximum performance fee rate. However, this cap is only enforced in the view-only `calculateAdjustedFeeRate()` function (FeeManagementFacet.sol:514), which is NEVER called during actual fee processing. The order processing path at `OrderManagementFacet.sol:429` only validates `perfFeeBps <= BPS_DENOMINATOR` (10000 = 100%). The `batchMintPerformanceFees` path has no BPS cap at all -- it only validates fee amounts against HWM-based maximum.

**Impact:**
A fund manager can set performance fees up to 100% on redemptions via `OrderToProcess.perfFeeBps`, draining investors of their entire redemption value. Combined with forced redemptions (which bypass investor consent), a malicious manager can extract 100% of an investor's position as "performance fees."

**Recommendation:**
Add BPS cap enforcement in both fee paths:
```solidity
// In OrderManagementFacet._validateOrder:
if (orderToProcess.perfFeeBps > Constants.MAX_ADJUSTED_FEE_RATE_BPS) 
    revert InvalidPerformanceFee(orderToProcess.perfFeeBps);

// In _processPerformanceFeeBatch, add per-dealing BPS check:
uint256 feeBps = Math.mulDiv(feeAmount, BPS_DENOMINATOR, ts);
if (feeBps > Constants.MAX_ADJUSTED_FEE_RATE_BPS) revert FeeTooHigh();
```

**Status:** OPEN
**Reference:** E-BC28, V6-C-03, V6-C-04

---

### V7-H-01: NAV Update Uses Stale Fund Price for Class Adjustment Safety Check

**Severity:** HIGH
**Category:** Logic Error / Stale Data
**Location:** `src/facets/NavManagementFacet.sol` lines 328-331

**Description:**
In `_processAllPendingAdjustments()`, the function receives `newNav` as a parameter but `calculateFundPrice()` at line 328 reads `s.FundAdmin[0].funds[fundId].nav` which is still the OLD nav (the new nav is not stored until line 239, after adjustments and fees are processed). This means the class-level adjustment safety check (`maxAdjBps`) evaluates the adjustment amount against a stale class value derived from the old NAV.

The fund-level dilution at line 365 correctly uses the passed `nav` parameter. But the per-class safety check uses `calculateFundPrice(fundId)` which reads old storage.

**Impact:**
- If the fund NAV increased significantly, the safety check uses an understated class value, potentially blocking legitimate adjustments that are within bounds of the new NAV.
- If the fund NAV decreased significantly, the safety check uses an overstated class value, allowing adjustments that exceed the safe percentage of the actual (lower) class value.
- In the worst case (large NAV decrease + large adjustment), an adjustment that should be rejected passes validation, causing excessive dilution.

**Recommendation:**
Pass the new NAV-derived fund price to the safety check:
```solidity
// In _processAllPendingAdjustments, calculate fundPrice from new nav:
uint128 fundTotalSupply = s.FundAdmin[0].baseInfo[fundId].totalSupply;
uint256 fundPrice = fundTotalSupply == 0 ? PRECISION : Math.mulDiv(nav, PRECISION, fundTotalSupply);
// Then use this fundPrice instead of calling calculateFundPrice(fundId)
```

**Status:** OPEN
**Reference:** V6-XF-01

---

### V7-H-02: Performance Fee Batch Division by Zero When Dealing Has Zero Supply

**Severity:** HIGH
**Category:** Arithmetic Error / Division by Zero
**Location:** `src/facets/FeeManagementFacet.sol` line 399

**Description:**
In `_processPerformanceFeeBatch()`, the dilution ratio update at line 399 computes `Math.mulDiv(oldDilutionRatio, newTotalSupply, oldTotalSupply)`. The `oldTotalSupply` comes from `FundTokensFacet(address(this)).totalSupply(dealingId)`. If a dealing has been fully redeemed (totalSupply == 0), but is included in a performance fee batch, this division reverts, causing the ENTIRE batch to fail -- including legitimate fee claims for other dealings.

**Impact:**
- A single zero-supply dealing in a batch causes all fee claims in that batch to revert.
- This is a denial-of-service vector: a redeemed dealing can block performance fee collection for active dealings in the same class.
- The manager must know to exclude zero-supply dealings, which is an off-chain responsibility with no on-chain guidance.

**Recommendation:**
Add a zero-supply guard:
```solidity
uint256 oldTotalSupply = FundTokensFacet(address(this)).totalSupply(dealingId);
if (oldTotalSupply == 0) {
    if (feeAmount > 0) revert CannotMintFeeForEmptyDealing();
    continue; // Skip zero-supply dealings
}
```

**Status:** OPEN
**Reference:** V6-C-07

---

### V7-H-03: Management Fee Dilution Update Uses Different Supply Than ERC1155 Mint

**Severity:** HIGH
**Category:** Logic Error / Dual State
**Location:** `src/facets/FeeManagementFacet.sol` lines 180-203

**Description:**
In `mintAllPendingManagementFees()`, the dilution ratio is updated based on `baseInfo[classId].totalSupply` (line 180), but the actual ERC1155 token mint at line 202 uses a DIFFERENT supply tracker (`FundTokens[0].totalSupply[feeDealingId]`). The fee amount is first calculated in class tokens (line 169), then converted to fund tokens at line 187 (`feeAmount = Math.mulDiv(feeAmount, classPrice, fundPrice)`). The dilution ratio update at lines 179-184 uses the class-level `baseInfo` totalSupply but the dilution is applied BEFORE the price conversion. This means the dilution reflects the pre-conversion fee amount while the actual minted amount (post-conversion) is different.

Furthermore, the dilution update at line 182 divides by `oldTotalSupply` from `baseInfo[classId].totalSupply`. If this diverges from `FundTokens[0].totalSupply` for the class (which it can, since fee mints update `baseInfo[feeClassId]` but not `baseInfo[classId]` for user classes), the dilution calculation uses an inconsistent denominator.

**Impact:**
The class dilution ratio may not accurately reflect the actual supply dilution caused by fee minting. Over multiple NAV cycles, this error compounds, leading to class prices that drift from their true values. The error direction depends on whether `baseInfo` supply is higher or lower than actual ERC1155 supply.

**Recommendation:**
Either unify the supply trackers or ensure the dilution update uses the same supply source that the mint targets. Consider adding a post-NAV-update assertion that validates `baseInfo.totalSupply` matches `FundTokensFacet.totalSupply()` for all fund/class/dealing tokens.

**Status:** OPEN

---

### V7-M-01: Safety Config Zero-Default Bypass for Adjustment BPS

**Severity:** MEDIUM
**Category:** Configuration / Default Bypass
**Location:** `src/facets/NavManagementFacet.sol` lines 276, 333

**Description:**
The adjustment safety check at line 333 (`if (maxAdjBps > 0 && classValue > 0)`) is silently disabled when `maxAdjBps == 0`. Since `ProtocolSafetyConfig` defaults to all zeros, a fund deployed without explicit safety configuration has NO adjustment size limits. This means arbitrarily large adjustments can be applied without any bounds checking.

**Impact:**
A fund manager who has not configured protocol safety parameters can post adjustments of unlimited size relative to class value. A single large adjustment could dramatically alter dilution ratios, effectively repricing shares arbitrarily.

**Recommendation:**
Either require non-zero safety parameters during fund creation, or use a protocol-wide default when the per-fund config is zero:
```solidity
uint16 effectiveMaxAdj = maxAdjBps > 0 ? maxAdjBps : PROTOCOL_DEFAULT_MAX_ADJ_BPS;
```

**Status:** OPEN
**Reference:** E-BC18

---

### V7-M-02: Unbounded Price History Arrays

**Severity:** MEDIUM
**Category:** Gas / Storage Growth
**Location:** `src/facets/NavManagementFacet.sol` lines 245-247

**Description:**
The fund price history arrays (`fundPrices`, `fundPriceNavTimestamps`, `fundPriceBlockNumbers`) grow by one entry per NAV update with no upper bound. While line 244 comments "T-23: Unbounded storage acceptable on private chain", the `getFundPriceHistory()` function at lines 527-567 creates memory arrays proportional to the query size, and the pagination mitigates unbounded reads. However, the `RiskMetrics.calculateRiskMetrics()` function (and its sub-functions) operate on entire arrays in memory with O(n) and O(n^2) complexity, which could cause out-of-gas issues for long-running funds.

**Impact:**
On a private chain, storage costs are manageable. However, any function that passes the full price array to `RiskMetrics` could run out of gas for funds with hundreds of NAV updates. The `calculatePerformanceFee()` view function at `FeeManagementFacet.sol:220-236` does NOT currently pass price arrays to RiskMetrics (it uses empty metrics), so this is currently dormant but becomes a risk when RiskMetrics is fully implemented.

**Recommendation:**
When implementing full RiskMetrics, ensure a windowed subset of prices is passed rather than the full history. The `windowDays` parameter exists but is not currently used in any price array slicing.

**Status:** OPEN (dormant, becomes active when RiskMetrics is fully implemented)

---

### V7-M-03: Management Fee lastMgmtFeeMintTs Not Initialized at Class Creation

**Severity:** MEDIUM
**Category:** Logic Error / Timestamp Initialization
**Location:** `src/facets/FundManagementFacet.sol` line 292, `src/facets/FeeManagementFacet.sol` lines 167-168

**Description:**
When a share class is created, `lastMgmtFeeMintTs` is initialized to 0 (line 292). In `mintAllPendingManagementFees()` at line 167-168, the check is `if (lastTs > 0 && timestamp <= lastTs) continue;`. When `lastTs == 0`, the condition evaluates to false, so fee calculation proceeds. However, `_calculateManagementFee()` at line 351-353 checks `if (totalSupply == 0 || lastMgmtFeeMintTs >= timestamp) return 0;`. When `lastMgmtFeeMintTs == 0` and `totalSupply == 0`, this returns 0 correctly.

The issue occurs when a class is created, investors subscribe (totalSupply > 0), and then the FIRST NAV update triggers fee minting. The `timeElapsed` at line 357 will be `timestamp - 0 = timestamp`, which is the entire time since epoch (approximately 56 years as of 2026). This would calculate an astronomically large fee.

However, the safeguard at line 364 (`if (targetFeeValue >= classNav) return 0;`) catches this case because such an extreme fee would exceed the class NAV. Additionally, the timestamp advance at line 173 ensures subsequent calls use the correct base timestamp.

**Impact:**
Low practical impact due to the `targetFeeValue >= classNav` safeguard. But the first NAV update after class creation with active supply will silently skip fee calculation rather than calculating the correct pro-rated fee from subscription time. This means the first management fee period is always lost.

**Recommendation:**
Initialize `lastMgmtFeeMintTs` to `block.timestamp` at class creation time, or to the first subscription timestamp:
```solidity
s.FundAdmin[0].classes[classId].lastMgmtFeeMintTs = uint32(block.timestamp);
```

**Status:** OPEN

---

### V7-M-04: RiskMetrics calculateTotalReturn Underflow on Price Decrease

**Severity:** MEDIUM
**Category:** Arithmetic Error
**Location:** `src/libs/RiskMetrics.sol` line 138

**Description:**
`calculateTotalReturn()` computes `(lastPrice - firstPrice) * PRECISION / firstPrice` at line 138. If `lastPrice < firstPrice` (negative return), this underflows in Solidity 0.8+ and reverts. The function signature returns `uint256`, making it impossible to represent negative returns.

**Impact:**
Any call to `calculateTotalReturn()` or `calculateReturn()` with a declining price series will revert. This prevents risk metrics calculation for funds that have decreased in value. Currently dormant since RiskMetrics is mock/placeholder, but will cause issues when fully implemented.

**Recommendation:**
Return a signed value or split into positive/negative:
```solidity
function calculateTotalReturn(uint128[] memory prices) internal pure returns (int256 totalReturn) {
    // ...
    int256 priceDiff = int256(uint256(lastPrice)) - int256(uint256(firstPrice));
    totalReturn = (priceDiff * int256(PRECISION)) / int256(uint256(firstPrice));
}
```

**Status:** OPEN

---

### V7-M-05: RiskMetrics Sharpe/Sortino Ratio Negative Return Cast to uint256

**Severity:** MEDIUM
**Category:** Arithmetic Error
**Location:** `src/libs/RiskMetrics.sol` lines 176 and 246

**Description:**
In `calculateSharpeRatio()` at line 176, `meanReturn` (which is `int256`) is cast to `uint256` via `uint256(meanReturn)`. If `meanReturn` is negative, this wraps to a very large `uint256` value, producing a wildly incorrect annualized return. The same issue exists in `calculateSortinoRatio()` at line 246.

**Impact:**
Funds with negative average returns will produce extremely large (incorrect) Sharpe/Sortino ratios instead of negative ones. Currently dormant since RiskMetrics outputs are zeroed in the performance fee calculation, but will cause incorrect fee calculations when fully implemented.

**Recommendation:**
Handle negative mean returns explicitly:
```solidity
if (meanReturn < 0) return 0; // No positive Sharpe when returns are negative
annualizedReturn = (uint256(meanReturn) * SECONDS_PER_YEAR) / timeSpan;
```

**Status:** OPEN

---

### V7-L-01: Missing Event Emission for Safety Config Fields

**Severity:** LOW
**Category:** Missing Events
**Location:** `src/facets/NavManagementFacet.sol` line 209

**Description:**
The `ProtocolSafetyConfigUpdated` event at line 209 emits only 4 of the 6 safety config fields: `maxNavChangeBps`, `maxTimestampDeviation`, `maxMgmtFeeRateBps`, `maxAdjustmentBps`. The `maxNoticePeriod` and `maxLockPeriod` fields are stored but not emitted, making it harder to audit config changes off-chain.

**Impact:**
Off-chain monitoring systems cannot detect changes to notice period and lock period safety limits without reading storage directly.

**Recommendation:**
Update the event to include all 6 fields, or emit a separate event for the additional fields.

**Status:** OPEN

---

### V7-L-02: Class Iteration Skips Class ID 1 (Fee Class) Silently

**Severity:** LOW
**Category:** Logic Clarity
**Location:** `src/facets/FeeManagementFacet.sol` line 165

**Description:**
The loop `for (uint16 i = 2; i <= nextClassId; i++)` starts at 2, intentionally skipping class 1 (the fee class). This is correct behavior (fee class should not have management fees calculated), but there is no check that the fee class (class 1) exists or is properly configured. If `nextClassId` is 1, no fees are calculated at all (loop doesn't execute). If `nextClassId` is 0, the loop also doesn't execute due to unsigned underflow in the comparison.

**Impact:**
Informational only. The behavior is correct but relies on the convention that class 1 is always the fee class, which should be documented more explicitly.

**Status:** OPEN

---

### V7-L-03: Adjustment Audit Record Uses int128 Amount but PendingAdjustment Also Uses int128

**Severity:** LOW
**Category:** Logic Clarity
**Location:** `src/facets/NavManagementFacet.sol` line 295

**Description:**
In `_processAllPendingAdjustments()`, the aggregation at line 295 adds `int256(pa.amount)` to `netAmounts`, and at line 296 adds to `totalNetAdjustment`. Since `pa.amount` is `int128` and the aggregation uses `int256`, there is no overflow risk for individual additions. However, with `MAX_PENDING_ADJUSTMENTS = 100` and `int128` max value ~1.7e38, the theoretical maximum `totalNetAdjustment` is ~1.7e40, which fits in `int256`.

The individual audit records at line 299 store the original per-adjustment amount, which is correct.

**Impact:**
No practical issue. The aggregation is safe within the bounds of `MAX_PENDING_ADJUSTMENTS`.

**Status:** OPEN (informational)

---

### V7-L-04: Performance Fee History Tracks Converted Amount, Not Original

**Severity:** LOW
**Category:** Audit Trail Accuracy
**Location:** `src/facets/FeeManagementFacet.sol` lines 191-194 and 426-429

**Description:**
Fee history records store the fee amount after conversion to fund tokens (management fees at line 187: `feeAmount = Math.mulDiv(feeAmount, classPrice, fundPrice)`, and performance fees at line 427: `Math.mulDiv(feeAmount, dealingPrice, fundPrice)`). The original class-token or dealing-token denominated fee amounts are not preserved in the audit trail, making it harder to reconstruct the exact fee calculation for compliance purposes.

**Impact:**
Off-chain auditors cannot verify the original fee amount in the class/dealing denomination from the on-chain audit trail alone. They must reconstruct it from historical prices.

**Recommendation:**
Store both the original and converted amounts in the fee history, or add a separate field.

**Status:** OPEN

---

### V7-I-01: Floating Pragma

**Severity:** INFORMATIONAL
**Category:** Best Practice
**Location:** All files use `pragma solidity ^0.8.28;`

**Description:**
All audited contracts use a floating pragma (`^0.8.28`), which means they can be compiled with any 0.8.x compiler >= 0.8.28. For production deployment, a fixed pragma is recommended to ensure deterministic compilation.

**Status:** OPEN
**Reference:** SWC-103

---

### V7-I-02: RiskMetrics Library is Placeholder/Mock

**Severity:** INFORMATIONAL
**Category:** Incomplete Implementation
**Location:** `src/libs/RiskMetrics.sol` (entire file), `src/facets/FeeManagementFacet.sol` lines 232-235

**Description:**
The `calculatePerformanceFee()` function passes empty/zeroed `RiskMetrics` structs to `calculateAdjustedFeeRate()`. The comment at line 270 states "RiskMetrics is mock — returning 0 until slither is fixed or RiskMetrics is production." Multiple bugs exist in RiskMetrics (V7-M-04, V7-M-05) that will surface when fully implemented.

**Impact:**
No current impact since metrics are zeroed. All findings against RiskMetrics are dormant but will become active when the library is used in production.

**Status:** OPEN

---

## Summary

| Severity | Count |
|----------|-------|
| CRITICAL | 2 |
| HIGH | 3 |
| MEDIUM | 5 |
| LOW | 4 |
| INFORMATIONAL | 2 |
| **Total** | **16** |

### Prior Findings Status

| Finding | Status |
|---------|--------|
| C-07 | FIXED |
| C-08 | FIXED |
| C-09 | INTENTIONAL |
| V3-C02 | FIXED |
| V3-C03 | FIXED |
| V6-C-01 | STILL PRESENT |
| V6-C-03 | STILL PRESENT |
| V6-C-04 | PARTIALLY FIXED |
| V6-C-07 | PARTIALLY FIXED |
| V6-XF-01 | PARTIALLY FIXED |
