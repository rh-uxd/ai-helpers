# Offline checker tests

From the repository root:

```bash
python3 -S -m unittest discover \
  -s plugins/uxd-prototype/skills/uxd-consistency-check/tests -v
make validate
```

Python 3.10+ and Git are sufficient. `-S` disables site packages; no model,
network, browser, or optional dependency is needed. Tests create isolated
consumer workspaces under Python's temporary directory (set `TMPDIR` to choose
an approved scratch location); analyzer subprocesses write only their own
workspace `.artifacts`. There was no checker-owned suite at the starting HEAD.

## Coverage and boundaries

- No implicit PatternFly baseline or workspace policy discovery.
- Optional PatternFly + product composition, including differing rules with the
  same original ID; exact namespace-qualified filtering and source applicability.
- Custom-only local rules; unofficial MUI fixture with a supported generic rule
  and unsupported contextual rule. This is **not official MUI guidance** and
  cannot establish MUI compliance. Carbon/internal corpora use the same input
  contract; no official Carbon corpus is bundled either.
- Same-namespace identical content merges provenance; different content fails;
  distinct namespaces keep identical rules separate.
- Frozen replay with deleted originals, explicit system mismatch rejection,
  legacy raw-ID replay, full text/UTF-8 BOM/CRLF fidelity, and schema contracts.
- Tampering with identity, kind, namespaces, local/remote attribution, retrieval
  metadata, workspace, applicability, and text is rejected. Inconsistent metadata
  is rejected even after recomputing the fingerprint. These are integrity and
  consistency checks, **not signatures or remote source authentication**.
- Unsupported prose remains unevaluated despite `automatable: true`.
  Supplemental source review is separately validated, uses exact qualified IDs,
  keeps `check_method: model_review`, and leaves deterministic report bytes intact.
- Offline URL refusal, invalid source/ID handling, and invalid metadata rejection.

`schema_assertions.py` checks the vocabulary used by the published schemas using
stdlib assertions, including local references, conditionals, required fields,
types, patterns, and candidate invariants. It fails on unknown schema keywords;
it is deliberately **not a general-purpose JSON Schema implementation**. It does
not replace a consumer's full Draft 2020-12 validator. `make validate` checks the
marketplace manifests and skills, not these runtime behaviors.

## Test-first implementation record

Each behavior below was introduced as a vertical slice: add its regression,
run the suite to observe the specific RED, implement the smallest change, and
rerun the suite GREEN before starting the next slice. The repeated command was
the `python3 -S -m unittest discover ... -v` command above (with an approved
`TMPDIR` during development).

| Slice | Observed RED | Minimal GREEN |
|---|---|---|
| Explicit sources only | Default run loaded policy/baseline and exited 1 | Neutral `custom` label; no workspace auto-discovery (1 test) |
| Namespaced composition | `rhoai=PATH` treated as a missing filename | Qualified identities; stable bundled namespace; original ID/text retained (2 tests) |
| Frozen replay | Newly emitted schema rejected as unsupported | Accept 1.1; validate qualified metadata; adopt frozen system label (3 tests) |
| Provenance integrity | Coherent kind/location edits and workspace edit accepted | Fingerprint content **and** all provenance (4 tests) |
| Published schema | Schema required `1.0.0`, rejected emitted `1.1.0` | Version-conditional namespace/identity contract (5 tests) |
| Identical duplicates | Source membership listed a rule twice | Deduplicate membership while retaining every local provenance path (6 tests) |
| Structural replay validation | Numeric namespace caused a TypeError; incomplete/duplicate attribution unchecked | Validate namespace types, required fields, unique membership (7 tests) |
| Generic fixture evidence | Root-class finding incorrectly described authored styling | System-neutral explicit-policy description (8 tests) |
| Validate before publication | Empty system label accepted | Run the same manifest validator on new snapshots (14 tests) |
| Exact frozen text | BOM stripped and CRLF normalized | Decode original UTF-8 bytes; normalize only metadata parsing view (15 tests) |
| Generic CSS policy | A custom stylesheet named `patternfly-custom.css` was silently exempted | Restrict legacy PatternFly asset exemptions to PatternFly-applicable policies (16 tests) |
| Legacy repeated membership | A valid old snapshot failed with duplicate source document IDs | Enforce unique membership only for 1.1; accept historical 1.0 source arrays |
| Metadata safety | Nested check/severity fields and duplicate check keys were promoted | Reject indented entries and duplicate keys (17 tests) |
| Supplemental applicability | Carbon-only rules accepted as MUI source/visual violations | Validate selected-system or `any` applicability for both supplemental modes (18 tests) |
| Usable targets | CSS-only scope counted component checks as passes | Filter targets by supported check before recording coverage (19 tests) |
| Extension consistency | Uppercase HTML/CSS targets became policy passes | Normalize extension case consistently through evaluation (20 tests) |

Five additional characterization regressions passed on their first run after
the corresponding behavior slices: supplemental separation, legacy replay,
invalid local/URL input refusal, exact filters, and applicability. They protect
existing behavior rather than pretending a new RED was observed. No production
change was made for those passing regressions.

## Migration for callers

- Pass `--design-system patternfly` when the optional baseline is intended.
  Pass workspace guidance explicitly; its conventional path is not discovered.
- New reports/coverage/filters/supplemental findings use `namespace:original-id`.
  Plain paths use `local`; use named sources for independent corpora.
- Manifest schema is now `1.1.0`; report and supplemental schemas remain `1.0.0`.
  The v1 manifest schema accepts both formats. Legacy snapshots replay raw IDs,
  not silently upgraded IDs; their original weaker fingerprint is retained.
- Replay freezes guidance, not source files, scope, filters, or the separately
  declared system-version label. Repeat those options and verify source inputs.
- Agent consumers must read finding objects and `check_method`, not treat
  aggregate guideline-group summary counts as finding arrays.

Remote retrieval and official-source verification belong to the assistant layer
and are not exercised by this offline suite. No remote corpus is copied into
these fixtures. Model quality, visual compliance, live browser acceptance, and
full CSS/JavaScript semantics are outside this suite's claims.
