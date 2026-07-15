// The shared palette for visitor-made mosaics (the contact-page maker and the
// homepage gallery). Index order matches tools/editor.html + image2bitmap —
// the site's pixel-art contract. Index 0 = background / erase.
//
// ⚠ APPEND ONLY. A mosaic is stored as a 400-char base-36 code, one digit per
// cell, and each digit is an index into this list — reordering or removing
// entries silently recolours every mosaic ever submitted or shared by link.
export const PALETTE = [
  { name: 'Erase', hex: '#f6f0ed' },
  { name: 'Text', hex: '#66223b' },
  { name: 'Theme red', hex: '#eb3131' },
  { name: 'Sage', hex: '#00726b' },
  { name: 'Bright blue', hex: '#004ee6' },
  { name: 'Pale blue', hex: '#a3c0d7' },
  { name: 'Light green', hex: '#64b37b' },
  { name: 'Deep green', hex: '#0e676a' },
  { name: 'Coral', hex: '#f45e57' },
  { name: 'Beige', hex: '#ebe5cf' },
  { name: 'Almost white', hex: '#faf8f6' },
  { name: 'Purple blue', hex: '#4b5cce' },
  { name: 'Darkest brown', hex: '#440214' },
  { name: 'Indigo', hex: '#3a3c7c' },
  { name: 'Mauve', hex: '#72679b' },
  // Appended 2026 — see the append-only warning above.
  { name: 'Pale teal', hex: '#bfe3e1' },
  { name: 'Powder blue', hex: '#c8dbf5' },
  { name: 'Jade', hex: '#58bfa0' },
  { name: 'Periwinkle', hex: '#828edf' },
  { name: 'Mist', hex: '#c4d1d1' },
  { name: 'Sage grey', hex: '#a9baac' },
  { name: 'Pale yellow', hex: '#fff5a6' },
  { name: 'Coral red', hex: '#ef5e4b' },
  { name: 'Blush', hex: '#ff9aa3' },
  { name: 'Crimson', hex: '#b61b4c' },
];
