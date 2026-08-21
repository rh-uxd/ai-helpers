---
name: pf-prerelease-audit-insights-chrome
description: "Test a PatternFly prerelease against insights-chrome (RedHatInsights/insights-chrome) — branch setup, npm overrides, build/lint/test validation, breaking change fixes, visual testing via dev server, and compatibility report. Produces a structured compatibility report for the PF team. Use when testing a PF prerelease or RC against insights-chrome."
allowed-tools: Bash, Read, Edit, Write, AskUserQuestion
---

# PatternFly Prerelease Bump — insights-chrome

This skill walks you through validating a PatternFly prerelease version in the insights-chrome repository. It's based on a real validation session and covers every step including known pitfalls.

---

## Phase 0: Orient

First, confirm we're in the right place and discover which PF packages are in play.

```bash
pwd
```

Dynamically read all `@patternfly/*` direct dependencies from `package.json` — this is the authoritative list of packages to bump:

```bash
grep '"@patternfly/' package.json | sed 's/.*"\(@patternfly\/[^"]*\)".*/\1/'
```

> **Note:** `@patternfly/patternfly` (CSS) and `@patternfly/react-charts` use independent versioning — their prerelease strings will differ from the other packages. `pf-5-styles` is an npm alias for PF5 CSS and should **not** be bumped.

### Version collection

**If the user has already supplied prerelease versions for all packages:** use them directly and skip to Phase 1.

**If versions were not provided:** discover the current `prerelease` dist-tag for each package, then confirm with the user before proceeding:

```bash
# Run this for each package discovered above
for pkg in $(grep '"@patternfly/' package.json | sed 's/.*"\(@patternfly\/[^"]*\)".*/\1/'); do
  echo -n "$pkg prerelease: "
  npm view "$pkg" dist-tags.prerelease 2>/dev/null || echo "none"
done
```

Use `AskUserQuestion` to confirm the target version list before continuing.

### Version sanity check

Compare target versions against what is currently installed:

```bash
for pkg in $(grep '"@patternfly/' package.json | sed 's/.*"\(@patternfly\/[^"]*\)".*/\1/'); do
  installed=$(node -p "require('./node_modules/${pkg}/package.json').version" 2>/dev/null || echo "not installed")
  echo "$pkg installed: $installed"
done
```

⚠️ **Warning:** If any target version is older than or equal to the currently installed version, flag this to the user before continuing — testing a downgrade or same version produces misleading results. Ask them to confirm before proceeding.

---

## Phase 1: Branch

```bash
git checkout -b chore/pf-X-Y-rc-testing
# e.g. chore/pf-6-6-rc-testing
```

---

## Phase 2: Bump Dependencies

Edit `package.json`:

1. Set each `@patternfly/*` dep to the exact prerelease version string (no `^` caret).
2. Add an `overrides` block at the bottom of `package.json` for all packages except `quickstarts` (its peer dep on `react-core` is resolved by the `react-core` override):

```json
"overrides": {
  "@patternfly/patternfly": "X.Y.Z-prerelease.N",
  "@patternfly/react-core": "X.Y.Z-prerelease.N",
  "@patternfly/react-icons": "X.Y.Z-prerelease.N",
  "@patternfly/react-table": "X.Y.Z-prerelease.N",
  "@patternfly/react-charts": "A.B.C-prerelease.N",
  "@patternfly/react-tokens": "X.Y.Z-prerelease.N",
  "@patternfly/react-drag-drop": "X.Y.Z-prerelease.N"
}
```

Then install:
```bash
npm install
```

### Handling install failures

**Try overrides first** — they document intent and force the PF version tree-wide while leaving unrelated peer dep validation intact. For stable-to-stable bumps they usually work.

**If `npm install` errors with `ERESOLVE`:** Try adding a nested override for the conflicting package:
```json
"conflicting-package-name": {
  "@patternfly/react-core": "X.Y.Z-prerelease.N"
}
```

**If ERESOLVE persists with nested overrides:** Fall back to:
```bash
npm install --legacy-peer-deps
```

This is expected for prerelease bumps. npm 8 fires ERESOLVE even when overrides are in place because prerelease semver strings (e.g. `6.6.1-prerelease.2`) frequently don't satisfy upstream `^x.y.z` peer dep ranges — this is a known npm behavior, not a real compatibility problem. `--legacy-peer-deps` is scoped to the install command and does not persist. Note which package triggered it and include it in the report.

---

## Phase 3: Lint

```bash
npm run lint
```

**Pass:** 0 errors (some pre-existing warnings are normal — compare to baseline).
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

Review the diff output; if changes look intentional:
```bash
npm run test:update
```

---

## Phase 6: Component Tests (Cypress)

```bash
npm run test:ct
```

On first run after a fresh install, Cypress may need to download its binary (~5 min).

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

## Phase 7: Visual Testing (VPN Required)

Prerequisites:
- VPN connected
- Access to a running insights-chrome dev environment (see your team's setup docs for environment URLs and auth configuration)

```bash
npm run dev
```

Open the dev server URL in your browser. Consult your team's environment docs for the correct hostname, port, and any `/etc/hosts` entries required.

**Troubleshooting:**
- Port busy: `lsof -ti:<PORT> | xargs kill -9`
- Auth redirect errors: ensure you're using the correct hostname (not `localhost`) that matches the OAuth redirect URI configured for your environment
- Blank page: check VPN or environment access
- Chrome cert error: try Firefox instead

**Spot-check list:**
- [ ] Header (logo, user menu, bell icon)
- [ ] Left nav expands/collapses, icons visible
- [ ] All Services page — card grid loads
- [ ] Global search works
- [ ] Dark mode toggle works
- [ ] Notification drawer opens
- [ ] No PF-related console errors (DevTools → Console)

---

## Phase 8: Generate Report

This skill shares a report data model and both output templates with the other `pf-prerelease-audit-*` skills — see:

- `../_shared/pf-prerelease-report/schema.md` — the data model to fill in from Phases 1–7
- `../_shared/pf-prerelease-report/report-template.md` — markdown output (git-diffable, pastes into PR descriptions)
- `../_shared/pf-prerelease-report/report-template.html` — HTML output (self-contained, for email/stakeholder sharing)

Fill in the schema from this run's results, then render **both** templates and write:

- `pf-prerelease-report.md` in the insights-chrome repo root
- `pf-prerelease-report.html` in the insights-chrome repo root

insights-chrome-specific notes for filling the schema:

- `checks[]` — Lint / Build / Jest / Cypress / Visual (manual, mark `skip` if VPN unavailable). This skill doesn't run a baseline pass before bumping, so report a single result per check rather than baseline-vs-prerelease columns.
- `findings[]` — snapshot changes (icon SVG diffs, OUIA ID format changes) belong under `runtime-failure` with a `<details>` diff block; only mark `verdict: "safe to accept"` if the diff matches one of the known-safe patterns in Phase 5, otherwise `"needs investigation"`.
- Embed visual diff images as base64 in the HTML output:
  ```bash
  base64 < "cypress/snapshots/.../___diff_output__/image.png" | tr -d '\n'
  ```
- `installNotes[]` — **always** include an entry for the overrides/ERESOLVE workaround, even when overrides worked cleanly on the first try. If `--legacy-peer-deps` was needed, set `outcome: "did-not-work-fallback-used"` and name the conflicting package (see Phase 2's "Handling install failures").
- The HTML output must stay self-contained (no external dependencies, no relative image paths) so it can be shared by email or attached to a PR.

---

## Phase 9: Commit and PR

```bash
git add package.json package-lock.json
git add src/            # code fixes only
git add cypress/snapshots/    # updated image baselines
git add src/**/__snapshots__/ # updated Jest snapshots
git add pf-prerelease-report.md pf-prerelease-report.html  # reports (stay on RC branch, not merged to master)

git commit -m "chore(deps): bump PatternFly to X.Y.Z-prerelease for RC validation"

# First push — -u sets upstream tracking so future pushes just need `git push`
git push -u origin chore/pf-X-Y-rc-testing
```

Open a PR to `master`. Paste the `.md` report body directly into the PR description; link or attach the `.html` report for stakeholders who want the skimmable version.

---

## Key Files

| File | Purpose |
|------|---------|
| `package.json` | Dep versions + overrides block |
| `src/bootstrap.tsx` | Historical site of PF global mutations |
| `src/components/Navigation/` | Heavy Nav usage, snapshot tests |
| `src/components/Header/` | Masthead, Toolbar, Avatar |
| `src/moduleOverrides/chart-utils-override.js` | Brittle chart webpack alias |
| `cypress/component/NotEntitledModal/` | Uses deprecated Modal, most visual churn |
| `pf-prerelease-report.md` / `.html` | Generated reports (RC branch only) — see `../_shared/pf-prerelease-report/` for the shared template |
