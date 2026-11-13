# Modal dialog: expectations and verification

Load for an actual modal task. First identify intent: blocking modal, nonmodal dialog, or disclosure. A drawer/popover label or appearance alone does not establish modality. Nonmodal disclosures may retain trigger focus and allow background interaction; mark modal-only checks N/A rather than imposing a trap.

Use [names and semantics](names-and-semantics.md) for naming. For PF source, also load [PatternFly modal responsibilities](patternfly-modal.md). Standards and behavior stay here; the provider file maps them to APIs.

## MODAL-01 — Modality is real

For native HTML, distinguish `showModal()` from `show()` or an `open` attribute. Native modal behavior supplies semantics/background inertness; do not require redundant role, aria-modal, or a second custom trap solely because explicit attributes are absent. For custom ARIA dialogs, modal semantics must agree with actual background unavailability. `aria-modal` and `aria-hidden` do not themselves prevent keyboard or pointer interaction.

Inspect opening code and rendered role/modal state. Test that background controls cannot be reached/operated while open. Distinguish author behavior from browser chrome focus. An ARIA attribute alone is not a runtime pass.

## MODAL-02 — Initial focus supports the task

Open using the keyboard and observe actual focus after rendering settles. Focus belongs in the modal, at a useful location. Valid choices include an initial input, a safe action, or static introductory content with `tabindex="-1"`. Do not require the first interactive control. A native dialog can use `autofocus` on an appropriate descendant; do not add tabindex to the native dialog itself.

Record the target and why it suits the content. If initial focus hides the beginning of long content or makes the task confusing, record that impact. Source wiring may suggest the intended target but does not demonstrate runtime behavior.

## MODAL-03 — Content remains keyboard-reachable

Navigate the actual controls with Tab and Shift+Tab. Exercise both boundaries; ten arbitrary key presses are not a boundary test. For an APG-style custom modal, check cycling from last to first and first to last. Record any browser-chrome transition separately from escape into background page controls; do not turn platform behavior into an invented author failure. Check the ability to reach all dialog content and to leave by dismissal.

Do not treat initial static content as a required extra sequential tab stop. When inspecting a known boundary directly, label programmatic setup separately from the keyboard journey; do not claim the entire path was traversed.

## MODAL-04 — Dismissal works

Exercise Escape and the supplied close/cancel control from within the modal, reopening between paths. Escape is the APG expectation; a product-specific exception must be described and assessed, not automatically called a WCAG failure. Verify an operable keyboard exit and avoid triggering real destructive operations when safe test data or cancel paths suffice.

## MODAL-05 — Focus returns meaningfully

Observe focus after each dismissal. Normally it returns to the invoker. If that element disappears or the next workflow step justifies another destination, accept a logical successor. Body focus with lost task position is a concern; inspect consequences before assigning a WCAG violation or impact.

## Classification and evidence

Capture target/state, key sequence, active element, relevant DOM/tree excerpt, and expected versus actual behavior. Missing capabilities → Not tested; ambiguous/contradictory observations → Inconclusive. Never claim screen-reader behavior from DOM evidence alone.

APG describes an interaction pattern; it is not itself a WCAG success criterion. Relate demonstrated barriers to [Keyboard 2.1.1](https://www.w3.org/WAI/WCAG22/Understanding/keyboard.html), [No Keyboard Trap 2.1.2](https://www.w3.org/WAI/WCAG22/Understanding/no-keyboard-trap.html), or [Focus Order 2.4.3](https://www.w3.org/WAI/WCAG22/Understanding/focus-order.html) only when the evidence supports that criterion. Modal containment with a usable dismissal is not a prohibited keyboard trap.

## Sources

- [APG modal dialog](https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/)
- [HTML dialog element](https://html.spec.whatwg.org/multipage/interactive-elements.html#the-dialog-element)
