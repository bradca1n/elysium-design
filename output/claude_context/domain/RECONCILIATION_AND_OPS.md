# Reconciliation & Daily Operations

<!-- ~8500 tokens -->
**Last Updated:** 2026-02-10

---

## Table of Contents

1. [Daily NAV Production Cycle](#1-daily-nav-production-cycle)
2. [Position Reconciliation](#2-position-reconciliation)
3. [Cash Reconciliation](#3-cash-reconciliation)
4. [Trade Lifecycle](#4-trade-lifecycle)
5. [Corporate Actions](#5-corporate-actions)
6. [Pricing and Valuation](#6-pricing-and-valuation)
7. [NAV Error Correction](#7-nav-error-correction)
8. [Periodic Close Processes](#8-periodic-close-processes)
9. [Straight-Through Processing](#9-straight-through-processing-stp)
10. [Cross-References](#10-cross-references)

---

## 1. Daily NAV Production Cycle

The NAV production cycle converts raw market data into a published, investor-facing net asset value. For US-domiciled funds the pricing point ("NAV strike") is 4:00 PM ET; European UCITS funds typically strike between 12:00 and 17:00 CET depending on domicile. The entire cycle must complete within the SLA window -- typically four business hours after NAV point for same-day (T+0) publication.

### 1.1 T+0 / T+1 Timeline (US Equity Fund Example)

```
T+0 (Trade Date)
─────────────────────────────────────────────────────────────────────
16:00 ET   NYSE/NASDAQ close. NAV strike point.
           Dealing cut-off for subscriptions/redemptions.

16:00-16:30  Market data feeds received (Bloomberg, Refinitiv, ICE).
             FX rates captured (WM/Reuters 4pm London fix or
             Bloomberg BFIX).

16:30-17:00  PRICING TEAM: Apply pricing waterfall (see Section 6).
             Flag stale/missing prices. Escalate to fair value
             committee if needed.

17:00-17:30  FUND ACCOUNTANT: Import trades, verify positions against
             custodian/prime broker. Run position reconciliation.
             Post accruals (income, expenses, management fees,
             performance fees, amortisation).

17:30-18:00  FUND ACCOUNTANT: Compute draft NAV per share class.
             Run automated validation checks (~100+ data points):
             - Day-over-day NAV movement vs tolerance bands
             - Security-level price change vs index benchmark
             - Cash balance vs expected settlement
             - FX rate reasonableness
             - Fee accrual completeness

18:00-18:30  SENIOR REVIEWER (Checker): Independent four-eye review.
             Verify pricing exceptions, corporate action impact,
             large subscriber/redeemer dilution. Sign off or
             reject with comments.

18:30-19:00  FUND MANAGER REVIEW: Investment manager reviews NAV
             package (holdings, P&L attribution, cash summary).
             Approve or query.

19:00-19:30  PUBLICATION: NAV released to data vendors (Bloomberg,
             Morningstar, Lipper), transfer agent, fund website,
             and regulatory feeds.

19:30-20:00  Post-publication: Shareholder transaction processing
             (subscriptions/redemptions priced at today's NAV).

T+1
─────────────────────────────────────────────────────────────────────
08:00        Overnight batch reconciliation reports reviewed.
09:00        Settlement of T-1 trades (cash movements with
             custodian). Failed trade investigation begins.
10:00        Previous day's break resolution. Update aging report.
```

### 1.2 Key Roles in NAV Production

| Role | Responsibility |
|------|----------------|
| Pricing Analyst | Source prices, apply waterfall, escalate exceptions |
| Fund Accountant | Trade booking, accruals, draft NAV computation |
| Senior Reviewer (Checker) | Four-eye review, sign-off authority |
| Investment Manager | NAV approval, query resolution |
| Operations Manager | SLA monitoring, escalation of breaches |
| Fair Value Committee | Approve non-market prices (ad hoc) |

### 1.3 Escalation for Pricing Issues

1. **Level 1** (Pricing Analyst): Source alternate price from secondary vendor within 30 minutes.
2. **Level 2** (Senior Reviewer): If no vendor price, obtain broker quote or use last available price with documented justification.
3. **Level 3** (Fair Value Committee): For illiquid/distressed securities, convene committee (may be next business day). NAV publication may be delayed with regulatory notification.

---

## 2. Position Reconciliation

Position reconciliation verifies that recorded holdings match external counterparty records. It is the single most important daily control in fund administration.

### 2.1 Reconciliation Parties

| Reconciliation Type | Party A | Party B | Frequency |
|---------------------|---------|---------|-----------|
| Two-way | Administrator | Custodian | Daily (T+1) |
| Two-way | Administrator | Prime Broker | Daily (T+1) |
| Three-way | Administrator | Custodian | Prime Broker | Daily (hedge funds) |
| Internal | Administrator | Investment Manager OMS | Daily |

**Three-way reconciliation** is standard for hedge funds: the fund manager, prime broker, and administrator each independently build the portfolio from reported trades. Breaks between any two parties are investigated.

### 2.2 Reconciliation Parameters

- **Security identifier** (ISIN, CUSIP, SEDOL, or bespoke OTC identifiers)
- **Quantity** (shares/units for equities and funds; contracts for futures; notional for fixed income/swaps)
- **Price / market value**
- **Currency**
- **Settlement status** (settled, pending, failed)
- **Cost basis / tax lots** (where applicable)

### 2.3 Break Types

| Break Type | Description | Common Causes |
|------------|-------------|---------------|
| Quantity break | Share count mismatch | Late trade booking, partial fill, corporate action not applied |
| Price break | Valuation difference | Different pricing source, stale price, FX rate mismatch |
| Settlement status | One party shows settled, other shows pending | Timing difference across time zones, failed trade |
| Missing position | Security on one side but not the other | Trade not communicated, wrong account mapping |
| Identifier mismatch | Same security, different codes | ISIN vs CUSIP, OTC naming conventions |

### 2.4 Reconciliation Break Investigation Flowchart

```
   BREAK DETECTED
        |
        v
  Is break within ────YES──> Auto-match. Log and close.
  tolerance threshold?        (De minimis: typically <$100
        |                     or <0.01% of NAV)
        NO
        |
        v
  Is it a TIMING ─────YES──> Tag as "expected." Re-check
  difference?                  next business day. If still
        |                     open after T+3, escalate.
        NO
        |
        v
  Check TRADE ─────────────> Missing/incorrect trade?
  RECORDS                     → Re-book or amend.
        |                     → Confirm with counterparty.
        |
        v
  Check CORPORATE ──────────> Unprocessed event?
  ACTIONS                     → Apply ex-date adjustment.
        |                     → Verify entitlement.
        |
        v
  Check SETTLEMENT ─────────> Failed delivery?
  STATUS                      → Contact custodian/broker.
        |                     → Initiate buy-in if needed.
        |
        v
  ESCALATE to Operations Manager.
  If unresolved after 5 business days → Senior Management.
  If unresolved after 10 days → Report to compliance.
```

### 2.5 Tolerance Thresholds

| Category | Typical Threshold |
|----------|-------------------|
| Equity quantity | Exact match (zero tolerance) |
| Fixed income notional | +/- 0.01 (rounding) |
| Cash balance | +/- $100 or currency equivalent |
| Market value | +/- 0.01% of position value |
| FX rate | +/- 0.0001 (4th decimal) |

### 2.6 Break Aging and Escalation Matrix

| Age | Status | Action |
|-----|--------|--------|
| 0-2 business days | New | Investigate, contact counterparty |
| 3-5 business days | Aging | Escalate to team lead, document root cause |
| 5-10 business days | Overdue | Escalate to operations manager, formal counterparty chase |
| 10+ business days | Critical | Senior management review, compliance notification, potential regulatory disclosure |

**Rule: Reconcile positions BEFORE cash.** A position break often causes a downstream cash break, so resolving positions first simplifies cash investigation.

---

## 3. Cash Reconciliation

Cash reconciliation ensures that the fund's book cash balance matches the actual cash held at custodian banks.

### 3.1 Data Sources

- **Bank statements**: Received via SWIFT MT940 (end-of-day statement) or MT942 (intra-day). MT940 contains opening/closing balances plus all debit/credit transactions with value dates and transaction codes.
- **MT950**: Similar to MT940 but used for netting statements (custodian-to-custodian).
- **Internal ledger**: Fund accounting system's cash book (trade-date and settlement-date views).

### 3.2 Reconciliation Components

| Component | Source | Typical Issues |
|-----------|--------|----------------|
| Opening balance | Prior day close | Must match exactly; discrepancy = unresolved prior break |
| Trade settlements | Custodian confirmations | Failed trades, partial settlements, wrong value date |
| Subscriptions/redemptions | Transfer agent | Timing of cash receipt vs booking |
| Income (dividends, coupons) | Corporate actions system | Wrong pay date, withholding tax differences |
| Expenses (mgmt fees, admin fees) | Accrual system | Timing of actual payment vs accrual |
| FX settlements | FX broker/custodian | Netting, split settlements, CLS settlement |
| Margin calls/returns | Prime broker | Intra-day variation margin, initial margin adjustments |
| Collateral movements | Counterparty/tri-party agent | Substitutions, haircut differences |

### 3.3 Common Cash Break Causes

1. **Timing differences**: Trade booked on trade date but cash moves on settlement date (T+1 or T+2).
2. **Failed trades**: Counterparty did not deliver securities; cash not debited but trade booked.
3. **Unidentified receipts**: Incoming wire with insufficient reference — requires manual investigation.
4. **Fee discrepancies**: Bank charges, custody fees, or transaction levies not accrued.
5. **FX settlement**: Netting across multiple currency pairs (especially CLS settlements).
6. **Corporate action cash**: Dividend received in wrong currency or net of unexpected withholding tax.

---

## 4. Trade Lifecycle

### 4.1 End-to-End Flow

```
EXECUTION    ALLOCATION    CONFIRMATION    AFFIRMATION    SETTLEMENT
   |              |              |               |              |
   v              v              v               v              v
+--------+   +--------+    +---------+    +----------+   +-----------+
| Invest.|   | Alloc- |    | Broker  |    | Custodian|   | DTC/CREST |
| Mgr    |-->| ate to |-->| issues  |-->| affirms  |-->| settles   |
| orders |   | sub-   |    | confirm |    | by 9pm   |   | T+1       |
| via EB |   | accts  |    | to all  |    | ET on TD |   | (US/CA)   |
+--------+   +--------+    +---------+    +----------+   +-----------+
                                                          |
                                                          v
                                                   +-----------+
                                                   | BOOKING & |
                                                   | POSITION  |
                                                   | UPDATE    |
                                                   +-----------+
                                                          |
                                                          v
                                                   +-----------+
                                                   | RECONCIL- |
                                                   | IATION    |
                                                   +-----------+
```

### 4.2 Detailed Stage Descriptions

| Stage | Description | Key Deadline (T+1 regime) |
|-------|-------------|---------------------------|
| **Execution** | Investment manager places order with executing broker (EB). Block order may cover multiple accounts. | Trade date (TD) |
| **Allocation** | Block order split across sub-accounts/funds. Sent to EB and custodian. | TD + 2 hours |
| **Confirmation** | EB issues trade confirmation with all economic details (price, quantity, fees, settlement date). | TD + 4 hours |
| **Affirmation** | Custodian or investment manager affirms the trade details match. DTCC requires affirmation by 9:00 PM ET on trade date for T+1 settlement. | TD 9:00 PM ET |
| **Clearing** | Central counterparty (CCP) or NSCC novates the trade, becomes buyer to seller and seller to buyer. | TD overnight |
| **Settlement** | Securities and cash exchange. Three methods below. | TD + 1 (US equities since May 2024) |
| **Booking** | Fund accountant records the trade in the accounting system (trade-date and settlement-date entries). | Within NAV cycle |
| **Reconciliation** | Verify booked position matches custodian/broker records. | TD + 1 morning |

### 4.3 Settlement Methods

| Method | Abbreviation | Description | Risk Profile |
|--------|-------------|-------------|--------------|
| Delivery vs Payment | DvP | Securities delivered only if payment received simultaneously. | Lowest (simultaneous exchange) |
| Receive vs Payment | RvP | Mirror of DvP from buyer's perspective. | Lowest |
| Free of Payment | FoP | Securities delivered without requiring simultaneous cash. | Highest (delivery risk) |

### 4.4 Settlement Cycles by Market

| Market / Asset Class | Settlement Cycle |
|---------------------|------------------|
| US/Canadian equities | T+1 (since May 28, 2024) |
| European equities (most) | T+2 |
| UK equities | T+1 (since Oct 2027, currently T+2) |
| US Treasuries | T+1 |
| Corporate bonds (US) | T+1 |
| FX spot | T+2 |
| FX forwards | Custom (T+N) |
| OTC derivatives | Per ISDA CSA terms |

---

## 5. Corporate Actions

Corporate actions are issuer-initiated events that affect the fund's holdings, income, or cash. They are a leading source of NAV errors due to complexity and tight processing timelines.

### 5.1 Mandatory Corporate Actions

No election required; applied automatically to all holders.

| Type | Effect on Holdings | NAV Impact |
|------|-------------------|------------|
| **Cash dividend** | Cash credited on pay date | Income accrual from ex-date; cash on pay date |
| **Stock dividend** | Additional shares received | Quantity increase; cost basis adjustment |
| **Stock split** (e.g., 2:1) | Share count multiplied; price divided | Quantity up, price down; NAV neutral |
| **Reverse split** (e.g., 1:5) | Share count reduced; price multiplied | Quantity down, price up; NAV neutral (fractional shares may be cashed out) |
| **Merger/acquisition** | Shares converted to acquirer shares or cash | New position created; old position closed |
| **Spin-off** | New shares received in spun-off entity | Cost basis allocation between parent and spin-off |
| **Name/ticker change** | Identifier update only | No NAV impact; reconciliation risk if not updated |

### 5.2 Voluntary Corporate Actions

Holder must elect; default election applies if no instruction received by deadline.

| Type | Election Options | Default if No Election |
|------|-----------------|----------------------|
| **Tender offer** | Tender all/partial/none | Usually "do not tender" |
| **Rights issue** | Exercise, sell rights, or lapse | Lapse (rights expire worthless) |
| **Optional dividend** | Cash or stock (scrip dividend) | Varies by issuer; often cash |
| **Conversion** (convertible bond) | Convert to equity or hold | Hold (no conversion) |
| **Exchange offer** | Exchange for new instrument or hold | Hold |

### 5.3 Key Date Timeline

```
ANNOUNCEMENT ──> EX-DATE ──> RECORD DATE ──> ELECTION DEADLINE ──> PAY DATE
     |               |            |                 |                  |
     v               v            v                 v                  v
  Event          Trades on    Holder of      Last date to        Cash/shares
  disclosed      or after     record on      submit election     delivered to
  to market.     this date    this date      instruction to      holder's
                 do NOT get   determined     custodian/agent.    account.
                 entitlement. by registrar.  (Voluntary only)
```

**Typical gaps**: Ex-date is usually 1 business day before record date (US). Pay date is typically 2-4 weeks after record date for dividends. Election deadlines for voluntary actions are typically 3-5 business days before the issuer's final deadline, to allow custodian processing time.

### 5.4 Scrip Dividends

A scrip dividend gives shareholders the option to receive dividends as additional shares instead of cash. The reference price (used to determine number of new shares) is typically based on the average market price over a defined period. Fractional entitlements are usually settled in cash.

---

## 6. Pricing and Valuation

### 6.1 Pricing Waterfall

The pricing waterfall establishes a hierarchy of sources, each level used only when the prior level is unavailable or unreliable.

```
LEVEL 1: Exchange closing price (equities, listed derivatives)
   |       Quoted bid/ask (liquid bonds, FX)
   |       Source: Exchange feeds, Bloomberg, Refinitiv
   |
   v  (if no Level 1 available)
LEVEL 2: Composite/evaluated price
   |       Bloomberg BVAL, Refinitiv evaluated pricing,
   |       ICE Data Services, S&P Global (Markit)
   |       BVAL Score 6-10 = high confidence
   |
   v  (if no Level 2 available)
LEVEL 3: Matrix/model price
   |       Derived from comparable securities using
   |       spread, duration, sector, credit rating
   |       (common for illiquid corporate bonds)
   |
   v  (if no Level 3 available)
LEVEL 4: Broker quote
   |       Single or multiple dealer quotes
   |       Minimum: 2 independent quotes preferred
   |       Must document broker identity and quote time
   |
   v  (if no Level 4 available)
LEVEL 5: Fair value committee determination
          Internal model, DCF, or manager estimate
          Requires documented methodology and board approval
          Triggers enhanced disclosure in financial statements
```

### 6.2 Major Pricing Vendors

| Vendor | Product | Coverage |
|--------|---------|----------|
| Bloomberg | BVAL (evaluated pricing) | 2.7M+ securities globally; BVAL Score 1-10 confidence metric |
| Refinitiv (LSEG) | Evaluated Pricing Data | Global fixed income, structured products |
| ICE Data Services | Evaluated Pricing | US municipals, corporates, MBS/ABS |
| S&P Global (ex-Markit) | Pricing Direct | CDS, loans, structured credit |

### 6.3 Stale Price Detection

A price is considered "stale" when:
- **Equities**: No trade in 3-5 business days; volume below threshold.
- **Fixed income**: Evaluated price unchanged for 5+ days; BVAL Score drops below 3.
- **OTC derivatives**: Mark-to-model not refreshed within policy window (typically 5 days).
- **Trigger**: Stale prices are flagged for review and may require fair value adjustment or committee escalation.

### 6.4 Fair Value Adjustments

- **Swing pricing**: Adjust NAV upward (net inflows) or downward (net outflows) by a "swing factor" to protect existing shareholders from dilution caused by transaction costs. Widely used in European UCITS; not yet adopted in US mutual funds.
- **Time-zone adjustment**: Funds holding Asian or European securities that close hours before the US 4 PM ET NAV strike apply fair value factors based on post-close market movements (e.g., S&P futures, regional ETFs) to estimate current value. Models from vendors like MSCI FV or Bloomberg are commonly used.
- **Anti-dilution levies**: A fixed charge applied to subscribing/redeeming investors to cover dealing costs, used as an alternative to swing pricing in some jurisdictions.

---

## 7. NAV Error Correction

### 7.1 Error Identification Sources

- Automated validation checks (day-over-day NAV movement, pricing exception)
- Internal quality assurance review
- Investor complaint or query
- External audit finding
- Regulatory examination
- Counterparty reconciliation break

### 7.2 Materiality Thresholds

| Jurisdiction | Fund Type | Materiality Threshold |
|-------------|-----------|----------------------|
| **Luxembourg (CSSF Circular 24/856)** | Money market | 0.20% of NAV |
| | Bond / debt | 0.50% of NAV |
| | Mixed | 0.50% of NAV |
| | Equity | 1.00% of NAV |
| | Alternative (Part II, SIF, SICAR) | Up to 5.00% (documented justification required) |
| **Ireland (Central Bank)** | Money market | 0.25% of NAV |
| | Bond | 0.50% of NAV |
| | Equity | 0.50% of NAV |
| **United States (SEC guidance)** | All mutual funds | $0.01/share (penny per share) or ~0.50% of NAV (not codified but industry practice; per SEC commentary) |
| **United Kingdom (FCA)** | UCITS | Aligned with EU thresholds |

An error exceeding the materiality threshold triggers mandatory correction and investor compensation. Errors below the threshold are documented but may not require reprocessing.

### 7.3 Correction Procedure

1. **Identification and documentation**: Record the error, affected NAV dates, share classes, root cause.
2. **Impact assessment**: Recalculate correct NAV for each affected date. Determine impact per share class.
3. **Materiality comparison**: Compare error magnitude to threshold. If below: log and close. If above: proceed.
4. **Investor impact analysis**: Identify all investors who subscribed or redeemed during the affected period at incorrect prices.
5. **Compensation calculation**: For each affected investor:
   - Subscriber at overstated NAV: Fund owes investor the difference (additional shares or cash).
   - Redeemer at understated NAV: Fund owes investor the shortfall (cash payment).
6. **Funding**: Compensation typically paid by the administrator or investment manager (per service agreement indemnity). In some cases the fund absorbs the cost if no party is at fault.
7. **Regulatory notification**: Luxembourg: CSSF within 4-8 weeks of detection. If total compensation exceeds EUR 50,000 or individual compensation exceeds EUR 5,000, an auditor special report is required within 3 months.
8. **Corrective publication**: Issue corrected NAV to data vendors and transfer agent.
9. **Root cause analysis**: Document preventive measures; update controls.

---

## 8. Periodic Close Processes

### 8.1 Month-End

| Task | Owner | Deadline |
|------|-------|----------|
| Month-end NAV (final) | Fund Accountant | BD+1 |
| Trial balance preparation | Fund Accountant | BD+3 |
| Management accounts (P&L, balance sheet) | Fund Accountant | BD+5 |
| Management fee / performance fee crystallisation | Fund Accountant | BD+5 |
| Performance calculation (TWR and MWR) | Performance Analyst | BD+5 |
| Compliance attestation (investment restrictions) | Compliance | BD+5 |
| Position and cash reconciliation close-out | Operations | BD+3 |
| Board reporting pack (if monthly board) | Fund Admin | BD+10 |

**Performance methods**: Time-Weighted Return (TWR) eliminates the impact of cash flows and is the GIPS-standard for comparing managers. Money-Weighted Return (MWR / IRR) reflects the actual investor experience including timing of flows.

### 8.2 Quarter-End

| Task | Owner | Deadline |
|------|-------|----------|
| All month-end tasks | Various | As above |
| Investor statements / capital account statements | Investor Relations | BD+15-20 |
| AIFMD Annex IV filing (quarterly filers) | Compliance / Fund Admin | 30-45 calendar days after quarter-end |
| Form PF (if applicable, SEC-registered) | Compliance | 60 calendar days after quarter-end |
| Distribution calculation and payment | Fund Accountant | Per fund docs |
| Investor communications (quarterly letter) | Investment Manager | BD+20-30 |

**AIFMD Annex IV** covers 300+ data fields including: AUM, leverage, liquidity profile, risk measures, trading counterparties, and geographic/sector concentration. Filed via XML to local regulator portal. Quarterly filing required for AIFMs managing > EUR 1.5bn (leveraged) or > EUR 5bn (unleveraged).

### 8.3 Year-End

| Task | Owner | Deadline |
|------|-------|----------|
| All quarter-end tasks | Various | As above |
| Financial statements preparation (audited) | Fund Accountant + Auditor | 60-90 days (UCITS 4 months; AIF 6 months) |
| Audit support — PBC list ("Prepared by Client") | Fund Accountant | Per auditor schedule |
| Tax reporting: FATCA/CRS classification and filing | Tax / Compliance | Local deadlines (e.g., US: March 31 for FATCA) |
| Investor tax packs (K-1s for US partnerships, tax vouchers for UCITS) | Tax / Fund Admin | March 15 (US K-1s); varies by jurisdiction |
| Annual report production | Fund Admin + Legal | Per regulatory deadline |
| Regulatory annual filings (e.g., N-CEN, AIFMD annual) | Compliance | Per regulator |
| Anti-money laundering (AML) refresh | Compliance | Annual |

**FATCA** (Foreign Account Tax Compliance Act): US law requiring foreign financial institutions to report US persons' accounts. Filed via local tax authority exchange or direct IRS filing.
**CRS** (Common Reporting Standard): OECD-driven multilateral equivalent of FATCA covering 100+ jurisdictions. Annual reporting of non-resident account holders.

---

## 9. Straight-Through Processing (STP)

### 9.1 Definition

Straight-Through Processing is the automated end-to-end handling of a transaction from initiation through settlement and reconciliation with zero manual intervention. In fund administration, STP applies to trade capture, position updates, cash movements, corporate actions, and NAV calculation.

### 9.2 STP Rate Benchmarks

| Process | Industry STP Rate | Best-in-Class |
|---------|-------------------|---------------|
| Equity trade settlement (domestic) | 90-95% | 98%+ |
| Fixed income settlement | 80-85% | 92% |
| FX settlement | 85-90% | 95% |
| Corporate actions (mandatory) | 70-80% | 90% |
| Corporate actions (voluntary) | 40-60% | 75% |
| Cash reconciliation matching | 80-90% | 95% |
| Overall fund administration | 75-85% | 92% |

STP rates for international/cross-border transactions are significantly lower (estimated global average of ~26% for international payments as of 2023) due to format mismatches, intermediary chains, and regulatory differences.

### 9.3 Exception Queue Management

Items that fail STP enter exception queues ranked by:
1. **Materiality**: Impact on NAV (highest priority)
2. **Age**: Older breaks escalated first
3. **SLA risk**: Items threatening publication deadlines
4. **Regulatory impact**: Compliance-related exceptions prioritised

### 9.4 Manual Intervention Triggers

- Unrecognised security identifier
- Price outside tolerance band (>2% day-over-day for equities; >0.5% for bonds)
- Cash amount mismatch exceeding de minimis threshold
- Corporate action with multiple election options
- Counterparty confirmation not received by deadline
- New instrument type not mapped in system taxonomy
- Cross-currency settlement with netting complexity

### 9.5 Reconciliation Matching Engines

Modern matching engines (e.g., Duco, Gresham Clareti, SmartStream TLM, FIS IntelliMatch) use:
- **Rule-based matching**: Exact match on key fields, tolerance on amounts
- **Fuzzy matching**: Probabilistic matching on descriptions, partial identifiers
- **Machine learning**: Pattern recognition for recurring break types, auto-resolution of known timing differences
- **Workflow routing**: Unmatched items automatically assigned to specialist queues with aging and escalation

### 9.6 Key Automation Metrics

| Metric | Definition | Target |
|--------|-----------|--------|
| STP Rate | % transactions processed without manual touch | >90% |
| Exception Rate | % transactions requiring manual intervention | <10% |
| Mean Time to Resolve (MTTR) | Average hours to close a break | <4 hours |
| Aged Break Count | Number of breaks > 5 business days | <5 per fund |
| NAV On-Time Delivery | % NAVs published within SLA | >99% |

---

## 10. Cross-References

- **`FUND_ACCOUNTING.md`**: Accounting entries for trade booking, accruals, and period-end close processes referenced in Sections 1, 4, and 8.
- **`NAV_METHODOLOGY.md`**: NAV computation formulas, share class equalisation, and fee crystallisation referenced in Sections 1 and 7.
- **`ACCOUNTING_STANDARDS.md`**: IFRS/US GAAP fair value hierarchy (Levels 1-3) aligns directly with the pricing waterfall in Section 6.
- **`GOVERNANCE_AND_COMPLIANCE.md`**: Regulatory filing deadlines (AIFMD, FATCA, CRS), compliance attestation, and error notification procedures referenced in Sections 7 and 8.
- **`SHARE_CLASSES.md`**: Multi-class NAV computation, class-specific fee accruals, and hedged share class FX adjustments referenced in Sections 1 and 6.

---

## Sources

- [NAV Calculation Best Practices - Charter Group Fund Administration](https://chartergroupadmin.com/index.php/2025/01/20/nav-calculation-best-practices-complete-checklist/)
- [A Guide to Cash and Position Reconciliation - Limina](https://www.limina.com/blog/cash-position-reconciliation-guide)
- [NAV and P&L Reconciliation: Comprehensive Guide - Limina](https://www.limina.com/blog/pnl-and-nav-reconciliation-guide)
- [Investment Reconciliation - Limina](https://www.limina.com/blog/investment-reconciliation)
- [From Execution to Settlement: Trade Lifecycle in T+1 Era - Loffa](https://loffacorp.com/from-execution-to-settlement-demystifying-the-trade-lifecycle-in-t1-era/)
- [Trade Confirmations and Affirmations Guide - Limina](https://www.limina.com/blog/guide-trade-confirmations-trade-affirmations)
- [US T+1, Affirmation, and the Settlement Cycle - BNP Paribas](https://securities.cib.bnpparibas/us-t1-trade-affirmation-settlement/)
- [Trade Lifecycle: 5 Key Stages - Intuition](https://www.intuition.com/the-lifecycle-of-a-trade-5-key-stages/)
- [Clearing and Settlement: Stage III & IV - Intuition](https://www.intuition.com/stage-three-and-four-of-the-trade-lifecycle-clearing-and-settlement/)
- [Corporate Actions Processing: Voluntary vs Mandatory - Infosys BPM](https://www.infosysbpm.com/blogs/financial-services/corporate-actions-processing.html)
- [Market Standards for Corporate Actions Processing - Clearstream](https://www.clearstream.com/resource/blob/1292816/c8d2a31466a8202f48a8585d11830787/market-standards-ca-data.pdf)
- [Corporate Actions FAQs - Fidelity](https://www.fidelity.com/customer-service/corporate-actions-learn-more-faqs)
- [Bloomberg BVAL Evaluated Pricing](https://www.bloomberg.com/professional/products/data/enterprise-catalog/pricing/evaluated-pricing/)
- [Evaluated Pricing Data - Refinitiv](https://www.refinitiv.com/en/market-data/data-analytics-pricing/evaluated-pricing-data)
- [Evaluating Vendor Selection: Fixed Income Study - SS&C](https://www.ssctech.com/blog/evaluating-vendor-selection-fixed-income-study-2022)
- [CSSF Circular 24/856 - NAV Calculation Errors - EY Luxembourg](https://www.ey.com/en_lu/insights/wealth-asset-management/circular-24-856-nav-calculation-errors)
- [New CSSF Circular on NAV Errors - Dechert](https://www.dechert.com/knowledge/onpoint/2024/4/new-cssf-circular-on-nav-errors-and-investment-rule-breaches.html)
- [Central Bank of Ireland - NAV Error Treatment Consultation - McCann FitzGerald](https://www.mccannfitzgerald.com/knowledge/asset-management-and-investment-funds/central-bank-of-ireland-consults-on-treatment-correction-and-redress-of-errors-in-investment-funds)
- [SEC Rule 22c-1 Amendments](https://www.sec.gov/rules-regulations/2003/12/amendments-rules-governing-pricing-mutual-fund-shares)
- [AIFMD Annex IV Reporting - Vistra](https://www.vistra.com/governance-risk-compliance/regulatory-compliance/support/annex-iv-reporting)
- [AIFMD Annex IV: Essential Requirements - Apex Group](https://www.apexgroup.com/insights/annex-iv-reporting-under-aifmd-key-requirements-and-submission-across-the-eu-and-uk/)
- [Fund Administration: Comprehensive Guide - CSC](https://www.cscglobal.com/service/funds/fund-administration/guide-to-fund-administration/)
- [FATCA and CRS Compliance in Fund Administration - Taina](https://www.taina.tech/resources-news-and-awards/fatca-and-crs-compliance-in-fund-administrators?_nodeTranslation=359)
- [Validating NAVs: An Ounce of Prevention - FinOps](https://finopsinfo.com/operations/funds/validating-navs-an-ounce-of-prevention-goes-a-long-way/)
- [Five Common Causes of Cash and Position Breaks - Prodktr](https://prodktr.com/common-causes-of-cash-and-position-breaks/)
- [Swing Pricing: Raising the Bar - BlackRock](https://www.blackrock.com/corporate/literature/whitepaper/spotlight-swing-pricing-raising-the-bar-september-2021.pdf)
- [What is Swing Pricing? - Brookings](https://www.brookings.edu/articles/what-is-swing-pricing/)
- [Reporting with Fair Value Adjusted Indexes - MSCI](https://www.msci.com/documents/1296102/1335390/FV+Research+Bulletin_FINAL.pdf)
- [SWIFT MT940 - Karboncard](https://www.karboncard.com/blog/swift-mt940-details)
- [Straight-Through Processing - Corporate Finance Institute](https://corporatefinanceinstitute.com/resources/management/straight-through-processing-stp/)
- [Achieving T+1 Multi-Party Reconciliation - AIMA](https://www.aima.org/article/achieving-t-1-multi-party-reconciliation-through-automation-of-the-reconciliation-process.html)
- [Mutual Fund Share Pricing FAQs - ICI](https://www.ici.org/faqs/faq/mfs/faqs_navs)
- [Net Asset Value - Investor.gov (SEC)](https://www.investor.gov/introduction-investing/investing-basics/glossary/net-asset-value)
