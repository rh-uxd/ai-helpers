---
name: uxd-a11y-keyboard-test
description: Test keyboard access and focus in running interfaces. Use for navigation, composite widgets, overlays, and task transitions in native, custom, or PatternFly UI.
version: 0.2.0
audience: "UI developers, QA, and accessibility reviewers"
inputs: "Running URL, user task, and optional prior observations"
outputs: "Observed keyboard results, findings, and capability gaps"
---

Use available browser automation or observed manual results; no named tool is mandatory. Source alone is not a live keyboard test.

## References

Load references as needed for the steps below:

- [Reporting](../../references/reporting.md) — establish scope/environment and record observations or limitations.
- [Keyboard navigation](../../references/keyboard-navigation.md) — establish the journey, bypass, order, scrolling, and transition checks.
- [Widget patterns](../../references/keyboard-patterns.md) — load applicable activation/composite checks and conditional PF variants.
- [Modal expectations](../../references/modal-dialog.md) — load for actual dialogs, including initial focus, boundaries, dismissal, and restoration.
- [Names and semantics](../../references/names-and-semantics.md) — inspect the structure and control names used in the task.
- [PF responsibilities](../../references/patternfly-source.md) — load only when investigating PF-specific ownership or API questions.

## Method

1. **Establish scope and capabilities.** Use the reporting reference. Confirm navigation, key input, active-element/DOM or tree inspection, and evidence capture. Without live capabilities, report applicable checks Not tested; do not manufacture an interaction trace.
2. **Identify the interaction.** Identify actual roles and the task; select applicable widget checks. Distinguish native controls, composite models, disclosure, and modal behavior. Consult PF guidance only when relevant.
3. **Traverse by keyboard.** Follow the navigation reference. Observe focus and state after meaningful rendering settles; record actual targets, keys, and context. Keep setup separate from the tested journey.
4. **Exercise the task.** Apply the selected pattern checks and interactions below. Reopen for each independent dismissal, record setup separately from user actions, and inspect focus after transitions.
5. **Report observations.** Include evidence or a limitation for each applicable check. Distinguish APG deviations, demonstrated barriers, and browser behavior. Preserve Inconclusive results when inspection is unavailable after an attempted check or evidence conflicts.

## Interactions to check

- Applicable bypass, forward/reverse order, scrolling, focus visibility, and obscuring.
- Role-appropriate activation and composite entry, internal navigation, and exit.
- Opening, state changes, dismissal, and meaningful focus continuation.
- For actual modals, background exclusion and both containment boundaries.

## Evidence limits

- Keep reports useful without screenshots when other sufficient evidence exists.
- Do not infer AT announcements from DOM/tree updates.
- Do not execute real destructive actions merely to complete a test.
