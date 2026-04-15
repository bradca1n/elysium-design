# Audit V8 — Phase 4: Cross-Facet Attack Chain Analysis
<!-- 2026-03-02 | mcp__sequential-thinking__sequentialthinking -->

## Method

5 attack chains from the plan + 2 discovered during analysis were traced using sequential-thinking MCP, incorporating all findings from agents 1-6.

---

## Chain 1: ARCH-01 Privilege Escalation via internalExecutionContext Bypass

**Severity:** CRITICAL
**Facets involved:** AccountFacet → FundTokensFacet → ANY execute* function
**E-BC references:** ARCH-01, E-BC20, E-BC24

### Full Attack Path

```
1. Attacker deploys malicious contract implementing ERC1155Receiver
2. Attacker becomes an investor in any fund (legitimate subscribe order)
3. Fund admin processes orders via executeProcessOrders
4. _executeProposal: reentrancyLock=true, internalExecutionContext=true
5. _executeOrderTransfer → FundTokensFacet.mint(attacker_contract, ...)
6. Diamond calls attacker_contract.onERC1155Received(...)
7. During callback: internalExecutionContext=true, reentrancyLock=true

ATTACK VECTOR A — Add self as operator on admin account:
8. attacker_contract calls Diamond.executeAddOperator(adminAccount, attacker)
   - onlyInternalExecution: PASSES (internalExecutionContext=true)
   - reentrancyLock: NOT CHECKED in executeAddOperator
9. attacker_contract calls Diamond.executeSetMultisigConfig(adminAccount, threshold=1)
10. Attacker now has full control of the admin account with no multisig

ATTACK VECTOR B — Create rogue fund with attacker-controlled manager:
8. attacker_contract calls Diamond.executeCreateFund(adminAccount, encodedFundData)
   - Fund created bypassing ROLE_ADMIN requirement
9. executeOnramp called to mint unlimited cash tokens
10. executeSetDealingSchedule called with past timestamp → instant processing
```

### Impact Assessment

- Complete bypass of the multisig governance system
- Can be triggered by ANY ERC1155 mint: order processing, fee minting, onramp, settlement
- The attack window occurs in high-frequency normal operations (every order fill)
- If attacker is an investor (legitimate) who controls a smart contract wallet, this is fully exploitable

### Mitigation

```solidity
modifier onlyInternalExecution() {
    if (!s.internalExecutionContext) revert NotInternalExecution();
    if (s.reentrancyLock) revert ReentrancyDetected();  // ADD THIS
    _;
}
```
Or implement a diamond-level `nonReentrant` guard in the DiamondProxy fallback function.

---

## Chain 2: E-BC20 Double-Settlement — RESOLVED

**Severity:** FIXED (residual ARCH-01 vector)
**Facets involved:** AccountFacet → SettlementFacet → FundTokensFacet

### Analysis

The original E-BC20 attack (re-enter via `confirmCashFundSettlement → _executeProposal`) is **FIXED**:
- `reentrancyLock` is `true` during `_executeProposal` execution
- A second `confirmCashFundSettlement → _validateAndPropose → _executeProposal` call hits the lock and reverts
- The CEI fix in E-BC21 ensures `cashPendingSwap` is decremented BEFORE token operations

**Residual:** The ARCH-01 variant (calling `executeConfirmCashFundSettlement` directly during ERC1155 callback) is NOT blocked by `reentrancyLock`. However, the `cashPendingSwap > 0` check prevents double-settling the same order. An attacker using ARCH-01 during settlement would need to target a DIFFERENT order with pending settlement.

**Verdict:** E-BC20 FIXED for double-settlement. ARCH-01 is the more severe, related finding.

---

## Chain 3: Partial Fill × Dual TotalSupply → Cascading Price Corruption

**Severity:** HIGH
**Facets involved:** OrderManagementFacet → FundTokensFacet → NavManagementFacet → FeeManagementFacet
**E-BC references:** E-BC22 × E-BC25

### Compound Attack Path

```
1. Investor submits large subscribe order for Class 1, Fund A
   order.tokenId = class1Id (e.g., 0x0001_0001_0002_0000)

2. _processOrdersImpl: assigns dealing
   order.tokenId = dealing1Id (e.g., 0x0001_0001_0002_0001) ← MUTATION (E-BC22)

3. Partial fill: maxFillAmount < order.amount
   Tokens minted for partial amount using CORRECT price (first dealing round)

4. Next dealing round: order.tokenId = 0x0001_0001_0002_0001 (dealing1Id stored as classId)
   _calculateOrderPrices(dealing1Id, SUBSCRIBE, fundPrice)
   SUBSCRIBE branch: classId = dealing1Id (WRONG — should be class1Id)
   calculateClassPrice(dealing1Id) reads baseInfo[dealing1Id].dilutionRatio

5. dealing1Id.dilutionRatio ≠ class1Id.dilutionRatio
   → classPrice is WRONG
   → targetAmount (tokens minted) is WRONG

6. FundTokensFacet.mint(investor, dealing1Id, wrongAmount)
   FundTokensStorage.totalSupply[dealing1Id] += wrongAmount
   baseInfo[dealing1Id].totalSupply += wrongAmount ← BOTH diverge from correct value

7. Next NAV update: calculateDealingPrice reads baseInfo[dealing1Id].totalSupply
   Price based on corrupted totalSupply → wrong price for ALL dealing holders

8. mintAllPendingManagementFees reads baseInfo[classId].totalSupply for fee calculation
   Class-level totalSupply cascades wrong amount → all management fees in that class are affected
```

### Impact

- Systematic pricing error for all partial-fill orders across multiple dealing rounds
- Error propagates from dealing-level into class-level fee calculations
- Any investor intentionally creating large orders that guarantee partial fills can manipulate pricing

### Mitigation

Store original classId separately in the Order struct. Never overwrite `order.tokenId` with dealingId.

---

## Chain 4: NAV Timestamp Manipulation → Management Fee Skip (E-BC29 Residual)

**Severity:** MEDIUM (E-BC29 FIXED, but V8N-01 + V8N-12 residual)
**Facets involved:** NavManagementFacet → FeeManagementFacet
**E-BC references:** E-BC29 (FIXED), V8N-01, V8N-12

### Analysis

**E-BC29 FIXED:** The primary cascade (fees using stale NAV from previous period) is fixed. `mintAllPendingManagementFees` is called in `_updateNavInternal` using the `newNav` parameter, not the stored value, for the fee-per-share calculation.

**V8N-01 RESIDUAL:** Management fees are still calculated with the OLD stored nav because `calculateFundPrice(fundId)` inside `mintAllPendingManagementFees` reads the stored nav BEFORE it is updated (line 243). The systemic effect: in bull markets, management fees are consistently understated (old lower NAV used); in bear markets, fees are overstated.

**V8N-12 ATTACK PATH:**
```
1. ROLE_NAV_UPDATER submits navTimestamp = (current navUpdatedAt - 1)
   - No safety config set (E-BC18 default zero): maxTimestampDeviation = 0 → check disabled
   - No forward-only check exists
2. mintAllPendingManagementFees: timestamp <= lastTs → SKIP fee minting for all classes
3. NAV update completes without charging any management fees for the period
4. Investors receive free period without fee deduction
```

This is a **MEDIUM** severity attack (requires compromised ROLE_NAV_UPDATER, but harms the fund manager's fee income rather than investors).

---

## Chain 5: FX Rate Manipulation → Cross-Currency Fund Drain

**Severity:** HIGH
**Facets involved:** FXManagementFacet → OrderManagementFacet → SettlementFacet
**E-BC references:** E-BC26 × V8-A5-09 × V8-A5-02

### Compound Attack Path (Default Deployment)

```
Default deployment: fxSafetyConfig never set → maxFxRateChangeBps=0, maxFxSettlementDeviationBps=0

1. ROLE_FX_UPDATER (compromised) calls executeUpdateFXRates
   rate for EUR: 1000e18 (should be ~1.08e18)
   - E-BC26: maxFxRateChangeBps=0 → safety check SKIPPED
   - V8-A5-09: existingRate=0 (first update) → no baseline deviation check
   Rate stored: fxRegistry[EUR].rateVsUSD = 1000e18

2. Admin submits order for EUR class → USD fund (normal operation)
   _calculateOrderResults: fxRateToFund submitted by admin

3. In OrderManagementFacet:512-513 (V8-A5-02):
   getFXRate(EUR, USD) → returns 1000e18 ← RETURN VALUE DISCARDED
   validateFxRateDeviation(EUR, adminFxRate):
     compares adminFxRate against fxRegistry[EUR].rateVsUSD = 1000e18
     If adminFxRate ≈ 1000e18: deviation check PASSES (wrong comparison)
     Meanwhile: actual EUR/USD market rate = ~1.08e18

4. Order processed with 1000x EUR→USD conversion rate
   Investor receives ~1000x the fund tokens they should
   Fund NAV diluted ~1000x for all other investors

5. Settlement: maxFxSettlementDeviationBps=0 → settlement FX deviation DISABLED
   Settlement proceeds at any rate, locking in the manipulated conversion
```

### Impact

Complete cross-currency fund drain. Only affects multi-currency funds (EUR class / USD fund or similar). Requires compromised ROLE_FX_UPDATER — a high-privilege but non-multisig role.

### Mitigation

1. Initialize fxSafetyConfig with non-zero defaults in InitDiamond (fix E-BC26)
2. Fix OrderManagementFacet:512-513 to use getFXRate return value for deviation validation
3. Add a staleness check in getFXRate (V8-A5-04)

---

## Chain 6: Adjustment Queue Saturation → NAV Deadlock (NEW CROSS-FACET FINDING)

**Severity:** HIGH
**Facets involved:** ClassAdjustmentFacet → NavManagementFacet → FeeManagementFacet
**E-BC references:** V8A4-M01 × V8N-03 × V8N-07 (NEW compound)
**Finding ID:** V8-CF01

### Attack Path

```
1. ROLE_MANAGER fills adjustment queue with 100 adjustments that individually pass
   validateClassAdjustment (amount < MAX_PENDING_ADJUSTMENTS, size < MaxUint128)
   but collectively exceed maxAdjustmentBps per class (V8A4-M01)

2. executeUpdateNav called → _processAllPendingAdjustments
   Aggregate net per class exceeds maxAdjustmentBps → REVERT
   The entire NAV update transaction fails

3. Fund is stuck: cannot advance to price calculations, cannot mint fees, cannot process orders

4. Admin must manually cancel all 100 adjustments via executeCancelAdjustment
   (100 separate multisig proposals and confirmations required for recovery)

5. COMPOUND: If the fund was in AWAITS_FEE_PROCESSING state (V8N-03):
   - riskAdjustorFacet removed from Diamond (V8N-07 fail-open triggered)
   - executeCalculateRedemptionPerfFees reverts due to risk adjustor staticcall fail
   - redemptionFeesCalcAtNavT is never updated
   - Fund cannot advance to PROCESSING state
   - Fund cannot receive a new NAV update (wrong state)
   - DEADLOCK: requires contract upgrade to recover
```

### Why This Is Cross-Facet (Not in Any Agent's Report)

- Agent 4 found V8A4-M01 independently
- Agent 3 found V8N-03 independently
- Agent 3 found V8N-07 independently
- NO agent traced the compound interaction where all three combine to create an irrecoverable deadlock

### Mitigation

1. Enforce maxAdjustmentBps per-adjustment at posting time (fixes V8A4-M01, prevents queue saturation)
2. Add admin emergency function to force-advance dealing state (fixes V8N-03)
3. Change risk adjustor to fail-closed with admin override (fixes V8N-07)

---

## Chain 7: Multisig Threshold Lowering → Retroactive Proposal Rushing

**Severity:** HIGH
**Facets involved:** AccountFacet
**E-BC references:** V8-A1-M03

### Attack Path

```
1. Account has threshold=3 (3-of-N multisig)
2. Operator A submits proposal for high-value operation
3. Operators B and C confirm (2 confirmations recorded)
4. BEFORE 3rd confirmation: account OWNER calls executeSetMultisigConfig(threshold=1)
5. executeConfirmTransaction called by any operator:
   requiredThreshold = _getRequiredThreshold(...) → returns 1 (NEW threshold)
   proposal.confirmations (=2) >= 1 → EXECUTES immediately
6. High-value operation executes with effectively 1/1 (just the owner's multisig change)
```

### Prerequisite

Requires malicious or compromised account OWNER (highest trust level). In B2B context: fund manager or admin. This is a collusion attack between the owner and one operator to bypass the intended threshold.

### Mitigation

Use `proposal.requiredThreshold` (stored at proposal creation) rather than re-computing at confirmation time.

---

## Phase 4 Summary

| Chain | Severity | Status | Key Facets |
|-------|----------|--------|------------|
| 1: ARCH-01 Escalation | CRITICAL | OPEN | AccountFacet → Any execute* |
| 2: E-BC20 Double-Settlement | FIXED | — | SettlementFacet |
| 3: E-BC22 × E-BC25 Price Cascade | HIGH | OPEN | OrderManagement → NAV → Fee |
| 4: NAV Timestamp Manipulation | MEDIUM | OPEN (residual) | NavManagement → Fee |
| 5: FX Rate Drain (E-BC26+V8-A5-02) | HIGH | OPEN | FXManagement → OrderManagement |
| 6: Adjustment Queue Deadlock (NEW) | HIGH | OPEN | Adjustment → NAV → Fee |
| 7: Threshold Retroactive Change | HIGH | OPEN | AccountFacet |

**New Finding:** V8-CF01 (Chain 6 — Adjustment Queue → NAV Deadlock) is a genuinely new cross-facet finding not discovered by any individual agent.

---

*Generated: 2026-03-02 | mcp__sequential-thinking__sequentialthinking*
