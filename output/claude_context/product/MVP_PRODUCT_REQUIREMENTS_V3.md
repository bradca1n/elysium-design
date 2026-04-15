# Elysium MVP Product Requirements V3

<!-- ~22000 tokens -->
**Last Updated:** 2026-02-10
**Status:** Draft v3
**Tags:** product, mvp, requirements, cayman, crypto, derivatives, spc, irish-admin, phased-launch
**Supersedes:** `MVP_PRODUCT_REQUIREMENTS_V2.md` (v2), `PRODUCT_MVP_REQUIREMENTS.md` (v1)

---

> **Scope:** Minimum viable product for an Irish CBI-licensed fund administration entity servicing a Cayman SPC investing in crypto assets (spot, derivatives, and complex strategies) via centralized exchanges. Requirements are phased by **when they're actually needed** — not all at once. Day 1 launch requires the minimum for legal operation; subsequent capabilities are added before their first deadline.

---

## Part A: Product Definition

### A.1 What We Are

A **fund administration platform** that lets successful crypto traders become regulated fund managers. They bring their trading strategy. Elysium handles everything else — fund setup, investor onboarding, NAV, fees, compliance, reporting.

**Admin entity:** Irish CBI-authorized (Section 10, IIA 1995).
**Fund vehicle:** Cayman SPC (CIMA Section 4(3) Registered Mutual Fund).
**Investors:** Accredited/qualified only (USD 100,000 minimum initial investment).
**Referral model:** Exchanges and custodians whose customers want to professionalize winning strategies.

### A.2 What Managers Trade

Managers run **diverse crypto strategies** — directional, market-neutral, quantitative, yield — across spot and derivatives. Not just spot. The platform must handle the full instrument set.

### A.3 Why This Setup

| Choice | Reason |
|--------|--------|
| **Irish admin** | Most common jurisdiction for fund admin licensing; CBI credibility; EU access point |
| **Cayman SPC** | Industry standard for crypto hedge funds; statutory asset segregation; single umbrella for multiple managers; zero tax on fund |
| **Accredited only (s.4(3))** | Eliminates ~60% of regulatory complexity vs. retail; USD 100K minimum |
| **Private blockchain** | No PII on-chain; no MEV; GDPR-friendly; immutable audit trail |

### A.4 Fund Structure

```
Elysium Fund Services Ltd (Irish CBI-authorized)
    └── [Fund Name] SPC (Cayman, CIMA s.4(3))
         ├── SP-A — Manager Alpha (long/short crypto)
         ├── SP-B — Manager Beta (DeFi yield + basis trades)
         ├── SP-C — Manager Gamma (quant, CEX derivatives)
         └── ... (new SP per new manager)
```

Each Segregated Portfolio (SP) is a fully independent sub-fund with its own mandate, fee structure, NAV, share classes, dealing schedule, and complete legal/financial isolation from other SPs.

---

## Part B: Instrument Tiers

### Tier 1 — CEX Spot & Derivatives (Day 1)

| Instrument | Examples | Pricing | Accounting |
|------------|----------|---------|------------|
| **Spot** | BTC, ETH, SOL, altcoins on Binance/OKX/Bybit | CEX mid-price (Level 1) | Mark-to-market daily |
| **Perpetual futures** | BTC-USDT perp, ETH-USDT perp | Exchange mark price (Level 1) | Unrealized P&L daily; funding rate as income/expense (8-hourly) |
| **Dated futures** | BTC quarterly futures, ETH quarterly | Exchange settlement price (Level 1) | Unrealized P&L daily; expiry/rollover tracking |
| **Options** | BTC/ETH options on Deribit, OKX | Exchange mark price (Level 1-2) | Premium at inception; daily mark-to-market; exercise/expiry tracking |
| **Stablecoins** | USDC, USDT, DAI | Peg at 1.00 unless depegged (then Level 2-3) | Cash equivalent |

**Key:** All Tier 1 instruments are **exchange-cleared**. No ISDA, no bilateral margin, no UMR, no EMIR reporting (non-EU venues). The exchange handles margining — admin tracks margin balances, reconciles, and includes in NAV.

**Derivative NAV additions:**
```
Gross Assets += Unrealized profit on open derivatives (positive P&L positions)
             += Initial margin posted to exchanges (collateral — still fund's asset)
             += Variation margin receivable

Liabilities  += Unrealized loss on open derivatives (negative P&L positions)
             += Variation margin payable
             += Funding rate payable (perps)
```

### Tier 2 — DeFi (Quarter 2-3 Post-Launch)

| Instrument | Pricing Challenge | Accounting |
|------------|------------------|------------|
| **Staking** (ETH, SOL validators) | Protocol-defined APY; underlying token Level 1 | Staking rewards as income; slashing risk as expense |
| **Lending** (Aave, Compound) | Protocol interest rate; underlying Level 1 | Interest income accrual; protocol risk |
| **LP positions** (Uniswap, Curve) | Impermanent loss tracking; pool composition | Mark-to-market pool share; IL as unrealized loss |
| **Yield farming** | Auto-compounding; governance token rewards | Harvest events as income; compound as reinvestment |
| **Governance tokens** | Thin liquidity; Level 2-3 | Fair value; committee approval if illiquid |
| **Airdrops / forks** | Zero cost basis at receipt | Income at fair value on receipt date |

### Tier 3 — OTC Derivatives (Year 2+)

Full bilateral OTC stack: ISDA Master + Schedule + CSA, collateral management, close-out netting, mark-to-model (Level 2-3). EMIR reporting if EU counterparty. Not in MVP scope.

---

## Part C: Phase 0 — Day 1 Launch Requirements

*The absolute minimum to legally operate as a fund administrator and process the first subscription.*

### C.1 Legal & Regulatory (Cannot Launch Without)

| Requirement | Detail | Owner |
|-------------|--------|-------|
| **CBI authorization** | Section 10, IIA 1995. 3-6 month process. EUR 125,000-635,000 minimum capital. | Elysium + Legal |
| **CIMA fund registration** | SPC registered as s.4(3) mutual fund. USD 100K minimum investor threshold. | Legal counsel (Cayman) |
| **CP86 Designated Persons** | 6 DP roles assigned to named individuals. DP2 ≠ DP4. | Board |
| **PCF holder approvals** | CEO (PCF-1), Head of Compliance (PCF-12), Head of AML (PCF-15), CRO (PCF-14) — all pre-approved by CBI. | Elysium |
| **Board composition** | Minimum 2-3 Irish-resident directors; 2 conducting officers in Ireland. | Elysium |
| **GIIN registration** | FATCA — register with IRS within 30 days of commencing business. | Compliance |
| **AML/KYC policy manual** | Required by CBI and CIMA. Covers CDD, EDD, PEP, sanctions, STR filing. | Compliance |
| **Pricing policy** | Approved by pricing committee. Disclosed in OM. Covers pricing waterfall including derivatives. | Operations |
| **Compliance manual** | CBI CP86 requirements. | Compliance |
| **Conflicts of interest policy** | Required by CBI. Register maintained. | Compliance |
| **BCP (outline)** | Required by CBI. Full testing can be Year 1 but plan must exist. | Operations |
| **PI insurance** | Professional indemnity insurance. CBI expectation. | Elysium |

### C.2 Legal Documents (Minimum Set)

| Document | Purpose |
|----------|---------|
| SPC Memorandum & Articles of Association | Constitutional document — required for CIMA registration |
| Offering Memorandum (OM) | Master OM for SPC — describes strategy, risks, fees, dealing rules |
| SP Supplement (first SP) | Investment terms for first manager's segregated portfolio |
| Subscription Agreement | Investor signs; includes reps, warranties, accreditation, tax self-certification |
| Administration Agreement | Between SPC and Elysium; SLA, fees, indemnity, termination |
| Investment Management Agreement (IMA) | Between SP and manager; mandate, delegation |
| Custodian/Exchange Agreement | CEX account terms; custody arrangements |

### C.3 Platform Capabilities (Day 1 Build)

| Capability | Description | On-Chain / Off-Chain |
|------------|-------------|---------------------|
| **Fund/SP creation** | Create umbrella + segregated portfolios | On-chain (FundManagementFacet) |
| **Share class creation** | Configure class parameters (currency, fees, minimums) | On-chain |
| **Investor KYC/AML** | Onboarding workflow: identity docs, sanctions screening, risk scoring, accreditation check | Off-chain |
| **Sanctions screening** | OFAC, EU, UN, UK lists. Screen at onboarding. | Off-chain |
| **Subscription processing** | Accept subscription, validate, queue for dealing day | On-chain (OrderManagementFacet) |
| **NAV calculation** | Pricing waterfall (spot + derivatives); gross assets – liabilities; NAV per share | On-chain (NavManagementFacet) + off-chain pricing engine |
| **Derivative position tracking** | Unrealized P&L, margin balances, funding rates (perps), options mark-to-market | Off-chain → feeds into NAV |
| **Management fee accrual** | Daily: `(rate / 365) × NAV`. Deducted from NAV. | On-chain (FeeManagementFacet) |
| **Settlement** | Mint ERC1155 tokens on subscription; new series per batch (equalization) | On-chain (SettlementFacet) |
| **Role-based access** | ROLE_ADMIN, ROLE_NAV_PUBLISHER, ROLE_FX_UPDATER, etc. | On-chain (AccountFacet) |
| **Basic position reconciliation** | Admin ledger vs. CEX balances (spot + margin accounts) | Off-chain |
| **Eligibility checks** | KYC verified, accredited, sanctions clean, minimum investment met | On-chain (EligibilityFacet) |
| **FX rate management** | Rate updates for multi-currency classes | On-chain (FXManagementFacet) |

### C.4 Investor Onboarding (Day 1 Minimum)

| Step | Requirement | Legal Basis |
|------|-------------|-------------|
| Identity verification | Passport/ID (certified), proof of address (<3 months) | CJA 2010 (Ireland), Cayman AML Regs 2020 |
| Accreditation check | Self-certification + minimum USD 100K | CIMA s.4(3) |
| Sanctions screening | OFAC, EU, UN, UK — before accepting investor | OFAC / EU Sanctions Regulations |
| PEP screening | Check against PEP databases; EDD if hit | CBI AML Guidelines |
| Risk scoring | Composite score determines CDD/EDD tier | CBI AML Guidelines |
| Tax self-certification | CRS form + TIN; W-8BEN-E or W-9 | FATCA IGA / CRS |
| Source of funds declaration | Written declaration of subscription funding source | CBI AML Guidelines |

### C.5 NAV Calculation (Day 1 Minimum — Including Derivatives)

**Pricing waterfall:**

| Level | Source | Instruments |
|-------|--------|-------------|
| **Level 1** | CEX spot/mark/settlement prices | Spot, perps, futures, liquid options |
| **Level 2** | Composite/evaluated prices | Less liquid altcoins, options with thin order books |
| **Level 3** | Model-based / committee determination | Depegged stablecoins, delisted tokens, illiquid governance tokens |

**NAV formula:**
```
Gross Assets = Spot holdings at market value
             + Stablecoin / cash balances
             + Unrealized profit on derivatives (positive P&L)
             + Initial margin posted to exchanges
             + Variation margin receivable
             + Accrued funding rate income (perps)

Liabilities  = Unrealized loss on derivatives (negative P&L)
             + Variation margin payable
             + Accrued funding rate expense (perps)
             + Management fee accrual
             + Admin fee accrual
             + Other accrued expenses (audit, legal, directors)

SP NAV = Gross Assets − Liabilities
NAV per Share = SP NAV / Total Shares Outstanding
```

**Leverage tracking:** Total gross exposure / NAV. Must be monitored against SP mandate limits. Derivatives create leverage — a $1M fund trading $3M notional in perps has 3x leverage.

### C.6 What Phase 0 Does NOT Include

| Omitted | Why Acceptable | When Needed |
|---------|----------------|-------------|
| Redemption processing | Investors locked up 3-6+ months; no redemptions Day 1 | Phase 1 (Month 1-3) |
| Performance fee crystallization | First crystallization is monthly/quarterly; not Day 1 | Phase 1 |
| Full 3-way reconciliation | 2-way (admin vs CEX) sufficient initially | Phase 1 |
| Investor portal | Manual onboarding acceptable for first 5-10 investors | Phase 1 |
| Contract notes | Can be produced manually/semi-manually initially | Phase 1 |
| Investor statements | First monthly statement due ~30 days after first dealing | Phase 1 |
| Annual financial statements | Due 6 months after year-end — not for 18 months | Phase 2 |
| FATCA/CRS XML filing | First annual filing ~12-18 months away | Phase 3 |
| Performance measurement | Nice-to-have for marketing; not legally required | Phase 2 |
| SOC 1 | Type I acceptable in Year 1; engage auditor after launch | Phase 2 |
| DeFi integration | Tier 2; add when first DeFi-strategy manager onboards | Tier 2 |
| OTC derivatives | Tier 3; Year 2+ | Tier 3 |

---

## Part D: Phase 1 — Full Operations (Month 1-3)

*Built and deployed within the first 3 months post-launch. Needed before first lock-up expiry and first quarterly reporting.*

### D.1 Capabilities to Add

| Capability | Why Now | Detail |
|------------|---------|--------|
| **Redemption processing** | First lock-ups may expire at 3-6 months; build before first redemption request | Full validation: lock-up, notice period, gate, minimum holding, sanctions check. Token burn. Settlement to registered bank account. |
| **Forced/compulsory redemption** | AML/sanctions may require it anytime | Triggers: sanctions designation, KYC failure, eligibility lapse, false reps, regulatory order. Tipping-off prohibition applies. |
| **Performance fee calculation** | First crystallization (monthly or quarterly) approaches | Per-series HWM tracking. Formula: `Rate × max(0, NAV − HWM) × shares`. Roll-up at crystallization. |
| **Contract notes** | Required per dealing — must be systematic by Month 2 | Fund/class, dealing date, NAV/share, shares, gross/net, fees, settlement date, currency, FX |
| **Investor monthly statements** | First statement due ~30 days after first dealing | Holdings, transactions, NAV, performance |
| **Full 3-way reconciliation** | Auditor/CBI expectation for operational admin | Admin vs. CEX/custodian vs. manager OMS (Haruko). Position + cash + margin accounts. |
| **Break escalation** | Needed once recon is running | 0-2 BD: analyst. 3-5 BD: team lead. 5-10 BD: ops mgr. 10+ BD: compliance. De minimis auto-close (<$100 or <0.01% NAV). |
| **Mandate monitoring** | Required once trading commences | Pre-trade: hard block or soft warning. Post-trade: daily. Active breach: immediate correction. Passive breach: within 5 BD. Include leverage limits for derivatives. |
| **CBI ONR quarterly return** | First quarterly return due ~30 days post quarter-end | Regulatory return via CBI Online Reporting system |
| **Investor portal (basic)** | Reduces manual work for scaling beyond 5-10 investors | Subscription forms, account view, document access |
| **Dealing day automation** | Reduces manual NAV production effort | Four-eye sign-off, validation checks, automated posting |

### D.2 Reconciliation Tolerances (Derivatives-Inclusive)

| Item | Tolerance | Notes |
|------|-----------|-------|
| Spot token quantity | Exact match | Zero tolerance |
| Derivative position notional | Exact match | Must match exchange position reports |
| Margin balance (IM posted) | ±$100 | Exchange may lag by settlement cycle |
| Unrealized P&L | ±0.01% of position | Exchange mark vs. admin calc |
| Funding rate accrual | ±$10 | 8-hourly funding; small rounding differences |
| Cash / stablecoin | ±$100 | |
| FX rate | ±0.0001 | |

### D.3 Anti-Dilution

| Mechanism | Description |
|-----------|-------------|
| **Swing pricing** | NAV adjusted when net flows exceed threshold (2-5% of NAV). Factor: 50-100 bps. |
| **Dilution levy** | Separate charge on contract note. Paid into fund. |
| **On-chain** | 3-level dilution model: fund → class → dealing. |

**ESMA recommendation:** At least 1 quantitative LMT (gate) + 1 anti-dilution tool (swing/levy). Elysium satisfies with gate + dilution model.

---

## Part E: Phase 2 — Reporting & Audit Readiness (Month 6-9)

*Built before approaching the first year-end. Needed for auditor engagement and regulatory reporting.*

### E.1 Capabilities to Add

| Capability | Why Now | Detail |
|------------|---------|--------|
| **Financial statement preparation** | Auditor engagement starts ~Q3 (3-4 months before year-end) | ASC 946 recommended: Statement of Assets & Liabilities, Schedule of Investments, Statement of Operations, Statement of Changes in Net Assets, Financial Highlights (per class). |
| **Audit support (PBC list)** | Auditor needs documentation package | Trial balance, draft financials, schedule of investments, exchange/custodian confirmations, trade blotters, fee calcs, shareholder register, pricing docs, recon reports |
| **Fair value hierarchy disclosure** | Required in financial statements | Level 1 (CEX prices), Level 2 (evaluated), Level 3 (model). Per-instrument classification. Level 3 roll-forward table. |
| **Performance measurement** | Investor reports and marketing | TWR (geometric linking of daily returns). Annualized for >1 year. Sharpe, Sortino, Max DD, Calmar. MTD/QTD/YTD/SI. |
| **Quarterly investor report** | Expected by institutional investors | Performance commentary, market outlook, risk metrics, attribution |
| **SOC 1 Type I engagement** | Acceptable in Year 1; demonstrates control maturity | Point-in-time design review. 14 control objectives (see Appendix D). |
| **Segregation of duties formalization** | Auditor will test | NAV calc ≠ NAV approval; payment initiation ≠ authorization; pricing input ≠ validation; recon prep ≠ approval |
| **KRI dashboard** | Board and CBI reporting | NAV on-time >99%; error rate <0.1%; aged breaks <5; uptime >99.9%; regulatory filings 100% on-time |
| **DPIA completion** | GDPR requirement — should have been done at launch but can be completed now | Data Protection Impact Assessment for investor data processing |

### E.2 Accounting Framework

**Recommended:** US GAAP ASC 946 (investment companies). Industry standard for Cayman hedge funds.

**Key advantages:** Schedule of Investments as primary statement. No Statement of Cash Flows required. Familiar to Big 4 auditors. Supports derivative mark-to-market through Statement of Operations.

**Derivative accounting (ASC 946 / IFRS):**
- All derivatives classified as **FVTPL** (fair value through profit and loss) — no hedge accounting complexity
- Daily mark-to-market: unrealized gains/losses through Statement of Operations
- Realized gains on close: proceeds minus cost basis
- Funding rate payments (perps): recognized as income/expense when earned/incurred
- Option premium: recognized at inception; mark-to-market thereafter
- Margin collateral: disclosed as restricted cash/asset if pledged

### E.3 Error Materiality

| Threshold | Application |
|-----------|-------------|
| **0.50% of NAV per share** | Standard threshold (CBI CP130 framework, equity/alternative fund analogy) |
| **Up to 5.00%** | Professional-only funds (Cayman s.4(3)) at management discretion |

**If material error:** Recalculate → assess investor impact → compensate → notify CBI → root cause within 30 BD. Professional investors may be asked to reimburse windfall gains.

---

## Part F: Phase 3 — Filing Compliance (Month 12-15)

*Built before the first annual filing deadlines.*

### F.1 Capabilities to Add

| Capability | Deadline | Detail |
|------------|----------|--------|
| **CRS annual XML report** | July 31 | Account holder details, balances, income → Cayman TIA Portal |
| **CRS Compliance Form** | September 15 | Confirmation of compliance → Cayman TIA Portal |
| **FATCA annual report** | Per IRS schedule | US person details, balances → via Cayman TIA → IRS |
| **PFIC Annual Information Statement** | March 15 | Enable QEF election for US investors. Without this: punitive Section 1291 regime. Critical for US allocators. |
| **CIMA Fund Annual Return (FAR)** | Year-end + 6 months | NAV, AUM, investor count, service providers + audited financials |
| **DAC6 reporting** | Ongoing (within 30 days) | Cross-border arrangements meeting hallmarks (Category C: payments to Cayman) |
| **DAC8 crypto reporting** | Effective Jan 2026 | Aligns with CRS 2.0; crypto-asset transaction reporting |
| **Admin entity audited financials** | CBI deadline | Irish corporation tax (12.5% on admin fee income) |

### F.2 Tax Summary

| Entity | Tax Obligations |
|--------|----------------|
| **Cayman SPC (fund)** | Zero (no income/CG/WHT/VAT). Exempt from Economic Substance Act. |
| **Irish admin entity** | 12.5% corporation tax on admin fee income. VAT exempt on admin/TA services. PAYE/PRSI/USC on staff. |
| **Investors (fund-level obligations)** | FATCA reporting (US persons). CRS reporting (all). PFIC statement (US). |

---

## Part G: Tier 2 — DeFi Integration (Quarter 2-3)

*Added when the first DeFi-strategy manager onboards or when existing managers add DeFi to their mandates.*

### G.1 Additional Capabilities

| Capability | Complexity | Detail |
|------------|-----------|--------|
| **Staking position tracking** | Medium | Track staked amounts, rewards accrued, slashing events. Protocol API integration. |
| **Lending position tracking** | Medium | Track supplied assets, interest accrued, utilization rates. Aave/Compound APIs. |
| **LP position valuation** | High | Calculate pool share value including impermanent loss. DEX subgraph/API integration. |
| **Yield farming accounting** | High | Auto-compounding: distinguish principal vs. reinvested yield. Harvest events as income. |
| **Airdrop/fork handling** | Low | Income recognition at fair value on receipt date. Zero cost basis. |
| **Smart contract risk assessment** | Medium | Per-protocol risk rating. Exposure limits in mandate. Audit status tracking. |
| **Enhanced pricing (Level 2-3)** | High | Governance tokens, LP tokens, illiquid DeFi tokens — pricing committee governance needed. |

### G.2 Pricing Additions

| Instrument | Pricing Source | Fair Value Level |
|------------|---------------|-----------------|
| Staked tokens | Underlying spot + protocol withdrawal rate | Level 1-2 |
| Lending positions | Underlying spot + protocol interest rate | Level 1-2 |
| LP tokens | Pool composition × spot prices − impermanent loss | Level 2 |
| Governance tokens (liquid) | DEX/CEX mid-price | Level 1-2 |
| Governance tokens (illiquid) | Model / committee | Level 3 |
| Airdropped tokens | First available market price | Level 1-3 |

### G.3 DeFi-Specific Risks

| Risk | Mitigation |
|------|------------|
| Smart contract exploit | Mandate limits per protocol; audit status requirement; insurance (Nexus Mutual) |
| Impermanent loss | Track and disclose; mandate limit on LP exposure |
| Oracle manipulation | Multi-oracle verification; Chainlink or TWAP fallback |
| Regulatory classification | Monitor SEC/CFTC guidance on DeFi; legal counsel review per protocol |

---

## Part H: Governance & Organization

*Applies from Day 1 but some elements can be formalized progressively.*

### H.1 CP86 Designated Persons

| DP | Role | Day 1 | Key Responsibilities |
|----|------|-------|---------------------|
| **DP1** | Regulatory & Compliance | Required | AML/CFT, sanctions, STR filing, CBI liaison, investor complaints |
| **DP2** | Fund Risk Management | Required | Market/counterparty/liquidity risk, stress testing, derivatives exposure monitoring |
| **DP3** | Operational Risk | Required | BCP, outsourcing oversight, cyber/DORA, incident management |
| **DP4** | Investment Management | Required | Mandate monitoring (including derivative limits), pre/post-trade compliance |
| **DP5** | Capital & Financial Mgmt | Required | Regulatory capital, NAV governance, error escalation |
| **DP6** | Distribution | Required (role assigned) | Minimal Day 1 (direct investors); grows with distribution channels |

**Constraint:** DP2 ≠ DP4 (different individuals).

### H.2 Governance Bodies

| Body | Composition | Frequency | Purpose |
|------|-------------|-----------|---------|
| **Board** | All directors (2-3 Irish-resident minimum) | Quarterly | Strategy, risk oversight, DP oversight |
| **Pricing Committee** | Admin, risk, compliance, independent | Monthly; ad hoc for market dislocations | Price source approval, stale price escalation, derivative mark validation, Level 3 determinations |
| **Risk Committee** | DP2, DP3, CRO | Quarterly | Risk register, stress tests, incidents, derivative exposure review |
| **Compliance Committee** | DP1, DP2, CEO | Quarterly | AML review, regulatory changes, mandate breaches |

### H.3 Segregation of Duties (Critical Pairs)

| Function A | Function B |
|------------|------------|
| NAV calculation | NAV approval (four-eye) |
| Payment initiation | Payment authorization |
| Trade execution | Trade settlement |
| Pricing input | Pricing validation |
| Recon preparation | Recon approval |
| Journal entry creation | Journal entry approval |

### H.4 Sanctions Compliance

| Requirement | Detail |
|-------------|--------|
| **Lists** | OFAC SDN, EU Consolidated, UN, UK HMT, Cayman FRA |
| **Screening** | Investors at onboarding + within 24 hours of list updates; minimum quarterly batch re-screening |
| **Blocking** | Freeze immediately; block all transactions |
| **Reporting** | OFAC: 10 business days. EU/UK: without delay. |
| **50% rule** | Entities 50%+ owned by SDN are also blocked (OFAC) |
| **Penalties** | Cayman: USD 84,087 / 3 years. Ireland: EUR 10M / 10% turnover. |

---

## Part I: Share Classes

### I.1 MVP Classes (Per SP)

| Class | Currency | Fee Tier | Min Investment | Target |
|-------|----------|----------|----------------|--------|
| **Class A** | USD | Standard (2/20) | USD 100,000 | Primary investor class |
| **Class F** | USD | Founders (1/10) | USD 250,000 | Early investors, manager capital |
| **Class B** | EUR | Standard (2/20) | EUR 100,000 | European investors (optional) |

### I.2 Fee Structure

| Fee | Rate | Accrual | Payment | Notes |
|-----|------|---------|---------|-------|
| **Management** | 1.5-2.0% annual | Daily: `(rate / 365) × NAV` | Monthly/quarterly arrears | NAV-based (not GAV). Tiered optional. |
| **Performance** | 15-20% | Daily | Crystallized monthly/quarterly/annually | Per-series HWM. Clawback configurable. |
| **Admin** | 3-15 bps | Daily | Monthly/quarterly | Scales inversely with AUM |

### I.3 Dealing Parameters

| Parameter | Range | Default |
|-----------|-------|---------|
| Dealing frequency | Daily / weekly / monthly | Weekly |
| Cut-off time | Per prospectus | 5 PM UTC |
| Valuation point | Per prospectus | 00:00 UTC |
| Settlement | T+1 to T+5 | T+3 |
| Lock-up | 0-24 months | 6 months |
| Notice period | 0-90 days | 30 days |
| Redemption gate | 10-25% NAV per dealing day | 15% |

### I.4 Equalization (Series-Based)

- Each subscription batch = new ERC1155 tokenId (series) with its own HWM
- Performance fee calculated independently per series
- At crystallization: series above HWM merge; below HWM carry forward
- No depreciation deposit or contingent redemption complexity

### I.5 FX Handling

- Rates: `1 USD = X currency`, scaled by PRECISION. Cross-rates via USD triangulation.
- Updated by `ROLE_FX_UPDATER` daily minimum; intraday on dealing days.
- **No FX hedging in MVP.** Investors in non-USD classes bear FX risk. Hedged classes post-MVP.

---

## Part J: Risk Register

| Risk | Impact | Mitigation |
|------|--------|------------|
| **NAV calculation error** | High | Four-eye; automated validation; 0.50% materiality; correction procedure |
| **CEX downtime / API failure** | Medium | Multi-source pricing; fallback hierarchy; stale price escalation |
| **Cyber incident** | Critical | DORA framework; BCP; incident playbook; PI insurance |
| **Manager fraud** | Critical | SoD; independent NAV; 3-way recon; mandate monitoring |
| **CEX counterparty default** | High | Multi-exchange diversification; margin monitoring; exposure limits per CEX |
| **Derivative liquidation** | High | Real-time margin monitoring; leverage limits in mandate; liquidation alerts |
| **Sanctions designation** | High | Real-time screening; freeze protocol; OFAC 10-day reporting |
| **Redemption run** | High | Gate (15%); notice period; lock-up; NAV suspension power |
| **Smart contract vulnerability** | Critical | Security audits; multi-sig; emergency pause; Diamond proxy upgrades |
| **Loss of banking** | High | Multiple banking relationships; regulator pre-engagement |
| **Key person departure** | Medium | Deputy roles; CBI/CIMA notification within 5 BD; cross-training |
| **DeFi exploit (Tier 2)** | High | Protocol audit requirements; exposure limits; insurance |

---

## Appendix A: Regulatory Filing Calendar

| Deadline | Filing | Recipient | Phase |
|----------|--------|-----------|-------|
| Ongoing | CBI ONR quarterly returns | CBI | Phase 1 |
| Ongoing (30 days) | DAC6 reportable arrangements | Irish Revenue | Phase 3 |
| Ongoing (24 hrs) | Sanctions list update re-screening | Internal | Phase 0 |
| April 30 | CRS registration/renewal | Cayman TIA | Phase 3 |
| July 31 | CRS annual report (XML) | Cayman TIA | Phase 3 |
| September 15 | CRS Compliance Form | Cayman TIA | Phase 3 |
| March 15 | PFIC Annual Info Statement | US investors | Phase 3 |
| Year-end + 6 months | Audited financials + FAR | CIMA | Phase 2-3 |
| Per IRS schedule | FATCA reporting | IRS (via Cayman TIA) | Phase 3 |
| Annual | Admin entity audited financials | CBI | Phase 3 |

## Appendix B: Service Provider Network

| Role | Provider | Phase |
|------|----------|-------|
| **Fund Administrator** | Elysium | Phase 0 |
| **Auditor** | Big 4 / mid-tier (Grant Thornton, BDO) — CIMA-approved | Phase 2 (engage) |
| **Legal (Cayman)** | Maples, Walkers, Appleby, or Ogier | Phase 0 |
| **Legal (Ireland)** | A&L Goodbody, Matheson, McCann FitzGerald | Phase 0 |
| **Independent Directors** | Professional director firms (DRLL registered) | Phase 0 |
| **Custodian** | Copper, Fireblocks, Coinbase Custody | Phase 0 |
| **Bank** | Fiat on/off-ramp partner | Phase 0 |
| **PMS** | Haruko | Phase 0 |
| **AML/KYC** | ComplyAdvantage, Refinitiv, or similar | Phase 0 |
| **Pricing data** | CoinGecko, Messari, Kaiko | Phase 0 |
| **PI Insurance** | Broker-arranged | Phase 0 |

## Appendix C: SOC 1 Control Objectives (MVP)

| CO | Objective |
|----|-----------|
| CO1 | NAV calculated accurately per fund docs |
| CO2 | Subs/reds processed per prospectus |
| CO3 | Prices from approved independent sources |
| CO4 | Daily position recon; breaks resolved timely |
| CO5 | Daily cash recon; breaks resolved timely |
| CO6 | Mgmt/perf fees calculated per fund docs |
| CO9 | Shareholder register maintained accurately |
| CO11 | Financial statements prepared per GAAP |
| CO12 | Regulatory filings on time |
| CO13 | Logical access restricted (RBAC) |
| CO14 | Change management: authorized, tested, approved |
| CO16 | Data backup and restorability |
| CO19 | AML/KYC on investor onboarding |
| CO20 | FX transactions at market rates |

**Not required:** CO7 (corporate actions), CO8 (income/dividends), CO10 (distributions).
**SOC 1 Year 1:** Type I (point-in-time). **Year 2+:** Type II (12-month effectiveness).

## Appendix D: Crisis Response Playbooks

| Scenario | Immediate | Within 24 hrs | Ongoing |
|----------|-----------|---------------|---------|
| **Exchange default** | Freeze trading on affected exchange | Notify board, investors, CBI | Transfer assets; recalculate NAV excl. disputed |
| **NAV suspension** | Board resolution | CBI notification via ONR; investor notice | Weekly board review; resume when pricing reliable |
| **Sanctions hit** | Freeze account; block all txns | Report OFAC (10 BD) / EU NCA (without delay) | Maintain freeze until license/removal |
| **Cyber incident (DORA)** | Classify severity; Sev 1/2: immediate response | Major: initial report 4 hrs; GDPR: DPC 72 hrs | Intermediate 72 hrs; final 1 month |
| **Derivative liquidation** | Assess P&L impact; recalculate NAV | Manager notification; mandate breach review | Root cause; mandate adjustment if needed |
| **Market crash** | Verify pricing; consider suspension | Board emergency meeting | Liquidity stress test; gate activation if needed |

## Appendix E: What's NOT in MVP (Any Tier)

| Excluded | Reason |
|----------|--------|
| UCITS / AIFMD compliance | Not a UCITS; not EU-managed AIF |
| SFDR / ESG disclosure | Voluntary for Cayman funds |
| PRIIPs KID | No retail investors |
| Depositary appointment | Cayman AIFs exempt |
| Bond / fixed income accounting | Crypto-only fund |
| Securities lending | Not applicable |
| Distribution / dividend payments | Accumulation only |
| Corporate actions | No equities |
| SWIFT / ISO 20022 messaging | On-chain settlement |
| Omnibus / nominee accounts | Direct registry only |
| Legacy book migration | New managers only |
| Multi-jurisdiction admin | Cayman only |
| GIPS verification | After 5-year track record |
| In-specie transfers | Cash/stablecoin settlement only |

## Appendix F: Cross-References

| Topic | Source File |
|-------|------------|
| NAV methodology & pricing | `domain/NAV_METHODOLOGY.md`, `domain/FUND_ACCOUNTING.md` |
| Fee structures & equalization | `domain/FEES_AND_EQUALIZATION.md` |
| Share classes & multi-currency | `domain/SHARE_CLASSES.md` |
| Transfer agency / orders | `domain/TRANSFER_AGENCY.md` |
| Investor onboarding / AML | `domain/INVESTOR_ONBOARDING_AND_SERVICING.md` |
| Derivatives & margin | `domain/DERIVATIVES_AND_MARGIN.md` |
| Irish admin requirements | `domain/IRISH_ADMIN_REQUIREMENTS.md` |
| Regulatory frameworks | `domain/REGULATORY.md` |
| Tax (FATCA, CRS, PFIC) | `domain/TAX.md` |
| Governance & compliance | `domain/GOVERNANCE_AND_COMPLIANCE.md` |
| Reconciliation & daily ops | `domain/RECONCILIATION_AND_OPS.md` |
| Internal controls / SOC 1 | `domain/INTERNAL_CONTROLS_AND_SOC.md` |
| Error scenarios / crisis | `domain/ERROR_SCENARIOS_AND_CRISIS.md` |
| Accounting standards (ASC 946) | `domain/ACCOUNTING_STANDARDS.md` |
| Financial reporting & audit | `domain/FINANCIAL_REPORTING.md` |
| Performance measurement | `domain/PERFORMANCE_MEASUREMENT.md` |
| Fund lifecycle | `domain/FUND_LIFECYCLE.md` |
| Investment mandates | `domain/INVESTMENT_MANDATES.md` |
| Platform features & gaps | `product/FEATURES.md` |
| Entity model | `product/ENTITY_MODEL.md` |
| Smart contract architecture | `technical/SMART_CONTRACTS.md` |
