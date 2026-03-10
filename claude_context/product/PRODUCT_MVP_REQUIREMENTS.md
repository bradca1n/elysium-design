# Elysium MVP Product Requirements

<!-- ~12000 tokens -->
**Last Updated:** 2026-02-10
**Status:** Draft v1
**Tags:** product, mvp, requirements, cayman, crypto, spc

---

> **Scope:** The simplest fully operational and compliant fund administration product. One umbrella fund, crypto-only, accredited investors only, new managers only (no migration).

---

## 1. Scope Definition

### What This MVP Is

An **Irish-licensed fund administration entity** (CBI authorized under Section 10, IIA 1995) servicing a **Cayman-domiciled Segregated Portfolio Company (SPC)** with independent sub-fund SMAs per investment manager. The fund invests exclusively in **crypto assets traded on centralized exchanges** (OKX, Binance, etc.) and is open only to **accredited/qualified investors**.

### What This MVP Is NOT

- Not a UCITS (no retail passporting, no UCITS diversification rules)
- Not multi-jurisdiction (Cayman only; no Luxembourg, Singapore, or US-domiciled funds)
- Not for migration (no legacy book transfer from other administrators)
- Not for traditional assets (no bonds, equities, derivatives, or real estate)
- Not a depositary (Cayman AIFs do not require a depositary under CIMA rules)

### Core Value Proposition

Managers come to Elysium with one thing: **their trading strategy**. They trade on CEXs (OKX, Binance, Bybit, etc.). Elysium handles everything else — fund setup, investor onboarding, subscriptions, redemptions, NAV calculation, fee processing, share minting, compliance, reporting, and legal document production.

---

## 2. Fund Structure

### Legal Architecture

```
Elysium Fund Services Ltd (Irish CBI-authorized Administrator)
    │
    └── [Fund Name] SPC (Cayman Islands)
         ├── Segregated Portfolio A — Manager Alpha (crypto L/S)
         ├── Segregated Portfolio B — Manager Beta (DeFi yield)
         ├── Segregated Portfolio C — Manager Gamma (quant)
         └── ... (new SPs added per new manager)
```

### Why SPC

| Feature | Benefit |
|---------|---------|
| **Statutory asset segregation** | Creditors of SP-A cannot access SP-B's assets (Cayman SPC Law) |
| **Single umbrella** | One set of constitutional documents, one CIMA registration, one audit engagement |
| **Independent sub-funds** | Each SP has its own investment mandate, fee structure, NAV, and share classes |
| **Scalable** | Adding a new manager = creating a new SP (supplement to offering memorandum, not a new fund) |

### Per Segregated Portfolio (SP)

Each SP operates as an independent sub-fund with:
- Its own investment mandate and eligible asset list
- Its own dealing day and NAV frequency (configurable: daily, weekly, or monthly)
- Its own fee schedule (management fee, performance fee, admin fee)
- Its own share classes (see Section 9)
- Its own high-water mark (HWM) for performance fee calculation
- Complete isolation from other SPs

---

## 3. Regulatory Requirements

### 3.1 Irish Administrator Authorization (CBI)

| Requirement | Detail |
|-------------|--------|
| **Legal basis** | Section 10, Investment Intermediaries Act 1995 |
| **Timeline** | 3-6 months from complete application |
| **Minimum capital** | EUR 125,000 (may be higher depending on CBI risk assessment; up to EUR 635,000) |
| **PCF holders** | CEO, Head of Compliance, Head of Operations, CFO (pre-approved by CBI under F&P regime) |
| **CP86 Designated Persons** | DP1 (Regulatory Compliance), DP2 (Fund Risk Mgmt), DP3 (Operational Risk), DP4 (Investment Mgmt oversight), DP5 (Capital/Financial Mgmt), DP6 (Distribution) |
| **Board substance** | Minimum 2-3 Irish-resident directors; quarterly board meetings; same-day record retrieval |
| **IAF/SEAR** | PCF holders subject to Duty of Responsibility (effective July 2024); Statements of Responsibilities required |
| **PRISM supervision** | Risk-based engagement model; thematic inspections (recent: outsourcing oversight, DORA readiness) |

### 3.2 Cayman Fund Registration (CIMA)

| Requirement | Detail |
|-------------|--------|
| **Registration type** | Section 4(3) Mutual Funds Act — minimum initial investment USD 100,000 per investor |
| **Annual filing** | Fund Annual Return (FAR) within 6 months of year-end (extendable 3 months) |
| **Audited financials** | Required with FAR; IFRS or US GAAP acceptable |
| **CIMA fees** | Annual based on NAV bands |
| **Directors** | Must register under Directors Registration & Licensing Law (DRLL); professional directors (20+ entities) require CIMA license |
| **Beneficial ownership** | Regulated mutual funds exempt from maintaining BO register but must appoint Contact Person for CIMA requests |
| **AML** | AML Regulations 2020; risk-based CDD; STRs to Financial Reporting Authority (FRA); AMLCO/MLRO appointments required |

### 3.3 AML/KYC (Both Jurisdictions)

| Area | Requirement |
|------|-------------|
| **Ireland** | Criminal Justice (Money Laundering and Terrorist Financing) Act 2010; CBI AML Guidelines; STRs to Financial Intelligence Unit Ireland |
| **Cayman** | AML Regulations 2020; Proceeds of Crime Act; STRs to FRA; record retention 5 years |
| **Sanctions screening** | OFAC, EU Consolidated List, UN Security Council, UK HMT — re-screen on every list update (within 24 hours) |
| **Adverse media** | Automated screening on onboarding and ongoing (triggered by alerts) |
| **PEP screening** | Enhanced due diligence for PEPs; management approval required |

### 3.4 Tax Reporting

| Obligation | Detail |
|------------|--------|
| **FATCA** | Classify investors (US/non-US); annual XML report to Cayman TIA; W-8BEN/W-9 collection |
| **CRS** | Tax self-certification from all investors; annual report to Cayman TIA (auto-exchange with 100+ jurisdictions) |
| **Cayman tax** | Zero income tax, zero capital gains tax, zero withholding tax |
| **Irish admin entity tax** | Standard Irish corporation tax (12.5%) on admin fee income |

### 3.5 What's NOT Required (Scope Eliminated)

| Regulation | Why Not Applicable |
|------------|-------------------|
| UCITS Directive | Not a UCITS; Cayman fund |
| AIFMD (full scope) | Irish admin is not the AIFM; Cayman manager outside EU scope (third-country) |
| SFDR | Not an EU-domiciled fund; no sustainability disclosure requirements |
| PRIIPs KID | Not distributed to EU retail investors |
| MiFID II | Admin is not an investment firm |
| EMIR/SFTR | No OTC derivatives or SFTs in scope (CEX spot trading only) |
| Depositary requirement | Cayman AIFs do not require a depositary under CIMA rules |

**Result:** ~60% of full regulatory complexity eliminated vs. an Irish UCITS retail fund.

---

## 4. Manager Onboarding Workflow

New managers follow a structured 9-step process:

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

## 5. Investor Onboarding

### 5.1 Eligibility

**Accredited/Qualified Investors Only** — minimum initial investment USD 100,000 (per CIMA Section 4(3)):

| Investor Type | Documentation Required |
|---------------|----------------------|
| **High-net-worth individual** | Passport/national ID (certified), proof of address (< 3 months), source of wealth declaration, source of funds declaration, accreditation self-certification |
| **Corporate/institutional** | Certificate of incorporation, articles of association, board resolution, authorized signatories, UBO declaration (>25% ownership), audited financials |
| **Fund of funds** | Management company KYC, underlying investor composition, regulatory authorization proof |

### 5.2 AML Risk Scoring

Composite score determines review frequency:
- **8-14 (Low risk):** Standard CDD; 5-year review cycle
- **15-24 (Medium):** Enhanced CDD; 3-year review cycle
- **25-32 (High):** Enhanced DD with senior approval; annual review
- **33-40 (Very high):** 6-monthly review; board-level approval required

**Crypto-specific risk factors:** High-risk jurisdictions (FATF grey/black list), shell companies, cash-intensive wealth sources, opaque fund structures.

### 5.3 Tax Documentation

- CRS self-certification form (all investors)
- Tax identification number (TIN) collection
- W-8BEN (non-US) or W-9 (US persons) for FATCA
- Investor classification: US person, reportable jurisdiction, exempt status

---

## 6. Subscription & Redemption Lifecycle

### 6.1 Subscription Flow

```
Investor submits application + AML/KYC docs + subscription funds
    │
    ├── Compliance validates: AML cleared? Eligible? Minimum met?
    │       │
    │       ├── REJECTED → Notify investor; return funds
    │       └── APPROVED ↓
    │
    ├── Order accepted before cut-off → queued for NEXT dealing day
    │
    ├── Dealing day: NAV calculated at valuation point (forward pricing)
    │       │
    │       └── Shares = Subscription Amount / NAV per share
    │
    ├── On-chain: ERC1155 tokens minted to investor address
    │       │
    │       └── New series (tokenId) per subscription batch → natural equalization
    │
    └── Confirmation + contract note sent to investor
```

### 6.2 Redemption Flow

```
Investor submits redemption request (amount or shares)
    │
    ├── Validation: sufficient holding? Lock-up expired? Gate limit?
    │   Minimum holding post-redemption? Notice period satisfied?
    │       │
    │       ├── REJECTED → Notify investor with reason
    │       └── APPROVED ↓
    │
    ├── Applied to next dealing day (if before cut-off)
    │
    ├── NAV calculated at valuation point
    │       │
    │       └── Proceeds = Shares × NAV per share − exit fee (if any)
    │
    ├── On-chain: ERC1155 tokens burned
    │
    └── Settlement: proceeds to registered bank account (T+2 to T+5)
```

### 6.3 Dealing Parameters (Configurable per SP)

| Parameter | Range | Notes |
|-----------|-------|-------|
| **Dealing frequency** | Daily, weekly, or monthly | Configurable per SP |
| **Cut-off time** | Typically 5 PM UTC | Orders after cut-off roll to next dealing day |
| **Valuation point** | 00:00 UTC (24/7 crypto markets) | Or configurable per SP |
| **Settlement cycle** | T+2 to T+5 | Fiat transfer + blockchain confirmation |
| **Pricing model** | Forward pricing (single NAV) | Price at NEXT dealing day NAV after order received |
| **Lock-up** | 0-24 months | Per SP; common: 6-12 months for crypto |
| **Notice period** | 0-90 days | Per SP; common: 30 days |
| **Redemption gate** | 10-25% of SP NAV per dealing day | Prevents redemption runs |

### 6.4 Anti-Dilution

- **Swing pricing:** NAV adjusted by swing factor (50-100 bps) when net flows exceed threshold
- **Dilution levy:** Alternative — separate charge on contract note
- On-chain: Elysium's three-level dilution model handles this natively:
  - `fundPrice` → `adjustedFundPrice` (fund dilution)
  - `adjustedFundPrice` → `classPrice` (class dilution)
  - `classPrice` → `dealingPrice` (dealing dilution)

---

## 7. NAV Calculation

### 7.1 Pricing Waterfall (Crypto-Specific)

| Level | Source | Use Case |
|-------|--------|----------|
| **Level 1** | CEX spot prices (Binance/OKX bid/ask) | Most liquid pairs (BTC, ETH, major alts) |
| **Level 2** | Composite pricing (CoinGecko/Messari evaluated) | Less liquid altcoins |
| **Level 3** | Mark-to-model (funding rates, borrow rates) | Illiquid tokens |
| **Level 4** | Broker/market maker quotes | OTC positions, private placements |
| **Level 5** | Fair value committee determination | Governance tokens, pending ICOs |

### 7.2 NAV Components

```
Gross Assets = Market value of crypto holdings (mid-price from CEX)
             + Stablecoins / USD cash
             + Accrued income (staking/lending yield, if applicable)

Liabilities  = Management fee accrual (daily)
             + Performance fee accrual (daily, crystallized per schedule)
             + Admin fee accrual
             + Other accrued expenses (audit, legal, directors, custody)

SP NAV = Gross Assets − Liabilities

NAV per Share = SP NAV / Total Shares Outstanding
```

### 7.3 Daily NAV Production Cycle

| Time (UTC) | Activity |
|------------|----------|
| 23:00 | Market data feeds arrive (CEX APIs, data vendors) |
| 23:00-23:30 | Pricing team applies waterfall; flags missing/stale prices |
| 23:30-00:30 | Position reconciliation: admin vs. custodian/CEX vs. OMS |
| 00:30-01:00 | Draft NAV per SP; run validation checks (day-over-day %, cash balance) |
| 01:00-01:30 | Senior reviewer approval (four-eye principle) |
| 01:30-02:00 | NAV published; on-chain posting; investor notifications |

### 7.4 NAV Frequency

Configurable per SP:
- **Daily:** For liquid strategies (spot trading on major CEXs)
- **Weekly:** For strategies with less liquid positions
- **Monthly:** For concentrated/illiquid strategies

### 7.5 Error Materiality

Adopt conservative thresholds for crypto (higher volatility):
- **Material error:** > 0.50% of NAV per share
- **Compensation trigger:** Material error not caught within 2 dealing days
- **Precision:** NAV calculated to 6-8 decimals internally; published to 2 decimals

---

## 8. Accounting & Fees

### 8.1 Management Fee

| Parameter | Detail |
|-----------|--------|
| **Rate** | 1.5-2.0% annual (configurable per SP) |
| **Basis** | NAV-based (not GAV) |
| **Accrual** | Daily: (Annual Rate / 365) x SP NAV |
| **Payment** | Monthly or quarterly in arrears to manager |
| **Tiering** | Optional: lower rate above AUM thresholds |

### 8.2 Performance Fee

| Parameter | Detail |
|-----------|--------|
| **Rate** | 15-20% (configurable per SP) |
| **High-water mark** | Per SP; resets only when exceeded |
| **Hurdle rate** | 0% (standard for crypto funds) or soft hurdle |
| **Crystallization** | Monthly (typical for crypto) or quarterly |
| **Equalization** | Series-based (new ERC1155 tokenId per subscription batch); each series carries its own HWM |

**Performance fee example:**
- SP starts at $1M (HWM = $1M), grows to $1.2M (+$200K gain)
- Performance fee = 20% x $200K = **$40K**
- New HWM = $1.2M
- Mid-period subscriber gets Series B at HWM = $1.2M (natural equalization)

### 8.3 Administration Fee

- 5-10 bps of NAV (charged by Elysium)
- Covers: NAV calculation, investor servicing, regulatory reporting, platform access

### 8.4 Other SP Expenses

| Expense | Typical Range | Notes |
|---------|---------------|-------|
| **Custody/safekeeping** | 5-20 bps of AUM | Higher for cold storage multi-sig |
| **CEX trading fees** | 2-10 bps per round-trip | Binance VIP tiers lower |
| **Audit** | $20K-$100K/year fixed | Simpler than TradFi (fewer asset classes) |
| **Legal** | $15K-$50K/year | Regulatory filings, document updates |
| **Director fees** | $10K-$30K/director/year | Cayman SPC requires independent directors |
| **CIMA fees** | $5K-$25K/year | Based on NAV bands |

### 8.5 Founders/Seed Class

For early investors or the manager's own capital:
- Management fee: 0.50-1.00% (vs. standard 1.50-2.00%)
- Performance fee: 10-15% (vs. standard 20%)
- Lock-up: 1-2 years
- MFN clause: most favorable terms guaranteed
- Available window: first 6-12 months or until AUM threshold ($50M-$100M)

---

## 9. Share Class Configuration

### 9.1 MVP Share Classes (Per SP)

| Class | Currency | Fee Tier | Min Investment | Target |
|-------|----------|----------|----------------|--------|
| **Class A** | USD | Standard (2/20) | USD 100,000 | Primary investor class |
| **Class F** | USD | Founders (1/10) | USD 250,000 | Early investors, manager capital |
| **Class B** | EUR | Standard (2/20) | EUR 100,000 | European investors (optional) |

### 9.2 On-Chain Representation

- Each share class = distinct ERC1155 token type
- Each subscription batch within a class = distinct tokenId (series-based equalization)
- Class parameters stored on-chain: denomination currency, fee rates (bps), dilution factors
- Fund reporting currency: USD
- Multi-currency settlement: cash fund tokens per currency per umbrella (`createCashFundTokenId(umbrellaId, currencyISO)`)

### 9.3 FX Handling (Multi-Currency Classes)

- FX rates stored as `1 USD = X currency`, scaled by PRECISION
- Cross-rates via USD triangulation
- Updated by `ROLE_FX_UPDATER` via `updateFXRates()`
- **No FX hedging in MVP** — investors in non-USD classes bear FX risk
- Hedged classes can be added post-MVP as class-level configuration

---

## 10. Compliance & Investment Mandates

### 10.1 Eligible Assets (Per SP Mandate)

| Category | Examples | Constraints |
|----------|----------|-------------|
| **Large-cap crypto** | BTC, ETH, SOL, BNB | No constraints |
| **Mid-cap altcoins** | Per SP-specific approved list | Concentration limits (e.g., max 20% per token) |
| **Stablecoins** | USDC, USDT, DAI | Used for cash management |
| **CEX positions** | Spot only (no futures/options in MVP) | Approved exchanges only |

### 10.2 Restricted/Prohibited

- **No OTC derivatives** (no ISDA, no futures, no options)
- **No DeFi protocol interactions** (no staking, no lending, no LP positions) — unless explicitly added to SP mandate
- **No securities tokens** (avoids securities law complexity)
- **No leverage** beyond exchange margin (per SP mandate)
- Sanctioned tokens/entities per OFAC/EU lists

### 10.3 Compliance Monitoring

| Type | Timing | Action |
|------|--------|--------|
| **Pre-trade** | Before execution | Validate against mandate: eligible asset? Exchange approved? Concentration limit? |
| **Post-trade** | Daily | Portfolio check: concentration limits, leverage limits, eligible asset mix |
| **Breach handling** | Passive breach (market movement): remediate ASAP. Active breach (trading error): report to compliance immediately |
| **Sanctions screening** | Real-time | Screen investors and counterparties against all sanctions lists |

---

## 11. Reconciliation

### 11.1 Daily Position Reconciliation

Three-way reconciliation:
1. **Administrator ledger** (Elysium on-chain + off-chain records)
2. **Custodian/CEX deposit records** (Copper, Ledger Vault, Coinbase Custody, or CEX account)
3. **Investment manager OMS** (Haruko or manager's own system)

### 11.2 Tolerance Thresholds

| Item | Tolerance | Notes |
|------|-----------|-------|
| **Quantity** | Exact match | Crypto has no fractional share ambiguity |
| **Price/value** | ±1% of position | Higher volatility tolerance than TradFi |
| **Cash** | ±0.0001 BTC or USD equivalent | Satoshi-level precision |
| **Settlement** | 0-10 minutes | Blockchain confirmation or CEX withdrawal window |

### 11.3 Common Break Types (Crypto-Specific)

- Unconfirmed deposit from external wallet (pending blockchain confirmations)
- Failed CEX withdrawal (regulatory hold, compliance trigger)
- Staking reward not credited to fund account
- Price feed lag (stale price from data vendor)
- Liquidation position not yet settled

---

## 12. Reporting

### 12.1 Regulatory Reports

| Report | Frequency | Deadline | Recipient |
|--------|-----------|----------|-----------|
| **Audited financial statements** | Annual | 6 months post year-end | CIMA (with FAR) |
| **Fund Annual Return (FAR)** | Annual | 6 months post year-end (extendable +3m) | CIMA |
| **FATCA report** | Annual | Per Cayman TIA deadline | Cayman Tax Information Authority |
| **CRS report** | Annual | Per Cayman TIA deadline | Cayman TIA (auto-exchange) |
| **CBI ONR returns** | Quarterly/annual | 30 days post period-end | Central Bank of Ireland |

### 12.2 Investor Reports

| Report | Frequency | Content |
|--------|-----------|---------|
| **Contract note** | Per dealing | Fund name, dealing date, NAV/share, shares, gross/net amount, fees, settlement date, currency |
| **Monthly/quarterly statement** | Per period | Holdings, transactions, NAV/share, SP performance |
| **Annual tax statement** | Annual | Taxable income, withholding tax, CRS-reportable amounts |
| **Annual audited report** | Annual | Full financial statements per IFRS/US GAAP |

### 12.3 Financial Statement Content

Per IFRS or US GAAP (ASC 946):
- Statement of Financial Position / Assets & Liabilities
- Statement of Comprehensive Income / Operations
- Statement of Changes in Net Assets
- Schedule of Investments (with fair value hierarchy: Level 1/2/3)
- Financial Highlights (5-year per-class data)
- Notes: accounting policies, risk disclosures, related-party transactions, subsequent events

---

## 13. Legal Documents

| Document | Owner | Notes |
|----------|-------|-------|
| **SPC Memorandum & Articles of Association** | Legal counsel | Constitutional document for the umbrella |
| **Offering Memorandum (OM)** | Legal counsel | Master OM for the SPC |
| **SP Supplement** | Legal counsel | Per-SP investment terms, fee schedule, dealing rules |
| **Subscription Agreement** | Elysium + Legal | Investor-signed; includes reps, warranties, accreditation |
| **Administration Agreement** | Elysium + Legal | Between SPC and Elysium; SLA, fees, termination |
| **Investment Management Agreement (IMA)** | Manager + Legal | Between SP and manager; mandate, delegation, termination |
| **Custodian/Exchange Agreement** | Manager + Elysium | CEX account terms; custody arrangements |
| **Side Letters** | Legal counsel | Manager/investor-specific terms (MFN clause standard) |
| **AML/KYC Policy** | Elysium Compliance | Internal procedures manual |
| **Business Continuity Plan** | Elysium Operations | Required by CBI; tested annually |
| **Compliance Manual** | Elysium Compliance | CBI CP86 requirements |
| **Investor Communication Templates** | Elysium | Contract notes, statements, regulatory notices |

---

## 14. Service Provider Network

| Role | Provider | Notes |
|------|----------|-------|
| **Fund Administrator** | Elysium | NAV, TA, compliance, reporting |
| **Auditor** | Big 4 or mid-tier (Grant Thornton, BDO) | Required by CIMA; annual engagement |
| **Legal Counsel (Cayman)** | Maples, Walkers, Appleby, or Ogier | Fund formation, ongoing advisory |
| **Legal Counsel (Ireland)** | A&L Goodbody, Matheson, or McCann FitzGerald | Irish admin licensing, CBI filings |
| **Independent Directors** | Professional director firms | Minimum 2 for SPC board; DRLL registered |
| **Custodian** | Copper, Fireblocks, Coinbase Custody, or CEX custodial | Crypto-native; multi-sig cold storage |
| **Bank** | Banking partner for fiat on/off-ramp | Subscription/redemption settlement in USD/EUR |
| **PMS (Portfolio Management System)** | Haruko | Trade data feed, position data, OMS integration |

**No depositary required** — Cayman AIFs are exempt from mandatory depositary under CIMA rules.

---

## 15. Platform Requirements (Elysium On-Chain)

### 15.1 Smart Contract Functions Required

| Function | Facet | Description |
|----------|-------|-------------|
| SP creation | FundFacet | Create new segregated portfolio within umbrella |
| Share class creation | ShareClassFacet | Configure class parameters (currency, fees, min investment) |
| NAV posting | NAVFacet | Post fund price, adjusted price, class prices, dealing prices |
| Order processing | OrderFacet | Accept subscription/redemption orders with validation |
| Settlement | SettlementFacet | Execute orders: mint/burn ERC1155 tokens, move cash tokens |
| Fee calculation | FeeFacet | Daily accrual, HWM tracking, crystallization |
| FX rate management | FXFacet | Update exchange rates, cross-rate triangulation |
| Role management | AccessControlFacet | ROLE_ADMIN, ROLE_FX_UPDATER, ROLE_NAV_PUBLISHER, etc. |
| Investor registry | ERC1155 | Token holder mapping = shareholder register |

### 15.2 Off-Chain Functions

| Function | System | Description |
|----------|--------|-------------|
| AML/KYC | Compliance module | Investor screening, risk scoring, SAR filing |
| Pricing engine | Data feeds | CEX API integration, pricing waterfall, stale price detection |
| Reconciliation | Operations module | 3-way position/cash reconciliation |
| Reporting | Reporting module | Investor statements, regulatory filings, financial statements |
| Mandate monitoring | Compliance module | Pre/post-trade compliance checks |
| Investor portal | Web app | Subscription forms, account view, document access |

---

## 16. Explicitly Out of Scope (MVP)

| Excluded | Reason |
|----------|--------|
| Bond accounting / day count conventions | Crypto-only; no fixed income |
| Securities lending | Not applicable to crypto CEX trading |
| Derivatives & margin (ISDA, EMIR) | Spot trading only in MVP |
| Income equalization (traditional) | Series-based minting eliminates this |
| Distribution/dividend payments | Crypto funds rarely distribute; accumulation only |
| Corporate actions processing | No equities; no splits/mergers/dividends |
| UCITS/AIFMD compliance engine | Not a UCITS; not EU-managed AIF |
| SFDR sustainability reporting | Not an EU-domiciled fund |
| PRIIPs KID generation | No retail investors |
| Multi-jurisdiction fund admin | Cayman only |
| Legacy book migration | New managers only |
| FX hedging (hedged share classes) | Post-MVP enhancement; unhedged only at launch |
| In-specie subscriptions/redemptions | Cash only in MVP |
| Side pockets | Post-MVP enhancement |
| Swing pricing automation | Manual dilution levy in MVP if needed |
| SWIFT/ISO 20022 messaging | No institutional platform distribution in MVP |
| Omnibus/nominee account processing | Direct registry only |

---

## 17. Risk Register

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| **NAV calculation error** | Medium | High | Four-eye review; automated validation checks; materiality threshold (0.50%) |
| **CEX downtime / API failure** | Medium | Medium | Multi-source pricing; manual fallback; stale price escalation |
| **Cyber incident** | Low | Critical | DORA compliance; BCP tested annually; incident response playbook |
| **Manager fraud** | Low | Critical | Segregation of duties; independent NAV; position reconciliation |
| **Regulatory change** | Low | Medium | Legal counsel monitoring; quarterly compliance review |
| **Key person departure** | Medium | Medium | Deputy roles defined; CBI/CIMA notification within 5 business days |
| **CEX counterparty default** | Low | High | Multi-custodian diversification; segregated accounts; limits per CEX |
| **Sanctions designation (investor)** | Low | High | Real-time screening; immediate freeze protocol; OFAC 10-day reporting |
| **Redemption run** | Low | High | Gate mechanism (10-25% per dealing day); notice period; lock-up |
| **Stale/incorrect pricing** | Medium | Medium | Automated staleness monitor; single authoritative FX source |

---

## 18. MVP Operational Controls

### 18.1 Minimum SOC 1 Control Objectives

| ID | Objective |
|----|-----------|
| CO1 | NAV calculated accurately & timely per constitutional documents |
| CO2 | Subscriptions/redemptions processed per prospectus & dealing procedures |
| CO3 | Security prices from approved independent sources |
| CO4 | Daily position reconciliation (admin vs. custodian); breaks resolved timely |
| CO5 | Daily cash reconciliation (admin vs. bank/custodian); breaks resolved timely |
| CO6 | Management/performance fees calculated per fund documents |
| CO19 | AML/KYC applied to investor onboarding per regulations |

### 18.2 Key Risk Indicators (KRIs)

| KRI | Target |
|-----|--------|
| NAV on-time delivery rate | > 99% |
| NAV error rate | < 0.1% |
| Reconciliation breaks aged > 5 days | < 5 |
| System uptime | > 99.9% |
| Regulatory filing on-time rate | 100% |

### 18.3 SOC 1 Timeline

- **Year 1:** Type I (point-in-time design review) — acceptable for launch year
- **Year 2+:** Type II (12-month operating effectiveness; dual-branded ISAE 3402/SOC 1)

---

## 19. Timeline & Phasing

### Phase 1: Foundation (Months 1-3)
- Irish CBI application submitted
- Cayman SPC established with legal counsel
- Core smart contracts deployed on testnet
- Administration agreement template finalized

### Phase 2: Platform Build (Months 3-6)
- Smart contract audit and mainnet deployment
- Off-chain systems: pricing engine, reconciliation, reporting
- Investor portal MVP
- AML/KYC workflow integration

### Phase 3: Authorization (Months 4-8)
- CBI authorization received (3-6 month process)
- CIMA fund registration completed
- SOC 1 Type I engagement initiated
- First SP supplement drafted for launch manager

### Phase 4: Launch (Months 7-10)
- First manager onboarded (8-10 week process)
- Seed investment; first NAV calculated
- First dealing day; first investor subscription
- Operational monitoring: KRIs, reconciliation, compliance

### Phase 5: Scale (Months 10+)
- Second and third managers onboarded
- Additional share classes (EUR, hedged classes)
- SOC 1 Type II preparation
- Feature additions: side pockets, swing pricing automation, multi-jurisdiction

---

## Cross-References

| Topic | Primary Source |
|-------|---------------|
| Fund formation & lifecycle | `domain/FUND_LIFECYCLE.md` |
| CBI authorization details | `domain/IRISH_ADMIN_REQUIREMENTS.md` |
| NAV methodology | `domain/NAV_METHODOLOGY.md`, `domain/FUND_ACCOUNTING.md` |
| Fee structures & equalization | `domain/FEES_AND_EQUALIZATION.md` |
| Share class mechanics | `domain/SHARE_CLASSES.md` |
| Transfer agency / order lifecycle | `domain/TRANSFER_AGENCY.md` |
| Investor onboarding / AML | `domain/INVESTOR_ONBOARDING_AND_SERVICING.md` |
| Compliance mandates | `domain/INVESTMENT_MANDATES.md` |
| Reporting / financial statements | `domain/FINANCIAL_REPORTING.md` |
| Reconciliation & daily ops | `domain/RECONCILIATION_AND_OPS.md` |
| Internal controls / SOC 1 | `domain/INTERNAL_CONTROLS_AND_SOC.md` |
| Error scenarios / crisis | `domain/ERROR_SCENARIOS_AND_CRISIS.md` |
| Regulatory frameworks | `domain/REGULATORY.md` |
| Tax obligations | `domain/TAX.md` |
| Governance | `domain/GOVERNANCE_AND_COMPLIANCE.md` |
| Fund restructuring | `domain/FUND_RESTRUCTURING.md` |
| Smart contract architecture | `technical/SMART_CONTRACTS.md` |
| Product overview | `product/OVERVIEW.md` |
