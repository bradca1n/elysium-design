# Investor KYC — Desktop Breakpoint

**Date:** 2026-04-28
**Author:** Brad (with Claude)
**Status:** Approved — ready for implementation
**Medium:** Figma only (Product-Demo file, `T3F6A4zWXWTWoMh0gnN1YM`)

## Goal
Make the existing mobile Investor KYC flow desktop-ready by adding desktop variants of the KYC modal and the Onboarding Checklist Card. No structural changes to flow, copy, or step content — width + scale only.

## Scope
| In | Out |
|----|-----|
| KYC multi-step modal — desktop variant | Investor App shell (sidebar / topbar) |
| Onboarding Checklist Card — desktop variant (lives on Initial-state portfolio screen) | Mobile changes |
| Placement in Figma alongside mobile counterparts | Step content / copy / validation redesign |
| | HTML mockup |

## Design

### 1. KYC modal — desktop
- **Width:** 640px content area, centred on a dimmed full-page backdrop spanning the whole frame.
- **Stepper:** preserved at top, centred — same component as mobile.
- **Body:** single column, form/content fills the 640px width. Existing FormControl component at desktop scale.
- **Footer:** sticky inside the modal, split layout — Back left, Continue right.
- **Backdrop click:** dismisses (same behaviour as mobile).
- **Structure:** same number of steps, same copy, same order — this is a width + scale variant only.

### 2. Onboarding Checklist Card — desktop
- **Width:** ~720px (dashboard main content column at desktop).
- **Layout:** vertical structure preserved (header → step list → CTA). Horizontal breathing in step rows where mobile stacks (icon left of text).
- **Step nodes:** 32×32 fixed, `cornerRadius:16` (per 10-04 fix — already correct on mobile).
- **Card placement:** Initial-state portfolio screen, desktop position, same role as mobile.

### 3. Figma placement
- Desktop modal variants → on the same KYC page as mobile, in a horizontal section per the file's layout norm.
- Desktop Onboarding Checklist Card → next to the mobile variant on its current page.
- Standard section margins (100/50/100/50), 50px header-to-content gap.

## Verify-at-implementation-time
Before moving pixels, confirm in Figma:
- Exact mobile modal width (assumed ~360px)
- Number of KYC steps and any per-step quirks
- Onboarding Checklist Card current dimensions and host page
- Section conventions still match memory (horizontal sections, standard margins, font styles available)

## Done criteria
- Desktop modal variants exist for every mobile KYC step, at 640px width
- Desktop Onboarding Checklist Card exists at ~720px width on Initial-state portfolio
- All bindings to Figma variables (no raw values per `feedback_figma_push_tokens`)
- Only Figma fonts used (per `feedback_figma_fonts`)
- Components reused where they exist (per `feedback_design_push_checklist`)
- Brad reviews and signs off
