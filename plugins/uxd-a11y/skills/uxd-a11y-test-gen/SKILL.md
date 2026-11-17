---
name: uxd-a11y-test-gen
description: Generate persistent accessibility tests using a project's existing framework and test tools. Use when adding semantic, keyboard, focus, or automated-scan coverage for native, custom, or PatternFly components.
version: 0.1.0
audience: "UI developers and test authors"
inputs: "Component or module source, project test setup, and optional aria, keyboard, focus, or axe priority"
outputs: "Runnable test changes, actual execution results, and coverage gaps"
---

Generate tests for the requested behavior using real component rendering. Do not silently fix application code, install dependencies, or replace the project's testing stack.

## References

- [Test capabilities](../../references/test-capabilities.md) — select the installed runner/environment and avoid unsupported coverage claims.
- [Test recipes](../../references/test-recipes.md) — load only the relevant runner section; adapt to actual source, imports, setup, and version.
- [Names and semantics](../../references/names-and-semantics.md) and [ARIA relationships](../../references/aria-states-and-relationships.md) — choose applicable semantic assertions.
- [Forms and updates](../../references/forms-and-updates.md) — load for field states, help/errors, and dynamic content.
- [Keyboard patterns](../../references/keyboard-patterns.md) and [navigation](../../references/keyboard-navigation.md) — load for activation, traversal, and transitions.
- [Modal expectations](../../references/modal-dialog.md) — load only for dialog lifecycle/boundaries.
- [Scanning](../../references/runtime-scanning.md) — load when an axe integration is available; preserve states, exclusions, and incomplete results.
- [PF responsibilities](../../references/patternfly-source.md) — load only for PF; verify installed APIs and provider-versus-consumer ownership.
- [Reporting](../../references/reporting.md) — preserve evidence, classification, and gaps in the result.

## Method

1. **Inspect before generating.** Read the target and relevant imports/wrappers. Inspect nearest package/lockfile, runner config, setup, and adjacent tests. Determine framework, actual DOM/browser environment, installed APIs, and whether this is library-author or consumer code.
2. **Select coverage.** Honor requested priorities, then map applicable names/states/relationships, activation, focus, and scan scenarios to available capabilities. Do not generate irrelevant ARIA assertions for every component or require redundant consumer attributes.
3. **Write focused tests.** Follow project naming/query/setup conventions; extend existing tests when appropriate. Otherwise use a dedicated a11y test filename. Prefer one file per selected runner, normally at most two per component; do not split needlessly or violate existing organization. Assert outcomes and transitions, not copied implementation details.
4. **Execute supported checks.** Run the relevant tests with the project's supported command. Verify actual imports, matchers, async rendering, and keyboard APIs. Keep known application failures visible; do not weaken assertions or suppress rules just to pass. If execution is unavailable, say so and distinguish generated from executed coverage.
5. **Summarize.** List changed test files and category/runner/test counts, actual command/results, remaining source/browser/visual/AT gaps, and actionable follow-up. A passing test suite is not overall accessibility conformance.

If no usable test setup exists, give a framework-appropriate setup recommendation and clearly conditional example; do not create knowingly unrunnable test files or install tools without authorization. Ask only for missing information that blocks a meaningful runnable test.
