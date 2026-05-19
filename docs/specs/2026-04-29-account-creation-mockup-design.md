# Manager OS — Account Creation HTML Mockup

**Date:** 2026-04-29
**Author:** Brad (with Claude)
**Status:** Approved — ready for implementation
**Source:** Figma Product file `T3F6A4zWXWTWoMh0gnN1YM`, sections `1048:284414` (Account Creation) and `1051:330712` (Admin Onboarding)

## Goal
Stakeholder-reviewable HTML mockup of the Manager OS Account Creation + Admin Onboarding flow, served via raw.githack with giscus comments. Faithful to the Figma split-screen Airwallex-style design.

## Scope (15 screens)

| Section | Screens (Figma node IDs) |
|---|---|
| Account Creation | AC1 Sign up (`1048:284415`) · AC1 email (`1185:52897`) · AC2 Verify email (`1178:39966`) · AC4 Secure with phone (`1178:40037`) · AC5 Verify phone (`1178:40102`) |
| Decision | AO01 Create or join (`1742:376986`) |
| Create org track | A05 Tell us (`1048:284418`) · A06 Registered address (`1051:330230`) · A07 Admin role (`1051:330266`) |
| Join org track | J01 Find org (`1052:397325`) · J02 Matching workspaces (`1052:397360`) · J03 Request sent (`1052:397395`) |
| Accept invite track | AO02 Accept invite (`1051:330748`) · AO03 MFA method (`1051:330783`) · AO04 Invite team (`1051:330818`) |

## Design

### Pattern
Same as Manager OS v3 — React-via-Babel single page, route-based view switching, localStorage-persisted route, sticky stepper, giscus thread at bottom.

### Routing
- Linear: `AC1 → AC1-email → AC2 → AC4 → AC5 → AO01`
- AO01 branches: Create org → `A05 → A06 → A07 → AO03`, Join org → `J01 → J02 → J03` (terminal for join), Accept invite → `AO02 → AO03`
- All tracks that proceed converge at `AO03 → AO04 → done`
- (Will verify exact convergence at implementation time when reading frames.)

### Files at `mockups/account-creation/`
- `index.html` — entry HTML, App + giscus
- `components.jsx` — shared SplitScreen layout, Stepper, FormControl, Button, OTP input
- `views-account.jsx` — AC1, AC1-email, AC2, AC4, AC5
- `views-org.jsx` — AO01, A05–A07, J01–J03, AO02–AO04

### Visual treatment
Match Figma exactly: light mode default, brand colour palette from the file, Inter typography. Inline styles using CSS vars (same convention as Manager OS).

### Interactivity
Click-through only (level A). Continue advances; Back returns. Forms accept input but no validation; OTP fields visual-only. Tweaks panel includes a route picker for jumping to any screen (matches v3 pattern).

### Giscus
- `data-mapping="specific"`, `data-term="bradca1n/elysium-design/main/mockups/account-creation/index"`
- Single thread shared across `main` and all commit-hash URLs (lesson learned from manager-os-nav).

### Frame fidelity
Read each Figma frame's design context at implementation time to harvest accurate copy, field labels, microcopy. Layout structure derived from split-screen pattern + 14-04 daily summary.

## Out of scope
- Form validation, OTP-as-real-input, simulated API states (levels B/C)
- Edge states (E01/E02/E05)
- Password Recovery (F01–F04)
- Welcome panes (08/09/10)
- Admin onboarding extensions beyond the 15 listed

## Done criteria
- All 15 screens render at faithful fidelity to their Figma counterparts
- Click-through navigation works forward and back across all tracks
- Tweaks panel route picker jumps to any screen
- giscus thread visible and pinned to the shared discussion title
- Live URL works at `https://raw.githack.com/bradca1n/elysium-design/main/mockups/account-creation/index.html`
- Brad reviews and signs off
