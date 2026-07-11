/**
 * Feature map (ho-08) — roads and trails as honest overlay marks over the
 * hachure field.
 *
 * Roads represent `companion_to` edges (town ↔ town): a cased double-line that
 * clears the hachures in its lane and leaves two thin dark rails, sitting flat
 * in the valleys. Trails represent `documents` edges (town → peak): a
 * perpendicular tick-ladder climbing from the town seat to the peak's foot —
 * uncased, single-weight ink, sitting in the hachure texture where roads sit
 * above it. The casing omission is the load-bearing rule (session-5 lock):
 * roads are cased, trails are uncased.
 *
 * With a heightfield, both marks route by least resistance: chord waypoints
 * relax sideways toward lower ground and smooth, so roads swing through
 * valleys and around hills and trails drift with the terrain instead of
 * cutting straight — character from process, not decoration. Without a
 * heightfield both fall back to a gentle id-signed bow, unique but stable
 * across redraws.
 *
 * Pure: SVG strings in, SVG strings out. No DOM, no Indexer, no Gate, no URL.
 */

import { REGISTER } from './register.js';

/** @typedef {import('./field.js').Heightfield} Heightfield */

/** Trail ink — deliberately lighter than the register ink so trails read as
 * secondary marks inside the hachure texture. Not a register color. */
const TRAIL_INK = '#4B4B4B';

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
 * Central-difference gradient of the heightfield at a field point (uphill).
 * @param {Heightfield} hf @param {number} x @param {number} y
 * @returns {{ x: number, y: number }}
 */
function gradAt(hf, x, y) {
  const e = hf.cell;
  return {
    x: (sampleHf(hf, x + e, y) - sampleHf(hf, x - e, y)) / (2 * e),
    y: (sampleHf(hf, x, y + e) - sampleHf(hf, x, y - e)) / (2 * e),
  };
}

/**
 * @typedef {Object} RouteOpts
 * @property {number} [follow]   Terrain-following strength (0 = straight chord).
 * @property {number} [spacing]  Waypoint spacing along the chord in px.
 * @property {number} [iters]    Relaxation iterations.
 * @property {number} [maxDrift] Lateral clamp from the chord in px (keeps a route a route).
 * @property {number} [slopeRef] Slope magnitude at which the sideways push saturates.
 * @property {{ x: number, y: number }[][]} [avoid] Polylines to keep clear of (road corridors).
 * @property {number} [minSep]   Minimal separation from `avoid` polylines in px.
 */

/**
 * Nearest point on any of the given polylines to (x, y), with its distance.
 * @param {number} x @param {number} y
 * @param {{ x: number, y: number }[][]} lines
 * @returns {{ x: number, y: number, d: number } | null}
 */
function nearestOnPolylines(x, y, lines) {
  let best = null;
  for (const line of lines) {
    for (let i = 1; i < line.length; i++) {
      const a = line[i - 1];
      const b = line[i];
      const abx = b.x - a.x;
      const aby = b.y - a.y;
      const ab2 = abx * abx + aby * aby || 1e-12;
      let t = ((x - a.x) * abx + (y - a.y) * aby) / ab2;
      t = Math.max(0, Math.min(1, t));
      const qx = a.x + abx * t;
      const qy = a.y + aby * t;
      const d = Math.hypot(x - qx, y - qy);
      if (!best || d < best.d) best = { x: qx, y: qy, d };
    }
  }
  return best;
}

/**
 * Chaikin corner-cutting, endpoint-preserving — smooths a routed polyline into
 * a drawable curve (each pass replaces interior vertices with 1/4–3/4 points).
 * @param {{ x: number, y: number }[]} pts @param {number} passes
 * @returns {{ x: number, y: number }[]}
 */
function chaikin(pts, passes) {
  let p = pts;
  for (let k = 0; k < passes; k++) {
    if (p.length < 3) return p;
    /** @type {{ x: number, y: number }[]} */
    const out = [p[0]];
    for (let i = 0; i < p.length - 1; i++) {
      const a = p[i];
      const b = p[i + 1];
      out.push({ x: a.x * 0.75 + b.x * 0.25, y: a.y * 0.75 + b.y * 0.25 });
      out.push({ x: a.x * 0.25 + b.x * 0.75, y: a.y * 0.25 + b.y * 0.75 });
    }
    out.push(p[p.length - 1]);
    p = out;
  }
  return p;
}

/**
 * Least-resistance route between two points over the heightfield: waypoints
 * start on the straight chord, then each relaxation pass slides every interior
 * point sideways toward lower ground (the downhill component perpendicular to
 * the local direction) and smooths the line so it stays route-like. The result
 * swings through valleys and around hills the way a surveyed road does.
 * Endpoints never move; lateral drift is clamped to a corridor.
 * @param {Heightfield} hf
 * @param {number} x1 @param {number} y1 @param {number} x2 @param {number} y2
 * @param {RouteOpts} [opts]
 * @returns {{ x: number, y: number }[]}
 */
export function terrainRoutedPath(hf, x1, y1, x2, y2, opts = {}) {
  const follow = opts.follow ?? 0.7;
  const spacing = opts.spacing ?? 12;
  const iters = opts.iters ?? 30;
  const maxDrift = opts.maxDrift ?? 70;
  const len = Math.hypot(x2 - x1, y2 - y1);
  const n = Math.max(3, Math.round(len / spacing));
  /** @type {{ x: number, y: number }[]} */
  const pts = [];
  for (let i = 0; i <= n; i++) {
    pts.push({ x: x1 + ((x2 - x1) * i) / n, y: y1 + ((y2 - y1) * i) / n });
  }
  if (follow <= 0 || len < 1) return pts;
  // Chord normal, for clamping lateral drift.
  const cnx = -(y2 - y1) / len;
  const cny = (x2 - x1) / len;
  const step = follow * spacing * 0.5;
  const slopeRef = opts.slopeRef ?? 0.02; // any real slope pushes at full strength
  const avoid = opts.avoid ?? [];
  const minSep = opts.minSep ?? 7;
  const smooth = 0.2;
  for (let k = 0; k < iters; k++) {
    for (let i = 1; i < n; i++) {
      const p = pts[i];
      const tx = pts[i + 1].x - pts[i - 1].x;
      const ty = pts[i + 1].y - pts[i - 1].y;
      const tm = Math.hypot(tx, ty) || 1;
      const nx = -ty / tm;
      const ny = tx / tm;
      let px = p.x;
      let py = p.y;
      const g = gradAt(hf, px, py);
      const gm = Math.hypot(g.x, g.y);
      if (gm >= 1e-9) {
        // Slide toward lower ground along the local normal. The push responds
        // to the DIRECTION of the slope at full strength once the slope is
        // real (gm/slopeRef saturates) — raw-magnitude pushes were so weak the
        // smoothing pass erased them and every route relaxed to its chord.
        const toward = (g.x * nx + g.y * ny) / gm;
        const slide = -toward * Math.min(1, gm / slopeRef) * step;
        px += nx * slide;
        py += ny * slide;
      }
      const drift = (px - x1) * cnx + (py - y1) * cny;
      if (drift > maxDrift) {
        px -= cnx * (drift - maxDrift);
        py -= cny * (drift - maxDrift);
      } else if (drift < -maxDrift) {
        px -= cnx * (drift + maxDrift);
        py -= cny * (drift + maxDrift);
      }
      // Minimal separation from road corridors — a trail may run alongside a
      // road, never on it (roads eat trails; the paint order does the eating,
      // this keeps the parallel stretch legible). Applied last so it wins.
      if (avoid.length > 0) {
        const q = nearestOnPolylines(px, py, avoid);
        if (q && q.d < minSep) {
          if (q.d < 1e-6) {
            px += nx * minSep;
            py += ny * minSep;
          } else {
            const s = (minSep - q.d) / q.d;
            px += (px - q.x) * s;
            py += (py - q.y) * s;
          }
        }
      }
      p.x = px;
      p.y = py;
    }
    // Smoothing pass keeps the route road-like (no kinks from noisy gradients).
    for (let i = 1; i < n; i++) {
      pts[i].x = pts[i].x * (1 - smooth) + ((pts[i - 1].x + pts[i + 1].x) / 2) * smooth;
      pts[i].y = pts[i].y * (1 - smooth) + ((pts[i - 1].y + pts[i + 1].y) / 2) * smooth;
    }
  }
  return pts;
}

/** Polyline waypoints → SVG path `d`. @param {{x:number,y:number}[]} pts @returns {string} */
function pointsToPath(pts) {
  let d = `M${pts[0].x.toFixed(1)},${pts[0].y.toFixed(1)}`;
  for (let i = 1; i < pts.length; i++) d += ` L${pts[i].x.toFixed(1)},${pts[i].y.toFixed(1)}`;
  return d;
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
 * Width scales with `strength` (1–3); `clear` is the extra cream casing
 * beyond the rails on each side (the road's clearing dial).
 * @param {string} d SVG path `d` string
 * @param {number} [strength] edge strength 1–3 (default 1)
 * @param {number} [clear] casing beyond the rails per side in px (default 1.25)
 * @returns {string} SVG path elements
 */
export function roadPathSvg(d, strength = 1, clear = 1.25) {
  const s = 0.75 + 0.25 * clamp(strength / 3, 0, 1);
  const casing = ((4.5 + 2 * clear) * s).toFixed(2);
  const outer = (4.5 * s).toFixed(2);
  const infill = (2.8 * s).toFixed(2);
  return (
    `<path d="${d}" fill="none" stroke="${REGISTER.paper}" stroke-width="${casing}" stroke-linecap="round" stroke-linejoin="round"/>` +
    `<path d="${d}" fill="none" stroke="${REGISTER.ink}" stroke-width="${outer}" opacity="0.75" stroke-linecap="round" stroke-linejoin="round"/>` +
    `<path d="${d}" fill="none" stroke="${REGISTER.paper}" stroke-width="${infill}" stroke-linecap="round" stroke-linejoin="round"/>`
  );
}

/**
 * Tick-ladder mark parameters. Session 5 locked the mark's SHAPE (a rail with
 * perpendicular rungs, single-weight ink); the real plate re-opened its
 * legibility, so the dimensions are tuners, not frozen register (the lock
 * predates the corpus-density hachure ground). `clear` is the cream halo
 * width — 0 is the session-5 uncased lock; the practitioner dials the
 * legibility compromise and the landing gets recorded at ho-08 close.
 * @typedef {Object} TrailMarkOpts
 * @property {number} [tickSpacing] Rung spacing along the path in px.
 * @property {number} [tickHalf]    Rung half-length in px.
 * @property {number} [weight]      Single stroke weight — rail and rungs alike.
 * @property {number} [clear]       Cream clearing stroke width under the ladder (0 = uncased).
 */
const TRAIL_DEFAULTS = { tickSpacing: 9, tickHalf: 1.8, weight: 0.6, clear: 0 };

/**
 * Tick-ladder trail from (x1,y1) to (x2,y2) — the session-5 locked register:
 * a fine continuous rail with perpendicular ticks crossing it every
 * ~TICK_SPACING px, uncased, single-weight ink. Trails sit IN the hachure
 * texture; roads sit above it — the casing omission is what encodes the
 * hierarchy. The rail bows gently by the edge id (trails climb direct; the
 * bow only keeps parallel trails from stacking). Returns empty string for
 * paths shorter than 20 px.
 *
 * @param {number} x1 @param {number} y1 start (town seat)
 * @param {number} x2 @param {number} y2 end (peak foot)
 * @param {number} sign 1 or -1 — which side the rail bows
 * @param {TrailMarkOpts} [opts]
 * @returns {string} SVG path elements (rail + rungs)
 */
export function trailTickLadderSvg(x1, y1, x2, y2, sign, opts = {}) {
  const len = Math.hypot(x2 - x1, y2 - y1);
  if (len < 20) return '';
  return railAndRungsSvg(bowedPoints(x1, y1, x2, y2, sign), opts);
}

/**
 * Sample the gently-bowed cubic into waypoints — the no-heightfield fallback
 * rail (same curve family as roads, shallower bow).
 * @param {number} x1 @param {number} y1 @param {number} x2 @param {number} y2
 * @param {number} sign 1 or -1
 * @param {number} [bowFraction] bow as a fraction of chord length
 * @returns {{ x: number, y: number }[]}
 */
function bowedPoints(x1, y1, x2, y2, sign, bowFraction = 0.06) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const len = Math.hypot(dx, dy);
  const bow = len * bowFraction * sign;
  const px = -dy / len;
  const py = dx / len;
  const c1x = x1 + dx / 3 + px * bow;
  const c1y = y1 + dy / 3 + py * bow;
  const c2x = x1 + (dx * 2) / 3 + px * bow;
  const c2y = y1 + (dy * 2) / 3 + py * bow;
  const n = Math.max(3, Math.round(len / 8));
  /** @type {{ x: number, y: number }[]} */
  const pts = [];
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    const u = 1 - t;
    pts.push({
      x: u * u * u * x1 + 3 * u * u * t * c1x + 3 * u * t * t * c2x + t * t * t * x2,
      y: u * u * u * y1 + 3 * u * u * t * c1y + 3 * u * t * t * c2y + t * t * t * y2,
    });
  }
  return pts;
}

/**
 * Rail + perpendicular rungs over a waypoint polyline — the locked trail mark
 * drawn along ANY route (bowed fallback or terrain-routed). Rungs are placed
 * by arc length every `tickSpacing` px, perpendicular to the local segment.
 * When `clear` > 0, a cream halo paints under the whole ladder first (the
 * clearing-as-paint-over mechanism, applied to the trail by the practitioner's
 * legibility dial).
 * @param {{ x: number, y: number }[]} pts
 * @param {TrailMarkOpts} [opts]
 * @returns {string} SVG path elements (optional clearing, rail, rungs)
 */
function railAndRungsSvg(pts, opts = {}) {
  const o = { ...TRAIL_DEFAULTS, ...opts };
  const d = pointsToPath(pts);
  let rungs = '';
  let carry = o.tickSpacing; // no rung at the very start point
  for (let i = 1; i < pts.length; i++) {
    const ax = pts[i - 1].x;
    const ay = pts[i - 1].y;
    const dx = pts[i].x - ax;
    const dy = pts[i].y - ay;
    const seg = Math.hypot(dx, dy);
    if (seg < 1e-6) continue;
    const ux = dx / seg;
    const uy = dy / seg;
    const nx = -uy;
    const ny = ux;
    let along = carry;
    while (along < seg) {
      const bx = ax + ux * along;
      const by = ay + uy * along;
      rungs +=
        `M${(bx - nx * o.tickHalf).toFixed(1)},${(by - ny * o.tickHalf).toFixed(1)} ` +
        `L${(bx + nx * o.tickHalf).toFixed(1)},${(by + ny * o.tickHalf).toFixed(1)} `;
      along += o.tickSpacing;
    }
    carry = along - seg;
  }
  const w = o.weight.toFixed(2);
  let svg = '';
  if (o.clear > 0) {
    const cw = (o.weight + 2 * o.clear).toFixed(2);
    svg +=
      `<path d="${d}" fill="none" stroke="${REGISTER.paper}" stroke-width="${cw}" stroke-linecap="round" stroke-linejoin="round"/>` +
      `<path d="${rungs.trim()}" fill="none" stroke="${REGISTER.paper}" stroke-width="${cw}" stroke-linecap="round"/>`;
  }
  return (
    svg +
    `<path d="${d}" fill="none" stroke="${TRAIL_INK}" stroke-width="${w}" opacity="0.8" stroke-linecap="round" stroke-linejoin="round"/>` +
    `<path d="${rungs.trim()}" fill="none" stroke="${TRAIL_INK}" stroke-width="${w}" opacity="0.8" stroke-linecap="round"/>`
  );
}

/**
 * @typedef {{ from: {x:number,y:number}, to: {x:number,y:number}, id: string, strength?: number, footRadius?: number }} RoadEdge
 */

/**
 * @typedef {{ from: {x:number,y:number}, to: {x:number,y:number}, id: string, footRadius?: number, startRadius?: number }} TrailEdge
 */

/**
 * @typedef {{ pts: { x: number, y: number }[], strength: number, id: string }} RoadRoute
 */

/**
 * Route every road (`companion_to` edges, town ↔ town) and return the raw
 * waypoint polylines — exposed separately from the render so the page can hand
 * road corridors to the trail router as `avoid` obstacles (roads eat trails;
 * trails keep clear). With `hf` the route is least-resistance
 * (terrainRoutedPath); without one, the gentle id-signed bow.
 * @param {RoadEdge[]} edges
 * @param {Heightfield} [hf]
 * @param {RouteOpts} [opts]
 * @returns {RoadRoute[]}
 */
export function computeRoadRoutes(edges, hf, opts = {}) {
  return edges.map((e) => {
    const foot = e.footRadius
      ? peakFootPoint(e.from.x, e.from.y, e.to.x, e.to.y, e.footRadius)
      : e.to;
    const pts = hf
      ? terrainRoutedPath(hf, e.from.x, e.from.y, foot.x, foot.y, {
          follow: opts.follow ?? 0.7,
          maxDrift: opts.maxDrift ?? 70,
        })
      : bowedPoints(e.from.x, e.from.y, foot.x, foot.y, strHash(e.id), 0.12);
    return { pts, strength: e.strength ?? 1, id: e.id };
  });
}

/**
 * Render routed roads — Chaikin-smoothed into drawn curves, then the cased
 * double-line per route. `opts.clear` is the road-clearing dial (cream casing
 * beyond the rails).
 * @param {RoadRoute[]} routes
 * @param {{ clear?: number }} [opts]
 * @returns {string}
 */
export function roadsSvgFromRoutes(routes, opts = {}) {
  return routes
    .map((r) => roadPathSvg(pointsToPath(chaikin(r.pts, 3)), r.strength, opts.clear))
    .join('');
}

/**
 * SVG fragment for all roads — route + render in one call (see
 * computeRoadRoutes / roadsSvgFromRoutes for the two-step form the page uses
 * to feed road corridors into the trail router).
 * @param {RoadEdge[]} edges
 * @param {Heightfield} [hf] heightfield for least-resistance routing
 * @param {RouteOpts} [opts]
 * @returns {string}
 */
export function roadsSvg(edges, hf, opts = {}) {
  if (edges.length === 0) return '';
  return roadsSvgFromRoutes(computeRoadRoutes(edges, hf, opts));
}

/**
 * SVG fragment for all trails: `documents` town → peak climbs, plus
 * peak-to-peak hiking trails (`validates`, carrying both foot radii).
 * Deduplicates by id. With `hf`, the rail routes by least resistance at a
 * weaker follow than roads — a trail tolerates grade a road avoids; without
 * one, the gentle id-signed bow. `footRadius` pulls the destination back to
 * its foot; `startRadius` pulls the origin forward off its summit.
 * @param {TrailEdge[]} edges
 * @param {Heightfield} [hf] heightfield for least-resistance routing
 * @param {RouteOpts & TrailMarkOpts} [opts]
 * @returns {string}
 */
export function trailsSvg(edges, hf, opts = {}) {
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
    const start = e.startRadius
      ? peakFootPoint(foot.x, foot.y, e.from.x, e.from.y, e.startRadius)
      : e.from;
    if (Math.hypot(foot.x - start.x, foot.y - start.y) < 20) continue;
    if (hf) {
      const pts = terrainRoutedPath(hf, start.x, start.y, foot.x, foot.y, {
        follow: opts.follow ?? 0.35,
        maxDrift: opts.maxDrift ?? 45,
        avoid: opts.avoid,
        minSep: opts.minSep,
      });
      out += railAndRungsSvg(chaikin(pts, 2), opts);
    } else {
      out += trailTickLadderSvg(start.x, start.y, foot.x, foot.y, strHash(e.id), opts);
    }
  }
  return out;
}
