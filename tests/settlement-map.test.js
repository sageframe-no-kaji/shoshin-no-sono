import { describe, it, expect } from 'vitest';
import { settlementSvg } from '../src/settlement-map.js';

describe('settlementSvg', () => {
  it('renders nothing for an empty block list', () => {
    expect(settlementSvg([])).toBe('');
  });

  it('draws an ink block with a paper-stroke separator', () => {
    const svg = settlementSvg([{ x: 10, y: 20, w: 8, h: 6, a: 15 }]);
    expect(svg).toContain('<rect');
    expect(svg).toContain('fill="#2B2B2B"'); // ink
    expect(svg).toContain('stroke="#FDFCF9"'); // paper-stroke party wall
    expect(svg).toContain('stroke-width="0.4"');
    expect(svg).toContain('transform="translate(10,20) rotate(15)"');
    // origin-centered rect: x = -w/2, y = -h/2
    expect(svg).toContain('x="-4"');
    expect(svg).toContain('y="-3"');
  });

  it('spends terracotta on the landmark block', () => {
    const svg = settlementSvg([{ x: 0, y: 0, w: 30, h: 12, a: 0, terra: true }]);
    expect(svg).toContain('fill="#9A5B3C"');
    expect(svg).not.toContain('fill="#2B2B2B"');
  });

  it('rounds coordinates to two decimals', () => {
    const svg = settlementSvg([{ x: 1.2345, y: 0, w: 8, h: 8, a: 0 }]);
    expect(svg).toContain('translate(1.23,0)');
  });

  it('honors opts overrides', () => {
    const svg = settlementSvg([{ x: 0, y: 0, w: 8, h: 8, a: 0 }], { ink: '#000', sep: 1 });
    expect(svg).toContain('fill="#000"');
    expect(svg).toContain('stroke-width="1"');
  });

  it('emits one rect per block', () => {
    const svg = settlementSvg([
      { x: 0, y: 0, w: 8, h: 8, a: 0 },
      { x: 10, y: 0, w: 8, h: 8, a: 0 },
      { x: 20, y: 0, w: 8, h: 8, a: 0 },
    ]);
    expect(svg.match(/<rect/g)).toHaveLength(3);
  });
});
