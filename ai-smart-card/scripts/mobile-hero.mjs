#!/usr/bin/env node
/**
 * Cut the phone hero clip from the assembly master: portrait 720x980 H.264 (no audio, faststart) + first/last frame webp.
 * Writes public/video/hero-assembly-m.mp4, hero-assembly-m-poster.webp, hero-assembly-m-end.webp (MOBILE_HERO in lib/site.ts).
 *
 * Usage:
 *   npm run mobile-hero -- path/to/assembly.mov                      → whole video sped up to ~9 s
 *   npm run mobile-hero -- path/to/assembly.mov --dur 9 --x 0.55     → target length, horizontal crop centre (0..1)
 *
 * Phones leave ad landings within seconds: keep it ≤ 10 s and ≤ 2.5 MB (the script prints the size).
 * Requires ffmpeg + ffprobe on PATH (or FFMPEG / FFPROBE env).
 */
import { existsSync, mkdirSync, statSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2).filter((a) => a !== '--');
const opt = (k, d) => { const i = args.indexOf(`--${k}`); return i > -1 ? Number(args[i + 1]) : d; };
const input = args.find((a, i) => !a.startsWith('--') && !args[i - 1]?.startsWith('--'));
if (!input || !existsSync(resolve(input))) {
  console.error('Usage: npm run mobile-hero -- <video> [--dur 9] [--x 0.5] [--crf 26]');
  process.exit(1);
}
const ff = process.env.FFMPEG || 'ffmpeg';
const fp = process.env.FFPROBE || 'ffprobe';
const run = (bin, a) => {
  const r = spawnSync(bin, a, { stdio: ['ignore', 'pipe', 'inherit'] });
  if (r.status !== 0) { console.error(`${bin} failed`); process.exit(1); }
  return r.stdout.toString().trim();
};

const src = resolve(input);
const dur = Number(run(fp, ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', src]));
const target = opt('dur', 9);
const x = Math.min(1, Math.max(0, opt('x', 0.5)));
const speed = Math.max(1, dur / target);
const out = join(root, 'public', 'video');
mkdirSync(out, { recursive: true });

// scale to 980 tall, crop a 720-wide portrait window around x, retime to the target length
const vf = `setpts=PTS/${speed.toFixed(4)},scale=-2:980,crop=720:980:(iw-720)*${x}:0,fps=30`;
const mp4 = join(out, 'hero-assembly-m.mp4');
run(ff, ['-y', '-v', 'error', '-i', src, '-an', '-vf', vf, '-c:v', 'libx264', '-preset', 'slow', '-crf', String(opt('crf', 26)),
  '-pix_fmt', 'yuv420p', '-movflags', '+faststart', mp4]);
run(ff, ['-y', '-v', 'error', '-i', mp4, '-frames:v', '1', '-vf', 'scale=180:-2', '-q:v', '60', join(out, 'hero-assembly-m-poster.webp')]);
run(ff, ['-y', '-v', 'error', '-sseof', '-0.2', '-i', mp4, '-frames:v', '1', '-q:v', '82', join(out, 'hero-assembly-m-end.webp')]);

const mb = (statSync(mp4).size / 1024 / 1024).toFixed(2);
console.log(`hero-assembly-m.mp4: ${mb} MB, ${(dur / speed).toFixed(1)} s${Number(mb) > 2.5 ? '  ← over 2.5 MB, raise --crf' : ''}`);
console.log('Check the crop on a phone; MOBILE_HERO in lib/site.ts picks these up once STUB_MEDIA=false.');
