# Quick Checks: browser/model handoff

This guide tells the host assistant what to save when it returns heuristic or
visual findings. The source checker does not replace this handoff: it does not
capture screens or make the host's model calls.

The host performs approved browser/model inspections. `run-quick-checks.js`
validates their bundle and merges results locally; it never launches a provider
or browser, starts personas, applies fixes or edits requirements.

## Host procedure

1. Freeze the reviewed packet/source and `check_scope`: task, screen/state IDs and
   source-section IDs. Verify the served build or supplied captures match the
   prototype revision; retain a receipt. Without verified identity, stop.
2. Obtain actual provider approval for model work and browser approval for new
   browser activity. Record them in `permissions`; a JSON record cannot grant
   consent. Supplied verified captures do not require inventing browser approval.
3. Capture each approved state once, or reuse matching verified captures. Give each
   capture its own ID, URL/time, revision, screen/state, visible facts and image
   hashes. DOM alone is not visual evidence. Prefer crops for components and
   full-page context for hierarchy. For a single settled baseline state:
   `node scripts/evidence/capture-prototype-evidence.js <artifacts-dir> <prototype-url>`.
   This approved browser activity writes `prototype-evidence.json`, not AC verdicts.
4. For `heuristic`, invoke the installed research skill with
   `--profile prototype-specialists --output findings --framework nielsen --review chat`.
   Supply scoped evidence and this result contract as caller instructions; do not
   ask that skill to read evaluator files. If unavailable, name the prerequisite
   and stop instead of substituting generalist passes. Persist unreviewed findings
   before chat review; final reports remain opt-in.
5. If both heuristic and visual checks are selected, the hierarchy specialist can
   inspect the explicitly reviewed visual rules in the same call. Keep separate
   results and guideline/rule identities. This means three inspections, not an
   extra visual pass. Visual-only uses one `consistency-visual` call; for selected
   PatternFly rules follow [visual inspection](../consistency/visual-check.md#step-2-visual-inspection).
   Do not imply source-policy coverage unless the source check was selected.
6. Retain sanitized submitted context and visible results/errors for every actual
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
- `phases`: one record per actual invocation, including separate synthesis if used.
- `results`: exactly the selected model-check names, with separate owned outputs.
- `producers`: each selected check's actual `{name, version}`.

Each phase has canonical `measurement`, `submitted_context: {path, sha256}`,
`returned_result: {path, sha256}`, `context_status` and submitted `evidence_ids`.
Use distinct returned-result paths. A shared hierarchy/visual call appears once,
with `checks: ["heuristic", "consistency-visual"]`; never count it twice.

Heuristic phase names are `heuristic-content`, `heuristic-hierarchy`, and
`heuristic-interaction`; optional separate synthesis is `heuristic-synthesis`.
Visual-only uses `consistency-visual`. No generalist phases are accepted.
Measurements use actual provider/model, times, byte counts and actual/null usage;
local phases require zero model usage/cost. Host-session spend stays separate.

The heuristic result follows `schemas/v1/heuristics.schema.json`: Nielsen profile,
14 lens/heuristic coverage entries, and unreviewed candidates with source/evidence
IDs. Recommendations, aggregate scores and PatternFly metadata are not required.
The importer assigns order-independent IDs and preserves candidate/finding/action
mapping in its context receipt. Coverage notes are bounded to 1,000 characters.

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
  --checks heuristic,consistency-visual \
  --judgment-bundle "${PRODUCER_DIR}/judgment-bundle.json"
```

The fresh run retains input snapshots, evidence/model receipts, separate check
outputs, the original judgment bundle and five validated `pe-*.json` files.
Read `pe-evaluation-snapshot.json` and `checks/context.json` to present linked
findings, attribution and coverage gaps. Inspection findings never promote ACs.
`--report` here writes an integrity receipt; request HTML separately through
`run-report.js`. Neither reporting path repeats the evaluation or publishes it.
