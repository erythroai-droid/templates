#!/usr/bin/env node
/**
 * Extract WebP frame packs from a source video into public/frames/assembly/{768,1280,1920} (wide screens)
 * and a centre-cropped 540x960 portrait pack into public/frames/portrait/540 (phones).
 *
 * Usage:
 *   npm run frames -- path/to/video.mov
 *   npm run frames -- path/to/video.mp4 --every 2     (default 2: smooth enough to show one sharp frame at a time)
 *
 * Requires ffmpeg on PATH (or set FFMPEG env to the binary).
 * After a successful run: set FRAMES=<count> and bump FRAMES_VERSION in lib/site.ts, retime SCENES from a contact sheet.
 * If the video ends on a still shot, delete the still tail from every pack (same numbers) and set FRAMES accordingly.
 */
import { existsSync, mkdirSync, readdirSync, rmSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2).filter((a) => a !== '--');
const everyIdx = args.indexOf('--every');
const every = everyIdx >= 0 ? Number(args[everyIdx + 1] || 2) : 2;
const input = args.find((a, i) => i !== everyIdx && i !== everyIdx + 1);

if (!input) {
  console.error('Usage: npm run frames -- <video> [--every 3]');
  process.exit(1);
}

const video = resolve(input);
if (!existsSync(video)) {
  console.error('Video not found:', video);
  process.exit(1);
}

const ff = process.env.FFMPEG || 'ffmpeg';
const outRoot = join(root, 'public', 'frames', 'assembly');
const portraitDir = join(root, 'public', 'frames', 'portrait', '540');
for (const dir of [...[768, 1280, 1920].map((size) => join(outRoot, String(size))), portraitDir]) {
  mkdirSync(dir, { recursive: true });
  for (const f of readdirSync(dir).filter((n) => n.endsWith('.webp'))) rmSync(join(dir, f));
}

const filter =
  `[0:v]select='not(mod(n\\,${every}))',setpts=N/TB,split=3[a][b][c];` +
  `[a]scale=1920:1080:flags=lanczos[A];` +
  `[b]scale=1280:720:flags=lanczos[B];` +
  `[c]scale=768:432:flags=lanczos[C]`;

const q = (n) => String(n);
const cmd = [
  '-y', '-i', video,
  '-filter_complex', filter,
  '-map', '[A]', '-fps_mode', 'passthrough', '-c:v', 'libwebp', '-quality', '82',
  join(outRoot, '1920', 'frame_%04d.webp'),
  '-map', '[B]', '-fps_mode', 'passthrough', '-c:v', 'libwebp', '-quality', '82',
  join(outRoot, '1280', 'frame_%04d.webp'),
  '-map', '[C]', '-fps_mode', 'passthrough', '-c:v', 'libwebp', '-quality', '80',
  join(outRoot, '768', 'frame_%04d.webp'),
];

console.log('Running', ff, '…');
const r = spawnSync(ff, cmd, { stdio: 'inherit' });
if (r.error || r.status !== 0) {
  console.error(r.error || `ffmpeg exited ${r.status}`);
  process.exit(r.status || 1);
}

// phones: a 9:16 window from the centre of the frame
const rp = spawnSync(ff, ['-y', '-i', video, '-vf',
  `select='not(mod(n\,${every}))',setpts=N/TB,crop=ih*9/16:ih:(iw-ih*9/16)/2:0,scale=540:960:flags=lanczos`,
  '-fps_mode', 'passthrough', '-c:v', 'libwebp', '-quality', '58', join(portraitDir, 'frame_%04d.webp')], { stdio: 'inherit' });
if (rp.error || rp.status !== 0) { console.error(rp.error || `ffmpeg (portrait) exited ${rp.status}`); process.exit(rp.status || 1); }

const count = readdirSync(join(outRoot, '1920')).filter((n) => n.endsWith('.webp')).length;
console.log(`Wrote ${count} frames × 3 landscape sizes + the 540x960 portrait pack`);
console.log('Next: FRAMES=' + count + ' and a new FRAMES_VERSION in lib/site.ts, then retime SCENES');
