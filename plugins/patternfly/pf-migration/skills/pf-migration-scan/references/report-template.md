# Report template

Copy this structure when generating `pf-migration-scan-report.md`.

```markdown
# PatternFly Migration Report

**Generated:** [YYYY-MM-DD]
**Scan path:** [path]
**Version range:** [PF X → PF Y]
**Packages scanned:** [list of @patternfly/react-* packages found in codebase]

## Executive summary

[2–4 sentences: total findings, highest severity items, estimated migration effort]

| Category | Count |
|----------|-------|
| CSS class migrations | [n] |
| Token migrations | [n] |
| React API breaking changes | [n] |

| Severity | Count |
|----------|-------|
| Critical | [n] |
| High | [n] |
| Medium | [n] |

**Top actions:**

1. [Most urgent migration step]
2. [Second priority]
3. [Third priority]

---

## CSS and token findings

### Legacy classes

[Omit section if none]

| File | Line | Current class | Replacement | Confidence |
|------|------|---------------|-------------|------------|
| `src/...` | 12 | `pf-v5-c-button` | Use `<Button>` component or `pf-v6-c-button` | high |

### Legacy tokens

[Omit section if none]

| File | Line | Current token | Replacement | Confidence |
|------|------|---------------|-------------|------------|
| `src/...` | 34 | `--pf-global--spacer--md` | `--pf-t--global--spacer--md` | high |

---

## React API findings by severity

### Critical

[Omit section if none]

#### [Component or API change title]

- **Package:** `@patternfly/react-core`
- **Change type:** [removed component | removed prop | import path | …]
- **Documentation:** [link to upgrade guide, release notes, or PR]
- **Migration:** [what to do instead]

| File | Line | Current usage | Required change | Confidence |
|------|------|---------------|-----------------|------------|
| `src/...` | 42 | `<Chip>...</Chip>` | Replace with `<Label>` | high |

---

### High

[Same structure as Critical]

---

### Medium

[Same structure — typically deprecated imports still working via `/deprecated`]

---

## Findings by component

Alphabetical index for developers fixing one component at a time.

### [ComponentName]

**Breaking change:** [one-line description]

| File | Line | Issue | Fix |
|------|------|-------|-----|
| `src/...` | 10 | Uses removed prop `isActive` | Remove prop; visibility handled by parent |

---

## Packages affected

| Package | Installed version | Target version | Findings |
|---------|-------------------|----------------|----------|
| `@patternfly/react-core` | 5.4.0 | 6.3.0 | 12 |
| `@patternfly/react-table` | 5.4.0 | 6.3.0 | 3 |

---

## Recommended migration steps

1. [ ] Update `@patternfly/react-*` dependencies in `package.json`
2. [ ] Run `npx @patternfly/pf-codemods@latest --v6 <path>` (review before `--fix`)
3. [ ] Address Critical findings
4. [ ] Address CSS class and token migrations
5. [ ] Address High findings
6. [ ] Run build and tests; fix TypeScript errors from removed exports/props
7. [ ] Review Medium / deprecated usage for cleanup

---

## References

- [PatternFly upgrade guide](https://www.patternfly.org/get-started/upgrade)
- [pf-codemods](https://github.com/patternfly/pf-codemods)
- [Release notes](https://www.patternfly.org/get-started/upgrade/release-notes)
```
