<!-- ~9000 tokens -->
# Derivatives & Margin Operations

**Last Updated:** 2026-02-10

---

> **Cross-references:** `domain/ACCOUNTING_STANDARDS.md` (IFRS 9 derivative classification, hedge accounting, fair value hierarchy), `domain/REGULATORY.md` (EMIR/SFTR obligations, UCITS derivative limits, AIFMD leverage), `domain/RECONCILIATION_AND_OPS.md` (derivatives position recon, trade lifecycle, daily NAV production), `domain/INVESTMENT_MANDATES.md` (derivative exposure limits, commitment approach, VaR), `domain/NAV_METHODOLOGY.md` (derivative pricing/valuation, mark-to-market)

---

## 1. Daily Margin Management

### 1.1 Initial Margin (IM)

Initial margin is the collateral posted at trade inception (and recalculated daily) to cover potential future exposure in the event of counterparty default. Two regimes apply:

| Regime | Model | Applies To | Key Parameters |
|--------|-------|------------|----------------|
| **Uncleared OTC** | ISDA SIMM (Standard Initial Margin Model) | Bilateral OTC derivatives | Sensitivity-based: delta, vega, curvature across 6 risk classes (IR, FX, EQ, Credit Qualifying, Credit Non-Qualifying, Commodity). Calibrated semi-annually (v2.8+2506 effective Dec 2025). |
| **Cleared** | CCP proprietary models | Centrally cleared derivatives | SPAN, VaR-based, or historical simulation. Set by each CCP (e.g., LCH SwapClear, ICE Clear Europe, Eurex). |
| **Exchange-traded** | Exchange margin model | Futures, listed options | SPAN or similar. Intraday margin calls possible in volatile markets. |

**Uncleared Margin Rules (UMR) — Phase-In Complete:**

All 6 phases are now live (Phase 6 since 1 Sep 2022). Entities with Average Aggregate Notional Amount (AANA) > EUR 8 billion must exchange IM bilaterally. IM posting is required only when the bilateral IM amount exceeds the EUR 50 million threshold. AANA is recalculated annually (March-May observation period for 1 Jan compliance; June-August for 1 Jul compliance).

**ISDA SIMM Calculation Summary:**

```
IM = sqrt( sum_riskClass( DeltaMargin² + VegaMargin² + CurvatureMargin² )
           + 2 * sum_crossRiskClass( correlation * Margin_i * Margin_j ) )
```

Each risk class margin aggregates sensitivities across buckets (e.g., tenors for IR, sectors for credit) with prescribed risk weights and correlations published by ISDA.

### 1.2 Variation Margin (VM)

Variation margin reflects daily mark-to-market (MTM) changes. VM is exchanged to settle the change in portfolio value since the last margin call, ensuring neither party accumulates unrealised P&L exposure.

| Parameter | Uncleared (Regulatory VM) | Cleared (CCP VM) |
|-----------|--------------------------|-------------------|
| **Frequency** | Daily (T+1 settlement) | Daily or intraday |
| **Currency** | Cash in the settlement currency of the CSA (typically USD, EUR, GBP) | Cash only (per CCP rules) |
| **Minimum transfer amount (MTA)** | Typically EUR 500,000 (negotiable in CSA) | Nil or very low (CCP-set) |
| **Threshold** | Zero (post-UMR regulatory VM CSAs have zero threshold) | Zero |
| **Rounding** | Typically to nearest 1,000 or 10,000 | CCP-defined |

### 1.3 Margin Call Process

```
T+0 (Valuation Date)
  16:00-17:00  Mark-to-market portfolio using end-of-day prices
  17:00-18:00  Calculate margin requirement (IM + VM)
  18:00        Issue margin call notification (SWIFT MT527/MT558 or electronic platform: AcadiaSoft, TriOptima)

T+1 (Settlement Date)
  09:00        Counterparty receives call, reviews, agrees or disputes
  10:00-12:00  Dispute resolution window (contact dispute counterparty, agree on valuations)
  12:00        Agreed amount must be settled
  16:00        Regulatory deadline for VM settlement (same-day for cleared; T+1 for bilateral)
```

**Dispute thresholds:** Typically, the undisputed amount must be transferred while the dispute is resolved. EMIR requires portfolio reconciliation to minimise disputes (see Section 4).

### 1.4 Margin Documentation

| Document | Purpose | Key Terms |
|----------|---------|-----------|
| **ISDA 2016 VM CSA** (NY law) / **VM Deed** (English law) | Governs variation margin for regulatory-compliant uncleared OTC | Zero threshold, eligible collateral (cash only for regulatory VM), transfer timing |
| **ISDA 2018 IM CSA** (NY law) / **IM Deed** (English law) | Governs initial margin for in-scope entities under UMR | Segregation requirement (IM must be held at a third-party custodian), eligible collateral (cash + government bonds + certain corporate bonds), haircut schedule |
| **1994 ISDA CSA** (legacy, NY law) | Pre-regulatory bilateral collateral | Negotiable thresholds, eligible collateral, independent amounts |
| **1995 ISDA English Law CSA (Deed)** | Title transfer vs. security interest | Common in European markets |

### 1.5 Margin Reconciliation

Daily reconciliation of margin balances against:
- Counterparty/CCP margin statements
- Custodian/tri-party agent collateral reports
- Internal collateral management system records

Key checks: portfolio valuation alignment (MTM), IM model output comparison, collateral value (after haircuts), cash movements, substitution requests. Breaks exceeding the dispute threshold must be escalated within 1 business day.

---

## 2. ISDA Documentation Framework

### 2.1 ISDA Master Agreement (2002)

The ISDA Master Agreement is the standard bilateral contract governing OTC derivative transactions. The 2002 version (replacing the 1992 version) introduced:

- **Close-out netting:** Upon an Event of Default or Termination Event, all transactions under the agreement are terminated and netted to a single payment obligation. This reduces credit exposure from gross to net.
- **Close-out amount:** Market quotation replaced by "Close-out Amount" — the amount the non-defaulting party would pay/receive to replace or provide the economic equivalent of the terminated transactions.
- **Force majeure:** Added as a Termination Event (not present in 1992 version).
- **Set-off rights:** Explicit provisions for set-off across transactions.

### 2.2 Schedule and Confirmations

The **Schedule** customises the Master Agreement for each counterparty relationship:
- Specified Entities (affiliates covered)
- Threshold and Minimum Transfer Amounts for credit support
- Governing law elections (NY or English law)
- Tax representations and withholding provisions
- Additional Termination Events (e.g., NAV decline triggers, key person events — common for fund counterparties)

**Confirmations** document each individual transaction under the Master Agreement. For standardised products, ISDA publishes template confirmations. Electronic confirmation platforms (MarkitWire, DTCC CTM, Bloomberg VCON) enable straight-through processing.

**Timely confirmation requirements (EMIR):**
- Confirmed by end of T+1 for clearing-eligible OTC derivatives
- Confirmed by end of T+2 for non-clearing-eligible OTC derivatives

### 2.3 Events of Default and Termination Events

| Category | Examples |
|----------|----------|
| **Events of Default** | Failure to pay/deliver, breach of agreement, misrepresentation, default under specified transaction, cross-default (customisable threshold), bankruptcy/insolvency |
| **Termination Events** | Illegality, force majeure, tax event, tax event upon merger, credit event upon merger, Additional Termination Events (NAV triggers) |

**NAV decline trigger (common for fund CSAs):** If the fund's NAV declines by more than a specified percentage (typically 10-30% over a rolling period), the counterparty may designate an Early Termination Date. This is a key negotiation point for fund managers.

---

## 3. Central Clearing

### 3.1 Clearing Obligation Scope

Under EMIR, the following OTC derivative classes are subject to mandatory clearing:

| Asset Class | Products Subject to Clearing | CCPs |
|-------------|------------------------------|------|
| **Interest Rate Swaps** | Fixed-to-float IRS, basis swaps, FRAs, OIS (EUR, USD, GBP, JPY, NOK, PLN, SEK) | LCH SwapClear, Eurex OTC Clear |
| **Credit Default Swaps** | Untranched European index CDS (iTraxx Europe, iTraxx Europe Crossover) | ICE Clear Europe |

**Exemptions:** FX forwards (physically settled), single-name CDS, equity derivatives, and commodity derivatives are not currently subject to the clearing obligation.

**Counterparty categories:** Financial counterparties (FC) clearing in all cases; non-financial counterparties (NFC) only when exceeding clearing thresholds. AIFs managed by authorised AIFMs are FCs. Cayman funds dealing with EU counterparties trigger clearing obligations via the counterparty.

### 3.2 CCP Mechanics

1. **Novation:** Upon clearing, the original bilateral trade is replaced by two trades — each party faces the CCP.
2. **Margin:** CCP collects IM (based on its proprietary model) and VM (daily/intraday cash settlement).
3. **Default fund:** Members contribute to a mutualised default fund to cover losses beyond the defaulting member's margin.
4. **Default waterfall:** Defaulter's IM -> Defaulter's default fund contribution -> CCP skin-in-the-game -> Non-defaulting members' default fund contributions -> CCP equity/recovery tools.

### 3.3 Client Clearing Models

| Model | Segregation Level | Porting | Risk |
|-------|-------------------|---------|------|
| **Omnibus segregated** | Client assets pooled in one account at CCP | Difficult (requires all clients in account to port together) | Fellow-customer risk |
| **Individual segregated (ISA)** | Each client has a dedicated account at CCP | Easier (individual porting possible) | Higher cost, no fellow-customer risk |
| **Gross omnibus** | Positions recorded gross at CCP level | Moderate | EMIR default for EU |

**Porting:** Transfer of client positions and collateral from a defaulting clearing member to a backup clearing member. ISA accounts have the highest porting probability but at greater cost. Fund administrators must track the clearing model per counterparty for reporting and risk purposes.

---

## 4. EMIR (European Market Infrastructure Regulation)

### 4.1 Trade Reporting

All derivative transactions (OTC and exchange-traded) must be reported to an authorised Trade Repository (TR) by T+1.

**EMIR Refit (live 29 April 2024):**

| Change | Detail |
|--------|--------|
| **Reporting fields** | Expanded from 129 to 203 fields |
| **Format** | ISO 20022 XML mandatory (replacing legacy formats) |
| **UTI (Unique Trade Identifier)** | ISO 23897 format; one counterparty generates, both use the same UTI |
| **UPI (Unique Product Identifier)** | ANNA DSB-issued; required for all new trades |
| **Delegated reporting** | Financial counterparties must report on behalf of small NFC counterparties; UCITS ManCos/AIFMs report on behalf of their funds |
| **Lifecycle reporting** | All modifications, valuations, and terminations reported (not just new trades) |

**Trade Repositories (EU):** DTCC DDRL, Regis-TR, UnaVista (LSE), KDPW. Dual-sided reporting with reconciliation by TRs.

### 4.2 Risk Mitigation for Uncleared OTC Derivatives

| Requirement | Timeline / Threshold |
|-------------|---------------------|
| **Timely confirmation** | T+1 (clearing-eligible), T+2 (other) |
| **Portfolio reconciliation** | Daily (500+ trades), weekly (51-499), quarterly (<=50) |
| **Portfolio compression** | Biannual assessment for portfolios of 500+ trades |
| **Dispute resolution** | Documented procedures; disputes >EUR 15M reported to competent authority |
| **Daily valuation** | Mark-to-market (or mark-to-model if market not active) |

---

## 5. SFTR (Securities Financing Transactions Regulation)

### 5.1 Scope

SFTR covers:
- **Repos and reverse repos** (repurchase agreements)
- **Securities lending and borrowing**
- **Buy-sell backs / sell-buy backs**
- **Margin lending** (financing against a portfolio of securities)

Total return swaps (TRS) are reportable under EMIR, not SFTR, but TRS disclosure requirements apply in fund annual reports under SFTR Article 13.

### 5.2 Reporting Obligations

| Requirement | Detail |
|-------------|--------|
| **Who reports** | Both counterparties (dual-sided). UCITS ManCos/AIFMs report on behalf of their funds. |
| **When** | By T+1 (end of business day following conclusion, modification, or termination) |
| **What** | 155 fields per report, including counterparty data, loan/collateral data, margin data, reuse data |
| **To whom** | Authorised Trade Repositories (DTCC, Regis-TR, KDPW, UnaVista) |
| **Collateral updates** | Daily reporting of collateral market values, collateral reuse, and margin updates |

### 5.3 Fund Annual Report Disclosure (Article 13)

UCITS and AIFs must disclose in their annual/semi-annual reports:
- Global data on SFTs (amount, type, maturity, currency, settlement)
- Concentration data (top 10 counterparties, top 10 collateral issuers)
- Aggregate transaction data (type and quality of collateral, maturity, countries)
- Safekeeping of collateral received (tri-party, CSD, bilateral)
- Custodian identity and revenue/cost breakdown for securities lending

---

## 6. Collateral Management

### 6.1 Eligible Collateral and Haircuts

| Collateral Type | Typical Haircut (IM) | Typical Haircut (VM) | Notes |
|----------------|----------------------|----------------------|-------|
| Cash (same currency as obligation) | 0% | 0% | Required for regulatory VM |
| Cash (different currency) | 8% | N/A (VM is cash-only) | FX mismatch haircut |
| G7 sovereign bonds (0-1yr) | 0.5-1% | N/A | Most common IM collateral |
| G7 sovereign bonds (1-5yr) | 1-4% | N/A | |
| G7 sovereign bonds (5-10yr) | 4-6% | N/A | |
| G7 sovereign bonds (10yr+) | 6-12% | N/A | |
| Investment-grade corporate bonds | 8-15% | N/A | Not accepted by all counterparties |
| Equities (main index) | 15-25% | N/A | Limited acceptance for IM |
| Gold | 15% | N/A | Accepted under some regulatory frameworks |

**Regulatory IM haircuts** are prescribed by BCBS-IOSCO and implemented in EU Delegated Regulation 2016/2251.

### 6.2 Collateral Operations

**Substitution:** The collateral giver may request to swap posted collateral for alternative eligible collateral. Requires counterparty/custodian consent, typically T+1 settlement.

**Rehypothecation rules:**
- **IM collateral:** Rehypothecation is **prohibited** under UMR. IM must be segregated at a third-party custodian.
- **VM collateral:** Rehypothecation typically permitted under title transfer CSAs (English law). Under NY law security interest CSAs, consent is required.

**Tri-party agents (Euroclear Bank, Clearstream Banking, BNY):**
- Automate collateral selection, optimisation, and settlement
- Apply eligibility criteria and haircut schedules
- Handle substitutions and mark-to-market adjustments daily
- Particularly valuable for IM segregation requirements under UMR

**Concentration limits:** CSAs commonly specify maximum percentages per issuer (e.g., max 10% of collateral pool in a single corporate issuer), per asset type, and per country. These must be monitored daily alongside eligibility checks.

---

## 7. Derivative Lifecycle Operations

### 7.1 Trade Capture and Confirmation

```
Trade Execution → Capture in OMS/PMS → Enrich (counterparty, SSI, product terms)
  → Generate confirmation → Match electronically (MarkitWire, DTCC CTM)
  → Affirm/confirm → Book in fund accounting system
  → Report to TR (EMIR T+1)
```

**Fund administrator responsibilities:** Verify trade details against investment mandate limits, ensure confirmation is received within EMIR timelines, capture in position-keeping and NAV systems.

### 7.2 Reset/Fixing Dates

For floating-rate instruments (IRS, FRN, caps/floors):
- **Fixing date:** Rate observation date (typically 2 business days before period start for LIBOR legacy; same-day for SOFR/ESTR)
- **Accrual period:** Start date to end date of the interest period
- **Payment date:** Typically end of accrual period (or 2 business days after for some conventions)
- **Fallback rates:** ISDA 2020 IBOR Fallbacks Protocol governs transition from LIBOR to risk-free rates (SOFR, ESTR, SONIA)

### 7.3 Exercise and Assignment (Options)

| Type | Process | Settlement |
|------|---------|------------|
| **European** | Exercise on expiry date only | Cash or physical (T+2 for equities) |
| **American** | Exercise any business day up to and including expiry | Cash or physical |
| **Bermudan** | Exercise on specified dates | Cash or physical |
| **Auto-exercise** | In-the-money options auto-exercised at expiry unless instructed otherwise | Exchange/CCP rules apply |

**Administrator actions:** Monitor approaching expiry dates, confirm exercise/abandonment instructions from investment manager, process settlement, update positions.

### 7.4 Expiration and Rollover (Futures)

Futures contracts expire on specified dates. Funds with rolling futures exposure must:
1. Close the front-month contract before/on last trading day
2. Open the next-month (or deferred) contract
3. Record roll P&L in the accounting system
4. Typical roll periods: 5-10 business days before expiry to manage liquidity

### 7.5 Early Termination and Novation

**Early termination:** Either party may terminate a specific trade (or all trades) following an Event of Default or Termination Event under the ISDA Master Agreement. Close-out amount calculated per Section 6 of the 2002 ISDA.

**Novation:** Transfer of a derivative position from one counterparty to a third party:
1. All three parties must consent (transferor, transferee, remaining party)
2. New ISDA documentation required between transferee and remaining party
3. ISDA Novation Protocol / Novation Confirmation used
4. Trade repository reports updated (old trade terminated, new trade reported)

### 7.6 Cash Flow Settlement

| Derivative | Cash Flows | Settlement |
|------------|-----------|------------|
| **IRS** | Net interest payments at each period end | T+2 (standard) |
| **CDS** | Quarterly premium payments; contingent protection payment on credit event | Premium: quarterly IMM dates; Protection: T+3 after credit event determination |
| **FX forwards** | Exchange of notional amounts at maturity | T+2 from maturity (standard) |
| **Options** | Premium at inception; exercise proceeds at expiry | Premium: T+1; Exercise: T+2 |
| **Futures** | Daily VM settlement; final settlement at expiry | Same-day (CCP VM); T+1 (final) |

---

## Sources

- [ISDA SIMM Methodology](https://www.isda.org/isda-solutions-infohub/isda-simm/) — Official ISDA SIMM documentation and version history
- [ISDA Master Agreement Overview](https://www.isda.org/book/2002-isda-master-agreement/) — ISDA 2002 Master Agreement
- [EMIR Refit — Sidley Austin](https://www.sidley.com/en/insights/newsupdates/2024/02/2024-european-market-infrastructure-regulation-refit) — EMIR Refit reporting changes
- [ESMA Clearing Obligation Public Register](https://www.esma.europa.eu/sites/default/files/library/public_register_for_the_clearing_obligation_under_emir.pdf) — Products subject to mandatory clearing
- [SFTR Reporting — ESMA](https://www.esma.europa.eu/data-reporting/sftr-reporting) — SFTR reporting guidance
- [ICMA SFTR Recommendations (March 2025)](https://www.icmagroup.org/assets/ICMA-Recommendations-for-Reporting-under-SFTR-March-2025.pdf) — Practical SFTR reporting guidance
- [CME Group — Navigating UMR](https://www.cmegroup.com/education/navigating-uncleared-margin-rules.html) — Uncleared Margin Rules overview
- [ISDA Countdown to Phase 6 IM](https://www.isda.org/countdown-to-phase-6-initial-margin/) — UMR phase-in tracker
- [BCBS-IOSCO Margin Requirements (BIS)](https://www.bis.org/bcbs/publ/d589.pdf) — Streamlining VM and IM processes
- [ISDA Eligible Collateral Comparison](https://www.isda.org/a/lLogE/Eligible-Collateral-Comparison-6.22.23-2.pdf) — Cross-jurisdictional eligible collateral tables

---

## Related Files

| File | Relevance |
|------|-----------|
| `domain/ACCOUNTING_STANDARDS.md` | IFRS 9 derivative classification (FVTPL), hedge accounting (IFRS 9 Chapter 6), fair value hierarchy for OTC derivatives |
| `domain/REGULATORY.md` | UCITS OTC counterparty limits (5%/10% NAV), AIFMD leverage calculation, global exposure measurement |
| `domain/RECONCILIATION_AND_OPS.md` | Daily derivatives position recon, trade lifecycle events in NAV production cycle |
| `domain/INVESTMENT_MANDATES.md` | Derivative exposure limits, commitment approach vs. VaR, eligible FDI for UCITS |
| `domain/NAV_METHODOLOGY.md` | Derivative pricing in NAV (mark-to-market, mark-to-model), pricing waterfall for illiquid OTC instruments |
| `domain/ERROR_SCENARIOS_AND_CRISIS.md` | Counterparty default playbooks, margin call failure escalation, CCP default scenarios |
