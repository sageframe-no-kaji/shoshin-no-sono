import { describe, it, expect } from 'vitest';
import { waterSvg, seaMask, seaDistance } from '../src/water-map.js';
import { applySeaDatum } from '../src/field.js';

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

/** A datumed island: a central cone, sea level applied at 0.18 of the max. */
const island = () =>
  applySeaDatum(
    hfFrom((x, y) => {
      const d = Math.hypot(x - 80, y - 80);
      return Math.max(0, 10 * (1 - d / 70));
    }),
    0.18,
  );

/** A datumed crater: a high ring; the enclosed floor is flat zero like the sea. */
const crater = () =>
  applySeaDatum(
    hfFrom((x, y) => {
      const d = Math.hypot(x - 80, y - 80);
      return d > 30 && d < 55 ? 10 : 0;
    }),
    0.18,
  );

// ── applySeaDatum (the field-level datum the water layer relies on) ──────────

describe('applySeaDatum', () => {
  it('the shore is ZERO: nothing below the datum survives', () => {
    const hf = island();
    for (const v of hf.field) expect(v).toBeGreaterThanOrEqual(0);
  });

  it('lowers the max by sea level', () => {
    const raw = hfFrom(() => 10, 4);
    const datumed = applySeaDatum(raw, 0.2);
    expect(datumed.max).toBeCloseTo(8);
  });

  it('fraction 0 is a no-op', () => {
    const raw = hfFrom((x) => x * 0.1, 4);
    const before = Float64Array.from(raw.field);
    applySeaDatum(raw, 0);
    expect(Array.from(raw.field)).toEqual(Array.from(before));
  });

  it('coast ruggedness roughens the shore, reproducibly, without moving the summit', () => {
    const cone = () =>
      hfFrom((x, y) => Math.max(0, 10 * (1 - Math.hypot(x - 80, y - 80) / 70)));
    const smooth = applySeaDatum(cone(), 0.18);
    const ruggedA = applySeaDatum(cone(), 0.18, { ruggedness: 0.6, seed: 42 });
    const ruggedB = applySeaDatum(cone(), 0.18, { ruggedness: 0.6, seed: 42 });
    // Deterministic: same seed → the exact same archipelago.
    expect(Array.from(ruggedA.field)).toEqual(Array.from(ruggedB.field));
    // The coast band changed…
    let changed = 0;
    for (let k = 0; k < smooth.field.length; k++) {
      if (Math.abs(ruggedA.field[k] - smooth.field[k]) > 0.01) changed++;
    }
    expect(changed).toBeGreaterThan(20);
    // …and at least one islet rose from the former sea.
    let islets = 0;
    for (let k = 0; k < smooth.field.length; k++) {
      if (smooth.field[k] === 0 && ruggedA.field[k] > 0.05) islets++;
    }
    expect(islets).toBeGreaterThan(0);
    // The summit stays put — the envelope dies far above the waterline.
    const centre = Math.round(ruggedA.rows / 2) * ruggedA.cols + Math.round(ruggedA.cols / 2);
    expect(ruggedA.field[centre]).toBeCloseTo(smooth.field[centre], 6);
  });
});

// ── seaMask ───────────────────────────────────────────────────────────────────

describe('seaMask', () => {
  it('marks boundary-connected flat zero as sea', () => {
    const mask = seaMask(island());
    expect(mask[0]).toBe(1);
  });

  it('leaves the summit as land', () => {
    const hf = island();
    const mask = seaMask(hf);
    const centre = Math.round(hf.rows / 2) * hf.cols + Math.round(hf.cols / 2);
    expect(mask[centre]).toBe(0);
  });

  it('an enclosed flat basin is land, not a lake (session-2 rule)', () => {
    const hf = crater();
    const mask = seaMask(hf);
    const centre = Math.round(hf.rows / 2) * hf.cols + Math.round(hf.cols / 2);
    expect(hf.field[centre]).toBe(0); // the floor is at datum…
    expect(mask[centre]).toBe(0); // …but unreachable from the boundary — land
    expect(mask[0]).toBe(1);
  });
});

// ── seaDistance ───────────────────────────────────────────────────────────────

describe('seaDistance', () => {
  it('land is zero, and distance grows seaward', () => {
    const hf = island();
    const mask = seaMask(hf);
    const dist = seaDistance(hf, mask);
    const centre = Math.round(hf.rows / 2) * hf.cols + Math.round(hf.cols / 2);
    expect(dist[centre]).toBe(0); // land
    // The map corner is the farthest sea from the island shore.
    expect(dist[0]).toBeGreaterThan(dist[Math.round(hf.rows / 2) * hf.cols]); // corner > mid-edge
    expect(dist[0]).toBeGreaterThan(10);
  });
});

// ── waterSvg ──────────────────────────────────────────────────────────────────

describe('waterSvg', () => {
  it('returns empty string for an empty field', () => {
    expect(waterSvg(hfFrom(() => 0, 8))).toBe('');
  });

  it('returns empty string when there is no sea (an all-land field)', () => {
    expect(waterSvg(hfFrom(() => 5, 8))).toBe('');
  });

  it('paints the sea to paper: cream rects clip terrain overhang', () => {
    const svg = waterSvg(island());
    expect(svg).toContain('<rect');
    expect(svg).toContain('fill="#FDFCF9"');
  });

  it('draws a cream-cased ink coastline at the shore, weight dialable', () => {
    const svg = waterSvg(island());
    expect(svg).toContain('stroke="#2B2B2B" stroke-width="0.70"');
    const heavy = waterSvg(island(), { coastWeight: 1.6 });
    expect(heavy).toContain('stroke="#2B2B2B" stroke-width="1.60"');
    expect(heavy).toContain(`stroke="#FDFCF9" stroke-width="3.60"`); // casing = weight + 2
  });

  it('the coastline rings the WHOLE island, not fragments on one side', () => {
    // Regression: a one-sided sea-adjacency window shredded the coast into
    // dots wherever the sea lay left/above. The island shore radius ≈ 57 px
    // around (80, 80) — the ink ring must carry points on all four sides.
    const svg = waterSvg(island(), { waves: 0, waterlines: 0 });
    const coast = svg.split('stroke="#2B2B2B"')[0].split('<path d="').pop() ?? '';
    const xs = Array.from(coast.matchAll(/M([\d.]+) /g), (m) => parseFloat(m[1]));
    expect(Math.min(...xs)).toBeLessThan(40); // west shore present
    expect(Math.max(...xs)).toBeGreaterThan(120); // east shore present
    expect(xs.length).toBeGreaterThan(30); // a ring, not a handful of dots
  });

  it('wave trains fill the open sea and follow the intensity dial', () => {
    const on = waterSvg(island(), { waves: 0.8 });
    const off = waterSvg(island(), { waves: 0 });
    expect(on).toContain('opacity="0.64"'); // 0.8 × 0.8
    expect(on.length).toBeGreaterThan(off.length);
    expect(off).not.toContain('opacity="0.64"');
    // Trains are bundles of fine hairlines — density, not stroke weight.
    const hairlines = (on.match(/stroke-width="0.22"/g) ?? []).length;
    expect(hairlines).toBeGreaterThan(8);
  });

  it('waterlines march seaward in water ink, thinning and fading', () => {
    const svg = waterSvg(island(), { waterlines: 4, waves: 0 });
    const lines = Array.from(
      svg.matchAll(/stroke="#8A7B6A" stroke-width="([\d.]+)" opacity="([\d.]+)"/g),
      (m) => ({ w: parseFloat(m[1]), op: parseFloat(m[2]) }),
    );
    expect(lines.length).toBeGreaterThanOrEqual(3); // far offsets may leave the frame
    for (let i = 1; i < lines.length; i++) {
      expect(lines[i].w).toBeLessThan(lines[i - 1].w);
      expect(lines[i].op).toBeLessThan(lines[i - 1].op);
    }
  });

  it('waterline ink 0 leaves only the coastline', () => {
    const svg = waterSvg(island(), { opacity: 0, waves: 0 });
    expect(svg).toContain('stroke="#2B2B2B"'); // coast still there
    expect(svg).not.toContain('#8A7B6A'); // no waterlines
  });

  it('no water treatment rings the enclosed basin', () => {
    // The crater floor is flat zero but landlocked: waterlines derive from the
    // sea mask's distance field, so every waterline stays in the outer sea.
    const svg = waterSvg(crater(), { waterlines: 3 });
    const coords = Array.from(svg.matchAll(/M([\d.]+) ([\d.]+)/g), (m) => ({
      x: parseFloat(m[1]),
      y: parseFloat(m[2]),
    }));
    // No waterline/coast vertex inside the crater bowl (radius < 30 of centre).
    const inside = coords.filter((p) => Math.hypot(p.x - 80, p.y - 80) < 24);
    expect(inside).toEqual([]);
  });
});
