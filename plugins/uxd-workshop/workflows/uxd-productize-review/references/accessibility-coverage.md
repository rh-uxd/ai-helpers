# Productize accessibility coverage

Use the installed `uxd-a11y` methods only for approved states and evidence.
Report the method, source rule, evidence, and untested coverage; do not infer
conformance.

## Quick — primary journey

- **Keyboard (`uxd-a11y-keyboard-audit`):** reachability, activation, focus
  visibility and order, overlay dismissal, and focus return where applicable.
- **Visual (`visual-runtime.md`, `design-checks.md`):** spot-check contrast,
  color-only meaning, narrow-layout usability, focus, target sizes, and
  applicable visual states. Do not infer hit areas or behavior from screenshots
  without reliable evidence.
- **Names and forms (`names-and-semantics.md`, `forms-and-updates.md`):**
  meaningful headings, control names and labels, image/icon alternatives,
  required fields and instructions, errors, and recovery on the journey.
- **Runtime (`runtime-scanning.md`):** spot-check rendered semantics and run
  an available automated scan of visited states. Scanner absence does not
  prevent keyboard or semantic checks.
- **Reporting (`reporting.md`):** identify the check, state, method, evidence,
  and clickable source citation. Record what was not tested and why.

## Full — agreed changed journeys and states

Expand Quick across the agreed journeys and applicable states. Add:

- Enlargement, reflow, supported themes, forced colors, reduced motion,
  and measured contrast and focus across states (`visual-runtime.md`).
- Complete keyboard journeys and applicable composite-widget behavior
  (`keyboard-navigation.md`, `keyboard-patterns.md`).
- Rendered names, descriptions, relationships, and changing states
  (`aria-states-and-relationships.md`). For dialogs, check opening, containment,
  dismissal, and restoration (`modal-dialog.md`).
- Validation, recovery, loading, success, and dynamic feedback
  (`forms-and-updates.md`), plus rendered semantics and scans across significant
  states (`runtime-scanning.md`).
- Selective `uxd-a11y-source-audit` when the diff or observed behavior raises
  a question that source can answer. Limit review to the relevant UI.

Supporting screenshots or specs can inform `uxd-a11y-design-review` when
approved; label those findings static, not runtime. Both passes exclude test
generation, component-internals review, and comprehensive assistive-technology
or cross-browser testing.
