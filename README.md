<p align="center">
  <img src="shoshin-hanko.png" width="150" alt="Shoshin no Sono hanko">
</p>

# 初心の園 — Shoshin no Sono

*An epistemology of learning, creation, and craft. The garden has gates on every side.*

*The Garden of Beginner's Mind*

> *The garden has gates on every side. Whichever gate you arrive at is the correct gate from which to enter.*
>
> *Inside is one project — an epistemology of learning, creation, and craft, prosecuted across many years in many media. Software, methodology, writing, instruments. The work is networked, not linear. What looks like fifteen projects is one.*
>
> *Shoshin no Sono — 初心の園, the garden of beginner's mind — is the cartography of that work. Peaks are the projects. Towns are the writing that traces how they relate. Each map renders fresh on each visit, because the work is alive and the territory updates.*
>
> *Click through. The work lives elsewhere; this is the map.*

**Status.** In active build as of July 2026, on the `labs` branch (`main` holds the pre-build baseline). Shipped so far: the `works.json` data model and schema validator (29 works), the Indexer, the grid catalog with filter chips and shareable filter URLs, and the procedural cartography pipeline — seeded peak positions, heightfield, marching-squares contours, an independent hachure layer, town placement with grown settlement morphology, and the emergence load animation. Current work is relationship features as map marks (roads, trails, water), with the interaction layer next. The authoring subsystem, mobile, and deployment are not yet built; the site is not deployed, and local serving is the development surface. v1.0 ships at the end of the ho sequence — see the Current State table below for the arc, and `kamae/kamae-2-shoshin-no-sono-system-design.md` for the architectural extract.

---

## What's Broken

The work is interrelated in a way that is the brand and the identity. The relationships between the pieces are not decoration — they are the argument the body of work makes about itself. What looks like fifteen separate projects is one project, prosecuted across software, methodology, writing, and websites for many years.

Nobody can see that. To see it requires reading everything everywhere — the essays at sageframe.substack.com, the manifesto at pinkteaming.net, the research home at atmarcus.net, the repos at github.com/sageframe-no-kaji, the live demos at the subdomains — and nobody is going to do that.

The dispersal of the work across surfaces is correct. Each piece belongs at the surface that fits it. But dispersal makes the body of work illegible *as a body*. The illegibility is what Shoshin no Sono fixes.

## What Shoshin no Sono Does

Shoshin no Sono catalogs the body of work as a single navigable artifact at `sageframe.net`. The visualization is a procedurally generated topographic map — interference cartography — where each work is a peak and each piece of writing is a town placed near the works it documents. The relationships between works render as cartographic features: ridges for lineage, trails for validation, twin peaks for paired works, roads between towns for writing-to-writing reference.

The catalog has many gates. A URL like `sageframe.net/?theme=craft` lands a visitor on the *craft* Venice — a filtered map where the works most concerned with craft are the prominent peaks and the writing about craft sits in their valleys. A URL like `sageframe.net/?theme=relationship` produces a different Venice from the same body of work — same data, different cartography, both honest. The visitor follows the gate they were sent through; the map renders accordingly.

Each render is fresh. Same filter, different visit, different map — the constraints are stable but the realization is novel each time. Visitors don't memorize positions; they read the territory.

Click-through is the goal. The catalog routes; the work itself lives at its canonical home — the project's subdomain, its GitHub repo, the Substack essay that articulates the argument. The map shows you where to go. The work happens elsewhere.

## Your First Session

You receive a link from someone — a DM, a footnote in an essay, a line in a job application. The URL has a filter on it.

You click. The page loads. A topographic map in pen-and-ink contour lines on cream paper renders in front of you. Peaks emerge from the terrain at varying heights — the tallest in the center, smaller ranges to the sides. The labels are restrained: short names, native scripts where they exist, the occasional elevation figure.

You watch the writing arrive. Small terracotta settlements fade in one by one across the territory in the order they were written — the early essays settling in the western foothills, more recent pieces appearing near the higher peaks. You can follow the chronological motion if you want; it's slow enough to read but quick enough not to detain you.

You hover. A peak highlights, the others dim. A one-line description appears. You read it. You hover the next peak over.

You click. A small card opens in place — the work's name, its native script, a single line, a primary action: *Visit Kanyō*, *Read on Substack*, *Open Glassroom*. You take the action. You leave.

Or you stay. You click a ridge running between two peaks. The card that opens links to the essay that articulates the lineage — *Three Hours*, say, which traces how Hōzō descends from the Ho System. You click. You read.

You come back. You change the filter. The map rearranges into a different Venice. The works you were just reading about have changed position — same works, same relationships, different drawing of the same territory. You read the new shape. You leave through a different gate.

## What Shoshin no Sono Is Not

- **Not a destination.** The catalog routes; the visitor leaves.
- **Not a research blog.** *Constructive Interference* at `sageframe.substack.com` is the writing practice.
- **Not a product site.** Sutra and the product cluster get their own surfaces when they ship.
- **Not a brand front.** `atmarcus.net` is the professional landing site.
- **Not a thinking-aid for the maker.** It is a communication tool. A means, not an end.
- **Not a portfolio of pre-Sageframe work.** Architectural design, teaching, NuVu, ARCK, Citizen Schools — all live on `atmarcus.net` as Practice History. Shoshin no Sono carries the emerging work.

## How It Differs

A small number of personal-work sites occupy adjacent territory. Bret Victor's *worrydream.com* curates a body of work with philosophical through-line and hand-built lineage, made through prose rather than data. Andy Matuschak's *notes.andymatuschak.org* renders intellectual work as a navigable network of bidirectionally linked notes. Maggie Appleton's *digital garden* cross-links Notes, Essays, and Patterns through explicit relationships. Glenn McDonald's *Every Noise at Once* (now retired) rendered music genres as a typed-adjacency map with click-through to canonical sources.

Each of these does part of what Shoshin no Sono does. None does the combination: typed relationships *and* network-first navigation *and* always-link click-out architecture *and* procedurally generated visualization that responds to filter as a fresh survey of the same territory *and* a visible architectural argument about how the work coheres.

The honest claim is not that the combination is unprecedented in any single element. The claim is that this combination, for this body of work, makes the coherence legible in a way the dispersed sources can't.

## Naming

**初心 (shoshin)** is the Zen term for *beginner's mind* — the state of openness, humility, and receptive awareness that a student brings to learning, a mind unburdened by assumption. Shunryū Suzuki: *"In the beginner's mind there are many possibilities, in the expert's mind there are few."*

**の (no)** is the possessive and relational particle — "of."

**園 (sono)** is *garden* — a cultivated enclosure, not a wild place. Tended, but alive.

**初心の園 — Shoshin no Sono — the Garden of Beginner's Mind.** The site is the garden, the cultivated public surface, the place where the body of work shows itself as one body. The practice it surveys is Shoshin: an inquiry that returns to its territory fresh each time.

The name sits inside the convention the body of work already uses for its software: Kanyō 観鷹, Hōzō 宝蔵, Dandori 段取り, Shodō 書道, Kiku 聴く, Ho 歩, Kinhin 経行, Sutra 経. Each names a discipline of attention — contemplating, treasuring, ordering, brushing, listening, walking, beginning, threading. Shoshin no Sono is the one of these that demonstrates the others.

## Where It Sits

Shoshin no Sono is one of four properties in the broader work ecosystem, each doing a distinct job:

- **Sageframe** is the studio. The research-and-development practice under which the work gets made.
- **Shoshin** is what the studio makes — the body of work, the inquiry.
- **Blueprint for Creativity** is the consulting practice.
- **atmarcus.net** is the professional landing site and the home of the research arguments.

Shoshin no Sono is the public-facing surface of Shoshin. It does not host the work — each project, essay, and manifesto lives at its canonical home. It catalogs and routes.

Sibling surfaces in the ecosystem:

- **atmarcus.net** — professional identity, research home, methodology essays, the Resonance Field interactive hero
- **sageframe.substack.com** — *Constructive Interference*, the essay practice
- **pinkteaming.net** — the Pink Teaming manifesto, the cooperative-counterpart-to-red-teaming argument

## How It Works

The visualization is procedurally generated, not authored. Given the body of work and a filter state, the system computes peak positions via force simulation, generates a continuous heightfield by summing radial functions centered at each work (amplitude proportional to editorial importance and filter relevance), extracts contour lines from the heightfield via marching squares, places writing-piece settlements at barycentric positions weighted by their relationship strengths, and renders the result as SVG in a pen-and-ink topographic register.

Each render is fresh. The constraints are stable — same works, same relationships, same themes — but the spatial realization differs visit to visit. The system can be seeded via URL parameter to reproduce a specific layout; absent a seed, the map is novel each time.

Adding a new work updates the territory. The next visitor to any filtered view sees a map that includes the new peak in its proper context, with the relationships it has to existing works rendered as cartographic features. The body of work is alive in time; the map keeps up.

## Architecture

Six components. Three visitor-facing, two practitioner-facing, one shared substrate.

- **The Cartographer** renders the map. Computes positions, generates the heightfield, extracts contours, places towns, renders relationship features as terrain, composes the SVG.
- **The Garden Gate** handles URL state, deep linking, filter chips, and the "share this view" mechanic. Every URL is a door.
- **The Indexer** is the runtime view over the data. Builds the inverse edge index, settlement weights, theme membership, importance values. Exposes a query API.
- **The Steward** is the CMS for general editing — Sveltia, configured against the schema, authenticated via GitHub OAuth.
- **The Founder** is the custom new-work admin tool. Form for the partial entry, AI-assist diff review, single transactional commit.
- **The Scribe** is the Cloudflare Worker that powers AI-assist. Receives a partial entry plus the full catalog, returns proposed relationships, themes, tags, and reverse-direction edges.

The shared substrate is `works.json` — the single source of truth, version-controlled in the repo, edited only through the Steward, the Founder, or direct text editing. The visualization is regenerated from this file on every visit.

Full architectural detail is in [`kamae/kamae-2-shoshin-no-sono-system-design.md`](kamae/kamae-2-shoshin-no-sono-system-design.md).

## Tech Stack

| Layer | Choice |
|---|---|
| Static hosting | Cloudflare Pages |
| Frontend | Vanilla HTML/JS/CSS |
| Visualization library | Hand-rolled SVG cartography, no runtime dependencies |
| Data | Single `works.json` file in repo |
| Schema validation | Descriptive `schema.json` contract + `scripts/validate-works.mjs` |
| CMS (general editing) | Sveltia CMS |
| Custom admin (new-work) | Hand-rolled at `/admin/new/` |
| Auth | GitHub OAuth |
| AI-assist endpoint | Cloudflare Worker |
| LLM | Anthropic Claude API |
| Build pipeline | GitHub Action |

## Current State

| Now | Next | Later |
|---|---|---|
| Data model, schema validator, and hydrated `works.json` — 29 works (Hos 0-1) | Relationship features as map marks: roads, trails, water (Ho 8, in progress) | Authoring infrastructure: Steward, Scribe, Founder (Hos 10-12) |
| The Indexer (Ho 2) | Interaction layer (Ho 9) | Mobile, accessibility, polish (Hos 13-14) |
| Grid view and Garden Gate — filter chips, shareable filter URLs (Ho 3) | | Deployment — the site is not yet deployed; local serving is the dev surface |
| Cartography pipeline: seeded peaks, heightfield, contours, hachure layer, town placement, emergence animation (Hos 4-7) | | Companion essay and ship (Hos 15-16) |
| `labs` branch holds the build; `main` holds the ho-00 baseline; `v0-legacy` tag preserves the prior `sageframe.net` prototype | | |

## What's Ahead

The architecture is committed to leave room for these without redesign. None are built at v1.

**Visitor-as-Marco-Polo.** The position system supports interactive drag-to-rearrange — the underlying physics is there. Whether to expose the interaction in the UI is deferred. Cost to enable later is small.

**Animation between filter changes.** Filter changes currently swap maps cleanly. A morphing transition between Venices could be added without changing the data model or the render pipeline. Held back to keep the discipline of "each Venice is whole" visible.

**Multi-language internationalization.** Sveltia has first-class i18n support; the schema fields can be made multi-locale without restructure. Not built; the path is open.

**Additional view modes.** The Indexer's query interface supports views the Cartographer does not yet render — a lineage tree, a chronological timeline, a focused single-work neighborhood. New views can be added without changing data or auth.

**Programmatic export of a Venice as a static asset.** The render pipeline is pure; given inputs, it produces deterministic output. A build-time export of canonical Venices (PNG or SVG) for social cards, print, or archive is straightforward.

**The companion essay.** *"Planting the Garden,"* the writing that articulates Shoshin no Sono in the way *The Empty Container* articulates Glassroom and *Three Hours* articulates the Ho System. To be written and published alongside the v1 release.

## Installation

*Not yet. Installation instructions will appear here as the v1 components ship. Shoshin no Sono is a hosted site — for visitors there is no installation. For the practitioner maintaining the catalog, setup will involve cloning the repo, configuring environment variables for the Cloudflare Worker, registering the GitHub OAuth app, and deploying through Cloudflare Pages.*

## Usage

*Not yet. For visitors, usage will be: visit `sageframe.net`, navigate the cartography or grid view, follow gates via shared URLs, click through to the work itself. For the practitioner, usage will be: log in to `/admin/`, edit existing entries through the Steward or add new works through the Founder with AI-assist.*

## Development

```bash
git clone https://github.com/sageframe-no-kaji/shoshin-no-sono.git
cd shoshin-no-sono
```

There is no build step — the served site is no-build vanilla ESM, and the `.js` files in `src/` are both the source and the deployed artifact. `npm install` brings in verification tooling only: `npm run validate` (the `works.json` contract), `npm run lint`, `npm run typecheck` (strict `tsc` over JSDoc types), and `npm test` (vitest, 90% coverage floor) all run at every commit via pre-commit; `npm run serve` serves the site at `:8788`. Each ho in the build sequence is committed independently against its bounded scope document under `ho-process/hos/`. See `kamae/` for the project's framing documents — seed, system design, README, and ho overview.

## Requirements

For visitors: a modern browser. The cartography uses SVG and ES modules; supported in current versions of Safari, Chrome, Firefox, and Edge. Mobile devices drop to a simplified decorative cartography with grid navigation.

For the practitioner maintaining the catalog: a GitHub account with commit access to this repo, an Anthropic API key configured as a Cloudflare Worker environment variable, and a Cloudflare account for hosting.

## License

MIT. See [`LICENSE`](LICENSE) for terms.

The MIT license covers the code, schema, prompt template, and other project artifacts in this repository. The catalog *content* — the descriptions of works, the body of writing they describe, and the works themselves at their canonical homes — remains the author's, licensed separately at each canonical location.

---

*Andrew T. Marcus — Cambridge, MA*
*Last meaningful update: 2026-07-10*
