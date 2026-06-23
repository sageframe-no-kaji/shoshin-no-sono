import { describe, it, expect, vi } from 'vitest';
import { parseState, serializeState, parseSeed, parseRender, parseLayers, createGate } from '../src/gate.js';

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

describe('the render channel (parseRender, ho-A-6.0)', () => {
  it('parses ?render=hachure into the hachure mode', () => {
    expect(parseRender('?render=hachure')).toBe('hachure');
    expect(parseRender('?theme=craft&render=hachure')).toBe('hachure');
  });

  it('defaults to contour for missing or unrecognized values', () => {
    expect(parseRender('')).toBe('contour');
    expect(parseRender('?')).toBe('contour');
    expect(parseRender('?render=contour')).toBe('contour');
    expect(parseRender('?render=oil')).toBe('contour');
    expect(parseRender('?render=')).toBe('contour');
  });
});

describe('the layers channel (parseLayers, ho-A-6.1)', () => {
  it('defaults to iso-only when neither layer key nor render= is present', () => {
    expect(parseLayers('')).toEqual({ iso: true, hachure: false });
    expect(parseLayers('?theme=craft')).toEqual({ iso: true, hachure: false });
  });

  it('parses ?iso=1&hachure=1 to both-layers', () => {
    expect(parseLayers('?iso=1&hachure=1')).toEqual({ iso: true, hachure: true });
  });

  it('treats presence-without-value as truthy', () => {
    expect(parseLayers('?iso&hachure')).toEqual({ iso: true, hachure: true });
    expect(parseLayers('?iso=&hachure=')).toEqual({ iso: true, hachure: true });
  });

  it('respects iso=0 to disable the iso layer', () => {
    expect(parseLayers('?iso=0&hachure=1')).toEqual({ iso: false, hachure: true });
    expect(parseLayers('?iso=0')).toEqual({ iso: false, hachure: false });
  });

  it('falls back to ?render= when no new keys are present', () => {
    expect(parseLayers('?render=hachure')).toEqual({ iso: false, hachure: true });
    expect(parseLayers('?render=contour')).toEqual({ iso: true, hachure: false });
  });

  it('new grammar wins: ?render= is ignored when any new key is present', () => {
    // `?render=` says one mode, but the new keys take over with per-key
    // defaults (iso defaults true, hachure defaults false) when present.
    expect(parseLayers('?render=contour&hachure=1')).toEqual({ iso: true, hachure: true });
    expect(parseLayers('?render=hachure&iso=1')).toEqual({ iso: true, hachure: false });
    expect(parseLayers('?render=hachure&iso=0&hachure=1')).toEqual({ iso: false, hachure: true });
  });
});

describe('createGate layers state (ho-A-6.1)', () => {
  it('currentLayers reads the URL with per-key defaults', () => {
    expect(createGate(stubWindow('')).currentLayers()).toEqual({ iso: true, hachure: false });
    // ?hachure=1 alone → iso defaults true (the v1.0 visitor surface), hachure on.
    expect(createGate(stubWindow('?hachure=1')).currentLayers()).toEqual({ iso: true, hachure: true });
    expect(createGate(stubWindow('?iso=0&hachure=1')).currentLayers()).toEqual({ iso: false, hachure: true });
    expect(createGate(stubWindow('?iso=1&hachure=1')).currentLayers()).toEqual({ iso: true, hachure: true });
  });

  it('setLayers merges a partial and notifies', () => {
    const win = stubWindow('?theme=craft');
    const gate = createGate(win);
    const seen = vi.fn();
    gate.onChange(seen);
    gate.setLayers({ hachure: true });
    expect(win.location.search).toBe('?theme=craft&hachure=1');
    expect(gate.currentLayers()).toEqual({ iso: true, hachure: true });
    expect(seen).toHaveBeenCalled();
  });

  it('setLayers to the default ({iso:true, hachure:false}) drops layer keys from the URL', () => {
    const win = stubWindow('?theme=craft&hachure=1');
    const gate = createGate(win);
    gate.setLayers({ hachure: false });
    expect(win.location.search).toBe('?theme=craft');
  });

  it('preserves layers across filter changes', () => {
    const win = stubWindow('?iso=0&hachure=1&theme=craft');
    const gate = createGate(win);
    gate.setState({ media: ['writing'] });
    expect(win.location.search).toBe('?theme=craft&media=writing&iso=0&hachure=1');
    expect(gate.currentLayers()).toEqual({ iso: false, hachure: true });
  });

  it('preserves layers and seed together', () => {
    const win = stubWindow('?seed=42&hachure=1');
    const gate = createGate(win);
    gate.setState({ themes: ['craft'] });
    expect(win.location.search).toBe('?theme=craft&seed=42&hachure=1');
  });

  it('a legacy ?render=hachure URL load reads as {iso:false, hachure:true}', () => {
    const gate = createGate(stubWindow('?render=hachure'));
    expect(gate.currentLayers()).toEqual({ iso: false, hachure: true });
  });
});
