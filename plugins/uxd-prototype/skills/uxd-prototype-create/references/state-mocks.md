# State mock data convention

Pages switch data/condition variants via the URL query param `?state=<id>`
(default when absent: `default`). The Prototype Bar and `export-journey.mjs`
use the same contract.

Runtime helper (installed with the Prototype Bar): `window.UxdScenario`

| API | Behavior |
|-----|----------|
| `UxdScenario.get()` | Active state id from `?state=` (`default` if unset) |
| `UxdScenario.set(id)` | Sets `?state=` and reloads the page |
| `UxdScenario.subscribe(cb)` | Optional; called with the id after `set` (before reload) |

Field rules: `uxd-prototype-export/references/states-schema.md`.
The catalog file is `states.json`; each page's collection key is `states`.
Brainstorm which states to include: [state-brainstorm.md](state-brainstorm.md).

## Rules

1. Every page with entries in `states.json` must pick mock data **and/or seed
   UI end-state** from `UxdScenario.get()` on mount/render.
2. Key mock datasets (and end-state appliers) by state `id` (`default`,
   `empty`, `load-error`, `exact-match`, …).
3. Fall back to `default` when an unknown id is present.
4. Do **not** use states for modal/drawer open — those stay as journey `actions`.
5. Selecting a state must land on the intended end-state **with no further
   clicks**. If the user still has to open a modal or click Load to see the
   state, the page is not wired correctly.
6. Prefer persistent alerts/toasts for state landing (so exports still show
   them). Avoid timeout-only toasts as the sole signal of a state.

## Workspace (React) — alternate list data

```ts
// src/mocks/apiKeys.ts
export const apiKeyMocks = {
  default: [{ id: '1', name: 'ci-bot', created: '2026-01-10' }],
  empty: [],
  'load-error': null, // page treats null as fetch failure
};

export function getApiKeysForState(stateId?: string) {
  const id = stateId || (window.UxdScenario && window.UxdScenario.get()) || 'default';
  return Object.prototype.hasOwnProperty.call(apiKeyMocks, id)
    ? apiKeyMocks[id as keyof typeof apiKeyMocks]
    : apiKeyMocks.default;
}
```

```tsx
// Optional helper copied by install-prototype-bar (workspace):
import { useUxdScenario } from '../components/uxd-prototype-bar/useUxdScenario';

export function ApiKeyList() {
  const state = useUxdScenario();
  const keys = getApiKeysForState(state);
  if (keys === null) return <EmptyState title="Unable to load API keys" />;
  if (!keys.length) return <EmptyState title="No API keys yet" />;
  return <Table rows={keys} />;
}
```

If `useUxdScenario` is not installed, call `window.UxdScenario.get()` once at
render (or on mount). The bar reload on state change is enough for most prototypes.

## Workspace (React) — post-action outcome / end-state

When a state represents the result of a primary action (entity loaded,
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
  const state =
    (window.UxdScenario && window.UxdScenario.get()) || 'default';
  if (state === 'default') return;
  const seed = STATE_SEEDS[state]; // prompt + expected outcome flags
  if (!seed) return;
  applyPromptLoadOutcome(seed.version, availableModelIds, setters);
  // override-after-unavailable: also setSelectedModel(seed.overrideModelId)
  // and clear unavailable toast once recovered
}, []);
```

Reuse the same apply helper from interactive flows (modal confirm) so state
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
  var state = window.UxdScenario.get();
  var data = MOCKS[state] !== undefined ? MOCKS[state] : MOCKS.default;
  // render table / empty / error from data
</script>
```

For outcome states in standalone HTML, swap the visible end-state (filled
fields, selected control, toast markup) when `UxdScenario.get()` is read — same
as the React seed pattern.

## Reachability check

After implementing, confirm each non-default state for a page:

1. Open with `?state=<id>` (Prototype Bar menu or typing the query).
2. The intended end-state is visible **immediately** (no extra clicks).
3. The UI is visually distinct from `default` and from every other state on
   that page (different data, selection, empty/error chrome, and/or alerts).

Two states that look identical after load are a fail — merge them or fix the
mock wiring.
