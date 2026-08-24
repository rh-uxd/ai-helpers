---
name: pf-migration-scan
description: >-
  Scan code for PatternFly migration issues — deprecated CSS classes, removed props,
  renamed components, changed APIs, and legacy tokens. Use when upgrading between
  PF versions, auditing a codebase for breaking changes, or planning migration effort.
disable-model-invocation: true
---

# PF Migration Scanner

Identify **all PatternFly migration issues** in a codebase — CSS classes, React API breaking changes, legacy tokens — and deliver a unified markdown report.

## Scope

### CSS and token migrations

- Legacy versioned classes (`pf-v5-*`, `pf-v4-*`)
- Unversioned legacy classes (`pf-c-*`, `pf-u-*`, `pf-l-*`)
- Legacy token patterns (`--pf-v6-*`, `--pf-global-*`) that should use semantic tokens (`--pf-t--*`)

### React API breaking changes

Packages matching `@patternfly/react-*`, including:

- `@patternfly/react-core`, `@patternfly/react-table`, `@patternfly/react-charts`
- `@patternfly/react-component-groups`, `@patternfly/react-drag-drop`, `@patternfly/react-tokens`
- Other `@patternfly/react-*` extension packages

Breaking change types:

| Category | Examples |
|----------|----------|
| Removed or deprecated components | `Chip` → `Label`, deprecated `Modal` import path |
| Renamed components or subcomponents | `Text` → `Content`, `KebabToggle` → `MenuToggle` |
| Removed, renamed, or retyped props | `isActive` removed, `isDisabled` → behavior change |
| Import or export path changes | `@patternfly/react-charts` → `@patternfly/react-charts/victory` |
| Composition or API structure changes | `EmptyStateHeader` no longer exported; new required wrappers |
| Renamed TypeScript types or enums | `SplitButtonOptions` deleted, enum value removed |
| Hook or render-prop signature changes | Callback arity or argument shape changed |

### Out of scope

- `@patternfly/patternfly`, `@patternfly/chatbot`, `@patternfly/patternfly-mcp`
- App-level refactors unrelated to PatternFly API changes
- Purely visual/CSS override breakage without a React API change

## Workflow

### 1. Establish context

Confirm with the user (or infer from `package.json` / git diff):

- **Scan path** — directory or files (default: project `src/`)
- **From version** — current PatternFly version(s)
- **To version** — target version (for example PF5 → PF6, or `6.2.0` → `6.3.0`)
- **Packages** — which `@patternfly/react-*` packages are in use

Read `package.json` (and lockfile if needed) for installed `@patternfly/react-*` versions.

### 2. Scan for CSS and token issues

Search the scan path for legacy class names and tokens:

```bash
rg "pf-v5-|pf-v4-|pf-c-|pf-u-|pf-l-" --glob "*.{ts,tsx,js,jsx,scss,css,html}" <scan-path>
rg "--pf-v6-|--pf-global-" --glob "*.{ts,tsx,js,jsx,scss,css}" <scan-path>
```

For each finding record:

- File path and line number
- Current class or token
- Recommended PF6 replacement
- Confidence (`high`, `medium`, `low`)

CSS replacement guidance:

- Prefer PatternFly React component props and composition first.
- If a utility class is still needed, use `pf-v6-u-*` variants.
- Prefer semantic tokens (`--pf-t--*`) over hardcoded values and legacy token names.

### 3. Inventory PatternFly React usage

Search the scan path for imports and API usage:

```bash
rg "@patternfly/react-" --glob "*.{ts,tsx,js,jsx}" <scan-path>
rg "from ['\"]@patternfly/react-" --glob "*.{ts,tsx,js,jsx}" <scan-path>
```

Build a list of:

- Packages imported
- Components, hooks, types, and enums used
- Props passed to PatternFly components (focus on props known to break between versions)

Group by file for cross-referencing.

### 4. Load authoritative breaking changes

Use the **PatternFly MCP server** before guessing:

1. `searchPatternFlyDocs` with queries like `upgrade`, `upgradeguide`, `release notes`, or specific component names.
2. `usePatternFlyDocs` for:
   - `upgradeguide` — PF6 upgrade guide and codemod rule list
   - Release notes for the target version range
   - Component docs/schemas for removed props or renamed exports

If the PatternFly MCP server is unavailable, continue without stalling: reference the [pf-codemods README](https://github.com/patternfly/pf-codemods) rule list and the [PatternFly upgrade guide](https://www.patternfly.org/get-started/upgrade/) directly, and check GitHub release notes for the target version range.

For **PF5 → PF6**, also reference the [pf-codemods README](https://github.com/patternfly/pf-codemods) rule list — each rule maps to a documented breaking change with PR links.

For **minor/patch upgrades**, check the target release notes and GitHub PRs for `@patternfly/react-core` and related packages.

### 5. Optional — validate with pf-codemods

When upgrading to PF6 (or when the user asks for machine verification), run a **dry run** (no `--fix`):

```bash
npx @patternfly/pf-codemods@latest --v6 <scan-path>
```

Use codemod output to supplement MCP findings. Codemod hits are **in scope** because they flag React API breaking changes. Do not auto-fix unless the user requests it.

### 6. Cross-reference codebase

For each known breaking change in the version range:

1. Search the inventory for affected components, props, imports, types, classes, or tokens.
2. Record **file path**, **line number**, **current usage**, and **required change**.
3. Assign **severity**:
   - **Critical** — build/runtime failure (removed export, removed required prop replacement, invalid import, missing class causing broken layout)
   - **High** — deprecated API with recommended replacement; behavior change likely
   - **Medium** — deprecated but still works via `@patternfly/react-core/deprecated` or legacy class with a direct rename; manual follow-up advised

4. Assign **confidence**:
   - **high** — direct match (import of removed component, use of removed prop name, exact legacy class prefix)
   - **medium** — usage pattern likely affected (composition change, markup change affecting tests)
   - **low** — possible impact; note for manual review

Do not invent breaking changes. If MCP/docs do not document a change for the stated version range, omit it or mark as "unverified — manual review".

### 7. Generate the markdown report

Write the report to a file the user can share (default: `pf-migration-scan-report.md` in the project root unless the user specifies otherwise).

Use the template in [references/report-template.md](references/report-template.md).

Present the report to the user and summarize the highest-severity items.

## Detection patterns

When MCP/docs identify a breaking change, search the codebase with targeted patterns.

The examples below use **PF5 → PF6** component and prop names. For minor/patch upgrades, derive search patterns from the breaking changes documented in release notes — do not blindly search for these PF5→PF6 names.

```bash
# Legacy CSS classes
rg "pf-v5-|pf-v4-|pf-c-|pf-u-|pf-l-" --glob "*.{ts,tsx,js,jsx,scss,css,html}" <scan-path>

# Legacy tokens
rg "--pf-v6-|--pf-global-" --glob "*.{ts,tsx,js,jsx,scss,css}" <scan-path>

# Removed or deprecated components
rg "\bChip\b|\bKebabToggle\b|\bTile\b" --glob "*.{ts,tsx}" <scan-path>

# Renamed components
rg "\bText\b.*@patternfly/react-core|\bContentHeader\b" --glob "*.{ts,tsx}" <scan-path>

# Removed props (examples — extend per version docs)
rg "isActive|isHidden|hasNoPadding|backgroundColor|leftBorderVariant" --glob "*.{ts,tsx}" <scan-path>

# Import path changes
rg "from ['\"]@patternfly/react-charts['\"]" --glob "*.{ts,tsx}" <scan-path>
rg "from ['\"]@patternfly/react-core/deprecated['\"]" --glob "*.{ts,tsx}" <scan-path>

# React tokens
rg "@patternfly/react-tokens" --glob "*.{ts,tsx}" <scan-path>
```

Adapt patterns to the breaking changes documented for the user's version range — do not rely on this fixed list alone.

## Related tools

| Tool | When to use |
|------|-------------|
| `pf-import-check` | Invalid import paths after upgrade |
| `pf-codemods` | Automated fixes for many PF5 → PF6 React API changes |
| PatternFly MCP | Authoritative upgrade guide, release notes, component schemas |

## Quality checklist

Before delivering the report:

- [ ] Every finding references a specific file, line, and PatternFly change
- [ ] CSS class and React API findings are clearly categorized in separate report sections
- [ ] Each finding has file location, current code, migration guidance, severity, and confidence
- [ ] Version range and scan scope are documented in the report header
- [ ] Summary counts match the detailed findings
- [ ] For PF5 → PF6 major upgrades, pf-codemods is referenced
