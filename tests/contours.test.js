import { describe, it, expect } from 'vitest';
import { contourLevels, extractContour, segsToPath, contourGeometry } from '../src/contours.js';

/**
 * Build a Heightfield from a 2D array of rows (top→bottom), each row left→right.
 * @param {number[][]} grid
 * @param {number} [cell]
 * @returns {import('../src/field.js').Heightfield}
 */
const hf = (grid, cell = 10) => {
  const rows = grid.length;
  const cols = grid[0].length;
  const field = new Float64Array(cols * rows);
  let max = 0;
  for (let j = 0; j < rows; j++)
    for (let i = 0; i < cols; i++) {
      const v = grid[j][i];
      field[j * cols + i] = v;
      if (v > max) max = v;
    }
  return { field, cols, rows, cell, width: (cols - 1) * cell, height: (rows - 1) * cell, max };
};

describe('contourLevels', () => {
  it('steps from one interval up to (not reaching) the max', () => {
    const levels = contourLevels(2.0, 0.62);
    expect(levels).toHaveLength(3);
    [0.62, 1.24, 1.86].forEach((v, i) => expect(levels[i]).toBeCloseTo(v));
  });

  it('returns nothing when the max is below one interval', () => {
    expect(contourLevels(0.4, 0.62)).toEqual([]);
  });

  it('carries more rings as the field rises (count tracks elevation)', () => {
    expect(contourLevels(10, 0.62).length).toBeGreaterThan(contourLevels(3, 0.62).length);
  });
});

describe('extractContour — marching squares', () => {
  // One cell, corners [tl, tr, bl, br] = [0, 0, 2, 0]; only bottom-left is above.
  it('interpolates a single crossing (case 1: low corner bl)', () => {
    const segs = extractContour(hf([[0, 0], [2, 0]]), 1);
    expect(segs).toEqual([
      [
        { x: 0, y: 5 }, // L: halfway down the left edge (0→2 spans the level at 0.5)
        { x: 5, y: 10 }, // B: halfway along the bottom edge (2→0)
      ],
    ]);
  });

  it('emits nothing for a cell wholly below or wholly above the level', () => {
    expect(extractContour(hf([[0, 0], [0, 0]]), 5)).toEqual([]);
    expect(extractContour(hf([[9, 9], [9, 9]]), 5)).toEqual([]);
  });

  it('emits two segments at a saddle (case 5: tr + bl high)', () => {
    const segs = extractContour(hf([[0, 2], [2, 0]]), 1);
    expect(segs).toHaveLength(2);
  });

  it('emits two segments at the other saddle (case 10: tl + br high)', () => {
    const segs = extractContour(hf([[2, 0], [0, 2]]), 1);
    expect(segs).toHaveLength(2);
  });

  it('is deterministic', () => {
    const g = hf([[0, 0], [2, 0]]);
    expect(extractContour(g, 1)).toEqual(extractContour(g, 1));
  });

  // Every interior case (idx 1..14): corners set high/low by the idx bits
  // (tl=8, tr=4, br=2, bl=1). Non-saddle cases emit one segment; the two
  // saddles (5, 10) emit two. This walks the whole case table.
  it('handles all sixteen marching-squares cases', () => {
    for (let idx = 0; idx <= 15; idx++) {
      const tl = idx & 8 ? 2 : 0;
      const tr = idx & 4 ? 2 : 0;
      const br = idx & 2 ? 2 : 0;
      const bl = idx & 1 ? 2 : 0;
      const segs = extractContour(hf([[tl, tr], [bl, br]]), 1);
      const expected = idx === 0 || idx === 15 ? 0 : idx === 5 || idx === 10 ? 2 : 1;
      expect(segs).toHaveLength(expected);
    }
  });
});

describe('segsToPath', () => {
  it('writes one M…L… subpath per segment', () => {
    expect(segsToPath([[{ x: 0, y: 5 }, { x: 5, y: 10 }]])).toBe('M0 5L5 10');
  });

  it('rounds coordinates to two decimals', () => {
    // crossing at t = 1/3 down a 10px edge → 3.333… → 3.33
    const segs = extractContour(hf([[0, 0], [3, 0]]), 1);
    expect(segsToPath(segs)).toContain('M0 3.33');
  });

  it('is empty for no segments', () => {
    expect(segsToPath([])).toBe('');
  });
});

describe('contourGeometry', () => {
  // A ramp 0→5 across the columns guarantees every level is crossed.
  const ramp = hf([
    [0, 1, 2, 3, 4, 5],
    [0, 1, 2, 3, 4, 5],
  ]);

  it('flags every fifth level (from the outermost) as an index contour', () => {
    const rings = contourGeometry(ramp, { interval: 0.62, indexEvery: 5 });
    expect(rings.map((r) => r.isIndex)).toEqual([true, false, false, false, false, true, false, false]);
  });

  it('produces drawable path data where the field crosses', () => {
    const rings = contourGeometry(ramp);
    expect(rings.length).toBeGreaterThan(0);
    expect(rings[0].d.length).toBeGreaterThan(0);
    expect(rings.every((r) => typeof r.d === 'string')).toBe(true);
  });

  it('carries the level value through and is deterministic', () => {
    expect(contourGeometry(ramp)).toEqual(contourGeometry(ramp));
    expect(contourGeometry(ramp, { interval: 0.62 })[0].level).toBeCloseTo(0.62);
  });

  it('honors a custom interval (wider spacing → fewer rings)', () => {
    const few = contourGeometry(ramp, { interval: 1.5 });
    const many = contourGeometry(ramp, { interval: 0.5 });
    expect(few.length).toBeLessThan(many.length);
  });
});
