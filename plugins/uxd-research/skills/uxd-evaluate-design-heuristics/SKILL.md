---
name: uxd-evaluate-design-heuristics
description: >-
  Score a design against accessibility, visual hierarchy, content, and state
  coverage heuristics. Use when a team asks for an AI design critique,
  a heuristic review, or a neutral evaluation of one or more design directions.
  Works with screenshots, Figma context, or any visual input.
---

# Evaluate Design Heuristics

Structured, neutral heuristic evaluation of a design. Scores against a rubric and produces an actionable report — works for a single design or a side-by-side comparison of multiple directions.

This skill evaluates **visual design context** (screenshots, metadata, tokens). It does not handle fetching designs from external tools — use other available skills (e.g. for Figma, Jira, etc.) to gather inputs first if needed.

## Input

The skill expects one or more of the following, provided by the user or by an upstream skill:

| Input | Required | Source |
|-------|----------|--------|
| Screenshots of the design(s) | **Yes** | Figma export, browser screenshot, uploaded image, etc. |
| Page/frame names from the file | Recommended | Design tool export or user-provided |
| Jira ticket or design brief | Optional | User-provided URL or description |
| Specific evaluation criteria | Optional | User-provided (e.g., "we care most about X") |

If screenshots are not available, **stop and ask** the user to provide them (or point to a source where another available skill can capture them).

## Output

Given the required inputs, this skill produces:

- **Verdict** — Pass or Fail. Any dimension scoring 1 or 2 triggers a Fail, with the failing dimensions listed by name. Always returned.
- **Evaluation scores** — each design scored 1–5 across visual hierarchy & scannability, accessibility, content & microcopy, and state coverage, with a one-sentence justification per score. Always returned. Formatted as a markdown table by default, or as JSON when `format=json`.
- **Average score** — unweighted average across all scored dimensions. Useful for comparing directions, but does not determine pass/fail. Always returned.
- **Critical issues** — any blockers that should be fixed before shipping. Always returned.
- **Full report** *(optional)* — a structured write-up including strengths/weaknesses, actionable improvements, and (for comparisons) a side-by-side summary with a recommendation. Controlled by the `report` flag.

## Flags

| Flag | Default | Description |
|------|---------|-------------|
| `report` | `true` | Generate a full structured report (strengths, weaknesses, improvements, recommendation). Set to `false` to return only scores and critical issues — useful in automations or pipelines where downstream steps consume the scores directly. |
| `format` | `markdown` | Output format for scores and critical issues. `markdown` returns human-readable tables. `json` returns a structured JSON object — useful when a downstream skill or automation needs to parse the results programmatically. |
| `dimensions` | all | Comma-separated list of dimensions to evaluate (e.g. `accessibility, content`). Omit to evaluate all default dimensions. |

Flags can be set by the caller inline (e.g. "evaluate this design, report=false") or passed programmatically by an upstream skill or automation.

## Workflow

### Step 1: Determine scope

Look at the input to decide whether this is a single-design review or a comparison.

- **Single design** — one screenshot or one cohesive set of screens. Evaluate it on its own.
- **Multiple directions** — separate screenshots or named frames representing different approaches. Evaluate each and compare.
- **Ambiguous** — ask the user which designs to evaluate and whether they're alternatives or parts of the same flow.

If page/frame names are available, use them as labels in the report.

### Step 2: Gather context

Before evaluating, collect any available context that should inform the criteria:

1. **Jira ticket or brief** — If the user provided a Jira link, read the ticket for acceptance criteria, success metrics, user journey scope, and accessibility requirements
2. **User-supplied criteria** — Ask the user if they have specific evaluation criteria beyond the defaults (e.g., "we care most about CTR" or "accessibility is the top priority")

### Step 3: Evaluate

Score each design against the evaluation rubric. See [references/evaluation-rubric.md](references/evaluation-rubric.md) for the full rubric with scoring guidance.

If the user provided success criteria, add a **goal alignment** dimension that evaluates how well the design serves those specific metrics.

For each design and each dimension:
- Assign a score (1–5) with a one-sentence justification
- Note any critical issues (blockers that should be fixed)
- Note any strengths worth preserving

### Step 4: Return results

**Always return** (regardless of other flags):
1. **Verdict** — Pass or Fail. Any dimension at 1 or 2 = Fail. List every failing dimension by name.
2. **Scores** — all evaluated dimensions with scores and one-sentence justifications
3. **Average score** — unweighted average across scored dimensions, rounded to one decimal
4. **Critical issues** — blockers that should be fixed before shipping

**If `format=json`**, return results as a JSON object instead of markdown tables:

```json
{
  "designs": [{
    "label": "Option A",
    "verdict": "fail",
    "failing_dimensions": ["Accessibility"],
    "scores": [
      { "dimension": "Visual hierarchy & scannability", "score": 4, "justification": "..." },
      { "dimension": "Accessibility", "score": 2, "justification": "..." },
      ...
    ],
    "average_score": 3.4,
    "critical_issues": ["..."]
  }]
}
```

When `report=true` and `format=json`, the report sections (strengths, weaknesses, improvements, recommendation) are included as additional fields in the same JSON object.

**If `report=true`** (the default), also produce a full structured report. See [references/report-template.md](references/report-template.md) for the output format.

For a single design, the report adds:
3. **Strengths and weaknesses** — evidence-based observations
4. **Actionable improvements** — specific, prioritized changes

For multiple directions, the report also adds:
5. **Side-by-side summary table** — all directions scored across all dimensions
6. **Recommendation** — which direction best serves the stated goals, with clear reasoning
7. **Dissenting notes** — if another direction has unique strengths the recommendation doesn't capture, call them out so the team can make an informed tradeoff

**If `report=false`**, stop after returning the scores table and critical issues.

**Neutrality guidance:** The evaluation must be evidence-based. Cite specific visual or structural observations, not subjective preferences. If comparing directions and two are close, say so — don't force a winner. If the user mentioned preferences, evaluate everything on equal footing and let the scores speak.

## Error Handling

| Problem | Action |
|---------|--------|
| No screenshots or visual context provided | Stop and ask the user to provide screenshots or point to a source another skill can read |
| Screenshots are too low-resolution to assess details | Note which dimensions could not be fully scored and ask for higher-resolution images |
| Only one direction provided but user asked for comparison | Clarify whether they want a single-design review or need to provide additional directions |

## Tips

- **Always show the screenshots** to the user alongside the report so they can follow the reasoning.
- **Don't evaluate what you can't see.** If interaction states, responsive behavior, or prototypes aren't visible in the screenshots, note them as "not assessed" rather than guessing.
- **Pair with Jira context.** If the design is linked to a Jira ticket, the acceptance criteria and success metrics make the evaluation significantly more grounded.
- **When comparing, 2–5 directions is ideal.** More than 5 dilutes the comparison.
- **Use page/frame names as labels.** If the designer named their pages "Option A" and "Option B", use those labels in the report — it maps to how the team already talks about the work.

## Reference Docs

| Doc | When to load |
|-----|-------------|
| [evaluation-rubric.md](references/evaluation-rubric.md) | Full rubric with scoring anchors for each dimension |
| [report-template.md](references/report-template.md) | Output format template for the final report |
