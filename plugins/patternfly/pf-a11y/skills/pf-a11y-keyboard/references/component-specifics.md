# Component-Specific Keyboard Behaviors

Keyboard interaction expectations for specific PatternFly components. These supplement the general criteria in `keyboard-criteria.md`. When a component on the page matches one of these patterns — either by using the PatternFly component directly or by implementing a similar custom component (matched by accessible name, role, or structural pattern) — apply the component-specific expectations in addition to the general criteria.

---

## BackToTop

A "back to top" button that scrolls the user to the top of the page or content area.

### Expected keyboard behavior

- On activation (Enter or Space), focus moves to the top of the context's content (typically the beginning of the main page content area).
- Focus should land on the main content container or the first focusable element at the top of the content.

### How to identify

PatternFly `BackToTop` component, or any element whose accessible name includes "back to top" or similar.

---

## CalendarMonth

A calendar grid for date selection.

### Expected keyboard behavior

- All four arrow keys navigate between days:
  - **Right arrow** — moves focus to the next day.
  - **Left arrow** — moves focus to the previous day.
  - **Down arrow** — moves focus to the same day of the next week.
  - **Up arrow** — moves focus to the same day of the previous week.
- Arrow navigation crosses month boundaries when moving past the first or last day of the displayed month.

### How to identify

PatternFly `CalendarMonth` component, or any `role="grid"` element containing date cells.

---

## Drag and Drop

Draggable content that can be reordered or moved via keyboard. This includes any component that implements drag-and-drop functionality (e.g., `DataList` with draggable rows).

### Expected keyboard behavior

- Each draggable item has a drag handle button that is focusable via Tab.
- **Enter or Space** on the drag handle enters "dragging" state.
- While in dragging state:
  - **Arrow keys** move the item's position (Up/Down for vertical lists, Left/Right for horizontal or grid layouts).
  - **Enter or Space** confirms and drops the item in its new position.
  - **Escape** cancels the drag and returns the item to its original position.
- Focus remains on the drag handle button before and after initiating or completing a drag operation.
- Screen reader announcements communicate the drag state and position changes (if verifiable via accessibility tree).

### How to identify

PatternFly drag-and-drop implementations, or any element with `role="button"` whose accessible name indicates dragging (e.g., "Drag", "Reorder"), combined with list items that can change order.

### Notes

It may be difficult to fully test drag-and-drop interactions via Playwright MCP. If drag-and-drop keyboard interaction cannot be verified, note this in the report and recommend manual testing.

---

## JumpLinks

A set of anchor links that navigate to sections within the same page.

### Expected keyboard behavior

- Activating a jump link item (Enter) moves focus to the corresponding content section.
- The target section should be focusable (via `tabindex="-1"` or a focusable element within it) so that focus visibly moves.

### How to identify

PatternFly `JumpLinks` component, or a navigation element (`role="navigation"`) containing anchor links that target `#id` sections on the same page.

---

## Menu — Drilldown

A menu implementation where activating certain items navigates into a nested submenu view (drilldown pattern), replacing the current menu content.

### Expected keyboard behavior

- Activating a menu item that has drilldown functionality (Enter or Space) navigates into the submenu.
- Focus moves to the first focusable element of the new drilldown context.
- A "back" mechanism (Back button, Escape, or Left arrow — implementation-dependent) returns to the parent menu level.
- On returning, focus moves to the item that was previously focused in the parent menu.

### How to identify

PatternFly `Menu` with `drilldownItemPath` or nested `MenuList` drill-in behavior, or any menu structure where activating an item replaces the visible menu content with a submenu.

---

## Navigation — Flyout

A navigation item that opens a flyout submenu on hover or keyboard activation.

### Expected keyboard behavior

- **Enter, Space, or Right arrow** on a nav item with flyout functionality opens the flyout menu.
  - If the nav item also acts as a link, Right arrow opens the flyout while Enter/Space may navigate the link (implementation-dependent).
- **Left arrow or Escape** closes the currently opened flyout menu.
- **On open:** Focus moves to the first nav item in the newly opened flyout.
- **On close:** Focus returns to the nav item that previously had focus (the item that triggered the flyout).

### How to identify

PatternFly `Nav` with `flyout` props, or any navigation structure where hovering or activating a nav item reveals a secondary navigation panel.

---

## Tooltip

Any element that has a tooltip applied to it.

### Expected keyboard behavior

- The element with the tooltip must be focusable (natively or via `tabindex="0"`).
- The tooltip appears when the element receives focus.
- **Escape** dismisses the tooltip while the element retains focus.
- The tooltip also appears on hover (mouse), but the keyboard focus trigger is the accessibility-critical path.

### How to identify

Any element that displays a `role="tooltip"` element on hover. PatternFly `Tooltip` component wrapping any element, or custom tooltip implementations.

### Notes

If a non-interactive element has a tooltip but is not focusable, this is a violation — the tooltip content is inaccessible to keyboard users. Flag both the missing focusability and the unreachable tooltip.

---

## TreeView — Basic

A hierarchical tree structure with expandable/collapsible nodes.

### Expected keyboard behavior

- **Up/Down arrow** moves focus between visible tree items.
- **Right arrow** on a collapsed node expands it. On an expanded node, moves focus to the first child.
- **Left arrow** on an expanded node collapses it. On a collapsed or leaf node, moves focus to the parent node.
- **Enter or Space** activates/selects the focused tree item.
- **Home** moves focus to the first tree item. **End** moves focus to the last visible tree item.

### How to identify

PatternFly `TreeView` component in its basic (default) configuration, or any `role="tree"` with `role="treeitem"` children where selection and expansion are handled by the same element.

---

## TreeView — Separate Selection and Expansion

A tree view variant where the expand/collapse toggle and the tree item node for selection are two separate focusable elements.

### Expected keyboard behavior

- Each tree item row contains two focusable elements: an expand toggle and a selectable node.
- **Left/Right arrow** moves focus horizontally between the expand toggle and the selectable node within the same row.
- **Up/Down arrow** moves focus vertically between rows.
- The expand toggle responds to Enter or Space to expand/collapse.
- The selectable node responds to Enter or Space to select.
- Left/Right arrow keys do **not** handle expansion/collapse in this variant (unlike basic TreeView).

### How to identify

PatternFly `TreeView` with separate expand and select controls, or any `role="tree"` implementation where each row contains multiple independently focusable interactive elements.

---

## Menu — Items with Additional Actions

A Menu or menu-like component where menu items have additional action elements alongside them (e.g., the structure is, horizontally: menu item → action button).

### Expected keyboard behavior

- **Right arrow** moves focus from the main menu item to its additional action(s).
- **Left arrow** moves focus back from the additional action(s) to the main menu item.
- **Up/Down arrow** still moves between menu item rows (vertical navigation).
- Enter or Space activates whichever element currently has focus (the menu item or the action).

### How to identify

PatternFly `Menu` with `actions` prop on `MenuItem`, or any menu structure where each row contains a primary item and secondary interactive elements arranged horizontally.
