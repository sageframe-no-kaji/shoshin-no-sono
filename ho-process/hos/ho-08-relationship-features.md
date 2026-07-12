---
created: 2026-07-11
status: draft
type: ho-document
project: shoshin-no-sono
ho: "08"
kamae: 5
shape: ha
builds-on:
  - kamae/kamae-4-shoshin-no-sono-ho-overview.md
  - design/claude-design/SURFACINGS.md
  - design/claude-design/exports/session-7-ocean-waves/parameters.json
  - src/feature-map.js
  - src/water-map.js
  - src/field.js
---

# ho-08 — Relationship features and the sea

Relationship edges become marks on the map face — roads, trails — and the map gains its sea: a physical datum, a coast, islands, and the Session-7 engraved water. This document was authored mid-ho at the 2026-07-11 banking pass: the ho opened informally from its K4 entry and ran as an intensive practitioner-on-the-plate session (the WIP checkpoint at `4019e40` through the Session-7 lock at `e31e6d9`, 23 commits). Forward-only: the decisions below are recorded as they landed, in order, including the ones that revised earlier locks — the revisions are the record, not an embarrassment.

**Out of scope.** Interaction (ho-09). The verso (ho-08.5, authored, blocked on this ho's close). Any change to the emergence player.

**Still open — this ho does NOT close until:** the succession-carrier decision is made (session 4 parked four candidates: placement pull, the tapered-spur field primitive, roads/trails, rivers — `descends_from`/`succeeded_by` currently render as nothing), and `paired_with` twin peaks get their call (build, or explicitly defer past v1).

---

## Phase 1 — Think

Decisions landed on the live plate, in arc order.

### Decision 1 — Edge semantics: roads = `companion_to` (town ↔ town); trails = `documents` (town → peak) + `validates` (peak ↔ peak).

Roads connect writing to writing and sit flat in the valleys, deduplicated by sorted id pair. Trails are two kinds: the documents climb from a town to the peak it documents (short — the seating algorithm already puts towns at the feet), and the `validates` hiking trails between peaks (the K4 intent the first WIP had dropped), both endpoints pulled back to importance-scaled foot radii. The grammar in one sentence: towns climb to what they document; peaks are connected by the trails of what validated them.

### Decision 2 — The trail mark: session-5's tick-ladder, generalized to a routed rail; the uncased lock revised.

The WIP's dashed switchback died twice (uniform-amplitude zigzags over flat ground are decoration; switchbacks were parked as a field question). The session-5 tick-ladder was implemented as locked — then the corpus-density hachure ground re-opened its legibility: the mark's SHAPE held (rail + perpendicular rungs, single weight), but the dimensions became tuners and the **uncased lock was amended**: trail clearing landed at 1.6 (a cream halo), with 0 preserved on the dial as the original lock. Landed: weight 0.7, tick length 2.2, clearing 1.6.

### Decision 3 — Paths route by least resistance; roads eat trails.

A smooth arc between towns is a network-diagram edge, not a road. Both marks route over the heightfield: chord waypoints relax sideways toward lower ground (slope-direction response saturating at slopeRef — raw-magnitude pushes lost to the smoothing pass) and Chaikin-smooth into drawn curves. Roads hunt low ground harder than trails (follow 0.7 vs 0.35 — trails tolerate grade). Trails draw FIRST and roads paint over them (the casing does the eating), and the trail router repels from road corridors (min separation ~7 px): a trail may run alongside a road, never on it. Road clearing is a dial (1.25).

### Decision 4 — The sea is a datum applied to the field itself: the shore is ZERO.

`applySeaDatum` subtracts sea level (fraction 0.18 of the raw max) from every sample and clamps at zero. The sea is dead flat, so nothing can render in it — no iso crossing, no hachure gradient — without any renderer knowing the sea exists. Elevation labels read feet above the waterline; town seats and routes stand off a 2%-of-max shelf; the field margin padded to 120 so a sea exists. Earlier per-renderer `base` plumbing was superseded by the field-level datum and removed.

### Decision 5 — Coast ruggedness: islands and inlets from a waterline-enveloped noise term.

Island-scale seeded noise whose Gaussian envelope peaks AT the waterline — inlets where it carves below the datum, islets where it pushes above, summits untouched, deep sea clamped. Landed at 0.52. Deterministic from the layout seed: `?seed=` reproduces the archipelago. Every downstream system handled islands unchanged (coastline, waterline wrap, hachure shore fade, seats, route floors).

### Decision 6 — The sea's marks: Session 7 (the design session), implemented from the artifact.

The wave arc went through three failed procedural guesses (S-squiggles, ruled rows, hairline trains) before the correct move: a bounded design session. Session 7's answer — crest lines as offset copies of the coast (on the real map: iso-lines of the distance-from-shore field) carrying feather combs of quadratic hair-strokes toward the next band, two ink classes by stroke length — implemented verbatim (per-band parameter formulas, ink ratios ×1.05/×0.5/×0.42, faint ×0.55). Locked landing: wavelength 42, amplitude 2, band gap 11, comb spacing 1.8, comb length 7, line weight 0.14, ink depth 0.78, randomness 0.3. Waterlining (the survey register) survives as a dial (count 10 landed) for A/B; the artifact + parameters banked at `design/claude-design/exports/session-7-ocean-waves/`.

### Decision 7 — Hachures leave the gentle shore; cliffs keep theirs.

Stroke density fades quadratically toward the waterline (shore fade 0.08) unless the slope clears an absolute cliff threshold (0.22 — deliberately NOT slopeRef, which is a stroke-scaling ceiling landed at 0.05; keying the cliff test to it made every flank a cliff and the fade a no-op).

### Decision 8 — The coastal plain: isos start a clearance above the datum.

The first land contour was doubling the coastline (interval 0.32 vs coast at 0.23). `iso shore gap` landed at 0.04 of max — the lowest ring pulls inland the way a chart's coastal plain reads.

### Decision 9 — Water register cleanups.

The coastline is a continuous cream-cased ink ring (coast-level flood mask fixed the gentle-shore breaks; sub-pixel slivers dropped — they rendered as ink blobs under the weight dial), weight dialable (0.7). Enclosed flat-zero pockets never grow lake outlines (session-2 rule enforced by boundary flood fill).

### Discovery (deferred to this ho's close)

- **Succession carrier** — the open decision (see "Still open" above).
- **Route-over-islet edge case** — routes flee the sea but islets are land; a bay-crossing corridor could seat on one. Not yet observed; decide if it bites.
- **Drowned works under filters** — a filter-sunk peak can slip beneath the waterline at the datum. Beautiful accident or sink-not-vanish violation: the practitioner's call, at close.
- **Session-7 parked items, inherited** — wave phase seam on island loop crests; concave-inlet trimming.
- **Road weight × settlement size** — parked from session 5, still parked.

---

## Phase 2 — Execute

Executed as a live practitioner-on-the-plate session against `:8788`, 2026-07-11 — the by-feel landing discipline at ho scale. Commit trail `4019e40..e31e6d9` on `labs`; every commit green through the full stack. Landed tuner values are the page defaults and greyed as locked (index weight 0.35 also landed this arc). Tests grew 291 → 383.

### Done means (for the eventual close)

- Succession carrier decided and implemented (or explicitly deferred past v1 with the K4 entry updated).
- `paired_with` twin peaks decided likewise.
- The Discovery items above dispositioned.
- Reflect below filled; the four-move close executed.

---

## Phase 3 — Reflect

*Partial — the banking-pass record; final Reflect at close. Prompts for the remainder: which succession carrier, and why; did the sea's parked items bite; what did ho-09's authoring inherit from the feature grammar?*

**Landing to date (2026-07-11).** The feature grammar reads: roads between writings, trails up to documented peaks and between validating peaks, all terrain-routed. The map gained a sea with a physical datum — the single strongest structural decision of the arc: one field-level clamp made every "nothing renders in the sea" rule a law of physics instead of a renderer convention. Session 7 proved the design-process note's own thesis at speed: three procedural guesses failed where one bounded design session landed the register in an evening. Two locks were revised on corpus ground (trail casing, trail dimensions) — recorded in SURFACINGS as amendments, not silently.

### Closing this ho

Closing = fill this Reflect + flip `status: complete` + write the state-summary block to the project's K6 (`ho-process/kamae-6-shoshin-no-sono-state-memory.md`) + append a build-record entry to K4 (`kamae/kamae-4-shoshin-no-sono-ho-overview.md`). The block, verbatim labels and order:

**STATE-SUMMARY**
- **COMPLETED** — <what this ho finished>
- **NEXT** — <the single pointer to what comes next>
- **ACTION ITEMS / BLOCKS** — <open items; blocks loudly, or `none`>
- **PROJECT LIFECYCLE** — <kamae | dev | beta | production>

---

_Authored: 2026-07-11 at the banking pass, mid-ho (the ho opened informally from the K4 entry)._
_Execution: feature + sea arc landed 2026-07-11; succession carrier and twin peaks remain before close._
