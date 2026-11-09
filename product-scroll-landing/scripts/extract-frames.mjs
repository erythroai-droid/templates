#!/usr/bin/env node
/**
 * Extract WebP frame packs from a source video into public/frames/assembly/{768,1280,1920}.
 *
 * Usage:
 *   npm run frames -- path/to/video.mov
 *   npm run frames -- path/to/video.mp4 --every 3
 *
 * Requires ffmpeg on PATH (or set FFMPEG env to the binary).
 * After a successful run: set STUB_MEDIA=false and FRAMES=<count> in lib/site.ts, retime PARTS.f.
 */
import { existsSync, mkdirSync, readdirSync, rmSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2).filter((a) => a !== '--');
const everyIdx = args.indexOf('--every');
const every = everyIdx >= 0 ? Number(args[everyIdx + 1] || 3) : 3;
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
for (const size of [768, 1280, 1920]) {
  const dir = join(outRoot, String(size));
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

const count = readdirSync(join(outRoot, '1920')).filter((n) => n.endsWith('.webp')).length;
console.log(`Wrote ${count} frames × 3 sizes under public/frames/assembly`);
console.log('Next: set STUB_MEDIA=false and FRAMES=' + count + ' in lib/site.ts, then retime PARTS.f');
