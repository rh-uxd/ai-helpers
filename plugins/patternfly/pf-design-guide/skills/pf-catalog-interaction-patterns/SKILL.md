---
name: pf-catalog-interaction-patterns
description: Catalog interaction patterns (click, hover, keyboard, drag) across PatternFly components. Use when selecting a component for a specific interaction need, describing UI behavior without naming a component, or building prototypes that require interaction-based component lookup.
version: 0.1.0
---

Find the right PatternFly component for a given interaction pattern. This skill indexes components by **how users interact with them**, complementing component-centric documentation that answers "what can this component do?"

## PatternFly MCP

If `@patternfly/patternfly-mcp` is available, use it to fetch full documentation, props, and examples **after** identifying the right component from this catalog.

## When to use this skill

- "I need a component that lets users reorder items"
- "What supports keyboard shortcuts?"
- "Which components can expand/collapse content?"
- "What's the right component for a toggle action?"
- Prototyping a UI and need to select components based on required interactions

## Interaction catalog

The catalog lives in `references/interaction-catalog.md`. It maps interaction patterns to components, organized by category (Click, Hover, Keyboard, Drag, Focus, Selection). Read the reference file for the full mapping.

## Workflow

### Finding a component for an interaction

1. User describes the interaction they need (e.g., "reveal help text on hover").
2. Look up the interaction category in `references/interaction-catalog.md`.
3. Return matching components with a one-line summary of how each supports that interaction.
4. If the user wants implementation details, use the PatternFly MCP to fetch full docs.

### Verifying component capabilities

1. User asks what interactions a component supports.
2. Search the catalog for that component name.
3. Return all interaction patterns the component appears in.

## Output format

When returning matches:

```
## Components supporting [interaction pattern]

| Component | How it supports this interaction |
|-----------|----------------------------------|
| Tooltip | Displays on hover after configurable delay; auto-positions |
| Truncate | Shows full text on hover when content overflows |
```

When listing a component's interactions:

```
## Interactions supported by [Component]

- **Click**: Opens/closes the panel
- **Keyboard**: Enter/Space to toggle; Escape to close
- **Focus**: Traps focus when open; restores on close
```

## Common misconception

**Popovers, Menus, and Dropdowns are click-triggered** — PatternFly does not trigger these on hover. Only Tooltip and Truncate respond to hover.
