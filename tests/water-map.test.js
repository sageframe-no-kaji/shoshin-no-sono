import { describe, it, expect } from 'vitest';
import { waterSvg, seaMask } from '../src/water-map.js';

/** Build a Heightfield from a per-point elevation function. */
/** @param {(x: number, y: number) => number} elevAt @param {number} [size] @param {number} [cell] @returns {import('../src/field.js').Heightfield} */
const hfFrom = (elevAt, size = 40, cell = 4) => {
  const cols = size + 1;
  const rows = size + 1;
  const field = new Float64Array(cols * rows);
  let max = 0;
  for (let j = 0; j < rows; j++)
    for (let i = 0; i < cols; i++) {
      const v = elevAt(i * cell, j * cell);
      field[j * cols + i] = v;
      if (v > max) max = v;
    }
  return { field, cols, rows, cell, width: size * cell, height: size * cell, max };
};

/** An island: a cone peaking at the field centre, falling to 0 at the edges. */
const island = () =>
  hfFrom((x, y) => {
    const d = Math.hypot(x - 80, y - 80);
    return Math.max(0, 10 * (1 - d / 70));
  });

/** A crater: a high ring enclosing a low centre, low ground outside the ring. */
const crater = () =>
  hfFrom((x, y) => {
    const d = Math.hypot(x - 80, y - 80);
    return d > 30 && d < 55 ? 10 : 0;
  });

// ── seaMask ───────────────────────────────────────────────────────────────────

describe('seaMask', () => {
  it('marks boundary-connected low ground as sea', () => {
    const hf = island();
    const mask = seaMask(hf, 0.18 * hf.max);
    expect(mask[0]).toBe(1); // corner is low and on the boundary
  });

  it('leaves the summit as land', () => {
    const hf = island();
    const mask = seaMask(hf, 0.18 * hf.max);
    const centre = Math.round(hf.rows / 2) * hf.cols + Math.round(hf.cols / 2);
    expect(mask[centre]).toBe(0);
  });

  it('an enclosed interior basin is land, not a lake (session-2 rule)', () => {
    const hf = crater();
    const mask = seaMask(hf, 0.18 * hf.max);
    const centre = Math.round(hf.rows / 2) * hf.cols + Math.round(hf.cols / 2);
    expect(hf.field[centre]).toBe(0); // the basin is below sea level…
    expect(mask[centre]).toBe(0); // …but unreachable from the boundary — land
    expect(mask[0]).toBe(1); // while the outside low ground is sea
  });
});

// ── waterSvg ──────────────────────────────────────────────────────────────────

describe('waterSvg', () => {
  it('returns empty string for an empty field', () => {
    const flat = hfFrom(() => 0, 8);
    expect(waterSvg(flat)).toBe('');
  });

  it('returns empty string when sea level is zero (threshold 0)', () => {
    expect(waterSvg(island(), { threshold: 0 })).toBe('');
  });

  it('paints the sea to paper: cream rects over the masked region', () => {
    const svg = waterSvg(island());
    expect(svg).toContain('<rect');
    expect(svg).toContain('fill="#FDFCF9"');
  });

  it('draws a cream-cased ink coastline at sea level', () => {
    const svg = waterSvg(island());
    expect(svg).toContain('stroke="#FDFCF9" stroke-width="2.6"'); // coast casing
    expect(svg).toContain('stroke="#2B2B2B" stroke-width="0.5"'); // coast ink
  });

  it('waterlines march seaward in water ink, thinning', () => {
    const svg = waterSvg(island(), { waterlines: 3 });
    const widths = Array.from(
      svg.matchAll(/stroke="#8A7B6A" stroke-width="([\d.]+)" opacity/g),
      (m) => parseFloat(m[1]),
    );
    expect(widths.length).toBe(3);
    for (let i = 1; i < widths.length; i++) expect(widths[i]).toBeLessThan(widths[i - 1]);
  });

  it('an enclosed basin gets no water treatment', () => {
    const svg = waterSvg(crater());
    // The crater's interior sits around x,y ≈ 80: no cream rect row should
    // start inside the ring (rects only at the outer low ground).
    const rects = Array.from(svg.matchAll(/<rect x="([\d.-]+)" y="([\d.-]+)" width="([\d.-]+)"/g));
    for (const r of rects) {
      const x0 = parseFloat(r[1]);
      const wid = parseFloat(r[3]);
      const y0 = parseFloat(r[2]);
      // A rect spanning the centre row at the centre columns would betray a lake.
      if (y0 > 70 && y0 < 90) {
        expect(x0 > 110 || x0 + wid < 50).toBe(true);
      }
    }
  });

  it('wave marks appear in the deep zone and respect the opacity dial', () => {
    const withWaves = waterSvg(island(), { opacity: 0.3 });
    const noWaves = waterSvg(island(), { opacity: 0 });
    expect(withWaves).toContain('opacity="0.300"');
    expect(noWaves).not.toContain('opacity="0.300"');
    expect(withWaves.length).toBeGreaterThan(noWaves.length);
  });
});
