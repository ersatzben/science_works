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
