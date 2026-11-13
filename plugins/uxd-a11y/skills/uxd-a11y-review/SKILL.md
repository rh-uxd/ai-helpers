---
name: uxd-a11y-review
description: Review running interfaces with available automated scans, keyboard, rendered-semantic, and visual checks. Combine native, custom, or PatternFly evidence with source findings and explicit coverage limits.
version: 0.2.0
audience: "Product teams and accessibility reviewers"
inputs: "User task with source, running URL, or existing observations"
outputs: "Consolidated accessibility findings and method-specific coverage"
---

Run only methods supported by available capabilities and the requested scope. Missing tools do not prevent useful partial review, but partial evidence does not establish overall accessibility conformance.

## References and supporting workflows

Load only what the available evidence requires:

- [Reporting](../../references/reporting.md) — establish scope and consolidate observations into findings and coverage.
- [Source audit](../uxd-a11y-source-audit/SKILL.md) — follow when source is supplied; preserve runtime questions.
- [Keyboard test](../uxd-a11y-keyboard-test/SKILL.md) — follow for a running target or when interpreting supplied keyboard observations.
- [Scanning and rendered semantics](../../references/runtime-scanning.md) — load for automated scans or inspection of the running UI.
- [Visual/media checks](../../references/visual-runtime.md) — load for viewport, resize, reflow, themes, contrast, and media conditions.
- [PF responsibilities](../../references/patternfly-source.md) — load only for PF ownership questions; native reviews should not need it.

## Workflow

1. **Establish scope.** Use the reporting reference. Preserve product-provided startup commands, URLs, test data, states, and known exceptions as local execution context. Do not install tools or contact external services unless authorized.
2. **Review supplied source.** Follow the source-audit workflow and preserve its findings and runtime questions. Source absence need not block a running-UI review.
3. **Review keyboard behavior.** Follow the keyboard-test workflow for a running target. Without browser capabilities, retain Not tested results. Existing observations can be consolidated without rerunning; label them supplied evidence, not newly executed tests.
4. **Inspect the running interface.** Follow the scan/rendered reference for available automated scans and exposed semantics across significant states. Follow visual/media checks for applicable conditions. Record each method separately; scanner absence does not block keyboard or tree inspection, and supplied results are not new execution.
5. **Combine observations.** Apply the reporting rules while preserving the distinctions listed below. Group common causes without losing open findings. Source success never overrides observed keyboard failure.
6. **Return the report.** Include scope, coverage, findings, and next actions. State which routes, states, methods, and conditions were performed and which remain untested or inconclusive. Do not issue an overall accessibility Pass from partial evidence.

## Preserve during consolidation

- Evidence method and origin.
- Target state and transition.
- Environment and revision.
- Open findings and untested or inconclusive checks.

No separate report skill or automatic issue filing is required.
