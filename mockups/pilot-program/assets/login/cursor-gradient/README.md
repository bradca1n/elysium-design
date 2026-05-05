# Cursor-Following Radial Gradient

A full-bleed radial gradient background that follows the cursor with a soft trailing lag. Vanilla HTML/CSS/JS, no dependencies.

## Files

- `index.html` — entry point, open this in a browser
- `cursor-gradient.css` — all styling (gradient color stops, layout)
- `cursor-gradient.js` — cursor tracking + animation loop
- `README.md` — this file

## Quick start

Open `index.html` in any modern browser. Move your cursor (or finger on touch devices). The dark core eases toward your position with a gentle drift.

## Customising

**Color stops** — edit the `radial-gradient(...)` block in `cursor-gradient.css`. Each stop is `<color> <percent>` from the cursor outward.

**Lag amount** — change the `SMOOTHING` constant at the top of `cursor-gradient.js`:
- `0.06` — heavy, dreamy drift
- `0.12` — current default, gentle drift
- `0.25` — snappy tracking
- `1.0` — 1:1 with the cursor, no lag

**Show the OS cursor** — remove `cursor: none;` from the `html, body` rule in `cursor-gradient.css`.

**Remove the hint label** — delete the `<div class="hint">` element in `index.html` and the `.hint` rules in the CSS.

## Accessibility

The gradient is decorative and marked `aria-hidden="true"`. The script honours `prefers-reduced-motion: reduce` by snapping to the cursor position without animation.

## Browser support

Works in any browser that supports CSS custom properties and `requestAnimationFrame` (every browser from the last decade).
