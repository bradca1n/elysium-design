# Fund Accounting Test Data Sources — Comprehensive Mapping

<!-- ~8000 tokens -->
**Date:** 2026-02-13
**Author:** Claude Code
**Role:** researcher
**Status:** final
**Tags:** test-data, fund-accounting, NAV, fees, FX, share-classes, datasets, templates, Excel

---

## Executive Summary

Comprehensive web research identified **40+ data sources** across 9 categories for fund accounting test data. No single source provides end-to-end fund admin test data (positions → NAV → fees → share classes → settlement), but combining 5-7 key sources covers Elysium's full testing surface. The richest free sources are SEC N-PORT filings (real fund holdings), EDHEC hedge fund returns (Kaggle), and several Excel fee/waterfall templates. For multi-currency and share class testing, data will likely need to be synthesized from multiple sources or generated from templates.

## Key Takeaways

1. **No "fund admin in a box" test dataset exists** — the industry is too fragmented. Real fund data is proprietary; public data covers fragments (holdings, returns, fees) but never the full lifecycle.
2. **SEC N-PORT is the best free source for real portfolio positions** — quarterly bulk downloads with structured holdings, identifiers, and debt security details for all US registered funds.
3. **Fee calculation templates are abundant** — NJ Treasury, SmartHelping, Wall Street Oasis, and Eloquens all offer Excel models with HWM, hurdle rates, and waterfall distributions.
4. **Multi-currency + share class test data is the biggest gap** — no public source provides worked examples of multi-class NAV cascades with FX hedging. ALFI and PIMCO publish methodology docs but not numerical datasets.
5. **Industry standards (ILPA, FinDatEx, ISO 20022 SETR) provide structural templates** — useful for defining data schemas and message formats, even if they lack sample numerical data.

---

## Detailed Findings

### Category 1: Real Fund Holdings & Positions

| Source | Format | Content | Access | Elysium Relevance |
|--------|--------|---------|--------|-------------------|
| [SEC N-PORT Data Sets](https://www.sec.gov/data-research/sec-markets-data/form-n-port-data-sets) | Flat CSV (quarterly) | Monthly portfolio holdings for all US registered funds — positions, identifiers, debt security details, derivatives | Free bulk download | **HIGH** — real position data for NAV calculation testing |
| [SEC EDGAR Full-Text Search](https://www.sec.gov/edgar/search/) | XML/XBRL | N-CEN (annual fund info), N-CSR (shareholder reports with financial statements) | Free via EDGAR API | **MEDIUM** — financial statement data, expense ratios, fund metadata |
| [FinanceDatabase (JerBouma)](https://github.com/JerBouma/FinanceDatabase) | CSV | 300K+ symbols: equities, ETFs, funds, indices, currencies, crypto — metadata, sectors, categories | Free (GitHub) | **MEDIUM** — fund/ETF metadata for test fund setup, instrument universe |
| [SEC Financial Statement Data Sets (HansjoergW)](https://github.com/HansjoergW/sec-fincancial-statement-data-set) | CSV | Parsed SEC financial statements, standardized for comparison | Free (GitHub) | **LOW** — corporate financials, not fund-specific |
| [fundholdings (cpackard)](https://github.com/cpackard/fundholdings) | Python/CSV | Web crawler to pull fund holdings from SEC EDGAR | Free (GitHub) | **MEDIUM** — automates N-PORT data extraction |

### Category 2: Fund Returns & Performance Data

| Source | Format | Content | Access | Elysium Relevance |
|--------|--------|---------|--------|-------------------|
| [EDHEC Hedge Fund Index Returns (Kaggle)](https://www.kaggle.com/datasets/petrirautiainen/edhec-hedge-fund-historical-return-index-series) | CSV | 13 hedge fund style indices, monthly returns, historical | Free (Kaggle account) | **HIGH** — performance fee calculation testing, benchmark data |
| [EDHEC Investment Management Datasets (Kaggle)](https://www.kaggle.com/datasets/yousefsaeedian/edhec-investment-management-datasets) | CSV | Course-level investment management data | Free (Kaggle) | **MEDIUM** — educational worked examples |
| [US Funds Dataset from Yahoo Finance (Kaggle)](https://www.kaggle.com/datasets/stefanoleone992/mutual-funds-and-etfs) | CSV | US mutual funds and ETFs — NAV, returns, metadata | Free (Kaggle) | **HIGH** — large-scale NAV history for reconciliation testing |
| [Mutual Fund NAV Data India (Kaggle)](https://www.kaggle.com/datasets/aloktantrik/mutual-fund-nav-data) | CSV | Indian mutual fund daily NAV data | Free (Kaggle) | **LOW** — different market, but useful for volume testing |
| [CRSP Survivor-Bias-Free US Mutual Fund Database](https://www.crsp.org/research/crsp-survivor-bias-free-us-mutual-funds/) | SAS/ASCII | 64K+ funds: monthly returns, NAV, dividends, fees, holdings, asset allocation (1962-present) | Academic license (WRDS) | **HIGH** — gold standard academic dataset, but requires institutional access |
| [Refinitiv Lipper Fund Data](https://www.refinitiv.com/en/financial-data/fund-data/lipper-fund-data) | JSON (API) | 393K+ active share classes, 80+ markets — performance, analytics, fees | Commercial (free trial available) | **HIGH** — most comprehensive commercial source, trial for initial testing |
| [EDHEC-Risk Alternative Indices (direct)](https://climateimpact.edhec.edu/all-downloads-hedge-funds-indices) | CSV | Hedge fund style indices, downloadable directly | Free | **HIGH** — no Kaggle account needed |

### Category 3: Fee Calculation Templates

| Source | Format | Content | Access | Elysium Relevance |
|--------|--------|---------|--------|-------------------|
| [NJ Treasury Performance Fee Template](https://www.nj.gov/treasury/doinvest/Excel/Appendix_Fee_Template.xlsx) | Excel (.xlsx) | State pension's performance fee calculation template for hedge fund managers | **Free direct download** | **HIGH** — real institutional fee template with worked numbers |
| [SmartHelping Hedge Fund Fee Model](https://www.smarthelping.com/2024/02/hedge-fund-fee-model-template-soft.html) | Excel | 15-year simulation, soft hurdle, HWM, 8 visualizations, attorney-vetted | $75 | **HIGH** — most complete fee model found |
| [SmartHelping Multi-Member Fund Tool](https://www.smarthelping.com/2022/03/multi-member-fund-portfolio-management.html) | Excel | Up to 20 members, pro-rata profit distribution, monthly summaries | Paid | **HIGH** — multi-investor allocation testing |
| [SmartHelping Preferred Return Fund Tracker](https://www.smarthelping.com/2022/09/preferred-return-investment-fund.html) | Excel | Up to 30 members, preferred return waterfall | Paid | **MEDIUM** — PE-style waterfall |
| [eFinancialModels Hedge Fund Soft Fee Model](https://www.efinancialmodels.com/downloads/hedge-fund-soft-fee-model-469788/) | Excel | Hedge fund fee model with soft hurdle and HWM | Paid | **MEDIUM** — alternative to SmartHelping |
| [MrExcel Forum Fee Calc](https://www.mrexcel.com/board/threads/mgt-fee-incentive-fee-calc-based-on-hurdle-rate-and-high-water-mark.829349/) | Excel (community) | Community-built management + incentive fee calculator | Free (forum) | **MEDIUM** — basic but free worked example |

### Category 4: Waterfall Distribution Templates

| Source | Format | Content | Access | Elysium Relevance |
|--------|--------|---------|--------|-------------------|
| [ExInFM Cash Flow Waterfall](https://exinfm.com/excel%20files/Cash%20Flow%20Waterfall.xls) | Excel (.xls) | Distribution of proceeds using hurdle rates | **Free direct download** | **HIGH** — free waterfall with hurdles |
| [Wall Street Oasis PE Waterfall Template](https://www.wallstreetoasis.com/resources/templates/excel-financial-modeling/private-equity-distribution-waterfall-template) | Excel | LP/GP distribution, American/European waterfall logic | Free (registration) | **HIGH** — industry-standard template |
| [Eloquens PE Waterfall Model](https://www.eloquens.com/tool/94xvhNyX/finance/private-equity/private-equity-waterfall-distribution-model-excel-template) | Excel | Carried interest waterfall, LP/GP, dashboards, scenarios | Paid | **MEDIUM** — most feature-rich |
| [Eloquens Customizable Carried Interest](https://www.eloquens.com/tool/bgLIZk/finance/private-equity/customizable-carried-interest-waterfall-excel-template) | Excel | Monthly/quarterly/semi-annual/annual schedules, clawback | Paid | **MEDIUM** — schedule flexibility |
| [Projectify Fund Distribution Waterfall](https://www.useprojectify.com/product-page/fund-distribution-waterfall-model) | Excel | 10 investments, quarterly over 10 years, 3 scenarios, management fee | Paid | **MEDIUM** — comprehensive PE model |
| [A Simple Model — Distribution Waterfall](https://www.asimplemodel.com/insights/distribution-waterfall) | Web + Excel | Educational waterfall walkthrough with Excel examples | Free | **MEDIUM** — good for understanding logic |

### Category 5: Swing Pricing & Anti-Dilution Data

| Source | Format | Content | Access | Elysium Relevance |
|--------|--------|---------|--------|-------------------|
| [ALFI Swing Pricing Brochure 2022](https://www.alfi.lu/getattachment/3154f4f7-f150-4594-a9e3-fd7baaa31361/app_data-import-alfi-alfi-swing-pricing-brochure-2022.pdf) | PDF | Luxembourg industry guide: worked examples, threshold calculation, swing factor methodology | Free | **HIGH** — authoritative with numerical examples |
| [AFG Swing Pricing Code of Conduct](https://www.afg.asso.fr/app/uploads/2020/12/guidepro-swingpricing-eng-201207web-1.pdf) | PDF | French guide: calculation formulas, cost estimation, governance | Free | **HIGH** — complementary French perspective |
| [BlackRock Swing Pricing Whitepaper](https://www.blackrock.com/corporate/literature/whitepaper/spotlight-swing-pricing-raising-the-bar-september-2021.pdf) | PDF | Implementation guide, factor calibration, market impact | Free | **MEDIUM** — practitioner perspective |
| [Vanguard Swing Pricing Guide](https://www.vanguard.co.uk/content/dam/intl/europe/documents/en/swing-pricing-guide.pdf) | PDF | Investor-facing explanation with examples | Free | **LOW** — simplified but good for validation |
| [The IA Enhancing Fund Pricing](https://www.theia.org/sites/default/files/2022-10/Enhancing%20Fund%20Pricing%20October%202022_0.pdf) | PDF | UK Investment Association comprehensive fund pricing guide | Free | **HIGH** — covers ADL, swing, dual pricing |

### Category 6: Multi-Currency & FX Hedging

| Source | Format | Content | Access | Elysium Relevance |
|--------|--------|---------|--------|-------------------|
| [Neuberger Berman: Share Class Currency Hedging Explained](https://www.nb.com/documents/public/en-gb/share_class_currency_hedging_explained.pdf) | PDF | Mechanics of hedged share classes, forward rolling, P&L allocation | Free | **HIGH** — closest to Elysium's FX model |
| [PIMCO: Understanding Hedged Share Classes](https://www.pimco.com/gbl/en/resources/education/understanding-hedged-share-classes) | Web | Hedge ratio monitoring, threshold-based rebalancing, interest rate differential | Free | **MEDIUM** — methodology, no numerical dataset |
| [The Hedge Fund Journal: Hedged Currency Classes](https://thehedgefundjournal.com/hedged-currency-classes/) | Web | Proportion accounts, spot + forward mechanics, roll methodology | Free | **HIGH** — detailed operational description |
| [FundCalibre: Fund Currency Denominations](https://www.fundcalibre.com/cpd-article/fund-currency-denominations-and-share-classes-the-role-they-play-in-a-portfolio) | Web | CPD article on denomination vs hedging vs base currency | Free | **LOW** — educational only |

### Category 7: Industry-Standard Reporting Templates

| Source | Format | Content | Access | Elysium Relevance |
|--------|--------|---------|--------|-------------------|
| [ILPA Reporting Template](https://ilpa.org/industry-guidance/templates-standards-model-documents/updated-ilpa-templates-hub/ilpa-reporting-template/) | Excel + XML | PE fund reporting: fees, expenses, carried interest, capital calls, distributions | Free (registration) | **HIGH** — industry standard for PE reporting data schema |
| [ILPA Capital Call & Distribution Template](https://ilpa.org/capital-call-distribution-quarterly-reporting/) | Excel | Capital call/distribution notices with line-item detail | Free (registration) | **HIGH** — investor communication data format |
| [ILPA Performance Template](https://ilpa.org/industry-guidance/templates-standards-model-documents/) | Excel | Two methodologies: granular and gross performance | Free (registration) | **HIGH** — GIPS-adjacent performance data |
| [FinDatEx Templates (EMT, EPT, EET, TPT)](https://findatex.eu/) | Excel/CSV | European regulatory data exchange: MiFID II, PRIIPs, ESG, Solvency II | Free | **MEDIUM** — regulatory reporting schemas |
| [SWIFT ISO 20022 SETR Messages](https://www.iotafinance.com/en/SWIFT-ISO20022-Message-setr-004-001-Redemption-Order.html) | XML Schema | Subscription (setr.010), Redemption (setr.004), Switch (setr.013) order message formats | Free (spec) | **HIGH** — defines order data structure |
| [ALFI UCITS Sub/Red Guidelines](https://www.alfi.lu/alfi/media/statements/2012/alfi_ucits-iv-subsreds_guidelines_v-3_feb2012.pdf) | PDF | Best practice for subscription/redemption processing | Free | **MEDIUM** — process standards, not data |

### Category 8: Academic & Research Databases

| Source | Format | Content | Access | Elysium Relevance |
|--------|--------|---------|--------|-------------------|
| [CRSP Mutual Fund Database](https://www.crsp.org/research/crsp-survivor-bias-free-us-mutual-funds/) | SAS/ASCII/R | 64K+ funds, monthly returns, NAV, dividends, fees, holdings, asset allocation | Academic (WRDS) | **HIGH** — comprehensive but requires license |
| [Refinitiv Lipper Fund Database](https://www.refinitiv.com/en/financial-data/fund-data/lipper-fund-data) | JSON API | 393K+ share classes, 80+ markets, performance, fees | Commercial (trial) | **HIGH** — global coverage including share classes |
| [Morningstar (via mstarpy)](https://github.com/Mael-J/mstarpy) | Python/JSON | Fund metadata, ratings, performance via open-source scraper | Free (Python) | **MEDIUM** — useful for fund metadata |
| [OpenBB Platform](https://github.com/OpenBB-finance/OpenBB) | Python | Open-source financial data platform, multi-source aggregation | Free | **LOW** — aggregator, not primary source |
| [GIPS Standards Handbook](https://www.gipsstandards.org/standards/gips-standards-for-firms/gips-standards-handbook-for-firms/) | PDF | Sample GIPS-compliant presentations and composite descriptions | Free | **MEDIUM** — performance reporting standards |

### Category 9: Valuation & Financial Modeling Templates

| Source | Format | Content | Access | Elysium Relevance |
|--------|--------|---------|--------|-------------------|
| [ExInFM 75+ Free Spreadsheets](https://exinfm.com/free_spreadsheets.html) | Excel (.xls) | DCF, LBO, FCFE/FCFF valuation, portfolio optimization, cash flow models | Free | **LOW** — corporate finance, not fund accounting |
| [Wall Street Mojo NAV Calculator](https://www.wallstreetmojo.com/net-asset-value-nav-formula/) | Web + Excel | Basic NAV formula with downloadable Excel template | Free | **LOW** — too simple for Elysium's needs |
| [Breaking Down Finance: Hedge Fund Fees](https://breakingdownfinance.com/finance-topics/alternative-investments/hedge-fund-fee-structure/) | Web | 2-and-20 structure explanation with worked examples | Free | **LOW** — educational reference |
| [Corporate Finance Institute: HWM](https://corporatefinanceinstitute.com/resources/career-map/sell-side/capital-markets/high-water-mark/) | Web | High water mark definition, example, vs hurdle rate | Free | **LOW** — definitional only |
| [Datarade Fund Data Marketplace](https://datarade.ai/data-categories/fund-data) | Various | Marketplace listing commercial fund data providers | Commercial | **LOW** — directory, not data |

---

## Recommended Test Data Assembly Strategy

### Tier 1: Free & Immediately Usable (start here)

1. **SEC N-PORT bulk download** → real US fund positions, identifiers, security types
2. **NJ Treasury fee template** → institutional performance fee calculation with real numbers
3. **ExInFM waterfall spreadsheet** → hurdle-based distribution model
4. **EDHEC hedge fund returns (Kaggle or direct)** → monthly return series for 13 strategies
5. **ALFI swing pricing brochure** → worked swing pricing examples
6. **ILPA templates** → capital call, distribution, reporting schemas

### Tier 2: Requires Account/License but High Value

7. **US Funds Dataset (Kaggle)** → large-scale NAV + returns for mutual funds and ETFs
8. **SmartHelping fee models** ($75-150) → most complete fee calculation templates
9. **Refinitiv Lipper trial** → global fund data with share class granularity
10. **Wall Street Oasis PE waterfall** → free with registration

### Tier 3: Build/Synthesize (for Elysium-specific gaps)

11. **Multi-class NAV cascade** — no public source exists. Build from: ALFI methodology + NB hedging doc + SmartHelping allocation logic
12. **Multi-currency FX hedging** — synthesize from NB + PIMCO + Hedge Fund Journal operational descriptions
13. **Full dealing cycle** — construct from ISO 20022 SETR message schemas + ALFI sub/red guidelines
14. **Corporate actions processing** — no structured test data found; build scenarios from Nasdaq corporate actions manual

---

## Gap Analysis: What's Missing

| Test Area | Public Data Available? | Action Required |
|-----------|----------------------|-----------------|
| End-to-end NAV lifecycle | **NO** — fragments only | Synthesize from N-PORT positions + fee templates + return data |
| Multi-class NAV with dilution | **NO** | Build custom test cases from ALFI + NB methodology |
| Multi-currency share classes | **NO** — methodology docs only | Generate synthetic data using NB/PIMCO formulas |
| Performance fee equalization | **PARTIAL** — formulas exist, no datasets | Adapt SmartHelping model for equalization scenarios |
| Dealing cycle (sub/red/switch) | **NO** — schema only (ISO 20022) | Build from SETR message definitions + ALFI guidelines |
| FX hedging P&L allocation | **NO** — described but not numerically | Build from Hedge Fund Journal + PIMCO descriptions |
| Swing pricing with real data | **PARTIAL** — ALFI has examples | Extend ALFI examples to multi-class |
| Corporate actions on fund | **NO** | Build from Nasdaq manual + DTCC guidance |
| Reconciliation break scenarios | **NO** | Generate synthetic breaks from N-PORT data |
| Transfer agency register | **NO** | Build from ILPA + ISO 20022 SETR schemas |

---

## Actionable Items

- [ ] Download SEC N-PORT quarterly data set (latest quarter) and extract sample fund portfolio
- [ ] Download NJ Treasury performance fee template (.xlsx) — immediate free resource
- [ ] Download ExInFM waterfall spreadsheet — free hurdle-based distribution model
- [ ] Download EDHEC hedge fund returns from Kaggle or direct EDHEC site
- [ ] Download ALFI swing pricing brochure 2022 PDF — extract numerical examples
- [ ] Register for ILPA templates — reporting, capital call/distribution, performance
- [ ] Download Neuberger Berman hedged share class PDF — extract FX hedging mechanics
- [ ] Register for US Funds Kaggle dataset — large-scale NAV/returns for volume testing
- [ ] Evaluate SmartHelping fee model ($75) — most complete fee calculation template
- [ ] Build synthetic multi-class NAV cascade test data (no public source exists)
- [ ] Build synthetic dealing cycle test data from ISO 20022 SETR schemas
- [ ] Consider Refinitiv Lipper free trial for global share-class-level data
- [ ] Download FinDatEx EMT/EPT templates for European regulatory reporting schemas

---

## Sources

### Regulatory & Institutional
- [SEC N-PORT Data Sets](https://www.sec.gov/data-research/sec-markets-data/form-n-port-data-sets)
- [SEC EDGAR Search](https://www.sec.gov/edgar/search/)
- [NJ Treasury Performance Fee Template](https://www.nj.gov/treasury/doinvest/Excel/Appendix_Fee_Template.xlsx)
- [ILPA Reporting Templates](https://ilpa.org/industry-guidance/templates-standards-model-documents/)
- [ILPA Capital Call & Distribution Template](https://ilpa.org/capital-call-distribution-quarterly-reporting/)
- [FinDatEx Templates](https://findatex.eu/)
- [GIPS Standards](https://www.gipsstandards.org/standards/gips-standards-for-firms/gips-standards-handbook-for-firms/)
- [ISO 20022 SETR Messages](https://www.iotafinance.com/en/SWIFT-ISO20022-Message-setr-004-001-Redemption-Order.html)

### Industry Guides (Free PDFs)
- [ALFI Swing Pricing Brochure 2022](https://www.alfi.lu/getattachment/3154f4f7-f150-4594-a9e3-fd7baaa31361/app_data-import-alfi-alfi-swing-pricing-brochure-2022.pdf)
- [AFG Swing Pricing Code of Conduct](https://www.afg.asso.fr/app/uploads/2020/12/guidepro-swingpricing-eng-201207web-1.pdf)
- [BlackRock Swing Pricing Whitepaper](https://www.blackrock.com/corporate/literature/whitepaper/spotlight-swing-pricing-raising-the-bar-september-2021.pdf)
- [Neuberger Berman Hedged Share Classes](https://www.nb.com/documents/public/en-gb/share_class_currency_hedging_explained.pdf)
- [The IA Enhancing Fund Pricing](https://www.theia.org/sites/default/files/2022-10/Enhancing%20Fund%20Pricing%20October%202022_0.pdf)
- [ALFI UCITS Sub/Red Guidelines](https://www.alfi.lu/alfi/media/statements/2012/alfi_ucits-iv-subsreds_guidelines_v-3_feb2012.pdf)
- [K&L Gates Performance Fee Presentation](https://files.klgates.com/files/185311_peterman_presentation_one.pdf)

### Open Datasets
- [FinanceDatabase (GitHub, 300K+ symbols)](https://github.com/JerBouma/FinanceDatabase)
- [EDHEC Hedge Fund Returns (Kaggle)](https://www.kaggle.com/datasets/petrirautiainen/edhec-hedge-fund-historical-return-index-series)
- [EDHEC Investment Management (Kaggle)](https://www.kaggle.com/datasets/yousefsaeedian/edhec-investment-management-datasets)
- [US Funds from Yahoo Finance (Kaggle)](https://www.kaggle.com/datasets/stefanoleone992/mutual-funds-and-etfs)
- [EDHEC Direct Downloads](https://climateimpact.edhec.edu/all-downloads-hedge-funds-indices)
- [SEC Financial Statement Data Tools (GitHub)](https://github.com/HansjoergW/sec-fincancial-statement-data-set)
- [fundholdings EDGAR Crawler (GitHub)](https://github.com/cpackard/fundholdings)
- [mstarpy Morningstar Scraper (GitHub)](https://github.com/Mael-J/mstarpy)
- [OpenBB Financial Platform](https://github.com/OpenBB-finance/OpenBB)

### Commercial (fee/waterfall templates)
- [SmartHelping Hedge Fund Fee Model](https://www.smarthelping.com/2024/02/hedge-fund-fee-model-template-soft.html)
- [SmartHelping Multi-Member Fund Tool](https://www.smarthelping.com/2022/03/multi-member-fund-portfolio-management.html)
- [Wall Street Oasis PE Waterfall Template](https://www.wallstreetoasis.com/resources/templates/excel-financial-modeling/private-equity-distribution-waterfall-template)
- [Eloquens PE Waterfall Model](https://www.eloquens.com/tool/94xvhNyX/finance/private-equity/private-equity-waterfall-distribution-model-excel-template)
- [Eloquens Carried Interest Template](https://www.eloquens.com/tool/bgLIZk/finance/private-equity/customizable-carried-interest-waterfall-excel-template)
- [eFinancialModels Hedge Fund Fee Model](https://www.efinancialmodels.com/downloads/hedge-fund-soft-fee-model-469788/)
- [Projectify Fund Distribution Waterfall](https://www.useprojectify.com/product-page/fund-distribution-waterfall-model)

### Free Templates & Tools
- [ExInFM Waterfall Distribution Model](https://exinfm.com/excel%20files/Cash%20Flow%20Waterfall.xls)
- [ExInFM Free Spreadsheets (75+)](https://exinfm.com/free_spreadsheets.html)
- [MrExcel Fee Calculator (Forum)](https://www.mrexcel.com/board/threads/mgt-fee-incentive-fee-calc-based-on-hurdle-rate-and-high-water-mark.829349/)
- [A Simple Model: Distribution Waterfall](https://www.asimplemodel.com/insights/distribution-waterfall)
- [Breaking Down Finance: Hedge Fund Fees](https://breakingdownfinance.com/finance-topics/alternative-investments/hedge-fund-fee-structure/)

### Academic/Research
- [CRSP Mutual Fund Database](https://www.crsp.org/research/crsp-survivor-bias-free-us-mutual-funds/)
- [Refinitiv Lipper Fund Data](https://www.refinitiv.com/en/financial-data/fund-data/lipper-fund-data)
- [Datarade Fund Data Marketplace](https://datarade.ai/data-categories/fund-data)

---

---

## Appendix: Smart Contract Layer Test Data (Core Logic Focus)

The following sources are specifically relevant for testing Elysium's smart contract logic — where NAV comes in as an external input and everything downstream (share pricing, subscriptions, redemptions, fee accruals, investor register, multi-class allocation) needs validation.

### A. Industry-Standard Reporting Templates (Data Schemas)

| Source | Format | What It Models | Download |
|--------|--------|---------------|----------|
| **[ILPA Reporting Template v2.0](https://ilpa.org/industry-guidance/templates-standards-model-documents/updated-ilpa-templates-hub/ilpa-reporting-template/)** | Excel + XML | Fees, expenses, carried interest allocation across investors. Industry standard for PE reporting. Q1 2026 implementation. | Free (registration) |
| **[ILPA Capital Call & Distribution Template (Sept 2025)](https://ilpa.org/industry-guidance/templates-standards-model-documents/updated-ilpa-templates-hub/ilpa-capital-call-distribution-template/)** | Excel | Capital call notices, distribution notices, investor-level allocation, fee line items. Updated Sept 2025. | Free (registration) |
| **[ILPA Performance Template](https://ilpa.org/industry-guidance/templates-standards-model-documents/)** | Excel | Two methodologies (granular + gross). IRR, MOIC, TVPI, DPI at investor/fund level. | Free (registration) |
| **[FinDatEx EMT/EPT/EET Templates](https://findatex.eu/)** | Excel/CSV | European MiFID II + PRIIPs + ESG regulatory data exchange. Fee disclosure, performance scenarios, product costs. | Free |
| **[ISO 20022 SETR Fund Orders](https://www.iotafinance.com/en/SWIFT-ISO20022-Message-setr-004-001-Redemption-Order.html)** | XML Schema | Subscription (setr.010), Redemption (setr.004), Switch (setr.013) messages. Defines data structure for dealing orders. | Free (spec) |

### B. Fee & Waterfall Calculation Models (Numerical Data)

| Source | Format | What It Calculates | Cost |
|--------|--------|-------------------|------|
| **[NJ Treasury Performance Fee Template](https://www.nj.gov/treasury/doinvest/Excel/Appendix_Fee_Template.xlsx)** | .xlsx | Real state pension's performance fee calculation. Hurdle rates, HWM, worked numbers. | **Free** |
| **[SmartHelping Hedge Fund Fee Model](https://www.smarthelping.com/2024/02/hedge-fund-fee-model-template-soft.html)** | Excel | 15-year simulation: soft hurdle + HWM + management fee. 8 charts. Attorney-vetted. | $75 |
| **[SmartHelping Multi-Member Fund Tool](https://www.smarthelping.com/2022/03/multi-member-fund-portfolio-management.html)** | Excel | 20 members, pro-rata profit distribution, monthly investor summaries, subscription/withdrawal tracking. | Paid |
| **[ExInFM Cash Flow Waterfall](https://exinfm.com/excel%20files/Cash%20Flow%20Waterfall.xls)** | .xls | Distribution waterfall with hurdle rates. | **Free** |
| **[WSO PE Waterfall Template](https://www.wallstreetoasis.com/resources/templates/excel-financial-modeling/private-equity-distribution-waterfall-template)** | Excel | LP/GP distribution, American/European waterfall. Plug-and-play. | Free (register) |
| **[eFinancialModels PE Fund Cashflows](https://www.efinancialmodels.com/downloads/private-equity-fund-model-investor-cashflows-180441/)** | Excel | Investor-level cashflows, NAV per unit, IRR/MOIC/TVPI/DPI, American + European waterfall. | Paid |
| **[MrExcel Mgmt+Incentive Fee Calc](https://www.mrexcel.com/board/threads/mgt-fee-incentive-fee-calc-based-on-hurdle-rate-and-high-water-mark.829349/)** | Excel | Community-built mgmt fee + incentive fee with hurdle + HWM. | **Free** |

### C. Illustrative Fund Financial Statements (Worked Data)

These contain **real worked numbers** for capital accounts, fee allocations, NAV per share, and investor-level statements:

| Source | Format | Content | Download |
|--------|--------|---------|----------|
| **[KPMG Illustrative Hedge Fund FS 2025](https://kpmg.com/kpmg-us/content/dam/kpmg/pdf/2025/illustrative-financial-statement-hedge-funds-2025.pdf)** | PDF | US GAAP: capital accounts, management fee, performance fee allocation, NAV per share, statement of operations, changes in net assets. Domestic, offshore, master/feeder, fund of funds. | **Free** |
| **[KPMG Illustrative PE Fund FS 2025](https://kpmg.com/us/en/articles/2025/private-capital-illustrative-financial-statements-2025.html)** | PDF | US GAAP: capital accounts, carried interest, waterfall, fair value hierarchy, investor allocation. | **Free** |
| **[PwC Illustrative IFRS Investment Funds 2024](https://viewpoint.pwc.com/dt/gx/en/pwc/example_accounts/industry_illustrativ/investment_funds/assets/Illustrative_IFRS_financial_statements_2024_Investment_funds_FINAL.pdf)** | PDF | IFRS: statement of comprehensive income, changes in net assets attributable to redeemable shares, fee disclosures, multi-class. | **Free** |
| **[CohnReznick Hedge Fund Illustrative FS](https://www.cohnreznick.com/insights/hedge-fund-illustrative-financial-statements)** | PDF | GAAP: capital account per investor class, fee allocation, side pocket accounting. | **Free** |
| **[Richey May Hedge Fund FS Template 2023](https://richeymay.com/wp-content/uploads/2024/01/RM_2023_FinancialStatement_HedgeFund.pdf)** | PDF | Complete template: statement of assets/liabilities, operations, changes in net assets, financial highlights, fee schedules. | **Free** |

### D. Share Issuance & Subscription/Redemption Tools

| Source | Format | What It Models | Cost |
|--------|--------|---------------|------|
| **[Spreadsheet.fund](https://spreadsheet.fund/)** | Google Sheets Add-on | **Full fund admin in a spreadsheet:** share issuance/redemption with fees, NAV per unit, investor register, portfolio tracking, performance snapshots. Closest to Elysium's on-chain model. | Free (basic) |
| **[Chainlink DTA Technical Standard](https://docs.chain.link/dta-technical-standard)** | Technical spec + docs | On-chain subscription/redemption flow, compliance checks, escrow, settlement, multi-chain. UBS live implementation. | Free (spec) |
| **[Fume Finance On-Chain NAV](https://docs.fume.finance/user-guides/nav-calculation)** | Technical docs | On-chain NAV calculation, share equalization, fee execution. ERC-6909 based. Closest competitor to Elysium's architecture. | Free (docs) |

### E. FX Hedging & Multi-Currency

| Source | Format | Content | Cost |
|--------|--------|---------|------|
| **[Neuberger Berman: Hedged Share Classes](https://www.nb.com/documents/public/en-gb/share_class_currency_hedging_explained.pdf)** | PDF | Forward rolling mechanics, spot/forward at sub/red, P&L allocation to hedged classes, proportion accounts. | **Free** |
| **[PIMCO: Understanding Hedged Share Classes](https://www.pimco.com/gbl/en/resources/education/understanding-hedged-share-classes)** | Web | Hedge ratio monitoring, threshold rebalancing, interest rate differential impact. | **Free** |
| **[Hedge Fund Journal: Hedged Currency Classes](https://thehedgefundjournal.com/hedged-currency-classes/)** | Web | Operational detail: proportion accounts per class, daily monitoring, roll methodology, P&L attribution. | **Free** |

### F. Swing Pricing / Anti-Dilution

| Source | Format | Content | Cost |
|--------|--------|---------|------|
| **[ALFI Swing Pricing Brochure 2022](https://www.alfi.lu/getattachment/3154f4f7-f150-4594-a9e3-fd7baaa31361/app_data-import-alfi-alfi-swing-pricing-brochure-2022.pdf)** | PDF | Threshold calc, swing factor calibration, partial vs full swing, worked numerical examples. | **Free** |
| **[The IA Enhancing Fund Pricing (UK)](https://www.theia.org/sites/default/files/2022-10/Enhancing%20Fund%20Pricing%20October%202022_0.pdf)** | PDF | ADL, swing pricing, dual pricing — comprehensive UK industry guide. | **Free** |
| **[AFG Code of Conduct](https://www.afg.asso.fr/app/uploads/2020/12/guidepro-swingpricing-eng-201207web-1.pdf)** | PDF | French perspective: cost estimation formulas, governance, calculation methodology. | **Free** |

---

## Related Context

- `domain/FUND_ACCOUNTING.md` — NAV calculation, pricing chains, journal entries
- `domain/NAV_METHODOLOGY.md` — Pricing regimes, NAV components, swing pricing
- `domain/FEES_AND_EQUALIZATION.md` — Management/performance fees, HWM, equalization
- `domain/SHARE_CLASSES.md` — Class mechanics, hedging, denomination currencies
- `domain/TRANSFER_AGENCY.md` — Subscription/redemption workflows, dealing cycles
- `domain/RECONCILIATION_AND_OPS.md` — Daily NAV production, position/cash reconciliation
- `domain/DISTRIBUTIONS_AND_INCOME.md` — Distribution policy, income equalization
- `domain/ACCOUNTING_STANDARDS.md` — IFRS/US GAAP, ASC 946, fair value hierarchy
- `technical/SMART_CONTRACTS.md` — Diamond pattern, on-chain price formula, dilution system
