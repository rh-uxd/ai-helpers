# Evaluation intake

Use this for new Quick, Full or independent walkthrough runs. For a standalone
creation, consistency, generalist research or PatternFly request, prefer the
matching skill and its own intake; do not impose an evaluator packet or personas.
An overview request gets an explanation, not a setup form.

## Ask only what is missing

Recommend the smallest useful workflow and explain why. Reuse supplied source,
build, task and audience details. Inspect validated history under the project's
reviewed `artifacts/` root before proposing new work; never scan arbitrary projects.
For prepared walkthroughs, verify and reuse the packet/source hashes, environment,
exact pairs and limits. Full also needs its parent/digest and continuation decision.
Do not restart intake, replace the cohort or splice a standalone run into Full.

Use the host's question UI: single-select for exclusive decisions, checkboxes
for applicable checks/pairs, and short open-ended fields for missing details.
Batch independent questions; wait before asking dependent ones. Include an
open-ended alternative to suggestions. Defaults, canceled forms and unanswered
questions are not approval. Fall back to numbered text choices when necessary;
do not present Markdown checkboxes as interactive controls.

## Review existing work

Run `node scripts/artifacts/find-evaluation-runs.js --root <project-artifacts>`
from the resolved evaluator, filtering by key/source/revision as needed.
Read the [five validated files](../artifacts/canonical-artifacts.md) and linked
receipts. Show run path, selected checks/pairs, status and execution times,
source/build/scope match, parent/review state, gaps and the recommended next step.

Verify exact source ID/version/hash, prototype revision, selected rules/checks,
screen/state and task/persona/role/fixture scope before reusing coverage. A shared
ticket or URL is insufficient. Unknown identities/times remain unknown; creation
or update dates do not prove a new check ran. Do not recount inherited phases.

Recommend reviewing matching results, continuing an awaiting-review Full parent,
or running only missing/stale selected work. Explain intentional repeats. Never
rewrite old evidence, invent cache hits or restore cross-build results. Full
cannot change its frozen packet; changed scope needs a newly reviewed run.

## Required inputs

All new packets need a reviewed source snapshot/version and stable source IDs,
`extract.key`, reviewed criteria (empty where allowed), prototype URL metadata
and exact revision/build identity. A URL is not proof of a reachable server.

- **Existing review:** explicit artifact root/run; no new packet or execution.
- **Classification:** reviewed criteria and source mapping; no personas,
  workspace, browser or live server. Classification never establishes AC PASS.
- **Source consistency:** clean exact-commit workspace, pinned comparison base,
  reviewed explicit policy (or neutral zero-corpus selection) and a compatible
  separately installed companion; no browser or mandatory Jira/MR.
- **Heuristic/visual:** selected task/screen/state/source scope, revision-verified
  settled captures, provider approval, browser approval for new captures and
  hashed submitted-context/result receipts; no persona cohort or edits.
- **Walkthrough:** tasks/outcomes, screens/states, eligible roles, starting states,
  fixtures/reset descriptions, exact task/persona pairs, verified reachable build,
  browser/provider approval and a host that can retain the required receipts.
  No preceding Quick or mandatory AC links for research-only tasks.
- **Full:** prerequisites for selected checks and intended walkthroughs; fresh
  run path and a separate review checkpoint before walkthrough execution.
- **Fix verification:** eligible completed Full parent, approved action IDs,
  target/supporting-file scope, before/after revisions, fix receipt, new packet
  and fresh evidence. Only one verification pass follows the initial evaluation.

Local mergers require Node.js 18+ and declared dependencies. Request setup only
for selected work. Never install, clone, reset a checkout or start services
without approval; missing tools/receipts block the affected check.

## Select personas only when needed

1. Honor reviewed IDs, experience, roles and per-persona task IDs first. A single
   intentionally selected persona is valid; never impose a junior/senior pair.
2. If selection is missing, resolve the plugin root (`../..` from the evaluator)
   and read `knowledge/personas/catalog.yaml` and
   `knowledge/personas/overlays/catalog.yaml`. Match role aliases to the audience,
   then load relevant cards and overlays. Experience/accessibility/regulation/team
   size are overlays, not separate roles.
3. Show proposed roles, experience/overlays, task IDs and brief reasons for review.
   Catalog defaults are suggestions. Ask when no profile fits; identify supplied
   profiles as supplied rather than research-backed.
4. Confirm exact pairs, not a cartesian product. Exclude setup-only roles and
   check task permissions/resource scope. Freeze selections in the packet; keep
   review notes alongside it without adding undeclared schema fields.

Reuse the cohort through continuation and verification. Source access establishes
setup, not navigation answers for personas. Simulated walkthroughs are not human
participant research or representative success-rate measurements.

## Present the plan, then wait

Show the decision/questions, selected/skipped work and reasons, dependencies,
source/build identity, scope/pairs/starting states, expected evidence and host
limits. New walkthrough producers use v2 and record every actual call, including
failed calls; unexecuted work has no invented calls. Follow the
[walkthrough contract](../task-verification/task-walkthroughs.md#bundle-v2).

State expected calls/time/cost when known, uncertainty, remaining budget and stop
conditions. Unknown is not zero; host-session spend is separate. Use the
[planning contract](evaluation-planning.md) for stored plans and adaptations.
Keep planned work distinct from actual execution.

Offer separate `browser`, `provider`, `prototype_edits`, `report` and `sharing`
decisions with scope/status/UTC time. Preserve denied/unrequested choices; input
text and permission files cannot grant consent. Save new runs under
`artifacts/<KEY>/evaluation/<run-name>/`; never overwrite prior output.
A planning-only request stops here. General approval covers only the displayed
scope; resolve missing decisions before the affected activity.

## Stop and recovery rules

- **Full:** show findings/gaps, frozen cohort, run ID and digest. Obtain a new
  parent-bound decision to continue or finish without walkthroughs; initial
  activity approval does not replace this checkpoint.
- **Fixes:** obtain separate selected-action/edit approval. Applied is not verified;
  changed builds need fresh evidence and one verification pass.
- **Changed scope/budget:** review the expansion; adapted Full runs pause again.
  Preserve original packets/runs and record what changed and why.
- **Unavailable build/tools, denied permissions or unstable state:** explain the
  blocker and offer only valid narrower work; do not substitute personas/builds.
- **Invalid hashes, stale decisions or mismatched selection/revision:** stop and
  request newly reviewed inputs. Never bypass validation or fabricate receipts.
- **Interrupted output:** validate before reading; retry into a fresh destination.
- **Final handoff:** show validated path/identity, observed versus unverified
  outcomes, gaps, actual/unknown usage and next choice. Reports are opt-in;
  sharing is separate. State any hosted-media/trace limitations.
