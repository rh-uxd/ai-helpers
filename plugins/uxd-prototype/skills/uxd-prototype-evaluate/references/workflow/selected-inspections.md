# Quick Checks — selected inspections and local checks

Select only `classify`, `consistency-source`, or `consistency-visual` for new Quick
work. New heuristic checks are unsupported; reject them rather than adding a plan
step or substituting a research-profile invocation. Classification describes
verification needs; it does not verify requirements.
Model/browser work follows the [inspection handoff](../inspection-contracts/inspection-bundle.md).
No implicit personas, fixes, requirements edits or publishing. Reuse known context
and ask only missing check-specific questions; see
[responsibilities](evaluator-responsibilities.md).

## Reviewed packet

`source.snapshot_path` resolves relative to the JSON packet and identifies the
original Jira payload or written requirements. The runner preserves its bytes and
hash. `extract` is human-reviewed normalization, not an automatic parser. Preserve
source-section IDs across revisions.

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
    "revision": "<exact commit or immutable build identity>"
  },
  "extract": {
    "key": "PROJ-123",
    "title": "Create subscription",
    "ac_list": [{
      "criterion_id": "AC-1",
      "source_id": "SPEC-123#AC-1",
      "text": "Submitting an empty name shows a validation message."
    }]
  }
}
```

For Jira use `kind: jira`, the ticket ID/revision and stable IDs such as
`PROJ-123#AC-1`. Confirm the key, criteria/source mapping and prototype revision.
Source-only consistency may use no ACs; retained ACs are not silently classified.

Visual consistency needs reviewed `check_scope` (inspection goal `task` and screen/state/source IDs),
permissions and a matching host-produced bundle. It produces one
`consistency-visual` phase; there is no specialist or shared hierarchy phase.
Walkthrough preparation is defined in the
[task/persona contract](../task-verification/task-walkthroughs.md).

## Local invocation

Create the project-owned output parent and choose a fresh run path:

```bash
node "${EVALUATOR_SKILL_DIR}/scripts/run-quick-checks.js" \
  --input "${PACKET}" \
  --output "${PROJECT_ROOT}/artifacts/${KEY}/prototype-evaluations/quick-<run-name>" \
  --checks classify --no-fix
```

Source consistency additionally needs `--workspace <repo-root>` and pinned
`--base-ref <commit>`. The workspace must be clean and its full HEAD equal the
packet's revision. Never reset the designer's checkout. The separately installed
`uxd-consistency-check` companion must support explicit policy/frozen-manifest
inputs; otherwise stop that selected check with a dependency message. Other
checks do not require the companion. Local source checks do not probe a server
or claim a URL serves that revision.

## Outputs and validation

- `inputs/packet.json` and `inputs/source.snapshot` retain exact reviewed bytes.
- `checks/classify.json` retains classification; every AC remains NOT_RUN.
- Source/model checks retain separate outputs; model phases never write shared
  canonical documents. One writer validates and assembles the five `pe-*.json`
  files before publication to the new path.
- `checks/context.json` records selection, producer/input/output paths and hashes,
  revision/base, normalization and canonical criterion/finding/action mappings.
  `pe-state.json.quick_checks` links its hash; `pe-context.json` links the source.
- `pe-evidence.json` records exact revision/screen/state captures and hashed images,
  or typed source observations with path/line/file hash. Missing source files use
  explicit absence/null hash. Local-only runs have no fabricated browser evidence.
- State preserves selected/skipped phases and actual/null model usage. Shared
  calls count once; local work has zero model usage. Host-session spend is separate.

Requirements remain read-only. Review candidates do not become automatic fixes;
findings/actions retain source/evidence links for later human review. Runs do not
restore caches or reuse observations from another build. Source finding IDs hash
guideline/file/line/property/value, not array position.

`--report` is off by default; `--no-report` takes precedence. Here it writes
`integrity-report.json`, not HTML. Request canonical HTML via `run-report.js`.
Neither route updates Prototype Bar, Jira, an MR or a leaderboard.

Validate selected/skipped state, NOT_RUN coverage, links and integrity hashes.
Reject existing destinations, dirty/mismatched revisions, producer failures and
invalid references. A publication failure may leave an incomplete new directory;
consume it only after validation. Validation does not authorize new activity.

## Explicit source policy and replay

The optional packet member below selects source-policy inputs only when
`consistency-source` is selected:

```json
"consistency": {
  "design_system": "custom",
  "design_system_version": "reviewed-v1",
  "guidelines": ["team=/absolute/local/rule.md"]
}
```

Equivalent flags: `--design-system`, `--design-system-version`, repeatable
`--guidelines NAMESPACE=PATH`, or `--guideline-manifest PATH`. Relative paths resolve
from the workspace root; bare paths use namespace `local`. Inputs must be reviewed
local data, not discovered rules, remote retrieval, symlinks, traversal or executed
prose. No selection means `custom` with zero guidelines; only explicit `patternfly`
selects its baseline. Contradictory packet/CLI values fail.

Replay uses a previous frozen `.artifacts/consistency/guidelines.json` without
rereading original rules. Do not combine replay with live guidelines. System IDs
must match; review the version label separately (`unspecified` if omitted).

The analyzer uses a unique temporary directory under the workspace's real
`.artifacts`, cleaned on success/failure before the clean-HEAD recheck. The
evaluator copies the report/frozen manifest into the fresh run; no workspace
config or ignore changes. Colocated output must already be ignored.

Published paths are run-relative: `workspace: .`,
`artifact: .artifacts/consistency/consistency-report.json`, and
`guideline_manifest: .artifacts/consistency/guidelines.json`. `evaluator_publication`
retains original producer locations as provenance, not live references.
`checks/consistency-report.json` matches the durable copy. Keep the complete run
together; staging moves/readback must preserve this closure.

`evaluation.consistency.source_analysis` retains frozen selection, evaluated and
unevaluated rules, and separate guideline/internal results. Internal differences
are low-confidence review candidates, not normative violations. Zero selection,
partial/unsupported rules or insufficient comparisons are degraded, never passed.
