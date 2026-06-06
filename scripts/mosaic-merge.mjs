// Merge a start + destination mosaic pair into one render file with a seed mask.
// The destination is the canonical fully-grown state (its grid + palette are used
// as-is); the start is reduced to a positional "seed" (the cells shown at rest),
// anchored onto the destination by a best-fit similarity search.
//
// Usage:
//   node scripts/mosaic-merge.mjs <start.json> <dest.json> <outName> [opts]
// Options:
//   --anchor dx,dy   force the start's offset into the dest (else auto-detected)
//   --bg-index N     treat destination palette index N as transparent background
//
// Writes: src/data/mosaics/<outName>.json   ({cols,rows,palette,grid,seed})
import fs from 'fs';

const a = process.argv.slice(2);
const [START, DEST, NAME] = a;
if (!START || !DEST || !NAME) { console.error('usage: node scripts/mosaic-merge.mjs <start.json> <dest.json> <outName> [--anchor dx,dy] [--bg-index N]'); process.exit(1); }
const flag = (f) => { const i = a.indexOf(f); return i >= 0 ? a[i + 1] : null; };

const start = JSON.parse(fs.readFileSync(START));
const dest = JSON.parse(fs.readFileSync(DEST));

// Optionally fold a "background colour" index in the destination down to -1.
const bgIndex = flag('--bg-index') !== null ? Number(flag('--bg-index')) : null;
if (bgIndex !== null) for (let r = 0; r < dest.rows; r++) for (let c = 0; c < dest.cols; c++) if (dest.grid[r][c] === bgIndex) dest.grid[r][c] = -1;

const sF = (r, c) => r >= 0 && c >= 0 && r < start.rows && c < start.cols && start.grid[r][c] >= 0;
const dF = (r, c) => r >= 0 && c >= 0 && r < dest.rows && c < dest.cols && dest.grid[r][c] >= 0;
const sFilled = [];
for (let r = 0; r < start.rows; r++) for (let c = 0; c < start.cols; c++) if (sF(r, c)) sFilled.push([r, c]);

// Anchor: maximise filled-position overlap; tiebreak toward the centre.
let dx, dy;
const forced = flag('--anchor');
if (forced) { [dx, dy] = forced.split(',').map(Number); }
else {
  const cx = (dest.cols - start.cols) / 2, cy = (dest.rows - start.rows) / 2;
  let best = null;
  for (let oy = 0; oy <= dest.rows - start.rows; oy++) for (let ox = 0; ox <= dest.cols - start.cols; ox++) {
    let overlap = 0;
    for (const [r, c] of sFilled) if (dF(r + oy, c + ox)) overlap++;
    const central = -((ox - cx) ** 2 + (oy - cy) ** 2);
    const score = overlap * 1000 + central;
    if (!best || score > best.score) best = { ox, oy, overlap, score };
  }
  dx = best.ox; dy = best.oy;
}

const seed = [];
let orphan = 0;
for (const [r, c] of sFilled) { if (dF(r + dy, c + dx)) seed.push([r + dy, c + dx]); else orphan++; }

const out = { cols: dest.cols, rows: dest.rows, palette: dest.palette, grid: dest.grid, seed };
fs.writeFileSync(`src/data/mosaics/${NAME}.json`, JSON.stringify(out));

const destFilled = dest.grid.flat().filter((v) => v >= 0).length;
// quick value histogram to spot a stray background colour
const hist = {}; dest.grid.flat().forEach((v) => { hist[v] = (hist[v] || 0) + 1; });
console.log(`${NAME}: dest ${dest.cols}x${dest.rows}, palette ${dest.palette.length}`);
console.log(`anchor dx,dy = ${dx},${dy}  |  seed(start) ${seed.length}  orphan ${orphan}  |  dest filled ${destFilled}  new growth ${destFilled - seed.length}`);
console.log(`dest value histogram: ${JSON.stringify(hist)}`);
if (orphan) console.log(`⚠ ${orphan} start cells had no destination cell — start state will be partial.`);
