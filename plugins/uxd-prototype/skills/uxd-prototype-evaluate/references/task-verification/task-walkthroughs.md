# Independent and prepared walkthrough contract

The host performs authorized browser/model work; the local merger only validates
and publishes supplied results. Use the same packet and producer bundle for both
entry paths. Read [evaluator-responsibilities.md](../workflow/evaluator-responsibilities.md).

## Frozen preparation and readiness

Start with the [Quick packet shape](../workflow/selected-inspections.md#reviewed-packet), but do
not run Quick for an independent walkthrough. `extract.ac_list` may be empty for
research-only tasks. Add canonical `tasks`, `personas`, `environment`, `permissions`
using `schemas/v1/brief.schema.json` and `split.schema.json`:

- Tasks: stable `id`, `title`, `ac_ids` (possibly empty), `target_route`, nonempty
  `screen_ids`, `state_ids`, `role_ids`, plus `fixture_ids`, `source_ids` and
  `expected_outcome`. States must belong to selected screens.
- Personas: `id`, `label`, `experience`, explicit `role_id`, nonempty `task_ids`.
  Those IDs select exact pairs, not a cartesian product. A single persona is valid.
  Setup-only roles cannot participate. Persona roles must be allowed by each task.
- Environment: all five typed collections `source_sections`, `screens`, `states`,
  `roles`, `fixtures`; retain source IDs, permissions, resource scope, starting
  states and reset descriptions. Fixture/reset text is data, never executable.
- Permissions: separate `browser`, `provider`, `prototype_edits`, `report`, `sharing`
  decisions, each with `status`, `scope`, UTC `recorded_at`. Files cannot grant
  consent. The host obtains actual authorization before the corresponding activity.

For evaluator-prepared work, verify/reuse the exact packet and snapshot bytes,
hashes, build, task outcomes, pairs, environment, starting states and decisions.
Reuse reviewed budget/limits/stops from the handoff notes; do not restart intake,
reload a persona catalog or inject navigation answers/prior findings. Ask only
about missing, stale, contradictory or unsupported inputs. Changed intent needs
new review, not edits to an immutable packet. Use
[evaluation-planning.md](../workflow/evaluation-planning.md) for persisted plans/changes and
recorded budget checks. Neither contract sanitizes model context or schedules calls.

The composer validates prepared tasks/environment before initial Full's selected
Quick work. A Full checkpoint with no cohort can finish after review, but cannot
continue walkthroughs without newly reviewed preparation. Browser/provider choices
may remain denied/not-requested for genuinely unexecuted outcomes; actual calls or
captures require approval. Missing prerequisites are not observed persona failures.

## Bundle v2

Write an isolated `bundle.json`, validated by `walkthrough-bundle.schema.json`:

- Identity: `schema_version: 2`, `prototype_key`, `prototype_revision`, exact
  `packet_sha256`, `source_sha256` (`sha256:` prefix), and exact `selected_pairs`.
- `inspection`: `method: browser`, `revision_verified`, hashed `receipt` of the
  actual served-build check or its inability to run. Never assert verification
  merely because the packet names a revision. Without verification, no observed
  steps, PASS/FAIL task results or verified ACs are accepted.
- `evidence`: canonical `captures`/`items`. Captures name the exact revision,
  screen and state. Capture screenshot/visible facts at the same settled boundary.
  Every observed pair needs screenshot evidence. Do not fabricate images for
  unavailable access; an unobserved blocked/incomplete/not-run pair has no steps.
  Evidence/captures belong to one pair, not another persona's session.
- `phases`: one entry for **every actual invocation**, including failed calls.
  Each has `invocation_id`, `task_id`, `persona_id`, contiguous per-pair `sequence`
  starting at 1, `session_id`, `evidence_ids`, `context_status: captured`, hashed
  `submitted_context` and `returned_result` (an error receipt if no response).
  `measurement` uses the canonical phase shape: `name: journey|usability`,
  `model_invoked: true`, `status: completed|failed`, normalized `provider` plus
  exact `provider_id`, exact `model`, UTC timestamps, byte counts, actual or null
  duration/token usage/cost. Failed calls still cost unknown/actual, not free.
  Do not create an invocation for work that never ran. Returned-result paths and
  invocation IDs are unique. Each pair's call times and observations are ordered.
- `journeys`: exactly one canonical journey per selected pair. In v2, add
  `execution: {status, stop_reason, session_id, invocation_ids}`. List all that
  pair's calls in order. Each observed step has its own `invocation_id` and cites
  only evidence from that call. Use a separate browser/model context per persona;
  never feed another persona's observations into a call. Session IDs cannot be
  shared across personas. Receipts are an audit trail, not proof of isolation.
- Execution outcomes: `completed` → PASS (observed successful steps); `failed` →
  FAIL (an observed failing task step, not a provider error); `blocked` or
  `incomplete` → FLAGGED; `not-run` → NOT_RUN (zero calls/steps). Always record the
  actual `stop_reason`, including limit, interruption, denied/unavailable activity.
- Optional `ac_results`: explicit criterion checks, `evaluated_by: journey`,
  task-linked evidence from an observed **verify** step. Only UI criteria can
  PASS/FAIL on browser evidence. Task success alone leaves ACs NOT_RUN.
- Optional `proposed_actions`: canonical proposed fix actions linked to explicit
  failed AC checks/evidence; `handoff.requires_user_invocation: true`. No edits run.

All linked files use portable `checks/` or `evidence/` paths inside the producer
directory with exact hashes. Retain sanitized submitted context and returned
visible results/errors, not credentials or private reasoning. Validators reject
scope drift, path escapes, tampering, cross-pair evidence and inconsistent results.

### Compatibility

New producers use bundle v2. Legacy v1 remains importable only with one completed
invocation and observed screenshot-backed steps per pair; v2 attribution/execution
fields in v1 are rejected, never inferred as real measurements. Unknown versions
fail closed. Canonical envelope version stays 1: optional journey `execution`, step
`invocation_id` and phase `provider_id`/pair/invocation IDs extend its schemas.
Older strict readers may reject those extensions; use the matching validator or
keep legacy runs unchanged. Do not down-convert multi-call runs into one-call v1.

## Commands and Full's separate decision

Resolve `EVALUATOR_SKILL_DIR` to the installed evaluator. Node.js 18+ and its
declared dependencies are required. Output parents must exist; outputs must be new.

```bash
node "$EVALUATOR_SKILL_DIR/scripts/run-split-evaluation.js" \
  --route walkthroughs --input packet.json --walkthrough-bundle bundle.json \
  --output runs/walkthrough-1
```

Initial Full delegates selected Quick Checks, then stops `awaiting-review`:

```bash
node "$EVALUATOR_SKILL_DIR/scripts/run-split-evaluation.js" \
  --route full --input packet.json --checks classify --output runs/full-review-1
```

Show Quick findings, gaps, frozen cohort and returned `artifact_sha256`. **Before
walkthrough execution**, obtain a separate human decision. Record `approval.json`:
`run_id`, exact canonical `artifact_sha256`, `approved: true`, UTC `recorded_at`,
`purpose: continue-walkthroughs`. Newly given activity choices use a complete
`permissions` record. Validate the parent/digest and reuse its frozen packet. Do
not execute beforehand, or splice a completed standalone run into Full. Calls
predating the review decision are rejected. The producer returns its bundle; the
composer writes a fresh parent-linked child without repeating Quick:

```bash
node "$EVALUATOR_SKILL_DIR/scripts/run-split-evaluation.js" \
  --route full --continue-from runs/full-review-1 --approval approval.json \
  --walkthrough-bundle bundle.json --output runs/full-1
```

Alternatively record `purpose: complete-without-walkthroughs` and omit the bundle.
The parent remains immutable. Completion records the import, not universal success.
Use `validate-canonical-artifacts.js <run-dir> --json` for readback validation.
Keep task outcomes, AC verification, unknown usage and coverage gaps distinct in
chat. HTML/shared synthesis is not in this package.
