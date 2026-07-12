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
 * @property {number} [waterlines]  Number of waterline offsets hugging the coast (default 0).
 * @property {number} [opacity]     Waterline ink strength at the coast (default 0.5; 0 hides the waterlines).
 * @property {number} [seed]        Layout seed — the engraved sea reproduces exactly at `?seed=`.
 * @property {number} [waveWl]      Session-7 wavelength of the crest undulation (default 42).
 * @property {number} [waveAmp]     Session-7 undulation amplitude (default 2).
 * @property {number} [waveBand]    Session-7 band gap — spacing between crest bands (default 11).
 * @property {number} [waveComb]    Session-7 comb spacing along the crest (default 1.8).
 * @property {number} [waveCombLen] Session-7 comb stroke length (default 7).
 * @property {number} [waveWeight]  Session-7 line weight (crest ×1.05, feathers ×0.5/×0.42; default 0.14).
 * @property {number} [waveInk]     Session-7 ink depth — feather opacity (faint ×0.55; default 0.78; 0 hides the sea).
 * @property {number} [waveWild]    Session-7 randomness — per-band wavelength/amplitude variance (default 0.3).
 */

/**
 * Stitch marching-squares segment soup into ordered point chains (open runs
 * and closed rings), matching endpoints snapped to 1/8 px. The Session-7 sea
 * needs ordered crests: undulation is parameterized by arc length and the
 * comb walks the crest by spacing.
 * @param {import('./contours.js').Segment[]} segs
 * @returns {{ x: number, y: number }[][]}
 */
function stitchSegs(segs) {
  const key = (/** @type {{x:number,y:number}} */ p) =>
    `${Math.round(p.x * 8)}:${Math.round(p.y * 8)}`;
  /** @type {Map<string, Array<[number, number]>>} */
  const adj = new Map();
  segs.forEach((s, i) => {
    for (const e of [0, 1]) {
      const k = key(s[e]);
      const list = adj.get(k) ?? [];
      list.push([i, e]);
      adj.set(k, list);
    }
  });
  const used = new Uint8Array(segs.length);
  /** @type {{ x: number, y: number }[][]} */
  const chains = [];
  for (let i = 0; i < segs.length; i++) {
    if (used[i]) continue;
    used[i] = 1;
    const chain = [segs[i][0], segs[i][1]];
    for (const forward of [true, false]) {
      for (;;) {
        const endPt = forward ? chain[chain.length - 1] : chain[0];
        const cands = adj.get(key(endPt)) ?? [];
        let found = -1;
        let fend = 0;
        for (const [si, se] of cands) {
          if (!used[si]) {
            found = si;
            fend = se;
            break;
          }
        }
        if (found < 0) break;
        used[found] = 1;
        const nxt = segs[found][1 - fend];
        if (forward) chain.push(nxt);
        else chain.unshift(nxt);
      }
    }
    chains.push(chain);
  }
  return chains;
}

/**
 * Bilinear sample of a cols×rows grid at a field point (clamped).
 * @param {Float64Array} arr @param {Heightfield} hf
 * @param {number} x @param {number} y @returns {number}
 */
function sampleGrid(arr, hf, x, y) {
  const { cols, rows, cell } = hf;
  const gx = Math.max(0, Math.min(cols - 1, x / cell));
  const gy = Math.max(0, Math.min(rows - 1, y / cell));
  const i0 = Math.floor(gx);
  const j0 = Math.floor(gy);
  const i1 = Math.min(cols - 1, i0 + 1);
  const j1 = Math.min(rows - 1, j0 + 1);
  const fx = gx - i0;
  const fy = gy - j0;
  return (
    (arr[j0 * cols + i0] * (1 - fx) + arr[j0 * cols + i1] * fx) * (1 - fy) +
    (arr[j1 * cols + i0] * (1 - fx) + arr[j1 * cols + i1] * fx) * fy
  );
}

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
  const lineCount = opts.waterlines ?? 0;
  // Session-7 engraved sea parameters (the practitioner's locked landing).
  const seed = (opts.seed ?? 1) >>> 0;
  const waveWl = opts.waveWl ?? 42;
  const waveAmp = opts.waveAmp ?? 2;
  const waveBand = opts.waveBand ?? 11;
  const waveComb = opts.waveComb ?? 1.8;
  const waveCombLen = opts.waveCombLen ?? 7;
  const waveWeight = opts.waveWeight ?? 0.14;
  const waveInk = opts.waveInk ?? 0.78;
  const waveWild = opts.waveWild ?? 0.3;

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

  // The engraved sea — Session 7 (design/claude-design/exports/
  // session-7-ocean-waves/): bold sinuous CREST lines run parallel to the
  // shore — each band an offset copy of the coast, which on a real map is an
  // iso-line of the distance-from-shore field, naturally relaxing toward an
  // open swell as it marches out — and off each crest a comb of fine
  // quadratic hair-strokes rides the coast normal toward the next band,
  // auto-capped by the band gap. Two ink classes by stroke length (strong
  // feathers and a faint under-comb), crest on top. Ink on paper, per the
  // artifact. Everything derives from the seed, so `?seed=` reproduces the
  // sea exactly. Parked in-session, inherited here: wave interaction with
  // islands (loop crests carry a phase seam) and concave-inlet trimming.
  if (waveInk > 0 && waveWeight > 0) {
    /** @type {Heightfield} */
    const distHf = { field: dist, cols, rows, cell, width, height, max: Infinity };
    const rng = mulberry32((seed ^ 0x5ea0007) >>> 0 || 1);
    let maxDist = 0;
    for (let k = 0; k < dist.length; k++) {
      if (mask[k] && dist[k] > maxDist) maxDist = dist[k];
    }
    const COAST_GAP = 13; // first crest stands off the shore (artifact constant)
    let crestD = '';
    let featherD = '';
    let faintD = '';
    for (let k = 0; COAST_GAP + k * waveBand <= maxDist && k < 80; k++) {
      const level = COAST_GAP + k * waveBand;
      const chains = stitchSegs(extractContour(distHf, level));
      // Per-band wave parameters — the artifact's formulas, verbatim.
      const br = mulberry32(((seed * 2654435761) ^ (k * 40503)) >>> 0);
      const wl = waveWl * (1 + (br() - 0.5) * 0.5 * waveWild);
      const amp = waveAmp * (1 + (br() - 0.5) * 0.9 * waveWild);
      const wl2 = wl * (0.5 + 0.12 * br());
      const amp2 = amp * (0.4 + 0.2 * br());
      const ph1 = br() * 6.28;
      const ph2 = br() * 6.28;
      for (const chain of chains) {
        if (chain.length < 6) continue;
        // The displaced crest: undulation rides the coast normal (the
        // distance-field gradient), parameterized by arc length along the band.
        /** @type {{ x: number, y: number, nx: number, ny: number, on: boolean, s: number }[]} */
        const crest = [];
        let s = 0;
        let prev = null;
        for (const pt of chain) {
          if (prev) s += Math.hypot(pt.x - prev.x, pt.y - prev.y);
          prev = pt;
          const gx = (sampleGrid(dist, hf, pt.x + cell, pt.y) - sampleGrid(dist, hf, pt.x - cell, pt.y)) / (2 * cell);
          const gy = (sampleGrid(dist, hf, pt.x, pt.y + cell) - sampleGrid(dist, hf, pt.x, pt.y - cell)) / (2 * cell);
          const gm = Math.hypot(gx, gy) || 1;
          const nx = gx / gm; // seaward — distance grows away from land
          const ny = gy / gm;
          const u = amp * Math.sin((s * 2 * Math.PI) / wl + ph1) + amp2 * Math.sin((s * 2 * Math.PI) / wl2 + ph2);
          const x = pt.x + nx * u;
          const y = pt.y + ny * u;
          const on =
            x >= 2 && x <= width - 2 && y >= 2 && y <= height - 2 && sampleGrid(dist, hf, x, y) > 2;
          crest.push({ x, y, nx, ny, on, s });
        }
        // Crest line — the pen lifts where the band leaves the visible sea.
        let pen = false;
        for (const c of crest) {
          if (c.on) {
            crestD += (pen ? ' L' : 'M') + c.x.toFixed(1) + ' ' + (c.y + (rng() - 0.5) * 0.9).toFixed(1);
            pen = true;
          } else pen = false;
        }
        crestD += ' ';
        // Feather comb — walk the crest, emit strokes toward the next band
        // along the shared normal, auto-capped by the band gap.
        let acc = 0;
        let target = waveComb * (0.72 + 0.56 * rng());
        for (let i = 1; i < crest.length; i++) {
          const P = crest[i];
          acc += Math.hypot(P.x - crest[i - 1].x, P.y - crest[i - 1].y);
          if (acc < target) continue;
          acc = 0;
          target = waveComb * (0.72 + 0.56 * rng());
          if (rng() < 0.05) continue;
          if (!P.on) continue;
          const lenNoise = 0.6 + 0.34 * Math.sin(P.s * 0.05 + k * 1.3) + (rng() - 0.5) * 0.4;
          let L = waveCombLen * Math.max(0.35, lenNoise);
          L = Math.min(L, waveBand * 0.84);
          if (L < 3) continue;
          const sx = P.x + P.nx;
          const sy = P.y + P.ny;
          const ex = sx + P.nx * L;
          const ey = sy + P.ny * L;
          const w = (rng() - 0.5) * Math.min(4, L * 0.28);
          const cxp = sx + P.nx * L * 0.5 + P.ny * w;
          const cyp = sy + P.ny * L * 0.5 - P.nx * w;
          const seg = `M${sx.toFixed(1)} ${sy.toFixed(1)} Q${cxp.toFixed(1)} ${cyp.toFixed(1)} ${ex.toFixed(1)} ${ey.toFixed(1)}`;
          if (L > waveCombLen * 0.6) featherD += seg + ' ';
          else faintD += seg + ' ';
        }
      }
    }
    if (faintD) {
      svg +=
        `<path d="${faintD.trim()}" fill="none" stroke="${REGISTER.ink}" stroke-width="${(waveWeight * 0.42).toFixed(2)}" ` +
        `stroke-linecap="round" opacity="${(waveInk * 0.55).toFixed(2)}"/>`;
    }
    if (featherD) {
      svg +=
        `<path d="${featherD.trim()}" fill="none" stroke="${REGISTER.ink}" stroke-width="${(waveWeight * 0.5).toFixed(2)}" ` +
        `stroke-linecap="round" opacity="${waveInk.toFixed(2)}"/>`;
    }
    if (crestD.trim()) {
      svg +=
        `<path d="${crestD.trim()}" fill="none" stroke="${REGISTER.ink}" stroke-width="${(waveWeight * 1.05).toFixed(2)}" ` +
        `stroke-linecap="round" stroke-linejoin="round" opacity="0.9"/>`;
    }
  }

  return svg;
}
