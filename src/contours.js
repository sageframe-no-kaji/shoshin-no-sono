/**
 * Contour extraction — the Cartographer's third pipeline stage (ho-06). Pure
 * geometry: a heightfield in, iso-elevation contour lines out. No DOM, no
 * Indexer, no Gate, no URL, no register styling — that lives in contour-map.js.
 *
 * This is the territory spike's `contourPaths`/`segsToPath` recreated cleanly
 * and tested. Marching squares walks the standard 16-case table over the grid:
 * each cell's four corners are classified against the level into a 4-bit index,
 * crossings are linearly interpolated on the straddled edges, and the case
 * prescribes one or two segments. The two saddle cases (5, 10) are resolved by
 * a fixed choice — the spike's blessed behavior, reproduced faithfully so the
 * ho-06 silhouette verdict is judged against the same renderer that produced
 * the blessed plate (Decision 1). Output is segment soup — independent M…L…
 * subpaths, not stitched polylines; stitching waits for ho-09. Recorded in
 * ho-process/hos/ho-06-contour-extraction.md.
 */

/** @typedef {import('./field.js').Heightfield} Heightfield */

/**
 * @typedef {{ x: number, y: number }} Point
 * @typedef {[Point, Point]} Segment
 */

/**
 * @typedef {Object} ContourOpts
 * @property {number} [interval] Elevation step between contour levels (ring spacing).
 * @property {number} [indexEvery] Every Nth level (from the outermost) is an index contour.
 */

/** Provisional values carried from the territory spike; tune by feel (ho-06). */
const CONTOUR_DEFAULTS = { interval: 0.62, indexEvery: 5 };

/** @param {number} n @returns {number} 2-decimal round, matching the spike's path precision */
const round2 = (n) => Math.round(n * 100) / 100;

/**
 * The level set: elevations from one interval up to (but not reaching) the
 * field max. Count tracks elevation — a taller field carries more rings, and a
 * filter-sunk field carries fewer (Decision 2). Levels run low → high, so
 * index 0 is the lowest, outermost ring.
 * @param {number} max largest elevation in the field
 * @param {number} interval elevation step
 * @returns {number[]}
 */
export function contourLevels(max, interval) {
  /** @type {number[]} */
  const levels = [];
  for (let level = interval; level < max; level += interval) levels.push(level);
  return levels;
}

/**
 * Marching squares at a single level: the segments where the field crosses it.
 * Linear interpolation places each crossing on its cell edge; the case table
 * connects them. Cells fully above or below the level contribute nothing.
 * @param {Heightfield} hf
 * @param {number} level
 * @returns {Segment[]}
 */
export function extractContour(hf, level) {
  const { field, cols, rows, cell } = hf;
  /** @type {Segment[]} */
  const out = [];
  /** Interpolate the crossing along an edge from value va→vb spanning a→b. */
  const lp = (/** @type {number} */ a, /** @type {number} */ b, /** @type {number} */ va, /** @type {number} */ vb) =>
    a + (b - a) * ((level - va) / (vb - va));

  for (let j = 0; j < rows - 1; j++) {
    for (let i = 0; i < cols - 1; i++) {
      const tl = field[j * cols + i];
      const tr = field[j * cols + i + 1];
      const br = field[(j + 1) * cols + i + 1];
      const bl = field[(j + 1) * cols + i];
      const idx = (tl > level ? 8 : 0) | (tr > level ? 4 : 0) | (br > level ? 2 : 0) | (bl > level ? 1 : 0);
      if (idx === 0 || idx === 15) continue;

      const x = i * cell;
      const y = j * cell;
      const T = { x: lp(x, x + cell, tl, tr), y };
      const R = { x: x + cell, y: lp(y, y + cell, tr, br) };
      const B = { x: lp(x, x + cell, bl, br), y: y + cell };
      const L = { x, y: lp(y, y + cell, tl, bl) };

      switch (idx) {
        case 1:
        case 14:
          out.push([L, B]);
          break;
        case 2:
        case 13:
          out.push([B, R]);
          break;
        case 3:
        case 12:
          out.push([L, R]);
          break;
        case 4:
        case 11:
          out.push([T, R]);
          break;
        case 6:
        case 9:
          out.push([T, B]);
          break;
        case 7:
        case 8:
          out.push([L, T]);
          break;
        case 5: // saddle — fixed resolution (Decision 1)
          out.push([L, T]);
          out.push([B, R]);
          break;
        case 10: // saddle — fixed resolution (Decision 1)
          out.push([T, R]);
          out.push([L, B]);
          break;
      }
    }
  }
  return out;
}

/**
 * Segments to an SVG path `d` string — one M…L… move-and-line per segment
 * (segment soup, not a stitched polyline). Coordinates rounded to 2 decimals.
 * @param {Segment[]} segs
 * @returns {string}
 */
export function segsToPath(segs) {
  let d = '';
  for (const s of segs) {
    d += `M${round2(s[0].x)} ${round2(s[0].y)}L${round2(s[1].x)} ${round2(s[1].y)}`;
  }
  return d;
}

/**
 * @typedef {Object} ContourRing
 * @property {number} level the iso-elevation value
 * @property {boolean} isIndex an index (heavier) contour
 * @property {string} d the SVG path data (empty if the field never crosses this level)
 */

/**
 * The full contour set for a heightfield: every level extracted, flagged index
 * or regular, as path data ready for the renderer to weight and stroke.
 * @param {Heightfield} hf
 * @param {ContourOpts} [opts]
 * @returns {ContourRing[]}
 */
export function contourGeometry(hf, opts) {
  const interval = opts?.interval ?? CONTOUR_DEFAULTS.interval;
  const indexEvery = opts?.indexEvery ?? CONTOUR_DEFAULTS.indexEvery;
  return contourLevels(hf.max, interval).map((level, k) => ({
    level,
    isIndex: k % indexEvery === 0,
    d: segsToPath(extractContour(hf, level)),
  }));
}
