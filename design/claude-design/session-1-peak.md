You are doing bounded visual design exploration for a procedurally generated
topographic map. One question only in this session:

WHAT DOES A SINGLE PEAK LOOK LIKE?

Context (all you need): The map renders a body of creative work as pen-and-ink
cartography — peaks on cream paper, in the register of a hand-surveyed
topographic map from an old atlas. Peaks are drawn as nested closed contour
lines (iso-elevation rings). This session establishes the drawing style of one
peak, nothing else.

Hard constraints:
- Output is inline SVG only. Self-contained, no external assets, no JS, no CSS
  beyond what lives in the SVG. Each variant in a 400×400 viewBox.
- Palette: cream ground #FDFCF9, ink in warm grays (#6B6B6B to #2B2B2B range).
  No other color. No gradients, no filters, no 3D shading, no drop shadows.
- The style must be procedurally reproducible: everything you do must be
  achievable by a pipeline that draws nested, non-crossing closed paths with
  stroke styling (weight, dash, opacity, slight wobble). If a beautiful effect
  can't be generated from contour paths, don't use it.
- No labels, no typography, no numbers — type is a later session.
- No terrain around the peak, no neighbors, no relationships — one peak, alone.

Explore and deliver:
- 4 variants, side by side on one cream HTML page, labeled A–D, each with a
  one-line caption naming the choice it makes. Vary exactly these axes:
  contour spacing (tight vs generous), line-weight rhythm (uniform vs every
  5th contour heavier, like a real index contour), edge character (clean
  ellipses vs organic hand-wobble), and density (how many rings before the
  summit).
- Then your recommendation: which variant reads most like a hand-drawn survey
  and least like a data visualization, and why, in 3 sentences max.

Judging criteria (design toward these):
1. At arm's length it reads instantly as "a mountain on an old map."
2. It looks drawn by a careful hand, not plotted by a library.
3. It survives shrinking to 80×80 px without becoming noise.

Out of scope, do not touch: JSON, data models, architecture, animation,
interactivity, multiple peaks, towns, ridges, color accents, typography.
If you have ideas about those, put them in one line at the end under
"parked" and stop.
