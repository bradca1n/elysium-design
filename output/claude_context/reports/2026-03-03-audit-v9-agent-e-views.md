# V9 Audit Agent E: View & Eligibility Facets

**Date:** 2026-03-03
**Scope:** ViewCallsFacet, ViewCalls2Facet, AdminViewCallsFacet, ManagerViewCallsFacet, EligibilityFacet
**Auditor:** Claude Opus 4.6 (Agent E)

---

## Prior Finding Status

### V8-A1-M02: O(n*m) Eligibility Tag Matching (was MEDIUM, OPEN)

**Status: STILL PRESENT -- RE-ASSESSED as LOW**

**Location:** `src/facets/EligibilityFacet.sol` lines 129-143

**Evidence:**
```solidity
// Line 129-143
if (class.requiredTags.length > 0) {
    bool tagMatch = false;
    for (uint256 i = 0; i < class.requiredTags.length; i++) {       // O(n)
        for (uint256 j = 0; j < attrs.tags.length; j++) {            // O(m)
            if (class.requiredTags[i] == attrs.tags[j]) {
                tagMatch = true;
                break;
            }
        }
        if (tagMatch) break;
    }
```

The nested loop is still present. However, re-assessment:
- Both arrays are admin-controlled (`setClassEligibilityRequirements` requires ROLE_MANAGER, `setAccountAttributes` requires ROLE_ADMIN).
- The `requiredTags` array uses `bytes2[]` (2-byte tags), so practical tag counts are small (< 50).
- This is a `view` function -- DoS only affects the caller's gas, not state-changing transactions.
- The `isEligible` call is used inside `_collectEligibleClassesForFund` which already has a `MAX_ELIGIBLE_CLASSES = 10000` cap.

**Re-assessment: LOW.** The nested loop is bounded by admin-controlled array sizes and only runs in view context. No realistic DoS vector unless admins set unreasonable tag counts.

---

### V8-6-01: `_hasAnyDealingBalance` Off-By-One (was MEDIUM, OPEN)

**Status: STILL PRESENT -- CONFIRMED BUG**

**Location:** `src/facets/ManagerViewCallsFacet.sol` lines 358-362

**Evidence:**
```solidity
// Line 358: classNum uses < nextClassId -- CORRECT per E-BC04 semantics? NO.
for (uint16 classNum = Constants.FIRST_USER_CLASS_ID; classNum < nextClassId; ++classNum) {
    uint256 classId = TokenIdUtils.createClassTokenId(fundId, classNum);
    uint16 nextDealingId = s.FundAdmin[0].classes[classId].nextDealingId;

    // Line 362: d uses < nextDealingId -- MISSES THE LAST DEALING
    for (uint16 d = 1; d < nextDealingId; d++) {
```

Per E-BC04 in `claude_context/errors/blockchain.md`:
- `nextDealingId` starts at 0, gets pre-incremented in `createDealing()` (line 349 of FundManagementFacet: `nextDealingId++; dealingIdNum = nextDealingId;`).
- So `nextDealingId` == last created dealing ID.
- `d < nextDealingId` MISSES the last dealing.
- Correct pattern: `d <= nextDealingId`.

Similarly for classNum:
- `nextClassId` starts at 0, gets pre-incremented in class creation (line 294: `nextClassId++; classIdNum = nextClassId;`).
- So `nextClassId` == last created class ID.
- `classNum < nextClassId` MISSES the last class.
- Correct pattern: `classNum <= nextClassId` (which is what `getPendingManagementFees` at line 271 correctly uses).

**Impact:** `_hasAnyDealingBalance` misses the last class AND the last dealing per class. This means:
1. `getFundInvestorCount()` undercounts investors who only hold tokens in the latest dealing of any class.
2. `getFundSummary()` and `getFundSummaries()` report incorrect `investorCount`.
3. The bug compounds: if a fund has only one class (the common case), that class is missed entirely since `FIRST_USER_CLASS_ID = 2` and `classNum < 2` means the loop body never executes for a single-class fund.

**Wait -- re-checking:** `FIRST_USER_CLASS_ID = 2` and after creating one class, `nextClassId = 2`. So `classNum = 2; classNum < 2` is false -- the loop body never executes. This means **all single-class funds report 0 investors**.

**Severity: MEDIUM** (view function only, but produces materially wrong data for most funds).

**Recommendation:**
```solidity
for (uint16 classNum = Constants.FIRST_USER_CLASS_ID; classNum <= nextClassId; ++classNum) {
    // ...
    for (uint16 d = 1; d <= nextDealingId; d++) {
```

---

### V8-T04: Cash Token baseInfo.totalSupply Never Updated (was MEDIUM, OPEN)

**Status: STILL PRESENT**

**Location:** `src/facets/FundManagementFacet.sol` lines 685-689, 738-743

**Evidence:**
- `_onrampInternal` calls `FundTokensFacet.mint()` which updates `FundTokensStorage.totalSupply[cashId]` via ERC1155 `_update()`.
- `_offrampInternal` calls `FundTokensFacet.burn()` which updates `FundTokensStorage.totalSupply[cashId]`.
- Neither updates `s.FundAdmin[0].baseInfo[cashTokenId].totalSupply`.
- `_activateUmbrellaCurrencyInternal` (AdminViewCallsFacet:550) creates `baseInfo[cashTokenId]` with `totalSupply: 0`.

**Impact in View Facets:**
- `ViewCalls2Facet._buildFundView()` (line 213) returns `fundBaseInfo.totalSupply` for `FundView.totalSupply`. For cash fund tokens (fundNum=0), this is always 0 regardless of actual supply.
- `AdminViewCallsFacet.getSystemOverview()` (line 53) checks `baseInfo.totalSupply > 0` to determine active funds. Cash funds will never appear as active.

**Severity: MEDIUM** (data integrity issue -- view functions return stale/zero totalSupply for cash tokens).

This is a specific manifestation of E-BC25 (Dual totalSupply Divergence).

---

### V8-6-04: Silent FX Fallback in View Functions (was MEDIUM, OPEN)

**Status: STILL PRESENT**

**Location:** `src/facets/ViewCalls2Facet.sol` lines 275-279

**Evidence:**
```solidity
try NavManagementFacet(address(this)).calculateClassPriceInDenomination(classId, fundPrice) returns (uint256 p) {
    cv.currentPriceInDenomination = p;
} catch {
    cv.currentPriceInDenomination = cv.currentPrice;  // Falls back to WRONG currency
}
```

When `calculateClassPriceInDenomination` reverts (e.g., FX rate not set for denomination currency), the catch block sets `currentPriceInDenomination = currentPrice` (which is in the fund's reporting currency, NOT the class's denomination currency). The `denominationCurrencyCode` field (line 283) still shows the denomination currency code, creating a mismatch: the price says e.g., 100 but the currency code says EUR, when the price is actually 100 USD.

**Impact:** Frontend/API consumers display prices with incorrect currency labels. For classes denominated in a different currency than the fund's reporting currency, this produces misleading price data when FX rates are unavailable.

**Severity: LOW** (view-only, no state impact; the issue is a data quality problem that could mislead UI consumers).

---

## New Findings

### V9-E01: ViewCalls2Facet Eligible Classes Includes Fee Class (classNum=1)

**Severity:** LOW
**Category:** Logic Error
**Location:** `src/facets/ViewCalls2Facet.sol` line 75

**Description:**
The `_collectEligibleClassesForFund` loop starts at `classNum = 1`:
```solidity
for (uint16 classNum = 1; classNum <= fund.nextClassId; ++classNum) {
```
Class 1 is the fee class (`FIRST_USER_CLASS_ID = 2` per Constants.sol:70). The fee class is an internal accounting class -- investors should not see it as investable. If the fee class has no eligibility restrictions (which is typical since it's internal), any KYC-verified account will see the fee class as "eligible."

**Impact:** `getEligibleClasses()` and `getInvestableFunds()` may return the fee class to investors, who could then attempt to submit orders against it. This would likely fail at order validation, but the incorrect data pollutes the investable funds view.

**Recommendation:**
```solidity
for (uint16 classNum = Constants.FIRST_USER_CLASS_ID; classNum <= fund.nextClassId; ++classNum) {
```

**Status:** OPEN

---

### V9-E02: AdminViewCallsFacet State-Changing Functions Without Events

**Severity:** LOW
**Category:** Missing Events
**Location:** `src/facets/AdminViewCallsFacet.sol` lines 357-388, 421-424

**Description:**
Three state-changing functions do not emit events:
1. `registerCurrency()` (lines 357-374) -- registers a new currency but emits no event.
2. `deactivateCurrency()` (lines 380-388) -- deactivates a currency but emits no event.
3. `setFxUpdater()` (lines 421-424) -- changes FX updater role but emits no event.

Additionally, `executeDeactivateUmbrellaCurrency()` (lines 520-530) does not emit an event.

**Impact:** Off-chain systems (indexers, audit logs) cannot track currency registration/deactivation or FX updater role changes. This violates the project's own standard: "Emit events for ALL state changes" (from `solidity.md` rules).

**Recommendation:** Add events for each state change:
```solidity
event CurrencyRegistered(uint16 isoNumericCode, bytes3 alphaCode, uint8 decimals);
event CurrencyDeactivated(uint16 isoNumericCode);
event FxUpdaterSet(address fxUpdater, bool isUpdater);
event UmbrellaCurrencyDeactivated(uint16 umbrellaId, uint16 currencyCode);
```

**Status:** OPEN

---

### V9-E03: AdminViewCallsFacet Mixes View and State-Changing Functions

**Severity:** INFORMATIONAL
**Category:** Architecture
**Location:** `src/facets/AdminViewCallsFacet.sol`

**Description:**
`AdminViewCallsFacet` is named as a "view calls" facet but contains significant state-changing functions:
- `registerCurrency()` (onlyOwnerDiamond)
- `deactivateCurrency()` (onlyOwnerDiamond)
- `setFxUpdater()` (onlyOwnerDiamond)
- `activateUmbrellaCurrency()` / `deactivateUmbrellaCurrency()` (ROLE_ADMIN via `_validateAndPropose`)

This naming mismatch could lead developers to assume this facet is read-only, potentially missing access control reviews.

**Impact:** Code organization concern only. All state-changing functions have appropriate access control (`onlyOwnerDiamond` or `_validateAndPropose` with ROLE_ADMIN).

**Status:** OPEN

---

### V9-E04: ManagerViewCallsFacet `getPendingManagementFees` Uses `<=` But `_hasAnyDealingBalance` Uses `<` (Inconsistent Iteration)

**Severity:** MEDIUM (subsumed by V8-6-01 but distinct location)
**Category:** Logic Error
**Location:** `src/facets/ManagerViewCallsFacet.sol` lines 271 vs 358

**Description:**
Within the SAME facet, two functions iterate classes differently:
- `getPendingManagementFees` (line 271): `classNum <= fund.nextClassId` -- **CORRECT**
- `_hasAnyDealingBalance` (line 358): `classNum < nextClassId` -- **WRONG** (misses last class)

This inconsistency confirms the off-by-one is a bug, not an intentional design choice.

**Status:** OPEN (tracked under V8-6-01)

---

### V9-E05: Slither False Positives Confirmed

**Severity:** INFORMATIONAL
**Category:** Static Analysis
**Location:** Multiple

**Description:**
All Slither flags from the prompt have been manually verified:

1. **EligibilityFacet.isEligible:63 "ignores isAccountEligible return"** -- FALSE POSITIVE. Line 63 is `return this.isAccountEligible(account, classId);` which directly returns the tuple.

2. **ViewCalls2Facet._collectEligibleClassesForFund:77 "ignores isEligible return"** -- FALSE POSITIVE. Line 77 is `(bool eligible,) = EligibilityFacet(address(this)).isEligible(account, classId);` which captures the `eligible` bool and intentionally discards the `reason` string.

3. **Uninitialized locals in ViewCallsFacet** (classValue, classAvailableValue, classUnlockedValue, totalCount, idx) -- FALSE POSITIVE. Solidity initializes all locals to zero; these are used as accumulators.

**Status:** CLOSED (false positives)

---

### V9-E06: getSystemOverview Unbounded Account Loop

**Severity:** LOW
**Category:** Gas / DoS
**Location:** `src/facets/AdminViewCallsFacet.sol` lines 69-73

**Description:**
`getSystemOverview()` iterates ALL accounts in `allAccounts` (line 69) to count admins and NAV updaters. The `allAccounts` array is append-only and grows indefinitely. However, `getSystemOverviewPaginated()` (lines 93-145) provides a paginated alternative.

**Impact:** Low -- `getSystemOverview()` may revert with out-of-gas for very large account sets. The paginated version exists as a mitigation. This is acceptable for a private chain with known gas limits.

**Status:** OPEN (mitigated by paginated variant)

---

### V9-E07: ViewCallsFacet `_calculateAvailableBalance` Potential Underflow

**Severity:** LOW
**Category:** Logic Error
**Location:** `src/facets/ViewCallsFacet.sol` lines 1346-1348

**Description:**
```solidity
uint256 balance = s.FundTokens[0].balances[dealingId][account];
uint256 locked = s.FundTokens[0].lockedBalances[account][dealingId];
return balance - locked;
```

If `locked > balance` (which should not happen under normal operations but could occur due to E-BC25 dual-supply divergence), this subtraction would underflow and revert (Solidity 0.8.x). This would cause the entire `getPortfolio()` call to revert.

**Impact:** If a state inconsistency causes `locked > balance`, the portfolio view becomes completely unavailable for that account. The FundTokensFacet's `availableBalance()` function likely has the same pattern but would need separate verification.

**Recommendation:** Use `balance > locked ? balance - locked : 0` to prevent revert on state inconsistency.

**Status:** OPEN

---

## Summary Table

| ID | Severity | Status | Description |
|---|---|---|---|
| V8-A1-M02 | LOW (downgraded) | STILL PRESENT | O(n*m) eligibility tag matching -- bounded by admin, view-only |
| V8-6-01 | MEDIUM | STILL PRESENT | `_hasAnyDealingBalance` uses `<` instead of `<=` for both class and dealing loops |
| V8-T04 | MEDIUM | STILL PRESENT | Cash token baseInfo.totalSupply never updated during onramp/offramp |
| V8-6-04 | LOW (downgraded) | STILL PRESENT | Silent FX fallback to base price in view functions |
| V9-E01 | LOW | NEW | Eligible classes includes fee class (classNum=1) |
| V9-E02 | LOW | NEW | State-changing functions missing events (registerCurrency, etc.) |
| V9-E03 | INFO | NEW | AdminViewCallsFacet mixes view and state-changing functions |
| V9-E04 | MEDIUM | NEW (related to V8-6-01) | Inconsistent class iteration `<=` vs `<` in same facet |
| V9-E05 | INFO | CLOSED | Slither false positives confirmed |
| V9-E06 | LOW | NEW | Unbounded account loop in getSystemOverview (mitigated by paginated variant) |
| V9-E07 | LOW | NEW | Potential underflow in _calculateAvailableBalance |

**Severity Breakdown:** 0 CRITICAL, 0 HIGH, 3 MEDIUM (2 prior + 1 new), 5 LOW, 2 INFORMATIONAL
