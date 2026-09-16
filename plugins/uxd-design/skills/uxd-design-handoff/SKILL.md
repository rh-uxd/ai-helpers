---
name: uxd-design-handoff
version: 0.1.0
description: >-
  Produce an implementation-ready design handoff spec from a validated design.
  Maps UI elements to design system components, enumerates all states, and
  generates testable acceptance criteria. Use when transitioning from design
  to development.
---

# Design Handoff

Produces a structured, implementation-ready handoff spec from a validated design. Works with prototypes, Figma exports, text descriptions, journey maps, or any design artifact. Maps every UI element to design system components, enumerates all visual and interaction states, and generates testable acceptance criteria traced back to design decisions.

This skill is standalone -- any team can use it without a broader workflow.

## Input

| Input | Required | Source |
|-------|----------|--------|
| Design artifact (prototype files, Figma screenshots, text description) | **Yes** | User-provided or upstream skill output |
| Journey map or user flow | Optional | User-provided; scopes the spec to relevant screens and steps |
| Research findings or design rationale | Recommended | User-provided or linked document |
| Target design system | Optional | Auto-detected from project or user-specified |
| Responsive breakpoints | Optional | Defaults to standard breakpoints if not specified |

If no design artifact is provided, **stop and ask** the user to share one before proceeding.

## Output

The handoff spec is written to a local file (markdown by default, JSON when `--format=json`). It includes:

| Output | Description |
|--------|-------------|
| Component Map | Every UI element mapped to a design system component with props/variants noted |
| State Matrix | All states per component/view: empty, loading, error, populated, partial, responsive |
| Interaction Specs | User flows, transitions, keyboard navigation, focus management |
| Acceptance Criteria | Testable AC for each component and state, traced to design decisions |
| Accessibility Notes | WCAG compliance, ARIA roles, keyboard support, screen reader expectations |
| Open Questions | Ambiguities or gaps that need design/product clarification |

## Arguments

$ARGUMENTS

Parse as: `<design-input> [--design-system <name>] [--breakpoints <list>] [--format <markdown|json>]`

| Flag | Default | Description |
|------|---------|-------------|
| `--design-system` | auto-detect | Target design system (e.g., `patternfly`, `material`, `custom`). Auto-detected from project dependencies when possible. |
| `--breakpoints` | `sm:576, md:768, lg:992, xl:1200, 2xl:1450` | Responsive breakpoints to enumerate. |
| `--format` | `markdown` | Output format. `json` writes a structured object to a local file for programmatic consumption. |

---

## Step 1: Gather Design Input

Read the design artifact. Accepts prototype files, Figma screenshots, text descriptions, or any combination.

If no design input is present, ask:

> What design should I create a handoff spec for? You can share:
> - Prototype files or a path to a prototype directory
> - Exported Figma screenshots
> - A journey map or user flow for the design
> - A text description of the design
> - A link to design documentation

Do not proceed until a design artifact is available.

If a journey map or user flow is available, use it to keep the handoff scoped to the screens and steps that are actually relevant. Do not expand the spec to every screen in the design artifact unless those screens appear in the flow.

If research findings or design rationale are available (e.g., from a research study, design review, or decision log), read those too -- they inform traceability in the acceptance criteria.

## Step 2: Detect Design System

Determine the target design system. Check in order: explicit `--design-system` flag, project dependencies in `package.json` (e.g., `@patternfly/react-core`, `@mui/material`), then fall back to generic component descriptions. Note the detected system in the output.

## Step 3: Component Inventory

Walk through the design screen by screen. For each UI element, identify:

- **Element** -- what it is visually (e.g., "filter toolbar above the table")
- **Component** -- the design system component it maps to (e.g., `Toolbar` with `ToolbarFilter`)
- **Variants/Props** -- relevant configuration (e.g., `variant="compact"`, `isStriped`)
- **Content** -- labels, placeholder text, icons, data shape

Continue to Step 4.

## Step 4: State Enumeration

For each component and view identified in Step 3, enumerate these states:

| State | Description |
|-------|-------------|
| **Empty** | No data available, first-time use, or cleared state |
| **Loading** | Data is being fetched or processed |
| **Error** | Request failed, validation failed, or system error |
| **Populated** | Normal state with data present |
| **Partial** | Some data loaded, some pending or unavailable |
| **Responsive** | Behavior at each breakpoint (stacking, hiding, collapsing) |

Not every state applies to every component. Skip states that are not relevant (e.g., a static heading does not have a loading state) and note why.

For responsive states, describe the behavior at each breakpoint rather than listing every combination.

## Step 5: Interaction Specification

Document:

- **User flows** -- happy path and key alternatives, step by step. If a journey map or user flow was provided, use it as the source rather than reconstructing flows from the design alone, and stay scoped to those steps.
- **Transitions** -- animations, progressive disclosure, route changes between states
- **Keyboard navigation** -- tab order, arrow key behavior within composite widgets, shortcut keys
- **Focus management** -- where focus moves after modals close, inline edits, async operations

## Step 6: Acceptance Criteria

Generate testable acceptance criteria for each component and state. Each AC must be:

- **Specific** -- references a concrete component, state, or interaction
- **Testable** -- a developer or QA engineer can verify pass/fail
- **Traced** -- linked to the design decision or research finding that motivated it, when available

Format:

```
AC-[N]: [Component] — [State/Behavior]
  Given [precondition]
  When [action]
  Then [expected outcome]
  Trace: [design decision, research finding, or "Design spec"]
```

When research findings or design rationale are available, reference them in the `Trace` field. When no rationale is documented, use "Design spec" as the trace source.

## Step 7: Accessibility Requirements

For each component, document applicable WCAG success criteria, required ARIA roles and attributes, expected keyboard interactions per WAI-ARIA Authoring Practices, and screen reader announcement expectations.

## Step 8: Generate Handoff Document

Compile the full handoff spec using this structure into a local file. Name the file after the feature or page (e.g. `design-handoff-{slug}.md`) and write it in the current workspace.

**Note: If `--format=json`**, write the same content as a structured JSON object to a local `.json` file instead of markdown.

```markdown
# Design Handoff: [Feature/Page Name]

**Design system:** [detected or specified]
**Date:** [YYYY-MM-DD]
**Source:** [design artifact reference]

## Component Map

| # | Element | Component | Variants/Props | Notes |
|---|---------|-----------|----------------|-------|
| 1 | ...     | ...       | ...            | ...   |

## State Matrix

| Component | Empty | Loading | Error | Populated | Partial | Responsive |
|-----------|-------|---------|-------|-----------|---------|------------|
| ...       | ...   | ...     | ...   | ...       | ...     | ...        |

## Interaction Specs

### User Flows
[step-by-step flows]

### Keyboard Navigation
[tab order, arrow keys, shortcuts]

### Focus Management
[focus movement rules]

## Acceptance Criteria

[AC-1 through AC-N in Given/When/Then format with traces]

## Accessibility

[Per-component WCAG, ARIA, keyboard, screen reader notes]

## Open Questions

[Ambiguities or gaps needing clarification]
```

Present the handoff spec to the user for review. Provide a link or directory path to any output files.

> Here is the complete handoff spec: <insert-link-here>. Please review it with the development team. Let me know if any sections need revision or if there are open questions to resolve.

## Guardrails

- **Do not fabricate UI elements.** Only map components that are visible or described in the design input. If something is ambiguous, add it to Open Questions.
- **Stay scoped to the journey.** If a journey map or user flow was provided, do not document screens or interactions outside that flow.
- **Do not assume a design system.** If none is detected or specified, use generic descriptions.
- **Acceptance criteria must be testable.** Avoid vague language like "should look good" or "should be intuitive." Every AC must have a verifiable pass/fail condition.
- **Trace when possible, not when imagined.** Only reference research findings or design decisions that actually exist in the provided materials. Do not invent rationale.
- **Accessibility is not optional.** Every handoff spec must include the accessibility section, even if the design input does not mention it.
- **Responsive is not optional.** Enumerate responsive behavior even if the design only shows one breakpoint. Note assumptions clearly.
- **AI transparency.** Note that the component mapping and state enumeration are based on the assistant's interpretation of the design and may need verification by the development team.
