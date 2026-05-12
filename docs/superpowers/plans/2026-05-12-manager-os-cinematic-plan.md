# Manager OS Cinematic Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Produce a loopable 15s × 1920×1080 × 60fps frame-perfect cinematic of the Manager OS Overview dashboard, captured headlessly via Playwright by scrubbing a GSAP master timeline.

**Architecture:** Augment the existing single-file React-in-HTML bundle (`manager-os-nav-bundle.html`) with a `?cine=1` URL flag that activates a `<script id="cinematic-mode">` block at the bottom of the file. The cinematic block loads GSAP, builds a master timeline, drives React state via a `window.cine` bridge, and animates a `.cinematic-camera` wrapper. A standalone Playwright script (`scripts/capture-cinematic.mjs`) loads the bundle, pauses the timeline, scrubs to each frame, and screenshots. ffmpeg muxes the PNG sequence to MP4 (web) and ProRes 422 HQ (editing).

**Tech Stack:**
- Existing: React 18 + ReactDOM 18 + Babel-standalone (in-browser compile), vanilla CSS, no build step
- New: GSAP 3.12 (via CDN), Playwright (in isolated `scripts/` package), ffmpeg (system)

**Spec:** [docs/superpowers/specs/2026-05-12-manager-os-cinematic-design.md](../specs/2026-05-12-manager-os-cinematic-design.md)

---

## File Structure

| Path | Action | Responsibility |
|---|---|---|
| `mockups/manager-os-nav/manager-os-nav-bundle.html` | Modify | Add cinematic activation, `data-cine` attrs, state bridges, `<script id="cinematic-mode">` block |
| `mockups/manager-os-nav/manager-os-nav-bundle.backup.html` | Keep | Pre-cinematic snapshot, untouched throughout |
| `scripts/capture-cinematic.mjs` | Create | Playwright script: pause timeline, scrub frame-by-frame, capture PNGs |
| `scripts/encode.sh` | Create | ffmpeg wrapper: PNG sequence → MP4 / ProRes |
| `scripts/package.json` | Create | Isolated Playwright dependency |
| `scripts/.gitignore` | Create | Ignore node_modules |
| `.gitignore` (root) | Modify | Ignore `captures/` |
| `captures/` | Auto-created | Generated frames + encoded videos (gitignored) |

**Sizing principle:** All cinematic-related code in the bundle lives in **one trailing `<script id="cinematic-mode">` block** (~250 lines). Small inline bridges in React components are kept under 12 lines each and guarded by `if (window.__CINE__)` so they're invisible during normal use.

**Anchors in the bundle (referenced by surrounding text, not line numbers, because line numbers shift):**
- `function PerformanceSection({ range, setRange, bigHeadline }) {` — for `setPerfRange` bridge + number ticker
- `function ShareClassSheet({ open, mode, initialData, onClose, onSave }) {` — for `setField`/`clickCreate` bridges
- `function OverviewView({ onNav }) {` — for `openCreateSheet` bridge + sheet mount + button wiring
- `<button style={ovBtnPrimary}>+ Add share class</button>` — for onClick wiring + `data-cine` attr
- The final `</body>` tag — for inserting `<script id="cinematic-mode">` before it
- `<head>` — for GSAP CDN script tag

---

## Phasing rationale

Each phase produces a previewable, runnable artifact. The user can open `?cine=1` in a browser after every phase and see incremental progress. Capture pipeline only runs at the end.

| Phase | Output | How to preview |
|---|---|---|
| 1. Scaffold | Flag detection, camera wrapper, GSAP loaded | Open `?cine=1`; verify `window.__CINE__` in console; no visual change |
| 2. Camera primitive | `cameraTo()` works | From console: `cameraTo(document.querySelector('[data-cine="chart"]'), 1.8, 0.6, 'expo.out')` |
| 3. State bridge | `window.cine` API live | From console: `window.cine.setPerfRange('1M')`, `openCreateSheet()`, `setField('name','Class B')` |
| 4. Camera-only timeline | Timeline plays camera moves only | `cineTimeline.play()` — zoom/pan/zoom-out, no UI changes |
| 5. Chart cycling + ticker | Toggle cycling + number ticker integrated | Full chart sequence plays |
| 6. Sidesheet sequence | Click, sheet, typewriter, Create | Full sidesheet beat plays |
| 7. Toast + intro/outro | Loop-ready 15s | Full 15s plays + loops in browser |
| 8. Playwright capture | PNG sequence | Inspect `captures/frames/` |
| 9. Encode + verify | MP4 + ProRes | Play `cinematic.mp4` |

---

## Chunk 1: Implementation phases

### Task 1: Pre-flight — verify environment + checkpoint

**Files:**
- None modified

- [ ] **Step 1: Confirm working directory + git state**

```bash
cd "/Users/brad/Good Behaviour Dropbox/Brad 2025/LOCAL/elysium-design"
git status --short | head -5
git log --oneline -3
```

Expected: see commit `d86ef965 Manager OS cinematic — design spec + bundle backup` in recent log.

- [ ] **Step 2: Verify backup exists and is identical to source**

```bash
cd "/Users/brad/Good Behaviour Dropbox/Brad 2025/LOCAL/elysium-design"
diff mockups/manager-os-nav/manager-os-nav-bundle.html mockups/manager-os-nav/manager-os-nav-bundle.backup.html && echo "IDENTICAL"
```

Expected: prints `IDENTICAL`. If diff output appears, STOP — backup is stale, re-take it before proceeding.

- [ ] **Step 3: Confirm ffmpeg available**

```bash
ffmpeg -version | head -1
```

Expected: `ffmpeg version N.N.N`. If missing: `brew install ffmpeg` first.

---

### Task 2: Add GSAP CDN + `?cine=1` activation + camera wrapper

**Files:**
- Modify: `mockups/manager-os-nav/manager-os-nav-bundle.html` — `<head>` and root mount

**Outcome:** Loading `manager-os-nav-bundle.html?cine=1` sets `window.__CINE__ = true`, loads GSAP, and wraps the React app in `.cinematic-camera`. Normal load (`without `?cine=1`) is unchanged.

- [ ] **Step 1: Add GSAP CDN script tag in `<head>`**

Find the existing Babel-standalone script tag in `<head>`:
```html
<script src="https://unpkg.com/@babel/standalone@7.29.0/babel.min.js" integrity="sha384-m08KidiNqLdpJqLq95G/LEi8Qvjl/xUYll3QILypMoQ65QorJ9Lvtp2RXYGBFj1y" crossorigin="anonymous"></script>
```

Add immediately after it:
```html
<script src="https://unpkg.com/gsap@3.12.5/dist/gsap.min.js" integrity="sha384-IZxfBplR2YEcWLBhnAULxnjf+lazq9ZP4yzgUNB0XEjGmTthFlqIetIM0/PNAv1H" crossorigin="anonymous"></script>
```

- [ ] **Step 2: Add cinematic activation CSS in the existing `<style>` block**

Find the closing `</style>` tag (after all the existing CSS). Insert just before it:
```css
  /* ─── Cinematic mode ─── */
  .cinematic-camera {
    position: relative;
    transform-origin: 0 0;
    will-change: transform;
  }
  #cine-cursor {
    position: fixed;
    width: 20px;
    height: 20px;
    pointer-events: none;
    z-index: 9999;
    top: 0;
    left: 0;
    opacity: 0;
    will-change: transform, opacity;
  }
  #cine-cursor svg {
    width: 100%;
    height: 100%;
    filter: drop-shadow(0 2px 6px rgba(0,0,0,0.25));
  }
  #cine-cursor .cursor-ring {
    position: absolute;
    inset: -8px;
    border-radius: 50%;
    border: 2px solid rgba(29,125,89,0.6);
    opacity: 0;
    will-change: transform, opacity;
  }
  #cine-toast {
    position: fixed;
    top: 24px;
    right: 24px;
    width: 320px;
    background: var(--bg-canvas);
    border: 1px solid var(--line-1);
    border-left: 3px solid var(--accent-plum);
    border-radius: 10px;
    padding: 14px 16px;
    display: flex;
    align-items: center;
    gap: 12px;
    box-shadow: 0 12px 32px rgba(0,0,0,0.12);
    z-index: 9998;
    opacity: 0;
    transform: translateX(20px);
    will-change: transform, opacity;
  }
  #cine-toast .toast-icon {
    width: 20px; height: 20px;
    border-radius: 50%;
    background: var(--accent-plum);
    display: inline-flex;
    align-items: center;
    justify-content: center;
    color: #fff;
    flex-shrink: 0;
  }
  #cine-toast .toast-text {
    font-size: 13px;
    color: var(--ink-1);
    font-weight: 500;
    line-height: 1.4;
  }
  /* Outro fade for [data-page] in cinematic mode (intro reuses existing pageRise) */
  body.cine-fading-out [data-page] {
    opacity: 0 !important;
    transform: translateY(-6px) !important;
    transition: opacity 0.4s ease-in, transform 0.4s ease-in;
  }
```

- [ ] **Step 3: Set `window.__CINE__` early — before any React mount**

Find the existing `<script type="text/babel">` block that contains the main App and `ReactDOM.createRoot` call. Add a plain (non-Babel) `<script>` block **above** it:
```html
<script>
  window.__CINE__ = new URLSearchParams(window.location.search).get('cine') === '1';
</script>
```

- [ ] **Step 4: Add the `.cinematic-camera` wrapper around the React mount point**

Find the `<div id="root"></div>` (or whichever element the React app mounts to — confirm by searching for `getElementById` in the script).

Wrap it in a conditional camera div by changing:
```html
<div id="root"></div>
```
to:
```html
<div class="cinematic-camera-host"><div id="root"></div></div>
```

Then in the same plain `<script>` block from Step 3, append:
```js
if (window.__CINE__) {
  document.querySelector('.cinematic-camera-host').classList.add('cinematic-camera');
}
```

Why a host div + class toggle? When `?cine=1` is absent, the host div has no `cinematic-camera` class, no `transform-origin: 0 0`, and renders identically to before. This preserves working-mockup behaviour.

- [ ] **Step 5: Add empty `<script id="cinematic-mode">` block before `</body>`**

Just before the closing `</body>` tag, add:
```html
<script id="cinematic-mode">
  // Cinematic mode entry. Activates only when ?cine=1.
  // Built incrementally across plan phases — see docs/superpowers/plans/...
  (function() {
    if (!window.__CINE__) return;
    console.info('[cine] activated');
    // TODO: camera primitive (Phase 2)
    // TODO: timeline (Phase 4+)
  })();
</script>
```

- [ ] **Step 6: Verify normal load is unaffected**

Open the file in browser without `?cine=1`:
```bash
open "mockups/manager-os-nav/manager-os-nav-bundle.html"
```

Expected: dashboard renders normally. Open DevTools console:
- `window.__CINE__` returns `false`
- `gsap` object exists (loaded but unused)
- No `[cine]` log appears

- [ ] **Step 7: Verify cinematic flag detected**

```bash
open "mockups/manager-os-nav/manager-os-nav-bundle.html?cine=1"
```

Expected: dashboard renders normally. Console shows `[cine] activated`. `window.__CINE__` is `true`. The host div has class `cinematic-camera`.

- [ ] **Step 8: Commit**

```bash
cd "/Users/brad/Good Behaviour Dropbox/Brad 2025/LOCAL/elysium-design"
git add mockups/manager-os-nav/manager-os-nav-bundle.html
git commit -m "Manager OS cinematic: phase 1 — activation flag + GSAP + camera wrapper

Add ?cine=1 detection that sets window.__CINE__, loads GSAP from CDN, and
wraps the React mount in a .cinematic-camera host div. Working mockup
unchanged when flag is absent.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

### Task 3: Add `data-cine` attributes throughout

**Files:**
- Modify: `mockups/manager-os-nav/manager-os-nav-bundle.html` — multiple component JSX

**Outcome:** All animation targets are addressable by `document.querySelector('[data-cine="<name>"]')`. No behaviour change.

- [ ] **Step 1: Add `data-cine="page-root"` to OverviewView container**

Find in `function OverviewView({ onNav })`:
```jsx
<div style={{padding:'48px 40px 80px',maxWidth:1500,margin:'0 auto'}} data-page>
```

Change to:
```jsx
<div style={{padding:'48px 40px 80px',maxWidth:1500,margin:'0 auto'}} data-page data-cine="page-root">
```

- [ ] **Step 2: Add `data-cine="chart"` to the PerformanceSection wrapper**

Find in `function PerformanceSection({ range, setRange, bigHeadline })`:
```jsx
return (
  <div style={{marginBottom:48}}>
```

Change to:
```jsx
return (
  <div style={{marginBottom:48}} data-cine="chart">
```

- [ ] **Step 3: Add `data-cine="port-return"` to the portfolio-return span**

Find inside PerformanceSection (in the `bigHeadline` branch):
```jsx
<span style={{fontSize:32,fontWeight:500,letterSpacing:'-0.03em',fontVariantNumeric:'tabular-nums',color: portRet >= 0 ? 'var(--pos)' : 'var(--neg)'}}>{fmtPct(portRet)}</span>
```

Change to:
```jsx
<span data-cine="port-return" style={{fontSize:32,fontWeight:500,letterSpacing:'-0.03em',fontVariantNumeric:'tabular-nums',color: portRet >= 0 ? 'var(--pos)' : 'var(--neg)'}}>{fmtPct(portRet)}</span>
```

- [ ] **Step 4: Add `data-cine` attrs to timeframe toggle buttons**

Find in PerformanceSection:
```jsx
{RANGE_DEFS.map(def => (
  <button key={def.k} onClick={() => setRange(def.k)} style={{
```

Change to:
```jsx
{RANGE_DEFS.map(def => (
  <button key={def.k} data-cine={`toggle-${def.k}`} onClick={() => setRange(def.k)} style={{
```

- [ ] **Step 5: Add `data-cine="add-class-btn"` to the Overview "+ Add share class" button**

Find in OverviewView:
```jsx
<button style={ovBtnPrimary}>+ Add share class</button>
```

Change to:
```jsx
<button data-cine="add-class-btn" style={ovBtnPrimary}>+ Add share class</button>
```

(onClick wiring comes in Task 5 — leaving it without onClick for now keeps phases additive.)

- [ ] **Step 6: Add `data-cine="sheet"` to the ShareClassSheet panel**

Find in `function ShareClassSheet`:
```jsx
<div style={panelS} role="dialog" aria-label={mode==='edit'?'Edit share class':'Add share class'}>
```

Change to:
```jsx
<div data-cine="sheet" style={panelS} role="dialog" aria-label={mode==='edit'?'Edit share class':'Add share class'}>
```

- [ ] **Step 7: Add `data-cine` attrs to hero fields**

Find each `<FloatingField>` in the Identity / Currency / Fees / Dealing sections and wrap with a `data-cine` marker on the parent `<div>` (or modify FloatingField to forward an attr).

Cleanest: modify `FloatingField` itself to accept a `cineKey` prop:

Find:
```jsx
function FloatingField({ label, value, onChange, type='text', step, min, prefix, suffix, options, hint, autoFocus }) {
```

Change signature to:
```jsx
function FloatingField({ label, value, onChange, type='text', step, min, prefix, suffix, options, hint, autoFocus, cineKey }) {
```

Then in the JSX return, find:
```jsx
<div style={wrapperS}>
```

Change to:
```jsx
<div style={wrapperS} data-cine={cineKey}>
```

Now mark the five hero fields. Find each one and add `cineKey`:

| Field | Find | Add prop |
|---|---|---|
| Class name | `<FloatingField label="Class name"` | `cineKey="field-name"` |
| Fee tier | `<FloatingField label="Fee tier"` | `cineKey="field-fee"` |
| Management fee | `<FloatingField label="Management fee"` | `cineKey="field-mgmt"` |
| Denomination currency | `<FloatingField label="Denomination currency"` | `cineKey="field-currency"` |
| Minimum investment | `<FloatingField label="Minimum investment"` | `cineKey="field-min"` |

Example after change:
```jsx
<FloatingField label="Class name" cineKey="field-name" value={form.name} onChange={set('name')}/>
```

- [ ] **Step 8: Add `data-cine="sheet-footer"` to the sheet's footer row**

Find in ShareClassSheet (the `footerS` div):
```jsx
<div style={footerS}>
```

Change to:
```jsx
<div data-cine="sheet-footer" style={footerS}>
```

- [ ] **Step 9: Verify all targets resolve**

Open the bundle in browser without `?cine=1` (so we don't break anything yet):
```bash
open "mockups/manager-os-nav/manager-os-nav-bundle.html"
```

In DevTools console, run:
```js
['page-root','chart','port-return','toggle-1M','toggle-3M','toggle-1Y','add-class-btn'].map(k => [k, !!document.querySelector(`[data-cine="${k}"]`)])
```

Expected on Overview view: all are `true` except `add-class-btn` if the current default route isn't `overview`. Navigate to Overview (sidebar) and re-run. All seven should be `true`.

For sheet-related targets (`sheet`, `field-name`, `field-fee`, `field-mgmt`, `field-currency`, `field-min`, `sheet-footer`), these only mount when the sheet is open. To verify, navigate to Share Classes → click "+ New share class" → re-run the same probe with those keys.

- [ ] **Step 10: Commit**

```bash
git add mockups/manager-os-nav/manager-os-nav-bundle.html
git commit -m "Manager OS cinematic: phase 2 — data-cine target anchors

Add data-cine attributes to chart, port-return span, range toggles,
+ Add share class button, ShareClassSheet panel, hero fields, and footer.
FloatingField gains a cineKey prop. Behaviour unchanged.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

### Task 4: Camera primitive in `<script id="cinematic-mode">`

**Files:**
- Modify: `mockups/manager-os-nav/manager-os-nav-bundle.html` — `<script id="cinematic-mode">` block

**Outcome:** A `cameraTo()` function is available globally in cinematic mode. Can be called from console to verify camera moves work before integrating into a timeline.

- [ ] **Step 1: Implement `cameraTo()` and expose it on `window`**

Replace the existing TODO contents of `<script id="cinematic-mode">` with:

```html
<script id="cinematic-mode">
(function() {
  if (!window.__CINE__) return;
  console.info('[cine] activated');

  const VIEWPORT = { w: 1920, h: 1080 };

  // Resolve a data-cine target. Returns the element, or null if not mounted.
  function $(name) {
    return document.querySelector(`[data-cine="${name}"]`);
  }

  // Camera primitive. Centres target in 1920×1080 frame at given scale.
  function cameraTo(target, scale = 1, dur = 0.6, ease = 'expo.out') {
    const el = typeof target === 'string' ? $(target) : target;
    if (!el) { console.warn('[cine] cameraTo: target not found', target); return; }

    // Read the target's bounding rect in unscaled coordinates. To do this
    // reliably even mid-tween, we temporarily neutralise the current camera
    // transform, measure, then restore.
    const camEl = document.querySelector('.cinematic-camera');
    const prevTransform = camEl.style.transform;
    camEl.style.transform = '';
    const rect = el.getBoundingClientRect();
    camEl.style.transform = prevTransform;

    const tx = rect.left + rect.width / 2;
    const ty = rect.top + rect.height / 2;
    const x = VIEWPORT.w / 2 - tx * scale;
    const y = VIEWPORT.h / 2 - ty * scale;

    return gsap.to(camEl, { scale, x, y, duration: dur, ease });
  }

  // Expose for console use during development.
  window.cineCamera = { cameraTo, $ };
})();
</script>
```

- [ ] **Step 2: Manual camera test from console**

```bash
open "mockups/manager-os-nav/manager-os-nav-bundle.html?cine=1"
```

In DevTools console:
```js
cineCamera.cameraTo('chart', 1.8, 0.6, 'expo.out');
```

Expected: viewport smoothly zooms in on the Performance chart over 600ms. Repeat:
```js
cineCamera.cameraTo('add-class-btn', 1.8, 0.6, 'quart.inOut');
cineCamera.cameraTo('page-root', 1.0, 1.0, 'quart.inOut');
```

Expected: pan to the "+ Add share class" button, then smooth zoom out to the full dashboard.

- [ ] **Step 3: Commit**

```bash
git add mockups/manager-os-nav/manager-os-nav-bundle.html
git commit -m "Manager OS cinematic: phase 3 — cameraTo primitive

Add cameraTo(target, scale, dur, ease) inside cinematic-mode block.
Reads target rect in unscaled coords, computes translate so target is
centred in 1920x1080 frame at the desired scale. Exposed on
window.cineCamera for console-driven verification.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

### Task 5: State bridge — `window.cine` API

**Files:**
- Modify: `mockups/manager-os-nav/manager-os-nav-bundle.html` — small useEffect bridges in three components + button wiring

**Outcome:** From the console, `window.cine.setPerfRange('1M')` changes the chart, `window.cine.openCreateSheet()` opens the sidesheet on Overview, `window.cine.setField('name','Class B')` sets a form field, `window.cine.clickCreate()` fires Create.

- [ ] **Step 1: Bridge `setPerfRange` from PerformanceSection**

Find in `function PerformanceSection({ range, setRange, bigHeadline })`. The function currently has no `useEffect` calls. Just before the `return (`, add:

```jsx
  React.useEffect(() => {
    if (!window.__CINE__) return;
    (window.cine ||= {}).setPerfRange = setRange;
  }, [setRange]);
```

- [ ] **Step 2: Bridge `setField` and `clickCreate` from ShareClassSheet**

Find in `function ShareClassSheet({ open, mode, initialData, onClose, onSave })`. After the existing useEffects, add:

```jsx
  React.useEffect(() => {
    if (!window.__CINE__) return;
    if (!open) return;
    (window.cine ||= {}).setField = (key, value) => setVal(key, value);
    window.cine.clickCreate = () => { if (isValid) onSave(buildClass('active')); };
  }, [open, isValid, onSave]);
```

(Why guard on `open`: `setVal` and `onSave` are only meaningful while the sheet is mounted.)

- [ ] **Step 3: Add cineSheetOpen state and mount ShareClassSheet inside OverviewView**

Find at the top of `function OverviewView({ onNav })`:
```jsx
function OverviewView({ onNav }) {
  const [perfRange, setPerfRange] = _ov1('3M');
```

Add immediately after:
```jsx
  const [cineSheetOpen, setCineSheetOpen] = React.useState(false);
```

(_ov1 is the local alias for useState in this view — using React.useState directly is fine; they're the same thing.)

Then find the closing `</div>` that ends the OverviewView render (the one matching the opening `<div style={{padding:'48px 40px 80px'...`). Just before it, add:
```jsx
      {window.__CINE__ && (
        <ShareClassSheet
          open={cineSheetOpen}
          mode="create"
          initialData={null}
          onClose={() => setCineSheetOpen(false)}
          onSave={() => setCineSheetOpen(false)}
        />
      )}
```

Then bridge `openCreateSheet`. Just before the `return (` in OverviewView, add:
```jsx
  React.useEffect(() => {
    if (!window.__CINE__) return;
    (window.cine ||= {}).openCreateSheet = () => setCineSheetOpen(true);
    window.cine.closeSheet = () => setCineSheetOpen(false);
  }, []);
```

- [ ] **Step 4: Wire the "+ Add share class" button onClick**

Find:
```jsx
<button data-cine="add-class-btn" style={ovBtnPrimary}>+ Add share class</button>
```

Change to:
```jsx
<button data-cine="add-class-btn" onClick={() => window.cine?.openCreateSheet?.()} style={ovBtnPrimary}>+ Add share class</button>
```

(Optional chaining means the button is a no-op without cinematic mode, preserving working mockup behaviour. To make it functional in non-cinematic mode later, replace with a real handler — out of scope here.)

- [ ] **Step 5: Verify the bridge from console**

```bash
open "mockups/manager-os-nav/manager-os-nav-bundle.html?cine=1"
```

Navigate to Overview if not already there. In DevTools console:

```js
window.cine.setPerfRange('1M')
```
Expected: chart re-renders showing 1-month data, headline shows `+6.30%` (or current 1M figure).

```js
window.cine.setPerfRange('1Y')
```
Expected: chart morphs to 1Y view, headline becomes `+55.00%`.

```js
window.cine.openCreateSheet()
```
Expected: ShareClassSheet slides in from right with empty fields.

```js
window.cine.setField('name', 'Class B')
```
Expected: Class name field shows "Class B" and the floating label animates to its filled position.

```js
window.cine.setField('feeTier', 'Institutional')
```
Expected: Fee tier dropdown shows "Institutional".

```js
window.cine.setField('mgmtNum', '1.50')
window.cine.setField('perfNum', '20')
window.cine.setField('minInvestment', '100000')
```
Expected: those fields populate. The Create button at the bottom becomes solid (full opacity, clickable) once Name + Fee tier are set.

```js
window.cine.clickCreate()
```
Expected: sheet closes (the onSave we provided just closes it). The form reset.

```js
window.cine.closeSheet()
```
Expected: no-op (sheet already closed).

- [ ] **Step 6: Commit**

```bash
git add mockups/manager-os-nav/manager-os-nav-bundle.html
git commit -m "Manager OS cinematic: phase 4 — window.cine state bridge

Add useEffect bridges in PerformanceSection (setPerfRange), ShareClassSheet
(setField, clickCreate), and OverviewView (openCreateSheet, closeSheet).
OverviewView now mounts a cinematic-only ShareClassSheet, so the Add share
class button can open the sheet without route navigation.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

### Task 6: Master timeline — camera moves only

**Files:**
- Modify: `mockups/manager-os-nav/manager-os-nav-bundle.html` — extend `<script id="cinematic-mode">`

**Outcome:** A GSAP master timeline drives the full 15s of camera moves (no UI changes yet). Calling `cineTimeline.play()` from console plays the camera arc. Timeline is paused on creation; nothing plays unless explicitly triggered.

- [ ] **Step 1: Helper — wait for React mount**

Replace the contents of `<script id="cinematic-mode">` IIFE with:

```html
<script id="cinematic-mode">
(function() {
  if (!window.__CINE__) return;
  console.info('[cine] activated');

  const VIEWPORT = { w: 1920, h: 1080 };

  function $(name) { return document.querySelector(`[data-cine="${name}"]`); }

  function cameraTo(target, scale = 1, dur = 0.6, ease = 'expo.out') {
    const el = typeof target === 'string' ? $(target) : target;
    if (!el) { console.warn('[cine] cameraTo: target not found', target); return; }
    const camEl = document.querySelector('.cinematic-camera');
    const prevTransform = camEl.style.transform;
    camEl.style.transform = '';
    const rect = el.getBoundingClientRect();
    camEl.style.transform = prevTransform;
    const tx = rect.left + rect.width / 2;
    const ty = rect.top + rect.height / 2;
    const x = VIEWPORT.w / 2 - tx * scale;
    const y = VIEWPORT.h / 2 - ty * scale;
    return gsap.to(camEl, { scale, x, y, duration: dur, ease });
  }

  // Snap camera to a target without animation. Used at t=0 to set the
  // initial state, and to keep the camera math correct after re-mounts.
  function cameraSnap(target, scale = 1) {
    const el = typeof target === 'string' ? $(target) : target;
    if (!el) return;
    const camEl = document.querySelector('.cinematic-camera');
    const prevTransform = camEl.style.transform;
    camEl.style.transform = '';
    const rect = el.getBoundingClientRect();
    camEl.style.transform = prevTransform;
    const tx = rect.left + rect.width / 2;
    const ty = rect.top + rect.height / 2;
    gsap.set(camEl, { scale, x: VIEWPORT.w / 2 - tx * scale, y: VIEWPORT.h / 2 - ty * scale });
  }

  function waitForMount() {
    return new Promise(resolve => {
      const start = performance.now();
      const tick = () => {
        if ($('chart') && $('page-root') && $('add-class-btn')) return resolve();
        if (performance.now() - start > 5000) return resolve(); // hard cap
        requestAnimationFrame(tick);
      };
      tick();
    });
  }

  // Build the master timeline. Camera-only at this phase.
  function buildTimeline() {
    const tl = gsap.timeline({ paused: true });

    // Camera-only choreography (UI calls come in later phases).
    tl
      // Establish: snap to wide at t=0
      .add(() => cameraSnap('page-root', 1.0), 0)
      .to({}, { duration: 0.8 }, 0)                  // hold

      // Zoom to chart
      .add(() => cameraTo('chart', 1.8, 0.6, 'expo.out'), 0.8)
      .to({}, { duration: 1.6 }, 1.4)                // chart hold (timeframe cycling region)

      // Pan to CTA
      .add(() => cameraTo('add-class-btn', 1.8, 0.6, 'quart.inOut'), 3.0)
      .to({}, { duration: 0.3 }, 3.6)                // button-press hold

      // Sheet frame (will need to wait for sheet mount in next phase)
      .add(() => cameraTo('sheet', 1.4, 0.6, 'cubic.inOut'), 3.9)
      .to({}, { duration: 0.0 }, 4.5)

      // Tighten on first field
      .add(() => cameraTo('field-name', 2.2, 0.6, 'expo.out'), 4.5)
      .to({}, { duration: 0.6 }, 5.1)                // typewriter region (placeholder)

      // Field micro-pans
      .add(() => cameraTo('field-fee', 2.2, 0.28, 'cubic.out'), 6.3)
      .add(() => cameraTo('field-mgmt', 2.2, 0.28, 'cubic.out'), 7.1)
      .add(() => cameraTo('field-currency', 2.2, 0.28, 'cubic.out'), 8.2)
      .add(() => cameraTo('field-min', 2.2, 0.28, 'cubic.out'), 9.1)

      // Pull back for Create
      .add(() => cameraTo('sheet-footer', 1.4, 0.5, 'cubic.inOut'), 10.3)
      .to({}, { duration: 0.3 }, 10.8)               // click hold

      // Toast emphasis — toast doesn't exist yet, so target sheet for now
      .add(() => cameraTo('sheet', 1.5, 0.4, 'expo.out'), 11.2)
      .to({}, { duration: 0.6 }, 11.9)               // toast hold

      // Zoom out
      .add(() => cameraTo('page-root', 1.0, 1.0, 'quart.inOut'), 12.5)
      .to({}, { duration: 1.1 }, 13.5)               // final hold

      .to({}, { duration: 0.4 }, 14.6)               // outro placeholder
      .to({}, { duration: 0.0 }, 15.0);              // end marker

    return tl;
  }

  waitForMount().then(() => {
    // Snap camera to initial state immediately so frame 0 is correct.
    cameraSnap('page-root', 1.0);
    window.cineTimeline = buildTimeline();
    console.info('[cine] timeline built, duration =', window.cineTimeline.duration(), 's');
  });

  window.cineCamera = { cameraTo, cameraSnap, $ };
})();
</script>
```

- [ ] **Step 2: Manual play test**

```bash
open "mockups/manager-os-nav/manager-os-nav-bundle.html?cine=1"
```

Navigate to Overview. In DevTools console:
```js
cineTimeline.time(0); cineTimeline.play();
```

Expected: 15-second camera arc plays. The sheet camera target (t=3.9) will silently fail / no-op since sheet isn't mounted yet — that's expected at this phase. After it ends, you should be back at the wide shot.

To preview a specific moment:
```js
cineTimeline.pause(); cineTimeline.time(1.5);  // mid-chart-zoom
```

- [ ] **Step 3: Commit**

```bash
git add mockups/manager-os-nav/manager-os-nav-bundle.html
git commit -m "Manager OS cinematic: phase 5 — master timeline (camera-only)

Build a paused GSAP timeline that performs the full 15s camera arc with
no UI changes. Adds waitForMount, cameraSnap helpers. Sheet-targeted
beats no-op until sheet mounts in later phases. Exposed as
window.cineTimeline for console-driven playback.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

### Task 7: Chart timeframe cycling + portfolio-return ticker

**Files:**
- Modify: `mockups/manager-os-nav/manager-os-nav-bundle.html` — extend timeline build with chart calls + ticker tween

**Outcome:** During the chart-zoom region (1.4–3.0s), the timeline cycles through 1M → 3M → 1Y, and the portfolio-return headline number tweens between values on each change. Cursor moves along the toggles.

- [ ] **Step 1: Add cursor element + helpers**

In the cinematic-mode IIFE, after the `function $()` helper, add:

```js
  // Synthetic cursor.
  let cursorEl;
  function ensureCursor() {
    if (cursorEl) return cursorEl;
    cursorEl = document.createElement('div');
    cursorEl.id = 'cine-cursor';
    cursorEl.innerHTML = `
      <svg viewBox="0 0 20 20">
        <path d="M2 2 L18 10 L10 11 L7 18 Z" fill="#0E0F12" stroke="#fff" stroke-width="1.2" stroke-linejoin="round"/>
      </svg>
      <div class="cursor-ring"></div>
    `;
    document.body.appendChild(cursorEl);
    return cursorEl;
  }

  // Move cursor to target's screen center (accounting for current camera).
  function cursorTo(target, dur = 0.4, ease = 'cubic.inOut') {
    const el = typeof target === 'string' ? $(target) : target;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    return gsap.to(ensureCursor(), {
      x: cx - 10, y: cy - 10,                   // 10 = half cursor size (20px)
      duration: dur, ease,
    });
  }

  function cursorShow() { return gsap.to(ensureCursor(), { opacity: 1, duration: 0.2 }); }
  function cursorHide() { return gsap.to(ensureCursor(), { opacity: 0, duration: 0.2 }); }

  function cursorPulse() {
    const c = ensureCursor();
    const ring = c.querySelector('.cursor-ring');
    return gsap.timeline()
      .to(c, { scale: 0.85, duration: 0.08, ease: 'power2.out' })
      .to(c, { scale: 1.0, duration: 0.12, ease: 'back.out(2)' })
      .fromTo(ring, { opacity: 0.7, scale: 0.6 }, { opacity: 0, scale: 1.6, duration: 0.4, ease: 'power2.out' }, 0);
  }
```

Initial cursor position is `(0,0)`. We'll position it at the start of each cursor-using beat.

- [ ] **Step 2: Add number ticker helper**

In the same IIFE, after the cursor helpers, add:

```js
  // Tween portfolio-return text content. fromPct and toPct as floats.
  function tickPortReturn(fromPct, toPct, dur = 0.35) {
    const el = $('port-return');
    if (!el) return;
    const obj = { v: fromPct };
    return gsap.to(obj, {
      v: toPct,
      duration: dur,
      ease: 'cubic.out',
      onUpdate: () => {
        const sign = obj.v >= 0 ? '+' : '−';
        el.textContent = sign + Math.abs(obj.v).toFixed(2) + '%';
      },
    });
  }
```

(The minus character is U+2212 to match the existing `fmtPct` formatter.)

- [ ] **Step 3: Determine actual return values per range**

The exact values are computed in the bundle from `MASTER_PORTFOLIO`. We need the start values so the ticker doesn't visibly jump.

In DevTools (with the bundle open in cinematic mode):
```js
['1M','3M','1Y'].forEach(k => { window.cine.setPerfRange(k); console.log(k, document.querySelector('[data-cine="port-return"]').textContent); });
```

Expected: prints something like:
```
1M +6.30%
3M +20.00%
1Y +55.00%
```

Note the three values. If they differ from the values quoted in the spec, **use the observed values**.

Record them in the implementation as constants near the timeline build:
```js
  // Observed from MASTER_PORTFOLIO. Update if data changes.
  const PORT_RETURNS = { '3M': 20.00, '1M': 6.30, '1Y': 55.00 };
```

(3M first because that's the default range when Overview loads.)

- [ ] **Step 4: Replace the chart-region timeline section**

Find the line in `buildTimeline()`:
```js
      .to({}, { duration: 1.6 }, 1.4)                // chart hold (timeframe cycling region)
```

Replace that single line with the cycling sequence:
```js
      // Cursor enters and moves to 1M toggle
      .add(() => cursorShow(), 1.4)
      .add(() => cursorTo('toggle-1M', 0.4, 'cubic.inOut'), 1.4)

      // Click 1M
      .add(() => { window.cine.setPerfRange('1M'); cursorPulse(); }, 1.8)
      .add(() => tickPortReturn(PORT_RETURNS['3M'], PORT_RETURNS['1M']), 1.8)

      // Cursor → 3M, click
      .add(() => cursorTo('toggle-3M', 0.2, 'cubic.inOut'), 2.0)
      .add(() => { window.cine.setPerfRange('3M'); cursorPulse(); }, 2.2)
      .add(() => tickPortReturn(PORT_RETURNS['1M'], PORT_RETURNS['3M']), 2.2)

      // Cursor → 1Y, click
      .add(() => cursorTo('toggle-1Y', 0.2, 'cubic.inOut'), 2.4)
      .add(() => { window.cine.setPerfRange('1Y'); cursorPulse(); }, 2.6)
      .add(() => tickPortReturn(PORT_RETURNS['3M'], PORT_RETURNS['1Y']), 2.6)
```

- [ ] **Step 5: Test the chart cycling**

```bash
open "mockups/manager-os-nav/manager-os-nav-bundle.html?cine=1"
```

Navigate to Overview, open console:
```js
cineTimeline.time(0); cineTimeline.play();
```

Expected:
- 0.0–0.5: nothing changes (intro placeholder still empty)
- 0.8–1.4: camera zooms in on chart (now visible at 3M default)
- 1.4–1.8: cursor appears, glides to 1M
- 1.8: click pulse, chart morphs to 1M, headline ticks `+20.00%` → `+6.30%`
- 2.2: cursor → 3M, click, headline ticks back to `+20.00%`
- 2.6: cursor → 1Y, click, headline ticks to `+55.00%`
- 3.0+: rest of camera arc plays (sheet beats still no-op)

- [ ] **Step 6: Commit**

```bash
git add mockups/manager-os-nav/manager-os-nav-bundle.html
git commit -m "Manager OS cinematic: phase 6 — chart cycling + ticker

Add synthetic cursor (move/show/hide/pulse helpers), portfolio-return
number ticker, and the timeline beats that cycle 1M → 3M → 1Y between
1.4s and 3.0s. Cursor click pulses synchronise with setPerfRange calls.
Ticker tweens textContent in parallel with chart morph.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

### Task 8: Sidesheet sequence — open, typewriter, Create

**Files:**
- Modify: `mockups/manager-os-nav/manager-os-nav-bundle.html` — extend timeline

**Outcome:** Full sheet sequence (3.6s → 11.2s) plays: button click opens sheet, camera reframes, typewriter fills hero fields with `Class B` and others, dropdown selects USD + Institutional, Create button is clicked.

- [ ] **Step 1: Add typewriter helper**

In the cinematic-mode IIFE, after `tickPortReturn`:

```js
  // Schedule per-character setField calls onto the timeline.
  // Returns the total duration so callers can sequence around it.
  function typeFieldOnto(tl, key, text, startAt, perChar = 0.08, hold = 0.0) {
    for (let i = 1; i <= text.length; i++) {
      const t = startAt + i * perChar;
      tl.add(() => window.cine.setField(key, text.slice(0, i)), t);
    }
    return text.length * perChar + hold;
  }

  // Instant set (for dropdowns / non-typewriter fields).
  function setFieldOnto(tl, key, value, at) {
    tl.add(() => window.cine.setField(key, value), at);
  }
```

- [ ] **Step 2: Replace the sheet-region placeholders in the timeline**

Find:
```js
      // Sheet frame (will need to wait for sheet mount in next phase)
      .add(() => cameraTo('sheet', 1.4, 0.6, 'cubic.inOut'), 3.9)
      .to({}, { duration: 0.0 }, 4.5)

      // Tighten on first field
      .add(() => cameraTo('field-name', 2.2, 0.6, 'expo.out'), 4.5)
      .to({}, { duration: 0.6 }, 5.1)                // typewriter region (placeholder)
```

Replace with:
```js
      // Click "+ Add share class" — cursor pulse, then sheet opens
      .add(() => cursorTo('add-class-btn', 0.4, 'cubic.inOut'), 3.0)  // happens during pan
      .add(() => { cursorPulse(); window.cine.openCreateSheet(); }, 3.6)

      // Camera reframes to the sheet as it slides in (300ms CSS transition)
      .add(() => cameraTo('sheet', 1.4, 0.6, 'cubic.inOut'), 3.9)
      .add(() => cursorHide(), 4.2)

      // Tight zoom on Identity section, where typewriter starts
      .add(() => cameraTo('field-name', 2.2, 0.6, 'expo.out'), 4.5)
```

Then continue adding the field-fill beats (replacing the rest of the sheet region):
```js
      // Field 1 — typewriter "Class B"  (7 chars × 80ms = 560ms + 240ms hold)
      // Schedule typewriter chars on this timeline:
```

That's not legal inline. Instead, after the chained `.add(...)` block ends, append outside the chain using imperative calls:

```js
    // ... continued below ...
    typeFieldOnto(tl, 'name', 'Class B', 5.10);                       // ends at 5.66
    // Field 2 — Fee tier dropdown selects "Institutional" (snap)
    tl.add(() => cameraTo('field-fee', 2.2, 0.28, 'cubic.out'), 6.30);
    setFieldOnto(tl, 'feeTier', 'Institutional', 6.55);

    // Field 3 — Management fee typewriter "1.50" + perf typewriter "20"
    tl.add(() => cameraTo('field-mgmt', 2.2, 0.28, 'cubic.out'), 7.10);
    typeFieldOnto(tl, 'mgmtNum', '1.50', 7.40);                       // ends 7.72
    typeFieldOnto(tl, 'perfNum', '20',   7.80);                       // ends 7.96

    // Field 4 — Currency dropdown snap
    tl.add(() => cameraTo('field-currency', 2.2, 0.28, 'cubic.out'), 8.20);
    setFieldOnto(tl, 'currency', 'USD', 8.55);

    // Field 5 — Min investment typewriter "100000" (formatted via prefix)
    tl.add(() => cameraTo('field-min', 2.2, 0.28, 'cubic.out'), 9.10);
    typeFieldOnto(tl, 'minInvestment', '100000', 9.40);               // ends 9.88
```

Restructure: it's cleaner to break the long chained `tl.to/.add` block into discrete sections. Easiest approach — keep one chained block for camera moves through the chart cycling (which is what's there now), then break and use `tl.add(...)`, `tl.to(...)`, `typeFieldOnto(tl, ...)` imperatively for the sheet sequence.

The final shape of `buildTimeline()` should look like:

```js
  function buildTimeline() {
    const tl = gsap.timeline({ paused: true });

    // ── Establish + chart-zoom + cycling (1.4 → 3.0) ──
    tl
      .add(() => cameraSnap('page-root', 1.0), 0)
      .to({}, { duration: 0.8 }, 0)
      .add(() => cameraTo('chart', 1.8, 0.6, 'expo.out'), 0.8)
      // cursor + toggle cycling
      .add(() => cursorShow(), 1.4)
      .add(() => cursorTo('toggle-1M', 0.4, 'cubic.inOut'), 1.4)
      .add(() => { window.cine.setPerfRange('1M'); cursorPulse(); }, 1.8)
      .add(() => tickPortReturn(PORT_RETURNS['3M'], PORT_RETURNS['1M']), 1.8)
      .add(() => cursorTo('toggle-3M', 0.2, 'cubic.inOut'), 2.0)
      .add(() => { window.cine.setPerfRange('3M'); cursorPulse(); }, 2.2)
      .add(() => tickPortReturn(PORT_RETURNS['1M'], PORT_RETURNS['3M']), 2.2)
      .add(() => cursorTo('toggle-1Y', 0.2, 'cubic.inOut'), 2.4)
      .add(() => { window.cine.setPerfRange('1Y'); cursorPulse(); }, 2.6)
      .add(() => tickPortReturn(PORT_RETURNS['3M'], PORT_RETURNS['1Y']), 2.6);

    // ── Pan to CTA + click + sheet open (3.0 → 4.5) ──
    tl.add(() => cameraTo('add-class-btn', 1.8, 0.6, 'quart.inOut'), 3.0);
    tl.add(() => cursorTo('add-class-btn', 0.4, 'cubic.inOut'), 3.0);
    tl.add(() => { cursorPulse(); window.cine.openCreateSheet(); }, 3.6);
    tl.add(() => cameraTo('sheet', 1.4, 0.6, 'cubic.inOut'), 3.9);
    tl.add(() => cursorHide(), 4.2);

    // ── Tighten + typewriter fills (4.5 → 10.3) ──
    tl.add(() => cameraTo('field-name', 2.2, 0.6, 'expo.out'), 4.5);
    typeFieldOnto(tl, 'name', 'Class B', 5.10);
    tl.add(() => cameraTo('field-fee', 2.2, 0.28, 'cubic.out'), 6.30);
    setFieldOnto(tl, 'feeTier', 'Institutional', 6.55);
    tl.add(() => cameraTo('field-mgmt', 2.2, 0.28, 'cubic.out'), 7.10);
    typeFieldOnto(tl, 'mgmtNum', '1.50', 7.40);
    typeFieldOnto(tl, 'perfNum', '20',   7.80);
    tl.add(() => cameraTo('field-currency', 2.2, 0.28, 'cubic.out'), 8.20);
    setFieldOnto(tl, 'currency', 'USD', 8.55);
    tl.add(() => cameraTo('field-min', 2.2, 0.28, 'cubic.out'), 9.10);
    typeFieldOnto(tl, 'minInvestment', '100000', 9.40);

    // ── Pull back, click Create (10.3 → 11.2) ──
    tl.add(() => cameraTo('sheet-footer', 1.4, 0.5, 'cubic.inOut'), 10.30);
    tl.add(() => { cursorShow(); cursorTo('sheet-footer', 0.3, 'cubic.inOut'); }, 10.40);
    tl.add(() => { cursorPulse(); window.cine.clickCreate(); }, 10.80);

    // ── Toast (placeholder until Phase 7) ──
    // ...

    // ── Zoom out (12.5 → 13.5) ──
    tl.add(() => cameraTo('page-root', 1.0, 1.0, 'quart.inOut'), 12.5);

    // ── Outro placeholder (14.6 → 15.0) ──
    tl.to({}, { duration: 0.4 }, 14.6);

    return tl;
  }
```

(The toast and intro/outro come in Task 9. This restructure groups beats by region with comments.)

- [ ] **Step 3: Test full sheet sequence**

```bash
open "mockups/manager-os-nav/manager-os-nav-bundle.html?cine=1"
```

Navigate to Overview. Console:
```js
cineTimeline.time(0); cineTimeline.play();
```

Expected:
- 3.6s: sheet slides in from right
- 5.1s: "Class B" types into Class name field
- 6.55s: Fee tier dropdown shows "Institutional"
- 7.4s: "1.50" types into Management fee
- 7.8s: "20" types into Performance fee
- 8.55s: Currency shows USD
- 9.4s: "100000" types into Min investment (display will show with $ prefix)
- 10.8s: Create button click — sheet closes (since onSave in our cinematic wrapper just closes)
- 12.5s: camera zooms out
- 15s: timeline ends, dashboard at wide shot

- [ ] **Step 4: Commit**

```bash
git add mockups/manager-os-nav/manager-os-nav-bundle.html
git commit -m "Manager OS cinematic: phase 7 — sidesheet sequence

Add typewriter helper, button click + sheet open beat, camera reframe to
sheet, tight zoom on Identity, hero-field fills (Class B name, fee tier,
mgmt/perf fees, USD, min investment), pull-back to footer, Create click.
Timeline reorganised into commented region blocks for readability.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

### Task 9: Toast + intro/outro page fade

**Files:**
- Modify: `mockups/manager-os-nav/manager-os-nav-bundle.html` — extend cinematic block with toast helpers + intro/outro timeline beats

**Outcome:** Full 15s plays end-to-end with toast visible after Create, page fades in at start (mirroring existing pageRise) and out at end so the video loops seamlessly.

- [ ] **Step 1: Toast helpers**

In the cinematic-mode IIFE, after the cursor helpers, add:

```js
  // Toast element (created on demand).
  let toastEl;
  function ensureToast(msg) {
    if (toastEl) {
      toastEl.querySelector('.toast-text').textContent = msg;
      return toastEl;
    }
    toastEl = document.createElement('div');
    toastEl.id = 'cine-toast';
    toastEl.innerHTML = `
      <span class="toast-icon">
        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
      </span>
      <span class="toast-text">${msg}</span>
    `;
    document.body.appendChild(toastEl);
    return toastEl;
  }

  function showToast(msg) {
    const el = ensureToast(msg);
    return gsap.to(el, { opacity: 1, x: 0, duration: 0.4, ease: 'cubic.out' });
  }
  function hideToast() {
    if (!toastEl) return;
    return gsap.to(toastEl, { opacity: 0, x: 20, duration: 0.3, ease: 'cubic.in' });
  }

  (window.cine ||= {}).showToast = showToast;
  window.cine.hideToast = hideToast;
```

- [ ] **Step 2: Add toast beat to timeline**

In `buildTimeline()`, replace the placeholder comment `// ── Toast (placeholder until Phase 7) ──` and the line(s) before the Zoom out, with:

```js
    // ── Toast (11.2 → 12.5) ──
    tl.add(() => { window.cine.showToast('Share class created · Class B'); cursorHide(); }, 11.2);
    tl.add(() => cameraTo('toast', 1.5, 0.4, 'expo.out'), 11.5);   // brief emphasis on toast
    // toast fades during zoom-out
    tl.add(() => window.cine.hideToast(), 14.0);
```

For `cameraTo('toast', ...)` to work, the toast element needs `data-cine="toast"`. Update `ensureToast`:

```js
    toastEl = document.createElement('div');
    toastEl.id = 'cine-toast';
    toastEl.setAttribute('data-cine', 'toast');
    toastEl.innerHTML = `...`;
```

(Alternative if the toast emphasis camera move feels off: skip the `cameraTo('toast', ...)` and let the existing zoom-out at 12.5 handle the framing. We have it set up; can disable if it looks bad.)

- [ ] **Step 3: Intro pageRise + outro pageFade**

Add at the very top of `buildTimeline()`, before the existing `tl.add(() => cameraSnap(...))` line:

```js
    // ── Intro: pageRise (0.0 → 0.5) ──
    tl.fromTo('[data-page]',
      { opacity: 0, y: 8 },
      { opacity: 1, y: 0, duration: 0.5, ease: 'cubic.out' }, 0);
```

Then at the very bottom of `buildTimeline()`, replace the existing outro placeholder line:
```js
    tl.to({}, { duration: 0.4 }, 14.6);
```

with:
```js
    // ── Outro: pageFade (14.6 → 15.0) ──
    tl.to('[data-page]', { opacity: 0, y: -6, duration: 0.4, ease: 'cubic.in' }, 14.6);
```

- [ ] **Step 4: Auto-play on load for browser preview**

After `waitForMount()` resolves, append `.then(() => window.cineTimeline.play())` so a normal browser load starts the timeline automatically. Playwright will explicitly pause it before scrubbing.

Find:
```js
  waitForMount().then(() => {
    cameraSnap('page-root', 1.0);
    window.cineTimeline = buildTimeline();
    console.info('[cine] timeline built, duration =', window.cineTimeline.duration(), 's');
  });
```

Change to:
```js
  waitForMount().then(() => {
    cameraSnap('page-root', 1.0);
    window.cineTimeline = buildTimeline();
    console.info('[cine] timeline built, duration =', window.cineTimeline.duration(), 's');
    // Auto-play in browser. Playwright will pause and scrub.
    requestAnimationFrame(() => window.cineTimeline.play());
  });
```

- [ ] **Step 5: Optional — looping preview in browser**

For visual iteration in the browser without manually restarting, add after the auto-play call:
```js
    window.cineTimeline.eventCallback('onComplete', () => {
      // Loop only in non-Playwright contexts. Detect Playwright by user agent.
      if (!/HeadlessChrome/.test(navigator.userAgent)) {
        setTimeout(() => window.cineTimeline.restart(), 300);
      }
    });
```

- [ ] **Step 6: Test the full 15s sequence**

```bash
open "mockups/manager-os-nav/manager-os-nav-bundle.html?cine=1"
```

Navigate to Overview. Expected automatically:
- Page fades in (opacity 0 → 1, slight rise)
- Wide hold, then zoom to chart
- 3 timeframe cycles with ticker
- Pan to button, click
- Sheet opens, tight zoom, typewriter fills
- Pull back, Create click
- Toast slides in top-right
- Camera zooms out
- Toast fades, page fades out
- After 300ms gap: restarts and loops

If looping is annoying during iteration, simply navigate away or close the tab.

- [ ] **Step 7: Commit**

```bash
git add mockups/manager-os-nav/manager-os-nav-bundle.html
git commit -m "Manager OS cinematic: phase 8 — toast, intro/outro, autoplay

Add toast helpers (showToast, hideToast), schedule toast in/out beats,
brief camera emphasis on toast. Add intro pageRise + outro pageFade
beats so frame 0 and frame 899 both rest at opacity 0 for seamless
looping. Browser auto-plays + restarts for preview; Playwright will
pause and scrub.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

### Task 10: Playwright capture script

**Files:**
- Create: `scripts/package.json`
- Create: `scripts/.gitignore`
- Create: `scripts/capture-cinematic.mjs`
- Modify: `.gitignore` (root)

**Outcome:** `node scripts/capture-cinematic.mjs` produces 900 PNG frames in `captures/frames/`.

- [ ] **Step 1: Create scripts directory + package.json**

```bash
cd "/Users/brad/Good Behaviour Dropbox/Brad 2025/LOCAL/elysium-design"
mkdir -p scripts
```

Create `scripts/package.json`:
```json
{
  "name": "manager-os-cinematic-capture",
  "private": true,
  "type": "module",
  "scripts": {
    "capture": "node capture-cinematic.mjs",
    "encode:mp4": "bash encode.sh mp4",
    "encode:mov": "bash encode.sh mov"
  },
  "dependencies": {
    "playwright": "^1.45.0"
  }
}
```

- [ ] **Step 2: Create scripts/.gitignore**

```
node_modules/
package-lock.json
```

- [ ] **Step 3: Add captures/ to root .gitignore**

Find the existing `.gitignore` at `elysium-design/.gitignore`. Append:
```
# Cinematic captures
captures/
```

(If `.gitignore` doesn't exist, create it with that single line.)

- [ ] **Step 4: Install Playwright + chromium**

```bash
cd "/Users/brad/Good Behaviour Dropbox/Brad 2025/LOCAL/elysium-design/scripts"
npm install
npx playwright install chromium
```

Expected: `playwright` listed in `node_modules`, chromium downloaded.

- [ ] **Step 5: Create `scripts/capture-cinematic.mjs`**

```js
// Frame-perfect cinematic capture.
// Usage: node capture-cinematic.mjs
//
// Loads the Manager OS bundle in cinematic mode, pauses the GSAP timeline,
// scrubs frame-by-frame at 60fps for 15s (900 frames), and writes PNGs
// to ../captures/frames/.

import { chromium } from 'playwright';
import { mkdirSync, rmSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = resolve(__dirname, '..');

const FPS = 60;
const DURATION = 15;                       // seconds
const TOTAL_FRAMES = FPS * DURATION;       // 900
const VIEWPORT = { width: 1920, height: 1080 };
const OUT_DIR = resolve(PROJECT_ROOT, 'captures', 'frames');
const BUNDLE_PATH = resolve(PROJECT_ROOT, 'mockups', 'manager-os-nav', 'manager-os-nav-bundle.html');

// Clean previous run
if (existsSync(OUT_DIR)) rmSync(OUT_DIR, { recursive: true, force: true });
mkdirSync(OUT_DIR, { recursive: true });

console.log(`[capture] launching chromium @ ${VIEWPORT.width}×${VIEWPORT.height}`);
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: VIEWPORT, deviceScaleFactor: 1 });
const page = await ctx.newPage();

const url = `file://${BUNDLE_PATH}?cine=1`;
console.log(`[capture] loading ${url}`);
await page.goto(url, { waitUntil: 'networkidle' });

// Wait for timeline to be constructed
await page.waitForFunction(() => !!window.cineTimeline, { timeout: 10_000 });
console.log('[capture] timeline ready, pausing for scrub');

// Navigate to Overview route (the cinematic scene)
await page.evaluate(() => {
  // Tweak select drives setRoute. Simulate by setting localStorage + reloading
  // would be heavy; instead, find the tweak select and fire native change.
  // Simpler: just call the app's setRoute via a global if exposed,
  // otherwise click the Overview nav item.
  // The bundle stores route in localStorage as 'mos.route'.
  localStorage.setItem('mos.route', 'overview');
});

// Reload so the route takes effect on the React mount
await page.goto(url, { waitUntil: 'networkidle' });
await page.waitForFunction(() => !!window.cineTimeline);
await page.waitForFunction(() => !!document.querySelector('[data-cine="chart"]'));

// Pause and scrub
await page.evaluate(() => window.cineTimeline.pause());

const t0 = Date.now();
for (let i = 0; i < TOTAL_FRAMES; i++) {
  const t = i / FPS;
  await page.evaluate((time) => window.cineTimeline.time(time), t);
  // Double-RAF: ensures any React state changes from .add() callbacks have
  // committed to the DOM before screenshot.
  await page.evaluate(() => new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r))));
  await page.screenshot({
    path: `${OUT_DIR}/frame-${String(i).padStart(4, '0')}.png`,
    omitBackground: false,
  });
  if (i % 60 === 0 || i === TOTAL_FRAMES - 1) {
    const elapsed = (Date.now() - t0) / 1000;
    console.log(`  ${i}/${TOTAL_FRAMES}  t=${t.toFixed(2)}s  elapsed=${elapsed.toFixed(1)}s`);
  }
}

await browser.close();
const total = (Date.now() - t0) / 1000;
console.log(`[capture] done — ${TOTAL_FRAMES} frames in ${total.toFixed(1)}s → ${OUT_DIR}`);
```

- [ ] **Step 6: Sanity test — capture just first 60 frames**

Temporarily change `const TOTAL_FRAMES = FPS * DURATION;` to `const TOTAL_FRAMES = 60;` for a quick check (one second of output).

```bash
cd "/Users/brad/Good Behaviour Dropbox/Brad 2025/LOCAL/elysium-design/scripts"
node capture-cinematic.mjs
```

Expected: ~6 seconds, 60 PNGs written.

Open one:
```bash
open ../captures/frames/frame-0000.png
```
Expected: opacity ~0, page barely visible (intro fade just starting).

```bash
open ../captures/frames/frame-0030.png
```
Expected: page fully visible at 0.5s, wide shot.

Restore `TOTAL_FRAMES = FPS * DURATION`.

- [ ] **Step 7: Commit**

```bash
cd "/Users/brad/Good Behaviour Dropbox/Brad 2025/LOCAL/elysium-design"
git add .gitignore scripts/package.json scripts/.gitignore scripts/capture-cinematic.mjs
git commit -m "Manager OS cinematic: phase 9 — Playwright capture script

Add isolated scripts/ package with Playwright dependency. capture-cinematic.mjs
loads the bundle with ?cine=1, sets the overview route in localStorage,
pauses the GSAP timeline, and scrubs 900 frames at 60fps to PNGs in
captures/. captures/ is gitignored.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

### Task 11: ffmpeg encoder wrapper + full capture

**Files:**
- Create: `scripts/encode.sh`
- Generated: `captures/cinematic.mp4`, `captures/cinematic.mov`

**Outcome:** `./encode.sh mp4` produces a web-ready MP4. `./encode.sh mov` produces a ProRes 422 HQ MOV. Both from the same PNG sequence.

- [ ] **Step 1: Create `scripts/encode.sh`**

```bash
#!/usr/bin/env bash
# Encode the captured frame sequence to MP4 or ProRes.
# Usage: ./encode.sh [mp4|mov]

set -euo pipefail

FORMAT="${1:-mp4}"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
FRAMES_DIR="$PROJECT_ROOT/captures/frames"
OUT_DIR="$PROJECT_ROOT/captures"

if [[ ! -d "$FRAMES_DIR" ]]; then
  echo "Frames not found at $FRAMES_DIR — run capture first."
  exit 1
fi

case "$FORMAT" in
  mp4)
    OUT="$OUT_DIR/cinematic.mp4"
    echo "→ H.264 MP4 → $OUT"
    ffmpeg -y -framerate 60 -i "$FRAMES_DIR/frame-%04d.png" \
      -c:v libx264 -pix_fmt yuv420p -crf 16 -preset slow \
      "$OUT"
    ;;
  mov)
    OUT="$OUT_DIR/cinematic.mov"
    echo "→ ProRes 422 HQ MOV → $OUT"
    ffmpeg -y -framerate 60 -i "$FRAMES_DIR/frame-%04d.png" \
      -c:v prores_ks -profile:v 3 -pix_fmt yuv422p10le \
      "$OUT"
    ;;
  *)
    echo "Usage: $0 [mp4|mov]"
    exit 2
    ;;
esac

echo "Done."
ls -lh "$OUT"
```

- [ ] **Step 2: Make executable**

```bash
chmod +x "/Users/brad/Good Behaviour Dropbox/Brad 2025/LOCAL/elysium-design/scripts/encode.sh"
```

- [ ] **Step 3: Run the full 900-frame capture**

```bash
cd "/Users/brad/Good Behaviour Dropbox/Brad 2025/LOCAL/elysium-design/scripts"
node capture-cinematic.mjs
```

Expected: ~80-90 seconds. Progress logs every 60 frames. Final: `done — 900 frames in NNs → .../captures/frames`.

Verify:
```bash
ls "/Users/brad/Good Behaviour Dropbox/Brad 2025/LOCAL/elysium-design/captures/frames/" | wc -l
```
Expected: `900`.

- [ ] **Step 4: Encode MP4**

```bash
cd "/Users/brad/Good Behaviour Dropbox/Brad 2025/LOCAL/elysium-design/scripts"
./encode.sh mp4
```

Expected: ffmpeg progress; final MP4 around 5-10 MB; `ls -lh` shown at end.

- [ ] **Step 5: Preview**

```bash
open "/Users/brad/Good Behaviour Dropbox/Brad 2025/LOCAL/elysium-design/captures/cinematic.mp4"
```

Expected: 15s video plays in QuickTime. Review against the spec:
- Intro fade-in clean
- Chart zoom + 3 toggle cycles with number ticker
- Pan to button, click
- Sheet slide-in
- Tight zoom on Class name, typewriter "Class B"
- Fee tier → Institutional
- Mgmt 1.50 / Perf 20 typewriter
- Currency → USD
- Min investment → 100000 typewriter
- Pull back, Create click
- Toast "Share class created · Class B" slides in
- Zoom out
- Page fades out
- Loop seam: frame 0 ↔ frame 899 should both be near opacity 0

- [ ] **Step 6: Encode ProRes (only if MP4 looks correct)**

```bash
./encode.sh mov
```

Expected: takes longer than MP4, output ~250-400 MB.

- [ ] **Step 7: Commit scripts**

```bash
cd "/Users/brad/Good Behaviour Dropbox/Brad 2025/LOCAL/elysium-design"
git add scripts/encode.sh
git commit -m "Manager OS cinematic: phase 10 — ffmpeg encoder wrapper

Add encode.sh wrapper for two output formats: H.264 MP4 (web preview,
crf 16) and ProRes 422 HQ MOV (editing-ready). Frame sequence in
captures/frames/ feeds either pipeline.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

### Task 12: Quality verification + tweaks

**Files:**
- Possibly modify: `mockups/manager-os-nav/manager-os-nav-bundle.html` (timing/easing nudges only)

**Outcome:** Final video matches the spec. Common issues addressed.

- [ ] **Step 1: Loop seam check**

Compare the first and last frame visually:
```bash
open "/Users/brad/Good Behaviour Dropbox/Brad 2025/LOCAL/elysium-design/captures/frames/frame-0000.png"
open "/Users/brad/Good Behaviour Dropbox/Brad 2025/LOCAL/elysium-design/captures/frames/frame-0899.png"
```

Both should be nearly identical: page at low opacity, no toast visible, wide shot. If frame 0 looks crisp (full opacity) and 899 looks crisp, the intro/outro fades aren't taking — re-check Task 9 Step 3.

- [ ] **Step 2: Number ticker readability**

Step through `frame-0108.png` to `frame-0120.png` (around t=1.8s, the first toggle click). The headline should be tweening through digits. If the chart morphed but the headline jumped, the tickPortReturn call may be racing with React render — confirm `PORT_RETURNS` constants match the rendered values.

- [ ] **Step 3: Text crispness at 2.2×**

Inspect `frame-0330.png` (t=5.5s, mid-typewriter on Class name). Text should be sharp. If blurry, Chrome is rasterising — investigate `will-change: transform` on `.cinematic-camera` (already set; should be fine).

- [ ] **Step 4: Camera math at sheet open**

Sheet has a 300ms CSS slide-in. The camera reframes at t=3.9 with 600ms duration. If the camera arrives before the sheet finishes sliding in, the target rect may be wrong. Verify by inspecting `frame-0234.png` (t=3.9), `frame-0252.png` (t=4.2): the sheet should be fully in place and the camera should be framing it cleanly.

If the camera is mis-framed (sheet edge visible at the wrong side), increase the camera move delay by 0.1s, or reduce the sheet CSS slide-in to 200ms.

- [ ] **Step 5: Re-capture if any tweaks made**

```bash
cd scripts && node capture-cinematic.mjs && ./encode.sh mp4
open ../captures/cinematic.mp4
```

- [ ] **Step 6: Final commit if tweaks made**

```bash
git add mockups/manager-os-nav/manager-os-nav-bundle.html
git commit -m "Manager OS cinematic: timing polish post-capture review

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Acceptance criteria

- [ ] `?cine=1` activates cinematic mode; default load is unchanged
- [ ] Single scene, no route changes during cinematic
- [ ] 15s duration exactly (frame 899 is the last frame)
- [ ] 1920×1080 frames, 60fps
- [ ] Loop seam: frame 0 and frame 899 both at low opacity, seamless restart
- [ ] Three timeframe cycles with portfolio-return number tweens
- [ ] "Class B" typewriter, fee/currency/min-investment fields populated
- [ ] Toast appears after Create click
- [ ] Working mockup behaviour unaffected when `?cine=1` is not present
- [ ] Backup file `manager-os-nav-bundle.backup.html` untouched throughout

## Risk + rollback

- If the cinematic block breaks the working mockup: `git checkout manager-os-nav-bundle.backup.html mockups/manager-os-nav/manager-os-nav-bundle.html` (after copying backup over) or revert specific commits.
- Capture artifacts (`captures/`) are gitignored; safe to delete and re-run.
- The Playwright dependency is isolated in `scripts/` — won't pollute the project root.

## Known limitations

- The cinematic only renders correctly on the Overview route. If the bundle's default route was changed to something else, the capture script forces `overview` via localStorage and reload — but the user previewing in a normal browser must navigate to Overview manually after first load (or the auto-play kicks in on the wrong view).
- Conditional fields (Distribution-frequency under "distribution" income; Swing-pricing under enabled dilution) are intentionally never triggered, to keep camera coordinates stable.
- Babel-standalone compiles JSX in-browser on every load. First load is slow (~600ms). `waitForMount()` polls for the chart element, so this is tolerated.

---

**End of plan.**
