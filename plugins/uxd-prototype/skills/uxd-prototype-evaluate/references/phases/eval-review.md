# eval-review

Conversational entry point for designers to review eval results. Reads the pipeline artifacts, presents a concise narrative summary, and offers actions — fix issues, explain findings, or approve.

## Usage

```
/uxd-prototype-evaluate review PROJ-298
/uxd-prototype-evaluate review PROJ-298 --workspace=/path/to/prototype
```

## Inputs

| Input | Example | Required | Default |
|-------|---------|----------|---------|
| Jira story key | `PROJ-298` | Yes | — |
| `--workspace` | Path to prototype repo | No | — |

## Behavior: Summary Then Ask

### Step 1: Load Artifacts

Read the eval artifacts from `.artifacts/<KEY>/eval/`:

```
Required:
  - extract-state.json (ticket context)
  - evaluation-report.csv (AC verdicts)
  - journey-log.json (journey results + usability dimensions)

Optional:
  - refinement-suggestions.json (suggested fixes)
  - consistency-report.json (design violations)
  - iteration-log.json (iteration history)
```

If `.artifacts/<KEY>/eval/` does not exist, tell the user: "No eval results found for <KEY>. Run `/uxd-prototype-evaluate <KEY> <URL>` first."

### Step 2: Open the Report

```bash
open .artifacts/<KEY>/eval/evaluation-report.html
```

### Step 3: Present Narrative Summary

Present the findings conversationally using this structure:

```
Eval results for <KEY>: <story title>

**What passed:** X/Y acceptance criteria met. [Usability: score/21 if available]

**What needs attention:**
- [FAIL] AC-3: <description> 
- [FLAGGED] AC-7: <description>
- [Usability finding if any dimension scored 0-1]

**What to do:**
- <prioritized action item 1>
- <prioritized action item 2>

---
How can I help?
• "Fix [issue]" — I'll apply the fix to the workspace
• "Tell me more about [finding]" — I'll explain what happened
• "Re-run eval" — I'll trigger eval-iterate again
• "Looks good" — We're done
```

### Step 4: Handle Designer Response

**On "Fix [issue]" or "Fix the blocker" or similar:**
1. Read `refinement-suggestions.json` for the matching suggestion
2. If `--workspace` was provided, apply the fix to that workspace
3. If no workspace, present the suggested fix as guidance
4. After fixing, ask: "Want me to re-run the eval to verify?"

**On "Tell me more about [finding]":**
1. Read `journey-log.json` for the relevant journey steps
2. Read persona walkthrough data (think-aloud traces)
3. Explain conversationally: what the persona did, where they got stuck, what the evidence shows
4. If screenshots exist, reference them by path

**On "Re-run eval":**
1. Confirm the URL and workspace are still valid
2. Invoke eval-iterate with the same parameters

**On "Looks good" or "Approve":**
1. Confirm: "Great — eval complete for <KEY>. The report is at `.artifacts/<KEY>/eval/evaluation-report.html`."
2. If there's a workspace with an MR, mention: "When you're ready to submit, the eval summary can be included in your MR description."

**On anything else:**
- Answer using the artifacts as context. The designer might ask about specific personas, specific ACs, usability dimensions, or the consistency report. Read the relevant artifact and answer.

## Principles

- **Summary then ask.** Present findings, offer options, let the designer drive.
- **No hand-holding.** Don't walk through issues one-by-one unless asked.
- **Plain English.** No jargon. "Keyboard navigation doesn't work on the modal" not "WCAG 2.1.1 violation in ModalDialog component."
- **Trust the report.** The HTML report has the full evidence. Don't reproduce everything in chat — reference it.
- **Respect the workspace.** Only apply fixes if `--workspace` was provided and the designer explicitly asked.
