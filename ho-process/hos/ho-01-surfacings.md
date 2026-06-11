---
created: 2026-06-11
type: surfacings-log
project: shoshin-no-sono
ho: "01"
---

# ho-01 — Surfacings

Observations from building the MVP sample of `works.json` against schema v4. Logged per the ho-01 Discoveries-deferred-to-execution list. Items marked **⚑ action** need a decision before (or during) the named downstream ho.

## Execution shape

- **Discipline waiver.** The one-entry-per-turn editorial loop specified in the ho document was waived by explicit practitioner instruction ("start, don't ask permission, stretch your legs"). Execution ran as a practitioner-directed autonomous batch session: 24 entries in four batches, validated per batch, committed per batch on `labs`. The waiver was the practitioner's call, not agent drift — logged here because the Reflect section asks whether the discipline held.
- Per-batch validation was run as ephemeral in-process checks (structure, vocabularies, strength rules, referential integrity), not committed tooling. No tooling drift: the only files written are `works.json` and this log.

## Inventory gaps — works named in the ho doc that don't exist in the inventory

- **⚑ action (ho-01 follow-up or ho-12.5):** The ho document's composition target names ***Everything I Own***, ***Precedential Thinking***, and the **Eureka 2010 talk**. None of the three appear in `sageframe_labs_work.md`. Possible that "Everything I Own" is a retitle of *I Just Want to Own My Audiobooks* (Medium) — verify. The talk's absence means **the `talk` media type is unexercised** and `embed_url` has never been populated; the schema's talk surface is untested until the practitioner supplies the inventory material.
- The `image` media type **was** exercised, contrary to the ho doc's expectation ("1 image work, if photography surfaces; otherwise skip") — Aspirational Intelligence is grounded in the inventory as an AI-generated-imagery body of work and carries `media: ["image"]`. Photography proper remains deferred.

## Schema and vocabulary

- **Websites-as-works tension.** atmarcus.net and sageframe.substack.com live in the top-level `web_properties` block. Making them `works` entries would double-represent them, and no `work_group` fits a bare website. The ho doc's "2-3 websites" target is instead satisfied by works that *carry* website media (Pink Teaming, SSH Actually, Resonance Field, Reading Instrument). **⚑ action (before ho-12.5):** decide whether the four web properties also become works, and if so which group holds them.
- **No Writing work group.** The committed `work_groups` vocabulary has no "Writing" group (the schema's candidate list included one). All eight writing entries were placed in `constructive-interference`, grounded in the inventory's framing of the essay practice as the program's public face. This stretches the group for Ho-System-side writing (*Three Hours*, *Falcon Cameras*). **⚑ action (replan checkpoint after ho-03):** confirm group-as-program is right, or add a Writing group.
- **Status vocabulary frictions.** Three mapping strains: (1) Destructive Interference is "taxonomy in daily use + white paper near publication" — one status field forced `near-publication`, losing the taxonomy-is-operational half; (2) Satori's inventory status "Built — demonstrating" has no vocabulary value — mapped to `in-development`; (3) `shipped` is defined as software-only, so SSH Actually (inventory: "Shipped") carries `live`. Vocabulary may want a `demonstrating` value, or these are acceptable editorial calls.
- **`tech_stack` rule extended.** Schema says populate when media includes `software`, null otherwise. Inventory carries stacks for website-media works too (SSH Actually: HTMX). Entries with `["website","software"]` carry stacks; SSH Actually (`["website","writing"]`) carries null and the stack is lost. Minor; note for schema v5.
- **`outlet` for self-published web writing** is awkward — SSH Actually got "Self-published static site", position papers got "atmarcus.net". The field assumes a venue; works whose venue is themselves strain it.

## Relationship grammar

- **`succeeded_by` grounds only one instance** (Aspirational Intelligence → Ho System) against the done-means target of two. Succession is rare in a young body of work — this reads as a finding about the corpus, not a failure of the grammar. The second instance will arrive naturally (e.g., a superseded tool).
- **`personalizes`, `integrates`, `responds_to`, `illustrates` unused** in the MVP. `integrates` and `personalizes` have obvious future edges (Sutra → Voice DNA) once those works hydrate in ho-12.5. Fine for now.
- **Lineage ambiguity resolved editorially.** Inventory: "Ho System produced Kanyō produced Hōzō produced Kinhin." Ho overview (ho-08 done-means): "Kinhin descends from Kanyō." Encoded: `hozo descends_from kanyo` and `kinhin descends_from kanyo` (the latter grounded directly in "the second major pilot (after Kanyō)"). Both works also carry edges to ho-system, so `getIncoming('ho-system')` returns Kinhin, Hōzō, Kanyō as ho-02's done-means requires.

## Data quality flags

- **⚑ action (before ho-07, chronological populate):** `created` dates for non-writing works are **estimates** — the inventory carries no first-shipped dates. Estimated: kanyo 2026-01-20, m4bookmaker 2026-02-05, destructive-interference 2026-02-17, hozo 2026-02-25, resonance-field 2026-03-01, ssh-actually 2026-03-10, star-actually 2026-03-15, kiku 2026-04-01, glassroom 2026-04-10, dandori 2026-04-20, pink-teaming 2026-04-25, satori 2026-04-28, reading-instrument 2026-05-01, forteller 2026-05-05, palana 2026-05-08, kinhin 2026-05-10, edelmore 2026-05-12, aspirational-intelligence 2021-01-01. Also estimated publication dates: the-empty-container and judgment-at-scale ("April 2026" → 2026-04-15). The populate animation renders these dates; verify before Phase 2 ho-07.
- **`[verify]` flags carried as nulls.** Licenses null for: kanyo, hozo, satori, glassroom, m4bookmaker, kiku, pink-teaming, destructive-interference, star-actually, resonance-field, reading-instrument, forteller, palana, edelmore, dandori (license "assumed CC BY-NC-ND" in inventory — not committed). Repos null where inventory said "[verify path]": dandori, kinhin, satori, resonance-field, reading-instrument. Deployment URLs missing: dandori's Claude Skill URL, m4Bookmaker's PyPI URL, SSH Actually's live URL (repo used as canonical CTA — weak), *, Actually's canonical home (points at SSH Actually's repo — weak). **⚑ action (ho-10/ho-12 era, or a Steward editing pass):** sweep the nulls.
- **Native scripts left null where the inventory doesn't state them:** Satori (likely 悟り) and Pālana (Sanskrit). Don't guess identity marks; practitioner supplies.
- **Word counts** null throughout — inventory doesn't carry them.

## Calibration notes

- **Importance histogram:** 2×1, 3×2, 4×2, 5×7, 6×6, 7×4, 8×2, 9×1. No compression into 7–9; the 5–6 band is where most of the body of work sits, with Kanyō/Glassroom at 8 and Ho System alone at 9 (10 reserved per schema). Distribution felt natural rather than forced.
- **Hero lines** were derived from each work's own inventory language where the inventory didn't supply one (only Resonance Field, Reading Instrument, and Edelmore had explicit heroes). Editorial; review welcome.
- **Description registers held.** The inventory's Short/Substantive registers mapped cleanly onto `short_description`/`substantive_description` — near-verbatim for shorts, lightly trimmed paragraph splits for substantives. The two-register design of the inventory document is what made this ho fast; the registers were the schema's registers all along.
- **Composition vs target:** 25 entries vs ~20. The overshoot bought required coverage: paired_with ×2 needed Forteller+Pālana; image media needed Aspirational Intelligence; adaptive-tools group needed Edelmore. Deferred to ho-12.5: Sutra, Shodō, Voice DNA, audiobook-qc, pptx-builder, adobe-peace, dns_switcher, audnexus-lite (+the inventory-gap works above). `personal-utilities` is the one group with zero MVP entries.

## Followups for ho-02 (Indexer)

- The ho-02 done-means smoke tests all hold against this data: `getIncoming('ho-system')` → kanyo, hozo, kinhin, dandori, m4bookmaker, aspirational-intelligence, three-hours, falcon-cameras; `settlementWeight('three-hours')` → log(3+2) over its documents edges.
- Settlement weights: only 6 of 8 writing works carry documents edges (the-same-lever carries only argues_for; pink-teaming's writing media has no documents edges since it's also the website). The Indexer must handle writing works with zero documents edges (settlement weight 0 / smallest hamlet) without breaking town placement.
- Multi-media works (pink-teaming, ssh-actually as website+writing; resonance-field, reading-instrument as website+software) mean "writing piece = town" is not media-exclusive. The Cartographer needs a rule: is pink-teaming a peak, a town, or both? **⚑ action (ho-05/ho-07 Think phase).**
