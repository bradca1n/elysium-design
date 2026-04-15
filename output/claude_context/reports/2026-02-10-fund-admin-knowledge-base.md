# Fund Administration & Accounting Knowledge Base — Synthesis Report

<!-- ~3500 tokens -->
**Date:** 2026-02-10
**Author:** Claude Code
**Role:** researcher
**Status:** final (Phase 2 complete)
**Tags:** fund-administration, fund-accounting, knowledge-base, domain-knowledge

---

## Executive Summary

Two phases of comprehensive research built Elysium's domain knowledge base. **Phase 1** (10 phases) created the foundation: 14 domain files covering fund formation through daily operations. **Phase 2** (11 phases) filled all identified gaps: 10 new files + 3 enrichments covering error scenarios, crisis management, investor onboarding, Irish CBI requirements, internal controls/SOC 1, distributions/income, derivatives/margin, performance measurement, fund restructuring, securities lending, and financial reporting. The knowledge base now contains **24 domain files totaling ~175,000+ tokens**, covering every operational scenario a regulated Irish fund administrator encounters.

## Key Takeaways

1. **Fund admin is primarily an accounting and compliance operation** — the core loop is: receive data → value portfolio → accrue fees → calculate NAV → reconcile → report. Elysium automates the NAV-to-settlement portion on-chain.
2. **The admin market is bifurcated** — large admins (State Street, BNY) serve $250M+ funds with enterprise platforms; sub-$250M funds are underserved by semi-manual boutiques. This is Elysium's target gap.
3. **Regulatory complexity is the moat** — UCITS, AIFMD, Cayman MF Law, FATCA/CRS, SFDR, AML/KYC requirements collectively create a compliance burden that keeps small admins manual and creates opportunity for automation.
4. **Equalization is the hardest accounting problem** — four different methods exist (depreciation deposit, credit/debit, series, adjusted cost), each with trade-offs. Elysium's dealing-level dilution model maps closest to the "series" approach.
5. **Cross-file topics are now cross-referenced** — depositary requirements span REGULATORY.md, GOVERNANCE.md, and FUND_LIFECYCLE.md; each file references the others rather than duplicating.

## Cross-Reference Map

| Topic | Primary File | Also Referenced In |
|---|---|---|
| Fund formation & lifecycle | `FUND_LIFECYCLE.md` | `REGULATORY.md`, `GOVERNANCE_AND_COMPLIANCE.md` |
| Legal structures (SICAV, ICAV, LP) | `FUND_LIFECYCLE.md` | `TAX.md` (tax treatment per structure) |
| NAV calculation | `FUND_ACCOUNTING.md`, `NAV_METHODOLOGY.md` | `RECONCILIATION_AND_OPS.md` (daily cycle) |
| Share class mechanics | `SHARE_CLASSES.md` | `FEES_AND_EQUALIZATION.md`, `FUND_ACCOUNTING.md` |
| Subscription/redemption | `TRANSFER_AGENCY.md` | `FUND_ACCOUNTING.md` (journal entries) |
| Management/performance fees | `FEES_AND_EQUALIZATION.md` | `FUND_ACCOUNTING.md` (accrual entries), `SHARE_CLASSES.md` (fee tiers) |
| Equalization | `FEES_AND_EQUALIZATION.md` | `NAV_METHODOLOGY.md` (dealing NAV) |
| FX hedging | `SHARE_CLASSES.md` | `NAV_METHODOLOGY.md` (FX conversion) |
| Regulatory frameworks | `REGULATORY.md` | `GOVERNANCE_AND_COMPLIANCE.md`, `INVESTMENT_MANDATES.md` |
| Tax | `TAX.md` | `FUND_LIFECYCLE.md` (domicile), `FUND_ACCOUNTING.md` (WHT entries) |
| Compliance monitoring | `INVESTMENT_MANDATES.md` | `GOVERNANCE_AND_COMPLIANCE.md` |
| Daily operations | `RECONCILIATION_AND_OPS.md` | `FUND_ACCOUNTING.md` (accounting cycle) |
| Swing pricing | `NAV_METHODOLOGY.md` | `TRANSFER_AGENCY.md` (anti-dilution) |
| Governance | `GOVERNANCE_AND_COMPLIANCE.md` | `REGULATORY.md` (regulatory requirements) |
| Error handling & crisis | `ERROR_SCENARIOS_AND_CRISIS.md` | `GOVERNANCE_AND_COMPLIANCE.md`, `RECONCILIATION_AND_OPS.md` |
| Investor onboarding | `INVESTOR_ONBOARDING_AND_SERVICING.md` | `TRANSFER_AGENCY.md`, `TAX.md`, `REGULATORY.md` |
| CBI/Cayman regulation | `IRISH_ADMIN_REQUIREMENTS.md` | `REGULATORY.md`, `GOVERNANCE_AND_COMPLIANCE.md` |
| Internal controls | `INTERNAL_CONTROLS_AND_SOC.md` | `GOVERNANCE_AND_COMPLIANCE.md`, `RECONCILIATION_AND_OPS.md` |
| Distributions & income | `DISTRIBUTIONS_AND_INCOME.md` | `FUND_ACCOUNTING.md`, `FEES_AND_EQUALIZATION.md`, `SHARE_CLASSES.md` |
| Derivatives operations | `DERIVATIVES_AND_MARGIN.md` | `REGULATORY.md` (EMIR/SFTR), `ACCOUNTING_STANDARDS.md` |
| Performance measurement | `PERFORMANCE_MEASUREMENT.md` | `RECONCILIATION_AND_OPS.md`, `FEES_AND_EQUALIZATION.md` |
| Fund restructuring | `FUND_RESTRUCTURING.md` | `FUND_LIFECYCLE.md`, `GOVERNANCE_AND_COMPLIANCE.md`, `TRANSFER_AGENCY.md` |
| Securities lending | `SECURITIES_LENDING.md` | `DERIVATIVES_AND_MARGIN.md`, `REGULATORY.md`, `DISTRIBUTIONS_AND_INCOME.md` |
| Financial reporting | `FINANCIAL_REPORTING.md` | `ACCOUNTING_STANDARDS.md`, `GOVERNANCE_AND_COMPLIANCE.md`, `IRISH_ADMIN_REQUIREMENTS.md` |
| Sanctions screening | `REGULATORY.md` (Section 15) | `INVESTOR_ONBOARDING_AND_SERVICING.md` |
| Dormant accounts | `TRANSFER_AGENCY.md` (Section 16-17) | `INVESTOR_ONBOARDING_AND_SERVICING.md`, `DISTRIBUTIONS_AND_INCOME.md` |

## Files Produced/Modified

| File | Status | Tokens | Phase |
|---|---|---|---|
| `domain/FUND_LIFECYCLE.md` | **New** | ~4500 | Phase 1 |
| `domain/REGULATORY.md` | **New** | ~6500 | Phase 2 (agent) |
| `domain/ACCOUNTING_STANDARDS.md` | **New** | ~6500 | Phase 3 (agent) |
| `domain/TRANSFER_AGENCY.md` | **New** | ~6800 | Phase 4 (agent) |
| `domain/FEES_AND_EQUALIZATION.md` | **New** | ~4500 | Phase 5 (agent) |
| `domain/TAX.md` | **New** | ~8500 | Phase 6 (agent) |
| `domain/GOVERNANCE_AND_COMPLIANCE.md` | **New** | ~6800 | Phase 7 (agent) |
| `domain/RECONCILIATION_AND_OPS.md` | **New** | ~8500 | Phase 8 (agent) |
| `domain/NAV_METHODOLOGY.md` | **New** | ~4500 | Phase 9a |
| `domain/INVESTMENT_MANDATES.md` | **New** | ~4000 | Phase 9b |
| `domain/FUND_ACCOUNTING.md` | **Enriched** | ~700→~4000→~7000 | Phase 1.10, Phase 2.10c |
| `domain/SHARE_CLASSES.md` | **Enriched** | ~650→~3000 | Phase 1.10 |
| `domain/COMPETITORS.md` | Unchanged | ~850 | — |
| `domain/INTEGRATIONS.md` | Unchanged | ~700 | — |

### Phase 2 Files (Gap Fill)

| File | Status | Tokens | Phase |
|---|---|---|---|
| `domain/ERROR_SCENARIOS_AND_CRISIS.md` | **New** | ~9000 | Phase 2.1 |
| `domain/INVESTOR_ONBOARDING_AND_SERVICING.md` | **New** | ~9000 | Phase 2.2 |
| `domain/IRISH_ADMIN_REQUIREMENTS.md` | **New** | ~9000 | Phase 2.3 |
| `domain/INTERNAL_CONTROLS_AND_SOC.md` | **New** | ~9000 | Phase 2.4 |
| `domain/DISTRIBUTIONS_AND_INCOME.md` | **New** | ~9000 | Phase 2.5 |
| `domain/DERIVATIVES_AND_MARGIN.md` | **New** | ~9000 | Phase 2.6 |
| `domain/PERFORMANCE_MEASUREMENT.md` | **New** | ~7000 | Phase 2.7 |
| `domain/FUND_RESTRUCTURING.md` | **New** | ~6000 | Phase 2.8a |
| `domain/SECURITIES_LENDING.md` | **New** | ~6000 | Phase 2.8b |
| `domain/FINANCIAL_REPORTING.md` | **New** | ~9000 | Phase 2.9 |
| `domain/REGULATORY.md` | **Enriched** | ~6500→~11000 | Phase 2.10a |
| `domain/TRANSFER_AGENCY.md` | **Enriched** | ~6800→~9500 | Phase 2.10b |
| `domain/FUND_ACCOUNTING.md` | **Enriched** | ~4000→~7000 | Phase 2.10c |

**Total domain knowledge**: ~175,000+ tokens across 24 files (was ~4,050 tokens across 4 files before Phase 1).

## Gaps Filled in Phase 2

The following Phase 1 gaps were addressed:
- **Error scenarios and crisis management** → `ERROR_SCENARIOS_AND_CRISIS.md` (10 crisis playbooks, error taxonomy)
- **Investor onboarding workflows** → `INVESTOR_ONBOARDING_AND_SERVICING.md` (8 investor types, AML scoring)
- **Irish CBI-specific requirements** → `IRISH_ADMIN_REQUIREMENTS.md` (CP86, F&P, PRISM, Cayman comparison)
- **Internal controls and SOC 1** → `INTERNAL_CONTROLS_AND_SOC.md` (20 control objectives, COSO, SLAs)
- **Distribution calculations** → `DISTRIBUTIONS_AND_INCOME.md` (income equalization, day count conventions)
- **Derivatives and margin** → `DERIVATIVES_AND_MARGIN.md` (ISDA, SIMM, EMIR, SFTR, collateral)
- **Performance measurement** → `PERFORMANCE_MEASUREMENT.md` (TWR/MWR, GIPS, Brinson-Fachler, risk measures)
- **Fund restructuring** → `FUND_RESTRUCTURING.md` (mergers, redomiciliation, service provider transitions)
- **Securities lending** → `SECURITIES_LENDING.md` (GMSLA, collateral, revenue sharing, SFTR reporting)
- **Financial reporting** → `FINANCIAL_REPORTING.md` (FS layouts, audit process, filing deadlines)
- **EMIR/SFTR/PRIIPs/ELTIF/Sanctions** → Added to `REGULATORY.md` (6 new regulatory sections)
- **Forced redemption/switches/dormancy** → Added to `TRANSFER_AGENCY.md` (5 new sections)
- **Bond accounting/cross-trades** → Added to `FUND_ACCOUNTING.md` (4 new sections)

## Remaining Gaps

1. **Operational technology stack**: No detail on specific admin systems beyond SS&C Geneva (e.g., Advent Geneva, Paxus, InvestOne workflow details)
2. **Distribution agreements**: Platform distribution mechanics, rebate calculations, and trailer fee accruals are mentioned but not deeply documented
3. **Investor reporting templates**: No examples of actual investor statements, capital account statements, or tax vouchers
4. **Money laundering case studies**: AML/KYC requirements documented but real-world suspicious transaction indicators specific to funds are not
5. **Insurance/pension fund allocators**: Specific requirements of institutional allocators (insurance regulatory requirements, pension fiduciary rules) are not covered
6. **Digital assets/crypto-specific**: Crypto-specific admin challenges (24/7 markets, staking, DeFi position accounting) are not in domain files
7. **Jurisdiction expansion**: Luxembourg and Singapore admin requirements not yet documented (plan mentions future jurisdiction extension)

## Elysium-Specific Implications

| Knowledge Area | Implication for Elysium |
|---|---|
| Equalization methods | Elysium's dealing-level dilution is closest to "series accounting" — document this mapping |
| Swing pricing | Maps to `dealingDilution` — but current model may need swing factor configuration |
| NAV error correction | Need an off-chain error remediation workflow; on-chain NAV is immutable |
| FATCA/CRS | Investor classification (US person, reportable jurisdiction) needed in onboarding flow |
| Pre-trade compliance | Remains offchain; could eventually encode key limits as smart contract parameters |
| Distribution channels | Fund messaging (SWIFT, ISO 20022) integration needed for institutional distribution |
| Corporate actions | Handled offchain by PMS (Haruko); on-chain only sees net NAV impact |
| ISAE 3402/SOC 1 | Must design controls with auditability; 20 control objectives map to on-chain + off-chain processes |
| Crisis management | Fund suspension/gate activation needs on-chain dealing pause mechanism |
| Sanctions screening | Real-time investor screening before on-chain subscription; frozen asset handling in NAV |
| Income equalization | Per-investor accrued income at subscription — on-chain or off-chain with hash anchoring |
| Day count conventions | Bond accrual engine must support 5 conventions; critical for multi-asset fund NAV accuracy |
| GIPS compliance | TWR calculation engine for performance reporting; geometric linking of daily sub-period returns |
| Securities lending | Off-chain with on-chain audit trail; SFTR reporting integration needed |
| Fund mergers | On-chain exchange ratio application; share conversion with fractional share handling |

## Sources

All sources are documented within individual domain files. Key references across the knowledge base:
- Irish Funds Industry Association guides
- CSSF Luxembourg circulars (24/856)
- Central Bank of Ireland regulations
- ESMA UCITS/AIFMD guidelines
- BlackRock swing pricing whitepaper
- AIMA equalization guides
- Big 4 accounting firm fund guides (Deloitte, PwC, EY, KPMG)
- OECD CRS documentation
- SEC/FINRA investment company resources

## Related Context

- `claude_context/domain/` — All domain files
- `claude_context/product/OVERVIEW.md` — Elysium product overview
- `claude_context/technical/SMART_CONTRACTS.md` — On-chain architecture
- `docs/plans/2026-02-10-fund-admin-knowledge-base.md` — Research plan
