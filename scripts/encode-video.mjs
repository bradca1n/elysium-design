// Re-encode the Playwright-recorded WebM to MP4 (H.264) and ProRes.

import ffmpegInstaller from '@ffmpeg-installer/ffmpeg';
import { spawn } from 'node:child_process';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { existsSync, mkdirSync } from 'node:fs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = resolve(__dirname, '..');
const SRC = resolve(PROJECT_ROOT, 'captures', 'video', 'manager-os-cinematic.webm');
const OUT = resolve(PROJECT_ROOT, 'output');

if (!existsSync(SRC)) {
  console.error(`[encode] missing ${SRC} — run capture-cinematic-video.mjs first`);
  process.exit(1);
}

mkdirSync(OUT, { recursive: true });
const ffmpeg = ffmpegInstaller.path;
console.log('[encode] using ffmpeg:', ffmpeg);

function run(args, label) {
  return new Promise((resolveProm, rejectProm) => {
    console.log(`\n[encode] ${label}`);
    const t0 = Date.now();
    const child = spawn(ffmpeg, args, { stdio: ['ignore', 'inherit', 'inherit'] });
    child.on('close', code => {
      if (code === 0) {
        console.log(`[encode] ${label} done in ${((Date.now() - t0) / 1000).toFixed(1)}s`);
        resolveProm();
      } else rejectProm(new Error(`${label} exit ${code}`));
    });
  });
}

// MP4 H.264 at native fps
await run([
  '-i', SRC,
  '-c:v', 'libx264',
  '-pix_fmt', 'yuv420p',
  '-crf', '17',
  '-preset', 'slow',
  '-movflags', '+faststart',
  '-y',
  resolve(OUT, 'manager-os-cinematic.mp4'),
], 'MP4 H.264');

// ProRes 422 HQ at native fps
await run([
  '-i', SRC,
  '-c:v', 'prores_ks',
  '-profile:v', '3',
  '-pix_fmt', 'yuv422p10le',
  '-y',
  resolve(OUT, 'manager-os-cinematic.mov'),
], 'ProRes 422 HQ');

console.log('\n[encode] all outputs ready in', OUT);
