---
name: cinematic-walkthrough
description: Use when producing a frame-perfect cinematic video of a UI walkthrough — camera zooms, panning, scripted interactions, typewriter fills, confirmation states — captured headlessly via Playwright + GSAP timeline scrubbing.
---

# Cinematic UI Walkthrough

## When to use this skill

The user wants a polished video (not a screen recording) that takes a viewer on a guided tour of a UI: hero shots, zooms into details, demonstrated interactions ending in a success state. Output is typically MP4 / ProRes at 1920×1080 60fps, 10–25s long, often for marketing or sales decks.

Hallmarks of the request:
- "Animate the dashboard"
- "Walk-through video"
- "Showreel of the product"
- References to Dribbble / Awwwards cinematic dashboard demos

Use the existing `brainstorming` and `writing-plans` skills first to scope. This skill is the *playbook* for the build phase.

**Announce at start:** "I'm using the cinematic-walkthrough skill to plan and build this."

---

## Step 1 — Ask these motion questions BEFORE writing code

Don't skip these. Every one of them tripped someone up in a prior build. Ask one at a time.

### A. Output spec
1. **Resolution?** Default 1920×1080 viewport, capture at **DSF=2 (so PNGs render at 3840×2160)** for crisp text through camera zooms, downscale to 1920×1080 in ffmpeg. Bump higher only if the end use is a TV / event screen.
2. **Frame rate?** 60fps for smooth motion, 30fps if it's destined for slide decks (smaller files, snappier feel), 24fps for filmic.
3. **Duration target?** 10–18s is the sweet spot. > 20s usually means you should split into chapters.
4. **Format?** MP4 H.264 for web/embed, ProRes 422 HQ for editorial handoff, both if unsure.
5. **Audio?** Almost always no — design for muted playback.
6. **Loop?** Does the browser preview need to seamlessly loop, or does it end on a hero frame?

### B. Scene composition
1. **Which page / route?** Confirm the exact starting state.
2. **What's the hero interaction?** One headline action the video is selling.
3. **What's the success state?** Modal? Toast? In-place transformation? This is your landing frame.
4. **Start state vs end state?** The end state often gates the loop point.
5. **Should menu / nav be interactive in the recorded version?** Usually no — pin the route and make nav clicks no-ops so the viewer doesn't get distracted by hover states.
6. **Force dark / light mode?** Lock to one for the recording so theme preference doesn't bleed in.

### C. Beat-by-beat choreography
List every beat with a t= timestamp. Each beat is one of:
- **Establish** (wide, no movement, lets the viewer read)
- **Push in** (zoom toward target)
- **Pan** (lateral move at same zoom)
- **Pull back** (zoom out)
- **Reveal** (content appears — typewriter, fade-in, slide-in)
- **Interact** (cursor moves, click, button press)
- **Hold** (deliberate pause on a key moment)

For each beat ask:
- What's the camera doing?
- Is the cursor visible? Is there a click?
- Are fields/text being revealed? Typewriter or instant fill?
- What dims / what stays at 100% opacity?

### D. Pacing personality
1. **Cinematic vs punchy?** Cinematic = 1–3s per beat, `expo.inOut` easing, generous holds. Punchy = ~0.5s per beat, `power2.out`, no holds.
2. **Easing family?** `expo.inOut` for dramatic camera moves, `power3.inOut` for balanced, `cubic.inOut` for subtle. `.out` family for snappy lands, `.inOut` for cinematic ease-and-settle.
3. **Hold time on the hero?** 1–2.5s timeline.

### E. Loop & outro
1. **Loop?** If yes: the last frame must match the first frame state, and you'll need a `t=0` cleanup callback that resets every mutable state.
2. **Outro style?** Hard cut, fade to black, content slide-off, hero held on screen.

### F. Bundle / DOM questions
1. **Bundle format?** Single-file HTML with inline React? Built bundle? Vite app? This dictates how you inject the cinematic-mode block.
2. **Stable selectors?** Are there `data-*` attributes you can hook onto, or are class names hashed/minified?
3. **Scrollable containers?** Sheets, modals, side panels often have `overflow: auto` inner bodies. If their content is taller than visible, lower content is below the scroll fold and **NOT rendered in the camera frame even if it would otherwise be in view**. See Gotchas.
4. **Existing CSS transitions?** Sheets and modals usually have their own slide-in transitions — these can fight your !important transforms.
5. **Portals?** Sheets/modals often portal to `body`, which puts them OUTSIDE the camera transform. You'll need to conditionally portal *inside* the camera host when in cinematic mode.
6. **Other animation libs?** Lottie? Framer Motion? Each needs deterministic frame-driving for scrubbed capture.

---

## Step 2 — Architecture (the proven approach)

The pattern that works for a single-file React-in-HTML bundle:

### Activation gate
```js
// At the top of the file, before React mounts:
const params = new URLSearchParams(location.search);
window.__CINE__ = params.get('cine') === '1';
if (window.__CINE__) document.body.classList.add('cine-active');
```

All cinematic CSS is scoped under `body.cine-active` so the normal mockup is untouched.

In cine mode also: force route to the target page, force theme, make nav clicks no-ops. Detect `window.__CINE__` in the React App component and gate behaviour there. Beware: components like `ThemeSegment` may run their own `useEffect`s that override your forced theme — short-circuit those too when `__CINE__` is true.

### Camera transform
Wrap the entire page content in a `.cinematic-camera` div with `transform-origin: 0 0` and `will-change: transform`. Camera moves apply `translate(x, y) scale(s)` to this div. Also add font-smoothing hints so text stays sharp through the scale:

```css
body.cine-active .cinematic-camera,
body.cine-active .cinematic-camera * {
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  text-rendering: geometricPrecision;
}
```

Compute x/y so the focus point lands at viewport centre (or wherever you want it anchored):

```js
const VIEWPORT = { w: 1920, h: 1080 };
function cameraTo(target, scale, dur, ease) {
  const rect = measureUntransformed(target);
  const tx = rect.left + rect.width / 2;
  const ty = rect.top + rect.height / 2;
  gsap.to(camEl, {
    scale,
    x: VIEWPORT.w / 2 - tx * scale,
    y: VIEWPORT.h / 2 - ty * scale,
    duration: dur, ease,
  });
}
```

For sheet/sidebar content you often want **right-anchored** zoom (sheet pinned to viewport right edge while you zoom into a field within it):
```js
function cameraToSheetRight(target, scale, dur, ease, anchor = 'center') {
  const sheetRect = measureUntransformed(sheetEl);
  const rect = measureUntransformed(target);
  const x = VIEWPORT.w - sheetRect.right * scale;
  const y = anchor === 'bottom'
    ? VIEWPORT.h - rect.bottom * scale
    : VIEWPORT.h / 2 - (rect.top + rect.height / 2) * scale;
  gsap.to(camEl, { scale, x, y, duration: dur, ease });
}
```

### Untransformed measurement
You need each target's "as if the camera were at identity" rect. Without this, every measurement returns the post-transform coordinates and your math drifts:

```js
function measureUntransformed(el) {
  const cur = { x: gsap.getProperty(camEl, 'x'), y: ..., scale: ... };
  gsap.set(camEl, { x: 0, y: 0, scale: 1 });
  // ALSO neutralise mid-animation transitions on the target itself
  // (e.g., a sheet sliding in via CSS transition — its rect would
  // otherwise be its mid-slide position)
  const rect = el.getBoundingClientRect();
  gsap.set(camEl, cur);
  return rect;
}
```

### Timeline
One `gsap.timeline({ paused: true })` with beats added via `.add(() => { ... }, time)` and tweens via `.to(target, { ... }, time)`. Build all beats inside `buildTimeline()`, expose on `window.cineTimeline` for the capture script.

### React ↔ GSAP bridge
GSAP can't change React state directly. Expose imperative setters on `window.cine` from a useEffect in each relevant component:
```jsx
useEffect(() => {
  if (!window.__CINE__) return;
  window.cine = window.cine || {};
  window.cine.openCreateSheet = () => setSheetOpen(true);
  window.cine.setField = (key, val) => setForm(f => ({ ...f, [key]: val }));
}, []);
```
GSAP callbacks then call `window.cine.openCreateSheet()` at the right beat.

### Cursor
A `position: fixed` div in the body containing an SVG arrow. Move it with gsap. Don't rely on a real browser cursor — it won't show in screenshots.

---

## Step 3 — Phased build

Don't try to build the whole thing then capture once. Build in phases and preview after each:

1. **Camera + cleanup loop** — get the camera transform working, prove the loop resets cleanly to t=0.
2. **Hero zoom** — first big camera move (usually a "push in" to the most important UI element). Make sure easing personality feels right before adding everything else.
3. **First interaction beat** — cursor moves, click, state changes. Get the React bridge working.
4. **Content reveals** — typewriter, dropdown selection, value updates.
5. **End state** — confirmation, success modal, Lottie playback.
6. **Slide-offs and outro** — closing transitions, page fade.
7. **Share live preview** — push to a feature branch + use raw.githack.com URL for the user/stakeholder review. (See Sharing Previews below.)
8. **Capture spot-check** — preview script with ~20 representative frames.
9. **Full capture + encode** — only after the user signs off on the spot-check.

Use the preview script (Step 5) to spot-check each phase. Iterate on user feedback.

---

## Step 4 — Critical gotchas (these will all bite you)

### THE BIG ONE: dynamic `gsap.to()` inside callbacks won't scrub

A timeline built like:
```js
tl.add(() => { cameraTo('chart', 1.8, 1.0, 'expo.inOut'); }, 0.8);
```
…stores the *callback* on the timeline, but the `gsap.to(camEl, ...)` the callback creates is a **child of globalTimeline, not cineTimeline**. When the capture script scrubs `cineTimeline.time(t)` frame-by-frame, the callback fires and creates a new tween — but that tween then plays in **wall-clock** time. With ~150ms wall-clock between captured frames, a 1-second tween effectively completes in ~7 captured frames, then sits at the end state for the next 53. Result: the video looks like it skips through static states with no easing.

**Fix:** in the capture script, monkey-patch `gsap.to` / `gsap.fromTo` / `gsap.timeline` so they add to `cineTimeline` at the current playhead. Also kill the entrance tweens that ran during page load (otherwise the backward seek to cineStartTime rewinds them to opacity 0):

```js
await page.evaluate(() => {
  // Kill entrance tweens (page rise, sidebar enter, KPI fades).
  // getChildren(false, true, false) returns only tween children of
  // globalTimeline (not the timelines), so cineTimeline is preserved.
  window.gsap.globalTimeline.getChildren(false, true, false).forEach(t => t.kill());

  // Redirect any future gsap.to / gsap.fromTo / gsap.timeline calls onto
  // cineTimeline at the current playhead. Dynamic tweens created inside
  // cinematic callbacks (camera, cursor, focus dims, etc.) now scrub
  // along with the timeline.
  const tl = window.cineTimeline;
  const origTimeline = window.gsap.timeline;
  window.gsap.to = (target, vars) => tl.to(target, vars, tl.time());
  window.gsap.fromTo = (target, fromV, toV) => tl.fromTo(target, fromV, toV, tl.time());
  window.gsap.timeline = (vars) => {
    const sub = origTimeline.call(window.gsap, vars);
    tl.add(sub, tl.time());
    return sub;
  };

  tl.timeScale(1);
  tl.time(0);
  return null;
});
```

Then scrub `cineTimeline.time(i / 60)` per frame. Dynamic tweens behave as if they were declared in `buildTimeline` directly.

This single fix is the difference between a useless video that "looks like static screens" and a frame-perfect cinematic.

### Scrollable containers crop content out of the camera frame

A sheet/modal with `overflow: auto` and content taller than its visible area only renders the scrolled-in portion in the DOM viewport. The camera transform doesn't reveal scrolled-out content — that content **doesn't exist visually** until the container is scrolled to it.

So if you're zooming into a field near the bottom of a long form, fields just below it (still in the form, but past the body's scroll fold) won't appear in the camera frame. The viewer sees the field with the footer or empty space directly below it.

**Fix:** before any beat that needs lower-form content visible, programmatically scroll the body. Use a sentinel row (e.g., the last field you want to show) and align its bottom with the body's visible bottom:

```js
const body = sheet.children[1];
const lastVisibleRow = findRowByText(body, 'Shareholders can vote');
if (body && lastVisibleRow) {
  const target = lastVisibleRow.offsetTop + lastVisibleRow.offsetHeight
                  - body.clientHeight + 24;
  body.scrollTop = Math.max(0, target);
}
```

Do this **before** the camera-zoom beat that needs the content visible, not after — `measureUntransformed` reads the post-scroll position.

### CSS animations with `animation-fill-mode: both` start at opacity 0

CSS animations declared like:
```css
[data-page] > *:not(.no-page-anim) {
  animation: pageRise 0.55s cubic-bezier(0.22, 1, 0.36, 1) both;
}
```
…apply the `from` keyframe (often `opacity: 0`) **before** the animation starts and `to` after. Under scrubbed capture, if you don't wait for them to complete (or if you backward-seek `globalTimeline` past their start time), elements are stuck at opacity 0.

**Fix:** `await page.waitForTimeout(500)` between page-ready and capture-loop-start to let CSS animations settle. Then proceed with the gsap kill + monkey-patch.

### React inline style fights your inline style

React applies `style={{...}}` directly to the DOM element. If you set `element.style.transform = 'translateX(0)'`, the next React render overwrites it. **Use `setProperty('transform', 'translateX(0)', 'important')`** — `!important` beats React's plain inline style.

The asymmetric case: if you've set !important and want to release control, `removeProperty` won't fire a CSS transition between your !important value and React's plain value because removing leaves a moment with no inline transform (= identity), and the browser doesn't transition identity → React's value if they're visually equivalent.

**Fix:** keep !important throughout, and tween to a new !important value with an explicit transition.

### Lottie won't load over file://
`lottie.loadAnimation({ path: '...' })` does a fetch, which is blocked under file://. **Inline the JSON as `<script type="application/json" id="lottie-data">{...}</script>`** and load via `JSON.parse(textContent)` + `animationData`.

### Lottie drifts under scrubbed capture
Lottie plays on its own internal rAF clock. When the capture script scrubs the timeline, Lottie keeps playing at wall-clock pace — frame N of the captured video may not correspond to frame N of the lottie. **In the capture script, drive Lottie deterministically per-frame via `anim.goToAndStop(frame, true)`** based on timeline time and known lottie duration.

For the same reason, in cinematic mode set `loop: true` and disable autoplay, then manage frame manually from the capture script.

### Mid-transition measurement returns wrong rect
If a sheet is mid-slide-in via CSS transition and you call `getBoundingClientRect`, you get the *mid-animation* position, not the final. `measureUntransformed` needs to either snap the element to its target position for the read (interrupts the transition) or be called only when no transition is active. **Default to sequential timing** (camera moves only fire after preceding transitions complete) — it's simpler than measurement-snapshotting.

### Sheets portalled to body are outside the camera transform
A React modal/sheet that uses `ReactDOM.createPortal(node, document.body)` won't get zoomed by your camera. In cinematic mode, conditionally portal to a `.cinematic-camera-host` instead:
```jsx
const target = window.__CINE__ ? document.querySelector('.cinematic-camera-host') : document.body;
return ReactDOM.createPortal(content, target);
```

Side effect: a sheet pinned with `top:0; bottom:0` will stretch to the camera-host height (which is much taller than the viewport). Pin to `height: 100vh; bottom: auto` for cinematic mode.

### Playwright `page.evaluate` hangs on GSAP objects
GSAP timeline / tween return values contain circular references. Trying to serialise them back across CDP hangs the eval. **Always end your evaluate callbacks with `return null`** when interacting with GSAP:
```js
await page.evaluate(() => { window.cineTimeline.pause(); return null; });
```

### `networkidle` never fires on file://
giscus, fonts.googleapis, and other cross-origin SRI-checked resources never reach idle from `file://`. **Use `waitUntil: 'domcontentloaded'`** in Playwright, then explicitly `waitForFunction` on the things you need (e.g., `window.cineTimeline`).

### `timeScale` affects preview but NOT scrubbed capture
You may set `window.cineTimeline.timeScale(0.5)` so the browser preview plays at half speed (user feedback in "perceived seconds" while iterating). The capture script scrubs frame-by-frame at *base* timeline coords, so timeScale must be reset to 1 before capture, or your scrubbed time points won't match the visual you previewed.

### Auto-play race conditions
If the timeline auto-plays on mount, your capture script's `pause()` may fire after the timeline has already started. **Gate auto-play behind a flag** so the capture script can disable it via `addInitScript`:
```js
// In Playwright capture script:
await page.addInitScript(() => { window.__CINE_NO_AUTOPLAY = true; });
// In the bundle:
if (!window.__CINE_NO_AUTOPLAY) window.cineTimeline.play();
window.cineTimeline.eventCallback('onComplete', () => {
  if (!window.__CINE_NO_AUTOPLAY) window.cineTimeline.restart();
});
```

### `t=0` cleanup must reset EVERY mutable state
The loop iterates over the same timeline. Form values, animation states, opacity, transforms — all need explicit resets at t=0. Forgotten state from the previous iteration is the #1 source of "looks right once, broken on loop" bugs. Maintain a single `cleanup()` function called at t=0.

### CDP virtual time is a dead-end in Playwright headless
`HeadlessExperimental.beginFrame` requires `--enable-begin-frame-control --run-all-compositor-stages-before-draw` flags AND a chromium build that has the HeadlessExperimental domain. Playwright's default `chromium_headless_shell` build doesn't ship it; Chrome for Testing reports `'HeadlessExperimental.beginFrame' wasn't found`. **Don't go down this path.** Use the gsap-monkey-patch approach above instead.

### Playwright's `recordVideo` is too low-bitrate for marketing video
~25fps VP8 WebM at ~1Mbps. Visibly compressed. Acceptable for engineering review, not for client-facing deliverables. Frame-by-frame screenshots → ffmpeg is the only path to high quality.

---

## Step 5 — Capture pipeline

Two scripts. Both depend on `playwright` + a local `node_modules` next to them.

### Preview (fast spot-check, ~20 frames)
Scrubs to ~20 hand-picked timestamps representing each beat, writes `captures/preview/t02_03-label.png` for each. Run after every meaningful change so the user can review.

Key settings:
- `viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 2`
- `addInitScript` to set route + disable auto-play *before* the page loads
- `await page.waitForTimeout(500)` after page ready, before scrubbing — lets entrance CSS animations settle
- Wrap `page.evaluate` returns with `return null` to avoid GSAP serialisation hangs

### Full capture (frame-by-frame)
Same as preview but loops at 1/FPS intervals. The critical setup before the loop:

```js
await page.evaluate(() => {
  // Kill page-load entrance tweens (preserve cineTimeline)
  window.gsap.globalTimeline.getChildren(false, true, false).forEach(t => t.kill());

  // Monkey-patch gsap so dynamic tweens land on cineTimeline
  const tl = window.cineTimeline;
  const origTimeline = window.gsap.timeline;
  window.gsap.to = (target, vars) => tl.to(target, vars, tl.time());
  window.gsap.fromTo = (target, fromV, toV) => tl.fromTo(target, fromV, toV, tl.time());
  window.gsap.timeline = (vars) => {
    const sub = origTimeline.call(window.gsap, vars);
    tl.add(sub, tl.time());
    return sub;
  };

  tl.timeScale(1);
  tl.time(0);
  return null;
});

// Frame loop
for (let i = 0; i < frameCount; i++) {
  await page.evaluate(([t]) => {
    window.cineTimeline.time(t);
    // also: drive Lottie deterministically per-frame
    return null;
  }, [i / FPS]);
  await page.evaluate(() => new Promise(r =>
    requestAnimationFrame(() => requestAnimationFrame(r))));
  await page.screenshot({ path: `${OUT}/frame_${String(i).padStart(5,'0')}.png` });
}
```

Expect ~120-200ms wall-clock per frame at DSF=2. ~16s timeline × 60fps = 972 frames ≈ 2-3 minutes.

### Encode
Install ffmpeg without Homebrew via npm:
```bash
npm i @ffmpeg-installer/ffmpeg
```

Then use the bundled binary:
```js
import ffmpegInstaller from '@ffmpeg-installer/ffmpeg';
const ffmpeg = ffmpegInstaller.path;
```

Encode commands (PNGs at 3840×2160, downscale with lanczos for crispness):
```bash
# MP4 H.264 @ 1920×1080 (web/embed):
ffmpeg -framerate 60 -i frames/frame_%05d.png \
  -vf scale=1920:1080:flags=lanczos \
  -c:v libx264 -pix_fmt yuv420p -crf 17 -preset slow \
  -movflags +faststart out.mp4

# ProRes 422 HQ @ 1920×1080 (editorial):
ffmpeg -framerate 60 -i frames/frame_%05d.png \
  -vf scale=1920:1080:flags=lanczos \
  -c:v prores_ks -profile:v 3 -pix_fmt yuv422p10le out.mov

# ProRes 422 HQ @ 3840×2160 (native, for future re-crops):
ffmpeg -framerate 60 -i frames/frame_%05d.png \
  -c:v prores_ks -profile:v 3 -pix_fmt yuv422p10le out-3840.mov
```

CRF 17 is visually lossless for screen content. CRF 18–20 is fine for compressed delivery; go higher and the chart lines start crunching.

---

## Step 6 — Sharing previews

Stakeholders want to see WIP without you sending video files. Use `raw.githack.com` for free, no-signup, HTTPS-CDN hosting:

1. Commit the bundle + any local assets (e.g., fonts) on a feature branch.
2. Push to a GitHub fork the user owns.
3. Share URL:
   ```
   https://raw.githack.com/<user>/<repo>/<branch>/path/to/bundle.html?cine=1
   ```
4. raw.githack serves HTML, fonts, JS with correct MIME types; relative URLs (`assets/font.woff`) resolve. CDN-cached so it's fast.

Re-pushing the same branch updates the live URL (cache busts in ~5 minutes; hard-refresh or append `?t=2` to force).

---

## Step 7 — Quality checklist before sign-off

- [ ] Played end-to-end with no visible jank
- [ ] Easings actually interpolate (not "snap-then-static" — that's the gsap-monkey-patch issue)
- [ ] Text remains sharp through camera zooms (DSF=2 → downscale in ffmpeg)
- [ ] Loops cleanly (last frame → first frame is seamless)
- [ ] All text reveals complete before camera moves on
- [ ] No element is cut off at frame edges
- [ ] Scrollable containers show the correct content at each beat (body scroll positioned per beat)
- [ ] Cursor lands on the actual button (not just near it) at click moments
- [ ] Lottie reaches the same frame each loop (no drift)
- [ ] Loading / pending states are not visible after their beat
- [ ] No browser scrollbars visible in any frame
- [ ] Frame count matches expected (duration × fps within ±1 frame)
- [ ] File sizes reasonable (MP4 < ~10MB for 15s at 1080p60)

---

## When NOT to use this skill

- If the deliverable is an interactive prototype (use plain CSS transitions + browser playback)
- If the user wants a real screen recording with their cursor (use QuickTime / Loom)
- If the UI has thousands of moving parts and the cinematic budget is small — propose a simpler approach (CSS keyframes + screen capture) before committing to the full pipeline
