// Real-time capture via CDP Page.startScreencast.
// Plays the cinematic at 1× speed and grabs every rendered browser frame
// with its wall-clock timestamp. Encodes via ffmpeg with -vsync vfr +
// explicit per-frame timestamps so the output has the exact pacing the
// browser produced — what you see in the live preview is what you get.
// No frame scrubbing, no monkey-patches, no measurement-during-tween bugs.

import { chromium } from 'playwright';
import { mkdirSync, rmSync, existsSync, writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = resolve(__dirname, '..');
const BUNDLE = resolve(PROJECT_ROOT, 'mockups', 'manager-os-nav', 'manager-os-nav-bundle.html');
const OUT = resolve(PROJECT_ROOT, 'captures', 'frames');
const CONCAT = resolve(PROJECT_ROOT, 'captures', 'frames.concat.txt');

console.log('[realtime] launching chromium');
const browser = await chromium.launch({
  args: [
    '--window-size=1920,1080',
    '--force-device-scale-factor=2',
    // Helps eliminate vsync-related stutter that can drop frames under headless
    '--disable-frame-rate-limit',
    '--disable-gpu-vsync',
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
  // We DO want autoplay this time — real-time playback is the whole point.
  window.__CINE_NO_AUTOPLAY = false;
});

const url = `file://${BUNDLE}?cine=1`;
console.log('[realtime] loading', url);
await page.goto(url, { waitUntil: 'domcontentloaded' });
await page.waitForFunction(() => !!window.cineTimeline, { timeout: 20000 });
await page.waitForFunction(() => !!document.querySelector('[data-cine="chart"]'), { timeout: 10000 });

// Reset timeline to t=0 paused, full speed, and pause GSAP's global ticker
// so nothing animates until we explicitly press play below.
await page.evaluate(() => {
  window.cineTimeline.timeScale(1);
  window.cineTimeline.time(0);
  window.cineTimeline.pause();
  return null;
});

const duration = await page.evaluate(() => window.cineTimeline.duration());
console.log(`[realtime] timeline duration: ${duration.toFixed(2)}s`);

if (existsSync(OUT)) rmSync(OUT, { recursive: true, force: true });
mkdirSync(OUT, { recursive: true });

const client = await ctx.newCDPSession(page);

// Collect screencast frames as they arrive.
let frameCount = 0;
let firstFrameMs = null;
const frameTimings = [];  // [{ idx, t }] in seconds from first frame

client.on('Page.screencastFrame', async ({ data, sessionId, metadata }) => {
  const tsMs = metadata.timestamp * 1000;
  if (firstFrameMs === null) firstFrameMs = tsMs;
  const elapsed = (tsMs - firstFrameMs) / 1000;
  const idx = frameCount++;
  const fname = `frame_${String(idx).padStart(5, '0')}.png`;
  writeFileSync(resolve(OUT, fname), Buffer.from(data, 'base64'));
  frameTimings.push({ idx, t: elapsed, file: fname });
  // ACK so the next frame can come.
  try { await client.send('Page.screencastFrameAck', { sessionId }); } catch {}
});

// Settle the layout for a moment, then start screencast + timeline.
await page.waitForTimeout(400);

console.log('[realtime] starting screencast + timeline.play()');
await client.send('Page.startScreencast', {
  format: 'png',
  everyNthFrame: 1,
});

// Kick off the timeline. We're capturing in real time at 1× speed.
const startedAt = Date.now();
await page.evaluate(() => { window.cineTimeline.play(); return null; });

// Wait until the timeline has fully played + a small tail.
await page.waitForFunction(() => window.cineTimeline.progress() >= 1, { timeout: 60000 });
await page.waitForTimeout(300);

await client.send('Page.stopScreencast');
const elapsedWall = ((Date.now() - startedAt) / 1000).toFixed(2);
console.log(`[realtime] captured ${frameCount} frames in ${elapsedWall}s wall-clock`);

// Write a concat-demuxer manifest so ffmpeg can encode at constant 60fps
// while preserving the real per-frame timing (browser may have dropped
// frames during heavy moments — ffmpeg duplicates to fill).
const lines = ['ffconcat version 1.0'];
for (let i = 0; i < frameTimings.length; i++) {
  lines.push(`file '${frameTimings[i].file}'`);
  // Each frame's display duration = time until next frame
  const next = frameTimings[i + 1];
  const dur = next ? (next.t - frameTimings[i].t) : (1 / 60);
  lines.push(`duration ${dur.toFixed(6)}`);
}
// concat demuxer requires the last file to be specified twice
const last = frameTimings[frameTimings.length - 1];
if (last) lines.push(`file '${last.file}'`);
writeFileSync(CONCAT, lines.join('\n'));

await browser.close();
console.log(`[realtime] done — ${frameCount} frames + concat manifest at ${CONCAT}`);
console.log('[realtime] encode with: node encode-realtime.mjs');
