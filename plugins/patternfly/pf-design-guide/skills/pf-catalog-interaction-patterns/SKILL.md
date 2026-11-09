---
name: pf-catalog-interaction-patterns
description: Catalog interaction patterns (click, hover, keyboard, drag) and coordinated behaviors across PatternFly components, including forms and wizards. Use when selecting a component for a specific interaction need, describing UI behavior without naming a component, looking up a component's supported interactions, building prototypes that require interaction-based component lookup, or defining workflow behaviors such as validation, navigation, unsaved-work protection, and submission/recovery.
version: 0.1.0
---

Find the right PatternFly component for a given interaction pattern, or look up the interactions a component supports. This skill indexes components by **how users interact with them**, complementing component-centric documentation that answers "what can this component do?" It also covers coordinated interaction patterns across components, including form and wizard workflows that require application state rather than a component alone.

## PatternFly MCP

If `@patternfly/patternfly-mcp` is available, use it to fetch full documentation, props, and examples **after** identifying the right component from this catalog.

For form and wizard implementation, retrieve their design guidelines and relevant examples, plus Helper text accessibility guidance. Match APIs and examples to the project's installed PatternFly version. If MCP is unavailable, use the linked official guidance in the behavior reference; do not invent props or claim examples implement every application policy.

## When to use this skill

- "I need a component that lets users reorder items"
- "What supports keyboard shortcuts?"
- "Which components can expand/collapse content?"
- "What's the right component for a toggle action?"
- "How should a wizard validate steps and protect unsaved work?"
- "How should a form report errors and recover from a failed save?"
- Prototyping a UI and need to select components based on required interactions

## Interaction catalog

The catalog lives in [references/interaction-catalog.md](references/interaction-catalog.md). It maps interaction patterns to components, organized by category (Click, Hover, Keyboard, Drag, Focus, Selection, Workflow).

For form or wizard workflows, read [references/form-wizard-behaviors.md](references/form-wizard-behaviors.md). It covers validated progression, unsaved-work protection, accessible validation feedback, and submission/recovery. Cancellation and submission have one shared policy for both components.

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

### Coordinating form and wizard behaviors

1. Choose a surface based on task complexity, dependencies, and context; do not force simple forms into wizards.
2. Read the form and wizard behavior reference and identify the applicable behaviors and their required state.
3. State product-specific validation gates, meaningful-edit criteria, supported exit paths, and submission/retry semantics. Ask for missing policy when it affects correctness.
4. Recommend components together with the application-owned coordination, exceptions, and interaction checks. For implementation details, retrieve version-matched MCP guidance if available.
5. Distinguish guidance coverage from verified behavior. Do not report success based only on compilation, component props, or a prose checklist.

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

For coordinated workflows, add the applicable behavior, required application state/policy, and verification checks after the component matches. Keep the response scoped to the user's task; do not reproduce the entire reference.

## Common misconception

**Popovers, Menus, and Dropdowns are click-triggered** — PatternFly does not trigger these on hover. Only Tooltip and Truncate respond to hover.
