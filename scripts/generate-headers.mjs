// Postbuild: turn the build's headers-source.txt into dist/_headers.
//
// The Astro route /headers-source.txt renders the per-piece FAIR Signposting
// relations in Cloudflare/Netlify `_headers` syntax (and only in production —
// off-prod it's empty). This step moves that to dist/_headers and removes the
// intermediate file so it isn't served publicly.
//
// dist/_headers is INERT on GitHub Pages (it ignores the file) and is honoured
// automatically on Cloudflare Pages / Netlify — so the HTTP Link-header ceiling
// ships now and is decoupled from any future host migration.
import { readFile, writeFile, unlink } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const DIST = fileURLToPath(new URL('../dist', import.meta.url));
const SRC = join(DIST, 'headers-source.txt');
const OUT = join(DIST, '_headers');

async function main() {
  if (!existsSync(SRC)) {
    console.log('[headers] no headers-source.txt — nothing to do.');
    return;
  }

  const body = (await readFile(SRC, 'utf8')).trim();
  await unlink(SRC); // never serve the intermediate publicly

  if (!body) {
    // Off-production (or no eligible pieces): emit nothing.
    console.log('[headers] empty source (non-production) — no _headers written.');
    return;
  }

  const header =
    '# FAIR Signposting HTTP Link headers — generated, do not edit.\n' +
    '# Inert on GitHub Pages; honoured by Cloudflare Pages / Netlify.\n\n';
  await writeFile(OUT, header + body + '\n');
  const routes = (body.match(/^\/writing\//gm) || []).length;
  console.log(`[headers] wrote dist/_headers (${routes} route block(s)).`);
}

main().catch((err) => { console.error('[headers] failed:', err); process.exit(1); });
