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
import { mulberry32 } from './field.js';

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
  // Two water languages, one dial each: waterlining is the survey-chart
  // register (the Upolu plate), the rolling wave bands are the engraved
  // register (the practitioner's Gastaldi reference). They read as rivals
  // when stacked, so the default is waves-only; raise `waterlines` for the
  // survey register, zero `waves` to swap back entirely.
  const lineCount = opts.waterlines ?? 0;
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
  // cased so it stays crisp against the last hachures on the land side. The
  // outer-coast test floods the below-coast-level region from the boundary
  // (the coast-level analog of the sea mask): every outer-shore segment rides
  // that region's edge, however wide the gentle shore band is — measuring
  // proximity to flat-zero water in cells broke the ring wherever the shore
  // sloped gently. Enclosed flat pockets stay excluded (no lake outlines).
  // Sub-pixel fragments drop too: stroked heavy with round caps they render
  // as ink blobs, which is what the coastline-weight dial was amplifying.
  const coastLevel = 0.02 * hf.max;
  const coastMask = seaMask(hf, coastLevel);
  const nearCoast = (/** @type {import('./contours.js').Segment} */ s) => {
    if (Math.hypot(s[1].x - s[0].x, s[1].y - s[0].y) < 0.75) return false; // degenerate sliver
    const i0 = Math.max(0, Math.min(cols - 1, Math.floor((s[0].x + s[1].x) / 2 / cell)));
    const j0 = Math.max(0, Math.min(rows - 1, Math.floor((s[0].y + s[1].y) / 2 / cell)));
    for (let dj = -1; dj <= 1; dj++) {
      for (let di = -1; di <= 1; di++) {
        const i = Math.max(0, Math.min(cols - 1, i0 + di));
        const j = Math.max(0, Math.min(rows - 1, j0 + dj));
        if (coastMask[j * cols + i]) return true;
      }
    }
    return false;
  };
  const coastSegs = extractContour(hf, coastLevel).filter(nearCoast);
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

  // Wave texture — the engraved sea of the practitioner's reference, built
  // the way the engraver built it: each "wave" is a TRAIN of fine parallel
  // hairlines riding a long slow swell, feathered at the train's edges, with
  // blank paper between trains. Darkness comes from line density, never
  // stroke weight. Everything derives from the band index through a seeded
  // stream, so the sea reproduces exactly.
  if (waveIntensity > 0) {
    const standoff = 4 + 5.5 * Math.min(lineCount, 2); // clear any waterlines
    const GOLD = 2.399963;
    const TRAIN_GAP = 34; // vertical rhythm of the swell trains
    const SUB = 7; // hairlines per train
    const SUB_SPREAD = 1.7; // px between hairlines
    let band = 0;
    for (let yc = TRAIN_GAP * 0.6; yc < height; yc += TRAIN_GAP, band++) {
      const rnd = mulberry32((band + 1) * 0x9e37);
      const phase = band * GOLD + rnd() * 1.5;
      const amp = 8 + rnd() * 6; // the swell's real roll
      const k1 = (Math.PI * 2) / (230 + rnd() * 90); // long wavelength
      const k2 = k1 * (2.3 + rnd());
      const y0 = yc + (rnd() - 0.5) * 8;
      for (let s = 0; s < SUB; s++) {
        const off = (s - (SUB - 1) / 2) * SUB_SPREAD;
        const edge = Math.abs(off) / (((SUB - 1) / 2) * SUB_SPREAD + 0.01); // 0 centre → 1 edge
        // Feather: edge hairlines cover less of each run, asymmetrically.
        const skipHead = rnd() * 0.3 * edge;
        const skipTail = rnd() * 0.3 * edge;
        let d = '';
        /** @type {string[]} */
        let run = [];
        const flush = () => {
          if (run.length >= 4) {
            const a = Math.floor(run.length * skipHead);
            const b = run.length - Math.floor(run.length * skipTail);
            const seg = run.slice(a, b);
            if (seg.length >= 4) d += `M${seg[0]} L${seg.slice(1).join(' L')} `;
          }
          run = [];
        };
        for (let x = 0; x <= width; x += cell) {
          const yy =
            y0 + off + Math.sin(x * k1 + phase) * amp + Math.sin(x * k2 + phase * 1.7) * (amp * 0.18);
          const i = Math.round(x / cell);
          const j = Math.round(yy / cell);
          const inWater =
            i >= 0 &&
            i < cols &&
            j >= 0 &&
            j < rows &&
            mask[j * cols + i] === 1 &&
            dist[j * cols + i] > standoff;
          if (inWater) run.push(`${x.toFixed(1)},${yy.toFixed(1)}`);
          else flush();
        }
        flush();
        if (d) {
          svg +=
            `<path d="${d.trim()}" fill="none" stroke="${REGISTER.waterInk}" ` +
            `stroke-width="0.22" opacity="${(0.8 * waveIntensity).toFixed(2)}" stroke-linecap="round" stroke-linejoin="round"/>`;
        }
      }
    }
  }

  return svg;
}
