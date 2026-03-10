# Regulatory Frameworks for Investment Funds

<!-- ~11500 tokens -->
**Last Updated:** 2026-02-10

---

> **Cross-references:** `domain/FUND_LIFECYCLE.md` (formation & structuring stages), `product/REGULATORY.md` (Elysium gap analysis), `domain/SHARE_CLASSES.md` (class mechanics relevant to UCITS/AIFMD), `domain/FUND_ACCOUNTING.md` (NAV calculation tied to pricing rules), `domain/DERIVATIVES_AND_MARGIN.md` (EMIR/SFTR margin and collateral details), `domain/SECURITIES_LENDING.md` (SFTR context), `domain/INVESTOR_ONBOARDING_AND_SERVICING.md` (sanctions screening and KYC)

---

## 1. UCITS (Undertakings for Collective Investment in Transferable Securities)

**Directive:** 2009/65/EC (UCITS IV), amended by 2014/91/EU (UCITS V). Omnibus Directive 2024/927 amends both AIFMD and UCITS; must be transposed by April 2026.

### Eligible Assets
- Transferable securities admitted to or dealt on a regulated market
- Money market instruments (commercial paper, certificates of deposit)
- Units of other UCITS or equivalent collective investment schemes (max 10% in unregulated CIS)
- Financial derivative instruments (FDIs) used for hedging or efficient portfolio management
- Cash and cash equivalents (deposits with credit institutions, max 20% with a single body)
- **Prohibited:** Direct real estate, physical commodities, unlisted private equity

### Diversification Rules (the "5/10/40 Rule")
| Limit | Rule |
|-------|------|
| **5%** | Maximum exposure to a single issuer's transferable securities or money market instruments |
| **10%** | Extension allowed for certain issuers |
| **40%** | Aggregate of all positions where single-issuer exposure exceeds 5% must not exceed 40% of NAV |
| **20%** | Maximum exposure to a single credit institution for deposits |
| **35%** | Limit raised for government/public securities (may go to 100% with 6+ issuers, each capped at 30%) |
| **25%** | Maximum in a single covered bond issuer (aggregate of >5% positions capped at 80%) |

### Counterparty & Leverage
- **OTC counterparty exposure:** Max 5% of NAV to a single counterparty (10% if counterparty is an EU credit institution)
- **Global exposure:** Must not exceed 100% of NAV. Measured via commitment approach or VaR approach:
  - **Absolute VaR:** Max 20% of NAV (99% confidence, 20-day holding period)
  - **Relative VaR:** Max 2x the VaR of a reference benchmark
- **Borrowing:** Max 10% of NAV, temporary only (e.g., to cover redemptions or short-term cash flow)

### Liquidity & NAV
- **Daily NAV calculation** is required; fund administrator must compute NAV for subscription/redemption pricing
- **Daily dealing:** Investors must be able to subscribe and redeem on at least every dealing day (typically daily)
- **Liquidity management tools (UCITS V/Omnibus):** Funds must select at least 2 LMTs (redemption gates, extended notice periods, swing pricing, anti-dilution levies, redemptions in kind)

### Depositary Obligations
- **Mandatory appointment** of a depositary in the UCITS home member state
- **Eligible entities:** Credit institutions, national central banks, or entities specifically authorized
- **Duties:** Safekeeping of assets, cash flow monitoring, oversight of compliance with investment restrictions, validation of NAV calculations
- **Strict liability** for loss of financial instruments held in custody (UCITS V)

### KIID / KID
- **KIID (Key Investor Information Document):** Standardized 2-page document replacing the simplified prospectus. Contains: investment objectives, risk/reward profile (SRRI 1-7), charges, past performance, practical information
- **PRIIPs KID:** Under Regulation (EU) 1286/2014, UCITS distributed to retail investors must provide a PRIIPs KID (3 pages max) since January 2023, replacing the KIID for most contexts
- **Required disclosures:** Also a full prospectus, annual report, and semi-annual report

### Risk Management Process
- Management companies must implement a **risk management process** (RMP) approved by the regulator
- Must include: stress testing, scenario analysis, monitoring of risk metrics, back-testing of VaR models
- Periodic reporting to the regulator (e.g., CSSF in Luxembourg requires quarterly UCITS risk reporting)

---

## 2. AIFMD (Alternative Investment Fund Managers Directive)

**Directive:** 2011/61/EU (AIFMD I). AIFMD II (Directive 2024/927) effective 2026; Annex IV reporting changes effective 2027.

### Scope & Registration
- Applies to **all non-UCITS collective investment undertakings** (hedge funds, PE, RE, infrastructure, loan-originating funds)
- AIFMs below thresholds may register (not authorize): EUR 100M AUM (if leveraged) or EUR 500M AUM (if unleveraged with 5-year lock-up)
- Authorized AIFMs receive an EU marketing passport

### Annex IV Reporting (Article 24)

| AUM Threshold | Reporting Frequency |
|---------------|-------------------|
| < EUR 100M (registered) | Annual |
| EUR 100M-500M (unleveraged) | Semi-annual |
| EUR 500M-1B | Semi-annual |
| > EUR 1B | Quarterly |

**Required data fields:** Investment strategies, principal exposures, geographic focus, instrument breakdown, leverage ratios (gross and commitment methods), counterparty concentration, liquidity profile, risk metrics, NAV, Member States of distribution.

**AIFMD II changes (effective 2027):** All markets/instruments/exposures/assets with ISINs and MICs, LEIs required, delegation disclosures (delegate name, domicile, % assets delegated, oversight staff), loan portfolio composition for loan-originating AIFs. Submissions move to EU-standardized XML format via ESMA central database.

### Leverage Limits (AIFMD II)
| Fund Type | Max Leverage (Commitment Basis) |
|-----------|-------------------------------|
| Open-ended loan-originating AIFs | 175% |
| Closed-ended loan-originating AIFs | 300% |
| Other AIFs | No statutory limit, but must set and disclose internal limits; NCAs may impose macro-prudential limits |

### Loan Origination Rules (AIFMD II)
- **20% concentration limit** on lending to other AIFs, UCITS, or financial undertakings
- **5% risk retention** on originated loans transferred to third parties
- Prohibition on lending to the AIFM itself, its delegates, or its depositary
- Ban on "originate-to-distribute" strategies
- Loan-originating AIFs (>50% NAV from origination) must be closed-ended unless liquidity management system permits otherwise

### Liquidity Management Tools
- Open-ended AIFs must select minimum **2 LMTs** from: redemption gates, extended notice periods, redemption fees, swing/dual pricing, anti-dilution levies, redemptions in kind
- Money market funds: only 1 required

### Depositary
- Must appoint a depositary (credit institution or equivalent)
- **No depositary passport** -- depositary must generally be in same Member State as AIF (AIFMD II allows case-by-case exceptions)
- Cannot use third-country depositaries in high-risk AML jurisdictions or non-cooperative tax jurisdictions

### Remuneration
- AIFM must establish a remuneration policy for identified staff (risk-takers, senior management, control functions)
- Variable remuneration: at least 40% deferred over 3-5 years, at least 50% in fund units/shares
- Disclosure in annual report

### Marketing Passport
- Authorized EU AIFMs can market to professional investors across the EU on notification basis
- Third-country AIFMs: National Private Placement Regimes (NPPRs) remain; AIFMD II requires compliant tax jurisdictions for third-country entities

---

## 3. US Investment Company Act of 1940

### Registration & Classification
- Investment companies with >100 investors must register with the SEC
- **Three types:** Open-end (mutual funds), Closed-end, Unit Investment Trusts (UITs)
- **Exemptions:** Section 3(c)(1) -- max 100 beneficial owners; Section 3(c)(7) -- qualified purchasers only (no investor cap)

### Board of Directors
- **75% independent** directors required for funds relying on exemptive rules
- Board must approve: advisory contracts, 12b-1 plans, pricing procedures, compliance policies
- Annual approval of advisory contracts (Section 15(c))

### Pricing Rules

**Rule 22c-1 (Forward Pricing):**
- Redeemable securities must be sold and redeemed at a price based on the NAV computed **after** receipt of the order
- Prevents late trading and stale-price arbitrage
- "Hard close" at 4:00 PM ET for US mutual funds; orders received after the cut-off receive next-day NAV
- Fair value pricing required when market prices are stale or unreliable (e.g., foreign securities after local market close)

**Rule 2a-7 (Money Market Funds):**
- Government and retail money market funds may use amortized cost method to maintain $1.00 stable NAV
- Institutional prime/tax-exempt MMFs must use floating NAV (penny-rounding to 4 decimal places)
- Portfolio maturity: weighted average maturity (WAM) max 60 days, weighted average life (WAL) max 120 days
- Minimum 10% daily liquid assets, 30% weekly liquid assets
- Board must determine stable NAV is in best interest; must "break the buck" if deviation is significant

### NAV Error Materiality
- **SEC standard:** $0.01 per share on a $10.00 NAV (0.5 cent per share, or ~0.5% of NAV)
- Errors exceeding this threshold require: recalculation, investor notification, and reimbursement of affected shareholders
- Fund administrator must maintain NAV error policies and procedures

### Leverage (Section 18)
- Open-end funds: borrowing permitted only from banks; 300% asset coverage required (i.e., max 33% leverage)
- Closed-end funds: 300% asset coverage for debt, 200% for preferred stock
- **Rule 18f-4 (Derivatives):** VaR-based limits for derivative users; limited derivatives users exempted if notional exposure <10% of net assets

### Reporting
- **Form N-PORT:** Monthly portfolio holdings (filed within 60 days; public quarterly)
- **Form N-CEN:** Annual census report (fund characteristics, service providers)
- **Tailored Shareholder Reports:** Simplified annual/semi-annual reports for open-end funds

---

## 4. Cayman Islands Fund Regulation

### Mutual Funds Law (Open-Ended Funds)

| Category | Requirements | Minimum Investment |
|----------|-------------|-------------------|
| **Registered Fund** | Streamlined CIMA registration | CI$80,000 (US$100,000) or listed on approved exchange |
| **Administered Fund** | Must use CIMA-licensed administrator as principal office | No minimum (>15 investors, not licensed or registered) |
| **Licensed Fund** | Full CIMA licence; suitable for retail funds with reputable promoter | No minimum |
| **Limited Investor Fund** | Max 15 investors who can appoint/remove operator | No minimum (now required to register under 2020 amendments) |

### Private Funds Act 2020 (Closed-Ended Funds)
- Effective 7 February 2020; applies to all closed-ended Cayman funds
- Must register with CIMA
- **Exemption from beneficial ownership register** -- but must provide written confirmation to corporate services provider with prescribed information

### Audit Requirements
- **Annual audited financial statements** required, submitted to CIMA within 6 months of financial year-end
- Auditor must be approved by CIMA
- Acceptable frameworks: IFRS, US GAAP, Japan GAAP, Swiss GAAP, or other non-high-risk jurisdiction GAAP
- **Fund Annual Return (FAR):** Must be filed annually with CIMA, including general, operating, and financial information

### Valuation & Operational
- NAV calculation method must be disclosed in offering documents
- Cash monitoring and safekeeping of assets obligations
- Identification of all investors (KYC/AML per Cayman AML regulations)

---

## 5. MiFID II (Markets in Financial Instruments Directive II)

**Directive:** 2014/65/EU, effective January 2018. Impacts fund **distribution**, not fund management directly.

### Product Governance
- **Manufacturers** (fund managers/issuers) must: define target market at sufficiently granular level, assess all risks, design distribution strategy consistent with target market, review periodically
- **Distributors** must: understand the product approval process and target market, assess product compatibility with their clients, offer/recommend only products in the client's interest
- **Five target market criteria:** Client type, knowledge/experience, financial situation, risk tolerance, objectives/needs

### Suitability & Appropriateness
- **Advisory/discretionary services:** Full suitability assessment required (objectives, financial situation, knowledge/experience)
- **Execution-only:** Appropriateness test for complex instruments; exempt for non-complex instruments
- Must be documented and provided to the client

### Inducements
- **Independent advisers:** Must not accept or retain any third-party inducements (commissions, rebates)
- **Non-independent advisers:** May receive inducements only if they enhance service quality and are disclosed
- **Research:** Must be paid for separately (unbundled) or from research payment account

### Cost Transparency
- Ex-ante and ex-post disclosure of all costs and charges (product costs, service costs, third-party payments)
- Must show cumulative effect on return
- **EMT (European MiFID Template):** Standardized data exchange format for fund cost/target market data between manufacturers and distributors

---

## 6. AML/CFT Directives (EU Anti-Money Laundering)

### Evolution of EU AMLDs

| Directive | Year | Key Additions |
|-----------|------|---------------|
| **1st AMLD** | 1991 | CDD/KYC requirements on banks; SAR obligation; 5-year record retention |
| **2nd AMLD** | 2001 | Extended scope to lawyers, accountants, real estate agents, casinos |
| **3rd AMLD** | 2005 | Risk-based approach introduced; PEP screening requirement |
| **4th AMLD** | 2017 | Centralized UBO registers; UBO defined as 25%+ ownership or control; gambling services included |
| **5th AMLD** | 2020 | Public UBO registers; interconnected across EU; crypto exchanges as obliged entities; prepaid card limits (EUR 150 / EUR 50 online); mandatory EDD for high-risk countries |
| **6th AMLD** | 2021 | 22 predicate offences harmonized (including cybercrime, environmental crime); criminal liability for legal persons; minimum 4-year imprisonment; aiding/abetting explicitly covered |

### Core Obligations for Fund Administrators

**Customer Due Diligence (CDD):**
- Identify and verify the identity of the customer and beneficial owner(s) before or during establishment of business relationship
- Understand the nature and purpose of the relationship
- Ongoing monitoring of transactions and updating of documents

**Enhanced Due Diligence (EDD) -- triggered by:**
- High-risk third countries (EU list)
- Politically Exposed Persons (PEPs)
- Complex or unusual transaction patterns
- Correspondent banking relationships
- High-value transactions above thresholds

**Ultimate Beneficial Owner (UBO):**
- 25% ownership threshold (direct or indirect) triggers UBO identification
- If no natural person meets the threshold, senior managing official is the UBO
- Must be recorded in member-state UBO registers

**Suspicious Transaction Reporting (STR):**
- Obliged entities must report to their Financial Intelligence Unit (FIU) without delay
- No tipping-off: must not disclose to the customer that a report has been or will be filed
- Record retention: minimum 5 years after the end of the business relationship

### EU AML Authority (AMLA)
- New EU authority established in 2024, headquartered in Frankfurt
- Direct supervision of highest-risk obliged entities from 2028
- Single EU rulebook replacing directive-based approach

---

## 7. GDPR (General Data Protection Regulation)

**Regulation:** (EU) 2016/679, effective May 2018. Directly applicable in all EU member states.

### Lawful Bases for Processing Investor Data (Article 6)
| Basis | Fund Administration Use |
|-------|----------------------|
| **Legal obligation** (Art. 6(1)(c)) | AML/KYC checks, tax reporting (CRS/FATCA), regulatory filings |
| **Contractual necessity** (Art. 6(1)(b)) | Processing subscriptions, redemptions, NAV notifications |
| **Legitimate interest** (Art. 6(1)(f)) | Investor communications, analytics (subject to balancing test) |
| **Consent** (Art. 6(1)(a)) | Marketing communications (must be freely given, specific, informed) |

### Key Principles for Fund Administration
- **Data minimization:** Collect only what is necessary for the stated purpose
- **Purpose limitation:** Investor data collected for AML cannot be repurposed for marketing without separate basis
- **Storage limitation:** Delete when no longer needed -- but AML mandates override for 5+ years
- **No PII on-chain:** Critical for blockchain-based platforms; on-chain identifiers must be pseudonymous

### Data Subject Rights
- **Right to access** (Art. 15): Investors can request copies of their data
- **Right to rectification** (Art. 16): Correct inaccurate data
- **Right to erasure** (Art. 17): Except when processing is required by law (Art. 17(3)(b)) -- AML retention takes precedence
- **Right to portability** (Art. 20): Provide data in machine-readable format

### Cross-Border Transfers
- Permitted to countries with **EU adequacy decisions** (e.g., UK, Japan, South Korea, US under EU-US Data Privacy Framework)
- Without adequacy: **Standard Contractual Clauses (SCCs)** or **Binding Corporate Rules (BCRs)**
- Transfer Impact Assessment (TIA) required for non-adequate jurisdictions
- **DPIA (Data Protection Impact Assessment):** Required when processing is likely to result in high risk to individuals -- fund administration with large volumes of financial data typically qualifies

### GDPR vs. AML Conflict Resolution
- During mandatory AML retention periods (5+ years), processing is lawful under Art. 6(1)(c)
- Right to erasure is suspended per Art. 17(3)(b) for legal obligation compliance
- Once AML retention expires and no other legal obligation exists, full data subject rights are enforceable
- Best practice: implement retention schedules that auto-flag data for review at expiry

---

## 8. SFDR & EU Taxonomy (Sustainable Finance Disclosure)

**SFDR:** Regulation (EU) 2019/2088, effective March 2021 (Level 1), June 2023 (Level 2 RTS).
**EU Taxonomy:** Regulation (EU) 2020/852.

### Fund Classification

| Classification | Criteria | Disclosure Level |
|---------------|---------|-----------------|
| **Article 6** | No sustainability promotion or objective; integrates sustainability risks only | Pre-contractual: describe how sustainability risks are integrated; assess impact on returns. If risks deemed irrelevant, explain why |
| **Article 8** ("Light Green") | Promotes environmental and/or social characteristics but does not have sustainable investment as its objective | Pre-contractual: binding criteria, investment strategy, asset allocation (ESG vs. non-ESG), reference benchmark. Periodic: annual report on characteristics met. Website: methodology, data sources |
| **Article 9** ("Dark Green") | Has sustainable investment as its objective | Pre-contractual: sustainable investment objective, DNSH assessment, Paris-aligned benchmark (if Art. 9(3)). Periodic: degree of objective achievement, leading investments. Website: monitoring methodology, due diligence, engagement policies |

### Key Obligations
- **Principal Adverse Impact (PAI) indicators:** Large firms (>500 employees) must report at entity level; Article 8/9 funds must report at product level (14 mandatory indicators + opt-in indicators)
- **Do No Significant Harm (DNSH):** Article 9 funds must demonstrate investments do not significantly harm any environmental or social objective
- **Minimum safeguards:** Alignment with OECD Guidelines, UN Guiding Principles on Business and Human Rights
- **EU Taxonomy alignment:** Article 8/9 products must disclose minimum percentage of Taxonomy-aligned investments

### Naming Rules (Effective May 2025)
- Funds with sustainability-related names must meet an 80% minimum threshold for sustainable investments
- ESMA guidelines tie fund naming to SFDR classification

### Proposed SFDR Revision (2025-2026)
- Commission proposes replacing Article 6/8/9 with a labelling regime:
  - **"Sustainable"** (new Article 9)
  - **"Transition"** (new Article 7)
  - **"ESG Basics"** (new Article 8)
- Harmonized qualifying criteria for each label

---

## 9. FATCA & CRS (Tax Reporting)

Not a primary focus but critical for fund administration:

- **FATCA (US):** Foreign financial institutions must identify and report US account holders to the IRS or face 30% withholding on US-source payments
- **CRS (OECD):** Automatic exchange of financial account information between 100+ jurisdictions; annual reporting of account balance, income, and identity details
- **EU DAC8:** Digital asset reporting requirements effective January 2026; crypto-asset service providers must report transactions

---

## 10. EMIR (European Market Infrastructure Regulation)

**Regulation:** (EU) No 648/2012, effective August 2012. EMIR Refit (EU) 2019/834 effective June 2019. EMIR 3.0 (Regulation (EU) 2024/2987) entered into force December 2024.

> **Cross-reference:** `domain/DERIVATIVES_AND_MARGIN.md` for detailed margin mechanics and collateral management under EMIR.

### Counterparty Categories & Clearing Obligation

| Category | Definition | Clearing Obligation | Margin for Uncleared |
|----------|-----------|--------------------|--------------------|
| **FC+** | Financial counterparty above clearing threshold | Yes | IM + VM |
| **FC-** | Small financial counterparty below threshold | No | VM only (IM exempted below EUR 8bn AANA) |
| **NFC+** | Non-financial counterparty above threshold | Yes | IM + VM |
| **NFC-** | Non-financial counterparty below threshold | No | VM only |

Clearing thresholds by asset class: EUR 1bn (credit/equity), EUR 3bn (rates/FX/commodities). Calculated on 30-day rolling average of gross notional, excluding hedging positions.

### Trade Reporting

- **Who reports:** Both counterparties to a derivative contract (FC may delegate to CCP or trade repository)
- **To whom:** EU-registered Trade Repository (DTCC, Regis-TR, UnaVista, KDPW)
- **LEI requirement:** All reporting entities must hold a valid Legal Entity Identifier (LEI)
- **Timeline:** T+1 reporting deadline for new trades, modifications, and terminations

### Risk Mitigation for Uncleared OTC Derivatives

- **Timely confirmation:** Electronic confirmation required by T+1 (FC-to-FC) or T+2 (with NFC)
- **Portfolio reconciliation:** Daily (500+ trades), weekly (51-499), quarterly (50 or fewer)
- **Portfolio compression:** Periodic assessment of compression opportunities for portfolios of 500+ trades
- **Dispute resolution:** Written procedures for identification, recording, and monitoring of disputes; report unresolved disputes outstanding >15 business days to competent authority

### EMIR Refit (April 2024)

- **Delegated reporting:** FCs must report on behalf of NFC- counterparties (NFC- relieved of reporting burden)
- **Unique Transaction Identifier (UTI):** ISO 23897 format; generation waterfall determines responsible party
- **Unique Product Identifier (UPI):** Assigned by Derivatives Service Bureau (DSB) for OTC derivatives; ISINs for exchange-traded
- **ISO 20022 XML format:** Mandatory for all trade repository submissions; non-compliant files rejected
- **Expanded fields:** 129 to 203 reportable fields
- **Simplified NFC- reporting:** Reduced field set; delegated reporting by FC counterparty

---

## 11. SFTR (Securities Financing Transactions Regulation)

**Regulation:** (EU) 2015/2365, effective January 2016. Reporting obligations phased in April 2020 (banks/investment firms) through January 2021 (NFCs).

> **Cross-references:** `domain/DERIVATIVES_AND_MARGIN.md` (margin lending), `domain/SECURITIES_LENDING.md` (securities lending and repo context)

### Scope

| Transaction Type | Description |
|-----------------|-------------|
| **Repurchase agreements (repos)** | Sale and repurchase of securities |
| **Securities lending/borrowing** | Temporary transfer against collateral |
| **Buy-sell backs** | Spot sale + forward repurchase without master agreement |
| **Margin lending** | Credit extended for securities trading (prime brokerage) |

### Reporting Obligations (Article 4)

- **Daily reporting** to EU-registered trade repositories (same TRs as EMIR, separately authorized for SFTR)
- **155 data fields** covering: UTI, counterparty data (LEI, sector, country), loan data (type, value, maturity, rate), collateral data (type, value, haircut, re-use flag)
- **Dual-sided reporting:** Both counterparties must report; reconciliation by TRs
- **Backloading:** SFTs outstanding on reporting start date and still open 180 days later must be reported
- **Intragroup exemption:** Available where both entities are in the same EU Member State and fully consolidated

### Fund Disclosure (Articles 13 & 14)

- **UCITS/AIF annual reports** must disclose: global data on SFTs and total return swaps (amount, type, maturity tenor), concentration data (top 10 counterparties, top 10 collateral issuers), aggregate transaction data, collateral reuse and safekeeping
- **Prospectus:** Must describe permitted use of SFTs and total return swaps, including maximum and expected proportions of NAV

---

## 12. Cross-Border Distribution Framework (CBDF)

**Directive:** 2019/1160 and **Regulation:** 2019/1156, effective 2 August 2021. Amends AIFMD and UCITS Directive to harmonize cross-border fund distribution.

### Pre-Marketing Regime (AIFs only)

- EU AIFMs may engage in **pre-marketing** to professional investors: testing investment ideas or strategies before formal notification
- **Notification to home NCA:** Written notification required within 2 weeks of commencing pre-marketing, including description of the investment strategy and Member States targeted
- **Record-keeping:** 18 months of records (informal documents, correspondence, meeting notes)
- **Subscription lock:** Any subscription within 18 months of pre-marketing is deemed marketing; full passport notification required
- **Does not apply to:** UCITS, registered/sub-threshold AIFMs, non-EU AIFMs

### De-Notification of Marketing Arrangements

- AIFMs/UCITS ManCos may **withdraw marketing notifications** in a Member State
- **30-day blanket offer** to redeem: Must offer existing investors in that Member State at least 30 business days' notice with no fees or deductions
- **Cease marketing activity:** Stop all new subscriptions, advertising, and promotional communications
- **36-month cooling-off:** After de-notification, no pre-marketing of the same (or similar strategy) AIF in that Member State for 36 months

### ESMA Central Database

- Publicly accessible database of all UCITS and AIFs marketed cross-border, including Member States of distribution
- NCAs provide quarterly updates to ESMA
- Accessible at [ESMA Register](https://registers.esma.europa.eu/)

---

## 13. ELTIF 2.0 (European Long-Term Investment Funds)

**Regulation:** (EU) 2023/606, amending (EU) 2015/760. Effective 10 January 2024. RTS published October 2024.

### Expanded Retail Access

- **Removed EUR 10,000 minimum** investment threshold
- **Removed 10% aggregate wealth test** for retail investors with <EUR 500,000 financial portfolio
- **Suitability assessment** still required under MiFID II for retail distribution
- **ELTIF marketing passport** across EU for both professional and retail investors

### Portfolio Composition

| Rule | Requirement |
|------|------------|
| **Eligible investment assets** | Min 55% of NAV (down from 70% under ELTIF 1.0) |
| **Diversification** | Max 20% NAV in single qualifying portfolio undertaking; max 20% in single real asset |
| **Listed company threshold** | Market cap raised from EUR 500M to EUR 1.5B |
| **Fund-of-fund** | May invest in other ELTIFs, EuVECAs, EuSEFs, UCITS, and EU AIFs |
| **Cash/liquid assets** | Remaining NAV (no explicit cap for open-ended ELTIFs) |
| **Borrowing** | Max 50% NAV for retail ELTIFs; max 100% for professional-only |

### Liquidity Management

- **Open-ended ELTIFs** now permitted (ELTIF 1.0 required closed-ended only)
- **Matching mechanism:** Manager may match redemption requests with new subscriptions before liquidating assets
- **Maximum redemption frequency:** Quarterly for retail ELTIFs (higher frequency permissible with NCA justification)
- **Notice period:** Minimum 12 months for redemptions unless sufficient liquid assets demonstrated
- **LMTs required:** Anti-dilution levies, swing pricing, or redemption fees
- **Minimum holding period option:** 12 months from initial subscription

---

## 14. PRIIPs KID (Key Information Document)

**Regulation:** (EU) No 1286/2014 (PRIIPs), effective January 2018. UCITS transition from KIID to PRIIPs KID effective 1 January 2023. Delegated Regulation (EU) 2017/653 (RTS).

### Required Content (max 3 pages)

- Purpose, risk, and reward of the product
- Summary Risk Indicator (SRI) rated 1-7
- Performance scenarios (4 scenarios at recommended holding period)
- Cost breakdown (one-off, ongoing, incidental) and Reduction in Yield (RIY)
- Recommended holding period and early exit penalties
- Complaints procedure and competent authority

### Summary Risk Indicator (SRI) Calculation

| Component | Scale | Methodology |
|-----------|-------|-------------|
| **Market Risk Measure (MRM)** | 1-7 | Based on annualized VaR at 97.5% confidence over recommended holding period; Cornish-Fisher expansion adjusting for skewness and kurtosis |
| **Credit Risk Measure (CRM)** | 1-6 | Derived from external credit ratings (ECAI), mapped to Credit Quality Steps, adjusted for maturity |
| **SRI** | 1-7 | Matrix combination of MRM class and CRM class |

Products with capital protection or guarantees may receive lower SRI than their underlying volatility suggests.

### Performance Scenario Methodology

| Scenario | Methodology |
|----------|-------------|
| **Favourable** | 90th percentile of simulated returns |
| **Moderate** | 50th percentile (median) of simulated returns |
| **Unfavourable** | 10th percentile of simulated returns |
| **Stress** | Extreme tail scenario based on historical worst-case |

Scenarios shown in monetary terms (EUR invested) at 1 year and at the recommended holding period.

### Cost Methodology

- **Reduction in Yield (RIY):** Single figure expressing the annual impact of all costs on investor returns, expressed as a percentage
- **Total costs:** Aggregation of one-off entry/exit costs, ongoing costs (management fees, transaction costs, performance fees), and incidental costs
- **Transaction cost calculation:** Based on arrival-price methodology using 3-year average historical data
- **Presentation:** Summary cost table showing total costs in EUR and annualized RIY impact at 1 year and recommended holding period

---

## 15. Sanctions Compliance

> **Cross-reference:** `domain/INVESTOR_ONBOARDING_AND_SERVICING.md` for investor screening workflows and KYC integration.

### Applicable Sanctions Regimes

| Regime | Authority | Key Lists |
|--------|-----------|-----------|
| **US (OFAC)** | Office of Foreign Assets Control, US Treasury | SDN List, Sectoral Sanctions (SSI), Non-SDN Lists (CAPTA, NS-MBS) |
| **EU** | Council of the European Union | EU Consolidated Financial Sanctions List |
| **UN** | UN Security Council Sanctions Committees | UN Consolidated List |
| **UK (OFSI)** | Office of Financial Sanctions Implementation, HM Treasury | UK Sanctions List (consolidated) |
| **Cayman Islands** | Financial Reporting Authority (FRA) | Directions under Proliferation Financing (Prohibition) Act 2017 |

### Program Types

- **Comprehensive sanctions:** Near-total embargo on transactions with a country (e.g., OFAC programs for North Korea, Iran, Syria, Cuba)
- **Sectoral sanctions:** Restrictions limited to specific economic sectors (e.g., Russian energy, defence, financial services)
- **List-based (targeted):** Restrictions on designated persons, entities, and vessels

### Screening Obligations for Fund Administrators

- **Investors:** Screen at onboarding and on ongoing basis (subscription, redemption, transfer requests) against all applicable lists
- **Portfolio companies/issuers:** Screen investee companies and sovereign issuers before and during investment
- **Counterparties:** Screen brokers, custodians, banks, and trading counterparties
- **Intermediaries:** Screen distributors, nominees, and correspondent banks
- **Frequency:** At onboarding, upon list updates, and periodically (at minimum quarterly batch re-screening)

### Blocking vs. Rejection

- **SDN match (OFAC):** Must **block** (freeze) the property; file a blocking report with OFAC within 10 business days; no debits or credits permitted
- **EU/UK designated person:** Must **freeze** all funds and economic resources; report to NCA/OFSI without delay
- **Rejected transaction:** Where a transaction is prohibited but no property is held, the transaction is rejected and reported

### Cayman Islands Sanctions Regime

- **Proliferation Financing (Prohibition) Act 2017:** Offence to provide funds or economic resources for unauthorized proliferation activities
- **FRA Directions:** Financial Reporting Authority may issue directions requiring enhanced CDD, ongoing monitoring, systematic reporting, or cessation of business
- **Penalties:** Up to USD 60,975 (summary) or USD 84,087 / 3 years imprisonment (indictment) for failing to freeze

### Wind-Down Licenses & Exemptions

- **OFAC general licenses:** Time-limited authorizations to wind down transactions with newly designated persons (typically 30-90 days)
- **EU derogations:** Member State NCA may authorize release of frozen funds for basic needs, legal fees, or pre-existing contracts
- **Humanitarian exemptions:** Carve-outs for humanitarian aid, food, medicine in comprehensively sanctioned jurisdictions

### Impact on Fund Administration

- **Frozen assets in NAV:** Sanctioned holdings must be fair-valued (typically at deep discount or zero) and segregated; cannot be traded or redeemed
- **Impaired valuation:** Sanctions may render securities illiquid; side-pocket or suspension mechanisms may be required
- **Investor eligibility:** Sanctioned investors cannot subscribe, redeem, receive distributions, or exercise voting rights
- **Regulatory reporting:** Blocking/freezing reports to OFAC, OFSI, NCA; suspicious transaction reports to FIU
- **Record retention:** Minimum 5 years from date of transaction or end of blocking/freezing

---

## Elysium Platform Relevance

The regulatory frameworks above drive specific on-chain and off-chain feature requirements for Elysium. See `product/REGULATORY.md` for the detailed gap analysis mapping each regulation to current implementation status. Key architectural decisions influenced by regulation:

- **No PII on-chain** -- GDPR compliance by design
- **Fund isolation at protocol level** -- maps to UCITS umbrella segregation and Cayman SPC legal segregation
- **Immutable audit trail** -- satisfies record-keeping requirements across AML, UCITS, and ICA 1940
- **Private blockchain** -- controlled access addresses MiFID II data protection and GDPR transfer concerns
- **Daily NAV as first-class operation** -- required by UCITS, ICA 1940 Rule 22c-1, and most fund constitutions

---

## Sources

- [BNP Paribas: UCITS Directive Regulation Memo](https://securities.cib.bnpparibas/ucits-directive-eu-regulation/)
- [LegalClarity: What Is a UCITS Fund?](https://legalclarity.org/what-is-a-ucits-fund-structure-and-rules-explained/)
- [FasterCapital: UCITS Directive Comprehensive Guide](https://fastercapital.com/content/UCITS-Directive--A-Comprehensive-Guide-to-European-Investment-Laws.html)
- [SSC Tech: Preparing for AIFMD 2.0 Annex IV Reporting](https://www.ssctech.com/blog/preparing-for-aifmd-2-0-and-the-impact-on-annex-iv-reporting)
- [Matterhorn RS: Definitive Guide to AIFMD Annex IV](https://www.matterhorn-rs.com/definitive-guide-to-aifmd-annex-iv)
- [Travers Smith: AIFMD II -- The Next Phase](https://www.traverssmith.com/knowledge/knowledge-container/aifmd-ii-the-next-phase-of-eu-alternative-investment-fund-regulation/)
- [SEC: Amendments to Rules Governing Pricing of Mutual Fund Shares](https://www.sec.gov/rules-regulations/2003/12/amendments-rules-governing-pricing-mutual-fund-shares)
- [Toppan Merrill: Securities Act of 1940 Summary](https://www.toppanmerrill.com/blog/securities-act-of-1940-rules-and-requirements-summary/)
- [Conyers: Cayman Islands Mutual Funds](https://www.conyers.com/wp-content/uploads/2023/09/Mutual_Funds-CAY.pdf)
- [EY: Cayman Private Funds Law 2020](https://www.ey.com/en_us/bbc/cayman-private-funds-law-2020)
- [PwC: Cayman Private Funds Compliance](https://www.pwc.com/ky/en/publications/assets/cayman-law-update-compliance-requirements-for-the-pfl.pdf)
- [CIMA: Investment Funds Reporting](https://www.cima.ky/investment-funds-reporting-requirements-and-schedule-e-reporting)
- [PwC Luxembourg: MiFID II Technical Summary](https://www.pwc.lu/en/mifid/technical-summary-mifid.html)
- [ESMA: MiFID II Product Governance Guidelines](https://www.esma.europa.eu/sites/default/files/2023-03/ESMA35-43-3448_Final_report_on_MiFID_II_guidelines_on_product_governance.pdf)
- [ComplyAdvantage: EU Anti-Money Laundering Directives](https://complyadvantage.com/insights/eu-anti-money-laundering-directive/)
- [iDenfy: EU AMLDs Complete History](https://www.idenfy.com/blog/eu-anti-money-laundering-directives-amlds/)
- [LSEG: EU AML Directives](https://www.lseg.com/en/risk-intelligence/financial-crime-risk-management/eu-anti-money-laundering-directive)
- [GDPR Local: GDPR vs AML Compliance Challenges](https://gdprlocal.com/gdpr-vs-aml/)
- [IAPP: Cross-Border Data Transfers in Fintech](https://iapp.org/news/a/cross-border-data-transfers-in-fintech-navigating-post-gdpr-regulations)
- [EDPB: International Data Transfers](https://www.edpb.europa.eu/sme-data-protection-guide/international-data-transfers_en)
- [Worldfavor: SFDR Article 6, 8, 9](https://blog.worldfavor.com/sfdr-what-is-article-6-8-9)
- [Apiday: SFDR Articles Explained](https://www.apiday.com/blog-posts/sfdr-articles-6-8-and-9-what-you-need-to-know)
- [Morningstar: SFDR Article 8 and 9 Funds](https://www.morningstar.com/business/insights/blog/esg/sfdr-article-8-funds)
- [Global Financial Regulatory Blog: SFDR Revision Proposal](https://www.globalfinregblog.com/2025/11/european-commission-proposes-to-revise-the-sfdr-pivoting-towards-a-labelling-regime/)
- [Sidley Austin: EMIR Refit Changes to Reporting Regime](https://www.sidley.com/en/insights/newsupdates/2024/02/2024-european-market-infrastructure-regulation-refit)
- [ESMA: Clearing Obligation and Risk Mitigation under EMIR](https://www.esma.europa.eu/post-trading/clearing-obligation-and-risk-mitigation-techniques-under-emir)
- [Kaizen: 5 Key Changes for EMIR Refit 2024](https://www.kaizenreporting.com/5-key-changes-for-esma-emir-refit-2024/)
- [Nasdaq: EMIR Refit ISO 20022 UPI Reporting](https://adenza.com/insights/april-2024-emir-refit-mandates-iso-20022/)
- [ESMA: SFTR Reporting](https://www.esma.europa.eu/data-reporting/sftr-reporting)
- [ICMA: SFT Regulation Reporting Recommendations](https://www.icmagroup.org/market-practice-and-regulatory-policy/repo-and-collateral-markets/regulation/regulatory-reporting-of-sfts/)
- [Maples: EU Cross-Border Fund Distribution Rules](https://maples.com/en/knowledge-centre/2021/6/eu-cross-border-fund-distribution-rules-are-you-ready)
- [Arthur Cox: Cross-Border Distribution Framework](https://www.arthurcox.com/knowledge/are-you-ready-for-the-eus-new-cross-border-distribution-framework/)
- [BNP Paribas: ELTIF 2.0 Regulation](https://securities.cib.bnpparibas/eltif-2-0-regulation/)
- [Norton Rose Fulbright: The 2023 ELTIF Regulation](https://www.nortonrosefulbright.com/en/knowledge/publications/d6656466/the-2023-eltif-regulation)
- [ALFI: ELTIF 2.0 Guide (December 2024)](https://www.alfi.lu/getattachment/45d430ba-aa78-454b-b182-2f0c64ec0e80/app_data-import-alfi-eltif-2-0-the-european-long-term-investment-fund-eltif-.pdf)
- [Deloitte: SRRI and SRI Calculation under PRIIPs and UCITS](https://www2.deloitte.com/lu/en/pages/investment-management/articles/srri-sri-calculation-under-priips-ucits.html)
- [AN Valuations: PRIIPs KID Calculations Framework](https://www.anvaluations.com/priips-kid-calculations-a-general-framework/)
- [FCA Handbook: PRIIPs Risk Methodology (Annex II)](https://www.handbook.fca.org.uk/techstandards/PRIIPs/2017/reg_del_2017_653_oj/annex02.html)
- [National Law Review: OFAC Compliance 2024-2025](https://natlawreview.com/article/ofac-compliance-legal-framework-enforcement-risks-and-2024-2025-enforcement)
- [OFSI Annual Review 2024-2025](https://www.gov.uk/government/publications/ofsi-annual-review-2024-25-effective-sanctions/ofsi-annual-review-2024-25-effective-sanctions)
- [CIMA: Sanctions Overview (Cayman Islands)](https://www.cima.ky/sanctions-overview)
- [Eversheds: Cayman Islands Global Sanctions Guide](https://ezine.eversheds-sutherland.com/global-sanctions-guide/cayman-islands)
