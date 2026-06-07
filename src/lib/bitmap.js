// Convert a {cols, rows, palette, grid} mosaic (palette-index 2D grid, -1 =
// transparent) into an sw.bitmap.v1 ({cells} flat hex array) for <GridArt>.
export function paletteGridToBitmap(src, cell = { size: 9, gap: 1, radius: 2 }) {
  const { cols, rows, palette, grid } = src;
  const cells = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const v = grid[r][c];
      cells.push(v < 0 ? null : palette[v]);
    }
  }
  return { type: 'sw.bitmap.v1', cols, rows, cell, transparent: null, cells };
}

// Derive a narrower sw.bitmap.v1 by taking `count` columns starting at `start`
// (default: the leftmost columns). Used to make the mobile project strips show
// the left N columns of the full desktop grid art from a single source file.
export function cropCols(bitmap, count, start = 0) {
  const { cols, rows, cells } = bitmap;
  const n = Math.min(count, cols - start);
  const out = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < n; c++) {
      out.push(cells[r * cols + (start + c)]);
    }
  }
  return { ...bitmap, cols: n, cells: out };
}
