<!--
Shared Markdown report template for all pf-prerelease-audit-* skills.
Fill placeholders from the data model in ./schema.md. Delete any section
with no data for this run rather than leaving it as "N/A" filler — see
schema.md's "Category vs. skill capability" note.
-->
# PatternFly Prerelease Compatibility Report — {{REPO}}

**Date:** {{DATE}}
**Branch:** `{{BRANCH}}`
**Tester:** {{TESTER}}

<!-- Pick exactly one verdict line: -->
> ✅ **Compatible** — {{VERDICT_NOTE}}
> ⚠️ **Regressions found** — {{VERDICT_NOTE}}
> ❌ **Blocked** — {{VERDICT_NOTE}}

## Versions Tested

| Package | Before | After (prerelease) | Notes |
|---|---|---|---|
| `@patternfly/{{pkg}}` | `{{before}}` | `{{after}}` | {{note or blank}} |

**Not consumed by {{REPO_SHORT}}** (present on the prerelease manifest but not a dependency here): {{list, or omit section}}

## Summary

| Check | Baseline | Prerelease | Result |
|---|---|---|---|
| {{check name}} | {{pass/fail/skip + detail}} | {{pass/fail/skip + detail}} | {{No regression / Fixed in prerelease / New regression}} |

<!-- Drop the Baseline column entirely for skills that don't run a baseline pass. -->

## Installation Notes

<!-- Always state what was tried, including failed attempts — don't only document the happy path. -->
- **{{workaround}}** — cause: {{cause}}. Outcome: {{worked / fell back to X because Y / not needed}}.

## Findings

<!-- One subsection per category that this skill's phases can actually detect. Omit categories
     the skill has no way to test (see schema.md). State "None observed" only for categories
     the skill DID check. -->

### TypeScript API break
{{finding or "None observed."}}

### Import path break
{{finding or "None observed."}}

### CSS/SCSS break
{{finding or "None observed."}}

### Runtime failure
{{finding or "None observed."}}

### Build tooling artifact
<!-- Things that look like a PF break but are actually npm/yarn hoisting, webpack config,
     lockfile quirks, etc. Include this section whenever such a false positive was
     investigated and ruled out — it saves the PF team from chasing a non-issue. -->
{{finding or omit section if none arose}}

## Fixes Applied

<!-- Omit this section entirely if no source changes were needed. -->
- **{{file}}** — {{description}}

## Pre-existing Observations

<!-- Warnings/failures present in both baseline and prerelease (or, for skills without a
     baseline, present on main independent of this bump). Call these out so they aren't
     mistaken for new regressions. -->
- {{observation}}

## Recommendations

**For PF team:**
- {{recommendation}}

**For {{REPO_SHORT}} team:**
- {{recommendation}}

## Test Environment

- Node: {{node version}}
- Package manager: {{npm/yarn}} {{version}}
- OS: {{os}}
- Bundler: {{bundler, if applicable}}
