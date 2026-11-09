# Client site checklist — product-scroll-landing

Use this when spinning a new project from the template.

## 1. Scaffold

```bash
npx degit erythroai-droid/templates/product-scroll-landing <repo>
cd <repo>
npm install
npm run new-site -- <slug> "<Brand>" "<Model>" https://<slug>.erythro.ai
```

Example: `npm run new-site -- ora60a "ORA" "60A" https://ora60a.erythro.ai`

## 2. Media

1. Put the assembly master video somewhere local (not committed).
2. Extract frames:

```bash
npm run frames -- C:\path\to\assembly.mov --every 3
```

3. In [`lib/site.ts`](lib/site.ts):
   - `STUB_MEDIA = false`
   - `FRAMES = <count printed by the script>`
   - Retime each `PARTS[].f` and the final stage from a contact sheet
   - Update `DESIGN_SLIDES[].frame`
4. Optional loop backgrounds: place mp4 under `public/video/` and point `VideoBg` `src` in `components/Sections.tsx`. Do **not** commit huge masters; `.gitignore` ignores `public/video/*`.

## 3. Copy & i18n

1. Edit `i18n/ru.txt` (source of truth for keys).
2. Translate to `en` / `he` / `ar` (Erythro Translater worker or equivalent).
3. `npm run i18n` → regenerates `lib/dict.ts`.
4. Replace contacts, CTA, AI demo answers, footer rights.

## 4. Visual tokens

In `app/globals.css` `:root`:

- `--bg`, `--bg-deep`, `--panel`, `--stage`
- `--fg`, `--mute`, `--silver`, `--gold`
- Keep `.ds-slide-copy small` darker than decorative gold for WCAG contrast

Arabic faces live in `app/fonts/` (TrueArabic). Latin/Cyrillic/Hebrew via fontsource.

## 5. Vercel + DNS

1. Create GitHub repo; push.
2. Vercel → New Project → this repo → Root Directory `.` (or the monorepo subfolder).
3. Optional env: `NEXT_PUBLIC_SITE_URL=https://<slug>.erythro.ai` (sitemap).
4. Cloudflare zone `erythro.ai`:
   - Type `CNAME`, Name `<slug>`, Target from Vercel domain config (`*.vercel-dns-016.com`)
   - Proxy **off** (DNS only)
5. Vercel → Project → Domains → add `<slug>.erythro.ai`

## 6. Launch smoke

- [ ] `npm run build` green locally
- [ ] Production URL loads hero + assembly (or static mobile)
- [ ] `/robots.txt`, `/llms.txt`, `/sitemap.xml` 200
- [ ] Language switch EN/RU/HE/AR + RTL
- [ ] Design tabs have accessible names; no transparent content blocks
- [ ] Speed Insights receives events after a real visit
- [ ] PageSpeed mobile: Performance ≥90, a11y issues from dots/contrast gone

## Pitfalls

| Symptom | Fix |
|---|---|
| Vercel build `next/font` null read | Do not reintroduce `next/font/google` |
| Content blocks see-through | Opaque `--panel` under `.has-vbg`; ensure videos deploy if used |
| `public/video` missing on Vercel | Windows `Video/` gitignore ate paths — use `/Video/` only |
| Wrong frame timing | Retime `PARTS.f` after every new extract |
