# Design-stage checks and comparison

Use with named frames, screenshots, and/or attributed specifications. These checks assess evidence available at design time, not an implemented product's WCAG conformance.

## DESIGN-01 — Evidence and visual measurements

- Identify frame/state, export scale, known CSS dimensions, and token/spec provenance. Image pixels do not automatically equal CSS pixels. Do not guess unreadable labels, dimensions, colors, weight, or compositing.
- For text/non-text contrast and color-only meaning, use the thresholds and exceptions in [visual checks](visual-runtime.md). An 18px regular label is not large text. Measure trustworthy colors; treat uncertain screenshot sampling as tentative.
- Check whether status, selection, required state, and errors rely on color alone. Evaluate useful labels/instructions separately from a future accessible name; screenshots cannot establish computed names.
- Inspect available focus-state designs. Absence of a focus frame is a coverage gap, not proof that the implemented focus indicator is missing.

## DESIGN-02 — Target size and layout risks

- Assess the intended interactive area, not just the visible icon. WCAG 2.2 AA target size is 24×24 CSS px with exceptions; 44×44 is the enhanced AAA target, not a universal AA minimum.
- For undersized targets, check the spacing exception using 24px-diameter circles centered on bounding boxes: they must not intersect another target or another undersized target's circle. Also consider equivalent controls, inline targets, unmodified user-agent controls, and essential presentation exceptions.
- If hit-area or scale evidence is missing, request it or report uncertainty rather than asserting a size failure. Larger targets can still be recommended separately from conformance.
- Flag demonstrated clipping and design risks from long text, fixed containers, narrow layouts, and overlay placement. A static frame cannot prove behavior at 200% text resize or 320 CSS px reflow.

## DESIGN-03 — Applicable states and implementation handoff

- Inspect applicable empty/loading/error/success, hover, focus, active/pressed, selected/expanded, disabled, visited-link, and responsive states. Check that state treatments preserve readability and convey necessary information. Record missing states needed to assess the task as coverage gaps; do not assume every control requires every state or that an undocumented state is an implementation defect.
- Distinguish temporary activation feedback (`:active`) from a toggle's persistent pressed state. Review visited styling only for relevant links, not buttons; hover review includes any supplementary content it reveals.
- Use [forms and updates](forms-and-updates.md) for error/required instructions and status intent. Specify information and focus needs without assuming every update needs an alert.
- Keep desired reading order, focus behavior, and semantic requirements distinct from observed rendering. A PF component name or token does not prove accessible composition or runtime behavior.
- Give outcome-focused recommendations and indicate which checks need source, browser, or manual AT evidence. This is not a role-specific checklist or a broader semantic-content audit.

## DESIGN-04 — Optional scores and compact output

Default to findings and coverage; score when requested or when an upstream workflow needs the accessibility score. Scores summarize observed design quality and are never conformance percentages.

| Score | Anchor within assessed scope |
|---|---|
| 1 | Fundamental barriers block the intended task |
| 2 | Significant accessibility defects need correction |
| 3 | Assessed essentials are met; improvements remain |
| 4 | Strong treatment with minor refinements |
| 5 | Particularly effective treatment across the assessed evidence |

- Insufficient evidence: use unassessed/null, not a fabricated score. Do not give a clean score that hides a demonstrated criterion failure.
- Retain requested accessibility subdimensions and justify scores. Exclude unknown/N/A dimensions from averages and disclose the denominator; an average cannot erase a failure. Do not score unrelated UX dimensions here.
- If a legacy caller requests Pass/Fail, label it a design-quality verdict: Fail for known applicable failures, Inconclusive for insufficient required evidence, or no findings in assessed coverage. Never translate a score of 3+ into WCAG conformance.
- `report=false` means compact scope, scores if requested, findings/critical issues, and limitations; it does not suppress failures or unknowns. `format=json` preserves these fields as structured values, with null for unassessed scores.
- For JSON output, return one valid JSON value without Markdown wrappers, HTML entities used as indentation, or backslashes appended to line endings. When tooling is available, parse the exact serialized output before delivering it. For a requested file, validate that file directly; validating a repaired copy does not establish that the original was valid. Keep compact output brief by recording shared coverage gaps once instead of repeating them per design.
- For comparisons, report each named design separately before a brief comparison. Link or display available frames when useful; never fabricate a screenshot or claim a specification was visually inspected. Do not force a winner from small score differences or uneven evidence.

## Sources

- [WCAG target size, minimum](https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html)
- [WCAG target size, enhanced](https://www.w3.org/WAI/WCAG22/Understanding/target-size-enhanced.html)
- [WCAG use of color](https://www.w3.org/WAI/WCAG22/Understanding/use-of-color.html)
