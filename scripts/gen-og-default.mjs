// Generate the default Open Graph card (public/og-default.png, 1200×630).
//
//   node scripts/gen-og-default.mjs
//
// Direction: "hero in miniature, recomposed" — a purpose-built wide mosaic
// composition on a coarse grid (~2× the hero's cell pitch, so figures stay
// legible at feed size), carrying the real splash artwork:
//   • the viaduct lifted straight from src/data/splash/canvas.json, with a
//     static train (loco + three carriages) stamped on the deck
//   • the UK map lifted from the canvas
//   • the DNA helix rendered from splashConfig at rest
//   • a plaque (1-cell mosaic ring, grout interior) carrying the logo
//     lockup — molecule mark + SCIENCE WORKS wordmark
//   • a 1-cell mosaic ring framing the whole card (defines the edge on
//     both light and dark feed backgrounds)
// The headline deliberately lives in og:title, not in the image.
//
// All placement numbers live in ART below — tune and re-run.

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { splashConfig } from '../src/lib/splashConfig.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

// librsvg (inside sharp) resolves fonts through fontconfig. Point it at the
// site's own font files so the wordmark renders in real Antique Olive Bold.
const FC_DIR = join(ROOT, 'node_modules/.cache/og-fontconfig');
mkdirSync(FC_DIR, { recursive: true });
writeFileSync(join(FC_DIR, 'fonts.conf'), `<?xml version="1.0"?>
<!DOCTYPE fontconfig SYSTEM "fonts.dtd">
<fontconfig>
  <dir>${join(ROOT, 'public/assets/fonts')}</dir>
  <cachedir>${join(FC_DIR, 'cache')}</cachedir>
</fontconfig>
`);
process.env.FONTCONFIG_FILE = join(FC_DIR, 'fonts.conf');
const sharp = (await import('sharp')).default;

// ── art direction ────────────────────────────────────────────────────
const ART = {
  cols: 68, rows: 36,                  // coarse grid: ~17.6px cells at 1200px
  grout: '#f6f0ed',
  tile: '#fffbf7',
  ringPal: ['#ebe5cf', '#ebdfc2', '#ded2b5', '#ebe5cf'],
  texture: { d: 0.06, pal: ['#f7f1ea', '#f4ede5'] },
  confetti: { d: 0.016, pal: ['#eb3131', '#f45e57', '#004ee6', '#6e7ff2', '#55be9f', '#64b37b', '#72679b', '#f5dda8'] },

  // figures lifted from the hero canvas: src rect (hero cells) → dst origin
  uk:          { src: { x: 70, y: 5, w: 18, h: 22 }, dst: { x: 49, y: 5 } },
  institution: { src: { x: 86, y: 6, w: 22, h: 18 }, dst: { x: 2, y: 17 } },
  cell:        { src: { x: 95, y: 27, w: 21, h: 20 }, dst: { x: 25, y: 15 } },

  dna: { x: 4, y: 3, w: 12, h: 13 },   // procedural, from splashConfig palettes

  plaque: { x: 19, y: 5, w: 30, h: 10 },   // horizontally centred
  logo: { markH: 92, gap: 8, wordSize: 44 },
};

const W = 1200, H = 630;
const PX = W / ART.cols, PY = H / ART.rows;
const CELL_FRAC = 12 / 14;

// ── helpers ──────────────────────────────────────────────────────────
const hashStr = (s) => { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; };
const mulberry32 = (a) => () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
const rng = mulberry32(hashStr('science-works-og-default'));

// the card's cell field: hex per cell (null = grout only)
const grid = Array.from({ length: ART.rows }, () => new Array(ART.cols).fill(null));
const inG = (x, y) => x >= 0 && x < ART.cols && y >= 0 && y < ART.rows;
const put = (x, y, c) => { if (inG(x, y) && c) grid[y][x] = c; };

// 1. base tiles + frame ring
for (let y = 0; y < ART.rows; y++)
  for (let x = 0; x < ART.cols; x++)
    grid[y][x] = (x === 0 || y === 0 || x === ART.cols - 1 || y === ART.rows - 1)
      ? ART.ringPal[hashStr(x + ',' + y) % ART.ringPal.length]
      : ART.tile;

// 2. faint texture + confetti (interior only; plaque zone stamped later)
for (let y = 1; y < ART.rows - 1; y++)
  for (let x = 1; x < ART.cols - 1; x++) {
    if (rng() < ART.texture.d) grid[y][x] = ART.texture.pal[(rng() * ART.texture.pal.length) | 0];
    else if (rng() < ART.confetti.d) grid[y][x] = ART.confetti.pal[(rng() * ART.confetti.pal.length) | 0];
  }

// 3. figures lifted from the hero canvas (transparent cells don't stamp)
const hero = JSON.parse(readFileSync(join(ROOT, 'src/data/splash/canvas.json'), 'utf8'));
const heroAt = (x, y) => {
  if (x < 0 || y < 0 || x >= hero.cols || y >= hero.rows) return null;
  const v = hero.cells[y * hero.cols + x];
  return v >= 0 ? hero.palette[v] : null;
};
function stamp({ src, dst }) {
  for (let dy = 0; dy < src.h; dy++)
    for (let dx = 0; dx < src.w; dx++) {
      const c = heroAt(src.x + dx, src.y + dy);
      if (c) put(dst.x + dx, dst.y + dy, c);
    }
}
stamp(ART.institution);
stamp(ART.cell);
stamp(ART.uk);

// 4. DNA helix at rest, from the live splash config
{
  const D = splashConfig.dna, R = ART.dna;
  const dcol = (pal, r) => pal[hashStr('dna' + r) % pal.length];
  const cx = R.x + (R.w - 2) / 2, amp = (R.w - 2) / 2;
  for (let r = 0; r < R.h; r++) {
    const y = R.y + r, t = r * (D.freq || 0.45);
    const sa = Math.sin(t), sb = Math.sin(t + Math.PI);
    const xa = Math.round(cx + amp * sa), xb = Math.round(cx + amp * sb);
    // Base pairs: complementary colour pairs with a 1-cell centre gap
    // and lighter tip cells (mirrors the runtime renderDna in
    // index.astro).
    if (r % 2 === 1 && Math.abs(xa - xb) >= 5) {
      const lo = Math.min(xa, xb), hi = Math.max(xa, xb);
      const pairHash = hashStr('pair' + r);
      const pair = D.rungPairs[pairHash % D.rungPairs.length];
      const flip = (pairHash >> 3) & 1;
      const [famL, famR] = flip ? [pair.b, pair.a] : [pair.a, pair.b];
      const x0 = lo + 2, x1 = hi - 1;
      const gapX = x0 + ((x1 - x0) >> 1);
      for (let x = x0; x < gapX; x++)
        put(x, y, x === gapX - 1 ? famL.tip : dcol(famL.main, r * 31 + x));
      for (let x = gapX + 1; x <= x1; x++)
        put(x, y, x === gapX + 1 ? famR.tip : dcol(famR.main, r * 31 + x));
    }
    const strands = sa >= sb ? [[xb, D.palB], [xa, D.palA]] : [[xa, D.palA], [xb, D.palB]];
    for (const [sx, pal] of strands) {
      put(sx, y, dcol(pal, r));
      put(sx + 1, y, dcol(pal, r * 7 + 3));
    }
  }
}

// 5. plaque: 1-cell mosaic ring, grout interior (logo drawn over in SVG)
{
  const P = ART.plaque;
  for (let y = P.y; y < P.y + P.h; y++)
    for (let x = P.x; x < P.x + P.w; x++) {
      const ring = x === P.x || x === P.x + P.w - 1 || y === P.y || y === P.y + P.h - 1;
      grid[y][x] = ring ? ART.ringPal[hashStr('p' + x + ',' + y) % ART.ringPal.length] : null;
    }
}

// ── render to SVG ────────────────────────────────────────────────────
const rects = [`<rect width="${W}" height="${H}" fill="${ART.grout}"/>`];
const cs = Math.min(PX, PY) * CELL_FRAC, rad = cs / 6;
for (let y = 0; y < ART.rows; y++)
  for (let x = 0; x < ART.cols; x++) {
    const c = grid[y][x];
    if (!c) continue;
    rects.push(`<rect x="${(x * PX + (PX - cs) / 2).toFixed(2)}" y="${(y * PY + (PY - cs) / 2).toFixed(2)}" width="${cs.toFixed(2)}" height="${cs.toFixed(2)}" rx="${rad.toFixed(2)}" fill="${c}"/>`);
  }

// logo lockup: molecule mark (rasterised from the site SVG) + wordmark
const P = ART.plaque;
const plaqueCx = (P.x + P.w / 2) * PX;
const plaqueCy = (P.y + P.h / 2) * PY;
const markPng = await sharp(join(ROOT, 'public/assets/images/FINAL4.svg'))
  .resize({ height: ART.logo.markH })
  .png()
  .toBuffer();
const markMeta = await sharp(markPng).metadata();
const wordSize = ART.logo.wordSize;
const wordSpacing = -0.06 * wordSize;
// approximate lockup width for centring: mark + gap + text
const wordWidth = 'SCIENCE WORKS'.length * wordSize * 0.62 + 12 * wordSpacing;
const lockW = markMeta.width + ART.logo.gap + wordWidth;
const markX = plaqueCx - lockW / 2;
const markY = plaqueCy - markMeta.height / 2;
const textX = markX + markMeta.width + ART.logo.gap;
const textY = plaqueCy + wordSize * 0.34;

const svg = `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${W}" height="${H}">
${rects.join('\n')}
<image x="${markX.toFixed(1)}" y="${markY.toFixed(1)}" width="${markMeta.width}" height="${markMeta.height}" xlink:href="data:image/png;base64,${markPng.toString('base64')}"/>
<text x="${textX.toFixed(1)}" y="${textY.toFixed(1)}" font-family="'Antique Olive Std', 'Antique Olive', 'AntiqueOliveStd-Bold', sans-serif" font-weight="bold" font-size="${wordSize}" letter-spacing="${wordSpacing.toFixed(2)}" fill="#eb3131">SCIENCE WORKS</text>
</svg>`;

const out = join(ROOT, 'public/og-default.png');
await sharp(Buffer.from(svg)).png().toFile(out);
console.log(`✓ wrote public/og-default.png (${W}×${H})`);
