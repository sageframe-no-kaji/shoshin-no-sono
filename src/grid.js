/**
 * The grid view — the catalog as cards, organized by work_group, narrowed by
 * the Garden Gate's filter state. Pure: every function here maps (indexer,
 * state) to an HTML string; src/main.js owns the DOM. No component below the
 * Indexer is touched — the grid never sees raw catalog JSON.
 *
 * Aesthetic is deliberately mute; ho-04 owns the visual register.
 */

import { matchesFilter } from './filter.js';

/** @typedef {import('./gate.js').FilterState} FilterState */
/** @typedef {ReturnType<typeof import('./indexer.js').createIndexer>} Indexer */
/** @typedef {import('./indexer.js').Work} Work */

/** @param {unknown} value @returns {string} */
export function escapeHtml(value) {
  return String(value).replace(
    /[&<>"']/g,
    (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c] ?? c,
  );
}

/**
 * The works matching the active filter, per the shared filter_composition rule
 * (see src/filter.js): multiplicative across categories, additive within.
 * @param {Indexer} indexer
 * @param {FilterState} state
 * @returns {Work[]}
 */
export function filterWorks(indexer, state) {
  return indexer.works().filter((w) => matchesFilter(w, state));
}

/**
 * Filter chips are derived from the corpus, not hardcoded — new vocabulary
 * values appear automatically as works carry them.
 * @param {Indexer} indexer
 * @returns {{ themes: string[], media: string[], status: string[] }}
 */
export function chipVocabulary(indexer) {
  const themes = new Set();
  const media = new Set();
  const status = new Set();
  for (const w of indexer.works()) {
    for (const t of w.themes) themes.add(t);
    for (const m of w.media) media.add(m);
    status.add(w.status);
  }
  const sorted = (/** @type {Set<string>} */ s) => [...s].sort();
  return { themes: sorted(themes), media: sorted(media), status: sorted(status) };
}

/** @param {string} text @param {number} max @returns {string} */
const truncate = (text, max) => (text.length <= max ? text : `${text.slice(0, max - 1).trimEnd()}…`);

/** @param {Work} w @returns {string} */
function cardHtml(w) {
  const native = w.native_script
    ? `<span class="card-native" lang="ja" title="${escapeHtml(w.native_translation ?? '')}">${escapeHtml(w.native_script)}</span>`
    : '';
  const line = w.hero ?? truncate(w.short_description, 140);
  const badges = [...w.media, w.status]
    .map((b) => `<span class="badge">${escapeHtml(b)}</span>`)
    .join('');
  const primary = w.deployment[0]?.url
    ? `<a class="card-cta" href="${escapeHtml(w.deployment[0].url)}">${escapeHtml(w.deployment[0].label)}</a>`
    : '';
  const repo = w.repo
    ? `<a class="card-repo" href="${escapeHtml(w.repo)}">repo</a>`
    : '';
  return `<article class="card" data-work="${escapeHtml(w.id)}">
    <h3 class="card-name">${escapeHtml(w.name)} ${native}</h3>
    <p class="card-line">${escapeHtml(line)}</p>
    <p class="card-badges">${badges}</p>
    <p class="card-links">${primary}${repo}</p>
  </article>`;
}

/**
 * @param {string} category
 * @param {string[]} values
 * @param {string[]} active
 * @returns {string}
 */
function chipRow(category, values, active) {
  const chips = values
    .map(
      (v) =>
        `<button class="chip${active.includes(v) ? ' chip-active' : ''}" data-category="${category}" data-value="${escapeHtml(v)}">${escapeHtml(v)}</button>`,
    )
    .join('');
  return `<div class="chip-row" data-chip-row="${category}">${chips}</div>`;
}

/**
 * The full catalog body: chip bar, share/reset controls, group sections.
 * @param {Indexer} indexer
 * @param {FilterState} state
 * @returns {string}
 */
export function renderCatalog(indexer, state) {
  const vocab = chipVocabulary(indexer);
  const matched = new Set(filterWorks(indexer, state).map((w) => w.id));
  const anyFilter = state.themes.length + state.media.length + state.status.length > 0;

  const controls = `<div class="controls">
    ${chipRow('themes', vocab.themes, state.themes)}
    ${chipRow('media', vocab.media, state.media)}
    ${chipRow('status', vocab.status, state.status)}
    <div class="actions">
      <button class="action" data-action="share">share this view</button>
      ${anyFilter ? '<button class="action" data-action="reset">reset filters</button>' : ''}
    </div>
  </div>`;

  const sections = indexer
    .groups()
    .map((g) => {
      const members = indexer.worksByGroup(g.id).filter((w) => matched.has(w.id));
      if (members.length === 0) return '';
      return `<section class="group" data-group="${escapeHtml(g.id)}">
        <h2 class="group-name">${escapeHtml(g.name)}</h2>
        <p class="group-intro">${escapeHtml(g.intro)}</p>
        <div class="cards">${members.map(cardHtml).join('')}</div>
      </section>`;
    })
    .join('');

  const body =
    matched.size > 0
      ? sections
      : `<p class="no-matches">No works match the active filters. <button class="action" data-action="reset">reset filters</button></p>`;

  return `${controls}<p class="count">${matched.size} of ${indexer.works().length} works</p>${body}`;
}
