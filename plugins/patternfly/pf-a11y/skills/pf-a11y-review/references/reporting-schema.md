# Accessibility Reporting Schema

Use one normalized finding model across source review, axe, keyboard testing, viewport/media checks, and semantic-tree evaluation. The final presentation may be Markdown, JSON, YAML, or a product tracker draft, but preserve the same meaning.

## Finding fields

| Field | Required | Description |
|---|---|---|
| `id` | Yes | Stable identifier within the report |
| `title` | Yes | Concise problem and affected surface |
| `type` | Yes | `violation`, `best-practice`, `observation`, or `coverage-gap` |
| `source` | Yes | `axe`, `source-audit`, `keyboard`, `media`, `semantic-tree`, or `manual` |
| `ruleId` | No | Tool or methodology rule identifier |
| `wcag` | No | Criterion, title, level, and reference URL when applicable |
| `target` | Yes | Page, component, element, selector, or source location |
| `state` | No | Default, expanded, error, loading, route transition, or other relevant state |
| `environment` | No | Viewport, zoom/text size, theme, media settings, data source, and build |
| `expected` | Yes | Required accessible behavior |
| `actual` | Yes | Observed behavior |
| `evidence` | Yes | Tree excerpt, DOM target, screenshot, active element, code location, or tool output |
| `impact` | Yes | `critical`, `serious`, `moderate`, or `minor` |
| `confidence` | Yes | `confirmed`, `likely`, or `needs-manual-verification` |
| `recommendation` | Yes | Outcome-focused remediation guidance |
| `limitations` | No | Evidence or capability limits affecting the conclusion |

Do not invent a WCAG criterion solely to make a finding look complete. Best-practice findings may cite PatternFly or ARIA guidance without claiming WCAG nonconformance.

## Severity normalization

Severity describes user impact, not whether a tool emitted an error:

- **Critical** — blocks an essential task or access to essential content
- **Serious** — creates a major barrier with no reliable or obvious workaround
- **Moderate** — degrades access but a reasonable workaround exists
- **Minor** — causes limited friction or affects a secondary experience

Preserve axe impact when the finding comes from axe. For keyboard reports, map `Critical` directly, assess whether `Major` is serious or moderate from task impact, and map `Minor` directly. Source-audit `ERROR`, `WARN`, and `INFO` are finding classifications, not impact levels; assess impact separately when consolidating.

Product priority is intentionally separate. A downstream team may map impact to its tracker priorities using product risk, prevalence, and release context.

## Example

```yaml
id: A11Y-004
title: Modal close loses focus from the invoking button
type: violation
source: keyboard
wcag:
  criterion: 2.4.3
  title: Focus Order
  level: A
target:
  page: /settings
  component: Delete confirmation modal
  element: button "Delete account"
state: modal close
expected: Focus returns to the invoking control or a logical successor.
actual: Focus moves to the document body.
evidence:
  - kind: active-element
    value: body
impact: serious
confidence: confirmed
recommendation: Restore focus to the invoking button when the modal closes.
```

## Coverage matrix

For each surface, report these phases as Pass, Fail, N/A with a reason, or Not tested with a limitation:

| Surface/state | axe | Keyboard/focus | Media matrix | Semantic tree | Manual AT |
|---|---|---|---|---|---|

Do not use an overall Pass when any applicable phase is Not tested. Use **No findings in tested coverage** when that is the accurate conclusion.

## Final report

1. **Scope and environment** — surfaces, states, exclusions, build, data, and conditions
2. **Executive summary** — finding counts by impact and important themes
3. **Coverage matrix** — completed and untested checks
4. **Findings** — one entry per distinct problem using the normalized fields
5. **Coverage gaps and limitations** — missing capabilities and manual verification needs
6. **Recommended next actions** — remediation, persistent tests, and retest priorities

Draft one issue-ready entry per distinct violation when requested. Do not file issues without explicit user approval.
