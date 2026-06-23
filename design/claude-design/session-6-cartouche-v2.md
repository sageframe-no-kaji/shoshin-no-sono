You are doing bounded visual design exploration for a procedurally generated
topographic map. One question only in this session:

WHAT DOES THE CARTOUCHE LOOK LIKE?

Context (all you need): The map renders a body of creative work as pen-and-ink
cartography on cream paper — hand-surveyed atlas register. The rendering
register is STREAMLINE HACHURES (every peak radiates short ink marks outward
along the local gradient; faint iso-lines structure elevation underneath).
The cartouche is the map's title block: the one place on the map where
ornament is allowed. It sits in a corner of the rendered map and signs the
territory. This session establishes its layout and ornament, nothing else.

Real content (use exactly this, in this hierarchy):
1. 初心の園
2. Shoshin no Sono
3. The Garden of Beginner's Mind
4. An epistemology of learning, creation, and craft. The garden has gates on
   every side.

Hard constraints:
- Output is inline SVG only. Self-contained, no external font files — system
  font-stacks only (serif character welcome; flag any webfont desire as one
  line, don't embed). Each variant in a 320×200 viewBox.
- Palette: cream ground #FDFCF9, ink in warm grays (#6B6B6B to #2B2B2B);
  terracotta #9A5B3C permitted as a small accent (a rule, a seal, a single
  flourish) — not as a fill.
- Ornament is allowed HERE ONLY, and it is period-appropriate: rules, corner
  flourishes, a thin double border, an engraved-style frame. No filigree
  explosion, no clip art, no gradients, no filters.
- The cartouche must be procedurally placeable: a self-contained SVG group
  with a fixed aspect ratio the pipeline drops into a map corner at variable
  scale.
- The native script (初心の園) leads — it is the largest element.
- OPTIONAL REGISTER REFERENCE: the cartouche may incorporate a small sample
  of the hachure texture as a decorative element — a few short hachure-style
  strokes at a corner or as a quiet element within the title block. If used,
  it must read as a SAMPLE of the surrounding map signing "this is the kind
  of map this is" — not as decorative repetition. Treat as an optional design
  lever, not a requirement. If included, render the hachure sample at the
  same character as the main map: ~6–12px strokes, 0.4–0.6px stroke-width,
  warm gray ink, with slight angle and length jitter so it reads hand-drawn.

Explore and deliver:
- 3 variants, labeled A–C, each with a one-line caption naming the choice it
  makes. Vary exactly these three axes:
  1. FRAME TREATMENT — open/unframed vs thin double-rule box vs partial
     corner rules.
  2. FOUR-LINE HIERARCHY — size ratios and spacing across the four lines.
  3. ACCENT AND REGISTER REFERENCE — terracotta rule vs small seal-like mark
     vs none; with or without a hachure-texture sample.
- Then your recommendation: which variant signs the map with quiet authority —
  atlas, not poster — and why, in 3 sentences max.

Judging criteria (design toward these):
1. It reads as the title block of a serious survey map.
2. The Japanese leads with dignity; the English supports; the tagline whispers.
3. It still works at half size in a map corner without stealing the territory.
4. If a hachure sample is used, it harmonizes with the surrounding map's
   register without competing for attention or doubling the cartouche's
   visual weight.

Out of scope — do not touch: JSON, data models, architecture, animation,
interactivity, peaks (beyond a hachure sample if used), settlements, roads,
ridges, the map itself. If you have ideas about those, put them in one line at
the end under "parked" and stop.
