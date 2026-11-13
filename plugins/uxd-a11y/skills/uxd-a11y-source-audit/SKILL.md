---
name: uxd-a11y-source-audit
description: Audit native and PatternFly dialog source for accessibility responsibilities and evidence gaps. Use when reviewing modal markup, naming, or focus lifecycle code.
version: 0.1.0
audience: "UI developers and accessibility reviewers"
inputs: "Source files or diff and the intended dialog task"
outputs: "Source findings and checks needing runtime verification"
---

This draft covers the modal-dialog slice only. Identify broader requests as additional scope rather than implying a complete accessibility audit. Review-only requests do not authorize source edits.

## References

Load references as needed for the steps below:

- [Reporting](../../references/reporting.md) — establish scope, record evidence, and present findings.
- [Names and semantics](../../references/names-and-semantics.md) — inspect dialog and control naming.
- [Modal expectations](../../references/modal-dialog.md) — evaluate modality and focus lifecycle.
- [PF responsibilities](../../references/patternfly-modal.md) — load only for PatternFly code; verify provider and consumer responsibilities against the installed version.

## Method

1. **Establish scope.** Use the reporting reference. Identify native HTML, custom implementation, or library use, and provider-author versus consumer responsibility.
2. **Inspect source.** Apply the naming and modal references to naming targets, opening, dismissal, and focus lifecycle. Distinguish a modal from a nonmodal disclosure.
3. **Verify library responsibilities.** For PF code, check version-specific APIs using local source/types or matching documentation. Do not require provider-owned ARIA or an extra focus trap in consumer code.
4. **Record evidence.** Report concrete source evidence for each applicable check. Mark browser-only behavior Not tested unless actual runtime observations were supplied; preserve their attribution and environment/revision limits.
5. **Report and follow up.** Return scoped findings and runtime questions using the reporting reference.

## Requested fixes and valid alternatives

- Apply fixes only when requested and supported within scope.
- Surface unresolved naming/product decisions rather than inventing them.
- Verify changed source and keep unexecuted runtime checks open.
- Accept valid static initial focus, native implicit semantics, and meaningful successor focus.
- Return no findings when appropriate; source review alone cannot establish runtime accessibility.
