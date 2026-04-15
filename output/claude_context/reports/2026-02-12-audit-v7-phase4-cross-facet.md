# V7 Audit — Phase 4: Cross-Facet Attack Chain Analysis

**Date:** 2026-02-12
**Method:** sequential-thinking MCP for structured attack chain reasoning

---

## TIER 1 — CRITICAL Attack Chains

### XF-01: Fee Minting → Price Inflation Cascade (SELF-AMPLIFYING)

**Root Cause:** `FeeManagementFacet` never updates `baseInfo[fundId].totalSupply` during fee minting (management or performance).

**Chain:**
```
FeeManagementFacet.mintAllPendingManagementFees()
  → FundTokensFacet.mint() updates ERC1155 totalSupply ✓
  → baseInfo[feeClassId].totalSupply updated ✓
  → baseInfo[fundId].totalSupply NOT updated ✗
    → NavManagementFacet.calculateFundPrice() reads stale denominator
      → Inflated fund price propagates to ALL class prices
        → OrderManagementFacet uses inflated prices for subscriptions
          → Inflated prices trigger MORE performance fees (phantom gains)
            → More fee mints → MORE divergence (POSITIVE FEEDBACK LOOP)
```

**Compounding Rate:** ~1% per NAV cycle (at 1% management fee). After 50 cycles: 64% price inflation.

**Impact:** Complete pricing cascade corruption. New subscribers overpay. Existing investors have phantom gains. Performance fees triggered on non-existent gains.

**References:** Agent 4 V7-C-01, V6-C-01, E-BC25

---

### XF-02: Manager Fund Drain (Uncapped Perf Fee + Forced Redemption)

**Root Cause:** `OrderManagementFacet` line 429 allows `perfFeeBps` up to 10000 (100%). `MAX_ADJUSTED_FEE_RATE_BPS=2000` is dead code.

**Chain:**
```
Manager: FundLifecycleFacet.forceRedeemInvestor(victim)
  → Creates order with isForcedRedemption=true (victim cannot cancel)
Manager: OrderManagementFacet.processOrders(perfFeeBps=10000)
  → _validateOrderPreconditions: 10000 <= 10000 ✓ (PASSES)
  → _calculateOrderResults: 100% fee deduction
    → FundTokensFacet.burn(victim, entire position)
    → FundTokensFacet.mint(feeClass, entire value to manager)
  → Investor receives: 0
```

**Impact:** Complete investor fund drain. No consent required (forced redemption). Single-manager funds are especially vulnerable.

**References:** Agent 3 V7-H-02, Agent 4 V7-C-02, V6-C-03, E-BC28

---

### XF-03: Partial Fill TokenId Mutation → Phantom Dealing Cascade

**Root Cause:** `OrderManagementFacet` line 302 permanently mutates `order.tokenId` from classId to dealingId on first partial fill.

**Chain:**
```
Batch 1: processOrders (partial fill)
  → line 302: order.tokenId = dealingId (PERMANENT mutation)

Batch 2: processOrders (remaining fill)
  → line 293: getClassNum(dealingId) → correct classNum
  → line 296: createDealing(dealingId, ...) → dealingId treated as classId
    → FundManagementFacet: classes[dealingId].nextDealingId++ (PHANTOM CLASS)
    → New dealing created under phantom class ID
  → line 1151: classId = dealingId (for price calculation)
    → NavManagementFacet.calculateClassPrice(dealingId) reads dealing's dilutionRatio
      → WRONG class price → WRONG subscription amount
        → FundTokensFacet.mint() under phantom dealing
```

**Impact:** Normal partial-fill operation produces: (1) wrong prices, (2) phantom class entries in storage, (3) tokens minted under phantom dealings, (4) silent NAV corruption.

**References:** Agent 3 V7-C-01, E-BC22

---

### XF-04: FX Validation Triple Bypass

**Root Cause:** Three independent FX bypass vectors that compound.

**Path A — Settlement Zero-Rate Bypass:**
```
SettlementFacet.confirmCashFundSettlement(actualFxRate=0)
  → line 86: effectiveFxRate = PRECISION (1:1)
  → line 90: if (PRECISION != PRECISION) → FALSE → SKIP all validation
  → Cross-currency settlement at 1:1 (e.g., 1 EUR = 1 JPY instead of 162)
```

**Path B — Order Processing Wrong Comparison:**
```
OrderManagementFacet._processOrdersImpl(fxRateToFund=GBP→EUR cross-rate)
  → line 509: validateFxRateDeviation(GBP, crossRate)
  → FXManagementFacet: compares crossRate against fxRegistry[GBP].rateVsUSD
  → GBP→EUR (~1.17) compared against GBP→USD (~1.27) → DIFFERENT QUANTITIES
  → Meaningless check: manipulated rates can pass
```

**Path C — Zero Safety Config:**
```
InitDiamond: fxSafetyConfig never set → {0, 0}
  → FXManagementFacet line 78: if (maxChangeBps > 0) → FALSE → skip
  → FXManagementFacet line 225: if (maxDeviationBps == 0) return → skip
  → ALL FX validation disabled by default
```

**Combined:** Fresh deployment + settlement operator = arbitrary FX rates on all cross-currency operations.

**Impact:** Massive investor losses on cross-currency settlements. EUR/JPY at 1:1 = 99.4% loss.

**References:** Agent 5 V7-H-02, Agent 3 V7-H-01, Agent 5 V7-M-01, V6-C-02, E-BC26

---

## TIER 2 — HIGH Attack Chains

### XF-05: ERC1155 Direct Transfer Reentrancy

**Chain:** `FundTokensFacet.safeTransferFrom()` → `onERC1155Received` callback → any Diamond facet callable during incomplete transfer tracking.

**Mitigation:** Token balances are updated before callback (CEI). The reentrancyLock only protects proposal execution, not direct transfers.

**Impact:** Cross-facet operations during callback may observe inconsistent transfer history and holdings tracking.

**References:** Agent 5 V7-H-03, Agent 1 A1-V7-01

---

### XF-06: Dealing Schedule State Machine Freeze

**Chain:** `FundManagementFacet.createDealing()` accepts any timestamps → invalid dealing state → `OrderManagementFacet._processOrdersImpl()` checks dealing status → orders blocked.

**Impact:** Fund operations frozen indefinitely if dealing enters invalid state.

**References:** Agent 2 V7-A2-01, V6-C-05

---

### XF-07: Proposal Threshold Live Recalculation

**Chain:** `AccountFacet.confirmTransaction()` recalculates threshold from current config → threshold change during pending confirmations → unexpected auto-execution or permanent blocking.

**Impact:** Proposals execute or become unexecutable based on config changes made after confirmation.

**References:** Agent 1 A1-V7-02

---

### XF-08: NAV Update Stale Price in Adjustment Validation

**Chain:** `NavManagementFacet._processAllPendingAdjustments(newNav)` → `calculateFundPrice(fundId)` reads OLD nav from storage → class-level safety check uses wrong class value.

**Impact:** Over-sized adjustments pass validation when NAV decreases significantly.

**References:** Agent 4 V7-H-01, V6-XF-01

---

## TIER 3 — MEDIUM/LOW Chains

### XF-09: Cross-Umbrella Settlement FX Amplification
Cross-umbrella swaps inherit all FX bypass vectors from XF-04. Fund isolation is breached by design for swaps.

### XF-10: Eligibility TOCTOU
Mitigated by re-check at processing time via `EligibilityFacet.isEligible()`. Low residual risk.

---

## Summary

| ID | Chain | Severity | Self-Amplifying |
|----|-------|----------|-----------------|
| XF-01 | Fee → Price Inflation Cascade | CRITICAL | YES |
| XF-02 | Uncapped Fee + Forced Redemption | CRITICAL | No |
| XF-03 | TokenId Mutation → Phantom Dealing | CRITICAL | No |
| XF-04 | FX Triple Bypass | CRITICAL | No |
| XF-05 | ERC1155 Reentrancy | HIGH | No |
| XF-06 | Dealing Schedule Freeze | HIGH | No |
| XF-07 | Proposal Threshold Manipulation | HIGH | No |
| XF-08 | NAV Stale Price Cascade | HIGH | No |
| XF-09 | Cross-Umbrella FX Amplification | MEDIUM | No |
| XF-10 | Eligibility TOCTOU | LOW | No |
