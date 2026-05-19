// Spot-check preview. Loads the bundle in cinematic mode, scrubs the
// timeline to a handful of representative timestamps, screenshots each.
// Used for Claude-side visual review during development.

import { chromium } from 'playwright';
import { mkdirSync, rmSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = resolve(__dirname, '..');
const BUNDLE = resolve(PROJECT_ROOT, 'mockups', 'manager-os-nav', 'manager-os-nav-bundle.html');
const OUT = resolve(PROJECT_ROOT, 'captures', 'preview');

const FRAMES = [
  { t: 0.30, label: 'page-rise' },
  { t: 0.80, label: 'wide-establish' },
  { t: 1.80, label: 'chart-zoom-landed' },
  { t: 2.40, label: 'after-3M-click' },
  { t: 3.40, label: 'after-1Y-click' },
  { t: 4.10, label: 'wide-reset-landed' },
  { t: 4.50, label: 'pan-to-CTA' },
  { t: 5.30, label: 'sheet-just-landed' },
  { t: 6.25, label: 'field-name-landed' },
  { t: 6.85, label: 'class-B-typed' },
  { t: 7.80, label: 'fee-tier-dropdown' },
  { t: 8.40, label: 'field-mgmt-landed' },
  { t: 9.00, label: 'mgmt-typed' },
  { t: 9.30, label: 'perf-typed' },
  { t: 10.00, label: 'min-investment-typing' },
  { t: 11.30, label: 'at-footer-cursor' },
  { t: 11.90, label: 'create-click' },
  { t: 12.70, label: 'confirmation-appearing' },
  { t: 13.50, label: 'lottie-mid' },
  { t: 14.90, label: 'zoom-out-mid' },
  { t: 15.50, label: 'slide-off-mid' },
  { t: 15.90, label: 'outro-fade' },
];

if (existsSync(OUT)) rmSync(OUT, { recursive: true, force: true });
mkdirSync(OUT, { recursive: true });

console.log('[preview] launching chromium');
const browser = await chromium.launch();
const ctx = await browser.newContext({
  viewport: { width: 1920, height: 1080 },
  // DSF=2 so text rasterises at 2× density before the camera's CSS
  // transform scales it up. PNGs come out 3840×2160; downscale in ffmpeg.
  deviceScaleFactor: 2,
});
const page = await ctx.newPage();

page.on('console', msg => {
  const text = msg.text();
  if (text.startsWith('[cine]')) console.log('  page:', text);
});

// Force Overview route before load (default is 'nav') and disable auto-play.
await page.addInitScript(() => {
  try { localStorage.setItem('mos.route', 'overview'); } catch {}
  window.__CINE_NO_AUTOPLAY = true;
});

const url = `file://${BUNDLE}?cine=1`;
console.log('[preview] loading', url);
// domcontentloaded fires faster and is reliable on file://;
// networkidle never resolves due to giscus/SRI cross-origin blocks.
await page.goto(url, { waitUntil: 'domcontentloaded' });
console.log('[preview] DOM ready, waiting for timeline + chart');

console.log('[preview] waitForFunction: cineTimeline');
await page.waitForFunction(() => !!window.cineTimeline, { timeout: 20000 });
console.log('[preview] cineTimeline ready');

console.log('[preview] waitForFunction: chart');
await page.waitForFunction(() => !!document.querySelector('[data-cine="chart"]'), { timeout: 10000 });
console.log('[preview] chart ready');

console.log('[preview] checking route');
const route = await page.evaluate(() => localStorage.getItem('mos.route'));
console.log('[preview] route =', route);

console.log('[preview] pausing timeline');
// Wrap in block to avoid serialising GSAP's return object back over CDP
await page.evaluate(() => { window.cineTimeline.pause(); return null; });
console.log('[preview] timeline paused, scrubbing frames');

for (const { t, label } of FRAMES) {
  await page.evaluate((time) => { window.cineTimeline.time(time); return null; }, t);
  await page.evaluate(() => new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r))));
  // For sheet-related frames, wait one more tick so React commits.
  if (t > 3.5) await page.waitForTimeout(50);
  const fname = `t${String(t).padStart(5, '0').replace('.', '_')}-${label}.png`;
  await page.screenshot({ path: `${OUT}/${fname}`, omitBackground: false });
  console.log(`  t=${t.toFixed(2)}s  ${label}  →  ${fname}`);
}

await browser.close();
console.log('[preview] done →', OUT);
