import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import {
  normalizeRepo,
  mergeDeployments,
  mergeRelationships,
  mergeSharedWork,
  scaffoldWork,
  buildWorksNext,
  chicago,
} from '../scripts/build-works-next.mjs';
import { validateWorks } from '../scripts/validate-works.mjs';

/** @returns {any} a fresh parse of the real corpus — mutations stay test-local */
const real = () => JSON.parse(readFileSync(new URL('../works.json', import.meta.url), 'utf8'));

describe('normalizeRepo', () => {
  it('rewrites ssh remotes to public https URLs', () => {
    expect(normalizeRepo('git@github-no-kaji:sageframe-no-kaji/kiku.git')).toBe(
      'https://github.com/sageframe-no-kaji/kiku',
    );
  });

  it('strips .git from https URLs and passes clean URLs through', () => {
    expect(normalizeRepo('https://github.com/sageframe-no-kaji/keisaku.git')).toBe(
      'https://github.com/sageframe-no-kaji/keisaku',
    );
    expect(normalizeRepo('https://github.com/sageframe-no-kaji/hozo')).toBe(
      'https://github.com/sageframe-no-kaji/hozo',
    );
  });

  it('passes null through', () => {
    expect(normalizeRepo(null)).toBeNull();
    expect(normalizeRepo(undefined)).toBeNull();
  });
});

describe('mergeDeployments', () => {
  it('appends new URLs, dedupes existing ones, and drops URL-less entries', () => {
    const base = [{ label: 'Live', url: 'https://a.example' }];
    const incoming = [
      { label: 'Live again', url: 'https://a.example' },
      { label: 'PyPI package' }, // no url — a CTA needs somewhere to go
      { label: 'Repo', url: 'https://b.example' },
    ];
    expect(mergeDeployments(base, incoming)).toEqual([
      { label: 'Live', url: 'https://a.example' },
      { label: 'Repo', url: 'https://b.example' },
    ]);
  });

  it('tolerates missing lists and label-less entries', () => {
    expect(mergeDeployments(/** @type {any} */ (undefined), [{ url: 'https://c.example' }])).toEqual([
      { label: 'Link', url: 'https://c.example' },
    ]);
  });
});

describe('mergeRelationships', () => {
  const base = [
    { target: 'ho-system', type: 'validates', strength: null, articulated_in: null, note: 'old note' },
  ];

  it('refreshes note, articulated_in, and strength on an existing edge', () => {
    const merged = mergeRelationships(base, [
      { target: 'ho-system', type: 'validates', articulated_in: 'three-hours', note: 'new note' },
    ]);
    expect(merged).toEqual([
      {
        target: 'ho-system',
        type: 'validates',
        strength: null,
        articulated_in: 'three-hours',
        note: 'new note',
      },
    ]);
  });

  it('keeps existing values when the incoming edge is silent, and appends new edges normalized', () => {
    const merged = mergeRelationships(base, [
      { target: 'ho-system', type: 'validates' },
      { target: 'kanyo', type: 'documents', strength: 2 },
    ]);
    expect(merged[0].note).toBe('old note');
    expect(merged[1]).toEqual({
      target: 'kanyo',
      type: 'documents',
      strength: 2,
      articulated_in: null,
      note: null,
    });
  });

  it('tolerates missing lists on both sides', () => {
    expect(mergeRelationships(/** @type {any} */ (undefined), /** @type {any} */ (undefined))).toEqual([]);
  });
});

describe('mergeSharedWork', () => {
  /** @returns {any} a work-shaped fixture — tests mutate freely, so untyped by design */
  const local = () => ({
    id: 'w',
    media: ['software'],
    status: 'in-development',
    tags: ['local-tag'],
    repo: 'https://github.com/x/w',
    license: null,
    deployment: [{ label: 'Live', url: 'https://w.example' }],
    tech_stack: 'Python',
    last_updated: '2026-05-01',
    short_description: 'local short',
    substantive_description: ['local para'],
    relationships: [],
  });

  it('same view: derived freshness wins, editorial identity stays', () => {
    const merged = mergeSharedWork(local(), {
      id: 'w',
      media: ['software'],
      status: 'shipped',
      tags: ['pub-tag'],
      repo: 'git@github-no-kaji:x/w.git',
      license: 'MIT',
      deployment: [{ label: 'Repo', url: 'https://github.com/x/w' }],
      tech_stack: 'Python (typer)',
      last_updated: '2026-07-01',
      short_description: 'pub short',
      substantive_description: ['pub para'],
      relationships: [{ target: 'other', type: 'companion_to' }],
    });
    expect(merged.status).toBe('shipped');
    expect(merged.license).toBe('MIT');
    expect(merged.tech_stack).toBe('Python (typer)');
    expect(merged.last_updated).toBe('2026-07-01');
    expect(merged.tags).toEqual(['pub-tag']);
    expect(merged.short_description).toBe('pub short');
    expect(merged.substantive_description).toEqual(['pub para']);
    expect(merged.repo).toBe('https://github.com/x/w'); // local kept
    expect(merged.deployment).toHaveLength(2);
    expect(merged.relationships).toHaveLength(1);
  });

  it('same view: keeps local descriptions when the public record has no substantive form', () => {
    const merged = mergeSharedWork(local(), {
      id: 'w',
      media: ['software'],
      short_description: 'thin derived short',
      substantive_description: [],
    });
    expect(merged.short_description).toBe('local short');
    expect(merged.substantive_description).toEqual(['local para']);
  });

  it('same view: empty public tags do not clobber local tags, missing repo falls back normalized', () => {
    const l = local();
    l.repo = null;
    const merged = mergeSharedWork(l, {
      id: 'w',
      media: ['software'],
      tags: [],
      repo: 'git@github-no-kaji:x/w.git',
    });
    expect(merged.tags).toEqual(['local-tag']);
    expect(merged.repo).toBe('https://github.com/x/w');
  });

  it('same view: strips tech_stack from non-software media whatever the source says', () => {
    const l = local();
    l.media = ['methodology'];
    const merged = mergeSharedWork(l, { id: 'w', media: ['methodology'], tech_stack: 'Markdown' });
    expect(merged.tech_stack).toBeNull();
  });

  it('different view: only deployments and last_updated merge in', () => {
    const merged = mergeSharedWork(local(), {
      id: 'w',
      media: ['writing'],
      status: 'published',
      last_updated: '2026-07-09',
      deployment: [{ label: 'Essay', url: 'https://essay.example' }],
      short_description: 'the essay view',
    });
    expect(merged.status).toBe('in-development');
    expect(merged.short_description).toBe('local short');
    expect(merged.last_updated).toBe('2026-07-09');
    expect(merged.deployment.map((/** @type {any} */ d) => d.url)).toContain('https://essay.example');
  });

  it('takes the later last_updated regardless of side', () => {
    const merged = mergeSharedWork(local(), { id: 'w', media: ['software'], last_updated: '2026-04-01' });
    expect(merged.last_updated).toBe('2026-05-01');
    const l = local();
    /** @type {any} */ (l).last_updated = null; // exercise the missing-side branch
    expect(mergeSharedWork(l, { id: 'w', media: ['software'], last_updated: '2026-04-01' }).last_updated).toBe(
      '2026-04-01',
    );
  });
});

describe('scaffoldWork', () => {
  it('fills every schema field and synthesizes a repo CTA when public has no deployment', () => {
    const w = scaffoldWork({
      id: 'new-tool',
      name: 'New Tool',
      media: ['software'],
      status: 'in-development',
      repo: 'git@github-no-kaji:x/new-tool.git',
      created: '2026-06-01',
      outlet: 'Substack',
    });
    expect(w.deployment).toEqual([{ label: 'GitHub repo', url: 'https://github.com/x/new-tool' }]);
    expect(w.outlet).toBe('Substack — Constructive Interference'); // house style
    expect(w.last_updated).toBe('2026-06-01'); // falls back to created
    expect(w.images).toEqual({ preview: null, gallery: [] });
    expect(w.featured).toBe(false);
    expect(w.relationships).toEqual([]);
  });

  it('leaves deployment empty when there is neither deployment nor repo', () => {
    const w = scaffoldWork({ id: 'essay', name: 'Essay', media: ['writing'], created: '2026-06-01' });
    expect(w.deployment).toEqual([]);
    expect(w.repo).toBeNull();
    expect(w.outlet).toBeNull();
  });

  it('normalizes relationship shapes from the public record', () => {
    const w = scaffoldWork({
      id: 'a',
      name: 'A',
      media: ['software'],
      created: '2026-06-01',
      relationships: [{ target: 'b', type: 'companion_to' }],
    });
    expect(w.relationships).toEqual([
      { target: 'b', type: 'companion_to', strength: null, articulated_in: null, note: null },
    ]);
  });
});

describe('chicago em-dash style', () => {
  it('closes up spaced em dashes and leaves closed ones alone', () => {
    expect(chicago('the map — the territory')).toBe('the map—the territory');
    expect(chicago('already—closed')).toBe('already—closed');
    expect(chicago(null)).toBeNull();
  });

  it('applies to every prose surface of the built catalog, and not to labels', () => {
    const local = real();
    const { data } = buildWorksNext(
      local,
      { works: [] },
      {
        families: [
          {
            id: 'kanyo',
            name: 'Kanyō',
            closeness: 'bonded',
            peak_id: 'kanyo',
            parent: null,
            description: 'the pipeline — and its viewer',
            color: null,
          },
        ],
        patch: { kanyo: { family: 'kanyo', peak: 'peak' } },
      },
    );
    expect(data.families[0].description).toBe('the pipeline—and its viewer');
    const prose = data.works.flatMap((/** @type {any} */ w) => [
      w.hero ?? '',
      w.short_description ?? '',
      w.personal_stake ?? '',
      ...(w.substantive_description ?? []),
      ...(w.relationships ?? []).map((/** @type {any} */ r) => r.note ?? ''),
    ]);
    expect(prose.some((/** @type {string} */ s) => s.includes(' — '))).toBe(false);
    for (const g of data.work_groups) {
      expect(g.intro ?? '').not.toContain(' — ');
    }
    // outlet strings are vocabulary, not prose — untouched.
    const fc = data.works.find((/** @type {any} */ w) => w.id === 'falcon-cameras');
    expect(fc.outlet).toBe('Substack — Constructive Interference');
  });
});

describe('buildWorksNext', () => {
  /** A miniature public corpus exercising every path. @returns {any} */
  const miniPublic = () => ({
    works: [
      // same-view refresh of an existing local work
      {
        id: 'kanyo',
        media: ['software'],
        status: 'shipped',
        last_updated: '2026-07-09',
        substantive_description: ['fresh kanyo para'],
        short_description: 'fresh kanyo short',
        relationships: [
          {
            target: 'ho-system',
            type: 'validates',
            articulated_in: 'i-built-a-computer-vision-system',
            note: 'refreshed',
          },
        ],
      },
      // id-mapped work that already landed locally (skip path)
      {
        id: 'image-2-ppt-dev',
        name: 'PPTX Builder',
        media: ['software'],
        status: 'shipped',
        repo: 'git@github-no-kaji:x/pptx-builder.git',
        created: '2025-10-23',
        last_updated: '2026-07-09',
        short_description: 'converts',
        substantive_description: ['converts fully'],
      },
      // genuinely new work (injection path)
      {
        id: 'mini-new-tool',
        name: 'Mini New Tool',
        media: ['software'],
        status: 'in-development',
        repo: 'git@github-no-kaji:x/mini-new-tool.git',
        created: '2026-07-01',
        last_updated: '2026-07-10',
        short_description: 'a small tool',
        substantive_description: ['a small tool, fully'],
      },
    ],
  });

  /** @returns {any} */
  const miniOverlay = () => ({
    id_map: {
      'image-2-ppt-dev': 'pptx-builder',
      'i-built-a-computer-vision-system': 'falcon-cameras',
    },
    include: ['image-2-ppt-dev', 'mini-new-tool', 'kanyo', 'ghost-work'],
    patch: {
      kanyo: { family: 'kanyo', peak: 'peak' },
      'mini-new-tool': {
        importance: 2,
        group: 'production-systems',
        themes: ['sovereignty'],
        sort_order_within_group: 90,
        conceived: '2026-07-01',
      },
      'no-such-work': { importance: 1 },
    },
    new_works: [],
  });

  it('produces a valid catalog from the real corpus and a miniature public feed', () => {
    const { data, report } = buildWorksNext(real(), miniPublic(), miniOverlay());
    expect(validateWorks(data)).toEqual([]);
    expect(report).toContain('injected: mini-new-tool');
    expect(report).toContain('skip (already local): image-2-ppt-dev -> pptx-builder');
    expect(report).toContain('skip (already local): kanyo -> kanyo');
    expect(report).toContain('MISSING in public.json: ghost-work');
    expect(report).toContain('PATCH TARGET MISSING: no-such-work');
  });

  it('rewrites ids through the map, including articulated_in references', () => {
    const { data } = buildWorksNext(real(), miniPublic(), miniOverlay());
    const byId = new Map(data.works.map((/** @type {any} */ w) => [w.id, w]));
    const kanyo = /** @type {any} */ (byId.get('kanyo'));
    const edge = kanyo.relationships.find((/** @type {any} */ r) => r.type === 'validates');
    expect(edge.articulated_in).toBe('falcon-cameras');
    expect(edge.note).toBe('refreshed');
    expect(kanyo.substantive_description).toEqual(['fresh kanyo para']);
    expect(kanyo.family).toBe('kanyo'); // patch applied after merge
    expect(byId.has('pptx-builder')).toBe(true);
    expect(byId.has('image-2-ppt-dev')).toBe(false);
  });

  it('prefers an overlay families block, falls back to the local one, and stamps document.last_updated', () => {
    const withOverlayBlock = miniOverlay();
    withOverlayBlock.families = [
      { id: 'kanyo', name: 'Kanyō', closeness: 'bonded', peak_id: 'kanyo', parent: null, description: null, color: null },
    ];
    // Overlay block wins when present — works referencing other families go dangling, by design.
    const { data: overlaid } = buildWorksNext(real(), { works: [] }, withOverlayBlock);
    expect(overlaid.families).toHaveLength(1);

    // No overlay block: the local corpus's own families stand.
    const { data } = buildWorksNext(real(), miniPublic(), miniOverlay());
    expect(data.families).toHaveLength(real().families.length);
    expect(data.document.last_updated).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it('appends overlay-authored new works verbatim', () => {
    const overlay = miniOverlay();
    overlay.new_works = [{ ...real().works[0], id: 'authored-work' }];
    const { data, report } = buildWorksNext(real(), miniPublic(), overlay);
    expect(report).toContain('authored: authored-work');
    expect(data.works.some((/** @type {any} */ w) => w.id === 'authored-work')).toBe(true);
  });

  it('tolerates a public feed and overlay with nothing in them', () => {
    const { data } = buildWorksNext(real(), { works: [] }, {});
    expect(validateWorks(data)).toEqual([]);
    expect(data.works).toHaveLength(real().works.length);
    expect(data.families).toHaveLength(real().families.length);
  });
});

describe('buildWorksNext against the real overlay', () => {
  it('the committed overlay is internally consistent with the real corpus', () => {
    /** @type {any} */
    const overlay = JSON.parse(
      readFileSync(new URL('../metadata/corpus-overlay.json', import.meta.url), 'utf8'),
    );
    // Patches on existing works must target real ids or overlay-introduced ids.
    const knownIds = new Set([
      ...real().works.map((/** @type {any} */ w) => w.id),
      ...overlay.include.map((/** @type {string} */ id) => overlay.id_map[id] ?? id),
      ...overlay.new_works.map((/** @type {any} */ w) => w.id),
    ]);
    for (const id of Object.keys(overlay.patch)) {
      expect(knownIds, `patch target ${id}`).toContain(id);
    }
    // Family references in patches and new works must exist in the overlay block.
    const familyIds = new Set(overlay.families.map((/** @type {any} */ f) => f.id));
    for (const [id, patch] of Object.entries(overlay.patch)) {
      const family = /** @type {any} */ (patch).family;
      if (family != null) expect(familyIds, `family of ${id}`).toContain(family);
    }
    for (const w of overlay.new_works) {
      if (w.family != null) expect(familyIds, `family of ${w.id}`).toContain(w.family);
    }
  });
});
