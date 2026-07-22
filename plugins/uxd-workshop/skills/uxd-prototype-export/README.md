# uxd-prototype-export

Export prototype pages and journey UI states (including page scenarios) as self-contained static HTML or a component-tree outline.

## When to Use

- Capture the screen you are looking at (including open modals / transient states)
- Batch-export journey steps × page scenarios after `uxd-prototype-create`
- Install the Prototype Bar so designers can export, open Sources, switch scenarios, and open Eval

## Formats

| Format | Description |
|--------|-------------|
| Static HTML | Single file, inlined CSS, Prototype Bar stripped from capture |
| Component tree | React fiber walk when available; DOM hierarchy fallback |

## Scripts

| Script | Purpose |
|--------|---------|
| `scripts/serialize-page.js` | Shared DOM → single-HTML serializer (Node + Playwright `evaluate`) |
| `scripts/export-component-tree.js` | React fiber / DOM tree walker |
| `scripts/export-current.sh` | Capture one URL via Playwright |
| `scripts/export-journey.mjs` | Batch-export `export: true` steps × scenarios |
| `scripts/export-helper.mjs` | Localhost writer + `GET /evals/:id` report server (`127.0.0.1:9417`) |
| `scripts/install-prototype-bar.sh` | Copy bar + scenario runtime + inject `prototype-bar.json` |
| `scripts/sync-prototype-bar-config.mjs` | Build/merge `.artifacts/{ID}/prototype-bar.json` (incl. scenarios) |
| `scripts/copy-eval-for-pages.sh` | Copy report to `public/evals/{ID}/` for static Pages |

## Setup

```bash
cd plugins/uxd-workshop/skills/uxd-prototype-export
npm install
```

## Prototype Bar

Sticky top bar:

| Zone | Controls |
|------|----------|
| Left | **Sources** — outcome / RFE / strat / Figma / description links |
| Center | **Prototype \| Eval** + **Scenario ▾** (when the current page has ≥2 scenarios) |
| Right | **Export** (Static HTML \| Component tree) + status |

Config: `.artifacts/{ID}/prototype-bar.json` → `window.__UXD_PROTOTYPE__` (see `references/prototype-bar-config.md`).

Scenario contract: `?scenario=<id>` via `window.UxdScenario` (`templates/uxd-scenario-runtime.js`). Full catalog: `.artifacts/{ID}/scenarios.json` (`references/scenarios-schema.md`).

Eval navigation:

1. If the helper is healthy → `http://127.0.0.1:9417/evals/{ID}/`
2. Else → `views.eval` (e.g. `/evals/{ID}/` on Pages)
3. Else → control disabled

```bash
# optional — land exports under .artifacts and serve eval reports locally
node scripts/export-helper.mjs --out .artifacts/PROJ-298/exports

# sync Sources + scenarios into bar config, then install
node scripts/sync-prototype-bar-config.mjs --artifacts .artifacts/PROJ-298
bash scripts/install-prototype-bar.sh \
  --source .artifacts/PROJ-298/prototype \
  --config .artifacts/PROJ-298/prototype-bar.json
```

## Static Pages (no backend)

Keep working files under `.artifacts/{ID}/`. For GitLab/GitHub Pages:

```bash
bash scripts/copy-eval-for-pages.sh \
  --artifacts .artifacts/PROJ-298 \
  --pages-root public
```

Produces `public/evals/PROJ-298/index.html` so the bar can use same-origin `/evals/PROJ-298/`.

## Journey batch export

```bash
node scripts/export-journey.mjs \
  --base-url http://localhost:3000 \
  --journeys .artifacts/PROJ-298/journeys.json \
  --scenarios .artifacts/PROJ-298/scenarios.json \
  --out .artifacts/PROJ-298/exports \
  --formats html,tree
```

Writes `{journeyId}/{stepId}--{scenarioId}.html`, `export-manifest.json`, and `index.html` (gallery).

See `references/journeys-schema.md`, `references/scenarios-schema.md`, `references/export-formats.md`, and `references/prototype-bar-config.md`.

## Related skills

- `uxd-prototype-create` — builds the prototype; writes `journeys.json`, `scenarios.json`, `prototype-bar.json`
- `uxd-prototype-evaluate` — writes reports; syncs Sources (outcome) into bar config
- `uxd-prototype-publish` — deploy / MR; copy evals into Pages tree when hosting statically
