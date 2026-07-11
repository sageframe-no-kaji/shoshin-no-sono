/**
 * Water map (ho-08) — the sea at the map's edges: coastline and waterlining.
 *
 * The heightfield arrives datumed (src/field.js applySeaDatum): the shore is
 * exactly elevation 0 and the sea is dead flat, so the terrain renderers have
 * nothing to say below the coastline — no iso crossings, no hachure gradients.
 * This module draws everything the sea carries. The sea is the flat-zero
 * region CONNECTED TO THE MAP BOUNDARY (flood fill — interior flat basins are
 * valley floors, not lakes; session 2 rejected lakes).
 *
 * The register is the survey-chart waterline (the Upolu reference plate, and
 * the old-map water treatments the practitioner pointed at): a cream-cased
 * ink coastline at the shore, then waterlining — smooth coast-parallel offset
 * lines whose spacing grows and ink thins seaward, drawn as iso-lines of a
 * smoothed distance-from-shore field, so they parallel every shore including
 * islands. No scattered wave squiggles.
 *
 * Pure: a heightfield in, an SVG string out. No DOM, no Indexer, no Gate,
 * no URL.
 */

import { REGISTER } from './register.js';
import { extractContour, segsToPath } from './contours.js';

/** @typedef {import('./field.js').Heightfield} Heightfield */

/**
 * @typedef {Object} WaterOpts
 * @property {number} [coastWeight] Coastline stroke weight (default 0.7).
 * @property {number} [waterlines]  Number of waterline offsets hugging the coast (default 4).
 * @property {number} [opacity]     Waterline ink strength at the coast (default 0.5; 0 hides the waterlines).
 * @property {number} [waves]       Wave-texture intensity — rows of fine horizontal water strokes
 *                                  filling the open sea (default 0.35; 0 hides them).
 */

/**
 * The sea mask: flat-zero cells connected to the map boundary (4-neighbor
 * flood fill). Enclosed flat basins stay unmasked — land, not lakes.
 * @param {Heightfield} hf
 * @param {number} [seaLevel] elevation at/below which a cell can be sea (default ~0)
 * @returns {Uint8Array} cols×rows, 1 = sea
 */
export function seaMask(hf, seaLevel = 1e-9) {
  const { field, cols, rows } = hf;
  const mask = new Uint8Array(cols * rows);
  /** @type {number[]} */
  const queue = [];
  const push = (/** @type {number} */ i, /** @type {number} */ j) => {
    const k = j * cols + i;
    if (!mask[k] && field[k] <= seaLevel) {
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
 * Distance-from-shore over the sea (px): land cells are 0, sea cells carry
 * their BFS distance from the nearest land, softened by two smoothing passes
 * so the waterline offsets read as drawn curves rather than city blocks.
 * @param {Heightfield} hf
 * @param {Uint8Array} mask the sea mask
 * @returns {Float64Array}
 */
export function seaDistance(hf, mask) {
  const { cols, rows, cell } = hf;
  const dist = new Float64Array(cols * rows);
  /** @type {number[]} */
  let frontier = [];
  for (let k = 0; k < dist.length; k++) {
    if (mask[k]) dist[k] = Infinity;
    else frontier.push(k); // land seeds the shore at distance 0
  }
  while (frontier.length > 0) {
    /** @type {number[]} */
    const next = [];
    for (const k of frontier) {
      const i = k % cols;
      const j = (k - i) / cols;
      for (const n of [
        i > 0 ? k - 1 : -1,
        i < cols - 1 ? k + 1 : -1,
        j > 0 ? k - cols : -1,
        j < rows - 1 ? k + cols : -1,
      ]) {
        if (n >= 0 && dist[n] === Infinity) {
          dist[n] = dist[k] + cell;
          next.push(n);
        }
      }
    }
    frontier = next;
  }
  // Two smoothing passes soften the 4-neighbor diamonds into drawn curves;
  // land stays anchored at 0 so the first offsets keep hugging the shore.
  for (let pass = 0; pass < 2; pass++) {
    const buf = Float64Array.from(dist);
    for (let j = 1; j < rows - 1; j++) {
      for (let i = 1; i < cols - 1; i++) {
        const k = j * cols + i;
        if (!mask[k]) continue;
        dist[k] = (buf[k] + buf[k - 1] + buf[k + 1] + buf[k - cols] + buf[k + cols]) / 5;
      }
    }
  }
  return dist;
}

/**
 * The full water treatment for a datumed heightfield: the coastline stroke at
 * the shore and the waterlining seaward of it. Empty string when there is no
 * field or no sea.
 * @param {Heightfield} hf
 * @param {WaterOpts} [opts]
 * @returns {string}
 */
export function waterSvg(hf, opts = {}) {
  if (hf.max <= 0) return '';
  const coastWeight = opts.coastWeight ?? 0.7;
  const inkOpacity = opts.opacity ?? 0.5;
  const lineCount = opts.waterlines ?? 4;
  const waveIntensity = opts.waves ?? 0.35;

  const mask = seaMask(hf);
  let hasSea = false;
  for (let k = 0; k < mask.length; k++) {
    if (mask[k]) {
      hasSea = true;
      break;
    }
  }
  if (!hasSea) return '';

  const { cols, rows, cell, width, height } = hf;
  let svg = '';

  // The sea settles to paper first: cream paint-over of the masked region
  // (run-length rects per row). The terrain is silent below the datum, but
  // land-side hachure strokes overhang the shore — the paint-over clips them.
  for (let j = 0; j < rows; j++) {
    let run = -1;
    for (let i = 0; i <= cols; i++) {
      const sea = i < cols && mask[j * cols + i] === 1;
      if (sea && run < 0) run = i;
      if (!sea && run >= 0) {
        svg +=
          `<rect x="${((run - 0.5) * cell).toFixed(1)}" y="${((j - 0.5) * cell).toFixed(1)}" ` +
          `width="${((i - run) * cell).toFixed(1)}" height="${cell.toFixed(1)}" fill="${REGISTER.paper}"/>`;
        run = -1;
      }
    }
  }

  // The coastline — the shore is ZERO; the ring hugs it just above, cream-
  // cased so it stays crisp against the last hachures on the land side. Only
  // sea-adjacent segments draw: an inland flat-zero pocket (clamped noise)
  // must not grow a lake outline.
  const nearSea = (/** @type {import('./contours.js').Segment} */ s) => {
    const i0 = Math.max(0, Math.min(cols - 1, Math.floor((s[0].x + s[1].x) / 2 / cell)));
    const j0 = Math.max(0, Math.min(rows - 1, Math.floor((s[0].y + s[1].y) / 2 / cell)));
    for (const [di, dj] of [
      [0, 0],
      [1, 0],
      [0, 1],
      [1, 1],
    ]) {
      if (mask[Math.min(rows - 1, j0 + dj) * cols + Math.min(cols - 1, i0 + di)]) return true;
    }
    return false;
  };
  const coastSegs = extractContour(hf, 0.02 * hf.max).filter(nearSea);
  if (coastSegs.length > 0) {
    const d = segsToPath(coastSegs);
    svg +=
      `<path d="${d}" fill="none" stroke="${REGISTER.paper}" stroke-width="${(coastWeight + 2).toFixed(2)}" stroke-linecap="round"/>` +
      `<path d="${d}" fill="none" stroke="${REGISTER.ink}" stroke-width="${coastWeight.toFixed(2)}" stroke-linecap="round"/>`;
  }

  const dist = seaDistance(hf, mask);

  // Waterlining: a FEW offsets hugging the coast, tight spacing, thinning fast
  // — the old-chart accent on the shore, not bathymetry rings marching to the
  // frame. Iso-lines of the distance field, so they parallel every shore,
  // islands included, and can never touch land.
  if (inkOpacity > 0 && lineCount > 0) {
    /** @type {Heightfield} */
    const distHf = { field: dist, cols, rows, cell, width, height, max: Infinity };
    let offset = 5;
    let gap = 5.5;
    for (let k = 0; k < lineCount; k++) {
      const segs = extractContour(distHf, offset);
      if (segs.length > 0) {
        const t = k / lineCount;
        const w = (0.35 * (1 - t) + 0.12).toFixed(2);
        const op = (inkOpacity * (1 - 0.7 * t)).toFixed(2);
        svg +=
          `<path d="${segsToPath(segs)}" fill="none" stroke="${REGISTER.waterInk}" ` +
          `stroke-width="${w}" opacity="${op}" stroke-linecap="round"/>`;
      }
      offset += gap;
      gap *= 1.22;
    }
  }

  // Wave texture: rows of fine horizontal water strokes filling the open sea
  // beyond the waterlined shore band — the old-map horizontal ruling the
  // practitioner pointed at. A slow sine wobble keeps the rows hand-ruled
  // rather than mechanical; strokes exist only where the sea is (never on
  // land, never inside the waterline band).
  if (waveIntensity > 0) {
    const rowStep = Math.max(1, Math.round(9 / cell));
    const standoff = 5 + 5.5 * Math.min(lineCount, 2); // clear the tightest waterlines
    let wavePath = '';
    for (let j = rowStep; j < rows - 1; j += rowStep) {
      const y = j * cell;
      /** @type {number} */
      let runStart = -1;
      for (let i = 0; i <= cols; i++) {
        const inWater = i < cols && mask[j * cols + i] === 1 && dist[j * cols + i] > standoff;
        if (inWater && runStart < 0) runStart = i;
        if (!inWater && runStart >= 0) {
          // One wobbled polyline per run, sampled every other cell.
          if (i - runStart >= 3) {
            const pts = [];
            for (let s = runStart; s <= i - 1; s += 2) {
              const x = s * cell;
              pts.push(`${x.toFixed(1)},${(y + Math.sin(x * 0.045 + j * 1.7) * 1.2).toFixed(1)}`);
            }
            if (pts.length >= 2) wavePath += `M${pts[0]} L${pts.slice(1).join(' L')} `;
          }
          runStart = -1;
        }
      }
    }
    if (wavePath) {
      svg +=
        `<path d="${wavePath.trim()}" fill="none" stroke="${REGISTER.waterInk}" ` +
        `stroke-width="0.3" opacity="${(0.65 * waveIntensity).toFixed(2)}" stroke-linecap="round"/>`;
    }
  }

  return svg;
}
