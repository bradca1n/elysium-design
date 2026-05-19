# Manager OS — NAV / P&L / Economics tweaks

**Date:** 2026-05-01
**Scope:** `mockups/manager-os-nav/` (static HTML/JSX mockup)
**Files touched:** `views-nav-terminal.jsx`, `views-pnl-bs.jsx`, `views-economics.jsx`

## Context

Round of tweaks to the Manager OS v3 mockup based on Brad's brief. Three pages affected: NAV, P&L, Economics. Goal is to lead with percentage-based metrics (not absolute figures), introduce a peer-comparison Risks block on NAV, simplify portfolio composition, and categorise Economics expenses. Reference design for the Risks sliders comes from a third-party mobile app screenshot supplied with the brief.

This is a mockup-only change — no real data wiring, no production code paths.

## Page-by-page spec

### NAV page (`views-nav-terminal.jsx`)

**1. Performance section (new)**
Inserted between the headline KPI strip and Portfolio composition.

- Header row: "Performance" (left); "Risk-free rate SOFR (4.83%) · Updated 30 Apr 2026, 14:02 UTC" (right, muted).
- 6-tile grid in a single row: `1W · 1M · 3M · 1Y · 5Y · All`.
- Each tile contains, top-to-bottom:
  - Period label (uppercase, muted)
  - % return as the headline (large, green/red), with `%` rendered smaller and muted next to the figure
  - A tiny sparkline (faux SVG path)
  - Hairline divider
  - Two stacked rows: `SHARPE` label + value, `SORTINO` label + value (rows, not columns)
- Active tile (default `1Y`) gets a 1px accent ring + tiny dot in the corner.
- Footer caption: "Click any period to drive the chart and detail view below. Sharpe / Sortino calculated over the matching window." (No chart actually wired — caption describes intended behaviour.)

Mock data:
| Period | Return | Sharpe | Sortino |
|---|---|---|---|
| 1W | +1.24% | 1.42 | 2.08 |
| 1M | +3.81% | 1.63 | 2.41 |
| 3M | +8.17% | 1.84 | 2.72 |
| 1Y | +24.63% | 2.11 | 3.24 |
| 5Y | +142.30% | 1.72 | 2.51 |
| All | +287.44% | 1.58 | 2.29 |

**2. Risks section (new)**
Inserted between Performance and Portfolio composition.

- Section title: "Risks".
- Three slider rows, each with:
  - Bold title + `?` info icon.
  - Plain-English verdict subline (e.g. "More risk and more profitability", "Portfolio is great").
  - Gradient bar (pink → amber → green, full width). Endpoint labels at left (`0`) and right (max).
  - White-bordered thumb at the fund's value, with a small pill above showing the numeric value.
  - Peer marker beneath the bar (small dark pill labelled `MARKET` or `SPX`) at the peer's position.

Rows:
| Metric | Range | Fund value | Peer marker | Verdict |
|---|---|---|---|---|
| Beta | 0–2 | 1.752 | MARKET @ 1.0 | "More risk and more profitability" |
| Sharpe ratio | 0–3 | 0.724 | SPX @ 0.95 | "Portfolio is unprofitable" |
| Sortino ratio | 0–5 | 4.234 | SPX @ 1.20 | "Portfolio is great" |

Verdict copy is illustrative. The gradient communicates "risk-adjusted goodness"; the peer marker provides relative context.

**3. Portfolio composition (restructure)**

- Remove the `SegToggle` (Spot / Derivatives toggle) from the section header.
- Render the spot table first with these columns: Asset · Price · Allocation (% only, no inline bar) · Value · **Delta** · 24h.
  - Drop **Units** column.
  - Drop the inline allocation bar inside each row; keep the % text.
  - Add **Delta** column showing signed dollar exposure (= Value for spot).
- Below the spot rows: an accordion strip "Derivatives (3)" that expands inline.
  - Closed state: single row showing label + count + chevron.
  - Open state: same column layout as spot, derivatives rows beneath.
- Donut chart on the right unchanged. When derivatives accordion is open, donut still shows spot-only (or the union — TBD in implementation, default to spot-only for v1).

### P&L page (`views-pnl-bs.jsx`)

**1. KPI tiles — TradingView-style absolute + inline %**

Each tile now shows the absolute figure with the percentage inline immediately after the unit, both in tabular numerics. Visual reference: the Total gain card from the brief.

| Label | Absolute | Inline % | Subline |
|---|---|---|---|
| Net P&L | +$2.34M | +5.18% | on opening NAV |
| Gross income | +$2.81M | +6.21% | of opening NAV |
| Total fees | −$0.47M | −1.04% | of opening NAV |
| Realised / unrealised | 62 / 38 | — | $1.45M realised vs $0.89M mark |

Format: `+$2.34M` in large weight + `+5.18%` smaller and muted, sitting on the same baseline. Subline beneath.

**2. Income statement — % of gross column**

Add a new right-aligned column "% of gross" to every row in the IncomeStatement table. Denominator is gross income ($2.81M).

Examples:
- Realised trading gains: `+$1,450,000` · `51.6%`
- Unrealised mark-to-market: `+$890,000` · `31.7%`
- Management fee: `−$312,400` · `−11.1%`
- etc.

Apply to both Income and Costs groups, and to the totals rows. Sign carried through.

### Economics page (`views-economics.jsx`)

**1. KPI tiles — lead with %**

Restructure `KpiCard` so the % is the headline figure and the absolute moves to the subline.

| Tile | Headline % | Absolute (subline) | Trailing copy |
|---|---|---|---|
| Fees earned · YTD | 1.78% of NAV | $844,200 | +12.4% vs prior YTD |
| Available for withdrawal | 0.25% of NAV | $118,400 | Swept to Operating monthly |
| Invested in the fund | 1.50% of NAV | $711,763 | +12.8% return on basis |
| Expenses · YTD | 0.25% of NAV | $117,720 | Custody across 4 venues |

**2. "Invested in the fund" SubCard — performance columns**

Existing card already lists re-invested fee tranches. Extend the table:

| Existing | New |
|---|---|
| Date · Class · Units · Value | + Basis · Return % |

Headline `$711,763` paired with `+12.8%` aggregate return (TradingView format).

Each tranche's Return % computed as (current per-unit value − basis) / basis. Use plausible mock numbers — the Class A tranches near-flat (units priced ~$100), Class I tranche showing larger return.

**3. Expenses paid — categorised**

Replace the single flat custody table with a categorised structure. Four subsections, each rendered as its own SubCard or sub-block under the "Expenses paid" section header:

- **Custody** — current 5 venues (Coinbase Prime, Copper, BitGo, Fireblocks, Self-custody). $117,720 YTD.
- **Service providers** — Apex (administration), Clifford Chance (legal), PwC (audit), KPMG (tax review). New rows.
- **Trading** — exchange fees + spread by venue (Binance, OKX, Coinbase). New rows.
- **Audit & legal** — collapses into Service providers? Decide at implementation: prefer 3 categories (Custody · Service providers · Trading) for cleaner read.

Each subsection: subtitle + small total + table of rows. Top-level total under all subsections.

## Out of scope

- Real chart wiring on the Performance section (caption only).
- Wiring the active period tile to filter anything.
- Hooking accordion state to the donut.
- Any backend / data-layer changes (mockup is static JSX).

## Risks / open implementation calls

1. **Donut behaviour with derivatives accordion**: default to spot-only, revisit if it reads weirdly in dark mode.
2. **Risks slider gradient in light mode**: mockup palette is green-forward. Use a muted version of the dark pink→amber→green gradient that doesn't fight the rest of the page in light mode. Verify after implementation.
3. **% of gross sign convention**: costs shown as negative percentages (e.g. `−11.1%`) for visual parity with the negative dollar amounts.

## Approval

Brief locked with Brad on 2026-05-01:
- Risks placement: under Performance, before Composition (recommended; approved).
- Delta: single column, signed dollar exposure (confirmed against position-blotter reference).
- LP performance: scope is the manager's own re-invested tranches, not a separate LPs table.
- KPI tiles: TradingView-style absolute + inline %.
- P&L line items: separate "% of gross" column.
