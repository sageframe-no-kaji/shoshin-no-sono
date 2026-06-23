import { describe, it, expect } from 'vitest';
import { hachureMapSvg } from '../src/hachure-map.js';

/** @param {number[][]} grid @param {number} [cell] @returns {import('../src/field.js').Heightfield} */
const hf = (grid, cell = 1) => {
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

/** Parse <line> coords + width out of the svg fragment. */
const parseLines = (/** @type {string} */ svg) =>
  Array.from(
    svg.matchAll(
      /<line x1="([-0-9.]+)" y1="([-0-9.]+)" x2="([-0-9.]+)" y2="([-0-9.]+)" stroke="[^"]*" stroke-width="([0-9.]+)"/g,
    ),
    (m) => ({
      x1: +m[1],
      y1: +m[2],
      x2: +m[3],
      y2: +m[4],
      w: +m[5],
      dx: +m[3] - +m[1],
      dy: +m[4] - +m[2],
    }),
  );

/** Build a tilted plane (uniform +x slope) at the given resolution. */
const tiltedPlane = (cols = 40, rows = 20, slope = 0.3, cell = 1) => {
  /** @type {number[][]} */
  const g = [];
  for (let j = 0; j < rows; j++) {
    /** @type {number[]} */
    const row = [];
    for (let i = 0; i < cols; i++) row.push(i * cell * slope);
    g.push(row);
  }
  return hf(g, cell);
};

/** Build a single-peak Gaussian field centered in the grid. */
const singlePeak = (cols = 41, rows = 41, sigma = 5, cell = 1) => {
  const cx = (cols - 1) / 2;
  const cy = (rows - 1) / 2;
  /** @type {number[][]} */
  const g = [];
  for (let j = 0; j < rows; j++) {
    /** @type {number[]} */
    const row = [];
    for (let i = 0; i < cols; i++) {
      const d2 = (i - cx) ** 2 + (j - cy) ** 2;
      row.push(10 * Math.exp(-d2 / (2 * sigma * sigma)));
    }
    g.push(row);
  }
  return hf(g, cell);
};

describe('hachureMapSvg — register conformance', () => {
  it('lays a cream paper ground sized to the field', () => {
    const svg = hachureMapSvg(tiltedPlane(20, 10));
    expect(svg).toContain('<rect x="0" y="0" width="19" height="9" fill="#FDFCF9"/>');
  });

  it('strokes warm ink, round caps', () => {
    const svg = hachureMapSvg(tiltedPlane());
    expect(svg).toContain('stroke="#2B2B2B"');
    expect(svg).toContain('stroke-linecap="round"');
  });

  it('honors register overrides (ink, paper)', () => {
    const svg = hachureMapSvg(tiltedPlane(40, 20), { ink: '#000', paper: '#fff' });
    expect(svg).toContain('stroke="#000"');
    expect(svg).toContain('fill="#fff"');
  });
});

describe('hachureMapSvg — flats are paper', () => {
  it('emits no strokes for a perfectly flat field', () => {
    const flat = hf([
      [0, 0, 0, 0, 0],
      [0, 0, 0, 0, 0],
      [0, 0, 0, 0, 0],
      [0, 0, 0, 0, 0],
    ]);
    const svg = hachureMapSvg(flat);
    expect(parseLines(svg)).toHaveLength(0);
  });

  it('skips samples whose local gradient is below slopeFloor', () => {
    // A barely-tilted plane at slope 0.001 sits below the default slopeFloor 0.012.
    const gentle = tiltedPlane(40, 20, 0.001);
    expect(parseLines(hachureMapSvg(gentle))).toHaveLength(0);
    // Lower the floor and the same field carries strokes.
    expect(parseLines(hachureMapSvg(gentle, { slopeFloor: 0 })).length).toBeGreaterThan(0);
  });
});

describe('hachureMapSvg — strokes point downhill', () => {
  it('on a +x-tilted plane every stroke points along -x (no jitter)', () => {
    const plane = tiltedPlane(40, 20, 0.3);
    const lines = parseLines(
      hachureMapSvg(plane, { sampleStep: 4, posJitter: 0, angleJitter: 0 }),
    );
    expect(lines.length).toBeGreaterThan(0);
    for (const ln of lines) {
      // Downhill (−x): the stroke segment runs along the x-axis. Allow either
      // endpoint to be the "uphill" end (line geometry is symmetric).
      expect(Math.abs(ln.dy)).toBeLessThan(1e-6);
      expect(Math.abs(ln.dx)).toBeGreaterThan(0);
    }
  });

  it('on a single peak, strokes radiate outward (downhill from the summit)', () => {
    const peak = singlePeak(41, 41, 5);
    const cx = 20;
    const cy = 20;
    const lines = parseLines(
      hachureMapSvg(peak, { sampleStep: 2, posJitter: 0, angleJitter: 0 }),
    );
    expect(lines.length).toBeGreaterThan(20); // a peak has slope on every face
    // For each stroke, the segment's midpoint and direction should align with
    // the radial outward vector from the summit. Dot of |segment direction|
    // with the outward radial should be near ±1 (segment lies along the radial).
    for (const ln of lines) {
      const mx = (ln.x1 + ln.x2) / 2;
      const my = (ln.y1 + ln.y2) / 2;
      const rx = mx - cx;
      const ry = my - cy;
      const rmag = Math.hypot(rx, ry);
      const segMag = Math.hypot(ln.dx, ln.dy);
      if (rmag < 0.5 || segMag < 1e-6) continue; // skip samples right at the summit
      const dot = Math.abs((rx * ln.dx + ry * ln.dy) / (rmag * segMag));
      expect(dot).toBeGreaterThan(0.9); // segment is nearly parallel to the radial
    }
  });
});

describe('hachureMapSvg — slope drives length and weight', () => {
  it('weight stays inside [wBase, wBase + wScale]', () => {
    const plane = tiltedPlane(40, 20, 0.3);
    const lines = parseLines(hachureMapSvg(plane));
    expect(lines.length).toBeGreaterThan(0);
    for (const ln of lines) {
      expect(ln.w).toBeGreaterThanOrEqual(0.22 - 1e-6);
      expect(ln.w).toBeLessThanOrEqual(0.22 + 0.6 + 1e-6);
    }
  });

  it('steeper field carries longer, heavier strokes than a gentle one', () => {
    const gentle = tiltedPlane(40, 20, 0.05);
    const steep = tiltedPlane(40, 20, 0.4);
    const gLines = parseLines(
      hachureMapSvg(gentle, { posJitter: 0, angleJitter: 0, slopeFloor: 0 }),
    );
    const sLines = parseLines(
      hachureMapSvg(steep, { posJitter: 0, angleJitter: 0, slopeFloor: 0 }),
    );
    const meanLen = (/** @type {{dx:number, dy:number}[]} */ ls) =>
      ls.reduce((s, l) => s + Math.hypot(l.dx, l.dy), 0) / ls.length;
    const meanW = (/** @type {{w:number}[]} */ ls) => ls.reduce((s, l) => s + l.w, 0) / ls.length;
    expect(meanLen(sLines)).toBeGreaterThan(meanLen(gLines));
    expect(meanW(sLines)).toBeGreaterThan(meanW(gLines));
  });

  it('weight saturates at wBase + wScale for slopes beyond slopeRef', () => {
    // slopeRef default 0.35; a 1.0 slope is well past it. Every weight should
    // be at the ceiling (within floating point).
    const cliff = tiltedPlane(40, 20, 1.0);
    const lines = parseLines(hachureMapSvg(cliff, { posJitter: 0, angleJitter: 0 }));
    expect(lines.length).toBeGreaterThan(0);
    for (const ln of lines) {
      expect(ln.w).toBeCloseTo(0.22 + 0.6, 2);
    }
  });
});

describe('hachureMapSvg — determinism and overrides', () => {
  it('same seed yields byte-identical SVG (the ?seed= contract)', () => {
    const peak = singlePeak();
    expect(hachureMapSvg(peak)).toBe(hachureMapSvg(peak));
    expect(hachureMapSvg(peak, { seed: 42 })).toBe(hachureMapSvg(peak, { seed: 42 }));
  });

  it('different seeds produce different SVG (the jitter actually varies)', () => {
    const peak = singlePeak();
    const a = hachureMapSvg(peak, { seed: 1, posJitter: 1, angleJitter: 0.3 });
    const b = hachureMapSvg(peak, { seed: 2, posJitter: 1, angleJitter: 0.3 });
    expect(a).not.toBe(b);
  });

  it('larger sampleStep yields fewer strokes', () => {
    const peak = singlePeak();
    const dense = parseLines(hachureMapSvg(peak, { sampleStep: 1 })).length;
    const sparse = parseLines(hachureMapSvg(peak, { sampleStep: 6 })).length;
    expect(sparse).toBeLessThan(dense);
  });

  it('zero jitter removes positional jitter from a tilted plane (stroke centers land on grid samples)', () => {
    // With posJitter=0 the stroke midpoint should be exactly the sample's pixel
    // coord. On a +x-tilted plane with cell=1, midpoints at integer x and y.
    const plane = tiltedPlane(20, 10, 0.3);
    const lines = parseLines(
      hachureMapSvg(plane, { sampleStep: 2, posJitter: 0, angleJitter: 0 }),
    );
    for (const ln of lines) {
      const mx = (ln.x1 + ln.x2) / 2;
      const my = (ln.y1 + ln.y2) / 2;
      expect(mx).toBeCloseTo(Math.round(mx), 1);
      expect(my).toBeCloseTo(Math.round(my), 1);
    }
  });
});
