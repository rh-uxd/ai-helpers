# uxd-prototype-evaluate

Evaluate a **running** prototype against Jira acceptance criteria with Playwright, optionally apply fixes, then run persona-based usability walkthroughs. Produces an HTML evidence report.

## Quick start

```bash
# One-time setup (from this skill directory)
cd "$(dirname "$0")"   # or use $CLAUDE_SKILL_DIR when invoked
npm install
npx playwright install chromium

# Optional context (personas + design consistency guidelines)
# Point these at your own git URLs — nothing is hardcoded.
export USABILITY_TESTING_REPO="git@example.com:org/usability-testing.git"
export CONSISTENCY_CHECKER_REPO="git@example.com:org/consistency-checker.git"
bash scripts/bootstrap-usability-testing.sh
bash scripts/bootstrap-consistency-checker.sh
```

Edit `config/product-overlay.yaml` for your product (Jira prefixes, repo URLs). Personas come from the plugin catalog at `plugins/uxd-workshop/knowledge/personas/` — not product overlays. Optional designer ground truth: copy `config/ground-truth.example.json` → `config/ground-truth.json`.

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
Self-contained HTML at `.artifacts/<KEY>/evaluation-report.html` plus CSV/JSON evidence artifacts.

## Flags

| Flag | Default | Description |
|------|---------|-------------|
| `--workspace=PATH` | — | Prototype repo (enables code fixes) |
| `--max-iterations=N` | 3 | Max Phase A fix-loop iterations |
| `--no-iterate` | Off | Single Phase A pass, no loop |
| `--no-fix` | Off | Evaluate only — do not apply fixes |
| `--reset` | Off | Hard-reset workspace to origin branch HEAD before eval |
| `--fresh` | Off | Delete `.artifacts/<KEY>/` before starting |

## Outputs

| File | Description |
|------|-------------|
| `.artifacts/<KEY>/evaluation-report.html` | HTML report |
| `.artifacts/<KEY>/evaluation-report.csv` | AC verdicts + usability scores |
| `.artifacts/<KEY>/journey-log.json` | Playwright steps + screenshots metadata |
| `.artifacts/<KEY>/refinement-suggestions.json` | Suggested fixes |
| `.artifacts/<KEY>/iteration-log.json` | Per-iteration pass/fail counts |

## Pass / fail for downstream skills

- **Phase A pass for publish:** zero `FAIL` verdicts in `evaluation-report.csv` Section 1 (FLAGGED is OK — needs human review).
- `uxd-prototype-create` refinement and `uxd-prototype-publish` read these artifacts (not the old rubric `reviews/summary.md`).

## Optional Google Sheet sync

Set `tracking.sheet_id` in `config/product-overlay.yaml` (or `EVAL_SHEET_ID`). Leave empty to disable. Requires `gcloud auth login --enable-gdrive-access`.

## Phase procedures

Orchestration is in `SKILL.md`. Detailed phase instructions:

| Reference | Role |
|-----------|------|
| `references/phases/eval-extract.md` | Jira context, ACs, MR delta |
| `references/phases/eval-classify.md` | AC tier classification |
| `references/phases/eval-journey.md` | Phase A Playwright (x-ray) |
| `references/phases/eval-fix.md` | Apply refinement suggestions |
| `references/phases/eval-consistency.md` | PatternFly guideline checks |
| `references/phases/eval-hint.md` | Navigation hints for personas |
| `references/phases/eval-usability.md` | Phase B persona walkthroughs |
| `references/phases/eval-report.md` | Render HTML report |
| `references/phases/eval-review.md` | Conversational review of results |
