import { describe, it, expect } from 'vitest';
import {
  growSettlement,
  blocksExtent,
  townSeat,
  sampleField,
  gradient,
  seatDownhill,
  sizeBand,
  deform,
} from '../src/settlements.js';

/**
 * Build a Heightfield from a value function over grid indices.
 * @param {number} cols @param {number} rows @param {number} cell
 * @param {(i: number, j: number) => number} fn
 * @returns {import('../src/field.js').Heightfield}
 */
const grid = (cols, rows, cell, fn) => {
  const field = new Float64Array(cols * rows);
  let max = 0;
  for (let j = 0; j < rows; j++)
    for (let i = 0; i < cols; i++) {
      const v = fn(i, j);
      field[j * cols + i] = v;
      if (v > max) max = v;
    }
  return { field, cols, rows, cell, width: (cols - 1) * cell, height: (rows - 1) * cell, max };
};

const flat = grid(11, 11, 10, () => 1); // constant — zero gradient everywhere
const rampX = grid(11, 11, 10, (i) => i); // rises with x → gradient.x = 1/cell, gradient.y = 0
// A cone peaking at the centre (i=j=5): height falls off radially.
const cone = grid(11, 11, 10, (i, j) => 10 - Math.hypot(i - 5, j - 5));

describe('growSettlement — the four sizes', () => {
  it('grows a hamlet (loose scatter) deterministically', () => {
    const a = growSettlement(0, 42);
    expect(a.blocks.length).toBeGreaterThanOrEqual(2);
    expect(growSettlement(0, 42)).toEqual(a);
  });

  it('grows each band and the extent is positive', () => {
    for (let level = 0; level <= 3; level++) {
      const s = growSettlement(level, 7);
      expect(s.blocks.length).toBeGreaterThan(0);
      expect(s.extent).toBeGreaterThan(0);
    }
  });

  it('a city carries exactly one terracotta landmark; smaller settlements carry none', () => {
    const city = growSettlement(3, 2826);
    expect(city.blocks.filter((b) => b.terra)).toHaveLength(1);
    [0, 1, 2].forEach((level) => {
      expect(growSettlement(level, 2826).blocks.some((b) => b.terra)).toBe(false);
    });
  });

  it('density scales the building count up', () => {
    const sparse = growSettlement(2, 99, { density: 1 });
    const dense = growSettlement(2, 99, { density: 3 });
    expect(dense.blocks.length).toBeGreaterThanOrEqual(sparse.blocks.length);
  });

  it('different seeds give different towns', () => {
    expect(growSettlement(2, 1)).not.toEqual(growSettlement(2, 2));
  });
});

describe('blocksExtent', () => {
  it('is the max corner radius', () => {
    // one 10×10 block at the origin → corner at (5,5), radius √50 ≈ 7.07
    expect(blocksExtent([{ x: 0, y: 0, w: 10, h: 10, a: 0 }])).toBeCloseTo(Math.hypot(5, 5));
  });

  it('is zero for no blocks', () => {
    expect(blocksExtent([])).toBe(0);
  });
});

describe('townSeat — blended barycenter', () => {
  const centroid = { x: 100, y: 100 };

  it('seats an unanchored town at the centroid', () => {
    expect(townSeat([], centroid)).toEqual(centroid);
  });

  it('seats a fully-anchored town at its barycenter', () => {
    const seat = townSeat([{ pos: { x: 300, y: 100 }, strength: 5 }], centroid, { strengthFull: 4 });
    expect(seat.x).toBeCloseTo(300); // anchorWeight clamps to 1 → barycenter
    expect(seat.y).toBeCloseTo(100);
  });

  it('blends toward the centroid for a partially-anchored town', () => {
    // strength 2 of strengthFull 4 → anchorWeight 0.5 → halfway centroid↔anchor
    const seat = townSeat([{ pos: { x: 300, y: 100 }, strength: 2 }], centroid, { strengthFull: 4 });
    expect(seat.x).toBeCloseTo(200);
  });

  it('biases the direction toward the strength-3 anchor (p > 1)', () => {
    const anchors = [
      { pos: { x: 0, y: 0 }, strength: 3 },
      { pos: { x: 100, y: 0 }, strength: 2 },
    ];
    const linear = townSeat(anchors, centroid, { anchorBias: 1, strengthFull: 5 });
    const biased = townSeat(anchors, centroid, { anchorBias: 2, strengthFull: 5 });
    // both fully anchored (Σ=5); the biased seat sits closer to the strength-3 anchor at x=0
    expect(biased.x).toBeLessThan(linear.x);
  });
});

describe('sampleField / gradient', () => {
  it('bilinearly samples the field', () => {
    expect(sampleField(rampX, 0, 0)).toBeCloseTo(0);
    expect(sampleField(rampX, 50, 0)).toBeCloseTo(5); // x/cell = 5
    expect(sampleField(rampX, 25, 0)).toBeCloseTo(2.5); // between i=2 and i=3
  });

  it('reports the gradient direction and slope', () => {
    const g = gradient(rampX, 50, 50);
    expect(g.x).toBeCloseTo(0.1); // rises 1 per cell of 10px
    expect(g.y).toBeCloseTo(0);
  });

  it('reports a near-zero gradient on a flat field', () => {
    const g = gradient(flat, 50, 50);
    expect(Math.hypot(g.x, g.y)).toBeCloseTo(0);
  });
});

describe('seatDownhill', () => {
  it('steps off the summit toward lower ground', () => {
    // on the cone, the summit is the centre (50,50); a seat just east of it...
    const seat = { x: 60, y: 50 };
    const moved = seatDownhill(seat, cone, 20);
    expect(moved.x).toBeGreaterThan(seat.x); // pushed further east (downhill, away from centre)
  });

  it('leaves a seat on flat ground unchanged', () => {
    expect(seatDownhill({ x: 50, y: 50 }, flat, 20)).toEqual({ x: 50, y: 50 });
  });
});

describe('sizeBand', () => {
  it('counts the thresholds the weight clears', () => {
    expect(sizeBand(0)).toBe(0); // hamlet
    expect(sizeBand(0.8)).toBe(1); // village (≥0.7)
    expect(sizeBand(1.6)).toBe(2); // town (≥1.5)
    expect(sizeBand(1.8)).toBe(3); // city (≥1.7)
  });

  it('honors custom thresholds', () => {
    expect(sizeBand(1.0, [2, 3, 4])).toBe(0);
    expect(sizeBand(3.5, [2, 3, 4])).toBe(2);
  });
});

describe('deform — place-then-deform', () => {
  const blocks = [
    { x: 0, y: 0, w: 8, h: 8, a: 0 },
    { x: 20, y: 0, w: 8, h: 8, a: 0 },
  ];

  it('leaves a town on flat ground unchanged', () => {
    expect(deform(blocks, flat, { x: 50, y: 50 })).toEqual(blocks);
  });

  it('rotates the growth axis onto the contour on a slope', () => {
    // rampX gradient points along +x; the contour is perpendicular (±y), so the
    // axis rotates ~90° and a block grown along +x lands along ±y.
    const out = deform(blocks, rampX, { x: 50, y: 50 }, { contourFollow: 0 });
    expect(out[1].a).not.toBeCloseTo(0); // angle picked up the contour orientation
    expect(Math.abs(out[1].x)).toBeLessThan(Math.abs(out[1].y)); // axis now runs in y
  });

  it('is deterministic', () => {
    expect(deform(blocks, cone, { x: 60, y: 50 })).toEqual(deform(blocks, cone, { x: 60, y: 50 }));
  });
});
