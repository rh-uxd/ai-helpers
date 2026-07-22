---
name: uxd-prototype-evaluate
description: >-
  Evaluate a running prototype against Jira acceptance criteria with Playwright
  (x-ray AC validation + optional fix loop), then run persona-based usability
  walkthroughs and produce an HTML evidence report. Use when validating a
  prototype against a ticket, running usability walkthroughs, or generating an
  evaluation evidence report.
---

# Evaluate Prototype

Two-phase eval pipeline. Phase A (x-ray) validates acceptance criteria with full code access, optionally fixing until ACs pass. Phase B (discovery) runs per-persona Playwright walkthroughs to score usability. Produces a self-contained HTML report with screenshots, think-aloud traces, and AC verdicts.

Phase procedures live in `${CLAUDE_SKILL_DIR}/references/phases/` — read and follow each file when the orchestrator says to execute that phase. Do not skip phases unless a flag explicitly disables them.

**Full orchestration** (loop, exit conditions, state, notify): read and follow [`references/orchestration.md`](references/orchestration.md).

## Prerequisites

From the skill directory (or using `${CLAUDE_SKILL_DIR}`):

```bash
cd "${CLAUDE_SKILL_DIR}"
npm install
npx playwright install chromium

# Optional — personas + PatternFly consistency guidelines (VPN may be required)
bash "${CLAUDE_SKILL_DIR}/scripts/bootstrap-usability-testing.sh"
bash "${CLAUDE_SKILL_DIR}/scripts/bootstrap-consistency-checker.sh"
```

**Personas:** Phase B must use the plugin catalog at `${CLAUDE_PLUGIN_ROOT}/knowledge/personas/catalog.yaml` (role IDs, display names, audience map) and overlays at `${CLAUDE_PLUGIN_ROOT}/knowledge/personas/overlays/catalog.yaml` (experience, accessibility, regulation, team size). Optional deep behavioral YAML still comes from `.context/usability-testing/` when bootstrapped.

**Consistency:** `.context/consistency-checker/` when bootstrapped.

Edit `${CLAUDE_SKILL_DIR}/config/product-overlay.yaml` for product-specific Jira/repo settings.

## Usage

```
/uxd-prototype-evaluate PROJ-298 http://localhost:3000 --workspace=/path/to/prototype
/uxd-prototype-evaluate PROJ-298 http://localhost:4200 --max-iterations=2
/uxd-prototype-evaluate review PROJ-298
```

## Inputs

| Input | Example | Required | Default |
|-------|---------|----------|---------|
| Jira story key | `PROJ-298` | Yes | — |
| Prototype URL | `http://localhost:3000` | Yes | — |
| `--workspace` | Path to prototype repo | No | — |
| `--max-iterations` | Number | No | 3 |
| `--depth` | `deep` | No | `deep` |
| `--usability` | `deep` | No | `deep` |
| `--no-iterate` | flag | No | Off |
| `--no-fix` | flag | No | Off |
| `--reset` | flag | No | Off (evaluate current state; when set, hard-resets workspace to origin branch HEAD before eval) |
| `--fresh` | flag | No | Off (when set, deletes .artifacts/<KEY>/ before starting for a clean-slate run) |

## Pipeline Flow (Two-Phase)

```
PHASE A (X-Ray — Informed AC Validation Loop):
  eval-extract (--phase=core) → eval-consistency (--mode=source) → eval-classify → eval-journey (informed)
                                                                                     ↓
                                                                             Exit condition met? → Phase B (ALWAYS)
                                                                             FAIL + cycle ≤ max → eval-fix → loop from eval-classify

  Exit conditions (any triggers Phase B):
    all_pass          — 0 FAIL, 0 FLAGGED (clean pass)
    flagged_unfixable — 0 FAIL, FLAGGED items unfixable (pass with caveats)
    max_iterations    — still has FAILs after N loops (best-effort)
    regression        — fix loop broke a previously-passing AC (degraded)
    no_fix/no_iterate — user flag or single-run mode

POST-PHASE-A (deferred context gathering):
  eval-consistency (--mode=visual) — screenshots now exist
  eval-extract (--phase=enrichment) — Outcome, tasks_to_be_done, breadcrumb
  eval-hint — navigation hints for discovery personas (reflects post-fix workspace state)

PHASE B (Discovery — Per-Persona Usability Walkthroughs) — ALWAYS FIRES:
  eval-usability (per-persona Playwright, think-aloud, 7-dimension scoring) → eval-report
  Note: Phase B runs on whatever prototype state exists after Phase A exits.
  When exit_reason != all_pass, usability scores may reflect missing features.
```

## Goal Condition

**Phase A exits when:** zero FAIL verdicts in evaluation-report.csv Section 1, OR max iterations reached.

**Phase B fires:** always. Runs once on the final prototype state.

FLAGGED items are acceptable (they need human review). The Phase A loop only targets FAILs.

## Orchestration

When running a full eval, read `${CLAUDE_SKILL_DIR}/references/orchestration.md` and execute it end-to-end. That file owns:

- Fresh/reset/workspace capture and static vs HMR rebuild detection
- Phase A setup, AC fix loop, selective rerun, and regression detection
- Post-Phase-A visual consistency + enrichment + hints
- Phase B usability walkthroughs (must launch real Playwright per persona)
- Report generation, chat summary, and leaderboard rebuild
- `iteration-log.json` shape and console summary format

Do not improvise the loop from this overview alone — follow the orchestration file.

## Outputs

| File | Description |
|------|-------------|
| `.artifacts/<KEY>/evaluation-report.html` | Final HTML report (both phases) |
| `.artifacts/<KEY>/evaluation-report.csv` | Final AC verdicts + usability dimensions |
| `.artifacts/<KEY>/iteration-log.json` | Per-iteration counts + Phase B usability |
| `.artifacts/<KEY>/evaluation-report-iter-N.csv` | Archived CSV per Phase A iteration |
| `.artifacts/<KEY>/screenshots-iter-N/` | Archived screenshots per Phase A iteration |
| `.artifacts/<KEY>/screenshots/persona-<id>-step-N.png` | Phase B per-persona screenshots |
| `.artifacts/<KEY>/usability-thinkaloud-<id>.md` | Phase B think-aloud traces |
| `.artifacts/<KEY>/prototype-bar.json` | Updated after report (Sources + `views.eval` for Prototype Bar) |
| `.artifacts/<KEY>/report-url.txt` | Hosted eval URL after `publish-report.sh` |

After rendering the report, sync the Prototype Bar (merges `outcome-context.json` into Sources). See `references/phases/eval-report.md` Step 5. Local Eval browsing: run `uxd-prototype-export`’s `export-helper.mjs` so the bar can open `/evals/<KEY>/` on port 9417. For static Pages, copy with `copy-eval-for-pages.sh` or `publish-report.sh` (`public/evals/<KEY>/`).

## Error Handling

- **Prototype URL unreachable:** Wait 10s, retry once. If still down, stop with error.
- **eval-fix produces no changes:** Stop Phase A — more iterations won't help. Proceed to Phase B.
- **Dev server crashes after fix:** Stop Phase A, note which files may have caused it. Proceed to Phase B.
- **Missing .context/ directories:** Phase A runs without consistency. Phase B skipped if usability-testing missing.

## Review Mode

When the user asks to review prior results (`/uxd-prototype-evaluate review <KEY>` or conversational "show me the eval for …"):

Read `${CLAUDE_SKILL_DIR}/references/phases/eval-review.md` and follow that procedure. Do not re-run Playwright unless the user asks to re-run.
