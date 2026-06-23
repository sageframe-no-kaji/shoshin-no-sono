/**
 * Hachure map render (ho-A-6.0) — the second renderer for the same heightfield.
 * Sidequest alongside src/contour-map.js: instead of tracing iso-elevation
 * polylines, walk a sample grid, compute the gradient at each sample by central
 * differences, and emit a short downhill stroke whose length and weight scale
 * with slope magnitude. Position and angle are jittered by a seeded PRNG so the
 * field reads as inked-by-hand rather than printed-grid.
 *
 * Pure: a heightfield in, an SVG string out, no DOM, no Indexer, no Gate, no
 * URL. The register colors (ink #2B2B2B on cream #FDFCF9) and the cap shape are
 * frozen — exposed as `opts` only so the renderer is testable. The by-feel
 * tuners (sampleStep, slopeFloor, slopeRef, lenBase/Scale, wBase/Scale,
 * posJitter, angleJitter, seed) are live on the cartography page.
 * Recorded in ho-process/hos/ho-A-hachure-6.0-renderer.md.
 */

/** @typedef {import('./field.js').Heightfield} Heightfield */

/**
 * @typedef {Object} HachureMapOpts
 * @property {number} [sampleStep] Sample stride in px (smaller = denser strokes).
 * @property {number} [slopeFloor] Below this gradient magnitude, no stroke (flats stay paper).
 * @property {number} [slopeRef]   Slope magnitude that maps to "maximum steep" (normalization ceiling).
 * @property {number} [lenBase]    Minimum stroke length in px.
 * @property {number} [lenScale]   Additional stroke length at max-normalized slope.
 * @property {number} [wBase]      Minimum stroke weight.
 * @property {number} [wScale]     Additional stroke weight at max-normalized slope.
 * @property {number} [posJitter]  Position jitter half-amplitude in px.
 * @property {number} [angleJitter] Angle jitter half-amplitude in radians.
 * @property {number} [seed]       PRNG seed for the per-sample jitter.
 * @property {string} [ink]        Stroke color.
 * @property {string} [paper]      Background fill.
 */

/** The frozen register, shared with contour-map.js. */
const REGISTER = {
  ink: '#2B2B2B',
  paper: '#FDFCF9',
};

/** Initial tuner defaults — landed by feel on `:8788`. */
const DEFAULTS = {
  sampleStep: 6,
  slopeFloor: 0.012,
  slopeRef: 0.35,
  lenBase: 1.5,
  lenScale: 5,
  wBase: 0.22,
  wScale: 0.6,
  posJitter: 0.6,
  angleJitter: 0.18,
  seed: 1,
};

/**
 * Mulberry32 — the same generator field.js uses, inlined so this module has no
 * project deps and can be tested from hand-built fixtures.
 * @param {number} a 32-bit seed
 * @returns {() => number}
 */
function mulberry32(a) {
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Stable hash of (seed, i, j) — FNV-1a flavored, matching the field's hashSeed.
 * Same (seed, i, j) → same uint32 → same jitter, across reloads and tests.
 * @param {number} seed @param {number} i @param {number} j
 */
function hashIJ(seed, i, j) {
  let h = seed >>> 0;
  h = Math.imul(h ^ (i + 0x9e3779b9), 0x01000193) >>> 0;
  h = Math.imul(h ^ (j + 0x85ebca77), 0x01000193) >>> 0;
  return h >>> 0;
}

/**
 * Render the heightfield as downhill hachure strokes over a cream ground. One
 * `<line>` per sample whose local slope clears the floor; length and weight
 * scale with slope magnitude, direction is `-∇h` normalized, position and
 * angle are jittered by a (seed, i, j)-keyed PRNG so the plate reproduces
 * byte-identical across reloads (the `?seed=` contract).
 *
 * @param {Heightfield} hf
 * @param {HachureMapOpts} [opts]
 * @returns {string} SVG fragment
 */
export function hachureMapSvg(hf, opts = {}) {
  const o = { ...DEFAULTS, ...opts };
  const ink = opts.ink ?? REGISTER.ink;
  const paper = opts.paper ?? REGISTER.paper;
  const { field, cols, rows, cell, width, height } = hf;

  let svg = `<rect x="0" y="0" width="${width}" height="${height}" fill="${paper}"/>`;

  // Sample stride in grid cells (≥1). The interior loop reads field[j±stride]
  // and field[(j±stride)*cols + i], so we start and stop one stride from the
  // edge — keeps the central-difference window inside the grid.
  const stride = Math.max(1, Math.round(o.sampleStep / cell));
  const step2 = 2 * stride * cell; // denominator of the central difference, in px

  for (let j = stride; j < rows - stride; j += stride) {
    for (let i = stride; i < cols - stride; i += stride) {
      // Central differences over the field grid. dx, dy are elevation units / px.
      const dx = (field[j * cols + (i + stride)] - field[j * cols + (i - stride)]) / step2;
      const dy = (field[(j + stride) * cols + i] - field[(j - stride) * cols + i]) / step2;
      const mag = Math.hypot(dx, dy);
      if (mag < o.slopeFloor) continue;

      const norm = Math.min(1, mag / o.slopeRef);
      const len = o.lenBase + o.lenScale * norm;
      const w = o.wBase + o.wScale * norm;

      // Downhill unit vector = -∇h / |∇h|.
      const dirX = -dx / mag;
      const dirY = -dy / mag;

      // Seeded jitter, deterministic per (seed, i, j).
      const rng = mulberry32(hashIJ(o.seed, i, j));
      const angJ = (rng() - 0.5) * 2 * o.angleJitter;
      const cosA = Math.cos(angJ);
      const sinA = Math.sin(angJ);
      const ux = dirX * cosA - dirY * sinA;
      const uy = dirX * sinA + dirY * cosA;

      const px = (rng() - 0.5) * 2 * o.posJitter;
      const py = (rng() - 0.5) * 2 * o.posJitter;

      const cx = i * cell + px;
      const cy = j * cell + py;
      const half = len / 2;
      const x1 = cx - ux * half;
      const y1 = cy - uy * half;
      const x2 = cx + ux * half;
      const y2 = cy + uy * half;

      svg +=
        `<line x1="${x1.toFixed(1)}" y1="${y1.toFixed(1)}" ` +
        `x2="${x2.toFixed(1)}" y2="${y2.toFixed(1)}" ` +
        `stroke="${ink}" stroke-width="${w.toFixed(2)}" stroke-linecap="round"/>`;
    }
  }
  return svg;
}
