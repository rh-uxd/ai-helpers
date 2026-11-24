# Productize traceability record

Fill this in manually as `run.md`. Start at scope confirmation, update actual
coverage during Evaluate, and add the designer's decision in Review. Link
detail rather than repeating the evaluation report. Use `Unknown` for
unavailable facts and `Pending` for decisions not yet made.

```markdown
# Productize traceability — <run ID>

## Request and scope
- Date, workflow revision, and operator: <date; version or commit; role or name>
- Request and intended decision: <designer's goal>
- Prototype: <URL, exact revision, and whether the preview matches>
- Inputs: <source/diff and base, requirements and guidance with links and revisions, if used>
- Changed user action/outcome and relevant states: <agreed coverage in plain language>
- Assumptions or access gaps: <what is unknown and what it prevents>
- Previous run: <link or none>

## Execution and artifacts
- Output location and reviewer access: <agreed workspace and run folder>
- Phase and next approval: <current checkpoint>
- Environment and versions: <tools and actual skill versions, or unknown>
- Changes to the plan: <what changed and why, or none>
- Artifacts: <linked check results, and report when saved; generated, manual, or corrected>

## Checks, findings, and limits
- <Planned check and options> — <planned/completed/skipped/blocked/not applicable/not run>; <reason>; <result/evidence link when available>
- For a coverage claim: <actual producer/version and route>; <new check or supplied observation>; <target revision vs evidence revision: matching build / prior build only / build unknown>; <clickable result and supporting source(s)>; <what remains unverified>
- If requirements triage was selected: <designer's packet confirmation and separate or combined Evaluate decision>; <native run ID, artifact digest and relative link to pe-state.json when validated>
- <Finding ID> — <conclusion and producing check>; <link the evidence and say briefly how it supports the conclusion>; <uncertainty and recommendation>
- Limits: <what remains untested and what would unblock it>

## Human review and next decision
- Review status: Pending review
- Reviewer, date, and report revision: <when reviewed>
- Finding decisions or unresolved concerns: <finding ID and reviewer's decision>; <does the reviewer consider the evidence sufficient, insufficient, or still unverified?>; <if disputed, what evidence would resolve it? Leave unstated judgments pending.>
- Material corrections: <what changed after review, if any>
- Next action and owner: Pending

## Pilot feedback (optional)
- Measurement record: <link using the same run ID, if one exists>
- Feedback and follow-up: <observation, evidence or finding ID, and proposed follow-up>
```

`Skipped` means the designer left a check out. `Blocked` means a missing
prerequisite. Record `Blocked — matching preview unavailable`, not `Passed —
no findings`, for a runtime check that could not run.
