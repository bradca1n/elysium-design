# Fund Creation Flow — Token & Typography Alignment

**Date:** 2026-04-07
**File:** `output/fund-creation-flow.html`
**Target:** Manager > Onboarding (Figma node 889-4682)

## Summary

Align the fund creation flow HTML mockup with canonical design tokens and typography system before pushing to Figma.

## Part 1: Token Fixes

Six CSS custom properties in `:root` use incorrect hex values.

| Variable | Current | Corrected | Source |
|---|---|---|---|
| `--bg-surface` | `#f5f5f5` | `#F8F8F8` | semantic/Light → bg/surface |
| `--bg-subtle` | `#f5f5f5` | `#F8F8F8` | semantic/Light → bg/subtle |
| `--status-positive-bg` | `#caffe8` | `#A2F1C0` | semantic/Light → status/positive-bg |
| `--status-negative-bg` | `#fee9e9` | `#FEE2E2` | semantic/Light → status/negative-bg |
| `--status-neutral-bg` | `#f5f5f5` | `#F8F8F8` | semantic/Light → status/neutral-bg |
| `--btn-primary-text` | `#f5f5f5` | `#F8F8F8` | semantic/Light → btn/primary/text |

## Part 2: Typography Alignment

### Off-scale sizes

Type scale: 10, 12, 14, 16, 18, 20, 24, 30, 36, 44, 48px.

- **13px → 12px:** `.feature-desc`, `.chip`, `.rec-row-label`, `.info-callout-text`, `.submitted-summary-label`, `.submitted-summary-value`, `.time-estimate`
- **11px → 10px:** `.rec-badge`

### Line heights (fixed px per token system)

- 10–14px text → `line-height: 18px`
- 16–18px text → `line-height: 22px`
- 20px text → `line-height: 24px`
- 30px+ → remove explicit line-height (auto)

### Font family at 3xl

Per `text-styles.json`, all weight variants at 30px use **Serrif Condensed Light**.

- `.step-heading` (30px/600) → `font-family: 'Serrif Condensed', serif; font-weight: 300`
- `.submitted-heading` (30px/600) → same

## Pipeline

1. Fix HTML code (this spec)
2. Push to Figma Manager > Onboarding page (node 889-4682)
3. Create any new Figma components
4. Push components to Storybook
