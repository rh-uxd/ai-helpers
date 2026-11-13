# Quick Checks: visual-consistency handoff

This guide defines the host-produced bundle for visual consistency only. Source
analysis is a separate check and does not capture screens or make the host's model
calls. This contract has one `consistency-visual` phase; it does not invoke a
research/specialist profile or share a hierarchy phase.

The host performs approved browser/model visual inspection. `run-quick-checks.js`
validates the bundle and merges results locally; it never launches a provider or
browser, starts personas, applies fixes or edits requirements.

## Host procedure

1. Freeze the reviewed packet/source and `check_scope`: inspection goal (`task`),
   selected screen/state IDs and source-section IDs. Verify the served build or supplied captures
   match the prototype revision; retain a receipt. Without verified identity, stop.
2. Obtain actual provider approval for model work and browser approval for new
   browser activity. Record them in `permissions`; a JSON record cannot grant
   consent. Supplied verified captures do not require inventing browser approval.
3. Capture each approved state once, or reuse matching verified captures. Give each
   capture its own ID, URL/time, revision, screen/state, visible facts and image
   hashes. DOM alone is not visual evidence. Prefer crops for components and
   full-page context for overall layout. For a single settled baseline state:
   `node scripts/evidence/capture-prototype-evidence.js <artifacts-dir> <prototype-url>`.
   This approved browser activity writes `prototype-evidence.json`, not AC verdicts.
4. Compare the approved captures against the explicitly reviewed visual rules.
   For selected PatternFly rules, follow
   [visual inspection](../consistency/visual-check.md#step-2-visual-inspection).
   Record one `consistency-visual` invocation and its result; do not add a research
   or specialist call.
5. A visual-consistency selection produces exactly one `consistency-visual` phase.
   If source consistency also ran, keep its output and guideline identity separate;
   visual inspection does not imply source-policy coverage.
6. Retain sanitized submitted context and visible results/errors for the actual
   invocation. Unknown measurements stay null. Mark context `captured` or
   `unverified`, identifying any unobservable boundary. Never store credentials or
   private reasoning. Import once; model phases do not edit canonical documents.

## Bundle contract

Write an isolated producer bundle with these fields:

- `schema_version: 1`, `prototype_key`, `prototype_revision`.
- `packet_sha256`, `source_sha256`: hashes of the exact reviewed bytes.
- `scope`: identical to approved `check_scope`.
- `inspection`: `method: browser|supplied-captures`, `revision_verified: true`, and
  `receipt: {path, sha256}` supporting the host's build-identity assertion.
- `evidence: {captures, items}` using canonical evidence shapes without an envelope.
- `phases`: exactly one record for the actual visual invocation; no specialist,
  shared hierarchy or separate synthesis phase.
- `results`: exactly one selected model-check result, `consistency-visual`, with a
  separately owned output.
- `producers`: the visual check's actual `{name, version}`.

The phase has canonical `measurement`, `submitted_context: {path, sha256}`,
`returned_result: {path, sha256}`, `context_status` and submitted `evidence_ids`.
Use a distinct returned-result path. Its `checks` contains only
`["consistency-visual"]`.

Measurements use actual provider/model, times, byte counts and actual/null usage;
local phases require zero model usage/cost. Host-session spend stays separate.

`results["consistency-visual"]` contains `guidelines_version`, `guidelines_checked`,
`screenshots_checked`, and canonical consistency `findings` with `origin: visual`,
`check_method: visual`, image evidence and review-candidate semantics. If source
checks also ran, guideline versions must match. Merged coverage uses the maximum
per-mode count, labeled `coverage_count_method: max-per-mode` and `coverage_by_mode`,
not an invented union. Raw counts remain in the separate check outputs.

All references are relative to the producer bundle under `evidence/` or
`checks/model/`. The importer verifies hashes, rejects escaping/symlink paths and
collisions, and limits files to 32 MiB and the manifest to 16 MiB. Offset timestamps
normalize to UTC without changing the retained original bundle.

## Merge invocation

```bash
node "${EVALUATOR_SKILL_DIR}/scripts/run-quick-checks.js" \
  --input "${PACKET}" --output "${NEW_RUN_DIR}" \
  --checks consistency-visual \
  --judgment-bundle "${PRODUCER_DIR}/judgment-bundle.json"
```

The fresh run retains input snapshots, evidence/model receipts, the separate visual
check output, the original judgment bundle and five validated `pe-*.json` files.
Read `pe-evaluation-snapshot.json` and `checks/context.json` to present linked
findings, attribution and coverage gaps. Inspection findings never promote ACs.
`--report` here writes an integrity receipt; request HTML separately through
`run-report.js`. Neither reporting path repeats the evaluation or publishes it.
