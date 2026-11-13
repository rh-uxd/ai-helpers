---
name: uxd-a11y-review
description: Consolidate source and keyboard evidence for native and PatternFly modal dialogs. Use when reviewing a modal end to end or combining findings with coverage limitations.
version: 0.1.0
audience: "Product teams and accessibility reviewers"
inputs: "Modal task with source, running URL, or existing observations"
outputs: "Consolidated modal findings and method-specific coverage"
---

This is a draft modal slice, not yet the full axe/media/semantic review planned for the MVP. Do not silently claim those phases are implemented. For broader requests, identify the missing coverage and carry it into the report.

## References and supporting workflows

Load only what the available evidence requires:

- [Reporting](../../references/reporting.md) — establish scope and consolidate observations into findings and coverage.
- [Source audit](../uxd-a11y-source-audit/SKILL.md) — follow when source is supplied; preserve runtime questions.
- [Keyboard test](../uxd-a11y-keyboard-test/SKILL.md) — follow for a running target or when interpreting supplied keyboard observations.
- [PF responsibilities](../../references/patternfly-modal.md) — load only for PF ownership questions; native reviews should not need it.

## Workflow

1. **Establish scope.** Use the reporting reference. Preserve product-provided startup commands, URLs, test data, states, and known exceptions as local execution context. Do not install tools or contact external services unless authorized.
2. **Review supplied source.** Follow the source-audit workflow and preserve its findings and runtime questions. Source absence need not block a running-UI review.
3. **Review keyboard behavior.** Follow the keyboard-test workflow for a running target. Without browser capabilities, retain Not tested results. Existing observations can be consolidated without rerunning; label them supplied evidence, not newly executed tests.
4. **Combine observations.** Apply the reporting rules while preserving the distinctions listed below. Group common causes without losing open findings. Source success never overrides observed keyboard failure.
5. **Return the report.** Include scope, coverage, findings, and next actions. State which modal checks were performed and which broader checks remain outside this draft. Do not issue an overall accessibility Pass from partial evidence.

## Preserve during consolidation

- Evidence method and origin.
- Target state and transition.
- Environment and revision.
- Open findings and untested or inconclusive checks.

No separate report skill or automatic issue filing is required.
