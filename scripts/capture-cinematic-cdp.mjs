// Frame-by-frame capture using CDP virtual time + HeadlessExperimental.beginFrame.
// This is the documented pattern for deterministic headless rendering:
//   1. Pause virtual time so the page's clock doesn't auto-advance.
//   2. Per frame: send beginFrame with a controlled frameTimeTicks and
//      screenshot option. beginFrame forces a composite, advances time
//      to that frame's tick, and returns the rendered screenshot in one
//      atomic CDP call. Avoids the captureScreenshot hang that occurs
//      when no composite is happening.
// All time-driven animations (GSAP, CSS transitions, Lottie) advance in
// lockstep with frameTimeTicks.

import { chromium } from 'playwright';
import { mkdirSync, rmSync, existsSync, writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = resolve(__dirname, '..');
const BUNDLE = resolve(PROJECT_ROOT, 'mockups', 'manager-os-nav', 'manager-os-nav-bundle.html');
const OUT = resolve(PROJECT_ROOT, 'captures', 'frames');

const FPS = 60;
const FRAME_MS = 1000 / FPS;
const PAD = 5;

console.log('[cdp-capture] launching chromium');
const browser = await chromium.launch();
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

const url = `file://${BUNDLE}?cine=1`;
console.log('[cdp-capture] loading', url);
await page.goto(url, { waitUntil: 'domcontentloaded' });
await page.waitForFunction(() => !!window.cineTimeline, { timeout: 20000 });
await page.waitForFunction(() => !!document.querySelector('[data-cine="chart"]'), { timeout: 10000 });

const client = await ctx.newCDPSession(page);

const duration = await page.evaluate(() => window.cineTimeline.duration());
const frameCount = Math.ceil(duration * FPS);
console.log(`[cdp-capture] duration=${duration.toFixed(2)}s × ${FPS}fps = ${frameCount} frames`);

if (existsSync(OUT)) rmSync(OUT, { recursive: true, force: true });
mkdirSync(OUT, { recursive: true });

// Reset timeline cleanly
await page.evaluate(() => {
  window.cineTimeline.timeScale(1);
  window.cineTimeline.time(0);
  window.cineTimeline.pause();
  return null;
});

// Pause the page's clock
await client.send('Emulation.setVirtualTimePolicy', { policy: 'pause' });

// Start the timeline playing (no actual ticking until beginFrame advances time)
await page.evaluate(() => { window.cineTimeline.play(); return null; });

const startedAt = Date.now();
let virtualTime = 0;

for (let i = 0; i < frameCount; i++) {
  virtualTime += FRAME_MS;
  const result = await client.send('HeadlessExperimental.beginFrame', {
    frameTimeTicks: virtualTime,
    interval: FRAME_MS,
    screenshot: { format: 'png' },
  });
  if (result.screenshotData) {
    const fname = `frame_${String(i).padStart(PAD, '0')}.png`;
    writeFileSync(`${OUT}/${fname}`, Buffer.from(result.screenshotData, 'base64'));
  } else if (i < 3) {
    console.warn(`  frame ${i}: beginFrame returned no screenshotData (hasDamage=${result.hasDamage})`);
  }
  if (i % 60 === 0) {
    const elapsed = ((Date.now() - startedAt) / 1000).toFixed(1);
    console.log(`  ${i}/${frameCount}  t=${(virtualTime / 1000).toFixed(2)}s  ${elapsed}s elapsed`);
  }
}

await browser.close();
console.log(`[cdp-capture] done — ${frameCount} frames → ${OUT}`);
console.log('\n[cdp-capture] re-encode with: node encode-cinematic.mjs');
