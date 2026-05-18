---
created: 2026-05-18
status: draft
type: system-design
project: shoshin-no-sono
stage: kamae-2
kamae-chain: seed → **system-design** → readme → ho-overview
builds-on: shoshin-no-sono-kamae-1-seed
next: shoshin-no-sono-kamae-3-readme
---

# 初心の園 — Shoshin no Sono — System Design

*The Garden of Beginner's Mind*

---

## Where this document sits

This is the second document of the Kamae chain. The seed established the core idea — Shoshin no Sono as a public-facing demonstration that the body of work is one project, an epistemology of learning, creation, and craft, rendered as procedurally generated interference cartography. This document takes the seed's architectural opinions and commits them to decisions. The README (Kamae 3) will be writable from this document without coming back.

The seed's architectural direction held up well to pressure-testing. Where decisions changed during System Design, the reasoning is captured in the relevant section. Where decisions deferred to specific hos, the deferral is named — silence is not deferral; "TBD" is not a decision.

---

## 1. Architecture Overview

Shoshin no Sono is composed of six components, organized into three groups by who interacts with them.

```
╔════════════════════════════════════════════════════════════════╗
║                       VISITOR-FACING                            ║
║                                                                 ║
║   ┌──────────────────┐       ┌────────────────────────┐        ║
║   │  Garden Gate     │◀─────▶│   Cartographer         │        ║
║   │  (URL state,     │       │   (procedural map,     │        ║
║   │   filter chips,  │       │   contour terrain,     │        ║
║   │   navigation,    │       │   town placement,      │        ║
║   │   share links)   │       │   feature rendering)   │        ║
║   └────────┬─────────┘       └──────────┬─────────────┘        ║
║            │                            │                       ║
║            │      ┌──────────────────┐  │                       ║
║            └─────▶│   Indexer        │◀─┘                       ║
║                   │   (works.json,   │                          ║
║                   │   derived edges, │                          ║
║                   │   query API)     │                          ║
║                   └────────┬─────────┘                          ║
╚════════════════════════════╪══════════════════════════════════╝
                             │
                             ▼
                   ┌─────────────────────┐
                   │  works.json         │
                   │  (in GitHub repo,   │
                   │   single source     │
                   │   of truth)         │
                   └──────────▲──────────┘
                              │
╔═════════════════════════════╪═══════════════════════════════════╗
║                       PRACTITIONER-FACING                        ║
║                              │                                   ║
║  ┌──────────────────┐        │       ┌────────────────────┐     ║
║  │  The Steward     │────────┼───────│   The Founder      │     ║
║  │  (Sveltia CMS,   │        │       │   (custom new-work │     ║
║  │   general edit,  │        │       │   tool, AI-assist  │     ║
║  │   field-level    │        │       │   diff review,     │     ║
║  │   editing)       │        │       │   multi-entry      │     ║
║  └──────────────────┘        │       │   commits)         │     ║
║                              │       └──────────┬─────────┘     ║
║                              │                  │               ║
║                              │                  ▼               ║
║                              │       ┌────────────────────┐     ║
║                              │       │  The Scribe        │     ║
║                              │       │  (Cloudflare       │     ║
║                              │       │  Worker, prompt    │     ║
║                              │       │  template, Claude  │     ║
║                              │       │  API proxy)        │     ║
║                              │       └────────────────────┘     ║
╚═════════════════════════════════════════════════════════════════╝
```

**Visitor-facing components** render the catalog as a visual artifact and navigate it. **Practitioner-facing components** maintain the catalog. **The shared substrate** is `works.json`, the single source of truth that lives in the GitHub repo.

The architecture's central choice is that **the visualization is generated**, not stored. There is no cached layout, no server-rendered map, no canonical view. Each visitor's render is produced fresh from the current data plus their filter state. This is what makes the body of work feel alive — adding a new work changes the territory; nothing else has to be updated.

Six components is more than the seed proposed. The Steward (CMS) and Founder (new-work tool) split because Sveltia CMS doesn't support custom widgets, and the AI-assist diff review is structurally unlike normal field editing. Splitting honors that distinction and produces a cleaner architecture.

---

## 2. Component Breakdown

### The Indexer

**Responsibility.** Load `works.json` once per page session. Build derived runtime structures: the inverse edge index (for every work, what points at it and through what edge type), settlement weights for writing pieces (computed from `documents` edge strengths via log-scaled sum), per-work importance values, theme and tag membership sets. Expose a query interface that the Cartographer and Garden Gate call.

**Interface.** Methods include `getWork(id)`, `getIncoming(id, edgeType?)`, `getOutgoing(id, edgeType?)`, `worksByTheme(theme)`, `worksByMedia(media)`, `settlementWeight(workId)`, `articulatesEdge(fromId, toId, type)`. All read-only; all derived from the single source.

**Boundaries.** The Indexer is the only component that knows about the on-disk data structure. The Cartographer asks the Indexer for shapes, not for raw JSON. Changes to the schema (new edge types, new optional fields) are absorbed inside the Indexer; downstream components don't see them.

**Replaceability.** Not replaceable; this is the project's data model made operational.

### The Garden Gate

**Responsibility.** Handle URL state, navigation, view toggling, and the "gates on every side" mechanic. Parse URL query parameters (`?theme=craft&focus=ho-system&seed=abc123` etc.) into render state. Update the URL when the visitor changes filters or focus. Provide a "share this view" affordance that writes the current state — including an optional layout seed — into a shareable URL.

**Interface.** A small state machine. Exposes `currentState()` returning `{filter, focus, view, seed?}`. Exposes `setState(partial)` which updates the URL and re-renders. Exposes `shareableURL()` for the share affordance.

**Boundaries.** The Garden Gate is the only component that touches the URL. Other components read render state through the Gate's interface, never directly from `window.location`.

**Replaceability.** Not replaceable; this is the architectural commitment to URLs-as-doors.

### The Cartographer

**Responsibility.** The visualization centerpiece. Given a filter state and the Indexer, produce a rendered SVG map.

Pipeline:
1. *Filter relevance pass.* For each work, compute its relevance under the active filter (full peak, partial peak, background, or excluded).
2. *Position assignment.* Compute peak positions via d3-force simulation with a random seed (fresh per render) — or, if a seed is provided in URL state, reproduce the same layout.
3. *Heightfield generation.* Sum of radial functions (Gaussian, with optional wave-interference variants — see the Visualization Spike ho) centered at each peak position, with amplitudes set directly by `importance × filter_relevance`.
4. *Contour extraction.* Marching squares pulls iso-elevation paths from the heightfield. These become the contour lines on the rendered map.
5. *Town placement.* Writing pieces sit at barycentric positions weighted by their `documents` edge strengths, biased toward strength-3 anchors when present. Settlement sizes computed as `log(sum_of_strengths)` mapped to a four-level scale (hamlet/village/town/city).
6. *Feature rendering.* Typed edges become cartographic features per the relationship grammar (see Data Model).
7. *SVG render.* Composed into a single SVG document with the visual register defined in Ho 4.

After the SVG renders, towns fade in sequentially in publication date order. This is the visible craft of map-making — the territory settles, then the writing arrives across it in the order it was written.

**Boundaries.** The Cartographer never touches `works.json` directly; it goes through the Indexer. The Cartographer never touches URL state; it goes through the Garden Gate. The Cartographer never authors anything; it is purely a render component.

**Replaceability.** The render pipeline has internal stages, each of which is mostly pure (deterministic given input). The position-assignment stage is the one with the most design intent embedded and the one most likely to be tuned in the visualization spike. The other stages are mathematical and stable.

### The Steward (Sveltia CMS)

**Responsibility.** General editing of existing entries. Editing descriptions. Adding writing pieces to works that already exist. Fixing typos. Updating metadata. Managing themes and tags. The everyday maintenance surface.

**Interface.** Sveltia's form UI, configured via `admin/config.yml` to match the schema. GitHub OAuth for authentication. Commits go to the `main` branch of `sageframe-no-kaji/shoshin-no-sono`.

**Boundaries.** The Steward does not handle new-work creation (that's the Founder). The Steward does not call the AI-assist (that's the Founder/Scribe pair). The Steward is plain CMS work — schema-validated form editing, atomic commits.

**Replaceability.** Sveltia is config-compatible with Decap CMS; swapping is a one-URL change in the deployed admin page. If Sveltia's beta-state limitations bite in practice, the architecture supports falling back to Decap without restructuring.

### The Founder (custom new-work admin tool)

**Responsibility.** The new-work creation flow specifically. A purpose-built single-page tool at `/admin/new/`. Form for the partial entry. AI-assist integration. Multi-entry diff review. Single transactional commit of all accepted changes.

**Interface.** Browser-facing form. POSTs to the Scribe (Cloudflare Worker) when AI-assist is invoked. Reads and writes the repo via the GitHub API using the OAuth token the visitor authenticated with (the same OAuth app Sveltia uses, sharing the auth flow).

**Boundaries.** The Founder is the only component that does multi-entry edits. When a new work arrives, the Founder may commit changes to the new entry AND to existing entries (reverse-direction edges). Sveltia does atomic edits to one entry; the Founder does coordinated edits across many.

**Replaceability.** The Founder is purpose-built. It is itself a small Shoshin object — software for maintaining the software catalog. Hand-rolled in vanilla JS or Svelte (decision deferred to Ho 12). Replaceable in principle, but its replacement would itself be a small custom tool, not a different generic CMS.

### The Scribe (Cloudflare Worker)

**Responsibility.** The AI-assist endpoint. Receives a partial new-work entry plus the full current `works.json` from the Founder. Loads the prompt template (committed in the repo at `prompts/ai-assist.md`, bundled into the Worker at deploy). Calls the Anthropic Claude API. Returns structured JSON: outgoing edges for the new entry, themes, tags, work_group placement, importance estimate, and reverse-direction edge proposals for existing works.

**Interface.** Single HTTPS endpoint accepting POST. Returns structured JSON. Holds the Anthropic API key as a Cloudflare environment variable (never committed to the repo).

**Boundaries.** The Scribe does not modify any data. It only proposes. The Founder presents proposals to the practitioner for review; the practitioner decides which proposals become commits. The Scribe is purely an inference function.

**Replaceability.** The Scribe could in principle be replaced with any LLM endpoint that accepts the same input format and returns the same output schema. The prompt template is version-controlled; iteration on prompt quality is independent of the Worker infrastructure.

---

## 3. Core Interactions

Two interactions matter most. Both are traced end to end through the architecture below.

### Interaction A — Visitor enters via a shared URL

A visitor opens `sageframe.net/?theme=craft&focus=ho-system`, sent to them by the practitioner or shared by another reader.

1. Cloudflare Pages serves the static HTML shell from `sageframe-dharma/sageframe.net`. JS loads.
2. The Garden Gate parses URL parameters: `filter.theme = craft`, `focus = ho-system`, no seed (so layout will be fresh).
3. The Indexer fetches `works.json` (cached aggressively — single request per session). Builds derived structures: inverse edge index, settlement weights, theme membership sets.
4. The Cartographer is invoked with the render state from the Garden Gate.
5. The Cartographer's pipeline runs: filter relevance (craft-tagged works → full peaks, theme-adjacent → partial, others → background or excluded). Position assignment via d3-force with random seed. Heightfield generation. Contour extraction. Town placement weighted toward referent peaks. Feature rendering for relationship types. SVG composition.
6. The browser renders the SVG. The terrain appears complete on the first paint.
7. Writing-piece towns fade in sequentially by publication date. The visitor watches the writing arrive across the territory in the order it was written.
8. The visitor interacts: hover-highlight, click-card, click-relationship-feature. The Cartographer handles in-place card overlays without page navigation.
9. The visitor clicks a card's primary CTA (e.g., "Visit Kanyō") → they leave the catalog. Or they click a relationship feature whose edge has `articulated_in` set → they navigate to the essay that articulates the relationship. Or they change a filter → the Garden Gate updates the URL and re-invokes the Cartographer, which renders a fresh map with new positions.

The visitor never sees infrastructure. The map is the experience. The catalog has done its job when the visitor has clicked through to the canonical home of a work or the writing that articulates it.

### Interaction B — Practitioner adds a new work

The practitioner has just shipped Dandori. They want it in Shoshin no Sono.

1. Practitioner navigates to `sageframe.net/admin/new/`.
2. GitHub OAuth flow authenticates them against `sageframe-no-kaji/shoshin-no-sono` (first session only; subsequent visits reuse the token).
3. The Founder renders a form. Practitioner fills minimal fields: `id: dandori`, `name: Dandori`, `native_script: 段取り`, `media: [methodology]`, `status: shipped`, `deployment[0]: {label: GitHub, url: https://github.com/sageframe-no-kaji/dandori}`, `short_description: (paste from README)`, `work_group: methodology`. Maybe 90 seconds of typing.
4. Practitioner clicks "AI-assist."
5. The Founder POSTs to the Scribe's URL with: the partial entry, the full current `works.json`, and a context flag.
6. The Scribe loads the prompt template, constructs the Claude API request (system prompt = the template; user message = the partial entry plus serialized `works.json` plus instructions to propose relationships, themes, tags, group placement, importance, AND reverse-direction edge proposals).
7. The Scribe calls the Anthropic API. Receives a structured response. Returns it to the Founder.
8. The Founder renders the response as a diff: left column shows the new entry with proposed fields populated; right column shows proposed edits to existing entries (e.g., "Ho System: add `succeeded_by: dandori`"; "*Three Hours*: add `paired_with: dandori`"). Each proposal is accept/reject/edit-able individually.
9. Practitioner reviews. Most proposals accepted. One edge type corrected (the LLM proposed `documents: ho-system, strength: 2`; practitioner bumps to strength 3 because Dandori specifically argues for Ho System as its parent methodology).
10. Practitioner clicks "Commit." The Founder constructs a single git commit containing: the new `dandori` entry, the new `succeeded_by` edge on `ho-system`, the new `paired_with` edge on `three-hours`, and any other accepted changes. Commits to `main` via the GitHub API.
11. The push to `main` triggers a GitHub Action in `sageframe-no-kaji/shoshin-no-sono`. The Action runs the build (if any — likely just validating the schema), then pushes the static output to `sageframe-dharma/sageframe.net`. Cloudflare Pages rebuilds and deploys, typically in 30-90 seconds.
12. The next visitor to `sageframe.net` sees Dandori as a new peak. The map regenerates fresh from the new data. The relationships accepted in step 9 are now part of the topology.

Total time, end to end: 15-20 minutes, most of which is the practitioner reviewing proposals. The Dandori test passes.

---

## 4. Data Model

### Source of truth

A single JSON file, `works.json`, lives in `sageframe-no-kaji/shoshin-no-sono`. Schema lives alongside it in `schema.json`. All editing tools — the Steward, the Founder, manual VSCode edits — write to this file. There is no second system of record.

### Schema overview

The schema (drafted as `sageframe_labs_schema.json` v3; minor revisions captured below) carries:

- **`document`** — site-level metadata (title, author, last_updated, purpose).
- **`web_properties`** — the four-property brand architecture (atmarcus.net, sageframe.net, sageframe.substack.com, pinkteaming.net) and the job each does.
- **`additional_outlets`** — secondary surfaces (Medium, LinkedIn, GitHub).
- **`theme_vocabulary`** — controlled vocabulary of ~8 themes, each with a description. Themes are curatorial axes, distinct from tags.
- **`work_groups`** — exclusive categorical bins, one per work. Vocabulary review during data population.
- **`works`** — the body of work as an array of records.

### The `works` collection

Each work is one record. Fields:

- `id` (string, slug, stable identifier — never change after publication)
- `name`, `native_script`, optional translation gloss
- `media` (array — software, writing, website, image, talk, methodology — declares form; hybrid works honest about being hybrid)
- `group` (one work_group)
- `status` (shipped, live, in-development, scaffolded, archived, published, near-publication)
- `tags` (open vocabulary, categorical)
- `themes` (1-3 from controlled vocabulary)
- `repo`, `license`
- `deployment` (array of `{label, url}` — first entry is the primary CTA)
- Media-conditional fields: `tech_stack`, `publication_date`, `outlet`, `word_count`, `embed_url`
- `short_description` (README-voice, what it is and does)
- `substantive_description` (Substack voice, what it means)
- `relationships` (array of typed directional edges — see below)
- `images`
- **`importance`** (manual, 1-10 editorial integer — drives peak height directly; replaces the composite calculation in the seed-era schema)
- `color`, `featured`
- `created`, `last_updated`

### Relationship encoding

Relationships are typed directional edges, stored once on the source work's entry. Each edge has:

- `to` (target work id)
- `type` (controlled vocabulary)
- `strength` (optional, 1-3 for documents-class edges; per-type defaults otherwise)
- `articulated_in` (optional, essay id — the writing that articulates this specific relationship)

**Relationship types and their cartographic semantics:**

| Type | Symmetric? | Cartographic feature |
|---|---|---|
| `descends_from` | No (directional) | Ridge from parent peak to child peak |
| `succeeded_by` | No (directional) | Ridge with directional notation |
| `succeeds` | No (directional) | Inverse of `succeeded_by`; rendered same way |
| `paired_with` | Yes (symmetric) | Twin peaks at similar elevation, shared col |
| `companion_to` | Yes (symmetric) | Adjacent towns sharing a road |
| `operationalizes` | No (directional) | Town at the foot of the operationalized peak |
| `personalizes` | No (directional) | Small settlement near the personalized work |
| `integrates` | No (directional) | Bridge connecting the integrator to the integrated |
| `validates` | No (directional) | Trail climbing from valley to summit |
| `uses_pedagogy_of` | No (directional) | Trail of a different style (pedagogical descent) |
| `documents` | No (directional) | Road from the town (writing) to the peak it documents; strength determines town size |
| `argues_for` | No (directional) | Town to peak, with rhetorical notation |
| `responds_to` | No (directional) | Town to town or town to peak, reactive |
| `illustrates` | No (directional) | Visual reference, small marker |

Symmetric types are stored once on either entry; the renderer treats them as undirected. Directional types are rendered with appropriate visual indication of direction.

### Documents-edge strength and town sizes

A writing piece's `documents` edges encode its specificity to each target work:

- `strength: 3` — the writing is *specifically about* the target
- `strength: 2` — the writing *directly names* the target
- `strength: 1` — the writing shares *topical relationship* with the target

The town's settlement size = `log(sum of all documents edge strengths)`, mapped to a four-level scale (hamlet → village → town → city). The town's position = barycentric weighted average of target peak positions, biased toward strength-3 anchors when present. A piece specifically about one work sits at the foot of that mountain; a piece touching many works lightly sits in a central trading-hub position.

### Derived views

The Indexer computes the following at runtime, never stored:

- **Inverse edge index.** For every work, the list of works that point at it and through what edge type. Enables the renderer to know that Ho System has 8 incoming `descends_from` edges and 12 incoming `validates` edges, even though Ho System's own entry doesn't store this.
- **Settlement weights.** Per writing piece, the log-scaled sum of `documents` edge strengths.
- **Theme membership.** Per theme, the set of works tagged with it.
- **Importance distribution.** Per work, `importance` field directly (no composite).
- **N×N relationship adjacency.** Computed only when needed by the position algorithm — not authored, never stored.

The N×N matrix the practitioner imagined during seed conversation exists as a *computed view* over the edge list, used internally by the position algorithm and any clustering/similarity computation. It is not the source of truth.

### Schema revisions queued before build

These changes happen in Ho 0 or Ho 1:

1. Rename `weight` field to `importance` to match the editorial vocabulary used in conversation.
2. Add optional `articulated_in` field to typed edge entries.
3. Remove the composite-importance calculation from the `rendering` block (importance is now a direct editorial input to peak height; centrality affects feature density only).
4. Document the `documents`-edge strength convention (1/2/3 for topical/named/specifically-about) in the schema.

---

## 5. Technology Stack

| Layer | Choice | Rationale |
|---|---|---|
| Static hosting | Cloudflare Pages | Free, fast, integrated with Workers, supports preview deploys per branch. Already in use for atmarcus.net and pinkteaming.net. |
| Source repo | `sageframe-no-kaji/shoshin-no-sono` | The tool lives in `no-kaji` because it is software, methodology, and a thinking-tool — not just a deployed site. |
| Deployment target | `sageframe-dharma/sageframe.net` | Pure-deployment repo for the served static output. Honors the seed's tool-vs-deployment separation. |
| Build pipeline | GitHub Action in `no-kaji/shoshin-no-sono` | Triggered on commit to `main`. Runs schema validation, builds static output, pushes to `dharma/sageframe.net`. |
| Frontend language | Vanilla HTML/JS/CSS | No framework. Established pattern from atmarcus.net and pinkteaming.net. Reasonable for a single-page site with one nontrivial visualization. |
| Visualization library | `d3-force` (via ESM CDN) | Used for the underlying graph physics to compute peak positions. Layout-only — rendering is hand-rolled SVG via marching-squares contour extraction. |
| Rendering target | SVG | Vector, scalable, hand-crafted aesthetic register, animations and interactions native, accessible. |
| Data storage | Single `works.json` file in repo | No database. Single source of truth. Version-controlled. Plays cleanly with always-link architecture. |
| Schema validation | JSON Schema (`schema.json`) | Validated at edit time (CMS-side and pre-commit hook) and at build time (GitHub Action). |
| CMS (general editing) | Sveltia CMS | Active modern Svelte successor to Netlify CMS / Decap CMS. Config-compatible with Decap (fallback path if Sveltia limitations bite). |
| Custom admin (new-work) | Hand-rolled at `/admin/new/` | Because Sveltia (public beta) does not support custom widgets. Built in vanilla JS or Svelte (decision in Ho 12). Uses same GitHub OAuth as Sveltia. |
| Auth | GitHub OAuth | Single OAuth app registered against `sageframe-no-kaji/shoshin-no-sono`. Both the Steward and the Founder authenticate through it. |
| AI-assist endpoint | Cloudflare Worker | Free tier covers our volume by orders of magnitude. Edge-deployed, low-latency. Holds the Anthropic API key as env variable. |
| LLM | Anthropic Claude API | Already in use by the practitioner. Paid usage (~few cents per AI-assist call; ~few dollars per year at expected volume). |
| Prompt template | Markdown file in repo (`prompts/ai-assist.md`) | Version-controlled artifact. Improves over time. Bundled into Worker at deploy. |

### Notes on choices that required real evaluation

**Sveltia vs Decap.** Initially recommended Decap based on age and documentation depth. Updated to Sveltia after current research: Decap has been "neglected for years" (per multiple sources including the Sveltia project's own documentation, corroborated by third-party migration accounts as recent as late 2025 and early 2026). Sveltia is the de facto successor — modern Svelte rewrite, ~5x faster, ~80% smaller bundle, actively maintained. Config-compatible with Decap means we can fall back if Sveltia's beta-state issues bite. Investing learning time in the actively maintained tool is the right call for the practitioner's future consulting work as well.

**Vanilla JS vs framework.** The seed proposed vanilla and the System Design ratifies it. The site is fundamentally one page (plus About) with one substantial visualization. A framework would add complexity without earning its weight. The hand-rolled approach matches the practitioner's existing skill stack from atmarcus.net and pinkteaming.net, and it keeps the deployed site small and fast.

**d3-force vs hand-rolled physics.** d3-force is used for the position-computation stage only. Hand-rolling node-spring physics with stable convergence is solved territory; d3-force has 15 years of edge cases worked out. The Resonance Field is hand-rolled because the physics is the visual goal (wave interference is the aesthetic). For Shoshin no Sono, the physics is means to layout, not the visual itself. d3-force is the right shape.

**Cloudflare Worker vs alternatives.** Considered: local script (breaks the in-browser CMS workflow), GitHub Action triggered by commit (asynchronous, requires PR review for what should be fluid), serverless on another platform. Worker chosen for tightest integration with Cloudflare Pages, generous free tier, and edge deployment.

---

## 6. Deployment Model

### Repository separation

**`sageframe-no-kaji/shoshin-no-sono`** — the tool. Contains source code for the Cartographer, Garden Gate, Indexer, Founder. Contains `works.json` and `schema.json`. Contains `prompts/ai-assist.md` and the Worker source. Contains the Sveltia config. The README of this repo describes Shoshin no Sono as software.

**`sageframe-dharma/sageframe.net`** — the deployed site. Receives static output via GitHub Action. Cloudflare Pages serves from this repo. The README of this repo just documents the deployment relationship.

### Build pipeline

Trigger: any push to `main` in `sageframe-no-kaji/shoshin-no-sono`.

Steps:
1. Validate `works.json` against `schema.json`. Fail the build on validation errors.
2. Bundle the prompt template into the Worker source (env variable injection).
3. Deploy the Worker to Cloudflare via wrangler (if Worker code or prompt changed).
4. Build the static site output (which may be minimal — vanilla HTML/JS — but includes any minification, asset processing, etc.).
5. Push the built static output to `sageframe-dharma/sageframe.net`.
6. Cloudflare Pages picks up the push and deploys.

Total typical deploy time: 30-90 seconds from commit to live.

### Authentication flow

A single GitHub OAuth app registered for `sageframe-no-kaji/shoshin-no-sono`. Both the Steward (Sveltia) and the Founder use this OAuth app. The redirect URLs are the admin routes (`/admin/` and `/admin/new/`).

The OAuth token grants commit access to the source repo. The token is held in the browser (Sveltia and Founder both store it via standard browser mechanisms — localStorage or similar, per Sveltia's defaults). Tokens are not transmitted to the Worker or any third party.

### Branch discipline

The original handoff specced a `labs` branch off `main`, with the current sageframe.net prototype preserved via tag `v0-legacy`. This holds.

During development: all work happens on `labs`. Cloudflare Pages can be configured to deploy `labs` to a preview URL (e.g., `labs.shoshin-no-sono.pages.dev`) without affecting the production sageframe.net. When ready to ship, `labs` merges to `main`; the build pipeline pushes to `sageframe-dharma`; the production site retires the prototype.

### Worker URL and DNS

The Worker lives at a Cloudflare Workers route. Likely `assist.shoshin.sageframe.net` or similar; specific subdomain choice deferred to Ho 11. The Founder knows the Worker's URL via a config constant (could be environment-specific: preview deployment uses preview Worker, production uses production Worker).

---

## 7. Scope Boundaries

### MVP Architectural Commitments

These are not aspirational omissions. The architecture *enforces* these constraints at v1.

- **No backend services beyond the Worker.** The site is a static frontend plus one serverless function (AI-assist). No persistent server. No database. No session state outside browser-side OAuth tokens.
- **Single-source data model.** `works.json` is the only place data lives. No sidecar files. No metadata caches. No second sources of truth. Data integrity is enforced by the schema; freshness is enforced by the always-regenerate visualization.
- **No per-work detail pages.** Each work's canonical home (its subdomain, its GitHub repo, its Substack URL) is the detail page. The catalog routes; it does not duplicate.
- **Always-link architecture.** The catalog never republishes content the canonical source already owns. No embedded essay text. No mirrored READMEs. The card shows enough to know whether to click through; the click sends the visitor away.
- **One visualization for the catalog.** The cartographic view is the visualization. The grid view is a fallback and a mobile experience. No competing visualizations.
- **No user-generated content.** Single-practitioner authoring. No visitor comments, no contributions, no public editing.
- **No analytics that track individuals.** Privacy-preserving aggregate analytics only, if any.
- **No newsletter signup, no marketing capture, no email collection.** The site is a communication tool, not a funnel.

### Architecturally Prepared For (Not Built)

The architecture leaves room for these without requiring redesign.

- **Visitor-as-Marco-Polo interactive layout.** The position computer supports interactive drag-to-rearrange — the physics is there in d3-force. Whether to expose the interaction in the UI is deferred. Cost to enable later: small.
- **Multi-language / i18n.** Sveltia has first-class i18n support. The schema fields could be made multi-locale without restructure. Not built; available.
- **Animation between filter changes.** Currently the filter change triggers a fresh render with no transition. A morphing transition between maps could be added without changing the data model or the render pipeline. Deferred as visualization polish.
- **A second visualization view (timeline, lineage tree, etc.).** The Indexer's query interface supports views the Cartographer doesn't yet render. New views can be added without changing data or auth.
- **Programmatic export of any filtered Venice as a static asset.** The render pipeline is pure; given inputs, it produces deterministic output. A build-time export of canonical Venices (PNG or SVG) for social cards or print is straightforward.
- **A "lineage" companion view.** Showing a single work's ancestry and descendants in a focused diagram. The data supports it; the render is just a different traversal of the same edge list.

---

## Identity Statement

### Hero paragraph

*The garden has gates on every side. Whichever gate you arrive at is the correct gate from which to enter.*

*Inside is one project — an epistemology of learning, creation, and craft, prosecuted across many years in many media. Software, methodology, writing, instruments. The work is networked, not linear. What looks like fifteen projects is one.*

*Shoshin no Sono — 初心の園, the garden of beginner's mind — is the cartography of that work. Peaks are the projects. Towns are the writing that traces how they relate. Each map renders fresh on each visit, because the work is alive and the territory updates.*

*Click through. The work lives elsewhere; this is the map.*

### Tagline

*An epistemology of learning, creation, and craft. The garden has gates on every side.*

### Identity block (site header)

```
初心の園
Shoshin no Sono
The Garden of Beginner's Mind

An epistemology of learning, creation, and craft.
The garden has gates on every side.
```

### The gates (secondary)

Named on the About page and surfaced as filter chips in the cartography UI:

- The methodology gate — Ho System, Dandori, Kinhin, *The Spec Is Not the Hard Part*
- The political gate — *The Same Lever*, *Judgment at Scale*, *Force Multiplier*
- The safety gate — Pink Teaming, Destructive Interference, Kiku
- The somatic gate — *The Fourth Boundary*, *Everybody is Making Out with AI in the Back of the Bus*
- The craft gate — m4Bookmaker, Hōzō, audiobook-qc, *Everything I Own*
- The family gate — Glassroom, Satori, *The Empty Container*, Edelmore
- The cosmological gate — the Eureka talk, the Thresholds work, the Fulbright essay, *Precedential Thinking*

(Gate vocabulary is editorial and may be refined as the body of work grows.)

---

## Provisional Ho Sequence

Sixteen hos across four phases. Three major milestones where the project crosses a threshold visible to others. Two significant design pull-offs for Claude Design sessions (Ho 4 is the big one; Ho 13 is the mobile aesthetic).

The sequence is directional. The Ho Overview (Kamae 4) will refine — splitting some, possibly combining others, possibly inserting research hos where the build hits unknowns.

### Phase 1 — Foundation (Shu)

| # | Title | Stage | What becomes visible |
|---|---|---|---|
| 0 | Scaffold and schema | Shu | Preview URL live (empty); schema validates a sample entry; hanko in `/assets/` |
| 1 | Hydrate `works.json` from inventory | Shu/Ha | 30-50 work entries committed; data exists |
| 2 | The Indexer | Shu | Browser console queries return correct data |
| 3 | Grid view + The Garden Gate | Shu | **MVP catalog live; filter URLs work end to end** |

**Milestone after Ho 3: MVP catalog is shareable.** Even without cartography, the site carries the body of work.

### Phase 2 — Visualization (Ha)

| # | Title | Stage | What becomes visible |
|---|---|---|---|
| 4 | **Visual register exploration** (entire ho is Claude Design pull-off) | Ha | A page collecting SVG snippets establishing the aesthetic register |
| 5 | Position computer + heightfield | Ha | Debug heat map showing the heightfield per filter |
| 6 | Contour extraction | Ha | First time the cartography looks like a map |
| 7 | Town placement and chronological populate | Ha | Towns visible at correct sizes and positions; populating animation works |
| 8 | Relationship features as terrain | Ha | The relationship grammar visible as cartographic features |
| 9 | Interaction layer | Ha/Ri | **Cartography fully interactive on desktop** |

**Milestone after Ho 9: The cartography works.** The public-facing demonstration is real and shareable.

### Phase 3 — Authoring (Shu/Ha)

| # | Title | Stage | What becomes visible |
|---|---|---|---|
| 10 | Sveltia CMS setup (The Steward) | Shu | Existing entries editable via `/admin/` |
| 11 | The Scribe (Cloudflare Worker) | Ha | Worker returns sensible AI-assist proposals to `curl` |
| 12 | The Founder (custom new-work tool) | Ha/Ri | **Adding a new work takes ~15 minutes; Dandori test passes** |

**Milestone after Ho 12: Authoring works.** Catalog can grow without falling behind.

### Phase 4 — Ship (Ri)

| # | Title | Stage | What becomes visible |
|---|---|---|---|
| 13 | Mobile decorative cartography + grid fallback (Claude Design pull-off) | Ri | Site works on phone — decorative map, grid navigation |
| 14 | Performance and accessibility | Ri | Lighthouse scores; keyboard nav; screen reader pass |
| 15 | Companion essay: "Planting the Garden" | Ri | Essay published; About page links to it; essay is itself a `works.json` entry |
| 16 | Merge to main, retire prototype | Ri | **Production at sageframe.net** |

**Milestone after Ho 16: Ship.**

Estimated total: ~32-48 hours of work, ~4-6 weeks at part-time pace.

---

## Deferred Decisions

Decisions explicitly assigned to specific hos, with criteria for resolution.

- **Position assignment algorithm details.** Deferred to Ho 5 (position computer + heightfield). Three candidate strategies named in conversation: pure procedural per render with random seed (chosen default), anchored procedural (available for free if needed), URL-seeded reproducible layout (nice-to-have for "share this view"). Ho 5 builds with pure procedural; anchored and seeded variants enable in later polish hos if needed.
- **Heightfield function family.** Deferred to Ho 5. Gaussian radial functions are the default; wave-interference variants (Resonance Field family) explored if Gaussian doesn't produce the right aesthetic. Decision criteria: which family produces terrain that reads as architectural rather than data-vizzy at the chosen visual register.
- **CMS choice in operation.** Sveltia decided. Fallback path to Decap documented (one URL change, config-compatible). Re-evaluation deferred to Ho 10 if Sveltia's beta-state limitations bite during setup.
- **Founder implementation language.** Vanilla JS or Svelte. Deferred to Ho 12. Decision criteria: which gives the simplest and most learnable implementation for the in-browser-to-Worker-to-API pattern the practitioner wants to learn.
- **Prompt template content.** Deferred to Ho 11. Iterated against the Dandori test case and other recent work additions until proposals are reliably good. Lives at `prompts/ai-assist.md`.
- **Specific subdomain for the Worker.** Deferred to Ho 11. Likely `assist.shoshin.sageframe.net` or similar.
- **Mobile aesthetic details.** Deferred to Ho 13. Design exploration in Claude Design will determine specific simplification rules.
- **Photography deployment.** Deferred from seed. `photography.sageframe.net` (subdomain) or `sageframe.net/photography` (path). Decision can wait until photography enters the catalog as a real work group; non-blocking.
- **Resonance Field crosslink.** Permanently parked. atmarcus.net keeps its hardcoded HERO_PROJECTS; Shoshin no Sono renders fresh from `works.json`. The two systems are aesthetic siblings, not data siblings.

---

## Hand-off to the README (Kamae 3)

The README (Kamae 3) commits to scope as concrete description. It can be written from this System Design without coming back. It will cover:

- What Shoshin no Sono is (in plain terms — the body of work catalog, the cartography, the gates principle)
- What it does (route visitors to canonical homes; demonstrate coherence; support filtered Venices via URL)
- What it does not do (out of scope explicitly named)
- How to use it as a visitor
- How to maintain it as the practitioner (the authoring workflow)
- Installation and setup for a future collaborator or future-self

The README also receives the hero paragraph and tagline as identity-setting content at the top.

---

## The Kamae chain

The System Design sits between the seed and the README:

- **Seed (Kamae 1).** Established the core idea — Shoshin no Sono as public-facing demonstration that the work is one project; interference cartography as visualization; the always-link click-through architecture; the brand architecture clarification.
- **System Design (Kamae 2 — this document).** Committed the architecture — six components by experience and purpose, the data model with typed edges and documents-strength weighting, the Sveltia + custom Founder pairing, the Worker for AI-assist, the deploy pipeline, the provisional ho sequence.
- **README (Kamae 3 — next).** Will commit to concrete scope.
- **Ho Overview (Kamae 4).** Will commit to build order with refined hos.

Each document increases commitment. The seed was exploratory. The System Design is structural. The README will be concrete. The Ho Overview will be operational.

When decisions in subsequent documents begin to drift, return to the seed and ask: *is the core idea still right?* The seed remains the parti — the evaluative reference against which all downstream choices are judged. This System Design is the structural realization of that parti.

The map is the argument. The argument is that the work is one project. The project is Shoshin. The garden is Shoshin no Sono.
