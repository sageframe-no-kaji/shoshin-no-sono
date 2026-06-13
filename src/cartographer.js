/**
 * The Cartographer (ho-05 stages) — the pure render component that turns the
 * catalog into terrain. It queries the Indexer for works, decides cartographic
 * role, reads seed + filter state from the Garden Gate, and drives the field
 * math in src/field.js. It never parses raw catalog JSON and never touches the
 * URL — those are the Indexer's and the Gate's jobs (CLAUDE.md boundaries).
 *
 * ho-05 produces positions + heightfield, verified through the transient debug
 * heat map (src/heatmap.js). Contours (ho-06), towns (ho-07), relationship
 * features (ho-08), and interaction (ho-09) layer on top later.
 *
 * Recorded in ho-process/hos/ho-05-positions-and-heightfield.md.
 */

import { matchesFilter } from './filter.js';
import { computePositions, buildHeightfield } from './field.js';

/** @typedef {import('./gate.js').FilterState} FilterState */
/** @typedef {import('./indexer.js').Work} Work */
/** @typedef {ReturnType<typeof import('./indexer.js').createIndexer>} Indexer */
/** @typedef {import('./field.js').FieldOpts} FieldOpts */

/** Works in this group are commentary (towns, ho-07); everything else is a peak. */
export const TOWN_GROUP = 'writing';

/** Default sink depth for works that don't match the active filter (Decision 2/8). */
const DEFAULT_RELEVANCE_FLOOR = 0.15;

/**
 * Cartographic role: a work is a peak unless it is commentary-about-works. The
 * rule is work-versus-commentary, operationalized via `group`, not the `media`
 * array — so Pink Teaming (website+writing) stays a peak and The Same Lever
 * (no documents edge) stays a town (Decision 5).
 * @param {Work} work
 * @returns {boolean}
 */
export function isPeak(work) {
  return work.group !== TOWN_GROUP;
}

/** @param {Indexer} indexer @returns {Work[]} */
export function peakWorks(indexer) {
  return indexer.works().filter(isPeak);
}

/**
 * filter_relevance: 1 for a work matching the active filter, the floor for a
 * non-matching one. One terrain, non-matches sink (Decision 2).
 * @param {Work} work
 * @param {FilterState} state
 * @param {number} floor
 * @returns {number}
 */
export function relevance(work, state, floor) {
  return matchesFilter(work, state) ? 1 : floor;
}

/**
 * @typedef {FieldOpts & { relevanceFloor?: number }} CartographyOpts
 */

/**
 * @typedef {Object} CartographyField
 * @property {import('./field.js').PositionedPeak[]} peaks positioned, amplitude-weighted
 * @property {import('./field.js').Heightfield} heightfield
 * @property {number} seed the layout seed used
 */

/**
 * Build the cartography field for a given filter state and seed. Pure and
 * deterministic: positions come from the seed alone (filter-independent), then
 * each peak's amplitude is importance × filter_relevance, then the heightfield
 * is sampled. Same (works, state, seed) → same field.
 * @param {Indexer} indexer
 * @param {FilterState} state
 * @param {number} seed
 * @param {CartographyOpts} [opts]
 * @returns {CartographyField}
 */
export function computeField(indexer, state, seed, opts = {}) {
  const floor = opts.relevanceFloor ?? DEFAULT_RELEVANCE_FLOOR;
  const works = peakWorks(indexer);
  const positioned = computePositions(
    works.map((w) => ({ id: w.id, importance: w.importance, amplitude: w.importance })),
    seed,
    opts,
  );
  const weighted = positioned.map((p, i) => ({
    ...p,
    amplitude: works[i].importance * relevance(works[i], state, floor),
  }));
  const heightfield = buildHeightfield(weighted, seed, opts);
  return { peaks: weighted, heightfield, seed };
}

/**
 * Live component over an Indexer + Gate. Holds the ephemeral seed used when the
 * URL carries none, so a plain reload produces a novel layout while `?seed=N`
 * reproduces a fixed one. `randomSeed` is injectable for tests.
 * @param {Indexer} indexer
 * @param {{ currentState: () => FilterState, currentSeed: () => number | null }} gate
 * @param {CartographyOpts & { randomSeed?: () => number }} [opts]
 */
export function createCartographer(indexer, gate, opts = {}) {
  const randomSeed = opts.randomSeed ?? (() => Math.floor(Math.random() * 0x7fffffff));
  let ephemeral = randomSeed();

  /** The seed in force: the URL's if present, else the current ephemeral one. */
  const activeSeed = () => gate.currentSeed() ?? ephemeral;

  /** Roll a fresh ephemeral seed (used only when the URL carries none). */
  const reseed = () => {
    ephemeral = randomSeed();
    return activeSeed();
  };

  /** Compute the field for the current Gate state at the active seed. */
  const field = () => computeField(indexer, gate.currentState(), activeSeed(), opts);

  return Object.freeze({ activeSeed, reseed, field });
}
