# Report Templates

## Markdown Report

Save to: `[project-dir]/heuristic-eval-[date].md`

```markdown
# Heuristic Evaluation: [Interface/Project Name]

## Review subject

| Field | Value |
|-------|-------|
| **Review subject** | [Short title — page name, flow, or project] |
| **Source URL** | [Full URL as a markdown link, or `N/A`] |
| **Source files** | [File paths used, or `N/A`] |
| **Input type** | [URL / screenshots / text description / mixed] |
| **Task context** | [What the user is trying to accomplish, or `Not provided`] |
| **Evaluation date** | [YYYY-MM-DD] |

**Framework(s):** [framework name(s), comma-separated if multiple]
**Evaluators:** 3 generalist [+ N specialist if applicable]
**Total violations found:** [count]
**Severity breakdown:** [N] critical, [N] major, [N] minor, [N] cosmetic
**Agreement breakdown:** [N] unanimous, [N] majority, [N] single-evaluator

---

## Evaluator Legend

| Evaluator | Lens | Focus |
|-----------|------|-------|
| A | Visual inspection | Labels, layout, visual hierarchy, affordances, feedback indicators — screen by screen, element by element |
| B | Task flow | Transitions, feedback after actions, where users might lose context — follows the user's likely workflow |
| C | Edge cases | Empty states, long text, unexpected input, missing data, accessibility gaps — looks for what's NOT there |

---

## Evaluation Parameters

**Framework(s):** [name(s) and brief description(s)]

**Heuristics applied:**

[If multiple frameworks, list each framework as a subheading with its
heuristics underneath.]

#### [Framework 1 name]
1. [Heuristic name] — [one-line definition]
2. ...

#### [Framework 2 name] (if applicable)
1. [Heuristic name] — [one-line definition]
2. ...

**Screens/flows evaluated:**
- [Screen 1 description]
- [Screen 2 description]
- ...

**Task context:** [what the user is trying to accomplish in this
interface, if provided]

**Source screenshots:** [list file paths to the screenshots used]

---

## Consolidated Findings

### By heuristic

[Group violations under the primary heuristic they violate. When
multiple frameworks are in use, choose the first-listed framework
as the primary grouping structure. Cross-reference secondary
framework heuristics within each violation entry.]

#### [Framework name] [Heuristic 1 name] — [N] violations

**V-01. [Title]**
- Heuristic: [Primary framework heuristic / Secondary framework
  heuristic(s) if applicable]
- Screen/location: ...
- Observation: ...
- Severity: [Critical / Major / Minor / Cosmetic]
- Agreement: ...
- Identified by: ...
- [Researcher context: ...]
- [User testing signal: ...]

[Continue for each violation under this heuristic]

#### [Framework name] [Heuristic 2 name] — [N] violations
...

#### No violations found
[List heuristics with zero violations from every selected framework.
This is informative — it tells the researcher which aspects of the
interface are clean. If a secondary framework's heuristics were only
violated in overlap with the primary framework (no framework-unique
violations), note that.]

---

## Severity Summary

| Severity | Count |
|----------|-------|
| Critical | [N] |
| Major | [N] |
| Minor | [N] |
| Cosmetic | [N] |

## Evaluator Agreement Summary

| Violation | Severity | Evaluator A | Evaluator B | Evaluator C | [Specialists] | Agreement |
|-----------|----------|:-----------:|:-----------:|:-----------:|:-------------:|-----------|
| V-01 | Critical | X | X | X | | Unanimous |
| V-02 | Major | X | X | | | Majority |
| V-03 | Minor | | X | | | Single |
...

---

## What This Evaluation Cannot Tell You

[Generate this section from the actual findings — not boilerplate.
Analyze the consolidated violations and identify questions that only
observational research with real users can answer. Frame each as a
specific, testable question tied to one or more violations.]

This heuristic evaluation identifies violations of established
usability principles through expert inspection. It cannot predict
how real users will actually behave. The following questions emerged
from the findings but require testing with real users to answer:

- [Testable question 1] *(see V-XX, V-XX)*
- [Testable question 2] *(see V-XX)*
- ...

**[N] of [total] violations in this report carry a "User testing
signal" flag**, indicating that the finding rests on a prediction
about user behavior rather than an objective heuristic mismatch.
Consider a task-based usability test to validate the most
consequential findings before investing in design changes.

---

## Borderline Items

[List any items tagged as borderline, with context for the
researcher to decide whether they are violations or preferences.]

---

## Coverage Notes

- **What was evaluated:** [summary of screens and flows covered]
- **What was NOT evaluated:** [anything explicitly out of scope or
  not visible in the provided input — e.g., "Error states were not
  shown in the provided screenshots," "Mobile layout was not
  included"]
- **Inspection method:** [How the interface was inspected — e.g.,
  "Live browser inspection via Playwright MCP (screenshots,
  accessibility tree, and interactive states captured)" or
  "Static bundle analysis only — no visual inspection available"]
- **Input limitations:** [any constraints on the evaluation — e.g.,
  "Evaluated from static screenshots; interactive behaviors like
  hover states and transitions could not be assessed"]

---

*This heuristic evaluation surfaces usability violations — observable
mismatches between the interface and heuristic principles. AI
evaluators identified candidate violations; the researcher reviewed
all findings, assigned severity ratings, and provided additional
context. Design recommendations are not included — those are
separate decisions.*

*Generated by `uxd-research-heuristic-eval` (v[version]) on [YYYY-MM-DD].
Source: github.com/rh-uxd/ai-helpers*
```

## HTML Report

Save to: `[project-dir]/heuristic-eval-[date].html`

Generate a self-contained HTML file (all CSS/JS inline) with:

- **Review subject block** — Display the review subject record near the
  top of the report (immediately after the title, before findings).
  Include the full **Source URL** as a clickable link when provided.
  Include the **Evaluation date**. Use a compact table or definition
  list so researchers can distinguish this report from others at a glance.
- **Evaluator legend** — Display a compact table immediately after the
  review subject block showing each evaluator's lens and focus area.
  Readers should be able to understand what "Identified by: Evaluator A"
  means without scrolling or referencing external documentation.
- **Embedded source screenshots** — Read each screenshot image file
  provided as input, base64-encode it, and embed it in the HTML as
  an `<img>` tag inside a collapsible "Source Screenshots" section
  near the top of the report (after the header metadata, before the
  findings). This ensures the report is fully self-contained and
  reviewers can reference the original interface without needing
  separate files. Use `max-width: 100%` styling so images scale
  responsively. If multiple screenshots were provided, display them
  in a horizontal scroll container or stacked vertically with labels.
- Clean, professional design consistent with other research toolkit
  HTML reports
- Collapsible sections for each heuristic category
- Visual indicators for severity level:
  - Critical: red badge
  - Major: orange badge
  - Minor: yellow badge
  - Cosmetic: gray badge
- Visual indicators for agreement level:
  - Unanimous: solid green bar
  - Majority: amber bar
  - Single evaluator: gray bar
  - Borderline: dashed outline
- Severity summary counts at the top of the report
- Agreement summary table with severity column and checkmark icons
- Filter controls: by severity (critical/major/minor/cosmetic) and
  by agreement (all/unanimous/disagreements/borderline)
- **"What This Evaluation Cannot Tell You" section** — Styled as a
  prominent callout box (blue/info-toned) near the end of the report,
  before Coverage Notes. Lists testable questions generated from the
  actual findings.
- **User testing signal indicators** — Violations with a testing
  signal flag get a small "needs user testing" badge (blue, distinct
  from severity badges) and the signal text displayed as an inset
  callout within the violation card.
- Print-friendly layout
- Responsive for laptop screens
- **Traceability footer** — a small footer line with: skill name,
  version (from the plugin's `plugin.json` manifest), generation date, and
  repo source URL
