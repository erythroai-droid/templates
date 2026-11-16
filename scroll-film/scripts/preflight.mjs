#!/usr/bin/env node
/**
 * Pre-deploy check of a client site against the Scroll Film (scroll-film) template.
 * Run it by hand before a deploy. Nothing runs it automatically, and it never blocks anything: every finding is a
 * recommendation — what to fix is up to you. Exit code is always 0.
 *
 *   npm run preflight                          full check (template from GitHub, tsc)
 *   npm run preflight -- --build               + npm run build
 *   npm run preflight -- --url https://<slug>.erythro.ai   + live checks of a deployed / preview URL
 *   npm run preflight -- --template C:\dev\templates\scroll-film   compare with a local template copy
 *   npm run preflight -- --report              also write preflight-report.md
 *
 * ✖ important recommendation (likely visible to visitors / ads), ⚠ nice to fix, · info / manual steps.
 */
import { execFileSync, spawnSync } from 'node:child_process';
import { existsSync, mkdtempSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const argv = process.argv.slice(2).filter((a) => a !== '--');
const flag = (k) => argv.includes(`--${k}`);
const opt = (k) => { const i = argv.indexOf(`--${k}`); return i > -1 ? argv[i + 1] : undefined; };
const TEMPLATE_REPO = 'https://github.com/erythroai-droid/templates.git';
const TEMPLATE_DIR = 'scroll-film';

const P = (...a) => join(root, ...a);
const read = (p) => (existsSync(p) ? readFileSync(p, 'utf8').replace(/^\uFEFF/, '').replace(/\r\n/g, '\n') : null);
const MB = (b) => (b / 1024 / 1024).toFixed(2);

// ---------- report ----------
const out = [];
const counts = { err: 0, warn: 0 };
const section = (t) => out.push({ t: 'h', m: t });
const ok = (m) => out.push({ t: 'ok', m });
const err = (m, fix) => { counts.err++; out.push({ t: 'err', m, fix }); };
const warn = (m, fix) => { counts.warn++; out.push({ t: 'warn', m, fix }); };
const info = (m) => out.push({ t: 'info', m });

// ---------- load project config ----------
async function loadSite() {
  const ts = await import('typescript').then((m) => m.default ?? m);
  const src = read(P('lib', 'site.ts'));
  const js = ts.transpileModule(src, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } }).outputText;
  const dir = mkdtempSync(join(tmpdir(), 'preflight-'));
  const f = join(dir, 'site.mjs');
  writeFileSync(f, js);
  try { return await import(pathToFileURL(f).href); } finally { rmSync(dir, { recursive: true, force: true }); }
}

const parseI18n = (txt) => {
  const o = {};
  for (const raw of (txt ?? '').split('\n')) {
    const m = raw.match(/^\s*[\u200E\u200F]?\s*([a-z][a-z0-9_]*)\s*=\s*(.*)$/i);
    if (m) o[m[1]] = m[2].trim();
  }
  return o;
};
const LANGS = ['en', 'ru', 'he', 'ar'];

function git(...a) {
  const r = spawnSync('git', a, { cwd: root, encoding: 'utf8' });
  return r.status === 0 ? r.stdout : null;
}

// ---------- template source ----------
function getTemplate() {
  const local = opt('template') || process.env.TEMPLATE_DIR;
  if (local) return existsSync(join(local, 'lib', 'site.ts')) ? { dir: local, label: local } : null;
  const dir = mkdtempSync(join(tmpdir(), 'tpl-'));
  try {
    execFileSync('git', ['clone', '-q', '--depth', '1', '--filter=blob:none', '--sparse', TEMPLATE_REPO, dir], { stdio: 'ignore' });
    execFileSync('git', ['-C', dir, 'sparse-checkout', 'set', TEMPLATE_DIR], { stdio: 'ignore' });
    const sha = execFileSync('git', ['-C', dir, 'rev-parse', '--short', 'HEAD'], { encoding: 'utf8' }).trim();
    return { dir: join(dir, TEMPLATE_DIR), label: `${TEMPLATE_REPO} @ ${sha}`, cleanup: dir };
  } catch {
    rmSync(dir, { recursive: true, force: true });
    return null;
  }
}

const walk = (dir, base = dir, acc = []) => {
  if (!existsSync(dir)) return acc;
  for (const n of readdirSync(dir)) {
    if (['node_modules', '.next', '.next-build', '.git', 'recordings', '.vercel'].includes(n)) continue;
    const p = join(dir, n);
    if (statSync(p).isDirectory()) walk(p, base, acc); else acc.push(relative(base, p).replace(/\\/g, '/'));
  }
  return acc;
};

// =====================================================================
const site = await loadSite();
const pkg = JSON.parse(read(P('package.json')));
const isTemplate = pkg.name === 'scroll-film';

// ---------- 1. identity ----------
section('1. Проект и адрес');
if (isTemplate) err('package.json name = scroll-film', 'npm run new-site -- <slug> "<Brand>" "<Model>" https://<slug>.erythro.ai');
else ok(`package: ${pkg.name}`);
if (site.BRAND === 'ACME' || site.MODEL === 'X1') err(`BRAND/MODEL ещё шаблонные (${site.BRAND} ${site.MODEL})`, 'npm run new-site или lib/site.ts');
else ok(`бренд: ${site.BRAND} ${site.MODEL}`);
if (/example\./.test(site.SITE_URL)) err(`SITE_URL = ${site.SITE_URL}`, 'SITE_URL в lib/site.ts (new-site ставит сам)');
else ok(`SITE_URL: ${site.SITE_URL}`);
const envEx = read(P('.env.example')) ?? '';
const envUrl = envEx.match(/NEXT_PUBLIC_SITE_URL=(.*)/)?.[1]?.trim();
if (envUrl && envUrl.replace(/\/$/, '') !== site.SITE_URL) warn(`.env.example NEXT_PUBLIC_SITE_URL (${envUrl}) ≠ SITE_URL`);

// ---------- 2. media ----------
section('2. Медиа');
if (site.STUB_MEDIA) err('STUB_MEDIA = true — на сайте 5 заглушечных кадров', 'npm run frames -- <video>, затем STUB_MEDIA=false, FRAMES=N');
else ok('STUB_MEDIA = false');
for (const size of [768, 1280, 1920]) {
  const d = P('public', 'frames', 'assembly', String(size));
  const n = existsSync(d) ? readdirSync(d).filter((f) => /^frame_\d{4}\.webp$/.test(f)).length : 0;
  if (n !== site.FRAMES) err(`frames/${size}: ${n} файлов, а FRAMES = ${site.FRAMES}`, 'перегенерировать кадры или поправить FRAMES');
  else ok(`frames/${size}: ${n}`);
}
const last = site.FRAMES - 1;
const inRange = (f) => f >= 0 && f <= last;
let timingOk = true;
// scroll-film layout: SCENES[].f are the film frames at each section top; the old assembly config (PARTS / STAGES) is optional
if (site.SCENES) {
  let prev = -1;
  for (const sc of site.SCENES) {
    if (!inRange(sc.f)) { timingOk = false; err(`SCENES[${sc.id}].f = ${sc.f} вне 0..${last}`); }
    if (sc.f < prev) { timingOk = false; warn(`SCENES[${sc.id}] идёт раньше предыдущей сцены (${sc.f} < ${prev})`); }
    prev = sc.f;
  }
  if (site.PORTRAIT_DIR) {
    const n = existsSync(P('public', site.PORTRAIT_DIR)) ? readdirSync(P('public', site.PORTRAIT_DIR)).filter((x) => x.endsWith('.webp')).length : 0;
    if (n !== site.FRAMES) err(`${site.PORTRAIT_DIR}: ${n} файлов, а FRAMES = ${site.FRAMES}`, 'нарезать портретный пакет кадров (см. README)');
    else ok(`${site.PORTRAIT_DIR}: ${n}`);
  }
  if (timingOk) ok(`тайминг SCENES в пределах 0..${last}`);
} else {
let prevEnd = -1;
for (const p of site.PARTS) {
  const [a, b] = p.f;
  if (!inRange(a) || !inRange(b) || a > b) { timingOk = false; err(`PARTS[${p.n}].f = [${a}, ${b}] вне 0..${last}`); }
  if (a < prevEnd) { timingOk = false; warn(`PARTS[${p.n}] начинается раньше конца предыдущей детали (${a} < ${prevEnd})`); }
  prevEnd = b;
}
for (const s of site.STAGES) if (!inRange(s.f[0]) || !inRange(s.f[1])) { timingOk = false; err(`STAGES кадр [${s.f}] вне 0..${last}`); }
for (const s of site.DESIGN_SLIDES) if (!inRange(s.frame)) { timingOk = false; err(`DESIGN_SLIDES[${s.n}].frame = ${s.frame} вне 0..${last}`); }
if (timingOk) ok(`тайминг PARTS / STAGES / DESIGN_SLIDES в пределах 0..${last}`);
if (!site.STUB_MEDIA && site.PARTS.length && JSON.stringify(site.PARTS.map((p) => p.f)) === '[[10,20],[20,30],[30,40],[40,90],[90,108],[108,119],[119,130],[130,141]]')
  warn('PARTS.f совпадает с таймингом ORA из шаблона — перетаймлено по contact sheet клиента?');
}

const media = [];
if (site.SCENES && !('MOBILE_HERO' in site)) ok('телефоны скраббят портретный пакет кадров (MOBILE_HERO не нужен)');
else if (!site.MOBILE_HERO) warn('MOBILE_HERO = null — на телефонах вместо ролика сборки статичный кадр', 'npm run mobile-hero -- <video>');
else {
  for (const [k, u] of Object.entries(site.MOBILE_HERO)) {
    const f = P('public', u);
    media.push(u);
    if (!existsSync(f)) err(`MOBILE_HERO.${k}: нет файла public${u}`, 'npm run mobile-hero -- <video>');
  }
  const mp4 = P('public', site.MOBILE_HERO.src);
  if (existsSync(mp4)) {
    const s = statSync(mp4).size;
    if (s > 2.5 * 1024 * 1024) warn(`hero-клип ${MB(s)} MB > 2.5 MB — долго грузится с рекламы`, 'npm run mobile-hero -- <video> --crf 28');
    else ok(`hero-клип ${MB(s)} MB`);
  }
}

// every /video|/frames|/images path referenced in code must exist
const codeFiles = walk(root).filter((f) => /^(app|components|lib)\/.*\.(tsx?|css)$/.test(f) && f !== 'lib/site.ts');   // MOBILE_HERO is checked above
const refs = new Set();
for (const f of codeFiles) for (const m of read(P(f)).matchAll(/["'`(](\/(?:video|images?|img|media)\/[^"'`)\s$]+)["'`)]/g)) refs.add(m[1]);
const missingRefs = [...refs].filter((u) => !existsSync(P('public', u)));
if (missingRefs.length) err(`в коде есть ссылки на несуществующие файлы: ${missingRefs.join(', ')}`, 'положить ролики в public/video (≤ 3 MB, без звука) или убрать <VideoBg> из components/Sections.tsx');
else if (refs.size) ok(`все ${refs.size} медиа-ссылок из кода существуют`);
refs.forEach((u) => media.push(u));
const og = existsSync(P('app', 'opengraph-image.jpg')) || existsSync(P('app', 'opengraph-image.png'));
const ogGen = existsSync(P('app', 'opengraph-image.tsx'));
if (og && ogGen) err('есть и opengraph-image.jpg, и opengraph-image.tsx — Next не соберёт', 'удалить .tsx (и twitter-image.tsx)');
else if (og) ok('OG-картинка: фото клиента');
else warn('OG-картинка сгенерирована из текста — для рекламы лучше фото 1200×630', 'app/opengraph-image.jpg + .alt.txt, удалить .tsx');

// ---------- 3. git ----------
section('3. Git (Vercel видит только закоммиченное)');
const gi = read(P('.gitignore')) ?? '';
if (/^Video\/?$/m.test(gi)) err('.gitignore содержит "Video/" без слэша — на Windows съедает public/video', 'заменить на /Video/');
if (/^\/?public\/video/m.test(gi)) err('.gitignore игнорирует public/video — ролики не попадут на Vercel');
if (git('rev-parse', '--is-inside-work-tree')) {
  const tracked = new Set((git('ls-files', 'public') ?? '').split('\n').filter(Boolean));
  const need = [...new Set(media.map((u) => `public${u}`))];
  if (!site.STUB_MEDIA) need.push(`public${site.FRAME_DIR}/1280/frame_0001.webp`);
  const ignored = need.filter((f) => existsSync(P(f)) && spawnSync('git', ['check-ignore', '-q', f], { cwd: root }).status === 0);
  const untracked = need.filter((f) => existsSync(P(f)) && !tracked.has(f) && !ignored.includes(f));
  if (ignored.length) err(`git игнорирует нужные сайту файлы: ${ignored.join(', ')}`);
  if (untracked.length) warn(`ещё не закоммичены: ${untracked.join(', ')}`, 'git add public && git commit');
  if (!ignored.length && !untracked.length) ok('медиа в git');
  const big = (git('ls-files', '-z') ?? '').split('\0').filter((f) => f && existsSync(P(f)) && statSync(P(f)).size > 20 * 1024 * 1024);
  if (big.length) err(`в git файлы > 20 MB (мастер-видео?): ${big.join(', ')}`);
  const dirty = (git('status', '--porcelain') ?? '').trim();
  if (dirty) warn('есть незакоммиченные изменения — задеплоится не то, что проверено', 'git status');
} else warn('не git-репозиторий — проверка коммитов пропущена', 'git init');

// ---------- 4. i18n ----------
section('4. Тексты и i18n');
const dicts = Object.fromEntries(LANGS.map((l) => [l, parseI18n(read(P('i18n', `${l}.txt`)))]));
const keys = Object.keys(dicts.ru);
let i18nOk = true;
for (const l of LANGS) {
  const miss = keys.filter((k) => !dicts[l][k]);
  if (miss.length) { i18nOk = false; err(`[${l}] нет ${miss.length} ключей: ${miss.slice(0, 12).join(', ')}${miss.length > 12 ? '…' : ''}`, 'перевести через Translater, npm run i18n'); }
}
const dictTs = read(P('lib', 'dict.ts')) ?? '';
const stale = LANGS.flatMap((l) => Object.entries(dicts[l]).filter(([, v]) => !dictTs.includes(JSON.stringify(v))).map(([k]) => `${l}.${k}`));
if (stale.length) { i18nOk = false; err(`lib/dict.ts устарел (${stale.length}: ${stale.slice(0, 6).join(', ')}…)`, 'npm run i18n'); }
const all = LANGS.flatMap((l) => Object.entries(dicts[l]).map(([k, v]) => [`${l}.${k}`, v]));
const leftovers = all.filter(([, v]) => /\bACME\b|hello@example\.com|\bModel demo\b|דגם demo|طراز demo|Модель demo/i.test(v)).map(([k]) => k);
if (leftovers.length) { i18nOk = false; err(`шаблонные плейсхолдеры в текстах (${leftovers.length}): ${leftovers.slice(0, 10).join(', ')}`, 'заменить контакты / модель в i18n/*.txt'); }
if (i18nOk) ok(`${keys.length} ключей × 4 языка, dict.ts актуален, плейсхолдеров нет`);

// ---------- 5. SEO / agents ----------
section('5. SEO и агентные файлы');
const host = site.SITE_URL;
const robots = read(P('public', 'robots.txt')) ?? '';
if (!robots.includes(`${host}/sitemap.xml`)) err(`robots.txt не указывает ${host}/sitemap.xml`, 'npm run new-site или поправить вручную');
else ok('robots.txt');
const llms = read(P('public', 'llms.txt')) ?? '';
if (!llms.includes(host) || !llms.includes(site.BRAND)) err('llms.txt не про этот проект (адрес / бренд)', 'npm run new-site');
else if (/Feature section A|product scroll-landing by Erythro/.test(llms)) warn('llms.txt — шаблонное описание, без реального продукта', 'описать продукт и секции в public/llms.txt');
else ok('llms.txt');
if (!/SITE_URL/.test(read(P('app', 'sitemap.ts')) ?? '')) warn('sitemap.ts не использует SITE_URL');
const layout = read(P('app', 'layout.tsx')) ?? '';
if (!/metadataBase/.test(layout) || !/openGraph/.test(layout)) err('layout.tsx без metadataBase / openGraph');
if (/product scroll landing/.test(site.TITLE)) warn(`TITLE шаблонный: "${site.TITLE}"`, 'TITLE / DESCRIPTION в lib/site.ts — это текст превью в рекламе и мессенджерах');
else ok(`TITLE: ${site.TITLE}`);

// ---------- 6. conversion & analytics ----------
section('6. Конверсия и аналитика');
for (const [name, re] of [['<Analytics />', /<Analytics\s*\/>/], ['<SpeedInsights />', /<SpeedInsights\s*\/>/], ['<MetaPixel />', /<MetaPixel\s*\/>/], ['<GoogleAnalytics />', /<GoogleAnalytics\s*\/>/]]) {
  if (!re.test(layout)) err(`layout.tsx: нет ${name}`);
}
const pageSrc = walk(root).filter((f) => /^(app|components)\/.*\.tsx$/.test(f)).map((f) => read(P(f))).join('\n');
if (!/<(DemoNotice|StudioBar)/.test(pageSrc)) err('ни StudioBar, ни DemoNotice не рендерятся — нет WhatsApp-кнопки');
if (!existsSync(P('app', 'api', 'lead', 'route.ts'))) err('нет app/api/lead/route.ts — форма никуда не отправляет');
if (!/\/api\/lead/.test(read(P('components', 'Header.tsx')) ?? '')) err('форма в Header.tsx не шлёт на /api/lead');
const demo = read(P('lib', 'demo.ts')) ?? '';
if (!/adSource/.test(demo)) err('lib/demo.ts без adSource() — в WhatsApp не придёт источник рекламы');
const phone = demo.match(/phone:\s*'([^']*)'/)?.[1] ?? '';
if (phone.replace(/\D/g, '').length < 9) err(`DEMO.phone пустой/некорректный: "${phone}"`);
else ok(`WhatsApp ${phone}, StudioBar/DemoNotice, форма → /api/lead, Vercel Analytics, Speed Insights, GA4, Meta Pixel`);
const ga = read(P('lib', 'ga.ts')) ?? '';
const px = read(P('lib', 'metaPixel.ts')) ?? '';
if (!/G-[A-Z0-9]+/.test(ga)) warn('GA_ID без значения по умолчанию — GA работает только при NEXT_PUBLIC_GA_ID');
if (!/\d{10,}/.test(px)) warn('Meta Pixel без значения по умолчанию — работает только при NEXT_PUBLIC_META_PIXEL_ID');

// ---------- 7. drift vs template ----------
section('7. Сверка с шаблоном');
const tpl = isTemplate ? null : getTemplate();
if (isTemplate) info('это сам шаблон — сверка пропущена');
else if (!tpl) warn('шаблон недоступен (нет сети / --template) — сверка файлов пропущена', '--template C:\\dev\\templates\\scroll-film');
else {
  info(`шаблон: ${tpl.label}`);
  const skip = (f) => /^(public\/frames\/|public\/video\/|lib\/dict\.ts$|i18n\/|README\.md$|SITE\.md$|package-lock\.json$|next-env\.d\.ts$|preflight-report\.md$)/.test(f);
  const tFiles = walk(tpl.dir).filter((f) => !skip(f));
  const missing = tFiles.filter((f) => !existsSync(P(f)));
  const allowedMissing = /^app\/(opengraph|twitter)-image\.tsx$/;
  const missCode = missing.filter((f) => /\.(tsx?|mjs|py|css)$/.test(f) && !(og && allowedMissing.test(f)));
  const missOther = missing.filter((f) => !missCode.includes(f) && !(og && allowedMissing.test(f)));
  if (missCode.length) err(`нет файлов из шаблона: ${missCode.join(', ')}`, tpl.cleanup ? `npx degit erythroai-droid/templates/scroll-film/<file> <file>  (или --template <локальная копия>)` : `скопировать из ${tpl.dir}`);
  if (missOther.length) warn(`нет файлов из шаблона: ${missOther.join(', ')}`);
  if (!missing.length || (!missCode.length && !missOther.length)) ok(`все ${tFiles.length} файлов шаблона на месте`);

  // dependencies / scripts / i18n keys added to the template later
  const tPkg = JSON.parse(read(join(tpl.dir, 'package.json')));
  const depMiss = Object.keys(tPkg.dependencies ?? {}).filter((d) => !(pkg.dependencies ?? {})[d]);
  if (depMiss.length) err(`нет зависимостей шаблона: ${depMiss.join(', ')}`, `npm i ${depMiss.join(' ')}`);
  const scrMiss = Object.keys(tPkg.scripts ?? {}).filter((s) => !(pkg.scripts ?? {})[s]);
  if (scrMiss.length) warn(`нет npm-скриптов шаблона: ${scrMiss.join(', ')}`);
  const tRu = parseI18n(read(join(tpl.dir, 'i18n', 'ru.txt')));
  const keyMiss = Object.keys(tRu).filter((k) => !(k in dicts.ru));
  if (keyMiss.length) err(`в i18n нет ключей шаблона: ${keyMiss.join(', ')}`, 'добавить в i18n/*.txt (новые функции шаблона их используют)');
  const tEn = parseI18n(read(join(tpl.dir, 'i18n', 'en.txt')));
  const ignoreSame = /^(lang|close|loading|to_top|menu_open|scroll|hold|hold2|c_|demo_|ai_|hud_label|parts_label|st_k|nav_)/;
  const content = Object.keys(tEn).filter((k) => !ignoreSame.test(k) && dicts.en[k] !== undefined);
  const same = content.filter((k) => dicts.en[k] === tEn[k]);
  const share = content.length ? same.length / content.length : 0;
  if (share > 0.3) (share > 0.7 ? err : warn)(`${same.length} из ${content.length} текстов совпадают с шаблоном (не адаптированы под продукт): ${same.slice(0, 8).join(', ')}…`, 'переписать i18n/ru.txt под клиента');
  else ok(`тексты адаптированы (${same.length}/${content.length} совпадений с шаблоном)`);
  const icon = read(P('app', 'icon.svg'));
  if (icon && icon === read(join(tpl.dir, 'app', 'icon.svg'))) warn('favicon шаблонный', 'app/icon.svg + app/apple-icon.tsx');

  // infrastructure files that projects normally don't customise
  const infra = ['lib/ga.ts', 'lib/metaPixel.ts', 'lib/i18n.tsx', 'lib/scroll.tsx', 'lib/pin.ts', 'components/DemoNotice.tsx',
    'components/GoogleAnalytics.tsx', 'components/MetaPixel.tsx', 'components/VideoBg.tsx', 'components/Preloader.tsx',
    'app/api/lead/route.ts', 'scripts/build-i18n.mjs', 'scripts/preflight.mjs'];
  const drift = infra.filter((f) => existsSync(P(f)) && existsSync(join(tpl.dir, f)) && read(P(f)) !== read(join(tpl.dir, f)));
  if (drift.length) {
    warn(`инфраструктурные файлы отличаются от шаблона: ${drift.join(', ')}`,
      'шаблон новее или проект правил их сам — сверить: git diff --no-index <template>/<file> <file>; полезное перенести в шаблон');
  } else ok('инфраструктурные файлы совпадают с шаблоном');
}

// ---------- 8. code ----------
section('8. Код');
if (flag('build')) {
  const r = spawnSync(process.platform === 'win32' ? 'npm.cmd' : 'npm', ['run', 'build'], { cwd: root, encoding: 'utf8', shell: process.platform === 'win32' });
  if (r.status) err('npm run build упал', (r.stdout + r.stderr).split('\n').filter((l) => /error|Error/.test(l)).slice(0, 5).join(' | '));
  else ok('npm run build');
} else {
  const tsc = P('node_modules', 'typescript', 'bin', 'tsc');
  const r = spawnSync(process.execPath, [tsc, '--noEmit'], { cwd: root, encoding: 'utf8' });
  if (r.status) err('tsc --noEmit: ошибки типов', r.stdout.split('\n').slice(0, 5).join(' | '));
  else ok('tsc --noEmit (полная сборка: --build)');
}

// ---------- 9. live ----------
const url = opt('url')?.replace(/\/$/, '');
if (url) {
  section(`9. Живая проверка ${url}`);
  const get = async (p, init) => { try { return await fetch(url + p, { redirect: 'follow', ...init }); } catch { return null; } };
  const home = await get('/');
  const html = home ? await home.text() : '';
  if (!home?.ok) err(`/ → ${home?.status ?? 'нет ответа'}`);
  else ok('/ → 200');
  for (const p of ['/robots.txt', '/llms.txt', '/sitemap.xml', '/opengraph-image', '/icon.svg']) {
    const r = await get(p);
    if (!r?.ok) err(`${p} → ${r?.status ?? 'нет ответа'}`);
  }
  const heads = [...new Set(media)].concat(site.STUB_MEDIA ? [] : [`${site.FRAME_DIR}/1280/frame_${String(site.FRAMES).padStart(4, '0')}.webp`]);
  let missingLive = 0;
  for (const u of heads) {
    const r = await get(u, { method: 'HEAD' });
    if (!r?.ok) { missingLive++; err(`${u} → ${r?.status ?? 'нет ответа'} (не задеплоен)`); }
  }
  if (heads.length && !missingLive) ok(`медиа на проде: все ${heads.length} файлов отдаются`);
  if (!html.includes(`content="${site.SITE_URL}`) && !html.includes(`href="${site.SITE_URL}`)) warn('в HTML нет canonical/og:url с SITE_URL — NEXT_PUBLIC_SITE_URL в Vercel другой?');
  if (!/googletagmanager/.test(html)) warn('GA4 не найден в HTML (NEXT_PUBLIC_GA_ID=0?)');
  if (!/fbevents|meta-pixel/.test(html)) warn('Meta Pixel не найден в HTML (NEXT_PUBLIC_META_PIXEL_ID=0?)');
  const lead = await get('/api/lead', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' });
  if (lead?.status === 503) warn('форма не подключена: LEAD_WEBHOOK_URL не задан — лиды уходят только в WhatsApp', 'py -3 scripts/deploy-n8n-lead.py → Vercel env');
  else if (lead?.status === 400) ok('/api/lead подключён (пустая заявка отклонена 400)');
  else err(`/api/lead → ${lead?.status ?? 'нет ответа'}`);
  const demoOn = /demo-wa|demo_wa/.test(html) || /NEXT_PUBLIC_DEMO_NOTICE/.test(html);
  info(`демо-карточка в HTML: ${demoOn ? 'есть' : 'не видна при SSR (проверить глазами)'}`);
}

// ---------- manual ----------
section('Вручную (скрипт этого не видит)');
for (const m of [
  'Vercel env: NEXT_PUBLIC_DEMO_NOTICE (демо = 1, клиенту = 0), NEXT_PUBLIC_GA_ID / NEXT_PUBLIC_META_PIXEL_ID (Erythro или клиента), LEAD_WEBHOOK_URL + LEAD_WEBHOOK_SECRET',
  'Cloudflare CNAME <slug> → Vercel, DNS only; домен добавлен в Vercel; Vercel Analytics включён',
  'Тестовая заявка пришла в Telegram; WhatsApp-сообщение кончается на [utm-источник]',
  'Реальный телефон: hero-клип играет и останавливается на собранном продукте, иврит/арабский RTL',
  'GA4: generate_lead отмечен key event; Meta Pixel Helper: PageView / Contact / Lead',
  'PageSpeed mobile ≥ 90; превью ссылки в WhatsApp/Telegram',
  `Рекламные ссылки: ?utm_source=facebook&utm_medium=paid&utm_campaign=<name>_he&utm_term={{placement}}`,
]) info(`☐ ${m}`);

if (tpl?.cleanup) rmSync(tpl.cleanup, { recursive: true, force: true });

// ---------- print ----------
const icon = { ok: '  ✔', err: '  ✖', warn: '  ⚠', info: '  ·' };
const lines = [];
for (const r of out) {
  if (r.t === 'h') { lines.push('', r.m); continue; }
  lines.push(`${icon[r.t]} ${r.m}`);
  if (r.fix) lines.push(`      → ${r.fix}`);
}
const verdict = counts.err || counts.warn
  ? `Рекомендации к исправлению: ${counts.err} важных (✖), ${counts.warn} желательных (⚠). Что исправлять — решаете вы; деплой ничем не блокируется.`
  : '✔ Расхождений с шаблоном и чеклистом не найдено';
lines.unshift(`Preflight ${site.BRAND} ${site.MODEL} — ${new Date().toISOString().slice(0, 16).replace('T', ' ')}`);
lines.push('', verdict, '');
console.log(lines.join('\n'));
if (flag('report')) {
  writeFileSync(P('preflight-report.md'), '```\n' + lines.join('\n') + '\n```\n');
  console.log('→ preflight-report.md');
}
process.exit(0);   // advisory only
