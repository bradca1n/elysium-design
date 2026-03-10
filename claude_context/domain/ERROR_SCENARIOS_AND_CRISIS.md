<!-- ~9000 tokens -->
# Error Scenarios & Crisis Management in Fund Administration

**Last Updated:** 2026-02-10

---

## Table of Contents

1. [Error Taxonomy](#1-error-taxonomy)
2. [Crisis Playbooks](#2-crisis-playbooks)
3. [Fund Wind-Down / Termination](#3-fund-wind-down--termination)
4. [Cross-References](#4-cross-references)
5. [Sources](#5-sources)

---

## 1. Error Taxonomy

### 1.1 Trade Errors

| Error Type | Description | Common Causes | Detection | Remediation | Prevention |
|-----------|-------------|---------------|-----------|-------------|------------|
| Wrong security | Buy/sell incorrect ISIN/ticker | Fat-finger on OMS, ISIN look-alike (e.g., AAPL vs APLE) | Position reconciliation vs custodian; three-way recon | Cancel/correct with broker same-day if possible; if settled, execute offsetting trade and absorb market difference | Pre-trade ISIN validation, symbology mapping, four-eye order entry |
| Wrong quantity | Incorrect number of shares/notional | Decimal error, lot-size confusion (100 vs 1), partial fill mishandled | Trade confirmation matching, position recon | Amend allocation; surplus/shortfall allocated to error account | Block-order allocation engine with auto-rounding |
| Wrong account | Trade booked to wrong sub-fund | Multi-fund block allocation error, copy-paste of fund code | Inter-fund reconciliation; compliance post-trade check | Rebook to correct fund; compensate disadvantaged fund at execution price | Unique fund identifiers, allocation template lock-down |
| Wrong side | Buy instead of sell (or vice versa) | OMS dropdown error, verbal miscommunication | Position recon shows doubled or negative position | Offsetting trade; market-loss absorbed by responsible party | Confirmation workflow requiring maker-checker |
| Wrong price | Execution at off-market price | Limit order entered as market, wrong currency conversion | Price vs VWAP/benchmark analysis, TCA report | Broker claim or error-account booking | Best execution monitoring, TCA (Transaction Cost Analysis) |

### 1.2 Pricing Errors

| Error Type | Description | Common Causes | Detection | Remediation | Prevention |
|-----------|-------------|---------------|-----------|-------------|------------|
| Wrong source | Price from incorrect vendor or wrong security line | Vendor feed misconfiguration, ISIN mapping change | Pricing challenge report (day-over-day >tolerance) | Reprice NAV from correct source; compensate if material (see `NAV_METHODOLOGY.md` thresholds) | Primary/secondary vendor cross-check; pricing waterfall |
| Stale price | Last-available price used beyond staleness window | Illiquid security, exchange holiday, vendor outage | Stale-price flag (unchanged >3-5 days), BVAL score <3 | Fair value committee determination; apply model or broker quote | Automated staleness monitor, fair-value policy |
| Corporate action not reflected | Price does not adjust for dividend, split, or rights | Vendor feed lag, ex-date mismatch across jurisdictions | Reconciliation break; price-change vs expected adjustment | Manual price override with documented justification; restate NAV if material | Corporate action calendar integrated with pricing system |
| FX rate error | Wrong spot or fixing rate applied | Using wrong time-stamp (4pm London vs ECB fix), inverted quote convention (EUR/USD vs USD/EUR) | FX rate tolerance check (>0.5% deviation from WM/Reuters) | Recompute class NAVs in affected currencies | Single authoritative FX source per policy; inversion safeguard |

### 1.3 NAV Calculation Errors

| Error Type | Description | Common Causes | Detection | Remediation | Prevention |
|-----------|-------------|---------------|-----------|-------------|------------|
| Wrong accrual | Incorrect income/expense accrual (e.g., mgmt fee at wrong rate, missed coupon) | Rate change not updated, day-count convention error (30/360 vs ACT/365) | Trial balance review, fee recalculation, investor query | Recalculate all affected NAV dates; compensate per materiality thresholds (see `NAV_METHODOLOGY.md`) | Automated accrual engine with rate table; four-eye on rate changes |
| Missed subscription/redemption | Dealing order not reflected in shares outstanding | Order received after cut-off processed incorrectly, TA system outage | Shares outstanding reconciliation vs transfer agent register | Restate NAV; issue/cancel shares at correct price; compensate timing difference | TA-to-accounting system integration; dealing deadline enforcement |
| Double-counted position | Same holding counted in two accounts or twice in one | Duplicate trade import, custodian/PB both reporting same leg | Three-way reconciliation; NAV reasonableness check (sudden spike) | Remove duplicate; restate NAV | Unique trade reference IDs; deduplication logic in trade import |
| FX conversion error | Fund-currency NAV converted to class currency at wrong rate | See FX rate error above; additionally, hedging P&L booked to wrong class | Class-level NAV cross-check (sum of class NAVs = fund NAV in base currency) | Recompute class NAVs; adjust hedging attribution | Base-currency-first calculation rule; automated sum-check |

### 1.4 Corporate Action Errors

| Error Type | Description | Common Causes | Detection | Remediation | Prevention |
|-----------|-------------|---------------|-----------|-------------|------------|
| Missed election deadline | Fund fails to submit voluntary CA election (e.g., tender, rights) to custodian | Manual process, time-zone gap, unclear default | Custodian report showing default election applied | Claim against custodian if their failure; otherwise absorb loss. If rights lapsed, buy equivalent on market. | CA calendar with T-3 alerts; escalation workflow |
| Wrong entitlement | Incorrect share/cash quantity applied after mandatory CA | Wrong ex-date, fractional rounding, tax gross-up error | Position reconciliation post-pay-date | Correct position; book cash adjustment. Claim against data vendor if their error. | Dual-source CA data (Bloomberg CACT + custodian); auto-reconcile entitlements |
| Scrip reference price error | Wrong reference price used to calculate scrip dividend shares | Using market close instead of specified averaging period | Post-event audit; comparison of shares received vs calculated | Adjust position and cost basis; compensate if NAV impact material | Source reference price from issuer announcement; validate against custodian |

### 1.5 Settlement Failures

| Error Type | Description | Common Causes | Detection | Remediation | Prevention |
|-----------|-------------|---------------|-----------|-------------|------------|
| Counterparty default | Counterparty cannot deliver securities or pay cash | Insolvency, operational failure | SWIFT non-receipt; DTCC/Euroclear exception report | Invoke close-out netting under ISDA (for OTC); initiate buy-in for equities per CSDR (EU) or DTCC rules | Counterparty credit limits; segregated custody; CCP clearing |
| Failed delivery | Securities not delivered on settlement date | Insufficient stock at counterparty, chain dependency | Custodian failed-trade report (SWIFT MT548 status) | Chase counterparty; initiate mandatory buy-in after settlement discipline deadline (CSDR: T+4 for equities) | Pre-matching via SWIFT MT518; DvP settlement |
| Partial fill | Broker executes only portion of order | Illiquid market, order-size vs available depth | Trade confirmation vs order quantity | Accept partial and rebook; or cancel residual and re-enter | Limit order management; broker communication protocol |

### 1.6 Data Quality, Technology, and Human Errors

| Category | Examples | Detection | Prevention |
|----------|----------|-----------|------------|
| **Data quality** | Wrong ISIN mapping (security master), stale reference data (country, sector, credit rating), incorrect dividend-per-share in vendor feed | Reconciliation breaks, compliance false-positives, pricing outliers | Golden source security master with vendor cross-validation; daily reference data refresh |
| **Technology failures** | System outage during NAV production, data feed failure (Bloomberg B-PIPE down), batch job failure, database corruption | Monitoring/alerting (Datadog, PagerDuty), SLA breach alerts, heartbeat checks | Redundant feeds (primary + backup vendor), DR site, automated retry logic, SLA buffer in NAV production timeline |
| **Human errors** | Manual journal entry to wrong account, wrong approval (signing off on incorrect NAV), miskeyed FX rate, email to wrong recipient | Four-eye review, automated validation, audit trail review | Maker-checker on all manual entries, approval workflows with mandatory fields, role-based access, training and competency testing |

---

## 2. Crisis Playbooks

### 2.1 Fund Suspension

**When to suspend**: The board (or delegated ManCo) may suspend dealing when NAV cannot be reliably calculated -- illiquid markets, material uncertainty on asset values, or extraordinary redemption pressure threatening remaining investors.

**Legal basis**: UCITS Directive Art 84(2) -- suspension allowed "in exceptional cases where circumstances so require, and where suspension is justified having regard to the interests of unit-holders." AIFMD Art 46(2) provides similar authority for AIFs. In both cases the fund's prospectus must contain suspension provisions.

```
SUSPENSION DECISION FLOWCHART
─────────────────────────────────────────────────────
  Event trigger (market halt, pricing failure,
  extreme redemptions, fraud discovery)
        |
        v
  Board / ManCo assesses:
  Can NAV be calculated fairly? ──YES──> Continue dealing.
        |                                Consider gates/swing pricing instead.
        NO
        |
        v
  RESOLVE TO SUSPEND
        |
        ├──> Ireland (CBI): Notify "without delay" via ONR portal.
        |    Provide: reason, expected duration, investor communication plan.
        |    CBI may direct the fund to resume or extend suspension.
        |
        ├──> Cayman (CIMA): Notify within same business day.
        |    CIMA Rule 6.4 (Mutual Funds) / Rule 4.8 (Private Funds).
        |
        ├──> Luxembourg (CSSF): Notify within 24 hours.
        |    CSSF Circular 04/146.
        |
        v
  INVESTOR COMMUNICATION (same day or next business day):
  - Reason for suspension
  - Treatment of pending orders (cancelled or queued)
  - Estimated review timeline
  - Contact information
        |
        v
  DURING SUSPENSION:
  - Board reviews at least weekly
  - Attempt to obtain reliable valuations
  - Monitor market conditions
  - Continue regulatory reporting
        |
        v
  RESUMPTION CRITERIA:
  - Reliable NAV can be calculated
  - Sufficient liquidity to meet foreseeable redemptions
  - Market conditions normalised (or fair value methodology agreed)
  - Board resolution to resume; notify CBI/CIMA/CSSF before resumption
  - Publish resumption NAV at least 2 business days before reopening
```

**Worked example -- March 2020 (COVID)**: Multiple property funds (e.g., M&G UK Property Fund) suspended in March 2020 when independent valuers applied "material valuation uncertainty" clauses. Suspension lasted 6+ months. CBI-authorised property QIAIFs suspended under similar circumstances. Lesson: the admin must have pre-drafted investor suspension notices and regulatory notification templates ready.

### 2.2 Gate Activation

Gates allow the fund to limit -- not prohibit -- redemptions. Typical trigger: net redemption requests exceed a threshold (e.g., 10-25% of NAV) on a single dealing day.

**Procedure**:
1. Administrator calculates total redemption requests at dealing cut-off.
2. If threshold exceeded, notify board/ManCo for gate activation approval.
3. Each redeeming investor receives a **pro-rata** portion (e.g., if gate is 10% and requests total 20%, each investor receives 50% of their request).
4. Unredeemed portion is automatically **queued** for the next dealing day (FIFO or pro-rata per prospectus).
5. Notify investors: amount redeemed, amount deferred, expected timeline.
6. Notify regulator: CBI/CIMA/CSSF per suspension rules (gates are a lesser liquidity management tool but still reportable).
7. ESMA Omnibus Directive (transposition by April 2026): UCITS must pre-select at least 2 LMTs including gates or swing pricing.

### 2.3 Market Dislocation

When exchanges halt trading or markets become dislocated, the administrator faces a pricing vacuum.

| Event | Admin Response |
|-------|---------------|
| **Exchange trading halt** (single stock, circuit breaker) | Use last traded price if intra-day halt <2 hours. If halt extends past NAV strike, apply fair value adjustment or escalate to FV committee. |
| **Full market closure** (e.g., NYSE closed for weather/emergency) | Use prior day's close. If closure >1 day, apply model-based adjustments using futures, ETFs, or related markets. |
| **COVID March 2020** | Extreme bid-ask spreads in credit markets. Administrators used evaluated prices (BVAL, ICE) but many dropped to Level 3. Swing factors increased 5-10x. Some funds moved to weekly dealing. |
| **Ukraine Feb 2022** | Moscow Exchange closed for weeks. Russian securities priced at zero or near-zero for NAV purposes. CBI expected funds to write down Russian holdings to fair value reflecting sanctions and illiquidity. |
| **SVB March 2023** | Money market funds holding SVB paper: immediate fair value write-down needed. Admin required intra-day NAV recalculation for some institutional MMFs. |

### 2.4 Counterparty / Prime Broker Default

**Lehman Brothers 2008 lessons**: Hedge funds with assets at Lehman's London PB faced years of recovery litigation. Key issues: rehypothecation (PB re-pledged client assets), commingling in omnibus accounts, and cross-border insolvency (Chapter 11 in US vs administration in UK).

**Admin responsibilities during PB default**:
1. Immediately verify which fund assets are held at the defaulting PB (segregated vs omnibus).
2. Freeze all trading activity through the defaulting PB.
3. Notify board, investors, and regulators.
4. Invoke ISDA close-out netting for OTC derivatives (calculate net termination amount).
5. File proof of claim with insolvency administrator.
6. Transfer unencumbered assets to backup PB (AIFMD requires contingency PB arrangements).
7. Recalculate NAV excluding assets in dispute; disclose uncertainty to investors.

**AIFMD/UCITS safeguard**: Depositary must hold fund assets in segregated accounts. Depositary is liable for loss of financial instruments held in custody (strict liability under UCITS V Art 24 and AIFMD Art 21(12)), unless loss results from "external event beyond reasonable control."

### 2.5 Cyber Incident / Data Breach

**DORA (Digital Operational Resilience Act)** -- effective January 2025, applies to all EU-regulated financial entities including fund administrators and ManCos.

| Severity (DORA) | Criteria | Notification Timeline |
|-----------------|----------|----------------------|
| **Major** | Affects critical functions, >10% of clients, data breach >100K records, service outage >2 hours | Initial: within 4 hours of classification. Intermediate: within 72 hours. Final: within 1 month. |
| **Significant** | Below major thresholds but still material | Log internally; report at next periodic supervisory update |

**GDPR Art 33**: Personal data breach must be reported to Data Protection Commission (Ireland: DPC) within **72 hours** of awareness. If high risk to individuals, notify affected data subjects "without undue delay" (Art 34).

**CBI expectations**: Notify CBI of material operational incidents (including cyber) via the Online Reporting (ONR) system. No fixed statutory deadline, but "without delay" and typically same business day.

**Playbook**: (1) Activate incident response team. (2) Contain and isolate. (3) Classify under DORA. (4) Notify regulators per timeline. (5) Engage forensics. (6) Notify affected investors if personal data compromised. (7) Post-incident review within 30 days.

### 2.6 Key Person Event

If the portfolio manager becomes incapacitated or departs:

1. **Immediate**: Deputy PM or CIO assumes investment authority per IMA delegation provisions.
2. **Within 24 hours**: Notify board, depositary, and fund administrator.
3. **Within 5 business days**: Notify CBI/CIMA (material change to management arrangements).
4. **Investor notification**: Per prospectus -- typically within 10-30 business days. Some prospectuses allow redemption without penalty during a key-person event window.
5. **Closed-ended funds (PE)**: Key-person clause may trigger an investment-period suspension (no new investments until replacement approved by LPAC).

### 2.7 Regulatory Investigation

1. **Document preservation**: Immediately issue a **legal hold** notice to all custodians of relevant data (admin system, email, chat, trade records). Suspend automated deletion/rotation policies.
2. **Cooperation**: Under CBI Administrative Sanctions Procedure (ASP) and Central Bank Act 1942 (as amended), the fund and its service providers have an obligation to cooperate and produce records on request.
3. **Privilege**: Legal professional privilege applies to communications with external legal counsel for the purpose of obtaining legal advice. Internal documents are generally not privileged.
4. **Admin role**: Provide requested records (investor register, NAV packs, reconciliations, trade confirmations) within timeframes specified by the regulator (typically 10-20 business days).

### 2.8 Fraud Detection

**Indicators**: Unexplained reconciliation breaks, trades with no investment rationale, manual journal entries bypassing controls, unusual counterparty patterns, lifestyle changes in key personnel.

**Reporting obligations**:
- Ireland: Report to An Garda Siochana (police) and CBI. Suspicious Transaction Reports (STRs) to Financial Intelligence Unit Ireland (FIU) under Criminal Justice (Money Laundering and Terrorist Financing) Act 2010.
- Cayman: Report to Financial Reporting Authority (FRA) under Proceeds of Crime Act (2020 Revision). Tipping-off is a criminal offence.
- The fund administrator, as a "designated person" under Irish AML law, has an independent obligation to file STRs.

### 2.9 Sanctions Designation

If an existing investor or portfolio holding is designated on OFAC SDN list, EU Consolidated Sanctions list, or UN Security Council list:

1. **Freeze**: Immediately block the account/asset. No redemptions, distributions, or transfers.
2. **Report**: OFAC -- within 10 business days (via OFAC online portal). EU -- notify national competent authority "without delay." Ireland: CBI + Department of Finance.
3. **Divergence risk**: US (OFAC) applies strict liability and 50% rule (entity owned 50%+ by SDN is blocked). EU applies ownership/control test but with different thresholds. If an investor is sanctioned by OFAC but not EU, the Irish admin must assess whether US nexus (USD transactions, US sub-custodian) triggers OFAC compliance.
4. **Portfolio holding**: If a portfolio company is designated, the position must be frozen at current value. Liquidation requires OFAC/EU licence. NAV continues to include the position at fair value (which may be zero if no market and no licence expected).

### 2.10 Force Majeure

Natural disasters, geopolitical crises, or infrastructure failures that prevent normal settlement:

1. Invoke force majeure provisions in administration agreement (standard ISDA, custody, and admin agreements include FM clauses).
2. Assess whether NAV can be produced; if not, consider suspension (see 2.1).
3. Notify counterparties, regulators, and investors of operational disruption.
4. Activate business continuity plan (BCP): failover to DR site, remote operations.
5. Document all timeline extensions and decisions for regulatory record.

---

## 3. Fund Wind-Down / Termination

### 3.1 Decision and Approval

```
WIND-DOWN TIMELINE (Irish UCITS/AIF)
──────────────────────────────────────────────────
T-90d   Board resolves to terminate. Appoint liquidator if required.
T-60d   Notify CBI via ONR portal (prior approval required for UCITS;
        notification for QIAIFs). File de-authorisation application.
T-30d   Investor notification: minimum 30 days for UCITS (per prospectus;
        UCITS Regs 2011, S.I. 352). Cayman: per offering docs, typically
        30-90 days.
T-0     Last dealing day. No further subscriptions or redemptions accepted.
```

### 3.2 Asset Liquidation

1. Investment manager executes orderly liquidation (avoiding market impact).
2. Illiquid assets: seek buyer via secondary market, in-kind distribution to investors, or side-pocket until realised.
3. Administrator tracks realisation proceeds against expected values; reports slippage to board.
4. OTC derivatives: terminate under ISDA close-out provisions. Calculate termination payments.
5. Target: full liquidation within 6-12 months. Irish UCITS: CBI expects completion within 12 months.

### 3.3 Final NAV Calculation

1. All trades settled and confirmed.
2. All accruals (income, expenses) crystallised and paid.
3. All receivables collected (tax reclaims may take 12-24 months -- provision or assign).
4. Outstanding liabilities settled (audit fees, legal, wind-down costs, contingent liabilities provisioned).
5. Calculate final NAV per share class. This is the distribution NAV.

### 3.4 Distribution of Proceeds

| Method | Description | When Used |
|--------|-------------|-----------|
| **Cash pro-rata** | Each investor receives cash proportional to their share holding | Standard for all liquid funds |
| **In-kind** | Investors receive actual securities instead of (or in addition to) cash | Institutional investors; illiquid assets that cannot be sold; tax-advantaged transfers |
| **Interim + final** | Partial distribution (e.g., 90%) when most assets liquidated; final distribution after all liabilities settled | Common when tax reclaims or litigation outstanding |

### 3.5 Regulatory Filings and Deregistration

| Jurisdiction | Filing | Deadline |
|-------------|--------|----------|
| **Ireland (CBI)** | Final audited accounts, confirmation all investors paid, deregistration application | Within 6 months of last dealing day |
| **Cayman (CIMA)** | Application to deregister; final audited accounts; confirmation of discharge of all liabilities | Within 6 months; CIMA may require ongoing annual filings until deregistration confirmed |
| **Luxembourg (CSSF)** | Liquidation report, final accounts, deregistration | Within 9 months (UCITS); 12 months (AIF) |

### 3.6 Record Retention

| Jurisdiction | Retention Period | Start Point |
|-------------|-----------------|-------------|
| Ireland (CBI) | 6 years | From date of termination/deregistration |
| Cayman (CIMA) | 5 years | From date of dissolution |
| Luxembourg (CSSF) | 10 years | From date of last transaction |
| US (SEC) | 6 years (ICA 1940 Rule 31a-2) | From end of fiscal year of record creation |

Records include: investor register, NAV calculations, trade records, board minutes, compliance reports, AML/KYC files, and all correspondence.

### 3.7 Tax Clearance

- **Ireland**: Apply to Revenue for tax clearance certificate. Ensure all FATCA/CRS reporting complete. Withholding tax on distributions to non-Irish investors per DTA rates. Exit tax on Irish-resident investors (41% on gains/income).
- **Cayman**: No income tax, capital gains tax, or withholding tax. File final Tax Information Authority (TIA) FATCA/CRS reports. Obtain CIMA confirmation of good standing.
- **General**: Final-year tax returns in all jurisdictions where the fund has filing obligations.

### 3.8 Final Audit

External auditor issues opinion on:
1. Final financial statements (prepared under IFRS or local GAAP).
2. Proper calculation of final NAV and distribution amounts.
3. Compliance with prospectus wind-down provisions.
4. Completeness of liability discharge.

For Irish UCITS: audited accounts must be filed with CBI within 4 months of year-end (or final accounting period). For Cayman: per CIMA rules, within 6 months.

---

## 4. Cross-References

- **`GOVERNANCE_AND_COMPLIANCE.md`** -- Board decision-making for suspension/termination, depositary oversight during crisis, regulatory reporting obligations, DORA requirements.
- **`RECONCILIATION_AND_OPS.md`** -- Daily error detection via reconciliation (Sections 2-3), NAV error correction procedure (Section 7), pricing waterfall that prevents pricing errors (Section 6).
- **`REGULATORY.md`** -- UCITS Art 84 dealing suspension provisions, AIFMD depositary liability, AML reporting obligations, CSSF/CBI notification requirements.
- **`FUND_LIFECYCLE.md`** -- Fund formation/structuring context for wind-down (reverse of Stage 2-3), legal structures affecting termination procedure.
- **`NAV_METHODOLOGY.md`** -- Error materiality thresholds (CSSF 24/856, CBI CP130, SEC), NAV error remediation procedures, side pocket mechanics during crisis.
- **`TRANSFER_AGENCY.md`** -- Gate/suspension impact on dealing cycles, investor communication obligations, register maintenance during wind-down.

---

## 5. Sources

- [UCITS Directive 2009/65/EC, Art 84 -- Suspension of Redemptions](https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:32009L0065)
- [AIFMD 2011/61/EU, Art 46 -- Redemption Policy for AIFs](https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:32011L0061)
- [CBI Fund Management Company Guidance (CP86)](https://www.centralbank.ie/regulation/industry-market-sectors/funds-service-providers/fund-management-companies)
- [CIMA Statement of Guidance -- Corporate Governance](https://www.cima.ky/upimages/commonfiles/StatementofGuidance-CorporateGovernance_1672938498.pdf)
- [DORA -- Regulation (EU) 2022/2554 on Digital Operational Resilience](https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:32022R2554)
- [GDPR -- General Data Protection Regulation, Arts 33-34 (Breach Notification)](https://gdpr-info.eu/art-33-gdpr/)
- [OFAC -- Sanctions Compliance Guidance for the Fund Industry](https://ofac.treasury.gov/media/16331/download?inline)
- [ISDA Close-Out Netting](https://www.isda.org/a/yiiDE/close-out-netting.pdf)
- [CSSF Circular 24/856 -- NAV Error Treatment](https://www.dechert.com/knowledge/onpoint/2024/4/new-cssf-circular-on-nav-errors-and-investment-rule-breaches.html)
- [ESMA -- Liquidity Management Tools for UCITS and AIFs (Omnibus)](https://www.esma.europa.eu/sites/default/files/2024-07/ESMA34-1985693317-1097_CP_on_LMTs_of_UCITS_and_open-ended_AIFs.pdf)
- [CBI -- Treatment and Correction of NAV Errors (CP130)](https://www.mccannfitzgerald.com/knowledge/asset-management-and-investment-funds/central-bank-of-ireland-consults-on-treatment-correction-and-redress-of-errors-in-investment-funds)
- [Lehman Brothers: Lessons for Prime Brokerage -- FCA](https://www.fca.org.uk/publications/finalised-guidance/prime-brokerage-survey)
- [Criminal Justice (Money Laundering and Terrorist Financing) Act 2010 (Ireland)](https://www.irishstatutebook.ie/eli/2010/act/6/enacted/en/html)
- [Cayman Proceeds of Crime Act (2020 Revision)](https://legislation.gov.ky/cms/images/LEGISLATION/PRINCIPAL/1996/1996-0015/ProceedsofCrimeAct_2020%20Revision.pdf)
- [Central Bank Act 1942 -- Powers of Investigation (Ireland)](https://www.irishstatutebook.ie/eli/1942/act/22/enacted/en/html)
- [CSDR Settlement Discipline -- Mandatory Buy-In (EU)](https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:32014R0909)
