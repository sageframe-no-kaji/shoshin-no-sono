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
