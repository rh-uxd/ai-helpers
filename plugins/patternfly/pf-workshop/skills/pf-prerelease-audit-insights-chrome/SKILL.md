---
name: pf-prerelease-audit-insights-chrome
description: Audit PatternFly prerelease compatibility against insights-chrome — branch setup, npm overrides, build/lint/test validation, and compatibility report. Use when testing a PF RC or prerelease build against insights-chrome (RedHatInsights/insights-chrome).
allowed-tools: Bash, Read, Edit, Write, AskUserQuestion
argument-hint: "[optional: prerelease version to use for all 7 PF packages, or omit to enter versions interactively]"
---

# PatternFly Prerelease Audit — insights-chrome

Validates a PatternFly prerelease version in the insights-chrome repository. Based on a real validation session and covers every step including known pitfalls.

📄 Full runbook (Red Hat employees only): https://docs.google.com/document/d/1tVDH_BAZ6ygtuCCG69WGobCM_lXs9dkop3HjNH8EKVE/edit

---

## Phase 0: Orient

First, confirm we're in the right place and get the target versions.

```bash
# Confirm you're in insights-chrome
pwd
cat package.json | grep -E '"@patternfly/'
```

Ask the user for target prerelease versions if not already provided. The 7 direct deps to update are:
- `@patternfly/patternfly`
- `@patternfly/react-core`
- `@patternfly/react-icons`
- `@patternfly/react-table`
- `@patternfly/react-charts`
- `@patternfly/react-tokens`
- `@patternfly/quickstarts`

Use `AskUserQuestion` to collect versions if not provided upfront.

---

## Phase 1: Branch

```bash
git checkout main && git pull origin main
git checkout -b chore/pf-X-Y-rc-testing
# e.g. chore/pf-6-5-rc-testing
```

---

## Phase 2: Bump Dependencies

Edit `package.json`:

1. Set each of the 7 packages to the exact prerelease version string (no `^` caret).
2. Add an `overrides` block at the bottom of `package.json` for the 6 core packages (skip `quickstarts` from overrides — its peer dep on `react-core` gets resolved by the override on `react-core` itself):

```json
"overrides": {
  "@patternfly/patternfly": "X.Y.Z-prerelease.N",
  "@patternfly/react-core": "X.Y.Z-prerelease.N",
  "@patternfly/react-icons": "X.Y.Z-prerelease.N",
  "@patternfly/react-table": "X.Y.Z-prerelease.N",
  "@patternfly/react-charts": "A.B.C-prerelease.N",
  "@patternfly/react-tokens": "X.Y.Z-prerelease.N"
}
```

**Why overrides instead of `--legacy-peer-deps`?** `overrides` is surgical — forces only the PF versions you specified while still catching unrelated peer dep problems. `--legacy-peer-deps` silently ignores ALL mismatches.

Then install:
```bash
npm install
```

If this errors with `ERESOLVE`, add the conflicting package to the overrides block.

**Verify the install actually succeeded** before moving on — `npm install` can complete with a broken dependency tree (ENOTEMPTY race conditions, silent hoisting failures) without a nonzero exit code:

```bash
PF_COUNT=$(ls node_modules/@patternfly/ 2>/dev/null | wc -l)
echo "PF packages installed: $PF_COUNT"
if [ "$PF_COUNT" -lt 7 ]; then
  echo "INTEGRITY FAILURE — expected 7+, found $PF_COUNT. Reinstalling clean."
  rm -rf node_modules package-lock.json
  npm install
fi

NESTED=$(find . -path "*/node_modules/@patternfly/react-core" -maxdepth 5 | grep -v ".cache")
if [ -n "$NESTED" ]; then
  echo "HOISTING TRAP — nested PF copies found: $NESTED"
  echo "This may cause CSS/webpack errors later that look like PF breaking changes but aren't."
else
  echo "Install verified — no nested PF copies."
fi
```

---

## Phase 3: Lint

```bash
npm run lint
```

**Pass:** 0 errors (up to ~96 pre-existing warnings are normal).  
**Fail:** Error means a PF import path changed or export was removed. Fix the import.

---

## Phase 4: Build

```bash
npm run build
```

**Expected warnings (ignore):** Sass deprecation warnings from `pf-5-styles` — pre-existing.  
**Watch for:** TypeScript errors like `TS2339: Property 'X' does not exist on type...`

### Common TS errors and fixes

**`defaultProps` does not exist** — Component was converted from class to function component. Remove the `.defaultProps` mutation. Example fix applied in `src/bootstrap.tsx` for `GenerateId`.

**`Property X does not exist`** — Prop renamed or removed. Check the PF changelog for the new name.

**Import errors** — Component moved to a different subpath. Update the import path.

---

## Phase 5: Unit Tests (Jest)

```bash
npm test
```

**Snapshot failures are expected** when PF updates icons or component DOM. Two safe-to-accept patterns:
- Icon SVG paths changed (new viewBox, new `d` attribute) — PF refreshed icon artwork
- OUIA IDs changed from `OUIA-Generated-Button-plain-2` to `:r3:` format — React `useId()` now used internally

Review the diff output, then if changes look intentional:
```bash
npm run test:update
```
If `test:update` isn't defined in this repo's `package.json`, use Jest's built-in flag instead: `npm test -- -u`.

---

## Phase 6: Component Tests (Cypress)

```bash
npm run test:ct
```

On first run ever, Cypress downloads its binary (~5 min).

### Reading visual regression failures

Failure message: `"Image was X% different from saved snapshot with Y different pixels"`

Diff images saved to:
```
cypress/snapshots/cypress/component/{Component}/{TestFile}/__diff_output__/
```

Diff image panels: **Left** = baseline (old PF) | **Center** = highlighted diff (pink = changed) | **Right** = actual (new PF)

- Small % isolated to icon/color = likely safe to accept
- Large % with layout shifts = investigate, may be a real regression

After review, update baselines:
```bash
npm run test:ct -- --env updateSnapshots=true
# Or a single spec:
npm run test:ct -- --spec cypress/component/NotEntitledModal/NotEntitledModal.cy.tsx --env updateSnapshots=true
```

---

## Phase 7: Visual Testing (Red Hat employees only)

Visual testing against the Red Hat staging environment requires Red Hat VPN access and internal staging credentials. See the full runbook linked at the top of this skill for setup instructions.

If you don't have VPN access, skip this phase and note the gap in your compatibility report.

**Spot-check list (when accessible):**
- [ ] Header (logo, user menu, bell icon)
- [ ] Left nav expands/collapses, icons visible
- [ ] All Services page — card grid loads
- [ ] Global search works
- [ ] Dark mode toggle works
- [ ] Notification drawer opens
- [ ] No PF-related console errors (DevTools → Console)

---

## Phase 8: Generate Report

Generate a new HTML compatibility report at `pf-prerelease-report.html` with embedded diff images for sharing with the PF team and product owners.

The report should include:
- Version table (before → after)
- Lint / build / Jest / Cypress results
- Breaking changes found and fixes applied
- Visual regression diff images (base64-embedded for portability)
- Recommendations for the PF team

---

## Phase 9: Commit and PR

```bash
git add package.json package-lock.json
git add src/            # code fixes only
git add cypress/snapshots/    # updated image baselines
git add src/**/__snapshots__/ # updated Jest snapshots
git add pf-prerelease-report.html  # compatibility report

git commit -m "chore(deps): bump PatternFly to X.Y.Z-prerelease for RC validation"

# First push — -u sets upstream tracking so future pushes just need `git push`
BRANCH=$(git branch --show-current)
git push -u origin "$BRANCH"
```

Open a PR to `master` **for visibility and CI signal only — do not merge it**. This PR exists so the PF team and reviewers can see the diff and CI results; the prerelease version bump itself is test scaffolding, not a change intended to ship. Link the HTML report or paste the summary in the PR description, and note in the PR body that it's for RC validation and should be closed (not merged) once findings are captured.

---

## Key Files

| File | Purpose |
|------|---------|
| `package.json` | Dep versions + overrides block |
| `src/bootstrap.tsx` | Historical site of PF global mutations |
| `src/components/Navigation/` | Heavy Nav usage, 5 snapshot tests |
| `src/components/Header/` | Masthead, Toolbar, Avatar |
| `src/moduleOverrides/chart-utils-override.js` | Brittle chart webpack alias |
| `cypress/component/NotEntitledModal/` | Uses deprecated Modal, most visual churn |
| `pf-prerelease-report.html` | Report template (RC branch only) |
