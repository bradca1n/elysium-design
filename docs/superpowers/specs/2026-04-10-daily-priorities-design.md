# Daily Priorities — 2026-04-10

**Date:** 2026-04-10
**Project:** Elysium
**Figma file:** Product Demo (T3F6A4zWXWTWoMh0gnN1YM)

## Priority 1: Storybook Input & Select — Filled State

### Summary

Both `FormControl / Input` (602:22870) and `FormControl / Select` (602:23207) gained a new "Filled" state in Figma. 12 new variants each — across all style variants (Outlined, Underlined, Fill/Rounded) and sizes (sm, md, lg, xl). Update the Storybook components to match.

### Scope

- Extract exact Filled state styling from Figma (text color, border, background tokens)
- Update `Elysium/packages/app/components/ui/input/index.tsx` to support Filled state
- Update `Elysium/packages/app/components/ui/select/index.tsx` to support Filled state
- Add Storybook stories for Filled state variants
- Visual validation against Figma screenshots

### Figma references

- Data Input section: node 638:114374
- Input Filled variants: 923:54290–923:54353
- Select Filled variants: 936:10874–936:10951

---

## Priority 2: Token JSON Update

### Summary

Pull latest design variables from the Product Demo Figma file and update the token JSON files. Diff against existing files to identify new or changed tokens.

### Scope

- Extract current variables from Figma via MCP
- Diff against `elysium-design/tokens/` (base, primitive Light, semantic Light/Dark, text-styles)
- Update changed/new tokens in `elysium-design/tokens/`
- Sync to `Elysium/packages/app/tokens/`

### Figma references

- Global components page: node 553:69298

---

## Priority 3: Portfolio Initial & Verified States

### Summary

Design two new portfolio screen states for the investor app, sitting alongside the existing Active state (961:2503). These represent the investor journey from account creation through KYC verification to active investing.

### Three-state flow

1. **Initial** — pre-KYC, account just created
2. **Verified** — KYC complete, ready to invest but no holdings yet
3. **Active** — existing design (961:2503), has holdings and activity

### Initial State (new frame)

- **Header:** avatar + @username + utility icons (reuse existing header pattern)
- **Balance:** $0.00 using PortfolioValueDisplay or equivalent
- **"Get ready to Invest" heading**
- **Checklist card** (new component):
  - Rounded card container
  - Row 1: green numbered circle (1) + "Portfolio created" + "You're in!" subtext + check icon — completed
  - Row 2: green numbered circle (2) + "Verify your identity" + friendly subtext + chevron — actionable
- **"Pending invitations" heading**
- **Fund invitation tile:** fund logo + name + class + NAV + performance, with lock overlay
- **"Invited by [Manager Name]"** subtext below tile

### Verified State (new frame)

- **Header:** same as Initial
- **Balance:** $0.00
- **No checklist card** — removed after verification
- **"Pending invitations" section:** same fund tile, now unlocked and tappable
- **Empty chart** placeholder
- **Empty "Holdings"** section with empty state message
- **Empty "Pending Orders"** section with empty state message

### New components

1. **Onboarding Checklist Card** — step rows with completed/actionable states
2. **Lock overlay** — semi-transparent overlay with lock icon for fund tiles
3. **Empty state messages** — for chart, holdings, pending orders sections (check if these already exist)

### Design rules

- All values bound to design tokens (no raw hex/px)
- Use existing text styles from the Figma file
- Use existing components where possible (header, fund tile, chart, etc.)
- Place frames on Widgets > Investor App page alongside existing Active state

### References

- Wireframe: node 965:3901
- MoonPay reference: node 961:2729
- Active state (existing): node 961:2503
