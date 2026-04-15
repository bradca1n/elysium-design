# Tax Considerations for Investment Funds

<!-- ~8500 tokens -->
**Last Updated:** 2026-02-10

---

## 1. Withholding Tax on Dividends & Interest

### How It Works

When a fund receives dividends or interest from underlying investments, the source country typically withholds tax at a statutory rate. For US-source income, the default withholding rate is **30%** on dividends and interest paid to foreign persons. Treaty networks can reduce these rates significantly.

### Common Treaty Rates (Dividends)

| Source Country | Statutory Rate | Treaty Rate (Ireland) | Treaty Rate (Luxembourg) | Treaty Rate (Cayman) |
|---|---|---|---|---|
| **United States** | 30% | 15% (5% if >10% ownership) | 15% (5% if >10% ownership) | 30% (no treaty) |
| **United Kingdom** | 0% | 0% | 0% | 0% |
| **Germany** | 26.375% | 5-15% | 5-15% | 26.375% (no treaty) |
| **France** | 25% | 15% | 5-15% | 25% (no treaty) |
| **Switzerland** | 35% | 0-15% | 0-15% | 35% (no treaty) |
| **Japan** | 20.42% | 10-15% | 5-10% | 20.42% (no treaty) |

### Reclaim Process

1. **Relief at source**: Withholding agent applies reduced treaty rate at payment time (requires W-8BEN-E or equivalent documentation upfront)
2. **Refund/reclaim**: Full statutory rate withheld, fund files reclaim with source-country tax authority (processing time: 6 months to 5+ years depending on jurisdiction)
3. **Beneficial ownership documentation**: Treaty benefits require proof that the fund (or its investors in transparent structures) is the beneficial owner and resident of the treaty jurisdiction

### Key Documents

- **W-8BEN-E**: Entity certification for US-source income (treaty claims, FATCA status)
- **W-8IMY**: For intermediaries and flow-through entities passing income to underlying investors
- **W-9**: US person certification (no withholding needed for domestic)
- **Certificate of Residence**: Issued by home-country tax authority to evidence treaty eligibility

---

## 2. FATCA (Foreign Account Tax Compliance Act)

### Overview

US law requiring Foreign Financial Institutions (FFIs) to identify and report US account holders or face **30% withholding** on US-source payments.

### IGA Models

| Feature | Model 1 IGA | Model 2 IGA |
|---|---|---|
| **Reporting path** | FFI reports to local tax authority, which reports to IRS | FFI reports directly to IRS |
| **Key jurisdictions** | Ireland, Luxembourg, UK, Cayman Islands, most EU | Switzerland, Japan, Hong Kong |
| **GIIN required** | Yes | Yes |
| **FFI Agreement with IRS** | No (covered by IGA) | Yes |
| **Local legislation** | Enacted implementing local law | Supplemented by FFI agreement |

### Fund Obligations

1. **Register with IRS** and obtain a GIIN (Global Intermediary Identification Number) within 30 days of commencing business
2. **Classify investors**: Identify US persons, US-owned foreign entities, recalcitrant account holders
3. **Report annually**: Account balances, income amounts, TINs of US persons
4. **Withhold 30%** on passthru payments to non-compliant FFIs or recalcitrant account holders
5. **Maintain W-8BEN-E / W-9** forms from all investors with valid self-certifications

### Key Forms

| Form | Who Completes | Purpose |
|---|---|---|
| **W-8BEN** | Foreign individual | Claim treaty benefits, certify non-US status |
| **W-8BEN-E** | Foreign entity (including funds) | Certify FATCA status and treaty eligibility |
| **W-8IMY** | Intermediary / flow-through | Pass-through reporting for underlying investors |
| **W-9** | US person | Certify US status, provide TIN |

---

## 3. CRS (Common Reporting Standard)

### Overview

OECD-developed standard for automatic exchange of financial account information between participating jurisdictions. Over 100 jurisdictions participate. The US does **not** participate (relies on FATCA instead).

### How It Applies to Funds

Investment funds are classified as **Investment Entities** (Type A: fund managers; Type B: professionally managed vehicles such as funds, trusts, partnerships). As Reporting Financial Institutions, they must:

1. **Register** with local tax authority (e.g., Cayman TIA Portal by April 30)
2. **Perform due diligence**: Collect self-certifications from all account holders at onboarding
3. **Identify reportable accounts**: Any account held by a tax resident of a reportable jurisdiction
4. **File annual reports** (XML format): Account holder name, address, TIN, jurisdiction of residence, account balance, income amounts
5. **Report by jurisdiction**: Separate filing per reportable jurisdiction (Cayman deadline: July 31)

### CRS 2.0 (Effective January 1, 2026)

- Expanded scope to cover crypto-assets, e-money, CBDCs
- New requirements to identify Controlling Person roles and equity interest holders
- Enhanced due diligence for high-value accounts
- Alignment with FATF standards for anti-money laundering

### Thresholds

- **Pre-existing entity accounts**: No review required if aggregate balance does not exceed USD 250,000
- **New accounts**: Due diligence required at onboarding regardless of balance

---

## 4. Tax-Transparent vs. Tax-Opaque Structures

### Transparent Structures

Income and gains are treated as accruing directly to each investor, as if they never passed through the fund. The fund itself is disregarded for tax purposes.

**Benefit**: Investors can claim treaty relief between their home jurisdiction and the source country of the underlying investments. Pension funds benefit most --- they often qualify for reduced WHT rates or full exemptions under domestic law or treaties.

**Tax drag savings** (vs. opaque): ~39 bps for global equity portfolio, ~18 bps for European equity (Irish Funds Association estimates).

| Structure | Jurisdiction | Tax Status |
|---|---|---|
| **CCF** (Common Contractual Fund) | Ireland | Transparent |
| **FCP** (Fonds Commun de Placement) | Luxembourg | Transparent |
| **Tax-Transparent Fund (TTF)** | UK | Transparent |
| **LP / SCSp** | Multiple | Generally transparent |

### Opaque Structures

The fund is a taxable entity. Treaty benefits depend on the fund's own treaty position, not the investors'. Investors receive net-of-tax returns.

| Structure | Jurisdiction | Tax Status |
|---|---|---|
| **ICAV** | Ireland | Opaque (can elect transparency for certain US investors via check-the-box) |
| **SICAV** | Luxembourg | Opaque |
| **PLC** | Ireland | Opaque |
| **Cayman Exempted Company** | Cayman | Tax neutral (no local tax, opaque for treaty purposes) |
| **Unit Trust** | Ireland / Cayman | Opaque (Ireland) / Neutral (Cayman) |

**Cross-reference**: See `FUND_LIFECYCLE.md` for domicile selection and legal structure comparison.

---

## 5. Jurisdiction-Specific Taxation

### 5.1 Ireland

**Regime**: Gross roll-up with exit tax on chargeable events.

| Feature | Detail |
|---|---|
| **Governing law** | Section 739B TCA (Taxes Consolidation Act 1997) |
| **Fund-level tax** | Exempt --- no Irish tax on income or gains within the fund |
| **Exit tax rate** | 41% (reducing to **38%** under Finance Bill 2025) |
| **Chargeable events** | Redemption, transfer, cancellation, 8-year deemed disposal, certain payments |
| **8-year deemed disposal** | Automatic deemed disposal every 8 years from acquisition, triggering exit tax |
| **Non-resident investors** | Exempt from exit tax (must provide appropriate declaration) |
| **Exempt Irish investors** | Pension funds, charities, credit unions, other investment undertakings, life assurance companies |

**QIAIF (Qualifying Investor AIF)**: Minimum investment EUR 100,000. Exempt from all Irish tax including VAT and duties. Distributions to non-Irish residents free of withholding tax. Available to qualifying investors only.

**L-QIAIF (Loan-originating QIAIF)**: Sub-category permitted to originate loans directly. Same tax exemption as QIAIF. Subject to additional regulatory requirements (leverage limits, concentration limits).

**Declaring vs. Non-Declaring Status**: A "declaring fund" is an offshore fund that distributes substantially all its income annually to Irish investors, allowing them to be taxed on income as received. A "non-declaring fund" subjects Irish investors to exit tax on all gains, including deemed disposals.

### 5.2 Luxembourg

**Regime**: Subscription tax (taxe d'abonnement) on NAV, with fund-level tax exemption on income.

| Fund Type | Subscription Tax Rate | Notes |
|---|---|---|
| **UCITS (Part I UCI)** | 0.05% | Reduced to 0.01% for institutional classes, money market funds |
| **Part II UCI** | 0.05% | Same reductions available |
| **SIF** | 0.01% | Flat rate |
| **RAIF** | 0.01% | Exempt if investing exclusively in risk capital |
| **SICAR** | Exempt | Subject to standard CIT instead |

**Calculation**: Applied to total net assets valued on last day of each quarter, divided by 4.

**Exemptions from subscription tax** (post-July 2023 law): ELTIFs, PEPPs, top-rated money market funds, pension funds, microfinance funds, ETFs, fund-of-funds investing in already-taxed sub-funds.

**SOPARFI Participation Exemption**: Dividends and capital gains exempt from CIT/MBT if:
- Minimum 10% participation OR acquisition price >= EUR 1.2 million
- Subsidiary is fully subject to comparable tax (>= 8.5% rate)
- Held continuously for >= 12 months

**SOPARFI Withholding**: 15% WHT on dividends (reducible to 0% via Parent-Subsidiary Directive or treaties). No WHT on arm's-length interest payments to corporates. Aggregate CIT rate: **23.87%** (from 2025, after CIT reduction to 16%).

### 5.3 Cayman Islands

**Regime**: Tax neutral --- no income tax, capital gains tax, withholding tax, or corporation tax.

| Feature | Detail |
|---|---|
| **Income tax** | None |
| **Capital gains tax** | None |
| **Withholding tax** | None |
| **VAT** | None |
| **Treaty network** | None (tax neutrality eliminates need) |
| **Economic Substance Act (ESA 2018)** | Investment funds are **not** "relevant entities" and are exempt from substance requirements |

**Why it works**: Investors are taxed only in their home jurisdictions. No double taxation. No treaty leakage. The fund structure adds no tax layer. Particularly effective for multi-jurisdiction investor bases where treaty benefits would be inconsistent.

**AEOI Obligations**: Despite tax neutrality, Cayman has full CRS and FATCA reporting obligations:
- Model 1B IGA with the US (FATCA)
- CRS multilateral competent authority agreement (first exchange 2017)
- GIIN registration required within 30 days
- Annual reporting by July 31 via TIA Portal
- CRS Compliance Form by September 15
- **CRS 2.0 and CARF** amendments expected to be enacted soon

### 5.4 Comparison Table

| Feature | Ireland | Luxembourg | Cayman | US (Delaware LP) |
|---|---|---|---|---|
| **Fund-level income tax** | Exempt | Exempt (subscription tax instead) | None | Pass-through (no fund-level) |
| **Annual fund-level charge** | None | 0.01-0.05% NAV | None | None |
| **WHT on distributions** | None (non-residents) / 41% exit tax (Irish taxable) | 15% (reducible to 0%) | None | 0-30% (treaty dependent) |
| **Treaty network** | 76+ treaties | 80+ treaties | None | 60+ treaties |
| **Transparent option** | CCF | FCP / SCSp | LP | LP |
| **Opaque option** | ICAV, PLC | SICAV | Exempted Company | LLC (check-the-box) |
| **Regulatory framework** | CBI (UCITS, AIFMD) | CSSF (UCITS, AIFMD) | CIMA (light touch) | SEC (Advisers Act) |
| **FATCA/CRS** | Yes (Model 1 IGA) | Yes (Model 1 IGA) | Yes (Model 1B IGA) | FATCA (no CRS) |
| **Economic substance rules** | ATAD I/II | ATAD I/II | ESA 2018 (funds exempt) | N/A |

---

## 6. US Tax for Non-US Funds (PFIC, ECI, FIRPTA)

### PFIC (Passive Foreign Investment Company)

Any non-US fund is almost certainly a PFIC from the perspective of US investors. Three taxation regimes:

| Regime | Mechanism | Tax Impact |
|---|---|---|
| **Section 1291 (default)** | Excess distribution method: gains allocated over holding period, taxed at highest marginal rate + interest charge | Punitive --- designed to discourage deferral |
| **QEF Election** | Investor includes pro rata share of fund's ordinary earnings and net capital gains annually | Eliminates interest charge; requires fund to provide PFIC Annual Information Statement |
| **Mark-to-Market** | Investor recognizes gain/loss annually based on fair market value | Only available for marketable stock traded on qualified exchanges |

**QEF election** is the most favorable regime for US investors in non-US funds but requires the fund to provide detailed income information annually (PFIC Annual Information Statement). This is a significant administrative burden for fund administrators.

### ECI (Effectively Connected Income)

Income that is effectively connected with the conduct of a US trade or business is subject to US tax at graduated rates (up to 37% for individuals, 21% for corporations). Non-US funds engaging in active trading in the US risk generating ECI. The **safe harbor** (IRC Section 864(b)(2)) exempts trading in securities and commodities for the fund's own account if the fund is not a dealer and does not have a US office.

### FIRPTA (Foreign Investment in Real Property Tax Act)

Treats gains from disposition of US Real Property Interests (USRPIs) as ECI, subject to US tax regardless of trade-or-business nexus. **15% withholding** on gross proceeds at disposition. Applies to non-US funds holding US real estate or shares in US Real Property Holding Corporations.

**QFPF exemption**: Qualified Foreign Pension Funds are exempt from FIRPTA withholding, though they may still have ECI from rental income.

---

## 7. VAT on Management Fees

### EU Exemption Framework

Article 135(1)(g) of the EU VAT Directive exempts the **management of special investment funds** as defined by Member States. This is a critical cost factor since VAT rates are 20-27% across the EU.

| Service | VAT Status | Notes |
|---|---|---|
| **Fund management (core)** | Exempt | Portfolio management, risk management, compliance |
| **Investment advisory (delegated)** | Exempt | If specific to and essential for fund management (CJEU C-275/11) |
| **Sub-delegated portfolio management** | Exempt | Must form a "distinct whole" specific to fund management |
| **Custodian / depositary fees** | Taxable (generally) | Not considered fund management; some exceptions under case law |
| **Transfer agency** | Exempt (in most EU states) | Regarded as part of fund administration |
| **IT / technology services** | Taxable | General-purpose services, even if used by funds |
| **Tax and accounting services** | Case-by-case | Exempt only if intrinsically linked to fund management (CJEU case law) |
| **Distribution fees** | Taxable (generally) | Marketing and sales activity |

**Key principle**: Services must be **specific to and essential for** the management of the fund, forming a "distinct whole" --- generic services that happen to be consumed by a fund are not exempt.

---

## 8. Substance Requirements & Anti-Avoidance

### BEPS Framework (OECD)

| Action | Relevance to Funds |
|---|---|
| **Action 5** (Harmful Tax Practices) | Substance requirements for preferential regimes |
| **Action 6** (Treaty Abuse) | Principal Purpose Test (PPT) / Limitation on Benefits (LOB) for treaty claims |
| **Action 7** (PE Status) | Commissionnaire arrangements may create PE for fund managers |

### EU ATAD I & II

- **General Anti-Abuse Rule (GAAR)**: Ignore non-genuine arrangements whose main purpose is obtaining a tax advantage
- **Interest limitation**: Deductible interest capped at 30% of EBITDA (or EUR 3 million)
- **CFC rules**: Tax undistributed profits of controlled low-tax subsidiaries
- **Exit taxation**: Tax unrealized gains when assets/residence transferred out of a Member State
- **Hybrid mismatches** (ATAD II): Neutralize deduction/no-inclusion outcomes from hybrid instruments and entities

### DAC6 (Mandatory Disclosure)

EU directive requiring intermediaries (including fund administrators, advisors, law firms) to report cross-border arrangements that meet certain "hallmarks" indicating potential aggressive tax planning. **30-day reporting deadline** from implementation of the arrangement. Retroactive to arrangements implemented on or after June 25, 2018.

Key hallmarks relevant to funds:
- Cross-border payments to zero/low-tax jurisdictions
- Transfer pricing arrangements
- Arrangements involving deductible cross-border payments between associated enterprises
- Arrangements circumventing CRS/FATCA reporting

### Economic Substance Rules (Offshore)

| Jurisdiction | Legislation | Fund Treatment |
|---|---|---|
| **Cayman Islands** | International Tax Co-operation (Economic Substance) Act 2018 | Investment funds **exempt** from substance requirements |
| **BVI** | Economic Substance (Companies and Limited Partnerships) Act 2018 | Investment funds (as "investment business") must demonstrate substance |
| **Jersey** | Economic Substance (Jersey) Law 2019 | Fund management companies require substance; funds themselves less impacted |
| **Guernsey** | Income Tax (Substance Requirements) (Implementation) Regulations 2018 | Similar to Jersey |

### MLI (Multilateral Instrument)

Modifies bilateral tax treaties to implement BEPS measures. Key impact: addition of the **Principal Purpose Test (PPT)** to treaties, which can deny treaty benefits if one of the principal purposes of an arrangement was to obtain treaty benefits. Funds must demonstrate commercial rationale beyond tax reduction.

---

## 9. Tax Reporting to Investors

### US Partnerships: Schedule K-1

US partnerships (including Delaware LPs) issue **Schedule K-1 (Form 1065)** to each partner reporting:
- Partner's share of income, deductions, credits
- Separately stated items (dividends, interest, capital gains, Section 1231 gains)
- Foreign tax credits available for pass-through
- ECI allocation for foreign partners
- PFIC information (if partnership holds PFICs)

**Section 1446 withholding**: Partnership must withhold tax on ECI allocable to foreign partners and file Form 8813 quarterly.

**Deadline**: K-1s due to partners by March 15 (calendar year). Extensions common due to complexity.

### UK Reporting Funds: Excess Reportable Income

Offshore funds with **UK Reporting Fund Status** (registered with HMRC) must:
1. Calculate reportable income per unit for each reporting period
2. Report to HMRC within 6 months of period end
3. Provide statements to UK investors showing their share of reportable income
4. UK investors pay income tax on reportable income (even if not distributed)
5. **Excess reportable income** (reported income minus actual distribution) is deducted from capital gains on eventual disposal, preventing double taxation

**Without reporting fund status**: UK investors taxed on all gains as **income** (up to 45%) rather than capital gains (up to 24%). This makes reporting fund status commercially essential for funds marketing to UK investors.

### Annual Tax Statements & Withholding Tax Certificates

Fund administrators typically provide:

| Document | Purpose | Recipient |
|---|---|---|
| **Annual tax statement** | Summary of distributions, deemed disposals, gains, tax withheld | All investors |
| **Withholding tax certificate** | Evidence of tax withheld at source (for investor's home-country credit claim) | Investors subject to WHT |
| **PFIC Annual Information Statement** | Enables QEF election for US investors | US investors in non-US funds |
| **Tax voucher** | UK-specific document showing income distributed and tax credits | UK investors |
| **CRS/FATCA self-certification** | Investor confirms tax residency for reporting purposes | All investors at onboarding |
| **Reclaim documentation** | Powers of attorney, certificates of residence for WHT reclaim | Fund (not investor-facing) |

**Cross-reference**: See `REGULATORY.md` for reporting obligation timelines and regulatory filings.

---

## 10. Elysium Platform Implications

For the Elysium fund administration platform, tax considerations directly impact:

1. **Investor onboarding**: Collect and validate FATCA/CRS self-certifications, W-8BEN-E forms, certificates of residence
2. **Distribution processing**: Apply correct WHT rates based on investor tax status, domicile, and treaty eligibility
3. **NAV calculation**: Account for tax provisions (WHT receivables, reclaim accruals, exit tax provisions)
4. **Share class design**: Tax-transparent vs. opaque classes, accumulation vs. distribution, declaring vs. non-declaring
5. **Reporting**: Generate K-1s, UK reporting fund calculations, annual tax statements, withholding tax certificates, PFIC Annual Information Statements
6. **Multi-currency settlement**: Tax calculations may require conversion to fund base currency for exit tax / deemed disposal computations
7. **8-year deemed disposal tracking**: Irish-domiciled funds need automated tracking and tax computation on deemed disposal events

---

## Sources

- [PWC - United States Corporate Withholding Taxes](https://taxsummaries.pwc.com/united-states/corporate/withholding-taxes)
- [OECD - Withholding Tax Rates and Tax Treaties 2025](https://www.oecd.org/en/publications/corporate-tax-statistics-2025_6a915941-en/full-report/withholding-tax-rates-and-tax-treaties_e2216eab.html)
- [IRS - Tax Treaty Tables](https://www.irs.gov/individuals/international-taxpayers/tax-treaty-tables)
- [IRS - FATCA FAQs](https://www.irs.gov/businesses/corporations/frequently-asked-questions-faqs-fatca-compliance-legal)
- [Akin Gump - FATCA GIIN Deadline for Model 1 IGA FFIs](https://www.akingump.com/en/insights/alerts/fatca-final-deadline-to-obtain-a-giin-for-model-1-iga-ffis)
- [OECD - Consolidated Text of the CRS (2025)](https://www.oecd.org/en/publications/2025/04/consolidated-text-of-the-common-reporting-standard-2025_e478bc04.html)
- [Rosemont - OECD CRS 2026 New Reporting Rules](https://rosemont-int.com/en/article/news/oecd-crs-2026-what-financial-institutions-need-to-know-about-the-new-reporting-rules)
- [PWC - OECD Amends CRS to Expand Scope](https://www.pwc.com/us/en/services/tax/library/oecd-amends-crs-to-expand-scope-and-enhance-reporting.html)
- [Funds Europe - How Ireland's CCF Differs from the ICAV and PLC](https://funds-europe.com/how-ireland-s-ccf-differs-from-the-icav-and-plc/)
- [Deloitte - Ireland's Common Contractual Fund](https://www.deloitte.com/ie/en/services/tax/analysis/irelands-common-contractual-fund.html)
- [TheAMX - Why Asset Managers Shouldn't Ignore Tax Transparent Funds](https://theamx.com/articles/why-asset-managers-shouldn-t-ignore-tax-transparent-funds/)
- [Ogier - Guide to Tax on Investment Funds in Ireland](https://www.ogier.com/news-and-insights/insights/guide-to-tax-on-investment-funds-in-ireland/)
- [ICLG - Alternative Investment Funds Ireland 2025](https://iclg.com/practice-areas/alternative-investment-funds-laws-and-regulations/ireland)
- [KPMG - Taxation Insights for Irish Investors](https://kpmg.com/ie/en/insights/tax/taxation-insights-for-irish-investors.html)
- [Irish Revenue - TDM Part 27-01A-02](https://www.revenue.ie/en/tax-professionals/tdm/income-tax-capital-gains-tax-corporation-tax/part-27/27-01a-02.pdf)
- [Guichet.lu - Luxembourg Subscription Tax](https://guichet.public.lu/en/entreprises/fiscalite/declaration/instruments-financiers/taxe-abonnement.html)
- [LuxToday - Luxembourg Subscription Tax 2025](https://luxtoday.lu/en/knowledge/subscription-tax-luxembourg)
- [EY - Luxembourg Subscription Tax Modernization](https://www.ey.com/en_gl/technical/tax-alerts/luxembourg-legislation-modernizes-subscription-tax-regime)
- [LuxLex - SOPARFI Tax Guide 2025](https://www.luxlexlaw.com/en/guides/soparfi-guide-fiscal/)
- [PWC - Luxembourg Corporate Withholding Taxes](https://taxsummaries.pwc.com/luxembourg/corporate/withholding-taxes)
- [Harneys - AEOI for Cayman Islands Investment Funds](https://www.harneys.com/funds-hub/resources/introduction-to-automatic-exchange-of-information-for-cayman-islands-investment-funds/)
- [ICLG - Alternative Investment Funds Cayman Islands 2025-2026](https://iclg.com/practice-areas/alternative-investment-funds-laws-and-regulations/cayman-islands)
- [Mourant - Cayman International Transparency Frameworks 2025](https://www.mourant.com/news-and-views/updates/updates-2025/recent-developments-in-cayman-s-international-transparency-frameworks.aspx)
- [IRS - Instructions for Form 8621 (PFIC)](https://www.irs.gov/instructions/i8621)
- [TaxesForExpats - QEF Election Guide](https://www.taxesforexpats.com/articles/investments/qef-election-for-pfic-reporting.html)
- [Norton Rose Fulbright - FIRPTA Primer](https://www.nortonrosefulbright.com/en/knowledge/publications/b7d17100/foreign-investment-in-real-property-tax-act-a-primer)
- [CJEU C-275/11 - VAT Exemption for Fund Advisory Services](https://www.lexgo.be/en/news-and-articles/1565-fund-investment-advisory-services-continue-to-benefit-from-the-vat-fund-management-exemption)
- [VATupdate - ECJ Article 135(1)(g) Case Roadtrip](https://www.vatupdate.com/2025/06/26/roadtrip-through-ecj-cases-focus-on-exemption-management-of-special-investment-funds/)
- [Bloomberg Tax - DAC6 Mandatory Disclosure Regime](https://pro.bloombergtax.com/insights/international-tax/complying-with-dac6/)
- [European Commission - DAC6](https://taxation-customs.ec.europa.eu/taxation/tax-transparency-cooperation/administrative-co-operation-and-mutual-assistance/directive-administrative-cooperation-dac/dac6_en)
- [EY - UK Reporting Fund Status](https://www.ey.com/en_gl/technical/financial-services-technical-resources/what-you-need-to-know-about-uk-reporting-fund-status)
- [GOV.UK - HS265 Offshore Funds](https://www.gov.uk/government/publications/offshore-funds-self-assessment-helpsheet-hs265/hs265-offshore-funds)
- [IRS - Partner's Instructions for Schedule K-1](https://www.irs.gov/instructions/i1065sk1)
