// ── Splash runtime configuration ────────────────────────────────────
// The splash hero is a single freeform-painted cell field stored in
// src/data/splash/canvas.json (edit it at /dev/canvas-editor). This
// module holds everything that ISN'T the painted artwork:
//
//   • the logical grid dimensions and theme colour
//   • the hero-text footprint (editor guide only — the text box is
//     transparent and the artwork itself makes space for the type)
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

  // Hero text footprint — where .hero-box (the DOM text) sits, in cells.
  // The engine ignores this entirely (the box is fully transparent and
  // the artwork itself makes space for the text); it exists only so the
  // canvas editor can show authors where the text will land. Keep in
  // sync with the .hero-box percentages in src/pages/index.astro.
  plaque: { x: 35, y: 32, w: 56, h: 16, border: 0 },

  // DNA double helix — fully procedural within its region. Artwork in
  // this region acts as a backdrop behind the strands. The region may
  // overlap the plaque: the engine never draws overlays inside the
  // plaque rect, so the helix simply tucks behind it.
  dna: {
    x: 26, y: 6, w: 12, h: 28,
    amp: 5.5, freq: 0.45,
    palA: ['#c9252e', '#eb3131', '#b51747', '#ef423d'],   // strand A — reds
    palB: ['#238583', '#2f9392', '#55be9f', '#0e676a'],   // strand B — teals
    // Base pairs: each rung is two half-segments meeting at a 1-cell gap.
    // Strictly complementary like real DNA — a rung is one of these two
    // pair types, and the two families only ever appear opposite their
    // partner. `main` shades vary cell to cell; `tip` is the lighter
    // cell touching the gap, so the pair fades rather than stops hard.
    rungPairs: [
      { // A–T: periwinkle ↔ maroon/cherry
        a: { main: ['#6e7ff2', '#9bb2f8', '#adc3f0'], tip: '#c9d9f8' },
        b: { main: ['#771b28', '#b51747', '#66223b'], tip: '#d78d9b' },
      },
      { // G–C: leaf green ↔ coral red
        a: { main: ['#64b37b', '#4a9d6e', '#86c1af'], tip: '#a2e2cf' },
        b: { main: ['#f45e57', '#ef423d', '#fb857e'], tip: '#f8bdb9' },
      },
    ],
  },

  // Chart data lines — drawn/redrawn inside the painted panel. The
  // panel frame and gridlines are ordinary artwork; only the two data
  // series are procedural. Region is the panel's OUTER rect.
  chart: {
    x: 110, y: 5, w: 24, h: 20,
    colA: '#004ee6',               // steady series
    colB: '#eb3131',               // volatile series
  },

  // Flask bubbles — animated within this region (the Erlenmeyer flask).
  // At boot the engine locates the painted liquid (saturated red/maroon
  // cells) column by column; bubbles spawn near the bottom, drift up
  // with a little wobble, and pop at the liquid surface. Repainting the
  // flask Just Works — the liquid is rediscovered from the artwork.
  bubbles: {
    x: 11, y: 50, w: 15, h: 17,
    count: 4,                            // concurrent bubbles
    pal: ['#f8bdb9', '#fb857e'],         // pale pinks, like the baked ones
    // Bubbling over: a popped bubble sometimes escapes as a wisp of
    // vapour that funnels up the neck (centre column x), wobbles free
    // above the mouth, and dissipates at topY.
    escape: {
      x: 18,                             // neck centre column
      mouthY: 45,                        // flask lip — free air above this
      topY: 41,                          // wisp dissipates here
      chance: 0.35,                      // probability a pop escapes
      pal: ['#eee2dd', '#f3eae6'],       // faint warm vapour
    },
  },

  // Skyscraper lights — windows turning on and off in the district.
  // At boot the engine finds each building as a contiguous column of
  // solid cells grounded on the district's bottom row (so art floating
  // above the towers is ignored), then picks interior lattice cells as
  // windows. A few are lit at any time, each with its own dwell.
  lights: {
    x: 95, y: 40, w: 39, h: 28,
    maxOn: 8,                            // simultaneously lit windows
    pal: ['#f5dda8', '#fbeccb'],         // warm evening glow
    // Windows painted into the artwork in this tone are permanently lit;
    // the animation occasionally switches one off (overlaying the
    // tower's own body colour) and back on, mirroring the random
    // on/off rhythm of the unlit lattice windows.
    winTone: '#f6e7bd',
  },

  // Lightbulb blink — the bulb, its beige filament cross and the little
  // gold/blue rays around it are all painted art. At boot the engine
  // finds the glass by its ring tones inside this region, then collects
  // the cross (cross tones inside the ring's bbox) and the rays (ray
  // tones outside it, within maxRay of the bulb's centre). Mostly the
  // bulb rests in its painted "on" state; occasionally it blinks off —
  // rays gone, cross dimmed to offCross blue — then relights, the rays
  // sweeping back outward. Repainting the bulb Just Works.
  bulb: {
    x: 114, y: 26, w: 18, h: 21,
    glass: ['#004ee6', '#4b5cce'],                    // ring tones → glass bbox
    cross: ['#f6e7bd', '#f5dda8'],                    // filament cross tones
    rays: ['#f5dda8', '#f6e7bd', '#adc3f0', '#9bb2f8', '#6e7ff2'],
    offCross: '#adc3f0',                              // filament tone while off
    maxRay: 11,                                       // ray radius from bulb centre
    onMs: 4000, onJitter: 3000,                       // lit dwell: 4–7s
    offMs: 900, offJitter: 500,                       // dark dwell: 0.9–1.4s
    relightMs: 500,                                   // outward ray sweep
  },

  // Petri dish drip — the small red square painted mid-dish IS the
  // landed drop, and the animation completes its story: the square soaks
  // away into the agar, a fresh drop swells at the pipette tip, falls,
  // and lands exactly where the square was — which flashes bright and
  // settles back to the painted artwork. The cultures never move. All
  // geometry is discovered at boot: the dish from its rim tone, the
  // pipette tip as the lowest red cell above the rim, and the splash
  // square as the small red blob nearest the tip's column inside the
  // dish. Repainting the dish Just Works.
  petri: {
    x: 92, y: 27, w: 22, h: 21,
    rim: ['#87adcf'],                                  // dish rim tone → bbox
    // The red family: the pipette's charge and the splash square.
    reds: ['#c9252e', '#b51747', '#f45e57', '#eb3131', '#ef423d', '#fb857e', '#f8bdb9'],
    dropPal: ['#f8bdb9', '#eb3131'],                   // forming → falling drop
    idleMs: 5000, idleJitter: 3000,                    // splash rests: 5–8s
    absorbMs: 450,                                     // dish sits empty before the next drop
    swellMs: 500,                                      // drop forming at the tip
    stepMs: 100,                                       // fall speed per cell
    flashMs: 250,                                      // splash brightens as it lands
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
