/**
 * Emergence (ho-07.2) — the pure timeline core for the world-then-writing
 * populate animation. No DOM, no timers, no URL: it queries the Indexer for
 * `conceived` / `named` (ho-07.1's fields) and produces an ordered beat
 * timeline the player in src/cartography-page.js walks.
 *
 * The map remembers how it was made. Peaks rise in `conceived` order, a renamed
 * work pulses a second time at its `named` date, and once the world has finished
 * rising the writing towns arrive over it in their own dated order. The rhythm is
 * even beats: dates are read only to *sort* and to detect *simultaneity* (same-day
 * conceptions share one beat), never to space by absolute time — so the 2022
 * outlier and the fuzzy early months never distort the pacing.
 *
 * The pre-history floor is here too (Decision 5): the archived 2022 work is
 * present from the first frame (it never rises — it is the ground the emergence
 * happens above), and the 2025-11-11 corpus floor is injected as a constant, not
 * read from the catalog. Recorded in ho-process/hos/ho-07.2-emergence-animation.md.
 */

import { isPeak } from './cartographer.js';

/** @typedef {import('./indexer.js').Work} Work */
/** @typedef {ReturnType<typeof import('./indexer.js').createIndexer>} Indexer */

/**
 * The corpus floor — the first Claude chat (Musicbrainz Picard, 2025-11-11),
 * where the dense record begins. It is a landmark, not a work, so it lives as an
 * animation constant here rather than a works.json entry (Decision 5, confirmed
 * in ho-07.1). The label is copy the player may render beside a faint horizon
 * marker; its visual weight is a by-feel tuner (Decision 7).
 */
export const CORPUS_FLOOR = Object.freeze({ date: '2025-11-11', label: 'the record begins' });

/**
 * The pre-history floor is the set of `archived` works — present from frame 0,
 * never rising. There is exactly one (aspirational-intelligence, 2022); deriving
 * it from status rather than hardcoding the id keeps it data-driven and matches
 * Decision 5's framing ("the work that predates the practice").
 */
const FLOOR_STATUS = 'archived';

/** @param {Work} work @returns {boolean} */
function isFloor(work) {
  return work.status === FLOOR_STATUS;
}

/**
 * @typedef {Object} EmergenceBeat
 * @property {number} index Global step index — world beats first, then writing.
 * @property {'rise' | 'pulse' | 'arrive'} kind
 * @property {string[]} ids The work ids active on this beat, in catalog order.
 * @property {string} date The ISO date that ordered and grouped the beat.
 */

/**
 * @typedef {Object} EmergenceTimeline
 * @property {string[]} floorIds Peaks present from frame 0 (archived) — never rise.
 * @property {{ date: string, label: string }} corpusFloor The injected landmark.
 * @property {EmergenceBeat[]} world Rise + pulse beats, date-ordered (peaks).
 * @property {EmergenceBeat[]} writing Arrive beats, date-ordered (towns).
 */

/** @typedef {{ date: string, kind: 'rise' | 'pulse' | 'arrive', id: string }} EmergenceEvent */

/** Stable kind order when two events share a date: rises settle before pulses. */
const KIND_ORDER = { rise: 0, pulse: 1, arrive: 2 };

/**
 * Sort events by date, then by kind (rise before pulse), preserving the input
 * (catalog) order within an equal (date, kind) group via the carried ordinal.
 * @param {Array<EmergenceEvent & { ord: number }>} events
 * @returns {Array<EmergenceEvent & { ord: number }>}
 */
function sortEvents(events) {
  return [...events].sort((a, b) => {
    if (a.date !== b.date) return a.date < b.date ? -1 : 1;
    if (a.kind !== b.kind) return KIND_ORDER[a.kind] - KIND_ORDER[b.kind];
    return a.ord - b.ord;
  });
}

/**
 * Collapse a sorted event stream into beats: consecutive events sharing the same
 * (date, kind) become one beat. Same-day conceptions thus share a single rise
 * beat (ho-system + kanyo; shodō + sutra), and a same-day rename would share a
 * pulse beat. Indices are assigned from `startIndex` so world and writing form
 * one continuous sequence.
 * @param {Array<EmergenceEvent & { ord: number }>} sorted
 * @param {number} startIndex
 * @returns {EmergenceBeat[]}
 */
function collapseToBeats(sorted, startIndex) {
  /** @type {EmergenceBeat[]} */
  const beats = [];
  for (const ev of sorted) {
    const last = beats[beats.length - 1];
    if (last && last.date === ev.date && last.kind === ev.kind) {
      last.ids.push(ev.id);
    } else {
      beats.push({ index: startIndex + beats.length, kind: ev.kind, ids: [ev.id], date: ev.date });
    }
  }
  return beats;
}

/**
 * Build the emergence timeline from the catalog (Decisions 1, 2, 5). Pure and
 * deterministic from the Indexer's works. Peaks (non-`writing`, non-floor)
 * contribute a `rise` at `conceived` and, if renamed, a `pulse` at `named`;
 * these merge-sort into the date-ordered world sequence. Writing-group towns
 * contribute an `arrive` at `conceived`, forming the writing sequence. The
 * archived floor and the injected corpus floor sit outside both.
 * @param {Indexer} indexer
 * @returns {EmergenceTimeline}
 */
export function buildEmergenceTimeline(indexer) {
  const works = indexer.works();
  /** @type {string[]} */
  const floorIds = [];
  /** @type {Array<EmergenceEvent & { ord: number }>} */
  const worldEvents = [];
  /** @type {Array<EmergenceEvent & { ord: number }>} */
  const writingEvents = [];

  works.forEach((w, ord) => {
    if (isFloor(w)) {
      floorIds.push(w.id);
      return; // the ground — never an event
    }
    if (isPeak(w)) {
      worldEvents.push({ date: w.conceived, kind: 'rise', id: w.id, ord });
      if (w.named) worldEvents.push({ date: w.named, kind: 'pulse', id: w.id, ord });
    } else {
      writingEvents.push({ date: w.conceived, kind: 'arrive', id: w.id, ord });
    }
  });

  const world = collapseToBeats(sortEvents(worldEvents), 0);
  const writing = collapseToBeats(sortEvents(writingEvents), world.length);

  return { floorIds, corpusFloor: CORPUS_FLOOR, world, writing };
}

/**
 * @typedef {Object} EmergenceStep
 * @property {number} index Step ordinal across the whole played sequence.
 * @property {'rise' | 'pulse' | 'arrive' | 'hold'} kind
 * @property {string | null} date The beat date, or null for the held seam.
 * @property {string[]} ids The ids activated or flashed this step (empty for hold).
 * @property {Set<string>} peakScale Cumulative risen + floor peak ids (scale 1).
 * @property {Set<string>} towns Cumulative revealed town ids.
 */

/**
 * Expand a timeline into the render-step sequence the player walks (Decision 4).
 * Each step carries the *cumulative* reveal state so the player can render any
 * step statelessly: which peaks stand at full (`peakScale` — floor included from
 * frame 0, then each rise adds its ids; a pulse leaves the set unchanged because
 * the peak already stands), and which towns have arrived (`towns`). A single
 * `hold` step sits between the finished world and the first town — the deliberate
 * seam where the risen terrain rests before the writing arrives.
 *
 * The final step's `peakScale` is every peak and `towns` every town, so rendering
 * it reproduces the static map exactly — which is what cancellation and
 * `prefers-reduced-motion` snap to (Decision 6).
 * @param {EmergenceTimeline} timeline
 * @returns {EmergenceStep[]}
 */
export function emergencePlan(timeline) {
  /** @type {EmergenceStep[]} */
  const steps = [];
  const peakScale = new Set(timeline.floorIds);
  const towns = new Set();
  let index = 0;

  for (const beat of timeline.world) {
    if (beat.kind === 'rise') for (const id of beat.ids) peakScale.add(id);
    // a pulse re-lights an already-risen peak — peakScale is unchanged
    steps.push({
      index: index++,
      kind: beat.kind,
      date: beat.date,
      ids: [...beat.ids],
      peakScale: new Set(peakScale),
      towns: new Set(towns),
    });
  }

  // The held seam — only emitted when there is both a world and a writing to
  // bridge. The world rests at full; no town has arrived yet.
  if (timeline.world.length > 0 && timeline.writing.length > 0) {
    steps.push({
      index: index++,
      kind: 'hold',
      date: null,
      ids: [],
      peakScale: new Set(peakScale),
      towns: new Set(towns),
    });
  }

  for (const beat of timeline.writing) {
    for (const id of beat.ids) towns.add(id);
    steps.push({
      index: index++,
      kind: beat.kind,
      date: beat.date,
      ids: [...beat.ids],
      peakScale: new Set(peakScale),
      towns: new Set(towns),
    });
  }

  return steps;
}

/**
 * The emergenceScale bridge for a step: 1 for any peak that has risen (or the
 * floor), 0 for one that has not. Passed straight into computeField's
 * `emergenceScale` hook — a scale-0 peak is absent from the heightfield, so the
 * terrain grows as the set fills.
 * @param {EmergenceStep} step
 * @returns {(id: string) => number}
 */
export function scaleFn(step) {
  return (id) => (step.peakScale.has(id) ? 1 : 0);
}

/**
 * The final, fully-emerged step — every peak risen, every town arrived. The
 * frame cancellation and reduced-motion snap to (Decision 6). Returns null only
 * for an empty catalog (no steps to play).
 * @param {EmergenceStep[]} steps
 * @returns {EmergenceStep | null}
 */
export function finalStep(steps) {
  return steps.length > 0 ? steps[steps.length - 1] : null;
}
