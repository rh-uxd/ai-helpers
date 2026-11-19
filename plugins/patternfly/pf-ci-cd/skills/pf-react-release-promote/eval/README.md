# Release promotion evaluations

These eight offline cases exercise release-specific decisions without a target checkout, credentials, network tools, or publishing commands. They cover independent versions, stale tags, unexpected graduation scope, ignored CSS inputs, already-published releases, partial publication, branch movement, and next-cycle approval/collisions.

The agent evaluation uses the repository's agent-eval-harness setup with `eval.yaml`. It permits only reading skill resources and explicitly denies shell, editing, network, and MCP tools. Do not relax those permissions or connect a production release checkout to run these cases.

The deterministic judges check concepts and forbidden claims in the response. They are smoke checks, not proof that an agent never attempted a remote write; review execution traces and denied-tool events as well. They do not replace human release approval or a sandboxed integration test.

## Local structural checks

Requires Python 3 and PyYAML (also required by the repository's eval linter). From the repository root, run in a virtual environment with PyYAML installed:

```bash
make validate
python scripts/lint-evals.py plugins/patternfly/pf-ci-cd/skills/pf-react-release-promote/eval/eval.yaml
```

Structural checks do not run an AI agent. Keep the skill at draft maturity until agent evaluations and team review are complete.
