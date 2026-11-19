# Form and wizard behaviors

Use this reference when collecting, validating, abandoning, or submitting user input. The four core behaviors clarify application-level coordination; they are not new PatternFly component guarantees or adopted cross-product policy. Keep business validation, meaningful-edit criteria, navigation constraints, and retry safety explicit.

## Surface and baseline guidance

- Use a Form for straightforward data entry. Use a Wizard when ordered or dependent steps make a complex task easier. Choose inline edit, modal, or in-page presentation using context, complexity, and consequences, not a fixed field count or a universal full-page preference.
- Follow existing design guidance for readable single-column layouts, explicit labels, meaningful groups, and justified related-field layouts. Use the appropriate action area; Cancel is visually subordinate, not necessarily a particular button variant. Do not require a pinned footer for every surface.
- Keep the launch action, wizard title, step labels, headings, and outcome semantically consistent; headings may elaborate on shorter navigation labels.
- A final Review step shows current values before commitment, with a specific final action such as **Create resource**. Do not render stale snapshots of earlier input.
- Forms and wizards both use [Shared unsaved-work protection](#shared-unsaved-work-protection) and [Shared submission and recovery](#shared-submission-and-recovery). Keep these policies in one place rather than defining competing component-specific versions.

## Validated wizard progression

**Applicability:** Wizards whose required steps must be valid before forward progression. Deliberately skippable or optional steps need explicit eligibility rules.

**Required state/data:** Current step, retained field values, visited steps, current validity of each required step, and the prerequisites for each destination. Track validation-in-progress when checks are asynchronous. Visitation and validity are separate state.

**Default behavior:**

1. Derive forward eligibility from current values and the required prerequisites for the destination. Guard every supported path: Next, sidebar links to later steps (including previously visited steps), Review/finish shortcuts, and application-driven navigation. A disabled Next button alone is insufficient.
2. Re-evaluate eligibility after earlier input changes. A later step remains visited even when its prerequisites become invalid; visitation must not grant access past a validation gate. Revalidate the complete current payload before committing, even when Review was previously reached.
3. Permit backward navigation without clearing input. Retain values outside step-local lifetimes so revisiting or remounting steps does not reset the form. Explain and expose invalid fields using [Accessible validation feedback](#accessible-validation-feedback).
4. Keep Review and final submission unavailable when required prerequisites are invalid or required asynchronous validation is unresolved. Guard the handlers as well as presenting the correct navigation state.

**Exceptions and API boundary:** `isVisitRequired` controls access to unvisited steps; it is not a validation engine. The validation example also disables Next separately. Neither that combination nor a previously visited Review step proves every route is safe. Use version-matched APIs for navigation control; do not assume a notification callback can veto navigation. Optional steps must not become mandatory accidentally.

**Verify:** Start with invalid required input and attempt each supported forward path. Complete the flow, go back, invalidate an earlier field, and try the previously visited sidebar destinations and final action. Restore valid input and confirm navigation recovers. Confirm Back/revisit preserves values and Review reflects edits.

## Shared unsaved-work protection

**Applicability:** Exits from a Form or Wizard that could discard meaningful unsaved changes. This is a shared application policy, not a Form prop or a guarantee supplied by Modal.

**Required state/data:** Initial or last-confirmed saved values, current values, the application's definition of meaningful changes, current step/focus, supported exit paths, return destination, and pending-submission status. Dirty means a meaningful difference from the baseline, not merely touched fields or a visited step.

**Default behavior:**

1. Route Cancel, header Close, and other supported exits through one abandonment decision before unmounting or clearing state. Include modal-host Escape, backdrop dismissal if enabled, and supported in-app route changes; wiring only the Wizard's close callback misses host-level handlers.
2. Exit unchanged forms without a discard warning. When meaningful edits would be lost, explain the consequence and offer **Discard changes** and **Continue editing**. Define the warning criteria and presentation for the application rather than warning on every cancellation.
3. Continue editing preserves values, validation context, and wizard position, then restores focus to a sensible point in the editing surface. It must not reset or remount the workflow into its initial state.
4. Confirmed discard exits without saving and returns to the defined origin or prior viewing state. Cancel never invokes save. Restore focus to the launcher or another sensible destination after closure.

**Exceptions:** Do not prescribe a second, nested modal for confirmation by default; choose a presentation with correct focus handling. Browser/tab unload protection is platform-limited and application-specific, not a guaranteed custom dialog. While a submission is pending, apply the pending-operation policy below: closing the UI is not equivalent to aborting or reverting a request.

**Verify:** Exercise every supported exit both unchanged and after meaningful edits. Confirm unchanged exit has no warning; Continue editing retains exact values and step; discard does not issue a save request. Use keyboard dismissal and verify focus during confirmation, return to editing, and final closure.

## Accessible validation feedback

**Applicability:** Field validation and dynamically updated feedback in standalone forms and wizard steps.

**Required state/data:** Stable, unique control and helper/error IDs; field validity; user interaction or submission-attempt state for validation timing; actionable messages; and an appropriate focus/announcement strategy.

**Default behavior:**

1. Validate at a suitable interaction point, such as blur or a submission attempt. Explain the problem and remedy near the affected control. A form-level summary or Alert supplements field feedback rather than replacing it.
2. Associate labels with their controls. Connect helper/error text using the control's `aria-describedby` and an existing helper/item `id`; retain any other relevant description IDs. Check that references resolve in the rendered DOM, including after conditional fields or step changes.
3. Expose invalid state programmatically (for example, `aria-invalid` through the supported input API) and visually. Use FormGroup/FormHelperText with HelperText/HelperTextItem as appropriate. Color, an icon, or a styling prop alone does not communicate the problem to everyone.
4. Make relevant dynamic feedback perceivable. Use a polite live region for dynamically rendered helper messages when appropriate; include status text, visually hidden when needed, if styling changes or wording alone does not convey the status. Avoid duplicate or noisy announcements and interactive content inside helper text.
5. On a blocked progression or submission attempt, provide a keyboard-accessible way to locate and correct errors, with suitable focus placement on an invalid control or an accessible error summary. Keep entered values.

**Exceptions:** Validation timing, domain rules, and validation-library selection belong to the application. Not every helper message needs a live region. Prevent invalid saves without universally disabling submit: short forms/wizards may gate their actions; long scrolling forms should allow an attempt to reveal errors without committing invalid data.

**Verify:** Use keyboard navigation and assistive technology to confirm labels, field descriptions, invalid state, and relevant updates are understandable. Check every description ID resolves, and that correcting input updates both feedback and eligibility. Test an off-screen missing field in a long form; compilation and attribute presence are not sufficient evidence.

## Shared submission and recovery

**Applicability:** Async save/commit actions in a Form or at the end of a Wizard. Use the same policy in both.

**Required state/data:** Current validated payload, idle/pending/success/failure status, an in-flight request guard, failure details, and API semantics for safe retries, cancellation, and accepted background work. Define whether input and navigation remain available during submission.

**Default behavior:**

1. Revalidate current data at the commit boundary. Route submit-button activation, keyboard/native form submission, and any final wizard action through one guarded commit path. An attempt may expose errors, but must not send an invalid payload.
2. Guard against an existing request before starting another, and immediately prevent duplicate commits while pending. Disable applicable submit actions and show perceivable pending feedback, such as a labeled Spinner/status message. A visual disabled state without a handler guard does not cover rapid repeat or alternate-path activation.
3. Preserve the submitted payload consistently. Freeze editing/navigation during the request or define how later edits relate to the in-flight snapshot; do not silently overwrite newer input when an older request completes. Define supported pending exits without implying they cancel the operation.
4. Report success only when the intended outcome is confirmed. Update the saved baseline or clear dirty state only for confirmed saved data. Acceptance of a background task means **started/accepted**, not **completed**; provide progress or a monitoring destination when that workflow needs it.
5. On failure, leave useful input and wizard context intact, expose an actionable error, release the in-flight guard, and offer appropriate recovery. Map server validation errors to fields when possible. Keep the form dirty until a successful save or an intentional discard.
6. Offer retry only when safe under the API's contract. A timeout can leave an unknown outcome: reconcile operation/resource status or use API-supported idempotency before resending a potentially committed action. Never blindly replay a non-idempotent request.

**Exceptions:** Offer operation cancellation only when the underlying operation supports it and its consequences are defined. Dismissing a dialog, aborting a client connection, or pressing Cancel does not prove server-side work stopped or rolled back. A spinner/status is enough for a short save; do not require polling or a dedicated progress screen universally.

**Verify:** Rapidly activate the final action and any keyboard submit path during a pending request; observe exactly one request. Force rejection and verify retained values, perceivable failure, and safe recovery. Simulate a timeout/unknown outcome separately from a confirmed failure. Resolve the request and check that success appears only after confirmation and the correct saved baseline is updated.

## PoC application and evaluation

Use **Details → Configuration → Review** with a small Form and a mock asynchronous save that can resolve or reject. Define the required fields and validation gates, meaningful-edit criteria, supported exits, and mock request/retry semantics before implementation. These are example policies, not PatternFly-wide mandates.

Check the four core behaviors above plus the existing baseline expectations: readable layout, coherent labels, appropriate actions, and Review showing current data. Dependency-aware reconciliation is stretch scope only when dependencies and compatibility are explicit: revalidate downstream values and clear only incompatible choices, not every dependent value.

Defer autosave/drafts, universal polling, pinned-footer policy, and a general unavailable-action policy. Do not add a rules engine, a parallel prompt format, or a new delivery endpoint for this experiment.

For baseline/treatment comparisons, hold model, PatternFly version, starter app, task prompts, and interaction checks constant; change only targeted guidance. Keep acceptance checklists out of task prompts. Record instruction retrieval separately from observed behavior, repeat trials, and track false positives or unnecessary restrictions. Type-check generated code and run interaction tests; prose coverage checks do not prove runtime behavior or the approach's effectiveness.

## Official guidance and MCP retrieval

Reviewed using `@patternfly/patternfly-mcp` 2.4.0, requesting v6 design guidance and examples. The guidance below is the authority for component design; the application policies above clarify the PoC's coordination requirements.

| Source | Use |
|--------|-----|
| [Wizard design guidelines](https://www.patternfly.org/components/wizard/design-guidelines/) | Applicability, navigation, modal/in-page variants, Review, completion |
| [Form design guidelines](https://www.patternfly.org/components/forms/form/design-guidelines/) | Layout, actions, validation timing, short/long form submit eligibility, processing feedback |
| [Helper text accessibility](https://www.patternfly.org/components/helper-text/accessibility/) | Description associations, contextual live regions, status text, assistive-technology checks |
| [Inline edit design guidelines](https://www.patternfly.org/components/inline-edit/design-guidelines/) | Contextual editing and cancellation without saving |
| [Wizard examples](https://www.patternfly.org/components/wizard/) | Locate validation and modal-host examples for the installed version |

If MCP is available, discover Wizard, Form, and Helper text with `searchPatternFlyDocs`, then retrieve the returned design-guideline, accessibility, and example resources using `usePatternFlyDocs`. The reviewed **WizardEnabledOnFormValidation** and **WizardWithinModal** examples show visitation/Next controls and separate host/header dismissal handlers; they do not implement the entire shared policy. Re-fetch version-matched examples instead of copying API details from this reference. Without MCP, consult the official guidance and the project's installed types/examples and state any verification gaps.