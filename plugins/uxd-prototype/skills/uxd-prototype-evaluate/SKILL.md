---
name: uxd-prototype-evaluate
version: 0.2.1
description: >-
  Run selected Quick Checks or composed Full Evaluation from Jira or reviewed
  written requirements, with canonical evidence, explicit checkpoints and optional reports.
  Use for source-linked prototype verification and review of existing findings.
inputs: Reviewed requirements, exact prototype revision, and selected checks
outputs: Canonical evidence and findings, with an optional HTML report
---

# Evaluate Prototype

Default: **no-fix** (findings only). `--no-fix` makes this explicit; it does not
disable selected checks or walkthroughs. Proposed actions never authorize edits.
Apply fixes only after a separate request/approval, then verify once and stop.

Conversational routing, planning, readiness, review checkpoints, synthesis and
cross-skill handoffs follow the
[responsibility contract](references/workflow/evaluator-responsibilities.md), including
its ownership and execution limits. This skill executes only the selected work.
If the host selects `uxd-evaluator`, follow its [subagent instructions](subagents/eval-assist.md).
Otherwise, use the [intake guide](references/workflow/evaluator-onboarding.md).
Apply the same review and approval rules in both cases.

## Choose only the needed work

Prefer a direct skill for standalone creation, consistency or research reviews,
PatternFly guidance, exports or publishing. These requests follow the destination's
own intake and are not evaluator checks. The agent passes known context without
requiring an evaluator packet or canonical run. A handoff is not permission to execute.

Use this skill when the designer needs source/AC-linked results, combined checks
with canonical evidence/history, a composed review checkpoint, or review and
verification of an existing evaluator run:

- **Quick Checks:** selected classification, source consistency or visual
  consistency only. New heuristic work is not supported in evaluator plans; reject
  it rather than adding a check or invoking a research profile. Follow
  [selected inspections](references/workflow/selected-inspections.md). No implicit
  personas or fixes.
- **Agentic Walkthroughs:** use the independently callable sibling
  `uxd-prototype-walkthrough` skill for the exact approved task/persona pairs.
  A selected single persona is valid.
- **Full Evaluation:** run selected Quick Checks, save an awaiting-review
   checkpoint, then wait for the designer's decision before selected walkthroughs.
   Pass prepared context to `uxd-prototype-walkthrough` and consume its producer
   bundle through Full continuation; do not splice a completed standalone run.
  Fixes require separate authorization and allow one post-fix verification pass.
- **Existing results:** discover validated canonical JSON and linked receipts.
  Recommend reviewing applicable findings or selected missing work; do not rerun,
  import old evidence, edit requirements or publish implicitly.

## Inputs and prerequisites

Use the reviewed packet described by the
[shared execution contract](references/workflow/split-evaluation.md): source snapshot and
stable source IDs, exact prototype revision, selected check scope, and only the
route-relevant environment/tasks/personas. Jira is not required when reviewed
written requirements are supplied. For Jira links, follow
[Jira source retrieval](references/workflow/evaluator-onboarding.md#resolve-jira-input):
use an available authenticated Atlassian connector first, and ask before opening
Jira in a browser.

- Browser/model work belongs to the host. Verify its served revision, settled
  captures, submitted context and actual result receipts, plus the designer's
  relevant browser/provider approval. Do not bootstrap tools or invent evidence.
- New Quick plans accept only `classify`, `consistency-source`, and
  `consistency-visual`. Historical heuristic results may be reviewed read-only in
  existing runs; they are not selectable for new work.

## Requirements

- Local CLI execution requires Node.js and the dependencies declared in
  `package.json`. Dependency installation is setup work requiring approval, not
  automatic intake. Before running the evaluator CLI, fail fast if Node.js is
  missing:

  ```bash
  command -v node >/dev/null 2>&1 || { echo "Error: This skill requires Node.js." >&2; exit 1; }
  ```

- Source consistency additionally requires Python 3 and the `uxd-consistency-check`
  sibling skill. For a separate trusted installation, set `UXD_CONSISTENCY_CHECKER_DIR`
  to its absolute skill directory. The runner does not clone or bootstrap code.
  When source consistency is selected, fail clearly if
  Python 3 is missing:

  ```bash
  command -v python3 >/dev/null 2>&1 || { echo "Error: Source consistency requires Python 3." >&2; exit 1; }
  ```

  If the companion is absent, explain the missing dependency and stop that check;
  other routes do not need it. Source policy is opt-in: neutral selects no corpus.
  Review explicit design-system, namespaced local guideline inputs or
  frozen-manifest replay through the
  [Quick contract](references/workflow/selected-inspections.md#explicit-source-policy-and-replay).
  Quick Checks imports deterministic source results. Semantic product-guideline
  findings stay in the checker's separate report; no peer audit is required.

## Execute the approved route

Run from the resolved evaluator skill directory, using consumer-owned absolute
input/output paths. New Quick runs may select only `classify`, `consistency-source`,
and `consistency-visual`. Save outputs under the project's
`artifacts/<KEY>/prototype-evaluations/<run-name>/`; create the output parent first
and choose a new run directory.
Dates live in the JSON fields, not the filenames:

```bash
node scripts/run-split-evaluation.js --route quick --input <reviewed-packet.json> --output <fresh-run-directory> --checks <selected-checks> [--report]
node scripts/run-split-evaluation.js --route full --input <reviewed-packet.json> --output <fresh-checkpoint-directory> --checks <selected-checks>
```

The execution contract defines the host-produced visual-consistency and walkthrough
bundles, continuation approvals, selected fix receipts and verification commands.
The local merger never invokes providers, launches browser sessions, edits the
prototype or grants consent. Visual consistency is one `consistency-visual` phase;
it is not shared with a specialist or hierarchy phase. Unknown usage stays `null`.

## Outputs and completion

Each run owns `pe-context.json`, `pe-evaluation-snapshot.json`, `pe-evidence.json`, `pe-actions.json`,
and `pe-state.json`, plus hashed `inputs/`, `checks/` and evidence receipts. These
are authoritative. Each JSON starts with UTC `created_at` and `updated_at`; completed
runs are immutable, so follow-up work writes a fresh run. See
[canonical-artifacts.md](references/artifacts/canonical-artifacts.md).

Present a decision-focused chat summary by default: goal, planned versus actual
coverage, prioritized evidence-linked findings, uncertainty and the next useful
decision. Keep task outcomes, AC verdicts, consistency and any historical
heuristic results distinct.
Chat and HTML derive from one deterministic structured synthesis:
`node scripts/run-report.js <run-directory> --chat` prints the chat synthesis,
`node scripts/run-report.js <run-directory> --json` renders the local HTML report,
and the split entrypoint's `--report` renders that HTML into a fresh run after
canonical publication. Rendering launches no model work and does not publish.
Keep all consumer artifacts outside the installed skill directory. Preserve old
run paths and evidence rather than clearing output trees or restoring a cache.

Before completion, validate the five canonical files and linked receipts. Account
for every selected check/task/persona as completed, blocked or skipped; preserve
NOT_RUN and unreviewed findings. Report source/build identity, evidence gaps and
actual/unknown measurements. Stop on missing dependencies, dirty/mismatched source,
stale approvals or invalid hashes instead of silently degrading coverage.

Explain any remaining host/model acceptance work. Local validation is not live user
research, proof of hosted delivery or measured cost savings.
