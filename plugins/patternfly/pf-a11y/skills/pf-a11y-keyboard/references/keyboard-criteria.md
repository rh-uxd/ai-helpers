# Keyboard Accessibility Criteria

Testable keyboard accessibility rules for PatternFly-based applications. Each criterion describes expected keyboard behavior, how to test it, and common violations. Criteria are ordered by recommended testing sequence.

---

## Criterion 1 — Skip Navigation

A skip link is the first focusable element on the page, allowing keyboard users to bypass repetitive navigation and jump directly to the main content area. Test this first, before any other keyboard interaction.

### What to test

- Navigate to the page or refresh it.
- Press Tab once.
- Check whether the first focused element is a skip link (PatternFly `SkipToContent` component or a similar `<a>` element that targets `#main-content` or equivalent).
- Activate the skip link and verify focus moves to the main content area.

### Expected behavior

- The very first Tab press focuses a skip link.
- The skip link is visually hidden until focused (becomes visible on focus).
- Activating the skip link moves focus to the main content container.
- The skip link text clearly communicates its purpose (e.g., "Skip to main content").

### Common violations

- No skip link exists.
- Skip link exists but is not the first focusable element.
- Skip link target does not exist or does not receive focus when activated.
- Skip link is permanently hidden and never becomes visible on focus.

### Notes

If no PatternFly `SkipToContent` component is detected, use best judgment based on context. A custom implementation that achieves the same effect is acceptable. Single-component demos or isolated test pages may not require a skip link — mark as N/A with explanation.

### Default severity

Major

---

## Criterion 2 — Sequential Navigation

Tab and Shift+Tab move focus sequentially through all interactive and truncated elements in logical DOM order.

### What to test

- Press Tab repeatedly from the beginning of the page.
- Press Shift+Tab to reverse direction.
- Observe which elements receive focus and in what order.

### Expected behavior

- Every interactive element (`button`, `a[href]`, `input`, `select`, `textarea`, custom controls with `tabindex="0"`) receives focus via Tab.
- Truncated text elements with tooltips or expandable behavior are focusable.
- Focus order follows a logical reading order (generally left-to-right, top-to-bottom for LTR layouts).
- No focus traps occur in non-modal contexts — Tab always moves forward.
- Hidden or disabled elements do not receive focus, but `aria-disabled` elements do.

### Common violations

- Custom interactive elements missing `tabindex="0"`.
- Decorative or non-interactive elements with `tabindex="0"` causing unnecessary tab stops.
- Focus order broken by CSS positioning that visually reorders elements without changing DOM order.
- Truncated content not keyboard-accessible (tooltip or expansion not reachable).

### Default severity

Major

---

## Criterion 3 — Scrollable Containers

Scrollable containers must be focusable and scrollable via keyboard so that keyboard users can access all content within them, equivalent to a mouse user scrolling with a scroll wheel.

### What to test

- Identify containers on the page with overflow content (visible scrollbars or clipped content).
- Attempt to Tab to the scrollable container.
- Once focused, press arrow keys (Up/Down for vertical scroll, Left/Right for horizontal scroll) to scroll the content.

### Expected behavior

- Scrollable containers are focusable (via `tabindex="0"` or by being a natively focusable element).
- **Up/Down arrow** scrolls vertically within the container.
- **Left/Right arrow** scrolls horizontally within the container (if horizontally scrollable).
- The container has an accessible label or role so assistive technology users understand it is a scrollable region (e.g., `role="region"` with `aria-label`).

### Common violations

- Scrollable container has no `tabindex` and cannot receive focus — keyboard users cannot scroll it at all.
- Container is focusable but arrow keys do not scroll (key events intercepted or not handled).
- No accessible label on the scrollable region — assistive technology users have no indication the region is scrollable.

### Default severity

Critical

---

## Criterion 4 — Activation Methods

Interactive elements must respond to the correct keyboard activation keys based on their role. Test this during the sequential navigation pass (Criterion 2) — as each element receives focus, verify its activation behavior.

### What to test

- Focus each interactive element via Tab.
- Press Space, then Enter, and observe which key triggers activation.
- Verify the element's activation behavior matches its role.

### Expected behavior

| Role | Enter | Space | Notes |
|------|-------|-------|-------|
| Button (`<button>`, `role="button"`) | Activates | Activates | Both keys must work |
| Link (`<a href>`, `role="link"`) | Activates | Scrolls page | Space must NOT activate links |
| Checkbox (`role="checkbox"`) | — | Toggles | Enter may submit a parent form |
| Radio (`role="radio"`) | — | Selects | Arrow keys move between radios in a group |
| Tab (`role="tab"`) | Selects | Selects | Tab and Shift+Tab is used to navigate between tabs |

### Common violations

- Non-native elements with a role and only an `onClick` handler (e.g., `<div role="button" onClick={...}>`, `<div role="checkbox" onClick={...}>`) — `onClick` is not triggered by keyboard on non-native elements, so neither Space nor Enter will activate them without explicit `onKeyDown` handling.
- Links implemented as `<a>` without `href` but with `onClick` — may not respond to Enter without explicit keyboard handling.

### Default severity

Major

---

## Criterion 5 — Menu Navigation

Within menu-like contexts (Menu, Select, Dropdown), arrow keys move between items and Enter/Space activates the focused item.

### What to test

- Open a menu-like context via its trigger.
- Press Down arrow to move to the next menu item.
- Press Up arrow to move to the previous menu item.
- Press Enter or Space on a focused menu item.
- Press Escape to close the menu.

### Expected behavior

- Down arrow moves focus to the next menu item.
- Up arrow moves focus to the previous menu item.
- Arrow navigation wraps at boundaries or stops (implementation-dependent).
- Enter activates the focused menu item (selects it, triggers its action, or navigates).
- Space activates the focused menu item (same as Enter for most menu items).
- Escape closes the menu and returns focus to the trigger.
- Home/End may jump to first/last item (optional but recommended).
- Type-ahead may move focus to matching items (optional).

### Common violations

- Arrow keys do not move focus within the menu.
- Enter/Space does not activate the focused item.
- Escape does not close the menu.
- Focus is lost after selection or after pressing Escape.

### Default severity

Major

---

## Criterion 6 — Focus Management: Opening Contexts

When an interactive element triggers a new context to appear (drawer, modal, popover), focus moves to the first focusable element in that new context. When the context is dismissed, focus returns to the triggering element.

### What to test

- Activate a trigger element (button, link, toggle) that opens a new context.
- Check where focus moves after the context appears.
- Dismiss the context (Escape, close button, or equivalent).
- Check where focus moves after dismissal.

### Expected behavior

- **On open:** Focus moves to the first focusable element inside the new context, or to the context container itself if it has `tabindex="-1"` and a label.
- **On close/dismiss:** Focus returns to the element that originally triggered the context to open.
- If the trigger is removed from the DOM on close, focus moves to a logical nearby element.

### Common violations

- Focus remains on the trigger after opening a context — user must Tab to find the new content.
- Focus moves to an unexpected element or is lost to the `<body>`.
- After dismissal, focus does not return to the trigger.
- After dismissal, focus moves to the top of the page.

### Default severity

Critical

---

## Criterion 7 — Focus Bridging: Separated DOM Contexts

When a trigger and its opened context are rendered in different DOM locations (e.g., a MenuToggle in a toolbar with its Menu appended to `<body>` via a portal), keyboard navigation must bridge the gap so users can reach the opened context without tabbing through the entire page.

### What to test

- Identify triggers whose opened context is rendered outside the trigger's DOM subtree (commonly appended to the end of `<body>`, but always when not appended directly after the trigger in the DOM).
- Activate the trigger.
- Attempt to reach the opened context via keyboard (automatic focus placement, arrow keys, or Tab, in that order).
- Verify the path from trigger to context does not require traversing unrelated page content.

### Expected behavior

One of the following must be true:

- Focus is programmatically moved into the opened context on activation (preferred).
- A single arrow key or Tab press from the trigger moves focus into the opened context.
- The context is associated via `aria-controls` or `aria-owns` and keyboard navigation is properly managed.

### Common violations

- Opened context is appended to `<body>` with no focus management — the only way to reach it is to Tab through the entire page.
- `aria-controls` is set but focus management is missing, leaving keyboard-only users stranded.
- Context receives focus on open but pressing Escape does not return focus to the trigger (see also Criterion 6).

### Default severity

Critical

---

## Criterion 8 — Focus Trapping: Modals

Modal and modal-like components (Modal, full-screen overlays, blocking dialogs) trap focus within themselves. Content behind the modal must not be reachable via keyboard.

### What to test

- Open a modal or modal-like overlay.
- Tab forward through all focusable elements inside the modal.
- Continue tabbing past the last focusable element.
- Press Shift+Tab from the first focusable element.
- Attempt to reach content behind the modal via keyboard.

### Expected behavior

- Tab from the last focusable element wraps to the first focusable element inside the modal.
- Shift+Tab from the first focusable element wraps to the last focusable element inside the modal.
- Focus never leaves the modal while it is open.
- Background content is inert via `aria-hidden="true"` on content behind the modal, the `inert` attribute, or an equivalent mechanism.
- Escape closes the modal and returns focus to the trigger (per Criterion 6).

### Common violations

- Focus escapes the modal into background content.
- Tab wraps to browser chrome instead of cycling within the modal.
- Background content remains interactive while modal is open.
- No way to close the modal via keyboard (no Escape handler, close button not focusable).

### Default severity

Critical
