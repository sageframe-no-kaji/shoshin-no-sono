---
created: 2026-06-13
status: complete
type: ho-document
project: shoshin-no-sono
ho: "07"
kamae: 5
shape: ha
builds-on:
  - kamae/kamae-2-shoshin-no-sono-system-design.md
  - kamae/kamae-4-shoshin-no-sono-ho-overview.md
  - ho-process/hos/ho-06-contour-extraction.md
  - ho-process/hos/ho-06.5-tuner-landing.md
  - design/visual-register.html
  - design/claude-design/territory-spike.html
  - design/claude-design/SURFACINGS.md
  - src/field.js
  - src/contours.js
  - src/cartographer.js
  - src/indexer.js
---

# ho-07 — Town placement and towns-on-terrain

The settlements arrive. Six `writing`-group works become towns on the locked ho-06.5 terrain — each seated by the peaks it documents, sized by its `documents`-edge weight, grown in the frozen session-2 morphology (loose hamlet → walked village → corridored town → cathedral-close city), then *warped to the slope it lands on* so it sits on the territory rather than floating over it. Contours wrap the settlements: the town reads as part of the map, not a sticker on it. This is the place-then-deform thesis the design sessions promoted to ho-07 — the peak and the settlement revealed as the same kind of object, a seeded radial growth process with a raveling edge, character from process not styling.

The territory spike (`design/claude-design/territory-spike.html`) is the eye-blessed reference algorithm. Its `settle()` grows the four sizes; its `scene()` places towns on the field with measured-extent label offsets. ho-07 reimplements `settle()` cleanly in `src/` with tests, behind the component boundary (pure block geometry in, SVG out), and adds what the spike never did: real placement from data (barycentric, weighted) and the deform (the spike places towns as a flat translated layer; ho-07 warps them to the heightfield).

**Out of scope:**
- **The chronological populate animation — ho-07.2.** This ho renders the static, fully-populated map. The sequential fade-in (towns arriving in emergence order) splits out to ho-07.2, where the practitioner supplies the authoritative order (the works.json `publication_date` values are not trustworthy — see Discovery). Splitting was the practitioner's call: the static placement plus the mixed deform is a full session, and the animation is a clean second seam (the overview's anticipated ho-07.1/ho-07.2 split, taken as an insertion that keeps ho-07's number).
- **Relationship features (ho-08)** — ridges, roads, trails, twin peaks. Towns render; the roads *between* towns and to their documented peaks are ho-08.
- **Interaction (ho-09)** — hover, click, cards. Filter changes re-render fully here (as ho-06 does), not as a transition.
- **Editing the catalog data.** the-same-lever's thin connectivity is a surfacing for an authoring ho, not a data edit in this session (forward-only — see the connectivity note below).
- **Heightfield cutout under towns** — flattening the terrain so contours genuinely route around a cleared footprint. ho-07 achieves towns-on-terrain by render order (Decision 5); a true field cutout is a named deferred refinement, taken only if occlusion reads wrong.

**Resolves deferred decisions** (from the ho-overview's ho-07 entry):
- **Weight → density mapping** (the ho-02-flagged settlement-weight tuner) — the curve family and size thresholds, dialed by feel against the register (Decision 3).
- **Place-then-deform** — does the town warp to its slope cleanly, sharing growth/warp machinery with the peak field (Decisions 4, 5)?
- **Barycentric town positions** weighted by `documents` strengths, biased to strength-3 anchors (Decision 2).
- **Towns-on-terrain** — contours wrapping settlements, the place-then-deform consequence the register deferred from ho-04 (Decision 5).

---

## Phase 1 — Think

### Decision 1 — Module layout: pure growth geometry and register render, split; the Cartographer orchestrates.

Two new modules, parallel to ho-06's `contours.js`/`contour-map.js` split:

- **`src/settlements.js`** — pure growth geometry, no SVG styling, no DOM. The spike's `settle()` recreated faithfully: `growSettlement(level, seed, opts)` → `{ blocks, extent }`, where a block is `{ x, y, w, h, a, terra }` in settlement-local coordinates (origin-centered, like the spike) and `extent` is the measured max corner radius for clean label offset. The four growth primitives port directly — `loose` (hamlet scatter), `walk`+`line` (corridor growth with SAT collision against a shrink-inset), `ravel` (edge fringe), and the cathedral close at level 3 (elongated terracotta landmark, enclosed forecourt + apse plazas, parallel flanking rows, organic outskirts, whole close rotated to a per-seed axis). Plus the place-then-deform warp (Decision 4) as a pure transform: `deform(blocks, heightfield, seat)` → warped blocks. Testable from hand-built fixtures with zero project dependencies.
- **`src/settlement-map.js`** — the register-honoring SVG render, pure (blocks in, SVG string out, no DOM). One `<rect>` per block: fill ink `#2B2B2B` (or terracotta `#9A5B3C` for the city's one landmark), paper-stroke `#FDFCF9` at `0.4` (the party-wall separator). Register values exposed as `opts` for testability, not tuners (the ho-06 Decision 4 posture).

The **Cartographer** (`src/cartographer.js`) orchestrates — it already owns cartographic role (`isPeak`, `TOWN_GROUP`) and render, and it holds the heightfield. It gains a `computeTowns` stage (or `computeField` extends to return `{ peaks, heightfield, towns, seed }`): query the Indexer for the `writing` group, read each town's `settlementWeight`, derive the seat from the peak positions it already computed (Decision 2), pick the size band from the weight (Decision 3), grow the settlement, and warp it to the heightfield (Decision 4). The **Indexer is untouched** — it already exposes `settlementWeight`; cartographic role and size mapping stay out of it (CLAUDE.md boundary: the Indexer does not encode cartographic role). `computeTowns` is seed-deterministic like the rest of the field, so `?seed=N` reproduces the towns too.

### Decision 2 — Town seat: documents-barycenter blended toward the field centroid, by total strength.

A town's seat is the strength-weighted centroid of the peaks it documents — but blended toward the field centroid by how much `documents` strength it carries, so weakly-anchored towns drift central and well-anchored towns sit at their peak's foot. The general rule (robust for the under-connected education pieces still to come, not a one-off for the-same-lever):

```
barycenter = Σ(strengthᵢ^p · peakPosᵢ) / Σ(strengthᵢ^p)      over documents edges
anchorWeight = clamp(Σ strengthᵢ / strengthFull, 0, 1)        how "anchored" the town is
seat        = lerp(fieldCentroid, barycenter, anchorWeight)
```

- **`p` (anchor bias)** raises strength to a power so strength-3 targets dominate. three-hours documents hozo@3 + ho-system@2; at `p=1` the barycenter sits 0.6 toward Hōzō ("leaning Hōzō"), at `p≈2` it sits ~0.69 toward Hōzō ("at the foot of Hōzō"). `p` is a by-feel tuner.
- **`strengthFull`** is the strength sum at which a town is fully anchored to its barycenter (no centroid pull). A tuner — set so the well-documented towns (three-hours, falcon-cameras at Σ=5) read as fully seated at their peaks and the thin ones drift central.
- **the-same-lever** (no `documents` edges, Σ=0) → `anchorWeight=0` → pure field centroid, the "central trading-hub" the overview names. Its one `argues_for → glassroom` edge enters as a low-weight secondary nudge toward Glassroom (a small fixed pull, so it reads as central-but-leaning-Glassroom rather than dead-center). This is the practitioner's hybrid call.
- **"At the foot of," not "on the summit."** The barycenter can land on a peak's flank. The seat is pulled to local low ground — within a small search radius, prefer the lower-gradient, lower-elevation spot — so the town sits at the foot, off the steep face. This couples to the deform (Decision 4, avoid steep faces).

### Decision 3 — Size mapping is thresholds, dialed by feel (the ho-02 settlement-weight tuner).

The six `settlementWeight` values cluster: the-same-lever **0**, the-empty-container & the-fourth-boundary **1.386**, judgment-at-scale **1.609**, falcon-cameras & three-hours **1.792**. Five of six sit in a tight 1.39–1.79 band, so the *thresholds* — not the curve — are the whole mapping. This is exactly the ho-02 finding (the log base is immaterial; the curve family and thresholds are the real tuners) and it gets the ho-06.5 treatment: live controls, dialed against the register, landed values recorded.

- **Band selection** sets the *style*: hamlet (loose) → village (one lane) → town (corridors) → city (cathedral close). Three thresholds `t₁ < t₂ < t₃` over the weight, surfaced as tuners. Weight 0 floors to hamlet.
- **Within-band extent** scales with weight: the band sets the morphology, the weight nudges the count/extent inside it (the "density scales with weight" SURFACING). For six clustered towns this is a fine adjustment, not the main signal — but it is the principled mapping, so it is built and exposed, not faked.
- Whether any town reaches **city** is a by-feel call. The spike's city was representative, not a data fact. With three-hours and falcon-cameras tied at the top (1.792), a low `t₃` makes two cathedral-close cities — possibly one too many for the map to breathe. The threshold is dialed so the assembled six read as a legible size progression, not so a target work is forced to a size.

### Decision 4 — Place-then-deform: affine base plus a bounded per-block contour-follow, the blend a tuner.

The town is grown in the abstract (Decision 1, origin-centered) then warped at its seat to the heightfield. The practitioner's call was to *mix* the two depths — affordable because the populate split out, giving the static deform the full session:

1. **Affine base.** Sample the heightfield gradient at the seat. The local contour direction is perpendicular to the gradient; rotate the settlement's growth axis to it, and elongate the footprint along it proportional to the slope anisotropy (steeper cross-slope → more elongation along the valley). This delivers "footprint elongating along the valley" and "corridors bending to contours" as a cheap, deterministic affine (rotate + anisotropic scale) — no per-block field sampling.
2. **Per-block contour-follow nudge.** On top of the affine, displace each block a bounded amount along the local gradient so corridors bend *with* the rings rather than running straight. Intensity is a by-feel tuner — pure-affine at zero, strong contour-follow at the high end — dialed against the register so the bend reads as terrain response, not noise. Bounded so blocks stay coherent (the SAT non-overlap from growth is preserved; the warp is small relative to the party-wall gap, or re-checked after warp).
3. **Avoid steep faces.** Couples to the seat search (Decision 2): the town seeks the foot, and the deform keeps it reading as resting on the slope rather than climbing it.

The full, unbounded per-block warp (corridors literally tracing curved rings) stays a named refinement if the mix reads wrong — but the mix is the commitment.

### Decision 5 — Towns-on-terrain by render order; contours wrap by occlusion.

The contour map renders first (ho-06, the cream rect + ink paths); the towns paint over it. The settlement blocks are filled ink rects with a paper-stroke separator, so they occlude the contour lines beneath their footprints — the contours visibly stop at the building edges and resume beyond, which *is* "contours wrap the settlement" at the render level. Combined with the deform (the town oriented and warped to the slope), the settlement reads as sitting on the territory, not as a layer floating over it. The render order is: paper → contours → towns → labels.

A true **heightfield cutout** — clearing/flattening the field under the footprint so the extraction itself routes contours around the town — is the richer version and a named deferred refinement (out of scope above). It is taken only if the occlusion reads as a hole punched in the map rather than a town on it.

### Decision 6 — Filter behavior: towns recede, they don't vanish.

Positions are seed-only and filter-independent (the ho-05/06 invariant) — the peaks a town is seated against don't move under a filter, so the town doesn't reposition either. What changes under a filter is **recession**: a town whose writing doesn't match the active filter dims (reduced opacity), consistent with how non-matching peaks sink to low hills rather than disappearing (the ho-06.5 floor philosophy — a filtered map stays a map). A matching town renders at full ink. Filter change triggers a full re-render (ho-06's behavior), towns included. Richer town-filter interaction (a town fading entirely, or its label behavior) is ho-09 territory; ho-07 does the minimal recede.

### Decision 7 — Tuners exposed, not silently committed (carried posture).

The `design-parameters-want-tuners` discipline holds (ho-06.5 territory). ho-07's by-feel pass surfaces, as live controls on `cartography.html`, the parameters that change the *feel* of the settlements on the terrain — and lands them against the register, recording where they settled:

- `anchorBias` (`p`) and `strengthFull` — the seat blend (Decision 2)
- `t₁ / t₂ / t₃` — the size-band thresholds (Decision 3)
- `extentScale` — within-band count/extent from weight (Decision 3)
- `contourFollow` — the affine↔per-block deform blend (Decision 4)
- the seat downslope-search radius (Decision 2), if it wants dialing

The frozen session-2 grammar dials (`unit`, `pack`, `curve`, `corridors`, `ravel`) and the register (ink, terracotta, paper-stroke, single terracotta per city) are commitments reproduced from the spike, not tuners — exposed as `opts` only for testability.

### Decision 8 — Carried project posture.

No-build vanilla ESM (the new modules are source *and* artifact); JSDoc + `tsc --checkJs` strict (annotate new code; any `@type {any}` cast gets a comment); vitest ≥90% on `settlements.js` and `settlement-map.js`; pre-commit runs validate / lint / test / typecheck. The `settle()` port reproduces the blessed spike morphology faithfully (including the cathedral close), for the same reason ho-06 reproduced the blessed contour renderer: the register was blessed against that algorithm.

### Discovery (deferred to execution)

- **Tuner landings** (Decision 7) — where `anchorBias`, `strengthFull`, the three size thresholds, `extentScale`, and `contourFollow` settle on the real six towns over the locked ho-06.5 terrain. Recorded in Reflect; landed values written back as defaults.
- **Does the mixed deform read as "on the terrain"** (Decision 4) — the affine base plus per-block follow, judged by eye against the register. Does the town bend with the contours without losing coherence?
- **Cathedral close at real extent over contours** — does the level-3 close (forecourt, apse, parallel flanks) fit and read when warped to a real seat with contours wrapping it, or does the close want simplifying at map scale?
- **the-same-lever's central seat** (Decision 2) — does the centroid-biased-toward-Glassroom seat read as a central trading hub, or as awkwardly stranded between peaks?
- **the-same-lever connectivity (surfacing, not this ho's work).** the-same-lever is a manifesto — kin to pink-teaming, which is also a manifesto — and should carry a relationship to it (`paired_with`/`companion_to`), matching them in language and intent. More broadly it argues for AI as a lever / force-multiplier and reads as under-connected; more education pieces are coming. This is catalog-data authoring (an authoring ho or the Founder), not a ho-07 edit (forward-only). It bears on Decision 2: the centroid fallback is the **interim** seat, correct while the-same-lever has no `documents` anchor — once it gains a pink-teaming edge, the blended-barycenter rule self-corrects and pulls the seat toward that anchor with no code change. The hybrid rule is built for exactly this incoming connectivity.
- **Towns-on-terrain occlusion** (Decision 5) — do the towns read as resting on the map, or as holes punched through the contours (which would argue for the deferred heightfield cutout)?
- **Emergence order for ho-07.2** — the works.json `publication_date` is not trustworthy (`created == publication_date` for all six; the practitioner reads the real order from when the pieces emerged in his writing, started-vs-completed). The authoritative order and its anchor (started vs completed) are collected when ho-07.2 is authored, next to the animation that consumes them. Not needed for the static map.

---

## Phase 2 — Execute

One bounded agent conversation — no decomposition into agent-task files, matching ho-05 and ho-06. The settlement pipeline is tightly coupled (grow, place, deform, render, wire) and the spike is the reference; implementation risk is low. Executed by the implementing model (Opus 4.8) in this session.

**Sequence:**
1. `src/settlements.js` + `tests/settlements.test.js` — port `growSettlement` (the four sizes: loose / walk+line / corridors / cathedral close), the SAT collision and shrink-inset, the measured `extent`. Then the placement helpers as pure functions: `townSeat(townEdges, peakPositions, fieldCentroid, opts)` (the blended barycenter, Decision 2) and `sizeBand(weight, thresholds)` (Decision 3). Then `deform(blocks, heightfield, seat, opts)` (affine + bounded per-block follow, Decision 4). Tested on hand-built fixtures: a known edge set yields a known seat; a flat field leaves blocks un-warped; a sloped fixture rotates the axis to the contour; weight thresholds select the expected band; growth is seed-deterministic.
2. `src/settlement-map.js` + `tests/settlement-map.test.js` — blocks → SVG: one `<rect>` per block, ink fill, paper-stroke, terracotta only on the city landmark; an empty block list yields nothing; `opts` overrides honored.
3. `src/cartographer.js` — add the `computeTowns` stage (query the `writing` group, read `settlementWeight`, seat from the already-computed peak positions, band, grow, deform). Extend the return to carry `towns`. Tests: seed-deterministic towns; filter recession (non-matching town flagged/dimmed, Decision 6); the-same-lever lands central.
4. `cartography.html` + `src/cartography-page.js` — render the settlement layer over the contour map (render order paper → contours → towns → labels, Decision 5); add the town-label render (typography variant B, settlement spec — 11.5px / 0.22em caps, offset below the measured extent); add the ho-07 tuner controls (Decision 7) alongside the ho-06 ones; keep reseed, seed readout, theme chips. DOM glue, coverage-excluded.
5. Full stack green → the real-data loop on `:8788`: screenshot the towns on the locked terrain against the register (the four sizes legible, terracotta once, contours wrapping), dial the tuners by feel (seat blend, size thresholds, deform follow), check `?theme=craft` recession and deep filters, reseed for novelty, confirm `?seed=N` reproduces towns and terrain together. Land the tuners as defaults, record the landings and the silhouette/occlusion reads in Reflect → commit.

### Testing and iteration approach

Per-piece unit tests at each step. The geometry is **structurally** testable like marching squares was: a known edge set has a known barycenter; a known weight selects a known band; a flat field warps nothing; a constant-gradient field rotates the axis a known amount. That carries correctness. The other half — does the town read as resting on the terrain, does the cathedral close fit at map scale, does the-same-lever's central seat read right — is image-property, carried by the headless-screenshot loop against the register, exactly as ho-06 paired the unit suite with the silhouette verdict. A seat-feel fix propagates to the seat tuners; a size-read fix to the thresholds; a deform-feel fix to `contourFollow`; a growth-morphology issue back to `settlements.js`.

### Done means

- `cartography.html` at `:8788` renders six towns on the locked ho-06.5 terrain, register-faithful: ink blocks with paper-stroke separators, terracotta spent once (on the city, if a city lands), the four sizes rankable, town labels in variant B below the measured extent.
- Towns are seated from data: three-hours at the foot of Hōzō, the-empty-container at the foot of Glassroom, the-same-lever central (leaning Glassroom). Seats are the blended barycenter (Decision 2).
- Settlement size reads from `settlementWeight` through the dialed thresholds (Decision 3); the size progression reads as deliberate, not flat.
- Towns are warped to the slope (Decision 4) — oriented along the contour, elongated along the valley, corridors bending with the rings — and read as on the terrain, with contours wrapping the footprints (Decision 5).
- Filter changes re-render; non-matching towns recede (dim) rather than vanish (Decision 6); positions stay fixed across filter and tuner changes within a seed.
- Refresh produces novel towns-and-terrain together; `?seed=N` reproduces both exactly.
- The live tuner controls re-render on input; landed values written back as defaults and logged in Reflect.
- `npm test` (≥90% on `settlements.js`, `settlement-map.js`), `npm run lint`, `npm run typecheck`, `npm run validate` all green. The `cartography.html` DOM glue is the only light-coverage seam, by design.

---

## Phase 3 — Reflect

The towns build and render on the locked ho-06.5 terrain — `settlements.js` (growth + seat + band + deform), `settlement-map.js` (register render), the Cartographer's `computeTowns` stage, and the page's settlement layer + variant-B labels + ho-07 tuner panel. Full stack green: 168 tests, 99% statements / 95.6% branches (settlements.js 98.2% / 92%, well over the 90% floor), lint, typecheck, validate. A full pipeline render against the real 25-work corpus at seed 12345 produced 29 contour paths, 142 building rects across the six towns, six labels, two terracotta city landmarks, and zero NaN — towns sit on the terrain with contours wrapping them.

**The split held and was the right call.** The static placement plus the seat-tuner work filled the session; the populate animation (ho-07.2) is a clean separate seam. Decision 4's mixed deform was affordable precisely because the populate moved out.

**Seat rule (Decision 2): held, after the defaults moved — and the move was structural, not aesthetic.** The Think-phase defaults (anchorBias 2, strengthFull 4) failed the overview's *named* placement criteria on the real corpus: the multi-anchor barycenter landed *between* far-apart peaks and the centroid-blend pulled even single-anchor towns 25% off their peak — three-hours seated nearest aspirational-intelligence, the-empty-container nearest palana. A sweep over the corpus at three seeds against the named criteria (three-hours→Hōzō, the-empty-container→Glassroom, the-same-lever→central) landed **anchorBias 4, strengthFull 3, footOffset 20, secondaryStrength 0.5**, where all three criteria hold across seeds: three-hours seats at Hōzō's foot (~65–84px), the-empty-container at Glassroom's foot (exactly 20px = the foot offset), the-same-lever central (cdist 16–87, leaning Glassroom via its `argues_for` fallback). This is acceptance-criteria verification, not the by-feel pass — the criteria are written, testable placements, so dialing the defaults to satisfy them is correctness work, distinct from the aesthetic landing below.

**A "miss" that wasn't.** judgment-at-scale documents glassroom@2 *and* satori@2 — equal anchors — so it correctly seats *between* the two (a town documenting two works is a hub between them), not at either. The seat rule did the right thing; the expectation was wrong. falcon-cameras (kanyo@3 + ho-system@2) seats toward kanyo but its nearest peak varies by seed in the dense 19-peak field — not a named criterion, and the anchor pull is correct; it just has neighbors.

**Size mapping (Decision 3): the thresholds [0.7, 1.5, 1.7] gave the full progression.** the-same-lever hamlet (weight 0, ~3 blocks), the-empty-container + the-fourth-boundary villages (~8–10), judgment-at-scale town (~19–22), three-hours + falcon-cameras cities (~51–55, cathedral close + terracotta). Block counts scale with the band and the within-band `density` (base 1.4 + weight·0.3), so the cities read as substantial and the hamlet as a few houses — "populated enough," the practitioner's concern, structurally satisfied. Two cities (the tied top weight) did not crowd the map at these seeds; the practitioner may raise `t3` live if a single city reads better.

**Place-then-deform (Decision 4) and the aesthetic landing: the practitioner's by-feel pass, not closed here.** This is the ho-06.5 discipline applied deliberately: ho-06 closed its tuner verdict on the model's eye and ho-06.5 had to supersede it. So the deform *feel* — `elongK` (valley elongation), `contourFollow` (per-block bend), and whether the towns read as resting on the slope versus sitting flat on it — is **not** declared landed. The mechanism is built and structurally sound (the affine orients the growth axis to the contour, the per-block nudge bends corridors downhill, a flat field leaves the town unchanged, no block blow-up — city extent ~70px matches the spike), and the live instrument on `:8788` opens on reasonable defaults (elongK 4, contourFollow 40). The by-feel landing of the deform and any size-threshold adjustment is the practitioner's pass against the register, and may land as a ho-07.x tuner ho (forward-only, the ho-06.5 pattern) if it moves the defaults.

**Towns-on-terrain (Decision 5): render-order occlusion reads as on-the-map** in the rasterized check — building clusters sit over the contours with the rings passing around them. Whether it ever reads as a hole punched in the map (arguing for the deferred heightfield cutout) is part of the practitioner's by-feel read; nothing in the structural render suggests it.

**What the tests didn't catch.** The unit suite asserts geometry (seat math, band thresholds, deform rotation on a known gradient, growth determinism, the city's single terracotta) — all structurally true. What it can't assert is the named *placement* on the real corpus (caught by the seed-sweep against the overview criteria, which moved the defaults) and the deform *feel* (the practitioner's eye). Both halves of the ho-06 lesson held: structural correctness from fixtures, placement and feel from the rendered map.

**Followups.**
- **ho-07.2 (populate):** the chronological/editorial populate animation, with the authoritative emergence order collected there (the works.json `publication_date` is untrustworthy — `created == publication_date` for all six; the practitioner supplies the real order and the started-vs-completed anchor).
- **the-same-lever connectivity (surfacing):** it is a manifesto, kin to pink-teaming (also a manifesto), and should carry a relationship to it; more broadly it argues for AI as a lever and reads as under-connected, with more education pieces coming. Catalog-data authoring (an authoring ho / the Founder), not a ho-07 edit. The blended-seat rule self-corrects once the edge exists (Decision 2 / the connectivity note).
- **Overview refresh (Kamae-4 territory, flag not edit):** insert ho-07.2 (populate), mark ho-07 as static placement only.
- **ho-08 inheritance:** roads from a town to the peaks it documents fall out of the same anchor edges the seat already reads — ho-08 can reuse `computeTowns`'s anchor resolution.

---

_Authored: 2026-06-13 (Think phase). Executed and closed: 2026-06-13._
_Surfacing: the Think-phase seat defaults failed the overview's named placement criteria on the real corpus (multi-anchor barycenters land between far peaks); a seed-sweep against the criteria landed anchorBias 4 / strengthFull 3 / footOffset 20. The deform feel is left as the practitioner's by-feel pass on :8788, not closed on the model's eye (the ho-06.5 discipline)._
