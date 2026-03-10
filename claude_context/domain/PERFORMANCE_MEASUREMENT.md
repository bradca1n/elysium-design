<!-- ~7000 tokens -->
# Performance Measurement & Attribution

**Last Updated:** 2026-02-10

---

**Cross-references:** `RECONCILIATION_AND_OPS.md` (month-end NAV production, T+0/T+1 cycle), `FEES_AND_EQUALIZATION.md` (gross vs. net returns, performance fee crystallization), `FUND_ACCOUNTING.md` (NAV calculation, daily accruals, journal entries), `NAV_METHODOLOGY.md` (pricing regimes, swing pricing, error materiality), `SHARE_CLASSES.md` (class-level returns, denomination currencies, hedged classes).

---

## 1. Time-Weighted Return (TWR)

### Definition

TWR measures the compound growth rate of one unit of currency invested in a portfolio, **eliminating the effect of external cash flows** (subscriptions and redemptions). This makes TWR the standard for comparing manager skill, because the timing and size of cash flows are typically investor-driven, not manager-driven.

### Formula: Geometric Linking of Sub-Period Returns

```
TWR = [(1 + R_1) x (1 + R_2) x ... x (1 + R_n)] - 1

Where each sub-period return R_t:
  R_t = (EMV_t - BMV_t - CF_t) / BMV_t

  EMV_t = ending market value of sub-period t
  BMV_t = beginning market value of sub-period t
  CF_t  = net external cash flow during sub-period t
```

Sub-periods are created at each **external cash flow** (subscription or redemption). The portfolio must be valued at each cash flow date.

### Daily Valuation Method vs. Modified Dietz

| Method | Approach | GIPS Compliant? |
|--------|----------|-----------------|
| **True daily TWR** | Value portfolio daily; compute daily returns; geometrically link | Yes (required since 1 Jan 2010) |
| **Modified Dietz** | Approximates sub-period return by weighting cash flows by time held | No longer compliant for periods from 1 Jan 2010 onward |

**Modified Dietz formula** (for reference / pre-2010 data):

```
R_MD = (EMV - BMV - CF) / (BMV + Sum(CF_i x W_i))

Where W_i = (D - d_i) / D
  D   = total days in period
  d_i = day of cash flow i
```

### Handling Large Cash Flows

GIPS requires valuation on the date of **any large external cash flow**. Firms must define "large" (typically 10% of portfolio value) in their policies. If a $50M portfolio receives a $7M subscription, the portfolio must be valued on that day to begin a new sub-period.

### Worked Example

| Day | Event | Portfolio Value | Cash Flow | Sub-Period Return |
|-----|-------|-----------------|-----------|-------------------|
| 1 Jan | Start | $10,000,000 | -- | -- |
| 15 Jan | Subscription | $10,450,000 (pre-flow) | +$2,000,000 | (10,450,000 - 10,000,000) / 10,000,000 = **+4.50%** |
| 31 Jan | End | $12,800,000 | -- | (12,800,000 - 12,450,000) / 12,450,000 = **+2.81%** |

**January TWR** = (1.0450 x 1.0281) - 1 = **+7.44%**

Note: Without sub-period linking, a simple return would be distorted by the $2M inflow.

---

## 2. Money-Weighted Return (MWR / IRR)

### Definition and Formula

MWR is the **internal rate of return (IRR)** -- the discount rate that equates the present value of all cash inflows to the present value of all cash outflows:

```
0 = CF_0 + CF_1/(1+r)^t1 + CF_2/(1+r)^t2 + ... + CF_n/(1+r)^tn + EMV/(1+r)^T

Solve for r iteratively (Newton-Raphson or bisection method).
```

MWR **includes** the timing effect of cash flows. A large subscription before a strong period inflates MWR relative to TWR; a large subscription before a loss deflates it.

### When MWR Is Appropriate

| Context | Preferred Metric | Reason |
|---------|-----------------|--------|
| Manager evaluation | TWR | Removes cash flow timing effect |
| PE/VC closed-end funds | SI-IRR (MWR) | Manager controls capital calls and distributions |
| Individual investor returns | MWR | Reflects actual investor experience |
| GIPS: closed-end PE/RE | SI-IRR required | Cash flow timing is part of the strategy |

### Since-Inception IRR (SI-IRR)

SI-IRR is the annualized MWR from fund inception (first capital call) through the measurement date. For PE funds, the ending value includes both realized distributions and unrealized NAV. GIPS 2020 requires SI-IRR for all closed-end fund strategies.

### Public Market Equivalent (PME)

PME benchmarks PE funds against a public index by simulating the same cash flow pattern:

**Kaplan-Schoar PME (KS-PME):**
```
KS-PME = FV(Distributions) / FV(Contributions)

Where FV = future value compounded at the public index return from
      each cash flow date to the measurement date.
```

- KS-PME > 1.0: Fund outperformed the public index
- KS-PME = 1.0: Equivalent performance
- KS-PME < 1.0: Fund underperformed

---

## 3. GIPS (Global Investment Performance Standards)

### Key Requirements (GIPS 2020)

| Requirement | Detail |
|-------------|--------|
| **Composite construction** | All fee-paying, discretionary portfolios must be included in at least one composite; composites must group portfolios with similar strategy |
| **Daily valuation** | Required for TWR since 1 Jan 2010; portfolios valued at each large external cash flow |
| **Minimum track record** | 5 years of GIPS-compliant history (or since inception if shorter); build to 10 years |
| **Gross and net returns** | Both must be presented; gross = before management fees, after transaction costs; net = after all fees |
| **Annual returns** | Each annual period must be presented individually (no cherry-picking) |
| **Annualization** | Returns for periods < 1 year **must not** be annualized |

### GIPS 2020 Changes (Effective 1 Jan 2020)

1. **Three report types**: GIPS Composite Report, GIPS Pooled Fund Report, GIPS Asset Owner Report (replaced "compliant presentation")
2. **MWR flexibility**: Firms may present MWR for strategies where MWR is appropriate (not just PE/RE)
3. **Pooled fund exception**: Single-strategy pooled funds need not be placed in composites
4. **Carve-outs with allocated cash**: Permitted again (was prohibited in 2010 edition)
5. **Estimated transaction costs**: Allowed when actual costs are unknown, with mandatory disclosure
6. **Broad valuation requirements**: Replaced separate private equity/real estate valuation sections

### Verification and Examination

- **Verification**: Independent third-party review that the firm has complied with all GIPS composite construction requirements and policies firm-wide. Does not ensure accuracy of any specific composite.
- **Examination**: Performance examination of a specific composite. More rigorous; tests calculations and disclosures for that composite.

### Portability of Track Records

A track record may be transferred to a new firm if: (a) substantially all decision-makers are employed by the new firm, (b) the decision-making process remains substantially intact, and (c) the new firm has records to support the performance history.

---

## 4. Performance Attribution

### Brinson-Fachler Model (Equity)

Decomposes excess return into three effects:

```
Allocation Effect   = Sum_i [(W_pi - W_bi) x (R_bi - R_b)]
Selection Effect    = Sum_i [W_bi x (R_pi - R_bi)]
Interaction Effect  = Sum_i [(W_pi - W_bi) x (R_pi - R_bi)]

Where:
  W_pi = portfolio weight in sector i
  W_bi = benchmark weight in sector i
  R_pi = portfolio return in sector i
  R_bi = benchmark return in sector i
  R_b  = total benchmark return
```

**Worked Example:**

| Sector | W_p | W_b | R_p | R_b(sector) | Allocation | Selection | Interaction |
|--------|-----|-----|-----|-------------|------------|-----------|-------------|
| Equity | 60% | 50% | 12% | 10% | (0.10)(10%-8%) = +0.20% | (0.50)(12%-10%) = +1.00% | (0.10)(12%-10%) = +0.20% |
| Bonds | 40% | 50% | 5% | 6% | (-0.10)(6%-8%) = +0.20% | (0.50)(5%-6%) = -0.50% | (-0.10)(5%-6%) = +0.10% |
| **Total** | | | | R_b = 8% | **+0.40%** | **+0.50%** | **+0.30%** |

Total excess return = 0.40% + 0.50% + 0.30% = **+1.20%**. Portfolio return: 60%(12%) + 40%(5%) = 9.20%. Benchmark: 50%(10%) + 50%(6%) = 8.00%. Excess: 1.20%. Verified.

### Fixed Income Attribution

Decomposes bond returns into rate and spread components:

| Component | Source of Return |
|-----------|-----------------|
| **Income / carry** | Coupon income adjusted for accrued interest |
| **Duration / parallel shift** | Return from parallel movement in the yield curve |
| **Yield curve (twist/butterfly)** | Return from non-parallel curve changes (steepening, flattening, curvature) |
| **Spread** | Return from credit spread changes (tightening or widening) |
| **Currency** | Return from FX movements for non-base-currency bonds |
| **Selection / residual** | Security-specific return not explained by systematic factors |

### Multi-Period Attribution

Single-period attribution effects do not sum across time. Three smoothing algorithms are used:

| Method | Approach | Residual Treatment |
|--------|----------|--------------------|
| **Carino (1999)** | Logarithmic adjustment factors | Redistributed proportionally using log-return ratios |
| **Menchero (2000)** | Optimized residual redistribution | Minimizes change in any single factor |
| **Frongello (2002)** | Incremental compounding | Each period's effects compound on prior cumulative |

All three produce near-identical results. Carino is most widely implemented in commercial systems.

### Currency Attribution (Multi-Currency Portfolios)

For a portfolio holding assets in multiple currencies, return decomposes as:

```
Total Return (base) = Local Return + Currency Return + Cross-Product

Currency Return per asset = W_i x (FX change for currency i)
```

**Hedged classes**: Currency attribution must separate the FX return on the underlying assets from the gain/loss on hedging instruments (forwards, swaps). The hedge effectiveness ratio (target: 95-105%) is a key metric.

---

## 5. Risk-Adjusted Performance Measures

| Measure | Formula | Interpretation |
|---------|---------|----------------|
| **Sharpe Ratio** | (R_p - R_f) / sigma_p | Excess return per unit of total risk. >1.0 is good; >2.0 is excellent. Assumes normal distribution. |
| **Sortino Ratio** | (R_p - MAR) / sigma_downside | Like Sharpe but penalizes only downside volatility. Better for asymmetric return distributions. |
| **Information Ratio** | (R_p - R_b) / TE | Active return per unit of tracking error. >0.5 is good; >1.0 is exceptional. |
| **Treynor Ratio** | (R_p - R_f) / beta_p | Excess return per unit of systematic risk. Appropriate for diversified portfolios. |
| **Jensen's Alpha** | R_p - [R_f + beta_p x (R_m - R_f)] | Intercept of CAPM regression. Positive = outperformance after adjusting for beta. |
| **Calmar Ratio** | Annualized Return / Max Drawdown | Return relative to worst peak-to-trough decline. Common for hedge funds and CTAs. |
| **Maximum Drawdown** | max(Peak - Trough) / Peak | Largest cumulative loss from a peak. Key tail-risk metric. |

**Key limitations:** Sharpe and Sortino assume stationary distributions; Information Ratio is sensitive to benchmark choice; Jensen's Alpha assumes CAPM holds; all are backward-looking.

---

## 6. Benchmark and Peer Group

### Benchmark Selection Criteria

A valid benchmark must be: **S**pecified in advance, **A**ppropriate to the strategy, **M**easurable, **U**nambiguous, **R**eflective of current investment opinions, **A**ccountable, **I**nvestable (the "SAMURAI" criteria).

### Tracking Error

```
Tracking Error (TE) = StdDev(R_p - R_b) over rolling periods

Annualized TE = Monthly TE x sqrt(12)
```

| TE Range | Interpretation |
|----------|----------------|
| < 1% | Index-tracking / passive |
| 1-3% | Enhanced index / low active |
| 3-6% | Active management |
| > 6% | High conviction / concentrated |

### Custom / Blended Benchmarks

For multi-asset funds: `Blended BM = w1 x Index_1 + w2 x Index_2 + ... + wn x Index_n`. Weights must be rebalanced at a defined frequency (monthly or quarterly). All constituent indices and weights must be disclosed to investors.

### Peer Group Comparison

| Factor | Consideration |
|--------|---------------|
| **Universe** | Must be strategy-appropriate (e.g., Irish UCITS equity vs. all global equity) |
| **Survivorship bias** | Exclude terminated funds distorts results upward; include them |
| **Percentile ranking** | Report quartile (top 25%, median, bottom 25%) rather than exact rank |
| **Limitations** | Peer groups are not investable benchmarks; composition changes over time |

---

## 7. Reporting Formats

### Gross vs. Net Returns

| Type | Deductions | Used For |
|------|------------|----------|
| **Gross-of-fees** | After transaction costs only | Attribution analysis, manager-to-manager comparison, GIPS composites |
| **Net-of-fees** | After management fees and transaction costs | Investor reporting, marketing materials |
| **Net-net** | After all fees including performance fees | Actual investor experience, regulatory filings |

### Annualization Conventions

```
Annualized Return = (1 + Cumulative Return)^(365.25 / days) - 1
```

| Rule | Detail |
|------|--------|
| **< 1 year** | Do NOT annualize (GIPS requirement). Show cumulative only. |
| **>= 1 year** | Annualize using geometric compounding |
| **Day count** | Use actual/365.25 (accounts for leap years) or actual/actual |
| **Since inception** | Always show both cumulative and annualized (if >= 1 year) |

### Standard Reporting Periods

| Period | Convention |
|--------|------------|
| **MTD** | Month-to-date (current month, cumulative) |
| **QTD** | Quarter-to-date |
| **YTD** | Year-to-date (1 Jan to current date) |
| **1Y / 3Y / 5Y / 10Y** | Trailing periods from most recent month-end, annualized |
| **SI** | Since inception (both cumulative and annualized if >= 1 year) |

### Investor-Level Returns

Individual investors may have different returns from the fund composite due to varying subscription dates, redemption timing, and fee arrangements. Investor-level return uses MWR methodology reflecting the investor's actual cash flows:

```
Investor Return = MWR(investor's subscriptions, redemptions, current value)
```

This is distinct from the fund's TWR. Irish administrators must provide both on investor statements. For equalized funds, the per-share return is net of equalization adjustments (see `FEES_AND_EQUALIZATION.md`).

---

## Sources

- CFA Institute, *Global Investment Performance Standards (GIPS) for Firms 2020*: https://www.gipsstandards.org/wp-content/uploads/2021/03/2020_gips_standards_firms.pdf
- CFA Institute, *GIPS Guidance Statement on Calculation Methodology*: https://www.gipsstandards.org/wp-content/uploads/2021/03/calculation_methodology_gs_2011.pdf
- CFA Institute, *Performance Attribution Literature Review*: https://rpc.cfainstitute.org/sites/default/files/-/media/documents/book/rf-lit-review/2019/rflr-performance-attribution.pdf
- Kaplan, S. & Schoar, A. (2005), *Private Equity Performance: Returns, Persistence and Capital Flows*, Journal of Finance
- Carino, D. (1999), *Combining Attribution Effects Over Time*, Journal of Performance Measurement
- Morningstar, *Equity Performance Attribution Methodology*: https://morningstardirect.morningstar.com/clientcomm/Morningstar-Equity-Performance-Attribution-Methodology.pdf
- Wikipedia, *Modified Dietz Method*: https://en.wikipedia.org/wiki/Modified_Dietz_method
- Wikipedia, *Fixed-Income Attribution*: https://en.wikipedia.org/wiki/Fixed-income_attribution
- Cohen & Co., *9 Notable Changes to GIPS 2020*: https://www.cohenco.com/knowledge-center/insights/july-2019/9-notable-changes-to-final-2020-global-investment-performance-standards-gips

---

## Related Files

- `RECONCILIATION_AND_OPS.md` -- Month-end NAV production cycle, T+0/T+1 timeline
- `FEES_AND_EQUALIZATION.md` -- Gross/net performance fee calculation, equalization methods
- `FUND_ACCOUNTING.md` -- NAV calculation, daily accruals, chart of accounts
- `NAV_METHODOLOGY.md` -- Pricing regimes, swing pricing, error materiality thresholds
- `SHARE_CLASSES.md` -- Class-level return differences, denomination currencies, hedged classes
