// Generate per-person Open Graph share cards (1200×630) for each /about team
// member, matching the brand mosaic aesthetic (see public/og-default.png and the
// per-essay cards in public/og/). Output: public/og/people/<slug>.png.
//
// Run: node scripts/gen_people_og.mjs
//
// Each card = a seeded mosaic field of brand-palette rounded cells, framing a
// centred cream panel that shows the person's own glyph mark, their name
// (Copperplate small-caps, like the site), and "<role> · Science Works".
import sharp from 'sharp';
import { readFileSync, mkdirSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const people = JSON.parse(readFileSync(join(ROOT, 'src/data/people.json'), 'utf8'));
const OUT_DIR = join(ROOT, 'public/og/people');
mkdirSync(OUT_DIR, { recursive: true });

const slugify = (name) =>
  name.trim().toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');

// Deterministic per-name PRNG so a person's card is stable across rebuilds.
const hashStr = (s) => { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; };
const mulberry32 = (a) => () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };

// Brand palette, weighted toward the dominant red/coral/cream look so each field
// reads as "Science Works" while staying distinct per person.
const FIELD = [
  ...Array(5).fill('#eb3131'), ...Array(4).fill('#f45e57'), ...Array(3).fill('#ef5e4b'), '#b61b4c',
  ...Array(4).fill('#ebe5cf'), ...Array(3).fill('#f6f0ed'), ...Array(2).fill('#fffbf7'),
  '#66223b', '#440214',
  ...Array(2).fill('#a3c0d7'), '#004ee6', '#00726b', '#64b37b', '#4b5cce', '#72679b', '#e0b2c6',
];

const W = 1200, H = 630;
const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

function glyphFor(slug) {
  const p = join(ROOT, 'src/data/glyphs', `${slug}.json`);
  const file = existsSync(p) ? p : join(ROOT, 'src/data/glyphs/_fallback.json');
  return existsSync(file) ? JSON.parse(readFileSync(file, 'utf8')) : null;
}

function card(person) {
  const rng = mulberry32(hashStr(person.name));
  const rects = [];

  // --- Background mosaic field ---
  const CELL = 28, GAP = 6, PITCH = CELL + GAP, R = 5;
  const cols = Math.ceil(W / PITCH), rows = Math.ceil(H / PITCH);
  for (let r = 0; r < rows; r++)
    for (let c = 0; c < cols; c++) {
      const col = FIELD[Math.floor(rng() * FIELD.length)];
      rects.push(`<rect x="${c * PITCH}" y="${r * PITCH}" width="${CELL}" height="${CELL}" rx="${R}" fill="${col}"/>`);
    }

  // --- Centre panel ---
  const PW = 820, PH = 380, PX = (W - PW) / 2, PY = (H - PH) / 2;
  rects.push(`<rect x="${PX}" y="${PY}" width="${PW}" height="${PH}" rx="10" fill="#f6f0ed" stroke="#66223b" stroke-width="3"/>`);

  // --- Person glyph mark, centred near the top of the panel ---
  const g = glyphFor(slugify(person.name));
  let glyphBottom = PY + 70;
  if (g && g.grid) {
    const GC = 13, GG = 2, GP = GC + GG;
    const gw = g.cols * GP - GG, gh = g.rows * GP - GG;
    const gx = (W - gw) / 2, gy = PY + 46;
    for (let r = 0; r < g.rows; r++)
      for (let c = 0; c < g.cols; c++) {
        const v = g.grid[r][c];
        if (v == null || v < 0) continue;
        const col = g.palette[v];
        if (!col) continue;
        rects.push(`<rect x="${gx + c * GP}" y="${gy + r * GP}" width="${GC}" height="${GC}" rx="2" fill="${col}"/>`);
      }
    glyphBottom = gy + gh;
  }

  // --- Name (adaptive size so long names fit) + role line ---
  const name = person.name;
  const nameSize = Math.min(62, Math.floor((PW - 110) / (name.length * 0.62)));
  const nameY = glyphBottom + 96;
  const roleY = nameY + 64;
  const roleText = `${person.role} · Science Works`.toUpperCase();

  const texts = `
    <text x="${W / 2}" y="${nameY}" font-family="Copperplate, 'Playfair Display', Georgia, serif" font-size="${nameSize}" letter-spacing="1.5" fill="#66223b" text-anchor="middle">${esc(name)}</text>
    <text x="${W / 2}" y="${roleY}" font-family="Copperplate, 'Helvetica Neue', sans-serif" font-size="23" letter-spacing="2.5" fill="#eb3131" text-anchor="middle">${esc(roleText)}</text>
  `;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}"><rect width="${W}" height="${H}" fill="#f6f0ed"/>${rects.join('')}${texts}</svg>`;
}

const team = people.team ?? [];
for (const person of team) {
  const slug = slugify(person.name);
  const svg = card(person);
  const out = join(OUT_DIR, `${slug}.png`);
  await sharp(Buffer.from(svg)).png().toFile(out);
  console.log(`✓ ${slug}.png`);
}
console.log(`\nGenerated ${team.length} cards → public/og/people/`);
