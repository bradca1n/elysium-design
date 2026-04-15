# Fund Creation Flow — Token & Typography Alignment Plan

> **For agentic workers:** REQUIRED: Use superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Align `output/fund-creation-flow.html` with canonical design tokens and typography system.

**Architecture:** Single-file CSS edit. Correct 6 token values in `:root`, snap off-scale font sizes to the type scale, fix line heights to use fixed px values, and switch 30px headings to Serrif Condensed.

**Tech Stack:** HTML/CSS (static file)

**Spec:** `docs/superpowers/specs/2026-04-07-fund-creation-flow-token-alignment.md`

---

## Chunk 1: All Changes

### Task 1: Fix token hex values in `:root`

**Files:**
- Modify: `output/fund-creation-flow.html:14-16,19-20,39`

- [ ] **Step 1: Correct the 6 wrong CSS custom properties**

Replace in `:root`:
```css
/* BEFORE → AFTER */
--bg-surface:          #f5f5f5;    → --bg-surface:          #F8F8F8;
--bg-subtle:           #f5f5f5;    → --bg-subtle:           #F8F8F8;
--status-positive-bg:  #caffe8;    → --status-positive-bg:  #A2F1C0;
--status-negative-bg:  #fee9e9;    → --status-negative-bg:  #FEE2E2;
--status-neutral-bg:   #f5f5f5;    → --status-neutral-bg:   #F8F8F8;
--btn-primary-text:    #f5f5f5;    → --btn-primary-text:    #F8F8F8;
```

- [ ] **Step 2: Verify in browser**

Open `output/fund-creation-flow.html` in browser. Check:
- Surface/subtle backgrounds are slightly lighter
- Positive status bg (stepper completed circles, submitted icon) is now a more saturated mint green
- Button text still reads clearly

---

### Task 2: Add Serrif Condensed font import

**Files:**
- Modify: `output/fund-creation-flow.html:9` (Google Fonts link area)

- [ ] **Step 1: Add Serrif Condensed to font imports**

After the existing Inter import, add:
```html
<link href="https://fonts.googleapis.com/css2?family=DM+Serif+Display&display=swap" rel="stylesheet">
```

Note: "Serrif Condensed" is a custom/local font. If not available via Google Fonts, add a CSS `@font-face` or use the closest available serif. Check if the font is installed locally — if so, just reference it in font-family and it will work in the HTML preview. The Figma file will handle the actual font binding.

- [ ] **Step 2: Add font-family CSS variable to `:root`**

```css
--font-body: 'Inter', sans-serif;
--font-display: 'Serrif Condensed', serif;
```

Update `body` rule to use `var(--font-body)`.

---

### Task 3: Fix heading typography (30px → Serrif Condensed)

**Files:**
- Modify: `output/fund-creation-flow.html` — `.step-heading` (~line 262), `.submitted-heading` (~line 699)

- [ ] **Step 1: Update `.step-heading`**

```css
/* BEFORE */
.step-heading {
  font-size: 30px;
  font-weight: 600;
  color: var(--text-primary);
  letter-spacing: -0.5px;
  line-height: 1.2;
  margin-bottom: var(--space-8);
}

/* AFTER */
.step-heading {
  font-size: 30px;
  font-weight: 300;
  font-family: var(--font-display);
  color: var(--text-primary);
  letter-spacing: -0.5px;
  margin-bottom: var(--space-8);
}
```

- [ ] **Step 2: Update `.submitted-heading`**

```css
/* BEFORE */
.submitted-heading {
  font-size: 30px;
  font-weight: 600;
  text-align: center;
  color: var(--text-primary);
  margin-bottom: var(--space-8);
}

/* AFTER */
.submitted-heading {
  font-size: 30px;
  font-weight: 300;
  font-family: var(--font-display);
  text-align: center;
  color: var(--text-primary);
  margin-bottom: var(--space-8);
}
```

---

### Task 4: Snap off-scale font sizes

**Files:**
- Modify: `output/fund-creation-flow.html` — multiple CSS rules

- [ ] **Step 1: Change all 13px to 12px**

These selectors currently use `font-size: 13px` — change to `12px`:
- `.feature-desc` (~line 304)
- `.chip` (~line 467)
- `.rec-row-label` (~line 649)
- `.info-callout-text` (~line 799)
- `.submitted-summary-label` (~line 733)
- `.submitted-summary-value` (~line 734)
- `.time-estimate` (~line 309)
- `.stepper-circle` (~line 184) — uses 13px, snap to 12px

- [ ] **Step 2: Change 11px to 10px**

- `.rec-badge` (~line 622) — `font-size: 11px` → `font-size: 10px`

---

### Task 5: Fix line heights to fixed px values

**Files:**
- Modify: `output/fund-creation-flow.html` — multiple CSS rules

- [ ] **Step 1: Fix line heights on text ≤14px → 18px**

Update these rules to use `line-height: 18px`:
- `.stepper-title` (14px) — currently `line-height: 1.4` → `18px`
- `.stepper-desc` (12px) — currently `line-height: 1.4` → `18px`
- `.feature-desc` (now 12px) — currently `line-height: 1.4` → `18px`
- `.card-select-desc` (12px) — no explicit line-height, add `line-height: 18px`
- `.chip` (now 12px) — no explicit line-height, inherits body 1.5 → add `line-height: 18px`
- `.form-label` (14px) — no explicit line-height → add `line-height: 18px`
- `.form-hint` (12px) — no explicit line-height → add `line-height: 18px`
- `.rec-row-label` (now 12px) — no explicit line-height → add `line-height: 18px`
- `.rec-row-value` (14px) — no explicit line-height → add `line-height: 18px`
- `.rec-badge` (now 10px) — no explicit line-height → add `line-height: 18px`
- `.derived-tag` (10px) — no explicit line-height → add `line-height: 18px`
- `.info-callout-text` (now 12px) — currently `line-height: 1.5` → `18px`
- `.time-estimate` (now 12px) — no explicit line-height → add `line-height: 18px`
- `.btn` (14px) — no explicit line-height → add `line-height: 18px`

- [ ] **Step 2: Fix line heights on 16px text → 22px**

- `.step-subheading` (16px) — currently `line-height: 1.5` → `22px`
- `.rec-section-title` (16px) — no explicit line-height → add `line-height: 22px`
- `.submitted-desc` (16px) — currently `line-height: 1.5` → `22px`

- [ ] **Step 3: Fix line heights on 20px text → 24px**

- `.navbar-logo` (20px) — no explicit line-height → add `line-height: 24px`

---

### Task 6: Visual verification

- [ ] **Step 1: Open in browser and walk through all 8 steps**

Check each screen for:
- Headings render in Serrif Condensed Light (or fallback serif)
- No text feels cramped (line-height changes)
- Status badges/chips/pills still look balanced with 12px instead of 13px
- Positive-bg green is more saturated (mint → green)
- Surface backgrounds slightly lighter

- [ ] **Step 2: Commit**

```bash
git add output/fund-creation-flow.html docs/superpowers/specs/2026-04-07-fund-creation-flow-token-alignment.md docs/superpowers/plans/2026-04-07-fund-creation-token-alignment.md
git commit -m "fix: align fund creation flow with canonical design tokens and typography"
```
