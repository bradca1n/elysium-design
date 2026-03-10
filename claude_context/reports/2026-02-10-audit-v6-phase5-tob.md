# Security Audit V6 -- Phase 5: Trail of Bits Methodology

**Date:** 2026-02-10
**Branch:** multiCurrency
**Methodology:** Trail of Bits 9-category maturity scorecard, security property verification, invariant analysis

---

## Section 1: Security Properties

### SP-1: Fund Isolation

**Property:** Tokens in umbrella A are never accessible from umbrella B. Cross-umbrella operations are exclusively mediated by the settlement pipeline with explicit off-chain confirmation.

**Formal statement:** For any account `a`, token `t` with `getUmbrellaId(t) == U1`, and any function call `f` originating from context `U2 != U1`: the balance `balanceOf(a, t)` cannot change unless `f` is `confirmCashFundSettlement` or `_settleSubscribe` / `_settleRedeem`.

**Evidence -- HOLDS with caveats:**
- Token ID encoding in `TokenIdUtils.sol` embeds the umbrella ID in bits 48-63, making it structurally impossible for a token from umbrella 1 to have the same ID as a token from umbrella 2 (confirmed by A5-18 in Phase 3).
- `OrderManagementFacet._resolveCashFundTokenForClass` (line 1322-1332) resolves cash tokens using the token's own umbrella ID, preventing cross-umbrella cash token confusion.
- `SettlementFacet.confirmCashFundSettlement` is the only code path that burns source-umbrella cash and mints target-umbrella cash, and it requires `ROLE_SETTLEMENT` through `_validateAndPropose`.
- **Caveat:** `FundTokensFacet.safeTransferFrom` (line 195-203) uses standard ERC1155 approval -- an approved operator can transfer any token (including dealing tokens) to any address regardless of umbrella. This does not break fund isolation per se (the tokens remain in the same umbrella), but it allows cross-umbrella *ownership* transfer without settlement. The transfer itself checks eligibility (line 409-414) but not umbrella boundaries.
- **Caveat:** `FundTokensFacet.mint` (line 252) is gated only by `onlyFundAdmin` which is `address(this)`. Any facet in the Diamond can mint tokens for any umbrella (ARCH-02 from Phase 2).

**Status:** HOLDS at the token-ID level. Weakened by Diamond trust model (ARCH-02) and unrestricted ERC1155 transfers.

---

### SP-2: Supply Conservation

**Property:** `FundTokensStorage.totalSupply[tokenId] == sum(balances[tokenId][account])` for every `tokenId` at every point in time.

**Formal statement:** After any state transition, `s.FundTokens[0].totalSupply[id]` equals the sum of `s.FundTokens[0].balances[id][addr]` over all addresses `addr`.

**Evidence -- HOLDS:**
- `FundTokensFacet._update` (lines 299-377) is the single entry point for all balance mutations. On mint (from == address(0)), line 341 increments `totalSupply[ids[i]] += value`. On burn (to == address(0)), line 354 decrements `totalSupply[ids[i]] -= value` in unchecked arithmetic with the invariant that `value <= balanceOf(from, id) <= totalSupply(id)`. On transfer, neither total supply nor total supply all changes.
- The unchecked subtraction on line 354 is safe because line 320-323 verifies `fromBalance >= value` before the subtraction, and `value <= fromBalance <= totalSupply(id)` by the global invariant.
- No other code path directly writes to `s.FundTokens[0].totalSupply[id]` or `s.FundTokens[0].balances[id]`.
- The `_update` function is called by `_mint`, `_burn`, `_safeTransferFrom`, and `_safeBatchTransferFrom` -- all through `_updateWithAcceptanceCheck`. No bypass exists.

**Status:** HOLDS. The ERC1155 implementation correctly maintains this invariant.

---

### SP-3: Dual Supply Consistency

**Property:** `FundTokensStorage.totalSupply[id] == FundAdminStorage.baseInfo[id].totalSupply` for every fund, class, and dealing token ID.

**Formal statement:** For any token ID `id` where `id` represents a fund, class, or dealing token: `s.FundTokens[0].totalSupply[id] == s.FundAdmin[0].baseInfo[id].totalSupply`.

**Evidence -- VIOLATED:**
This is the system's most fragile invariant, as identified by A5-01 (Phase 3, CRITICAL).

*Where consistency is maintained:*
- `OrderManagementFacet._executeOrderTransfer` (lines 1170-1223): Subscribe path mints dealing tokens via `FundTokensFacet.mint` (updates `FundTokens.totalSupply`) AND increments `baseInfo[classId].totalSupply` and `baseInfo[fundId].totalSupply` (lines 1179-1184). Redeem path burns dealing tokens AND decrements `baseInfo` (lines 1206-1222). These are consistent.
- `FeeManagementFacet.mintAllPendingManagementFees` (lines 158-205): Mints fee tokens to dealing 1 of class 1 AND updates `baseInfo[feeClassId].totalSupply` (line 203). Consistent.
- `FeeManagementFacet._processPerformanceFeeBatch` (lines 378-457): Updates dealing dilution, decrements class `baseInfo.totalSupply` (line 445), mints to fee class AND updates `baseInfo[feeClassId].totalSupply` (line 455). Consistent.

*Where consistency breaks:*
- `OrderManagementFacet._processOrdersImpl` (lines 371-379): Mints performance fee tokens to manager via `FundTokensFacet.mint(manager, fundId, totalPerfFeeAmount)`. This mints to the **fund** token ID. `FundTokens.totalSupply[fundId]` increments, but there is NO corresponding `baseInfo[fundId].totalSupply` increment at this location. The `baseInfo[fundId].totalSupply` was already incremented in `_executeOrderTransfer` for the subscribe portion, but the performance fee mint is additional supply created without a `baseInfo` update. This causes divergence: `FundTokens.totalSupply[fundId]` will be larger than `baseInfo[fundId].totalSupply` by the cumulative performance fee tokens minted during order processing.
- Cash fund tokens: `SettlementFacet._settleSubscribe` and `_settleRedeem` mint/burn cash tokens. `baseInfo` is NOT updated for cash tokens, but this is by design -- `baseInfo` only tracks fund/class/dealing tokens.

**Status:** VIOLATED. Performance fee minting in `_processOrdersImpl` (line 372-379) increases `FundTokens.totalSupply[fundId]` without updating `baseInfo[fundId].totalSupply`. This impacts `calculateFundPrice` which reads from `baseInfo.totalSupply` (NavManagementFacet.sol line 446), meaning the fund price calculation uses a lower supply than the actual ERC1155 supply, inflating the price.

---

### SP-4: Fee Fairness

**Property:** Management fees minted for a class never exceed the declared annual rate (`mgmtFeeRate` in BPS) applied to the class NAV over the elapsed time period.

**Formal statement:** For any class `c` with management fee rate `r` (in BPS), the tokens minted as management fees over any time period `[t1, t2]` satisfy: `feeValue <= classNAV * r * (t2 - t1) / (BPS_DENOMINATOR * SECONDS_PER_YEAR)`.

**Evidence -- HOLDS with precision tolerance:**
- `FeeManagementFacet._calculateManagementFee` (lines 346-370) computes fees as:
  ```
  timeScaledFeeRate = mgmtFeeRate * timeElapsed / SECONDS_PER_YEAR
  targetFeeValue = classNav * timeScaledFeeRate / BPS_DENOMINATOR
  feeAmount = targetFeeValue * totalSupply / (classNav - targetFeeValue)
  ```
  This formula computes the number of new tokens to mint such that the minted tokens' value (at the diluted price) equals the target fee. The dilution approach is economically correct.
- Line 364: `if (targetFeeValue >= classNav) return 0;` prevents fee from exceeding NAV.
- Slither SL-M-21/SL-M-22 flagged `calculateAdjustedFeeRate` for multiply-after-divide precision loss. In `_calculateManagementFee`, the multiplication chain `mgmtFeeRate * timeElapsed / SECONDS_PER_YEAR` performs division before the subsequent multiplication with `classNav`, losing precision. However, since `Math.mulDiv` is used for the final computation (line 360), intermediate precision loss is bounded to at most 1 BPS-second of error per NAV update.
- `ProtocolSafetyConfig.maxMgmtFeeRateBps` is stored but NOT enforced at fee calculation time (it is only set via `setProtocolSafetyConfig`). There is no validation in `_calculateManagementFee` that `mgmtFeeRate <= maxMgmtFeeRateBps`. This means the safety limit only prevents rate changes but does not cap actual fee extraction if the rate was set before the safety config.

**Status:** HOLDS for the time-proportional bound. The absence of runtime enforcement of `maxMgmtFeeRateBps` during fee minting is a design gap but not an invariant violation (the fee is proportional to the configured rate, even if that rate exceeds the safety limit).

---

### SP-5: Dilution Floor

**Property:** `dilutionRatio >= MIN_FUND_DILUTION_RATIO` (0.01e18 = 1%) for all fund-level token IDs at all times.

**Formal statement:** `s.FundAdmin[0].baseInfo[fundId].dilutionRatio >= Constants.MIN_FUND_DILUTION_RATIO` after any state transition that modifies the fund's dilution ratio.

**Evidence -- HOLDS for fund level, DOES NOT HOLD for class/dealing level:**
- `NavManagementFacet._applyFundDilution` (lines 358-388): Line 379: `if (newDilution < Constants.MIN_FUND_DILUTION_RATIO) newDilution = Constants.MIN_FUND_DILUTION_RATIO;` explicitly floors the fund dilution.
- `NavManagementFacet._applyClassDilution` (lines 398-419): Line 416: `if (newDilution == 0) newDilution = 1;` uses a floor of 1 (not `MIN_FUND_DILUTION_RATIO`). A class dilution ratio of 1 (compared to PRECISION = 1e18) means the class price would be multiplied by 1e18, which is extreme. However, reaching dilution of 1 requires the class to absorb costs equal to ~100% of its value, which would be blocked by `maxAdjustmentBps` if configured.
- `FeeManagementFacet.mintAllPendingManagementFees` (line 182): `newDilutionRatio = Math.mulDiv(oldDilutionRatio, newTotalSupply, oldTotalSupply)`. This always produces `newDilutionRatio > oldDilutionRatio` (since `newTotalSupply > oldTotalSupply`), so management fee minting only increases class dilution, never decreasing it toward the floor.
- Dealing dilution is updated similarly in `_processPerformanceFeeBatch` (line 399) and also only increases.

**Status:** HOLDS for fund-level dilution. Class and dealing dilution have a weaker floor of 1 (instead of MIN_FUND_DILUTION_RATIO), which is effectively zero and could cause extreme price behavior if reached.

---

### SP-6: Permission Integrity

**Property:** No state-changing operation executes without valid role verification and account authorization.

**Formal statement:** For any state-changing function `f` (excluding view functions and Diamond owner functions): `f` executes only if (1) an account with `exists == true` initiated the call, (2) `msg.sender` has at least `OPERATOR` permission on the account, AND (3) the account holds the required role for `f`.

**Evidence -- HOLDS with documented exceptions:**
- `BaseFacet._validateAndPropose` (lines 109-165) enforces all three conditions:
  1. Line 119: Checks `isAccountAddress(accountAddress)`.
  2. Line 124: Checks `hasPermission(accountAddress, msg.sender, Permission.OPERATOR)`.
  3. Lines 129-139: Checks role (ROLE_MANAGER is scoped to fund, others via `s.FundAdmin[0].roles`).
- All 48 `execute*` functions use the `onlyInternalExecution` modifier (Pattern C from Phase 2), preventing direct external invocation.
- `proposeTransactionWithProposer` (AccountFacet.sol line 648-656) is guarded by `onlyInternalExecution`, preventing direct calls from bypassing role checks.

*Exceptions:*
- Diamond owner bypass in `createAccount` (AccountFacet.sol line 112-115): intentional bootstrap.
- Diamond owner functions (`onlyOwnerDiamond`): Pattern B functions bypass the account system entirely.
- ERC1155 standard functions (`safeTransferFrom`, `safeBatchTransferFrom`, `setApprovalForAll`): These use standard ERC1155 authorization (Pattern F), not the account/role system.
- Account owner direct functions (`addOperator`, `removeOperator`, `setMultisigConfig`, `setFunctionPermission`): These use `onlyAccountOwner` modifier (msg.sender must be account.owner), bypassing the proposal/role system.

**Status:** HOLDS for all account-role-gated functions. The documented exceptions are by design but create alternative authorization paths.

---

### SP-7: Price Monotonicity

**Property:** Fund price, class price, and dealing price are never zero or negative when fund NAV > 0 and totalSupply > 0.

**Formal statement:** For any fund `f` with `s.FundAdmin[0].funds[f].nav > 0` and `s.FundAdmin[0].baseInfo[f].totalSupply > 0`: `calculateFundPrice(f) > 0`, and for any class `c` in fund `f`: `calculateClassPrice(c, calculateFundPrice(f)) > 0`.

**Evidence -- HOLDS with edge case:**
- `NavManagementFacet.calculateFundPrice` (line 444-447): `return totalSupply == 0 ? PRECISION : Math.mulDiv(nav, PRECISION, totalSupply)`. When `nav > 0` and `totalSupply > 0`, `Math.mulDiv(nav, PRECISION, totalSupply) > 0` because `nav * PRECISION > 0` and `Math.mulDiv` rounds down but cannot produce 0 unless the numerator is 0.
- `NavManagementFacet.calculateClassPrice` (lines 461-474): Performs two `Math.mulDiv` divisions by `fundDilution` and `classDilution`. Since `classDilution >= 1` (SP-5 floor for class), and `fundDilution >= MIN_FUND_DILUTION_RATIO = 0.01e18`, neither division is by zero.
- **Edge case:** If `nav = 1` (1 wei) and `totalSupply = type(uint128).max`, then `fundPrice = Math.mulDiv(1, 1e18, 3.4e38)` which rounds to 0. This would violate the property. However, this configuration is unrealistic: NAV of 1 wei with maximum supply implies a negligible fund.
- `NavManagementFacet.calculateDealingPrice` (line 507-515): Returns `classPrice` when `dilutionRatio == 0` (dealing not initialized). This is safe as long as `classPrice > 0`.

**Status:** HOLDS for realistic configurations. Edge case of extremely low NAV with extremely high supply can produce zero price through rounding, but this requires unrealistic parameters.

---

### SP-8: Order Atomicity

**Property:** Order state transitions are atomic -- an order is either fully processed within a single transaction or reverts entirely with no partial state change.

**Formal statement:** For any call to `_processOrdersImpl(fundId, ordersToProcess)`: either all orders in the batch succeed and NAV/supply/balances are consistently updated, or the entire transaction reverts.

**Evidence -- HOLDS:**
- `_processOrdersImpl` (lines 245-381) processes orders in a loop. If any individual order fails validation, price checks, eligibility, or class rules, the revert propagates and rolls back the entire transaction including all previously processed orders in the batch.
- The two-phase approach (Step 1: validate all at lines 268-283, Step 2: execute all at lines 286-351) means validation failures in later orders also roll back earlier executions.
- The reentrancy guard in `_executeProposal` (AccountFacet.sol line 1035-1057) prevents re-entry during the batch.

**Status:** HOLDS. Solidity's atomic transaction model guarantees all-or-nothing execution.

---

### SP-9: Reentrancy Safety

**Property:** No ERC1155 callback can re-enter the Diamond to modify state in a way that violates other security properties.

**Formal statement:** During any ERC1155 `onERC1155Received` callback triggered by `_updateWithAcceptanceCheck`, no state-changing Diamond function can be successfully invoked.

**Evidence -- PARTIALLY HOLDS:**
- `AccountFacet._executeProposal` (line 1035): `if (s.reentrancyLock) revert ReentrancyGuardViolation();` prevents re-entry through the proposal system.
- However, the reentrancy lock only covers the proposal path. Direct ERC1155 functions (`safeTransferFrom`, `safeBatchTransferFrom`, `setApprovalForAll`) are NOT covered by the reentrancy lock (Pattern F from Phase 2). If a callback from a mint re-enters `safeTransferFrom`, it would succeed as long as the caller has approval. The balance state at that point is consistent (updates happen before callbacks in `_updateWithAcceptanceCheck`), so this does not cause inconsistency but could allow unexpected token movements during settlement.
- On a private blockchain, ERC1155 callbacks are only triggered for contract recipients (line 475: `if (to.code.length > 0)`). Since accounts are typically EOAs on a private chain, this vector is largely mitigated.

**Status:** PARTIALLY HOLDS. Proposal execution is protected. Direct ERC1155 operations are not protected but are safe due to check-effects-interactions ordering in `_update`.

---

## Section 2: 9-Category Maturity Scorecard

### 1. Arithmetic & Precision -- Score: 3/4

**Strengths:**
- Solidity 0.8.28 provides built-in overflow/underflow protection for all checked arithmetic.
- Consistent use of `Math.mulDiv` from OpenZeppelin for high-precision multiplication-then-division (e.g., `OrderManagementFacet.sol:457,516-517,536-537`, `NavManagementFacet.sol:446,473`, `FeeManagementFacet.sol:356-369`).
- `SafeCast` used throughout for narrowing casts (e.g., `toUint128`, `toUint32`, `toInt128`).
- `PRECISION = 1e18` used consistently as the scaling factor.
- `SUPPLY_DUST_TOLERANCE = 1e8` provides bounded tolerance for supply rounding (OrderManagementFacet.sol lines 1207-1222, FeeManagementFacet.sol lines 439-446).

**Weaknesses:**
- Slither flagged multiply-after-divide precision loss in `FeeManagementFacet.calculateAdjustedFeeRate` (SL-M-21, SL-M-22). The function at line 505 divides first: `adjustedReturn = (adjustedReturn * (PRECISION - volatilityPenalty)) / PRECISION` then multiplies on line 511: `adjustedFeeRate = (adjustedReturn * BPS_DENOMINATOR) / PRECISION`. This loses precision compared to `Math.mulDiv`.
- `_calculateDeviationBps` in `FXManagementFacet.sol:256-258` uses simple division: `(diff * Constants.BPS_DENOMINATOR) / b`. For very large `diff` values, `diff * BPS_DENOMINATOR` could overflow (though practically unlikely since rates are bounded by `MAX_FX_RATE_MULTIPLIER`).
- Integer division in cross-rate triangulation (`FXManagementFacet.sol:120`) truncates, which can compound with settlement deviation checks at tight tolerances (A5-11).

**Evidence:** `NavManagementFacet.sol:446` (Math.mulDiv), `FeeManagementFacet.sol:505-511` (precision loss), `FXManagementFacet.sol:120` (truncation).

---

### 2. Auditing & Logging -- Score: 3/4

**Strengths:**
- Events emitted for all major state changes: `OrderSubmitted`, `OrderFilled`, `OrderPartiallyFilled`, `OrderCancelled`, `NavUpdated`, `ManagementFeesMinted`, `PerformanceFeesMinted`, `CashFundSettlementConfirmed`, `FXRatesUpdated`, `AccountCreated`, `TransactionProposed`, `TransactionExecuted`, `TransactionCancelled`.
- Comprehensive audit trail via `changeBlocks` arrays: `fundConfigChangeBlocks`, `classConfigChangeBlocks`, `accountChangeBlocks`, `cashFundChangeBlocks`, `umbrellaChangeBlocks`.
- Transfer history with full metadata tracked in `FundTokensTransfer` struct (from, to, amount, timestamp, block, hierarchy components).
- Fee history tracked per class/dealing in `feeHistory` and `redemptionFeeHistory`.
- Price history tracked with timestamps and block numbers for historical `eth_call`.

**Weaknesses:**
- Missing event for `setLockAuthorization` (A5-13 from Phase 3).
- `ProtocolSafetyConfigUpdated` event (NavManagementFacet.sol line 209) does not include the new `maxNoticePeriod` and `maxLockPeriod` parameters in the event parameters, though they are set in storage (lines 203-204).
- No event for `setFunctionPermission` parameter values -- the event at AccountFacet.sol line 567 includes the struct but off-chain decoders must parse it.
- Diamond owner operations (`createFundWithCurrency`, `setNavUpdater`, `updateAdmin`, `setSettlementOperator`) lack proposal-system events since they bypass it.

**Evidence:** `NavManagementFacet.sol:209` (missing params), `FundTokensFacet.sol:283-285` (no event), `OrderManagementFacet.sol:685-698` (comprehensive OrderSubmitted event).

---

### 3. Authentication & Access Control -- Score: 2/4

**Strengths:**
- Unified `_validateAndPropose` pattern (BaseFacet.sol lines 109-165) consistently gates all state-changing operations with three checks: account existence, wallet permission, and role verification.
- 6 distinct roles (`ROLE_USER`, `ROLE_MANAGER`, `ROLE_ADMIN`, `ROLE_NAV_UPDATER`, `ROLE_SETTLEMENT`, `ROLE_FX_UPDATER`) provide separation of duties.
- `ROLE_MANAGER` is fund-scoped (line 130-133), preventing managers from acting on funds they do not manage.
- `onlyInternalExecution` modifier prevents direct invocation of all 48 execute functions.
- Multisig support with configurable thresholds and per-function overrides.

**Weaknesses:**
- Diamond owner is god mode with no timelock, no multisig, and no on-chain constraints (ARCH-02 from Phase 2). Can add/remove facets, call `onlyOwnerDiamond` functions directly.
- `onlyFundAdmin` in FundTokensFacet (line 51-53) resolves to `address(this)`, meaning any facet can mint/burn tokens (ARCH-02). No per-facet authorization.
- No account freeze/suspend mechanism (A1-05 from Phase 3). A flagged account cannot be blocked from user-level operations.
- No account owner transfer function (A1-04). Compromised keys have no recovery path.
- View functions (AdminViewCallsFacet, ManagerViewCallsFacet) lack access control (A6-03), exposing sensitive system data.
- `ROLE_USER = bytes32(0)` means the role check is completely skipped for user operations (A1-05).
- Operator can cancel any proposal including owner-initiated ones (A1-03).

**Evidence:** `BaseFacet.sol:109-165` (unified ACL), `FundTokensFacet.sol:51-53` (onlyFundAdmin weakness), `AccountFacet.sol:800-826` (operator cancel).

---

### 4. Complexity Management -- Score: 2/4

**Strengths:**
- Clear separation of validation (view) and execution (state-changing) in the two-phase pattern (e.g., `validateOrderSubmission` + `executeSubmitOrder`).
- Consistent struct usage to reduce stack depth (e.g., `ClassRulesParams`, `OrderProcessData`, `OrderValidationResult`).
- Constants extracted to `Constants.sol` library and re-exported via `BaseFacet`.
- Diamond proxy architecture provides natural modularity.

**Weaknesses:**
- 25 functions exceed 100 lines of code (Phase 1 metrics). `_processOrdersImpl` (lines 245-381) is 137 lines with 4 levels of nesting and multiple cross-facet calls.
- `OrderManagementFacet.sol` alone is 1,347 lines with 40+ functions, handling submission, cancellation, processing, validation, class rules, minimum subscriptions, swap linking, and pricing. This is too much responsibility for a single facet.
- Deeply nested struct access patterns: `s.FundAdmin[0].orderBook[fundId].orders[orderId].processingHistory[length-1].status` spans 5 levels of indirection.
- Cross-facet call chains can be deep: `OrderManagement -> FundTokensFacet -> ERC1155 callback -> potential re-entry`. The call depth during `_processOrdersImpl` includes calls to: `NavManagementFacet.calculateFundPrice`, `NavManagementFacet.calculateClassPrice`, `NavManagementFacet.calculateDealingPrice`, `FundManagementFacet.createDealing`, `EligibilityFacet.isEligible`, `FundTokensFacet.unlockTokens`, `FundTokensFacet.burn`, `FundTokensFacet.mint`, `FundTokensFacet.lockTokens`.
- Dual state tracking (FundTokens.totalSupply vs baseInfo.totalSupply) is a complexity hazard that has already produced a critical finding (A5-01/SP-3).

**Evidence:** `OrderManagementFacet.sol:245-381` (137-line function), `FundTokensFacet.sol:299-377` (_update, 78 lines), 1,347 total lines in OrderManagementFacet.

---

### 5. Decentralization & Admin Risk -- Score: 1/4

**Strengths:**
- Multisig support exists at the account level with configurable thresholds.
- Separation of roles (admin, manager, NAV updater, FX updater, settlement) limits blast radius of a single compromised key.
- Account-based architecture means roles are assigned to accounts (with potential multisig) rather than directly to EOAs.

**Weaknesses:**
- Diamond owner is a single EOA with unrestricted power: can add malicious facets, remove all existing facets, bypass all access control, and directly call privileged functions. No timelock, no multisig at the protocol level, no on-chain governance.
- NAV updater and FX updater are trusted oracles with no on-chain verification of submitted data beyond basic safety bounds. A compromised NAV updater can set any NAV within the configured `maxNavChangeBps` each update, gradually draining value. If `maxNavChangeBps = 0` (default), there is no limit at all.
- Settlement operator can confirm any settlement with any FX rate if `maxFxSettlementDeviationBps = 0` (default), as identified in A5-05.
- Admin can `onramp` (mint cash tokens) with no on-chain verification of real-world deposit, effectively printing money within the system.
- No emergency pause mechanism exists. There is no circuit breaker for the entire protocol.
- No timelock on admin functions. All admin operations execute immediately upon reaching multisig threshold.

**Evidence:** `BaseFacet.sol:72-74` (onlyOwnerDiamond), `FXManagementFacet.sol:224-225` (zero = no limit), `NavManagementFacet.sol:52-65` (maxNavChangeBps = 0 means unlimited).

---

### 6. Documentation -- Score: 3/4

**Strengths:**
- NatSpec comments on all external and public functions (verified across all facets).
- Audit finding references in code comments (e.g., `V4-C03`, `V5-H01`, `V3-H06`, `V4-C11` throughout OrderManagementFacet and FeeManagementFacet), showing iterative security improvement.
- `@dev` comments explain complex logic, particularly in price calculations (NavManagementFacet lines 455-459), fee formulas (FeeManagementFacet lines 176-178), and order processing (OrderManagementFacet line 168-171).
- `@custom:access`, `@custom:emits`, `@custom:reverts` annotations on major functions.
- `Constants.sol` has descriptive comments for every constant.

**Weaknesses:**
- No formal specification document or invariant documentation beyond code comments.
- The dual totalSupply system is not documented with a clear ownership or update responsibility model.
- `MetaContext.sol` trusted forwarder has no documentation about when/whether it is activated.
- `BaseFacet._validateAndPropose` has a 56-line implementation with a 6-line comment -- the role resolution logic at lines 129-139 is complex and under-documented.

**Evidence:** `OrderManagementFacet.sol:56-71` (comprehensive NatSpec), `Constants.sol:10-112` (all documented), `BaseFacet.sol:109-115` (short description for complex function).

---

### 7. Front-Running & MEV -- Score: 3/4

**Strengths:**
- Private blockchain deployment eliminates most MEV concerns (no public mempool, no sandwiching).
- Order processing uses admin-provided prices, not AMM/DEX prices, so there is no price oracle to manipulate.
- Two-phase order system (submit then process at next dealing) means order parameters are locked at submission time, with min/max price constraints (OrderManagementFacet.sol lines 460-461: `minPrice`, `maxPrice`).
- TOCTOU defense: eligibility re-checked at processing time (line 311: `EligibilityFacet.isEligible` during `_processOrdersImpl`).

**Weaknesses:**
- NAV updater submits NAV value on-chain. On a private chain with known validators, a NAV updater or validator could see pending order transactions in the mempool and front-run by updating NAV to an advantageous value before the orders are processed. This is mitigated by the dealing state machine (NAV must be updated before processing can begin), but a colluding NAV updater + admin could manipulate the sequence.
- FX rate updates are similarly front-runnable by an FX updater who sees pending cross-currency orders.
- `block.number` in account address generation (A1-01) introduces front-running susceptibility for account creation workflows, though the impact is denial-of-service rather than value extraction.

**Evidence:** `OrderManagementFacet.sol:460-461` (price bounds), `NavManagementFacet.sol:584-593` (dealing state machine), `AccountFacet.sol:154-158` (block.number).

---

### 8. Low-Level & Unsafe Operations -- Score: 3/4

**Strengths:**
- Minimal use of assembly: only in `FundTokensFacet._asSingletonArrays` (lines 528-544, tagged `memory-safe`), ERC1155 callback error propagation (lines 486-488, 515-517, tagged `memory-safe`), and `BaseFacet._validateAndPropose` error propagation (line 157-159).
- All assembly blocks are short (< 10 lines), well-documented, and use the `memory-safe` annotation.
- No `selfdestruct`, no `CREATE2`, no inline `SSTORE`/`SLOAD`.
- `delegatecall` usage is limited to the Diamond proxy pattern (LibDiamond) and `_validateAndPropose`/`_executeProposal` for the proposal system.
- `SafeCast` used for all narrowing conversions.

**Weaknesses:**
- Unchecked arithmetic in `_update` burn path (FundTokensFacet.sol lines 352-362). While the invariant `value <= fromBalance <= totalSupply` is maintained by the preceding check at line 321-322, unchecked blocks introduce risk if the preceding invariants are ever violated by a storage corruption or upgrade bug.
- `internalExecutionContext` is a boolean flag (not a counter) set via `delegatecall` within `_validateAndPropose` and `_executeProposal`. This shared mutable state across delegatecalls is fragile (A1-02).

**Evidence:** `FundTokensFacet.sol:528-544` (safe assembly), `FundTokensFacet.sol:352-362` (unchecked), `BaseFacet.sol:151-153` (boolean flag).

---

### 9. Testing & Verification -- Score: 2/4

**Strengths:**
- 1,404 tests passing with 0 failures (Phase 1 baseline).
- Invariant tests present: `cleanSupplyNeverExceedsTotalSupply`, `conversionPreservesTotalValue` (Phase 1).
- Broad test suite coverage: unit tests, integration tests, invariant tests, gas benchmarks.
- Test suites cover all major facets: AccountFacet, OrderBook, ViewCalls, FundLifecycle, Eligibility, ClassAdjustment, MultiCurrency, CrossUmbrella, Settlement, FX.

**Weaknesses:**
- No fuzz testing reported for critical arithmetic functions (`_calculateManagementFee`, `calculateAdjustedFeeRate`, `_processOrdersImpl` order amount calculations).
- No formal verification of core invariants (SP-2, SP-3).
- No negative testing specifically targeting the dual totalSupply consistency (SP-3 violation).
- The invariant test `cleanSupplyNeverExceedsTotalSupply` tests the FundTokens supply but likely does not verify the dual supply consistency with `baseInfo`.
- No cross-facet integration tests that specifically exercise reentrancy paths through ERC1155 callbacks.
- 56 `calls-loop` patterns flagged by Slither (Phase 1) suggest unbounded iteration that should have targeted gas tests.

**Evidence:** Phase 1 report: 1,404 tests, invariant tests present but scope unclear. No fuzz test results or formal verification artifacts observed.

---

### Overall Maturity Score: 2.4/4.0

| Category | Score | Key Issue |
|----------|-------|-----------|
| 1. Arithmetic | 3/4 | Precision loss in fee calc, otherwise solid |
| 2. Auditing/Logging | 3/4 | Missing events for some state changes |
| 3. Authentication/ACL | 2/4 | Diamond owner god mode, no account freeze |
| 4. Complexity | 2/4 | 1,347-line facet, dual supply tracking |
| 5. Decentralization | 1/4 | Single-point diamond owner, no timelock, no pause |
| 6. Documentation | 3/4 | Good NatSpec, missing formal spec |
| 7. Front-running/MEV | 3/4 | Private chain mitigates, oracle trust remains |
| 8. Low-level | 3/4 | Minimal assembly, safe patterns |
| 9. Testing | 2/4 | Good count, needs fuzz/formal verification |
| **Overall** | **2.4/4.0** | |

---

## Section 3: Unique Findings (Not in Phases 1-4)

### TOB-01: [HIGH] Performance Fee Mint in `_processOrdersImpl` Updates Wrong Supply Metric

**Severity:** HIGH
**Location:** `OrderManagementFacet.sol:371-379`
**SWC:** N/A (Economic invariant violation)

**Description:**
At the end of `_processOrdersImpl`, accumulated redemption performance fees are minted to the fund manager:

```solidity
// Line 371-379
if (processData.totalPerfFeeAmount > 0) {
    FundTokensFacet(address(this))
        .mint(
            s.FundAdmin[0].funds[processData.fundId].manager,
            processData.fundId,    // <--- mints to FUND token ID
            processData.totalPerfFeeAmount,
            ""
        );
}
```

This mints new tokens with `tokenId = processData.fundId` (the fund-level token ID). `FundTokensFacet.mint` increments `s.FundTokens[0].totalSupply[fundId]`. However, there is NO corresponding increment to `s.FundAdmin[0].baseInfo[fundId].totalSupply`.

Meanwhile, the `_executeOrderTransfer` function at lines 1182-1184 does update `baseInfo[fundId].totalSupply` for subscribe operations, and at lines 1214-1222 decrements it for redeem operations. But the performance fee mint at line 371-379 is an **additional** supply creation that only updates `FundTokens.totalSupply`.

The consequence: `NavManagementFacet.calculateFundPrice(fundId)` at line 446 reads from `baseInfo[fundId].totalSupply`, not `FundTokens[0].totalSupply[fundId]`. After performance fee minting, `calculateFundPrice` uses a supply value that is *lower* than reality, producing an *inflated* fund price.

This inflated price propagates to all subsequent class and dealing price calculations, affecting:
- All future subscribe/redeem order amounts
- Management fee calculations (based on class NAV which uses inflated price)
- Performance fee calculations (based on dealing price vs HWM)
- NAV change calculations

The divergence is cumulative -- each `processOrders` call with performance fees widens the gap.

**Impact:** Fund price inflation proportional to cumulative performance fees minted. This causes:
1. New subscribers overpay (they buy at inflated price).
2. Existing shareholders benefit from artificial price appreciation.
3. Management fees are over-collected (based on inflated class NAV).
4. Further performance fees may be triggered by the artificial price increase, creating a positive feedback loop.

**Recommendation:** After the performance fee mint at line 379, add:
```solidity
s.FundAdmin[0].baseInfo[processData.fundId].totalSupply += SafeCast.toUint128(processData.totalPerfFeeAmount);
```

Or better, mint performance fees to the fee class dealing token (like management fees) rather than the fund token ID, and update `baseInfo` for the fee class accordingly.

---

### TOB-02: [HIGH] Class Dilution Ratio Floor of 1 Allows Price Explosion

**Severity:** HIGH
**Location:** `NavManagementFacet.sol:416`
**SWC:** N/A (Economic edge case)

**Description:**
The class dilution floor in `_applyClassDilution` is:

```solidity
// Line 416
if (newDilution == 0) newDilution = 1;
```

This floor of 1 (compared to `PRECISION = 1e18`) means a class price could be multiplied by up to 1e18. Consider the price calculation chain:

```
classPrice = adjustedFundPrice * PRECISION / classDilution
```

If `classDilution = 1`:
```
classPrice = adjustedFundPrice * 1e18 / 1 = adjustedFundPrice * 1e18
```

This would produce an astronomically large class price. In `_calculateManagementFee` (FeeManagementFacet.sol line 356), `classNav = Math.mulDiv(totalSupply, classPrice, PRECISION)`. With `classPrice = adjustedFundPrice * 1e18`, this computation would overflow or produce extremely large fee amounts.

The path to reaching `classDilution = 1`:
1. A class adjustment is posted with a large negative `amount` (cost) via `ClassAdjustmentFacet.postClassAdjustment`.
2. During NAV update, `_applyClassDilution` calculates `pct = absAmount * PRECISION / classValue`. If `absAmount ~= classValue`, then `pct ~= PRECISION`.
3. For costs: `newDilution = _applyDilutionChange(currentDilution, pct, true)` = `currentDilution * (PRECISION + pct) / PRECISION`. With `pct = PRECISION`, `newDilution = currentDilution * 2`, which actually increases dilution (higher dilution = lower price). This direction is safe.
4. For gains (negative amount): `newDilution = _applyDilutionChange(currentDilution, pct, false)` = `currentDilution * (PRECISION - pct) / PRECISION`. If `pct ~= PRECISION`, this approaches 0, hitting the floor of 1.

The `maxAdjustmentBps` safety limit in `_processAllPendingAdjustments` (line 333-341) should prevent this, but only if it is configured (defaults to 0 = no limit).

**Impact:** If `maxAdjustmentBps` is not configured (default = 0) and a large gain adjustment is applied to a class, the class dilution could reach 1, causing all class-related price calculations to produce values 1e18x larger than expected. This would break management fee calculation, order processing, and portfolio valuation.

**Recommendation:** Use `Constants.MIN_FUND_DILUTION_RATIO` (0.01e18) as the floor for class dilution as well:
```solidity
if (newDilution < Constants.MIN_FUND_DILUTION_RATIO) newDilution = Constants.MIN_FUND_DILUTION_RATIO;
```

Additionally, enforce a non-zero `maxAdjustmentBps` at diamond initialization.

---

### TOB-03: [MEDIUM] `_processOrdersImpl` Pops Dealing Timestamp Before Processing, Preventing Re-Processing on Partial Failure

**Severity:** MEDIUM
**Location:** `OrderManagementFacet.sol:380`
**SWC:** N/A (State machine inconsistency)

**Description:**
At the very end of `_processOrdersImpl`, line 380 pops the dealing timestamp:

```solidity
s.FundAdmin[0].funds[processData.fundId].nextDealingTimestamps.pop();
```

If the function completes successfully, this is correct -- the dealing has been processed. If the function reverts at any point before line 380 (e.g., due to eligibility failure, price bounds, class rules), the timestamp is NOT popped because the revert rolls back all state changes. This is also correct.

However, consider the early return on line 251-253:
```solidity
if (ordersToProcess.length == 0) {
    s.FundAdmin[0].funds[fundId].nextDealingTimestamps.pop();
    return;
}
```

If `ordersToProcess` is empty, the dealing timestamp is still popped. This means an admin can trigger `processOrders` with an empty array to skip a dealing period without processing any orders. Combined with the dealing state machine (`dealingProcessState` checks), this allows an admin to:
1. Wait for dealing timestamp to pass.
2. Update NAV (transitioning to PROCESSING state).
3. Call `processOrders` with an empty array, popping the timestamp and returning to IDLE.

Any pending orders for that dealing period are left unprocessed in PENDING state. They can only be processed in the next dealing period, but by then the NAV may have changed, producing different fill prices than expected.

This is not necessarily a bug (the admin may intentionally skip processing), but it allows silent order deferral without any event emission or investor notification.

**Impact:** An admin can defer order processing indefinitely by repeatedly calling `processOrders([])` at each dealing period. Pending orders accumulate without being processed, and investors cannot distinguish between "no dealing scheduled" and "dealing skipped by admin". The NAV update still occurs, changing prices, so deferred orders will eventually be processed at different prices.

**Recommendation:** Emit an event when dealing is processed with zero orders (e.g., `DealingSkipped(fundId)`). Consider whether a dealing with pending orders should be allowed to be skipped without processing them -- if not, add a check:
```solidity
if (ordersToProcess.length == 0) {
    // Verify no pending orders exist for this fund
    // Or emit a warning event
    emit DealingSkipped(fundId);
    s.FundAdmin[0].funds[fundId].nextDealingTimestamps.pop();
    return;
}
```

---

### TOB-04: [MEDIUM] Management Fee Class-1 Dilution Ratio Never Updated

**Severity:** MEDIUM
**Location:** `FeeManagementFacet.sol:199-204`
**SWC:** N/A (Implicit assumption violation)

**Description:**
When management fees are minted, they are accumulated across all classes and then minted as a single batch to dealing 1 of class 1 (the fee class):

```solidity
// Line 199-204
if (totalFeeInFundTokens > 0) {
    uint256 feeClassId = TokenIdUtils.createClassTokenId(fundId, 1);
    uint256 feeDealingId = TokenIdUtils.toDealingTokenId(feeClassId, 1);
    FundTokensFacet(address(this)).mint(fundManager, feeDealingId, totalFeeInFundTokens, "");
    s.FundAdmin[0].baseInfo[feeClassId].totalSupply += SafeCast.toUint128(totalFeeInFundTokens);
}
```

Note that `baseInfo[feeClassId].totalSupply` is updated, AND on line 182-184, the class-level dilution ratio is updated for each *source* class (the class being charged the fee). However, the **fee class's own dilution ratio** (`baseInfo[feeClassId].dilutionRatio`) is NEVER updated when fee tokens are minted into it.

Similarly, `_processPerformanceFeeBatch` (lines 450-455) mints to the fee class and updates `baseInfo[feeClassId].totalSupply` but does NOT update `baseInfo[feeClassId].dilutionRatio`.

The fee class dilution ratio stays at its initial value (set during `createShareClass` for class 1). As fee tokens accumulate, the fee class price calculation `calculateClassPrice(feeClassId, fundPrice)` uses the original dilution ratio, which does not reflect the new supply.

For regular classes, the dilution ratio adjusts to maintain price consistency when new tokens are minted (fees dilute the existing holders). For the fee class, this adjustment is absent. The fee class tokens are all owned by the fund manager, so there is no dilution unfairness to other holders. However, the fee class price used in `_calculateManagementFee` line 187 (`feeAmount = Math.mulDiv(feeAmount, classPrice, fundPrice)`) uses the fee class's unadjusted price, which affects the conversion from class-specific fee amounts to fund-wide fee tokens.

**Impact:** The fee class price does not accurately reflect its growing supply, leading to a gradually increasing error in the class-to-fund token conversion for management fees. Over many NAV updates, the cumulative error grows, though the direction (over- or under-minting) depends on whether the fee class price is higher or lower than it should be.

**Recommendation:** Update the fee class dilution ratio when minting fee tokens, using the same formula as for regular classes:
```solidity
uint256 oldDilution = s.FundAdmin[0].baseInfo[feeClassId].dilutionRatio;
uint256 oldSupply = s.FundAdmin[0].baseInfo[feeClassId].totalSupply;
s.FundAdmin[0].baseInfo[feeClassId].totalSupply += SafeCast.toUint128(totalFeeInFundTokens);
uint256 newSupply = s.FundAdmin[0].baseInfo[feeClassId].totalSupply;
s.FundAdmin[0].baseInfo[feeClassId].dilutionRatio = SafeCast.toUint128(Math.mulDiv(oldDilution, newSupply, oldSupply));
```

---

### TOB-05: [MEDIUM] `maxMgmtFeeRateBps` Safety Limit Not Enforced at Fee Minting Time

**Severity:** MEDIUM
**Location:** `FeeManagementFacet.sol:158-205`, `NavManagementFacet.sol:189-210`
**SWC:** SWC-105 (Access Control)

**Description:**
The `ProtocolSafetyConfig` struct includes `maxMgmtFeeRateBps`, stored via `setProtocolSafetyConfig` (NavManagementFacet.sol line 198-204). This is intended to cap the management fee rate for a fund. However, this limit is ONLY stored -- it is never checked at the point where management fees are actually calculated and minted.

In `FeeManagementFacet._calculateManagementFee` (lines 346-370), the fee is computed using `s.FundAdmin[0].classes[classId].mgmtFeeRate` directly, with no comparison against `protocolSafetyConfigs[fundId].maxMgmtFeeRateBps`.

The intended workflow is that `maxMgmtFeeRateBps` prevents a manager from *setting* a fee rate above the limit. But looking at `FundManagementFacet` (where class fee rates are set), there is validation against the safety config. However, if:
1. A class is created with a high fee rate BEFORE the safety config is set, or
2. The safety config is lowered AFTER the class already has a high fee rate,

...the existing high fee rate continues to be used for fee minting without any enforcement.

**Impact:** A fund manager could set a high management fee rate before the admin configures the safety limit, and that rate persists indefinitely. Or an admin could lower the safety limit thinking it caps fees, but pre-existing classes continue minting at the old (higher) rate.

**Recommendation:** Add a runtime check in `_calculateManagementFee`:
```solidity
uint16 maxRate = s.FundAdmin[0].protocolSafetyConfigs[TokenIdUtils.toFundTokenId(classId)].maxMgmtFeeRateBps;
if (maxRate > 0) {
    uint160 effectiveRate = s.FundAdmin[0].classes[classId].mgmtFeeRate;
    if (effectiveRate > maxRate) effectiveRate = maxRate;
    // Use effectiveRate instead of mgmtFeeRate
}
```

---

## Summary

| ID | Severity | Title | Location |
|----|----------|-------|----------|
| TOB-01 | HIGH | Performance fee mint does not update baseInfo.totalSupply, causing fund price inflation | OrderManagementFacet.sol:371-379 |
| TOB-02 | HIGH | Class dilution floor of 1 allows 1e18x price explosion | NavManagementFacet.sol:416 |
| TOB-03 | MEDIUM | Empty processOrders silently skips dealing period | OrderManagementFacet.sol:251-253 |
| TOB-04 | MEDIUM | Fee class dilution ratio never updated, accumulating price error | FeeManagementFacet.sol:199-204 |
| TOB-05 | MEDIUM | maxMgmtFeeRateBps safety limit not enforced at fee minting time | FeeManagementFacet.sol:158-205 |

**Security Properties:**
- 6 HOLD (SP-1, SP-2, SP-4, SP-6, SP-7, SP-8)
- 1 VIOLATED (SP-3: Dual Supply Consistency)
- 2 PARTIALLY HOLD (SP-5: Dilution Floor class level, SP-9: Reentrancy for non-proposal paths)

**Overall Maturity: 2.4/4.0** (up from 2.0 in V5, reflecting audit-driven improvements in arithmetic safety and documentation, but persistent gaps in decentralization and testing rigor).
