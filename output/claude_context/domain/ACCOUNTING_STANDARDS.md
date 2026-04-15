# Accounting Standards for Investment Funds

<!-- ~6500 tokens -->
**Last Updated:** 2026-02-10

---

## 1. IFRS for Investment Entities

### IFRS 10 — Consolidation Exemption

An **investment entity** is exempt from full consolidation under IFRS 10 (amended October 2012). Instead, it measures subsidiaries at **fair value through profit or loss (FVTPL)** under IFRS 9. Three criteria define an investment entity:

1. **Obtains funds** from one or more investors to provide investment returns
2. **Business purpose** is to invest solely for capital appreciation, investment income, or both
3. **Measures and evaluates** substantially all investments on a fair value basis

This exemption ensures fund financial statements reflect investment performance rather than operational control over subsidiaries.

### IFRS 13 — Fair Value Measurement

IFRS 13 defines fair value as the **exit price** — the price received to sell an asset or paid to transfer a liability in an orderly transaction between market participants at the measurement date. It establishes the fair value hierarchy (see Section 3) and requires extensive disclosures about valuation techniques and inputs.

### IAS 32 / IFRS 9 — Financial Instruments

- **IAS 32**: Classification of instruments as equity vs. liability. Puttable shares (redeemable at NAV) are normally liabilities under IAS 32, but may qualify for the equity exception if they are the most subordinate class and entitle holders to a pro-rata share of net assets on liquidation.
- **IFRS 9**: Classification and measurement of financial assets (amortized cost, FVOCI, or FVTPL). For investment entities, most holdings are measured at **FVTPL** by default. Derivatives are always FVTPL unless designated as hedging instruments.

---

## 2. US GAAP — ASC 946 (Investment Companies)

### Qualification Criteria

An entity must meet **three fundamental characteristics**:

1. Obtains funds from investors and provides investment management services
2. Commits that its business purpose and only substantive activities are investing solely for returns from capital appreciation, investment income, or both
3. Does not obtain or have the objective of obtaining operating or strategic benefits from its investments

Additionally, **five typical characteristics** are assessed (not all required): unit ownership structure, pooling of funds, reporting in a single currency, commingled reporting entity, and fair value-based reporting.

### Key Differences from IFRS

| Topic | IFRS | US GAAP (ASC 946) |
|-------|------|-------------------|
| Consolidation | Investment entity exemption (FVTPL for subsidiaries) | Investment companies do not consolidate operating subsidiaries; measure all at fair value |
| Share classification | Puttable shares may be equity (IAS 32 exception) | Shares typically classified as equity; net assets reported |
| Financial statements | Statement of Financial Position, Statement of Comprehensive Income, Statement of Changes in Net Assets | Statement of Assets and Liabilities, Statement of Operations, Statement of Changes in Net Assets |
| Schedule of Investments | Disclosure in notes | **Required** as a primary financial statement |
| Financial Highlights | Encouraged but not mandated | **Required** — per-share data by class |
| Expense ratios | Not specifically required | Required in Financial Highlights |

### ASC 946 Financial Statements

1. **Statement of Assets and Liabilities** (balance sheet equivalent)
2. **Schedule of Investments** — portfolio holdings by category (equities, fixed income, derivatives, etc.) with cost and fair value
3. **Statement of Operations** — investment income, realized/unrealized gains and losses, expenses
4. **Statement of Changes in Net Assets** — subscriptions, redemptions, distributions, net income
5. **Statement of Cash Flows** (if applicable)
6. **Financial Highlights** — per-share data, total return, expense ratios, portfolio turnover, net assets

---

## 3. Fair Value Hierarchy (ASC 820 / IFRS 13)

### Level 1 — Quoted Prices in Active Markets

Unadjusted quoted prices for **identical** assets/liabilities in active markets. Most reliable.

**Examples**: Listed equities on major exchanges, exchange-traded funds, government bonds with active secondary markets, open-ended mutual funds with daily published NAV.

### Level 2 — Observable Inputs

Inputs other than Level 1 that are observable, either directly or indirectly.

**Examples**: Corporate bonds priced via dealer quotes or matrix pricing, interest rate swaps valued using observable yield curves, FX forwards priced using spot rates and interest rate differentials, OTC options priced using implied volatility surfaces from exchange-traded options on the same underlying.

### Level 3 — Unobservable Inputs

Significant unobservable inputs requiring management judgment and estimation.

**Examples**: Private equity/venture capital investments, illiquid real estate, distressed debt, side-pocketed assets, complex structured products, newly issued securities with no trading history.

### NAV Practical Expedient (ASC 820-10-35-59)

Under US GAAP, investments in certain funds (hedge funds, PE funds, real estate funds) may use **NAV as a practical expedient** without classifying in the hierarchy. Requires disclosure of redemption terms, unfunded commitments, and any restrictions on redemption.

### Impact on NAV Reliability

| Level | Pricing Source | Frequency | Override Risk |
|-------|---------------|-----------|---------------|
| 1 | Market data feeds | Real-time/daily | Minimal |
| 2 | Models with observable inputs | Daily/periodic | Moderate — model selection matters |
| 3 | Internal models, appraisals | Quarterly/annual | High — significant management judgment |

**Elysium relevance**: On-chain NAV updates via `publishNav()` must track the fair value hierarchy of underlying assets to support audit trail and disclosure requirements. See `FUND_ACCOUNTING.md` for the on-chain pricing formula.

---

## 4. Revenue Recognition for Investment Funds

### Unrealized Gains and Losses

Recognized **daily** as changes in fair value of portfolio holdings. Not triggered by a sale — recorded through mark-to-market.

- **Debit**: Investment Securities (increase in asset value) or Unrealized Loss on Investments
- **Credit**: Unrealized Gain on Investments (income) or Investment Securities (decrease)

Investment companies under ASC 946 and IFRS investment entities recognize unrealized gains/losses in the **Statement of Operations / Statement of Comprehensive Income** (not OCI).

### Realized Gains and Losses

Recognized on **disposal** of an investment. Calculated as sale proceeds minus cost basis (or adjusted cost basis for amortized securities).

### Dividend Income

Recognized on the **ex-dividend date** (the date the fund becomes entitled to the dividend).

### Interest Income

Recognized on an **accrual basis** using the effective interest method. For bonds purchased at a premium or discount, amortization adjusts the yield to maturity.

---

## 5. Accounting for Derivatives

### Initial Recognition

Under IFRS 9 and ASC 815, derivatives are recognized at **fair value** on the date the contract is entered. Most derivatives have zero or near-zero fair value at inception (except purchased options, which have a premium).

### Subsequent Measurement (Mark-to-Market)

All derivatives are measured at fair value at each reporting date. For investment funds not applying hedge accounting:

| Derivative | Valuation Approach | Typical Level |
|------------|-------------------|---------------|
| **Futures** | Settlement price from exchange | Level 1 |
| **FX Forwards** | Spot rate + forward points (interest rate differential) | Level 2 |
| **Listed Options** | Market price from exchange | Level 1 |
| **OTC Options** | Black-Scholes or similar model with observable inputs | Level 2 |
| **Interest Rate Swaps** | Discounted cash flow using observable yield curves | Level 2 |
| **Total Return Swaps** | DCF + reference asset fair value | Level 2-3 |

### Hedge Accounting (Optional under IFRS 9)

Three types: Fair Value Hedge, Cash Flow Hedge, Net Investment Hedge. Requires formal designation and documentation, effectiveness testing, and ongoing measurement. For **share class FX hedging** (see `SHARE_CLASSES.md`), hedge accounting may be applied to FX forwards hedging the class's currency exposure.

### Collateral (Margin)

- **Variation margin** on exchange-traded derivatives: Adjust derivative carrying value; collateral posted is a receivable
- **Initial margin**: Recognized as a restricted asset (margin deposit), not netted against derivative value

---

## 6. Side Pockets and Illiquid Assets

### Side Pocket Mechanics

A **side pocket** is a segregated account within a fund holding illiquid or hard-to-value investments:

- Created by transferring assets from the main portfolio at current fair value (often cost or last marked value)
- Only investors at the time of creation participate in the side pocket
- New subscribers do **not** receive side pocket exposure
- Redemptions from the side pocket are **suspended** until realization

### Accounting Treatment

- Separate NAV track for side pocket vs. liquid portfolio
- Side pocket valued at Level 3 (management estimate) or written down to zero
- Performance fees typically **not charged** until a realization event
- Operating expenses may or may not be shared with the main portfolio

### Gates and Suspensions

- **Gates**: Limit aggregate redemptions per period (e.g., 25% of NAV per quarter). Excess requests are queued.
- **Suspensions**: Temporary halt of all redemptions, typically due to inability to value assets or extraordinary market conditions
- Both require disclosure in financial statements and investor communications

---

## 7. Audit Standards for Investment Funds

### ISA 540 — Auditing Accounting Estimates

Critical for funds due to Level 2/3 valuations, performance fee accruals, and illiquid asset estimates. Requires the auditor to:

- Understand management's estimation process and key assumptions
- Evaluate the reasonableness of significant estimates
- Test data inputs and model logic
- Assess estimation uncertainty and potential management bias

### ISA 620 — Using the Work of an Auditor's Expert

When valuations require specialist knowledge (real estate appraisals, complex derivative models, private company valuations), the auditor may engage or rely on an expert. Must evaluate the expert's competence, objectivity, and the adequacy of their work.

### ISA 550 — Related Parties

Investment funds frequently involve related-party transactions: management fees paid to the fund manager, performance allocations, investments in affiliated funds, soft-dollar arrangements. Auditors must identify all related parties, assess the completeness of disclosures, and evaluate whether transactions are at arm's length.

### Additional Standards

- **ISA 505 (External Confirmations)**: Custodian and broker confirmations for portfolio holdings
- **ISA 520 (Analytical Procedures)**: NAV reconciliation, expense ratio analysis, performance attribution
- **PCAOB AS 2501 (US)**: Auditing fair value measurements and disclosures (US public company audit standard)

---

## 8. Worked Journal Entry Examples

All examples use a fund with base currency USD. Amounts are illustrative.

### 8.1 Subscription (Investor Deposits $1,000,000)

```
Date: 2026-01-15 — Investor subscribes at NAV of $100.00/share → 10,000 shares issued

Dr  Cash / Bank Account                    $1,000,000
    Cr  Subscriptions Receivable                         $1,000,000
        (On subscription date — may be T+0 to T+3)

Dr  Subscriptions Receivable                $1,000,000
    Cr  Net Assets Attributable to Holders               $1,000,000
        (On settlement — shares issued, NAV updated)
```

If subscription is received in cash simultaneously:

```
Dr  Cash / Bank Account                    $1,000,000
    Cr  Net Assets Attributable to Holders               $1,000,000
```

### 8.2 Redemption (Investor Redeems 5,000 Shares at NAV $102.50)

```
Date: 2026-03-01 — Redemption value = 5,000 x $102.50 = $512,500

Dr  Net Assets Attributable to Holders       $512,500
    Cr  Redemptions Payable                               $512,500
        (On redemption date — shares cancelled)

Dr  Redemptions Payable                      $512,500
    Cr  Cash / Bank Account                               $512,500
        (On settlement date — cash paid to investor)
```

### 8.3 Dividend Income Received ($15,000 from portfolio holding)

```
Date: 2026-02-20 — Ex-dividend date

Dr  Dividends Receivable                     $15,000
    Cr  Dividend Income                                    $15,000
        (Recognize income on ex-date)

Date: 2026-03-05 — Payment date

Dr  Cash / Bank Account                      $15,000
    Cr  Dividends Receivable                               $15,000
        (Cash received from custodian)
```

### 8.4 Interest Income Accrual ($8,333 monthly on bond portfolio)

```
Date: 2026-01-31 — Month-end accrual

Dr  Accrued Interest Receivable               $8,333
    Cr  Interest Income                                     $8,333

Date: 2026-02-15 — Coupon payment received

Dr  Cash / Bank Account                      $50,000
    Cr  Accrued Interest Receivable                        $50,000
        (Semi-annual coupon; resets accrual)
```

### 8.5 Management Fee Accrual (1.5% p.a. on $100M NAV, accrued daily)

```
Daily rate = 1.5% / 365 = 0.004110%
Daily accrual = $100,000,000 x 0.004110% = $4,110

Date: 2026-01-15 — Daily accrual entry

Dr  Management Fee Expense                    $4,110
    Cr  Management Fees Payable                             $4,110

Date: 2026-01-31 — Monthly payment to manager

Dr  Management Fees Payable                  $61,644
    Cr  Cash / Bank Account                                $61,644
        (15 days x $4,110 — partial month example)
```

### 8.6 Performance Fee Crystallization

Assumptions: 20% performance fee, high-water mark (HWM) of $105.00, current NAV $112.00, 100,000 shares outstanding.

```
Gain above HWM = ($112.00 - $105.00) x 100,000 = $700,000
Performance fee = 20% x $700,000 = $140,000
New HWM = $112.00

Date: 2026-12-31 — Crystallization date (annual)

Dr  Performance Fee Expense                 $140,000
    Cr  Performance Fees Payable                          $140,000
        (Crystallize at period end; update HWM)

Date: 2026-01-15 — Payment to manager

Dr  Performance Fees Payable                $140,000
    Cr  Cash / Bank Account                              $140,000
```

See `FEES_AND_EQUALIZATION.md` for equalization mechanics and series accounting.

### 8.7 Unrealized Gain on Investment Portfolio

```
Date: 2026-01-31 — Month-end mark-to-market
Portfolio cost basis: $50,000,000
Portfolio fair value: $52,300,000
Unrealized gain: $2,300,000

Dr  Investment Securities                  $2,300,000
    Cr  Net Change in Unrealized Appreciation
        on Investments                                   $2,300,000
```

### 8.8 Realized Gain on Sale

```
Date: 2026-02-10 — Sell 10,000 shares of XYZ Corp
Cost basis: $500,000
Proceeds: $620,000
Realized gain: $120,000

Dr  Cash / Bank Account                     $620,000
    Cr  Investment Securities                             $500,000
    Cr  Net Realized Gain on Investments                  $120,000

Reverse prior unrealized gain on XYZ (if any):

Dr  Net Change in Unrealized Appreciation
    on Investments                            $80,000
    Cr  Investment Securities                              $80,000
        (Remove unrealized portion now realized)
```

---

## 9. Chart of Accounts — Investment Fund Structure

### Account Numbering Convention

| Range | Category | Examples |
|-------|----------|----------|
| **1000–1999** | Assets | Cash, investments at fair value, receivables, margin deposits |
| **2000–2999** | Liabilities | Redemptions payable, fees payable, derivatives (short), accrued expenses |
| **3000–3999** | Net Assets / Equity | Net assets attributable to holders, retained earnings, accumulated OCI |
| **4000–4999** | Investment Income | Dividend income, interest income, realized gains/losses, unrealized gains/losses |
| **5000–5999** | Fund Expenses | Management fees, performance fees, custody fees, audit fees, legal fees, admin fees |
| **6000–6999** | FX / Hedging | FX translation gains/losses, hedging P&L, forward contract revaluation |
| **7000–7999** | Capital Activity | Subscriptions, redemptions, distributions, equalizations |

### Typical Sub-Accounts

```
1000  Cash and Cash Equivalents
  1010  Cash — Custodian Account (USD)
  1020  Cash — Custodian Account (EUR)
  1030  Cash — Custodian Account (GBP)
  1050  Margin Deposits
  1060  Collateral Posted

1100  Investments at Fair Value
  1110  Equities — Listed
  1120  Equities — Unlisted (Level 3)
  1130  Fixed Income — Government
  1140  Fixed Income — Corporate
  1150  Derivatives — Long Positions
  1160  Fund Investments (Fund of Funds)

1200  Receivables
  1210  Subscriptions Receivable
  1220  Dividends Receivable
  1230  Interest Receivable
  1240  Trade Receivables (Unsettled Sales)
  1250  Tax Reclaims Receivable

2000  Liabilities
  2010  Redemptions Payable
  2020  Trade Payables (Unsettled Purchases)
  2030  Management Fees Payable
  2040  Performance Fees Payable
  2050  Custody Fees Payable
  2060  Audit & Legal Fees Payable
  2070  Derivatives — Short Positions
  2080  Distributions Payable

3000  Net Assets
  3010  Net Assets Attributable to Holders — Class A
  3020  Net Assets Attributable to Holders — Class B
  3030  Equalization Reserve
  3040  Accumulated Undistributed Income

4000  Investment Income
  4010  Dividend Income
  4020  Interest Income
  4030  Net Realized Gains on Investments
  4040  Net Change in Unrealized Appreciation/Depreciation
  4050  Securities Lending Income
  4060  Other Income

5000  Fund Expenses
  5010  Management Fee Expense
  5020  Performance Fee Expense
  5030  Administration Fee Expense
  5040  Custody Fee Expense
  5050  Audit Fee Expense
  5060  Legal Fee Expense
  5070  Regulatory/Filing Fees
  5080  Transaction Costs (Brokerage)
  5090  Bank Charges
  5100  Director Fees
  5110  Other Operating Expenses

6000  Foreign Currency
  6010  Realized FX Gains/Losses
  6020  Unrealized FX Gains/Losses
  6030  Hedging Gains/Losses — FX Forwards
  6040  Hedging Transaction Costs

7000  Capital Activity
  7010  Subscriptions Received
  7020  Redemptions Paid
  7030  Distributions to Investors
  7040  Equalization Credits/Debits
  7050  Transfer Agent Adjustments
```

---

## 10. Accounting Policies

### Going Concern

Fund financial statements are prepared on a going concern basis unless the fund has a fixed termination date or is in the process of liquidation/winding up. Funds with finite lives (e.g., closed-end PE funds) must disclose the expected termination date.

### Functional Currency (IAS 21 / ASC 830)

The functional currency is determined by the **primary economic environment** in which the fund operates. For investment funds, key indicators:

- Currency in which investments are denominated
- Currency of subscriptions/redemptions
- Currency in which performance is evaluated by investors
- Currency of the primary capital market

Multi-currency funds may have a functional currency different from the denomination currency of individual share classes. Class-level FX hedging addresses this mismatch (see `SHARE_CLASSES.md`).

### Foreign Currency Translation

- **Monetary items** (cash, receivables, payables): Translated at the **closing rate** at each reporting date
- **Non-monetary items at fair value** (investments): Translated at the rate on the date fair value was determined (effectively the closing rate for daily-valued portfolios)
- **Income and expenses**: Translated at the rate on the transaction date (or average rate if rates do not fluctuate significantly)
- **Exchange differences**: Recognized in profit or loss for FVTPL items; in OCI for FVOCI items

### Presentation Currency

When the presentation currency differs from the functional currency, all amounts are translated using IAS 21 closing-rate method, with resulting exchange differences in OCI.

---

## 11. Cross-References

- **`FUND_ACCOUNTING.md`** — NAV calculation methodology, on-chain pricing formula, dilution system, cost tagging
- **`FEES_AND_EQUALIZATION.md`** — Management fee rates, performance fee structures, equalization mechanics, series accounting
- **`NAV_METHODOLOGY.md`** — Detailed NAV computation methodology, pricing sources, swing pricing
- **`SHARE_CLASSES.md`** — Multi-currency denomination, class-specific hedging, share class mechanics

---

## Sources

- [IFRS 10 — Consolidated Financial Statements](https://www.ifrs.org/issued-standards/list-of-standards/ifrs-10-consolidated-financial-statements/)
- [How Investment Entities Consolidate or Measure Subsidiaries under IFRS 10 and ASC 946](https://www.datastudios.org/post/how-investment-entities-consolidate-or-measure-subsidiaries-under-ifrs-10-and-asc-946)
- [KPMG Investment Companies Handbook (May 2025)](https://kpmg.com/us/en/frv/reference-library/2025/handbook-investment-companies.html)
- [Accounting for Investment Companies under ASC 946 — GAAP Dynamics](https://www.gaapdynamics.com/insights/blog/2020/09/08/accounting-for-investment-companies-under-asc-946-an-overview/)
- [PwC: Inputs to Fair Value Measurement and Hierarchy](https://viewpoint.pwc.com/dt/us/en/pwc/accounting_guides/fair_value_measureme/fair_value_measureme__9_US/chapter_4_concepts_u_US/45_inputs_to_fair_va_US.html)
- [PwC: Fair Value Hierarchy for Net Asset Value](https://viewpoint.pwc.com/dt/us/en/pwc/accounting_guides/financial_statement_/financial_statement___18_US/chapter_20_fair_valu_US/204_net_asset_value_US.html)
- [Deloitte: Level 1 Inputs (ASC 820)](https://dart.deloitte.com/USDART/home/codification/broad-transactions/asc820-10/roadmap-fair-value-measurements-disclosures/chapter-8-fair-value-hierarchy/8-2-level-1-inputs)
- [Fair Value Measurement Best Practices — Richey May](https://richeymay.com/wp-content/uploads/2020/07/Guide-Fair-Value-Measurement-ASC-820.pdf)
- [PwC: Illustrative IFRS Financial Statements 2024 — Investment Funds](https://viewpoint.pwc.com/dt/gx/en/pwc/example_accounts/industry_illustrativ/investment_funds/assets/Illustrative_IFRS_financial_statements_2024_Investment_funds_FINAL.pdf)
- [KPMG: Illustrative Disclosures for Investment Funds (2024)](https://assets.kpmg.com/content/dam/kpmg/be/pdf/ifrs-Illustrative-disclosures-for-investment-funds-December-2024.pdf)
- [IFRS 9 — Accounting for Forwards and Options](https://www.linkedin.com/pulse/ifrs-9-accounting-forwards-options-matthew-gustavson-cpa-ca)
- [IFRS Community: Derivatives and Embedded Derivatives](https://ifrscommunity.com/knowledge-base/ifrs-9-derivatives-and-embedded-derivatives/)
- [SSC Technologies: Understanding Performance Fees — Series vs Equalization](https://www.ssctech.com/blog/understanding-performance-fees-in-hedge-funds-series-vs-equalization)
- [BBH: UCITS Side Pockets](https://www.bbh.com/us/en/insights/blog/on-the-regs/ucits-side-pockets--what-you-need-to-know.html)
- [SSC Technologies: Operational Complexities of Side Pockets](https://www.ssctech.com/blog/overcoming-the-operational-complexities-of-side-pockets)
- [IAASB: ISA 540 (Revised)](https://www.iaasb.org/publications/isa-540-revised-auditing-accounting-estimates-and-related-disclosures-9)
- [ACCA: ISA 550 Related Parties](https://www.accaglobal.com/us/en/member/discover/cpd-articles/audit-assurance/related-parties.html)
- [IAS Plus: IAS 21 — Effects of Changes in Foreign Exchange Rates](https://www.iasplus.com/en/standards/ias/ias21)
- [IFRS Community: IAS 21 Effects of Changes in Foreign Exchange Rates](https://ifrscommunity.com/knowledge-base/ias-21-effects-of-changes-in-foreign-exchange-rates/)
