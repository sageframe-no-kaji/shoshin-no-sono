You are doing bounded visual design exploration for a procedurally generated
topographic map. One question only in this session:

WHAT DOES A RIDGE BETWEEN TWO PEAKS LOOK LIKE?

Context (all you need): The map renders a body of creative work as pen-and-ink
cartography on cream paper — hand-surveyed atlas register. Peaks are works,
drawn as nested closed contour lines. A ridge connects a parent peak to a
child peak that descends from it — lineage as terrain. The real pair to draw:
the peak "Kinhin" descends from the peak "Kanyō". The ridge must carry a
subtle sense of direction (which end is the parent) without arrows or labels.
This session establishes the ridge, nothing else.

Hard constraints:
- Output is inline SVG only. Self-contained, no external assets, no JS, no CSS
  beyond what lives in the SVG. Each variant in a 400×400 viewBox.
- Palette: cream ground #FDFCF9, ink in warm grays (#6B6B6B to #2B2B2B). No
  other color, no gradients, no filters, no shading.
- Draw the two peaks as simple nested-contour forms (4-6 rings each, parent
  slightly larger) — do NOT restyle peaks; they were designed in an earlier
  session and your simple version is a stand-in. All design attention goes to
  the ridge.
- The ridge must be procedurally reproducible: a pipeline drawing strokes/
  short hatch marks along a computed path between two peak positions. No
  effect that can't be generated from a path plus repeated marks.
- No labels, no typography, no arrows.

Explore and deliver:
- 3 variants, labeled A–C, each with a one-line caption naming the choice it
  makes. Vary exactly these axes: the ridge mark (a contour-pinch/saddle
  between the peaks vs a spine line with perpendicular hachure ticks vs
  elongated connecting contours), directionality cue (taper toward the child
  vs hachure density falling toward the child vs none), and weight relative
  to the peaks' contours (ridge quieter vs equal).
- Then your recommendation: which variant reads as "these two mountains are
  one range, and that one is the elder," and why, in 3 sentences max.

Judging criteria (design toward these):
1. The connection reads as landform, not as a graph edge between nodes.
2. A careful reader senses parent → child; a casual reader just sees a range.
3. Three ridges crossing a map would texture it, not clutter it.

Out of scope, do not touch: JSON, data models, architecture, animation,
interactivity, settlements, roads, trails, typography, peak styling beyond
the stand-in. If you have ideas about those, put them in one line at the end
under "parked" and stop.
