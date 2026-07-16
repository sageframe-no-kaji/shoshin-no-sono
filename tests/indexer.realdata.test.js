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
        'bad-vibes',
        'dandori',
        'falcon-cameras',
        'ho-actually',
        'hozo',
        'kanyo',
        'kinhin',
        'm4bookmaker',
        'prompting-not-programming',
        'three-hours',
        'walking-without-google-maps',
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

  it('worksByGroup("writing") returns the twenty-two writing works in sort order', () => {
    expect(idx.worksByGroup('writing').map((w) => w.id)).toEqual([
      'constructive-interference',
      'medium-outlet',
      'falcon-cameras',
      'three-hours',
      'the-same-lever',
      'the-fourth-boundary',
      'the-empty-container',
      'judgment-at-scale',
      'the-wrong-rand',
      'everybody-is-lying',
      'i-just-want-to-own-my-audiobooks',
      'a-condition-of-the-dash',
      'walking-without-google-maps',
      'the-bootstrapper-s-catch-22',
      'thinking-outside-the-skull',
      'prompting-not-programming',
      'bad-vibes',
      'your-machines-are-not-strangers',
      'everybody-is-making-out-with-ai-in-the-back-of-the-bus',
      'everybody-is-shipping-work-nobody-asked-for',
      'pink-teaming-how-the-page-reads',
      'pink-teaming-the-practice-of-reading',
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

  // ho-07.1 — emergence data: conceived/named, the three new works, the edelmore split.
  it('getWork("sageframe") returns the genesis work with conceived present', () => {
    const sf = idx.getWork('sageframe');
    expect(sf?.importance).toBe(10);
    expect(sf?.conceived).toBe('2025-04-01');
  });

  it('shodo and sutra carry their same-day conception', () => {
    expect(idx.getWork('shodo')?.conceived).toBe('2026-03-04');
    expect(idx.getWork('sutra')?.conceived).toBe('2026-03-04');
  });

  it('the shodo⇄sutra pair answers from both endpoints though declared once', () => {
    expect(idx.getOutgoing('sutra', 'paired_with').map((e) => e.target)).toEqual(['shodo']);
    expect(idx.getOutgoing('shodo', 'paired_with').map((e) => e.target)).toEqual(['sutra']);
    expect(idx.getOutgoing('shodo', 'paired_with')[0].declaredOn).toBe('sutra');
  });

  it('forteller carries conceived and the later named pulse', () => {
    const f = idx.getWork('forteller');
    expect(f?.conceived).toBe('2025-08-01');
    expect(f?.named).toBe('2026-03-21');
  });

  it('the edelmore split: diary and reader present, edelmore id retired', () => {
    expect(idx.getWork('edelmore')).toBeUndefined();
    expect(idx.getWork('edelmore-diary')?.conceived).toBe('2026-05-14');
    expect(idx.getOutgoing('edelmore-reader', 'descends_from').map((e) => e.target)).toEqual([
      'edelmore-diary',
    ]);
  });

  it('every non-archived work carries an ISO conceived date', () => {
    for (const w of idx.works()) {
      if (w.status === 'archived') continue;
      expect(w.conceived).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    }
  });
});
