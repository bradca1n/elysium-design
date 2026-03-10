# Internal Controls & SOC 1 Reporting

<!-- ~9000 tokens -->
**Last Updated:** 2026-02-10

---

## Table of Contents

1. [ISAE 3402 / SOC 1 Type II Reports](#1-isae-3402--soc-1-type-ii-reports)
2. [Internal Controls Framework](#2-internal-controls-framework)
3. [Operational Risk Management](#3-operational-risk-management)
4. [Service Level Agreements (SLAs)](#4-service-level-agreements-slas)
5. [Due Diligence and RFPs](#5-due-diligence-and-rfps)
6. [Cross-References](#6-cross-references)
7. [Sources](#7-sources)

---

## 1. ISAE 3402 / SOC 1 Type II Reports

### What They Are

An ISAE 3402 / SOC 1 Type II report is an independent auditor's examination of a service organization's internal controls relevant to its user entities' internal control over financial reporting (ICFR). For fund administrators, this report provides assurance to fund boards, investment managers, and their auditors that the administrator's controls over NAV calculation, transfer agency, reconciliation, and related processes are suitably designed and operating effectively.

### ISAE 3402 vs SSAE 18/SOC 1

| Aspect | ISAE 3402 (International) | SSAE 18 / SOC 1 (US) |
|--------|--------------------------|----------------------|
| **Issuing body** | IAASB (International Auditing and Assurance Standards Board) | AICPA (American Institute of Certified Public Accountants) |
| **Jurisdiction** | Global (EU, UK, Asia-Pacific, Middle East) | United States |
| **Equivalent standard** | ISAE 3402, "Assurance Reports on Controls at a Service Organization" | AT-C Section 320, "Reporting on an Examination of Controls at a Service Organization Relevant to User Entities' Internal Control Over Financial Reporting" |
| **Report format** | Substantially identical; both produce Type I and Type II reports | Same structure; mapped to SOC 1 branding |
| **Mutual acceptance** | US auditors accept ISAE 3402 reports; EU auditors accept SOC 1 reports. Irish-domiciled fund admins typically issue dual-branded ISAE 3402/SOC 1 reports to serve both EU and US investor bases. |

### Type I vs Type II

| Feature | Type I | Type II |
|---------|--------|---------|
| **Scope** | Design of controls only | Design AND operating effectiveness |
| **Period** | Point in time (single date) | Over a period (typically 12 months, minimum 6 months) |
| **Testing** | Inquiry and inspection only | Inquiry, observation, inspection, and reperformance over the period |
| **Value** | Lower assurance; used for new service organizations or new control implementations | Higher assurance; required by institutional investors and their auditors |
| **Market expectation** | Acceptable only for year-one engagements | Industry standard for established fund administrators |

### Why Institutional Investors Require Them

Under ISA 402 (international) and AU-C Section 402 (US), the auditor of a user entity (i.e., the fund's auditor) must obtain an understanding of the services provided by service organizations and evaluate whether the service organization's controls are suitably designed and operating effectively. The SOC 1/ISAE 3402 report is the primary mechanism for satisfying this requirement without requiring the fund auditor to perform direct testing at the administrator's premises.

### Typical Scope for a Fund Admin SOC 1

The report covers all processes relevant to user entities' financial reporting:

- **NAV calculation and publication** -- pricing, accruals, valuations, and NAV sign-off
- **Trade processing and settlement** -- trade capture, matching, settlement instruction, and fails management
- **Transfer agency** -- subscription/redemption processing, register maintenance, AML/KYC screening, distribution processing
- **Reconciliation** -- daily position reconciliation (administrator vs. custodian), cash reconciliation (bank statements vs. books)
- **Income processing and fee calculations** -- dividend/coupon accrual, management fee and performance fee calculations
- **Financial reporting** -- periodic financial statements, investor reports, regulatory filings
- **Information Technology General Controls (ITGC)** -- logical access, change management, computer operations, backup and recovery

### Typical Control Objectives (CO1-CO20)

| ID | Control Objective |
|----|-------------------|
| **CO1** | Controls provide reasonable assurance that NAV is calculated accurately and in a timely manner in accordance with the fund's constitutional documents |
| **CO2** | Controls provide reasonable assurance that subscriptions and redemptions are processed in accordance with the fund's prospectus and dealing procedures |
| **CO3** | Controls provide reasonable assurance that security prices used in NAV calculation are obtained from approved, independent pricing sources |
| **CO4** | Controls provide reasonable assurance that position reconciliations between the administrator's records and custodian records are performed daily and breaks are resolved timely |
| **CO5** | Controls provide reasonable assurance that cash reconciliations between the administrator's records and bank/custodian statements are performed daily and breaks are resolved timely |
| **CO6** | Controls provide reasonable assurance that management fees, performance fees, and other fund expenses are calculated in accordance with the fund's constitutional documents |
| **CO7** | Controls provide reasonable assurance that corporate actions (dividends, coupons, mergers, splits) are processed completely and accurately |
| **CO8** | Controls provide reasonable assurance that income (dividends, interest) is accrued and received in accordance with entitlements |
| **CO9** | Controls provide reasonable assurance that investor register records are maintained accurately and completely |
| **CO10** | Controls provide reasonable assurance that distributions to investors are calculated and paid in accordance with the fund's distribution policy |
| **CO11** | Controls provide reasonable assurance that financial statements and investor reports are prepared accurately |
| **CO12** | Controls provide reasonable assurance that regulatory filings (CBI online reporting, AIFMD Annex IV, CRS/FATCA) are submitted accurately and on time |
| **CO13** | Controls provide reasonable assurance that logical access to applications and data is restricted to authorized individuals based on job responsibilities |
| **CO14** | Controls provide reasonable assurance that changes to application systems are authorized, tested, and approved before implementation into production |
| **CO15** | Controls provide reasonable assurance that computer operations (job scheduling, batch processing, system monitoring) are performed as designed |
| **CO16** | Controls provide reasonable assurance that data is backed up on a scheduled basis and can be restored in the event of processing errors or system failures |
| **CO17** | Controls provide reasonable assurance that network security controls restrict unauthorized access to computing resources |
| **CO18** | Controls provide reasonable assurance that physical access to data centers and processing facilities is restricted to authorized personnel |
| **CO19** | Controls provide reasonable assurance that AML/KYC procedures are applied to investor onboarding in compliance with applicable regulations |
| **CO20** | Controls provide reasonable assurance that foreign exchange transactions are executed at market rates obtained from approved sources |

### Testing Procedures

The service auditor employs four types of testing:

1. **Inquiry** -- Interviewing control owners to understand how the control operates
2. **Observation** -- Watching the control being performed in real-time
3. **Inspection of documents** -- Examining evidence (sign-off logs, reconciliation reports, access review outputs, change tickets)
4. **Reperformance** -- Independently executing the control to verify it produces the same result (e.g., recalculating a NAV, reperforming an access review)

Sample sizes are based on frequency: daily controls (25-40 samples), weekly (10-15), monthly (5-6), quarterly (2-3), annual (1).

### Auditor's Opinion Types

| Opinion | Meaning |
|---------|---------|
| **Unqualified (clean)** | Controls are suitably designed and operated effectively throughout the period; no exceptions noted |
| **Qualified** | Controls are generally effective, but specific exceptions were identified for certain control objectives |
| **Adverse** | Controls are not suitably designed or did not operate effectively for a significant number of control objectives |
| **Disclaimer** | Auditor was unable to obtain sufficient appropriate evidence to form an opinion |

### Exceptions and Their Treatment

A **control deviation** is an isolated instance where a control did not operate as designed (e.g., one missed reconciliation sign-off out of 250 trading days). A **control failure** is a systemic breakdown (e.g., reconciliation was never performed for an entire month). Deviations are documented in the report with management's response. Compensating controls may mitigate the impact (e.g., a supervisory review caught the missing reconciliation before NAV publication).

### Complementary User Entity Controls (CUECs)

The SOC 1 report lists controls that must be in place at the user entity (fund/manager) for the overall control environment to function. Typical CUECs include:

- The investment manager provides accurate and complete trade information to the administrator on a timely basis
- The fund board reviews and approves the NAV in accordance with the fund's governing documents
- The investment manager notifies the administrator of all pricing overrides and fair value determinations
- The fund board maintains adequate insurance coverage
- The user entity restricts access to its own systems that interface with the administrator

### Subservice Organizations

Fund administrators rely on subservice organizations (custodians, pricing vendors like Bloomberg/Refinitiv, transfer agent platforms). Two methods for treatment:

| Method | Description | Implications |
|--------|-------------|--------------|
| **Inclusive** | Subservice organization's controls are included in the administrator's SOC 1 report and tested by the same auditor | More comprehensive; preferred by users but difficult to arrange |
| **Carve-out** | Subservice organization's controls are excluded; the report describes the functions performed but does not test them | Most common; users must obtain separate SOC 1 reports from each carved-out subservice organization |

### Annual Cycle

| Phase | Timing | Activities |
|-------|--------|------------|
| **Planning** | Q1 (Jan-Mar) | Scope confirmation, control objective updates, risk assessment, sample selection methodology |
| **Interim testing** | Q2-Q3 (Apr-Sep) | Walk-throughs, initial sample testing, identification of early exceptions |
| **Final testing** | Q4 (Oct-Dec) | Completion of full-period testing, management representation letter, exception remediation |
| **Report issuance** | Q1 next year (Jan-Mar) | Draft report review, management response to exceptions, final report issuance (period typically covers 1 Oct - 30 Sep or 1 Jan - 31 Dec) |

---

## 2. Internal Controls Framework

### COSO Internal Control Framework (2013)

The Committee of Sponsoring Organizations of the Treadway Commission (COSO) 2013 framework defines five interrelated components of internal control, each applied to fund administration:

| Component | Application to Fund Administration |
|-----------|-----------------------------------|
| **Control Environment** | Tone at the top; board oversight; ethics and integrity policies; organizational structure separating front/middle/back office; competence requirements for NAV production staff |
| **Risk Assessment** | Annual RCSA (Risk and Control Self-Assessment); identification of risks to NAV accuracy, settlement failure, regulatory breach; fraud risk assessment |
| **Control Activities** | Four-eye principle on NAV sign-off; automated reconciliation matching; RBAC on systems; segregation of duties; independent pricing verification |
| **Information & Communication** | NAV packs distributed to fund boards; exception reports escalated to compliance; SLA dashboards for clients; incident notification procedures |
| **Monitoring Activities** | Internal audit program; key risk indicator tracking; SOC 1 annual examination; compliance monitoring; management self-testing of controls |

### Four-Eye Principle (Maker-Checker)

Every critical action requires two independent individuals -- one to perform (maker) and one to verify and approve (checker):

| Process | Maker | Checker |
|---------|-------|---------|
| NAV calculation | Fund accountant | Senior fund accountant / NAV manager |
| NAV sign-off | NAV manager | Head of fund accounting or client-designated signatory |
| Payment release | Treasury operations | Treasury manager (separate from initiator) |
| Trade booking | Trade processing analyst | Senior trade processor |
| Investor onboarding | TA operations | AML/compliance officer |
| Journal entry | Fund accountant | Senior accountant (cannot be the same person) |
| System access provisioning | IT operations | IT security / line manager (dual approval) |
| Price override | Pricing analyst | Pricing committee / head of valuations |

### Segregation of Duties Matrix

Incompatible functions that must never be combined in a single individual:

| Function A | Function B (Incompatible) | Risk if Combined |
|------------|--------------------------|------------------|
| Trade execution | Trade settlement | Unauthorized/fictitious trades settled without detection |
| NAV calculation | NAV approval | Errors or manipulation in NAV go undetected |
| Payment initiation | Payment authorization | Fraudulent payments self-approved |
| Investor onboarding | AML approval | Inadequate KYC checks on related parties |
| System administration | Business user operations | Ability to modify system logic and process transactions |
| Journal entry creation | Journal entry approval | Fabricated accounting entries |
| Reconciliation preparation | Reconciliation approval | Breaks concealed to hide errors or fraud |
| Pricing input | Pricing validation | Manipulated prices used in NAV |

### Access Control

- **RBAC (Role-Based Access Control)**: Users assigned to roles (Fund Accountant, NAV Approver, TA Operator, etc.) with minimum necessary privileges. No individual should hold both maker and checker roles for the same process.
- **Privileged Access Management (PAM)**: System administrator and database access requires formal request, time-limited grants, session recording, and quarterly review.
- **Periodic Access Reviews**: Quarterly review of all user access by line managers; annual certification by department heads. Evidence retained for SOC 1 testing.
- **Joiner/Mover/Leaver (JML) Process**: New joiner access provisioned via formal request with manager and IT security approval. Role changes trigger access re-certification. Leavers have access revoked within 24 hours of departure (same day for privileged accounts).

### Change Management

All changes to production systems follow a formal lifecycle:

1. **Change request** -- Documented in ticketing system (e.g., ServiceNow, Jira) with business justification
2. **Impact assessment** -- Technical and business impact analysis; risk classification (standard/normal/emergency)
3. **Development and testing** -- Changes developed in non-production environment; unit and integration testing; user acceptance testing (UAT) sign-off
4. **Approval** -- Change Advisory Board (CAB) approval for significant changes; line manager approval for standard changes
5. **Implementation** -- Deployed by a separate individual from the developer (segregation of duties); rollback plan documented
6. **Post-implementation review** -- Verification that change achieved its objective; monitoring for unintended consequences

### Data Backup and Recovery

| Parameter | Definition | Fund Admin Target |
|-----------|------------|-------------------|
| **RPO (Recovery Point Objective)** | Maximum acceptable data loss measured in time | 1 hour for transactional data; 24 hours for reporting data |
| **RTO (Recovery Time Objective)** | Maximum acceptable downtime before service restoration | 4 hours for NAV systems; 8 hours for reporting systems |
| **Backup frequency** | How often data is copied | Real-time replication for databases; daily full backup; hourly incremental |
| **Off-site storage** | Geographic separation of backup media | Secondary data center or cloud region (minimum 50km separation) |
| **DR testing** | Validation of recovery capability | Annual full DR test with documented results; semi-annual tabletop exercise |

---

## 3. Operational Risk Management

### Key Risk Indicators (KRIs)

| KRI | Target | Measurement | Escalation Threshold |
|-----|--------|-------------|---------------------|
| NAV on-time delivery rate | >99% | NAVs delivered within SLA / total NAVs produced | <98% triggers management review |
| NAV error rate | <0.1% of NAVs produced | Restated NAVs / total NAVs published | Any material NAV error (>0.5% of NAV per share) triggers board notification |
| Reconciliation break aging | <5 breaks >5 business days old | Count of unresolved breaks by age bucket | >10 aged breaks triggers operations review |
| Straight-through processing (STP) rate | >90% | Auto-matched trades / total trades | <85% triggers process review |
| Trade settlement failure rate | <1% | Failed settlements / total settlement instructions | >2% triggers counterparty/custodian escalation |
| System availability/uptime | >99.9% | Actual uptime / scheduled operating hours | <99.5% triggers IT incident review |
| Staff turnover rate | <15% annually | Departures / average headcount | >20% triggers HR/retention review |
| Regulatory filing on-time rate | 100% | On-time filings / total required filings | Any missed deadline triggers compliance escalation |
| Investor complaint count | <5 per quarter per 1000 investor accounts | Complaints received per period | Trend increase >25% triggers root cause analysis |
| Open audit findings count | Declining trend | Open findings from internal/external audit | >5 high-severity findings open >90 days triggers board reporting |

### Operational Loss Event Tracking (Basel II Categories)

| Category | Fund Admin Examples |
|----------|-------------------|
| **Execution, delivery & process management** | NAV calculation error, missed settlement, incorrect investor statement, late regulatory filing |
| **Internal fraud** | Unauthorized trading, fictitious investor accounts, embezzlement of client funds |
| **External fraud** | Phishing attacks, social engineering to redirect payments, forged investor documentation |
| **Employment practices & workplace safety** | Key person dependency, inadequate training leading to errors, data protection breach by employee |
| **Clients, products & business practices** | Mis-selling, failure to follow fund documents, breach of investment restrictions, AML failures |
| **Damage to physical assets** | Data center fire/flood, hardware destruction |
| **Business disruption & system failures** | System outage during NAV production, network failure, ransomware attack, cloud provider outage |

### Risk and Control Self-Assessment (RCSA)

Annual process conducted by each operational department:

1. **Identify risks** -- Workshop-based identification of all risks to department objectives
2. **Assess inherent risk** -- Rate likelihood (1-5) and impact (1-5) before controls
3. **Map existing controls** -- Link each risk to its mitigating controls
4. **Assess residual risk** -- Rate likelihood and impact after controls
5. **Identify gaps** -- Where residual risk exceeds appetite, identify remediation actions
6. **Track actions** -- Remediation actions assigned to owners with deadlines; tracked quarterly

### Incident Management

| Step | Description | SLA |
|------|-------------|-----|
| **Detect** | Automated monitoring alerts, manual discovery, or client/investor report | Continuous |
| **Classify** | Severity 1 (critical: NAV cannot be produced), Severity 2 (high: NAV delayed >2 hours), Severity 3 (medium: process workaround needed), Severity 4 (low: minor impact, no client effect) | Within 15 minutes of detection |
| **Respond** | Assemble incident team; contain impact; notify affected parties | Sev 1: immediate; Sev 2: within 1 hour |
| **Resolve** | Restore normal operations; verify data integrity | Sev 1: within 4 hours; Sev 2: within 8 hours |
| **Root cause analysis** | Determine underlying cause using 5-Whys or fishbone analysis | Within 5 business days |
| **Preventive action** | Implement control improvements to prevent recurrence; update RCSA | Within 30 business days |

### Near-Miss Reporting

Encourage reporting of events that could have caused loss but did not (e.g., a pricing error caught before NAV publication, a reconciliation break that self-resolved). Operate a no-blame culture: reporters are recognized, not penalized. Track near-miss patterns to identify systemic weaknesses before they cause actual losses.

---

## 4. Service Level Agreements (SLAs)

### Typical KPIs and Targets

| Service Area | KPI | Target | Measurement |
|-------------|-----|--------|-------------|
| **NAV delivery -- daily funds** | Time after NAV strike | T+0 (same day, within 4 hours of market close) | Timestamp of NAV file delivery vs. SLA deadline |
| **NAV delivery -- complex/multi-asset** | Time after NAV strike | T+1 (next business day by 12:00 local time) | Same |
| **NAV delivery -- illiquid/PE** | Time after quarter-end | T+2 to T+45 depending on complexity | Calendar days from period end |
| **NAV accuracy** | Error rate | <0.05% of NAVs produced | Restated NAVs / total NAVs |
| **Investor statement accuracy** | Error-free statements | >99.9% | Statements requiring correction / total issued |
| **Investor query response** | Response time | Within 24 hours (acknowledgement); 48 hours (substantive response) | Ticketing system timestamps |
| **Regulatory query response** | Response time | Same business day | Compliance log |
| **Monthly management accounts** | Delivery after month-end | BD+5 (5 business days after month-end) | Delivery timestamp |
| **Quarterly investor statements** | Delivery after quarter-end | BD+15 | Delivery timestamp |
| **Annual financial statements (draft)** | Delivery after year-end | BD+30 | Delivery timestamp |
| **Reconciliation breaks** | Unresolved >5 days | <5 at any point in time | Daily break report |
| **System uptime** | Availability during business hours | >99.9% | Monitoring platform |

### Penalty and Incentive Structures

- **Fee rebate**: Typical structure is 5-10% fee reduction for the quarter in which SLA targets are missed (applied to the specific service line, not total fees)
- **Grace period**: Usually 2-3 occurrences per quarter before penalties apply (recognizing occasional market disruptions)
- **Bonus for exceeding**: Some contracts include a 2-5% fee uplift if all SLAs are exceeded by a defined margin for a consecutive 12-month period
- **Termination for cause**: Persistent SLA failure (e.g., missing NAV delivery SLA >10% of the time over two consecutive quarters) may constitute grounds for contract termination
- **Force majeure**: Market closures, exchange outages, and regulatory-mandated suspensions are excluded from SLA calculations

### Monthly SLA Reporting

Fund administrators provide monthly SLA dashboards to clients containing: (1) KPI performance vs. target for each service area, (2) trend analysis over trailing 12 months, (3) exception log with root cause and remediation status, (4) upcoming changes or system upgrades that may affect service.

---

## 5. Due Diligence and RFPs

### Operational Due Diligence (ODD)

Institutional investors (pension funds, sovereign wealth funds, insurance companies, fund-of-funds) perform ODD on fund administrators as part of their investment process. ODD failure is a common reason for declining to invest in a fund.

### AIMA Illustrative Questionnaire for Due Diligence of Fund Administrators

The AIMA DDQ for fund administrators covers the following key sections:

| Section | Key Topics |
|---------|-----------|
| **Firm overview** | Ownership structure, financial stability (audited accounts), AuA (assets under administration), number of funds serviced, jurisdictions, regulatory status |
| **Staffing** | Total headcount, staff-to-fund ratio, key person dependencies, training programs, staff turnover rate, qualifications (ACCA, CFA, ACA) |
| **Technology** | Core fund accounting system (vendor, version, customization), disaster recovery capabilities, cybersecurity posture, data encryption, system development lifecycle |
| **Controls and compliance** | SOC 1 / ISAE 3402 report availability and exceptions, COSO framework adoption, segregation of duties, pricing oversight, reconciliation procedures |
| **Insurance** | Professional Indemnity, D&O, Cyber, Fidelity bond (see below) |
| **Business continuity** | BCP and DR plans, testing frequency and results, RPO/RTO, pandemic planning, remote working capability |
| **Regulatory history** | Regulatory sanctions, fines, enforcement actions, material litigation, material NAV errors in prior 5 years |
| **Client references** | Typically 3-5 references from comparable funds (similar strategy, AuM, domicile) |
| **Subservice organizations** | Custodians, pricing vendors, IT infrastructure providers; SOC 1 reports for each |
| **AML/KYC** | Investor onboarding procedures, screening tools, PEP/sanctions screening, ongoing monitoring, regulatory examination history |

### Insurance Requirements

| Coverage | Description | Typical Minimum |
|----------|-------------|----------------|
| **Professional Indemnity (PI)** | Covers losses arising from errors, omissions, or negligent acts in the provision of fund administration services (e.g., NAV errors causing investor loss) | 0.5-1.0% of AuA, subject to a minimum of EUR 5-10 million |
| **Directors & Officers (D&O)** | Protects directors and officers of the administrator against personal liability for wrongful acts | EUR 5-10 million |
| **Cyber insurance** | Covers costs arising from data breaches, ransomware, business interruption, notification costs, regulatory fines | EUR 5-20 million depending on data volume |
| **Fidelity bond** | Covers losses from employee dishonesty, theft, or fraud | EUR 2-5 million |
| **Crime insurance** | Covers social engineering fraud, funds transfer fraud, computer fraud | EUR 2-5 million |

Institutional investors typically require evidence of coverage (certificates of insurance) as a condition of investment and may specify minimum coverage amounts relative to fund size.

### Whistleblowing Procedures

Under the Irish **Protected Disclosures Act 2014** (as amended by the **Protected Disclosures (Amendment) Act 2022**, effective 1 January 2023):

- **Scope**: All workers (employees, contractors, trainees, board members, shareholders, volunteers) in the public, private, and not-for-profit sectors are protected
- **Internal reporting channels**: Organizations with 50+ workers must establish formal internal reporting channels; financial services firms (including fund administrators regulated by the CBI) must comply regardless of headcount
- **External reporting**: Workers may report externally to a prescribed person (the Central Bank of Ireland for regulated financial services entities) or to a Minister
- **Protections**: Protection from penalisation (dismissal, demotion, harassment, blacklisting); interim relief available from the Circuit Court; compensation of up to 5 years' remuneration for unfair dismissal
- **Obligations on employers**: Acknowledge receipt within 7 days; provide feedback within 3 months; maintain confidentiality of the discloser's identity; keep records for 5 years
- **CBI's role**: The CBI is the designated prescribed person for disclosures relating to breaches of financial services legislation; it publishes annual reports on protected disclosures received

---

## 6. Cross-References

- **`domain/GOVERNANCE_AND_COMPLIANCE.md`** -- Fund board oversight, depositary role, CP86 framework, DORA, conflicts of interest, delegation rules (all of which interact with the internal control environment)
- **`domain/RECONCILIATION_AND_OPS.md`** -- Daily NAV production cycle, position/cash reconciliation, trade lifecycle, corporate actions, STP rates (the operational processes that SOC 1 controls govern)
- **`domain/REGULATORY.md`** -- UCITS, AIFMD, AML/KYC regulatory requirements that define the compliance controls tested in SOC 1 reports
- **`domain/FEES_AND_EQUALIZATION.md`** -- Management and performance fee calculations (CO6), equalization methods that require specific controls
- **`domain/TRANSFER_AGENCY.md`** -- Subscription/redemption processing (CO2), investor register (CO9), AML/KYC (CO19)
- **`domain/NAV_METHODOLOGY.md`** -- NAV calculation methodology (CO1), pricing (CO3), error materiality thresholds

---

## 7. Sources

- [ISAE 3402 Overview (Wikipedia)](https://en.wikipedia.org/wiki/ISAE_3402)
- [ISAE 3402 / SOC 1 Type 2 (AARO)](https://aaro.com/en/isae-3402-soc-1-type-2/)
- [ISAE 3402 vs SOC 1 (TheSoc2.com)](https://www.thesoc2.com/post/isae-3402-vs-soc1-understanding-the-difference-for-international-clients)
- [SOC 1 Type I vs Type II (Securance)](https://securance.com/news/isae-3402-soc-1-type-i-vs-type-ii)
- [Third Party Assurance: SOC 1, SOC 2 & ISAE 3402 (Forvis Mazars Ireland)](https://www.forvismazars.com/ie/en/services/consulting/risk-consulting/third-party-assurance-soc-1-soc-2-isae-3402)
- [COSO Internal Control Framework (COSO.org)](https://www.coso.org/guidance-on-ic)
- [COSO Framework Fundamentals (AuditBoard)](https://auditboard.com/blog/coso-framework-fundamentals)
- [Five Components of Internal Control (Pathlock)](https://pathlock.com/blog/internal-controls/five-components-of-internal-control/)
- [The Four Eyes Principle in Sanctions Monitoring (Zampa Partners)](https://zampapartners.com/insights/the-four-eyes-principle-in-sanctions-monitoring)
- [Operational Risk (Wikipedia)](https://en.wikipedia.org/wiki/Operational_risk)
- [Principles for Sound Management of Operational Risk (BIS)](https://www.bis.org/publ/bcbs195.pdf)
- [The Seven Operational Risk Event Types (Basel II) (CAREweb)](https://care-web.co.uk/the-seven-operational-risk-event-types-projected-by-basel-ii-2/)
- [AIMA Due Diligence Questionnaires](https://www.aima.org/sound-practices/due-diligence-questionnaires.html)
- [Selecting a Fund Administrator (The Hedge Fund Journal)](https://thehedgefundjournal.com/selecting-a-fund-administrator/)
- [HedgeServ SOC 1 ISAE 3402 Type II Examination (PR Newswire)](https://www.prnewswire.com/news-releases/hedgeserv-successfully-completes-service-organization-control-soc-1-isae-3402-type-ii-examination-135243993.html)
- [Protected Disclosures & Whistleblowing (Central Bank of Ireland)](https://www.centralbank.ie/regulation/protected-disclosures-whistleblowing)
- [Protected Disclosures (Amendment) Act 2022: Implications for Irish Financial Service Providers (Dillon Eustace)](https://www.dilloneustace.com/legal-updates/protected-disclosures-amendment-act-2022-implications-for-irish-financial-service-providers-and-irish-funds)
- [New Obligations under the Protected Disclosures (Amendment) Act 2022 (WRC)](https://www.workplacerelations.ie/en/what_you_should_know/employer-obligations/protection-of-whistleblowers/new-obligations-under-the-protected-disclosures-amendment-act-2022/)
