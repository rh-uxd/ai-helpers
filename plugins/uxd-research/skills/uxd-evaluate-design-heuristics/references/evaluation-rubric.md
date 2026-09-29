# Evaluation Rubric

Scoring anchors for each evaluation dimension. Each dimension uses a 1–5 scale.

## Scoring Scale

| Score | Label | Meaning |
|-------|-------|---------|
| 1 | Critical issues | Fundamental problems that would block users or violate standards |
| 2 | Significant gaps | Noticeable problems that would hurt usability or compliance |
| 3 | Adequate | Meets baseline expectations with room for improvement |
| 4 | Strong | Well-executed with only minor refinements needed |
| 5 | Excellent | Best-in-class execution that others should learn from |

---

## Dimension 1: Visual Hierarchy & Scannability

Evaluates whether the design guides the user's eye to the most important elements first.

**What to look for:**
- Primary action/CTA has the highest visual weight (size, color, contrast, position)
- Information follows a natural scan pattern (F-pattern for text-heavy, Z-pattern for landing pages)
- Clear distinction between primary, secondary, and tertiary content
- Whitespace creates breathing room between logical groups
- No competing focal points — the eye settles quickly

**Scoring anchors:**

| Score | Criteria |
|-------|----------|
| 1 | No clear focal point; primary action is buried or visually equal to secondary elements |
| 2 | Primary action exists but doesn't stand out; layout lacks clear grouping |
| 3 | Primary action is identifiable; basic grouping present; some visual noise |
| 4 | Clear hierarchy with strong focal point; good use of whitespace and grouping |
| 5 | Hierarchy is immediately obvious; layout flows naturally; whitespace and contrast are expertly used |

---

## Dimension 2: Accessibility

Evaluates WCAG 2.1 AA compliance based on what's visible in the design.

**What to look for:**
- Text contrast ≥ 4.5:1 (normal text) or ≥ 3:1 (large text, 18px+ or 14px+ bold)
- Non-text contrast ≥ 3:1 for UI components and meaningful graphics
- Touch/click targets ≥ 44×44px (or 24×24px minimum with adequate spacing)
- Information not conveyed by color alone (icons, patterns, or text labels accompany color cues)
- Text is resizable — no fixed-size containers that would clip at 200% zoom
- Focus indicators visible in the design (if interactive states are shown)

**Scoring anchors:**

| Score | Criteria |
|-------|----------|
| 1 | Multiple contrast failures; tiny tap targets; color-only information |
| 2 | Some contrast issues or small targets; color dependency in one or two places |
| 3 | Meets minimum contrast; adequate target sizes; minor color-dependency issues |
| 4 | Strong contrast throughout; generous target sizes; no color-only information |
| 5 | Exceeds AA requirements; inclusive design patterns; visible focus states and skip links |

**Note:** This dimension assesses what's visible in the static design. Keyboard navigation, screen reader order, and ARIA markup can only be evaluated in code — note them as "not assessed from design alone" rather than scoring them.

---

## Dimension 3: Content & Microcopy

Evaluates the quality of text content in the design.

**What to look for:**
- Headings are descriptive and scannable
- CTA labels use active voice with verb + object ("View systems", not "Systems")
- Body text is concise — no unnecessary jargon or filler
- Error messages (if shown) explain what went wrong and what to do next
- Terminology matches what users would say (not internal engineering terms)
- Consistent tone throughout

**Scoring anchors:**

| Score | Criteria |
|-------|----------|
| 1 | Placeholder text ("Lorem ipsum") or missing labels; jargon-heavy |
| 2 | Generic labels; inconsistent terminology; some placeholder text |
| 3 | Functional labels; mostly clear language; minor inconsistencies |
| 4 | Clear, action-oriented labels; consistent terminology; good information density |
| 5 | Every word earns its place; microcopy reduces cognitive load; terminology is user-validated |

---

## Dimension 4: State Coverage

Evaluates whether the design accounts for the full range of UI states beyond the happy path.

**What to look for:**
- Empty state — what does the user see when there's no data?
- Loading state — is there a skeleton, spinner, or progress indicator?
- Error state — what happens when something fails?
- Overflow — what happens with long names, large numbers, or many items?
- Responsive — does the design address mobile/tablet if applicable?
- First-run experience — is there onboarding or contextual help?

**Scoring anchors:**

| Score | Criteria |
|-------|----------|
| 1 | Only the happy path is designed; no other states considered |
| 2 | One or two states addressed; major gaps in error and empty handling |
| 3 | Primary states covered (loading, empty, error); overflow not fully addressed |
| 4 | All common states designed; overflow handled; responsive considerations noted |
| 5 | Comprehensive state coverage including first-run, permission denied, timeout, and degraded states |

**Note:** Not all designs need all states. Score based on what's *appropriate* for the scope. A CTA redesign has fewer states than a full page; adjust expectations accordingly.

---

## Optional Dimension: Goal Alignment

Add this dimension when the user provides specific success metrics or business goals.

**What to look for:**
- Does the design directly serve the stated metric (e.g., CTR, task completion rate)?
- Is the primary conversion path optimized for the goal?
- Are there elements that might distract from or compete with the goal?
- Does the design create urgency or motivation appropriate to the context?

**Scoring anchors:**

| Score | Criteria |
|-------|----------|
| 1 | Design works against the stated goal or ignores the key metric entirely |
| 2 | Goal is acknowledged but not prioritized in the design decisions |
| 3 | Design supports the goal; primary path is clear but not optimized |
| 4 | Design is clearly optimized for the goal; competing elements are minimized |
| 5 | Every design decision demonstrably serves the goal; strong alignment between visual emphasis and desired user action |

---

## Summary Scoring

### Verdict (primary signal)

The verdict is the go/no-go output. It answers: "is this design ready to proceed?"

- **Pass** — all scored dimensions are 3 or above.
- **Fail** — any scored dimension is 1 or 2. List every failing dimension by name so the team knows exactly what to fix.

A single dimension at 1 or 2 is enough to fail the design, regardless of how strong the other dimensions are. This prevents critical gaps from being masked by high scores elsewhere.

### Average score (secondary indicator)

The average is useful for comparing directions against each other, but it does not determine pass/fail.

1. Score each applicable dimension (1–5)
2. Calculate the unweighted average across all scored dimensions
3. If the user specified priority dimensions, note both the unweighted and weighted averages
4. Round to one decimal place

**Interpretation (when comparing directions):**

| Average | Quality band |
|---------|-------------|
| 1.0–2.0 | Needs significant rework before proceeding |
| 2.1–3.0 | Has potential but requires substantial revisions |
| 3.1–3.5 | Solid foundation with targeted improvements needed |
| 3.6–4.0 | Strong design ready for refinement |
| 4.1–5.0 | Excellent — minor polish only |

When comparing options, a difference of **0.5 or more** in average score is meaningful. Smaller differences suggest the options are roughly equivalent and the decision should be made on other factors (implementation effort, timeline, stakeholder preference).
