# Share Class Creation Flow — Design Spec

**Date:** 2026-03-13
**Status:** Approved
**Author:** Brad Cain + Claude

---

## Overview

A two-screen flow for creating share classes within the Elysium fund administration platform. Accessed from the Fund Overview overflow menu or the left nav "Classes" item. Both entry points navigate to the Share Classes collection page, then auto-open a slide-out sidepeek panel for class creation.

## Screens

### Screen A — Share Classes Collection Page

**Layout:** 1728px frame matching Fund Overview reference.
- Top navbar — reuse Navbar component (341:8930)
- Left nav (~227px) — "Classes" as active sub-nav item
- Main content area (~1469px)

**Content structure:**
- Header row: Breadcrumb (POD Crypto Fund > Share Classes) + "+ Create share class" primary button (right)
- Filter bar: "Display: Classes" dropdown, status filter tabs (All, Active, Closed, Draft)
- Class cards: 3-column grid. Each card shows class name, status badge, NAV, AUM, management fee, performance fee, currency, income type

**Token mapping:**
- Page bg: `bg/canvas` (#FEFEFF)
- Card bg: `bg/canvas`, border: `border/default` (#E5E5E5), radius: `radius/l` (12px)
- Active badge: `status/positive` on `status/positive-bg`
- Draft badge: `status/neutral` on `status/neutral-bg`
- Closed badge: `status/negative` on `status/negative-bg`
- Section spacing: `space/32`, card gap: `space/16`

---

### Screen B — Create Share Class Sidepeek

**Panel specs:**
- Width: ~660px (38% of 1728px)
- Slides in from right
- Background: `bg/canvas` (#FEFEFF)
- Left border: `border/default` (#E5E5E5)
- Scrim overlay on collection page
- Z-index: `layer/sheet` (300)

#### Header
- Title: "Add Share Class" — `text-size/heading/sm` (24px), `font/weight/semibold`, `text-color/primary`
- Close X button (ghost style, top right)
- Bottom border: `border/subtle`

#### Form Body (scrollable)
Padding: `space/24` horizontal and vertical.

**Section 1 — Identity**
| Field | Component | Details |
|---|---|---|
| Class name | Text input | Placeholder: "e.g. Class A Acc USD" |
| Fee tier | Dropdown | Retail, Institutional, Seed, Platform, Bundled |
| Income treatment | Segmented control | Accumulation / Distribution |
| Distribution frequency | Dropdown (conditional) | Monthly, Quarterly, Semi-annual, Annual. Visible only when Distribution selected |

**Section 2 — Currency & Hedging**
| Field | Component | Details |
|---|---|---|
| Denomination currency | Dropdown | ISO currency list, default to fund base currency |
| FX hedging model | Dropdown | Unhedged, Passive, Active. Disabled if currency = fund base |

**Section 3 — Fees**
| Field | Component | Details |
|---|---|---|
| Management fee | Number input + % | Step: 0.01 |
| Performance fee | Number input + % | Step: 0.01 |
| Subscription fee | Number input + % | Step: 0.01 |
| Redemption fee | Number input + % | Step: 0.01 |

**Section 4 — Dealing & Liquidity**
| Field | Component | Details |
|---|---|---|
| Minimum investment | Currency input | Prefixed with denomination currency symbol |
| Lock-up period | Number + unit dropdown | Days, Months, Years |
| Notice period | Number + unit dropdown | Days, Months |
| Dealing schedule | Dropdown | Daily, Weekly, Monthly |
| Voting rights | Toggle | Default: On |

**Advanced Settings (collapsed by default)**
- Trigger: "Configure advanced settings" text link, `text-color/secondary`, chevron-down
- Expanded: `border/subtle` top divider

| Field | Component | Details |
|---|---|---|
| High water mark | Dropdown | Per class, Per dealing |
| Dilution adjustment | Toggle | Default: Off |
| Swing pricing threshold | Number + % (conditional) | Visible when dilution = On |
| Redemption gates | Number + % | Max % of NAV per dealing day |

#### Footer (sticky)
- Top border: `border/subtle`
- Helper: "This class will be created in draft state" — `text-size/caption/md`, `text-color/muted`
- "Create Class" button — full width, `button/primary/bg`, `radius/l`, height 40px

---

## Input Component Styling

- Label: `text-size/label/md` (12px), `font/weight/medium`, `text-color/secondary`, `space/4` gap below
- Input height: 40px
- Input bg: `bg/canvas`, border: `border/default`, radius: `radius/m` (8px)
- Input text: `text-size/body/sm` (14px), `text-color/primary`
- Placeholder: `text-color/muted`
- Focus: `border/strong`
- Error: `border/negative`, error text `text-color/negative`
- Field spacing: `space/16` within sections
- Section spacing: `space/24` between sections
- Section label: `text-size/title/sm` (14px), `font/weight/semibold`, `text-color/secondary`

---

## Interaction States

1. **Entry from "..." menu on Fund Overview** — Navigate to Classes page, auto-open sidepeek
2. **Entry from left nav "Classes"** — Navigate to Classes page, auto-open sidepeek
3. **Entry from "+ Create share class" button** — Open sidepeek (already on Classes page)
4. **Close** — X button or click scrim, remain on Classes page
5. **Submit** — Validate required fields, create draft class, close sidepeek, new card appears with Draft badge
6. **Conditional fields** — Distribution frequency appears when Distribution selected; FX hedging disabled when currency = base; Swing pricing appears when dilution toggle on

---

## Design Tokens Reference

All tokens from `elysium-design/tokens/`. Semantic Light mode values:

### Colors
| Token | Hex |
|---|---|
| `bg/canvas` | #FEFEFF |
| `bg/surface` | #F8F8F8 |
| `bg/elevated` | #E5E5E5 |
| `text-color/primary` | #171717 |
| `text-color/secondary` | #737373 |
| `text-color/muted` | #A3A3A3 |
| `text-color/inverse` | #FEFEFF |
| `border/default` | #E5E5E5 |
| `border/subtle` | #E5E5E5 |
| `border/strong` | #DBDBDC |
| `button/primary/bg` | #262627 |
| `button/primary/text` | #F8F8F8 |
| `button/outline/bg` | #FEFEFF |
| `button/outline/border` | #E5E5E5 |
| `status/positive` | #348352 |
| `status/positive-bg` | #A2F1C0 |
| `status/negative` | #E63535 |
| `status/negative-bg` | #FEE2E2 |
| `status/neutral` | #404040 |
| `status/neutral-bg` | #F8F8F8 |

### Spacing
`space/0` 0 | `space/2` 2 | `space/4` 4 | `space/8` 8 | `space/16` 16 | `space/24` 24 | `space/32` 32 | `space/40` 40 | `space/48` 48 | `space/64` 64

### Radius
`radius/xs` 4 | `radius/s` 6 | `radius/m` 8 | `radius/l` 12 | `radius/xl` 16 | `radius/full` 999

### Typography
| Token | Size |
|---|---|
| `text-size/heading/sm` | 24px |
| `text-size/title/lg` | 18px |
| `text-size/title/md` | 16px |
| `text-size/title/sm` | 14px |
| `text-size/body/md` | 16px |
| `text-size/body/sm` | 14px |
| `text-size/caption/md` | 12px |
| `text-size/label/md` | 12px |

### Font Weights
`font/weight/regular` 400 | `font/weight/medium` 500 | `font/weight/semibold` 600 | `font/weight/bold` 700

### Z-Index
`layer/sheet` 300
