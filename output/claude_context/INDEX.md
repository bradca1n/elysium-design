# Elysium Knowledge Base

<!-- ~1000 tokens (this file) -->

## How to Use

1. Read this index to find what you need
2. Load only the files relevant to your current task (token-conscious)
3. After completing work, update this index if you added/changed any files

## Product Context

| File | Tokens | Summary | When to Read |
|------|--------|---------|--------------|
| product/OVERVIEW.md | ~400 | What Elysium is, target market, value proposition | Starting any task |
| product/FEATURES.md | ~700 | Feature inventory with implementation status | Planning features |
| product/ENTITY_MODEL.md | ~500 | Business entity hierarchy and relationships | Understanding data model |
| product/REGULATORY.md | ~800 | SEC, EU, AML/KYC requirements and gaps | Compliance-related work |
| product/PRODUCT_MVP_REQUIREMENTS.md | ~12000 | MVP v1: Cayman SPC + Irish admin, crypto spot-only, accredited investors (superseded by V3) | Historical reference |
| product/MVP_PRODUCT_REQUIREMENTS_V2.md | ~25000 | MVP v2: Comprehensive encyclopedic reference, 25 sections, spot-only (superseded by V3) | Historical reference |
| product/MVP_PRODUCT_REQUIREMENTS_V3.md | ~22000 | **MVP v3 (CURRENT):** Phased launch playbook. Crypto spot + derivatives (CEX perps/futures/options). 3 instrument tiers, 4 launch phases (P0 Day 1, P1 Month 1-3, P2 Month 6-9, P3 Month 12-15). True minimum per phase. DeFi Tier 2, OTC Tier 3. | Product planning, feature prioritization, compliance scoping, launch sequencing |

## Technical Context

| File | Tokens | Summary | When to Read |
|------|--------|---------|--------------|
| technical/ARCHITECTURE.md | ~650 | Full-stack overview: how all pieces connect | Starting any task |
| technical/SMART_CONTRACTS.md | ~2800 | Diamond pattern, facets, storage, state machines, role system, order system, multi-currency, adjustments | Contract work (comprehensive architecture reference) |
| technical/FRONTEND.md | ~700 | Gluestack UI, NativeWind, design tokens, spacing | Frontend work |
| technical/BACKEND.md | ~700 | Lambda, Prisma, auth, wallet connectors | Backend work |
| technical/DATA_LAYER.md | ~750 | Offline-first sync, storage adapters, React Query | Data/state work |
| technical/ERROR_CORRECTION_ENGINE.md | ~8500 | What-if replay engine: fork→inject→replay→diff architecture, 3 injection types (corrective/compensatory/passthrough), strategy table, on-chain atomic CAS sstore correction, regulatory framework (CSSF 24/856) | Error correction, NAV restatement engine, what-if simulation |

## Audit Context

| File | Tokens | Summary | When to Read |
|------|--------|---------|--------------|
| audits/SECURITY_AUDIT.md | ~2300 | Smart contract findings: ID, severity, status (historical — see AUDIT_STATUS.md for current) | Security reviews |
| audits/PRODUCT_AUDIT.md | ~1100 | Regulatory compliance assessment | Product compliance work |
| audits/TECH_AUDIT.md | ~1500 | Technical architecture audit | Architecture decisions |
| audits/AUDIT_STATUS.md | ~9000 | Tracking table: V9 post-fix audit (31 new: 0C/1H/7M/13L/10I) + V8 extended (86 findings, 22 fixed, 6 still present), E-BC catalog (E-BC01–37), V9 findings tables | After fixing any finding |

## Reports

| File | Date | Topic | Key Findings |
|------|------|-------|--------------|
| reports/2026-03-03-security-audit-v9-report.md | 2026-03-03 | **Security Audit V9 (main report)** | Post-fix verification: 18/20 fixes correct, 31 new findings (0C/1H/7M/13L/10I). V9-CF-01 HIGH (fund-level blocking dead code). Maturity 2.22/4.0. |
| reports/2026-03-03-audit-v9-phase1-automated.md | 2026-03-03 | V9 Phase 1: Slither + forge test baseline | 49 Slither (4H FP, 45M), 1488/1488 tests pass |
| reports/2026-03-03-audit-v9-phase2-architecture.md | 2026-03-03 | V9 Phase 2: Architecture review | Fix interaction map, batch callback gap, fund-level block non-functional |
| reports/2026-03-03-audit-v9-phase3-progress.md | 2026-03-03 | V9 Phase 3: Per-facet agent progress | Running totals from agents A-C |
| reports/2026-03-03-audit-v9-agent-a-tokens.md | 2026-03-03 | V9 Agent A: Token & Access Control | V9-A-C01 CRITICAL(→MEDIUM), V9-A-H01 HIGH, 5 prior FIXED |
| reports/2026-03-03-audit-v9-agent-b-orders.md | 2026-03-03 | V9 Agent B: Order & NAV | V9B-05 MEDIUM, 5 prior FIXED, 1 BY DESIGN |
| reports/2026-03-03-audit-v9-agent-c-fees.md | 2026-03-03 | V9 Agent C: Fees & Performance | V9-FMF-05 MEDIUM, 10 prior FIXED |
| reports/2026-03-03-audit-v9-agent-d-management.md | 2026-03-03 | V9 Agent D: Fund Mgmt & Settlement | V9-D01/D04/D05 MEDIUM, 5 prior FIXED |
| reports/2026-03-03-audit-v9-agent-e-views.md | 2026-03-03 | V9 Agent E: Views & Eligibility | V8-6-01 confirmed bug, V9-E04 MEDIUM |
| reports/2026-03-03-audit-v9-phase4-cross-facet.md | 2026-03-03 | V9 Phase 4: Cross-facet analysis | 7 attack chains, V9-CF-01 HIGH, V9-CF-02/03 MEDIUM |
| reports/2026-03-03-audit-v9-phase5-tob.md | 2026-03-03 | V9 Phase 5: Trail of Bits methodology | 8 security properties, Echidna contract, maturity 2.22/4.0 |
| reports/2026-03-02-security-audit-v8-report.md | 2026-03-02 | **Security Audit V8 (main report)** | 67 findings (2C/9H/21M/28L/7I) + 7 attack chains + 10 gas. Maturity 1.89/4.0. ARCH-01 + E-BC22 CRITICAL open. 9 fixed since V7. See addendum for extended totals. |
| reports/2026-03-02-audit-v8-phase1-automated.md | 2026-03-02 | V8 Phase 1: Slither + forge test baseline | 5H(FP)/31M(4 genuine)/116L. 1,430 tests pass. |
| reports/2026-03-02-audit-v8-phase2-architecture.md | 2026-03-02 | V8 Phase 2: Architecture review | ARCH-01 root cause, call graph, internalExecutionContext analysis |
| reports/2026-03-02-audit-v8-agent-1-auth.md | 2026-03-02 | V8 Agent 1: AccountFacet + EligibilityFacet | 12 findings (2C/3H/4M/3L) |
| reports/2026-03-02-audit-v8-agent-2-tokens.md | 2026-03-02 | V8 Agent 2: FundTokensFacet | 9 findings (0C/2H/3M/3L/1I) |
| reports/2026-03-02-audit-v8-agent-3-nav-fees.md | 2026-03-02 | V8 Agent 3: NavManagement + FeeManagement + ClassAdjustment | 12 findings (0C/0H/4M/6L/2I) |
| reports/2026-03-02-audit-v8-agent-4-lifecycle.md | 2026-03-02 | V8 Agent 4: FundManagement + FundLifecycle | 12 findings (0C/2H/5M/5L) |
| reports/2026-03-02-audit-v8-agent-5-fx-settlement.md | 2026-03-02 | V8 Agent 5: FXManagement + SettlementFacet | 10 findings (0C/0H/3M/6L/1I) |
| reports/2026-03-02-audit-v8-agent-6-views.md | 2026-03-02 | V8 Agent 6: 4 View facets | 13 findings (0C/0H/4M/6L/3I) |
| reports/2026-03-02-audit-v8-phase3-progress.md | 2026-03-02 | V8 Phase 3: Mid-phase-3 gate checkpoint | Agents 1-3 summary, 33 raw findings, E-BC catalog update |
| reports/2026-03-02-audit-v8-phase4-cross-facet.md | 2026-03-02 | V8 Phase 4: 7 cross-facet attack chains (16 facets) | V8-CF01 NEW (adjustment deadlock). Chain 1 CRITICAL open. **Superseded by phase4-xchain-v2.md** |
| reports/2026-03-02-audit-v8-agent-7-fmv.md | 2026-03-02 | **V8 Extension Agent 7: FundManagementValidationFacet** | 8 findings (0C/0H/2M/4L/2I). V8-FMV-01 E-BC18, V8-FMV-05 conversion deadlock. |
| reports/2026-03-02-audit-v8-agent-8-pfs.md | 2026-03-02 | **V8 Extension Agent 8: PerfFeeStandardFacet** | 11 findings (0C/3H/4M/2L/2I). V8-PFS-01 E-BC31 #2, V8-PFS-02 panic deadlock, V8-PFS-03 hurdle manipulation. |
| reports/2026-03-02-audit-v8-phase4-xchain-v2.md | 2026-03-02 | **V8 Phase 4 v2: Full 18-facet cross-facet chain redo** | 7 original chains updated + 6 new chains (V8-CF02 CRITICAL, CF03-05 HIGH, CF06-07 MEDIUM). All 18 facets covered. |
| reports/2026-03-02-audit-v8-addendum.md | 2026-03-02 | **V8 Addendum: Extension findings consolidated** | Extended totals: 86 findings (2C/12H/27M/34L/11I) + 13 chains. V8-CF02 CRITICAL new. |
| reports/2026-03-02-audit-v8-phase5-tob.md | 2026-03-02 | V8 Phase 5: Trail of Bits maturity | 1.89/4.0, 7 security properties, V8-P01/P02 NEW (no pause, burn-without-unlock) |
| reports/2026-03-02-audit-v8-phase6-gas.md | 2026-03-02 | V8 Phase 6: 10 gas optimizations | GAS-03/04/05 HIGH. ~585K avoidable gas per large batch. |
| reports/2026-02-12-security-audit-v7-report.md | 2026-02-12 | **Security Audit V7 (main report)** | 82 findings (5C/16H/24M/22L/15I) + 10 attack chains + 8 gas. Maturity 2.3/4.0. |
| reports/2026-02-12-audit-v7-phase1-automated.md | 2026-02-12 | V7 Phase 1: Slither + forge coverage | 49 Slither findings (4H FP, 45M), 1404 tests pass |
| reports/2026-02-12-audit-v7-phase2-architecture.md | 2026-02-12 | V7 Phase 2: Architecture review | 6 architecture risks, trust boundaries, cross-facet call map |
| reports/2026-02-12-audit-v7-agent1-account-access.md | 2026-02-12 | V7 Agent 1: AccountFacet + EligibilityFacet | 15 findings (0C/4H/4M/5L/2I) |
| reports/2026-02-12-audit-v7-agent2-fund-lifecycle.md | 2026-02-12 | V7 Agent 2: FundMgmt + FundLifecycle | 12 findings (1C/2H/4M/4L/1I) |
| reports/2026-02-12-audit-v7-agent3-orders.md | 2026-02-12 | V7 Agent 3: OrderManagement + OrderValidation | 12 findings (1C/3H/4M/2L/2I) |
| reports/2026-02-12-audit-v7-agent4-nav-fees.md | 2026-02-12 | V7 Agent 4: Nav + Fees + ClassAdjustment | 16 findings (2C/3H/5M/4L/2I) |
| reports/2026-02-12-audit-v7-agent5-tokens-fx-settlement.md | 2026-02-12 | V7 Agent 5: FundTokens + FX + Settlement | 13 findings (0C/3H/4M/4L/2I) |
| reports/2026-02-12-audit-v7-agent6-views.md | 2026-02-12 | V7 Agent 6: 4 View facets | 12 findings (0C/0H/3M/5L/4I) |
| reports/2026-02-12-audit-v7-phase3-summary.md | 2026-02-12 | V7 Phase 3: Per-facet summary | 80 raw findings across 6 agents, dedup notes |
| reports/2026-02-12-audit-v7-phase4-cross-facet.md | 2026-02-12 | V7 Phase 4: 10 cross-facet attack chains | 4 CRITICAL chains, XF-01 self-amplifying |
| reports/2026-02-12-audit-v7-phase5-tob.md | 2026-02-12 | V7 Phase 5: Trail of Bits maturity | 2.3/4.0, 9 security properties (3 violated), 2 unique findings |
| reports/2026-02-12-audit-v7-phase6-gas.md | 2026-02-12 | V7 Phase 6: 8 gas optimizations | processOrders batching, SLOAD caching, cross-facet overhead |
| reports/2026-02-10-security-audit-v6-report.md | 2026-02-10 | **Security Audit V6 (main report)** | 83 findings (7C/19H/26M/18L/13I) + 18 attack chains + 20 gas. Maturity 2.4/4.0. |
| reports/2026-02-10-audit-v6-phase1-automated.md | 2026-02-10 | V6 Phase 1: Slither automated analysis | 59 contracts, 976 functions |
| reports/2026-02-10-audit-v6-phase2-architecture.md | 2026-02-10 | V6 Phase 2: Architecture review | 6 access control patterns, trust boundaries, cross-facet call graph |
| reports/2026-02-10-audit-v6-agent-1-auth.md | 2026-02-10 | V6 Agent 1: AccountFacet + EligibilityFacet | 17 findings (0C/3H/5M/6L/3I) |
| reports/2026-02-10-audit-v6-agent-2-orders.md | 2026-02-10 | V6 Agent 2: OrderManagementFacet + OrderValidationFacet | 24 findings (2C/5H/7M/6L/4I) |
| reports/2026-02-10-audit-v6-agent-3-fund-mgmt.md | 2026-02-10 | V6 Agent 3: FundManagementFacet + FundLifecycleFacet | 23 findings (2C/5H/7M/5L/4I) |
| reports/2026-02-10-audit-v6-agent-4-pricing-fees.md | 2026-02-10 | V6 Agent 4: NavManagement + FeeManagement + ClassAdjustment | 24 findings (3C/6H/6M/5L/4I) |
| reports/2026-02-10-audit-v6-agent-5-tokens-settlement.md | 2026-02-10 | V6 Agent 5: FundTokens + Settlement + FXManagement | 19 findings (2C/4H/6M/4L/3I) |
| reports/2026-02-10-audit-v6-agent-6-views.md | 2026-02-10 | V6 Agent 6: 4 View facets | 17 findings (0C/4H/7M/6L) |
| reports/2026-02-10-audit-v6-phase4-cross-facet.md | 2026-02-10 | V6 Phase 4: 18 cross-facet attack chains | (4C/8H/6M) privilege escalation map |
| reports/2026-02-10-audit-v6-phase5-tob.md | 2026-02-10 | V6 Phase 5: Trail of Bits maturity | 2.4/4.0, 9 security properties, 5 unique findings |
| reports/2026-02-10-audit-v6-phase6-gas.md | 2026-02-10 | V6 Phase 6: 20 gas optimizations | 50K-200K+ gas savings per processOrders batch |
| reports/2026-02-10-fund-admin-knowledge-base.md | 2026-02-10 | **Fund Admin Knowledge Base (synthesis)** | 10 domain files (8 new, 2 enriched), ~63K tokens. Cross-reference map, gap analysis. |
| reports/2026-02-09-security-audit-v5-report.md | 2026-02-09 | **Security Audit V5 (main report)** | 87 findings (15C/22H/24M/17L/9I), 15 attack chains, 10 gas, maturity 2.0/4.0. |

## Domain Knowledge

| File | Tokens | Summary | When to Read |
|------|--------|---------|--------------|
| domain/FUND_ACCOUNTING.md | ~7000 | NAV calculation, dilution, pricing chains, journal entries, chart of accounts, fund accounting cycle, accrued interest conventions, bond premium amortization, distribution methodology, cross-trade accounting | Understanding fund math, accounting entries |
| domain/ACCOUNTING_STANDARDS.md | ~6500 | IFRS/US GAAP (ASC 946), fair value hierarchy, journal entries, chart of accounts, derivatives, audit standards | Accounting, financial reporting |
| domain/SHARE_CLASSES.md | ~3000 | Class mechanics, hedging, denomination currencies, share class features (accumulation/distribution, fee tiers, clean/bundled, voting rights) | Multi-currency work, class design |
| domain/COMPETITORS.md | ~850 | Industry landscape: SS&C, BNY, pricing models | Product strategy |
| domain/INTEGRATIONS.md | ~700 | Haruko PMS, off-chain architecture, external systems | Integration work |
| domain/FEES_AND_EQUALIZATION.md | ~4500 | Management/performance fees, HWM, hurdle rates, equalization methods, PE waterfall, TER/OCF, retrocessions | Fee logic, equalization |
| domain/TAX.md | ~8500 | WHT treaty rates, FATCA/CRS, tax-transparent vs opaque, Irish/Luxembourg/Cayman/US taxation, PFIC/ECI/FIRPTA | Tax-related work |
| domain/REGULATORY.md | ~11000 | UCITS, AIFMD, US ICA 1940, Cayman, MiFID II, AML, GDPR, SFDR, EMIR, SFTR, ELTIF 2.0, PRIIPs, Sanctions | Compliance work |
| domain/TRANSFER_AGENCY.md | ~9500 | Transfer agent role, subscription/redemption workflows, dealing cycles, swing pricing, AML/KYC tiers, SWIFT/ISO 20022 | Transfer agency, order processing |
| domain/RECONCILIATION_AND_OPS.md | ~8500 | Daily NAV production cycle, position/cash reconciliation, trade lifecycle, corporate actions, pricing waterfall | Daily operations |
| domain/GOVERNANCE_AND_COMPLIANCE.md | ~6800 | Fund board, ManCo/AIFM, depositary liability, compliance, risk management, regulatory reporting, DORA | Governance, compliance |
| domain/FUND_LIFECYCLE.md | ~4500 | Fund stages (conception to wind-down), legal structures (ICAV, SICAV, RAIF, ELP, SPC, VCC), domicile comparison | Fund setup and lifecycle |
| domain/NAV_METHODOLOGY.md | ~4500 | Pricing regimes, NAV components, multi-class cascade, swing pricing, error materiality, rounding | NAV calculation, anti-dilution |
| domain/INVESTOR_ONBOARDING_AND_SERVICING.md | ~9000 | Onboarding workflows per investor type, AML risk scoring matrix, ongoing servicing, communications | Investor onboarding, KYC |
| domain/DISTRIBUTIONS_AND_INCOME.md | ~9000 | Distribution policy, income equalization, bond accounting, dividend recognition, special distributions | Distribution processing |
| domain/INVESTMENT_MANDATES.md | ~4000 | UCITS eligible assets, 5/10/40 rule, leverage, investment restrictions, SFDR Article 6/8/9, ESG | Investment restrictions |
| domain/INTERNAL_CONTROLS_AND_SOC.md | ~9000 | SOC 1 Type II, COSO framework, segregation of duties, RBAC/PAM, KRIs, SLAs, insurance | SOC 1 audit prep, controls |
| domain/IRISH_ADMIN_REQUIREMENTS.md | ~9000 | CBI authorization, Fitness & Probity, CP86, PRISM, Cayman requirements, dual-jurisdiction | Irish fund admin licensing |
| domain/DERIVATIVES_AND_MARGIN.md | ~9000 | Daily margin management, ISDA documentation, central clearing, EMIR, SFTR, collateral management | Derivatives operations |
| domain/ERROR_CORRECTION.md | ~6500 | Error propagation mechanics, error types by calculation chain position (pricing/FX/fee/share count/allocation), correction approaches (restatement vs prospective), performance fee correction complexity, compensation asymmetry, on-chain considerations | NAV error correction, restatement, fee error investigation |
| domain/ERROR_SCENARIOS_AND_CRISIS.md | ~9000 | Error taxonomy, crisis playbooks, fund wind-down/termination | Error handling, crisis management |
| domain/FINANCIAL_REPORTING.md | ~9000 | Fund financial statement layouts, audit process, semi-annual/interim reports, filing deadlines | Financial reporting |
| domain/PERFORMANCE_MEASUREMENT.md | ~7000 | TWR, MWR/IRR, GIPS 2020, Brinson-Fachler attribution, risk-adjusted measures, benchmarking | Performance calculation |
| domain/FUND_RESTRUCTURING.md | ~6000 | Fund mergers, share conversion, redomiciliation, service provider transitions, legal structure conversions | Fund restructuring |
| domain/SECURITIES_LENDING.md | ~6000 | Securities lending mechanics, GMSLA, collateral management, revenue sharing, SFTR, accounting | Securities lending |
| domain/TEST_DATA_SOURCES.md | ~9000 | Fund accounting test data landscape: 40+ sources across ILPA/FinDatEx/ISO 20022 templates, fee/waterfall Excel models, Big Four illustrative FS, on-chain peers (Chainlink DTA, Fume), swing pricing, FX hedging, performance datasets. Gap analysis. | Test data planning, validation |

## Tools & Configuration (for user, not loaded by Claude)

| File | Tokens | Summary | When to Read |
|------|--------|---------|--------------|
| TOOLS.md | ~800 | Two-layer system (aliases + roles), session flow, all tools reference | User reads before starting Claude Code — not part of role workflow |

## Roles

| File | Tokens | Summary | When to Read |
|------|--------|---------|--------------|
| roles/blockchain.md | ~500 | Tools, rules, patterns for smart contracts | Starting contract work |
| roles/frontend.md | ~500 | Tools, rules, patterns for UI development | Starting frontend work |
| roles/backend.md | ~450 | Tools, rules, patterns for API development | Starting backend work |
| roles/researcher.md | ~450 | Tools, rules, workflow for research tasks | Starting research tasks |
| roles/auditor.md | ~2500 | AI-native audit workflow: inline ⛔ GATE per phase, countable triggers, consequence statements, executing-plans skill, subagent delegation rules | Starting audit work |
| roles/fullstack.md | ~450 | Tools, rules for cross-cutting tasks | Cross-cutting tasks |
| roles/context-improver.md | ~550 | 4-phase system improvement workflow | Triggered by user for maintenance |
| roles/architect.md | ~3000 | Solutions architect: system design, API design, cloud architecture. 7 tools, 6 phases, ⛔ GATES, POST-COMPACTION. Produces design documents — not code. | Architecture tasks |
| roles/audit-fixer.md | ~3500 | Audit finding remediation: FAST/THOROUGH modes, TDD classification, per-cluster testing gates, parallel execution support | Fixing audit findings |
| roles/fund-expert.md | ~2000 | Fund admin domain expert: knowledge base synthesis, product specs, compliance analysis. 24-file map, SETUP GATE, COMPLETION GATE | Domain synthesis tasks |

## Error Catalogs

| File | Tokens | Summary | When to Read |
|------|--------|---------|--------------|
| errors/GENERAL.md | ~2000 | Cross-cutting mistakes: E-G01–G19 (file creation, imports, security, planning, context crash, performative compliance, plan re-read, disk persistence, subagent instruction chain break, batch edits without testing, skill context lost after compaction, repeated structural failure) | Every session |
| errors/blockchain.md | ~2800 | Smart contract pitfalls: E-BC01–BC37 (via_ir, storage, dealing IDs, audit methodology, cross-facet, ACL gaps, FX validation, dual state, ERC1155 reentrancy, CEI violation, tokenId mutation, cross-rate validation, Diamond reentrancy guard, dual totalSupply, FX bypass, schedule timestamps, uncapped fees, NAV stale data, ERC1155 callback execute* bypass, risk adjustor fail-open, no emergency pause) | Contract work |
| errors/frontend.md | ~800 | UI pitfalls: Gluestack, spacing, dark mode, tokens | Frontend work |
| errors/backend.md | ~500 | API pitfalls: validation, responses, rate limiting | Backend work |
| errors/fund-expert.md | ~500 | Domain synthesis pitfalls: E-FE01–FE05 (wrong jurisdiction, must vs nice-to-have, missing exclusions, no coverage validation, duplicating instead of cross-referencing) | Fund-expert tasks |

## Best Practices

| File | Tokens | Summary | When to Read |
|------|--------|---------|--------------|
| patterns/blockchain.md | ~300 | Verified smart contract patterns | Contract work |
| patterns/frontend.md | ~300 | Verified UI/component patterns | Frontend work |
| patterns/backend.md | ~250 | Verified API/service patterns | Backend work |

## Templates & Protocols

| File | Tokens | Summary | When to Read |
|------|--------|---------|--------------|
| templates/report.md | ~150 | Research report output format | Before writing reports |
| templates/product-spec.md | ~200 | Product specification scaffold (suggested, not required). Mandatory elements: scope, out-of-scope, cross-references | Before writing product specs |
| templates/plan.md | ~80 | Implementation plan format | Before writing plans |
| templates/error-entry.md | ~150 | Error catalog append format | Before logging errors |
| templates/index-entry.md | ~100 | INDEX.md row format | Before updating this file |
| templates/audit-status-entry.md | ~100 | AUDIT_STATUS.md row format | Before updating audit status |
| templates/audit-finding.md | ~110 | Audit finding documentation format | Before documenting findings |
| templates/audit-subagent-prompt.md | ~400 | Mandatory requirements for audit subagent prompts per phase | Before writing audit subagent prompts |
| templates/role-profile.md | ~280 | Role profile creation format | Before creating new roles |
| templates/component.md | ~200 | UI component scaffold format | Before creating components |
| protocols/tdd-workflow.md | ~700 | Red-green-refactor cycle, explicit Skill invocation syntax | TDD-based development |
| protocols/audit-workflow.md | ~1100 | Cross-facet methodology, parallel agent context management with countable triggers, agent sizing guide | Security audit work |
| protocols/design-to-code.md | ~450 | Pencil/Figma to Gluestack workflow | Design implementation |
| protocols/plan-then-implement.md | ~600 | When and how to plan before coding, workflow chain with Skill() syntax | Multi-step tasks |
| protocols/research-workflow.md | ~350 | How to conduct and output research | Research tasks |

## Reference (heavy, load on-demand only)

| File | Tokens | Summary | When to Read |
|------|--------|---------|--------------|
| reference/CLAUDE_CODE_SETUP_GUIDE.md | ~18000 | Full Claude Code setup reference (4,300 lines) | Configuring tools or debugging setup |

## Recommendations (Tracking)

| File | Tokens | Summary | When to Read |
|------|--------|---------|--------------|
| recommendations/tool-gaps.md | ~100 | Accumulated capability gaps from sessions | Context improvement sessions |

## Reports (Generated)

| File | Date | Topic | Key Findings |
|------|------|-------|--------------|
| reports/2026-02-13-fund-accounting-test-data-sources.md | 2026-02-13 | **Fund Accounting Test Data Sources** | 40+ sources across 9 categories. Best free: SEC N-PORT, NJ Treasury fee template, EDHEC returns, ALFI swing pricing. Biggest gap: multi-class NAV cascade + FX hedging (must synthesize). |
| reports/2026-02-09-mcp-servers-finance-fund-admin.md | 2026-02-09 | MCP servers for finance/fund admin | 30+ finance MCPs, ZERO fund-specific (NAV, GAAP, SEC). |
| reports/2026-02-09-security-audit-v2.md | 2026-02-09 | Security audit V2 | 146+ findings (4C new), 0 fixed from prior 66. NOT production-ready. |
| reports/2026-02-09-security-audit-v3-report.md | 2026-02-09 | **Security Audit V3 (main report)** | 99 findings (13C/27H/33M/24L), 7 attack chains, maturity 1.8/4.0. NOT production-ready. |
| reports/2026-02-09-audit-v3-phase1-automated.md | 2026-02-09 | V3 Phase 1: Automated | forge test 1383/1384 pass. Slither BLOCKED (0.8.30). |
| reports/2026-02-09-audit-v3-phase2-architecture.md | 2026-02-09 | V3 Phase 2: Architecture | 7 findings. internalExecutionContext reentrancy CRITICAL. |
| reports/2026-02-09-audit-v3-A1-access-tokens.md | 2026-02-09 | V3 A1: Access/tokens | 18 findings (4C/6H/5M/3L). |
| reports/2026-02-09-audit-v3-A2-orders-settlement.md | 2026-02-09 | V3 A2: Orders/settlement | 17 findings (2C/5H/6M/4L). |
| reports/2026-02-09-audit-v3-A3-nav-fees.md | 2026-02-09 | V3 A3: NAV/fees | 22 findings (4C/7H/6M/5L). |
| reports/2026-02-09-audit-v3-B1-fund-lifecycle.md | 2026-02-09 | V3 B1: Fund lifecycle | 19 findings (2C/5H/7M/5L). |
| reports/2026-02-09-audit-v3-B2-fx-views.md | 2026-02-09 | V3 B2: FX/views | 16 findings (0C/3H/7M/6L). |
| reports/2026-02-09-audit-v3-phase4-cross-facet.md | 2026-02-09 | V3 Phase 4: Cross-facet | 7 attack chains (4C/3H). RBAC bypass, dilution, FX arbitrage. |
| reports/2026-02-09-security-audit-v4-report.md | 2026-02-09 | **Security Audit V4 (main report)** | 75 deduplicated findings (11C/18H/21M/15L/5I), 10 attack chains, 28 gas findings, maturity 2.3/4.0. NOT production-ready. |
| reports/2026-02-09-audit-v4-phase1-automated.md | 2026-02-09 | V4 Phase 1: Automated | Slither 5H(FP)/56M/94L/217I. Forge 1383/1384 pass. |
| reports/2026-02-09-audit-v4-phase2-architecture.md | 2026-02-09 | V4 Phase 2: Architecture | 7 ARCH findings. Storage writers map, privilege levels. |
| reports/2026-02-09-audit-v4-agent1-account-eligibility.md | 2026-02-09 | V4 Agent 1: Account+Eligibility | 16 findings (3C/5H/5M/3L). |
| reports/2026-02-09-audit-v4-agent2-fundmgmt-lifecycle-tokens.md | 2026-02-09 | V4 Agent 2: FundMgmt+Lifecycle+Tokens | 19 findings (2C/5H/6M/4L/2I). |
| reports/2026-02-09-audit-v4-agent3-orders.md | 2026-02-09 | V4 Agent 3: Orders+Validation | 17 findings (1C/5H/6M/5L). |
| reports/2026-02-09-audit-v4-agent4-nav-fx-settlement.md | 2026-02-09 | V4 Agent 4: Nav+FX+Settlement | 13 findings (0C/4H/5M/4L). |
| reports/2026-02-09-audit-v4-agent5-fees-adjustments.md | 2026-02-09 | V4 Agent 5: Fees+Adjustments | 20 findings (4C/5H/5M/3L/3I). |
| reports/2026-02-09-audit-v4-agent6-views.md | 2026-02-09 | V4 Agent 6: Views | 13 findings (0C/3H/6M/4L). |
| reports/2026-02-09-audit-v4-phase4-cross-facet.md | 2026-02-09 | V4 Phase 4: Cross-facet | 10 attack chains (4C/4H/2M). Compounds: RBAC+reentrancy, fee+supply. |
| reports/2026-02-09-audit-v4-phase5-tob.md | 2026-02-09 | V4 Phase 5: Trail of Bits | Maturity 2.3/4.0. 7 properties (2 violated). 4 new findings. ACL = 1/4. |
| reports/2026-02-09-audit-v4-phase6-gas.md | 2026-02-09 | V4 Phase 6: Gas Optimization | 28 findings (7H/12M/9L). Top: convert cross-facet to libraries. |
| reports/2026-02-09-audit-v3-phase5-tob-methodology.md | 2026-02-09 | V3 Phase 5: ToB methodology | 9-category maturity 1.8/4.0, 6 security properties. |
| reports/2026-02-09-audit-v3-self-assessment.md | 2026-02-09 | V3 Self-assessment | Process failures, new errors E-G14/E-G15/E-BC16–19. |
