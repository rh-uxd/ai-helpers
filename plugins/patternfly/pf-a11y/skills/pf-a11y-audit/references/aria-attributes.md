# ARIA Attributes Reference

ARIA attributes commonly needed and/or used in PatternFly components. For the full specification, see [WAI-ARIA 1.2](https://www.w3.org/TR/wai-aria-1.2/).

> **Component Mapping** lists PatternFly component names with the React prop name in parentheses. In the PatternFly HTML/CSS library, use the standard HTML attribute directly (e.g., `aria-expanded="true"`) instead of a framework-specific prop. The same components and patterns apply across all PatternFly implementations.

## Widget Attributes

| Attribute | Purpose | When to Use | Component Mapping |
|-----------|---------|-------------|-------------------|
| `aria-autocomplete` | Indicates the type of autocomplete interaction | Use on combobox inputs with suggestion behavior. Value is typically `"list"` (suggestions displayed), `"inline"` (text completion), or `"both"` | Handled internally by PatternFly Select with typeahead variant |
| `aria-checked` | Indicates checked state for checkboxes, switches, radios, and tri-state controls | Must always be present with `true`, `false`, or `"mixed"` (indeterminate) on elements with `role="checkbox"`, `role="switch"`, or `role="radio"`. Do not update both `aria-checked` and the element's accessible name to reflect the same state change — pick one to avoid confusion | Checkbox (`isChecked`), Switch (`isChecked`), TreeView (`checkProps.checked` on data items) |
| `aria-disabled` | Indicates element is disabled but remains focusable and visible to assistive technology | Use instead of HTML `disabled` when the element should remain focusable for discoverability, such as when a `Tooltip` accompanies the element | Button (`isAriaDisabled`), Tab (`isAriaDisabled`), MenuItem (`isAriaDisabled`) |
| `aria-expanded` | Indicates whether an expandable element is open or closed | Must always be present with `true` or `false` on expandable controls — never omit it when the element is collapsed | Accordion (`isExpanded`), Card (via CardHeader `toggleButtonProps`), ExpandableSection (`isExpanded`), MenuToggle (`isExpanded`), NavExpandable (`isExpanded`), Tabs (`isExpanded` for vertical expandable) |
| `aria-haspopup` | Indicates that the element triggers a popup (menu, listbox, dialog, etc.) | Use only when the element triggers a popup. Value should match the popup type: `"menu"`, `"listbox"`, `"dialog"`, `"grid"`, or `"tree"` | Handled internally by PatternFly menu and select patterns |
| `aria-hidden` | Removes element from the accessibility tree entirely, without visibly removing it | Use for decorative or redundant elements that should not be announced by assistive technology | No PatternFly prop — set directly on the element |
| `aria-invalid` | Indicates that the element's value has a validation error | Set to `"true"` when validation fails, remove or set to `"false"` when resolved | Checkbox (`isValid`), TextArea (`validated="error"`), FormSelect (`validated="error"`) |
| `aria-modal` | Indicates that an element is a modal, preventing interaction with content outside of it | Must be set to `"true"` on the modal container element. Does not itself trap focus or hide outside content — those must be implemented separately | Modal (automatic) |
| `aria-multiselectable` | Indicates that multiple items can be selected in a composite widget | Use only on multi-select containers | No direct PatternFly prop — set directly on multi-select containers |
| `aria-orientation` | Indicates whether element is horizontal or vertical | Use when the default orientation assumption is wrong. Defaults to horizontal for most roles; set explicitly for vertical layouts | No direct PatternFly prop — set directly when needed |
| `aria-pressed` | Indicates toggle button state (pressed or not) | Must always be present with `true` or `false` on toggle buttons. Do not update both `aria-pressed` and the element's accessible name to reflect the same state change — use one mechanism, not both, to avoid confusing announcements | No direct PatternFly prop — set manually on toggle buttons |
| `aria-readonly` | Indicates that the element is not editable but is otherwise operable | Use on read-only inputs that should still be focusable | No direct PatternFly prop — set directly on the element |
| `aria-required` | Indicates that user input is required before submission | Use on required form fields | FormGroup (`isRequired`) |
| `aria-selected` | Indicates selection state in composite widgets | Must always be present with `true` or `false` on all options in a listbox or tablist — not just the selected one. An unselected option must have `aria-selected="false"`, not a missing attribute | Tab (automatic via `activeKey`), MenuItem (`isSelected`, within a Select using `role="listbox"`), TreeView (`activeItems`) |
| `aria-sort` | Indicates the sort direction of a table column header | Set to `"ascending"`, `"descending"`, or `"none"` on sortable column headers. Only the currently sorted column should have `"ascending"` or `"descending"` — all other sortable columns should have `"none"` | Th (`sort`) — PatternFly handles `aria-sort` automatically |
| `aria-valuemin` / `aria-valuemax` / `aria-valuenow` | Indicates the minimum, maximum, and current value of a range widget | All three must be present on range widgets (sliders, progress bars, spinbuttons) | Slider (`min`, `max`, `value`), Progress (`min`, `max`, `value`) |
| `aria-valuetext` | Provides a human-readable text alternative for the current value of a range widget | Use when `aria-valuenow` alone is not meaningful — e.g., a slider with steps labeled "Low", "Medium", "High" instead of 1, 2, 3, or a progress bar showing "Step 2 of 5" instead of 40 | Progress (`valueText`), Slider (set manually) |

## Live Region Attributes

| Attribute | Purpose | When to Use | Component Mapping |
|-----------|---------|-------------|-------------------|
| `aria-atomic` | Controls whether the entire region or only changes are announced | Use with `aria-live` when the entire region content should be re-announced on any change, not just the changed portion | No PatternFly prop — set directly when needed |
| `aria-busy` | Indicates that the element is being updated and assistive technology should wait | Set to `"true"` during loading states, remove or set to `"false"` when content is ready | No PatternFly prop — use alongside Spinner or Skeleton |
| `aria-live` | Announces dynamic content changes to assistive technology | Use `"polite"` for non-urgent status updates (waits for a pause), `"assertive"` for urgent notifications (interrupts, should be used sparingly). PatternFly components handle this via dedicated props | Alert (`isLiveRegion`), AlertGroup (`isLiveRegion`) |
| `aria-relevant` | Specifies which types of changes trigger announcements (additions, removals, text) | Defaults to `"additions text"`, which is correct for most cases. Set explicitly when you need to announce removals (`"removals"`) or all changes (`"all"`) | No PatternFly prop — set directly when needed |

## Relationship Attributes

| Attribute | Purpose | When to Use | Component Mapping |
|-----------|---------|-------------|-------------------|
| `aria-activedescendant` | Identifies the currently active descendant in a composite widget when focus remains on the container | Use on composite widgets (listbox, menu, tree, grid) where the container keeps DOM focus while arrow keys move the visual highlight among descendants. Value must be the `id` of the active descendant element | Handled internally by PatternFly composite widgets (Menu, Select) |
| `aria-controls` | Identifies the element(s) controlled by the current element | Use on elements that show, hide, or otherwise control another element | ExpandableSection (via `contentId`), Tabs (automatic on tab links) |
| `aria-current` | Indicates the current item within a set (page, step, date, location) | Use on the current item in navigation, breadcrumbs, or step indicators. Value should match context: `"page"`, `"step"`, `"date"`, `"location"`, or `"true"` | NavItem (`isActive`), BreadcrumbItem (`isActive`) |
| `aria-describedby` | References one or more visible elements via space separated list of `id`'s providing supplemental description | Use for supplemental descriptions (help text, instructions), not the primary label. Never apply an `aria-describedby` to a generic container like a `div` or `span` that has no semantic role. | Modal (`aria-describedby`), Slider (`aria-describedby`) |
| `aria-errormessage` | References the element containing the error message for the current element | Use when an input has an associated error message element | No direct PatternFly prop — set directly when needed |
| `aria-label` | Provides an accessible name via human-readable string when no visible label exists | One of `aria-label` or `aria-labelledby` is required on landmarks, widgets, and interactive elements without visible text. Never apply an `aria-label` to a generic container like a `div` or `span` that has no semantic role. | Passed directly on most PatternFly components via `aria-label` prop |
| `aria-labelledby` | References one or more visible elements via space separated list of `id`'s that serves as the accessible name | Alternative to `aria-label`. Preferred when a visible label already exists on the page — avoids duplicating text. Never apply an `aria-labelledby` to a generic container like a `div` or `span` that has no semantic role. | Modal (`aria-labelledby` + ModalHeader `labelId`), Slider (`aria-labelledby`) |
| `aria-owns` | Defines parent-child relationship when DOM order differs from logical hierarchy | Use when controlled elements are rendered outside the DOM parent (e.g., portaled menus or listboxes) | No PatternFly prop — rare use-case, set directly when needed |

## Key Roles

Roles that PatternFly components commonly use. The component handles the role internally — consumers generally do not need to set these manually.

| Role | Purpose | PatternFly Component |
|------|---------|----------------------|
| `role="alert"` | Urgent notification (inherently sets `aria-live="assertive"`) | Alert with `variant="danger"` and `isLiveRegion` |
| `role="alertdialog"` | Dialog requiring immediate user response | Modal (set manually for critical confirmations) |
| `role="dialog"` | Dialog with focus trap, either modal or non-modal | Modal, Popover |
| `role="listbox"` / `role="option"` | Selection list | Select (via Menu with `role="listbox"`) |
| `role="menu"` / `role="menuitem"` | Action menu | Menu, MenuItem, Dropdown, DropdownItem |
| `role="navigation"` | Navigation landmark (via `<nav>` element) | Nav |
| `role="progressbar"` | Progress indication | Progress |
| `role="status"` | Non-urgent status message (inherently sets `aria-live="polite"`) | Alert with `isLiveRegion` (non-danger variants) |
| `role="tablist"` / `role="tab"` / `role="tabpanel"` | Tabbed interface | Tabs, Tab |
| `role="tree"` / `role="treeitem"` | Hierarchical list | TreeView |
