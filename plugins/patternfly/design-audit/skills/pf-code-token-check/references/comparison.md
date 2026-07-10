# Comparison: pf-code-token-check vs pf-color-scan

## Overview

`pf-code-token-check` is a comprehensive replacement for `pf-color-scan` with expanded scope and better token recommendations.

## Key Differences

### Scope

| Feature | pf-color-scan | pf-code-token-check |
|---------|-------------------|----------------------|
| Colors | ✅ | ✅ |
| Spacing | ❌ | ✅ |
| Typography | ❌ | ✅ |
| Shadows | ❌ | ✅ |
| Border Radius | ❌ | ✅ |

### Token Recommendations

**pf-color-scan:**
- Generic recommendation: "Replace with a semantic or primitive design token"
- No token hierarchy
- No specific token suggestions

**pf-code-token-check:**
- Shows full token hierarchy: Raw → Palette → Base → Semantic
- Always recommends semantic tokens when they exist
- Suggests semantic token names with PatternFly conventions when they don't exist
- Provides before/after examples for each violation

### File Support

Both support:
- CSS/SCSS
- CSS-in-JS
- React inline styles

### Output Format

**pf-color-scan:**
```
- File Name: Button.scss
- File Path: src/components/Button.scss
- Line Number: 42
- Property: background-color
- Raw Value: #c9190b
- Recommendation: "Replace with a semantic or primitive design token"
```

**pf-code-token-check:**
```
### 1. Button.scss

- File Path: `src/components/Button/Button.scss`
- Line Number: `42`
- Property: `background-color`
- Raw Value: `#c9190b`
- Token Hierarchy:
  1. Raw value: `#c9190b`
  2. Palette token: `--pf-t--color--red--40`
  3. Base token: `--pf-t--global--color--status--danger--default`
  4. Semantic token: `--pf-v6-c-button--m-danger--BackgroundColor`
- Recommendation: Replace with `var(--pf-v6-c-button--m-danger--BackgroundColor)`
- Example:
  ```css
  /* Before */
  background-color: #c9190b;
  
  /* After */
  background-color: var(--pf-v6-c-button--m-danger--BackgroundColor);
  ```
```

## Choosing Between Skills

Both skills are available for design token auditing, with different levels of coverage.

**pf-code-token-check advantages:**
- Comprehensive coverage across colors, spacing, typography, shadows, and border radius
- Full token hierarchy with specific recommendations
- Semantic token suggestions following PatternFly conventions

**pf-color-scan advantages:**
- Focused exclusively on color detection
- Simpler output for color-only audits

## When to Use Each

**Use pf-code-token-check when:**
- You need comprehensive coverage (colors, spacing, typography, shadows, border radius)
- You want specific token recommendations with full hierarchy
- You're refactoring to PatternFly v6
- You want semantic token suggestions following PatternFly conventions

**Use pf-color-scan when:**
- You only need color detection
- You prefer simpler, color-focused output
