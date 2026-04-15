# Share Class Side Sheet — Token Binding & Component Migration Plan

> **For agentic workers:** REQUIRED: Use superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix the imported Share Class creation side sheet by binding all hardcoded values to design tokens, swapping raw form elements for existing Global components, and housing the form content inside the new Desktop Sheet component.

**Architecture:** Three phases — (1) extract the form content into a slot content component, (2) bind all hardcoded colors/spacing to semantic tokens, (3) swap raw frames for Global Input/Select/FormControl instances. Then place an instance of the new Desktop Sheet on the page with the form slotted in.

**Tech Stack:** Figma Plugin API via `figma_execute`, Semantic variable collection.

---

## Reference Data

### Existing Side Sheet (node `566:179172`)
- 660×1915px frame on Share Class Creation page (`61:2471`)
- Structure: Header → Divider → Content (7 form sections) → Divider → Footer
- 67 hardcoded fill values, 9 raw input frames
- Footer buttons already use global Button component ✅

### Token Mapping
| Hardcoded Value | Semantic Token | Variable ID |
|----------------|---------------|-------------|
| rgb(254,254,255) — bg | bg/canvas | VariableID:136:981 |
| rgb(23,23,23) — title text | text color/primary | VariableID:136:987 |
| rgb(115,115,115) — section labels | text color/muted | VariableID:136:989 |
| rgb(229,229,229) — dividers | border/subtle | VariableID:137:3758 |
| Input borders/bg | border/default, bg/canvas | VariableID:137:3757, VariableID:136:981 |

### Component References
| Component | Node ID | Variant to Use |
|-----------|---------|---------------|
| Input | 1:3460 | State=Default, Size=md, Variant=Outlined |
| Select | 256:5567 | state=default, size=sm, Variant=Outlined |
| FormControl | 256:5262 | state=Default, size=md |
| Button Circle (close) | 150:5501 | Default |
| Desktop Sheet component set | 595:7946 | Platform=Desktop, Type=Sheet |

### Form Sections in Content
1. **Identity** — Class Name (input), Fee Tier (select)
2. **Income Treatment** — toggle group (Accumulation / Distribution)
3. **Currency & Hedging** — Currency (select), FX Hedging (select)
4. **Fees** — Management Fee (input), Performance Fee (input), Subscription Fee (input), Redemption Fee (input)
5. **Dealing & Liquidity** — Minimum Investment (input), Lock-up Period (input), Notice Period (input), Dealing Schedule (input)
6. **Voting Rights** — Shareholder Voting (toggle), Distribution (toggle)
7. **Advanced** — High Water Mark (input), Swing Pricing Threshold (input)

---

## Chunk 1: Extract Form Content as Slot Component

### Task 1: Create "Slot / Share Class Form" component from existing content

- [ ] **Step 1:** Clone the Content frame from the side sheet (`566:179172` → child named "Content")
- [ ] **Step 2:** Create a new component named "Slot / Share Class Form" wrapping the cloned content
- [ ] **Step 3:** Set component to auto-layout vertical, hug height, 612px width (660 minus 24px padding each side)
- [ ] **Step 4:** Place in the Slot Content section (`598:9578`) following horizontal layout pattern (x after last slot, y aligned, margins per memory)
- [ ] **Step 5:** Screenshot to verify content matches original

---

## Chunk 2: Bind All Tokens on Slot Content

### Task 2: Bind section label text colors

- [ ] **Step 1:** Find all TEXT nodes with fontSize 14 and hardcoded rgb(115,115,115) in the slot component
- [ ] **Step 2:** Bind their fills to `text color/muted` (VariableID:136:989)
- [ ] **Step 3:** Find the title/header text nodes and bind to `text color/primary` (VariableID:136:987)

### Task 3: Bind divider fills

- [ ] **Step 1:** Find all divider frames (name contains "Divider", 1px height)
- [ ] **Step 2:** Bind fills to `border/subtle` (VariableID:137:3758)

### Task 4: Bind input field frames

- [ ] **Step 1:** Find all raw input frames (children of form fields)
- [ ] **Step 2:** Bind border strokes to `border/default` (VariableID:137:3757)
- [ ] **Step 3:** Bind background fills to `bg/canvas` (VariableID:136:981)
- [ ] **Step 4:** Bind corner radius to `radius/m` (VariableID:150:3217)
- [ ] **Step 5:** Bind placeholder text fills to `text color/muted` (VariableID:136:989)
- [ ] **Step 6:** Bind label text fills to `text color/primary` (VariableID:136:987)

### Task 5: Bind field row spacing

- [ ] **Step 1:** Find all Field Row and form section frames
- [ ] **Step 2:** Bind padding and itemSpacing to space tokens (space/16, space/24)

### Task 6: Screenshot and verify token binding

- [ ] **Step 1:** Take screenshot of the slot component
- [ ] **Step 2:** Compare against original — visual appearance should be identical
- [ ] **Step 3:** Run enriched component check to verify no remaining hardcoded values

---

## Chunk 3: Assemble on Page

### Task 7: Place Desktop Sheet instance on the Share Class Creation page

- [ ] **Step 1:** Create an instance of the Desktop Sheet component (Platform=Desktop, Type=Sheet) from component set `595:7946`
- [ ] **Step 2:** Swap the Body Content instance swap to "Slot / Share Class Form"
- [ ] **Step 3:** Set the title text to "Create Share Class"
- [ ] **Step 4:** Position on the Share Class Creation page next to the existing screen
- [ ] **Step 5:** Set footer button labels: Cancel (Outline) and "Create Class" (Primary)

### Task 8: Final verification

- [ ] **Step 1:** Screenshot the assembled Desktop Sheet with form content
- [ ] **Step 2:** Compare against original side sheet — layout, spacing, content should match
- [ ] **Step 3:** Verify all token bindings via audit
- [ ] **Step 4:** Update brief sheet task 2 as complete

---

## Execution Notes

- All work via `figma_execute` — no file system code
- Token binding uses `figma.variables.setBoundVariableForPaint()` for colors and `setBoundVariable()` for floats
- When swapping raw input frames for component instances, preserve the placeholder text and label text from the original
- The original side sheet frame (`566:179172`) should be kept for reference but can be moved aside
