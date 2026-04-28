# Token Gap List — Dropdown Implementation Phase 1

**Context:** Phase 1 Task 1.1 of `elysium-design/plans/2026-04-20-dropdown-menus.md`. Audit result: Elysium's token system is richer than the spec anticipated, and most spec names don't match the actual tokens. Below is what I found, what's missing, and a recommended path forward. **Your approval needed before proceeding.**

---

## What exists (Elysium semantic tokens — 124 per mode)

Per `tokens/semantic/Light.tokens.json` and `Dark.tokens.json`:

| Group | Tokens | Notes |
|---|---|---|
| `bg` (12) | canvas, surface, elevated, subtle, glass, glass-elevated, overlay, portfolio-grad-*, sheet-grad-* | All surfaces covered |
| `border` (6) | default, subtle, strong, bold, negative, positive | No warning/focus named here — use `status.*` / `focus.ring-color` |
| `text color` (7) | primary, secondary, muted, filled, inverse, positive, negative | `inverse` = what I called `on-inverse` |
| `status` (10) | positive, positive-bg, negative, negative-bg, warning, warning-bg, info, info-bg, neutral, neutral-bg | **Covers the Action-required emphasis fully** |
| `button` (36) | ghost/primary/secondary/tertiary/danger × bg/text/border/hover/pressed/disabled | Exhaustive button tokens — can replace Gluestack button classes |
| `radius` (7) | xs, s, m, l, xl, 2xl, full | All sizes present |
| `space` (15) | 0, 2, 4, 8, 16, 24, 32, 40, 48, 64, 80, 96, 112, 128, 144 | Complete |
| `focus` (1) | ring-color | = `border/focus` in spec |
| `table` (5) | header-bg, row-bg, row-bg-hover, row-bg-selected, border | N/A for dropdowns |
| `text size` (19) | display/heading/title/body/caption/label/data × lg/md/sm | Numeric sizes, complementary to text-styles |
| `gradient` (6) | chart.positive/negative/neutral × start/end | N/A for dropdowns |

## Name mapping — spec → actual

The spec used aspirational names. Actual tokens to use:

| Spec name | Actual token | Status |
|---|---|---|
| `bg/canvas` | `bg.canvas` | ✅ exists |
| `bg/surface` | `bg.surface` | ✅ exists |
| `bg/glass` | `bg.glass` | ✅ exists |
| `bg/warning-subtle` | `status.warning-bg` | ✅ equivalent |
| `bg/success-subtle` | `status.positive-bg` | ✅ equivalent |
| `border/default` | `border.default` | ✅ exists |
| `border/warning` | `status.warning` (as border color) | ✅ reuse status token |
| `border/focus` | `focus.ring-color` | ✅ exists |
| `text/primary` | `text color.primary` | ✅ exists |
| `text/secondary` | `text color.secondary` | ✅ exists |
| `text/muted` | `text color.muted` | ✅ exists |
| `text/warning` | `status.warning` | ✅ reuse status token |
| `text/on-inverse` | `text color.inverse` | ✅ exists |
| `radius/s (6)` | `radius.s` | ✅ exists |
| `radius/m (8)` | `radius.m` | ✅ exists |
| `radius/l (12)` | `radius.l` | ✅ exists |
| `space/*` | `space.*` | ✅ all exist |

## Actually missing — needs user approval

### 1. `shadow/dropdown` (new token)
No shadow tokens exist in Elysium's semantic layer (Gluestack has `hard-1..5` and `soft-1..4`, but those aren't Elysium-owned). Dropdowns need a soft elevation shadow.

**Proposed values:**
- **Light mode:** `0 4px 24px -2px rgba(0,0,0,0.08), 0 2px 6px -1px rgba(0,0,0,0.06)`
- **Dark mode:** `0 4px 24px -2px rgba(0,0,0,0.4), 0 2px 6px -1px rgba(0,0,0,0.3)` (darker backgrounds need more prominence)

### 2. Nothing else is truly missing
Everything the spec called for can be satisfied by existing tokens using the mapping table above.

---

## Tailwind exposure gap (infrastructure)

Currently `tailwind.config.js` only exposes **Gluestack's color scale** (primary-0..950, typography-0..950, outline-0..950, etc.). **None of the 124 Elysium semantic tokens are available as Tailwind class names.** To use `bg-canvas` or `text-primary` (the Elysium one) in JSX, we need to extend Tailwind.

Gluestack sets its CSS vars via `nativewind`'s `vars()` in `components/ui/gluestack-ui-provider/config.ts` — not in `global.css`. This changes Phase 1 Task 1.4:

**Revised Phase 1:**
- **1.3** Write a script that reads `Light/Dark.tokens.json` and emits a NativeWind `vars({…})` object (matching the `config.ts` format).
- **1.4** Merge the generated vars into `components/ui/gluestack-ui-provider/config.ts` (don't overwrite — Gluestack's color scale vars stay for the base components that still depend on them).
- **1.5** Extend `tailwind.config.js` `extend.colors`, `extend.borderRadius`, `extend.boxShadow` to expose Elysium semantic names (matching the token naming, kebab-cased).
- **1.6** Add named text-style utilities in `global.css` (unchanged from plan).

### Proposed Tailwind naming convention
Since Elysium uses `bg.canvas` / `status.warning-bg` / `text color.primary` in the token JSON, we need a rule for Tailwind class names. Options:

- **Option 1 (flat):** `bg-canvas`, `bg-surface`, `bg-status-warning`, `bg-status-warning-bg`, `text-primary`, `text-inverse`, `border-default`, `border-focus-ring`
- **Option 2 (prefixed to avoid collisions with Gluestack):** `bg-ely-canvas`, `text-ely-primary` etc. — ugly but unambiguous
- **Option 3 (scoped):** `bg-sem-canvas`, `text-sem-primary` — "semantic" prefix

**My lean: Option 1.** Gluestack's scale uses `bg-primary-500` (with hyphen + number), so `bg-canvas` (no number) doesn't collide. Collisions possible on `text-primary` (Gluestack doesn't have this bare-form) and `bg-warning` (Gluestack has `bg-warning-500`). Bare names are cleaner and match spec.

---

## Decisions I need from you

1. **Approve `shadow/dropdown` values** (light + dark above)?
2. **Approve name mapping** (spec's speculative names → actual tokens)?
3. **Approve Tailwind naming convention** (Option 1 — flat bare names like `bg-canvas`, `text-primary`)?
4. **Proceed** with the Phase 1 subtask changes (adjusting 1.3 and 1.4 to target `config.ts` not `global.css`)?

Once approved I'll update the spec/plan to reflect actual token names, then execute Phase 1.2 onwards.
