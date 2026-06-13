/**
 * Debug heat-map renderer (ho-05) — TRANSIENT. This is the verification
 * surface for positions and elevations only: elevation maps to darkness so the
 * practitioner can confirm peaks land where the position computer put them and
 * rise to the heights the heightfield assigns, across filter states. ho-06
 * replaces it with the marching-squares contour renderer; this module is meant
 * to be deleted then, which is why it lives apart from the Cartographer.
 *
 * Pure: heightfield in, SVG string out. No DOM.
 */

/** @typedef {import('./field.js').Heightfield} Heightfield */
/** @typedef {import('./field.js').PositionedPeak} PositionedPeak */

const PAPER = [253, 252, 249]; // #FDFCF9
const INK = [43, 43, 43]; // #2B2B2B

/**
 * Elevation ramp: cream at the valleys, ink at the summits.
 * @param {number} t normalized elevation in [0, 1]
 * @returns {string} #rrggbb
 */
export function rampColor(t) {
  const c = Math.max(0, Math.min(1, t));
  const ch = (/** @type {number} */ lo, /** @type {number} */ hi) =>
    Math.round(lo + (hi - lo) * c)
      .toString(16)
      .padStart(2, '0');
  return `#${ch(PAPER[0], INK[0])}${ch(PAPER[1], INK[1])}${ch(PAPER[2], INK[2])}`;
}

/** @param {number} n @returns {number} */
const round1 = (n) => Math.round(n * 10) / 10;

/**
 * Render the heightfield as a grid of filled cells. `step` coarsens the heat
 * map relative to the field grid (debug only — it doesn't need contour-grade
 * resolution); each rendered cell spans `step` grid samples.
 * @param {Heightfield} hf
 * @param {{ step?: number }} [opts]
 * @returns {string} SVG fragment
 */
export function heatmapSvg(hf, opts = {}) {
  const step = Math.max(1, Math.floor(opts.step ?? 2));
  const size = hf.cell * step;
  const max = hf.max || 1;
  let svg = `<rect x="0" y="0" width="${hf.width}" height="${hf.height}" fill="${rampColor(0)}"/>`;
  for (let j = 0; j < hf.rows; j += step) {
    for (let i = 0; i < hf.cols; i += step) {
      const v = hf.field[j * hf.cols + i];
      svg += `<rect x="${round1(i * hf.cell)}" y="${round1(j * hf.cell)}" width="${round1(size)}" height="${round1(size)}" fill="${rampColor(v / max)}"/>`;
    }
  }
  return svg;
}

/**
 * Markers for the positioned peaks — a dot plus the id, so positions are
 * legible on the heat map. Opacity tracks amplitude so sunk (filtered-out)
 * peaks read faint.
 * @param {PositionedPeak[]} peaks
 * @param {{ maxAmplitude?: number }} [opts]
 * @returns {string} SVG fragment
 */
export function peakMarkersSvg(peaks, opts = {}) {
  const maxAmp = opts.maxAmplitude ?? peaks.reduce((m, p) => Math.max(m, p.amplitude), 1);
  return peaks
    .map((p) => {
      const o = round1(0.25 + 0.75 * (p.amplitude / (maxAmp || 1)));
      return (
        `<g opacity="${o}">` +
        `<circle cx="${round1(p.x)}" cy="${round1(p.y)}" r="3" fill="#9A5B3C"/>` +
        `<text x="${round1(p.x + 6)}" y="${round1(p.y + 3)}" font-family="Spectral, Georgia, serif" font-size="10" fill="#9A5B3C">${p.id}</text>` +
        `</g>`
      );
    })
    .join('');
}
