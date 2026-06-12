---
created: 2026-06-12
status: ready
type: ho-document
project: shoshin-no-sono
ho: "03"
kamae: 5
shape: ha
builds-on:
  - kamae/kamae-2-shoshin-no-sono-system-design.md
  - kamae/kamae-4-shoshin-no-sono-ho-overview.md
  - ho-process/hos/ho-02-the-indexer.md
---

# ho-03 — Grid view and the Garden Gate

The first thing a visitor can use. A card grid renders all works organized by `work_group`; filter chips narrow by theme, media, and status; the Garden Gate makes URLs into doors — every filter change updates the URL, the URL on load sets the state, a share affordance copies the current view. After this ho, Phase 1's MVP catalog exists; the cartography (Phase 2) is what makes it the demonstration, but the catalog is real.

**Depends on:** ho-02.

**Out of scope:** Cartography (ho-04+). Card detail overlays beyond the click-to-canonical-home CTA. Visual register work — the grid carries a deliberately mute aesthetic; ho-04 owns the look. Cloudflare Pages deploy — built and verified locally; the deploy is the phase-boundary step and an outward-facing action the practitioner triggers (see Handoff).

---

## Phase 1 — Think

### Decision 1 — The Garden Gate is pure functions plus a thin window adapter.

`src/gate.js` carries `parseState(search)` and `serializeState(state)` as pure functions, and `createGate(win)` as the only code in the project that touches `location` and `history`. Why: the System Design makes the Gate the sole URL-touching component; making the parse/serialize core pure means the URL grammar is fully unit-testable with no DOM, and the adapter is thin enough to test with a stub window. `setState` uses `pushState` so the browser back button walks filter history — each Venice the visitor makes is a real place they can go back to.

### Decision 2 — State model: arrays per category; comma-separated URL values; multiplicative across categories, additive within.

State is `{themes: [], media: [], status: []}`. URL grammar: `?theme=craft,agency&media=writing&status=shipped`. A work matches if for *every* non-empty category, the work intersects it (multiplicative across), where intersection is any-of within the category (additive within) — exactly the schema's `filter_composition` rule. Empty state = everything renders. Why arrays from day one: single-select chips that later grow multi-select would change the URL grammar — a published URL is a door, and doors shouldn't break; commit to the grammar once. (`focus`, `view`, and `seed` keys are reserved for later hos; the parser ignores unknown params rather than erroring, so future URLs degrade gracefully backward.)

### Decision 3 — The grid renders HTML strings, pure; main.js owns DOM wiring.

`src/grid.js` exposes `filterWorks(indexer, state)` and `renderCatalog(indexer, state)` returning an HTML string — no DOM access, fully testable in Node without a DOM shim. `src/main.js` (coverage-excluded wiring, as established) sets `innerHTML` and attaches one delegated click listener for chips and the share button. Why strings over DOM construction: keeps the test surface dependency-free (no happy-dom/jsdom devDependency), and at 25–50 works a full re-render per filter change is well inside the "feels instant" performance target — no incremental DOM management earns its complexity. All interpolated data passes through an HTML escaper; works.json is trusted-ish but the habit is non-negotiable.

### Decision 4 — Cards are always-link.

Card face: name, native script, hero or truncated short description, media and status badges. The primary CTA links to `deployment[0].url` (the canonical home); a repo link renders when present. Works with no deployment URL render without a CTA rather than with a dead one. No detail pages, no overlays beyond this — the catalog routes, the visitor leaves.

### Decision 5 — Filter chips render counts-free in v1; group sections hide when empty.

Chips for each theme, media value, and status actually present in the corpus (derived from the Indexer, not hardcoded — new vocabulary appears automatically). Active chips render marked; clicking toggles. Sections render in `groups()` order with name and intro; a group with no matching works under the active filter disappears entirely rather than rendering an empty shell. A no-matches state names the active filters and offers reset.

### Discovery (deferred to execution) — whether the ho-02 query combinator earns existence.

`filterWorks` composes from the Indexer's membership accessors or directly over `works()`. If the composition reads clean, the `query({...})` combinator deferred from ho-02 stays unbuilt.

---

## Phase 2 — Execute

Single bounded agent conversation. Sequence: `src/gate.js` + tests (URL grammar round-trips, stub-window adapter, popstate) → `src/grid.js` + tests (filter composition against the real corpus, rendering assertions, escaping) → `styles.css` + `index.html` update (identity block becomes the header; grid container) → `src/main.js` wiring (render loop: gate state → grid HTML; chip clicks → `gate.setState` → re-render; share → clipboard) → full stack green → commit.

### Done means

- Grid renders all 25 works in group order at the locally served page, Dandori among them
- Clicking the `craft` chip filters the grid live and the URL becomes `?theme=craft`
- Opening `localhost:8788/?theme=craft&media=writing` cold lands on the filtered view
- Browser back walks filter history
- Share button copies the current URL to the clipboard
- A no-matches filter state renders the reset affordance, not a blank page
- `npm test` (coverage thresholds), `npm run lint`, `npm run typecheck` all green; gate and grid logic ≥90% covered

### Handoff (the phase boundary)

Two practitioner-decision items close Phase 1 after this ho, both real decisions per the working agreement:

1. **Cloudflare Pages deploy** — outward-facing; needs the practitioner's account. Once configured (project → `sageframe-no-kaji/shoshin-no-sono`, no build command, output dir `/`, `labs` preview branch), the URL-as-door mechanic becomes shareable and the `v0.1` release tags.
2. **Replan checkpoint** (from the overview): continue to Phase 2 cartography (default), or ship the grid as v1? The populated grid is the first artifact that makes that question concrete.

---

## Phase 3 — Reflect

*To be filled in after execution. Prompts:*

- Did the URL grammar survive contact with real filter combinations?
- Did `filterWorks` need the query combinator after all?
- What does the populated grid reveal about the data (descriptions too long for cards? groups that read wrong?) — candidates for the Phase 1 replan checkpoint.

---

_Authored: 2026-06-12 (Think phase)._
_Execution and Reflect: pending._
