# Evaluation files

Save each new run in the prototype project's
`artifacts/<KEY>/evaluation/<run-name>/`, outside the installed skill. Keep completed
runs unchanged; continuation and verification create linked child runs.

## Files

- `pe-context.json`: reviewed source, criteria, tasks, personas and scope.
- `pe-evaluation-snapshot.json`: AC results, task outcomes, inspection findings and totals.
- `pe-evidence.json`: observed facts, captures, image paths and evidence IDs.
- `pe-actions.json`: proposed/applied follow-ups and human handoffs, never permission to publish.
- `pe-state.json`: execution status, review checkpoints, identity and usage.

Each JSON starts with UTC `created_at` and `updated_at`. Dates belong in fields,
not filenames. A child may retain original creation dates; `updated_at` records
when its documents were prepared, not when inherited checks ran.

Validate before reading or reporting results:

```bash
node scripts/artifacts/validate-canonical-artifacts.js <run-directory> --json
```

Schemas live in `schemas/v1/`. Keep the complete run, including linked `inputs/`,
`checks/` and evidence files; a partial directory is not a completed evaluation.

## Data flow

Reviewed packet → selected producers → one validating writer → results in chat.
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
- Source inspections retain the report and frozen guideline manifest together;
  validation checks their contents, provenance, membership and totals. See
  [source policy and replay](../workflow/selected-inspections.md#explicit-source-policy-and-replay).
- New runs do not restore cross-build caches or copy old observations as new evidence.

Creation/publishing files such as `metadata.json`, `workspace-analysis.json`,
`changeset.md`, `scenarios.json`, `journeys.json` and `prototype-bar.json` retain
their existing owners and locations.
