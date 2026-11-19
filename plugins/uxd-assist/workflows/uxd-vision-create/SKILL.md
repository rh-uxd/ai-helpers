---
name: uxd-vision-create
version: 0.2.2
description: >-
  Coordinate problem framing, paired journey mapping, narrative, prototyping,
  and review for a future-state UX vision. Use when planning a vision prototype
  or facilitating the workshops that shape one.
audience: "UX designers, product managers, and engineering partners"
inputs: "A product area or problem, available user evidence, and optionally a target prototype workspace"
outputs: "A problem brief, paired vision journey map, experience narrative, interactive prototype, and review plan"
---

# UX Vision Workflow

Guide a team through a focused future-state experience: one user, one meaningful problem, and a credible change the product could deliver in the next 6–12 months. Read the relevant activity in [references/ux-vision-playbook.md](references/ux-vision-playbook.md) when workshop formats or facilitation details would help.

Use this route as a menu, not a checklist. Start from existing artifacts and run only activities that help the team's next decision. Each skill owns its artifact; this workflow owns skill selection, cross-stage handoffs, and vision-specific checks. Use available capabilities; if a skill or connection is unavailable, state the limitation and work from supplied artifacts or offer a manual handoff.

## 0. Introduce the workflow and agree on a plan

At the start of a new vision effort, introduce the workflow using the `version` from this file's frontmatter:

> Welcome to the UX Vision Workflow, version {version}. I'll help you turn a user problem into a future experience people can explore, starting from the work you already have.

Briefly summarize the user's goal, available artifacts, and known constraints. Read supplied context as needed to understand the starting point, and ask only for missing information that would materially change the plan.

Before invoking a stage skill or creating or editing artifacts, show a short numbered plan adapted from stages 1–5 below. Describe each proposed step in everyday language, its expected output, and where the user will review or contribute. Note which existing artifacts will be reused and omit unnecessary stages. For example, when a reviewed brief and paired map already exist:

1. **Check the existing foundation** — reuse your brief and maps, and surface any material evidence gaps.
2. **Shape the story together** — draft an editable storyboard for your review, then finalize the narrative and screen breakdown from your edits.
3. **Build the prototype** — turn the agreed story into an interactive experience in your product workspace, with your input on meaningful design choices.
4. **Review and refine** — assess the experience, apply the changes you select, and prepare a stakeholder walkthrough.

Invite the user to adjust the scope, order, or outputs and wait for agreement before starting the proposed work. If the user has already authorized this concrete plan, show a brief recap and proceed without asking again. On resuming an effort, recap progress and remaining steps instead of repeating the welcome or onboarding; seek renewed agreement only when the plan materially changes.

## 1. Ground the problem

Gather existing research, support evidence, or direct observations. If `uxd-research-insights` and its access are available, use it; otherwise work from supplied evidence and label unknowns as assumptions. Use `uxd-problem-brief-create` from `uxd-workshop` to agree on the user, current condition, why it matters, desired outcome, and scope. Keep proposed features, future capabilities, and the horizon separate from the problem statement.

For vision work, request separate provisional As-Is and To-Be map starters with the template's lanes as rows and 3–5 matching `S#` stages as columns. Keep Evidence & Assumptions separate from Research Coverage & Gaps: cite findings as `[E#]`, mark unsupported claims as `[A#]`, and record a preliminary coverage status and `Research gap:` question by stage. Carry the brief, linked findings, and assumption definitions into mapping.

## 2. Map the experience together

Journey mapping is recommended after the brief. Reuse an equivalent reviewed paired map and check only missing content rather than repeating the workshop.

Use `uxd-canvas-create` from `uxd-design` with the brief and its separate As-Is and To-Be starters. Explicitly select `templates/vision-journey-map` and its `context.md`. Create matching As-Is and To-Be frames on one Miro board, or use local JSON Canvas when that fits the team's workspace. Preserve the same actor, scenario, lanes, stage columns, `S#` labels, and evidence trail in both frames.

Use starters as provisional seed content, not a decision. If they are missing, draft a concise paired outline from the supplied brief, preserving evidence tags and labeling assumptions. Gather missing capabilities and horizon as separate To-Be context; leave unsupported details open. Share the outline before creating or writing to a Miro board, then have the designer and partners edit and confirm the maps. Follow the canvas skill's confirmation and widget-id rules for board writes.

### Vision map research coverage check

After the team confirms both journey-map frames, compare the mapped As-Is pains and needs, and the To-Be assumptions and support opportunities, with existing findings from `uxd-research-insights`.

- Start from the preliminary, stage-by-stage coverage and `Research gap:` notes in the brief's map starters. Revisit those notes against the completed map, correcting statuses and adding gaps raised by team edits; avoid repeating the same lookup or duplicating unchanged notes.
- Use findings already gathered for the brief when available. If none were gathered and the skill is installed and authorized, search for relevant findings. Do not treat missing search results as proof that no research exists.
- Judge only whether the available findings are relevant to and cover the mapped claims. Mark coverage as supported, partial, or not found; keep citations and `[E#]` links traceable.
- Identify unsupported pains, needs, and future-state claims. Keep future claims labeled `[A#]` and list focused research questions that could address material gaps.
- Do not launch new research or block the workflow. The team may proceed with gaps visible as assumptions.
- Add a distinct **Research Coverage & Gaps** lane (row) to both journey-map frames, aligned to the same `S#` stages. This row is the primary map record; a separate summary area may supplement it but must not replace it. For each stage, state a coverage status, cite the relevant `[E#]` findings, and add a concise `Research gap:` question when coverage is partial or not found. In To-Be, distinguish evidence for the underlying need from evidence for the proposed future capability or behavior. Preserve existing map content and keep unsupported future claims labeled `[A#]`.
- Save the written handoff as `.artifacts/journey-map-research-check.md` beside the brief, or `.artifacts/{ID}/journey-map-research-check.md` when an ID is known. Include the Miro URL, coverage judgments, linked findings, assumptions, and suggested research questions. On Miro, make every `[E#]` citation a clickable link to its source. Add a bottom reference strip that defines each `[A#]` used in the map.

For a local map, record its path in the handoff in place of a Miro URL. Keep `[E#]` source links and the assumption definitions in the local artifact as well.

### Vision map completion checks

- Both frames retain matching phases, actor, scenario, template lanes, stable step labels, and a traceable distinction between evidence and assumptions.
- The team has edited and confirmed the provisional content; future capabilities and horizon are explicit or remain open questions.
- Research coverage and gaps appear in a dedicated, stage-aligned row in both frames and in the written handoff. Unknowns remain labeled as assumptions and do not block progress.
- In Miro, evidence citations link directly to sources, source reference cards remain available, and a bottom reference strip defines every `[A#]`. Apply the template's reference guidance; do not add a generic Evidence limits row or leave placeholders such as `undefined`.

## 3. Draft the storyboard, then finalize the narrative

Preserve the reviewed board URL or local canvas path. Use `uxd-experience-narrative-create` from `uxd-workshop` with the brief and paired map, first with `--stage draft-storyboard`. Provide the research coverage handoff as context. Read both maps and add a separate To-Be storyboard frame, drawing on As-Is pains and needs without changing either journey-map frame.

Use concise narrative cards with one blank screen/artifact drop zone beneath each beat for designers to add screens or sketches. These spaces belong only to the storyboard. After the designer and partners edit it, use `--stage finalize-narrative` to read the edits and write final prose and a screen breakdown. If Miro writing is unavailable, provide a ready-to-transfer storyboard. Pass `--workspace` only when the screen breakdown needs verified navigation paths.

Pass both the reviewed board and final narrative into prototyping. The board preserves structured steps, touchpoints, screens, pains, research gaps, evidence, assumptions, support opportunities, and storyboard decisions; the narrative supplies the readable story and emotional arc.

## 4. Build from the reviewed artifacts

Use `uxd-prototype-create` from `uxd-prototype` with the final narrative as the primary source and the reviewed board or canvas as supporting context:

```text
uxd-prototype-create <narrative-path> --context <board-url-or-canvas-path> --workspace <product-workspace> --decisions human --depth normal
```

Repeat `--context` for other relevant artifacts, such as a separate edited storyboard or research handoff. For an existing product prototype, provide its actual workspace so pages follow the product shell and conventions. Use standalone mode for early exploration or when there is no target codebase.

Recommend `--decisions human` and `--depth normal` when the user has not chosen otherwise. Explain that human mode supports choosing together on a decision page or in chat. Let genuine tradeoffs determine the number of decisions; never invent a quota. Respect explicit user preferences and project constraints.

Before planning, read both map frames, research coverage notes, the edited storyboard, and final narrative. For Miro, use the available connection to read the board without writing to it. If access is unavailable, ask for a JSON Canvas snapshot or exports and state what could not be read. Do not claim to have reviewed inaccessible content.

Use the narrative for the story, the reviewed map for structured journey details, and the edited storyboard for agreed To-Be beats. If they conflict on actor, scope, stage order, or a key interaction, ask the designer which to follow. Do not replace reviewed content with an AI-only interpretation.

When deriving prototype artifacts:

- Preserve the To-Be stages, user actions, touchpoints, screen candidates, support opportunities, and evidence/assumption markers.
- Use the narrative's scene, pivot, emotional arc, and payoff. Include As-Is screens only when the designer wants current-state contrast.
- Preserve storyboard order and its mapped As-Is pains and needs; prose must not silently change board decisions.
- Group steps that belong on one screen without dropping their order. Keep every mapped `S#` label visible in journey step names or descriptions, including when steps share a screen.
- Give every `journeys.json` step a real or verified route. Screen candidates do not establish routes.
- Use `source: "user"` for journeys from human-reviewed artifacts and keep unsupported details as assumptions in `metadata.json`.
- Derive `states.json` from meaningful page conditions, not from every map note.
- When the primary source is the brief or narrative, keep metadata `source.type` as `description`. Record the Miro board in `sources` with `kind: "other"`, a descriptive label such as `Vision journey map`, and its URL so it remains accessible from the Prototype Bar.

## 5. Evaluate and prepare to share

Use `uxd-prototype-evaluate` only when there is a Jira story and reachable prototype/workspace for its acceptance-criteria and usability workflow. For a static design critique, select `uxd-evaluate-design-heuristics` from `uxd-research` instead.

Use `uxd-experience-review` from `uxd-workshop` with the brief, paired map, final narrative, and prototype to judge whether the experience carries the framed problem. The review recommends changes; the designer selects which to apply. Give only those selected changes to `uxd-prototype-create` for refinement, then use `uxd-experience-review` to check the updated experience and prepare the stakeholder demo. Keep reviewed evidence, assumptions, unresolved gaps, and supplied product principles visible without claiming downstream stakeholder alignment or adoption.

## Working agreements and handoff

- Bring PM or engineering partners into problem framing when useful; record strategic constraints as constraints, not user evidence.
- Keep the journey narrow enough to prototype and review. Make the current pain recognizable before introducing the change.
- Treat the team-edited Miro board as the shared source of truth. Keep maps, research notes, and storyboard distinct and pass the same board through narrative, prototype, and review stages.
- Make capabilities visible through user actions and product responses, not feature labels.
- Inspect the target workspace before naming routes, flags, directories, commands, or component patterns. Follow its documented conventions.
- Keep artifacts in the consumer project, using the stage skills' paths; never write them into this workflow's installation directory.
- If a stage input or output is missing, name the matching skill and continue from artifacts that already exist. Do not create duplicate artifacts just to satisfy a handoff.
