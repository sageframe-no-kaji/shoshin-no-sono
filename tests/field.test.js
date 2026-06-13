import { describe, it, expect } from 'vitest';
import {
  mulberry32,
  hashSeed,
  computePositions,
  preparePeaks,
  heightAt,
  makeNoise,
  buildHeightfield,
} from '../src/field.js';

/** @param {number} n @returns {{ id: string, importance: number, amplitude: number }[]} */
const peaks = (n) =>
  Array.from({ length: n }, (_, i) => ({ id: `w${i}`, importance: 2 + (i % 8), amplitude: 2 + (i % 8) }));

describe('seeded primitives', () => {
  it('mulberry32 is deterministic per seed and varies across seeds', () => {
    const a = mulberry32(7);
    const b = mulberry32(7);
    expect(a()).toBe(b());
    expect(mulberry32(7)()).not.toBe(mulberry32(8)());
  });

  it('hashSeed is stable per (id, seed) and separates ids and seeds', () => {
    expect(hashSeed('kanyo', 1)).toBe(hashSeed('kanyo', 1));
    expect(hashSeed('kanyo', 1)).not.toBe(hashSeed('hozo', 1));
    expect(hashSeed('kanyo', 1)).not.toBe(hashSeed('kanyo', 2));
  });
});

describe('computePositions', () => {
  it('is deterministic from the seed', () => {
    expect(computePositions(peaks(19), 12345)).toEqual(computePositions(peaks(19), 12345));
  });

  it('produces a different layout for a different seed', () => {
    expect(computePositions(peaks(19), 12345)).not.toEqual(computePositions(peaks(19), 999));
  });

  it('keeps every peak inside the margin', () => {
    const o = { width: 1000, height: 620, margin: 70 };
    for (const p of computePositions(peaks(19), 42, o)) {
      expect(p.x).toBeGreaterThanOrEqual(o.margin);
      expect(p.x).toBeLessThanOrEqual(o.width - o.margin);
      expect(p.y).toBeGreaterThanOrEqual(o.margin);
      expect(p.y).toBeLessThanOrEqual(o.height - o.margin);
    }
  });

  it('separates peaks (repulsion does its job)', () => {
    const placed = computePositions(peaks(19), 42);
    let minD = Infinity;
    for (let i = 0; i < placed.length; i++)
      for (let j = i + 1; j < placed.length; j++)
        minD = Math.min(minD, Math.hypot(placed[i].x - placed[j].x, placed[i].y - placed[j].y));
    expect(minD).toBeGreaterThan(40);
  });

  it('preserves the input fields and handles edge counts', () => {
    expect(computePositions([], 1)).toEqual([]);
    const one = computePositions([{ id: 'solo', importance: 9, amplitude: 9 }], 1);
    expect(one).toHaveLength(1);
    expect(one[0].id).toBe('solo');
    expect(one[0].importance).toBe(9);
  });

  it('survives a degenerate zero-area field (coincident peaks)', () => {
    // margin == width/2 == height/2 collapses the placement box to a point, so
    // every peak coincides — exercises the dist/displacement coincidence guards.
    const placed = computePositions(peaks(3), 1, { width: 200, height: 200, margin: 100 });
    for (const p of placed) {
      expect(p.x).toBeCloseTo(100);
      expect(p.y).toBeCloseTo(100);
    }
  });
});

describe('preparePeaks', () => {
  it('derives stable per-peak shape from id + seed', () => {
    const positioned = [{ id: 'a', x: 100, y: 100, importance: 5, amplitude: 5 }];
    expect(preparePeaks(positioned, 7)).toEqual(preparePeaks(positioned, 7));
  });

  it('scales radius with importance', () => {
    const o = { radiusBase: 40, radiusScale: 16 };
    const big = preparePeaks([{ id: 'b', x: 0, y: 0, importance: 9, amplitude: 9 }], 1, o)[0];
    const small = preparePeaks([{ id: 's', x: 0, y: 0, importance: 2, amplitude: 2 }], 1, o)[0];
    expect(big.radius).toBeGreaterThan(small.radius);
    expect(big.radius).toBeCloseTo(40 + 9 * 16);
  });

  it('gives ellipticity in range and four angular harmonics', () => {
    const p = preparePeaks([{ id: 'a', x: 0, y: 0, importance: 5, amplitude: 5 }], 3)[0];
    expect(p.ell).toBeGreaterThanOrEqual(0.85);
    expect(p.ell).toBeLessThanOrEqual(1.1);
    expect(p.harm.map((h) => h.k)).toEqual([2, 3, 4, 5]);
  });
});

describe('heightAt', () => {
  const prep = (/** @type {number} */ amp) =>
    preparePeaks([{ id: 'p', x: 500, y: 300, importance: 9, amplitude: amp }], 1);
  const zero = () => 0;

  it('returns the amplitude at the summit (clean field)', () => {
    expect(heightAt(500, 300, prep(9), zero)).toBeCloseTo(9);
    expect(heightAt(500, 300, prep(3), zero)).toBeCloseTo(3);
  });

  it('falls off with distance from the summit', () => {
    const p = prep(9);
    expect(heightAt(500, 300, p, zero)).toBeGreaterThan(heightAt(640, 300, p, zero));
    expect(heightAt(640, 300, p, zero)).toBeGreaterThan(heightAt(800, 300, p, zero));
  });

  it('suppresses noise at the summit and admits it in open country', () => {
    const one = () => 1;
    // at the summit, (1 - summitW) ≈ 0 → noise contributes ~nothing
    expect(heightAt(500, 300, prep(9), one)).toBeCloseTo(9, 1);
    // far away, summitW ≈ 0 → noise contributes ~ weight
    expect(heightAt(20, 20, prep(9), one, { noiseWeight: 0.85 })).toBeCloseTo(0.85, 1);
  });
});

describe('buildHeightfield', () => {
  it('grids the field at the configured resolution', () => {
    const hf = buildHeightfield(computePositions(peaks(19), 5), 5, { width: 1000, height: 620, cell: 4 });
    expect(hf.cols).toBe(Math.ceil(1000 / 4) + 1);
    expect(hf.rows).toBe(Math.ceil(620 / 4) + 1);
    expect(hf.field).toHaveLength(hf.cols * hf.rows);
    expect(hf.max).toBeGreaterThan(0);
  });

  it('is deterministic from the seed', () => {
    const pos = computePositions(peaks(8), 5);
    expect(buildHeightfield(pos, 5).field).toEqual(buildHeightfield(pos, 5).field);
  });

  it('lower amplitude (sunk peaks) yields a lower maximum', () => {
    const pos = computePositions(peaks(8), 5);
    const full = buildHeightfield(pos, 5, { noiseWeight: 0 });
    const sunk = buildHeightfield(
      pos.map((p) => ({ ...p, amplitude: p.amplitude * 0.15 })),
      5,
      { noiseWeight: 0 },
    );
    expect(sunk.max).toBeLessThan(full.max);
  });
});

describe('makeNoise', () => {
  it('is deterministic and bounded', () => {
    const a = makeNoise(11);
    const b = makeNoise(11);
    expect(a(0.3, 0.7)).toBe(b(0.3, 0.7));
    expect(Math.abs(a(0.5, 0.5))).toBeLessThanOrEqual(1.3); // 0.9 + 0.4 octave weights
  });
});
