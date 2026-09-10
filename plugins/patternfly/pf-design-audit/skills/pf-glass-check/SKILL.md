---
name: pf-glass-check
description: Audit PatternFly prototypes for Glass Mode handbook violations — glass-on-glass layering, missing isPlain, accessibility overrides, and background image rules. Use when building or reviewing glass-enabled UIs or prototypes.
---

### Objective

Analyze the provided React, HTML, or CSS source for violations of the PatternFly Glass Mode handbook. Report every violation with its location, severity, and a corrected code example. The most damaging mistake — and the one to flag first — is layering glass on glass by adding `isGlass` to child components inside a container that already has glass enabled.

### Rules

Read `references/glass-handbook.md` for the full Glass Mode specification and audit rules. Apply the rules defined in the **Audit Rules** section, checking in severity order: CRITICAL first, then HIGH, MEDIUM, LOW. Report violations using the output format below.

### Quick Reference: Auto-glass vs. manual-glass

| Category | Components | How glass is applied |
|----------|-----------|---------------------|
| **Auto-glass** | Page, Masthead, Navigation, Login page | Automatically receive glass when `.pf-v6-theme-glass` is on `<html>` |
| **Manual-glass** | Card, Drawer, Hero, Panel | Accept the `isGlass` prop — but ONLY when they are NOT inside an auto-glass container |
| **Glass-surface children** | Any component sitting on a glass surface | Use `isPlain` to remove solid backgrounds and borders so the glass effect shows through |

### Output Format

For every violation found, provide:

**Header:**
```
## Glass Mode Violations Found: {count}
```

**Per violation:**
```
### {n}. [{severity}] {rule-id}: {rule-name}

- **File:** `{path}`
- **Line:** {number}
- **Component:** `{component-name}`
- **Issue:** {one-sentence description of what's wrong}
- **Fix:**
  ```tsx
  // Before
  {current code}

  // After
  {corrected code}
  ```
```

**Summary:**
```
## Summary

| Severity | Count |
|----------|-------|
| CRITICAL | {n} |
| HIGH | {n} |
| MEDIUM | {n} |
| LOW | {n} |

### Key actions
1. Remove `isGlass` from all components inside glass-enabled containers
2. Confirm styling intent (default vs. plain) for components on glass surfaces
3. Verify Drawer variant matches glass context (overlay = floating background, inline = no background)
4. Add `prefers-reduced-transparency` and `prefers-contrast` media query support
5. Replace hardcoded glass-related CSS values with glass design tokens
```

### Workflow

1. Establish the glass context — is `.pf-v6-theme-glass` active? Which containers have `isGlass`?
2. Build the component tree and identify glass surfaces
3. Scan every component for CRITICAL-1 and HIGH violations first
4. Scan CSS/SCSS for MEDIUM and LOW violations
5. Report violations in severity order with corrected code examples
6. Provide a summary with prioritized actions

### File Type Support

- **React/JSX/TSX** — Component tree analysis for `isGlass`, `isPlain` props and nesting
- **HTML** — `.pf-v6-theme-glass` class detection, inline style scanning
- **CSS/SCSS** — Glass token usage, media query coverage, background image overrides

### Exception Handling

**Do NOT flag:**
1. `isGlass` on components that are NOT inside a glass-enabled container (valid standalone use)
2. Components in test files or mock data (unless explicitly requested)
3. Glass tokens referenced via `var(--pf-t--...)` syntax
4. Default PatternFly background images (only flag custom overrides)
5. Code inside comments

### Decision Table

Quick-reference for component prop scanning:

| Component | On glass surface? | Has `isGlass`? | Has `isPlain`? | Result |
|-----------|-------------------|----------------|----------------|--------|
| Card, Hero, Panel | Yes | Yes | — | Violation: CRITICAL-1 |
| Card, Hero, Panel | Yes | No | No | Prompt: HIGH-1 (confirm default vs. plain) |
| Card, Hero, Panel | Yes | No | Yes | Pass |
| Card, Hero, Panel | No | Yes | — | Pass (valid standalone use) |
| Card, Hero, Panel | No | No | — | Pass |
| Drawer (overlay) | Yes | Yes | — | Violation: CRITICAL-1 |
| Drawer (overlay) | Yes | No | — | Pass (floating background token by default) |
| Drawer (inline) | Yes | — | — | Check: HIGH-2 (no background color in glass) |
| Drawer | No | — | — | Pass |
