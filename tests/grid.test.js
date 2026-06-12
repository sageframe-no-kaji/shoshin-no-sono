import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { createIndexer } from '../src/indexer.js';
import { escapeHtml, filterWorks, chipVocabulary, renderCatalog } from '../src/grid.js';

const data = JSON.parse(readFileSync(new URL('../works.json', import.meta.url), 'utf8'));
const idx = createIndexer(data);
const EMPTY = { themes: [], media: [], status: [] };

describe('filterWorks — the filter_composition rule', () => {
  it('empty state matches everything', () => {
    expect(filterWorks(idx, EMPTY)).toHaveLength(25);
  });

  it('single theme narrows (additive within not triggered)', () => {
    const ids = filterWorks(idx, { ...EMPTY, themes: ['craft'] }).map((w) => w.id);
    expect(ids).toContain('ho-system');
    expect(ids).toContain('dandori');
    expect(ids).not.toContain('edelmore');
  });

  it('multiple values within a category are additive (OR)', () => {
    const craft = filterWorks(idx, { ...EMPTY, themes: ['craft'] }).length;
    const both = filterWorks(idx, { ...EMPTY, themes: ['craft', 'sovereignty'] }).length;
    expect(both).toBeGreaterThan(craft);
  });

  it('categories compose multiplicatively (AND)', () => {
    const ids = filterWorks(idx, {
      themes: ['craft'],
      media: ['writing'],
      status: [],
    }).map((w) => w.id);
    expect(ids.sort()).toEqual(['falcon-cameras', 'three-hours']);
  });

  it('status filters compose too', () => {
    const ids = filterWorks(idx, { themes: [], media: ['software'], status: ['in-development'] }).map(
      (w) => w.id,
    );
    expect(ids.sort()).toEqual(['forteller', 'kinhin', 'palana', 'satori']);
  });
});

describe('chipVocabulary', () => {
  it('derives the present vocabulary from the corpus, sorted', () => {
    const vocab = chipVocabulary(idx);
    expect(vocab.themes).toContain('craft');
    expect(vocab.media).toEqual(['image', 'methodology', 'software', 'website', 'writing']);
    expect(vocab.status).toContain('near-publication');
    expect(vocab.themes).toEqual([...vocab.themes].sort());
  });
});

describe('renderCatalog', () => {
  it('renders all groups and Dandori on the empty state', () => {
    const html = renderCatalog(idx, EMPTY);
    expect(html).toContain('data-work="dandori"');
    expect(html).toContain('Dandori');
    expect(html).toContain('段取り');
    expect(html).toContain('25 of 25 works');
    expect(html.indexOf('Methodology')).toBeLessThan(html.indexOf('Archived'));
  });

  it('filtered state renders only matching sections and marks active chips', () => {
    const html = renderCatalog(idx, { ...EMPTY, themes: ['craft'] });
    expect(html).toContain('chip-active');
    expect(html).not.toContain('data-group="adaptive-tools"');
    expect(html).toContain('data-action="reset"');
  });

  it('an impossible filter renders the no-matches state, never a blank page', () => {
    const html = renderCatalog(idx, { themes: ['craft'], media: ['image'], status: ['live'] });
    expect(html).toContain('No works match');
    expect(html).toContain('data-action="reset"');
  });

  it('cards carry the always-link CTA from deployment[0]', () => {
    const html = renderCatalog(idx, { ...EMPTY, media: ['image'] });
    expect(html).toContain('data-work="aspirational-intelligence"');
    // aspirational-intelligence has no deployment URL — no dead CTA rendered
    expect(html).not.toContain('class="card-cta" href=""');
  });

  it('share affordance always renders; reset only under active filters', () => {
    expect(renderCatalog(idx, EMPTY)).toContain('data-action="share"');
    expect(renderCatalog(idx, EMPTY)).not.toContain('data-action="reset"');
  });
});

describe('escapeHtml', () => {
  it('escapes the five characters that matter', () => {
    expect(escapeHtml(`<img src=x onerror="alert('&')">`)).toBe(
      '&lt;img src=x onerror=&quot;alert(&#39;&amp;&#39;)&quot;&gt;',
    );
  });

  it('hostile catalog data cannot inject markup', () => {
    /** @type {any} — minimal hostile fixture; only fields the grid reads */
    const hostile = {
      work_groups: [{ id: 'g', number: 1, name: '<b>G</b>', intro: 'x' }],
      works: [
        {
          id: 'evil',
          name: '<script>alert(1)</script>',
          native_script: null,
          native_translation: null,
          hero: null,
          short_description: 'desc',
          media: ['software'],
          group: 'g',
          themes: ['craft'],
          status: 'shipped',
          deployment: [],
          repo: null,
          sort_order_within_group: 10,
          relationships: [],
        },
      ],
    };
    const html = renderCatalog(createIndexer(hostile), EMPTY);
    expect(html).not.toContain('<script>alert');
    expect(html).toContain('&lt;script&gt;');
    expect(html).not.toContain('<b>G</b>');
  });
});
