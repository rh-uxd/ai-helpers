---
name: pf-a11y-test-gen
description: Generate accessibility test files for any frontend framework covering ARIA attributes, keyboard interaction, and focus management. Use when adding a11y test coverage or writing ARIA/keyboard/focus tests.
---

Generate dedicated accessibility test files for UI components. Framework-agnostic — works with any frontend setup. Produces persistent test artifacts that run in CI. Complements `pf-test-gen` (general unit tests), `pf-a11y-audit` (static code analysis), and `pf-a11y-keyboard` (live browser testing).

## Input

| Source | Required | Description |
|--------|----------|-------------|
| Component/module file | Yes | Path to the component or UI module to generate a11y tests for |
| Focus area | No | Specific a11y category to prioritize: `aria`, `keyboard`, `focus`, or `axe` |

Read the component source before generating tests.

## Context Detection

### Phase 1 — Framework detection

Determine the frontend framework from the component source and project dependencies. The framework determines the test rendering approach. If it cannot be determined, ask the user.

### Phase 2 — Audience

Determine if the codebase is a PatternFly org repo or a consumer/standalone project.

**PatternFly developer** (signals: `@patternfly` in package name, `packages/` with PF component source, `patternfly` GitHub org) — test that ARIA attributes are correctly wired to component props, components expose the right a11y API surface, and default accessible names are sensible.

**Consumer/standalone** — test that accessible names are explicitly provided, multiple instances have unique labels, and live regions are used for dynamic content.

### Phase 3 — Test library detection

Scan the nearest `package.json` for testing libraries in `devDependencies` and `dependencies`. Look for unit/component testing libraries, test runners, integration/E2E libraries (Cypress, Playwright), and axe-core integrations. Also check for test runner config files.

### Phase 4 — Convention detection

Find existing test files near the component. Analyze file naming, test structure, a11y test organization (separate files vs. inline describe blocks), query patterns, and setup conventions. Mirror all detected conventions in generated tests.

## Test Library Evaluation

Load `$CLAUDE_SKILL_DIR/references/test-library-matrix.md` and apply its decision rules to assign a11y test categories to detected libraries.

- Unit test libraries handle ARIA attributes and basic keyboard activation
- axe-core integrations handle automated violation scans
- Cypress/Playwright handles focus management, focus traps, and complex keyboard flows
- Generate at most **2 test files** per component (one per library target)

If only one library is available, all applicable tests go to that library with coverage limitations noted in the gap report.

## A11y Test Categories

Load sibling reference files from `$CLAUDE_SKILL_DIR` selectively based on what the component needs:

- `../pf-a11y-audit/references/aria-attributes.md` — ARIA attribute reference (always load)
- `../pf-a11y-audit/references/pf-gotchas.md` — PF-specific pitfalls (always load)
- `../pf-a11y-keyboard/references/keyboard-criteria.md` — keyboard criteria (load when interactive elements detected)
- `../pf-a11y-keyboard/references/component-specifics.md` — component-specific keyboard behaviors (load only when matching components found)

Load `$CLAUDE_SKILL_DIR/references/a11y-test-patterns.md` for canonical test code patterns.

### Category 1 — ARIA Attributes (always generate)

Cross-reference `aria-attributes.md`. Test that semantic roles are correct, interactive elements have accessible names, state attributes (`aria-expanded`, `aria-selected`, `aria-checked`, `aria-pressed`) have correct values and toggle on interaction, required/invalid states are set on form fields, relationship attributes point to existing IDs, decorative elements are hidden, and live regions are used for dynamic content.

### Category 2 — Keyboard Interaction (when interactive elements detected)

Cross-reference `keyboard-criteria.md`. Test activation keys per role (Enter/Space for buttons, Enter for links, Space for checkboxes), tab order, Escape to close, and arrow key navigation in menus/tabs/trees/grids. Apply component-specific behaviors from `component-specifics.md` when matching components are found.

### Category 3 — Focus Management (when modals/drawers/popovers/menus detected)

Cross-reference `keyboard-criteria.md` Criteria 6, 7, and 8. Test focus shift on open, focus return on close, focus trapping within modals, and focus bridging for portaled content. When generating unit tests only (no Cypress/Playwright), note in the gap report that focus trap testing is partial.

### Category 4 — axe-core Automated Scans (when axe-core integration available)

Render the component in multiple states (default + at least one interactive/error state) and run axe scans. Only disable axe rules for documented false positives.

## Rules

- Do NOT mock UI framework components — a11y tests need real rendered output
- Mock at the network boundary only
- Do not test decorative elements marked `aria-hidden="true"` as issues (verify they ARE hidden)
- Do not ask consumers to add ARIA attributes the framework manages internally
- Do not test CSS-based a11y concerns (color contrast, focus ring visibility) in unit tests — note in gap report
- Follow detected repo conventions for test structure, queries, interaction patterns, and file organization

## No Test Library Found

Do NOT generate test files that would fail to run. Recommend appropriate testing libraries for the detected framework, provide the install command, and output the test file content marked as requiring installation first.

## Output

### Test file organization

Follow detected repo convention:
- If a11y tests are in separate files, create a separate a11y test file following that pattern.
- If a11y tests are incorporated in general test files, add to the existing test file.
- If no convention is detected, default to a separate file with a `.a11y.test` infix and the appropriate file extension.

When generating for multiple libraries, output each file separately with a clear header.

### Gap report

After the test file(s), output a coverage gap report listing what was generated (category, library, count) and what was NOT covered (gap, reason, recommended action). Include recommendations for missing test libraries or component-specific notes.

### Related skills

- `pf-test-gen` — General unit tests (rendering, interactions, props, async)
- `pf-a11y-audit` — Static code analysis for WCAG/ARIA violations
- `pf-a11y-keyboard` — Live browser keyboard accessibility testing
