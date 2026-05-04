# POD Mockup Stylesheet

A reference for spinning up new POD HTML mockups that match the look and feel of `index.html`. Hand this file to Claude (or any contributor) along with `index.html` and `pod-logo.svg` and they should be able to produce a new page that lives next to it without visual drift.

This is a **single-file, self-contained HTML** style — all CSS lives in a `<style>` block at the top of the page, no build step, no framework. Inter is loaded from Google Fonts.

---

## 1. Design philosophy

- **Editorial, not dashboard.** Content flows on a white canvas. No card chrome around sections, no shadows, no rounded panels for the page itself. Borders are hairlines and used sparingly.
- **Hierarchy is built with weight, size, and space — not boxes.** A section is a heading + a thin divider above it + breathing room. Avoid nesting cards inside cards.
- **One accent.** POD green (`#45d59b`) is the only chromatic colour. Everything else is ink/grey/white. Use the accent for: positive numbers, the "your fee share" highlight, check icons, and the rate pill — and that's it.
- **Numbers are typographic citizens.** Tabular nums everywhere a number appears, so columns align without manual fiddling.
- **Sentence case** for section labels and most headings (not Title Case). Letter-spacing tightens slightly as size grows.

When you're tempted to add a coloured background, a shadow, or a second accent — don't. Add space instead.

---

## 2. Tokens (drop in unchanged)

```css
:root {
  /* Surface */
  --bg-canvas: #FFFFFF;          /* page */
  --bg-glass:  #FAF9F7;          /* warm off-white — toggle track, table head, focus ring */
  --bg-card:   #FFFFFF;          /* bordered containers (tier card, calc pane, stat tile) */
  --bg-subtle: #EAEFEC;          /* reserved, rarely used */

  /* Ink (text) */
  --ink-1: #0E0F12;              /* primary text, headings, numbers */
  --ink-2: #4F5258;              /* body copy, secondary labels */
  --ink-3: #82858B;              /* hints, captions, tertiary metadata */

  /* Lines */
  --line-1: #E4E3DE;             /* default hairline (warm grey) */
  --line-2: #D2D1CB;             /* slightly stronger, rarely used */

  /* Accent — POD green */
  --accent:      #45d59b;
  --accent-soft: rgba(69,213,155,0.16);   /* tinted backgrounds, pill fills */
  --accent-on:   #FFFFFF;
  --accent-grad: linear-gradient(135deg,#5edaa6,#45d59b);
  --green-300: #82e0b9;
  --green-400: #5edaa6;
  --green-500: #45d59b;
  --green-600: #29b07d;
  --green-700: #1d7d59;

  /* Semantic */
  --pos: #45d59b;                /* gains, positive deltas */
  --neg: #e13733;                /* losses, negative deltas */
}
```

**Rule of thumb for which token to use:**
- Ink-1 = "you should read this": titles, key numbers, primary values.
- Ink-2 = "context for the thing above": body prose, table cell secondary col.
- Ink-3 = "you can skim past this": hints, captions, eyebrows, totals labels.

---

## 3. Typography

- **Family:** Inter, with the system stack as fallback.
  ```html
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
  ```
  ```css
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
  ```
- **Base:** 14px / 1.5, antialiased.
- **Tabular numerals utility** — apply wherever numbers appear:
  ```css
  .num { font-variant-numeric: tabular-nums; font-feature-settings: "tnum", "ss01"; }
  ```
  In practice it's set inline on inputs, stat values, table cells, legend values, and breakdown values.

### Type scale (used in this file)

| Role | Size | Weight | Letter-spacing | Notes |
|------|------|--------|---------------|-------|
| Page title (`h1`) | 40px | 600 | -0.025em | line-height 1.1 |
| Section heading (`h2`) | 24px | 600 | -0.015em | sits below a hairline divider, see §5 |
| Tier card title | 36px | 600 | -0.025em | tabular-nums |
| Big number (bar header) | 36px | 600 | -0.025em | tabular-nums, line-height 1 |
| Stat value | 24px | 600 | -0.02em | tabular-nums |
| Explainer intro | 19px | 600 | -0.01em | the lede line under h1 |
| Pill toggle button | 17px | 500 | — | |
| Section label | 16px | 600 | -0.01em | sentence case, used inside the calc pane |
| Results title | 16px | 600 | -0.01em | |
| Body prose | 14.5px | 400 | — | line-height 1.7 |
| Default body | 14px | — | — | inputs, breakdown rows, list items |
| Tier card eyebrow / desc | 13.5–14.5px | 400 | — | ink-3 |
| Legend name / dc-lbl / dc-sub | 13px | 500 / 400 | — | |
| Table cells | 12.5px | 400/500 | — | |
| Field label | 12px | 500 | — | ink-2 |
| Stat label | 12px | 500 | — | ink-3 |
| Table header | 11.5px | 500 | — | ink-3, on bg-glass |
| Note / hint | 11–11.5px | 400 | — | ink-3, line-height 1.7 |
| Tier rate pill | 10.5px | 600 | 0.02em | accent on accent-soft |

If a new size is needed, prefer one of these before inventing a new value.

---

## 4. Layout

```css
body {
  background: var(--bg-canvas);
  color: var(--ink-1);
  font-size: 14px;
  line-height: 1.5;
  -webkit-font-smoothing: antialiased;
  min-height: 100vh;
  padding: 48px 16px 96px;       /* generous top, very generous bottom */
}
.page { max-width: 780px; margin: 0 auto; }
```

- **Single column, 780px max.** This is a reading-width layout, not a dashboard. Don't widen it.
- **Top padding 48px, bottom padding 96px** so the page doesn't feel cramped against the viewport.
- The whole document sits inside `<div class="page">…</div>`.
- Sections are wrapped in `<div class="card">` blocks — note that `.card` here is **transparent** with just `margin-bottom: 56px`. The class name is historical; it's really just a section container.

---

## 5. Section heading + divider (the most distinctive pattern)

Every major section starts with an `<h2>` that has a hairline divider above it. The spacing is tuned so the title sits visibly closer to the divider than to the body copy below it — this anchors the title to its section rather than floating mid-gap.

```css
h2 {
  font-size: 24px;
  font-weight: 600;
  letter-spacing: -0.015em;
  line-height: 1.25;
  color: var(--ink-1);
  margin: 50px 0 36px;           /* 50px above the divider, 36px below the title */
  padding-top: 29px;             /* gap from divider down to the title */
  border-top: 1px solid var(--line-1);
}
h2:first-child {                 /* never put a divider above the very first section */
  margin-top: 0; padding-top: 0; border-top: none;
}
h2.spaced { margin-bottom: 40px; }   /* use when next element is a tight block (toggle, grid) */
```

**Vertical rhythm cheat sheet:**
- 50px from previous content to the divider line.
- 29px from divider line down to the title text.
- 36px (or 40px with `.spaced`) from title down to the next element.

If you need a section heading without a divider (e.g. it's the first one, or it lives inside a bordered pane), use `<h2 class="…">` with a class that overrides border/padding — or just use a `.section-label` instead.

---

## 6. The page shell

```html
<body>
  <div class="page">

    <div class="card">                            <!-- just a transparent section container -->
      <div class="card-header">
        <img class="pod-logo" src="pod-logo.svg" alt="POD">
        <h1>Page title here</h1>
      </div>

      <div class="card-body">
        <p class="explainer-intro">One-line lede that sets up the page.</p>
        <p class="explainer-prose">Body paragraph with the why.</p>

        <h2>First section</h2>
        <p class="explainer-prose">…</p>

        <h2 class="spaced">Second section</h2>
        <!-- tight content here -->

      </div>
    </div>

  </div>
</body>
```

`card-header` styles:
```css
.card-header {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 44px;                      /* logo to title */
  margin-bottom: 48px;
}
.card-header h1 { font-size: 40px; font-weight: 600; letter-spacing: -0.025em; line-height: 1.1; }
.pod-logo { height: 28px; width: auto; display: block; flex-shrink: 0; }
```

---

## 7. Components — copy-paste reference

### 7.1 Pill segmented toggle

```html
<div class="toggle-wrap">
  <div class="seg-toggle" role="tablist">
    <button class="seg-btn active" data-target="a" type="button">Tab A</button>
    <button class="seg-btn"        data-target="b" type="button">Tab B</button>
  </div>
</div>
```
```css
.toggle-wrap   { display: flex; justify-content: center; padding: 32px 0 40px; }
.seg-toggle    { display: inline-flex; background: var(--bg-glass); border-radius: 999px; padding: 5px; }
.seg-btn       { border: 0; background: transparent; padding: 10px 22px; font-size: 17px; font-weight: 500;
                 color: var(--ink-2); border-radius: 999px; cursor: pointer;
                 transition: background .18s, color .18s, box-shadow .18s; font-family: inherit; }
.seg-btn:hover:not(.active) { color: var(--ink-1); }
.seg-btn.active { background: var(--bg-card); color: var(--ink-1);
                  box-shadow: 0 1px 2px rgba(14,15,18,.06), 0 0 0 .5px rgba(14,15,18,.04); }
```
JS pattern: each click toggles `.active` on the buttons and `hidden` on `#a-pane`/`#b-pane`.

### 7.2 Section label (inside a pane)

A weight-driven sub-heading used inside the calc pane. No border, sentence case.
```html
<div class="section-label">Fund details</div>
```
```css
.section-label { font-size: 16px; color: var(--ink-1); font-weight: 600;
                 margin: 24px 0 12px; letter-spacing: -0.01em; }
.section-label:first-child { margin-top: 0; }
```

### 7.3 Form field with symbol prefix/suffix

```html
<div class="row">
  <div class="field">
    <label>Total AUM (M)</label>
    <div class="iw sl"><span class="sym l">$</span><input type="number" value="10"></div>
  </div>
  <div class="field">
    <label>Expected Annual Return</label>
    <div class="iw sr"><span class="sym r">%</span><input type="number" value="20"></div>
    <span class="hint">net of mgmt fee, on AUM</span>
  </div>
</div>
```
- `.row` is a 2-col grid (`grid-template-columns: 1fr 1fr; gap: 12px`).
- `.iw.sl` = symbol left (input padded `0 12px 0 24px`).
- `.iw.sr` = symbol right (input padded `0 28px 0 12px`).
- Inputs are 38px tall, 1px hairline border, 6px radius, focus ring is the warm glass colour (`box-shadow: 0 0 0 3px var(--bg-glass)`) plus a darker border.
- `.hint` is 11px ink-3.

### 7.4 Tier card grid

```html
<div class="tier-grid">
  <div class="tier-card">
    <div class="tier-card-eyebrow">Launch stage</div>
    <div class="tier-card-title">$0–10M<span class="unit">AUM</span></div>
    <div class="tier-card-desc">Short description.</div>
    <div class="tier-card-meta">
      <div class="tier-card-meta-lbl">Take rate</div>
      <div class="tier-card-meta-val">25% of gross fees</div>
    </div>
  </div>
  <!-- more cards… -->
</div>
```
- `.tier-grid` is a 2-col grid, `gap: 14px`.
- `.tier-card` — bordered (`1px var(--line-1)`), `14px` radius, `28px 28px 26px` padding, `min-height: 280px`, flex column. `.tier-card-meta` uses `margin-top: auto` to pin to the bottom.
- Big tier amount is 36px / 600 / -0.025em / tabular-nums. The `.tier-card-title` is a flex row with `align-items: baseline; gap: 8px` so a unit label can sit beside it.
- `.unit` modifier (used inline as `<span class="unit">AUM</span>`) — 14px / 500, ink-3, uppercase, `letter-spacing: 0.04em`. Use it any time the big number needs a unit (AUM, USD, FTE, etc.) without competing with the figure.
- Eyebrow and desc are ink-3.

This is the primary "card with chrome" pattern in the file. Use it for **comparable items in a grid** (tiers, plans, options) — not for arbitrary content blocks.

### 7.5 Calculator pane (bordered container)

When you need a self-contained interactive area on the page, wrap it in the same chrome as the tier cards:
```css
#calc-pane {
  background: var(--bg-card);
  border: 1px solid var(--line-1);
  border-radius: 14px;
  padding: 28px;
}
```

### 7.6 KPI / stat tile

```html
<div class="stat-row">
  <div class="stat">
    <div class="stat-lbl">Gross Fees</div>
    <div class="stat-val">$200,000</div>
  </div>
  <div class="stat accent">                       <!-- highlighted variant -->
    <div class="stat-lbl">Your Net Fee Income</div>
    <div class="stat-val">$150,000</div>
  </div>
</div>
```
- `.stat-row` — 2-col grid, `gap: 10px`.
- `.stat` — hairline, 10px radius, `14px 16px` padding.
- `.stat.accent` — `background: var(--accent-soft)`, transparent border. Label and value flip to `var(--accent)`.

Use the `.accent` variant **once per group** to direct the eye to the headline number.

### 7.7 Breakdown rows (key/value list)

```html
<div class="bk">
  <div class="br"><span class="br-k">Management fee income</span><span class="br-v">$200,000</span></div>
  <div class="br"><span class="br-k">Total gross fees</span><span class="br-v n">$300,000</span></div>
  <div class="br"><span class="br-k" style="font-weight:600;color:var(--ink-1)">Your Net Fee Income</span><span class="br-v g">$240,000</span></div>
</div>
```
Modifiers on the value:
- `.br-v` — default, ink-1, 500 weight, tabular-nums.
- `.br-v.g` — green/accent, 600 weight (use for the bottom-line "good" number).
- `.br-v.p` — ink-2, secondary value (the deductions).
- `.br-v.n` — neutral ink-1, used for subtotals.

No internal borders, just `padding: 6px 0` per row.

### 7.8 Tier breakdown table

```html
<div class="table-wrap">
  <table class="tier-table">
    <thead>
      <tr><th>Tier</th><th>AUM in tier</th><th>Take rate</th><th>POD fee</th></tr>
    </thead>
    <tbody>
      <tr><td>$0 – 10m</td><td>$10.0m</td><td><span class="tier-rate-pill">25%</span></td><td>$50,000</td></tr>
    </tbody>
    <tfoot>
      <tr class="total-row"><td colspan="2">Blended base rate</td><td colspan="2" style="text-align:right">17% ($85,000)</td></tr>
    </tfoot>
  </table>
</div>
```
- Headers: 11.5px / 500 / ink-3, on `var(--bg-glass)`, hairline below.
- Rows: 12.5px, hairline below each row, last cell right-aligned + tabular-nums.
- 2nd column is ink-2 + tabular-nums (secondary numeric).
- `.total-row` — bg-glass, 600 weight, hairline above, no hairline below.
- `.tier-rate-pill` — 10.5px / 600, accent on accent-soft, 4px radius — small inline pill for rates.

### 7.9 Stacked bar chart with hover-linked legend

(See `index.html` lines around the `.bar-chart` block for the structure.) The pattern:
- 32px tall track, 6px radius, 2px gap between segments, hairline-free.
- Segments are coloured via inline `style.background` set in JS.
- A header above the bar shows a label + a 36px number + a sub-line. Hovering a segment OR a legend row updates the header and dims the others (`opacity: 0.3` on segments, `.dim` class on legend rows). Mouse-leave returns to the default summary.
- Colour mapping used:
  - `keep` (your share) → `#45d59b` accent
  - `base` (POD base take) → `#0E0F12` ink-1
  - `ci` (POD cap intro) → `#82858B` ink-3

### 7.10 Check list (feature bullets)

```html
<ul class="check-list">
  <li>POD is a licensed Fund Administrator — no third-party admin needed.</li>
  <li>Custodial and audit minimums are absorbed at the umbrella level.</li>
</ul>
```
The bullet is a 14px tinted square (`accent-soft`) with an inline-SVG accent-coloured tick. Item text is 14.5px / ink-2 / line-height 1.65. See the existing `.check-list` rules — they reference an `xmlns="http://www.w3.org/2000/svg"` data URI for the tick.

### 7.11 Note / footnote

```html
<p class="note">Footnote-style explanation, methodology, asterisk content.</p>
```
```css
.note { font-size: 11.5px; color: var(--ink-3); line-height: 1.7;
        margin-top: 16px; padding-top: 16px; border-top: 1px solid var(--line-1); }
```

### 7.12 Divider

```css
.divider { border: 0; border-top: 1px solid var(--line-1); margin: 24px 0; }
```
Use **inside a pane** (e.g. between input rows and results in the calc pane). For top-level section breaks, use the `<h2>` divider pattern in §5 instead.

---

## 8. Conventions

- **Tabular numerals** on every number-bearing element. Easiest: add inline `font-variant-numeric: tabular-nums` or use the `.num` utility.
- **Money:** `'$' + Math.round(n).toLocaleString()` — whole dollars, comma-separated, no decimals (used for all dollar values in the calculator).
- **Percent:** one decimal by default (`pct(n)`), zero decimals when precision isn't meaningful (`pct(n, 0)`).
- **Sentence case** for h1/h2/h3-style labels. (Tier card titles like "$0–10M" are obviously the exception.)
- **Capitalisation in copy:** "POD" is always all-caps (it's the product name). Don't write "Pod".
- **Em-dashes** in copy use real `—`, not `--`.
- **Negative space > borders.** When in doubt, increase a margin instead of adding a rule.

---

## 9. Starter template

A minimal page that already conforms to this stylesheet. Copy this, add sections inside `.card-body`, and you're matching the look without re-deriving anything.

```html
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>POD — [page title]</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
<style>
  :root {
    --bg-canvas:#FFFFFF; --bg-glass:#FAF9F7; --bg-card:#FFFFFF; --bg-subtle:#EAEFEC;
    --ink-1:#0E0F12;    --ink-2:#4F5258;    --ink-3:#82858B;
    --line-1:#E4E3DE;   --line-2:#D2D1CB;
    --accent:#45d59b;   --accent-soft:rgba(69,213,155,0.16); --accent-on:#FFFFFF;
    --pos:#45d59b;      --neg:#e13733;
  }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    font-family:'Inter',-apple-system,BlinkMacSystemFont,sans-serif;
    background:var(--bg-canvas); color:var(--ink-1);
    font-size:14px; line-height:1.5; -webkit-font-smoothing:antialiased;
    min-height:100vh; padding:48px 16px 96px;
  }
  .num { font-variant-numeric: tabular-nums; font-feature-settings:"tnum","ss01"; }
  .page { max-width:780px; margin:0 auto; }

  .card { background:transparent; margin-bottom:56px; }
  .card-header { display:flex; flex-direction:column; align-items:flex-start; gap:44px; margin-bottom:48px; }
  .card-header h1 { font-size:40px; font-weight:600; letter-spacing:-0.025em; line-height:1.1; }
  .pod-logo { height:28px; width:auto; display:block; flex-shrink:0; }

  h2 {
    font-size:24px; font-weight:600; letter-spacing:-0.015em; line-height:1.25; color:var(--ink-1);
    margin:50px 0 36px; padding-top:29px; border-top:1px solid var(--line-1);
  }
  h2:first-child { margin-top:0; padding-top:0; border-top:none; }
  h2.spaced { margin-bottom:40px; }

  .explainer-intro { font-size:19px; color:var(--ink-1); font-weight:600; line-height:1.4; letter-spacing:-0.01em; margin-bottom:20px; }
  .explainer-prose { font-size:14.5px; color:var(--ink-2); line-height:1.7; margin-bottom:16px; }
</style>
</head>
<body>
<div class="page">
  <div class="card">
    <div class="card-header">
      <img class="pod-logo" src="pod-logo.svg" alt="POD">
      <h1>Page title</h1>
    </div>
    <div class="card-body">
      <p class="explainer-intro">Lede goes here.</p>
      <p class="explainer-prose">Body paragraph.</p>

      <h2>First section</h2>
      <p class="explainer-prose">Section body.</p>
    </div>
  </div>
</div>
</body>
</html>
```

For richer components (toggle, tier grid, calc pane, stat tiles, tables, bar chart), copy the relevant block from `index.html` and lift only what you need — the styles are isolated by class, so you can pick and choose.

---

## 10. What's in this package

- `index.html` — the reference mockup (POD pricing & fee calculator). Treat this as the canonical example.
- `pod-logo.svg` — the POD wordmark used in `.card-header`. Sized at 28px tall in the page.
- `stylesheet.md` — this document.

The folder is self-contained: open `index.html` in a browser and it works without any other dependency beyond Google Fonts.
