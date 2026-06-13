import { describe, it, expect, vi } from 'vitest';
import { parseState, serializeState, parseSeed, createGate } from '../src/gate.js';

describe('the URL grammar (parse/serialize)', () => {
  it('parses a full door', () => {
    expect(parseState('?theme=craft,agency&media=writing&status=shipped')).toEqual({
      themes: ['craft', 'agency'],
      media: ['writing'],
      status: ['shipped'],
    });
  });

  it('parses empty and missing params to empty state', () => {
    expect(parseState('')).toEqual({ themes: [], media: [], status: [] });
    expect(parseState('?')).toEqual({ themes: [], media: [], status: [] });
  });

  it('ignores unknown params — future keys degrade gracefully', () => {
    expect(parseState('?focus=ho-system&seed=abc&theme=craft').themes).toEqual(['craft']);
  });

  it('tolerates messy commas', () => {
    expect(parseState('?theme=craft,,agency,').themes).toEqual(['craft', 'agency']);
  });

  it('serializes with literal commas and skips empty categories', () => {
    expect(
      serializeState({ themes: ['craft', 'agency'], media: [], status: ['shipped'] }),
    ).toBe('?theme=craft,agency&status=shipped');
    expect(serializeState({ themes: [], media: [], status: [] })).toBe('');
  });

  it('round-trips', () => {
    const state = { themes: ['craft'], media: ['software', 'writing'], status: [] };
    expect(parseState(serializeState(state))).toEqual(state);
  });
});

describe('the seed channel (parseSeed)', () => {
  it('parses an integer seed', () => {
    expect(parseSeed('?seed=12345')).toBe(12345);
    expect(parseSeed('?theme=craft&seed=42')).toBe(42);
  });

  it('returns null for missing, empty, or non-integer seeds', () => {
    expect(parseSeed('')).toBeNull();
    expect(parseSeed('?theme=craft')).toBeNull();
    expect(parseSeed('?seed=')).toBeNull();
    expect(parseSeed('?seed=abc')).toBeNull();
    expect(parseSeed('?seed=3.5')).toBeNull();
  });
});

/** A stub window whose history actually updates location, like the real one. */
function stubWindow(initialSearch = '') {
  /** @type {Record<string, Array<() => void>>} */
  const handlers = {};
  const win = {
    location: { pathname: '/', search: initialSearch, href: `http://local/${initialSearch}` },
    history: {
      pushState: vi.fn((_data, _unused, /** @type {string} */ url) => {
        const q = url.indexOf('?');
        win.location.search = q === -1 ? '' : url.slice(q);
        win.location.href = `http://local${url}`;
      }),
    },
    addEventListener: (/** @type {string} */ type, /** @type {() => void} */ cb) => {
      (handlers[type] ??= []).push(cb);
    },
    firePopstate: () => handlers['popstate']?.forEach((cb) => cb()),
  };
  return win;
}

describe('createGate over a stub window', () => {
  it('currentState reads the URL', () => {
    const gate = createGate(stubWindow('?theme=craft'));
    expect(gate.currentState().themes).toEqual(['craft']);
  });

  it('setState merges partials, pushes the URL, and notifies', () => {
    const win = stubWindow('?theme=craft');
    const gate = createGate(win);
    const seen = vi.fn();
    gate.onChange(seen);

    gate.setState({ media: ['writing'] });

    expect(win.history.pushState).toHaveBeenCalledWith(null, '', '/?theme=craft&media=writing');
    expect(seen).toHaveBeenCalledWith({ themes: ['craft'], media: ['writing'], status: [] });
  });

  it('clearing a category drops it from the URL', () => {
    const win = stubWindow('?theme=craft&media=writing');
    const gate = createGate(win);
    gate.setState({ themes: [] });
    expect(win.location.search).toBe('?media=writing');
  });

  it('popstate (browser back) notifies with the restored state', () => {
    const win = stubWindow('?status=shipped');
    const gate = createGate(win);
    const seen = vi.fn();
    gate.onChange(seen);
    win.firePopstate();
    expect(seen).toHaveBeenCalledWith({ themes: [], media: [], status: ['shipped'] });
  });

  it('shareableURL returns the current door', () => {
    const win = stubWindow('');
    const gate = createGate(win);
    gate.setState({ themes: ['craft'] });
    expect(gate.shareableURL()).toBe('http://local/?theme=craft');
  });

  it('currentSeed reads the seed from the URL', () => {
    expect(createGate(stubWindow('?seed=777')).currentSeed()).toBe(777);
    expect(createGate(stubWindow('?theme=craft')).currentSeed()).toBeNull();
  });

  it('preserves an existing seed across filter changes', () => {
    const win = stubWindow('?seed=777&theme=craft');
    const gate = createGate(win);
    gate.setState({ media: ['writing'] });
    expect(win.location.search).toBe('?theme=craft&media=writing&seed=777');
    expect(gate.currentSeed()).toBe(777);
  });

  it('does not invent a seed when the URL carries none', () => {
    const win = stubWindow('?theme=craft');
    const gate = createGate(win);
    gate.setState({ media: ['writing'] });
    expect(win.location.search).toBe('?theme=craft&media=writing');
  });
});
