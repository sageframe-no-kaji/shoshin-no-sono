import { describe, it, expect } from 'vitest';
import { wavesSvg } from '../src/water-map.js';

/** Build a minimal Heightfield from a flat 2D array. `maxOverride` sets `max`
 * explicitly (e.g. a positive max over an all-zero grid) instead of deriving
 * it from the cells. */
/** @param {number[][]} grid @param {number} [cell] @param {number} [maxOverride] @returns {import('../src/field.js').Heightfield} */
const hf = (grid, cell = 4, maxOverride) => {
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
  if (maxOverride !== undefined) max = maxOverride;
  return { field, cols, rows, cell, width: (cols - 1) * cell, height: (rows - 1) * cell, max };
};

/** Count <path> elements in an SVG string. */
const countPaths = (/** @type {string} */ svg) => (svg.match(/<path /g) ?? []).length;

// ── empty-field guard ─────────────────────────────────────────────────────────

describe('wavesSvg — empty field guard', () => {
  it('returns empty string when hf.max is 0', () => {
    const flat = hf([[0, 0], [0, 0]]);
    expect(wavesSvg(flat)).toBe('');
  });

  it('returns empty string when all cells are at or above threshold and edge margin is 0', () => {
    // threshold default 0.18 → threshold*max = 0.18*1 = 0.18; cells all = 1.0
    const high = hf([[1, 1], [1, 1]]);
    expect(wavesSvg(high, { edgeMargin: 0 })).toBe('');
  });

  it('returns empty string when all cells are exactly at threshold and edge margin is 0', () => {
    const max = 10;
    const threshold = 0.18;
    const elev = threshold * max; // exactly at threshold, depth = 0 → opacity = 0
    const at = hf([[elev, elev], [elev, elev]], 1);
    expect(wavesSvg(at, { threshold, edgeMargin: 0 })).toBe('');
  });
});

// ── basic emission ────────────────────────────────────────────────────────────

describe('wavesSvg — emission when cells are below threshold', () => {
  it('emits paths when some cells are below threshold', () => {
    // A 5×5 field where all cells are 0 (well below threshold default 0.18 of max=1)
    const allLow = hf(
      Array.from({ length: 5 }, () => Array.from({ length: 5 }, () => 0)),
      4,
      1, // explicit positive max so cells are not 0/0
    );
    expect(countPaths(wavesSvg(allLow))).toBeGreaterThan(0);
  });

  it('uses the warm water ink color #8A7B6A', () => {
    const allLow = hf([[0, 0, 0, 0, 0], [0, 0, 0, 0, 0], [0, 0, 0, 0, 0]], 4, 1);
    expect(wavesSvg(allLow)).toContain('#8A7B6A');
  });

  it('emits S-curve path data (M ... C ... C ...)', () => {
    const allLow = hf([[0, 0, 0, 0, 0], [0, 0, 0, 0, 0]], 4, 1);
    const svg = wavesSvg(allLow);
    // Each wave is a single cubic bezier: M ... C ...
    expect(svg).toMatch(/M[\d.,-]+ C[\d., -]+/);
  });

  it('paths have stroke-width 0.35 and round linecap', () => {
    const allLow = hf([[0, 0, 0, 0, 0], [0, 0, 0, 0, 0]], 4, 1);
    const svg = wavesSvg(allLow);
    expect(svg).toContain('stroke-width="0.35"');
    expect(svg).toContain('stroke-linecap="round"');
  });
});

// ── threshold control ─────────────────────────────────────────────────────────

describe('wavesSvg — threshold and opacity opts', () => {
  it('a higher threshold triggers waves on cells that a lower threshold skips (edge disabled)', () => {
    // All cells at elevation 0.5; max=1 → depth at threshold 0.18 = none (0.5>0.18)
    const mid = hf([[0.5, 0.5, 0.5, 0.5, 0.5], [0.5, 0.5, 0.5, 0.5, 0.5]], 4, 1);
    const lowThreshold = wavesSvg(mid, { threshold: 0.18, edgeMargin: 0 });
    const highThreshold = wavesSvg(mid, { threshold: 0.7, edgeMargin: 0 });
    expect(countPaths(lowThreshold)).toBe(0);
    expect(countPaths(highThreshold)).toBeGreaterThan(0);
  });

  it('different opacity values produce different output', () => {
    const allLow = hf([[0, 0, 0, 0, 0], [0, 0, 0, 0, 0]], 4, 1);
    const dimSvg = wavesSvg(allLow, { opacity: 0.05 });
    const brightSvg = wavesSvg(allLow, { opacity: 0.4 });
    expect(dimSvg).not.toBe(brightSvg);
  });

  it('opacity 0 produces no visible paths (all below 0.008 threshold)', () => {
    const allLow = hf([[0, 0, 0, 0, 0], [0, 0, 0, 0, 0]], 4, 1);
    expect(wavesSvg(allLow, { opacity: 0 })).toBe('');
  });

  it('emits waves near the map boundary even when all elevations are above threshold', () => {
    // Large enough that the outer cells are clearly in the edge zone.
    // All cells at high elevation — threshold-based waves won't fire.
    const rows = 20, cols = 40, cell = 10;
    const grid = Array.from({ length: rows }, () => Array.from({ length: cols }, () => 5));
    const bigHigh = hf(grid, cell);
    // threshold*max = 0.18*5 = 0.9; all cells = 5.0 → no terrain depth.
    // But cells within edgeMargin=90 of the boundary will fire.
    expect(countPaths(wavesSvg(bigHigh, { threshold: 0.18, edgeMargin: 90 }))).toBeGreaterThan(0);
  });

  it('higher step produces fewer wave marks (sparser grid)', () => {
    const allLow = hf(
      Array.from({ length: 10 }, () => Array.from({ length: 10 }, () => 0)),
      4,
      1,
    );
    const dense = countPaths(wavesSvg(allLow, { step: 4 }));
    const sparse = countPaths(wavesSvg(allLow, { step: 32 }));
    expect(dense).toBeGreaterThan(sparse);
  });
});
