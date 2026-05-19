# Pilot Program + Fund Creation — Mobile Breakpoint into Figma

**Date:** 2026-05-13
**Source:** `elysium-design/mockups/pilot-program/index.html` (mobile CSS at `@media (max-width:1023px)`, lines 1512–2058)
**Target Figma file:** `Product` (`T3F6A4zWXWTWoMh0gnN1YM`)

## Scope

- **Mobile width:** 393px (iPhone 16)
- **Theme:** Light only (Dark deferred)
- **Pilot Program** — new section `Pages, Mobile` on the `PM Online Portal` page, sitting under `Pages, Light` (`2303:196109`)
  - 6 pages × 2 chrome states (at-top + scrolled) = **12 frames**
  - 3 sub-page sheets open over Welcome (Fund structure, Administration, Investor base) = **3 frames**
- **Fund Creation** — new section `Mobile` on the `↪ Fund Creation` page, sitting under `Desktop` (`2389:5501`)
  - 11 step frames × 2 chrome states = **22 frames**
- **Mobile chrome components** (built once, instanced everywhere):
  1. `Mobile Navbar` — floating bar 56h, brand + hamburger; `Scrolled` boolean variant (brand-name fades out, page title fades in)
  2. `Mob Top Title` — centred scroll-fade title (probably folded into the Navbar component)
  3. `Mob Sheet · Nav` — drops from top, full nav list with 6 routes + theme toggle
  4. `Mob Sub-page Sheet` — drops from bottom at top:80, drag handle + close in topbar
  5. `CF Mob Footer` — sticky bottom; `Expanded` boolean variant (collapsed = active step only, expanded = full step rail)

## Mobile transform rules (from HTML CSS)

Applied per-page. Driven directly by the `@media (max-width:1023px)` block.

### Global chrome
- `.topbar-bg` → floating: inset 12 from edges, 56h, `bg/surface` fill, `border/subtle` 1px, radius 16, shadow `0 6px 20px rgba(0,0,0,0.08)`. Z-stack: backdrop 100, sheet 101, brand/title/hamburger 71, topbar 70.
- `.brand` → left 28 / top 24; logo 32h × 64w; brand-name `fs-sm` (14)
- `.sidebar`, `.page-anchors`, `.topbar-cta` → hidden
- `.theme-toggle` → hidden (lives in nav sheet on mobile)
- `.mob-top-title` → fixed top 12, centred, 56h, `fs-md` (16) Inter 500, opacity 0 → 1 on scroll
- `.mob-menu-button` → fixed top 20 right 24, 40×40, hamburger icon

### Content area
- `.content` → static, padding `88 24 48`, gap 56
- `.hero` → fluid, height 160, `h1` 38px / 1.05 line-height
- `.cta-dark` → padding 24, min-height 160, gap 16, flex-wrap
- `.section-title` → 22px

### Page-specific
- **Welcome:** `.provides-grid` 1-col gap 12 / `.pilot-row` + `.rel-row` vertical gap 32 stretch
- **Term Sheet:** `.glossary-row` 1-col gap 8 padding 16/0; download cards padding `space/16`
- **Structure:** `table.legal-table` rows display block with 28px padding + bottom border; label cell `fs-md`/500 + 8 padding-bottom; struct-diagram horizontal scroll with `-24` margin bleed, native 870 width
- **Pricing:** `.pr-tier-grid` 1-col, `.pr-input-row` + `.pr-kpi-row` stack, `.pr-calc-card` padding 20 gap 28
- **FAQ + How it works:** `.accordion-row` padding 20/0, head min-h 44, `+ row` border-top divider
- **Timeline (How it works):** `.tl-section` vertical gap 16, hide `.tl-left .tl-track`, `.tl-right` padding-right 0

### Sub-page sheet (Welcome)
- `.sheet-panel` top:80, drag-handle pseudo (40×4 `border/strong`, radius 999, top 10), radius 20 (top corners), shadow `0 -8px 24px rgba(0,0,0,0.18)`
- `.sheet-topbar` padding 20/20/8; `.sheet-body` padding 0/20/48; body `.provides-grid` 1-col

### Create-a-fund chrome
- `.cf-stepper`, `.cf-topbar-cta` → hidden
- `.cf-page` → static, padding `88 24 140` (room for sticky footer)
- `.cf-btn-row` → hidden
- `.cf-title` 28; `.cf-subtitle` margin-top 16
- `.cf-row.cf-grid` (Step 5) → vertical, both columns full-width
- `.cf-sig-wrap` (Step 8) → height 180
- `.cf-cancel-mob` X icon fixed top 20 right 24, 40×40
- `.cf-mob-footer` sticky bottom; step rail expands from collapsed (active only) → expanded (all steps visible) with max-height transition

## Component bindings (HTML→Figma hard rule)

Per `feedback_html_to_figma_bindings.md`, every node must bind:
- **Fills:** `setBoundVariableForPaint` to `bg/canvas|surface|subtle|glass`, `text color/primary|secondary|muted|inverse`, `border/subtle|strong`
- **Spacing/padding:** `setBoundVariable` to `space/4|8|12|16|24|28|32|40|48|56|80`
- **Radius:** `setBoundVariable` to `radius/s|m|l`
- **Text:** `textStyleId` set; sizes used 12/14/16/18/22/28/38, weights 400/500
- **Components instanced (never custom frames):** `Button` (`567:180376`), `Search Input` (`2337:197840`), `Cell Content` / `Status Pill` (`2285:5247`), `Table Cell v2 / Body` (`2285:5539`) + `/ Header` (`2285:5584`), `KPI Tile` (`546:24027`), `Filter Tab` (`551:64418`), `Grouped Tab` (post-May-6 split), `Accordion row` (find existing or create)

## Execution shape (parallel where safe)

The figma-console MCP has a single WebSocket bridge → all `figma_execute` writes serialize. Parallelization is bound to read-only and analysis work.

```
Phase 1 — main, serial         Build the 5 chrome components, bind tokens up-front
Phase 2 — fan-out agents       Generate per-page transform specs (read HTML + this plan)
                               6 Pilot Program agents + 11 Fund Creation agents in parallel
Phase 3 — main, serial         Apply each spec to Figma: clone desktop → resize 393 →
                               transform → swap chrome instances → duplicate for scrolled
Phase 4 — fan-out agents       Audit each new frame's binding compliance
                               (read-only via figma_get_file_data + figma_execute reads)
Phase 5 — main                 Fix audit findings (raw fills → tokens, raw spacings → space/*,
                               raw text → textStyleId, custom frames → component instances)
```

## Verification gates

- Per `feedback_design_push_checklist.md` — do not call any page "done" before:
  - Every fill bound to a token (no raw hex)
  - Every itemSpacing/padding bound to a `space/*` token
  - Every text node has a `textStyleId` from the file's existing styles (no font assumptions)
  - Existing components used wherever they exist (Button, Search Input, KPI Tile, Cell, etc.)
  - No uppercase / small-caps text (sentence case throughout)
- Spot-check screenshots: 3 representative pages (Welcome at-top, Pricing scrolled, Fund Creation Step 5).

## Out of scope today

- Dark mode mobile frames (deferred sweep)
- Mobile components for Manager OS (still in HTML)
- Component property polish (variants for hover/pressed states on chrome elements)
- Code Connect mappings between new mobile chrome and React `MobileNav`/`BottomSheet`/`CFMobileFooter` (separate task)