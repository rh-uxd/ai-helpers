# states.json schema

Written by `uxd-prototype-create` (Step 4) as `states.json`. Sibling to `journeys.json`.

Catalog of **data/condition variants** per page (empty, load error, validation
error, alternate selection, match/availability/recovery branches). Modal and
drawer open stay in `journeys.json` as step `actions`.

Brainstorm which states to include:
`uxd-prototype-create/references/state-brainstorm.md`.

Consumed by:

- Prototype Bar via a slim copy synced into `prototype-bar.json`
- `export-journey.mjs` for step × state static HTML captures
- Create Step 8 mock wiring (`?state=<id>`)

```json
{
  "prototype_id": "PROJ-298",
  "extracted_at": "2026-07-22T12:00:00Z",
  "pages": [
    {
      "route": "/api-keys",
      "screen": "ApiKeyList",
      "states": [
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
| `extracted_at` | ISO string | When states were written |
| `pages[].route` | string | Path matching journey `steps[].route` |
| `pages[].screen` | string | Optional screen/component name (aligns with `metadata.json` screens) |
| `pages[].states[].id` | string | Filename-safe id (`[a-z0-9-]+`) |
| `pages[].states[].name` | string | Human label for the bar and export index |
| `pages[].states[].description` | string | Optional short explanation |
| `pages[].states[].default` | boolean | Exactly one `true` per page (or imply `id: "default"`) |

## Rules

- Every distinct `route` in `journeys.json` gets a page entry with at least `default`.
- State `id`s must be filename-safe (`[a-z0-9-]+`).
- Prefer one `default: true` per page; if omitted, the state with `id: "default"` is treated as default.
- Do not model modal/drawer open as states — use journey step `actions`.

## Runtime contract

The active state is selected with the URL query param:

```
?state=<id>
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
