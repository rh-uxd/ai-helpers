# Forms and dynamic updates

## FORM-01 — Labels, instructions, and required state

- Identify each input's accessible name: associated label, valid labelledby, or an appropriate alternative. Placeholder text is not a durable visible label.
- Check visible labels/instructions separately from computed names. Group related controls with native fieldset/legend or an appropriate named group when needed to convey the question/context.
- Communicate required fields to users. Native `required` supplies semantics and validation where supported; redundant `aria-required` is unnecessary. ARIA required state does not enforce validation.
- Associate relevant help text with its control where needed; resolve every description ID and avoid replacing the label with lengthy instructions. Use appropriate HTML autocomplete tokens for applicable personal-data inputs.

## FORM-02 — Errors remain understandable and actionable

- Inspect validation states and submission handling. Identify the field and describe the error in text; supply a correction suggestion when known and appropriate. Color or an icon alone is insufficient.
- Check association of errors with affected controls and exposure of invalid state. Native validation, descriptions, and error-message relationships can be valid alternatives; missing `aria-invalid` alone is not automatically a WCAG failure in every implementation.
- Do not announce an untouched field as erroneous before validation warrants it. Preserve entered values and a way to find/correct errors.
- Source can establish intended error text, links, state wiring, and focus logic. Actual focus movement and announcement timing require runtime/manual evidence.

## UPDATE-01 — Important updates are available without unnecessary interruption

- Determine whether a change is a status message (for example, results count, waiting/progress, or operation outcome) without a context change. Not every DOM mutation needs a live region.
- Use suitable native/ARIA semantics. `status` provides implicit polite/atomic behavior; `alert` provides implicit assertive/atomic behavior. Do not require redundant explicit attributes or infer urgency from visual color.
- Inspect region lifetime and update sequencing. Creating a populated live region and updating an existing region can behave differently; source alone cannot establish what an AT announces.
- Consider `aria-atomic`, `aria-relevant`, and `aria-busy` when partial updates, removals, or batches affect comprehension. Avoid nested/duplicate announcements and frequent irrelevant updates.
- Important toast information must remain discoverable long enough or through a persistent alternative. Assess time limits against applicable WCAG exceptions; do not invent a universal timeout duration.

## Sources

- [WAI forms guidance](https://www.w3.org/WAI/tutorials/forms/)
- [WCAG error identification](https://www.w3.org/WAI/WCAG22/Understanding/error-identification.html)
- [WCAG labels or instructions](https://www.w3.org/WAI/WCAG22/Understanding/labels-or-instructions.html)
- [WCAG status messages](https://www.w3.org/WAI/WCAG22/Understanding/status-messages.html)
- [WAI-ARIA live-region attributes](https://www.w3.org/TR/wai-aria-1.2/#attrs_liveregions)
