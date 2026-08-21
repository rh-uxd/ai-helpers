# uxd-prototype-evaluate

Evaluate a running prototype against a Jira ticket's acceptance criteria, automatically fix what fails, then run persona-based usability walkthroughs. Produces an HTML evidence report with screenshots, scores, and findings.

## Prerequisites

| Requirement | How to get it | Required? |
|-------------|---------------|-----------|
| Node.js >= 18 | `brew install node` or `nvm install 18` | Yes |
| Python 3 | `brew install python3` | Yes |
| Atlassian MCP | Configure in your IDE (Cursor/Claude Code) | Yes |
| Playwright | Auto-installs on first run | Auto |

Run the preflight check to verify:

```bash
bash scripts/preflight-check.sh
```

## Quick start

```bash
# One-time setup (from this skill directory)
cd "$(dirname "$0")"   # or use $CLAUDE_SKILL_DIR when invoked
npm install
npx playwright install chromium
```

Context repos (`.context/consistency-checker/` and `.context/usability-testing/`) are bootstrapped automatically on first pipeline run when a git URL is set. Point these at your own remotes — nothing is hardcoded:

```bash
export USABILITY_TESTING_REPO="git@example.com:org/usability-testing.git"
export CONSISTENCY_CHECKER_REPO="git@example.com:org/consistency-checker.git"
```

UXD/RHOAI internals (CEE remotes, MLflow, Pages) come from the `uxd-eval-config` plugin in the internal marketplace; `overlay-get.js` auto-discovers that overlay when the clone or plugin is present.

Edit `config/product-overlay.yaml` only as a generic template. Personas come from the plugin catalog at `plugins/uxd-workshop/knowledge/personas/` — not product overlays. Internal study URLs for those personas live in internal-ai-helpers `uxd-eval-config/knowledge/personas/` and are auto-discovered the same way as the overlay. Optional designer ground truth: copy `config/ground-truth.example.json` → `config/ground-truth.json`.

Start the prototype locally, then:

```
/uxd-prototype-evaluate PROJ-298 http://localhost:3000 --workspace=/path/to/prototype
```

Review a previous run:

```
/uxd-prototype-evaluate review PROJ-298
```

## What it does

**Phase A — AC validation (x-ray)**  
Verifies each acceptance criterion from the Jira ticket using Playwright with full source access. Failed criteria can enter a fix loop (`eval-fix`) up to `--max-iterations` (default 3). Use `--no-fix` for findings-only.

**Phase B — Usability (discovery)**  
Per-persona Playwright walkthroughs with think-aloud traces and 7-dimension scoring. Always runs after Phase A exits.

**Report**  
Self-contained HTML at `.artifacts/<KEY>/eval/evaluation-report.html` plus CSV/JSON evidence under that `eval/` folder. With `--no-report`, a lightweight mini-report is rendered in chat instead (verdict badge, AC stats, screenshot gallery) — the full report can be generated later from cached artifacts.

## Flags

| Flag | Default | Description |
|------|---------|-------------|
| `--workspace=PATH` | — | Prototype repo (enables code fixes) |
| `--max-iterations=N` | 3 | Max Phase A fix-loop iterations |
| `--no-iterate` | Off | Single Phase A pass, no loop |
| `--no-fix` | Off | Evaluate only — do not apply fixes |
| `--reset` | Off | Hard-reset workspace to origin branch HEAD before eval |
| `--fresh` | Off | Delete `.artifacts/<KEY>/eval/` only before starting (never the key root, never `.artifacts/eval/`) |
| `--no-report` | Off | Skip HTML report; print compact summary in chat instead. Run `review` mode later to generate full report from cached artifacts |

## Outputs

| File | Description |
|------|-------------|
| `.artifacts/<KEY>/eval/evaluation-report.html` | HTML report |
| `.artifacts/<KEY>/eval/evaluation-report.csv` | AC verdicts + usability scores |
| `.artifacts/<KEY>/eval/evaluation-summary.json` | Agent-readable summary (verdicts, scores, counts) |
| `.artifacts/<KEY>/eval/journey-log.json` | Playwright steps + screenshots metadata |
| `.artifacts/<KEY>/eval/consistency-report.json` | PatternFly design consistency findings |
| `.artifacts/<KEY>/eval/persona-results.json` | Per-persona usability scores and traces |
| `.artifacts/<KEY>/eval/refinement-suggestions.json` | Suggested fixes |
| `.artifacts/<KEY>/eval/iteration-log.json` | Per-iteration pass/fail counts |
| `.artifacts/eval/runs/run-log.csv` | Cross-key run log |
| `.artifacts/<KEY>/eval/mini-report.html` | Lightweight report (rendered with `--no-report`) |
| `.artifacts/eval/pain-leaderboard.html` | Aggregate pain leaderboard |

## Pass / fail for downstream skills

- **Phase A pass for publish:** zero `FAIL` verdicts in `evaluation-report.csv` Section 1 (FLAGGED is OK — needs human review).
- `uxd-prototype-create` refinement and `uxd-prototype-publish` read these artifacts (not the old rubric `reviews/summary.md`).

## Optional Google Sheet sync

Set `tracking.sheet_id` in `config/product-overlay.yaml` (or `EVAL_SHEET_ID`). Leave empty to disable. Requires `gcloud auth login --enable-gdrive-access`.

## Validators

Scripts that check pipeline output quality:

| Script | Purpose |
|--------|---------|
| `scripts/validate-phase-b-output.js` | Validates Phase B persona discovery output schemas and score contracts |
| `scripts/validate-artifact-schemas.js` | Schema validation for all pipeline artifact files |
| `scripts/validate-report-rendering.js` | Report rendering quality checks (screenshot selection, persona names, fix history, score contract) |

## Claude Code permissions

The eval pipeline shells out to bundled Node/bash scripts and Playwright. By default, Claude Code prompts for approval on each invocation. To auto-approve these scripts, add the following to your project's `.claude/settings.json` (or user-level `~/.claude/settings.json`):

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

Contributors working inside the `ai-helpers` repo get these permissions automatically via the repo's `.claude/settings.json` (accepted once via the workspace trust dialog).

## What's next

After evaluation completes, the report is at `.artifacts/<KEY>/eval/evaluation-report.html`.

| Result | Next step |
|--------|-----------|
| All ACs pass, usability acceptable | `/uxd-prototype-publish` — push to MR or Pages |
| Minor issues (FLAGGED items) | Review the report, decide per-item, then publish |
| Major failures or low usability | `/uxd-prototype-create` with eval findings as context |
| Re-run after changes | `/uxd-prototype-evaluate <KEY> <URL>` again |

## Phase procedures

Orchestration is in `SKILL.md` and `references/orchestration.md`. Detailed phase instructions:

| Reference | Role |
|-----------|------|
| `references/phases/eval-extract.md` | Jira context, ACs, MR delta |
| `references/phases/eval-classify.md` | AC tier classification |
| `references/phases/eval-consistency.md` | PatternFly guideline checks |
| `references/phases/eval-journey.md` | Phase A Playwright (x-ray) |
| `references/phases/eval-fix.md` | Apply refinement suggestions |
| `references/phases/eval-hint.md` | Navigation hints for personas |
| `references/phases/eval-usability.md` | Phase B persona walkthroughs |
| `references/phases/eval-report.md` | Render HTML report |
| `references/phases/eval-review.md` | Conversational review of results |
