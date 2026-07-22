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
Brainstorm which scenarios to include: [scenario-brainstorm.md](scenario-brainstorm.md).

## Rules

1. Every page with entries in `scenarios.json` must pick mock data **and/or seed
   UI end-state** from `UxdScenario.get()` on mount/render.
2. Key mock datasets (and end-state appliers) by scenario `id` (`default`,
   `empty`, `load-error`, `exact-match`, …).
3. Fall back to `default` when an unknown id is present.
4. Do **not** use scenarios for modal/drawer open — those stay as journey `actions`.
5. Selecting a scenario must land on the intended end-state **with no further
   clicks**. If the user still has to open a modal or click Load to see the
   scenario, the page is not wired correctly.
6. Prefer persistent alerts/toasts for scenario landing (so exports still show
   them). Avoid timeout-only toasts as the sole signal of a scenario.

## Workspace (React) — alternate list data

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

## Workspace (React) — post-action outcome / end-state

When a scenario represents the result of a primary action (entity loaded,
related resource auto-selected, toast/alert shown), **seed that state on mount**.
Do not require the user to re-run the action.

```tsx
function applyPromptLoadOutcome(version, availableModelIds, setters) {
  setters.setLoadedPrompt(/* prompt + version */);
  setters.setSystemPrompt(version.promptText);
  if (!version.associatedModelId) return;
  const match = resolveModelMatch(version.associatedModelId, availableModelIds);
  if (match?.kind === 'exact' || match?.kind === 'suffix') {
    setters.setSelectedModel(match.modelId);
    setters.setModelAutoSelectedFromPrompt(match.modelId);
  } else {
    setters.setModelUnavailableFromPrompt(version.associatedModelId);
  }
}

useEffect(() => {
  const scenario =
    (window.UxdScenario && window.UxdScenario.get()) || 'default';
  if (scenario === 'default') return;
  const seed = SCENARIO_SEEDS[scenario]; // prompt + expected outcome flags
  if (!seed) return;
  applyPromptLoadOutcome(seed.version, availableModelIds, setters);
  // override-after-unavailable: also setSelectedModel(seed.overrideModelId)
  // and clear unavailable toast once recovered
}, []);
```

Reuse the same apply helper from interactive flows (modal confirm) so scenario
seeds and real clicks stay consistent.

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

For outcome scenarios in standalone HTML, swap the visible end-state (filled
fields, selected control, toast markup) when `UxdScenario.get()` is read — same
as the React seed pattern.

## Reachability check

After implementing, confirm each non-default scenario for a page:

1. Open with `?scenario=<id>` (bar Scenario menu or typing the query).
2. The intended end-state is visible **immediately** (no extra clicks).
3. The UI is visually distinct from `default` and from every other scenario on
   that page (different data, selection, empty/error chrome, and/or alerts).

Two scenarios that look identical after load are a fail — merge them or fix the
mock wiring.
