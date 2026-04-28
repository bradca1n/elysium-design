# Dropdown Menus Implementation Plan

> **For agentic workers:** Use superpowers:executing-plans (or subagent-driven-development if subagents available) to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship Account + Notifications header dropdowns for Manager OS, as reusable Figma components bound to Elysium tokens, with matching React/Gluestack code that emits Elysium-branded defaults out of the box.

**Architecture:** Three coupled subsystems shipped together:
1. **Token layer** (`tailwind.config.js` + `global.css` + text-style utilities) — CSS vars driven by `tokens/semantic/{Light,Dark}.tokens.json`.
2. **Gluestack code** — 6 source files tweaked so defaults inherit Elysium tokens; 6 new custom wrappers composed from them.
3. **Figma components** — 8 components on the Base Components page, variants bound to the same tokens.

**Tech Stack:** Figma plugin API (figma-console MCP), Tailwind + NativeWind, Gluestack UI Pro, React Native, TypeScript.

**Spec:** `elysium-design/docs/specs/2026-04-20-dropdown-menus-design.md`

**Checkpoints:** End of each phase — user reviews output before next phase begins.

---

## Phase order (and why)

1. **Token plumbing** first — everything else depends on it.
2. **Gluestack source tweaks** — lightweight edits that rely on the tokens from phase 1.
3. **Figma primitives** — build smallest components (Menu Item, Tabs, Segmented Control, Fund Pill, Empty State).
4. **Figma Notif Row** — bigger composed component, own phase due to variant complexity.
5. **Figma containers** (Account Dropdown, Notifications Dropdown w/ states).
6. **React custom components** mirror the Figma containers.
7. **Verification** — screenshots, compile check, dark-mode parity, a11y smoke.

Figma and React can run in parallel after phase 2 if resourced. Plan assumes sequential for a single operator.

---

## Chunk 1: Phase 1 — Token plumbing

### Task 1.1: Confirm existing tokens and gaps

**Files:**
- Read: `elysium-design/tokens/semantic/Light.tokens.json`
- Read: `elysium-design/tokens/semantic/Dark.tokens.json`
- Read: `elysium-design/tokens/text-styles.json`
- Read: `LOCAL/gluestack-ui-pro/tailwind.config.js`
- Read: `LOCAL/gluestack-ui-pro/global.css`

- [ ] **Step 1: Read all five files, list every semantic color + radius + shadow + spacing token actually defined**
- [ ] **Step 2: Compare against the spec's required token list** (Section "Design tokens used" in the spec)
- [ ] **Step 3: Produce a gap list** (tokens the spec mentions that do NOT yet exist — likely candidates: `shadow/dropdown`, `bg/warning-subtle`, `bg/success-subtle`, `border/warning`, `text/warning`, `border/focus`, `text/on-inverse`)
- [ ] **Step 4: Before proceeding, surface the gap list to the user** with proposed values so we don't invent tokens unilaterally

**Checkpoint:** User approves the gap-list additions (exact hex values + dark-mode counterparts).

### Task 1.2: Add missing tokens to Figma file

**Files:**
- Figma file: `T3F6A4zWXWTWoMh0gnN1YM` (via figma-console MCP)

For each approved new token:
- [ ] **Step 1:** Create the variable in the existing collection (Color for bg/border/text, Number for radius/spacing).
- [ ] **Step 2:** Set the Light mode value; set the Dark mode value.
- [ ] **Step 3:** Log the resulting `VariableID:*` to record the id for downstream binding.
- [ ] **Step 4:** After the batch, screenshot the Variables panel to confirm.

**Checkpoint:** User confirms Figma tokens exist as expected.

### Task 1.3: Write CSS-var emit script

**Files:**
- Create: `elysium-design/scripts/emit-css-vars.ts` (or `.mjs` — match repo convention)
- Input: `elysium-design/tokens/semantic/Light.tokens.json`, `Dark.tokens.json`
- Output: Writes `:root { … }` and `[data-theme='dark'] { … }` blocks.

- [ ] **Step 1:** Write a failing test: feed in a small fixture of `{ bg: { canvas: '#fefeff' } }` and assert output contains `--bg-canvas: #fefeff;`. Commit test.
- [ ] **Step 2:** Run test — expect FAIL (script doesn't exist).
- [ ] **Step 3:** Write the minimal script: flatten the token JSON into kebab-case CSS var names.
- [ ] **Step 4:** Run test — expect PASS.
- [ ] **Step 5:** Run the script against the real tokens, diff the produced block against `global.css`'s current `:root`. Surface the diff to user.
- [ ] **Step 6:** Commit script + test.

**Checkpoint:** User reviews the produced CSS and approves inserting it into `global.css`.

### Task 1.4: Apply CSS vars to `global.css`

**Files:**
- Modify: `LOCAL/gluestack-ui-pro/global.css`

- [ ] **Step 1:** Insert the generated `:root` and `[data-theme='dark']` blocks at the top of `global.css`.
- [ ] **Step 2:** Remove any redundant color definitions that duplicate the new vars (carefully — flag duplicates to user rather than auto-delete).
- [ ] **Step 3:** Commit.

### Task 1.5: Extend `tailwind.config.js`

**Files:**
- Modify: `LOCAL/gluestack-ui-pro/tailwind.config.js`

- [ ] **Step 1:** Add the `extend` block from the spec (colors, borderRadius, boxShadow) so class names like `bg-canvas`, `rounded-l`, `shadow-dropdown` compile.
- [ ] **Step 2:** Run `tailwindcss --no-autoprefixer --input global.css --output /tmp/out.css` or equivalent; inspect that new utilities exist.
- [ ] **Step 3:** Commit.

### Task 1.6: Add named text-style utilities

**Files:**
- Modify: `LOCAL/gluestack-ui-pro/global.css` (add `@layer components` block)

- [ ] **Step 1:** Generate one utility class per row in `text-styles.json`: `.text-body-{size}-{weight}` for Inter, `.text-display-{size}-{weight}` for Serrif Condensed.
- [ ] **Step 2:** Cross-check that `font-inter` and `font-serrif` font families are registered in Tailwind config. If not, add them.
- [ ] **Step 3:** Commit.

**Checkpoint:** Phase 1 complete — compile the app (or run a dev build). Nothing visual should change yet. Classes like `bg-canvas`, `text-primary`, `text-body-sm-medium`, `rounded-l`, `shadow-dropdown` should all resolve.

---

## Chunk 2: Phase 2 — Gluestack source tweaks

Each file is a small, contained edit. Every task ends in a commit and a visual smoke check against an existing screen that uses the component (if any).

### Task 2.1: Menu

**Files:**
- Modify: `LOCAL/gluestack-ui-pro/components/ui/menu/index.tsx`

Changes (from spec):
- `menuStyle.base`: `rounded-md → rounded-l`, `bg-background-0 → bg-canvas`, `border-outline-100 → border-default`, `shadow-hard-5 → shadow-dropdown`.
- `menuItemStyle.base`: `min-w-[200px] → min-w-[232px]`; hover/active `bg-background-50/100 → bg-glass`; add `rounded-m` to item.
- `menuItemLabelStyle.base`: `text-typography-700 → text-primary`, keep `font-normal font-body` (or swap to `text-body-sm-medium` utility).
- `menuSeparatorStyle.base`: `bg-background-200 → bg-default`.

- [ ] **Step 1:** Open file, locate each `tva` block.
- [ ] **Step 2:** Apply the class substitutions listed above.
- [ ] **Step 3:** Commit `refactor(menu): bind to Elysium tokens`.

### Task 2.2: Popover

**Files:**
- Modify: `LOCAL/gluestack-ui-pro/components/ui/popover/index.tsx`

- [ ] **Step 1:** Locate the popover content style block.
- [ ] **Step 2:** Apply same container tokens as Menu: `bg-canvas`, `border-default`, `rounded-l`, `shadow-dropdown`.
- [ ] **Step 3:** Commit.

### Task 2.3: Avatar

**Files:**
- Modify: `LOCAL/gluestack-ui-pro/components/ui/avatar/index.tsx`

- [ ] **Step 1:** Replace fallback text `text-typography-0 → text-on-inverse`.
- [ ] **Step 2:** If an outer ring is configurable, allow a `ring-canvas` override (needed for unread dot overlay on Notif Row avatar).
- [ ] **Step 3:** Commit.

### Task 2.4: Badge (Fund Pill requirements)

**Files:**
- Modify: `LOCAL/gluestack-ui-pro/components/ui/badge/index.tsx`

- [ ] **Step 1:** Add `size="xs"` variant (px-8 py-2, text-body-xs-medium or equivalent).
- [ ] **Step 2:** Add or extend a `variant="pill"` with color slots driven by `bg/surface`, `bg/warning-subtle`, `bg/success-subtle`, plus matching `text-*` tokens.
- [ ] **Step 3:** Ensure the component supports a leading icon slot for the fund-icon dot.
- [ ] **Step 4:** Commit.

### Task 2.5: Button

**Files:**
- Modify: `LOCAL/gluestack-ui-pro/components/ui/button/index.tsx`

- [ ] **Step 1:** Verify `size="sm"` exists (height ≈32, px 12). If not, add it.
- [ ] **Step 2:** Verify `variant="ghost"` exists (transparent bg, `text-primary`). If not, add it with spec classes.
- [ ] **Step 3:** Verify `variant="outline"` looks right for the Fund Filter / Review button — should use `border-default`, `bg-canvas`, `text-primary`.
- [ ] **Step 4:** Commit.

### Task 2.6: Divider

**Files:**
- Modify: `LOCAL/gluestack-ui-pro/components/ui/divider/index.tsx`

- [ ] **Step 1:** Replace `bg-background-200 → bg-default`.
- [ ] **Step 2:** Commit.

**Checkpoint:** Phase 2 complete. Run the app / Storybook equivalent and visually confirm existing screens using Menu, Popover, Avatar, Badge, Button, Divider look correct (no broken hover, no lost contrast). If testing infra exists, run component unit tests; if not, note that as a follow-up.

---

## Chunk 3: Phase 3 — Figma primitives

Figma work happens via `mcp__figma-console__figma_execute`. All new components go on the **Base Components** page (`12:6504`), laid out horizontally (per memory: no vertical arrangement on component pages).

Pattern per task: (a) script creates the component + variants, (b) bind tokens to fills/padding/spacing/radius, (c) screenshot, (d) surface for user review.

### Task 3.1: Menu Item component

- [ ] **Step 1:** Create `Menu Item` component. Frame: 232 × 40, HORIZONTAL auto-layout, gap `space/12`, padding `space/8` V + `space/12` H. Children: Icon (20×20, instance-swap default `user-01`), Label text (`Text-medium/sm`, `text/primary`), Right slot (HUG, transparent).
- [ ] **Step 2:** Create variants for `State=Default | Hover | Focus`. Hover fill `bg/glass`, Focus adds `border/focus 2px`, `radius/m` on both.
- [ ] **Step 3:** Add component properties: `Show icon` (bool), `Show right slot` (bool), `Label` (text), `Icon` (instance swap).
- [ ] **Step 4:** Screenshot. Commit (save Figma file).

### Task 3.2: Segmented Control component

- [ ] **Step 1:** Create `Segmented Control` component set. Variant property `Items` with values `2 | 3`, and `Selected` index (`0 | 1 | 2`).
- [ ] **Step 2:** Container: HORIZONTAL auto-layout, `bg/surface`, `radius/s`, padding `space/2`, `itemSpacing=0`.
- [ ] **Step 3:** Each segment: 28 tall, HUG width, padding `space/6` H, icon-only slot (instance-swap). Selected segment: `bg/canvas` + subtle shadow, `text/primary`. Unselected: transparent, `text/secondary`.
- [ ] **Step 4:** Screenshot. Commit.

### Task 3.3: Tabs component

- [ ] **Step 1:** Create `Tabs` component set. Variants: `Items=2/3/4`, `Selected=0..3`.
- [ ] **Step 2:** Container: HORIZONTAL, FILL, `itemSpacing=space/4`, no bg.
- [ ] **Step 3:** Each tab: padding `space/8` V + `space/12` H, label `Text-medium/sm`. Active: `bg/surface`, `radius/s`, `text/primary`. Inactive: transparent, `text/secondary`.
- [ ] **Step 4:** Screenshot. Commit.

### Task 3.4: Fund Pill component

- [ ] **Step 1:** Inspect existing `Fund Icon` component to get the color/type variants already defined.
- [ ] **Step 2:** Create `Fund Pill` component set. Variant `Type=1..n` (mirror Fund Icon types).
- [ ] **Step 3:** Frame: HORIZONTAL auto-layout, HUG, gap `space/4`, padding `space/4` V + `space/6` H, `radius/s`, `bg/surface`. Children: fund color dot (6×6, `radius/round`), label `Text-medium/xs` `text/primary`.
- [ ] **Step 4:** Screenshot all types. Commit.

### Task 3.5: Empty State component

- [ ] **Step 1:** Create `Empty State` component set. Variant `Tab=Unread | Read | Never`.
- [ ] **Step 2:** Frame: VERTICAL, FILL, padding `space/32` V + `space/24` H, `itemSpacing=space/8`, alignItems=CENTER.
- [ ] **Step 3:** Children per variant: Icon (48×48 instance swap), Heading (`Text-semibold/md` `text/primary`), Subcopy (`Text-normal/sm` `text/secondary`). Copy per spec.
- [ ] **Step 4:** Screenshot all 3 variants. Commit.

**Checkpoint:** Phase 3 complete. User reviews all 5 primitives on the Base Components page and confirms visuals match spec.

---

## Chunk 4: Phase 4 — Figma Notif Row

Notif Row is the largest primitive — own phase because of the Standard/Action body variants and the embedded blocks.

### Task 4.1: Notif Row — Standard body

- [ ] **Step 1:** Create `Notif Row/Body-Standard` component (hidden internal component). Frame: 472 × HUG, HORIZONTAL, `itemSpacing=space/12`, padding `space/12`, `alignItems=MIN`.
- [ ] **Step 2:** Left column: 40×40 container, instance-swap property (Avatar or Event Icon). Add unread dot overlay as an absolutely-positioned child — 8×8 `bg/success`, 2px `bg/canvas` ring, top-right.
- [ ] **Step 3:** Middle column (FILL): VERTICAL `itemSpacing=space/4`. Row 1: inline text (actor semibold, action normal) + Fund Pill instance. Row 2: timestamp + category meta. Row 3 (optional): Amount Card sub-component (see 4.2).
- [ ] **Step 4:** Add component properties: `Actor`, `Action text`, `Fund pill` (instance swap for Type), `Timestamp`, `Category`, `Show embedded` (bool — shows/hides Row 3).
- [ ] **Step 5:** Screenshot with 3 sample configurations (short, long, embedded). Commit.

### Task 4.2: Amount Card sub-component

- [ ] **Step 1:** Create `Amount Card` sub-component. Frame: FILL × HUG, padding `space/12`, `radius/s`, `bg/surface`, VERTICAL `itemSpacing=space/2`.
- [ ] **Step 2:** Children: Value (`Text-semibold/sm` `text/primary`), Label (`Text-normal/xs` `text/muted`).
- [ ] **Step 3:** Properties: `Value`, `Label`.
- [ ] **Step 4:** Screenshot. Commit.

### Task 4.3: Notif Row — Action body

- [ ] **Step 1:** Create `Notif Row/Body-Action` component. Copy Body-Standard, then apply emphasis treatment.
- [ ] **Step 2:** Left border 3px `border/warning`, row background `bg/warning-subtle`.
- [ ] **Step 3:** Event icon container: `bg/warning-subtle` + `text/warning` icon.
- [ ] **Step 4:** Row 3: replace Amount Card with HStack of two Buttons — `[Review]` outline, `[Approve]` solid. Gap `space/8`.
- [ ] **Step 5:** Add property `Show actions` (bool, default true for this variant).
- [ ] **Step 6:** Screenshot. Commit.

### Task 4.4: Notif Row wrapper (outer component users consume)

- [ ] **Step 1:** Create `Notif Row` component set. Properties: `Body=Standard|Action`, `State=Unread|Read|Hover`.
- [ ] **Step 2:** Each variant wraps the correct inner Body-* component via nested-instance + swap.
- [ ] **Step 3:** Read state: actor name `Text-medium/sm`, action text `text/secondary`, no green dot on avatar overlay.
- [ ] **Step 4:** Hover state: row-level `bg/glass`, `radius/m`.
- [ ] **Step 5:** Screenshot all 6 variants (Standard×Unread/Read/Hover, Action×Unread/Read/Hover). Commit.

**Checkpoint:** Phase 4 complete. User spot-checks the 6 variants + 7 V1 sample rows, confirms emphasis treatment on Action variant is right.

---

## Chunk 5: Phase 5 — Figma containers

### Task 5.1: Account Dropdown component

- [ ] **Step 1:** Frame 280 × HUG, VERTICAL, `bg/canvas`, `border/default 1px`, `radius/l`, `shadow/dropdown`. Padding `space/8`.
- [ ] **Step 2:** Header block: HORIZONTAL, padding `space/12` all, gap `space/12`. Avatar instance + VStack (Name `Text-semibold/md`, Org `Text-normal/sm` `text/secondary`). Add properties `Avatar`, `Name`, `Org`.
- [ ] **Step 3:** Divider instance.
- [ ] **Step 4:** 5 Menu Item instances (Your details, Settings, Help centre, Give Feedback, Theme). Theme row has Segmented Control instance in its right slot.
- [ ] **Step 5:** Divider instance.
- [ ] **Step 6:** Menu Item instance (Log out).
- [ ] **Step 7:** Set text properties + icon instance-swap props on each item.
- [ ] **Step 8:** Screenshot. Commit.

### Task 5.2: Notifications Dropdown — Default state

- [ ] **Step 1:** Frame 504 × HUG (max 640), VERTICAL, same container tokens as Account Dropdown. Padding `space/16` top + L/R, `space/8` bottom, `itemSpacing=space/12`.
- [ ] **Step 2:** Title row: "Notifications" text, `Text-semibold/md`.
- [ ] **Step 3:** Tabs row: `Tabs` instance, Items=2 (Unread/Read), Selected=0.
- [ ] **Step 4:** Controls row: HSTACK justify-between. Left: Button outline "All funds ▾" w/ icon. Right: Button ghost "Mark all as read" w/ icon.
- [ ] **Step 5:** Divider instance.
- [ ] **Step 6:** Feed: VSTACK, padding `space/4` H, `itemSpacing=space/4`. Populate with 7 V1 Notif Row instances (6 Standard + 1 Action).
- [ ] **Step 7:** Screenshot. Commit.

### Task 5.3: Notifications Dropdown — Empty state

- [ ] **Step 1:** Duplicate the Default component to create the Empty variant.
- [ ] **Step 2:** Replace Feed area with `Empty State` instance (variant Unread by default).
- [ ] **Step 3:** Screenshot. Commit.

### Task 5.4: Notifications Dropdown — Scrolling state

- [ ] **Step 1:** Duplicate the Default component. Set Feed to contain 12+ Notif Row instances so it overflows.
- [ ] **Step 2:** Clip the Feed area at max-height 480.
- [ ] **Step 3:** Add top/bottom fade gradient rectangles inside the Feed area as visual overlays (from `bg/canvas` to transparent).
- [ ] **Step 4:** Screenshot. Commit.

### Task 5.5: Combine all three Notifications Dropdown variants into a component set

- [ ] **Step 1:** Use `figma.combineAsVariants([default, empty, scrolling], parent)` to form the set.
- [ ] **Step 2:** Name variant property `State=Default|Empty|Scrolling`.
- [ ] **Step 3:** Final screenshot of the set. Commit.

**Checkpoint:** Phase 5 complete. User reviews both container components, verifies all states render correctly with tokens bound.

---

## Chunk 6: Phase 6 — React custom components

Each custom component is composed from primitives tweaked in Phase 2. All typed with TypeScript, use NativeWind `className`, no raw HTML.

### Task 6.1: Tabs (`components/custom/tabs/index.tsx`)

**Files:**
- Create: `LOCAL/gluestack-ui-pro/components/custom/tabs/index.tsx`

- [ ] **Step 1:** Write failing test in `tabs/__tests__/index.test.tsx`: render with 2 items, assert both labels present, assert selected has active classes. Test uses React Native Testing Library if installed, otherwise skip test step and flag to user.
- [ ] **Step 2:** Implement as HStack of Pressables. Props: `items: { label: string; value: string }[]`, `value: string`, `onChange: (v: string) => void`.
- [ ] **Step 3:** Active tab classes: `bg-surface text-primary rounded-s`. Inactive: `text-secondary`.
- [ ] **Step 4:** Run test. Commit.

### Task 6.2: Segmented Control (`components/custom/segmented-control/index.tsx`)

- [ ] **Step 1:** Failing test (render 3 items, assert selected segment has `bg-canvas` class + shadow).
- [ ] **Step 2:** Implement HStack container w/ `bg-surface rounded-s p-[2px]`. Each segment: Pressable with icon-only by default, optional label.
- [ ] **Step 3:** Pass test. Commit.

### Task 6.3: Fund Pill (`components/custom/fund-pill/index.tsx`)

- [ ] **Step 1:** Wrapper on `<Badge size="xs" variant="pill">` that takes `{ fund: { name: string; colorToken: 'primary' | 'success' | … } }`.
- [ ] **Step 2:** Renders colored dot + label. Colors resolve through Tailwind classes tied to design tokens.
- [ ] **Step 3:** Unit test: renders with expected text, correct role/label. Commit.

### Task 6.4: Notif Row (`components/custom/notif-row/index.tsx`)

- [ ] **Step 1:** Test fixture with props matching the Figma component's properties: `actor`, `action`, `fund`, `timestamp`, `category`, `state`, `body`, `amount?`, `onReview?`, `onApprove?`.
- [ ] **Step 2:** Failing test: renders actor + action + fund pill; unread state shows green dot; action body shows buttons.
- [ ] **Step 3:** Implement as HStack { Avatar+dot } + VStack { Row1 inline + Row2 meta + Row3 conditional }.
- [ ] **Step 4:** Action variant applies `bg-warning-subtle`, left `border-l-[3px] border-warning`.
- [ ] **Step 5:** Pass test. Commit.

### Task 6.5: Account Dropdown (`components/custom/account-dropdown/index.tsx`)

- [ ] **Step 1:** Compose Popover + Menu + MenuItem + Divider + SegmentedControl.
- [ ] **Step 2:** Props: `user: { name, org, avatar }`, `theme: 'light' | 'dark' | 'auto'`, `onThemeChange`, `onSelect: (key) => void` where key ∈ Your details | Settings | Help centre | Give Feedback | Log out.
- [ ] **Step 3:** Test: open the dropdown, click each item, assert callback fires with correct key.
- [ ] **Step 4:** Pass test. Commit.

### Task 6.6: Notifications Dropdown (`components/custom/notifications-dropdown/index.tsx`)

- [ ] **Step 1:** Compose Popover + Title + Tabs + FundFilter button + MarkAllRead button + ScrollView + NotifRow + EmptyState.
- [ ] **Step 2:** Props: `notifications: Notification[]`, `activeTab: 'unread' | 'read'`, `onTabChange`, `fundFilter: string | null`, `onFundFilterChange`, `onMarkAllRead`, `onApproveAction`, `onReviewAction`.
- [ ] **Step 3:** When `activeTab === 'unread'` filter to `state === 'unread'` and show EmptyState variant `unread` if empty.
- [ ] **Step 4:** Implement ScrollView max-height `480`. Top/bottom fade gradients are CSS-only — linear-gradient overlays.
- [ ] **Step 5:** MarkAllRead disables + dims when `notifications.filter(n => n.state === 'unread').length === 0`.
- [ ] **Step 6:** Tests: renders correct tab's items, empty state copy, scroll behavior (render 12+ items).
- [ ] **Step 7:** Pass test. Commit.

**Checkpoint:** Phase 6 complete. User reviews the 6 new components rendered in a demo screen (a scratch page that drops all of them in). Confirm visual match with Figma.

---

## Chunk 7: Phase 7 — Verification

### Task 7.1: Visual parity check (Figma vs React)

- [ ] **Step 1:** Create a scratch file/page with all 6 React components rendered with fixture data matching the V1 Figma samples.
- [ ] **Step 2:** Take a screenshot. Place side-by-side with the Figma component screenshot.
- [ ] **Step 3:** Diff list: any pixel-level or token differences. If trivial (off-by-1, missing shadow), fix in code and re-verify. If structural, flag to user.

### Task 7.2: Dark mode check

- [ ] **Step 1:** Toggle `[data-theme='dark']` on the root. Render the demo page.
- [ ] **Step 2:** Screenshot. Verify: every token swaps; no hardcoded color leaks; green/amber accents remain readable.
- [ ] **Step 3:** Cross-check with Figma Dark variables: screenshot the Figma components in Dark mode (via the Figma dark variable mode) and compare.

### Task 7.3: A11y smoke

- [ ] **Step 1:** Tab-through the Account Dropdown — all items reachable, focus ring visible using `border/focus`.
- [ ] **Step 2:** Tab-through the Notifications Dropdown — tabs, filter, mark-all, rows, inline buttons all reachable in logical order.
- [ ] **Step 3:** Screen reader pass: actor + action + fund read as a single coherent sentence. If not, add `accessibilityLabel`.

### Task 7.4: Compile / lint / type check

- [ ] **Step 1:** Run `pnpm build` / `yarn build` / equivalent on `gluestack-ui-pro`.
- [ ] **Step 2:** Run `tsc --noEmit`.
- [ ] **Step 3:** Run the project's linter.
- [ ] **Step 4:** Fix anything that fails. Commit.

### Task 7.5: Final review artefact

- [ ] **Step 1:** Produce a one-page summary: Figma component IDs + React component paths + demo screen URL/path + open issues (if any).
- [ ] **Step 2:** Save to `elysium-design/docs/specs/2026-04-20-dropdown-menus-ship-notes.md`.
- [ ] **Step 3:** Commit.

**Checkpoint:** Phase 7 complete. User signs off. Ready to open PR.

---

## Open items / risks

- **Token gap list** (Task 1.1) may require more tokens than listed in the spec — surfaced to user before proceeding.
- **Test infrastructure** in `gluestack-ui-pro` — may need to set up Vitest or Jest + RTL if not already present. Flag to user at Task 6.1; don't block the plan on it.
- **Figma-side verification** relies on `figma-console MCP` remaining connected. If disconnected mid-phase, user reconnects via Plugins → Development → Figma Desktop Bridge.
- **Shadow token (`shadow/dropdown`)** is not in the current token JSONs — will require user approval of proposed value in Task 1.1.
- **Dark mode parity** for `bg/warning-subtle`, `bg/success-subtle` needs both Light + Dark values at Task 1.1.

---

Plan complete and saved to `elysium-design/plans/2026-04-20-dropdown-menus.md`. Ready to execute?
