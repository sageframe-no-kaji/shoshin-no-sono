import { describe, it, expect } from 'vitest';
import {
  NATIVE_STACK,
  LABEL_MAX_CHARS,
  LABEL_LINE_HEIGHT,
  LABEL_PRIMARY_STOPS,
  LABEL_NATIVE_STOPS,
  FEET_PER_UNIT,
  ELEVATION_STEP_FT,
  labelGlowFilter,
  labelColor,
  peakLabel,
  peakNameScale,
  wrapLabel,
  townLabel,
  townLabelY,
  townLabelSvg,
  placeLabels,
  placeNameLayer,
  elevationLabelsSvg,
} from '../src/label-map.js';

/** Baseline label opts — the page's landed tuner values, hachure layer off. */
const opts = { labelRed: 0, labelGlow: 1, hachure: false };
/** The full place-name opts slice at the landed tuner values. */
const nameOpts = {
  ...opts,
  peakLabelScale: 0.5,
  importanceScale: 0.6,
  townLabelScale: 0.85,
  townLabelGap: 0,
};

// ── wrapLabel ────────────────────────────────────────────────────────────────

describe('wrapLabel', () => {
  it('returns no lines for an empty or whitespace-only name', () => {
    expect(wrapLabel('')).toEqual([]);
    expect(wrapLabel('   ')).toEqual([]);
  });

  it('keeps a short name on one line', () => {
    expect(wrapLabel('Three Hours')).toEqual(['Three Hours']);
  });

  it('fills a line up to exactly LABEL_MAX_CHARS before wrapping', () => {
    // 8 + 1 + 11 = 20 chars — exactly at the limit, stays one line
    expect(wrapLabel('abcdefgh abcdefghijk')).toEqual(['abcdefgh abcdefghijk']);
    // 8 + 1 + 12 = 21 chars — one past, wraps at the word boundary
    expect(wrapLabel('abcdefgh abcdefghijkl')).toEqual(['abcdefgh', 'abcdefghijkl']);
  });

  it('leaves a single over-long word unbroken on its own line', () => {
    const word = 'a'.repeat(LABEL_MAX_CHARS + 10);
    expect(wrapLabel(word)).toEqual([word]);
  });

  it('collapses runs of whitespace between words', () => {
    expect(wrapLabel('one   two\t three')).toEqual(['one two three']);
  });
});

// ── labelColor ───────────────────────────────────────────────────────────────

describe('labelColor', () => {
  const stops = [
    [0, 0, 0],
    [100, 100, 100],
    [200, 0, 0],
  ];

  it('lands on the stops at t = 0, 1, and 1.5', () => {
    expect(labelColor(stops, 0)).toBe('rgb(0,0,0)');
    expect(labelColor(stops, 1)).toBe('rgb(100,100,100)');
    expect(labelColor(stops, 1.5)).toBe('rgb(200,0,0)');
  });

  it('interpolates linearly inside each segment', () => {
    expect(labelColor(stops, 0.5)).toBe('rgb(50,50,50)');
    expect(labelColor(stops, 1.25)).toBe('rgb(150,50,50)');
  });

  it('clamps t below 0 and above 1.5', () => {
    expect(labelColor(stops, -3)).toBe('rgb(0,0,0)');
    expect(labelColor(stops, 9)).toBe('rgb(200,0,0)');
  });

  it('the shipped primary stops run warm dark → terracotta → vivid red', () => {
    expect(labelColor(LABEL_PRIMARY_STOPS, 0)).toBe('rgb(43,43,43)');
    expect(labelColor(LABEL_PRIMARY_STOPS, 1)).toBe('rgb(154,91,60)'); // terracotta
    expect(labelColor(LABEL_NATIVE_STOPS, 1)).toBe('rgb(181,114,85)'); // lighter parallel
  });
});

// ── labelGlowFilter ──────────────────────────────────────────────────────────

describe('labelGlowFilter', () => {
  it('scales dilation and displacement with the glow value', () => {
    const svg = labelGlowFilter(1);
    expect(svg).toContain('id="lblglow"');
    expect(svg).toContain('radius="4.00"');
    expect(svg).toContain('scale="2.00"');
  });

  it('floors both at 0.5 so glow 0 still produces a hairline halo', () => {
    const svg = labelGlowFilter(0);
    expect(svg).toContain('radius="0.50"');
    expect(svg).toContain('scale="0.50"');
  });

  it('floods with the register paper cream', () => {
    expect(labelGlowFilter(1)).toContain('flood-color="#FDFCF9"');
  });
});

// ── peakLabel ────────────────────────────────────────────────────────────────

describe('peakLabel', () => {
  it('sets the name in wide-tracked caps with a paint-order stroke halo', () => {
    const svg = peakLabel(100, 200, 'alpha', null, 1, opts);
    expect(svg).toContain('>ALPHA</text>');
    expect(svg).toContain('letter-spacing:0.16em');
    expect(svg).toContain('paint-order="stroke"');
    expect(svg).toContain('stroke="#FDFCF9"');
    expect(svg).toContain('stroke-width="5.0"'); // 5 × scale 1 × glow 1
    expect(svg).toContain('font-size="16.5"');
  });

  it('sets the native script beside the roman name in its own stack and fill', () => {
    const svg = peakLabel(0, 0, 'Kanyo', '観よう', 1, opts);
    expect(svg).toContain(`font-family="${NATIVE_STACK}"`);
    expect(svg).toContain('観よう</tspan>');
    expect(svg).toContain('fill="rgb(92,92,92)"'); // native stop at labelRed 0
  });

  it('omits the native tspan when there is no native script', () => {
    expect(peakLabel(0, 0, 'Alpha', null, 1, opts)).not.toContain('<tspan');
  });

  it('uses the textured glow filter instead of the stroke halo when hachure is on', () => {
    const svg = peakLabel(0, 0, 'Alpha', null, 1, { ...opts, hachure: true });
    expect(svg).toContain('filter="url(#lblglow)"');
    expect(svg).not.toContain('paint-order');
  });

  it('labelRed dials the fill toward terracotta', () => {
    expect(peakLabel(0, 0, 'A', null, 1, opts)).toContain('fill="rgb(43,43,43)"');
    expect(peakLabel(0, 0, 'A', null, 1, { ...opts, labelRed: 1 })).toContain('fill="rgb(154,91,60)"');
  });

  it('labelGlow scales the halo stroke width', () => {
    expect(peakLabel(0, 0, 'A', null, 1, { ...opts, labelGlow: 2 })).toContain('stroke-width="10.0"');
  });

  it('tolerates an empty name in both halo modes', () => {
    expect(peakLabel(0, 0, '', null, 1, opts)).toContain('></text>');
    expect(peakLabel(0, 0, '', null, 1, { ...opts, hachure: true })).toContain('></text>');
  });
});

// ── peakNameScale ────────────────────────────────────────────────────────────

describe('peakNameScale', () => {
  it('importanceScale 0 makes every peak the same size', () => {
    const o = { peakLabelScale: 0.5, importanceScale: 0 };
    expect(peakNameScale(2, o)).toBe(0.5);
    expect(peakNameScale(10, o)).toBe(0.5);
  });

  it('spreads by importance — importance 10 reaches (1 + importanceScale)× importance 2', () => {
    const o = { peakLabelScale: 0.5, importanceScale: 0.6 };
    expect(peakNameScale(2, o)).toBeCloseTo(0.5);
    expect(peakNameScale(10, o)).toBeCloseTo(0.5 * 1.6);
  });

  it('floors the smallest at 0.4× the base so it stays legible', () => {
    const o = { peakLabelScale: 1, importanceScale: 4 };
    expect(peakNameScale(0, o)).toBe(0.4); // 1 + 4·(−0.25) = 0 → floored to 0.4
  });
});

// ── townLabel ────────────────────────────────────────────────────────────────

describe('townLabel', () => {
  it('sets the name in italic with a tighter halo than peaks', () => {
    const svg = townLabel(50, 60, 'Three Hours', 1, opts);
    expect(svg).toContain('font-style="italic"');
    expect(svg).toContain('letter-spacing:0.04em');
    expect(svg).toContain('stroke-width="4.5"'); // 4.5 × scale 1 × glow 1
    expect(svg).toContain('font-size="12.5"');
  });

  it('wraps a long name into stacked tspans at the line height', () => {
    const svg = townLabel(50, 60, 'A Very Long Title That Wraps Twice', 1, opts);
    const dys = [...svg.matchAll(/dy="([\d.]+)"/g)].map((m) => m[1]);
    expect((svg.match(/<tspan/g) ?? []).length).toBeGreaterThan(1);
    expect(dys).toContain(LABEL_LINE_HEIGHT.toFixed(1));
  });

  it('a single line carries dy 0', () => {
    expect(townLabel(50, 60, 'Short', 1, opts)).toContain('dy="0"');
  });

  it('uses the glow filter when hachure is on', () => {
    const svg = townLabel(50, 60, 'Short', 1, { ...opts, hachure: true });
    expect(svg).toContain('filter="url(#lblglow)"');
    expect(svg).not.toContain('paint-order');
  });
});

// ── townLabelY / townLabelSvg ────────────────────────────────────────────────

describe('townLabelY and townLabelSvg', () => {
  const town = { seat: { x: 100, y: 200 }, extent: 30, name: 'Three Hours' };

  it('places the label below the settlement outer edge plus the gap', () => {
    expect(townLabelY(town, 0)).toBe(230);
    expect(townLabelY(town, 12)).toBe(242);
  });

  it('wraps the label markup in a group at the computed y', () => {
    const svg = townLabelSvg(town, nameOpts);
    expect(svg).toMatch(/^<g><text /);
    expect(svg).toContain('y="230.0"');
    expect(svg).toContain('Three Hours');
  });
});

// ── placeLabels ──────────────────────────────────────────────────────────────

describe('placeLabels — greedy collision placement', () => {
  /** @param {number} cx @param {number} top @param {number} priority @param {string} svg */
  const item = (cx, top, priority, svg) => ({ cx, top, w: 20, h: 10, priority, svg });

  it('returns empty output for no items', () => {
    expect(placeLabels([])).toBe('');
  });

  it('places non-overlapping labels in priority order, biggest first', () => {
    const out = placeLabels([item(0, 0, 1, '<low/>'), item(100, 100, 9, '<high/>')]);
    expect(out).toBe('<high/><low/>');
  });

  it('drops a lower-priority label whose box overlaps a placed one', () => {
    const out = placeLabels([item(0, 0, 1, '<low/>'), item(5, 5, 9, '<high/>')]);
    expect(out).toBe('<high/>');
  });

  it('treats exactly-touching boxes as colliding (edge shared)', () => {
    // Boxes are 20 wide at cx 0 and cx 20: x ranges [-10,10] and [10,30] share x=10.
    const out = placeLabels([item(0, 0, 2, '<a/>'), item(20, 0, 1, '<b/>')]);
    expect(out).toBe('<a/>');
  });

  it('does not mutate the input array order', () => {
    const items = [item(0, 0, 1, '<low/>'), item(100, 100, 9, '<high/>')];
    placeLabels(items);
    expect(items[0].svg).toBe('<low/>');
  });
});

// ── placeNameLayer ───────────────────────────────────────────────────────────

describe('placeNameLayer', () => {
  const peak = { x: 100, y: 100, name: 'Alpha', native: null, importance: 9 };
  const town = (/** @type {Partial<import('../src/label-map.js').TownLabelInput>} */ over = {}) => ({
    seat: { x: 400, y: 400 },
    extent: 20,
    name: 'On Alpha',
    match: true,
    importance: 5,
    ...over,
  });

  it('renders peak caps and town italic together', () => {
    const out = placeNameLayer([peak], [town()], nameOpts);
    expect(out).toContain('ALPHA');
    expect(out).toContain('On Alpha');
  });

  it('skips non-matching towns (their labels recede with the buildings)', () => {
    expect(placeNameLayer([], [town({ match: false })], nameOpts)).toBe('');
  });

  it('a peak edges out an equal-importance town on a collision (+0.5 priority)', () => {
    // Same spot, same importance — the peak's box overlaps the town's label box.
    const out = placeNameLayer(
      [{ ...peak, importance: 5 }],
      [town({ seat: { x: 100, y: 100 }, extent: 0, name: 'Contender' })],
      nameOpts,
    );
    expect(out).toContain('ALPHA');
    expect(out).not.toContain('Contender');
  });

  it('the higher-importance town wins when two town labels collide', () => {
    const a = town({ name: 'Big Essay', importance: 8 });
    const b = town({ name: 'Small Note', importance: 2 });
    const out = placeNameLayer([], [a, b], nameOpts);
    expect(out).toContain('Big Essay');
    expect(out).not.toContain('Small Note');
  });

  it('widens a peak box for its native script and tolerates an empty name', () => {
    // A nameless peak with native script still renders the native tspan.
    const out = placeNameLayer([{ ...peak, name: '', native: '観よう' }], [], nameOpts);
    expect(out).toContain('観よう');
  });

  it('hachure mode pads the collision boxes by the glow footprint', () => {
    // Two towns whose boxes clear each other by a hair without the pad, and
    // collide once the ~3·glow pad is added on each side.
    const a = town({ seat: { x: 100, y: 100 }, name: 'One', importance: 5 });
    // "One"/"Two" boxes are maxc(3) × fs(10.625) × 0.5 + 6 ≈ 21.9 wide → clear at dx 25.
    const b = town({ seat: { x: 125, y: 100 }, name: 'Two', importance: 3 });
    const clear = placeNameLayer([], [a, b], nameOpts);
    expect(clear).toContain('One');
    expect(clear).toContain('Two');
    const padded = placeNameLayer([], [a, b], { ...nameOpts, hachure: true, labelGlow: 1 });
    expect(padded).toContain('One');
    expect(padded).not.toContain('Two');
  });
});

// ── elevationLabelsSvg ───────────────────────────────────────────────────────

/**
 * A radial cone heightfield: peak `peak` units at the centre, falling to 0 at
 * radius R — long round contours at every level below the summit.
 * @param {number} peak @param {number} R @param {number} size @param {number} cell
 * @returns {import('../src/field.js').Heightfield}
 */
const coneHf = (peak, R, size = 41, cell = 10) => {
  const cols = size;
  const rows = size;
  const field = new Float64Array(cols * rows);
  const cx = ((cols - 1) * cell) / 2;
  const cy = ((rows - 1) * cell) / 2;
  let max = 0;
  for (let j = 0; j < rows; j++)
    for (let i = 0; i < cols; i++) {
      const v = Math.max(0, peak * (1 - Math.hypot(i * cell - cx, j * cell - cy) / R));
      field[j * cols + i] = v;
      if (v > max) max = v;
    }
  return { field, cols, rows, cell, width: (cols - 1) * cell, height: (rows - 1) * cell, max };
};

describe('elevationLabelsSvg', () => {
  it('labels every round 1000-ft level below the summit', () => {
    // Summit 2.4 units ≈ 2400 ft → levels at 1000 and 2000 ft, nothing else.
    const svg = elevationLabelsSvg(coneHf(2.4, 180), { elevationScale: 1.5 });
    expect(svg).toContain('>1000</text>');
    expect(svg).toContain('>2000</text>');
    expect(svg).not.toContain('>3000</text>');
    expect(FEET_PER_UNIT).toBe(1000);
    expect(ELEVATION_STEP_FT).toBe(1000);
  });

  it('emits nothing for a field that never reaches the first step', () => {
    expect(elevationLabelsSvg(coneHf(0.9, 180), { elevationScale: 1.5 })).toBe('');
  });

  it('skips sparse levels (a ring shorter than 8 segments carries no label)', () => {
    // A pinprick summit: the 1000-ft ring is only a few cells around.
    expect(elevationLabelsSvg(coneHf(1.2, 15, 5), { elevationScale: 1.5 })).toBe('');
  });

  it('keeps the numerals upright — every rotation stays within ±90°', () => {
    const svg = elevationLabelsSvg(coneHf(2.4, 180), { elevationScale: 1.5 });
    const angles = [...svg.matchAll(/rotate\((-?[\d.]+) /g)].map((m) => parseFloat(m[1]));
    expect(angles.length).toBeGreaterThan(0);
    for (const a of angles) {
      expect(a).toBeGreaterThanOrEqual(-90);
      expect(a).toBeLessThanOrEqual(90);
    }
  });

  it('folds a steeper-than-90° segment back upright', () => {
    // This cone samples a T→B marching-squares segment whose raw angle is
    // ~110° — the fold brings it to ~−70°, inside the upright range.
    const svg = elevationLabelsSvg(coneHf(4.4, 180), { elevationScale: 1.5 });
    const angles = [...svg.matchAll(/rotate\((-?[\d.]+) /g)].map((m) => parseFloat(m[1]));
    expect(angles.some((a) => a < -60)).toBe(true);
    for (const a of angles) {
      expect(a).toBeGreaterThanOrEqual(-90);
      expect(a).toBeLessThanOrEqual(90);
    }
  });

  it('elevationScale sizes the numerals and their halo', () => {
    const svg = elevationLabelsSvg(coneHf(2.4, 180), { elevationScale: 2 });
    expect(svg).toContain('font-size="12.0"'); // 6 × 2
    expect(svg).toContain('stroke-width="4.8"'); // 2.4 × 2
  });
});

describe('placeLabels — furniture obstacles (ho-08: the cartouche)', () => {
  const item = (/** @type {number} */ cx, /** @type {number} */ top, /** @type {number} */ priority) => ({
    cx,
    top,
    w: 40,
    h: 10,
    priority,
    svg: `<text data-cx="${cx}"/>`,
  });

  it('a label overlapping an obstacle is dropped, others place normally', () => {
    const obstacle = { x1: 100, y1: 0, x2: 200, y2: 50 };
    const out = placeLabels([item(150, 20, 9), item(300, 20, 5)], [obstacle]);
    expect(out).not.toContain('data-cx="150"'); // inside the cartouche box — dropped
    expect(out).toContain('data-cx="300"'); // clear of it — placed
  });

  it('no obstacles behaves exactly as before', () => {
    const out = placeLabels([item(150, 20, 9)]);
    expect(out).toContain('data-cx="150"');
  });
});
