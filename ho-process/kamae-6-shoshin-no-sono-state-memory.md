---
created: 2026-07-09
type: state-memory
project: shoshin-no-sono
kamae: 6
status: living
---

# Shoshin no Sono — State Memory (Kamae 6)

This file is the build's living cross-session memory: hot, mutable, and non-canonical. It is read first by any fresh session to reconstitute build state without opening code. The cold record (git log, per-ho Reflect phases in `ho-process/hos/`, the build record on the K4 overview) wins in every conflict; this file is a fast-pickup cache derived from and subordinate to that record.

---

**STATE-SUMMARY**

- **COMPLETED** — The 2026-07-10/11 stretch, three arcs on `labs` (23 commits, `791720f..e31e6d9`, every one green through the full stack; tests 291 → 383). (1) *Repo hygiene:* whole-repo review; shared `src/register.js` (frozen colors, one source); `cartography-page.js` pure logic extracted into tested modules (`label-map.js`, `beacon-map.js`, edge assembly into the Cartographer) — the page is genuinely wiring again; README brought current; an entangled working tree untangled into honest atomic history. (2) *Chain amendment:* ho-08.5 (the verso — the back of the map; gazetteer, legend, colophon; subsumes the ho-03 grid) inserted into K4 and authored as a per-ho document, blocked on ho-08 close. (3) *ho-08 feature + sea arc*, practitioner-on-the-plate: terrain-routed roads (`companion_to`) and trails (`documents` + `validates` hiking trails; roads eat trails, minimal separation); the sea as a field-level datum (the shore is ZERO); coast ruggedness (islands, inlets, seeded); hachure shore fade with cliff exception; coastal-plain iso gap; and the sea's marks from design **Session 7** (run and locked 2026-07-11; artifact banked in `design/claude-design/exports/session-7-ocean-waves/`). All panel landings locked as defaults; `ho-process/hos/ho-08-relationship-features.md` authored at the banking pass; SURFACINGS carries the session-7 entry, the ho-08 register amendments, and the session-numbering reconciliation (project numbering adopted; cartouche = session 8).

- **NEXT** — The cartouche design session first (session 8 — v3 prompt at `design/claude-design/session-8-cartouche-v3.md`, updated for the sea; unblocked). Then the succession-carrier decision, now JOINED with the incoming family/range system (schema v5 landed 2026-07-11: `family`/`peak` on works, top-level `families` with `closeness` bonded|shared-code|suite|kindred → massif / shared ridge / named range / scattered): families claim the massif/ridge vocabulary, which reshapes which of session 4's four candidates (placement pull, tapered-spur field primitive, roads/trails, rivers) succession should take — one Think conversation for both. Then the `paired_with` twin-peaks call, ho-08 close, verso sessions, ho-08.5, ho-09.

- **ACTION ITEMS / BLOCKS** — (a) `huaraches` cleanup still open from the ho-A closeout: package-lock drift on the worktree (`~/.supacode/repos/shoshin-no-sono/huaraches`, locked under supacode) and the stale branch — practitioner's call. (b) ~~Phase 3 Reflect for ho-A-6.1~~ — RESOLVED before this stretch (`cb8b74e`, status complete); the previous K6 entry was stale on this. (c) README Kamae-3 pass queued at ho-08.5 close (it still describes the grid). (d) `oneTownSvg` is the last page function with non-trivial arithmetic — extraction follow-up, flagged. (e) At ho-08 close, decide: route-over-islet edge case, drowned-works-under-filter semantics, road weight × settlement size (parked since session 6). (f) Family data is COMING from keisaku's glean manifest — schema v5 and validator rules are in place and tolerant; the works.json update (family assignments + the new relationships the practitioner flagged) lands when the practitioner hands it over; the cartographic rendering of families (grouped peaks, sub-peak nesting, named ranges) is unscoped ho work entangled with the succession decision. (g) When the map is captured on an actual page (ho-09/ship era): reserve MORE sea border — the cartouche lives in open water and the current frame is tight. No blocks.

- **PROJECT LIFECYCLE** — dev

_Refreshed 2026-07-11 at the ho-08 banking pass. Previous entry (seeded 2026-07-09) was stale on NEXT (pointed at ho-07.1, long done) and on the ho-A-6.1 Reflect (already written)._
