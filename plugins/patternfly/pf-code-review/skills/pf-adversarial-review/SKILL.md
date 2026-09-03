---
name: pf-adversarial-review
description: Review PatternFly React components for unhandled edge cases and missing defensive code. Use when auditing components for production readiness or stress-testing before a release.
---

# PF Adversarial Review

Probe PatternFly React components for unhandled edge cases, missing defensive code, and gaps in error handling. Focus on **PF-specific failure modes** — prop combinations that break component contracts, missing UI states, and boundary conditions that cause silent failures or crashes.

## PatternFly API documentation

If PatternFly documentation tools are available, use them to verify component props and expected behavior before flagging edge cases. Without documentation available, rely on the edge-case tables and contract rules in this skill.

## Input

The user provides a file path, directory, or component to review. Default to the current working directory. Focus on `.tsx` and `.jsx` files that import from `@patternfly/*` packages.

## Edge-case categories

### 1. Prop boundary conditions

Test each component's props with values at the extremes:

| Input type | Edge cases to try |
|-----------|-------------------|
| **Strings** | Empty `""`, whitespace-only `"   "`, very long (1000+ chars), strings with HTML/script tags, Unicode/emoji, RTL text |
| **Numbers** | `0`, negative, `NaN`, `Infinity`, very large (1e15), floats where integers expected |
| **Arrays** | Empty `[]`, single item, 1000+ items, arrays with `null`/`undefined` elements |
| **Objects** | Empty `{}`, deeply nested (10+ levels), circular references, missing expected keys |
| **Callbacks** | `undefined` (when optional), functions that throw, async callbacks where sync expected |
| **Booleans** | Truthy/falsy coercion — `0`, `""`, `null` passed where boolean expected |
| **Children** | No children, `null`, `undefined`, fragments, deeply nested children, mixed text and elements |

### 2. Missing defensive patterns

Flag components that lack:

- **Optional chaining** on object props that could be `undefined`
- **Default values** for optional props used in rendering logic
- **Type guards** before `.map()`, `.length`, `.toString()` on untyped data
- **Nullish checks** before accessing nested properties from API responses
- **Array bounds checks** when indexing into arrays from props or state
- **Error boundaries** around components that render external/dynamic data

### 3. Silent runtime failures from PF API misuse

Check for misuse of PatternFly component APIs that fails silently. For structural composition rules (required parent-child hierarchies), defer to `pf-component-structure-audit`:

- **Table**: `Td` without `dataLabel` in responsive mode — content vanishes on mobile
- **Select/Dropdown**: Missing `onSelect` handler — selections don't register
- **Tabs**: Duplicate `eventKey` values — wrong tab renders
- **Pagination**: `count` of `0` with no empty state guard — shows "0 of 0"
- **Wizard**: Step `name` collisions — navigation breaks silently
- **DualListSelector**: Empty `availableOptions` without empty state — blank panel

### 4. Async and state race conditions

- Component unmounts before async callback resolves (state update on unmounted component)
- Rapid re-renders during data fetching — stale closures showing old data
- Missing loading states between request and response
- Error state not cleared when retrying a failed request

### 5. Composition edge cases

- Components rendered conditionally with `&&` where the left operand is `0` or `""` (renders `0` or empty string instead of nothing)
- Fragments as children where the parent expects a single element
- Components that spread `...props` without filtering PF-specific props from DOM attributes

## Rules

- Test the component as rendered, not the PatternFly library internals
- Focus on props and state the consuming application controls
- Do not flag edge cases already handled by defensive code — read the implementation before reporting
- Prioritize crashes and data loss over cosmetic issues
- When a component handles an edge case correctly, note it as a strength — don't only report problems
- Do not fabricate line numbers — read the actual source file

## Fix recommendations

When recommending fixes, use PF6 components:

- **Missing error states** → `Alert` with `variant="danger"` or `EmptyState` with error icon
- **Missing loading states** → `Spinner` (indeterminate) or `Skeleton` (content placeholder)
- **Missing empty states** → `EmptyState` with `titleText` and action button
- **Overflow/truncation** → `Truncate` component or `isTruncated` prop
- **Error boundaries** → React `ErrorBoundary` wrapping dynamic content sections

## Report format

Group findings by severity. Each finding includes the code location, the edge case that triggers it, and a specific fix.

```markdown
## Adversarial Review: [ComponentName]

### Critical — crashes or data loss

- **file.tsx:42** — `items.map()` crashes when `items` is `undefined`
  Edge case: parent renders before API response
  Fix: default to empty array — `const items = data?.items ?? [];`

### High — silent failures or broken UI

- **file.tsx:78** — Pagination shows "0 of 0" when data is empty
  Edge case: API returns empty array
  Fix: guard with EmptyState when `items.length === 0`

### Medium — degraded experience

- **file.tsx:23** — Long usernames overflow Card title
  Edge case: 100+ character display name
  Fix: add `isTruncated` to `CardTitle` or use `Truncate`

### Summary

Tested: [N] components | Critical: [N] | High: [N] | Medium: [N]
```

Do not fabricate file paths or line numbers — read the actual source files before reporting.
