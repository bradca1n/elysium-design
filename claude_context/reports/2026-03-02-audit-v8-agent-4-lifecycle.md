# Audit V8 Agent 4: ClassAdjustmentFacet + EligibilityFacet + FundLifecycleFacet

**Date:** 2026-03-02
**Auditor:** Claude Opus 4.6 (Agent 4 — Lifecycle & Adjustments)
**Scope:** ClassAdjustmentFacet.sol, EligibilityFacet.sol, FundLifecycleFacet.sol
**Commit:** errorCorrectionEngine branch

---

## Findings

### V8A4-H01: Bulk Cancel Ignores executeCancelOrder Return Value and Revert

**Severity:** HIGH
**Location:** `/Users/timoneumann/Elysium/Elysium/contracts/src/facets/FundLifecycleFacet.sol:638`
**Description:** In `_cancelPendingSubscribesInternal`, the call to `OrderManagementFacet(address(this)).executeCancelOrder(order.investor, functionData)` is made via an external call on the diamond proxy. This call goes through the Diamond's fallback, which dispatches via delegatecall. If `executeCancelOrder` reverts (e.g., because `validateOrderCancellation` fails due to `DealingInProgress` state or the investor check), the entire `_cancelPendingSubscribesInternal` transaction reverts, not just that single order. The function pre-filters for PENDING+SUBSCRIBE orders, but does NOT check for `isForcedRedemption` (always false for subscribes, so safe) or `DealingInProgress` state. If the fund is in PROCESSING dealing state when bulk cancel is attempted, ALL cancellations in the batch revert atomically.

More critically, the `cancelledCount` is incremented BEFORE confirming the external call succeeded. If `executeCancelOrder` were to silently fail (it currently reverts, so this is mitigated), the count would be wrong.

**Impact:** Bulk cancel operation can be blocked entirely if the dealing process state is PROCESSING. This creates a window where a RETIRED/CLOSED fund cannot have its pending subscribes cancelled. The manager must wait until processing completes. In an emergency wind-down scenario, this could delay fund closure.
**Recommendation:** Either (1) skip orders where the fund is in PROCESSING state with a continue, or (2) add a force-cancel path that bypasses the DealingInProgress check for admin bulk operations. At minimum, document that bulk cancel must be called outside of a dealing processing window.
**Status:** OPEN

---

### V8A4-H02: Fee Amount Overflow in Audit Trail Conversion (_feeToEntry)

**Severity:** HIGH
**Location:** `/Users/timoneumann/Elysium/Elysium/contracts/src/facets/ClassAdjustmentFacet.sol:417`
**Description:** The `_feeToEntry` function converts `FeeMint.amount` (a `uint128`) to `int128` via the cast chain `int128(int256(uint256(fee.amount)))`. Solidity 0.8 does NOT protect against explicit type conversion overflows. If `fee.amount > type(int128).max` (i.e., > 2^127 - 1 = ~170 undecillion), the result silently wraps to a negative number. While fee amounts this large are unlikely in practice (at PRECISION=1e18, this is ~170 billion fund tokens), the cast is technically unsafe and violates the principle of safe arithmetic.

The `label` field is also hardcoded to `AdjustmentLabel.HEDGE` (value 0), which is misleading for a management fee entry. This is a minor data correctness issue within the same function.

**Impact:** If fee amounts ever exceed int128 max, the audit trail would show incorrect (negative) amounts, corrupting compliance records. The HEDGE label for management fees makes the audit trail ambiguous for off-chain consumers.
**Recommendation:** Use `SafeCast.toInt128(int256(uint256(fee.amount)))` from OpenZeppelin (already imported in other facets). For the label, consider adding a dedicated `MANAGEMENT_FEE` value to `AdjustmentLabel` or using a sentinel value, though this is lower priority since `entryType` already distinguishes the source.
**Status:** OPEN

---

### V8A4-M01: maxAdjustmentBps Not Enforced at Posting Time

**Severity:** MEDIUM
**Location:** `/Users/timoneumann/Elysium/Elysium/contracts/src/facets/ClassAdjustmentFacet.sol:30-57` (validateClassAdjustment)
**Description:** The `validateClassAdjustment` function checks: (1) amount != 0, (2) class belongs to fund, (3) class exists, (4) class not CLOSED, (5) queue size < MAX_PENDING_ADJUSTMENTS, (6) direction validation. However, it does NOT check `ProtocolSafetyConfig.maxAdjustmentBps`. This cap is only enforced in `NavManagementFacet._processClassAdjustments` at NAV update time (line 337-344), and it checks the **aggregate net** per class, not individual adjustments.

This means: (a) A manager can post multiple small adjustments that individually pass but aggregate to exceed the cap — and this IS caught at NAV update. (b) A manager can post a single large adjustment that clearly exceeds the cap — and this is only caught at NAV update, not at posting time. The adjustment sits in the queue, wastes a slot, and only reverts the entire NAV update.

**Impact:** A rogue or confused manager can fill the pending queue with adjustments that will guaranteed-revert at NAV update time, creating a denial-of-service on NAV processing. The admin would need to manually cancel each invalid adjustment before NAV can proceed. With MAX_PENDING_ADJUSTMENTS=100, this means up to 100 cancel transactions.
**Recommendation:** Add an early bounds check in `validateClassAdjustment` that rejects individual adjustments exceeding `maxAdjustmentBps` (if configured). This provides fast-fail feedback instead of deferred revert.
**Status:** OPEN

---

### V8A4-M02: Eligibility Not Re-Checked After Attributes Change (TOCTOU)

**Severity:** MEDIUM
**Location:** `/Users/timoneumann/Elysium/Elysium/contracts/src/facets/EligibilityFacet.sol:275-289` (setAccountAttributes)
**Description:** When an admin updates investor attributes (e.g., revoking KYC via `setAccountAttributes`), existing pending orders for that investor are not cancelled or flagged. Eligibility is checked at order submission (OrderValidationFacet line 123) and at order processing (OrderManagementFacet line 313). However, there is a TOCTOU (time-of-check-time-of-use) gap: an investor submits an order while eligible, admin revokes KYC, and the order is processed — at which point the re-check at processing time DOES catch it. So this is mitigated by the processing-time check.

However, the same is NOT true for class eligibility requirement changes. If a manager calls `setClassEligibilityRequirements` to add new restrictions (e.g., requiring accredited investor), existing pending orders from non-accredited investors will only fail at processing time, not at submission time.

**Impact:** Orders that should be rejected can remain pending until the next dealing cycle. This creates confusion but not financial loss, since the processing-time check catches it. However, it wastes gas during processing when the order inevitably fails or gets skipped.
**Recommendation:** This is a known design trade-off documented in the code. Consider emitting a warning event when eligibility requirements change while pending orders exist for affected classes, so off-chain systems can proactively cancel stale orders.
**Status:** OPEN (by design, but documentation gap)

---

### V8A4-M03: Fund Existence Not Validated in ClassAdjustmentFacet

**Severity:** MEDIUM
**Location:** `/Users/timoneumann/Elysium/Elysium/contracts/src/facets/ClassAdjustmentFacet.sol:30-57`
**Description:** `validateClassAdjustment` checks that the class exists and belongs to the fund (via `TokenIdUtils.toFundTokenId(classId) != fundId`), but never calls `_requireFundExists(fundId)`. Since the class existence check (`_requireClassExists(classId)`) and the class-to-fund derivation (`toFundTokenId`) are structural (based on token ID encoding), a valid classId implicitly proves the fund exists. However, there is no explicit fund existence check.

Similarly, `FundLifecycleFacet.validateFundStatusTransition` reads `fund.status` without first verifying the fund exists. For an uninitialized fund, `status` defaults to `ACTIVE` (enum value 0), so `retireFund` could be called on a non-existent fund and would succeed in setting status to RETIRED on a non-existent struct. The `_validateAndPropose` call with `ROLE_MANAGER` would then check `funds[scope].manager`, which is `address(0)` for non-existent funds, so the manager check would fail. This mitigates the issue for normal flows.

For `closeFund`, `totalSupply` would be 0 for a non-existent fund, passing the check. But again, `_validateAndPropose` with `ROLE_MANAGER` blocks it since `manager == address(0)`.

**Impact:** Low practical impact due to the manager check in `_validateAndPropose`, but defense-in-depth is missing. If the role system is ever relaxed (e.g., ROLE_ADMIN bypass), non-existent funds could have their status changed, polluting storage.
**Recommendation:** Add `_requireFundExists(fundId)` at the top of `validateFundStatusTransition` and `validateClassStatusTransition`. In `ClassAdjustmentFacet`, the class existence check suffices.
**Status:** OPEN

---

### V8A4-M04: Unbounded Loop in EligibilityFacet Jurisdiction/Tag Checks

**Severity:** MEDIUM
**Location:** `/Users/timoneumann/Elysium/Elysium/contracts/src/facets/EligibilityFacet.sol:101-143`
**Description:** The `isAccountEligible` function iterates over `class.allowedJurisdictions` (line 103), `class.allowedInvestorTypes` (line 117), and `class.requiredTags` with nested loops (lines 131-138). There are no bounds on the size of these arrays. A manager can set arbitrarily large arrays via `setClassEligibilityRequirements`. Similarly, investor `tags` array has no size limit.

The nested loop for tags is O(n*m) where n = requiredTags.length and m = investor tags.length. If both arrays are large (e.g., 100 each), this creates 10,000 iterations in a view function, which could exceed block gas limits when called from write operations (order submission, order processing).

**Impact:** A manager could accidentally or maliciously set many required tags, causing order submission and processing to run out of gas. This is a denial-of-service vector on specific classes.
**Recommendation:** Add upper bounds on array sizes in `_setClassEligibilityRequirementsInternal` (e.g., max 20 jurisdictions, max 20 tags, max 10 investor types). Also bound the investor tags array in `_setAccountAttributesInternal`.
**Status:** OPEN

---

### V8A4-M05: PendingAdjustmentCancelled Event Emits Stale Index After Swap-and-Pop

**Severity:** MEDIUM
**Location:** `/Users/timoneumann/Elysium/Elysium/contracts/src/facets/ClassAdjustmentFacet.sol:225-238`
**Description:** `_cancelPendingAdjustmentInternal` uses swap-and-pop: it swaps the target element with the last element, then pops. The emitted event `PendingAdjustmentCancelled(fundId, index)` reports the original index. However, after the swap, the element previously at `lastIndex` is now at `index`. Off-chain systems indexing by event data would correctly see which index was cancelled, but would need to understand the swap semantics to track the moved element. The event does not emit the cancelled adjustment's details (classId, amount, label), making it difficult for off-chain systems to reconcile.

**Impact:** Off-chain systems that rely on the event to track pending adjustments may incorrectly interpret the queue state after cancellation. This is a data integrity issue for off-chain indexing, not an on-chain security vulnerability.
**Recommendation:** Emit the cancelled adjustment's details (classId, amount, label) in the event. Consider also emitting the swapped element's original index if it was moved.
**Status:** OPEN

---

### V8A4-L01: Adjustment Direction Allows Zero Through Bidirectional Labels

**Severity:** LOW
**Location:** `/Users/timoneumann/Elysium/Elysium/contracts/src/facets/ClassAdjustmentFacet.sol:245-271`
**Description:** The `_validateDirection` function only checks cost-only labels (amount < 0 reverts) and gain-only labels (amount > 0 reverts). The outer `validateClassAdjustment` already checks `amount == 0` at line 37. So the direction validation is correct for all 13 labels. The function correctly allows bidirectional labels (HEDGE, TAX_PROVISION, OTHER) to have any sign. This is verified as CORRECT.

**Impact:** None. This is a confirmation that the direction validation logic is sound.
**Recommendation:** No action needed.
**Status:** NOT A FINDING (verification note)

---

### V8A4-L02: Forced Redemption Bypasses Lock Period, Notice Period, and Class Status

**Severity:** LOW (by design, documented as E-BC15)
**Location:** `/Users/timoneumann/Elysium/Elysium/contracts/src/facets/FundLifecycleFacet.sol:522-569`
**Description:** `_forceSubmitRedemptionOrderInternal` creates a redemption order that bypasses:
1. **Lock period** — no `unlockTs` check on the dealing
2. **Notice period** — `dueDate` is set to `block.timestamp` (immediate)
3. **Class/fund status** — `validateForceRedemption` only checks balance > 0, not fund/class status
4. **Eligibility** — no eligibility check
5. **Order size limits** — no min/max order size validation

The order IS marked as `isForcedRedemption = true`, which prevents the investor from cancelling it. It still goes through normal order processing (NAV update + processOrders), so price is determined at processing time.

**Impact:** This is intentional for fund wind-down scenarios. However, the lack of ANY status check means a forced redemption can be submitted on a CLOSED fund (per the comment "H-05 followup"). This is correct behavior for clearing remaining holdings after closure.
**Recommendation:** No code change needed. Document clearly in the interface that forced redemption bypasses all safety checks except balance verification.
**Status:** OPEN (documentation gap only)

---

### V8A4-L03: reactivateFund From CLOSED Requires ROLE_ADMIN — Correctly Elevated

**Severity:** LOW (informational)
**Location:** `/Users/timoneumann/Elysium/Elysium/contracts/src/facets/FundLifecycleFacet.sol:257-277`
**Description:** The `reactivateFund` function correctly uses `ROLE_ADMIN` when the current status is CLOSED, and `ROLE_MANAGER` otherwise. The scope for ROLE_ADMIN is set to 0 (global scope), and for ROLE_MANAGER it is scoped to fundId. This is the correct pattern per the E-BC10 catalog item.

Similarly, `reactivateClass` follows the same pattern at line 425-434.

The fund-to-ACTIVE transition allows CLOSED -> ACTIVE with admin, RETIRED -> ACTIVE with manager. The class-to-ACTIVE transition follows the same pattern.

**Impact:** None. Role escalation is correctly implemented.
**Recommendation:** No action needed.
**Status:** NOT A FINDING (verification note)

---

### V8A4-L04: Validate Functions Are Public View — State Probing

**Severity:** LOW
**Location:** `/Users/timoneumann/Elysium/Elysium/contracts/src/facets/FundLifecycleFacet.sol:30-57`, `:64-86`, `:128-136`
**Description:** `validateFundStatusTransition`, `validateClassStatusTransition`, `validateForceRedemption`, and `validateCancelPendingSubscribes` are all external view functions. Anyone can call them to probe internal fund state (status, total supply, investor balances). On a private/permissioned blockchain, this is a minor concern. On a public chain, this leaks operational details.

**Impact:** Minimal on a private blockchain. On a public chain, competitors could monitor fund status transitions and investor holdings.
**Recommendation:** If privacy is important, consider restricting these to internal calls only and having the external entry points call them internally. However, since this is a private blockchain, this is acceptable.
**Status:** OPEN (accepted risk)

---

### V8A4-L05: getClassAuditTrail Merges Full History Before Pagination

**Severity:** LOW
**Location:** `/Users/timoneumann/Elysium/Elysium/contracts/src/facets/ClassAdjustmentFacet.sol:350-373`
**Description:** `getClassAuditTrail` calls `_mergeAuditEntries` which allocates a memory array of size `feeLen + adjLen` and performs a full merge sort, THEN applies pagination (offset/limit). For classes with large histories (e.g., 1000+ fee mints and 1000+ adjustments), this allocates a 2000-element array in memory, fills it entirely, and then copies only `limit` elements to the result. This is O(n+m) in memory and computation regardless of the page size requested.

**Impact:** Gas-inefficient for view calls on classes with long histories. Could hit memory limits for very large histories. Since this is a view function, it does not cost gas on-chain, but could timeout in RPC calls.
**Recommendation:** Consider a binary search approach to find the starting point for pagination without materializing the full merged array. Alternatively, document that this view should be called with reasonable history sizes and use `getAdjustmentHistory` + `feeHistory` separately for large datasets.
**Status:** OPEN

---

### V8A4-L06: Commercial Tags Not Validated Against Allowlist

**Severity:** LOW
**Location:** `/Users/timoneumann/Elysium/Elysium/contracts/src/facets/EligibilityFacet.sol:256-260` (requiredTags), `:336-342` (investor tags)
**Description:** Both class `requiredTags` and investor `tags` are `bytes2[]` arrays with no validation against an allowlist. Any `bytes2` value can be set as a tag. This means:
1. Tags are opaque identifiers — no on-chain registry of valid tags
2. Typos in tag values (e.g., "AA" vs "Aa") would silently create non-matching tags
3. No way to enumerate all tags in use across the system

**Impact:** Off-chain systems must maintain tag consistency. On-chain, there is no protection against misconfigured tags preventing eligible investors from subscribing.
**Recommendation:** Consider adding a tag registry (mapping of valid tags) that both class and investor tag setters validate against. This prevents accidental misconfiguration.
**Status:** OPEN

---

## Catalog Pattern Verification

### E-BC15: Forced/admin operations bypass safety checks
**Status:** STILL PRESENT (by design)
**Evidence:** `_forceSubmitRedemptionOrderInternal` (FundLifecycleFacet.sol:522-569) bypasses lock period, notice period, class/fund status, eligibility, and order size limits. `_cancelPendingSubscribesInternal` (FundLifecycleFacet.sol:615-644) bypasses investor-initiated cancel restrictions by calling `executeCancelOrder` with `order.investor` as the account address, effectively impersonating the investor. Both behaviors are documented as intentional for admin wind-down operations.

### E-BC10: Role-scoped access confusion — verify ROLE_MANAGER per-fund vs global
**Status:** FIXED
**Evidence:** All lifecycle operations correctly scope ROLE_MANAGER to fundId in `_validateAndPropose`. Reactivation from CLOSED correctly elevates to ROLE_ADMIN with scope 0 (global). ClassAdjustmentFacet uses fund-scoped manager check at line 100 and falls back to global ROLE_ADMIN at line 109. The role system is consistently applied.

### E-BC27: Unvalidated schedule timestamps — check setDealingSchedule if present
**Status:** NOT FOUND
**Evidence:** `setDealingSchedule` is not present in any of the three facets under review (ClassAdjustmentFacet, EligibilityFacet, FundLifecycleFacet). This pattern would need to be verified in FundManagementFacet or NavManagementFacet.

---

## Specific Check Results

### ClassAdjustmentFacet

1. **maxAdjustmentBps bypass:** Cap is NOT enforced at post time, only at NAV update on aggregate net per class. See V8A4-M01.
2. **MED-U02 (uninitialized fi/ai):** `fi`, `ai`, `mi` are all `uint32` and default to 0 in Solidity. The merge-sort logic in `_mergeAuditEntries` is **correct** — standard two-pointer merge of sorted arrays.
3. **Adjustment cancellation auth:** Cancel requires ROLE_MANAGER (fund-scoped) or ROLE_ADMIN. A manager of fund A cannot cancel adjustments of fund B because `_validateAndPropose` checks fund-scoped manager. Correct.
4. **MAX_PENDING_ADJUSTMENTS overflow:** `validateClassAdjustment` checks `length >= 100` and reverts with `TooManyPendingAdjustments()`. Correct.
5. **Direction validation:** All 13 labels verified. 8 cost-only, 2 gain-only, 3 bidirectional. Logic is correct.
6. **Historical audit trail:** `adjustmentHistory` is append-only (push in NavManagementFacet line 303). No delete/overwrite path exists. Correct.
7. **Class vs fund scoping:** `validateClassAdjustment` checks `TokenIdUtils.toFundTokenId(classId) != fundId` and reverts with `AdjustmentClassNotInFund`. Cross-fund posting is prevented. Correct.

### EligibilityFacet

1. **MED-RV04 (isEligible unused return):** FIXED. Line 63 returns `this.isAccountEligible(account, classId)` which returns `(bool, string)`. The return value IS used as the return of `isEligible`. The Slither finding appears to be a false positive or was already fixed.
2. **KYC bypass:** No bypass found. `isAccountEligible` checks `class.requiresKYC && !attrs.kycVerified` at line 86. Eligibility is checked at submission AND processing time.
3. **Jurisdiction checks:** Checked at submission (OrderValidationFacet:123) and processing (OrderManagementFacet:313) via `isEligible`. Correct.
4. **Eligibility update roles:** Only ROLE_ADMIN can call `setAccountAttributes`. Investors cannot update their own eligibility. Correct.
5. **Commercial tags:** No allowlist validation. See V8A4-L06.
6. **isAccountEligible vs isEligible:** `isEligible` first checks if the address is a valid account, then delegates to `isAccountEligible`. They return the same type. `isAccountEligible` skips the account existence check.

### FundLifecycleFacet

1. **E-BC15 forced redemption bypass:** Confirmed — bypasses lock period, notice period, class status, eligibility, order size. See V8A4-L02.
2. **Lifecycle transitions:** ACTIVE->RETIRED (manager), ACTIVE/RETIRED->CLOSED (manager, requires supply=0), CLOSED->ACTIVE/RETIRED (admin). RETIRED->ACTIVE (manager). All transitions validated. However, ACTIVE->ACTIVE and CLOSED->CLOSED correctly revert.
3. **CLOSED requires totalSupply == 0:** Enforced at line 44 (fund) and line 78 (class). Correct. Pending orders are NOT checked (documented as H-05 trade-off).
4. **executeCancelOrder return value:** The return value of `executeCancelOrder` is indeed ignored in `_cancelPendingSubscribesInternal` (line 638). However, since it is called via external call through the diamond, a revert propagates. If it returns false without reverting, the false would be silently ignored. Currently, `executeCancelOrder` always returns true or reverts, so this is safe. See V8A4-H01 for the revert propagation issue.
5. **Bulk cancel gas:** The loop in `_cancelPendingSubscribesInternal` iterates over `orderIds.length` which is caller-provided. Each iteration makes an external call. With large arrays, this could exceed block gas limit. However, the caller controls the batch size, so this is manageable off-chain. The `orderIds` are provided as calldata (not discovered on-chain), avoiding the original H-05 concern about on-chain iteration.
6. **Validate functions callable by anyone:** Yes, all validate functions are external view. See V8A4-L04.
7. **Fund isolation:** All operations are scoped by fundId. `_validateAndPropose` uses fundId as scope for ROLE_MANAGER. Token IDs encode umbrella+fund+class+dealing, and `toFundTokenId` correctly extracts the fund portion. No cross-fund operations found.
