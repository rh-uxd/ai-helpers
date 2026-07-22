# Scenario mock data convention

Pages switch data/condition variants via the URL query param `?scenario=<id>`
(default when absent: `default`). The Prototype Bar Scenario menu and
`export-journey.mjs` use the same contract.

Runtime helper (installed with the Prototype Bar): `window.UxdScenario`

| API | Behavior |
|-----|----------|
| `UxdScenario.get()` | Active scenario id (`default` if unset) |
| `UxdScenario.set(id)` | Sets `?scenario=` and reloads the page |
| `UxdScenario.subscribe(cb)` | Optional; called with the id after `set` (before reload) |

Schema for the catalog: `uxd-prototype-export/references/scenarios-schema.md`.

## Rules

1. Every page with entries in `scenarios.json` must pick mock data (or UI branch)
   from `UxdScenario.get()`.
2. Key mock datasets by scenario `id` (`default`, `empty`, `load-error`, …).
3. Fall back to `default` when an unknown id is present.
4. Do **not** use scenarios for modal/drawer open — those stay as journey `actions`.

## Workspace (React) example

```ts
// src/mocks/apiKeys.ts
export const apiKeyMocks = {
  default: [{ id: '1', name: 'ci-bot', created: '2026-01-10' }],
  empty: [],
  'load-error': null, // page treats null as fetch failure
};

export function getApiKeysForScenario(scenarioId?: string) {
  const id = scenarioId || (window.UxdScenario && window.UxdScenario.get()) || 'default';
  return Object.prototype.hasOwnProperty.call(apiKeyMocks, id)
    ? apiKeyMocks[id as keyof typeof apiKeyMocks]
    : apiKeyMocks.default;
}
```

```tsx
// Optional helper copied by install-prototype-bar (workspace):
import { useUxdScenario } from '../components/uxd-prototype-bar/useUxdScenario';

export function ApiKeyList() {
  const scenario = useUxdScenario();
  const keys = getApiKeysForScenario(scenario);
  if (keys === null) return <EmptyState title="Unable to load API keys" />;
  if (!keys.length) return <EmptyState title="No API keys yet" />;
  return <Table rows={keys} />;
}
```

If `useUxdScenario` is not installed, call `window.UxdScenario.get()` once at
render (or on mount). The bar reload on scenario change is enough for most prototypes.

## Standalone HTML example

```html
<script src="./uxd-prototype-bar/uxd-scenario-runtime.js"></script>
<script>
  var MOCKS = {
    default: [{ name: 'ci-bot' }],
    empty: [],
    'load-error': null,
  };
  var scenario = window.UxdScenario.get();
  var data = MOCKS[scenario] !== undefined ? MOCKS[scenario] : MOCKS.default;
  // render table / empty / error from data
</script>
```

## Reachability check

After implementing, confirm each non-default scenario for a page can be opened with
`?scenario=<id>` (bar Scenario menu or typing the query) and shows the intended UI.
