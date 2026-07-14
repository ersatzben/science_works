# Pixel-art JSON formats

All the artwork on science.works — writing covers, the little glyphs on people
cards, the tall project strips, the homepage mosaics — is stored as small JSON
files describing a grid of coloured cells, and rendered as crisp SVG by
`src/components/GridArt.astro`. **Laura Ryan authors the art.** This document
is the exact contract for each file: what to produce, where to put it, and what
sizes the site expects.

`npm run check` validates every art file against these rules and explains any
problem in plain English — run it after adding or editing art.

## The two accepted formats

Both formats describe the same thing: a `cols` × `rows` grid of cells, each
either a colour or transparent. Loaders accept either format everywhere
(covers, glyphs); pick whichever is easier to produce.

### Format A — palette + index grid (preferred: smaller, easier to hand-edit)

```json
{
  "cols": 3,
  "rows": 2,
  "palette": ["#eb3131", "#00726b", "#ebdfc2"],
  "grid": [
    [0, 1, 2],
    [2, -1, 0]
  ]
}
```

- `palette` — a list of 6-digit lowercase-or-uppercase hex colours (`"#eb3131"`).
- `grid` — exactly `rows` arrays of exactly `cols` integers each. Every number
  is an index into `palette` (`0` = first colour). **`-1` means transparent.**

### Format B — `sw.bitmap.v1` flat cell list (what tools/image2bitmap.html exports)

```json
{
  "type": "sw.bitmap.v1",
  "cols": 3,
  "rows": 2,
  "cell": { "size": 9, "gap": 1, "radius": 2 },
  "transparent": false,
  "cells": ["#eb3131", "#00726b", "#ebdfc2", "#ebdfc2", null, "#eb3131"]
}
```

- `cells` — exactly `cols × rows` entries, **row by row, left to right**. Each
  entry is a hex colour or `null` for transparent.
- `cell` — how it renders: cell size, gap between cells, and corner radius, in
  SVG units. `{ "size": 9, "gap": 1, "radius": 2 }` is the house default.
  (Format A files get sensible metrics applied automatically.)

## Where each kind of art lives

### Writing covers — `src/data/covers/<piece-slug>.json`

- **Size: 40 × 25.** Filename must match the piece's slug (its filename in
  `src/content/writing/` without the extension), unless the piece's frontmatter
  sets `cover:` to a different name.
- **Cropping — design for it.** The renderer centre-crops covers to the shape of
  each slot: the writing index shows them at 3:2 (loses roughly the outer
  column each side), and the homepage carousel shows them **square** (only the
  central 25 of the 40 columns survive). Keep the key subject inside the
  central square; treat the outer ~7 columns each side as bleed.
- A piece with no cover file shows a neutral pixel placeholder — publishing
  before the cover exists is fine.

### People glyphs — `src/data/glyphs/<firstname-lastname>.json`

- **Size: 9 × 6.** Filename is the person's name lowercased with hyphens
  (accents stripped): `laura-ryan.json`.
- Shown on /about cards and /people profile pages. Anyone without a file gets
  `_fallback.json` automatically, so a missing glyph never breaks anything.
- (The `glyph` arrays inside `src/data/people.json` are a legacy leftover —
  nothing reads them. The files in this folder are what count.)

### Project strips — `src/data/projects/<project-slug>.json`

- **Size: 18 × 37** (tall portrait strips on the homepage).
- **The left 8 columns must work on their own** — mobile shows only columns
  1–8 of the full strip.
- Project slugs are mapped in `src/lib/projects.js`; a new project needs a row
  added there (a technical change — ask Claude Code).

### Everything else (rarely touched)

- `src/data/mosaics/net-*.json` — homepage network art, generated from source
  images by `scripts/mosaic-from-image.mjs` (see below).
- `src/data/decor/*.json` — page banner decorations (Format B).
- `src/data/splash/*.json` — the homepage canvas animation frames, edited live
  via the dev-server-only editor at `/dev/canvas-editor`.
- `src/data/fleurons/default.json` — the section-break ornament.

## Tools available today

| Tool | What it does | Requirements |
| --- | --- | --- |
| `tools/image2bitmap.html` | Turn an image into Format B JSON | Open the file in any browser — no install |
| `tools/editor.html` | Pixel editor for the homepage matrix art (exports its own multi-grid payload, not the formats above) | Any browser |
| `/dev/canvas-editor` | Paint the homepage splash canvas, saves directly to the repo | Running dev server (`npm run dev`) |
| `scripts/mosaic-from-image.mjs` | Pixel-art photo → mosaic JSON | Node + `sharp` (not in package.json — `npm install --no-save sharp` first) |

## ⚠ Tooling gap — a cover/glyph editor needs building

There is currently **no friendly tool for drawing covers and glyphs from
scratch**: `image2bitmap.html` only converts existing images, and `editor.html`
is wired to the homepage matrix, not to these formats. Today the workflow
assumes Laura produces the JSON by hand or via image conversion.

**If Laura can't work that way, a dedicated editor needs creating**: a single
static HTML page (like the existing tools — no server, runs from a file or
could be hosted under `/dev/`) with a 40×25 / 9×6 / 18×37 canvas, the house
palette preloaded, and one-click export of Format A JSON named after the
slug. This is a well-defined, self-contained build — ask Claude Code to make it
and point it at this document.
