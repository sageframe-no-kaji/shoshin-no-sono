/**
 * Settlements — the Cartographer's town stage (ho-07). Pure geometry: grow a
 * settlement in the abstract (the frozen session-2 morphology), seat it from
 * the peaks it documents (blended barycenter), size it from its documents
 * weight, then warp it to the heightfield it lands on (place-then-deform). No
 * DOM, no SVG styling, no Indexer, no URL — the register render lives in
 * settlement-map.js, the orchestration in cartographer.js.
 *
 * The growth is the territory spike's `settle()` recreated faithfully and
 * tested — the register was blessed against that algorithm, so the morphology
 * (loose hamlet → walked village → corridored town → cathedral-close city) is
 * reproduced, not reinvented. The seat, size band, and deform are ho-07's
 * additions: the spike placed towns as a flat translated layer; here they sit
 * on the terrain. Recorded in ho-process/hos/ho-07-town-placement.md.
 */

import { mulberry32 } from './field.js';

const D2R = Math.PI / 180;
const R2D = 180 / Math.PI;
const GOLD = 2.399963229; // golden angle — the spike's loose-scatter pitch

/** @typedef {import('./field.js').Heightfield} Heightfield */
/** @typedef {{ x: number, y: number }} Point */

/**
 * A settlement block (one building) in settlement-local coordinates,
 * origin-centered. `a` is rotation in degrees; `terra` marks the single
 * terracotta landmark a city carries.
 * @typedef {{ x: number, y: number, w: number, h: number, a: number, terra?: boolean }} Block
 */

/**
 * The frozen session-2 grammar (design/visual-register.html §2). These are
 * register dials reproduced from the blessed spike, not ho-07 tuners.
 */
export const SETTLEMENT_GRAMMAR = { unit: 8.5, pack: 0.24, curve: 24, corridors: 5, ravel: 7 };

/**
 * ho-07 placement/size/deform tuners (Decision 7). Defaults are the by-feel
 * landing recorded in Reflect; every value is dialable on the debug page.
 */
export const TOWN_DEFAULTS = {
  anchorBias: 4, // strength^p in the barycenter — pulls hard toward the strength-3 anchor
  strengthFull: 3, // documents-strength sum at which a town fully seats at its barycenter
  secondaryStrength: 0.5, // synthetic strength of a fallback (argues_for) anchor — a light lean, not a seat
  footOffset: 20, // px nudged downhill off the summit toward the foot
  elongK: 4, // along-contour stretch per unit slope
  elongCap: 2.0, // max elongation factor
  contourFollow: 40, // px per-block downhill nudge so corridors bend with the rings
  density: 1.4, // base within-band count multiplier (>1 = more buildings — "populated enough")
  extentScale: 0.3, // added density per unit weight (within-band count grows with weight)
  thresholds: [0.7, 1.5, 1.7], // weight → hamlet / village / town / city band edges
};

/* ---------------- growth primitives (ported from the spike) ---------------- */

/** Corner points of an oriented block. @param {Block} b @returns {Point[]} */
function corn(b) {
  const a = (b.a || 0) * D2R;
  const ca = Math.cos(a);
  const sa = Math.sin(a);
  const hw = b.w / 2;
  const hh = b.h / 2;
  /** @type {[number, number][]} */
  const o = [
    [-hw, -hh],
    [hw, -hh],
    [hw, hh],
    [-hw, hh],
  ];
  return o.map(([ox, oy]) => ({ x: b.x + ox * ca - oy * sa, y: b.y + ox * sa + oy * ca }));
}

/** Separating-axis overlap test between two corner sets. @param {Point[]} A @param {Point[]} B */
function sat(A, B) {
  const P = [A, B];
  for (let s = 0; s < 2; s++) {
    const pl = P[s];
    for (let i = 0; i < 4; i++) {
      const j = (i + 1) % 4;
      const nx = -(pl[j].y - pl[i].y);
      const ny = pl[j].x - pl[i].x;
      let a0 = Infinity;
      let a1 = -Infinity;
      let b0 = Infinity;
      let b1 = -Infinity;
      for (let k = 0; k < 4; k++) {
        const p = A[k].x * nx + A[k].y * ny;
        if (p < a0) a0 = p;
        if (p > a1) a1 = p;
      }
      for (let k = 0; k < 4; k++) {
        const p = B[k].x * nx + B[k].y * ny;
        if (p < b0) b0 = p;
        if (p > b1) b1 = p;
      }
      if (a1 < b0 || b1 < a0) return false;
    }
  }
  return true;
}

/** Shrink a block by `n` on each side (the party-wall inset). @param {Block} b @param {number} n @returns {Block} */
function shr(b, n) {
  return { x: b.x, y: b.y, a: b.a, w: Math.max(0.2, b.w - 2 * n), h: Math.max(0.2, b.h - 2 * n) };
}

/** Does candidate `c` fit among placed blocks `pl` with inset `n`? @param {Block} c @param {Block[]} pl @param {number} n */
function fits(c, pl, n) {
  const cc = corn(shr(c, n));
  for (const b of pl) if (sat(cc, corn(shr(b, n)))) return false;
  return true;
}

/**
 * A curving street walk from a start radius/heading: turns toward the centre by
 * `pull`, jitters by `mt`, advancing `len` total. Returns the corridor polyline.
 * @returns {Point[]}
 */
function walk(/** @type {number} */ unit, /** @type {number} */ r0, /** @type {number} */ h0, /** @type {number} */ len, /** @type {number} */ mt, /** @type {number} */ pull, /** @type {number} */ seed) {
  const rnd = mulberry32(seed);
  let x = Math.cos(h0) * r0;
  let y = Math.sin(h0) * r0;
  let h = h0;
  const n = Math.max(5, Math.round(len / (unit * 0.7)));
  const dl = len / n;
  const k = dl / unit;
  const p = [{ x, y }];
  for (let i = 0; i < n; i++) {
    const tg = Math.atan2(y, x);
    const df = Math.atan2(Math.sin(tg - h), Math.cos(tg - h));
    h += (pull * df + (rnd() - 0.5) * 2 * mt) * k;
    x += Math.cos(h) * dl;
    y += Math.sin(h) * dl;
    p.push({ x, y });
  }
  return p;
}

/** Resample a polyline to even spacing `ds`, carrying the local tangent. */
function resamp(/** @type {Point[]} */ pts, /** @type {number} */ ds) {
  /** @type {Array<{ x: number, y: number, tx: number, ty: number }>} */
  const o = [];
  let car = 0;
  for (let i = 1; i < pts.length; i++) {
    const ax = pts[i - 1].x;
    const ay = pts[i - 1].y;
    const dx = pts[i].x - ax;
    const dy = pts[i].y - ay;
    const d = Math.hypot(dx, dy);
    if (d < 1e-6) continue;
    const ux = dx / d;
    const uy = dy / d;
    let di = car;
    while (di < d) {
      o.push({ x: ax + ux * di, y: ay + uy * di, tx: ux, ty: uy });
      di += ds;
    }
    car = di - d;
  }
  return o;
}

/**
 * Line buildings down both sides of a corridor — blocks rotated to the local
 * tangent, offset to the street half-width, so the street reads as the void
 * between two walls (no road stroke).
 * @param {Point[]} poly
 * @param {{ unit: number, streetHalf: number, gap: number, inset: number }} P
 * @param {Block[]} pl
 * @param {() => number} rnd
 */
function line(poly, P, pl, rnd) {
  const ds = Math.max(0.5, P.unit * 0.2);
  const S = resamp(poly, ds);
  if (S.length < 2) return;
  const L = (S.length - 1) * ds;
  if (L <= 0) return;
  const np = Math.max(1, Math.round(L / (P.unit * 1.12)));
  const sp = L / np;
  for (let j = 0; j < np; j++) {
    const pl2 = (j + 0.5) * sp;
    const idx = Math.min(S.length - 1, Math.round(pl2 / ds));
    const s = S[idx];
    const ang = Math.atan2(s.ty, s.tx) * R2D;
    const nx = -s.ty;
    const ny = s.tx;
    for (let sd = -1; sd <= 1; sd += 2) {
      const w = (sp - P.gap) * (0.92 + rnd() * 0.14);
      const h = P.unit * (0.8 + rnd() * 0.5);
      const of = P.streetHalf + h / 2;
      const c = { x: s.x + nx * of * sd, y: s.y + ny * of * sd, w, h, a: ang + (rnd() - 0.5) * 5 };
      if (fits(c, pl, P.inset)) pl.push(c);
    }
  }
}

/** Scatter `ct` loose blocks on a golden-angle spiral (hamlet fabric). @param {Block[]} pl */
function loose(/** @type {number} */ ct, /** @type {number} */ unit, pl, /** @type {number} */ seed) {
  const rnd = mulberry32(seed * 131 + 5);
  const rot = rnd() * 6.28;
  const pit = unit * 1.15;
  let g = 0;
  let tr = 0;
  while (g < ct && tr < ct * 10) {
    tr++;
    const rr = pit * Math.sqrt(g + 0.3);
    const th = g * GOLD + rot + (rnd() - 0.5) * 0.6;
    const c = {
      x: Math.cos(th) * rr + (rnd() - 0.5) * pit * 0.3,
      y: Math.sin(th) * rr + (rnd() - 0.5) * pit * 0.3,
      w: unit * (1 + rnd() * 0.5),
      h: unit * (0.85 + rnd() * 0.4),
      a: (rnd() - 0.5) * 30,
    };
    if (fits(c, pl, unit * 0.06)) {
      pl.push(c);
      g++;
    }
  }
}

/** Fringe `n` blocks beyond radius `Rmax` — the raveling edge. @param {Block[]} pl @param {() => number} rnd */
function ravel(pl, /** @type {number} */ Rmax, /** @type {number} */ n, /** @type {number} */ unit, rnd) {
  let g = 0;
  let tr = 0;
  while (g < n && tr < n * 12) {
    tr++;
    const an = rnd() * 6.28;
    const r = Rmax * (1.02 + rnd() * 0.28);
    const c = {
      x: Math.cos(an) * r,
      y: Math.sin(an) * r,
      w: unit * (0.9 + rnd() * 0.5),
      h: unit * (0.8 + rnd() * 0.4),
      a: (rnd() - 0.5) * 40,
    };
    if (fits(c, pl, unit * 0.06)) {
      pl.push(c);
      g++;
    }
  }
}

/**
 * @typedef {Object} Settlement
 * @property {Block[]} blocks the placed buildings, settlement-local
 * @property {number} extent measured max corner radius (for the label offset)
 */

/**
 * Grow a settlement of the given size band in the abstract (origin-centered,
 * long axis along local +X). Level 0 hamlet → 1 village → 2 town → 3 cathedral
 * close. `density` scales the building count within the band ("populated enough"
 * — Decision 3); `seed` makes it reproducible. Faithful to the spike's settle().
 * @param {number} level 0–3
 * @param {number} seed
 * @param {{ grammar?: Partial<typeof SETTLEMENT_GRAMMAR>, density?: number }} [opts]
 * @returns {Settlement}
 */
export function growSettlement(level, seed, opts = {}) {
  const g = { ...SETTLEMENT_GRAMMAR, ...opts.grammar };
  const density = opts.density ?? 1;
  const rnd = mulberry32(seed * 101 + 7);
  const unit = g.unit;
  const gap = unit * (0.02 + (1 - g.pack) * 0.2);
  const inset = unit * 0.06;
  const mt = g.curve * D2R;
  const P0 = { unit, streetHalf: unit * 0.42, gap, inset };
  /** @type {Block[]} */
  let blocks = [];

  if (level <= 0) {
    loose(Math.max(2, Math.round((2 + (seed % 2)) * density)), unit, blocks, seed);
  } else if (level === 1) {
    const th = rnd() * 6.28;
    line(walk(unit, -unit * 1.4, th, unit * 4, mt, 0.5, (rnd() * 1e6) | 0), P0, blocks, rnd);
    ravel(blocks, unit * 2.4, Math.max(1, Math.round(g.ravel * 0.2 * density)), unit, rnd);
  } else if (level === 2) {
    const Rmax = unit * 3.4;
    const base = rnd() * 6.28;
    const nc = Math.min(3, Math.max(2, g.corridors - 2));
    for (let k = 0; k < nc; k++) {
      const t2 = base + k * (6.283 / nc) + (rnd() - 0.5) * 0.5;
      line(walk(unit, unit * 0.7, t2, Rmax, mt, 0.5, (rnd() * 1e6) | 0), P0, blocks, rnd);
    }
    ravel(blocks, Rmax, Math.max(1, Math.round(g.ravel * 0.35 * density)), unit, rnd);
  } else {
    // CITY = cathedral close: an elongated terracotta landmark with a long axis,
    // an enclosed forecourt (façade) at one short end and a small apse plaza
    // behind (split wall), parallel flanking rows down the long sides, organic
    // fabric beyond, the whole close rotated to a per-seed axis. Spike level 3.
    const A = rnd() * Math.PI * 2;
    const cw = unit * 3.4;
    const ch = unit * 1.4;
    const halfLen = cw / 2;
    const halfWid = ch / 2;
    const streetOff = halfWid + unit * 0.95;
    const Rx = unit * 5.6;
    const fx0 = halfLen + unit * 0.4;
    const fx1 = fx0 + unit * 2.4;
    const apX = -(halfLen + unit * 1.2);
    blocks.push({ x: 0, y: 0, w: cw, h: ch, a: 0, terra: true }); // the cathedral
    const rowLine = (/** @type {number} */ x0, /** @type {number} */ y0, /** @type {number} */ x1, /** @type {number} */ y1, /** @type {number} */ fa) => {
      const dx = x1 - x0;
      const dy = y1 - y0;
      const len = Math.hypot(dx, dy) || 1;
      const n = Math.max(1, Math.round(len / (unit * 1.05)));
      for (let i = 0; i < n; i++) {
        const t = (i + 0.5) / n;
        const c = {
          x: x0 + dx * t,
          y: y0 + dy * t,
          w: unit * (0.9 + rnd() * 0.4),
          h: unit * (0.8 + rnd() * 0.4),
          a: fa + (rnd() - 0.5) * 4,
        };
        if (fits(c, blocks, inset)) blocks.push(c);
      }
    };
    for (let sd = -1; sd <= 1; sd += 2) {
      for (let row = 0; row < 2; row++) {
        const yy = sd * (streetOff + row * unit * 1.2);
        rowLine(apX, yy, fx1, yy, 0);
      }
    }
    rowLine(fx1 + unit * 0.6, -(streetOff + unit * 0.4), fx1 + unit * 0.6, streetOff + unit * 0.4, 90);
    rowLine(apX - unit * 0.4, -streetOff, apX - unit * 0.4, -unit * 0.8, 90);
    rowLine(apX - unit * 0.4, unit * 0.8, apX - unit * 0.4, streetOff, 90);
    const nc = 4;
    const base = rnd() * 6.28;
    for (let k2 = 0; k2 < nc; k2++) {
      const t3 = base + k2 * (6.283 / nc) + (rnd() - 0.5) * 0.5;
      line(
        walk(unit, Rx * 0.6, t3, Rx * 0.5, mt, 0.4, (rnd() * 1e6) | 0),
        { unit, streetHalf: unit * 0.44, gap, inset },
        blocks,
        rnd,
      );
    }
    ravel(blocks, Rx, Math.max(1, Math.round(g.ravel * density)), unit, rnd);
    // carve the two plazas: clear strays from the forecourt and the apse plaza
    blocks = blocks.filter((b) => {
      if (b.terra) return true;
      if (b.x >= fx0 && b.x <= fx1 && Math.abs(b.y) <= streetOff - unit * 0.15) return false;
      if (b.x <= -halfLen - unit * 0.2 && b.x >= apX && Math.abs(b.y) <= unit * 0.85) return false;
      return true;
    });
    // rotate the whole close to its per-seed axis
    const ca = Math.cos(A);
    const sa = Math.sin(A);
    const dg = A * R2D;
    blocks = blocks.map((b) => ({
      ...b,
      x: b.x * ca - b.y * sa,
      y: b.x * sa + b.y * ca,
      a: (b.a || 0) + dg,
    }));
  }

  return { blocks, extent: blocksExtent(blocks) };
}

/** Measured extent: the max corner radius over all blocks. @param {Block[]} blocks @returns {number} */
export function blocksExtent(blocks) {
  let maxR = 0;
  for (const b of blocks) for (const c of corn(b)) maxR = Math.max(maxR, Math.hypot(c.x, c.y));
  return maxR;
}

/* ---------------- seat, size, deform (ho-07) ---------------- */

/**
 * @typedef {{ pos: Point, strength: number }} Anchor A peak this town documents,
 * with the edge strength (or a synthetic strength for a fallback anchor).
 */

/**
 * The town's seat: the strength-biased barycenter of the peaks it documents,
 * blended toward the field centroid by how anchored the town is (Decision 2).
 * Weakly-anchored towns drift central; well-anchored towns sit at their peak.
 * A town with no anchors sits at the centroid. `anchorBias` (p) raises strength
 * to a power so strength-3 targets dominate the direction; `strengthFull` is the
 * documents sum at which a town fully seats at its barycenter.
 * @param {Anchor[]} anchors
 * @param {Point} centroid the field centroid (mean peak position)
 * @param {{ anchorBias?: number, strengthFull?: number }} [opts]
 * @returns {Point}
 */
export function townSeat(anchors, centroid, opts = {}) {
  const p = opts.anchorBias ?? TOWN_DEFAULTS.anchorBias;
  const strengthFull = opts.strengthFull ?? TOWN_DEFAULTS.strengthFull;
  if (anchors.length === 0) return { x: centroid.x, y: centroid.y };
  let wsum = 0;
  let bx = 0;
  let by = 0;
  let ssum = 0;
  for (const a of anchors) {
    const s = Math.max(0, a.strength);
    const w = Math.pow(s, p);
    wsum += w;
    bx += a.pos.x * w;
    by += a.pos.y * w;
    ssum += s;
  }
  const bary = wsum > 0 ? { x: bx / wsum, y: by / wsum } : { x: centroid.x, y: centroid.y };
  const anchorWeight = Math.max(0, Math.min(1, ssum / strengthFull));
  return {
    x: centroid.x + (bary.x - centroid.x) * anchorWeight,
    y: centroid.y + (bary.y - centroid.y) * anchorWeight,
  };
}

/**
 * Bilinear sample of the heightfield at a world point (clamped to the grid).
 * @param {Heightfield} hf @param {number} x @param {number} y @returns {number}
 */
export function sampleField(hf, x, y) {
  const { field, cols, rows, cell } = hf;
  const gx = Math.max(0, Math.min(cols - 1, x / cell));
  const gy = Math.max(0, Math.min(rows - 1, y / cell));
  const i0 = Math.floor(gx);
  const j0 = Math.floor(gy);
  const i1 = Math.min(cols - 1, i0 + 1);
  const j1 = Math.min(rows - 1, j0 + 1);
  const fx = gx - i0;
  const fy = gy - j0;
  const a = field[j0 * cols + i0];
  const b = field[j0 * cols + i1];
  const c = field[j1 * cols + i0];
  const d = field[j1 * cols + i1];
  return (a * (1 - fx) + b * fx) * (1 - fy) + (c * (1 - fx) + d * fx) * fy;
}

/**
 * Heightfield gradient at a world point (central differences over one cell).
 * Points uphill; its magnitude is the local slope.
 * @param {Heightfield} hf @param {number} x @param {number} y @returns {Point}
 */
export function gradient(hf, x, y) {
  const e = hf.cell;
  const dx = (sampleField(hf, x + e, y) - sampleField(hf, x - e, y)) / (2 * e);
  const dy = (sampleField(hf, x, y + e) - sampleField(hf, x, y - e)) / (2 * e);
  return { x: dx, y: dy };
}

/**
 * Nudge a seat downhill off the summit toward the foot, by `footOffset` px
 * along the negative gradient — so a single-anchor town sits at its peak's foot
 * rather than on the summit (Decision 2). Clamped to the field bounds.
 * @param {Point} seat @param {Heightfield} hf @param {number} footOffset @returns {Point}
 */
export function seatDownhill(seat, hf, footOffset) {
  const g = gradient(hf, seat.x, seat.y);
  const m = Math.hypot(g.x, g.y);
  if (m < 1e-6) return { x: seat.x, y: seat.y };
  return {
    x: Math.max(0, Math.min(hf.width, seat.x - (g.x / m) * footOffset)),
    y: Math.max(0, Math.min(hf.height, seat.y - (g.y / m) * footOffset)),
  };
}

/**
 * Size band from the settlement weight (Decision 3): the number of thresholds
 * the weight clears. 0 hamlet → 1 village → 2 town → 3 city.
 * @param {number} weight @param {number[]} [thresholds] @returns {number}
 */
export function sizeBand(weight, thresholds = TOWN_DEFAULTS.thresholds) {
  let level = 0;
  for (const t of thresholds) if (weight >= t) level++;
  return level;
}

/**
 * Place-then-deform (Decision 4): warp an abstract settlement to the slope it
 * lands on. Affine base — orient the growth axis along the local contour
 * (perpendicular to the gradient) and elongate along it by the slope — plus a
 * bounded per-block downhill nudge so corridors bend with the rings. Returns
 * blocks still settlement-local (the render translates by the seat). A flat
 * field leaves the town unchanged.
 * @param {Block[]} blocks
 * @param {Heightfield} hf
 * @param {Point} seat
 * @param {{ elongK?: number, elongCap?: number, contourFollow?: number }} [opts]
 * @returns {Block[]}
 */
export function deform(blocks, hf, seat, opts = {}) {
  const elongK = opts.elongK ?? TOWN_DEFAULTS.elongK;
  const elongCap = opts.elongCap ?? TOWN_DEFAULTS.elongCap;
  const contourFollow = opts.contourFollow ?? TOWN_DEFAULTS.contourFollow;
  const g = gradient(hf, seat.x, seat.y);
  const gm = Math.hypot(g.x, g.y);
  // contour direction = perpendicular to the gradient (-g.y, g.x)
  const baseAngle = gm > 1e-6 ? Math.atan2(g.x, -g.y) : 0;
  const elong = Math.min(elongCap, 1 + elongK * gm);
  const ca = Math.cos(baseAngle);
  const sa = Math.sin(baseAngle);
  return blocks.map((b) => {
    const sx = b.x * elong; // elongate along the local growth axis
    const sy = b.y;
    let rx = sx * ca - sy * sa; // then rotate that axis onto the contour
    let ry = sx * sa + sy * ca;
    if (contourFollow > 0 && gm > 1e-6) {
      const wg = gradient(hf, seat.x + rx, seat.y + ry); // bend downhill at the block's spot
      rx -= wg.x * contourFollow;
      ry -= wg.y * contourFollow;
    }
    return { ...b, x: rx, y: ry, a: (b.a || 0) + baseAngle * R2D };
  });
}
