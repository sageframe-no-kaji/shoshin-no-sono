/**
 * The ho-07.2 "Done means", executable against the real corpus: the same beats
 * the practitioner watches on the served page, asserted here. Order is firm even
 * where dates are provisional (ho-07.1) — the emergence reads order, not spacing.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { createIndexer } from '../src/indexer.js';
import { buildEmergenceTimeline, emergencePlan, finalStep } from '../src/emergence.js';

const data = JSON.parse(readFileSync(new URL('../works.json', import.meta.url), 'utf8'));
const idx = createIndexer(data);
const timeline = buildEmergenceTimeline(idx);

describe('emergence over the real corpus', () => {
  it('holds the five archived works as the pre-history floor', () => {
    expect(timeline.floorIds).toEqual([
      'aspirational-intelligence',
      'a-talk-given-to-the-honors-program-students-of-eureka-college-2010',
      'harvard-gsd-walking-the-rhizome-2002',
      'personal-statement-for-fulbright-application-2003',
      'thresholds-journal-of-visual-culture-vol-26-2002',
    ]);
  });

  it('opens the world on sageframe and runs in conceived order', () => {
    expect(timeline.world[0].kind).toBe('rise');
    expect(timeline.world[0].ids).toEqual(['sageframe']);
    const dates = timeline.world.map((b) => b.date);
    expect([...dates]).toEqual([...dates].sort()); // non-decreasing
  });

  it('rises forteller + palana together at ~2025-08 and pulses them at 2026-03-21', () => {
    const rise = timeline.world.find((b) => b.kind === 'rise' && b.date === '2025-08-01');
    expect(rise?.ids.sort()).toEqual(['forteller', 'palana']);
    const pulse = timeline.world.find((b) => b.kind === 'pulse');
    expect(pulse?.date).toBe('2026-03-21');
    expect(pulse?.ids.sort()).toEqual(['forteller', 'palana']);
    // the pulse sits at its ordinal slot — after reading-instrument, before glassroom
    const order = timeline.world.map((b) => `${b.kind}:${b.ids.join('+')}`);
    const ri = order.indexOf('rise:reading-instrument');
    const pi = order.findIndex((s) => s.startsWith('pulse:'));
    const gl = order.indexOf('rise:glassroom');
    expect(ri).toBeLessThan(pi);
    expect(pi).toBeLessThan(gl);
  });

  it('shares a beat for same-day conceptions', () => {
    const dec12 = timeline.world.find((b) => b.kind === 'rise' && b.date === '2025-12-12');
    expect(dec12?.ids.sort()).toEqual(['ho-system', 'kanyo']);
    const mar4 = timeline.world.find((b) => b.kind === 'rise' && b.date === '2026-03-04');
    expect(mar4?.ids.sort()).toEqual(['shodo', 'sutra']);
  });

  it('arrives every writing-group work as a town after the world, the 2026-04-15 pair sharing a beat', () => {
    const townIds = timeline.writing.flatMap((b) => b.ids);
    const writingGroup = data.works
      .filter((/** @type {any} */ w) => w.group === 'writing')
      .map((/** @type {any} */ w) => w.id);
    expect(townIds.sort()).toEqual(writingGroup.sort());
    expect(timeline.writing[0].index).toBe(timeline.world.length);
    const pair = timeline.writing.find((b) => b.date === '2026-04-15');
    expect(pair?.ids.sort()).toEqual(['judgment-at-scale', 'the-empty-container']);
  });

  it('ends fully emerged — every catalog work present', () => {
    const last = finalStep(emergencePlan(timeline));
    if (!last) throw new Error('expected a final step');
    const revealed = new Set([...last.peakScale, ...last.towns]);
    for (const w of data.works) expect(revealed.has(w.id)).toBe(true);
  });
});
