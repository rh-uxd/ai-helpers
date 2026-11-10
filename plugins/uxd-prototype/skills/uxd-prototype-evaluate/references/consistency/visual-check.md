# Visual consistency inspection

Use only for a selected visual check. Source analysis and its separately
installed companion follow [selected inspections](../workflow/selected-inspections.md).
Do not bootstrap a checker, run source commands or create a fix queue here.

## Inputs

Reviewed visual rules with IDs/version, selected screens/states, and settled
captures verified against the prototype revision. New browser/model work requires
its own approval. Missing rules or evidence are blockers, not permission to invent
findings or silently substitute a different check.

## Step 2: Visual inspection

1. Read only the selected rules applicable to the captured components.
2. Compare their requirements with visible screenshots. Prefer bounded component
   or region crops; use page context for hierarchy/layout. DOM facts can locate
   elements but cannot establish visual appearance by themselves.
3. Record evidence-backed findings with rule ID/title, category, severity,
   description, recommendation, and the matching screen/state evidence IDs.
   Keep review candidates separate from confirmed violations.
4. Deduplicate repeated observations without discarding their evidence links.
   Record skipped rules and unavailable coverage rather than reporting a pass.

## Output

Return a separate `consistency-visual` result using the
[inspection bundle](../inspection-contracts/inspection-bundle.md):
`guidelines_version`, `guidelines_checked`, `screenshots_checked`, and canonical
findings with `origin: visual`, `check_method: visual` and image evidence IDs.
The shared writer combines selected results. Do not append shared files, edit
the prototype, run personas or publish a report.
