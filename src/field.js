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
 * @property {number} [iterations] Force-relaxation steps.
 * @property {number} [spread] Scales the ideal inter-peak distance.
 * @property {number} [gravity] Pull toward center that counters repulsion.
 * @property {number} [cell] Heightfield grid resolution in px (smaller = finer).
 * @property {number} [summitExp] Falloff exponent; >1 sharpens the summit.
 * @property {number} [noiseWeight] Amplitude of low-elevation crenellation noise.
 * @property {number} [radiusBase] Massif radius at importance 0.
 * @property {number} [radiusScale] Added radius per importance point.
 */

/** Provisional values carried from the territory spike; tune by feel (Decision 8). */
const DEFAULTS = {
  width: 1000,
  height: 620,
  margin: 70,
  iterations: 140,
  spread: 0.6,
  gravity: 0.045,
  cell: 4,
  summitExp: 1.7,
  noiseWeight: 0.85,
  radiusBase: 40,
  radiusScale: 16,
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

/** @param {FieldOpts} [opts] @returns {Required<FieldOpts>} */
function withDefaults(opts) {
  return { ...DEFAULTS, ...opts };
}

/**
 * Scatter peaks across the field by seeded force relaxation
 * (Fruchterman-Reingold flavored: pairwise repulsion + center gravity, cooled
 * over a fixed iteration count). Deterministic from the seed; positions do not
 * depend on importance or filter state (Decision 1, Decision 2).
 * @param {Peak[]} peaks
 * @param {number} seed
 * @param {FieldOpts} [opts]
 * @returns {PositionedPeak[]} the same peaks with x, y in field space
 */
export function computePositions(peaks, seed, opts) {
  const o = withDefaults(opts);
  const n = peaks.length;
  if (n === 0) return [];

  const cx = o.width / 2;
  const cy = o.height / 2;
  const minX = o.margin;
  const minY = o.margin;
  const maxX = o.width - o.margin;
  const maxY = o.height - o.margin;
  const clamp = (/** @type {number} */ v, /** @type {number} */ lo, /** @type {number} */ hi) =>
    Math.max(lo, Math.min(hi, v));

  // Seeded initial placement.
  const rnd = mulberry32(seed >>> 0);
  const xs = new Float64Array(n);
  const ys = new Float64Array(n);
  for (let i = 0; i < n; i++) {
    xs[i] = minX + rnd() * (maxX - minX);
    ys[i] = minY + rnd() * (maxY - minY);
  }

  // Ideal separation: the FR constant k ~ sqrt(area / count).
  const k = Math.sqrt(((maxX - minX) * (maxY - minY)) / n) * o.spread;
  let temp = o.width * 0.1;
  const cool = temp / (o.iterations + 1);
  const dx = new Float64Array(n);
  const dy = new Float64Array(n);

  for (let step = 0; step < o.iterations; step++) {
    dx.fill(0);
    dy.fill(0);
    // Pairwise repulsion k²/d.
    for (let i = 0; i < n; i++) {
      for (let j = i + 1; j < n; j++) {
        let ddx = xs[i] - xs[j];
        let ddy = ys[i] - ys[j];
        let dist = Math.hypot(ddx, ddy) || 1e-4;
        const f = (k * k) / dist;
        const ux = ddx / dist;
        const uy = ddy / dist;
        dx[i] += ux * f;
        dy[i] += uy * f;
        dx[j] -= ux * f;
        dy[j] -= uy * f;
      }
    }
    // Gravity toward center keeps the cluster on the paper.
    for (let i = 0; i < n; i++) {
      dx[i] += (cx - xs[i]) * o.gravity * k * 0.1;
      dy[i] += (cy - ys[i]) * o.gravity * k * 0.1;
    }
    // Apply, capped by the cooling temperature, then clamp to bounds.
    for (let i = 0; i < n; i++) {
      const d = Math.hypot(dx[i], dy[i]) || 1e-4;
      xs[i] = clamp(xs[i] + (dx[i] / d) * Math.min(d, temp), minX, maxX);
      ys[i] = clamp(ys[i] + (dy[i] / d) * Math.min(d, temp), minY, maxY);
    }
    temp = Math.max(0, temp - cool);
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
  const octave = (/** @type {number} */ s, /** @type {number} */ cols, /** @type {number} */ rows) => {
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
  };
  const coarse = octave(seed ^ 0x9e3779b9, 9, 6);
  const fine = octave(seed ^ 0x85ebca77, 17, 11);
  return (u, v) => coarse(u, v) * 0.9 + fine(u, v) * 0.4;
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
