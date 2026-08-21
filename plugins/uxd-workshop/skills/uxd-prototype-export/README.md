# uxd-prototype-export

Export prototype pages and journey UI states (including page scenarios) as self-contained static HTML, a component-tree outline, or a PatternFly implementation spec for downstream agents.

## When to Use

- Capture the screen you are looking at (including open modals / transient states)
- Batch-export journey steps × page scenarios after `uxd-prototype-create`
- Install the Prototype Bar so designers can export, open Sources, switch scenarios, and open Eval

## Formats

| Format | Description |
|--------|-------------|
| Static HTML | Single file, inlined CSS, Prototype Bar stripped from capture |
| Component tree | React fiber walk when available; DOM hierarchy fallback |
| PF implementation spec (`pf-spec`) | DOM → PF component tree with imports, layout summary, structure warnings |

## Scripts

| Script | Purpose |
|--------|---------|
| `scripts/serialize-page.js` | Shared DOM → single-HTML serializer (Node + Playwright `evaluate`) |
| `scripts/export-component-tree.js` | React fiber / DOM tree walker |
| `scripts/export-pf-spec.js` | DOM → PatternFly implementation spec (+ `--write-browser` bundle) |
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
| Center | **Prototype \| Eval** + **Scenario ▾** (always shown; enabled when the current page has ≥2 scenarios) |
| Right | **Export** (Static HTML \| Component tree \| PF implementation spec) + status |

Config: `.artifacts/{ID}/prototype-bar.json` → `window.__UXD_PROTOTYPE__` (see `references/prototype-bar-config.md`).

Scenario contract: `?scenario=<id>` via `window.UxdScenario` (`templates/uxd-scenario-runtime.js`). Full catalog: `.artifacts/{ID}/scenarios.json` (`references/scenarios-schema.md`).

Eval navigation:

1. If the helper is healthy and serves a report → `http://127.0.0.1:9417/evals/{ID}/`
2. Else if `views.eval` is an absolute URL → use it
3. Else if relative `views.eval` probes as a real report — first under `<base href>` (e.g. `/mr-218/evals/{ID}/` on GitLab MR Pages), then site-root `/evals/{ID}/`
4. Else → Eval disabled (local hint: start export-helper; hosted hint: expected `{base}evals/{ID}/`)

```bash
# recommended while viewing locally — land exports under .artifacts and serve eval reports
node scripts/export-helper.mjs \
  --out .artifacts/PROJ-298/exports \
  --artifacts .artifacts

# sync Sources + scenarios into bar config, then install
node scripts/sync-prototype-bar-config.mjs --artifacts .artifacts/PROJ-298
bash scripts/install-prototype-bar.sh \
  --source .artifacts/PROJ-298/prototype \
  --config .artifacts/PROJ-298/prototype-bar.json
```

## Static Pages (no backend)

Keep working files under `.artifacts/{ID}/` (eval report under `.artifacts/{ID}/eval/`). For GitLab/GitHub Pages:

```bash
bash scripts/copy-eval-for-pages.sh \
  --artifacts .artifacts/PROJ-298 \
  --pages-root public
```

Copies `.artifacts/PROJ-298/eval/evaluation-report.html` → `public/evals/PROJ-298/index.html` so the bar can use same-origin `/evals/PROJ-298/`.

**Eval vs Export on Pages**

| Control | Static hosting behavior |
|---------|-------------------------|
| **Eval** | Pre-copied report under `public/evals/{ID}/` — navigation only |
| **Export** | Client-side capture via inlined/`<base>`-aware `serialize-page.browser.js`, then browser download (no helper). Journey batch HTML under `.artifacts/{ID}/exports/` is separate (CLI `export-journey.mjs`), not what the Export menu serves. |

## Journey batch export

```bash
node scripts/export-journey.mjs \
  --base-url http://localhost:3000 \
  --journeys .artifacts/PROJ-298/journeys.json \
  --scenarios .artifacts/PROJ-298/scenarios.json \
  --out .artifacts/PROJ-298/exports \
  --formats html,pf-spec
```

Writes `{journeyId}/{stepId}--{scenarioId}.html`, `.pf-spec.json` / `.pf-spec.txt`, rolled-up `implementation-spec.json`, `export-manifest.json`, and `index.html` (gallery).

See `references/journeys-schema.md`, `references/scenarios-schema.md`, `references/export-formats.md`, and `references/prototype-bar-config.md`.

## Related skills

- `uxd-prototype-create` — builds the prototype; writes `journeys.json`, `scenarios.json`, `prototype-bar.json`
- `uxd-prototype-evaluate` — writes reports; syncs Sources (outcome) into bar config
- `uxd-prototype-publish` — deploy / MR; copy evals into Pages tree when hosting statically
