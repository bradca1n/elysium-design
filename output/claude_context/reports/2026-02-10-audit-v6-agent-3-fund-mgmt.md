# Security Audit Report: Agent 3 — Fund Management & Lifecycle Facets (V6)

**Date:** 2026-02-10
**Auditor:** Agent 3 (Claude Opus 4.6)
**Scope:**
- `FundManagementFacet.sol` (1,209 lines)
- `FundManagementValidationFacet.sol` (112 lines)
- `FundLifecycleFacet.sol` (733 lines)

**Context Files Reviewed:**
- `BaseFacet.sol`, `FundAdminStructs.sol`, `TokenIdUtils.sol`, `Constants.sol`
- `ISharedErrors.sol`, `IFundManagement.sol`, `IFundLifecycle.sol`
- `LibAppStorage.sol`, `AppStorageRoot.sol`
- `OrderValidationFacet.sol` (partial, for cancel interaction)

---

## Executive Summary

| Severity | Count |
|----------|-------|
| CRITICAL | 2 |
| HIGH | 5 |
| MEDIUM | 7 |
| LOW | 5 |
| INFORMATIONAL | 4 |
| **Total** | **23** |

The fund management and lifecycle facets handle fund creation, class configuration, dealing management, on/off-ramp cash operations, dealing token conversion, lifecycle transitions, forced redemptions, and bulk order cancellations. The code has benefited from prior audit remediations (V3-V5), with counter overflow guards, division-by-zero checks, and fund-active validation already present. However, several new and residual issues remain, particularly around dealing schedule validation, force redemption scope, lifecycle transition edge cases, and missing existence checks.

---

## CRITICAL Findings

## [CRITICAL] A3-01: setDealingSchedule accepts arbitrary timestamps without any validation

**ID:** A3-01
**Location:** `FundManagementFacet.sol:L813-L844`
**Description:**
The `setDealingSchedule` function and its corresponding `executeSetDealingSchedule` accept an arbitrary array of `uint32` timestamps and store them directly in storage without any validation whatsoever. There is no check that:
1. Timestamps are in the future (past timestamps can be set)
2. Timestamps are monotonically ordered (descending, as documented, or ascending)
3. Timestamps are non-zero
4. Timestamps don't overlap with existing active dealing periods
5. The array length is bounded (unbounded gas cost on storage write)

```solidity
// FundManagementFacet.sol:L834-L844
function executeSetDealingSchedule(
    address accountAddress,
    bytes memory functionData
) external onlyInternalExecution returns (bool) {
    (uint256 fundId, uint32[] memory timestamps) = abi.decode(functionData, (uint256, uint32[]));
    s.FundAdmin[0].funds[fundId].nextDealingTimestamps = timestamps;
    // No validation at all — arbitrary data written directly
    s.FundAdmin[0].fundConfigChangeBlocks[fundId].push(uint32(block.number));
    emit DealingScheduleUpdated(fundId, timestamps);
    return true;
}
```

**Impact:**
A manager could set past timestamps which could cause the dealing process state machine to malfunction (e.g., `dealingProcessState` could immediately return `AWAITS_NAV_UPDATE` or `PROCESSING` for timestamps already passed). Setting duplicate or overlapping timestamps could cause double processing of the same dealing period. An unbounded array could cause out-of-gas on subsequent reads. Setting timestamp 0 could interact poorly with `navUpdatedAt` comparisons.

**Recommendation:**
Add validation in the execute function:
1. Require all timestamps > `block.timestamp`
2. Require timestamps are strictly monotonically ordered (descending if stored reversed)
3. Require non-zero timestamps
4. Bound the array length to a reasonable maximum (e.g., 365)
5. Consider adding validation in a `FundManagementValidationFacet.validateDealingSchedule()` method

**Reference:** SWC-116 (Block values as proxy for time), Focus Area #16

---

## [CRITICAL] A3-02: Force redemption can target any dealing token across any fund within the same umbrella

**ID:** A3-02
**Location:** `FundLifecycleFacet.sol:L482-L516`
**Description:**
The `forceSubmitRedemptionOrder` function derives `fundId` from the dealing token ID to determine the ROLE_MANAGER scope check. However, `validateForceRedemption` (L128-L136) only checks that the investor has a non-zero balance on the specified dealing — it performs no validation that:
1. The dealing token actually belongs to a valid fund
2. The dealing's class or fund is in an appropriate lifecycle state (the comment at L133 says "Force redemption allowed on CLOSED funds" but this means a MANAGER of Fund A could force-redeem tokens from Fund B's dealing if they have MANAGER role on the fund derived from the dealing ID)

The critical issue is that `_validateAndPropose` at L491 uses `ROLE_MANAGER` with `fundId` derived from the dealing token. If a manager controls multiple funds or if the dealing token ID is crafted, the manager could force-redeem from any investor holding in any dealing where they are manager.

Looking more carefully at the access control flow:
- `fundId = TokenIdUtils.toFundTokenId(dealingId)` extracts the fund from the dealing
- `_validateAndPropose(..., ROLE_MANAGER, fundId, ...)` checks that `accountAddress` is the manager of that fund
- So a manager CAN force-redeem from ANY investor in ANY dealing within their managed fund

This is by design for fund managers but has no guardrail:
- No lifecycle check (works even on CLOSED funds per comment)
- No rate limiting
- No minimum notice to investor
- No cap on forced redemption frequency

The severity is CRITICAL because a malicious manager can drain all investor holdings across all dealing periods in their fund without any lifecycle restriction or investor notification.

**Impact:**
A fund manager can force-redeem all tokens from all investors in their fund at any time, even on CLOSED funds, bypassing lock periods (since `forceSubmitRedemptionOrder` does not check `unlockTs`), potentially at unfavorable prices. The forced redemption order has `isForcedRedemption = true` which prevents investor cancellation.

**Recommendation:**
1. Add lock period checking for forced redemptions (or at minimum document that managers can bypass locks)
2. Add lifecycle state restrictions (at least require fund is not CLOSED unless admin-initiated)
3. Consider requiring ROLE_ADMIN for forced redemptions rather than ROLE_MANAGER, or require multi-sig approval
4. Emit a pre-notification event before forced redemption is processed to give investors visibility

**Reference:** SWC-105 (Unprotected access), Focus Area #14

---

## HIGH Findings

## [HIGH] A3-03: Reactivating CLOSED fund to ACTIVE bypasses all safety checks

**ID:** A3-03
**Location:** `FundLifecycleFacet.sol:L48-L52, L257-L277`
**Description:**
The `validateFundStatusTransition` function allows CLOSED -> ACTIVE transition with no additional checks beyond verifying the current status is not already ACTIVE. Once a fund is closed (requires totalSupply == 0), reactivating it to ACTIVE:
1. Does not verify the umbrella is still ACTIVE
2. Does not verify that the fund's reporting currency is still active in the umbrella
3. Does not re-validate any class states (classes may all be CLOSED)
4. The fund's dealing schedule, NAV, and other configuration may be stale or invalid

```solidity
// FundLifecycleFacet.sol:L48-L52
} else if (targetStatus == FundAdminStructs.EntityStatus.ACTIVE) {
    // Reactivation to ACTIVE
    if (current == FundAdminStructs.EntityStatus.ACTIVE) {
        revert InvalidStatusTransition(current, targetStatus);
    }
    // No additional checks for CLOSED -> ACTIVE!
}
```

While reactivation from CLOSED requires ROLE_ADMIN (L265), the admin can still reactivate a fund whose umbrella was RETIRED or CLOSED, creating an inconsistent state.

**Impact:**
A CLOSED fund can be reactivated to ACTIVE even if its parent umbrella is RETIRED or CLOSED. This violates the hierarchical lifecycle guarantee and could allow subscriptions to a fund whose umbrella does not accept new deposits (onramp checks umbrella ACTIVE status).

**Recommendation:**
When reactivating from CLOSED to ACTIVE, validate:
1. Parent umbrella is ACTIVE
2. Fund's reporting currency is still active in the umbrella
3. At least one class exists and is ACTIVE (or will be reactivated)

**Reference:** Focus Area #6

---

## [HIGH] A3-04: cancelPendingSubscribes calls executeCancelOrder which validates investor == accountAddress, but passes order.investor

**ID:** A3-04
**Location:** `FundLifecycleFacet.sol:L638`
**Description:**
In `_cancelPendingSubscribesInternal`, the code calls:
```solidity
OrderManagementFacet(address(this)).executeCancelOrder(order.investor, functionData);
```

Looking at `OrderValidationFacet.validateOrderCancellation` (L69-L85), it checks:
```solidity
if (order.investor != accountAddress) revert IOrderManagement.NotOrderOwner();
```

This means the cancel call passes `order.investor` as the `accountAddress`, which will pass the `NotOrderOwner` check. However, `executeCancelOrder` has the `onlyInternalExecution` modifier. The issue is that `_cancelPendingSubscribesInternal` runs within the internal execution context (since it's called from `executeCancelPendingSubscribes` which is guarded by `onlyInternalExecution`), and calls `executeCancelOrder` as an external call via `OrderManagementFacet(address(this))`.

This external call goes through the Diamond proxy, which means it will be dispatched to `OrderManagementFacet.executeCancelOrder`. Since `s.internalExecutionContext` was set to true by the parent `_validateAndPropose` call, this nested call will pass the `onlyInternalExecution` check.

However, the `executeCancelOrder` also calls `validateOrderCancellation` which checks `order.isForcedRedemption`. If any of the provided order IDs happen to be a forced redemption order (orderType == REDEEM with isForcedRedemption == true), the cancel will revert, potentially reverting the entire batch transaction.

The real HIGH issue: if ANY order in the `orderIds` array is a forced redemption or non-pending or non-subscribe order that causes a revert in `executeCancelOrder`, the ENTIRE batch of cancellations reverts. The `_cancelPendingSubscribesInternal` function does pre-filter with `continue` for non-PENDING and non-SUBSCRIBE orders, but `executeCancelOrder` independently re-validates via `validateOrderCancellation` which also checks `isForcedRedemption`. If the filters in `_cancelPendingSubscribesInternal` don't perfectly match the validation in `executeCancelOrder`, the batch could revert.

More critically: `validateOrderCancellation` also checks `dealingProcessState(fundId)` - if the fund is in PROCESSING state, ALL cancels will revert, even though the fund is RETIRED/CLOSED.

**Impact:**
Batch cancel of pending subscribes may be blocked if the dealing process state is PROCESSING, even on RETIRED/CLOSED funds. A DOS vector exists where a NAV update puts the fund into PROCESSING state and prevents the manager from cancelling pending subscribes.

**Recommendation:**
1. Either bypass the `validateOrderCancellation` check for bulk cancels initiated by manager (since it's already validated at the `cancelPendingSubscribes` level), or
2. Add a dedicated internal cancel path that skips the dealing-in-progress check for manager-initiated bulk cancels on non-ACTIVE funds

**Reference:** Focus Area #15

---

## [HIGH] A3-05: No fund existence validation on executeSetDealingSchedule and executeSetMaxCapacity

**ID:** A3-05
**Location:** `FundManagementFacet.sol:L834-L844, L874-L881`
**Description:**
Both `executeSetDealingSchedule` and `executeSetMaxCapacity` write to `s.FundAdmin[0].funds[fundId]` without validating that the fund exists. While the proposal path (`_validateAndPropose`) checks that `accountAddress` is the fund manager (which implicitly requires the fund to exist), the execute functions do not re-validate fund existence. In the multisig flow, a fund could theoretically be closed and its storage zeroed between proposal and execution.

```solidity
// FundManagementFacet.sol:L838-L839
(uint256 fundId, uint32[] memory timestamps) = abi.decode(functionData, (uint256, uint32[]));
s.FundAdmin[0].funds[fundId].nextDealingTimestamps = timestamps;
// No _requireFundExists(fundId) check
```

Additionally, neither function validates the fund's lifecycle status. A dealing schedule can be set on a CLOSED fund, and max capacity can be modified on a RETIRED or CLOSED fund.

**Impact:**
Configuration can be written to non-existent or CLOSED fund storage slots, creating phantom state that could interfere with future fund creation if the same ID is reused (though counter overflow protection makes this unlikely in practice).

**Recommendation:**
Add `_requireFundExists(fundId)` and fund status checks in both execute functions. At minimum, require fund is ACTIVE for dealing schedule changes.

**Reference:** SWC-105, Focus Area #3

---

## [HIGH] A3-06: Dealing creation uses navUpdatedAt as createdAt, which is 0 for the first dealing

**ID:** A3-06
**Location:** `FundManagementFacet.sol:L329-L353`
**Description:**
The `createDealing` function at L339 reads `navUpdatedAt` from the fund:
```solidity
uint32 navUpdatedAt = s.FundAdmin[0].funds[fundId].navUpdatedAt;
```

For the very first dealing created during `_createFundInternal` (L134), the fund has just been initialized with `navUpdatedAt: 0` (L109). This means:
1. `navUpdatedAt` = 0
2. `finalUnlockTs` = `0 + lockPeriod` (if unlockTs param is 0)
3. `baseInfo[dealingId].createdAt` = 0 (L350)
4. `lastPerfMintAtNavT` = 0 (L347)

The first dealing's `createdAt` being 0 is problematic because `_requireClassExists` uses `createdAt == 0` as the non-existence check. The first dealing's `baseInfo.createdAt` will be 0, making it indistinguishable from a non-existent entity in existence checks.

However, the call at L134 passes `unlockTs = SafeCast.toUint32(block.timestamp)`, so `finalUnlockTs` = `block.timestamp` (not 0). The `createdAt = navUpdatedAt = 0` is still the issue.

**Impact:**
The first dealing of every fund has `createdAt == 0` in its baseInfo. Any code path that checks `baseInfo[dealingId].createdAt == 0` to determine existence would incorrectly conclude this dealing does not exist. While dealing existence checks in the current codebase use `isDealingToken()` (token ID structure check) rather than `createdAt`, this is a latent vulnerability that could be triggered by future code additions.

**Recommendation:**
For the initial dealing created at fund creation time, use `block.timestamp` for `createdAt` instead of `navUpdatedAt` when `navUpdatedAt` is 0:
```solidity
uint32 createdAtTs = navUpdatedAt == 0 ? SafeCast.toUint32(block.timestamp) : navUpdatedAt;
```

**Reference:** Focus Area #12

---

## [HIGH] A3-07: batchConvertDealingTokens rounding loss can silently reduce investor value

**ID:** A3-07
**Location:** `FundManagementFacet.sol:L791-L802`
**Description:**
The dealing token conversion performs two sequential `Math.mulDiv` operations:
```solidity
uint256 value = Math.mulDiv(tokenAmount, fromPrice, PRECISION);
uint256 convertedAmount = Math.mulDiv(value, PRECISION, toPrice);
```

This two-step multiplication introduces compounding rounding losses. For each holder, the value is first calculated (rounding down), then converted (rounding down again). With many holders, the total converted amount could be significantly less than the original total value.

Additionally, there is no minimum output check — if `fromPrice` is very small or `toPrice` is very large, `convertedAmount` could be 0 even for non-zero `tokenAmount`. The function silently continues with `continue` only for zero `tokenAmount`, not for zero `convertedAmount`. An investor with a non-zero balance could have their tokens burned and receive 0 tokens in return.

**Impact:**
Investors can lose value during dealing token conversion due to rounding. In extreme cases (very small fromPrice or very large toPrice), tokens can be burned with zero tokens minted in return, causing complete loss of investor value.

**Recommendation:**
1. Add a minimum output check: `if (convertedAmount == 0) revert` or skip the conversion
2. Consider using a single `Math.mulDiv(tokenAmount, fromPrice, toPrice)` to reduce rounding steps
3. Add a slippage tolerance parameter for conversions

**Reference:** SWC-101, Focus Area #12

---

## MEDIUM Findings

## [MEDIUM] A3-08: createFundWithCurrency is public instead of external, lacks override keyword

**ID:** A3-08
**Location:** `FundManagementFacet.sol:L39-L46`
**Description:**
`createFundWithCurrency` is declared as `public` rather than `external`. In a Diamond proxy architecture, all entry points should be `external` since they're called through `delegatecall`. The `public` visibility has slightly higher gas cost and could be misleading about internal callability.

Additionally, `createFundWithCurrency` and `createShareClassWithCurrency` are not declared in the `IFundManagement` interface and have no `override` keyword, suggesting they may be undocumented entry points added outside the normal interface contract.

**Impact:**
Minor gas overhead and potential for confusion about which functions are part of the public API.

**Recommendation:**
Change `createFundWithCurrency` and `createShareClassWithCurrency` to `external` visibility and add them to the `IFundManagement` interface.

**Reference:** SWC-100 (Function Default Visibility)

---

## [MEDIUM] A3-09: Fund closure only checks fund-level totalSupply, not class-level or dealing-level supply

**ID:** A3-09
**Location:** `FundLifecycleFacet.sol:L39-L47`
**Description:**
When closing a fund, `validateFundStatusTransition` checks:
```solidity
uint128 totalSupply = s.FundAdmin[0].baseInfo[fundId].totalSupply;
if (totalSupply > 0) revert FundHasSupply(fundId, totalSupply);
```

This checks the fund-level `totalSupply` in `baseInfo`. However, the fund-level totalSupply is maintained separately from class and dealing totalSupply values. If there's a bug in the totalSupply tracking (e.g., from prior rounding issues or the SUPPLY_DUST_TOLERANCE constant), the fund-level totalSupply could be 0 while individual classes or dealings still have non-zero supply.

Similarly, class closure at L73-L78 only checks `baseInfo[classId].totalSupply` without checking that all underlying dealing totalSupply values are also zero.

**Impact:**
If fund-level totalSupply gets out of sync with the sum of class/dealing supplies (possible due to rounding dust tolerance), a fund could be closed while investors still hold tokens in individual dealings.

**Recommendation:**
When closing a fund, iterate over all classes and verify their totalSupply is also 0. When closing a class, verify all dealing totalSupply values are 0. At minimum, add an invariant check that `sum(class.totalSupply) == fund.totalSupply`.

**Reference:** Focus Area #5

---

## [MEDIUM] A3-10: Offramp validation does not check umbrella existence, only status

**ID:** A3-10
**Location:** `FundManagementValidationFacet.sol:L87-L95`
**Description:**
The `validateOfframp` function checks:
```solidity
if (umbrella.status == FundAdminStructs.EntityStatus.CLOSED) revert ...;
```

But it does not check `umbrella.exists`. For a non-existent umbrella, `status` would be the default value `ACTIVE` (enum value 0), so the check passes. Combined with a crafted `cashFundTokenId` that points to a non-existent umbrella, this could allow operations on phantom umbrellas.

Compare with `validateOnramp` which does check `umbrella.exists`:
```solidity
if (!umbrella.exists) revert IFundManagement.UmbrellaFundNotFound();
```

**Impact:**
An offramp operation could potentially proceed for a cash fund token belonging to a non-existent umbrella. In practice, the user would need to have a balance of that cash token for the burn to succeed, limiting exploitability.

**Recommendation:**
Add `if (!umbrella.exists) revert IFundManagement.UmbrellaFundNotFound();` to `validateOfframp` before the status check, consistent with `validateOnramp`.

**Reference:** SWC-105, Focus Area #13

---

## [MEDIUM] A3-11: setPerformanceFeeCalculator allows setting arbitrary contract address without validation

**ID:** A3-11
**Location:** `FundManagementFacet.sol:L958-L999`
**Description:**
The `setPerformanceFeeCalculator` function allows setting any address as the performance fee calculator, including:
1. `address(0)` (disabling performance fees, which may be intentional)
2. An EOA (would fail when called as a contract)
3. A malicious contract that returns excessive fee values
4. A self-destructing contract

There is no validation that the address is a contract, implements the expected interface, or returns reasonable values.

**Impact:**
A compromised manager could set a malicious performance fee calculator that reports inflated fees, extracting excess value from investors. Or they could set an EOA/non-contract address causing all future performance fee calculations to revert, blocking order processing.

**Recommendation:**
1. If setting to non-zero address, validate it is a contract (`address.code.length > 0`)
2. Consider adding an interface check (ERC-165) for the expected performance fee calculator interface
3. Add the `MAX_ADJUSTED_FEE_RATE_BPS` (2000 bps = 20%) cap check at the point of use, not just in Constants

**Reference:** SWC-105, Focus Area #2

---

## [MEDIUM] A3-12: Umbrella fund creation does not validate currency is globally active before activating

**ID:** A3-12
**Location:** `FundManagementFacet.sol:L530-L531`
**Description:**
While the code checks `currencies[initialCurrency].isActive` at L530, if a currency is later deactivated globally, the umbrella's currency status is never updated. The `umbrellaCurrencyActive` mapping is set independently from the global `currencies` registry.

More importantly, the validation in `_createUmbrellaFundInternal` uses `currencies[initialCurrency].isActive` which only checks the global registry. But once the umbrella is created with this currency active, deactivating the currency globally does not cascade to existing umbrellas. This is more of an architectural concern than a direct vulnerability.

**Impact:**
A globally deactivated currency could remain active in existing umbrellas, allowing fund creation and class creation with deprecated currencies.

**Recommendation:**
When checking `umbrellaCurrencyActive`, also verify the currency is still globally active, or provide an admin function to cascade global deactivation to all umbrellas.

**Reference:** Focus Area #9

---

## [MEDIUM] A3-13: Class reactivation does not check parent fund status

**ID:** A3-13
**Location:** `FundLifecycleFacet.sol:L64-L86, L417-L437`
**Description:**
The `reactivateClass` function validates the class transition but does not check the parent fund's status. A CLOSED class can be reactivated to ACTIVE even if the parent fund is RETIRED or CLOSED.

```solidity
function validateClassStatusTransition(uint256 classId, FundAdminStructs.EntityStatus targetStatus) external view {
    // Only checks class status, NOT fund status
    FundAdminStructs.ClassInfo storage class_ = s.FundAdmin[0].classes[classId];
    FundAdminStructs.EntityStatus current = class_.status;
    // ...
}
```

While the effective status function (`getEffectiveClassStatus`) returns `max(fundStatus, classStatus)`, the reactivation itself does not validate consistency. A class ACTIVE under a CLOSED fund is inconsistent state.

**Impact:**
Inconsistent class/fund lifecycle states where a class shows as ACTIVE but the effective status is CLOSED. This could confuse off-chain systems querying individual class status vs effective status.

**Recommendation:**
When reactivating a class to ACTIVE, verify the parent fund is also ACTIVE. If the fund is RETIRED, the maximum allowed class status should be RETIRED. If the fund is CLOSED, class reactivation should be blocked.

**Reference:** Focus Area #7

---

## [MEDIUM] A3-14: No validation of denomination currency for initial base class at fund creation

**ID:** A3-14
**Location:** `FundManagementFacet.sol:L129`
**Description:**
During `_createFundInternal`, the base class (fee class) is created via:
```solidity
uint256 feeClassId = _createShareClassInternal(fundId, "Base Class", 0, address(0), 0, 0);
```

`_createShareClassInternal` calls `_createShareClassInternalWithCurrency` with `denomCurrency = fund.reportingCurrency`. However, at this point in the creation flow, `_createShareClassInternalWithCurrency` checks:
```solidity
if (s.FundAdmin[0].funds[fundId].status != FundAdminStructs.EntityStatus.ACTIVE) {
    revert ISharedErrors.FundNotActive();
}
```

The fund was just created at L104-L117 with `status: FundAdminStructs.EntityStatus.ACTIVE`, so this passes. But it also checks `umbrellaCurrencyActive`:
```solidity
if (!s.FundAdmin[0].umbrellaCurrencyActive[umbrellaId][denominationCurrency]) {
    revert ISharedErrors.CurrencyNotActiveInUmbrella();
}
```

Since `validateFundCreation` already verified the reporting currency is active in the umbrella (L30-L31), this check should pass. This is correct behavior but the class counter starts at 1 (L285-L286: `nextClassId++` then read), meaning the base class gets classIdNum = 1, which matches the expectation in Constants.FIRST_USER_CLASS_ID = 2.

This is actually correctly implemented. Downgrading to informational.

**Impact:**
Minimal - the logic is correct but relies on implicit ordering guarantees.

**Recommendation:**
No action needed. Consider adding a comment explaining why the currency check passes for the base class.

---

## LOW Findings

## [LOW] A3-15: Missing event for setSettlementOperator configuration changes

**ID:** A3-15
**Location:** `FundManagementFacet.sol:L415-L419`
**Description:**
The `setSettlementOperator` function emits `SettlementOperatorSet` but uses the unified `roles` mapping. The event emission is present and correct. However, the function does not validate that `operator != address(0)`.

**Impact:**
Setting address(0) as a settlement operator is useless but wastes gas and creates a misleading audit trail.

**Recommendation:**
Add `require(operator != address(0))` validation.

---

## [LOW] A3-16: fundId parameter in validateForceRedemption is unused as an independent check

**ID:** A3-16
**Location:** `FundLifecycleFacet.sol:L128-L136`
**Description:**
The `validateForceRedemption` function takes `fundId` as a parameter but never uses it. The fund ID is derivable from `dealingId` via `TokenIdUtils.toFundTokenId(dealingId)`. The caller at L489 derives `fundId` from `dealingId`, so the parameter adds no value.

```solidity
function validateForceRedemption(
    uint256 fundId,       // <-- unused
    address investorAccount,
    uint256 dealingId
) external view {
    uint256 balance = FundTokensFacet(address(this)).balanceOf(investorAccount, dealingId);
    if (balance == 0) revert NothingToRedeem();
}
```

**Impact:**
No direct security impact, but the unused parameter could mislead developers into thinking fund-level validation is performed when it is not.

**Recommendation:**
Either use `fundId` for additional validation (e.g., check fund lifecycle status) or remove the parameter.

---

## [LOW] A3-17: Umbrella fund members list (fundIds) grows unboundedly

**ID:** A3-17
**Location:** `FundManagementFacet.sol:L120`
**Description:**
When creating a fund, the fund number is pushed to the umbrella's `fundIds` array:
```solidity
s.FundAdmin[0].umbrellaFunds[umbrellaId].fundIds.push(fundNum);
```

This array grows without bounds. When funds are closed or retired, they are never removed from this list. The `getUmbrellaFundMembers` view function returns the entire array, which could become very large over time.

**Impact:**
Gas cost for reading umbrella fund members grows linearly with the number of funds ever created. For view functions this causes increasing RPC costs; if used on-chain it could hit gas limits.

**Recommendation:**
Consider adding a removal mechanism for closed funds, or document that this list includes all historical funds (not just active ones).

---

## [LOW] A3-18: nextFundId() only works for ELYSIUM_UMBRELLA_ID (umbrella 1)

**ID:** A3-18
**Location:** `FundManagementFacet.sol:L360-L364`
**Description:**
The `nextFundId()` view function is hardcoded to query `Constants.ELYSIUM_UMBRELLA_ID` (umbrella 1):
```solidity
function nextFundId() external view override returns (uint256) {
    uint16 nextFundNum = s.FundAdmin[0].nextFundNumPerUmbrella[Constants.ELYSIUM_UMBRELLA_ID];
    if (nextFundNum == 0) nextFundNum = 1;
    return TokenIdUtils.createTokenId(Constants.ELYSIUM_UMBRELLA_ID, nextFundNum, 0, 0);
}
```

In a multi-umbrella system, this function only returns the next fund ID for umbrella 1, which could be misleading. Other umbrellas have their own independent fund numbering.

**Impact:**
Off-chain clients relying on `nextFundId()` for umbrellas other than 1 will get incorrect results.

**Recommendation:**
Add a `nextFundIdForUmbrella(uint16 umbrellaId)` view function or deprecate `nextFundId()` in favor of a parameterized version.

---

## [LOW] A3-19: createShareClass validation does not check class denomination currency validity

**ID:** A3-19
**Location:** `FundManagementValidationFacet.sol:L35-L46`
**Description:**
The `validateShareClassCreation` function validates fund existence, name non-empty, and management fee rate. However, it does not validate that the denomination currency (passed separately via `createShareClassWithCurrency`) is valid. That validation happens later in `_createShareClassInternalWithCurrency` (L276-L281), but only at execution time, not at proposal time. This means a proposal could be created with an invalid currency, only to fail at execution.

**Impact:**
Wasted gas on proposals that will fail at execution time due to invalid denomination currency.

**Recommendation:**
Move currency validation into `validateShareClassCreation` or add a separate validation function called at proposal time.

---

## INFORMATIONAL Findings

## [INFORMATIONAL] A3-20: Floating pragma ^0.8.28

**ID:** A3-20
**Location:** All three facets
**Description:**
All contracts use `pragma solidity ^0.8.28` which allows compilation with any 0.8.x compiler >= 0.8.28. For production deployments, a fixed pragma (e.g., `= 0.8.28`) provides more deterministic compilation.

**Impact:**
Different compiler versions could introduce subtle behavior changes.

**Recommendation:**
Pin to a specific Solidity version for deployment.

**Reference:** SWC-103

---

## [INFORMATIONAL] A3-21: Redundant validation in proposal and execute paths

**ID:** A3-21
**Location:** Multiple functions across all three facets
**Description:**
Several operations perform the same validation both at proposal time and at execution time. For example, `createFund` calls `validateFundCreation` both in `_createFundProposal` (L54) and in `executeCreateFund` (L77). Similarly, lifecycle transitions validate at both proposal and execute.

While this is a security best practice for multisig flows (state can change between proposal and execution), it results in double gas costs for single-signer operations where the execute happens in the same transaction as the proposal.

**Impact:**
Minor gas overhead for single-signer operations.

**Recommendation:**
This is acceptable and a security best practice. No change needed.

---

## [INFORMATIONAL] A3-22: The accountAddress parameter in execute functions is often unused

**ID:** A3-22
**Location:** Multiple execute* functions
**Description:**
Several `execute*` functions receive `accountAddress` but don't use it (e.g., `executeCreateUmbrellaFund`, `executeSetMaxCapacity`, `executeBatchConvertDealingTokens`). The parameter is part of the standardized execute interface for the multisig system but is never read in these implementations.

**Impact:**
Minor code clarity issue. No security impact since the parameter is validated by the proposal system before reaching execute.

**Recommendation:**
Consider adding a comment explaining the interface requirement, or use `/* accountAddress */` syntax to indicate intentionally unused parameters.

---

## [INFORMATIONAL] A3-23: Dealing conversion validation requires same lastPerfMintAtNavT but not same dealing age

**ID:** A3-23
**Location:** `FundManagementValidationFacet.sol:L64-L69`
**Description:**
The `validateDealingConversion` function requires both dealings to have the same `lastPerfMintAtNavT`. This is a security check to ensure performance fees have been settled consistently. However, it does not check that both dealings have the same `unlockTs` semantics or similar creation timestamps, meaning investors could be moved between dealings with very different lock period characteristics.

While the unlock check (L58-L63) ensures both dealings are currently unlocked, the target dealing's remaining lock period could be very different from the source.

**Impact:**
Investors could be moved to a dealing with a significantly different historical context, though both must be unlocked at the time of conversion.

**Recommendation:**
Document this behavior clearly. If lock periods should be comparable, add a check that the target dealing's lock period is not stricter than the source.

---

## Summary of Key Recommendations

1. **CRITICAL:** Add comprehensive validation to `setDealingSchedule` (timestamps must be future, ordered, bounded)
2. **CRITICAL:** Add lifecycle and lock period checks to force redemption, or require ADMIN role
3. **HIGH:** Validate umbrella/currency status when reactivating CLOSED funds
4. **HIGH:** Create dedicated bulk cancel path that doesn't go through `validateOrderCancellation`
5. **HIGH:** Add fund existence/status checks to execute functions for configuration changes
6. **HIGH:** Fix first dealing `createdAt = 0` issue
7. **HIGH:** Add minimum output protection for dealing token conversion
