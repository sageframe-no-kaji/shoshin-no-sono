---
created: 2026-06-12
status: ready
type: ho-document
project: shoshin-no-sono
ho: "02"
kamae: 5
shape: ha
builds-on:
  - kamae/kamae-2-shoshin-no-sono-system-design.md
  - kamae/kamae-4-shoshin-no-sono-ho-overview.md
  - ho-process/hos/ho-01-surfacings.md
  - ho-process/hos/ho-01.5-environment-scaffold.md
---

# ho-02 — The Indexer

The Indexer makes the data model operational: it loads `works.json` once per page session, builds the derived structures every downstream component depends on (inverse edge index, settlement weights, membership sets), and exposes the query API the Cartographer and Garden Gate call. Nothing renders in this ho. Done means the queries return correct answers — in the test suite and in the browser console on the preview URL.

The System Design draws the boundary this module must hold: **the Indexer is the only component that knows the on-disk data shape.** Schema changes get absorbed here; downstream components see query results, never raw JSON.

**Depends on:** ho-01.5 (scaffold and verification stack in place).

**Out of scope:** Any rendering or UI (ho-03+). The filter-relevance pass — full peak / partial / background / excluded under an active filter is the Cartographer's first pipeline stage (ho-05), not a query. Settlement-size *levels* (hamlet→city mapping, ho-07). Any change to `works.json` or `schema.json`.

---

## Phase 1 — Think

### Decision 1 — Module pattern: a pure factory, with loading separated from construction.

`createIndexer(data)` takes parsed JSON and returns a frozen query object. A thin `loadWorks(url)` helper does the fetch. Why: pure construction means the entire index is testable from fixtures with no network and no DOM; the fetch isolates the only I/O to one function. No singleton, no module-level state — the Cartographer and Gate receive an instance. "Hot-reloadable during development" (the overview's phrase) resolves as: re-fetch, re-construct, re-assign — which a page refresh does for free under native ESM.

### Decision 2 — Query API: the System Design's seven calls, plus the group/status accessors the grid view already needs.

From the System Design: `getWork(id)`, `getIncoming(id, edgeType?)`, `getOutgoing(id, edgeType?)`, `worksByTheme(theme)`, `worksByMedia(media)`, `settlementWeight(workId)`, `articulatesEdge(fromId, toId, type)`.

Added: `works()` (all entries), `groups()` (work_groups ordered by `number`), `worksByGroup(groupId)` (ordered by `sort_order_within_group`), `worksByStatus(status)`. Why: ho-03's grid renders sections by work_group with theme/media/status filter chips — those access patterns are knowable now, and adding them here saves the grid from reaching around the Indexer into raw JSON, which the boundary forbids. Nothing speculative beyond that: no general query combinator until ho-03's real call sites exist (see deferred discovery).

All returns are read-only views; the factory freezes what it hands out. Edge query results carry `{source, target, type, strength, articulated_in, note, declaredOn}`.

### Decision 3 — Symmetric and inverse edge types are normalized inside the index; declaration location is invisible to callers.

The schema stores symmetric types (`paired_with`, `companion_to`) once, on either endpoint, and stores succession as either `succeeded_by` or `succeeds` with the renderer inferring the inverse. The Indexer absorbs both conventions at build time:

- Symmetric types: the edge surfaces from **both** endpoints via `getOutgoing` *and* `getIncoming` (Satori⇄Glassroom answers from either id). `declaredOn` records where it was authored.
- Succession: normalized to canonical `succeeded_by` direction at build; a query for either type name answers consistently.

Why: "declare once, treat bidirectional" is a *storage* economy, and storage details are exactly what this component exists to hide. If downstream code had to check both directions, the boundary would have already failed. This is also where ho-01's real data exercises the rule: works.json carries two symmetric pairs and one `succeeded_by`, declared on one side each.

### Decision 4 — `settlementWeight(workId)` returns `Math.log(sum of documents-edge strengths)`, and `0` when there are no documents edges.

Natural log, raw number, no level mapping — the hamlet→city quantization is a visual-register decision that belongs to ho-07. The zero case is a committed behavior, not an edge case: ho-01 surfaced that writing works with no `documents` edges exist legitimately (*The Same Lever* carries only `argues_for`), and the surfacings log explicitly requires the Indexer not to break on them. `settlementWeight` of a work with no documents edges is `0`; non-writing works likewise return `0` rather than throwing. Why ln and not log₂/log₁₀: the System Design says only "log-scaled"; the base is absorbed by ho-07's threshold mapping, so the choice is free — ln is what `Math.log` gives without ceremony, and the decision is recorded here so ho-07 calibrates against it. Current corpus check: `settlementWeight('three-hours')` = ln(3+2) ≈ 1.609.

### Decision 5 — The index fails loudly on referential corruption at construction.

Building the inverse index touches every edge anyway, so `createIndexer` validates that every `target` and `articulated_in` resolves to a real id — and throws with the offending edge named if not. Why throw rather than skip: the build pipeline and pre-commit validator should make this impossible, so if it happens anyway the data is corrupted in a way the practitioner must see immediately. A map silently missing a ridge is worse than a console error. (Schema-level validation — vocabularies, strength rules — stays in `scripts/validate-works.mjs`; the Indexer doesn't duplicate it.)

### Decision 6 — The Indexer does not encode cartographic role. Peaks-vs-towns stays out of the query API.

The peaks-vs-towns convention (a work's role follows work-versus-commentary, not its media array) is logged as a ho-05 decision in the overview, and it is a *rendering* convention. The Indexer exposes the primitives that decision will need — documents edges, settlement weights, media, group — and nothing named `isPeak()` or `towns()`. Why: committing role semantics here would pre-empt a decision the overview assigns to ho-05, and would put a rendering concept inside the data layer, the exact inversion the component boundaries exist to prevent.

### Decision 7 — Implementation shape: one module, JSDoc-typed, built once at construction.

`src/indexer.js`, with typedef blocks for `Work`, `Edge`, `WorkGroup` serving as the project's executable record of the schema's runtime shape. All derived structures (inverse index as `Map<id, Edge[]>`, theme/media/status/group membership as `Map<key, id[]>`, settlement weights as `Map<id, number>`) are computed eagerly in the factory — at 25 works (eventually ~50), total build cost is microseconds; lazy computation would add states without buying anything. Why eager also matters for Decision 5: construction-time validation only works if construction touches everything.

### Discovery (deferred to execution) — what the real data does to query ergonomics.

Writing the done-means tests against the real 25-work corpus may surface ergonomic gaps — e.g., whether `getIncoming(id)` without a type filter is what callers actually want, or whether grouped-by-type is the natural return. Resolve against the test call sites, not speculation.

### Deferred decision: filter composition.

The grid's multiplicative-across-categories, additive-within-category filter logic (System Design §schema `filter_composition`) may want a `query({theme, media, status})` combinator on the Indexer. Deferred to ho-03, where the real call sites exist — if the grid composes from the existing membership accessors cleanly, the combinator never gets built.

---

## Phase 2 — Execute

Single bounded agent conversation in Claude Code, practitioner monitoring — no agent-task decomposition; the work is one module and its tests. Verification rhythm per the discipline: lint, tests, typecheck, then commit.

Sequence:

1. JSDoc typedefs for the data shapes (`Work`, `Edge`, `WorkGroup`).
2. `createIndexer(data)` — construction, normalization (Decision 3), derived structures, integrity check (Decision 5).
3. Query methods (Decision 2), each landed with its unit tests against a small hand-built fixture exercising: symmetric both-endpoint queries, succession normalization, zero-documents settlement weight, dangling-ref throw.
4. A real-data suite loading the repo's actual `works.json` and asserting the done-means queries below.
5. `loadWorks(url)` + wiring in `src/main.js`: fetch, construct, expose as `window.indexer` on the placeholder page.
6. Commits on `labs`; the suite, typecheck, and lint green before each.

### Done means

- `npm test` green, coverage ≥90% on `src/indexer.js`
- `npm run typecheck` and `npm run lint` clean
- Against real data, in tests and reproducible in the browser console on the preview URL:
  - `indexer.getWork('kanyo')` returns the work
  - `indexer.getIncoming('ho-system')` includes kanyō, hōzō, and kinhin (the overview's minimum) — the full set also carries dandori, m4bookmaker, aspirational-intelligence, three-hours, falcon-cameras
  - `indexer.getOutgoing('satori')` and `indexer.getOutgoing('glassroom')` both surface the paired_with edge (declared only on satori)
  - `indexer.settlementWeight('three-hours')` ≈ 1.609 (ln 5); `indexer.settlementWeight('the-same-lever')` === 0
  - `indexer.articulatesEdge('hozo', 'ho-system', 'validates')` returns `'three-hours'`
  - `indexer.groups()` returns ten groups ordered 1–10; `indexer.worksByGroup('writing')` returns the six essays in sort order
- A deliberately corrupted fixture makes `createIndexer` throw with the offending edge named

---

## Phase 3 — Reflect

*To be filled in after execution. Prompts:*

- **Did the design hold?** Where did the real corpus surface things the Think phase didn't anticipate?
- **Decision review.** Eager construction, ln for settlement weight, throw-on-dangling — still right after implementation?
- **Query ergonomics.** What did the test call sites want that the API didn't give cleanly? What does that imply for ho-03's grid work?
- **Coverage.** What stayed legitimately uncovered, and is it documented as deliberate?
- **Followups for ho-03.** Does the filter-composition combinator earn its existence?

---

_Authored: 2026-06-12 (Think phase)._
_Execution and Reflect: pending._
