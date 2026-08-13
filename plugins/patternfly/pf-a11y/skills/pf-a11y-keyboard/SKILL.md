---
name: pf-a11y-keyboard
description: Test keyboard accessibility of PatternFly UIs via live browser interaction. Use when validating keyboard navigation, focus management, or interaction patterns in a running application.
---

Test keyboard navigation, focus management, and interaction patterns in a running PatternFly application using live browser automation.

This skill is not a complete replacement for manual keyboard testing. It covers common, well-defined keyboard accessibility criteria, but manual testing should still be conducted for complex, dynamic, or uncommon UI patterns that may not be fully exercised by automated interaction.

## Requirements

This skill requires **Playwright MCP** for live browser interaction. If Playwright MCP tools are not available, stop and inform the user:

> **Playwright MCP is required for keyboard accessibility testing.**
> This skill tests keyboard interactions in a live browser and cannot operate without Playwright MCP.
> See the Playwright MCP documentation for installation instructions.

## Input

| Source | Required | Description |
|--------|----------|-------------|
| URL | Yes | URL to a running application (localhost or deployed) |
| Focus area | No | Specific component, page region, or interaction flow to prioritize |

The URL may point to a full consumer application or an isolated component demo (Storybook, PatternFly docs example, local dev server for a library repo like patternfly-react or chatbot). Determine the context from the page content:

- **Full application**: All criteria apply. Recommendations should suggest PatternFly components and props that resolve violations.
- **Isolated component demo**: Page-level criteria (skip navigation) may be N/A. Recommendations should address the component implementation itself — the fix lives in the component's source code, not in how a consumer uses it.

If the user provides a focus area, test that area first but still check page-level criteria (skip navigation, sequential tab order) across the full page when applicable.

## Criteria

Load these reference files from `$CLAUDE_SKILL_DIR`:

- **`references/keyboard-criteria.md`** — General keyboard accessibility criteria with expected behaviors, test procedures, and common violations. All criteria apply unless explicitly not applicable to the page (e.g., no modals present means the focus trapping criterion is N/A).
- **`references/component-specifics.md`** — Keyboard behavior expectations for specific PatternFly components (and similar custom implementations). Apply these when a matching component is identified on the page during baseline inspection.

## Workflow

### Step 0 — Prerequisites and setup

1. Verify Playwright MCP tools are available. If not, stop with the setup message above.
2. Navigate to the provided URL using Playwright. Wait for full page load.
3. Set viewport to desktop dimensions (1440 x 900).
4. Capture a baseline screenshot of the loaded page.

### Step 1 — Baseline inspection

1. Read the full accessibility tree to understand the page structure.
2. Identify all interactive elements: buttons, links, inputs, selects, menu toggles, custom controls.
3. Identify elements that open secondary contexts: modal triggers, drawer openers, popover triggers, menu toggles, dropdown toggles.
4. Identify menu-like contexts: Menu, Select, Dropdown, navigation groups, listboxes.
5. Map the expected sequential focus order based on DOM order and `tabindex` attributes.
6. Record the total count of interactive elements found.

### Step 2 — Keyboard criteria testing

Work through each criterion in `references/keyboard-criteria.md` sequentially (the criteria are ordered by recommended testing sequence). For each criterion:

1. Perform the keyboard actions described in the criterion's "What to test" section.
2. After each key press, read the focused element or accessibility tree to verify focus moved as expected.
3. Capture a screenshot when a violation is found, showing the current state.
4. Record the result: **Pass**, **Fail**, or **N/A** (with reason).

Skip any criterion that does not apply to the page (e.g., no modals present, isolated component demo without page-level navigation).

### Step 3 — Report

Present findings in the following format.

#### Summary

| Total criteria tested | Pass | Fail | N/A |
|---|---|---|---|
| _count_ | _count_ | _count_ | _count_ |

#### Findings

| Criterion | Element(s) | Status | Details |
|---|---|---|---|
| _criterion name_ | _element description and role_ | Pass / Fail / N/A | _what was observed; expected vs. actual behavior_ |

#### Violations

For each failure, provide:

- **Criterion**: Which keyboard criterion was violated
- **Element**: The element or interaction involved (include role and accessible name)
- **Expected**: What should have happened
- **Actual**: What did happen
- **Severity**: Critical / Major / Minor (as defined in the criteria reference)
- **Screenshot**: Reference to the captured screenshot showing the issue

Severity definitions:
- **Critical** — Blocks keyboard-only users entirely from completing a task or accessing content
- **Major** — Significantly impairs keyboard use; workaround may exist but is not obvious
- **Minor** — Inconvenient but a reasonable workaround exists

#### Recommendations

For each violation, suggest a fix. If a PatternFly component exists that would resolve the issue, recommend it by name. Reference ARIA authoring practices where applicable.
