# Evaluation files

These files are the saved record of one prototype review, not CI test results.
Save each new run in the prototype project's
`artifacts/<KEY>/prototype-evaluations/<run-name>/`, outside the installed skill.
`<KEY>` is the ticket or prototype key, not a folder literally named `JIRA`.
Do not move or overwrite earlier runs. Continuing a review or checking approved
fixes saves a new run linked to the earlier one.

## Files

- `pe-context.json`: what we agreed to test—requirements, tasks, selected personas
  and the prototype version.
- `pe-evaluation-snapshot.json`: what we found—requirement checks, task outcomes
  and inspection findings. It contains more than pass/fail verdicts.
- `pe-evidence.json`: what supports the findings—observations, screenshots and
  references linking them to results.
- `pe-actions.json`: suggested next steps and fixes already applied with approval.
  Recording an action does not authorize edits or publishing.
- `pe-state.json`: what ran, what needs approval, and recorded model usage/cost.

`pe-` means **prototype evaluation** and keeps the five files grouped together.
Keep these filenames stable so readers can find them. Put the date in the run
folder, for example `2026-11-11-quick-1`; each JSON also starts with UTC
`created_at` and `updated_at`. A linked run can retain an earlier creation date.
Use the phase timestamps to see when checks actually ran; updating a file is not
the same as rerunning a check.

Validate before reading or reporting results:

```bash
node scripts/artifacts/validate-canonical-artifacts.js <run-directory> --json
```

Schemas in `schemas/v1/` define the required JSON fields and allowed values.
Keep the complete run, including linked `inputs/`, `checks/` and evidence files;
validation also checks that referenced files exist and match their saved hashes.

## Data flow

Reviewed inputs → selected checks → validated saved results → summary in chat.
Full pauses for a separate decision before walkthroughs. Fixes need approval and
fresh evidence at the changed revision; allow one verification pass.
See [routes](../workflow/split-evaluation.md) and
[handoffs](../workflow/evaluator-responsibilities.md).

`run-report.js` reads the five files and produces local HTML with an integrity
receipt; `--chat` prints the same structured summary. Rendering does not call a
model, open a browser, alter results or publish. The split runner's `--report`
requests this optional report. Source requirements remain read-only.

Summaries separate AC, task, consistency and heuristic results. Show planned
versus actual coverage, prioritized evidence-linked findings, unreviewed items,
blocked/incomplete/NOT_RUN work and next actions. Shared or inherited calls count
once; unknown usage stays unknown. Classification is triage, and persona success
does not verify an AC. Heuristic observations need no invented fix recommendation.

## Evidence rules

- Use schema-valid fields and stable cross-file IDs. Do not infer evidence from filenames.
- Store visible outcomes, not private reasoning, transcripts or think-aloud traces.
- Keep paths relative and portable. Findings reference evidence IDs; image paths
  belong in `pe-evidence.json`. Preserve source/build identity and hashes.
- Component/region `crop` is the unpadded element box in viewport CSS pixels.
  Apply padding, clamp to the viewport and match image dimensions exactly;
  capture at device scale factor 1. Prefer bounded crops unless page context is needed.
- Do not turn incomplete coverage or internal comparison candidates into a pass.
  Keep guideline IDs exact and unavailable documentation URLs null.
- Source inspections keep the checker report and a saved copy of the rules used.
  This lets reviewers see which rules produced the findings, even if those rules
  change later. Validation checks both files. See
  [source policy and replay](../workflow/selected-inspections.md#explicit-source-policy-and-replay).
- New runs do not restore cross-build caches or copy old observations as new evidence.

Creation/publishing files such as `metadata.json`, `workspace-analysis.json`,
`changeset.md`, `scenarios.json`, `journeys.json` and `prototype-bar.json` retain
their existing owners and locations.
