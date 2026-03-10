# Audit V8 Agent 5: FXManagementFacet + SettlementFacet

**Date:** 2026-03-02
**Auditor:** Claude Opus 4.6 (Agent 5)
**Scope:** `contracts/src/facets/FXManagementFacet.sol`, `contracts/src/facets/SettlementFacet.sol`
**Related:** `FundAdminStructs.sol` (FXRateData, FXSafetyConfig), `Constants.sol`, `BaseFacet.sol`, `FundTokensFacet.sol`, `AccountFacet.sol`, `InitDiamond.sol`

---

## Catalog Pattern Verification

| Pattern | Status | Evidence |
|---------|--------|----------|
| E-BC17 | FIXED | `_validateSettlementFxRate` (SettlementFacet.sol:140) computes `referenceCrossRate` via `FXManagementFacet.getFXRate(sourceCurrency, targetCurrency)` using both USD rates. Deviation is checked against this computed cross-rate, not a single-currency USD rate. |
| E-BC20 | FIXED | `_executeProposal` (AccountFacet.sol:1036) acquires `reentrancyLock` before any delegatecall to execute* functions. ERC1155 callback during mint cannot re-enter through the proposal system because `reentrancyLock` blocks `_executeProposal` re-entry. |
| E-BC21 | FIXED | `_settleSubscribe` (SettlementFacet.sol:175-177) decrements `cashPendingSwap` and updates `cashPendingSubscribe` and processing history BEFORE token operations (lines 180-183). CEI pattern is correctly applied. `_settleRedeem` (line 198) likewise decrements `cashPendingSwap` before token ops. |
| E-BC23 | FIXED | Same as E-BC17. SettlementFacet.sol:140 calls `getFXRate(sourceCurrency, targetCurrency)` which computes `(quoteVsUSD * PRECISION) / baseVsUSD` (FXManagementFacet.sol:120). Deviation check at line 148 is against this correct cross-rate. |
| E-BC26 | STILL PRESENT | `InitDiamond.sol` never initializes `fxSafetyConfig`. Both `maxFxRateChangeBps` and `maxFxSettlementDeviationBps` default to 0. Zero means "no limit" in both `executeUpdateFXRates` (line 78: `if (maxChangeBps > 0 && existingRate > 0)`) and `validateFxRateDeviation` (line 225: `if (maxDeviationBps == 0) return`). A deployment that forgets to call `setFXSafetyConfig` has zero FX validation. |

---

## Findings

### V8-A5-01: FX Safety Config Default-Zero Bypasses All FX Validation

**Severity:** Medium
**Location:** `FXManagementFacet.sol:78`, `FXManagementFacet.sol:225`, `InitDiamond.sol` (missing initialization)
**Description:**
`FXSafetyConfig` is never initialized in `InitDiamond.init()`. Both fields (`maxFxRateChangeBps`, `maxFxSettlementDeviationBps`) default to 0. In the validation logic:

- `executeUpdateFXRates` line 78: `if (maxChangeBps > 0 && existingRate > 0)` -- when `maxChangeBps == 0`, the rate-change safety check is entirely skipped.
- `validateFxRateDeviation` line 225: `if (maxDeviationBps == 0) return;` -- when `maxDeviationBps == 0`, settlement FX deviation validation is entirely skipped.
- `_validateSettlementFxRate` line 144: `if (maxDeviationBps > 0)` -- same zero bypass.

A deployment that does not explicitly call `setFXSafetyConfig` has no FX rate validation at all. An FX updater can set any rate (within the MAX_FX_RATE_MULTIPLIER bound), and settlement operators can use any FX rate with no deviation check.

**Impact:** An FX updater with a compromised key can set extreme rates (e.g., 1 USD = 999e18 EUR), and settlement operators can settle at wildly different rates from the reference, enabling value extraction from fund holders.

**Recommendation:** Initialize `fxSafetyConfig` in `InitDiamond.init()` with sensible defaults (e.g., 500 bps for rate change, 200 bps for settlement deviation). Alternatively, treat `maxDeviationBps == 0` as "use protocol maximum" rather than "disabled":
```solidity
// Instead of:
if (maxDeviationBps == 0) return;
// Use:
if (maxDeviationBps == 0) maxDeviationBps = 500; // default 5%
```

**Status:** OPEN (E-BC26 still present)

---

### V8-A5-02: validateFxRateDeviation Validates Single-Currency Rate, Not Cross-Rate

**Severity:** Medium
**Location:** `FXManagementFacet.sol:223-234`, `OrderManagementFacet.sol:512-513`
**Description:**
`FXManagementFacet.validateFxRateDeviation(uint16 currencyCode, uint128 providedRate)` validates a provided rate against `fxRegistry[currencyCode].rateVsUSD` -- a single-currency USD rate. However, in `OrderManagementFacet.sol:513`, it is called with a cross-rate (`fxRateToFund`, which is class-currency to fund-currency):

```solidity
// OrderManagementFacet.sol:512-513
FXManagementFacet(address(this)).getFXRate(classCurrency, fundCurrency);  // return value IGNORED
FXManagementFacet(address(this)).validateFxRateDeviation(classCurrency, uint128(fxRate));
```

The `getFXRate` call on line 512 computes the correct cross-rate but its return value is discarded. Then `validateFxRateDeviation` compares the provided cross-rate (`fxRate`) against `fxRegistry[classCurrency].rateVsUSD`, which is a completely different quantity. For example, if `classCurrency = EUR` and `fundCurrency = GBP`:
- `fxRate` might be ~1.17e18 (EUR->GBP cross-rate)
- `fxRegistry[EUR].rateVsUSD` is ~0.92e18 (EUR per USD)

These have different scales, making the deviation check meaningless -- it could either always pass or always fail depending on the actual rates.

Note: `SettlementFacet._validateSettlementFxRate` does NOT use `validateFxRateDeviation` and correctly computes the cross-rate via `getFXRate` before validating deviation. The bug is only in the order processing path.

**Impact:** Cross-currency order processing FX rate validation is mathematically invalid. An admin could supply a manipulated `fxRateToFund` that passes the meaningless deviation check but results in incorrect value calculations, potentially over- or under-charging investors.

**Recommendation:** In `OrderManagementFacet`, use the cross-rate from `getFXRate` for deviation validation:
```solidity
uint256 referenceCrossRate = FXManagementFacet(address(this)).getFXRate(classCurrency, fundCurrency);
uint256 diff = fxRate > referenceCrossRate ? fxRate - referenceCrossRate : referenceCrossRate - fxRate;
uint256 deviationBps = (diff * BPS_DENOMINATOR) / referenceCrossRate;
if (deviationBps > maxDeviationBps) revert FXRateDeviationExceedsLimit(...);
```

**Status:** OPEN

---

### V8-A5-03: No Batch Size Limit on updateFXRates

**Severity:** Low
**Location:** `FXManagementFacet.sol:62` (loop in `executeUpdateFXRates`)
**Description:**
`executeUpdateFXRates` iterates over `rates.length` with no upper bound. While gas limits provide a natural cap, an FX updater could submit a very large batch that consumes all available block gas, potentially causing the transaction to fail in unpredictable ways or making the function unusable if always paired with other operations.

The loop body performs multiple storage reads and writes per iteration (safety config read, existing rate read, registry write), each consuming significant gas.

**Impact:** Denial of service if an FX updater submits an excessively large batch. Low severity because the FX_UPDATER role is trusted and gas limits provide a natural bound.

**Recommendation:** Add a reasonable batch size limit:
```solidity
if (rates.length > 50) revert BatchTooLarge();
```

**Status:** OPEN

---

### V8-A5-04: Stale FX Rate Used in Settlement Cross-Rate Validation

**Severity:** Low
**Location:** `SettlementFacet.sol:140`, `FXManagementFacet.sol:112-121`
**Description:**
`_validateSettlementFxRate` computes the reference cross-rate via `FXManagementFacet.getFXRate(sourceCurrency, targetCurrency)`. The `getFXRate` function reads from `fxRegistry` but does NOT check the `timestamp` field of the stored rate data. The staleness check (`DEFAULT_MAX_FX_RATE_AGE = 1 day`) is only enforced at write time in `executeUpdateFXRates` (lines 55-57).

This means a rate that was valid when written (within 1 day of its timestamp) could be used for settlement validation weeks later, long after the actual market rate has changed significantly. The reference cross-rate used for deviation validation could be extremely stale.

**Impact:** Settlement operations could be validated against outdated reference rates, allowing settlement at rates that deviate significantly from current market rates. An operator could wait for a favorable stale rate and then settle.

**Recommendation:** Add a staleness check in `_getRateVsUSD` or `getFXRate`:
```solidity
function _getRateVsUSD(uint16 currencyCode) internal view returns (uint256) {
    if (currencyCode == Constants.ISO_USD) return Constants.PRECISION;
    FundAdminStructs.FXRateData storage data = s.FundAdmin[0].fxRegistry[currencyCode];
    if (data.rateVsUSD == 0) revert ISharedErrors.FXRateNotAvailable(currencyCode, Constants.ISO_USD);
    if (block.timestamp - data.timestamp > Constants.DEFAULT_MAX_FX_RATE_AGE) {
        revert ISharedErrors.FXRateTimestampTooOld();
    }
    return uint256(data.rateVsUSD);
}
```

**Status:** OPEN

---

### V8-A5-05: Settlement Redeem Accepts Both FILLED and PENDING Status

**Severity:** Low
**Location:** `SettlementFacet.sol:78`
**Description:**
For redeem settlements, the code accepts orders in both `FILLED` and `PENDING` status:
```solidity
if (current.status != FundAdminStructs.OrderStatus.FILLED && current.status != FundAdminStructs.OrderStatus.PENDING) {
    revert OrderNotPending();
}
```

The comment on line 73 says "Redeem settlement accepts FILLED (order already processed, cash awaits off-chain swap)". However, also accepting `PENDING` means a redeem settlement can be confirmed before the order has been processed/filled. This could allow settling a cross-umbrella redeem before the investor's shares have actually been redeemed, creating an accounting inconsistency.

**Impact:** A settlement operator could confirm a redeem settlement prematurely (while order is still PENDING), triggering token operations (burn source cash, mint target cash) before the actual redemption has occurred. The `cashPendingSwap` check (line 83) should catch cases where no swap was queued, but if `cashPendingSwap` was set during order creation, the settlement could proceed prematurely.

**Recommendation:** Restrict redeem settlement to `FILLED` status only, unless there is a documented business requirement for settling pending redeems:
```solidity
if (current.status != FundAdminStructs.OrderStatus.FILLED) revert OrderNotFilled();
```

**Status:** OPEN

---

### V8-A5-06: No Double-Settlement Guard Beyond cashPendingSwap

**Severity:** Low
**Location:** `SettlementFacet.sol:83`
**Description:**
The only guard against double-settlement is `if (sourceAmount > order.cashPendingSwap) revert SettlementAmountExceeded()`. This works because `cashPendingSwap` is decremented in `_settleSubscribe` (line 175) and `_settleRedeem` (line 198). Once fully settled, `cashPendingSwap == 0` and any subsequent settlement attempt reverts.

However, there is no explicit "already settled" flag or status transition. Partial settlements are allowed (settle for less than `cashPendingSwap`). The order status is NOT changed to a "SETTLED" state after settlement -- for subscribe, it remains PENDING; for redeem, it remains FILLED.

**Impact:** While the `cashPendingSwap` decrement prevents double-spend of the same amount, the lack of explicit settlement status tracking makes it harder to audit and query settlement state. There is no event or status change indicating an order is fully settled vs partially settled.

**Recommendation:** Consider adding a settlement status field or emitting the remaining `cashPendingSwap` in the `CashFundSettlementConfirmed` event for off-chain tracking.

**Status:** OPEN

---

### V8-A5-07: _settleRedeem Modifies Dependent Order Without Cross-Umbrella Validation

**Severity:** Medium
**Location:** `SettlementFacet.sol:206-219`
**Description:**
In `_settleRedeem`, when `order.dependentFundNum > 0`, the code modifies a dependent order in a different fund (potentially different umbrella):

```solidity
uint256 depFundId = TokenIdUtils.createTokenId(
    order.dependentUmbrellaId, order.dependentFundNum, 0, 0
);
FundAdminStructs.Order storage depOrder =
    s.FundAdmin[0].orderBook[depFundId].orders[order.dependentOrderId];
```

There is no validation that:
1. The dependent fund exists or is active
2. The dependent order exists or is in valid state
3. The `order.investor` matches `depOrder.investor`
4. The dependent order's `paymentCashFundTokenId` matches the `targetCash` being locked

The `dependentOrderId`, `dependentFundNum`, and `dependentUmbrellaId` are set at order creation time and trusted during settlement. If the dependent order was cancelled between creation and settlement, the settlement still proceeds and appends processing history to a cancelled order.

**Impact:** Settlement of a redeem order with a swap linkage could modify a cancelled or otherwise invalid dependent order, creating inconsistent state. The locked tokens on the dependent side may never be unlocked if the dependent order is in an unexpected state.

**Recommendation:** Add validation of the dependent order's state before modifying it:
```solidity
if (depOrder.investor != order.investor) revert InvestorMismatch();
FundAdminStructs.OrderProcessingStatus storage depCurrent = _getCurrentProcessingStatus(depOrder);
if (depCurrent.status == FundAdminStructs.OrderStatus.CANCELLED) revert DependentOrderCancelled();
```

**Status:** OPEN

---

### V8-A5-08: Settlement Amount Not Validated Against Original Order Amount

**Severity:** Low
**Location:** `SettlementFacet.sol:83`
**Description:**
The `sourceAmount` parameter is only validated against `cashPendingSwap`:
```solidity
if (sourceAmount > order.cashPendingSwap) revert SettlementAmountExceeded();
```

There is no validation that `sourceAmount > 0`. A settlement operator could submit a settlement with `sourceAmount = 0`, which would:
- Pass the `sourceAmount > cashPendingSwap` check (0 > 0 is false, so no revert)
- Compute `targetAmount = 0`
- Perform unlock/burn/mint operations with amount 0 (which would revert in `unlockTokens` due to `if (amount == 0) revert InvalidLockAmount()`)

While the zero-amount case is caught downstream by `unlockTokens`, the validation should be explicit at the entry point.

**Impact:** Low -- the zero-amount case reverts downstream. However, the error message would be confusing (InvalidLockAmount instead of a settlement-specific error).

**Recommendation:** Add explicit zero check:
```solidity
if (sourceAmount == 0) revert ISharedErrors.AmountZero();
```

**Status:** OPEN

---

### V8-A5-09: FX Rate Change Safety Check Skipped for First Rate Update

**Severity:** Low
**Location:** `FXManagementFacet.sol:78`
**Description:**
The rate-change safety check has a compound condition:
```solidity
if (maxChangeBps > 0 && existingRate > 0) {
    uint256 deviationBps = _calculateDeviationBps(rate, existingRate);
    ...
}
```

When `existingRate == 0` (first time a rate is set for a currency), the deviation check is entirely skipped. This means the first rate update for any currency can be set to any value (up to `MAX_FX_RATE_MULTIPLIER * PRECISION = 1000e18`).

This is likely intentional (you cannot compute deviation from zero), but combined with V8-A5-01 (no safety config by default), a compromised FX updater could set initial rates to extreme values.

**Impact:** Low -- the first rate for a currency has no rate-change validation. The `MAX_FX_RATE_MULTIPLIER` bound (1000x) provides a ceiling, but this still allows setting 1 USD = 1000e18 JPY on first update.

**Recommendation:** For new currencies, require an admin-level confirmation for the first rate, or validate against known reasonable bounds per currency.

**Status:** OPEN

---

### V8-A5-10: FXManagementFacet Role Check Uses Unified Mapping Correctly

**Severity:** Informational (Positive Finding)
**Location:** `FXManagementFacet.sol:38`, `BaseFacet.sol:136`
**Description:**
`updateFXRates` passes `ROLE_FX_UPDATER` to `_validateAndPropose`, which checks `s.FundAdmin[0].roles[requiredRole][accountAddress]` (BaseFacet.sol:136). This is the correct unified roles mapping, not the legacy `admins` or `navUpdaters` mappings.

**Status:** CONFIRMED CORRECT

---

## Summary

| ID | Severity | Title |
|----|----------|-------|
| V8-A5-01 | Medium | FX Safety Config Default-Zero Bypasses All FX Validation |
| V8-A5-02 | Medium | validateFxRateDeviation Validates Single-Currency Rate, Not Cross-Rate (in OrderManagement) |
| V8-A5-03 | Low | No Batch Size Limit on updateFXRates |
| V8-A5-04 | Low | Stale FX Rate Used in Settlement Cross-Rate Validation |
| V8-A5-05 | Low | Settlement Redeem Accepts Both FILLED and PENDING Status |
| V8-A5-06 | Low | No Double-Settlement Guard Beyond cashPendingSwap |
| V8-A5-07 | Medium | _settleRedeem Modifies Dependent Order Without Cross-Umbrella Validation |
| V8-A5-08 | Low | Settlement Amount Not Validated Against Original Order Amount (sourceAmount=0) |
| V8-A5-09 | Low | FX Rate Change Safety Check Skipped for First Rate Update |
| V8-A5-10 | Informational | FXManagementFacet Role Check Uses Unified Mapping Correctly |

**Catalog Pattern Status:**
- E-BC17: FIXED (SettlementFacet correctly uses cross-rate; OrderManagement still broken -- see V8-A5-02)
- E-BC20: FIXED (reentrancyLock in _executeProposal prevents re-entry during ERC1155 callbacks)
- E-BC21: FIXED (cashPendingSwap decremented before token operations in both _settleSubscribe and _settleRedeem)
- E-BC23: FIXED in SettlementFacet; STILL PRESENT in OrderManagementFacet (see V8-A5-02)
- E-BC26: STILL PRESENT (InitDiamond never sets fxSafetyConfig; zero = disabled)
