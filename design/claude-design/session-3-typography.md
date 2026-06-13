You are doing bounded visual design exploration for a procedurally generated
topographic map. One question only in this session:

WHAT DOES THE MAP'S TYPOGRAPHY LOOK LIKE?

Context (all you need): The map renders a body of creative work as pen-and-ink
cartography on cream paper — hand-surveyed atlas register. Three text roles
exist on the map: (1) place names for peaks, which pair a latin name with a
native-script gloss; (2) place names for settlements (latin only, smaller);
(3) occasional small elevation figures. This is the only session in the
project allowed to use type. It establishes the type system, nothing else.

Real content to design with (use exactly these):
- Peak names with native script: Kanyō 観鷹 · Hōzō 宝蔵 · Dandori 段取り ·
  Ho System 歩
- Peak name, latin only: Glassroom
- Settlement names: Three Hours · The Empty Container
- One elevation figure: 8

Hard constraints:
- The typeface is already chosen: Spectral (with Georgia, serif as the honest
  fallback) — it is the register's established face, used in sessions 1 and 2.
  Do NOT pick or explore a new typeface. Design the type SYSTEM within Spectral:
  sizes, weights, italics, letter-spacing, case, and the latin/native-script
  pairing. The latin uses Spectral; the native script uses a CJK system stack
  (e.g. "Hiragino Mincho ProN", "Yu Mincho", serif) chosen to sit with Spectral.
- Output is inline SVG only, self-contained, no embedded font files.
- Palette: ink in warm grays (#6B6B6B to #2B2B2B) on cream #FDFCF9. Terracotta
  #9A5B3C permitted for settlement names only if it earns it. No other color.
- Native script sits beside or below the latin name — design the pairing
  (size ratio, baseline relationship, spacing). The native script is a
  presence, not a decoration; it also must not shout.
- The system must be procedurally reproducible: positions, sizes, and styles a
  pipeline can apply per label class. Letter-spacing, small caps, and case
  conventions are fine; hand-lettering effects are not.

Explore and deliver:
- 3 variants, labeled A–C, each a 400×400 cream panel showing all three text
  roles using the real content above, each with a one-line caption naming the
  choice it makes. Vary exactly these axes: serif character (bookish vs
  engraved feel via the stack and letter-spacing), the latin/native-script
  pairing (beside vs below, size ratio), and label hierarchy (how peak names,
  settlement names, and elevation figures differ in size/case/weight).
- Then your recommendation: which variant reads as an old survey map's
  lettering while keeping the native script dignified, and why, 3 sentences.
- Legibility check only (do not redesign anything): in the recommended variant,
  show one peak label over a faint gray contour-line fragment and one settlement
  label beside a small solid ink block, to confirm the type holds against
  linework. The peak/settlement marks are faint stand-ins for legibility — not
  to be styled or developed here.

Judging criteria (design toward these):
1. Peak names read first, settlements second, figures last — without boxes or
   color doing the work.
2. The native script reads as belonging, not annotating.
3. Settlement names stay legible at 60% scale.

Out of scope, do not touch: JSON, data models, architecture, animation,
interactivity, peaks' contour styling, settlement shapes, roads, the
cartouche (its lettering is a later session). If you have ideas about those,
put them in one line at the end under "parked" and stop.
