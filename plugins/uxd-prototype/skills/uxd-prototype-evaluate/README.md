# uxd-prototype-evaluate

Evaluate a running prototype against a Jira ticket's acceptance criteria, optionally fix failures, then run persona usability walkthroughs. Writes an HTML evidence report.

**Contract (inputs, outputs, flags, two-phase flow, artifact paths):** [SKILL.md](SKILL.md)

## Prerequisites

| Requirement | How to get it | Required? |
|-------------|---------------|-----------|
| Node.js >= 18 | `brew install node` or `nvm install 18` | Yes |
| Python 3 | `brew install python3` | Yes |
| Atlassian MCP | Configure in your IDE | Yes (for live Jira) |
| Playwright Chromium | `npm install` then `npx playwright install chromium` in the skill dir (marketplace install does not run `postinstall`) | Yes |

```bash
bash scripts/preflight-check.sh
```

```bash
cd plugins/uxd-prototype/skills/uxd-prototype-evaluate
npm install
npx playwright install chromium
```

Consistency uses the `uxd-consistency-check` sibling shipped in this same `uxd-prototype` plugin distribution. No separate checker repository or clone/bootstrap is needed. The analyzer stays offline and runs only explicitly selected product guidance; no bundled design-system audit is used. `bootstrap-consistency-checker.sh` checks that the bundled sibling is present; it does not install or clone anything. Set `UXD_CONSISTENCY_CHECKER_DIR` only for a deliberately separate checker installation; it must be an absolute skill-directory path and never falls back to another checker. For designer-facing summaries, follow the checker's [report template](../uxd-consistency-check/references/designer-report-template.md).

Usability context (`.context/usability-testing/`) still bootstraps on first pipeline run when a git URL is set:

```bash
export USABILITY_TESTING_REPO="git@example.com:org/usability-testing.git"
```

Product-specific remotes, MLflow, and Pages URLs come from the `uxd-eval-config` plugin (internal marketplace). Personas: `plugins/uxd-prototype/knowledge/personas/`. Overlay details: `references/skill-overlays.md`.

## Quick start

```
/uxd-prototype-evaluate PROJ-298 http://localhost:3000 --workspace=/path/to/prototype
/uxd-prototype-evaluate review PROJ-298
```

## Optional Google Sheet sync

Set `tracking.sheet_id` in `config/product-overlay.yaml` (or `EVAL_SHEET_ID`). Leave empty to disable. Requires `gcloud auth login --enable-gdrive-access`.

## Validators

| Script | Purpose |
|--------|---------|
| `scripts/validate-phase-b-output.js` | Phase B persona output schemas and score contracts |
| `scripts/validate-artifact-schemas.js` | Schema validation for pipeline artifacts |
| `scripts/validate-report-rendering.js` | Report rendering quality checks |

Run the existing offline validator fixtures:

```bash
bash tests/run-script-tests.sh
```

### Consume confirmed product guidance

Follow [the consistency phase](references/phases/eval-consistency.md) and the
sibling checker's selection flow first; discovery or `approved` policy status
never supplies user consent. This entrypoint consumes a confirmed staging
receipt, not an index or an unconfirmed proposal:

```bash
python3 -S "$EVALUATOR_SKILL_DIR/scripts/run-consistency-selection.py" \
  --workspace "$WORKSPACE" --staging-receipt "$STAGING_RECEIPT" \
  --artifacts-dir "$ARTIFACTS_DIR"
node "$EVALUATOR_SKILL_DIR/scripts/validate-consistency.js" "$ARTIFACTS_DIR" --json
node "$EVALUATOR_SKILL_DIR/scripts/render-report.js" "$ARTIFACTS_DIR"
```

Handle exit `1` as findings, `2` as a blocking error (do not reuse an older
report as a current success). The selected narrow analysis root is preserved;
only product guidelines run. `consistency-selection.json` keeps manual evidence
and unknown currentness separate from deterministic coverage. The HTML links
to consumer-local frozen artifacts; preserve that artifact tree when browsing.
These relative links are not a standalone HTML publication bundle. Remote
acquisition/model review still require their own permissions and available
tools. Existing explicit local input and frozen-manifest replay paths remain
supported; see the phase guide for cleanup/replay limits.

## Claude Code permissions

The eval pipeline shells out to bundled Node/bash scripts and Playwright. To auto-approve them, add to the project's `.claude/settings.json` (or `~/.claude/settings.json`):

```json
{
  "permissions": {
    "allow": [
      "Bash(node:*validate-artifact-schemas*)",
      "Bash(node:*validate-phase-b-output*)",
      "Bash(node:*validate-report-rendering*)",
      "Bash(node:*render-report*)",
      "Bash(node:*render-mini-report*)",
      "Bash(node:*classify-ac-tier*)",
      "Bash(node:*compute-patience-drain*)",
      "Bash(node:*generate-journey-script*)",
      "Bash(node:*validate-verdicts*)",
      "Bash(node:*hydrate-persona-results*)",
      "Bash(node:*resolve-root*)",
      "Bash(node:*append-iteration-log*)",
      "Bash(node:*build-leaderboard*)",
      "Bash(node:*generate-dashboard*)",
      "Bash(node:*log-run*)",
      "Bash(bash:*pipeline-setup*)",
      "Bash(bash:*publish-report*)",
      "Bash(bash:*bootstrap-usability-testing*)",
      "Bash(bash:*bootstrap-consistency-checker*)",
      "Bash(npx:playwright*)",
      "Bash(npm:install*)",
      "Bash(python3:*eval_state*)"
    ]
  }
}
```

Contributors in this repo get these via `.claude/settings.json` (accepted once via the workspace trust dialog).

## Phase procedures

Orchestration: `SKILL.md` and `references/orchestration.md`. Per-phase files live in `references/phases/`. Ignore `references/draft-phase-a-cli-workflow.md` — not implemented.

## Related

- `uxd-prototype-create` — builds the prototype; refine from eval findings
- `uxd-prototype-export` — Prototype Bar Eval tab and `export-helper.mjs`
- `uxd-prototype-publish` — blocked by AC FAIL unless `--force`
