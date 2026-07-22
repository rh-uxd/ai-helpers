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
| Journey step | `{out}/{journeyId}/{stepId}.html` |
| Ad-hoc / bar | `{out}/current/{slug}-{timestamp}.html` |

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
| `{stepId}.tree.json` | Nested nodes: `{ name, props?, children[] }` |
| `{stepId}.tree.txt` | Indented outline for quick reading |

Max depth default: 25. Host components preferred over DOM leaf noise (skip pure
text wrappers when walking fiber).
