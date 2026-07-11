import { describe, it, expect } from 'vitest';
import {
  growSettlement,
  blocksExtent,
  revealedBlocks,
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

  it('a floor stops the descent at the waterline (ho-08 datum)', () => {
    // rampX rises 0.1/px along +x; downhill runs toward -x.
    const unfloored = seatDownhill({ x: 50, y: 50 }, rampX, 30);
    const floored = seatDownhill({ x: 50, y: 50 }, rampX, 30, 4);
    expect(unfloored.x).toBeLessThan(30); // free descent runs the full budget
    expect(floored.x).toBeGreaterThan(40); // stops where the next step would sink below elev 4
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

  it('relaxes overlapping blocks apart', () => {
    // two 8×8 blocks centred 3px apart overlap heavily; on a flat field the
    // affine is identity, so the relaxation pass is what must separate them
    const clashing = [
      { x: 0, y: 0, w: 8, h: 8, a: 0 },
      { x: 3, y: 0, w: 8, h: 8, a: 0 },
    ];
    const out = deform(clashing, flat, { x: 50, y: 50 });
    const sep = Math.hypot(out[0].x - out[1].x, out[0].y - out[1].y);
    expect(sep).toBeGreaterThan(3); // pushed further apart than they started
  });

  it('holds the terracotta landmark fixed while fabric relaxes around it', () => {
    // landmark first, then landmark second — the terra block must not move either way
    const terraFirst = deform(
      [
        { x: 0, y: 0, w: 12, h: 8, a: 0, terra: true },
        { x: 2, y: 0, w: 8, h: 8, a: 0 },
      ],
      flat,
      { x: 50, y: 50 },
    );
    expect([terraFirst[0].x, terraFirst[0].y]).toEqual([0, 0]);
    expect(Math.abs(terraFirst[1].x)).toBeGreaterThan(2);

    const terraSecond = deform(
      [
        { x: 2, y: 0, w: 8, h: 8, a: 0 },
        { x: 0, y: 0, w: 12, h: 8, a: 0, terra: true },
      ],
      flat,
      { x: 50, y: 50 },
    );
    expect([terraSecond[1].x, terraSecond[1].y]).toEqual([0, 0]);
    expect(Math.abs(terraSecond[0].x)).toBeGreaterThan(2);
  });
});

describe('revealedBlocks — house-by-house construction (ho-07.6)', () => {
  /** @type {import('../src/settlements.js').Block[]} */
  const city = [
    { x: 0, y: 0, w: 12, h: 8, a: 0, terra: true }, // cathedral, declared first
    { x: 10, y: 0, w: 6, h: 6, a: 0 },
    { x: 20, y: 0, w: 6, h: 6, a: 0 },
    { x: 30, y: 0, w: 6, h: 6, a: 0 },
  ];

  it('reveals nothing at 0 and everything at 1', () => {
    expect(revealedBlocks(city, 0)).toEqual([]);
    expect(revealedBlocks(city, 1)).toHaveLength(4);
  });

  it('builds houses first and the cathedral strictly last', () => {
    // three houses, then the cathedral — never the reverse
    const order = [0.25, 0.5, 0.75, 1].map((f) => revealedBlocks(city, f).map((b) => !!b.terra));
    expect(order).toEqual([[false], [false, false], [false, false, false], [false, false, false, true]]);
  });

  it('the cathedral only appears once every house stands', () => {
    const justBeforeFull = revealedBlocks(city, 0.74); // round(0.74*4)=3 → houses only
    expect(justBeforeFull.some((b) => b.terra)).toBe(false);
    expect(justBeforeFull).toHaveLength(3);
  });

  it('clamps out-of-range fractions', () => {
    expect(revealedBlocks(city, -1)).toEqual([]);
    expect(revealedBlocks(city, 2)).toHaveLength(4);
  });

  it('handles a cathedral-less hamlet (no terra block)', () => {
    const hamlet = [
      { x: 0, y: 0, w: 6, h: 6, a: 0 },
      { x: 8, y: 0, w: 6, h: 6, a: 0 },
    ];
    expect(revealedBlocks(hamlet, 0.5)).toHaveLength(1);
    expect(revealedBlocks(hamlet, 1)).toHaveLength(2);
  });
});
