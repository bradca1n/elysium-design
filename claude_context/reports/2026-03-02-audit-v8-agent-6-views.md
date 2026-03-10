# Audit V8 Agent 6: View Facets & OrderValidation

**Date:** 2026-03-02
**Auditor:** Claude Opus 4.6 (Security Audit Agent)
**Scope:**
- `contracts/src/facets/ViewCallsFacet.sol`
- `contracts/src/facets/ViewCalls2Facet.sol`
- `contracts/src/facets/AdminViewCallsFacet.sol`
- `contracts/src/facets/ManagerViewCallsFacet.sol`
- `contracts/src/facets/OrderValidationFacet.sol`

**Methodology:** Manual code review against vulnerability checklist, known error catalog (E-BC01 through E-BC29), and Slither-flagged items.

---

## [MEDIUM] V8-6-01: Dealing ID Off-By-One in _hasAnyDealingBalance Undercounts Investors

**Location:** `ManagerViewCallsFacet.sol:362`
**Description:** The `_hasAnyDealingBalance` function uses `d < nextDealingId` to iterate dealings, but per E-BC04, `nextDealingId` equals the last created dealing ID (pre-increment semantics). Using `<` instead of `<=` causes the loop to skip the most recently created dealing for every class.

```solidity
// Line 362 - BUG: misses the last dealing
for (uint16 d = 1; d < nextDealingId; d++) {
```

**Attack/Impact:** The `getFundInvestorCount`, `getFundSummary`, and `getManagedFundSummaries` functions all depend on `_hasAnyDealingBalance`. Any investor who holds tokens only in the most recently created dealing of any class will be excluded from the investor count. This leads to an undercount visible on the manager and admin dashboards. For funds with a single dealing per class (common early in a fund's life), the investor count could be zero even when investors hold tokens.

**E-BC Reference:** E-BC04 (Dealing ID Off-By-One)
**Recommendation:** Change to `d <= nextDealingId`:
```solidity
for (uint16 d = 1; d <= nextDealingId; d++) {
```

---

## [MEDIUM] V8-6-02: _getOrderBookSize Returns Total Orders, Misrepresented as Pending Order Count

**Location:** `ManagerViewCallsFacet.sol:376-378`, `AdminViewCallsFacet.sol:311-313`
**Description:** The `_getOrderBookSize` function returns `tail - 1` which is the total number of orders ever created in the order book, regardless of their status (PENDING, FILLED, CANCELLED). This value is assigned to `FundSummary.pendingOrderCount` (line 49) and `SystemOverview.totalPendingOrders` (line 80), making the UI show total historical orders as if they were pending.

```solidity
// ManagerViewCallsFacet.sol:38
uint32 pendingOrderCount = _getOrderBookSize(fundId); // Returns TOTAL, not PENDING

// ManagerViewCallsFacet.sol:49
pendingOrderCount: pendingOrderCount, // Struct field implies these are pending
```

The inconsistency is further confirmed by `getPendingOrderCountPaginated` (lines 236-256) which correctly iterates orders and checks for PENDING status, returning a different (correct) number.

**Attack/Impact:** Dashboard consumers relying on `pendingOrderCount` from `getFundSummary` or `totalPendingOrders` from `getSystemOverview` will see inflated counts. As orders accumulate and get processed over time, the "pending" count monotonically increases, never reflecting actual pending state. This could cause operational confusion or incorrect automated decisions by off-chain systems.

**E-BC Reference:** NEW
**Recommendation:** Either rename the field to `totalOrderCount` to reflect what it actually returns, or iterate orders to count only PENDING ones (as `getPendingOrderCountPaginated` already does). Given gas concerns on view calls for large order books, renaming is the pragmatic fix.

---

## [MEDIUM] V8-6-03: State-Modifying Functions in AdminViewCallsFacet Missing Events

**Location:** `AdminViewCallsFacet.sol:357-374` (registerCurrency), `AdminViewCallsFacet.sol:380-388` (deactivateCurrency), `AdminViewCallsFacet.sol:421-424` (setFxUpdater), `AdminViewCallsFacet.sol:520-530` (executeDeactivateUmbrellaCurrency)
**Description:** Four state-modifying functions in `AdminViewCallsFacet` do not emit events:
1. `registerCurrency` -- writes new currency to storage, no event
2. `deactivateCurrency` -- sets `isActive = false`, no event
3. `setFxUpdater` -- modifies role mapping, no event
4. `executeDeactivateUmbrellaCurrency` -- deactivates umbrella currency, no event

Only `_activateUmbrellaCurrencyInternal` (line 558) emits an event.

**Attack/Impact:** Off-chain indexers and audit trail systems cannot detect when currencies are registered/deactivated or when FX updater roles are granted/revoked. This violates the "Storage-First" design paradigm where "every state change stores block.number for audit trail." Without events, detecting role changes requires polling all accounts, and detecting currency changes requires polling the full registry.

**E-BC Reference:** NEW (relates to project rule "Emit events for ALL state changes")
**Recommendation:** Add events for each state-changing operation:
```solidity
event CurrencyRegistered(uint16 indexed isoNumericCode, bytes3 alphaCode, uint8 decimals);
event CurrencyDeactivated(uint16 indexed isoNumericCode);
event FxUpdaterSet(address indexed fxUpdater, bool isUpdater);
event UmbrellaCurrencyDeactivated(uint16 indexed umbrellaId, uint16 indexed currencyCode);
```

---

## [MEDIUM] V8-6-04: ViewCalls2Facet._buildClassView Silently Falls Back to Base Price When FX Fails

**Location:** `ViewCalls2Facet.sol:277-281`
**Description:** When `calculateClassPriceInDenomination` reverts (e.g., because the FX rate is not available for the class's denomination currency), the code catches the error and silently falls back to `cv.currentPrice` (the base price in the fund's reporting currency).

```solidity
try NavManagementFacet(address(this)).calculateClassPriceInDenomination(classId, fundPrice) returns (uint256 p) {
    cv.currentPriceInDenomination = p;
} catch {
    cv.currentPriceInDenomination = cv.currentPrice; // Silent fallback
}
```

This means `currentPriceInDenomination` could be in a completely different currency than expected (reporting currency instead of denomination currency) with no indication to the caller that the conversion failed.

**Attack/Impact:** A UI or off-chain system consuming `ClassView.currentPriceInDenomination` would display a price in the wrong currency (e.g., showing a USD price labeled as EUR). For a GBP-denominated class in a USD fund where the GBP/USD rate is missing, the price would be off by the FX factor. This is related to E-BC26 (FX zero bypass) -- if FX rates are never set, all denomination prices silently default to base prices.

**E-BC Reference:** E-BC26 (FX Safety Config Default-Zero Bypass)
**Recommendation:** Instead of silently falling back, set `currentPriceInDenomination = 0` and add a boolean field `fxConversionFailed` to `ClassView`, or revert the entire call. At minimum, emit a distinct value (0 or type(uint256).max) that clearly signals the conversion could not be performed.

---

## [LOW] V8-6-05: OrderValidationFacet._checkClassRulesAtSubmission Potential Underflow on Redemption Balance Check

**Location:** `OrderValidationFacet.sol:265`
**Description:** When validating a redemption order's minimum holding constraint, the code subtracts the order value from the current balance value without checking that the subtraction won't underflow:

```solidity
uint256 finalBalanceValue = currentBalanceValue - orderValueInBaseTokens;
```

If `orderValueInBaseTokens > currentBalanceValue` (possible due to price movements between order submission and validation, or calculation rounding differences), this line will revert with an arithmetic underflow panic instead of a descriptive custom error.

**Attack/Impact:** An investor attempting to validate a full redemption (or near-full redemption where price changes cause the calculated order value to exceed current balance value) would receive a raw panic revert (`0x11`) instead of a meaningful error like `InsufficientBalance`. This degrades the UX of the validation dry-run and makes off-chain error handling harder.

**E-BC Reference:** NEW
**Recommendation:** Add an explicit check before the subtraction:
```solidity
if (orderValueInBaseTokens > currentBalanceValue) return; // Full redemption, no min-holding issue
uint256 finalBalanceValue = currentBalanceValue - orderValueInBaseTokens;
```

---

## [LOW] V8-6-06: ViewCallsFacet._calculateAvailableBalance Potential Underflow

**Location:** `ViewCallsFacet.sol:1348`
**Description:** The function subtracts locked balance from total balance without a safety check:

```solidity
return balance - locked;
```

If a bug in another facet causes `lockedBalances > balances` for a token, this view function would revert with a panic, making the entire `getPortfolio` call fail for the affected user.

**Attack/Impact:** A single corrupted locked balance (from a bug elsewhere) would make `getPortfolio` completely unusable for the affected account, as the panic propagates up through the entire portfolio construction. The view function should be resilient to unexpected storage states.

**E-BC Reference:** NEW
**Recommendation:** Use a safe subtraction:
```solidity
return locked >= balance ? 0 : balance - locked;
```

---

## [LOW] V8-6-07: AdminViewCallsFacet Contains State-Modifying Functions in a "View" Facet

**Location:** `AdminViewCallsFacet.sol:357-559`
**Description:** Despite being named "AdminViewCallsFacet," this contract contains 6 state-modifying functions: `registerCurrency`, `deactivateCurrency`, `setFxUpdater`, `activateUmbrellaCurrency`, `executeActivateUmbrellaCurrency`, `deactivateUmbrellaCurrency`, `executeDeactivateUmbrellaCurrency`. The naming suggests read-only operations but the contract performs writes.

**Attack/Impact:** This is an architectural concern, not a security vulnerability. Developers maintaining the codebase may assume view facets are safe to call from other contracts in a static context, but these functions modify storage. The mixed nature also makes auditing harder -- state-modifying functions in a "view" facet may receive less scrutiny. All state-modifying functions here do have proper access control (`onlyOwnerDiamond` or `_validateAndPropose`).

**E-BC Reference:** E-BC16 (partially -- access control is present but naming is misleading)
**Recommendation:** Move state-modifying functions to a dedicated `CurrencyManagementFacet` or `AdminConfigFacet`. Keep `AdminViewCallsFacet` purely read-only.

---

## [LOW] V8-6-08: getSystemOverview and getRoleAssignments Unbounded Account Iteration

**Location:** `AdminViewCallsFacet.sol:69-73` (getSystemOverview), `AdminViewCallsFacet.sol:253-257` (getRoleAssignments)
**Description:** `getSystemOverview` iterates all accounts to count admins and NAV updaters without a cap. `getRoleAssignments` does two full passes over all accounts plus two passes over all funds. While `getSystemOverviewPaginated` exists as a paginated alternative, the non-paginated `getSystemOverview` and `getRoleAssignments` have no gas limit protection.

Similarly, `getRoleAssignments` allocates arrays sized by its first-pass counts and then does a second full iteration, doubling the gas cost.

**Attack/Impact:** On a private blockchain with unlimited gas, this is acceptable. However, if the number of accounts grows large (thousands), these functions could exceed gas limits even in `eth_call` on some node implementations. `getRoleAssignments` does not have a paginated alternative at all.

**E-BC Reference:** NEW
**Recommendation:** Add pagination to `getRoleAssignments`. Document the gas considerations for `getSystemOverview` (non-paginated version) and consider deprecating it in favor of `getSystemOverviewPaginated`.

---

## [LOW] V8-6-09: ManagerViewCallsFacet.getPendingManagementFees Iterates Through Non-Existent Classes

**Location:** `ManagerViewCallsFacet.sol:271`
**Description:** The loop iterates `classNum = FIRST_USER_CLASS_ID` (2) through `<= fund.nextClassId`. Since `nextClassId` is the last created class, the loop bound is correct. However, the loop starts at `FIRST_USER_CLASS_ID = 2`, skipping the fee class (classNum=1). This is intentional for management fees, but there is a subtlety: if no user classes exist yet (nextClassId = 1 after only the fee class is created), the loop condition `2 <= 1` is false and the loop body never executes. This is correct behavior but worth noting -- it means the function returns 0 for a fund with only a fee class.

The check `if (classBaseInfo.createdAt == 0) continue` at line 276 provides defense in depth against iterating non-existent classes. This is a LOW finding because the behavior is correct but the pattern could be fragile if `nextClassId` semantics changed.

**Attack/Impact:** No direct impact. Informational/defensive.

**E-BC Reference:** E-BC04 (related -- class ID semantics)
**Recommendation:** No change needed. The `createdAt == 0` guard is correct defense in depth.

---

## [LOW] V8-6-10: ViewCalls2Facet._collectEligibleClassesForFund Includes Fee Class in Eligibility Check

**Location:** `ViewCalls2Facet.sol:75`
**Description:** The loop starts at `classNum = 1` (the fee class) rather than `FIRST_USER_CLASS_ID = 2`:

```solidity
for (uint16 classNum = 1; classNum <= fund.nextClassId; ++classNum) {
```

The fee class has a `requiredTags` containing `"BC"` (Base Class), so normal investors will fail the eligibility check and it won't appear in their results. However, if a manager account has the "BC" tag, the fee class would appear in their investable funds list.

**Attack/Impact:** Minimal. The fee class eligibility is gated by the "BC" tag. A manager with this tag seeing the fee class in their eligible classes list is informational noise, not a vulnerability. They cannot subscribe to it through the order system since it has no dealing schedule.

**E-BC Reference:** NEW
**Recommendation:** Start the loop at `FIRST_USER_CLASS_ID` for consistency with other iteration patterns:
```solidity
for (uint16 classNum = Constants.FIRST_USER_CLASS_ID; classNum <= fund.nextClassId; ++classNum) {
```

---

## [INFO] V8-6-11: Slither MED-U06 (Uninitialized denomPrice in ViewCalls2Facet._buildClassView) -- FALSE POSITIVE

**Location:** `ViewCalls2Facet.sol:233-286`
**Description:** Slither flagged the `cv` return variable in `_buildClassView` as potentially having uninitialized fields. Analysis shows this is a false positive. The function uses named return variable `cv` which is default-initialized to zero values, and then all fields are explicitly assigned throughout the function body. The `currentPriceInDenomination` field is assigned in the try/catch block at lines 277-281, covering both success and failure paths.

There is no code path where `cv` is returned with truly uninitialized critical fields. The `denomPrice` local variable mentioned in the Slither report does not exist in the current code -- it appears the code was refactored since the Slither run, and the try/catch pattern replaced a local variable approach.

**E-BC Reference:** N/A (Slither false positive)
**Recommendation:** No change needed. The Slither finding is stale.

---

## [INFO] V8-6-12: Slither MED-E01 through MED-E04 (Incorrect Equality Checks) -- ANALYSIS

**Location:** Multiple files
**Description:** Slither flagged `== 0` checks used for entity existence verification. In this codebase, the pattern `baseInfo.createdAt == 0` is the canonical way to check if a fund/class/dealing exists, as `createdAt` is set to `block.timestamp` during creation and `block.timestamp` is always > 0 after genesis. This is not an incorrect equality check -- it is intentional.

The checks in question:
- `AdminViewCallsFacet.sol:48`: `if (baseInfo.createdAt == 0) continue;`
- `ManagerViewCallsFacet.sol:34`: `if (baseInfo.createdAt == 0) return summary;`
- `ManagerViewCallsFacet.sol:73`: `if (baseInfo.createdAt == 0) continue;`
- `ManagerViewCallsFacet.sol:404`: `if (s.FundAdmin[0].baseInfo[classId].createdAt == 0) return performance;`

These are all correct existence checks using the established pattern.

**E-BC Reference:** N/A (Slither false positive pattern)
**Recommendation:** No change needed.

---

## [INFO] V8-6-13: Dual totalSupply Source Consistency in Views

**Location:** All view facets
**Description:** All view functions consistently use `s.FundAdmin[0].baseInfo[tokenId].totalSupply` (the FundAdmin copy) rather than `s.FundTokens[0].totalSupply[tokenId]` (the ERC1155 copy). This is internally consistent within the view layer. However, if these two values diverge (per E-BC25), the views would show a different totalSupply than what `FundTokensFacet.totalSupply(tokenId)` returns via the standard ERC1155 interface.

The `AdminViewCallsFacet.getSystemOverview` uses `baseInfo.totalSupply > 0` to determine if a fund is "active" (line 53). If the FundAdmin totalSupply is stale (not updated after a mint/burn in FundTokensFacet), a fund could be incorrectly classified as active or inactive.

**E-BC Reference:** E-BC25 (Dual totalSupply Divergence)
**Recommendation:** This is a cross-cutting concern that should be addressed at the storage level (unifying the two totalSupply trackers). View facets should read from a single authoritative source.

---

## Catalog Verification Table

| E-BC ID | Status | Evidence |
|---------|--------|----------|
| E-BC04 | **PRESENT** | `ManagerViewCallsFacet.sol:362` -- `_hasAnyDealingBalance` uses `d < nextDealingId`, missing the last dealing. See finding V8-6-01. |
| E-BC16 | **PARTIAL** | `AdminViewCallsFacet.sol:357-559` -- State-modifying functions have `onlyOwnerDiamond` or `_validateAndPropose`. Access control is present but the "View" naming is misleading. All view-only functions have no access control, which is correct for read-only operations on a private chain. No unprotected state-modifying functions found. |
| E-BC18 | **N/A** | Safety config is not directly read or displayed by these view facets. The safety config default-zero bypass would affect `NavManagementFacet` and `FXManagementFacet`, not the view layer. |
| E-BC25 | **PRESENT (informational)** | All view facets use `FundAdmin.baseInfo.totalSupply` consistently. The dual-source divergence risk exists but is not exacerbated by the view layer. See finding V8-6-13. |
| E-BC26 | **PRESENT** | `ViewCalls2Facet.sol:277-281` -- When FX rate is unavailable, `currentPriceInDenomination` silently falls back to the base price (wrong currency). See finding V8-6-04. |

---

## Summary Statistics

| Severity | Count |
|----------|-------|
| Critical | 0 |
| High | 0 |
| Medium | 4 |
| Low | 6 |
| Informational | 3 |
| **Total** | **13** |

**Key Themes:**
1. **Off-by-one errors** in dealing iteration (V8-6-01) -- known pattern E-BC04 recurring in view layer
2. **Data integrity mislabeling** -- `pendingOrderCount` actually returns total orders (V8-6-02)
3. **Silent FX fallback** -- wrong-currency prices without caller notification (V8-6-04)
4. **Missing events** on state-modifying functions in a "View" facet (V8-6-03)
5. **Underflow risks** in view calculations that should be resilient (V8-6-05, V8-6-06)
