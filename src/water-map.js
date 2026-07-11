/**
 * Water map (ho-08) — the sea at the map's edges: coastline, waterlining,
 * wave marks.
 *
 * The field falls toward zero at the margins, so the low ground CONNECTED TO
 * THE MAP BOUNDARY reads as sea — a coastline where the terrain settles down
 * at the edges. Interior basins below sea level stay land: lakes were
 * rejected in session 2 (no meaning in the grammar), so the sea mask is a
 * flood fill from the boundary, never a bare threshold.
 *
 * The register is the survey-chart waterline (the Upolu reference plate):
 * a cream paint-over of the sea region (the clearing-as-paint-over mechanism
 * — terrain marks below the waterline settle to paper), a cased coastline
 * stroke at sea level, waterlining — coast-parallel sub-level contours
 * thinning and fading seaward — and sparse wave marks in the deep zone.
 *
 * Pure: a heightfield in, an SVG string out. No DOM, no Indexer, no Gate,
 * no URL.
 */

import { REGISTER } from './register.js';
import { extractContour, segsToPath } from './contours.js';

/** @typedef {import('./field.js').Heightfield} Heightfield */

/**
 * @typedef {Object} WaterOpts
 * @property {number} [threshold]  Sea level as a fraction of the field max (default 0.18).
 * @property {number} [opacity]    Wave-mark opacity in the deep zone (default 0.18; 0 hides).
 * @property {number} [waterlines] Number of waterlining contours below the coast (default 4).
 */

/**
 * The sea mask: grid cells below sea level AND connected to the map boundary
 * (4-neighbor flood fill). Interior basins stay unmasked — land, not lakes.
 * @param {Heightfield} hf
 * @param {number} seaLevel absolute elevation of the waterline
 * @returns {Uint8Array} cols×rows, 1 = sea
 */
export function seaMask(hf, seaLevel) {
  const { field, cols, rows } = hf;
  const mask = new Uint8Array(cols * rows);
  /** @type {number[]} */
  const queue = [];
  const push = (/** @type {number} */ i, /** @type {number} */ j) => {
    const k = j * cols + i;
    if (!mask[k] && field[k] < seaLevel) {
      mask[k] = 1;
      queue.push(k);
    }
  };
  for (let i = 0; i < cols; i++) {
    push(i, 0);
    push(i, rows - 1);
  }
  for (let j = 0; j < rows; j++) {
    push(0, j);
    push(cols - 1, j);
  }
  while (queue.length > 0) {
    const k = /** @type {number} */ (queue.pop());
    const i = k % cols;
    const j = (k - i) / cols;
    if (i > 0) push(i - 1, j);
    if (i < cols - 1) push(i + 1, j);
    if (j > 0) push(i, j - 1);
    if (j < rows - 1) push(i, j + 1);
  }
  return mask;
}

/**
 * Keep only contour segments whose midpoint touches the sea mask (any of the
 * surrounding grid cells) — drops the rings of interior basins.
 * @param {import('./contours.js').Segment[]} segs
 * @param {Uint8Array} mask
 * @param {Heightfield} hf
 * @returns {import('./contours.js').Segment[]}
 */
function seawardSegs(segs, mask, hf) {
  const { cols, rows, cell } = hf;
  return segs.filter((s) => {
    const mx = (s[0].x + s[1].x) / 2;
    const my = (s[0].y + s[1].y) / 2;
    const i0 = Math.max(0, Math.min(cols - 1, Math.floor(mx / cell)));
    const j0 = Math.max(0, Math.min(rows - 1, Math.floor(my / cell)));
    for (const [di, dj] of [
      [0, 0],
      [1, 0],
      [0, 1],
      [1, 1],
    ]) {
      const i = Math.min(cols - 1, i0 + di);
      const j = Math.min(rows - 1, j0 + dj);
      if (mask[j * cols + i]) return true;
    }
    return false;
  });
}

/**
 * The full water treatment for a heightfield. Empty string when the field is
 * empty or sea level is not positive.
 * @param {Heightfield} hf
 * @param {WaterOpts} [opts]
 * @returns {string}
 */
export function waterSvg(hf, opts = {}) {
  if (hf.max <= 0) return '';
  const threshold = opts.threshold ?? 0.18;
  const waveOpacity = opts.opacity ?? 0.18;
  const waterlines = opts.waterlines ?? 4;
  const seaLevel = threshold * hf.max;
  if (seaLevel <= 0) return '';

  const mask = seaMask(hf, seaLevel);
  const { field, cols, rows, cell } = hf;
  let svg = '';

  // 1. The sea settles to paper: cream paint-over of the masked region (run-
  //    length rects per row), covering the terrain marks below the waterline.
  //    The coastline's cream casing hides the half-cell seam at the edge.
  for (let j = 0; j < rows; j++) {
    let run = -1;
    for (let i = 0; i <= cols; i++) {
      const sea = i < cols && mask[j * cols + i] === 1;
      if (sea && run < 0) run = i;
      if (!sea && run >= 0) {
        const x = (run - 0.5) * cell;
        const w = (i - run) * cell;
        svg +=
          `<rect x="${x.toFixed(1)}" y="${((j - 0.5) * cell).toFixed(1)}" ` +
          `width="${w.toFixed(1)}" height="${cell.toFixed(1)}" fill="${REGISTER.paper}"/>`;
        run = -1;
      }
    }
  }

  // 2. The coastline and the waterlining: level 0 is the coast (cream-cased
  //    ink stroke); levels below march seaward, thinning and fading — the
  //    survey-chart waterline register.
  for (let k = 0; k <= waterlines; k++) {
    const level = seaLevel * (1 - k / (waterlines + 1));
    if (level <= 0) break;
    const segs = seawardSegs(extractContour(hf, level), mask, hf);
    if (segs.length === 0) continue;
    const d = segsToPath(segs);
    if (k === 0) {
      svg +=
        `<path d="${d}" fill="none" stroke="${REGISTER.paper}" stroke-width="2.6" stroke-linecap="round"/>` +
        `<path d="${d}" fill="none" stroke="${REGISTER.ink}" stroke-width="0.5" stroke-linecap="round"/>`;
    } else {
      const t = k / (waterlines + 1);
      const w = (0.35 * (1 - t) + 0.1).toFixed(2);
      const op = (0.75 * (1 - 0.6 * t)).toFixed(2);
      svg +=
        `<path d="${d}" fill="none" stroke="${REGISTER.waterInk}" stroke-width="${w}" ` +
        `opacity="${op}" stroke-linecap="round"/>`;
    }
  }

  // 3. Sparse wave marks in the deep zone (well below the coast), staggered.
  if (waveOpacity > 0) {
    const deep = seaLevel * 0.55;
    const stride = Math.max(1, Math.round(26 / cell));
    const W = 9;
    const H = 1.5;
    let rowIndex = 0;
    for (let j = stride; j < rows - 1; j += stride) {
      const xStagger = ((rowIndex % 2) * stride * cell) / 2;
      for (let i = stride; i < cols - 1; i += stride) {
        const k = j * cols + i;
        if (!mask[k] || field[k] >= deep) continue;
        const cx = i * cell + xStagger;
        const cy = j * cell;
        const path =
          `M${(cx - W).toFixed(2)},${cy.toFixed(2)} ` +
          `C${(cx - W * 0.5).toFixed(2)},${(cy - H).toFixed(2)} ` +
          `${(cx + W * 0.5).toFixed(2)},${(cy + H).toFixed(2)} ` +
          `${(cx + W).toFixed(2)},${cy.toFixed(2)}`;
        svg +=
          `<path d="${path}" fill="none" stroke="${REGISTER.waterInk}" ` +
          `stroke-width="0.35" stroke-linecap="round" opacity="${waveOpacity.toFixed(3)}"/>`;
      }
      rowIndex++;
    }
  }

  return svg;
}
