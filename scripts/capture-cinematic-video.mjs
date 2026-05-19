// Real-time video capture via Playwright's recordVideo.
// Runs the timeline at 1× wall-clock speed and lets the browser
// record its own viewport at a fixed framerate (Playwright defaults to
// ~25-30fps WebM). Output is a WebM that we then re-encode to MP4.
//
// Trade-off vs frame-scrubbed capture: lower native fps but no
// dynamic-tween-drift issue because everything runs in real time.

import { chromium } from 'playwright';
import { mkdirSync, rmSync, existsSync, renameSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = resolve(__dirname, '..');
const BUNDLE = resolve(PROJECT_ROOT, 'mockups', 'manager-os-nav', 'manager-os-nav-bundle.html');
const OUT_DIR = resolve(PROJECT_ROOT, 'captures', 'video');

if (existsSync(OUT_DIR)) rmSync(OUT_DIR, { recursive: true, force: true });
mkdirSync(OUT_DIR, { recursive: true });

console.log('[video] launching chromium');
const browser = await chromium.launch();
const ctx = await browser.newContext({
  viewport: { width: 1920, height: 1080 },
  deviceScaleFactor: 2,
  recordVideo: {
    dir: OUT_DIR,
    size: { width: 1920, height: 1080 },
  },
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
console.log('[video] loading', url);
await page.goto(url, { waitUntil: 'domcontentloaded' });
await page.waitForFunction(() => !!window.cineTimeline, { timeout: 20000 });
await page.waitForFunction(() => !!document.querySelector('[data-cine="chart"]'), { timeout: 10000 });

const duration = await page.evaluate(() => window.cineTimeline.duration());
console.log(`[video] timeline duration ${duration.toFixed(2)}s — playing in real time`);

// Reset to t=0 at full speed
await page.evaluate(() => {
  window.cineTimeline.timeScale(1);
  window.cineTimeline.time(0);
  return null;
});

// Brief settle so the recorder is fully primed before the timeline starts
await page.waitForTimeout(200);

// Kick off playback
const startedAt = Date.now();
await page.evaluate(() => { window.cineTimeline.play(); return null; });

// Wait for the timeline to complete (plus a small tail for the recorder)
await page.waitForFunction(() => window.cineTimeline.progress() >= 1, { timeout: 60000 });
await page.waitForTimeout(300);
const finishedAt = Date.now();
console.log(`[video] timeline finished in ${((finishedAt - startedAt) / 1000).toFixed(2)}s wall-clock`);

// Close context to flush the recording
await ctx.close();
await browser.close();

// Rename the auto-generated webm to a predictable name
const fs = await import('node:fs');
const files = fs.readdirSync(OUT_DIR).filter(f => f.endsWith('.webm'));
if (files.length === 0) {
  console.error('[video] no .webm written — check Playwright recorder logs');
  process.exit(1);
}
const src = resolve(OUT_DIR, files[0]);
const dst = resolve(OUT_DIR, 'manager-os-cinematic.webm');
if (src !== dst) renameSync(src, dst);
console.log(`[video] wrote → ${dst}`);
console.log('\n[video] re-encode to MP4 + ProRes with: node encode-video.mjs');
