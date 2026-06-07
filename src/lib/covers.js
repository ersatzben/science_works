// Cover art lookup. Every `src/data/covers/<slug>.json` is keyed by its filename
// slug, which matches the writing collection entry id. Files may be either an
// sw.bitmap.v1 export (a flat `cells` hex array) or a {cols, rows, palette, grid}
// index-grid export — the latter is normalised to sw.bitmap.v1 on load (with the
// same cell metrics as the existing covers). Returns the bitmap, or null.
import { paletteGridToBitmap } from './bitmap.js';

const modules = import.meta.glob('../data/covers/*.json', { eager: true });

const covers = {};
for (const [path, mod] of Object.entries(modules)) {
  const slug = path.split('/').pop().replace(/\.json$/, '');
  const data = mod.default ?? mod;
  covers[slug] = (data.grid && data.palette)
    ? paletteGridToBitmap(data, { size: 12, gap: 1, radius: 2 })
    : data;
}

export function getCover(slug) {
  return covers[slug] ?? null;
}

// Cover for a writing entry. Honours an explicit `cover:` in frontmatter (the
// name of a json in src/data/covers, without extension) so a piece can point at
// a specific cover file; otherwise falls back to the entry's own slug.
export function coverFor(entry) {
  if (!entry) return null;
  return getCover(entry.data?.cover ?? entry.id);
}
