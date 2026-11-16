#!/usr/bin/env node
/**
 * Record a scroll walkthrough of the site as a .webm — raw footage for ad creatives / Reels / client previews.
 *
 * One-time setup (kept out of package.json so Vercel never installs it):
 *   npm i --no-save playwright && npx playwright install chromium
 *
 * Usage (site running: npm run dev, or a deployed URL):
 *   npm run record-demo                                   → desktop 1440x900 of http://localhost:3200
 *   npm run record-demo -- --mobile                       → phone 390x844 (static layout + mobile hero clip)
 *   npm run record-demo -- --url https://acme-x1.erythro.ai --lang he --out demo-he.webm
 *
 * Output goes to ./recordings/ (git-ignored). Convert for Meta/TikTok: ffmpeg -i in.webm -c:v libx264 -pix_fmt yuv420p out.mp4
 */
import { mkdir, readdir, rename, unlink } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

let chromium;
try { ({ chromium } = await import('playwright')); } catch {
  console.error('playwright is not installed. Run: npm i --no-save playwright && npx playwright install chromium');
  process.exit(1);
}

const arg = (k, d) => { const i = process.argv.indexOf(`--${k}`); return i > -1 ? process.argv[i + 1] : d; };
const mobile = process.argv.includes('--mobile');
const lang = arg('lang', 'en');
const base = arg('url', process.env.DEMO_URL || 'http://localhost:3200/');
const url = `${base}${base.includes('?') ? '&' : '?'}lang=${lang}`;
const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const outDir = path.join(root, 'recordings');
const outFile = path.join(outDir, arg('out', `demo-${mobile ? 'mobile' : 'desktop'}-${lang}.webm`));
const size = mobile ? { width: 390, height: 844 } : { width: 1440, height: 900 };

await mkdir(outDir, { recursive: true });
const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({
  viewport: size,
  deviceScaleFactor: mobile ? 2 : 1,
  isMobile: mobile,
  hasTouch: mobile,
  recordVideo: { dir: outDir, size },
});
// keep the demo card from covering the footage
await context.addInitScript(() => { try { sessionStorage.setItem('demo-notice', ''); } catch { /* */ } });
const page = await context.newPage();
const sleep = (ms) => page.waitForTimeout(ms);

console.log('open', url);
await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 120_000 });
// wait out the preloader (frame pack) — max 60 s
await page.waitForFunction(() => {
  const pre = document.querySelector('.pre');
  return !pre || pre.classList.contains('done') || getComputedStyle(pre).opacity === '0';
}, { timeout: 60_000 }).catch(() => {});
await sleep(mobile ? 9_500 : 2_200);   // phones: let the hero assembly clip play out

const scrollBy = async (dy, steps = 24, stepMs = 40) => {
  for (let i = 0; i < steps; i++) { await page.mouse.wheel(0, dy / steps); await sleep(stepMs); }
};

if (!mobile) {
  for (let i = 0; i < 18; i++) { await scrollBy(520, 20, 36); await sleep(280); }   // assembly scrub
  await sleep(1600);
}
for (let i = 0; i < 14; i++) { await scrollBy(mobile ? 500 : 680, 22, 38); await sleep(350); }   // sections
await page.evaluate(() => window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' }));
await sleep(2500);

const vid = page.video();
await page.close();
const tmp = await vid.path();
await context.close();
await browser.close();

await rename(tmp, outFile);
for (const f of await readdir(outDir)) {
  const p = path.join(outDir, f);
  if (f.endsWith('.webm') && p !== outFile && !f.startsWith('demo-')) await unlink(p).catch(() => {});
}
console.log('saved', path.relative(root, outFile));
