# Report Template

Use this template structure when producing the evaluation output. The single-design template is the default; expand to the comparison format when evaluating multiple directions.

## Single-Design Template

```markdown
# Design Evaluation: [Design Name or Jira Key]

**File:** [Figma URL]
**Date:** [evaluation date]
**Pages in file:** [list page names from the Figma file]
**Dimensions scored:** [number]

## Context

[1–3 sentences summarizing what the design is for, drawn from the Jira ticket or user description. Include the key success metric if provided.]

---

## Verdict: [Pass / Fail]

[If Fail, list failing dimensions:]
- **Failing dimensions:** [dimension name (score X)], [dimension name (score X)]

---

## Scores

| Dimension | Score | Justification |
|-----------|-------|---------------|
| Visual hierarchy | X | [one sentence] |
| Accessibility | X | [one sentence] |
| Content & microcopy | X | [one sentence] |
| State coverage | X | [one sentence] |
| Goal alignment | X | [one sentence] |
| **Average** | **X.X** | |

---

## Strengths

- [specific observation with visual evidence]
- [specific observation with visual evidence]

## Weaknesses

- [specific observation with visual evidence]
- [specific observation with visual evidence]

## Critical Issues

[Issues that must be fixed before shipping, or "None identified."]

1. [issue with specific location/element referenced]
2. [issue with specific location/element referenced]

## Recommended Improvements

1. [Specific, actionable change with rationale]
2. [Specific, actionable change with rationale]
3. [Specific, actionable change with rationale]

---

## Methodology

Scored against [N] dimensions using the UXD evaluation rubric. Visual analysis performed on [PNG screenshots at 2x / MCP screenshots]. [Note any dimensions that were excluded and why.]
```

---

## Comparison Template

When the file contains multiple design directions, expand the report to compare them side-by-side.

```markdown
# Design Evaluation: [Design Name or Jira Key]

**File:** [Figma URL]
**Date:** [evaluation date]
**Pages in file:** [list page names from the Figma file]
**Directions evaluated:** [number]
**Dimensions scored:** [number]

## Context

[1–3 sentences summarizing what the design is for, drawn from the Jira ticket or user description. Include the key success metric if provided.]

---

## Verdicts

| Direction | Verdict | Failing Dimensions |
|-----------|---------|-------------------|
| Direction A | [Pass / Fail] | [dimension (score X), ...] or — |
| Direction B | [Pass / Fail] | [dimension (score X), ...] or — |
| Direction C | [Pass / Fail] | [dimension (score X), ...] or — |

---

## Summary

| Dimension | Direction A | Direction B | Direction C |
|-----------|-------------|-------------|-------------|
| Visual hierarchy | X.X | X.X | X.X |
| Accessibility | X.X | X.X | X.X |
| Content & microcopy | X.X | X.X | X.X |
| State coverage | X.X | X.X | X.X |
| Goal alignment | X.X | X.X | X.X |
| **Average** | **X.X** | **X.X** | **X.X** |

---

## Direction A: [Name from Figma]

[Screenshot or reference to the screenshot]

**Verdict:** [Pass / Fail] [If Fail: failing dimensions — dimension (score X), ...]

**Strengths:**
- [specific observation with visual evidence]
- [specific observation with visual evidence]

**Weaknesses:**
- [specific observation with visual evidence]
- [specific observation with visual evidence]

**Critical issues:**
- [issues that must be fixed, or "None"]

**Dimension scores:**

| Dimension | Score | Justification |
|-----------|-------|---------------|
| Visual hierarchy | X | [one sentence] |
| Accessibility | X | [one sentence] |
| Content & microcopy | X | [one sentence] |
| State coverage | X | [one sentence] |
| Goal alignment | X | [one sentence] |

---

[Repeat for Direction B, C, etc.]

---

## Recommendation

**Recommended direction:** [Direction X]
**Average score:** [X.X] vs next closest [Direction Y] at [X.X]

[2–4 sentences explaining why this direction best serves the stated goals. Reference specific scores and observations.]

### Improvements for the recommended direction

1. [Specific, actionable change with rationale]
2. [Specific, actionable change with rationale]
3. [Specific, actionable change with rationale]

### Dissenting notes

[If another direction has unique strengths not captured by the recommendation, call them out here. If the scores are close (< 0.5 difference), state that the directions are roughly equivalent and the decision may come down to other factors.]

---

## Methodology

Scored against [N] dimensions using the UXD evaluation rubric. Visual analysis performed on [PNG screenshots at 2x / MCP screenshots]. [Note any dimensions that were excluded and why.]
```

---

## Guidance

### Choosing the template

- **One design in scope** — use the single-design template. This is the default.
- **Multiple directions in scope** — use the comparison template. Name each direction using the page or frame name from Figma.

### When directions are close

If the average scores differ by less than 0.5, don't force a winner:

> **Result: Near-tie between Direction B and Direction C**
>
> Both directions score within 0.3 points of each other. The decision should weigh factors beyond this evaluation: implementation effort, timeline, stakeholder alignment, and user testing feasibility.

### When one direction is clearly best

Lead with conviction:

> **Recommended direction: Direction B (4.2 average)**
>
> Direction B outscores the alternatives by 0.8+ points, driven by stronger visual hierarchy and a more accessible CTA treatment.

### Quick reviews

For informal evaluations, collapse into a shorter format:

```markdown
# Quick Eval: [Name]

| Dimension | Score |
|-----------|-------|
| [dim] | X |
| **Average** | **X.X** |

**Verdict:** [one sentence summary]

**Fix before shipping:**
1. [critical issue]
2. [critical issue]
```
