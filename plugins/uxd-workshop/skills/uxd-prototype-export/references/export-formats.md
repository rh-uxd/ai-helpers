# Export Formats

## Static HTML

A single `.html` file that opens in a browser with no build step and no external
CSS dependencies required for paint.

### Capture rules

1. Clone the live DOM after paint (React hydration complete).
2. Remove `#uxd-prototype-bar` (and related style tags) from the clone before serialize.
3. Inline `<link rel="stylesheet">` contents when same-origin or fetchable.
4. Append a `<style>` block of computed styles for elements that still lack rules
   when stylesheet inlining fails (CORS / CDN failures).
5. Convert same-origin `<img src>` to data URIs when feasible; leave cross-origin
   URLs unchanged (document in the skill summary if any remain).

### Not in scope (v1)

- Rehydrating React or restoring click handlers
- Full SingleFile parity for fonts / service workers

### Filename conventions

| Source | Path |
|--------|------|
| Journey step × scenario | `{out}/{journeyId}/{stepId}--{scenarioId}.html` |
| Export gallery | `{out}/index.html` |
| Manifest | `{out}/export-manifest.json` |
| Ad-hoc / bar | `{out}/current/{slug}-{timestamp}.html` |

Batch export navigates with `?scenario=<id>` (omitted for `default`), runs any
journey step `actions`, then captures. See `scenarios-schema.md`.

---

## Component tree

Structured outline of the UI hierarchy for the current view.

### Sources (priority)

1. **React fiber** — walk from the root fiber when `__REACT_DEVTOOLS_GLOBAL_HOOK__`
   or a fiber on a DOM node is available. Label: `source: "react-fiber"`.
2. **DOM fallback** — element tag + meaningful attributes (`id`, `data-ouia-component-id`,
   `aria-label`, role). Label: `source: "dom-fallback"`.

### Outputs

| File | Content |
|------|---------|
| `{stepId}--{scenarioId}.tree.json` | Nested nodes: `{ name, props?, children[] }` |
| `{stepId}--{scenarioId}.tree.txt` | Indented outline for quick reading |

Max depth default: 25. Host components preferred over DOM leaf noise (skip pure
text wrappers when walking fiber).

---

## PF implementation spec (`pf-spec`)

Agent-oriented PatternFly component specification for the current view. Maps the
live DOM to PF React components (OUIA types + `pf-v5`/`pf-v6` CSS classes), collapses
non-PF wrappers, and includes a deduplicated import list plus structure warnings.

Use this when a future implementation agent should rebuild the UI from an exact
PF tree instead of guessing from screenshots. Scenario coverage comes from
`scenarios.json` + journey step actions (batch export), not heuristic discovery.

### Source

- **DOM → PF** — `source: "dom-pf"` via `scripts/export-pf-spec.js` /
  `templates/export-pf-spec.browser.js`

### Outputs

| File | Content |
|------|---------|
| `{stepId}--{scenarioId}.pf-spec.json` | Full spec: `componentList`, `layout`, `tree`, `warnings`, scenario metadata |
| `{stepId}--{scenarioId}.pf-spec.txt` | Indented PF layout summary (`|-- FormGroup "Name" *required`) |
| `implementation-spec.json` | Rolled-up catalog of all `pf-spec` captures from a batch export |

### Spec shape (JSON)

```json
{
  "source": "dom-pf",
  "url": "http://localhost:3000/api-keys?scenario=empty",
  "title": "API keys",
  "scenarioId": "empty",
  "componentList": [
    { "name": "EmptyState", "importFrom": "@patternfly/react-core" },
    { "name": "PageSection", "importFrom": "@patternfly/react-core" }
  ],
  "layout": "PageSection\n|- EmptyState \"No API keys\"\n  |- EmptyStateBody \"…\"",
  "tree": { "component": "PageSection", "importFrom": "@patternfly/react-core", "props": {}, "children": [] },
  "warnings": [
    { "severity": "warning", "message": "Chip is deprecated in PF v6 — use Label instead", "suggestion": "Label" }
  ],
  "extractedAt": "2026-07-22T14:00:00Z"
}
```

### Regenerating the browser bundle

After editing `scripts/export-pf-spec.js`:

```bash
node scripts/export-pf-spec.js --write-browser
```
