# uxd-prototype-export

Export prototype pages and journey UI states as self-contained static HTML or a component-tree outline.

## When to Use

- Capture the screen you are looking at (including open modals / transient states)
- Batch-export key journey steps after `uxd-prototype-create`
- Install the Prototype Bar so designers can export without running the skill

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
| `scripts/export-helper.mjs` | Optional localhost writer for Prototype Bar (`127.0.0.1:9417`) |
| `scripts/install-prototype-bar.sh` | Copy bar assets into standalone HTML or React workspace |

## Setup

```bash
cd plugins/uxd-workshop/skills/uxd-prototype-export
npm install
```

## Prototype Bar

Sticky top bar with an **Export** menu (Static HTML | Component tree).

1. Serializes the current page in the browser
2. If `http://127.0.0.1:9417/health` responds, POSTs the file to the helper
3. Otherwise triggers a browser download

```bash
# optional — land files under .artifacts instead of Downloads
node scripts/export-helper.mjs --out .artifacts/PROJ-298/exports
```

## Journey batch export

```bash
node scripts/export-journey.mjs \
  --base-url http://localhost:3000 \
  --journeys .artifacts/PROJ-298/journeys.json \
  --out .artifacts/PROJ-298/exports \
  --formats html,tree
```

See `references/journeys-schema.md` and `references/export-formats.md`.

## Related skills

- `uxd-prototype-create` — builds the prototype; `--prototype-bar` (default on) and `--export`
- `uxd-prototype-evaluate` — Playwright AC / usability (separate from export)
- `uxd-prototype-publish` — deploy / MR (not the same as portable snapshots)
