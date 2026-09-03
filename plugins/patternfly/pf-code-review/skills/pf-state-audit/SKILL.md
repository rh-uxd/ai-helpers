---
name: pf-state-audit
description: Audit PatternFly React components for missing UI states — loading, error, empty, and unauthorized. Use when reviewing data-dependent components or auditing a page for production readiness.
---

# PF State Audit

Audit PatternFly React components for missing UI states. Every data-dependent component should handle four states: **loading**, **error**, **empty**, and **unauthorized**. Teams consistently miss 2 of 4 — this skill finds the gaps and recommends the right PF6 component for each.

## PatternFly API documentation

If PatternFly documentation tools are available, use them to verify component props and variant values before recommending. Without documentation available, rely on the component recommendations and signal tables in this skill.

## Input

The user provides a directory, file path, or set of components to audit. Default to the current working directory. Limit scope to files importing from `@patternfly/*` packages.

## Audit procedure

1. **Identify data-dependent components** — components that fetch, receive, or display dynamic data (API responses, query results, user-generated content). Look for:
   - `useEffect` / `useQuery` / `useSWR` / `fetch` / `axios` calls
   - Props typed as arrays or objects that come from parent data-fetching
   - Components rendering `.map()` over data arrays
   - Components with loading/error state variables

2. **Check each component for all four states:**

### Loading state

The component should show a loading indicator while data is being fetched.

| Signal | What to flag |
|--------|-------------|
| `isLoading` / `loading` state exists but no loading UI rendered | Missing loading UI |
| Data fetch starts on mount but component renders data immediately | No loading guard |
| Loading state exists but uses a bare "Loading..." text string | Should use PF component |

**PF6 recommendation:**
- **`Spinner`** — indeterminate loading, no content shape known
- **`Skeleton`** — content placeholder when layout shape is known (tables, cards, text blocks)
- Use `Skeleton` for page loads where layout is predictable; `Spinner` for actions and modals

### Error state

The component should display an error when data fetching fails.

| Signal | What to flag |
|--------|-------------|
| `.catch()` or `onError` exists but error state isn't rendered | Swallowed error |
| Error state renders `null` or empty fragment | Silent failure |
| Error shown as raw `error.message` without formatting | Should use PF component |
| Error state doesn't offer a retry action | Missing recovery path |

**PF6 recommendation:**
- **`Alert`** with `variant="danger"` — inline error within a page section
- **`EmptyState`** with error icon — full-page or panel-level error
- Include a retry action: `Alert` with `actionLinks` or `EmptyState` with primary action button

### Empty state

The component should communicate when data exists but the result set is empty.

| Signal | What to flag |
|--------|-------------|
| `.map()` on data array with no empty guard | Renders nothing when array is `[]` |
| `data?.length === 0` check exists but renders `null` | Silent empty |
| Empty state shows raw text without structure | Should use PF component |
| Table renders headers with no rows and no explanation | Confusing empty table |

**PF6 recommendation:**
- **`EmptyState`** with `titleText` and descriptive body — always
- For filtered results: add a "Clear filters" action
- For first-time use: add a "Get started" primary action
- Use `EmptyStateIcon` with contextual icon (search, plus-circle, cubes)

### Unauthorized state

The component should handle cases where the user lacks permission to view or modify data.

| Signal | What to flag |
|--------|-------------|
| API returns 401/403 but component shows generic error | Missing authz-specific UI |
| Role-based UI gating exists but no explanation shown when gated | Silent permission denial |
| Admin-only actions visible but disabled without explanation | Confusing disabled state |

**PF6 recommendation:**
- **`EmptyState`** with lock icon and "You don't have access" message
- Include a "Request access" action when applicable
- Use `Alert` with `variant="warning"` for partial access (can view but not edit)

## Rules

- Only flag components that are **data-dependent** — pure layout components, icons, and static content don't need all four states
- Do not flag components where a parent already handles the state (e.g., a page wrapper shows a Spinner while child components wait)
- When a component handles 3 of 4 states, flag only the missing one — don't repeat what's working
- Treat `unauthorized` as lower priority than loading/error/empty — not all components have permission concerns
- Distinguish between `Spinner` and `Skeleton` recommendations — `Skeleton` is the better choice when the content layout is known

## Report format

```markdown
## State Audit: [directory or component]

### Missing States

| Component | File | Missing | Recommendation |
|-----------|------|---------|---------------|
| UserList | src/UserList.tsx:15 | empty | `EmptyState` with search icon and "No users found" |
| DashboardCards | src/Dashboard.tsx:42 | loading, error | `Skeleton` for cards; `Alert variant="danger"` for fetch errors |

### Coverage Summary

| State | Covered | Missing | Coverage |
|-------|---------|---------|----------|
| Loading | 8 | 2 | 80% |
| Error | 6 | 4 | 60% |
| Empty | 5 | 5 | 50% |
| Unauthorized | 3 | 7 | 30% |

**Components audited:** [N] | **Fully covered:** [N] | **Gaps found:** [N]
```

Do not fabricate file paths or line numbers — read the actual source files before reporting.
