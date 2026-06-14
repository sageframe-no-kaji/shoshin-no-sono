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
