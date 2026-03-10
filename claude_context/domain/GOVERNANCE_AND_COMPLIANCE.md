# Governance, Oversight & Compliance

<!-- ~6800 tokens -->
**Last Updated:** 2026-02-10

---

## 1. Fund Board (Governing Body)

### Composition and Responsibilities

The fund board (or governing body) is the ultimate decision-making authority for a regulated fund. In corporate structures it is the board of directors; in partnerships, the general partner; in unit trusts, the trustee; in LLCs, the manager. Core duties include:

- Setting investment objectives and strategy constraints
- Appointing and overseeing service providers (administrator, depositary, auditor, investment manager)
- Approving prospectus/supplement amendments
- Monitoring risk, compliance, and conflicts of interest
- Approving NAV calculations and pricing overrides
- Declaring dividends/distributions

### Director Duties (Fiduciary)

All directors owe fiduciary duties to the fund (not to the manager):

| Duty | Description |
|------|-------------|
| **Duty of care** | Act with reasonable skill, care, and diligence |
| **Duty of loyalty** | Act in the best interest of the fund and its investors |
| **Duty to act within powers** | Operate within the fund's constitutional documents |
| **Duty to avoid conflicts** | Disclose and manage personal interests |
| **Duty of independent judgment** | Exercise own judgment, not rubber-stamp manager decisions |

### Jurisdictional Comparison: Board Requirements

| Requirement | Ireland (CBI) | Luxembourg (CSSF) | Cayman (CIMA) |
|-------------|---------------|-------------------|---------------|
| **Minimum directors** | 2 (3+ typical for ManCos) | 3 (conducting officers) | No statutory minimum; 2+ typical |
| **Local residency** | 2-3 Irish-resident directors required | 2-3 Luxembourg-resident directors required | No residency requirement |
| **Independence** | At least 1 independent non-executive director recommended; CP86 requires Organisational Effectiveness Role | CSSF expects mix of executive and independent directors | Independent judgment expected; proportionality principle |
| **Meeting frequency** | Quarterly minimum (CBI expectation) | Quarterly minimum (CSSF expectation) | At least annually; more frequent based on complexity |
| **Board expertise** | Must document expertise rationale in Business Plan | Must demonstrate collective competence | Diversity of skills, background, experience, and expertise required |
| **Non-executive vs. executive** | Majority non-executive for larger ManCos | Mix expected; conducting officers must be Luxembourg-resident | No prescriptive ratio; proportionality applies |

### Key Governance Framework: CIMA (Cayman)

CIMA's Corporate Governance Rule (effective October 2023) applies to all Mutual Funds and Private Funds registered under Cayman law. Key principles:

- Governing body must establish, implement, and maintain a corporate governance framework providing sound and prudent management oversight
- Proportionality: governance framework must match the fund's size, complexity, structure, nature, and risk profile
- Audit committee (or equivalent) required commensurate with fund complexity
- Operators retain ultimate responsibility for all outsourced functions
- Self-assessment of operator performance is an expanded obligation

---

## 2. Management Company (ManCo / AIFM)

### CP86 Framework (Ireland)

The Central Bank of Ireland's CP86 framework (effective 1 July 2018) governs the organizational effectiveness of Irish fund management companies. It mandates **six Designated Person (DP) roles**, each assigned to a named individual:

| DP Function | Scope |
|-------------|-------|
| **Regulatory & Compliance** | Regulatory filings, AML/KYC, compliance monitoring |
| **Fund Risk Management** | Investment risk oversight, limit monitoring |
| **Operational Risk Management** | Operational failures, business continuity |
| **Investment Management** | Investment decision oversight, mandate compliance |
| **Capital & Financial Management** | Regulatory capital, financial reporting |
| **Distribution** | Distribution oversight, investor suitability |

Additionally, CP86 requires an **Organisational Effectiveness Role** (independent director, separate from the six DPs) responsible for reviewing organisational arrangements, monitoring conflicts, and overseeing internal audit effectiveness.

**Ireland specifics**: 141 pages of prescriptive guidance; same-day record retrievability (pre-1pm) or next-day (post-1pm); risk-based director thresholds.

### CSSF Circular 18/698 (Luxembourg)

Luxembourg's substance requirements for UCITS Managers and AIFMs include:

- **Minimum 3 full-time employees** based in Luxembourg
- Conducting officers must be Luxembourg-resident
- New Product Approval committee required for managing risks from new fund launches
- Extensive guidance on delegation oversight and AML/CFT compliance across distributors and transfer agents
- Less prescriptive than Ireland (principle-based) but asset-based thresholds (EUR 1.5bn triggers enhanced requirements)

### Delegation Model

ManCos/AIFMs commonly delegate portfolio management, risk management, administration, and distribution while retaining oversight. See Section 9 (Outsourcing & Delegation) for restrictions.

---

## 3. Custodian vs. Depositary

### Role Distinction

| Aspect | Custodian (Traditional) | Depositary (UCITS / AIFMD) |
|--------|------------------------|---------------------------|
| **Regime** | Contract-based | Regulatory mandate |
| **Scope** | Safekeeping of assets | Safekeeping + cash monitoring + oversight/verification |
| **Liability** | Contractual (negligence standard) | Near-strict liability for loss of financial instruments |
| **Appointment** | Optional for unregulated funds | Mandatory for UCITS and EU AIFs |

### Three Core Functions of a Depositary

1. **Safekeeping of assets**: Holding financial instruments in custody; maintaining records of non-custodial assets (e.g., real estate, derivatives). Financial instruments must be registered in segregated accounts.
2. **Cash flow monitoring**: Ensuring all investor cash flows are properly booked, reconciled, and held in accounts opened in the fund's name. All subscriptions, redemptions, and distributions must be tracked.
3. **Oversight and verification**: Verifying NAV calculations, ensuring compliance with investment restrictions, monitoring connected-party transactions, and checking that consideration for fund transactions is remitted within customary time limits.

### Liability Regime

| Framework | Liability Standard | Discharge Conditions |
|-----------|-------------------|---------------------|
| **UCITS V** | Strict liability for loss of custody assets; must return identical instruments or equivalent amount without undue delay | Can discharge only if loss resulted from an "external event beyond reasonable control" despite all reasonable efforts |
| **AIFMD** | Same strict liability standard as UCITS V | May discharge liability for sub-custodian loss if: (a) complied with all delegation requirements, (b) "objective reason" for contracting out exists (e.g., local law requires local custodian) |
| **Cayman** | Contract-based; no statutory strict liability | Per custodian agreement terms |

### Sub-Custodian Networks

Delegation of safekeeping to sub-custodians requires:
- Objective justification for delegation (not to avoid UCITS/AIFMD requirements)
- Due skill, care, and diligence in selection and appointment
- Periodic reviews and ongoing monitoring of sub-custodians
- Cash monitoring and oversight functions **cannot be delegated** (only safekeeping can be)
- AIFMD II requires insolvency opinions for non-EU sub-custodians

---

## 4. Investment Restrictions & Compliance Monitoring

### Pre-Trade Compliance (Automated Blocking)

Pre-trade compliance systems validate proposed orders against:
- Prospectus/mandate investment restrictions (asset class limits, concentration, geography, credit quality)
- Regulatory rules (UCITS diversification — 5/10/40 rule, single issuer limits, OTC counterparty exposure)
- Internal risk limits and board-approved parameters
- Sanctions lists and restricted securities

Violations are **blocked** before execution. Hard limits prevent order submission; soft limits trigger warnings requiring compliance officer override with documented justification.

### Post-Trade Compliance (Monitoring & Breach Notification)

Post-trade monitoring runs on reconciled, settled positions (typically daily or T+1):
- Validates holdings against the same restriction library as pre-trade
- Detects passive breaches (caused by market movements, redemptions, or corporate actions)
- Generates exception reports for compliance review

**Breach remediation**: Active breaches (caused by trades) require immediate correction. Passive breaches must be remediated within regulator-prescribed timelines (typically "as soon as reasonably practicable" under UCITS; CBI expects rectification within 5 business days). Material breaches must be notified to the regulator and disclosed to the board.

---

## 5. Risk Management

### Liquidity Risk

ESMA's 16 Guidelines on Liquidity Stress Testing (effective September 2020) require:

- **LST framework**: documented policy specifying scenarios, frequency, governance, and escalation
- **Minimum frequency**: Annual; quarterly or more frequent recommended based on fund complexity
- **Asset-side testing**: Assess liquidation time and cost under stress while maintaining investment policy compliance
- **Liability-side testing**: Model redemption scenarios incorporating investor concentration, type, derivative margin calls, and financing counterparty risks
- **Reverse stress testing**: Identify conditions that would trigger fund suspension or gating
- **Cross-fund aggregation**: Consolidated liquidity assessment across all managed funds

**Liquidity Management Tools (LMTs)** under AIFMD II / UCITS VI (ESMA final guidelines April 2025):

| Tool | Type | Description |
|------|------|-------------|
| **Redemption gates** | Quantitative | Cap redemptions per dealing day (e.g., 10% NAV); excess deferred to next dealing day |
| **Side pockets** | Segregation | Illiquid assets moved to separate class; no new subscriptions; monitored until disposal |
| **Redemption in kind** | Non-cash | Deliver securities instead of cash; used for large redemptions |
| **Notice periods** | Timing | Require advance notice (30-90 days typical); allows portfolio preparation |
| **Swing pricing** | Anti-dilution | Adjust NAV to pass transaction costs to redeeming/subscribing investors |
| **Anti-dilution levies** | Anti-dilution | Fee charged to transacting investors to protect remaining holders |

ESMA recommends selecting at least one quantitative LMT and one anti-dilution tool. Activation criteria must be pre-defined with documented triggers.

### Market Risk

| Approach | Method | UCITS Limit |
|----------|--------|-------------|
| **Commitment approach** | Converts derivative exposure to equivalent underlying positions using delta-adjusted notional | Total commitment cannot exceed 100% of NAV (i.e., max 2x leverage) |
| **Absolute VaR** | 1-month, 99% confidence interval | Max 20% of NAV |
| **Relative VaR** | VaR relative to an unleveraged reference portfolio | Max 2x the reference portfolio VaR |

Stress testing is mandatory: historical scenarios (2008 crisis, 2010-12 European debt crisis), hypothetical scenarios, and sensitivity analysis. Back-testing of VaR models must be performed at least monthly.

### Counterparty Risk (UCITS)

- Maximum 5% of NAV exposure to any single OTC counterparty (10% for credit institutions)
- Netting arrangements and collateral received may reduce exposure
- Counterparty exposure aggregated across all instruments

### Operational Risk

ManCos/AIFMs must maintain an operational risk framework covering: trade errors, system failures, fraud, key person dependency, model risk, and outsourcing failures. Capital requirements under CRD/AIFMD must cover operational risk losses.

---

## 6. Valuation Governance

### Pricing Committee

A valuation or pricing committee is typically appointed by the board to oversee day-to-day valuation. Composition includes representatives from:
- Fund administration (NAV calculation team)
- Risk management
- Investment management (advisory role; must not have undue influence)
- Compliance
- Independent members or external pricing specialists

**Meeting frequency**: At least monthly; ad hoc meetings for significant pricing events (market dislocations, credit events, illiquid positions).

### Fair Value Hierarchy

| Level | Inputs | Examples | Governance |
|-------|--------|----------|------------|
| **Level 1** | Quoted prices in active markets | Listed equities, government bonds, exchange-traded derivatives | Automated pricing; vendor feeds |
| **Level 2** | Observable inputs other than Level 1 | OTC derivatives (mark-to-model with observable inputs), corporate bonds with dealer quotes | Vendor pricing with secondary validation |
| **Level 3** | Unobservable inputs | Illiquid bonds, structured products, private equity, distressed debt | Requires pricing committee approval; documented methodology; independent validation |

### Override Governance

Price overrides (departing from vendor/model prices) require:
- Documented justification with supporting evidence
- Pricing committee approval (or escalation to board for material overrides)
- Independent review (cannot be approved solely by portfolio manager)
- Audit trail of all overrides retained for regulatory inspection

### Pricing Challenges

- **OTC derivatives**: Mark-to-model valuations; counterparty marks must be independently verified; model risk governance required
- **Structured products**: Cash flow modeling; prepayment assumptions; credit spread curves
- **Illiquid bonds**: Broker quotes (indicative vs. firm); matrix pricing; comparable security analysis
- **Private assets**: DCF models, comparable transactions, third-party appraisals (PE/RE funds)

### Valuation Frequency

UCITS: at least every two weeks (or more frequently as specified in prospectus; most are daily). AIFs: as specified in fund rules (hedge funds typically daily or weekly; PE funds quarterly or semi-annually).

---

## 7. Regulatory Reporting

### Key Reporting Obligations

| Report | Jurisdiction | Frequency | Content |
|--------|-------------|-----------|---------|
| **AIFMD Annex IV** | EU (per NCA) | Quarterly, semi-annual, or annual (based on AuM, leverage, strategy) | 300+ data fields: instruments traded, strategies, geographic/investor focus, leverage, counterparty exposure, risk profiles. Due 30 days after period end |
| **Form PF** | US (SEC/CFTC) | Quarterly (large advisers >$1.5B) or annual (smaller) | AuM, strategy, leverage, counterparty exposure, liquidity profile, investor concentration |
| **CPO-PQR** | US (CFTC/NFA) | Quarterly (large CPOs >$1.5B) or annual | Pool assets, trading strategy, risk metrics, performance |
| **UCITS annual/semi-annual reports** | EU | Annual (audited) + semi-annual (unaudited) | Financial statements, portfolio schedule, performance, TER, portfolio turnover |
| **SFDR periodic disclosure** | EU | Annual (in annual report) | Sustainability indicators, PAI metrics, taxonomy alignment |
| **EMT (European MiFID Template)** | EU | Ongoing (product data) | Cost data, target market, risk/reward profile for MiFID distributors |

### SFDR Classification

| Classification | Description | Reporting Burden |
|---------------|-------------|-----------------|
| **Article 6** | No sustainability claims | Basic disclosure only |
| **Article 8** ("light green") | Promotes environmental/social characteristics | Pre-contractual + periodic disclosure of E/S characteristics promoted |
| **Article 9** ("dark green") | Sustainable investment objective | Enhanced disclosure: sustainable investment %, DNSH assessment, PAI indicators |

### AIFMD 2.0 Reporting Changes

AIFMD 2.0 (transposition deadline April 2026) significantly expands Annex IV:
- Detailed delegation disclosures (who, what, where)
- Mandatory reporting on all markets, instruments, exposures, and assets (removing prior ambiguity)
- New data fields for loan origination activities

---

## 8. Conflicts of Interest

### Identification and Register

AIFMs/ManCos must maintain a **conflicts of interest register** identifying actual and potential conflicts between:
- The ManCo/AIFM itself (including managers, employees, tied agents)
- The fund(s) it manages
- Investors in different funds or share classes
- Other clients of the ManCo
- UCITS and AIFs managed by the same entity

### Management Procedures

| Measure | Description |
|---------|-------------|
| **Organisational separation** | Chinese walls between portfolio management and sales/distribution |
| **Information barriers** | Restrict access to price-sensitive information |
| **Remuneration controls** | Ensure compensation does not create conflicts (e.g., commission-based incentives) |
| **Personal dealing policies** | Pre-clearance of personal trades; holding periods; restricted lists; reporting of personal accounts |
| **Connected party transactions** | All transactions between the fund and connected parties (manager, depositary, delegates) must be on arm's length terms, documented, and reported to the board |
| **Disclosure** | Where conflicts cannot be managed, they must be disclosed to investors before transacting |

### AIFMD II Changes

AIFMD II introduces a requirement for third-party AIFMs to submit detailed explanations and evidence of conflicts of interest compliance, including how they identify, manage, monitor, and disclose conflicts.

---

## 9. Outsourcing and Delegation

### What Can Be Delegated

Under both UCITS and AIFMD, the following functions may be delegated:
- Portfolio management (subject to conditions)
- Risk management (subject to conditions)
- Administration (NAV calculation, transfer agency, fund accounting)
- Distribution/marketing
- IT infrastructure and operations

### What Cannot Be Delegated (Effective Restrictions)

- **Letter-box entity prohibition**: A ManCo/AIFM must not delegate to the extent it becomes a "letter-box entity" (i.e., can no longer be considered the actual manager). ESMA assesses whether the entity retains: expertise and resources to supervise delegates, power over senior management decisions, contractual rights to inspect and instruct delegates, and investment management functions exceeding retained functions by a substantial margin.
- **Portfolio management and risk management** cannot be delegated to the depositary or its delegates (conflict of interest).
- **Core decision-making** (strategic asset allocation, final investment decisions for non-delegated portions) must be retained.

### Regulatory Approval and Oversight

- **Prior notification** to NCA required before delegation becomes effective
- **Prior approval** required when delegating portfolio/risk management to non-authorised entities
- **Co-operation agreements** required between home and host regulators for non-EU delegates
- ManCo/AIFM remains fully liable regardless of delegation
- Right to withdraw delegation with immediate effect must be contractually preserved
- Sub-delegation requires written AIFM consent and NCA notification

### UCITS VI Delegation Changes (Proposed)

UCITS VI (in legislative process) proposes aligning UCITS delegation rules more closely with AIFMD, including extending requirements to all Annex II services (portfolio management, administration, distribution). ESMA has recommended the Commission provide a list of core functions that must always be performed internally.

---

## 10. Business Continuity & Operational Resilience

### DORA (Digital Operational Resilience Act)

DORA (EU Regulation 2022/2554, applicable from 17 January 2025) establishes uniform requirements for:

| Pillar | Requirements |
|--------|-------------|
| **ICT Risk Management** | Comprehensive framework for identifying, protecting, detecting, responding to, and recovering from ICT-related incidents |
| **Incident Reporting** | Classify and report major ICT-related incidents to NCAs; root cause analysis within prescribed timelines |
| **Digital Operational Resilience Testing** | Regular testing of ICT systems; threat-led penetration testing (TLPT) for significant entities every 3 years |
| **Third-Party ICT Risk Management** | Due diligence on critical ICT providers; contractual requirements for exit strategies, audit rights, performance targets, data security |
| **Information Sharing** | Voluntary exchange of cyber threat intelligence between financial entities |

### Scope for Funds

DORA applies to AIFMs, UCITS management companies, and their critical ICT service providers (cloud, data centers, core banking systems). Exemptions exist for sub-threshold AIFMs (Article 3(2) AIFMD) and small non-complex institutions.

**Key implication for delegation**: If a DORA-regulated entity delegates to a non-DORA entity, the regulated entity must still comply with all ICT risk management provisions. The delegate is not directly subject to DORA, but the delegating entity must ensure equivalent standards through contractual arrangements.

### BCP Requirements for Fund Managers

- Documented disaster recovery and business continuity plans
- Regular testing (at least annually) with documented results
- Defined RPO (recovery point objective) and RTO (recovery time objective) for critical systems (NAV calculation, order processing, investor reporting)
- Communication plans for investors, regulators, and service providers during disruptions
- Outsourcing agreements must include delegate BCP requirements and right to audit

---

## Jurisdictional Comparison: UCITS vs. AIFMD vs. Cayman

| Feature | UCITS | AIFMD | Cayman |
|---------|-------|-------|--------|
| **Depositary required** | Yes (mandatory; strict liability) | Yes (mandatory for EU AIFs; strict liability with limited discharge) | No statutory requirement; custodian by agreement |
| **Risk measurement** | Commitment, absolute VaR, or relative VaR; CESR guidelines | Risk management policy required; no prescribed VaR methodology | No prescribed methodology; proportionate to strategy |
| **Investment restrictions** | Prescriptive (5/10/40, OTC counterparty limits, borrowing limits) | As per fund rules and AIFM policy | As per offering documents; no statutory restrictions |
| **Regulatory reporting** | Annual + semi-annual reports to investors; KIID/KID | Annex IV to NCA (quarterly/semi-annual/annual) | Annual audited financial statements to CIMA |
| **Delegation regime** | Must not become letter-box entity; prior notification to NCA | Same; enhanced under AIFMD II with delegation disclosures | Operators retain ultimate responsibility; no letter-box test |
| **Liquidity tools** | Mandated selection of LMTs under UCITS VI; ESMA guidelines | Mandated under AIFMD II; ESMA final guidelines April 2025 | No regulatory mandate; contractual per offering docs |
| **ESG reporting** | SFDR periodic disclosure (Article 8/9) | SFDR periodic disclosure (Article 8/9) | Voluntary; increasingly expected by institutional investors |
| **Cybersecurity / resilience** | DORA (from Jan 2025) | DORA (from Jan 2025) | No equivalent regulation; industry best practice |
| **Board governance** | NCA-specific (CBI CP86, CSSF Circular 18/698) | NCA-specific | CIMA Corporate Governance Rule (Oct 2023) |
| **Conflicts register** | Required | Required | Required under CIMA rules |

---

## Cross-References

- **`product/REGULATORY.md`** -- SEC/EU/AML-KYC requirements and regulatory gaps for Elysium
- **`domain/FUND_LIFECYCLE.md`** -- Service provider selection (Stage 1), governing documents (Stage 2), depositary/custodian agreements
- **`domain/FUND_ACCOUNTING.md`** -- NAV calculation methodology, dilution, pricing chains (connects to valuation governance above)
- **`domain/SHARE_CLASSES.md`** -- Class-level mechanics relevant to fee conflicts, distribution policies, and hedged class oversight

---

## Sources

- [Evolving Substance Requirements for Fund ManCos - Ireland & Luxembourg (Parva Consulting)](https://parvaconsulting.com/articles/evolving-substance-requirements-for-fund-mancos-ireland-luxembourg/)
- [CP86 Implementation Considerations (KPMG)](https://assets.kpmg.com/content/dam/kpmg/ie/pdf/2020/02/ie-cp86-implementation-considerations-for-fund-management-companies.pdf)
- [AIFMD Delegation Requirements (Linklaters)](https://www.linklaters.com/en/insights/publications/aifmd/delegation)
- [UCITS V: Depositaries (Matheson)](https://www.matheson.com/docs/default-source/asset-management---ucits-briefing-notes/ucits-v-depositaries---september-2017---ucits-briefing-note.pdf)
- [AIFMD and UCITS V: Custodians Under the Gun to Monitor Subcustodians (FinOps)](https://finopsinfo.com/operations/custody/aifmd-and-ucits-v-custodians-under-the-gun-to-monitor-subcustodians/)
- [UCITS V: Just When Are Depositaries Liable, or Not? (FinOps)](https://finopsinfo.com/operations/custody/ucits-v-just-when-are-depositaries-liable-or-not/)
- [CIMA Corporate Governance Rules for Cayman Funds (Anchin)](https://www.anchin.com/articles/new-cayman-islands-monetary-authority-cima-rules-on-corporate-governance-put-spotlight-on-cayman-registered-funds/)
- [CIMA Rules and Guidance for Corporate Governance (Loeb Smith)](https://www.loebsmith.com/wp-content/uploads/2025/02/CIMA-Rules-and-Guidance-for-Corporate-Governance-for-Regulated-Funds-June.pdf)
- [Cayman Islands Private Funds Act 2025 Revision (CIMA)](https://www.cima.ky/upimages/lawsregulations/PrivateFundsAct2025Revision_1739307005.pdf)
- [AIFMD Annex IV Reporting (Apex Group)](https://www.apexgroup.com/insights/annex-iv-reporting-under-aifmd-key-requirements-and-submission-across-the-eu-and-uk/)
- [AIFMD 2.0: What It Means for Annex IV Reporting (EY Luxembourg)](https://www.ey.com/en_lu/insights/wealth-asset-management/aifmd-2-0-what-it-means-for-annex-iv-reporting)
- [ESMA 16 Guidelines on Liquidity Stress Testing (Funds Axis)](https://funds-axis.com/the-16-esma-guidelines-on-liquidity-stress-testing-for-ucits-and-aifs/)
- [ESMA Final Report on LMT Guidelines for UCITS and Open-Ended AIFs (ESMA)](https://www.esma.europa.eu/sites/default/files/2025-04/ESMA34-1985693317-1160_Final_Report_on_the_Guidelines_on_LMTs_of_UCITS_and_open-ended_AIFs.pdf)
- [AIFMD II Liquidity Management Tools: Deep Dive (Paul Hastings)](https://www.paulhastings.com/insights/client-alerts/aifmd-ii-liquidity-management-tools-a-deep-dive-into-the-draft-regulatory-technical-standards)
- [CESR Guidelines on Risk Measurement and Calculation of Global Exposure (ESMA)](https://www.esma.europa.eu/sites/default/files/library/2015/11/10_108.pdf)
- [Fund Valuation Primer (ICI)](https://www.ici.org/system/files/2021-12/21-ppr-fund-valuation-primer.pdf)
- [Fair Value Pricing: How Directors Can Avoid Material Risks (VRC)](https://www.valuationresearch.com/insights/fair-value-pricing-directors-can-avoid-material-risks/)
- [SFDR: What is Article 6, 8 & 9 (Worldfavor)](https://blog.worldfavor.com/sfdr-what-is-article-6-8-9)
- [DORA Regulation Explained (InnReg)](https://www.innreg.com/blog/dora-regulation-explained)
- [DORA: What It Means for Alternative Investment Funds (AIMA)](https://www.aima.org/article/digital-operational-resilience-act-what-it-means-for-alternative-investment-management-funds-and-managers.html)
- [AIFMD II: Changes to Delegation, Authorisation, Reporting, and Conflicts (A&L Goodbody)](https://www.algoodbody.com/insights-publications/aifmd-2-changes-relating-to-delegation-authorisation-reporting-and-conflicts-of-interest-related-requirements)
- [Delegation under UCITS VI: Practical Implications (Arthur Cox)](https://www.arthurcox.com/knowledge/delegation-under-ucits-vi-practical-implications-for-managers/)
- [Pre- and Post-Trade Investment Compliance (CWAN)](https://cwan.com/solutions/pre-post-trade-investment-compliance/)
