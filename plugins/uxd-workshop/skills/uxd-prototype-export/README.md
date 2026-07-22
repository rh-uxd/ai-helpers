# uxd-prototype-export

Export prototype pages and journey UI states as self-contained static HTML or a component-tree outline.

## When to Use

- Capture the screen you are looking at (including open modals / transient states)
- Batch-export key journey steps after `uxd-prototype-create`
- Install the Prototype Bar so designers can export, open Sources, and switch to Eval

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
| `scripts/export-journey.mjs` | Batch-export `export: true` journey steps |
| `scripts/export-helper.mjs` | Localhost writer + `GET /evals/:id` report server (`127.0.0.1:9417`) |
| `scripts/install-prototype-bar.sh` | Copy bar assets + inject `prototype-bar.json` |
| `scripts/sync-prototype-bar-config.mjs` | Build/merge `.artifacts/{ID}/prototype-bar.json` |
| `scripts/copy-eval-for-pages.sh` | Copy report to `public/evals/{ID}/` for static Pages |

## Setup

```bash
cd plugins/uxd-workshop/skills/uxd-prototype-export
npm install
```

## Prototype Bar

Sticky top bar with three zones:

| Zone | Controls |
|------|----------|
| Left | **Sources** — outcome / RFE / strat / Figma / description links |
| Center | **Prototype \| Eval** view switch |
| Right | **Export** (Static HTML \| Component tree) + status |

Config: `.artifacts/{ID}/prototype-bar.json` → `window.__UXD_PROTOTYPE__` (see `references/prototype-bar-config.md`).

Eval navigation:

1. If the helper is healthy → `http://127.0.0.1:9417/evals/{ID}/`
2. Else → `views.eval` (e.g. `/evals/{ID}/` on Pages)
3. Else → control disabled

```bash
# optional — land exports under .artifacts and serve eval reports locally
node scripts/export-helper.mjs --out .artifacts/PROJ-298/exports

# install bar with Sources/Eval config
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
  --out .artifacts/PROJ-298/exports \
  --formats html,tree
```

See `references/journeys-schema.md`, `references/export-formats.md`, and `references/prototype-bar-config.md`.

## Related skills

- `uxd-prototype-create` — builds the prototype; writes `prototype-bar.json`; `--prototype-bar` (default on)
- `uxd-prototype-evaluate` — writes reports; syncs Sources (outcome) into bar config
- `uxd-prototype-publish` — deploy / MR; copy evals into Pages tree when hosting statically
