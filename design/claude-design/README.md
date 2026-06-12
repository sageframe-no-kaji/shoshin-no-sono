# Claude Design pull-off — ho-04 visual register sessions

Six bounded sessions, one visual question each. This directory is the export
surface: each `session-*.md` file is a complete, self-contained prompt — upload
or paste exactly one per Claude Design conversation, with **no other context**.
The bounded prompt is the discipline; giving it works.json, the schema, or the
Kamae chain invites the scope creep the bounding exists to prevent.

## Protocol per session

1. New Claude Design conversation. Give it one session file. Nothing else.
2. It returns an HTML page of labeled SVG variants plus a recommendation.
3. Judge the variants **at 80px as well as full size** — the decision-trigger
   checkpoint after ho-04 asks whether the register reads at planned scale.
4. Save the winning variant (and the rejected ones, marked rejected) into
   `design/visual-register.html` — that file is ho-04's deliverable.
5. Anything the session puts under "parked" gets one line in the ho-04
   surfacings log, not a follow-up in the same conversation.

## Session order

| # | File | Question | New element allowed |
|---|---|---|---|
| 1 | `session-1-peak.md` | What does a single peak look like? | — |
| 2 | `session-2-settlements.md` | A settlement at four sizes? | terracotta accent |
| 3 | `session-3-typography.md` | Labels, place names, native script? | type |
| 4 | `session-4-ridge.md` | A ridge between two peaks? | — |
| 5 | `session-5-road-and-trail.md` | A road vs a trail? | — |
| 6 | `session-6-cartouche.md` | The cartouche? | ornament |

Sessions 1→2→3 commit the alphabet (terrain, settlement, type); 4→5 commit the
relationship features; 6 closes with the map's signature. Later sessions name
the earlier winners only by reference ("use a simple nested-contour peak") —
they deliberately do not restyle them.
