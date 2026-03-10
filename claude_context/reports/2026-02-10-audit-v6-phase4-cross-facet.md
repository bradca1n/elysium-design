# Security Audit V6 -- Phase 4: Cross-Facet Attack Chain Analysis

**Date:** 2026-02-10
**Branch:** multiCurrency
**Auditor:** Phase 4 Agent (Claude Opus 4.6)
**Methodology:** Systematic composition of per-facet findings (Agents 1-6) with cross-facet state dependency analysis

---

## Summary Table

| Chain | Severity | Title | Affected Facets | Compounding Findings |
|-------|----------|-------|----------------|---------------------|
| XF-01 | CRITICAL | NAV Update Price Inconsistency Cascade | NavManagement, FeeManagement, ClassAdjustment | A4-03, A4-05, A4-06, A5-01 |
| XF-02 | CRITICAL | FX Validation Bypass via actualFxRate=0 + Disabled Safety Config | Settlement, FXManagement, OrderManagement | A5-05, A5-09, A2-05 |
| XF-03 | CRITICAL | Manager Fund Drain via Force Redemption + Fee Extraction | FundLifecycle, FeeManagement, OrderManagement, FundTokens | A3-02, A4-04, A2-02 |
| XF-04 | CRITICAL | Dealing Schedule Manipulation Freezes Fund State Machine | FundManagement, NavManagement, OrderManagement | A3-01, A2-01, A2-12 |
| XF-05 | HIGH | Dual totalSupply Divergence Enables Systematic NAV Inflation | FeeManagement, NavManagement, OrderManagement, FundTokens | A4-03, A5-01, A4-06 |
| XF-06 | HIGH | Stale FX + Stale NAV Enables Value Extraction at Settlement | Settlement, FXManagement, NavManagement, OrderManagement | A5-03, A2-13, A5-05 |
| XF-07 | HIGH | Cross-Umbrella Swap Orphaning Locks Investor Tokens Permanently | OrderManagement, Settlement, FundTokens | A2-03, A2-07 |
| XF-08 | HIGH | CLOSED Fund Reactivation + Stale State Enables Ghost Fund | FundLifecycle, FundManagement, NavManagement | A3-03, A3-05, A3-13 |
| XF-09 | HIGH | Locked Token Double-Counting Bypasses Minimum Holding Limits | OrderManagement, FundTokens, OrderValidation | A2-11, A2-04 |
| XF-10 | HIGH | Operator Proposal Griefing Blocks All Account Operations | AccountFacet | A1-03, A1-06, A1-08 |
| XF-11 | MEDIUM | ERC1155 Callback Reentrancy During Settlement Reads Inconsistent State | Settlement, FundTokens | A5-04, ARCH-04 |
| XF-12 | MEDIUM | View Function Information Leak Enables Targeted Social Engineering | AdminViewCalls, ManagerViewCalls, AccountFacet | A6-03, A1-05 |
| XF-13 | MEDIUM | Performance Fee Division-by-Zero Blocks Entire Batch | FeeManagement, FundTokens, NavManagement | A4-02, A4-08 |
| XF-14 | MEDIUM | Portfolio Event Reconstruction Fails on Multi-Operation Blocks | ViewCalls2, FundTokens, Settlement | A6-05, A6-10 |
| XF-15 | MEDIUM | Unbounded Array Growth Compounds Across Facets for Gas DoS | FundTokens, OrderManagement, FeeManagement, ViewCalls | A5-07, A1-08, A6-07, A6-08 |
| XF-16 | HIGH | Management Fee Timestamp Advance on Non-Existent Class Poisons Future Classes | FeeManagement, FundManagement, NavManagement | A4-16, A3-06 |
| XF-17 | MEDIUM | Adjustment Splitting Bypasses maxAdjustmentBps Safety Check | ClassAdjustment, NavManagement | A4-07, A4-11 |
| XF-18 | HIGH | Dealing Token Conversion Rounding + Zero Output Drains Investor Holdings | FundManagement, FundTokens, NavManagement | A3-07, A4-12 |

**Severity Distribution:** 4 Critical, 8 High, 6 Medium

---

## CRITICAL Attack Chains

---

### XF-01: NAV Update Price Inconsistency Cascade

**Severity:** CRITICAL

**Entry Point:** `NavManagementFacet.updateNav()` -- requires ROLE_NAV_UPDATER

**Affected Facets:** NavManagementFacet, FeeManagementFacet, ClassAdjustmentFacet, OrderManagementFacet

**Compounding Findings:** A4-03 (fund totalSupply not updated on fee mint), A4-05 (adjustments use stale fund price), A4-06 (circular price dependency in fee minting), A5-01 (dual totalSupply divergence)

**Attack Chain:**

1. **NAV_UPDATER calls `updateNav(fundId, newNav, timestamp)`.**
2. **Step 1 -- `_processAllPendingAdjustments(fundId, newNav)`**: Reads `calculateFundPrice(fundId)` from storage at `NavManagementFacet.sol:L328`. At this point, the stored NAV is the **old** value (the new NAV is not stored until step 3). All class value calculations and `maxAdjBps` safety checks operate against the stale price. If the new NAV is 30% higher than the old, the safety check at L337 uses a class value that is 30% too low, allowing adjustments that are 30% too large relative to the true class value.
3. **Step 2 -- `mintAllPendingManagementFees(fundId, navTimestamp)`**: Calculates `fundPrice` once at `FeeManagementFacet.sol:L162` (still using old NAV since new NAV is not stored yet). For each class, computes fee, updates `dilutionRatio` at L184, then recalculates `classPrice` at L186 using the **post-dilution** ratio but the **pre-update** `fundPrice`. The conversion `feeAmount = mulDiv(feeAmount, classPrice, fundPrice)` at L187 uses inconsistent data. The minted fee tokens increase fee class `totalSupply` at L203 but **never update fund-level `totalSupply`** (A4-03).
4. **Step 3 -- NAV stored**: `s.FundAdmin[0].funds[fundId].nav = newNav` at L239.
5. **Subsequent `processOrders` call**: `calculateFundPrice(fundId)` at `OrderManagementFacet.sol:L257` now uses the new NAV but a fund `totalSupply` that is missing the fee tokens minted in step 2. Result: `fundPrice = nav * PRECISION / totalSupply` is **inflated** because the denominator is too small.
6. **Impact on subscribers**: New subscribers pay an inflated price (fund appears more valuable per token than it actually is). They receive fewer dealing tokens per dollar invested.
7. **Impact on redeemers**: Redeemers receive more value than warranted because the fund price is artificially high.

**Impact:** Systematic price manipulation that compounds with every NAV cycle. Over N cycles with M fee minting events, the fund price diverges by approximately `sum(feeTokensMinted_i) / trueSupply` per cycle. For a fund with 2% annual management fee, after one year of daily NAV updates (~365 cycles), the cumulative divergence could reach ~2% of fund value -- material for institutional funds managing billions.

**Recommendation:** Fix the root cause in three steps: (1) Store NAV before processing adjustments and fees. (2) Update fund-level totalSupply when minting fee tokens. (3) Recalculate fundPrice after each class fee mint in the loop, or batch all calculations before applying dilution changes.

---

### XF-02: FX Validation Bypass via actualFxRate=0 + Disabled Safety Config

**Severity:** CRITICAL

**Entry Point:** `SettlementFacet.confirmCashFundSettlement()` -- requires ROLE_SETTLEMENT

**Affected Facets:** SettlementFacet, FXManagementFacet, OrderManagementFacet

**Compounding Findings:** A5-05 (default FX safety config disables all validation), A5-09 (FX validation bypass via actualFxRate=0), A2-05 (FX rate validation uses wrong currency pair direction)

**Attack Chain:**

1. **Precondition**: FX safety config is at default values (`maxFxSettlementDeviationBps = 0`, `maxFxRateChangeBps = 0`). This is the **default state** after diamond initialization -- no admin action is needed to reach this state.
2. **Settlement operator calls `confirmCashFundSettlement(account, fundId, orderId, sourceAmount, actualFxRate=0)`** for a cross-currency order (e.g., EUR fund, investor paying in GBP).
3. At `SettlementFacet.sol:L86`: `effectiveFxRate = 0 == 0 ? PRECISION : 0` resolves to `PRECISION` (1e18).
4. At L87: `targetAmount = mulDiv(sourceAmount, PRECISION, PRECISION) = sourceAmount`. The settlement assumes 1:1 exchange, regardless of actual EUR/GBP rate.
5. At L90: `if (effectiveFxRate != PRECISION)` is **false** because effectiveFxRate equals PRECISION. The `_validateSettlementFxRate` function is **never called**.
6. For EUR/GBP where the real rate is ~0.86, the investor gets ~14% more target tokens than they should. For more extreme pairs (USD/JPY where rate ~150), the value extraction is ~99.3%.
7. **Even if maxFxSettlementDeviationBps were configured**, the bypass at step 5 still skips the validation entirely for `actualFxRate=0`.

**Intermediate State Mutations:**
- `order.cashPendingSwap -= sourceAmount` (SettlementFacet L175/198)
- `unlockTokens`, `burn` source cash, `mint` target cash (L180-183)
- The investor receives `sourceAmount` of target currency tokens instead of `sourceAmount * fxRate / PRECISION`

**Impact:** A compromised or malicious settlement operator can force 1:1 exchange rates on any cross-currency settlement, extracting the full FX differential as profit. For a settlement of 10M EUR to GBP with a ~14% rate difference, the value extraction is ~1.4M. On a private blockchain, the settlement operator is a trusted role, but the FX safety system was specifically designed to catch exactly this type of error/manipulation. The bypass renders the entire FX safety framework ineffective.

**Recommendation:** (1) Always call `_validateSettlementFxRate` regardless of effectiveFxRate value. (2) Inside `_validateSettlementFxRate`, if `sourceCurrency != targetCurrency` and `effectiveFxRate == PRECISION`, revert (a cross-currency settlement at 1:1 is always suspicious). (3) Set non-zero defaults for FX safety config at diamond initialization.

---

### XF-03: Manager Fund Drain via Force Redemption + Uncapped Fee Extraction

**Severity:** CRITICAL

**Entry Point:** `FundLifecycleFacet.forceSubmitRedemptionOrder()` -- requires ROLE_MANAGER

**Affected Facets:** FundLifecycleFacet, FeeManagementFacet, OrderManagementFacet, FundTokensFacet

**Compounding Findings:** A3-02 (force redemption no lifecycle/lock check), A4-04 (mgmt fee rate not validated against safety cap), A2-02 (perf fee BPS caller-supplied up to 100%)

**Attack Chain:**

A malicious fund manager can drain investor holdings through two complementary vectors, executed in sequence:

**Vector A -- Force Redemption Drain:**
1. Manager calls `forceSubmitRedemptionOrder(managerAccount, investorAccount, dealingId, 0)` for each investor's dealing token. Amount=0 means full balance redemption.
2. `validateForceRedemption` at `FundLifecycleFacet.sol:L128-136` only checks `balance > 0`. No lifecycle state check (works on CLOSED funds per code comment), no lock period check, no notice period check, no rate limiting.
3. The forced redemption order has `isForcedRedemption = true`, preventing investor cancellation.
4. All investor tokens are locked (`FundTokensFacet.lockTokens` at L557) pending the next dealing processing.
5. During `processOrders`, the manager supplies `perfFeeBps` up to 10000 (100%) in the `OrderToProcess` struct (A2-02). The validation at `OrderManagementFacet.sol:L429` only rejects values > BPS_DENOMINATOR, so 10000 passes. The `MAX_ADJUSTED_FEE_RATE_BPS` constant (2000 = 20%) is **never enforced**.
6. With `perfFeeBps = 10000`, the entire redemption value is extracted as performance fee, minted to the fee class dealing token owned by the manager.

**Vector B -- Uncapped Management Fee Extraction:**
1. The manager creates a class with an arbitrarily high `mgmtFeeRate`. The `maxMgmtFeeRateBps` from `ProtocolSafetyConfig` is stored but **never enforced** (A4-04).
2. On each NAV update, `mintAllPendingManagementFees` calculates fees based on the uncapped rate, minting tokens to the fee class.
3. Over time, the dilution ratio increases, reducing the value of all investor tokens while increasing the manager's fee class holdings.

**Combined Impact:** The manager can extract up to 100% of all investor funds through either vector. Vector A is immediate (single dealing cycle). Vector B is gradual but equally devastating over time. Both vectors are available to any address with ROLE_MANAGER for a given fund, and the fund manager role is assigned by the diamond owner. There are no on-chain circuit breakers to prevent this.

**Recommendation:** (1) Enforce `MAX_ADJUSTED_FEE_RATE_BPS` at order processing time. (2) Enforce `maxMgmtFeeRateBps` at class creation/update time. (3) Add lifecycle and lock period checks to force redemption. (4) Consider requiring ROLE_ADMIN for force redemptions, or a multi-sig threshold. (5) Add investor notification events with a mandatory delay before force redemption processing.

---

### XF-04: Dealing Schedule Manipulation Freezes Fund State Machine

**Severity:** CRITICAL

**Entry Point:** `FundManagementFacet.setDealingSchedule()` -- requires ROLE_MANAGER

**Affected Facets:** FundManagementFacet, NavManagementFacet, OrderManagementFacet

**Compounding Findings:** A3-01 (setDealingSchedule accepts arbitrary timestamps), A2-01 (unbounded order processing loop), A2-12 (zero-order processing pops timestamp)

**Attack Chain:**

**Scenario A -- Permanent PROCESSING State Lock:**
1. Manager calls `setDealingSchedule(fundId, [pastTimestamp])` with a timestamp in the past. No validation prevents this (A3-01).
2. `dealingProcessState(fundId)` immediately returns `PROCESSING` because `nextTs <= block.timestamp && nextTs > navUpdatedAt` (assuming NAV was updated after the past timestamp was set, which is the default for a new fund where `navUpdatedAt = 0`).
3. Admin calls `processOrders(fundId, largeOrderBatch)` where the batch exceeds the block gas limit (A2-01). Transaction reverts.
4. The dealing state remains `PROCESSING` because `nextDealingTimestamps.pop()` at L380 never executes.
5. In PROCESSING state: (a) No orders can be cancelled (OrderValidationFacet L82-84 reverts with `DealingInProgress`). (b) No new NAV updates can occur (requires `AWAITS_NAV_UPDATE` state). (c) No new dealing schedules can be set (state machine is stuck).
6. The fund is **permanently frozen**. All pending orders are stuck, locked tokens cannot be unlocked.

**Scenario B -- Silent Dealing Skip:**
1. Manager sets `setDealingSchedule(fundId, timestamps)` where timestamps are not sorted (A3-01 -- no ordering validation).
2. `dealingProcessState` reads `timestamps[timestamps.length - 1]` (last element) as the next dealing time. Unsorted timestamps mean the chronological next dealing may not be at the array tail.
3. Admin calls `processOrders(fundId, [])` (empty array) which pops the last timestamp (A2-12). This silently skips a dealing round without processing any orders.
4. Investors who submitted orders expecting that dealing round have their orders remain PENDING with locked tokens, and receive no on-chain notification.

**Scenario C -- Duplicate Timestamp Double Processing:**
1. Manager sets `setDealingSchedule(fundId, [ts, ts])` with duplicate timestamps.
2. First `processOrders` call processes orders and pops one `ts`.
3. Second `processOrders` call re-processes the same dealing period. New orders submitted between the two calls could be processed at stale prices (the NAV was updated for the first processing, and is not re-validated for the second).

**Impact:** Fund lockup (Scenario A) renders all assets inaccessible. Silent dealing skips (Scenario B) violate investor expectations and dealing agreements. Double processing (Scenario C) can cause incorrect order execution. All scenarios arise from the complete absence of validation in `setDealingSchedule`.

**Recommendation:** Add comprehensive validation: (1) All timestamps must be > `block.timestamp`. (2) Timestamps must be strictly monotonically sorted. (3) No duplicates allowed. (4) Array length bounded (e.g., max 365). (5) No zero timestamps.

---

## HIGH Attack Chains

---

### XF-05: Dual totalSupply Divergence Enables Systematic NAV Inflation

**Severity:** HIGH

**Entry Point:** `NavManagementFacet.updateNav()` triggers `FeeManagementFacet.mintAllPendingManagementFees()` which triggers `FundTokensFacet.mint()`

**Affected Facets:** FeeManagementFacet, NavManagementFacet, OrderManagementFacet, FundTokensFacet

**Compounding Findings:** A4-03 (fund totalSupply not updated), A5-01 (dual totalSupply divergence), A4-06 (circular price dependency)

**Attack Chain:**

1. `mintAllPendingManagementFees` mints fee tokens to fee class dealing at `FeeManagementFacet.sol:L202`.
2. `FundTokensFacet._update()` increments `s.FundTokens[0].totalSupply[feeDealingId]`.
3. `FeeManagementFacet` increments `s.FundAdmin[0].baseInfo[feeClassId].totalSupply` at L203.
4. **Missing**: `s.FundAdmin[0].baseInfo[fundId].totalSupply` is NOT incremented.
5. The same pattern occurs in `_processPerformanceFeeBatch` at L455.
6. Over time, `FundAdmin.baseInfo[fundId].totalSupply` drifts below `FundTokens.totalSupply[fundId]`.
7. `calculateFundPrice = nav * PRECISION / baseInfo.totalSupply` returns an inflated price.
8. All downstream prices (class, dealing) are derived from this inflated fund price.
9. New subscribers pay inflated prices. Redeemers extract inflated value. The fund's NAV integrity degrades with each fee cycle.

**Impact:** For a fund with 2% annual management fees on a 100M NAV, approximately 2M in fee tokens are minted annually without updating fund totalSupply. After one year, the fund price is overstated by ~2%. Subscribers are shortchanged by ~2%, and redeemers receive ~2% excess value, creating a systematic wealth transfer from new investors to existing ones (and to the fund manager via inflated fee token value).

**Recommendation:** Add `s.FundAdmin[0].baseInfo[fundId].totalSupply += SafeCast.toUint128(totalFeeInFundTokens)` after fee token minting in both `mintAllPendingManagementFees` and `_processPerformanceFeeBatch`.

---

### XF-06: Stale FX + Stale NAV Enables Value Extraction at Settlement

**Severity:** HIGH

**Entry Point:** `SettlementFacet.confirmCashFundSettlement()` -- requires ROLE_SETTLEMENT

**Affected Facets:** SettlementFacet, FXManagementFacet, NavManagementFacet, OrderManagementFacet

**Compounding Findings:** A5-03 (FX rate staleness not checked at settlement), A2-13 (no NAV staleness check at processing), A5-05 (default FX safety disables validation)

**Attack Chain:**

1. FX rates are updated at time T0 (e.g., EUR/USD = 1.10).
2. Days pass. Market moves EUR/USD to 1.20. No FX rate update occurs (no staleness check at read time per A5-03).
3. Settlement operator calls `confirmCashFundSettlement` with `actualFxRate = 1.10e18` (matching the stale on-chain rate).
4. `_validateSettlementFxRate` at `SettlementFacet.sol:L140` reads the stale reference rate from `FXManagementFacet.getFXRate()`. The deviation between `actualFxRate` (1.10) and `referenceCrossRate` (1.10) is 0 bps -- passes validation.
5. The settlement executes at the stale rate of 1.10, but the actual market rate is 1.20. For a EUR-to-USD settlement of 10M EUR, the investor receives 11M USD instead of 12M USD -- a loss of ~833K USD.
6. If the settlement operator is the beneficiary of the arbitrage (or colludes with one), they can extract the ~8.3% FX differential.

**Amplification via NAV staleness (A2-13):** If a NAV update is also delayed, orders are processed at stale fund prices. Combined with stale FX rates, both the token quantity (from stale NAV/prices) and the cash value (from stale FX) are incorrect, compounding the value extraction.

**Impact:** On a multi-currency platform processing cross-currency settlements daily, even a 24-hour staleness window creates arbitrage opportunities equal to the daily FX volatility (~0.5-2% for major pairs). Over a year with daily settlements of 10M, cumulative extraction potential reaches millions.

**Recommendation:** (1) Add staleness check in `_getRateVsUSD()` comparing `block.timestamp - data.timestamp` against `DEFAULT_MAX_FX_RATE_AGE`. (2) Add NAV staleness check in `_processOrdersImpl`. (3) Set non-zero FX safety config defaults at initialization.

---

### XF-07: Cross-Umbrella Swap Orphaning Locks Investor Tokens Permanently

**Severity:** HIGH

**Entry Point:** `OrderManagementFacet.cancelOrder()` for one side of a swap -- requires ROLE_USER

**Affected Facets:** OrderManagementFacet, SettlementFacet, FundTokensFacet

**Compounding Findings:** A2-03 (swap subscribe starts at zero), A2-07 (cancel does not cancel linked order)

**Attack Chain:**

1. Investor submits a cross-umbrella SWAP order: redeem from Fund A (umbrella 1), subscribe to Fund B (umbrella 2).
2. Two linked orders are created: (a) Redeem order in Fund A's order book with `dependentFundNum = fundB_num`. (b) Subscribe order in Fund B's order book with `initialAmount = 0` (deferred per `OrderManagementFacet.sol:L1078-1080`).
3. The redeem order is processed first. Dealing tokens are burned, cash tokens are minted and locked for the investor. `cashPendingSwap` is set on the redeem order.
4. Before settlement occurs, the investor (or an operator on the investor's account) cancels the **subscribe** order.
5. At `OrderManagementFacet.sol:L185-196`: The linked redeem order's dependency fields are cleared (`dependentFundNum = 0`, `dependentUmbrellaId = 0`, `dependentOrderId = 0`). The subscribe order is marked CANCELLED.
6. The redeem order still has `cashPendingSwap > 0` and locked cash tokens. But its dependency link is now broken -- the settlement flow at `SettlementFacet._settleRedeem` L206 checks `order.dependentFundNum > 0` to decide whether to lock target cash for the dependent subscribe. Since the link was cleared, the settlement would mint target cash tokens to the investor **without locking** them, but the subscribe order no longer exists.
7. The cash tokens locked for the original redeem order remain locked indefinitely. There is no mechanism to unlock them because the redeem order is FILLED (not PENDING/CANCELLED).
8. If the redeem side is cancelled instead, the subscribe order retains `amount = 0` with no dependency link. It can never be processed (amount 0 fails validation) and can never be filled. It sits permanently in the order book.

**Impact:** Investor tokens are permanently locked on-chain with no recovery mechanism. In a production environment managing institutional portfolios, locked tokens represent inaccessible client assets -- a regulatory and fiduciary breach.

**Recommendation:** (1) When cancelling one side of a swap, automatically cancel the linked order if PENDING. (2) Add a recovery function for locked cash tokens on orphaned orders. (3) Prevent swap order cancellation once the redeem side is FILLED (force settlement to completion).

---

### XF-08: CLOSED Fund Reactivation + Stale State Enables Ghost Fund Operations

**Severity:** HIGH

**Entry Point:** `FundLifecycleFacet.reactivateFund()` -- requires ROLE_ADMIN

**Affected Facets:** FundLifecycleFacet, FundManagementFacet, NavManagementFacet

**Compounding Findings:** A3-03 (reactivation bypasses safety checks), A3-05 (no fund existence validation on config changes), A3-13 (class reactivation doesn't check parent fund)

**Attack Chain:**

1. Fund F is closed (`totalSupply == 0` check passed). Its parent umbrella U is subsequently retired.
2. Admin calls `reactivateFund(adminAccount, fundId, ACTIVE)`. `validateFundStatusTransition` at `FundLifecycleFacet.sol:L48-52` only checks the current status is not already ACTIVE -- no umbrella status check (A3-03).
3. Fund F is now ACTIVE under RETIRED umbrella U.
4. Since Fund F is ACTIVE, `setDealingSchedule` works (requires fund active + ROLE_MANAGER). The manager sets a dealing schedule.
5. Investors cannot onramp cash to umbrella U (onramp checks `umbrella.exists && status != CLOSED`). But if the umbrella is RETIRED (not CLOSED), onramp may still succeed depending on the exact status check.
6. Even without onramp, if investors have residual cash tokens from before the umbrella was retired, they can submit subscribe orders. The fund's NAV is stale from before closure. `navUpdatedAt` may be very old, causing `dealingProcessState` to behave unpredictably.
7. Admin calls `reactivateClass(classId)` for all classes within Fund F. No parent fund check is needed since fund is now ACTIVE (A3-13), and no umbrella check exists.
8. The fund operates in an inconsistent state: active fund in a retired umbrella, with stale configuration data, stale prices, and potentially stale FX rates.

**Impact:** Reactivated "ghost" funds operate outside the intended lifecycle hierarchy. They can accept orders with stale pricing, mint/burn tokens, and process dealings without proper umbrella-level oversight. The umbrella retirement was intended to freeze all operations, but reactivation at the fund level bypasses this intent.

**Recommendation:** (1) When reactivating a fund to ACTIVE, require parent umbrella to be ACTIVE. (2) When reactivating a class, require parent fund to be ACTIVE. (3) When reactivating a fund, reset stale dealing schedules and require fresh NAV update before any orders can be processed.

---

### XF-09: Locked Token Double-Counting Bypasses Minimum Holding Limits

**Severity:** HIGH

**Entry Point:** `OrderManagementFacet.submitOrder()` -- requires ROLE_USER

**Affected Facets:** OrderManagementFacet, FundTokensFacet, OrderValidationFacet

**Compounding Findings:** A2-11 (holding value uses total balance including locked), A2-04 (redeem holding check underflow)

**Attack Chain:**

1. Investor holds 1000 tokens in class C with `minimumHoldingAmount = 200`. Current balance: 1000, locked: 0.
2. Investor submits redeem order for 500 tokens. Tokens are locked. Balance: 1000, locked: 500, available: 500.
3. `_getClassBalanceValue` at `OrderManagementFacet.sol:L975-993` calculates holding value using `balanceOf()` which returns 1000 (total balance, including locked). The minimum holding check sees `1000 - 500 = 500 >= 200`, passes.
4. Investor submits a **second** redeem order for 500 tokens. Balance: 1000, locked: 1000 (500 + 500), available: 0.
5. `_getClassBalanceValue` still returns 1000 (total balance). The check sees `1000 - 500 = 500 >= 200`, passes again. But the investor's **available** balance is now 0.
6. When both orders are processed in the next dealing, the investor's entire position is redeemed. Final balance: 0, which violates the 200 minimum holding requirement.

**Multiplied Exploitation:**
- The investor can submit N redemption orders, each for `(totalBalance - minimumHolding)` tokens, as long as `totalBalance` stays above the check threshold. Each order passes the minimum holding check independently.
- For the dual underflow case (A2-04): if order amounts are calculated using current dealing prices that have moved unfavorably, the subtraction `currentBalanceValue - orderValueInBaseTokens` can revert, preventing legitimate full redemptions during market stress.

**Impact:** Minimum holding requirements are completely ineffective for investors who submit multiple overlapping redemption orders. This allows investors to fully exit positions that should be restricted to maintain minimum subscription thresholds, violating fund prospectus rules and potentially causing regulatory issues.

**Recommendation:** Use `balanceOf(account, tokenId) - lockedBalance(account, tokenId)` (available balance) for all holding limit calculations. Add explicit check that the available balance after ALL pending orders satisfies the minimum holding.

---

### XF-10: Operator Proposal Griefing Blocks All Account Operations

**Severity:** HIGH

**Entry Point:** `AccountFacet.cancelProposal()` -- requires OPERATOR permission

**Affected Facets:** AccountFacet (self-contained but impacts all facets that use proposals)

**Compounding Findings:** A1-03 (operator cancels any proposal), A1-06 (threshold > operator count), A1-08 (unbounded pending proposals)

**Attack Chain:**

1. Account A has owner O and operators Op1, Op2, Op3 with multisig `operatorThreshold = 2`.
2. Op1 is compromised or turns malicious.
3. Owner O (or Op2/Op3) submits a critical transaction proposal (e.g., `processOrders`, `updateNav`, `cancelOrder`).
4. Op1 immediately calls `cancelProposal(A, proposalId)`. At `AccountFacet.sol:L800-826`, any wallet with at least OPERATOR permission can cancel any proposal. Op1 cancels it.
5. Owner re-submits. Op1 cancels again. This can continue indefinitely.
6. Op1 also submits junk proposals, growing the `accountPendingProposals` array (A1-08). Each junk proposal increases gas costs for all subsequent proposal operations.
7. Owner tries to remove Op1 via `removeOperator`. This itself requires going through `_validateAndPropose` and may need threshold confirmations. If Op1 cancels the removal proposal, the owner is stuck.

**Escape Path Analysis:** The owner can directly confirm and execute (single-signer path) if `ownerThreshold = 0`. But if `ownerThreshold > 0`, the owner's removal proposal needs N confirmations. Op1 can cancel each confirmation round.

**Impact:** A single compromised operator can permanently block all operations for their account, including fund management operations (if the account is a fund manager), NAV updates (if the account is a NAV updater), or settlements (if the account is a settlement operator). This is a denial-of-service on the entire account's capabilities.

**Recommendation:** (1) Restrict `cancelProposal` to the proposal's original proposer and the account owner. (2) Give the account owner an unconditional ability to remove operators without going through the proposal system. (3) Add a maximum pending proposal limit.

---

### XF-16: Management Fee Timestamp Advance on Non-Existent Class Poisons Future Classes

**Severity:** HIGH

**Entry Point:** `NavManagementFacet.updateNav()` triggers `FeeManagementFacet.mintAllPendingManagementFees()`

**Affected Facets:** FeeManagementFacet, FundManagementFacet, NavManagementFacet

**Compounding Findings:** A4-16 (fee loop iterates to non-existent class), A3-06 (first dealing createdAt=0)

**Attack Chain:**

1. Fund has `nextClassId = 3` (classes 1 [fee class] and 2 [user class] exist).
2. NAV update triggers `mintAllPendingManagementFees`. Loop at `FeeManagementFacet.sol:L165`: `for (uint16 i = 2; i <= nextClassId; i++)` iterates i=2 (existing class) and i=3 (non-existent class).
3. For i=3, `classId` points to a non-existent class. `lastMgmtFeeMintTs` is 0, `totalSupply` is 0. `_calculateManagementFee` returns 0 (totalSupply check at L353). Fee amount is 0.
4. **But**: at L173, `s.FundAdmin[0].classes[classId].lastMgmtFeeMintTs = timestamp` writes the current `navTimestamp` to storage for the non-existent class ID.
5. Later, the manager creates class 3 via `createShareClass`. The newly created class inherits `nextClassId = 3`, which is the same ID that now has a pre-written `lastMgmtFeeMintTs`.
6. When the next NAV update runs, the fee calculation for the new class 3 uses `lastMgmtFeeMintTs = previousNavTimestamp`. The time elapsed is only `(currentNavTimestamp - previousNavTimestamp)` instead of `(currentNavTimestamp - classCreationTimestamp)`. If class creation happened shortly after the previous NAV update, the first fee calculation period is truncated.
7. **Worse case**: If NAV updates happen frequently (daily) and the class is created months later, the pre-written timestamp means the class's entire history of fee-less existence is skipped. No fees are retroactively collected for the period between the timestamp write and the class creation.

**Combined with A3-06**: The first dealing's `createdAt = 0` makes it indistinguishable from non-existent in some code paths. If any code path uses `createdAt == 0` to check existence, the first dealing is treated as non-existent.

**Impact:** Fee collection for newly created classes is silently corrupted. The fund manager either loses fees (truncated collection period) or the system skips the initial fee-free grace period that should apply to new classes with no subscribers yet.

**Recommendation:** Change the loop bound to `i < nextClassId` (strict less-than). Verify class existence before writing to storage.

---

### XF-18: Dealing Token Conversion Rounding + Zero Output Drains Investor Holdings

**Severity:** HIGH

**Entry Point:** `FundManagementFacet.batchConvertDealingTokens()` -- requires ROLE_MANAGER

**Affected Facets:** FundManagementFacet, FundTokensFacet, NavManagementFacet

**Compounding Findings:** A3-07 (conversion rounding loss + zero output), A4-12 (multi-step price chain precision loss)

**Attack Chain:**

1. Manager calls `batchConvertDealingTokens(managerAccount, fundId, fromDealingId, toDealingId)` to merge two dealing vintages.
2. For each token holder, the conversion at `FundManagementFacet.sol:L791-802` performs:
   ```
   value = mulDiv(tokenAmount, fromPrice, PRECISION)  // Round down
   convertedAmount = mulDiv(value, PRECISION, toPrice)  // Round down again
   ```
3. The price calculation chain (A4-12) already introduces up to 4 wei of rounding error per step. The conversion adds 2 more rounding steps. Combined error: up to 6 wei truncation per conversion.
4. **Zero output attack**: If `fromPrice` is very small (e.g., a class that has been heavily diluted by fees, bringing dealing price to sub-PRECISION levels) or `toPrice` is very large, `convertedAmount` can round to 0.
5. The code at L795 only checks `if (tokenAmount == 0) continue`. There is no check for `if (convertedAmount == 0)`.
6. When `convertedAmount == 0`: The investor's tokens are burned (`burn(holder, fromDealingId, tokenAmount)`) but 0 tokens are minted (`mint(holder, toDealingId, 0, "")`). The investor loses their entire position.
7. For a class with dilution ratio approaching 1 (minimum), the dealing price approaches `adjustedFundPrice * PRECISION / 1 = adjustedFundPrice * 1e18`, which is enormous. If the target dealing has such a price, `convertedAmount = value * PRECISION / (adjustedFundPrice * 1e18)` rounds to 0 for any reasonable `value`.

**Impact:** Investors can lose their entire token holdings with zero compensation during dealing conversion. Even without the zero-output edge case, compounding rounding errors across many holders systematically reduce total converted value below the original total value, with the difference effectively burned (lost to the system).

**Recommendation:** (1) Revert if `convertedAmount == 0` and `tokenAmount > 0`. (2) Use a single `mulDiv(tokenAmount, fromPrice, toPrice)` to reduce rounding steps. (3) Add a slippage tolerance parameter allowing the manager to set a minimum output ratio.

---

## MEDIUM Attack Chains

---

### XF-11: ERC1155 Callback Reentrancy During Settlement Reads Inconsistent State

**Severity:** MEDIUM

**Entry Point:** `SettlementFacet.confirmCashFundSettlement()` triggers `FundTokensFacet.mint()` which calls `_checkOnERC1155Received()`

**Affected Facets:** SettlementFacet, FundTokensFacet

**Compounding Findings:** A5-04 (ERC1155 callback reentrancy during settlement), ARCH-04 (reentrancy lock usage unclear)

**Attack Chain:**

1. Settlement processes a subscribe settlement at `SettlementFacet._settleSubscribe` (L164-184).
2. Execution sequence: (a) `order.cashPendingSwap -= sourceAmount` at L175, (b) `unlockTokens(investor, sourceCash, sourceAmount)` at L180, (c) `burn(investor, sourceCash, sourceAmount)` at L181, (d) `mint(investor, targetCash, targetAmount, "")` at L182.
3. Between step (c) and step (d), the investor's source cash is burned but target cash is not yet minted. If the investor address is a contract that implements `onERC1155Received`, the callback from the `mint` in step (d) fires while the investor's portfolio is in an intermediate state.
4. The `reentrancyLock` in `AccountFacet._executeProposal` protects against re-entering the proposal execution path. However, the callback contract could: (a) Call view functions that read the intermediate state (burn completed but mint in-progress). (b) Call `safeTransferFrom` to transfer other tokens it holds. (c) Call `setApprovalForAll` to change operator approvals.
5. On a private blockchain, the risk is mitigated because external contract deployment is controlled. But if any whitelisted contract (e.g., a custody contract, a vault, or a fund-of-funds contract) implements `onERC1155Received` with state-reading logic, it could observe and act on inconsistent data.

**Impact:** Intermediate state observation during settlement. The practical exploitability depends on whether recipient addresses are contracts with callback logic. On a private chain with controlled participants, this is LOW risk. On a public chain deployment, this would be HIGH.

**Recommendation:** Use `_update` (without acceptance check) for internal settlement operations where the recipient is a known account address within the system.

---

### XF-12: View Function Information Leak Enables Targeted Social Engineering

**Severity:** MEDIUM

**Entry Point:** `AdminViewCallsFacet.getSystemOverview()`, `AdminViewCallsFacet.getRoleAssignments()`, `AdminViewCallsFacet.getAllAccounts()` -- no access control

**Affected Facets:** AdminViewCallsFacet, ManagerViewCallsFacet, AccountFacet

**Compounding Findings:** A6-03 (no access control on admin/manager views), A1-05 (no per-account freeze mechanism)

**Attack Chain:**

1. Attacker gains RPC access to a private blockchain node (e.g., as a legitimate but low-privilege participant, or through a compromised node).
2. Calls `getRoleAssignments()` to enumerate all admin wallets, NAV updater wallets, settlement operator wallets, and fund manager wallets with their fund assignments.
3. Calls `getAllAccounts()` to enumerate all account addresses, their owners, account types, and roles.
4. Calls `getSystemOverview()` to learn total AUM, fund count, and active fund details.
5. With this intelligence, the attacker can: (a) Target admin wallets for phishing/social engineering attacks. (b) Identify the NAV updater address and attempt to compromise its key management system (since it controls fund pricing). (c) Identify the settlement operator and target it for FX manipulation (per XF-02). (d) Map the complete governance structure of the platform.
6. Once a privileged role is compromised, there is no per-account freeze mechanism (A1-05) to quickly disable the compromised account. The only remedy is to remove the operator (which requires going through the proposal system, which may itself be griefed per XF-10).

**Impact:** Complete enumeration of the platform's governance structure, participant identity, and financial metrics by any party with RPC access. This information directly enables the privilege escalation attacks described in XF-03 (compromised manager), XF-02 (compromised settlement operator), and XF-06 (compromised NAV updater).

**Recommendation:** (1) Add role-based access control to sensitive view functions. (2) Implement a per-account freeze mechanism that can be activated by the diamond owner without going through the proposal system. (3) On the infrastructure side, restrict RPC access to authorized participants only.

---

### XF-13: Performance Fee Division-by-Zero Blocks Entire Fee Batch

**Severity:** MEDIUM

**Entry Point:** `FeeManagementFacet.batchMintPerformanceFees()` -- requires ROLE_MANAGER

**Affected Facets:** FeeManagementFacet, FundTokensFacet, NavManagementFacet

**Compounding Findings:** A4-02 (division by zero when dealing totalSupply is 0), A4-08 (post-dilution totalSupply in max fee check)

**Attack Chain:**

1. Fund has 5 classes, each with multiple dealings. Some dealings have been fully redeemed (totalSupply = 0) but still exist in storage.
2. Manager submits a performance fee batch that includes a dealing with totalSupply = 0 (perhaps inadvertently, or because the off-chain system did not filter empty dealings).
3. In `_processPerformanceFeeBatch` at `FeeManagementFacet.sol:L399`:
   ```solidity
   uint256 newDilutionRatio = Math.mulDiv(oldDilutionRatio, newTotalSupply, oldTotalSupply);
   ```
   `oldTotalSupply` is 0, causing `Math.mulDiv` to revert with division by zero.
4. The entire batch transaction reverts, preventing performance fee collection for ALL dealings in ALL classes in the batch.
5. A strategic adversary with manager access could include one empty dealing in every batch, blocking all performance fee collection indefinitely.
6. **Compounding with A4-08**: Even if the zero-supply dealing is removed, the max fee validation at L416-418 uses `dealingPrice` calculated from the post-dilution ratio (updated at L401) but `totalSupply` from pre-mint state. This inconsistency makes the safety check either too strict (blocking valid fees) or too lenient (allowing excess fees) depending on the direction of the error.

**Impact:** All performance fee collection for a fund can be blocked by including one empty dealing in the batch. This is a denial-of-service on the fee system. The manager loses earned performance fees, and if the window period expires (per `setWindowDays`), the fees may be permanently forfeitable.

**Recommendation:** (1) Add `if (oldTotalSupply == 0) { if (feeAmount > 0) revert; continue; }` before the dilution calculation. (2) Calculate dealing price and max fee before updating the dilution ratio to use consistent state.

---

### XF-14: Portfolio Event Reconstruction Fails on Multi-Operation Blocks

**Severity:** MEDIUM

**Entry Point:** `ViewCalls2Facet.getPortfolioEvents()` -- no access control (view function)

**Affected Facets:** ViewCalls2Facet, FundTokensFacet, SettlementFacet

**Compounding Findings:** A6-05 (getPortfolioEvents reverts on unmatched transfers), A6-10 (fragile same-block ordering)

**Attack Chain:**

1. An investor performs multiple operations in the same block: (a) Subscribe to Fund A, (b) Subscribe to Fund B, (c) Redeem from Fund C.
2. Transfers are recorded in order: burn cash A, burn cash B, burn dealing C, mint dealing A, mint dealing B, mint cash C.
3. `_constructEventsFromTransfers` at `ViewCalls2Facet.sol:L501-564` relies on strict adjacency matching: a subscribe is expected as (cash burn at index i, dealing mint at index i+1) in the same block.
4. With the actual ordering (burn A, burn B, burn C, mint A, mint B, mint C), the pattern matcher at index 0 sees (burn A, burn B) which does not match subscribe pattern (burn, then mint of different type).
5. The transfer at index 0 falls through all pattern checks, reaching `if (!r.matched) revert UnmatchedTransfer(i)` at L584.
6. The entire `getPortfolioEvents()` call reverts. The investor cannot view any portfolio history.
7. This condition is permanent for that account -- any future call to `getPortfolioEvents` will always fail because the unmatched historical transfers cannot be changed.

**Amplification:** Settlement operations (via SettlementFacet) create additional transfers (unlock source, burn source, mint target, lock target) that further complicate the pattern matching within a single block.

**Impact:** Portfolio event reconstruction is permanently broken for any account that has had multiple operations in the same block. This is a denial-of-service on the portfolio history feature. For institutional clients requiring audit trails, this could be a compliance issue.

**Recommendation:** (1) Replace the strict-adjacency matching with a lookahead within the same block number. (2) Use an UNKNOWN event type instead of reverting on unmatched transfers. (3) Consider adding a correlation ID to transfers at creation time to enable reliable matching.

---

### XF-15: Unbounded Array Growth Compounds Across Facets for Gas DoS

**Severity:** MEDIUM

**Entry Point:** Normal system operation (submissions, transfers, fee mints, settlements)

**Affected Facets:** FundTokensFacet, OrderManagementFacet, FeeManagementFacet, ViewCallsFacet, AdminViewCallsFacet, ManagerViewCallsFacet

**Compounding Findings:** A5-07 (transfer history), A1-08 (pending proposals), A6-07 (_sumFees), A6-08 (getTransfers ALL_USERS)

**Attack Chain:**

1. **Transfer history** (`FundTokensFacet`): Every mint, burn, and transfer appends to `s.FundTokens[0].transfers` (global) and `userTokenTransferIndices[user][tokenId]` (per-user). Never pruned. After 1 year of daily NAV updates + fee mints + order processing across 10 funds with 100 investors, estimated array size: ~365 * 10 * 100 * ~3 operations = ~1.1M entries.
2. **Fee history** (`FeeManagementFacet`): `feeHistory[classId]` grows by 1 per class per NAV update. After 5 years of daily updates with 50 classes: ~91K entries. `_sumFees` in ManagerViewCallsFacet iterates the entire array with no pagination (A6-07).
3. **Pending proposals** (`AccountFacet`): If proposals are submitted but not promptly confirmed/cancelled, the `accountPendingProposals` array grows. `_removeProposalFromAccountPendingList` at L1009-1018 performs linear scan for removal.
4. **Order book** (`OrderManagementFacet`): `orderBook[fundId].tail` increments forever. Cancelled/filled orders remain in storage. `_getOrderBookSize` returns total historical count (A6-02).
5. **View function compound effect**: `getSystemOverview()` calls `_getOrderBookSize` for every fund. `getFundSummaries()` calls `_sumFees` for every class. `getTransfers(ALL_USERS, ...)` scans the entire global transfer array. As each array grows independently, the combined gas cost of admin dashboard queries grows super-linearly.
6. Eventually, critical view functions exceed block gas limits (even on a private chain with higher limits), causing dashboard failures and operational blindness.

**Impact:** Progressive degradation of system usability. View functions become increasingly expensive and eventually unusable. On-chain operations (fee minting, order processing) that iterate these arrays also degrade. The system lacks any pruning, pagination (at the storage level), or archival mechanism.

**Recommendation:** (1) Add running accumulators for frequently-summed values (e.g., `totalFeesMinted` per class). (2) Implement pagination at the storage level, not just the view function level. (3) Add optional pruning functions for zero-balance holdings and completed orders. (4) Set maximum array size limits where feasible.

---

### XF-17: Adjustment Splitting Bypasses maxAdjustmentBps Safety Check

**Severity:** MEDIUM

**Entry Point:** `ClassAdjustmentFacet.postClassAdjustment()` -- requires ROLE_ADMIN

**Affected Facets:** ClassAdjustmentFacet, NavManagementFacet

**Compounding Findings:** A4-07 (aggregation of opposing adjustments), A4-11 (classValue uses stale price)

**Attack Chain:**

1. `maxAdjustmentBps` is set to 500 (5% of class value) for safety.
2. An admin (or compromised admin) wants to apply a 20% cost to a class (far exceeding the 5% limit).
3. Admin posts 4 separate adjustments of 5% each, all for the same class, in the same pending queue.
4. During NAV update, `_processAllPendingAdjustments` at `NavManagementFacet.sol:L263` aggregates per-class net amounts at L271-295. The 4 adjustments for the same class are summed: `netAmounts[classIdx] = 5% + 5% + 5% + 5% = 20%`.
5. The `maxAdjBps` check at L331-341 compares the **net** amount against the limit:
   ```solidity
   uint256 adjBps = Math.mulDiv(absAmount, BPS_DENOMINATOR, classValue);
   if (adjBps > maxAdjBps) revert ...;
   ```
6. The net 20% adjustment exceeds the 5% limit, so it correctly reverts in this case.

**However**, the bypass works with opposing adjustments:
7. Admin posts: +20% cost adjustment and -15% gain adjustment for the same class. Each individually is within 5% of class value if class value is large enough relative to the adjustment amount (this depends on the class's NAV).
8. The net is +5%, which passes the maxAdjBps check. But the gross impact is 35% of class value churned through the dilution system.
9. The dilution calculation at L347-350 applies the net change, not the gross. So the 35% gross churn does not directly cause extra dilution. But the audit trail records both adjustments, and the fund-level dilution calculation at L316-317 uses `totalNetAdjustment` which is also the net.

**Revised Assessment:** The net-based check correctly limits the final economic impact. The gross churn is an audit trail concern rather than a value extraction vector. Downgrade to MEDIUM.

**Impact:** The maxAdjBps safety check operates on net amounts, which correctly limits the economic impact. However, large opposing adjustments that net to within the limit can be used to obfuscate the audit trail (large adjustments appear individually but net to a small change). This could mask economic manipulation in compliance reviews.

**Recommendation:** Apply `maxAdjBps` to the gross total (sum of absolute values) of all adjustments per class per NAV cycle, not just the net. This prevents audit trail obfuscation.

---

## Cross-Cutting State Machine Analysis

### Dealing State Machine Violations

The dealing state machine (IDLE -> AWAITS_NAV_UPDATE -> PROCESSING -> IDLE) has several cross-facet violation paths:

1. **PROCESSING state lock** (XF-04 Scenario A): If `processOrders` reverts after the state enters PROCESSING but before `nextDealingTimestamps.pop()`, the fund is permanently stuck. Recovery requires diamond owner to add a new facet with a recovery function.

2. **State race between NAV update and order processing**: `dealingProcessState` reads `nextDealingTimestamps` and `navUpdatedAt` to determine state. Between `updateNav` (which sets `navUpdatedAt`) and `processOrders` (which pops the timestamp), the state is PROCESSING. If another NAV update is attempted during this window, it correctly reverts with `DealingNotAwaitsNavUpdate`. This is correct behavior.

3. **Zero-order skip** (XF-04 Scenario B): Calling `processOrders` with an empty array transitions PROCESSING -> IDLE without processing any orders. This is by design but undocumented and has no event.

### Token Flow Invariants

The complete subscribe flow:
```
submitOrder (lock cash) ->
  [if cross-umbrella: settlement (burn source cash, mint+lock target cash)] ->
  processOrders (unlock cash, burn cash, mint dealing tokens)
```

The complete redeem flow:
```
submitOrder (lock dealing tokens) ->
  processOrders (unlock dealing, burn dealing, mint+lock cash) ->
  [if cross-umbrella: settlement (unlock source cash, burn source, mint target)]
```

**Invariant violations identified:**
- XF-07: Swap cancellation breaks the linked flow, leaving tokens locked.
- XF-05: Fee minting inserts tokens without updating fund totalSupply, breaking the `sum(class.totalSupply) == fund.totalSupply` invariant.
- XF-01: NAV update processes adjustments and fees before storing the new NAV, meaning all intermediate calculations use stale data.

### Privilege Escalation Summary

| Start Role | Target Capability | Chain | Severity |
|-----------|-------------------|-------|----------|
| ROLE_MANAGER | Drain all investor funds | XF-03 (force redeem + uncapped perf fee) | CRITICAL |
| ROLE_MANAGER | Freeze fund permanently | XF-04 (dealing schedule manipulation) | CRITICAL |
| ROLE_SETTLEMENT | Extract FX differential | XF-02 (FX bypass) | CRITICAL |
| ROLE_NAV_UPDATER | Inflate/deflate fund prices | XF-01 (stale data cascade) + A4-10 (first NAV no safety) | HIGH |
| ROLE_ADMIN | Reactivate dead fund | XF-08 (ghost fund reactivation) | HIGH |
| ROLE_ADMIN | Bypass fee safety caps | A4-04 (maxMgmtFeeRateBps not enforced) | HIGH |
| OPERATOR | Block account operations | XF-10 (proposal griefing) | HIGH |
| ROLE_USER | Bypass holding limits | XF-09 (locked token double-count) | HIGH |
| RPC access | Enumerate all participants | XF-12 (view function leak) | MEDIUM |

---

## Recommendations Priority Order

### Immediate (Block deployment)
1. **Fix fund totalSupply update** after fee minting (XF-01, XF-05, A4-03)
2. **Fix FX validation bypass** via actualFxRate=0 (XF-02, A5-09)
3. **Enforce MAX_ADJUSTED_FEE_RATE_BPS** at order processing (XF-03, A2-02)
4. **Validate dealing schedule** timestamps (XF-04, A3-01)

### Before Production
5. **Enforce maxMgmtFeeRateBps** at class creation (A4-04)
6. **Fix NAV processing order**: store NAV before adjustments+fees (XF-01, A4-05)
7. **Add FX rate staleness check** at read time (XF-06, A5-03)
8. **Set non-zero FX safety config defaults** (A5-05)
9. **Auto-cancel linked swap order** on cancellation (XF-07, A2-07)
10. **Add lifecycle hierarchy checks** for reactivation (XF-08, A3-03, A3-13)

### Short-Term
11. **Restrict cancelProposal** to proposer/owner (XF-10, A1-03)
12. **Use available balance** for holding checks (XF-09, A2-11)
13. **Fix fee loop bound** to `< nextClassId` (XF-16, A4-16)
14. **Add zero-output check** in dealing conversion (XF-18, A3-07)
15. **Add access control** to admin/manager views (XF-12, A6-03)
16. **Fix portfolio event matching** for multi-operation blocks (XF-14, A6-10)
17. **Add storage pruning/pagination** mechanisms (XF-15)
18. **Apply maxAdjBps to gross amount** (XF-17, A4-07)
