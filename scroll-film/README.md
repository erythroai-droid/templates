# Scroll Film (`scroll-film`)

Next.js 15 + React 19 + GSAP landing where **one film sits fixed behind the page and plays with the scroll**, while the
content scenes scroll over it in normal flow (reference production: EMBER Steakhouse). Built for ad traffic from Reels:
the studio frame (demo strip + one CTA) is on screen from the first frame and the film starts moving by itself.

Stub media is included (16 frames, 5 gallery stills, a generated table texture), so `npm run build` works out of the box.

## Quick start

```bash
npm install
npm run new-site -- acme-grill "ACME" "Grill" https://acme-grill.erythro.ai
npm run dev     # http://localhost:3200
```

## What is on the page

| Piece | Where |
|---|---|
| Film: fixed canvas, frame from the sections' positions, one sharp frame at a time, autoplay intro (~2 s), off-centre on wide screens, holds the last frame | `components/Film.tsx` |
| Scenes (hero, 3 side scenes, centred finale), side rails | `components/Scenes.tsx` |
| Gallery: prints scattered on a table, dealt in by the scroll, draggable, lightbox | `Gallery` in `components/Scenes.tsx` |
| Footer over an optional seamless-loop video under a dark veil | `HallVideo` / `FOOTER_VIDEO` |
| Desktop scroll magnet: content settles centred after each wheel stop | `useMagnet` in `app/page.tsx` |
| Studio frame: top strip "Demo · Erythro.ai" + portfolio link, bottom "I want a site like this" → WhatsApp with the ad source | `components/StudioBar.tsx` |
| First-seconds metrics: `film_first_frame`, `first_scroll`, `engaged_10s`, `engaged_visit` (+ Pixel `EngagedVisit`) | `components/Metrics.tsx` |
| Config: frames, scenes, menu, gallery spots, footer video, brand / URL | `lib/site.ts` |
| Copy EN/RU/HE/AR + RTL (RU is the source, translate with Translater) | `i18n/*.txt` → `npm run i18n` |
| Palette / fonts (Playfair Display + Great Vibes via fontsource) | `app/globals.css`, `app/layout.tsx` |

## Client media

1. **Film.** `npm run frames -- C:\path\to\video.mp4 --every 2` writes the landscape packs (768/1280/1920) and the portrait
   pack for phones (540×960, centre crop). Then in `lib/site.ts`: `FRAMES = <count>`, a **new `FRAMES_VERSION`** (frames are
   cached as immutable — without it returning browsers mix old and new frames), retime `SCENES` from a contact sheet.
   If the video ends on a still shot, delete that tail from every pack (same numbers): the film should end where the motion
   ends and then hold — stretching a still tail over the finale looks like repeating frames.
2. **Gallery.** Client photos → WebP at 1000 and 2000 px wide (`public/gallery/<name>-1000.webp`, `-2000.webp`), list them
   in `GALLERY` with their aspect and table spots. Table texture: `GALLERY_TABLE`. Keep originals out of git (`/Foto/`).
3. **Footer video (optional).** Cut a seamless loop — last second cross-faded into the first — so the jump at the loop
   point disappears:
   ```bash
   ffmpeg -i hall.mp4 -filter_complex "[0:v]split[a][b];[a]trim=start=0.8,setpts=PTS-STARTPTS[A];[b]trim=0:0.8,setpts=PTS-STARTPTS[B];[A][B]xfade=transition=fade:duration=0.8:offset=<duration-1.6>,scale=1280:-2,format=yuv420p[v]" -map "[v]" -an -c:v libx264 -crf 26 -movflags +faststart public/video/hall-1280.mp4
   ```
   (same with `scale=854:-2` for phones, plus a poster), then set `FOOTER_VIDEO` in `lib/site.ts`.

## Ads & analytics

- Ad links: `?utm_source=meta&utm_medium=paid&utm_campaign=<name>_he&utm_term={{placement}}&utm_content={{ad.name}}` —
  the `_he` / `_ru` / `_ar` / `_en` suffix opens that language.
- Meta Events Manager: a Custom Conversion on `EngagedVisit`, optimise the campaign for it (leads are too few to learn from).
- GA4: mark `generate_lead` as a key event, exclude internal traffic (your own visits otherwise inflate engagement).
- Client handover: `NEXT_PUBLIC_DEMO_NOTICE=0` hides the studio frame.

## Stack notes (do not regress)

- Fonts via `@fontsource/*` — **not** `next/font/google` (Next 15.5 flake on Vercel).
- `.gitignore` uses `/Video/` and `/Foto/` (masters stay local); web cuts in `public/` are committed — Vercel serves only git.
- Ship `/robots.txt` (search bots yes, training bots no), `/llms.txt`, `/sitemap.xml`, OG image, Vercel Analytics + Speed Insights,
  GA4 and the Meta Pixel. AI search visibility: skill `ai-search-visibility` (`.claude/skills/…`, same under `.agents`, `.cursor`, `.grok`).
- Checklist and deploy steps: [`SITE.md`](SITE.md). Before a deploy: `npm run preflight` (advisory, compares with this template).
