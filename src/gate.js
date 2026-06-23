/**
 * The Garden Gate — the only component in the project that touches the URL.
 * Every URL is a door: filter state lives in query params, every state change
 * updates the URL, and the URL on load reproduces the state.
 *
 * parseState/serializeState are pure (the URL grammar, unit-testable with no
 * DOM); createGate is the thin adapter over location/history. Grammar:
 * `?theme=craft,agency&media=writing&status=shipped` — comma-separated values
 * within a category. Unknown params are ignored so future keys (focus, view)
 * degrade gracefully in both directions.
 *
 * The `seed` param (activated in ho-05 for the cartography layout) is a
 * parallel channel: it lives alongside the filter grammar rather than inside
 * FilterState, so the filter round-trip stays the catalog's contract.
 * `?seed=N` reproduces a layout; no seed means the Cartographer rolls a fresh
 * one per load. The Gate preserves an existing seed across filter changes so a
 * shared `?seed=N&theme=craft` door survives chip toggles; nothing in ho-05
 * writes a seed into the URL (exposing/locking the seed is deferred polish).
 */

/** @typedef {{ themes: string[], media: string[], status: string[] }} FilterState */

/** State key ↔ URL param. @type {ReadonlyArray<readonly ['themes' | 'media' | 'status', string]>} */
const CATEGORY_PARAMS = [
  ['themes', 'theme'],
  ['media', 'media'],
  ['status', 'status'],
];

/**
 * Parse a query string (with or without leading '?') into filter state.
 * @param {string} search
 * @returns {FilterState}
 */
export function parseState(search) {
  const params = new URLSearchParams(search);
  /** @type {FilterState} */
  const state = { themes: [], media: [], status: [] };
  for (const [key, param] of CATEGORY_PARAMS) {
    const raw = params.get(param);
    if (raw) {
      state[key] = raw
        .split(',')
        .map((v) => v.trim())
        .filter(Boolean);
    }
  }
  return state;
}

/**
 * Serialize filter state into a query string ('' when empty). Built by hand
 * rather than URLSearchParams.toString() so commas stay literal — doors should
 * read clean.
 * @param {FilterState} state
 * @returns {string}
 */
export function serializeState(state) {
  /** @type {string[]} */
  const parts = [];
  for (const [key, param] of CATEGORY_PARAMS) {
    if (state[key].length > 0) {
      parts.push(`${param}=${state[key].map(encodeURIComponent).join(',')}`);
    }
  }
  return parts.length > 0 ? `?${parts.join('&')}` : '';
}

/**
 * Parse the cartography layout seed. Missing, empty, or non-integer values
 * yield null (the Cartographer then rolls an ephemeral seed → novel layout).
 * @param {string} search
 * @returns {number | null}
 */
export function parseSeed(search) {
  const raw = new URLSearchParams(search).get('seed');
  if (raw == null || raw.trim() === '') return null;
  const n = Number(raw);
  return Number.isInteger(n) ? n : null;
}

/**
 * Parse the terrain render mode (ho-A-6.0). Either `contour` (the iso renderer
 * committed in ho-06) or `hachure` (the sidequest renderer). Anything missing
 * or unrecognized falls back to `contour` — the iso register stays the default.
 * @typedef {'contour' | 'hachure'} RenderMode
 * @param {string} search
 * @returns {RenderMode}
 */
export function parseRender(search) {
  const raw = new URLSearchParams(search).get('render');
  return raw === 'hachure' ? 'hachure' : 'contour';
}

/**
 * Compose the query string for a URL: the filter grammar plus the seed param
 * when one is present plus the render mode when it diverges from the default.
 * @param {FilterState} state
 * @param {number | null} seed
 * @param {RenderMode} render
 * @returns {string}
 */
function serializeURL(state, seed, render) {
  /** @type {string[]} */
  const tail = [];
  if (seed != null) tail.push(`seed=${seed}`);
  if (render !== 'contour') tail.push(`render=${render}`);
  const filters = serializeState(state);
  if (tail.length === 0) return filters;
  return filters ? `${filters}&${tail.join('&')}` : `?${tail.join('&')}`;
}

/**
 * Minimal structural view of window — what the Gate actually needs, and what
 * tests stub.
 * @typedef {Object} GateWindow
 * @property {{ pathname: string, search: string, href: string }} location
 * @property {{ pushState: (data: unknown, unused: string, url: string) => void }} history
 * @property {(type: string, cb: () => void) => void} addEventListener
 */

/**
 * @param {GateWindow} win
 */
export function createGate(win) {
  /** @type {Array<(s: FilterState) => void>} */
  const listeners = [];
  const notify = () => {
    const s = currentState();
    for (const cb of listeners) cb(s);
  };

  /** @returns {FilterState} */
  function currentState() {
    return parseState(win.location.search);
  }

  /** The active layout seed, or null when the URL carries none. @returns {number | null} */
  function currentSeed() {
    return parseSeed(win.location.search);
  }

  /** The active terrain renderer. @returns {RenderMode} */
  function currentRender() {
    return parseRender(win.location.search);
  }

  /**
   * Merge a partial state, push the new URL (so back walks filter history),
   * and notify listeners. An existing seed and render mode are preserved
   * across the change.
   * @param {Partial<FilterState>} partial
   */
  function setState(partial) {
    const next = { ...currentState(), ...partial };
    win.history.pushState(
      null,
      '',
      `${win.location.pathname}${serializeURL(next, currentSeed(), currentRender())}`,
    );
    notify();
  }

  /**
   * Switch the terrain renderer; the filter state and seed are preserved.
   * Listeners notify so the page re-renders.
   * @param {RenderMode} mode
   */
  function setRender(mode) {
    win.history.pushState(
      null,
      '',
      `${win.location.pathname}${serializeURL(currentState(), currentSeed(), mode)}`,
    );
    notify();
  }

  /** The current view as a door. @returns {string} */
  function shareableURL() {
    return win.location.href;
  }

  /** @param {(s: FilterState) => void} cb */
  function onChange(cb) {
    listeners.push(cb);
  }

  win.addEventListener('popstate', notify);

  return Object.freeze({
    currentState,
    currentSeed,
    currentRender,
    setState,
    setRender,
    shareableURL,
    onChange,
  });
}
