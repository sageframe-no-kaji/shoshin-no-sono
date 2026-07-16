import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { validateWorks } from '../scripts/validate-works.mjs';

/** @returns {any} a fresh parse of the real corpus — mutations stay test-local */
const real = () => JSON.parse(readFileSync(new URL('../works.json', import.meta.url), 'utf8'));

/**
 * @param {(d: any) => void} mutate
 * @returns {string[]}
 */
const corrupt = (mutate) => {
  const d = real();
  mutate(d);
  return validateWorks(d);
};

describe('validateWorks against the real corpus', () => {
  it('passes with zero errors', () => {
    expect(validateWorks(real())).toEqual([]);
  });
});

describe('validateWorks catches corruption', () => {
  it('dangling relationship target', () => {
    const errors = corrupt((d) =>
      d.works[0].relationships.push({
        target: 'nonexistent-work',
        type: 'validates',
        strength: null,
        articulated_in: null,
        note: null,
      }),
    );
    expect(errors.join('\n')).toContain('dangling target');
  });

  it('strength on a non-documents edge', () => {
    const errors = corrupt((d) => {
      const dandori = d.works.find((/** @type {any} */ w) => w.id === 'dandori');
      dandori.relationships[0].strength = 2;
    });
    expect(errors.join('\n')).toContain('strength must be null');
  });

  it('documents edge with invalid strength', () => {
    const errors = corrupt((d) => {
      const th = d.works.find((/** @type {any} */ w) => w.id === 'three-hours');
      th.relationships[0].strength = 5;
    });
    expect(errors.join('\n')).toContain('requires strength 1, 2, or 3');
  });

  it('unknown relationship type', () => {
    const errors = corrupt((d) => {
      const dandori = d.works.find((/** @type {any} */ w) => w.id === 'dandori');
      dandori.relationships[0].type = 'inspired_by';
    });
    expect(errors.join('\n')).toContain('unknown relationship type');
  });

  it('unknown status', () => {
    const errors = corrupt((d) => (d.works[0].status = 'demonstrating'));
    expect(errors.join('\n')).toContain('unknown status');
  });

  it('more than three themes', () => {
    const errors = corrupt((d) => (d.works[0].themes = ['craft', 'agency', 'attention', 'knowledge']));
    expect(errors.join('\n')).toContain('themes must be 1-3');
  });

  it('theme outside the vocabulary', () => {
    const errors = corrupt((d) => (d.works[0].themes = ['humor']));
    expect(errors.join('\n')).toContain('themes must be 1-3');
  });

  it('unknown group', () => {
    const errors = corrupt((d) => (d.works[0].group = 'mythology'));
    expect(errors.join('\n')).toContain('unknown group');
  });

  it('duplicate ids', () => {
    const errors = corrupt((d) => (d.works[1].id = d.works[0].id));
    expect(errors.join('\n')).toContain('duplicate id');
  });

  it('non-contiguous group numbers', () => {
    const errors = corrupt((d) => (d.work_groups[0].number = 99));
    expect(errors.join('\n')).toContain('not contiguous');
  });

  it('non-slug id', () => {
    const errors = corrupt((d) => (d.works[0].id = 'Bad Slug'));
    expect(errors.join('\n')).toContain('kebab-case slug');
  });

  it('missing required field', () => {
    const errors = corrupt((d) => delete d.works[0].hero);
    expect(errors.join('\n')).toContain('missing field hero');
  });

  it('importance out of range', () => {
    const errors = corrupt((d) => (d.works[0].importance = 0));
    expect(errors.join('\n')).toContain('importance must be an integer 1-10');
  });

  it('empty media', () => {
    const errors = corrupt((d) => (d.works[0].media = []));
    expect(errors.join('\n')).toContain('media must be a non-empty subset');
  });

  it('writing work without publication_date', () => {
    const errors = corrupt((d) => {
      const fc = d.works.find((/** @type {any} */ w) => w.id === 'falcon-cameras');
      fc.publication_date = null;
    });
    expect(errors.join('\n')).toContain('requires publication_date');
  });

  it('tech_stack on a non-software, non-website work', () => {
    const errors = corrupt((d) => {
      const dandori = d.works.find((/** @type {any} */ w) => w.id === 'dandori');
      dandori.tech_stack = 'Markdown';
    });
    expect(errors.join('\n')).toContain('tech_stack populated');
  });

  it('articulated_in pointing at a non-writing work', () => {
    const errors = corrupt((d) => {
      const kanyo = d.works.find((/** @type {any} */ w) => w.id === 'kanyo');
      kanyo.relationships[0].articulated_in = 'hozo';
    });
    expect(errors.join('\n')).toContain('is not a writing work');
  });

  it('dangling articulated_in', () => {
    const errors = corrupt((d) => {
      const kanyo = d.works.find((/** @type {any} */ w) => w.id === 'kanyo');
      kanyo.relationships[0].articulated_in = 'ghost-essay';
    });
    expect(errors.join('\n')).toContain('dangling articulated_in');
  });

  it('malformed date', () => {
    const errors = corrupt((d) => (d.works[0].created = 'May 2026'));
    expect(errors.join('\n')).toContain('not an ISO date');
  });

  it('non-integer sort order', () => {
    const errors = corrupt((d) => (d.works[0].sort_order_within_group = 'first'));
    expect(errors.join('\n')).toContain('sort_order_within_group');
  });

  it('media that is not an array', () => {
    const errors = corrupt((d) => (d.works[0].media = 'software'));
    expect(errors.join('\n')).toContain('media must be a non-empty subset');
  });

  it('themes that is not an array', () => {
    const errors = corrupt((d) => (d.works[0].themes = 'craft'));
    expect(errors.join('\n')).toContain('themes must be 1-3');
  });
});

describe('validateWorks — conceived / named (ho-07.1)', () => {
  it('flags a non-archived work missing conceived', () => {
    const errors = corrupt((d) => delete d.works.find((/** @type {any} */ w) => w.id === 'ho-system').conceived);
    expect(errors.join('\n')).toContain('conceived is required');
  });

  it('allows an archived work to omit conceived', () => {
    const errors = corrupt((d) =>
      delete d.works.find((/** @type {any} */ w) => w.id === 'aspirational-intelligence').conceived,
    );
    expect(errors).toEqual([]);
  });

  it('flags a malformed conceived date on a live work', () => {
    const errors = corrupt(
      (d) => (d.works.find((/** @type {any} */ w) => w.id === 'ho-system').conceived = 'April 2025'),
    );
    expect(errors.join('\n')).toContain('conceived is required and must be an ISO date');
  });

  it('flags a malformed conceived date even on an archived work', () => {
    const errors = corrupt(
      (d) =>
        (d.works.find((/** @type {any} */ w) => w.id === 'aspirational-intelligence').conceived =
          'late 2022'),
    );
    expect(errors.join('\n')).toContain('conceived is not an ISO date');
  });

  it('flags a malformed named date', () => {
    const errors = corrupt(
      (d) => (d.works.find((/** @type {any} */ w) => w.id === 'forteller').named = '2026/03/21'),
    );
    expect(errors.join('\n')).toContain('named is not an ISO date');
  });
});

describe('validateWorks — ordinal (schema v5.2)', () => {
  it('accepts a valid ordinal and a shared (tie) ordinal', () => {
    const errors = corrupt((d) => {
      d.works.find((/** @type {any} */ w) => w.id === 'palana').ordinal = 5;
      d.works.find((/** @type {any} */ w) => w.id === 'forteller').ordinal = 5; // ties share a beat
    });
    expect(errors).toEqual([]);
  });

  it('rejects a non-integer or below-one ordinal', () => {
    const errors = corrupt((d) => {
      d.works.find((/** @type {any} */ w) => w.id === 'palana').ordinal = 1.5;
      d.works.find((/** @type {any} */ w) => w.id === 'forteller').ordinal = 0;
    });
    expect(errors.filter((e) => e.includes('ordinal must be an integer >= 1'))).toHaveLength(2);
  });
});

describe('validateWorks on degenerate documents', () => {
  it('tolerates an empty document without throwing', () => {
    expect(validateWorks({})).toEqual([]);
    expect(validateWorks(null)).toEqual([]);
  });

  it('reports a work that is an empty object', () => {
    const d = { theme_vocabulary: { craft: 'x' }, work_groups: [{ id: 'g', number: 1 }], works: [{}] };
    const errors = validateWorks(d);
    const text = errors.join('\n');
    expect(text).toContain('missing field id');
    expect(text).toContain('<missing id>: id is not a kebab-case slug');
  });
});

describe('validateWorks — families (schema v5; the corpus carries real families since 2026-07-16)', () => {
  /** A well-formed synthetic family appended to the real corpus. @param {any} d */
  const addFamily = (d) => {
    d.families.push({ id: 'test-range', name: 'Test Range', closeness: 'suite', peak_id: 'forteller' });
  };

  it('the real corpus family block passes as-is, and a well-formed addition passes', () => {
    expect(corrupt(() => {})).toEqual([]);
    expect(corrupt(addFamily)).toEqual([]);
  });

  it('a well-formed family membership passes (family + peak role)', () => {
    const errors = corrupt((d) => {
      addFamily(d);
      const f = d.works.find((/** @type {any} */ w) => w.id === 'forteller');
      f.family = 'test-range';
      f.peak = 'peak';
      const p = d.works.find((/** @type {any} */ w) => w.id === 'palana');
      p.family = 'test-range';
      p.peak = 'sub-peak';
    });
    expect(errors).toEqual([]);
  });

  it('rejects a non-slug family id', () => {
    const errors = corrupt((d) => {
      d.families.push({ id: 'Test Range', name: 'Test Range', closeness: 'suite', peak_id: null });
    });
    expect(errors.join('\n')).toContain('id is not a kebab-case slug');
  });

  it('rejects a duplicate family id', () => {
    const errors = corrupt((d) => {
      d.families.push(
        { id: 'test-range', name: 'A', closeness: 'suite', peak_id: null },
        { id: 'test-range', name: 'B', closeness: 'kindred', peak_id: null },
      );
    });
    expect(errors.join('\n')).toContain('duplicate family id');
  });

  it('rejects a missing family name and an unknown closeness', () => {
    const errors = corrupt((d) => {
      d.families.push({ id: 'test-range', name: '', closeness: 'entangled', peak_id: null });
    });
    const text = errors.join('\n');
    expect(text).toContain('name is required');
    expect(text).toContain('closeness must be bonded | shared-code | suite | kindred');
  });

  it('rejects a dangling peak_id', () => {
    const errors = corrupt((d) => {
      d.families.push({ id: 'test-range', name: 'Test Range', closeness: 'kindred', peak_id: 'ghost-work' });
    });
    expect(errors.join('\n')).toContain('dangling peak_id ghost-work');
  });

  it('rejects a work referencing an unknown family', () => {
    const errors = corrupt((d) => {
      d.works[0].family = 'no-such-family';
    });
    expect(errors.join('\n')).toContain('unknown family no-such-family');
  });

  it('rejects an invalid peak role, and a peak role without a family', () => {
    const errors = corrupt((d) => {
      const f = d.works.find((/** @type {any} */ w) => w.id === 'forteller');
      f.peak = 'summit'; // not in the vocabulary
      const s = d.works.find((/** @type {any} */ w) => w.id === 'satori'); // rangeless work
      s.peak = 'peak';
    });
    const text = errors.join('\n');
    expect(text).toContain("peak must be 'peak' | 'sub-peak' | null");
    expect(text).toContain('peak is set but family is null');
  });
});

describe('validateWorks — nested ranges and sibling anchors (schema v5.1)', () => {
  /** A synthetic parent range holding two children, mirroring the Kṣetra-Ops shape. @param {any} d */
  const addNestedFamilies = (d) => {
    d.families.push(
      {
        id: 'test-parent',
        name: 'Test Parent',
        closeness: 'suite',
        peak_id: 'palana',
        parent: null,
        description: 'An honest system for user responsibility and power over your own machines.',
        color: '#8a6d3b',
      },
      { id: 'test-child-a', name: 'Child A', closeness: 'suite', peak_id: 'palana', parent: 'test-parent' },
      { id: 'test-child-b', name: 'Child B', closeness: 'suite', peak_id: 'hozo', parent: 'test-parent' },
    );
  };

  it('a well-formed nested range block passes, description and color included', () => {
    expect(corrupt(addNestedFamilies)).toEqual([]);
  });

  it('rejects a dangling parent', () => {
    const errors = corrupt((d) => {
      d.families.push({ id: 'test-child-a', name: 'Child A', closeness: 'suite', peak_id: null, parent: 'ghost-range' });
    });
    expect(errors.join('\n')).toContain('dangling parent ghost-range');
  });

  it('rejects a self-referencing parent', () => {
    const errors = corrupt((d) => {
      d.families.push({ id: 'test-child-a', name: 'Child A', closeness: 'suite', peak_id: null, parent: 'test-child-a' });
    });
    expect(errors.join('\n')).toContain('parent references itself');
  });

  it('rejects nesting deeper than one level', () => {
    const errors = corrupt((d) => {
      addNestedFamilies(d);
      d.families.push({ id: 'deeper', name: 'Deeper', closeness: 'suite', peak_id: null, parent: 'test-child-a' });
    });
    expect(errors.join('\n')).toContain('is itself a child range — one level deep only');
  });

  it('rejects a non-string description and a malformed color', () => {
    const errors = corrupt((d) => {
      d.families.push(
        { id: 'test-bad', name: 'Bad', closeness: 'suite', peak_id: null, description: 42, color: 'chartreuse' },
      );
    });
    const text = errors.join('\n');
    expect(text).toContain('description must be a string or null');
    expect(text).toContain('color must be a #rrggbb hex string or null');
  });

  /** The Kekkai shape rebuilt synthetically: peer summits, instruments anchored to one. @param {any} d */
  const addKekkai = (d) => {
    d.families.push({ id: 'test-cluster', name: 'Test Cluster', closeness: 'suite', peak_id: null });
    const sutra = d.works.find((/** @type {any} */ w) => w.id === 'sutra');
    sutra.family = 'test-cluster';
    sutra.peak = 'peak';
    const kiku = d.works.find((/** @type {any} */ w) => w.id === 'kiku');
    kiku.family = 'test-cluster';
    kiku.peak = 'sub-peak';
    kiku.peak_of = 'sutra';
  };

  it('a sub-peak anchored to a sibling peak passes', () => {
    expect(corrupt(addKekkai)).toEqual([]);
  });

  it('rejects peak_of on a work that is not a sub-peak', () => {
    const errors = corrupt((d) => {
      addKekkai(d);
      const kiku = d.works.find((/** @type {any} */ w) => w.id === 'kiku');
      kiku.peak = 'peak';
    });
    expect(errors.join('\n')).toContain("peak_of is set but peak is not 'sub-peak'");
  });

  it('rejects a dangling peak_of', () => {
    const errors = corrupt((d) => {
      addKekkai(d);
      const kiku = d.works.find((/** @type {any} */ w) => w.id === 'kiku');
      kiku.peak_of = 'ghost-summit';
    });
    expect(errors.join('\n')).toContain('dangling peak_of ghost-summit');
  });

  it('rejects a self-referencing peak_of', () => {
    const errors = corrupt((d) => {
      addKekkai(d);
      const kiku = d.works.find((/** @type {any} */ w) => w.id === 'kiku');
      kiku.peak_of = 'kiku';
    });
    expect(errors.join('\n')).toContain('peak_of references itself');
  });

  it('rejects a peak_of anchor outside the family', () => {
    const errors = corrupt((d) => {
      addKekkai(d);
      const kiku = d.works.find((/** @type {any} */ w) => w.id === 'kiku');
      kiku.peak_of = 'hozo'; // real work, not in kekkai
    });
    expect(errors.join('\n')).toContain('peak_of hozo is not in the same family');
  });
});
