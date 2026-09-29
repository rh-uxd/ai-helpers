# Glass Mode audit report

Use this format for audits and unresolved implementation violations. For completed implementation work, a brief summary of decisions and validation is sufficient.

Apply the handbook's audit scope and decision table. Report distinct violations in severity order; do not count the same issue under multiple rules. Missing `isPlain` on cards is not a violation. Keep advisory image reviews separate from violation counts.

## Report structure

Start with `## Glass Mode Violations Found: {count}`. When there are no violations, state that clearly; do not fabricate fixes or key actions.

For each finding:

````markdown
### {n}. [{severity}] {rule-id}: {rule-name}

- **File:** `{path}`
- **Line:** {number}
- **Component:** `{component-name}`
- **Issue:** {one-sentence description}
- **Fix:**

```tsx
// Before
{current code}

// After
{corrected code}
```
````

Finish with severity counts and prioritized actions derived only from the actual findings:

```markdown
## Summary

| Severity | Count |
|----------|-------|
| CRITICAL | {n} |
| HIGH | {n} |
| MEDIUM | {n} |
| LOW | {n} |

### Key actions
1. {highest-priority correction}
```

Identify any limits of the review, such as unavailable application theme configuration or background images requiring visual inspection.
