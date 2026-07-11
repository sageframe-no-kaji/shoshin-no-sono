/**
 * Label map — the cartography's type layer: peak names (wide-tracked roman caps
 * with the native script beside), town names (the authorial italic), USGS-style
 * elevation labels, the textured cream glow filter, and the greedy
 * collision-checked placement pass. This logic accrued on the cartography page
 * through ho-07.6 and ho-A-6.0; extracted here so it is tested. Everything is
 * parameterized on explicit opts — this module never reads the Gate or the
 * page's tuner panel (CLAUDE.md boundary: pure render components read state
 * passed to them; only the page talks to the Gate).
 *
 * Pure: values in, SVG strings out. No DOM, no Indexer, no Gate, no URL.
 */

import { extractContour } from './contours.js';
import { REGISTER } from './register.js';

/** @typedef {import('./field.js').Heightfield} Heightfield */

/** Annotation grey for the small cartographic numerals — deliberately NOT a
 * register color; it sits between ink and paper so annotations read secondary. */
const ANNOTATION_GREY = '#6B6B6B';

/** The native-script serif stack set beside a peak's roman name. */
export const NATIVE_STACK = "'Hiragino Mincho ProN','Yu Mincho','Songti SC','Noto Serif JP',serif";

export const LABEL_MAX_CHARS = 20; // wrap long titles to a carriage return at word boundaries
export const LABEL_LINE_HEIGHT = 14;

/**
 * Options every label renderer reads. The page resolves these once per render
 * — `labelRed` / `labelGlow` from its tuner panel, `hachure` from the Gate's
 * layer state — and passes them in explicitly.
 * @typedef {Object} LabelOpts
 * @property {number} labelRed label color dial 0..1.5 (ho-A-6.0)
 * @property {number} labelGlow halo weight — stroke width, or filter dilation when `hachure`
 * @property {boolean} hachure hachure layer on → labels halo via the textured glow filter
 */

/** @typedef {LabelOpts & { townLabelScale: number, townLabelGap: number }} TownLabelOpts */
/** @typedef {TownLabelOpts & { peakLabelScale: number, importanceScale: number }} PlaceNameOpts */

/**
 * Textured cream glow filter (ho-A-6.0). Dilates the text alpha (feMorphology)
 * to grow a halo around the EXTERIOR silhouette of the letterforms, then
 * displaces that edge by fractal turbulence so the boundary reads as inked-
 * by-hand rather than geometric. The result composites cream-only outside the
 * text and leaves the original colored letters untouched.
 * @param {number} glow `labelGlow` value — scales dilation + roughness.
 */
export const labelGlowFilter = (glow) => {
  const radius = Math.max(0.5, 4 * glow);
  const displace = Math.max(0.5, 2 * glow);
  return (
    `<defs><filter id="lblglow" x="-40%" y="-40%" width="180%" height="180%">` +
    `<feMorphology in="SourceAlpha" operator="dilate" radius="${radius.toFixed(2)}" result="halo"/>` +
    `<feTurbulence type="fractalNoise" baseFrequency="0.55" numOctaves="2" seed="7" result="noise"/>` +
    `<feDisplacementMap in="halo" in2="noise" scale="${displace.toFixed(2)}" result="rough"/>` +
    `<feFlood flood-color="${REGISTER.paper}" result="flood"/>` +
    `<feComposite in="flood" in2="rough" operator="in" result="glow"/>` +
    `<feMerge><feMergeNode in="glow"/><feMergeNode in="SourceGraphic"/></feMerge>` +
    `</filter></defs>`
  );
};

/**
 * Label color dial (ho-A-6.0). Three-stop gradient so the slider's 1.0
 * default lands exactly on terracotta — linear between 0..1 (warm dark →
 * terracotta) and 1..1.5 (terracotta → vivid red). Native script tracks the
 * primary color but in a slightly lighter parallel gradient so the visual
 * hierarchy survives the dial. The stops are dial waypoints, not register
 * values — the 0 and 1 stops happen to pass through the register ink and
 * terracotta, but the gradient is its own by-feel commitment.
 */
export const LABEL_PRIMARY_STOPS = [
  [0x2b, 0x2b, 0x2b],
  [0x9a, 0x5b, 0x3c],
  [0xc5, 0x3d, 0x24],
];
export const LABEL_NATIVE_STOPS = [
  [0x5c, 0x5c, 0x5c],
  [0xb5, 0x72, 0x55],
  [0xd8, 0x6a, 0x52],
];

/** @param {number[][]} stops 3 RGB stops at 0 / 1 / 1.5 @param {number} t */
export const labelColor = (stops, t) => {
  const clamped = Math.max(0, Math.min(1.5, t));
  const [a, b] = clamped <= 1 ? [stops[0], stops[1]] : [stops[1], stops[2]];
  const u = clamped <= 1 ? clamped : (clamped - 1) / 0.5;
  const c = a.map((v, i) => Math.round(v + (b[i] - v) * u));
  return `rgb(${c[0]},${c[1]},${c[2]})`;
};

/**
 * Peak label — typography variant B (peak): wide-tracked roman caps with the
 * native script set beside at near-equal optical size, a cream halo so it reads
 * over the rings. A minimal static render pulled forward so the assembled map
 * is legible during the by-feel pass; ho-09 owns the interactive label layer
 * (cards, hover-dim, collision/leadering).
 * @param {number} x @param {number} y @param {string} name @param {string|null} native
 * @param {number} scale @param {LabelOpts} opts
 */
export const peakLabel = (x, y, name, native, scale, opts) => {
  const primary = labelColor(LABEL_PRIMARY_STOPS, opts.labelRed);
  const natFill = labelColor(LABEL_NATIVE_STOPS, opts.labelRed);
  const fs = 16.5 * scale;
  const nat = native
    ? `<tspan dx="${(8 * scale).toFixed(1)}" font-family="${NATIVE_STACK}" font-size="${(14 * scale).toFixed(1)}" fill="${natFill}" style="letter-spacing:0.10em;">${native}</tspan>`
    : '';
  // When the hachure layer is on, labels read over a busy ground; use the
  // textured cream glow via SVG filter — feMorphology dilates the OUTER
  // letter silhouette (not per-letter strokes), feDisplacementMap roughs
  // the edge so it reads inked. Otherwise the ho-07.6 paint-order stroke
  // halo works clean over contours-or-empty.
  if (opts.hachure) {
    return (
      `<text x="${x.toFixed(1)}" y="${y.toFixed(1)}" text-anchor="middle" font-family="Spectral, Georgia, serif" ` +
      `font-size="${fs.toFixed(1)}" fill="${primary}" style="letter-spacing:0.16em;" ` +
      `filter="url(#lblglow)">${(name || '').toUpperCase()}${nat}</text>`
    );
  }
  return (
    `<text x="${x.toFixed(1)}" y="${y.toFixed(1)}" text-anchor="middle" font-family="Spectral, Georgia, serif" ` +
    `font-size="${fs.toFixed(1)}" fill="${primary}" style="letter-spacing:0.16em;" ` +
    `paint-order="stroke" stroke="${REGISTER.paper}" stroke-width="${(5 * scale * opts.labelGlow).toFixed(1)}" stroke-linejoin="round">${(name || '').toUpperCase()}${nat}</text>`
  );
};

/**
 * A peak's label scale: the base size dialed up or down by its importance, like a
 * real map where the big places carry the big type (ho-07.6). `importanceScale` 0
 * makes every peak the same; higher spreads them — importance 10 reaches
 * (1 + importanceScale)× an importance-2 peak. Floored so the smallest stays legible.
 * @param {number} importance
 * @param {{ peakLabelScale: number, importanceScale: number }} opts
 */
export const peakNameScale = (importance, opts) =>
  opts.peakLabelScale * Math.max(0.4, 1 + opts.importanceScale * ((importance - 2) / 8));

/** Word-wrap a label (case preserved) to lines of at most LABEL_MAX_CHARS. @param {string} name @returns {string[]} */
export const wrapLabel = (name) => {
  const words = (name || '').split(/\s+/).filter(Boolean);
  /** @type {string[]} */
  const lines = [];
  let cur = '';
  for (const w of words) {
    if (cur && cur.length + 1 + w.length > LABEL_MAX_CHARS) {
      lines.push(cur);
      cur = w;
    } else {
      cur = cur ? `${cur} ${w}` : w;
    }
  }
  if (cur) lines.push(cur);
  return lines;
};

/**
 * Town label — the *authorial voice* (ho-07.6 Decision 4, brand-grounded): italic,
 * mixed-case, muted ink, tightly tracked — distinct from the peak's monumental
 * upright caps. Writing about the work speaks in italic; terracotta stays reserved
 * for the cathedral landmark and ho-09 interaction. Cream halo so it reads clear of
 * the contours.
 * @param {number} x @param {number} y @param {string} name @param {number} scale
 * @param {LabelOpts} opts
 */
export const townLabel = (x, y, name, scale, opts) => {
  const lines = wrapLabel(name);
  const tspans = lines
    .map((ln, i) => `<tspan x="${x.toFixed(1)}" dy="${i === 0 ? 0 : (LABEL_LINE_HEIGHT * scale).toFixed(1)}">${ln}</tspan>`)
    .join('');
  const fs = 12.5 * scale;
  // Hachure layer on: textured glow filter around the italic text silhouette
  // — exterior boundary only, no per-letter stroke widening.
  if (opts.hachure) {
    return (
      `<text x="${x.toFixed(1)}" y="${y.toFixed(1)}" text-anchor="middle" font-family="Spectral, Georgia, serif" ` +
      `font-style="italic" font-size="${fs.toFixed(1)}" fill="${labelColor(LABEL_PRIMARY_STOPS, opts.labelRed)}" style="letter-spacing:0.04em;" ` +
      `filter="url(#lblglow)">${tspans}</text>`
    );
  }
  return (
    `<text x="${x.toFixed(1)}" y="${y.toFixed(1)}" text-anchor="middle" font-family="Spectral, Georgia, serif" ` +
    `font-style="italic" font-size="${fs.toFixed(1)}" fill="${labelColor(LABEL_PRIMARY_STOPS, opts.labelRed)}" style="letter-spacing:0.04em;" ` +
    `paint-order="stroke" stroke="${REGISTER.paper}" stroke-width="${(4.5 * scale * opts.labelGlow).toFixed(1)}" stroke-linejoin="round">${tspans}</text>`
  );
};

/**
 * The geometric slice of a town a label needs: where it sits and how far its
 * buildings reach. `CartographyTown` satisfies this structurally.
 * @typedef {{ seat: { x: number, y: number }, extent: number, name: string }} TownLabelGeom
 */

/**
 * A town as the place-name layer consumes it — the geometry plus the filter
 * match flag and the underlying work's importance (label priority). The page
 * resolves `importance` via the Indexer before calling in.
 * @typedef {TownLabelGeom & { match: boolean, importance: number }} TownLabelInput
 */

/** The y of a town's label — below the settlement's outer edge plus the gap (ho-07.6). @param {TownLabelGeom} t @param {number} gap */
export const townLabelY = (t, gap) => t.seat.y + t.extent + gap;

/** A town's label markup. @param {TownLabelGeom} t @param {TownLabelOpts} opts */
export const townLabelSvg = (t, opts) =>
  `<g>${townLabel(t.seat.x, townLabelY(t, opts.townLabelGap), t.name, opts.townLabelScale, opts)}</g>`;

/**
 * @typedef {Object} LabelItem
 * @property {number} cx center x @property {number} top box top y
 * @property {number} w box width @property {number} h box height
 * @property {number} priority higher wins a collision @property {string} svg
 */

/**
 * Greedy label placement (ho-07.6): place labels by priority, dropping any whose box
 * overlaps one already placed — so text never lands on text. A pragmatic stand-in
 * for ho-09's full collision/leadering layer; here a colliding label is simply
 * omitted rather than nudged or leadered.
 * @param {LabelItem[]} items @returns {string}
 */
export const placeLabels = (items) => {
  const ranked = [...items].sort((a, b) => b.priority - a.priority);
  /** @type {{x1:number,y1:number,x2:number,y2:number}[]} */
  const placed = [];
  let out = '';
  for (const it of ranked) {
    const box = { x1: it.cx - it.w / 2, y1: it.top, x2: it.cx + it.w / 2, y2: it.top + it.h };
    const hit = placed.some((p) => !(box.x2 < p.x1 || box.x1 > p.x2 || box.y2 < p.y1 || box.y1 > p.y2));
    if (hit) continue;
    placed.push(box);
    out += it.svg;
  }
  return out;
};

/**
 * A peak as the place-name layer consumes it — position, name, native script,
 * and importance. The page resolves the work via the Indexer (skipping peaks
 * with no catalog entry) before calling in.
 * @typedef {{ x: number, y: number, name: string, native: string | null, importance: number }} PeakLabelInput
 */

/**
 * The collision-checked place-name layer for the resting map: peaks and towns,
 * sized by importance, biggest first.
 * @param {PeakLabelInput[]} peaks @param {TownLabelInput[]} towns @param {PlaceNameOpts} opts
 */
export const placeNameLayer = (peaks, towns, opts) => {
  /** @type {LabelItem[]} */
  const items = [];
  // Hachure layer on: SVG filter dilates the text alpha by ~4*glow px;
  // collision boxes grow modestly to match the visible glow footprint.
  // Hachure layer off: tighter stroke-halo box.
  const peakCardPad = opts.hachure ? 3 * opts.labelGlow : 0;
  const townCardPad = opts.hachure ? 3 * opts.labelGlow : 0;
  for (const p of peaks) {
    const sc = peakNameScale(p.importance, opts);
    const fs = 16.5 * sc;
    const chars = (p.name || '').length;
    const wide = chars * fs * 0.78 + (p.native ? fs * 2.6 : 0); // caps + tracking + native
    items.push({
      cx: p.x,
      top: p.y - 12 - fs,
      w: wide + 6 + 2 * peakCardPad,
      h: fs + 6 + 2 * peakCardPad,
      priority: p.importance + 0.5, // a work edges out an equal-importance town
      svg: peakLabel(p.x, p.y - 12, p.name, p.native, sc, opts),
    });
  }
  for (const t of towns) {
    if (!t.match) continue;
    const fs = 12.5 * opts.townLabelScale;
    const lines = wrapLabel(t.name);
    const maxc = Math.max(1, ...lines.map((l) => l.length));
    const h = (lines.length - 1) * LABEL_LINE_HEIGHT * opts.townLabelScale + fs;
    items.push({
      cx: t.seat.x,
      top: townLabelY(t, opts.townLabelGap) - fs,
      w: maxc * fs * 0.5 + 6 + 2 * townCardPad,
      h: h + 6 + 2 * townCardPad,
      priority: t.importance,
      svg: townLabelSvg(t, opts),
    });
  }
  return placeLabels(items);
};

/** Heightfield units → feet: an importance-9 summit (height ≈ 9) reads ≈ 9000 ft. */
export const FEET_PER_UNIT = 1000;
/** Elevation labels land on ROUND contours (every 1000 ft), like a real topo map. */
export const ELEVATION_STEP_FT = 1000;

/**
 * USGS-style elevation labels (ho-07.6). Iso-lines are extracted at *round* 1000-ft
 * elevations — independent of the visual contour interval — so the numbers read
 * 1000, 2000, 3000… rather than the rendered rings' off values. Each carries its
 * elevation in feet, set inline with a cream halo and rotated along the line. A
 * couple per level. Rendered only in the resting / frozen-terrain views (computed
 * once), not per world beat.
 * @param {Heightfield} hf
 * @param {{ elevationScale: number }} opts size dial for the numerals
 */
export const elevationLabelsSvg = (hf, opts) => {
  const maxFeet = hf.max * FEET_PER_UNIT;
  let svg = '';
  for (let feet = ELEVATION_STEP_FT; feet < maxFeet; feet += ELEVATION_STEP_FT) {
    const segs = extractContour(hf, feet / FEET_PER_UNIT);
    if (segs.length < 8) continue;
    const stride = Math.max(8, Math.floor(segs.length / 2)); // ~a couple labels per level
    for (let i = Math.floor(stride / 2); i < segs.length; i += stride) {
      const [a, b] = segs[i];
      const mx = (a.x + b.x) / 2;
      const my = (a.y + b.y) / 2;
      let ang = (Math.atan2(b.y - a.y, b.x - a.x) * 180) / Math.PI;
      if (ang > 90) ang -= 180; // keep the numerals upright
      // The mirror fold is defensive symmetry: extractContour's case table
      // only leaves ±90 via its T→B segment, which always points down-page
      // (dy > 0), so a raw angle below −90 cannot occur today. Kept in case
      // the segment convention ever changes; excluded from branch coverage.
      /* v8 ignore next */
      if (ang < -90) ang += 180;
      const sz = 6 * opts.elevationScale;
      svg +=
        `<text x="${mx.toFixed(1)}" y="${my.toFixed(1)}" text-anchor="middle" dominant-baseline="central" ` +
        `transform="rotate(${ang.toFixed(1)} ${mx.toFixed(1)} ${my.toFixed(1)})" ` +
        `font-family="Spectral, Georgia, serif" font-size="${sz.toFixed(1)}" fill="${ANNOTATION_GREY}" style="letter-spacing:0.04em;" ` +
        `paint-order="stroke" stroke="${REGISTER.paper}" stroke-width="${(2.4 * opts.elevationScale).toFixed(1)}" stroke-linejoin="round">${feet}</text>`;
    }
  }
  return svg;
};
