---
created: 2026-05-18
status: superseded
type: ho-document
project: shoshin-no-sono
ho: "00"
kamae: 5
shape: orientation
builds-on:
  - kamae/shoshin-no-sono-kamae-1-seed.md
  - kamae/shoshin-no-sono-kamae-2-system-design.md
  - README.md
  - docs/architecture.md
  - kamae/shoshin-no-sono-kamae-4-ho-overview.md
---

# ho-00 — Scaffold and schema

This ho is orientation. It is also the moment the project becomes real on disk. The Kamae chain is complete; the documents exist; the hanko, the LICENSE, and the revised schema (v4) are ready to commit. What's still missing is the repo, the working preview deploy, and the practical scaffold work. Ho-00 closes the gap between "the project is planned" and "the project is buildable." It does not write code. It does not render anything. It creates the conditions under which subsequent hos run.

Three things land here. First, the conceptual ground for tech the practitioner has named as new territory — Cloudflare Workers, d3-force, marching squares, Sveltia CMS, GitHub OAuth for headless CMS, cross-repo GitHub Action deploy. Each gets a paragraph-level primer with resources, not so the practitioner walks into ho-04 having mastered marching squares from a paragraph but so the new terms have an anchor. Second, the project-level conventions for how subsequent hos work — file paths, document shapes, commit message conventions, agent task placement. Third, the practical action list for what happens between the end of this orientation and the start of ho-01: the actual scaffold work.

---

## 1. Pre-conditions

The state of the world at session start:

- **Kamae chain committed.** Seed, System Design, README, paired `docs/architecture.md`, and Ho Overview exist as files. They live in `kamae/` once the repo is created.
- **Hanko mark exists.** `shoshin-hanko.png` is ready to commit at the repo root. The README references it at the top, 150px centered.
- **LICENSE exists.** MIT, copyright 2026 Andrew T. Marcus. Ready to commit at root.
- **Schema is revised and ready.** `schema.json` (v4) carries the four revisions queued from the System Design: `weight` renamed to `importance`; `articulated_in` added as a per-edge optional field; the composite-importance calculation removed from the rendering block (importance is now a direct manual integer driving peak height); the `strength` field redefined as integer 1/2/3 for documents-class edges per the editorial specificity convention. The file is ready to commit at repo root as `schema.json` (renamed from `sageframe_labs_schema.json`).
- **No code yet.** No repo, no `works.json`, no build pipeline, no JavaScript, no Worker source. The first commit to the new repo is what this ho creates.
- **The prototype is preserved.** The current `sageframe-dharma/sageframe.net` still serves the 80s-MIT page. It does not change during ho-00 except for receiving a `v0-legacy` tag on its current HEAD before any rebuild begins.

---

## 2. New concepts

Primers for tech that is new territory or partially-explored territory. Skip-or-deepen at the practitioner's call. Tech already in active use (Cloudflare Pages, vanilla HTML/JS/CSS, Python, Anthropic API, Git, basic GitHub Actions, JSON Schema basics) is not primed here.

### Cloudflare Workers

Cloudflare's serverless function platform. A Worker is a JavaScript (or WASM-compiled) function that runs on Cloudflare's edge network — same network that serves Pages. The function has a public URL; you POST or GET to it from anywhere; it returns a response. The Worker is stateless — no filesystem, no database, no persistent memory beyond what's bundled into the deployment. Secrets (like the Anthropic API key) get stored as Cloudflare environment variables, accessible inside the function but not visible to anyone calling it.

Workers are deployed via `wrangler`, Cloudflare's CLI tool. Project layout: a `wrangler.toml` config, an `src/index.js` (or `worker.js`) entry point, optional bundled assets. Local development uses `wrangler dev` which spins up the function on localhost; deploy uses `wrangler deploy`. The free tier covers 100K requests per day, which is orders of magnitude over what Shoshin no Sono's Scribe will see in a year of operation.

Workers can call external APIs (like Anthropic's), which is exactly the Scribe's job — receive a partial-entry payload from the Founder, call Claude with a prompt that includes the current works.json, return structured JSON. The Worker is the place secrets live; the practitioner's GitHub repo does not need to hold the Anthropic API key.

Resources: <https://developers.cloudflare.com/workers/>, <https://developers.cloudflare.com/workers/get-started/guide/>, `wrangler` CLI docs at <https://developers.cloudflare.com/workers/wrangler/>.

### d3-force

The force-simulation module of D3 — used independently of the full D3 library. Composable force-directed graph simulation in JavaScript. The simulation has a set of forces (charge, link, center, collide, custom), a set of nodes, and a tick function that updates positions iteratively until the simulation converges (or the practitioner stops it). Forces can be added, removed, or reweighted at runtime; forces are not predefined relationships but pluggable behaviors.

For Shoshin no Sono, d3-force is used for position computation only, not rendering. The Cartographer feeds d3-force with the works and their relationships (each typed edge contributes link forces, optionally weighted), runs the simulation, extracts the final positions, then passes them to the heightfield generator. d3-force is essentially a black box: positions in, positions out. Tuning happens by adjusting force weights until layouts read well.

The library is small (~30KB), framework-agnostic, has good ergonomics for ES modules. Most documentation lives in the d3-force GitHub README plus the Observable notebook ecosystem (Mike Bostock's notebooks at <https://observablehq.com/@d3/force-directed-graph>).

Resources: <https://github.com/d3/d3-force>, <https://observablehq.com/@d3/force-directed-graph>, the official D3 book chapters on force layouts (free online).

### Marching squares

An algorithm for extracting contour lines from a 2D scalar field (heightfield). It examines each grid cell of the field, looks at the four corner values relative to a threshold, and emits line segments per a sixteen-case lookup table. Repeat across all cells at multiple thresholds and you get a contour map — the topographic line drawing.

The algorithm is well-documented, computationally trivial, and has multiple implementations. `d3-contour` is the most production-ready library; it uses marching squares internally and gives you contour paths as GeoJSON or SVG-ready data. A hand-rolled implementation is also tractable — the algorithm fits in fifty lines of JavaScript if you don't need sophisticated smoothing.

For Shoshin no Sono, the decision between `d3-contour` and a hand-roll happens in ho-06. The exploration in ho-04 (visual register) may produce reference contours that influence the choice.

Resources: <https://en.wikipedia.org/wiki/Marching_squares> (the algorithm), <https://github.com/d3/d3-contour> (the library), <https://observablehq.com/@d3/contours> (Bostock's notebook).

### Sveltia CMS

A modern git-based headless CMS, built in Svelte. It is the active successor to Netlify CMS / Decap CMS — same git-backed architecture, same configuration format (config-compatible fallback path to Decap if needed), but actively maintained, modern frontend, and better OAuth handling. The CMS renders form-based editors against a YAML schema file, validates user edits, and commits changes to GitHub on the user's behalf via OAuth.

Setup is light: drop a single HTML file (`admin/index.html`) into the site, write a config file (`admin/config.yml`) describing the schema and OAuth setup, register a GitHub OAuth app. On login, the user authorizes the CMS via GitHub's OAuth flow; the CMS gets a token; commits go directly to the repo. The CMS sees no server beyond GitHub's.

Sveltia is in active development with a real community. Beta-state limitations exist but are rare in basic content-editing workflows. The fallback to Decap (config-compatible) is a one-URL change if Sveltia turns out to bite hard during ho-10.

Resources: <https://github.com/sveltia/sveltia-cms>, <https://sveltiacms.app/en/docs>.

### GitHub OAuth for headless CMS

The authentication pattern Sveltia and Decap use. Register an OAuth app on GitHub: gets a client ID and a client secret. Configure the CMS with the client ID and the OAuth redirect URL. The user clicks login in the CMS → redirects to GitHub → user authorizes the app → GitHub redirects back to the CMS with an auth token → CMS uses the token to make commits as the user.

Two implementation paths exist. The "vanilla" path uses a tiny OAuth proxy service (like Netlify's free identity service or a self-hosted alternative) to handle the client-secret-bearing redirect step, because client secrets cannot live in browser JavaScript. The "GitHub OAuth Device Flow" path skips the proxy by using GitHub's device-code flow, but UX is rougher (the user copies a code into GitHub manually).

For Shoshin no Sono, the OAuth proxy approach is standard and well-trodden. Multiple free options exist; Sveltia's docs name the recommended one. This is the auth flow both the Steward (ho-10) and the Founder (ho-12) share.

Resources: <https://docs.github.com/en/apps/oauth-apps/building-oauth-apps>, Sveltia's auth docs (linked above), <https://decapcms.org/docs/external-oauth-clients/> (the OAuth proxy options).

### Cross-repo GitHub Action deploy

The pattern where a push to repo A triggers a GitHub Action that builds output and pushes that output to repo B. Used here for: `sageframe-no-kaji/shoshin-no-sono` (source) → `sageframe-dharma/sageframe.net` (deploy target served by Cloudflare Pages).

Mechanism: the Action runs in repo A on push to `main`. It checks out A, runs the build, then uses git operations or a deploy action (`JamesIves/github-pages-deploy-action` is widely used) to push the build output to a branch in repo B. Authentication to repo B uses a Personal Access Token (PAT) stored as a secret in repo A's Action settings; the PAT has push access to repo B specifically.

For Shoshin no Sono, the pipeline is straightforward: validate `works.json` against the schema, run the (eventual) build step, push static output to `sageframe-dharma/sageframe.net`. Cloudflare Pages on `sageframe-dharma` is configured to deploy from the appropriate branch. The Action runs in CI; the practitioner does not see it run during normal authoring; failure visibility happens via the Action's status badge or email notifications.

Resources: <https://github.com/JamesIves/github-pages-deploy-action> (the deploy action's README has examples for cross-repo push), <https://docs.github.com/en/actions/security-guides/encrypted-secrets> (PAT storage).

---

## 3. Project ho shape

Conventions for how subsequent hos operate. Committed here so the per-ho documents stay consistent.

**Default shape: ha.** Most building hos for this project produce architectural decisions plus execution. The Think → Execute → Reflect structure carries that. Exceptions: ho-04 (visual register exploration via Claude Design — orientation-adjacent), ho-15 (companion essay — likely ri-shaped), this ho (orientation).

**File paths.**

- Kamae documents — `kamae/`
  - `kamae/shoshin-no-sono-kamae-1-seed.md`
  - `kamae/shoshin-no-sono-kamae-2-system-design.md`
  - `kamae/shoshin-no-sono-kamae-4-ho-overview.md`
  - The README and `docs/architecture.md` are the Kamae 3 documents but they live at root and `docs/` respectively, because they are also public-facing project artifacts.
- Per-ho documents — `ho-process/hos/ho-NN-<slug>.md`
- Agent tasks — `ho-process/agent-tasks/Ho-NN-AT-MM.md`
- Devlogs (optional, per-ho execution notes) — `dandori/ho-NN-<slug>-devlog.md`

**Commit messages reference the ho number.** Format: `ho-NN: <short description>`. Examples: `ho-00: scaffold repo and commit framing documents`, `ho-01: hydrate works.json from inventory`, `ho-05.2: heightfield generation`. Splits and insertions inherit the parent's prefix.

**Native script in titles where relevant.** Per-ho documents and devlogs may use English-only titles for searchability, but headings within can use 初心の園 / Shoshin no Sono / English freely. The README and atomic public-facing surfaces lead with the native script.

**Em-dashes Chicago style.** Closed em-dashes (no surrounding spaces) in all project documents. This applies to the per-ho documents, devlogs, the README, and commit message bodies.

**Decisions render inline with their resolving ho.** Per the Ho Overview's discipline. No master decision tables; the practitioner reading or executing a ho sees the decisions it resolves in the ho document itself.

**Sample data lives in the repo, not in `.gitignore`.** The skeleton `works.json` committed in this ho contains one sample entry — enough for schema validation to exercise the file. Ho-01 builds the MVP sample of ~20 entries on top of this skeleton, in this Project's chat space.

---

## 4. Handoff

The practical action list for between this orientation and the start of ho-01. The practitioner runs these. Each is small.

1. **Create the source repo.** `sageframe-no-kaji/shoshin-no-sono` on GitHub. Private at this stage; flip to public at v1.0 or earlier as the practitioner prefers.
2. **Tag the prototype.** In `sageframe-dharma/sageframe.net`, tag the current HEAD as `v0-legacy`. `git tag v0-legacy && git push origin v0-legacy`. This preserves the prototype's state before any deploy-target restructuring touches it.
3. **Create the `labs` branch.** In `sageframe-no-kaji/shoshin-no-sono`, after the initial commit, create the `labs` branch from `main`. Work happens on `labs` through phase 3; phase 4's ho-16 merges to `main` and triggers the deploy that retires the prototype.
4. **Configure Cloudflare Pages preview deploy.** Connect Cloudflare Pages to the `labs` branch of `sageframe-no-kaji/shoshin-no-sono`. Preview URL gets a stable subdomain (Cloudflare assigns one; the practitioner can choose a custom subdomain like `labs.sageframe.net` if preferred). Verify the preview URL returns the README's rendered HTML or a placeholder index page after the first commit.
5. **Commit the framing bundle.** First commits to `labs`:
   - `README.md` (root, with hanko reference at top)
   - `LICENSE` (root, MIT)
   - `shoshin-hanko.png` (root)
   - `schema.json` (root, v4 with the four revisions already applied)
   - `docs/architecture.md`
   - `kamae/shoshin-no-sono-kamae-1-seed.md`
   - `kamae/shoshin-no-sono-kamae-2-system-design.md`
   - `kamae/shoshin-no-sono-kamae-4-ho-overview.md`
   - `ho-process/hos/ho-00-scaffold-and-schema.md` (this document)
   - `ho-process/hos/ho-01-build-from-schema.md` (the next ho's framing)
6. **Skeleton `works.json`.** One sample entry — pick anything that exercises the schema. The Ho System itself as one entry works fine. Validate the skeleton against the schema using whatever validator the practitioner prefers (ajv-cli is one option). Ho-01 builds the MVP sample on top of this skeleton entry.
7. **Verify the preview URL.** Push to `labs`; wait 30-90 seconds for Cloudflare Pages to build; confirm the URL serves something. A placeholder `index.html` at root saying "Shoshin no Sono — under construction" is acceptable; it gets replaced in ho-03.
8. **Confirm the hanko renders.** Visit the README on GitHub. The hanko should appear at the top, 150px, centered. If it doesn't, check the path (relative to the README, no leading slash).

Once these actions complete, ho-00 is done. Ho-01 starts with: the repo exists, the framing documents are committed, the schema (v4) is in place at root, the skeleton `works.json` validates, the preview URL is live. From there, ho-01 builds the MVP sample of the catalog by inhabiting the schema in this Project's chat space — no Python script, no automation, just continuous editorial work against the schema until ~20 entries cover every media type and relationship pattern.

---

_Authored: 2026-05-18._
_Execution: orientation; the action list in section 4 is the practitioner's work between sessions._
