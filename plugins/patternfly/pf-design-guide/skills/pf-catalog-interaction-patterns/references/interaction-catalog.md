# PatternFly Interaction Catalog

Components indexed by the user interactions they support. Use this catalog to find the right component for a given interaction need.

**Important**: PatternFly does not trigger Popovers, Menus, or Dropdowns on hover. These are click-activated. Only Tooltip and Truncate respond to hover.

---

## Click — Single-click actions

### Toggle state (on/off)

| Component | Behavior |
|-----------|----------|
| Switch | Binary toggle with visible on/off state |
| ToggleGroup | Mutually exclusive or multi-select button group |
| Checkbox | Check/uncheck for multi-select scenarios |
| Radio | Select one option from a group |
| MenuToggle | Opens/closes an attached Menu or Select |

### Trigger action

| Component | Behavior |
|-----------|----------|
| Button | Primary action trigger; supports variants (primary, secondary, danger, link) |
| ActionList | Grouped actions, often in toolbars or card footers |
| OverflowMenu | Click to reveal additional actions that don't fit |

### Expand/collapse content

| Component | Behavior |
|-----------|----------|
| ExpandableSection | Click header to show/hide content region |
| Card (expandable) | Click toggle to expand card body |
| Accordion | Click item to expand; optionally collapses siblings |
| TreeView | Click node to expand/collapse children |
| DataList (expandable) | Click row to reveal detail content |
| Table (expandable) | Click row to reveal nested content |

### Open overlay

| Component | Behavior |
|-----------|----------|
| Modal | Click trigger to open; click backdrop or X to close |
| Drawer | Click trigger to slide panel in from edge |
| Popover | Click trigger to show contextual content (NOT hover) |
| Wizard | Click actions to progress through steps |

### Navigate

| Component | Behavior |
|-----------|----------|
| Nav | Click item to navigate; supports nested groups |
| Breadcrumb | Click crumb to navigate up hierarchy |
| Tabs | Click tab to switch visible panel |
| Pagination | Click page number or prev/next to paginate |
| JumpLinks | Click link to scroll to section |

---

## Hover — Hover-triggered behaviors

**PatternFly hover behaviors are limited by design.** Interactive content should be click-accessible.

| Component | Behavior |
|-----------|----------|
| Tooltip | Displays on hover after configurable delay; auto-positions |
| Truncate | Shows full text on hover when content overflows |
| Table (hoverable rows) | Visual hover state for row; does NOT trigger actions |
| DataList (hoverable rows) | Visual hover state; does NOT trigger actions |

**Not hover-triggered** (common misconception):
- Popover — click only
- Menu — click only
- Select — click only

---

## Keyboard — Keyboard interaction patterns

### Arrow navigation

| Component | Keys | Behavior |
|-----------|------|----------|
| Menu | ↑↓ | Move focus between items |
| Select | ↑↓ | Navigate options |
| Tabs | ←→ | Move between tabs (horizontal); ↑↓ (vertical) |
| Nav | ↑↓ | Navigate items within a group |
| TreeView | ↑↓←→ | Navigate and expand/collapse nodes |
| DataList | ↑↓ | Navigate rows |
| Table | ↑↓ | Navigate rows (when keyboard navigation enabled) |
| Calendar | ←→↑↓ | Navigate dates |
| DualListSelector | ↑↓ | Navigate items in each pane |

### Type-ahead / search

| Component | Behavior |
|-----------|----------|
| Select (typeahead) | Type to filter options |
| Menu (searchable) | Type in search input to filter |
| ComboBox | Type to filter or enter custom value |
| TreeView (searchable) | Type to filter visible nodes |

### Enter/Space activation

| Component | Behavior |
|-----------|----------|
| Button | Activates on Enter or Space |
| Checkbox | Toggles on Space |
| Radio | Selects on Space |
| Switch | Toggles on Space |
| MenuToggle | Opens menu on Enter or Space |
| ExpandableSection | Toggles on Enter or Space |
| Accordion item | Expands on Enter or Space |

### Escape to close

| Component | Behavior |
|-----------|----------|
| Modal | Closes and restores focus |
| Drawer | Closes panel |
| Popover | Closes popover |
| Menu | Closes and returns focus to toggle |
| Select | Closes dropdown |
| DatePicker | Closes calendar |
| Wizard | Closes wizard (if modal) |

### Tab navigation

| Component | Behavior |
|-----------|----------|
| Form | Tab moves between form fields |
| Toolbar | Tab moves between toolbar items |
| Card | Tab moves to interactive elements within |
| Modal | Tab cycles within modal (focus trap) |

---

## Drag — Drag-and-drop interactions

| Component | Behavior |
|-----------|----------|
| DragDrop | Reorder items within a list or transfer between lists |
| DualListSelector | Drag items between available/chosen panes |
| Table (with DragDrop) | Reorder table rows |
| DataList (with DragDrop) | Reorder data list items |
| Drawer (resizable) | Drag edge to resize panel width |
| Sidebar (resizable) | Drag edge to resize sidebar |

---

## Focus — Focus management patterns

### Focus trap

| Component | Behavior |
|-----------|----------|
| Modal | Traps focus within modal while open |
| Wizard | Traps focus within wizard dialog |
| Drawer (modal) | Traps focus when `isInline={false}` |
| Popover | Traps focus when interactive content present |

### Focus restore

| Component | Behavior |
|-----------|----------|
| Modal | Returns focus to trigger on close |
| Drawer | Returns focus to trigger on close |
| Popover | Returns focus to trigger on close |
| Menu | Returns focus to MenuToggle on close |
| Select | Returns focus to toggle on close |

### Roving tabindex

| Component | Behavior |
|-----------|----------|
| Menu | Single tab stop; arrows move within |
| Tabs | Single tab stop; arrows move between tabs |
| ToggleGroup | Single tab stop; arrows move between toggles |
| ActionList | Single tab stop with arrow navigation |

---

## Selection — Selection patterns

### Single select

| Component | Behavior |
|-----------|----------|
| Select | Choose one option from list |
| Radio | Choose one option from group |
| Menu (single-select) | Choose one item |
| Tabs | One tab active at a time |
| ToggleGroup (single) | One toggle active |

### Multi-select

| Component | Behavior |
|-----------|----------|
| Select (multi) | Choose multiple options with checkboxes |
| Checkbox group | Multiple independent selections |
| ToggleGroup (multi) | Multiple toggles can be active |
| Table (with selection) | Select multiple rows |
| DataList (with selection) | Select multiple items |
| DualListSelector | Select items to transfer |

### Bulk selection

| Component | Behavior |
|-----------|----------|
| Table (bulk select) | Select all / deselect all via header checkbox |
| DataList (bulk select) | Bulk selection toolbar pattern |
| Toolbar (bulk select) | Bulk selection dropdown with count |
