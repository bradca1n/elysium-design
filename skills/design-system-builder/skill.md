---
name: design-system-builder
description: "Manages the Elysium design system in Figma: creating components, organizing pages, binding tokens, auditing consistency. Use when creating new components, reorganizing the component library, auditing design system quality, or building widgets. Requires Figma MCP server connection."
metadata:
  mcp-server: figma-console
---

# Design System Builder

## Overview

This skill codifies the Elysium design system patterns for the Product Demo Figma file. It ensures every component is correctly categorized, token-bound, and organized so anyone can find what they need instantly.

## Prerequisites

- Figma MCP server (`figma-console`) must be connected
- Product Demo file must be open in Figma Desktop with the bridge plugin running

## File Structure

The Figma file follows this page hierarchy:

```
FOUNDATIONS
  Colour | Shadow | Typography | Iconography

COMPONENTS
  Global          — Shared across both platforms
  Investor App    — Mobile-specific components
  Manager OS      — Desktop-specific components

WIDGETS
  Global          — Shared composed content (Slots for Modal/Sheet)
  Investor App    — Mobile product-specific compositions
  Manager OS      — Desktop product-specific compositions

SCREENS (per product)
  Each screen page uses Light Mode / Dark Mode nested sections
```

## Component vs Widget Decision

**Component** — reusable building block, product-agnostic, maps 1:1 to Storybook:
- Button, Input, Select, Modal, Table, Badge, Toast
- Can be used in ANY product context
- Lives on a COMPONENTS page

**Widget** — product-specific composition built from components:
- Portfolio Value, Fund Holdings, Order Summary, Left Hand Navigation
- Specific to Investor App or Manager OS
- Lives on a WIDGETS page

**Slot** — a widget that serves as Modal/Sheet body content:
- Login Main, Order Processing, Confirm Transfer
- Composed of components, swapped into Modal & Sheet via Body Content property
- Lives on WIDGETS > Global page

**Decision test:** "Could a completely different product use this unchanged?" → Yes = Component, No = Widget.

## Global Components — Functional Categories

Components on the Global page are organized into these sections:

| Section | What belongs here | Examples |
|---|---|---|
| **Actions** | Interactive elements that trigger actions | Button, Social Button, Button Circle, Grouped Buttons, Filter Tab, Top Nav Bar |
| **Data Input** | Form controls for capturing user input | FormControl/Input, FormControl/Select, Checkbox, Toggle, Toggle Row, Radio Card, OTP Digit, Country Code |
| **Data Display** | Components for presenting data | Table, Table Row, Table Cell, Table Pagination, Key-Value Row, Status List Row, KPI Tile, Step Indicator |
| **Feedback** | Status communication and notifications | Alert, Alert Dialog, Toast, Badge, Status Badge, Quantity Badge |
| **Overlays** | Content above the main interface | Modal & Sheet, Accordion |
| **Content & Layout** | Structural and content components | Illustrations, Logo, List Item, Address Row |

## Platform Components

Investor App and Manager OS component pages use these categories:

| Section | What belongs here |
|---|---|
| **Navigation** | Platform-specific nav components (Top Nav, Bottom Nav, Tabs, Navbar, Breadcrumb, Fund Selector) |
| **Data Display** | Platform-specific data presentation (Chart, Fund Details, Tiles, Cards, Performance Card) |
| **Layout** | Platform-specific structural components (Sheet, Footer, Keyboard, Scroll Container) |

## Section Layout Standards

Every section MUST follow this layout:

```
Section (resized to fit content)
├── Library Header instance    x: 100   y: 100
│   ├── Title text             = section name
│   └── Description text       = one-line description of what belongs here
├── Component 1                x: 100   y: 354  (100px gap below header)
├── Component 2                x: [prev.x + prev.width + 50]  y: 354
├── Component 3                x: [prev.x + prev.width + 50]  y: 354
└── ...
```

- **Margins:** 100px on all sides
- **Header-to-content gap:** 100px (header bottom at ~254, content starts at 354)
- **Component spacing:** 50px horizontal gaps
- **Section width:** last component right edge + 100px
- **Section height:** tallest component bottom + 100px
- **Inter-section gap:** 100px between sections on the page
- **Library Header width:** section width - 200px (fills with margins)

## Creating a New Component

### Step 1: Determine placement

Ask: "Is this used across both platforms?"
- Yes → Global Components page, pick the right functional category
- No → Platform-specific Components page (Investor App or Manager OS)

Ask: "Is this a composed, product-specific block?"
- Yes → It's a Widget, goes on the appropriate Widgets page
- No → It's a Component

### Step 2: Load fonts and tokens

Always load fonts before creating text:
```javascript
await Promise.all([
  figma.loadFontAsync({ family: 'Inter', style: 'Light' }),
  figma.loadFontAsync({ family: 'Inter', style: 'Regular' }),
  figma.loadFontAsync({ family: 'Inter', style: 'Medium' }),
  figma.loadFontAsync({ family: 'Inter', style: 'Semi Bold' }),
  figma.loadFontAsync({ family: 'Inter', style: 'Bold' }),
  figma.loadFontAsync({ family: 'Serrif Condensed', style: 'Light' }),
]);
```

### Step 3: Build the component

**MANDATORY — Zero tolerance for raw values:**

1. **Bind ALL fills to variables** — use `figma.variables.setBoundVariableForPaint()` for every solid fill
2. **Bind ALL strokes to variables** — same method for strokes
3. **Bind ALL radii to variables** — use `node.setBoundVariable('topLeftRadius', variable)` etc.
4. **Apply text styles** — use `await node.setTextStyleIdAsync(styleId)` for every text node. NEVER set raw fontSize/fontName
5. **Bind spacing to tokens where possible** — use `setBoundVariable('itemSpacing', variable)`

### Step 4: Add component properties

Every component should expose relevant properties:
- **TEXT** properties for editable labels
- **BOOLEAN** properties for show/hide toggles
- **INSTANCE_SWAP** properties for swappable icons/elements
- **VARIANT** properties for state/size/type axes

### Step 5: Place in the correct section

Use `section.appendChild(component)` and position with the standard layout (x: after last component + 50px, y: 354).

### Step 6: Verify

Run the Design Push Checklist (see below) before claiming done.

## Design Push Checklist

Before presenting ANY Figma design work as complete, MUST verify ALL of these:

```javascript
// SCAN 1: Hardcoded fills
// Find all nodes with SOLID fills that don't have boundVariables.fills
// Zero tolerance — every fill must be bound to a variable

// SCAN 2: Unlinked text styles
// Find all TEXT nodes where textStyleId is empty or missing
// Every text node must have a linked text style

// SCAN 3: Hardcoded radii
// Find all FRAME nodes with cornerRadius > 0 that don't have boundVariables.topLeftRadius
// Every radius must be bound to a variable

// SCAN 4: Component usage
// Find all raw FRAME nodes that should be component instances
// (buttons, inputs, selects, toggles, icons should never be raw frames)

// SCAN 5: Component internals
// After setting instances to FILL, verify internal child sizing wasn't broken
```

## Available Design Tokens

### Variable Collections

| Collection | Modes | Use |
|---|---|---|
| **Fixed** | base | Static values (border widths, opacity) |
| **Primitives** | Light | Raw color palette (brand, neutral, semantic colors) |
| **Semantic** | Light, Dark | Contextual tokens that switch with theme |

### Key Semantic Variables

```
bg/canvas, bg/surface, bg/elevated, bg/subtle
text color/primary, text color/secondary, text color/muted, text color/inverse
border/default, border/subtle, border/strong, border/positive, border/negative
button/primary/bg, button/primary/text, button/outline/bg, button/outline/text
status/positive, status/negative, status/warning, status/info
radius/xs (4), radius/s (6), radius/m (8), radius/l (12), radius/xl (16), radius/full
space/0, space/2, space/4, space/8, space/16, space/24, space/32, space/40, space/48, space/64, space/80
```

### Text Styles

Pattern: `Text-{weight}/{size}` where:
- Weights: light, normal, medium, semibold, bold
- Sizes: 2xs (10), xs (12), sm (14), md (16), lg (18), xl (20), 2xl (24), 3xl (30), 4xl (36), 5xl (44), 6xl (48)
- Font: Inter for sizes up to 2xl, Serrif Condensed for 3xl+

Example style IDs:
```
Text-semibold/xl  → S:355787289934b3b4ebb1337d2af2206b516ffd04,
Text-medium/md    → S:67f83b80350e29a061ae2fd9ac7b8b0049bfd680,
Text-normal/sm    → S:c74cd03cde02719fdba5565a52831b7c8c5ecad2,
```

## Dark Mode

For screen pages that need Light + Dark presentation:

```
Parent Section ("Screen Name")
├── Light Mode (SECTION)
│   ├── Screen 1 (FRAME)
│   ├── Screen 2 (FRAME)
│   └── ...
└── Dark Mode (SECTION)  ← setExplicitVariableModeForCollection(semanticCol, darkModeId)
    ├── Screen 1 clone (FRAME)  ← also set dark mode on each frame
    ├── Screen 2 clone (FRAME)
    └── ...
```

Semantic collection: `VariableCollectionId:136:980`
Dark mode ID: `136:1`

## Naming Conventions

- **Components:** Title Case, no abbreviations (`Performance Card` not `PerfCard`)
- **Variants:** `Property=Value` format (`Size=Default, Type=Back, State=Hover`)
- **Sections:** Title Case, no platform suffix (`Chart` not `Chart (Mobile)`)
- **Slots:** `Slot / Domain Action` format (`Slot / Login Main`, `Slot / Order Processing`)
- **Widgets:** `Widget, Name` format (`Widget, Portfolio Value`)

## Audit Workflow

When asked to audit the design system:

1. **Scan all component pages** for naming inconsistencies (casing, abbreviations)
2. **Check for orphaned components** (0 instances) — candidate for deletion
3. **Check for duplicates** (same name or similar structure across pages)
4. **Check section organization** — is every component in the right functional category?
5. **Run the Design Push Checklist** scans on all components
6. **Verify section layouts** match the 100px margin / 50px spacing standard
7. **Check Library Headers** match their section names

## Key Component IDs (Reference)

```
Button:              567:180376  (128 variants)
Social Button:       625:75089   (32 variants)
Button Circle:       636:80407   (4 variants: Size × Type)
FormControl/Input:   602:22870   (48 variants)
FormControl/Select:  602:23207   (48 variants)
Modal & Sheet:       595:7946    (4 variants: Platform × Type)
Top Nav Bar:         621:73175   (properties: Show Title, Show Back, Show Close)
List Item:           621:73181   (property: Icon instance swap)
Checkbox:            1:5304      (30 variants)
Library Header:      552:65206
```
