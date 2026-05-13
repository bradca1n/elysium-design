// Full-fidelity frame-by-frame capture of the Manager OS cinematic.
// Scrubs the GSAP timeline at 60fps, drives the Lottie animation
// deterministically per frame (so it doesn't drift on wall-clock),
// writes PNGs to captures/frames/, and prints ffmpeg encode commands.

import { chromium } from 'playwright';
import { mkdirSync, rmSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = resolve(__dirname, '..');
const BUNDLE = resolve(PROJECT_ROOT, 'mockups', 'manager-os-nav', 'manager-os-nav-bundle.html');
const OUT = resolve(PROJECT_ROOT, 'captures', 'frames');

const FPS = 60;
const PAD = 5;

// When the confirmation+lottie appears in the timeline. Update if the
// timeline beats change.
const CONFIRM_START = 12.7;

console.log('[capture] launching chromium');
const browser = await chromium.launch();
const ctx = await browser.newContext({
  viewport: { width: 1920, height: 1080 },
  // DSF=2 so text stays sharp through the 2.2× camera zoom.
  // PNGs come out 3840×2160; ffmpeg downscales to 1920×1080.
  deviceScaleFactor: 2,
});
const page = await ctx.newPage();

page.on('console', msg => {
  const text = msg.text();
  if (text.startsWith('[cine]')) console.log('  page:', text);
});

await page.addInitScript(() => {
  try { localStorage.setItem('mos.route', 'overview'); } catch {}
  window.__CINE_NO_AUTOPLAY = true;
});

const url = `file://${BUNDLE}?cine=1`;
console.log('[capture] loading', url);
await page.goto(url, { waitUntil: 'domcontentloaded' });
await page.waitForFunction(() => !!window.cineTimeline, { timeout: 20000 });
await page.waitForFunction(() => !!document.querySelector('[data-cine="chart"]'), { timeout: 10000 });

// Let entrance animations settle, then redirect all future GSAP calls to
// cineTimeline so frame-scrubbing actually advances them.
await page.waitForTimeout(500);

await page.evaluate(() => {
  // Kill GSAP tweens that ran during page load (entrance fades etc).
  // getChildren(nested=false, tweens=true, timelines=false) preserves
  // cineTimeline itself but clears the wall-clock-driven entrance tweens.
  window.gsap.globalTimeline.getChildren(false, true, false).forEach(t => t.kill());

  // Monkey-patch gsap.to / gsap.fromTo / gsap.timeline so dynamic tweens
  // created inside cinematic callbacks (camera, cursor, focus dim, etc.)
  // are added as children of cineTimeline at the current playhead. That
  // makes them scrubbable when we step cineTimeline.time(t) frame by frame.
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

const duration = await page.evaluate(() => window.cineTimeline.duration());
const frameCount = Math.ceil(duration * FPS);
console.log(`[capture] duration=${duration.toFixed(2)}s × ${FPS}fps = ${frameCount} frames`);

if (existsSync(OUT)) rmSync(OUT, { recursive: true, force: true });
mkdirSync(OUT, { recursive: true });

const startedAt = Date.now();
for (let i = 0; i < frameCount; i++) {
  const cineT = i / FPS;
  await page.evaluate(([t, confirmStart]) => {
    // cineTimeline is paused; scrubbing via .time() advances it and all
    // children (including dynamic tweens added via the monkey-patched
    // gsap.to/fromTo/timeline during prior forward scrubs).
    window.cineTimeline.time(t);
    // Drive Lottie deterministically — its internal raf-based playback
    // would otherwise drift on wall-clock during scrubbed capture.
    const lottieEl = document.getElementById('cine-confirm-lottie');
    const anim = lottieEl?.__cineLottie;
    if (anim) {
      const lottieDur = 70 / 24;
      if (t >= confirmStart) {
        const elapsed = (t - confirmStart) % lottieDur;
        anim.goToAndStop(elapsed * 24, true);
      } else {
        anim.goToAndStop(0, true);
      }
    }
    return null;
  }, [cineT, CONFIRM_START]);
  // Double-RAF so React + GSAP commit before we screenshot.
  await page.evaluate(() => new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r))));
  const fname = `frame_${String(i).padStart(PAD, '0')}.png`;
  await page.screenshot({ path: `${OUT}/${fname}`, omitBackground: false });
  if (i % 60 === 0) {
    const elapsed = ((Date.now() - startedAt) / 1000).toFixed(1);
    const diag = await page.evaluate(() => {
      const pg = document.querySelector('[data-page]');
      return {
        pgOpacity: pg ? getComputedStyle(pg).opacity : 'n/a',
        cineTime: window.cineTimeline.time(),
      };
    });
    console.log(`  ${i}/${frameCount}  t=${cineT.toFixed(2)}s  ${elapsed}s  pgOp=${diag.pgOpacity}  cineT=${diag.cineTime.toFixed(2)}`);
  }
}

await browser.close();
console.log(`[capture] done — ${frameCount} frames → ${OUT}`);
console.log('');
console.log('[capture] encode with:');
console.log('  MP4 (H.264, web-friendly) — downscale 3840→1920 with lanczos:');
console.log(`    ffmpeg -framerate ${FPS} -i ${OUT}/frame_%0${PAD}d.png -vf scale=1920:1080:flags=lanczos -c:v libx264 -pix_fmt yuv420p -crf 17 -preset slow -movflags +faststart captures/manager-os-cinematic.mp4`);
console.log('  ProRes 422 HQ (editorial) — keep native 3840×2160:');
console.log(`    ffmpeg -framerate ${FPS} -i ${OUT}/frame_%0${PAD}d.png -c:v prores_ks -profile:v 3 -pix_fmt yuv422p10le captures/manager-os-cinematic-3840.mov`);
console.log('  ProRes 422 HQ at 1920×1080 (smaller):');
console.log(`    ffmpeg -framerate ${FPS} -i ${OUT}/frame_%0${PAD}d.png -vf scale=1920:1080:flags=lanczos -c:v prores_ks -profile:v 3 -pix_fmt yuv422p10le captures/manager-os-cinematic.mov`);
