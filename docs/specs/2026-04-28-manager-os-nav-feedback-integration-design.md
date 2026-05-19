# Manager OS Nav — ptl-pod feedback integration

**Date:** 2026-04-28
**Author:** Brad (with Claude)
**Status:** Approved — ready for implementation
**Source feedback:** https://github.com/bradca1n/elysium-design/discussions/1

## Goal
Integrate ptl-pod's six review comments into the `manager-os-nav` HTML mockup. Iterate locally; push to `origin` (github.com/bradca1n/elysium-design) once each page is approved.

## Files in scope
- `mockups/manager-os-nav/views-nav.jsx` — `NavView` (NAV + P&L + BS summary page)
- `mockups/manager-os-nav/views-other.jsx` — `CollateralView` (L190), `ShareRegisterView` (L614)
- `mockups/manager-os-nav/views-economics.jsx` — `EconomicsView`

## Sequence
Sequential, biggest-first. Stop after each page; Brad reviews local mockup; then proceed.

### 1. NAV page — `views-nav.jsx`
- **Portfolio composition**: scaffold a Spot / Derivatives toggle with stub data on each side (placeholder pending Timo's answer on Haruko)
- **Venue breakdown** table: add `Expense / Income` column and `Margin vs. Required` column with colour ramp as it nears 100% (liquidation risk)
- **NEW Treasury "flows" mini-section** between Venue breakdown and P&L:
  - Net subs/redemptions number at top
  - ± subscriptions / redemptions inputs underneath
  - Available USD/stables vs. requirement
- **P&L attribution**: collapse position-level rows (BTC / ETH / other) to two category rows — Realised PnL / Unrealised PnL. Income / Fees / Subs / Redemptions rows remain
- **Balance Sheet section**: no changes (ptl-pod marked future-noted)

### 2. Collateral & Treasury page — `CollateralView` (views-other.jsx)
- Reorder so Treasury is on top, Collateral below
- Rename page header to "Treasury & Collateral" to match new ordering (sidebar label TBC)
- **Treasury**:
  - Net flow at top → ± subs/redemptions inputs
  - Cash position as multiple of avg daily withdrawals AND multiple of max withdrawals in next notice period
- **Collateral**:
  - Per-account fee, per-account income
  - Blended fee rate, blended income rate
  - Net rate (income − fee)

### 3. Share Register page — `ShareRegisterView` (views-other.jsx)
Full restructure, top-to-bottom:
1. Managers + POD's own holdings (duration profile + returns earned)
2. Blended measures band — Duration (min of notice/lock-up), Mgmt fees, Perf fees
3. Summary charts (default $ capital, not # investors)
4. Results delivered for investors — % of book by return threshold, % of dealings by return threshold
5. Share Classes
6. Full register

Drop the KYC health section entirely.

### 4. Economics page — `views-economics.jsx`
- Add `$ / %` toggle above existing $ section (same data, two views)
- Split Manager economics into two sub-sections:
  - (a) **Fees earned** — manager PnL with payables (custodian etc.) shown against it
  - (b) **Returns generated** — from monies the manager invested in the fund, retaining "locked / available for withdrawal" breakdown

## Decisions baked in
| # | Decision | Rationale |
|---|----------|-----------|
| 1 | Mock data for new sections invented but consistent with existing fund context ($47.46M NAV, POD Crypto Fund, share classes A/B/C) | Avoid waiting on real data definitions |
| 2 | Spot/Derivatives = tabbed placeholder with stub data both sides | Easiest to collapse once Timo's answer lands |
| 3 | Balance Sheet items from ptl-pod comment 2: deferred | ptl-pod's own call ("fine for MVP, just noting") |
| 4 | Rename page Collateral & Treasury → "Treasury & Collateral" | Matches the reordered sections |
| 5 | Per-page completion gate (Brad reviews after each page) | Catches direction mistakes before they compound |

## Out of scope
- Distribution / Benchmarking pages (v2)
- Figma file (mockup-only work — Figma untouched)
- Spot/Derivatives final structure (placeholder only — gated on Timo)

## Done criteria
Each page is complete when:
- All listed items implemented in the JSX
- Mockup renders cleanly in browser locally
- Brad has approved the page visually
- Page committed to a feature branch (push at end of all pages, or per-page if Brad prefers)
