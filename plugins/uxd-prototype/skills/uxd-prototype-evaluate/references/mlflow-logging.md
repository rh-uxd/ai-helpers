# MLflow Logging

Opt-in post-pipeline step. Runs when a tracking URI is configured via `MLFLOW_TRACKING_URI`, overlay `mlflow.tracking_uri`, or `mlflow.tracking_uri` in `eval.yaml`. Referenced from `orchestration.md` after the report step.

See `references/mlflow-conventions.md` for experiment naming, tagging standards, and per-subskill routing.

## Procedure

```bash
MLFLOW_URI="${MLFLOW_TRACKING_URI:-}"
if [ -z "$MLFLOW_URI" ]; then
  MLFLOW_URI=$(node ${CLAUDE_SKILL_DIR}/scripts/overlay-get.js mlflow.tracking_uri 2>/dev/null || true)
fi
if [ -z "$MLFLOW_URI" ]; then
  MLFLOW_URI=$(python3 -c "
import yaml, sys
try:
    cfg = yaml.safe_load(open('${CLAUDE_SKILL_DIR}/eval/eval.yaml'))
    print(cfg.get('mlflow', {}).get('tracking_uri', ''))
except: pass
" 2>/dev/null)
fi

if [ -n "$MLFLOW_URI" ]; then
  export MLFLOW_TRACKING_URI="$MLFLOW_URI"
  EVAL_RUN_ID="eval-${KEY}-$(date +%Y%m%d-%H%M%S)-$(head -c 3 /dev/urandom | xxd -p)"
  PIPELINE_VERSION=$(git -C "${UXD_PROJECT_ROOT}" rev-parse --short HEAD 2>/dev/null || echo "unknown")

  echo "Logging to MLflow: $MLFLOW_URI (run: $EVAL_RUN_ID)"

  # Run validation scorers
  node ${CLAUDE_SKILL_DIR}/scripts/validate-pipeline-output.js ${ARTIFACTS_DIR}/ > /tmp/mlflow-scorer-output.json 2>/dev/null || true
  node ${CLAUDE_SKILL_DIR}/tests/validate-report-rendering.js ${ARTIFACTS_DIR}/ >> /tmp/mlflow-scorer-output.json 2>/dev/null || true

  # Log results via eval-mlflow (routes checks to per-subskill experiments)
  /eval-mlflow --action log-results --run-id ${EVAL_RUN_ID} --config ${CLAUDE_SKILL_DIR}/eval/eval.yaml
else
  echo "MLflow tracking not configured — skipping. Set MLFLOW_TRACKING_URI or overlay mlflow.tracking_uri"
fi
```

## What gets logged

The `/eval-mlflow` skill reads `config/mlflow-skill-map.json` to route checks to per-subskill experiments. Each experiment gets:

- **Metrics:** pass/fail counts, usability scores, consistency violations
- **Parameters:** KEY, pipeline version, model used, iteration count
- **Tags:** exit_reason, phase completion status
- **Artifacts:** evaluation-report.csv, journey-log.json (if configured)

## When to skip

MLflow logging is skipped automatically when:
- No `MLFLOW_TRACKING_URI` is set AND overlay / `eval.yaml` have no `mlflow.tracking_uri`
- The pipeline exited early (no artifacts to log)
- `--no-report` was set (scorer output may be incomplete)
