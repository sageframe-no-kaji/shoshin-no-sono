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
import { computePositions, buildHeightfield, hashSeed } from './field.js';
import {
  townSeat,
  seatDownhill,
  sizeBand,
  growSettlement,
  deform,
  blocksExtent,
  TOWN_DEFAULTS,
} from './settlements.js';

/** @typedef {import('./gate.js').FilterState} FilterState */
/** @typedef {import('./indexer.js').Work} Work */
/** @typedef {ReturnType<typeof import('./indexer.js').createIndexer>} Indexer */
/** @typedef {import('./field.js').FieldOpts} FieldOpts */

/** Works in this group are commentary (towns, ho-07); everything else is a peak. */
export const TOWN_GROUP = 'writing';

/**
 * Default sink depth for works that don't match the active filter (Decision 2/8).
 * Landed at 0.45 in ho-06.5: with the low base radius, non-matching works need a
 * higher floor to recede to legible small hills rather than collapse to dots.
 */
const DEFAULT_RELEVANCE_FLOOR = 0.45;

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

/** Works that render as towns (the writing group). @param {Indexer} indexer @returns {Work[]} */
export function townWorks(indexer) {
  return indexer.works().filter((w) => !isPeak(w));
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
 * @typedef {Object} CartographyTown
 * @property {string} id
 * @property {string} name label text (typography variant B)
 * @property {{ x: number, y: number }} seat placed position in field space
 * @property {number} level size band — 0 hamlet, 1 village, 2 town, 3 city
 * @property {number} weight settlementWeight that drove the band
 * @property {import('./settlements.js').Block[]} blocks deformed, settlement-local
 * @property {number} extent measured max corner radius (post-deform, for the label)
 * @property {boolean} match whether the town matches the active filter
 */

/**
 * @typedef {CartographyOpts & {
 *   anchorBias?: number, strengthFull?: number, secondaryStrength?: number,
 *   footOffset?: number, elongK?: number, elongCap?: number, contourFollow?: number,
 *   density?: number, extentScale?: number, thresholds?: number[]
 * }} TownOpts
 */

/**
 * The mean peak position — the field centroid an unanchored town seats at.
 * @param {import('./field.js').PositionedPeak[]} peaks
 * @param {import('./field.js').Heightfield} hf
 * @returns {{ x: number, y: number }}
 */
function fieldCentroid(peaks, hf) {
  if (peaks.length === 0) return { x: hf.width / 2, y: hf.height / 2 };
  let sx = 0;
  let sy = 0;
  for (const p of peaks) {
    sx += p.x;
    sy += p.y;
  }
  return { x: sx / peaks.length, y: sy / peaks.length };
}

/**
 * Place the writing-group towns on a computed field (Decisions 2–6). Each town
 * is seated from the peaks it documents (blended barycenter, biased to
 * strength-3, pulled off the summit toward the foot), sized from its
 * settlementWeight (band + within-band density), grown in the abstract, then
 * deformed to the slope it lands on. A town with no documents edge falls back to
 * any outgoing edge to a peak (the-same-lever's argues_for → Glassroom) at a low
 * synthetic strength, so it seats central but leaning that anchor. Non-matching
 * towns are flagged for recession (Decision 6); they keep their seats. Pure and
 * seed-deterministic.
 * @param {Indexer} indexer
 * @param {FilterState} state
 * @param {CartographyField} field
 * @param {TownOpts} [opts]
 * @returns {CartographyTown[]}
 */
export function computeTowns(indexer, state, field, opts = {}) {
  const { peaks, heightfield: hf, seed } = field;
  /** @type {Map<string, { x: number, y: number }>} */
  const peakPos = new Map(peaks.map((p) => [p.id, { x: p.x, y: p.y }]));
  const centroid = fieldCentroid(peaks, hf);
  const secondaryStrength = opts.secondaryStrength ?? TOWN_DEFAULTS.secondaryStrength;
  const footOffset = opts.footOffset ?? TOWN_DEFAULTS.footOffset;
  const baseDensity = opts.density ?? TOWN_DEFAULTS.density;
  const extentScale = opts.extentScale ?? TOWN_DEFAULTS.extentScale;
  const thresholds = opts.thresholds ?? TOWN_DEFAULTS.thresholds;

  return townWorks(indexer).map((town) => {
    // Primary anchors: the peaks this writing documents, by edge strength.
    /** @type {import('./settlements.js').Anchor[]} */
    let anchors = indexer
      .getOutgoing(town.id, 'documents')
      .filter((e) => peakPos.has(e.target))
      .map((e) => ({ pos: /** @type {{x:number,y:number}} */ (peakPos.get(e.target)), strength: e.strength ?? 0 }));
    // Fallback: a town that documents nothing leans on any edge to a peak.
    if (anchors.length === 0) {
      anchors = indexer
        .getOutgoing(town.id)
        .filter((e) => peakPos.has(e.target))
        .map((e) => ({ pos: /** @type {{x:number,y:number}} */ (peakPos.get(e.target)), strength: secondaryStrength }));
    }

    const seat = seatDownhill(townSeat(anchors, centroid, opts), hf, footOffset);
    const weight = indexer.settlementWeight(town.id);
    const level = sizeBand(weight, thresholds);
    const density = baseDensity + weight * extentScale;
    const grown = growSettlement(level, hashSeed(town.id, seed), { density });
    const blocks = deform(grown.blocks, hf, seat, opts);

    return {
      id: town.id,
      name: town.name,
      seat,
      level,
      weight,
      blocks,
      extent: blocksExtent(blocks),
      match: matchesFilter(town, state),
    };
  });
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
