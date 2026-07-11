/**
 * Beacon map — the cartography's annotation marks: the per-peak signal-fire
 * beacons (ho-07.6 Decision 5) and the corpus-floor horizon marker (ho-07.2
 * Decision 5). This logic accrued on the cartography page; extracted here so
 * it is tested. Both renderers take explicit opts — the page resolves the
 * tuner values before calling in.
 *
 * Pure: values in, SVG strings out. No DOM, no Indexer, no Gate, no URL.
 */

import { CORPUS_FLOOR } from './emergence.js';

/** The signal-fire beacon hue (brand Amber — flame, NOT the reserved terracotta). */
export const BEACON_AMBER = '#D4952A';

/** Horizon-annotation grey for the corpus-floor marker — deliberately NOT a
 * register color; a warm faded grey so the horizon reads as a marginal note. */
const HORIZON_GREY = '#9A958B';

/**
 * The signal-fire beacon (ho-07.6 Decision 5): a soft amber glow at each risen
 * peak's summit — the beacons of Gondor, lit as the peak rises. Three stacked
 * circles (wide faint halo, mid glow, bright core) in flame amber, never
 * terracotta. When `pulse` is set (resting / writing phase, where the container is
 * stable) the beacon breathes via `emgBeacon`; during the world cross-fade it
 * stays steady so the per-beat re-render can't reset the breath. Weight by
 * `beaconOpacity` (0 hides it).
 * @param {import('./field.js').PositionedPeak[]} peaks
 * @param {{ beaconOpacity: number, beaconImportance: number, pulse?: boolean }} opts
 */
export const beaconSvg = (peaks, opts) => {
  const op = opts.beaconOpacity;
  if (op <= 0) return '';
  const anim = opts.pulse ? ' style="animation:emgBeacon 2800ms ease-in-out infinite;"' : '';
  const dial = opts.beaconImportance;
  // Quadratic spread by importance: factor = (imp/10)^2. Log compressed the
  // high end so peaks 5–10 all read at ~60–100% — not enough contrast. The
  // power curve drops imp 3 to ~10% and lets imp 9 sit at ~80%, so the
  // hierarchy reads. `dial` lerps from uniform (0) to fully spread (1).
  return peaks
    .map((p) => {
      const norm = Math.max(0, Math.min(1, p.importance / 10));
      const factor = norm * norm;
      const scaled = op * (1 - dial + dial * factor);
      // Opacity caps at 1 (SVG). Past `scaled=1` the dial keeps amplifying via
      // radius growth — sqrt so a 5× weight ~doubles the visible glow, not 5×.
      const sizeMul = scaled > 1 ? Math.sqrt(scaled) : 1;
      const rHalo = (9 * sizeMul).toFixed(1);
      const rGlow = (3.4 * sizeMul).toFixed(1);
      const rCore = (1.3 * sizeMul).toFixed(1);
      const opHalo = Math.min(1, 0.18 * scaled).toFixed(3);
      const opGlow = Math.min(1, 0.55 * scaled).toFixed(3);
      const opCore = Math.min(1, 0.95 * scaled).toFixed(3);
      return (
        `<g${anim}><circle cx="${p.x.toFixed(1)}" cy="${p.y.toFixed(1)}" r="${rHalo}" fill="${BEACON_AMBER}" opacity="${opHalo}"/>` +
        `<circle cx="${p.x.toFixed(1)}" cy="${p.y.toFixed(1)}" r="${rGlow}" fill="${BEACON_AMBER}" opacity="${opGlow}"/>` +
        `<circle cx="${p.x.toFixed(1)}" cy="${p.y.toFixed(1)}" r="${rCore}" fill="${BEACON_AMBER}" opacity="${opCore}"/></g>`
      );
    })
    .join('');
};

/**
 * The corpus-floor marker (ho-07.2 Decision 5): a faint dashed horizon near the
 * field's base with a small caption, marking 2025-11-11 — where the dense record
 * begins. Present from the first emergence frame and at rest; the 2022 floor work
 * (aspirational-intelligence) is a real peak and renders through the field. Weight
 * is by-feel (the `floorMarkerOpacity` opt); 0 hides it.
 * @param {{ floorMarkerOpacity: number }} opts
 */
export const corpusFloorSvg = (opts) => {
  const op = opts.floorMarkerOpacity;
  if (op <= 0) return '';
  // Pulled up off the bottom edge and given a readable caption so it can actually
  // be seen and judged (ho-07.6 Decision 6 — it was invisible at y≈610).
  const y = 588;
  return (
    `<g opacity="${op}">` +
    `<line x1="60" y1="${y}" x2="940" y2="${y}" stroke="${HORIZON_GREY}" stroke-width="0.8" stroke-dasharray="1 6" stroke-linecap="round"/>` +
    `<text x="60" y="${y - 6}" font-family="Spectral, Georgia, serif" font-style="italic" font-size="9.5" fill="${HORIZON_GREY}" ` +
    `style="letter-spacing:0.12em;">${CORPUS_FLOOR.label} · 2025</text>` +
    `</g>`
  );
};
