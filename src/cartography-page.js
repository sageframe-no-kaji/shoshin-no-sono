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
import { hachureMapSvg } from './hachure-map.js';
import { extractContour } from './contours.js';
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
  beaconOpacity: 1, // the per-peak signal-fire beacon weight (ho-07.6 Decision 5)
  floorMarkerOpacity: 0.45, // the 2025-11-11 corpus-floor horizon marker weight
  elevationScale: 1.5, // size of the USGS elevation (iso) labels (ho-07.6)

  // ho-A-6.0 hachure renderer (sidequest off ho-06) — dialed against the iso plate.
  hachureSampleStep: 6,
  hachureSlopeFloor: 0.012,
  hachureSlopeRef: 0.35,
  hachureLenBase: 1.5,
  hachureLenScale: 5,
  hachureWBase: 0.22,
  hachureWScale: 0.6,
  hachurePosJitter: 0.6,
  hachureAngleJitter: 0.18,

  // Label red dial (ho-A-6.0). 0 = muted dark (the pre-A-6.0 baseline),
  // 1 = terracotta (the new baseline locked in this commit), 1.5 = vivid red.
  // Live in both iso and hachure panels — labels read across both plates.
  labelRed: 1.0,
};

/** Gap between consecutive town builds in the writing phase (not a by-feel tuner). */
const TOWN_GAP_MS = 140;
/** The signal-fire beacon hue (brand Amber — flame, NOT the reserved terracotta). */
const BEACON_AMBER = '#D4952A';

/** Settlement building fill: lerp from register ink to a light warm grey by `townInk`. */
const INK_DARK = [0x2b, 0x2b, 0x2b];
const INK_LIGHT = [0xa8, 0xa2, 0x97];
const townInkColor = () => {
  const t = Math.max(0, Math.min(1, tuners.townInk));
  const c = INK_DARK.map((d, i) => Math.round(d + (INK_LIGHT[i] - d) * t));
  return `rgb(${c[0]},${c[1]},${c[2]})`;
};

/**
 * `locked`: landed in a prior ho (frozen register / ho-06.5 field / ho-07.5 towns) —
 * greyed but still movable, so the active ho-07.6 dials are obvious. `reseed`: a
 * pure-animation timing dial whose effect only shows during the emergence, so it
 * needs a reseed to watch (marked with ★).
 * @type {{ key: string, label: string, min: number, max: number, step: number, locked?: boolean, reseed?: boolean }[]}
 */
const TUNER_SPECS = [
  { key: 'interval', label: 'ring spacing', min: 0.3, max: 1.5, step: 0.02, locked: true },
  { key: 'summitExp', label: 'summit sharpness', min: 1.0, max: 3.0, step: 0.05, locked: true },
  { key: 'noiseWeight', label: 'crenellation', min: 0, max: 2.0, step: 0.05, locked: true },
  { key: 'radiusBase', label: 'base radius', min: 12, max: 60, step: 2, locked: true },
  { key: 'radiusScale', label: 'radius × importance', min: 4, max: 40, step: 1, locked: true },
  { key: 'relevanceFloor', label: 'sink floor (filtered)', min: 0, max: 0.6, step: 0.01, locked: true },
  { key: 'weightRegular', label: 'line weight (regular)', min: 0.05, max: 1.0, step: 0.05, locked: true },
  { key: 'weightIndex', label: 'line weight (index)', min: 0.1, max: 2.0, step: 0.05, locked: true },
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
  // ho-07.6 — landed for now, locked (still movable)
  { key: 'elevationScale', label: 'iso label size', min: 0.4, max: 2.5, step: 0.05, locked: true },
  { key: 'peakLabelScale', label: 'peak label size', min: 0.3, max: 1.4, step: 0.05, locked: true },
  { key: 'importanceScale', label: 'label × importance', min: 0, max: 2, step: 0.05, locked: true },
  { key: 'townLabelScale', label: 'town label size', min: 0.3, max: 1.4, step: 0.05, locked: true },
  { key: 'townLabelGap', label: 'town label gap', min: 0, max: 40, step: 1, locked: true },
  { key: 'townInk', label: 'building lightness', min: 0, max: 1, step: 0.02, locked: true },
  { key: 'beaconOpacity', label: 'beacon weight', min: 0, max: 1, step: 0.05, locked: true },
  { key: 'floorMarkerOpacity', label: 'corpus-floor marker', min: 0, max: 0.8, step: 0.05, locked: true },
  { key: 'beatMs', label: 'rise beat (ms)', min: 80, max: 800, step: 20, reseed: true, locked: true },
  { key: 'fadeMs', label: 'terrain cross-fade (ms)', min: 0, max: 900, step: 20, reseed: true, locked: true },
  { key: 'nameDelayMs', label: 'name: when (ms)', min: 0, max: 1200, step: 20, reseed: true, locked: true },
  { key: 'nameFadeMs', label: 'name: fade (ms)', min: 40, max: 4000, step: 20, reseed: true, locked: true },
  { key: 'holdMs', label: 'world→writing breath (ms)', min: 0, max: 2000, step: 50, reseed: true, locked: true },
  { key: 'perHouseMs', label: 'build: ms / house', min: 4, max: 120, step: 2, reseed: true, locked: true },
];

/**
 * Universal tuners (ho-A-6.0). Shown in *both* iso and hachure panels because
 * they affect overlays that span both renderers (labels, etc.).
 * @type {{ key: string, label: string, min: number, max: number, step: number }[]}
 */
const UNIVERSAL_TUNER_SPECS = [
  { key: 'labelRed', label: 'label red', min: 0, max: 1.5, step: 0.05 },
];

/**
 * Hachure renderer tuners (ho-A-6.0 sidequest). Shown only when `?render=hachure`
 * is active so the panel doesn't sprawl; the iso tuners hide in turn under hachure.
 * @type {{ key: string, label: string, min: number, max: number, step: number }[]}
 */
const HACHURE_TUNER_SPECS = [
  { key: 'hachureSampleStep', label: 'sample stride (px)', min: 2, max: 14, step: 1 },
  { key: 'hachureSlopeFloor', label: 'flat threshold', min: 0, max: 0.05, step: 0.001 },
  { key: 'hachureSlopeRef', label: 'steep ceiling', min: 0.05, max: 0.8, step: 0.01 },
  { key: 'hachureLenBase', label: 'stroke length (min)', min: 0, max: 6, step: 0.1 },
  { key: 'hachureLenScale', label: 'stroke length (slope)', min: 0, max: 12, step: 0.1 },
  { key: 'hachureWBase', label: 'stroke weight (min)', min: 0.05, max: 1, step: 0.01 },
  { key: 'hachureWScale', label: 'stroke weight (slope)', min: 0, max: 2, step: 0.05 },
  { key: 'hachurePosJitter', label: 'position jitter (px)', min: 0, max: 2, step: 0.05 },
  { key: 'hachureAngleJitter', label: 'angle jitter (rad)', min: 0, max: 0.6, step: 0.01 },
];

let showPeaks = false;
/** Iso overlay on top of the hachure plate (ho-A-6.0). No effect in iso mode. */
let showIsos = false;

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
 * Label color dial (ho-A-6.0). Three-stop gradient so the slider's 1.0
 * default lands exactly on terracotta — linear between 0..1 (warm dark →
 * terracotta) and 1..1.5 (terracotta → vivid red). Native script tracks the
 * primary color but in a slightly lighter parallel gradient so the visual
 * hierarchy survives the dial.
 */
const LABEL_PRIMARY_STOPS = [
  [0x2b, 0x2b, 0x2b],
  [0x9a, 0x5b, 0x3c],
  [0xc5, 0x3d, 0x24],
];
const LABEL_NATIVE_STOPS = [
  [0x5c, 0x5c, 0x5c],
  [0xb5, 0x72, 0x55],
  [0xd8, 0x6a, 0x52],
];

/** @param {number[][]} stops 3 RGB stops at 0 / 1 / 1.5 @param {number} t */
const labelColor = (stops, t) => {
  const clamped = Math.max(0, Math.min(1.5, t));
  const [a, b] = clamped <= 1 ? [stops[0], stops[1]] : [stops[1], stops[2]];
  const u = clamped <= 1 ? clamped : (clamped - 1) / 0.5;
  const c = a.map((v, i) => Math.round(v + (b[i] - v) * u));
  return `rgb(${c[0]},${c[1]},${c[2]})`;
};

/**
 * Peak label — typography variant B (peak): wide-tracked roman caps with the
 * native script set beside at near-equal optical size, a cream halo so it reads
 * over the rings. A minimal static render pulled forward so the assembled map
 * is legible during the by-feel pass; ho-09 owns the interactive label layer
 * (cards, hover-dim, collision/leadering).
 * @param {number} x @param {number} y @param {string} name @param {string|null} native @param {number} scale
 */
const peakLabel = (x, y, name, native, scale) => {
  const primary = labelColor(LABEL_PRIMARY_STOPS, tuners.labelRed);
  const natFill = labelColor(LABEL_NATIVE_STOPS, tuners.labelRed);
  const nat = native
    ? `<tspan dx="${(8 * scale).toFixed(1)}" font-family="${NATIVE_STACK}" font-size="${(14 * scale).toFixed(1)}" fill="${natFill}" style="letter-spacing:0.10em;">${native}</tspan>`
    : '';
  return (
    `<text x="${x.toFixed(1)}" y="${y.toFixed(1)}" text-anchor="middle" font-family="Spectral, Georgia, serif" ` +
    `font-size="${(16.5 * scale).toFixed(1)}" fill="${primary}" style="letter-spacing:0.16em;" ` +
    `paint-order="stroke" stroke="#FDFCF9" stroke-width="${(5 * scale).toFixed(1)}" stroke-linejoin="round">${(name || '').toUpperCase()}${nat}</text>`
  );
};

/**
 * A peak's label scale: the base size dialed up or down by its importance, like a
 * real map where the big places carry the big type (ho-07.6). `importanceScale` 0
 * makes every peak the same; higher spreads them — importance 10 reaches
 * (1 + importanceScale)× an importance-2 peak. Floored so the smallest stays legible.
 * @param {number} importance
 */
const peakNameScale = (importance) =>
  tuners.peakLabelScale * Math.max(0.4, 1 + tuners.importanceScale * ((importance - 2) / 8));

/**
 * The signal-fire beacon (ho-07.6 Decision 5): a soft amber glow at each risen
 * peak's summit — the beacons of Gondor, lit as the peak rises. Three stacked
 * circles (wide faint halo, mid glow, bright core) in flame amber, never
 * terracotta. When `pulse` is set (resting / writing phase, where the container is
 * stable) the beacon breathes via `emgBeacon`; during the world cross-fade it
 * stays steady so the per-beat re-render can't reset the breath. Weight by
 * `beaconOpacity` (0 hides it).
 * @param {import('./field.js').PositionedPeak[]} peaks @param {boolean} [pulse]
 */
const beaconSvg = (peaks, pulse = false) => {
  const op = tuners.beaconOpacity;
  if (op <= 0) return '';
  const anim = pulse ? ' style="animation:emgBeacon 2800ms ease-in-out infinite;"' : '';
  return peaks
    .map(
      (p) =>
        `<g${anim}><circle cx="${p.x.toFixed(1)}" cy="${p.y.toFixed(1)}" r="9" fill="${BEACON_AMBER}" opacity="${(0.18 * op).toFixed(3)}"/>` +
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
    `font-style="italic" font-size="${(12.5 * scale).toFixed(1)}" fill="${labelColor(LABEL_PRIMARY_STOPS, tuners.labelRed)}" style="letter-spacing:0.04em;" ` +
    `paint-order="stroke" stroke="#FDFCF9" stroke-width="${(4.5 * scale).toFixed(1)}" stroke-linejoin="round">${tspans}</text>`
  );
};

/**
 * One town at a build fraction (ho-07.6 Decision 1). Houses appear in build order
 * (cathedral last, via revealedBlocks) and each one *fades* in rather than popping:
 * the fully-built houses draw solid, and the one currently going up draws at the
 * fractional opacity between houses — so construction reads smooth. The label
 * appears once the town essentially stands. Non-matching towns dim and drop their
 * the label appears once the town essentially stands. `drawLabel` false omits it, so the
 * resting render can place all labels on one collision-checked layer above everything.
 * @param {import('./cartographer.js').CartographyTown} t @param {number} fraction @param {boolean} [drawLabel]
 */
const oneTownSvg = (t, fraction, drawLabel = true) => {
  const ordered = revealedBlocks(t.blocks, 1); // all blocks, build order (houses → cathedral)
  const n = ordered.length;
  const pos = Math.max(0, Math.min(1, fraction)) * n;
  const fullCount = Math.floor(pos);
  const fade = pos - fullCount; // the in-progress house's opacity
  const ink = townInkColor();
  let inner = settlementSvg(ordered.slice(0, fullCount), { ink });
  if (fullCount < n && fade > 0.001) {
    inner += `<g opacity="${fade.toFixed(2)}">${settlementSvg([ordered[fullCount]], { ink })}</g>`;
  }
  const g = `<g transform="translate(${t.seat.x.toFixed(1)},${t.seat.y.toFixed(1)})">${inner}</g>`;
  if (!t.match) return `<g opacity="0.1">${g}</g>`;
  return drawLabel && fraction >= 0.999 ? g + townLabelSvg(t) : g;
};

/** The y of a town's label — below the settlement's outer edge plus the gap (ho-07.6). */
const townLabelY = (/** @type {import('./cartographer.js').CartographyTown} */ t) =>
  t.seat.y + t.extent + tuners.townLabelGap;

/** A town's label markup. @param {import('./cartographer.js').CartographyTown} t */
const townLabelSvg = (t) => `<g>${townLabel(t.seat.x, townLabelY(t), t.name, tuners.townLabelScale)}</g>`;

/** All town buildings at full, no labels (the resting render places labels on top). @param {import('./cartographer.js').CartographyTown[]} towns */
const townsSvg = (towns) => towns.map((t) => oneTownSvg(t, 1, false)).join('');

/**
 * @typedef {Object} LabelItem
 * @property {number} cx center x @property {number} top box top y
 * @property {number} w box width @property {number} h box height
 * @property {number} priority higher wins a collision @property {string} svg
 */

/**
 * Greedy label placement (ho-07.6): place labels by priority, dropping any whose box
 * overlaps one already placed — so text never lands on text. A pragmatic stand-in
 * for ho-09's full collision/leadering layer; here a colliding label is simply
 * omitted rather than nudged or leadered.
 * @param {LabelItem[]} items @returns {string}
 */
const placeLabels = (items) => {
  const ranked = [...items].sort((a, b) => b.priority - a.priority);
  /** @type {{x1:number,y1:number,x2:number,y2:number}[]} */
  const placed = [];
  let out = '';
  for (const it of ranked) {
    const box = { x1: it.cx - it.w / 2, y1: it.top, x2: it.cx + it.w / 2, y2: it.top + it.h };
    const hit = placed.some((p) => !(box.x2 < p.x1 || box.x1 > p.x2 || box.y2 < p.y1 || box.y1 > p.y2));
    if (hit) continue;
    placed.push(box);
    out += it.svg;
  }
  return out;
};

/** The collision-checked place-name layer for the resting map: peaks and towns, sized by importance, biggest first. @param {import('./cartographer.js').CartographyField} field @param {import('./cartographer.js').CartographyTown[]} towns */
const placeNameLayer = (field, towns) => {
  /** @type {LabelItem[]} */
  const items = [];
  for (const p of field.peaks) {
    const w = indexer.getWork(p.id);
    if (!w) continue;
    const sc = peakNameScale(p.importance);
    const fs = 16.5 * sc;
    const chars = (w.name || '').length;
    const wide = chars * fs * 0.78 + (w.native_script ? fs * 2.6 : 0); // caps + tracking + native
    items.push({
      cx: p.x,
      top: p.y - 12 - fs,
      w: wide + 6,
      h: fs + 6,
      priority: p.importance + 0.5, // a work edges out an equal-importance town
      svg: peakLabel(p.x, p.y - 12, w.name, w.native_script, sc),
    });
  }
  for (const t of towns) {
    if (!t.match) continue;
    const fs = 12.5 * tuners.townLabelScale;
    const lines = wrapLabel(t.name);
    const maxc = Math.max(1, ...lines.map((l) => l.length));
    const h = (lines.length - 1) * LABEL_LINE_HEIGHT * tuners.townLabelScale + fs;
    items.push({
      cx: t.seat.x,
      top: townLabelY(t) - fs,
      w: maxc * fs * 0.5 + 6,
      h: h + 6,
      priority: indexer.getWork(t.id)?.importance ?? 0,
      svg: townLabelSvg(t),
    });
  }
  return placeLabels(items);
};

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

/** Heightfield units → feet: an importance-9 summit (height ≈ 9) reads ≈ 9000 ft. */
const FEET_PER_UNIT = 1000;
/** Elevation labels land on ROUND contours (every 1000 ft), like a real topo map. */
const ELEVATION_STEP_FT = 1000;

/**
 * USGS-style elevation labels (ho-07.6). Iso-lines are extracted at *round* 1000-ft
 * elevations — independent of the visual contour interval — so the numbers read
 * 1000, 2000, 3000… rather than the rendered rings' off values. Each carries its
 * elevation in feet, set inline with a cream halo and rotated along the line. A
 * couple per level. Rendered only in the resting / frozen-terrain views (computed
 * once), not per world beat.
 * @param {import('./field.js').Heightfield} hf
 */
const elevationLabelsSvg = (hf) => {
  const maxFeet = hf.max * FEET_PER_UNIT;
  let svg = '';
  for (let feet = ELEVATION_STEP_FT; feet < maxFeet; feet += ELEVATION_STEP_FT) {
    const segs = extractContour(hf, feet / FEET_PER_UNIT);
    if (segs.length < 8) continue;
    const stride = Math.max(8, Math.floor(segs.length / 2)); // ~a couple labels per level
    for (let i = Math.floor(stride / 2); i < segs.length; i += stride) {
      const [a, b] = segs[i];
      const mx = (a.x + b.x) / 2;
      const my = (a.y + b.y) / 2;
      let ang = (Math.atan2(b.y - a.y, b.x - a.x) * 180) / Math.PI;
      if (ang > 90) ang -= 180;
      if (ang < -90) ang += 180; // keep the numerals upright
      const sz = 6 * tuners.elevationScale;
      svg +=
        `<text x="${mx.toFixed(1)}" y="${my.toFixed(1)}" text-anchor="middle" dominant-baseline="central" ` +
        `transform="rotate(${ang.toFixed(1)} ${mx.toFixed(1)} ${my.toFixed(1)})" ` +
        `font-family="Spectral, Georgia, serif" font-size="${sz.toFixed(1)}" fill="#6B6B6B" style="letter-spacing:0.04em;" ` +
        `paint-order="stroke" stroke="#FDFCF9" stroke-width="${(2.4 * tuners.elevationScale).toFixed(1)}" stroke-linejoin="round">${feet}</text>`;
    }
  }
  return svg;
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
  if (gate.currentRender() === 'hachure') {
    let svg = hachureMapSvg(heightfield, {
      sampleStep: tuners.hachureSampleStep,
      slopeFloor: tuners.hachureSlopeFloor,
      slopeRef: tuners.hachureSlopeRef,
      lenBase: tuners.hachureLenBase,
      lenScale: tuners.hachureLenScale,
      wBase: tuners.hachureWBase,
      wScale: tuners.hachureWScale,
      posJitter: tuners.hachurePosJitter,
      angleJitter: tuners.hachureAngleJitter,
      seed: carto.activeSeed(),
    });
    // Optional iso overlay on top of the hachure plate — basic weights, paper
    // transparent so the hachures show through. Uses ho-06's validated default
    // interval (0.62) rather than the iso panel's tuned value, so the overlay
    // reads as a skeletal contour scaffold over the hachures.
    if (showIsos) {
      svg += contourMapSvg(heightfield, {
        interval: 0.62,
        weightRegular: 0.18,
        weightIndex: 0.35,
        paper: 'transparent',
      });
    }
    return svg;
  }
  return contourMapSvg(heightfield, {
    interval: tuners.interval,
    weightRegular: tuners.weightRegular,
    weightIndex: tuners.weightIndex,
  });
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
    ...tuners,
    emergenceScale: scaleFn(step),
  });
  let svg = corpusFloorSvg();
  svg += terrainSvg(field.heightfield);
  svg += beaconSvg(field.peaks); // steady during the cross-fade (no reset)
  if (showPeaks) svg += peakDotsSvg(field.peaks);
  return { svg, peaks: field.peaks };
};

/** One peak name, ready to append to the overlay, with its own WHEN/HOW-LONG fade. @param {import('./field.js').PositionedPeak} p */
const nameEl = (p) => {
  const w = indexer.getWork(p.id);
  if (!w) return '';
  const label = peakLabel(p.x, p.y - 12, w.name, w.native_script, peakNameScale(p.importance));
  // ease-in-out for a smooth swell rather than a quick pop (ho-07.6).
  return `<g style="opacity:0;animation:emgIn ${tuners.nameFadeMs}ms ease-in-out ${tuners.nameDelayMs}ms forwards;">${label}</g>`;
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
  svg += terrainSvg(field.heightfield);
  // Iso elevation labels are coupled to contour lines; they only read on the
  // iso renderer (ho-A-6.0 keeps the hachure plate untexted by design).
  if (gate.currentRender() === 'contour') svg += elevationLabelsSvg(field.heightfield);
  svg += townsSvg(towns); // settlement buildings (labels go on the top layer)
  svg += beaconSvg(field.peaks, true); // signal-fire beacons, breathing at rest
  if (showPeaks) svg += peakDotsSvg(field.peaks); // debug id dots, on toggle
  svg += placeNameLayer(field, towns); // ALL place names, above everything, collision-checked
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
  map.innerHTML = '<g id="emgTerr"></g><g id="emgTowns"></g><g id="emgNames"></g>';
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
  const field = computeField(indexer, state, seed, tuners); // full terrain, once
  const allTowns = computeTowns(indexer, state, field, {
    ...tuners,
    thresholds: [tuners.t1, tuners.t2, tuners.t3],
  });
  const byId = new Map(allTowns.map((t) => [t.id, t]));
  // Freeze the terrain once (breathing beacons keep their phase); only `towns` redraws.
  layers.terr.innerHTML =
    corpusFloorSvg() +
    terrainSvg(field.heightfield) +
    (gate.currentRender() === 'contour' ? elevationLabelsSvg(field.heightfield) : '') +
    beaconSvg(field.peaks, true) +
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

/** Render the active mode's tuner specs into the panel (ho-A-6.0). */
const renderTuners = () => {
  const modeSpecs =
    gate.currentRender() === 'hachure'
      ? HACHURE_TUNER_SPECS.map((t) => ({ ...t, locked: false, reseed: false }))
      : TUNER_SPECS;
  const specs = [
    ...modeSpecs,
    ...UNIVERSAL_TUNER_SPECS.map((t) => ({ ...t, locked: false, reseed: false })),
  ];
  tunersEl.innerHTML = specs
    .map(
      (t) =>
        `<label class="tuner${t.locked ? ' locked' : ''}">` +
        `<span class="tname">${t.reseed ? '<span class="star">★</span> ' : ''}${t.label}</span>` +
        `<input type="range" data-key="${t.key}" min="${t.min}" max="${t.max}" step="${t.step}" value="${tuners[t.key]}" />` +
        `<span class="tval" data-val="${t.key}">${tuners[t.key]}</span></label>`,
    )
    .join('');
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

/** Render-mode toggle (ho-A-6.0). Re-renders tuners + map for the new mode. */
const wireRenderToggle = () => {
  const radios = /** @type {NodeListOf<HTMLInputElement>} */ (
    document.querySelectorAll('input[name="render"]')
  );
  const sync = () => {
    const mode = gate.currentRender();
    radios.forEach((r) => (r.checked = r.value === mode));
  };
  radios.forEach((r) =>
    r.addEventListener('change', () => {
      if (r.checked) gate.setRender(/** @type {'contour' | 'hachure'} */ (r.value));
    }),
  );
  gate.onChange(() => {
    sync();
    renderTuners();
  });
  sync();
};
wireRenderToggle();

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

document.getElementById('toggleIsos')?.addEventListener('change', (ev) => {
  showIsos = ev.target instanceof HTMLInputElement ? ev.target.checked : false;
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
