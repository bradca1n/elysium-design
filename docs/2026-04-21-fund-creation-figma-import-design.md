# Fund Creation HTML → Figma Import

**Date:** 2026-04-21
**Source:** `elysium-design/output/fund-creation-flow.html` (7 screens)
**Target file:** Product (`T3F6A4zWXWTWoMh0gnN1YM`)
**Target page:** `↪ 🚧 🟠 Fund Creation` (`889:4682`), currently empty
**Style reference:** `Share Class Collection, Sidesheet` (`638:113055`) — a 1728×1837 frame containing one `Share Class Side Sheet` component instance.

## Screens in scope

1. What's your current setup?
2. How large is your fund?
3. Strategy & asset classes
4. Investor profile
5. Initial share class
6. Review your selections
7. You're all set

## Approach — A + compliance pass

Path A (native `html-to-design` capture) followed by a design-system compliance pass via `figma_execute`.

### Phase 1 — Native capture (user-driven)

- User opens the HTML file in a browser with the Product file's Fund Creation page active; the embedded `capture.js` handshakes with Figma via the MCP bridge and drops all 7 screens onto page `889:4682` as frames.
- User pings me when capture completes.
- I screenshot / inspect the page and confirm all 7 screens arrived with expected content.

### Phase 2 — Compliance pass (three scans, one layout arrangement)

All scans run via `figma_execute`. Nothing claimed done without the verification gate.

1. **Token bind pass**
   - Walk every node.
   - Replace raw fills / strokes / radius / itemSpacing / padding with bound Figma variables from Semantic + Fixed collections.
   - Zero tolerance for unbound values (`feedback_figma_push_tokens.md`).
2. **Text-style link pass**
   - Walk every text node.
   - Set `textStyleId` to a matching local style (e.g. `Text-semibold/2xl`, `Text-normal/sm`).
   - Only use fonts that exist in the file: **Inter Regular, Inter Medium, Serrif Condensed Light** (`feedback_figma_fonts.md`). Any other family/style must be remapped or flagged.
3. **Component swap — aggressive**
   - Navbar close button → existing button atom
   - Stepper sidebar → step indicator component family (if a match exists; otherwise flag)
   - Primary/secondary/ghost buttons → button variants
   - Inputs / selects / radios → **FormControl family** on Global > Data Input (`feedback_component_location.md`)
   - Cards / tiles / summary rows / stepper items → match against existing library; swap where plausible; flag misses for a follow-up component task.

### Phase 3 — Layout (horizontal)

- Per `feedback_horizontal_sections.md`, arrange the 7 captured frames **left-to-right** in step order along y=0.
- Per `feedback_section_layout.md`, place a **Library Header** instance at x=100, y=50, w=1224, with 100px gap to first frame.
- Frames start at x=100, y=header.y + header.height + 100. Each frame ~1728 wide, gap 100 between frames.
- Frame names: `Fund Creation — 1. Current setup`, `... 2. Fund size`, … `... 7. Done`.

### Phase 4 — Verification (via `verification-before-completion` skill)

Run these scans via `figma_execute` before claiming done:

- **Unbound** fill / stroke / radius / spacing count = 0
- **Unlinked** text style count = 0
- **Unknown-font** text node count = 0
- **Component-swap candidates missed** = 0 (or, flagged in the audit report)

If any fail → fix → re-scan. No completion claim until all four pass.

### Phase 5 — Audit report

Output to user:

- Nodes token-bound (count)
- Text nodes styled (count)
- Components swapped (count + family breakdown)
- Frames positioned (horizontal order confirmed)
- Open follow-ups (missing component families needing new components)

## Dependencies / constraints

- User must have Figma Desktop Bridge connected and an extension/script permission that lets `capture.js` land frames on the active page.
- Fonts Inter Regular, Inter Medium, Serrif Condensed Light must be present in the file (known from memory).
- Semantic + Fixed variable collections must be present (known).
- Existing component families for FormControl (Global > Data Input) and buttons must be in the file; nav/stepper families verified in Phase 2 before swap.

## Out of scope

- Creating any net-new components. Misses during aggressive swap are flagged, not built.
- Mobile/tablet viewports. Desktop 1728 only.
- Light/Dark mode toggling — token bindings will respond to mode automatically, but no explicit dark render.
- Storybook / code-side export.

## Rollback

Phase 1 creates new frames on an empty page. If Phase 2/3 go wrong, delete the affected frames on page `889:4682` and re-capture from HTML. No other file state is touched.
