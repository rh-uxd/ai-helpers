# eval-report

Renders the final HTML report from JSON/CSV artifacts produced by earlier phases.

## Inputs

| Input | Description | Required |
|-------|-------------|----------|
| `.artifacts/<KEY>/eval/evaluation-report.csv` | AC verdicts (Section 1) + usability dimensions (Section 2) | Yes |
| `.artifacts/<KEY>/eval/journey-log.json` | Playwright step log with screenshots and usability overlays | Yes |
| `.artifacts/<KEY>/eval/screenshots/` | Journey step screenshots (embedded as base64) | Yes |
| `.artifacts/<KEY>/eval/consistency-report.json` | PatternFly design violations | No |
| `.artifacts/<KEY>/eval/outcome-context.json` | Parent Outcome ticket context for breadcrumb | No |
| `.artifacts/<KEY>/eval/extract-state.json` | Breadcrumb, persona selection (for report header) | Yes |
| `.artifacts/<KEY>/eval/iteration-log.json` | Cross-iteration pass/fail counts (if iterating) | No |
| `--note` | Description string for the run log entry | No |

## Outputs

| File | Description |
|------|-------------|
| `.artifacts/<KEY>/eval/evaluation-report.html` | Self-contained HTML report with embedded screenshots |
| `.artifacts/<KEY>/eval/evaluation-summary.json` | Agent-readable summary: AC verdicts, usability scores, counts, iteration state |
| `.artifacts/eval/runs/run-log.csv` | Appended run entry for cross-run tracking |

## Procedure

### Step 1: Verify artifacts exist

Before rendering, confirm the minimum required files are present:

```bash
KEY="<jira-key>"
# Prefer the pinned absolute dir from orchestration; fall back to project-root relative
ARTIFACTS_DIR="${ARTIFACTS_DIR:-${UXD_PROJECT_ROOT:-.}/.artifacts/$KEY/eval}"

# Required
test -f "$ARTIFACTS_DIR/evaluation-report.csv" || { echo "ERROR: evaluation-report.csv missing"; exit 1; }
test -f "$ARTIFACTS_DIR/journey-log.json" || { echo "ERROR: journey-log.json missing"; exit 1; }
test -f "$ARTIFACTS_DIR/extract-state.json" || { echo "ERROR: extract-state.json missing"; exit 1; }
```

If any required file is missing, stop and report which file is absent. The upstream phase that produces it likely failed.

### Step 1b: Validate artifact schemas (BLOCKING)

Before rendering, validate all artifact JSON files against the schemas render-report.js expects:

```bash
node ${CLAUDE_SKILL_DIR}/scripts/validate-artifact-schemas.js $ARTIFACTS_DIR/
```

If any violations are found, fix them before proceeding. The script prints specific fix instructions for each violation.

**Note:** `render-report.js` also auto-normalizes common schema drift (absolute screenshot paths, missing step counts, dimension ID aliases, flat dimension scores) via `normalizeJourneyLog` and `normalizeUsabilityDimensions`. But the validation script catches issues normalization can't fix.

### Step 2: Render the HTML report

```bash
node ${CLAUDE_SKILL_DIR}/scripts/render-report.js .artifacts/$KEY/eval/
```

This script:
- Reads all JSON/CSV artifacts from the directory
- Embeds screenshots as base64 into the HTML (reads from `screenshots/` directory, matches paths in journey-log steps)
- Applies the template from `templates/evaluation-report.html`
- Writes the output to `.artifacts/<KEY>/eval/evaluation-report.html`
- Also writes `evaluation-summary.json` alongside the HTML report — an agent-readable summary with AC verdicts, usability scores, counts, and iteration state.

### Step 3: Log the run

```bash
node ${CLAUDE_SKILL_DIR}/scripts/log-run.js .artifacts/$KEY/eval/ --note="<note>"
```

If `--note` was not provided, use a default: `"Evaluation run"`. On iterations, use `"Iteration <N>"`.

### Step 4: Confirm output

Verify the HTML file was written:

```bash
test -f "$ARTIFACTS_DIR/evaluation-report.html" && echo "Report generated: $ARTIFACTS_DIR/evaluation-report.html"
```

Report the file path and size to the caller.

### Step 5: Sync Prototype Bar config

Merge outcome / strat keys from `outcome-context.json` into `.artifacts/<KEY>/prototype-bar.json` so the live prototype's Sources dropdown and Eval switch stay current:

```bash
EXPORT_SKILL="${CLAUDE_SKILL_DIR}/../uxd-prototype-export"
node "${EXPORT_SKILL}/scripts/sync-prototype-bar-config.mjs" \
  --artifacts ".artifacts/$KEY"
```

If `report-url.txt` already exists (after publish-report), the sync script picks up that URL for `views.eval`. Otherwise it sets the conventional relative path `/evals/<KEY>/`.

For local browsing with the Prototype Bar **Eval** tab: the export helper is required on SPA/webpack prototypes. Relative `views.eval` (`/evals/<KEY>/`) only works after Pages publish (or `copy-eval-for-pages.sh`); without the helper, Eval must not silently land on the app shell.

Start (or keep) the helper so Eval opens `http://127.0.0.1:9417/evals/<KEY>/` from `${ARTIFACTS_DIR}` (or the key-root fallback if a legacy run left the report there):

```bash
node "${EXPORT_SKILL}/scripts/export-helper.mjs" \
  --out ".artifacts/$KEY/exports" \
  --artifacts ".artifacts"
```

Tell the user the Eval URL once the report exists. If they already have the prototype open, refresh after the helper is up, then click **Eval**.

When the prototype is a workspace app with a `public/` folder (webpack/Vite), also copy the report for same-origin `/evals/<KEY>/` so Eval works even if the helper is down:

```bash
# WORKSPACE = path passed via --workspace (or .artifacts/<KEY>/workspace|code|prototype)
if [[ -d "$WORKSPACE/public" ]]; then
  bash "${EXPORT_SKILL}/scripts/copy-eval-for-pages.sh" \
    --artifacts "$KEY_DIR" \
    --pages-root "$WORKSPACE/public"
fi
```

`render-report.js` and `copy-eval-for-pages.sh` embed the standalone Prototype Bar into the report HTML so Eval pages keep the same Prototype|Eval chrome. The helper also injects on serve. After opening Eval, **Prototype** returns via `views.prototype` (or the stashed return URL from the page you left).
