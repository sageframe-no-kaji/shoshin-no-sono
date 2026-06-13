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

/**
 * Elevation ramp for the debug view — a vivid hue sweep (blue valleys → red
 * summits) with lightness falling as elevation rises. Deliberately NOT the
 * cream/ink register: the goal here is maximum legibility of structure, not
 * fidelity. ho-06's contour renderer is the one that honors the register.
 * @param {number} t normalized elevation in [0, 1]
 * @returns {string} an hsl() color
 */
export function rampColor(t) {
  const c = Math.max(0, Math.min(1, t));
  const hue = Math.round(240 - 240 * c); // 240 blue (low) → 0 red (high)
  const light = Math.round(80 - 46 * c); // pale low → deep high
  return `hsl(${hue} 68% ${light}%)`;
}

/** @param {number} n @returns {number} */
const round1 = (n) => Math.round(n * 10) / 10;

/**
 * Render the heightfield as a grid of filled cells, elevation quantized into
 * bands so structure reads as topographic terraces (a cheap contour preview
 * before ho-06 extracts real iso-lines). `step` coarsens the grid relative to
 * the field resolution; `bands` sets the number of elevation terraces.
 * @param {Heightfield} hf
 * @param {{ step?: number, bands?: number }} [opts]
 * @returns {string} SVG fragment
 */
export function heatmapSvg(hf, opts = {}) {
  const step = Math.max(1, Math.floor(opts.step ?? 2));
  const bands = Math.max(1, Math.floor(opts.bands ?? 16));
  const size = hf.cell * step;
  const max = hf.max || 1;
  /** @param {number} v @returns {string} */
  const banded = (v) => rampColor(Math.round((v / max) * bands) / bands);
  let svg = `<rect x="0" y="0" width="${hf.width}" height="${hf.height}" fill="${rampColor(0)}"/>`;
  for (let j = 0; j < hf.rows; j += step) {
    for (let i = 0; i < hf.cols; i += step) {
      svg += `<rect x="${round1(i * hf.cell)}" y="${round1(j * hf.cell)}" width="${round1(size)}" height="${round1(size)}" fill="${banded(hf.field[j * hf.cols + i])}"/>`;
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
      const o = round1(0.35 + 0.65 * (p.amplitude / (maxAmp || 1)));
      const x = round1(p.x);
      const y = round1(p.y);
      return (
        `<g opacity="${o}">` +
        `<circle cx="${x}" cy="${y}" r="3.5" fill="#fff" stroke="#000" stroke-width="1"/>` +
        `<text x="${round1(p.x + 7)}" y="${round1(p.y + 3.5)}" font-family="Spectral, Georgia, serif" font-size="10.5" fill="#111" stroke="#fff" stroke-width="2.5" paint-order="stroke" style="paint-order:stroke">${p.id}</text>` +
        `</g>`
      );
    })
    .join('');
}
