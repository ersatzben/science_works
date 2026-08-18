# Science Works website — guide for Claude Code

Static Astro 5 site for https://science.works — essays and reports in MD/MDX,
deployed to GitHub Pages. No server, no database, no CMS. You are often the
"technical person" here: assume the human you're helping may not know git,
terminals, or markdown. Explain what you're doing and prefer the guided paths
in `docs/` over improvising.

## The docs (read the one that matches the task)

- `docs/authoring.md` — adding/editing writing pieces (the most common task)
- `docs/art-formats.md` — exact JSON formats for all pixel/mosaic art
- `docs/homepage.md` — map of the homepage containers in `src/pages/index.astro` (hero text is duplicated for desktop/mobile — edit both)
- `docs/operations.md` — deploys, staging vs production, DNS, access, failure playbook
- `docs/fair-signposting.md` — scholarly metadata, licensing, DOIs, the production gate
- `docs/signatory-form.md` — the open-letter signatory form, its Google Sheet review queue, and how a name gets published

## Commands

- `npm run dev` — dev server at http://localhost:4321 (`.claude/launch.json` runs it on 4399)
- `npm run new-post -- "Title"` — scaffold a new piece (draft: true) + its image folder
- `npm run check` — friendly content/art validation; run before every commit that touches content
- `npm run build` — full build **including** postbuild PDF generation (needs Playwright Chromium; slow). `npx astro build` skips the PDFs.

## Content model

One collection: `src/content/writing/*.{md,mdx}` (schema in `src/content.config.ts`,
which is well-commented — read it before touching frontmatter).

Semantics that are easy to get wrong:
- `draft: true` — excluded from all listings/feeds, **but the page still builds
  and is reachable by URL on the live site**. Not private.
- `hidden: true` — no page is built at all.
- Authors resolve to role/bio/photo from `src/data/people.json` by exact name.
  Guest authors need a `writers:` entry in the piece's frontmatter instead.
- `related:` takes filename slugs of other pieces; `cover:` names a JSON in
  `src/data/covers/` (defaults to the piece's own slug).
- `license:` must be a code from `src/lib/licensing.js`; omit for CC BY 4.0.

Body conventions:
- Images live in `public/assets/images/writing/<slug>/`, embedded with
  `<Figure src="..." caption="..." />` — MDX only, and `Figure` must be imported.
  Caption HTML uses single quotes inside: `caption="… <a href='…'>source</a>"`.
- `## Long heading [[TOC: Short name]]` gives the sidebar TOC a short label
  (remark plugin strips the marker).
- GFM footnotes (`[^1]`) work.
- A "Download PDF" button appears on every piece automatically (generated at
  build time); frontmatter `pdf:` overrides the target.

## Deploys (two repos, one codebase)

Pushing `main` triggers `.github/workflows/deploy.yml` (GitHub Pages):
- `origin` = ersatzben/science_works_new → **staging** (staging.science.works)
- `prod` = ersatzben/science_works → **production** (science.works; has the
  `SITE_URL` + `PRODUCTION` Actions variables set)

So: merge/push to origin main = staging deploy; `git push prod main` = production.
PRs get `.github/workflows/check.yml` (validation + build, no PDFs).

## Do not touch without explicit instruction

- `src/lib/production.js` — the two-lock production gate. Everything asserting
  "this is the canonical science.works" (Signposting, DOI, `_headers`) hides
  behind it. Never weaken it, never make staging claim production identity.
- `src/lib/{signposting,scholarly,licensing}.js`, `scripts/generate-headers.mjs`,
  `src/pages/{robots.txt.ts,headers-source.txt.ts}` — the FAIR/SEO layer;
  read `docs/fair-signposting.md` first.
- Art JSON is authored by Laura Ryan — don't regenerate or "fix" art files
  beyond what `npm run check` reports as structurally invalid.

## House style

Code is commented in full sentences explaining *why*; match that. British
English in all prose and docs.
