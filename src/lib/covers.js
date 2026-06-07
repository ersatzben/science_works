// Cover art lookup. Every `src/data/covers/<slug>.json` (an sw.bitmap.v1 export
// from tools/image2bitmap.html) is keyed by its filename slug, which matches the
// writing collection entry id. Returns the parsed bitmap, or null if none exists.
const modules = import.meta.glob('../data/covers/*.json', { eager: true });

const covers = {};
for (const [path, mod] of Object.entries(modules)) {
  const slug = path.split('/').pop().replace(/\.json$/, '');
  covers[slug] = mod.default ?? mod;
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
