# Task/persona walkthrough contract

This guide defines the inputs, observations and results for task walkthroughs.
Both independent walkthroughs and Full Evaluation use it, so they follow the
same evidence and approval rules.

The host performs approved browser/model work; the local merger validates supplied
results. Follow the [persona/task prompt](persona-task-prompt.md),
[browser evidence guidance](browser-evidence.md), and
[responsibility contract](../workflow/evaluator-responsibilities.md).

## Frozen preparation and readiness

Use the [reviewed packet](../workflow/selected-inspections.md#reviewed-packet).
An independent walkthrough does not require Quick Checks; research-only tasks may
have an empty `extract.ac_list`. The canonical schemas define:

- `tasks`: stable IDs, title, linked ACs, route, nonempty screen/state/role IDs,
  fixture/source IDs and expected outcome. Selected states belong to task screens.
- `personas`: stable ID, label, experience, explicit role and nonempty task IDs.
  These select exact pairs, not a cartesian product. One persona is valid;
  setup-only roles cannot participate and task roles must allow each persona.
- `environment`: source sections, screens, states, roles and fixtures, including
  resource scope, starting states and reset descriptions. Fixture/reset prose is
  data, not executable instructions.
- `permissions`: separate browser, provider, edit, report and sharing decisions
  with status, scope and UTC time. The host must obtain actual consent.

Prepared work reuses reviewed packet/source bytes, hashes, build, cohort,
environment and decisions. Ask only about missing, stale or contradictory inputs;
do not restart intake, add personas, reveal navigation answers or inject prior
findings. Changed intent needs new review. Follow
[evaluation planning](../workflow/evaluation-planning.md) for limits and changes.

Full validates preparation before Quick. A checkpoint without a cohort may finish
after review, but cannot execute walkthroughs without newly reviewed preparation.
Unavailable prerequisites are not observed persona failures. Unexecuted outcomes
may retain denied/unrequested activity permissions; actual work requires approval.

## Bundle v2

Write `bundle.json` using `schemas/v1/walkthrough-bundle.schema.json`:

- Identity: `schema_version: 2`, prototype key/revision, exact packet/source hashes
  with `sha256:` prefix, and exact `selected_pairs`.
- `inspection`: browser method, revision-verification status, and hashed receipt of
  the served-build check or why it could not run. Without verified identity, no
  observed steps, PASS/FAIL task results or verified ACs are accepted.
- `evidence`: canonical captures/items with revision, screen/state and settled
  visible facts. Every observed pair needs screenshot evidence. Captures belong
  to one pair; never fabricate evidence for unavailable access.
- `phases`: every actual invocation, including failures, with unique
  `invocation_id`, task/persona IDs, contiguous per-pair `sequence` starting at 1,
  isolated `session_id`, submitted evidence IDs, `context_status: captured`, and
  hashed submitted-context/result receipts (error receipt when no response).
  Measurements use `name: journey|usability`, `model_invoked: true`, completed/failed
  status, normalized provider plus exact `provider_id`/model, UTC times, byte counts
  and actual/null duration, tokens and cost. Failed calls are not automatically
  free. Result paths are unique and per-pair calls/observations stay ordered.
- `journeys`: exactly one per selected pair, including unexecuted pairs. Include
  `execution: {status, stop_reason, session_id, invocation_ids}` linking all calls
  in order. Each observed step links its own invocation and that call's evidence.
  Use separate persona contexts; do not share sessions or observations across
  personas. Receipts establish attribution, not proof of host isolation.
- Outcomes: completed → PASS with observed successful steps; failed → FAIL with an
  observed failing step; blocked/incomplete → FLAGGED; not-run → NOT_RUN with zero
  calls/steps. Always record why work stopped. Tool/provider errors alone are not
  product failures. Unobserved blocked/incomplete pairs have no invented steps.
- Optional `ac_results`: explicit `evaluated_by: journey` checks citing task-linked
  **verify** steps. Only UI criteria may PASS/FAIL from browser work. Each cited
  observation must support the verdict; mixed/partial checks are FLAGGED. Task
  completion alone leaves requirements NOT_RUN.
- Optional `proposed_actions`: proposed fixes linked to explicitly failed ACs and
  evidence, with `handoff.requires_user_invocation: true`. No edits run by default.

Keep task completion separate from requirement verification in chat and reports:
“Task completed” is not “Requirement verified”; “Uncertain—[reason]” is not failure.
Retain schema verdicts without collapsing the two results into one success claim.

Linked files use portable `checks/` or `evidence/` paths within the producer
directory and exact hashes. Retain sanitized visible context/results, not private
reasoning or credentials. Validation rejects scope drift, cross-pair evidence,
escaping paths, tampering and inconsistent outcomes. New work uses v2; never
collapse calls or invent measurements. Unknown bundle versions are rejected.

## Commands and Full's separate decision

Resolve the installed evaluator and its declared Node.js 18+ dependencies. Create
the output parent; each run path must be new.

```bash
node "$EVALUATOR_SKILL_DIR/scripts/run-split-evaluation.js" \
  --route walkthroughs --input packet.json --walkthrough-bundle bundle.json \
  --output artifacts/PROJ-123/prototype-evaluations/walkthrough-1

node "$EVALUATOR_SKILL_DIR/scripts/run-split-evaluation.js" \
  --route full --input packet.json --checks classify \
  --output artifacts/PROJ-123/prototype-evaluations/full-review-1
```

Full stops `awaiting-review` after Quick. Show findings/gaps, frozen cohort and
`artifact_sha256`; obtain a **separate human decision before walkthrough execution**.
Record `approval.json`: exact parent `run_id`/`artifact_sha256`, `approved: true`,
UTC `recorded_at` and `purpose: continue-walkthroughs`. New activity choices use a
complete permissions record. Reuse the frozen packet; earlier calls or completed
standalone runs cannot be spliced into this checkpoint.

```bash
node "$EVALUATOR_SKILL_DIR/scripts/run-split-evaluation.js" \
  --route full --continue-from artifacts/PROJ-123/prototype-evaluations/full-review-1 \
  --approval approval.json --walkthrough-bundle bundle.json \
  --output artifacts/PROJ-123/prototype-evaluations/full-1
```

Alternatively approve `purpose: complete-without-walkthroughs` and omit the bundle.
The parent stays immutable; the fresh child does not repeat Quick. Completion
records imported work, not universal success. Validate with
`node scripts/artifacts/validate-canonical-artifacts.js <run-dir> --json`.
Keep unknown usage and coverage gaps visible; fixes and HTML require separate
requests. Approved fixes allow one changed-build verification, then stop.
