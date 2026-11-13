# Scope, observations, and report

Use for standalone source/keyboard review as well as consolidation. A short table and a few findings are enough; no separate scope file or schema engine is required.

## Establish scope once

Record target, task, relevant states/transitions, requested action, reference profile (default WCAG 2.2 A/AA plus separately identified APG/provider guidance), available evidence/capabilities, and known revision/environment. Reuse incoming scope; ask only for information that blocks meaningful work. Record exclusions and unknowns.

## Keep observations attributable

Each observation includes check ID (NAME-01/02 or MODAL-01–05), target/state, method (source/browser/manual AT), status, and evidence or limitation. Runtime evidence also records browser/viewport and relevant package version when known. Use source file/line or actual tool observations; do not fabricate selectors, runs, screenshots, or AT results.

- **Pass:** evidence supports this expectation for this method/target/state.
- **Fail:** evidence contradicts the expectation; classify its authority separately.
- **N/A:** not applicable, with reason.
- **Not tested:** applicable but unexecuted, with reason.
- **Inconclusive:** attempted, but evidence cannot establish an outcome; record follow-up.

Source wiring Pass does not prove keyboard behavior. Preserve source and browser observations separately. Retain any substantiated failure when consolidating; conflicts are not resolution. Mark comparable contradictory evidence Inconclusive pending verification, retaining the original failure. Accepted/excluded genuine failures remain visible as known findings, not Pass.

## Findings

For each distinct issue, include stable report-local ID, target/state, expected/actual, evidence, recommendation, and:

- Classification: WCAG violation, pattern deviation, provider issue, recommendation, or coverage gap. Cite the actual criterion or guidance; do not invent WCAG mappings.
- Confidence: confirmed, likely, or needs verification.
- User impact where assessable: critical (blocks essential task), serious (major barrier), moderate (workaround exists), minor (limited friction). Unknown is valid for a gap. Keep tracker priority separate.

Group repeated causes without discarding affected occurrences or evidence origins. Do not close an old finding from a different-state or different-revision pass.

## Final output

1. Scope/environment and limitations.
2. Coverage by target/state and method.
3. Findings and outcome-focused next steps.

A report with untested/inconclusive required checks cannot claim an overall pass. Use “No findings in tested coverage” when appropriate. Even all scoped checks passing does not establish whole-product conformance. Manual screen-reader announcements, visual/media behavior, and other criteria outside this modal slice remain explicitly untested/out of scope.

Markdown is the default; preserve the same meaning if JSON is requested. Carry scope, unresolved findings and observations into another workflow rather than converting them to a bare pass/fail. Draft tracker-ready text when requested; do not file issues without authorization.
