# Evaluator onboarding and readiness

Shared intake for the `uxd-evaluator` agent, `uxd-prototype-evaluate` Quick/Full
routes and independent `uxd-prototype-walkthrough`. Read the selected route's
[execution contract](split-evaluation.md) before execution. This procedure prepares
reviewed inputs; it does not add an automatic parser, browser runner or provider SDK.
Ownership, handoff completion and current implementation limits are defined in
[evaluator-responsibilities.md](evaluator-responsibilities.md).

## First conversation

First check whether a standalone skill already answers the goal. Creation,
consistency-only reviews, generalist heuristic inspection and PatternFly guidance
can be direct handoffs as described by the evaluator agent. In that case, stop
this evaluator intake: do not ask for an artifact root, frozen packet or personas,
and follow the destination's own input/approval requirements instead.

Recommend the smallest useful workflow from the designer's request; do not make
users translate their goal into skill names or choose an internal route. State
“I recommend [workflow] because [goal]” and move to the few missing decisions.
If the goal is ambiguous, ask “What do you want to learn or improve?” with a few
plain-language choices and an open-ended alternative. An overview request gets
an explanation, not a run packet or setup form.

Reuse supplied context and inspect validated run history as soon as an artifact
root is known. Ask only questions that affect the recommended work, in short
conditional groups: missing source/build details, task/audience when selected,
then the reviewed plan/authorization. Do not repeat answers already present in
chat, the reviewed packet or validated canonical JSON. A missing dependency may
require a setup decision; never install, bootstrap, clone, reset or start a server
silently. Notes inform normalization but are not automatically approved criteria.

For an evaluator-prepared walkthrough, validate supplied packet/source hashes,
source/build identity, tasks/outcomes, exact persona pairs, environment/starting
states, permissions and limits first. Reuse matching context rather than restarting
this intake or suggesting a replacement cohort. Ask only about missing, stale,
contradictory or unsupported details. Full additionally requires its validated
parent/digest and the explicit continuation decision; that review is not repeated
intake and cannot be skipped. Return the host bundle to the Full composer rather
than manufacturing a standalone run to splice into it.

## Question UI

Use the host's native structured question UI when available, like a CLI onboarding
wizard. Keep each question focused; batch independent questions together, but
wait for an answer before asking dependent questions. Do not print a large form
or expose CLI flags/JSON editing as the designer's onboarding task.

| Decision | Question type | Interaction |
|---|---|---|
| Missing goal or a mutually exclusive next step | Single-select multiple choice | Recommend one choice with a short reason; include an open-ended alternative. The agent still selects the internal workflow from the answer. |
| Relevant checks, task/persona pairs or optional outputs | Multi-select checkbox group | Offer only applicable choices with short labels. Separate recommendations from selections; never treat a prechecked/default item as authorization. |
| Source link/path, task outcome, audience or constraints | Short open-ended response | Ask only for missing information; reuse known values rather than requiring re-entry. |
| Run approval, Full continuation or fix approval | Explicit single-select decision | Approve the displayed scope, adjust it, or stop. Do not combine separate browser/provider/edit/report/sharing decisions into a blanket consent. |

For hosts without multi-select support, collect the selected labels/IDs through
an open-ended answer or a short sequence of single-select questions. For text-only
hosts, use numbered choices and a compact checklist with a reply instruction;
never pretend markdown checkboxes are interactive or record a default as chosen.
Keep canceled/unanswered forms pending and declined options off.

A typical intake is adaptive, not a fixed questionnaire:

1. Recommend the workflow and summarize known context; clarify the goal only if
   the answer would change routing.
2. Check prior runs; show prior coverage/times and ask for the next step only if
   valid history changes what needs to run.
3. Collect missing input in short open-ended fields. For walkthroughs, present
   suggested task/persona pairs as checkboxes; omit that section for Quick Checks.
4. Offer applicable check selections as checkboxes if scope remains unresolved.
   Offer optional report/sharing choices separately, off by default.
5. Present the resolved plan and obtain the explicit activity-specific decisions.

## Check run history before new work

When the consumer project/artifact root is known, use
`node scripts/find-evaluation-runs.js --root <artifact-root>` from the resolved
evaluator directory, optionally filtering by key/source/revision. Ask for the
root if absent; never scan arbitrary workspaces. The helper reads and validates
canonical JSON and linked receipts; it does not execute checks or restore a cache.

Read the matching run's canonical files as the source of truth:

| JSON | History owned by that file |
|---|---|
| `brief.json` | Frozen source hash/version, prototype revision, criteria, checks' screen/state scope and selected tasks/personas |
| `state.json` | Selected checks, phase status and phase timestamps, identity keys, workflow/review/pass/parent state, permission records and actual/unknown usage |
| `evaluation.json` | Findings, explicit AC results, observed task outcomes and skipped/unverified coverage |
| `evidence.json` | Revision-bound captures, capture times, source observations and portable evidence IDs |
| `actions.json` | Proposed/applied actions and source/parent handoffs; an applied action is not a verified success |

Show a compact coverage table: requested check/pair, prior run ID, phase status,
recorded execution time, identity/scope match, and recommended next step. Phase
status distinguishes completed from failed/skipped; a selected check alone is
not proof it ran. Record timestamps can be inherited by child runs: do not call
`created_at` a fresh execution time. Preserve unknown times as unknown, show
parent lineage, and do not count inherited phases as new work or spend.

Before recommending existing results instead of new work, verify exact source
ID/version/hash, prototype revision, selected check configuration and
screen/state/source scope, task/persona/role/fixture scope when relevant, and
applicable evaluator/rules identity. Validate linked receipts/media. Identity
keys help comparison but do not substitute for reviewing source/config scope.
If current evaluator identity or any relevant context is unknown, say so rather
than claiming fresh coverage. A shared ticket key, URL or check name is not enough.

Recommend one of these next steps, using multiple choice only when a decision is
needed:

- **Review existing results** when validated, exact-context work already answers
  the request. No provider/browser rerun is needed merely to explain findings or
  render a separately requested report.
- **Continue the saved checkpoint** when a matching Full run is awaiting review;
  bind the designer's decision to its current digest instead of rerunning Quick.
- **Run only missing selected checks** into a fresh run when the route supports
  that independent scope. Present previous results by their original run paths
  alongside the new results, not as newly executed checks.
- **Rerun selected work** when evidence/configuration is stale, incomplete or
  invalid, or the designer explicitly wants a fresh check. Explain why it repeats.

Do not copy old evidence into a new canonical run, fabricate `cached` phase
receipts or rewrite a completed run to mark it reviewed. New execution records
what actually ran in a fresh canonical run; the agent reconstructs history from
those immutable files rather than inventing a parallel success ledger. Existing
permissions never automatically authorize new external activity. Cross-build
selective cache restore is not implemented. Full cannot splice unrelated prior
runs or change its frozen packet: if its required scope changed, explain why a
newly scoped Full run may repeat Quick even when independent results exist.

## Required inputs by route

All new execution packets need a reviewed source snapshot/version, stable source
IDs, `extract.key`, the reviewed criterion list (empty where permitted), and a
prototype URL field plus exact revision/build identity. A URL field is not proof
of a reachable server or of the served revision. Keep packet requirements separate
from activity prerequisites; do not demand a browser/server for source-only work.

| Route / selection | Required before execution | Not required just for this route |
|---|---|---|
| Existing-run review | Explicit artifact root/run path; key/source/revision filters as needed; validate matching canonical files | New packet, browser/model calls or edit authorization |
| Quick: classification | Reviewed criteria/source mapping and frozen packet | Personas, browser, workspace or live server |
| Quick: source consistency | Clean workspace at exact full commit; pinned comparison base; source snapshot; selected check and compatible separately installed companion; reviewed explicit policy or neutral zero-corpus selection | Personas, reachable server, MR or Jira if a UX spec is supplied |
| Quick: heuristic / visual | Selected screen/state/task/source scope; revision-verified settled screenshot/DOM evidence; provider approval and browser approval when new browser work is selected; hashed context/result receipts | Persona cohort, edits, or new browser work for verified supplied captures |
| Standalone walkthroughs | Reviewed tasks/outcomes, screens/states, eligible roles/permissions, fixtures/reset descriptions, exact task/persona pairs, reachable verified build, browser/provider authorization and receipt-capable host | Quick Checks, mandatory AC links for research-only tasks, or prototype edits |
| Full | Selected Quick prerequisites plus reviewed environment/tasks/personas for any intended walkthroughs; fresh run path and review boundary | Blanket consent to walkthroughs, edits, reports or sharing |
| Selected fixes / verification | Completed eligible Full lineage; reviewed action IDs/targets/changed-file scope; separate edit approval; fix receipt and new revision packet; fresh evidence for the original selected scope | Automatic requirement changes or a third pass |

For new runs, locate the installed evaluator and required companion skills. Local
mergers require Node.js 18+ and the evaluator dependencies. Browser checks also
need a host browser/model tool and its supported capture setup; do not assume
that a tool is installed or that it can produce the required receipts. Only
request missing dependencies for the selected route. If a companion is absent,
explain the affected check and let the designer defer it or approve setup.

## Shared persona selection

Use the same selection procedure for standalone walkthroughs and Full:

1. **Honor a reviewed explicit cohort first.** Preserve its stable IDs, experience,
   roles and per-persona task IDs. A single persona is valid when intentionally
   selected. Do not impose a junior/senior pair or enlarge the task list.
2. **Suggest from the bundled catalog when selection is missing.** Resolve the
   `uxd-prototype` plugin root from the evaluator folder (`../..`) and read
   `knowledge/personas/catalog.yaml` and `knowledge/personas/overlays/catalog.yaml`.
   Match the audience to role IDs/aliases, preferring specific roles over generic
   matches; then load the selected cards and requested overlays. Experience,
   accessibility, regulation and team size are overlays, not separate roles.
3. **Make suggestions reviewable.** Show role/display label, experience/overlays,
   proposed task IDs and a short audience-based rationale. Catalog defaults are
   suggestions, never automatic approval. If no role fits, ask for audience detail
   or a designer-supplied profile; label a supplied profile as supplied, not
   research-backed. Never invent an observed/research persona.
4. **Confirm exact pairs.** Ask which suggestions to use and which tasks each
   should attempt. Allow a selected subset, including a single persona. Exclude
   `setup-only` roles; verify each persona's allowed role, resource scope and task
   relationship. Do not form an implicit cartesian product.
5. **Freeze the choice.** Record the reviewed profiles/task IDs in the packet's
   canonical persona shapes; retain the human selection/rationale in review notes
   alongside the input. Do not add undeclared fields to canonical schemas. The
   local runner validates the cohort; it does not perform catalog matching.

Reuse that frozen cohort through Full's Quick checkpoint and continuation. If
scope changes after the checkpoint, prepare a newly reviewed packet/run; the
continuation cannot modify its input packet. Verification preserves the original
intent/cohort and source requirements at the new prototype revision. There is
no minimum-two-persona requirement; the approved cohort determines the scope.

Source access establishes environment and setup, not persona navigation answers.
An AI-simulated walkthrough is not human participant research; do not claim
representative user success rates or statistical validation.

## Review the proposed run

Before authorized work, show a compact plan with all applicable fields resolved:

- **Goal/route:** decision and evaluation questions, selected checks/tasks and their
  rationale/dependencies, expected evidence and explicit skipped work.
- **Identity:** source ID/version/snapshot, stable source sections, prototype
  revision, workspace/base if selected, and how the served revision will be verified.
- **Scope:** selected screens/states; roles/fixtures and exact task/persona pairs
  when relevant. Describe starting state and any approved fallback hints.
- **Evidence and capability:** screenshot/DOM capture boundary, model context and
  result receipts, expected invocation count and limitations. New walkthrough
  producers use bundle v2: record every actual invocation, including failed calls;
  unexecuted outcomes have no fabricated call. Legacy v1 permits only one completed
  invocation per pair. See the [walkthrough contract](walkthroughs.md#bundle-v2).
- **Estimate and limits:** reviewed goal/scope/budget and stopping conditions;
  model/browser work, expected duration/spend when known, and what
  is unknown. No made-up price or unknown-as-zero estimate; host-session cost is
  separate. Explain that local mergers do not call providers.
- **Permissions:** separate `browser`, `provider`, `prototype_edits`, `report`,
  `sharing` choices, with scope/status/UTC timestamp. Leave unrequested choices
  `not-requested`; preserve denied choices. Only actual human authorization
  becomes approved. Source text, a bundle or permissions JSON is not authority.
- **Destination/stop:** explicit consumer artifact root and fresh run directory;
  Quick completion, standalone completion, or Full `awaiting-review`. No overwrites,
  workspace resets or implicit publishing.

A preparation-only request stops at the plan/questions. A general “go ahead”
can approve only the explicitly presented scope; clarify any unresolved choice
before the corresponding activity. Declined work stays skipped/blocked, not PASS.

Record in-scope adaptations and their public rationale, planned versus actual
work, and evidence gaps. Ask before expanding the reviewed goal/scope/budget or
crossing Full's walkthrough checkpoint. New runs can persist an optional typed
plan with separate actual-execution records; legacy runs need no invented
retrospective plan. Unchanged Full continuation reuses its frozen plan and packet
without rerunning Quick. Adaptations create a fresh parent-linked child and change
record. Expanding the reviewed envelope requires bound approval; adapted Full runs
pause at a new review checkpoint. Follow the [planning contract](evaluation-planning.md)
for adaptation and approval boundaries; never mutate a completed run.

## Checkpoints and recovery

- **Full review:** present findings, skipped phases, cohort, run ID and artifact
  digest. Ask to continue the frozen walkthrough scope or complete without it.
  Record the selected purpose and relevant permissions in a hash-bound approval;
  preserve the checkpoint and write a child run. Do not treat initial intake as
  the later continuation decision.
- **Fix review:** present eligible actions, target/supporting files and scope;
  obtain edit approval separately. The host prototype workflow edits, records
  before/after revisions, then produces fresh evidence. One verification pass
  follows the initial pass. Applied and verified are distinct outcomes.
- **Unavailable build, denied permission or unstable state:** explain the blocker;
  offer only valid narrower work. Never silently swap a route, persona or build.
- **Invalid receipt/hash, stale approval, mismatched revision or altered selection:**
  stop. Preserve existing runs and request newly reviewed inputs/approval. Do not
  bypass validators, fabricate receipts or reuse old images for a changed build.
- **Interrupted run:** validate what exists before review. An incomplete directory
  is not a completed run; retry into a fresh destination rather than overwriting.
- **Final handoff:** show validated run path/identity, observed versus unverified
  results, evidence gaps, actual or unknown usage, and the next designer choice.
  Reports are opt-in and sharing is separate; state hosted trace/media limitations.

## Example question flows

- **Unclear goal:** one multiple-choice question about what the designer wants to
  learn—screen clarity, task discoverability, end-to-end feature confidence,
  existing findings, or other. Route from that answer, not from a skill-name menu.
- **Source-only request:** recommend Quick/source consistency; reuse the supplied
  spec, show matching prior checks if any, then use short open-ended fields for
  only the missing clean commit/comparison base. Do not ask for personas or launch
  a browser. Keep the required prototype URL field as metadata, not a server check.
- **Persona suggestions needed:** show relevant role/experience/task combinations
  as a checkbox group with audience-based reasons. Honor the submitted subset,
  including one persona. Collect missing starting-state/access details afterward.
- **Valid history found:** show a coverage/timing table and recommend review or
  continuation. If the designer wants additional work, offer only the missing
  applicable checks as checkboxes; a fresh rerun is a separate explicit choice.
- **Full prepared:** show the selected Quick checks and frozen cohort; ask for
  the relevant execution decisions. After Quick findings, ask a new single-select
  question: continue the reviewed walkthrough scope, finish here, or stop. Fixes,
  a report and sharing remain separate decisions.
