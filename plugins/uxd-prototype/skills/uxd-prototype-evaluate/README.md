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

Context repos (`.context/consistency-checker/` and `.context/usability-testing/`) bootstrap on first pipeline run when a git URL is set:

```bash
export USABILITY_TESTING_REPO="git@example.com:org/usability-testing.git"
export CONSISTENCY_CHECKER_REPO="git@example.com:org/consistency-checker.git"
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
