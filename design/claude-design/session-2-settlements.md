You are doing bounded visual design exploration for a procedurally generated
topographic map. One question only in this session:

WHAT DOES A SETTLEMENT LOOK LIKE AT FOUR SIZES?

Context (all you need): The map renders a body of creative work as pen-and-ink
cartography on cream paper — hand-surveyed atlas register. Peaks (drawn
elsewhere as nested contour lines) are the works; settlements are the writing
about the works. A settlement has exactly four sizes: hamlet, village, town,
city. This session establishes how a settlement is drawn and how the four
sizes read as a clear progression, nothing else.

Hard constraints:
- Output is inline SVG only. Self-contained, no external assets, no JS, no CSS
  beyond what lives in the SVG. Each variant row in a 400×120 viewBox showing
  all four sizes left to right.
- Palette: cream ground #FDFCF9, ink in warm grays (#6B6B6B to #2B2B2B), plus
  ONE accent now permitted: terracotta #9A5B3C. The accent belongs to
  settlements — use it deliberately or not at all. No other color, no
  gradients, no filters, no shading.
- The style must be procedurally reproducible: a pipeline must be able to
  generate each size from simple primitives (small shapes, clusters, strokes)
  parameterized by size level. No hand illustration that can't be generated.
- No labels, no typography — type is a later session.
- No terrain context, no roads, no peaks — settlements alone on cream.

Explore and deliver:
- 3 variant rows, labeled A–C, each showing hamlet → village → town → city,
  each with a one-line caption naming the choice it makes. Vary exactly these
  axes: the settlement primitive (dots/squares cluster vs tiny building forms
  vs hatched block), how growth reads (more units vs larger units vs denser
  units), and the role of terracotta (fill vs outline vs absent).
- Then your recommendation: which row makes the four sizes instantly
  distinguishable from each other at a glance, and why, in 3 sentences max.

Judging criteria (design toward these):
1. A reader can rank any two settlements by size without thinking.
2. It reads as cartography, not as a chart legend.
3. The hamlet survives at 12×12 px; the city doesn't overwhelm a peak.

Out of scope, do not touch: JSON, data models, architecture, animation,
interactivity, peaks, roads, ridges, typography, what settlements "mean."
If you have ideas about those, put them in one line at the end under
"parked" and stop.


Provide sliders for parameters. Keep the parameters minimal; but of high impact.
