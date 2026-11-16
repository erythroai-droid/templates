# Client site checklist — Scroll Film (`scroll-film`)

> Shared with the AI Smart Card checklist. Where it talks about the assembly (`PARTS`, `STAGES`, `DESIGN_SLIDES`, the phone hero clip, `DemoNotice`), this template uses instead: `SCENES` + the portrait frame pack (README → Client media), `StudioBar` + `Metrics`. Reference production: EMBER Steakhouse.


Use this when spinning a new project from the template. Reference production: [ORA 60A](https://ora60a.erythro.ai).
Typical time from clone to an ad-ready URL: 3–5 hours, most of it media.

## 0. What ships out of the box

| Area | What you get | Where |
|---|---|---|
| Scroll assembly | GSAP pin/scrub over WebP frame packs (768/1280/1920), magnet sections | `components/Assembly.tsx`, `lib/site.ts`, `lib/scroll.tsx` |
| Phones (static layout) | No canvas; hero plays a 9 s portrait assembly clip, text intro, one still per part | `StaticHeroMedia` in `Assembly.tsx`, `MOBILE_HERO` in `lib/site.ts` |
| i18n | EN/RU/HE/AR + RTL; language = `?lang=` → ad campaign suffix `…_he` → saved choice → browser language → EN | `lib/i18n.tsx`, `i18n/*.txt` |
| Demo card | WhatsApp button from the first second, card unfolds after 3.5 s / 1 screen scroll / footer / exit intent | `components/DemoNotice.tsx`, `lib/demo.ts` |
| Ad attribution | `utm_source / utm_campaign / utm_term` (or bare `fbclid`/`gclid`) kept for the visit, appended to the WhatsApp text and sent with form leads | `adSource()` in `lib/demo.ts` |
| Order form | Real POST → `/api/lead` → webhook (n8n → Telegram); honeypot; on failure offers WhatsApp | `components/Header.tsx`, `app/api/lead/route.ts`, `scripts/deploy-n8n-lead.py` |
| Analytics | Vercel Web Analytics + Speed Insights, GA4 (scroll 25/50/75, visible time 15–300 s, `generate_lead`), Meta Pixel (PageView, Contact, Lead) | `app/layout.tsx`, `lib/ga.ts`, `lib/metaPixel.ts` |
| Sharing | Canonical, Open Graph, Twitter card, generated 1200×630 preview | `app/layout.tsx`, `app/opengraph-image.tsx` |
| Agents / SEO | `robots.txt`, `llms.txt`, `sitemap.xml`; AI search visibility skill (bots / WAF / citation copy) | `public/`, `app/sitemap.ts`; `.agents|.cursor|.claude|.grok/skills/ai-search-visibility/SKILL.md` (+ `AGENTS.md` / `GEMINI.md` / `CLAUDE.md`) |
| Ad footage | Headless scroll recording (desktop or phone) → .webm | `npm run record-demo` |
| Pre-deploy check | Compares the project with the template and this checklist and lists recommendations; runs only when you call it | `npm run preflight` |

> **Before a deploy, run `npm run preflight`.** It compares the project with the template and lists what differs.
> Every finding is a **recommendation, not a requirement** — you decide what to fix. Nothing runs it automatically
> and it never blocks a push or a build (exit code is always 0). Details: §9.

## 1. Scaffold

```bash
npx degit erythroai-droid/templates/ai-smart-card <repo>
cd <repo>
npm install
npm run new-site -- <slug> "<Brand>" "<Model>" https://<slug>.erythro.ai
```

`new-site` sets `package.json` name, `BRAND` / `MODEL` / `SITE_URL` in `lib/site.ts`, robots, llms.txt and `.env.example`.
Page title, description, OG card, WhatsApp text and the phone intro all derive from `BRAND MODEL`.

## 2. Media

Master video stays local (`*.mov`, `/Video/` are git-ignored). Everything under `public/` that the page uses **is committed** — Vercel serves only what is in git.

1. Frames: `npm run frames -- C:\path\to\assembly.mov --every 3`
2. In [`lib/site.ts`](lib/site.ts): `STUB_MEDIA = false`, `FRAMES = <count printed>`, retime `PARTS[].f`, final stage, `DESIGN_SLIDES[].frame` from a contact sheet.
3. **Mobile media** (most ad traffic is phones): `npm run mobile-hero -- C:\path\to\assembly.mov --dur 9 --x 0.5`
   → `public/video/hero-assembly-m.mp4` (+ poster/end webp). Keep ≤ 10 s and ≤ 2.5 MB; check the crop on a real phone. `MOBILE_HERO` picks it up when `STUB_MEDIA=false`.
4. Optional section loops: mp4 in `public/video/`, `<VideoBg src=… staticSrc=…>` in `components/Sections.tsx`. `staticSrc` = a light mobile cut (≤ 500 KB) that phones play instead of dropping the layer.
5. Optional real share image: `app/opengraph-image.jpg` + `twitter-image.jpg` (1200×630) + `.alt.txt`, then delete the two `.tsx` generators.

## 3. Copy & i18n

1. Edit `i18n/ru.txt` (source of truth for keys), translate to `en` / `he` / `ar`.
2. `npm run i18n` → regenerates `lib/dict.ts`.
3. Replace contacts, CTA, AI demo answers, footer rights, `st_*` (phone intro), `c_*` (form).
4. `{name}` in `demo_msg` and `st_p` is filled with `BRAND MODEL` at runtime.

## 4. Visual tokens

`app/globals.css` `:root`: `--bg`, `--bg-deep`, `--panel`, `--stage`, `--fg`, `--mute`, `--silver`, `--gold`.
Keep `.ds-slide-copy small` darker than decorative gold for WCAG contrast. Arabic faces in `app/fonts/` (TrueArabic); Latin/Cyrillic/Hebrew via fontsource.

## 5. Vercel + DNS

1. GitHub repo → Vercel → New Project → Next.js, Production Branch `main`.
2. Environment variables — see [`.env.example`](.env.example). For an Erythro demo nothing is required.
3. Cloudflare zone `erythro.ai`: `CNAME <slug>` → target from Vercel domain config (`*.vercel-dns-0xx.com`), **DNS only**.
4. Vercel → Domains → add `<slug>.erythro.ai`; Vercel → **Analytics → Enable** (custom events need Pro).

## 6. Leads: form → n8n → Telegram

Without `LEAD_WEBHOOK_URL` the form answers 503 and shows "Couldn't send — WhatsApp →". To make it real:

```bash
pip install paramiko python-dotenv
# N8N_SSH_HOST / N8N_SSH_PASSWORD / N8N_URL / N8N_TG_WORKFLOW / LEAD_WEBHOOK_SECRET in the shell or ENV_FILE
py -3 scripts/deploy-n8n-lead.py
```

It creates (or updates) the workflow `<slug>-lead-form`: webhook `/webhook/<slug>-lead` with header auth → formatted message → Telegram (bot + chat copied from an existing workflow). Then in Vercel set `LEAD_WEBHOOK_URL` (printed) + the same `LEAD_WEBHOOK_SECRET`, redeploy, submit a test lead.
Any other webhook (Make, Zapier) works too — payload: `{ name, email, message, lang, source, page, userAgent, createdAt }`.

## 7. Ads & analytics

**Links for ads** — always tag them; the source lands in GA4, in the WhatsApp message (`[facebook / spring_he / reels]`) and in the lead:

```
https://<slug>.erythro.ai/?utm_source=facebook&utm_medium=paid&utm_campaign=<name>_he&utm_term={{placement}}
```

- Campaign name ending `_he` / `_ru` / `_ar` / `_en` opens that language (Hebrew ads → RTL) even without `?lang=`. `?lang=` wins if both are present.
- Meta: put `{{placement}}` in `utm_term` to see Reels vs Feed vs Stories.

**Events**

| Event | Vercel Analytics | GA4 | Meta Pixel |
|---|---|---|---|
| page view | auto | `page_view` | `PageView` |
| card shown / closed / reopened | `demo_notice_*` | same names | — |
| WhatsApp click (conversion) | `demo_whatsapp_click` | `whatsapp_click` + `generate_lead {method: whatsapp}` | `Contact` + `Lead` |
| form sent | `contact_form_submit` | `generate_lead {method: form}` | `Lead` |
| form failed | `contact_form_error` | same | — |
| scroll depth | — | `scroll {percent_scrolled: 25/50/75}` (+90 from enhanced measurement) | — |
| visible time | — | `demo_time {seconds: 15/30/60/120/300}` | — |

GA4 → Admin → Events: mark `generate_lead` as a **key event**. Meta Events Manager: optimise campaigns for `Lead`.
GA4 and the Pixel default to the Erythro property/pixel; a client gets their own via `NEXT_PUBLIC_GA_ID` / `NEXT_PUBLIC_META_PIXEL_ID`, `0` turns either off. GA loads only in production builds.

**Demo card tuning** (`DEMO` in `lib/demo.ts`): `delayMs` 3 500 ms and `openAfterScreens` 1 — tuned on ORA 60A where mobile ad visitors averaged ~1 s engagement; a 40 s timer was never seen.

**Footage for creatives:** `npm i --no-save playwright && npx playwright install chromium`, then
`npm run record-demo -- --url https://<slug>.erythro.ai --mobile --lang he` → `recordings/*.webm` (convert to mp4 with ffmpeg).

## 8. Client handover

- `NEXT_PUBLIC_DEMO_NOTICE=0` (card off; don't delete the code).
- Client's own `NEXT_PUBLIC_GA_ID` / `NEXT_PUBLIC_META_PIXEL_ID`, or `0`.
- `LEAD_WEBHOOK_URL` → the client's CRM / n8n; update `DEMO.phone` if the WhatsApp fallback should reach the client.
- Custom domain → `NEXT_PUBLIC_SITE_URL` + `SITE_URL`.

## 9. Preflight — сверка с шаблоном перед деплоем

```bash
npm run preflight -- --build                               # before the first push: full check + production build
npm run preflight -- --url https://<preview>.vercel.app    # after the preview deploy: same + live checks
npm run preflight -- --report                              # also saves preflight-report.md (attach to the handover)
```

The template is taken from GitHub (`main`); `--template <dir>` or `TEMPLATE_DIR` compares with a local copy.
Result — all of it advisory: **✖** = important recommendation (likely visible to visitors or ads), **⚠** = nice to fix, **·** = info / manual step. Nothing is blocked; exit code is always 0.

| Section | What it catches |
|---|---|
| 1. Project | slug / brand / `SITE_URL` still `ai-smart-card` / `ACME X1` / `example.erythro.ai` |
| 2. Media | `STUB_MEDIA`, frame count ≠ `FRAMES` in each size, `PARTS` / `STAGES` / `DESIGN_SLIDES` out of range or ORA timing left in, missing phone hero clip or > 2.5 MB, code pointing at files that don't exist, OG `.jpg` + `.tsx` conflict |
| 3. Git | media ignored or not committed, `Video/` / `public/video` in `.gitignore`, files > 20 MB in git, uncommitted changes |
| 4. Texts | missing keys per language, stale `lib/dict.ts`, `ACME` / `hello@example.com` / `Model demo` left in copy |
| 5. SEO | robots / llms / sitemap / canonical / OG point at this site; template title or llms.txt |
| 6. Conversion | WhatsApp number, DemoNotice, form → `/api/lead`, `adSource`, Analytics + Speed Insights + GA4 + Pixel in the layout |
| 7. Template | files, npm deps/scripts and i18n keys the template has and the project lacks (= features added to the template after the clone); copy still identical to the template; template favicon; infrastructure files that drifted from the template |
| 8. Code | `tsc --noEmit`, or `npm run build` with `--build` |
| 9. Live (`--url`) | `/`, robots, llms, sitemap, OG image, icon, every media file the page uses, GA4 + Pixel in the HTML, canonical = `SITE_URL`, `/api/lead` wired (400) or not (503) |

A ⚠ on drifted infrastructure files means either the template moved on (pull the change into the project) or the project improved it (port the improvement to the template — then every next site gets it).

Then the manual part the script prints (Vercel env, DNS, a real lead in Telegram, a real phone, GA4 key event, PageSpeed):

- [ ] `npm run build` green locally
- [ ] Desktop: hero + assembly scrub; phone: hero clip plays once and stays on the assembled product, intro text, part stills
- [ ] `/robots.txt`, `/llms.txt`, `/sitemap.xml`, `/opengraph-image` → 200; link preview OK in WhatsApp/Telegram
- [ ] Language switch EN/RU/HE/AR + RTL; `?utm_campaign=x_he` opens Hebrew; RTL carousel swipe goes the right way
- [ ] WhatsApp button visible at once, card unfolds ~3.5 s, `wa.me` text names the project and ends with `[utm source]`
- [ ] Form → Telegram message arrives (or WhatsApp fallback when the webhook is off)
- [ ] GA4 Realtime shows `page_view` + `whatsapp_click`; Meta Pixel Helper shows PageView / Contact / Lead
- [ ] PageSpeed mobile: Performance ≥ 90, no a11y issues from dots/contrast

## Pitfalls

| Symptom | Fix |
|---|---|
| Vercel build `next/font` null read | Do not reintroduce `next/font/google` |
| Content blocks see-through | Opaque `--panel` under `.has-vbg`; commit the videos the page uses |
| `public/video` missing on Vercel | Windows `Video/` gitignore ate paths — use `/Video/` only; don't ignore `public/video` in a client repo |
| Blank black hero on phones | `STUB_MEDIA=false` but `hero-assembly-m.mp4` not committed — run `mobile-hero`, commit, or set `MOBILE_HERO = null` |
| Wrong frame timing | Retime `PARTS.f` after every new extract |
| Ads land in English for Hebrew audience | Campaign name must end `_he` or the link must carry `?lang=he` |
| Form "couldn't send" in prod | `LEAD_WEBHOOK_URL` unset or n8n workflow inactive / secret mismatch (n8n answers 403) |
| GA shows nothing locally | By design — GA loads only in production builds |
