---
name: pf-i18n-audit
description: Audit PatternFly React code for i18n readiness — hardcoded user-facing strings, concatenation anti-patterns, locale-dependent formatting, and RTL-unsafe CSS. Use when reviewing code for global deployment or auditing i18n compliance.
---

# PF i18n Audit

Audit PatternFly React components for internationalization readiness. All Red Hat products ship globally — OpenShift, HCC, and Ansible all require comprehensive i18n. This skill finds hardcoded strings, unsafe formatting, and RTL layout issues before they become translation bugs.

## PatternFly API documentation

If PatternFly documentation tools are available, use them to verify component text props and layout behavior before flagging. Without documentation available, rely on the anti-pattern rules and tables in this skill.

## Input

The user provides a directory, file path, or set of components to audit. Default to the current working directory. Limit scope to `.tsx`, `.jsx`, `.ts`, and `.css`/`.scss` files.

## What to audit

### 1. Hardcoded user-facing strings

Flag string literals rendered in UI components that should be externalized for translation.

**Flag these:**
- String literals in PF text surfaces: `Title`, `Content`, `Alert` title, `EmptyState` titleText, `Label`, `Badge`, `Tooltip` content, `Button` children, `FormGroup` label, `HelperText`
- String literals in HTML text elements: `<h1>`, `<p>`, `<span>`, `<label>`, `<th>`, `<td>`
- Template literals that embed user-visible text: `` `Welcome, ${name}` ``
- Aria labels and accessibility text with hardcoded strings

**Do not flag (developer-facing strings):**
- Console logs, `console.error`, `console.warn`
- Test IDs and `data-testid` values
- CSS class names and style properties
- Import paths and module names
- Error codes and API endpoint paths
- Comments and JSDoc
- String literals used only as object keys or enum values
- Environment variable names

### 2. String concatenation anti-patterns

Flag string construction patterns that break in languages with different word order.

| Pattern | Problem | Fix |
|---------|---------|-----|
| `"Hello " + name + "!"` | Word order varies by language | Use ICU MessageFormat: `t('greeting', { name })` |
| `` `${count} items found` `` | Pluralization rules differ (Arabic has 6 forms) | Use plural-aware formatter: `t('items_found', { count })` |
| `"Created on " + date` | Date position varies by locale | Use a single translation key with placeholder |
| `label + ": " + value` | Colon, spacing, and order vary | Use a single key: `t('label_value', { label, value })` |

### 3. Locale-dependent formatting

Flag direct use of locale-sensitive APIs without i18n formatters.

| What | Anti-pattern | i18n-safe alternative |
|------|-------------|----------------------|
| **Dates** | `new Date().toLocaleDateString()` without locale arg, `.toISOString()` for display, manual `MM/DD/YYYY` formatting | `Intl.DateTimeFormat` or library (date-fns with locale) |
| **Numbers** | `.toFixed(2)` for currency, manual comma insertion, `Number.toString()` for display | `Intl.NumberFormat` with currency/unit options |
| **Currency** | `"$" + amount`, hardcoded currency symbol | `Intl.NumberFormat` with `style: 'currency'` |
| **Lists** | `items.join(", ")` | `Intl.ListFormat` |
| **Relative time** | `"5 minutes ago"`, manual time-ago strings | `Intl.RelativeTimeFormat` |

### 4. RTL-unsafe CSS patterns

Flag CSS that uses physical (LTR-biased) properties instead of logical equivalents. PF design tokens handle RTL internally — only flag custom CSS.

| Physical (flag) | Logical (correct) |
|----------------|-------------------|
| `margin-left` / `margin-right` | `margin-inline-start` / `margin-inline-end` |
| `padding-left` / `padding-right` | `padding-inline-start` / `padding-inline-end` |
| `text-align: left` / `right` | `text-align: start` / `end` |
| `float: left` / `right` | `float: inline-start` / `inline-end` |
| `left` / `right` (positioning) | `inset-inline-start` / `inset-inline-end` |
| `border-left` / `border-right` | `border-inline-start` / `border-inline-end` |

**Do not flag:**
- Physical properties on non-directional axes (`margin-top`, `padding-bottom`) — these are unaffected by RTL
- PF design token usage (`var(--pf-t--global--spacer--md)`) — tokens handle RTL internally
- `transform: translateX()` when used for animations, not layout positioning

### 5. Missing translation infrastructure

Check for signs that the project has no i18n setup:
- No `i18next`, `react-intl`, `react-i18next`, or equivalent in `package.json`
- No translation files (`*.json` in `locales/`, `translations/`, `i18n/`)
- No `t()`, `formatMessage()`, or `<Trans>` usage anywhere in the codebase

If no i18n infrastructure exists, report it as a top-level finding rather than flagging every individual string.

## Rules

- Distinguish user-facing from developer-facing strings — false positives on log messages and test IDs erode trust
- When no i18n framework is installed, recommend setup rather than flagging every string individually
- RTL findings apply only to custom CSS — PF6 components handle RTL internally
- `Intl.*` APIs are acceptable alternatives to full i18n libraries for formatting
- Single-character strings and numbers are not translation candidates

## Report format

```markdown
## i18n Audit: [directory or component]

### Infrastructure

[i18n framework detected / not detected — with setup recommendation if missing]

### Hardcoded Strings

| File | Line | String | Context | Recommendation |
|------|------|--------|---------|---------------|
| UserList.tsx | 23 | "No users found" | EmptyState titleText | Externalize to translation key |

### Concatenation Anti-patterns

| File | Line | Pattern | Fix |
|------|------|---------|-----|
| Dashboard.tsx | 45 | `` `${count} items` `` | Use plural-aware: `t('item_count', { count })` |

### Locale-dependent Formatting

| File | Line | API | Fix |
|------|------|-----|-----|
| OrderTable.tsx | 67 | `"$" + price` | `Intl.NumberFormat` with `style: 'currency'` |

### RTL-unsafe CSS

| File | Line | Property | Fix |
|------|------|----------|-----|
| sidebar.scss | 12 | `padding-left: 16px` | `padding-inline-start: 16px` |

### Summary

Strings: [N] hardcoded | Concatenation: [N] anti-patterns | Formatting: [N] issues | RTL: [N] unsafe
```

Do not fabricate file paths or line numbers — read the actual source files before reporting.
