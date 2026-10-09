---
name: pf-a11y-review
description: Audit a running PatternFly experience across automated rules, keyboard and focus behavior, viewport and media conditions, and rendered semantics. Use when performing a full accessibility review, validating a page or flow beyond axe, or preparing consistent findings for downstream reporting.
version: 0.1.0
audience: "PatternFly developers and product teams using PatternFly"
inputs: "A running page, component demo, or user flow and its accessibility review scope"
outputs: "A consolidated accessibility report with findings, evidence, coverage, and limitations"
---

Run a phased accessibility review that treats automated checks as a baseline rather than proof of accessibility. This skill owns the shared methodology. Product repositories may layer in routes, page registries, startup commands, test data, known exceptions, and issue-tracker fields without redefining the core checks.

## Sources of truth

- Use WCAG 2.2 Level A and AA as the conformance reference. Prefer the normative W3C guidance and use the [WCAG 2.2 JSON catalog](https://www.w3.org/WAI/WCAG22/wcag.json) when a machine-readable criterion lookup is available.
- Use current PatternFly component accessibility documentation for component-specific behavior and consumer responsibilities. If `@patternfly/patternfly-mcp` is available, use it to retrieve current documentation; otherwise use locally available PatternFly documentation.
- Use this skill and its references for audit methodology and reporting.
- Treat product instructions as an overlay for application-specific scope and execution.

## Input

| Source | Required | Description |
|---|---|---|
| Review target | Yes | Running URL, component demo, or clearly identified user flow |
| Scope | No | Routes, overlays, states, themes, or tasks to prioritize |
| Product overlay | No | Local commands, page registries, test data, known exceptions, and tracker conventions |

## Capabilities and fallbacks

Use available browser capabilities for navigation, keyboard input, focus inspection, accessibility-tree snapshots, screenshots, viewport changes, and media emulation. Browser automation and developer-tool integrations are suitable implementations, but no specific tool is required.

Use an existing axe-core integration when available. Do not install a dependency or send page data to an external service without user approval.

If a capability is unavailable, continue the phases that can be completed. Mark the unsupported checks as **Not tested** in the coverage matrix and explain the limitation. Never infer a pass from an untested condition.

## References

Load each reference before its corresponding phase:

- `references/axe-methodology.md` — automated baseline and state coverage
- `../pf-a11y-keyboard/references/keyboard-criteria.md` — keyboard and focus behavior
- `../pf-a11y-keyboard/references/component-specifics.md` — matching component behavior only
- `references/media-matrix.md` — viewport, zoom, motion, contrast-mode, and theme conditions
- `references/semantic-tree-evaluation.md` — rendered structure, names, roles, states, and reading order
- `references/reporting-schema.md` — normalized findings and final report structure

## Workflow

### Phase 0 — Scope and environment

1. Identify the routes, components, overlays, user tasks, and significant states in scope.
2. Record the URL, viewport, zoom, theme, media preferences, data source, authentication state, and relevant build or commit when known.
3. Separate shared methodology from product-specific setup. Preserve useful product commands and registries as execution details, not universal requirements.
4. Create a coverage matrix with one row per surface and condition. Begin every entry as **Not tested**.

### Phase 1 — Automated baseline

Load `references/axe-methodology.md`. Run a broad product-provided sweep when one exists, then run targeted scans after opening overlays and significant states. Keep automated findings separate from manual findings until consolidation so a clean scan is not mistaken for a complete pass.

### Phase 2 — Keyboard and focus

Apply all relevant criteria from `keyboard-criteria.md` and matching behaviors from `component-specifics.md`. Test primary tasks without a pointer, including sequential navigation, activation, composite-widget keys, focus entry, focus containment, focus return, and route-change focus.

Use the rendered accessibility tree or focused element after each important interaction. Capture evidence for failures and record Pass, Fail, N/A, or Not tested for each applicable criterion.

### Phase 3 — Viewport and media matrix

Load `references/media-matrix.md`. Repeat the relevant visual, reachability, keyboard, and state checks under the required viewport and media conditions. Keep text resize, layout reflow, and device pixel ratio conceptually separate; one is not evidence for another.

### Phase 4 — Semantic and structural evaluation

Load `references/semantic-tree-evaluation.md`. Inspect the rendered accessibility tree and DOM where necessary. Evaluate headings, landmarks, names, roles, values, relationships, reading order, lists, tables, live regions, hidden content, and state changes. Do not infer rendered semantics from source code alone.

### Phase 5 — Consolidate and report

Load `references/reporting-schema.md` and normalize automated and manual findings. Deduplicate the same underlying problem without merging distinct occurrences that require separate fixes.

The final report must contain:

1. Scope and environment
2. Executive summary
3. Coverage matrix
4. Findings with evidence and WCAG references
5. Coverage gaps and limitations
6. Recommended next actions

Draft issue-ready findings when useful, but do not create or modify tracker issues without explicit user approval. Allow product overlays to map normalized impact to local priorities and fields.

## Completion criteria

An audit is complete only when every in-scope surface and applicable phase is marked Pass, Fail, N/A with a reason, or Not tested with a limitation. State clearly that automated browser checks do not replace manual assistive-technology testing, usability testing with disabled people, or expert judgment for complex interactions.

## Related skills

- `pf-a11y-audit` — source-level WCAG, ARIA, and PatternFly checks
- `pf-a11y-keyboard` — focused live keyboard and focus testing
- `pf-a11y-test-gen` — persistent accessibility tests for CI
