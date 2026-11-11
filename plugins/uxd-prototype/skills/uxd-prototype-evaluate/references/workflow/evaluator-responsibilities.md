# Evaluation ownership and handoffs

The host assistant runs approved browser/model work. Local evaluator scripts
validate and save the supplied results; they do not run those tools or edit the
prototype. A plan, selected check or permissions file is not proof of execution
or a substitute for the designer's consent.

## Owners

- **`uxd-evaluator` subagent:** recommends the smallest useful review, asks only
  missing questions, prepares inputs, manages checkpoints and summarizes findings.
  It belongs to the prototype plugin; no additional UXD Assist agent is required.
- **`uxd-prototype-evaluate`:** selected Quick Checks, Full composition, result
  validation, continuation and one post-fix verification.
- **`uxd-prototype-walkthrough`:** the exact selected task/persona pairs and their
  separate observations, stopping reasons and evidence. Quick is not required.
- **Companion skills:** their own inspection methods and separate outputs. Source
  consistency needs a separately installed compatible checker. Research keeps
  its generalist default; this evaluator explicitly selects its specialist profile.
- **Host assistant:** tool setup, approved calls/edits, actual build/model identity,
  usage and human decisions. If subagents are unavailable, it follows these same
  instructions directly.

## Handoff rules

1. **Direct skill:** pass the user's goal, known context, scope and decisions.
   Require that skill's own inputs—not an evaluator packet for unrelated work.
   Explain missing dependencies; never silently substitute Full.
2. **Quick Checks:** pass reviewed requirements, source IDs, prototype version and
   selected checks. Source checks need a clean matching workspace/base and reviewed
   rules. Model checks need matching captures, receipts and appropriate approval.
   A shared hierarchy/visual call is recorded once with both check owners.
3. **Walkthroughs:** freeze selected tasks, outcomes, personas, roles, starting
   states, fixtures and limits. One persona is valid; exclude setup-only roles.
   Prepared work reuses these inputs instead of repeating intake or adding tasks.
   Keep navigation answers, prior findings and other personas' observations out of
   each persona's context. See the [walkthrough contract](../task-verification/task-walkthroughs.md).
4. **Save results:** producers return separate outputs with evidence, submitted
   context, visible results/errors and actual/null usage. One writer checks IDs,
   scope, hashes, paths and decisions before saving a new run. A failed or partial
   save is not a completed evaluation. Receipts document what the host reports;
   they do not independently prove a served build or isolated model session.

## Review checkpoints

- **Full:** save Quick findings and pause. Show gaps, selected task/persona pairs
  and the saved run's identity. Obtain a new decision to continue or finish without
  walkthroughs. A fresh linked child reuses Quick without repeating its work or
  cost; never splice in a completed standalone walkthrough.
- **Fixes:** default to no-fix. An eligible completed Full run needs a separate
  request/approval selecting evidence-backed actions and target/supporting files.
  Keep requirements unchanged, record before/after versions and changed files,
  then collect fresh evidence with the same requirements/cohort/checks. Initial
  review is pass 1; verification is pass 2. Stop afterward, even with open findings.
- **Plan changes:** follow [planning](evaluation-planning.md). Changes within the
  reviewed scope/budget need a recorded reason; repeats need an explicit rerun
  record. Expanding scope/budget requires approval tied to the new inputs. Adapted
  Full runs pause at a new checkpoint; do not invent a plan for completed work.

## Results and boundaries

Use the [five saved files](../artifacts/canonical-artifacts.md) and linked receipts.
Save new runs under `artifacts/<KEY>/prototype-evaluations/<run-name>/`; preserve
earlier runs. Report what ran, what was found, what remains untested and the next
useful decision. Classification is not verification, and completing a persona's
task does not prove a requirement. Keep review candidates and unknown costs clear.

Count shared and inherited calls once. Reports are optional derived views of the
same results; reporting, sharing, edits and requirements changes each need their
own decision. No automatic publishing, cross-build evidence restore or requirements
write-back. Follow [intake](evaluator-onboarding.md) for missing inputs and stops.
Local contract tests do not establish live client/browser/model behavior or actual
cost savings. Explain those limits instead of claiming end-to-end acceptance.
