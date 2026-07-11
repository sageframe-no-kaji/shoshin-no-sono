# Visual design process note

A record of how the visual register for Shoshin no Sono was developed, written
as a transferable pattern. The specific decisions are this project's; the method
is general.

---

## The core problem

Procedurally generated visuals present a specific design challenge: you can't
just choose a look and implement it, because the look will be produced by an
algorithm across thousands of configurations you haven't seen yet. Every visual
decision has to be *implementable*, and the implementation has to hold across
the full data range, not just the example you designed against.

This means the usual design flow — mock it up, get approval, build it — breaks
down. A mockup lies. The algorithm will do something the mockup didn't.

The process described here replaces the mockup phase with a sequence of steps
that keep design and implementation in tighter contact throughout.

---

## The pattern

### 1. Isolate the questions

Before any visual exploration, list every visual decision the system will need to
make: what a peak looks like, what a settlement looks like, what the typography
looks like, what a relationship feature looks like, and so on. These become
discrete questions, worked in a deliberate order.

The order matters. Earlier questions constrain later ones. Typography is designed
after the things it will label are frozen. Relationship features are designed
after the base elements they connect are frozen. Later sessions name the earlier
winners by reference — they do not restyle them.

This project's questions: peak form → settlement sizes → typography →
relationship features (ridge, road) → cartouche. Roughly: alphabet first
(terrain, settlement, type), then grammar (relationships), then signature.

### 2. One question per session, in isolation

Each question gets its own design conversation — no code context, no data
schema, no architecture. The session prompt is written in advance and given
exactly as written: one question, hard constraints (palette, reproducibility
requirement, what is out of scope), and an explicit set of axes to vary.

The return format is always: labeled variants (A–D) on one page, with one-line
captions naming the choice each makes, followed by a recommendation and
reasoning. Anything the session surfaces that belongs to a later question goes
in one line under "parked" — not a follow-up in the same conversation.

What isolation buys: the session can't scope-creep into adjacent questions.
What the pre-written prompt buys: the practitioner has thought through the
constraints before the session starts, so the session is judging answers rather
than defining questions.

In this project, the sessions were run in Claude Design, returning inline SVG
pages. A different visual medium would work the same way; what matters is that
the output is renderable and judgeable, not a written description of an
appearance.

### 3. Freeze each decision before moving to the next

After a session, the winning variant is extracted into a living register file
(`design/visual-register.html` in this project) and given explicit frozen
parameters — numbers, not just a description. The frozen parameters are the
spec for implementation.

A frozen decision can be *propagated* (updated when a later coherence check
reveals a problem) but only with a commit that names the reason. In this
project: the solo-peak contour weights (0.85/1.7) that looked right in
isolation read too heavy in a multi-peak field; they were lightened to 0.5/0.95
at the coherence check. The freeze itself wasn't wrong — it was the right call
with the information available. The update was made explicitly, not silently.

### 4. Coherence check before moving to code

Once the core alphabet is frozen (terrain form, settlement form, typography —
the three sessions that define the visual language), assemble all three in a
single scene before writing any production code. This is the moment where the
alphabet becomes a system, and systems have interactions that individual
elements don't.

In this project, `design/claude-design/coherence-check.html` was a hand-built
HTML file rendering frozen sessions 1–3 together. It found the contour-weight
problem. It also confirmed that the register cohered — peak, settlement, and
type read as one hand, not three separate choices. That confirmation was what
cleared the path to implementation.

### 5. Design spike in the actual technical environment

After the coherence check, build one spike that validates the frozen register
against the real algorithmic constraints — not against hand-authored stand-ins.
This is where "it's procedurally reproducible" meets the actual procedure.

In this project, `design/claude-design/territory-spike.html` was a real
continuous heightfield (sum of elliptical radial peak functions, contours by
marching squares) with stand-in data. Its purpose was to answer: does the
register hold on terrain that fills a whole field, not just isolated peaks?
Answer: yes, but contour weights needed another drop (0.5/0.95 → 0.25/0.70 at
map scale). The spike was also the first validation that the core algorithm
worked at all, before any of it was in `src/`.

The spike is the reference artifact — "the target is what the spike produced."
Implementation ports the spike; it doesn't copy it. The spike can hand-author
things the implementation will derive from data. That difference is the
implementation's job to close.

### 6. Implement with all visual parameters exposed as tuners

When the design moves into production code, every parameter that drives
appearance becomes a live slider control, not a constant. The discipline:
*never hard-code a visual value before you've seen it move.*

This serves two purposes. The obvious one: it makes the by-feel pass possible.
The less obvious one: it forces the algorithm's parameters to be named and
isolated in the code, rather than scattered as magic numbers. A named tuner is
a named design decision.

In this project, the cartography page has a tuner panel covering every
significant visual parameter: contour weights, stroke lengths, settlement block
size, label sizes, emergence timing, hachure density and jitter, etc.

### 7. By-feel landing pass against real data

With the algorithm running on real data and all parameters exposed, the
practitioner opens the live page and moves sliders until the result reads right.
This is judgment work, not specification work — it's what numerical parameters
can't tell you in advance.

The pass is done against the actual corpus at the actual scale, not a synthetic
test case. What reads right in a 5-peak test case may not read right in a
19-peak full render. The full render is the test.

When values are landed, they are logged in the ho document and committed as
defaults. The commit message records the landing: `lock dialed values`,
`tuner landing — lock the practitioner's by-feel pass as the field defaults`.
This makes the landed values traceable in the history.

In this project: ho-06.5 (contour tuner landing), ho-07.5 (town tuner
landing), ho-07.6 (emergence animation landing), ho-A-6.0 (hachure landing).

### 8. New visual modes are A/B spikes, not replacements

When a second visual register is explored (e.g., adding hachure rendering to an
existing contour register), it ships as a toggleable alternative, not a
replacement. The existing register is not under revision; the spike asks whether
the alternative earns its place.

In this project, the hachure renderer shipped as `?render=hachure` — then
promoted to an independent layer that could run simultaneously with the iso
contours. The insight from the historical record (Churchill's survey of hachure
cartography): "hachures capture relief, contours capture height." Two
renderers, two different questions about the same field, both valid. The A/B
spike revealed that they were complementary, not competing.

---

## The governing principle

Every visual decision in this project traces back to one principle that
emerged in session 1 and recurred throughout:

**Character comes from process, not decoration.**

Not stroke effects but field math. Not decoration applied to settlements but a
growth rule that generates medieval morphology as a consequence. Not fake-contour
overlay marks but actual level sets of a real field function.

This principle has architectural teeth: it rules out visual effects that can't
be generated algorithmically, and it rules in effects that are natural byproducts
of the underlying data and algorithm. The question "does this look good?" becomes
"does this look like what the algorithm is actually doing?"

In a procedurally generated system, that's the right question.

---

## References used in this project

- US Exploring Expedition, Samoan survey plate (1839) — hachure register target;
  `design/Upolu_map_US_Ex._Ex._1839_cropped.jpg`
- Murakami, *Hard-Boiled Wonderland and the End of the World* — settlement
  morphology reference (negative-space streets, solid blocks, landmark towers)
- Churchill, "Variety in Hachure" — cartographic hachure survey; led to
  Imhof and Bradford Washburn's Everest map (1988) as canonical iso+hachure
  composite
- Andy Woodruff, sketchy-relief work — hachure algorithm reference
