# Prototype specialist profile

Explicit selection: `--profile prototype-specialists`. Defaults for this profile:
framework `nielsen`, output `findings`, review `chat`. Record these resolved
settings; an explicit different framework is unsupported for this initial profile.
Do not use `--assume-defaults` to select it: that flag still means the generalist
profile, Nielsen, review none. Explicit conflicting settings must be clarified.
Do not combine this fixed three-lens profile with additive `--specialists`.

## 1. Freeze scope and evidence

Confirm the prototype revision, user task, selected screens/states, source IDs,
and evidence references. A URL requires live rendered browser inspection;
screenshots require known provenance. Reuse a shared capture set from the exact
revision across the three lenses. Default to at most three representative screens
(primary, interactive, alternate/error). Open controls or capture states only
within the selected inspection scope; do not launch persona discovery or score
task walkthroughs. Missing states are coverage gaps, not guessed defects.

Preserve page-wide evidence for hierarchy and bounded visible text for content;
component crops alone cannot establish page hierarchy. No page-source fallback,
accessibility scanners, auto-fixes or edits to a source UX spec.

When a host workflow invokes this profile, follow the scope and output contract
supplied by the caller. Do not discover or read another plugin's internal files.
Return separate run-scoped outputs and model receipts to the caller; the host
owns validation and canonical writes. Raw responses and the actual sanitized
submitted context are retained; omit private reasoning and credentials. Unknown
usage/cost stays null.

## 2. Exactly three specialist inspections

Use the full definitions in [heuristic-frameworks.md](heuristic-frameworks.md).
Run the passes independently of each other's candidate findings. Use separate
contexts when supported; otherwise disclose procedural independence. Sequential
execution is sufficient. Specialists are replacements, not additions to A/B/C.

- **Content** (`heuristic-content`): H2 domain language, H4 terminology,
  H5 preventative instructions, H9 error explanation; H10 help when in scope.
  Inspect actual labels, instructions, status/empty/error copy. Candidate IDs:
  `candidate-content-1`, etc.
- **Hierarchy** (`heuristic-hierarchy`): H2 names/grouping, H4 structural
  consistency, H6 recognition, H8 relevant information/action prominence.
  Inspect headings, navigation, grouping and retained context. Candidate IDs:
  `candidate-hierarchy-1`, etc.
- **Interaction** (`heuristic-interaction`): H1 feedback, H3 control/cancel/back,
  H5 prevention, H9 recovery; H7 efficiency when repeated/expert work is in scope.
  State-transition claims require observed transitions or supplied sequences.
  Candidate IDs: `candidate-interaction-1`, etc.

Record all 14 lens/heuristic pairs above, including conditional H7/H10, as
`assessed`, `not-assessed`, or `out-of-scope`, with a concise note. Assessed pairs
need evidence references. Do not say “no violations” for a missing state.

If Quick Checks also selects **visual consistency**, the hierarchy inspection
can check a bounded list of applicable bundled PatternFly visual rules against
the same evidence and emit a **separate** consistency result. Give that actual
phase `checks: ["heuristic", "consistency-visual"]`; do not invent a fourth
model phase or repeat resolved source rules. If visual scope is too large for
this bounded pass, narrow it with the designer rather than silently adding runs.

## 3. Synthesize and present findings

Consolidate exact duplicates and preserve originating lens IDs, evidence/source
links, dissent and borderline observations. The local merger generates stable
canonical IDs independent of display order. Preserve single-lens findings.
Use `identified_by`, not majority/unanimous labels: different lens coverage is
not a vote or confidence estimate. Any separate model synthesis invocation must
be recorded as `heuristic-synthesis`; it is not an extra inspection pass.

Return profile/framework, coverage, and findings in the result contract supplied
by a host caller, when present. For standalone use, use the fields described
here without relying on a host plugin's schema files. Each finding contains
title, screen/state, factual observation, heuristic numbers, identifying lenses,
source/evidence IDs, `review_status: "unreviewed"`, optional suggested severity
(null when unavailable), and dissent (empty string when none). No recommendation,
aggregate score, AC PASS or production-readiness verdict.

Present the draft in chat grouped by lens, deduplicating shared findings:
**what was observed → where → heuristic → evidence/source → review status**.
Show the profile/lens legend, exact prototype revision, scope and coverage gaps.
Invite confirm/dismiss/context; do not simulate a researcher's decisions.
With `--output findings` (the profile default), return this unreviewed draft
without waiting for confirmation; invite a later chat review. Persistence of
candidate JSON is permitted before review; it is not a final report.
With `--output reports`, honor `--review chat` by presenting findings and waiting
for confirm/dismiss/severity before generating derived Markdown/HTML reports.
Explicit `--review none` permits reports with the generalist procedure's
**Unreviewed Draft** banner and **Suggested severity** labels; never imply
researcher approval. UX-spec changes remain proposed human work.
