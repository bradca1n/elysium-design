## Claude Code Activity

### Day Summary
Major component architecture and design system session. Built the Modal & Sheet system from scratch, rebuilt Input/Select as FormControl components matching gluestack-ui-pro, fixed the Share Class creation form, and created visual flow diagrams for both Investor and Manager apps.

### Task 1: Modal & Sheet Component System
- Built 4-variant component set (Mobile Modal, Desktop Modal, Mobile Sheet, Desktop Sheet) with instance swap for body content
- Created Button Circle components for back/close navigation
- Added boolean toggles: Show Back, Show Title, Show Close
- Created `bg/overlay` semantic token for scrim
- Extracted 6 slot content components from old sheet variants (Order Processing, Top Up, Bank Transfer, Send Stablecoins, Amount Input, Confirm Transfer)
- All token-bound, text styles linked, design system icons

### Task 2: FormControl / Input & Select Components
- Built FormControl / Input (48 variants: Outlined/Underlined/Rounded × sm/md/lg/xl × Default/Focused/Invalid/Disabled)
- Built FormControl / Select (48 variants, same matrix)
- Each variant includes toggleable Label (Text-medium/xs) and Hint text (Text-normal/xs)
- Text properties for Label, Hint, and Placeholder
- Replaced old Input (72 variants) and Select (90 variants) component sets
- Created Toggle component (On/Off variants)
- All values token-bound, all text linked to file text styles

### Task 3: Share Class Creation Form
- Rebuilt form using new FormControl / Input and Select instances
- Matched live site structure: Identity, Income treatment (pill buttons), Currency & Hedging (stacked), Fees (two-column), Dealing & Liquidity (compound fields with unit selects), Advanced (toggle + fields)
- Zero hardcoded values, zero wrong fonts, zero raw frames
- Assembled in Desktop Sheet component with overlay

### Task 4: Visual Flow Diagrams
- Created Flow Container component for screen thumbnails
- Built Investor App flows (3): Log in, View & subscribe to fund, Add cash
- Built Manager OS flows (4): Log in, Invite investor, Check Fund & share classes, Add new share class
- All flows use real screen screenshots from the design file
- Greyed wireframe placeholders for screens not yet designed
- Each flow wrapped in its own section

### Components Created/Modified
- Modal & Sheet (component set, 4 variants)
- Slot Placeholder (component)
- 7 Slot Content components
- FormControl / Input (component set, 48 variants)
- FormControl / Select (component set, 48 variants)
- Toggle (component set, 2 variants)
- Button Circle (existing, used)
- Flow Container (Brad created, used for flows)

### Tokens Created
- `bg/overlay` — semi-transparent overlay for modals/sheets

### Key Learnings & Feedback Saved
- Always send ntfy notifications proactively when user steps away
- Standard section layout: margins 100/50/100/50, 50px header-to-content gap
- Only use font styles from the Figma file (Inter Regular, Inter Medium, Serrif Condensed Light)
- Mandatory design push checklist: tokens, fonts, text styles, components — verify before every completion claim
- Always scan for component matches after code-to-Figma imports

### Carry Forward
- Task 5: Check component naming across Global, Investor, Manager libraries
- Task 6: iPhone 16 mockup plugin research
- Apply circle close button to live HTML (Share Class creation)
