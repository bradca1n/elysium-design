# Component Library Reorganization — Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reorganize all Figma component pages from flat one-section-per-component into functional categories matching industry best practices (Apple HIG, Material, Polaris pattern).

**Architecture:** Consolidate ~25 Global sections into 6 functional categories. Consolidate ~20 Investor App sections into 3 categories. Consolidate ~10 Manager OS sections into 2 categories. Widget pages stay as-is. Move global-use components (Top Nav Bar, Logo, onboarding components) from Investor App to Global.

**Tech Stack:** Figma Plugin API via MCP (`figma_execute`)

---

## Phase 1: Global Page — Consolidate into Functional Categories

### Current State (25 sections, one per component)
```
Illustrations | Buttons | Social Buttons | Filter Tab | Grouped Buttons |
Button Circle | FormControl/Input | FormControl/Select | Badge |
Status Badge | Quantity Badge | KPI Tile | Alert | Alert Dialog |
Modal | Toast | Accordion | Table | Key-Value Row | Status List Row |
Modal & Sheet | Slot Content | Step Indicator | Toggle Row | Checkbox | Toggle
```

### Target State (7 sections)
```
Actions          → Button, Social Button, Button Circle, Grouped Buttons, Filter Tab
Data Input       → FormControl/Input, FormControl/Select, Radio Card, OTP Digit,
                   Country Code, Checkbox, Toggle, Toggle Row
Data Display     → Table, Table Row, Table Cell, Table Pagination, Key-Value Row,
                   Status List Row, KPI Tile, Step Indicator
Feedback         → Alert, Alert Dialog, Toast, Badge, Status Badge, Quantity Badge
Overlays         → Modal & Sheet, Modal, Accordion
Content & Layout → Illustrations, Logo, Checklist Item, Address Row, Step Item,
                   Top Nav Bar
Slots            → (keep current Slot Content, already organized with subtitles)
```

### Task 1: Create new sections on Global page

- [ ] **Step 1:** Create 6 new sections: Actions, Data Input, Data Display, Feedback, Overlays, Content & Layout
- [ ] **Step 2:** Position sections horizontally with standard margins (50px gap)
- [ ] **Step 3:** Add Library Header instance to each new section

### Task 2: Move components into Actions section

- [ ] **Step 1:** Move `Button` (567:180376) from "Buttons" section
- [ ] **Step 2:** Move `Social Button` (625:75089) from "Social Buttons" section
- [ ] **Step 3:** Move `Button Circle` (636:80407) from "Button Circle" section
- [ ] **Step 4:** Move `Grouped Buttons` (98:12199) from "Grouped Buttons" section
- [ ] **Step 5:** Move `Filter Tab` (551:64418) from "Filter Tab" section
- [ ] **Step 6:** Arrange components horizontally within section
- [ ] **Step 7:** Delete empty old sections (Buttons, Social Buttons, Button Circle, Grouped Buttons, Filter Tab)

### Task 3: Move components into Data Input section

- [ ] **Step 1:** Move `FormControl / Input` (602:22870) from "FormControl / Input" section
- [ ] **Step 2:** Move `FormControl / Select` (602:23207) from "FormControl / Select" section
- [ ] **Step 3:** Move `Checkbox` (1:5304) from "Checkbox" section
- [ ] **Step 4:** Move `Toggle` (602:20902) from "Toggle" section
- [ ] **Step 5:** Move `Toggle Row` (629:77410) from "Toggle Row" section
- [ ] **Step 6:** Move from Investor App → Global: `Radio Card` (621:73162), `OTP Digit` (621:73171), `Country Code` (621:73173)
- [ ] **Step 7:** Arrange and delete empty old sections

### Task 4: Move components into Data Display section

- [ ] **Step 1:** Move `Table` (559:122106), `Table Pagination` (567:179374), `Table Row` (568:180888), `Table Cell` (568:203539) from "Table" section
- [ ] **Step 2:** Move `Key-Value Row` (560:168243) from "Key-Value Row" section
- [ ] **Step 3:** Move `Status List Row` (560:168257) from "Status List Row" section
- [ ] **Step 4:** Move `KPI Tile` (546:24027) from "KPI Tile" section
- [ ] **Step 5:** Move `Step Indicator` (603:62739) from "Step Indicator" section
- [ ] **Step 6:** Arrange and delete empty old sections

### Task 5: Move components into Feedback section

- [ ] **Step 1:** Move `Alert` (549:60953) from "Alert" section
- [ ] **Step 2:** Move `Alert Dialog` (549:60285) from "Alert Dialog" section
- [ ] **Step 3:** Move `Toast` (549:61064) from "Toast" section
- [ ] **Step 4:** Move `Badge` (1:15869) from "Badge" section
- [ ] **Step 5:** Move `Status Badge` (520:4086) from "Status Badge (Semantic)" section
- [ ] **Step 6:** Move `Quantity Badge` (150:3930) from "Quantity Badge" section
- [ ] **Step 7:** Arrange and delete empty old sections

### Task 6: Move components into Overlays section

- [ ] **Step 1:** Move `Modal & Sheet` (595:7946) from "Modal & Sheet" section
- [ ] **Step 2:** Move `Modal` (549:60341) from "Modal" section
- [ ] **Step 3:** Move `Accordion` (549:60907) from "Accordion" section
- [ ] **Step 4:** Arrange and delete empty old sections

### Task 7: Move components into Content & Layout section

- [ ] **Step 1:** Move Illustrations (Circle, Hourglass, Wallet, Transfer) from "Illustrations" section
- [ ] **Step 2:** Move from Investor App → Global: `Logo` (629:77870), `Top Nav Bar` (621:73175), `Checklist Item` (621:73181), `Address Row` (621:73169), `Step Item` (621:73163)
- [ ] **Step 3:** Arrange and delete empty old sections

---

## Phase 2: Investor App Components — Consolidate into 3 Categories

### Current State (20 sections)
```
Top Nav | Bottom Nav | Tabs | Footer | Widget Buttons | Sheet |
Keyboard Numeric | Vertical Scroll Container | Action Row | Fund Details |
Holding Tile | Class Tile | Order Tile | Values | Data Field |
Risk Indicator | Chart | Order Summary | Onboarding Components | Logo
```

### Target State (3 sections)
```
Navigation    → Top Nav, Top Nav Fund Detail, Bottom Nav, Tabs, Tab bar
Data Display  → Chart, Fund Details, Holding Tile, Class Tile, Order Tile Row,
                Data Field, Values, Risk Indicator, Order Summary
Layout        → Sheet, Sheet Header, Screen Header, Footer, Keyboard Numeric,
                Vertical Scroll Container, Action Row, Widget Buttons
```

### Task 8: Consolidate Investor App into 3 sections

- [ ] **Step 1:** Create 3 new sections: Navigation, Data Display, Layout
- [ ] **Step 2:** Move navigation components into Navigation section
- [ ] **Step 3:** Move data display components into Data Display section
- [ ] **Step 4:** Move layout components into Layout section
- [ ] **Step 5:** Delete empty old sections and "Onboarding Components" / "Logo" sections (components moved to Global)
- [ ] **Step 6:** Arrange components within each section

---

## Phase 3: Manager OS Components — Consolidate into 2 Categories

### Current State (10 sections)
```
Navbar | Left Hand Navigation | Breadcrumb | Navigation Components |
Share Class Card | Fund Badge | Performance Card | Orders Overview Card |
Order Row | News Row
```

### Target State (2 sections)
```
Navigation   → Navbar, Left Hand Navigation, Nav Item, Breadcrumb,
               Sub-Nav Item, Sidebar Nav Item, Fund Selector, Fund List Dropdown
Data Display → Performance Card, Share Class Card, Orders Overview Card,
               Order Row, News Row, Fund Badge
```

### Task 9: Consolidate Manager OS into 2 sections

- [ ] **Step 1:** Create 2 new sections: Navigation, Data Display
- [ ] **Step 2:** Move components into respective sections
- [ ] **Step 3:** Delete empty old sections
- [ ] **Step 4:** Arrange components within each section

---

## Phase 4: Update Library Headers

### Task 10: Set Library Header titles and descriptions for all new sections

- [ ] **Step 1:** Update all Library Header titles to match new section names
- [ ] **Step 2:** Write concise descriptions for each section explaining what component types live there
- [ ] **Step 3:** Visual verification — screenshot each page to confirm layout

---

## Risk Mitigation

- **Component references are ID-based** — moving components between sections on the same page preserves all instance references
- **Moving components between pages** (Investor App → Global) preserves references as long as the component ID stays the same
- **Library Headers** are instances of a single component — they can be duplicated into new sections easily
- **Slot Content section** is already well-organized with subtitles — no changes needed

## Verification

After each phase:
1. Screenshot the reorganized page
2. Check a screen page (KYC, Log in, Portfolio) to verify component instances still resolve
3. Confirm no broken references
