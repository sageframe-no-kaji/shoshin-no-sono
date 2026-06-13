import { describe, it, expect } from 'vitest';
import { createIndexer } from '../src/indexer.js';
import {
  isPeak,
  peakWorks,
  relevance,
  computeField,
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
      group: 'writing',
      importance: 6,
      themes: ['craft'],
      media: ['writing'],
      status: 'published',
      sort_order_within_group: 10,
      relationships: [],
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
