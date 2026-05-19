# Manager OS NAV — Component Inventory

Source: `manager-os-nav-bundle.html` (7280 lines, JSX-style React mock).
Purpose: hand-off list for building a single-source-of-truth spreadsheet that maps mockup components → Storybook codebase components → Figma components.

Line numbers reference the source file for cross-checking.

---

## Atoms (small, single-purpose primitives)

| Component | Line | Purpose |
|---|---|---|
| Icon | 630 | Icon set (multiple glyphs) |
| TargetChip | 912 | Status chip with tone |
| Avatar | 927 | User avatar with initials/icon + unread dot |
| TabChip | 1007 | Chip-style tab |
| AttrMarker | 1942 | Attribution marker |
| StatusChip | 1994 | Generic status pill |
| StatusChipX | 2507 | Order book status variant |
| OrderTypeTag | 2502 | Order type label |
| PageKebab | 1902 | Overflow / kebab button |
| SegToggle | 1966 | Segmented control |
| ThemeSegment | 1441 | Theme switcher |
| Toggle | 3725 | Switch |
| MarginBar | 1982 | Margin / progress bar |
| LockupChip | 3915 | Lockup period chip |
| KycChip | 3927 | KYC status chip |
| ClassStatusChip | 3888 | Share class status |
| PageBtn | 3903 | Pagination button |
| StatusBadge | 5274 | Status badge |
| BellSnoozeIcon | 5319 | Bell w/ snooze indicator |
| InvestorStatusPill | 5943 | Investor status |
| KycBadge | 5952 | KYC badge |
| LockupBadge | 5967 | Lockup badge |
| EntityIcon | 4038 | Entity-type icon |
| InputSuffix / InputPrefix | 3734 / 3740 | Input adornments |
| SubTitle | 1932 | Section subtitle |
| DurationLegendRow | 3957 | Chart legend row |

## Molecules (composed functional units)

| Component | Line | Purpose |
|---|---|---|
| Kpi | 1888 | KPI value + label + delta (inline strip) |
| KpiCard | 4897 | KPI tile (card variant) |
| SectionHead | 1910 | Section title + desc + CTA + right slot |
| SectionHeadE | 4910 | Economics section head variant |
| BSSectionHead | 4635 | Balance sheet section head |
| SubCard | 4918 | Sub-card with amount / pct / action |
| FilterBar | 4588 | Filter row (range + chips) |
| FloatingField | 3562 | Labeled input w/ prefix / suffix / options |
| NextDealingCountdown | 839 | Countdown display |
| NotifRow | 952 | Notification list row |
| NavItem | 1319 | Sidebar nav item |
| ExpandableItem | 1337 | Sidebar expandable group |
| RiskCard | 2323 | Risk metric + peer comparison |
| ClassCard | 5288 | Share class summary card |
| BSRow | 4644 | Balance sheet line row |
| BSSection | 1947 | Balance sheet sub-section |
| NotesBlock | 4653 | Notes / details block |
| VenuePicker | 3034 | Venue selector |
| StatusGroup | 5260 | Status item group |
| StatusPanel | 5189 | Capacity / status overview |
| RiskCheckList | 2980 | Risk checklist |
| HoldingBars | 3941 | Horizontal holdings bars |
| FeeBars | 4954 | Fee comparison bars |
| ConcentrationPie | 4021 | Concentration pie |
| DurationDonut | 3967 | Duration donut |
| Donut | 817 | Generic donut |
| DonutChart | 1779 | Interactive donut (hover) |
| NavChart | 677 | NAV trend line |
| PerformanceChart | 2120 | Performance line w/ range |
| SpotRow | 2021 | Spot positions table row |
| DerivativeRow | 2041 | Derivatives table row |
| OrderTimeline (inline) | ~2570 | Vertical stepper inside OrderDrawer (dot + connector lifecycle: Funds verified → AML/KYC → etc.). No named component — pattern is inlined. |
| WizardStepper (inline) | ~2870 | Horizontal step indicator inside MoveCollateralSheet (numbered circles + connectors, current/done/pending states). No named component — pattern is inlined. |

## Tables (16+ distinct)

| # | Page | Line | Description |
|---|---|---|---|
| 1 | Order Book | 2457 | Order book entries |
| 2 | Collateral / Treasury | 2744 | Spot positions |
| 3 | Collateral / Treasury | 2814 | Derivatives positions |
| 4 | Share Register | 3331 | Investor share register |
| 5 | Share Register | 3506 | Share classes |
| 6 | Reconciliation | 4082 | Reconciliation log |
| 7 | P&L | 4267 | P&L by strategy |
| 8 | P&L | 4315 | P&L by asset |
| 9 | P&L | 4384 | Fees & expenses |
| 10 | Economics | 4792 | Fees earned |
| 11 | Economics | 4816 | Fees earned sub-table |
| 12 | Economics | 4853 | Expenses paid |
| 13 | Overview | 5109 | Recent activity |
| 14 | Home | 5770 | Home table (needs context check) |
| 15 | Investors | 6059 | Investors list |
| 16 | Investor Profile | 6175 | Investor profile table A |
| 17 | Investor Profile | 6209 | Investor profile table B |

## Organisms / overlays (composed sections, multi-molecule)

**Side sheets / drawers / modals:**
- `ShareClassSheet` (3633) — **two modes:** Create (`mode='create'`) and Edit (`mode='edit'`). Contains 6 form sub-sections: Identity, Currency & Hedging, Fees, Dealing & Liquidity, Advanced. Internally uses `FloatingField`, `Toggle`, `InputSuffix`, `InputPrefix`.
- `OrderDrawer` (2518) — Order details panel. Uses `OrderTypeTag`, `StatusChipX`, and the inline `OrderTimeline` stepper.
- `MoveCollateralSheet` (2846) — Multi-step wizard (4 steps: Source & destination → Amount & asset → Risk check → Sign & broadcast). Uses the inline `WizardStepper` and `RiskCheckList`.
- `SideSheet` (2009) — Generic side panel.
- `FeedbackModal` (1205) — Feedback collection modal (textarea + send/cancel).
- `SnoozeModal` (5327) — Snooze action modal.

**Composed page sections:**
`Navbar` (863), `Sidebar` (1283), `IncomeStatement` (4203), `Attribution` (4410), `PerformanceSection` (2059), `RisksSection` (2306)

## Pages (top-level views)

`HomeView`, `NavView`, `OrderBookView`, `CollateralView`, `ShareRegisterView`, `ShareClassesView`, `ReconciliationView`, `ProfitLossView`, `BalanceSheetView`, `EconomicsView`, `OverviewView`, `ActionsView`, `InvestorsView`, `InvestorProfileView`

---

## Key observation — KPI fragmentation

The mockup has **only 2 KPI primitives**: `Kpi` (inline strip) and `KpiCard` (tile variant).

The current codebase (`Elysium/packages/app/components/molecules/`) has **11 separate KPI molecule components**:

- `ShareClassKPIs`
- `ManagerFundEconomicsKpiStrip`
- `BalanceSheetKpiStrip`
- `ManagerKpiStrip`
- `ShareClassFeesKPIs`
- `ProfitLossKpiGrid`
- `ManagerFundNAVKpiHeadline`
- `ManagerFundOrderBookKpis`
- `ReconciliationKpiStrip`
- `BlendedKpiStrip`
- `UpcomingFlowsKpiTiles`

The mockup pattern (matching the Figma design system, which uses one component with variants) is the consolidation target.

---

## Spreadsheet columns (for the inventory workbook)

When the workbook is built, each tab (one per Manager OS page) should have these columns:

1. Section
2. Element
3. Type (Atom / Molecule / Organism / Template / Page)
4. Codebase component
5. Codebase path
6. Figma component
7. Figma variants
8. Consolidation status (Matches / Fragmented / Missing / Needs variant / Needs new component / Deprecated)
9. Comments
10. Ready for prod (checkbox)
