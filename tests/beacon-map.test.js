import { describe, it, expect } from 'vitest';
import { beaconSvg, corpusFloorSvg, BEACON_AMBER } from '../src/beacon-map.js';
import { CORPUS_FLOOR } from '../src/emergence.js';

/** A positioned peak fixture — only the fields the beacon reads matter here. */
/** @param {number} importance @param {number} [x] @param {number} [y] @returns {import('../src/field.js').PositionedPeak} */
const peak = (importance, x = 100, y = 200) => ({
  id: `p${importance}`,
  importance,
  amplitude: importance,
  x,
  y,
});

/** Pull the three opacity values of the first beacon (halo, glow, core). */
const opacities = (/** @type {string} */ svg) =>
  [...svg.matchAll(/opacity="([\d.]+)"/g)].map((m) => parseFloat(m[1]));

describe('beaconSvg', () => {
  const base = { beaconOpacity: 1, beaconImportance: 0 };

  it('renders nothing at weight 0 (the dial hides the layer)', () => {
    expect(beaconSvg([peak(9)], { ...base, beaconOpacity: 0 })).toBe('');
    expect(beaconSvg([peak(9)], { ...base, beaconOpacity: -1 })).toBe('');
  });

  it('renders nothing for no peaks', () => {
    expect(beaconSvg([], base)).toBe('');
  });

  it('stacks three amber circles per peak — halo, glow, core', () => {
    const svg = beaconSvg([peak(9)], base);
    expect((svg.match(/<circle /g) ?? []).length).toBe(3);
    expect((svg.match(new RegExp(BEACON_AMBER, 'g')) ?? []).length).toBe(3);
    expect(svg).toContain('cx="100.0"');
    expect(svg).toContain('cy="200.0"');
  });

  it('breathes only when pulse is set (stable containers), steady otherwise', () => {
    expect(beaconSvg([peak(9)], { ...base, pulse: true })).toContain('animation:emgBeacon');
    expect(beaconSvg([peak(9)], base)).not.toContain('animation');
  });

  it('importance dial 0 weights every peak uniformly', () => {
    const lo = beaconSvg([peak(2, 0, 0)], base);
    const hi = beaconSvg([peak(10, 0, 0)], base);
    expect(opacities(lo)).toEqual(opacities(hi));
  });

  it('importance dial 1 spreads quadratically — imp 3 dims to ~10%, imp 9 holds ~80%', () => {
    const dial = { beaconOpacity: 1, beaconImportance: 1 };
    const [halo3] = opacities(beaconSvg([peak(3)], dial));
    const [halo9] = opacities(beaconSvg([peak(9)], dial));
    expect(halo3).toBeCloseTo(0.18 * 0.09, 3);
    expect(halo9).toBeCloseTo(0.18 * 0.81, 3);
  });

  it('caps each circle opacity at 1 when the weight overdrives', () => {
    const svg = beaconSvg([peak(10)], { beaconOpacity: 5, beaconImportance: 0 });
    for (const o of opacities(svg)) expect(o).toBeLessThanOrEqual(1);
    expect(svg).toContain('opacity="1.000"'); // glow and core saturate
  });

  it('past opacity saturation the dial amplifies via sqrt radius growth', () => {
    // scaled = 4 → sizeMul = 2: halo 18, glow 6.8, core 2.6.
    const svg = beaconSvg([peak(10)], { beaconOpacity: 4, beaconImportance: 0 });
    expect(svg).toContain('r="18.0"');
    expect(svg).toContain('r="6.8"');
    expect(svg).toContain('r="2.6"');
    // scaled ≤ 1 keeps the base radii.
    const calm = beaconSvg([peak(10)], { beaconOpacity: 1, beaconImportance: 0 });
    expect(calm).toContain('r="9.0"');
  });

  it('clamps importance into 0..10 before the spread', () => {
    const dial = { beaconOpacity: 1, beaconImportance: 1 };
    const over = beaconSvg([peak(15)], dial);
    const ten = beaconSvg([peak(10)], dial);
    expect(opacities(over)).toEqual(opacities(ten));
  });
});

describe('corpusFloorSvg', () => {
  it('renders nothing at weight 0', () => {
    expect(corpusFloorSvg({ floorMarkerOpacity: 0 })).toBe('');
  });

  it('draws the dashed horizon at the by-feel weight', () => {
    const svg = corpusFloorSvg({ floorMarkerOpacity: 0.45 });
    expect(svg).toContain('<g opacity="0.45">');
    expect(svg).toContain('stroke-dasharray="1 6"');
    expect(svg).toContain('y1="588"');
    expect(svg).toContain('#9A958B');
  });

  it('captions the horizon with the corpus-floor label', () => {
    const svg = corpusFloorSvg({ floorMarkerOpacity: 0.45 });
    expect(svg).toContain(`${CORPUS_FLOOR.label} · 2025`);
  });
});
