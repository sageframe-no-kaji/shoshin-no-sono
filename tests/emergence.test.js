import { describe, it, expect } from 'vitest';
import { createIndexer } from '../src/indexer.js';
import {
  buildEmergenceTimeline,
  emergencePlan,
  scaleFn,
  finalStep,
  CORPUS_FLOOR,
} from '../src/emergence.js';
import { computeField } from '../src/cartographer.js';

/**
 * A fixture catalog exercising every shape of the timeline: the archived floor,
 * same-day rises, a renamed work that rises early and pulses late at an ordinal
 * slot between other rises, and two writing towns (one pair same-day). Only the
 * fields emergence + the Indexer read are populated.
 * @type {any}
 */
const data = {
  work_groups: [],
  theme_vocabulary: {},
  works: [
    // floor — archived, never rises
    { id: 'old', group: 'archived', status: 'archived', importance: 2, conceived: '2022-11-04', themes: [], media: [], sort_order_within_group: 0, relationships: [] },
    // peaks
    { id: 'genesis', group: 'methodology', status: 'shipped', importance: 10, conceived: '2025-04-01', themes: [], media: [], sort_order_within_group: 0, relationships: [] },
    // a renamed work — conceived early, named later (the pulse)
    { id: 'renamed-a', group: 'infrastructure', status: 'shipped', importance: 3, conceived: '2025-08-01', named: '2026-03-21', themes: [], media: [], sort_order_within_group: 0, relationships: [] },
    { id: 'renamed-b', group: 'infrastructure', status: 'shipped', importance: 3, conceived: '2025-08-01', named: '2026-03-21', themes: [], media: [], sort_order_within_group: 0, relationships: [] },
    // same-day rises
    { id: 'twin-1', group: 'methodology', status: 'shipped', importance: 9, conceived: '2025-12-12', themes: [], media: [], sort_order_within_group: 0, relationships: [] },
    { id: 'twin-2', group: 'production-systems', status: 'shipped', importance: 8, conceived: '2025-12-12', themes: [], media: [], sort_order_within_group: 0, relationships: [] },
    // a rise that brackets the pulse date on the high side
    { id: 'mid', group: 'methodology', status: 'shipped', importance: 6, conceived: '2026-03-15', themes: [], media: [], sort_order_within_group: 0, relationships: [] },
    { id: 'late', group: 'methodology', status: 'shipped', importance: 6, conceived: '2026-04-09', themes: [], media: [], sort_order_within_group: 0, relationships: [] },
    // writing towns — one pair same-day
    { id: 'town-early', name: 'Early', group: 'writing', status: 'published', importance: 5, conceived: '2026-03-03', themes: [], media: [], sort_order_within_group: 0, relationships: [] },
    { id: 'town-x', name: 'X', group: 'writing', status: 'published', importance: 5, conceived: '2026-04-15', themes: [], media: [], sort_order_within_group: 0, relationships: [] },
    { id: 'town-y', name: 'Y', group: 'writing', status: 'published', importance: 5, conceived: '2026-04-15', themes: [], media: [], sort_order_within_group: 0, relationships: [] },
  ],
};

const indexer = createIndexer(data);

describe('buildEmergenceTimeline — floor and corpus constant', () => {
  it('puts the archived work in the floor, never in a beat', () => {
    const t = buildEmergenceTimeline(indexer);
    expect(t.floorIds).toEqual(['old']);
    const allIds = [...t.world, ...t.writing].flatMap((b) => b.ids);
    expect(allIds).not.toContain('old');
  });

  it('carries the injected 2025-11-11 corpus floor, not read from data', () => {
    const t = buildEmergenceTimeline(indexer);
    expect(t.corpusFloor).toEqual(CORPUS_FLOOR);
    expect(t.corpusFloor.date).toBe('2025-11-11');
  });
});

describe('buildEmergenceTimeline — world partition (rise + pulse)', () => {
  const t = buildEmergenceTimeline(indexer);

  it('orders rises by conceived date', () => {
    const rises = t.world.filter((b) => b.kind === 'rise');
    expect(rises.map((b) => b.date)).toEqual([
      '2025-04-01',
      '2025-08-01',
      '2025-12-12',
      '2026-03-15',
      '2026-04-09',
    ]);
  });

  it('collapses same-day conceptions into one rise beat', () => {
    const twins = t.world.find((b) => b.date === '2025-12-12');
    expect(twins?.kind).toBe('rise');
    expect(twins?.ids).toEqual(['twin-1', 'twin-2']);
    const pair = t.world.find((b) => b.kind === 'rise' && b.date === '2025-08-01');
    expect(pair?.ids).toEqual(['renamed-a', 'renamed-b']);
  });

  it('merges the pulse into the world at its named-date ordinal slot', () => {
    // 2026-03-21 falls between mid (2026-03-15) and late (2026-04-09)
    const kinds = t.world.map((b) => `${b.kind}@${b.date}`);
    const pulseAt = kinds.indexOf('pulse@2026-03-21');
    const midAt = kinds.indexOf('rise@2026-03-15');
    const lateAt = kinds.indexOf('rise@2026-04-09');
    expect(midAt).toBeLessThan(pulseAt);
    expect(pulseAt).toBeLessThan(lateAt);
    const pulse = t.world[pulseAt];
    expect(pulse.ids).toEqual(['renamed-a', 'renamed-b']);
  });

  it('indexes world beats from 0, contiguously', () => {
    expect(t.world.map((b) => b.index)).toEqual(t.world.map((_, i) => i));
  });
});

describe('buildEmergenceTimeline — writing partition', () => {
  const t = buildEmergenceTimeline(indexer);

  it('is all arrive beats, after the world, in date order', () => {
    expect(t.writing.every((b) => b.kind === 'arrive')).toBe(true);
    expect(t.writing.map((b) => b.date)).toEqual(['2026-03-03', '2026-04-15']);
    expect(t.writing[0].index).toBe(t.world.length);
  });

  it('collapses a same-day town pair into one arrive beat', () => {
    const shared = t.writing.find((b) => b.date === '2026-04-15');
    expect(shared?.ids).toEqual(['town-x', 'town-y']);
  });
});

describe('emergencePlan — cumulative reveal and the held seam', () => {
  const t = buildEmergenceTimeline(indexer);
  const steps = emergencePlan(t);

  it('seeds the floor into peakScale from the very first step', () => {
    expect(steps[0].peakScale.has('old')).toBe(true);
  });

  it('accumulates risen peaks and leaves pulses non-additive', () => {
    const pulse = steps.find((s) => s.kind === 'pulse');
    const riseBefore = steps.find((s) => s.kind === 'rise' && s.date === '2026-03-15');
    // the pulsed peaks are already in scale from their 2025-08 rise
    expect(pulse?.peakScale.has('renamed-a')).toBe(true);
    // a pulse adds no new peak — same scale size as the rise just before it
    expect(pulse?.peakScale.size).toBe(riseBefore?.peakScale.size);
    expect(pulse?.ids).toEqual(['renamed-a', 'renamed-b']);
  });

  it('inserts exactly one hold step between world and writing', () => {
    const holds = steps.filter((s) => s.kind === 'hold');
    expect(holds.length).toBe(1);
    const holdAt = steps.findIndex((s) => s.kind === 'hold');
    const firstArrive = steps.findIndex((s) => s.kind === 'arrive');
    const lastWorld = steps.map((s) => s.kind).lastIndexOf('rise');
    expect(lastWorld).toBeLessThan(holdAt);
    expect(holdAt).toBeLessThan(firstArrive);
    // the held seam carries the full risen world and no town yet
    expect(steps[holdAt].towns.size).toBe(0);
    expect(steps[holdAt].ids).toEqual([]);
  });

  it('reveals towns cumulatively after the hold', () => {
    const arrives = steps.filter((s) => s.kind === 'arrive');
    expect([...arrives[0].towns]).toEqual(['town-early']);
    expect([...arrives[1].towns].sort()).toEqual(['town-early', 'town-x', 'town-y']);
  });

  it('reaches a final step that is every peak and every town', () => {
    const last = finalStep(steps);
    if (!last) throw new Error('expected a final step');
    const peakIds = data.works
      .filter((/** @type {any} */ w) => w.group !== 'writing')
      .map((/** @type {any} */ w) => w.id);
    const townIds = data.works
      .filter((/** @type {any} */ w) => w.group === 'writing')
      .map((/** @type {any} */ w) => w.id);
    expect([...last.peakScale].sort()).toEqual([...peakIds].sort());
    expect([...last.towns].sort()).toEqual([...townIds].sort());
  });
});

describe('scaleFn — the computeField bridge', () => {
  const t = buildEmergenceTimeline(indexer);
  const steps = emergencePlan(t);

  it('returns 1 for risen-or-floor and 0 for not-yet-risen', () => {
    const first = scaleFn(steps[0]);
    expect(first('old')).toBe(1); // floor
    expect(first('genesis')).toBe(1); // risen on step 0
    expect(first('late')).toBe(0); // not yet
  });

  it('returns 1 for every peak at the final step', () => {
    const last = finalStep(steps);
    if (!last) throw new Error('expected a final step');
    const fn = scaleFn(last);
    for (const w of data.works.filter((/** @type {any} */ x) => x.group !== 'writing')) {
      expect(fn(w.id)).toBe(1);
    }
  });
});

describe('the snap target — final step renders the static map exactly', () => {
  const t = buildEmergenceTimeline(indexer);
  const steps = emergencePlan(t);
  const state = { themes: [], media: [], status: [] };

  it('computeField under the final step equals the unscaled static field', () => {
    const last = finalStep(steps);
    if (!last) throw new Error('expected a final step');
    const emerged = computeField(indexer, state, 7, { emergenceScale: scaleFn(last) });
    const stat = computeField(indexer, state, 7);
    expect(emerged).toEqual(stat);
  });
});

describe('emergencePlan — degenerate catalogs', () => {
  it('omits the hold step when there is no writing', () => {
    const peaksOnly = createIndexer(
      /** @type {any} */ ({
        work_groups: [],
        theme_vocabulary: {},
        works: [
          { id: 'p', group: 'methodology', status: 'shipped', importance: 5, conceived: '2025-01-01', themes: [], media: [], sort_order_within_group: 0, relationships: [] },
        ],
      }),
    );
    const steps = emergencePlan(buildEmergenceTimeline(peaksOnly));
    expect(steps.map((s) => s.kind)).toEqual(['rise']);
  });

  it('produces no steps and a null final for an empty catalog', () => {
    const blank = createIndexer({ work_groups: [], theme_vocabulary: {}, works: [] });
    const steps = emergencePlan(buildEmergenceTimeline(blank));
    expect(steps).toEqual([]);
    expect(finalStep(steps)).toBe(null);
  });
});
