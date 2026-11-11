# Quick Checks: browser/model handoff

Quick Checks may select `heuristic` and/or `consistency-visual`, with local
`classify`/`consistency-source` checks optional. Model/browser execution belongs
to the host assistant; `run-quick-checks.js` imports the resulting bundle and
performs one canonical merge. It never launches a provider or browser itself.
Do not enter full orchestration, create persona cohorts, apply fixes or write CSV.

## Authorization records

Before browser/provider activity, obtain the designer's actual approval and record
it in the reviewed packet's `permissions`. The importer requires
`provider.status: approved` for every selected model judgment. When
`inspection.method` is `browser`, it also requires `browser.status: approved`.
Missing, denied or unrequested required approvals reject the import before
copying evidence or publishing a run. With verified `supplied-captures`, no new
browser activity is claimed: preserve its denied/unrequested browser record
rather than inventing approval. Provider approval is still required. JSON
records bind the import's assertions; they cannot grant authority or prove
consent, and the local merger does not execute browser/provider work.

## Host procedure

1. Freeze the reviewed packet and source snapshot. Add `check_scope` with `task`,
   `screen_ids`, `state_ids`, and `source_ids` (criterion/requirements-section IDs). Confirm the
   revision of the served prototype or supplied captures and preserve the
   verification/browser inspection receipt. No verified revision → stop.
2. Capture the bounded approved screens/states once, or reuse matching verified
   captures. Each canonical capture has `source_ref` equal to `prototype.revision`,
   `screen_id`, `state_id`, its own URL/timestamp/page facts, and image hashes.
   Retain canonical crops/full-page/DOM items with explicit capture IDs; never
   map a new state to the first baseline capture for convenience.
   For one settled baseline state, the host may run
   `node scripts/evidence/capture-prototype-evidence.js <artifacts-dir> <prototype-url>`
   to produce `prototype-evidence.json`: the full-page screenshot, page facts and
   ranked crops from the shared capture library `scripts/evidence/targeted-evidence.js`.
   Launching that helper is browser activity — it needs the same approved
   `browser` permission — and yields one deterministic capture, not persona
   observations or AC verdicts.
3. When `heuristic` is selected, invoke the installed research skill:
   `uxd-research-heuristic-eval --profile prototype-specialists --output findings
   --framework nielsen --review chat` with the scoped evidence. Follow its
   specialist reference, not its generalist Step 1. Supply this consumer's
   required result contract as caller-provided instructions; do not direct the
   research skill to read evaluator files. Persist unreviewed draft results
   before chat review; final reports remain opt-in. The evaluator owns result
   validation and canonical import; the research skill returns only its
   run-scoped output and receipts.
   If the research skill is unavailable, stop and name the `uxd-research` plugin
   prerequisite; do not substitute generalist passes or a different scoring skill.
4. When both model checks are selected, supply the explicitly reviewed visual
   rule/checklist set to the **hierarchy specialist**; do not infer a design system
   from the prototype alone. That pass emits
   separate heuristic and visual consistency results. Default: three inspections,
   not three generalists plus specialists plus another visual pass. Preserve
   guideline version and rule IDs. No source check selected → do not imply source
   policy was checked. A separate model synthesis, if used, is recorded explicitly.
5. For **visual-only**, use one `consistency-visual` model phase against that same
   bounded evidence. For explicitly selected PatternFly rules, use
   [visual inspection](../consistency/visual-check.md#step-2-visual-inspection) and
   write a separate result below. Do not require journeys or append shared files.
   Prefer relevant crop images; hierarchy needs page
   context. DOM alone is not visual evidence.
6. Persist sanitized submitted context, returned result, evidence IDs and actual
   measurements for each invocation. Record unavailable usage/cost as null.
    Mark `context_status` as `captured` or `unverified`. If the full submitted
    boundary cannot be observed, retain the known sanitized payload and identify
    missing parts in that receipt; do not claim complete capture.
    Emit the bundle below, then invoke the local merger once. Do not concurrently
    edit canonical JSON or the designer's requirements.
7. Read the merged `pe-evaluation-snapshot.json` and `checks/context.json` and present findings
   with evidence/action/source links, model phases, and coverage gaps. A heuristic
   inspection never promotes an AC result or starts persona walkthroughs.

## Bundle contract (version 1)

Place the bundle and referenced files in a private run-scoped producer directory.
All file references are relative to the bundle directory, restricted to
`evidence/` or `checks/model/`. The importer copies only referenced files, checks
hashes, rejects escaping paths (including symlink escapes) and limits each file
to 32 MiB; the manifest is limited to 16 MiB.

Required top-level fields:

- `schema_version: 1`, `prototype_key`, `prototype_revision`.
- `packet_sha256`, `source_sha256`: SHA-256 strings of the exact original bytes.
- `scope`: identical to the packet's approved `check_scope`.
- `inspection`: `method` (`browser` or `supplied-captures`),
  `revision_verified: true`, `receipt: {path, sha256}`. This is a host assertion
  supported by its receipt; the merger does not itself prove a URL/build match.
- `evidence: {captures, items}`: canonical evidence record shapes, without a
  canonical envelope. Images live under `evidence/` and carry their own hashes.
- `phases`: one record per actual model invocation (including synthesis when used).
- `results`: exactly the selected model-check names, with separate owned outputs.
- `producers`: those check names mapped to `{name, version}` identifying the
  actual producing skill and its source ref/version, not a guessed default.

A phase entry has `measurement`, `submitted_context: {path, sha256}`,
`returned_result: {path, sha256}`, `context_status` (`captured` or `unverified`),
and `evidence_ids` identifying submitted items.
Each actual invocation has a distinct returned-result receipt path. Do not count
one receipt again under another phase name. Shared hierarchy/visual work uses one
phase with both check owners.
Record a failed call with `status: "failed"` and keep its error receipt; failed calls still count toward usage.
Use the canonical state phase fields for measurement, including `checks` for
ownership. For the shared hierarchy/visual call, an example measurement is:

```json
{
  "name": "heuristic-hierarchy",
  "checks": ["heuristic", "consistency-visual"],
  "status": "completed",
  "model_invoked": true,
  "provider": "openai",
  "model": "<actual configured model>",
  "started_at": "2026-10-14T12:00:00Z",
  "ended_at": "2026-10-14T12:01:00Z",
  "duration_ms": 60000,
  "input_files": 3,
  "input_bytes": 12000,
  "output_bytes": 2000,
  "token_usage": {"input": null, "cached_input": null, "output": null, "reasoning_tokens": null},
  "llm_cost_usd": null
}
```

Use actual values, not the example times/counts. The three mandatory heuristic
inspection phase names are `heuristic-content`, `heuristic-hierarchy`, and
`heuristic-interaction`. Optional `heuristic-synthesis` records synthesis work.
Standalone visual work uses `consistency-visual`. No generalist phases are allowed
in a Quick judgment bundle. Shared calls occur once in state, with both owners.
The merger normalizes offset timestamps to the canonical UTC `Z` representation
without changing the retained raw bundle. Methodological coverage notes and
visual descriptions are bounded to 1,000 characters so qualifiers are preserved.

The evaluator validates the imported `pe-evaluation-snapshot.json.heuristics` against its
own `schemas/v1/heuristics.schema.json`: Nielsen profile, 14 lens coverage
entries, candidate findings with source/evidence IDs and unreviewed status. No
design recommendations or PF metadata are required.
The importer creates order-independent canonical IDs and preserves the original
candidate-to-finding-to-action map in its context receipt.

`results["consistency-visual"]` contains `guidelines_version`,
`guidelines_checked`, `screenshots_checked`, and `findings`. Findings use the
canonical `evaluation.consistency.findings` shape with `origin: "visual"`,
`check_method: "visual"` and image evidence IDs. Keep review-candidate semantics.
With source checks selected, guideline versions must match. Source and visual
guideline coverage can overlap: the merged scalar count uses their maximum,
not a guessed additive total. `coverage_count_method: "max-per-mode"` and
`coverage_by_mode` label this conservative scalar explicitly; it is not an exact
union of checked rule IDs. Raw counts also survive in each owned result.

## Merge invocation

```bash
node "${EVALUATOR_SKILL_DIR}/scripts/run-quick-checks.js" \
  --input "${PACKET}" --output "${NEW_RUN_DIR}" \
  --checks heuristic,consistency-visual \
  --judgment-bundle "${PRODUCER_DIR}/judgment-bundle.json"
```

The output contains frozen input snapshots, copied evidence/model receipts,
separate `checks/heuristic.json` / `checks/consistency-visual.json`, the original
`checks/judgment-bundle.json`, and five validated canonical files. Packet/source
hashes, scope and revision must match; dangling references fail before publication.
Reports default off. This runner's `--report` writes a JSON integrity receipt;
request HTML separately through the evaluator. Neither runs another evaluation.

No automatic requirements edits, publishing or personas. Unknown model measurements are permitted;
local/no-model phases still require zero model usage and cost. Host session
spend remains distinct from measured invocation usage.
