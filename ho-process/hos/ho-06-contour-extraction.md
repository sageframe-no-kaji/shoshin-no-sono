---
created: 2026-06-13
status: complete
type: ho-document
project: shoshin-no-sono
ho: "06"
kamae: 5
shape: ha
builds-on:
  - kamae/kamae-2-shoshin-no-sono-system-design.md
  - kamae/kamae-4-shoshin-no-sono-ho-overview.md
  - ho-process/hos/ho-05-positions-and-heightfield.md
  - design/visual-register.html
  - design/claude-design/territory-spike.html
  - design/claude-design/SURFACINGS.md
  - src/field.js
---

# ho-06 — Contour extraction

The first time the cartography looks like a map. Marching squares takes ho-05's heightfield — the 2D grid of elevations in `src/field.js` — and extracts iso-elevation contours as SVG paths, rendered in the frozen register: warm ink on cream, regular strokes at 0.25 and index strokes at 0.7, index every fifth ring. The transient debug heat map from ho-05 dies here; the contour map replaces it on `cartography.html`. Two questions ho-05 deferred to this session get settled on the rendered map: the **silhouette verdict** (does the Gaussian-family field reproduce the frozen session-1 peak's character on real iso-lines?) and the **by-feel tuner pass** on the field `opts`, done now that there are contours to tune against rather than a heat map.

This is a recreation, not a copy. `design/claude-design/territory-spike.html` is the eye-blessed reference algorithm — its `contourPaths()` walks the marching-squares case table, `segsToPath()` emits the path data, `terrain()` picks the level set and the weights. ho-06 reimplements that pipeline cleanly in `src/` with tests, behind the component boundary: pure geometry in, SVG out, no Indexer, no Gate, no URL. The renderer reproduces the spike's blessed behavior exactly, because the silhouette verdict is only honest if it is judged against the same renderer that produced the blessed plate — a changed algorithm would confound a field difference with a rendering difference.

**Out of scope:** Town placement and the chronological populate (ho-07 — the contour map carries peaks only, as ho-05 did). Relationship features (ho-08). Interaction — hover, click, cards, fresh-render-on-filter transitions (ho-09; filter changes already re-extract here, but as a full re-render, not a transition). Towns-on-terrain (contours wrapping settlements) — there are no settlements yet. The wave-interference field variant — it stays the named, unbuilt fallback; if the silhouette verdict fails, building it is a separate field ho, not this session's work (Decision 5). Polyline stitching of contour segments into continuous closed rings (Decision 1 — deferred to ho-09 if label-following or hit-testing needs it).

**Resolves deferred decisions** (from ho-05's Reflect and the ho-overview's ho-06 entry):
- **Silhouette verdict** — settled by eye on real contours against the frozen peak (Decision 5). Verdict-only: a pass closes the Gaussian question, a fail spawns a separate field ho.
- **By-feel tuner pass** — the field `opts` carried unchanged from the spike through ho-05 get tuned against the register now, via live controls on the debug page (Decision 6).

---

## Phase 1 — Think

### Decision 1 — Marching squares: faithful port of the spike's segment emission, as pure geometry.

The spike's `contourPaths()` is the standard 16-case marching-squares table over a scalar grid: for each cell, classify the four corners against the level into a 4-bit index, linearly interpolate the crossing point on each straddled edge, and emit the one or two segments the case prescribes. The two saddle cases (5 and 10) are resolved by a **fixed choice** — case 5 connects `[L,T]` and `[B,R]`, case 10 connects `[T,R]` and `[L,B]` — not by sampling the cell-center value to disambiguate. This can occasionally join a saddle "the wrong way," but it is the blessed behavior, and ho-06 reproduces it faithfully for the reason named above: the verdict must be judged against the blessed renderer. Asymptotic (center-sampled) saddle disambiguation is a deferred refinement, taken only if saddles *visibly* misconnect on the real field — a finding for Reflect, not a pre-emptive complication.

The output is **segment soup** — each cell emits independent `M…L…` subpaths; the spike does not stitch them into continuous polylines. At 0.25/0.7 stroke weights with round caps this renders cleanly (it is exactly what produced the blessed plate). Stitching into closed rings would be cleaner SVG and would enable contour-following labels and hit-testing, but neither is needed before ho-09 — so stitching is out of scope here, and the geometry is structured so it can be added later without re-deriving the extraction.

### Decision 2 — Level set: fixed absolute interval, not fixed count; index every fifth from the outermost.

The spike picks levels by a fixed elevation `interval` (default `0.62`): levels run `interval, 2·interval, 3·interval, …` up to the field max. The number of contours therefore varies with the terrain — a taller massif carries more rings, and under a filter, as non-matching peaks sink and the max drops, the terrain carries *fewer* rings. That is correct: contour count tracking elevation is what makes a sunk terrain read as lower. The alternative — a fixed *count* of levels at `max/N` — would renormalize spacing per max and destroy the slope reading. Screen-space ring spacing must be a pure function of the field's gradient, because that spacing is the register's load-bearing signal: close rings read as steep faces, wide rings as long shoulders, varied spacing as topography rather than a machined cone (the session-1 finding).

Index contours are every fifth level counting from the lowest — which, since levels run low to high, is the **outermost** ring and every fifth ring inward (the register's "index every 5th from the outermost ring"). `interval` is the primary lever of the by-feel pass (Decision 6); `indexEvery` stays `5` unless the assembled map argues otherwise.

### Decision 3 — Module layout: pure geometry and register render, split; the heat map deleted.

Two new modules, parallel to ho-05's `field.js`/`heatmap.js` split:

- **`src/contours.js`** — pure geometry, no SVG styling, no DOM. `contourLevels(max, interval)` → the level set; `extractContour(heightfield, level)` → an array of segments (point pairs); `segsToPath(segments)` → a path `d` string; and a `contourGeometry(heightfield, opts)` convenience that combines them into `[{ level, isIndex, d }]` for the renderer to draw. Takes the `Heightfield` object `field.js` already produces (`{ field, cols, rows, cell, width, height, max }`), so it is testable from hand-built fixture grids with zero project dependencies.
- **`src/contour-map.js`** — the register-honoring SVG render, pure (geometry in, SVG string out, no DOM). Draws a cream paper rect, then one `<path fill="none">` per level: stroke `#2B2B2B`, weight `0.7` for index levels and `0.25` for regular, `stroke-linecap="round"`. The register values are renderer constants exposed as `opts` for testability, not tuners (Decision 4).

`src/heatmap.js` and `tests/heatmap.test.js` are **deleted** — ho-05 marked the heat map transient and named ho-06 as its death. This is not a forward-only supersession; it is the removal of scaffolding that was authored to be removed. The Cartographer (`src/cartographer.js`) is untouched: it already returns `{ peaks, heightfield, seed }`, and the heightfield is exactly what `contours.js` consumes. Consolidating extraction-and-render into the Cartographer (the System Design's "Cartographer renders SVG" end state) waits for ho-09, when interaction makes the component the right home; ho-06 keeps the pure modules wired by the debug page, matching the ho-05 pattern.

### Decision 4 — Register conformance is reproduction, not tuning.

The frozen register fixes ink `#2B2B2B` on cream `#FDFCF9`, weights `0.25` regular / `0.7` index, index every fifth, round caps, `fill: none`. These are commitments the renderer reproduces — not parameters of the by-feel pass. The spike already re-tuned the solo-peak weights (`0.85`/`1.7`) down to these map-scale values and confirmed the floor: below ~`0.22` regular, strokes start dropping out on the 45% plate (SURFACINGS). ho-06 confirms they hold on the **real 19-peak corpus** (the spike carried three peaks). If 19 peaks read too dense or busy, the lever is the `interval` — ring spacing — not the weights; the weights are at their validated map-scale floor. The register's own multi-peak caution (weights and index ratio were judged on a solo peak) is answered by the spike's map-scale re-tune, not reopened here.

### Decision 5 — The silhouette verdict: settled by eye, verdict-only, fail spawns a field ho.

ho-05 deferred the question a heat map cannot answer: does the Gaussian family — `amplitude × exp(−(d/rEff)^1.7)` with harmonic-modulated `rEff` and elevation-attenuated noise — reproduce the frozen session-1 peak's silhouette character on real iso-lines? The criteria, read off the register:

1. **Spacing reads as faces and shoulders** — varied, not the uniform rings of a machined cone. (The session-1 core finding; spacing falls out of the field shape, which is exactly what is on trial.)
2. **Crenellation decays with elevation** — low rings carry drainage-scale complexity, summit rings converge toward simple convex forms.
3. **Silhouette is non-circular** — the low-order angular harmonics give rings a lobed, hand-drawn character rather than concentric ellipses.

The verdict is rendered on `cartography.html`, screenshot against the frozen peak (`design/visual-register.html` and the session-1 explorer). ho-06 is **verdict-only**: if it passes, the Gaussian question closes and wave-interference stays unbuilt; if it fails, that is a recorded finding that spawns a separate field ho (a forward-only response touching `field.js`), because swapping the field's falloff family is ho-05's territory and belongs in its own bounded session, not swelling this one. The spike already looked right by eye, so a pass is the expected branch — but the protocol is named so a fail is handled cleanly rather than improvised.

### Decision 6 — The by-feel tuner pass: live controls on the debug page.

The field `opts` reached ho-06 carried straight from the spike and ho-05 defaults, untuned, because the surface to tune against is contours and ho-05 only had a heat map (ho-05 Reflect). ho-06 owns the pass. The instrument is **live controls on `cartography.html`** — range inputs that re-render the contour map on input, so the values can be dialed against the register by feel rather than by edit-and-reload (the Claude-Design tuner posture; the `design-parameters-want-tuners` discipline). The controls cover the parameters that change the *feel* of the terrain:

- `interval` — contour spacing / ring density (level-set, the primary lever)
- `summitExp` — summit sharpness (the flat-top avoidance)
- `noiseWeight` — low-elevation crenellation amplitude
- `radiusScale` — how strongly importance widens a massif
- `relevanceFloor` — how deep non-matching peaks sink under a filter

The seed stays fixed across a tuning session so only the dialed parameter moves the map; reseed and the theme chips persist from ho-05. Wiring: the page holds the live `opts` and re-renders by recomputing the field at the Cartographer's active seed — `computePositions` is seed-only and filter-independent, so position stability across a tune is free. Landed values are written back as the new `DEFAULTS` in `field.js` (or confirmed unchanged), and the landings are logged in Reflect. The controls are a debug-page affordance, not a register commitment.

### Decision 7 — Debug page evolution; peak markers become an optional overlay.

`cartography.html` and `src/cartography-page.js` persist and grow into the real cartography surface through ho-09 — ho-06 evolves them, it does not replace them. The page swaps `heatmapSvg` for `contourMapSvg`, keeps the reseed control, the active-seed readout, and the theme chips, and adds the tuner controls (Decision 6). The ho-05 peak-id markers (`peakMarkersSvg`) were a heat-map debug aid; on a register-faithful contour map they are off by default and available behind a toggle, so positions can still be checked by id without polluting the silhouette read. The page stays coverage-excluded glue, like `main.js`.

### Decision 8 — Tuners exposed, not silently committed (carried posture).

The `design-parameters-want-tuners` discipline holds: the field and level parameters stay surfaced as `opts`, and ho-06's job is to land them by feel against the register and record where they landed — not to bury new magic numbers. The register constants (Decision 4) are the exception: they are frozen commitments, exposed as `opts` only so the renderer is testable.

### Discovery (deferred to execution)

- **The silhouette verdict** itself (Decision 5) — pass or fail against the frozen peak, recorded in Reflect.
- **Tuner landings** (Decision 6) — where `interval`, `summitExp`, `noiseWeight`, `radiusScale`, `relevanceFloor` settle on the real corpus, written back to `DEFAULTS`.
- **19-peak density** — do the map-scale weights and the spike's `interval` hold on 19 peaks, or does the interval want widening so the assembled map breathes? (Decision 4 — the interval is the lever.)
- **Deep-filter legibility** — when a filter sinks most of the corpus, does the surviving terrain carry enough rings to still read as a map, or does the relevance floor want raising so sunk peaks keep a few contours? (Decision 2/6.)
- **Saddle connections** — do the fixed-resolution saddles (Decision 1) visibly misconnect anywhere on the real field, arguing for center-sampled disambiguation? Expected: no.

All are eyeball checks on `cartography.html` via the running `:8788` server, logged into Reflect, not blockers for landing the code.

---

## Phase 2 — Execute

One bounded agent conversation — no decomposition into agent-task files. The pipeline is small and tightly coupled (extract, render, wire), the spike is the reference, and implementation risk is low, exactly as ho-05 judged its own pipeline. Executed by the implementing model (Opus 4.8) in this session.

**Sequence:**
1. `src/contours.js` + `tests/contours.test.js` — `contourLevels` (level set from max + interval, index-every-5th flagging), `extractContour` (marching squares on hand-built fixture grids: a single straddled cell yields the expected interpolated segment; a fully-below/above cell yields nothing; the two saddle cases yield two segments each), `segsToPath` (path-data format), `contourGeometry` (determinism, index flags, non-empty paths where the field crosses). Pure, no project deps.
2. `src/contour-map.js` + `tests/contour-map.test.js` — register render: a path per crossing level, index levels at `0.7` and regular at `0.25`, stroke is the ink, `fill="none"`, paper rect emitted; an empty/flat field yields paper only; `opts` overrides (interval, ink, weights) honored.
3. Delete `src/heatmap.js` and `tests/heatmap.test.js`.
4. `cartography.html` + `src/cartography-page.js` — swap the heat map for the contour map; add the tuner controls (range inputs + value readouts) and the optional peak-id toggle; keep reseed, seed readout, and theme chips. Update the page copy from "heat map" to the contour map. DOM glue, coverage-excluded.
5. Full stack green → the real-data loop on `:8788`: screenshot the contour map against the frozen peak (the silhouette verdict), tune the field `opts` by feel with the register visible, check filter states (`?theme=craft`) and deep filters for legibility, reseed for novelty, confirm `?seed=N` reproduces. Land the tuners as `DEFAULTS`, record the verdict and the landings in Reflect → commit.

### Testing and iteration approach

Per-piece unit tests at each step — marching squares is the heavy surface, and unlike ho-05's "looks-right" position properties it is **structurally** testable: a known grid at a known level has a known set of interpolated crossings, so correctness (not just bounds) is assertable on fixtures. That answers ho-05's lesson directly — but only for geometry. The other half of that lesson holds: geometry-correct is not visually-legible, so the unit suite is paired with the headless-screenshot check on `:8788` (the silhouette verdict and the density/legibility reads are image checks, not assertions). A field-shape tuning fix propagates to `field.js` `DEFAULTS`; a relevance-feel fix to the cartographer's floor; a level-density fix to the `interval` default.

### Done means

- `cartography.html` at `:8788` renders contour lines — not the heat map — over the real corpus, register-faithful: ink `#2B2B2B` on cream, `0.25` regular / `0.7` index, index every fifth, round caps, no fill.
- The contours correspond to the heightfield: peaks are nested closed rings, saddles and valleys carry their own lines, the lowest rings enclose the cluster (the spike's continuous-field behavior, now on the real 19 peaks).
- Filter changes produce visibly different contour maps — matching peaks keep their rings, non-matching sink toward fewer/lower rings (`?theme=craft` re-extracts live).
- Refresh produces a novel layout; `?seed=N` reproduces one exactly; positions stay fixed across filter and tuner changes within a seed.
- The live tuner controls re-render the map on input; the landed values are written back to `field.js` `DEFAULTS` (or confirmed unchanged) and logged in Reflect.
- The silhouette verdict against the frozen session-1 peak is recorded in Reflect: **pass** (the Gaussian family stands, wave-interference stays unbuilt) or **fail** (logged with specifics, spawning a separate field ho).
- `npm test` (≥90% coverage on `contours.js` and `contour-map.js`), `npm run lint`, `npm run typecheck` all green. The `cartography.html` DOM glue is the only light-coverage seam, by design; `heatmap.js` and its test are gone.

---

## Phase 3 — Reflect

**Silhouette verdict: pass. The Gaussian family reproduces the frozen peak's character on real contours.** Screenshot loop on `:8788` at `?seed=12345`, the field's central peak (hōzō, importance 7) cropped and read against the session-1 explorer. All three criteria hold: ring spacing reads as faces and shoulders — tight on the steep side, wide on the long shoulder, not a machined cone; crenellation decays with elevation — outer rings carry lobed drainage-scale complexity, the innermost summit ring converges to a simple convex oval; the silhouette is non-circular — harmonic-modulated `rEff` plus ellipticity give organic, lobed rings. One mechanism note: the frozen peak built its steep-face/long-shoulder asymmetry from a deliberate per-ring summit offset along a bearing (a single-peak device). The field has no such offset — its asymmetry falls out of inter-peak interaction on the continuous heightfield plus per-peak ellipticity, and reads the same. That is the spike's thesis confirmed on real iso-lines: silhouettes fall out of the field, not out of per-peak authoring. Wave-interference stays the unbuilt fallback; no field ho is spawned.

**Tuner landings: every default held, now confirmed against contours rather than a heat map.** `interval` 0.62, `summitExp` 1.7, `noiseWeight` 0.85, `radiusBase` 40 / `radiusScale` 16, `relevanceFloor` 0.15, `indexEvery` 5, `cell` 4, `candidates` 12 — all carried from the spike and ho-05 unchanged. The by-feel pass moved each lever and read the result against the register: `interval` 0.50 over-densified and 0.78 thinned the topographic read; `summitExp` 2.2 over-sharpened; `noiseWeight` 1.30 pushed crenellation up the slope past the decay rule; `radiusScale` 22 broadened massifs until peaks merged (field max 18.2 → 26.2) and lost their distinctness. Each variation moved away from the register, not toward it. This is the verification ho-05 deferred: the heat map could confirm heights tracked importance, but only contours can settle whether the *spacing* reads as topography — and it does, at the inherited values. `field.js` `DEFAULTS` unchanged.

**19-peak density: the spike's map-scale weights and interval held on the real corpus.** The spike validated 0.25 / 0.7 and `interval` 0.62 on three peaks; the register flagged the weights and index ratio for re-tuning once many peaks shared a map. On the real nineteen the map reads as contours-everywhere without overcrowding — the multi-peak re-tune proved unnecessary because the spike had already dropped the solo-peak weights to map scale. The lever the ho reserved (`interval`, not the weights) stayed unused.

**Deep-filter legibility: the relevance floor held.** `?theme=craft` re-weights the field live — non-matching peaks sink toward fewer, lower rings while matching peaks keep their stacks, and the territory stays put (positions are seed-only). At the 0.15 floor the sunk peaks remain low terrain texture rather than vanishing: the field stays a continuous map with no blank zones, so a heavily-filtered view still reads as a map. The floor did not move.

**Saddle connections held; center-sampling stays deferred.** The fixed-resolution saddles (cases 5 and 10) read cleanly across the real field — no visible misconnections where two ridges pass. The asymptotic disambiguation named as a contingency in Decision 1 was not needed.

**What the tests didn't catch.** Marching squares is unit-tested to 100% on hand-built fixtures — every case in the table, the interpolation, the rounding — because geometry correctness is structurally assertable. But "does this read as the frozen peak" and "do sunk peaks vanish under a filter" are image properties no fixture asserts; the screenshot loop against the frozen peak and the open-vs-craft compare carried that half, exactly as the ho-05 lesson prescribed (pair the unit suite with a rendered-image check). New surfacing: at `seed=12345` the tallest peak (ho-system, importance 9, radius ~184) lands near the right margin (70) and its skirt clips at the field edge. That is a position/field-extent matter — margin versus importance-scaled radius — owned by ho-05's territory, seed-dependent (other seeds center it), and not a contour defect. Flagged for attention if it recurs at scale; not addressed here (forward-only — a field-extent change is not this ho's work).

**Followups.**
- **ho-07 (towns):** place the 6 `writing`-group towns on this terrain (place-then-deform); contours should wrap settlements once they exist (the towns-on-terrain consequence the register deferred here); reuse the seeded growth posture. The contour pipeline this ho built is what the towns sit on.
- **Field extent vs margin (surfacing, not a ho yet):** tall peaks near the placement margin clip their skirts. If it reads wrong on the assembled map, it is a field/position change (ho-05 territory) — a margin that scales with the largest radius, or a placement bias away from the boundary for high-importance peaks.
- **No field ho spawned** — the silhouette verdict passed; the Gaussian family stands.

---

_Authored: 2026-06-13 (Think phase). Executed and closed: 2026-06-13._
_Surfacing: silhouette verdict passed against the frozen peak — Gaussian family reproduces faces/shoulders, crenellation decay, and lobed silhouette on real contours; all field tuners held unchanged. Tall peaks near the margin clip their skirts (field-extent, ho-05 territory)._
