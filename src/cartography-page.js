/**
 * Debug page entry for the cartography (ho-06) — browser-only wiring, no logic,
 * excluded from coverage (vitest.config.mjs) like src/main.js. Boots the
 * Indexer + Gate + Cartographer and renders the contour map (src/contour-map.js)
 * — the cartographic register, which replaces ho-05's transient heat map.
 *
 * It carries the instruments for ho-06's two deferred questions: live tuner
 * controls (the by-feel pass on the field opts — interval, summit sharpness,
 * crenellation, radius scaling, sink floor), a reseed control and seed readout,
 * the theme chips to watch the terrain re-weight, and an off-by-default peak-id
 * overlay to check positions without disturbing the silhouette read. `?seed=N`
 * reproduces a layout; `?theme=...` flows through the Gate.
 *
 * This page persists and grows into the real cartography surface through ho-09.
 */
import { createIndexer, loadWorks } from './indexer.js';
import { createGate } from './gate.js';
import { createCartographer, computeField } from './cartographer.js';
import { contourMapSvg } from './contour-map.js';
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

/** Live tuner values for the by-feel pass — seeded with the field/contour defaults. */
/** @type {Record<string, number>} */
const tuners = { interval: 0.62, summitExp: 1.7, noiseWeight: 0.85, radiusScale: 16, relevanceFloor: 0.15 };

/** @type {{ key: string, label: string, min: number, max: number, step: number }[]} */
const TUNER_SPECS = [
  { key: 'interval', label: 'ring spacing', min: 0.3, max: 1.5, step: 0.02 },
  { key: 'summitExp', label: 'summit sharpness', min: 1.0, max: 3.0, step: 0.05 },
  { key: 'noiseWeight', label: 'crenellation', min: 0, max: 2.0, step: 0.05 },
  { key: 'radiusScale', label: 'radius × importance', min: 4, max: 40, step: 1 },
  { key: 'relevanceFloor', label: 'sink floor (filtered)', min: 0, max: 0.6, step: 0.01 },
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

const render = () => {
  const seed = carto.activeSeed();
  const { peaks, heightfield } = computeField(indexer, gate.currentState(), seed, tuners);
  let svg = contourMapSvg(heightfield, { interval: tuners.interval });
  if (showPeaks) svg += peakDotsSvg(peaks);
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
