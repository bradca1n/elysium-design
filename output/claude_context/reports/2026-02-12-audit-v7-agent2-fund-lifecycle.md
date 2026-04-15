# Audit V7 — Agent 2: Fund Management & Lifecycle

**Date:** 2026-02-12
**Auditor:** Agent 2 (Claude Opus 4.6)
**Scope:** FundManagementFacet, FundManagementValidationFacet, FundLifecycleFacet, FundAdminStructs, Constants
**Branch:** multiCurrency

---

## Prior Finding Verification

### C-05: `createFund()` has no access control
**Status: FIXED**
**Evidence:** `createFund()` (line 35) calls `_createFundProposal()` which calls `_validateAndPropose()` with `ROLE_ADMIN`. The `executeCreateFund()` (line 71) is protected by `onlyInternalExecution`. Both paths validated.

### C-06: uint16 counter overflow DoS
**Status: FIXED**
**Evidence:** All four uint16 counters protected:
- `nextFundNumPerUmbrella`: FundManagementFacet.sol:100 — `if (fundNum >= type(uint16).max) revert CounterOverflow()`
- `nextClassId`: FundManagementFacet.sol:284 — same check
- `nextDealingId`: FundManagementFacet.sol:333 — same check
- `nextUmbrellaId`: FundManagementFacet.sol:515 — same check

### H-03: Umbrella status not checked in fund creation
**Status: FIXED**
**Evidence:** `FundManagementValidationFacet.validateFundCreation()` (line 26) checks `umbrellaFunds[umbrellaId].status != EntityStatus.ACTIVE` and reverts with `UmbrellaNotActive()`.

### H-13: Notice/lock periods no upper bounds
**Status: FIXED**
**Evidence:** `_createShareClassInternalWithCurrency()` (lines 257-264) reads `ProtocolSafetyConfig` for `maxNoticePeriod` and `maxLockPeriod`, reverting if exceeded when config > 0.

### H-14: Hurdle fund reference not validated
**Status: FIXED**
**Evidence:** `_setHurdleFundInternal()` (lines 940-944) validates hurdle fund exists via `baseInfo[hurdleFundId].createdAt == 0` check when `hurdleFundNum != 0`.

### V5-H04: No class existence check in createDealing
**Status: FIXED**
**Evidence:** `createDealing()` (line 331) checks `baseInfo[classId].createdAt == 0` and reverts `ClassNotFound()`.

### V5-H05: No fund status check for share class creation
**Status: FIXED**
**Evidence:** `_createShareClassInternalWithCurrency()` (line 267) checks `funds[fundId].status != EntityStatus.ACTIVE` and reverts `FundNotActive()`.

### V6-C-05: Dealing schedule accepts arbitrary unvalidated timestamps
**Status: STILL PRESENT**
**Evidence:** `executeSetDealingSchedule()` (lines 834-843) stores timestamps directly to storage with zero validation:
```solidity
s.FundAdmin[0].funds[fundId].nextDealingTimestamps = timestamps;
```
No checks for: past timestamps, sort order, zero values, duplicates, or array length bounds. The `setDealingSchedule()` proposal function (lines 813-826) also performs no validation — it just encodes and proposes.

### T-20: FundManagementFacet near EIP-170 limit
**Status: FIXED**
**Evidence:** Validation functions extracted to `FundManagementValidationFacet.sol` (113 lines). Six `validate*` functions moved out.

---

## New Findings

### V7-A2-01: Dealing Schedule Timestamps Completely Unvalidated (V6-C-05 Persists)

**Severity:** CRITICAL
**Category:** Logic Error / Input Validation
**Location:** `src/facets/FundManagementFacet.sol` lines 834-843

**Description:**
`executeSetDealingSchedule()` stores the caller-supplied `uint32[] timestamps` array directly to storage without any validation. The timestamps are used by `dealingProcessState()` in `NavManagementFacet` (line 587-588) to drive the dealing state machine: `schedule[schedule.length - 1]` is compared to `block.timestamp` and `navUpdatedAt`. Past timestamps cause the fund to enter AWAITS_NAV_UPDATE or PROCESSING state immediately, which may be unrecoverable if no NAV update was prepared. Zero timestamps will always resolve as past. Unsorted arrays cause the pop-from-end consumption pattern to process timestamps in wrong order.

**Impact:**
A malicious or negligent manager can permanently freeze the dealing state machine for a fund by submitting past or zero timestamps. The fund enters AWAITS_NAV_UPDATE or PROCESSING state without a valid dealing cycle, potentially locking pending orders forever. Additionally, an unbounded array can cause gas exhaustion during view functions that read `nextDealingTimestamps`.

**Recommendation:**
Add timestamp validation in `executeSetDealingSchedule`:
```solidity
if (timestamps.length > MAX_DEALING_SCHEDULE_LENGTH) revert ScheduleTooLong();
for (uint i = 0; i < timestamps.length; i++) {
    if (timestamps[i] == 0) revert ZeroTimestamp();
    if (timestamps[i] <= uint32(block.timestamp)) revert TimestampInPast();
    if (i > 0 && timestamps[i] >= timestamps[i-1]) revert TimestampsNotDescending();
}
```

**Status:** OPEN
**Resolution:** V6-C-05 persists. No remediation applied.

---

### V7-A2-02: ProtocolSafetyConfig Zero-Defaults Silently Disable All Safety Checks

**Severity:** HIGH
**Category:** Logic Error / Configuration
**Location:** `src/facets/FundManagementFacet.sol` lines 257-263, `src/facets/NavManagementFacet.sol` lines 50, 276, `src/facets/FundManagementValidationFacet.sol` line 43

**Description:**
All `ProtocolSafetyConfig` fields default to zero, and zero means "no limit" / "check disabled" everywhere they are used:
- `maxNoticePeriod == 0` → notice period check skipped (FundManagementFacet:258)
- `maxLockPeriod == 0` → lock period check skipped (FundManagementFacet:261)
- `maxMgmtFeeRateBps == 0` → management fee rate check skipped (FundManagementValidationFacet:43)
- `maxNavChangeBps == 0` → NAV change check skipped (NavManagementFacet:50)
- `maxAdjustmentBps == 0` → adjustment check skipped (NavManagementFacet:276)

A newly created fund has ALL safety checks disabled by default. An admin must explicitly call `setProtocolSafetyConfig()` to enable any protection. There is no warning, no event, and no forced initialization.

**Impact:**
Funds operate without any safety guardrails until an admin explicitly configures them. A manager can set arbitrarily high fee rates (up to BPS_DENOMINATOR = 10000 = 100%), infinite lock periods, and extreme NAV changes without triggering any safety check. This is especially dangerous because `setProtocolSafetyConfig` requires `ROLE_ADMIN` but fund creation only requires `ROLE_ADMIN` for proposal — the safety config is never auto-populated.

**Recommendation:**
Either: (1) Require `setProtocolSafetyConfig()` as part of fund creation, or (2) Use non-zero defaults in `_createFundInternal`, or (3) Treat zero as "use protocol-wide maximums" rather than "disabled", or (4) Emit a warning event `UnsafeConfigurationWarning(fundId)` when safety config is all-zero.

**Status:** OPEN

---

### V7-A2-03: Missing Umbrella Status Lifecycle Management Functions

**Severity:** MEDIUM
**Category:** Logic Error / Incomplete Implementation
**Location:** `src/shared/FundAdminStructs.sol` line 279, `src/facets/FundLifecycleFacet.sol` (missing)

**Description:**
`UmbrellaFund` has a `status` field of type `EntityStatus` (ACTIVE/RETIRED/CLOSED), and this status is checked in `validateFundCreation()`, `validateOnramp()`, and `validateOfframp()`. However, there are NO functions to transition an umbrella's status. The status is initialized to ACTIVE in `_createUmbrellaFundInternal()` (line 525) and can never be changed — there is no `retireUmbrella()`, `closeUmbrella()`, or `reactivateUmbrella()` function anywhere in the codebase. This means the umbrella status checks are dead code in the sense that the status can never become RETIRED or CLOSED through normal operations.

**Impact:**
An umbrella fund can never be retired or closed, meaning the protections that depend on umbrella status (blocking new fund creation in retired/closed umbrellas, blocking onramp in non-ACTIVE umbrellas) can never activate. Direct storage manipulation by the diamond owner would be the only way to change umbrella status.

**Recommendation:**
Add umbrella lifecycle management functions in `FundLifecycleFacet`:
```solidity
function retireUmbrella(address accountAddress, uint16 umbrellaId) external returns (TransactionResult memory);
function closeUmbrella(address accountAddress, uint16 umbrellaId) external returns (TransactionResult memory);
function reactivateUmbrella(address accountAddress, uint16 umbrellaId, EntityStatus targetStatus) external returns (TransactionResult memory);
```

**Status:** OPEN

---

### V7-A2-04: Dealing Token Conversion Does Not Validate Fund Status

**Severity:** MEDIUM
**Category:** Logic Error / Access Control
**Location:** `src/facets/FundManagementFacet.sol` lines 737-802

**Description:**
`batchConvertDealingTokens()` validates that both dealing IDs belong to the same class, that both dealings are unlocked, and that performance fee timestamps match. However, it does NOT check the fund's lifecycle status. A conversion can proceed even if the fund is CLOSED, which should prohibit all operations. The validation is in `FundManagementValidationFacet.validateDealingConversion()` (lines 48-69) and only checks token type, class matching, lock status, and NAV timestamp alignment.

**Impact:**
Dealing token conversions can occur on CLOSED funds, violating the lifecycle invariant that CLOSED funds have no active operations. While the impact is limited (conversion is value-neutral), it represents a bypass of the lifecycle state machine.

**Recommendation:**
Add fund status check in `validateDealingConversion()`:
```solidity
uint256 fundId = TokenIdUtils.toFundTokenId(fromDealingId);
if (s.FundAdmin[0].funds[fundId].status == FundAdminStructs.EntityStatus.CLOSED) {
    revert ISharedErrors.FundClosed();
}
```

**Status:** OPEN

---

### V7-A2-05: Forced Redemption Does Not Check Fund Lifecycle for Submission

**Severity:** LOW
**Category:** Logic Error (Intentional Design)
**Location:** `src/facets/FundLifecycleFacet.sol` lines 128-136

**Description:**
`validateForceRedemption()` only checks that the investor has a non-zero balance. It intentionally allows force redemptions on CLOSED funds (documented in the NatSpec at line 133: "Force redemption allowed on CLOSED funds (needed to clear remaining holdings)"). However, forced redemptions on CLOSED funds with zero totalSupply are contradictory — if a fund is CLOSED, `validateFundStatusTransition()` already verified `totalSupply == 0` during closure. So any force redemption on a CLOSED fund would only apply to funds where tokens were minted AFTER closure (e.g., via reactivation then re-closure without proper cleanup), which is a narrow edge case.

This is documented and appears intentional per E-BC15 (forced/admin operations bypass safety checks). Flagging as LOW for awareness.

**Impact:**
Forced redemptions bypass lifecycle status checks by design. The lack of a status check is explicitly documented and serves the operational purpose of clearing holdings during fund wind-down.

**Recommendation:**
No change needed for current design, but consider adding an event `ForceRedemptionOnClosedFund(fundId, investorAccount)` for audit trail when force redemption is executed on a CLOSED fund.

**Status:** OPEN (ACKNOWLEDGED BY DESIGN)

---

### V7-A2-06: Fund Closure Does Not Check Class-Level Supply

**Severity:** MEDIUM
**Category:** Logic Error
**Location:** `src/facets/FundLifecycleFacet.sol` lines 39-47

**Description:**
`validateFundStatusTransition()` for CLOSED target only checks fund-level `baseInfo[fundId].totalSupply` (line 43-44). It does NOT iterate through classes to verify their totalSupply is also zero. Since fund totalSupply and class totalSupply are tracked independently (per E-BC19/E-BC25, the dual totalSupply tracking issue), it is possible for the fund-level totalSupply to be 0 while individual classes still have non-zero totalSupply due to rounding divergence or bugs in the dual tracking system.

**Impact:**
A fund could be closed while classes still have outstanding tokens. This would strand investor holdings in a CLOSED fund, making redemption impossible through normal channels (only force redemption would work). The risk is amplified by the known V6-C-01 dual totalSupply divergence finding.

**Recommendation:**
Either: (1) Iterate through all classes and verify each has zero totalSupply before allowing fund closure, or (2) Use a single source of truth for totalSupply that aggregates across classes, or (3) Add an assertion that `sum(class_totalSupply) == 0` during fund closure validation.

```solidity
for (uint16 i = 1; i <= fund.nextClassId; i++) {
    uint256 classId = TokenIdUtils.createClassTokenId(fundId, i);
    if (s.FundAdmin[0].baseInfo[classId].totalSupply > 0) {
        revert FundHasClassWithSupply(fundId, classId);
    }
}
```

**Status:** OPEN

---

### V7-A2-07: `createFundWithCurrency` Missing `override` and Interface Declaration

**Severity:** LOW
**Category:** Code Quality
**Location:** `src/facets/FundManagementFacet.sol` line 39-45

**Description:**
`createFundWithCurrency()` is declared `public` but does NOT implement any interface function (no `override` keyword) unlike `createFund()` which has `override`. Similarly, `createShareClassWithCurrency()` at line 167 lacks `override`. Both functions are exposed through the Diamond proxy and are fully functional, but the lack of interface declaration means they are not part of `IFundManagement`. They are instead only in the generated `IDiamondProxy.sol`.

**Impact:**
Minor code quality issue. Off-chain clients relying on `IFundManagement` would not see these functions. No security impact.

**Recommendation:**
Add these functions to `IFundManagement` interface and add `override` keyword.

**Status:** OPEN

---

### V7-A2-08: No Fund Name Length or Character Validation

**Severity:** LOW
**Category:** Input Validation
**Location:** `src/facets/FundManagementValidationFacet.sol` lines 20, 24, 41

**Description:**
Fund name validation only checks `bytes(name).length == 0` (empty name). There is no maximum length check or character validation. Extremely long names (e.g., 10,000+ bytes) increase gas costs for storage and events, and non-printable characters could cause display issues.

**Impact:**
A malicious admin could create funds/umbrellas with extremely long names, increasing storage costs. This is a minor issue on a private blockchain but could affect off-chain systems parsing events.

**Recommendation:**
Add maximum name length check:
```solidity
if (bytes(name).length == 0) revert FundNameEmpty();
if (bytes(name).length > 256) revert FundNameTooLong();
```

**Status:** OPEN

---

### V7-A2-09: Dealing Token Conversion Unbounded Holders Array

**Severity:** MEDIUM
**Category:** Denial of Service
**Location:** `src/facets/FundManagementFacet.sol` lines 791-803

**Description:**
`_batchConvertDealingTokensInternal()` iterates over the `holders` array without any length bound. For each holder, it calls `availableBalance()`, `burn()`, and `mint()` — three external delegatecalls per iteration. A very large holders array could exceed block gas limits.

**Impact:**
On a private blockchain with higher gas limits this is lower risk, but a sufficiently large holders array could still cause the transaction to fail. This would force the admin to split the conversion into multiple smaller batches manually.

**Recommendation:**
Add a maximum batch size constant:
```solidity
if (holders.length > MAX_BATCH_SIZE) revert BatchTooLarge();
```

**Status:** OPEN

---

### V7-A2-10: Reactivation From CLOSED to ACTIVE Allows Bypassing Closure Requirements

**Severity:** HIGH
**Category:** Logic Error / State Machine
**Location:** `src/facets/FundLifecycleFacet.sol` lines 257-277, 296-308

**Description:**
`reactivateFund()` allows transitioning from CLOSED to ACTIVE with only ROLE_ADMIN authorization (line 265-266). The validation in `validateFundStatusTransition()` for ACTIVE target (lines 48-52) only checks that the fund is not already ACTIVE — it does NOT re-verify any preconditions. This means:

1. A fund is closed (which required totalSupply == 0)
2. Admin reactivates it to ACTIVE
3. Fund is now ACTIVE with totalSupply = 0, but no checks on whether the fund infrastructure is intact (dealing schedule, NAV, classes)
4. The fund was previously CLOSED for a reason — reactivation should require explicit re-initialization

The same pattern applies to class reactivation (lines 417-437, 456-468).

The required role escalation (CLOSED->ACTIVE requires ADMIN, RETIRED->ACTIVE requires MANAGER) is correctly implemented. However, the lack of any re-initialization or additional validation during reactivation from CLOSED is a concern.

**Impact:**
An admin can reactivate a previously closed fund without ensuring it is in a valid operational state. The fund may have stale NAV data, no dealing schedule, and classes in inconsistent states. While ROLE_ADMIN access control limits the blast radius, the operation lacks defensive checks.

**Recommendation:**
Add additional validation during CLOSED to ACTIVE reactivation:
```solidity
if (oldStatus == FundAdminStructs.EntityStatus.CLOSED) {
    // Verify fund is in a valid state for reactivation
    require(fund.navUpdatedAt > 0 || fund.nav == 0, "Stale NAV");
    // Optionally: require all classes are also CLOSED or ACTIVE
}
```
Alternatively, emit a distinct event `FundReactivatedFromClosed(fundId)` to enable off-chain monitoring.

**Status:** OPEN

---

### V7-A2-11: Missing Event for ProtocolSafetyConfig Notice/Lock Period Fields

**Severity:** INFORMATIONAL
**Category:** Auditing / Events
**Location:** `src/facets/NavManagementFacet.sol` line 209

**Description:**
The `ProtocolSafetyConfigUpdated` event (emitted at NavManagementFacet:209) includes `maxNavChangeBps`, `maxTimestampDeviation`, `maxMgmtFeeRateBps`, `maxAdjustmentBps` but does NOT include `maxNoticePeriod` or `maxLockPeriod`, even though those fields are stored (lines 203-204). The event definition in `INavManagement.sol:18` confirms only 4 parameters.

**Impact:**
Off-chain systems cannot track changes to notice/lock period limits via events. They would need to call `getProtocolSafetyConfig()` to get the full config.

**Recommendation:**
Update the event to include all 6 fields:
```solidity
event ProtocolSafetyConfigUpdated(uint256 indexed fundId, uint16 maxNavChangeBps, uint32 maxTimestampDeviation, uint16 maxMgmtFeeRateBps, uint16 maxAdjustmentBps, uint32 maxNoticePeriod, uint32 maxLockPeriod);
```

**Status:** OPEN

---

### V7-A2-12: Dealing Conversion Validation Only Checks Class ID, Not Full Fund Token ID

**Severity:** LOW
**Category:** Logic Error / Fund Isolation
**Location:** `src/facets/FundManagementValidationFacet.sol` line 55

**Description:**
`validateDealingConversion()` checks `TokenIdUtils.getClassId(fromDealingId) != TokenIdUtils.getClassId(toDealingId)` which only compares the 16-bit class field. However, `getClassId()` extracts only bits 16-31, so two dealing tokens from different funds (or even different umbrellas) that happen to have the same class number would pass this check. The full class token ID comparison should use `TokenIdUtils.toClassTokenId()` which preserves umbrella + fund + class bits.

**Impact:**
In theory, a dealing from umbrella 1, fund 1, class 2 could be converted with a dealing from umbrella 2, fund 3, class 2, because both have `classId == 2`. This would break fund isolation. However, the dealing IDs also encode the full umbrella+fund+class, so the price calculations and totalSupply changes would operate on the correct distinct tokens. The actual damage is limited because `burn()` and `mint()` use the full dealing token IDs, but the validation is logically wrong.

**Recommendation:**
Replace:
```solidity
if (TokenIdUtils.getClassId(fromDealingId) != TokenIdUtils.getClassId(toDealingId))
```
With:
```solidity
if (TokenIdUtils.toClassTokenId(fromDealingId) != TokenIdUtils.toClassTokenId(toDealingId))
```

**Status:** OPEN

---

### V7-A2-13: Cash Token baseInfo Overwritten Without Checking Existing Supply

**Severity:** MEDIUM
**Category:** Logic Error
**Location:** `src/facets/FundManagementFacet.sol` lines 539-544, `src/facets/AdminViewCallsFacet.sol` lines 550-555

**Description:**
When activating a currency for an umbrella (both in `_createUmbrellaFundInternal` and `_activateUmbrellaCurrencyInternal`), the `baseInfo[cashTokenId]` is unconditionally set with `totalSupply: 0`. If a cash token was previously created, deactivated, and re-activated, this would reset its baseInfo including name and creation timestamp. The `AdminViewCallsFacet._activateUmbrellaCurrencyInternal()` at line 540 does check `umbrellaCurrencyActive` to prevent double-activation, so this path is only reachable if the currency was deactivated and then reactivated — but `deactivateUmbrellaCurrency` only sets `umbrellaCurrencyActive[umbrellaId][currencyCode] = false` without clearing the baseInfo or the push to `umbrellaCurrencies` array.

After deactivation and reactivation: (1) `umbrellaCurrencies[umbrellaId]` would have duplicate entries, (2) `baseInfo` would be reset (totalSupply→0 even if tokens exist in circulation via the ERC1155 system).

**Impact:**
A deactivate-then-reactivate sequence would corrupt the cash token's baseInfo.totalSupply, creating a divergence between actual token supply (tracked in FundTokensStorage) and the administrative tracking (baseInfo). It would also create duplicate entries in the `umbrellaCurrencies` array.

**Recommendation:**
Check if the cash token baseInfo already exists before overwriting:
```solidity
if (s.FundAdmin[0].baseInfo[cashTokenId].createdAt == 0) {
    s.FundAdmin[0].baseInfo[cashTokenId] = FundAdminStructs.BaseInfo({...});
}
```
Also check for duplicates in `umbrellaCurrencies` before pushing.

**Status:** OPEN

---

## Summary

| ID | Severity | Description |
|---|---|---|
| V7-A2-01 | CRITICAL | Dealing schedule timestamps completely unvalidated (V6-C-05 persists) |
| V7-A2-02 | HIGH | ProtocolSafetyConfig zero-defaults silently disable all safety checks |
| V7-A2-10 | HIGH | Reactivation from CLOSED allows bypassing closure requirements |
| V7-A2-03 | MEDIUM | Missing umbrella status lifecycle management functions |
| V7-A2-04 | MEDIUM | Dealing token conversion does not validate fund status |
| V7-A2-06 | MEDIUM | Fund closure does not check class-level supply |
| V7-A2-09 | MEDIUM | Dealing token conversion unbounded holders array |
| V7-A2-13 | MEDIUM | Cash token baseInfo overwritten on currency reactivation |
| V7-A2-05 | LOW | Forced redemption bypasses lifecycle checks (by design) |
| V7-A2-07 | LOW | createFundWithCurrency missing override and interface |
| V7-A2-08 | LOW | No fund name length or character validation |
| V7-A2-12 | LOW | Dealing conversion validates classId field only, not full class token ID |
| V7-A2-11 | INFO | Missing event fields for ProtocolSafetyConfig notice/lock periods |

**Prior Findings (9 verified):**
- C-05: FIXED
- C-06: FIXED
- H-03: FIXED
- H-13: FIXED
- H-14: FIXED
- V5-H04: FIXED
- V5-H05: FIXED
- V6-C-05: STILL PRESENT (now V7-A2-01)
- T-20: FIXED

**Totals: 1 CRITICAL, 2 HIGH, 4 MEDIUM, 4 LOW, 1 INFORMATIONAL = 12 new findings**
