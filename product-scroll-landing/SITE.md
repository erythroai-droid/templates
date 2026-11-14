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
6. Vercel → Project → **Analytics → Enable** (Web Analytics; custom events need Pro).

## 5a. Demo notice (WhatsApp)

Every demo build ships a "Thanks for exploring → Chat on WhatsApp" card (`components/DemoNotice.tsx`, `lib/demo.ts`, `.demo*` in `globals.css`). It opens once per visit when the footer comes into view, after ~40 s, or on desktop exit intent, and folds into a pulsing WhatsApp button after closing. On a reload in the same visit the card opens expanded again (~1.2 s) — visitors always see the text, never just a bare button.

- The phone number lives only in the `wa.me` link (`DEMO.phone` in `lib/demo.ts`); it is never shown on the page.
- The prefilled message (`demo_msg` in `i18n/*.txt`) contains `{name}`, filled with `BRAND MODEL` from `lib/site.ts` — no per-project edit needed.
- Click stats go to Vercel Web Analytics → Events: `demo_notice_shown` (`trigger`: footer | timer | exit | reload), `demo_notice_closed`, `demo_notice_reopened`, `demo_whatsapp_click`. In `npm run dev` they only log `[Vercel Web Analytics] [event] …` to the console.
- **Client handover / production:** set `NEXT_PUBLIC_DEMO_NOTICE=0` in Vercel → Environment Variables and redeploy. Don't remove the code.

## 6. Launch smoke

- [ ] `npm run build` green locally
- [ ] Production URL loads hero + assembly (or static mobile)
- [ ] `/robots.txt`, `/llms.txt`, `/sitemap.xml` 200
- [ ] Language switch EN/RU/HE/AR + RTL
- [ ] Design tabs have accessible names; no transparent content blocks
- [ ] Speed Insights receives events after a real visit
- [ ] Demo notice opens at the footer, folds into the pulsing WhatsApp button, `wa.me` text names the project; events show in Analytics → Events (or `NEXT_PUBLIC_DEMO_NOTICE=0` set for a client's production build)
- [ ] PageSpeed mobile: Performance ≥90, a11y issues from dots/contrast gone

## Pitfalls

| Symptom | Fix |
|---|---|
| Vercel build `next/font` null read | Do not reintroduce `next/font/google` |
| Content blocks see-through | Opaque `--panel` under `.has-vbg`; ensure videos deploy if used |
| `public/video` missing on Vercel | Windows `Video/` gitignore ate paths — use `/Video/` only |
| Wrong frame timing | Retime `PARTS.f` after every new extract |
