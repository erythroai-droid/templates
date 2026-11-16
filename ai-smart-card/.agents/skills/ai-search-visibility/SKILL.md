---
name: ai-search-visibility
description: >-
  Technical checklist for AI search visibility (Google AI Overviews/AI Mode,
  Bing Copilot, ChatGPT, Claude, Perplexity) based on official crawler docs.
  Use when creating or auditing a public website, configuring robots.txt,
  sitemap, WAF/CDN bot rules, SEO meta/canonical/JSON-LD, or writing landing
  page content meant to be cited in AI answers.
version: 1.0.0
---

# AI Search Visibility

Official-docs-only playbook. No separate “GEO-SEO” stack: Google says AI Overviews / AI Mode need **no extra technical requirements** beyond indexable pages with snippet rights. Bing Copilot uses the same crawl → index → rank foundation.

## When to load this skill

- Creating or auditing a public site (including AI Smart Card client landings)
- Editing `robots.txt`, sitemap, Cloudflare/WAF bot rules
- SEO meta, canonical, hreflang, JSON-LD
- Writing landing copy for citation (passage-level answers)

## Non-negotiables

1. **Bot access first.** Good content that crawlers cannot fetch is never cited.
2. **Do not invent AI-only files as requirements.** Google advises against AI-specific markup such as mandatory `llms.txt` / special schema. Optional discovery assets are fine; do not sell them as required for AI Overviews.
3. **Split search bots vs training bots.** Blocking “all AI bots” often kills ChatGPT/Claude/Perplexity search visibility.
4. **Never promise guaranteed placement** in AI answers.

## Bot registry (search ≠ training)

| Vendor | Bot | Role | robots.txt |
|---|---|---|---|
| OpenAI | `OAI-SearchBot` | ChatGPT search | yes |
| OpenAI | `GPTBot` | training | yes |
| OpenAI | `ChatGPT-User` | user-triggered fetch | may not apply |
| Anthropic | `Claude-SearchBot` | Claude search index | yes |
| Anthropic | `ClaudeBot` | training (+ Crawl-delay) | yes |
| Anthropic | `Claude-User` | user-triggered fetch | yes |
| Perplexity | `PerplexityBot` | search index | yes |
| Perplexity | `Perplexity-User` | user fetch | mostly ignores robots |
| Google | `Googlebot` | Search + AI Overviews/AI Mode | yes |
| Google | `Google-Extended` | other Google AI training/grounding (**not** AI Overviews) | yes |
| Bing | `Bingbot` | Bing + Copilot | yes |

Published IP JSON (for WAF allow = UA **and** IP):
- OpenAI: `openai.com/searchbot.json`, `gptbot.json`, `chatgpt-user.json`, `adsbot.json`
- Anthropic: `claude.com/crawling/bots.json` — **do not IP-block** Anthropic (bot then cannot read robots.txt)
- Perplexity: `perplexity.com/perplexitybot.json`, `perplexity-user.json`

Propagation: OpenAI/Perplexity ~24h; Google days–months (request recrawl). Anthropic robots must exist **per subdomain**.

### Default robots.txt: search yes, training no

Offer this by default. If the client wants max visibility, also allow training bots. Client decides training.

```
User-agent: OAI-SearchBot
Allow: /

User-agent: Claude-SearchBot
Allow: /

User-agent: Claude-User
Allow: /

User-agent: PerplexityBot
Allow: /

User-agent: GPTBot
Disallow: /

User-agent: ClaudeBot
Disallow: /

User-agent: Google-Extended
Disallow: /

Sitemap: https://example.com/sitemap.xml
```

**AI Smart Card note:** template `public/robots.txt` currently allows named AI UAs with `Content-Signal: ai-train=no, search=yes, ai-input=yes`. When auditing a new site, prefer explicit SearchBot allow + training Disallow (above) unless the client opted into training. Keep `Host:` / `Sitemap:` on the real `SITE_URL`. Still ship optional `/llms.txt` for agent discovery — do not claim it is required for Google AI Overviews.

## Technical audit order

1. CDN/server logs — are registry bots hitting? 403/429/503 = block.
2. Cloudflare/WAF — disable blanket “Block AI bots” / Bot Fight Mode for search bots; allow by UA + published IPs; refresh IP lists.
3. `robots.txt` on every subdomain.
4. Rendering — primary copy in initial HTML (SSR/SSG/ISR). Do not hide key text behind client-only fetch.
5. Hidden content — tabs/accordions that never render, PDF-only or image-only facts: duplicate as HTML text.
6. Indexing — GSC + Bing Webmaster; URL Inspection HTML matches what Googlebot got.
7. Discovery — XML sitemap of canonical URLs, accurate `lastmod`, ETag; **IndexNow** on add/change/delete (Bing prefers stream over batches); real `<a href>` internal links.
8. URL hygiene — canonical, no junk params; 301 for moves; 404 + IndexNow for deletions; stable URLs.
9. Meta (Bing): avoid `NOINDEX` / `NOSNIPPET` / `data-nosnippet` / `NOARCHIVE` / `NOCACHE` on pages that should be cited.
10. JSON-LD — only facts visible on the page; helps, never guarantees.
11. Page experience — speed + mobile.
12. Merchant Center / GBP when local or e-com.

## Content for citation (passage-level)

AI picks **fragments**, not whole pages; Google uses query fan-out.

- One page = one topic; title, H1, description aligned
- Answer first; short lead
- Concrete H2/H3; each section stands alone
- Q&A: human phrasing + 1–2 sentence answer out of context
- Lists, steps, comparison tables over walls of text
- Facts/numbers over “innovative”; explicit definitions
- One entity name for brand/product/city everywhere
- One idea per sentence; normal punctuation; images/video support text (alt, captions, transcripts)
- Refresh stale facts; signal via `lastmod` + IndexNow
- No thin / ad-heavy / affiliate-only pages (Bing may drop grounding rights)

## Off-site

- ChatGPT Business profiles (verify claims on official OpenAI docs before advising clients)
- LinkedIn: same answer-block structure for B2B (platform marketing claim)

## Measurement

- AI Overviews/AI Mode traffic sits in GSC Performance → Web (not a separate type)
- Prefer conversions / engagement over raw clicks
- Log volume of `*-SearchBot` / `*-User`; rising `*-User` = assistants opening pages

## Do not

- Block all AI bots with one rule
- Confuse `Google-Extended` with AI Overviews
- IP-block Anthropic
- Promise guaranteed AI-answer inclusion
- Sell `llms.txt` as mandatory for Google AI features

## Sources

1. https://developers.google.com/search/docs/appearance/ai-features
2. https://developers.google.com/search/blog/2025/05/succeeding-in-ai-search
3. https://developers.google.com/search/docs/fundamentals/seo-starter-guide
4. https://about.ads.microsoft.com/en/blog/post/october-2025/optimizing-your-content-for-inclusion-in-ai-search-answers
5. https://www.bing.com/webmasters/help/webmaster-guidelines-30fba23a
6. https://developers.openai.com/api/docs/bots
7. https://support.claude.com/en/articles/8896518
8. https://docs.perplexity.ai/docs/resources/perplexity-crawlers
9. https://business.linkedin.com/advertise/resources/unlocking-ai-visibility
10. https://www.searchable.com/events/businesses-in-chatgpt (webinar — verify on OpenAI before client advice)
