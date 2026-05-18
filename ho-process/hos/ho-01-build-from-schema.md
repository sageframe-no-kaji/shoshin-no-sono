---
created: 2026-05-18
status: draft
type: ho-document
project: shoshin-no-sono
ho: "01"
kamae: 5
shape: ha
builds-on:
  - schema.json
  - kamae/shoshin-no-sono-kamae-2-system-design.md
  - kamae/shoshin-no-sono-kamae-4-ho-overview.md
  - ho-process/hos/ho-00-scaffold-and-schema.md
---

# ho-01 — Build the catalog from the schema (MVP sample)

The schema (v4, with the four queued revisions applied) is the contract. This ho inhabits that contract — builds works.json entry by entry against it — until enough of the body of work is represented to exercise every media type and every major relationship pattern. The goal is not a complete catalog. The goal is a data model that has been stress-tested by real entries, with whatever doesn't fit logged for follow-up.

The MVP sample target is around twenty entries. Enough to: cover every media type in the schema (software, writing, website, image, talk, methodology); carry at least two of each major relationship type; populate enough of the work_groups vocabulary that the groups read as real; provide the density that Phase 2's cartography needs to look like a real map rather than a few scattered peaks. The remaining works in the body of work get hydrated later, in ho-12.5, using the Founder — which makes the Founder's first real test bulk-work, not a single new entry.

**Out of scope:** Anything that renders this data. No Indexer (ho-02). No views (ho-03). Full hydration of the entire body of work (deferred to ho-12.5). The Worker (ho-11) does not exist yet — no API key handling needed; the work happens in this Project's chat space, calling no external services.

**Resolves deferred decisions** (from the ho-overview):

- Approach to hydration
- MVP scope and threshold
- Per-entry review and commit cadence

---

## Phase 1 — Think

### Decision 1 — Approach: conversational in the Project chat space

Three patterns considered.

**Pattern A — Python script.** Hand-built one-time-use script that calls the Anthropic API in batch, writes works.json, the practitioner reviews afterward in VSCode. Throwaway code. Real engineering effort (parse inventory, build manifest, schema validation, resumability, prompt template).

**Pattern B — Chat-based, conversational.** Open this Project's chat space. The schema is already in project knowledge. The inventory document is available. The practitioner pastes one work's inventory chunk per turn; the model proposes a schema entry; practitioner reviews, edits, commits to works.json before the next turn. Continuous editorial presence; no script build.

**Pattern C — Hybrid.** Build a thin Python harness that the practitioner runs interactively. Skip — adds ceremony without removing the script-build cost.

Pattern B. The bottleneck on this work is the practitioner's editorial judgment, not throughput. A script that runs in two minutes still requires an hour of review afterward — and that review happens detached from the moment of generation, with no opportunity to iterate the prompt against a specific proposal. The chat keeps the editorial loop continuous: see proposal, react, refine prompt or refine entry, move on. The "script" is the conversation; the file write is manual; works.json grows entry by entry in the same git workflow as everything else.

Token budget across a long chat: schema (~5K tokens) + inventory manifest (~2K) + accumulated conversation (~20-25 turns × ~1K = ~25K). Total ~35K tokens. Comfortable inside Claude's 200K context window. If a single chat becomes unwieldy, split into multiple project chats; each new chat starts with the schema and manifest plus the existing works.json as context.

### Decision 2 — MVP scope: ~20 entries exercising every media type and relationship pattern

Two patterns considered.

**Pattern A — Full hydration.** All 40-50 works in the body of work, hydrated in ho-01. Maximum data for downstream hos to work against; one big editorial session.

**Pattern B — MVP sample.** ~20 entries selected to exercise every media type and every major relationship pattern. Smaller editorial session; full hydration deferred to ho-12.5 where it becomes the Founder's first real test.

Pattern B. The point of ho-01 is to stress-test the data model with real entries, not to populate the production catalog. Twenty entries is enough to exercise every dimension of the schema. Doing the remaining works through the Founder later validates the Founder against bulk operation, which is a much stronger test than adding a single hypothetical new work to a populated catalog.

**MVP composition target (~20 entries):**

The practitioner picks the specific works during execution. The composition target is the shape, not the list:

- **At least 3-4 methodologies** (Ho System, Dandori, Destructive Interference, Pink Teaming taxonomy or similar) — to exercise the methodology media type, the descends_from / companion_to / operationalizes relationships, and theme="craft"
- **At least 5-6 software works** (Kanyō, Hōzō, m4Bookmaker, Glassroom, Medical Mystery Simulator, one or two more) — to exercise software media, tech_stack and license fields, the operationalizes relationship from methodology, and a range of statuses (shipped, in-development)
- **At least 6-7 writing pieces** (Three Hours, The Same Lever, The Empty Container, Everything I Own, Precedential Thinking, and a couple from the recent essays) — to exercise writing media, publication_date and outlet fields, the documents relationship with strength variation (1/2/3), and the responds_to / argues_for relationships
- **At least 2-3 websites** (atmarcus.net, sageframe.substack.com, pinkteaming.net) — to exercise website media and multi-media works (Pink Teaming is website + writing)
- **At least 1 talk** (Eureka 2010 talk) — to exercise talk media and embed_url
- **Possibly 1 image work** if photography is ready to surface; otherwise skip until photography subsystem activates

Total: ~20-22 entries. Selection happens during execution against the inventory document — the practitioner picks works that exercise the schema rather than works that are most important.

### Decision 3 — Review and commit cadence: per-entry, in chat, with works.json updated immediately

Two patterns considered.

**Pattern A — Batch review.** Generate multiple entries in chat without committing. Review at the end. Commit to works.json in one pass.

**Pattern B — Per-entry commit.** After each entry, the practitioner edits as needed in chat, then writes that single entry into works.json. Subsequent entries see the growing works.json as context (their relationships can reference real existing IDs).

Pattern B. Per-entry commit makes each entry's relationship targets concrete — the model proposing a relationship can see what's actually in works.json, not just what's in the inventory manifest. Edit-and-commit also keeps the conversation focused on the entry currently in front of the practitioner; no batch backlog to track.

The works.json file is edited directly in VSCode between turns. Schema validation runs as VSCode flags violations against the bound schema. The file is committed to git in batches at natural pauses (every 5-7 entries, or at end of session) with messages like `ho-01: add Ho System, Dandori, Hōzō (3 of MVP)`.

### Attention items (not decisions; things to watch for as execution surfaces them)

These are not deferred decisions — they're places the work is likely to discover something. Logged here so observations get captured during execution rather than lost.

**Schema gaps.** Fields that don't fit a particular work cleanly. Examples likely to surface: a methodology that has no `deployment` (it's documentation-only, no canonical URL); a website that is itself the deployment; a talk that has no `tech_stack` but is software-adjacent. If a work needs a field the schema doesn't have, log it.

**Theme vocabulary stress.** The current eight themes are candidates. Some works will probably want a theme not in the vocabulary (e.g., something specifically about *humor*, or *play*, or *embodiment*). Log the gap; decide later whether to add a theme or whether tag-level vocabulary covers it.

**Relationship grammar coverage.** Some relationship types may turn out unused or rare in the MVP sample. That's fine — they're available for later works. More concerning: relationships between works that exist intuitively but no relationship type fits. If a real relationship has no type, log it; the relationship grammar may need a new type.

**Description register.** The schema has `short_description` (README-voice, one paragraph) and `substantive_description` (Substack-voice, paragraphs). The inventory document has its own two registers that may not map cleanly. If the model produces short descriptions that read as too long, or substantive ones that read as the wrong voice, the prompt convention needs sharpening — or the schema's register definitions need clarification.

**Work group vocabulary.** The schema lists candidate work_groups ("Methodology", "Production Systems", "Constructive Interference Tools", etc.) but flags them as "review during seed conversation." This MVP is that review. If a work doesn't fit any group cleanly, or two groups seem to fight over the same works, log the gap.

**Importance distribution.** If every work ends up rated 7-9, the scale is collapsing. If too many are rated 10, the "permanent" reservation isn't holding. Watch the distribution as it builds. Recalibrate during the run if needed.

**Articulated_in usage.** This new field is optional and probably mostly null in v1, but some relationships have obvious articulating essays (Three Hours articulates Hōzō's descent from Ho System; The Empty Container articulates Glassroom's pedagogy). If the model under-proposes articulated_in, prompt for it. If it over-proposes (every edge gets one), tighten.

---

## Phase 2 — Execute

No agent task. The work is the practitioner-plus-Claude conversation.

**Setup (one-time, at session start):**

1. Open a new chat in this Project. The schema (`schema.json` v4) and the inventory document (`sageframe_labs_work.md`) are in project knowledge.
2. Confirm that the model has access to the schema and inventory by asking it to briefly summarize them. (Smoke test for project knowledge availability.)
3. Articulate the MVP composition target to the model — the shape, not the list — so the model can help with selection decisions if asked.

**Per-entry loop (~20-22 iterations):**

1. **Select the next work.** Practitioner picks from the inventory document. Initial picks: the foundational methodologies first (Ho System, Dandori), since they're the relationship anchors for almost everything else.
2. **Paste the work's inventory chunk** into chat. Ask for a schema entry.
3. **Model proposes** a complete schema entry: id, name, native_script if applicable, media, group, themes, status, tags, importance, descriptions, relationships pointing to other works in the manifest or already in works.json, and any other applicable fields.
4. **Review in chat.** Practitioner reads, reacts, asks for changes, refines. Iteration happens in chat; no need to leave to fix issues.
5. **Commit to works.json.** Once the entry is right, paste it into the works.json file in VSCode. VSCode's schema binding validates as you save.
6. **Log any surfacings** to a running notes file (`ho-process/hos/ho-01-surfacings.md` or inline in this document's Reflect section as you go). Schema gaps, theme gaps, relationship grammar gaps, prompt issues.
7. **Move to the next work.** The previous entry is now in works.json and visible to the next prompt's context (paste it back into chat as part of the running manifest if needed, or rely on the model to pick up from the conversation).

**Commit cadence:** Every 5-7 entries, commit works.json to the `labs` branch with a message naming what was added (e.g., `ho-01: add Ho System, Dandori, DI, Hōzō, Kanyō (5 of MVP)`).

**Pause and rethink triggers:**

- If three consecutive entries reveal the same schema gap, stop. Apply the schema revision (or log it for batch revision at end of ho) before continuing.
- If the model starts proposing the same wrong relationship pattern repeatedly, tighten the prompt convention before the next entry.
- If the importance distribution is collapsing (everything 7-9), recalibrate explicitly: rank the works on the scale aloud and check that the high values are reserved.

**Done means:**

- `works.json` contains ~20-22 entries covering every media type in the schema
- Every entry validates against `schema.json`
- At least two instances of each major relationship type (descends_from, paired_with, companion_to, operationalizes, documents at strength 1/2/3, succeeded_by, validates) appear in the data
- At least 3-4 entries use the `articulated_in` field on at least one relationship
- A surfacings log exists (in the Reflect section of this document or as a separate file) capturing schema gaps, vocabulary gaps, and other observations from execution
- The commit history on `labs` shows the build-up of entries in identifiable batches

---

## Phase 3 — Reflect

*To be filled in after execution. Prompts:*

- **Did the schema hold?** What schema gaps surfaced? Which gaps need schema revision before ho-02 begins, and which can wait?
- **Theme vocabulary.** Did the current eight themes cover the MVP sample? Any themes missing? Any candidate themes that turned out unused?
- **Relationship grammar.** Were all relationship types used? Any relationships that existed intuitively but no type fit? Should the grammar grow?
- **Description registers.** Did `short_description` and `substantive_description` get distinguishable voice? If not, what needs sharpening?
- **Work group vocabulary.** Did the candidate work_groups hold up under real entries? Any groups that turned out unused, redundant, or splitting awkwardly?
- **Importance distribution.** What does the actual distribution look like? Reserved appropriately for 10? Range used across 1-10 or compressed?
- **Articulated_in usage.** Were the obvious cases captured? Were any false positives proposed?
- **Token budget.** Did the chat stay manageable across ~20 entries? If split into multiple chats, what was the handoff like?
- **Prompt convention.** What worked in the prompt convention that emerged during execution? What didn't? Could the convention be promoted into the future `prompts/ai-assist.md` for the Scribe in ho-11?
- **Followups for ho-02.** Did anything surface that changes the Indexer's design? Any derived computations (settlement weights, importance distributions) that the real data makes obvious tuning targets?

---

_Authored: 2026-05-18 (Think phase)._
_Execution and Reflect: pending._
