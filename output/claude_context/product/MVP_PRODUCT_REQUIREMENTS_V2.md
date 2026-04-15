# Elysium MVP Product Requirements V2

<!-- ~25000 tokens -->
**Last Updated:** 2026-02-10
**Status:** Draft v2
**Tags:** product, mvp, requirements, cayman, crypto, spc, irish-admin, fund-administration
**Supersedes:** `PRODUCT_MVP_REQUIREMENTS.md` (v1)

---

> **Scope:** Complete operational and compliance requirements for an Irish CBI-licensed fund administration entity servicing a Cayman-domiciled Segregated Portfolio Company (SPC) investing exclusively in crypto assets via centralized exchanges. Accredited investors only. No legacy migration. This document is the product bible — every feature, control, and obligation needed for Day 1 operations.

---

## 1. Scope Definition

### 1.1 What This MVP Is

An **Irish-licensed fund administration entity** (CBI authorized under Section 10, Investment Intermediaries Act 1995) servicing a **Cayman-domiciled Segregated Portfolio Company (SPC)** with independent Segregated Portfolios (SPs) per investment manager. The fund invests exclusively in **crypto assets traded on centralized exchanges** (OKX, Binance, Bybit, etc.) and is open only to **accredited/qualified investors** meeting the Cayman USD 100,000 minimum initial investment threshold.

### 1.2 What This MVP Is NOT

| Exclusion | Reason |
|-----------|--------|
| Not a UCITS fund | No retail passporting, no UCITS diversification rules, no depositary strict liability |
| Not multi-jurisdiction | Cayman only; no Luxembourg, Singapore, or US-domiciled funds |
| Not for legacy migration | No book transfer from other administrators |
| Not for traditional assets | No bonds, equities, real estate, or private equity |
| Not for derivatives | Spot CEX trading only; no futures, options, swaps, or ISDA |
| Not a depositary | Cayman AIFs do not require a depositary under CIMA rules |
| Not for retail investors | MiFID II suitability, PRIIPs KID, and UCITS KIID do not apply |
| Not for DeFi | No staking, lending, LP positions, or protocol interactions (unless added per SP mandate) |

### 1.3 Core Value Proposition

Managers come to Elysium with one thing: **their trading strategy**. They trade on CEXs. Elysium handles everything else — fund setup, investor onboarding, subscriptions, redemptions, NAV calculation, fee processing, share minting, compliance, reporting, and legal document production.

**Near-zero marginal cost:** Adding a fund is configuration, not headcount. Breaks the traditional "cost per fund" model that makes sub-$100M AUM funds uneconomical.

---

## 2. Legal Architecture

### 2.1 Fund Structure

```
Elysium Fund Services Ltd (Irish CBI-authorized Administrator)
    │
    └── [Fund Name] SPC (Cayman Islands, CIMA s.4(3) Registered)
         ├── Segregated Portfolio A — Manager Alpha (crypto L/S)
         ├── Segregated Portfolio B — Manager Beta (DeFi yield)
         ├── Segregated Portfolio C — Manager Gamma (quant)
         └── ... (new SPs added per new manager)
```

### 2.2 Why SPC

| Feature | Benefit |
|---------|---------|
| **Statutory asset segregation** | Creditors of SP-A cannot access SP-B's assets (Cayman SPC Law) |
| **Single umbrella** | One set of constitutional documents, one CIMA registration, one audit engagement |
| **Independent sub-funds** | Each SP has its own investment mandate, fee structure, NAV, and share classes |
| **Scalable** | Adding a new manager = creating a new SP (supplement to offering memorandum, not a new fund) |

### 2.3 Per Segregated Portfolio (SP)

Each SP operates as a fully independent sub-fund with:
- Its own investment mandate and eligible asset list
- Its own dealing day and NAV frequency (configurable: daily, weekly, or monthly)
- Its own fee schedule (management fee, performance fee, admin fee)
- Its own share classes (see Section 10)
- Its own high-water mark (HWM) for performance fee calculation
- Complete legal and financial isolation from other SPs

---

## 3. Regulatory Framework

### 3.1 Irish Administrator Authorization (CBI)

| Requirement | Detail |
|-------------|--------|
| **Legal basis** | Section 10, Investment Intermediaries Act 1995 |
| **Pre-application** | Meeting with CBI recommended (not mandatory); sets expectations |
| **Application package** | 3-year business plan, financial projections, org chart, IT infrastructure, outsourcing arrangements, risk framework |
| **Timeline** | 3-6 months from complete application |
| **Minimum capital** | EUR 125,000 (may be higher depending on CBI risk assessment; up to EUR 635,000) |
| **Ongoing capital** | Must maintain capital adequacy at all times; report to CBI if at risk |
| **Board substance** | Minimum 2-3 Irish-resident directors; minimum 2 conducting officers based in Ireland |
| **Board meetings** | Quarterly minimum |
| **Record retrieval** | Same-day if request received before 1:00 PM; next business day if after 1:00 PM |
| **Regulatory returns** | Via CBI Online Reporting (ONR) system — quarterly and annual |
| **Audited financials** | Annual, filed with CBI |
| **Material change notifications** | CBI must be notified of changes to business plan, outsourcing, IT, governance, or qualifying shareholders (10%+) |
| **PRISM supervision** | Risk-based engagement model; thematic inspections (recent: outsourcing oversight, DORA readiness) |
| **ASP sanctions** | Fines up to EUR 10M or 10% of turnover (entity); EUR 1M (individual) |

### 3.2 Pre-Controlled Function (PCF) Holders

All PCF holders require **prior CBI approval** via Individual Questionnaire under the Fitness & Probity (F&P) regime. Four F&P standards apply at all times: competence, honesty, integrity, financial soundness.

| PCF Role | Code | Responsibility |
|----------|------|----------------|
| **CEO** | PCF-1 | Overall management and strategy |
| **Head of Compliance** | PCF-12 | Regulatory compliance, CBI liaison |
| **Head of AML/CFT** | PCF-15 / PCF-52 | AML program, STR filing, sanctions |
| **Chief Risk Officer** | PCF-14 | Risk framework, stress testing |
| **Head of Finance** | PCF-11 | Regulatory capital, financial controls |

**Controlled Functions (CF)** holders: annual self-certification by the entity. Covers all staff performing customer-facing or decision-making roles.

**IAF/SEAR readiness:** PCF holders must maintain Statements of Responsibilities. Management Responsibilities Map required. Fund administration entities expected in a future SEAR extension phase.

### 3.3 Cayman Fund Registration (CIMA)

| Requirement | Detail |
|-------------|--------|
| **Registration type** | Section 4(3) Mutual Funds Act — minimum initial investment USD 100,000 per investor |
| **Annual audit** | Audited financial statements required; filed with Fund Annual Return (FAR) |
| **FAR filing** | Within 6 months of year-end (extendable 3 months on application) |
| **Acceptable GAAP** | IFRS, US GAAP (ASC 946), Japan GAAP, Swiss GAAP |
| **CIMA-approved auditor** | Mandatory |
| **CIMA fees** | Annual, based on NAV bands |
| **Directors** | Must register under Directors Registration & Licensing Law (DRLL); professional directors (20+ entities) require CIMA license |
| **Corporate governance** | CIMA Corporate Governance Rule (Oct 2023): governance framework proportionate to size/complexity; audit committee or equivalent; operator self-assessment |
| **Beneficial ownership** | Regulated mutual funds exempt from BO register but must appoint Contact Person for CIMA requests |
| **Economic Substance** | Funds exempt from Economic Substance Act 2018 |

### 3.4 AML/KYC (Dual Jurisdiction)

| Area | Ireland | Cayman |
|------|---------|--------|
| **Legislation** | Criminal Justice (Money Laundering and Terrorist Financing) Act 2010 | AML Regulations 2020; Proceeds of Crime Act |
| **Key appointments** | Head of AML/CFT (PCF-15/PCF-52) | AMLCO, MLRO, Deputy MLRO |
| **STR filing** | Financial Intelligence Unit Ireland | Financial Reporting Authority (FRA) |
| **CDD threshold** | Before establishing relationship; EDD for PEPs and high-risk jurisdictions | Same |
| **UBO identification** | 25%+ ownership threshold | Same |
| **Record retention** | 5 years post-relationship (6AMLD extends to 6 years) | 5 years minimum |
| **Staff training** | Annual AML training for all relevant staff | Same |
| **Tipping-off** | Criminal offence to disclose STR filing to subject | Same |

### 3.5 Sanctions Screening

| Requirement | Detail |
|-------------|--------|
| **Lists** | OFAC SDN, EU Consolidated List, UN Security Council, UK HMT, Cayman FRA |
| **Screening scope** | Investors, counterparties (CEXs, banks), portfolio assets (token issuers) |
| **Timing — onboarding** | Before accepting any investor |
| **Timing — ongoing** | Within 24 hours of any list update; minimum quarterly batch re-screening |
| **Blocking/freezing** | Immediately freeze sanctioned property; block all transactions |
| **OFAC reporting** | Within 10 business days of blocking |
| **OFAC 50% rule** | Applies if USD transactions or US sub-custodian involved; entities 50%+ owned by SDN are also blocked |
| **EU/UK reporting** | Without delay to relevant NCA |
| **Cayman penalties** | Up to USD 84,087 and/or 3 years imprisonment for failure to freeze |

### 3.6 What's NOT Required (Regulatory Complexity Eliminated)

| Regulation | Why Not Applicable |
|------------|-------------------|
| UCITS Directive | Not a UCITS; Cayman fund. No 5/10/40 rule, no daily dealing mandate, no KIID |
| AIFMD (full scope) | Irish admin is not the AIFM; Cayman manager outside EU scope (third-country) |
| AIFMD Annex IV | Only required if fund has an EU AIFM |
| SFDR / ESG disclosure | Not an EU-domiciled fund; voluntary only |
| PRIIPs KID | Not distributed to EU retail investors |
| MiFID II | Admin is not an investment firm; no suitability/product governance obligations |
| EMIR / SFTR | No OTC derivatives or SFTs in scope (CEX spot trading only) |
| Depositary requirement | Cayman AIFs exempt from mandatory depositary under CIMA rules |
| ELTIF rules | Not applicable |
| EU Cross-Border Distribution | Not applicable for Cayman-only distribution |
| Irish fund structure rules | Fund is Cayman SPC, not Irish ICAV/QIAIF/CCF/ILP |

**Result:** ~60% of full regulatory complexity eliminated vs. an Irish UCITS retail fund.

---

## 4. Governance & Organization

### 4.1 CP86 Designated Person (DP) Framework

*Required by CBI: Section 10, Fund Administration Companies Guidance. Each DP role must be assigned to a named individual.*

| DP Role | Scope | Key Responsibilities |
|---------|-------|---------------------|
| **DP1: Regulatory & Compliance** | AML/CFT, sanctions, regulatory filings | Compliance monitoring program, STR filing, CBI liaison, investor complaints |
| **DP2: Fund Risk Management** | Market, counterparty, liquidity risk | Risk register, stress testing, concentration monitoring, exchange counterparty risk |
| **DP3: Operational Risk Management** | BCP, outsourcing, cybersecurity | BCP testing, vendor oversight, incident management, DORA compliance |
| **DP4: Investment Management** | Mandate monitoring, best execution | Pre/post-trade compliance, mandate breach escalation, performance oversight |
| **DP5: Capital & Financial Management** | Regulatory capital, NAV governance | Capital adequacy monitoring, NAV error escalation, financial controls |
| **DP6: Distribution** | Distributor due diligence, suitability | Not MVP-critical (direct investors only), but role must still be assigned |

**Constraint:** DP2 and DP4 must be held by **different individuals** (CBI requirement — prevents risk taker from overseeing own risk).

**Organisational Effectiveness Role (OER):** Independent board member (not a DP). Conducts annual assessment of CP86 effectiveness. Reports to board with action items.

### 4.2 Board Composition

| Role | Count | Residency | Time Commitment |
|------|-------|-----------|-----------------|
| Independent NEDs | 2-3 minimum | Irish-resident | 20-30 days/year |
| Conducting officers | 2 minimum | Irish-based | Full-time or near-full-time |
| OER holder | 1 | Any (but typically Irish) | 5-10 days/year |

### 4.3 Committees

| Committee | Composition | Frequency | Purpose |
|-----------|-------------|-----------|---------|
| **Board** | All directors | Quarterly minimum | Strategy, governance, risk oversight |
| **Pricing / Valuation** | Admin, risk, compliance, independent member | Monthly; ad hoc for market dislocations | Price source approval, override governance, fair value determinations |
| **Compliance** | DP1, DP2, CEO | Quarterly | AML review, regulatory change monitoring, breach review |
| **Risk** | DP2, DP3, CRO | Quarterly | Risk register review, stress test results, incident review |

### 4.4 Pricing Committee Governance

- **Pricing sources:** Must be approved by committee; documented in pricing policy
- **Price overrides:** Require documented justification, committee approval, and audit trail
- **Fair value hierarchy:** Level 1 (active CEX), Level 2 (observable inputs), Level 3 (model-based) — escalating governance at each level
- **Stale price threshold:** Unchanged price for >3-5 days triggers escalation to committee
- **Exchange selection:** Primary and secondary CEXs documented per asset; fallback hierarchy

### 4.5 Segregation of Duties

*These pairs must be performed by different individuals (COSO requirement, SOC 1 expected):*

| Function A | Function B |
|------------|------------|
| NAV calculation | NAV approval (four-eye sign-off) |
| Payment initiation | Payment authorization |
| Trade execution | Trade settlement |
| Pricing input | Pricing validation |
| Reconciliation preparation | Reconciliation approval |
| Journal entry creation | Journal entry approval |
| System administration | Business user operations |

### 4.6 Conflicts of Interest

- **Conflicts register:** Mandatory; maintained by DP1. Updated on identification of any conflict.
- **Connected party transactions:** Must be arm's length, documented, and board-reported.
- **Personal dealing policy:** Pre-clearance for relevant staff; holding periods for traded assets; restricted list (e.g., no personal trading in assets held by administered funds).

---

## 5. Manager Onboarding

### 5.1 Onboarding Workflow

| Step | Action | Owner | Timeline |
|------|--------|-------|----------|
| 1 | **Commercial agreement** — fee schedule, service scope, SLA | Elysium BD | Week 1-2 |
| 2 | **Manager KYC/AML** — corporate docs, UBO declarations, authorized signatories | Elysium Compliance | Week 2-3 |
| 3 | **Investment mandate definition** — eligible assets (which tokens/exchanges), concentration limits, leverage limits, restricted list | Manager + Elysium | Week 3-4 |
| 4 | **SP supplement drafting** — legal counsel drafts supplement to SPC offering memorandum | Legal counsel | Week 4-6 |
| 5 | **Share class configuration** — denomination currencies, fee tiers, minimum investment, lock-up periods | Elysium + Manager | Week 5-6 |
| 6 | **CIMA notification** — material change notification to CIMA for new SP | Legal counsel | Week 6-7 |
| 7 | **Platform setup** — on-chain SP creation, share class deployment, role assignments, CEX API integration | Elysium Tech | Week 7-8 |
| 8 | **Seed investment** — initial capital from manager or seed investor; first NAV calculated | Manager + Elysium | Week 8-9 |
| 9 | **Go-live** — SP open for investor subscriptions; dealing commences | Elysium | Week 9-10 |

**Total onboarding:** 8-10 weeks from signed engagement to first investor dealing day.

---

## 6. Investor Onboarding & AML/KYC

### 6.1 Eligibility

**Accredited/Qualified Investors Only** — minimum initial investment USD 100,000 per CIMA Section 4(3).

| Investor Type | Documentation Required |
|---------------|----------------------|
| **High-net-worth individual** | Passport/national ID (certified, unexpired), proof of address (< 3 months), source of wealth declaration, source of funds declaration, accreditation self-certification |
| **Corporate/institutional** | Certificate of incorporation, articles of association, board resolution, authorized signatory list, UBO declaration (>25% ownership), audited financials, proof of registered address |
| **Fund of funds** | Management company KYC, underlying investor composition disclosure, regulatory authorization proof |

### 6.2 Tax Documentation (Collected at Onboarding)

- CRS self-certification form (all investors, mandatory)
- Tax identification number (TIN) for each tax residency jurisdiction
- W-8BEN-E (non-US entities) or W-9 (US persons) for FATCA classification
- Investor classification: US person, CRS reportable jurisdiction, exempt status

### 6.3 AML Risk Scoring

Five-factor weighted composite score:

| Factor | Weight | Score Range | Low (1-2) | High (4-5) |
|--------|--------|-------------|-----------|------------|
| **Jurisdiction** | x2 | 2-10 | FATF "white list" (US, UK, EU) | FATF grey/black list |
| **Investor type** | x1.5 | 1.5-7.5 | Regulated institution | Shell company, trust |
| **PEP status** | x2 | 2-10 | No PEP connection | PEP or close associate |
| **Source of wealth** | x1.5 | 1.5-7.5 | Employment, regulated investment | Cash-intensive, opaque origin |
| **Product risk** | x1 | 1-5 | Standard crypto fund | Complex structure |

| Composite Score | Risk Tier | CDD Level | Review Frequency |
|----------------|-----------|-----------|------------------|
| **8-14** | Low | Standard CDD | 5-year cycle |
| **15-24** | Medium | Enhanced CDD | 3-year cycle |
| **25-32** | High | Enhanced DD + senior management approval | Annual |
| **33-40** | Very High | Board-level approval; 6-monthly review | 6-monthly |

### 6.4 Screening Requirements

| Check | Timing | Action on Hit |
|-------|--------|---------------|
| **Sanctions (OFAC/EU/UN/UK)** | Onboarding + within 24 hours of list update | Freeze, block, report |
| **PEP screening** | Onboarding + ongoing monitoring | EDD, senior management sign-off |
| **Adverse media** | Onboarding + triggered by alerts | Investigate, escalate if warranted |
| **Ongoing monitoring** | Continuous | Transaction monitoring; unusual activity triggers SAR assessment |

### 6.5 EDD Triggers

Enhanced Due Diligence is mandatory for: PEPs, complex corporate structures, FATF grey/black list jurisdictions, unusual transaction patterns, high-risk source of wealth. Requires **senior management sign-off** before relationship is established.

### 6.6 Trigger Events for Re-Assessment

| Event | Response Timeline |
|-------|-------------------|
| Sanctions list update | 24 hours |
| Adverse media alert | 5 business days |
| Unusual transaction pattern | Immediate SAR assessment |
| UBO change | 30 days (re-KYC) |
| Jurisdiction change | 30 days (re-risk-score) |
| PEP status change | Immediate re-assessment |

### 6.7 Complaint Handling

*Required by CBI:*
- Acknowledge complaint: **5 business days**
- Resolve complaint: **40 business days**
- Record retention: **6 years**

---

## 7. Subscription & Redemption Lifecycle

### 7.1 Subscription Flow

```
Investor submits application + AML/KYC docs + subscription funds
    │
    ├── Compliance validates: AML cleared? Eligible? Minimum met? Sanctions clean?
    │       │
    │       ├── REJECTED → Notify investor; return funds within 5 business days
    │       └── APPROVED ↓
    │
    ├── Order accepted before cut-off → queued for NEXT dealing day (forward pricing)
    │
    ├── Dealing day: NAV calculated at valuation point
    │       │
    │       └── Shares = Subscription Amount / NAV per share (after entry fee if any)
    │
    ├── On-chain: ERC1155 tokens minted to investor address
    │       │
    │       └── New series (tokenId) per subscription batch → natural equalization
    │
    └── Confirmation: contract note sent to investor within 1 business day
```

### 7.2 Redemption Flow

```
Investor submits redemption request (amount or shares)
    │
    ├── Validation:
    │   ✓ Sufficient holding?
    │   ✓ Lock-up expired?
    │   ✓ Notice period satisfied?
    │   ✓ Gate limit not exceeded?
    │   ✓ Minimum holding post-redemption met?
    │   ✓ No account freeze/sanctions hold?
    │       │
    │       ├── REJECTED → Notify investor with specific reason
    │       └── APPROVED ↓
    │
    ├── Applied to next dealing day (if before cut-off)
    │
    ├── NAV calculated at valuation point
    │       │
    │       └── Proceeds = Shares × NAV per share − exit fee − performance fee (if crystallized)
    │
    ├── On-chain: ERC1155 tokens burned
    │
    └── Settlement: proceeds to registered bank account (T+1 to T+5)
```

### 7.3 Forced / Compulsory Redemption

*Required by CBI AML obligations and fund constitutional documents.*

| Trigger | Authority |
|---------|-----------|
| AML/KYC failure or refusal | Compliance |
| Sanctions designation | Compliance (immediate freeze) |
| Eligibility lapse (accreditation lost) | Compliance |
| Minimum holding breach | Operations |
| False representations on subscription | Legal |
| Tax status change (non-compliant with FATCA/CRS) | Compliance |
| Regulatory order | Board |

**Process:** Board resolution → Written notice to investor (10-30 business days per prospectus) → Execute at next dealing day NAV → Payment to registered bank account → CBI notification if AML-triggered.

**Tipping-off prohibition:** When forced redemption is triggered by AML/sanctions, the reason **must not** be disclosed to the investor. Use neutral language (e.g., "the fund is exercising its right under Section X of the offering memorandum").

### 7.4 Dealing Parameters (Configurable per SP)

| Parameter | Range | MVP Default | Notes |
|-----------|-------|-------------|-------|
| **Dealing frequency** | Daily, weekly, or monthly | Weekly | Configurable per SP |
| **Cut-off time** | Prospectus-defined | 5 PM UTC | Orders after cut-off roll to next dealing day |
| **Valuation point** | Prospectus-defined | 00:00 UTC | Crypto markets are 24/7 — no "market close" |
| **Settlement cycle** | T+1 to T+5 | T+3 | Crypto settles faster than TradFi |
| **Pricing model** | Forward pricing (single NAV) | Forward pricing | Price at NEXT dealing day NAV after order received |
| **Lock-up** | 0-24 months | 6 months | Per SP; prevents early flight |
| **Notice period** | 0-90 days | 30 days | Per SP |
| **Redemption gate** | 10-25% of SP NAV per dealing day | 15% | Prevents redemption runs |
| **Minimum investment** | Per prospectus | USD 100,000 | CIMA s.4(3) threshold |
| **Minimum holding** | Per prospectus | USD 50,000 | Breach triggers block or forced redemption |

### 7.5 Anti-Dilution

| Mechanism | Description | Implementation |
|-----------|-------------|----------------|
| **Swing pricing** | NAV adjusted when net flows exceed threshold (2-5% of fund NAV). Swing factor: ~50-100 bps. Up for net inflows, down for net outflows. | On-chain: 3-level dilution model (fund → class → dealing) |
| **Dilution levy** | Separate visible charge on contract note when flows exceed threshold; paid into fund to protect remaining holders | Off-chain: calculated and disclosed on contract note |

**ESMA recommendation:** At least 1 quantitative LMT (gate or side pocket) + 1 anti-dilution tool (swing pricing or dilution levy) per fund. Elysium satisfies both with gates + dilution model.

---

## 8. NAV Calculation & Pricing

### 8.1 Pricing Waterfall (Crypto-Specific)

| Level | Source | Use Case | Governance |
|-------|--------|----------|------------|
| **Level 1** | CEX spot prices (Binance/OKX bid/ask mid-price) | Most liquid pairs (BTC, ETH, major alts) | Automated; no committee review needed |
| **Level 2** | Composite pricing (CoinGecko/Messari evaluated) | Less liquid altcoins | Admin validation; flag if >5% deviation from Level 1 |
| **Level 3** | Mark-to-model (TWAP, funding rates, borrow rates) | Illiquid tokens, depegged stablecoins | Pricing committee approval required |
| **Level 4** | Broker/market maker quotes | OTC positions, private placements | Pricing committee + board-level approval |
| **Level 5** | Fair value committee determination | Governance tokens, pending ICOs, delisted assets | Full committee with documented rationale |

**Stale price threshold:** Price unchanged for >3 business days → flag for investigation. >5 business days → escalate to pricing committee for fair value determination.

**Exchange selection:** Primary and secondary CEX documented per asset in pricing policy. Fallback hierarchy: Primary CEX → Secondary CEX → Composite → TWAP → Manual override (with committee approval).

### 8.2 NAV Components

```
Gross Assets = Market value of crypto holdings (mid-price from CEX, per waterfall)
             + Stablecoins / USD cash equivalents
             + Accrued receivables (pending settlements, exchange rebates)
             + Staking/lending yield (if applicable per SP mandate)

Liabilities  = Management fee accrual (daily)
             + Performance fee accrual (daily, crystallized per schedule)
             + Administration fee accrual (daily)
             + Other accrued expenses (audit, legal, directors, custody, CIMA fees)
             + Pending redemption payables

SP NAV = Gross Assets − Liabilities

NAV per Share = SP NAV / Total Shares Outstanding
```

### 8.3 Multi-Class NAV Cascade

```
1. Calculate Fund NAV (aggregate)
2. Allocate P&L pro-rata to classes (based on prior-day class NAV proportions)
3. Apply class-specific adjustments (FX costs, class-only expenses)
4. Calculate NAV per share per class
5. Convert to denomination currency: classPriceInDenom = classPrice × fxRate / PRECISION
```

*See `domain/SHARE_CLASSES.md` for detailed class-level dilution mechanics.*

### 8.4 Daily NAV Production Cycle

| Time (UTC) | Activity | Owner |
|------------|----------|-------|
| 23:00 | Market data feeds arrive (CEX APIs, data vendors) | Pricing team |
| 23:00-23:30 | Apply pricing waterfall; flag missing/stale prices | Pricing team |
| 23:30-00:30 | Position reconciliation: admin vs. custodian/CEX vs. OMS | Operations |
| 00:30-01:00 | Draft NAV per SP; run automated validation checks | NAV team |
| 01:00-01:30 | Senior reviewer approval (four-eye principle, SoD) | NAV approver (different person) |
| 01:30-02:00 | NAV published; on-chain posting; investor notifications | Operations / Tech |

### 8.5 NAV Validation Checks (~100+ data points)

- Day-over-day NAV movement vs tolerance bands (e.g., ±10% for crypto)
- Individual position price change vs benchmark
- Cash balance vs expected settlement activity
- FX rate reasonableness (vs ECB/Bloomberg reference)
- Fee accrual completeness and accuracy
- Total shares outstanding vs shareholder register
- Reconciliation break status (no unresolved material breaks)

### 8.6 NAV Frequency

| Frequency | Use Case | Dealing |
|-----------|----------|---------|
| **Daily** | Liquid strategies (spot trading on major CEXs) | Orders settle next business day |
| **Weekly** | Strategies with less liquid positions | Orders queue to next weekly dealing day |
| **Monthly** | Concentrated/illiquid strategies | Monthly dealing with 30+ day notice period |

### 8.7 Error Materiality

*Aligned with CBI CP130 framework:*

| Fund Type | Materiality Threshold | Notes |
|-----------|----------------------|-------|
| **Crypto/equity** | 0.50% of NAV per share | Standard threshold |
| **Professional-only** | Up to 5.00% at management discretion | Cayman s.4(3) funds qualify |
| **MVP default** | 0.50% | Conservative approach for launch |

**If material error detected:**
1. Identify root cause and affected NAV dates
2. Recalculate all affected NAVs
3. Assess investor impact (over/under-payment on subs/reds)
4. Compensate affected investors (admin or manager pays per indemnity agreement)
5. Notify CBI (for Irish entity errors)
6. Root cause analysis and corrective action within 30 business days

**Professional investors CAN be asked to reimburse windfall gains** (unlike retail, where this is prohibited).

---

## 9. Fee Management & Equalization

### 9.1 Management Fee

| Parameter | Detail |
|-----------|--------|
| **Rate** | 1.5-2.0% annual (configurable per SP) |
| **Basis** | NAV-based (not GAV — no leverage in crypto spot-only MVP) |
| **Accrual** | Daily: `(Annual Rate bps / 365) × SP NAV` |
| **Payment** | Monthly or quarterly in arrears to manager |
| **Tiering** | Optional: lower rate above AUM breakpoints (e.g., 1.5% on first $100M, 1.0% above) |
| **Day count** | 365-day divisor (standard for fund fee calculations) |

### 9.2 Performance Fee

| Parameter | Detail |
|-----------|--------|
| **Rate** | 15-20% (configurable per SP) |
| **High-water mark** | Per series (dealing-level HWM). Resets only when exceeded. |
| **Hurdle rate** | 0% (standard for crypto funds) or configurable soft/hard hurdle |
| **Crystallization** | Monthly (typical for crypto) or quarterly. Annual also supported. |
| **Clawback** | Configurable: 50-100% of crystallized fee held in escrow for 1-3 years |
| **Formula** | `Fee = Rate × max(0, NAV per share − HWM per share) × shares outstanding` |

### 9.3 Equalization (Series-Based)

*Elysium uses series-based equalization (Method 3) — the most operationally clean approach for on-chain implementation.*

**How it works:**
- Each subscription batch mints a new ERC1155 tokenId (series) within its share class
- Each series carries its own HWM = NAV per share at time of subscription
- Performance fee is calculated independently per series
- No depreciation deposit or contingent redemption complexity

**Roll-up at crystallization:**
- Series **above** their respective HWMs: performance fee crystallized, series merged into single series at current NAV
- Series **below** their HWM: remain separate, carrying forward their own HWM until NAV exceeds it

**Performance fee example:**
- SP starts at $1M (HWM = $1M), grows to $1.2M (+$200K gain)
- Performance fee = 20% × $200K = **$40K**
- New HWM = $1.2M
- Mid-period subscriber gets Series B at HWM = $1.2M (natural equalization — no overpayment/underpayment)

### 9.4 Administration Fee

| Parameter | Detail |
|-----------|--------|
| **Rate** | 3-15 bps of NAV (scales inversely with AUM) |
| **Accrual** | Daily |
| **Revenue to** | Elysium Fund Services Ltd |
| **Covers** | NAV calculation, investor servicing, regulatory reporting, platform access |

### 9.5 Other SP Expenses

| Expense | Typical Range | Notes |
|---------|---------------|-------|
| **Custody/safekeeping** | 5-20 bps of AUM | Higher for cold storage multi-sig |
| **CEX trading fees** | 2-10 bps per round-trip | Binance VIP tiers lower this |
| **Audit** | $20K-$100K/year fixed | Simpler than TradFi (fewer asset classes) |
| **Legal** | $15K-$50K/year | Regulatory filings, document updates |
| **Director fees** | $10K-$30K/director/year | Cayman SPC requires independent directors |
| **CIMA fees** | $5K-$25K/year | Based on NAV bands |

### 9.6 Founders/Seed Class

For early investors or manager's own capital:

| Parameter | Founders Terms | Standard Terms |
|-----------|---------------|----------------|
| **Management fee** | 0.50-1.00% | 1.50-2.00% |
| **Performance fee** | 10-15% | 20% |
| **Lock-up** | 1-2 years | 6-12 months |
| **MFN clause** | Yes (most favorable terms guaranteed) | No |
| **Available window** | First 6-12 months or until AUM $50M-$100M | Ongoing |

---

## 10. Share Classes & Multi-Currency

### 10.1 MVP Share Classes (Per SP)

| Class | Currency | Fee Tier | Min Investment | Target |
|-------|----------|----------|----------------|--------|
| **Class A** | USD | Standard (2/20) | USD 100,000 | Primary investor class |
| **Class F** | USD | Founders (1/10) | USD 250,000 | Early investors, manager capital |
| **Class B** | EUR | Standard (2/20) | EUR 100,000 | European investors (optional) |

### 10.2 On-Chain Representation

- Each share class = distinct ERC1155 token type (`classId` in Diamond proxy)
- Each subscription batch within a class = distinct tokenId (series-based equalization)
- Class parameters stored on-chain: `denominationCurrency`, `mgmtFeeRate` (bps), `perfFeeCalculator`, `noticePeriod`, `lockPeriod`, `dilutionRatio`
- Fund reporting currency: USD
- Multi-currency settlement: cash fund tokens per currency per umbrella

### 10.3 FX Handling

| Aspect | Detail |
|--------|--------|
| **Rate storage** | `1 USD = X currency`, scaled by PRECISION |
| **Cross-rates** | Via USD triangulation (all rates are vs USD) |
| **Rate updater** | `ROLE_FX_UPDATER` via `updateFXRates()` |
| **Rate source** | ECB reference rates, Bloomberg, or approved FX provider |
| **Update frequency** | Daily minimum; intraday for dealing days |
| **Hedging** | **No FX hedging in MVP** — investors in non-USD classes bear FX risk |
| **Post-MVP** | Hedged classes can be added as class-level configuration |

### 10.4 Income Treatment

**MVP:** Accumulation only (income reinvested, increases NAV per share). Distribution classes deferred to post-MVP.

---

## 11. Investment Mandate Monitoring

### 11.1 Eligible Assets (Per SP Mandate)

| Category | Examples | Constraints |
|----------|----------|-------------|
| **Large-cap crypto** | BTC, ETH, SOL, BNB | No constraints (unless SP-specific) |
| **Mid-cap altcoins** | Per SP-specific approved list | Concentration limits (e.g., max 20-25% per token) |
| **Stablecoins** | USDC, USDT, DAI | Used for cash management; counterparty limits per issuer |
| **CEX positions** | Spot only (no futures/options) | Approved exchanges only |

### 11.2 Restricted/Prohibited

- No OTC derivatives (no ISDA, no futures, no options)
- No DeFi protocol interactions (unless explicitly in SP mandate)
- No securities tokens (avoids securities law complexity)
- No leverage beyond exchange margin (per SP mandate limit)
- Sanctioned tokens/entities per OFAC/EU lists

### 11.3 Compliance Monitoring

| Type | Timing | Action |
|------|--------|--------|
| **Pre-trade** | Before execution | Automated check: eligible asset? Approved exchange? Concentration limit? Position limit? |
| **Pre-trade enforcement** | Real-time | Hard block (rejects order) or soft warning (requires documented override with DP4 approval) |
| **Post-trade** | Daily (T+1) | Portfolio check using reconciled data: concentration limits, leverage limits, eligible asset mix |
| **Active breach** | Immediately | Trading error → immediate correction + DP4 notification + compliance log |
| **Passive breach** | Within 5 business days | Market movement caused breach → remediate ASAP (CBI expectation: 5 BD) |
| **Sanctions screening** | Real-time | Screen counterparties and assets against all sanctions lists |

---

## 12. Reconciliation & Daily Operations

### 12.1 Position Reconciliation (Daily, T+1)

**Three-way reconciliation:**
1. **Administrator ledger** (Elysium on-chain + off-chain records)
2. **Custodian/CEX** deposit records (Copper, Fireblocks, or CEX account)
3. **Investment manager OMS** (Haruko or manager's own system)

### 12.2 Tolerance Thresholds

| Item | Tolerance | Escalation |
|------|-----------|------------|
| **Quantity (tokens)** | Exact match (zero tolerance) | Any break → investigate immediately |
| **Market value** | ±0.01% of position | >0.01% → pricing team review |
| **Cash balance** | ±$100 or ±0.0001 BTC equivalent | >$100 → cash recon team |
| **FX rate** | ±0.0001 | >0.0001 → check source |
| **Opening balance** | Must match prior close exactly | Any mismatch → block NAV production |

### 12.3 Break Escalation

| Age | Escalation Level | Action |
|-----|-----------------|--------|
| **0-2 business days** | Operations analyst | Investigate, attempt resolution |
| **3-5 business days** | Team lead | Review, escalate to counterparty |
| **5-10 business days** | Operations manager | Formal escalation, management reporting |
| **10+ business days** | DP3 / Compliance | Board reporting, regulatory consideration |

### 12.4 Common Break Types (Crypto-Specific)

| Break Type | Resolution |
|------------|------------|
| Unconfirmed blockchain deposit | Tag "expected"; re-check next BD; if open T+3, escalate |
| Failed CEX withdrawal (compliance hold) | Contact exchange; verify funding account status |
| Exchange downtime | Use last price if halt <2 hours; apply fair value adjustment if extended past NAV strike |
| Stale prices | Flag if unchanged >3-5 days; escalate to pricing committee |
| Liquidation position not yet settled | Tag pending; track exchange settlement timeline |
| De minimis break | Auto-close if <$100 or <0.01% of NAV |

### 12.5 Cash Reconciliation (Daily)

- Match book cash vs bank/exchange statements (fiat + stablecoin balances)
- Opening balance must match prior close exactly
- Components: trade settlements, subscription/redemption cash, fee payments, FX settlements
- Breaks resolved same day or escalated per timeline above

---

## 13. Financial Reporting & Audit

### 13.1 Accounting Framework

**Primary:** US GAAP ASC 946 (standard for Cayman hedge funds) or IFRS.

ASC 946 is recommended because:
- Industry standard for Cayman funds
- Familiar to Big 4 auditors
- Schedule of Investments is a primary statement (natural fit for crypto portfolio)
- Statement of Cash Flows not required (simplifies preparation)

### 13.2 Required Financial Statements (ASC 946)

| Statement | Content |
|-----------|---------|
| **Statement of Assets and Liabilities** | Crypto holdings at fair value, cash, receivables, fee accruals, payables |
| **Schedule of Investments** | Primary statement — each crypto holding with cost basis, fair value, and % of NAV |
| **Statement of Operations** | Realized/unrealized gains, trading fees, management/performance/admin fees, other expenses |
| **Statement of Changes in Net Assets** | Subscriptions, redemptions, net investment income, net gains |
| **Financial Highlights** | Per share class: NAV/share, total return, TER, portfolio turnover — 5-year history |
| **Notes** | Accounting policies, fair value hierarchy, risk disclosures, related-party transactions, subsequent events |

### 13.3 Fair Value Hierarchy Disclosure

| Level | Crypto Application | Disclosure |
|-------|-------------------|------------|
| **Level 1** | BTC, ETH, SOL on Binance/OKX with active trading | Quoted prices, no additional disclosure needed |
| **Level 2** | Thinly traded tokens with observable inputs | Disclose valuation technique and inputs |
| **Level 3** | Illiquid tokens, delisted assets, governance tokens | Full roll-forward table, sensitivity analysis, valuation methodology |

### 13.4 Revenue Recognition

- **Unrealized gains/losses:** Daily mark-to-market through Statement of Operations
- **Realized gains/losses:** On disposal (proceeds minus cost basis; FIFO or specific identification)
- **No dividend/interest recognition needed** (crypto-only, spot only, accumulation only)

### 13.5 Annual Audit

| Phase | Timing | Activity |
|-------|--------|----------|
| **Planning** | Q3 (3-4 months before year-end) | Auditor engagement, scope, materiality assessment |
| **Interim** | Q4 | Process walkthroughs, control testing, IT general controls |
| **Final fieldwork** | T+4 to T+10 weeks post year-end | Substantive testing, confirmations, analytical procedures |
| **Sign-off** | Within 6 months of year-end | CIMA filing deadline |

**Key audit standards:** ISA 540 (estimates — fair value of crypto), ISA 505 (custodian/exchange confirmations), ISA 550 (related parties — management fees).

### 13.6 PBC List (Prepared by Client — Admin Responsibility)

Administrator prepares for auditor: trial balance, draft financial statements, schedule of investments, exchange/custodian balance confirmations, trade blotters, fee accrual calculations, shareholder register, pricing source documentation, reconciliation reports, board minutes, compliance reports.

### 13.7 Regulatory Reports

| Report | Frequency | Deadline | Recipient |
|--------|-----------|----------|-----------|
| **Audited financial statements** | Annual | 6 months post year-end | CIMA (with FAR) |
| **Fund Annual Return (FAR)** | Annual | 6 months post year-end | CIMA |
| **CBI ONR returns** | Quarterly/annual | 30 days post period-end | Central Bank of Ireland |
| **Admin entity audited financials** | Annual | CBI deadline | CBI |

### 13.8 Investor Reports

| Report | Frequency | Content |
|--------|-----------|---------|
| **Contract note** | Per dealing | Fund/class name, dealing date, NAV/share, shares, gross/net amount, fees, settlement date, currency, FX rate |
| **Monthly statement** | Monthly | Holdings, transactions, NAV/share, SP performance, fees charged |
| **Quarterly report** | Quarterly | Performance commentary, market outlook, risk metrics |
| **Annual tax statement** | Annual | Taxable income, withholding tax, CRS-reportable amounts, PFIC statement (US investors) |
| **Annual audited report** | Annual | Full financial statements per ASC 946 / IFRS |

---

## 14. Tax Reporting

### 14.1 Fund-Level Tax (Cayman SPC)

**Zero:** No income tax, no capital gains tax, no withholding tax, no VAT, no corporation tax. Funds exempt from Economic Substance Act 2018.

### 14.2 Admin Entity Tax (Irish)

| Obligation | Detail |
|------------|--------|
| **Corporation tax** | 12.5% on admin fee income |
| **VAT** | Exempt for fund administration/transfer agency services (Article 135(1)(g)) |
| **Employer taxes** | PAYE, PRSI, USC on Irish-based staff |
| **Pillar Two** | Unlikely to apply (15% global minimum targets entities with >EUR 750M revenue) |

### 14.3 FATCA (Cayman Model 1B IGA)

| Step | Detail |
|------|--------|
| **Registration** | Fund registers with IRS; obtain GIIN within 30 days of commencing business |
| **Investor classification** | US persons, US-owned entities (>10% substantial US owner), recalcitrant holders |
| **Documentation** | W-8BEN-E (non-US entities) or W-9 (US persons) collected at onboarding |
| **Annual reporting** | Account balances, income amounts, TINs of US persons → Cayman TIA → IRS |
| **Withholding** | 30% on passthru payments to non-compliant FFIs or recalcitrant holders |

### 14.4 CRS (Common Reporting Standard)

| Step | Detail |
|------|--------|
| **Registration** | Cayman TIA Portal by April 30 each year |
| **Self-certification** | Collected from all investors at onboarding (name, address, TIN, jurisdiction, tax classification) |
| **Annual report** | XML filing by July 31 (account holder details, balance, income) to Cayman TIA |
| **CRS Compliance Form** | Due September 15 |
| **CRS 2.0** | Effective January 1, 2026: expanded scope explicitly covers crypto-assets |
| **Jurisdictions** | Auto-exchange with 100+ jurisdictions |

### 14.5 PFIC (US Investors)

*Critical for US tax-paying investors — affects attractiveness of fund to US allocators.*

| Issue | Detail |
|-------|--------|
| **Classification** | Fund is almost certainly a Passive Foreign Investment Company (PFIC) under IRC §1297 |
| **Without QEF election** | Punitive Section 1291 "excess distribution" regime: gains taxed at highest marginal rate + interest charge |
| **With QEF election** | Ordinary income treatment on pro-rata share of fund income (much more favorable) |
| **Admin obligation** | Provide **PFIC Annual Information Statement** to enable QEF election |
| **Deadline** | By March 15 (K-1 equivalent timeline) |

### 14.6 DAC6 (Irish Admin as Intermediary)

| Aspect | Detail |
|--------|--------|
| **Scope** | Cross-border arrangements meeting DAC6 hallmarks |
| **Relevant hallmark** | Category C: cross-border payments to zero-tax jurisdictions (Cayman) |
| **Reporting deadline** | 30 days from arrangement becoming reportable |
| **Reporter** | Irish admin entity as intermediary |

### 14.7 DAC8 (Crypto Reporting)

| Aspect | Detail |
|--------|--------|
| **Effective** | January 2026 |
| **Scope** | Aligns with CRS 2.0; crypto-asset reporting framework |
| **Admin obligation** | Track and report crypto holdings and transactions for tax transparency |

### 14.8 Consolidated Tax Calendar

| Deadline | Filing | Recipient |
|----------|--------|-----------|
| **April 30** | CRS registration/renewal | Cayman TIA Portal |
| **July 31** | CRS annual report (XML) | Cayman TIA Portal |
| **September 15** | CRS Compliance Form | Cayman TIA Portal |
| **March 15** | PFIC Annual Information Statement (US investors) | Direct to US investors |
| **Year-end + 6 months** | Audited financials + FAR | CIMA |
| **Ongoing (within 30 days)** | DAC6 reportable arrangements | Irish Revenue |
| **Per IRS schedule** | FATCA reporting | IRS (via Cayman TIA) |

---

## 15. Performance Measurement

### 15.1 Time-Weighted Return (TWR) — Primary Metric

*TWR eliminates the effect of cash flows (subs/reds), showing pure investment performance.*

```
Sub-period return: R_t = (EMV_t - BMV_t - CF_t) / BMV_t

where:
  EMV_t = End-of-period market value
  BMV_t = Beginning-of-period market value
  CF_t  = Net cash flows during period

Cumulative return = ∏(1 + R_t) - 1 (geometric linking of daily returns)
Annualized return = (1 + Cumulative)^(365.25 / days) - 1
```

**Rule:** Returns for periods <1 year must NOT be annualized (GIPS requirement).

### 15.2 Money-Weighted Return (MWR/IRR) — Investor-Level

*MWR reflects actual investor experience, accounting for subscription timing. Used for individual investor statements.*

### 15.3 GIPS Compliance (Optional but Commercially Valuable)

| Requirement | Detail |
|-------------|--------|
| **Daily valuation** | Required (since Jan 1, 2010) |
| **Gross and net returns** | Both must be presented |
| **History** | Minimum 5-year compliant track record, building to 10 years |
| **Verification** | Independent verification recommended |
| **Composites** | Each SP is its own composite (single-fund composites) |

### 15.4 Risk-Adjusted Metrics

| Metric | Formula | Use |
|--------|---------|-----|
| **Sharpe Ratio** | (Return - Risk-free rate) / Std deviation | Risk-adjusted return |
| **Sortino Ratio** | (Return - Target) / Downside deviation | Downside risk focus |
| **Max Drawdown** | Maximum peak-to-trough decline | Worst-case loss |
| **Calmar Ratio** | Annualized return / Max drawdown | Return per unit of drawdown |

*Standard for crypto hedge fund marketing materials and investor reports.*

### 15.5 Reporting Periods

MTD, QTD, YTD, 1Y, 3Y, 5Y, Since Inception (trailing from month-end, annualized where >1 year).

### 15.6 Benchmarks

Per SP mandate. Must be specified in advance, appropriate, and measurable (SAMURAI criteria). Common crypto benchmarks: BTC index, BTC/ETH blend, custom basket. Benchmark must be disclosed in offering documents.

---

## 16. Internal Controls & SOC 1

### 16.1 SOC 1 Control Objectives (MVP)

| CO | Objective | Testing Approach |
|----|-----------|-----------------|
| CO1 | NAV calculated accurately and timely per fund constitutional documents | Recalculate sample NAVs; verify pricing sources; check accruals |
| CO2 | Subscriptions/redemptions processed per prospectus and dealing procedures | Trace sample orders end-to-end; verify cut-off enforcement |
| CO3 | Security prices sourced from approved independent sources | Verify pricing policy; test price source documentation |
| CO4 | Daily position reconciliation; breaks resolved timely | Review recon reports; test break aging and escalation |
| CO5 | Daily cash reconciliation; breaks resolved timely | Review cash recon; test break resolution |
| CO6 | Management and performance fees calculated per fund documents | Recalculate sample fees; verify HWM tracking |
| CO9 | Investor/shareholder register maintained accurately | Reconcile on-chain token holdings to register; verify transfers |
| CO11 | Financial statements prepared accurately per GAAP | Review draft financials; test note disclosures |
| CO12 | Regulatory filings (CBI, CIMA, CRS/FATCA) submitted on time | Verify filing dates; review filing content |
| CO13 | Logical access restricted to authorized users (RBAC) | Review access provisioning; test segregation of duties |
| CO14 | Change management: changes authorized, tested, and approved | Review change log; verify approval chain |
| CO16 | Data backup and restorability verified | Test restore from backup; verify RPO compliance |
| CO19 | AML/KYC applied to investor onboarding per regulations | Review sample onboarding files; verify sanctions screening |
| CO20 | FX transactions executed at market rates from approved sources | Verify FX rate sources; compare to reference rates |

**Not required for MVP:** CO7 (corporate actions), CO8 (income/dividends), CO10 (distributions), CO15 (batch job scheduling), CO17-18 (physical security — cloud-native platform).

### 16.2 COSO Internal Control Framework

| Component | Implementation |
|-----------|---------------|
| **Control Environment** | Tone at top; SoD (Section 4.5); competence requirements; ethics policy |
| **Risk Assessment** | Annual Risk and Control Self-Assessment (RCSA); key risks: NAV accuracy, settlement failure, regulatory breach, cyber incident |
| **Control Activities** | Four-eye NAV sign-off, automated recon matching, RBAC, independent pricing, maker-checker payments |
| **Information & Communication** | NAV packs to board, exception escalation procedures, SLA dashboards, regulatory filing tracker |
| **Monitoring** | Internal audit (outsourced initially), KRI tracking (Section 16.3), SOC 1 annual examination |

### 16.3 Key Risk Indicators (KRIs)

| KRI | Target | Escalation Trigger |
|-----|--------|-------------------|
| NAV on-time delivery rate | > 99% | < 98% → management review |
| NAV error rate | < 0.1% | > 0.5% per share → board notification + CBI |
| Recon breaks aged > 5 BD | < 5 | > 10 aged breaks → operations review |
| Straight-through processing rate | > 90% | < 85% → process review |
| Settlement failure rate | < 1% | > 2% → counterparty escalation |
| System uptime | > 99.9% | < 99.5% → IT incident review |
| Regulatory filing on-time rate | 100% | Any miss → compliance escalation |

### 16.4 SOC 1 Timeline

| Year | Report Type | Description |
|------|-------------|-------------|
| **Year 1** | Type I | Point-in-time design review — acceptable for launch year |
| **Year 2+** | Type II | 12-month operating effectiveness; dual-branded ISAE 3402 / SSAE 18 |

---

## 17. Business Continuity & Crisis Management

### 17.1 BCP / Disaster Recovery Targets

| Parameter | Target |
|-----------|--------|
| **RPO (transactional data)** | 1 hour |
| **RPO (reporting data)** | 24 hours |
| **RTO (NAV systems)** | 4 hours |
| **RTO (reporting systems)** | 8 hours |
| **Backup frequency** | Real-time DB replication; daily full backup; hourly incremental |
| **Geographic separation** | Secondary cloud region, minimum 50km separation |
| **DR testing** | Annual full test + semi-annual tabletop exercise |
| **BCP review** | Annual (CBI requirement) |

### 17.2 Incident Severity Classification

| Severity | Criteria | Classification SLA | Response SLA | Resolution SLA |
|----------|----------|-------------------|-------------|----------------|
| **Sev 1 (Critical)** | NAV cannot be produced; data loss; regulatory breach | 15 minutes | Immediate | 4 hours |
| **Sev 2 (High)** | NAV delayed > 2 hours; major functionality impaired | 15 minutes | 1 hour | 8 hours |
| **Sev 3 (Medium)** | Process workaround needed; minor functionality impaired | 1 hour | 4 hours | Next business day |
| **Sev 4 (Low)** | Minor; no client impact | Standard queue | Standard queue | 5 business days |

**Post-incident:** Root cause analysis within 5 business days; preventive action within 30 business days.

### 17.3 Crisis Scenarios & Response

#### Exchange Default / Downtime
1. Freeze trading via affected exchange
2. Verify which assets held at defaulted exchange (segregated vs omnibus account)
3. Notify board, investors, CBI
4. Transfer assets to backup exchange/custodian
5. Recalculate NAV excluding disputed/frozen assets
6. Resume when asset recovery complete or written off

#### Market Crash (NAV Cannot Be Reliably Calculated)
1. Board may suspend dealing (CIMA powers)
2. CBI notification "without delay" via ONR system
3. Investor communication same or next business day
4. Board reviews weekly
5. Resume when reliable NAV calculation possible

#### Sanctions Designation (Investor)
1. Immediately freeze account and all associated assets
2. Block all transactions (subscriptions, redemptions, transfers)
3. Report to OFAC (10 business days) and/or EU NCA (without delay)
4. OFAC 50% rule: if USD transactions or US sub-custodian involved, entities 50%+ owned by SDN are also blocked
5. Maintain freeze until OFAC license obtained or designation removed

#### Cyber Incident (DORA Compliance)

| Notification | Deadline |
|-------------|----------|
| **Major incident — initial** | 4 hours |
| **Major incident — intermediate** | 72 hours |
| **Major incident — final** | 1 month |
| **GDPR data breach — DPC** | 72 hours |
| **GDPR data breach — affected persons** | "Without undue delay" |

### 17.4 NAV Suspension

*Board power, not admin discretion.*

**Triggers:** Inability to price assets, exchange closures/defaults, force majeure, regulatory order.
**Process:** Board resolution → CBI notification (without delay) → Investor notification (same/next BD) → Weekly board review → Resume when trigger resolved.
**During suspension:** No dealing; no subs/reds processed; existing orders queued or cancelled per prospectus terms.

---

## 18. Data Protection

### 18.1 GDPR (Irish Admin Entity)

| Principle | Implementation |
|-----------|---------------|
| **No PII on-chain** | Private blockchain; investor addresses are pseudonymous; all PII in off-chain systems |
| **Data minimization** | Collect only what's necessary for AML/KYC and regulatory obligations |
| **Purpose limitation** | Investor data used only for fund administration and regulatory reporting |
| **DPIA** | Required for large-volume financial data processing — document before launch |
| **Right to erasure** | Suspended during AML 5-year retention period; implement after retention expires |
| **Cross-border transfers** | Ireland → Cayman: Standard Contractual Clauses (SCCs) required (no Cayman adequacy decision) |
| **Data breach notification** | DPC within 72 hours; affected persons "without undue delay" |

### 18.2 DORA (Digital Operational Resilience Act)

*Applicable to Irish-authorized financial entities from January 2025.*

| Requirement | Detail |
|-------------|--------|
| **ICT risk management** | Documented framework; board-approved ICT risk appetite |
| **Incident reporting** | Major incidents: 4hr / 72hr / 1mo (see Section 17.3) |
| **Resilience testing** | Annual basic testing; threat-led penetration testing every 3 years (significant entities) |
| **Third-party risk** | ICT third-party register; concentration risk assessment; contractual requirements for cloud providers |
| **Information sharing** | Voluntary participation in threat intelligence sharing |

---

## 19. Platform Requirements

### 19.1 Smart Contract Functions (On-Chain)

| Function | Facet | Description |
|----------|-------|-------------|
| SP creation | FundManagementFacet | Create new segregated portfolio within umbrella |
| Share class creation | FundManagementFacet | Configure class parameters (currency, fees, min investment) |
| NAV posting | NavManagementFacet | Post fund price, adjusted price, class prices, dealing prices |
| Order processing | OrderManagementFacet | Accept subscription/redemption orders with validation |
| Settlement | SettlementFacet | Execute orders: mint/burn ERC1155 tokens, move cash tokens |
| Fee calculation | FeeManagementFacet | Daily accrual, HWM tracking, crystallization |
| FX rate management | FXManagementFacet | Update exchange rates, cross-rate triangulation |
| Role management | AccountFacet | ROLE_ADMIN, ROLE_FX_UPDATER, ROLE_NAV_PUBLISHER, etc. |
| Investor registry | FundTokensFacet (ERC1155) | Token holder mapping = shareholder register |
| Eligibility | EligibilityFacet | KYC, accreditation, jurisdiction, investor type |
| Class adjustments | ClassAdjustmentFacet | Class-specific cost/gain allocations |
| Lifecycle | FundLifecycleFacet | ACTIVE/RETIRED/CLOSED transitions, forced redemptions |
| Views | ViewCallsFacet, AdminViewCallsFacet, ManagerViewCallsFacet | Query functions for investors, admins, managers |

### 19.2 Off-Chain Functions

| Function | System | Description |
|----------|--------|-------------|
| AML/KYC engine | Compliance module | Investor screening, risk scoring, sanctions, PEP, adverse media |
| Pricing engine | Data feeds | CEX API integration, pricing waterfall, stale price detection, fallback logic |
| Reconciliation engine | Operations module | 3-way position/cash reconciliation, break detection, aging |
| Reporting engine | Reporting module | Contract notes, investor statements, regulatory filings, financial statements |
| Mandate monitor | Compliance module | Pre/post-trade compliance checks against SP investment mandates |
| Tax engine | Reporting module | FATCA/CRS classification, annual XML generation, PFIC statements |
| Investor portal | Web app (Next.js) | Subscription forms, account view, document access, performance charts |
| Manager portal | Web app (Next.js) | Portfolio overview, AUM, performance, dealing status |
| Admin dashboard | Web app (Next.js) | NAV production, reconciliation, breaks, compliance alerts |

### 19.3 Deploy Blockers (P0 — Must Fix Before Launch)

*From product/FEATURES.md critical missing features analysis:*

| Feature | Gap | Why P0 |
|---------|-----|--------|
| **Emergency pause/suspend** | No SUSPENDED status, no account freeze, no system pause | CBI expects; board power to suspend dealing; sanctions freeze |
| **NAV correction mechanism** | No `correctNav()` or `restateNav()` | Material errors require NAV restatement; CBI CP130 |
| **Account freeze (OFAC/AML)** | No freeze flag to block operations | Sanctions compliance mandatory |
| **KYC/accreditation expiry** | No `kycExpiresAt` or `accreditationExpiresAt` | Ongoing monitoring requires expiry tracking |
| **FATCA/CRS data fields** | No tax residency array, no classification flags | Tax reporting obligations |

---

## 20. Service Provider Network

| Role | Provider | Notes |
|------|----------|-------|
| **Fund Administrator** | Elysium Fund Services Ltd | NAV, TA, compliance, reporting |
| **Auditor** | Big 4 or mid-tier (Grant Thornton, BDO) | CIMA-approved; annual engagement |
| **Legal Counsel (Cayman)** | Maples, Walkers, Appleby, or Ogier | Fund formation, CIMA filings, ongoing advisory |
| **Legal Counsel (Ireland)** | A&L Goodbody, Matheson, or McCann FitzGerald | CBI licensing, ongoing regulatory compliance |
| **Independent Directors** | Professional director firms | Minimum 2 for SPC board; DRLL registered |
| **Custodian** | Copper, Fireblocks, Coinbase Custody, or CEX custodial | Crypto-native; multi-sig cold storage |
| **Bank** | Banking partner for fiat on/off-ramp | Subscription/redemption settlement in USD/EUR |
| **PMS (Portfolio Management System)** | Haruko | Trade data feed, position data, OMS integration |
| **AML/KYC provider** | ComplyAdvantage, Refinitiv, or similar | Sanctions screening, PEP database, adverse media |
| **Pricing data** | CoinGecko, Messari, or Kaiko | Secondary/composite pricing source |
| **Insurance** | Professional indemnity insurance | CBI expects appropriate PI cover for authorized firms |

**No depositary required** — Cayman AIFs are exempt from mandatory depositary under CIMA rules. Custodian engaged by contract only.

---

## 21. Legal Documents

| Document | Owner | Status at Launch |
|----------|-------|-----------------|
| **SPC Memorandum & Articles of Association** | Legal counsel | Required before CIMA registration |
| **Offering Memorandum (OM)** | Legal counsel | Master OM for the SPC |
| **SP Supplement** | Legal counsel | Per-SP investment terms, fee schedule, dealing rules |
| **Subscription Agreement** | Elysium + Legal | Investor-signed; includes reps, warranties, accreditation |
| **Administration Agreement** | Elysium + Legal | Between SPC and Elysium; SLA, fees, indemnity, termination |
| **Investment Management Agreement (IMA)** | Manager + Legal | Between SP and manager; mandate, delegation, termination |
| **Custodian/Exchange Agreement** | Manager + Elysium | CEX account terms; custody arrangements |
| **Side Letters** | Legal counsel | Manager/investor-specific terms (MFN clause standard) |
| **AML/KYC Policy Manual** | Elysium Compliance | Internal procedures; CBI and CIMA compliant |
| **Business Continuity Plan** | Elysium Operations | Required by CBI; tested annually |
| **Compliance Manual** | Elysium Compliance | CBI CP86 requirements |
| **Pricing Policy** | Elysium Operations | Approved by pricing committee; disclosed in OM |
| **Conflicts of Interest Policy** | Elysium Compliance | Required by CBI |
| **Personal Dealing Policy** | Elysium Compliance | Pre-clearance, restricted list, holding periods |
| **Outsourcing Policy** | Elysium Operations | CBI outsourcing oversight requirements |
| **Investor Communication Templates** | Elysium | Contract notes, statements, regulatory notices |
| **DPIA (Data Protection Impact Assessment)** | Elysium DPO / Legal | Required before processing investor data |

---

## 22. Risk Register

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| **NAV calculation error** | Medium | High | Four-eye review; automated validation; 0.50% materiality threshold; correction procedure |
| **CEX downtime / API failure** | Medium | Medium | Multi-source pricing; fallback hierarchy; stale price escalation; manual override governance |
| **Cyber incident** | Low | Critical | DORA compliance; BCP tested annually; incident response playbook; PI insurance |
| **Manager fraud** | Low | Critical | SoD; independent NAV; 3-way position reconciliation; mandate monitoring |
| **Regulatory change** | Low | Medium | Legal counsel monitoring; quarterly compliance review; DP1 scanning |
| **Key person departure** | Medium | Medium | Deputy roles defined; CBI/CIMA notification within 5 business days; cross-training |
| **CEX counterparty default** | Low | High | Multi-custodian diversification; segregated accounts; limits per CEX; BCP scenario |
| **Sanctions designation (investor)** | Low | High | Real-time screening; immediate freeze; OFAC 10-day reporting; 50% rule applied |
| **Redemption run** | Low | High | Gate mechanism (15% per dealing day); notice period; lock-up; NAV suspension power |
| **Stale/incorrect pricing** | Medium | Medium | Automated staleness monitor; single authoritative FX source; pricing committee |
| **Data breach** | Low | High | GDPR DPIA; encryption at rest and in transit; access controls; DPC 72-hour notification |
| **CBI enforcement action** | Low | Critical | Robust compliance program; proactive CBI engagement; legal counsel on retainer |
| **Smart contract vulnerability** | Low | Critical | Regular security audits; multi-sig admin; emergency pause; upgrade capability (Diamond proxy) |
| **Loss of banking relationship** | Medium | High | Multiple banking relationships; fiat alternatives; regulator pre-engagement |

---

## 23. Explicitly Out of Scope (MVP)

| Excluded | Reason | Post-MVP? |
|----------|--------|-----------|
| Bond accounting / day count conventions | Crypto-only; no fixed income | Yes, if TradFi asset support added |
| Securities lending | Not applicable to crypto CEX trading | No |
| Derivatives & margin (ISDA, EMIR) | Spot trading only | Yes, if futures/options supported |
| Income equalization (traditional) | Series-based minting eliminates this | N/A |
| Distribution/dividend payments | Accumulation only; crypto funds rarely distribute | Yes, for income-distributing classes |
| Corporate actions processing | No equities; no splits/mergers/dividends | Yes, if equity support added |
| UCITS/AIFMD compliance engine | Not a UCITS; not EU-managed AIF | Yes, if EU fund support added |
| SFDR sustainability reporting | Not an EU-domiciled fund | Yes, if EU marketing required |
| PRIIPs KID generation | No retail investors | Yes, if retail distribution |
| Multi-jurisdiction fund admin | Cayman only | Yes, for Luxembourg/Singapore |
| Legacy book migration | New managers only | Yes, for market expansion |
| FX hedging (hedged share classes) | Unhedged only at launch; investors bear FX risk | Yes, high priority post-MVP |
| In-specie subscriptions/redemptions | Cash only | Yes, for institutional transfers |
| Side pockets | Liquid crypto only; no illiquid positions | Yes, if mandates expand |
| Swing pricing automation | Dilution levy manually applied if needed | Yes, automate via on-chain dilution model |
| SWIFT/ISO 20022 messaging | No institutional platform distribution | Yes, for institutional connectivity |
| Omnibus/nominee account processing | Direct registry only | Yes, for platform distribution |
| DeFi protocol interactions | CEX spot trading only | Yes, if mandates allow staking/lending |
| Cross-fund trades | Single umbrella initially | Yes, for multi-umbrella setup |
| Trailer fees / retrocessions | Direct accredited investor access only | Yes, for distribution chain |
| Capital account statements | Not a PE/partnership structure | N/A |
| GIPS verification | Track record too short at launch | Yes, after 5 years |
| SOC 1 Type II | Requires 12-month operating period | Year 2+ |

---

## 24. Timeline & Phasing

### Phase 1: Foundation (Months 1-3)
- Irish CBI application submitted (with 3-year business plan, org chart, IT architecture)
- Cayman SPC established with legal counsel; CIMA registration initiated
- Core smart contracts on testnet; security audit initiated
- CP86 Designated Persons identified and appointed
- Administration agreement and pricing policy templates drafted
- AML/KYC policy manual prepared

### Phase 2: Platform Build (Months 3-6)
- Smart contract audit completed; mainnet deployment
- Off-chain systems: pricing engine, reconciliation, reporting, mandate monitoring
- Investor portal MVP (subscription forms, account view, documents)
- AML/KYC integration (screening provider, risk scoring)
- Tax engine (FATCA/CRS classification, document collection)
- DPIA completed and filed

### Phase 3: Authorization & Setup (Months 4-8)
- CBI authorization received (3-6 month process from complete application)
- CIMA fund registration completed
- SOC 1 Type I engagement initiated
- First SP supplement drafted for launch manager
- Banking relationships established (fiat on/off-ramp)
- Custodian agreements signed
- PI insurance obtained

### Phase 4: Launch (Months 7-10)
- First manager onboarded (8-10 week manager onboarding process)
- Seed investment; first NAV calculated and posted on-chain
- First dealing day; first investor subscription processed
- BCP/DR test completed
- Operational monitoring live: KRIs, reconciliation, compliance alerts
- Pricing committee convened

### Phase 5: Scale (Months 10+)
- Second and third managers onboarded
- Additional share classes (EUR class, potentially hedged classes)
- SOC 1 Type II preparation (12-month observation period begins)
- GIPS track record building
- Feature additions per roadmap: side pockets, swing pricing automation, multi-jurisdiction
- First annual audit cycle (auditor engaged at Month ~9)
- First CRS/FATCA filing cycle

---

## 25. Cross-References

| Topic | Primary Source |
|-------|---------------|
| Fund formation & lifecycle | `domain/FUND_LIFECYCLE.md` |
| CBI authorization details | `domain/IRISH_ADMIN_REQUIREMENTS.md` |
| NAV methodology & pricing chains | `domain/NAV_METHODOLOGY.md`, `domain/FUND_ACCOUNTING.md` |
| Fee structures & equalization | `domain/FEES_AND_EQUALIZATION.md` |
| Share class mechanics & multi-currency | `domain/SHARE_CLASSES.md` |
| Transfer agency / order lifecycle | `domain/TRANSFER_AGENCY.md` |
| Investor onboarding / AML | `domain/INVESTOR_ONBOARDING_AND_SERVICING.md` |
| Compliance & investment mandates | `domain/INVESTMENT_MANDATES.md` |
| Regulatory frameworks (multi-jurisdiction) | `domain/REGULATORY.md` |
| Irish admin requirements (CP86, F&P) | `domain/IRISH_ADMIN_REQUIREMENTS.md` |
| Tax (FATCA, CRS, DAC6, DAC8) | `domain/TAX.md` |
| Governance & depositary | `domain/GOVERNANCE_AND_COMPLIANCE.md` |
| Reconciliation & daily ops | `domain/RECONCILIATION_AND_OPS.md` |
| Internal controls / SOC 1 | `domain/INTERNAL_CONTROLS_AND_SOC.md` |
| Error scenarios / crisis | `domain/ERROR_SCENARIOS_AND_CRISIS.md` |
| Accounting standards (ASC 946, IFRS) | `domain/ACCOUNTING_STANDARDS.md` |
| Financial reporting & audit | `domain/FINANCIAL_REPORTING.md` |
| Performance measurement (TWR, GIPS) | `domain/PERFORMANCE_MEASUREMENT.md` |
| Fund lifecycle (formation to wind-down) | `domain/FUND_LIFECYCLE.md` |
| Competitors & industry landscape | `domain/COMPETITORS.md` |
| Platform features & gaps | `product/FEATURES.md` |
| Entity model & token encoding | `product/ENTITY_MODEL.md` |
| Smart contract architecture | `technical/SMART_CONTRACTS.md` |
| Product overview | `product/OVERVIEW.md` |
