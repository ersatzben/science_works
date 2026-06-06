// Convert a pixel-art source image (squares-on-cream, like the network art) into
// a mosaic JSON the projects page renders. Auto-detects the grid; override any
// param if a preview comes out misaligned.
//
// Usage:
//   node scripts/mosaic-from-image.mjs <input> <name> [opts]
// Options (all optional):
//   --k <n>        palette size (k-means clusters), default 8
//   --pitch <px>   cell pitch (auto-detected if omitted)
//   --ox <px> --oy <px>   grid origin (first cell-centre x/y; auto if omitted)
//   --bg <tol>     background match tolerance, default 24
//   --fill <0..1>  min non-bg fraction of a cell to count it filled, default 0.4
//
// Writes:  src/data/mosaics/<name>.json   and   /tmp/<name>_preview.png
import sharp from 'sharp';
import fs from 'fs';

const args = process.argv.slice(2);
const SRC = args[0], NAME = args[1];
if (!SRC || !NAME) { console.error('usage: node scripts/mosaic-from-image.mjs <input> <name> [--k --pitch --ox --oy --bg --fill]'); process.exit(1); }
const opt = (flag, def) => { const i = args.indexOf(flag); return i >= 0 ? Number(args[i + 1]) : def; };
const K = opt('--k', 8), BGTOL = opt('--bg', 24), FILL = opt('--fill', 0.4);

const { data, info } = await sharp(SRC).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
const { width: W, height: H, channels: C } = info;
const at = (x, y) => { const i = (y * W + x) * C; return [data[i], data[i + 1], data[i + 2]]; };

// Background = average of the four corners.
let br = 0, bg = 0, bb = 0, nb = 0;
for (const [x0, y0] of [[0, 0], [W - 6, 0], [0, H - 6], [W - 6, H - 6]])
  for (let y = 0; y < 6; y++) for (let x = 0; x < 6; x++) { const [r, g, b] = at(x0 + x, y0 + y); br += r; bg += g; bb += b; nb++; }
br /= nb; bg /= nb; bb /= nb;
const isBg = (r, g, b) => Math.abs(r - br) < BGTOL && Math.abs(g - bg) < BGTOL && Math.abs(b - bb) < BGTOL;

// Coverage profiles → bounding box of the art.
const colCov = new Array(W).fill(0), rowCov = new Array(H).fill(0);
for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (!isBg(...at(x, y))) { colCov[x]++; rowCov[y]++; }
const bbox = (cov) => { const mx = Math.max(...cov) * 0.05; let lo = 0, hi = cov.length - 1; while (lo < cov.length && cov[lo] <= mx) lo++; while (hi > 0 && cov[hi] <= mx) hi--; return [lo, hi]; };
const [cx0, cx1] = bbox(colCov), [cy0, cy1] = bbox(rowCov);

// Pitch = median spacing between coverage local-minima (gaps), filtered to the
// smallest repeating step. Auto unless overridden.
function detectPitch(cov, lo, hi) {
  const min = [];
  for (let i = lo + 2; i < hi - 2; i++)
    if (cov[i] <= cov[i - 1] && cov[i] <= cov[i + 1] && cov[i] < cov[i - 2] * 0.92 && cov[i] < cov[i + 2] * 0.92) min.push(i);
  const diffs = min.slice(1).map((v, i) => v - min[i]).filter(d => d >= 9 && d <= 44);
  if (!diffs.length) return null;
  const base = Math.min(...diffs);
  const near = diffs.filter(d => d <= base * 1.4).sort((a, b) => a - b);
  return { pitch: near[Math.floor(near.length / 2)], firstMin: min[0] };
}
const dpx = detectPitch(colCov, cx0, cx1), dpy = detectPitch(rowCov, cy0, cy1);
let pitch = opt('--pitch', NaN);
if (isNaN(pitch)) pitch = Math.round(((dpx?.pitch || 20) + (dpy?.pitch || 20)) / 2);
// Origin: first cell-centre = (first gap) - pitch/2, then walk back into the bbox.
const originFrom = (firstMin, lo) => { let c = (firstMin ?? lo) - pitch / 2; while (c - pitch > lo - pitch * 0.5) c -= pitch; return c; };
let ox = opt('--ox', NaN); if (isNaN(ox)) ox = originFrom(dpx?.firstMin, cx0);
let oy = opt('--oy', NaN); if (isNaN(oy)) oy = originFrom(dpy?.firstMin, cy0);

// Sample cell centres across the bounding box.
const sampleCell = (cx, cy) => {
  let r = 0, g = 0, b = 0, n = 0, tot = 0;
  for (let dy = -4; dy <= 4; dy++) for (let dx = -4; dx <= 4; dx++) {
    const x = Math.round(cx + dx), y = Math.round(cy + dy);
    if (x < 0 || y < 0 || x >= W || y >= H) continue;
    tot++; const [R, G, B] = at(x, y); if (isBg(R, G, B)) continue; r += R; g += G; b += B; n++;
  }
  if (tot < 30 || n === 0 || n < tot * FILL) return null;
  return [r / n, g / n, b / n];
};
const cells = [];
const jMax = Math.ceil((cx1 - ox) / pitch) + 1, kMax = Math.ceil((cy1 - oy) / pitch) + 1;
for (let k = 0; k <= kMax; k++) for (let j = 0; j <= jMax; j++) {
  const rgb = sampleCell(ox + pitch * j, oy + pitch * k);
  if (rgb) cells.push({ j, k, rgb });
}

// k-means colour quantisation.
function kmeans(pts, k, iters) {
  const cent = []; const step = Math.max(1, Math.floor(pts.length / k));
  for (let i = 0; i < k; i++) cent.push(pts[Math.min(pts.length - 1, i * step)].slice());
  const asg = new Array(pts.length).fill(0);
  for (let it = 0; it < iters; it++) {
    for (let i = 0; i < pts.length; i++) { let bd = 1e9, bi = 0; for (let c = 0; c < k; c++) { const d = (pts[i][0] - cent[c][0]) ** 2 + (pts[i][1] - cent[c][1]) ** 2 + (pts[i][2] - cent[c][2]) ** 2; if (d < bd) { bd = d; bi = c; } } asg[i] = bi; }
    const s = Array.from({ length: k }, () => [0, 0, 0, 0]);
    for (let i = 0; i < pts.length; i++) { const a = asg[i]; s[a][0] += pts[i][0]; s[a][1] += pts[i][1]; s[a][2] += pts[i][2]; s[a][3]++; }
    for (let c = 0; c < k; c++) if (s[c][3]) cent[c] = [s[c][0] / s[c][3], s[c][1] / s[c][3], s[c][2] / s[c][3]];
  }
  return { cent, asg };
}
const { cent, asg } = kmeans(cells.map(c => c.rgb), K, 20);
const hex = c => '#' + c.map(v => Math.round(v).toString(16).padStart(2, '0')).join('');
cells.forEach((c, i) => c.idx = asg[i]);

// Normalise to a tight grid.
const js = cells.map(c => c.j), ks = cells.map(c => c.k);
const jmin = Math.min(...js), kmin = Math.min(...ks);
const gw = Math.max(...js) - jmin + 1, gh = Math.max(...ks) - kmin + 1;
const grid = Array.from({ length: gh }, () => new Array(gw).fill(-1));
cells.forEach(c => { grid[c.k - kmin][c.j - jmin] = c.idx; });

fs.writeFileSync(`src/data/mosaics/${NAME}.json`, JSON.stringify({ cols: gw, rows: gh, palette: cent.map(hex), grid }));
console.log(`bg ${Math.round(br)},${Math.round(bg)},${Math.round(bb)}  pitch ${pitch}  origin ${ox.toFixed(1)},${oy.toFixed(1)}`);
console.log(`grid ${gw}x${gh}  cells ${cells.length}  palette ${cent.map(hex).join(' ')}`);

// Preview PNG.
const CELL = 16, GAP = 2, pw = gw * (CELL + GAP) + GAP, ph = gh * (CELL + GAP) + GAP;
const buf = Buffer.alloc(pw * ph * 4);
for (let i = 0; i < pw * ph; i++) { buf[i * 4] = br; buf[i * 4 + 1] = bg; buf[i * 4 + 2] = bb; buf[i * 4 + 3] = 255; }
for (let k = 0; k < gh; k++) for (let j = 0; j < gw; j++) {
  const v = grid[k][j]; if (v < 0) continue; const col = cent[v].map(Math.round);
  for (let yy = 0; yy < CELL; yy++) for (let xx = 0; xx < CELL; xx++) { const i = ((GAP + k * (CELL + GAP) + yy) * pw + GAP + j * (CELL + GAP) + xx) * 4; buf[i] = col[0]; buf[i + 1] = col[1]; buf[i + 2] = col[2]; buf[i + 3] = 255; }
}
await sharp(buf, { raw: { width: pw, height: ph, channels: 4 } }).png().toFile(`/tmp/${NAME}_preview.png`);
console.log(`preview /tmp/${NAME}_preview.png`);
