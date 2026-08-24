---
name: pf-review
description: Run all PatternFly compliance checks on a project — imports, components, colors, legacy CSS, and security. Use when auditing PF code, before merging PRs, or for comprehensive compliance review.
---

# PF Review

Orchestrate all PatternFly compliance sub-skills against a project and produce a unified report. This skill invokes validation and conditional checks from across PF plugins, deduplicates findings, and delivers a prioritized action list.

## Gate check

Read `package.json` in the project root. If no `@patternfly/*` dependencies exist, stop immediately — no PatternFly checks apply. Report that the project is not a PatternFly project and exit.

## How to run

1. **Gate check** — verify `@patternfly/*` dependencies exist in `package.json`
2. **Identify target files** — default to the current working directory. Look for `.tsx`, `.jsx`, `.css`, and `.scss` files. If none exist, report that no auditable files were found and exit.
3. **Run validation skills** — invoke every skill in the validation table below
4. **Evaluate conditional signals** — check each condition in the conditional table
5. **Run matching conditional skills** — invoke only the skills whose conditions are met
6. **Synthesize** — deduplicate, group, and produce the unified report

## Validation skills — always run

When code files exist, invoke each of these skills using the Skill tool:

| Skill | What it checks |
|-------|----------------|
| `/pf-import-check` | Import paths across `@patternfly/*` packages |
| `/pf-component-check` | Component nesting, wrapper hierarchies, layout composition |
| `/pf-color-scan` | Hardcoded hex/rgb/hsl values that should use design tokens |
| `/pf-migration-scan` | Legacy CSS classes, removed props, renamed components, changed APIs |
| `/pf-security-scan` | XSS, unsanitized user input, insecure href patterns |

Invoke each skill in sequence. Pass the same target directory or files to each. If a sub-skill is unavailable or returns an error, continue with the remaining skills and note the skip in the report. Collect all findings before moving to conditional skills.

## Conditional skills — invoke when signals are present

Check each condition against the current project context. Invoke only the skills whose conditions are met:

| Skill | When to invoke |
|-------|----------------|
| `/pf-component-reuse-check` | Custom components that may overlap PatternFly APIs |
| `/pf-css-token-check` | Inline styles with hardcoded spacing, font sizes, or border values |
| `/pf-test-gen` | Components exist without corresponding test files |
| `/pf-figma-check` | Figma URLs are in the conversation |
| `/pf-figma-token-check` | Figma URLs are in the conversation |
| `/pf-icon-finder` | Figma mockups contain icons to identify |
| `/pf-project-gen` | User is scaffolding a new project |
| `/pf-ai-audit` | Feature involves AI-powered UX (chatbots, assistants, generation) |

## Synthesis

After all skills complete, produce a unified report:

1. **Deduplicate** — remove findings that overlap across skills (e.g., a legacy CSS class flagged by both migration-scan and color-scan)
2. **Group by severity** — errors first, then warnings, then informational
3. **Attribute** — for each finding, note which skill produced it
4. **Prioritize** — end with an action list ordered by severity and estimated fix effort

## Report format

```
## PatternFly Compliance Report

**Scanned:** [N] files | **Skills invoked:** [list]

### Errors

- [SKILL] file/path.tsx:42 — [description]
  Fix: [recommended action]

### Warnings

- [SKILL] file/path.tsx:18 — [description]
  Fix: [recommended action]

### Info

- [SKILL] [description]

---

## Prioritized Action List

1. [highest severity, lowest effort first]
2. ...
```
