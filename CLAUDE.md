# Shoshin no Sono — Project Conventions

初心の園 — the Garden of Beginner's Mind. Public catalog of the Sageframe body of work at sageframe.net: a procedurally generated interference cartography over `works.json`, with always-link click-through to each work's canonical home. This file is the agent's operating context; the full intent lives in the Kamae chain (below).

## The one rule that shapes everything

**The served site is no-build vanilla ESM.** No bundler, no transpile, no framework. The `.js` files in `src/` are the source *and* the deployed artifact. Everything in `devDependencies` (Vitest, TypeScript, ESLint, Prettier) is verification tooling only and never touches what ships. If a change requires a build step to work in the browser, the change is wrong.

## Component boundaries (from the System Design — enforce these)

- **The Indexer (`src/indexer.js`) is the only component that knows the on-disk shape of `works.json`.** Everything downstream queries the Indexer; nothing else parses raw catalog JSON. Schema changes get absorbed inside the Indexer.
- **The Garden Gate is the only component that touches the URL.** No other module reads or writes `window.location`.
- **The Cartographer is a pure render component.** It queries the Indexer, reads state from the Gate, and renders SVG. It never fetches, never touches the URL, never writes data.
- The Indexer does **not** encode cartographic role (peaks vs towns) — that is a rendering convention owned by ho-05.

## Data

- `works.json` at repo root is the single source of truth; `schema.json` is its contract — descriptive (prose-annotated), not strict JSON Schema. The executable rules live in `scripts/validate-works.mjs`.
- Never hand-edit `works.json` without running `npm run validate` before committing (pre-commit enforces this).
- Work `id`s are stable forever once published. Relationships declare once: symmetric types (`paired_with`, `companion_to`) on either endpoint; succession as `succeeded_by` (canonical) or `succeeds`.

## Verification stack

```
npm run validate     # works.json against the schema contract
npm run lint         # eslint
npm run typecheck    # tsc --noEmit, strict, checkJs (types are JSDoc — no .ts files)
npm test             # vitest with coverage thresholds (90% floor)
npm run serve        # static server at :8788 — native ESM needs no more
```

All four run at every commit via `.pre-commit-config.yaml`. The rhythm: lint, tests, typecheck, then commit. Types are JSDoc annotations checked by `tsc` — annotate new code; a `@type {any}` cast gets a comment explaining why.

## Layout

```
index.html            the page (placeholder now; the catalog later)
src/                  ESM modules — indexer.js, later gate.js, cartographer.js
tests/                vitest specs
scripts/              repo tooling (validate-works.mjs) — not shipped
works.json            the catalog data
schema.json           the data contract (descriptive)
kamae/                the Kamae chain: seed → system design → README → ho overview
ho-process/hos/       per-ho documents — the bounded scope for each session
```

## Process

- Work happens on the `labs` branch. `main` ships at v1.0 (ho-16).
- Each session is bounded by a per-ho document in `ho-process/hos/` — read it first; it is the session's scope. The ho overview (`kamae/kamae-4-shoshin-no-sono-ho-overview.md`) is the map of the whole build.
- Closed hos are immutable (forward-only): respond to discoveries with new hos, not edits to closed ones. Surfacings worth keeping go in the ho's surfacings log.
- Commits are atomic with descriptive messages, prefixed by the ho: `ho-02: ...`.
- Cloudflare Pages / deploy pipeline: deferred until the ho-03 era. Local serving is the development surface.
