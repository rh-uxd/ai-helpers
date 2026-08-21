---
name: uxd-prototype-evaluate
description: >-
  Evaluate a running prototype against a Jira ticket's acceptance criteria,
  automatically fix what fails, then run persona-based usability walkthroughs.
  Produces an HTML evidence report with screenshots, scores, and findings.
  Use when you want to validate a prototype, check usability, or generate
  evidence for an MR review.
---

# Evaluate Prototype

Two-phase eval pipeline. Phase A (x-ray) validates acceptance criteria with full code access, optionally fixing until ACs pass. Phase B (discovery) runs per-persona Playwright walkthroughs to score usability. Produces a self-contained HTML report with screenshots, think-aloud traces, and AC verdicts.

## Workflow

```
/uxd-prototype-create  →  /uxd-prototype-evaluate  →  /uxd-prototype-publish
   Build prototype          Validate ACs + usability      Push to MR / Pages
```

Each skill reads the previous skill's artifacts from `.artifacts/<KEY>/`. You can re-run evaluate after making changes.

Phase procedures live in `${CLAUDE_SKILL_DIR}/references/phases/` — read and follow each file when the orchestrator says to execute that phase. Do not skip phases unless a flag explicitly disables them.

**Full orchestration** (loop, exit conditions, state, notify): read and follow [`references/orchestration.md`](references/orchestration.md).

## Artifact location (CRITICAL)

All **eval** runtime outputs live under the **consumer project** at `.artifacts/<KEY>/eval/` — never under `${CLAUDE_SKILL_DIR}`, and never mixed into the key root used by create/publish.

`${CLAUDE_SKILL_DIR}` is the skill install (plugin cache or `plugins/…/uxd-prototype-evaluate`). Writing `.artifacts/` there pollutes the skill.

**Layout:**

```text
.artifacts/<KEY>/                 # create / publish key root (decisions, code, prototype-bar, …)
  eval/                           # ARTIFACTS_DIR — all per-key eval outputs
.artifacts/eval/                  # cross-key eval namespace (run-log, pain-leaderboard)
```

**Path pinning** is handled by `scripts/pipeline-setup.sh` and `references/orchestration.md`. The canonical setup runs once at pipeline start and produces these environment variables:

```
UXD_PROJECT_ROOT  — consumer project root (never the skill install, never a nested clone)
KEY_DIR           — ${UXD_PROJECT_ROOT}/.artifacts/<KEY>
ARTIFACTS_DIR     — ${KEY_DIR}/eval (all per-key eval outputs)
```

**Rules:**

1. Use `${ARTIFACTS_DIR}/…` (absolute) for every eval read/write. Do not use bare relative `.artifacts/<KEY>/eval/…` after any `cd`.
2. `cd "${CLAUDE_SKILL_DIR}"` is allowed only for `npm install` / Playwright browser install. Return to `${UXD_PROJECT_ROOT}` before writing artifacts or generating scripts.
3. `cd` into the prototype `.artifacts/<KEY>/code` clone is fine for git/build; eval artifact paths stay absolute under `${ARTIFACTS_DIR}`.
4. Generated Playwright scripts go in `${ARTIFACTS_DIR}/scripts/` (`journey-test.mjs`, `persona-walkthrough.mjs`) — not the skill root, not the project root.
5. `--fresh` deletes only the pinned `${ARTIFACTS_DIR}` (`.artifacts/<KEY>/eval/`). Never delete the key root, never `.artifacts/eval/`, never `rm -rf .artifacts/…` relative to an unknown cwd.
6. Create-owned siblings (`decisions/`, `prototype-bar.json`, …) stay at `${KEY_DIR}`. Sync Prototype Bar with `--artifacts ${KEY_DIR}`, not `${ARTIFACTS_DIR}`.
7. Node helpers resolve paths via `scripts/resolve-root.js` (honors `UXD_PROJECT_ROOT`). Prefer passing absolute `${ARTIFACTS_DIR}` into those scripts.

BAD: `cd .artifacts/<KEY>/code && echo "result" > eval/report.csv` — relative write after `cd` lands in the wrong directory.

**`--fresh` rebuttals:**

| Excuse | Why it's wrong |
|---|---|
| "I'll just `rm -rf .artifacts`" | Deletes cross-key run-log and leaderboard. Other evals lose history. |
| "I'll delete the key root" | Wipes create-owned artifacts (decisions, prototype-bar). Publish breaks. |

In phase docs, `.artifacts/<KEY>/eval/…` means `${UXD_PROJECT_ROOT}/.artifacts/<KEY>/eval/…` — always resolve against the pinned project root. Create inputs at `.artifacts/<KEY>/…` (no `eval/`) stay at the key root.

## Prerequisites

Install Playwright deps from the skill directory, then return to the project root:

```bash
# Remember project root BEFORE leaving it.
# resolve-root.js handles non-git dirs, nested clones, and skill-install exclusion.
export UXD_PROJECT_ROOT="$(node -e "console.log(require('${CLAUDE_SKILL_DIR}/scripts/resolve-root').resolveProjectRoot())" 2>/dev/null || git rev-parse --show-toplevel 2>/dev/null || pwd)"

cd "${CLAUDE_SKILL_DIR}"
npm install
npx playwright install chromium
cd "${UXD_PROJECT_ROOT}"
```

Context repos (`.context/consistency-checker/` and `.context/usability-testing/`) are **bootstrapped automatically** on first pipeline run via `pipeline-setup.sh` when a git URL is configured (`CONSISTENCY_CHECKER_REPO` / `USABILITY_TESTING_REPO`, or `context_repos` in the product overlay). If unset, those phases degrade (PF token-check fallback / bundled persona catalog).

**Personas:** Phase B must use the plugin catalog at `${CLAUDE_PLUGIN_ROOT}/knowledge/personas/catalog.yaml` (role IDs, display names, audience map) and overlays at `${CLAUDE_PLUGIN_ROOT}/knowledge/personas/overlays/catalog.yaml` (experience, accessibility, regulation, team size). Deep behavioral YAML comes from `.context/usability-testing/` (cloned automatically by the bootstrap script). Internal research citations (study URLs) are **not** on the public cards — load them from internal-ai-helpers `uxd-eval-config` when present (`node ${CLAUDE_SKILL_DIR}/scripts/overlay-get.js --knowledge-persona <id>`). Skip if empty.

**Consistency:** `.context/consistency-checker/` (cloned automatically by the bootstrap script).

Product-specific Jira, git, MLflow, and context-repo settings come from the overlay (generic template in this skill; UXD/RHOAI values auto-discovered from internal-ai-helpers `uxd-eval-config`). Optional overrides: gitignored `product-overlay.local.yaml` or `EVAL_OVERLAY_PATH`. See `references/skill-overlays.md`.

**Claude Code permissions (first run only):** The eval pipeline shells out to ~20 bundled Node/bash scripts and Playwright. Without auto-approve, Claude Code will prompt for each one. Ask the user:

> This eval pipeline runs many scripts (Playwright, validators, report rendering). Would you like me to add auto-approve permissions to your project's `.claude/settings.local.json` so you won't be prompted for each script?

If yes, read the permissions list from the README's "Claude Code permissions" section and write them to `.claude/settings.local.json` (creating the file if needed). This is a one-time setup per project clone. If the user declines, proceed — each script will prompt individually.

## Usage

```
/uxd-prototype-evaluate PROJ-298 http://localhost:3000 --workspace=/path/to/prototype
/uxd-prototype-evaluate PROJ-298 http://localhost:4200 --max-iterations=2
/uxd-prototype-evaluate PROJ-298 https://pages.example.com/mr-42/ https://gitlab.example.com/group/repo/-/merge_requests/42
/uxd-prototype-evaluate review PROJ-298
```

## Inputs

| Input | Example | Required | Default |
|-------|---------|----------|---------|
| Jira story key | `PROJ-298` | Yes | — |
| Prototype URL | `http://localhost:3000` or `https://pages.example.com/mr-42/` | Conditional | — |
| MR URL | `https://gitlab.example.com/group/repo/-/merge_requests/42` | No | — |
| `--workspace` | Path to prototype repo | No | — |
| `--max-iterations` | Number | No | 3 |
| `--no-iterate` | flag | No | Off |
| `--no-fix` | flag | No | Off |
| `--reset` | flag | No | Off (evaluate current state; when set, hard-resets workspace to origin branch HEAD before eval) |
| `--fresh` | flag | No | Off (when set, deletes `.artifacts/<KEY>/eval/` only — never the key root, never `.artifacts/eval/`) |
| `--no-report` | flag | No | Off (skips HTML report; prints compact summary in chat instead — run `/uxd-prototype-evaluate review <KEY>` later to generate the full report from cached artifacts) |

**Prototype URL resolution:** The pipeline handles three source types automatically:

| Source type | Example | Behavior |
|-------------|---------|----------|
| Remote (hosted Pages / preview URL) | `https://pages.example.com/mr-42/` | Probed with curl; used directly if reachable (2xx/3xx) |
| Local SPA (React/Angular) | `http://localhost:3000` or auto-started | If URL unreachable + workspace has `dist/index.html` with SPA indicators, starts `sirv --single` |
| Local static | `http://localhost:3000` or auto-started | If URL unreachable + workspace has `dist/index.html` without SPA indicators, starts `sirv` |

<!-- Future: HTML prototype from uxd-prototype-create
| Standalone HTML | (auto-detected) | Single HTML file from prototype-create; served with sirv from workspace root |
When prototype-create integration is finalized, add detection for .html at workspace root without dist/. -->

**Requirement:** Either a reachable URL OR `--workspace` pointing to a repo with a built `dist/` directory. If neither is available, the pipeline fails with a clear error at setup.

**Remote-only advisory (BLOCKING):** When the user provides only a hosted prototype URL with no `--workspace` and no MR URL, PAUSE and warn before proceeding:

> No source code path or MR link provided. Without source access:
> - No fix loop (can't patch code)
> - No source-mode consistency checks
> - No component-map for data-testid selectors
> - Heuristic click-through navigation only
>
> Provide `--workspace` or an MR URL for the full evaluation.
> Proceed with remote-only? [y/N]

Only proceed after user confirms. This prevents silent degradation.

The resolved URL is written to `eval-state.yaml` as `prototype_url` and exported as `PROTOTYPE_URL` for Playwright scripts. It may differ from the user-provided URL when local fallback activates.

**Hybrid source mode:** When an MR URL is provided alongside a remote prototype URL, `pipeline-setup.sh` clones the MR source into `.artifacts/<KEY>/code/` and sets `source_available=true` in `eval-state.yaml`. This gives the pipeline read-only access to router configs, component files, and `data-testid` attributes for informed navigation — even though Playwright navigates via the remote URL. The clone is not built or served; it provides route discovery and component-map data that would otherwise be unavailable for remote prototypes.

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

Per-key eval outputs under `${UXD_PROJECT_ROOT}/.artifacts/<KEY>/eval/`:

| File | Description |
|------|-------------|
| `evaluation-report.html` | Final HTML report (both phases) |
| `evaluation-report.csv` | Final AC verdicts + usability dimensions |
| `iteration-log.json` | Per-iteration counts + Phase B usability |
| `journey-log.json` | Playwright step log + usability overlays |
| `scripts/journey-test.mjs` | Generated Phase A Playwright script |
| `scripts/persona-walkthrough.mjs` | Generated Phase B Playwright script |
| `evaluation-report-iter-N.csv` | Archived CSV per Phase A iteration |
| `screenshots-iter-N/` | Archived screenshots per Phase A iteration |
| `screenshots/persona-<id>-step-N.png` | Phase B per-persona screenshots |
| `usability-thinkaloud-<id>.md` | Phase B think-aloud traces |
| `runs/<timestamp>/` | Archived copy of this run’s key artifacts |
| `report-url.txt` | Hosted eval URL after `publish-report.sh` |

Cross-key (under `${UXD_PROJECT_ROOT}/.artifacts/eval/`, untouched by `--fresh`):

| File | Description |
|------|-------------|
| `runs/run-log.csv` | Appended run entries |
| `runs/<KEY>/<timestamp>/` | Global archive mirror for leaderboard |
| `pain-leaderboard.html` | Aggregate pain leaderboard |

Create-owned (key root, updated by eval sync — not deleted by `--fresh`):

| File | Description |
|------|-------------|
| `.artifacts/<KEY>/prototype-bar.json` | Sources + `views.eval` for Prototype Bar |

After rendering the report, sync the Prototype Bar with `--artifacts ${KEY_DIR}` (merges `outcome-context.json` into Sources). See `references/phases/eval-report.md` Step 5. Local Eval browsing: run `uxd-prototype-export`’s `export-helper.mjs` so the bar can open `/evals/<KEY>/` on port 9417 (serves `.artifacts/<KEY>/eval/`). For static Pages, copy with `copy-eval-for-pages.sh` / `install-and-sync-prototype-bar.sh` (`public/evals/<KEY>/`) and commit those files — the bar resolves relative eval URLs under the document `<base href>` (e.g. `/mr-218/evals/<KEY>/` on GitLab MR Pages).

**Migration:** move existing eval files from `.artifacts/<KEY>/` into `.artifacts/<KEY>/eval/`; move `.artifacts/runs/` and `.artifacts/pain-leaderboard.html` into `.artifacts/eval/`.

## Error Handling

- **Prototype URL unreachable:** Falls back to local serving from workspace `dist/`. If no workspace or no `dist/`, fails with clear error at setup. See `scripts/resolve-prototype-url.sh`.
- **eval-fix produces no changes:** Stop Phase A — more iterations won't help. Proceed to Phase B.
- **Dev server crashes after fix:** Stop Phase A, note which files may have caused it. Proceed to Phase B.
- **Missing .context/ directories:** Phase A runs in degraded mode (pf-css-token-check fallback). Phase B still runs using the bundled plugin persona catalog; deep behavioral YAML is unavailable until the usability-testing context repo is bootstrapped.

## Review Mode

When the user asks to review prior results (`/uxd-prototype-evaluate review <KEY>` or conversational "show me the eval for …"):

Read `${CLAUDE_SKILL_DIR}/references/phases/eval-review.md` and follow that procedure. Do not re-run Playwright unless the user asks to re-run.

## What's Next

After evaluation completes, the report is at `.artifacts/<KEY>/eval/evaluation-report.html`.

| Result | Next step |
|--------|-----------|
| All ACs pass, usability acceptable | `/uxd-prototype-publish` — push to MR or Pages |
| Minor issues (FLAGGED items) | Review the report, decide per-item, then publish |
| Major failures or low usability | `/uxd-prototype-create` with eval findings as context |
| Re-run after changes | `/uxd-prototype-evaluate <KEY> <URL>` again |

The agent will present a summary with these options after each run. You can also say:
- **"Fix [issue]"** — apply a specific fix
- **"Tell me more about [finding]"** — get details on a finding
- **"Re-run eval"** — re-evaluate after changes
- **"Looks good"** — mark the eval as accepted
