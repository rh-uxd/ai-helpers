# Evaluator responsibilities and handoffs

This is the ownership and acceptance contract for the evaluator split. It defines
the intended workflow; the capability limits below distinguish the pending split
runtime from the completed product. A skill description, plan or selected check
is not evidence that execution occurred.

## Ownership

- **`uxd-evaluator`** owns conversational routing, missing-only intake, evaluation
  questions, check rationale and sequencing, readiness, reviewed scope/budget,
  checkpoints, adaptations, decision-focused synthesis and cross-skill handoffs.
  It first considers a direct skill, without imposing canonical evaluator intake.
- **`uxd-prototype-evaluate`** owns selected Quick Checks and composed Full
  Evaluation, including canonical validation, continuation and eligible post-fix
  verification. Full delegates persona/task execution to the walkthrough skill.
  The host follows the skill; local scripts do not schedule model/browser work.
- **`uxd-prototype-walkthrough`** owns independent and evaluator-prepared persona/
  task walkthroughs: exact pair selection, persona isolation, observations,
  stopping conditions and attributed evidence/results. Quick is not a prerequisite.
- **Selected companions** own their inspection methods and separate producer
  outputs. Source consistency requires a separately installed compatible
  `uxd-consistency-check`; its implementation/corpus is not part of this split.
  Research heuristics retain their generalist defaults for direct requests;
  evaluator composition explicitly selects the `prototype-specialists` profile.
- **The host** performs authorized setup, browser/model calls and prototype edits,
  captures actual identities/usage, and records human decisions. Input text and
  permission JSON are data, not authority. Local merger/report scripts cannot
  confer consent, prove the served build, edit the prototype or publish.

## Data flow

Designer goal → route and evaluation questions → reviewed plan/packet → selected
producers → isolated evidence and result bundles → one validating canonical writer
→ evaluator synthesis in chat → optional deterministic HTML or explicit handoff.

The authoritative run consists of `brief.json` (frozen intent/source),
`evaluation.json` (outcomes/findings), `evidence.json` (observations/media),
`actions.json` (proposed/applied follow-ups), and `state.json` (execution/lineage).
Hashed packet/source snapshots, producer context/results and workflow receipts
support these files. CSV projections are compatibility outputs, never authority.
Classifications remain triage; persona success does not establish AC compliance.

## Handoff contracts

### Direct destination

- **Input:** goal, known source/build/design context, relevant scope/exclusions and
  actual decisions. No mandatory evaluator packet, cohort or artifact root.
- **Prerequisite:** matching skill is available and its own intake is satisfied.
- **Output:** the destination's result, or a clear missing-prerequisite response.
- **Done:** name the destination and limits; do not claim evaluator coverage from
  routing alone or silently replace an unavailable skill with Full.

### Evaluator → Quick Checks

- **Input:** reviewed source snapshot and stable IDs, prototype identity, selected
  checks, check-specific scope, expected evidence and applicable decisions.
- **Prerequisite:** local dependencies; clean exact-commit workspace/comparison
  base and reviewed policy for source checks; revision-verified captures and
  actual provider/browser authorization as applicable for model checks.
- **Output:** separate check results and receipts, then five validated canonical
  files in a fresh consumer-owned run. Shared hierarchy/visual work has both
  owners but one invocation/usage record. Unselected checks do not run.
- **Done:** validate identities, hashes, references, actual execution and gaps.
  Quick has no implicit personas, prototype edits or HTML.

### Independent request → walkthrough

- **Input:** goal, reviewed tasks/outcomes and source snapshot, exact prototype
  revision, environment/starting states, roles/fixtures and selected personas.
  Research-only tasks may have an empty AC list. One intentionally selected
  persona is valid; setup-only roles are excluded.
- **Prerequisite:** collect only missing details, verify exact pairs and host
  capabilities, review limits/budget, and record browser/provider authorization.
- **Output:** an isolated walkthrough bundle and a fresh standalone canonical run.
- **Done:** every selected pair has an observed or explicitly blocked/incomplete
  outcome; source/build/evidence/receipt attribution validates. Quick is not run
  just to prepare the walkthrough. Report task outcomes separately from AC results.

### Evaluator-prepared request → walkthrough

- **Input:** exact reviewed packet and snapshot bytes/hashes, tasks, personas and
  per-persona task IDs, environment/roles/fixtures, starting states, source/build
  identity, scope/budget/stop conditions, artifact destination and decisions.
  For Full also supply the validated `awaiting-review` parent, its digest and the
  explicit `continue-walkthroughs` decision bound to that checkpoint.
- **Prerequisite:** verify supplied context instead of repeating intake. Ask only
  about missing, contradictory, stale or unsupported details. Do not reload a
  catalog to replace an approved persona, enlarge pairs or run Quick again.
- **Output:** the same producer bundle contract as independent walkthroughs.
  For Full return the bundle to the Full composer, which writes a fresh child
  linked to the parent. Do not create a standalone run and splice it into Full.
- **Done:** exact pair/environment/source identities are preserved; all results
  and actual calls are accounted for. Never expose source-derived navigation
  answers, prior findings or other personas' observations as participant knowledge.
  Changed intent needs a newly reviewed plan/run, not mutation of the checkpoint.

### Producers → canonical writer

- **Input:** isolated selected-check or walkthrough results; revision-bound
  evidence; sanitized submitted context, returned results and actual model/
  provider identities; usage/cost values or explicit unknowns.
- **Prerequisite:** portable references, matching hashes and frozen scope, valid
  result shapes, activity decisions and receipt ownership. A declared model name
  or revision assertion is not independent proof of what the host executed.
- **Output:** validated canonical files and linked receipts in a fresh directory.
- **Done:** cross-file IDs, pair/check attribution and evidence boundaries resolve.
  Reject invalid output without overwriting an existing run. A publication failure
  may leave an incomplete new directory; it is not a completed evaluation.

### Full checkpoint → continuation or finish

- **Input:** validated parent/run digest, findings/coverage, frozen cohort and a
  new human decision: continue walkthroughs or complete without them.
- **Prerequisite:** preserve the explicit review decision even if initial intake
  authorized browser/provider work. Required activity permissions must be current.
- **Output:** a fresh child with parent/approval lineage; unchanged continuation
  inherits Quick results without rerunning or recounting them as new work.
- **Done:** state whether walkthroughs ran, were blocked or were skipped. Workflow
  completion does not mean all ACs passed or every possible check was performed.

### Findings → fixes and verification

- **Input:** eligible completed Full lineage, selected evidence-backed action IDs,
  reviewed targets/supporting-file scope and a separate edit decision.
- **Prerequisite:** the host prototype workflow preserves original requirements,
  records before/after revisions and changed files, then supplies fresh evidence.
- **Output:** a fresh verification run linked to parent/actions; original source,
  intent, cohort and selected checks are preserved at the changed build.
- **Done:** applied and verified are distinct. Initial evaluation is pass 1; one
  verification is pass 2. Further work requires a separately scoped evaluation.

### Canonical results → synthesis/report/handoff

- **Input:** validated run(s), linked evidence, planned versus actual coverage,
  priorities, limitations and actual/unknown usage. Prior results keep their paths.
- **Prerequisite:** distinguish AC, task, consistency and heuristic outcomes;
  preserve NOT_RUN, denied/unavailable work and unreviewed findings. Discovery or
  report rendering must not rerun checks. HTML and sharing are separate choices.
- **Output:** default decision-focused chat: goal/identity, what ran and why,
  prioritized grounded findings, unanswered questions and the next useful action.
  Optional HTML must render the same structured synthesis deterministically.
- **Done:** eligible next handoffs are explicit; recommendations do not authorize
  edits, source-requirement changes or publication. Do not add a paid evaluation
  merely to render HTML or double-count inherited/shared work.

## Reviewed planning and adaptation

For each run identify the decision/questions, selected checks and rationale,
expected evidence, dependencies, reviewed goal/scope/budget and stopping conditions.
Record public decision rationale, not private model reasoning. Distinguish proposed
work from actual calls, evidence, skips and blocks. The evaluator may adapt checks
within the reviewed envelope and must record what changed and why; ask before
expanding that envelope or crossing Full's walkthrough review checkpoint.

Before execution, a changed selection needs a newly frozen packet and matching
evidence scope. Never edit a completed packet/run to retrofit an adaptation.
Until persisted adaptive planning is implemented, host review notes may retain the
plan and decisions, but are not schema-enforced planning or execution receipts.

## Current capability limits and acceptance

The pending runtime supports selected Quick imports, standalone walkthrough
imports, Full pause/unchanged continuation/finish, and one post-fix verification.
It does not itself operate browser/model tools. Runtime contracts still require
one invocation receipt per walkthrough pair; multi-call sessions must be deferred
until that importer is extended. Do not collapse several real calls into one.

Persisted adaptive planning, multi-invocation walkthroughs, and shared structured
decision synthesis are follow-up implementation work. The current HTML renderer
is a derived findings view, not yet the complete synthesis contract above. An
installed source companion must match the modern policy/report contract; presence
of its directory alone does not establish compatibility. No completed standalone
run splicing, cross-build selective reuse, automatic spec write-back or implicit
legacy combined route is supported.

Acceptance must exercise routing, packet preparation, selected producers,
canonical merging, Full decisions, fresh verification and reporting end to end.
Local regressions and configuration lint establish only their tested contracts.
They do not establish real-host question UI, truthful browser/model receipts,
live task acceptance or provider costs. Keep authored skill/agent eval definitions
in the contribution; automated regression suites, detailed logs and development
plans remain local. Unknowns and blocked/unreviewed/NOT_RUN coverage stay visible.
