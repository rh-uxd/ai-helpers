# PatternFly modal responsibilities

Load only for PatternFly code. Determine the installed version from the project lockfile/package and inspect corresponding types, source, or documentation. If available, PF MCP can help retrieve documentation; it is not required. If version/API evidence is unavailable, report uncertainty instead of inventing a prop.

This slice is exercised with `@patternfly/react-core` 6.7.0. Other versions need verification. PF HTML/CSS alone does not imply React's focus behavior.

## Consumer review

- `Modal` controls visibility through `isOpen`; the consumer updates that state in dismissal callbacks such as `onClose`. Inspect Escape overrides rather than assuming they close it.
- In 6.7.0, omitting both naming props falls back to a self-referencing label that can include the modal content. Inspect the computed name: do not report it as absent merely because the consumer omitted a prop. Recommend a concise intended title association when the fallback is unhelpful.
- Wire `aria-labelledby` to the rendered title, for example `ModalHeader labelId`; `aria-label` can name a modal without a title. Use description only when appropriate to the content.
- `elementToFocus` can choose an appropriate initial target, including a focusable static introduction. Verify the target exists when opened.
- Inspect `disableFocusTrap` and custom focus code. Do not ask consumers to add a second focus-trap library or redundant ARIA that the component already owns.
- Verify restoration, background isolation, portaled content, and dismissal at runtime. Component defaults do not establish that a particular composition works.

## Provider-author review

Inspect prop-to-DOM wiring, meaningful defaults, focus lifecycle, cleanup, background state, and consumer API documentation. Identify whether a failure belongs to the library or its use; do not prescribe a consumer workaround as though it repaired the library contract.

Use the same [modal checks](modal-dialog.md) for PF and native examples. Avoid copying keyboard expectations into this provider file.

## Sources

- [PF modal accessibility](https://www.patternfly.org/components/modal/accessibility/)
- [PF modal source](https://github.com/patternfly/patternfly-react/blob/main/packages/react-core/src/components/Modal/Modal.tsx) (main is moving; installed source takes precedence for API facts)
