/**
 * Settlement render (ho-07) — settlement blocks drawn in the frozen register.
 * Pure: a block list in, an SVG string out, no DOM. The register (visual-
 * register.html §2): solid ink blocks with a paper-stroke party-wall separator,
 * the street read as the void between walls (no road stroke), terracotta spent
 * once on the city's landmark and nowhere else.
 *
 * The register values are commitments, exposed as `opts` only so the renderer
 * is testable (the ho-06 Decision 4 posture). Recorded in
 * ho-process/hos/ho-07-town-placement.md.
 */

import { REGISTER } from './register.js';

/** @typedef {import('./settlements.js').Block} Block */

/** @param {number} n @returns {number} 2-decimal round, matching the spike's precision */
const round2 = (n) => Math.round(n * 100) / 100;

/** Frozen party-wall separator weight (design/visual-register.html §2) — a
 * stroke weight, not a color, so it stays local; colors come from src/register.js. */
const SEP = 0.4;

/**
 * @typedef {{ ink?: string, paper?: string, terra?: string, sep?: number }} SettlementMapOpts
 */

/**
 * Cream clearing for a settlement: each block rendered as a fat cream stroke
 * following the actual building outline — same mechanism as the label knockout
 * (paint-order / thick stroke) but applied to rects. Render BEFORE the ink
 * blocks so the clearing sits under the buildings.
 * @param {Block[]} blocks
 * @param {number} [pad] clearing half-width in px (default 16)
 * @param {string} [paper] clearing color (default register paper)
 * @returns {string} SVG fragment
 */
export function settlementClearingSvg(blocks, pad = 16, paper = REGISTER.paper) {
  if (blocks.length === 0) return '';
  const sw = round2(pad * 2);
  let svg = '';
  for (const b of blocks) {
    svg +=
      `<rect x="${round2(-b.w / 2)}" y="${round2(-b.h / 2)}" width="${round2(b.w)}" height="${round2(b.h)}" ` +
      `transform="translate(${round2(b.x)},${round2(b.y)}) rotate(${round2(b.a || 0)})" ` +
      `fill="${paper}" stroke="${paper}" stroke-width="${sw}" stroke-linejoin="round"/>`;
  }
  return svg;
}

/**
 * Render one settlement's blocks as SVG `<rect>`s in settlement-local space.
 * The caller wraps this in a `<g transform="translate(seatX,seatY)">`, so the
 * blocks stay origin-relative here. Terracotta marks the city landmark; every
 * other block is ink. An empty block list renders nothing.
 * @param {Block[]} blocks
 * @param {SettlementMapOpts} [opts]
 * @returns {string} SVG fragment
 */
export function settlementSvg(blocks, opts = {}) {
  const ink = opts.ink ?? REGISTER.ink;
  const paper = opts.paper ?? REGISTER.paper;
  const terra = opts.terra ?? REGISTER.terra;
  const sep = opts.sep ?? SEP;
  let svg = '';
  for (const b of blocks) {
    const fill = b.terra ? terra : ink;
    svg +=
      `<rect x="${round2(-b.w / 2)}" y="${round2(-b.h / 2)}" width="${round2(b.w)}" height="${round2(b.h)}" ` +
      `transform="translate(${round2(b.x)},${round2(b.y)}) rotate(${round2(b.a || 0)})" ` +
      `fill="${fill}" stroke="${paper}" stroke-width="${sep}"/>`;
  }
  return svg;
}
