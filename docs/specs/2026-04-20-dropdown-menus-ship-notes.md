# Dropdown Menus — Ship Notes

**Date:** 2026-04-20
**Spec:** `docs/specs/2026-04-20-dropdown-menus-design.md`
**Plan:** `plans/2026-04-20-dropdown-menus.md`

## Artifacts

### Figma — Manager OS page (`553:69297`), "Dropdowns" section (`1603:291554`)

| Component | ID | Variants |
|---|---|---|
| Menu Item | `1603:291578` | `State=Default/Hover/Focus` |
| Segmented Control | `1603:291674` | `Items=2/3`, `Selected=0..n` |
| Tabs | `1603:291742` | `Items=2/3/4`, `Selected=0..n` |
| Fund Pill | `1603:291743` | single |
| Empty State | `1603:291761` | `Tab=Unread/Read/Never` |
| Notif Row | `1603:291910` | `Body=Standard/Action`, `State=Unread/Read/Hover` (6 total) |
| Account Dropdown | `1603:291953` | single |
| Notifications Dropdown | `1603:292353` | `State=Default/Empty/Scrolling` |

### React — `gluestack-ui-pro/components/custom/`
- `tabs/index.tsx`
- `segmented-control/index.tsx`
- `fund-pill/index.tsx`
- `notif-row/index.tsx`
- `account-dropdown/index.tsx`
- `notifications-dropdown/index.tsx`

### Gluestack source files modified
- `menu/index.tsx` — container + items + separator + label bound to ely tokens
- `popover/index.tsx` — container + arrow bound to ely tokens + shadow
- `avatar/index.tsx` — fallback text token
- `badge/index.tsx` — added `xs` size + `pill`/`warning`/`success` actions with ely tokens
- `button/index.tsx` — added `ghost` variant
- `divider/index.tsx` — bg token

### Token infrastructure
- `tokens/semantic/Light.tokens.json` + `Dark.tokens.json` — added `shadow.dropdown`
- Figma effect style `shadow/dropdown` created (`S:1278b48567857bca7949404a3c9e4dd87203020e,`)
- `gluestack-ui-pro/components/ui/gluestack-ui-provider/config.ts` — 16 `--ely-*` CSS vars added to both light and dark blocks
- `gluestack-ui-pro/tailwind.config.js` — `ely.*` colors, `rounded-ely-*` radii, `shadow-ely-dropdown` shadow exposed

## Known limitations / follow-up

1. **Full Tailwind token bridge deferred** — only dropdown-scoped subset (~16 tokens) is exposed. End-of-day task: expose all 124 Elysium semantic tokens as Tailwind utilities.
2. **Text-style utilities not yet added** — React components use inline `font-inter text-[px] leading-[px] font-weight` instead of named utilities. End-of-day task: generate `.text-body-sm-medium` etc. classes in `global.css` from `tokens/text-styles.json`.
3. **Fund filter popover content** — button shown in default state only; clicking does not yet open a fund-picker popover. Deferred to real data wiring.
4. **Phase 7.4 (tsc/lint)** — interrupted; should be re-run against `gluestack-ui-pro` before merge.
5. **Phase 7.1/7.2/7.3 (visual parity / dark mode / a11y smoke)** — skipped due to lack of a render environment in this session; should be checked manually before merge.
6. **Two cosmetic issues on the Account Dropdown Figma component**:
   - Avatar frame is slightly taller than wide (cornerRadius didn't produce a perfect circle inside auto-layout). Minor — adjust with `resize(40, 40)` after frame creation or change to fixed sizing.
   - "Give Feedback" label wraps to two lines inside the 40-height menu item because `layoutGrow=1` combined with `textAutoResize=WIDTH_AND_HEIGHT`. Fix by setting the label's `textAutoResize=HEIGHT` and using `primaryAxisAlignItems=SPACE_BETWEEN` on the parent, or shorten copy to "Feedback".
7. **Dark mode** tokens wired via `config.ts`, should "just work" once theme toggling is hooked up, but untested.

## How to use

### In a page
```tsx
import { AccountDropdown } from '@/components/custom/account-dropdown';
import { NotificationsDropdown } from '@/components/custom/notifications-dropdown';

<Popover>
  <AccountDropdown
    user={{ name: 'Jane Doe', org: 'Elysium Capital' }}
    theme={theme}
    onThemeChange={setTheme}
    onSelect={handleAccountAction}
  />
</Popover>

<NotificationsDropdown
  notifications={notifications}
  activeTab={tab}
  onTabChange={setTab}
  fundFilter={fundFilter}
  funds={funds}
  onFundFilterChange={setFundFilter}
  onMarkAllRead={markAll}
/>
```

### In Figma
Instances of `Account Dropdown` and `Notifications Dropdown` can be dropped on any page. Override `State` on the Notifications variant; override inner Notif Row instances to switch between Standard/Action or Unread/Read.

## Orphan cleanup
6 orphan component nodes created during failed build attempts were removed from the Manager OS page canvas. Section-scoped components remain clean.
