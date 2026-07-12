/**
 * Cartouche (session 8, variant A — design/claude-design/exports/
 * session-8-cartouche/) — the map's title block, the one place ornament is
 * licensed. Implemented from the artifact's chosen variant: an UNFRAMED cream
 * reserve (the paint-over that parts the sea — the reserve IS the frame), the
 * native title leading at the steepest size jump, a single terracotta rule
 * with end ticks as the one permitted flourish, the italic tagline
 * whispering, a seeded peak-hachure fan naming the register at the lower
 * left, and the brush chop (the repo's hanko) signing the lower right.
 *
 * The group is self-contained in 320×200 local coordinates (8:5 aspect); the
 * page drops it into an open-water corner at variable scale. Corner selection
 * and a scale-linked type ramp are parked (session 8's own parked list).
 *
 * Pure: opts in, an SVG `<g>` string out. No DOM, no Indexer, no Gate, no URL.
 */

import { REGISTER } from './register.js';
import { mulberry32 } from './field.js';

/** The artifact's supporting inks — deliberately NOT register colors. */
const INK2 = '#4A4A4A'; // the roman line and the hachure fan
const GREY = '#6B6B6B'; // the tagline whisper

const LATIN = 'Spectral, Georgia, serif';
const CJK = "'Hiragino Mincho ProN','Yu Mincho','Songti SC','Noto Serif JP',serif";

const NATIVE = '初心の園';
const ROMAN = 'SHOSHIN NO SONO';
const ENGLISH = 'The Garden of Beginner’s Mind';
const TAG1 = 'An epistemology of learning, creation, and craft.';
const TAG2 = 'The garden has gates on every side.';

/** @param {number} n @returns {number} 1-decimal round, matching the artifact */
const f1 = (n) => Math.round(n * 10) / 10;

/**
 * One centred text line in the cartouche's local space.
 * @param {number} y @param {number} size @param {number} weight
 * @param {string} fill @param {number} tracking em
 * @param {string} content
 * @param {{ cjk?: boolean, italic?: boolean }} [o]
 * @returns {string}
 */
function line(y, size, weight, fill, tracking, content, o = {}) {
  const fam = o.cjk ? CJK : LATIN;
  const italic = o.italic ? ' font-style="italic"' : '';
  return (
    `<text x="160" y="${y}" text-anchor="middle" font-family="${fam}" ` +
    `font-size="${size}" font-weight="${weight}"${italic} fill="${fill}" ` +
    `style="letter-spacing:${tracking}em;">${content}</text>`
  );
}

/**
 * The peak-hachure fan — the register sample at the lower left: short seeded
 * marks radiating across the downhill half, slight downhill bias, the same
 * character as the map's hachures. Verbatim from the artifact.
 * @param {number} cx @param {number} cy @param {number} seed
 * @returns {string}
 */
function hachureFan(cx, cy, seed) {
  const rng = mulberry32(seed >>> 0);
  let s = '';
  const n = 11;
  for (let i = 0; i < n; i++) {
    const a = (i / (n - 1)) * Math.PI + (rng() - 0.5) * 0.12;
    const jx = (rng() - 0.5) * 1.0;
    const jy = (rng() - 0.5) * 1.0;
    const r0 = 1.6 + rng() * 1.2;
    const len = 6 + rng() * 5;
    const sx = cx + Math.cos(a) * r0 + jx;
    const sy = cy + Math.sin(a) * r0 * 0.6 + jy;
    const ex = sx + Math.cos(a) * len;
    const ey = sy + Math.sin(a) * len * 0.7 + 2;
    s += `M${f1(sx)} ${f1(sy)} L${f1(ex)} ${f1(ey)} `;
  }
  return `<path d="${s.trim()}" fill="none" stroke="${INK2}" stroke-width="0.55" stroke-linecap="round" opacity="0.8"/>`;
}

/**
 * @typedef {Object} CartoucheOpts
 * @property {number} [seed]     Seeds the hachure fan — same seed, same fan.
 * @property {string} [chopHref] Image href for the brush chop (the hanko). '' omits it.
 * @property {number} [border]   Hairline stroke on the reserve edge (default 0.45; 0 = the
 *   unframed session-8 lock). The lock's premise was open water; over land the bare cream
 *   rect reads as a hole in the terrain, and the session's own parked item anticipated a
 *   coastline-style hairline for exactly this case.
 * @property {number} [chopSize] The chop's edge length in local px (default 34; 0 omits it).
 *   The artifact assumed a dedicated chop asset at 27 px — illegible at map scale with the
 *   repo's hanko, so the size is a by-feel dial. The chop centres on (270, 159), mirroring
 *   the hachure fan's optical centre at (50, ~160) so the two lower-corner marks balance.
 */

/**
 * The session-8 variant-A cartouche as a self-contained `<g>` in 320×200
 * local coordinates, cream reserve included. The caller positions and scales
 * it (`<g transform="translate(x,y) scale(s)">`), and hides it by not
 * rendering it — there is no opacity dial; a cartouche is either signed or
 * absent.
 * @param {CartoucheOpts} [opts]
 * @returns {string}
 */
export function cartoucheSvg(opts = {}) {
  const seed = (opts.seed ?? 1) >>> 0;
  const chopHref = opts.chopHref ?? './shoshin-hanko.png';
  const border = opts.border ?? 0.45;
  const chopSize = opts.chopSize ?? 34;
  let g = '';

  // The cream reserve — the terrain runs behind the cartouche and the reserve
  // paints over it (clearing-as-paint-over). Unframed over open water (the
  // session-8 lock); over land a coastline-style hairline defines the edge.
  g += `<rect x="22" y="18" width="276" height="164" fill="${REGISTER.paper}"/>`;
  if (border > 0) {
    g +=
      `<rect x="22" y="18" width="276" height="164" fill="none" ` +
      `stroke="${REGISTER.ink}" stroke-width="${border.toFixed(2)}" opacity="0.85"/>`;
  }

  // The four-line hierarchy: native leads at the steepest jump.
  g += line(72, 44, 500, REGISTER.ink, 0.12, NATIVE, { cjk: true });
  g += line(96, 11.5, 400, INK2, 0.34, ROMAN);

  // The terracotta rule with end ticks — the one permitted flourish.
  g += `<line x1="118" y1="108" x2="202" y2="108" stroke="${REGISTER.terra}" stroke-width="1.1" stroke-linecap="round"/>`;
  g += `<line x1="118" y1="105" x2="118" y2="111" stroke="${REGISTER.terra}" stroke-width="0.9"/>`;
  g += `<line x1="202" y1="105" x2="202" y2="111" stroke="${REGISTER.terra}" stroke-width="0.9"/>`;

  g += line(127, 13.5, 400, REGISTER.ink, 0.008, ENGLISH);
  g += line(147, 8.2, 400, GREY, 0.012, TAG1, { italic: true });
  g += line(158, 8.2, 400, GREY, 0.012, TAG2, { italic: true });

  // The register sample: a peak-hachure fan at the lower left.
  g += hachureFan(50, 158, seed ^ 0x5151);

  // The brush chop signs the lower right, centred to mirror the fan.
  if (chopHref && chopSize > 0) {
    const cx = 270 - chopSize / 2;
    const cy = 159 - chopSize / 2;
    g +=
      `<image href="${chopHref}" x="${cx.toFixed(1)}" y="${cy.toFixed(1)}" ` +
      `width="${chopSize}" height="${chopSize}" opacity="0.9" preserveAspectRatio="xMidYMid meet"/>`;
  }

  return `<g>${g}</g>`;
}
