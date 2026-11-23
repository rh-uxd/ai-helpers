---
name: uxd-productize-review
version: 0.2.0
description: >-
  Evaluate changed areas of an existing prototype using checks the designer
  selects. Use when a designer asks for Productize or wants a scoped review
  with evidence and no fixes.
audience: "UX designers reviewing an existing prototype"
inputs: "An existing prototype, the journey and states to review, available evidence, and an agreed output workspace"
outputs: "A traceable run record, selected check results, and a combined report after Review approval"
---

# Productize Workflow

Evaluate selected changes, not the whole prototype. The phases are fixed;
the checks are selectable. The [run guide](references/run-guide.md) covers
how to start or resume from any host that can open the workflow and evidence.

Read authorized inputs and write only evaluation artifacts. Do not change
the prototype or source project, apply fixes, evaluate Figma directly,
certify readiness, or publish.

## Context management

Use inputs already provided; ask only for gaps that could change the plan.
When reopening a run, read `run.md` and the relevant saved results instead
of rerunning. A matching report beside the record means Review has started.
Confirm changes to scope before acting; a saved record grants no permission.

## Check menu

Show all three choices with the producing skill and what the check answers.
Say what is available, blocked by a missing prerequisite, or not applicable.
Available does not mean approved to run.

1. **Accessibility** — `uxd-a11y-review` for the agreed journey on the matching
   preview. See [coverage](references/accessibility-coverage.md). If runtime
   is blocked, offer `uxd-a11y-source-audit` of matching source as a scope
   change. Source evidence does not establish runtime behavior.
2. **Requirements triage** — `uxd-prototype-evaluate` Quick Checks with only `classify`,
   no fixes, and its reviewed packet. Use Jira or reviewed written criteria;
   missing criteria block the check. It classifies text, not UI behavior,
   and does not verify acceptance criteria.
3. **PatternFly interaction fit** — use `pf-assist` to route to the interaction
   catalog in a confirmed PatternFly project. If the router is unavailable,
   use the same catalog directly and note the route. Open the relevant entry in the catalog
   shipped by `pf-catalog-interaction-patterns` in `pf-design-guide`
   ([source checkout](../../../patternfly/pf-design-guide/skills/pf-catalog-interaction-patterns/references/interaction-catalog.md)).
   Compare approved observation or readable source with version- and
   variant-specific guidance, which takes precedence. Link both and report
   only that interaction's fit. Missing catalog, evidence, or guidance blocks the check;
   confirmed non-PatternFly is not applicable. Do not invoke `/pf-review` or
   start other audits.

## Phases

**Stop between phases.** Name the current phase and ask for approval before
starting the next. Selecting checks does not authorize execution.

### 1. Agree on scope

Introduce the workflow and version. Confirm the prototype revision and
changed journeys/states. Claim diff coverage only from the reviewed head
and base, and runtime observations only from a matching preview.

Show a short plan for one changed journey: which checks would help, what each
would answer, and when the designer will review it. Accept any subset by name
or number, including “accessibility only” or none.
Confirm an output location the reviewing designer can open.

On scope confirmation, start `run.md` from the
[traceability template](references/traceability-record.md). Record the
prototype revision, approved scope, and planned checks. Do not write for a
tentative proposal. Wait for approval to Evaluate if it was not given with
scope confirmation. If no checks are selected, stop without evaluating.

### 2. Evaluate the selected checks

Run only approved, ready checks. Obtain any separate tool or provider approval
and use safe test data. Full Evaluation and agentic walkthroughs are outside
this workflow, even if requested. Offer the scoped checks; never silently
substitute consistency checks or simulate a user.

Update `run.md` as checks finish: actual skill and version, outcome, reason
for skipped or blocked work, and links to findings and limitations. Mark
checks complete only with a result, and leave untested coverage visible.
Link native skill outputs. For chat-only results, save the full outward-facing
output as `checks/<check-id>.md` (`accessibility`, `requirements`, or `patternfly`).
Link each saved result from `run.md` with a clickable relative Markdown link.
For example, use `checks/patternfly.md` as the link target for a saved PatternFly finding. Keep findings and
qualifiers unchanged.

Share the record path and a short summary. Do not write the combined report
until the designer approves Review.

### 3. Review findings with the designer

Review approval authorizes exactly one write: the report. Read the record
and relevant results without updating their status or adding a backlink. Save
`productize-report.md` beside `run.md`, marked `Pending review` with a link to
the record. Link the detailed results; attribute findings to skills and
include evidence, limits, and next steps. Leave the Evaluate record unchanged
when opening Review.

When the designer states a next decision, open the saved report to confirm
it's for the same revision. Record the decision, owner, and stated review
status in `run.md` and link the report. Preserve scope, check outcomes, and
evidence. Leave unprovided decisions or owners pending; recording a decision
does not authorize edits to the prototype or sharing.

## Artifacts

Use a fresh `artifacts/<KEY>/productize/<run-name>/` in the agreed output
workspace, outside the prototype checkout and installed plugins. Use a safe
ticket key or agreed prototype ID. Keep native evaluator artifacts in place
and prior runs intact.

Open evidence files before citing them. Resolve input paths from the output
workspace unless another base is supplied; link from the saved document's
directory. From a run's `checks/accessibility.md`, workspace evidence at
`checks/keyboard.md` is `../../../../../checks/keyboard.md`. State access gaps
instead of inventing evidence. Do not store credentials or private reasoning.
