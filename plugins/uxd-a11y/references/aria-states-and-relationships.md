# ARIA states and relationships

Use for custom widgets and exposed component state. Native semantics come first; absence of redundant ARIA is not a defect. Inspect the actual role, permitted attributes, defaults, and transitions, not an attribute checklist applied to every element.

## ARIA-01 — States match the interaction model

| Interaction | Source expectations and exceptions |
|---|---|
| Checkbox, radio, switch | Native checked state is sufficient. Custom roles expose checked state; `mixed` applies to checkbox/menuitemcheckbox, not radio/switch. |
| Toggle button | `aria-pressed` exposes toggle state (including mixed where meaningful). Prefer a stable label in this model; a changing action label can instead describe an ordinary button. |
| Disclosure or popup trigger | Expose expanded state where the pattern requires it. `aria-haspopup` must match the popup type; `true` means menu. Not every dynamic update is a popup. |
| Selection | Use the pattern's selected or checked model consistently. Listbox options can use checked instead of selected; do not demand both. Native selection is sufficient. |
| Disabled/read-only | Native attributes supply semantics and behavior where supported. `aria-disabled` alone neither removes focus nor prevents activation; check handlers. Read-only and disabled are different states. |
| Required/invalid | Follow the forms reference. Apply only to roles supporting these states. |
| Range values | Check current value and meaningful bounds against the role. Accept native and role defaults; indeterminate progress omits `aria-valuenow`. Spinbutton bounds can be unknown. Use value text when numbers do not convey meaning. |
| Orientation/multiple selection | Respect role-specific defaults, not a universal horizontal default. Expose nondefault orientation and multiselection where the role/pattern requires them. |
| Autocomplete | Describe actual input completion behavior on supported roles; do not confuse ARIA autocomplete with HTML autofill tokens. |
| Sorting | Expose the current sort on the appropriate header. Do not demand `aria-sort="none"` on every unsorted column. |

Verify updates when application state changes. A declaration is evidence of wiring, not proof that keyboard or assistive-technology behavior works.

## ARIA-02 — Relationships resolve to the intended objects

- Tokenize ID-reference lists (`aria-labelledby`, `aria-describedby`, `aria-controls`, `aria-owns`) and resolve each target in the relevant tree scope. Check duplicates, conditional rendering, repeated instances, and shadow-root boundaries.
- Names and descriptions have different purposes and role restrictions. Do not name generic containers to compensate for unnamed descendants. Global description support is not identical to permission to name a role.
- Controls identifies controlled content; it does not move focus or establish ownership. A portal does not automatically require `aria-owns`; unnecessary ownership can distort reading order.
- Active descendant identifies the active item while DOM focus remains elsewhere. Check role support and the required descendant/ownership relationship, including permitted controlled-popup relationships. An arbitrary existing ID is insufficient.
- Current identifies the current item in a set; selection and focus are separate concepts. Use an appropriate current token and avoid multiple current items in the same set unless the model justifies it.
- Error-message references must identify relevant error content when invalid. Check visibility and relationships; use the forms reference rather than assuming every field requires `aria-errormessage`.

## Sources

- [WAI-ARIA roles, required states, defaults, and ID relationships](https://www.w3.org/TR/wai-aria-1.2/)
- [ARIA in HTML: allowed roles and attributes](https://www.w3.org/TR/html-aria/)
- [APG patterns](https://www.w3.org/WAI/ARIA/apg/patterns/) — choose the actual widget pattern; APG guidance is distinct from a WCAG failure.
