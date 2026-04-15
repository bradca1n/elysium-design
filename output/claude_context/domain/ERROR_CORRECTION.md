# Error Correction & NAV Restatement

<!-- ~6500 tokens -->
**Last Updated:** 2026-02-12

---

## Table of Contents

1. [Error Propagation Mechanics](#1-error-propagation-mechanics)
2. [Error Types by Calculation Chain Position](#2-error-types-by-calculation-chain-position)
3. [Correction Approaches](#3-correction-approaches)
4. [Performance Fee Correction Complexity](#4-performance-fee-correction-complexity)
5. [Compensation Asymmetry](#5-compensation-asymmetry)
6. [Elysium On-Chain Considerations](#6-elysium-on-chain-considerations)
7. [Cross-References](#7-cross-references)

---

## 1. Error Propagation Mechanics

When a NAV error is discovered on a historical date, the error has typically propagated through multiple downstream calculations. The propagation cascade:

```
Original Error (Day T)
    |
    +-- NAV per share wrong on Day T
    |     +-- Subscriptions on Day T priced incorrectly
    |     +-- Redemptions on Day T priced incorrectly
    |     +-- Shares outstanding now incorrect (if transactions occurred)
    |
    +-- Allocation ratios wrong from Day T+1 onward
    |     +-- All subsequent class-level P&L allocations slightly off
    |
    +-- Fee accruals wrong from Day T onward
    |     +-- Management fee (% of NAV -> wrong NAV -> wrong fee)
    |     +-- Performance fee (wrong HWM, wrong return calculation)
    |     +-- Admin fee (if AUM-based)
    |
    +-- Performance reporting contaminated
    |     +-- TWR/MWR calculations include wrong NAVs
    |
    +-- Every subsequent NAV from T+1 to discovery date
          carries a (diminishing or compounding) residual error
```

### Self-Correcting vs. Compounding Errors

**Self-correcting errors** are those where the correct input naturally feeds in on the next calculation cycle (typically T+1). The error manifests as a one-day spike that largely washes out:
- Security pricing errors (correct price arrives next day)
- FX rate errors (correct rate feeds in next day)

However, "self-correcting" is misleading -- while the NAV reverts to approximately correct levels, **any investor who transacted at the wrong NAV is still harmed**. The error in the published NAV is temporary; the error in the investor's economic outcome is permanent until compensated.

**Compounding errors** involve parameters configured once and used repeatedly. These accumulate daily and never self-correct:
- Fee rate errors (wrong management fee rate applied every day)
- Share count errors (wrong shares outstanding persists)
- Allocation rule errors (wrong class weighting persists)
- Day-count convention errors (wrong accrual basis every day)

**Key principle:** Errors in daily-refreshing inputs (prices, FX) self-correct but cause transaction-price errors. Errors in configured parameters (fee rates, share counts, allocation rules) compound silently and are far more dangerous.

---

## 2. Error Types by Calculation Chain Position

### 2.1 Security Pricing Error (Type A)

- **Affects:** Fund-level NAV, flows to all classes pro-rata
- **Self-corrects:** Yes (T+1, correct price feeds in)
- **Cash leaves fund:** No
- **Correction complexity:** Low -- restate affected date(s), subsequent NAVs already approximately correct
- **Detection:** Day-over-day NAV tolerance checks, pricing challenge reports, custodian reconciliation

### 2.2 FX Rate Error (Type B)

- **Affects:** Depends on where used:
  - Portfolio valuation (foreign securities -> base currency): fund-level NAV, all classes
  - Class currency conversion: only the affected class
- **Self-corrects:** Yes (T+1), **unless** inverted quote convention (e.g., EUR/USD vs USD/EUR) -- these produce ~magnitude-squared errors that persist until the configuration is fixed
- **Cash leaves fund:** No
- **Correction complexity:** Low-medium. **Special trap:** hedged share classes where FX rate feeds both the class NAV conversion AND the FX forward mark-to-market. If only one side uses the wrong rate, you get a double error instead of the expected hedge offset.

### 2.3 Fee Accrual Error (Type C) -- Management Fee, Admin Fee

- **Affects:** NAV via expense accrual line
- **Self-corrects:** **No** -- compounds every day the wrong rate is applied
- **Cash leaves fund:** **Yes** -- fees are paid out periodically (monthly/quarterly). Once paid, correction requires clawback from the investment manager or fund management company.
- **Correction complexity:** Medium -- recalculate correct fee for entire affected period, determine overpayment/underpayment, negotiate clawback per administration/investment management agreement
- **Detection:** Harder than pricing. Fee rates configured at fund inception; if wrong, error persists silently. Common causes: wrong day-count convention (ACT/365 vs 30/360), rate applied to gross instead of net assets, tiered breakpoints not implemented, rate change not updated in system.
- **Danger:** A 5bps management fee error on a $500M fund = $250K/year. Below many investors' radar but above regulatory thresholds. Can run for years undetected until year-end audit.

### 2.4 Performance Fee Error (Type C+)

Deserves separate treatment due to extreme correction complexity. See Section 4.

### 2.5 Share Count Error (Type D) -- Wrong Shares Minted/Burned

- **Affects:** NAV per share (wrong denominator), but **NOT fund-level NAV**
  - Investor sends $1M, you mint 10,500 shares instead of 10,000
  - Fund assets correct ($1M cash received), shares outstanding wrong
  - Fund-level NAV is still correct (assets = liabilities + equity)
  - NAV per share wrong because denominator is wrong
- **Self-corrects:** **No** -- excess/missing shares persist until noticed
- **Cash leaves fund:** No, but **dilution occurs** -- every existing shareholder's NAV per share is depressed (if too many shares minted) or inflated (if too few)
- **Correction complexity:** Medium -- cancel excess shares or mint shortfall, compensate diluted/enriched shareholders for affected period
- **Detection:** TA register reconciliation (shares issued vs. subscription cash / NAV). This is why the TA-to-accounting daily reconciliation is a critical control.

### 2.6 Class Allocation Error (Type E)

- **Affects:** One or more classes but **NOT** the fund-level NAV
  - Example: Class A gets 62% P&L allocation instead of 60%. Class B gets 38% instead of 40%. Fund total is correct.
- **Self-corrects:** Partially. Allocation ratios recalculated daily based on prior class NAVs, so the error feeds back, but it's sticky -- wrong class NAVs from Day T become the basis for Day T+1 ratios, perpetuating the skew.
- **Cash leaves fund:** No
- **Correction complexity:** Medium -- restate class-level NAVs
- **Detection:** **Invisible at fund level.** All fund-level checks pass. Only class-level cross-checks catch it (sum of class NAVs in base currency must equal fund NAV).

### Summary Table

| Error Type | Affects Fund NAV? | Self-Corrects? | Cash Leaves Fund? | Correction Complexity |
|---|---|---|---|---|
| Security pricing | Yes | Yes (T+1) | No | Low |
| FX rate | Yes or class-only | Yes (T+1) | No | Low-Medium |
| Management/admin fee | Yes (via accrual) | **No** -- compounds | **Yes** (periodic payment) | Medium |
| Performance fee | Yes (via accrual) | **No** | **Yes** (crystallization) | **Very High** |
| Share count | NAV/share yes, fund-level no | **No** | No (but dilution) | Medium |
| Class allocation | No (fund), yes (class) | Partially | No | Medium |

---

## 3. Correction Approaches

### 3.1 Full Restatement (Material Errors)

Used when error exceeds materiality thresholds (see `NAV_METHODOLOGY.md`):

1. Go back to Day T, insert corrected input
2. Re-run the entire NAV cascade for Day T: fund-level -> allocation ratios -> class-specific adjustments -> NAV per share
3. Re-run Day T+1 using corrected Day T as base
4. Continue through every subsequent dealing day to present
5. Identify all investors who transacted at wrong prices (see Section 5)
6. Calculate and pay compensation

Large administrators have "NAV rerun engines" that replay the entire calculation chain with a single corrected input. Can mean recalculating hundreds of NAVs across multiple share classes.

### 3.2 Prospective Correction (Immaterial Errors)

Used when error is below materiality thresholds:

1. Correct the input going forward
2. Book a one-time adjustment journal entry to current NAV capturing cumulative impact:
   ```
   Dr  Error Correction Expense    $X
     Cr  [Relevant asset/liability]    $X
   ```
3. No historical NAV restatement
4. Document the error and assessed immateriality

### 3.3 Error Decay vs. Amplification

Self-correcting errors (pricing, FX) typically **decay** over time: an overstated NAV leads to slightly overstated management fee accruals, which reduce NAV, partially offsetting the original overstatement. However:
- **Large dealing days amplify errors** -- a $50M subscription at a 0.5% wrong NAV = $250K mispriced
- **Performance fee crystallization amplifies errors** -- wrong HWM locks in wrong fee amount
- **Compounding errors only amplify** -- fee rate errors get worse every day

---

## 4. Performance Fee Correction Complexity

Performance fee errors are the most complex to correct because of three interacting factors:

### 4.1 High Water Mark Contamination

A wrong NAV may set a wrong HWM. Once crystallized, the HWM is locked. Correcting requires re-evaluating whether the fund was ever above the correct HWM, which could mean the entire performance fee was unjustified.

```
Correct NAV:  100 -> 108 -> 105 -> 112 (HWM = 112, perf fee on 12% gain)
Wrong NAV:    100 -> 110 -> 107 -> 114 (HWM = 114, perf fee on 14% gain)

Performance fee overpaid by ~17% (14/12 - 1)
AND the wrong HWM (114 vs 112) penalizes the manager going forward
```

### 4.2 Crystallization Irreversibility

Once crystallized and paid, recovery requires contractual clawback. Many investment management agreements don't have robust clawback provisions for calculation errors (vs. fraud). Negotiation is often required.

### 4.3 Equalization Cascade

Each investor's equalization factor is computed based on NAV at their subscription date. A wrong performance fee changes equalization for every investor who subscribed during the affected period. Correction is per-investor, per-dealing-date -- potentially thousands of individual recalculations.

See `FEES_AND_EQUALIZATION.md` for equalization mechanics.

---

## 5. Compensation Asymmetry

### 5.1 Regulatory Asymmetry (Retail Investors)

Per CSSF Circular 24/856 and CBI CP130: **retail investors never reimburse windfall gains, but always receive compensation for losses.**

| Transaction | NAV Overstated | NAV Understated |
|---|---|---|
| **Subscribed** | Fund owes investor (paid too much) | Investor owes fund -- **but no clawback from retail** |
| **Redeemed** | Investor owes fund -- **but no clawback from retail** | Fund owes investor (received too little) |
| **Held throughout** | No compensation (whole once corrected) | No compensation (whole once corrected) |

Professional/institutional investors CAN be asked to reimburse in some jurisdictions.

### 5.2 Compensation Formula

```
For subscriptions at overstated NAV:
  Additional shares = (Amount Paid / Correct NAV) - (Amount Paid / Incorrect NAV)

For redemptions at understated NAV:
  Cash payment = Shares Redeemed x (Correct NAV - Incorrect NAV)
```

### 5.3 Who Pays

| Error Source | Typically Liable |
|---|---|
| Pricing error (wrong vendor feed) | Administrator |
| Portfolio misvaluation (model error) | Investment manager |
| Missed corporate action | Administrator or data vendor |
| Wrong accrual rate | Administrator |
| System/technology failure | Administrator |
| No clear fault | Fund absorbs (charged to NAV) |

CSSF threshold for auditor special report: total compensation > EUR 50,000 or individual > EUR 5,000.

---

## 6. Elysium On-Chain Considerations

Elysium's on-chain architecture provides structural advantages for error correction:

1. **Immutable audit trail**: NAV, dilution ratios, and fee accruals stored with timestamps. Restatement would publish a correction event referencing the original incorrect state -- history is never silently overwritten.
2. **Deterministic recalculation**: All NAV inputs are on-chain, enabling replay of calculation chain from any historical point.
3. **Automatic transaction identification**: Dealing records are on-chain with the NAV at which they transacted, enabling automatic identification of affected investors.
4. **Dilution ratio system**: The three-level dilution model (`fundDilution`, `classDilution`, `dealingDilution`) makes class-specific and dealing-specific corrections possible without restating fund-level NAV.

**Design consideration for correction mechanism**: The protocol should support a `correctNAV(fundId, dealingId, correctedNAV, reason)` function (admin-only) that:
- Stores the correction alongside the original (both visible)
- Recalculates affected dilution ratios
- Emits events identifying affected dealings and investors
- Does NOT overwrite historical state

---

## 7. Cross-References

- **`ERROR_SCENARIOS_AND_CRISIS.md`** -- Error taxonomy (trade, pricing, NAV, corporate action, settlement, data quality errors), crisis playbooks. Covers WHAT errors exist. This file covers HOW errors propagate and HOW correction differs by type.
- **`RECONCILIATION_AND_OPS.md`** Section 7 -- NAV error correction procedure (identification, materiality, compensation, regulatory notification). Covers the standard correction PROCEDURE. This file covers the error-type-specific MECHANICS.
- **`NAV_METHODOLOGY.md`** -- Error materiality thresholds (CSSF, CBI, SEC). This file references those thresholds but focuses on propagation and correction complexity.
- **`FEES_AND_EQUALIZATION.md`** -- Performance fee equalization mechanics that make Type C+ corrections so complex.
- **`FUND_ACCOUNTING.md`** -- NAV calculation chain, three-level dilution system, journal entries. The calculation chain diagram in this file maps to the fund accounting pipeline.
- **`technical/ERROR_CORRECTION_ENGINE.md`** -- Technical design for the what-if replay engine that implements the restatement calculation. Fork→inject→replay→diff architecture, injection taxonomy (corrective/compensatory/passthrough), on-chain atomic correction function.

---

## Sources

- [CSSF Circular 24/856 -- NAV Error Treatment](https://www.dechert.com/knowledge/onpoint/2024/4/new-cssf-circular-on-nav-errors-and-investment-rule-breaches.html)
- [CBI CP130 -- Treatment and Correction of NAV Errors](https://www.mccannfitzgerald.com/knowledge/asset-management-and-investment-funds/central-bank-of-ireland-consults-on-treatment-correction-and-redress-of-errors-in-investment-funds)
- [SEC Rule 22c-1 -- Pricing of Mutual Fund Shares](https://www.sec.gov/rules-regulations/2003/12/amendments-rules-governing-pricing-mutual-fund-shares)
- [EY Luxembourg -- CSSF Circular 24/856 Analysis](https://www.ey.com/en_lu/insights/wealth-asset-management/circular-24-856-nav-calculation-errors)
