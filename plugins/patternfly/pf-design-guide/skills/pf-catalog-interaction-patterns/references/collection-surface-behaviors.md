# Collection surface behaviors

Use this reference when a Table, Toolbar, Pagination, EmptyState, and loading/error feedback work together as one collection view. These are application-level coordination behaviors, not new PatternFly component guarantees or adopted cross-product policy.

Baseline component guidance is not repeated here. Table Design covers column sorting and selection controls; Pagination Design covers pagination controls and unknown-total presentation; Empty State Design covers state types and recovery actions. This reference adds only URL/query coordination, refetch toolbar behavior, state branching, and duplicate-action coordination.

## Server-sorted list state

**Applicability:** List views where the server performs sorting.

**Required state/data:** Active sort column and direction, current page or pagination position, and the URL query parameters that carry them.

**Default behavior:**

1. Preserve sort state in the URL so reload, back/forward, and shared links restore the same ordering.
2. When sorting changes, reset pagination to the beginning. The previous page position no longer refers to the same rows.

**Exceptions:** Do not assume filters, page size, or cursors are URL-backed because sorting is. State explicitly which parts of the view state live in the URL. Parameter names and sort-direction encoding are application choices.

**Verify:** Change the sort from a later page and confirm the first page loads. Reload and navigate back/forward, and confirm the sort is restored.

## Filters and cursor pagination in history lists

**Applicability:** Time-ordered execution or history lists that use cursor pagination. Do not generalize to every list.

**Required state/data:** Active filters, current cursor, and the cursor history needed to support the pagination controls in use.

**Default behavior:**

1. Coordinate filters and cursor pagination as one query state.
2. When any filter changes, reset the cursor to the beginning. An old cursor is not valid for a different result set.

**Exceptions:** Whether to use cursor pagination, and at what list size, is product policy. Do not adopt a fixed item-count threshold as a universal rule. Filters and cursors are not URL-backed unless the application says so.

**Verify:** Advance past the first page, change a filter, and confirm the first results for the new filter are shown. Confirm the previous cursor is not sent.

## Toolbar state during refetch

**Applicability:** List refetches (for example after a filter, sort, or page change) where the Toolbar's filter and action controls would otherwise accept input against stale or in-flight state.

**Required state/data:** Refetch-in-progress status for the collection query.

**Default behavior:**

1. While the list refetches, disable the collection Toolbar's wrapped filter and action controls as one group.
2. Provide a screen-reader legend for that disabled group, so assistive technology users learn why the controls are unavailable.

**Exceptions:** Scope this to the collection Toolbar's filter/action group. Do not extend it to every control on the page. This reference does not define a retained-row policy or a live-region announcement policy; add those only as separately reviewed decisions.

**Verify:** Trigger a refetch and confirm the grouped controls are disabled and the legend is exposed to a screen reader. Confirm they re-enable when the refetch settles, including on error.

## Collection state branching

**Applicability:** Collection views with a filter bar and a result area.

**Required state/data:** Query status (loading/error), whether any results exist, and whether any filters are active.

**Default behavior:** Branch in this order:

1. **Query loading or error:** show loading or error feedback.
2. **Truly empty, no active filters:** show the empty state and hide the filter bar, since there is nothing to filter.
3. **Data, or an active-filter empty result:** keep the filter bar. Render filtered-empty content inside the result area, so users can adjust or clear filters.

**Unresolved:** Source material is inconsistent about what "truly empty" means. One statement hides filters only for a resource that has never had data. Another uses the current condition of no data and no active filters. Implement the current-condition version only if the product confirms it, and do not invent historical-state tracking. Flag the discrepancy for design review.

**Verify:** Cover loading, error, no data without filters (no filter bar), a filter that matches nothing (filter bar retained, empty content inside the results), and normal data.

## Empty-state primary action

**Applicability:** Views where the empty state owns the primary create or configure action.

**Default behavior:** When the empty state shows that action, hide the equivalent page-header action rather than rendering it twice. Show the header action when the empty state is not visible.

**Exceptions:** Applies only when both actions perform the same operation. Do not hide unrelated header actions.

**Verify:** In the truly empty state, exactly one create/configure action is present. Once data exists, the header action returns.

## Official guidance

| Source | Use |
|--------|-----|
| [Table design guidelines](https://www.patternfly.org/components/table/design-guidelines/) | Baseline sorting and selection |
| [Pagination design guidelines](https://www.patternfly.org/components/pagination/design-guidelines/) | Pagination controls, unknown totals |
| [Toolbar design guidelines](https://www.patternfly.org/components/toolbar/design-guidelines/) | Filter and action grouping |
| [Empty state design guidelines](https://www.patternfly.org/components/empty-state/design-guidelines/) | State types and recovery actions |

If MCP is available, retrieve version-matched guidance and examples with `searchPatternFlyDocs` and `usePatternFlyDocs`. Otherwise use the linked guidance and state any verification gaps.
