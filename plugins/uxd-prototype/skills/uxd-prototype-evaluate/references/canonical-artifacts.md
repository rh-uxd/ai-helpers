# Canonical evaluation artifacts

## Status

Version 1 is a validated JSON and HTML report contract. The evaluator agent
orchestrates Quick Checks, independent walkthroughs and composed Full Evaluation
using [split-evaluation.md](split-evaluation.md). Older phase artifacts and
conversion scripts remain migration tools for existing consumers, not an exposed
combined-workflow route or an automatically scheduled phase graph.

## Canonical v1 files

Each evaluation run uses these five authoritative JSON files in its `eval/` directory:

| File | Owns |
|---|---|
| `brief.json` | Immutable intent: criteria, tasks, personas, and scoped source context. |
| `evaluation.json` | AC verdicts, journey results, usability scores, consistency findings, and derived totals. |
| `evidence.json` | Bounded DOM facts plus portable full-page, region, and component evidence records. |
| `actions.json` | Proposed/applied fixes and explicit human handoffs. It cannot trigger publication. |
| `state.json` | Lifecycle, phase measurements, and compound cache identity. |

Schemas are in `schemas/v1/`. Run `node scripts/validate-canonical-artifacts.js <eval-dir> --json` before a canonical artifact is consumed or cached.

## CSV retirement decision

`evaluation-report.csv` is retired as a canonical evaluation artifact. Its past roles—AC verdict transport, usability rows, display baseline, and publish gate—are typed data in `evaluation.json`.

Older migration phase procedures still use `evaluation-report.csv` for AC
verdicts and publish gating. They are not scheduled by the evaluator agent.
Canonical assembly can convert those historical phase results;
a separate one-way compatibility adapter can export CSV for downstream consumers
without overwriting the canonical documents.

## Temporary legacy adapter

The adapter is disabled by default and writes only to an explicit shadow or
compatibility directory. It validates all five canonical files before writing,
refuses a destination named `eval`, and fails on existing files unless
`--replace` is used with an adapter-only directory.

```bash
node scripts/materialize-legacy-eval-artifacts.js \
  --canonical-dir <canonical-eval-directory> \
  --output-dir <separate-compatibility-directory> \
  --targets csv,summary,consistency,extract,evidence,journey,actions,state \
  --json
```

Targets materialize the current legacy CSV, summary, consistency, extract,
evidence, journey, fix/action, iteration, and YAML state shapes. The command is
local and deterministic: it reports `model_invoked: false`, performs no publish
or provider operation, and never reads legacy files back into canonical JSON.

Do not request or generate `persona-results.json` through the adapter. It is
the phase procedure's persona output and can be merged into `evaluation.json`
and `evidence.json` before canonical report rendering.

## Runtime order

The split routes use `run-split-evaluation.js`: selected Quick producers and
host-produced walkthrough bundles feed one validated writer per fresh run.
Full saves an awaiting-review checkpoint, then creates a child run after an
explicit decision. Selected fixes create a new prototype revision and one
verification run; old evidence is never imported as evidence for that revision.
The default route does not invoke the old full orchestration graph.

`run-report.js` reads canonical JSON directly, including specialist findings,
and writes derived static HTML plus an integrity receipt. `--chat` prints the
deterministic decision-focused chat synthesis instead; chat and HTML render the
same structured synthesis, so they agree about scope, priorities, evidence,
uncertainty and next actions. Rendering launches no model work. It requires no
CSV or persona transport files and rejects partial or invalid canonical inputs.
The split entrypoint's `--report` renders the same local HTML into a fresh run
directory after canonical publication; publishing and hosted reports remain
separate, explicit host actions.

For historical artifact conversion, `assemble-phase-a-canonical.js` remains
available; its legacy producers/readers have not been removed. The direct
`render-report.js` projection is also legacy-only. Do not use those paths to
fill missing results in a new split run.

The split route bypasses cache restore/store. Identity and finding discovery
support later reuse; they do not automatically skip model work across builds.

## Reports and synthesis

Chat and HTML reports derive from one deterministic structured synthesis
(`scripts/evaluation-synthesis.js`) built from the five validated canonical
files:

- Goal, evaluation strategy and source/build identity.
- Planned versus executed coverage from `state.planning`, including why
  selected work was skipped, blocked or not run.
- Prioritized findings with severity, location (file and line, or linked
  evidence) and recommendation. Consistency findings keep their review
  status; heuristic observations intentionally carry no fix recommendation.
- Separate AC, consistency, heuristic and task/persona outcomes. Persona
  completion never becomes an AC verdict.
- Uncertainty: NOT_RUN criteria, FLAGGED items, unreviewed candidates,
  blocked or incomplete walkthroughs, degraded coverage and unknown usage.
- Own, inherited and lineage usage without double-counting inherited work;
  unknown cost stays unknown.
- Proposed next actions and eligible handoffs.

Rendering is local and deterministic: it invokes no provider, launches no
browser session and never mutates the canonical files. Reports are derived
artifacts and may be regenerated; `report-integrity.json` records the
canonical digest plus the HTML and chat-synthesis hashes.

## Strict-output rules

- Output only schema-valid JSON; do not add unrecognized properties.
- Use stable cross-file IDs, never inferred filenames.
- Store concise visible outcomes only. `reasoning`, `thought`, `chain_of_thought`, `analysis`, `transcript`, and `think_aloud` fields are prohibited.
- Use `evaluation.consistency.findings[]` for source/visual policy findings and
  optional `evaluation.heuristics` for specialist observations and coverage.
  Heuristic findings do not require recommendations or PatternFly URLs. Legacy
  `violations` lists are compatibility data, not heuristic verdict authority.
- Keep filesystem paths relative and portable. Evidence references use IDs; screenshot paths live only in `evidence.json`.
- For component and region evidence, `crop` stores the unpadded Playwright
  element box in viewport CSS pixels. Apply `padding` and clamp to the source
  viewport; `image.width` and `image.height` must exactly match that clamped
  rectangle. Capture at device scale factor 1.
- Model phases prefer bounded crop paths. A viewport/full-page image is a
  fallback only when page-level context is required or no valid crop exists.
- `actions.json` records a proposed publish handoff with `requires_user_invocation: true`; it never performs a publish/deploy/Jira operation.
- Compatibility files are disposable projections. Never use them to repair or update canonical JSON.

## Boundaries

This contract does not replace creation/publish-owned files such as
`metadata.json`, `workspace-analysis.json`, `changeset.md`, `scenarios.json`,
`journeys.json`, or `prototype-bar.json`.

ODH test-plan integration is out of scope.

## Frozen source-consistency extension

The optional `consistency.source_analysis` uses
`consistency-source.schema.json` for pinned PR80 source report data. It retains
design-system selection, frozen context/provenance, evaluated and unevaluated IDs,
grouped guideline summary, and separate internal-comparison evidence. Existing
recognized pre-PR reports remain explicit compatibility inputs without invented
coverage or provenance. A report declaring modern fields must satisfy the modern
contract; malformed membership/counts/candidate semantics or frozen references fail.

Qualified guideline IDs use their own schema, preserving `team-a:b-c` distinctly
from `team:a-b-c`; ordinary artifact IDs remain unchanged. Documentation URLs can
be null and never acquire fabricated PatternFly provenance. Internal comparisons
stay outside normative finding counts/actions. Canonical and legacy HTML expose
both axes, gaps and review candidates instead of an unqualified pass.

The run owns a durable `.artifacts/consistency/` report/manifest pair; see the
[publication mapping](quick-checks.md#explicit-source-policy-and-replay).
Validation checks report readback, frozen text/metadata/provenance, membership and
summary consistency, not just JSON shape. Legacy materialization retains
`source_analysis` and copies its closure into the separate output. Choose a fresh
legacy destination; `--replace` does not clear directories containing this closure.

Source identity includes selected frozen content/provenance and the modular
companion scripts/schema/VERSION closure, with explicit absent-resource markers.
Fingerprinting does not require the companion for unselected routes. Split runs
already bypass caches; modern source analyses also bypass the historical
five-file Phase A/B caches, which cannot preserve their frozen publication closure.
No cross-build reuse or merged-base/live acceptance is established by this patch.
