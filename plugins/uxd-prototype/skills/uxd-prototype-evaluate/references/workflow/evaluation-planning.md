# Reviewed evaluation plans and changes

After presenting the plan and obtaining the relevant human decision, the host
`uxd-evaluator` writes `plan.json`. There is no plan-generator command: the split
runner validates/stores supplied JSON, not the designer's intent. Record public
questions and rationale, never private reasoning. A plan does not grant consent.

## Plan

Supply `--plan plan.json` using `schemas/v1/evaluation-plan.schema.json`:

- `schema_version: 1`, goal, exact packet hash and UTC `reviewed_at`.
- Unique questions `{id, text}` and reviewed `allowed_checks`.
- Limits: maximum invocations/cost (number or explicit null) and nonempty stop
  conditions. Unknown cost is not zero or unlimited consent; caps cover lineage.
- Ordered steps: unique ID/check, question IDs, public rationale, expected evidence
  and dependencies on earlier steps. Select only work that answers a question.
  Independent plans contain only walkthroughs; Full still requires its separate
  continuation decision before executing them.

Supported order is classification, source inspection, host model inspections,
then walkthroughs. Heuristic/visual work may share a call unless a dependency
requires preceding receipts. Other sequencing needs separate parent-linked runs.
Quick selection comes from plan steps; explicit `--checks` must match their order.
Allowed but unselected checks do not run. The host checks prerequisites and
remaining budget before calls; prose stop conditions are not executable policy.

The runner stores original bytes in `inputs/evaluation-plan.json`, typed intent
in `pe-context.json.intent.evaluation_plan`, and execution in `pe-state.json.planning`:

- Per-step status, phase indexes and evidence; completion is not an AC verdict.
- Own, prior and lineage usage without recounting inherited/shared calls. Failed
  calls count; unknown total cost stays null. Known cost is only a subtotal.
- `budget_status: within-known|unknown|exceeded`. A known subtotal can establish
  excess. Preserve actual over-limit receipts, stop and review; import completion
  does not authorize further activity. Counters exclude host sessions and invoices.

Findings-free inspections may have no evidence links, but must retain execution
receipts. Planned questions do not become answered merely because a check ran.

## Unchanged Full continuation

Use the parent/digest-bound decision with `--continue-from`. The runner reuses the
stored approved plan and packet without repeating Quick/intake. A supplied plan
must match the stored hash; changing it requires the adaptation route and review
where scope expands. Changed selections or ignored Quick/source arguments fail.
Completing without walkthroughs leaves that step not-run.

Post-fix verification keeps the questions, limits and steps but needs a freshly
reviewed plan bound to the changed-build packet. Only one verification is allowed.

## Adaptation: a fresh child

Write the updated plan and `change.json` with public reason, UTC time and explicit
`allow_rerun` (true only for an intentional repeat):

```bash
node "$EVALUATOR_SKILL_DIR/scripts/run-split-evaluation.js" \
  --route full --adapt-from artifacts/PROJ-123/evaluation/reviewed-parent \
  --input packet.json --plan adapted-plan.json --plan-change change.json \
  --output artifacts/PROJ-123/evaluation/adapted-1
```

Within the same goal, exact packet, allowed checks, limits and stops, adaptation
may proceed without a scope-expansion prompt. It records reason, parent/digest and
new execution; prior observations are not copied as new findings. Repeats require
the rerun record. Preserve original runs/evidence for review.

Changing goal/packet, enlarging allowed checks, raising/removing a numeric cap or
removing a stop condition needs new human approval: parent `run_id` and canonical
`artifact_sha256`, `approved: true`, UTC time, `purpose: expand-evaluation`, and
exact new plan/packet hashes. Parent approval alone cannot authorize substitutes.
An exceeded budget requires approved expansion sufficient for known lineage spend.

Unknown prior cost with a numeric cap needs explicit review before more model work.
Adaptation can use a hash-bound `continue-unknown-usage` or expansion decision.
Unchanged Full continuation uses `continue-walkthroughs` plus
`accept_unknown_usage: true` and exact plan/packet hashes. Planned verification
needs the same acknowledgment for its fresh hashes, without expanding limits.
New invocation times cannot predate the applicable plan/change/approval.

Adapted Full creates a new awaiting-review checkpoint; old approval cannot cross
it, and standalone adaptation cannot bypass an awaiting Full checkpoint.

## Missing planning or usage

Do not invent retrospective plans or attribute unknown parent work to the child.
Adapting an unplanned parent needs reviewed planning and expansion approval. A
planned child requires attributable parent spend; unplanned children retain
`state.usage_attribution` with own/prior/lineage usage and honest unknowns.
