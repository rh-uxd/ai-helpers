---
name: uxd-experience-narrative-create
version: 0.1.0
description: >-
  Turn a problem brief and paired vision journey map into a clear experience
  narrative and prototype-ready screen breakdown. Use when finalizing a future-
  state story from a Miro journey map.
audience: "UX designers"
inputs: "A problem brief, a completed as-is/to-be journey map, and optional target codebase"
outputs: "An experience narrative and structured prototype handoff"
---

# Experience Narrative

Turn an agreed paired journey map into readable story prose and a concrete prototype handoff. The journey map preserves the co-created detail; the narrative makes the experience easy to understand and share. This skill does not edit the map or build the prototype.

## Inputs

| Input | Required | Source |
|-------|----------|--------|
| Problem brief | **Yes** | `.artifacts/problem-brief.md`, `.artifacts/{ID}/problem-brief.md`, or user-provided text |
| Paired vision journey map | **Yes for vision work** | Miro board URL or local JSON Canvas with matching As-Is and To-Be frames |
| Persona reference | No | Persona cards in the target project or an installed plugin, when they match the brief |
| Target codebase | No | Only to learn real navigation. Skip routes when no codebase is available. |

If no brief exists, ask the user to run `uxd-problem-brief-create` or provide the brief. If a vision map is missing, ask them to create it with `uxd-canvas-create` before writing the narrative. Do not silently replace the agreed map with a new, unreviewed story.

## Miro access

When given a Miro URL, read the board directly through the available Miro connection. Follow the Miro read guidance in `uxd-canvas-create`; use the map as read-only source material and preserve its URL and frame names. Do not create, update, or delete board widgets from this skill. If the board cannot be read, ask for a JSON Canvas snapshot or an export of both frames and state the access limitation. Do not claim to have reviewed content that was not available.

## Outputs

Write `.artifacts/experience-narrative.md` beside the brief. When an id is known, write `.artifacts/{ID}/experience-narrative.md` instead. Include the journey-map URL or local source path in the document so the prototype step can trace the handoff.

## Arguments

$ARGUMENTS

Parse as: `[path-to-brief] [--journey-map <miro-url-or-canvas-path>] [--workspace <path>] [--horizon <time>] [--id <work-item-id>]`

| Flag | Default | Description |
|------|---------|-------------|
| `--journey-map` | none | Miro URL or local JSON Canvas path |
| `--workspace` | none | Codebase whose navigation the screen list should follow |
| `--horizon` | from brief/map | Time horizon for a future experience, such as 6–12 months |
| `--id` | none | Work item id for the artifact path |

---

## Step 1: Read the brief and map

Read the brief and both frames of the journey map. Confirm they describe the same actor, scenario, and scope. Preserve the map's stage names and left-to-right order. If only one frame is present, or the actor, scenario, or phases conflict, ask a focused question before drafting.

Use the As-Is frame for the current experience and the To-Be frame for the future experience. Read actions, touchpoints, screens, mindsets, emotions, pain points, evidence, assumptions, and support opportunities. Do not flatten away details that will affect the prototype.

## Step 2: Preserve evidence and uncertainty

Carry `[E#]` evidence references and source links into the relevant beats. Keep `[A#]` assumptions labeled and state what would validate them. Do not turn an assumption into a research finding or invent a source. If the map makes a claim that conflicts with the brief, ask which source to follow.

## Step 3: Resolve enabling context

Use the time horizon and capabilities already recorded in the brief or map. Ask only for missing information that changes whether the future experience is credible. Describe each capability as something the person can do, and keep its readiness visible: committed, being explored, or aspirational. Do not invent a horizon or capability list.

## Step 4: Set the scene

Establish who, when, and what is at stake using the brief and map. Reuse a matching persona when available; otherwise use a specific synthetic person and label them as synthetic. Write a 2–3 sentence scene-setter without adding unsupported context.

## Step 5: Write the As-Is story

Turn the map's As-Is stages into 3–5 concrete beats. Each beat should retain the mapped user action, touchpoint, screen or artifact, mindset, emotion, and pain that matter to the story. Cite evidence near the claim; label assumptions. The map is already the team's working hypothesis, so ask only about material contradictions or gaps rather than repeating the workshop.

## Step 6: Define the change

Use a mapped support opportunity and an enabling capability from the brief to identify the pivot. State what the person does, what the product or service does in response, and which pain changes. Keep the pivot credible for the stated horizon; do not add an unapproved capability.

## Step 7: Write the To-Be story and payoff

Mirror the As-Is stages so the change is easy to compare. Use the To-Be map's actions, touchpoints, proposed screens, and support responses. Make any unresolved or new friction visible. Close on the desired outcome from the brief and show what the person can now accomplish.

## Step 8: Create the prototype handoff

Select the 3–5 screens or views needed to tell the story. Preserve all map steps in the handoff, even when multiple steps share one screen. For each screen, include:

- Screen name and placement (existing page, new view in an existing area, or new area)
- Journey stage and mapped step labels (`S1`, `S2`, etc.); preserve the map's ordering and labels when multiple steps share a screen
- User action and touchpoint
- Key content and system response
- Pain addressed or support opportunity demonstrated
- Evidence or assumption references
- Route only when it was confirmed from the target codebase

Do not invent routes. The prototype skill receives both this narrative and the source journey map, so retain a link to the board instead of copying the entire board into prose.

## Step 9: Write and review the narrative

Write from [references/template.md](references/template.md). Read it back to the designer and ask whether the story stays faithful to both frames, whether assumptions are clear, and whether the screen handoff preserves what should be prototyped. Revise the prose without silently changing the source map.

## Quality checks

- The story uses the same actor, scenario, and stages as the paired map
- As-Is beats trace to evidence or remain labeled assumptions
- To-Be beats reflect mapped opportunities and capabilities from the brief
- Touchpoints, screens, actions, pain points, and support responses survive in the prototype handoff
- The payoff matches the brief's desired outcome
- Screen count is focused; routes are based on inspected navigation
- The narrative links to the source board or canvas and can be followed by someone outside the work

When the designer is ready to build, pass both the Miro board URL (or local canvas path) and this narrative to `uxd-prototype-create`. Include `--workspace` when the prototype should extend an existing product.
