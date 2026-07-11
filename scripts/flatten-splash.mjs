// One-time migration: flatten the sprite-based splash scene into a single
// freeform-paintable canvas (src/data/splash/canvas.json).
//
//   node scripts/flatten-splash.mjs
//
// Bakes, in the same order the old runtime engine generated them so the
// result is pixel-identical to what the site displayed:
//   1. sprites at their placements
//   2. cream texture mottle, regional speckle fields, confetti, glows
//      (the seeded background chain)
//   3. the plaque ring (interior left transparent)
// The animated overlays (DNA, chart lines, train) are NOT baked — they
// stay procedural at runtime, configured in src/lib/splashConfig.mjs.
//
// After migration the canvas is edited directly (/dev/canvas-editor);
// splashScene.mjs remains only as the historical generator source.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildSplashScene } from '../src/lib/splashScene.mjs';

const scene = buildSplashScene();
const COLS = scene.cols, ROWS = scene.rows, N = COLS * ROWS;
const idx = (x, y) => y * COLS + x;
const inG = (x, y) => x >= 0 && x < COLS && y >= 0 && y < ROWS;

function mulberry32(a) {
  return function () {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function hashStr(s) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return h >>> 0;
}

const art = new Array(N).fill(null);
const base = new Array(N).fill(null);

// 1. sprites
const bboxes = [];
for (const p of scene.placements) {
  const spr = scene.sprites[p.s];
  bboxes.push({ x: p.x, y: p.y, w: spr.w, h: spr.h });
  for (let sy = 0; sy < spr.h; sy++) {
    for (let sx = 0; sx < spr.w; sx++) {
      const v = spr.g[sy * spr.w + sx];
      if (v < 0) continue;
      const x = p.x + sx, y = p.y + sy;
      if (inG(x, y)) art[idx(x, y)] = spr.pal[v];
    }
  }
}
bboxes.push({ x: scene.dna.x, y: scene.dna.y, w: scene.dna.w, h: scene.dna.h });

// 2. reserved margins (figures + DNA region + plaque)
const reserved = new Uint8Array(N);
for (const b of bboxes) {
  for (let y = b.y - 1; y < b.y + b.h + 1; y++) {
    for (let x = b.x - 1; x < b.x + b.w + 1; x++) if (inG(x, y)) reserved[idx(x, y)] = 1;
  }
}
const PQ = scene.plaque;
for (let y = PQ.y - 1; y < PQ.y + PQ.h + 1; y++) {
  for (let x = PQ.x - 1; x < PQ.x + PQ.w + 1; x++) if (inG(x, y)) reserved[idx(x, y)] = 1;
}

// Saturated background dust must not sit directly against figure cells:
// the runtime engine discovers figures by connected components, and a
// single touching speck would weld two figures into one (merging their
// reveal and scatter). Faint cream texture is exempt — the engine
// ignores near-background tones when tracing components.
function nearArt(i) {
  const x = i % COLS, y = (i / COLS) | 0;
  for (let dy = -1; dy <= 1; dy++) {
    for (let dx = -1; dx <= 1; dx++) {
      if (!dx && !dy) continue;
      if (inG(x + dx, y + dy) && art[idx(x + dx, y + dy)] != null) return true;
    }
  }
  return false;
}

// Padding border: 10 cells left/right, 5 top/bottom. These stay plain
// almost-white (no texture, speckle, confetti, or glow) — a clean frame.
const MARGIN = { left: 10, right: 10, top: 5, bottom: 5 };
const inBorder = (x, y) =>
  x < MARGIN.left || x >= COLS - MARGIN.right || y < MARGIN.top || y >= ROWS - MARGIN.bottom;

// 3. background chain (seeded — regenerates identically each run)
const rng = mulberry32(hashStr('science-works-splash'));
for (let i = 0; i < N; i++) {
  if (inBorder(i % COLS, (i / COLS) | 0)) continue;
  if (rng() < scene.texture.d) base[i] = scene.texture.pal[(rng() * scene.texture.pal.length) | 0];
}
for (const f of scene.fields) {
  for (let y = f.y; y < f.y + f.h; y++) {
    for (let x = f.x; x < f.x + f.w; x++) {
      if (!inG(x, y) || inBorder(x, y)) continue;
      const i = idx(x, y);
      if (f.open ? (art[i] != null || nearArt(i)) : reserved[i]) continue;
      if (rng() < f.d) base[i] = f.pal[(rng() * f.pal.length) | 0];
    }
  }
}
for (let i = 0; i < N; i++) {
  if (reserved[i] || inBorder(i % COLS, (i / COLS) | 0)) continue;
  if (rng() < scene.confetti.d) base[i] = scene.confetti.pal[(rng() * scene.confetti.pal.length) | 0];
}
for (const g of scene.glows || []) {
  for (let y = g.y - g.r; y <= g.y + g.r; y++) {
    for (let x = g.x - g.r; x <= g.x + g.r; x++) {
      if (!inG(x, y) || inBorder(x, y)) continue;
      const i = idx(x, y);
      if (art[i] != null || nearArt(i)) continue;
      const d = Math.hypot(x - g.x, y - g.y);
      if (d > g.r) continue;
      if (rng() < g.d * Math.pow(1 - d / g.r, 2)) base[i] = g.pal[(rng() * g.pal.length) | 0];
    }
  }
}
// plaque ring baked; interior transparent
for (let y = PQ.y; y < PQ.y + PQ.h; y++) {
  for (let x = PQ.x; x < PQ.x + PQ.w; x++) {
    if (!inG(x, y)) continue;
    const i = idx(x, y);
    const ring =
      x < PQ.x + PQ.border || x >= PQ.x + PQ.w - PQ.border ||
      y < PQ.y + PQ.border || y >= PQ.y + PQ.h - PQ.border;
    base[i] = ring ? PQ.pal[(rng() * PQ.pal.length) | 0] : null;
    art[i] = null;
  }
}

// 4. default background tile: every cell not otherwise coloured becomes
// the almost-white tile (var(--almost-white)), so the whole field reads
// as mosaic tiles on the --bg "grout" instead of flat grout. The plaque
// interior stays blank (grout) as a subtle inset behind the text.
const BG_TILE = '#fffbf7';   // var(--almost-white)
for (let y = 0; y < ROWS; y++) {
  for (let x = 0; x < COLS; x++) {
    const i = idx(x, y);
    if (art[i] != null || base[i] != null) continue;
    const inPlaqueInterior =
      x >= PQ.x + PQ.border && x < PQ.x + PQ.w - PQ.border &&
      y >= PQ.y + PQ.border && y < PQ.y + PQ.h - PQ.border;
    if (inPlaqueInterior) continue;
    base[i] = BG_TILE;
  }
}

// 5. merge (art over base) and emit palette-indexed cells
const palette = [];
const palIdx = new Map();
const cells = new Array(N).fill(-1);
for (let i = 0; i < N; i++) {
  const c = art[i] ?? base[i];
  if (c == null) continue;
  if (!palIdx.has(c)) { palIdx.set(c, palette.length); palette.push(c); }
  cells[i] = palIdx.get(c);
}

const out = { cols: COLS, rows: ROWS, palette, cells };
const outPath = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  '../src/data/splash/canvas.json'
);
fs.writeFileSync(outPath, JSON.stringify(out) + '\n');
const painted = cells.filter((v) => v >= 0).length;
console.log(`wrote ${path.relative(process.cwd(), outPath)}`);
console.log(`${COLS}×${ROWS} — ${painted} painted cells, ${palette.length} palette colours`);
