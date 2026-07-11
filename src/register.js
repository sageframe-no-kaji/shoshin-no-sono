/**
 * The frozen visual register (ho-04, design/visual-register.html) — the four
 * colors the whole map is drawn in, in one place. Warm ink on cream, terracotta
 * spent once per city, a muted sienna for water. Every renderer imports its
 * colors from here; none declares its own.
 *
 * These values are commitments, not tuners. The register was committed on the
 * visual-register page during the territory spike and does not move by feel —
 * renderers expose them as `opts` only so they are testable (the ho-06
 * Decision 4 posture), never so they can drift. A change to this object is a
 * design decision, made in the register page first and reflected here second.
 */

export const REGISTER = Object.freeze({
  /** Warm near-black ink — contours, hachures, settlement blocks, road rails. */
  ink: '#2B2B2B',
  /** Cream paper ground — the map's background, casings, and clearings. */
  paper: '#FDFCF9',
  /** Terracotta — spent once on each city's landmark and nowhere else. */
  terra: '#9A5B3C',
  /** Warm water ink — a muted sienna that reads water without screaming blue. */
  waterInk: '#8A7B6A',
});
