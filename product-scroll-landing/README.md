# product-scroll-landing

Next.js 15 + React 19 + GSAP scroll-assembled product landing (pattern from [ORA 60A](https://ora60a.erythro.ai)).

Stub media is included so `npm run build` works out of the box. Replace frames from the client video before launch.

## Quick start

```bash
npm install
npm run new-site -- acme-x1 "ACME" "X1" https://acme-x1.erythro.ai
npm run dev     # http://localhost:3200
npm run build && npm start
```

## Customize

| Step | Where |
|---|---|
| Brand / model / frame timing | [`lib/site.ts`](lib/site.ts) |
| Apply slug to package + domain files | `npm run new-site -- <slug> "<Brand>" "<Model>" [url]` |
| Copy (EN/RU/HE/AR) | `i18n/*.txt` → `npm run i18n` |
| Extract frames from video | `npm run frames -- path/to/video.mov` then set `STUB_MEDIA=false` |
| Palette | `app/globals.css` CSS variables |
| Agent files | `public/robots.txt`, `public/llms.txt`, `app/sitemap.ts` |

Full client checklist: [`SITE.md`](SITE.md).

## Stack notes (do not regress)

- Fonts: `@fontsource/inter` + `@fontsource/heebo` + local Arabic — **not** `next/font/google` (Next 15.5 flake).
- Sections with video bg keep opaque `--panel` under `.has-vbg` so missing mp4 cannot punch a hole.
- `.gitignore` uses `/Video/` (repo-root only), never bare `Video/` on Windows.
- Ship `/robots.txt`, `/llms.txt`, `/sitemap.xml` and `@vercel/speed-insights`.

## Deploy

1. Push this folder as its own GitHub repo (or monorepo subdirectory with Vercel Root Directory).
2. Import on Vercel → Framework Next.js → Production Branch `main`.
3. Cloudflare DNS: `CNAME <slug> → <project>.vercel-dns-016.com` (DNS only / grey cloud).
4. Smoke: `/`, `/robots.txt`, `/llms.txt`, `/sitemap.xml`, Speed Insights after first visit.
