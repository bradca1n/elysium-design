// Encode the captured PNG frames into MP4 (H.264) and ProRes 422 HQ.
// Uses the static ffmpeg binary from @ffmpeg-installer/ffmpeg so this
// works without a system-wide ffmpeg install.

import ffmpegInstaller from '@ffmpeg-installer/ffmpeg';
import { spawn } from 'node:child_process';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { mkdirSync, existsSync } from 'node:fs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = resolve(__dirname, '..');
const FRAMES = resolve(PROJECT_ROOT, 'captures', 'frames');
const OUT_DIR = resolve(PROJECT_ROOT, 'captures');
const FPS = 60;
const PAD = 5;

if (!existsSync(FRAMES)) {
  console.error(`[encode] no frames at ${FRAMES} — run capture-cinematic.mjs first`);
  process.exit(1);
}

mkdirSync(OUT_DIR, { recursive: true });
const ffmpeg = ffmpegInstaller.path;
console.log('[encode] using ffmpeg:', ffmpeg);

function run(args, label) {
  return new Promise((resolveProm, rejectProm) => {
    console.log(`\n[encode] ${label}`);
    console.log('  ' + ffmpeg + ' ' + args.join(' '));
    const t0 = Date.now();
    const child = spawn(ffmpeg, args, { stdio: ['ignore', 'inherit', 'inherit'] });
    child.on('close', code => {
      if (code === 0) {
        console.log(`[encode] ${label} done in ${((Date.now() - t0) / 1000).toFixed(1)}s`);
        resolveProm();
      } else {
        rejectProm(new Error(`${label} exit ${code}`));
      }
    });
  });
}

const input = ['-framerate', String(FPS), '-i', `${FRAMES}/frame_%0${PAD}d.png`];

// 1) MP4 H.264 at 1920×1080 (lanczos downscale from the 3840×2160 captures)
await run([
  ...input,
  '-vf', 'scale=1920:1080:flags=lanczos',
  '-c:v', 'libx264',
  '-pix_fmt', 'yuv420p',
  '-crf', '17',
  '-preset', 'slow',
  '-movflags', '+faststart',
  '-y',
  resolve(OUT_DIR, 'manager-os-cinematic.mp4'),
], 'MP4 H.264 @ 1920×1080');

// 2) ProRes 422 HQ at 1920×1080
await run([
  ...input,
  '-vf', 'scale=1920:1080:flags=lanczos',
  '-c:v', 'prores_ks',
  '-profile:v', '3',
  '-pix_fmt', 'yuv422p10le',
  '-y',
  resolve(OUT_DIR, 'manager-os-cinematic.mov'),
], 'ProRes 422 HQ @ 1920×1080');

// 3) Also keep native-resolution ProRes (3840×2160) for editorial flexibility
await run([
  ...input,
  '-c:v', 'prores_ks',
  '-profile:v', '3',
  '-pix_fmt', 'yuv422p10le',
  '-y',
  resolve(OUT_DIR, 'manager-os-cinematic-3840.mov'),
], 'ProRes 422 HQ @ 3840×2160 (native)');

console.log('\n[encode] all outputs ready in', OUT_DIR);
