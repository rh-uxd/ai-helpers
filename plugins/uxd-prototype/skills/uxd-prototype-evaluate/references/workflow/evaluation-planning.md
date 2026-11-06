# Reviewed evaluation plans and changes

The evaluator owns the plan; producers perform only selected work. Prepare a
concise public plan before new execution, using the user's existing decisions
and frozen context rather than restarting intake. Record questions and rationale,
not private model reasoning. Plans do not grant consent or prove execution.

## Plan v1

Supply `--plan plan.json` to the split runner. The file uses
`schemas/v1/evaluation-plan.schema.json`:

- `schema_version: 1`, `goal`, exact `packet_sha256`, actual UTC `reviewed_at`.
- `questions`: unique `{id, text}` entries describing the decision to inform.
- `allowed_checks`: the reviewed adaptation envelope, not checks claimed executed.
- `limits`: `max_model_invocations`, `max_cost_usd` (numbers or explicit null), and
  nonempty `stop_conditions`. Explain uncertainty during review; null is not zero
  cost or proof of unlimited consent. Limits apply to recorded lineage spend.
- Ordered `steps`: unique `id`/`check`, `question_ids`, public `rationale`, expected
  evidence descriptions and `depends_on` earlier step IDs. Select only work that
  answers a question. An independent walkthrough plan contains only walkthroughs.
  Full may plan walkthroughs, but cannot execute them before the separate review.

The bundled adapters support classification, source inspection, host model
inspections, then walkthroughs. Heuristic/visual work may share an invocation
without declaring a dependency on each other. Explicit dependent steps need
separate, preceding execution receipts. To sequence differently, use distinct
parent-linked runs; do not claim the local merger schedules browser/model work.

Quick selection comes from plan steps unless `--checks` is explicitly supplied;
then its selection/order must agree. Unselected allowed checks do not run. The
host checks prerequisites/dependencies and remaining limits before actual calls,
and stops or asks when a condition is reached. Arbitrary stop-condition prose is
reviewed host guidance, not executable policy. Local validation cannot undo spend.

The runner preserves exact plan bytes in `inputs/evaluation-plan.json`, the typed
plan in `brief.intent.evaluation_plan`, and separate `state.planning` execution:

- Actual phase indexes and evidence links per step; completed/failed/blocked/
  incomplete/not-run states. Check execution completion is not an AC verdict.
- `own_usage` for this run's new calls and `prior_usage`/`lineage_usage` for parent
  spend without counting inherited Quick phases twice. A shared call counts once,
  even when two steps cite it. Failed calls still count. Unknown total cost stays
  null; `known_cost_usd` is only the known subtotal/lower bound, never a full bill.
- `budget_status`: `within-known`, `unknown`, or `exceeded`. Known subtotal alone
  can establish an excess even if total cost is unknown. Preserve actual over-limit
  receipts rather than deleting calls or inventing cheaper measurements. Stop and
  review an excess; a completed import does not authorize further activity.

For findings-free inspections, evidence links can be empty; execution still links
the canonical phase and its producer receipts. No artifact answers a question
merely because a step was planned. Synthesis of answers remains separate work.

## Unchanged Full continuation

Use the existing parent/digest-bound review decision and `--continue-from`. The
runner reuses the exact frozen plan automatically, just like the packet. It does
not repeat Quick or intake. A byte-identical `--plan` is optional; changed bytes
fail closed. Changed check selections and ignored Quick/source arguments are
rejected, not silently treated as executed. Finishing without walkthroughs leaves
that planned step not-run. A planned verification preserves questions/limits/steps
and supplies a fresh plan bound to the approved changed-build packet.

## Adaptation: a fresh, explicit child

When findings justify a change, record a new plan and `change.json` containing
public `reason`, UTC `recorded_at`, and explicit `allow_rerun` (true only when a
previously selected check is intentionally being repeated). Invoke:

```bash
node "$EVALUATOR_SKILL_DIR/scripts/run-split-evaluation.js" \
  --route full --adapt-from runs/reviewed-parent --input packet.json \
  --plan adapted-plan.json --plan-change change.json --output runs/adapted-1
```

Within the same goal, exact packet, allowed checks, limits and stops, the evaluator
may adapt without another scope-expansion prompt. The fresh child records the
reason, parent/digest and actual new execution. It does **not** splice or copy
prior findings/evidence as new results. Keep parent results linked for review.
Choose only needed new checks; a repeat requires the explicit rerun record.

Changing goal, source/build/task/persona scope (packet bytes), enlarging allowed
checks, raising/removing a numeric cap or removing a stop condition requires a new
human decision. Supply `--approval approval.json` with parent `run_id`, canonical
`artifact_sha256`, `approved: true`, UTC `recorded_at`,
`purpose: expand-evaluation`, exact new `plan_sha256` and `packet_sha256`.
Approving the parent alone cannot approve a substituted plan or packet.

An exceeded budget requires approved budget expansion before further work. When
prior cost is unknown and a numeric cost limit applies, review that uncertainty
before additional model work; a separate parent/plan/packet-bound
`purpose: continue-unknown-usage` decision may record consent without turning cost
into a known value. New call timestamps cannot predate the applicable plan/change/
review decision. Receipts remain host assertions, not independent billing proof.
For unchanged Full continuation with unknown prior cost and a numeric cost cap,
the `continue-walkthroughs` approval additionally records
`accept_unknown_usage: true` and the exact plan/packet hashes. An exceeded parent
cannot continue unchanged; finish without walkthroughs or review an adapted plan
with sufficient limits.
Planned post-fix verification uses the same uncertainty acknowledgment with its
fresh plan/packet hashes; it cannot expand the original plan or its limits.
Usage covers attributed producer calls only, not uninstrumented host-session work,
browser-tool billing or invoices. Do not claim measured savings from these counters.

Adapted Full runs pause at a **new** awaiting-review checkpoint. They cannot
inherit permission to cross its walkthrough stage; a standalone adaptation cannot
bypass an awaiting Full checkpoint. Preserve all original runs and evidence.

## Compatibility

Canonical envelope version stays 1; plan/state extensions are optional and the
plan format is explicitly versioned. Legacy runs remain readable and unchanged
continuations need no invented retrospective plan. New planned runs use this
contract. Adapting a legacy run needs a reviewed plan and explicit expansion
approval because no earlier envelope was recorded. Unplanned runs may persist
optional `state.usage_attribution` to distinguish own phases from inherited
usage. Historical children without it retain unknown ownership and totals. A
planned child fails closed when its parent's lineage cannot be attributed; not
all historical children can be adapted safely. Older strict readers may reject
the extensions; use the matching validator, not a lossy down-conversion.
