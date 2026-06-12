import { describe, it, expect, vi, afterEach } from 'vitest';
import { createIndexer, loadWorks } from '../src/indexer.js';

/**
 * Minimal synthetic catalog exercising every normalization rule: a symmetric
 * pair (declared once), a companion edge, a `succeeds` declaration (canonical
 * conversion), documents edges at mixed strengths, a writing work with no
 * documents edges, and an articulated edge.
 *
 * Cast to any: fixture works carry only the fields the Indexer reads — padding
 * all 29 schema fields here would bury what each case tests. The real-data
 * suite below exercises fully-shaped entries.
 * @type {any}
 */
const fixture = {
  work_groups: [
    { id: 'tools', number: 2, name: 'Tools', intro: '' },
    { id: 'method', number: 1, name: 'Method', intro: '' },
  ],
  works: [
    {
      id: 'alpha',
      group: 'method',
      media: ['methodology'],
      themes: ['craft'],
      status: 'shipped',
      sort_order_within_group: 10,
      relationships: [],
    },
    {
      id: 'beta',
      group: 'tools',
      media: ['software'],
      themes: ['craft'],
      status: 'shipped',
      sort_order_within_group: 20,
      relationships: [
        { target: 'alpha', type: 'validates', strength: null, articulated_in: 'delta', note: null },
        { target: 'gamma', type: 'paired_with', strength: null, articulated_in: null, note: null },
      ],
    },
    {
      id: 'gamma',
      group: 'tools',
      media: ['software'],
      themes: ['agency'],
      status: 'in-development',
      sort_order_within_group: 10,
      relationships: [
        // gamma succeeds alpha ≡ alpha succeeded_by gamma
        { target: 'alpha', type: 'succeeds', strength: null, articulated_in: null, note: null },
      ],
    },
    {
      id: 'delta',
      group: 'method',
      media: ['writing'],
      themes: ['craft', 'agency'],
      status: 'published',
      sort_order_within_group: 20,
      relationships: [
        { target: 'beta', type: 'documents', strength: 3, articulated_in: null, note: null },
        { target: 'alpha', type: 'documents', strength: 2, articulated_in: null, note: null },
      ],
    },
    {
      id: 'epsilon',
      group: 'method',
      media: ['writing'],
      themes: ['agency'],
      status: 'published',
      sort_order_within_group: 30,
      relationships: [
        // optional fields deliberately omitted — exercises the ?? null normalization
        { target: 'beta', type: 'argues_for' },
      ],
    },
  ],
};

describe('createIndexer on the fixture', () => {
  const idx = createIndexer(fixture);

  it('getWork returns the work, or undefined for unknown ids', () => {
    expect(idx.getWork('alpha')?.id).toBe('alpha');
    expect(idx.getWork('nope')).toBeUndefined();
  });

  it('symmetric edges answer from both endpoints, in both directions', () => {
    expect(idx.getOutgoing('beta', 'paired_with').map((e) => e.target)).toEqual(['gamma']);
    expect(idx.getOutgoing('gamma', 'paired_with').map((e) => e.target)).toEqual(['beta']);
    expect(idx.getIncoming('beta', 'paired_with')).toHaveLength(1);
    expect(idx.getIncoming('gamma', 'paired_with')).toHaveLength(1);
    expect(idx.getOutgoing('gamma', 'paired_with')[0].declaredOn).toBe('beta');
  });

  it('succeeds declarations normalize to canonical succeeded_by', () => {
    const out = idx.getOutgoing('alpha', 'succeeded_by');
    expect(out).toHaveLength(1);
    expect(out[0].target).toBe('gamma');
    expect(out[0].declaredOn).toBe('gamma');
  });

  it('the succeeds alias answers consistently from both ends', () => {
    expect(idx.getOutgoing('gamma', 'succeeds').map((e) => e.target)).toEqual(['alpha']);
    expect(idx.getIncoming('alpha', 'succeeds').map((e) => e.source)).toEqual(['gamma']);
    expect(idx.getOutgoing('alpha', 'succeeds')).toEqual([]);
  });

  it('settlementWeight is ln(1+sum of documents strengths), 0 with no documents edges', () => {
    expect(idx.settlementWeight('delta')).toBeCloseTo(Math.log(1 + 5), 10);
    expect(idx.settlementWeight('epsilon')).toBe(0);
    expect(idx.settlementWeight('alpha')).toBe(0);
    expect(idx.settlementWeight('unknown')).toBe(0);
  });

  it('membership queries answer, and unknown keys return empty arrays', () => {
    expect(idx.worksByTheme('craft').map((w) => w.id)).toEqual(['alpha', 'beta', 'delta']);
    expect(idx.worksByMedia('writing').map((w) => w.id)).toEqual(['delta', 'epsilon']);
    expect(idx.worksByStatus('in-development').map((w) => w.id)).toEqual(['gamma']);
    expect(idx.worksByTheme('continuity')).toEqual([]);
    expect(idx.worksByGroup('nope')).toEqual([]);
  });

  it('groups are ordered by number; group members by sort order', () => {
    expect(idx.groups().map((g) => g.id)).toEqual(['method', 'tools']);
    expect(idx.worksByGroup('tools').map((w) => w.id)).toEqual(['gamma', 'beta']);
  });

  it('articulatesEdge resolves the articulating essay, null when absent', () => {
    expect(idx.articulatesEdge('beta', 'alpha', 'validates')).toBe('delta');
    expect(idx.articulatesEdge('delta', 'beta', 'documents')).toBeNull();
    expect(idx.articulatesEdge('alpha', 'beta', 'validates')).toBeNull();
  });

  it('getIncoming without a type filter returns everything pointing at a work', () => {
    // gamma's `succeeds alpha` normalizes to canonical alpha→gamma, so it is
    // OUTGOING from alpha — not in this list. Incoming: beta (validates), delta (documents).
    const sources = idx.getIncoming('alpha').map((e) => e.source);
    expect(sources.sort()).toEqual(['beta', 'delta']);
  });

  it('the API and its edges are frozen', () => {
    expect(Object.isFrozen(idx)).toBe(true);
    const edge = idx.getOutgoing('beta', 'validates')[0];
    expect(Object.isFrozen(edge)).toBe(true);
  });

  it('works() returns all entries', () => {
    expect(idx.works()).toHaveLength(5);
  });

  it('edge queries on unknown ids return empty arrays, through the alias too', () => {
    expect(idx.getIncoming('unknown')).toEqual([]);
    expect(idx.getOutgoing('unknown')).toEqual([]);
    expect(idx.getIncoming('unknown', 'succeeds')).toEqual([]);
    expect(idx.getOutgoing('unknown', 'succeeds')).toEqual([]);
  });

  it('omitted optional edge fields normalize to null', () => {
    const edge = idx.getOutgoing('epsilon', 'argues_for')[0];
    expect(edge.strength).toBeNull();
    expect(edge.articulated_in).toBeNull();
    expect(edge.note).toBeNull();
  });
});

describe('createIndexer integrity checks', () => {
  it('throws on a dangling relationship target, naming the edge', () => {
    /** @type {any} */
    const bad = {
      work_groups: [],
      works: [
        {
          id: 'a',
          group: 'g',
          media: ['software'],
          themes: ['craft'],
          status: 'shipped',
          sort_order_within_group: 10,
          relationships: [{ target: 'ghost', type: 'validates', strength: null }],
        },
      ],
    };
    expect(() => createIndexer(bad)).toThrowError(/dangling relationship target a -> ghost/);
  });

  it('throws on a dangling articulated_in', () => {
    /** @type {any} */
    const bad = {
      work_groups: [],
      works: [
        {
          id: 'a',
          group: 'g',
          media: ['software'],
          themes: ['craft'],
          status: 'shipped',
          sort_order_within_group: 10,
          relationships: [],
        },
        {
          id: 'b',
          group: 'g',
          media: ['software'],
          themes: ['craft'],
          status: 'shipped',
          sort_order_within_group: 20,
          relationships: [
            { target: 'a', type: 'validates', strength: null, articulated_in: 'ghost-essay' },
          ],
        },
      ],
    };
    expect(() => createIndexer(bad)).toThrowError(/dangling articulated_in b -> a: ghost-essay/);
  });
});

describe('loadWorks', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('fetches and parses the catalog', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({ ok: true, json: async () => ({ works: [] }) })),
    );
    const data = await loadWorks('/works.json');
    expect(data).toEqual({ works: [] });
  });

  it('throws on a non-ok response', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: false, status: 404 })));
    await expect(loadWorks('/missing.json')).rejects.toThrowError(/HTTP 404/);
  });
});
