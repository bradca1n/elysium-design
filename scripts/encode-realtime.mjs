// Encode the real-time captured frames into MP4 + ProRes.
// Uses ffmpeg's concat demuxer with per-frame durations so the output
// preserves the exact timing the browser produced.

import ffmpegInstaller from '@ffmpeg-installer/ffmpeg';
import { spawn } from 'node:child_process';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { existsSync, mkdirSync } from 'node:fs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = resolve(__dirname, '..');
const CONCAT = resolve(PROJECT_ROOT, 'captures', 'frames.concat.txt');
const FRAMES_DIR = resolve(PROJECT_ROOT, 'captures', 'frames');
const OUT = resolve(PROJECT_ROOT, 'captures');

if (!existsSync(CONCAT)) {
  console.error(`[encode-rt] missing ${CONCAT} — run capture-cinematic-realtime.mjs first`);
  process.exit(1);
}

mkdirSync(OUT, { recursive: true });
const ffmpeg = ffmpegInstaller.path;
console.log('[encode-rt] using ffmpeg:', ffmpeg);

function run(args, label) {
  return new Promise((resolveProm, rejectProm) => {
    console.log(`\n[encode-rt] ${label}`);
    const t0 = Date.now();
    const child = spawn(ffmpeg, args, { stdio: ['ignore', 'inherit', 'inherit'], cwd: FRAMES_DIR });
    child.on('close', code => {
      if (code === 0) {
        console.log(`[encode-rt] ${label} done in ${((Date.now() - t0) / 1000).toFixed(1)}s`);
        resolveProm();
      } else rejectProm(new Error(`${label} exit ${code}`));
    });
  });
}

// Concat demuxer input — preserves per-frame timing the browser produced.
const inputArgs = [
  '-f', 'concat',
  '-safe', '0',
  '-i', CONCAT,
  // Force constant 60fps output, with frame duplication where browser dropped frames.
  '-vsync', 'cfr',
  '-r', '60',
];

// 1) MP4 H.264 at 1920×1080
await run([
  ...inputArgs,
  '-vf', 'scale=1920:1080:flags=lanczos',
  '-c:v', 'libx264',
  '-pix_fmt', 'yuv420p',
  '-crf', '17',
  '-preset', 'slow',
  '-movflags', '+faststart',
  '-y',
  resolve(OUT, 'manager-os-cinematic.mp4'),
], 'MP4 H.264 @ 1920×1080');

// 2) ProRes 422 HQ at 1920×1080
await run([
  ...inputArgs,
  '-vf', 'scale=1920:1080:flags=lanczos',
  '-c:v', 'prores_ks',
  '-profile:v', '3',
  '-pix_fmt', 'yuv422p10le',
  '-y',
  resolve(OUT, 'manager-os-cinematic.mov'),
], 'ProRes 422 HQ @ 1920×1080');

// 3) Native-resolution ProRes (3840×2160) for editorial flexibility
await run([
  ...inputArgs,
  '-c:v', 'prores_ks',
  '-profile:v', '3',
  '-pix_fmt', 'yuv422p10le',
  '-y',
  resolve(OUT, 'manager-os-cinematic-3840.mov'),
], 'ProRes 422 HQ @ 3840×2160 (native)');

console.log('\n[encode-rt] all outputs ready in', OUT);
