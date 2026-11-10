---
name: uxd-experience-narrative-create
version: 0.1.0
description: >-
  Turn a problem brief and paired vision journey map into an editable Miro
  storyboard, then finalize it as an experience narrative and prototype-ready
  screen breakdown. Use for storyboard drafting or narrative finalization.
audience: "UX designers"
inputs: "A problem brief, a completed as-is/to-be journey map, an optional edited Miro storyboard, and optional target codebase"
outputs: "A Miro-editable To-Be storyboard, final experience narrative, and structured prototype handoff"
---

# Experience Narrative

Use this skill in two passes. First, turn the agreed paired journey map into an editable To-Be storyboard on the same Miro board. After the designer and partners edit that storyboard, use the skill again to read those edits and write the final narrative and prototype handoff. Preserve the paired journey map as the source; add a storyboard frame without rewriting either map.

## Inputs

| Input | Required | Source |
|-------|----------|--------|
| Problem brief | **Yes** | `.artifacts/problem-brief.md`, `.artifacts/{ID}/problem-brief.md`, or user-provided text |
| Paired vision journey map | **Yes for vision work** | Miro board URL or local JSON Canvas with matching As-Is and To-Be frames |
| Persona reference | No | Persona cards in the target project or an installed plugin, when they match the brief |
| Target codebase | No | Only to learn real navigation. Skip routes when no codebase is available. |

If no brief exists, ask the user to run `uxd-problem-brief-create` or provide the brief. If a vision map is missing, ask them to create it with `uxd-canvas-create`. Do not silently replace the agreed map with a new, unreviewed story.

## Miro access

When given a Miro URL, read the paired maps directly through the available Miro connection and follow the Miro read/write guidance in `uxd-canvas-create`. In the storyboard pass, show the proposed content and receive the designer's confirmation before adding a clearly labeled storyboard frame to the same board. Never alter or delete either journey-map frame. In the finalization pass, read the designer-edited storyboard and do not overwrite it. If direct Miro writing is unavailable, provide a Miro-ready storyboard in the artifact and say it needs to be transferred manually. If the board cannot be read, ask for a JSON Canvas snapshot or exports and state the access limitation.

## Outputs

The storyboard pass writes `.artifacts/storyboard-draft.md` beside the brief (or `.artifacts/{ID}/storyboard-draft.md`) and adds the storyboard to Miro after confirmation. The map stage writes research coverage to `.artifacts/journey-map-research-check.md` (or `.artifacts/{ID}/journey-map-research-check.md`). The finalization pass writes `.artifacts/experience-narrative.md` (or `.artifacts/{ID}/experience-narrative.md`). Link the brief, paired map, research check, and edited storyboard so the prototype step can trace the handoff.

## Arguments

$ARGUMENTS

Parse as: `[path-to-brief] [--journey-map <miro-url-or-canvas-path>] [--stage draft-storyboard|finalize-narrative] [--workspace <path>] [--horizon <time>] [--id <work-item-id>]`

| Flag | Default | Description |
|------|---------|-------------|
| `--journey-map` | none | Miro URL or local JSON Canvas path |
| `--stage` | infer from board state | `draft-storyboard` creates an editable storyboard; `finalize-narrative` reads an edited storyboard and writes final prose and handoff |
| `--workspace` | none | Codebase whose navigation the screen list should follow |
| `--horizon` | from brief/map | Time horizon for a future experience, such as 6–12 months |
| `--id` | none | Work item id for the artifact path |

---

## Step 1: Read the brief and map

Read the brief and both frames of the journey map. Confirm they describe the same actor, scenario, and scope. Preserve the map's stage names and left-to-right order. If only one frame is present, or the actor, scenario, or phases conflict, ask a focused question before drafting.

Use the As-Is frame for the current experience and the To-Be frame for the future experience. Read actions, touchpoints, screens, mindsets, emotions, pain points, evidence, assumptions, and support opportunities. Do not flatten away details that will affect the prototype.

## Step 2: Preserve evidence and uncertainty

Carry `[E#]` evidence references and source links into the relevant beats. In Miro, make each evidence citation clickable to its source and keep `[A#]` assumptions tied to the map's bottom assumption reference strip. State what would validate assumptions. Do not turn an assumption into a research finding or invent a source. If the map makes a claim that conflicts with the brief, ask which source to follow.

## Step 3: Resolve enabling context

Use the time horizon and capabilities already recorded in the brief or map. Ask only for missing information that changes whether the future experience is credible. Describe each capability as something the person can do, and keep its readiness visible: committed, being explored, or aspirational. Do not invent a horizon or capability list.

## Step 4: Draft the To-Be storyboard (first pass)

Use the paired maps to draft a future-state story map. Keep the same actor, scenario, and stage order. Use the To-Be actions to make a simple narrative sequence; draw on As-Is pains, needs, and linked evidence only where they clarify the story. Do not create a separate As-Is story map unless the designer asks for one.

Keep the Miro frame simple: one short setup card, then one concise narrative beat per mapped stage, arranged left to right. Keep each beat to one or two sentences and retain its `S#` label. Carry relevant `[E#]` citations as clickable links and `[A#]` markers; avoid repeating headings for action, pain, screen, support, mindset, and emotion in every beat. Beneath the story-card row, add a matching row of empty screen/artifact drop zones, one aligned to each beat and labeled for the designer to add a screen or sketch. Keep these zones blank: they are spaces for later design work, not proposed interfaces. Include screen content only when it is present in the map or supported by a capability already supplied; if that context is open, do not invent it. Finish with one brief “Still to learn” line.

Show the draft before writing to Miro. With confirmation, add a new storyboard frame to the same board and preserve the two journey-map frames. Save a Miro-ready markdown copy. If Miro writing is unavailable, return the copy for manual transfer and explain that limitation. Ask the designer and partners to edit the storyboard in Miro before finalization.

Write the draft from [references/storyboard-template.md](references/storyboard-template.md). Stop after sharing the draft and asking the designer to edit it; do not produce final narrative prose in this pass.

## Step 5: Read the edited storyboard and set the scene (second pass)

When `--stage finalize-narrative` is selected, or when an edited storyboard already exists and the designer asks to finalize, read the storyboard from Miro. Treat the team's edits as the source for the narrative. If there is no storyboard frame yet, finish the storyboard pass first.

Establish who, when, and what is at stake using the brief and map. Reuse a matching persona when available; otherwise use a specific synthetic person and label them as synthetic. Write a 2–3 sentence scene-setter without adding unsupported context.

## Step 6: Write the As-Is story

Turn the map's As-Is stages into 3–5 concrete beats. Each beat should retain the mapped user action, touchpoint, screen or artifact, mindset, emotion, and pain that matter to the story. Cite evidence near the claim; label assumptions. The map is already the team's working hypothesis, so ask only about material contradictions or gaps rather than repeating the workshop.

## Step 7: Define the change

Use a mapped support opportunity and an enabling capability from the brief to identify the pivot. State what the person does, what the product or service does in response, and which pain changes. Keep the pivot credible for the stated horizon; do not add an unapproved capability.

## Step 8: Write the To-Be story and payoff

Use the edited storyboard as the primary structure for the To-Be prose. Preserve its sequence and user actions; retain mapped pains, needs, and opportunities as context.

Mirror the As-Is stages so the change is easy to compare. Use the To-Be map's actions, touchpoints, proposed screens, and support responses. Make any unresolved or new friction visible. Close on the desired outcome from the brief and show what the person can now accomplish.

## Step 9: Create the prototype handoff

Select the 3–5 screens or views needed to tell the story. Preserve all map steps in the handoff, even when multiple steps share one screen. For each screen, include:

- Screen name and placement (existing page, new view in an existing area, or new area)
- Journey stage and mapped step labels (`S1`, `S2`, etc.); preserve the map's ordering and labels when multiple steps share a screen
- User action and touchpoint
- Key content and system response
- Pain addressed or support opportunity demonstrated
- Evidence or assumption references
- Route only when it was confirmed from the target codebase

Do not invent routes. The prototype skill receives both this narrative and the source journey map, so retain a link to the board instead of copying the entire board into prose.

## Step 10: Write and review the narrative

Write final prose from [references/template.md](references/template.md). Read it back to the designer and ask whether it stays faithful to both maps and the edited storyboard, whether assumptions are clear, and whether the screen handoff preserves what should be prototyped. Revise prose without silently changing the source board.

## Quality checks

- The story uses the same actor, scenario, and stages as the paired map
- The storyboard reads as one setup and a simple sequence of concise narrative beats, not a repeated field checklist
- The storyboard was reviewed and edited by the team before final prose is written
- As-Is beats trace to evidence or remain labeled assumptions
- To-Be beats reflect mapped opportunities and capabilities from the brief
- Touchpoints, screens, actions, pain points, and support responses survive in the prototype handoff
- The payoff matches the brief's desired outcome
- Screen count is focused; routes are based on inspected navigation
- The narrative links to the source board or canvas and can be followed by someone outside the work

When the designer is ready to build, pass both the Miro board URL (or local canvas path) and this narrative to `uxd-prototype-create`. Include `--workspace` when the prototype should extend an existing product.
