# PatternFly source responsibilities

Load only for PatternFly code. Apply shared semantics first, then inspect the installed package version, imports, public types, implementation, and matching documentation. Wrappers and prop overrides can change defaults. Missing consumer ARIA is not a defect when the component already supplies it.

The concrete API observations below were checked against `@patternfly/react-core` **6.7.0** source. They are not guarantees for other releases or proof of actual AT announcements.

## PF-01 — Forms and updates

| Component / concern | Provider behavior and consumer check |
|---|---|
| FormGroup | `fieldId` connects an ordinary label to the input ID. `isRequired` renders an aria-hidden visual marker; it does not propagate required state to children. Inspect grouped/radio variants separately. |
| TextInput | `isRequired` sets native required; `validated="error"` supplies invalid state unless overridden through supported props. Consumer supplies appropriate naming, instructions, error text, and state transitions. |
| HelperText | `isLiveRegion` supplies polite live behavior. A HelperTextItem visual `variant` alone does not create a live region. Connect useful help/error content to its field. |
| Alert | `isLiveRegion` supplies polite behavior regardless of visual variant. A danger variant alone does not imply `role="alert"` or assertive speech. Check surrounding AlertGroup/live regions before adding another announcement. |
| Toasts | Check dismissal, timeout configuration, discoverability, and persistent access to important outcomes. Styling or an accessible close button does not settle timing requirements. |

## PF-02 — Composition, repetition, and complex controls

- **Toggles/selects/menus:** inspect the actual generation of the API and composed toggle. Determine which component owns name, expanded state, popup relationship, selected state, and keyboard behavior. Do not transplant props from a different generation or require consumer duplication of internal ARIA.
- **Tooltips/popovers:** distinguish a control name from supplemental description. A tooltip is not a universal WCAG requirement for every icon button. Verify keyboard access, dismissal, and relevant hover/focus behavior in runtime; avoid duplicating the name as a description without benefit. An interactive popover needs suitable semantics and a reachable focus path, not tooltip semantics by default.
- **Repeated controls/regions:** inspect generated IDs and repeated instances; resolve actual names and purpose. Identical-purpose pagination can share names. Context must distinguish genuinely different actions.
- **Tables:** inspect header associations, sort state, caption/name when needed, and responsive presentation. Verify `dataLabel` and equivalent responsive labels where the chosen layout depends on them; do not require it on every cell regardless of context. Read `@patternfly/react-table` version/source separately when used.
- **Modals:** load [PatternFly modal responsibilities](patternfly-modal.md) and [shared modal expectations](modal-dialog.md). Preserve provider-owned focus behavior and inspect consumer open/close wiring.
- **Library author versus consumer:** in library code, inspect forwarding, defaults, rendered semantics, and public contracts. In app code, inspect supplied content, IDs, composition, overrides, and lifecycle handlers. Recommend fixes at the responsible layer.

## Sources and verification

- [PatternFly accessibility](https://www.patternfly.org/accessibility/) and version-matched component documentation.
- Installed `@patternfly/react-core` source/types: Form/FormGroup, TextInput/TextInput, HelperText/HelperText, HelperText/HelperTextItem, Alert/Alert, and Alert/AlertGroup.
- If the installed implementation cannot be inspected, identify the assumption and request rendered/version evidence rather than inventing a prop or asserting a provider defect.
