---
created: 2026-06-23
status: open
type: ho-document
project: shoshin-no-sono
ho: "A-6.0"
parent: "06"
kind: sidequest
kamae: 5
shape: ha
builds-on:
  - kamae/kamae-2-shoshin-no-sono-system-design.md
  - kamae/kamae-4-shoshin-no-sono-ho-overview.md
  - ho-process/hos/ho-06-contour-extraction.md
  - ho-process/hos/ho-06.5-tuner-landing.md
  - src/field.js
  - src/contour-map.js
references:
  - https://andywoodruff.com/blog/hachures-and-sketchy-relief-maps/
  - https://github.com/awoodruff/canvas-shaded-relief
---

# ho-A-6.0 — Hachure renderer (sidequest off ho-06)

A second renderer for the same heightfield. ho-06 committed iso-elevation contours as the register; this sidequest asks whether a 19th-century-style **hachure** render — short downhill strokes whose density and weight scale with slope magnitude — reads as a *more evocative* surface for the same field, without changing anything else. A new pure module `src/hachure-map.js` sits parallel to `src/contour-map.js`, takes the same `Heightfield` input, and emits its own SVG. The page chooses between the two at render time via a Gate-backed `?render=contour|hachure` toggle (default `contour`). The iso renderer is not replaced — it remains the committed register. This is an A/B spike, not a supersession.

The reference is Andy Woodruff's sketchy-relief work (linked in `references:`). The Samoa hachure plate the practitioner brought to the conversation is the visual target: downhill strokes, varied density reading as slope, slightly jittered for the inked-by-hand feel.

**Out of scope.** Any change to `field.js`, `indexer.js`, `gate.js` (beyond adding the one render-mode key), `settlements.js`, the labels layer, the emergence player, or `?seed=` reproducibility. Any change to the iso renderer or its register. A canvas backend (Decision 5 names canvas as a deferred fallback, not this ho's work). A commitment to swap the register from iso to hachure — that is a separate decision after the A/B reads. Settlements-on-hachure styling (the towns layer composes over the hachure with no change, because the towns layer is unaware of the terrain renderer; if a composition problem surfaces, it is logged in Reflect and addressed in a follow-on ho).

---

## Phase 1 — Think

### Decision 1 — Component boundary holds: a new pure module parallel to contour-map.js.

`src/hachure-map.js` has the same signature shape as `src/contour-map.js`: `(heightfield, opts) → svg string`. Pure — no DOM, no Indexer, no Gate, no URL. It consumes the `Heightfield` object `field.js` already produces (`{ field, cols, rows, cell, width, height, max }`), unchanged. This is the architectural commitment of ho-05/ho-06 paying off: the field is the seam, and a second renderer at that seam is additive. The Cartographer, the Indexer, the Gate, the settlements, the labels, and the emergence player do not know which renderer drew the terrain.

### Decision 2 — Algorithm: downhill strokes on a sample grid, density and weight scaled by slope.

Classic cartographic hachures, not streamline-following:

1. Walk a sample grid across the field at stride `sampleStep` (initial value: 6 px, tunable). At each sample, compute the gradient `∇h` by central differences on the heightfield grid. If `|∇h| < slopeFloor`, emit no stroke — flats and the corpus-floor zone stay paper, which is the historical convention and reads as quiet ground.
2. Direction is `-∇h` normalized — strokes point downhill, perpendicular to the implicit contour.
3. Length scales with `|∇h|`: `len = lenBase + lenScale * normalizedSlope`. Steeper faces carry longer strokes (Woodruff's choice; an alternative — fixed length, density-only — is logged as a deferred variation).
4. Weight scales with `|∇h|`: `w = wBase + wScale * normalizedSlope`. Steeper faces darken.
5. Position and angle are jittered by small seeded amounts (`posJitter`, `angleJitter`) so the field doesn't read as a printed grid. The jitter PRNG is seeded by `(seed, i, j)` so the spike inherits ho-06's `?seed=N` reproducibility — same seed yields the same hachure plate exactly.

Density-from-slope-only (no length variation) and the streamline-following alternative (random walks down the gradient) are named here and deferred. They are renderer-internal swaps the same toggle would absorb if the first algorithm reads thin.

### Decision 3 — Toggle plumbing: one new Gate key, three call sites pick a renderer.

`gate.js` gains one optional state key: `render: 'contour' | 'hachure'`, default `'contour'`. Persists in the URL as `?render=hachure` so screenshots, reseeds, and shares carry the choice. No other Gate behavior changes.

`cartography-page.js` has three sites that call `contourMapSvg` (lines 444, 474, 580 at time of authoring — `stepTerrain`, `render`, `playWriting`). A small local wrapper `terrainSvg(heightfield, tuners, mode)` centralizes the choice so the three sites read identically, and the emergence player is untouched — it calls the wrapper. The iso renderer's tuner keys (`interval`, `weightRegular`, `weightIndex`) and the hachure renderer's tuner keys (`sampleStep`, `slopeFloor`, `lenBase`, `lenScale`, `wBase`, `wScale`, `posJitter`, `angleJitter`) coexist on the same `tuners` object; each renderer reads what it needs.

The page chrome gets a render-mode toggle (a two-option control matching the existing tuner UI) that writes through to the Gate, mirroring the seed-pin pattern. The two renderers' tuner panels show conditionally based on the active mode so the panel doesn't sprawl.

### Decision 4 — Register: warm ink on cream, carried unchanged.

The hachure renderer reproduces the iso renderer's frozen register colors: ink `#2B2B2B`, paper `#FDFCF9`. Stroke weight is *variable* in hachure (Decision 2), so the iso renderer's fixed weights don't apply — but the *floor* of the weight range honors the same legibility-of-thin-strokes lesson from ho-06 (below ~0.22 strokes drop out). Initial values: `wBase` 0.22, `wScale` 0.6 (peak weight ~0.82 on the steepest face, matching the iso index-stroke feel). The cap shape stays `round`. No fill. The corpus-floor rect is emitted by the page layer (`corpusFloorSvg`), not by the renderer — same as `contour-map.js`. The register's *commitment* — iso contours at the validated weights — is not under revision; this is an alternative cartographic *vocabulary* on the same palette.

### Decision 5 — SVG first, canvas as a deferred fallback if it bogs.

Stroke count at `sampleStep=6` on the 1000×620 field is roughly 17k grid samples, of which a meaningful fraction (the corpus floor and the gentle shoulders) fall under the slope floor and emit nothing — realistic working count probably 6–10k strokes. SVG handles this at the order of magnitude the iso renderer already runs, and keeps the output composable with the existing layers — labels, halos, towns, beacons, peak dots — with zero new infrastructure. PNG export and the headless screenshot loop work unchanged.

A canvas backend (Andy's choice in `canvas-shaded-relief`) is faster at higher densities and is named here as the contingency if the SVG renderer measurably slows the emergence player's cross-fade. The contingency is **not** taken pre-emptively — a hybrid SVG-over-canvas pipeline changes export and composition semantics, and the work to swap renderer internals later is small (the seam stays at `(heightfield, opts) → string`; only the *content* of the string changes from `<svg>` fragments to a `<canvas>` + `<image>` shim). Performance is read on `:8788` against the real corpus; a degradation finding is logged into Reflect.

### Decision 6 — Tuners exposed, landings tentative.

The `design-parameters-want-tuners` discipline holds. All hachure parameters surface as `opts` and as live controls during the spike: `sampleStep`, `slopeFloor`, `lenBase`, `lenScale`, `wBase`, `wScale`, `posJitter`, `angleJitter`. The by-feel pass against the corpus settles initial defaults, and the landings are logged — but because this is a sidequest, not a committed register swap, the landed defaults live in `hachure-map.js`'s `DEFAULTS` and are not written into `field.js`. If the spike's A/B read commits the register to hachure in a future ho, the landings become the register at that point.

### Decision 7 — Composability with the upper layers is a Reflect check, not a redesign.

Labels (`placeNameLayer`), elevation labels (`elevationLabelsSvg`), towns (`townsSvg`), beacons (`beaconSvg`), and peak dots (`peakDotsSvg`) all sit *above* the terrain SVG and are unaware of which renderer drew it. The known composition risk is text legibility over the busier hachure field — the existing label halos already work over iso strokes and should compose over hachures by the same mechanism, but the read is empirical. Logged for the Reflect screenshot loop: open-filter map at `?render=hachure`, deep-filter map at `?render=hachure&theme=craft`, mid-emergence frame, and the writing-phase frozen-terrain frame. If labels read badly, the response is a small halo/opacity adjustment in the label layer in a follow-on ho — not a renderer change here.

### Decision 8 — Tests at the same shape as contour-map's.

Pure renderer, snapshot-testable. Hand-built fixture heightfields (a uniform flat field → paper only; a single-peak field → radial pattern of downhill strokes; a tilted-plane field → uniform parallel strokes pointing down the slope) assert the algorithm produces the structurally expected output. Per-stroke properties (downhill direction, weight bounded by `[wBase, wBase+wScale]`, count bounded by sample-grid size after the slope-floor filter) are asserted on the fixtures. Seeded jitter reproducibility — same `(seed, opts)` yields byte-identical SVG — is asserted. Coverage floor 90% per project norm.

### Discovery (deferred to execution)

- **The A/B read** — does the hachure plate, at landed tuners, read as a more evocative or a less legible map than the iso plate at ho-06.5's landed tuners? Recorded against side-by-side screenshots at the same seed.
- **Stroke-count budget** — how many strokes does the real corpus produce at initial tuners, and does the emergence cross-fade hold its frame rate? SVG fallback to canvas (Decision 5) is the response if it doesn't.
- **Slope-floor calibration** — does `slopeFloor` cleanly separate the corpus-floor zone from terrain, or does texture leak into the floor / does terrain thin near its edges?
- **Label composition** — do peak and town labels read cleanly over hachures with the existing halos, or does the labels layer want a stronger halo when `render=hachure`?
- **Algorithm variant flag** — if downhill+length-scaled reads thin, is density-only (constant length, density-from-slope) the next variant, or streamline-following? Either swaps at the renderer's internals without touching the seam.

All are eyeball / screenshot checks on `:8788`, logged into Reflect.

---

## Phase 2 — Execute

One bounded session. The renderer is small, the seam is already there, and the existing iso pipeline is the structural reference for everything except the per-cell math.

**Sequence:**
1. `src/hachure-map.js` + `tests/hachure-map.test.js` — central-difference gradient sampler, slope-floor filter, downhill stroke emitter with jitter, `hachureMapSvg(hf, opts)` returning the SVG fragment. Defaults named in Decision 4 / Decision 2.
2. `src/gate.js` — add the `render` key with `'contour' | 'hachure'` values, default `'contour'`, mirrored in `?render=`. Round-trip tested.
3. `src/cartography-page.js` — local `terrainSvg(hf, tuners, mode)` wrapper; the three call sites read identically through it. Render-mode toggle in the page chrome. Hachure tuner panel conditional on the active mode.
4. Live screenshot loop on `:8788` against the real corpus: A/B against the iso plate at the same seed, open and deep-filter states, emergence cross-fade, writing-phase frozen-terrain frame. Land the hachure tuners by feel. Verify `?seed=N&render=hachure` reproduces byte-identical SVG across reloads. Log the A/B read.
5. Full stack green (`npm test`, `npm run lint`, `npm run typecheck`). Commit.

### Done means

- `?render=hachure` on `cartography.html` renders the heightfield as downhill hachure strokes — register colors, variable weight and density read as slope, jitter reads as inked-by-hand rather than printed-grid.
- `?render=contour` (default) is unchanged from ho-06.5's landed register. The toggle round-trips through the URL.
- All upper layers — labels, towns, beacons, peak dots, the emergence player — render unchanged over either terrain renderer.
- Filter changes and reseeds work identically in both modes; `?seed=N&render=hachure` reproduces a hachure plate exactly across reloads.
- `tests/hachure-map.test.js` covers the renderer to ≥90% — fixture fields, slope-floor behavior, stroke-direction correctness, seeded jitter reproducibility.
- The A/B read against the iso plate at one anchor seed is recorded in Reflect, with screenshots.
- Performance: the emergence cross-fade does not visibly degrade at `?render=hachure`; if it does, the degradation is recorded and the canvas-backend contingency (Decision 5) is logged as a follow-on, not taken in this ho.

---

## Phase 3 — Reflect

_(open — to be written after the spike runs.)_

---

_Authored: 2026-06-23 (Think phase, sidequest off ho-06)._
