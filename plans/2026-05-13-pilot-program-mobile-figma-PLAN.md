# Pilot Program + Fund Creation Mobile Breakpoint — Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Port the < 1024px mobile breakpoint of `elysium-design/mockups/pilot-program/index.html` into the Figma `Product` file (`T3F6A4zWXWTWoMh0gnN1YM`) for the Pilot Program (6 pages + 3 sub-page sheets) and Fund Creation (11 step frames) at 393px width, light mode only — 37 frames total, fully bound to existing tokens/text-styles/components per the HTML→Figma hard rule.

**Architecture:** Single-bridge Figma plugin (figma-console MCP) means all writes serialize on the WebSocket. Parallelism is contained to read-only/analysis work (HTML rule extraction, post-build binding audit). Chrome components are built first and instanced into every frame; per-page content transforms are scripted in `figma_execute` calls that clone the existing desktop frame, resize to 393w, and apply CSS-derived rules deterministically.

**Tech Stack:** figma-console MCP (`figma_execute`, `figma_get_file_data`, `figma_search_components`, `figma_take_screenshot`), Figma Plugin API, source CSS at `mockups/pilot-program/index.html:1512-2058`, existing tokens (Semantic / Primitives collections) and components (Button, Search Input, KPI Tile, Cell Content, Table Cell v2, Filter Tab).

**Spec:** [/Users/brad/Good Behaviour Dropbox/Brad 2025/LOCAL/elysium-design/plans/2026-05-13-pilot-program-mobile-figma.md](2026-05-13-pilot-program-mobile-figma.md)

---

## File / Figma node structure

Plan creates Figma nodes (no source files). Listed by intended destination:

| Destination | Type | Notes |
|---|---|---|
| `PM Online Portal` page → new `Pages, Mobile` SECTION | container | Houses all 15 Pilot Program mobile frames; placed below `Pages, Light` (`2303:196109`) at `y = 2303:196109.y + 4250 + 200` |
| `↪ Fund Creation` page → new `Mobile` SECTION | container | Houses all 22 Fund Creation mobile frames; placed below `Desktop` (`2389:5501`) at `y = 2389:5501.y + 3929 + 200` |
| Mobile chrome components page (existing `Global` or similar) | new components | 5 components: `Mobile Navbar`, `Mob Top Title`, `Mob Sheet · Nav`, `Mob Sub-page Sheet`, `CF Mob Footer` |
| Transform-spec scratch dir `tmp/mobile-specs/` (local FS) | JSON files | Output from Phase 2 fan-out agents; one file per page |

## Chunk 1: Chrome components (Phase 1, main session, serial)

### Task 1.1: Pre-flight — confirm tokens, text styles, and existing components

**Files:**
- Read: `mockups/pilot-program/index.html` (mobile CSS @ 1512–2058)
- Read: `elysium-design/plans/2026-05-13-pilot-program-mobile-figma.md`

- [ ] **Step 1: Verify Figma is on the Product file and check write access**

Run via `figma_get_status` with `probe:true`.
Expected: `currentFileKey: "T3F6A4zWXWTWoMh0gnN1YM"`, `probeResult.success: true`.

- [ ] **Step 2: Resolve token variable IDs**

Run via `figma_execute`:

```javascript
const collections = await figma.variables.getLocalVariableCollectionsAsync();
const out = {};
for (const c of collections) {
  for (const id of c.variableIds) {
    const v = await figma.variables.getVariableByIdAsync(id);
    if (v) out[`${c.name}/${v.name}`] = v.id;
  }
}
return Object.fromEntries(Object.entries(out).filter(([k]) =>
  /space\/(4|8|12|16|24|28|32|40|48|56|80)$/.test(k) ||
  /^(bg|text color|border|radius)\//.test(k)
));
```

Expected: object with at least `space/8`, `space/16`, `space/24`, `space/32`, `space/48`, `space/56`, `space/80`, `bg/canvas`, `bg/surface`, `bg/subtle`, `bg/glass`, `text color/primary`, `text color/secondary`, `text color/muted`, `border/subtle`, `border/strong`, `radius/m`, `radius/l`. Save the returned ID map locally (memory only — do not commit; IDs are file-scoped).

- [ ] **Step 3: Resolve text style IDs (Inter sizes 12/14/16/18/22/28/38, weights 400/500)**

Run via `figma_execute`:

```javascript
const styles = await figma.getLocalTextStylesAsync();
return styles
  .filter(s => /Inter/i.test(s.fontName?.family || ''))
  .map(s => ({ id: s.id, name: s.name, size: s.fontSize, weight: s.fontName.style }));
```

Expected: array of text styles. Confirm coverage for the 7 sizes. If 38px or 28px not present, fail loud — per `feedback_figma_fonts.md` never assume fonts; surface to user before building.

- [ ] **Step 4: Resolve existing component IDs to instance**

Run via `figma_search_components` for: `Button`, `Search Input`, `KPI Tile`, `Cell Content`, `Table Cell v2`, `Filter Tab`, `Grouped Tab`, `search-md`. Verify the IDs from prior session notes still resolve:

| Component | Expected ID |
|---|---|
| Button (Outline sm Label) | `567:180376` |
| Search Input | `2337:197840` |
| KPI Tile | `546:24027` |
| Cell Content (Status Pill) | `2285:5247` |
| Table Cell v2 / Body | `2285:5539` |
| Table Cell v2 / Header | `2285:5584` |
| Filter Tab | `551:64418` |
| search-md icon | `553:77220` |

Expected: every ID still resolves to a node of `type: COMPONENT` or `COMPONENT_SET`. Surface mismatches before building.

- [ ] **Step 5: Take a baseline screenshot of `Pages, Light` for visual regression reference**

Run via `figma_take_screenshot` with `nodeId: "2303:196109"`, scale 1.
Expected: image URL returned. Save URL to local notes for later comparison.

### Task 1.2: Build `Mobile Navbar` component

**Files:**
- Create component on whichever page holds existing chrome components (find first via `figma_search_components` for `Navbar` — place sibling to existing desktop Navbar; if none, place on a `Global > Mobile` section)

- [ ] **Step 1: Locate placement parent**

Run via `figma_execute`:

```javascript
const navResults = []; // populate via search
await figma.loadAllPagesAsync();
const globalPage = figma.root.children.find(p => p.name === 'Global');
let mobileSection = globalPage ? globalPage.findOne(n => n.type === 'SECTION' && n.name === 'Mobile') : null;
if (!mobileSection && globalPage) {
  mobileSection = figma.createSection();
  mobileSection.name = 'Mobile';
  globalPage.appendChild(mobileSection);
  // Position below existing sections
  const others = globalPage.children.filter(c => c.id !== mobileSection.id && 'y' in c);
  const maxY = Math.max(0, ...others.map(c => c.y + (c.height || 0)));
  mobileSection.x = 0;
  mobileSection.y = maxY + 200;
  mobileSection.resizeWithoutConstraints(2000, 1200);
}
return { sectionId: mobileSection?.id, parentPage: globalPage?.name };
```

Expected: returns a section id under `Global` named `Mobile`. If `Global` doesn't exist, fall back to the current `Pages, Light` parent page and create the section there.

- [ ] **Step 2: Build the Mobile Navbar with `Scrolled` boolean variant**

Create as a COMPONENT_SET with 2 variants: `Scrolled=false` (default), `Scrolled=true`. Each variant frame is 393w × 80h (12px outer margin + 56h bar + 12px bottom). Inside:
- Background rect 369w × 56h (inset 12), bound to `bg/surface`, stroke 1 bound to `border/subtle`, corner radius 16
- Brand row at x=28 y=24: 32h logo placeholder + 10px gap + brand-name `Inter / 500 / 14` bound to `text color/primary`. In `Scrolled=true`, brand-name opacity 0.
- Mob top title centred: `Inter / 500 / 16` bound to `text color/primary`. In `Scrolled=false`, opacity 0. In `Scrolled=true`, opacity 1. Text content is a TEXT property `pageTitle`.
- Hamburger button at x=393-24-40=329 y=20: 40×40 frame, `bg/transparent`, contains 24×24 hamburger icon (3 lines). Stroke bound to `text color/primary` via `setBoundVariableForPaint` on the stroke style.

```javascript
// Pseudocode skeleton, expanded in actual execute
const set = figma.combineAsVariants([rest, scrolled], parent);
set.name = 'Mobile Navbar';
set.componentPropertyDefinitions = {
  Scrolled: { type: 'BOOLEAN', defaultValue: false },
  // pageTitle is set on individual text node, not at set level
};
```

- [ ] **Step 3: Verify bindings on Mobile Navbar**

Run via `figma_execute` — fetch the component set + walk every node; assert:
- Every fill is `boundVariables.fills` non-empty
- Every stroke is `boundVariables.strokes` non-empty (where stroke exists)
- Every text node `textStyleId` non-empty
- Corner radius bound via `boundVariables.topLeftRadius` etc.

Expected: 0 unbound visual properties. If any fail, fix before moving on.

- [ ] **Step 4: Screenshot both variants**

Run via `figma_take_screenshot` for the component-set node id.
Expected: visual matches HTML (floating card, brand left, hamburger right; scrolled variant has centred title).

### Task 1.3: Build `Mob Sheet · Nav` component

**Files:**
- Create component in `Global > Mobile` section next to Mobile Navbar.

- [ ] **Step 1: Build the sheet frame**

393w × auto height. Background bound `bg/surface`, corner radius bottom-left 20 + bottom-right 20 (top 0). Top padding `max(8, safe-area-top)` represented as 8 in Figma; bottom padding 56 (= max(32, safe-bottom+24) flattened to 56).

- Drag handle at top: 40×4 rect, radius 999, fill bound `border/strong`, top 14 bottom 10 (margin)
- Content area padding `space/4` top + `space/20` sides + `space/8` bottom (use literal 20 padding since `space/20` does not exist — see `feedback_manager_os_spacing.md` for token availability)
- Sheet body contains:
  - Section label "Pages" — `Inter / 500 / 12` bound to `text color/secondary`, padding 14/12/6
  - 6 nav rows (Welcome, Term sheet, Structure, Pricing, FAQ, How it works) — `Inter / 500 / 16` bound to `text color/primary`, min-height 44, padding 14/12, radius bound `radius/m`. One row has `Active` state with background bound `bg/glass`.
  - Divider — 1px height bound `border/subtle`, 12px H margin
  - Section label "Settings"
  - Theme toggle row — same shape as nav row + trailing icon
  - "Cancel" button at bottom: full-width, bg bound `bg/glass`, padding 16, `Inter / 500 / 16` text bound `text color/primary`, radius bound `radius/m`

- [ ] **Step 2: Verify bindings & screenshot**

Same as Task 1.2 Step 3-4 — every fill/stroke/text/spacing bound; screenshot the result.

### Task 1.4: Build `Mob Sub-page Sheet` component

**Files:**
- Create component in `Global > Mobile` section.

- [ ] **Step 1: Build the sub-page sheet frame**

393w × auto height. Top 80 (slot occupied by underlying floating navbar peek). Background bound `bg/surface`, corner radius top-left 20 + top-right 20. Shadow style — Figma effect with offset (0, -8), blur 24, color rgba(0,0,0,0.18).

- Drag handle: 40×4, radius 999, fill bound `border/strong`, centred at top 10
- Sheet topbar: padding 20 / 20 / 8. Contains a back/close button (Button instance, Outline sm, icon-only)
- Sheet body: padding 0 / 20 / 48
- Inner content slot is exposed as a `slot` instance swap property (`SubPageContent` defaults to a placeholder frame)

- [ ] **Step 2: Verify bindings & screenshot**

### Task 1.5: Build `CF Mob Footer` component

**Files:**
- Create component in `Global > Mobile`.

- [ ] **Step 1: Build with `Expanded` boolean variant**

393w. Position absolute bottom (we'll render at the bottom of each Fund Creation frame). Background bound `bg/canvas`, top border bound `border/subtle`, padding 8 / 16 / max(12, safe-bottom) flattened to 28, gap `space/8`. Shadow `0 -6px 16px rgba(0,0,0,0.06)`.

- Step rail (top of footer): list of 8 `CF Step Row` instances (re-use existing `CFStepIndicator`-style component if present; otherwise build inline rows: each 14 padding, 12 gap, contains step number circle + title + tick if done). In `Expanded=false`, only the active row is visible (others `display: none` simulated via `maxHeight: 0` + `opacity: 0`); active row is determined by a `Current step` enum property 1–8. In `Expanded=true`, all 8 rows visible, footer max-height 60vh, scrollable.
- Action row (bottom): two buttons side-by-side. Back = secondary, 52×52 square icon-only (instance of Button Outline sm). Continue = primary, flex:1 height 52, instance of Button Primary md Label.

- [ ] **Step 2: Verify bindings & screenshot both variants**

### Task 1.6: Build `Mob Top Title` standalone (if not already in Navbar)

**Files:**
- The scroll-fade title is already inside `Mobile Navbar` as a property — confirm. If kept separate for re-use in sub-page sheets, build as its own component now.

- [ ] **Step 1: Inspect the Navbar build and decide**

If sub-page sheets re-use the centred title pattern, extract into a separate `Mob Top Title` component. Otherwise mark this task as not-needed.

### Task 1.7: Commit-equivalent — record component IDs

- [ ] **Step 1: Persist the new component IDs**

Save the resolved IDs to `/tmp/mobile-specs/component-ids.json` so Phase 2/3 agents have a single source of truth:

```json
{
  "mobileNavbar": "set-id-from-build",
  "mobileNavbarRest": "variant-id",
  "mobileNavbarScrolled": "variant-id",
  "mobSheetNav": "id",
  "mobSubPageSheet": "id",
  "cfMobFooter": "set-id",
  "cfMobFooterCollapsed": "variant-id",
  "cfMobFooterExpanded": "variant-id",
  "mobTopTitle": "id-or-null"
}
```

---

## Chunk 2: Per-page transform specs (Phase 2, fan-out agents, parallel)

Spawn agents in parallel. Each agent reads HTML + spec doc + this plan, produces a deterministic JSON describing the mobile transform for one page. Agents do NOT write to Figma.

### Task 2.1: Dispatch fan-out agents

**Files:**
- Read: `mockups/pilot-program/index.html`
- Read: `/Users/brad/Good Behaviour Dropbox/Brad 2025/LOCAL/elysium-design/plans/2026-05-13-pilot-program-mobile-figma.md`
- Write each spec to: `/tmp/mobile-specs/<page-slug>.json`

- [ ] **Step 1: Spawn 6 Pilot Program agents + 11 Fund Creation agents in one batched message**

Use `Agent` tool with `subagent_type: "general-purpose"` for each. Send all 17 in a single message so they run concurrently. Prompt template per agent:

> You are generating a Figma mobile transform spec for **<page name>** at 393w light mode. **DO NOT call any figma_* tool.** Read these inputs:
> - HTML source: `/Users/brad/Good Behaviour Dropbox/Brad 2025/LOCAL/elysium-design/mockups/pilot-program/index.html` — find the React component(s) for <page name> (e.g. `WelcomePage`, `TermSheetPage`, `StructurePage`, `PricingPage`, `FAQPage`, `HowItWorksPage`, `CreateFundPage` with the relevant `cf-step-<N>` content).
> - Mobile CSS rules: lines 1512–2058 (the `@media (max-width:1023px)` block).
> - Spec doc: `elysium-design/plans/2026-05-13-pilot-program-mobile-figma.md`.
>
> Produce a JSON spec saved to `/tmp/mobile-specs/<slug>.json` with this shape:
>
> ```json
> {
>   "page": "welcome",
>   "desktopSourceNodeId": null,  // fill in if you can identify it from Figma exports; otherwise null and main session resolves
>   "frameSize": { "w": 393, "hHint": 2000 },
>   "background": "bg/canvas",
>   "chrome": {
>     "navbar": "Mobile Navbar (Scrolled=false)",
>     "topTitleText": "Welcome"
>   },
>   "contentPadding": [88, 24, 48, 24],
>   "contentGap": "space/56",
>   "blocks": [
>     { "type": "hero", "h1": "...", "lead": "...", "headerImg": "header-2.png", "height": 160, "h1Style": "Inter/Display/38" },
>     { "type": "section", "title": "What POD provides", "titleStyle": "Inter/Subhead/22", "children": [
>       { "type": "providesGrid", "cols": 1, "gap": "space/12", "tiles": [ {...} ] }
>     ]},
>     ...
>   ],
>   "scrolledFrame": { "navbar": "Mobile Navbar (Scrolled=true)", "topTitleText": "Welcome" }
> }
> ```
>
> Be specific. Every text node specifies text + style. Every container specifies padding + gap + token names. Sub-page sheets get their own spec files (welcome-sheet-fund-structure.json, etc.).
> Return under 200 words summarising what you produced and any ambiguities you flagged.

The 17 agents:
1. `welcome.json`
2. `term-sheet.json`
3. `structure.json`
4. `pricing.json`
5. `faq.json`
6. `how-it-works.json`
7. `welcome-sheet-fund-structure.json`
8. `welcome-sheet-administration.json`
9. `welcome-sheet-investor-base.json`
10. `cf-step-1-identification.json`
11. `cf-step-2-mandate.json`
12. `cf-step-3-dealing.json`
13. `cf-step-4-fees.json`
14. `cf-step-5-share-class.json`
15. `cf-step-6-risk.json`
16. `cf-step-6-add-risk.json`
17. `cf-step-7-special.json` (`Special Situations`)
18. `cf-step-8-submission.json`
19. `cf-submitted.json`

(Actually 19 specs — adjust the dispatch count. Pilot 6 + sub-pages 3 + CF steps 8 + CF Step 5 share-class variant + CF Add-Risk variant + Submitted = 19.)

- [ ] **Step 2: Wait for completion and read every spec file**

Expected: 19 files in `/tmp/mobile-specs/`. Each parseable JSON. If any are missing or malformed, re-dispatch just those agents with corrective prompts.

- [ ] **Step 3: Reconcile cross-page ambiguities**

For each agent flag (e.g. "no Inter 38 text style found, suggest closest"), resolve against the Task 1.1 Step 3 text-style list. Patch the JSON files in place.

---

## Chunk 3: Apply specs to Figma (Phase 3, main session, serial)

### Task 3.1: Create the `Pages, Mobile` section on `PM Online Portal`

- [ ] **Step 1: Locate `Pages, Light` and create the new section below it**

Run via `figma_execute`:

```javascript
await figma.loadAllPagesAsync();
const portalPage = figma.root.children.find(p => p.name === 'PM Online Portal');
await portalPage.loadAsync();
const light = portalPage.findOne(n => n.id === '2303:196109');
const section = figma.createSection();
section.name = 'Pages, Mobile';
portalPage.appendChild(section);
section.x = light.x;
section.y = light.y + light.height + 200;
section.resizeWithoutConstraints(393 * 16 + 100 * 15, 4500);  // 16 frames laid out horizontally per feedback_horizontal_sections.md
return { id: section.id, x: section.x, y: section.y };
```

Expected: new section returned with x/y matching `Pages, Light`'s x and y+offset. Section width sized to fit 16 frames horizontally with 100px gaps (per `feedback_horizontal_sections.md`).

### Task 3.2: Build each Pilot Program page from its spec

Loop over the 6 page specs + 3 sub-page-sheet specs. For each:

- [ ] **Step 1: Read the spec**

```javascript
const spec = JSON.parse(await fs.readFile(`/tmp/mobile-specs/${slug}.json`, 'utf8'));
```

- [ ] **Step 2: Build the at-top frame**

Apply spec to figma_execute call:
1. Create FRAME at 393w, layoutMode VERTICAL, primaryAxisSizingMode AUTO
2. Bind fills to `bg/canvas`
3. paddingTop 88, paddingLeft 24, paddingRight 24, paddingBottom 48 — all bound to corresponding `space/*` tokens
4. itemSpacing bound to `space/56`
5. Append Mobile Navbar instance (Scrolled=false), set `pageTitle` property
6. For each block in spec.blocks, build the appropriate node:
   - `hero` → 393w fluid, image fill from header asset, h1 text node with the resolved Inter 38 / 1.05 style
   - `section` → VERTICAL frame with title (Inter 22) + children gap `space/24`
   - `providesGrid` → VERTICAL frame, gap `space/12`, tiles 1-col fill-container
   - `pilotRow`/`relRow` → VERTICAL frame, gap `space/32`, items stretch
   - `glossary` → for each row: VERTICAL frame padding 16/0, gap `space/8`, term (Inter 16/500) + def (Inter 14/400)
   - `legalTableRow` → block-style stacked row, label cell Inter 16/500 + value cell Inter 14/400
   - `tierGrid` → 1-col
   - `tlSection` → VERTICAL, hide tl-left .tl-track
   - `accordionRow` → padding 20/0, head min-h 44, divider top via stroke
   - `ctaDark` → padding 24, min-height 160, gap 16, layoutWrap (auto-layout flex-wrap)
   - `feeCalcCard` → padding 20, gap 28
7. Set section parent to `Pages, Mobile` section (Task 3.1 return)
8. Position at x = section.x + (frameIndex * (393 + 100)), y = section.y + 100

- [ ] **Step 3: Build the scrolled frame**

```javascript
const scrolled = atTop.clone();
scrolled.name = `${slug} — scrolled`;
scrolled.x = atTop.x + 393 + 100;
scrolled.y = atTop.y;
// Find the Mobile Navbar instance and swap to scrolled variant
const navInst = scrolled.findOne(n => n.type === 'INSTANCE' && n.mainComponent.name.includes('Mobile Navbar'));
const scrolledVariant = await figma.getNodeByIdAsync(componentIds.mobileNavbarScrolled);
navInst.swapComponent(scrolledVariant);
```

Expected: scrolled twin sitting next to its at-top sibling.

- [ ] **Step 4: Verify the frame visually**

Run via `figma_take_screenshot` on the at-top frame.
Expected: matches HTML on visual spot-check (heights, padding, chrome positioning).

- [ ] **Step 5: Commit-equivalent — log frame ID**

Append the new frame IDs to `/tmp/mobile-specs/built-frames.json`:

```json
{
  "welcome": { "atTop": "id", "scrolled": "id" },
  ...
}
```

### Task 3.3: Build the 3 sub-page sheet frames

Same as Task 3.2 but using `Mob Sub-page Sheet` component with `SubPageContent` slot instance-swapped to the sheet's content tree (Fund structure / Administration / Investor base). Position below the Welcome at-top frame to show it as an overlay state.

### Task 3.4: Create the `Mobile` section on `↪ Fund Creation`

Same as Task 3.1 but on `↪ Fund Creation` page, anchored under the `Desktop` section (`2389:5501`). Width sized for 22 frames horizontally.

### Task 3.5: Build each Fund Creation step from its spec

Loop over the 11 Fund Creation step specs. For each:

- [ ] **Step 1: Read the spec**

Same pattern as Task 3.2 Step 1.

- [ ] **Step 2: Build the at-top frame**

Same skeleton as Task 3.2 Step 2 but with Fund Creation specifics:
- Append `Mobile Navbar` instance with `pageTitle` = step number/title (e.g. "Step 1 · Identification")
- Add `CF Cancel Mob` icon button overlay at top-right (separate instance — small enough to live inline)
- Hide `cf-stepper` and `cf-topbar-cta` equivalents (don't render them)
- Content padding 88/24/140/24 — paddingBottom 140 bound (no `space/140` exists — use literal 140 and flag for token addition follow-up)
- cf-title Inter 28/500
- cf-subtitle marginTop 16
- For Step 5 (`cf-row.cf-grid`): VERTICAL frame, both children full-width
- For Step 8: signature pad height 180
- Append `CF Mob Footer` instance (Expanded=false) with `Current step` enum set to N

- [ ] **Step 3: Build the scrolled frame**

Same as Task 3.2 Step 3.

- [ ] **Step 4: Verify visually**

Same as Task 3.2 Step 4.

- [ ] **Step 5: Log frame ID**

Append to `/tmp/mobile-specs/built-frames.json`.

---

## Chunk 4: Binding-compliance audit (Phase 4, fan-out agents, parallel)

### Task 4.1: Dispatch audit agents

- [ ] **Step 1: Spawn 37 audit agents in one batched message**

Each agent gets the frame ID of one new mobile frame and runs the following audit via `figma_execute` (read-only):

```javascript
const root = await figma.getNodeByIdAsync('<frame-id>');
const issues = [];
function walk(n) {
  // Fills
  if ('fills' in n && Array.isArray(n.fills) && n.fills.length) {
    for (const [i, f] of n.fills.entries()) {
      if (f.type === 'SOLID' && (!n.boundVariables?.fills?.[i])) {
        issues.push({ kind: 'unbound-fill', nodeId: n.id, nodeName: n.name });
      }
    }
  }
  // Strokes
  if ('strokes' in n && Array.isArray(n.strokes) && n.strokes.length) {
    for (const [i, s] of n.strokes.entries()) {
      if (s.type === 'SOLID' && (!n.boundVariables?.strokes?.[i])) {
        issues.push({ kind: 'unbound-stroke', nodeId: n.id, nodeName: n.name });
      }
    }
  }
  // Spacing
  for (const k of ['itemSpacing','paddingLeft','paddingRight','paddingTop','paddingBottom']) {
    if (k in n && n[k] > 0 && (!n.boundVariables?.[k])) {
      issues.push({ kind: 'unbound-spacing', prop: k, value: n[k], nodeId: n.id, nodeName: n.name });
    }
  }
  // Radius
  if ('cornerRadius' in n && typeof n.cornerRadius === 'number' && n.cornerRadius > 0 && !n.boundVariables?.topLeftRadius) {
    issues.push({ kind: 'unbound-radius', nodeId: n.id, nodeName: n.name, value: n.cornerRadius });
  }
  // Text style
  if (n.type === 'TEXT' && !n.textStyleId) {
    issues.push({ kind: 'no-textStyle', nodeId: n.id, nodeName: n.name, text: n.characters.slice(0, 40) });
  }
  // Uppercase ban (feedback_no_uppercase_text)
  if (n.type === 'TEXT' && n.textCase === 'UPPER') {
    issues.push({ kind: 'uppercase-banned', nodeId: n.id, nodeName: n.name });
  }
  if ('children' in n) for (const c of n.children) walk(c);
}
walk(root);
return { frameId: root.id, name: root.name, issueCount: issues.length, issues };
```

Each agent writes its result to `/tmp/mobile-specs/audit-<frame-slug>.json` and returns a 1-line summary (`<slug>: N issues`).

Expected: 37 audit files, each with `issueCount: 0` on the happy path. Surfacing any non-zero counts is the gate to Chunk 5.

---

## Chunk 5: Fix audit findings (Phase 5, main session)

### Task 5.1: Aggregate audit issues

- [ ] **Step 1: Read all audit files and group by issue kind**

```javascript
// pseudo
const all = audits.flatMap(a => a.issues.map(i => ({ ...i, frame: a.name })));
const byKind = groupBy(all, 'kind');
```

### Task 5.2: Fix by issue kind

- [ ] **Step 1: Fix unbound fills/strokes/radii**

For each issue, look up the appropriate token from Task 1.1 Step 2's map (nearest semantic match by visible hex) and bind via `setBoundVariableForPaint` (fills) or `setBoundVariable` (radii, spacing).

- [ ] **Step 2: Fix unbound spacings**

For each issue, quantize to nearest `space/*` token (e.g. 20 → `space/24`, 10 → `space/12`, 14 → `space/16`). Where the original is intentionally 88, 140, or other non-token values, flag and ask user whether to add a new token vs. accept literal.

- [ ] **Step 3: Fix missing text styles**

Find closest match in Task 1.1 Step 3's resolved style list by size + weight. Apply via `setTextStyleIdAsync`.

- [ ] **Step 4: Fix uppercase text**

Convert to sentence-case via text edit + clear `textCase` to `ORIGINAL`.

- [ ] **Step 5: Re-run audit**

Re-dispatch a smaller round of audit agents on affected frames only. Expect `issueCount: 0` everywhere.

### Task 5.3: Final visual verification

- [ ] **Step 1: Screenshot the new section**

Run `figma_take_screenshot` on `Pages, Mobile` and on the new Fund Creation `Mobile` section.
Expected: clean horizontal layout, no overlaps, all frames recognisable as mobile.

- [ ] **Step 2: Sanity-check against HTML**

Open `mockups/pilot-program/index.html` mobile preview (or take a screenshot of the React mockup at 393w) and side-by-side spot-check 3 representative frames:
- Welcome at-top — hero h1 38, provides-grid 1-col, pilot-row stacked
- Pricing scrolled — tier-grid 1-col, calc-card 20 padding
- Fund Creation Step 5 — grid collapsed to vertical, sticky footer collapsed showing only Step 5

Surface any discrepancies as a punch list rather than auto-fix without sign-off.

### Task 5.4: Update memory and daily summary

- [ ] **Step 1: Save the daily summary**

Run the skill in `elysium-design/skills/daily-summary` per the brief-sheet workflow. Output to `elysium-design/daily-summary/Daily Summary 13-05-2026.md`.

- [ ] **Step 2: Memory updates if any new patterns emerged**

E.g. if mobile section convention crystallises differently than expected, update `feedback_horizontal_sections.md` accordingly. Don't add memory just for the sake of it.

---

## Risks & mitigations

| Risk | Mitigation |
|---|---|
| WebSocket bridge drops mid-build | Re-resolve component IDs from `/tmp/mobile-specs/component-ids.json` and resume from the last logged frame in `built-frames.json` |
| Token name drift (`space/56` doesn't exist) | Task 1.1 Step 2 fails loud before any building. If `space/56` is missing, use nearest available + flag |
| Inter 38 / 28 text style not in file | Task 1.1 Step 3 surfaces. Per `feedback_figma_fonts.md` STOP and ask user — never assume |
| Cloned desktop frames carry stale absolute positioning | Task 3.2 builds from scratch, not from clone — clone path used only for the scrolled twin (which inherits intentional structure) |
| Audit agents flag 100s of issues from misbound chrome instances | Chrome bindings get fixed once at the component level in Task 1.x; instances inherit. Audit only fires post-fix |
| 19 fan-out agents in parallel hit rate-limit | Batch in groups of ~8 if needed; specs are read-only, no Figma writes, so retry is cheap |

## Plan complete and saved to `/Users/brad/Good Behaviour Dropbox/Brad 2025/LOCAL/elysium-design/plans/2026-05-13-pilot-program-mobile-figma-PLAN.md`. Ready to execute?