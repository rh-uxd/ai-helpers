---
name: uxd-problem-brief-create
version: 0.1.0
description: >-
  Frame a product problem as a brief: who is affected, the current condition,
  evidence versus assumptions, and what is in scope. Use when framing a problem,
  writing a problem statement, or preparing an experience narrative.
audience: "UX designers and product managers"
inputs: "A problem, feature request, or discovery brief, plus optional evidence"
outputs: "A problem brief in markdown"
---

# Problem Brief

Produces an agreed problem frame. The statement describes the current condition and why it matters. For a future-state vision, the brief may also include a separate, provisional journey starter; that starter does not change the problem statement or represent an agreed design.

Work one section at a time. Confirm what you heard before moving on. If a discovery brief already exists, start from it instead of re-interviewing.

## Inputs

| Input | Required | Source |
|-------|----------|--------|
| Problem, feature request, or discovery brief | **Yes** | User. Ask if omitted. |
| Evidence (research, tickets, analytics, observation) | Recommended | User, or a research-lookup skill if one is available |

## Outputs

Write `.artifacts/problem-brief.md` in the working project. When a work item id is known, write `.artifacts/{ID}/problem-brief.md` instead. Do not write into this skill's directory.

## Arguments

$ARGUMENTS

Parse as: `<problem-or-source> [--id <work-item-id>]`

| Flag | Default | Description |
|------|---------|-------------|
| `--id` | none | Work item id for the artifact path. |

---

## Step 1: The situation

Ask what problem this is, who feels it, and why it matters now. If the user handed you a solution ("build a dashboard"), restate the condition that solution is meant to change and confirm the restatement.

Summarize in 2–3 sentences before continuing.

## Step 2: Evidence

Look for what the team already knows before writing the pain.

If a research-lookup skill is available, use it for the people and the situation. Capture quotes, findings, method, sample size, date, and links. If it is unavailable or returns nothing, say so and continue.

Label every claim as **evidence** or **assumption**. A thin evidence base does not block the brief.

## Step 3: Current condition

Ask who the person is, what they are trying to do, what happens today, and which evidence supports that.

Reject a generic problem. "Users find it confusing" is not a condition. A specific role, a concrete situation, and a measurable friction is.

State the desired outcome as a change in that person's condition. Leave the feature that might cause the change unnamed.

## Step 4: Scope

Draw the boundary around the problem:

- The one situation this brief covers
- What is explicitly out of scope
- Constraints that are already known (time, technology, policy, org), separate from guesses

If the frame is a whole product, ask which single situation the team needs to agree on first.

## Step 5: Stakeholders

Ask who needs to agree that this is the problem, and what each of them cares about. Do not invent names. A presentation plan belongs in `uxd-experience-review`, when there is something to show.

## Optional: Verified project context

When a target workspace is already identified and its conventions matter to the prototype handoff, inspect its documentation and include a separate, optional Project Context section. Record only verified details, such as the relevant product area, established design history, or branch/visibility conventions. Keep this information out of the problem statement and do not block the brief if the workspace is not known.

## Step 6: Draft the journey starter (vision work only)

If the brief supports a future-state vision, use the agreed user, situation, evidence, desired outcome, scope, time horizon, and enabling capabilities to sketch a paired As-Is/To-Be journey. Keep this distinct from the problem statement and label it **provisional — for team mapping**.

- Use 3–5 high-level stages for the same person and scenario. Give each current/future pair a stable step label (`S1`, `S2`, …).
- For As-Is, state the user's action, relevant touchpoint, and pain or need. Cite evidence as `[E#]`; mark unverified behavior `[A#]`.
- For To-Be, suggest the corresponding user action and product/team support or opportunity. Tie it to a capability and horizon already supplied; mark future-state claims `[A#]` until the team confirms them.
- Keep it an outline, not polished narrative, a feature specification, or a screen-by-screen plan. Leave missing evidence, capabilities, or horizon as open questions; do not invent them.
- If the future horizon or enabling capabilities are missing, ask for them as separate context. They do not belong in the problem statement.

For non-vision briefs, skip this section.

## Step 7: Write the brief

Write the brief from [references/template.md](references/template.md). Keep every heading.

Read it back. Revise until the statement has no solution in it, evidence and assumptions are labeled, and the scope is one situation.

## Quality checks

- The problem statement names a person, a current condition, and why it matters
- The statement does not name a capability, screen, or implementation
- The desired outcome is a change in condition
- Evidence and assumptions are labeled
- Scope is one situation
- At least one stakeholder is named by role, with what they care about
- For vision briefs, the separate Journey starter is provisional, paired across the same stages, and traceable to evidence or labeled assumptions

When this brief supports a future-state vision, pass its provisional Journey starter to `uxd-canvas-create` to seed the paired Miro map. The team edits and confirms it there; the reviewed map becomes the source for `uxd-experience-narrative-create` to write the final prose. Keep enabling capabilities and the time horizon separate from the problem statement. For other experience stories, the narrative skill can start directly from the brief.
