---
name: uxd-experience-review
version: 0.1.0
description: >-
  Judge whether an experience narrative and prototype carry the framed problem,
  and draft the stakeholder demo. Use when reviewing a story-driven prototype
  or preparing to show an experience.
audience: "UX designers"
inputs: "A problem brief, an experience narrative, a prototype, and a paired vision map when available"
outputs: "A review scorecard, improvement list, and presentation plan"
---

# Experience Review

Judges whether a story-driven prototype carries the framed problem, and helps the designer prepare to show it. This is not a heuristic audit, an acceptance-criteria check, or a usability study.

This skill reviews and recommends; it does not edit prototype code or content. The designer chooses which recommendations to apply. Pass those selected changes to `uxd-prototype-create` for targeted refinement, then review the updated experience.

## Inputs

| Input | Required | Source |
|-------|----------|--------|
| Problem brief | **Yes** | `.artifacts/problem-brief.md` or `.artifacts/{ID}/problem-brief.md` |
| Experience narrative | **Yes** | `.artifacts/experience-narrative.md` or `.artifacts/{ID}/experience-narrative.md` |
| Paired vision journey map | Required for vision work | Miro URL or local JSON Canvas; omit for non-vision reviews |
| Prototype | **Yes** | Path, URL, or running app the user points to |

If the brief or narrative is missing, stop and name the skill that should produce it (`uxd-problem-brief-create`, `uxd-experience-narrative-create`). For a vision prototype, also require the paired journey map; if it is missing, ask for the Miro URL or local canvas. If no prototype is available, stop and ask where it lives. Do not search a default repository.

## Outputs

Write `.artifacts/experience-review.md` beside the other artifacts. When an id is known, write `.artifacts/{ID}/experience-review.md` instead.

## Arguments

$ARGUMENTS

Parse as: `<prototype-path-or-url> [--id <work-item-id>]`

---

## Step 1: See the prototype

Read the brief, narrative, paired journey map when this is a vision, and the prototype source or running UI. For a Miro URL, read both frames through the available Miro connection, following `uxd-canvas-create`'s read guidance. Do not write to the board. If it cannot be read, ask for an export or JSON Canvas snapshot and state the limitation.

When a server is already running, or the project documents how to start one, use that. If the prototype gates the experience behind a flag, scenario, or query parameter, enable it the way that project does. Do not assume a package script, port, or flag file.

## Step 2: Scorecard

Rate each dimension **Strong**, **Adequate**, or **Needs work**, with a short assessment tied to something you actually saw.

1. **Narrative clarity** — Can someone outside the work follow the story in a few minutes? Is the problem immediate, and does the before/after contrast land?
2. **Problem grounding** — Does the prototype show the condition in the brief and As-Is map, with mapped evidence, specifically enough that a partner would recognize it?
3. **Change demonstrated** — Is there a moment where the person experiences a mapped To-Be support opportunity from their point of view, not as a feature label? When the narrative lists capabilities, this moment uses one of them.
4. **Outcome** — Does the after deliver the desired outcome from the brief, and is that outcome worth showing?
5. **Feasibility** — Could an engineer see a path to what was shown? When the narrative states a time horizon, judge against that horizon.
6. **Visual credibility** — Does it look like the product it extends? Realistic data, not placeholder copy. Judge against the design system that project uses. When that system is PatternFly, check that components, spacing, and theming match neighboring screens. When it is not, do not apply PatternFly rules.

## Step 3: Improvements

Sort changes into **Must fix**, **Should fix**, and **Nice to have**. Each item names the screen, journey stage or step, and change. "Make it better" is not an item. "On the diagnosis screen, show the evidence behind the recommendation from To-Be stage 3" is.

Write recommendations only. Do not implement them in this skill; identify the selected items for `uxd-prototype-create` to apply.

## Step 4: Presentation plan

Draft with the designer:

- Opening line that frames the problem before the change
- Click path
- Where to pause
- Closing line that restates the desired outcome
- One- or two-sentence answers for: when could this be built, how it fits current work, what people have said (or that it has not been tested), what would be cut, and what is simulated versus real
- Who is in the room, how long, and whether they should drive or watch

## Step 5: Write the review

Write the review from [references/template.md](references/template.md). Keep every heading and include the Miro URL or local map path. When the project already keeps a design log, add the same Decisions entry there.

## Step 6: Close

Ask whether the designer has walked the prototype once without stopping, whether anyone else has seen it, and whether they can explain both the problem and what was shown.

After selected refinements have been applied, review the updated experience. If prototype code changed during that refinement, run the lint and build commands that repo documents. Skip this when the repo has none, or when no code changed. Do not impose a toolchain from another project.

## Quality checks

- All six dimensions are rated from the artifacts, not from the pitch
- For a vision, the review checks whether the prototype reflects the mapped To-Be stages, screens, touchpoints, and support opportunities; explain deliberate differences
- Improvements name a screen and a change
- The report distinguishes recommendations from designer-selected refinements and records the handoff to `uxd-prototype-create`
- The demo script has an opening, a path, and a close
- At least three likely questions have answers
- The review does not assume a product, port, flag filename, or design-system rule the target project does not use

For acceptance criteria, usability, or a design-system critique, use `uxd-prototype-evaluate` or `uxd-evaluate-design-heuristics`. This skill stays on whether the experience carries the framed problem.
