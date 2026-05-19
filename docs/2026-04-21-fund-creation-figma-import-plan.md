# Fund Creation HTML → Figma Import — Implementation Plan

> **For agentic workers:** This plan is executed interactively in the current session (Figma MCP work, not a code project). Steps use checkbox syntax for tracking. Invoke `verification-before-completion` at Phase 4.

**Goal:** Land all 7 Fund Creation screens from `elysium-design/output/fund-creation-flow.html` onto the Product file page `889:4682` as token-bound, text-styled, component-swapped frames laid out horizontally, matching the Share Class sidesheet reference style.

**Architecture:** Native `html-to-design` capture for geometry + content fidelity, then a three-scan compliance pass (tokens → text styles → component swap, aggressive) via `figma_execute`, followed by a horizontal layout arrangement + library header, then a verification gate.

**Tech Stack:** Figma Desktop Bridge (WebSocket MCP), `figma_execute` (Plugin API), `figma_search_components`, `figma_get_variables`, `figma_take_screenshot`, `verification-before-completion` skill.

**Spec:** `docs/2026-04-21-fund-creation-figma-import-design.md`

---

## File Structure

No code files are created. Deliverables live inside Figma (Product file, page `889:4682`). The only disk artefacts are:

- `docs/2026-04-21-fund-creation-figma-import-design.md` — spec (already written)
- `docs/2026-04-21-fund-creation-figma-import-plan.md` — this plan
- `docs/2026-04-21-fund-creation-import-audit.md` — phase 5 output (created by the audit step)

---

## Phase 0 — Preflight (session-start)

### Task 0.1: Confirm Figma bridge + target page

**Tools:** `mcp__figma-console__figma_get_status`, `mcp__figma-console__figma_list_open_files`, `mcp__figma-console__figma_execute`

- [ ] **Step 1:** Call `figma_get_status({probe: true})`. Expected: Desktop Bridge connected, probe success.
- [ ] **Step 2:** Call `figma_list_open_files`. Expected: active file = Product (`T3F6A4zWXWTWoMh0gnN1YM`), currentPage includes "Fund Creation".
- [ ] **Step 3:** Via `figma_execute`, confirm `currentPage.id === '889:4682'` and `currentPage.children.length === 0`. If non-empty, screenshot, ask user whether to delete existing nodes or pick a different page. Do NOT delete without approval.

### Task 0.2: Snapshot variable + text-style + component inventory

Needed so Phase 2 can bind without guessing.

- [ ] **Step 1:** Call `figma_get_variables({format: 'filtered', collection: 'Semantic'})` and again for `'Fixed'`. Cache IDs per semantic name (e.g. `bg/canvas`, `text/primary`, `border/subtle`, `radius/m`, `space/16`).
- [ ] **Step 2:** Via `figma_execute`, call `figma.getLocalTextStylesAsync()`. Build lookup map keyed by `"{fontStyle}|{fontSize}"` (e.g. `"Semi Bold|24"` → `styleId`). Verify entries for: `Text-semibold/2xl`, `Text-semibold/xl`, `Text-medium/md`, `Text-medium/sm`, `Text-normal/sm`, `Text-normal/xs`.
- [ ] **Step 3:** Scan fonts present in the file — `figma_execute` gathers unique `fontName` values from existing text nodes. Assert set is subset of `{Inter Regular, Inter Medium, Serrif Condensed Light}`. If any text-style references a font not in that set, flag and stop.
- [ ] **Step 4:** `figma_search_components` for: `button`, `input`, `select`, `radio`, `checkbox`, `step indicator`, `navbar`, `close`, `icon`, `tile`, `card`. Capture `{name, id, key}` for each and save to an in-memory lookup. This is the swap target table for Phase 2.

### Task 0.3: Commit preflight baseline

- [ ] **Step 1:** `figma_take_screenshot` (page-level) of `889:4682` for a pre-state baseline. Save URL as "pre-capture baseline" in session notes. Used by rollback if needed.

---

## Phase 1 — Native `html-to-design` capture (user-driven)

### Task 1.1: Instruct capture

- [ ] **Step 1:** Tell user: "Open `elysium-design/output/fund-creation-flow.html` in a browser window. Keep the Product file open with the Fund Creation page (`889:4682`) active. Run the Figma `html-to-design` capture via the Figma desktop's Dev tools / MCP bridge dialog. Ping me when all 7 screens have landed."
- [ ] **Step 2:** Wait for user confirmation.

### Task 1.2: Verify capture landed

- [ ] **Step 1:** Via `figma_execute`, count `figma.getNodeByIdAsync('889:4682').children.length`. Expected: **≥ 7**.
- [ ] **Step 2:** Take page screenshot (`figma_take_screenshot`, scale 1). Inspect: all 7 screens readable at distance; each ~1728 wide; content matches the HTML step headings.
- [ ] **Step 3:** Build an ordered list of captured frames matched to screen number by inspecting text content for each screen's `h1` ("What's your current setup?", "How large is your fund?", …). Store as `screenFrames = [{step: 1, frameId: '...', heading: '...'}]`.
- [ ] **Step 4:** If any of the 7 headings missing: screenshot, flag to user, stop (no compliance pass on partial capture).

---

## Phase 2 — Compliance pass (three scans)

### Task 2.1: Raw-value inventory (pre-scan)

- [ ] **Step 1:** Via `figma_execute`, recursively walk every descendant of `screenFrames`. Count:
  - Nodes with solid fills/strokes not bound to a variable (total)
  - Frames with `itemSpacing`, `paddingTop/Right/Bottom/Left`, or corner radii set to a raw number (total)
  - Text nodes with no `textStyleId` (total)
  - Text nodes whose `fontName` isn't in the allowed set (total)
- [ ] **Step 2:** Save snapshot as `pre-compliance` counts. Used as baseline for the verification gate.

### Task 2.2: Token bind pass

**Bind colour / radius / spacing to Semantic + Fixed variables.**

- [ ] **Step 1:** Build a colour-hex → variable-ID map using the HTML's `:root` token table (see spec lines 13–65) cross-referenced with Phase 0 variable inventory. Example mapping: `#fefeff → bg/canvas`, `#171717 → text/primary`, `#348352 → status/positive`, `#e5e5e5 → bg/elevated` **or** `border/default` (choose by role — fills get `bg/*`, strokes get `border/*`).
- [ ] **Step 2:** Via `figma_execute`, walk every node. For each solid fill whose colour matches a hex in the map, rebuild the fill via `figma.variables.setBoundVariableForPaint(paint, 'color', variable)` and assign. Do the same for strokes.
- [ ] **Step 3:** For each frame, if `cornerRadius` matches a radius token (`4/6/8/12/16/56/9999`) set `node.setBoundVariable('topLeftRadius', radiusVar)` (+ three other corners). If mixed, use per-corner radii; if `9999` map to `radius/full`.
- [ ] **Step 4:** For each auto-layout frame, map `itemSpacing` + paddings to the closest space token (`0/2/4/8/16/24/32/40/48/64/80/96/112/128`) and bind via `setBoundVariable`.
- [ ] **Step 5:** Re-run Task 2.1's pre-scan. Assert: raw-fill count = 0, raw-stroke count = 0, raw-radius count = 0, raw-spacing count = 0. If >0, print the first 10 offending node IDs + reasons, fix, re-scan.

### Task 2.3: Text-style link pass

- [ ] **Step 1:** Via `figma_execute`, walk every text descendant of `screenFrames`. For each, read `fontName` + `fontSize`, look up in Phase 0 text-style map, call `await node.setTextStyleIdAsync(styleId)`. Do NOT set raw font/size/lineHeight.
- [ ] **Step 2:** Any text node whose `fontName` isn't in the allowed set: remap to the closest allowed style (`DM Serif Display`/`Serrif Condensed` → `Serrif Condensed Light` at the nearest display size; any bold → `Inter Medium`). If none plausible, flag.
- [ ] **Step 3:** Re-scan: unlinked text count = 0, unknown-font text count = 0.

### Task 2.4: Component swap — aggressive

Order matters — swap innermost first so parent layouts don't shift before children are replaced.

- [ ] **Step 1:** **Buttons.** Scan for frames matching the HTML button classes (`.btn-primary`, `.btn-secondary`, `.btn-ghost`) — identifiable by corner radius, height, inner text. Replace with instances of the button component variants (Phase 0 lookup). Map variants: primary → solid dark, secondary → surface, ghost → link.
- [ ] **Step 2:** **Form primitives.** Swap inputs, selects, radios, checkboxes to the FormControl family (`602:22870`, `602:23207`, etc. — verify via Phase 0 lookup from Global > Data Input). For selects, confirm chevron child stays `FIXED` per `feedback_design_push_checklist.md`.
- [ ] **Step 3:** **Stepper sidebar.** If a step-indicator component family exists, replace per-step rows with instances. Otherwise flag as a net-new component need (do NOT build in this task — out of scope per spec).
- [ ] **Step 4:** **Navbar close.** Replace with button atom (ghost/icon variant).
- [ ] **Step 5:** **Cards / tiles / summary rows.** For each captured frame that visually matches an existing card/tile component, swap to the instance. Run `figma_search_components` by visual cue (padding + radius + elevation). Set instance to `FILL` width where appropriate; verify internal sizing not broken.
- [ ] **Step 6:** Output a swap summary: `{screen, path, originalType, swappedTo}` per swap + a list of unmatched candidates.

### Task 2.5: Post-pass audit counts

- [ ] **Step 1:** Re-run the full pre-scan (from 2.1). All four counters should be zero.
- [ ] **Step 2:** `figma_take_screenshot` page-level. Compare visually to pre-capture screenshot: no unexpected colour drift, no broken layouts, no component instances rendering empty.

---

## Phase 3 — Horizontal layout + Library Header

### Task 3.1: Arrange frames horizontally

Per `feedback_horizontal_sections.md` + `feedback_section_layout.md`.

- [ ] **Step 1:** Compute frame positions. Let `headerY = 50`, `headerH = (measured from Library Header instance)`, `frameY = headerY + headerH + 100`, `startX = 100`, `gap = 100`.
- [ ] **Step 2:** Via `figma_execute`, for each `screenFrames[i]` in step order (1 → 7), set `frame.x = startX + i * (frame.width + gap)`, `frame.y = frameY`.
- [ ] **Step 3:** Rename frames: `Fund Creation — 1. Current setup`, `... 2. Fund size`, `... 3. Strategy & asset classes`, `... 4. Investor profile`, `... 5. Initial share class`, `... 6. Review`, `... 7. Done`.

### Task 3.2: Library Header

- [ ] **Step 1:** Search for the Library Header component (`552:65206` per memory; verify via `figma_search_components({query: 'Library Header'})`).
- [ ] **Step 2:** Instance it at `x = 100, y = 50, width = 1224`.
- [ ] **Step 3:** Override the title child with text `Fund Creation` and the description child with a one-line summary (e.g. "Onboarding flow for managers setting up a new fund — 7 steps").

### Task 3.3: Screenshot for layout review

- [ ] **Step 1:** `figma_take_screenshot` page-level at scale 1. Inspect horizontal order, even gaps, header alignment. If off, re-run Task 3.1 with corrected offsets.

---

## Phase 4 — Verification (`verification-before-completion` skill)

### Task 4.1: Invoke verification skill

- [ ] **Step 1:** Call `Skill(skill="verification-before-completion")` with the four checks inline:
  1. **Unbound fill/stroke/radius/spacing count = 0** — re-run Task 2.1 scan on `screenFrames`.
  2. **Unlinked text-style count = 0**.
  3. **Unknown-font text-node count = 0**.
  4. **Component swap candidates missed** — list must be explicitly reviewed (empty or flagged).
- [ ] **Step 2:** If any check fails, stop, fix in Phase 2 / 3, re-verify. **Do NOT claim done until all four pass.**

---

## Phase 5 — Audit report + handoff

### Task 5.1: Write audit doc

Path: `docs/2026-04-21-fund-creation-import-audit.md`

- [ ] **Step 1:** Write a summary:
  - Counts per category (nodes token-bound / text styled / components swapped by family)
  - Screenshots (paste Figma REST URLs per screen)
  - Unmatched component candidates → proposed new-component follow-ups
  - Any token gaps discovered (e.g. HTML `#fefeff` for canvas — was a matching variable found?)

### Task 5.2: Report to user

- [ ] **Step 1:** In chat, give a 5-line summary + path to audit doc + Figma URL to `889:4682`.
- [ ] **Step 2:** Ask whether to proceed to build the flagged net-new components, or close out.

---

## Rollback plan

If Phase 2 corrupts state:

1. Via `figma_execute`, delete all children of `889:4682`.
2. Revert to Task 1.1 (re-capture from HTML).
3. Resume from Phase 2 with the fix applied.

No other file state is touched; Figma version history covers the file-level undo.

## Dependencies checklist

- [ ] Figma Desktop Bridge connected (Phase 0.1)
- [ ] Semantic + Fixed variable collections present (Phase 0.2)
- [ ] Text styles `Text-*` present (Phase 0.2)
- [ ] Fonts Inter Regular / Inter Medium / Serrif Condensed Light loaded (Phase 0.2)
- [ ] Button + FormControl component families present (Phase 0.2)
- [ ] Library Header component present (Phase 3.2)
- [ ] User opens the HTML file in browser for capture (Phase 1.1)

---

**Plan complete and saved to `docs/2026-04-21-fund-creation-figma-import-plan.md`. Ready to execute?**
