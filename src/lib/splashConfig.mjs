// ── Splash runtime configuration ────────────────────────────────────
// The splash hero is a single freeform-painted cell field stored in
// src/data/splash/canvas.json (edit it at /dev/canvas-editor). This
// module holds everything that ISN'T the painted artwork:
//
//   • the logical grid dimensions and theme colour
//   • the plaque rectangle (mosaic border is painted in the artwork;
//     the interior is force-blanked at runtime so text stays legible)
//   • parameters for the animated overlays, which are drawn on top of
//     the artwork at runtime: the DNA helix (region + twist), the chart
//     data lines (drawn inside the painted panel), and the steam train
//     (path along the painted viaduct deck)
//
// Coordinates are logical grid cells (COLS × ROWS covers the stage).

// Named brand palette + tints — the canvas editor's colour vocabulary.
export const BRAND = {
  R1: '#eb3131', R2: '#ef423d', R3: '#f45e57', R4: '#fb857e',
  R5: '#f8bdb9', R6: '#c9252e', R7: '#b51747', R8: '#771b28',
  M1: '#66223b', M2: '#440214',
  G1: '#00726b', G2: '#0e676a', G3: '#238583', G4: '#2f9392',
  G5: '#409396', G6: '#55be9f', G7: '#86c1af', G8: '#a2e2cf',
  G9: '#64b37b', G10: '#b6e2d5',
  B1: '#004ee6', B2: '#4b5cce', B3: '#5466de', B4: '#6e7ff2',
  B5: '#9bb2f8', B6: '#adc3f0', B7: '#a3c0d7', B8: '#87adcf',
  B9: '#5981c1', B10: '#c9d9f8',
  P1: '#3a3c7c', P2: '#72679b', P3: '#413a83', P4: '#7d78a7',
  N1: '#ebe5cf', N2: '#ded2b5', N3: '#ebdfc2', N4: '#f7f0ed',
  N5: '#c1d1d2', N6: '#ccdbd7', N7: '#dceae6', Y1: '#f5dda8',
  W1: '#faf8f6', WHITE: '#ffffff',
};

export const splashConfig = {
  cols: 144,
  rows: 73,                        // 144 cols ≈ 10px cell pitch at 1440px
  theme: '#eb3131',
  // The default background tile (--almost-white). Cells not yet revealed
  // render as this placeholder, so the page loads as a calm uniform
  // mosaic and figures materialise over it — no grout-coloured "ghosts".
  baseTile: '#fffbf7',

  // Central plaque: interior is kept blank at runtime; .hero-box (the
  // DOM text) is positioned over it using these same cell fractions.
  plaque: { x: 34, y: 29, w: 56, h: 18, border: 0 },   // borderless: .hero-box carries its own background

  // DNA double helix — fully procedural within its region. Artwork in
  // this region acts as a backdrop behind the strands. The region may
  // overlap the plaque: the engine never draws overlays inside the
  // plaque rect, so the helix simply tucks behind it.
  dna: {
    x: 26, y: 6, w: 12, h: 28,
    amp: 5.5, freq: 0.45,
    palA: ['#c9252e', '#eb3131', '#b51747', '#ef423d'],   // strand A — reds
    palB: ['#238583', '#2f9392', '#55be9f', '#0e676a'],   // strand B — teals
    palRung: ['#ebdfc2'],
  },

  // Chart data lines — drawn/redrawn inside the painted panel. The
  // panel frame and gridlines are ordinary artwork; only the two data
  // series are procedural. Region is the panel's OUTER rect.
  chart: {
    x: 110, y: 5, w: 24, h: 20,
    colA: '#004ee6',               // steady series
    colB: '#eb3131',               // volatile series
  },

  // Steam train — crosses the painted viaduct. `row` is the loco's top
  // row (it stands on the deck at row+3); x0..x1 is the deck span.
  train: {
    row: 51, x0: 42, x1: 95,   // deck span of the 6-arch viaduct (stops at the deck end)
    body: ['#440214', '#66223b'],
    carriage: ['#771b28', '#66223b'],
    steam: ['#cdc5be', '#ddd6cf'],
  },
};
