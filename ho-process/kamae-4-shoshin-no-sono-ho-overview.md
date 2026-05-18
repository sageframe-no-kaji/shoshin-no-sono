# 初心の園 — Shoshin no Sono — Ho Overview

Five phases. Seventeen hos plus ho-00. Three replan checkpoints, one ship moment. Decisions render inline with the ho that resolves them. Release tags at every phase boundary.

## What this is, and what it is not

This is the build's directional plan, not a contract. The seed and System Design committed to architecture; this document sequences the work that builds it. Hos will split, insert, and reorder as the build reveals what it actually requires — the numbering scheme exists for that. The overview is a living document; the practitioner updates it as hos complete and reveal what the next ones actually need to be.

It is also not a per-ho document. Each ho gets its own scope at session time via `ho-kamae-5-authoring-collaborator`. The overview is the map. The per-ho documents are the bounded scope for individual sessions. Both stay honest to each other.

---

## Phase structure

| Phase | Hos | What it produces |
|---|---|---|
| 0. Foundation | ho-00 | The repo exists; the framing documents are committed; schema is finalized; a preview URL serves an empty page |
| 1. Data and visible catalog | ho-01, ho-02, ho-03 | A shareable MVP catalog: grid view, filter URLs, the body of work in `works.json` |
| 2. Cartography | ho-04, ho-05, ho-06, ho-07, ho-08, ho-09 | The procedural interference cartography rendering on desktop with full interaction |
| 3. Authoring | ho-10, ho-11, ho-12 | A live catalog: the Steward edits existing works; the Founder adds new ones with AI-assist via the Scribe |
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

This phase produces the first version of the catalog that someone can actually visit. By the end, every work in the body of work is in `works.json` with relationships and themes; the Indexer's query API works; the grid view renders cards organized by `work_group`; and the Garden Gate makes URLs into doors. The cartography is still the next phase, but the site is already legible — a stranger sent a URL with `?theme=craft` lands on a filtered grid view of the relevant works. This is the MVP threshold. After this phase, the project could in principle ship as a grid-only catalog; the cartography is what makes it the demonstration the seed describes, but the catalog itself is real after Phase 1.

*Release on phase complete: v0.1*

### ho-01 — Hydrate works.json from the existing inventory

The body of work already exists as a structured document: `sageframe_labs_work.md`, ~750 lines, two-register descriptions per work, current as of mid-May 2026. This ho turns that document into a populated `works.json`. A one-time local Python or Node script calls the Claude API directly (not the Worker — the Worker does not exist yet) with the inventory document, the schema, and a prompt template instructing the model to produce schema-compliant entries with proposed relationships, themes, tags, work_group placement, and importance values. The practitioner reviews every entry; corrections happen against the proposal, not from blank. The result is a `works.json` carrying roughly thirty to fifty entries.

**Depends on:** ho-00.

**What's in scope:**
- One-time hydration script (local, not deployed)
- Prompt template for inventory-to-schema conversion (may share lineage with the future `prompts/ai-assist.md` but is its own artifact)
- Author review of every proposed entry
- Final commit of populated `works.json`

**What "done" means:**
- `works.json` contains all current works, methodologies, and writing pieces
- Every entry validates against the schema
- Relationships, themes, tags, importance reviewed and corrected
- Schema validation passes in the build pipeline

**What's out of scope:** Anything that renders this data. No Indexer, no views.

**Decisions required:**
- **Hydration script implementation language**: Python or Node. Decision criterion: whichever produces the cleanest one-time-use script that handles JSON-mode Claude API output and writes validated output to disk. Lean Python unless there's a reason to match a future Node build pipeline.

**Possible split:** If the corpus turns out larger than expected, or if the proposed entries need substantial cleanup, split into ho-01.1 (script + first-pass generation) and ho-01.2 (review and corrections). Real-world data sometimes reveals schema gaps that need addressing before the file is committed; a small ho-01.5 may be needed if so.

### ho-02 — The Indexer

The Indexer is a vanilla JS module that loads `works.json` once per page session and builds the derived runtime structures every downstream component depends on: inverse edge index, settlement weights (log-scaled sum of `documents` edge strengths per writing piece), theme membership sets, per-work importance values. It exposes a query API that the Cartographer and Garden Gate will call. By the end of this ho, the data is hydrated into a working query layer; nothing renders yet, but the queries return correct answers in the browser console.

**Depends on:** ho-01.

**What's in scope:**
- Data loading from `works.json`
- Inverse edge index construction
- Settlement weight computation
- Theme membership index
- Query API: `getWork(id)`, `getIncoming(id, edgeType?)`, `getOutgoing(id, edgeType?)`, `worksByTheme(theme)`, `worksByMedia(media)`, `settlementWeight(workId)`, `articulatesEdge(fromId, toId, type)`

**What "done" means:**
- Browser console on the preview URL: `indexer.getWork('kanyo')` returns the work
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

The Cartographer's first two pipeline stages. Position assignment uses d3-force with random seed by default; an optional URL seed parameter reproduces a specific layout. The heightfield generator produces a 2D grid of elevation values by summing radial functions (Gaussian by default; wave-interference variants prototyped if Gaussian doesn't read right) centered at each peak with amplitude set by `importance × filter_relevance`. The output of this ho is not the final cartography — it is the math working, rendered as a debug heat map so the practitioner can verify positions and elevations behave correctly across filter states.

**Depends on:** ho-04.

**What's in scope:**
- Position assignment via d3-force
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
- **Position assignment strategy**: pure procedural per render is the default (chosen). Anchored procedural (key works pinned at semantic positions) is available for free if needed. URL-seeded reproducibility is the third tier. Decision: confirm pure procedural in practice; enable anchored variant only if pure procedural doesn't produce recognizable Venices across renders. Criteria: (1) does the Venice remain recognizable across renders for the same filter, (2) does the variation read as deliberate or random, (3) does it render at acceptable performance for the body of work's current size.
- **Heightfield function family**: Gaussian by default. If Gaussian produces terrain that reads as data-viz rather than architectural, prototype wave-interference variants (the Resonance Field family). Criteria: which produces contour patterns that read as topographic at the visual register from ho-04.

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

**Possible split:** If the chronological populate animation turns finicky (timing, easing, cancellation when filter changes mid-populate), split into ho-07.1 (placement and static rendering) and ho-07.2 (populate animation).

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

This phase makes the catalog alive. The Steward (Sveltia CMS) handles general editing of existing entries. The Scribe (Cloudflare Worker) holds the Anthropic API key and proxies AI-assist calls. The Founder (custom new-work admin tool) integrates with the Scribe to make adding new works a fifteen-minute practice. By the end of this phase, the Dandori test passes: a real new work goes from "I've shipped this" to "it's live in the catalog with correct relationships" in one focused session.

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
- Use the Founder to add a hypothetical fifty-first work
- AI-assist proposes sensible relationships
- The diff review is clear and operable
- Commit lands; site rebuilds; new work integrated
- The Dandori test passes: 15-20 minutes from form-open to live

**What's out of scope:** Editing existing works (the Steward handles this). Bulk operations.

**Decisions required:**
- **Founder implementation language**: vanilla JS or Svelte. Decision criterion: whichever produces the simplest and most learnable implementation of the in-browser-to-Worker-to-API pattern. Lean vanilla JS unless Svelte's reactivity meaningfully simplifies the diff review UI.

**Possible split:** Likely. The Founder has three distinct sub-problems — form-and-OAuth (ho-12.1), AI-assist call and response handling (ho-12.2), diff review UI and commit (ho-12.3) — and any of them could turn out larger than anticipated. Splitting is anticipated as a normal evolution rather than a fallback.

---

**Phase boundary — replan checkpoint.** Authoring works. The Dandori test passes. The catalog is alive. Three questions to settle before committing to Phase 4: Are there changes to the AI-assist prompt template that real usage during this phase has revealed? Should the visual register be revised based on what real data has surfaced (e.g., certain relationship features may need adjustment now that the practitioner has been clicking around the cartography for days)? Is the practitioner ready to commit to a target date for v1.0 or holding open? Default: continue to Phase 4 — the remaining work is polish and ship.

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

---

## Replan checkpoints

Three phase-boundary checkpoints plus one mid-phase decision-trigger checkpoint:

1. **End of Phase 1 (after ho-03).** MVP catalog is live. Decision: continue to Phase 2 (cartography) or ship MVP as v1 and defer cartography. Default: continue.
2. **After ho-04 (mid-Phase 2).** Visual register exploration is committed. Decision: confirm register reads correctly at planned scale; if not, another ho-04 pass before ho-05 begins.
3. **End of Phase 2 (after ho-09).** Cartography works on desktop. Decision: continue to Phase 3 (authoring) or ship desktop-only as v1. Default: continue, because the Dandori friction is real and Phase 3 fixes it.
4. **End of Phase 3 (after ho-12).** Authoring works. Decision: continue to Phase 4 (polish and ship). Default: continue, no real alternative.

The Phase 4 boundary is the ship moment, not a replan checkpoint. By the time the practitioner reaches it, the decision was made phases ago.

---

## Numbering and insertion

Hos use `ho-NN` numbering. Splits produce `ho-NN.1`, `ho-NN.2`, etc. Insertions between hos produce `ho-NN.5` (or `.3`, `.7` if multiple insertions cluster). This scheme exists because plans evolve — a ho that turned out to be two hos splits in place; a ho that wasn't planned but is needed inserts between numbered neighbors.

The overview is updated when splits or insertions happen. New hos are added to the document; revised dependencies are noted; release tags shift if a phase's content materially expands.

## Anticipated splits and insertions

**Most likely splits:**

- **ho-01 → ho-01.1, ho-01.2** (if hydration script generation and author review each become substantial work in their own right)
- **ho-04 → ho-04.1, ho-04.2** (peaks-and-contours register vs towns-and-features register)
- **ho-05 → ho-05.1, ho-05.2** (positions vs heightfield)
- **ho-08 → ho-08.1, ho-08.2** (structural edges vs linear edges)
- **ho-12 → ho-12.1, ho-12.2, ho-12.3** (form-and-OAuth, AI-assist integration, diff review UI) — splitting is anticipated as normal evolution rather than fallback
- **ho-13 → ho-13.1, ho-13.2** (simplified cartography vs URL state preservation)

**Most likely insertions:**

- **ho-01.5** (schema refinement after real-data reveals gaps)
- **ho-04.5** (recalibration after the visual-register checkpoint, before procedural generation begins)
- **ho-09.5** (cartography performance tuning if needed after the full visualization is live)
- **ho-12.5** (prompt template iteration after first real Dandori test if proposals aren't reliably good)

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
ho-01 (data)
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
  └──► ho-12 (Founder) ─────► v0.3 ★ replan checkpoint
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
