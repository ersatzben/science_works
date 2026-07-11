import ukmapRows from '../data/splash/ukmap-rows.mjs';

// ── Splash mosaic scene ─────────────────────────────────────────────
// Build-time compiler for the homepage hero: a single continuous cell
// field (LOGICAL_COLS × LOGICAL_ROWS) with pixel-art figures placed on
// it. Sprites are authored as ASCII grids ('.' = transparent) with a
// per-sprite legend mapping each char to a brand colour — or an array
// of colours, in which case a seeded RNG picks per cell (mottle).
// The compiled scene is serialised into the page as JSON; the runtime
// engine (inline in index.astro) handles background texture, reveal,
// ambient animation, and the cursor ripple.

// Brand palette + tints (superset of global.css tokens, matching the
// tint families already used across src/data mosaic art).
const C = {
  // reds
  R1: '#eb3131', R2: '#ef423d', R3: '#f45e57', R4: '#fb857e',
  R5: '#f8bdb9', R6: '#c9252e', R7: '#b51747', R8: '#771b28',
  M1: '#66223b', M2: '#440214',
  // greens / teals
  G1: '#00726b', G2: '#0e676a', G3: '#238583', G4: '#2f9392',
  G5: '#409396', G6: '#55be9f', G7: '#86c1af', G8: '#a2e2cf',
  G9: '#64b37b', G10: '#b6e2d5',
  // blues
  B1: '#004ee6', B2: '#4b5cce', B3: '#5466de', B4: '#6e7ff2',
  B5: '#9bb2f8', B6: '#adc3f0', B7: '#a3c0d7', B8: '#87adcf',
  B9: '#5981c1', B10: '#c9d9f8',
  // purples
  P1: '#3a3c7c', P2: '#72679b', P3: '#413a83', P4: '#7d78a7',
  // neutrals
  N1: '#ebe5cf', N2: '#ded2b5', N3: '#ebdfc2', N4: '#f7f0ed',
  N5: '#c1d1d2', N6: '#ccdbd7', N7: '#dceae6', Y1: '#f5dda8',
  W1: '#faf8f6', WHITE: '#ffffff',
};

// Logical grid: fixed design space; the canvas scales it to the stage.
// 144 columns ≈ a 10px cell pitch on a 1440px stage.
export const LOGICAL_COLS = 144;
export const LOGICAL_ROWS = 73;

// Named brand palette — exported for the dev sprite editor.
export const PALETTE = C;

// ── Deterministic hash — art is identical on every build/load ───────
function hashStr(s) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return h >>> 0;
}

// ── ASCII → {w, h, pal, g} compiler ─────────────────────────────────
// pal is a de-duplicated hex list; g is a flat array of palette indices
// (-1 = transparent). Legend values: hex string, or array — arrays are
// a mottle: the pick is hashed from the CELL POSITION, so it is stable
// under editing (changing one cell never reshuffles its neighbours).
// Every compiled sprite's ASCII source is kept in `spriteSources` so
// the dev sprite editor (/dev/sprite-editor) can round-trip the art.
const SOURCES = {};
function compile(name, legend, rows) {
  SOURCES[name] = { legend, rows };
  const w = Math.max(...rows.map((r) => r.length));
  const h = rows.length;
  const pal = [];
  const palIdx = new Map();
  const idxOf = (hex) => {
    if (!palIdx.has(hex)) { palIdx.set(hex, pal.length); pal.push(hex); }
    return palIdx.get(hex);
  };
  const g = new Array(w * h).fill(-1);
  for (let y = 0; y < h; y++) {
    const row = rows[y];
    for (let x = 0; x < row.length; x++) {
      const ch = row[x];
      if (ch === '.' || ch === ' ') continue;
      const v = legend[ch];
      if (v == null) throw new Error(`splash sprite "${name}": no legend entry for "${ch}"`);
      const hex = Array.isArray(v) ? v[hashStr(`${name}:${x},${y}`) % v.length] : v;
      g[y * w + x] = idxOf(hex);
    }
  }
  return { w, h, pal, g };
}
export const spriteSources = SOURCES;

// Nearest-neighbour rescale of ASCII rows (used to shrink blocky sprites
// like the skyline without hand-redrawing them). Preserves the legend,
// so the mottle re-hashes on the scaled grid.
function scaleRows(rows, factor) {
  const srcH = rows.length;
  const srcW = Math.max(...rows.map((r) => r.length));
  const padded = rows.map((r) => r.padEnd(srcW, '.'));
  const dstH = Math.max(1, Math.round(srcH * factor));
  const dstW = Math.max(1, Math.round(srcW * factor));
  const out = [];
  for (let y = 0; y < dstH; y++) {
    const sy = Math.min(srcH - 1, Math.floor(y / factor));
    let row = '';
    for (let x = 0; x < dstW; x++) {
      row += padded[sy][Math.min(srcW - 1, Math.floor(x / factor))];
    }
    out.push(row);
  }
  return out;
}

// ── Sprites (drawn for the 10px grid) ───────────────────────────────

// Microscope (Leeuwenhoek's trade): eyepiece, tube, curved arm, stage
// with a red specimen slide, mirror, and a heavy foot.
const microscope = compile('microscope', {
  n: [C.N5, C.B7],
  a: [C.P1, C.B2, C.P3, C.P1],
  s: [C.B7, C.N5],
  x: C.R1,
  m: [C.Y1, C.N3],
}, [
  '...nn...........',
  '...nn...........',
  '..aaaa..........',
  '..aaaa.aa.......',
  '..aaaa...aaa....',
  '..aaaa...aaa....',
  '...aa....aaa....',
  '...nn....aaa....',
  '...nn....aaa....',
  '.........aaa....',
  'ssssxxsssaaa....',
  'sssssssssaaa....',
  '.........aaa....',
  '....mm...aaa....',
  '....mm..aaaa....',
  '.......aaaa.....',
  '.....aaaaa......',
  '..aaaaaaaaaa....',
  '.aaaaaaaaaaaa...',
  '.aaaaaaaaaaaa...',
]);

// Microchip: central die (core + register blocks) with traces running
// out on all four sides — elbows, a fork, varied lengths, node pads.
const chip = compile('chip', {
  n: C.B1,
  t: [C.B4, C.B9],
  D: [C.B1, C.B9, C.B2],
  d: [C.B3, C.B4, C.B4, C.B2],
  b: [C.B5, C.B6],
  c: [C.P1, C.P3],
  k: C.B5,
}, [
  '..............n.............',
  '..............t.....n.......',
  '...........n..t.....t.......',
  '...........t..t.....t.......',
  '...........t..t..tttt.......',
  '...........t..t..t..........',
  '..........DDDDDDDDD.........',
  '....ntttttDbbdddbbDttttttn..',
  '..........DddcccddD.........',
  '..........DddckcddD.........',
  '.....nttttDddckcddDttttttn..',
  '..........DddcccddD..t......',
  '..........DdddddddD..t......',
  '..........DDDDDDDDD..n......',
  '...........t..t..t..........',
  '...........t..t..t..........',
  '...........n..t..n..........',
  '............ttttt...........',
  '............t...t...........',
  '............n...n...........',
]);

// Great Britain — rasterised from real boundary data (Natural Earth
// 50m) by scripts/gen-uk-sprite.mjs, which also stamps the research
// cities from their true lat/lon (Glasgow, Edinburgh, Newcastle, Leeds,
// Manchester, Birmingham, Cambridge, Oxford, Cardiff, Bristol, London).
// Regenerate with: node scripts/gen-uk-sprite.mjs <geojson> 28
const ukmap = compile('ukmap', {
  d: [C.G2, C.G1, C.G3, C.G2],
  g: [C.G1, C.G3, C.G4, C.G6, C.G9, C.G3],
  c: C.R1,
  L: C.R1,
}, ukmapRows.rows);

// Neoclassical institution: pediment on a projecting cornice, frieze
// and architrave, five columns with capitals and bases, stepped crepis.
// Rendered at 0.8× — the nearest-neighbour scale drops one cell from
// each 3-wide column, giving five clean 2-wide columns.
const institution = compile('institution', {
  d: [C.M1, C.R8, C.R7, C.M1],
  p: [C.R7, C.R6],
  c: [C.M1, C.R8, C.M1],
  k: [C.R7, C.R6],
}, scaleRows([
  '.............d.............',
  '............ddd............',
  '...........dpppd...........',
  '.........dpppppppd.........',
  '.......dpppppppppppd.......',
  '.....dpppppppppppppppd.....',
  '...dpppppppppppppppppppd...',
  '.ddddddddddddddddddddddddd.',
  '..ddddddddddddddddddddddd..',
  '..ddddddddddddddddddddddd..',
  '..kkk..kkk..kkk..kkk..kkk..',
  '..ccc..ccc..ccc..ccc..ccc..',
  '..ccc..ccc..ccc..ccc..ccc..',
  '..ccc..ccc..ccc..ccc..ccc..',
  '..ccc..ccc..ccc..ccc..ccc..',
  '..ccc..ccc..ccc..ccc..ccc..',
  '..ccc..ccc..ccc..ccc..ccc..',
  '..kkk..kkk..kkk..kkk..kkk..',
  '..ddddddddddddddddddddddd..',
  '.ddddddddddddddddddddddddd.',
  'ddddddddddddddddddddddddddd',
  'ddddddddddddddddddddddddddd',
], 0.8));

// Erlenmeyer flask: solid glass outline, pale interior, red liquid.
const flask = compile('flask', {
  g: [C.B7, C.B7, C.N5],
  i: [C.N7, C.N7, C.W1],
  q: [C.R1, C.R2, C.R6, C.R3, C.R2],
  Q: [C.R8, C.M1, C.R6],
  b: [C.R5, C.R4],
}, [
  '......ggggg......',
  '.......gig.......',
  '.......gig.......',
  '.......gig.......',
  '.......gig.......',
  '......giiig......',
  '......gibig......',
  '.....giiiiig.....',
  '.....giiiiig.....',
  '....giiibiiig....',
  '....giiiiiiig....',
  '...giiiiiiiiig...',
  '...gqqqqqqqqqg...',
  '..gqqqbqqqqqqqg..',
  '..gqqqqqqqqqqqg..',
  '.gqqqqqqbqqqqqqg.',
  '.gqqqqqqqqqqqqqg.',
  'gqqQqqqqqqqqqbqqg',
  'gqQQqqqqqqqqqqqqg',
  'gqQQQqqQQqqQqqqqg',
  'gQQQQQQQQQQQQQQQg',
  'gQQQQQQQQQQQQQQQg',
  '.ggggggggggggggg.',
]);

// Lightbulb: bright-blue outline, pale glass, coral filament, gold rays.
const bulb = compile('bulb', {
  r: [C.Y1, C.Y1, C.R3],
  O: [C.B1, C.B2],
  b: [C.B10, C.B5, C.B10, C.B6],
  w: C.B10,
  f: [C.R3, C.R4],
  n: [C.N5, C.N2],
}, [
  '........r........',
  '...r.........r...',
  '......OOOOO......',
  '.....ObbbbbO.....',
  '....ObbbbbbbO....',
  'r..ObbbbbbbbbO..r',
  '...ObbwbbbbbbO...',
  '...ObbbbbbbbbO...',
  '...ObbbbbbbbbO...',
  '...ObbfbbbfbbO...',
  '....ObfbbbfbO....',
  '.....ObfffbO.....',
  '......ObbbO......',
  '..r...OOOOO...r..',
  '.......nnn.......',
  '.......nnn.......',
  '.......nnn.......',
  '.......nnn.......',
  '........n........',
]);

// Crowd: five figures — red, teal, maroon, blue, purple — staggered
// heights, foreground scale, standing on the canvas floor. The last
// figure crops off the right edge of the stage.
const crowd = compile('crowd', {
  a: [C.M2, C.M1, C.M1, C.M1],
  r: [C.R1, C.R1, C.R2, C.R6],
  u: [C.B2, C.B2, C.B3],
  t: [C.G4, C.G4, C.G6],
  p: [C.P2, C.P2, C.P4],
}, scaleRows([
  '........rrrr...................',
  '........rrrr...................',
  '........rrrr...................',
  '........rrrr.........tttt......',
  '......rrrrrrr........tttt......',
  '......rrrrrrr........tttt......',
  '.aaaa.rrrrrrr........tttt......',
  '.aaaa.rrrrrrr.......tttttt.....',
  '.aaaa.rrrrrrr.......tttttt.....',
  '.aaaa.rrrrrrr..uuuu.tttttt.....',
  'aaaaaarrrrrrr..uuuu.tttttt.....',
  'aaaaaarrrrrrr..uuuu.tttttt.....',
  'aaaaaarrrrrrr..uuuu.tttttt.pppp',
  'aaaaaarrrrrrr..uuuu.tttttt.pppp',
  'aaaaaarrrrrrr..uuuu.tttttt.pppp',
  'aaaaaarrrrrrr..uuuu.tttttt.pppp',
  'aaaaaarrrrrrr.uuuuuuttttttppppp',
  'aaaaaarrrrrrr.uuuuuuttttttppppp',
  'aaaaaarrrrrrr.uuuuuuttttttppppp',
  'aaaaaarrrrrrr.uuuuuuttttttppppp',
  'aaaaaarrrrrrr.uuuuuuttttttppppp',
  'aaaaaarrrrrrr.uuuuuuttttttppppp',
  'aaaaaarrrrrrr.uuuuuuttttttppppp',
  'aaaaaarrrrrrr.uuuuuuttttttppppp',
  'aaaaaarrrrrrr.uuuuuuttttttppppp',
  'aaaaaarrrrrrr.uuuuuuttttttppppp',
  'aaaaaarrrrrrr.uuuuuuttttttppppp',
], 0.9));

// Two figures in pale, receded tints — they stand behind the crowd
// (drawn later, in saturated colour), reading as background people.
const duo = compile('duo', {
  g: [C.G7, C.G7, C.G6],
  b: [C.B6, C.B6, C.B8],
}, [
  '...ggg...........',
  '...ggg...........',
  '...ggg...........',
  '...ggg.....bbb...',
  '..ggggg....bbb...',
  '..ggggg....bbb...',
  '..ggggg....bbb...',
  '..ggggg...bbbbb..',
  '..ggggg...bbbbb..',
  '..ggggg...bbbbb..',
  '..ggggg...bbbbb..',
  '..ggggg...bbbbb..',
  '..ggggg...bbbbb..',
  '..ggggg...bbbbb..',
  '..ggggg...bbbbb..',
  '..ggggg...bbbbb..',
  '..ggggg...bbbbb..',
]);

// Test-tube rack: three tubes (red, blue, teal) on a beige rack.
const tubes = compile('tubes', {
  g: C.N5,
  w: [C.N7, C.B10],
  r: [C.R1, C.R2],
  u: [C.B1, C.B3],
  t: [C.G6, C.G4],
  k: C.N2,
}, [
  'ggg.ggg.ggg',
  'www.www.www',
  'www.www.www',
  'www.www.www',
  'www.www.www',
  'rrr.www.www',
  'rrr.www.ttt',
  'rrr.www.ttt',
  'rrr.uuu.ttt',
  'rrr.uuu.ttt',
  'rrr.uuu.ttt',
  'rrr.uuu.ttt',
  'rrr.uuu.ttt',
  'rrr.uuu.ttt',
  'rrr.uuu.ttt',
  'kkkkkkkkkkk',
]);

// Punch card (Ada Lovelace): clipped corner, beige stock, punched holes.
const punchcard = compile('punchcard', {
  c: [C.N3, C.N3, C.N2, C.N1],
  h: [C.M1, C.M1, C.R8],
}, [
  '..cccccccccccccc',
  '.ccccccccccccccc',
  'cccccccccccccccc',
  'cchcchccchcchccc',
  'cccccccccccccccc',
  'chccchcchccchccc',
  'cccccccccccccccc',
  'ccchcchccchcchcc',
  'cccccccccccccccc',
  'chcchccchccchccc',
  'cccccccccccccccc',
  'cchccchcchccchcc',
  'cccccccccccccccc',
  'cccccccccccccccc',
]);

// Victorian viaduct: parapet + deck, six arches. Generated by loop —
// period 9 (3-cell pier + 6-cell opening), corner cells curve the arch.
function buildViaduct() {
  const ARCHES = 6;
  const W = ARCHES * 9 + 3;
  const rows = [];
  rows.push('p'.repeat(W));                        // parapet
  rows.push('v'.repeat(W));                        // deck
  rows.push('v'.repeat(W));
  const corner = 'vvvv....v'.repeat(ARCHES) + 'vvv';   // arch shoulders
  const pier = 'vvv......'.repeat(ARCHES) + 'vvv';     // open spans
  rows.push(corner);
  for (let i = 0; i < 9; i++) rows.push(pier);
  rows.push(corner);                   // base taper mirrors the shoulder
  return compile('viaduct', {
    p: [C.G3, C.G4, C.G2],
    v: [C.G1, C.G2, C.G3, C.G4, C.G2],
  }, rows);
}
const viaduct = buildViaduct();

// Chart panel: beige border, white field, faint gridlines. The two
// data lines are drawn (and re-drawn) by the runtime engine.
function buildChartPanel() {
  const W = 24, H = 20;
  const rows = [];
  for (let y = 0; y < H; y++) {
    let row = '';
    for (let x = 0; x < W; x++) {
      if (y === 0 || y === H - 1 || x === 0 || x === W - 1) row += 'b';
      else if (y % 4 === 0 || x % 5 === 2) row += 'l';
      else row += 'w';
    }
    rows.push(row);
  }
  return compile('chartPanel', {
    b: [C.N2, C.N3],
    l: '#e7ddcf',
    w: C.WHITE,
  }, rows);
}
const chartPanel = buildChartPanel();

// ── Scene assembly ──────────────────────────────────────────────────
export function buildSplashScene() {
  const sprites = {
    microscope, chip, ukmap, institution, flask, bulb,
    crowd, duo, tubes, viaduct, chartPanel, punchcard,
  };

  // The central plaque: a 1-cell mosaic border, blank inside. The DOM
  // text box (.hero-box) is positioned over the interior using the same
  // cell fractions. Shifted left of centre and narrowed by request.
  const plaque = {
    x: 34, y: 28, w: 61, h: 21, border: 1,
    pal: [C.N1, C.N3, C.N2, C.N1],
  };

  // Placements in logical-grid coordinates.
  //
  // The composition is staged, not scattered:
  //   • Top band — a "skyline" of science and institutions: microscope,
  //     DNA (tall, procedural), chip with branching traces, the UK, the
  //     institution, the chart panel anchored to the top-right corner.
  //   • Bottom band — a foundation: everything stands on the last row.
  //     Laboratory corner (flask + tubes) at bottom-left, the viaduct
  //     spanning the centre, people in the foreground at bottom-right —
  //     the duo standing in front of the viaduct's end, the crowd
  //     cropping off the corner of the stage.
  //   • Middle flanks — punch card (left), glowing lightbulb (right).
  // Later placements paint in front of earlier ones where they overlap.
  // The composition sits inside a clear background border: 10 cells on
  // the left/right, 5 on the top/bottom (background speckle may enter
  // the border; figures may not). Usable area: cols 10–133, rows 5–67.
  const placements = [
    { s: 'microscope', x: 10, y: 5 },
    { s: 'chip', x: 41, y: 6 },
    { s: 'ukmap', x: 72, y: 5 },
    { s: 'institution', x: 86, y: 9 },   // 0.8×, bottom kept on the skyline base
    { s: 'chartPanel', x: 110, y: 5 },   // 1.2×, flush to the right border
    { s: 'punchcard', x: 10, y: 30 },
    { s: 'bulb', x: 113, y: 28 },
    { s: 'flask', x: 10, y: 45 },
    { s: 'tubes', x: 29, y: 52 },
    { s: 'viaduct', x: 42, y: 54 },
    { s: 'duo', x: 93, y: 51 },
    { s: 'crowd', x: 106, y: 44 },   // 0.9× skyline; grounded, flush to the right border
  ];

  // Regional speckle fields: sparse colour dust around the figures
  // (density = probability per unoccupied cell). `open: true` lets a
  // field spill into figure margins and through sprite gaps (used for
  // the ground band, so speckle shows through the viaduct arches).
  const fields = [
    { x: 0, y: 0, w: 72, h: 28, pal: [C.B6, C.B10, C.N7, C.B8], d: 0.02 },
    { x: 70, y: 0, w: 64, h: 28, pal: [C.G8, C.G10, C.G7, C.N7], d: 0.022 },
    { x: 0, y: 28, w: 19, h: 20, pal: [C.R5, C.N3, C.B10], d: 0.018 },
    { x: 36, y: 46, w: 88, h: 27, pal: [C.G8, C.G7, C.G10], d: 0.02 },
    { x: 0, y: 66, w: 144, h: 7, pal: [C.N2, C.N3, C.G7, C.N5], d: 0.07, open: true },
  ];

  // Radial glows: warm light halos whose density falls off with
  // distance from the source (the lightbulb). Painted over reserved
  // margins so the glow hugs the figure.
  const glows = [
    { x: 121, y: 35, r: 15, d: 0.5, pal: [C.Y1, C.Y1, '#f6e7bd', C.R4] },
  ];

  // Global sprinkle: brand-colour confetti + a soft cream mottle base.
  const confetti = {
    d: 0.008,
    pal: [C.R1, C.R3, C.B1, C.B4, C.G6, C.G9, C.P2, C.Y1, C.R7],
  };
  const texture = {
    d: 0.1,
    pal: ['#f7f1ea', '#f4ede5', '#f2eae2'],
  };

  // Runtime-procedural pieces (animated): DNA helix, chart lines, train.
  const dna = {
    x: 26, y: 6, w: 12, h: 28,
    amp: 5.5, freq: 0.45,
    palA: [C.R6, C.R1, C.R7, C.R2],     // strand A — reds
    palB: [C.G3, C.G4, C.G6, C.G2],     // strand B — teals
    palRung: [C.N3],
  };
  const chart = {
    x: 110, y: 5, w: 24, h: 20,
    colA: C.B1,                          // steady series
    colB: C.R1,                          // volatile series
  };
  const train = {
    row: 51,                             // loco top row (rides deck at y=54)
    x0: 42, x1: 107,                     // viaduct deck span
    body: [C.M2, C.M1],
    carriage: [C.R8, C.M1],
    steam: ['#cdc5be', '#ddd6cf'],
  };

  return {
    cols: LOGICAL_COLS,
    rows: LOGICAL_ROWS,
    theme: C.R1,
    sprites,
    placements,
    plaque,
    fields,
    glows,
    confetti,
    texture,
    dna,
    chart,
    train,
  };
}
