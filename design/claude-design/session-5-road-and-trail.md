You are doing bounded visual design exploration for a procedurally generated
topographic map. One question only in this session (two features, because they
must be distinguishable FROM EACH OTHER):

WHAT DOES A ROAD LOOK LIKE, AND WHAT DOES A TRAIL LOOK LIKE?

Context (all you need): The map renders a body of creative work as pen-and-ink
cartography on cream paper — hand-surveyed atlas register. Peaks are works
(nested contour lines); settlements are the writing about them. Two linear
features exist:
- A ROAD runs from a settlement to the peak it documents. Real case: the
  settlement "Three Hours" has a road to the peak "Hōzō". Roads are the map's
  most common linear feature.
- A TRAIL climbs from a valley to a summit — it marks that the destination
  peak proves something about the origin. Real case: a trail climbs from the
  foot of "Hōzō" to the summit of the peak "Ho System". Trails are rarer and
  quieter than roads.
This session establishes both marks and the contrast between them, nothing else.

Hard constraints:
- Output is inline SVG only. Self-contained, no external assets, no JS, no CSS
  beyond what lives in the SVG. Each variant in a 400×400 viewBox containing
  one simple stand-in peak (nested contours), one stand-in settlement (small
  cluster), one road, one trail.
- Palette: cream ground #FDFCF9, ink in warm grays (#6B6B6B to #2B2B2B);
  terracotta #9A5B3C permitted — it is the settlement accent, so if anything
  carries it here, it is the road. No other color, no gradients, no filters.
- Both features must be procedurally reproducible: strokes with dash patterns,
  weights, casing (parallel lines), or repeated tick marks along a computed
  path. Nothing that can't be generated from a path.
- Roads and trails curve with terrain — they are not straight connectors.
- No labels, no typography, no arrows.

Explore and deliver:
- 3 variants, labeled A–C, each with a one-line caption naming the choice it
  makes. Vary exactly these axes: the road mark (solid vs cased double-line vs
  dashed, terracotta vs gray), the trail mark (fine dashes vs dotted vs tick
  marks), and the contrast strategy between them (color vs weight vs pattern).
- Then your recommendation: which variant lets a reader tell road from trail
  at a glance without a legend, and why, in 3 sentences max.

Judging criteria (design toward these):
1. Road and trail are never confusable, even at 60% scale.
2. Both read as old-map conventions a cartographer would recognize.
3. Ten roads on a busy map would organize it, not strangle it.

Out of scope, do not touch: JSON, data models, architecture, animation,
interactivity, ridges, typography, restyling peaks or settlements beyond
stand-ins. If you have ideas about those, put them in one line at the end
under "parked" and stop.
