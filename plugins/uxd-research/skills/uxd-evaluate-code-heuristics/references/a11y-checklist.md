# Accessibility Checklist — Code Review

Code-level accessibility checks for UI markup and interactive elements.
Derived from the `pf-a11y-audit` skill in rh-uxd/ai-helpers (patternfly
plugin). This is a framework-agnostic interim version — universal
WCAG/WAI-ARIA criteria extracted from expert-written references. To be
replaced when the a11y author ships a dedicated framework-agnostic
version.

> **WCAG reference: 2.2** (W3C Recommendation, October 2023).

> **General principle:** Prefer native HTML elements (`<button>`,
> `<input>`, `<select>`) over ARIA attributes. Native elements provide
> accessible semantics, keyboard behavior, and state management for
> free. ARIA should only be used when native elements cannot achieve
> the required pattern.

## Code signals — scan for these in the diff

- Interactive elements: `<button>`, `<a>`, `<input>`, `<select>`,
  `<textarea>`, custom components with click/key handlers
- ARIA attributes: `aria-label`, `aria-labelledby`, `aria-describedby`,
  `aria-expanded`, `aria-selected`, `aria-live`, `role`
- Dynamic content: content added/removed/updated after initial render
- Images and icons: `<img>`, `<svg>`, icon components
- Form patterns: labels, helper text, validation states, required fields
- Modal/dialog/popover patterns: focus management, overlay content

When none of these signals appear in the diff, skip this dimension.

---

## Checks

### 1. Accessible Names (WCAG 4.1.2)

Every interactive element must have an accessible name that describes
its purpose.

**ERROR — flag these:**
- Button with only an icon child and no `aria-label`
- Link with no text content and no `aria-label`
- Form input with no associated `<label>`, `aria-label`, or
  `aria-labelledby`
- Image (`<img>`) with no `alt` attribute (unless decorative)

**WARN — flag these:**
- Generic labels: "Click here", "Submit", "OK", "Link" on interactive
  elements where more specific text is possible
- `aria-label` on an element that already has identical visible text
  (redundant — prefer the visible text)

### 2. Unique Accessible Names (WCAG 4.1.2)

When multiple instances of the same control appear on a page (e.g., a
"Delete" button in each table row), each must have a unique accessible
name so assistive technology users can distinguish them.

**ERROR — flag these:**
- Multiple buttons/controls with identical `aria-label` or identical
  visible text in a repeating context (table rows, list items, cards)
  where context differs

**Suggested fix:** Include the distinguishing context in the label —
e.g., `aria-label="Delete deployment-01"` instead of `aria-label="Delete"`.

### 3. ARIA Attribute Correctness (WCAG 4.1.2)

ARIA attributes must be used correctly per the WAI-ARIA 1.2 spec.

**ERROR — flag these:**
- `aria-expanded` present on a non-expandable element, or missing on an
  expandable toggle. Must always be `"true"` or `"false"`, never omitted
  when the element is collapsed.
- `aria-selected` missing on options in a listbox or tablist. Every
  option must have `aria-selected="true"` or `aria-selected="false"`,
  not just the selected one.
- `aria-checked` missing on custom ARIA role checkbox/switch/radio
  elements. Must be `"true"`, `"false"`, or `"mixed"`. Native
  `<input>` elements expose this state automatically.
- `aria-label` or `aria-labelledby` applied to a generic container
  (`<div>`, `<span>`) that has no semantic role.
- `aria-describedby` or `aria-labelledby` referencing an `id` that does
  not exist in the document.

**WARN — flag these:**
- Both `aria-expanded` and a framework prop that controls expansion are
  set — these can diverge and create conflicting states.
- `role` attribute that conflicts with the element's native semantics
  (e.g., `role="button"` on an `<a>` when a `<button>` would be
  correct).

### 4. Live Region Announcements (WCAG 4.1.3)

Dynamic content that appears, updates, or changes state must be
announced to assistive technology.

**ERROR — flag these:**
- Status messages, alerts, or notifications rendered dynamically without
  `aria-live`, `role="alert"`, or `role="status"`
- Toast/notification patterns that appear and disappear without any live
  region wrapper

**WARN — flag these:**
- `aria-live="assertive"` used for non-urgent updates (should be
  `"polite"` — assertive interrupts the user)
- Content that updates frequently (loading progress, streaming text)
  without `aria-busy="true"` during updates
- Alerts requiring user interaction rendered as temporary toast
  notifications (users may not reach them in time)

### 5. Landmark Labeling (WCAG 1.3.1)

When multiple landmarks of the same type exist on a page, each must have
a unique label.

**ERROR — flag these:**
- Multiple `<nav>` elements without unique `aria-label` or
  `aria-labelledby`
- Multiple `<section>` elements intended as landmarks without unique
  labels

### 6. Form Accessibility (WCAG 1.3.1, 3.3.1, 3.3.2)

Form inputs must have associated labels and communicate validation state
accessibly.

**ERROR — flag these:**
- `<input>`, `<select>`, or `<textarea>` with no associated label
  (via `<label>` element, `aria-label`, or `aria-labelledby`)
- Required fields with no `aria-required="true"` or `required` attribute
- Validation errors shown only by color change or custom text without
  `aria-invalid="true"` on the input

**WARN — flag these:**
- Helper text or error messages not associated with their input via
  `aria-describedby` or `aria-errormessage`

### 7. Focus Management (WCAG 2.4.3, 2.1.2)

Modals, dialogs, drawers, and popovers must manage focus correctly.

**ERROR — flag these:**
- Modal/dialog opens without moving focus into it
- Modal/dialog closes without returning focus to the trigger element
- Focus trap missing on modal dialogs (user can tab out of the modal
  into background content)

**WARN — flag these:**
- Custom focus trap implementation when the UI framework provides one
  natively (potential conflicts)
- Popover or dropdown with no Escape key handler to close

**When to skip:** The modal/dialog component is known to manage focus
internally (e.g., a component library that handles focus trapping and
return-focus via its own props). Only flag when focus management is
the developer's responsibility.

### 8. Decorative vs. Meaningful Content (WCAG 1.1.1)

Decorative elements must be hidden from assistive technology.
Meaningful elements must be exposed.

**ERROR — flag these:**
- Decorative icon or image with meaningful `alt` text or missing
  `aria-hidden="true"` (announced unnecessarily)
- Meaningful image or icon with `alt=""` or `aria-hidden="true"`
  (hidden when it should be announced)
- Information conveyed by color alone with no text, icon, or pattern
  alternative

---

## Severity definitions

- **ERROR** — WCAG Level A or AA violation. Must be fixed.
- **WARN** — Best-practice gap. Should be fixed but does not violate a
  specific success criterion.

## Exception handling

Do NOT flag:
- Test files, storybook stories, or mock data (unless explicitly
  requested)
- ARIA attributes that the UI framework manages internally (e.g., a
  component library that sets `aria-expanded` automatically via its own
  state prop)
- Decorative elements correctly marked with `alt=""` or
  `aria-hidden="true"`
- Code in comments or disabled code blocks
