---
name: pf-test-from-spec-gen
description: Generate requirement-traced React Testing Library tests from a component spec or acceptance criteria. Use when the spec is the source of truth and the component may not exist yet.
---

# PF Test from Spec

Generate a test file for a PatternFly React component from a specification or acceptance criteria, rather than from existing implementation details. Each test maps back to a specific requirement for traceability.

## When to use this skill

Use this skill when requirements, acceptance criteria, or a design spec define the behavior and the component is not implemented yet or must be tested against the spec.

Use `pf-test-gen` when the component source already exists and the goal is comprehensive coverage of its implementation-facing API and behavior. This skill may read existing source for imports and renderable API details, but the spec remains the source of truth.

This skill generates tests from a spec. It does not audit existing code, review an implementation, or report general coverage gaps; those concerns belong to the relevant React and code-review skills.

## PatternFly API documentation

When the spec references PatternFly components, consult available PatternFly documentation to verify component APIs, prop names, and expected behaviors before generating test code.

## Input

The user provides one of:
- A requirements document, PRD section, or acceptance criteria (pasted or file path)
- A user story with acceptance criteria
- A Figma design spec or component specification
- A list of behavioral requirements (e.g., "the modal should close on Escape")

Optionally, the user may also provide:
- A component name or file path (if the component already exists)
- The target test framework (default: Jest + React Testing Library)

## Context Detection

Determine the test context from the spec:

- **Component library** (patternfly-react, patternfly-chatbot) — test the API contract: prop variations, spread props, className merging, ref forwarding. For library conventions, defer to the `pf-coding-standards` agent.
- **Consumer application** — test user-visible behavior: rendering, interactions, async flows, error states.

If the component already exists, read it only to align imports, prop names, and renderable structure. Generate behaviors from the spec requirements, not from the implementation.

## How to Generate

### 1. Extract requirements

Parse the spec into discrete, testable requirements. Each requirement should map to one or more test cases. Categorize them:

| Category | Examples |
|----------|---------|
| **Rendering** | "displays user name", "shows empty state when no data" |
| **Interaction** | "closes on Escape", "submits form on Enter" |
| **State** | "disables submit until form is valid", "toggles expanded/collapsed" |
| **Async** | "shows loading spinner during fetch", "displays error on failure" |
| **Accessibility** | "announces status changes to screen readers", "supports keyboard navigation" |

### 2. Generate the test file

For each requirement, write one or more test cases:

```typescript
// Requirement: "Modal closes when user presses Escape"
it('closes when Escape is pressed', async () => {
  const onClose = jest.fn();
  render(<ConfirmModal isOpen onClose={onClose} />);
  await user.keyboard('{Escape}');
  expect(onClose).toHaveBeenCalledTimes(1);
});
```

### 3. Add traceability

Include a comment block at the top of the test file mapping test descriptions to spec requirements:

```typescript
/**
 * Tests generated from: [spec name or source]
 *
 * Requirement coverage:
 * - REQ-1: Modal displays confirmation message → "renders confirmation message"
 * - REQ-2: Modal closes on Escape → "closes when Escape is pressed"
 * - REQ-3: Confirm button triggers action → "calls onConfirm when confirmed"
 */
```

## Spec-driven rules

Before writing tests, read `pf-test-gen` and apply its conventions for Testing Library queries, `userEvent`, mocking, async assertions, and PatternFly library components. The rules below are specific to spec-first generation and take precedence where they differ:

- **One behavior per test** — each test should verify one requirement or sub-requirement
- When the spec is ambiguous about a behavior, generate the test with a `// SPEC-UNCLEAR:` comment noting what needs clarification rather than guessing
- When the spec references a PF component you're unfamiliar with, look up its API before writing assertions against it
- Do not generate tests for implementation details (internal state, private methods) even if the spec implies them — translate to user-visible behavior
- If the component already exists and contradicts the spec, note the discrepancy in a comment but write the test to match the spec — the spec is the source of truth

## Output

Output a complete test file with:
1. Traceability comment mapping tests to requirements
2. Organized `describe` blocks by requirement category
3. All necessary imports and setup
4. `SPEC-UNCLEAR` comments where the spec needs clarification

Name the file `ComponentName.test.tsx`. If no component name is derivable from the spec, ask the user.
