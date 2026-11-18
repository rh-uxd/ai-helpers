---
name: pf-context-gen
description: Generate AI-friendly context files for PatternFly components. Use when preparing context for AI-assisted PF development, onboarding AI tools to a PF codebase, or assembling component references for prompt engineering.
---

# PF Context Generator

Generate a structured context file that assembles PatternFly component documentation, prop schemas, composition patterns, and usage examples into a single reference optimized for AI assistant consumption. Use this to produce a static context file for sharing or committing to a repo. For live, single-component lookups during development, use the PatternFly MCP server directly.

## PatternFly API documentation

If PatternFly documentation tools are available, use them to verify component props, composition rules, and usage patterns before generating context. Without documentation available, rely on the output structure and curation rules in this skill.

## Input

The user provides one of:
- A component name or list of components (e.g., "Table", "Form + FormGroup + TextInput")
- A feature area (e.g., "data tables with filtering and pagination")
- A file path to an existing component to generate context for its PF dependencies

## Context Detection

First, check the request scope. If the user explicitly requests a non-PatternFly framework (Material UI, Chakra, Ant Design, or plain HTML), decline generation and explain that this skill generates PatternFly context only. You may offer an equivalent PatternFly component as an alternative, but do not substitute PatternFly automatically.

Determine the context scope:
- **Single component**: One PF component with its props, variants, and common patterns
- **Component group**: Related components that are typically composed together (e.g., Table + Toolbar + Pagination)
- **Feature context**: A user-facing feature that spans multiple PF components — assemble the full component set needed

For component groups, include the composition relationships — which components wrap which, required vs optional children, and prop threading patterns.

## How to Generate

1. Identify all PatternFly components relevant to the request.
2. For each component, gather:
   - **Import path** — the correct `@patternfly/react-core` (or `react-table`, `react-charts/victory`, etc.) import
   - **Key props** — the props that control behavior, not every prop in the type definition. Focus on props the AI would need to generate correct code.
   - **Composition rules** — required parent/child relationships, slot patterns, and wrapper requirements
   - **Common variants** — the 2-3 most common usage patterns with prop combinations
   - **CSS dependencies** — any required CSS imports beyond `base.css`
3. Assemble into the output format below.

## Component Relationship Map

When multiple components are requested, include a relationship section showing how they compose:

| Relationship | Example |
|---|---|
| Parent → Child (required) | `Form` → `FormGroup` → input control |
| Wrapper (optional) | `Toolbar` around `Table` for filtering |
| Sibling coordination | `Pagination` syncs with `Table` via shared state |
| Provider pattern | `SelectList` inside `Select` with `SelectOption` children |

## Rules

**What to include:**
- Import paths with package names — never assume the reader knows which package a component is in
- Props that affect behavior and composition — not styling-only or passthrough HTML props
- The PF6 pattern for each component — not PF5 patterns that may appear in training data
- Default values for props where the default is non-obvious or frequently overridden
- Accessibility props that are required (e.g., `ariaTitle` on charts, `label` on `FormGroup`)

**What to exclude:**
- Full TypeScript type definitions — too verbose for context files, use prose descriptions
- Every prop — focus on the 5-10 props that drive behavior, not the 30+ including HTML passthrough
- Implementation internals — no Victory internals for charts, no internal CSS class names
- Version history or migration notes — for migration context, defer to `pf-css-migration-scan` and `pf-react-migration-scan`

**Formatting for AI consumption:**
- Use fenced code blocks with `tsx` language tags for all examples
- Keep examples minimal — show the pattern, not a full app
- Use tables for prop summaries — AI tools parse tables efficiently
- Group related components under a single heading rather than separate files
- Include a "Quick Start" snippet at the top that shows the minimum viable usage

**PF6 accuracy:**
- For PF6-specific patterns (import paths, deprecated components, API changes), defer to the `pf-coding-standards` agent — it is active during generation and covers the authoritative rules

## Output

Output a single markdown context file with this structure:

```markdown
# PatternFly Context: [Component/Feature Name]

## Quick Start
[Minimum viable code snippet]

## Components

### [ComponentName]
**Import:** `import { ComponentName } from "@patternfly/react-core";`

**Key Props:**
| Prop | Type | Default | Purpose |
|------|------|---------|---------|

**Usage:**
[Code example showing common pattern]

## Composition
[Relationship map if multiple components]

## Common Patterns
[2-3 real-world usage patterns combining the components]
```

Output the context file inline. If the user wants to save it, they can copy or redirect output to a file.
