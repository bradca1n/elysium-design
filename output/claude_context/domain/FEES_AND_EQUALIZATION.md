# Fees, Performance Fees & Equalization

<!-- ~4500 tokens -->
**Last Updated:** 2026-02-10

---

**Cross-references:** `FUND_ACCOUNTING.md` (NAV calculation, GAV, class-specific adjustments), `SHARE_CLASSES.md` (class mechanics, hedging, denomination currencies). `ACCOUNTING_STANDARDS.md` (IFRS/US GAAP fee recognition, ASC 946, fair value hierarchy).

---

## 1. Management Fee

### Formula and Daily Accrual

Management fees are charged as an annual percentage of fund assets, accrued daily:

```
Daily Management Fee = (Annual Fee Rate / 365) x NAV_t
```

Where `NAV_t` is the fund's net asset value at the start of each day (or prior day's closing NAV). The fee accrues as a liability, reducing the NAV available to investors.

**NAV-based vs. GAV-based:**
- **NAV-based:** Fee calculated on net assets (assets minus liabilities). More common in hedge funds.
- **GAV-based:** Fee calculated on gross assets before deducting liabilities (including leverage). Larger fee base when fund uses leverage. Typically seen in levered real estate or credit funds.

### Worked Example: Daily Accrual

| Day | NAV (start) | Annual Rate | Daily Fee | Cumulative Accrued |
|-----|-------------|-------------|-----------|-------------------|
| 1 | $100,000,000 | 1.50% | $4,109.59 | $4,109.59 |
| 2 | $100,250,000 | 1.50% | $4,120.89 | $8,230.48 |
| 3 | $99,800,000 | 1.50% | $4,102.74 | $12,333.22 |

Calculation for Day 1: `(0.015 / 365) x $100,000,000 = $4,109.59`

Fees accrue daily but are typically paid monthly or quarterly to the manager. The accrued fee sits as a liability in the fund's books, reducing NAV each day.

### Tiered Fee Schedules

Some funds apply breakpoints:
- First $100M: 1.50%
- $100M -- $500M: 1.25%
- Above $500M: 1.00%

Tiers may apply per investor (investor-level) or per fund AUM (fund-level). Investor-level tiers incentivize larger allocations; fund-level tiers benefit all investors as the fund grows.

---

## 2. Performance Fee (Incentive Fee)

Performance fees compensate the manager for generating returns above a specified benchmark.

### Core Parameters

| Parameter | Description |
|-----------|-------------|
| **Rate** | Typically 15--20% of profits (historically "2-and-20"; declining toward 1.5-and-15 post-2008) |
| **Hurdle rate** | Minimum return before performance fee applies |
| **High water mark (HWM)** | Highest previous NAV; prevents double-charging on recovery from losses |
| **Crystallization frequency** | When the fee is "locked in" and paid -- annual, semi-annual, quarterly, or monthly |
| **Clawback** | Manager returns previously paid fees if subsequent performance falls below threshold |

### Hurdle Rate: Hard vs. Soft

- **Hard hurdle:** Manager earns performance fee only on returns exceeding the hurdle. If hurdle = 5% and return = 8%, fee applies to 3%.
- **Soft hurdle:** If return exceeds the hurdle, fee applies to the entire return. If hurdle = 5% and return = 8%, fee applies to 8%. The hurdle is a gate, not a deduction.

### Worked Example: Performance Fee with HWM over 3 Periods

**Setup:** 20% performance fee, no hurdle rate, annual crystallization, HWM mechanism.

| Period | Start NAV/share | End NAV/share | Gain above HWM | Perf Fee (20%) | Net NAV/share | New HWM |
|--------|----------------|---------------|-----------------|----------------|---------------|---------|
| Year 1 | $100.00 | $140.00 | $40.00 | $8.00 | $132.00 | $132.00 |
| Year 2 | $132.00 | $120.00 | $0.00 (below HWM) | $0.00 | $120.00 | $132.00 |
| Year 3 | $120.00 | $160.00 | $28.00 ($160-$132) | $5.60 | $154.40 | $154.40 |

**Year 1:** Fund rises from $100 to $140. Performance fee = 20% x $40 = $8. Investor receives $132. HWM set to $132.

**Year 2:** Fund falls from $132 to $120. Below HWM of $132, so no performance fee is charged. HWM stays at $132.

**Year 3:** Fund rises from $120 to $160. But HWM is $132 (not $120). Only the $28 above $132 is chargeable. Fee = 20% x $28 = $5.60. Net NAV = $154.40. HWM resets to $154.40.

**Key insight:** Without HWM, Year 3 would have charged 20% on the full $40 gain ($8), making the investor pay twice for recovery from $120 to $132. HWM prevents this.

### Crystallization Frequency

- **Annual:** Most common. HWM updates once per year. Lower fee leakage for investors.
- **Quarterly/monthly:** Higher frequency benefits the manager -- gains can crystallize before subsequent losses offset them. More complex to administer.
- **Multi-year (3-year rolling):** Rarer. Better alignment but complicates accounting.

### Clawback Provisions

If performance fees were paid and subsequent performance is negative, clawback mechanisms require the manager to refund part or all of previously paid fees. Typically enforced via escrow -- a portion (often 50--100%) of crystallized fees is held in escrow for 1--3 years.

---

## 3. The Equalization Problem

### Why Mid-Period Subscribers Create Unfairness

When a new investor subscribes mid-period (after the fund has appreciated but before performance fees crystallize), they face one of two unfair outcomes:

1. **Overpayment:** New investor pays a share of performance fees on gains they did not enjoy.
2. **Underpayment:** Existing investors subsidize the new investor who avoids the full fee.

**Numerical Example:**

Fund starts Year 1 at $100/share (HWM = $100). By June 30, NAV rises to $120/share. Investor B subscribes at $120/share. By December 31, NAV reaches $130/share. Performance fee = 20%.

- **Without equalization:** Fund charges 20% x ($130 - $100) = $6/share on all shares. But Investor B only gained $10/share ($120 to $130), not $30. Investor B overpays by $4/share.
- **With equalization:** Investor B's fee is based only on their gain: 20% x $10 = $2/share. The remaining $4/share is attributable to existing Investor A.

---

## 4. Equalization Methods

### Method 1: Depreciation Deposit / Equalization Factor

Under this approach, new subscribers pay either an **equalization factor** (if NAV > HWM) or create a **depreciation deposit** (if NAV < HWM).

**When NAV > HWM (equalization factor):**

Investor subscribes at NAV $120. HWM = $100. Performance fee rate = 20%.

1. Gross subscription price (GNAV) = NAV / (1 - perf_fee_rate x (NAV - HWM)/NAV)
   - Equalization factor = GNAV - NAV = accrued performance fee embedded in NAV
   - Simplified: EF = (NAV - HWM) x perf_fee_rate / (1 - perf_fee_rate x (NAV - HWM)/NAV)
   - Approximate EF per share: ($120 - $100) x 0.20 / (1 - 0.20 x 20/120) = $4.00 / 0.9667 = **$4.14**
2. Investor pays $120 + $4.14 = $124.14 per share. Receives 1 share at NAV $120 + equalization credit of $4.14.
3. At crystallization: if fund > HWM, the $4.14 is returned to the investor as additional shares. If fund declines, the credit is reduced proportionally. If fund falls below HWM, credit is forfeited entirely.

**When NAV < HWM (depreciation deposit):**

Investor subscribes at NAV $80. HWM = $100. Performance fee rate = 20%.

1. Depreciation deposit = (HWM - NAV) x perf_fee_rate = ($100 - $80) x 0.20 = **$4.00 per share**
2. The deposit represents future performance fee owed if the fund recovers from $80 to $100.
3. If NAV recovers to $100+: the $4.00 is paid to the manager as compensation for the $80-$100 recovery.
4. If NAV does not fully recover: deposit is reduced proportionally. At $90, the deposit owed = ($100-$90) x 0.20 = $2.00 (partial recovery), so $2.00 of the original $4.00 is paid to the manager and $2.00 is returned.

### Method 2: Equalization Credit/Debit (Contingent Redemption)

Instead of adjusting the subscription price, this method tracks equalization at the share level and settles via share issuance or redemption at crystallization.

**Worked Example -- New investor when NAV > HWM:**

Fund HWM = $1,000/share. Current NAV = $1,200/share. Investor subscribes for 100 shares ($120,000). Performance fee = 20%.

1. Equalization credit = (NAV - HWM) x perf_fee_rate / (1 - perf_fee_rate x (NAV-HWM)/NAV)
   = ($200 x 0.20) / (1 - 0.20 x 200/1200) = $40 / 0.9667 = **$41.38 per share**
   Total EC = 100 x $41.38 = **$4,138**
2. At crystallization (assuming NAV rises to $1,400):
   - Fund-level performance fee per share = 20% x ($1,400 - $1,000) = $80
   - Investor's actual gain per share = $1,400 - $1,200 = $200
   - Investor's fair fee = 20% x $200 = $40
   - Difference = $80 - $40 = $40 per share returned via additional shares issued to investor
   - Shares issued = ($40 x 100) / $1,400 = **2.86 shares**

**When NAV < HWM (contingent liability):**

Fund HWM = $1,000. NAV = $800. Investor subscribes for 100 shares ($80,000).

1. Contingent liability = (HWM - NAV) x perf_fee_rate = ($200) x 0.20 = **$40 per share**
2. If NAV rises to $1,100 at crystallization:
   - The first $200 of appreciation ($800 to $1,000) generates the investor's individual performance fee: $200 x 0.20 = $40/share
   - The next $100 ($1,000 to $1,100) generates another: $100 x 0.20 = $20/share
   - Total investor fee = $60/share, but fund-level fee (from old HWM $1,000) = only $20/share ($1,100-$1,000)
   - Difference of $40/share settled via **contingent redemption**: 100 x $40 / $1,100 = **3.64 shares redeemed** from investor, proceeds paid to manager

### Method 3: Series / Multi-Series Accounting

Instead of a single share class with equalization adjustments, the fund issues a new series of shares for each subscription date. Each series has its own HWM.

**Worked Example:**

| Event | Series A (Day 1) | Series B (Mid-year) |
|-------|------------------|---------------------|
| Subscription | 1,000 shares @ $100 | 500 shares @ $120 |
| HWM at issuance | $100 | $120 |
| Year-end NAV | $140 | $140 |
| Gain above own HWM | $40 | $20 |
| Perf fee (20%) | $8/share | $4/share |
| Net NAV/share | $132 | $136 |

At year-end, if both series are above their respective HWMs, they "roll up" (convert) into a single series at the current NAV. If a series is below its HWM, it remains separate and carries forward its own HWM.

**Advantages:** Clean, auditable, no complex credit/debit tracking.
**Disadvantages:** Proliferation of series (one per subscription date per class). Administrative overhead scales linearly with subscription frequency.

### Method 4: Adjusted Cost Method

Used primarily in partnership/LLC structures rather than corporate share classes. Each investor's capital account tracks their individual cost basis.

1. Investor B contributes $120,000 when fund NAV/unit = $120 (HWM = $100).
2. A "loss carryforward" of $0 is assigned (since subscribing above HWM, the loss carryforward equals the accrued but uncrystallized fee: $20 x 20% = $4/unit).
3. At crystallization, performance fee is calculated on Investor B's individual gain from their $120 entry point, not from the fund's $100 HWM.
4. This is the capital-account equivalent of the equalization credit method -- the partnership agreement simply calculates fees per capital account rather than per share.

---

## 5. Other Fund Expenses

### Typical Fee Ranges

| Fee Category | Typical Range (bps of NAV) | Notes |
|-------------|---------------------------|-------|
| **Administration fee** | 3--15 bps | Fund accounting, NAV calculation, investor services. Scales inversely with AUM. |
| **Custody fee** | 1--10 bps | Safekeeping of assets. Higher for exotic/illiquid assets, multi-jurisdiction. |
| **Audit fee** | Fixed $15K--$150K/year | Depends on fund complexity, number of classes, jurisdictions. |
| **Legal fee** | Fixed $20K--$200K/year | Ongoing regulatory filings, document updates. Initial setup higher. |
| **Director fees** | Fixed $10K--$50K/director/year | Independent directors required in many jurisdictions (Cayman, Ireland, Luxembourg). |
| **Regulatory fees** | Fixed $5K--$50K/year | Registration, reporting (Form PF, AIFMD Annex IV, etc.). |
| **Listing fees** | Fixed $5K--$30K/year | If fund is listed on an exchange (Irish Stock Exchange, etc.). |

### Allocation to Share Classes

Fund-level expenses (audit, custody, admin) are allocated to classes pro-rata by NAV. Class-specific expenses (hedging costs, trailer fees) are allocated only to the relevant class. See `FUND_ACCOUNTING.md` Step 4 for the allocation mechanism.

---

## 6. Transaction Costs

### Explicit Costs

| Component | Typical Range | Notes |
|-----------|--------------|-------|
| **Brokerage commission** | 1--10 bps per trade | Negotiated; lower for electronic/algo execution |
| **Stamp duty** | 0--50 bps | UK: 50 bps on purchases; Ireland: 100 bps; US: none; varies by jurisdiction |
| **Exchange fees** | 0.1--1 bps | Per-trade or per-share exchange levies |
| **Settlement/clearing fees** | 0.1--2 bps | Central counterparty and custodian charges |
| **Regulatory levies** | 0.01--0.5 bps | FINRA TAF, SEC Section 31 fees, etc. |

### Implicit Costs

- **Bid-ask spread:** The cost of crossing the spread. Typically 1--20 bps for large-cap liquid equities; 50--200+ bps for illiquid/small-cap.
- **Market impact:** Price movement caused by the trade itself. Estimated at ~3 bps per 1% of ADV traded for liquid stocks. Can be 30+ bps for large orders in illiquid names.
- **Timing/delay cost:** Opportunity cost of delayed execution. Significant for large institutional orders.

### Disclosure

Under MiFID II, both explicit and implicit transaction costs must be disclosed. Implicit costs are calculated using the "arrival price" methodology (comparing execution price to the price at order entry).

---

## 7. Total Expense Ratio (TER) / Ongoing Charges Figure (OCF)

### Formula

```
TER = Total Fund Expenses (excl. transaction costs) / Average NAV over period x 100
```

```
OCF = Total Recurring Charges / Average NAV over period x 100
```

**Included:** Management fee, admin fee, custody fee, audit fee, legal fees, regulatory fees, director fees, distribution/trailer fees.
**Excluded (from OCF):** Performance fees, transaction costs, interest on borrowings, one-off charges (entry/exit fees).

The OCF replaced the TER under EU UCITS regulations (CESR/10-674). The key difference: OCF excludes performance fees; TER may include them depending on jurisdiction.

### Typical Ranges

| Fund Type | TER Range |
|-----------|-----------|
| Passive ETF | 0.03--0.50% |
| Active equity mutual fund | 0.50--2.00% |
| Hedge fund (excl. performance fee) | 1.00--2.50% |
| Private equity (management fee only) | 1.50--2.50% |

---

## 8. Fee Disclosure Requirements

### UCITS KIID / KID

- **UCITS KIID:** Ongoing charges figure (OCF) prominently displayed. Performance fee methodology explained. Historical performance chart (5--10 years).
- **PRIIPs KID:** Replaced KIID for non-UCITS packaged products. Shows costs over 1, 3, and 5-year holding periods in both percentage and monetary terms. Includes entry costs, exit costs, ongoing costs, incidental costs (performance fees), and transaction costs.
- **UK transition:** UCITS exemption from PRIIPs extended to 31 December 2026. FCA's Consumer Composite Investments (CCI) regime is expected to replace both.

### MiFID II Cost and Charges Disclosure

- **Ex-ante disclosure:** Before transaction, total costs shown in percentage and cash terms, including cumulative effect on returns.
- **Ex-post disclosure:** Annual statement showing actual costs incurred, broken down by: product costs (management fee, performance fee, transaction costs within fund) and service costs (platform fee, advisory fee, custody). Must show impact of costs on returns in monetary terms.
- **Aggregation:** All costs along the distribution chain must be aggregated and presented together.

### AIFMD (Alternative Investment Fund Managers Directive)

- Disclosure of management fee, performance fee, and all other fees in the fund's offering documents.
- Annual report must disclose total amount of remuneration paid by the fund.
- Leverage limits and liquidity management disclosed but not standardized TER-style metrics.

---

## 9. Carried Interest (PE/VC)

### Waterfall Distribution Structure

Private equity funds distribute returns through a "waterfall" -- a priority sequence of payments.

**Standard 4-Tier Waterfall:**

1. **Return of capital:** 100% to LPs until all contributed capital is returned.
2. **Preferred return (hurdle):** 100% to LPs until they receive a specified annual return (typically 8%) on contributed capital.
3. **GP catch-up:** 100% (or majority) to GP until the GP has received its carried interest share of all profits distributed so far.
4. **Carried interest split:** Remaining profits split 80/20 (LP/GP). The 20% GP share is "carried interest."

### European vs. American Waterfall

| Feature | European (Whole-of-Fund) | American (Deal-by-Deal) |
|---------|--------------------------|------------------------|
| Carry trigger | After ALL contributed capital + preferred return returned | After EACH deal returns its capital + preferred return |
| GP timing | GP waits until fund-level profitability | GP receives carry from first profitable exit |
| LP protection | Stronger -- no carry until fully made whole | Weaker -- clawback provision needed |
| Clawback risk | Minimal | Significant -- GP may have to return carry |
| Typical usage | Europe, institutional LPs | US, first-time managers |

### Worked Example: European Waterfall

**Fund:** $200M committed capital. 8% preferred return. 20% carried interest. 100% GP catch-up.

**Exits:**
- Project A ($70M invested): Sold for $210M (Year 3)
- Project B ($130M invested): Sold for $260M (Year 5)

**Total distributions = $470M. Total invested = $200M. Total profit = $270M.**

Step 1 -- Return of capital: First $200M to LPs.

Step 2 -- Preferred return: 8% annually on $200M. Assuming ~4 years average: ~$64M to LPs. (Actual: compounded per drawdown schedule; simplified here.)

Step 3 -- GP catch-up: GP receives 100% until GP's total = 20% of all profits. Total profits = $270M. GP target = $54M. After Step 2, GP has received $0. GP receives next $54M.

Step 4 -- Remaining split: $470M - $200M - $64M - $54M = $152M split 80/20. LP gets $121.6M, GP gets $30.4M.

**Totals:** LPs receive $200M + $64M + $121.6M = $385.6M. GP receives $54M + $30.4M = $84.4M (= ~31.3% of profits, slightly above 20% due to catch-up timing in simplified example; exact amounts depend on compounding schedule).

### American Waterfall (Same Fund)

Project A exits first ($210M proceeds on $70M invested):
- Return $70M capital to LPs
- Pay preferred return on $70M (~$16.8M to LPs)
- GP catch-up: ~$5.7M to GP
- Remaining $117.5M split 80/20: LP $94M, GP $23.5M

GP receives carry from Project A **before** Project B exits. If Project B underperforms, clawback provisions require GP to return excess carry.

### Clawback

GP typically escrows 50--100% of carried interest received. At fund wind-down, if aggregate returns fall below the hurdle rate, GP must return excess carry from escrow. Personal clawback (from individual partners, net of taxes paid) is the final backstop.

---

## 10. Founders/Seed Investor Arrangements

### Typical Terms

| Feature | Founders Class | Seed Deal |
|---------|---------------|-----------|
| **Management fee** | 0.50--1.00% (vs. standard 1.50--2.00%) | 0.00--0.75% |
| **Performance fee** | 10--15% (vs. standard 20%) | 5--15% |
| **Lock-up** | 1--2 years | 2--3 years (hard lock) |
| **Capacity rights** | Fixed dollar amount or % of AUM for future investment at same terms | Yes, often 10--25% of fund AUM |
| **Co-investment** | Sometimes | Usually -- no fee / no carry on co-invest |
| **Revenue share** | No | Sometimes 15--25% of management company revenue |
| **MFN clause** | Yes | Yes -- most favorable terms if better terms offered later |

### Availability

Founders classes are typically open for a limited window (first 6--12 months of fund life) or until AUM reaches a threshold ($50M--$100M). After closing, no new investors can access founders terms.

### Seed Deal Trigger Events

Seeders negotiate withdrawal rights upon:
- Performance decline of 15--20% from peak
- Key person departure
- Regulatory/compliance breach
- Breach of investment guidelines

---

## 11. Fee Waivers, Rebates & Retrocessions

### Fee Waivers and Rebates

- **Management fee waivers:** Manager voluntarily reduces or waives fees (e.g., during fund launch to attract assets, or for employees/affiliates).
- **Rebate classes:** Share classes with same gross fee but a portion rebated to the investor. Used for institutional investors, platforms, or specific distribution channels.
- **Side letter rebates:** Negotiated in side letters; creates "most favored nation" risk if not managed carefully.

### Trailer Fees (Distribution Fees)

- Ongoing fees paid by the fund manager to distributors (platforms, banks, IFAs) for maintaining client relationships.
- Typically 25--75 bps of AUM of assets sourced by the distributor.
- Embedded in the management fee -- not an additional charge, but a revenue-sharing arrangement.

### Retrocessions and Regulatory Pushback

- **Retrocessions:** Payments from fund managers to distributors/advisers for recommending their funds. Creates conflict of interest -- adviser incentivized to recommend higher-retrocession funds.
- **MiFID II (2018):** Banned retrocessions for independent advisers and portfolio managers in the EU. Non-independent advisers may receive retrocessions only if they enhance quality of service.
- **Netherlands:** Full ban on all inducements (including execution-only) since 2014.
- **UK (RDR, 2013):** Banned commission payments from fund managers to advisers. Platforms must offer "clean" share classes (no embedded trail commission).
- **Switzerland (2012):** Federal Supreme Court ruled retrocessions must be passed to clients unless explicitly waived.

### Platform Fees

Separate from fund fees, platforms (Hargreaves Lansdown, Fidelity, Schwab) charge their own custody/platform fees (typically 0.15--0.45% of AUM) on top of the fund's OCF.

---

## 12. Elysium Implementation Notes

For how Elysium's smart contracts handle fees on-chain, see `FUND_ACCOUNTING.md` (Step 4: class-specific adjustments) and `SHARE_CLASSES.md` (class-level fee parameters). Key contract-level considerations:

- **Management fee:** Accrued daily in the NAV calculation facet. Stored per class with configurable annual rate in basis points.
- **Performance fee:** Calculated per class with HWM tracking. Crystallization events triggered by admin at configurable frequency.
- **Equalization:** Elysium uses series-based approach on-chain (new tokenId per subscription batch), avoiding complex credit/debit tracking in Solidity. Each series carries its own HWM. Series "roll-up" at crystallization when both series exceed their HWMs.
- **Fund-level expense allocation:** Pro-rata by class NAV, implemented as adjustments posted by the fund administrator.

---

## Sources

- [NAV Formula: Calculation, Examples, and Applications](https://growthequityinterviewguide.com/private-equity/valuation-and-financial-modeling/nav-formula)
- [Management Fees: A Guide to Fee Structures in Private Funds - Carta](https://carta.com/learn/private-funds/management/management-fees/)
- [How Fund Admins Calculate NAV for Investors - RyanEyes](https://www.ryaneyes.com/blog/deciphering-nav/)
- [Hedge Fund Fee Structure, High Water Mark and Hurdle Rate - FinanceTrain](https://financetrain.com/hedge-fund-fee-structure-high-water-mark-and-hurdle-rate)
- [High-Water Mark - Corporate Finance Institute](https://corporatefinanceinstitute.com/resources/career-map/sell-side/capital-markets/high-water-mark/)
- [Fee Structures Demystified - O-CFO](https://o-cfo.com/blog/structures-demystified-how-hedge-funds-calculate-management-performance-fee)
- [Equalization Accounting - Quantos Capital](https://www.quantos.capital/equalisation-accounting)
- [Multi-Series and Equalization Accounting - Databento](https://databento.com/compliance/multi-series-and-equalization-accounting)
- [Series vs. Equalization - SSC Technologies](https://www.ssctech.com/blog/understanding-performance-fees-in-hedge-funds-series-vs-equalization)
- [Performance-Based Incentive Fees and Equalization Mechanisms - Mondaq](https://www.mondaq.com/caymanislands/wealth-asset-management/7304/performance-based-incentive-fees-and-equalization-mechanisms)
- [American vs. European Waterfall - Allvue Systems](https://www.allvuesystems.com/resources/american-vs-european-waterfall/)
- [Distribution Waterfall - Wikipedia](https://en.wikipedia.org/wiki/Distribution_waterfall)
- [How Distribution Waterfalls Work in PE - Alter Domus](https://alterdomus.com/insight/private-equity-waterfall/)
- [Total Expense Ratio: Definition, Formula - Trading 212](https://www.trading212.com/learn/investing-101/ter-total-expense-ratio)
- [Ongoing Charges Figure - MoneyWeek](https://moneyweek.com/glossary/ocf-ongoing-charges-figure)
- [ESMA Guidelines on Performance Fees (PDF)](https://www.esma.europa.eu/sites/default/files/library/esma34-39-992_guidelines_on_performance_fees_en.pdf)
- [MiFID II Costs and Charges Disclosures Review - FCA](https://www.fca.org.uk/publications/multi-firm-reviews/mifid-ii-costs-and-charges-disclosures-review-findings)
- [Standardised Total Expense Ratio - SBAI](https://www.sbai.org/static/fe3b8b24-3824-44b6-82b7a5ee6b92f2b1/Standardised-Total-Expense-Ratio.pdf)
- [Trailer Fees & Retrocessions - 3C Advisory](https://3cadvisory.com/trailer-fees-kickbacks-by-any-other-name/)
- [MiFID II: A Game Changer for Asset Management - PwC](https://blog.pwc.lu/mifid-ii-game-changer-asset-management/)
- [Investment Fund Seeding Structures and Terms - THSH](https://www.thsh.com/publications/investment-fund-seeding-structures-and-negotiable-terms/)
- [Founders Share Classes: How to Structure - TSLG](http://tslg-law.com/founders-share-classes-how-to-structure-and-market-them/)
- [Founders Classes - Databento](https://databento.com/compliance/founders-classes)
- [Seed Investments - Proskauer](https://www.proskauer.com/pub/proskauer-hedge-start-seed-investments)
- [Crystallization Frequency - Breaking Down Finance](https://breakingdownfinance.com/finance-topics/alternative-investments/crystallization-frequency/)
- [Equalisation by Trinity Fund Administration (PDF)](https://aggregate.com.sg/wp-content/uploads/2022/01/Equalisation-by-Trinity.pdf)
