<!-- ~6000 tokens -->
# Securities Lending Operations

**Last Updated:** 2026-02-10

---

> **Cross-references:** `domain/REGULATORY.md` (UCITS/AIFMD restrictions on EPM techniques), `domain/ACCOUNTING_STANDARDS.md` (IFRS 9 financial instrument treatment, derecognition criteria), `domain/RECONCILIATION_AND_OPS.md` (securities lending position reconciliation, tri-party matching), `domain/GOVERNANCE_AND_COMPLIANCE.md` (board oversight of lending programs, CP86 delegation), `domain/DISTRIBUTIONS_AND_INCOME.md` (manufactured dividends, income attribution from lending)
>, `domain/DERIVATIVES_AND_MARGIN.md` (SFTR overlap, collateral management synergies, EMIR reporting)

---

## 1. Securities Lending Mechanics

### Participants

| Role | Description | Examples |
|------|-------------|----------|
| **Beneficial owner** | The fund that owns the securities and earns lending revenue | UCITS fund, Cayman SPC sub-fund |
| **Agent lender** | Intermediary that manages the lending programme on behalf of the fund | BlackRock, State Street, BNY Mellon, Northern Trust |
| **Borrower** | Typically a broker-dealer or bank needing securities for short selling, settlement, or hedging | Goldman Sachs, Morgan Stanley, JP Morgan |
| **Tri-party agent** | Holds and manages collateral in a segregated account | Euroclear, Clearstream, BNY Mellon |

### Principal vs. Agency Lending

| Model | Risk Bearer | Revenue | Typical User |
|-------|-------------|---------|--------------|
| **Agency** | Beneficial owner bears borrower default risk (mitigated by indemnification) | Revenue split with agent (70/30 to 85/15) | Most UCITS/AIF lending programmes |
| **Principal** | Agent lender takes securities onto its own book and bears all risk | Agent keeps larger spread; fund receives fixed fee | Some bank proprietary desks |

In the agency model, each beneficial owner is typically added as a principal lender to the agent's existing **GMSLA** (Global Master Securities Lending Agreement, published by ISLA) with each borrower. The GMSLA governs: loan initiation, collateral obligations, recall rights, events of default, and close-out netting. Two variants exist:

- **GMSLA 2010 (Title Transfer):** Borrower transfers collateral by title; lender may rehypothecate.
- **GMSLA 2018 (Pledge/Security Interest):** Borrower pledges collateral; lender has a security interest but no right to reuse. Designed specifically for agency lending where UCITS rules prohibit rehypothecation of non-cash collateral.

### Lending Eligibility and Programme Structure

- **Eligible securities:** Equities, government bonds, corporate bonds, ETFs. The fund's prospectus and investment restrictions define what may be lent.
- **Concentration limits:** Agent programmes typically cap lending at 50-80% of any single holding (to preserve liquidity for sales and corporate actions).
- **Exclusive vs. non-exclusive:** Exclusive programmes commit all eligible inventory to one agent; non-exclusive allows splitting across agents but may reduce utilisation.
- **Recall procedures:** The lender may recall any loaned security at any time for: (a) sale, (b) proxy voting, (c) corporate action participation, (d) settlement obligation. Standard market settlement is T+1 (equities) or T+2 (bonds) from recall notice.

---

## 2. Collateral Management

### Eligible Collateral and Haircuts

| Collateral Type | Typical Margin (% of Loan MtM) | Haircut Range | Notes |
|-----------------|-------------------------------|---------------|-------|
| Cash (same currency) | 100-102% | 0-2% | Most common in US markets |
| G7 government bonds | 102-105% | 2-5% | Preferred under UCITS; highly liquid |
| Investment-grade corporate bonds | 105-110% | 5-10% | Subject to liquidity and credit assessment |
| Equities (main index) | 105-110% | 5-10% | Must meet ESMA diversification rules |
| Equities (small cap / EM) | 110-115% | 10-15% | Higher volatility = higher haircut |
| Letters of credit | 100% | 0% (bank risk) | Rare; only from highly-rated banks |

ESMA Guidelines 2014/937 (on ETFs and other UCITS issues) require that collateral be: (i) highly liquid, (ii) traded on a regulated market or MFT, (iii) valued daily, (iv) of high credit quality (investment grade minimum), and (v) issued by an entity not correlated with the borrower.

### Daily Mark-to-Market and Margin Calls

Both loaned securities and collateral are marked to market daily. If the collateral value falls below the required margin level, a margin call is issued to the borrower:

1. **Calculation:** Collateral shortfall = (Loan MtM x Required Margin %) - Collateral MtM
2. **Notification:** Agent sends margin call by agreed cut-off (typically 10:00 local time)
3. **Settlement:** Borrower delivers additional collateral by end of business day (T+0 or T+1)
4. **Failure:** Persistent margin call failure is an event of default under the GMSLA

### Cash Collateral Reinvestment

When a borrower posts cash collateral, the fund (or agent on its behalf) reinvests that cash. UCITS-eligible reinvestment vehicles:

- Short-term money market funds (CNAV or LVNAV)
- Reverse repurchase agreements with credit institutions
- Short-dated government securities (T-bills, G7 sovereign bonds < 397 days)

**Reinvestment risk:** If the reinvestment vehicle loses value (e.g., a money market fund breaks the buck or a repo counterparty defaults), the fund must still return 100% of cash collateral to the borrower. The loss falls on the fund's NAV. This is the single largest operational risk in securities lending.

### Non-Cash Collateral

Non-cash collateral under UCITS may **not** be sold, reinvested, or pledged by the fund. It must be held by the fund's depositary (or sub-custodian). Tri-party agents (Euroclear, Clearstream) manage substitution and mark-to-market automatically.

---

## 3. Revenue Sharing and Economics

### Income Split Models

| Programme Size (AUM) | Typical Lender Share | Agent Share |
|----------------------|---------------------|-------------|
| < USD 500M | 70-75% | 25-30% |
| USD 500M - 5B | 75-80% | 20-25% |
| > USD 5B | 80-90% | 10-20% |

### Fee Determinants

- **General Collateral (GC):** High-supply, low-demand securities. Fees typically 2-15 bps annualised.
- **Specials:** Securities in high demand (short squeeze, hard-to-borrow). Fees can reach 100-5,000+ bps. Driven by: short interest, limited free float, corporate event arbitrage.
- **Term vs. open:** Term loans (fixed return date) command a premium. Open loans are callable at any time.
- **Intrinsic value:** The lending fee reflects the specific security's scarcity (specials premium) plus any term premium.

### Rebate Rate (Cash-Collateralised Loans)

When cash collateral is posted, the lender pays a **rebate** to the borrower (effectively sharing the reinvestment return):

```
Rebate Rate = Reinvestment Rate - Lending Spread

Example (GC loan):
  Reinvestment rate (Fed Funds or SOFR):     5.30%
  Lending spread (lender's gross income):     0.25%
  Rebate to borrower:                         5.05%

Example (Special):
  Reinvestment rate (Fed Funds):              5.30%
  Lending spread:                             2.50%
  Rebate to borrower:                         2.80%
  (or negative rebate if spread > reinvestment rate)
```

### Worked Example — Full Economics

A UCITS fund lends EUR 10M of Siemens AG shares for 30 days against cash collateral (102% margin):

| Item | Calculation | Amount |
|------|-------------|--------|
| Loan value | 10,000 shares x EUR 1,000 | EUR 10,000,000 |
| Cash collateral received | 102% x EUR 10M | EUR 10,200,000 |
| Reinvestment yield (30 days at 3.90% p.a.) | EUR 10.2M x 3.90% x 30/360 | EUR 33,150 |
| Rebate paid to borrower (3.65% p.a.) | EUR 10.2M x 3.65% x 30/360 | EUR 31,025 |
| **Gross lending income** | Reinvestment - Rebate | **EUR 2,125** |
| Agent share (20%) | EUR 2,125 x 20% | EUR 425 |
| **Net income to fund** | | **EUR 1,700** |
| Annualised return on lent securities | EUR 1,700 x 12 / EUR 10M | **~2.0 bps** |

For a "special" security, the lending spread would be multiples higher, generating materially more income.

---

## 4. Regulatory Framework

### UCITS (Directive 2009/65/EC + ESMA Guidelines 2014/937)

Securities lending is classified as an **Efficient Portfolio Management (EPM)** technique. Rules:

| Rule | Requirement |
|------|-------------|
| **Maximum lent** | Up to 100% of NAV may be on loan (subject to recall ability) |
| **Counterparty limit** | No more than 10% of NAV exposure to a single borrower (5% for non-credit institution counterparties) |
| **Recall** | Must be able to recall any security at any time and terminate the agreement |
| **Collateral** | Must meet ESMA 2014/937 standards (liquid, daily-valued, diversified, uncorrelated) |
| **Haircuts** | Must apply "suitably conservative" haircuts; assets with high price volatility require higher haircuts |
| **Cash reinvestment** | Only into deposits, high-quality government bonds, reverse repos, or short-term MMFs |
| **Non-cash collateral** | May not be sold, pledged, or reinvested; must be held by depositary |
| **Revenue** | All revenue, net of direct/indirect operational costs, must be returned to the fund |
| **Disclosure** | Prospectus must disclose EPM policy; annual/semi-annual reports must detail lending activity |

### AIFMD (Directive 2011/61/EU, AIFMD II effective April 2026)

AIFs have more flexibility than UCITS but must still:
- Disclose use of leverage from securities lending in Annex IV reporting
- Include securities lending exposures in leverage calculations (gross and commitment methods)
- Ensure the AIFM's risk management function monitors lending counterparty risk
- Apply appropriate collateral policies (less prescriptive than UCITS/ESMA guidelines)
- AIFMD II adds enhanced liquidity management tool requirements that may affect recall timing

### SFTR (Regulation (EU) 2015/2365)

**Transaction reporting (Article 4):** Both counterparties to an SFT must report to an EU-registered trade repository within T+1 of execution/modification/termination. Reports include 155 data fields covering loan details, collateral, reuse, and margin data. Dual-sided reporting with matching requirements.

**Fund disclosure (Article 13):** UCITS management companies and AIFMs must disclose in annual and semi-annual reports:
- Global data: amount of securities on loan, associated collateral by type
- Concentration data: top 10 counterparties, top 10 collateral issuers
- Aggregate transaction data: type, currency, maturity, settlement/clearing
- Collateral reuse data (if applicable)
- Safekeeping: custodian/depositary details for collateral held
- Return and cost data: aggregate returns, costs, fees; revenue sharing split

**Pre-contractual disclosure (Article 14):** Prospectus must describe: types of SFTs used, eligible counterparties, collateral policy, maximum/expected proportion of NAV on loan, revenue sharing arrangements.

### Short Selling Regulation (SSR — Regulation (EU) 236/2012)

The SSR requires borrowers to have a "locate" arrangement before executing a short sale. This creates demand for securities lending. Fund administrators must be aware that recalls triggered by the fund selling a lent security interact with the borrower's SSR obligations.

### Cayman Islands

CIMA does not prescribe specific securities lending rules for Cayman-domiciled funds. Governance is through:
- The fund's **offering memorandum** and **investment management agreement** (which define permitted activities)
- **CIMA Rule — Investments:** Funds must maintain a record of securities identification codes for holdings traded regularly
- **Regulatory Measures (October 2023):** Require adequate internal controls and corporate governance proportionate to activity complexity
- In practice, Cayman funds follow GMSLA standards and apply agent lender programme terms; the board of directors has fiduciary oversight

---

## 5. Accounting Treatment

### Balance Sheet Presentation (IFRS / FRS 102)

| Item | Treatment | Rationale |
|------|-----------|-----------|
| Loaned securities | **Remain on** fund's balance sheet (no derecognition) | Risks and rewards of ownership not transferred; borrower has obligation to return equivalent securities |
| Cash collateral received | Recognised as **asset** (cash) with corresponding **liability** (obligation to return) | Fund controls the cash and reinvests it |
| Non-cash collateral (pledge) | Disclosed **off-balance sheet** in notes | Fund does not obtain control; may not sell, pledge, or reinvest |
| Non-cash collateral (title transfer) | Recognised **on-balance sheet** with return obligation | Title has transferred; fund has asset and liability |

### Journal Entries

**Loan initiation (cash collateral, EUR 10.2M received):**
```
Dr  Cash / Money Market Fund          10,200,000
  Cr  Collateral Payable (liability)              10,200,000
Note: Securities on loan reclassified in schedule of investments
```

**Lending fee income accrual (monthly, EUR 1,700 net):**
```
Dr  Accrued Securities Lending Income    1,700
  Cr  Securities Lending Income (P&L)               1,700
```

**Agent fee expense:**
```
Dr  Securities Lending Agent Fee (P&L)     425
  Cr  Due to Agent Lender                              425
```

**Reinvestment gain/loss (if cash collateral reinvestment fluctuates):**
```
Dr/Cr  Cash Collateral Reinvestment Fund    X
  Cr/Dr  Unrealised Gain/Loss on Reinvestment (P&L)    X
```

**Loan termination (securities returned, cash collateral returned):**
```
Dr  Collateral Payable                  10,200,000
  Cr  Cash / Money Market Fund                      10,200,000
```

### Financial Statement Disclosures

Under SFTR Article 13 and FRS 102 / IFRS 7:
- Aggregate value of securities on loan at reporting date
- Aggregate value and composition of collateral held
- Counterparty breakdown (top 10)
- Revenue earned and costs/fees incurred, with revenue sharing split
- Reinvestment return profile and any associated losses
- Maturity analysis of loans (open vs. term)

---

## 6. Operational Risks and Controls

### Risk Register

| Risk | Severity | Mitigation |
|------|----------|------------|
| **Borrower default** | HIGH | Agent lender indemnification (covers replacement cost if borrower fails to return securities); daily collateral margining |
| **Collateral reinvestment loss** | HIGH | Restrict to short-term, high-quality instruments; board-approved reinvestment guidelines; daily monitoring of MMF NAV |
| **Recall settlement failure** | MEDIUM | T+1/T+2 recall windows; maintain buffer of unlent securities; coordinate with trading desk before selling lent positions |
| **Missed corporate action** | MEDIUM | Automated recall triggers for record dates; manufactured dividend provisions in GMSLA (borrower compensates for missed dividends/coupons) |
| **Operational error** | MEDIUM | Four-eye principle on loan approvals; automated reconciliation between agent reports and custodian records; daily position matching |
| **Concentration risk** | MEDIUM | Pre-trade compliance checks against UCITS counterparty limits; automated monitoring of aggregate exposure per borrower |
| **Legal/documentation risk** | LOW | Standardised GMSLA with ISLA-approved schedules; legal review of non-standard terms |
| **Regulatory breach** | HIGH | Daily compliance monitoring of % NAV on loan; automated alerts at 90% threshold; SFTR reporting controls |

### Indemnification

Most agent lender programmes include a **borrower default indemnification**: if a borrower fails to return securities, the agent will purchase equivalent securities in the market (using the collateral held) and cover any shortfall. This indemnification typically does **not** cover reinvestment losses on cash collateral.

### Best Practices

1. **Board approval:** Securities lending programme must be approved by the fund's board with documented risk/return analysis
2. **Agent selection:** Due diligence on agent's indemnification capacity, technology, counterparty panel, and revenue split
3. **Daily reconciliation:** Three-way match between agent, custodian/depositary, and fund administrator records
4. **Collateral review:** Quarterly review of collateral eligibility lists and haircut schedules
5. **Revenue benchmarking:** Compare programme returns against industry data (e.g., IHS Markit / S&P Global Market Intelligence Securities Finance data)
6. **Independent oversight:** Compliance/risk function reviews lending activity independently from portfolio management
7. **SFTR compliance:** Automated T+1 reporting to trade repository; quarterly reconciliation of reported vs. actual positions

---

## Sources

- [ISLA — GMSLA Title Transfer](https://www.islaemea.org/gmsla-title-transfer/)
- [ISLA — GMSLA Security Interest (Pledge)](https://www.islaemea.org/gmsla-security-interest/)
- [ESMA Guidelines 2014/937 on ETFs and other UCITS issues](https://www.esma.europa.eu/sites/default/files/library/2015/11/esma-2014-0011-01-00_en_0.pdf)
- [ESMA — SFTR Reporting](https://www.esma.europa.eu/data-reporting/sftr-reporting)
- [ISLA — SFTR Regulation Crib Sheet](https://www.islaemea.org/crib-sheets/securities-financing-transactions-regulation-sftr/)
- [ISLA — UCITS](https://www.islaemea.org/regulation-and-policy/ucits/)
- [ISLA — AIFMD](https://www.islaemea.org/regulation-and-policy/aifmd/)
- [ICMA — SFTR Reporting Recommendations (March 2025)](https://www.icmagroup.org/assets/ICMA-Recommendations-for-Reporting-under-SFTR-March-2025.pdf)
- [CSSF — Securities Financing Transaction Regulation](https://www.cssf.lu/en/securities-financing-transaction-regulation-sftr/)
- [CIMA — Investment Funds Regulatory Measures](https://www.cima.ky/investment-funds-regulatory-measures)
- [Callan — Securities Lending 101](https://www.callan.com/blog-archive/securities-lending-101/)
- [State Street — Advanced Perspective on Securities Lending](https://www.ssga.com/us/en/institutional/insights/perspective-on-securities-lending)
- [NAIC — Securities Lending Primer](https://content.naic.org/sites/default/files/capital-markets-primer-securities-lending.pdf)
- [PwC — Securities Lending Transactions (ASC 860)](https://viewpoint.pwc.com/dt/us/en/pwc/accounting_guides/transfers_and_servic/transfers_and_servic_US/chapter_5_accounting_US/57_securities_lendin_US.html)
- [BIS — Securities Lending Transactions: Market Development](https://www.bis.org/cpmi/publ/d32.pdf)
- [Wikipedia — Securities Lending](https://en.wikipedia.org/wiki/Securities_lending)
- [Wikipedia — Securities Financing Transactions Regulation](https://en.wikipedia.org/wiki/Securities_Financing_Transactions_Regulation)

---

## Related Files

| File | Relevance |
|------|-----------|
| `domain/REGULATORY.md` | UCITS EPM rules, AIFMD leverage calculations, counterparty limits |
| `domain/ACCOUNTING_STANDARDS.md` | IFRS 9 derecognition criteria, FRS 102 financial instrument disclosures |
| `domain/RECONCILIATION_AND_OPS.md` | Daily position reconciliation including securities on loan, tri-party matching |
| `domain/GOVERNANCE_AND_COMPLIANCE.md` | Board approval of lending programmes, CP86 delegate oversight |
| `domain/DISTRIBUTIONS_AND_INCOME.md` | Manufactured dividends, income attribution for securities on loan |
| `domain/FUND_ACCOUNTING.md` | NAV impact of lending income, reinvestment gains/losses |
| `domain/INTERNAL_CONTROLS_AND_SOC.md` | SOC 1 control objectives for securities lending operations |
| `domain/ERROR_SCENARIOS_AND_CRISIS.md` | Borrower default scenarios, recall failure crisis playbooks |
