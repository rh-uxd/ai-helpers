---
name: uxd-vision-workshop
version: 0.1.0
description: >-
  Guide a team from an evidence-grounded problem through a future-state UX
  narrative, prototype, and stakeholder review. Use when planning a vision
  prototype or facilitating the workshops that shape one.
audience: "UX designers, product managers, and engineering partners"
inputs: "A product area or problem, available user evidence, and optionally a target prototype workspace"
outputs: "A problem brief, paired vision journey map, experience narrative, interactive prototype, and review plan"
---

# UX Vision Workshop

Guide a team through a focused future-state experience: one user, one meaningful problem, and a credible change the product could deliver in the next 6–12 months. The detailed activities are in [references/ux-vision-playbook.md](references/ux-vision-playbook.md).

Use the playbook as a menu, not a checklist. Run only the activities that help the team make a decision or produce the next artifact. Keep evidence separate from assumptions, and adapt all repository-specific paths and conventions to the workspace the user identifies.

## Workflow

1. **Ground the problem.** Gather existing research, support evidence, or direct observations. If an approved research lookup skill and its access are available, use it; otherwise work from the evidence provided and label unknowns as assumptions. Use `uxd-problem-brief-create` to agree on the user, current condition, why it matters, desired outcome, and scope. For vision work, include a separate provisional Journey starter with 3–5 paired As-Is/To-Be stages. Keep it out of the problem statement, preserve stable `S#` labels, cite evidence as `[E#]`, and mark hypotheses as `[A#]`.
2. **Map the experience together.** Use `uxd-canvas-create` from the `uxd-design` plugin with the brief and its Journey starter. The starter seeds one Miro board with matching As-Is and To-Be frames; the designer and partners edit and confirm it. If future capabilities or a time horizon are missing, gather them as separate To-Be context. Preserve evidence tags, label assumptions, and leave unsupported details open.
3. **Write the final narrative.** Use `uxd-experience-narrative-create` with the brief and the edited Miro board. Read the board directly through the Miro connection. Preserve evidence and assumptions, write the prose across both states, and create a screen breakdown. Pass `--workspace` only when the screen breakdown needs verified navigation paths.
4. **Build from both sources.** Use `uxd-prototype-create` from the `uxd-prototype` plugin with the Miro board and final narrative. Keep the board URL available so journey stages, steps, touchpoints, mapped pains, and support opportunities inform `journeys.json`, screen states, and the implementation. For an existing product prototype, provide its actual workspace with `--workspace` so the new pages follow the product shell and conventions. Use standalone mode only for early exploration or when there is no target codebase.
5. **Evaluate and prepare to share.** Use `uxd-prototype-evaluate` only when there is a Jira story and reachable prototype/workspace for its acceptance-criteria and usability workflow. Use `uxd-experience-review` to judge whether the prototype carries the framed problem and recommend refinements. The designer selects which recommendations to apply; `uxd-prototype-create` applies those changes, then `uxd-experience-review` checks the updated experience and prepares the stakeholder demo.

## Working agreements

- Bring a PM or engineering partner into problem framing when possible; record strategic constraints as constraints, not as user evidence.
- Keep the journey narrow enough to prototype and review. Make the current pain recognizable before introducing the change.
- Treat the Miro board as the shared source of truth after the team edits it. Pass the same board to the narrative and prototype steps; do not silently replace it with an AI-only summary.
- Make capabilities visible through user actions and product responses, not feature labels.
- Inspect the target workspace before naming routes, feature flags, directories, design-history files, commands, or component patterns. Follow its documented conventions.
- Keep artifacts in the consumer project, following the paths used by the stage skills. Never write them into this skill's installation directory.

## Handoff

Each stage skill owns its artifact and detailed workflow. If an input or output is missing, name the matching stage skill and continue from the artifacts that already exist. For workshop formats, workspace adaptation guidance, and the stakeholder critique activity, read the relevant section of [the playbook](references/ux-vision-playbook.md).
