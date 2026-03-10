# Regulatory Context

<!-- ~1000 tokens -->
**Last Updated:** 2026-02-08

---

## Applicable Regulations

### United States

| Regulation | Requirement | On-Chain Status | Gap |
|---|---|---|---|
| **SEC Rule 506(b)/(c)** | Accredited investor verification; 35 non-accredited limit (506b) | `requiresAccredited` flag exists | No expiry mechanism, no verification method tracking, no min investment enforcement |
| **Investment Company Act 3(c)(1)/(7)** | 100 investor cap (3c1) or qualified purchasers only (3c7) | `requiresQualifiedPurchaser` flag exists | No max investor count enforcement |
| **FinCEN AML/CFT** | CIP, CDD, SARs, CTRs (delayed to Jan 2028) | `kycVerified` flag, admin-controlled accounts | No SAR filing hooks, no account freeze, no transaction monitoring |
| **OFAC Sanctions** | Screen against SDN list; block/report | Absent on-chain | No account blocking/freezing mechanism |
| **Dodd-Frank / Form PF** | AUM, leverage, counterparty reporting (compliance Oct 2026) | NAV/AUM inherent on-chain | No leverage tracking (offchain via Haruko) |

### European Union

| Regulation | Requirement | On-Chain Status | Gap |
|---|---|---|---|
| **UCITS IV/V** | Daily NAV, depositary, KIID, LMTs (min 2 per fund), swing pricing | Daily NAV supported | No redemption gates, no swing pricing, no KIID tracking, no LMT config |
| **AIFMD II** (transpose Apr 2026) | Depositary, reporting (enhanced Annex IV by 2027), LMTs | Lock-up/notice periods, perf fee HWM | No depositary role, no Annex IV reporting |
| **MiFID II** | Client classification, suitability, cost disclosure | `investorType` field | No suitability tracking, no cost transparency |
| **6AMLD** (phased to Jul 2027) | UBO identification, PEP tracking, enhanced CDD | KYC flag | No UBO data, no PEP flag, no EDD flags |
| **GDPR** | Data minimization, right to erasure, DPIA | No PII on-chain; private chain | Well positioned. Need DPIA documentation. |

### Cross-Jurisdictional

| Regulation | Requirement | On-Chain Status | Gap |
|---|---|---|---|
| **FATCA/CRS** | Tax residency, TIN collection, annual reporting | `jurisdiction` field (single) | No multi-country tax residency, no TIN verification, no classification |
| **KYC Re-verification** | Periodic review (1-5 years by risk) | `lastUpdated` timestamp | No `kycExpiresAt`, no risk-based review |

---

## MVP Compliance: Irish Admin + Cayman Fund

The planned first deployment uses an **Irish-licensed entity** (CBI Fund Admin licence, IIA 1995) servicing **Cayman-domiciled funds** (CIMA Section 4(3) registered).

### Minimum On-Chain Features Needed

| Feature | Priority | Why |
|---|---|---|
| NAV suspension state (SUSPENDED) | P0 | Cayman gate provisions, UCITS requirements |
| Account freeze / SAR flag | P0 | EU sanctions screening, OFAC compliance |
| Gate provisions | P0 | Standard hedge fund documentation requirement |
| CDD/EDD tier on eligibility | P1 | Irish CJA 2010 AML obligations |
| PEP flag | P1 | CBI requirement for fund admin |

### Key Regulatory Tailwinds

- **GENIUS Act** (signed Jul 2025): Stablecoin regulation establishing frameworks
- **CLARITY Act** (passed House Jul 2025): SEC vs. CFTC jurisdiction clarity
- **SEC DTC Tokenization Pilot** (Dec 2025): 3-year pilot launching H2 2026
- **Irish Funds tokenisation paper** (Dec 2025): Industry body endorsing blockchain fund operations
- EU DAC8: Digital asset reporting requirements effective Jan 2026

---

## Strengths

- **No PII on-chain** -- GDPR-friendly by design
- **Immutable audit trail** -- stronger than traditional fragmented systems
- **Private chain** -- controlled access, no public data exposure
- **Block-number queries** -- provides "knowledge date" capability comparable to SS&C Geneva
- **Fund isolation enforced at protocol level** -- maps directly to Cayman SPC legal segregation
