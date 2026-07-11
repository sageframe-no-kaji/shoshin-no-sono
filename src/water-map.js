/**
 * Water map (ho-08) — wave marks in low-elevation zones.
 *
 * Where the heightfield elevation falls below a threshold fraction of the
 * field's maximum, emit a small S-curve (cubic Bézier wave mark) in warm water
 * ink. Opacity scales with depth below the threshold so the shallows are faint
 * and the true lows carry a legible wash.
 *
 * Pure: a heightfield in, an SVG string out. No DOM, no Indexer, no Gate,
 * no URL.
 */

import { REGISTER } from './register.js';

/** @typedef {import('./field.js').Heightfield} Heightfield */

/**
 * @typedef {Object} WavesOpts
 * @property {number} [threshold]   Elevation fraction below which interior waves appear (default 0.18).
 * @property {number} [step]        Sample stride in field px (default 20).
 * @property {number} [opacity]     Maximum wave opacity (default 0.18).
 * @property {number} [edgeMargin]  Px from map boundary that always carries waves (default 90).
 */

/**
 * SVG fragment of wave marks for the given heightfield.
 * Returns `''` when `hf.max <= 0` (empty field) or when no cell falls below
 * the threshold.
 * @param {Heightfield} hf
 * @param {WavesOpts} [opts]
 * @returns {string}
 */
export function wavesSvg(hf, opts = {}) {
  if (hf.max <= 0) return '';

  const threshold = opts.threshold ?? 0.18;
  const step = opts.step ?? 20;
  const maxOpacity = opts.opacity ?? 0.18;
  const edgeMargin = opts.edgeMargin ?? 90;

  const { field, cols, rows, cell, width, height } = hf;
  const elevThresh = threshold * hf.max;

  // Sample stride in grid cells (minimum 1)
  const stride = Math.max(1, Math.round(step / cell));

  // Wave mark geometry constants (path relative to sample centre)
  const W = 10;
  const H = 1.6;

  let out = '';
  let rowIndex = 0;
  for (let j = 0; j < rows; j += stride) {
    const rowParity = rowIndex % 2;
    const xStagger = step * 0.5 * rowParity;
    for (let i = 0; i < cols; i += stride) {
      const elev = field[j * cols + i];
      const cx = i * cell + xStagger;
      const cy = j * cell;

      // Terrain depth: how far below the threshold this cell is.
      const elevDepth = elevThresh > 0 && elev < elevThresh ? 1 - elev / elevThresh : 0;

      // Edge depth: how close to the map boundary (0 at margin, 1 at edge).
      const distToEdge = Math.min(cx, cy, width - cx, height - cy);
      const edgeDepth =
        distToEdge < edgeMargin ? Math.pow(1 - distToEdge / edgeMargin, 1.5) : 0;

      const depth = Math.max(elevDepth, edgeDepth);
      if (depth <= 0) continue;

      const opacity = maxOpacity * depth * depth;
      if (opacity < 0.008) continue;
      const opStr = opacity.toFixed(3);

      const path =
        `M${(cx - W).toFixed(2)},${cy.toFixed(2)} ` +
        `C${(cx - W * 0.5).toFixed(2)},${(cy - H).toFixed(2)} ` +
        `${(cx + W * 0.5).toFixed(2)},${(cy + H).toFixed(2)} ` +
        `${(cx + W).toFixed(2)},${cy.toFixed(2)}`;
      out +=
        `<path d="${path}" fill="none" stroke="${REGISTER.waterInk}" ` +
        `stroke-width="0.35" stroke-linecap="round" opacity="${opStr}"/>`;
    }
    rowIndex++;
  }
  return out;
}
