# Modal & Sheet Slot Components — Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build 4 base Modal/Sheet components with Figma slots for swappable body content, replacing the current baked-in content approach.

**Architecture:** Each component shares chrome (header with title + close icon, footer with Cancel/Confirm buttons, body slot with padding + scroll). Built on the Global components page in a new "Modal & Sheet" section. All values token-bound.

**Tech Stack:** Figma Plugin API via `figma_execute`, design tokens from Semantic/Fixed collections.

---

## Reference Data

### Variable IDs (for token binding)
| Token | Variable ID |
|-------|------------|
| bg/canvas | VariableID:136:981 |
| bg/surface | VariableID:136:983 |
| bg/elevated | VariableID:136:984 |
| text color/primary | VariableID:136:987 |
| text color/secondary | VariableID:136:988 |
| text color/muted | VariableID:136:989 |
| border/default | VariableID:137:3757 |
| border/subtle | VariableID:137:3758 |
| radius/m | VariableID:150:3217 |
| radius/l | VariableID:150:3218 |
| radius/xl | VariableID:150:3219 |
| radius/2xl | VariableID:150:6720 |
| radius/full | VariableID:150:3220 |
| space/0 | VariableID:150:3221 |
| space/4 | VariableID:150:3223 |
| space/8 | VariableID:150:3224 |
| space/16 | VariableID:150:3225 |
| space/24 | VariableID:150:3226 |
| space/32 | VariableID:150:3227 |
| space/48 | VariableID:150:3229 |
| layer/modal | VariableID:163:2284 |
| layer/sheet | VariableID:167:2313 |
| border/width/none | VariableID:553:79111 |
| border/width/thin | VariableID:553:79112 |
| icon-size/sm | VariableID:558:95778 |
| icon-size/md | VariableID:558:95779 |

### Existing Node References
| Item | Node ID |
|------|---------|
| Global components page | 553:69298 |
| Existing Modal section | 552:65223 |
| Existing Modal component set | 549:60341 |
| Existing Sheet component set | 158:3399 |
| Button component set | 567:180376 |
| Base Components page | 12:6504 |

### Component Specs

**1. Modal / Bottom Sheet (Mobile)**
- Width: 393px (iPhone 16), height: hug contents
- Rounded top corners: radius/xl (16px), bottom corners: 0
- Handlebar: 40×4px pill, radius/full, bg/elevated, centred at top with space/8 padding
- Header: title (heading/sm) left + close icon right, space/24 horizontal padding
- Body slot: space/24 padding, vertical scroll overflow
- Footer: Cancel (Outline md) + Confirm (Primary md) right-aligned, space/24 padding, top border
- Background: bg/canvas

**2. Modal / Centred (Desktop)**
- Width: 480px, height: hug contents, centred on scrim
- Scrim: full viewport frame, bg fill #000000 at 50% opacity
- All corners: radius/xl (16px)
- Header: title (heading/sm) left + close icon right, space/24 padding
- Body slot: space/24 padding, vertical scroll overflow
- Footer: Cancel (Outline md) + Confirm (Primary md) right-aligned, space/24 padding, top border
- Background: bg/canvas

**3. Sheet / Full Screen (Mobile)**
- Width: 393px, height: 852px (iPhone 16 viewport)
- No rounded corners
- Header: back chevron left + title (heading/sm) centre + close icon right, space/16 padding
- Body slot: space/24 padding, vertical scroll overflow, fills remaining height
- Footer: Cancel (Outline md) + Confirm (Primary md) right-aligned, space/24 padding, top border
- Background: bg/canvas

**4. Sheet / Side Panel (Desktop)**
- Width: 660px, height: 852px (matches existing share class sheet)
- Left edge: no radius. Right edge: no radius (docked to right side)
- Header: title (heading/sm) left + close icon right, space/24 padding, bottom border
- Body slot: space/24 padding, vertical scroll overflow, fills remaining height
- Footer: Cancel (Outline md) + Confirm (Primary md) right-aligned, space/24 padding, top border
- Background: bg/canvas

---

## Chunk 1: Section Setup & Shared Helper

### Task 1: Create "Modal & Sheet" section on Global page

- [ ] **Step 1: Create section** via `figma_execute`
  - Navigate to Global components page (553:69298)
  - Create a new Section named "Modal & Sheet"
  - Position it to the right of the last existing section on the page
  - Record the section node ID for subsequent tasks

- [ ] **Step 2: Add Library Header** inside the new section
  - Clone the Library Header component instance from another section (e.g. from Modal section 552:65224)
  - Set header text to "Modal & Sheet"
  - Position at top of section

- [ ] **Step 3: Screenshot** to verify section placement

### Task 2: Create placeholder Slot Content component

- [ ] **Step 1: Create a simple "Slot Placeholder" component**
  - Frame: 345×200px, auto-layout vertical, space/16 gap
  - Fill: bg/surface (dashed border pattern or subtle bg to indicate "slot")
  - Contains a text node: "Slot Content" in text color/muted, body/md
  - This will be used as the default slot content in all 4 base components

- [ ] **Step 2: Screenshot** to verify

---

## Chunk 2: Mobile Modal (Bottom Sheet)

### Task 3: Build Modal / Bottom Sheet component

- [ ] **Step 1: Create the component frame**
  - Width: 393px, height: hug contents
  - Auto-layout: vertical, no gap between chrome sections
  - Fill: bg/canvas (bound to variable)
  - Top-left radius: radius/xl, top-right radius: radius/xl, bottom: 0
  - Clip contents: true

- [ ] **Step 2: Add Handlebar**
  - Container frame: 393px wide, auto-layout vertical, centre-aligned, paddingTop: space/8, paddingBottom: space/4
  - Pill frame inside: 40×4px, radius/full, fill: bg/elevated

- [ ] **Step 3: Add Header**
  - Frame: fill-width, auto-layout horizontal, space-between
  - Padding: space/24 horizontal, space/16 vertical
  - Title text: "Modal Title", heading/sm, fill: text color/primary
  - Close icon: x-close vector 20×20, fill: text color/secondary

- [ ] **Step 4: Add Divider**
  - Frame: fill-width, height: 1px, fill: border/subtle

- [ ] **Step 5: Add Body Slot**
  - Frame: fill-width, auto-layout vertical, padding: space/24
  - Insert Slot Placeholder component instance
  - Set overflow: scroll vertical

- [ ] **Step 6: Add Footer**
  - Frame: fill-width, auto-layout horizontal, right-aligned (justify: end)
  - Padding: space/16 vertical, space/24 horizontal
  - Gap: space/8
  - Top border: 1px border/subtle
  - Insert 2 Button instances from component set 567:180376
    - Cancel: Outline variant, md size
    - Confirm: Primary variant, md size

- [ ] **Step 7: Convert to component** and name "Platform=Mobile, Type=Modal"

- [ ] **Step 8: Screenshot** and validate proportions

---

## Chunk 3: Desktop Centred Modal

### Task 4: Build Modal / Centred component

- [ ] **Step 1: Create scrim container**
  - Frame: 1280×852px (desktop viewport representation)
  - Fill: #000000 at 50% opacity
  - Auto-layout: vertical, centre-centre aligned

- [ ] **Step 2: Create modal card inside scrim**
  - Frame: 480px wide, hug height
  - Auto-layout: vertical
  - Fill: bg/canvas
  - All corners: radius/xl
  - Clip contents: true

- [ ] **Step 3: Add Header** (same pattern as bottom sheet, no handlebar)
  - Frame: fill-width, auto-layout horizontal, space-between
  - Padding: space/24 horizontal, space/16 vertical
  - Title + close icon

- [ ] **Step 4: Add Divider**

- [ ] **Step 5: Add Body Slot** (same as bottom sheet)

- [ ] **Step 6: Add Footer** (same as bottom sheet)

- [ ] **Step 7: Convert to component** and name "Platform=Desktop, Type=Modal"

- [ ] **Step 8: Screenshot** and validate centring on scrim

---

## Chunk 4: Mobile Full Screen Sheet

### Task 5: Build Sheet / Full Screen component

- [ ] **Step 1: Create component frame**
  - Width: 393px, height: 852px (fixed — full viewport)
  - Auto-layout: vertical
  - Fill: bg/canvas
  - No corner radius

- [ ] **Step 2: Add Header**
  - Frame: fill-width, auto-layout horizontal, centre-aligned vertically
  - Padding: space/16 all sides
  - Left: back chevron icon (chevron-left, 20×20, text color/primary)
  - Centre: title text "Sheet Title", heading/sm, text color/primary
  - Right: close icon (x-close, 20×20, text color/secondary)

- [ ] **Step 3: Add Divider**

- [ ] **Step 4: Add Body Slot**
  - Frame: fill-width, fill-height (grows to fill remaining space)
  - Auto-layout vertical, padding: space/24
  - Overflow: scroll vertical
  - Insert Slot Placeholder instance

- [ ] **Step 5: Add Footer** (same pattern)

- [ ] **Step 6: Convert to component** and name "Platform=Mobile, Type=Sheet"

- [ ] **Step 7: Screenshot** and validate full-screen proportions

---

## Chunk 5: Desktop Side Panel Sheet

### Task 6: Build Sheet / Side Panel component

- [ ] **Step 1: Create component frame**
  - Width: 660px, height: 852px (fixed)
  - Auto-layout: vertical
  - Fill: bg/canvas
  - No corner radius (docked to right edge)
  - Left border: 1px border/subtle

- [ ] **Step 2: Add Header**
  - Frame: fill-width, auto-layout horizontal, space-between
  - Padding: space/24 horizontal, space/16 vertical
  - Title: "Sheet Title", heading/sm, text color/primary
  - Close icon: x-close, 20×20, text color/secondary
  - Bottom border: 1px border/subtle

- [ ] **Step 3: Add Body Slot**
  - Frame: fill-width, fill-height
  - Auto-layout vertical, padding: space/24
  - Overflow: scroll vertical
  - Insert Slot Placeholder instance

- [ ] **Step 4: Add Footer** (same pattern)

- [ ] **Step 5: Convert to component** and name "Platform=Desktop, Type=Sheet"

- [ ] **Step 6: Screenshot** and validate 660px width, proportions

---

## Chunk 6: Component Set & Final Validation

### Task 7: Combine into component set

- [ ] **Step 1: Select all 4 components and combine** into a single component set named "Modal & Sheet"
  - Variant properties: Platform (Mobile/Desktop), Type (Modal/Sheet)

- [ ] **Step 2: Arrange variants** in the component set
  - Row 1: Mobile Modal, Desktop Modal
  - Row 2: Mobile Sheet, Desktop Sheet
  - Gap: 48px between variants

- [ ] **Step 3: Add component description**
  - "Base overlay components with slot architecture. Swap body content via the Slot Content instance. Platform: Mobile (iPhone 16) / Desktop. Type: Modal (overlay) / Sheet (panel)."

- [ ] **Step 4: Final screenshot** of full component set

- [ ] **Step 5: Screenshot each variant individually** to verify:
  - Alignment and spacing
  - Token binding (no hardcoded values)
  - Button instances are from global Button component
  - Close icons are consistent
  - Body slot placeholder is visible

### Task 8: Token binding audit

- [ ] **Step 1: Run enriched component check** via `figma_get_component` with `enrich: true` on the component set to verify token coverage

- [ ] **Step 2: Fix any hardcoded values** found in the audit

- [ ] **Step 3: Final validation screenshot**

---

## Execution Notes

- All work happens via `figma_execute` — no file system code
- Token binding uses `setBoundVariable()` on each node property
- Button instances: use `figma.getNodeByIdAsync('567:180376')` to access the Button component set, find the correct variants, then `createInstance()`
- Icons: create vector nodes for x-close and chevron-left (simple paths)
- After each component is built, take a screenshot to validate before proceeding
- All components go inside the new "Modal & Sheet" section on the Global page
