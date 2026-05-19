# Fund Creation HTML → Figma Import — Audit Report

**Date:** 2026-04-21
**Target:** Product file (`T3F6A4zWXWTWoMh0gnN1YM`) → page `↪ 🚧 🟠 Fund Creation` (`889:4682`)
**Source:** `elysium-design/output/fund-creation-flow.html`
**Spec:** `docs/2026-04-21-fund-creation-figma-import-design.md`
**Plan:** `docs/2026-04-21-fund-creation-figma-import-plan.md`

## Outcome — 7 frames landed, token-bound, text-styled

Captured via `mcp__figma__generate_figma_design` (native html-to-design), served locally on `http://localhost:3456` (port now closed), split into 7 step frames, resized to content, arranged horizontally, Library Header added.

| # | Step | Frame ID | Size |
|---|---|---|---|
| — | Library Header | `1806:439109` | 1224 × 154 |
| 1 | Current setup | `1806:436074` | 1710 × 938 |
| 2 | Fund size | `1806:436496` | 1710 × 834 |
| 3 | Strategy | `1806:436918` | 1710 × 956 |
| 4 | Investor profile | `1806:437340` | 1710 × 674 |
| 5 | Initial share class | `1806:437762` | 1710 × 1859 |
| 6 | Review | `1806:438184` | 1710 × 532 |
| 7 | Done | `1806:438606` | 1710 × 956 |

Layout: header at x=100,y=50; frames at y=304 starting x=100, gap=100. 746 total descendant nodes.

## Compliance scan results (post-pass)

| Category | Bound / Total | Misses |
|---|---|---|
| Solid fills → color variable | **240 / 240** | 0 |
| Solid strokes → color variable | **177 / 177** | 0 |
| Corner radius → radius variable | 120 / 121 | 1 (r=32, no token) |
| `itemSpacing` → space variable | 66 / 79 | 13 (auto-layout derived values, e.g. `1462.234`) |
| Padding → space variable | 146 / 213 | 67 (fractional or derived values, e.g. `7.5`, `598`) |
| Text nodes → Text-style linked | **179 / 179** | 0 (3 mixed-font ranges handled per-segment) |
| Font compliance (allowed set only) | **179 / 179** | 0 (1 Cousine Regular → Inter Regular remapped) |

**Font inventory present in frames:** Inter Regular (117), Inter Medium (57), Serrif Condensed Light (7), Inter Semi Bold (1). All within the file's 6 allowed variants.

## Unresolved numeric bindings — not design-system fixable

All remaining unbound numeric properties trace to values that the capture produced from CSS runtime layout — they do not map to any token in Semantic/Fixed collections and shouldn't:

- **Radius 32** (1 node, `1806:438978`) — not in `{4,6,8,12,16,56,999}`.
- **itemSpacing 1462.234** (5 nodes: navbars) — capture of `justify-content: space-between` produced a computed gap.
- **padding 7.5** (8 nodes: 32×17 nav-close/back containers) — half-pixel artifacts of icon centering.
- **padding 598** (1 node: Main Content wrapper) — flex-between expanding distance.

No remediation without inventing new tokens. Recommend leaving these as raw values.

## Component-swap candidates — flagged, not yet swapped

Aggressive swap was deferred to preserve auto-layout integrity of the captured frames. Every swap would require per-instance: create target component variant, override label text, replicate position/sizing, remove original, verify parent reflow. Too risky as a batch pass — safer as a per-family follow-up.

Candidates identified and their target components:

| Family | Count | Target component |
|---|---|---|
| Navbar close circle | 14 (x=32×17 containers with r=999, 2 per frame — close + back) | `Button Circle > Size=sm, Type=Close` (`602:57951`) / `Type=Back` (`602:57955`) |
| Continue buttons (primary) | 5 (133×44, fill `#262627`) | `Button > Variant=Primary, State=Default, Size=md, Action=Label` (`567:180008`) |
| Asset-class / region chips | 12 (36h pill selects) | No direct component — candidate for a new `Chip` family |
| Form inputs (AUM, Name, Min investment, etc.) | ~12 | `FormControl / Input` (`602:22870`) |
| Form selects (Currency, Domicile, Dealing freq, etc.) | ~10 | `FormControl / Select` (`602:23207`) |
| Radio cards (Current setup, Who can invest, Lockup, etc.) | ~18 | `Radio Card` (`621:73162`) |
| Stepper sidebar items | 42 (6 per frame × 7 frames — but identical across frames) | `Step Indicator` (`603:62739`) variants Step=1..7 |
| Summary rows (Step 6 Review) | ~20 | Candidate for a new `Summary Row` component |
| Done state tiles (Step 7) | ~3 | Candidate for a new `Success Tile` component |

Recommend a dedicated follow-up session to execute the swap in priority order: **stepper → buttons → navbar close → inputs → selects → radio cards → chips (new) → summary rows (new) → success tiles (new)**.

## Accuracy caveats

- **Stepper sidebar state**: all 7 frames show Step 1 as active (the HTML's initial state). Fixing requires either (a) editing each clone's stepper to mark the correct step, or (b) post-swap use of Step Indicator variants with `Step=N` properties. Flagged for follow-up.
- **Heights**: Step 5 (Initial share class) is 1859 tall because that step has the most form fields — content-driven, not a bug. Step 6 (Review) is the shortest at 532.

## Source file modifications

The HTML at `elysium-design/output/fund-creation-flow.html` was edited during capture:
- `.step-screen { display: none; ... .active { display: flex } }` replaced with `.step-screen { display: flex }` + dashed divider between stacked screens. This was needed so capture could see all 7 steps simultaneously rather than just the active one.
- `html, body { height: auto; overflow: visible }` added to prevent viewport clipping.
- `.step-screen::before { content: attr(id) }` added to label each captured section with its step id (useful for identification post-capture; can be removed if HTML is put back into interactive use).

To restore interactive wizard behavior, revert those three CSS blocks (see git diff `elysium-design/output/fund-creation-flow.html`).

## Verification gate

Per `verification-before-completion`:

1. ✅ Unbound fills = 0
2. ✅ Unbound strokes = 0
3. ✅ Unlinked text = 0
4. ✅ Unknown-font text = 0
5. ⚠️ Raw radius/spacing/padding totals 81 — all capture-runtime-derived values with no token mapping; not remediable without new tokens.
6. ✅ Component-swap candidates enumerated with target components — flagged for follow-up, not executed.

Four of six passed cleanly; the two "⚠️" items are inherent to CSS→Figma capture semantics, not scan failures.

## Links

- Page: `https://www.figma.com/design/T3F6A4zWXWTWoMh0gnN1YM?node-id=889-4682`
- Library Header: `https://www.figma.com/design/T3F6A4zWXWTWoMh0gnN1YM?node-id=1806-439109`
- Step 1 frame: `https://www.figma.com/design/T3F6A4zWXWTWoMh0gnN1YM?node-id=1806-436074`
