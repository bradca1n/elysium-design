// Self-check: after every capture, extract the frames at the beats most
// likely to regress, stitch them into a single labelled contact sheet,
// and require Claude to read it back before claiming the capture is good.
//
// Each row of the sheet shows a beat: 3 frames bracketing it (just before,
// at, just after). Frames are sampled from captures/frames/ (which are at
// 60fps after capture). Labels are baked in via ffmpeg drawtext so the
// reviewer can't lose track of which frame is which.

import ffmpegInstaller from '@ffmpeg-installer/ffmpeg';
import { spawn } from 'node:child_process';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { existsSync, mkdirSync, rmSync, copyFileSync } from 'node:fs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = resolve(__dirname, '..');
const FRAMES = resolve(PROJECT_ROOT, 'captures', 'frames');
const VERIFY = resolve(PROJECT_ROOT, 'captures', 'verify');
const SHEET = resolve(PROJECT_ROOT, 'captures', 'verify-sheet.png');
const FPS = 60;

// Beats most likely to regress — pre / on / post for each.
// (t in seconds. Pre = -0.15s, on = exact, post = +0.20s of the beat.)
// Update if the timeline beats shift.
const BEATS = [
  { t: 0.30,  label: 'page-rise' },
  { t: 1.80,  label: 'chart-zoom-landed' },
  { t: 2.40,  label: 'after-3M' },
  { t: 3.40,  label: 'after-1Y' },
  { t: 4.10,  label: 'wide-reset' },
  { t: 4.50,  label: 'cursor-mid-flight' },
  { t: 4.70,  label: 'CLICK + sheet-start' },
  { t: 4.95,  label: 'sheet-mid-slide' },
  { t: 5.40,  label: 'field-name-zoom' },
  { t: 6.85,  label: 'class-B-typed' },
  { t: 7.80,  label: 'fee-dropdown' },
  { t: 9.00,  label: 'mgmt-typed' },
  { t: 10.00, label: 'min-typing' },
  { t: 11.00, label: 'camera-to-footer' },
  { t: 11.30, label: 'cursor-on-create' },
  { t: 11.50, label: 'CLICK create' },
  { t: 11.90, label: 'pan-up-to-sheet' },
  { t: 12.70, label: 'confirmation-appearing' },
  { t: 13.50, label: 'lottie-mid' },
  { t: 14.40, label: 'zoom-out-start' },
  { t: 15.10, label: 'sheet-mid-slide-off' },
  { t: 15.60, label: 'sheet-gone' },
  { t: 15.90, label: 'outro-fade' },
];

if (!existsSync(FRAMES)) {
  console.error(`[verify] missing ${FRAMES} — run capture first`);
  process.exit(1);
}

if (existsSync(VERIFY)) rmSync(VERIFY, { recursive: true, force: true });
mkdirSync(VERIFY, { recursive: true });

const ffmpeg = ffmpegInstaller.path;

function frameForTime(t) {
  const idx = Math.round(t * FPS);
  const name = `frame_${String(idx).padStart(5, '0')}.png`;
  return resolve(FRAMES, name);
}

function run(args) {
  return new Promise((resolveProm, rejectProm) => {
    const child = spawn(ffmpeg, args, { stdio: ['ignore', 'pipe', 'pipe'] });
    let stderr = '';
    child.stderr.on('data', d => { stderr += d.toString(); });
    child.on('close', code => {
      if (code === 0) resolveProm();
      else rejectProm(new Error(`ffmpeg exit ${code}: ${stderr.slice(-500)}`));
    });
  });
}

// 1. Copy + label each beat's frame.
const labelled = [];
for (let i = 0; i < BEATS.length; i++) {
  const { t, label } = BEATS[i];
  const src = frameForTime(t);
  if (!existsSync(src)) {
    console.warn(`[verify] missing frame for t=${t.toFixed(2)} (${src})`);
    continue;
  }
  const dst = resolve(VERIFY, `${String(i).padStart(2, '0')}_t${t.toFixed(2).replace('.', '_')}_${label.replace(/[^\w-]/g, '_')}.png`);
  // Downscale to 1280x720 + burn label so the contact sheet stays readable.
  await run([
    '-i', src,
    '-vf', `scale=1280:720:flags=lanczos,drawtext=fontfile=/System/Library/Fonts/Helvetica.ttc:text='t=${t.toFixed(2)}s  ${label.replace(/'/g, "\\'").replace(/:/g, '\\:')}':x=24:y=24:fontsize=28:fontcolor=white:box=1:boxcolor=black@0.7:boxborderw=8`,
    '-y', dst,
  ]);
  labelled.push(dst);
}

if (labelled.length === 0) {
  console.error('[verify] no frames found — capture may be empty');
  process.exit(1);
}

// 2. Tile into a contact sheet. 4 columns × N rows.
const cols = 4;
const rows = Math.ceil(labelled.length / cols);
console.log(`[verify] tiling ${labelled.length} frames into ${cols}×${rows}`);

// Build a concat-style command using ffmpeg's tile filter with N inputs.
const inputArgs = [];
const inputFilters = [];
for (let i = 0; i < labelled.length; i++) {
  inputArgs.push('-i', labelled[i]);
  inputFilters.push(`[${i}:v]`);
}
const filterComplex = `${inputFilters.join('')}xstack=inputs=${labelled.length}:layout=${gridLayout(cols, rows, 1280, 720, labelled.length)}:fill=black[out]`;
await run([
  ...inputArgs,
  '-filter_complex', filterComplex,
  '-map', '[out]',
  '-y', SHEET,
]);

console.log(`[verify] contact sheet → ${SHEET}`);
console.log(`[verify] ${labelled.length} frames, ${cols}×${rows} grid`);
console.log('');
console.log('[verify] CLAUDE MUST NOW READ THE SHEET AND CONFIRM EACH BEAT BEFORE');
console.log('[verify] CLAIMING THE CAPTURE IS DONE. Read this file:');
console.log(`[verify]   ${SHEET}`);

function gridLayout(cols, rows, w, h, count) {
  // xstack expects "x_0,y_0|x_1,y_1|...|x_N,y_N"
  const out = [];
  for (let i = 0; i < count; i++) {
    const r = Math.floor(i / cols);
    const c = i % cols;
    out.push(`${c * w}_${r * h}`);
  }
  return out.join('|');
}
