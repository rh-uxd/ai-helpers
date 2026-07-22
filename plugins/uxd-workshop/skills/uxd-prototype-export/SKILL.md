---
name: uxd-prototype-export
description: >-
  Export a prototype page or journey step as a self-contained static HTML file
  or a React component tree. Use when capturing the current view, batch-exporting
  journey screens and UI states, or installing the Prototype Bar into a prototype.
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
  [--mode standalone|workspace]
```

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

**D. Optional export helper (artifact folder writes from the bar)**

```bash
node "${CLAUDE_SKILL_DIR}/scripts/export-helper.mjs" \
  --out ".artifacts/{ID}/exports"
```

Listens on `127.0.0.1:9417`. The Prototype Bar POSTs captures here when healthy;
otherwise it downloads files in the browser.

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

## Architecture

| Mechanism | Role |
|-----------|------|
| In-page serializer (Prototype Bar) | Capture current DOM state (modals, filled fields) |
| `export-helper.mjs` | Optional write into `.artifacts/` from the bar |
| `export-journey.mjs` | Playwright replay of journey actions, then same serializer |

Shared capture logic lives in `scripts/serialize-page.js` and
`templates/serialize-page.browser.js`.
