# eval-report

Phase 4 of the eval pipeline. Renders the final HTML report from JSON/CSV artifacts produced by earlier phases.

## Inputs

| Input | Description | Required |
|-------|-------------|----------|
| `.artifacts/<KEY>/evaluation-report.csv` | AC verdicts (Section 1) + usability dimensions (Section 2) | Yes |
| `.artifacts/<KEY>/journey-log.json` | Playwright step log with screenshots and usability overlays | Yes |
| `.artifacts/<KEY>/screenshots/` | Journey step screenshots (embedded as base64) | Yes |
| `.artifacts/<KEY>/consistency-report.json` | PatternFly design violations | No |
| `.artifacts/<KEY>/outcome-context.json` | Parent Outcome ticket context for breadcrumb | No |
| `.artifacts/<KEY>/extract-state.json` | Breadcrumb, persona selection (for report header) | Yes |
| `.artifacts/<KEY>/iteration-log.json` | Cross-iteration pass/fail counts (if iterating) | No |
| `--note` | Description string for the run log entry | No |

## Outputs

| File | Description |
|------|-------------|
| `.artifacts/<KEY>/evaluation-report.html` | Self-contained HTML report with embedded screenshots |
| `.artifacts/runs/run-log.csv` | Appended run entry for cross-run tracking |

## Procedure

### Step 1: Verify artifacts exist

Before rendering, confirm the minimum required files are present:

```bash
KEY="<jira-key>"
ARTIFACTS_DIR=".artifacts/$KEY"

# Required
test -f "$ARTIFACTS_DIR/evaluation-report.csv" || { echo "ERROR: evaluation-report.csv missing"; exit 1; }
test -f "$ARTIFACTS_DIR/journey-log.json" || { echo "ERROR: journey-log.json missing"; exit 1; }
test -f "$ARTIFACTS_DIR/extract-state.json" || { echo "ERROR: extract-state.json missing"; exit 1; }
```

If any required file is missing, stop and report which file is absent. The upstream phase that produces it likely failed.

### Step 1b: Validate journey-log.json format (BLOCKING)

Before rendering, validate that journey-log.json matches the schema render-report.js expects. Run:

```bash
node -e "
const jl = JSON.parse(require('fs').readFileSync('$ARTIFACTS_DIR/journey-log.json','utf8'));
const errors = [];
if (!jl.journeys || !jl.journeys.length) errors.push('No journeys in journey-log.json');
for (const j of (jl.journeys || [])) {
  if (!j.id || !j.id.match(/^journey-\d+$/)) errors.push('Bad journey id: ' + j.id + ' (must be journey-N)');
  if (j.steps_completed === undefined) errors.push(j.id + ' missing steps_completed');
  if (j.steps_expected === undefined) errors.push(j.id + ' missing steps_expected');
  if (!j.source) errors.push(j.id + ' missing source field');
  for (const s of (j.steps || [])) {
    if (!s.step) errors.push(j.id + ' has step without step number');
    if (!s.result || !['success','fail'].includes(s.result)) errors.push(j.id + ' step ' + (s.step||'?') + ' bad result: ' + s.result);
    if (!s.screenshot) errors.push(j.id + ' step ' + (s.step||'?') + ' missing screenshot');
    if (!s.narration) errors.push(j.id + ' step ' + (s.step||'?') + ' missing narration');
  }
}
// Usability dimensions MUST be present (Personas tab is empty without this)
if (!jl.usability_dimensions) errors.push('CRITICAL: usability_dimensions key missing from journey-log.json — Personas tab will be empty');
const ud = jl.usability_dimensions;
if (ud) {
  if (!ud.persona_selection) errors.push('usability_dimensions.persona_selection missing');
  if (!ud.dimensions || ud.dimensions.length !== 7) errors.push('usability_dimensions.dimensions must have exactly 7 entries (got ' + (ud.dimensions||[]).length + ')');
  if (!ud.persona_overlays || !ud.persona_overlays.length) errors.push('usability_dimensions.persona_overlays is empty — no patience data for modals');
  if (!ud.overall_score) errors.push('usability_dimensions.overall_score missing');
  const validIds = ['workflow_continuity','cross_persona_handoffs','scalability_complexity','system_status','technical_abstraction','mental_model_fidelity','accessibility_inclusion'];
  for (const d of (ud.dimensions || [])) {
    if (!d.id) errors.push('Dimension missing id field');
    else if (!validIds.includes(d.id)) errors.push('Non-standard dimension id: ' + d.id);
    if (!d.scores) errors.push('Dimension ' + (d.id||'?') + ' missing scores object');
  }
}
if (errors.length) { console.error('FORMAT ERRORS (' + errors.length + '):\n' + errors.join('\n')); process.exit(1); }
console.log('journey-log.json format validated: ' + jl.journeys.length + ' journeys, all fields present');
"
```

If validation fails, the journey-log must be fixed before rendering. The format errors will tell you exactly which fields are missing.

**Note on persona-results.json:** Trace step objects may include an optional `evidence_for_acs: string[]` field containing AC IDs for which that step provides observable evidence. This field is accepted but not required — when absent, the report renderer falls back to task-level `covers_acs` for step highlighting.

### Step 2: Render the HTML report

```bash
node ${CLAUDE_SKILL_DIR}/scripts/render-report.js .artifacts/$KEY/
```

This script:
- Reads all JSON/CSV artifacts from the directory
- Embeds screenshots as base64 into the HTML (reads from `screenshots/` directory, matches paths in journey-log steps)
- Applies the template from `templates/evaluation-report.html`
- Writes the output to `.artifacts/<KEY>/evaluation-report.html`

### Step 3: Log the run

```bash
node ${CLAUDE_SKILL_DIR}/scripts/log-run.js .artifacts/$KEY/ --note="<note>"
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

For local browsing with the Prototype Bar: keep the export helper running so Eval can open `http://127.0.0.1:9417/evals/<KEY>/`:

```bash
node "${EXPORT_SKILL}/scripts/export-helper.mjs" --out ".artifacts/$KEY/exports"
```
