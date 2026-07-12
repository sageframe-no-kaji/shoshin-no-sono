/**
 * The field — the Cartographer's pure math core (ho-05). Two stages:
 *
 *   computePositions  seeded force relaxation -> an organic scatter of peaks
 *   buildHeightfield  sum of per-peak radial functions + elevation-attenuated
 *                     value noise -> a 2D grid of elevations
 *
 * No DOM, no Indexer, no Gate, no URL. Everything is deterministic from the
 * seed: the same (peaks, seed) always yields the same positions and the same
 * field, which is what makes `?seed=` reproducible. This is the territory
 * spike's `heightAt` recreated cleanly and tested — the spike is the reference
 * algorithm, not the source. Per-peak silhouette parameters are derived from
 * data + seed (Decision 4), never hand-authored; tuners live in `opts`
 * (Decision 8). Recorded in ho-process/hos/ho-05-positions-and-heightfield.md.
 */

/**
 * @typedef {Object} Peak A work participating in the heightfield.
 * @property {string} id
 * @property {number} importance Drives radius (size of the massif).
 * @property {number} amplitude importance × filter_relevance — drives height.
 */

/**
 * @typedef {Peak & { x: number, y: number }} PositionedPeak
 */

/**
 * @typedef {Object} FieldOpts
 * @property {number} [width] Field/viewBox width in px (positions live here).
 * @property {number} [height] Field/viewBox height in px.
 * @property {number} [margin] Keep-out border so peaks don't hug the edge.
 * @property {number} [candidates] Best-candidate darts thrown per peak (higher = more even).
 * @property {number} [cell] Heightfield grid resolution in px (smaller = finer).
 * @property {number} [summitExp] Falloff exponent; >1 sharpens the summit.
 * @property {number} [noiseWeight] Amplitude of low-elevation crenellation noise.
 * @property {number} [radiusBase] Massif radius at importance 0.
 * @property {number} [radiusScale] Added radius per importance point.
 * @property {{ x: number, y: number, w: number, h: number }[]} [reserves] Furniture
 *   footprints (ho-08: the cartouche, then the face key — furniture is plural now)
 *   no peak may seat in — best-candidate darts inside any of them (grown by a
 *   small standoff) are discarded.
 */

/**
 * Field defaults. Geometry (width/height/margin/cell/candidates) carried from
 * the spike; the feel parameters (summitExp/noiseWeight/radiusBase/radiusScale)
 * landed by the practitioner's by-feel pass in ho-06.5 — a dense field of
 * individuated hills, importance reading as prominence, softer summits.
 */
const DEFAULTS = {
  width: 1000,
  height: 620,
  margin: 70,
  candidates: 12,
  cell: 4,
  summitExp: 1.15,
  noiseWeight: 0.3,
  radiusBase: 12,
  radiusScale: 8,
};

/**
 * Seeded PRNG (mulberry32) — same generator the spike and the settlements use.
 * @param {number} a 32-bit seed
 * @returns {() => number} successive floats in [0, 1)
 */
export function mulberry32(a) {
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Stable hash of a work id against the layout seed (FNV-1a flavored), so each
 * peak's silhouette is fixed within a layout but varies between layouts and
 * between works.
 * @param {string} id
 * @param {number} seed
 * @returns {number} uint32
 */
export function hashSeed(id, seed) {
  let h = seed >>> 0;
  for (let i = 0; i < id.length; i++) {
    h = Math.imul(h ^ id.charCodeAt(i), 0x01000193) >>> 0;
  }
  return h >>> 0;
}

/** @param {FieldOpts} [opts] @returns {typeof DEFAULTS & FieldOpts} */
function withDefaults(opts) {
  return { ...DEFAULTS, ...opts };
}

/**
 * Scatter peaks across the field by seeded best-candidate sampling (Mitchell):
 * each peak is the farthest-from-its-neighbors of several random darts, which
 * gives a blue-noise-like organic spread — even but not gridded — that fills
 * the interior instead of pinning to the boundary the way a repulsion sim does.
 * Deterministic from the seed; positions do not depend on importance or filter
 * state (Decision 1, Decision 2).
 * @param {Peak[]} peaks
 * @param {number} seed
 * @param {FieldOpts} [opts]
 * @returns {PositionedPeak[]} the same peaks with x, y in field space
 */
export function computePositions(peaks, seed, opts) {
  const o = withDefaults(opts);
  const n = peaks.length;
  if (n === 0) return [];

  const minX = o.margin;
  const minY = o.margin;
  const spanX = o.width - 2 * o.margin;
  const spanY = o.height - 2 * o.margin;
  const tries = Math.max(1, o.candidates);

  const rnd = mulberry32(seed >>> 0);
  /** @type {number[]} */
  const xs = [];
  /** @type {number[]} */
  const ys = [];

  // The furniture keep-out (ho-08): a peak's CENTER never seats inside any
  // reserve footprint plus a standoff — the field suppression handles the
  // flanks, but a summit under the furniture would drown a work.
  const rsvs = o.reserves ?? [];
  const STANDOFF = 30;
  const inReserve = (/** @type {number} */ px, /** @type {number} */ py) =>
    rsvs.some(
      (rsv) =>
        px >= rsv.x - STANDOFF &&
        px <= rsv.x + rsv.w + STANDOFF &&
        py >= rsv.y - STANDOFF &&
        py <= rsv.y + rsv.h + STANDOFF,
    );

  for (let i = 0; i < n; i++) {
    let bx = minX;
    let by = minY;
    let best = -1;
    for (let c = 0; c < tries; c++) {
      const px = minX + rnd() * spanX;
      const py = minY + rnd() * spanY;
      if (inReserve(px, py)) continue; // the dart landed under the furniture
      // Distance to the nearest already-placed peak (Infinity for the first).
      let nearest = Infinity;
      for (let j = 0; j < xs.length; j++) {
        const d = Math.hypot(px - xs[j], py - ys[j]);
        if (d < nearest) nearest = d;
      }
      if (nearest > best) {
        best = nearest;
        bx = px;
        by = py;
      }
    }
    xs.push(bx);
    ys.push(by);
  }

  return peaks.map((p, i) => ({ ...p, x: xs[i], y: ys[i] }));
}

/**
 * @typedef {PositionedPeak & {
 *   ell: number, rot: number, radius: number,
 *   harm: Array<{ k: number, a: number, phi: number }>
 * }} PreparedPeak
 */

/**
 * Derive each peak's silhouette parameters from its id + the layout seed
 * (Decision 4). Ellipticity, rotation, and angular harmonics are seeded;
 * radius scales with importance. Silhouettes fall out of the field — never
 * authored per peak.
 * @param {PositionedPeak[]} peaks
 * @param {number} seed
 * @param {FieldOpts} [opts]
 * @returns {PreparedPeak[]}
 */
export function preparePeaks(peaks, seed, opts) {
  const o = withDefaults(opts);
  return peaks.map((p) => {
    const r = mulberry32(hashSeed(p.id, seed));
    const ell = 0.85 + r() * 0.25; // 0.85–1.10, like the spike's hand-picked trio
    const rot = r() * Math.PI; // ellipse is symmetric over π
    /** @type {Array<{ k: number, a: number, phi: number }>} */
    const harm = [];
    for (let kk = 2; kk <= 5; kk++) {
      harm.push({ k: kk, a: 0.04 + r() * 0.1, phi: r() * 2 * Math.PI });
    }
    return { ...p, ell, rot, radius: o.radiusBase + p.importance * o.radiusScale, harm };
  });
}

/**
 * Elevation at a single point: sum of per-peak radial profiles plus value noise
 * that attenuates toward summits (crenellation-decays-with-elevation). The
 * profile is sharper-than-Gaussian — exp(−(d/rEff)^summitExp) — to avoid a
 * flat top (Decision 3).
 * @param {number} x
 * @param {number} y
 * @param {PreparedPeak[]} peaks
 * @param {(u: number, v: number) => number} noise sampler over normalized [0,1]²
 * @param {FieldOpts} [opts]
 * @returns {number}
 */
export function heightAt(x, y, peaks, noise, opts) {
  const o = withDefaults(opts);
  let h = 0;
  let summitW = 0; // ~1 at a summit, ~0 in open country — geometric, not height-scaled
  for (const p of peaks) {
    const ddx = x - p.x;
    const ddy = y - p.y;
    const ca = Math.cos(-p.rot);
    const sa = Math.sin(-p.rot);
    const lx = ddx * ca - ddy * sa;
    const ly = (ddx * sa + ddy * ca) / p.ell; // rotate, then un-squash
    const d = Math.hypot(lx, ly);
    const ang = Math.atan2(ly, lx);
    let wob = 0;
    for (const term of p.harm) wob += term.a * Math.sin(term.k * ang + term.phi);
    const rEff = p.radius * (1 + wob);
    const e = Math.exp(-Math.pow(Math.max(0, d) / rEff, o.summitExp));
    h += p.amplitude * e;
    if (e > summitW) summitW = e;
  }
  h += noise(x / o.width, y / o.height) * o.noiseWeight * (1 - summitW);
  return h;
}

/**
 * Two-octave value noise over normalized [0,1]², bilinearly interpolated with
 * a smoothstep — the spike's `noiseField`, combined as 0.9·coarse + 0.4·fine.
 * @param {number} seed
 * @returns {(u: number, v: number) => number}
 */
export function makeNoise(seed) {
  const coarse = valueOctave(seed ^ 0x9e3779b9, 9, 6);
  const fine = valueOctave(seed ^ 0x85ebca77, 17, 11);
  return (/** @type {number} */ u, /** @type {number} */ v) => coarse(u, v) * 0.9 + fine(u, v) * 0.4;
}

/**
 * A single value-noise octave over normalized [0,1]², bilinearly interpolated
 * with a smoothstep — the shared sampler under makeNoise and makeCoastNoise.
 * @param {number} s seed @param {number} cols @param {number} rows
 * @returns {(u: number, v: number) => number}
 */
function valueOctave(s, cols, rows) {
  const rnd = mulberry32(s >>> 0);
  const g = new Float64Array(cols * rows);
  for (let i = 0; i < g.length; i++) g[i] = rnd() * 2 - 1;
  return (/** @type {number} */ u, /** @type {number} */ v) => {
    const x = u * (cols - 1);
    const y = v * (rows - 1);
    let i0 = Math.floor(x);
    let j0 = Math.floor(y);
    const fx = x - i0;
    const fy = y - j0;
    i0 = Math.max(0, Math.min(cols - 2, i0));
    j0 = Math.max(0, Math.min(rows - 2, j0));
    const a = g[j0 * cols + i0];
    const b = g[j0 * cols + i0 + 1];
    const c = g[(j0 + 1) * cols + i0];
    const dd = g[(j0 + 1) * cols + i0 + 1];
    const sx = fx * fx * (3 - 2 * fx);
    const sy = fy * fy * (3 - 2 * fy);
    return (a * (1 - sx) + b * sx) * (1 - sy) + (c * (1 - sx) + dd * sx) * sy;
  };
}

/**
 * Island-scale value noise — two octaves finer than makeNoise, for the coast
 * ruggedness term (ho-08): coastline wobble, inlets, and the islets a chart
 * scatters offshore live at a smaller wavelength than the terrain crenellation.
 * @param {number} seed
 * @returns {(u: number, v: number) => number}
 */
export function makeCoastNoise(seed) {
  const mid = valueOctave(seed ^ 0xc2b2ae35, 23, 15);
  const fine = valueOctave(seed ^ 0x27d4eb2f, 45, 29);
  return (/** @type {number} */ u, /** @type {number} */ v) => mid(u, v) * 0.7 + fine(u, v) * 0.5;
}

/**
 * @typedef {Object} Heightfield
 * @property {Float64Array} field row-major elevations, length cols×rows
 * @property {number} cols
 * @property {number} rows
 * @property {number} cell px per grid step
 * @property {number} width
 * @property {number} height
 * @property {number} max largest elevation in the grid
 */

/**
 * Sample the heightfield onto a regular grid. Positioned peaks in, elevation
 * grid out — the input ho-06 extracts contours from.
 * @param {PositionedPeak[]} peaks
 * @param {number} seed
 * @param {FieldOpts} [opts]
 * @returns {Heightfield}
 */
export function buildHeightfield(peaks, seed, opts) {
  const o = withDefaults(opts);
  const prepared = preparePeaks(peaks, seed, opts);
  const noise = makeNoise(seed >>> 0);
  const cols = Math.ceil(o.width / o.cell) + 1;
  const rows = Math.ceil(o.height / o.cell) + 1;
  const field = new Float64Array(cols * rows);
  let max = 0;
  for (let j = 0; j < rows; j++) {
    for (let i = 0; i < cols; i++) {
      const v = heightAt(i * o.cell, j * o.cell, prepared, noise, opts);
      field[j * cols + i] = v;
      if (v > max) max = v;
    }
  }
  return { field, cols, rows, cell: o.cell, width: o.width, height: o.height, max };
}

/**
 * Apply the sea datum (ho-08): subtract sea level from every sample and clamp
 * at zero, so the shore is EXACTLY elevation 0 and the sea is dead flat. A
 * flat sea means the terrain renderers have nothing to say below the
 * coastline — no iso crossing, no hachure gradient — without any renderer
 * knowing the sea exists.
 *
 * `ruggedness` adds the coast noise term: island-scale seeded noise whose
 * Gaussian envelope peaks AT the waterline and dies off above and below it.
 * Near the coast it wobbles the shoreline (inlets) and pushes bumps over the
 * datum (islets); at the summits the envelope is ~0 so the peaks never move;
 * in the deep sea the clamp eats it. Deterministic from the seed — `?seed=`
 * reproduces the exact archipelago.
 *
 * `reserve` denies elevation under a furniture footprint (ho-08: the
 * cartouche): the field rolls smoothly to sea level inside the rect, feathered
 * over `feather` px outside it — the terrain yields a bay for the map's own
 * signature, and the sea floods it by physics (coastline, waterlines, and
 * waves wrap the bay with no renderer knowing why). Mutates the freshly-built
 * heightfield and returns it.
 * @param {Heightfield} hf
 * @param {number} fraction sea level as a fraction of the field max (0 = no sea)
 * @param {{ ruggedness?: number, seed?: number, reserve?: { x: number, y: number, w: number, h: number }, feather?: number }} [opts]
 * @returns {Heightfield}
 */
export function applySeaDatum(hf, fraction, opts = {}) {
  if (fraction <= 0 || hf.max <= 0) return hf;
  const sl = fraction * hf.max;
  const ruggedness = opts.ruggedness ?? 0;
  const noise = ruggedness > 0 ? makeCoastNoise((opts.seed ?? 0) >>> 0) : null;
  const amp = ruggedness * sl * 1.2;
  const w = 0.5 * sl; // envelope half-width in elevation units — the coast band
  const rsv = opts.reserve;
  const feather = opts.feather ?? 45;
  const { cols, rows, cell } = hf;
  let max = 0;
  for (let j = 0; j < rows; j++) {
    for (let i = 0; i < cols; i++) {
      const k = j * cols + i;
      let v = hf.field[k] - sl;
      if (noise) {
        const env = Math.exp(-(v * v) / (2 * w * w));
        v += amp * noise(i / (cols - 1), j / (rows - 1)) * env;
      }
      v = Math.max(0, v);
      if (rsv && v > 0) {
        // Distance outside the reserve rect (0 inside) → smoothstep rolloff.
        const px = i * cell;
        const py = j * cell;
        const dx = Math.max(rsv.x - px, 0, px - (rsv.x + rsv.w));
        const dy = Math.max(rsv.y - py, 0, py - (rsv.y + rsv.h));
        const d = Math.hypot(dx, dy);
        if (d < feather) {
          const t = d / feather;
          v *= t * t * (3 - 2 * t);
        }
      }
      hf.field[k] = v;
      if (v > max) max = v;
    }
  }
  hf.max = max;
  return hf;
}
