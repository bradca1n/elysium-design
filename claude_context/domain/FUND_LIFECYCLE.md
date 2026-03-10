# Fund Lifecycle & Legal Structures

<!-- ~4500 tokens -->
**Last Updated:** 2026-02-10

---

## Fund Lifecycle Stages

### Stage 1: Conception & Structuring (Months 1-3)

The sponsor/manager decides to launch a fund. Key decisions at this stage:

- **Strategy definition**: investment mandate, target returns, risk parameters, asset classes
- **Legal structure selection**: corporate (SICAV, ICAV, VCC), contractual (unit trust, CCF, FCP), or partnership (LP, SCSp)
- **Domicile selection**: driven by target investors, regulatory requirements, tax efficiency, and distribution plans
- **Service provider selection**: administrator, custodian/depositary, auditor, legal counsel, prime broker
- **Fee structure design**: management fee, performance fee (if any), hurdle rates, high water marks
- **Share class design**: currencies, fee tiers, distribution vs. accumulation, hedged vs. unhedged

**Key deliverables**: term sheet, business plan, regulatory application (if required)

### Stage 2: Formation & Documentation (Months 3-6)

Legal counsel drafts the fund's governing documents:

| Document | Purpose | Fund Type |
|---|---|---|
| **Prospectus** | Regulatory disclosure for public/regulated funds. Contains investment objective, risks, fees, dealing procedures, management, taxation | UCITS, regulated AIFs |
| **Supplement** | Per-sub-fund details within an umbrella prospectus — specific investment policy, class features, fees | UCITS, regulated AIFs |
| **Private Placement Memorandum (PPM)** | Investor disclosure for private funds. Similar to prospectus but for unregistered offerings | Hedge funds, PE funds |
| **Limited Partnership Agreement (LPA)** | Governs GP/LP rights, capital calls, distributions, fees, term, extensions | LP-structured funds |
| **Articles of Incorporation / Trust Deed** | Constitutional document of the legal entity | Corporate / Trust structures |
| **Subscription Agreement** | Contract between fund and each investor — commitments, representations, eligibility | All fund types |
| **Investment Management Agreement (IMA)** | Delegates portfolio management to the manager; defines mandate, restrictions, compensation | All fund types |
| **Administration Agreement** | Appoints administrator; defines NAV calculation, reporting, TA duties, fees | All fund types |
| **Custody/Depositary Agreement** | Appoints custodian; defines safekeeping, cash monitoring, oversight duties | All fund types |

**Regulatory steps**: File prospectus with regulator (e.g., CBI for Irish funds, CSSF for Luxembourg), obtain authorization, register share classes, open bank accounts, establish trading accounts.

### Stage 3: Launch & Fundraising

**Open-ended funds (hedge funds, UCITS)**:
- Seed investment (often manager's own capital or day-1 investors)
- Continuous subscription — investors can subscribe on dealing days
- Marketing under regulatory constraints (UCITS passport, AIFMD NPPR, Reg D/S)

**Closed-ended funds (PE, VC, real estate)**:
- Initial closing — GP countersigns first subscription agreements (binding commitment)
- Form D filing with SEC within 15 days (US), blue sky filings per state
- Subsequent closings — additional LPs admitted (typically with equalization interest)
- Final closing — usually 12-18 months from initial close
- Capital calls issued pro-rata as investments are identified

### Stage 4: Operation (Ongoing)

The fund is live and the administrator performs daily/periodic functions:
- NAV calculation and publication
- Subscription/redemption processing (transfer agency)
- Fee accruals and crystallization
- Investor reporting and statements
- Regulatory filings
- Position and cash reconciliation
- Corporate actions processing
- Tax reporting (FATCA, CRS, investor tax statements)

**For closed-ended funds**: capital calls, distributions, portfolio company monitoring, quarterly reporting.

### Stage 5: Wind-Down & Termination

**Open-ended funds**: Board decides to close the fund → redemption notice to all investors → final NAV → final distributions → deregister with regulator → dissolve legal entity.

**Closed-ended funds**: Investment period ends (~Year 5) → harvest period → exit portfolio companies → final distributions → reserve for contingencies → formal dissolution (~Year 10-12).

**Admin responsibilities in wind-down**: final NAV calculation, final investor statements, tax reporting, regulatory deregistration, retention of records (typically 5-7 years post-termination).

---

## Legal Structures

### Corporate Structures

| Structure | Jurisdiction | Legal Personality | Segregated Liability | US Check-the-Box | Umbrella | Typical Use |
|---|---|---|---|---|---|---|
| **ICAV** | Ireland | Yes | Yes (between sub-funds) | Yes (can elect partnership) | Yes | UCITS & AIFs targeting US investors |
| **VCC** (Plc) | Ireland | Yes | Yes | No (treated as corp) | Yes | UCITS & AIFs (most common Irish structure) |
| **SICAV** | Luxembourg | Yes | Yes | Depends on legal form | Yes | UCITS & AIFs (dominant Lux structure) |
| **RAIF** | Luxembourg | Yes | Yes | Depends on legal form | Yes | Unregulated AIFs (fast setup, no CSSF approval) |
| **SPC** | Cayman | Yes | Yes (segregated portfolios) | No | Yes (via portfolios) | Multi-strategy hedge funds |
| **Exempted Company** | Cayman | Yes | N/A (single entity) | No | No (standalone) | Open-ended hedge funds, master funds |
| **VCC** | Singapore | Yes | Yes | Depends on form | Yes | Asia-focused funds |

### Contractual/Trust Structures

| Structure | Jurisdiction | Legal Personality | Tax Transparent | Typical Use |
|---|---|---|---|---|
| **Unit Trust** | Ireland | No (trustee holds assets) | No | UCITS & AIFs (declining popularity vs. ICAV) |
| **CCF** | Ireland | No (co-ownership) | Yes | Institutional investors seeking tax look-through |
| **FCP** | Luxembourg | No (co-ownership) | Yes | Institutional investors, pension funds |

### Partnership Structures

| Structure | Jurisdiction | Legal Personality | Tax Transparent | Typical Use |
|---|---|---|---|---|
| **ILP** | Ireland | No | Yes | Closed-ended AIFs (PE/VC) |
| **ELP** | Cayman | No | Yes | Private equity, venture capital |
| **SCSp** | Luxembourg | No | Yes | PE/VC, real estate (high contractual freedom) |
| **Delaware LP** | US | No | Yes | US domestic PE/VC funds |

### Key Selection Factors

1. **Target investors**: US taxable investors prefer check-the-box eligible or partnership structures; EU institutional investors prefer UCITS or regulated AIFs with passporting rights
2. **Regulatory requirements**: UCITS = highest regulation but broadest distribution; unregulated = fastest setup but limited distribution
3. **Tax efficiency**: Tax-transparent structures (CCF, FCP, partnerships) avoid entity-level taxation; tax-opaque structures may benefit from treaty networks
4. **Operational cost**: Cayman is simplest/cheapest to form; Luxembourg and Ireland have higher setup costs but EU passport benefits
5. **Segregated liability**: Critical for umbrella funds — one sub-fund's liabilities must not contaminate others

---

## Umbrella Fund vs. Standalone

**Umbrella fund** = single legal entity containing multiple sub-funds, each with its own:
- Investment objective and strategy
- Portfolio of assets (legally ring-fenced)
- NAV, pricing, and dealing cycle
- Share classes (with different fees, currencies, distribution policies)

**Advantages**: shared governance (one board), shared service providers, shared prospectus, lower per-fund setup cost, easier cross-sub-fund switching for investors.

**Standalone fund** = its own legal entity with its own board, service providers, documents.

**Elysium hierarchy**: Umbrella → Sub-fund (fundId) → Share Class (classId) → Dealing (dealingId). Each sub-fund's assets are legally and operationally segregated.

---

## Key Service Providers

| Provider | Core Role | Appointed By | Regulatory Requirement |
|---|---|---|---|
| **Investment Manager** | Portfolio decisions, trade execution | Fund board/GP | Licensed (MiFID, ICA 1940, SFC, etc.) |
| **Fund Administrator** | NAV calculation, accounting, reporting, transfer agency | Fund board/GP | Regulated in most jurisdictions |
| **Custodian** | Safekeeping of assets, settlement, cash management | Fund board/GP | Required for UCITS; standard for all |
| **Depositary** | Oversight of fund operations, cash monitoring, asset verification | Fund board/GP | Mandatory under UCITS and AIFMD |
| **Auditor** | Annual financial statement audit | Fund board/GP | Mandatory in all regulated jurisdictions |
| **Legal Counsel** | Fund documentation, regulatory filings, ongoing advice | Manager | Recommended, not always mandatory |
| **Prime Broker** | Leverage, securities lending, short selling, trade execution | Manager | Common for hedge funds |
| **Transfer Agent** | Shareholder register, subscription/redemption processing | Administrator (often same entity) | Often combined with administrator |
| **Distributor** | Marketing and selling fund shares to investors | Manager | Licensed (MiFID, local regulations) |
| **Directors/Trustees** | Governance, fiduciary duty, oversight | Sponsor | Required; independence rules vary |

---

## Domicile Comparison

| Factor | Ireland | Luxembourg | Cayman | Delaware | Singapore |
|---|---|---|---|---|---|
| **Primary strength** | UCITS/ETF hub (72% of EU ETFs) | AIF/alternatives hub | Offshore hedge funds | US domestic PE/VC | Asia-Pacific gateway |
| **Regulator** | CBI | CSSF | CIMA | SEC/state | MAS |
| **Tax on fund** | 0% (for non-Irish investors) | 0.01-0.05% subscription tax | 0% | Pass-through (LP) | 0% (qualifying funds) |
| **Setup time** | 2-4 months (UCITS), 1-2 months (AIF) | 2-6 months | 2-4 weeks | 1-2 weeks | 2-4 weeks (VCC) |
| **EU passport** | Yes (UCITS + AIFMD) | Yes (UCITS + AIFMD) | No (NPPR only) | No | No |
| **Treaty network** | 70+ tax treaties | 80+ tax treaties | 0 (tax neutral) | US treaty network | 80+ tax treaties |
| **Corp tax rate** | 12.5% (service companies) | 24.94% | 0% | 21% (federal) | 17% |
| **Typical fund type** | UCITS, ETFs, QIAIF | UCITS, SIF, RAIF, Part II | Hedge funds, master funds | LP-structured PE/VC | Asia-focused, VCC |

**Elysium's MVP**: Irish-licensed administrator servicing Cayman-domiciled funds — the industry's most common cross-border arrangement. Irish admin provides regulatory credibility; Cayman provides tax neutrality and structural flexibility for hedge fund managers.

---

## Sources

- [Irish Funds — Fund Types & Legal Structures](https://www.irishfunds.ie/set-up-distribution/fund-types-legal-structures/)
- [JP Morgan — A Tale of Two Domiciles](https://www.jpmorgan.com/insights/securities-services/fund-services/a-tale-of-two-domiciles)
- [Fundamentals Law — Investment Fund Life Cycle](https://www.fundamentals.law/p/complete-review-investment-funds-life-cycle)
- [Vistra — Choosing the Best Domicile](https://www.vistra.com/governance-risk-compliance/establishment/set-up/fund-domiciles)
- [Chambers — Investment Funds 2025 Luxembourg](https://practiceguides.chambers.com/practice-guides/investment-funds-2025/luxembourg)
- [FundFront — Comparing Cayman Fund Structures](https://fundfront.com/blog/comparing-cayman-islands-fund-structures/)
- [Bolder Group — Fund Life Cycle Stages](https://boldergroup.com/insights/blogs/the-stages-of-the-fund-life-cycle/)
- [AIMA — ICAV Ireland's New Corporate Fund Structure](https://www.aima.org/journal/aima-journal---q3-2015-edition/article/icav---ireland-s-new-corporate-fund-structure.html)

## Related Files

- `REGULATORY.md` — Regulatory requirements governing each legal structure and domicile
- `TAX.md` — Tax treatment per structure and domicile (check-the-box, subscription tax, WHT)
- `GOVERNANCE_AND_COMPLIANCE.md` — Board composition, ManCo requirements, depositary obligations
- `SHARE_CLASSES.md` — Share class design decisions made during fund formation
- `FEES_AND_EQUALIZATION.md` — Fee structures configured at fund setup
- `TRANSFER_AGENCY.md` — Subscription/redemption workflows defined in prospectus
- `INVESTMENT_MANDATES.md` — Investment mandate defined in IMA and prospectus
