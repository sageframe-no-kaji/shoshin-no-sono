import { describe, it, expect } from 'vitest';
import { matchesFilter } from '../src/filter.js';

/** @type {any} */
const work = { themes: ['craft', 'agency'], media: ['software', 'writing'], status: 'shipped' };
const empty = { themes: [], media: [], status: [] };

describe('matchesFilter', () => {
  it('matches everything when state is empty', () => {
    expect(matchesFilter(work, empty)).toBe(true);
  });

  it('is additive within a category (any selected value matches)', () => {
    expect(matchesFilter(work, { ...empty, themes: ['agency', 'somatic'] })).toBe(true);
    expect(matchesFilter(work, { ...empty, themes: ['somatic'] })).toBe(false);
  });

  it('is multiplicative across categories (every non-empty category must match)', () => {
    expect(matchesFilter(work, { themes: ['craft'], media: ['software'], status: ['shipped'] })).toBe(
      true,
    );
    expect(matchesFilter(work, { themes: ['craft'], media: ['software'], status: ['archived'] })).toBe(
      false,
    );
  });

  it('treats status as a single-valued category', () => {
    expect(matchesFilter(work, { ...empty, status: ['shipped', 'published'] })).toBe(true);
    expect(matchesFilter(work, { ...empty, status: ['published'] })).toBe(false);
  });
});
