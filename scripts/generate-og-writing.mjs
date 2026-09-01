// Generate per-piece Open Graph share cards (1200×630) for every writing piece:
// public/og/<slug>.png. The design follows the hand-made card for the UKRI
// open letter: the piece's cover mosaic full-bleed on the left two-thirds, and
// a cream panel on the right carrying the logo lockup, a type badge (ESSAY /
// REPORT / LETTER…), the title in Playfair Display, a rule, the standfirst,
// and the authors in red Copperplate caps.
//
//   npm run og            — regenerate cards whose piece/cover changed
//   npm run og -- --force — regenerate everything
//   npm run og -- <slug>  — regenerate one piece (implies --force for it)
//
// Text sources (shortest first, so cards don't drown in copy):
//   title      = shortTitle ?? title
//   standfirst = ogSubtitle ?? shortSubtitle ?? subtitle  (never summary — too long)
//
// A piece can opt out with `ogManual: true` in frontmatter — its committed
// public/og/<slug>.png is left alone (for hand-made cards).
//
// Freshness is tracked in public/og/manifest.json (a content hash per slug —
// see scripts/og-hash.mjs); `npm run check` warns when a card is stale. Bump
// OG_VERSION there after design changes so every card regenerates.
import { readFileSync, writeFileSync, readdirSync, mkdirSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';
import { parse as parseYaml } from 'yaml';
import * as fontkit from 'fontkit';
import { SCHOLARLY_TYPES } from '../src/lib/scholarly.js';
import { ogContentHash } from './og-hash.mjs';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const WRITING = join(ROOT, 'src/content/writing');
const COVERS = join(ROOT, 'src/data/covers');
const OUT_DIR = join(ROOT, 'public/og');
const MANIFEST = join(OUT_DIR, 'manifest.json');

// librsvg (inside sharp) resolves fonts through fontconfig. Point it at the
// repo's own font files — public/assets/fonts (Antique Olive, Copperplate) and
// assets/fonts (Playfair Display, vendored for generation only) — so cards
// render identically everywhere, including CI.
const FC_DIR = join(ROOT, 'node_modules/.cache/og-writing-fontconfig');
mkdirSync(FC_DIR, { recursive: true });
writeFileSync(join(FC_DIR, 'fonts.conf'), `<?xml version="1.0"?>
<!DOCTYPE fontconfig SYSTEM "fonts.dtd">
<fontconfig>
  <dir>${join(ROOT, 'public/assets/fonts')}</dir>
  <dir>${join(ROOT, 'assets/fonts')}</dir>
  <cachedir>${join(FC_DIR, 'cache')}</cachedir>
</fontconfig>
`);
process.env.FONTCONFIG_FILE = join(FC_DIR, 'fonts.conf');
const sharp = (await import('sharp')).default;

// ── design constants ─────────────────────────────────────────────────
const W = 1200, H = 630;
// The art region holds a whole number of standard cover tiles (40×25 art at a
// pitch of 630/25 = 25.2px → 30 columns = 756px), so no tile is cut at the
// panel boundary or the card edges.
const STD_ROWS = 25;
const PITCH = H / STD_ROWS;
const PANEL_X = Math.floor(768 / PITCH) * PITCH;   // 756: whole-tile art width
const CREAM = '#fcf9f5';                  // panel + grout (sampled from the hand-made card)
const PLUM = '#66223b';                   // --text
const RED = '#eb3131';                    // --theme
const TEXT_X = PANEL_X + 38;              // panel text left edge
const TEXT_W = 1200 - TEXT_X - 40;        // panel text width

// Per-piece horizontal nudge (in cover cells) for the art crop, when a motif
// sits off-centre. Positive shows more of the cover's right side.
const ART_NUDGE = {};

// ── text measurement (real glyph metrics, so wrapping is trustworthy) ─
const playfair = fontkit.openSync(join(ROOT, 'assets/fonts/playfair-display/PlayfairDisplay-Regular.ttf'));
const copperplate = fontkit.openSync(join(ROOT, 'public/assets/fonts/Copperplate30.otf'));
const roboto = fontkit.openSync(join(ROOT, 'assets/fonts/roboto/Roboto-Bold.ttf'));
const antiqueOlive = fontkit.openSync(join(ROOT, 'public/assets/fonts/antique-olive-std/Antique-Olive-Std-Bold_3863.ttf'));

const measure = (font, text, size, letterSpacing = 0) =>
  (font.layout(text).advanceWidth / font.unitsPerEm) * size + letterSpacing * Math.max(0, text.length - 1);

// Greedy word wrap. A single word wider than maxW gets its own (overflowing)
// line rather than being broken mid-word. With breakHyphens, a hyphenated word
// may split after its hyphen ("Counter-" / "Reformation") when the line is full.
function wrap(font, text, size, maxW, letterSpacing = 0, breakHyphens = false) {
  const tokens = [];
  for (const word of text.split(/\s+/).filter(Boolean)) {
    const parts = breakHyphens ? word.split(/(?<=-)(?=.)/) : [word];
    parts.forEach((p, i) => tokens.push({ text: p, sep: i === 0 ? ' ' : '' }));
  }
  const lines = [];
  let line = '';
  for (const tok of tokens) {
    const candidate = line ? line + tok.sep + tok.text : tok.text;
    if (line && measure(font, candidate.trimEnd(), size, letterSpacing) > maxW) { lines.push(line); line = tok.text; }
    else line = candidate;
  }
  if (line) lines.push(line);
  return lines;
}

const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

// Render text as glyph outlines instead of an SVG <text> element. Needed for
// Copperplate30.otf: the sharp/librsvg text pipeline refuses that old Adobe
// CFF file (it falls back to a generic serif) even though fontconfig matches
// it, so we draw the exact site glyphs ourselves via fontkit. Returns a <g>
// of <path>s with (x, baselineY) as the text origin.
function textAsPaths(font, text, size, x, baselineY, letterSpacing = 0, fill = '#000') {
  const scale = size / font.unitsPerEm;
  const run = font.layout(text);
  const paths = [];
  let penX = x;
  for (let i = 0; i < run.glyphs.length; i++) {
    const d = run.glyphs[i].path.toSVG();
    if (d) paths.push(`<path transform="translate(${penX.toFixed(2)} ${baselineY.toFixed(2)}) scale(${scale.toFixed(5)} ${-scale.toFixed(5)})" d="${d}"/>`);
    penX += run.positions[i].xAdvance * scale + letterSpacing;
  }
  return `<g fill="${fill}">${paths.join('')}</g>`;
}

// ── cover art (same normalisation as src/lib/covers.js) ──────────────
function loadCover(name) {
  const p = join(COVERS, `${name}.json`);
  if (!existsSync(p)) return null;
  const data = JSON.parse(readFileSync(p, 'utf8'));
  if (data.grid && data.palette) {
    const cells = [];
    for (let r = 0; r < data.rows; r++)
      for (let c = 0; c < data.cols; c++) {
        const v = data.grid[r][c];
        cells.push(v < 0 ? null : data.palette[v]);
      }
    return { cols: data.cols, rows: data.rows, cells };
  }
  if (Array.isArray(data.cells)) return { cols: data.cols, rows: data.rows, cells: data.cells };
  return null;
}

// Deterministic fallback field for pieces with no cover yet — pale brand tiles
// with sparse confetti, seeded by slug so the card is stable across rebuilds.
const hashStr = (s) => { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; };
const mulberry32 = (a) => () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
function fallbackCover(slug) {
  const rng = mulberry32(hashStr(slug));
  const pale = ['#faf8f6', '#f2ece5', '#f3f2ec', '#eee7e2', '#f4eceb', '#dbe0f0'];
  const confetti = ['#eb3131', '#f45e57', '#004ee6', '#64b37b', '#00726b', '#72679b', '#ebe5cf'];
  const cols = 40, rows = 25, cells = [];
  for (let i = 0; i < cols * rows; i++)
    cells.push(rng() < 0.04 ? confetti[(rng() * confetti.length) | 0] : pale[(rng() * pale.length) | 0]);
  return { cols, rows, cells };
}

// ── card composition ─────────────────────────────────────────────────
// The logo's molecule mark is a raster embed; prepare it once.
const markPng = await sharp(join(ROOT, 'public/assets/images/FINAL4.svg')).resize({ height: 34 }).png().toBuffer();
const markMeta = await sharp(markPng).metadata();

function artSvg(cover, slug) {
  // Fill the card height exactly, and show only whole columns: a centred run
  // of the cover, shifted by the per-piece nudge. For the standard 40×25 art
  // the horizontal pitch equals the vertical one; a non-standard cover gets an
  // imperceptibly rectangular pitch rather than cut tiles.
  const pitchY = H / cover.rows;
  const nVisible = Math.max(1, Math.round(PANEL_X / pitchY));
  const pitchX = PANEL_X / nVisible;
  const startCol = Math.min(Math.max(0, Math.floor((cover.cols - nVisible) / 2) + (ART_NUDGE[slug] ?? 0)), Math.max(0, cover.cols - nVisible));
  const cell = Math.min(pitchX, pitchY) * (12 / 13.5); // grout ratio ≈ the site's GridArt
  const rad = cell / 6;
  const parts = [];
  for (let r = 0; r < cover.rows; r++)
    for (let c = startCol; c < Math.min(cover.cols, startCol + nVisible); c++) {
      const col = cover.cells[r * cover.cols + c];
      if (!col) continue;
      parts.push(`<rect x="${((c - startCol) * pitchX + (pitchX - cell) / 2).toFixed(2)}" y="${(r * pitchY + (pitchY - cell) / 2).toFixed(2)}" width="${cell.toFixed(2)}" height="${cell.toFixed(2)}" rx="${rad.toFixed(2)}" fill="${col}"/>`);
    }
  return parts.join('');
}

function card(piece) {
  const { slug, fm } = piece;
  const title = fm.shortTitle ?? fm.title;
  const standfirst = fm.ogSubtitle ?? fm.shortSubtitle ?? fm.subtitle ?? '';
  const badge = (SCHOLARLY_TYPES[fm.type]?.label ?? fm.type ?? 'essay').toUpperCase();
  // Mixed case on purpose: Copperplate is an all-caps face whose lowercase
  // renders as smaller capitals, so "Ben Johnson" gets tall initials.
  const byline = (fm.authors ?? []).join(' · ');
  const cover = loadCover(fm.cover ?? slug) ?? fallbackCover(slug);

  const parts = [`<rect width="${W}" height="${H}" fill="${CREAM}"/>`];
  parts.push(artSvg(cover, slug));
  // The panel is drawn after the art so tiles crossing the boundary are cleanly cut.
  parts.push(`<rect x="${PANEL_X}" y="0" width="${W - PANEL_X}" height="${H}" fill="${CREAM}"/>`);

  // Header: molecule mark + wordmark on the left, type badge on the right.
  const headerCy = 46;
  parts.push(`<image x="${TEXT_X}" y="${headerCy - markMeta.height / 2}" width="${markMeta.width}" height="${markMeta.height}" href="data:image/png;base64,${markPng.toString('base64')}"/>`);
  const wordX = TEXT_X + markMeta.width + 9;
  parts.push(`<text x="${wordX}" y="${headerCy + 7.5}" font-family="'Antique Olive Std', 'Antique Olive', sans-serif" font-weight="bold" font-size="21" letter-spacing="-0.5" fill="${RED}">SCIENCE WORKS</text>`);
  const badgeSize = 18;
  const badgeW = measure(roboto, badge, badgeSize, 1);
  const badgeX = TEXT_X + TEXT_W - badgeW;
  const squareX = badgeX - 22;
  parts.push(`<rect x="${squareX}" y="${headerCy - 7}" width="14" height="14" rx="1.5" fill="${RED}"/>`);
  parts.push(`<text x="${badgeX}" y="${headerCy + 6.5}" font-family="Roboto, sans-serif" font-weight="700" font-size="${badgeSize}" letter-spacing="1" fill="${RED}">${esc(badge)}</text>`);
  // Divider halfway between the end of the wordmark and the badge's red square.
  const wordEnd = wordX + measure(antiqueOlive, 'SCIENCE WORKS', 21, -0.5);
  const dividerX = (wordEnd + squareX) / 2;
  parts.push(`<line x1="${dividerX.toFixed(1)}" y1="${headerCy - 13}" x2="${dividerX.toFixed(1)}" y2="${headerCy + 13}" stroke="${RED}" stroke-width="1.5"/>`);

  // Title: step the size down until it wraps into at most three lines; a very
  // long title may take four. The floor size keeps whatever it needs. If a
  // long hyphenated word is what forces the type small, allow breaking after
  // the hyphen — but only when that buys a substantially larger size.
  const fits = (lines, size, max) => lines.length <= max && lines.every((l) => measure(playfair, l, size, -0.5) <= TEXT_W);
  const fitTitle = (breakHyphens) => {
    let result;
    for (const [size, maxLines] of [[68, 3], [64, 3], [60, 3], [56, 3], [52, 4], [48, 4], [44, 4], [38, 99]]) {
      result = { size, lines: wrap(playfair, title, size, TEXT_W, -0.5, breakHyphens) };
      if (fits(result.lines, size, maxLines)) break;
    }
    return result;
  };
  let { size: titleSize, lines: titleLines } = fitTitle(false);
  if (title.includes('-')) {
    const hyphenated = fitTitle(true);
    if (hyphenated.size >= titleSize + 8) ({ size: titleSize, lines: titleLines } = hyphenated);
  }
  const titleLh = titleSize * 1.04;
  let y = 108 + titleSize * 0.78;
  for (const line of titleLines) {
    parts.push(`<text x="${TEXT_X}" y="${y.toFixed(1)}" font-family="'Playfair Display', serif" font-size="${titleSize}" letter-spacing="-0.5" fill="${PLUM}">${esc(line)}</text>`);
    y += titleLh;
  }

  // Rule between title and standfirst.
  const ruleY = y - titleLh + 26;
  parts.push(`<line x1="${TEXT_X}" y1="${ruleY}" x2="${TEXT_X + TEXT_W}" y2="${ruleY}" stroke="${PLUM}" stroke-width="1.5"/>`);

  // Standfirst: as many lines as fit above the byline, ellipsised beyond that.
  const sfSize = 29, sfLh = sfSize * 1.18;
  const bylineY = H - 32;
  let sfY = ruleY + 24 + sfSize * 0.78;
  const maxSfLines = Math.max(0, Math.floor((bylineY - 44 - sfY) / sfLh) + 1);
  let sfLines = wrap(playfair, standfirst, sfSize, TEXT_W);
  if (sfLines.length > maxSfLines) {
    sfLines = sfLines.slice(0, maxSfLines);
    const last = sfLines.length - 1;
    if (last >= 0) sfLines[last] = sfLines[last].replace(/[,;:.]?$/, '…');
  }
  for (const line of sfLines) {
    parts.push(`<text x="${TEXT_X}" y="${sfY.toFixed(1)}" font-family="'Playfair Display', serif" font-size="${sfSize}" fill="${PLUM}">${esc(line)}</text>`);
    sfY += sfLh;
  }

  // Byline pinned to the bottom, shrunk if the author list runs long.
  let bySize = 28;
  while (bySize > 13 && measure(copperplate, byline, bySize, -0.3) > TEXT_W) bySize -= 1;
  parts.push(textAsPaths(copperplate, byline, bySize, TEXT_X, bylineY, -0.3, RED));

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">${parts.join('\n')}</svg>`;
}

// ── main ─────────────────────────────────────────────────────────────
const args = process.argv.slice(2);
const force = args.includes('--force');
const onlySlugs = args.filter((a) => !a.startsWith('--'));

const manifest = existsSync(MANIFEST) ? JSON.parse(readFileSync(MANIFEST, 'utf8')) : {};
mkdirSync(OUT_DIR, { recursive: true });

const pieces = [];
for (const file of readdirSync(WRITING).filter((f) => /\.(md|mdx)$/.test(f))) {
  const slug = file.replace(/\.(md|mdx)$/, '');
  const fmMatch = readFileSync(join(WRITING, file), 'utf8').match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!fmMatch) continue;
  let fm;
  try { fm = parseYaml(fmMatch[1]); } catch { continue; }   // npm run check reports bad YAML properly
  pieces.push({ slug, fm });
}

let made = 0, skipped = 0;
for (const piece of pieces) {
  const { slug, fm } = piece;
  if (onlySlugs.length && !onlySlugs.includes(slug)) continue;
  if (fm.hidden) { delete manifest[slug]; continue; }       // no page is built, so no card
  if (fm.ogManual) { manifest[slug] = 'manual'; skipped++; continue; }

  const hash = ogContentHash(fm, slug, COVERS);
  const out = join(OUT_DIR, `${slug}.png`);
  if (!force && !onlySlugs.length && manifest[slug] === hash && existsSync(out)) { skipped++; continue; }

  await sharp(Buffer.from(card(piece))).png().toFile(out);
  manifest[slug] = hash;
  made++;
  console.log(`✓ og/${slug}.png`);
}

writeFileSync(MANIFEST, JSON.stringify(manifest, null, 2) + '\n');
console.log(`\n${made} card${made === 1 ? '' : 's'} generated, ${skipped} up to date → public/og/`);
