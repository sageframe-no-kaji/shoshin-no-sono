---
created: 2026-05-18
status: ready
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

The schema (v4) is the contract. This ho inhabits it — builds `works.json` entry by entry — until ~20 entries cover every media type and every major relationship pattern in the schema. The remaining works in the body of work hydrate later in ho-12.5 via the Founder, where bulk operation becomes the Founder's first real stress test.

**This ho is shaped unusually.** Standard ha hos either decompose into agent tasks or are a single bounded agent conversation. Ho-01 is neither. It runs as an interactive editorial loop in Claude Code — the practitioner drives turn by turn, the agent reads the schema and the inventory, proposes a schema entry, writes it to `works.json` after approval, and waits for the next instruction. `works.json` grows in real time on disk; the schema and inventory stay in context throughout. The Execute phase below specifies the recipe for that loop, not a spec for an agent to run autonomously. Naming this here so the shape isn't a surprise mid-session.

**Out of scope:** Anything that renders this data (ho-02, ho-03). Full hydration of the body of work (ho-12.5). Any script, agent task, or automation. Any tooling the agent might propose building to "speed up" the work.

---

## Phase 1 — Think

### Decision 1 — Environment: Claude Code, running in the repo root.

Claude Code reads files from disk directly, which is the leverage that justifies it over a claude.ai chat. The agent reads `schema.json`, reads the inventory, reads and *writes* `works.json`. No copy-paste between chat and editor between turns. Schema validation runs in-process after each write, surfacing errors before commit. Git commits happen in the same session.

### Decision 2 — MVP scope: ~20 entries that exercise every media type and every major relationship pattern.

The point is to stress-test the data model, not populate the production catalog. Full hydration of the remaining works happens in ho-12.5 via the Founder.

Composition target (selection happens during execution against the inventory):

- 3-4 methodologies — Ho System, Dandori, Destructive Interference, Pink Teaming taxonomy
- 5-6 software works — Kanyō, Hōzō, m4Bookmaker, Glassroom, Medical Mystery Simulator, plus one more
- 6-7 writing pieces — *Three Hours*, *The Same Lever*, *The Empty Container*, *Everything I Own*, *Precedential Thinking*, plus a couple of recent Constructive Interference essays
- 2-3 websites — atmarcus.net, sageframe.substack.com, pinkteaming.net
- 1 talk — Eureka 2010
- 1 image work, if photography surfaces; otherwise skip

### Decision 3 — Commit cadence: per-entry write to `works.json`, git commits every 5-7 entries, run in-session by the agent.

The agent writes each entry to `works.json` immediately after the practitioner approves the proposal. Schema validation runs after write. Every 5-7 entries, the agent runs `git add works.json && git commit -m "ho-01: add <names> (N of MVP)"` — practitioner reviews the diff before each commit.

### Discoveries deferred to execution

Things that resolve during the work, not before. Logged so observations get captured rather than lost:

- **Schema gaps.** Fields a particular work doesn't fit. Apply revisions mid-stream if blocking; batch otherwise.
- **Theme vocabulary stress.** Themes that don't apply cleanly. Missing themes.
- **Relationship grammar coverage.** Relationships that exist intuitively but no type fits.
- **Description register calibration.** Whether `short_description` and `substantive_description` carry distinct voices.
- **Work group vocabulary.** Whether the candidate groups hold up.
- **Importance distribution.** Where values cluster; whether the 1-10 scale is being used or collapsing.
- **`articulated_in` usage.** Obvious cases (*Three Hours* articulating Hōzō ← Ho System; *Empty Container* articulating Glassroom's pedagogy). Captured? Over-applied?

---

## Phase 2 — Execute

No agent task in the surgical-spec sense. The work is the interactive Claude Code session itself; this section is the recipe the agent reads and the practitioner runs against.

### Required files (in the repo)

- **`schema.json`** (v4) — the contract being inhabited
- **`works.json`** — initially the one-entry skeleton from ho-00; grows during the session
- **`sageframe_labs_work.md`** — the inventory; source material for each work's proposed entry
- **This document** (`ho-process/hos/ho-01-build-from-schema.md`) — the recipe; the agent reads it as its operating instructions

### Setup (one time)

1. Open Claude Code in the repo root.
2. Have it read this document first, then `schema.json`, then `sageframe_labs_work.md`, then the current `works.json`. Smoke test: ask it to briefly summarize what it sees in each.
3. State the goal and the discipline (see Discipline section below). Confirm the agent will work one entry per turn, propose-then-write-after-approval.

### Per entry (loop ~20 times)

1. Pick the next work from the inventory. First three: **Ho System**, **Dandori**, **Destructive Interference** — they anchor most other entries' relationships.
2. Tell the agent: `next: <work name>`. The agent reads the relevant section of the inventory, proposes a complete schema entry, shows the JSON before writing.
3. Read the proposal. Push back, request refinements, until the entry reads right.
4. Approve. The agent writes the entry to `works.json` and runs schema validation against the single-work definition.
5. If validation errors: agent reports, you iterate. If clean: log any surfacings to `ho-process/hos/ho-01-surfacings.md` (the agent can append on your direction) and continue.
6. Next work.

### Discipline

The interactive editorial loop is what this ho protects. The risks are familiar — they're how agents drift when given bulk work:

- **One entry per turn.** The agent proposes, writes (after approval), and waits. It does not batch five entries before reporting back. If it starts wanting to batch, stop it. That's the chat-or-script divergence trying to reassert from inside the agent.
- **The practitioner drives selection.** "Next: Hōzō." Not "do the next five in order." Selection is editorial — which works anchor which relationships, which to enter before which — and belongs to you.
- **Read each proposal before write, or at least before commit.** Default: read-then-approve-then-write. Faster pattern (write-then-edit-in-file) is also fine once the agent is producing reliable entries. Don't let it become write-and-forget.
- **No tooling drift.** The agent does not need to build a script, a parser, a CLI, a helper module, or any other code to "speed up" the work. The only file it writes is `works.json` (plus appends to the surfacings log when directed). If the agent proposes building tooling, decline.

### Pause triggers

- The same schema gap surfaces three times → stop. Apply a schema revision before continuing.
- The agent proposes the same wrong relationship pattern three times → tighten the prompt convention you've been using.
- Importance distribution compresses (every entry landing 7-9) → recalibrate explicitly.
- The agent proposes building tooling → decline, redirect to the next entry.

### Commit cadence

Every 5-7 entries, the agent runs `git add works.json && git commit` with a message naming what was added. Practitioner reviews the diff before approving the commit. No push to remote until end of session (or you have a reason).

### Done means

- ~20 entries in `works.json`, each validating against `schema.json`
- Every media type represented (software, writing, website, talk, methodology; image if photography surfaces)
- At least two instances each of: `descends_from`, `paired_with`, `companion_to`, `operationalizes`, `documents` (with strengths 1, 2, AND 3 represented across the corpus), `succeeded_by`, `validates`
- 3-4 entries carry `articulated_in` on at least one relationship
- `ho-process/hos/ho-01-surfacings.md` exists with the run's observations
- Commits on `main` show the build-up in identifiable batches

---

## Phase 3 — Reflect

*To be filled in after execution. Prompts:*

- Schema gaps that surfaced; which need revision before ho-02
- Theme vocabulary: missing themes, unused themes
- Relationship grammar: types that ended up unused, relationships missing a type
- Description registers: did short and substantive carry distinct voices?
- Work group vocabulary: held up under real entries?
- Importance distribution: shape of the actual histogram
- `articulated_in`: obvious cases captured, false positives proposed
- Discipline drift: did the one-entry-per-turn rule hold, or did the agent try to batch?
- Tooling-drift moments: did the agent propose helpers? What did declining cost or save?
- Prompt convention: what worked; what's promotable to the Scribe's future `prompts/ai-assist.md` in ho-11
- Followups for ho-02: anything that changes the Indexer's design?

---

_Authored: 2026-05-18 (Think phase decisions, Execute recipe for Claude Code)._
_Execution and Reflect: pending._
