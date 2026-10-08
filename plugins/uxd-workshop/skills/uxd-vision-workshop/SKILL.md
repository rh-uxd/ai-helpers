---
name: uxd-vision-workshop
version: 0.1.0
description: >-
  Guide a team from an evidence-grounded problem through a future-state UX
  narrative, prototype, and stakeholder review. Use when planning a vision
  prototype or facilitating the workshops that shape one.
audience: "UX designers, product managers, and engineering partners"
inputs: "A product area or problem, available user evidence, and optionally a target prototype workspace"
outputs: "A problem brief, experience narrative, interactive prototype, and review plan"
---

# UX Vision Workshop

Guide a team through a focused future-state experience: one user, one meaningful problem, and a credible change the product could deliver in the next 6–12 months. The detailed activities are in [references/ux-vision-playbook.md](references/ux-vision-playbook.md).

Use the playbook as a menu, not a checklist. Run only the activities that help the team make a decision or produce the next artifact. Keep evidence separate from assumptions, and adapt all repository-specific paths and conventions to the workspace the user identifies.

## Workflow

1. **Ground the problem.** Gather existing research, support evidence, or direct observations. If a research lookup skill is available, use it; otherwise work from the evidence provided and label unknowns as assumptions. Use `uxd-problem-brief-create` to agree on the user, current condition, why it matters, desired outcome, and scope. Keep proposed features out of the problem statement.
2. **Tell the future story.** Use `uxd-experience-narrative-create` with the brief. Define the time horizon and enabling capabilities when this is a future-state vision. Reuse a matching persona when the target workspace provides one; otherwise label the user as synthetic. Include concrete before-and-after beats and a screen breakdown. Pass `--workspace` only when the narrative needs real navigation paths.
3. **Build in context.** Use `uxd-prototype-create` from the `uxd-prototype` plugin with the narrative as the source. For an existing product prototype, provide its actual workspace with `--workspace` so the new pages follow the product shell and conventions. Use standalone mode only for early exploration or when there is no target codebase.
4. **Evaluate and prepare to share.** Use `uxd-prototype-evaluate` only when there is a Jira story and reachable prototype/workspace for its acceptance-criteria and usability workflow. Use `uxd-experience-review` to judge whether the prototype carries the framed problem and to prepare the stakeholder demo. Incorporate feedback, then review the updated experience.

## Working agreements

- Bring a PM or engineering partner into problem framing when possible; record strategic constraints as constraints, not as user evidence.
- Keep the journey narrow enough to prototype and review. Make the current pain recognizable before introducing the change.
- Make capabilities visible through user actions and product responses, not feature labels.
- Inspect the target workspace before naming routes, feature flags, directories, design-history files, commands, or component patterns. Follow its documented conventions.
- Keep artifacts in the consumer project, following the paths used by the stage skills. Never write them into this skill's installation directory.

## Handoff

Each stage skill owns its artifact and detailed workflow. If an input or output is missing, name the matching stage skill and continue from the artifacts that already exist. For workshop formats, workspace adaptation guidance, and the stakeholder critique activity, read the relevant section of [the playbook](references/ux-vision-playbook.md).
