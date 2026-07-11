/**
 * Feature map (ho-08) — roads and trails as honest overlay marks over the
 * hachure field.
 *
 * Roads represent `documents` edges (town → peak): a cased double-line that
 * clears the hachures in its lane and leaves two thin dark rails. Trails
 * represent `validates` edges (peak → peak): a tick-ladder — no casing, just
 * perpendicular ticks along the path at ~9 px intervals.
 *
 * Both road and trail paths are cubic Béziers whose bow fraction and sign are
 * derived from the edge id so each arc is unique but stable across redraws.
 *
 * Pure: SVG strings in, SVG strings out. No DOM, no Indexer, no Gate, no URL.
 */

/** @typedef {import('./field.js').Heightfield} Heightfield */

/**
 * Clamp `v` to [lo, hi].
 * @param {number} v @param {number} lo @param {number} hi @returns {number}
 */
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

/**
 * Bilinear sample of the heightfield at field-pixel coords (x, y).
 * Returns 0 for out-of-bounds or missing field.
 * @param {Heightfield} hf @param {number} x @param {number} y @returns {number}
 */
function sampleHf(hf, x, y) {
  const { field, cols, rows, cell } = hf;
  const fi = x / cell;
  const fj = y / cell;
  const i0 = Math.floor(fi);
  const j0 = Math.floor(fj);
  if (i0 < 0 || j0 < 0 || i0 >= cols - 1 || j0 >= rows - 1) return 0;
  const tx = fi - i0;
  const ty = fj - j0;
  const v00 = field[j0 * cols + i0];
  const v10 = field[j0 * cols + i0 + 1];
  const v01 = field[(j0 + 1) * cols + i0];
  const v11 = field[(j0 + 1) * cols + i0 + 1];
  return v00 * (1 - tx) * (1 - ty) + v10 * tx * (1 - ty) + v01 * (1 - tx) * ty + v11 * tx * ty;
}

/**
 * Terrain-aware bow sign: sample perpendicular to the path midpoint and curve
 * toward the lower side (the valley). Falls back to strHash sign when no
 * heightfield is provided.
 * @param {Heightfield} hf @param {number} x1 @param {number} y1
 * @param {number} x2 @param {number} y2 @returns {1|-1}
 */
function terrainBowSign(hf, x1, y1, x2, y2) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const len = Math.hypot(dx, dy);
  if (len < 10) return 1;
  const mx = (x1 + x2) / 2;
  const my = (y1 + y2) / 2;
  // Perpendicular unit vector
  const nx = -dy / len;
  const ny = dx / len;
  const probe = Math.min(70, len * 0.3);
  const leftElev = sampleHf(hf, mx + nx * probe, my + ny * probe);
  const rightElev = sampleHf(hf, mx - nx * probe, my - ny * probe);
  // Curve toward the lower side (into the valley)
  return leftElev <= rightElev ? 1 : -1;
}

/**
 * Pull the road endpoint back from the peak center toward the town by
 * `footRadius` px, so the road terminates at the peak's foot rather than
 * cutting into the dense summit hachures.
 * @param {number} townX @param {number} townY
 * @param {number} peakX @param {number} peakY
 * @param {number} footRadius
 * @returns {{ x: number, y: number }}
 */
function peakFootPoint(townX, townY, peakX, peakY, footRadius) {
  const dx = townX - peakX;
  const dy = townY - peakY;
  const len = Math.hypot(dx, dy);
  if (len <= footRadius) return { x: peakX, y: peakY };
  return { x: peakX + (dx / len) * footRadius, y: peakY + (dy / len) * footRadius };
}

/**
 * Deterministic sign from a string id via a fast polynomial hash.
 * Returns 1 or -1 — half the ids go each way so arcs alternate consistently.
 * @param {string} id @returns {1|-1}
 */
export function strHash(id) {
  let h = 0;
  for (let i = 0; i < id.length; i++) {
    h = (Math.imul(31, h) + id.charCodeAt(i)) | 0;
  }
  return (h >>> 0) % 2 === 0 ? 1 : -1;
}

/**
 * Cubic Bézier path string from (x1,y1) to (x2,y2) with a perpendicular bow.
 * Control points sit at 1/3 and 2/3 along the chord, each displaced by `bow`
 * (signed distance in the chord-perpendicular direction). Returns an SVG path
 * `d` attribute value.
 * @param {number} x1 @param {number} y1 @param {number} x2 @param {number} y2
 * @param {number} bowFraction bow as a fraction of chord length
 * @param {number} sign 1 or -1 — which side of the chord to bow
 * @returns {string}
 */
export function curvedPath(x1, y1, x2, y2, bowFraction, sign) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const len = Math.hypot(dx, dy);
  if (len < 10) return `M${x1.toFixed(2)},${y1.toFixed(2)} L${x2.toFixed(2)},${y2.toFixed(2)}`;
  const bow = len * bowFraction * sign;
  // Perpendicular unit vector (rotated 90°)
  const px = -dy / len;
  const py = dx / len;
  // Control points at 1/3 and 2/3 along the chord, offset by bow
  const c1x = (x1 + dx / 3 + px * bow).toFixed(2);
  const c1y = (y1 + dy / 3 + py * bow).toFixed(2);
  const c2x = (x1 + (dx * 2) / 3 + px * bow).toFixed(2);
  const c2y = (y1 + (dy * 2) / 3 + py * bow).toFixed(2);
  return (
    `M${x1.toFixed(2)},${y1.toFixed(2)} ` +
    `C${c1x},${c1y} ${c2x},${c2y} ${x2.toFixed(2)},${y2.toFixed(2)}`
  );
}

/**
 * Three-stroke road fragment (cased double-line) for a single edge.
 * Stroke order: cream casing (clears hachures), dark rails, cream infill.
 * Width scales with `strength` (1–3).
 * @param {string} d SVG path `d` string
 * @param {number} [strength] edge strength 1–3 (default 1)
 * @returns {string} SVG path elements
 */
export function roadPathSvg(d, strength = 1) {
  const s = 0.75 + 0.25 * clamp(strength / 3, 0, 1);
  const casing = (7 * s).toFixed(2);
  const outer = (4.5 * s).toFixed(2);
  const infill = (2.8 * s).toFixed(2);
  return (
    `<path d="${d}" fill="none" stroke="#FDFCF9" stroke-width="${casing}" stroke-linecap="round"/>` +
    `<path d="${d}" fill="none" stroke="#2B2B2B" stroke-width="${outer}" opacity="0.75" stroke-linecap="round"/>` +
    `<path d="${d}" fill="none" stroke="#FDFCF9" stroke-width="${infill}" stroke-linecap="round"/>`
  );
}

/**
 * Switchback trail path from (x1,y1) to (x2,y2). Zigzags across the direct
 * line: each leg traverses `spread` px to one side then hairpins back. The
 * number of switchback pairs scales with path length. Rendered as a single
 * dashed path — no casing (trails sit in the hachure texture, roads sit above
 * it). Returns empty string for paths shorter than 20 px.
 *
 * @param {number} x1 @param {number} y1 start (town seat)
 * @param {number} x2 @param {number} y2 end (peak foot)
 * @param {number} sign 1 or -1 — which side the first traverse goes
 * @returns {string} SVG path element
 */
export function trailSwitchbackSvg(x1, y1, x2, y2, sign) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const len = Math.hypot(dx, dy);
  if (len < 20) return '';

  // Unit vectors: along the direct line and perpendicular to it.
  const ux = dx / len;
  const uy = dy / len;
  const px = -uy;
  const py = ux;

  // Number of switchback pairs: 1 pair per ~55px of path length (minimum 1).
  const pairs = Math.max(1, Math.round(len / 55));
  // Traverse width: how far to either side of the direct line each leg goes.
  const spread = Math.min(18, len * 0.18);

  // Build zigzag waypoints along the direct line.
  /** @type {{x:number,y:number}[]} */
  const pts = [{ x: x1, y: y1 }];
  const segs = pairs * 2; // each pair = 2 traverses
  for (let i = 1; i <= segs; i++) {
    const t = i / (segs + 1); // evenly spaced along the direct line
    const along = { x: x1 + ux * len * t, y: y1 + uy * len * t };
    // Alternate sides: odd segments go sign side, even go -sign side.
    const side = i % 2 === 1 ? sign : -sign;
    pts.push({ x: along.x + px * spread * side, y: along.y + py * spread * side });
  }
  pts.push({ x: x2, y: y2 });

  // Build path string: M then L segments.
  const d = `M${pts[0].x.toFixed(1)},${pts[0].y.toFixed(1)} ` +
    pts.slice(1).map(p => `L${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');

  return (
    `<path d="${d}" fill="none" stroke="#FDFCF9" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>` +
    `<path d="${d}" fill="none" stroke="#4B4B4B" stroke-width="0.9" opacity="0.7" ` +
    `stroke-dasharray="5 3" stroke-linecap="round" stroke-linejoin="round"/>`
  );
}

/**
 * @typedef {{ from: {x:number,y:number}, to: {x:number,y:number}, id: string, strength?: number, footRadius?: number }} RoadEdge
 */

/**
 * @typedef {{ from: {x:number,y:number}, to: {x:number,y:number}, id: string, footRadius?: number }} TrailEdge
 */

/**
 * SVG fragment for all roads (documents edges, town → peak).
 * When `hf` is supplied: bow direction is terrain-aware (curves toward the
 * lower side of the midpoint), and `footRadius` pulls the endpoint back from
 * the peak centre to the foot of the hachure field. Falls back to the
 * id-derived sign when no heightfield is provided.
 * @param {RoadEdge[]} edges
 * @param {Heightfield} [hf] optional heightfield for terrain-aware routing
 * @returns {string}
 */
export function roadsSvg(edges, hf) {
  if (edges.length === 0) return '';
  return edges
    .map((e) => {
      const foot = e.footRadius
        ? peakFootPoint(e.from.x, e.from.y, e.to.x, e.to.y, e.footRadius)
        : e.to;
      const sign = hf ? terrainBowSign(hf, e.from.x, e.from.y, foot.x, foot.y) : strHash(e.id);
      const d = curvedPath(e.from.x, e.from.y, foot.x, foot.y, 0.12, sign);
      return roadPathSvg(d, e.strength ?? 1);
    })
    .join('');
}

/**
 * SVG fragment for all trails (town → peak via `documents` edges).
 * Deduplicates by id. Applies footRadius to pull the endpoint back from the
 * peak centre. Trails climb direct — bow sign is id-derived, not
 * terrain-aware, to prevent coiling around radially-symmetric peak cones.
 * @param {TrailEdge[]} edges
 * @returns {string}
 */
export function trailsSvg(edges) {
  if (edges.length === 0) return '';
  /** @type {Map<string, TrailEdge>} */
  const seen = new Map();
  for (const e of edges) {
    if (!seen.has(e.id)) seen.set(e.id, e);
  }
  let out = '';
  for (const e of seen.values()) {
    const foot = e.footRadius
      ? peakFootPoint(e.from.x, e.from.y, e.to.x, e.to.y, e.footRadius)
      : e.to;
    const sign = strHash(e.id);
    out += trailSwitchbackSvg(e.from.x, e.from.y, foot.x, foot.y, sign);
  }
  return out;
}
