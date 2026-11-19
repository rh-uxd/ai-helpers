---
name: uxd-a11y-design-review
description: Review screenshots and design specifications for accessibility risks, including contrast, target size, color-only meaning, and specified states. Use for one design or accessibility comparisons before implementation.
version: 0.1.0
audience: "Designers and accessibility reviewers"
inputs: "Named screenshots or design specifications, optional tokens, brief, and review preferences"
outputs: "Evidence-based design findings, comparisons, and implementation verification gaps"
---

Review the accessibility portion of design quality. Broader UX heuristics remain with the existing design-heuristics workflow; this skill neither replaces it nor establishes conformance from static designs. Review requests do not authorize design edits.

## References

Before assessing a usable image or specification, read Reporting and Design checks below, plus the relevant sections of Visual checks. Read the conditional references only when their topics apply. Resolve these paths relative to this skill; listing files is not a substitute for reading them. If a required reference cannot be read, report that limitation rather than claiming to have applied it.

- [Reporting](../../references/reporting.md) — scope, evidence, classification, confidence, and coverage.
- [Design checks](../../references/design-checks.md) — visual evidence limits, target sizes, state coverage, and optional scores/comparisons.
- [Visual checks](../../references/visual-runtime.md) — reuse contrast thresholds and measurement distinctions; runtime procedures remain unexecuted for static inputs.
- [Names and semantics](../../references/names-and-semantics.md) — load for labels, meaningful structure, and decoration specified in designs.
- [Forms and updates](../../references/forms-and-updates.md) — load for required fields, error messages, and specified dynamic states.

## Method

1. **Identify inputs and scope.** Label each design/frame and state; distinguish alternatives from steps in a flow. Reuse the supplied brief and priorities. Inspect accessible visual inputs; use tokens/specs as attributed evidence, not as proof of rendered behavior. If no usable image or specification exists, request the missing input without inventing an assessment.
2. **Review supported checks.** Apply design checks and relevant shared references. Record the frame/element, measurement source, and expected/actual result. Mark unreadable details and absent interaction/responsive states unassessed rather than assuming they pass or fail.
3. **Compare when requested.** Apply equal criteria and evidence standards to each named direction. Explain accessibility tradeoffs; do not force a winner or rank unknowns as successes. Return observations usable by a broader UX comparison.
4. **Report.** Default to scoped findings, strengths worth retaining, actionable changes, and verification gaps. Honor `format=json`, `report=false`, requested accessibility focus areas, and optional scores using the design reference. Preserve failures and unknowns in every output format.

A specification can describe intended focus or names; actual keyboard operation, exposed semantics, reflow, and AT speech need implementation evidence. Route available running-UI evidence to [runtime review](../uxd-a11y-review/SKILL.md), keeping methods distinct.
