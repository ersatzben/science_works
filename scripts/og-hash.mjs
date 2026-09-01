// Shared between scripts/generate-og-writing.mjs (which stamps hashes into
// public/og/manifest.json) and scripts/check-content.mjs (which compares them
// to warn about stale share cards). A card depends on these frontmatter
// fields, the cover art bytes, and the design VERSION — nothing else.
import { createHash } from 'node:crypto';
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

// Bump when the card design changes so every card counts as stale.
export const OG_VERSION = 8;

export function ogContentHash(fm, slug, coversDir) {
  const h = createHash('sha1');
  h.update(JSON.stringify({
    v: OG_VERSION,
    title: fm.shortTitle ?? fm.title,
    standfirst: fm.ogSubtitle ?? fm.shortSubtitle ?? fm.subtitle ?? '',
    type: fm.type,
    authors: fm.authors ?? [],
  }));
  const coverPath = join(coversDir, `${fm.cover ?? slug}.json`);
  h.update(existsSync(coverPath) ? readFileSync(coverPath) : slug);
  return h.digest('hex');
}
