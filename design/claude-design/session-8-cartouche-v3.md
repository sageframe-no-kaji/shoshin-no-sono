You are doing bounded visual design exploration for a procedurally generated
topographic map. One question only in this session:

WHAT DOES THE CARTOUCHE LOOK LIKE?

(v3 of the cartouche prompt. Supersedes session-6-cartouche-v2.md — renumbered
to session 8 per the SURFACINGS numbering reconciliation, and updated for the
one thing that changed since v2 was authored: the map now has a sea.)

Context (all you need): The map renders a body of creative work as pen-and-ink
cartography on cream paper — hand-surveyed atlas register. The rendering
register is STREAMLINE HACHURES (every peak radiates short ink marks outward
along the local gradient; faint iso-lines structure elevation underneath),
and the landmass is now bounded by a SEA: a fine ink coastline, then open
water textured with engraved wave-combs — crest lines running parallel to the
shore, each carrying a feathered comb of fine hair-strokes (session 7). The
cartouche is the map's title block: the one place on the map where ornament
is allowed. It sits in a corner of the rendered map — and with the sea in
place, that corner is almost certainly OPEN WATER, which is where real chart
cartouches live; the plate will reserve generous sea border for it. It signs
the territory. This session establishes its layout and ornament, nothing else.

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
  scale. Because it will sit ON open water, consider how it meets the wave
  texture around it: a clean cream reserve (the clearing-as-paint-over
  mechanism the whole register uses) is the default assumption — the waves
  part around the cartouche, they do not run beneath it.
- The native script (初心の園) leads — it is the largest element.
- OPTIONAL REGISTER REFERENCE: the cartouche may incorporate a small sample
  of the map's register as a decorative element — a few short hachure-style
  strokes at a corner, OR a small wave-comb fragment (a crest line with a few
  feathered hair-strokes) — signing "this is the kind of map this is." It
  must read as a SAMPLE of the surrounding map, not decorative repetition.
  Treat as an optional design lever, not a requirement. If included, render
  at the same character as the main map: hachures ~6–12px strokes at
  0.4–0.6px weight; wave-combs as one thin crest with 4–8 fine feather
  strokes; warm gray ink, slight jitter so it reads hand-drawn.

Explore and deliver:
- 3 variants, labeled A–C, each with a one-line caption naming the choice it
  makes. Vary exactly these three axes:
  1. FRAME TREATMENT — open/unframed vs thin double-rule box vs partial
     corner rules.
  2. FOUR-LINE HIERARCHY — size ratios and spacing across the four lines.
  3. ACCENT AND REGISTER REFERENCE — terracotta rule vs small seal-like mark
     vs none; with a hachure sample, a wave-comb sample, or neither.
- Then your recommendation: which variant signs the map with quiet authority —
  atlas, not poster — and why, in 3 sentences max.

Judging criteria (design toward these):
1. It reads as the title block of a serious survey map.
2. The Japanese leads with dignity; the English supports; the tagline whispers.
3. It still works at half size in a map corner without stealing the territory.
4. Sitting on open water, it holds its edge against the wave texture — the
   cream reserve reads as deliberate, not as a hole in the sea.
5. If a register sample is used, it harmonizes with the surrounding map
   without competing for attention or doubling the cartouche's visual weight.

Out of scope — do not touch: JSON, data models, architecture, animation,
interactivity, peaks (beyond a register sample if used), settlements, roads,
ridges, the sea itself. If you have ideas about those, put them in one line at
the end under "parked" and stop.
