# Erythro templates

Reusable site starters for fast client deploys. Each folder is a self-contained Next.js app you can copy into a new repo.

| Template | Use when |
|---|---|
| [`product-scroll-landing`](./product-scroll-landing) | Scroll-assembled product landing (ORA 60A pattern): GSAP pin/scrub frames, i18n EN/RU/HE/AR, Vercel + `*.erythro.ai` |

## Start a new site from a template

```bash
# option A — degit one folder
npx degit erythroai-droid/templates/product-scroll-landing my-client-site

# option B — sparse clone
git clone --filter=blob:none --sparse https://github.com/erythroai-droid/templates.git
cd templates
git sparse-checkout set product-scroll-landing
```

Then inside the template folder:

```bash
npm install
npm run new-site -- <slug> "<Brand>" "<Model>"
npm run dev
```

See each template’s `README.md` and `SITE.md` for media, i18n, and Vercel/DNS steps.
