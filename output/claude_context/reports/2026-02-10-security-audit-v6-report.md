# Elysium Security Audit V6 -- Consolidated Report

**Date:** 2026-02-10
**Branch:** multiCurrency
**Methodology:** 7-phase Trail of Bits methodology
**Auditor:** Claude Opus 4.6
**Codebase:** Diamond Proxy (EIP-2535), 16 facets, ~15,687 lines Solidity

---

## Executive Summary

This audit identified **83 unique findings** (7 Critical, 19 High, 26 Medium, 18 Low, 13 Informational) plus **18 cross-facet attack chains** and **20 gas optimization findings** across the Elysium fund administration smart contract system.

**Key themes:**

1. **Dual totalSupply Divergence (CRITICAL):** The system maintains two independent supply tracking mechanisms (`FundTokensStorage.totalSupply` and `FundAdminStorage.baseInfo.totalSupply`) that drift apart during fee minting and performance fee processing. This produces systematic fund price inflation affecting all downstream calculations.

2. **FX Safety Framework Bypassable (CRITICAL):** Default safety configurations (all zeros) disable all FX rate validation, and a settlement operator can force 1:1 exchange rates on cross-currency settlements by passing `actualFxRate=0`, bypassing the entire FX safety system.

3. **Uncapped Fee Extraction (CRITICAL):** Performance fee BPS is caller-supplied up to 100%, management fee rate safety limits are stored but never enforced, and forced redemptions have no lifecycle or lock period restrictions -- enabling a malicious manager to drain investor funds.

4. **Dealing Schedule Unvalidated (CRITICAL):** `setDealingSchedule` accepts arbitrary timestamps without any validation, enabling permanent fund state machine lockups.

5. **Price Calculation Inconsistency:** The NAV update transaction processes adjustments and fees before storing the new NAV, causing all intermediate calculations to use stale data with compounding errors across classes and NAV cycles.

**Code maturity score: 2.4/4.0** (Trail of Bits 9-category framework). Lowest: Decentralization (1/4). Highest: Arithmetic, Auditing, Documentation, Front-running, Low-level (all 3/4).

**Deployment readiness: NOT READY.** 7 critical and 19 high-severity findings must be resolved before any deployment. The dual totalSupply divergence alone would cause progressive NAV corruption from the first fee minting event.

---

## Severity Summary Table

| Severity | Count | Deployment Blocker? |
|----------|-------|---------------------|
| CRITICAL | 7 | YES |
| HIGH | 19 | YES |
| MEDIUM | 26 | Recommended |
| LOW | 18 | No |
| INFORMATIONAL | 13 | No |
| Gas | 20 | No |
| Attack Chains | 18 | Reference |

---

## CRITICAL Findings

### C-01: Fund totalSupply Not Updated When Fees Are Minted to Fee Class

**Source:** A4-03, A5-01, TOB-01
**Location:** `FeeManagementFacet.sol:L199-L204`, `OrderManagementFacet.sol:L371-L379`
**Also flagged by Slither:** No (logic error, not detectable by static analysis)

**Description:**
The system maintains two independent totalSupply tracking mechanisms. When management fees are minted via `FeeManagementFacet.mintAllPendingManagementFees`, the fee class `baseInfo[feeClassId].totalSupply` is incremented at line 203, and `FundTokensFacet.mint()` updates `FundTokens[0].totalSupply[feeDealingId]`. However, the fund-level `baseInfo[fundId].totalSupply` is never updated. The same issue exists in `_processPerformanceFeeBatch` at line 455, and in `_processOrdersImpl` at lines 371-379 where accumulated performance fees are minted to the fund token ID without any `baseInfo[fundId].totalSupply` update.

The fund price is calculated as `nav * PRECISION / baseInfo[fundId].totalSupply`. With a stale (lower) denominator, the fund price is inflated after every fee minting event.

**Impact:**
Systematic fund price inflation that compounds with every NAV cycle. For a fund with 2% annual management fees on 100M NAV, approximately 2M in fee tokens are minted annually without updating fund totalSupply. After one year of daily NAV updates, the fund price is overstated by approximately 2%. Subscribers overpay, redeemers receive excess value, and the manager benefits from inflated fee token value. This creates a positive feedback loop where inflated prices trigger further performance fee minting.

**Recommendation:**
After minting fee tokens, also update fund-level totalSupply:
```solidity
s.FundAdmin[0].baseInfo[fundId].totalSupply += SafeCast.toUint128(totalFeeInFundTokens);
```
Apply the same fix in `_processPerformanceFeeBatch` and in `_processOrdersImpl` after performance fee minting.

**Reference:** Economic invariant violation (SP-3 VIOLATED per Phase 5)

---

### C-02: FX Validation Bypass via actualFxRate=0 Combined with Disabled Default Safety Config

**Source:** A5-05, A5-09, A2-05
**Location:** `SettlementFacet.sol:L86-L92`, `FXManagementFacet.sol:L224-L225`

**Description:**
Three compounding issues create a complete FX safety bypass:
1. Default `FXSafetyConfig` has `maxFxSettlementDeviationBps = 0` and `maxFxRateChangeBps = 0`, disabling all FX safety checks by default (no admin action needed to reach this state).
2. When `actualFxRate = 0`, `effectiveFxRate` resolves to `PRECISION` (1e18) at line 86. The validation check at line 90 (`if (effectiveFxRate != PRECISION)`) is false, so `_validateSettlementFxRate` is never called -- even for cross-currency settlements.
3. The FX rate validation in order processing (`OrderManagementFacet.sol:L504-510`) calls `getFXRate` but discards the return value, and validates deviation against the class currency's USD rate rather than the actual cross-rate.

A settlement operator can force 1:1 exchange rates on any cross-currency settlement by passing `actualFxRate = 0`.

**Impact:**
For EUR/GBP settlements where the real rate is approximately 0.86, the value extraction is approximately 14% per settlement. For USD/JPY, approximately 99.3%. A single cross-currency settlement of 10M EUR at a forced 1:1 rate extracts approximately 1.4M in value.

**Recommendation:**
1. Always call `_validateSettlementFxRate` regardless of effectiveFxRate value.
2. If `sourceCurrency != targetCurrency` and `effectiveFxRate == PRECISION`, revert.
3. Set non-zero FX safety config defaults at diamond initialization.
4. Fix the discarded return value in order processing FX validation.

**Reference:** SWC-105, XF-02

---

### C-03: Performance Fee BPS Caller-Supplied Up to 100% Without Enforcement of Safety Cap

**Source:** A2-02
**Location:** `OrderManagementFacet.sol:L429`

**Description:**
The `perfFeeBps` for each order is supplied by the admin in the `OrderToProcess` struct. Validation at line 429 only checks `perfFeeBps > BPS_DENOMINATOR` (10000), allowing any value from 0 to 10000 (0% to 100%). The `MAX_ADJUSTED_FEE_RATE_BPS` constant (2000 = 20%) defined in `Constants.sol:86` is never enforced during order processing. A 100% performance fee would confiscate the entire redemption value.

**Impact:**
A malicious or compromised admin can set performance fees up to 100% on any redemption order, confiscating investor funds. Combined with force redemption (C-04), this enables complete fund drain in a single dealing cycle.

**Recommendation:**
Validate `perfFeeBps` against the on-chain `MAX_ADJUSTED_FEE_RATE_BPS` constant:
```solidity
if (orderToProcess.perfFeeBps > Constants.MAX_ADJUSTED_FEE_RATE_BPS) 
    revert InvalidPerformanceFee(orderToProcess.perfFeeBps);
```

**Reference:** SWC-105, XF-03

---

### C-04: Force Redemption Has No Lifecycle, Lock Period, or Rate-Limiting Restrictions

**Source:** A3-02
**Location:** `FundLifecycleFacet.sol:L482-L516`

**Description:**
The `forceSubmitRedemptionOrder` function allows a fund manager to force-redeem all tokens from any investor in any dealing within their fund at any time. `validateForceRedemption` (L128-L136) only checks that the investor has a non-zero balance. There are no checks for: fund lifecycle state (works on CLOSED funds), lock period, notice period, rate limiting, or frequency caps. The forced redemption order has `isForcedRedemption = true`, preventing investor cancellation.

**Impact:**
A malicious fund manager can drain all investor holdings across all dealing periods in their fund, bypassing lock periods and investor protections. Combined with C-03 (uncapped performance fees), the manager can extract 100% of investor value through forced redemption at maximum fee rate.

**Recommendation:**
1. Add lock period checking for forced redemptions.
2. Add lifecycle state restrictions (require fund is at least ACTIVE for manager-initiated).
3. Consider requiring ROLE_ADMIN for forced redemptions rather than ROLE_MANAGER.
4. Add a mandatory delay between forced redemption submission and processing.

**Reference:** SWC-105, XF-03

---

### C-05: setDealingSchedule Accepts Arbitrary Timestamps Without Any Validation

**Source:** A3-01
**Location:** `FundManagementFacet.sol:L813-L844`

**Description:**
The `executeSetDealingSchedule` function accepts an arbitrary array of `uint32` timestamps and writes them directly to storage without any validation. There is no check that timestamps are in the future, monotonically ordered, non-zero, non-overlapping with active dealing periods, or bounded in array length. Past timestamps cause the dealing state machine to immediately enter PROCESSING state. Duplicate timestamps enable double processing. Unsorted timestamps cause silent dealing skips.

**Impact:**
Setting past timestamps combined with a large order batch that exceeds gas limits creates a permanent fund freeze (the PROCESSING state cannot be exited because `nextDealingTimestamps.pop()` never executes). In this state, no orders can be cancelled, no NAV updates can occur, and all investor tokens are locked.

**Recommendation:**
Add comprehensive validation: all timestamps must be > `block.timestamp`, strictly monotonically sorted, non-zero, no duplicates, and array length bounded (e.g., max 365).

**Reference:** SWC-116, SWC-128, XF-04

---

### C-06: Unbounded Order Processing Loop Enables Gas DoS and Fund State Lock

**Source:** A2-01
**Location:** `OrderManagementFacet.sol:L270-L351`

**Description:**
The `_processOrdersImpl` function iterates twice over `ordersToProcess` with no upper bound on the array length. Each iteration performs multiple cross-facet delegatecalls and storage writes. If a `processOrders` call exceeds the block gas limit, the dealing state remains PROCESSING (the `nextDealingTimestamps.pop()` at line 380 never executes). In PROCESSING state, orders cannot be cancelled, NAV cannot be updated, and the fund is frozen until a smaller batch succeeds.

**Impact:**
The fund is effectively frozen until a smaller batch succeeds. All pending orders are stuck and locked tokens cannot be unlocked. An admin submitting a very large batch could accidentally trigger this state.

**Recommendation:**
Add a maximum batch size constant:
```solidity
uint256 constant MAX_ORDERS_PER_BATCH = 50;
if (ordersToProcess.length > MAX_ORDERS_PER_BATCH) revert BatchTooLarge();
```

**Reference:** SWC-128 (DoS With Block Gas Limit), XF-04

---

### C-07: Management Fee Division-by-Zero When Class totalSupply Is Zero

**Source:** A4-01, A4-02
**Location:** `FeeManagementFacet.sol:L180-L184, L396-L401`

**Description:**
In `mintAllPendingManagementFees`, the dilution ratio update at line 182 computes `Math.mulDiv(oldDilutionRatio, newTotalSupply, oldTotalSupply)`. If `oldTotalSupply` is zero, this reverts with division-by-zero. While the current call flow guards against this for management fees (zero totalSupply returns zero fee, skipping the update), the same pattern in `_processPerformanceFeeBatch` at line 399 lacks this protection. A performance fee batch that includes a dealing with totalSupply = 0 causes the entire batch to revert.

**Impact:**
A single dealing with zero totalSupply in a performance fee batch blocks performance fee collection for all dealings in all classes. A malicious manager could include one empty dealing in every batch to block all fee collection indefinitely.

**Recommendation:**
Add zero-supply guards before dilution calculations:
```solidity
if (oldTotalSupply == 0) {
    if (feeAmount > 0) revert ISharedErrors.AmountZero();
    continue;
}
```

---

## HIGH Findings

### H-01: NAV Update Processing Order Causes Stale Price Cascade

**Source:** A4-05, A4-06
**Location:** `NavManagementFacet.sol:L231-L250`

**Description:**
In `_updateNavInternal`, the processing order is: (1) process pending adjustments, (2) mint management fees, (3) store new NAV. Steps 1 and 2 read `calculateFundPrice(fundId)` from storage, which contains the old NAV. Adjustments and fees are calculated against stale price data. The `maxAdjBps` safety check compares adjustment amounts against class values calculated from the old fund price.

**Impact:**
The maxAdjustmentBps safety check operates on stale price data, allowing adjustments that exceed configured limits (or rejecting valid adjustments). Management fee amounts are systematically miscalculated due to inconsistent price data between fund price and class prices.

**Recommendation:**
Store the new NAV before processing adjustments and fees, or pass the new NAV as a parameter for all internal calculations.

**Reference:** XF-01

---

### H-02: Management Fee Rate Not Validated Against Protocol Safety maxMgmtFeeRateBps

**Source:** A4-04, TOB-05
**Location:** `FeeManagementFacet.sol:L346-L370`, `NavManagementFacet.sol:L189-L210`

**Description:**
The `ProtocolSafetyConfig` struct includes `maxMgmtFeeRateBps`, stored via `setProtocolSafetyConfig`. However, this limit is only stored -- it is never checked when management fees are calculated and minted, nor when class fee rates are set before the safety config is configured. A class created with a high fee rate before the safety config is set, or before the config is lowered, continues minting at the uncapped rate.

**Impact:**
A fund manager can set arbitrarily high management fee rates, extracting excessive value from investors. The protocol safety mechanism for capping management fees is completely ineffective.

**Recommendation:**
Add a runtime check in `_calculateManagementFee` that caps the effective rate at `maxMgmtFeeRateBps`.

**Reference:** SWC-105, XF-03

---

### H-03: Reactivating CLOSED Fund Bypasses Umbrella and Currency Safety Checks

**Source:** A3-03, A3-13
**Location:** `FundLifecycleFacet.sol:L48-L52, L64-L86`

**Description:**
The `validateFundStatusTransition` function allows CLOSED -> ACTIVE transition without verifying: (1) the parent umbrella is ACTIVE, (2) the fund's reporting currency is still active in the umbrella, (3) any class states are valid. Similarly, class reactivation does not check parent fund status. A CLOSED fund can be reactivated under a RETIRED or CLOSED umbrella.

**Impact:**
Reactivated "ghost" funds operate outside the intended lifecycle hierarchy, accepting orders with stale pricing, minting/burning tokens, and processing dealings without proper umbrella-level oversight.

**Recommendation:**
When reactivating to ACTIVE, require parent umbrella/fund is also ACTIVE. Reset stale dealing schedules and require fresh NAV update.

**Reference:** XF-08

---

### H-04: Swap Order Cancel Does Not Cancel the Linked Order

**Source:** A2-07, A2-03
**Location:** `OrderManagementFacet.sol:L185-L196`

**Description:**
When cancelling one side of a swap, lines 185-196 only clear the dependency links on the linked order, orphaning it. For the subscribe side (initially amount=0), this creates a PENDING order with amount 0 that can never be processed or cancelled. Tokens locked for the cancelled side remain locked permanently.

**Impact:**
Investor tokens are permanently locked on-chain with no recovery mechanism. In institutional fund administration, locked tokens represent inaccessible client assets.

**Recommendation:**
When cancelling a swap order, automatically cancel the linked order if PENDING. Add a recovery function for locked cash tokens on orphaned orders.

**Reference:** XF-07

---

### H-05: FX Rate Staleness Not Checked at Settlement or Query Time

**Source:** A5-03
**Location:** `SettlementFacet.sol:L118-L153`, `FXManagementFacet.sol:L244-L249`

**Description:**
FX rate staleness is validated at write time in `executeUpdateFXRates` (rate timestamp must be within `DEFAULT_MAX_FX_RATE_AGE`). But once stored, rates can sit in storage indefinitely. `getFXRate()` and `_getRateVsUSD()` only check the stored rate is non-zero, not its age. Settlements validated against rates that are days or weeks old.

**Impact:**
Stale rate arbitrage: settlement operator can use outdated reference rates to extract the FX differential. For EUR/USD moving from 1.10 to 1.20, a 10M EUR settlement extracts approximately 833K USD.

**Recommendation:**
Add a staleness check in `_getRateVsUSD()` comparing `block.timestamp - data.timestamp` against `DEFAULT_MAX_FX_RATE_AGE`.

**Reference:** XF-06

---

### H-06: Operator Can Cancel Any Proposal Including Owner-Initiated Ones

**Source:** A1-03
**Location:** `AccountFacet.sol:L800-L826`

**Description:**
The `cancelProposal` function allows any wallet with OPERATOR permission on an account to cancel any proposal for that account, including proposals initiated by the account owner or other operators. A single malicious operator can grief the system by repeatedly cancelling all pending proposals, including the `removeOperator` proposal to remove themselves.

**Impact:**
A single compromised operator can permanently block all operations for their account (including fund management, NAV updates, or settlements if the account holds those roles).

**Recommendation:**
Restrict `cancelProposal` to the proposal's original proposer or the account owner. Give the owner an unconditional ability to remove operators without going through the proposal system.

**Reference:** XF-10

---

### H-07: Deterministic Account Address Uses block.number Leading to Collisions

**Source:** A1-01
**Location:** `AccountFacet.sol:L154-L158`

**Description:**
Account addresses are generated using `keccak256(abi.encodePacked(owner, name, block.number))`. Two calls with the same `owner` and `name` in the same block produce the same address. The `AccountAlreadyExists` check prevents overwriting but causes the second transaction to revert (DoS). Account addresses cannot be reliably pre-computed off-chain.

**Impact:**
Denial of service on account creation when two admins create accounts for the same owner in the same block. Account addresses are unpredictable before transaction inclusion.

**Recommendation:**
Use a monotonically increasing counter instead of `block.number`.

**Reference:** SWC-120

---

### H-08: Nested internalExecutionContext Flag Is Boolean, Not Counter (Structurally Fragile)

**Source:** A1-02, ARCH-03
**Location:** `BaseFacet.sol:L151-L153`

**Description:**
The `internalExecutionContext` flag is a boolean set/cleared around delegatecalls. The reentrancy lock in `_executeProposal` prevents recursive proposal execution today, but the design is structurally unsound: if any future code path results in nested `_validateAndPropose` calls, the inner cleanup clears the flag while the outer execution still expects it to be true.

**Impact:**
Not currently exploitable due to reentrancy guard, but any future code addition involving nested proposals would break the invariant silently.

**Recommendation:**
Replace the boolean with a `uint256` counter that increments on entry and decrements on exit.

---

### H-09: cancelPendingSubscribes Blocked When Fund Is in PROCESSING State

**Source:** A3-04
**Location:** `FundLifecycleFacet.sol:L638`

**Description:**
`_cancelPendingSubscribesInternal` calls `executeCancelOrder` which validates via `validateOrderCancellation`, which checks `dealingProcessState(fundId)`. If the fund is in PROCESSING state, all cancels revert -- even though the fund may be RETIRED/CLOSED and the intent is to bulk-cancel for lifecycle management.

**Impact:**
Batch cancel of pending subscribes is blocked if the dealing process state is PROCESSING. A NAV update putting the fund into PROCESSING state creates a DoS on manager-initiated bulk cancels.

**Recommendation:**
Create a dedicated internal cancel path that bypasses the dealing-in-progress check for manager-initiated bulk cancels on non-ACTIVE funds.

---

### H-10: First Dealing createdAt = 0 Makes It Indistinguishable from Non-Existent

**Source:** A3-06
**Location:** `FundManagementFacet.sol:L329-L353`

**Description:**
The first dealing created during `_createFundInternal` uses `navUpdatedAt` (which is 0 for a new fund) as `createdAt` in `baseInfo`. Any code path that checks `baseInfo[dealingId].createdAt == 0` to determine existence would incorrectly conclude this dealing does not exist. This is a latent vulnerability that could be triggered by future code additions.

**Impact:**
The first dealing of every fund has `createdAt == 0`, making it indistinguishable from non-existent entities in existence checks. Combined with A4-16 (fee loop iterating to non-existent class), this can poison future class creation.

**Recommendation:**
Use `block.timestamp` for `createdAt` when `navUpdatedAt` is 0.

---

### H-11: batchConvertDealingTokens Can Burn Tokens with Zero Output

**Source:** A3-07
**Location:** `FundManagementFacet.sol:L791-L802`

**Description:**
The dealing token conversion performs two sequential `Math.mulDiv` operations with compounding rounding losses. There is no minimum output check -- if `fromPrice` is very small or `toPrice` is very large, `convertedAmount` can be 0 even for non-zero `tokenAmount`. The function checks `if (tokenAmount == 0) continue` but not `if (convertedAmount == 0)`, so an investor's tokens are burned with zero tokens minted in return.

**Impact:**
Investors can lose their entire token holdings with zero compensation during dealing conversion.

**Recommendation:**
Revert if `convertedAmount == 0` and `tokenAmount > 0`. Consider using a single `Math.mulDiv(tokenAmount, fromPrice, toPrice)`.

**Reference:** XF-18

---

### H-12: No Fund Existence Validation on executeSetDealingSchedule and executeSetMaxCapacity

**Source:** A3-05
**Location:** `FundManagementFacet.sol:L834-L844, L874-L881`

**Description:**
Both execute functions write to `s.FundAdmin[0].funds[fundId]` without validating fund existence or lifecycle status. Configuration can be written to non-existent or CLOSED fund storage slots in the multisig flow where the fund state may change between proposal and execution.

**Impact:**
Phantom state written to non-existent fund storage. A dealing schedule can be set on a CLOSED fund.

**Recommendation:**
Add `_requireFundExists(fundId)` and fund status checks in both execute functions.

---

### H-13: Performance Fee MaxFee Validation Uses Inconsistent State

**Source:** A4-08
**Location:** `FeeManagementFacet.sol:L396-L418`

**Description:**
In `_processPerformanceFeeBatch`, the dilution ratio is updated first (lines 396-401), then the max fee validation at lines 414-418 uses `dealingPrice` calculated from the post-dilution ratio but `totalSupply` from the pre-mint state. This inconsistency makes the safety check either too strict or too lenient.

**Impact:**
Could block legitimate performance fee collection or allow slightly excessive fees.

**Recommendation:**
Calculate `dealingPrice` and `maxFee` before updating the dilution ratio.

---

### H-14: Audit Trail int128 Overflow in _feeToEntry

**Source:** A4-09
**Location:** `ClassAdjustmentFacet.sol:L412-L421`

**Description:**
The cast `int128(int256(uint256(fee.amount)))` overflows if `fee.amount` (uint128) exceeds `type(int128).max`. With PRECISION = 1e18, this corresponds to approximately 1.7e20 fund tokens in fees. Additionally, the function uses a hardcoded `HEDGE` label for management fee entries, which is semantically incorrect.

**Impact:**
Silent corruption of audit trail amount fields for large fee amounts. Incorrect labels compromise compliance reporting.

**Recommendation:**
Use `SafeCast.toInt128` and a dedicated `MANAGEMENT_FEE` label.

---

### H-15: ERC1155 Callback Reentrancy During Settlement with Partial Mitigation

**Source:** A5-04, ARCH-04
**Location:** `SettlementFacet.sol:L180-L183`, `FundTokensFacet.sol:L452`

**Description:**
Settlement operations call `FundTokensFacet.mint()` which triggers `_checkOnERC1155Received()` on contract recipients. The reentrancy lock in `_executeProposal` protects the proposal path, but the `reentrancyLock` field is only used in `AccountFacet._executeProposal`. The 15 reentrancy paths flagged by Slither (SL-M-01 through SL-M-13) are not protected. Direct ERC1155 operations (`safeTransferFrom`, `setApprovalForAll`) during a callback would succeed.

**Impact:**
On a private blockchain with controlled contract deployment, risk is mitigated. On any future public deployment, this would be exploitable.

**Recommendation:**
Use `_update` (without acceptance check) for internal settlement operations where the recipient is a known account address.

**Reference:** SWC-107, XF-11

---

### H-16: Off-by-One in _hasAnyDealingBalance Causes Zero Investor Counts

**Source:** A6-01
**Location:** `ManagerViewCallsFacet.sol:L358`

**Description:**
The loop uses `classNum < nextClassId` instead of `classNum <= nextClassId`. For a fund with one user class (nextClassId=2, FIRST_USER_CLASS_ID=2), the loop never executes. The last class is always skipped.

**Impact:**
`getFundInvestorCount`, `getFundInvestorCountPaginated`, and fund summaries all report zero investors for funds with one user class (the most common case).

**Recommendation:**
Change loop condition to `<=`.

---

### H-17: totalPendingOrders Counts All Orders, Not Just Pending

**Source:** A6-02
**Location:** `AdminViewCallsFacet.sol:L59,L115`, `ManagerViewCallsFacet.sol:L376-L378`

**Description:**
`_getOrderBookSize` returns `tail - 1`, which is the total number of orders ever created (including FILLED, CANCELLED). This value is assigned to `totalPendingOrders` and `pendingOrderCount`.

**Impact:**
Admin and manager dashboards display grossly inflated "pending order" counts. A fund with 1000 processed orders and 5 pending shows 1000.

**Recommendation:**
Iterate orders to count only PENDING status, or maintain a separate counter.

---

### H-18: No Access Control on Admin and Manager View Functions

**Source:** A6-03, ARCH-05
**Location:** `AdminViewCallsFacet.sol`, `ManagerViewCallsFacet.sol` (all external functions)

**Description:**
Despite their names, these facets have no access control on view functions. Any address with RPC access can call `getSystemOverview()`, `getRoleAssignments()`, `getAllAccounts()`, `getAccountSummary()`, `getManagedFundSummaries()`, and `getClassPerformance()`.

**Impact:**
Complete enumeration of governance structure, participant identity, and financial metrics by any party with RPC access. Enables targeted social engineering of admin/NAV updater/settlement operator wallets.

**Recommendation:**
Add role-based access control to sensitive view functions.

**Reference:** XF-12

---

### H-19: Management Fee Timestamp Advance on Non-Existent Class Poisons Future Classes

**Source:** A4-16, combined with A3-06 via XF-16
**Location:** `FeeManagementFacet.sol:L165`

**Description:**
The fee loop `for (uint16 i = 2; i <= nextClassId; i++)` iterates through non-existent class IDs (should be `< nextClassId`). For non-existent classes, `lastMgmtFeeMintTs` is written to storage at line 173. When that class ID is later created, it inherits a pre-written timestamp, truncating or corrupting its initial fee collection period.

**Impact:**
Fee collection for newly created classes is silently corrupted. The manager either loses fees or the system skips the initial fee-free grace period.

**Recommendation:**
Change loop bound to `i < nextClassId`. Verify class existence before writing to storage.

**Reference:** XF-16

---

## MEDIUM Findings

### M-01: Any Facet Can Mint/Burn Tokens via Diamond Trust Model

**Source:** ARCH-02
**Location:** `FundTokensFacet.sol:L51-L54`

**Description:**
The `onlyFundAdmin` modifier checks `_msgSender() != s.FundTokens[0].fundAdmin`. For cross-facet calls, `msg.sender` is `address(this)` (the Diamond proxy). Since `fundAdmin` is set to `address(this)`, any facet can call mint/burn/lock/unlock. No per-facet authorization exists.

**Impact:**
A compromised or buggy facet could mint unlimited tokens. The Diamond proxy's trust model relies on ALL facets being correct.

---

### M-02: No Account Deletion or Owner Transfer Mechanism

**Source:** A1-04
**Location:** `AccountFacet.sol` (entire file)

**Description:**
No function exists to transfer account ownership or deactivate an account. If an owner's private key is compromised, there is no recovery path within the contract.

**Impact:**
Lost or compromised owner keys permanently lock the account with no recovery mechanism.

---

### M-03: ROLE_USER = bytes32(0) Bypasses Role Checks with No Per-Account Freeze

**Source:** A1-05
**Location:** `BaseFacet.sol:L47, L134-L140`

**Description:**
`ROLE_USER` is `bytes32(0)`, meaning the role check is completely skipped for user-level operations. There is no mechanism to freeze or suspend a flagged account from performing user-level actions (order submission, token transfers).

**Impact:**
No granular per-account action blocking. A flagged account can continue submitting orders.

---

### M-04: setMultisigConfig Does Not Validate Threshold Against Operator Count

**Source:** A1-06
**Location:** `AccountFacet.sol:L527-L540`

**Description:**
The threshold can be set higher than the number of operators, making it impossible for operator-initiated proposals to meet the threshold.

**Impact:**
If the owner becomes unavailable after setting an unreachable threshold, operator-initiated proposals are permanently stuck.

---

### M-05: Eligibility TOCTOU Between Submission and Multisig Execution

**Source:** A1-07
**Location:** `OrderManagementFacet.sol:L73-L81`

**Description:**
Eligibility is checked at submission and re-checked at processing (line 311). The gap between submission and processing allows an order to exist as PENDING even if eligibility is revoked. This is mitigated by the re-check at processing time.

**Impact:**
Low in practice due to processing-time re-check. Design trade-off, not a vulnerability.

---

### M-06: Unbounded Growth of accountPendingProposals Array

**Source:** A1-08
**Location:** `AccountFacet.sol:L718, L1009-L1018`

**Description:**
The `accountPendingProposals` array grows unboundedly. `_removeProposalFromAccountPendingList` performs linear scan. `getPendingProposals` performs nested iteration over all accounts and proposals.

**Impact:**
Accumulated unresolved proposals create increasing gas costs. In extreme cases, operations could hit gas limits.

---

### M-07: Rounding Direction in Redeem Amount Calculation Favors Redeemer

**Source:** A2-08
**Location:** `OrderManagementFacet.sol:L456-L457`

**Description:**
Redemption `amountToProcess` uses `Math.mulDiv` with round-down, meaning fewer tokens are burned, systematically favoring the redeemer at the expense of NAV accuracy.

**Impact:**
Over thousands of orders, small rounding errors accumulate, impacting institutional accounting accuracy.

---

### M-08: Stale NAV Risk -- No Maximum Age Check at Processing Time

**Source:** A2-13
**Location:** `OrderManagementFacet.sol:L257`

**Description:**
No check that NAV is "fresh" at processing time. If an admin waits days after NAV update before calling `processOrders`, orders execute with stale prices.

**Impact:**
Orders processed with significantly outdated prices, advantaging or disadvantaging investors.

---

### M-09: totalNavChange Can Overflow int128 Range

**Source:** A2-14
**Location:** `OrderManagementFacet.sol:L341`

**Description:**
Individual `navChange` values are bounded by SafeCast, but the sum of many nav changes is accumulated in unchecked addition that could overflow int128 for very large batches.

**Impact:**
Large batches impossible to process, creating a DoS for high-value funds.

---

### M-10: No Event Emitted for Swap Link Clearing on Cancellation

**Source:** A2-10
**Location:** `OrderManagementFacet.sol:L185-L196`

**Description:**
When swap dependencies are cleared during cancellation, no event is emitted for the linked order whose dependency was modified.

**Impact:**
Off-chain monitoring systems cannot detect broken swap linkages.

---

### M-11: Holding Value Calculation Uses Total Balance Including Locked Tokens

**Source:** A2-11
**Location:** `OrderManagementFacet.sol:L975-L993`, `OrderValidationFacet.sol:L274-L291`

**Description:**
`_getClassBalanceValue` uses `balanceOf()` which includes locked tokens. Users can bypass minimum holding limits by submitting multiple overlapping redemption orders that individually pass the check.

**Impact:**
Minimum holding requirements are completely ineffective for overlapping redemptions.

**Reference:** XF-09

---

### M-12: Fund Closure Only Checks Fund-Level totalSupply, Not Class/Dealing Level

**Source:** A3-09
**Location:** `FundLifecycleFacet.sol:L39-L47`

**Description:**
Fund closure checks `baseInfo[fundId].totalSupply` but not individual class or dealing supplies. If fund-level totalSupply gets out of sync (due to rounding or the C-01 divergence), a fund could be closed while investors still hold tokens.

**Impact:**
A fund could be closed while investors still hold tokens in individual dealings.

---

### M-13: Offramp Validation Does Not Check Umbrella Existence

**Source:** A3-10
**Location:** `FundManagementValidationFacet.sol:L87-L95`

**Description:**
`validateOfframp` checks umbrella status but not existence. For a non-existent umbrella, status defaults to `ACTIVE` (enum value 0), so the check passes. Compare with `validateOnramp` which does check existence.

**Impact:**
An offramp could proceed for a cash token belonging to a non-existent umbrella (limited by requiring actual balance).

---

### M-14: setPerformanceFeeCalculator Allows Setting Arbitrary Contract Address

**Source:** A3-11
**Location:** `FundManagementFacet.sol:L958-L999`

**Description:**
Any address can be set as the performance fee calculator, including EOAs or malicious contracts. No validation that the address implements the expected interface.

**Impact:**
A compromised manager could set a malicious calculator reporting inflated fees, or an EOA causing all fee calculations to revert.

---

### M-15: NAV Safety Check Bypassed on First NAV Update

**Source:** A4-10
**Location:** `NavManagementFacet.sol:L52-L64`

**Description:**
When `currentNav == 0` (first update), the NAV change safety check is completely bypassed. The first update can set any arbitrary value.

**Impact:**
The first NAV update for any fund bypasses all safety limits, setting the baseline for all subsequent checks.

---

### M-16: Management Fee targetFeeValue >= classNav Returns Zero Instead of Capping

**Source:** A4-14
**Location:** `FeeManagementFacet.sol:L362-L366`

**Description:**
When `targetFeeValue >= classNav` (fee exceeds NAV, possible with long-deferred minting), the function returns 0 instead of capping at a maximum. This means extremely delinquent fee collection results in zero fees rather than maximum fees.

**Impact:**
Exploitable discontinuity: if management fee minting is delayed long enough, fees flip from large to zero.

---

### M-17: Fee Class Dilution Ratio Never Updated When Fee Tokens Are Minted

**Source:** TOB-04
**Location:** `FeeManagementFacet.sol:L199-L204`

**Description:**
When management and performance fee tokens are minted to the fee class, `baseInfo[feeClassId].totalSupply` is updated but `baseInfo[feeClassId].dilutionRatio` is not. The fee class price used in the class-to-fund token conversion gradually diverges from its true value.

**Impact:**
Growing error in management fee conversion ratio, compounding over many NAV updates.

---

### M-18: Class Dilution Floor of 1 Allows Price Explosion

**Source:** TOB-02, A4-17
**Location:** `NavManagementFacet.sol:L416`

**Description:**
The class dilution floor is 1 (vs. `MIN_FUND_DILUTION_RATIO = 0.01e18` for funds). A class dilution of 1 means `classPrice = adjustedFundPrice * 1e18`, producing astronomically large prices. This can be reached through a large gain adjustment if `maxAdjustmentBps` is not configured (default = 0 = no limit).

**Impact:**
If reached, breaks all class-related calculations (management fees, order processing, portfolio valuation).

**Recommendation:**
Use `MIN_FUND_DILUTION_RATIO` as the floor for class dilution as well.

---

### M-19: Precision Loss in Multi-Step Price Calculation Chain

**Source:** A4-12
**Location:** `NavManagementFacet.sol:L444-L514`

**Description:**
The price calculation chain involves four sequential `Math.mulDiv` divisions (fund price, adjusted fund price, class price, dealing price). Each rounds down. Cumulative error is up to 4 wei per calculation, systematically underpricing.

**Impact:**
Consistent round-down bias across all 4 steps creates systematic underpricing that, over thousands of NAV cycles, could accumulate to material amounts for very large funds.

---

### M-20: calculateClassPriceInDenomination Reverts If FX Rate Not Set

**Source:** A4-13
**Location:** `NavManagementFacet.sol:L484-L499`

**Description:**
If an FX rate for a class's denomination currency is not set, the function reverts. Multi-currency classes become non-functional with no graceful degradation.

**Impact:**
All operations depending on class price fail until FX rates are configured.

---

### M-21: Settlement FX Validation Bypass Via Same-Currency Rate

**Source:** A5-09
**Location:** `SettlementFacet.sol:L86-L92`

**Description:**
Covered as part of C-02. The settlement operator can bypass FX validation by passing `actualFxRate = 0` for cross-currency settlements (separate from the default-disabled safety config).

---

### M-22: Unbounded Transfer History Array Growth

**Source:** A5-07
**Location:** `FundTokensFacet.sol:L597-L617`

**Description:**
Every mint, burn, and transfer appends to the global `transfers` array and per-user-per-token `userTokenTransferIndices`. These never shrink.

**Impact:**
View functions iterating transfer indices become increasingly expensive and eventually exceed gas limits.

---

### M-23: Hierarchical Holdings Never Pruned

**Source:** A5-10
**Location:** `FundTokensFacet.sol:L700-L716`

**Description:**
Holdings entries are never removed when balance reaches zero (by design for historical tracking). The `_filterZeroBalanceTokens` function double-iterates the full array.

**Impact:**
Progressive gas degradation for users with many historical dealings.

---

### M-24: Pagination Overflow in View Functions Silently Returns Zero Results

**Source:** A6-04
**Location:** `ManagerViewCallsFacet.sol:L339,L246`

**Description:**
`offset + limit` can overflow when `offset > 0` and `limit = type(uint256).max`, wrapping to a small value and causing the loop to skip all entries.

**Impact:**
Paginated queries with large limits silently return empty results.

---

### M-25: getPortfolioEvents Reverts on Unmatched or Same-Block Multi-Operation Transfers

**Source:** A6-05, A6-10
**Location:** `ViewCalls2Facet.sol:L584, L501-L564`

**Description:**
Portfolio event reconstruction reverts with `UnmatchedTransfer` if any transfer does not match known patterns (subscribe, redeem, onramp, offramp, transfer). Adjacent-pair matching fails when multiple operations occur in the same block, permanently breaking portfolio history for affected accounts.

**Impact:**
Permanently broken portfolio history for accounts with multi-operation blocks. Compliance concern for institutional clients.

**Reference:** XF-14

---

### M-26: totalAUM in SystemOverview Sums NAVs Across Different Currencies

**Source:** A6-11
**Location:** `AdminViewCallsFacet.sol:L55`

**Description:**
`totalAUM` sums `fund.nav` across all funds without currency conversion. A fund with NAV=100M EUR and a fund with NAV=50M USD shows totalAUM=150M, a meaningless number.

**Impact:**
Incorrect system-wide AUM metric in multi-currency deployments.

---

## LOW Findings

### L-01: removeOperator Confirmation Cleanup Is Correct (Verified)

**Source:** A1-09
**Location:** `AccountFacet.sol:L402-L455`
**Description:** The H-01 fix correctly handles confirmation cleanup. No exploitable vulnerability.

### L-02: Account Address Collision Risk with Hash Truncation (Theoretical)

**Source:** A1-10
**Location:** `AccountFacet.sol:L154-L158`
**Description:** Birthday paradox collision at approximately 2^80 accounts. Not exploitable with bounded private chain accounts.

### L-03: canExecuteFunction View Function May Return Misleading Results

**Source:** A1-11
**Location:** `AccountFacet.sol:L486-L507`
**Description:** View function returns misleading results when `funcPerm.enabled` is true with `maxAmount = 0` (means "unlimited").

### L-04: Missing Distinct Event for Diamond Owner Bootstrap Account Creation

**Source:** A1-12
**Location:** `AccountFacet.sol:L104-L125`
**Description:** Bootstrap account creation bypasses proposal system, creating inconsistent audit trail.

### L-05: EligibilityFacet Uses External this. Calls Creating Unnecessary Gas Overhead

**Source:** A1-13
**Location:** `EligibilityFacet.sol:L58-L63, L170, L209`
**Description:** Same-facet calls routed through Diamond proxy unnecessarily.

### L-06: No Validation That setAccountManager Target Has Appropriate Type

**Source:** A1-14
**Location:** `AccountFacet.sol:L964-L976`
**Description:** Any account type can be set as fund manager. Semantic inconsistency only.

### L-07: Order Cancel Does Not Check Dealing Lock Period

**Source:** A2-15
**Location:** `OrderValidationFacet.sol:L69-L85`
**Description:** Cancelling and re-submitting could circumvent time-based restrictions if lock period changes.

### L-08: _hasUmbrellaBalance Iterates All User Holdings

**Source:** A2-16
**Location:** `OrderManagementFacet.sol:L724-L735`
**Description:** O(n) in total holdings count, called within the processing loop.

### L-09: Missing Zero-Price Check After calculateFundPrice

**Source:** A2-17
**Location:** `OrderManagementFacet.sol:L257`
**Description:** If NAV is 0 with outstanding supply, order processing would revert with opaque math error.

### L-10: Forced Redemption Bypasses Class Rules Validation

**Source:** A2-18
**Location:** `FundLifecycleFacet.sol:L522-L569`
**Description:** Forced partial redemptions may fail if they violate class minimumHoldingAmount rules.

### L-11: Missing Event for setLockAuthorization

**Source:** A5-13
**Location:** `FundTokensFacet.sol:L283-L285`
**Description:** State change affecting token locking access control is not logged.

### L-12: Operator Approval Enables Blanket Token Transfer

**Source:** A5-15
**Location:** `FundTokensFacet.sol:L191-L202`
**Description:** Standard ERC1155 blanket approval grants authority over all tokens. No per-token granularity.

### L-13: addressZeroHoldings Includes Non-Dealing Tokens

**Source:** A5-16
**Location:** `FundTokensFacet.sol:L623-L638`
**Description:** `getUserHoldingsFromHierarchicalSystem(address(0))` returns stale/misleading data.

### L-14: Missing Event for ProtocolSafetyConfig maxNoticePeriod and maxLockPeriod

**Source:** A4-15
**Location:** `NavManagementFacet.sol:L209`
**Description:** Two safety config parameters set but not included in the emitted event.

### L-15: Cancel Adjustment Swap-and-Pop Changes Processing Order

**Source:** A4-18
**Location:** `ClassAdjustmentFacet.sol:L225-L238`
**Description:** Cancellation reorders pending adjustments queue, causing minor audit trail inconsistency.

### L-16: _buildAccountSummary Only Returns First Managed Fund

**Source:** A6-12
**Location:** `AdminViewCallsFacet.sol:L324-L334`
**Description:** Multi-fund managers only show first fund in account summary.

### L-17: No Bounds Check on Batch Order Index Queries

**Source:** A6-14
**Location:** `ViewCalls2Facet.sol:L329-L331`
**Description:** Out-of-bounds indices return default-initialized structs silently.

### L-18: Potential Overflow with Large mgmtFeeRate in View Fee Calculation

**Source:** A6-15
**Location:** `ManagerViewCallsFacet.sol:L284`
**Description:** `classSupply * mgmtFeeRate * timeElapsed` can overflow uint256 for unreasonable fee rates.

---

## INFORMATIONAL Findings

### I-01: Floating Pragma ^0.8.28

**Source:** A2-21, A3-20
**Location:** All contracts
**Description:** All contracts use `pragma solidity ^0.8.28`. Pin to exact version for production.
**Reference:** SWC-103

### I-02: Supply Dust Tolerance May Accumulate

**Source:** A2-22
**Location:** `OrderManagementFacet.sol:L1206-L1222`
**Description:** Each use of `SUPPLY_DUST_TOLERANCE` absorbs up to 1e8 tokens (1e-10 tokens per occurrence). Negligible individually.

### I-03: executedDealingAmount Parameter in _checkClassRules Is Unused

**Source:** A2-23
**Location:** `OrderManagementFacet.sol:L849`
**Description:** Dead parameter increasing code complexity.

### I-04: Cross-Umbrella Cash Pipeline Counter Not Validated at Processing

**Source:** A2-24
**Location:** `OrderManagementFacet.sol:L1187-L1189`
**Description:** Silent clamping may mask off-chain settlement errors.

### I-05: confirmations Field Uses uint8 Limiting to 255 Confirmers

**Source:** A1-15
**Location:** `LibAppStorage.sol:L266`
**Description:** 255 confirmations exceeds any realistic multisig configuration.

### I-06: Proposal ID Is Predictable

**Source:** A1-16
**Location:** `AccountFacet.sol:L682-L683`
**Description:** Predictable on private chain. Theoretical front-running risk on public chains.

### I-07: executeCreateAccount First Parameter Is Unused

**Source:** A1-17
**Location:** `AccountFacet.sol:L131`
**Description:** Required by proposal system ABI format. No security impact.

### I-08: calculateAdjustedFeeRate Is Placeholder Implementation

**Source:** A4-21
**Location:** `FeeManagementFacet.sol:L467-L517`
**Description:** Performance fee risk adjustment is a placeholder. Always passes through base return.

### I-09: _calcHurdleReturn Always Reverts When hurdleFundNum > 0

**Source:** A4-22
**Location:** `FeeManagementFacet.sol:L273-L279`
**Description:** Safety guard preventing silent hurdle bypass (V4-C10 defense). API consumers should be aware.

### I-10: Fund Price History Arrays Grow Unboundedly

**Source:** A4-24
**Location:** `NavManagementFacet.sol:L244-L247`
**Description:** Acceptable on private chain. Would be DoS vector on public chains.

### I-11: FX Rate maxChangeBps Bypass on First Rate Update

**Source:** A5-17
**Location:** `FXManagementFacet.sol:L78`
**Description:** By design -- first rate must be settable without a reference. Bounded by MAX_FX_RATE_MULTIPLIER.

### I-12: Cash Fund Token Isolation Correctly Enforced by Token ID Encoding

**Source:** A5-18
**Location:** `TokenIdUtils.sol:L88-L90`
**Description:** Confirmed correct. No cross-umbrella token ID collision possible.

### I-13: SafeCast uint32 Overflow Year 2106

**Source:** A5-19
**Location:** `FundTokensFacet.sol:L590-L612`
**Description:** `SafeCast.toUint32(block.timestamp)` will revert in year 2106. No near-term risk.

---

## Cross-Facet Attack Chains (Phase 4)

These chains compose per-facet findings into multi-step attack scenarios. They reference the per-finding IDs above but are listed separately because they demonstrate how individually medium-severity issues compound into high or critical scenarios.

| Chain | Severity | Title | Affected Facets | Compounding Findings |
|-------|----------|-------|----------------|---------------------|
| XF-01 | CRITICAL | NAV Update Price Inconsistency Cascade | NavMgmt, FeeMgmt, ClassAdj | C-01, H-01, A4-06, A5-01 |
| XF-02 | CRITICAL | FX Validation Bypass via actualFxRate=0 + Disabled Safety Config | Settlement, FXMgmt, OrderMgmt | C-02 components |
| XF-03 | CRITICAL | Manager Fund Drain via Force Redemption + Fee Extraction | FundLifecycle, FeeMgmt, OrderMgmt, FundTokens | C-03, C-04, H-02 |
| XF-04 | CRITICAL | Dealing Schedule Manipulation Freezes Fund State Machine | FundMgmt, NavMgmt, OrderMgmt | C-05, C-06 |
| XF-05 | HIGH | Dual totalSupply Divergence Enables Systematic NAV Inflation | FeeMgmt, NavMgmt, OrderMgmt, FundTokens | C-01 propagation |
| XF-06 | HIGH | Stale FX + Stale NAV Enables Value Extraction at Settlement | Settlement, FXMgmt, NavMgmt, OrderMgmt | H-05, M-08 |
| XF-07 | HIGH | Cross-Umbrella Swap Orphaning Locks Investor Tokens Permanently | OrderMgmt, Settlement, FundTokens | H-04 |
| XF-08 | HIGH | CLOSED Fund Reactivation + Stale State Enables Ghost Fund | FundLifecycle, FundMgmt, NavMgmt | H-03 |
| XF-09 | HIGH | Locked Token Double-Counting Bypasses Minimum Holding Limits | OrderMgmt, FundTokens, OrderValidation | M-11, A2-04 |
| XF-10 | HIGH | Operator Proposal Griefing Blocks All Account Operations | AccountFacet | H-06, M-04, M-06 |
| XF-11 | MEDIUM | ERC1155 Callback Reentrancy During Settlement | Settlement, FundTokens | H-15 |
| XF-12 | MEDIUM | View Function Information Leak Enables Social Engineering | AdminViewCalls, ManagerViewCalls | H-18 |
| XF-13 | MEDIUM | Performance Fee Division-by-Zero Blocks Entire Batch | FeeMgmt, FundTokens, NavMgmt | C-07 propagation |
| XF-14 | MEDIUM | Portfolio Event Reconstruction Fails on Multi-Op Blocks | ViewCalls2, FundTokens, Settlement | M-25 |
| XF-15 | MEDIUM | Unbounded Array Growth Compounds Across Facets for Gas DoS | FundTokens, OrderMgmt, FeeMgmt, ViewCalls | M-22, M-06, A6-07, A6-08 |
| XF-16 | HIGH | Mgmt Fee Timestamp on Non-Existent Class Poisons Future Classes | FeeMgmt, FundMgmt, NavMgmt | H-19, H-10 |
| XF-17 | MEDIUM | Adjustment Splitting Bypasses maxAdjustmentBps Safety Check | ClassAdj, NavMgmt | A4-07, A4-11 |
| XF-18 | HIGH | Dealing Token Conversion Rounding + Zero Output Drains Holdings | FundMgmt, FundTokens, NavMgmt | H-11, M-19 |

**Chain severity distribution:** 4 Critical, 8 High, 6 Medium

### Privilege Escalation Summary

| Start Role | Target Capability | Chain | Severity |
|-----------|-------------------|-------|----------|
| ROLE_MANAGER | Drain all investor funds | XF-03 | CRITICAL |
| ROLE_MANAGER | Freeze fund permanently | XF-04 | CRITICAL |
| ROLE_SETTLEMENT | Extract FX differential | XF-02 | CRITICAL |
| ROLE_NAV_UPDATER | Inflate/deflate fund prices | XF-01 | HIGH |
| ROLE_ADMIN | Reactivate dead fund | XF-08 | HIGH |
| ROLE_ADMIN | Bypass fee safety caps | H-02 | HIGH |
| OPERATOR | Block account operations | XF-10 | HIGH |
| ROLE_USER | Bypass holding limits | XF-09 | HIGH |
| RPC access | Enumerate all participants | XF-12 | MEDIUM |

---

## Code Maturity Scorecard (Phase 5)

### Trail of Bits 9-Category Assessment

| # | Category | Score | Key Issue |
|---|----------|-------|-----------|
| 1 | Arithmetic & Precision | 3/4 | Solid Math.mulDiv usage. Precision loss in fee calc (multiply-after-divide). |
| 2 | Auditing & Logging | 3/4 | Good event coverage. Missing events for setLockAuthorization, safety config fields. |
| 3 | Authentication & ACL | 2/4 | Unified _validateAndPropose pattern, but diamond owner is god mode, no account freeze, operator cancel griefing. |
| 4 | Complexity Management | 2/4 | 1,347-line OrderManagementFacet, dual supply tracking, deep cross-facet call chains. |
| 5 | Decentralization & Admin Risk | 1/4 | Single-point diamond owner with no timelock, no multisig, no pause, no governance. |
| 6 | Documentation | 3/4 | Good NatSpec with audit finding references. Missing formal specification. |
| 7 | Front-Running & MEV | 3/4 | Private chain mitigates MEV. Oracle trust (NAV/FX updaters) remains. |
| 8 | Low-Level & Unsafe Ops | 3/4 | Minimal assembly, memory-safe annotations, SafeCast throughout. Boolean internalExecutionContext is fragile. |
| 9 | Testing & Verification | 2/4 | 1,404 tests passing. No fuzz testing for critical arithmetic. No formal verification of dual supply invariant. |
| | **Overall** | **2.4/4.0** | Up from 2.0 in V5. Persistent gaps in decentralization and testing. |

---

## Security Properties

| ID | Property | Status | Key Evidence |
|----|----------|--------|-------------|
| SP-1 | Fund Isolation (cross-umbrella) | HOLDS (with caveats) | Token ID encoding prevents cross-umbrella collision. Weakened by Diamond trust model (any facet can mint). |
| SP-2 | Supply Conservation (ERC1155) | HOLDS | `_update` is single entry point for all balance mutations. Invariant maintained. |
| SP-3 | Dual Supply Consistency | **VIOLATED** | Performance fee minting in `_processOrdersImpl` and fee class minting both update FundTokens.totalSupply without updating baseInfo.totalSupply. |
| SP-4 | Fee Fairness (proportional to rate) | HOLDS (with tolerance) | Formula is economically correct. Safety cap not enforced at runtime. |
| SP-5 | Dilution Floor | HOLDS (fund) / PARTIAL (class) | Fund floor at 0.01e18. Class floor at 1 (effectively zero protection). |
| SP-6 | Permission Integrity | HOLDS (with exceptions) | _validateAndPropose enforces 3 checks. Diamond owner bypass and ERC1155 standard functions are documented exceptions. |
| SP-7 | Price Monotonicity (non-zero) | HOLDS (realistic configs) | Edge case: NAV=1 wei with max supply rounds to 0. Unrealistic parameters required. |
| SP-8 | Order Atomicity | HOLDS | Solidity atomic transactions guarantee all-or-nothing batch processing. |
| SP-9 | Reentrancy Safety | PARTIALLY HOLDS | Proposal execution protected. Direct ERC1155 operations during callbacks are not protected but safe due to check-effects-interactions ordering. |

---

## Gas Optimization Summary (Phase 6)

**Estimated total savings:** 50,000-200,000+ gas per `processOrders` batch call.

| Rank | ID | Finding | Est. Savings/Call | Priority |
|------|------|---------|-------------------|----------|
| 1 | G-01 | Diamond proxy self-calls (12-18 per order, ~3K-5K gas each) | 60,000-180,000 | CRITICAL |
| 2 | G-03 | Repeated price calculations in loops | 40,000-100,000 | HIGH |
| 3 | G-14 | Proposal system overhead (external self-calls for account checks) | 5,000-10,000 | HIGH |
| 4 | G-02 | Redundant validation in propose+execute path (double validation) | 10,000-30,000 | HIGH |
| 5 | G-04 | Storage re-reads of deeply nested mappings in hot loops | 10,000-40,000 | HIGH |
| 6 | G-13 | Double totalSupply call in performance fee batch | 30,000-50,000 | MEDIUM |
| 7 | G-05 | _hasUmbrellaBalance iterates all holdings via external calls | 5,000-50,000 | MEDIUM |
| 8 | G-06 | _getClassBalanceValue external calls per dealing token | 3,000-30,000 | MEDIUM |
| 9 | G-07 | Redundant price recalculation in _handleClassMinimumOnRedeem | 5,000-8,000 | MEDIUM |
| 10 | G-08 | Double iteration in _filterZeroBalanceTokens | 5,000-10,000 | MEDIUM |

Full gas report contains 20 findings across CRITICAL (1), HIGH (4), MEDIUM (7), LOW (6), and INFORMATIONAL (2) categories.

---

## Recommendations Priority Order

### Immediate (Block Deployment -- Must Fix)

1. **Fix fund totalSupply update** after all fee minting paths (C-01, XF-01, XF-05)
2. **Fix FX validation bypass** via actualFxRate=0 and set non-zero safety defaults (C-02, XF-02)
3. **Enforce MAX_ADJUSTED_FEE_RATE_BPS** at order processing time (C-03, XF-03)
4. **Add lifecycle/lock period checks** to force redemption (C-04, XF-03)
5. **Validate dealing schedule** timestamps comprehensively (C-05, XF-04)
6. **Add batch size limit** to processOrders (C-06, XF-04)
7. **Add zero-supply guard** in performance fee batch processing (C-07, XF-13)

### Before Production

8. **Store NAV before processing** adjustments and fees (H-01, XF-01)
9. **Enforce maxMgmtFeeRateBps** at class creation and fee minting time (H-02)
10. **Add lifecycle hierarchy checks** for fund/class reactivation (H-03, XF-08)
11. **Auto-cancel linked swap order** on cancellation (H-04, XF-07)
12. **Add FX rate staleness check** at read time (H-05, XF-06)
13. **Restrict cancelProposal** to proposer/owner (H-06, XF-10)
14. **Replace block.number** in account address generation with counter (H-07)
15. **Replace boolean** internalExecutionContext with uint256 counter (H-08)
16. **Create dedicated bulk cancel path** for lifecycle management (H-09)
17. **Fix first dealing createdAt = 0** (H-10, XF-16)
18. **Add zero-output check** in dealing conversion (H-11, XF-18)
19. **Add fund existence/status checks** in execute functions (H-12)
20. **Fix performance fee maxFee** validation state consistency (H-13)
21. **Use SafeCast in _feeToEntry** and add proper label (H-14)
22. **Fix fee loop bound** to `< nextClassId` (H-19, XF-16)

### Short-Term (Recommended Before Production)

23. **Add access control** to admin/manager view functions (H-18, XF-12)
24. **Fix off-by-one** in _hasAnyDealingBalance (H-16)
25. **Fix totalPendingOrders** count to only PENDING (H-17)
26. **Use available balance** for holding limit calculations (M-11, XF-09)
27. **Add account freeze mechanism** (M-03)
28. **Fix portfolio event matching** for multi-operation blocks (M-25, XF-14)
29. **Add class dilution floor** matching fund-level MIN_FUND_DILUTION_RATIO (M-18)
30. **Update fee class dilution ratio** on fee minting (M-17)
31. **Add storage pagination/pruning** mechanisms (M-22, M-23, XF-15)

### Long-Term (Improve Operational Safety)

32. Add emergency pause mechanism
33. Add timelock on admin functions
34. Add account owner transfer mechanism (M-02)
35. Implement proper rounding direction convention (M-07, M-19)
36. Add NAV staleness check at processing time (M-08)
37. Add fuzz testing for critical arithmetic functions
38. Add formal verification for dual supply invariant (SP-3)
39. Implement gas optimizations (G-01 through G-08 as prioritized)

---

*Report generated by Claude Opus 4.6 Security Auditor -- V6 Consolidated Report*
*7-phase Trail of Bits methodology: Automated Analysis, Architecture Review, Per-Facet Manual Audit (6 agents), Cross-Facet Attack Chain Analysis, Security Property Verification, Gas Optimization*
