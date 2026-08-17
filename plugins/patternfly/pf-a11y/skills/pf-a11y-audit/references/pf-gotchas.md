# PatternFly Accessibility Gotchas

Common accessibility mistakes specific to PatternFly components. These are patterns where PatternFly provides the mechanism for accessibility, but developers must use it correctly.

## Duplicate Default Accessible Names

Some PatternFly components ship with default `aria-label` values. When multiple instances appear on the same page, these defaults create duplicate accessible names — screen reader users cannot distinguish between them.

The following are common examples, but this list is not exhaustive. Check the documentation for any PatternFly component to see if it provides a default accessible name.

| Component | Default Label | Fix |
|-----------|--------------|-----|
| ClipboardCopy | "Copy to clipboard" | Pass unique `aria-label`: `aria-label="Copy API key"` |
| SearchInput | "Search" | Pass `aria-label`: `aria-label="Search deployments"` |
| Pagination | "Pagination" | Pass `aria-label`: `aria-label="Cluster list pagination"` |
| OverflowMenu | "Actions" | Pass `aria-label`: `aria-label="User row actions"` |
| Toolbar | None by default | Add `aria-label` when multiple Toolbars exist: `aria-label="User table toolbar"` |
| ActionList | None by default | Add `aria-label` on the wrapping element when multiple ActionLists exist on a page |

**Rule of thumb:** If more than one instance of the same PatternFly component exists on a page, every instance should have a unique accessible name that describes its specific purpose in context. Use `aria-label` for a self-contained name, or `aria-labelledby` to reference a visible heading or label element on the page.

In React, pass the `aria-label` or `aria-labelledby` prop. In HTML/CSS, set the attribute directly on the element.

## Navigation Landmarks

Every `Nav` component renders a `<nav>` landmark. If a page has more than one (sidebar, breadcrumb, footer), each must have a unique `aria-label` or `aria-labelledby`. PatternFly does not auto-generate unique labels.

```tsx
// BAD: Two unlabeled <nav> landmarks
<Nav><NavList>...</NavList></Nav>
<Nav><NavList>...</NavList></Nav>

// GOOD: Unique labels
<Nav aria-label="Main navigation"><NavList>...</NavList></Nav>
<Nav aria-label="Footer links"><NavList>...</NavList></Nav>
```

Other PatternFly components that create HTML landmarks needing labels when duplicated:
- `PageSection` renders `<section>` — only labeled sections are exposed as landmarks
- Sidebar content may render `<aside>` — label when multiple complementary regions exist

## Form Accessibility

### FormGroup without label

`FormGroup` associates its `label` prop with the child input via `id`/`htmlFor`. Omitting `label` breaks the association.

```tsx
// BAD: No label association
<FormGroup>
  <TextInput id="name" />
</FormGroup>

// GOOD: Label is associated
<FormGroup label="Name" fieldId="name">
  <TextInput id="name" />
</FormGroup>
```

### HelperText without variant

When showing validation state, `HelperText` must use the appropriate `variant` for proper `aria-live` announcement and visual indication:
- `variant="error"` — when validation fails
- `variant="warning"` — when input is accepted but has concerns
- `variant="success"` — when validation passes and confirmation is helpful

Using only color or custom text to convey validation state misses the accessible indication. The `variant` prop ensures assistive technology announces the state change.

### Required fields

Use `isRequired` on `FormGroup` — this renders the required indicator AND sets `aria-required="true"` on the associated input. Do not set `aria-required` manually alongside `isRequired`.

## Interactive Patterns

### Icon-only buttons

Buttons with only an icon and no visible text need both an accessible name and a `Tooltip` so that all users can understand the button's purpose:

```tsx
// BAD: Screen readers announce "button" with no context, sighted users have no label
<Button variant="plain"><TrashIcon /></Button>

// GOOD: Descriptive label and tooltip
<Tooltip content="Delete deployment">
  <Button variant="plain" aria-label="Delete deployment"><TrashIcon /></Button>
</Tooltip>
```

### Toggle state and ARIA attributes

PatternFly components that toggle state (Accordion, ExpandableSection, Card, Drawer) manage `aria-expanded` internally via their `isExpanded` or `isOpen` prop. Consumers must:
1. Use the PatternFly prop (not a manual `aria-expanded` attribute)
2. Not pass both `aria-expanded` and `isExpanded` — this creates conflicts where the two values may diverge

### Popover and Tooltip

- `Popover` requires `aria-label` or `headerContent` for its accessible name
- When a `Tooltip` has content identical to its trigger's accessible name (e.g., the trigger button already has `aria-label="Delete"` and the tooltip also says "Delete"), pass `aria="none"` and `aria-live="off"` on the `Tooltip` to prevent duplicate announcements. Without this, screen readers might announce the same text twice — once from the `aria-label` and once from the tooltip's `aria-describedby`.

```tsx
// BAD: "Delete" is announced twice
<Tooltip content="Delete">
  <Button aria-label="Delete"><TrashIcon /></Button>
</Tooltip>

// GOOD: Tooltip visible for sighted users, no duplicate announcement
<Tooltip content="Delete" aria="none" aria-live="off">
  <Button aria-label="Delete"><TrashIcon /></Button>
</Tooltip>
```

When the tooltip provides additional context beyond the accessible name (e.g., button has `aria-label="Delete"` and tooltip says "Delete this deployment permanently"), keep the default `aria-describedby` behavior — the extra detail is useful.

## Table Accessibility

### Table without an accessible name

A `Table` should have an accessible name for screen reader context. If the table has a `caption` element, that provides the accessible name automatically. Otherwise, add `aria-label` or `aria-labelledby`:

```tsx
// GOOD: Caption provides the accessible name
<Table>
  <Caption>Cluster inventory</Caption>
  ...
</Table>

// GOOD: aria-label when no caption is present
<Table aria-label="Cluster inventory">...</Table>

// GOOD: aria-labelledby referencing a visible heading
<Title headingLevel="h2" id="table-title">Cluster inventory</Title>
<Table aria-labelledby="table-title">...</Table>
```

### Missing dataLabel on Td

Every `Td` should have a `dataLabel` prop for responsive views. When the table collapses on small screens, `dataLabel` becomes the visible column header for that cell.

### Sortable columns

Use PatternFly's `sort` prop on `Th` — it handles `aria-sort` automatically. Do not manually manage `aria-sort` values.

## Alert and Notification Patterns

### AlertGroup live region

When alerts appear dynamically (toast notifications), wrap them in `AlertGroup` with `isLiveRegion`. Without this, screen readers miss dynamically added alerts.

```tsx
// BAD: Dynamic alerts not announced
<AlertGroup>{alerts.map(a => <Alert .../>)}</AlertGroup>

// GOOD: Dynamic alerts announced
<AlertGroup isLiveRegion>{alerts.map(a => <Alert .../>)}</AlertGroup>
```

### Alert variant semantics

PatternFly Alert maps `variant` to the correct ARIA role:
- `variant="danger"` with `isLiveRegion` uses `role="alert"` (assertive — interrupts the user)
- Other variants with `isLiveRegion` use `role="status"` (polite — waits for a pause)

Do not override the role manually unless you have a specific reason.

### Important alerts should not be toast alerts

Alerts that require user attention or interaction should not be rendered as toast alerts. Toast alerts appear temporarily and may be difficult for users to reach quickly. Users of screen magnification technology may not notice a toast alert if it appears outside their magnified viewport. For important or actionable alerts, use inline or persistent alert placements instead.

## Modal Accessibility

### Missing accessible name

Modal requires either `aria-label` or `aria-labelledby` pointing to the modal title:

```tsx
<Modal aria-labelledby="modal-title" isOpen={open} onClose={close}>
  <ModalHeader title="Confirm deletion" labelId="modal-title" />
  <ModalBody>Are you sure?</ModalBody>
  <ModalFooter>...</ModalFooter>
</Modal>
```

### Focus trap conflicts

PatternFly Modal handles focus trapping automatically. Do not add custom focus trap libraries alongside PatternFly Modal — they conflict and cause unexpected focus behavior.
