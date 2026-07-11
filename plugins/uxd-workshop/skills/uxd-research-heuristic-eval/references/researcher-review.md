# Researcher Review Formats

## Choose review format

Before presenting findings, ask the researcher how they want to
review:

> **How would you like to review the findings?**
>
> 1. **Spreadsheet** — I'll create a Google Sheet with all violations,
>    suggested severity ratings, and columns for your decisions. Review
>    and edit there, then paste your updates back here to continue.
> 2. **Here in the chat** — I'll present the findings inline and we'll
>    walk through them together.

## Spreadsheet review

If the researcher chooses spreadsheet, create a Google Sheet using
the Google Workspace MCP with the following structure:

**Sheet name:** `Heuristic Eval Review — [date] — [Review subject short title]`

**Review subject rows** (place above the severity legend):

| Row | Column A | Column B |
|-----|----------|----------|
| 1 | Review subject | [short title] |
| 2 | Source URL | [full URL, or N/A] |
| 3 | Source files | [file paths, or N/A] |
| 4 | Input type | [URL / screenshots / text / mixed] |
| 5 | Task context | [task context, or Not provided] |
| 6 | Evaluation date | [YYYY-MM-DD] |

Leave one blank row before the severity legend.

**Severity legend** (include as a visible block after the blank row):
- Critical — Will cause users to fail the task or lose data. Must be fixed before release.
- Major — Causes significant difficulty or frustration. Users may find workarounds but shouldn't have to.
- Minor — Noticeable but doesn't significantly impair task completion. Fix when possible.
- Cosmetic — Aesthetic or minor inconsistency. Fix if time permits.

Leave one blank row before the evaluator legend.

**Evaluator legend** (include as a visible block after the severity legend):

| Evaluator | Lens | Focus |
|-----------|------|-------|
| A | Visual inspection | Labels, layout, visual hierarchy, affordances, feedback indicators |
| B | Task flow | Transitions, feedback after actions, where users might lose context |
| C | Edge cases | Empty states, long text, unexpected input, missing data, accessibility gaps |

Leave one blank row before the column headers.

**Columns:**
| Column | Content |
|--------|---------|
| A — # | Violation number (V-01, V-02, ...) |
| B — Title | Short violation title |
| C — Screen/Location | Where in the interface |
| D — Heuristic | Which heuristic(s) violated |
| E — Observation | Merged description |
| F — Suggested Severity | AI-suggested rating |
| G — Your Severity | *Empty — researcher fills this in* (Critical / Major / Minor / Cosmetic) |
| H — Confirm/Dismiss | *Empty — researcher fills this in* (Confirm / Dismiss) |
| I — Context | *Empty — optional researcher notes* |
| J — Agreement | Unanimous / Majority / Single evaluator |
| K — Identified by | Which evaluators flagged it |

**Additional requirements:**
- Pre-fill the Suggested Severity column with the ratings from
  reconciliation.
- Add data validation to column G (Your Severity) limiting choices
  to: Critical, Major, Minor, Cosmetic.
- Add data validation to column H (Confirm/Dismiss) limiting choices
  to: Confirm, Dismiss.

After creating the sheet, share the link and tell the researcher:

> "Here's your review spreadsheet: [link]. Fill in columns G
> (Your Severity) and H (Confirm/Dismiss) for each violation. Add
> any context in column I. When you're done, paste your updates back
> here — you can copy the relevant columns or just tell me which
> violations you changed from the suggested ratings."

Wait for the researcher to return with their review before proceeding.

## Chat review

If the researcher chooses chat, present the findings inline.

**Required components** (must always be shown — do not omit even
when reformatting for readability):

1. **Review subject record** — display the review subject, full Source
   URL (when provided), source files, input type, task context, and
   evaluation date before severity definitions.
2. **Severity definitions** — always display the four severity levels
   and their definitions before the first violation.
3. **Evaluator legend** — display the evaluator table (A/B/C with
   lens and focus) so the reader can interpret "Identified by" fields.
4. **Every consolidated violation** with its suggested severity.
5. **The review prompt** below.

Display each consolidated violation and prompt the researcher:

> **Review the consolidated findings below. For each violation:**
>
> 1. **Confirm or dismiss.** Is this a real violation, or a false
>    positive? (Mark any false positives — they'll be removed from
>    the final report.)
> 2. **Confirm or override the suggested severity:**
>    - **Critical** — Will cause users to fail the task or lose data.
>      Must be fixed before release.
>    - **Major** — Causes significant difficulty or frustration. Users
>      may find workarounds but shouldn't have to.
>    - **Minor** — Noticeable but doesn't significantly impair task
>      completion. Fix when possible.
>    - **Cosmetic** — Aesthetic or minor inconsistency. Fix if time
>      permits.
> 3. **Add context** (optional). Anything the evaluators couldn't
>    know — business constraints, known technical limitations, user
>    population characteristics, prior research that supports or
>    contradicts the finding, or design rationale behind an intentional
>    choice.
>
> You can also **add violations the evaluators missed.** If you see
> something that wasn't flagged, describe it and I'll add it to the
> report.

## After review

Regardless of review format (spreadsheet or chat):

- Remove any violations the researcher marked as false positives
  or dismissed.
- Use the researcher's severity rating (confirmed or overridden)
  for each violation.
- Append any researcher-provided context to the violation entry.
- Add any new violations the researcher identified, marked as
  `Identified by: Researcher` with their assigned severity.
- If the researcher flags borderline items as confirmed violations
  or dismissed, update accordingly.

If the researcher wants to review in batches (e.g., by heuristic or
by screen), accommodate that. The review doesn't have to happen all
at once.
