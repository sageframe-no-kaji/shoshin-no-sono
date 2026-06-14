/**
 * Debug page entry for the cartography (ho-06 contours + ho-07 towns) —
 * browser-only wiring, no logic, excluded from coverage (vitest.config.mjs) like
 * src/main.js. Boots the Indexer + Gate + Cartographer and renders, in register
 * order: paper → contour map (src/contour-map.js) → settlements
 * (src/settlement-map.js) → labels.
 *
 * It carries the by-feel tuner instruments: the ho-06 field controls (interval,
 * summit sharpness, crenellation, radius scaling, sink floor) and the ho-07 town
 * controls (seat blend, foot offset, deform, density, size thresholds), each
 * re-rendering the map on input so the values are dialed against the register.
 * A reseed control and seed readout, the theme chips to watch the terrain
 * re-weight and non-matching towns recede, and an off-by-default peak-id overlay.
 * `?seed=N` reproduces a layout; `?theme=...` flows through the Gate.
 *
 * This page persists and grows into the real cartography surface through ho-09.
 */
import { createIndexer, loadWorks } from './indexer.js';
import { createGate } from './gate.js';
import { createCartographer, computeField, computeTowns } from './cartographer.js';
import { contourMapSvg } from './contour-map.js';
import { settlementSvg } from './settlement-map.js';
import { revealedBlocks } from './settlements.js';
import { chipVocabulary } from './grid.js';
import { buildEmergenceTimeline, emergencePlan, scaleFn, CORPUS_FLOOR } from './emergence.js';

const indexer = createIndexer(await loadWorks('./works.json'));
const gate = createGate(window);
const carto = createCartographer(indexer, gate);
window.indexer = indexer;

const map = /** @type {SVGSVGElement} */ (/** @type {unknown} */ (document.getElementById('map')));
const seedOut = /** @type {HTMLElement} */ (document.getElementById('seed'));
const chipsEl = /** @type {HTMLElement} */ (document.getElementById('chips'));
const pinned = /** @type {HTMLElement} */ (document.getElementById('pinned'));
const tunersEl = /** @type {HTMLElement} */ (document.getElementById('tuners'));

/** Live tuner values — opened on the field (ho-06.5) and town (ho-07) defaults. */
/** @type {Record<string, number>} */
const tuners = {
  // ho-06 field
  interval: 0.32,
  summitExp: 1.15,
  noiseWeight: 0.3,
  radiusBase: 12,
  radiusScale: 8,
  relevanceFloor: 0.45,
  // register line weights — frozen defaults; exposed for the by-feel pass only
  weightRegular: 0.25,
  weightIndex: 0.7,
  labelScale: 0.6, // multiplies peak/town label type — landed by feel in ho-07.5 (spec was solo-plate scale)

  // ho-07 towns
  anchorBias: 4,
  strengthFull: 3,
  footOffset: 20,
  elongK: 4,
  contourFollow: 0.6,
  density: 1.4,
  extentScale: 0.3,
  t1: 0.7,
  t2: 1.5,
  t3: 1.7,

  // ho-07.2 / ho-07.6 emergence — timing/feel for the world-then-writing populate.
  // Discrete cadence for the world (the perf gate chose it: continuous re-contour
  // is ~158ms): one recompute per beat, beats cross-faded on the compositor. The
  // writing phase freezes the terrain and builds towns house-by-house on the cheap
  // settlement layer (ho-07.6 Decision 1).
  beatMs: 240, // rise beat dwell before the next
  holdMs: 350, // the world→writing breath (ho-07.6 Decision 7 — shrunk from a seam)
  fadeMs: 320, // cross-fade between beats (the rise gesture)
  nameDelayMs: 260, // peak name fades in this much AFTER its peak rises (ho-07.6 Decision 3)
  townBuildMs: 650, // house-by-house build time per town beat (ho-07.6 Decision 1)
  pulseMs: 560, // the rename re-glow dwell (ho-07.6 Decision 2 — a glow, not a ring)
  beaconOpacity: 0.5, // the per-peak signal-fire beacon weight (ho-07.6 Decision 5)
  floorMarkerOpacity: 0.45, // the 2025-11-11 corpus-floor horizon marker weight
};

/** Gap between consecutive town builds in the writing phase (not a by-feel tuner). */
const TOWN_GAP_MS = 120;
/** The signal-fire beacon hue (brand Amber — flame, NOT the reserved terracotta). */
const BEACON_AMBER = '#D4952A';

/** @type {{ key: string, label: string, min: number, max: number, step: number }[]} */
const TUNER_SPECS = [
  { key: 'interval', label: 'ring spacing', min: 0.3, max: 1.5, step: 0.02 },
  { key: 'summitExp', label: 'summit sharpness', min: 1.0, max: 3.0, step: 0.05 },
  { key: 'noiseWeight', label: 'crenellation', min: 0, max: 2.0, step: 0.05 },
  { key: 'radiusBase', label: 'base radius', min: 12, max: 60, step: 2 },
  { key: 'radiusScale', label: 'radius × importance', min: 4, max: 40, step: 1 },
  { key: 'relevanceFloor', label: 'sink floor (filtered)', min: 0, max: 0.6, step: 0.01 },
  { key: 'weightRegular', label: 'line weight (regular)', min: 0.05, max: 1.0, step: 0.05 },
  { key: 'weightIndex', label: 'line weight (index)', min: 0.1, max: 2.0, step: 0.05 },
  { key: 'labelScale', label: 'label size', min: 0.5, max: 1.4, step: 0.05 },
  { key: 'anchorBias', label: 'anchor bias (p)', min: 1, max: 6, step: 0.1 },
  { key: 'strengthFull', label: 'strength → seated', min: 1, max: 6, step: 0.5 },
  { key: 'footOffset', label: 'foot offset', min: 0, max: 160, step: 4 },
  { key: 'elongK', label: 'valley elongation', min: 0, max: 12, step: 0.5 },
  { key: 'contourFollow', label: 'contour follow', min: 0, max: 1, step: 0.05 },
  { key: 'density', label: 'town density', min: 0.5, max: 3, step: 0.1 },
  { key: 'extentScale', label: 'density × weight', min: 0, max: 1, step: 0.05 },
  { key: 't1', label: 'size: hamlet→village', min: 0.2, max: 1.4, step: 0.05 },
  { key: 't2', label: 'size: village→town', min: 0.8, max: 1.8, step: 0.05 },
  { key: 't3', label: 'size: town→city', min: 1.0, max: 2.2, step: 0.05 },
  { key: 'beatMs', label: 'rise beat (ms)', min: 80, max: 800, step: 20 },
  { key: 'fadeMs', label: 'rise cross-fade (ms)', min: 0, max: 900, step: 20 },
  { key: 'nameDelayMs', label: 'name fade delay (ms)', min: 0, max: 800, step: 20 },
  { key: 'holdMs', label: 'world→writing breath (ms)', min: 0, max: 2000, step: 50 },
  { key: 'townBuildMs', label: 'town build (ms)', min: 150, max: 1600, step: 50 },
  { key: 'pulseMs', label: 'rename re-glow (ms)', min: 150, max: 1200, step: 20 },
  { key: 'beaconOpacity', label: 'beacon weight', min: 0, max: 1, step: 0.05 },
  { key: 'floorMarkerOpacity', label: 'corpus-floor marker', min: 0, max: 0.8, step: 0.05 },
];

let showPeaks = false;

const themes = chipVocabulary(indexer).themes;

const renderChips = () => {
  const active = new Set(gate.currentState().themes);
  chipsEl.innerHTML = themes
    .map((t) => `<button data-theme="${t}" class="chip${active.has(t) ? ' on' : ''}">${t}</button>`)
    .join('');
};

/** @param {import('./field.js').PositionedPeak[]} peaks */
const peakDotsSvg = (peaks) =>
  peaks
    .map(
      (p) =>
        `<g opacity="0.75"><circle cx="${p.x.toFixed(1)}" cy="${p.y.toFixed(1)}" r="2.5" fill="#9A5B3C"/>` +
        `<text x="${(p.x + 5).toFixed(1)}" y="${(p.y + 3).toFixed(1)}" font-family="Spectral, Georgia, serif" font-size="9" fill="#6B6B6B">${p.id}</text></g>`,
    )
    .join('');

const NATIVE_STACK = "'Hiragino Mincho ProN','Yu Mincho','Songti SC','Noto Serif JP',serif";

/**
 * Peak label — typography variant B (peak): wide-tracked roman caps with the
 * native script set beside at near-equal optical size, a cream halo so it reads
 * over the rings. A minimal static render pulled forward so the assembled map
 * is legible during the by-feel pass; ho-09 owns the interactive label layer
 * (cards, hover-dim, collision/leadering).
 * @param {number} x @param {number} y @param {string} name @param {string|null} native @param {number} scale
 */
const peakLabel = (x, y, name, native, scale) => {
  const nat = native
    ? `<tspan dx="${(8 * scale).toFixed(1)}" font-family="${NATIVE_STACK}" font-size="${(14 * scale).toFixed(1)}" fill="#5C5C5C" style="letter-spacing:0.10em;">${native}</tspan>`
    : '';
  return (
    `<text x="${x.toFixed(1)}" y="${y.toFixed(1)}" text-anchor="middle" font-family="Spectral, Georgia, serif" ` +
    `font-size="${(16.5 * scale).toFixed(1)}" fill="#2B2B2B" style="letter-spacing:0.16em;" ` +
    `paint-order="stroke" stroke="#FDFCF9" stroke-width="${(3.5 * scale).toFixed(1)}" stroke-linejoin="round">${(name || '').toUpperCase()}${nat}</text>`
  );
};

/**
 * Peak labels. When `animate` is set (emergence frames), each name fades in
 * offset *after* its peak has risen (ho-07.6 Decision 3) — the terrain lifts,
 * then the name settles. Names already standing are held steady by the cross-fade's
 * under-layer, so only a newly-risen peak's name visibly lags. The static render
 * passes `animate = false`.
 * @param {import('./field.js').PositionedPeak[]} peaks @param {number} scale @param {boolean} [animate]
 */
const peakLabelsSvg = (peaks, scale, animate = false) =>
  peaks
    .map((p) => {
      const w = indexer.getWork(p.id);
      if (!w) return '';
      const label = peakLabel(p.x, p.y - 12, w.name, w.native_script, scale);
      return animate
        ? `<g style="opacity:0;animation:emgIn ${tuners.fadeMs}ms ease-out ${tuners.nameDelayMs}ms forwards;">${label}</g>`
        : label;
    })
    .join('');

/**
 * The signal-fire beacon (ho-07.6 Decision 5): a soft amber glow at each risen
 * peak's summit — the beacons of Gondor, lit as the peak rises (a peak appears
 * with its beacon, so the lighting follows the rise for free). Three stacked
 * circles — a wide faint halo, a mid glow, a small bright core — in flame amber,
 * never terracotta. Steady, not pulsing. Weight by `beaconOpacity` (0 hides it).
 * @param {import('./field.js').PositionedPeak[]} peaks
 */
const beaconSvg = (peaks) => {
  const op = tuners.beaconOpacity;
  if (op <= 0) return '';
  return peaks
    .map(
      (p) =>
        `<g><circle cx="${p.x.toFixed(1)}" cy="${p.y.toFixed(1)}" r="9" fill="${BEACON_AMBER}" opacity="${(0.18 * op).toFixed(3)}"/>` +
        `<circle cx="${p.x.toFixed(1)}" cy="${p.y.toFixed(1)}" r="3.4" fill="${BEACON_AMBER}" opacity="${(0.55 * op).toFixed(3)}"/>` +
        `<circle cx="${p.x.toFixed(1)}" cy="${p.y.toFixed(1)}" r="1.3" fill="${BEACON_AMBER}" opacity="${Math.min(1, 0.95 * op).toFixed(3)}"/></g>`,
    )
    .join('');
};

const LABEL_MAX_CHARS = 20; // wrap long titles to a carriage return at word boundaries
const LABEL_LINE_HEIGHT = 14;

/** Word-wrap a label (case preserved) to lines of at most LABEL_MAX_CHARS. @param {string} name @returns {string[]} */
const wrapLabel = (name) => {
  const words = (name || '').split(/\s+/).filter(Boolean);
  /** @type {string[]} */
  const lines = [];
  let cur = '';
  for (const w of words) {
    if (cur && cur.length + 1 + w.length > LABEL_MAX_CHARS) {
      lines.push(cur);
      cur = w;
    } else {
      cur = cur ? `${cur} ${w}` : w;
    }
  }
  if (cur) lines.push(cur);
  return lines;
};

/**
 * Town label — the *authorial voice* (ho-07.6 Decision 4, brand-grounded): italic,
 * mixed-case, muted ink, tightly tracked — distinct from the peak's monumental
 * upright caps. Writing about the work speaks in italic; terracotta stays reserved
 * for the cathedral landmark and ho-09 interaction. Cream halo so it reads clear of
 * the contours.
 */
const townLabel = (/** @type {number} */ x, /** @type {number} */ y, /** @type {string} */ name, /** @type {number} */ scale) => {
  const lines = wrapLabel(name);
  const tspans = lines
    .map((ln, i) => `<tspan x="${x.toFixed(1)}" dy="${i === 0 ? 0 : (LABEL_LINE_HEIGHT * scale).toFixed(1)}">${ln}</tspan>`)
    .join('');
  return (
    `<text x="${x.toFixed(1)}" y="${y.toFixed(1)}" text-anchor="middle" font-family="Spectral, Georgia, serif" ` +
    `font-style="italic" font-size="${(12.5 * scale).toFixed(1)}" fill="#6B6B6B" style="letter-spacing:0.04em;" ` +
    `paint-order="stroke" stroke="#FDFCF9" stroke-width="${(3 * scale).toFixed(1)}" stroke-linejoin="round">${tspans}</text>`
  );
};

/**
 * One town at a build fraction (ho-07.6 Decision 1). `fraction` 0→1 reveals its
 * houses one at a time with the cathedral raised last (revealedBlocks); the label
 * appears only once the town is essentially built, so a town announces itself when
 * it stands, not while it's a building site. Non-matching towns dim and drop their
 * label. fraction 1 is the finished town — the resting render uses it.
 * @param {import('./cartographer.js').CartographyTown} t @param {number} fraction
 */
const oneTownSvg = (t, fraction) => {
  const blocks = settlementSvg(revealedBlocks(t.blocks, fraction));
  const g = `<g transform="translate(${t.seat.x.toFixed(1)},${t.seat.y.toFixed(1)})">${blocks}</g>`;
  if (!t.match) return `<g opacity="0.1">${g}</g>`;
  const label =
    fraction >= 0.999 ? `<g>${townLabel(t.seat.x, t.seat.y + t.extent + 14, t.name, tuners.labelScale)}</g>` : '';
  return g + label;
};

/** All towns at full (the resting render). @param {import('./cartographer.js').CartographyTown[]} towns */
const townsSvg = (towns) => towns.map((t) => oneTownSvg(t, 1)).join('');

/**
 * The corpus-floor marker (ho-07.2 Decision 5): a faint dashed horizon near the
 * field's base with a small caption, marking 2025-11-11 — where the dense record
 * begins. Present from the first emergence frame and at rest; the 2022 floor work
 * (aspirational-intelligence) is a real peak and renders through the field. Weight
 * is by-feel (tuner `floorMarkerOpacity`); 0 hides it.
 */
const corpusFloorSvg = () => {
  const op = tuners.floorMarkerOpacity;
  if (op <= 0) return '';
  // Pulled up off the bottom edge and given a readable caption so it can actually
  // be seen and judged (ho-07.6 Decision 6 — it was invisible at y≈610).
  const y = 588;
  return (
    `<g opacity="${op}">` +
    `<line x1="60" y1="${y}" x2="940" y2="${y}" stroke="#9A958B" stroke-width="0.8" stroke-dasharray="1 6" stroke-linecap="round"/>` +
    `<text x="60" y="${y - 6}" font-family="Spectral, Georgia, serif" font-style="italic" font-size="9.5" fill="#9A958B" ` +
    `style="letter-spacing:0.12em;">${CORPUS_FLOOR.label} · 2025</text>` +
    `</g>`
  );
};

/**
 * The rename re-glow (ho-07.6 Decision 2, replacing ho-07.2's terracotta rings):
 * a soft amber swell at each renamed peak's beacon that brightens and settles —
 * a glow in the fade language, not a hard ring. Same warm hue as the beacon, so
 * the rename reads as the peak's fire flaring up at its naming. The `emgReglow`
 * keyframe (cartography.html) swells then eases out.
 * @param {string[]} ids @param {import('./field.js').PositionedPeak[]} peaks
 */
const reglowSvg = (ids, peaks) =>
  ids
    .map((id) => {
      const p = peaks.find((q) => q.id === id);
      if (!p) return '';
      return (
        `<circle cx="${p.x.toFixed(1)}" cy="${p.y.toFixed(1)}" r="16" fill="${BEACON_AMBER}" ` +
        `style="animation:emgReglow ${tuners.pulseMs}ms ease-out;"/>`
      );
    })
    .join('');

/** Update the seed / pinned readouts and the theme chips. */
const renderMeta = () => {
  seedOut.textContent = String(carto.activeSeed());
  pinned.textContent = gate.currentSeed() == null ? '(ephemeral — reload reseeds)' : '(pinned by ?seed)';
  renderChips();
};

/**
 * The SVG for one reveal state — the static map seen through an emergence step:
 * the field scaled to the risen peaks, only the arrived towns drawn, labels for
 * risen peaks (computeField already drops not-yet-risen ones), the corpus-floor
 * marker, and a pulse flash on a pulse step. With the final step's scale this is
 * byte-equivalent to the static render — the snap target.
 * @param {import('./emergence.js').EmergenceStep} step
 * @returns {string}
 */
const frameSvg = (step) => {
  const seed = carto.activeSeed();
  const state = gate.currentState();
  const field = computeField(indexer, state, seed, { ...tuners, emergenceScale: scaleFn(step) });
  let svg = corpusFloorSvg();
  svg += contourMapSvg(field.heightfield, {
    interval: tuners.interval,
    weightRegular: tuners.weightRegular,
    weightIndex: tuners.weightIndex,
  });
  svg += beaconSvg(field.peaks);
  svg += peakLabelsSvg(field.peaks, tuners.labelScale, true); // names fade in offset
  if (showPeaks) svg += peakDotsSvg(field.peaks);
  if (step.kind === 'pulse') svg += reglowSvg(step.ids, field.peaks);
  return svg;
};

const render = () => {
  // The resting / static path (filter toggles, reseed-less re-render). A fully
  // revealed map: every peak at scale 1, so this equals the emergence end frame.
  const seed = carto.activeSeed();
  const state = gate.currentState();
  const field = computeField(indexer, state, seed, tuners);
  const towns = computeTowns(indexer, state, field, {
    ...tuners,
    thresholds: [tuners.t1, tuners.t2, tuners.t3],
  });
  let svg = corpusFloorSvg();
  svg += contourMapSvg(field.heightfield, {
    interval: tuners.interval,
    weightRegular: tuners.weightRegular,
    weightIndex: tuners.weightIndex,
  });
  svg += townsSvg(towns);
  svg += beaconSvg(field.peaks); // signal-fire beacons, always on at rest
  svg += peakLabelsSvg(field.peaks, tuners.labelScale); // real peak labels (variant B), always on
  if (showPeaks) svg += peakDotsSvg(field.peaks); // debug id dots, on toggle
  map.innerHTML = svg;
  seedOut.textContent = String(seed);
  pinned.textContent = gate.currentSeed() == null ? '(ephemeral — reload reseeds)' : '(pinned by ?seed)';
  renderChips();
};

// ── The emergence player ──────────────────────────────────────────────────
// The only stateful, timer-driven piece (ho-07.2 Decision 1). It walks the pure
// plan (src/emergence.js), cross-fading each beat over the previous on the
// compositor while the next beat's field computes on the main thread during the
// hold. Filter changes render statically (Decision 6); a filter/reseed/tuner
// change mid-play cancels cleanly and snaps to the final state.

const timeline = buildEmergenceTimeline(indexer);
window.emergence = { timeline, plan: () => emergencePlan(timeline) };

/** Honour prefers-reduced-motion: the whole animation short-circuits to the end frame. */
const reduceMotion = () =>
  typeof window.matchMedia === 'function' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

let prevSvg = '';
/** Bumped on every (re)start or cancel so stale timers from a prior run no-op. */
let playToken = 0;
/** @type {ReturnType<typeof setTimeout> | null} */
let beatTimer = null;

/**
 * The pre-rise baseline: the floor present, nothing risen yet (Decision 5).
 * @returns {import('./emergence.js').EmergenceStep}
 */
const floorStep = () => ({
  index: -1,
  kind: 'hold',
  date: null,
  ids: [],
  peakScale: new Set(timeline.floorIds),
  towns: new Set(),
});

/**
 * Paint a step. `animate` stacks it over the previous frame with the `emgIn`
 * cross-fade; otherwise it replaces outright (the snap / static cases).
 * @param {import('./emergence.js').EmergenceStep} step
 * @param {boolean} animate
 */
const paint = (step, animate) => {
  const svg = frameSvg(step);
  map.innerHTML = animate
    ? `<g>${prevSvg}</g><g style="animation:emgIn ${tuners.fadeMs}ms ease-out;">${svg}</g>`
    : svg;
  prevSvg = svg;
};

/** Stop any running emergence; subsequent stale ticks see a changed token and no-op. */
const cancelEmergence = () => {
  playToken++;
  if (beatTimer !== null) {
    clearTimeout(beatTimer);
    beatTimer = null;
  }
};

/**
 * Cancel any running emergence and render the fully-emerged static map. This is
 * the single snap target: the cancellation end (filter / reseed / tuner mid-play
 * snap to final, Decision 6), the reduced-motion end, and the post-emergence
 * settle all land here, and it equals the proven-equal final emergence frame.
 */
const staticRender = () => {
  cancelEmergence();
  prevSvg = '';
  render();
};

/**
 * The writing phase (ho-07.6 Decision 1). The world is risen and frozen, so the
 * heavy field + contours are computed once and only the cheap settlement layer
 * animates: each arrive beat builds its town(s) house-by-house (revealedBlocks
 * eased over townBuildMs via rAF), cathedral last, while already-arrived towns
 * stand built. No re-contour anywhere here. Settles to the static map at the end.
 * @param {import('./emergence.js').EmergenceStep[]} writeSteps @param {number} token
 */
const playWriting = (writeSteps, token) => {
  const seed = carto.activeSeed();
  const state = gate.currentState();
  const field = computeField(indexer, state, seed, tuners); // full terrain, once
  const allTowns = computeTowns(indexer, state, field, {
    ...tuners,
    thresholds: [tuners.t1, tuners.t2, tuners.t3],
  });
  const byId = new Map(allTowns.map((t) => [t.id, t]));
  const terrain =
    corpusFloorSvg() +
    contourMapSvg(field.heightfield, {
      interval: tuners.interval,
      weightRegular: tuners.weightRegular,
      weightIndex: tuners.weightIndex,
    }) +
    beaconSvg(field.peaks) +
    peakLabelsSvg(field.peaks, tuners.labelScale) +
    (showPeaks ? peakDotsSvg(field.peaks) : '');

  /** @type {import('./cartographer.js').CartographyTown[]} */
  const built = [];
  const paintTowns = (/** @type {string[]} */ buildingIds, /** @type {number} */ fraction) => {
    let layer = built.map((t) => oneTownSvg(t, 1)).join('');
    for (const id of buildingIds) {
      const t = byId.get(id);
      if (t) layer += oneTownSvg(t, fraction);
    }
    map.innerHTML = `<g>${terrain}</g><g>${layer}</g>`;
  };

  let si = 0;
  const buildStep = () => {
    if (token !== playToken) return;
    if (si >= writeSteps.length) {
      beatTimer = setTimeout(() => {
        if (token === playToken) staticRender();
      }, tuners.fadeMs);
      return;
    }
    const ids = writeSteps[si].ids;
    const start = performance.now();
    const frame = () => {
      if (token !== playToken) return;
      const f = Math.min(1, (performance.now() - start) / Math.max(1, tuners.townBuildMs));
      paintTowns(ids, f);
      if (f < 1) {
        requestAnimationFrame(frame);
      } else {
        for (const id of ids) {
          const t = byId.get(id);
          if (t) built.push(t);
        }
        si += 1;
        beatTimer = setTimeout(buildStep, TOWN_GAP_MS);
      }
    };
    requestAnimationFrame(frame);
  };
  paintTowns([], 0); // the frozen terrain, no towns yet
  buildStep();
};

/**
 * Play the world-then-writing emergence from the floor (load and reseed; Decision
 * 6). The world walks beat-by-beat with the cross-fade; after the held breath, the
 * writing phase builds the towns house-by-house over the frozen terrain.
 */
const playEmergence = () => {
  cancelEmergence();
  const token = playToken;
  const plan = emergencePlan(timeline);
  renderMeta();
  if (reduceMotion() || plan.length === 0) {
    prevSvg = '';
    render();
    return;
  }
  const worldSteps = plan.filter((s) => s.kind !== 'arrive');
  const writeSteps = plan.filter((s) => s.kind === 'arrive');
  // Baseline: the floor frame, then world beats fade in over it.
  prevSvg = frameSvg(floorStep());
  map.innerHTML = prevSvg;
  let i = 0;
  const worldTick = () => {
    if (token !== playToken) return; // a newer run (or a cancel) superseded this one
    const step = worldSteps[i];
    paint(step, true);
    i += 1;
    const dwell = step.kind === 'hold' ? tuners.holdMs : step.kind === 'pulse' ? tuners.pulseMs : tuners.beatMs;
    if (i < worldSteps.length) {
      beatTimer = setTimeout(worldTick, dwell);
    } else {
      // The world is up; after the breath, build the writing.
      beatTimer = setTimeout(() => {
        if (token === playToken) playWriting(writeSteps, token);
      }, dwell);
    }
  };
  if (worldSteps.length === 0) playWriting(writeSteps, token);
  else worldTick();
};

tunersEl.innerHTML = TUNER_SPECS.map(
  (t) =>
    `<label class="tuner"><span class="tname">${t.label}</span>` +
    `<input type="range" data-key="${t.key}" min="${t.min}" max="${t.max}" step="${t.step}" value="${tuners[t.key]}" />` +
    `<span class="tval" data-val="${t.key}">${tuners[t.key]}</span></label>`,
).join('');

tunersEl.addEventListener('input', (ev) => {
  const el = ev.target;
  if (!(el instanceof HTMLInputElement) || !el.dataset.key) return;
  const key = el.dataset.key;
  tuners[key] = Number(el.value);
  const out = tunersEl.querySelector(`[data-val="${key}"]`);
  if (out) out.textContent = el.value;
  // Dialing a tuner cancels any run and shows the effect on the full map at once;
  // re-watch the emergence with a new value via Reseed (Decision 7 workflow).
  staticRender();
});

// Filter changes are exploration, not re-narration — render statically and snap
// any in-flight emergence to the final state (Decision 6).
gate.onChange(staticRender);

// A fresh layout earns a fresh becoming — reseed replays the emergence (Decision 6).
document.getElementById('reseed')?.addEventListener('click', () => {
  carto.reseed();
  playEmergence();
});

document.getElementById('togglePeaks')?.addEventListener('change', (ev) => {
  showPeaks = ev.target instanceof HTMLInputElement ? ev.target.checked : false;
  staticRender();
});

chipsEl.addEventListener('click', (ev) => {
  const btn = ev.target instanceof Element ? ev.target.closest('[data-theme]') : null;
  if (!(btn instanceof HTMLElement) || !btn.dataset.theme) return;
  const current = gate.currentState().themes;
  const t = btn.dataset.theme;
  gate.setState({
    themes: current.includes(t) ? current.filter((v) => v !== t) : [...current, t],
  });
});

// On load: the map emerges. Reduced-motion and the empty case fall through to
// the static render inside playEmergence.
playEmergence();
