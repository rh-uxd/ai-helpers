# uxd-prototype-evaluate

Selected prototype checks and canonical evidence, coordinated by the
[uxd-evaluator agent](../../agents/uxd-evaluator.md). The agent recommends the
smallest useful workflow or a direct handoff to another skill; it does not force
creation, standalone consistency or generalist design reviews through evaluation.

## Routes

Default: **no-fix**. Review findings first; applying selected fixes requires a
separate request and approval, followed by at most one verification pass.

- **Quick Checks:** only selected classification, source consistency or bounded
  heuristic/visual inspections. No implicit personas, edits or reporting.
- **Agentic Walkthroughs:** independently callable through the sibling
  `uxd-prototype-walkthrough` skill, for exact approved task/persona pairs.
- **Full Evaluation:** selected Quick checks, an immutable review checkpoint, then
  separately approved continuation. Fixes require their own decision and one
  post-fix verification pass.
- **Existing findings:** inspect validated canonical JSON and receipts without
  rerunning checks or changing source requirements.

See [SKILL.md](SKILL.md), [onboarding](references/workflow/evaluator-onboarding.md), and the
[execution contract](references/workflow/split-evaluation.md) for inputs and commands.

## Conditional setup

Local merging/validation requires Node.js >= 18 and the declared Node dependencies.
Install dependencies from this skill directory only after setup approval:

```bash
npm install
```

Classification and existing-result review need no browser or Jira connection.
Reviewed written requirements are supported alongside Jira input. Source consistency
requires Python 3 and a separately installed `uxd-consistency-check` companion;
its implementation is maintained separately. A missing selected companion blocks
that check, not unrelated routes.

Browser/model inspections use the host's authorized tools and actual input/result
receipts. Install browser tooling only when the selected work needs it. No automatic
clones, context bootstrap, broad permission allowlists or provider calls are part
of onboarding. JSON permission records cannot grant human consent.

## Results

Fresh project-owned runs under `artifacts/<KEY>/evaluation/<run-name>/` contain
`pe-context.json`, `pe-evaluation-snapshot.json`, `pe-evidence.json`,
`pe-actions.json` and `pe-state.json`, plus hashed input/evidence/result receipts.
Use `scripts/artifacts/validate-canonical-artifacts.js` to validate them. Reports are opt-in:
`scripts/run-report.js` renders derived canonical HTML; it does not publish.
Never overwrite a prior run. Each JSON starts with `created_at` and `updated_at`.

## Authored evaluations

Agent and walkthrough `eval/eval.yaml` definitions and case prompts are reviewable
plugin source. This skill's evaluator preparation suite also lives under `eval/`.
These fixtures are not proof of actual model/host acceptance until separately run
and reviewed. Automated developer tests remain local and are not runtime inputs.

Prototype edits, exports and publishing use their respective skills with their own
scope and approval gates; an evaluation recommendation authorizes none of them.
