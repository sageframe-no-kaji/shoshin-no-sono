/**
 * Contour map render (ho-06) — the heightfield drawn in the frozen register.
 * Pure: a heightfield in, an SVG string out, no DOM. It replaces the transient
 * ho-05 heat map (src/heatmap.js, deleted here) with the cartographic register
 * the visual-register page committed: warm ink on cream, regular strokes at
 * 0.25 and index strokes at 0.7, index every fifth ring, round caps, no fill.
 *
 * The register values are commitments, not tuners — they are exposed as `opts`
 * only so the renderer is testable (Decision 4). The by-feel tuners (interval,
 * and the field-side opts) live upstream; `interval` is forwarded to the
 * geometry. Recorded in ho-process/hos/ho-06-contour-extraction.md.
 */

import { contourGeometry } from './contours.js';

/** @typedef {import('./field.js').Heightfield} Heightfield */
/** @typedef {import('./contours.js').ContourOpts} ContourOpts */

/**
 * @typedef {ContourOpts & {
 *   ink?: string, paper?: string, weightRegular?: number, weightIndex?: number
 * }} ContourMapOpts
 */

/** The frozen register (design/visual-register.html, territory spike). */
const REGISTER = {
  ink: '#2B2B2B',
  paper: '#FDFCF9',
  weightRegular: 0.25,
  weightIndex: 0.7,
};

/**
 * Render the heightfield as iso-elevation contours over a cream ground. One
 * `<path>` per crossing level; index levels stroke heavier. Levels the field
 * never reaches contribute no path.
 * @param {Heightfield} hf
 * @param {ContourMapOpts} [opts]
 * @returns {string} SVG fragment
 */
export function contourMapSvg(hf, opts = {}) {
  const ink = opts.ink ?? REGISTER.ink;
  const paper = opts.paper ?? REGISTER.paper;
  const weightRegular = opts.weightRegular ?? REGISTER.weightRegular;
  const weightIndex = opts.weightIndex ?? REGISTER.weightIndex;

  let svg = `<rect x="0" y="0" width="${hf.width}" height="${hf.height}" fill="${paper}"/>`;
  for (const ring of contourGeometry(hf, opts)) {
    if (!ring.d) continue;
    const w = ring.isIndex ? weightIndex : weightRegular;
    svg += `<path d="${ring.d}" fill="none" stroke="${ink}" stroke-width="${w}" stroke-linecap="round"/>`;
  }
  return svg;
}
