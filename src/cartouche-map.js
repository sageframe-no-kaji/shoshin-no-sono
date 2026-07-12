/**
 * Cartouche (session 8, variant A — design/claude-design/exports/
 * session-8-cartouche/) — the map's title block, the one place ornament is
 * licensed. Implemented from the artifact's chosen variant, then recomposed
 * on the plate (2026-07-12): a full-width MASTHEAD — 初心の園 and its
 * transliteration justified edge-to-edge across the whole column — over the
 * terracotta rule, with the English block and the TRUE Sageframe chop
 * (sf-chop.png, the practitioner's brush original in deep vermilion #9E2B20,
 * the customary seal red, deliberately NOT the register terracotta) sitting
 * BELOW the rule: English left, seal right. The hachure fan is retired. The
 * cream reserve remains the paint-over; the rule with end ticks is the one
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
/** Centre of the lower-left English block (the masthead spans the full column). */
const TEXT_CX = 125;
/** The masthead's justified width — the reserve's inner column. */
const COL_X = 160;
const COL_W = 248;
const ROMAN = 'SHOSHIN NO SONO';
const ENGLISH = 'The Garden of Beginner’s Mind';
const TAG1 = 'An epistemology of learning, creation, and craft.';
const TAG2 = 'The garden has gates on every side.';

/**
 * One centred text line in the cartouche's local space (centred on TEXT_CX).
 * @param {number} y @param {number} size @param {number} weight
 * @param {string} fill @param {number} tracking em
 * @param {string} content
 * @param {{ cjk?: boolean, italic?: boolean, cx?: number, textLength?: number }} [o]
 * @returns {string}
 */
function line(y, size, weight, fill, tracking, content, /** @type {{ cjk?: boolean, italic?: boolean, cx?: number, textLength?: number }} */ o = {}) {
  const fam = o.cjk ? CJK : LATIN;
  const italic = o.italic ? ' font-style="italic"' : '';
  const cx = o.cx ?? TEXT_CX;
  // textLength justifies a masthead line edge-to-edge across the column.
  const tl = o.textLength ? ` textLength="${o.textLength}" lengthAdjust="spacing"` : '';
  return (
    `<text x="${cx}" y="${y}" text-anchor="middle" font-family="${fam}" ` +
    `font-size="${size}" font-weight="${weight}"${italic} fill="${fill}"${tl} ` +
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
 *   Centred at (254, 145), BELOW the rule at right, beside the English block.
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

  // The masthead: native and transliteration justified across the WHOLE column.
  g += line(74, 52, 500, REGISTER.ink, 0.12, NATIVE, { cjk: true, cx: COL_X, textLength: COL_W });
  g += line(98, 12.5, 400, INK2, 0.34, ROMAN, { cx: COL_X, textLength: COL_W });

  // The terracotta rule with end ticks — full column, the masthead's shelf.
  g += `<line x1="${COL_X - COL_W / 2}" y1="112" x2="${COL_X + COL_W / 2}" y2="112" stroke="${REGISTER.terra}" stroke-width="1.1" stroke-linecap="round"/>`;
  g += `<line x1="${COL_X - COL_W / 2}" y1="109" x2="${COL_X - COL_W / 2}" y2="115" stroke="${REGISTER.terra}" stroke-width="0.9"/>`;
  g += `<line x1="${COL_X + COL_W / 2}" y1="109" x2="${COL_X + COL_W / 2}" y2="115" stroke="${REGISTER.terra}" stroke-width="0.9"/>`;

  // Below the rule: the English block left, unchanged in voice…
  g += line(132, 13.5, 400, REGISTER.ink, 0.008, ENGLISH);
  g += line(150, 8.2, 400, GREY, 0.012, TAG1, { italic: true });
  g += line(161, 8.2, 400, GREY, 0.012, TAG2, { italic: true });

  // …and the Sageframe chop drops below the rule at right.
  if (chopHref && chopSize > 0) {
    const cx = 254 - chopSize / 2;
    const cy = 145 - chopSize / 2;
    g +=
      `<image href="${chopHref}" x="${cx.toFixed(1)}" y="${cy.toFixed(1)}" ` +
      `width="${chopSize}" height="${chopSize}" opacity="0.95" preserveAspectRatio="xMidYMid meet"/>`;
  }

  return `<g>${g}</g>`;
}
