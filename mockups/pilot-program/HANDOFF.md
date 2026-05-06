# POD Pilot Program — Mockup Handoff

A static, high-fidelity React mockup of the POD Pilot Program web experience. This document captures every design decision baked into the build so the next person can extend it without re-deriving them.

## TL;DR

- **What it is**: a single-file React app (`index.html`) rendered via Babel-standalone. No build step, no node_modules, no router.
- **Where it lives**: `mockups/pilot-program/`
- **Live URLs**:
  - Dev (auto-updates with `main`): `https://raw.githack.com/bradca1n/elysium-design/main/mockups/pilot-program/index.html`
  - Pinned (immutable, cached forever): `https://rawcdn.githack.com/bradca1n/elysium-design/<commit-hash>/mockups/pilot-program/index.html`
- **Local dev**: open with any static server. The repo runs at `http://127.0.0.1:8766/pilot-program/index.html` against a custom local server.
- **Site key**: `POD2026` (gating, not security — see [Login Gate](#login-gate)).

## Table of contents

1. [Architecture](#architecture)
2. [Design system](#design-system)
3. [Page structure & spacing rhythm](#page-structure--spacing-rhythm)
4. [Component patterns](#component-patterns)
5. [Login gate & transitions](#login-gate--transitions)
6. [Cursor gradient component](#cursor-gradient-component)
7. [Side sheets](#side-sheets)
8. [Sidebar / navigation](#sidebar--navigation)
9. [Conventions to follow](#conventions-to-follow)
10. [How to add a new page](#how-to-add-a-new-page)
11. [Known issues / outstanding](#known-issues--outstanding)
12. [Deployment](#deployment)

---

## Architecture

**One file, no build.** Everything ships from `mockups/pilot-program/index.html`:

- React 18 UMD from `unpkg.com`
- ReactDOM 18 UMD from `unpkg.com`
- Babel-standalone from `unpkg.com` for in-browser JSX transform
- Lottie-web from `cdn.jsdelivr.net` for the loader animation

```html
<script src="https://unpkg.com/react@18.3.1/umd/react.development.js"></script>
<script src="https://unpkg.com/react-dom@18.3.1/umd/react-dom.development.js"></script>
<script src="https://unpkg.com/@babel/standalone@7.29.0/babel.min.js"></script>
<script src="https://cdn.jsdelivr.net/npm/lottie-web@5.12.2/build/player/lottie.min.js"></script>
```

**Why no build?** This is a design mockup intended to be opened directly from the filesystem or a simple static host. Easy to share, easy to fork.

**Folder layout:**

```
mockups/pilot-program/
├── index.html               # the entire app
├── HANDOFF.md               # this file
├── fonts/
│   ├── SerrifCondensed-Light.woff
│   └── SerrifCondensed-Light.woff2
└── assets/
    ├── header-1.png … header-6.png   # hero strip backgrounds
    ├── Structure.svg / Structure, dark mode.svg
    ├── illos/
    │   └── illo-{scale,launch,grow,institutional}{,-dark}.jpg
    ├── docx.svg / pdf.svg
    ├── rocket.png / structure-diagram.png
    ├── login/
    │   ├── bg-layer.mp4 / bg-layer-2.mp4   # legacy mp4 motion (replaced by CursorGradient)
    │   ├── top-layer.png                   # POD wordmark + circles overlay
    │   ├── pod-loader.json                 # Lottie loader (light)
    │   ├── pod-loader-dark.json            # Lottie loader (dark)
    │   └── cursor-gradient/                # original vanilla-JS reference
    └── … (UUID-named SVGs/PNGs from Figma export)
```

**State model:** plain `useState` and `useEffect`. No Redux, no context. Theme is in `localStorage.pilot.theme`. Auth is in `localStorage.pilot.authed`.

---

## Design system

The mockup defines tokens directly in CSS custom properties at `:root` (light) and `body.dark` (dark mode override). Always reference tokens via `var(--…)`.

### Spacing scale

Defined as `--space-N` in the root. Multiples of 4 / 8.

| Token            | Value | When to use                                                      |
| ---------------- | ----- | ---------------------------------------------------------------- |
| `--space-4`      | 4px   | tight gaps inside compact UI                                     |
| `--space-7`      | 7px   | sidebar nav row vertical padding                                 |
| `--space-8`      | 8px   | tight stacks (download cards in Term Sheet)                      |
| `--space-16`     | 16px  | between same-section subhead and intro pair                      |
| `--space-24`     | 24px  | sidebar group gaps; tile internal vertical rhythm                |
| `--space-32`     | 32px  | **subhead → intro** within a section; row internals               |
| `--space-40`     | 40px  | accordion row gap on Fund Creation                               |
| `--space-48`     | 48px  | **hero image → first subhead**; 3-col tile gap (Welcome Pilot row) |
| `--space-80`     | 80px  | **between sections** on every page                                |

### Typography

Two families, loaded in `<head>`:

- **`Serrif Condensed`** (Light, 300) — used for hero `<h1>`, section titles, and the login title. Local woff/woff2 in `fonts/`.
- **`Inter`** (400 / 500 / 600 / 700) — used for everything else. Loaded from Google Fonts.

Typography tokens in `:root`:

- `--fs-xs` 12 / `--fs-sm` 14 / `--fs-md` 16 / `--fs-lg` 18 / `--fs-xl` 24 / `--fs-3xl` 36 / `--fs-6xl` 80
- `--lh-tight` 1.4 / `--lh-normal` 1.5 / `--lh-relaxed` 1.6

**Heading defaults:**

- `h1` in hero: Serrif Condensed Light, `--fs-6xl` (80px)
- `h2.section-title`: Serrif Condensed Light, **36px**, `margin: 0 0 32px 0` (subhead → intro spacing baked in)
- `h3.subsection-title`: Inter SemiBold, `--fs-md`, `margin: 0 0 32px 0`
- Body paragraphs (`p.body-text`): Inter Regular, `--fs-sm`, `--text-secondary`
- Lead paragraphs (`p.lead`): Inter Medium, `--fs-lg`, `--text-primary`, `width: 810px`

### Colour tokens

Pulled from Figma's Semantic collection. Only ever reference tokens — never raw hex.

- Backgrounds: `--bg-white`, `--bg-canvas`, `--bg-glass`, `--bg-page`
- Text: `--text-primary`, `--text-secondary`, `--text-muted`
- Borders: `--border-strong`, `--border-default`, `--border-subtle`
- Accent: `--accent-plum`, `--neg`, `--pos`

`body.dark` overrides each of these. Most components and tokens are theme-aware via the `body.dark .x` selector pattern.

### Radius scale

`--radius-xs / s / m / l / xl / 2xl / full`. Reach for `--radius-m` for cards and inputs. `--radius-l` for the large hero overlay container.

---

## Page structure & spacing rhythm

**The 80/48/32 rule** — every page on this site follows the same vertical rhythm:

| Gap                                                 | Value | Mechanism                                                        |
| --------------------------------------------------- | ----- | ---------------------------------------------------------------- |
| Section → next section                              | 80px  | `.content { gap: 80px }` (flex column)                            |
| Hero image → first subhead in next section          | 48px  | `.content > .hero + * { margin-top: -32px }` (overrides 80 → 48)  |
| Subhead → intro copy                                | 32px  | `h2.section-title { margin-bottom: 32 }`, `h3.subsection-title { margin-bottom: 32 }`, inline `style={{margin: '0 0 32px 0'}}` overrides |

**Body width is 870px**, fixed. The `.content` div is positioned `absolute` at `left: 466px, top: 112px, width: 870px` inside a `1728px`-wide `.page-frame`. The `.page-frame` is centered with `margin: 0 auto`.

**Why fixed width?** This is a high-fidelity mockup that mirrors the Figma frames pixel-for-pixel. Don't change to fluid widths without the design lead's sign-off — every internal grid (2-col CTA cards 1fr/1fr inside 870, 3-col Pilot row at 230 each + 48 gap = 786, glossary table) is calibrated to it.

**Page frame entry animation:** `.page-frame { animation: pageEnter 0.6s cubic-bezier(0.22, 1, 0.36, 1); }` (opacity + 8px translateY). Fires every time the page-frame mounts; gives the welcome page a smooth load-in after login.

### Page inventory

Each page is a function in `index.html`. All follow the same outer skeleton:

```jsx
<div className="content">
  <Hero page="..." title="..."/>
  {/* sections separated by .content's 80px gap */}
  <NextPageCta from="..." onNav={onNav}/>  // optional
  <PageFooter/>
</div>
```

| Page | Component | `page` key | Hero image |
| ---- | --------- | ---------- | ---------- |
| Welcome | `WelcomePage` | `welcome` | header-2.png |
| Term sheet | `TermSheetPage` | `term-sheet` | header-1.png |
| Structure | `StructurePage` | `structure` | header-3.png |
| Fund creation / How it works | `HowItWorksPage` | `howitworks` | header-4.png |
| FAQs | `FAQPage` | `faqs` | header-5.png |
| Pricing | `PricingPage` | `pricing` | header-6.png |
| Sub-pages (Fund structure / Administration / Investor base / Identity & reporting) | `ProvidesContent` rendered inside `SubPageSheet` | n/a | various |

The `HEADER` constant maps `page` to `{ img }`. The `Hero` component reads from this map.

### Next-page CTA chain

Every page (except the last) ends with a "Next page" CTA card pointing to the next item in nav order:

| From | To |
| ---- | -- |
| welcome | term-sheet |
| term-sheet | structure |
| structure | pricing |
| pricing | faq |
| faq | how-it-works |
| how-it-works | (none) |

`NextPageCta` reads `NEXT_PAGE` to render itself. To extend nav, add an entry to `NEXT_PAGE`.

---

## Component patterns

### Hero (`Hero`)

The serif-titled banner at the top of every page.

```jsx
<Hero page="welcome" title="Welcome, Pilot"/>
```

- Background: an 870×200 image strip in `assets/header-N.png`
- Title overlay: `h1.serif`, white text, centered

### Lead paragraph (`<p className="lead">`)

The intro paragraph immediately below the hero. **Always use `marginTop: 48`** (inline) to enforce the hero → lead 48px rule when the parent is `.content`. The `.content > .hero + *` CSS rule handles this automatically when `<Hero>` is a direct child of `.content`, but Welcome wraps hero in a div, so Welcome uses inline `marginTop: 48` on the lead.

### CTA cards (`provides-grid` / `cta-card`)

The "What POD provides" 2-col grid of pillars on Welcome.

```css
.provides-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 17px 17px;
}
```

Cards fill 870px width (≈426 each). Don't fix the column width back to 384 — the grid is designed to adapt to the body width.

### Wide CTA card (`.cta-card-wide`)

Single-row card with `bg-glass`, used for "Where your SP fits" and as the next-page CTA. 870 wide.

### Pilot role 3-column layout (Welcome)

Three text columns side-by-side, each 230px wide with 48px gap.

```jsx
<div className="pilot-row" style={{marginTop: 24}}>
  <div className="pilot-col">
    <div className="label">Strategy</div>
    <div className="title">Define & run</div>
    <div className="desc">…</div>
  </div>
  …
</div>
```

CSS: `.pilot-row { display: flex; gap: var(--space-48); align-items: flex-start; }` and `.pilot-col { width: 230px; display: flex; flex-direction: column; gap: var(--space-24); }`.

**Important — earlier this section had a bordered "kpi-tile" design with a flower decoration; that was reverted to match the Figma. Don't reintroduce the bordered version unless the design lead asks.**

### Relationship 3-column (Welcome)

Same pattern as `.pilot-row` but with `.rel-row` / `.rel-kpi`. Different inner type sizes (`.rel-kpi .value` is `--fs-3xl`).

### Term Sheet glossary

A two-column table with term name on the left and a longer definition on the right. Spacing: 36px bottom padding inside each cell so the visual gap between rows lives BELOW the row, not equally above and below.

### Page anchors (`PageAnchors`)

Right-side floating jump-list. Hidden on Welcome. The `PAGE_ANCHORS` constant maps each route to its in-page anchor IDs.

---

## Login gate & transitions

The whole app sits behind a soft client-side login gate.

### Architecture

```
ReactDOM.render(<App/>)
  ↓
App  (decides authed vs gated)
  ├─ if authed:  <PilotApp/> → page-frame, sidebar, route view, side sheets
  └─ if !authed:
       ├─ phase='idle' or 'exiting':  <LoginGate>
       └─ phase='loading':            <PodLoader>
```

**Phase machine in `App`:**

```jsx
const handleLogin = () => {
  setPhase('exiting');
  setTimeout(() => setPhase('loading'), 500);              // exit anim
  setTimeout(() => { setAuthed(true); setPhase('idle'); }, 4500);  // 4s loader
};
```

`LoginGate` renders the full-bleed login panel; on the exiting phase, the form pane translates left out of frame and the hero pane translates right (`.login-card.exiting` class). `PodLoader` mounts after, plays the Lottie for 4s, then unmounts and `PilotApp` mounts with its `pageEnter` animation.

### Site key

```js
const SITE_KEY = 'POD2026';
const AUTH_STORAGE_KEY = 'pilot.authed';
```

To rotate, change `SITE_KEY` and redeploy. **This is gating, not security** — anyone reading the bundled JS can see the key.

### LocalStorage keys

| Key | Value | Purpose |
| --- | ----- | ------- |
| `pilot.authed` | `'1'` when logged in | Auth flag, read on first render |
| `pilot.email` | the email entered | Saved on successful login |
| `pilot.theme` | `'dark'` or unset | Theme preference |
| `pilot.access-requests` | JSON array | Stub for "Request access" form submissions (no backend yet) |

### Login screen layout

Two-pane card centred in the viewport:

- **Left**: `.login-form-pane` — title, description, two `FloatingField` inputs, primary button, request-access link
- **Right**: `.login-hero-pane` — `CursorGradient` background + top-layer.png overlay (POD wordmark + soft circles)
- **Outer**: `.login-gate` provides 64px padding from browser edges; `align-items: stretch` so the card fills viewport-minus-padding

The card itself is **transparent** — no background, no border, no box-shadow. Just a flex container with `padding: 32px` and `gap: 32px` between panes. The form pane has its own `padding: 96px 100px`. The hero pane has `border-radius: var(--radius-m)` so it appears as an inset rounded image with whitespace around it.

### FloatingField input

Single shared component for all login inputs. Wrapped in a 56px-tall border-radius-8 container; label sits centred, animates up to `top: 6px, font-size: 11px` on focus or when value is non-empty. Input padding-top jumps to 24px when floated so typed text drops below the floated label.

```jsx
<FloatingField label="Email" type="email" autoComplete="email" value={email} onChange={…}/>
```

Ported from the manager-os-nav `FloatingField` (in `views-other-terminal.jsx`). Use this same component if you add more form fields anywhere in the pilot-program app.

### Request access flow

The "Request access" link toggles to a second view inside the same `LoginGate` (`view='request'`). Submitting the name + email form pushes a record to `localStorage.pilot.access-requests` and shows a thank-you message. **There's no backend wired up.** If you want the requests to actually reach someone, point a Formspree or similar endpoint at the `submit` handler in `RequestAccessScreen`.

### Logout

Pinned at the bottom of the sidebar via `margin-top: auto` on its own `.sb-group`. The sidebar has `height: calc(100vh - 132px)` (not `max-height`) so the flex container always has space to push logout to the bottom. Includes an inline lucide-style logout icon (door + arrow-out) at 16×16.

`onLogout` clears `pilot.authed` from localStorage and sets `authed=false`. The gate re-mounts at `phase='idle'`.

---

## Cursor gradient component

Replaces the previous mp4 video on the login hero pane. Reusable, decorative, no dependencies.

```jsx
<CursorGradient smoothing={0.12} motionScale={0.1875}>
  <img className="login-hero-top" src="…/top-layer.png"/>
</CursorGradient>
```

### Behaviour

- **Full-bleed**: the inner `.cursor-gradient-radial` div uses `position: absolute; inset: -10%` so the gradient extends past the container's edges and never visibly cuts off
- **Cursor follow with lag**: rAF loop lerps `currentX/Y` toward `targetX/Y` at the smoothing factor each frame, then sets `--mx` and `--my` as percentages on the radial element. The browser doesn't re-parse the gradient string each frame because only the custom properties change.
- **Touch parity**: `touchmove` updates target the same way as `mousemove`, both `passive: true`
- **Ease back to centre**: `document.mouseleave` and the container's own `mouseleave` set target back to 50/50
- **Reduced motion**: `prefers-reduced-motion: reduce` snaps to target without rAF
- **Children**: anything passed as `children` renders above the gradient (the top-layer.png in our case)
- **Decorative**: `aria-hidden="true"` on the container; not focusable

### Props

| Prop | Default | Notes |
| ---- | ------- | ----- |
| `smoothing` | `0.12` | per-frame lerp factor; lower = more lag |
| `motionScale` | `0.1875` | scales travel distance around the centre. `1` = full edge-to-edge motion, `0.5` = halved, `0.1875` = current setting (subtle) |
| `colorStops` | 8-stop default | array of `[color, percent]` tuples |
| `children` | — | rendered above the gradient |

### Default colour stops

```
#0e1416 0%
#1a2326 18%
#2f3c3d 28%
#5d6f6a 40%
#9eb1a7 52%
#c8d4cb 65%
#d8e1d6 78%
#dde5da 100%
```

**Don't change these without design sign-off** — they were tuned to read against the top-layer.png overlay.

---

## Side sheets

Sub-pages (Fund structure, Administration, Investor base, Identity & reporting) open as a right-side panel rather than a full route change. `SubPageSheet` portals into `document.body`, locks `html` and `body` overflow, and slides in via `transform: translateX`.

### Critical: scrollbar gutter fix

The topbar (`.brand`, `.topbar-cta`) and `.sidebar` are anchored via `calc(50% - 864px + …)` to lock onto the centred 1728px frame. When the side sheet opens and locks body overflow, on systems with classic (non-overlay) scrollbars the gutter disappears and the viewport's `50%` shifts — making everything anchored to it visibly jump.

**Fix:** `html { overflow-y: scroll }` forces a permanent scrollbar gutter. Plus the side sheet now locks `documentElement.style.overflow` AND `body.style.overflow` so the gutter behaviour can't shift between elements.

If you ever change the scroll-locking mechanism, retest opening a sub-page and confirm the topbar/sidebar don't shift.

---

## Sidebar / navigation

`Sidebar` is `position: fixed` at `left: calc(50% - 864px + 32px); top: 112px; width: 220px; height: calc(100vh - 132px)`.

Two `.sb-group`s normally + a logout group pinned to the bottom:

1. **Overview**: Welcome, Term sheet, Structure, Pricing, FAQ
2. **Fund Creation**: How it works + "Create a fund" pill button
3. **Logout** (only when `onLogout` prop is passed): pinned via `margin-top: auto`

Each row uses `.sb-row` + `.sb-item`. Active state via `.sb-row.active .sb-item { background: var(--bg-glass) }`.

---

## Conventions to follow

These are non-negotiable unless explicitly overruled:

1. **Always bind to design tokens** — never raw hex, raw px in CSS, or magic numbers. Use `var(--space-…)`, `var(--text-…)`, `var(--bg-…)`, `var(--border-…)`, `var(--radius-…)`, `var(--fs-…)`.
2. **80 / 48 / 32 spacing rhythm** — sections 80, hero → subhead 48, subhead → intro 32. If you find yourself wanting a different gap, ask.
3. **Sentence case throughout** — never UPPERCASE / small-caps / letter-spaced labels. The design lead is firm on this.
4. **Use existing components before creating new ones** — `Hero`, `FloatingField`, `CTA Card`, `Callout`, `KPI Tile` etc. all already exist.
5. **Don't widen the body past 870** — the entire layout is calibrated for it.
6. **Don't add box-shadows or borders to "card" elements unless the Figma asks** — most surfaces are flat with subtle bg-glass fills.
7. **Page-level animations stay subtle** — the `pageEnter` keyframe (8px translateY, 0.6s) is the standard. Don't introduce flashier transitions for routine page changes.
8. **Keep the file single** — resist the urge to split index.html into modules. The whole point is portability and zero build.
9. **localStorage namespacing** — prefix all keys with `pilot.` (e.g. `pilot.theme`, `pilot.authed`).
10. **Don't push to `main` without confirming** — the live raw.githack URL deploys from `main` instantly.

---

## How to add a new page

1. **Add the page component** alongside the existing ones, following the same skeleton:
   ```jsx
   function MyNewPage({ onNav }) {
     return (
       <div className="content">
         <Hero page="my-new-page" title="My new page"/>
         {/* sections — each separated by 80px via .content's gap */}
         <NextPageCta from="my-new-page" onNav={onNav}/>
         <PageFooter/>
       </div>
     );
   }
   ```
2. **Register the route** in the `App` switch (`case 'my-new-page': view = <MyNewPage onNav={setRouteAndScroll}/>; break;`)
3. **Add a header image** to `assets/` and register it in the `HEADER` map
4. **Add to the sidebar** (`Sidebar` component) so users can navigate to it
5. **Wire the next-page CTA chain** — add an entry to `NEXT_PAGE` and update the previous page's `from` value
6. **Optional: add anchors** in `PAGE_ANCHORS[route]` if the page has multiple sections worth jumping to

---

## Known issues / outstanding

- **No backend for "Request access"** — submissions sit in localStorage. Wire up Formspree / Netlify Forms / your inbound email handler.
- **Site key is plaintext** — anyone can read `POD2026` in the JS bundle. If you need real access control, put this behind an actual auth layer (Cloudflare Access, Vercel Password Protection, etc.) and remove the gate.
- **Lottie loader is a CDN dep** — first paint of the loader can lag if the network is slow. Consider self-hosting `lottie.min.js` in `assets/` if reliability matters.
- **Old mp4 motion files** (`bg-layer.mp4`, `bg-layer-2.mp4`) are still in `assets/login/` for reference but unused after the cursor-gradient swap. Safe to delete if you want a leaner bundle.
- **Dark mode coverage** — the cursor gradient uses fixed colour stops that work in both themes. The Lottie loader has separate light/dark JSON files (`pod-loader.json`, `pod-loader-dark.json`) selected via `localStorage.pilot.theme`. If you add new components, audit them against `body.dark`.
- **`output/`-folder housekeeping** — there are unrelated changes in `output/*` from prior cleanup that aren't part of pilot-program. Don't sweep them in when committing.

---

## Deployment

The mockup is hosted via [raw.githack](https://raw.githack.com/) — no server, no Pages config, just GitHub raw content with a CDN.

### URLs

- **Dev URL** (auto-updates with `main`, ~10 min CDN cache):
  `https://raw.githack.com/bradca1n/elysium-design/main/mockups/pilot-program/index.html`
- **Pinned URL** (immutable, cached forever — best for sharing a stable preview):
  `https://rawcdn.githack.com/bradca1n/elysium-design/<commit-hash>/mockups/pilot-program/index.html`

### To publish a change

```bash
git add mockups/pilot-program/
git commit -m "Pilot Program: <what changed>"
git push origin main
```

The dev URL will pick up within ~10 minutes. For an immediate stable URL, grab the new commit hash and use the `rawcdn.githack.com/<commit-hash>/…` form.

### To re-host elsewhere

The folder is fully self-contained — drop `mockups/pilot-program/` into any static host (Netlify, Vercel, S3, GitHub Pages, etc.). The only external resources are the CDN scripts (React, Babel, Lottie) and Google Fonts. If you need fully air-gapped, vendor those locally.

---

## Where things live

Quick navigation by line ranges (commit `d92654cc`, may drift):

| What | File:line |
| ---- | --------- |
| All CSS | `index.html:14-1170` |
| Token definitions | `index.html:30-90` |
| `:root` and `body.dark` overrides | `index.html:30-90`, `index.html:840-880` |
| `.content`, `.hero`, `.lead`, `.section-title`, `.subsection-title` | `index.html:280-360` |
| `.login-*` rules | `index.html:947-1170` |
| `.cursor-gradient` rules | `index.html:1156-1158` |
| React components | `index.html:1126-end` |
| `Hero`, `Brand`, `PodLogo`, icons | `index.html:970-1115` |
| `Sidebar`, `TopBar` | `index.html:1226-…` |
| `WelcomePage`, `TermSheetPage`, `StructurePage`, `HowItWorksPage`, `FAQPage`, `PricingPage` | scattered, search by name |
| `SubPageSheet`, `ProvidesContent`, `SUB_PAGES` | search by name |
| `LoginScreen`, `RequestAccessScreen`, `LoginGate` | `index.html:2378-…` |
| `CursorGradient` | `index.html:2412-…` |
| `PodLoader` | `index.html:2515-…` |
| `App` (auth gate) and `PilotApp` (the real app) | `index.html:2535-…` |

---

## Questions

If you hit something this doc doesn't cover, the daily summary files in `elysium-design/daily-summary/` capture the day-by-day decisions made during the build — they have more colour on the *why* behind specific choices.
