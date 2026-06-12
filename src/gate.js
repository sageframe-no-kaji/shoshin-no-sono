/**
 * The Garden Gate — the only component in the project that touches the URL.
 * Every URL is a door: filter state lives in query params, every state change
 * updates the URL, and the URL on load reproduces the state.
 *
 * parseState/serializeState are pure (the URL grammar, unit-testable with no
 * DOM); createGate is the thin adapter over location/history. Grammar:
 * `?theme=craft,agency&media=writing&status=shipped` — comma-separated values
 * within a category. Unknown params are ignored so future keys (focus, view,
 * seed — reserved for later hos) degrade gracefully in both directions.
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

  /**
   * Merge a partial state, push the new URL (so back walks filter history),
   * and notify listeners.
   * @param {Partial<FilterState>} partial
   */
  function setState(partial) {
    const next = { ...currentState(), ...partial };
    win.history.pushState(null, '', `${win.location.pathname}${serializeState(next)}`);
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

  return Object.freeze({ currentState, setState, shareableURL, onChange });
}
