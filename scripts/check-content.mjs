// Friendly content validator — catches the mistakes the Astro build reports
// cryptically (or doesn't catch at all: broken image paths, dangling related
// slugs, malformed TOC markers, invalid art JSON) and explains them in plain
// English. Run with `npm run check`; also runs in CI on every pull request.
//
// Exit code 0 = no errors (warnings allowed), 1 = at least one error.
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parse as parseYaml } from 'yaml';
import { LICENSES } from '../src/lib/licensing.js';
import { TYPE_KEYS } from '../src/lib/scholarly.js';
import { getOrganisation } from '../src/lib/organisations.js';
import { ogContentHash } from './og-hash.mjs';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const WRITING = join(ROOT, 'src/content/writing');
const PUBLIC = join(ROOT, 'public');
const COVERS = join(ROOT, 'src/data/covers');
const GLYPHS = join(ROOT, 'src/data/glyphs');
const PROJECTS = join(ROOT, 'src/data/projects');

const tty = process.stdout.isTTY;
const red = (s) => (tty ? `\x1b[31m${s}\x1b[0m` : s);
const yellow = (s) => (tty ? `\x1b[33m${s}\x1b[0m` : s);
const green = (s) => (tty ? `\x1b[32m${s}\x1b[0m` : s);
const bold = (s) => (tty ? `\x1b[1m${s}\x1b[0m` : s);

let errorCount = 0;
let warnCount = 0;
const error = (where, msg) => { errorCount++; console.log(`  ${red('✗')} ${bold(where)}: ${msg}`); };
const warn = (where, msg) => { warnCount++; console.log(`  ${yellow('⚠')} ${bold(where)}: ${msg}`); };

// ---------------------------------------------------------------------------
// Writing pieces
// ---------------------------------------------------------------------------
const pieceFiles = readdirSync(WRITING).filter((f) => /\.(md|mdx)$/.test(f));
const slugs = new Set(pieceFiles.map((f) => f.replace(/\.(md|mdx)$/, '')));

console.log(bold(`\nChecking ${pieceFiles.length} writing pieces…`));

const REQUIRED = ['title', 'authors', 'date', 'type', 'project'];
// Single source of truth: src/lib/scholarly.js. Add a type there, not here.
const TYPES = TYPE_KEYS;

// Everyone named in people.json (any group) can be an author without a
// `writers:` entry — their bio resolves automatically.
const people = JSON.parse(readFileSync(join(ROOT, 'src/data/people.json'), 'utf8'));
const knownPeople = new Set(Object.values(people).flat().map((p) => p.name));

// Share-card freshness ledger, written by `npm run og` (see scripts/og-hash.mjs).
const ogManifestPath = join(PUBLIC, 'og/manifest.json');
const ogManifest = existsSync(ogManifestPath) ? JSON.parse(readFileSync(ogManifestPath, 'utf8')) : {};

for (const file of pieceFiles) {
  const slug = file.replace(/\.(md|mdx)$/, '');
  const raw = readFileSync(join(WRITING, file), 'utf8');

  const fmMatch = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?/);
  if (!fmMatch) {
    error(file, 'no frontmatter block found — the file must start with --- on its own line, the metadata, then --- again');
    continue;
  }

  let fm;
  try {
    fm = parseYaml(fmMatch[1]);
  } catch (e) {
    error(file, `frontmatter is not valid YAML — ${e.message.split('\n')[0]}`);
    continue;
  }
  // Commented-out content isn't rendered, so don't check it ({/* MDX */} and <!-- HTML -->).
  const body = raw.slice(fmMatch[0].length)
    .replace(/\{\/\*[\s\S]*?\*\/\}/g, '')
    .replace(/<!--[\s\S]*?-->/g, '');

  // Required fields
  for (const field of REQUIRED) {
    if (fm[field] === undefined || fm[field] === null || fm[field] === '') {
      error(file, `missing required frontmatter field "${field}"`);
    }
  }
  if (fm.authors !== undefined && (!Array.isArray(fm.authors) || fm.authors.length === 0)) {
    error(file, 'authors must be a non-empty list, e.g. authors: ["Ben Johnson"]');
  }
  if (fm.type !== undefined && !TYPES.includes(fm.type)) {
    error(file, `type must be one of ${TYPES.join(', ')} (got "${fm.type}")`);
  }
  if (fm.date !== undefined && !(fm.date instanceof Date) && isNaN(Date.parse(fm.date))) {
    error(file, `date "${fm.date}" is not a valid date — use YYYY-MM-DD`);
  }
  for (const flag of ['draft', 'hidden', 'featured']) {
    if (fm[flag] !== undefined && typeof fm[flag] !== 'boolean') {
      error(file, `${flag} must be true or false without quotes (got ${JSON.stringify(fm[flag])})`);
    }
  }
  if (fm.license !== undefined && !LICENSES[fm.license]) {
    error(file, `license "${fm.license}" is not a known code — use one of: ${Object.keys(LICENSES).join(', ')}`);
  }

  // related: must point at existing pieces
  if (fm.related !== undefined) {
    if (!Array.isArray(fm.related)) {
      error(file, 'related must be a list of slugs, e.g. related: ["the-three-bucket-problem"]');
    } else {
      for (const rel of fm.related) {
        if (!slugs.has(rel)) error(file, `related piece "${rel}" does not exist — check the filename (without .md/.mdx) in src/content/writing/`);
      }
    }
  }

  // cover: explicit cover must exist; missing implicit cover is only a warning
  // (the site shows a neutral pixel placeholder).
  if (fm.cover !== undefined) {
    if (!existsSync(join(COVERS, `${fm.cover}.json`))) {
      error(file, `frontmatter names cover "${fm.cover}" but src/data/covers/${fm.cover}.json does not exist`);
    }
  } else if (!existsSync(join(COVERS, `${slug}.json`)) && !fm.draft && !fm.hidden) {
    warn(file, `no cover art yet (src/data/covers/${slug}.json) — the piece will show the neutral placeholder`);
  }

  // Authors should resolve to a bio: either on the /about page (people.json)
  // or supplied via writers: in this piece's frontmatter. An organisation
  // author (a house piece published under the studio's name) is exempt — it is
  // meant to have no bio card, and its byline links to /about instead.
  const writerNames = new Set((fm.writers ?? []).map((w) => w?.name).filter(Boolean));
  for (const author of Array.isArray(fm.authors) ? fm.authors : []) {
    if (getOrganisation(author)) continue;
    if (!knownPeople.has(author) && !writerNames.has(author)) {
      warn(file, `author "${author}" is not in people.json and has no writers: entry — they will appear with no role or bio`);
    }
  }

  // A supplied `pdf:` must actually be on disk. Getting this wrong is invisible
  // until a reader clicks Download and gets a 404 — and because an explicit
  // pdf: also suppresses generation, there is no fallback file behind it.
  if (typeof fm.pdf === 'string' && fm.pdf.trim()) {
    const ref = fm.pdf.trim();
    if (ref.startsWith('/')) {
      if (!existsSync(join(PUBLIC, ref.replace(/^\//, '')))) {
        error(file, `pdf: points at "${ref}" but no such file exists in public/ — the Download button would 404`);
      }
    }
  }

  // Share card (public/og/<slug>.png): warn when it is missing or was
  // generated from older content — `npm run og` refreshes it. Hand-made cards
  // (ogManual: true) and hidden pieces are exempt.
  if (!fm.hidden && !fm.ogManual) {
    if (!existsSync(join(PUBLIC, 'og', `${slug}.png`))) {
      warn(file, 'no share card yet (public/og/' + slug + '.png) — run `npm run og` to generate it');
    } else if (ogManifest[slug] !== ogContentHash(fm, slug, COVERS)) {
      warn(file, 'the share card is out of date with the piece or its cover — run `npm run og` to refresh it');
    }
  }

  // Body: image references must exist in public/
  const imgRefs = [
    ...body.matchAll(/<(?:Figure|img)\s[^>]*src=["'](\/[^"']+)["']/g),
    ...body.matchAll(/!\[[^\]]*\]\((\/[^)\s]+)/g),
  ].map((m) => m[1]);
  for (const ref of imgRefs) {
    if (!existsSync(join(PUBLIC, decodeURIComponent(ref)))) {
      error(file, `image ${ref} does not exist under public/ — check the path and filename (case-sensitive on the live site)`);
    }
  }

  // Body: <Figure> needs its import, and only works in .mdx
  if (/<Figure[\s>]/.test(body)) {
    if (file.endsWith('.md')) {
      error(file, '<Figure> only works in .mdx files — rename this file to .mdx');
    } else if (!/import\s+Figure\s+from/.test(body)) {
      error(file, `<Figure> is used but never imported — add this line right after the frontmatter:\n      import Figure from '../../components/Figure.astro';`);
    }
  }

  // Body: TOC alias markers must be well-formed and at the end of a heading
  for (const line of body.split('\n')) {
    if (!line.includes('[[TOC')) continue;
    const isHeading = /^#{1,6}\s/.test(line);
    const wellFormed = /\[\[TOC:\s*[^\]]+?\]\]\s*$/.test(line);
    if (!isHeading) {
      error(file, `a [[TOC: …]] marker appears on a non-heading line — it only works at the end of a line starting with #: "${line.trim().slice(0, 60)}…"`);
    } else if (!wellFormed) {
      error(file, `malformed TOC marker (must be exactly [[TOC: Short name]] at the end of the heading): "${line.trim().slice(0, 80)}"`);
    }
  }
}

// ---------------------------------------------------------------------------
// Art JSON (covers, glyphs, projects) — see docs/art-formats.md
// ---------------------------------------------------------------------------
const HEX = /^#[0-9a-f]{6}$/i;

function checkArtFile(dir, file, { cols: wantCols, rows: wantRows } = {}) {
  const rel = `${dir.split('/').pop()}/${file}`;
  let data;
  try {
    data = JSON.parse(readFileSync(join(dir, file), 'utf8'));
  } catch (e) {
    error(rel, `not valid JSON — ${e.message.split('\n')[0]}`);
    return;
  }
  const { cols, rows } = data;
  if (!Number.isInteger(cols) || !Number.isInteger(rows)) {
    error(rel, 'must have integer "cols" and "rows"');
    return;
  }
  if (wantCols && (cols !== wantCols || rows !== wantRows)) {
    warn(rel, `is ${cols}×${rows}; the standard size for this folder is ${wantCols}×${wantRows}`);
  }
  if (Array.isArray(data.grid) && Array.isArray(data.palette)) {
    // Format A: palette + index grid
    for (const [i, hex] of data.palette.entries()) {
      if (!HEX.test(hex)) { error(rel, `palette[${i}] is "${hex}" — colours must be 6-digit hex like "#eb3131"`); break; }
    }
    if (data.grid.length !== rows) error(rel, `grid has ${data.grid.length} rows but rows says ${rows}`);
    outer: for (const [r, row] of data.grid.entries()) {
      if (!Array.isArray(row) || row.length !== cols) { error(rel, `grid row ${r} has ${row?.length ?? 0} cells but cols says ${cols}`); break; }
      for (const v of row) {
        if (!Number.isInteger(v) || v >= data.palette.length) {
          error(rel, `grid row ${r} contains index ${JSON.stringify(v)} but the palette only has ${data.palette.length} colours (0–${data.palette.length - 1}; use -1 for transparent)`);
          break outer;
        }
      }
    }
  } else if (Array.isArray(data.cells)) {
    // Format B: sw.bitmap.v1 flat cells
    if (data.cells.length !== cols * rows) {
      error(rel, `cells has ${data.cells.length} entries but cols×rows = ${cols * rows}`);
    }
    const bad = data.cells.find((c) => c !== null && !HEX.test(c));
    if (bad !== undefined) error(rel, `cells contains "${bad}" — entries must be 6-digit hex like "#eb3131", or null for transparent`);
  } else {
    error(rel, 'unrecognised format — needs either {palette, grid} or {cells}; see docs/art-formats.md');
  }
}

console.log(bold('\nChecking art JSON (covers, glyphs, projects)…'));
for (const f of readdirSync(COVERS).filter((f) => f.endsWith('.json'))) {
  checkArtFile(COVERS, f, { cols: 40, rows: 25 });
  const slug = f.replace(/\.json$/, '');
  if (!slugs.has(slug)) {
    // Explicit cover: frontmatter may point at any name, so only flag files no
    // piece references at all.
    const referenced = pieceFiles.some((pf) => {
      const raw = readFileSync(join(WRITING, pf), 'utf8');
      return new RegExp(`cover:\\s*["']?${slug}["']?`).test(raw);
    });
    if (!referenced) warn(`covers/${f}`, 'no writing piece uses this cover — is the filename right? It must match the piece\'s slug');
  }
}
for (const f of readdirSync(GLYPHS).filter((f) => f.endsWith('.json'))) checkArtFile(GLYPHS, f, { cols: 9, rows: 6 });
for (const f of readdirSync(PROJECTS).filter((f) => f.endsWith('.json'))) checkArtFile(PROJECTS, f, { cols: 18, rows: 37 });

// ---------------------------------------------------------------------------
// People: photos must exist; team members should have glyphs
// ---------------------------------------------------------------------------
console.log(bold('\nChecking people.json…'));
const slugifyName = (name) =>
  (name || '').trim().toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');

for (const [group, members] of Object.entries(people)) {
  for (const p of members) {
    if (p.photo && !existsSync(join(PUBLIC, 'assets/images/people', p.photo))) {
      error('people.json', `${p.name} (${group}) lists photo "${p.photo}" but public/assets/images/people/${p.photo} does not exist`);
    }
    if (!existsSync(join(GLYPHS, `${slugifyName(p.name)}.json`))) {
      warn('people.json', `${p.name} (${group}) has no glyph file (src/data/glyphs/${slugifyName(p.name)}.json) — the shared fallback glyph will show`);
    }
  }
}

// ---------------------------------------------------------------------------
console.log('');
if (errorCount) {
  console.log(red(bold(`✗ ${errorCount} error${errorCount === 1 ? '' : 's'}`)) + (warnCount ? yellow(`, ${warnCount} warning${warnCount === 1 ? '' : 's'}`) : ''));
  console.log('Fix the errors above before publishing — they would break the page or the build.');
  process.exit(1);
} else if (warnCount) {
  console.log(green('✓ No errors') + yellow(` (${warnCount} warning${warnCount === 1 ? '' : 's'} — worth a look, but nothing is broken)`));
} else {
  console.log(green('✓ All content checks passed'));
}
