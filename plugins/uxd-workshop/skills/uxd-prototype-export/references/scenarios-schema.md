# scenarios.json schema

Written by `uxd-prototype-create` (Step 4). Sibling to `journeys.json`.

Catalog of **data/condition variants** per page (empty, load error, validation
error, alternate selection). Interaction states that share a URL (e.g. modal
open) stay in `journeys.json` as step `actions` — they are not scenarios.

Consumed by:

- Prototype Bar (Scenario menu) via a slim copy synced into `prototype-bar.json`
- `export-journey.mjs` for step × scenario static HTML captures
- Create Step 8 mock wiring (`?scenario=<id>`)

```json
{
  "prototype_id": "PROJ-298",
  "extracted_at": "2026-07-22T12:00:00Z",
  "pages": [
    {
      "route": "/api-keys",
      "screen": "ApiKeyList",
      "scenarios": [
        {
          "id": "default",
          "name": "Populated list",
          "description": "Happy path with several API keys",
          "default": true
        },
        {
          "id": "empty",
          "name": "Empty state",
          "description": "No API keys yet"
        },
        {
          "id": "load-error",
          "name": "Load error",
          "description": "Failed to fetch keys"
        }
      ]
    }
  ]
}
```

## Fields

| Field | Type | Description |
|-------|------|-------------|
| `prototype_id` | string | Artifact ID (usually Jira key) |
| `extracted_at` | ISO string | When scenarios were written |
| `pages[].route` | string | Path matching journey `steps[].route` |
| `pages[].screen` | string | Optional screen/component name (aligns with `metadata.json` screens) |
| `pages[].scenarios[].id` | string | Filename-safe id (`[a-z0-9-]+`) |
| `pages[].scenarios[].name` | string | Human label for the bar and export index |
| `pages[].scenarios[].description` | string | Optional short explanation |
| `pages[].scenarios[].default` | boolean | Exactly one `true` per page (or imply `id: "default"`) |

## Rules

- Every distinct `route` in `journeys.json` gets a page entry with at least `default`.
- Scenario `id`s must be filename-safe (`[a-z0-9-]+`).
- Prefer one `default: true` per page; if omitted, the scenario with `id: "default"` is treated as default.
- Do not model modal/drawer open as scenarios — use journey step `actions`.

## Runtime contract

Active scenario is selected with the URL query param:

```
?scenario=<id>
```

When absent, treat as `default`. Pages read the active id via `window.UxdScenario.get()`
(see `templates/uxd-scenario-runtime.js`).

## Slim copy in prototype-bar.json

`sync-prototype-bar-config.mjs` flattens pages into:

```json
"scenarios": [
  { "route": "/api-keys", "id": "default", "name": "Populated list", "default": true },
  { "route": "/api-keys", "id": "empty", "name": "Empty state" }
]
```

The bar filters this list by the current pathname.
