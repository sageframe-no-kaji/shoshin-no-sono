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
import { computePositions, buildHeightfield, hashSeed, applySeaDatum } from './field.js';
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
 * @typedef {FieldOpts & {
 *   relevanceFloor?: number,
 *   emergenceScale?: (id: string) => number,
 *   seaFraction?: number,
 *   coastRuggedness?: number,
 *   reserves?: { x: number, y: number, w: number, h: number }[]
 * }} CartographyOpts
 * `reserves` (ho-08): the furniture footprints in field coordinates — the
 * cartouche, then the face key (furniture is plural now, so the singular
 * `cartoucheReserve` became a list). The terrain generates FREELY beneath
 * them — each piece's cream reserve paints over whatever is there — but the
 * map's CONTENT keeps out: peaks never seat in one, town seats nudge clear,
 * routes route around, labels treat them as collision obstacles. (An earlier
 * same-day approach denied the field elevation under the footprint; the
 * practitioner superseded it — furniture claims no terrain, only content.)
 * `seaFraction` (ho-08's datum): sea level as a fraction of the raw field max.
 * The datum is applied to the heightfield itself — subtract and clamp at zero
 * (src/field.js applySeaDatum) — so the shore is exactly 0, the sea is flat,
 * and every downstream consumer sees a world where negative ground simply
 * does not exist.
 * `emergenceScale` (ho-07.2) is an additive, optional per-peak amplitude factor
 * the emergence player passes to grow the terrain as peaks rise: it folds into a
 * peak's amplitude alongside importance and filter relevance. A peak that scales
 * to 0 is dropped from the heightfield entirely (truly absent, not merely flat),
 * and from the returned peaks (so labels appear only as a peak rises). The
 * default — `() => 1` — leaves every existing caller's field unchanged.
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
  const emergenceScale = opts.emergenceScale ?? (() => 1);
  const works = peakWorks(indexer);
  // Positions come from the full peak set so a peak rises in place — its seat is
  // fixed from frame 0 and does not shift as the others emerge (positions are
  // seed-only, filter- and emergence-independent).
  const positioned = computePositions(
    works.map((w) => ({ id: w.id, importance: w.importance, amplitude: w.importance })),
    seed,
    opts,
  );
  const weighted = positioned.map((p, i) => ({
    ...p,
    amplitude: works[i].importance * relevance(works[i], state, floor) * emergenceScale(works[i].id),
  }));
  // A zero-amplitude (not-yet-risen) peak contributes nothing, so drop it before
  // the heightfield and from the returned peaks — absent, not flat. Under the
  // default scale every real peak has amplitude > 0 (importance ≥ 1, floor > 0),
  // so this is a no-op for existing callers.
  const active = weighted.filter((p) => p.amplitude > 0);
  const heightfield = applySeaDatum(buildHeightfield(active, seed, opts), opts.seaFraction ?? 0, {
    ruggedness: opts.coastRuggedness ?? 0,
    seed,
  });
  return { peaks: active, heightfield, seed };
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
 * With a `seaFraction` datum in force the heightfield's sea is flat zero, and
 * town seats stop just above the shore (negative ground prohibits settlement).
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

    // The datum floor (ho-08): the heightfield is already datumed (sea = flat
    // 0), so seats stop a small standoff above the shore, never in the sea.
    const floor = (opts.seaFraction ?? 0) > 0 ? 0.02 * hf.max : -Infinity;
    const seat = nudgeOutOfReserves(
      seatDownhill(townSeat(anchors, centroid, opts), hf, footOffset, floor),
      opts.reserves ?? [],
      24,
    );
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
 * Push a point out of every furniture reserve (ho-08: the cartouche, the face
 * key), exiting through each nearest expanded edge; points already clear are
 * untouched. The footprints sit at opposite margins, so the sequential pass
 * never nudges a point from one into another.
 * @param {{ x: number, y: number }} pt
 * @param {{ x: number, y: number, w: number, h: number }[]} rects
 * @param {number} pad
 * @returns {{ x: number, y: number }}
 */
function nudgeOutOfReserves(pt, rects, pad) {
  let out = pt;
  for (const r of rects) out = nudgeOutOfReserve(out, r, pad);
  return out;
}

/**
 * Push a point out of one furniture reserve, exiting through the nearest
 * expanded edge; points already clear are untouched. Content never sits
 * under the map's furniture.
 * @param {{ x: number, y: number }} pt
 * @param {{ x: number, y: number, w: number, h: number }} r
 * @param {number} pad
 * @returns {{ x: number, y: number }}
 */
function nudgeOutOfReserve(pt, r, pad) {
  if (
    pt.x < r.x - pad ||
    pt.x > r.x + r.w + pad ||
    pt.y < r.y - pad ||
    pt.y > r.y + r.h + pad
  ) {
    return pt;
  }
  const left = pt.x - (r.x - pad);
  const right = r.x + r.w + pad - pt.x;
  const top = pt.y - (r.y - pad);
  const bottom = r.y + r.h + pad - pt.y;
  const m = Math.min(left, right, top, bottom);
  if (m === left) return { x: r.x - pad, y: pt.y };
  if (m === right) return { x: r.x + r.w + pad, y: pt.y };
  if (m === top) return { x: pt.x, y: r.y - pad };
  return { x: pt.x, y: r.y + r.h + pad };
}

/**
 * Road edges for a set of placed towns (ho-08): `companion_to` edges where BOTH
 * endpoints are settlements — town-to-town connections sit flat in the valleys.
 * Symmetric edges answer from both endpoints, so each road is deduplicated by
 * its sorted id pair. Querying the Indexer for the edges is the Cartographer's
 * job (CLAUDE.md boundary); src/feature-map.js renders the returned shapes.
 * @param {Indexer} indexer
 * @param {CartographyTown[]} towns
 * @returns {import('./feature-map.js').RoadEdge[]}
 */
export function computeRoadEdges(indexer, towns) {
  const townSet = new Set(towns.map((t) => t.id));
  /** @type {Map<string, { x: number, y: number }>} */
  const townSeat = new Map(towns.map((t) => [t.id, t.seat]));
  /** @type {import('./feature-map.js').RoadEdge[]} */
  const roadEdges = [];
  const seenRoads = new Set();
  for (const t of towns) {
    for (const e of indexer.getOutgoing(t.id, 'companion_to')) {
      if (!townSet.has(e.target)) continue;
      const key = [t.id, e.target].sort().join('|');
      if (seenRoads.has(key)) continue;
      seenRoads.add(key);
      const dest = townSeat.get(e.target);
      if (!dest) continue;
      roadEdges.push({ from: t.seat, to: dest, id: key, strength: 2 });
    }
  }
  return roadEdges;
}

/**
 * Trail edges (ho-08), two kinds. Climbs: `documents` edges from settlements
 * to their documented peaks — no footRadius, the town seat is already placed
 * at the peak foot by the seating algorithm. Hiking trails: `validates` edges
 * where BOTH endpoints are peaks — a path walked between summits; both
 * endpoints pull back to their peak's foot (radius from importance, the
 * field's radius convention) so the trail doesn't cut into summit marks.
 * Deduplicated by sorted id pair.
 * @param {Indexer} indexer
 * @param {CartographyTown[]} towns
 * @param {import('./field.js').PositionedPeak[]} peaks
 * @param {{ radiusBase?: number, radiusScale?: number, footFrac?: number }} [opts]
 * @returns {import('./feature-map.js').TrailEdge[]}
 */
export function computeTrailEdges(indexer, towns, peaks, opts = {}) {
  const radiusBase = opts.radiusBase ?? 12;
  const radiusScale = opts.radiusScale ?? 8;
  const footFrac = opts.footFrac ?? 0.75;
  /** @type {Map<string, import('./field.js').PositionedPeak>} */
  const peakMap = new Map(peaks.map((p) => [p.id, p]));
  /** @type {import('./feature-map.js').TrailEdge[]} */
  const trailEdges = [];
  for (const t of towns) {
    for (const e of indexer.getOutgoing(t.id, 'documents')) {
      const peak = peakMap.get(e.target);
      if (!peak) continue;
      trailEdges.push({
        from: t.seat,
        to: { x: peak.x, y: peak.y },
        id: `${t.id}→${e.target}`,
      });
    }
  }
  const footR = (/** @type {import('./field.js').PositionedPeak} */ p) =>
    (radiusBase + p.importance * radiusScale) * footFrac;
  const seenHikes = new Set();
  for (const p of peaks) {
    for (const e of indexer.getOutgoing(p.id, 'validates')) {
      const target = peakMap.get(e.target);
      if (!target) continue;
      const key = [p.id, e.target].sort().join('|');
      if (seenHikes.has(key)) continue;
      seenHikes.add(key);
      trailEdges.push({
        from: { x: p.x, y: p.y },
        to: { x: target.x, y: target.y },
        id: key,
        footRadius: footR(target),
        startRadius: footR(p),
      });
    }
  }
  return trailEdges;
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
