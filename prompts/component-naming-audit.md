# Component Library Naming Audit

Audit of Global, Investor App, and Manager OS component libraries.
Conducted 2026-03-17.

---

## Misnamed Components

| Page | Current Name | Issue | Suggested Name |
|---|---|---|---|
| Investor App | `Table` (in "Table (Mobile)" section) | Not a table — it's an order summary card showing amount, NAV, units, share class details, and disclaimer text | `Order Summary` |
| Manager OS | `PerfCard` | Abbreviated, inconsistent with other fully-named components | `Performance Card` |

**Section rename:** `Table (Mobile)` section should be renamed to `Order Summary (Mobile)` to match.

---

## Typos

| Page | Component | Current Value | Fix |
|---|---|---|---|
| Manager OS | `PerfCard` variant | `Status=Negaative` | `Status=Negative` |

---

## Inconsistent Casing

All component names should use Title Case to match the majority of the library.

| Page | Current | Should Be |
|---|---|---|
| Global | `KPI tile` | `KPI Tile` |
| Investor App | `Data field` | `Data Field` |
| Manager OS | `News row` | `News Row` |
| Investor App | `Order tile, Row` | `Order Tile Row` (also remove comma) |

---

## Duplicate Components

| Page | Section | Issue | Action |
|---|---|---|---|
| Global | Button Circle | Two `Button Circle` component sets in the same section. One has variants `Size=lg / Size=sm`, the other `Size=Default / Size=sm`. | Merge into a single component set with `Size=lg / Size=Default / Size=sm` variants. |

---

## Orphaned Components (outside sections)

These sit directly on the Global components page canvas with no parent section.

| Component | Issue | Action |
|---|---|---|
| `Slot / Invite Investor Step 1` | Leftover from earlier build attempt | Delete |
| `Slot / Invite Investor Visibility` | Same — orphan duplicate | Delete |

---

## Ambiguous / Vague Names

| Page | Section | Current Name | Issue | Suggested Name |
|---|---|---|---|---|
| Investor App | Sheet (Mobile) | `Header` | Generic name, sits alongside `Sheet Header` in the same section — unclear which is which | `Screen Header` (or delete if redundant with `Sheet Header`) |
| Manager OS | Navigation Components | `Selection` | Vague — it's a fund list dropdown panel showing fund items | `Fund List Dropdown` |

---

## Summary Checklist

- [ ] Rename `Table` → `Order Summary` (Investor App) + rename section
- [ ] Rename `PerfCard` → `Performance Card` (Manager OS)
- [ ] Fix typo `Negaative` → `Negative` on Performance Card variant
- [ ] Title-case: `KPI tile`, `Data field`, `News row`, `Order tile, Row`
- [ ] Merge duplicate `Button Circle` component sets
- [ ] Delete 2 orphaned slot components on Global page
- [ ] Rename or remove ambiguous `Header` in Sheet (Mobile) section
- [ ] Rename `Selection` → `Fund List Dropdown`
