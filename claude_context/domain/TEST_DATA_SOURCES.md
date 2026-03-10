# Fund Accounting Test Data Sources

<!-- ~9000 tokens -->
**Last Updated:** 2026-02-13

**Cross-references:** `FUND_ACCOUNTING.md` (NAV calculation, pricing chains), `FEES_AND_EQUALIZATION.md` (management/performance fees, HWM, equalization), `SHARE_CLASSES.md` (class mechanics, hedging), `TRANSFER_AGENCY.md` (subscription/redemption workflows), `NAV_METHODOLOGY.md` (swing pricing, anti-dilution), `technical/SMART_CONTRACTS.md` (on-chain price formula, dilution system)

---

## Landscape Overview

No single public source provides end-to-end fund administration test data covering the full lifecycle (NAV input → share pricing → subscription/redemption → fee accrual → investor allocation → settlement). The industry is fragmented across regulatory filings (SEC), industry associations (ILPA, ALFI, EFAMA), Big Four accounting firms (KPMG, PwC), financial modeling vendors (SmartHelping, eFinancialModels), academic databases (CRSP, EDHEC), and a small number of on-chain fund platforms (Fume Finance, Chainlink DTA).

For Elysium's purposes, data sources divide into two tiers of relevance:

1. **Core smart contract logic** (highest priority): share class pricing, subscription/redemption, fee calculations, investor register, multi-class allocation, swing pricing. NAV enters as an external input.
2. **Position-level data** (lower priority for now): portfolio holdings, security pricing, reconciliation. Needed eventually but downstream of the smart contract layer.

---

## 1. Industry-Standard Reporting Templates

### ILPA (Institutional Limited Partners Association)

The closest thing to an "industry API specification" for fund operations. Defines data fields and line items that institutional investors expect. All templates are Excel-based, free with registration at [ilpa.org](https://ilpa.org/industry-guidance/templates-standards-model-documents/).

- **Reporting Template v2.0** — Fees, expenses, and carried interest reporting. Promotes uniform practices across the PE industry. Available in Excel and XML. Implementation target: Q1 2026 for new funds.
- **Capital Call & Distribution Template (Sept 2025 update)** — Standardizes capital call and distribution notices. Investor-level allocation with fee line-item detail. Shows how capital is allocated and how cash flow requirements are managed.
- **Performance Template** — Two calculation methodologies (granular and gross). Covers IRR, MOIC, TVPI, DPI at both investor and fund level.
- **Model Subscription Agreement** — Standardized subscription document. Defines data captured at investor onboarding.
- **Portfolio Company Metrics Template** — Standardized reporting of underlying investment metrics for buyout and growth equity funds.

**Elysium relevance:** ILPA templates define the acceptance criteria for what a fund admin platform should output. If Elysium's smart contracts produce data that maps to ILPA fields, the platform speaks the industry language. Most directly useful: the Capital Call & Distribution template (maps to Elysium's order/settlement flow) and the Reporting Template (maps to fee/expense output).

### FinDatEx (Financial Data Exchange Templates)

Joint initiative by European financial industry associations (EFAMA, EBF, Insurance Europe, and others). Standardizes data exchange for EU regulatory compliance. All templates free at [findatex.eu](https://findatex.eu/).

- **European MiFID Template (EMT)** — Product cost disclosure, fee structures, target market definitions.
- **European PRIIPs Template (EPT)** — Key information for packaged retail investment products. Performance scenarios, cost calculations.
- **European ESG Template (EET)** — ESG risk factors, sustainability disclosures.
- **Solvency II Tripartite Template (TPT)** — Portfolio composition exchange between asset managers and insurers.

**Elysium relevance:** Defines European regulatory reporting schemas. The EMT and EPT templates are relevant for fee disclosure and performance scenario outputs that Elysium may need to generate.

### ISO 20022 SETR Messages (Fund Order Standards)

The international standard for fund order messaging. Defines the exact XML data structures for subscription, redemption, and switch transactions. Specifications available at [iso20022.org](https://www.iso20022.org/iso-20022-message-definitions) and [iotafinance.com](https://www.iotafinance.com/en/SWIFT-ISO20022-Message-setr-004-001-Redemption-Order.html).

- **setr.010 — Subscription Order** — Instructing party → transfer agent. Single or multiple orders per financial instrument per account.
- **setr.004 — Redemption Order** — Instructing party → transfer agent. Supports partial and full redemptions.
- **setr.013 — Switch Order** — Redemption from one instrument + subscription to another. Supports one-to-one, many-to-one, many-to-many, and one-to-many switches.

**Elysium relevance:** Defines the data model for dealing orders. Elysium's OrderManagementFacet and OrderValidationFacet should handle the same data concepts (investor account, fund/class identifier, amount/quantity, dealing date, settlement date, fee basis).

### INREV (Non-Listed Real Estate)

European association providing standardized NAV calculation and reporting guidelines for non-listed real estate vehicles. Templates available to members at [inrev.org](https://www.inrev.org/standards).

- **INREV NAV Guidelines** — Standard for calculating and disclosing NAV. Improves comparability across vehicles.
- **Standard Data Delivery Sheet (SDDS)** — Standardized data exchange between managers and investors.
- **Due Diligence Questionnaire** — Standardized assessment framework.

**Elysium relevance:** Lower priority (real estate-specific), but the NAV standardization methodology is instructive for how industry bodies define comparable NAV calculations.

---

## 2. Fee & Waterfall Calculation Models

### Free Resources

- **NJ Treasury Performance Fee Template** ([direct .xlsx download](https://www.nj.gov/treasury/doinvest/Excel/Appendix_Fee_Template.xlsx)) — New Jersey state pension's actual performance fee calculation template used with hedge fund managers. Contains worked numerical examples with hurdle rates and HWM. Most authoritative free source.
- **ExInFM Cash Flow Waterfall** ([direct .xls download](https://exinfm.com/excel%20files/Cash%20Flow%20Waterfall.xls)) — Hurdle-based distribution of proceeds model. Part of the Excellence in Financial Management library of 75+ free financial spreadsheets at [exinfm.com](https://exinfm.com/free_spreadsheets.html).
- **MrExcel Community Fee Calculator** ([forum thread](https://www.mrexcel.com/board/threads/mgt-fee-incentive-fee-calc-based-on-hurdle-rate-and-high-water-mark.829349/)) — Community-built management fee + incentive fee calculator with hurdle rate and HWM. Basic but functional.
- **Wall Street Oasis PE Waterfall** ([free with registration](https://www.wallstreetoasis.com/resources/templates/excel-financial-modeling/private-equity-distribution-waterfall-template)) — LP/GP distribution template supporting American and European waterfall logic. Plug-and-play Excel.
- **A Simple Model: Distribution Waterfall** ([asimplemodel.com](https://www.asimplemodel.com/insights/distribution-waterfall)) — Educational walkthrough of waterfall mechanics with Excel examples.

### Commercial Models ($75–$200)

- **SmartHelping Hedge Fund Fee Model** ($75, [smarthelping.com](https://www.smarthelping.com/2024/02/hedge-fund-fee-model-template-soft.html)) — Most complete fee model found. 15-year simulation, soft hurdle with annual reset, HWM enforcement, optional asset management fee, 8 visualizations, attorney-vetted. Editable and unlocked.
- **SmartHelping Multi-Member Fund Tool** (paid, [smarthelping.com](https://www.smarthelping.com/2022/03/multi-member-fund-portfolio-management.html)) — Up to 20 members, pro-rata profit distribution based on deposits/withdrawals, monthly client summaries, holdings by asset type over time.
- **SmartHelping Preferred Return Fund Tracker** (paid, [smarthelping.com](https://www.smarthelping.com/2022/09/preferred-return-investment-fund.html)) — Up to 30 members, preferred return waterfall. PE-style distribution.
- **eFinancialModels PE Fund Cashflows** (paid, [efinancialmodels.com](https://www.efinancialmodels.com/downloads/private-equity-fund-model-investor-cashflows-180441/)) — Investor-level cashflows, NAV per unit, gross/net IRR, MOIC, TVPI, DPI, American + European waterfall. LP and GP perspectives.
- **Eloquens Carried Interest Template** (paid, [eloquens.com](https://www.eloquens.com/tool/bgLIZk/finance/private-equity/customizable-carried-interest-waterfall-excel-template)) — Fully customizable hurdle rate, preferred return, carried interest, clawback. Monthly/quarterly/semi-annual/annual schedules.

---

## 3. Illustrative Financial Statements (Big Four + Specialist Firms)

These contain **fully worked numerical examples** of fund financial statements — capital accounts per investor, fee allocations, NAV per share, statement of operations, and changes in net assets. All free PDFs.

- **KPMG Illustrative Hedge Fund FS (2025)** ([kpmg.com PDF](https://kpmg.com/kpmg-us/content/dam/kpmg/pdf/2025/illustrative-financial-statement-hedge-funds-2025.pdf)) — US GAAP. Covers domestic, offshore, master/feeder, and fund of funds structures. Capital account statements, management and performance fee allocation, NAV per share.
- **KPMG Illustrative PE Fund FS (2025)** ([kpmg.com](https://kpmg.com/us/en/articles/2025/private-capital-illustrative-financial-statements-2025.html)) — US GAAP. Capital accounts, carried interest, waterfall distribution, fair value hierarchy.
- **KPMG IFRS Investment Funds** ([kpmg.com](https://kpmg.com/xx/en/what-we-do/services/audit/corporate-reporting-institute/ifrs/illustrative-financial-statements/ifs-investment-funds.html)) — IFRS-specific guidance for investment fund disclosures.
- **PwC Illustrative IFRS Investment Funds (2024)** ([pwc.com PDF](https://viewpoint.pwc.com/dt/gx/en/pwc/example_accounts/industry_illustrativ/investment_funds/assets/Illustrative_IFRS_financial_statements_2024_Investment_funds_FINAL.pdf)) — Open-ended investment fund under IFRS. Statement of comprehensive income, changes in net assets attributable to holders of redeemable shares, multi-class disclosures.
- **CohnReznick Hedge Fund Illustrative FS** ([cohnreznick.com](https://www.cohnreznick.com/insights/hedge-fund-illustrative-financial-statements)) — GAAP. Capital account per investor class, fee allocation, side pocket accounting.
- **Richey May Hedge Fund FS Template (2023)** ([PDF](https://richeymay.com/wp-content/uploads/2024/01/RM_2023_FinancialStatement_HedgeFund.pdf)) — Complete template: statement of assets and liabilities, operations, changes in net assets, financial highlights, fee schedules. Also available: PE fund and digital asset fund templates.

**Elysium relevance:** These are the most directly useful sources for validating smart contract outputs. The capital account statements show exactly how NAV flows through fee accruals to per-share values. The multi-structure examples (master/feeder, multi-class) map closely to Elysium's umbrella/fund/class hierarchy.

---

## 4. On-Chain Fund Platforms (Peer Implementations)

### Chainlink Digital Transfer Agent (DTA)

Technical standard defining how transfer agents and fund administrators operate on-chain. First live implementation with UBS in late 2025. Documentation at [docs.chain.link/dta-technical-standard](https://docs.chain.link/dta-technical-standard).

- Subscription/redemption flow with compliance checks, escrow, and settlement
- NAVLink Feeds for pricing tokenized fund subscriptions and redemptions
- Automated Compliance Engine (ACE) for role-based controls
- Cross-chain interoperability via CCIP
- Payment modes for fiat and digital asset settlement

**Elysium relevance:** Most architecturally similar to Elysium's order management and settlement flow. The compliance check → escrow → settlement pattern mirrors Elysium's OrderValidation → OrderManagement → Settlement facet chain. UBS live production validates the approach.

### Fume Finance

On-chain fund platform using ERC-6909 for tokenized fund shares. Documentation at [docs.fume.finance](https://docs.fume.finance/).

- On-chain NAV calculation (NAV = GAV / shares outstanding)
- Share equalization and fee execution in smart contracts
- No limitation on underlying asset class (stocks, digital assets, real estate)
- Claims subscriptions, redemptions, NAV calculations, and fee executions all happen on-chain in milliseconds

**Elysium relevance:** Direct competitor using a different token standard (ERC-6909 vs Elysium's ERC-1155). Their share equalization and fee execution logic can be used to cross-validate Elysium's dilution-based approach. Their documentation of traditional vs on-chain NAV comparison is useful for framing.

### Spreadsheet.fund

Google Sheets add-on that automates fund administration. Available on [Google Workspace Marketplace](https://workspace.google.com/marketplace/app/spreadsheet%E2%80%A2fund/43325720496).

- Share issuance ("minting units") when investors subscribe
- Redemption with customizable fee schedules
- NAV per unit calculation from portfolio snapshots
- Investor register (who holds how many units)
- Daily performance snapshots with total supply and unit price
- Rebalancing calculator with valuation model

**Elysium relevance:** Closest off-chain equivalent to Elysium's on-chain logic. The issuance/redemption flow with fee application mirrors what the smart contracts do. Useful as a reference implementation for expected behavior.

---

## 5. Swing Pricing & Anti-Dilution Data

- **ALFI Swing Pricing Brochure (2022, 3rd edition)** ([PDF](https://www.alfi.lu/getattachment/3154f4f7-f150-4594-a9e3-fd7baaa31361/app_data-import-alfi-alfi-swing-pricing-brochure-2022.pdf)) — Luxembourg industry guide. Contains worked numerical examples: threshold calculation (e.g., net flows of EUR 2M exceed 1% threshold of EUR 100M NAV), swing factor calibration, partial vs full swing. Based on 2022 survey of Luxembourg managers.
- **The IA Enhancing Fund Pricing (UK, 2022)** ([PDF](https://www.theia.org/sites/default/files/2022-10/Enhancing%20Fund%20Pricing%20October%202022_0.pdf)) — UK Investment Association guide covering anti-dilution levy (ADL), swing pricing, and dual pricing comprehensively.
- **AFG Swing Pricing Code of Conduct (France)** ([PDF](https://www.afg.asso.fr/app/uploads/2020/12/guidepro-swingpricing-eng-201207web-1.pdf)) — French perspective: variable ADL formulas, cost estimation methodology, governance requirements.
- **BlackRock Swing Pricing Whitepaper** ([PDF](https://www.blackrock.com/corporate/literature/whitepaper/spotlight-swing-pricing-raising-the-bar-september-2021.pdf)) — Practitioner perspective on factor calibration and market impact.

---

## 6. Multi-Currency & FX Hedging

No public source provides complete numerical test data for multi-currency share class hedging. The following provide the operational methodology from which test data must be synthesized:

- **Neuberger Berman: Share Class Currency Hedging Explained** ([PDF](https://www.nb.com/documents/public/en-gb/share_class_currency_hedging_explained.pdf)) — Most detailed operational description found. Covers: proportion accounts per class in denomination currency, spot FX at subscription/redemption, forward contract rolling, P&L allocation exclusively to hedged classes.
- **PIMCO: Understanding Hedged Share Classes** ([web](https://www.pimco.com/gbl/en/resources/education/understanding-hedged-share-classes)) — Hedge ratio monitoring, threshold-based rebalancing, sources of tracking difference (interest rate differential, cross-currency basis, unrealized P&L, transaction costs, intraday volatility).
- **The Hedge Fund Journal: Hedged Currency Classes** ([web](https://thehedgefundjournal.com/hedged-currency-classes/)) — Operational detail: daily monitoring of hedge cover ratios, adjustment triggers when market movements cross thresholds, forward hedge mechanics.

---

## 7. Fund Returns & Performance Datasets

For performance fee calculation testing and benchmarking:

- **EDHEC Hedge Fund Style Indices** ([direct download](https://climateimpact.edhec.edu/all-downloads-hedge-funds-indices) or [Kaggle](https://www.kaggle.com/datasets/petrirautiainen/edhec-hedge-fund-historical-return-index-series)) — Monthly returns for 13 hedge fund strategies. Free CSV. Also bundled in R's PerformanceAnalytics package.
- **US Funds from Yahoo Finance** ([Kaggle](https://www.kaggle.com/datasets/stefanoleone992/mutual-funds-and-etfs)) — NAV and returns for US mutual funds and ETFs. Free with Kaggle account.
- **CRSP Mutual Fund Database** ([crsp.org](https://www.crsp.org/research/crsp-survivor-bias-free-us-mutual-funds/)) — Gold standard academic dataset: 64K+ funds, monthly returns/NAV/dividends/fees/holdings since 1962. Requires institutional WRDS access.
- **Refinitiv Lipper** ([refinitiv.com](https://www.refinitiv.com/en/financial-data/fund-data/lipper-fund-data)) — 393K+ active share classes across 80+ markets. Commercial with free trial available. Most comprehensive for share-class-level data.

---

## 8. Real Fund Holdings & Position Data

Lower priority for smart contract testing but useful for end-to-end scenarios:

- **SEC N-PORT Data Sets** ([sec.gov](https://www.sec.gov/data-research/sec-markets-data/form-n-port-data-sets)) — Monthly portfolio holdings for all US registered funds. Quarterly bulk CSV download. Positions, identifiers, debt security details, derivatives.
- **FinanceDatabase** ([GitHub](https://github.com/JerBouma/FinanceDatabase)) — 300K+ symbols (equities, ETFs, funds, indices, currencies, crypto). CSV. Useful for instrument universe setup.
- **SEC EDGAR** ([sec.gov](https://www.sec.gov/edgar/search/)) — N-CEN (annual fund info), N-CSR (shareholder reports with financial statements). Free API access.

---

## Gap Analysis

| Test Area | Public Data Available? | Best Source |
|-----------|----------------------|-------------|
| Management fee accrual | YES — worked examples | KPMG illustrative FS, NJ Treasury template |
| Performance fee with HWM | YES — Excel models | SmartHelping ($75), NJ Treasury (free), MrExcel (free) |
| Waterfall distribution | YES — multiple models | ExInFM (free), WSO (free), eFinancialModels (paid) |
| Share issuance/redemption | PARTIAL — schemas + peer code | ISO 20022 SETR, Chainlink DTA, Spreadsheet.fund |
| Multi-class NAV cascade | NO — must synthesize | Build from KPMG multi-structure FS + PwC IFRS multi-class |
| Multi-currency FX hedging | NO — methodology only | Build from NB + PIMCO + HFJ operational descriptions |
| Swing pricing | YES — numerical examples | ALFI brochure 2022 |
| Investor register | PARTIAL — cap table tools | ILPA templates, Spreadsheet.fund |
| Equalization | PARTIAL — formulas only | SmartHelping multi-member tool, K&L Gates presentation |
| Dealing cycle end-to-end | NO — schema only | ISO 20022 SETR + ALFI sub/red guidelines |
