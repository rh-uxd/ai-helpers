# Quick Checks — selected inspections and local checks

## Designer selection

Ask for selected checks and a reviewed, frozen input packet. Supported checks:
`classify` (default), `consistency-source`, `heuristic`, and `consistency-visual`.
The last two use scoped browser/model inspection through the
[judgment handoff](quick-judgment-bundle.md). Classification describes verification needs; it never
verifies behavior or turns a backend-only exclusion into PASS.

The host confirms the key matches `extract.key`, the source snapshot and mapped
criteria, and the prototype revision. No Jira fetch, MR clone, browser/provider
call or source edit is performed by the local merger. Selected host model/browser
phases are allowed and recorded; persona discovery and fix loops are skipped.
Reject unsupported selected checks rather than substituting a full evaluation.
Walkthroughs require a separate explicit selection of the independent
`uxd-prototype-walkthrough` skill or composed Full route, not legacy compatibility.
Follow the [responsibility contract](evaluator-responsibilities.md): reuse known
context and ask only missing, check-specific questions before new work.

## Reviewed packet

The input packet is JSON. `source.snapshot_path` resolves relative to the packet.
It points to the original Jira payload or UX spec; the runner copies its bytes
and hashes them. `extract` is the human-reviewed normalization, not an automatic
spec parser. Preserve each source section ID without renumbering after revisions.

```json
{
  "source": {
    "kind": "ux-spec",
    "id": "SPEC-123",
    "revision": "revision-2",
    "snapshot_path": "subscription-spec.md"
  },
  "prototype": {
    "url": "http://localhost:3000",
    "revision": "<exact prototype commit or immutable build identity>"
  },
  "extract": {
    "key": "PROJ-123",
    "title": "Create subscription",
    "ac_list": [
      {
        "criterion_id": "AC-1",
        "source_id": "SPEC-123#AC-1",
        "text": "Submitting an empty name shows a validation message."
      }
    ]
  }
}
```

For model checks add `check_scope` with task, screen/state IDs and approved source
section IDs; prepare the matching evidence/model bundle as documented in
`quick-judgment-bundle.md`. The default heuristic profile has three specialist
inspections. Visual consistency can share the hierarchy invocation; it does not
automatically add another pass. Visual-only uses one inspection.

For Jira use `kind: "jira"`, the ticket ID, a snapshot/version identity, and
source IDs such as `PROJ-123#AC-1`. Source consistency alone may use an empty
`ac_list`. Retain the full approved packet as the reusable context; the brief
retains the reviewed criteria and supplied task/persona cohort without executing
unselected phases. Source-only runs do not silently classify retained criteria.

## Local invocation

Pin the consumer root; create the `eval/runs/` parent if absent. Pick a fresh
run path. Do not use full `pipeline-setup.sh`, `--fresh`, or reset/cleanup helpers.

```bash
node "${EVALUATOR_SKILL_DIR}/scripts/run-quick-checks.js" \
  --input "${PACKET}" \
  --output "${KEY_DIR}/eval/runs/quick-<unique-run-name>" \
  --checks classify
```

To select source consistency, add `--checks consistency-source` (or
`classify,consistency-source`), `--workspace <repo-root>` and a pinned
`--base-ref <commit>`. This first slice requires a **clean** local checkout whose
full HEAD commit equals `prototype.revision`. It checks changed tracked source
with the separately installed `uxd-consistency-check` analyzer. This companion's
implementation is maintained outside the evaluator branch. If the selected
source check cannot resolve a compatible policy/manifest contract, stop with an
actionable dependency message;
classification, supplied-evidence checks and walkthroughs do not require it.
Dirty revisions remain unsupported; never reset a designer's checkout. Local
guideline inputs require explicit review and selection, not workspace discovery.
No server is probed and no claim is made that a URL serves that revision.

Each selected local check writes only its own file in a private staging directory;
host model checks write separate producer outputs imported through hash-checked
references. Model phases never write shared canonical documents.
After validation, one writer assembles all five canonical files and publishes
them to the fresh run path. Existing destinations are rejected. Local checks currently
run sequentially. Selected model phases are host-produced. Failure never replaces a prior run; a publication I/O failure
may leave an incomplete new directory that must not be consumed without validation.

## Information flow and ownership

1. `inputs/packet.json` and `inputs/source.snapshot` preserve exact input bytes.
2. `checks/classify.json` preserves raw classification (including the legacy
   backend-only PASS label); canonical conversion deliberately maps every AC to
   `NOT_RUN`, with the classification reason and stable source ID. No CSV is read.
3. `checks/consistency-report.json` preserves the validated evaluator publication
   projection of the analyzer output, with original producer locations recorded.
   Canonical finding IDs use the assembler's deterministic mapping; qualified
   guideline IDs remain exact and missing documentation URLs remain null.
4. `checks/context.json` records selected checks, producer/input/output paths,
   hashes, base/revision and changed files, raw-to-canonical AC/finding/action links,
   normalization, and explicit local-only or actual host-model context.
   `state.quick_checks` links and hashes this receipt. `brief.intent.source_input`
   links and hashes the frozen source; `brief.intent.scope.source_ref` is the prototype revision.
5. `evaluation.json` owns unverified AC results, source/visual consistency findings,
   and typed `heuristics` findings/coverage. The original candidate IDs map to
   stable canonical IDs, evidence and proposed human-review actions in receipts;
   `actions.json` owns proposed human follow-ups linked to AC/finding IDs.
   Review candidates do not create fix actions. Nothing is applied automatically.
6. `evidence.json` has empty captures/items for local-only runs. Model checks import
   independently identified revision/screen/state captures and verified image
   hashes, plus bounded DOM facts. Raw submitted context and returned results
   remain linked receipts, so capture text is not confused with model-visible text.
   Source findings retain file/line links and the hashed check-output receipt;
   typed `source_items` record the checked revision, source path/line, file hash and observation. Missing-file findings explicitly record absence with
   a null hash; they do not invent source bytes. Do not fabricate browser captures.
7. `state.json` records completed selected inspections/checks and skipped extraction, other
   checks, journey/persona, fix and HTML-report phases. Local elapsed times are
   measured; source input bytes are unknown (`null`). No model usage/cost is
   incurred by these scripts; host-invoked model phases preserve actual telemetry
   or null for unknowns. A shared hierarchy/visual invocation appears once with
   both check owners. Host-session cost remains separate.

`--report` is off by default; explicit `--no-report` takes precedence. When
requested, `integrity-report.json` records
validation, canonical-file hashes, run ID and summary. It is a JSON integrity
receipt, not HTML. Existing legacy renderers remain compatibility tools; do not
fabricate their persona/CSV inputs to render Quick findings. Canonical synthesis/
HTML reporting is a separate handoff, not part of this runner. Quick runs do not
update the prototype bar, leaderboard, Jira or MR.

## UX-spec proposals and reuse limits

The spec remains read-only. A separate spec writer can find a run by key,
source ID/revision, check selection and prototype revision, follow AC source IDs
or finding/action links, and propose a patch for human approval. Findings are
not evidence that requirements should change. The shared `schemas/v1/split.schema.json` types screens/states, roles,
setup-only users, permissions, fixtures/reset and expected outcomes. Preserve
these in the reviewed packet; do not fabricate observations or execute fixtures.

Cache restore/store is bypassed. Separate intent/build/evaluator keys support
future reuse, but this route does not selectively reuse artifacts across builds.
No screenshots or findings are imported from another revision. Quick source
finding IDs hash guideline/file/line/property/value without an array index, so
unrelated finding insertion does not renumber them. Changed location/value gets
a new ID. The full compatibility assembler retains its existing index-based IDs.

## Human checkpoint / validation plan

Review packet-to-source mapping, selected/skipped state, NOT_RUN results,
finding/action links, canonical validation and integrity hashes. Any subsequent
source-only/combined run needs its own scoped authorization and a fresh output
path. Stop on dirty/mismatched revisions, analyzer errors or an existing output
path. Development tests are optional local assets, not installed-skill inputs.
No provider/browser run is implied by this checkpoint.

## Explicit source policy and replay

This compatibility boundary is tested against the isolated PR80 checker at
`8b3f36d30b57866abf79844f2e1b9bb4cc44be4a`, not a merged release/base. Install the
companion separately; no checker implementation or corpus belongs in this patch.
With `consistency-source` selected, the optional reviewed packet member is:

```json
"consistency": {
  "design_system": "custom",
  "design_system_version": "reviewed-v1",
  "guidelines": ["team-a=/absolute/local/rules", "team=/absolute/local/rule.md"]
}
```

Equivalent CLI inputs are `--design-system`, `--design-system-version`, repeated
`--guidelines NAMESPACE=PATH`, and `--guideline-manifest PATH`. Relative local
paths resolve from the checked workspace root, not the packet directory. A bare
path uses namespace `local`. Explicit external-local inputs are allowed only as
reviewed guideline/manifest data; they do not expand source-code inspection scope.
No inferred workspace rules, remote retrieval, symlinks, traversal or execution of
guidance prose is allowed. Omitting selection means `custom` with zero guidelines,
even for a PatternFly project. Only explicit `patternfly` selects its baseline.

For replay, replace live `guidelines` with `guideline_manifest` pointing at a
previous run's `.artifacts/consistency/guidelines.json`. Replay uses frozen text
and provenance without rereading original rules. A supplied system ID must match
the manifest; review the version label separately (`unspecified` if omitted).
Live guidelines cannot accompany replay. Contradictory packet/CLI values fail,
and source-policy inputs without the source check fail rather than being ignored.

The analyzer owns only a unique temporary directory under the source workspace's
real `.artifacts` directory. The evaluator copies report and frozen manifest into
its fresh canonical run and cleans its producer directory on success or failure
before rechecking clean HEAD. It never changes workspace config or ignore rules.
For colocated outputs, the workspace must already ignore the output area; a
previous unignored output remains ordinary dirt and is not silently excluded.

The published projection has `workspace: "."`, resolved relative to the canonical
run root, `artifact: ".artifacts/consistency/consistency-report.json"`, and
`guideline_manifest: ".artifacts/consistency/guidelines.json"`. Its
`evaluator_publication` retains the original source workspace and producer paths
as provenance only, not live references. `checks/consistency-report.json` matches
the durable artifact copy. Quick and split staging moves preserve this closure;
post-publication readback and subsequent validation check its content/provenance.
Keep the complete run together. Failed publication can leave an incomplete new
output, never a replacement for a prior run; consume it only after validation.

`evaluation.consistency.source_analysis` retains the explicit selection's frozen
context, evaluated/unevaluated rule sets, and separate guideline/internal axes.
Internal differences are low-confidence review candidates, not normative policy
violations or automatic fix actions. Zero selection, unsupported/partial rules or
insufficient internal comparisons are `degraded`; visible candidates cannot be
`passed`. This deliberately conservative local status is not rendered compliance.
