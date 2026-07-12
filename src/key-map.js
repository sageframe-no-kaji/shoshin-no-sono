/**
 * Face key (session 9, variant A — design/claude-design/exports/
 * session-9-face-key/) — the map face's minimal apparatus, quad-sheet style:
 * four lines near the margin naming the marks a reader actually needs — the
 * work, the writing, the documentation link, and the companion link. The
 * session's A-lock carried three; the practitioner amended to add ROAD
 * (2026-07-12): the face draws two line vocabularies, and a key that
 * explains only one of them invites the very question it exists to answer.
 * Its swatch and gloss come verbatim from the artifact's own variant-B
 * vocabulary. The beacon stays on the verso's full legend (ho-08.5) — it
 * reads as ornament until the verso explains it. Each entry carries a
 * mark-sample drawn at the map's own character and weight (a seeded hachure
 * fan, ink blocks, the rail with rungs, the cased double-line), so the key
 * reads as samples lifted from the sheet, not icons.
 *
 * The session's A-lock was unframed on an open-water premise; the
 * practitioner amended at implementation (2026-07-12): the map face is land
 * and water, so the cream reserve takes the cartouche's hairline border —
 * the same edge, the same reason, the two pieces of furniture in one voice.
 *
 * The group is self-contained in 320×200 local coordinates (8:5 aspect,
 * matching the cartouche); the page drops it into a corner at variable
 * scale. Which margin the key prefers relative to the cartouche's corner is
 * parked (session 9's own parked list).
 *
 * Pure: opts in, an SVG `<g>` string out. No DOM, no Indexer, no Gate, no URL.
 */

import { REGISTER } from './register.js';
import { mulberry32 } from './field.js';

/** The artifact's supporting inks — deliberately NOT register colors. */
const INK2 = '#4A4A4A'; // gloss text, peak hachures
const GREY = '#6B6B6B'; // the trail rail

const LATIN = 'Spectral, Georgia, serif';

/**
 * The reserve footprint in the group's 320×200 local space — exported so the
 * page can compute the key's true content keep-out (the box the reader sees,
 * not the whole local plate). Grown from the artifact's 214×96 at
 * implementation: the plate renders the glosses in the fallback serif
 * (Georgia — wider than the artifact's webfont), and the longest line ran
 * against the edge; the box takes real air on every side. One leading taller
 * again for the ROAD amendment.
 */
export const KEY_RESERVE = Object.freeze({ x: 53, y: 52, w: 248, h: 137 });

/** The four face entries. The glosses are the artifact's voice, verbatim —
 * peak/town/trail from the TIGHT list, road from the variant-B vocabulary. */
const ENTRIES = Object.freeze([
  { swatch: 'peak', noun: 'PEAK', gloss: 'a work; height is weight.' },
  { swatch: 'town', noun: 'TOWN', gloss: 'the writing, at its foot.' },
  { swatch: 'trail', noun: 'TRAIL', gloss: 'to what a writing documents.' },
  { swatch: 'road', noun: 'ROAD', gloss: 'joins companion writings.' },
]);

/** @param {number} n */
const f1 = (n) => (Math.round(n * 10) / 10).toString();

/**
 * Peak sample: a short seeded hachure fan — the relief comb at map weight.
 * @param {number} cx @param {number} cy @param {number} seed
 * @returns {string}
 */
function peakSwatch(cx, cy, seed) {
  const rng = mulberry32(seed >>> 0);
  let d = '';
  const n = 7;
  for (let i = 0; i < n; i++) {
    const a = (i / (n - 1)) * Math.PI + (rng() - 0.5) * 0.1;
    const r0 = 1.1 + rng() * 0.7;
    const len = 4.4 + rng() * 2.6;
    const sx = cx + Math.cos(a) * r0;
    const sy = cy + Math.sin(a) * r0 * 0.6;
    const ex = sx + Math.cos(a) * len;
    const ey = sy + Math.sin(a) * len * 0.7 + 1.3;
    d += `M${f1(sx)} ${f1(sy)} L${f1(ex)} ${f1(ey)} `;
  }
  return `<path d="${d.trim()}" fill="none" stroke="${INK2}" stroke-width="0.55" stroke-linecap="round" opacity="0.85"/>`;
}

/**
 * Town sample: five or six small seeded ink blocks with party-wall gaps.
 * @param {number} cx @param {number} cy @param {number} seed
 * @returns {string}
 */
function townSwatch(cx, cy, seed) {
  const rng = mulberry32(seed >>> 0);
  const off = [
    [-6.4, -1.2],
    [-1.6, -3.0],
    [3.0, -1.4],
    [-3.8, 3.0],
    [1.8, 2.6],
    [6.2, 1.4],
  ];
  const n = 5 + (rng() < 0.5 ? 0 : 1);
  let s = '';
  for (let i = 0; i < n; i++) {
    const w = 2.8 + rng() * 1.5;
    const h = 2.8 + rng() * 1.3;
    const x = cx + off[i][0];
    const y = cy + off[i][1];
    const rot = (rng() - 0.5) * 14;
    s +=
      `<rect x="${f1(x - w / 2)}" y="${f1(y - h / 2)}" width="${f1(w)}" height="${f1(h)}" ` +
      `transform="rotate(${f1(rot)} ${f1(x)} ${f1(y)})" fill="${REGISTER.ink}"/>`;
  }
  return s;
}

/**
 * Trail sample: the fine rail with four perpendicular rungs, at trail weight.
 * @param {number} cx @param {number} cy
 * @returns {string}
 */
function trailSwatch(cx, cy) {
  const x0 = cx - 8;
  const x1 = cx + 8;
  let s = `<path d="M${f1(x0)} ${f1(cy)} L${f1(x1)} ${f1(cy)}" fill="none" stroke="${GREY}" stroke-width="0.6" stroke-linecap="round"/>`;
  const n = 4;
  for (let i = 0; i < n; i++) {
    const xx = x0 + ((i + 0.5) / n) * (x1 - x0);
    s += `<line x1="${f1(xx)}" y1="${f1(cy - 2.3)}" x2="${f1(xx)}" y2="${f1(cy + 2.3)}" stroke="${GREY}" stroke-width="0.6" stroke-linecap="round"/>`;
  }
  return s;
}

/**
 * Road sample: the cased double-line — paper casing, ink body, paper centre,
 * leaving the map's two rails.
 * @param {number} cx @param {number} cy
 * @returns {string}
 */
function roadSwatch(cx, cy) {
  const d = `M${f1(cx - 8)} ${f1(cy)} L${f1(cx + 8)} ${f1(cy)}`;
  return (
    `<path d="${d}" fill="none" stroke="${REGISTER.paper}" stroke-width="6.4" stroke-linecap="round"/>` +
    `<path d="${d}" fill="none" stroke="${REGISTER.ink}" stroke-width="4.4" stroke-linecap="round"/>` +
    `<path d="${d}" fill="none" stroke="${REGISTER.paper}" stroke-width="2.2" stroke-linecap="round"/>`
  );
}

/**
 * One key entry's mark-sample by kind.
 * @param {string} kind @param {number} cx @param {number} cy @param {number} seed
 * @returns {string}
 */
function swatch(kind, cx, cy, seed) {
  if (kind === 'peak') return peakSwatch(cx, cy, seed);
  if (kind === 'town') return townSwatch(cx, cy, seed);
  if (kind === 'road') return roadSwatch(cx, cy);
  return trailSwatch(cx, cy);
}

/**
 * One entry line: the noun small-capped in ink, the gloss run in after an
 * em-dash in the roman grey.
 * @param {number} x @param {number} y @param {string} noun @param {string} gloss
 * @returns {string}
 */
function entry(x, y, noun, gloss) {
  return (
    `<text x="${f1(x)}" y="${f1(y)}" text-anchor="start" font-family="${LATIN}" fill="${INK2}">` +
    `<tspan font-size="8.4" font-weight="500" fill="${REGISTER.ink}" style="letter-spacing:0.13em">${noun}</tspan>` +
    `<tspan font-size="9.4" font-weight="400" dx="5.5" style="letter-spacing:0.006em">— ${gloss}</tspan></text>`
  );
}

/**
 * @typedef {Object} FaceKeyOpts
 * @property {number} [seed]   Seeds the mark-samples (the hachure fan, the ink
 *   blocks) so a layout's key is fixed within it and varies between layouts.
 * @property {number} [border] Hairline stroke on the reserve edge (default 0.45,
 *   the cartouche's landing; 0 = the session-9 unframed open-water lock).
 */

/**
 * The session-9 variant-A face key as a self-contained `<g>` in 320×200
 * local coordinates, cream reserve included. The caller positions and scales
 * it (`<g transform="translate(x,y) scale(s)">`), and hides it by not
 * rendering it — apparatus is either present or absent, never translucent.
 * @param {FaceKeyOpts} [opts]
 * @returns {string}
 */
export function faceKeySvg(opts = {}) {
  const seed = opts.seed ?? 0;
  const border = opts.border ?? 0.45;
  const r = KEY_RESERVE;
  let g = '';

  // The cream reserve — the terrain runs behind the key and the reserve
  // paints over it (clearing-as-paint-over); the hairline holds the edge
  // over land and water alike, in the cartouche's own stroke.
  g += `<rect x="${r.x}" y="${r.y}" width="${r.w}" height="${r.h}" fill="${REGISTER.paper}"/>`;
  if (border > 0) {
    g +=
      `<rect x="${r.x}" y="${r.y}" width="${r.w}" height="${r.h}" fill="none" ` +
      `stroke="${REGISTER.ink}" stroke-width="${border.toFixed(2)}" opacity="0.85"/>`;
  }

  // Three entries: mark-sample in the gutter, label beside it (artifact
  // layout, re-inset for the grown box so the padding reads on every side).
  const gx = r.x + 28; // the swatch gutter's centre
  const lx = r.x + 50; // the label's left edge
  const y0 = r.y + 34; // first baseline
  const dy = 25; // leading
  for (let i = 0; i < ENTRIES.length; i++) {
    const by = y0 + i * dy;
    g += swatch(ENTRIES[i].swatch, gx, by - 2.4, (seed ^ (i * 0x9e37)) >>> 0);
    g += entry(lx, by, ENTRIES[i].noun, ENTRIES[i].gloss);
  }

  return `<g>${g}</g>`;
}
