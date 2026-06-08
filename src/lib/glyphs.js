// Card-glyph lookup. Each `src/data/glyphs/<firstname-lastname>.json` is a
// {cols, rows, palette, grid} mosaic (same format as src/data/covers/), keyed by
// the person's name slug. Falls back to `_fallback.json` when a person has no
// file yet. Returns a normalised bitmap (flat `cells` hex array; null = blank).
import { paletteGridToBitmap } from './bitmap.js';

const modules = import.meta.glob('../data/glyphs/*.json', { eager: true });

const glyphs = {};
for (const [path, mod] of Object.entries(modules)) {
  const slug = path.split('/').pop().replace(/\.json$/, '');
  const data = mod.default ?? mod;
  glyphs[slug] = (data.grid && data.palette) ? paletteGridToBitmap(data) : data;
}

const slugify = (name) =>
  (name || '').trim().toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');

// Bitmap for a person's name, or the shared fallback if they have no file.
export function glyphFor(name) {
  return glyphs[slugify(name)] ?? glyphs['_fallback'] ?? null;
}
