// Diagnostic — capture only 60 frames via HeadlessExperimental.beginFrame.

import { chromium } from 'playwright';
import { mkdirSync, rmSync, existsSync, writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = resolve(__dirname, '..');
const BUNDLE = resolve(PROJECT_ROOT, 'mockups', 'manager-os-nav', 'manager-os-nav-bundle.html');
const OUT = resolve(PROJECT_ROOT, 'captures', 'frames-test');

const FRAMES = 90;  // 1.5 seconds — should cover chart-zoom-in completion
const FRAME_MS = 1000 / 60;

// --enable-begin-frame-control unlocks HeadlessExperimental.beginFrame.
// --disable-features=PaintHolding to avoid composition pauses.
// Use the full chromium binary (not the slimmed-down headless_shell which
// Playwright defaults to), since beginFrame needs the complete compositor.
// Required flags:
//   --enable-begin-frame-control: allow CDP to drive BeginFrame
//   --run-all-compositor-stages-before-draw: wait for stages to complete
//   --disable-features=PaintHolding: skip FCP paint-holding pause
const FULL_CHROMIUM = '/Users/brad/Library/Caches/ms-playwright/chromium-1223/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing';
const browser = await chromium.launch({
  executablePath: FULL_CHROMIUM,
  args: [
    '--enable-begin-frame-control',
    '--run-all-compositor-stages-before-draw',
    '--disable-features=PaintHolding',
  ],
});
const ctx = await browser.newContext({
  viewport: { width: 1920, height: 1080 },
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

await page.goto(`file://${BUNDLE}?cine=1`, { waitUntil: 'domcontentloaded' });
await page.waitForFunction(() => !!window.cineTimeline, { timeout: 20000 });
await page.waitForFunction(() => !!document.querySelector('[data-cine="chart"]'), { timeout: 10000 });

const client = await ctx.newCDPSession(page);

if (existsSync(OUT)) rmSync(OUT, { recursive: true, force: true });
mkdirSync(OUT, { recursive: true });

await page.evaluate(() => {
  window.cineTimeline.timeScale(1);
  window.cineTimeline.time(0);
  window.cineTimeline.pause();
  return null;
});

await client.send('Emulation.setVirtualTimePolicy', { policy: 'pause' });
await page.evaluate(() => { window.cineTimeline.play(); return null; });

const startedAt = Date.now();
let virtualTime = 0;
let totalShot = 0;

for (let i = 0; i < FRAMES; i++) {
  virtualTime += FRAME_MS;
  const tA = Date.now();
  const result = await client.send('HeadlessExperimental.beginFrame', {
    frameTimeTicks: virtualTime,
    interval: FRAME_MS,
    screenshot: { format: 'png' },
  });
  const tB = Date.now();
  totalShot += tB - tA;

  if (result.screenshotData) {
    writeFileSync(`${OUT}/frame_${String(i).padStart(3, '0')}.png`, Buffer.from(result.screenshotData, 'base64'));
  }

  if (i % 10 === 0) {
    console.log(`  frame ${i}  t=${(virtualTime / 1000).toFixed(3)}s  beginFrame=${tB - tA}ms  hasShot=${!!result.screenshotData}`);
  }
}

const elapsed = ((Date.now() - startedAt) / 1000).toFixed(1);
console.log(`\nCaptured ${FRAMES} frames in ${elapsed}s`);
console.log(`  avg beginFrame: ${(totalShot / FRAMES).toFixed(1)}ms per frame`);

await browser.close();
