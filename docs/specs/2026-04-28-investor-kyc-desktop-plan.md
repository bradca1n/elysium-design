# Investor KYC Desktop Breakpoint — Implementation Plan

> **Implementer — read this preamble first.**
> - Spec is approved at [2026-04-28-investor-kyc-desktop-design.md](2026-04-28-investor-kyc-desktop-design.md). Do **not** invoke `brainstorming`, `writing-plans`, `frontend-design`, or `implement-design` skills.
> - This is **Figma-only work** in the Product-Demo file (`T3F6A4zWXWTWoMh0gnN1YM`). No code, no tests.
> - Use the **figma-console MCP** tools (`figma_execute`, `figma_get_design_context`, `figma_clone_node`, `figma_resize_node`, `figma_get_selection`, `figma_take_screenshot`, etc.).
> - **Never** call `figma_arrange_component_set` (destructive, per persistent feedback).
> - Apply persistent feedback memories at every step:
>   - Bind to Figma variables — no raw hex/spacing values
>   - Only use font styles that already exist in the file
>   - Reuse existing components — don't reinvent
>   - Sections run horizontally, standard margins (100/50/100/50), 50px header-to-content gap
>   - Place desktop variants alongside their mobile family
> - **Per-task review gate**: Brad eyeballs in Figma, signs off, then proceed. No mid-task screenshots unless something's ambiguous.
> - Be terse. One sentence per status update.

**Goal:** Add desktop variants of the Investor KYC modal flow and the Onboarding Checklist Card, alongside the mobile counterparts in the Product-Demo Figma file.

**Architecture:** Clone mobile screens, resize to desktop dimensions (modal 640px wide, checklist card ~720px wide), reposition in a horizontal section next to the mobile family. No structural / copy / step-content changes.

**Tools:** figma-console MCP. File key: `T3F6A4zWXWTWoMh0gnN1YM`.

---

## Task 1 — Discovery

Reads only. No edits. Output: a written list of node IDs + dimensions that subsequent tasks will operate on.

- [ ] **1.1** Call `figma_search_components` to refresh node IDs (per the figma-console MCP rule that nodeIds are session-specific).

- [ ] **1.2** Locate the **Investor KYC** page in the Product-Demo file. Use `figma_get_file_data` with a search for `KYC` in page names. Record: page ID, page name.

- [ ] **1.3** Read the KYC page's contents with `figma_get_design_context` (or `figma_get_file_for_plugin` if the file is large). Identify:
  - The KYC **modal flow** screens. List each: node ID, name, current width, current height.
  - The KYC **modal section/frame** (the parent container holding the modal screens, if any).
  - Any existing desktop section on the same page (would already exist if prior work started — skip if so).

- [ ] **1.4** Locate the **Onboarding Checklist Card** at known node `970:7429`. Use `figma_get_component_details` (if it's a component) or `figma_get_design_context` on the node. Record: current width, height, host page name, position on Initial-state portfolio screen.

- [ ] **1.5** Confirm Figma file conventions still match memory:
  - Section margins (100/50/100/50)
  - 50px header-to-content gap
  - Available font styles via `figma_get_text_styles` — confirm Inter (or whatever the primary face is) variants used in mobile modal exist
  - FormControl and other shared components exist via `figma_search_components`

- [ ] **1.6** Output a short discovery report to the user listing:
  - KYC page name + ID
  - Each modal screen's node ID, name, current dimensions
  - Onboarding Checklist Card current dimensions + host page
  - Any flags (missing fonts, missing components, layout convention drift)

> **Gate:** Brad reviews the discovery report. If anything's surprising (e.g., 12 KYC steps instead of expected ~5, or modal width is unusual), pause for direction before proceeding.

---

## Task 2 — Desktop modal variants

For each mobile KYC modal screen identified in Task 1, create a 640px-wide desktop variant placed in a new horizontal section on the same KYC page.

### 2.1 Set up the desktop section

- [ ] **2.1.1** Create a new section on the KYC page titled `KYC modal — Desktop`. Use `figma_execute` to create the section programmatically (so margins/spacing are predictable), at a position to the right of the existing mobile modal section, separated by the standard horizontal gap.

- [ ] **2.1.2** Apply standard section margins (100/50/100/50) and a 50px header-to-content gap. Section runs horizontally as per the file convention.

### 2.2 Clone and resize each modal screen

For **each** mobile KYC modal screen from the discovery report, in order:

- [ ] **2.2.x.a** Clone the mobile screen with `figma_clone_node`. Place the clone inside the new Desktop section.

- [ ] **2.2.x.b** Resize the modal container to **640px wide** with `figma_resize_node`. Height: hug-contents (let the auto-layout grow naturally — do not set a fixed height).

- [ ] **2.2.x.c** Verify internal auto-layout settings: stepper centred, body fills 640px, footer split (Back left / Continue right). If any inner frames have `widthBehaviour: 'fixed'` carried over from mobile, switch to `fill-container` so they re-flow at the new width.

- [ ] **2.2.x.d** Verify all bindings are still to Figma variables (no raw values introduced by the resize). Spot-check fills, strokes, padding, gap.

- [ ] **2.2.x.e** Rename the cloned frame to match its mobile counterpart with `— Desktop` appended (e.g. `KYC / Step 1 — Desktop`).

- [ ] **2.2.x.f** Position the clone in the Desktop section using auto-layout — same arrangement order as mobile.

### 2.3 Verification (Brad's gate)

- [ ] **2.3.1** Take a screenshot of the Desktop section with `figma_take_screenshot` and surface it for review.

- [ ] **2.3.2** Confirm against the design-push checklist (from `feedback_design_push_checklist`):
  - All bindings to variables — no raw values
  - All fonts are existing styles in the file
  - All components reused — no detached instances
  - Layout matches spec (640px, stepper top, body single column, footer split)

- [ ] **2.3.3** Brad eyeballs the Desktop modal section. Sign-off → proceed. Otherwise loop on feedback.

---

## Task 3 — Onboarding Checklist Card desktop variant

- [ ] **3.1** Navigate to the Initial-state portfolio screen page (host of node `970:7429`).

- [ ] **3.2** Clone the Onboarding Checklist Card (`970:7429`). Place the clone next to the mobile version on the same page (horizontal layout).

- [ ] **3.3** Resize cloned card to **~720px wide** with `figma_resize_node`. Height hug-contents.

- [ ] **3.4** Inside the card:
  - Header (title + CTA): keep as-is, fills wider container.
  - Step list: if step rows currently stack icon above text on mobile, switch to icon-left-of-text on desktop. Confirm step nodes remain `32×32` with `cornerRadius:16` (the 10-04 fix).
  - CTA at bottom: matches mobile placement, scaled to desktop button size.

- [ ] **3.5** Rename the cloned card to `Onboarding Checklist Card — Desktop`.

- [ ] **3.6** Verify all bindings to variables. Spot-check that step icon styling, dividers, and inner padding still resolve from tokens.

- [ ] **3.7** Take a screenshot. Apply the design-push checklist (variables, fonts, components).

- [ ] **3.8** Brad reviews → sign off.

---

## Task 4 — Final pass + handover

- [ ] **4.1** Run `figma_audit_component_accessibility` on the desktop modal section and the desktop checklist card. Address any flagged issues.

- [ ] **4.2** Update the on-disk brief sheet at [brief-sheets/04-28-26](../../brief-sheets/04-28-26) — tick Priority 1 (Make KYC desktop-ready) under End of day → Done.

- [ ] **4.3** Send an ntfy notification to `elysium-design-2026` with: "KYC desktop variants landed. Modal at 640px, Checklist Card at 720px. Awaiting final review."

- [ ] **4.4** No git commit needed (Figma-only). The Figma file's own version history is the source of truth.

---

## Done criteria
- Desktop variant exists for every KYC modal step at 640px wide, in a `KYC modal — Desktop` section alongside the mobile section.
- Desktop Onboarding Checklist Card exists at ~720px, alongside its mobile counterpart on the Initial-state portfolio page.
- All bindings to Figma variables. All fonts are existing styles. All components reused, not detached.
- Brad has reviewed and signed off on both surfaces.

## Out of scope
- Investor App shell (sidebar / topbar)
- HTML mockup
- Mobile changes
- Step content / copy / validation redesigns
