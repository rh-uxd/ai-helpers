# Rendered Semantic-Tree Evaluation

Inspect the rendered accessibility tree first, then use DOM inspection to explain missing, flattened, duplicated, or unexpected semantics. Source markup alone cannot show the final tree after framework rendering, portals, conditional content, and ARIA name computation.

## Baseline inventory

Capture the tree after the page settles and identify:

- Page title and primary heading
- Landmarks and their accessible names
- Interactive elements with names, roles, states, and values
- Lists, tables, forms, status regions, and alerts
- Dialogs, menus, drawers, popovers, tabs, trees, and grids
- Content omitted from the tree or exposed unexpectedly

Repeat the snapshot after significant state changes, route changes, validation, loading completion, and overlay transitions.

## Evaluation areas

### Headings and regions

- Headings describe the content and form a logical hierarchy.
- A single page-level heading is a useful convention, but do not report the number of `h1` elements as a WCAG failure without a real structural problem.
- The page exposes one primary `main` landmark.
- Repeated navigation, complementary, form, or region landmarks have distinct accessible names.
- Landmark nesting matches the intended document structure.

### Names, roles, states, and relationships

- Interactive elements have accurate, contextual accessible names.
- Native controls retain their native semantics; custom controls expose the required role and interaction model.
- Expanded, selected, checked, pressed, current, invalid, required, and disabled states match the visible UI.
- `aria-labelledby`, `aria-describedby`, ownership, and control relationships resolve to the intended elements.
- Icon-only controls and repeated controls have distinguishable names.

### Reading and interaction order

- Accessibility-tree and DOM order follow the intended reading sequence.
- Visual reordering does not create a contradictory keyboard or reading order.
- Portaled content appears in a meaningful context and has an operable focus path.
- Hidden, inert, collapsed, or off-screen content is not exposed or focusable unexpectedly.

### Collections and data

- Lists expose list and item semantics when the grouping conveys meaning.
- Data tables expose headers and associations appropriate to their complexity.
- Composite widgets expose their container and item roles, current state, and active item consistently.

### Dynamic communication

- Errors, loading completion, save results, filters, and other important updates use an appropriate live-region or status pattern.
- Announcements are not duplicated by overlapping live regions or simultaneous name changes.
- Dialog and overlay names and descriptions remain correct after content changes.

## Evidence and classification

For failures, capture the relevant tree excerpt, DOM relationship, focused element, visible label, and UI state. Distinguish:

- **Violation** — demonstrable WCAG A/AA failure
- **Best-practice gap** — usability or PatternFly guidance without a clear WCAG failure
- **Needs manual verification** — behavior such as announcement timing or complex screen-reader interaction that the available tree cannot establish

Accessibility-tree inspection approximates what assistive technology receives but does not replace testing with representative screen readers, browsers, platforms, and users.
