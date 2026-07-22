---
name: uxd-prototype-export
description: >-
  Export a prototype page or journey step as static HTML or a React component
  tree, and install the Prototype Bar (Sources, Prototype|Eval, Export). Use when
  capturing the current view, batch-exporting journey screens and UI states, or
  wiring provenance/eval navigation into a prototype.
---

# Export Prototype

Captures prototype screens as portable artifacts. Supports interactive export from
the running app (Prototype Bar) and batch export from journey definitions.

## Formats

| Format | Output | Use when |
|--------|--------|----------|
| **Static HTML** | Single `.html` with inlined CSS | Share a visual snapshot of a page or UI state (e.g. modal open) |
| **Component tree** | `.json` + `.txt` outline | Inspect React (or DOM-fallback) hierarchy for the current view |

See [references/export-formats.md](references/export-formats.md).

## Requirements

- **Node.js 18+** for CLI scripts and the optional export helper
- **Playwright** for journey/batch export (`npm install` in this skill directory installs Chromium)

```bash
cd "${CLAUDE_SKILL_DIR}" && npm install
```

## Conversational Guidance

If the user says "export", "snapshot", "static HTML", or "component tree" without details, ask:

> What should I export?
>
> - **Current page** — capture whatever is on screen (use the Prototype Bar, or give me a URL)
> - **Journey steps** — batch-export screens/states from `.artifacts/{ID}/journeys.json`
> - **Install Prototype Bar** — add the sticky export bar to this prototype

## Flags

| Flag | Values | Default | Description |
|------|--------|---------|-------------|
| `--install-bar` | flag | off | Install Prototype Bar into the prototype (standalone or React workspace) |
| `--config` | path | auto-detect | `prototype-bar.json` for Sources / Eval (with `--install-bar`) |
| `--base-url` | URL | — | Live prototype URL for Playwright capture |
| `--journeys` | path | `.artifacts/{ID}/journeys.json` | Journey definitions |
| `--out` | path | `.artifacts/{ID}/exports` | Output directory |
| `--formats` | `html`, `tree`, or both | `html` | Comma-separated formats |
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
so the bar can show **Sources** and **Prototype | Eval**. Schema:
[references/prototype-bar-config.md](references/prototype-bar-config.md).

For workspace/React, if the script cannot patch App automatically, follow the
pf-prototype-mode pattern: copy `templates/PrototypeBar.tsx` + CSS, import and
mount `<PrototypeBar />` near the top of the app shell.

**B. Export current URL (CLI)**

```bash
bash "${CLAUDE_SKILL_DIR}/scripts/export-current.sh" \
  --url "http://localhost:3000/some-route" \
  --out ".artifacts/{ID}/exports" \
  [--formats html,tree]
```

**C. Batch-export journey steps**

Requires [journeys schema](references/journeys-schema.md). Steps with `export: true`
are captured after their `route` + `actions` (click, wait_for, etc.).

```bash
node "${CLAUDE_SKILL_DIR}/scripts/export-journey.mjs" \
  --base-url "http://localhost:3000" \
  --journeys ".artifacts/{ID}/journeys.json" \
  --out ".artifacts/{ID}/exports" \
  --formats html
```

**D. Optional export helper (artifact writes + local Eval serving)**

```bash
node "${CLAUDE_SKILL_DIR}/scripts/export-helper.mjs" \
  --out ".artifacts/{ID}/exports"
```

Listens on `127.0.0.1:9417`.

- **Export:** Prototype Bar POSTs captures here when healthy; otherwise downloads in the browser
- **Eval:** `GET /evals/{ID}/` serves `.artifacts/{ID}/evaluation-report.html` so the bar’s Eval control works locally without Pages

**E. Sync / copy bar config for static Pages**

```bash
node "${CLAUDE_SKILL_DIR}/scripts/sync-prototype-bar-config.mjs" \
  --artifacts ".artifacts/{ID}"

bash "${CLAUDE_SKILL_DIR}/scripts/copy-eval-for-pages.sh" \
  --artifacts ".artifacts/{ID}" \
  --pages-root public
```

Copies the report to `public/evals/{ID}/index.html` and sets `views.eval` to `/evals/{ID}/`
for same-origin navigation on GitLab/GitHub Pages (no backend).

## Step 2: Confirm Outputs

Expected layout:

```
.artifacts/{ID}/exports/
  {journeyId}/{stepId}.html
  {journeyId}/{stepId}.tree.json
  {journeyId}/{stepId}.tree.txt
  current/page-{timestamp}.html   # ad-hoc / bar exports
```

Report paths to the user. Note that static HTML is a **visual** snapshot — it does
not rehydrate React interactivity.

## Prototype Bar zones

| Zone | Controls |
|------|----------|
| Left | Brand + **Sources** (outcome / RFE / strat / Figma / description links) |
| Center | **Prototype \| Eval** view switch |
| Right | **Export** menu + status |

Eval resolution: helper `/evals/{id}/` when healthy → else `views.eval` → else disabled.

## Architecture

| Mechanism | Role |
|-----------|------|
| In-page serializer (Prototype Bar) | Capture current DOM state (modals, filled fields) |
| `window.__UXD_PROTOTYPE__` / `prototype-bar.json` | Sources + view URLs |
| `export-helper.mjs` | Optional write into `.artifacts/` + local eval report server |
| `export-journey.mjs` | Playwright replay of journey actions, then same serializer |

Shared capture logic lives in `scripts/serialize-page.js` and
`templates/serialize-page.browser.js`.
