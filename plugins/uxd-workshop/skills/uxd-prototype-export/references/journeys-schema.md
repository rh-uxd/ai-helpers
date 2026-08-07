# journeys.json schema

Written by `uxd-prototype-create` (Step 4). Consumed by `export-journey.mjs` and
used during create for reachability checks.

**Data/condition variants** (empty, error, validation) live in sibling
`scenarios.json` — see [scenarios-schema.md](scenarios-schema.md). Journey
`actions` remain for interaction states (e.g. modal open). Batch export captures
each exportable step × each scenario for that step’s `route`.

Aligns loosely with evaluate `journey_definitions` / `expected_path` so eval can
reuse later; create owns this file.

```json
{
  "prototype_id": "PROJ-298",
  "extracted_at": "2026-07-22T12:00:00Z",
  "journeys": [
    {
      "id": "journey-1",
      "title": "Create API key",
      "persona": "app-developer",
      "source": "jira",
      "ac_ids": ["AC-1", "AC-2"],
      "steps": [
        {
          "id": "list",
          "name": "API key list",
          "route": "/api-keys",
          "export": true
        },
        {
          "id": "open-create",
          "name": "Create modal open",
          "route": "/api-keys",
          "export": true,
          "actions": [
            { "type": "click", "selector": "[data-ouia-component-id=\"create-api-key\"]" },
            { "type": "wait_for", "selector": "[role=\"dialog\"]" }
          ]
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
| `extracted_at` | ISO string | When journeys were written |
| `journeys[].id` | string | Stable id (`journey-1`, …) |
| `journeys[].title` | string | Human title |
| `journeys[].persona` | string | Optional persona catalog id |
| `journeys[].source` | `jira` \| `inferred` \| `user` | Provenance |
| `journeys[].ac_ids` | string[] | Related acceptance criteria |
| `steps[].id` | string | Stable step id (filename-safe) |
| `steps[].name` | string | Human label |
| `steps[].route` | string | Path appended to `--base-url` (leading `/` preferred) |
| `steps[].export` | boolean | When true, included in batch export |
| `steps[].actions` | Action[] | Optional UI actions before capture |

## Actions

| `type` | Fields | Behavior |
|--------|--------|----------|
| `click` | `selector` | Click first matching element |
| `fill` | `selector`, `value` | Fill input |
| `wait_for` | `selector`, `timeout_ms?` | Wait until visible (default 10000) |
| `wait` | `ms` | Fixed delay |
| `press` | `key`, `selector?` | Keyboard press |

Use stable selectors (`data-ouia-component-id`, roles, labels). Avoid brittle
generated class names.

## Export defaults

- If a journey has steps but none set `export`, treat every step as `export: true`
  when running `export-journey.mjs` with `--export-all-if-unset` (create `--export`
  enables this).
- Otherwise only steps with `"export": true` are captured.
