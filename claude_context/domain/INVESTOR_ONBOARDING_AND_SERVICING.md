# Investor Onboarding & Servicing

<!-- ~9000 tokens -->
**Last Updated:** 2026-02-10

---

> **Cross-references:** `domain/TRANSFER_AGENCY.md` (subscription/redemption workflows, AML/KYC tiers, register maintenance), `domain/REGULATORY.md` (UCITS, AIFMD, AML directives, GDPR, MiFID II), `domain/TAX.md` (FATCA/CRS self-certification, withholding tax, exit tax), `domain/ERROR_SCENARIOS_AND_CRISIS.md` (sanctions hits during onboarding, forced redemption failures)

---

## 1. End-to-End Onboarding Workflow

```
                    INVESTOR ONBOARDING WORKFLOW
  ================================================================

  INVESTOR / INTERMEDIARY         TRANSFER AGENT / FUND ADMIN
  -------------------------       ----------------------------

  1. Submit application form
     + supporting documents  ---->
                                  2. Document Completeness Check
                                     - All required docs received?
                                     - Certified/apostilled where
                                       required?
                                     |
                                     v
                                  3. AML/KYC Verification
                                     - Identity verification
                                     - Sanctions screening (OFAC,
                                       EU, UN, UK HMT)
                                     - PEP screening
                                     - Adverse media check
                                     - Source of funds/wealth
                                     |
                                     v
                                  4. Risk Scoring
                                     - Composite AML risk score
                                     - Determine CDD/SDD/EDD tier
                                     - Senior management sign-off
                                       if EDD required
                                     |
                                     v
                                  5. Eligibility Assessment
                                     - Investor classification
                                       (retail/professional/
                                       qualified/accredited)
                                     - Minimum investment check
                                     - Jurisdiction restrictions
                                     - FATCA/CRS classification
                                     |
                                     v
                                  6. Account Opening
                                     - Assign investor account ID
                                     - Record bank details
                                     - Register tax status
                                     - Set review date based on
                                       risk category
                                     |
                                     v
  7. Receive account        <---- 8. Confirmation
     confirmation + welcome        - Welcome pack sent
     pack                          - Account ready for dealing
```

### 1.1 Documentation Requirements by Investor Type

#### Individual Investors (Natural Persons)

| Document | Purpose | Notes |
|---|---|---|
| Passport or national ID | Identity verification | Certified copy; must be current/unexpired |
| Proof of address | Address verification | Utility bill/bank statement dated within 3 months |
| Source of funds declaration | AML compliance | Describes origin of subscription monies (e.g., savings, sale of property, inheritance) |
| Source of wealth declaration | AML compliance (EDD) | Describes how overall wealth was accumulated; required for high-risk investors |
| Tax self-certification | FATCA/CRS compliance | W-8BEN (US tax purposes) or CRS self-certification form; must include TIN(s) |
| Minimum investment confirmation | Fund eligibility | Checked against prospectus; varies by share class (e.g., EUR 100,000 for institutional class) |

#### Corporate Investors

| Document | Purpose | Notes |
|---|---|---|
| Certificate of incorporation | Legal existence | Certified copy from company registry |
| Memorandum & articles of association | Constitutional powers | Confirms authority to invest |
| Board resolution | Authorization | Authorizes the investment and names signatories |
| Authorized signatory list | Operational | Specimen signatures; updated on change |
| UBO declaration | AML (4AMLD/5AMLD) | All natural persons with >25% ownership or control; full KYC on each UBO |
| Audited financial statements | Source of wealth | Most recent year; demonstrates financial standing |
| Proof of registered address | Address verification | Company registry extract or utility bill |

#### Trust Investors

| Document | Purpose | Notes |
|---|---|---|
| Trust deed (or certified extract) | Legal structure | Confirms trust existence and terms; extract acceptable if full deed is commercially sensitive |
| Trustee identification | AML compliance | Full KYC on each trustee (individual or corporate) |
| Beneficiary identification | AML compliance | KYC on beneficiaries with >25% interest in trust assets |
| Letter of wishes | Context | If relevant; not always legally binding but informs beneficial interest |
| Protector identification | AML compliance | Full KYC if protector has control over investment decisions |
| Source of trust assets | AML compliance | How the trust was funded (settlor's wealth) |

#### Partnership Investors

| Document | Purpose | Notes |
|---|---|---|
| Partnership agreement | Legal structure | Certified copy; confirms partnership terms |
| GP identification | AML compliance | Full KYC on all general partners |
| LP identification | AML compliance | Full KYC on LPs with >25% interest |
| Registered office confirmation | Address verification | Official address from partnership registry |
| Certificate of registration | Legal existence | If registered partnership (e.g., LP, LLP) |

#### Nominee / Omnibus Accounts

| Document | Purpose | Notes |
|---|---|---|
| Nominee agreement | Legal basis | Agreement between nominee and fund/TA |
| Attestation letter | AML reliance | Nominee confirms KYC performed on all underlying investors to equivalent standard |
| Look-through documentation | UCITS V / AIFMD | TA may require look-through to underlying investors; depositary must verify |
| List of underlying investors | Regulatory compliance | May be required on request by regulator or depositary; varies by jurisdiction |

**Look-through obligations:** Under UCITS V and AIFMD, depositaries must ensure they can identify beneficial owners behind omnibus/nominee accounts. The fund TA may request underlying investor information on a periodic or ad-hoc basis. Failure to provide look-through information may result in rejection of the nominee account.

#### Pension Funds

| Document | Purpose | Notes |
|---|---|---|
| Regulatory status documentation | Classification | Proof of registration/authorization with pension regulator |
| Investment authority | Authorization | Board/trustee resolution authorizing fund investment |
| SDD eligibility assessment | Risk classification | Regulated pension funds in FATF-compliant jurisdictions may qualify for SDD |

#### Sovereign Wealth Funds

| Document | Purpose | Notes |
|---|---|---|
| Diplomatic status confirmation | Classification | Official government documentation or diplomatic note |
| Source of funds documentation | AML compliance | Government budget allocation or sovereign mandate |
| SDD eligibility assessment | Risk classification | May qualify for SDD; however, jurisdiction risk assessment still required |
| Authorized signatory list | Operational | Named individuals authorized to transact |

#### Fund of Funds

| Document | Purpose | Notes |
|---|---|---|
| Fund documentation | Legal structure | Prospectus, offering memorandum, or PPM of the investing fund |
| Management company details | AML compliance | Full KYC on the management company / AIFM |
| Underlying investor composition | Look-through | Required when investing fund is non-EU or unregulated; must demonstrate no sanctioned/PEP investors below |
| Regulatory authorization | Classification | Proof of UCITS/AIFMD authorization or equivalent |

---

## 2. AML Risk Scoring Methodology

### 2.1 Risk Factor Scoring Matrix

Each factor is scored 1 (lowest risk) to 5 (highest risk). The composite score determines the risk category.

| Factor | Score 1 (Low) | Score 2 | Score 3 (Medium) | Score 4 | Score 5 (High) |
|---|---|---|---|---|---|
| **Jurisdiction** | EU/EEA, US, UK, AU, SG, JP | Other FATF-compliant | FATF not fully compliant | FATF grey list | FATF black list, sanctioned |
| **Investor type** | Regulated FI, pension fund, government agency | Listed corporate, UCITS fund | Unlisted corporate, private fund | Complex multi-layer structure, trust with opaque beneficiaries | Shell company, bearer shares, no clear UBO |
| **PEP status** | No PEP connection | Family member of domestic PEP | Domestic PEP (current) | Foreign PEP (current) | Head of state, senior military, SOE board |
| **Source of wealth** | Salary / employment income | Regulated business profits, property sale | Inheritance, gifts, investments | Cash-intensive business, newly established entity | Unexplained, inconsistent with profile |
| **Product / transaction** | Single subscription, standard class | Regular subscriptions, multiple classes | Large single subscription (>EUR 1M) | Frequent switches, early redemptions | Round-tripping, layering patterns, in-specie from opaque sources |

### 2.2 Composite Score Calculation

```
Composite Score = (Jurisdiction x 2) + (Investor Type x 1.5) +
                  (PEP Status x 2) + (Source of Wealth x 1.5) +
                  (Product/Transaction x 1)

Maximum possible: 10 + 7.5 + 10 + 7.5 + 5 = 40
```

| Composite Score | Risk Category | Due Diligence Level | Review Frequency |
|---|---|---|---|
| 8-14 | **Low** | SDD (if eligible) or standard CDD | Every 5 years |
| 15-24 | **Medium** | Standard CDD | Every 3 years |
| 25-32 | **High** | EDD | Annually |
| 33-40 | **Very High** | EDD + senior management approval | Every 6 months |

### 2.3 Trigger Events for Immediate Re-Assessment

Regardless of scheduled review dates, the following events trigger immediate re-screening and risk re-assessment:

| Trigger Event | Required Action |
|---|---|
| **Sanctions list update** (OFAC/EU/UN/UK) | Re-screen all investors within 24 hours; escalate any potential matches immediately |
| **Adverse media alert** | Investigate within 5 business days; escalate to MLRO if credible |
| **Unusual transaction pattern** | Flag for investigation; file SAR if suspicion threshold met |
| **Change in beneficial ownership** | Obtain updated UBO declaration; re-perform KYC on new UBOs |
| **Investor jurisdiction change** | Re-assess jurisdiction risk; may trigger EDD or account closure |
| **PEP status change** | Apply EDD procedures; obtain senior management approval for continued relationship |
| **Regulatory intelligence** | Act on FIU guidance, typology alerts, or supervisor letters within 10 business days |

---

## 3. Ongoing Investor Servicing

### 3.1 Bank Detail Changes

Bank detail change fraud is one of the highest operational risks in fund administration.

| Step | Action | Timeframe |
|---|---|---|
| 1 | Receive written request with new bank details | Day 0 |
| 2 | Verify request authenticity: **dual authorization** (two authorized signatories or countersigned by relationship manager) | Day 0 |
| 3 | **Callback verification** to investor on a previously registered phone number (not the number on the change request) | Day 0-1 |
| 4 | **Cooling period:** Hold change for 48-72 hours before activation | Day 1-3 |
| 5 | Send confirmation letter to the **old** registered address (allows investor to flag unauthorized changes) | Day 3 |
| 6 | Process first redemption as a **small test payment** before releasing full amounts | First dealing |

### 3.2 Address Changes

- Written request with supporting documentation (utility bill, bank statement dated within 3 months)
- **Sanctions re-screening** on new address (jurisdiction may change risk category)
- Update registered address on shareholder register
- Confirm change in writing to both old and new addresses

### 3.3 Power of Attorney (PoA) Processing

| Requirement | Detail |
|---|---|
| Format | Notarized and apostilled (if cross-border, per Hague Convention) |
| Scope verification | PoA must explicitly cover investment fund transactions; general PoAs may be insufficient |
| Expiry monitoring | Calendar expiry dates; alert 30 days before expiry; suspend authority upon expiration |
| KYC on attorney | Full KYC/AML on the person exercising the PoA |
| Revocation | Must be in writing; takes effect upon receipt by TA |

### 3.4 Death and Succession

```
  EVENT: Death of registered investor
  =============================================

  1. Receive notification + death certificate
     (certified copy or original)
           |
           v
  2. Freeze account
     - No further transactions permitted
     - Dividends/distributions held in suspense
           |
           v
  3. Receive probate / letters of administration
     - Executor/administrator identification
     - Full KYC on executor
           |
           v
  4. Executor instructions
     - Transfer to beneficiary account(s), OR
     - Redeem and distribute proceeds
           |
           v
  5. KYC on beneficiaries
     - Full onboarding for each beneficiary
       receiving shares by transfer
           |
           v
  6. Execute transfer or redemption
     - Update register
     - Issue contract notes / transfer confirmations
     - Withholding tax (if applicable, e.g., Irish exit tax)
```

**Joint account handling:** Where an account is held jointly, the death of one holder typically results in the surviving holder(s) assuming full ownership (joint tenants / survivorship). For tenants-in-common, the deceased's share passes per their will/intestacy rules and follows the succession process above. Authority is usually "joint" (all must sign) or "several" (any may sign); this must be verified at account opening.

### 3.5 Dormant Accounts

| Parameter | Detail |
|---|---|
| **Definition** | No investor-initiated contact or transaction for 12-36 months (varies by jurisdiction; Ireland typically 15 years for dormant account reporting) |
| **Outreach** | Minimum 3 documented contact attempts (letter, email, phone) before classification |
| **Status** | Flag as dormant on register; cease paper mailings; maintain electronic records |
| **Regulatory reporting** | Report dormant accounts to regulator where required (Ireland: Dormant Accounts Acts 2001-2012 for bank/building society accounts; fund-specific rules vary) |
| **Escheatment** | Transfer unclaimed assets to the state after the prescribed period; varies by jurisdiction (US: state unclaimed property laws, typically 3-5 years; Ireland: 15 years for bank accounts) |

### 3.6 Unclaimed Distributions

- Hold unclaimed income/capital distributions in a suspense account
- Minimum 3 documented attempts to contact the investor (letter to registered address, email, phone)
- If still unclaimed after holding period (typically 6-12 months), reinvest into the fund on behalf of the investor (if permitted by prospectus) or continue to hold in suspense
- After statutory period, escheat to the relevant state authority
- Maintain records indefinitely for future claims

### 3.7 Investor Complaints (CBI Requirements -- Ireland)

| Step | CBI Requirement | Timeframe |
|---|---|---|
| 1 | Acknowledge complaint in writing | Within **5 business days** |
| 2 | Assign complaint handler (not the person complained about) | Day 1 |
| 3 | Investigate thoroughly; gather evidence and internal records | Ongoing |
| 4 | Issue final response letter with findings and any remediation | Within **40 business days** |
| 5 | If unresolved, inform investor of right to escalate to Financial Services and Pensions Ombudsman (FSPO) | In final response |
| 6 | Record complaint in complaints register (details, outcome, remediation, root cause) | Ongoing |
| 7 | Report complaints data to board at least quarterly | Quarterly |
| 8 | Retain complaint files for minimum 6 years | Archival |

---

## 4. Investor Communications

### 4.1 Contract Notes (Trade Confirmations)

Issued after every subscription, redemption, switch, or transfer. Must contain:

| Field | Description |
|---|---|
| Fund name and share class | Full legal name, ISIN (if applicable) |
| Dealing date | The date on which the order was executed |
| NAV per share | Price at which shares were issued or redeemed |
| Number of shares | Quantity subscribed, redeemed, or switched |
| Gross amount | Total consideration before fees |
| Fees and levies | Entry/exit fee, dilution levy, stamp duty (if any) |
| Net amount | Amount payable by/to investor after fees |
| Settlement date | Date of cash/share settlement |
| Currency | Dealing currency and any FX rate applied |

### 4.2 Investor Statements

Issued monthly or quarterly (per fund prospectus). Contents:

- Opening balance (shares held, NAV per share, market value)
- Transactions during period (subscriptions, redemptions, switches, transfers)
- Income received (distributions, dividends)
- Closing balance (shares held, NAV per share, market value)
- NAV per share at period end
- Fund performance (total return for period, YTD, since inception)

### 4.3 Capital Account Statements (Partnerships / PE Funds)

| Line Item | Description |
|---|---|
| Opening capital balance | Prior period closing balance |
| Capital contributions | Drawdowns / capital calls during period |
| Return of capital / distributions | Cash returned to investor |
| Allocated net investment income | Pro-rata share of interest, dividends, rents |
| Allocated realized gains / (losses) | Pro-rata share of disposition gains/losses |
| Allocated unrealized gains / (losses) | Change in fair value of portfolio |
| Management fee allocation | Investor's share of management fees charged |
| Performance fee / carried interest | Investor's share of performance fees (if crystallized) |
| Other expenses | Legal, audit, admin allocated to investor |
| Closing capital balance | End of period capital account value |

### 4.4 Annual Tax Statements

- Taxable income allocated to investor (interest, dividends, capital gains)
- Withholding tax deducted (treaty rate applied, gross-up calculations)
- Irish exit tax (41% on gains/income for Irish-resident investors in offshore funds; 8-year deemed disposal rule)
- CRS-reportable amounts (account balance, gross proceeds, interest, dividends)
- FATCA-reportable amounts (for US persons: account balance, gross income)
- Tax lot information (cost basis per acquisition for US investors)

### 4.5 Distribution Notices

| Field | Description |
|---|---|
| Ex-date | Date after which new buyers do not receive the distribution |
| Record date | Date on which the register is checked to determine eligible recipients |
| Payment date | Date on which distribution is paid to investors |
| Amount per share | Gross distribution amount per share, by class |
| Tax treatment | Income vs. capital, withholding tax rate applied, franking credits (if any) |
| Reinvestment option | Whether automatic reinvestment applies; NAV used for reinvestment |

### 4.6 Regulatory Notifications

| Event | Notice Period | Requirement |
|---|---|---|
| Material prospectus change | **30 days** minimum (CBI) | Written notice to all investors before effective date |
| Fee increase | **30-60 days** (varies by jurisdiction) | Prospectus supplement; investor right to redeem at old fees |
| Change of depositary | **30 days** (UCITS V) | Investor notification; CBI approval required |
| Fund merger proposal | **30 days** (UCITS); **60 days** (certain AIFs) | Merger information document; investor right to redeem or convert free of charge |
| Fund termination | Per prospectus (typically **30-90 days**) | Notice to investors, regulator, and depositary |
| Change of management company | **30 days** | CBI notification; investor right to redeem |
| Strategy change | **30 days** if material | Prospectus update; investor notification |

---

## 5. Forced / Compulsory Redemption

### 5.1 Triggers

| Trigger | Description |
|---|---|
| **AML / sanctions concern** | Investor appears on sanctions list, fails periodic KYC review, or is subject of SAR with confirmed suspicion |
| **Loss of eligible status** | Investor no longer meets qualified/accredited/professional investor criteria (e.g., net worth drops below threshold) |
| **Minimum holding breach** | Partial redemption would leave investor below the minimum holding specified in the prospectus |
| **Regulatory order** | Direction from CBI, SEC, or other regulator to remove a specific investor |
| **Fund termination** | Compulsory redemption of all investors as part of fund wind-down |
| **Tax status change** | Investor becomes a US person in a non-US-registered fund that prohibits US investors |
| **Breach of representations** | Investor provided false information during onboarding |

### 5.2 Process

```
  FORCED REDEMPTION PROCESS
  =============================================

  1. DECISION
     - Board/manager resolution (documented)
     - Legal review of constitutional authority
     - MLRO sign-off (if AML-triggered)
           |
           v
  2. NOTIFICATION
     - Written notice to investor
     - Typical notice period: 10-30 business days
       (per prospectus terms)
     - State reason (except for AML/sanctions where
       tipping-off prohibition may apply)
           |
           v
  3. REDEMPTION
     - Executed at next dealing day NAV
     - No exit fees typically (involuntary)
     - Shares cancelled on register
           |
           v
  4. PAYMENT
     - Net of any applicable withholding tax
     - Payment to registered bank account only
     - If bank account is at a sanctioned institution,
       proceeds held in suspense pending guidance
           |
           v
  5. REGULATORY REPORTING
     - CBI notification for AML-triggered forced
       redemptions (Ireland)
     - SAR filing if not already submitted
     - Record in compliance register
```

### 5.3 Legal Basis

- **Constitutional documents must explicitly provide** for compulsory redemption powers. Without this authority in the prospectus, trust deed, or articles of association, forced redemption may be legally challenged.
- Most Irish-domiciled funds (UCITS and QIAIFs) include standard forced redemption provisions drafted to cover AML, eligibility, minimum holding, and regulatory order scenarios.
- The fund's legal counsel should review each forced redemption before execution to confirm authority and process compliance.

### 5.4 CBI Notification

For AML-triggered forced redemptions of Irish-domiciled funds:
- The fund's MLRO must notify the Central Bank of Ireland
- The notification must include the reason for the forced redemption (without compromising any ongoing investigation)
- Timing: as soon as practicable after the decision, and in any event before execution
- The tipping-off prohibition (Section 49, Criminal Justice (Money Laundering and Terrorist Financing) Act 2010) applies -- the investor must not be informed that the redemption is triggered by a suspicious activity report

---

## 6. Elysium Platform Implications

| Process | Traditional | Elysium On-Chain |
|---|---|---|
| Investor onboarding (KYC) | Paper/PDF documents, manual review | Off-chain with on-chain eligibility flag (whitelisted address) |
| Account status | Register entry | Token transfer hooks enforce eligibility; forced redemption via burn |
| Bank detail changes | Manual process, dual auth | Off-chain; settlement remains fiat-based |
| Forced redemption | Manual share cancellation | Smart contract burn function with FUND_MANAGER role |
| Investor statements | PDF generation, postal/email | On-chain transaction history enriched with off-chain NAV data |
| AML risk scoring | Periodic manual review | Off-chain; risk score could gate on-chain eligibility |
| Dormant account detection | Manual register review | On-chain activity monitoring (no transactions for X blocks/time) |

The core AML/KYC process remains inherently off-chain (document collection, identity verification, sanctions screening). The on-chain layer enforces the *outcome* of these checks through address whitelisting and transfer restrictions, but does not replace the compliance process itself.

---

## Sources

- [Central Bank of Ireland: AML/CFT Guidelines for the Financial Sector](https://www.centralbank.ie/regulation/anti-money-laundering-and-countering-the-financing-of-terrorism)
- [Central Bank of Ireland: Consumer Protection Code 2012](https://www.centralbank.ie/regulation/consumer-protection/consumer-protection-codes-regulations)
- [FATF: Methodology for Assessing AML/CFT Compliance](https://www.fatf-gafi.org/en/publications/Mutualevaluations/Fatf-methodology.html)
- [FATF: High-Risk and Other Monitored Jurisdictions](https://www.fatf-gafi.org/en/countries/black-and-grey-lists.html)
- [Wolfsberg Group: AML Guidance for Investment and Securities Firms](https://www.wolfsberg-principles.com/)
- [Irish Funds: AML Guidance Notes](https://www.irishfunds.ie/)
- [ESMA: Guidelines on Certain Aspects of MiFID II Suitability Requirements](https://www.esma.europa.eu/)
- [EU 4th Anti-Money Laundering Directive (2015/849)](https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=celex%3A32015L0849)
- [EU 5th Anti-Money Laundering Directive (2018/843)](https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=celex%3A32018L0843)
- [EU 6th Anti-Money Laundering Directive (2018/1673)](https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=celex%3A32018L1673)
- [Carta: AML and KYC for Fund Operations](https://carta.com/learn/private-funds/regulations/aml-kyc/)
- [Sanctions.io: CDD, SDD, and KYC Explained](https://www.sanctions.io/blog/cdd-sdd-and-kyc-explained)
- [Financial Services and Pensions Ombudsman (Ireland)](https://www.fspo.ie/)
- [IRS: W-8BEN Instructions](https://www.irs.gov/forms-pubs/about-form-w-8-ben)
- [OECD: Common Reporting Standard (CRS)](https://www.oecd.org/tax/automatic-exchange/common-reporting-standard/)
- [ComplyAdvantage: PEP Screening Best Practices](https://complyadvantage.com/insights/pep-screening/)
- [Deloitte: Investor Onboarding in Asset Management](https://www.deloitte.com/)
- [KPMG: AML Risk Assessment for Fund Administrators](https://kpmg.com/)
