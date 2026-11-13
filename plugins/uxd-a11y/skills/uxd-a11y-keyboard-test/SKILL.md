---
name: uxd-a11y-keyboard-test
description: Test modal keyboard access and focus in a running interface. Use when verifying dialog entry, containment, dismissal, or focus restoration.
version: 0.1.0
audience: "UI developers, QA, and accessibility reviewers"
inputs: "Running URL, modal task, and optional prior observations"
outputs: "Observed keyboard results, findings, and capability gaps"
---

This draft covers the modal-dialog slice only. Use available browser automation or observed manual results; no named tool is mandatory. Source alone is not a live keyboard test.

## References

Load references as needed for the steps below:

- [Reporting](../../references/reporting.md) — establish scope/environment and record observations or limitations.
- [Modal expectations](../../references/modal-dialog.md) — identify the pattern and test its keyboard behavior.
- [Names and semantics](../../references/names-and-semantics.md) — inspect the dialog and control names used in the task.
- [PF responsibilities](../../references/patternfly-modal.md) — load only when investigating PF-specific ownership or API questions.

## Method

1. **Establish scope and capabilities.** Use the reporting reference. Confirm navigation, key input, active-element/DOM or tree inspection, and evidence capture. Without live capabilities, report applicable checks Not tested; do not manufacture an interaction trace.
2. **Identify the interaction.** Apply the modal and naming references to the trigger, task, modality, and dismissal routes. Consult PF guidance only when relevant.
3. **Open by keyboard.** Observe focus after meaningful rendering settles; record the actual target and context. Accept a suitable static introduction rather than requiring the first button.
4. **Exercise the task.** Check the interactions listed below. Reopen for each independent dismissal, record setup separately from user actions, and inspect focus after transitions.
5. **Report observations.** Include evidence or a limitation for each applicable check. Distinguish APG deviations, demonstrated barriers, and browser behavior. Preserve Inconclusive results when inspection is unavailable after an attempted check or evidence conflicts.

## Interactions to check

- Content navigation and both tab-sequence boundaries.
- Background exclusion while the modal is open.
- Escape and close/cancel dismissal.
- Focus restoration after dismissal.

## Evidence limits

- Keep reports useful without screenshots when other sufficient evidence exists.
- Do not infer AT announcements from DOM/tree updates.
- Do not execute real destructive actions merely to complete a test.
