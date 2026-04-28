# Dropdown Menus Design — Account + Notifications

**Date:** 2026-04-20
**Area:** Manager OS — header
**Priority source:** brief-sheets/04-14-26, Priority 4

## Goal
Build two reusable header dropdowns for the Manager app:
1. **Account / actions dropdown** — compact menu with user identity + 5 actions + Theme picker + Log out.
2. **Notifications dropdown** — tabbed feed of recent fund-related events with filtering and bulk read actions.

Figma components go on the Base Components page, organised horizontally, following the patterns established by `Nav Item v2` / `Left Hand Navigation v2`. Gluestack source files are tweaked so `<Menu>`, `<Popover>`, `<Avatar>`, `<Badge>`, `<Button>`, `<Divider>` emit Elysium-branded defaults without per-call overrides.

## Decisions

| Decision | Value |
|---|---|
| Notifications filtering | Tabs (`Unread` / `Read`) + `Mark all as read` |
| Fund context on rows | Fund Pill chip per row, plus a fund filter control |
| V1 event types | 6 transactional (Subscription received, Redemption processed, Dealing cutoff approaching/closed, Settlement completed, NAV published) + 1 Action-required (Large redemption requires approval) |
| Inline actions | Action-required rows have `[Review]` + `[Approve]` buttons |
| Account header | Avatar + Name + Org |
| Theme picker | Inline 3-segment control (Light / Dark / Auto) |
| Header layout | Title, Tabs, Controls row (fund filter left, Mark-all-read right), Divider, Feed |
| Empty state | Contextual copy per tab (Unread / Read / Never) with icon + text |

## Component inventory

### New Figma components

| Component | Variants | Width |
|---|---|---|
| `Menu Item` | `State=Default/Hover/Focus`, `Show icon`, `Show right slot` | 232 |
| `Segmented Control` | `Items=2/3`, `Selected` | HUG |
| `Tabs` | `Items=2/3/4`, `Selected` | FILL |
| `Fund Pill` | `Type=1..n` (matches Fund Icon) | HUG |
| `Notif Row` | `Body=Standard/Action`, `State=Unread/Read/Hover` | 472 |
| `Empty State` | `Tab=Unread/Read/Never` | FILL |
| `Account Dropdown` | single | 280 |
| `Notifications Dropdown` | `State=Default/Empty/Scrolling` | 504 |

### Design tokens used (actual Elysium semantic names)
Audit found most of the spec's speculative names map onto existing tokens. Only one new token was added: `shadow.dropdown`. Tailwind class namespace is `ely-*` for the dropdown subset (full bridge TODO end-of-day).

- Padding: `space.8`, `space.12`, `space.16` → `p-2`, `p-3`, `p-4` (Tailwind built-ins)
- Radius: `radius.s (6)`, `radius.m (8)`, `radius.l (12)` → `rounded-ely-s`, `rounded-ely-m`, `rounded-ely-l`
- Surfaces: `bg.canvas`, `bg.surface`, `bg.glass`, `status.warning-bg`, `status.positive-bg` → `bg-ely-canvas`, `bg-ely-surface`, `bg-ely-glass`, `bg-ely-warning-bg`, `bg-ely-positive-bg`
- Borders: `border.default`, `status.warning` (as border) → `border-ely-default`, `border-ely-warning`
- Text: `text color.primary/secondary/muted/inverse`, `status.warning` (as text) → `text-ely-primary`, `text-ely-secondary`, `text-ely-muted`, `text-ely-inverse`, `text-ely-warning`
- Focus: `focus.ring-color` → `ring-ely-focus-ring`
- Shadow: `shadow.dropdown` (new) → `shadow-ely-dropdown`

### Text styles
| Use | Style |
|---|---|
| Account header name, Dropdown title, Empty heading | `Text-semibold/md` |
| Account header org, Empty subcopy | `Text-normal/sm` |
| Menu Item label, Tab label | `Text-medium/sm` |
| Notif actor name (unread) | `Text-semibold/sm` |
| Notif actor name (read) | `Text-medium/sm` |
| Notif action text | `Text-normal/sm` |
| Notif timestamp + category | `Text-normal/xs` |
| Fund pill label | `Text-medium/xs` |

## Account Dropdown

**Layout (280 × HUG)**

```
┌─────────────────────────────────────┐
│  [Avatar]  Jane Doe                 │   Header (space/16 inset)
│            Elysium Capital          │
├─────────────────────────────────────┤   Divider
│   [icon]  Your details              │
│   [icon]  Settings                  │
│   [icon]  Help centre               │   Menu Item ×5
│   [icon]  Give Feedback             │
│   [icon]  Theme    [☀ ☾ ⚙]          │   w/ Segmented Control in right slot
├─────────────────────────────────────┤   Divider (before destructive)
│   [icon]  Log out                   │
└─────────────────────────────────────┘
```

- Container: `bg/canvas`, `border/default 1px`, `radius/l`, `shadow/dropdown`
- Header: Avatar 40×40, `Text-semibold/md` name, `Text-normal/sm text/secondary` org
- Menu Item: 40 tall, icon 20×20, label `Text-medium/sm`, hover `bg/glass radius/m`, focus `border/focus 2px`
- Theme segmented control: HUG × 28, `bg/surface` track, 3 icon-only segments; selected segment `bg/canvas` + subtle shadow
- Icons: `user-01`, `settings-01`, `help-circle`, `message-smile-circle`, `sun`, `log-out-01`

## Notifications Dropdown

**Layout (504 × HUG, max-height 640)**

```
┌──────────────────────────────────────────────────┐
│  Notifications                                   │   Title row
├──────────────────────────────────────────────────┤
│  [Unread]  [Read]                                │   Tabs row
│  [All funds ▾]              Mark all as read ↻   │   Controls row
├──────────────────────────────────────────────────┤   Divider
│   Notif Row                                      │
│   Notif Row                                      │   Feed (scrollable at 480)
│   Notif Row                                      │
│   ...                                            │
└──────────────────────────────────────────────────┘
```

- Container tokens match Account Dropdown (same canvas, border, radius, shadow)
- Title: `Text-semibold/md`
- Tabs: 2-item `Tabs` component; Unread default selected
- Controls: HStack justify-between. Left: outline Button "All funds ▾"; Right: ghost Button "Mark all as read" w/ icon; disables + dims to `text/muted` when Unread count = 0
- Feed: VStack, `itemSpacing=space/4`, `space/4` horizontal padding, overflow-y auto at `480`
- **Scrolling state**: subtle top/bottom fade gradients from `bg/canvas` to transparent inside scroll container
- **Empty state**: `Empty State` block replaces feed, copy per active tab:
  - Unread empty → "You're all caught up" / "New fund activity will appear here."
  - Read empty → "No read notifications yet" / "Items you've read will collect here."
  - Never-had-any → "Nothing here yet" / "You'll see fund activity as it happens."

## Notif Row anatomy (472 × HUG)

**Structure:** HStack · padding `space/12` · `radius/m` · hover `bg/glass`

**Left (40×40):** Avatar (person events) or event-icon container (system events). Unread = 8×8 `bg/success` dot with 2px `bg/canvas` ring, top-right.

**Middle (FILL):** VStack `itemSpacing=space/4`
- Row 1 — Headline: `actor` (semibold) + `action text` (normal) + `Fund Pill` inline
- Row 2 — Meta: `timestamp · category` in `Text-normal/xs text/muted`
- Row 3 (optional) — Embedded block:
  - **Amount card**: `bg/surface`, `radius/s`, `Text-semibold/sm` value + `Text-normal/xs` label
  - **Inline actions** (Action only): `[Review]` outline + `[Approve]` solid, Button `size=sm`, gap `space/8`

**States (variant):**
| Element | Unread | Read |
|---|---|---|
| Green dot | ✓ | — |
| Actor name | `Text-semibold/sm` | `Text-medium/sm` |
| Action text color | `text/primary` | `text/secondary` |

**Action-required emphasis (Body=Action):**
- Left border 3px `border/warning`
- Row background `bg/warning-subtle`
- Event icon container `bg/warning-subtle` + `text/warning` icon
- Row 3 always shows `[Review]` / `[Approve]` buttons
- Headline pattern: "Large redemption requested on [Fund Pill] — requires your approval"

**V1 sample rows**

| # | Event | Body variant | Embedded |
|---|---|---|---|
| 1 | Subscription received | Standard | Amount card |
| 2 | Redemption processed | Standard | Amount card |
| 3 | Dealing cutoff approaching | Standard | — |
| 4 | Dealing cutoff closed | Standard | — |
| 5 | Settlement completed | Standard | Amount card |
| 6 | NAV published | Standard | Amount card (NAV + % change) |
| 7 | Large redemption — requires approval | Action | `[Review] [Approve]` |

## Gluestack code tweaks

### Existing files to modify

| File | Changes |
|---|---|
| `components/ui/menu/index.tsx` | Container: `rounded-md → rounded-l`, `bg-background-0 → bg-canvas`, `border-outline-100 → border-default`, `shadow-hard-5 → shadow-dropdown`. Item: hover/active `bg-background-*→ bg-glass`, label `text-typography-700 → text-primary`. `min-w-[200px] → min-w-[232px]`. Separator `bg-background-200 → bg-default`. |
| `components/ui/popover/index.tsx` | Same container tokens as Menu. |
| `components/ui/avatar/index.tsx` | Fallback text `text-typography-0 → text-on-inverse`. Ring `ring-canvas` for unread-dot overlay. |
| `components/ui/badge/index.tsx` | Add `size="xs"` (px-8 py-2 text-xs). Add `variant="pill"` with neutral/amber/green color slots. |
| `components/ui/button/index.tsx` | Confirm `size="sm"` + `variant="ghost"` exist; add ghost (transparent + `text-primary`) if missing. |
| `components/ui/divider/index.tsx` | `bg-background-200 → bg-default`. |

### New custom components

| File | Purpose |
|---|---|
| `components/custom/tabs/index.tsx` | HStack of Pressables. Active: `bg-surface text-primary rounded-s`. |
| `components/custom/segmented-control/index.tsx` | HStack container `bg-surface rounded-s p-2`. Selected segment: `bg-canvas` + shadow. |
| `components/custom/fund-pill/index.tsx` | Wrapper on `<Badge>` with fund color + icon. |
| `components/custom/notif-row/index.tsx` | Composes Avatar, VStack, FundPill, optional embedded block. |
| `components/custom/account-dropdown/index.tsx` | Popover + Menu + MenuItem + Divider + SegmentedControl. |
| `components/custom/notifications-dropdown/index.tsx` | Popover + Tabs + FundFilter + MarkAllRead + ScrollView + NotifRow + EmptyState. |

### Token wiring

**`tailwind.config.js` extend:**

```js
extend: {
  colors: {
    canvas: 'var(--bg-canvas)',
    surface: 'var(--bg-surface)',
    glass: 'var(--bg-glass)',
    primary: 'var(--text-primary)',
    secondary: 'var(--text-secondary)',
    muted: 'var(--text-muted)',
    default: 'var(--border-default)',
    warning: 'var(--border-warning)',
    'warning-subtle': 'var(--bg-warning-subtle)',
    success: 'var(--bg-success)',
    'success-subtle': 'var(--bg-success-subtle)',
  },
  borderRadius: { s: '6px', m: '8px', l: '12px', xl: '16px' },
  boxShadow: { dropdown: '0 4px 24px -2px rgba(0,0,0,0.08), 0 2px 6px -1px rgba(0,0,0,0.06)' },
}
```

**`global.css`** — set CSS vars on `:root` (light) and `[data-theme='dark']` (dark), values driven by `tokens/semantic/Light.tokens.json` and `Dark.tokens.json`. A small script should transform those JSONs → CSS vars.

**Named text-style utilities** — add `@layer components` classes mirroring `tokens/text-styles.json`:

```css
@layer components {
  .text-body-xs-normal { @apply font-normal text-[12px] leading-[18px] font-inter; }
  .text-body-sm-normal { @apply font-normal text-[14px] leading-[18px] font-inter; }
  .text-body-sm-medium { @apply font-medium text-[14px] leading-[18px] font-inter; }
  .text-body-sm-semibold { @apply font-semibold text-[14px] leading-[18px] font-inter; }
  .text-body-md-normal { @apply font-normal text-[16px] leading-[22px] font-inter; }
  .text-body-md-medium { @apply font-medium text-[16px] leading-[22px] font-inter; }
  .text-body-md-semibold { @apply font-semibold text-[16px] leading-[22px] font-inter; }
}
```

### Tradeoffs (accepted)
- Gluestack default demos will look "off" in our file once the class names are stripped — acceptable for design system alignment.
- Dark mode requires the CSS-var approach in `global.css` — covered by binding to tokens, not Gluestack defaults.
- Behavior layer (keyboard, focus, a11y) in Gluestack is untouched — only style classes change. Upstream updates remain mergeable.

## Non-goals (V1)
- Fund filter popover contents (button shown in default state only; checkbox list deferred).
- Notification persistence, websocket hookup, real data flows.
- Settings → Theme syncing with system preference (just wire the control; persistence in a later task).
- A dedicated "all notifications" page — only the dropdown panel in V1.

## Success criteria
- Both dropdowns exist as Figma component sets with all listed variants, bound to Elysium tokens and text styles.
- New Gluestack source files compile without changes to consumers; existing call sites get the new look automatically.
- Dark mode renders correctly via CSS-var token binding.
- Designer can drop `<NotifRow>` into any page and it matches the Figma spec.

## Next step
Invoke `writing-plans` skill to produce a phased implementation plan covering: (a) Figma primitives, (b) Figma containers, (c) Gluestack code tweaks, (d) React custom components, (e) verification.
