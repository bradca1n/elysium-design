# Manager OS NAV/P&L/Economics Tweaks — Implementation Plan

**Goal:** Apply Brad's 2026-05-01 brief to the `manager-os-nav` mockup: new Performance + Risks sections on NAV, restructured Portfolio composition, % treatments on P&L and Economics, categorised Economics expenses.

**Architecture:** Static React (Babel standalone) mockup. Three JSX files mounted by `index.html`. No build step, no tests — verification is visual in-browser. Each phase produces a self-contained, reviewable change.

**Tech Stack:** React 18 (UMD), Babel standalone, vanilla CSS variables (light/dark via `body.dark` class), no test infrastructure.

**Spec:** `docs/specs/2026-05-01-manager-os-nav-tweaks-design.md`

**Verification model:** After each phase, reload `mockups/manager-os-nav/index.html` in a browser and visually confirm the change in dark mode (default). Light mode pass at the end.

---

## Phase 1 — NAV Performance section

**Files:**
- Modify: `elysium-design/mockups/manager-os-nav/views-nav-terminal.jsx`

- [ ] **Step 1.1: Add `perfPeriods` mock data array** to `NavView`, above the `assets` array. Six entries with shape `{ k, label, ret, retNum, sharpe, sortino, spark }`. Use the figures from the spec table. `spark` is a short SVG path string (8–12 points, gently rising) per period.

- [ ] **Step 1.2: Add `activePeriod` state** with `useState('1Y')` near the existing `activeAsset` / `assetGroup` state.

- [ ] **Step 1.3: Build `<PerformanceCard>` component** at the bottom of `views-nav-terminal.jsx` (above the `Object.assign(window, …)` line).

  Layout (single tile):
  - Outer: `border: 1px solid var(--line-1)`, `border-radius: 10px`, `padding: 16px 18px 14px`, `background: var(--bg-card)`. Active tile: `border: 1px solid var(--accent-plum)`, plus an absolute-positioned dot top-right (`width:6 height:6 borderRadius:50% background:var(--accent-plum)`).
  - Row 1: period label uppercase tracked muted (`fontSize: 10px`, `letterSpacing: .10em`, `color: var(--ink-3)`).
  - Row 2: return — `<span style={{fontSize:28, fontWeight:500, color:'var(--pos)' or 'var(--neg)'}}>{ret}</span><span style={{fontSize:14, color:'var(--ink-3)', marginLeft:2}}>%</span>`. Sign carried in `ret`.
  - Row 3: sparkline — `<svg viewBox="0 0 80 24" width="100%" height="24"><path d={spark} fill="none" stroke="var(--pos)" strokeWidth="1.25"/></svg>`.
  - Row 4: hairline (`height:1, background:var(--line-1), margin:'10px 0 8px'`).
  - Rows 5/6: stacked SHARPE / SORTINO. Each is a flex row `justifyContent:space-between`: left = label uppercase tracked muted, right = value tabular-nums.
  - Whole tile is a `<button>` (semantic) with `onClick={() => onActivate(k)}`, `cursor:pointer`, `background:transparent` (or card bg), `text-align:left`.

- [ ] **Step 1.4: Build `<PerformanceSection>` wrapper component** rendering header row + 6-tile grid + footer caption.

  - Header: flex row, left = `<SubTitle title="Performance"/>`-equivalent (just inline since we want a row), right = small muted string `Risk-free rate SOFR (4.83%) · Updated {NOW_LABEL}`. Hardcode `NOW_LABEL = '30 Apr 2026, 14:02 UTC'`.
  - Grid: `display:grid, gridTemplateColumns:'repeat(6, minmax(0,1fr))', gap:12`.
  - Footer caption: `fontSize:11.5, color:'var(--ink-3)', marginTop:12`.

- [ ] **Step 1.5: Mount the section in `NavView`** — insert `<PerformanceSection …/>` immediately after the headline KPI grid `<div>` (currently wrapping NAV/Period P&L/NAV per share) and before the existing `<SubTitle title="Portfolio composition" …/>`. Wrap in a new `<section style={{marginBottom:48}}>` so it sits as its own block.

- [ ] **Step 1.6: Browser check** — reload `index.html`, confirm:
  - Six tiles visible in a single row, no overflow at 1500px max-width.
  - 1Y tile has accent ring + dot.
  - Clicking another tile switches the active state.
  - Sparklines render.
  - SHARPE / SORTINO are stacked rows, not side-by-side columns.

---

## Phase 2 — NAV Risks section

**Files:**
- Modify: `elysium-design/mockups/manager-os-nav/views-nav-terminal.jsx`

- [ ] **Step 2.1: Add `risks` mock data array** above `perfPeriods` in `NavView`. Three entries: `{ key, title, verdict, value, max, peerLabel, peerValue, gradient }`. Use the table from the spec. The `gradient` field is a CSS string — for dark mode use `'linear-gradient(90deg, #e85aa3 0%, #f59e3a 35%, #f0c453 60%, #6dd9b1 100%)'`. (Same gradient works in both modes; we'll only revisit if it reads wrong in light.)

- [ ] **Step 2.2: Build `<RiskSlider>` component** at bottom of file.

  Layout (single row):
  - Outer: `padding: 22px 0`, `borderBottom:'1px solid var(--line-1)'`. Last row has no bottom border.
  - Title row: `fontSize: 18px`, `fontWeight: 600`, `color: var(--ink-1)`, with a `?` info circle inline (existing `Icon` may not exist — use a simple `<span>` with a circle SVG). Verdict subline beneath: `fontSize:13, color:var(--ink-2), marginTop:2`.
  - Track wrapper: `position:relative, height: 8, borderRadius: 4, marginTop: 24, background: <gradient>`.
  - Endpoint labels: `0` left of track, `max` right of track, `fontSize:11, color:var(--ink-3)`, positioned absolutely at the ends of the track row (use a flex parent with the track sandwiched between two text spans).
  - Thumb: `position:absolute, top: 50%, left: calc((value/max) * 100%), transform: translate(-50%, -50%)`. White circle `width:14 height:14 borderRadius:50% background:#fff border:2px solid var(--bg-canvas) boxShadow:'0 1px 4px rgba(0,0,0,0.4)'`.
  - Value pill above thumb: `position:absolute, top: -22px, left: <same %>, transform: translate(-50%, 0)`. Background `var(--bg-subtle)`, padding `2px 6px`, borderRadius `4px`, fontSize `11px`, fontVariantNumeric `tabular-nums`.
  - Peer marker beneath: `position:absolute, top: 18px, left: <peerValue/max %>, transform: translate(-50%, 0)`. Dark pill `background:var(--bg-subtle), color:var(--ink-2), padding:'3px 7px', borderRadius:4, fontSize:10, letterSpacing:'0.08em', fontWeight:600`. Tiny `▲` indicator above pill (or a 1px vertical tick from the track to the pill).

- [ ] **Step 2.3: Build `<RisksSection>` component** rendering the three sliders.

  - Section title row: same `<SubTitle title="Risks"/>` style as Portfolio composition.
  - Container: simple stacked rows, no card border, just the per-row hairline dividers from `<RiskSlider>`.

- [ ] **Step 2.4: Mount the section in `NavView`** — insert `<RisksSection/>` immediately after the Performance section, wrapped in `<section style={{marginBottom:48}}>`, before the Portfolio composition `<SubTitle/>`.

- [ ] **Step 2.5: Browser check** — confirm:
  - Three sliders render with correct values: Beta 1.752 / Sharpe 0.724 / Sortino 4.234.
  - Gradient bar reads correctly in dark mode.
  - Peer markers (`MARKET`, `SPX`, `SPX`) are at sensible positions (1.0, 0.95, 1.20 on their respective scales).
  - Value pills sit above the thumbs without clipping.

---

## Phase 3 — NAV Portfolio composition restructure

**Files:**
- Modify: `elysium-design/mockups/manager-os-nav/views-nav-terminal.jsx`

- [ ] **Step 3.1: Drop the SegToggle** from `<SubTitle title="Portfolio composition" right={…}/>` — change `right` to `null` (or omit). Remove the `assetGroup` state, the `setAssetGroup` setter, and the `activeAssets = …` ternary line.

- [ ] **Step 3.2: Add `delta` field to spot data** — for each item in the `assets` array, add `delta: <value>` matching the row's `value` (since spot delta = market value). Same for `derivatives` array, but with sign baked into the data (e.g. `delta: '+$3,200,000'` for long perp, `delta: '−$525,000'` for short ETH perp).

- [ ] **Step 3.3: Update spot table column layout** — rewrite the column-template grid for both header and rows:
  - From: `'28px minmax(0,1fr) minmax(0,1.1fr) 90px minmax(0,1.4fr) 120px 70px'` (Asset / Units / Price / Allocation / Value / 24h)
  - To: `'28px minmax(0,1fr) 90px 80px 120px 120px 70px'` (Asset / Price / Allocation% / Value / Delta / 24h)
  - Header cells: drop "Units", drop the wide allocation column, keep "Allocation" as a narrow % column, add "Delta" right-aligned.
  - Row cells: drop the units cell, drop the inline `<span style={{flex:1,height:4,background:'var(--bg-subtle)'…}}/>` allocation bar — keep only the % text, then cells for Value, Delta (right-aligned, tabular-nums, signed colour: `var(--pos)` if `+`, `var(--neg)` if `−`), 24h.

- [ ] **Step 3.4: Replace `activeAssets` references with `assets`** in the table mapping (we no longer toggle).

- [ ] **Step 3.5: Add derivatives accordion below the spot rows.**
  - New state: `const [derivOpen, setDerivOpen] = _u1(false);`
  - After the last spot row, add a button row with the same grid template:
    ```jsx
    <button onClick={() => setDerivOpen(o => !o)} style={{
      display:'grid', gridTemplateColumns:'<same>', gap:16,
      padding:'14px 4px', borderBottom:'1px solid var(--line-1)',
      width:'100%', background:'transparent', border:'none', cursor:'pointer',
      color:'var(--ink-2)', fontSize:12.5, fontFamily:'inherit', textAlign:'left'
    }}>
      <span style={{display:'inline-flex',alignItems:'center',justifyContent:'center'}}>
        {/* chevron — rotate 90deg when open */}
        <svg width="11" height="11" viewBox="0 0 16 16" style={{transform: derivOpen?'rotate(90deg)':'none', transition:'transform 0.15s'}} fill="none" stroke="currentColor" strokeWidth="2"><polyline points="6 4 10 8 6 12"/></svg>
      </span>
      <span style={{fontWeight:500,color:'var(--ink-1)'}}>Derivatives ({derivatives.length})</span>
      {/* fill remaining cells with empty divs */}
    </button>
    ```
  - When `derivOpen`, render the derivatives rows using the same row JSX as spot.

- [ ] **Step 3.6: Donut chart** — leave wired to the spot `assets` array only (donut shows spot composition). Confirm there are no remaining references to `activeAssets`.

- [ ] **Step 3.7: Browser check** — confirm:
  - SegToggle is gone.
  - Spot table shows new column shape, no Units, no inline bar, with Delta column.
  - Derivatives row is collapsed by default with chevron and count.
  - Clicking the row expands the 3 derivatives rows; chevron rotates.
  - Delta values show signed dollar exposure with positive/negative colour.
  - Donut still renders and is hover-reactive.

---

## Phase 4 — P&L tweaks

**Files:**
- Modify: `elysium-design/mockups/manager-os-nav/views-pnl-bs.jsx`

- [ ] **Step 4.1: Update KPI tile data** in `ProfitLossView` — add a `pct` field to each KPI:
  ```js
  { l: 'Net P&L', v: '+$2.34M', pct: '+5.18%', s: 'on opening NAV', pos: true },
  { l: 'Gross income', v: '+$2.81M', pct: '+6.21%', s: 'of opening NAV' },
  { l: 'Total fees', v: '−$0.47M', pct: '−1.04%', s: 'of opening NAV' },
  { l: 'Realised / unrealised', v: '62 / 38', pct: null, s: '$1.45M realised vs $0.89M mark' },
  ```

- [ ] **Step 4.2: Update the inline KPI render** in `ProfitLossView` to show `v` + `pct` inline:
  ```jsx
  <div style={{display:'flex',alignItems:'baseline',gap:10}}>
    <span style={{fontSize:32,fontWeight:500,letterSpacing:'-0.05em',fontVariantNumeric:'tabular-nums',color: k.pos?'var(--pos)':'var(--ink-1)'}}>{k.v}</span>
    {k.pct && <span style={{fontSize:15,fontWeight:500,color: k.pos?'var(--pos)':'var(--ink-3)',fontVariantNumeric:'tabular-nums'}}>{k.pct}</span>}
  </div>
  ```
  Subline (`k.s`) unchanged below.

- [ ] **Step 4.3: Add `% of gross` to IncomeStatement rows.** In the `IncomeStatement` component, pre-compute `pct` for each item using gross = 2_810_200:
  - For Income items: `pct = (amount / gross * 100).toFixed(1) + '%'`. Sign matches the amount sign.
  - For Cost items: same, but negative since amounts are negative.
  - Compute totals' percentages too: gross = 100.0%, total costs = ~−19.6%.

  Hand-compute the values and store as static strings in the `rows` data structure (avoid runtime math — easier to read in the JSX). Examples:
  - Realised trading gains `+$1,450,000` → `+51.6%`
  - Unrealised mark `+$890,000` → `+31.7%`
  - Staking & yield `+$462,000` → `+16.4%`
  - FX & other `+$8,200` → `+0.3%`
  - Gross income total → `+100.0%`
  - Management fee `−$312,400` → `−11.1%`
  - Performance fee `−$156,800` → `−5.6%`
  - Trading costs `−$42,100` → `−1.5%`
  - Custody & audit `−$21,900` → `−0.8%`
  - Administration `−$18,600` → `−0.7%`
  - Total costs → `−19.6%`
  - Net P&L for period (`+$2,258,400`) → `+80.4%`

- [ ] **Step 4.4: Render the new column.** In the row JSX (`<div style={{display:'flex'…}}>`), insert a new fixed-width cell after the value cell:
  ```jsx
  <div style={{width:90,textAlign:'right',fontSize:13,fontVariantNumeric:'tabular-nums',color:'var(--ink-3)'}}>{r.pct}</div>
  ```
  Apply the same to total rows and the Net P&L closer row. Keep the value cell at its current width.

- [ ] **Step 4.5: Browser check** — navigate to P&L view (use the Tweaks panel "Jump to" or sidebar). Confirm:
  - All four KPI tiles show `$value  +X.XX%` inline format.
  - Income statement rows show `% of gross` aligned right.
  - Net P&L closer row shows `+80.4%`.

---

## Phase 5 — Economics tweaks

**Files:**
- Modify: `elysium-design/mockups/manager-os-nav/views-economics.jsx`

- [ ] **Step 5.1: Update `KpiCard` to lead with %.** Modify the `KpiCard` component signature to accept a `pct` prop, render `pct` as the headline (32px) and `v` (the absolute) as a smaller subline (`fontSize:14, color:var(--ink-2), marginTop:4`). The `s` (existing subline) drops to the bottom in the existing 12px style.

  Updated render order: `l` label → `pct` headline → `v` absolute → `s` trailing copy.

- [ ] **Step 5.2: Update KPI calls** in `EconomicsView`:
  ```jsx
  <KpiCard l="Fees earned · YTD"        pct="1.78%"  v="$844,200" s={<>...+12.4% vs prior YTD</>}/>
  <KpiCard l="Available for withdrawal" pct="0.25%"  v="$118,400" s="Swept to Operating monthly"/>
  <KpiCard l="Invested in the fund"     pct="1.50%"  v="$711,763" s="+12.8% return on basis"/>
  <KpiCard l="Expenses · YTD"           pct="0.25%"  v="$117,720" s="Custody across 4 venues" neg/>
  ```

- [ ] **Step 5.3: Extend reinvested data with basis + return.** In the `reinvested` array, basis is already there. Add `returnPct`:
  ```js
  { date: '07 Apr 2026', class: 'Class A', units: '1,284.2', value: '$128,657', basis: '$100.16', returnPct: '+0.18%', status: 'locked' },
  { date: '05 Mar 2026', class: 'Class A', units:   '912.8', value: '$91,477',  basis: '$100.22', returnPct: '+0.04%', status: 'locked' },
  { date: '03 Feb 2026', class: 'Class I', units:   '42.10', value: '$423,141', basis: '$10,048.40', returnPct: '+0.04%', status: 'locked' },
  { date: '06 Jan 2026', class: 'Class A', units:   '683.3', value: '$68,488',  basis: '$100.24', returnPct: '+0.02%', status: 'locked' },
  ```
  (Note: with the basis values shown, the per-unit returns are tiny. Bump to `basis: '$96.00'` etc. so the returns actually show movement: e.g. Class A tranche returns `+4.4%`, Class I `+5.8%`. Pick basis values that produce a plausible aggregate `+12.8%` weighted by tranche value.)

  Recalculate so aggregate ≈ +12.8%:
  - Class A `1,284.2 units @ $128,657 value` → basis `$112.00`/unit → return `+8.4%`
  - Class A `912.8 units @ $91,477` → basis `$92.00` → return `+8.9%`
  - Class I `42.10 units @ $423,141` → basis `$8,800` → return `+14.2%`
  - Class A `683.3 units @ $68,488` → basis `$94.00` → return `+6.6%`
  - Aggregate: total value $711,763, total basis ≈ $631K → ~`+12.8%` ✅

- [ ] **Step 5.4: Update the Invested-in-fund table headers + rows.** Add `<th>` for "Basis" and "Return" between Class and Units. Update each `<tr>` to include `<td>{r.basis}</td>` and `<td>{r.returnPct}</td>` with `color: var(--pos)` for positive returns.

- [ ] **Step 5.5: Pair the headline with aggregate return.** Update the `SubCard amount` for "Invested in the fund" — the SubCard component currently renders `amount` as a single 32px figure. Either:
  - (a) Change the call to pass a JSX node that renders absolute + inline %, OR
  - (b) Extend `SubCard` with an optional `pct` prop and render it inline.
  Pick (b) for symmetry with the KPI cards. Modify `SubCard` to optionally render `pct` inline with `amount`.

  Then the call becomes: `<SubCard title="Invested in the fund" amount="$711,763" pct="+12.8%" …/>`.

- [ ] **Step 5.6: Categorise expenses.** Replace the single `<SubCard title="Custody fees" …/>` block at the end of `EconomicsView` with three SubCards stacked, each rendering its own table:

  - **Custody** — current 5 venues. Heading total `$117,720`.
  - **Service providers** — new mock data:
    - Apex Fund Services · Administration · Monthly $4,200 · YTD $16,800
    - Clifford Chance · Legal · Quarterly $6,200 · YTD $18,600
    - PwC · Audit · Quarterly $7,700 · YTD $15,400
    - KPMG · Tax review · Annual — · YTD $4,400
    - Total monthly $18,100 · Total YTD $55,200
  - **Trading** — new mock data:
    - Binance · Spot + perps · Monthly $2,800 · YTD $11,200
    - OKX · Spot · Monthly $1,400 · YTD $5,600
    - Coinbase · Spot · Monthly $980 · YTD $3,920
    - Total monthly $5,180 · Total YTD $20,720

  Each SubCard uses its own simple table with columns appropriate to the category (Venue/Provider, Service or Rate, Monthly, YTD).

  Drop the "Audit & legal" idea — collapsed into Service providers per the spec note.

- [ ] **Step 5.7: Browser check** — navigate to Economics view. Confirm:
  - Four KPI tiles lead with % (1.78%, 0.25%, 1.50%, 0.25%).
  - Invested-in-fund headline shows `$711,763  +12.8%`.
  - Tranche table has Basis + Return columns, returns coloured green.
  - Three expense subsections (Custody, Service providers, Trading) stack vertically with their own tables.

---

## Phase 6 — Light mode + cross-browser pass

- [ ] **Step 6.1: Toggle light mode** via the Tweaks panel and sweep all three pages. Look for:
  - Risks gradient bar legibility (may need to tune colours if it fights the page).
  - KPI tile inline % colour balance.
  - Accordion chevron contrast.

- [ ] **Step 6.2: Capture screenshots** — three pages × two modes (NAV/P&L/Economics × dark/light) for the comments thread. Save to `/tmp` or post directly to giscus depending on workflow.

- [ ] **Step 6.3: Final commit** — single commit covering all phases is fine for a mockup; phases 1–6 don't need separate commits unless something needs rollback.

---

## Out of scope (do not implement)

- Wiring the Performance period tile to filter anything else on the page.
- Real chart in the Performance section (caption only).
- Synced donut behaviour when the derivatives accordion expands.
- Any test infrastructure.
- Any production code paths or data wiring.

## Risks / watch-outs

1. **Babel standalone parses JSX in-browser** — keep components self-contained in their existing JSX file; no new files or modules unless absolutely necessary.
2. **Animation delays in the existing CSS** assume a small number of `[data-page] > *` children. Adding two new top-level `<section>` blocks on NAV may push later sections beyond the 8th-child cap — fine, they fall into the `n+8` bucket.
3. **`SubCard` is shared** by Available for withdrawal AND Invested in the fund. Adding an optional `pct` prop (Step 5.5) is non-breaking for the other call site.
4. **`<button>` semantics** for the accordion row — make sure existing CSS selectors (e.g. `button { border-radius: 6px !important; }`) don't visually break the row layout. Override `borderRadius:0` on that specific button if needed.
