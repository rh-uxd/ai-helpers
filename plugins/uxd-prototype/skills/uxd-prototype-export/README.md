# uxd-prototype-export

Export prototype pages as static HTML, a component tree, or a PatternFly implementation spec. Also installs the Prototype Bar.

**Contract (inputs, outputs, flags, steps):** [SKILL.md](SKILL.md)

## Setup

```bash
cd plugins/uxd-prototype/skills/uxd-prototype-export
npm install
```

## Scripts

| Script | Purpose |
|--------|---------|
| `scripts/install-prototype-bar.sh` | Sync config (with `--artifacts`) + install bar + optional eval copy |
| `scripts/sync-prototype-bar-config.mjs` | Build/merge `.artifacts/{ID}/prototype-bar.json` |
| `scripts/export-current.sh` | Capture one URL via Playwright |
| `scripts/export-journey.mjs` | Batch-export `export: true` steps × scenarios |
| `scripts/export-helper.mjs` | Local writer + `GET /evals/:id` on `127.0.0.1:9417` |
| `scripts/copy-eval-for-pages.sh` | Copy report to `public/evals/{ID}/` for static Pages |
| `scripts/serialize-page.js` | Shared DOM → HTML serializer |

Schemas: `references/journeys-schema.md`, `references/scenarios-schema.md`, `references/export-formats.md`, `references/prototype-bar-config.md`.

## Related

- `uxd-prototype-create` — writes `journeys.json`, `scenarios.json`, `prototype-bar.json`
- `uxd-prototype-evaluate` — reports the bar's Eval tab opens
- `uxd-prototype-publish` — copies evals into the Pages tree
