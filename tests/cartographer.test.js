import { describe, it, expect } from 'vitest';
import { createIndexer } from '../src/indexer.js';
import {
  isPeak,
  peakWorks,
  townWorks,
  relevance,
  computeField,
  computeTowns,
  computeRoadEdges,
  computeTrailEdges,
  createCartographer,
  TOWN_GROUP,
} from '../src/cartographer.js';

/**
 * Three works: two peaks (a methodology, a production system) and one town (a
 * writing). Only the fields the Indexer and Cartographer read are populated.
 * @type {any}
 */
const data = {
  work_groups: [
    { id: 'methodology', number: 1, name: 'Methodology', intro: '' },
    { id: 'writing', number: 4, name: 'Writing', intro: '' },
  ],
  theme_vocabulary: {},
  works: [
    {
      id: 'ho-system',
      group: 'methodology',
      importance: 9,
      themes: ['craft'],
      media: ['methodology'],
      status: 'shipped',
      sort_order_within_group: 10,
      relationships: [],
    },
    {
      id: 'kanyo',
      group: 'production-systems',
      importance: 8,
      themes: ['agency'],
      media: ['software'],
      status: 'shipped',
      sort_order_within_group: 20,
      relationships: [],
    },
    {
      id: 'three-hours',
      name: 'Three Hours',
      group: 'writing',
      importance: 6,
      themes: ['craft'],
      media: ['writing'],
      status: 'published',
      sort_order_within_group: 10,
      relationships: [{ target: 'ho-system', type: 'documents', strength: 3 }],
    },
    {
      // a town with no documents edge — leans on its argues_for fallback anchor
      id: 'the-same-lever',
      name: 'The Same Lever',
      group: 'writing',
      importance: 6,
      themes: ['agency'],
      media: ['writing'],
      status: 'published',
      sort_order_within_group: 20,
      relationships: [{ target: 'kanyo', type: 'argues_for' }],
    },
  ],
};

const indexer = createIndexer(data);
const empty = { themes: [], media: [], status: [] };
/**
 * @param {string} id
 * @param {{ amplitude: number }[]} peaks
 * @param {{ id: string }[]} works
 */
const ampOf = (id, peaks, works) => peaks[works.findIndex((w) => w.id === id)].amplitude;

describe('cartographic role', () => {
  it('treats the writing group as towns and everything else as peaks', () => {
    expect(TOWN_GROUP).toBe('writing');
    expect(isPeak(/** @type {any} */ ({ group: 'methodology' }))).toBe(true);
    expect(isPeak(/** @type {any} */ ({ group: 'production-systems' }))).toBe(true);
    expect(isPeak(/** @type {any} */ ({ group: 'writing' }))).toBe(false);
  });

  it('peakWorks excludes commentary', () => {
    expect(peakWorks(indexer).map((w) => w.id)).toEqual(['ho-system', 'kanyo']);
  });

  it('townWorks is the writing group', () => {
    expect(townWorks(indexer).map((w) => w.id)).toEqual(['three-hours', 'the-same-lever']);
  });
});

describe('relevance', () => {
  it('is 1 for a match and the floor for a non-match', () => {
    const work = /** @type {any} */ ({ themes: ['craft'], media: ['x'], status: 's' });
    expect(relevance(work, { ...empty, themes: ['craft'] }, 0.15)).toBe(1);
    expect(relevance(work, { ...empty, themes: ['agency'] }, 0.15)).toBe(0.15);
  });
});

describe('computeField', () => {
  it('positions only peaks and is deterministic from the seed', () => {
    const a = computeField(indexer, empty, 42);
    expect(a.peaks.map((p) => p.id)).toEqual(['ho-system', 'kanyo']);
    expect(a.seed).toBe(42);
    expect(computeField(indexer, empty, 42)).toEqual(a);
  });

  it('with no filter, amplitude equals importance', () => {
    const { peaks } = computeField(indexer, empty, 42);
    const works = peakWorks(indexer);
    expect(ampOf('ho-system', peaks, works)).toBe(9);
    expect(ampOf('kanyo', peaks, works)).toBe(8);
  });

  it('sinks non-matching peaks under a filter (one terrain)', () => {
    const { peaks } = computeField(indexer, { ...empty, themes: ['agency'] }, 42, {
      relevanceFloor: 0.15,
    });
    const works = peakWorks(indexer);
    expect(ampOf('kanyo', peaks, works)).toBe(8); // matches agency → full
    expect(ampOf('ho-system', peaks, works)).toBeCloseTo(9 * 0.15); // craft, sunk
  });

  it('keeps positions stable across filter states (only heights change)', () => {
    const open = computeField(indexer, empty, 42);
    const filtered = computeField(indexer, { ...empty, themes: ['agency'] }, 42);
    expect(filtered.peaks.map((p) => [p.x, p.y])).toEqual(open.peaks.map((p) => [p.x, p.y]));
  });
});

describe('computeField — the emergenceScale hook (ho-07.2)', () => {
  it('scale 1 for all reproduces the default field exactly (no regression)', () => {
    const base = computeField(indexer, empty, 42);
    const scaled = computeField(indexer, empty, 42, { emergenceScale: () => 1 });
    expect(scaled).toEqual(base);
  });

  it('scale 0 removes a peak from the field and the returned peaks', () => {
    const onlyHo = computeField(indexer, empty, 42, {
      emergenceScale: (id) => (id === 'ho-system' ? 1 : 0),
    });
    expect(onlyHo.peaks.map((p) => p.id)).toEqual(['ho-system']);
    // a heightfield with one fewer massif is strictly lower at its tallest
    const both = computeField(indexer, empty, 42);
    expect(onlyHo.heightfield.max).toBeLessThan(both.heightfield.max);
  });

  it('a peak rises in place — its position is unchanged as others emerge', () => {
    const full = computeField(indexer, empty, 42);
    const partial = computeField(indexer, empty, 42, {
      emergenceScale: (id) => (id === 'kanyo' ? 1 : 0),
    });
    const fullKanyo = full.peaks.find((p) => p.id === 'kanyo');
    const partialKanyo = partial.peaks.find((p) => p.id === 'kanyo');
    expect([partialKanyo?.x, partialKanyo?.y]).toEqual([fullKanyo?.x, fullKanyo?.y]);
  });

  it('all-zero scale yields a peakless field — only noise, no massifs', () => {
    const none = computeField(indexer, empty, 42, { emergenceScale: () => 0 });
    const both = computeField(indexer, empty, 42);
    expect(none.peaks).toEqual([]);
    // no massif remains: the max collapses to the faint value-noise ceiling,
    // far below any real peak's elevation
    expect(none.heightfield.max).toBeLessThan(0.5);
    expect(none.heightfield.max).toBeLessThan(both.heightfield.max);
  });
});

describe('computeTowns', () => {
  const dist = (/** @type {{x:number,y:number}} */ a, /** @type {{x:number,y:number}} */ b) =>
    Math.hypot(a.x - b.x, a.y - b.y);
  const centroidOf = (/** @type {{x:number,y:number}[]} */ pts) => ({
    x: pts.reduce((s, p) => s + p.x, 0) / pts.length,
    y: pts.reduce((s, p) => s + p.y, 0) / pts.length,
  });

  it('places one town per writing work, deterministically', () => {
    const field = computeField(indexer, empty, 42);
    const towns = computeTowns(indexer, empty, field);
    expect(towns.map((t) => t.id)).toEqual(['three-hours', 'the-same-lever']);
    expect(computeTowns(indexer, empty, field)).toEqual(towns);
    towns.forEach((t) => {
      expect(Number.isFinite(t.seat.x) && Number.isFinite(t.seat.y)).toBe(true);
      expect(t.blocks.length).toBeGreaterThan(0);
      expect(t.extent).toBeGreaterThan(0);
    });
  });

  it('sizes the town from its settlement weight', () => {
    const field = computeField(indexer, empty, 42);
    const towns = computeTowns(indexer, empty, field);
    const threeHours = towns.find((t) => t.id === 'three-hours');
    const sameLever = towns.find((t) => t.id === 'the-same-lever');
    // three-hours documents ho-system@3 → ln(1+3) ≈ 1.386 → village (≥0.7, <1.5)
    expect(threeHours?.level).toBe(1);
    // the-same-lever documents nothing → weight 0 → hamlet
    expect(sameLever?.level).toBe(0);
  });

  it('seats a documented town toward its peak, off the centroid', () => {
    const field = computeField(indexer, empty, 42);
    const hoPos = field.peaks.find((p) => p.id === 'ho-system');
    const threeHours = computeTowns(indexer, empty, field).find((t) => t.id === 'three-hours');
    if (!hoPos || !threeHours) throw new Error('fixture missing ho-system peak or three-hours town');
    const centroid = centroidOf(field.peaks.map((p) => ({ x: p.x, y: p.y })));
    // anchored to ho-system → seat is pulled off the centroid toward the peak's foot
    expect(dist(threeHours.seat, hoPos)).toBeLessThan(dist(centroid, hoPos));
  });

  it('flags filter recession without moving the seat', () => {
    const field = computeField(indexer, empty, 42);
    const open = computeTowns(indexer, empty, field);
    const filtered = computeTowns(indexer, { ...empty, themes: ['craft'] }, field);
    const t = (/** @type {any[]} */ ts, /** @type {string} */ id) => ts.find((x) => x.id === id);
    // three-hours is craft → matches; the-same-lever is agency → recedes
    expect(t(filtered, 'three-hours').match).toBe(true);
    expect(t(filtered, 'the-same-lever').match).toBe(false);
    // seats are filter-independent (positions are seed-only)
    expect(t(filtered, 'three-hours').seat).toEqual(t(open, 'three-hours').seat);
  });
});

describe('edge assembly — computeRoadEdges / computeTrailEdges (ho-08)', () => {
  /**
   * Two peaks and two towns. The towns are companions of each other (declared
   * once, on three-hours — symmetric edges answer from both endpoints), and
   * three-hours is ALSO a companion of the peak kanyo (a town↔peak companion
   * is not a road). Each town documents one peak.
   * @type {any}
   */
  const edgeData = {
    work_groups: [
      { id: 'methodology', number: 1, name: 'Methodology', intro: '' },
      { id: 'writing', number: 4, name: 'Writing', intro: '' },
    ],
    theme_vocabulary: {},
    works: [
      {
        id: 'ho-system',
        group: 'methodology',
        importance: 9,
        themes: ['craft'],
        media: ['methodology'],
        status: 'shipped',
        sort_order_within_group: 10,
        relationships: [],
      },
      {
        id: 'kanyo',
        group: 'production-systems',
        importance: 8,
        themes: ['agency'],
        media: ['software'],
        status: 'shipped',
        sort_order_within_group: 20,
        relationships: [],
      },
      {
        id: 'three-hours',
        name: 'Three Hours',
        group: 'writing',
        importance: 6,
        themes: ['craft'],
        media: ['writing'],
        status: 'published',
        sort_order_within_group: 10,
        relationships: [
          { target: 'ho-system', type: 'documents', strength: 3 },
          { target: 'the-same-lever', type: 'companion_to' },
          { target: 'kanyo', type: 'companion_to' },
        ],
      },
      {
        id: 'the-same-lever',
        name: 'The Same Lever',
        group: 'writing',
        importance: 6,
        themes: ['agency'],
        media: ['writing'],
        status: 'published',
        sort_order_within_group: 20,
        relationships: [{ target: 'kanyo', type: 'documents', strength: 2 }],
      },
    ],
  };
  const idx = createIndexer(edgeData);
  const field = computeField(idx, empty, 42);
  const towns = computeTowns(idx, empty, field);
  const seatOf = (/** @type {string} */ id) => towns.find((t) => t.id === id)?.seat;

  it('builds one road per companion pair, deduplicated by sorted id pair', () => {
    const roads = computeRoadEdges(idx, towns);
    // The symmetric edge answers from BOTH towns' outgoing sets — one road results.
    expect(roads).toHaveLength(1);
    expect(roads[0].id).toBe('the-same-lever|three-hours');
    expect(roads[0].strength).toBe(2);
  });

  it('road endpoints are the two towns’ seats', () => {
    const [road] = computeRoadEdges(idx, towns);
    expect(road.from).toEqual(seatOf('three-hours'));
    expect(road.to).toEqual(seatOf('the-same-lever'));
  });

  it('skips companion edges whose far endpoint is a peak, not a settlement', () => {
    const roads = computeRoadEdges(idx, towns);
    expect(roads.some((r) => r.id.includes('kanyo'))).toBe(false);
  });

  it('returns no roads for no towns', () => {
    expect(computeRoadEdges(idx, [])).toEqual([]);
  });

  it('builds one trail per documents edge, town seat → peak position', () => {
    const trails = computeTrailEdges(idx, towns, field.peaks);
    expect(trails.map((t) => t.id)).toEqual(['three-hours→ho-system', 'the-same-lever→kanyo']);
    const ho = field.peaks.find((p) => p.id === 'ho-system');
    expect(trails[0].from).toEqual(seatOf('three-hours'));
    expect(trails[0].to).toEqual({ x: ho?.x, y: ho?.y });
  });

  it('skips documents edges to peaks absent from the field (mid-emergence)', () => {
    // Only ho-system has risen — the-same-lever's trail to kanyo has no endpoint yet.
    const risen = field.peaks.filter((p) => p.id === 'ho-system');
    const trails = computeTrailEdges(idx, towns, risen);
    expect(trails.map((t) => t.id)).toEqual(['three-hours→ho-system']);
  });

  it('returns no trails for no towns', () => {
    expect(computeTrailEdges(idx, [], field.peaks)).toEqual([]);
  });

  describe('hiking trails — validates edges between peaks', () => {
    /** Two peaks validating each other (declared both ways), one town bystander. @type {any} */
    const hikeData = {
      work_groups: [{ id: 'methodology', number: 1, name: 'Methodology', intro: '' }],
      theme_vocabulary: {},
      works: [
        {
          id: 'kanyo',
          group: 'methodology',
          importance: 8,
          themes: [],
          media: ['software'],
          status: 'shipped',
          sort_order_within_group: 10,
          relationships: [{ target: 'ho-system', type: 'validates' }],
        },
        {
          id: 'ho-system',
          group: 'methodology',
          importance: 9,
          themes: [],
          media: ['methodology'],
          status: 'shipped',
          sort_order_within_group: 20,
          relationships: [{ target: 'kanyo', type: 'validates' }],
        },
      ],
    };
    const hikeIdx = createIndexer(hikeData);
    const hikeField = computeField(hikeIdx, empty, 42);

    it('builds one hiking trail per validated peak pair, deduplicated by sorted id pair', () => {
      const trails = computeTrailEdges(hikeIdx, [], hikeField.peaks);
      expect(trails).toHaveLength(1); // declared both ways → one trail
      expect(trails[0].id).toBe('ho-system|kanyo');
    });

    it('carries both foot radii, scaled from each peak’s importance', () => {
      const [trail] = computeTrailEdges(hikeIdx, [], hikeField.peaks);
      // footFrac 0.75 × (radiusBase 12 + importance × radiusScale 8)
      const kanyoFoot = (12 + 8 * 8) * 0.75;
      const hoFoot = (12 + 9 * 8) * 0.75;
      // Edge is declared kanyo → ho-system first: start at kanyo, foot at ho-system.
      expect(trail.startRadius).toBeCloseTo(kanyoFoot, 6);
      expect(trail.footRadius).toBeCloseTo(hoFoot, 6);
    });

    it('endpoints are the two peak positions', () => {
      const [trail] = computeTrailEdges(hikeIdx, [], hikeField.peaks);
      const kanyo = hikeField.peaks.find((p) => p.id === 'kanyo');
      const ho = hikeField.peaks.find((p) => p.id === 'ho-system');
      expect(trail.from).toEqual({ x: kanyo?.x, y: kanyo?.y });
      expect(trail.to).toEqual({ x: ho?.x, y: ho?.y });
    });

    it('skips a hiking trail whose far peak has not risen (mid-emergence)', () => {
      const risen = hikeField.peaks.filter((p) => p.id === 'kanyo');
      expect(computeTrailEdges(hikeIdx, [], risen)).toEqual([]);
    });
  });
});

describe('createCartographer', () => {
  /** @param {number | null} urlSeed */
  const gateWith = (urlSeed, state = empty) => ({
    currentState: () => state,
    currentSeed: () => urlSeed,
  });

  it('uses the URL seed when present and ignores reseed (pinned)', () => {
    const carto = createCartographer(indexer, gateWith(555), { randomSeed: () => 1 });
    expect(carto.activeSeed()).toBe(555);
    carto.reseed();
    expect(carto.activeSeed()).toBe(555);
    expect(carto.field().seed).toBe(555);
  });

  it('rolls an ephemeral seed when the URL carries none, and reseed changes it', () => {
    let next = 100;
    const carto = createCartographer(indexer, gateWith(null), { randomSeed: () => next++ });
    expect(carto.activeSeed()).toBe(100);
    expect(carto.reseed()).toBe(101);
    expect(carto.activeSeed()).toBe(101);
  });

  it('falls back to a real random seed when none is injected', () => {
    const carto = createCartographer(indexer, gateWith(null));
    expect(Number.isInteger(carto.activeSeed())).toBe(true);
  });
});

describe('cartoucheReserve — content keeps out of the furniture (ho-08)', () => {
  it('no peak seats inside the reserve; the terrain beneath is NOT flattened', () => {
    const reserve = { x: 700, y: 16, w: 220, h: 140 };
    const withR = computeField(indexer, empty, 12345, { cartoucheReserve: reserve });
    for (const p of withR.peaks) {
      const inside =
        p.x >= reserve.x - 30 &&
        p.x <= reserve.x + reserve.w + 30 &&
        p.y >= reserve.y - 30 &&
        p.y <= reserve.y + reserve.h + 30;
      expect(inside).toBe(false);
    }
    // The field under the footprint generates freely (noise, skirts) — the
    // reserve must not have zeroed it (this superseded the earlier
    // deny-elevation approach: furniture claims no terrain, only content).
    const hf = withR.heightfield;
    let maxUnder = -Infinity;
    for (let y = reserve.y; y < reserve.y + reserve.h; y += hf.cell) {
      for (let x = reserve.x; x < reserve.x + reserve.w; x += hf.cell) {
        const v = hf.field[Math.round(y / hf.cell) * hf.cols + Math.round(x / hf.cell)];
        if (v > maxUnder) maxUnder = v;
      }
    }
    expect(maxUnder).toBeGreaterThan(0); // terrain lives under the furniture
  });

  it('a town seat inside the reserve nudges out through the nearest edge', () => {
    // Same field both times (positions fixed): find where a town seats with
    // no reserve, drop the reserve exactly on that seat, and re-place.
    const field = computeField(indexer, empty, 42);
    const t0 = computeTowns(indexer, empty, field)[0];
    const reserve = { x: t0.seat.x - 40, y: t0.seat.y - 30, w: 80, h: 60 };
    const t1 = computeTowns(indexer, empty, field, { cartoucheReserve: reserve }).find(
      (t) => t.id === t0.id,
    );
    const pad = 24;
    const inside =
      t1 != null &&
      t1.seat.x > reserve.x - pad + 0.001 &&
      t1.seat.x < reserve.x + reserve.w + pad - 0.001 &&
      t1.seat.y > reserve.y - pad + 0.001 &&
      t1.seat.y < reserve.y + reserve.h + pad - 0.001;
    expect(inside).toBe(false);
    expect(t1?.seat).not.toEqual(t0.seat); // the nudge actually moved it
  });
});
