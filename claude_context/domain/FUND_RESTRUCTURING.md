<!-- ~6000 tokens -->

# Fund Restructuring

**Last Updated:** 2026-02-10

---

> **Cross-references:** `domain/FUND_LIFECYCLE.md` (legal structures, formation, wind-down), `domain/GOVERNANCE_AND_COMPLIANCE.md` (board approvals, depositary role, CP86), `domain/REGULATORY.md` (UCITS/AIFMD frameworks, Cayman regulation), `domain/TRANSFER_AGENCY.md` (investor notification, share exchange, register maintenance), `domain/IRISH_ADMIN_REQUIREMENTS.md` (CBI authorization, ICAV Act, Cayman requirements), `domain/SHARE_CLASSES.md` (class mechanics, hedging, denomination currencies), `domain/FEES_AND_EQUALIZATION.md` (fee restructuring implications)

---

## 1. Fund Mergers

### Merger Types (UCITS Directive 2009/65/EC, Chapter VIII, Articles 37-48)

| Type | Mechanism | Result |
|------|-----------|--------|
| **Absorption (Art. 2(1)(p)(i))** | Merging UCITS transfers all assets/liabilities to receiving UCITS and ceases to exist | Receiving UCITS continues; merging UCITS dissolved without liquidation |
| **Creation (Art. 2(1)(p)(ii))** | Two or more merging UCITS transfer all assets/liabilities to a newly created UCITS | New UCITS formed; all merging UCITS dissolved without liquidation |
| **Transfer of assets (Art. 2(1)(p)(iii))** | Merging UCITS transfers net assets to another UCITS (a sub-fund) and continues until liabilities discharged | Merging UCITS wound up after completion |

### Tax-Neutral Conditions

UCITS cross-border mergers are intended to be tax-neutral for investors. The merger should not trigger a disposal event for investors in the merging fund. However, Directive 2009/65/EC does not itself harmonize tax treatment -- each Member State determines whether a merger constitutes a taxable event. In practice:

- **Ireland:** Section 739H TCA 1997 -- mergers between Irish-regulated funds are generally not chargeable events for Irish tax purposes if structured as a scheme of amalgamation
- **Luxembourg:** Tax-neutral if both funds are Luxembourg-domiciled or within UCITS framework
- **Cross-border:** No automatic neutrality; depends on bilateral tax treaties and domestic law implementation. The EU Merger Directive (2009/133/EC) does not apply to fund mergers

### Approval Process and Timeline

| Step | Timeline | Detail |
|------|----------|--------|
| Board approval of common draft terms | T-90 days | Boards of both funds approve merger proposal and common draft terms |
| CBI/CSSF regulatory filing | T-75 days | Competent authority of merging fund reviews; may consult receiving fund's authority |
| Regulatory approval | T-60 to T-45 | CBI targets 20 business days for complete applications |
| Depositary validation | T-45 days | Depositary of each UCITS verifies conformity of common draft terms (Art. 40) |
| Independent auditor/depositary report | T-40 days | Validates valuation methods and exchange ratio calculation (Art. 42) |
| **Shareholder notification** | **T-30 days minimum** | Merger information document sent to all unitholders (Art. 43). Must include: merger rationale, impact on investors, exchange ratio, costs, tax implications, opt-out rights |
| Opt-out period | T-30 to T-0 | Investors may redeem free of charge (no redemption fees) |
| **Effective date** | T-0 | Final NAV calculated; exchange ratio applied; register updated |
| Deregistration | T+30 days | Merging fund removed from CBI/CSSF register |

### Cayman Merger Mechanics

Cayman fund mergers operate under common law and the fund's constitutional documents (not the Mutual Funds Act directly):

- **Scheme of arrangement:** Court-sanctioned process under Companies Act; requires 75% by value of each class of shareholder voting at court-convened meeting, plus court approval
- **Contractual merger:** Board-approved process under the fund's articles; typically requires special resolution (75%) or as specified in constitutional documents
- **CIMA notification:** CIMA must be notified of any material changes including mergers; no formal CIMA approval required but deregistration of merging fund needed
- **Segregated Portfolio Company (SPC):** Individual portfolios can be merged without affecting other portfolios; ring-fencing preserved

### Depositary and Auditor Roles in Merger

- **Depositary:** Verifies common draft terms, validates exchange ratio, certifies asset transfer completeness, confirms cash settlement of fractional shares
- **Auditor:** Prepares independent report on exchange ratio methodology, validates NAV at effective date, may also validate valuation of non-liquid assets

---

## 2. Share Conversion and Exchange Ratios

### Calculation Methodology

```
Exchange Ratio = NAV per share (merging fund) / NAV per share (receiving fund)

Example:
  Merging Fund: NAV/share = EUR 142.35
  Receiving Fund: NAV/share = EUR 98.72
  Exchange Ratio = 142.35 / 98.72 = 1.441654

  Investor holds 1,000 shares in merging fund
  Receives: 1,000 × 1.441654 = 1,441.654 shares in receiving fund
```

**Adjustments:**
- Merger costs (legal, regulatory, audit) may be deducted from merging fund NAV before ratio calculation, or absorbed by management company
- Accrued income must be equalized at effective date
- Class-specific fees and hedging P&L factored into per-class NAV

### Fractional Share Handling

- **Cash payment:** Most common -- fractional shares below one unit paid in cash at receiving fund's NAV per share
- **Fractional share issuance:** Some funds permit fractional shares (to 3-4 decimal places) on register
- **Rounding:** If cash payment, rounding to nearest cent; if shares, to nearest permitted fraction

### Investor Rights

- **30 days minimum** notice before effective date (UCITS); may be longer per prospectus
- **Free redemption:** Investors may redeem without charge during the notice period
- **Opt-out:** No obligation to accept shares in receiving fund; alternative is full redemption at merging fund NAV
- **No dealing suspension** during notice period (investors can still subscribe/redeem)

---

## 3. Sub-Fund and Share Class Changes

### Sub-Fund Launch

| Step | CBI Process | Timeline |
|------|-------------|----------|
| Board approval | Minutes documenting investment policy, fee structure, target market | T-30 days |
| Supplement drafting | Legal counsel prepares supplement to umbrella prospectus | T-25 days |
| CBI filing | Online submission via CBI Portal; supplement + checklist | T-20 days |
| CBI review | Standard review period for compliant filing | 10 business days |
| Authorization | CBI issues letter of authorization for new sub-fund | T-0 |
| Seeding and launch | Initial subscription, NAV calculation commences | T+1 to T+5 |

### Sub-Fund Closure

- **Voluntary termination:** Board resolution; written notice to shareholders (typically 30 days for UCITS); dealing suspended after final dealing day; assets liquidated; final NAV calculated; proceeds distributed pro rata; deregistration with CBI
- **Compulsory wind-up:** Triggered by NAV falling below minimum threshold (per prospectus, e.g., EUR 5M), regulatory order, or court order
- **Timeline:** 3-6 months typical from board resolution to final distribution; longer if illiquid assets

### Share Class Launch and Closure

- **Launch:** Minimal prospectus amendment (supplement update); CBI notification required; no shareholder approval unless new class has preferential rights
- **Closure:** Board may compulsorily convert shareholders to another class of same sub-fund; 30 days written notice required; exchange at NAV-to-NAV on conversion date
- **Forced conversion triggers:** Class falls below minimum size, hedging becomes uneconomical, regulatory change

---

## 4. Service Provider Transitions

### Administrator Changeover

| Phase | Duration | Activities |
|-------|----------|------------|
| **Selection and contracting** | 4-8 weeks | RFP, due diligence, fee negotiation, legal agreements |
| **Data extraction** | 2-4 weeks | Full data export from outgoing administrator: positions, transactions, investor register, historical NAVs, accounting records |
| **Parallel running** | 4-8 weeks | Both administrators calculate NAV independently; daily reconciliation of NAV, positions, cash, investor holdings |
| **Reconciliation and sign-off** | 1-2 weeks | Board and depositary sign off on reconciliation results; tolerance typically < 0.01% NAV variance |
| **Cutover** | 1 day | Outgoing administrator ceases; incoming administrator goes live |
| **Post-migration** | 4 weeks | Monitoring, issue resolution, historical query handling |

### Custodian/Depositary Change

- UCITS depositary must be domiciled in fund's home Member State
- Asset transfer: securities moved via custodian-to-custodian DvP; cash transferred via wire; reconciliation of all positions pre/post transfer
- Legal due diligence on incoming depositary's sub-custodian network
- CBI prior approval required for depositary change (material change to fund)
- Minimum 30 days investor notification

### Auditor Rotation

Under EU Regulation 537/2014 (statutory audit of PIEs):
- **Maximum engagement:** 10 years (extendable to 20 years with public tender, 24 years with joint audit)
- **Cooling-off:** 4 years before reappointment
- **Irish funds:** Most Irish-authorized UCITS and AIFs are PIEs; mandatory rotation applies
- **Cayman funds:** No mandatory rotation; best practice is periodic tender (every 5-7 years)

### Investment Manager Changes

- CBI notification required (material change); 1-month prior notice typical
- Investor communication: written notice to all shareholders
- Portfolio transition: new manager may rebalance; trading costs allocated to fund or absorbed by manager per agreement
- **Key person departure:** If named in prospectus, requires prospectus update and investor notification; may trigger investor redemption rights per fund documents

---

## 5. Redomiciliation

### Mechanisms

| Route | Mechanism | Typical Use |
|-------|-----------|-------------|
| **Continuation/re-registration** | Fund re-registers in new jurisdiction under existing legal identity; no dissolution | Cayman to Ireland (ICAV Act Part 8); minimal disruption |
| **Scheme of arrangement** | Court-sanctioned transfer of assets/liabilities to new fund in target jurisdiction | Complex structures; requires court approval in both jurisdictions |
| **Cross-border merger** | Merging offshore fund into newly established Irish/EU fund | When continuation not available |

### Cayman to Ireland (ICAV Act 2015, Part 8, Sections 140-144)

1. **CBI pre-application meeting** (recommended)
2. **Board resolution** approving redomiciliation
3. **CBI application** for authorization as UCITS or AIF + registration by continuation as ICAV
4. **Cayman deregistration** from CIMA once CBI authorization granted
5. **Timeline:** 3-4 months for non-EU to UCITS; shorter for AIF
6. **Key benefit:** No portfolio rebalancing required if already UCITS-compliant; existing contracts unaffected; no disposal event for shareholders

### Tax Implications

- **No disposal:** Redomiciliation by continuation does not involve a transfer of assets; shareholders retain their shares; generally not a taxable event
- **Withholding tax:** Post-redomiciliation, Irish tax regime applies (Section 739B-739J TCA 1997); relevant declarations needed from investors to claim exemptions
- **US investors:** May have PFIC implications if fund classification changes; requires tax counsel analysis

### Regulatory Approvals

- **Outgoing jurisdiction:** Consent to deregistration (CIMA letter of no objection); compliance confirmation
- **Incoming jurisdiction:** Full authorization application (CBI); prospectus/supplement approval; depositary appointment in home state
- **Investor consent:** Typically not required for continuation (no change in investment); board authority sufficient per constitutional documents

---

## 6. Legal Structure Conversions

### PLC to ICAV (ICAV Act 2015, Part 8)

- **Eligibility:** Any Irish-registered investment company (PLC) may convert
- **Process:** Special resolution of shareholders (75%); CBI application with instrument of incorporation; CBI registers company as ICAV
- **Effect:** Company identity preserved; contracts, assets, liabilities continue; no disposal for tax purposes (Section 739J TCA 1997)
- **Benefits:** No AGM requirement, simpler constitutional documents, ability to elect tax transparency for non-Irish investors (check-the-box for US investors)

### Standalone to Umbrella

- Requires prospectus amendment to create umbrella structure with segregated liability
- Board approval + CBI filing of updated prospectus
- Existing fund becomes first sub-fund; new sub-funds added via supplement
- Shareholder approval required if constitutional documents need amendment

### Unit Trust to ICAV

- No direct conversion mechanism; requires establishment of new ICAV and merger/transfer of unit trust assets
- Typically structured as absorption merger: ICAV established, unit trust merges into ICAV sub-fund
- Tax implications: potential disposal event unless structured carefully under merger relief provisions

---

## 7. Prospectus and Fee Amendments

### Material vs. Non-Material Changes

| Category | Examples | CBI Process |
|----------|----------|-------------|
| **Material (pre-approval)** | Investment objective change, new fee type, depositary change, manager change, new share class with preferential rights | CBI prior approval required; submit via CBI Portal with marked-up prospectus |
| **Non-material (filing)** | Director changes, minor policy clarifications, updated risk factors, address changes | Filed with CBI within required period; no prior approval |

### Shareholder Approval Thresholds

- **Investment objective/policy change:** Ordinary resolution (50%+1) for UCITS; may require EGM
- **Fee increases:** Varies by prospectus; typically 30 days advance written notice without vote, unless increase exceeds prospectus-disclosed maximum
- **Constitutional document amendment:** Special resolution (75%) for corporate funds; trustee resolution for unit trusts

### Investor Notification Timeline

| Change Type | Ireland (CBI) | Cayman (CIMA) |
|-------------|---------------|---------------|
| Fee increase | **30 days** written notice (CBI guidance) | Per constitutional documents; typically 30 days |
| Investment policy change | **30 days** written notice + right to redeem free of charge | Per constitutional documents |
| Manager/depositary change | **30 days** written notice | CIMA notification; investor notice per documents |
| Prospectus update (non-material) | Published on website; no direct notice required | Filed with CIMA |
| Merger | **30 days minimum** (UCITS Directive Art. 43) | Per constitutional documents |

---

## Sources

- [UCITS Directive 2009/65/EC (EUR-Lex)](https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=celex:32009L0065)
- [EU Regulation 537/2014 -- Statutory Audit of PIEs (EUR-Lex)](https://eur-lex.europa.eu/legal-content/EN/TXT/PDF/?uri=CELEX:32014R0537)
- [Irish Collective Asset-management Vehicles Act 2015 (Revised Acts)](https://revisedacts.lawreform.ie/eli/2015/act/2/front/revised/en/html)
- [CBI UCITS Guidance and Post-Authorisation](https://www.centralbank.ie/regulation/industry-market-sectors/funds/ucits/post-authorisation)
- [Dillon Eustace -- Conversion of PLCs to ICAVs](https://www.dilloneustace.com/insights/legal-insights/conversion-of-irish-investment-funds-structured-as-plcs-to-icavs/)
- [Dillon Eustace -- Redomiciling Your Investment Fund to Ireland](https://www.dilloneustace.com/insights/legal-insights/redomiciling-your-investment-fund-to-ireland/)
- [A&L Goodbody -- Fund Re-domiciliations to Ireland](https://www.algoodbody.com/media/InFocus-Fund-redomiciliation.pdf)
- [Mason Hayes Curran -- Funds May Now Redomicile to Ireland](https://www.mhc.ie/latest/insights/regulatory-update-funds-may-now-redomicile-in-ireland-from-relevant-jurisdictions)
- [Matheson -- UCITS Mergers and Master Feeder Structures](https://www.matheson.com/docs/default-source/asset-management---ucits-briefing-notes/ucits-mergers-and-master-feeder-structures---january-2017---ucits-briefing-note.pdf)
- [FCA Handbook -- COLL 7.7 UCITS Mergers](https://www.handbook.fca.org.uk/handbook/COLL/7/7.html)
- [ESMA Q&A on UCITS Directive](https://www.esma.europa.eu/sites/default/files/library/esma34_43_392_qa_on_application_of_the_ucits_directive.pdf)
- [CIMA -- Cayman Islands Investment Funds](https://www.cima.ky/investment-funds)
- [Cayman Mutual Funds Act (2021 Revision)](https://www.cima.ky/upimages/lawsregulations/MutualFundsAct2021Revision_1613486288.PDF)
- [Accountancy Europe -- Mandatory Rotation of Auditors (2022)](https://www.accountancyeurope.eu/wp-content/uploads/2022/12/Audit-Rotation-2022_Accountancy_EU.pdf)

---

## Related Files

| File | Relevance |
|------|-----------|
| `domain/FUND_LIFECYCLE.md` | Legal structures, formation stages, wind-down procedures |
| `domain/GOVERNANCE_AND_COMPLIANCE.md` | Board approvals, depositary oversight, CP86 framework |
| `domain/REGULATORY.md` | UCITS/AIFMD regulatory frameworks, Cayman regulation |
| `domain/TRANSFER_AGENCY.md` | Investor notification workflows, share exchange, register maintenance |
| `domain/IRISH_ADMIN_REQUIREMENTS.md` | CBI authorization process, ICAV Act provisions, Cayman requirements |
| `domain/SHARE_CLASSES.md` | Class mechanics, hedging implications during restructuring |
| `domain/FEES_AND_EQUALIZATION.md` | Fee restructuring, equalization on merger |
| `domain/TAX.md` | Tax implications of mergers, redomiciliation, structure conversions |
| `domain/ERROR_SCENARIOS_AND_CRISIS.md` | Fund wind-down and termination crisis procedures |
