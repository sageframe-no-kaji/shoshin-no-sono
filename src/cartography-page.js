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
import { chipVocabulary } from './grid.js';

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
};

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
 * @param {number} x @param {number} y @param {string} name @param {string|null} native
 */
const peakLabel = (x, y, name, native) => {
  const nat = native
    ? `<tspan dx="8" font-family="${NATIVE_STACK}" font-size="14" fill="#5C5C5C" style="letter-spacing:0.10em;">${native}</tspan>`
    : '';
  return (
    `<text x="${x.toFixed(1)}" y="${y.toFixed(1)}" text-anchor="middle" font-family="Spectral, Georgia, serif" ` +
    `font-size="16.5" fill="#2B2B2B" style="letter-spacing:0.16em;" ` +
    `paint-order="stroke" stroke="#FDFCF9" stroke-width="3.5" stroke-linejoin="round">${(name || '').toUpperCase()}${nat}</text>`
  );
};

/** @param {import('./field.js').PositionedPeak[]} peaks */
const peakLabelsSvg = (peaks) =>
  peaks
    .map((p) => {
      const w = indexer.getWork(p.id);
      return w ? peakLabel(p.x, p.y - 12, w.name, w.native_script) : '';
    })
    .join('');

const LABEL_MAX_CHARS = 20; // wrap long titles to a carriage return at word boundaries
const LABEL_LINE_HEIGHT = 14;

/** Word-wrap an upper-cased label to lines of at most LABEL_MAX_CHARS. @param {string} name @returns {string[]} */
const wrapLabel = (name) => {
  const words = (name || '').toUpperCase().split(/\s+/).filter(Boolean);
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
 * Town label — typography variant B (settlement): spaced caps below the extent,
 * wrapped to a char limit, with a cream halo (paint-order stroke) so the glyphs
 * read clear of the contour lines.
 */
const townLabel = (/** @type {number} */ x, /** @type {number} */ y, /** @type {string} */ name) => {
  const lines = wrapLabel(name);
  const tspans = lines
    .map((ln, i) => `<tspan x="${x.toFixed(1)}" dy="${i === 0 ? 0 : LABEL_LINE_HEIGHT}">${ln}</tspan>`)
    .join('');
  return (
    `<text x="${x.toFixed(1)}" y="${y.toFixed(1)}" text-anchor="middle" font-family="Spectral, Georgia, serif" ` +
    `font-size="11.5" fill="#6B6B6B" style="letter-spacing:0.22em;" ` +
    `paint-order="stroke" stroke="#FDFCF9" stroke-width="3" stroke-linejoin="round">${tspans}</text>`
  );
};

/** @param {import('./cartographer.js').CartographyTown[]} towns */
const townsSvg = (towns) =>
  towns
    .map((t) => {
      const g = `<g transform="translate(${t.seat.x.toFixed(1)},${t.seat.y.toFixed(1)})"`;
      // Receded (non-matching) towns dim hard and drop their label — a sunk town
      // doesn't announce itself, and faint ghost-labels read as noise (Decision 6).
      if (!t.match) return `${g} opacity="0.1">${settlementSvg(t.blocks)}</g>`;
      return `${g}>${settlementSvg(t.blocks)}</g><g>${townLabel(t.seat.x, t.seat.y + t.extent + 14, t.name)}</g>`;
    })
    .join('');

const render = () => {
  const seed = carto.activeSeed();
  const state = gate.currentState();
  const field = computeField(indexer, state, seed, tuners);
  const towns = computeTowns(indexer, state, field, {
    ...tuners,
    thresholds: [tuners.t1, tuners.t2, tuners.t3],
  });
  let svg = contourMapSvg(field.heightfield, {
    interval: tuners.interval,
    weightRegular: tuners.weightRegular,
    weightIndex: tuners.weightIndex,
  });
  svg += townsSvg(towns);
  svg += peakLabelsSvg(field.peaks); // real peak labels (variant B), always on
  if (showPeaks) svg += peakDotsSvg(field.peaks); // debug id dots, on toggle
  map.innerHTML = svg;
  seedOut.textContent = String(seed);
  pinned.textContent = gate.currentSeed() == null ? '(ephemeral — reload reseeds)' : '(pinned by ?seed)';
  renderChips();
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
  render();
});

gate.onChange(render);

document.getElementById('reseed')?.addEventListener('click', () => {
  carto.reseed();
  render();
});

document.getElementById('togglePeaks')?.addEventListener('change', (ev) => {
  showPeaks = ev.target instanceof HTMLInputElement ? ev.target.checked : false;
  render();
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

render();
