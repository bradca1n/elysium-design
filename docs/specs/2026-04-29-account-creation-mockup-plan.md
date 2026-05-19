# Account Creation Mockup — Implementation Plan

> **Implementer — read first.**
> - Spec at [2026-04-29-account-creation-mockup-design.md](2026-04-29-account-creation-mockup-design.md). Approved.
> - Do **not** invoke `brainstorming`, `writing-plans`, `frontend-design`, `implement-design`. Execute directly.
> - Pattern reference: `mockups/manager-os-nav/index.html` + `components.jsx` + `views-*.jsx` (React-via-Babel single page).
> - Use figma-console MCP `figma_execute` to read frames. **Read each of the 15 frames ONCE during Task 1 discovery; don't re-read later.**
> - Per-task review gate: Brad opens the local mockup, signs off, then proceed.
> - Be terse. One commit per task. Push at the end.

**Goal:** Stakeholder-reviewable HTML mockup of the Manager OS Account Creation + Admin Onboarding flow at `mockups/account-creation/`, served via raw.githack with a giscus thread.

**Architecture:** React-via-Babel (no build step). Single `index.html` loads `components.jsx` + 2 view files. Routes stored in `localStorage`, switched via React state. Each screen = 1 split-screen frame (left = brand/illustration/stepper, right = form panel). Giscus block at bottom, mapping=specific so all commit-hash URLs share one thread.

**Tech:** React 18 (UMD), Babel Standalone, inline styles using CSS custom properties. No bundler, no test suite.

**Source spec:** [2026-04-29-account-creation-mockup-design.md](2026-04-29-account-creation-mockup-design.md)

---

## Conventions
- Files at `mockups/account-creation/`. New folder.
- All inline styles must use `var(--*)` tokens — define palette in `index.html` `:root`.
- Reuse helpers from Manager OS where they fit (Stepper, FormControl). Don't import — copy + adapt to keep self-contained.
- Mock data: invent plausible content for fund/manager names. Stay consistent with POD Crypto Fund context.
- Browser-check after each task is the acceptance gate. Open `mockups/account-creation/index.html` in a browser.

---

## Task 1 — Discovery (Figma reads, no code)

Goal: harvest accurate copy + field structure for all 15 frames in one batch so subsequent tasks are mechanical.

- [ ] **1.1** Use `figma_execute` to read each of the 15 frames. Single batched call returning, for each frame:
  - Node ID + name
  - Dimensions
  - Left pane content: title text, body text, illustration/icon node
  - Right pane content: heading, sub-heading, all field labels + placeholders, button labels
  - Stepper text if present
  - Any microcopy (helper text, error placeholders, footer links)

  Frames (in routing order):
  - AC1 Sign up `1048:284415`
  - AC1 email `1185:52897`
  - AC2 Verify email `1178:39966`
  - AC4 Secure with phone `1178:40037`
  - AC5 Verify phone `1178:40102`
  - AO01 Create or join `1742:376986`
  - A05 Tell us about your organisation `1048:284418`
  - A06 Registered address `1051:330230`
  - A07 Admin role `1051:330266`
  - J01 Find your organisation `1052:397325`
  - J02 Workspaces matching `1052:397360`
  - J03 Request sent `1052:397395`
  - AO02 Accept invite `1051:330748`
  - AO03 MFA method `1051:330783`
  - AO04 Invite team `1051:330818`

- [ ] **1.2** Also harvest the brand colour palette + key typography settings from one frame (any will do; they share tokens). Look for: bg-canvas, bg-surface, accent, ink-1/2/3, line-1/2, pos/neg.

- [ ] **1.3** Write the harvested data inline as JS objects at the top of each view file at scaffold time (Task 3). For Task 1, just dump the discovery output to chat so Brad can sanity-check it before code is written.

- [ ] **1.4** **Gate:** Brad reviews the discovery report. If anything's missing or surprising, fix Task 1 before moving on.

---

## Task 2 — Scaffold

**Files:**
- Create: `mockups/account-creation/index.html`
- Create: `mockups/account-creation/components.jsx`
- Create: `mockups/account-creation/views-account.jsx` (skeleton only)
- Create: `mockups/account-creation/views-org.jsx` (skeleton only)

### 2.1 `index.html`
- Copy the structure from `mockups/manager-os-nav/index.html` as a base
- Strip the dark mode + tweaks panel down to: light mode only, route picker only (8 routes for the linear AC flow + 7 for the org tracks)
- Inject the brand palette discovered in Task 1.2 into `:root`
- Wire up giscus with `data-mapping="specific"` and `data-term="bradca1n/elysium-design/main/mockups/account-creation/index"`
- Script tags load `components.jsx`, `views-account.jsx`, `views-org.jsx` in order
- App component reads `mos.account-creation.route` from localStorage, defaults to `'ac1'`
- App routes:
  ```
  ac1 → AC1View
  ac1-email → AC1EmailView
  ac2 → AC2View
  ac4 → AC4View
  ac5 → AC5View
  ao1 → AO01View
  a05 → A05View
  a06 → A06View
  a07 → A07View
  j01 → J01View
  j02 → J02View
  j03 → J03View
  ao2 → AO02View
  ao3 → AO03View
  ao4 → AO04View
  ```

### 2.2 `components.jsx`
Define + register globals:
- `SplitScreen({ left, right })` — full-height 50/50 split, max-width 1440 centred. Left pane has a fixed background colour from brand palette; right pane is white.
- `Stepper({ steps, current })` — horizontal pill row with current step highlighted. Sits at top of right pane.
- `FormControl({ label, helper, children })` — wraps an input with label above + helper below.
- `TextInput({ value, onChange, placeholder, type })` — basic input. Accepts input but no validation.
- `OtpInput({ length, value, onChange })` — 6 boxes side-by-side; click-through only, no real digit handling needed at this phase. Visual fidelity only.
- `Button({ variant, onClick, children })` — primary | secondary | text variants. Match brand.
- `BackBtn({ onClick })` — circle icon button, top-left of right pane.

### 2.3 `views-account.jsx` skeleton
Define `AC1View`, `AC1EmailView`, `AC2View`, `AC4View`, `AC5View` as empty stubs returning `<SplitScreen left={...} right={<div>AC1</div>} />`. Register globals.

### 2.4 `views-org.jsx` skeleton
Same for `AO01View`, `A05View`, `A06View`, `A07View`, `J01View`, `J02View`, `J03View`, `AO02View`, `AO03View`, `AO04View`.

- [ ] **2.5 Browser check** — open `mockups/account-creation/index.html`. Should render an empty split-screen, switching via the route picker. Giscus loads at the bottom.

- [ ] **2.6 Commit**
  ```bash
  git add mockups/account-creation/
  git commit -m "Account Creation mockup: scaffold (index, components, view skeletons, giscus)"
  ```

---

## Task 3 — Account Creation views (AC1–AC5)

**File:** `mockups/account-creation/views-account.jsx`

For each of AC1, AC1-email, AC2, AC4, AC5:

- [ ] **3.x.a** Replace stub with real implementation using harvested copy from Task 1.1. Structure:
  - Left pane: brand panel (heading + body + illustration if any, plus the stepper if applicable)
  - Right pane: BackBtn + form (FormControl + inputs) + Button(s)
- [ ] **3.x.b** Continue button → `onNav('<next-route>')`. Back button → `onNav('<prev-route>')`.
- [ ] **3.x.c** For AC2 and AC5 (verification screens), use `<OtpInput length={6} />` placeholder.

- [ ] **3.6 Browser check (Brad's gate)** — walk through AC1 → AC1-email → AC2 → AC4 → AC5 forward and back. Sign-off.

- [ ] **3.7 Commit**
  ```bash
  git add mockups/account-creation/views-account.jsx
  git commit -m "Account Creation mockup: AC1–AC5 screens (sign up + verify email + phone steps)"
  ```

---

## Task 4 — Decision + Create org track (AO01, A05–A07)

**File:** `mockups/account-creation/views-org.jsx`

- [ ] **4.1 AO01 Create or join** — three Action Row cards (per 14-04 summary). Each routes to: `a05` (create), `j01` (join), `ao2` (accept invite).

- [ ] **4.2 A05 Tell us** — fund / organisation form (name, type, country). Stepper shows 1/3.

- [ ] **4.3 A06 Registered address & compliance** — address form. Stepper 2/3.

- [ ] **4.4 A07 Admin role** — role picker (FormSelect with open dropdown per 14-04 summary, using Action Row–style menu items). Stepper 3/3. Continue → `ao3`.

- [ ] **4.5 Browser check (Brad's gate)** — AC5 → AO01 → A05 → A06 → A07. Sign-off.

- [ ] **4.6 Commit**
  ```bash
  git add mockups/account-creation/views-org.jsx
  git commit -m "Account Creation mockup: AO01 decision + Create org track (A05–A07)"
  ```

---

## Task 5 — Join org track (J01–J03)

**File:** `mockups/account-creation/views-org.jsx` (extend)

- [ ] **5.1 J01 Find your organisation** — work-email input (Slack-style). Continue → `j02`.

- [ ] **5.2 J02 Matching workspaces** — list of mock orgs as Action Row components. Each row has a "Request to join" Button. Click → `j03`.

- [ ] **5.3 J03 Request sent** — confirmation screen with success illustration. Single CTA "Done" → could route back to start, or to a thank-you state. Per spec, this is terminal for the Join track.

- [ ] **5.4 Browser check (Brad's gate)** — AO01 → J01 → J02 → J03. Sign-off.

- [ ] **5.5 Commit**
  ```bash
  git add mockups/account-creation/views-org.jsx
  git commit -m "Account Creation mockup: Join org track (J01–J03)"
  ```

---

## Task 6 — Accept invite track + convergence (AO02–AO04)

**File:** `mockups/account-creation/views-org.jsx` (extend)

- [ ] **6.1 AO02 Accept invite** — split-screen confirmation of invite (org name, role, inviter). Continue → `ao3`.

- [ ] **6.2 AO03 MFA method** — radio cards: Authenticator app · SMS · Recovery codes. Continue → `ao4`.

- [ ] **6.3 AO04 Invite your team** — multi-input field (email rows). Skip + Continue both route to a "done" terminal state.

- [ ] **6.4 Verify convergence** — A07 (Continue), AO02 (Continue) both correctly route into AO03. Confirm during Brad's gate.

- [ ] **6.5 Browser check (Brad's gate)** — AO01 → AO02 → AO03 → AO04. Also retest: AO01 → A05 → A06 → A07 → AO03 → AO04. Sign-off.

- [ ] **6.6 Commit**
  ```bash
  git add mockups/account-creation/views-org.jsx
  git commit -m "Account Creation mockup: Accept invite track + AO03/AO04 convergence"
  ```

---

## Task 7 — Final pass + push

- [ ] **7.1 Cross-flow review** — walk every route in the route picker. Confirm:
  - Each screen renders without console errors
  - Stepper matches frame's stepper (1/3, 2/3, 3/3 etc.)
  - Back / Continue buttons go where they should
  - Giscus thread renders and persists across routes
  - Brand colours match the Figma source on each screen

- [ ] **7.2 Push**
  ```bash
  git push origin main
  ```

- [ ] **7.3 Verify live** — wait ~30s, hard-reload `https://raw.githack.com/bradca1n/elysium-design/main/mockups/account-creation/index.html`. Confirm renders + comments thread loads.

- [ ] **7.4 ntfy** —
  ```bash
  curl -s -H "Title: Account Creation mockup live" -d "15 screens across AC + Org tracks. URL: https://raw.githack.com/bradca1n/elysium-design/main/mockups/account-creation/index.html. Awaiting review." https://ntfy.sh/elysium-design-2026
  ```

---

## Done criteria
- All 15 screens render with copy harvested from Figma source
- Click-through routing forward + back across all three org tracks
- Tweaks panel route picker jumps to any screen
- Giscus thread visible, mapped to specific term, single thread across commit-hash URLs
- Live URL works
- Brad has signed off on each section gate

## Out of scope
- Form validation, OTP-as-real-input, simulated API states
- Edge states (E01/E02/E05)
- Password Recovery (F01–F04)
- Welcome panes (08/09/10)
- Dark mode / theme variants
