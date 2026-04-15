# Share Class Creation — HTML Mockup Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Go
al:** Build a self-contained, hi-fi HTML mockup of the Share Class Creation flow (collection page + sidepeek panel) using Elysium design tokens exclusively.

**Architecture:** Single HTML file with embedded CSS custom properties (mapped 1:1 from Elysium semantic tokens) and vanilla JS for interactions (sidepeek open/close, conditional fields, advanced settings toggle). No external dependencies — viewable by opening the file in any browser.

**Tech Stack:** HTML5, CSS3 (custom properties, flexbox, grid), vanilla JavaScript

---

## File Structure

| File | Responsibility |
|---|---|
| `elysium-design/mockups/share-class-creation.html` | Complete self-contained mockup — CSS tokens, layout, components, interactions |

Single file. All styles embedded in `<style>`, all scripts in `<script>`. No build step.

---

## Chunk 1: Foundation & Layout Shell

### Task 1: CSS Custom Properties (Design Tokens)

**Files:**
- Create: `elysium-design/mockups/share-class-creation.html`

- [ ] **Step 1: Create HTML file with doctype, meta, and CSS custom properties**

Map every token from the spec's "Design Tokens Reference" section into CSS custom properties under `:root`. Use the naming convention `--token-path` (slashes become dashes).

```
Tokens to map:
- Colors: bg/canvas, bg/surface, bg/elevated, text-color/primary, text-color/secondary,
  text-color/muted, text-color/inverse, border/default, border/subtle, border/strong,
  button/primary/bg, button/primary/text, button/primary/state-hover (#404040),
  button/outline/bg, button/outline/border, button/outline/text (#171717),
  button/secondary/bg (#E5E5E5), button/secondary/text (#171717),
  button/ghost/text (#171717),
  status/positive, status/positive-bg, status/negative, status/negative-bg,
  status/warning (#E77828), status/warning-bg (#FFF4EC),
  status/neutral, status/neutral-bg
- Spacing: space-0 through space-144 (0,2,4,8,16,24,32,40,48,64,80,96,112,128,144)
- Radius: radius-xs(4), radius-s(6), radius-m(8), radius-l(12), radius-xl(16), radius-full(999)
- Typography sizes: heading-sm(24), title-lg(18), title-md(16), title-sm(14),
  body-md(16), body-sm(14), caption-md(12), label-md(12)
- Font weights: weight-regular(400), weight-medium(500), weight-semibold(600), weight-bold(700)
- Line heights: line-tight(18), line-normal(22), line-relaxed(24)
- Z-index: layer-base(0), layer-sheet(300), layer-modal(400)
```

Also set base styles: `font-family: 'Inter', -apple-system, sans-serif; box-sizing: border-box; margin: 0;`

Reference: `elysium-design/docs/superpowers/specs/2026-03-13-share-class-creation-design.md` lines 130-180

- [ ] **Step 2: Add reusable component CSS classes**

Define classes for all reused patterns:
- `.btn-primary` — bg: var(--button-primary-bg), text: var(--button-primary-text), radius: var(--radius-l), height: 40px, font: 14px/semibold, hover state
- `.btn-outline` — bg: var(--button-outline-bg), border: 1px solid var(--button-outline-border), radius: var(--radius-l), height: 40px
- `.btn-ghost` — no bg, no border, text: var(--button-ghost-text), hover: text-color/secondary
- `.badge` — base badge with radius-xs, padding 4px 8px, font: label-md, weight-medium
- `.badge-active` / `.badge-draft` / `.badge-closed` — status color variants
- `.input-field` — height 40px, border: 1px solid var(--border-default), radius: var(--radius-m), padding: 0 12px, font: body-sm
- `.input-field:focus` — border-color: var(--border-strong), outline: none
- `.select-field` — same as input-field + appearance:none + custom dropdown chevron
- `.field-label` — font: label-md, weight-medium, color: text-color/secondary, margin-bottom: var(--space-4)
- `.section-label` — font: title-sm, weight-semibold, color: text-color/secondary
- `.toggle` — 36px wide, 20px tall, rounded-full, with sliding knob
- `.segmented-control` — two-option toggle bar with active/inactive states

Reference: spec lines 104-115

- [ ] **Step 3: Verify — open in browser, confirm blank page loads with no console errors**

---

### Task 2: Page Layout Shell (Navbar + Left Nav + Content Area)

**Files:**
- Modify: `elysium-design/mockups/share-class-creation.html`

- [ ] **Step 1: Build top navbar**

Structure:
```
.navbar (full width, height ~86px, padding: 24px 32px, flex, space-between, align-center)
  .navbar-left: POD logo (SVG or text placeholder "POD" in bold 20px)
  .navbar-right: bell icon (SVG) + avatar circle (32px, bg/elevated) + "@JerryQ102" text + chevron-down
```

No border-bottom on navbar (matches reference — clean edge, content area provides separation).

Reference: Figma Navbar component 341:8930, hi-fi reference image

- [ ] **Step 2: Build left navigation sidebar**

Structure:
```
.sidebar (width: 227px, height: calc(100vh - navbar), flex-column, space-between, padding: 0)
  .nav-top:
    - Home (icon + text + chevron-down), radius-l padding 8px
    - Overview (icon + text), selected state: bg/surface, radius-l
    - Reports (icon + text)
    - Communication (icon + text)
    - Settings (icon + text)
  .nav-divider (border-top: 1px solid border/subtle, margin: 16px 0)
  .fund-selector:
    - Fund icon (gradient circle 32px) + "POD Crypto Fund" text + swap chevron
  .nav-fund (indented sub-items, no icons):
    - Overview, NAV, Performance & Risk, Register & Dealings, Order book & Liquidity, Fees, Classes (SELECTED — bg/surface with radius-l), Investors
  .nav-bottom:
    - Support (headphones icon + text)
```

Selected state for "Classes": background var(--bg-surface), border-radius var(--radius-l), font-weight semibold.

Reference: Figma Left Hand Navigation component 341:10469, hi-fi reference image

- [ ] **Step 3: Build main content area container**

```
.main-content (flex: 1, padding: 32px, background: var(--bg-canvas), overflow-y: auto)
```

Layout wrapper:
```
.page-layout (display: flex, height: 100vh)
  .sidebar
  .main-wrapper (flex: 1, display: flex, flex-direction: column)
    .navbar
    .main-content
```

- [ ] **Step 4: Verify — open in browser, confirm navbar + sidebar + empty content area render correctly. "Classes" should be visually selected in the left nav.**

---

## Chunk 2: Share Classes Collection Page (Screen A)

### Task 3: Collection Page Header & Filters

**Files:**
- Modify: `elysium-design/mockups/share-class-creation.html`

- [ ] **Step 1: Build header row**

```
.page-header (display: flex, justify-content: space-between, align-items: center, margin-bottom: var(--space-32))
  .breadcrumb:
    span "POD Crypto Fund" (body-sm, text-color/secondary, cursor pointer)
    span ">" (body-sm, text-color/muted, margin 0 8px)
    span "Share Classes" (body-sm, text-color/primary, weight-medium)
  button.btn-primary "+ Create share class"
```

- [ ] **Step 2: Build filter/display bar**

```
.filter-bar (display: flex, align-items: center, gap: var(--space-16), margin-bottom: var(--space-24))
  .display-dropdown: "Display: Classes" (select-field, width: auto)
  .status-tabs (display: flex, gap: var(--space-8)):
    button.tab.tab-active "All"
    button.tab "Active"
    button.tab "Closed"
    button.tab "Draft"
```

Tab styles:
- Default: bg transparent, text-color/secondary, padding 8px 16px, radius-s
- Active: bg/surface, text-color/primary, weight-medium

- [ ] **Step 3: Verify — header and filters render, "+ Create share class" button is dark/primary styled**

---

### Task 4: Share Class Cards Grid

**Files:**
- Modify: `elysium-design/mockups/share-class-creation.html`

- [ ] **Step 1: Build card component and 6-card grid**

Grid: `display: grid; grid-template-columns: repeat(3, 1fr); gap: var(--space-16);`

Each card structure:
```
.class-card (bg: var(--bg-canvas), border: 1px solid var(--border-default), radius: var(--radius-l), padding: var(--space-24))
  .card-header (flex, space-between, align-center, margin-bottom: var(--space-16)):
    .card-title (title-md, weight-semibold, text-color/primary): "Class A"
    .badge.badge-active: "Active"
  .card-nav (data-lg, weight-semibold, text-color/primary, margin-bottom: var(--space-4)):
    "1,050.20 USD"
  .card-aum (caption-md, text-color/muted, margin-bottom: var(--space-16)):
    "AUM: 10,050,200 USD"
  .card-details (display: grid, grid-template-columns: 1fr 1fr, gap: var(--space-8)):
    .detail-item:
      .detail-label (label-md, text-color/muted): "Mgmt Fee"
      .detail-value (body-sm, text-color/primary): "1.50%"
    .detail-item: "Perf Fee" / "15%"
    .detail-item: "Currency" / "USD"
    .detail-item: "Income" / "Accumulation"
```

Sample data for 6 cards:
1. Class A — Active, 1,050.20 USD, Mgmt 1.50%, Perf 15%, USD, Acc
2. Class A Dist — Active, 1,048.75 USD, Mgmt 1.50%, Perf 15%, USD, Distribution
3. Class I — Active, 10,050.20 USD, Mgmt 0.75%, Perf 10%, USD, Acc
4. Class I EUR-H — Active, 9,845.30 EUR, Mgmt 0.75%, Perf 10%, EUR (Hedged), Acc
5. Class S — Closed, 1,000.00 USD, Mgmt 0.25%, Perf 0%, USD, Acc
6. Class Z — Draft, — USD, Mgmt 0.50%, Perf 0%, GBP, Acc

- [ ] **Step 2: Verify — 6 cards in a 3-column grid, badges colored correctly (green Active, grey Draft, red Closed), card data readable**

---

## Chunk 3: Sidepeek Panel (Screen B)

### Task 5: Sidepeek Shell & Open/Close Interaction

**Files:**
- Modify: `elysium-design/mockups/share-class-creation.html`

- [ ] **Step 1: Build sidepeek overlay and panel HTML**

```
.sidepeek-overlay (position: fixed, inset: 0, bg: rgba(0,0,0,0.3), z-index: calc(var(--layer-sheet) - 1), opacity: 0, pointer-events: none, transition: opacity 0.2s)
.sidepeek-overlay.open (opacity: 1, pointer-events: auto)

.sidepeek (position: fixed, top: 0, right: 0, bottom: 0, width: 660px, bg: var(--bg-canvas), border-left: 1px solid var(--border-default), z-index: var(--layer-sheet), transform: translateX(100%), transition: transform 0.3s ease, display: flex, flex-direction: column)
.sidepeek.open (transform: translateX(0))
```

Panel internal structure:
```
.sidepeek
  .sidepeek-header (padding: var(--space-24), border-bottom: 1px solid var(--border-subtle), flex, space-between, align-center)
    h2 "Add Share Class" (heading-sm, weight-semibold)
    button.btn-ghost.close-btn: X icon (SVG or "✕" character, 20px)
  .sidepeek-body (flex: 1, overflow-y: auto, padding: var(--space-24))
    [form sections go here in Task 6]
  .sidepeek-footer (padding: var(--space-24), border-top: 1px solid var(--border-subtle))
    [footer content in Task 7]
```

- [ ] **Step 2: Add JavaScript for open/close**

```javascript
// Open triggers:
// 1. "+ Create share class" button click
// 2. Page load with ?create=true param (simulates nav entry points)

// Close triggers:
// 1. X button click
// 2. Overlay/scrim click

function openSidepeek() {
  document.querySelector('.sidepeek').classList.add('open');
  document.querySelector('.sidepeek-overlay').classList.add('open');
}
function closeSidepeek() {
  document.querySelector('.sidepeek').classList.remove('open');
  document.querySelector('.sidepeek-overlay').classList.remove('open');
}
```

Wire up event listeners on DOMContentLoaded.

- [ ] **Step 3: Verify — click "+ Create share class" button, panel slides in from right with scrim. Click X or scrim to close. Smooth 0.3s transition.**

---

### Task 6: Sidepeek Form Sections

**Files:**
- Modify: `elysium-design/mockups/share-class-creation.html`

- [ ] **Step 1: Build Section 1 — Identity**

```
.form-section (margin-bottom: var(--space-24))
  .section-label: "Identity"
  .form-group (margin-top: var(--space-16)):
    label.field-label "Class name"
    input.input-field (placeholder="e.g. Class A Acc USD")
  .form-group:
    label.field-label "Fee tier"
    select.select-field: Retail, Institutional, Seed, Platform, Bundled
  .form-group:
    label.field-label "Income treatment"
    .segmented-control:
      button.segment.segment-active "Accumulation"
      button.segment "Distribution"
  .form-group.conditional#distribution-frequency (display: none):
    label.field-label "Distribution frequency"
    select.select-field: Monthly, Quarterly, Semi-annual, Annual
```

Segmented control styles:
- Container: border: 1px solid var(--border-default), radius-m, display: flex, overflow: hidden
- Segment: flex: 1, padding: 8px 16px, body-sm, weight-medium, text-center, cursor: pointer
- Active: bg: var(--button-primary-bg), color: var(--button-primary-text)
- Inactive: bg: transparent, color: var(--text-color-secondary)

- [ ] **Step 2: Build Section 2 — Currency & Hedging**

```
.form-section:
  .section-label: "Currency & Hedging"
  .form-group:
    label.field-label "Denomination currency"
    select.select-field: USD (selected), EUR, GBP, CHF, JPY, AUD, CAD, SGD, HKD
  .form-group:
    label.field-label "FX hedging model"
    select.select-field#fx-hedging: Unhedged, Passive, Active
```

- [ ] **Step 3: Build Section 3 — Fees**

```
.form-section:
  .section-label: "Fees"
  .form-row (display: grid, grid-template-columns: 1fr 1fr, gap: var(--space-16)):
    .form-group:
      label.field-label "Management fee"
      .input-with-suffix:
        input.input-field (type=number, step=0.01, placeholder="0.00")
        span.input-suffix "%"
    .form-group:
      label.field-label "Performance fee"
      .input-with-suffix:
        input.input-field (type=number, step=0.01, placeholder="0.00")
        span.input-suffix "%"
  .form-row:
    .form-group:
      label.field-label "Subscription fee"
      .input-with-suffix: input + "%"
    .form-group:
      label.field-label "Redemption fee"
      .input-with-suffix: input + "%"
```

Input-with-suffix: position relative, suffix absolutely positioned right 12px, color text-color/muted.

- [ ] **Step 4: Build Section 4 — Dealing & Liquidity**

```
.form-section:
  .section-label: "Dealing & Liquidity"
  .form-group:
    label.field-label "Minimum investment"
    .input-with-prefix:
      span.input-prefix "$"
      input.input-field (type=number, placeholder="0")
  .form-row:
    .form-group:
      label.field-label "Lock-up period"
      .input-with-unit (display: flex, gap: var(--space-8)):
        input.input-field (type=number, placeholder="0", flex: 1)
        select.select-field (width: 110px): Days, Months, Years
    .form-group:
      label.field-label "Notice period"
      .input-with-unit:
        input.input-field (type=number, placeholder="0", flex: 1)
        select.select-field (width: 110px): Days, Months
  .form-group:
    label.field-label "Dealing schedule"
    select.select-field: Daily, Weekly, Monthly
  .form-group:
    label.field-label "Voting rights"
    .toggle-row (display: flex, align-items: center, justify-content: space-between):
      span (body-sm, text-color/primary): "Shareholders can vote"
      .toggle.toggle-on
```

- [ ] **Step 5: Build Advanced Settings (collapsed)**

```
.advanced-settings (margin-top: var(--space-16)):
  button.advanced-toggle (btn-ghost, display: flex, align-items: center, gap: var(--space-8), color: var(--text-color-secondary), font: body-sm, weight-medium):
    "Configure advanced settings"
    svg.chevron-down (12px, transition: transform 0.2s)
  .advanced-content (display: none, padding-top: var(--space-16), border-top: 1px solid var(--border-subtle), margin-top: var(--space-16)):
    .form-group:
      label.field-label "High water mark scope"
      select.select-field: Per class, Per dealing
    .form-group:
      label.field-label "Dilution adjustment"
      .toggle-row:
        span: "Enable dilution adjustment"
        .toggle#dilution-toggle
    .form-group.conditional#swing-pricing (display: none):
      label.field-label "Swing pricing threshold"
      .input-with-suffix: input + "%"
    .form-group:
      label.field-label "Redemption gates"
      .input-with-suffix:
        input.input-field (type=number, step=0.01, placeholder="0.00")
        span.input-suffix "%"
      span.field-hint (caption-md, text-color/muted): "Max % of NAV per dealing day"
```

- [ ] **Step 6: Verify — open sidepeek, scroll through all 4 sections + advanced toggle. All fields styled consistently with token values.**

---

### Task 7: Sidepeek Footer & Conditional Interactions

**Files:**
- Modify: `elysium-design/mockups/share-class-creation.html`

- [ ] **Step 1: Build sticky footer**

```
.sidepeek-footer:
  p.footer-hint (caption-md, text-color/muted, margin-bottom: var(--space-16)):
    "This class will be created in draft state"
  button.btn-primary.btn-full-width: "Create Class"
```

`.btn-full-width { width: 100%; }`

- [ ] **Step 2: Add conditional field JavaScript**

```javascript
// 1. Income treatment segmented control → show/hide distribution frequency
// 2. Currency dropdown → disable FX hedging when USD (fund base)
// 3. Advanced toggle → expand/collapse advanced section + rotate chevron
// 4. Dilution toggle → show/hide swing pricing threshold
```

Each handler:
- Segmented control: toggle `.segment-active` class, show/hide #distribution-frequency with slide animation
- Currency: if value === 'USD', set #fx-hedging to disabled + value 'Unhedged'
- Advanced: toggle .advanced-content display, rotate chevron 180deg
- Dilution: toggle #swing-pricing visibility

- [ ] **Step 3: Verify all interactions work:**
  - Select "Distribution" → frequency dropdown appears
  - Select "Accumulation" → frequency dropdown hides
  - Select "USD" currency → FX hedging disabled, set to "Unhedged"
  - Select "EUR" currency → FX hedging enabled
  - Click "Configure advanced settings" → section expands, chevron rotates
  - Toggle dilution on → swing pricing field appears
  - Toggle dilution off → swing pricing field hides

---

## Chunk 4: Polish & Verification

### Task 8: Visual Polish Pass

**Files:**
- Modify: `elysium-design/mockups/share-class-creation.html`

- [ ] **Step 1: Typography audit**

Check every text element uses the correct token:
- Page title / breadcrumb: body-sm
- Card titles: title-md, weight-semibold
- Card NAV values: title-lg or heading-sm (prominent)
- Card detail labels: label-md, text-color/muted
- Card detail values: body-sm, text-color/primary
- Section labels: title-sm, weight-semibold, text-color/secondary
- Field labels: label-md, weight-medium, text-color/secondary
- Input text: body-sm
- Placeholders: text-color/muted
- Footer hint: caption-md, text-color/muted
- Button text: body-sm, weight-semibold

- [ ] **Step 2: Spacing audit**

Verify all spacing uses token values only:
- Navbar padding: 24px 32px
- Sidebar item padding: 8px
- Main content padding: 32px
- Section gaps: space-24
- Field gaps within section: space-16
- Label to input gap: space-4
- Card internal padding: space-24
- Card grid gap: space-16
- Sidepeek header/body/footer padding: space-24

- [ ] **Step 3: Hover/focus states**

Add missing interactive states:
- `.btn-primary:hover` → var(--button-primary-state-hover) (#404040)
- `.btn-outline:hover` → border-color: var(--border-strong)
- `.input-field:focus` → border-color: var(--border-strong), box-shadow: 0 0 0 2px rgba(38,38,39,0.1)
- `.class-card:hover` → border-color: var(--border-strong), transition: border-color 0.15s
- Nav items hover: bg/surface with radius-l
- `.select-field:hover` → border-color: var(--border-strong)

- [ ] **Step 4: Verify — full visual review. Compare against hi-fi reference for visual density, whitespace, typography hierarchy. No hardcoded values — every property traces to a CSS custom property.**

---

### Task 9: Final Verification

**Files:**
- Read: `elysium-design/mockups/share-class-creation.html`

- [ ] **Step 1: Run verification-before-completion skill**

Use `Skill("verification-before-completion")` to verify:
1. File opens in browser without errors
2. All CSS custom properties resolve (no fallback values showing)
3. All interactions work (sidepeek open/close, conditional fields, advanced toggle)
4. No hardcoded hex values in CSS (all reference custom properties)
5. Visual quality matches hi-fi reference density and hierarchy
6. All fields from spec are present and correctly grouped

- [ ] **Step 2: Provide mockup link to user**

Share the file path for browser opening:
`file:///Users/brad/Good%20Behaviour%20Dropbox/Brad%202025/LOCAL/elysium-design/mockups/share-class-creation.html`
