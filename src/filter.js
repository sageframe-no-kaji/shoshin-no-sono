/**
 * The filter composition rule, shared by the grid (which hides non-matching
 * works) and the Cartographer (which sinks them). One rule, two consumers, so
 * the grammar can't drift between the catalog and the map. Extracted from
 * grid.js in ho-05.
 *
 * The schema's filter_composition: multiplicative across categories (every
 * non-empty category must match) and additive within (any selected value in a
 * category matches). Empty state matches everything.
 */

/** @typedef {import('./gate.js').FilterState} FilterState */
/** @typedef {import('./indexer.js').Work} Work */

/**
 * @param {string[]} values the work's values in one category
 * @param {string[]} selected the active filter values for that category
 * @returns {boolean}
 */
function categoryMatches(values, selected) {
  return selected.length === 0 || selected.some((v) => values.includes(v));
}

/**
 * Does a work satisfy the active filter state?
 * @param {Work} work
 * @param {FilterState} state
 * @returns {boolean}
 */
export function matchesFilter(work, state) {
  return (
    categoryMatches(work.themes, state.themes) &&
    categoryMatches(work.media, state.media) &&
    categoryMatches([work.status], state.status)
  );
}
