---
created: 2026-06-23
type: closeout-note
project: shoshin-no-sono
covers:
  - ho-process/hos/ho-A-hachure-6.0-renderer.md
  - ho-process/hos/ho-A-6.1-independent-layers.md
audience: the next session on the `labs` branch
---

# ho-A merge closeout — handoff to labs

This is a context-transfer note, not a ho document. Read it once when you pick up work on the `labs` branch after the hachure arc landed; then archive it.

## What landed on labs

The hachure arc — two hos — merged into `labs` at commit `c5a1e44` (a `--no-ff` merge commit). The full chain is now live on labs:

- **ho-A-6.0** (closed, status `complete`) — `ho-process/hos/ho-A-hachure-6.0-renderer.md`. Sidequest off ho-06. Built `src/hachure-map.js` as a pure renderer parallel to `src/contour-map.js`; added a `?render=` URL key (now superseded by ho-A-6.1's grammar but still parses for backward-compat); landed by-feel tuners against the real corpus; iterated on label glow approaches (stroke halo → background card → SVG filter with feMorphology + feDisplacementMap, which is what shipped); added importance dials for both beacons and hachures.
- **ho-A-6.1** (closed-pending-Reflect, status `open`) — `ho-process/hos/ho-A-6.1-independent-layers.md`. Architectural pivot: replaced the `?render=` XOR with two independent layer flags (`?iso=1&hachure=1`), composed renderer chain, comprehensive three-section tuner panel, dropped `isoOverlayWeight`. The merge to labs IS this ho's closing step; Phase 3 Reflect on it has not been written yet (one of the followups below).

## Branch state at hand-off

```
labs       c5a1e44  (merge commit; everything since ho-00 is here)
main       546d2e5  (ho-00 baseline; untouched)
huaraches  0cf6bbb  (pre-merge tip; merged into labs and now stale)
```

A note on the wrong-target merge: this work was initially merged into `main` by mistake (the planner missed the `labs` convention in CLAUDE.md), then reset and re-merged into `labs`. `main` is back exactly where it was. No remote pushes happened in either pass.

## Outstanding state to resolve on labs

1. **`package-lock.json` drift** lives on the `huaraches` worktree's working tree only (not committed to any branch). Real resolution drift from `npm install` during the spike — newer transitive minor/patch versions for the vitest install chain. Two paths:
   - Commit it on `huaraches`, fast-forward `labs`, then proceed.
   - Discard it (`git checkout -- package-lock.json` on huaraches) and let the next `npm install` on labs re-resolve. Either is defensible; committing is cleaner per the "dependencies are pinned" rule.
2. **The `huaraches` branch + worktree itself**. The branch is merged into labs and could be deleted (`git branch -d huaraches`) once the lockfile question is resolved. The worktree at `/Users/atmarcus/.supacode/repos/shoshin-no-sono/huaraches` is marked `locked` (Supacode flag); removal needs `git worktree unlock <path>` followed by `git worktree remove <path>`, run from the labs worktree.
3. **The Phase 3 Reflect on ho-A-6.1**. Decisions to capture:
   - The both-layers visual: do `weightRegular: 0.15` / `weightIndex: 0.4` (iso defaults) read clean *over* hachures, or does the iso layer want a thinning multiplier when hachures are also on? (ho-A-6.1 Decision 3 named this as the deferred tension.)
   - Anything that surfaced when the comprehensive panel was first used — slider density, section ordering, locked treatment legibility.
   - The neither-layers-on state — does the page degrade gracefully?
   - The `?render=` legacy fallback — did any old shared URLs surface?

## What ho-A-6.1's Think doc says wrong

The Think doc (`ho-process/hos/ho-A-6.1-independent-layers.md`) names "merge huaraches → main" in several places, including Decision 8 and the Execute sequence. The actual merge correctly targeted `labs`. The Think doc isn't being edited (forward-only); this is the canonical correction. Log it in ho-A-6.1's Phase 3 Reflect as a surfacing under "Authoring-time mistakes."

## 80 px thumbnail check — still owed

ho-A-6.0's third feedback bullet asked whether hachure streamlines collapse to fog at thumbnail scale where isos didn't. Not done. Not a blocker for landing the renderer, but it belongs to whoever ships the public site (the shoshin.sageframe.net surface). If the answer turns out "hachures collapse," the fix is probably a thumbnail-mode multiplier that reduces hachure density (raises `slopeFloor`, increases `sampleStep`), applied only when the rendered map is sized below some threshold. Not a code change yet — just a known followup.

## Defaults you'll see on labs

The full landed baseline of the sidequest, all locked-greyed in the tuner panel:

| Section   | Tuner                  | Value | Notes                                                      |
| ---       | ---                    | ---   | ---                                                        |
| Iso       | (ho-06.5 / ho-07.6 landings — unchanged)                |                                                            |
| Hachure   | sample stride          | 2     | Sub–field-cell stride; dense.                              |
| Hachure   | flat threshold         | 0.005 | Low — only the corpus floor sits below.                    |
| Hachure   | steep ceiling          | 0.05  | Low — slope saturates fast, length/weight spread.          |
| Hachure   | stroke length (min)    | 3.8   | Substantial minimum — strokes read as continuous flow.     |
| Hachure   | stroke length (slope)  | 5     | Steep faces get notably longer strokes.                    |
| Hachure   | stroke weight (min)    | 0.05  | Hair-thin.                                                 |
| Hachure   | stroke weight (slope)  | 0.4   | Steep faces hit ~0.45.                                     |
| Hachure   | position jitter (px)   | 1.05  | Substantial scatter — engraved feel.                       |
| Hachure   | angle jitter (rad)     | 0.15  | Modest — streamlines coherent.                             |
| Hachure   | density by importance  | 0.6   | Log-scaled local elevation as importance proxy.            |
| Universal | label red              | 0     | Muted dark — walked back from terracotta.                  |
| Universal | label glow             | 1.0   | Filter dilation + displacement baseline.                   |
| Universal | beacon weight          | 1.85  | Past the SVG opacity cap; radii grow via √(weight).        |
| Universal | beacon by importance   | 0.6   | Quadratic spread; readable peak hierarchy.                 |

## Verifying labs is healthy on first checkout

```
npm install                 # may reconcile the lockfile drift, depending on path 1 vs 2
npm run lint                # should be clean
npm run typecheck           # should be clean
npm test                    # 248 tests, all green; 100% lines / ~99.2% statements
npm run serve               # :8788 — visit cartography.html?hachure=1 to see the layer
```

---

_Authored 2026-06-23 on the `huaraches` worktree, intended for the next session that picks up `labs` after the merge at `c5a1e44`. After that session reads this and resolves the open items, the file can be removed — or kept as a historical handoff. Either is fine._
