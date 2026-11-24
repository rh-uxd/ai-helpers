---
name: uxd-productize-review
version: 0.3.0
description: >-
  Evaluate changed areas of an existing prototype using checks the user
  selects. Use when a user asks for Productize or wants a scoped review
  with evidence and no fixes.
audience: "People reviewing changes to an existing prototype"
inputs: "An existing prototype, the changed user action or outcome to review, inputs for the selected checks, and an agreed output workspace"
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
of rerunning. A report beside the record for the same run ID and prototype
revision means Review has started. Supplying an old result alone is not a resume
request. A prior-build result is context, not coverage of the current build.
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
   no fixes, and its [prepared handoff](references/requirements-triage.md). Use Jira or reviewed written criteria;
   a result describes what was observed, not what was required. Missing criteria
   block the check. It classifies text, not UI behavior,
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

Name the current phase. Confirm scope before writing the record, obtain approval
before Evaluate, and wait for Review approval before creating the report.
Selecting checks does not authorize execution.

### 0. Introduce Productize

On a new run, welcome the user with the `version` from this file's frontmatter.
Explain the plan using the change they brought. For example:

> Welcome to Productize, version {version}. We'll agree on what changed and
> which checks would help. With your approval, I'll run those checks and save
> the evidence in a run record. Then we can review the findings together and
> decide what to do next. The prototype itself won't be edited.

Offer to adjust the plan and move straight to the scope question below in the
same reply. The introduction does not create artifacts or start any checks.
When resuming, read the existing record and recap the last outcome, any blockers,
and the next decision instead of repeating the welcome. For a question about
saved evidence alone, answer it without starting a new run.

### 1. Agree on scope

Confirm the prototype revision and
what changed for the user. One **journey** means one user goal or action and
its relevant outcome, not a required journey map, persona, or walkthrough.
“Save a filter and see it in the saved list” is enough. Reuse that scope
from the request or criteria; ask “Which change should we focus on?” only
if the answer would change coverage. For an interaction check, identify the
relevant screen/state; text triage needs no screen capture or live preview.
Claim diff coverage only from the reviewed head
and base, and runtime observations only from a matching preview.

Show a short plan for one changed journey: which checks would help, what each
would answer, and when the user will review it. Accept any subset by name
or number, including “accessibility only” or none.
Recommend from the question: “what still needs verification?” → requirements
triage; “can I complete it with the keyboard?” → accessibility; “does this
interaction follow the PatternFly pattern?” → PatternFly interaction fit.
Explain any missing prerequisite. A recommendation or an available tool never selects a check.
Confirm an output location the reviewer can open.

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

Before marking a selected check **completed**, compare its `run.md` entry
with the actual invocation or saved producer output:

- **Who did what?** Name the producer and version (or unknown), route actually
  used, and whether this was a new check or a supplied observation. For PF fit,
  open the PF router when available and its relevant catalog entry; if using
  the allowed direct fallback, record why. A correct guess is not a skill result.
- **Which revision?** Compare the target revision with the revision identified
  by the evidence. If different, say **prior build only**; if unidentified, say
  **build unknown**. Keep the current target unverified in both the summary and
  any structured status. Do not change the old record. For triage compare the
  reviewed packet identity; classifying its text leaves every AC `NOT_RUN`.
- **Can the reviewer reopen it?** Open the result and supporting sources; put
  clickable links beside the claim (for PF fit: observation and applicable
  guidance; for supplied results: task result and build evidence). Resolve
  links from the saved document. Never report a check as completed from a
  filename, pasted summary, or a skill that was only recommended.

If the check did not run, say **not run**; if a missing prerequisite prevents
it, say **blocked** and name what is missing. On an evidence-only question,
give the same attribution and links in chat without starting a run.

For supplied local text evidence, the host uses the [read-only evidence
handoff](references/run-guide.md#local-evidence-handoff) before synthesis.
Use its source texts for interpretation and its revision label and links
verbatim in the answer or authorized record. Its receipt proves a read,
not execution of the producing skill.
Link native skill outputs. For chat-only results, save the full outward-facing
output as `checks/<check-id>.md` (`accessibility`, `requirements`, or `patternfly`).
Link each saved result from `run.md` with a clickable relative Markdown link.
Requirements triage produces a native run: use the validated run and receipts
in the prepared handoff, not the chat-only fallback.
For example, use `checks/patternfly.md` as the link target for a saved PatternFly finding. Keep findings and
qualifiers unchanged.

Share the record path and a short summary. Do not write the combined report
until the user approves Review.

### 3. Review findings with the user

Review approval authorizes exactly one write: the report. Read the record
and relevant results without updating their status or adding a backlink. Save
`productize-report.md` beside `run.md`, marked `Pending review` with a link to
the record. Link the detailed results; attribute findings to skills and
include evidence, limits, and next steps. Leave the Evaluate record unchanged
when opening Review.

When the user states a next decision, open the saved report to confirm
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
directory. State access gaps
instead of inventing evidence. Do not store credentials or private reasoning.
