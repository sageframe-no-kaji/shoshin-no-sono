---
created: 2026-06-23
type: surfacings-log
project: shoshin-no-sono
ho: "A"
---

# ho-A — Surfacings

Post-closure observations against the ho-A arc (the hachure renderer fork — ho-A-6.0 and ho-A-6.1). The arc closed cleanly; these are forward-pointing notes for future hos, not retroactive edits to closed work.

## From Churchill, "Variety in Hachure" (read 2026-06-23, after ho-A-6.1 closed)

Reference: <https://churchillgeo.com/variety-in-hachure/>. Survey of hachure cartography from Cassini (1779) through Imhof and Bradford Washburn's Everest map (1988). Read after ho-A-6.1 closed; the article validates the architectural calls already made and surfaces three forward-pointing notes.

### The crystallizing sentence

> "Hachures capture *relief*, contours capture *height*."

This is the one-line justification for the register fork. Worth quoting in a header comment on `src/hachure-map.js` and/or in the project README's "what the cartography is doing" passage when that gets written. Articulates why the two layers are co-equal: they answer different questions about the same field.

### Swiss-tradition validation

Churchill names six hachure categories; the only continuous modern tradition is **Swiss** — "textural accentuation combined with shading and contours." That is exactly the architecture ho-A-6.1 committed to (independent iso/hachure layers, both can be active simultaneously). The historical canon arrived at the same answer from 250 years of practice; we arrived at it from first principles in a sidequest. Validation, not coincidence.

Canonical references for any future polish or visual-tuning pass:
- **Eduard Imhof** — Swiss cartographic tradition.
- **Bradford Washburn, Mount Everest map (1988)** — the canonical iso+hachure composite.
- **Tau Rho Alpha (USGS, 1988)** — oblique/3D hachure maps; relevant if the project ever explores the (currently out-of-scope) 3D oblique register Churchill names as "rarely used historically."

### ⚑ Surfacing 1 — Terrain-type-driven stroke variation (future ho)

The article's Norwegian example: "vertical strokes become fully straight to show marshy, flat land." Implies a hachure stroke pattern can carry a *terrain-class* signal, not just slope and aspect. Our current renderer reads slope only.

In this project's grammar, "terrain class" could mean:
- Theme cluster (works in the same theme could share a stroke convention)
- Importance band (top-importance peaks get a different stroke character than mid)
- Relationship density (peaks with many edges sit in differently-stroked terrain than isolated ones)

Not a code change to schedule. A surfacing for whoever authors a future hachure-tuning ho, or for ho-08 when relationship-features-as-terrain becomes concrete.

### ⚑ Surfacing 2 — Colonial-aesthetics caution (project-level, not ho-scoped)

Churchill explicitly warns against "unthinking replication" of hachure styles designed for colonial exploitation, urging consideration of "value judgements that those artistic decisions represent."

Worth making explicit (in the README when next opened, or in a future essay-phase doc): this project's register consciously borrows the *technique* of hand-surveyed atlas cartography while inventing its own *symbol grammar* — peaks-as-works, cities-as-major-works, hachure-as-field-gradient, settlements-as-writing-clusters. The move isn't colonial mimicry but a deliberate adaptation of a visual language to encode an epistemology of practice. The seed already implies this stance; the README should name it.

### ⚑ Surfacing 3 — Caterpillar lineage (naming, not change)

Our starburst-around-each-peak pattern is closer to Churchill's **caterpillar** category (mountain-chain outlines, common in 19th-century colonial and railroad maps) than to Swiss textural shading. That's not wrong — caterpillar is honest about peaks-as-discrete-objects, which is what our data model holds. Worth naming the lineage rather than letting it sit unconscious; a footer credit in the cartography-page lede or the README can do this in one line ("hachure register draws on the caterpillar / Swiss hybrid tradition; see references").

## Practitioner-dropped references

- `design/Upolu_map_US_Ex._Ex._1839_cropped-1024x811.jpg` — Samoan island survey plate from the US Exploring Expedition (1839). Dense radial hachures around peaks; close to what our renderer produces. Untracked at time of logging; commit if kept as a working reference.
