# NAV Calculation Methodology

<!-- ~4500 tokens -->
**Last Updated:** 2026-02-10

---

## What Is NAV?

**Net Asset Value** = Total Assets − Total Liabilities, for a fund or share class. **NAV per share** = NAV ÷ Shares Outstanding. This is the price at which investors subscribe to and redeem from the fund.

---

## Pricing Regimes

### Forward Pricing (Standard)

The investor does not know the price at the time of placing the order. The NAV is calculated **after** the dealing cut-off time, using market prices at the **valuation point** (typically market close on the dealing day). This is the **mandatory** pricing method for UCITS and US mutual funds (SEC Rule 22c-1).

**Timeline**: Investor places order before cut-off → market closes → administrator calculates NAV → investor receives shares at that NAV.

### Historic Pricing

The NAV used for a transaction is the **most recently calculated** NAV, not a future one. The investor knows the price before dealing. Less common today — mostly legacy UK unit trusts. Being phased out in favor of forward pricing.

### Single Pricing vs. Dual Pricing

| Type | Description | Used By |
|---|---|---|
| **Single pricing** | One NAV per share for all transactions (subscriptions and redemptions at same price) | Most UCITS, US mutual funds, modern funds |
| **Dual pricing** | Two prices: **offer price** (for subscribers, NAV + creation costs) and **bid price** (for redeemers, NAV − liquidation costs) | Legacy UK unit trusts, some insurance funds |

### Pricing Basis

| Basis | Meaning | When Used |
|---|---|---|
| **Mid** | Midpoint between bid and offer prices of underlying securities | Standard for single-priced funds |
| **Bid** | Lower price (what the market will pay) | Redemption price in dual-priced funds |
| **Offer** | Higher price (what the market charges) | Subscription price in dual-priced funds |
| **Last traded** | Most recent transaction price on exchange | US equities, some jurisdictions |

---

## NAV Components

```
Fund-Level NAV = Gross Assets − Liabilities

Where:
  Gross Assets = Market value of investments
               + Cash and cash equivalents
               + Accrued income (dividends declared, interest earned)
               + Receivables (unsettled sales, tax reclaims, other)

  Liabilities  = Accrued expenses (management fee, admin fee, custody, audit, legal)
               + Payables (unsettled purchases, distributions payable)
               + Provisions (tax provisions, contingent liabilities)
               + Borrowings (if any)
```

---

## Multi-Class NAV Cascade

This is the process by which a single fund-level NAV is split across multiple share classes, each with different fees, currencies, and adjustments. See also `FUND_ACCOUNTING.md` for Elysium's on-chain dilution model.

### Step-by-Step Process

```
Step 1: Calculate Fund-Level NAV
  Fund NAV = Total Assets − Total Liabilities (before class-specific items)

Step 2: Determine Allocation Ratios
  Each class's ratio = Class NAV (previous day) ÷ Sum of all Class NAVs (previous day)
  Note: Ratios change daily as subscriptions/redemptions shift relative sizes

Step 3: Allocate Fund P&L Pro-Rata
  Each class receives: Fund P&L × its allocation ratio
  At this stage all classes have identical percentage returns

Step 4: Apply Class-Specific Adjustments
  Per class, subtract/add:
  − Management fee accrual (different rates per class)
  − Performance fee accrual (if applicable, different HWM per class)
  − Hedging P&L (mark-to-market of FX forwards for hedged classes)
  − Class-specific expenses (distribution fees, platform fees, etc.)
  + Income adjustments (different withholding tax treatment per class)

Step 5: Calculate Class NAV Per Share
  Class NAV Per Share = Class NAV ÷ Class Shares Outstanding

Step 6: Apply FX Conversion (if class currency ≠ fund currency)
  Class Price in Denomination Currency = Class NAV Per Share × FX Rate
```

### Worked Example

**Fund**: $100M NAV, two classes:
- **Class A**: 60% allocation, 1% mgmt fee, USD denominated, 600,000 shares
- **Class B**: 40% allocation, 1.5% mgmt fee, EUR denominated (hedged), 300,000 shares

**Day's P&L**: +$500,000 (0.5% gain)

| Step | Class A | Class B |
|---|---|---|
| Previous NAV | $60,000,000 | $40,000,000 |
| Allocation ratio | 60% | 40% |
| P&L allocation | +$300,000 | +$200,000 |
| Mgmt fee accrual (daily) | −$1,644 (1%/365 × $60M) | −$1,644 (1.5%/365 × $40M) |
| Hedging P&L | — | −$500 (FX forward cost) |
| **Adjusted Class NAV** | **$60,298,356** | **$40,197,856** |
| Shares outstanding | 600,000 | 300,000 |
| **NAV per share** | **$100.497** | **€122.88** (at EUR/USD 1.09) |

---

## Swing Pricing

Swing pricing protects existing investors from the costs of other investors' trading activity (subscriptions or redemptions). Without it, transaction costs from portfolio rebalancing dilute all shareholders.

### Full Swing

The NAV is adjusted on **every** dealing day, regardless of flow size. The direction depends on net flows:
- Net inflows → NAV swung **up** (subscribers pay more)
- Net outflows → NAV swung **down** (redeemers receive less)

### Partial (Threshold-Based) Swing

The NAV is only adjusted when net flows **exceed a threshold** (e.g., 2% of fund NAV). Below the threshold, the standard NAV applies.

### Swing Factor Ranges

| Asset Class | Typical Swing Factor |
|---|---|
| Money market | < 0.10% |
| Investment-grade bonds | 0.05–0.25% |
| High-yield bonds | 0.15–0.50% |
| Developed market equities | 0.15–0.50% |
| Emerging market equities | 0.30–1.00% |
| Real estate / illiquid | 1.00–3.00% |

The swing factor is derived from: bid-ask spreads + brokerage commissions + market impact + stamp duties. Reviewed quarterly or as market conditions change.

**Elysium mapping**: Swing pricing maps to the dealing-level dilution in our on-chain model. See `FUND_ACCOUNTING.md` for the `dealingDilution` parameter.

---

## NAV Error Materiality Thresholds

When a NAV calculation error is discovered, its significance is determined by comparing it against materiality thresholds. Only errors exceeding the threshold require compensation and regulatory notification.

### CSSF Circular 24/856 (Luxembourg, effective 2025-01-01)

| Fund Type | Threshold |
|---|---|
| Money Market Funds (MMFs) | 0.20% of NAV |
| Bond / Debt Instruments | 0.50% of NAV |
| Mixed Investment Policy | 0.50% of NAV |
| Equities / Public Stocks | 1.00% of NAV |
| Other (PE, Loans) | 1.00% of NAV |
| Professional-only funds | Up to 5.00% (management discretion) |

### Central Bank of Ireland (CP130)

Similar framework — thresholds aligned with CSSF for UCITS. CBI requires funds to have documented NAV error policies.

### SEC (US)

US mutual funds must price at "fair value" — the SEC does not prescribe fixed error thresholds but penny-rounding test applies to money market funds ($1.0000 to 4 decimal places). General industry practice: 0.50% for equity funds, 0.25% for fixed income.

### Error Remediation Procedures

1. **Identify**: Error detected via reconciliation, audit, or investor query
2. **Quantify**: Recalculate correct NAV for affected period(s)
3. **Assess materiality**: Compare error magnitude to threshold
4. **If material**: Notify regulator (CSSF: within 4-8 weeks of detection), compensate affected investors, engage auditor for special report if compensation >€50K total or >€5K per investor
5. **Compensate**: Cash payment or additional unit issuance. Retail investors cannot be asked to reimburse windfall gains. Professional investors can.
6. **Root cause analysis**: Document cause and implement preventive measures

---

## NAV Rounding Rules

| Fund Type / Jurisdiction | Decimal Places | Notes |
|---|---|---|
| US equity mutual funds | 2 | $18.50 — calculated to 5+ internally |
| US money market funds | 4 | $1.0000 — regulatory requirement |
| US 401(k) plans | 6 | Institutional precision |
| EU UCITS (general) | 2-4 | Per prospectus; typically 2 for equity, 4 for bond/MMF |
| India (SEBI) | 2-4 | 2 for equity, 4 for debt |

**Rule**: NAV is typically calculated to more decimal places internally than published. The prospectus specifies the rounding convention. Rounding differences accumulate and are tracked as "rounding adjustments" in accounting.

---

## NAV Publication

After sign-off, the NAV is disseminated via:

| Channel | Recipients | Timing |
|---|---|---|
| **Data vendors** (Bloomberg, Refinitiv, Morningstar, SIX Financial) | Market participants, platforms | T+0 or T+1 (per fund prospectus) |
| **Fund platform feeds** (Allfunds, Clearstream, Euroclear, Calastone) | Distributors, transfer agents | T+0 evening / T+1 morning |
| **Fund company website** | Direct investors | T+1 morning typically |
| **Regulatory filings** | Regulator | Per jurisdiction schedule |
| **Investor statements** | Direct shareholders | Monthly/quarterly |

**Preliminary vs. Final NAV**: Some administrators publish a "preliminary" or "estimated" NAV on T+0 (based on estimated prices/accruals) and a "final" NAV on T+1 (after all prices confirmed and reconciliation complete). Dealing is based on the final NAV.

---

## Side Pocket NAV

For funds with illiquid/hard-to-value positions, a **side pocket** creates a separate NAV:
- Liquid positions → main NAV (daily dealing continues)
- Illiquid positions → side pocket NAV (no dealing until realization)
- Investors hold shares in both; new subscribers only receive main shares
- Side pocket redeemed when position is liquidated

---

## Sources

- [CSSF Circular 24/856 — NAV Errors](https://www.dechert.com/knowledge/onpoint/2024/4/new-cssf-circular-on-nav-errors-and-investment-rule-breaches.html)
- [BlackRock — Swing Pricing: Raising the Bar](https://www.blackrock.com/corporate/literature/whitepaper/spotlight-swing-pricing-raising-the-bar-september-2021.pdf)
- [IOSCO — Anti-dilution Liquidity Management Tools](https://www.iosco.org/library/pubdocs/pdf/IOSCOPD756.pdf)
- [ICI — Four-Decimal Point NAV Calculation](https://www.ici.org/ops_mmf_reform/fourdecimal)
- [RyanEyes — How Fund Admins Calculate NAV](https://www.ryaneyes.com/blog/deciphering-nav/)
- [Corporate Finance Institute — Historic Pricing](https://corporatefinanceinstitute.com/resources/career-map/sell-side/capital-markets/historic-pricing/)
- [ESMA — Consultation on LMTs for UCITS and AIFs](https://www.esma.europa.eu/sites/default/files/2024-07/ESMA34-1985693317-1097_CP_on_LMTs_of_UCITS_and_open-ended_AIFs.pdf)

## Related Files

- `FUND_ACCOUNTING.md` — Elysium's on-chain price formula and three-level dilution model
- `SHARE_CLASSES.md` — How classes interact with NAV cascade and FX hedging
- `RECONCILIATION_AND_OPS.md` — Daily NAV production cycle and error correction procedures
- `FEES_AND_EQUALIZATION.md` — Fee accruals that feed into NAV calculation
