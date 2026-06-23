You are doing bounded visual design exploration for a procedurally generated
topographic map. One question only in this session (two features, because they
must be distinguishable FROM EACH OTHER):

WHAT DOES A ROAD LOOK LIKE, AND WHAT DOES A TRAIL LOOK LIKE — AGAINST A
HACHURE GROUND?

Context (all you need): The map renders a body of creative work as pen-and-ink
cartography on cream paper — hand-surveyed atlas register. The rendering
register is STREAMLINE HACHURES, not contour lines: every peak radiates short
ink marks outward along the local gradient (downhill direction), with density
falling as distance from the summit grows. A faint iso-line layer structures
the elevation underneath, but the hachure ground is the dominant texture.

The register principle for relationship features (settled in the prior
session): features either deform the field (third term in f(x,y)) or are
honest human-overlay marks. Fake-contour overlays — drawn ink that pretends to
be a contour without being a level set of f — are off-register. Roads and
trails are the FIRST TEST CASE of "honest overlay": they are literal human
marks on the ground (paths cut into the surface, packed earth, ruts), and
therefore allowed to live as a separate ink layer on top of the field. The
question is what makes such an overlay read as HONEST (a thing the cartographer
drew because it's there) rather than DECORATIVE (a thing added for the look).

Two linear features exist:
- A ROAD runs from a settlement to the peak it documents. Real case: the
  settlement "Three Hours" has a road to the peak "Hōzō". Roads are the map's
  most common linear feature.
- A TRAIL climbs from a valley to a summit — it marks that the destination
  peak proves something about the origin. Real case: a trail climbs from the
  foot of "Hōzō" to the summit of the peak "Ho System". Trails are rarer and
  quieter than roads.

The road and the trail must (a) be distinguishable from each other at a
glance, and (b) coexist legibly with the hachure ground around them — they
neither vanish into the texture nor fight it.

Hard constraints:
- Output is inline SVG only. Self-contained, no external assets, no JS, no CSS
  beyond what lives in the SVG. Each variant in a 400×400 viewBox.
- Each variant must contain: one stand-in peak (a hachure starburst — see
  HACHURE STAND-IN below), one stand-in settlement (a small cluster of solid
  dark micro-blocks, ~6–10 blocks, optionally with one terracotta landmark
  block), one road, one trail. Optionally a faint iso ghost-line for elevation
  context.
- Palette: cream ground #FDFCF9, ink in warm grays (#6B6B6B to #2B2B2B);
  terracotta #9A5B3C is RESERVED for the settlement landmark (city-glyph). If
  you load terracotta onto a road, you must justify why diluting that
  reservation is worth it; default expectation is no.
- Both features must be procedurally reproducible: strokes with dash patterns,
  weights, casing (parallel lines), or repeated tick marks along a computed
  path. Nothing that can't be generated from a path.
- Roads and trails curve with terrain — they are not straight connectors.
- No labels, no typography, no arrows.

HACHURE STAND-IN — for each peak in the variant, render a starburst:
- Many short straight strokes, each ~6–12px long, stroke-width ~0.4–0.6px.
- Strokes radiate outward from the peak center along bearings around 360°.
- Density: dense near the summit (~40–60 strokes within 30px of center),
  thinning with distance. Implementation hint — emit strokes at successive
  radii with falling angular density, OR use jittered radial sampling. The
  look should read as "shaggy starburst," not "perfect rays."
- Add small jitter to angle (±15°) and length (±25%) so the field reads
  hand-drawn, not algorithmic.
- A peak's hachure field should fade out by ~150px from the summit.
- Optional: a very thin gray ghost iso-line (stroke 0.2px, ~30% opacity)
  encircling the peak base for elevation context.

Explore and deliver:
- 3 variants, labeled A–C, each with a one-line caption naming the choice it
  makes. Vary exactly these three axes:
  1. HACHURE-INTERFERENCE STRATEGY — how the road registers against the
     hachure noise: (a) road as a CLEARING where hachures are suppressed
     inside the road's footprint (negative-space lane, analogous to how
     labels carve clearings); (b) road as a cased double-line sitting on top
     of the hachures, the casing punching through; (c) road as a single
     high-contrast stroke that simply outweighs the hachures by ink weight.
  2. ROAD MARK — solid line vs cased double-line vs dashed; gray weight
     choice.
  3. TRAIL MARK vs the road — fine dashes vs dotted vs perpendicular tick
     marks along the path; weight and contrast strategy chosen to separate
     trail from road without copying the road's hachure-interference strategy.
- Then your recommendation: which variant lets a reader tell road from trail
  at a glance against the hachure ground, without a legend, and why — in 3
  sentences max.

Judging criteria (design toward these, in order):
1. Road and trail are never confusable, even at 60% scale.
2. Both read as old-map conventions a cartographer would recognize — honest
   overlays, not graphics.
3. Both survive the hachure interference — neither vanishes into the texture
   nor visually fights it. The interference strategy is the load-bearing
   choice here.
4. Ten roads on a busy map would organize it, not strangle it.

Out of scope — do not touch: JSON, data models, architecture, animation,
interactivity, ridges (parked at ho-08), typography, peak styling beyond the
hachure stand-in, settlement styling beyond stand-in. No fake-contour
overlays. If you have ideas about those, put them in one line at the end
under "parked" and stop.
