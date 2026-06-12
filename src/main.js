/**
 * Page entry point — the only file that touches the DOM. Wires Indexer + Gate
 * + grid into the render loop and exposes the Indexer on window as the console
 * verification surface. Browser-only wiring, no logic — excluded from coverage
 * by design (vitest.config.mjs); the pieces it assembles are each fully tested.
 */
import { createIndexer, loadWorks } from './indexer.js';
import { createGate } from './gate.js';
import { renderCatalog } from './grid.js';

const indexer = createIndexer(await loadWorks('./works.json'));
const gate = createGate(window);
window.indexer = indexer;

const root = /** @type {HTMLElement} */ (document.getElementById('catalog'));

/** @param {import('./gate.js').FilterState} state */
const render = (state) => {
  root.innerHTML = renderCatalog(indexer, state);
};

gate.onChange(render);
render(gate.currentState());

root.addEventListener('click', (ev) => {
  const target = /** @type {HTMLElement | null} */ (
    ev.target instanceof Element ? ev.target.closest('[data-category],[data-action]') : null
  );
  if (!target) return;

  if (target.dataset.action === 'reset') {
    gate.setState({ themes: [], media: [], status: [] });
    return;
  }
  if (target.dataset.action === 'share') {
    navigator.clipboard.writeText(gate.shareableURL());
    target.textContent = 'copied';
    setTimeout(() => (target.textContent = 'share this view'), 1200);
    return;
  }

  const category = target.dataset.category;
  const value = target.dataset.value;
  if ((category === 'themes' || category === 'media' || category === 'status') && value) {
    const current = gate.currentState()[category];
    const next = current.includes(value)
      ? current.filter((v) => v !== value)
      : [...current, value];
    gate.setState({ [category]: next });
  }
});

console.log(`初心の園 — Shoshin no Sono. Indexer ready: ${indexer.works().length} works indexed.`);
