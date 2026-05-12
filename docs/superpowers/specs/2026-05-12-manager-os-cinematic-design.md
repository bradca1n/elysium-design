# Manager OS Cinematic — Design Spec

**Date:** 2026-05-12
**Owner:** Brad
**Output:** 15s, 1920×1080, 60fps cinematic video of the Manager OS Overview dashboard, captured frame-perfect via Playwright + GSAP timeline scrubbing, encoded to MP4 (web) and ProRes 422 HQ (editing).

## Goal

Produce a loopable product cinematic that demonstrates the core Manager OS workflow in a single scene on the Overview route:

1. Establish the dashboard
2. Zoom to the Performance chart and cycle 3 timeframes (1M → 3M → 1Y), with the portfolio-return headline ticking on each change
3. Pan to the "+ Add share class" CTA in the page header
4. Click it; the create sidesheet slides in
5. Tight zoom on the sheet; typewriter-fill hero fields (Class B + fee tier + mgmt/perf fees + currency + min investment)
6. Click "Create Class"; success toast appears
7. Zoom back out; outro page-fade so the video loops cleanly

## Constraints

- **No audio.** Pacing is editorial / motion-graphic (~400–500ms moves, 400–600ms holds), not breathy cinematic.
- **Frame-perfect.** No wall-clock drift; capture pipeline scrubs the GSAP timeline manually.
- **Single scene.** No route changes during the cinematic. The Overview route hosts both the Performance chart and the "+ Add share class" CTA.
- **Working mockup unaffected.** All cinematic code is gated by `?cine=1` URL flag. Default load behaviour is unchanged.

## Architecture

### Activation

- `?cine=1` URL parameter → `window.__CINE__ = true` at boot, before React mounts
- Single `<script id="cinematic-mode">` block at the bottom of `manager-os-nav-bundle.html` runs only when the flag is set
- GSAP 3.12 loaded from CDN in `<head>` (always loaded; harmless when not in cinematic mode)

### State bridge (`window.cine` API)

The bridge exposes imperative handles into React state so the GSAP timeline can drive UI changes deterministically:

```
window.cine = {
  setPerfRange(k)                     // '1M' | '3M' | '1Y'
  openCreateSheet()
  closeSheet()
  setField(key, value)
  typeField(key, text, perChar=80)    // scheduled per-character on master timeline
  clickCreate()
  showToast(msg)
  hideToast()
}
```

Each method is registered from inside its owning React component via a guarded `useEffect`:

```js
useEffect(() => {
  if (!window.__CINE__) return;
  (window.cine ||= {}).setPerfRange = setPerfRange;
}, []);
```

### React-controlled input handling

Setting `input.value` directly does not trigger React's `onChange`. The bridge exposes `setField` from inside `ShareClassSheet`, which calls the component's own `setForm` — clean, no native-setter hacks.

### Camera

The dashboard content is wrapped in a `.cinematic-camera` div with `transform-origin: 0 0` and `will-change: transform`. The camera function:

```js
function cameraTo(targetEl, scale, dur, ease) {
  const r = targetEl.getBoundingClientRect();
  const tx = r.left + r.width / 2;
  const ty = r.top + r.height / 2;
  gsap.to('.cinematic-camera', {
    scale,
    x: 960 - tx * scale,
    y: 540 - ty * scale,
    duration: dur,
    ease,
  });
}
```

The `0,0` origin + translate pattern allows smooth tweening between any two camera positions without origin-jump artifacts.

### Targets

Anchored via `data-cine="…"` attributes set on existing DOM nodes:

- `page-root` — Overview page container
- `chart` — PerformanceSection wrapper
- `port-return` — portfolio-return percentage span
- `toggle-1M`, `toggle-3M`, `toggle-1Y` — range-toggle buttons
- `add-class-btn` — "+ Add share class" CTA
- `sheet` — ShareClassSheet panel
- `field-name`, `field-fee`, `field-mgmt`, `field-currency`, `field-min` — hero fields
- `sheet-footer` — Create button row
- `toast` — success toast element

## Beat-by-beat timeline (60fps, 900 frames total)

| # | Time | Beat | Camera | UI action |
|---|------|------|--------|-----------|
| 1 | 0.00 → 0.50 | Intro: pageRise | 1.00× | Page rises from opacity 0 + y8 |
| 2 | 0.50 → 0.80 | Establish hold | 1.00× | Clean wide shot |
| 3 | 0.80 → 1.40 | Zoom to chart | 1.00 → 1.80×, `expo.out` | Chart at default 3M |
| 4 | 1.40 → 1.80 | Hold + cursor approach | 1.80× | Cursor glides to 1M toggle |
| 5 | 1.80 → 2.20 | Toggle → 1M | 1.80× | `setPerfRange('1M')`; port-return ticks +20.00% → +6.30% (350ms cubic.out); chart morphs |
| 6 | 2.20 → 2.60 | Toggle → 3M | 1.80× | Cursor → 3M; ticker +6.30% → +20.00% |
| 7 | 2.60 → 3.00 | Toggle → 1Y | 1.80× | Cursor → 1Y; ticker +20.00% → +55.00% |
| 8 | 3.00 → 3.60 | Pan to CTA | 1.80×, `quart.inOut` | Camera + cursor arc to button |
| 9 | 3.60 → 3.90 | Click button | 1.80× | Cursor click pulse + button micro-press |
| 10 | 3.90 → 4.50 | Sidesheet opens | 1.80 → 1.40×, `cubic.inOut` | Sheet slides in from right; overlay dims to 0.75 |
| 11 | 4.50 → 5.10 | Tighten on Identity | 1.40 → 2.20×, `expo.out` | Sheet empty, ready to fill |
| 12 | 5.10 → 5.90 | Type "Class B" | 2.20× | 7 chars × 80ms typewriter |
| 13 | 6.30 → 7.10 | Fee tier → Institutional | 2.20×, slight ↓ | Dropdown snap |
| 14 | 7.10 → 8.20 | Mgmt + Perf typewriter | 2.20×, slight ↓ | "1.50" then "20" |
| 15 | 8.20 → 9.10 | Currency → USD | 2.20×, slight ↓ | Dropdown snap |
| 16 | 9.10 → 10.30 | Min investment typewriter | 2.20×, slight ↓ | "$100,000" |
| 17 | 10.30 → 10.80 | Pull back for Create | 2.20 → 1.40×, `cubic.inOut` | Cursor glides to footer Create |
| 18 | 10.80 → 11.20 | Click Create | 1.40× | Cursor click pulse + button micro-press; `clickCreate()` |
| 19 | 11.20 → 11.90 | Toast appears | 1.40 → 1.50×, `expo.out` | Sheet slides out; toast slides in from top-right |
| 20 | 11.90 → 12.50 | Hold on toast | 1.50× | Toast lingers |
| 21 | 12.50 → 13.50 | Zoom out | 1.50 → 1.00×, `quart.inOut` | Toast fades at 14.0 |
| 22 | 13.50 → 14.60 | Final hold | 1.00× | Clean dashboard |
| 23 | 14.60 → 15.00 | Outro: pageFade | 1.00× | Opacity 1 → 0, y 0 → -6 (mirrors intro) |

**Loop seam:** frame 0 starts at opacity 0; frame 899 ends at opacity 0. Cross-frame loop is seamless.

## Cinematic UI primitives

### Synthetic cursor

Single SVG arrow element, `position: fixed`, `pointer-events: none`, `z-index: 9999`. GSAP tweens its `x`/`y` between target centres. Click moments use a quick scale 0.85 → 1.0 + expanding ring overlay. Hidden between pure camera moves to avoid visual noise.

### Toast

New component, mounted at body level via React portal when cinematic mode active. 320px wide, white card with green border-left, check icon, "Share class created · Class B". Top-right anchor, 24px inset. Enter: `translateX(20px)` + opacity 0 → 0/1 over 400ms ease-out. Exit: reverse, 300ms.

### Number ticker

`port-return` span tweens its `textContent` via GSAP — scheduled on the master timeline at the same instant as each `setPerfRange` call. Uses a custom modifier that formats the tweened number as `±NN.NN%`. React's render after state change will land on the final value and stay there.

## Capture pipeline

### Frame-perfect scrubbing

The Playwright script:
1. Loads the bundle with `?cine=1`
2. Waits for `window.cineTimeline` to exist
3. Pauses the timeline
4. For each frame `i` in `0..899`:
   - Calls `tl.time(i / 60)` to scrub the timeline to the exact moment
   - Awaits two `requestAnimationFrame`s (ensures React state changes from timeline `.call()` callbacks have rendered)
   - Captures `frame-NNNN.png`

This eliminates any wall-clock drift. Runtime: ~80 seconds for the full 900-frame capture.

### Constraint on timeline construction

Every time-dependent action must live on the master timeline:
- Typewriter is scheduled per-character via `.call()` at `startTime + i * perChar`
- Number ticker is a `.to()` tween on the master timeline, not a React-side `useEffect`
- React state changes fire via `.call()` at their exact time

This guarantees `tl.time(t)` reproduces the same visual state every time.

### Encoding

Two output formats from one frame sequence:

```bash
# H.264 MP4 (web-ready, ~5–10 MB)
ffmpeg -framerate 60 -i captures/frames/frame-%04d.png \
  -c:v libx264 -pix_fmt yuv420p -crf 16 -preset slow \
  captures/cinematic.mp4

# ProRes 422 HQ MOV (~300 MB, for After Effects / editing)
ffmpeg -framerate 60 -i captures/frames/frame-%04d.png \
  -c:v prores_ks -profile:v 3 -pix_fmt yuv422p10le \
  captures/cinematic.mov
```

Both wrapped in `scripts/encode.sh` for one-command runs.

## File-level changes to the bundle

| Location | Change | Lines |
|---|---|---|
| `<head>` | GSAP CDN `<script>` tag | +1 |
| Top-level boot (before App mount) | Parse `?cine=1`, set `window.__CINE__`, mount `.cinematic-camera` wrapper | +8 |
| `OverviewView` (line 4241) | `cineSheetOpen` state, wire button `onClick`, mount `<ShareClassSheet>` guarded by `__CINE__`, register `openCreateSheet`, `data-cine` attrs | +12 |
| `PerformanceSection` (line 1420) | Register `setPerfRange`, span ref + `data-cine="port-return"`, toggle `data-cine` attrs | +6 |
| `ShareClassSheet` (line 2896) | Register `setField` / `clickCreate`, `data-cine` attrs on hero fields + footer | +10 |
| Bottom of file | `<script id="cinematic-mode">` — GSAP timeline, camera, cursor, toast, typewriter | +250 |
| **Total** | | **~290 lines** |

Working mockup behaviour is unchanged when `?cine=1` is not present.

## Project deliverables

```
elysium-design/
├── mockups/manager-os-nav/
│   ├── manager-os-nav-bundle.html         ← edited with cinematic block
│   └── manager-os-nav-bundle.backup.html  ← pre-cinematic snapshot
├── scripts/
│   ├── capture-cinematic.mjs              ← Playwright capture script
│   ├── encode.sh                          ← ffmpeg wrapper
│   ├── package.json                       ← isolated, playwright only
│   └── .gitignore                         ← node_modules
└── captures/                              ← gitignored
    ├── frames/frame-0000.png … frame-0899.png
    ├── cinematic.mp4
    └── cinematic.mov
```

## Setup commands

```bash
cd elysium-design/scripts
npm init -y && npm i playwright
npx playwright install chromium
```

## Run

```bash
cd elysium-design/scripts
node capture-cinematic.mjs       # ~80s → 900 PNGs
./encode.sh mp4                  # web preview
./encode.sh mov                  # ProRes for editing
```

## Quality verification (after first capture)

- Text crispness at 2.2× zoom — should be fine, vector all the way
- Chart SVG path morph smoothness during range transitions
- Cursor lag — should be zero (synthetic, on timeline)
- Loop seam at frame 899 ↔ frame 0 — both at opacity 0
- Number ticker readability at speed
- Toast timing (slide-in lands cleanly before camera nudge)

## Out of scope

- Audio / VO
- Mobile / portrait variants
- Multiple cinematic scenes (this is one scene, one route, one CTA flow)
- Live demo mode (toggle in the working app for users to play). The `?cine=1` flag is for capture only — no interactivity preserved during cinematic
- Conditional fields (Distribution-frequency, Swing-pricing) — these stay hidden by keeping Income on `accumulation` and Dilution off, to avoid layout drift during camera moves

## Open questions for implementation

- Cursor visual — match macOS arrow, system-default-style, or design something custom? **Default: simple SVG arrow with soft drop-shadow until proven otherwise.**
- Toast colour treatment — green-on-white (matches existing accent palette) or use a dedicated success token? **Default: green border-left + ink-1 text on white card.**
- Should the cinematic auto-play in browsers (for preview) and let Playwright scrub manually? **Yes — auto-play in regular browser load for designer review; Playwright pauses + scrubs.**
