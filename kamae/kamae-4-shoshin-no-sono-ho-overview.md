# 初心の園 — Shoshin no Sono — Ho Overview

Five phases. Twenty hos including ho-00, ho-01.5, ho-06.5, and ho-12.5. Three replan checkpoints, one ship moment. Decisions render inline with the ho that resolves them. Release tags at every phase boundary.

## What this is, and what it is not

This is the build's directional plan, not a contract. The seed and System Design committed to architecture; this document sequences the work that builds it. Hos will split, insert, and reorder as the build reveals what it actually requires — the numbering scheme exists for that. The overview is a living document; the practitioner updates it as hos complete and reveal what the next ones actually need to be.

It is also not a per-ho document. Each ho gets its own scope at session time via `ho-kamae-5-authoring-collaborator`. The overview is the map. The per-ho documents are the bounded scope for individual sessions. Both stay honest to each other.

---

## Phase structure

| Phase | Hos | What it produces |
|---|---|---|
| 0. Foundation | ho-00 | The repo exists; the framing documents are committed; schema is finalized; a preview URL serves an empty page |
| 1. Data and visible catalog | ho-01, ho-01.5, ho-02, ho-03 | A shareable MVP catalog: grid view, filter URLs, the MVP sample (~20 entries) of the body of work in `works.json` |
| 2. Cartography | ho-04, ho-05, ho-06, ho-06.5, ho-07, ho-08, ho-09 | The procedural interference cartography rendering on desktop with full interaction |
| 3. Authoring | ho-10, ho-11, ho-12, ho-12.5 | A live, fully-populated catalog: the Steward edits existing works; the Founder adds new ones with AI-assist via the Scribe; ho-12.5 completes the hydration as the Founder's first real stress test |
| 4. Polish and ship | ho-13, ho-14, ho-15, ho-16 | Mobile experience, accessibility, the companion essay, retirement of the prototype, v1.0 |

Three replan checkpoints sit at phase boundaries (end of Phase 1, end of Phase 2, end of Phase 3). One additional decision-trigger checkpoint sits after ho-04 because the visual register exploration commits the aesthetic before procedural generation begins.

---

## Phase 0 — Foundation

Foundation is the scaffold. The repo exists. The Kamae documents — seed, system design, README, this overview — are committed and visible. The schema is finalized with the revisions identified in the System Design. The Cloudflare Pages preview URL serves an empty placeholder page. Nothing renders yet; nothing is supposed to. This phase makes the workspace real so the actual build can begin against committed material.

*Release on phase complete: v0.0.1*

### ho-00 — Scaffold and schema

This ho creates `sageframe-no-kaji/shoshin-no-sono`, tags the existing `sageframe-dharma/sageframe.net` HEAD as `v0-legacy`, opens the `labs` branch, configures Cloudflare Pages to preview-deploy that branch, and commits the documents already produced: `README.md`, `LICENSE`, `docs/architecture.md`, `shoshin-hanko.png`, the seed, the system design, and this overview. The schema revisions from the System Design — renaming `weight` to `importance`, adding `articulated_in` per-edge optional, removing the composite-importance calculation from the rendering block, documenting the `documents`-edge strength convention — happen here. A skeleton `works.json` with one or two sample entries goes in so schema validation can run.

**Depends on:** Nothing (this is the start).

**What's in scope:**
- Repo creation, tag, branch
- Cloudflare Pages preview configuration
- Commit of all framing documents and assets
- Schema revisions
- Skeleton `works.json` with sample entries
- Schema validation working on commit

**What "done" means:**
- Preview URL is live, returns a placeholder page
- README renders on GitHub with the hanko visible at the top
- `schema.json` validates the sample `works.json`
- `v0-legacy` tag exists on the prototype repo

**What's out of scope:** Any actual visualization code, the Indexer, the CMS — all later. No real data; only sample entries to prove the pipeline.

**Possible split:** If schema revisions turn out larger than expected (the `documents`-strength convention or the rendering block cleanup may bring up edge cases), split into ho-00.1 (repo + tag + branch + commits) and ho-00.2 (schema revisions and validation).

---

## Phase 1 — Data and visible catalog

This phase produces the first version of the catalog that someone can actually visit. By the end, an MVP sample of ~20 entries is in `works.json` with relationships and themes — enough to exercise every media type in the schema and every major relationship pattern, not the entire body of work; the Indexer's query API works; the grid view renders cards organized by `work_group`; and the Garden Gate makes URLs into doors. The cartography is still the next phase, but the site is already legible — a stranger sent a URL with `?theme=craft` lands on a filtered grid view of the relevant works. This is the MVP threshold. After this phase, the project could in principle ship as a grid-only catalog; the cartography is what makes it the demonstration the seed describes, but the catalog itself is real after Phase 1. Full hydration of the remaining works happens later through the Founder in ho-12.5.

*Release on phase complete: v0.1*

### ho-01 — Build the catalog from the schema (MVP sample)

The schema (v4) is the contract. This ho inhabits it — builds works.json entry by entry — until enough of the body of work is represented to stress-test the data model. The MVP target is ~20 entries selected to exercise every media type in the schema and every major relationship pattern, not to represent the full body of work. The remaining works hydrate later in ho-12.5, where the Founder makes that its first real-world test. Execution happens conversationally in this Project's chat space — the schema is in project knowledge, the inventory document is in project knowledge, and the work is the practitioner-plus-Claude editorial loop. No Python script, no agent task.

**Depends on:** ho-00.

**What's in scope:**
- ~20 entries covering every media type (software, writing, website, image, talk, methodology)
- At least two instances of each major relationship type (descends_from, paired_with, companion_to, operationalizes, documents at strengths 1/2/3, succeeded_by, validates)
- A handful of entries using the new `articulated_in` field
- A surfacings log capturing schema gaps, vocabulary gaps, and other observations from execution

**What "done" means:**
- `works.json` contains ~20 entries validating against `schema.json`
- The MVP composition exercises every media type and major relationship type
- A surfacings log exists capturing what the data model revealed under real entries
- Commit history on `labs` shows the build-up of entries in identifiable batches

**What's out of scope:** Anything that renders this data (ho-02, ho-03). Full hydration of the body of work (ho-12.5). Any script or automation.

**Decisions required:**
- **Approach to hydration**: conversational in the Project chat space vs Python script vs hybrid. Default: conversational, because the bottleneck is editorial judgment, not throughput, and the chat keeps the editorial loop continuous.
- **MVP scope**: ~20 entries exercising every media type and relationship pattern, with full hydration deferred to ho-12.5. Composition target is the shape (counts per media type), not a fixed list of works.
- **Review and commit cadence**: per-entry edit-and-commit, with batch git commits every 5-7 entries.

**Possible split:** Unlikely. If the surfacings reveal substantial schema revisions that should land before the MVP completes, split into ho-01.1 (first 10 entries + surfacings synthesis) and ho-01.2 (schema revision + remaining entries against revised schema). Otherwise, this is one focused conversational session, possibly across multiple Project chats if token budget warrants.

### ho-01.5 — Environment scaffold (inserted)

Inserted 2026-06-12 at ho-02 authoring, when the Kamae 5 pre-conditions check surfaced that no technical scaffold exists: ho-00 produced the repo, schema, and documents; ho-01 produced the data; neither produced a page, a test harness, a lint stack, or a project CLAUDE.md — and ho-02 is the first code ho. This is the forward-only response, not a reopening of ho-00. The ho encodes the verification discipline into the repo: Vitest with 90% coverage thresholds, JSDoc + `tsc --checkJs` strict as the type layer, ESLint + Prettier, the `works.json` validator promoted from ho-01's ephemeral checks into `scripts/validate-works.mjs`, pre-commit wiring, the placeholder `index.html` that doubles as ho-02's console-verification surface, and a project CLAUDE.md carrying the System Design's component boundaries. The served site stays no-build; all tooling is dev-only.

**Depends on:** ho-01.

**What's in scope / what "done" means:** carried by the per-ho document — `ho-process/hos/ho-01.5-environment-scaffold.md`.

**What's out of scope:** Any Indexer code (ho-02). The deploy pipeline. Cloudflare Pages configuration — deferred until the MVP catalog needs a shareable URL (the ho-03 era); local serving suffices through ho-02.

### ho-02 — The Indexer

The Indexer is a vanilla JS module that loads `works.json` once per page session and builds the derived runtime structures every downstream component depends on: inverse edge index, settlement weights (log-scaled sum of `documents` edge strengths per writing piece), theme membership sets, per-work importance values. It exposes a query API that the Cartographer and Garden Gate will call. By the end of this ho, the data is hydrated into a working query layer; nothing renders yet, but the queries return correct answers in the browser console.

**Depends on:** ho-01.5 (which depends on ho-01).

**What's in scope:**
- Data loading from `works.json`
- Inverse edge index construction
- Settlement weight computation
- Theme membership index
- Query API: `getWork(id)`, `getIncoming(id, edgeType?)`, `getOutgoing(id, edgeType?)`, `worksByTheme(theme)`, `worksByMedia(media)`, `settlementWeight(workId)`, `articulatesEdge(fromId, toId, type)`

**What "done" means:**
- Browser console on the served page (locally; the preview URL once Pages is configured): `indexer.getWork('kanyo')` returns the work
- `indexer.getIncoming('ho-system')` returns Kinhin, Hōzō, Kanyō at minimum
- `indexer.settlementWeight('three-hours')` returns a number consistent with its documents-edge strengths
- The module is hot-reloadable during development

**What's out of scope:** Any visualization. Any UI.

**Possible split:** If derived computations (especially settlement weights and importance handling) reveal subtle correctness issues, split into ho-02.1 (basic indexer with raw access + simple traversals) and ho-02.2 (derived computations including settlement weights).

### ho-03 — Grid view and the Garden Gate

This ho produces the first thing the practitioner can share. A card grid renders all works organized by `work_group`. Filter chips at the top let the visitor narrow by theme, media, or status. The Garden Gate handles URL state — every filter change updates the URL, the URL on load sets the state, the share affordance writes a URL into the clipboard. This is the gates-on-every-side mechanic working end to end: a URL is a door. By the end, the catalog is live in a meaningful sense — the practitioner can paste a URL into a DM and the recipient sees a filtered view of the body of work, even though the cartography is not yet built.

**Depends on:** ho-02.

**What's in scope:**
- Card grid renderer
- Cards organized by `work_group` with section headers
- Filter chips: theme, media, status
- URL state machine in the Garden Gate
- Filter changes → URL updates
- URL on load → render state
- "Share this view" affordance
- Basic responsive layout — adequate on mobile, optimized for desktop

**What "done" means:**
- The MVP catalog renders all works at the preview URL
- Filter to `theme=craft` → URL becomes `?theme=craft`, grid filters live
- Opening the URL in another browser lands on the filtered view
- Dandori appears in the grid (because the data is populated)
- A "share" button copies the current URL to clipboard

**What's out of scope:** Cartography. Card detail overlays beyond a basic click-to-canonical-home CTA.

---

**Phase boundary — replan checkpoint.** The MVP catalog is live and shareable. Three questions to settle before committing to Phase 2: Is the grid view enough? Should the catalog ship now as the v1 surface and the cartography be a later release? Are there changes to the data model or the schema that reviewing the populated grid reveals as urgent? The default answer is *continue to Phase 2* — the cartography is the demonstration the seed describes — but the option to ship the grid as v1 is real, and naming it as an option here is what makes it a real decision rather than an assumed trajectory.

---

## Phase 2 — Cartography

This phase produces the interference cartography on desktop. The work splits into two registers: visual design (what the cartography looks like, settled in ho-04 via Claude Design with bounded prompts) and procedural generation (the math and rendering pipeline, built in hos 05 through 09). By the end of this phase, a visitor on desktop arrives at the preview URL, sees a topographic map render fresh from current data, watches writing-piece towns populate chronologically, clicks through to canonical homes or to the essays that articulate the relationships shown.

*Release on phase complete: v0.2*

### ho-04 — Visual register exploration (Claude Design pull-off)

This entire ho is Claude Design work. The practitioner runs a sequence of tightly bounded Claude Design sessions, each addressing one specific visual question — no JSON, no architecture, no scope creep, just visual exploration. The sessions explore: a single peak in pen-and-ink contour hatching on cream paper; a town at four sizes (hamlet, village, town, city) with terracotta accent; typography for elevation labels, place names, the cartouche; a single ridge between two peaks; a road between two towns; a trail from a valley to a summit; the cartouche layout. Outputs are SVG snippets, collected into a `design/visual-register.html` page that becomes the aesthetic reference for procedural generation in subsequent hos.

**Depends on:** ho-03 (so the practitioner can context-switch to design work knowing the MVP catalog is live).

**What's in scope:**
- Multiple Claude Design sessions, each with a precise bounded prompt
- An SVG snippet collection at `design/visual-register.html`
- Brief notes in the repo on which snippets are the committed register and which were explored and rejected

**What "done" means:**
- The visual register page exists in the repo
- The practitioner has decided what a peak looks like, what a town looks like, what each relationship feature looks like, and what the cartouche carries
- Subsequent procedural hos have concrete reference material to target

**What's out of scope:** Any procedural generation. Any JavaScript that uses these snippets in real rendering. The snippets are reference art for the procedural pipeline, not the pipeline itself.

**Possible split:** If the aesthetic doesn't converge in one ho, split into ho-04.1 (peaks and contours register) and ho-04.2 (towns and relationship features register). The skill's discipline of "one visual question per prompt" makes individual sessions short, but the total surface area is real.

---

**Decision-trigger checkpoint.** The visual register is committed. Before procedural generation begins, this is the moment to verify that what the practitioner has decided actually reads on screen the way it does in the explored snippets — that contour density at the planned scale, with the planned typography, against the cream paper background, produces the territory the seed describes. If it doesn't, ho-04 needs another pass before ho-05 begins. The procedural pipeline targets the visual register; if the register is wrong, the pipeline produces the wrong territory.

---

### ho-05 — Position computer and heightfield

The Cartographer's first two pipeline stages. Position assignment is procedural and seeded — random by default; an optional URL seed parameter reproduces a specific layout. (Built hand-rolled rather than with d3-force — see the resolved decision below.) The heightfield generator produces a 2D grid of elevation values by summing radial functions (Gaussian by default; wave-interference variants prototyped if Gaussian doesn't read right) centered at each peak with amplitude set by `importance × filter_relevance`. The output of this ho is not the final cartography — it is the math working, rendered as a debug heat map so the practitioner can verify positions and elevations behave correctly across filter states.

**Depends on:** ho-04.

**What's in scope:**
- Position assignment via seeded procedural placement (hand-rolled, not d3-force)
- Optional URL seed → reproducible layout
- Heightfield generation as a 2D grid
- Debug heat-map renderer (transient, not part of the final visualization)
- Filter changes → positions and heightfield update

**What "done" means:**
- Debug page renders the heightfield as a heat map
- Filter changes produce visibly different heightfields
- Refresh produces novel positions (random seed by default)
- A URL with `?seed=...` produces a reproducible layout

**What's out of scope:** Contour extraction (ho-06). Town placement (ho-07). Final visual register (the heat map is debug-only).

**Decisions required:**
- **Position assignment strategy**: pure procedural per render is the default (chosen). Anchored procedural (key works pinned at semantic positions) is available for free if needed. URL-seeded reproducibility is the third tier. Decision: confirm pure procedural in practice; enable anchored variant only if pure procedural doesn't produce recognizable Venices across renders. Criteria: (1) does the Venice remain recognizable across renders for the same filter, (2) does the variation read as deliberate or random, (3) does it render at acceptable performance for the body of work's current size. **Resolved in ho-05:** hand-rolled seeded best-candidate (Mitchell) sampling, *not* d3-force — dropped for self-containment (no-build ESM; no runtime CDN or vendored module tree) and seedability (d3-force's internal jitter isn't cleanly seedable, and `?seed` reproducibility is a hard requirement). Positions are filter-independent — one terrain, non-matching peaks sink (`importance × filter_relevance`). An early force-relaxation attempt pinned peaks to the boundary; best-candidate scatters through the interior. Anchored procedural stayed unbuilt.
- **Heightfield function family**: Gaussian by default. If Gaussian produces terrain that reads as data-viz rather than architectural, prototype wave-interference variants (the Resonance Field family). Criteria: which produces contour patterns that read as topographic at the visual register from ho-04. **Finding from ho-04 session 1:** the "peakiness" of the register lives in contour-spacing *variation* (spacing encodes slope; varied spacing reads as faces and shoulders, uniform spacing reads as a machined cone) — and spacing falls out of the field shape, not the stroke styling. A pure symmetric Gaussian yields radially uniform spacing; the field needs irregularity (low-frequency noise term or asymmetric per-peak falloff), exposed as a tuner. Two further session-1 rules: **(a) crenellation decays with elevation** — low contours carry the drainage-scale complexity, summit contours converge toward simple convex forms, so field noise attenuates with height (also structurally necessary: a Gaussian flattens at its top, where constant noise would distort rings most); **(b) the tuner parameters split across the component boundary** — baseForm/terrain are field-side (ho-05, computed from data + field noise), lineWeight/ink are renderer-side (ho-06). Silhouettes are never authored per-peak; they fall out of the field.
- **Peaks vs towns convention** (surfaced in ho-01): a work's cartographic role is decided by its nature as work-versus-commentary, not by its `media` array. Peaks are works (a substantial piece of work is a peak regardless of whether its media includes writing — Pink Teaming is a peak even though it is website + writing). Towns are writings-about-works. The `media` array describes what a thing is made of, not whether it renders as a peak. Confirm and document this convention before the Cartographer makes the call silently.
- **atmarcus.net as a non-peak landform** (surfaced in ho-01): atmarcus.net is not a work in the catalog — it is the home of Practice History, the pre-2024 work that lives below the visible post-2024 range. Render it as a landform you descend into rather than a peak you climb (a canyon or a mine), placed at an edge or low point of the terrain, linking out to atmarcus.net the way a peak links to its deployment. This is a rendering gesture only; it touches no data and no schema. Decide the exact landform and placement when the cartography exists.
- **Itinerant-writing model** (surfaced in ho-01, parked): an alternative to the static-town model where writings are itinerant — venues are home bases (monasteries), individual writings travel the roads between the works they document (monks in motion). A richer grammar than static settlements, matching how writing actually moves between subjects. Revisit only if the static-town model proves too flat once towns are rendered in ho-07. Default: static towns as designed; this is the fallback if they don't read right.

**Possible split:** If position assignment and heightfield generation each turn out larger than expected, split into ho-05.1 (positions + debug view) and ho-05.2 (heightfield + heat-map debug). The two are tightly coupled but addressable separately.

### ho-06 — Contour extraction

Marching squares takes the heightfield from ho-05 and extracts iso-elevation contour lines as SVG paths. The visual register from ho-04 determines how these paths render — line weight, color (warm grays on cream), spacing of iso-elevation levels. This is the first time the cartography looks like a map.

**Depends on:** ho-05.

**What's in scope:**
- Marching squares implementation (well-documented algorithm; existing libraries available if hand-rolling is unproductive)
- SVG path rendering of contour lines
- Visual register conformance (line weight, color, density)
- Filter changes → re-extracted contours per fresh heightfield

**What "done" means:**
- The debug page renders contour lines instead of (or overlaid on) the heat map
- Contours visibly correspond to the heightfield
- Different filters produce visibly different contour maps
- The visual register from ho-04 is now procedurally generated

**What's out of scope:** Towns (ho-07). Relationship features (ho-08). Interactions (ho-09).

**Resolved in ho-06:** Marching squares reimplemented cleanly as `src/contours.js` (pure geometry) + `src/contour-map.js` (register render), replacing ho-05's transient heat map. The silhouette verdict deferred from ho-05 **passed** — the Gaussian-family field reproduces the frozen session-1 peak's character (faces/shoulders spacing, crenellation decay, lobed silhouette) on real iso-lines, so wave-interference stays the unbuilt fallback. Register weights confirmed at map scale on the real corpus (0.25 regular / 0.7 index, index every fifth). The by-feel tuner pass deferred here landed in ho-06.5.

### ho-06.5 — Tuner landing (inserted)

Inserted 2026-06-13, after ho-06. ho-06 closed declaring the field tuners held on the implementing model's eye; the practitioner's own by-feel pass on the live debug instrument moved every field default — ring spacing, crenellation, summit sharpness, base radius, radius × importance, and the filter sink floor. Forward-only response: ho-06 stays closed with its premature verdict; ho-06.5 records the landing and locks the values across the three files that own them (`contours.js`, `field.js`, `cartographer.js`). A `base radius` slider was added to the debug panel during the pass — the importance-spread lever wasn't reachable. The blessed register: a dense field of individuated hills, importance reading as prominence, softer summits, non-matching works receding under a filter to legible small hills rather than naked dots.

**Depends on:** ho-06.

**What's in scope / what "done" means:** carried by the per-ho document — `ho-process/hos/ho-06.5-tuner-landing.md`.

**What's out of scope:** Any new contour or field capability — this is a values landing, not new behavior. Towns (ho-07).

### ho-07 — Town placement and chronological populate

Writing-piece towns get placed at barycentric positions weighted by their `documents` edge strengths, biased toward strength-3 anchors when present. Settlement size is `log(sum of strengths)` mapped to hamlet, village, town, or city. After the terrain renders, towns fade in sequentially in publication date order — the visitor watches the writing arrive across the territory in the order it was written. The visual register for each settlement size comes from ho-04.

**Depends on:** ho-06.

**What's in scope:**
- Town position computation (barycentric weighted)
- Settlement size mapping (log-scaled, four levels)
- Town SVG rendering per ho-04 register
- Chronological populate animation
- Filter changes → towns reposition along with peaks

**What "done" means:**
- *Three Hours* sits at the foot of Hōzō
- *The Empty Container* sits at the foot of Glassroom
- *The Same Lever* sits in a central trading-hub position
- Reload produces the populate animation across the territory
- Filter changes trigger fresh population in chronological order

**What's out of scope:** Relationship features (ho-08). Click interactions (ho-09).

**Finding from ho-01:** software `created` dates in `works.json` are estimates — the inventory carries no first-shipped dates. Verify them, or reframe the populate animation as intentional editorial order rather than chronology, before this ho renders.

**Finding from ho-02 (practitioner-flagged, major design decision):** the settlement-weight scaling — currently `ln(1 + sum of documents strengths)` in the Indexer; the +1 keeps a single strength-1 documentation distinct from no documentation — is provisional, not the final solution. The log *base* is immaterial (thresholds absorb any constant factor); the curve *family* and the thresholds are the real tuners. When towns render, expose the scaling function and the size thresholds as tunable parameters (Claude-Design-style tuners), iterate by feel against the visual register, and re-decide here. The same tuner posture applies to every data-to-visual mapping this ho and ho-05 introduce.

**Possible split:** If the chronological populate animation turns finicky (timing, easing, cancellation when filter changes mid-populate), split into ho-07.1 (placement and static rendering) and ho-07.2 (populate animation).

**Update (ho-07.1 authoring, 2026-06-14) — the split happened, but not as named.** ho-07 did the static town placement and label tuning under its own number (with by-feel tuner passes through ho-07.5), so the "possible split" above is partly spent: ho-07.1 is **not** placement. It was repurposed as **emergence data** — a forward-only data ho that added two schema fields, `conceived` (origin/rise date, required for non-archived works) and `named` (optional later-naming pulse); authored `conceived` across the corpus and the six writing towns; added the three missing core works (sageframe, shodo, sutra); moved pink-teaming to methodology; and split edelmore into edelmore-diary + edelmore-reader. This is a **schema evolution**: `conceived`/`named` join `created`/`publication_date`, and every future work carries `conceived` so the emergence animation stays current without code changes (ho-12.5 inherits the fields). The lifecycle model clarified here: `conceived` = the idea, `created` = the build start, then the work, then release.

**ho-07.2 — world-then-writing emergence (reframed).** ho-07.2 is no longer towns-only "populate animation." It is the world-then-writing emergence: peaks **rise** in `conceived` order (even beats; same-day conceptions share a beat — ho-system + kanyo, shodo + sutra), renamed works **pulse** on their `named` date (forteller / palana), a pre-history floor handles the 2022 outlier (aspirational-intelligence) and the corpus-floor landmark (first Claude chat, 2025-11-11 — an animation constant, not a `works.json` entry), then the writing towns arrive in dated order. It reads the ho-07.1 data and adds the rendering; the data layer is already in place.

**On the ho-01 `created` finding (above):** partly answered. `conceived` is now the trustworthy origin the animation reads, so the populate no longer depends on the unreliable `created` estimates. The `created` sweep itself (real first-public / build-start dates) remains a later-era followup — and a few `created` estimates now visibly precede `conceived`, which wants fixing in that sweep.

### ho-08 — Relationship features as terrain

The relationship grammar from the System Design becomes visible on the map. Ridges for `descends_from`. Trails for `validates`. Twin peaks for `paired_with`. Roads between towns for `documents` references and writing-to-writing edges. Adjacent towns sharing a road for `companion_to`. Each feature type renders per its visual register from ho-04.

**Depends on:** ho-07.

**What's in scope:**
- All relationship types from the System Design rendered as cartographic features
- Feature rendering against the contour background — visible without dominating
- Per-feature register conformance (ridges vs trails vs roads vs twin peaks)

**What "done" means:**
- Kinhin descends from Kanyō as a visible ridge
- Satori and Glassroom render as twin peaks
- The Constructive Interference range shows its tools as foothills connected by trails
- *Three Hours* has a road to Hōzō; *The Empty Container* has a road to Glassroom
- Different filters produce different feature visibilities (filter to `theme=craft` → only craft-relevant ridges and roads render)

**What's out of scope:** Click interactions (ho-09). Tooltips beyond basic hover.

**Finding from ho-01:** `succeeded_by` grounds only one real instance in the corpus (Aspirational Intelligence → Ho System), so its cartographic feature may not be worth building for v1 — decide at this ho.

**Possible split:** If feature rendering reveals six distinct rendering challenges, split into ho-08.1 (structural edges — ridges and twin peaks) and ho-08.2 (linear edges — trails, roads, paths). The visual register from ho-04 should clarify which split, if any, is natural.

### ho-09 — Interaction layer

Hover-highlight with dimming of unrelated features. Click on a peak opens an in-place card with the work's name, native script, one-line description, and a primary CTA to the canonical home. Click on a town opens a card with a link to the essay. Click on a relationship feature (ridge, trail, road) — if the edge has `articulated_in` set, the card links directly to the articulating essay; otherwise it shows related-writing options. Changing a filter triggers a fresh render — the map regenerates with new positions, contours, and feature placements.

**Depends on:** ho-08.

**What's in scope:**
- Hover-highlight + dimming
- In-place card overlays per click target type
- Primary CTA leading off-site
- `articulated_in` resolution for relationship features
- Filter change → fresh render

**What "done" means:**
- The desktop cartography is fully interactive
- A URL with `?focus=ho-system&theme=craft` lands correctly in another browser
- All click paths work: peak → canonical home, town → essay, ridge → articulating essay (when present)
- Card overlays close on click-outside

**What's out of scope:** Mobile interaction (Phase 4). Performance polish (Phase 4).

**Possible split:** If the multiple interaction types each turn out non-trivial, split into ho-09.1 (hover behaviors and card overlays) and ho-09.2 (filter change, fresh render, transitions).

---

**Phase boundary — replan checkpoint.** The cartography works on desktop. Three questions to settle before committing to Phase 3: Is the desktop cartography enough as a visitor experience for v1, with authoring infrastructure deferred to v1.5? Are there changes to the data model that the cartography has revealed (relationships that should exist but don't, themes that need adjustment, importance values that need recalibration)? Does the practitioner want to add a companion essay draft now while the cartography is fresh in mind, or hold it for ho-15? Default: continue to Phase 3, because the practitioner has named the Dandori friction explicitly and the CMS-plus-Founder workflow is the mechanism that removes it.

---

## Phase 3 — Authoring

This phase makes the catalog alive. The Steward (Sveltia CMS) handles general editing of existing entries. The Scribe (Cloudflare Worker) holds the Anthropic API key and proxies AI-assist calls. The Founder (custom new-work admin tool) integrates with the Scribe to make adding new works a fifteen-minute practice. Verification of the Founder happens by adding the next real work (ho-12); the bulk hydration of the remaining body of work happens in ho-12.5 — the Founder's first real-world stress test. By the end of this phase, the Dandori test passes at scale: ~40-45 real works in the catalog, each added through the production workflow, with the practitioner having walked the path the production tool was built for.

*Release on phase complete: v0.3*

### ho-10 — Sveltia CMS setup (The Steward)

Install Sveltia at `/admin/`. Register the GitHub OAuth app for `sageframe-no-kaji/shoshin-no-sono`. Configure `admin/config.yml` to match the schema. Verify the editing flow: log in, edit an existing work's description, commit, observe the change deploy through to the preview URL. The Steward handles atomic edits to existing entries; new-work creation is the Founder's job in ho-12.

**Depends on:** ho-09 (so the visualization is in place when the practitioner starts editing real entries; not strictly necessary but helps with end-to-end verification).

**What's in scope:**
- Sveltia install at `/admin/`
- GitHub OAuth app registration
- `admin/config.yml` matching the schema
- Authentication flow working end to end
- Atomic edit-commit-deploy cycle verified

**What "done" means:**
- Log in to `/admin/`, browse all works, edit any field
- Commit lands on the `labs` branch
- Site rebuilds and the change appears at the preview URL in 30-90 seconds
- Sveltia's schema validation prevents commits that violate the schema

**What's out of scope:** New-work creation (ho-12). AI-assist integration (ho-11 and ho-12). Customization beyond what the standard Sveltia config supports.

**Decisions required:**
- **CMS choice in operation**: Sveltia is the committed decision. If during setup Sveltia's beta-state limitations bite hard, the fallback to Decap is one URL change. Criteria for swapping: if Sveltia cannot handle a substantial operational requirement (form rendering, validation, OAuth flow), document the issue and swap.

**Possible split:** Unlikely; this is well-trodden Sveltia setup. If OAuth registration turns out unexpectedly fiddly, split into ho-10.1 (OAuth and authentication) and ho-10.2 (CMS configuration and verification).

### ho-11 — The Scribe (Cloudflare Worker)

Set up the Cloudflare Worker that will proxy AI-assist calls from the Founder to the Claude API. Hold the Anthropic API key as an environment variable. Write the prompt template that lives at `prompts/ai-assist.md` in the repo and gets bundled into the Worker at deploy. The Worker accepts a POST with a partial entry plus the full current `works.json`, calls Claude, returns structured proposals. By the end of this ho, the Worker responds to `curl` requests with sensible proposals for the Dandori test case.

**Depends on:** ho-01 (real data must exist for the prompt template to be developed against).

**What's in scope:**
- Cloudflare Worker setup via wrangler
- Anthropic API key as Cloudflare environment variable
- Prompt template at `prompts/ai-assist.md`
- Worker accepting POST, calling Claude, returning structured JSON
- Iteration on the prompt template until proposals are reliably good

**What "done" means:**
- The Worker has a stable URL
- `curl`ing the Worker with a sample Dandori payload returns well-structured JSON
- Proposals are sensible: Dandori as `descends_from: ho-system`, `paired_with: kinhin` if appropriate, themes including `craft`, work_group `methodology`, sensible importance
- Reverse-direction edge proposals are reasonable (Ho System gets `succeeded_by: dandori`, *Three Hours* gets `paired_with: dandori` if appropriate)

**What's out of scope:** The Founder UI (ho-12). The diff review interface (ho-12). Schema validation of proposals (Founder handles this).

**Decisions required:**
- **Prompt template content**: the actual content of `prompts/ai-assist.md`. Iterated against the Dandori test case and possibly a few other recent additions until proposals are reliably good. Lives at `prompts/ai-assist.md`; version-controlled; improvable over time.
- **Worker subdomain**: likely `assist.shoshin.sageframe.net` or similar. Decision criterion: clean naming, consistent with the existing sageframe.net subdomain conventions.

### ho-12 — The Founder (custom new-work admin tool)

The Founder is the new-work creation flow as a purpose-built single-page tool at `/admin/new/`. Form for the partial entry. AI-assist button that POSTs to the Scribe. Renders the Scribe's response as a structured diff — proposed new entry on one side, reverse-direction edge proposals on the other, each accept/reject/edit-able. On commit, the Founder constructs a single git commit containing all accepted changes. This is the custom-web-tool-orchestrating-API-calls-via-a-Worker pattern the practitioner identified as a learning goal.

**Depends on:** ho-10 (shared OAuth flow), ho-11 (the Scribe must exist).

**What's in scope:**
- Single-page tool at `/admin/new/`
- Form for partial new-work entry
- AI-assist button → POST to Scribe → render response
- Structured diff view: new entry + reverse-direction edits
- Per-proposal accept/reject/edit
- Single commit with all accepted changes
- Shared GitHub OAuth flow with the Steward

**What "done" means:**
- Use the Founder to add the next real work to the catalog (the first not in the MVP sample)
- AI-assist proposes sensible relationships
- The diff review is clear and operable
- Commit lands; site rebuilds; new work integrated
- The Dandori test passes at unit scale: 15-20 minutes from form-open to live for a single new work

**What's out of scope:** Editing existing works (the Steward handles this). Bulk operations (ho-12.5 does that as the Founder's first real stress test).

**Decisions required:**
- **Founder implementation language**: vanilla JS or Svelte. Decision criterion: whichever produces the simplest and most learnable implementation of the in-browser-to-Worker-to-API pattern. Lean vanilla JS unless Svelte's reactivity meaningfully simplifies the diff review UI.

**Possible split:** Likely. The Founder has three distinct sub-problems — form-and-OAuth (ho-12.1), AI-assist call and response handling (ho-12.2), diff review UI and commit (ho-12.3) — and any of them could turn out larger than anticipated. Splitting is anticipated as a normal evolution rather than a fallback.

### ho-12.5 — Complete the hydration via the Founder

The MVP sample from ho-01 covers ~20 entries — enough to exercise the schema and run Phase 2's cartography against real density, but not the full body of work. This ho completes the hydration by using the Founder to add the remaining ~20-25 works. Each work goes through the production workflow: form → AI-assist → diff review → commit. The point is not just to populate the catalog. The point is that the Founder's first real test is bulk operation against real works, not a single hypothetical addition.

**Depends on:** ho-12.

**What's in scope:**
- The remaining ~20-25 works added through the Founder
- Each work's relationships proposed by the Scribe, reviewed by the practitioner, committed
- Reverse-direction edges to existing MVP entries proposed and applied as part of each commit
- Surfacings logged: prompt template issues, Founder UX issues, schema gaps revealed by the broader corpus
- Iteration on the Scribe's prompt template (`prompts/ai-assist.md`) if proposals are uneven

**What "done" means:**
- All currently-shipped/published/in-development works in the body of work are in `works.json` (estimated total: ~40-50 entries)
- Every entry validated against the schema
- The Founder workflow has been exercised at scale — patterns the single-test of ho-12 wouldn't surface have been surfaced
- Prompt template revisions committed to `prompts/ai-assist.md`
- Surfacings log carries the Founder-workflow observations alongside the ho-01 surfacings

**What's out of scope:** Improving the Founder beyond fixes required by what surfaces. Major schema revisions revealed (those become a separate inserted ho if substantial). Photography subsystem (deferred, post-v1).

**Decisions required:** None pre-decided. Decisions emerge during execution: prompt iterations, Founder UX adjustments if needed, whether to defer particular works (archived ones, controversial ones) to post-v1.

**Possible split:** Unlikely. Bulk operation through the Founder is one focused practice. If individual works repeatedly surface prompt-template issues, pause and iterate the template rather than splitting the ho.

---

**Phase boundary — replan checkpoint.** Authoring works. The catalog is fully populated. The Founder has been stress-tested. Three questions to settle before committing to Phase 4: Are there changes to the AI-assist prompt template that bulk hydration revealed? Should the visual register be revised based on what real data has surfaced (e.g., certain relationship features may need adjustment now that the practitioner has been clicking around the cartography with a full corpus)? Is the practitioner ready to commit to a target date for v1.0 or holding open? Default: continue to Phase 4 — the remaining work is polish and ship.

---

## Phase 4 — Polish and ship

This phase carries the project from "working on desktop, alive in authoring" to "live at sageframe.net, replacing the prototype." Mobile gets a decorative cartography and a grid fallback. Accessibility and performance pass real checks. The companion essay gets written and published — the pattern of every major piece in the practitioner's body of work having a companion essay applies here too. The merge to `main` retires the prototype and ships v1.0.

*Release on phase complete: v1.0*

### ho-13 — Mobile decorative cartography and grid fallback

Adapt the cartography to a simplified decorative version at narrow viewport — major peaks only, simplified contours, no relationship features rendered, no towns at low zoom, no interaction with the terrain itself. Tap drops into the grid view, which is the actual navigation on mobile. URL state preserved across modes — a shared `?theme=craft` link lands on a filtered grid view on mobile and a filtered cartography view on desktop. Claude Design pull-off for the mobile aesthetic.

**Depends on:** ho-12 (authoring works) — though could be done after ho-09 if mobile is prioritized over authoring. The current order assumes authoring is the priority.

**What's in scope:**
- Mobile decorative cartography (simplified terrain, no interaction)
- Tap-to-grid transition
- URL state preserved between modes
- Grid view's mobile responsiveness verified
- Claude Design pull-off for mobile cartography aesthetic

**What "done" means:**
- Open the site on a phone — decorative map renders
- Tap the map — drops into grid
- Share a desktop URL — open on a phone — lands on the equivalent mobile view
- Mobile grid is genuinely usable (tap targets, type sizing, navigation)

**What's out of scope:** Mobile authoring (Sveltia handles this; not a Phase 4 deliverable to confirm).

**Decisions required:**
- **Mobile aesthetic specifics**: how the decorative cartography simplifies — how many peaks, what contour density, what type sizing, what kind of frame around the simplified map. Decision in the Claude Design sessions of this ho.

**Possible split:** Likely two distinct sub-problems — the simplified cartography (ho-13.1) and the URL state preservation across modes (ho-13.2). Split if either turns out larger.

### ho-14 — Performance and accessibility

Initial payload under 500KB target. Lazy-load the cartography so the grid view is interactive first on slow connections. Keyboard navigation throughout. Screen reader compatibility verified with NVDA or VoiceOver. WCAG 2.2 checks. Lighthouse scores above 90 across categories.

**Depends on:** ho-13.

**What's in scope:**
- Bundle size optimization (target: under 500KB initial payload)
- Lazy-loading of the cartography
- Keyboard navigation through the entire UI
- ARIA labels and roles
- Screen reader test
- Lighthouse audit and remediation

**What "done" means:**
- Lighthouse scores above 90 in performance, accessibility, best practices, SEO
- Tab through the entire UI without a mouse
- VoiceOver or NVDA can navigate the catalog
- Initial payload measured under 500KB

**What's out of scope:** New features. Visual changes beyond accessibility-driven adjustments.

### ho-15 — Companion essay: "Planting the Garden"

Write the companion essay that articulates Shoshin no Sono in the way *The Empty Container* articulates Glassroom and *Three Hours* articulates the Ho System. Publish to Substack. Link from the site's About page. Add the essay as an entry in `works.json` using the Founder (this is itself a use of the production system to register the system's own companion essay — a small recursion).

**Depends on:** ho-14 (so the practitioner can write about a finished thing rather than an in-progress thing).

**What's in scope:**
- Essay draft, multiple revisions
- Publication to Substack
- About page link addition
- Entry for the essay in `works.json` via the Founder

**What "done" means:**
- Essay is published at `sageframe.substack.com`
- Site's About page links to it
- The essay's `works.json` entry has appropriate relationships back to Shoshin no Sono and to the body of work it surveys

**What's out of scope:** Marketing the essay. Translation. Anything beyond the publish-and-link loop.

### ho-16 — Merge to main, retire prototype, ship v1.0

Final review pass over everything. Merge `labs` → `main` in `sageframe-no-kaji/shoshin-no-sono`. The build pipeline pushes static output to `sageframe-dharma/sageframe.net`. The current 80s-MIT-page prototype is replaced. Tag the release `v1.0`. The new sageframe.net is live.

**Depends on:** ho-15.

**What's in scope:**
- Final review of all surfaces, all flows, all docs
- Merge `labs` → `main`
- Verify production deploy to sageframe-dharma
- Verify the production site at sageframe.net
- Tag `v1.0` on `sageframe-no-kaji/shoshin-no-sono`
- Optional: announce the launch (LinkedIn, Substack)

**What "done" means:**
- sageframe.net renders Shoshin no Sono
- The previous prototype is no longer accessible (the `v0-legacy` tag preserves it in the dharma repo's history)
- `v1.0` tag exists on the source repo

**What's out of scope:** Post-launch features. v1.5 planning.

---

## What's NOT in this sequence

The following are tracked for v1.5 or post-v1. Not part of the v1.0 release.

- **Interactive peak-dragging (visitor-as-Marco-Polo).** The position physics supports it; the UI surface is not built. Available to enable in a focused v1.x ho without architectural change.
- **Animation between filter changes.** Currently filter changes swap maps cleanly. A morphing transition between Venices could be added without changing data or pipeline. Held back to keep the Calvino discipline of each Venice standing on its own legible.
- **Multi-language i18n.** Sveltia supports it; the schema can be made multi-locale. Not built; not planned for v1.
- **Additional view modes.** A chronological timeline. A lineage tree focused on a single work and its descendants. A focused-neighborhood view. The Indexer's query interface supports them; new renderers can be added without changing data or auth.
- **Programmatic Venice export.** Build-time export of canonical Venices as PNG or SVG for social cards, print, or archive. The render pipeline is pure; the export is straightforward.
- **Photography subsystem.** Deferred from the seed. `photography.sageframe.net` (subdomain) vs `sageframe.net/photography` (path). Decision waits until photography is meaningfully populated in the catalog.
- **Resonance Field crosslink with atmarcus.net.** Permanently parked. The Resonance Field on atmarcus.net keeps its hardcoded `HERO_PROJECTS`. The two systems are aesthetic siblings (same wave-interference family) but not data siblings.
- **Practice History cartography for atmarcus.net.** If atmarcus.net ever wants a map of its own — the pre-2024 architecture, education, and teaching work rendered as its own terrain, prior engagements clustered as regions of villages with associated portfolio pieces and writing — reuse the Shoshin cartography engine against a different corpus. Aesthetic sibling, separate data, separate project. Same relationship the Resonance Field has to Shoshin. Post-v1, and only if atmarcus warrants it.

---

## Replan checkpoints

Three phase-boundary checkpoints plus one mid-phase decision-trigger checkpoint:

1. **End of Phase 1 (after ho-03).** MVP catalog is live. Decision: continue to Phase 2 (cartography) or ship MVP as v1 and defer cartography. Default: continue.
2. **After ho-04 (mid-Phase 2).** Visual register exploration is committed. Decision: confirm register reads correctly at planned scale; if not, another ho-04 pass before ho-05 begins.
3. **End of Phase 2 (after ho-09).** Cartography works on desktop. Decision: continue to Phase 3 (authoring) or ship desktop-only as v1. Default: continue, because the Dandori friction is real and Phase 3 fixes it.
4. **End of Phase 3 (after ho-12.5).** Authoring works; the catalog is fully populated. Decision: continue to Phase 4 (polish and ship). Default: continue, no real alternative.

The Phase 4 boundary is the ship moment, not a replan checkpoint. By the time the practitioner reaches it, the decision was made phases ago.

---

## Numbering and insertion

Hos use `ho-NN` numbering. Splits produce `ho-NN.1`, `ho-NN.2`, etc. Insertions between hos produce `ho-NN.5` (or `.3`, `.7` if multiple insertions cluster). This scheme exists because plans evolve — a ho that turned out to be two hos splits in place; a ho that wasn't planned but is needed inserts between numbered neighbors.

The overview is updated when splits or insertions happen. New hos are added to the document; revised dependencies are noted; release tags shift if a phase's content materially expands.

## Anticipated splits and insertions

**Most likely splits:**

- **ho-01 → ho-01.1, ho-01.2** (only if surfacings during MVP hydration reveal substantial schema revisions warranting a midpoint pause; ho-01.1 = first 10 entries + surfacings synthesis; ho-01.2 = schema revision + remaining entries)
- **ho-04 → ho-04.1, ho-04.2** (peaks-and-contours register vs towns-and-features register)
- **ho-05 → ho-05.1, ho-05.2** (positions vs heightfield)
- **ho-08 → ho-08.1, ho-08.2** (structural edges vs linear edges)
- **ho-12 → ho-12.1, ho-12.2, ho-12.3** (form-and-OAuth, AI-assist integration, diff review UI) — splitting is anticipated as normal evolution rather than fallback
- **ho-13 → ho-13.1, ho-13.2** (simplified cartography vs URL state preservation)

**Planned insertions:**

- **ho-01.5 — Environment scaffold.** Inserted (2026-06-12, at ho-02 authoring). The technical scaffold ho-00 didn't produce — test harness, lint/type stack, validator, placeholder page, project CLAUDE.md — landed as its own ho before the first code ho rather than folded into ho-02. See the Phase 1 entry.
- **ho-06.5 — Tuner landing.** Inserted (2026-06-13, after ho-06). The by-feel tuner pass on the field `opts` — deferred through ho-05 and ho-06 — landed in the practitioner's hand and moved every field default; ho-06.5 locks them across `contours.js`, `field.js`, and `cartographer.js`. The forward-only response to ho-06 having closed its tuner verdict on the model's eye. See the Phase 2 entry.
- **ho-12.5 — Complete the hydration via the Founder.** Now a planned ho, not a contingency. ho-01 produces an MVP sample of ~20 entries; the remaining works in the body of work (estimated 20-30 more) hydrate through the Founder UI in ho-12.5. This makes the Founder's first real-world test a bulk operation against the production workflow, which is a much stronger validation than adding a single hypothetical new work. Surfacings from ho-12.5 may also drive prompt-template iteration for the Scribe.

**Conditional insertions:**

- **ho-04.5** (recalibration after the visual-register checkpoint, before procedural generation begins)
- **ho-09.5** (cartography performance tuning if needed after the full visualization is live)

The practitioner is not bound to these. They are the patterns the build is most likely to produce, named so they don't surprise.

---

## Other deferred decisions

Decisions that don't tie to a specific v1 ho:

- **Final wording of the gates on the About page.** The seven gates (methodology, political, safety, somatic, craft, family, cosmological) are named; the descriptions of each gate are editorial and can be refined in a polish pass during Phase 4 or post-v1.
- **The operational sentence sharpening.** The hero paragraph carries the soul sentence ("an epistemology of learning, creation, and craft"). The operational sentence — "the practice of building tools, methodologies, and writing that hold the practitioner's presence inside AI-mediated work" — remains in workshop. It may appear in the companion essay (ho-15) or stay in private working notes.
- **Whether to expose the layout-seed mechanism.** The system supports reproducible layouts via URL seed. Whether to surface this in the UI (a "lock this view" button on the share affordance) is a polish-phase decision, not a v1 ho.

---

## Dependency summary

```
ho-00 (scaffold)
  │
  ▼
ho-01 (MVP sample, ~20 entries)
  │
  ▼
ho-01.5 (environment scaffold)
  │
  ▼
ho-02 (indexer)
  │
  ▼
ho-03 (grid + Gate) ───────► v0.1 ★ replan checkpoint
  │
  ▼
ho-04 (visual register) ★ decision-trigger checkpoint
  │
  ▼
ho-05 (positions + heightfield)
  │
  ▼
ho-06 (contours)
  │
  ▼
ho-06.5 (tuner landing)
  │
  ▼
ho-07 (towns + populate)
  │
  ▼
ho-08 (relationship features)
  │
  ▼
ho-09 (interactions) ───────► v0.2 ★ replan checkpoint
  │
  ├──► ho-10 (Steward)
  │
  ├──► ho-11 (Scribe)
  │
  └──► ho-12 (Founder, single-work verification)
            │
            ▼
       ho-12.5 (Founder bulk hydration, ~20-25 entries) ───► v0.3 ★ replan checkpoint
                                 │
                                 ▼
                              ho-13 (mobile)
                                 │
                                 ▼
                              ho-14 (perf + a11y)
                                 │
                                 ▼
                              ho-15 (companion essay)
                                 │
                                 ▼
                              ho-16 (ship) ────► v1.0 ★
```

Hos 10, 11, and 12 have some independence in execution order. The Founder (12) depends on the Scribe (11) and the Steward (10) — but 10 and 11 can run in either order. The diagram shows them as parallel for clarity.

---

## What to do with this document

The overview lives in the repo at `kamae/shoshin-no-sono-kamae-4-ho-overview.md`. The practitioner returns to it between hos: to confirm what's next, to update what changed, to mark splits and insertions as they happen. After each phase boundary, the practitioner cuts a release tag and notes the actual state of the build against the planned phase content.

When a per-ho document is needed for an upcoming session, the practitioner invokes `ho-kamae-5-authoring-collaborator` against the relevant ho's entry in this overview. The per-ho document gets the depth this overview does not carry — full scope, full acceptance criteria, full implementation notes — bounded for one focused session.

When the architecture reveals a gap during the build, the practitioner returns to the System Design and updates it; this overview gets refreshed downstream. When a scope decision needs revisiting, the practitioner returns to the seed and asks whether the core idea is still right. The chain stays honest by being walked.

The map is the argument. The argument is that the work is one project. The project is Shoshin. The garden is Shoshin no Sono.
