import { describe, it, expect } from 'vitest';
import { contourMapSvg } from '../src/contour-map.js';

/** @param {number[][]} grid @param {number} [cell] @returns {import('../src/field.js').Heightfield} */
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

// A ramp 0→5 crosses every level, so index and regular strokes both appear.
const ramp = hf([
  [0, 1, 2, 3, 4, 5],
  [0, 1, 2, 3, 4, 5],
]);

describe('contourMapSvg — register conformance', () => {
  it('lays a cream paper ground sized to the field', () => {
    const svg = contourMapSvg(ramp);
    expect(svg).toContain('<rect x="0" y="0" width="50" height="10" fill="#FDFCF9"/>');
  });

  it('strokes warm ink, no fill, round caps', () => {
    const svg = contourMapSvg(ramp);
    expect(svg).toContain('stroke="#2B2B2B"');
    expect(svg).toContain('fill="none"');
    expect(svg).toContain('stroke-linecap="round"');
  });

  it('weights index contours at 0.7 and regular at 0.25', () => {
    const svg = contourMapSvg(ramp);
    expect(svg).toContain('stroke-width="0.7"');
    expect(svg).toContain('stroke-width="0.25"');
  });

  it('draws one path per crossing level', () => {
    const paths = contourMapSvg(ramp, { interval: 0.62 }).match(/<path /g) ?? [];
    // 8 levels over a 0→5 ramp at interval 0.62, all crossed.
    expect(paths).toHaveLength(8);
  });
});

describe('contourMapSvg — edges and overrides', () => {
  it('renders paper only when the field is flat (no level is crossed)', () => {
    const svg = contourMapSvg(hf([[0, 0], [0, 0]]));
    expect(svg).toContain('fill="#FDFCF9"');
    expect(svg).not.toContain('<path ');
  });

  it('skips levels the field never reaches when max is over-stated', () => {
    // A heightfield topping out at 5 but advertising max 12: levels above 5 are
    // generated yet never crossed, so they contribute no path (defensive skip).
    const over = { ...ramp, max: 12 };
    const paths = (contourMapSvg(over).match(/<path /g) ?? []).length;
    const honest = (contourMapSvg(ramp).match(/<path /g) ?? []).length;
    expect(paths).toBe(honest); // the extra high levels drew nothing
  });

  it('forwards interval to the geometry (wider spacing → fewer paths)', () => {
    const few = (contourMapSvg(ramp, { interval: 1.5 }).match(/<path /g) ?? []).length;
    const many = (contourMapSvg(ramp, { interval: 0.5 }).match(/<path /g) ?? []).length;
    expect(few).toBeLessThan(many);
  });

  it('honors register overrides (ink, weights)', () => {
    const svg = contourMapSvg(ramp, { ink: '#000', weightIndex: 1.1, weightRegular: 0.3 });
    expect(svg).toContain('stroke="#000"');
    expect(svg).toContain('stroke-width="1.1"');
    expect(svg).toContain('stroke-width="0.3"');
  });
});
