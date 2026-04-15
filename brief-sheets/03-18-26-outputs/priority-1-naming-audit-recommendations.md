# Component Naming & Organization Audit — Completed

Based on review of `elysium-design/prompts/component-naming-audit.md` (audited 2026-03-17).
Executed 2026-03-18.

---

## Completed

### P0 — Fixed Immediately
- [x] Fixed typo `Status=Negaative` → `Status=Negative` on Performance Card variant (Manager OS)
- [x] Deleted 2 orphaned `Slot / Invite Investor` components from Global page
- [x] Deleted 4 orphaned `Selected=true/false` loose components from Investor App flow page

### P1 — Misnamed Components
- [x] Renamed `Table` → `Order Summary` (Investor App) + section `Table (Mobile)` → `Order Summary (Mobile)`
- [x] Renamed `PerfCard` → `Performance Card` (Manager OS)
- [x] Renamed `Selection` → `Fund List Dropdown` (Manager OS)

### P2 — Casing Fixes
- [x] `KPI tile` → `KPI Tile` (Global)
- [x] `Data field` → `Data Field` (Investor App)
- [x] `News row` → `News Row` (Manager OS)
- [x] `Order tile, Row` → `Order Tile Row` (Investor App)
- [x] `AlertDialog` → `Alert Dialog` (Global)
- [x] `Fund selector` → `Fund Selector` (Manager OS)
- [x] `Risk indicator` → `Risk Indicator` (Investor App)
- [x] `Header` → `Screen Header` (Investor App, Sheet Mobile section — resolved ambiguity with `Sheet Header`)

### Generalization — Removed KYC Prefix
- [x] `KYC Radio Card` → `Radio Card`
- [x] `KYC Step Item` → `Step Item`
- [x] `KYC Address Row` → `Address Row`
- [x] `KYC Code Digit` → `OTP Digit`
- [x] `KYC Country Code` → `Country Code`
- [x] `KYC Checklist Item` → `Checklist Item`
- [x] `KYC Nav Bar` → `Top Nav Bar` (done earlier — also added Show Title/Back/Close toggle properties)

### Section Reorganization
- [x] `Navigation` section (Investor App) → `Onboarding Components` (contents are form/onboarding components, not navigation)
- [x] `Slot Content` section (Global) — organized with subtitles: Default, Transactions, Invite Investor, Share Class, Auth / Login
- [x] `Social Buttons` section created next to `Buttons` on Global page

### P3 — Button Circle Merge (Pending)
- [ ] Two `Button Circle` component sets still exist in Global > Button Circle section
  - Set 1 (`602:57950`): `Size=lg`, `Size=sm`
  - Set 2 (`602:57954`): `Size=Default`, `Size=sm`
  - Both are actively used (Back/Close buttons in Top Nav Bar and Modal & Sheet)
  - **Recommendation:** Merge into single set with `Size=lg / Size=Default / Size=sm` — but requires careful instance migration to avoid breaking references
  - **Status:** Awaiting sign-off before executing

---

## Summary

| Category | Items | Status |
|---|---|---|
| Typo fixes | 1 | Done |
| Orphan cleanup | 6 components | Done |
| Misnamed components | 3 | Done |
| Casing fixes | 8 | Done |
| KYC generalization | 7 | Done |
| Section reorganization | 3 | Done |
| Button Circle merge | 1 | Pending approval |
| **Total** | **29 items** | **28 done, 1 pending** |
