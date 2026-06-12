/**
 * The ho-02 done-means, executable: the same queries the browser console
 * verifies on the served page, asserted against the real corpus.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { createIndexer } from '../src/indexer.js';

const data = JSON.parse(readFileSync(new URL('../works.json', import.meta.url), 'utf8'));
const idx = createIndexer(data);

describe('the Indexer against the real corpus', () => {
  it('getWork("kanyo") returns the work', () => {
    const kanyo = idx.getWork('kanyo');
    expect(kanyo?.name).toBe('Kanyō');
    expect(kanyo?.native_script).toBe('観鷹');
  });

  it('getIncoming("ho-system") carries the overview minimum and the full set', () => {
    const sources = idx.getIncoming('ho-system').map((e) => e.source);
    for (const required of ['kanyo', 'hozo', 'kinhin']) {
      expect(sources).toContain(required);
    }
    expect(sources.sort()).toEqual(
      [
        'aspirational-intelligence',
        'dandori',
        'falcon-cameras',
        'hozo',
        'kanyo',
        'kinhin',
        'm4bookmaker',
        'three-hours',
      ].sort(),
    );
  });

  it('the satori⇄glassroom pair answers from both endpoints though declared once', () => {
    expect(idx.getOutgoing('satori', 'paired_with').map((e) => e.target)).toEqual(['glassroom']);
    expect(idx.getOutgoing('glassroom', 'paired_with').map((e) => e.target)).toEqual(['satori']);
    expect(idx.getOutgoing('glassroom', 'paired_with')[0].declaredOn).toBe('satori');
  });

  it('settlement weights: ln(1+5) for Three Hours, 0 for The Same Lever', () => {
    expect(idx.settlementWeight('three-hours')).toBeCloseTo(Math.log(1 + 5), 10);
    expect(idx.settlementWeight('the-same-lever')).toBe(0);
  });

  it('articulatesEdge resolves hozo —validates→ ho-system to "three-hours"', () => {
    expect(idx.articulatesEdge('hozo', 'ho-system', 'validates')).toBe('three-hours');
  });

  it('groups() returns ten groups in display order', () => {
    const groups = idx.groups();
    expect(groups).toHaveLength(10);
    expect(groups.map((g) => g.number)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
    expect(groups[3].id).toBe('writing');
  });

  it('worksByGroup("writing") returns the six essays in sort order', () => {
    expect(idx.worksByGroup('writing').map((w) => w.id)).toEqual([
      'falcon-cameras',
      'three-hours',
      'the-same-lever',
      'the-fourth-boundary',
      'the-empty-container',
      'judgment-at-scale',
    ]);
  });

  it('the aspirational-intelligence succession answers through the alias too', () => {
    expect(idx.getOutgoing('aspirational-intelligence', 'succeeded_by').map((e) => e.target)).toEqual(
      ['ho-system'],
    );
    expect(idx.getOutgoing('ho-system', 'succeeds').map((e) => e.target)).toEqual([
      'aspirational-intelligence',
    ]);
  });

  it('every work answers settlementWeight without throwing', () => {
    for (const w of idx.works()) {
      expect(Number.isFinite(idx.settlementWeight(w.id))).toBe(true);
    }
  });
});
