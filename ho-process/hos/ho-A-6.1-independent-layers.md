---
created: 2026-06-23
status: complete
type: ho-document
project: shoshin-no-sono
ho: "A-6.1"
parent: "A-6.0"
kind: sidequest
kamae: 5
shape: ha
builds-on:
  - kamae/kamae-2-shoshin-no-sono-system-design.md
  - kamae/kamae-4-shoshin-no-sono-ho-overview.md
  - ho-process/hos/ho-A-hachure-6.0-renderer.md
  - src/gate.js
  - src/contour-map.js
  - src/hachure-map.js
  - src/cartography-page.js
---

# ho-A-6.1 — Independent terrain layers; merge to main

ho-A-6.0 proved the hachure renderer and landed it as a sidequest behind `?render=hachure`. The XOR was the right shape for a spike — one renderer or the other, A/B against the iso plate — but it isn't the right shape for the practitioner's actual visual model, which is *iso layer on/off, hachure layer on/off, possibly both at once*. ho-A-6.1 takes that finding (recorded as surfacing 5 in ho-A-6.0's Reflect) and makes it the architecture: two independent boolean layer flags in the Gate, the renderer chain composes whichever layers are on, a comprehensive tuner panel always shows every dial. The `huaraches` branch then merges into `main`.

This is the architectural commitment that closes the hachure arc: the iso register from ho-06.5 stays the committed baseline, the hachure register joins it as a first-class layer, and both can be active simultaneously without the special-case overlay plumbing.

**Out of scope.** Any change to `field.js`, `indexer.js`, the emergence player, settlements, the per-peak label collision logic, or the place-name layer. Performance optimization of the hachure renderer (still SVG; canvas backend stays the named contingency). The 80 px thumbnail check (still owed; sits with the public-site work). Any change to the iso renderer's committed register (ho-06.5 weights stay where they landed). The merge to `main` is *part* of this ho — that's the closure; pushing to remote is not (the user pushes themselves when ready).

---

## Phase 1 — Think

### Decision 1 — Gate grammar: `?iso=1&hachure=1`, backward-compat for `?render=`.

The Gate gets two new boolean URL keys: `iso` and `hachure`. Each parses presence-truthy (`1`, `true`, present-with-empty-value) → `true`; absent or any other value → `false`. Defaults when neither is present: `iso=true, hachure=false` — preserves main's existing visitor experience (the iso plate at v1.0 is what the public sees).

`?render=` from ho-A-6.0 is honored as backward-compat so any URLs already shared keep working:

- `?render=hachure` → `{iso: false, hachure: true}`
- `?render=contour` → `{iso: true, hachure: false}`
- `?render=` overrides `?iso=` and `?hachure=` if both present in the same URL (last-writer wins on grammar generations: practitioner shares may carry the older key, the new keys take over silently for new shares).

Wait — that's wrong. The backward-compat should *defer* to the new keys when both are present, not override them. Restated: if `?iso=` or `?hachure=` is present anywhere in the URL, the new grammar takes over and `?render=` is ignored. Only when *neither* new key is present does `?render=` get parsed. This is the cleanest forward path — old URLs work, new URLs are authoritative.

`setRender(mode)` from ho-A-6.0 disappears. The new mutator is `setLayers({iso?, hachure?})` — partial-merge semantics like `setState`. Existing emitted URLs serialize to `?iso=1` / `?hachure=1` / `?iso=1&hachure=1`; default (`iso=true, hachure=false`) emits nothing for layer keys, keeping shareable URLs clean.

### Decision 2 — The renderer chain composes both layers, hachures under isos.

`terrainSvg()` in `cartography-page.js` becomes:

```
let svg = '';
if (layers.hachure) svg += hachureMapSvg(...);
if (layers.iso)     svg += contourMapSvg(...);
return svg;
```

Hachures *first* (under), isos *on top*. Reasoning: ho-A-6.0's iso overlay pattern already put isos on top of hachures; the practitioner read that as "iso scaffold over hachure ground" and it works. Reversing the order (isos under) would obscure them. When both layers are off, the function returns `''` — the cream paper rect emitted by the iso renderer disappears too, so the page falls back to the `corpusFloorSvg()` ground plus place names plus beacons over a blank field. That's a legitimate "annotated empty paper" view; not the common case, but allowed.

The iso renderer's paper rect is *only* emitted when the iso layer runs. When only hachures run, the hachure renderer emits its own paper rect (current behavior). When both run, hachures paint paper + strokes first, isos paint paper + lines over them — the iso paper rect is redundant but harmless (same color, same dimensions, idempotent).

### Decision 3 — `isoOverlayWeight` dies; isos use their committed register weights.

The `isoOverlayWeight` tuner from ho-A-6.0 was a multiplier on hard-coded overlay weights (0.18 regular, 0.35 index) — a hack for the specific "isos drawn on top of hachures" case in hachure mode. With independent layers, the iso renderer is *the iso renderer* — it uses `weightRegular` / `weightIndex` from the tuners, the same values the iso-alone plate uses. One iso renderer, one set of weights.

**Known tension** (logged for follow-on, not blocking): the iso weights from ho-07.6 (`weightRegular: 0.15`, `weightIndex: 0.4`) were dialed for the iso-alone plate. When hachures are also on, the iso layer may want to be visibly lighter so the hachures carry the visual weight. Two paths if it bites in practice:

- (a) Practitioner dials iso weights down when working with both layers (single set of weights, accepted compromise).
- (b) A follow-on ho introduces an auto-thinning multiplier active only when `layers.hachure` is true.

ho-A-6.1 takes path (a) — accept the compromise, see if it bites. The hachure iso overlay in ho-A-6.0 worked at 0.18/0.35; the iso tuner default at 0.15/0.4 is close enough that the both-layers visual should be acceptable. If it isn't, (b) is a small follow-on.

### Decision 4 — Iso elevation labels track the iso layer flag.

The USGS elevation labels (1000, 2000, … ft) are placed on round iso lines — they're meaningful only when iso lines are visible. The rule generalizes the ho-A-6.0 rule cleanly:

- iso layer on → elevation labels visible (regardless of hachure layer).
- iso layer off → elevation labels hidden (regardless of hachure layer).

This is the same line of code that existed in ho-A-6.0 (`if (gate.currentRender() === 'contour') svg += elevationLabelsSvg(...)`); the rewrite is mechanical (`if (layers.iso) svg += elevationLabelsSvg(...)`).

### Decision 5 — Comprehensive tuner panel: three sections, always visible.

The mode-conditional panel selection (`HACHURE_TUNER_SPECS` vs `TUNER_SPECS`) disappears. The panel always renders three sections, in order:

1. **Iso** — the existing `TUNER_SPECS` minus what moved to universal (beacon weight, beacon importance — already universal as of ho-A-6.0).
2. **Hachure** — the existing `HACHURE_TUNER_SPECS` minus `isoOverlayWeight` (deleted; see Decision 3).
3. **Universal** — `UNIVERSAL_TUNER_SPECS`: label red, label glow, beacon weight, beacon by importance.

Each section gets a light header row (small caps, terra-pinned subdued tone) so the panel reads as grouped not flat. The locked treatment is unchanged — landed values still grey, dial-able with intent.

Layout: the existing two-column flow continues to work; sections flow within the columns. No need for a structural CSS change.

### Decision 6 — Page chrome: two checkboxes replace the render-mode radio.

The `<span class="rendertoggle">…</span>` from ho-A-6.0 (two radios for `render=contour|hachure`) is replaced by two checkboxes:

- `iso layer` — checked when `layers.iso === true`.
- `hachure layer` — checked when `layers.hachure === true`.

Both flow into the same controls row alongside `peak ids`. The "iso overlay" checkbox from ho-A-6.0 (the `showIsos` boolean for the hachure-mode iso scaffold) is **removed**: in the new model, iso-on-hachure is just `iso layer on + hachure layer on`. The `showIsos` boolean disappears from `cartography-page.js`.

### Decision 7 — Tests updated for the new grammar; existing tests preserved where possible.

Gate tests:
- `parseRender` tests **stay** — backward-compat is a contract. New tests verify that the new grammar (`?iso=1`, `?hachure=1`) round-trips, and that when both grammars are present in a URL, the new keys win and the legacy `?render=` is ignored.
- New `parseLayers` tests cover the truthy/falsy parsing, defaults, and the `?render=` legacy fallback when no new keys are present.
- `setLayers` round-trip tests follow the existing `setRender` shape — partial merge, preserve other state, notify listeners.

`hachure-map.test.js` is untouched — the renderer doesn't change. `contour-map.test.js` is untouched. The page itself (`cartography-page.js`) stays coverage-excluded.

### Decision 8 — Merge `huaraches → main` as part of this ho.

ho-A-6.0 + ho-A-6.1 together represent the hachure arc landing. The merge is the closure. Mechanics:

- All ho-A-6.0 / ho-A-6.1 commits live on `huaraches`.
- `main` is the project's release branch (the project ships at v1.0 = ho-16; we're well within build).
- Standard merge: `git checkout main`, `git merge huaraches`, expect fast-forward or clean three-way merge (no conflicts expected; `main` has no work since `huaraches` branched, per the practitioner's local state).
- No remote push as part of this ho. The user pushes when ready.

If a conflict materializes (it shouldn't, but: the practitioner may have done something on `main` I'm not tracking), the merge stops, conflict is surfaced, and we resolve before continuing. The merge does *not* get forced through.

### Discovery (deferred to execution)

- **The both-layers visual** — does the iso-on-hachure read clean at the iso renderer's default weights (`weightRegular: 0.15, weightIndex: 0.4`), or does the iso layer want a thinning multiplier? Settled by eyeball on `:8788` during the implementation pass.
- **The neither-layer state** — does the page handle `layers.iso=false, layers.hachure=false` gracefully (place names, beacons, towns over blank cream)? Should — no code path requires terrain — but worth checking.
- **The legacy URL handoff** — does `?render=hachure` (a URL shared from the sidequest) still work after the merge? Verified by the round-trip tests.
- **Conflict during the merge** — none expected, but if one shows up the merge stops and we resolve in-place.

All eyeball checks on `:8788`. Tuner landings (if any further dialing happens) recorded in Phase 3 Reflect.

---

## Phase 2 — Execute

One bounded session — this one. The pivot is mechanical (Gate grammar swap, page wiring swap, panel render swap, merge); the renderers themselves don't change.

**Sequence:**

1. `src/gate.js` — add `parseLayers(search)` + `currentLayers()` + `setLayers(partial)`. Keep `parseRender` exported for backward-compat parsing only (still used by `parseLayers` as the legacy fallback). Update `serializeURL` to emit the new keys; preserve them in `setState`. Remove `setRender` and `currentRender` from the public API (the legacy URL handoff happens at parse time, not in the live API).
2. `tests/gate.test.js` — add `parseLayers` + `setLayers` tests; verify `?render=` legacy fallback; verify new grammar wins when both are present.
3. `src/cartography-page.js` — swap `terrainSvg` to compose layers; swap `gate.currentRender()` reads to `gate.currentLayers()`; remove `isoOverlayWeight` from `tuners` and from `HACHURE_TUNER_SPECS`; remove the `if (showIsos)` overlay block from `terrainSvg`; remove the `showIsos` state and the `#toggleIsos` handler; remove the "iso overlay" `<label>` from `cartography.html`; replace the `wireRenderToggle` function and the `<span class="rendertoggle">` with `wireLayerToggles` and two `<input type="checkbox">` controls; rewrite `renderTuners` to render all three sections always, with section headers.
4. `cartography.html` — remove the iso-overlay checkbox and the `<span class="rendertoggle">` radio block; add the two layer checkboxes; add a minimal CSS rule for the section header (`.tunersection`).
5. Verification rhythm: lint, typecheck, test, then commit on `huaraches`.
6. `git checkout main && git merge huaraches` — local only. No push. If conflict, stop and resolve.

### Done means

- `?iso=1&hachure=1` renders both layers; either flag off skips that renderer; both off shows cream paper + place names + beacons + towns (no terrain).
- `?render=hachure` and `?render=contour` from old URLs still work (backward-compat verified by tests).
- Two checkboxes in the page chrome — `iso layer`, `hachure layer` — drive the Gate. No more render-mode radio. No more iso-overlay checkbox.
- Tuner panel always shows three sections (Iso, Hachure, Universal) with light headers.
- All locked landings from ho-A-6.0 + ho-06.5 + ho-07.5 + ho-07.6 still present and greyed.
- Iso elevation labels visible whenever `layers.iso === true`, regardless of `layers.hachure`.
- `npm run lint`, `npm run typecheck`, `npm test` all green; coverage at or above the 90% floor.
- `huaraches` merged into `main` locally. No push.

---

## Phase 3 — Reflect

No major closeout warranted — saw the opportunity in ho-A-6.0's surfacing-5, researched the architectural shape (independent layers, not XOR mode), and the implementation landed the richness the hachure register had been pointing at. The map can now carry both registers at once or either alone; the practitioner's actual visual model is what the Gate now speaks.

One authoring-time correction worth logging here per the merge-closeout note: the Think phase above names the merge target as `main` in several places (Decision 8, Execute sequence's "Step 8 — Merge"). The actual merge correctly targeted `labs`, per the project's `labs`-is-the-working-branch convention in `CLAUDE.md`. Forward-only: the Think text stays as written; this Reflect is the canonical correction. (The wrong-target attempt was caught and reset before any remote push, so no damage propagated.)

The both-layers iso/hachure interaction question raised in Decision 3 — whether iso weights want a thinning multiplier when hachures are also on — sat well enough in practice that no immediate tuning was needed. The locked ho-06.5 weights (0.15 regular / 0.4 index) read cleanly over the hachure ground. Left as a future tuner if a future ho surfaces the need.

The 80 px thumbnail check named in the merge-closeout is still owed — it belongs to whoever ships the public site surface, not to this ho.

---

_Authored: 2026-06-23 (Think phase, sidequest off ho-A-6.0 closing the hachure arc)._
_Closed: 2026-06-23 — the hachure arc lands as two co-equal first-class layers; the iso register from ho-06.5 remains the public default, hachure is opt-in until promoted._
