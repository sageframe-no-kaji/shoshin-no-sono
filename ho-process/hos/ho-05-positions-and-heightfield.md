---
created: 2026-06-13
status: complete
type: ho-document
project: shoshin-no-sono
ho: "05"
kamae: 5
shape: ha
builds-on:
  - kamae/kamae-2-shoshin-no-sono-system-design.md
  - kamae/kamae-4-shoshin-no-sono-ho-overview.md
  - ho-process/hos/ho-02-the-indexer.md
  - ho-process/hos/ho-03-grid-and-garden-gate.md
  - design/visual-register.html
  - design/claude-design/territory-spike.html
  - design/claude-design/SURFACINGS.md
---

# ho-05 — Position computer and heightfield

The Cartographer's first two pipeline stages, ported from the eye-blessed `design/claude-design/territory-spike.html` into tested no-build ESM behind the component boundary. A **position computer** scatters the peaks across the map — seeded, so `?seed=` reproduces a layout and a fresh load produces a novel one. A **heightfield generator** sums per-peak radial functions into a 2D grid of elevations, amplitude driven by `importance × filter_relevance`. The output is verified through a transient **debug heat map** — not the final cartography, just enough to confirm positions and elevations behave across filter states. Contour extraction is ho-06; towns are ho-07.

This is a recreation, not a copy. The spike hard-codes three peak positions and hand-authors each peak's shape; ho-05 derives positions from a seeded force relaxation over the real corpus and derives every per-peak shape parameter from the data plus the seed. The validated spike is the *reference algorithm* for the field math — the silhouette character it produced is the target — but the code lands clean in `src/`, queries the Indexer, reads state from the Gate, and never touches raw JSON or the URL.

**Out of scope:** Contour extraction by marching squares (ho-06 — the heat map is the only renderer here, and it dies in ho-06). Town placement and the chronological populate (ho-07). Relationship features (ho-08). Interaction (ho-09). A UI affordance for sharing or locking a seed (deferred in the overview; ho-05 reads `?seed` but builds no button to write it). Wave-interference field variant (kept as the named fallback, not built unless the Gaussian family fails the silhouette check).

**Resolves deferred decisions** (from the ho-overview's ho-05 entry):
- **Position assignment strategy** — pure procedural per render (confirmed), with seeded reproducibility. Anchored-procedural stays unbuilt; not needed.
- **Heightfield function family** — the spike's Gaussian family, confirmed by the territory spike and re-checked against the frozen session-1 peak at execution.
- **Peaks vs towns convention** — documented here before the Cartographer makes the call silently (Decision 5).

---

## Phase 1 — Think

### Decision 1 — Position computer: hand-rolled seeded force relaxation, not d3-force.

The peaks need an organic scatter — not a grid, not overlapping — and the same seed must always reproduce the same scatter so a shared `?seed=` URL reproduces the map. d3-force solves the scatter (each peak a charge repelling the others until they settle) but fails this project on two counts: it is not self-contained (runtime CDN import or a vendored module tree — d3-force pulls d3-quadtree, d3-dispatch, d3-timer), and its internal jitter uses `Math.random`, so it cannot be pinned to a seed without monkeypatching. Reproducibility is a hard requirement, self-containment is the project's one rule, and the corpus is ~19 peaks where the quadtree optimization d3-force exists to provide buys nothing.

So: hand-roll it — a small velocity-relaxation loop (seeded initial placement via `mulberry32`, pairwise repulsion + a gentle pull toward center, fixed iteration count, then stop) producing deterministic positions from `(peaks, seed)`. This matches the spike's established pattern: it already hand-rolls the seeded RNG, the value noise, and the SAT collision test. Roughly 60 lines, fully testable, exact seed control.

**Overview deviation, flagged not edited (forward-only):** the ho-overview names "d3-force" for this stage. That was shorthand for *force-directed peak placement*; the intent is met without the library. The overview's ho-05 entry should note the library was dropped for self-containment + seedability — a downstream overview refresh, not an in-place edit, and not this document's job to make.

### Decision 2 — Filter relevance: one terrain, non-matches sink (graded).

Amplitude is `importance × filter_relevance`, where `filter_relevance` is `1` for a work matching the active filter and floors at a tunable `~0.15` for a non-matching work. **Positions are computed once per seed over all peaks and are filter-independent** — a filter change does not move mountains, it changes their *heights*: matching peaks stand full, non-matching peaks sink toward foothills. The territory stays put; the elevation breathes. Refresh (new seed) → new positions; filter change → same positions, re-weighted field. (This also leaves the door open for the deferred morph-between-filters animation, since positions are stable across filter states — but that stays out of scope.)

This is the practitioner's call over the "each filter is its own Venice / recompute positions over the matching set" alternative. The Calvino discipline still holds at the level of *what stands tall*; the sunk works remain as terrain texture rather than vanishing.

`filter_relevance` reuses the same match rule the grid already enforces (multiplicative across categories, additive within) — see Decision 6's `src/filter.js` extract so the rule cannot drift between grid and cartography.

### Decision 3 — Field family: the spike's Gaussian family.

Each peak contributes `amplitude × exp(−(d/rEff)^1.7)` — a sharper-than-Gaussian profile that avoids the flat-top a pure Gaussian produces at the summit (the session-1 finding). `d` is distance in the peak's local frame after rotation and un-squashing by ellipticity; `rEff` is the peak radius modulated by low-order angular harmonics (`k = 2–5`) so contours read as non-circular — the silhouette character. On top of the summed peaks, 2-octave value noise weighted by `(1 − summitProximity)` adds low-elevation crenellation that decays toward summits (the crenellation-decays-with-elevation rule). This is exactly the territory spike's `heightAt`, recreated with tests.

**Deferred discovery (execution-time):** does this Gaussian family reproduce the *frozen session-1 peak's* silhouette character, or does it need the wave-interference (Resonance Field) variant? The spike says the family is close; the confirmation is by eye on the debug heat map against the frozen peak. If it fails, wave-interference is the fallback and gets its own follow-up — not a silent swap.

### Decision 4 — Per-peak shape parameters are derived, never hand-authored.

The spike hand-authored each peak's `r`, `ell`, `rot`, harmonic seed, `amp`. Here every per-peak parameter falls out of data + seed: `amplitude` from `importance × filter_relevance`; radius scales with `importance` (bigger works are broader massifs); ellipticity, rotation, and harmonic phases are drawn from a per-peak RNG seeded by `hash(workId, seed)` so a given work in a given layout is stable but varies between layouts and between works. Silhouettes are never authored per peak — they fall out of the field, per the register's field-vs-renderer rule.

**Deferred discovery (execution-time):** whether radius-scales-with-importance reads right, or wants a gentler curve — a tuner, checked against the frozen peak.

### Decision 5 — Peaks vs towns: work-versus-commentary, operationalized as `group`.

A work's cartographic role is its nature as work-versus-commentary, not its `media` array (the overview's deferred convention). Operationally: a work is a **town** if its `group === 'writing'` (the six essays — the writings-about-works), and a **peak** otherwise. This keeps Pink Teaming a peak though its media is `website+writing`, and keeps *The Same Lever* a town though it declares no `documents` edge (so a documents-edge test would misclassify it — `group` is the correct discriminator). The corpus splits **19 peaks / 6 towns** today.

This rule lives in the **Cartographer**, not the Indexer — `CLAUDE.md` and ho-02 are explicit that the Indexer does not encode cartographic role. ho-05 consumes only peaks; towns wait for ho-07.

### Decision 6 — Module layout and the component boundary.

Flat `src/`, matching the existing layout (`indexer.js`, `gate.js`, `grid.js`, `main.js`):

- **`src/field.js`** — pure math, no DOM, no Indexer, no Gate. `computePositions(peaks, seed, opts)` (the seeded force relaxation), `buildHeightfield(positionedPeaks, opts)` → `{ field, cols, rows, cell, max }`, and `heightAt(x, y, positionedPeaks, noise, opts)`. Takes plain peak objects (`{ id, x?, y?, importance, relevance }`) so it is testable from fixtures with zero project dependencies. All tuners live in `opts`.
- **`src/cartographer.js`** — the component. Queries the Indexer for works, applies the peak/town rule (Decision 5), reads `seed` + filter state from the Gate, computes each peak's `filter_relevance` (Decision 2), calls `field.js`, and hands the grid to the renderer. Touches neither the URL nor raw JSON.
- **`src/filter.js`** — small extract: `matchesFilter(work, state)`, the multiplicative/additive rule currently inline in `grid.js`'s `filterWorks`. `grid.js` is refactored to call it; the cartographer calls it for relevance. One rule, two consumers, no drift. Grid tests stay green.
- **debug heat-map renderer** — isolated (`src/heatmap.js`), marked transient: ho-06 replaces it with the contour renderer. Maps elevation → a warm-gray ramp on cream, rendered as SVG rects (or a single image) over the grid.
- **`cartography.html`** — standalone debug page served at `:8788`. Boots Indexer + Gate + Cartographer, renders the heat map, carries a reseed control, shows the active seed, and honors `?seed=` and the existing filter params. This page persists and grows into the real cartography surface through ho-09; only its renderer is transient. `index.html` (the grid) is untouched.

### Decision 7 — Seed plumbing through the Garden Gate.

The Gate is the only component that touches the URL, and it already reserves `seed` as a known-future key. ho-05 activates it: `parseState` reads `?seed=` into a number (or `null`), `serializeState` appends it when present. The Cartographer reads `seed` from `gate.currentState()`; if `null`, it generates an **ephemeral** seed (not written to the URL), so a plain refresh produces a novel layout. A URL with `?seed=N` reproduces the layout exactly. No affordance writes the seed back to the URL — exposing/locking the seed is the overview's deferred polish decision. The reseed control on the debug page regenerates an ephemeral seed and displays it.

### Decision 8 — Tuners exposed, not silently committed.

Per the design-parameters-want-tuners discipline, `field.js`'s `opts` exposes: grid `cell` size (spike default 4), noise weight (0.85), summit exponent (1.7), radius-scaling factor, and the `filter_relevance` floor (0.15). These are provisional values carried from the spike, surfaced as parameters so they can be tuned by feel against the visual register rather than buried as magic numbers. ho-06/07 inherit the same posture.

### Discovery (deferred to execution)

- **Silhouette confirmation** — does the Gaussian family reproduce the frozen session-1 peak's character on the debug heat map? (Decision 3.)
- **Radius-scaling curve** — does importance→radius read right, or want a gentler mapping? (Decision 4.)
- **Relevance floor** — is `0.15` the right sink depth, or do non-matches need to read more (or less) present? (Decision 2/8.)

All three are eyeball checks on `cartography.html`, logged into Reflect, not blockers for landing the code.

---

## Phase 2 — Execute

One bounded agent conversation (no decomposition into agent-task files — the pipeline is tightly coupled and the spike is the reference, so implementation risk is low). Executed by the implementing model (Opus 4.8) in this session.

**Sequence:**
1. `src/field.js` + `tests/field.test.js` — positions (deterministic from seed, no overlap, in-bounds, novel across seeds) and heightfield (amplitude tracks `importance × relevance`, summit profile, noise attenuates with elevation, grid dimensions). Tested from fixtures, no project deps.
2. `src/filter.js` extract + `grid.js` refactor — `matchesFilter` lifted out; `filterWorks` calls it; grid tests green; a small `tests/filter.test.js` for the predicate directly.
3. `src/cartographer.js` + `tests/cartographer.test.js` — peak/town rule, relevance computation, seed resolution, wiring to `field.js`, against a fixture Indexer.
4. `src/gate.js` seed plumbing + gate tests — `?seed` round-trips; unknown/garbage seed degrades to `null`.
5. `src/heatmap.js` — transient renderer (light test: produces SVG, covers the elevation ramp).
6. `cartography.html` + `src/main` wiring for the debug page (DOM glue, coverage-excluded like `main.js`).
7. Full stack green → commit.

### Testing and iteration approach

Per-piece unit tests at each step (the field math is the heavy surface — determinism, bounds, amplitude, attenuation). Then the real-data loop: serve `:8788`, open `cartography.html`, eyeball the heat map against the frozen peak and across filter states (`?theme=craft`, etc.), reseed for novelty, test `?seed=N` reproducibility. Silhouette / radius / floor findings (the deferred discoveries) get tuned via `field.js` `opts` and logged into Reflect; a field-shape fix propagates to `field.js`, a relevance-feel fix to the cartographer's relevance computation.

### Done means

- `cartography.html` at the locally served page renders the heightfield as a heat map over the real corpus.
- Filter changes produce visibly different heightfields — matching peaks stand, non-matching sink (e.g. `?theme=craft` re-weights the terrain live).
- Refresh produces novel positions (random seed by default).
- A URL with `?seed=N` produces a reproducible layout (same N → same map).
- Positions are stable across filter changes within one seed (only heights change).
- The Gaussian-family silhouette reads as topographic against the frozen session-1 peak — or the wave-interference fallback is logged as needed (Reflect).
- `npm test` (≥90% coverage on `field.js`, `filter.js`, `cartographer.js`, gate seed paths), `npm run lint`, `npm run typecheck` all green. The transient `heatmap.js` and the `cartography.html` DOM glue are the only light-coverage seams, by design.

---

## Phase 3 — Reflect

**Positions: the force sim was wrong; best-candidate is right.** Decision 1 chose hand-rolled over d3-force, and that held — but the *first* hand-rolled algorithm (Fruchterman-Reingold-style repulsion + center gravity, cooled) pinned every peak to the boundary box. Repulsion shoved peaks outward, the bound-clamp parked them on the walls, and gravity couldn't pull them back from the margin — so 19 peaks formed a rectangle around the perimeter and the heat-map summits sat at the edges. Replaced mid-execution with **best-candidate sampling** (Mitchell): throw `candidates` darts per peak, keep the one farthest from already-placed peaks. Blue-noise-like interior spread, no edge pinning — 1 of 19 near the margin (was all 19), min spacing ~108px on the real corpus. The decision to hand-roll was sound; the algorithm choice inside it was the real surfacing. `opts` lost `iterations`/`spread`/`gravity`, gained `candidates` (default 12).

**The Gaussian family ported cleanly and behaves on the real corpus.** 19 peaks (towns excluded), heights track `importance`, the filter re-weights the field (max 14.06 open → 9.98 under `theme=craft`), positions stay fixed across filter changes, `?seed=N` reproduces. The silhouette verdict against the frozen session-1 peak is **deferred to ho-06**, on purpose: a heat map can't settle whether the contour *spacing* reads as faces/shoulders — that's a contour question. The spike already says the family is close; ho-06 confirms it on real iso-lines. Wave-interference remains the unbuilt fallback.

**Filter feel: "one terrain, non-matches sink" reads as intended** on the heat map — matching massifs stand, non-matching sink toward foothills at the `0.15` floor, the territory stays put. No pull toward the each-Venice-recompute alternative.

**Boundary held.** The field/cartographer/filter split is clean: `field.js` is pure math (no Indexer, no Gate), `cartographer.js` is the only place the peak/town rule and relevance live, and `matchesFilter` extracted from `grid.js` with the grid suite staying green — one filter rule, two consumers. The Gate's seed channel sits beside the filter grammar without disturbing it (ho-03's exact-shape tests untouched).

**What broke that the tests didn't catch.** Both ho-05 defects were "looks-right" properties unit tests structurally can't assert: (1) the perimeter pinning — the bounds test and the min-pairwise-distance test both *passed* on a boundary ring (points on the perimeter are in-bounds and well-separated), so the suite was blind to the clumping; (2) the cream→ink heat map washing into the page background (the test checked that rects were emitted, not that they were visible). The headless-Chrome screenshot loop caught both. Lesson for the cartography hos: pair the unit suite with a rendered-image check — geometry correctness and visual legibility are different bars, and only the second catches "blank."

**Tuner landings.** Everything carried from the spike/defaults unchanged — `cell` 4, `summitExp` 1.7, `noiseWeight` 0.85, `radiusBase` 40 / `radiusScale` 16, `relevanceFloor` 0.15, `candidates` 12. None were tuned by feel yet because the surface to tune against is contours, not a heat map; the real tuning pass lands in ho-06 (per the design-parameters-want-tuners discipline). The heat-map ramp/bands are debug-only and not register commitments.

**Followups.**
- **ho-06 (contours):** extract iso-lines over this exact heightfield; settle the silhouette verdict against the frozen peak; do the by-feel tuning pass on the field `opts` with the register visible.
- **ho-07 (towns):** place the 6 `writing`-group towns on this terrain (place-then-deform); the weight→density mapping; reuse the seeded growth posture.
- **ho-08 (relationship features):** needs the still-open ho-04 design sessions (ridge, road+trail, cartouche) finished first.
- **Overview refresh (flag, not edit):** the ho-overview's ho-05 entry says "Position assignment uses d3-force." That's now inaccurate — hand-rolled best-candidate, dropped d3-force for self-containment + seedability. The overview is a living document but its revision is `ho-kamae-4-overview-collaborator`'s territory; flagged for the practitioner.

---

_Authored: 2026-06-13 (Think phase). Executed and closed: 2026-06-13._
_Surfacing: hand-rolled positions started as a force sim (perimeter-pinning), landed on best-candidate sampling. Silhouette verdict carried to ho-06._
</content>
</invoke>
