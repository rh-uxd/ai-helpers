# uxd-prototype-export

Export prototype pages as static HTML, a component tree, or a PatternFly implementation spec. Also installs the Prototype Bar.

[Usage and full options](SKILL.md#flags)

## Prerequisites

| Requirement | When it is needed |
|-------------|-------------------|
| Node.js ≥ 18 and npm | All export scripts |
| Playwright Chromium | Capturing a live page or batch-exporting journeys; not required to install the Prototype Bar |
| A reachable prototype URL | Current-page capture and batch export |
| `journeys.json` and `scenarios.json` | Batch export; typically produced by `uxd-prototype-create` |

## Codex quick start

Enable the available UXD prototype plugin and open your prototype project in Codex. See [Codex setup](../../../../docs/codex-setup.md) if the skill is missing.

Install the Prototype Bar in a prototype:

```text
$uxd-prototype-export --install-bar --source /path/to/prototype --mode standalone
```

Capture the currently running page:

```text
$uxd-prototype-export --base-url http://localhost:3000
```

Batch-export journey steps and scenarios:

```text
$uxd-prototype-export --base-url http://localhost:3000 --journeys .artifacts/PROJ-298/journeys.json --scenarios .artifacts/PROJ-298/scenarios.json --formats html,pf-spec
```

## Setup

From the repository root, install the bundled Playwright dependency and Chromium browser:

```bash
cd plugins/uxd-prototype/skills/uxd-prototype-export
npm install
npx playwright install chromium
```

`npm install` attempts a best-effort Playwright browser install, but the explicit Chromium command ensures the browser is present. The Prototype Bar can be installed without Playwright. The optional local export helper listens on `127.0.0.1:9417`.

## Scripts

| Script | Purpose |
|--------|---------|
| `scripts/install-prototype-bar.sh` | Sync config, install the bar, and optionally copy the eval report |
| `scripts/sync-prototype-bar-config.mjs` | Build or merge `.artifacts/{ID}/prototype-bar.json` |
| `scripts/export-current.sh` | Capture one URL using Playwright |
| `scripts/export-journey.mjs` | Batch-export `export: true` steps across scenarios |
| `scripts/export-helper.mjs` | Serve local artifact writes and `GET /evals/:id` |
| `scripts/copy-eval-for-pages.sh` | Copy an eval report into `public/evals/{ID}/` |
| `scripts/serialize-page.js` | Shared DOM-to-HTML serializer |

Schemas: `references/journeys-schema.md`, `references/scenarios-schema.md`, `references/export-formats.md`, and `references/prototype-bar-config.md`.

## Related

- **uxd-prototype-create** — writes `journeys.json`, `scenarios.json`, and `prototype-bar.json`
- **uxd-prototype-evaluate** — produces reports that the bar's Eval tab opens
- **uxd-prototype-publish** — copies eval reports into the Pages tree
