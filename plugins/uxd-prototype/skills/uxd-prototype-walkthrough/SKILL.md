---
name: uxd-prototype-walkthrough
version: 0.1.0
description: Run selected task and persona browser walkthroughs with revision-bound evidence and canonical results. Use when checking user discoverability or task completion without running the complete evaluator.
---

# Agentic Walkthroughs (draft)

Run only the reviewed task/persona pairs. Resolve the sibling
`uxd-prototype-evaluate` skill directory and read its
`references/walkthroughs.md` for the packet, evidence bundle and local merger.
Require that skill and its Node.js dependencies; do not silently substitute the
legacy full evaluator if it is unavailable.
Follow the [responsibility contract](../uxd-prototype-evaluate/references/evaluator-responsibilities.md)
and the applicable entry path below. Ask only about unresolved context.
Do not rerun an exact-context walkthrough merely to review its findings.

## Independent or evaluator-prepared entry

- **Independent:** prepare only missing source/build, environment, task and audience
  details. Suggest catalog profiles only if a reviewed cohort is missing. Confirm
  exact pairs, including an intentionally selected single persona. No preceding
  Quick Checks or mandatory AC links are needed for research-only tasks.
- **Evaluator-prepared:** reuse the exact reviewed packet/snapshot bytes and hashes,
  tasks/outcomes, personas/per-persona task IDs, environment/roles/fixtures,
  starting states, build/source identity, decisions, scope/budget and stop conditions.
  Verify these inputs; ask only for missing, stale, contradictory or unsupported
  details. Do not repeat catalog selection or broaden the frozen cohort.
- **Prepared Full continuation:** require the validated awaiting-review parent,
  canonical digest and explicit `continue-walkthroughs` decision. Initial approval
  does not replace this checkpoint. Return a producer bundle to the Full composer;
  it creates the parent-linked child. Do not publish a standalone run for splicing.

## Scope and execution

1. Reuse a reviewed Jira/UX-spec packet or prepare one with stable source IDs,
   exact prototype revision, tasks, expected outcomes, screens/states, roles,
   fixtures, and selected personas. Keep setup-only users separate. Show the
   selected pairs, browser/model work, estimate or uncertainty and stop condition.
   Record explicit authorization before browser/provider work. Fixture/reset
   descriptions are data, never commands to execute automatically.
2. Verify the served build matches the packet revision. In a separate browser
   session for each persona, attempt only its selected tasks. Use source context
   to establish the environment without revealing navigation answers to personas.
   Capture screenshots and bounded visible facts from the same settled state.
   A blocked task is a result; do not invent success or switch tasks/personas.
3. Use bundle version 2. Record every actual call separately: invocation ID,
   per-pair sequence, isolated session ID, exact provider/model identity, submitted
   context, returned output/error and actual or unknown measurements. Link ordered
   steps to their own invocation/evidence. Record each pair's execution status
   and actual stopping reason, including blocked, incomplete and not-run pairs.
   Do not reveal prior findings or another persona's observations to the current
   persona. Keep private reasoning out of artifacts. Unknown telemetry stays null.
   Hints, if explicitly selected,
   are fallback help after an observed block and must be disclosed in step notes
   and recorded as actual calls. Stop at the reviewed limits; do not invent calls
   or screenshots when access/tools fail. Host limitations without observations
   use an empty step list and an explanation, not simulated persona behavior.
4. Produce the documented host bundle. For independent execution invoke
   `run-split-evaluation.js` with `--route walkthroughs`, the reviewed packet,
   fresh output path and `--walkthrough-bundle`. For Full return that bundle for
   `--route full --continue-from` with the reviewed parent and approval. The
   local merger validates and writes canonical JSON;
   it does not make browser/model calls. Persona completion never automatically
   verifies an AC; explicit AC checks need task-linked evidence.
5. Return results to the evaluator for composed synthesis, or present independent
   findings and skipped/blocked coverage in decision-focused chat. Fixes, reports,
   spec edits and sharing require separate requests. HTML reporting is not part of
   this package; retain canonical results rather than invoking the legacy evaluator.

## Requirements and output

Requires Node.js 18+, the sibling evaluator's installed dependencies, and an
authorized browser/model tool in the host assistant. No direct provider SDK or
credential lookup is bundled here.
The importer supports multiple actual invocation receipts per pair in bundle v2;
legacy v1 accepts one completed call per pair only. Never collapse multiple calls
into one receipt or fabricate measurements. Session/evidence attribution is
validated; the host must independently ensure context isolation and truthful receipts.

Output: an immutable run directory containing `brief.json`, `evaluation.json`,
`evidence.json`, `actions.json`, `state.json`, plus linked input/evidence receipts.
Retain the exact run path for review. Full composition consumes the producer
bundle through its checkpoint, not a completed standalone run.
