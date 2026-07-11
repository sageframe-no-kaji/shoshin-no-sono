/**
 * Cartography page entry (ho-06 contours + ho-07 towns, grown through ho-08
 * features and the ho-A hachure sidequest) — browser wiring plus the
 * timer-driven emergence player, excluded from coverage (vitest.config.mjs)
 * like src/main.js. The pure logic that had accumulated here now lives in
 * tested modules: labels, the glow filter, and collision placement in
 * src/label-map.js; beacons and the corpus-floor marker in src/beacon-map.js;
 * road/trail edge assembly in src/cartographer.js; the settlement ink lerp in
 * src/settlement-map.js. What remains is genuinely wiring: DOM lookups, the
 * tuner panel + layer/chip event handlers, render orchestration that passes
 * explicit tuner/Gate values into the pure modules, and the emergence player's
 * timers / rAF / playToken state machine. Boots the Indexer + Gate +
 * Cartographer and renders, in register order: paper → contour map
 * (src/contour-map.js) → settlements (src/settlement-map.js) → labels.
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
import {
  createCartographer,
  computeField,
  computeTowns,
  computeRoadEdges,
  computeTrailEdges,
} from './cartographer.js';
import { contourMapSvg } from './contour-map.js';
import { hachureMapSvg } from './hachure-map.js';
import { settlementSvg, settlementClearingSvg, townInkColor } from './settlement-map.js';
import { revealedBlocks } from './settlements.js';
import { chipVocabulary } from './grid.js';
import { buildEmergenceTimeline, emergencePlan, scaleFn } from './emergence.js';
import { computeRoadRoutes, roadsSvgFromRoutes, trailsSvg } from './feature-map.js';
import { waterSvg } from './water-map.js';
import { REGISTER } from './register.js';
import {
  labelGlowFilter,
  peakLabel,
  peakNameScale,
  townLabelSvg,
  placeNameLayer,
  elevationLabelsSvg,
} from './label-map.js';
import { beaconSvg, corpusFloorSvg } from './beacon-map.js';

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
  // register line weights — landed at 0.15 / 0.4 by feel (ho-07.6), locked
  weightRegular: 0.15,
  weightIndex: 0.4,
  peakLabelScale: 0.5, // peak label BASE type size (ho-07.6)
  importanceScale: 0.6, // how much a peak's importance scales its label, like a real map (ho-07.6)
  townLabelScale: 0.85, // town label type — its own dial (ho-07.6)
  townInk: 0.32, // settlement building lightness 0 (ink) → 1 (light warm grey) — ho-07.6

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
  fadeMs: 320, // terrain cross-fade between beats (the rise gesture)
  nameDelayMs: 580, // WHEN a peak name starts fading in, after its peak rises (ho-07.6)
  nameFadeMs: 2000, // HOW LONG the peak name takes to fade in (ho-07.6)
  perHouseMs: 28, // build time PER HOUSE — town build scales with house count (ho-07.6)
  townLabelGap: 0, // gap from a settlement's OUTER edge to its label
  beaconOpacity: 1.85, // the per-peak signal-fire beacon weight (ho-A-6.0: relanded from ho-07.6's 1.0)
  floorMarkerOpacity: 0.45, // the 2025-11-11 corpus-floor horizon marker weight
  elevationScale: 1.5, // size of the USGS elevation (iso) labels (ho-07.6)

  // ho-A-6.0 hachure renderer (sidequest off ho-06) — by-feel landings against the
  // real corpus, screenshot at seed=12345 (Reflect pending).
  hachureSampleStep: 2,
  hachureSlopeFloor: 0.005,
  hachureSlopeRef: 0.05,
  hachureLenBase: 3.8,
  hachureLenScale: 5,
  hachureWBase: 0.05,
  hachureWScale: 0.4,
  hachurePosJitter: 1.05,
  hachureAngleJitter: 0.15,
  hachureShoreFade: 0.06, // hachures leave the gentle shore blank; cliffs keep theirs (ho-08)

  // Label + beacon + overlay dials (ho-A-6.0) — landed values from the
  // by-feel pass and locked as the sidequest baseline.
  labelRed: 0,           // muted dark — user dialed back from terracotta
  labelGlow: 1.0,        // matches the filter dilation baseline
  beaconImportance: 0.6, // landed at 0.6 — full spread was too aggressive on low-imp peaks
  // ho-A-6.1: isoOverlayWeight retired. Independent layers means the iso
  // renderer uses weightRegular/weightIndex directly when its layer is on.
  hachureImportance: 0.6, // density gates at log-scaled local elevation

  // ho-08 features (session-5 register)
  margin: 110, // field keep-out border — padded up from ho-05's 70 so a sea exists (ho-08 datum)
  waveThreshold: 0.18,
  coastWeight: 0.7, // coastline stroke weight
  waterlineCount: 4, // waterline offsets hugging the coast
  waveOpacity: 0.5, // waterline ink strength
  waveIntensity: 0.35, // wave texture: horizontal water strokes in the open sea
  roadFollow: 0.7, // road terrain-following strength — least-resistance routing
  roadClear: 1.25, // road cream casing beyond the rails, per side
  trailFollow: 0.35, // trail terrain-following strength — weaker; trails tolerate grade
  trailWeight: 0.7, // single stroke weight, rail and rungs alike
  trailTick: 2.2, // rung half-length in px
  trailClear: 1.6, // cream halo width — 0 is the session-5 uncased lock; >0 is the legibility dial
};

/** Every field computation shares this opts slice: the tuners plus the ho-08
 * sea datum (sea level as a fraction of the raw field max — the heightfield
 * arrives with the sea already flattened to zero). */
const fieldOpts = () => ({ ...tuners, seaFraction: tuners.waveThreshold });

/** Gap between consecutive town builds in the writing phase (not a by-feel tuner). */
const TOWN_GAP_MS = 140;
/** Annotation grey for the debug peak-id text — NOT a register color. */
const ANNOTATION_GREY = '#6B6B6B';

/**
 * The label opts every label renderer reads (src/label-map.js) — the tuner
 * dials plus the Gate's hachure-layer flag, resolved here because only the
 * page talks to the Gate.
 * @returns {import('./label-map.js').LabelOpts}
 */
const labelOpts = () => ({
  labelRed: tuners.labelRed,
  labelGlow: tuners.labelGlow,
  hachure: gate.currentLayers().hachure,
});

/** The full opts slice for the place-name layer and town labels. @returns {import('./label-map.js').PlaceNameOpts} */
const nameLayerOpts = () => ({
  ...labelOpts(),
  peakLabelScale: tuners.peakLabelScale,
  importanceScale: tuners.importanceScale,
  townLabelScale: tuners.townLabelScale,
  townLabelGap: tuners.townLabelGap,
});

/**
 * Tuner spec shape. `locked`: landed in a prior ho (frozen register / ho-06.5
 * field / ho-07.5 towns / ho-A landings) — greyed but still movable, so any
 * active dials in the current ho are obvious. `reseed`: a pure-animation
 * timing dial whose effect only shows during the emergence, so it needs a
 * reseed to watch (marked with ★).
 * @typedef {{ key: string, label: string, min: number, max: number, step: number, locked?: boolean, reseed?: boolean }} TunerSpec
 */

/** Iso-layer terrain field + contour rendering. @type {TunerSpec[]} */
const ISO_TUNER_SPECS = [
  { key: 'interval', label: 'ring spacing', min: 0.3, max: 1.5, step: 0.02, locked: true },
  { key: 'summitExp', label: 'summit sharpness', min: 1.0, max: 3.0, step: 0.05, locked: true },
  { key: 'noiseWeight', label: 'crenellation', min: 0, max: 2.0, step: 0.05, locked: true },
  { key: 'radiusBase', label: 'base radius', min: 12, max: 60, step: 2, locked: true },
  { key: 'radiusScale', label: 'radius × importance', min: 4, max: 40, step: 1, locked: true },
  { key: 'relevanceFloor', label: 'sink floor (filtered)', min: 0, max: 0.6, step: 0.01, locked: true },
  { key: 'weightRegular', label: 'line weight (regular)', min: 0.05, max: 1.0, step: 0.05, locked: true },
  { key: 'weightIndex', label: 'line weight (index)', min: 0.1, max: 2.0, step: 0.05, locked: true },
  { key: 'floorMarkerOpacity', label: 'corpus-floor marker', min: 0, max: 0.8, step: 0.05, locked: true },
];

/** Hachure-layer streamline rendering (ho-A-6.0). @type {TunerSpec[]} */
const HACHURE_TUNER_SPECS = [
  { key: 'hachureSampleStep', label: 'sample stride (px)', min: 2, max: 14, step: 1, locked: true },
  { key: 'hachureSlopeFloor', label: 'flat threshold', min: 0, max: 0.05, step: 0.001, locked: true },
  { key: 'hachureSlopeRef', label: 'steep ceiling', min: 0.05, max: 0.8, step: 0.01, locked: true },
  { key: 'hachureLenBase', label: 'stroke length (min)', min: 0, max: 6, step: 0.1, locked: true },
  { key: 'hachureLenScale', label: 'stroke length (slope)', min: 0, max: 12, step: 0.1, locked: true },
  { key: 'hachureWBase', label: 'stroke weight (min)', min: 0.05, max: 1, step: 0.01, locked: true },
  { key: 'hachureWScale', label: 'stroke weight (slope)', min: 0, max: 2, step: 0.05, locked: true },
  { key: 'hachurePosJitter', label: 'position jitter (px)', min: 0, max: 2, step: 0.05, locked: true },
  { key: 'hachureAngleJitter', label: 'angle jitter (rad)', min: 0, max: 0.6, step: 0.01, locked: true },
  { key: 'hachureImportance', label: 'density by importance', min: 0, max: 1, step: 0.05, locked: true },
  { key: 'hachureShoreFade', label: 'shore fade (cliffs keep)', min: 0, max: 0.2, step: 0.005 },
];

/** Town placement and building rendering. @type {TunerSpec[]} */
const TOWN_TUNER_SPECS = [
  { key: 'anchorBias', label: 'anchor bias (p)', min: 1, max: 6, step: 0.1, locked: true },
  { key: 'strengthFull', label: 'strength → seated', min: 1, max: 6, step: 0.5, locked: true },
  { key: 'footOffset', label: 'foot offset', min: 0, max: 160, step: 4, locked: true },
  { key: 'elongK', label: 'valley elongation', min: 0, max: 12, step: 0.5, locked: true },
  { key: 'contourFollow', label: 'contour follow', min: 0, max: 1, step: 0.05, locked: true },
  { key: 'density', label: 'town density', min: 0.5, max: 3, step: 0.1, locked: true },
  { key: 'extentScale', label: 'density × weight', min: 0, max: 1, step: 0.05, locked: true },
  { key: 't1', label: 'size: hamlet→village', min: 0.2, max: 1.4, step: 0.05, locked: true },
  { key: 't2', label: 'size: village→town', min: 0.8, max: 1.8, step: 0.05, locked: true },
  { key: 't3', label: 'size: town→city', min: 1.0, max: 2.2, step: 0.05, locked: true },
  { key: 'townInk', label: 'building lightness', min: 0, max: 1, step: 0.02, locked: true },
];

/** Place names, iso elevation labels, town labels, and label treatment. @type {TunerSpec[]} */
const LABEL_TUNER_SPECS = [
  { key: 'elevationScale', label: 'iso label size', min: 0.4, max: 2.5, step: 0.05, locked: true },
  { key: 'peakLabelScale', label: 'peak label size', min: 0.3, max: 1.4, step: 0.05, locked: true },
  { key: 'importanceScale', label: 'label × importance', min: 0, max: 2, step: 0.05, locked: true },
  { key: 'townLabelScale', label: 'town label size', min: 0.3, max: 1.4, step: 0.05, locked: true },
  { key: 'townLabelGap', label: 'town label gap', min: 0, max: 40, step: 1, locked: true },
  { key: 'labelRed', label: 'label red', min: 0, max: 1.5, step: 0.05, locked: true },
  { key: 'labelGlow', label: 'label glow', min: 0, max: 3, step: 0.05, locked: true },
];

/** Beacon (signal-fire) rendering at peak summits. @type {TunerSpec[]} */
const BEACON_TUNER_SPECS = [
  { key: 'beaconOpacity', label: 'beacon weight', min: 0, max: 5, step: 0.05, locked: true },
  { key: 'beaconImportance', label: 'beacon by importance', min: 0, max: 1, step: 0.05, locked: true },
];

/** Emergence animation timings (★ reseed to watch). @type {TunerSpec[]} */
const EMERGENCE_TUNER_SPECS = [
  { key: 'beatMs', label: 'rise beat (ms)', min: 80, max: 800, step: 20, reseed: true, locked: true },
  { key: 'fadeMs', label: 'terrain cross-fade (ms)', min: 0, max: 900, step: 20, reseed: true, locked: true },
  { key: 'nameDelayMs', label: 'name: when (ms)', min: 0, max: 1200, step: 20, reseed: true, locked: true },
  { key: 'nameFadeMs', label: 'name: fade (ms)', min: 40, max: 4000, step: 20, reseed: true, locked: true },
  { key: 'holdMs', label: 'world→writing breath (ms)', min: 0, max: 2000, step: 50, reseed: true, locked: true },
  { key: 'perHouseMs', label: 'build: ms / house', min: 4, max: 120, step: 2, reseed: true, locked: true },
];

let showPeaks = false;
// ho-A-6.1: showIsos removed. The iso overlay use-case is now "iso layer on
// AND hachure layer on" via independent gate flags.

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
        `<g opacity="0.75"><circle cx="${p.x.toFixed(1)}" cy="${p.y.toFixed(1)}" r="2.5" fill="${REGISTER.terra}"/>` +
        `<text x="${(p.x + 5).toFixed(1)}" y="${(p.y + 3).toFixed(1)}" font-family="Spectral, Georgia, serif" font-size="9" fill="${ANNOTATION_GREY}">${p.id}</text></g>`,
    )
    .join('');

/**
 * One town at a build fraction (ho-07.6 Decision 1). Houses appear in build order
 * (cathedral last, via revealedBlocks) and each one *fades* in rather than popping:
 * the fully-built houses draw solid, and the one currently going up draws at the
 * fractional opacity between houses — so construction reads smooth. Non-matching
 * towns dim; the label appears once the town essentially stands. `drawLabel` false
 * omits it, so the resting render can place all labels on one collision-checked
 * layer above everything.
 * @param {import('./cartographer.js').CartographyTown} t @param {number} fraction @param {boolean} [drawLabel]
 */
const oneTownSvg = (t, fraction, drawLabel = true) => {
  const ordered = revealedBlocks(t.blocks, 1); // all blocks, build order (houses → cathedral)
  const n = ordered.length;
  const pos = Math.max(0, Math.min(1, fraction)) * n;
  const fullCount = Math.floor(pos);
  const fade = pos - fullCount; // the in-progress house's opacity
  const ink = townInkColor(tuners.townInk);
  const visible = ordered.slice(0, fullCount);
  let inner = settlementClearingSvg(visible, 4) + settlementSvg(visible, { ink });
  if (fullCount < n && fade > 0.001) {
    inner += `<g opacity="${fade.toFixed(2)}">${settlementSvg([ordered[fullCount]], { ink })}</g>`;
  }
  const g = `<g transform="translate(${t.seat.x.toFixed(1)},${t.seat.y.toFixed(1)})">${inner}</g>`;
  if (!t.match) return `<g opacity="0.1">${g}</g>`;
  return drawLabel && fraction >= 0.999 ? g + townLabelSvg(t, nameLayerOpts()) : g;
};

/** All town buildings at full, no labels (the resting render places labels on top). @param {import('./cartographer.js').CartographyTown[]} towns */
const townsSvg = (towns) => towns.map((t) => oneTownSvg(t, 1, false)).join('');

/**
 * The collision-checked place-name layer for the resting map (src/label-map.js):
 * this wrapper resolves each peak's and town's work via the Indexer — name,
 * native script, importance — and hands label-map the pure inputs.
 * @param {import('./cartographer.js').CartographyField} field @param {import('./cartographer.js').CartographyTown[]} towns
 */
const placeNamesSvg = (field, towns) => {
  /** @type {import('./label-map.js').PeakLabelInput[]} */
  const peakInputs = [];
  for (const p of field.peaks) {
    const w = indexer.getWork(p.id);
    if (!w) continue;
    peakInputs.push({ x: p.x, y: p.y, name: w.name, native: w.native_script, importance: p.importance });
  }
  /** @type {import('./label-map.js').TownLabelInput[]} */
  const townInputs = towns.map((t) => ({
    seat: t.seat,
    extent: t.extent,
    name: t.name,
    match: t.match,
    importance: indexer.getWork(t.id)?.importance ?? 0,
  }));
  return placeNameLayer(peakInputs, townInputs, nameLayerOpts());
};

/** Update the seed / pinned readouts and the theme chips. */
const renderMeta = () => {
  seedOut.textContent = String(carto.activeSeed());
  pinned.textContent = gate.currentSeed() == null ? '(ephemeral — reload reseeds)' : '(pinned by ?seed)';
  renderChips();
};

/**
 * Render the terrain SVG for the active mode (ho-A-6.0). The iso renderer is
 * the committed register from ho-06; the hachure renderer is the sidequest
 * A/B. Both consume the same Heightfield; this wrapper picks which one and
 * passes the right tuner slice.
 * @param {import('./field.js').Heightfield} heightfield
 * @returns {string}
 */
const terrainSvg = (heightfield) => {
  const layers = gate.currentLayers();
  let svg = '';
  // Hachures paint first (under), so the iso scaffold reads on top when both
  // layers are on. When only hachures are on, the hachure renderer emits its
  // own cream paper. When only isos are on, the iso renderer emits paper.
  // When both are on, the iso paper rect is harmless (same color over hachure
  // paper). When neither is on, the page falls back to the corpus floor over
  // bare cream — legitimate "annotated empty paper" view.
  if (layers.hachure) {
    svg += hachureMapSvg(heightfield, {
      sampleStep: tuners.hachureSampleStep,
      slopeFloor: tuners.hachureSlopeFloor,
      slopeRef: tuners.hachureSlopeRef,
      lenBase: tuners.hachureLenBase,
      lenScale: tuners.hachureLenScale,
      wBase: tuners.hachureWBase,
      wScale: tuners.hachureWScale,
      posJitter: tuners.hachurePosJitter,
      angleJitter: tuners.hachureAngleJitter,
      importance: tuners.hachureImportance,
      shoreFade: tuners.hachureShoreFade,
      seed: carto.activeSeed(),
    });
  }
  if (layers.iso) {
    svg += contourMapSvg(heightfield, {
      interval: tuners.interval,
      weightRegular: tuners.weightRegular,
      weightIndex: tuners.weightIndex,
      // When hachures are also on, suppress the iso paper rect so the hachure
      // ground shows through.
      paper: layers.hachure ? 'transparent' : undefined,
    });
  }
  return svg;
};

/**
 * The terrain for one reveal step — corpus-floor marker, contours, beacons. NO
 * peak names (those live in the persistent overlay so their fades can outlast a
 * beat) and NO towns (the writing phase owns those). Returns the SVG and the
 * step's risen peaks, so the caller can place names for the newly-risen ones.
 * @param {import('./emergence.js').EmergenceStep} step
 * @returns {{ svg: string, peaks: import('./field.js').PositionedPeak[] }}
 */
const stepTerrain = (step) => {
  const field = computeField(indexer, gate.currentState(), carto.activeSeed(), {
    ...fieldOpts(),
    emergenceScale: scaleFn(step),
  });
  let svg = corpusFloorSvg({ floorMarkerOpacity: tuners.floorMarkerOpacity });
  svg += terrainSvg(field.heightfield);
  // steady during the cross-fade (no reset)
  svg += beaconSvg(field.peaks, {
    beaconOpacity: tuners.beaconOpacity,
    beaconImportance: tuners.beaconImportance,
  });
  if (showPeaks) svg += peakDotsSvg(field.peaks);
  return { svg, peaks: field.peaks };
};

/** One peak name, ready to append to the overlay, with its own WHEN/HOW-LONG fade. @param {import('./field.js').PositionedPeak} p */
const nameEl = (p) => {
  const w = indexer.getWork(p.id);
  if (!w) return '';
  const scale = peakNameScale(p.importance, {
    peakLabelScale: tuners.peakLabelScale,
    importanceScale: tuners.importanceScale,
  });
  const label = peakLabel(p.x, p.y - 12, w.name, w.native_script, scale, labelOpts());
  // ease-in-out for a smooth swell rather than a quick pop (ho-07.6).
  return `<g style="opacity:0;animation:emgIn ${tuners.nameFadeMs}ms ease-in-out ${tuners.nameDelayMs}ms forwards;">${label}</g>`;
};

/**
 * Roads and trails for the current field + towns. Edge assembly (Indexer
 * queries, road dedup, trail construction) is the Cartographer's job
 * (src/cartographer.js); src/feature-map.js renders the edges.
 * @param {import('./cartographer.js').CartographyField} field
 * @param {import('./cartographer.js').CartographyTown[]} towns
 * @returns {string}
 */
const featuresSvg = (field, towns) => {
  const floor = tuners.waveThreshold > 0 ? 0.02 * field.heightfield.max : undefined;
  const roadRoutes = computeRoadRoutes(computeRoadEdges(indexer, towns), field.heightfield, {
    follow: tuners.roadFollow,
    floor,
  });
  // Trails draw FIRST and roads paint over them — roads eat trails; the trail
  // router also keeps a minimal separation from the road corridors, so a trail
  // may run alongside a road but never on it.
  return (
    trailsSvg(computeTrailEdges(indexer, towns, field.peaks), field.heightfield, {
      follow: tuners.trailFollow,
      weight: tuners.trailWeight,
      tickHalf: tuners.trailTick,
      clear: tuners.trailClear,
      avoid: roadRoutes.map((r) => r.pts),
      floor,
    }) + roadsSvgFromRoutes(roadRoutes, { clear: tuners.roadClear })
  );
};

const render = () => {
  // The resting / static path (filter toggles, reseed-less re-render). A fully
  // revealed map: every peak at scale 1, so this equals the emergence end frame.
  const seed = carto.activeSeed();
  const state = gate.currentState();
  const field = computeField(indexer, state, seed, fieldOpts());
  const towns = computeTowns(indexer, state, field, {
    ...tuners,
    thresholds: [tuners.t1, tuners.t2, tuners.t3],
    seaFraction: tuners.waveThreshold,
  });
  const layers = gate.currentLayers();
  let svg = layers.hachure ? labelGlowFilter(tuners.labelGlow) : '';
  svg += terrainSvg(field.heightfield);
  // The sea paints over the terrain below the waterline, so it draws right
  // after the terrain; the corpus-floor marker and labels ride above it.
  svg += waterSvg(field.heightfield, {
    coastWeight: tuners.coastWeight,
    waterlines: tuners.waterlineCount,
    opacity: tuners.waveOpacity,
    waves: tuners.waveIntensity,
  });
  svg += corpusFloorSvg({ floorMarkerOpacity: tuners.floorMarkerOpacity });
  // Iso elevation labels are placed on iso lines — they only read when the
  // iso layer is on, regardless of hachures.
  if (layers.iso) svg += elevationLabelsSvg(field.heightfield, { elevationScale: tuners.elevationScale });
  svg += featuresSvg(field, towns);
  svg += townsSvg(towns); // settlement buildings (labels go on the top layer)
  // signal-fire beacons, breathing at rest
  svg += beaconSvg(field.peaks, {
    beaconOpacity: tuners.beaconOpacity,
    beaconImportance: tuners.beaconImportance,
    pulse: true,
  });
  if (showPeaks) svg += peakDotsSvg(field.peaks); // debug id dots, on toggle
  svg += placeNamesSvg(field, towns); // ALL place names, above everything, collision-checked
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

/** Stop any running emergence; subsequent stale ticks see a changed token and no-op. */
const cancelEmergence = () => {
  playToken++;
  if (beatTimer !== null) {
    clearTimeout(beatTimer);
    beatTimer = null;
  }
};

/**
 * Cancel any running emergence and render the fully-emerged static map — the single
 * snap target (filter / reseed / tuner mid-play, reduced-motion, and the
 * post-emergence settle all land here; it equals the proven-equal final frame).
 */
const staticRender = () => {
  cancelEmergence();
  render();
};

/**
 * The whole emergence runs over three persistent sibling layers inside #map:
 *   terr   — terrain (contours + beacons), cross-faded per world beat
 *   towns  — settlements, built house-by-house in the writing phase
 *   names  — peak names, APPENDED once each (insertAdjacentHTML) as their peak
 *            rises, never redrawn — so a name's WHEN/HOW-LONG fade plays its full
 *            length across as many beats as it needs, and standing names never
 *            re-flash (ho-07.6, fixing the truncated/flickering fade).
 * @returns {{ terr: Element, towns: Element, names: Element } | null}
 */
const makeLayers = () => {
  const defs = gate.currentLayers().hachure ? labelGlowFilter(tuners.labelGlow) : '';
  map.innerHTML = defs + '<g id="emgTerr"></g><g id="emgTowns"></g><g id="emgNames"></g>';
  const terr = map.querySelector('#emgTerr');
  const towns = map.querySelector('#emgTowns');
  const names = map.querySelector('#emgNames');
  return terr && towns && names ? { terr, towns, names } : null;
};

/**
 * The writing phase (ho-07.6 Decision 1): the world is frozen, so the heavy field +
 * contours are computed once into `terr` and only the cheap `towns` layer animates.
 * Each arrive beat builds its town(s) house-by-house (oneTownSvg fades each house
 * in; time scales with house count), cathedral last; built towns stand. The `names`
 * layer is left untouched — the peak names placed during the rise stay put.
 * @param {import('./emergence.js').EmergenceStep[]} writeSteps @param {number} token
 * @param {{ terr: Element, towns: Element }} layers
 */
const playWriting = (writeSteps, token, layers) => {
  const seed = carto.activeSeed();
  const state = gate.currentState();
  const field = computeField(indexer, state, seed, fieldOpts()); // full terrain, once
  const allTowns = computeTowns(indexer, state, field, {
    ...tuners,
    thresholds: [tuners.t1, tuners.t2, tuners.t3],
    seaFraction: tuners.waveThreshold,
  });
  const byId = new Map(allTowns.map((t) => [t.id, t]));
  // Freeze the terrain once (breathing beacons keep their phase); only `towns` redraws.
  layers.terr.innerHTML =
    terrainSvg(field.heightfield) +
    waterSvg(field.heightfield, {
    coastWeight: tuners.coastWeight,
    waterlines: tuners.waterlineCount,
    opacity: tuners.waveOpacity,
    waves: tuners.waveIntensity,
  }) +
    corpusFloorSvg({ floorMarkerOpacity: tuners.floorMarkerOpacity }) +
    (gate.currentLayers().iso
      ? elevationLabelsSvg(field.heightfield, { elevationScale: tuners.elevationScale })
      : '') +
    featuresSvg(field, allTowns) +
    beaconSvg(field.peaks, {
      beaconOpacity: tuners.beaconOpacity,
      beaconImportance: tuners.beaconImportance,
      pulse: true,
    }) +
    (showPeaks ? peakDotsSvg(field.peaks) : '');

  /** @type {import('./cartographer.js').CartographyTown[]} */
  const built = [];
  /** Build time for a beat scales with its house count: hamlets quick, cities slower. */
  const houseCount = (/** @type {string[]} */ ids) =>
    ids.reduce((n, id) => n + (byId.get(id)?.blocks.length ?? 0), 0);
  const paintTowns = (/** @type {string[]} */ buildingIds, /** @type {number} */ fraction) => {
    let layer = built.map((t) => oneTownSvg(t, 1)).join('');
    for (const id of buildingIds) {
      const t = byId.get(id);
      if (t) layer += oneTownSvg(t, fraction);
    }
    layers.towns.innerHTML = layer;
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
    const dur = Math.max(1, tuners.perHouseMs * Math.max(1, houseCount(ids)));
    const start = performance.now();
    const frame = () => {
      if (token !== playToken) return;
      const f = Math.min(1, (performance.now() - start) / dur);
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
  buildStep();
};

/**
 * Play the world-then-writing emergence from the floor (load and reseed; Decision
 * 6). The world walks beat-by-beat: the `terr` layer cross-fades the new terrain
 * while each newly-risen peak's name is appended to the persistent `names` layer to
 * fade in on its own schedule. After the held breath, the writing phase builds the
 * towns over the frozen terrain.
 */
const playEmergence = () => {
  cancelEmergence();
  const token = playToken;
  const plan = emergencePlan(timeline);
  renderMeta();
  const layers = reduceMotion() || plan.length === 0 ? null : makeLayers();
  if (!layers) {
    render();
    return;
  }
  // The rename pulse is retired (ho-07.6 Decision 2 — it never read); pulse beats
  // are simply not played, so renamed peaks rise once and stay like the rest.
  const worldSteps = plan.filter((s) => s.kind === 'rise' || s.kind === 'hold');
  const writeSteps = plan.filter((s) => s.kind === 'arrive');
  const placed = new Set();

  /** Append names for any not-yet-placed risen peaks; existing names are untouched. */
  const placeNames = (/** @type {import('./field.js').PositionedPeak[]} */ peaks) => {
    let add = '';
    for (const p of peaks) {
      if (placed.has(p.id)) continue;
      placed.add(p.id);
      add += nameEl(p);
    }
    if (add) layers.names.insertAdjacentHTML('beforeend', add);
  };

  let prevTerr = '';
  const showTerrain = (/** @type {import('./emergence.js').EmergenceStep} */ step, /** @type {boolean} */ animate) => {
    const { svg, peaks } = stepTerrain(step);
    layers.terr.innerHTML = animate
      ? `<g>${prevTerr}</g><g style="animation:emgIn ${tuners.fadeMs}ms ease-out;">${svg}</g>`
      : svg;
    prevTerr = svg;
    placeNames(peaks);
  };

  // Baseline: the floor terrain + the floor name(s), present from frame 0.
  showTerrain(floorStep(), false);

  let i = 0;
  const worldTick = () => {
    if (token !== playToken) return; // a newer run (or a cancel) superseded this one
    showTerrain(worldSteps[i], true);
    const dwell = worldSteps[i].kind === 'hold' ? tuners.holdMs : tuners.beatMs;
    i += 1;
    if (i < worldSteps.length) {
      beatTimer = setTimeout(worldTick, dwell);
    } else {
      // The world is up; after the breath, build the writing.
      beatTimer = setTimeout(() => {
        if (token === playToken) playWriting(writeSteps, token, layers);
      }, dwell);
    }
  };
  if (worldSteps.length === 0) playWriting(writeSteps, token, layers);
  else worldTick();
};

/**
 * Render the full tuner panel. Six always-visible sections grouped by the
 * thing each dial actually drives: iso terrain rendering, hachure terrain
 * rendering, town placement and buildings, label sizing and treatment,
 * beacon weight, and emergence timing. Replaces the earlier three-section
 * layout (iso/hachure/universal) where "iso" was a grab bag and "universal"
 * was a catch-all.
 * @type {{title: string, specs: TunerSpec[]}[]}
 */
const TUNER_SECTIONS = [
  { title: 'iso', specs: ISO_TUNER_SPECS },
  { title: 'hachure', specs: HACHURE_TUNER_SPECS },
  { title: 'towns', specs: TOWN_TUNER_SPECS },
  { title: 'labels', specs: LABEL_TUNER_SPECS },
  { title: 'beacons', specs: BEACON_TUNER_SPECS },
  { title: 'emergence', specs: EMERGENCE_TUNER_SPECS },
  { title: 'features', specs: [
    { key: 'margin', label: 'coast padding', min: 70, max: 220, step: 5 },
    { key: 'waveThreshold', label: 'sea level', min: 0, max: 0.5, step: 0.01 },
    { key: 'coastWeight', label: 'coastline weight', min: 0.2, max: 2.5, step: 0.05 },
    { key: 'waterlineCount', label: 'waterlines (count)', min: 0, max: 10, step: 1 },
    { key: 'waveOpacity', label: 'waterline ink', min: 0, max: 1, step: 0.02 },
    { key: 'waveIntensity', label: 'wave intensity', min: 0, max: 1, step: 0.02 },
    { key: 'roadFollow', label: 'road: terrain follow', min: 0, max: 1.5, step: 0.05 },
    { key: 'roadClear', label: 'road clearing', min: 0, max: 6, step: 0.05 },
    { key: 'trailFollow', label: 'trail: terrain follow', min: 0, max: 1.5, step: 0.05 },
    { key: 'trailWeight', label: 'trail weight', min: 0.2, max: 2, step: 0.05 },
    { key: 'trailTick', label: 'trail tick length', min: 0, max: 6, step: 0.1 },
    { key: 'trailClear', label: 'trail clearing (0 = uncased lock)', min: 0, max: 6, step: 0.1 },
  ]},
];

const renderTuners = () => {
  /** @param {TunerSpec} t */
  const tunerRow = (t) =>
    `<label class="tuner${t.locked ? ' locked' : ''}">` +
    `<span class="tname">${t.reseed ? '<span class="star">★</span> ' : ''}${t.label}</span>` +
    `<input type="range" data-key="${t.key}" min="${t.min}" max="${t.max}" step="${t.step}" value="${tuners[t.key]}" />` +
    `<span class="tval" data-val="${t.key}">${tuners[t.key]}</span></label>`;
  tunersEl.innerHTML = TUNER_SECTIONS.map(
    (s) =>
      `<div class="tunersection"><span class="tsectiontitle">${s.title}</span>` +
      s.specs.map(tunerRow).join('') +
      `</div>`,
  ).join('');
};
renderTuners();

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

/**
 * Layer checkboxes (ho-A-6.1). Two independent toggles — `iso layer` and
 * `hachure layer` — drive `gate.setLayers`. Replaces the ho-A-6.0
 * render-mode radio; the iso-overlay checkbox is also gone (its job is now
 * "both layers on").
 */
const wireLayerToggles = () => {
  const isoBox = /** @type {HTMLInputElement | null} */ (document.getElementById('toggleIsoLayer'));
  const hachureBox = /** @type {HTMLInputElement | null} */ (
    document.getElementById('toggleHachureLayer')
  );
  const sync = () => {
    const layers = gate.currentLayers();
    if (isoBox) isoBox.checked = layers.iso;
    if (hachureBox) hachureBox.checked = layers.hachure;
  };
  isoBox?.addEventListener('change', () => gate.setLayers({ iso: isoBox.checked }));
  hachureBox?.addEventListener('change', () =>
    gate.setLayers({ hachure: hachureBox.checked }),
  );
  gate.onChange(() => {
    sync();
    renderTuners();
  });
  sync();
};
wireLayerToggles();

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

// ho-A-6.1: the iso-overlay handler is gone. Both-layers is now expressed by
// ticking both `iso layer` and `hachure layer`.

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
