/**
 * Cartouche (session 8, variant A — design/claude-design/exports/
 * session-8-cartouche/) — the map's title block, the one place ornament is
 * licensed. Implemented from the artifact's chosen variant, then rebalanced
 * on the plate (2026-07-12): the hachure-fan register sample retired and the
 * text block shifted left so the TRUE Sageframe chop (sf-chop.png, extracted
 * to terracotta-on-transparent from the practitioner's brush original) can
 * sign large on the right — letterhead composition, type left, seal right.
 * The cream reserve remains the paint-over; the native title leads at the
 * steepest size jump; the single terracotta rule with end ticks is the one
 * permitted flourish; the tagline whispers italic.
 *
 * The group is self-contained in 320×200 local coordinates (8:5 aspect); the
 * page drops it into a corner at variable scale. Corner selection and a
 * scale-linked type ramp are parked (session 8's own parked list).
 *
 * Pure: opts in, an SVG `<g>` string out. No DOM, no Indexer, no Gate, no URL.
 */

import { REGISTER } from './register.js';

/** The artifact's supporting inks — deliberately NOT register colors. */
const INK2 = '#4A4A4A'; // the roman line
const GREY = '#6B6B6B'; // the tagline whisper

const LATIN = 'Spectral, Georgia, serif';
const CJK = "'Hiragino Mincho ProN','Yu Mincho','Songti SC','Noto Serif JP',serif";

const NATIVE = '初心の園';
/** Text block centre — shifted left of the artifact's 160 so the chop signs large at right. */
const TEXT_CX = 125;
const ROMAN = 'SHOSHIN NO SONO';
const ENGLISH = 'The Garden of Beginner’s Mind';
const TAG1 = 'An epistemology of learning, creation, and craft.';
const TAG2 = 'The garden has gates on every side.';

/**
 * One centred text line in the cartouche's local space (centred on TEXT_CX).
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
    `<text x="${TEXT_CX}" y="${y}" text-anchor="middle" font-family="${fam}" ` +
    `font-size="${size}" font-weight="${weight}"${italic} fill="${fill}" ` +
    `style="letter-spacing:${tracking}em;">${content}</text>`
  );
}

/**
 * @typedef {Object} CartoucheOpts
 * @property {number} [seed]     Accepted for API stability; the cartouche is currently
 *   deterministic without it (the seeded fan retired 2026-07-12).
 * @property {string} [chopHref] Image href for the chop (default './sf-chop.png'). '' omits it.
 * @property {number} [border]   Hairline stroke on the reserve edge (default 0.45; 0 = the
 *   unframed session-8 lock). The lock's premise was open water; over land the bare cream
 *   rect reads as a hole in the terrain, and the session's own parked item anticipated a
 *   coastline-style hairline for exactly this case.
 * @property {number} [chopSize] The chop's edge length in local px (default 60; 0 omits it).
 *   Centred at (256, 100) — the seal signs large on the reserve's right, letterhead-style,
 *   beside the left-shifted text block.
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
  const chopHref = opts.chopHref ?? './sf-chop.png';
  const border = opts.border ?? 0.45;
  const chopSize = opts.chopSize ?? 60;
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
  g += `<line x1="${TEXT_CX - 42}" y1="108" x2="${TEXT_CX + 42}" y2="108" stroke="${REGISTER.terra}" stroke-width="1.1" stroke-linecap="round"/>`;
  g += `<line x1="${TEXT_CX - 42}" y1="105" x2="${TEXT_CX - 42}" y2="111" stroke="${REGISTER.terra}" stroke-width="0.9"/>`;
  g += `<line x1="${TEXT_CX + 42}" y1="105" x2="${TEXT_CX + 42}" y2="111" stroke="${REGISTER.terra}" stroke-width="0.9"/>`;

  g += line(127, 13.5, 400, REGISTER.ink, 0.008, ENGLISH);
  g += line(147, 8.2, 400, GREY, 0.012, TAG1, { italic: true });
  g += line(158, 8.2, 400, GREY, 0.012, TAG2, { italic: true });

  // The Sageframe chop signs large on the right — letterhead composition.
  if (chopHref && chopSize > 0) {
    const cx = 256 - chopSize / 2;
    const cy = 100 - chopSize / 2;
    g +=
      `<image href="${chopHref}" x="${cx.toFixed(1)}" y="${cy.toFixed(1)}" ` +
      `width="${chopSize}" height="${chopSize}" opacity="0.9" preserveAspectRatio="xMidYMid meet"/>`;
  }

  return `<g>${g}</g>`;
}
