---
name: uxd-prototype-evaluate
version: 0.1.0
description: >-
  Run selected Quick Checks or composed Full Evaluation from Jira or reviewed
  written requirements, with canonical evidence, explicit checkpoints and optional reports.
  Use for source-linked prototype verification and review of existing findings.
---

# Evaluate Prototype

Default: **no-fix** (findings only). `--no-fix` makes this explicit; it does not
disable selected checks or walkthroughs. Proposed actions never authorize edits.
Apply fixes only after a separate request/approval, then verify once and stop.

Conversational routing, planning, readiness, review checkpoints, synthesis and
cross-skill handoffs follow the
[responsibility contract](references/workflow/evaluator-responsibilities.md), including
its ownership and execution limits. This skill executes only the selected work.

## Choose only the needed work

Prefer a direct skill for standalone creation, consistency reviews, generalist
heuristic inspection, PatternFly guidance, exports or publishing. The agent
explains the destination and passes known context without requiring an evaluator
packet or canonical run. A handoff is not permission to execute.

Use this skill when the designer needs source/AC-linked results, combined checks
with canonical evidence/history, a composed review checkpoint, or review and
verification of an existing evaluator run:

- **Quick Checks:** selected classification, source consistency, specialist
  heuristics or visual consistency. Follow [quick-checks.md](references/workflow/selected-inspections.md).
  No implicit personas or fixes.
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
written requirements are supplied.

- Local runtime requires Node.js and the dependencies declared in `package.json`.
  Dependency installation is setup work requiring approval, not automatic intake.
- Source consistency requires Python 3 and a separately installed
  `uxd-consistency-check` companion beside this skill. Its implementation is
  maintained separately. If that check is selected and the companion is absent,
  explain the missing dependency and stop that check; other routes do not need it.
  Source policy is opt-in: neutral selects no corpus. Review explicit design-system,
  namespaced local guideline inputs or frozen-manifest replay through the
  [Quick contract](references/workflow/selected-inspections.md#explicit-source-policy-and-replay).
  Internal source differences are review candidates, not normative violations.
- Browser/model work belongs to the host. Verify its served revision, settled
  captures, submitted context and actual result receipts, plus the designer's
  relevant browser/provider approval. Do not bootstrap tools or invent evidence.
- Heuristic Quick Checks requires the research skill's `prototype-specialists`
  profile (content, hierarchy, interaction). Standalone research reviews retain
  that skill's own generalist default and framework/researcher-review gates.

## Execute the approved route

Run from the resolved evaluator skill directory, using consumer-owned absolute
input/output paths. Save outputs under the project's
`artifacts/<KEY>/evaluation/<run-name>/`; each run directory must be new.
Dates live in the JSON fields, not the filenames:

```bash
node scripts/run-split-evaluation.js --route quick --input <reviewed-packet.json> --output <fresh-run-directory> --checks <selected-checks> [--report]
node scripts/run-split-evaluation.js --route full --input <reviewed-packet.json> --output <fresh-checkpoint-directory> --checks <selected-checks>
```

The execution contract defines host-produced judgment/walkthrough bundles,
continuation approvals, selected fix receipts and verification commands. The
local merger never invokes providers, launches browser sessions, edits the
prototype or grants consent. A shared hierarchy/visual invocation owns both
selected checks without counting its work twice; unknown usage stays `null`.

## Outputs and completion

Each run owns `pe-context.json`, `pe-evaluation-snapshot.json`, `pe-evidence.json`, `pe-actions.json`,
and `pe-state.json`, plus hashed `inputs/`, `checks/` and evidence receipts. These
are authoritative. Each JSON starts with UTC `created_at` and `updated_at`; completed
runs are immutable, so follow-up work writes a fresh run. See
[canonical-artifacts.md](references/artifacts/canonical-artifacts.md).

Present a decision-focused chat summary by default: goal, planned versus actual
coverage, prioritized evidence-linked findings, uncertainty and the next useful
decision. Keep task outcomes, AC verdicts, consistency and heuristics distinct.
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

Explain any remaining host/model acceptance work. Local contract tests are not
live user research, proof of hosted delivery or measured cost savings.
