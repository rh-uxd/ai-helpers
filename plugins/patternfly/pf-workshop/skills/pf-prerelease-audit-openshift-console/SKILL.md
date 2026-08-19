---
name: pf-prerelease-audit-openshift-console
description: Audit PatternFly prerelease compatibility against OpenShift Console — baseline comparison, Yarn resolutions, build/tsc/lint/unit test validation, and compatibility report. Use when testing a PF RC or prerelease build against OpenShift Console (openshift/console).
argument-hint: "[optional: space-separated list of @patternfly/pkg@version pairs, or omit to enter versions interactively]"
disable-model-invocation: true
---

# PatternFly Prerelease Audit — OpenShift Console

Validates that a set of PatternFly prerelease npm packages are compatible with OpenShift Console. Runs four checks (build, tsc, lint, unit tests) on the **current branch as-is** (baseline), then again after bumping PF versions, and produces a structured report for the PF team.

Designed to be run quarterly for each PF release candidate cycle.

## Prerequisites

- Node 22+, Yarn 4+
- npm registry access for PF prerelease packages
- A dedicated RC testing branch (e.g., `chore/pf-6-6-rc-testing`) — Phase 1.1 creates one if you don't already have it

---

## Phase 0: Gather Target Versions

If versions were not passed as arguments, ask the user:

> "Please paste the list of `@patternfly/*` prerelease versions you want to test (one per line, in `"pkg": "version"` format from package.json)."

If no versions are available at all, discover the current `prerelease` dist-tag for each package already in `frontend/package.json` as a fallback, then confirm with the user before proceeding:

```bash
for pkg in $(grep -E '"@patternfly/' frontend/package.json | sed 's/.*"\(@patternfly\/[^"]*\)".*/\1/'); do
  echo -n "$pkg prerelease: "
  npm view "$pkg" dist-tags.prerelease 2>/dev/null || echo "none"
done
```

Identify which packages are **already in `frontend/package.json`** vs new (not yet consumed by console). Only update packages that are already declared — do not add new packages unless the user explicitly asks. Note which prerelease packages are skipped (not consumed).

### Version existence and sanity checks

Before editing `package.json`, confirm every target version actually resolves on the npm registry — a late failure mid-install wastes a full install/build cycle:

```bash
for spec in "react-core:6.6.0-prerelease.9" ...; do   # one entry per target package:version
  pkg="${spec%%:*}"; ver="${spec##*:}"
  npm view "@patternfly/$pkg@$ver" version 2>&1
done
```

Also compare each target version against what's currently installed (`grep -E '^"@patternfly' frontend/yarn.lock`). If any target is **older than or equal to** the currently installed version, flag this to the user before continuing — testing a downgrade or a no-op produces misleading results in the diff.

---

## Phase 1: Baseline

### 1.1 Confirm state / create the RC branch

```bash
git checkout main && git pull origin main
git status --short
```

If the working tree isn't clean, stop and ask the user how to proceed. Otherwise create the dedicated testing branch:

```bash
git checkout -b chore/pf-X-Y-rc-testing
```

If you're already on a dedicated RC branch, skip branch creation and just confirm `git status --short` is clean.

### 1.2 Install (baseline)
```bash
cd frontend && yarn install 2>&1 | tee /tmp/baseline-install.log; echo "EXIT:${PIPESTATUS[0]}"
```

Check the printed `EXIT:` code — this is `yarn install`'s real exit status, not `tee`'s. Also confirm the postinstall script `scripts/check-patternfly-modules.ts` printed "No issues detected" in the log. Record the existing peer dependency warnings (they are pre-existing and appear in both runs).

### 1.3 Record resolved versions

`frontend/` is its own Yarn workspace root, so `yarn.lock` lives inside `frontend/`, not at the repo root. Don't assume the previous command's `cd frontend` carried over to this Bash call — make it explicit:

```bash
cd frontend && grep -E '^"@patternfly' yarn.lock | sort
```

### 1.4 Run baseline checks

`yarn test --ci` includes `tree-shaking.spec.ts` and `sdk-dist-imports.spec.ts`, which skip themselves when `public/dist/` doesn't exist. Run the build **first and alone**, then run tsc/lint/test in parallel — never run the build and test suite at the same time, or the skip becomes a race condition instead of a reliable signal.

```bash
cd frontend && yarn dev-once 2>&1 | tee /tmp/baseline-build.log; echo "EXIT:${PIPESTATUS[0]}"
```

Confirm the build's `EXIT:` code before continuing. Each command below is self-contained (explicit `cd frontend`) and prints its own real exit code via `PIPESTATUS`, since `tee` would otherwise mask a failing `yarn` command with tee's own exit code (0). Run these three as parallel Bash tool calls:

```bash
cd frontend && yarn tsc --noEmit 2>&1 | tee /tmp/baseline-tsc.log; echo "EXIT:${PIPESTATUS[0]}"
```
```bash
cd frontend && yarn lint 2>&1 | tee /tmp/baseline-lint.log; echo "EXIT:${PIPESTATUS[0]}"
```
```bash
cd frontend && yarn test --ci 2>&1 | tee /tmp/baseline-unit.log; echo "EXIT:${PIPESTATUS[0]}"
```

Record the printed `EXIT:` code for each (0 = passed) and summary lines from each log. Capture `Test Suites: N passed` and `Tests: N passed` lines from the unit log. If `tree-shaking.spec.ts`/`sdk-dist-imports.spec.ts` still show as skipped after building first, treat it as a real failure to investigate, not a timing artifact.

---

## Phase 2: Update to Prerelease Versions

### 2.1 Update `frontend/package.json` — dependencies

Replace each existing `@patternfly/*` entry's version with the target prerelease version (exact string, no `~` or `^`).

### 2.2 Update `frontend/package.json` — resolutions

**Critical — required for Yarn Berry monorepos with prerelease PF versions.**

Prerelease PF packages often retain peer dependencies on the previous stable sibling versions, causing Yarn to install multiple resolutions simultaneously. The `check-patternfly-modules.ts` postinstall script rejects this.

Add all bumped PF packages to the `resolutions` field (which already exists in this repo).

**This isn't unique to prerelease bumps** — any `@patternfly/*` version change (including a deliberate *downgrade*, e.g. for a dry-run of this skill against an already-current repo) can trigger the same dual-resolution conflict if other transitive deps still reference the old version. If `yarn install` reports `has multiple resolutions` during Phase 1 (baseline) rather than Phase 2, add `resolutions` entries for the baseline versions too before proceeding — don't assume this problem only appears when moving forward.

```json
"resolutions": {
  "@patternfly/patternfly": "<prerelease-version>",
  "@patternfly/react-core": "<prerelease-version>",
  "@patternfly/react-icons": "<prerelease-version>",
  "@patternfly/react-styles": "<prerelease-version>",
  "@patternfly/react-table": "<prerelease-version>",
  "@patternfly/react-tokens": "<prerelease-version>",
  "@patternfly/react-component-groups": "<prerelease-version>",
  ... (all bumped packages)
}
```

### 2.3 Update `frontend/scripts/check-patternfly-modules.ts`

If any new `@patternfly/*` packages appear as transitive dependencies (visible in the `yarn install` error output as "Please update check-patternfly-modules.ts to handle this PatternFly package: ..."), add them to the `PKGS_TO_CHECK` array. Set `semver` to match the major version currently resolved for that package in `yarn.lock` — don't assume `'6.x'` for every package; some PF packages (e.g. `react-charts`) track their own major version line independently of the rest of PatternFly.

The script uses `semver.coerce()` before checking ranges, so prerelease strings like `6.6.0-prerelease.9` coerce to `6.6.0` and satisfy `6.x` without further patching.

### 2.4 Install (prerelease)
```bash
cd frontend && yarn install 2>&1 | tee /tmp/prerelease-install.log; echo "EXIT:${PIPESTATUS[0]}"
```

Check the printed `EXIT:` code first — `tee` always exits 0, so this is the only reliable signal that `yarn install` itself succeeded. If non-zero, consult the troubleshooting table below before proceeding.

**Troubleshooting install failures:**

| Error | Cause | Fix |
|---|---|---|
| `has multiple resolutions: X, Y` | Missing `resolutions` entry | Add to `resolutions` field |
| `Please update check-patternfly-modules.ts to handle: @patternfly/foo` | New transitive dep in scope | Add to `PKGS_TO_CHECK` array |
| `has no 6.x resolutions` | Added to `PKGS_TO_CHECK` but package not installed | Remove from `PKGS_TO_CHECK` |

`resolutions` has resolved every dual-resolution conflict seen so far in this repo, but don't assume it always will. If an install still fails after adding a `resolutions` entry, capture the exact error in the report's Installation Notes rather than silently retrying — a future run may need a different workaround (e.g. Yarn's `--legacy-peer-deps` equivalent, or a nested resolution keyed to the conflicting parent package), and the report should say what was tried and failed, not just what eventually worked.

### 2.5 Run prerelease checks

As in Phase 1.4, run the build first and alone — `tree-shaking.spec.ts`/`sdk-dist-imports.spec.ts` skip when `public/dist/` is absent, so building and testing in parallel turns that skip into a race condition.

```bash
cd frontend && yarn dev-once 2>&1 | tee /tmp/prerelease-build.log; echo "EXIT:${PIPESTATUS[0]}"
```

Confirm the build's `EXIT:` code, then run these three as parallel Bash tool calls (each self-contained, each prints its own real exit code via `PIPESTATUS`):

```bash
cd frontend && yarn tsc --noEmit 2>&1 | tee /tmp/prerelease-tsc.log; echo "EXIT:${PIPESTATUS[0]}"
```
```bash
cd frontend && yarn lint 2>&1 | tee /tmp/prerelease-lint.log; echo "EXIT:${PIPESTATUS[0]}"
```
```bash
cd frontend && yarn test --ci 2>&1 | tee /tmp/prerelease-unit.log; echo "EXIT:${PIPESTATUS[0]}"
```

Record the printed `EXIT:` code for each (0 = passed).

---

## Phase 3: Diff and Categorize

Compare each log pair. Report only findings **new in prerelease** (not in baseline).

Set the report's overall verdict per `../_shared/pf-prerelease-report/schema.md`'s verdict rules: `compatible` if the only findings are peer-dep warnings, `regressions-found` if there's a real finding with a workaround, `blocked` if something fails with no known fix.

**Known non-issues (ignore if present in both runs):**
- `React.jsx: type is invalid` warnings from `@patternfly/react-topology` `TopologyControlBar` — pre-existing in stable, not a regression
- `[mobx-react-lite] importing batchingForReactDom is no longer needed` — pre-existing

Categorize new findings as:
- **TypeScript API break** — type removed, prop renamed, generic changed
- **Import path break** — module moved, re-export removed
- **CSS/SCSS break** — token renamed, class changed
- **Runtime failure** — unit test failure (not just console.error warning)
- **Peer dep warning** — new warning from `yarn install`

This skill has no bundle-analysis phase, so **do not** report a "bundle size change" category — there's no step here that would catch one either way.

---

## Phase 4: Write Report

This skill shares a report data model and both output templates with the other `pf-prerelease-audit-*` skills — see:

- `../_shared/pf-prerelease-report/schema.md` — the data model to fill in from Phases 1–3
- `../_shared/pf-prerelease-report/report-template.md` — markdown output (git-diffable, pastes into PRs/Slack)
- `../_shared/pf-prerelease-report/report-template.html` — HTML output (self-contained, stakeholder-facing)

Fill in the schema from this run's results, then render **both** templates and write:

- `pf-prerelease-report-YYYY-MM-DD.md` in the repo root
- `pf-prerelease-report-YYYY-MM-DD.html` in the repo root

Console-specific notes for filling the schema:

- `versions[]` — cover only packages actually declared in `frontend/package.json` and bumped. Packages from the prerelease manifest not in `frontend/package.json` go in the "not consumed" note, not in the table.
- `checks[]` — Install / Build (`yarn dev-once`) / TSC / Lint / Unit tests (`yarn test --ci`), each with baseline and prerelease results.
- `installNotes[]` — always include the `resolutions` workaround entry (see Phase 2.2 and the Known Gotchas section), even when it worked cleanly — this is expected friction for this repo, not an anomaly.
- Bundle size is **not measured** by this skill (no `yarn analyze` step) — omit the `bundle-size-change` finding category entirely rather than reporting "None observed" for a category nothing here actually checks. Note the gap under Recommendations if it seems relevant.
- `env.bundler` — rspack version from `frontend/package.json`'s `@rspack/core`.

---

## Phase 5: Visual Spot-Check (optional)

Full visual regression requires a running OpenShift cluster. Check your team's shared cluster access for available environments. If a cluster is available, spot-check these high-traffic areas for layout or styling regressions:

- [ ] Masthead — logo, user menu, help icon
- [ ] Left nav — expand/collapse, icons visible, active state
- [ ] Overview page — card grid, status indicators
- [ ] Any page that uses the PF component with the most changes this release
- [ ] Dark mode — toggle and verify no PF color token regressions

If no cluster is available, note this gap in the report and recommend targeted manual verification by the QE team.

---

## Known Gotchas (accumulated from prior runs)

### Yarn Berry dual-resolution problem (first seen: 2026-06-29)
When PF prerelease packages declare peer deps on the previous stable sibling versions, Yarn installs both versions. Console's `check-patternfly-modules.ts` rejects this. **Always add `resolutions` entries for all bumped packages** before running install.

Affected packages vary per release — check the install error output to identify which packages need `resolutions` entries. In the 6.6.0-prerelease cycle: `react-core`, `react-icons`, `react-styles`, `react-table`, `react-tokens`, `react-component-groups`.

### check-patternfly-modules.ts throws on unknown @patternfly/* packages
If a new PF package appears in yarn.lock as a transitive dep and is not in `PKGS_TO_CHECK`, the postinstall script throws. Add it to the array. If it has 0 resolutions (not actually installed), remove it from the array.

### tree-shaking.spec.ts skips when dist/ is absent
`__tests__/tree-shaking.spec.ts` and `__tests__/sdk-dist-imports.spec.ts` skip dynamically if `public/dist/` doesn't exist. This skill runs the build before the test suite specifically to avoid this — if you still see the skip after building first, treat it as a real failure to investigate, not something to wave off as a timing artifact.

### semver.coerce() strips prerelease tags
The validation script calls `semver.coerce(resolvedVersions[0])` before `satisfies()`, which strips prerelease identifiers. `6.6.0-prerelease.9` → `6.6.0` → satisfies `6.x`. No additional patching of the script's semver logic is needed.

### Packages not consumed by console
Some packages appear on PF's prerelease manifest but are not in console's `package.json` and should not be tested here. Do not add them to `PKGS_TO_CHECK` unless they are actually installed. Re-check `frontend/package.json` before each run — the list changes as console adopts new packages.

---

## Cleanup After Testing

The following changes are **test scaffolding only** and should NOT be committed to the default branch:
- `frontend/package.json` — revert version bumps and remove `resolutions` overrides
- `frontend/yarn.lock` — revert (`yarn install` rewrites it whenever `resolutions`/dependencies change; leaving prerelease entries in place can break a later immutable install or contaminate the branch)
- `frontend/scripts/check-patternfly-modules.ts` — revert any `PKGS_TO_CHECK` additions (unless the packages are genuinely being added to the codebase)

The report files (`pf-prerelease-report-YYYY-MM-DD.md` and `.html`) can be committed or shared directly.
