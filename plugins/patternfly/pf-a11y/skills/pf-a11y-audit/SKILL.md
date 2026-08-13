---
name: pf-a11y-audit
description: Audit PatternFly components and pages against WCAG and ARIA best practices. Use when reviewing accessibility, fixing screen reader issues, or validating ARIA usage in PatternFly-based applications.
---

### Objective

Analyze PatternFly code for WCAG violations and PatternFly-specific accessibility pitfalls. This is code-level auditing — it reviews markup, component usage, and ARIA attributes in source files. It does not run automated testing tools like axe-core.

Works with PatternFly HTML/CSS, PatternFly React, downstream PatternFly org repos (Chatbot, component-groups, etc), and consumer codebases that import PatternFly.

> **WCAG reference: 2.2** (W3C Recommendation, October 2023). Use this reference version anytime WCAG is mentioned or used throughout this skill. Update this reference version and date when a new WCAG version becomes the W3C Recommendation.

### PatternFly MCP and component accessibility docs

If `@patternfly/patternfly-mcp` is available, use it for current component API details and accessibility guidance. This skill defines the audit rules; the MCP fills in API specifics.

Many PatternFly components have an "Accessibility" tab on their documentation pages with component-specific a11y notes and recommendations. When auditing a component, check for this documentation and surface relevant recommendations to the user — these are often more specific than general WCAG rules.

### Audience detection

Determine which audience the codebase belongs to before auditing:

**PatternFly developer** — the codebase is a PatternFly org repo (core HTML/CSS library, React library, or a downstream PatternFly repo like Chatbot or component-groups). Signals: workspace root contains `packages/` with PatternFly component source, `package.json` has `@patternfly` in its `name` field, or repo is under the `patternfly` GitHub org.

Focus on:
- ARIA attributes are correctly wired to component props or HTML attributes
- Components expose the right a11y props for consumers to use
- Default accessible names are sensible and documented
- Roles and states are correctly assigned in component source

**Consumer** — the codebase is a non-PatternFly product that imports and uses PatternFly (React or HTML/CSS). Signals: `@patternfly/*` packages in `dependencies`, or PatternFly CSS classes (`pf-v6-c-*`, `pf-v6-l-*`) in markup.

Focus on:
- Accessible names are passed via props or attributes (not relying on defaults)
- Multiple instances of the same component have unique labels
- Live regions are used correctly for dynamic content
- Component-specific a11y documentation is followed

### Audit rules

#### WCAG Level A and AA

Audit all code against WCAG Level A and Level AA success criteria (see version above). Report violations as `ERROR`. Report best-practice gaps that don't violate a specific criterion as `WARN`.

#### PatternFly-specific checks

In addition to WCAG, check for the following PatternFly-specific issues:

- **ARIA attribute correctness** (ERROR) — Cross-reference `references/aria-attributes.md`. Check that PatternFly component props match their ARIA attribute intent and that required attributes are always present (e.g., `aria-selected` on listbox options must be `true`/`false`, never omitted).
- **Live region announcements** (ERROR) — Check that dynamically added content uses `aria-live`. For PatternFly: `Alert` uses `isLiveRegion` prop, `AlertGroup` wraps dynamic alerts with `isLiveRegion`, toast patterns use the correct politeness level.
- **PatternFly-specific gotchas** (WARN) — Cross-reference `references/pf-gotchas.md`. Flag patterns like duplicate default accessible names, conflicting ARIA attributes, and missing landmark labels.

### Exception handling

Do NOT flag:
- Decorative images explicitly marked with `alt=""` or `aria-hidden="true"`
- Test files, storybook stories, or mock data (unless explicitly requested)
- ARIA attributes that PatternFly components manage internally (e.g., PatternFly `Select` manages `aria-expanded` — do not ask consumers to add it manually)
- Valid uses of `role="presentation"` or `role="none"`
- Components in code comments or disabled code blocks

### Workflow

1. Ask the user which directory or files to audit. Default to the current working directory.
2. Determine audience (PatternFly developer vs. consumer) using the signals described in audience detection.
3. Search for files containing PatternFly imports (`@patternfly/react-core`, `@patternfly/react-table`, `@patternfly/chatbot`) or PatternFly CSS classes (`pf-v6-c-*`, `pf-v6-l-*`).
4. For each PatternFly component found, check for component-specific accessibility documentation via PatternFly MCP (if available). Note any component-specific recommendations.
5. Run all applicable audit rules against each file. Reference `references/aria-attributes.md` for ARIA correctness checks and `references/pf-gotchas.md` for PatternFly-specific checks.
6. Report findings using the output format below.
7. If the user requests fixes, apply unambiguous fixes only. If a fix requires choosing accessible text (label content, descriptions), report it and ask the user for the text.

### Output format

Per finding:
```
[ERROR|WARN|INFO] file/path.tsx:42 — description (WCAG X.X.X)
  Found: what was detected
  Fix: recommended action
```

Use `ERROR` for WCAG Level A/AA violations and PatternFly checks marked ERROR. Use `WARN` for best-practice gaps. Use `INFO` for suggestions and component-specific doc recommendations. Include the WCAG success criterion number when applicable.

End with a summary:
```
## Accessibility Audit Summary
Scanned: N files
Errors: N (WCAG A/AA violations)
Warnings: N (best practice gaps)
Info: N (suggestions)
```

Group findings by file, then by severity within each file.
