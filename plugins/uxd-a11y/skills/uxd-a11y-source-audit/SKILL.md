---
name: uxd-a11y-source-audit
description: Audit UI source for accessible names, structure, ARIA states, forms, updates, and modal behavior. Use for native HTML, custom components, or framework code, with conditional PatternFly guidance.
version: 0.2.0
audience: "UI developers and accessibility reviewers"
inputs: "Source files, directory, or diff and the intended user task"
outputs: "Source findings and checks needing runtime verification"
---

This workflow reviews source evidence; it does not establish complete WCAG conformance or replace runtime, visual, or assistive-technology checks. Review-only requests do not authorize source edits.

## References

Load references as needed for the steps below:

- [Reporting](../../references/reporting.md) — establish scope, record evidence, and present findings.
- [Names and semantics](../../references/names-and-semantics.md) — inspect names, native structure, landmarks, and decorative content.
- [ARIA states and relationships](../../references/aria-states-and-relationships.md) — load for widget states and ID relationships.
- [Forms and updates](../../references/forms-and-updates.md) — load for inputs, validation, and dynamic messages.
- [Modal expectations](../../references/modal-dialog.md) — load for dialogs; evaluate modality and focus lifecycle.
- [PF responsibilities](../../references/patternfly-source.md) — load only for PatternFly code; verify provider and consumer responsibilities against the installed version.

## Method

1. **Establish scope.** Use the reporting reference. Honor the requested files, directory, or diff; read adjacent definitions only as needed to resolve behavior. Identify native HTML, custom implementation, or library use, and provider-author versus consumer responsibility. Exclude comments, dead code, mocks, stories, and tests unless they are requested targets or evidence for the implementation.
2. **Inspect source.** Apply names/semantics and the conditional references above. Follow imports, wrappers, conditional states, and ID generation. Adapt to HTML/CSS, React, Vue, Angular, Svelte, Preact, or Web Components without assuming shared APIs; consider shadow-root boundaries. Inspect keyboard handlers, focus lifecycle, hiding, and CSS risks where relevant, but keep actual navigation, visibility, contrast, and announcements unverified without runtime evidence. Distinguish a modal from a nonmodal disclosure.
3. **Verify library responsibilities.** For PF code, check version-specific APIs using local source/types or matching documentation. Do not require provider-owned ARIA or an extra focus trap in consumer code.
4. **Record evidence.** Report concrete source evidence for each applicable check. Mark browser-only behavior Not tested unless actual runtime observations were supplied; preserve their attribution and environment/revision limits.
5. **Report and follow up.** Return scoped findings and runtime questions using the reporting reference.

## Requested fixes and valid alternatives

- Apply fixes only when requested and supported within scope.
- Surface unresolved naming/product decisions rather than inventing them.
- Verify changed source and keep unexecuted runtime checks open.
- Accept valid static initial focus, native implicit semantics, and meaningful successor focus.
- Return no findings when appropriate; source review alone cannot establish runtime accessibility.
