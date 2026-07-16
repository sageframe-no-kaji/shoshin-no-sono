You are doing bounded visual design exploration for a procedurally generated
topographic map. One question only in this session:

HOW DOES A RANGE DRAW?

(Session 10. Runs AFTER the succession-carrier Think — families claim the
massif/ridge vocabulary, and the Think confirms what succession takes instead.
The data has landed: works.json carries ten real families with closeness,
nesting, and sibling anchors. This session gives that data its marks.)

Context (all you need): The map renders a body of creative work as pen-and-ink
cartography on cream paper — hand-surveyed atlas register. Streamline hachures
carry relief; faint iso-lines structure elevation; the landmass is bounded by
a sea with a fine ink coastline and engraved wave-combs. PEAKS are works
(height = importance, 1–10); TOWNS are the writing, settled at the foot of
what they document; TRAILS climb from town to documented peak; ROADS join
companions; a small amber BEACON burns at each summit. A cartouche and a face
key sit in open water (sessions 8–9, locked). Until now every peak stood
alone. The new fact: peaks belong to RANGES.

The range system (real data, schema v5.1/5.2):
- A family = a named range. Its `closeness` sets how tightly it binds,
  tightest → loosest: bonded | shared-code | suite | kindred. The working
  mapping to explore: massif / shared ridge / named range / scattered hills.
- Roles within a range: 'peak' = independent summit; 'sub-peak' = drawn
  nested against its summit — subordination that height cannot express. A
  sub-peak normally nests against the family summit (`peak_id`); `peak_of`
  anchors it to a named sibling instead.
- Ranges nest one level: a parent range holds child ranges.
- Each range has a name (some carry kanji: Shōjiki 正直, Nen 念, Kekkai 結界)
  and will carry a color used ONLY by its beacons (beacon color matches the
  range — the single licensed color signal; the ink register does not change
  per range).

Real test cases (design against these four; they span the space):
1. Kanyō — bonded, two works: kanyo (summit, height 7) + kanyo-viewer
   (sub-peak, 4). The tightest bind: one thing and its public face.
2. Kekkai 結界 — suite, seven works: three PEER summits (sutra 9, shodō 9,
   interference 9) plus four satellites (7, 6, 6, 4) anchored around
   interference alone via peak_of. Peer summits must read as equals; the
   cluster must read as interference's, not the range's.
3. Kṣetra-Ops — a PARENT range holding two children: Shōjiki 正直 (palana
   summit 3, forteller + sageframe-mcp sub-peaks 3, sharibako peak 3) and
   Nen 念 (hozo summit 7, sage-zfs peak 4). Low peaks, real structure: the
   parent must read as one named territory containing two named groups.
4. Sageframe — suite, the map's tallest summit (10) with two sub-peaks
   (keisaku 7, shoshin-no-sono 6). Prestige case: the range that holds the
   id-10 peak must not read as decoration around it.

Hard constraints:
- Output is inline SVG only. Self-contained, system font-stacks only (serif
  character welcome; flag any webfont desire as one line, don't embed). Each
  variant in a 480×300 viewBox.
- Palette: cream ground #FDFCF9, ink in warm grays (#6B6B6B to #2B2B2B).
  Beacon amber #D4952A stays the DEFAULT beacon color; show range-colored
  beacons in at most ONE variant, as muted earth-register hues (state the
  hexes), never saturated UI color.
- The marks must be generable by the same renderers that draw the map —
  hachures, iso-lines, fine ink lines, small type. No gradients, no fills
  that read as screen tints, no ornament (ornament is licensed to the
  cartouche alone).
- No fake-semantic marks. On this map horizontal distance encodes nothing —
  EXCEPT, newly, within-range proximity: members of a range are drawn
  together, and closeness drives how together. That is the one spatial
  semantic being added; do not invent others (no borders-as-territories, no
  shaded regions claiming land area).
- Range NAMES follow classical atlas practice: the map label register
  (Spectral-class serif), letterspaced, following the range's spine — and
  subordinate to work labels at reading distance. A range name is read
  second, never first.
- Nesting (Kṣetra-Ops) may use name hierarchy and grouping only — parent
  name larger-tracked and quieter, children tighter — never enclosure lines.

Explore and deliver:
- 3 variants, labeled A–C, each with a one-line caption naming the choice it
  makes. Each variant draws ALL FOUR test cases side by side in its 480×300
  frame (small vignettes are fine; the comparison is the point). Vary exactly
  these three axes:
  1. BINDING — how closeness draws: shared hachure field vs connecting
     ridge-line vs pure proximity-with-name; how the four closeness grades
     stay distinguishable.
  2. SUBORDINATION — how a sub-peak nests against its anchor (shoulder on
     the flank, shared contour skirt, reduced own-contours) and how a
     peak_of cluster gathers around one peer summit without capturing its
     equals.
  3. NAMING + BEACONS — where the range name runs (arced along the spine vs
     straight beneath vs beside), how parent/child names rank, and default
     amber vs range-colored beacons in exactly one variant.
- Then your recommendation: which variant reads as one geology rather than
  grouped icons, and why, in 3 sentences max.

Judging criteria (design toward these):
1. A range reads as ONE landform event: members belong together at a glance,
   before the name is read.
2. The four closeness grades are tellable apart without the key.
3. Peer summits stay peers; sub-peaks are unmistakably subordinate; the
   Kekkai cluster belongs to interference without demoting sutra or shodō.
4. Kṣetra-Ops reads as a territory containing two named groups — and a
   rangeless peak (satori, pink-teaming) still reads as a complete,
   ungrouped mountain beside all this.
5. The register holds: at arm's length the map still looks hand-surveyed,
   not diagrammed.

Out of scope — do not touch: the succession carrier (the Think owns it),
rivers, the CI mountain's city and the monastery mark (their own sessions),
the verso, the cartouche and key, animation/emergence, JSON and data models,
placement algorithms (assume the field can pull range members adjacent; how
is implementation). If you have ideas about those, put them in one line at
the end under "parked" and stop.
