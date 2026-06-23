# ho-04 design sessions — surfacings

Parked ideas and decisions surfaced during the Claude Design sessions. Feeds the
ho-04 Reflect when the ho document is authored; anything structural propagates
to the overview's ho entries.

## Session 1 — peak (frozen 2026-06-12)

- Hand lives in the form, not the line; stroke noise retired. (Propagated: overview ho-05, register page.)
- Crenellation decays with elevation — field-side rule. (Propagated: overview ho-05.)
- Terrain = summit offset along a bearing (skewed radial falloff), not noise. (Register page.)
- Practitioner reservation: index-vs-regular distinction unsatisfying — re-decide at assembled-register checkpoint. (Register page.)

## Session 2 — settlements (in progress)

- **Primitive direction:** letterpress solid micro-blocks, drop shadow vetoed (violates the no-shading register).
- **Size semantics candidate:** city = only settlement carrying a terracotta landmark; town = street structure; village = loose cluster; hamlet = 2–3 blocks. Glyph question open: literal cathedral (storybook) vs plain terracotta tower-block (survey).
- **Streets are negative space.** Inside settlements, structure comes from building alignment along void corridors — no road strokes. Drawn roads remain session 5's question (cased double-line is a candidate there).
- **Lakes rejected** — too geometric, and no meaning in the grammar.
- **Rivers parked as a grammar question, not a garnish.** Every map feature is semantic; a meaningless river weakens the discipline. Candidate meaning: succession (`succeeded_by`) as directional river — possibly with a bridge at the successor's crossing — replacing the "directional ridge." Decide at ho-08, not in a design session. Bridges ride with rivers.
- **Reference:** Murakami, *Hard-Boiled Wonderland* — the End of the World town map. Deep resonance (walled garden with gates = the project's own metaphor). Take: negative-space streets, solid blocks, landmark towers. Leave: illustrative density.
- **Session discipline note:** round 2 drifted toward ever-richer towns; the session's question is the *four-size progression* — next round shows the four sizes in the chosen style.

### Session 2, round 3
- Style A's four-size row regressed to rectilinear (aligned identical blocks — reads as grid/Braille). Fix: settlements generate from a **growth rule** — curved corridors radiating from the core, block rotation follows the local street tangent, sizes vary, density falls off, edges ravel. Medieval lives in the growth model, not the block styling.
- Recurring register rule (second occurrence, after session 1's form-not-stroke): **character comes from process, not decoration.** ho-07's town placement inherits this directly.

### Session 2, round 4
- Overcorrection: growth rule at tiny block scale produced confetti — streets illegible. Rule: **negative space reads only against contiguous mass** (street walls of nearly-touching blocks). Medieval = strong local order, global irregularity. Proportions: city ≈ 30 chunky blocks, not 80 specks.
- Settlements are seeded — reseed gives endless non-repeating towns in the style (good; matches the fresh-render-per-visit architecture). Tuner dials when mass is right: blocks, corridors, packing, ravel.

### Session 2, round 5 — converging / freezable
- Proportions landed: city ≈ 30 chunky blocks reading as one mass + terracotta tower, four sizes rankable, survives 50%. Tuner dials: blockSize(unit), packing, corridors, streetCurve, edgeRavel — plus reseed. Freeze the dials, not the seed (seed is per-render).
- **Topography × settlements (practitioner instinct — promote to ho-07 input, NOT a session-2 tweak):** real settlements deform to terrain (stretch along valleys, wrap contours, avoid steep faces). This cannot be settlement-side logic — in session 2 there is no slope to respond to (it's the peak-cruciform trap: designing against a field that doesn't exist). Correct architecture: the town is *grown in the abstract* (session 2, done) then *warped at placement* on the heightfield (ho-07) — corridors bending to contours, footprint elongating along the valley. The peak and the settlement are revealed to be the same kind of object: seeded radial growth process with edge ravel, character from process not styling. ho-07 should treat town placement as place-then-deform, sharing the growth/warp machinery with the peak field.

## Coherence check (sessions 1–3 together) — 2026-06-13
- **Register coheres** — peak + settlement + type read as one mapmaker's hand. The alphabet is done.
- **Assembled-register re-tuning (resolves the session-1 reservation):** solo-peak contour weights (regular 0.85 / index 1.7) read too heavy in a field of peaks. Lightened to 0.5 / 0.95 in the coherence composite; pending bless → propagate to the frozen peak register (parameters.json + register page).
- Label placement fixes were composite-preview bugs (peak names now hug the summit; town labels sit clear below the built extent), not register changes.
- **Deferred to ho-05/07 (towns-on-terrain):** contours should surround settlements, not just peaks. A town sits ON the heightfield, so contours pass around it once placement exists. This is the place-then-deform consequence — towns are not holes in the terrain, they're on it. Not a register fix; the composite holds peaks and towns as separate layers only because there's no field yet.

## Territory spike (ho-05/06 preview) — 2026-06-13
- Practitioner: "the map can't be JUST peaks — contours everywhere, they need to fill in." Correct and structural: the per-peak composite was misrepresenting the map. Built `territory-spike.html` — a real continuous heightfield (sum of elliptical/rotated/harmonic radial peak functions + 2-octave value noise attenuated by elevation) with contours extracted by marching squares across the whole field. This is the ho-05 + ho-06 pipeline validated as a design spike BEFORE src/ implementation.
- Confirms: blessed weights (0.5/0.95, index every 5th) read correctly on a real field; peaks are local maxima, saddles/valleys carry their own contours, lowest rings enclose the cluster; crenellation-decays-with-elevation works as a noise weight of (1 - summitProximity); sharper-than-Gaussian summit profile exp(-(d/r)^1.7) avoids the flat-top problem.
- Label fixes folded in: peak labels at summit (p.r*0.32 above centre), town labels offset below the MEASURED block extent (not an estimate).
- **Carries into ho-05/06 as the reference algorithm.** Open question for ho-05 proper: does this Gaussian-family field reproduce the frozen session-1 peak's exact silhouette character, or does it need the wave-interference variant? The spike says the family is close; ho-05 confirms against the frozen peak. Towns-on-terrain (contours wrapping settlements) still pending — the spike places towns as a layer over the field; true integration is ho-07 place-then-deform.

### Cathedral close (city morphology) — 2026-06-13
- Practitioner (urban morphology): a cathedral always has a plaza on one SHORT side (forecourt/parvis), a small plaza behind (apse), and surrounding buildings run PARALLEL to the nave, not radiating. Implemented in territory-spike city (level 3): elongated landmark with a long axis; large forecourt + small apse plaza cleared at the two short ends; two parallel flanking rows form the close; organic radial fabric only beyond it; whole close rotated to a per-seed axis.
- This refines the frozen session-2 city grammar — propagate to the session-2 explorer + parameters once blessed (forward-only note: design register revised pre-consumption). The town/village/hamlet levels are unchanged. Reconciles the radial growth rule with parallel order: orderly close near the landmark, organic outskirts beyond — which is how real cathedral towns actually read.

### Settlement density scales with weight — 2026-06-13
- Practitioner: "sometimes there will be many more buildings, no?" Yes — building count/extent scales continuously with settlementWeight = ln(1 + Σ documents-edge strengths). The four size names (hamlet/village/town/city) are BANDS on that continuum: the band sets the STYLE (city → cathedral close + plazas + parallel flanks), the weight sets the COUNT/extent within it. ho-07 owns the weight→density mapping at placement; the spike shows one representative mid-city. (Ties to the parked ho-07 settlement-weight tuner — ln base immaterial, curve family + thresholds are the tuners.)
- Contour weights dropped again to 0.25 regular / 0.7 index (near the small-scale floor — below ~0.22 regular strokes start dropping out on the 45% plate).

## Session 4 — ridge (closed-with-park, 2026-06-23)

Two rounds. Neither produced a lock-in; the session closes with a known-good parametric primitive **parked for ho-08 to pick up or leave alone**, plus a durable register principle that survives regardless of which succession-carrier ho-08 chooses.

### Round 1 — A/B/C (rejected as posed)
- **A (field-true contours, saddle from f):** not a ridge — a *reframe* saying "the ridge is a placement decision, not a rendering mark." If peaks happen to sit close, the saddle emerges naturally; if not, succession is silent on the map. The "elder = taller stack of rings" directional cue also fails the schema: importance and `succeeded_by` are independent, so the taller peak isn't reliably the parent.
- **B (spine line + perpendicular hachures), C (forced-looking elongated connecting contours):** overlay marks not derived from f(x,y). Violates session-1's **"character from process, not decoration."** Off-register, both rejected.

### Round 2 — D/E/F under tightened bound
Re-prompted: the ridge MUST be a third contribution to f(x,y), every stroke must be a real level set of the summed field, directionality must emerge from the *shape* of the ridge term itself.
- **D (gaussian tube, constant cross-section, 30% peak max):** directionality from longitudinal height grade — too quiet to read at strength 0.30.
- **E (tapered cone, 50% peak max): the recommendation.** Cross-section tapers from wide-at-parent to narrow-at-child. Directionality lives in the *width function* — semantically clean, independent of importance and aspect.
- **F (asymmetric scarp, 70% peak max):** directionality from lateral aspect (one flank steeper than the other) — wrong axis. Aspect is sideways, not from-to.

Visual differences between D/E/F were subtle at the 400×400 viewBox because contour levels were normalized to each variant's own field max — the strength axis hid itself. The session's real deliverable is the **parametric primitive**, not the visual nuance; the SVGs are receipts that the primitive produces field-true contours.

### Register principle (durable — propagate to register page)

> **Relationship features either deform the field (third term in f) or are honest human-overlay marks like roads and trails. Fake-contour overlays — drawn ink that pretends to be a contour without being a level set of f — are off-register.**

Carries forward independent of which carrier ho-08 ultimately picks for succession, and independent of the rendering register (iso-contour vs. streamline).

### Tapered-spur primitive (parked, not locked in `field.js`)

For each `succeeded_by` edge:

```
ridge(x, y) = 0.50 · exp(−d⊥² / (2 · w(t)²))
```

where, along the segment between predecessor P and successor S:

- `t ∈ [0, 1]` — parameter along PS (0 at parent P, 1 at child S)
- `d⊥` — perpendicular distance from the point (x, y) to the segment
- `w(t) = 32 · (1 − 0.62 · t) + 11` — width tapers from ~32 at parent end to ~15 at child end
- ridge max = 0.50 × peak max (peaks specified as equal-height radial gaussians)

Add as a third term to f(x, y) alongside the two peak gaussians. Register-agnostic: produces a saddle / figure-eight in iso-contour rendering AND a streamline bow in gradient-flow rendering — same primitive, both visualizations show the lineage.

### Why parked, not locked

Session 4 ruled out *overlay-style ridge marks*. It did **not** decide that the ridge is the carrier of `succeeded_by`. Four candidates remain for **ho-08** to weigh:

1. **Placement pull** — successor laid out near predecessor; existing field/streamlines do the work; no new code in the field generator.
2. **Field deformation** — this tapered-spur primitive added to f along each `succeeded_by` edge.
3. **Roads / trails** (session 5, still to run) — human marks on terrain, semantically distinct from the field.
4. **Rivers** (parked back in session 2) — succession as directional flow, river-as-lineage.

ho-08 weighs all four against the chosen rendering register and commits. The primitive sits here ready, used or unused depending on that call. The SVG variants from Claude Design are not retained — the math is the spec; the pictures were illustrations.

### Propagated
- Register principle ("field-deform or honest overlay; no fake contours") → register page when next opened.
- Four-carrier candidate list → ho-08 (to be authored).
- Tapered-spur primitive → here only; not yet in `src/field.js`.
