# Science Works Web Site

The website for [Science Works](https://science.works), an independent policy
and research studio based in the UK. A fully static [Astro](https://astro.build)
site: writing lives as Markdown/MDX files, art as small pixel-grid JSON files,
and GitHub Pages serves the built result. No server, no database, no CMS.

Any questions, get in touch at contact@science.works

## I want to…

| Task | Where to look |
| --- | --- |
| **Add or edit an essay/report** | [docs/authoring.md](docs/authoring.md) — the step-by-step runbook |
| Make cover art, glyphs, or other pixel art | [docs/art-formats.md](docs/art-formats.md) — exact JSON formats |
| Deploy, fix a failed build, DNS, access | [docs/operations.md](docs/operations.md) |
| Understand the scholarly metadata / DOI layer | [docs/fair-signposting.md](docs/fair-signposting.md) |

The recommended way to work on this site without technical knowledge is
[Claude Code](https://claude.com/claude-code) opened in this folder — it reads
[CLAUDE.md](CLAUDE.md) and the docs above and can do every task in them for you.

## Quickstart

```sh
npm install          # once
npm run dev          # local preview at http://localhost:4321
npm run new-post -- "Title of a New Piece"   # scaffold a new piece
npm run check        # validate all content and art, with friendly errors
```

Pushing `main` deploys **staging** (staging.science.works) automatically;
`git push prod main` deploys **production** (science.works). Details in
[docs/operations.md](docs/operations.md).

## Repository layout

```
src/content/writing/   the essays and reports (one .md/.mdx file each)
src/data/              art JSON (covers, glyphs, projects…), people.json
src/pages/             the site's pages and routes
src/components/        building blocks (Figure, GridArt, header/footer…)
src/layouts/           page chrome, incl. the article layout
src/lib/               logic: people, covers, licensing, the production gate
src/plugins/           markdown extensions ([[TOC: …]] aliases, external links)
public/assets/         images and static files, served as-is
scripts/               build steps (PDF generation, headers) and tooling
tools/                 browser-based art utilities (open the .html files directly)
docs/                  the documentation listed above
```
