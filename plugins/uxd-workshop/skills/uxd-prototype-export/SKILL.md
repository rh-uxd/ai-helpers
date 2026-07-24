---
name: uxd-prototype-export
description: >-
  Export a prototype page or journey step as static HTML, a React component
  tree, or a PatternFly implementation spec, and install the Prototype Bar
  (Sources, Prototype|Eval, Scenario, Export). Use when capturing the current
  view, batch-exporting journey screens and page scenarios, or wiring
  provenance/eval/scenario navigation into a prototype.
---

# Export Prototype

Captures prototype screens as portable artifacts. Supports interactive export from
the running app (Prototype Bar) and batch export from journey + scenario definitions.

## Formats

| Format | Output | Use when |
|--------|--------|----------|
| **Static HTML** | Single `.html` with inlined CSS | Share a visual snapshot of a page or UI state (e.g. modal open) |
| **Component tree** | `.json` + `.txt` outline | Inspect React (or DOM-fallback) hierarchy for the current view |
| **PF implementation spec** (`pf-spec`) | `.pf-spec.json` + `.pf-spec.txt` (+ rolled-up `implementation-spec.json`) | Hand exact PF component trees/imports to implementation agents |

See [references/export-formats.md](references/export-formats.md).

## Requirements

- **Node.js 18+** for CLI scripts and the optional export helper
- **Playwright** for journey/batch export (`npm install` in this skill directory installs Chromium)

```bash
cd "${CLAUDE_SKILL_DIR}" && npm install
```

## Conversational Guidance

If the user says "export", "snapshot", "static HTML", "component tree", or "implementation spec" without details, ask:

> What should I export?
>
> - **Current page** — capture whatever is on screen (use the Prototype Bar, or give me a URL)
> - **Journey steps × scenarios** — batch-export from `.artifacts/{ID}/journeys.json` + `scenarios.json`
> - **Install Prototype Bar** — add the sticky bar (Sources, Eval, Scenario, Export)

## Flags

| Flag | Values | Default | Description |
|------|--------|---------|-------------|
| `--install-bar` | flag | off | Install Prototype Bar into the prototype (standalone or React workspace) |
| `--config` | path | auto-detect | `prototype-bar.json` for Sources / Eval / scenarios (with `--install-bar`) |
| `--base-url` | URL | — | Live prototype URL for Playwright capture |
| `--journeys` | path | `.artifacts/{ID}/journeys.json` | Journey definitions |
| `--scenarios` | path | sibling `scenarios.json` | Page scenario catalog |
| `--out` | path | `.artifacts/{ID}/exports` | Output directory |
| `--formats` | `html`, `tree`, `pf-spec` (comma-separated) | `html` | Export formats |
| `--source` | path | — | Standalone prototype dir or workspace root (for `--install-bar`) |
| `--mode` | `standalone`, `workspace` | auto-detect | Install target type |

## Step 1: Choose Path

**A. Install Prototype Bar**

```bash
bash "${CLAUDE_SKILL_DIR}/scripts/install-prototype-bar.sh" \
  --source "<prototype-or-workspace-path>" \
  [--mode standalone|workspace] \
  [--config ".artifacts/{ID}/prototype-bar.json"]
```

Pass `--config` (or rely on auto-detect next to the prototype / under `.artifacts/`)
so the bar can show **Sources**, **Prototype | Eval**, and **Scenario**. Schema:
[references/prototype-bar-config.md](references/prototype-bar-config.md).
Scenario runtime (`?scenario=<id>`) is installed as `uxd-scenario-runtime.js`.

For workspace/React, if the script cannot patch App automatically, follow the
pf-prototype-mode pattern: copy `templates/PrototypeBar.tsx` + CSS, import and
mount `<PrototypeBar />` near the top of the app shell. Use `useUxdScenario` for
mock branching (see create skill `references/scenario-mocks.md`).

**B. Export current URL (CLI)**

```bash
bash "${CLAUDE_SKILL_DIR}/scripts/export-current.sh" \
  --url "http://localhost:3000/some-route?scenario=empty" \
  --out ".artifacts/{ID}/exports" \
  [--formats html,tree,pf-spec]
```

**C. Batch-export journey steps × scenarios**

Requires [journeys schema](references/journeys-schema.md) and optionally
[scenarios schema](references/scenarios-schema.md). For each step with `export: true`,
captures every scenario for that step’s `route` (navigates with `?scenario=<id>`,
then runs step `actions`).

```bash
node "${CLAUDE_SKILL_DIR}/scripts/export-journey.mjs" \
  --base-url "http://localhost:3000" \
  --journeys ".artifacts/{ID}/journeys.json" \
  --scenarios ".artifacts/{ID}/scenarios.json" \
  --out ".artifacts/{ID}/exports" \
  --formats html,pf-spec
```

**D. Optional export helper (artifact writes + local Eval serving)**

```bash
node "${CLAUDE_SKILL_DIR}/scripts/export-helper.mjs" \
  --out ".artifacts/{ID}/exports"
```

Listens on `127.0.0.1:9417`.

- **Export:** Prototype Bar POSTs captures here when healthy; otherwise downloads in the browser (including on GitLab/GitHub Pages — Export is client-side, not a pre-baked file fetch)
- **Eval:** `GET /evals/{ID}/` serves `.artifacts/{ID}/eval/evaluation-report.html` so the bar’s Eval control works locally without Pages

**E. Sync / copy bar config for static Pages**

```bash
node "${CLAUDE_SKILL_DIR}/scripts/sync-prototype-bar-config.mjs" \
  --artifacts ".artifacts/{ID}"

bash "${CLAUDE_SKILL_DIR}/scripts/copy-eval-for-pages.sh" \
  --artifacts ".artifacts/{ID}" \
  --pages-root public
```

Sync merges Sources and flattens `scenarios.json` into `prototype-bar.json`.
`copy-eval-for-pages` copies the report to `public/evals/{ID}/index.html` and sets
`views.eval` to `/evals/{ID}/` for same-origin navigation on GitLab/GitHub Pages.

## Step 2: Confirm Outputs

Expected layout:

```
.artifacts/{ID}/exports/
  index.html
  export-manifest.json
  implementation-spec.json          # when pf-spec is included
  {journeyId}/{stepId}--{scenarioId}.html
  {journeyId}/{stepId}--{scenarioId}.tree.json
  {journeyId}/{stepId}--{scenarioId}.tree.txt
  {journeyId}/{stepId}--{scenarioId}.pf-spec.json
  {journeyId}/{stepId}--{scenarioId}.pf-spec.txt
  current/page-{timestamp}.html   # ad-hoc / bar exports
```

Report paths to the user. Note that static HTML is a **visual** snapshot — it does
not rehydrate React interactivity. Point implementation agents at
`implementation-spec.json` (or per-capture `.pf-spec.json`) for PF structure.

## Prototype Bar zones

| Zone | Controls |
|------|----------|
| Left | Brand + **Sources** (outcome / RFE / strat / Figma / description links) |
| Center | **Prototype \| Eval** view switch + **Scenario ▾** (always shown on prototype view; enabled when ≥2 scenarios match the current route) |
| Right | **Export** menu (Static HTML \| Component tree \| PF implementation spec) + status |

Eval resolution: helper `/evals/{id}/` when healthy → else `views.eval` probed under `<base href>` then site root → else disabled.

Scenario switching: sets `?scenario=<id>` and reloads. Pages read
`window.UxdScenario.get()` for mock data.

## Architecture

| Mechanism | Role |
|-----------|------|
| In-page serializer (Prototype Bar) | Capture current DOM state (modals, filled fields) |
| `window.__UXD_PROTOTYPE__` / `prototype-bar.json` | Sources + view URLs + slim scenarios list |
| `window.UxdScenario` / `?scenario=` | Active page scenario for mocks + export |
| `export-helper.mjs` | Optional write into `.artifacts/` + local eval report server |
| `export-journey.mjs` | Playwright: each step × scenario, then same serializer |

Shared capture logic lives in `scripts/serialize-page.js` and
`templates/serialize-page.browser.js`.
