import { describe, it, expect } from 'vitest';
import { rampColor, heatmapSvg, peakMarkersSvg } from '../src/heatmap.js';

describe('rampColor', () => {
  it('runs blue at the valleys to red at the summits', () => {
    expect(rampColor(0)).toBe('hsl(240 68% 80%)');
    expect(rampColor(1)).toBe('hsl(0 68% 34%)');
  });

  it('clamps out-of-range input', () => {
    expect(rampColor(-1)).toBe(rampColor(0));
    expect(rampColor(2)).toBe(rampColor(1));
  });
});

describe('heatmapSvg', () => {
  /** @type {import('../src/field.js').Heightfield} */
  const hf = {
    field: new Float64Array([0, 1, 2, 4]),
    cols: 2,
    rows: 2,
    cell: 10,
    width: 20,
    height: 20,
    max: 4,
  };

  it('emits a background plus one rect per sampled cell', () => {
    const svg = heatmapSvg(hf, { step: 1 });
    expect(svg).toContain('width="20" height="20"'); // background
    expect((svg.match(/<rect/g) ?? []).length).toBe(1 + 4); // bg + 2x2 grid
  });

  it('coarsens with step', () => {
    const svg = heatmapSvg(hf, { step: 2 });
    expect((svg.match(/<rect/g) ?? []).length).toBe(1 + 1); // bg + one cell
  });

  it('defaults step and tolerates a flat (zero-max) field', () => {
    const flat = { ...hf, field: new Float64Array([0, 0, 0, 0]), max: 0 };
    const svg = heatmapSvg(flat); // no opts → default step
    expect(svg).toContain('<rect');
    expect(svg).toContain(rampColor(0)); // every cell is a valley
  });
});

describe('peakMarkersSvg', () => {
  it('renders a dot and label per peak, fainter for sunk peaks', () => {
    const svg = peakMarkersSvg(
      /** @type {any} */ ([
        { id: 'tall', x: 100, y: 100, amplitude: 9 },
        { id: 'sunk', x: 200, y: 200, amplitude: 1 },
      ]),
    );
    expect(svg).toContain('tall');
    expect(svg).toContain('sunk');
    expect((svg.match(/<circle/g) ?? []).length).toBe(2);
    // the full-amplitude peak is drawn at higher opacity than the sunk one
    const opacities = [...svg.matchAll(/opacity="([\d.]+)"/g)].map((m) => Number(m[1]));
    expect(opacities[0]).toBeGreaterThan(opacities[1]);
  });

  it('honors an explicit maxAmplitude and tolerates no peaks', () => {
    expect(peakMarkersSvg([])).toBe('');
    const svg = peakMarkersSvg(/** @type {any} */ ([{ id: 'p', x: 1, y: 1, amplitude: 5 }]), {
      maxAmplitude: 10,
    });
    expect(svg).toContain('opacity="0.7"'); // 0.35 + 0.65 * (5/10) = 0.675 → 0.7
  });
});
