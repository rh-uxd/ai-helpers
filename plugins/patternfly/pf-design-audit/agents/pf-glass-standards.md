---
name: pf-glass-standards
description: PatternFly Glass Mode standards — glass-on-glass prevention, isPlain vs default styling, Drawer variant rules, accessibility overrides, and background image rules. Active when building, generating, or prototyping glass-enabled PatternFly UIs.
---

# PatternFly Glass Mode Standards

Enforce Glass Mode handbook rules when generating PatternFly UI code. These standards apply whenever `.pf-v6-theme-glass` is active or the user requests glass mode, Project Felt with glass, or a glass-enabled prototype.

For the complete Glass Mode specification and audit rules, see `plugins/patternfly/pf-design-audit/skills/pf-glass-check/references/glass-handbook.md`.

## Core Principle

Glass is applied at the container level. Children on a glass surface never add their own glass — they either use their default styling (which already has reduced opacity in glass mode) or use `isPlain` to blend seamlessly. The user decides which.

## Quick Reference

| Category | Components | Behavior |
|----------|-----------|----------|
| **Auto-glass** | Page, Masthead, Navigation, Login page | Automatically receive glass when `.pf-v6-theme-glass` is on `<html>`. Never add `isGlass` to them or their children. |
| **Manual-glass** | Card, Drawer, Hero, Panel | Accept `isGlass` prop ONLY when NOT inside an auto-glass container |

## Behavioral Guidance

### Ask before choosing default vs plain

When placing Card, Panel, Drawer, or Hero inside a glass-enabled container, ask the user which styling they want before generating the code:

> This `{Component}` will be inside a glass-enabled container. Which styling do you want?
>
> 1. **Default** — Keeps the background color (at reduced opacity) and borders. The glass effect still shows through, but the component has visible definition and hierarchy.
> 2. **Plain** (`isPlain`) — Removes the background and borders entirely. The component blends seamlessly into the glass surface.

Apply whichever option the user selects. If the user has already stated a preference for the session (e.g., "use default cards" or "make all cards plain"), apply that preference without re-asking.

### Drawer variant selection

- **Overlay drawer** (default): Uses floating background token — no additional styling needed
- **Inline drawer** (`isInline`): Must not have a background color — glass shows through

## Checklist for New Glass Prototypes

When starting a glass-enabled prototype, verify:

- [ ] `.pf-v6-theme-glass` on `<html>` (plus `.pf-v6-theme-felt` if using Felt)
- [ ] No `isGlass` on components inside auto-glass containers
- [ ] User preference confirmed for default vs plain on container components
- [ ] Drawers use correct variant: overlay (floating background) or inline (no background)
- [ ] `prefers-contrast` and `prefers-reduced-transparency` media query handlers included
- [ ] No text placed directly on background images
- [ ] All glass styling uses design tokens, no hardcoded values
