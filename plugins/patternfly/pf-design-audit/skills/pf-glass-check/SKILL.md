---
name: pf-glass-check
description: Implement and audit PatternFly Glass Mode screens using the Glass Mode handbook. Use whenever a user mentions Glass Mode while building, generating, editing, or reviewing PatternFly screens, UIs, or prototypes, including Project Felt with glass. Prevent nested glass, preserve default card styling with optional isPlain, and apply accessibility and background image rules from the start.
---

## Use the handbook first

When a prompt includes Glass Mode for a PatternFly screen, use this skill during implementation without waiting for an audit request. Before generating, editing, or auditing React, HTML, CSS, or SCSS, read [the handbook](references/glass-handbook.md), including its decision table, audit scope, and rules. It is the source of detailed component behavior, examples, accessibility requirements, tokens, and background guidance.

## Essential behavior

- Never nest glass surfaces.
- Prefer default cards; `isPlain` is optional. Preserve explicit styling choices and do not require confirmation before proceeding.
- Overlay drawers never use `isGlass`, regardless of parent.
- Inline drawers inside glass parents require `isPlain` on `DrawerPanelContent`, without `isGlass`.

## Workflow and delivery

1. Establish theme enablement and identify glass parents before selecting component props.
2. Apply the handbook while implementing; review the resulting component tree and styles against its rules in severity order before delivery.
3. For implementation, deliver the code and briefly summarize glass decisions and validation.
4. For an audit or unresolved implementation violations, read [the audit report format](references/audit-report.md) and report actionable findings with locations and corrected examples.
