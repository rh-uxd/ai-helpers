---
name: uxd-prototype-export
version: 0.1.0
description: >-
  Export a prototype page or journey step as static HTML, a React component
  tree, or a PatternFly implementation spec, and install the Prototype Bar
  (Sources, Prototype|Eval, Scenario, Export). Use when capturing the current
  view, batch-exporting journey screens and page scenarios, or wiring
  provenance/eval/scenario navigation into a prototype.
---

# Export Prototype

Captures prototype screens as portable artifacts — from the running app (Prototype Bar) or in batch from journey + scenario files. Also installs the Prototype Bar (Sources, Prototype|Eval, Scenario, Export).

Family: `uxd-prototype-create` writes `journeys.json` / `scenarios.json` / `prototype-bar.json`; this skill captures them; `uxd-prototype-evaluate` reports can be opened from the bar; `uxd-prototype-publish` copies evals into static Pages.

## Inputs

| Input | Required | Source |
|-------|----------|--------|
| What to export (current page, journey batch, or install bar) | **Yes** | User; skill asks if omitted |
| Live prototype URL (`--base-url`) | Yes for capture | Running app |
| `journeys.json` + `scenarios.json` | Yes for batch | `.artifacts/{ID}/` from create |
| Prototype source path (`--source`) | Yes for `--install-bar` | Standalone dir or workspace root |

If the user says "export" without details, **stop and ask** which path (below).

## Outputs

Under `.artifacts/{ID}/exports/` unless `--out` is set:

| Output | Description |
|--------|-------------|
| `index.html` + `export-manifest.json` | Gallery and manifest |
| `{journeyId}/{stepId}--{scenarioId}.html` | Static HTML snapshot (inlined CSS; not a live React app) |
| `*.tree.json` / `*.tree.txt` | Component tree (when `tree` format) |
| `*.pf-spec.json` / `*.pf-spec.txt` + `implementation-spec.json` | PF implementation spec (when `pf-spec`) |
| `current/page-{timestamp}.*` | Ad-hoc / bar captures |

Formats: [references/export-formats.md](references/export-formats.md). Point implementation agents at `implementation-spec.json` (or per-capture `.pf-spec.json`).

## Requirements

Node.js 18+ (CLI and optional helper). Playwright for journey/batch export:

```bash
cd "${CLAUDE_SKILL_DIR}" && npm install
```

## Flags

$ARGUMENTS

Parse as: `[--install-bar] [--base-url <url>] [--journeys <path>] [--formats html,tree,pf-spec] …`

| Flag | Values | Default | Description |
|------|--------|---------|-------------|
| `--install-bar` | flag | off | Install Prototype Bar |
| `--config` | path | auto-detect | `prototype-bar.json` (with `--install-bar`) |
| `--base-url` | URL | — | Live prototype URL for Playwright |
| `--journeys` | path | `.artifacts/{ID}/journeys.json` | Journey definitions |
| `--scenarios` | path | sibling `scenarios.json` | Page scenario catalog |
| `--out` | path | `.artifacts/{ID}/exports` | Output directory |
| `--formats` | `html`, `tree`, `pf-spec` | `html` | Export formats |
| `--source` | path | — | Prototype dir or workspace root (install bar) |
| `--mode` | `standalone`, `workspace` | auto-detect | Install target type |

## Conversational Guidance

> What should I export?
>
> - **Current page** — capture whatever is on screen (use the Prototype Bar, or give me a URL)
> - **Journey steps × scenarios** — batch-export from `.artifacts/{ID}/journeys.json` + `scenarios.json`
> - **Install Prototype Bar** — add the sticky bar (Sources, Eval, Scenario, Export)

## Step 1: Choose Path

**A. Install Prototype Bar**

With `--artifacts`, this syncs `prototype-bar.json`, installs bar assets, and copies the eval report for Pages when present.

```bash
bash "${CLAUDE_SKILL_DIR}/scripts/install-prototype-bar.sh" \
  --artifacts ".artifacts/{ID}" \
  --source "<prototype-or-workspace-path>" \
  [--mode standalone|workspace]
```

Assets-only (no config sync): omit `--artifacts` and pass `--config` if you already have `prototype-bar.json`. Schema: [references/prototype-bar-config.md](references/prototype-bar-config.md). Scenario runtime (`?scenario=<id>`) is `uxd-scenario-runtime.js`.

If workspace/React auto-mount fails, copy `templates/PrototypeBar.tsx` + CSS and mount `<PrototypeBar />` in the app shell. Mock branching: create skill `references/scenario-mocks.md`.

**B. Export current URL**

```bash
bash "${CLAUDE_SKILL_DIR}/scripts/export-current.sh" \
  --url "http://localhost:3000/some-route?scenario=empty" \
  --out ".artifacts/{ID}/exports" \
  [--formats html,tree,pf-spec]
```

**C. Batch-export journey steps × scenarios**

Requires [journeys-schema.md](references/journeys-schema.md) and optionally [scenarios-schema.md](references/scenarios-schema.md). For each `export: true` step, captures every scenario for that `route` (`?scenario=<id>`, then step `actions`).

```bash
node "${CLAUDE_SKILL_DIR}/scripts/export-journey.mjs" \
  --base-url "http://localhost:3000" \
  --journeys ".artifacts/{ID}/journeys.json" \
  --scenarios ".artifacts/{ID}/scenarios.json" \
  --out ".artifacts/{ID}/exports" \
  --formats html,pf-spec
```

**D. Optional export helper** (artifact writes + local Eval)

```bash
node "${CLAUDE_SKILL_DIR}/scripts/export-helper.mjs" \
  --out ".artifacts/{ID}/exports"
```

Listens on `127.0.0.1:9417`. Bar POSTs captures here when healthy; otherwise the browser downloads (including on Pages). `GET /evals/{ID}/` serves `.artifacts/{ID}/eval/evaluation-report.html`.

**E. Sync bar config for static Pages**

```bash
node "${CLAUDE_SKILL_DIR}/scripts/sync-prototype-bar-config.mjs" \
  --artifacts ".artifacts/{ID}"

bash "${CLAUDE_SKILL_DIR}/scripts/copy-eval-for-pages.sh" \
  --artifacts ".artifacts/{ID}" \
  --pages-root public
```

Sync merges Sources and flattens `scenarios.json` into `prototype-bar.json`. `copy-eval-for-pages` copies the report to `public/evals/{ID}/index.html` and sets `views.eval` to `/evals/{ID}/`.

## Step 2: Confirm Outputs

Report paths to the user. Static HTML is a **visual** snapshot — it does not rehydrate React. Point implementation agents at `implementation-spec.json`.

## Prototype Bar

| Zone | Controls |
|------|----------|
| Left | Brand + **Sources** (outcome / RFE / Figma / description) |
| Center | **Prototype \| Eval** + **Scenario ▾** (enabled when ≥2 scenarios match the route) |
| Right | **Export** (Static HTML \| Component tree \| PF spec) + status |

Eval resolution: helper `/evals/{id}/` when healthy → else `views.eval` under `<base href>` then site root → else disabled. Scenario switching sets `?scenario=<id>` and reloads; pages read `window.UxdScenario.get()`.

Shared capture: `scripts/serialize-page.js` and `templates/serialize-page.browser.js`.

## Guardrails

- **Ask which path** when the user only says "export."
- **Do not treat static HTML as a live app** — it is a snapshot.
- **Batch export needs a live URL** and Playwright; install-bar does not.
- **Eval on Pages** requires copying the report into `public/evals/{ID}/` — the Export menu is client-side capture, not those pre-baked files.

## Reference Docs

| Doc | When to load |
|-----|-------------|
| [export-formats.md](references/export-formats.md) | Format details |
| [journeys-schema.md](references/journeys-schema.md) | `journeys.json` |
| [scenarios-schema.md](references/scenarios-schema.md) | `scenarios.json` |
| [prototype-bar-config.md](references/prototype-bar-config.md) | Bar config schema |
