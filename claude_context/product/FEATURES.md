# Feature Inventory

<!-- ~1200 tokens -->
**Last Updated:** 2026-02-08

---

## Facet-to-Feature Mapping (16 Facets)

| Feature | Facet(s) | Status | Notes |
|---|---|---|---|
| Account management & multisig | AccountFacet | Done | Account creation, permissions (owner/operator), proposal system |
| Order management (subscribe/redeem/swap) | OrderManagementFacet, OrderValidationFacet | Done | Conditional orders, due dates, partial fills, forced redemptions |
| Token registry (ERC1155) | FundTokensFacet | Done | Token locking/unlocking, hierarchical holdings, transfers |
| Fund/class/dealing creation & config | FundManagementFacet | Done | Onramp/offramp, dealing token conversion, umbrella management |
| NAV updates & price calculation | NavManagementFacet | Done | Safety checks, dealing state machine, price history |
| Management & performance fees | FeeManagementFacet | Done | Fee minting, risk metrics (Sharpe, Sortino), audit history |
| Class-specific cost/gain adjustments | ClassAdjustmentFacet | Done | 13 adjustment labels, signed amounts, audit trail |
| Investor eligibility (KYC/accreditation) | EligibilityFacet | Done | KYC, accreditation, jurisdiction, investor type, tags |
| Fund/class lifecycle management | FundLifecycleFacet | Done | ACTIVE/RETIRED/CLOSED transitions, forced redemptions |
| FX rate management | FXManagementFacet | Done | Reference rates, batch updates, USD triangulation |
| Cross-umbrella settlement | SettlementFacet | Done | Cash fund settlement with FX validation |
| Investor queries | ViewCallsFacet | Done | Paginated orders, transfers, portfolio events, holdings |
| Eligible class queries | ViewCalls2Facet | Done | Eligible classes, investable funds |
| Admin dashboard queries | AdminViewCallsFacet | Done | System-wide stats, account summaries, role assignments |
| Manager dashboard queries | ManagerViewCallsFacet | Done | Fund summaries, class performance metrics |

---

## Critical Missing Features (from Product Audit)

### Deploy Blockers (P0)

| Feature | Gap | Effort |
|---|---|---|
| Emergency pause/suspend | No SUSPENDED status, no account freeze, no system pause | Medium |
| NAV correction mechanism | No `correctNav()` or `restateNav()` -- orders at wrong NAV cannot be unwound | High |

### Pre-Production (P1)

| Feature | Gap | Effort |
|---|---|---|
| Account freeze (OFAC/AML) | No freeze flag to block operations for investigated accounts | Low |
| KYC/accreditation expiry | No `kycExpiresAt` or `accreditationExpiresAt` fields | Low |
| FATCA/CRS data fields | No tax residency array, no classification flags | Low |
| Order reversal/adjustment | No compensating transaction type for processed orders | Medium |

### Production Hardening (P2)

| Feature | Gap | Effort |
|---|---|---|
| Redemption gates & LMTs | No gate limit, no cumulative redemption tracking | Medium |
| Distribution/dividend mechanism | No way to pay income distributions to holders | Medium |
| Beneficial ownership tracking | No UBO verification flags | Low |
| State root anchoring | No periodic hash publication to public chain | Medium |

### Enhancement (P3)

- Swing pricing for UCITS support
- Total expense ratio view functions
- Consolidated investor register view
- NAV checker role in approval workflow
- Side pocket mechanism for illiquid assets
- Investor count enforcement for ICA funds
