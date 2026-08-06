// SHELVED splash art: the classic atomic symbol — a red nucleus and three
// overlapping ellipse orbits 60° apart (no electrons). It briefly lived on
// the homepage canvas at (30, 42) before we rethought the spot; kept here
// so the design isn't lost. Run from the repo root:
//
//   node scripts/splash-atom.mjs            preview in the terminal
//   node scripts/splash-atom.mjs --apply    paint it into canvas.json
//
// NOTE --apply first blanks the target bbox back to the plain base tile,
// then paints the atom over it. Run it only on purpose — it overwrites
// whatever is currently painted in that rectangle.
import fs from 'node:fs';

const PATH = 'src/data/splash/canvas.json';

const CX = 30, CY = 42;
const A = 7, B = 2.5;                   // ellipse semi-major / semi-minor
// One vertical oval, two diagonals — each in its own colour so the
// three orbits stay readable where they cross at this tiny scale.
const ORBITS = [
  [30, '#5981c1'],    // lower-left → upper-right diagonal (muted blue)
  [150, '#55be9f'],   // lower-right → upper-left diagonal (light teal)
  [90, '#238583'],    // vertical (teal, drawn last: on top at crossings)
];

const cellsOut = new Map();
const put = (x, y, hex) => cellsOut.set(x + ',' + y, hex);

// Orbits: sample each rotated ellipse densely and round to cells.
for (const [deg, hex] of ORBITS) {
  const th = (deg * Math.PI) / 180;
  const ct = Math.cos(th), st = Math.sin(th);
  for (let t = 0; t < Math.PI * 2; t += 0.02) {
    const u = A * Math.cos(t), v = B * Math.sin(t);
    const x = Math.round(CX + u * ct - v * st);
    const y = Math.round(CY - (u * st + v * ct));
    put(x, y, hex);
  }
}
// Nucleus: a small plus-shaped cluster of reds at the centre.
const NUC = [
  [0, 0, '#c9252e'], [-1, 0, '#eb3131'], [1, 0, '#eb3131'],
  [0, -1, '#eb3131'], [0, 1, '#eb3131'],
];
for (const [dx, dy, hex] of NUC) put(CX + dx, CY + dy, hex);

// ── preview ──────────────────────────────────────────────────────────
const glyph = (hex) => ({ '#238583': '|', '#5981c1': '/', '#55be9f': '\\' }[hex] || 'N');
let minX = 99, maxX = 0, minY = 99, maxY = 0;
for (const key of cellsOut.keys()) {
  const [x, y] = key.split(',').map(Number);
  if (x < minX) minX = x; if (x > maxX) maxX = x;
  if (y < minY) minY = y; if (y > maxY) maxY = y;
}
for (let y = minY - 1; y <= maxY + 1; y++) {
  let line = String(y).padStart(3) + ' ';
  for (let x = minX - 1; x <= maxX + 1; x++) {
    const h = cellsOut.get(x + ',' + y);
    line += h ? glyph(h) : '.';
  }
  console.log(line);
}
console.log(`${cellsOut.size} cells, bbox x ${minX}-${maxX}, y ${minY}-${maxY}`);

// ── apply ────────────────────────────────────────────────────────────
if (process.argv.includes('--apply')) {
  const art = JSON.parse(fs.readFileSync(PATH, 'utf8'));
  const palIdx = new Map(art.palette.map((h, i) => [h, i]));
  // Clear the target bbox to the plain base tile so the atom lands on a
  // clean field (this loses any art currently painted there — see NOTE).
  const baseIdx = palIdx.get('#fffbf7');
  for (let y = 35; y <= 49; y++)
    for (let x = 23; x <= 37; x++)
      art.cells[y * art.cols + x] = baseIdx;
  for (const [key, hex] of cellsOut) {
    if (!palIdx.has(hex)) { palIdx.set(hex, art.palette.length); art.palette.push(hex); }
    const [x, y] = key.split(',').map(Number);
    art.cells[y * art.cols + x] = palIdx.get(hex);
  }
  fs.writeFileSync(PATH, JSON.stringify(art));
  console.log(`applied: previous atom reverted, ${cellsOut.size} cells written, palette ${art.palette.length}`);
}
