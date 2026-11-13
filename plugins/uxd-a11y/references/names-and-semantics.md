# Names and semantics: dialog slice

Load for dialog source or rendered inspection. These rules are independent of a component library.

## NAME-01 — A dialog has an accessible name

Inspect the dialog itself, not just its heading. A native `<dialog>` supplies a role but still needs a name; a custom dialog needs an appropriate role and name. Prefer association with a visible title (`aria-labelledby`); `aria-label` is a valid alternative. A heading inside a dialog does not automatically name the dialog.

Resolve each whitespace-separated ID reference in the actual document/tree. Check uniqueness and intended text, not merely the presence of an attribute. Distinguish the dialog's name from optional supplemental description. Long structured content need not be flattened into `aria-describedby`; users should be able to navigate that structure.

Source inspection establishes wiring, not the final computed name in every rendered state. Inspect rendered semantics when available; do not infer an AT announcement from a name snapshot. A confirmed missing dialog name can support WCAG 4.1.2; document the evidence.

## NAME-02 — Controls remain identifiable

Opening and closing controls need appropriate native semantics or equivalent role/keyboard behavior and meaningful names. Text content can name a button; do not require redundant `aria-label`. Icon-only controls need a naming mechanism. A visible label should be represented in the accessible name where WCAG 2.5.3 applies.

Do not prescribe different names for every repeated control without considering purpose and context. Avoid naming generic containers as a substitute for naming the actual control.

## Sources

- [WAI-ARIA dialog role](https://www.w3.org/TR/wai-aria-1.2/#dialog)
- [Accessible name computation](https://www.w3.org/TR/accname-1.2/)
- [WCAG 4.1.2](https://www.w3.org/WAI/WCAG22/Understanding/name-role-value.html)
- [WCAG 2.5.3](https://www.w3.org/WAI/WCAG22/Understanding/label-in-name.html)
