---
name: uxd-prototype-evaluate
version: 0.1.0
description: >-
  Evaluate a running prototype against a Jira ticket's acceptance criteria,
  automatically fix what fails, then run persona-based usability walkthroughs.
  Produces an HTML evidence report with screenshots, scores, and findings.
  Use when you want to validate a prototype, check usability, or generate
  evidence for an MR review.
---

# Evaluate Prototype

Two-phase eval: **Phase A (x-ray)** validates acceptance criteria with source access and can fix FAILs; **Phase B (discovery)** always runs persona Playwright walkthroughs. Writes a self-contained HTML report with screenshots, think-aloud traces, and AC verdicts.

Family: `uxd-prototype-create` → **evaluate** → `uxd-prototype-publish`. Re-run after changes. Full loop: [references/orchestration.md](references/orchestration.md). Phase procedures: `references/phases/` — follow each file when that phase runs.

## Inputs

| Input | Example | Required |
|-------|---------|----------|
| Jira story key | `PROJ-298` | **Yes** |
| Prototype URL | `http://localhost:3000` | Conditional |
| MR URL | `https://gitlab.example.com/…/-/merge_requests/42` | No |
| `--workspace` | Path to prototype repo | No |

Need a **reachable URL** or `--workspace` with a built `dist/`. If the key or URL is missing, **stop and ask** — do not start Playwright.

**Remote-only (blocking):** URL but no `--workspace` and no MR URL → warn (no fix loop, no source-mode consistency, heuristic navigation only) and wait for confirm before proceeding.

**URL resolution:** probe remote URLs; if unreachable and `dist/` exists, serve with `sirv` (`--single` for SPAs). Hybrid: MR URL + remote prototype clones source into `.artifacts/<KEY>/code/` for route/component-map data; Playwright still uses the remote URL.

## Outputs

Per-key eval files under `${UXD_PROJECT_ROOT}/.artifacts/<KEY>/eval/` (`ARTIFACTS_DIR`):

| File | Description |
|------|-------------|
| `evaluation-report.html` | Final HTML report (both phases) |
| `evaluation-report.csv` | AC verdicts + usability dimensions |
| `iteration-log.json` | Per-iteration counts + Phase B usability |
| `journey-log.json` | Playwright step log + usability overlays |
| `scripts/journey-test.mjs` / `persona-walkthrough.mjs` | Generated Playwright scripts |
| `evaluation-report-iter-N.csv`, `screenshots-iter-N/` | Phase A archives |
| `screenshots/persona-<id>-step-N.png` | Phase B screenshots |
| `usability-thinkaloud-<id>.md` | Phase B traces |
| `runs/<timestamp>/` | Archived copy of this run |
| `report-url.txt` | Hosted eval URL after `publish-report.sh` |

Cross-key (`.artifacts/eval/`, not deleted by `--fresh`): `runs/run-log.csv`, `pain-leaderboard.html`.

Create-owned (key root, not deleted by `--fresh`): `.artifacts/<KEY>/prototype-bar.json` — sync with `--artifacts ${KEY_DIR}` after the report. Local Eval browsing: export skill `export-helper.mjs` on port 9417. Static Pages: `copy-eval-for-pages.sh` / `install-prototype-bar.sh --artifacts` into `public/evals/<KEY>/`.

## Flags

$ARGUMENTS

Parse as: `<KEY> <prototype-url> [mr-url] [--workspace=…]` or `review <KEY>`

| Flag | Default | Description |
|------|---------|-------------|
| `--workspace` | — | Prototype repo (enables the fix loop) |
| `--max-iterations` | `3` | Max Phase A fix-loop iterations |
| `--no-iterate` | Off | Single Phase A pass, no loop |
| `--no-fix` | Off | Evaluate only — FAILs remain; Phase B still runs |
| `--reset` | Off | Hard-reset workspace to origin HEAD before eval |
| `--fresh` | Off | Delete `.artifacts/<KEY>/eval/` only (not the key root, not `.artifacts/eval/`) |
| `--no-report` | Off | Compact chat summary; run `review` later for the full report |

```
/uxd-prototype-evaluate PROJ-298 http://localhost:3000 --workspace=/path/to/prototype
/uxd-prototype-evaluate PROJ-298 http://localhost:4200 --max-iterations=2
/uxd-prototype-evaluate PROJ-298 https://pages.example.com/mr-42/ https://gitlab.example.com/group/repo/-/merge_requests/42
/uxd-prototype-evaluate review PROJ-298
```

## Artifact locations

Eval runtime outputs live in the **consumer project**, never under `${CLAUDE_SKILL_DIR}` (the skill install). Mixing them into the create/publish key root also breaks `--fresh` and publish.

| Variable | Path | Role |
|----------|------|------|
| `UXD_PROJECT_ROOT` | Consumer project root (git toplevel, never the skill install, never a nested clone) | Pin first |
| `KEY_DIR` | `${UXD_PROJECT_ROOT}/.artifacts/<KEY>` | Create/publish key root |
| `ARTIFACTS_DIR` | `${KEY_DIR}/eval` | **All** per-key eval outputs |

Pinned by `scripts/pipeline-setup.sh` at pipeline start.

1. After any `cd`, use absolute `${ARTIFACTS_DIR}` — never a relative `.artifacts/<KEY>/eval/…`.
2. `cd "${CLAUDE_SKILL_DIR}"` only for `npm install` / Playwright browsers, then return to `${UXD_PROJECT_ROOT}`.
3. Generated Playwright scripts go in `${ARTIFACTS_DIR}/scripts/`.
4. `--fresh` deletes only `${ARTIFACTS_DIR}` (`.artifacts/<KEY>/eval/`). Never the key root, never `.artifacts/eval/`, never `rm -rf .artifacts` from an unknown cwd.
5. Create-owned siblings (`decisions/`, `prototype-bar.json`, …) stay at `${KEY_DIR}`.
6. Node helpers resolve via `scripts/resolve-root.js` (honors `UXD_PROJECT_ROOT`).

BAD: `cd .artifacts/<KEY>/code && echo "result" > eval/report.csv` — relative write lands in the clone.

In phase docs, `.artifacts/<KEY>/eval/…` means `${UXD_PROJECT_ROOT}/.artifacts/<KEY>/eval/…`.

## Prerequisites

Marketplace install copies files only — it does not run `npm install` or `package.json` `postinstall`. Before proceeding, install Node deps and Chromium from the skill directory:

```bash
export UXD_PROJECT_ROOT="$(node -e "console.log(require('${CLAUDE_SKILL_DIR}/scripts/resolve-root').resolveProjectRoot())" 2>/dev/null || git rev-parse --show-toplevel 2>/dev/null || pwd)"
cd "${CLAUDE_SKILL_DIR}"
npm install
npx playwright install chromium
cd "${UXD_PROJECT_ROOT}"
```

Stop if Chromium install fails; do not start Playwright without it.

Context repos (`.context/consistency-checker/`, `.context/usability-testing/`) bootstrap on first run when `CONSISTENCY_CHECKER_REPO` / `USABILITY_TESTING_REPO` (or overlay `context_repos`) are set; otherwise those phases degrade. Product overlay: [references/skill-overlays.md](references/skill-overlays.md).

**Personas:** `${CLAUDE_PLUGIN_ROOT}/knowledge/personas/catalog.yaml` + overlays. Deep YAML from `.context/usability-testing/`. Internal study URLs: `node ${CLAUDE_SKILL_DIR}/scripts/overlay-get.js --knowledge-persona <id>` when internal-ai-helpers is present.

IDE auto-approve for the bundled scripts is optional and tool-specific — see this skill's README if the user is prompted on every script.

## Workflow (two-phase)

```
PHASE A (X-Ray — Informed AC Validation Loop):
  eval-extract (--phase=core) → eval-consistency (--mode=source) → eval-classify → eval-journey
                                                                                     ↓
                                                                             Exit condition met? → Phase B (ALWAYS)
                                                                             FAIL + cycle ≤ max → eval-fix → loop from eval-classify

  Exit conditions (any triggers Phase B):
    all_pass          — 0 FAIL, 0 FLAGGED
    flagged_unfixable — 0 FAIL, FLAGGED items unfixable
    max_iterations    — still has FAILs after N loops
    regression        — fix loop broke a previously-passing AC
    no_fix/no_iterate — user flag or single-run mode

POST-PHASE-A:
  eval-consistency (--mode=visual) → eval-extract (--phase=enrichment) → eval-hint

PHASE B (Discovery — Per-Persona Usability Walkthroughs) — ALWAYS FIRES:
  eval-usability → eval-report
  Runs on whatever prototype state exists after Phase A exits.
```

**Phase A** exits on zero FAIL in `evaluation-report.csv` Section 1, or max iterations. FLAGGED items need human review; the loop only targets FAILs.

**Phase B always fires**, regardless of Phase A outcome (including `--no-fix`). When `exit_reason != all_pass`, usability scores may reflect missing features.

Do not improvise the loop from this overview — follow [references/orchestration.md](references/orchestration.md).

## Review Mode

`/uxd-prototype-evaluate review <KEY>` (or "show me the eval for …"): follow [references/phases/eval-review.md](references/phases/eval-review.md). Do not re-run Playwright unless asked.

## Error Handling

| Problem | Action |
|---------|--------|
| Prototype URL unreachable | Fall back to workspace `dist/` via `resolve-prototype-url.sh`; fail clearly if neither exists |
| eval-fix produces no changes | Stop Phase A; proceed to Phase B |
| Dev server crashes after fix | Stop Phase A; note suspect files; proceed to Phase B |
| Missing `.context/` | Phase A degrades (token-check fallback); Phase B uses bundled personas |

## What's Next

Report: `.artifacts/<KEY>/eval/evaluation-report.html`.

| Result | Next step |
|--------|-----------|
| All ACs pass, usability acceptable | `/uxd-prototype-publish` |
| FLAGGED only | Review, then publish |
| Major failures or low usability | `/uxd-prototype-create` with eval findings |
| Re-run after changes | `/uxd-prototype-evaluate <KEY> <URL>` |

After each run, offer: fix a specific issue, explain a finding, re-run, or accept.

## Guardrails

- **Do not start Playwright** until Chromium is installed (`npx playwright install chromium`), and the Jira key and a URL or `--workspace` are known.
- **Never write eval artifacts to `${CLAUDE_SKILL_DIR}`.**
- **`--fresh` deletes `.artifacts/<KEY>/eval/` only** — key root and `.artifacts/eval/` stay intact.
- **Phase B is not optional** and is not inference from Phase A screenshots.
- **`--no-fix` skips the fix loop;** FAILs remain; Phase B still runs.

## Reference Docs

| Doc | When to load |
|-----|-------------|
| [orchestration.md](references/orchestration.md) | Running a full eval |
| [phases/eval-extract.md](references/phases/eval-extract.md) | Jira context, ACs, MR delta |
| [phases/eval-classify.md](references/phases/eval-classify.md) | AC tier classification |
| [phases/eval-consistency.md](references/phases/eval-consistency.md) | PatternFly checks |
| [phases/eval-journey.md](references/phases/eval-journey.md) | Phase A Playwright |
| [phases/eval-fix.md](references/phases/eval-fix.md) | Applying fixes |
| [phases/eval-hint.md](references/phases/eval-hint.md) | Navigation hints |
| [phases/eval-usability.md](references/phases/eval-usability.md) | Phase B walkthroughs |
| [phases/eval-report.md](references/phases/eval-report.md) | HTML report |
| [phases/eval-review.md](references/phases/eval-review.md) | Reviewing a prior run |
| [playwright-rules.md](references/playwright-rules.md) | Writing Playwright scripts |
| [skill-overlays.md](references/skill-overlays.md) | Product-specific config |
