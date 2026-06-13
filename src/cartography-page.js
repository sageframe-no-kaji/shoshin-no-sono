/**
 * Debug page entry for the cartography (ho-05) — browser-only wiring, no logic,
 * excluded from coverage (vitest.config.mjs) like src/main.js. Boots the
 * Indexer + Gate + Cartographer, renders the transient heat map, and gives the
 * practitioner the controls to verify positions and elevations: a reseed
 * button (novel layout), the active seed shown, and theme chips to watch the
 * heightfield re-weight live. `?seed=N` reproduces a layout; `?theme=...` (and
 * the other filter params) flow through the Gate.
 *
 * This page persists and grows into the real cartography surface through ho-09;
 * only its renderer (the heat map) is transient.
 */
import { createIndexer, loadWorks } from './indexer.js';
import { createGate } from './gate.js';
import { createCartographer } from './cartographer.js';
import { heatmapSvg, peakMarkersSvg } from './heatmap.js';
import { chipVocabulary } from './grid.js';

const indexer = createIndexer(await loadWorks('./works.json'));
const gate = createGate(window);
const carto = createCartographer(indexer, gate);
window.indexer = indexer;

const map = /** @type {SVGSVGElement} */ (/** @type {unknown} */ (document.getElementById('map')));
const seedOut = /** @type {HTMLElement} */ (document.getElementById('seed'));
const chipsEl = /** @type {HTMLElement} */ (document.getElementById('chips'));
const pinned = /** @type {HTMLElement} */ (document.getElementById('pinned'));

const themes = chipVocabulary(indexer).themes;

const renderChips = () => {
  const active = new Set(gate.currentState().themes);
  chipsEl.innerHTML = themes
    .map(
      (t) =>
        `<button data-theme="${t}" class="chip${active.has(t) ? ' on' : ''}">${t}</button>`,
    )
    .join('');
};

const render = () => {
  const { peaks, heightfield, seed } = carto.field();
  map.innerHTML = heatmapSvg(heightfield) + peakMarkersSvg(peaks);
  seedOut.textContent = String(seed);
  pinned.textContent = gate.currentSeed() == null ? '(ephemeral — reload reseeds)' : '(pinned by ?seed)';
  renderChips();
};

gate.onChange(render);

document.getElementById('reseed')?.addEventListener('click', () => {
  carto.reseed();
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
