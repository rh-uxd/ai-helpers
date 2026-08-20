# MLflow Conventions

Standards for MLflow experiment naming, run tagging, and metric logging
across all UXD prototype-evaluator subskills.

**Tracking server:** opt-in. Do not commit a cluster URL.

```bash
# From env, or from product-overlay.local.yaml / EVAL_OVERLAY_PATH
eval "$(make mlflow-env)"
# or
export MLFLOW_TRACKING_URI=http://127.0.0.1:5000
```

## Experiment Naming

Pattern: experiment name matches the skill name (eval.yaml `name` minus the
`-eval` suffix).

| Scope | Experiment name |
|-------|----------------|
| **Umbrella** (rollup across subskills) | `uxd-prototype-evaluate` |
| Subskill — AC classification | `eval-classify` |
| Subskill — Playwright journeys | `eval-journey` |
| Subskill — Usability walkthroughs | `eval-usability` |
| Subskill — Fix loop | `eval-fix` |
| Subskill — Consistency checker | `eval-consistency` |
| Subskill — Report rendering | `eval-report` |
| Standalone — Prototype creation | `uxd-prototype-create` |
| Standalone — Prototype publishing | `uxd-prototype-publish` |
| Standalone — Heuristic evaluation | `uxd-research-heuristic-eval` |

## Run ID Format

Every invocation gets a unique `eval_run_id`:

```
eval-{KEY}-{YYYYMMDD-HHMMSS}-{6hex}
```

Example: `eval-PROJ-298-20260805-143012-a3f1b2`

## Required Tags

### Every run (umbrella and subskill)

| Tag | Description | Example |
|-----|-------------|---------|
| `eval_run_id` | Unique invocation ID (format above) | `eval-PROJ-298-20260805-143012-a3f1b2` |
| `prototype_key` | Jira key | `PROJ-298` |
| `model` | Model slug used for the skill | `claude-opus-4-6` |
| `skill` | Subskill or skill name | `eval-journey` |
| `pipeline_version` | Git SHA of ai-helpers at run time | `fa9b250` |
| `team` | Owning team | `uxd` |
| `pipeline` | Pipeline identifier | `prototype-evaluator` |

### Per-subskill runs only

| Tag | Description | Example |
|-----|-------------|---------|
| `parent_eval_run_id` | Links subskill run to umbrella run | `eval-PROJ-298-20260805-143012-a3f1b2` |
| `phase` | Pipeline phase | `a` or `b` |

## Required Params

| Param | Description |
|-------|-------------|
| `prototype_key` | Jira key |
| `model` | Model slug |
| `skill` | Subskill name |
| `check_count` | Number of checks in this run |

## Required Metrics

### Per-subskill

| Metric | Type | Description |
|--------|------|-------------|
| `pass_count` | int | Checks that passed |
| `fail_count` | int | Checks that failed |
| `pass_rate` | float | `pass_count / check_count` |
| `all_pass` | float | `1.0` if zero failures, else `0.0` |

### Umbrella run

| Metric | Type | Description |
|--------|------|-------------|
| `total/pass_count` | int | Sum across subskills |
| `total/check_count` | int | Sum across subskills |
| `total/pass_rate` | float | `total/pass_count / total/check_count` |
| `total/all_pass` | float | `1.0` if all subskills pass |
| `{prefix}/pass_rate` | float | Per-subskill, e.g. `eval_classify/pass_rate` |
| `{prefix}/pass_count` | int | Per-subskill |
| `{prefix}/fail_count` | int | Per-subskill |

Prefix is the skill name with hyphens replaced by underscores
(e.g. `eval-classify` → `eval_classify`).

## Check-to-Subskill Routing

Checks from the validation scorers are routed to per-subskill experiments
using `config/mlflow-skill-map.json`. Each key is a check name (from
`validate-pipeline-output.js`, `validate-report-rendering.js`, or
`run-script-tests.sh`), and the value is the target experiment name.

Unmapped checks default to `eval-journey`.

## Per-Subskill Model Defaults

When `--model recommended-mix` is used (the default for standalone runs),
each subskill gets tagged with its defined production model from
`orchestration.md`:

| Subskill | Default model | Rationale |
|----------|--------------|-----------|
| eval-extract | `claude-sonnet-5` | Mechanical Jira parsing |
| eval-classify | `claude-sonnet-5` | Mechanical tier assignment |
| eval-journey | `claude-opus-4-6` | Playwright + verdict reasoning |
| eval-fix | `claude-opus-4-6` | Code changes need careful reasoning |
| eval-usability | `claude-opus-4-6` | Persona simulation needs nuance |
| eval-consistency | `claude-opus-4-6` | Precision matters for design audits |
| eval-report | `claude-sonnet-5` | Template rendering, no judgment |

When `--model <slug>` is set to a specific model, ALL subskills use that
model (useful for comparison runs on the same model).

## Invocation

### Makefile targets (recommended)

```bash
# Smoke test — run scorers for one prototype key
make mlflow-smoke KEY=PROJ-298

# All scorers
make mlflow-smoke-all KEY=PROJ-298

# With specific skills only
make mlflow-smoke KEY=PROJ-298 SKILLS="eval-report eval-usability"
```

### claude-trace (per-subskill comparison runs)

```bash
claude-trace --model claude-opus-4-6 \
  --experiment eval-journey \
  -p "/eval-journey PROJ-298 http://localhost:9204"
```

### Auto-trigger from pipeline

When `MLFLOW_TRACKING_URI` is set (or `mlflow.tracking_uri` is in
the product overlay), the pipeline auto-logs results after report generation.
See the post-pipeline step in `orchestration.md`.

## eval.yaml Configuration

Each skill's eval.yaml should include experiment metadata. Do **not** commit
a tracking URI — set `MLFLOW_TRACKING_URI` or overlay `mlflow.tracking_uri`:

```yaml
mlflow:
  experiment: <skill-name>
  tags:
    team: uxd
    pipeline: prototype-evaluator
```

The harness resolves tracking URI with precedence:
`MLFLOW_TRACKING_URI` env > overlay `mlflow.tracking_uri` > `eval.yaml mlflow.tracking_uri` > `http://127.0.0.1:5000` (local smoke only)
