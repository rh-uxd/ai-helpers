---
name: pf-prerelease-audit-odh-dashboard
description: Audit PatternFly prerelease compatibility against odh-dashboard — npm overrides, webpack CSS hoisting fixes, full validation suite, and compatibility report. Use when testing a PF RC or prerelease build against odh-dashboard (opendatahub-io/odh-dashboard).
argument-hint: "[JSON map of @patternfly/PACKAGE: VERSION pairs, or omit to paste the version map interactively]"
disable-model-invocation: true
---

# PatternFly Prerelease Audit — ODH Dashboard (RHOAI)

Bump all `@patternfly/*` packages to prerelease versions, fix npm hoisting issues, validate the build, and produce a compatibility report.

## Arguments

`$ARGUMENTS` — Required. A JSON-style list of `"@patternfly/PACKAGE": "VERSION"` pairs provided by the user. Example:

```
"@patternfly/patternfly": "6.6.0-prerelease.16",
"@patternfly/react-core": "6.6.0-prerelease.9",
"@patternfly/chatbot": "6.7.0-prerelease.4",
...
```

If no arguments provided, ask the user to paste the version map from the PF release coordination channel.

## Overview

This happens quarterly before each PF minor release. The goal is to catch breaking changes early by running the dashboard against PF prerelease builds. Version bumps are scoped to `frontend/package.json` and root `package.json` — sub-packages are NOT updated (they inherit via overrides). Two additional files may need edits if hoisting issues surface: `frontend/config/webpack.dev.js` (Phase 4, CSS include path workaround) and `packages/observability/package.json` (Phase 4.3, only if `@perses-dev` transitive deps break). These are conditional workarounds, not part of the standard version-bump scope.

---

## Phase 0: Connect to an OpenShift cluster

The dashboard dev server proxies API requests to a live OpenShift cluster. You must be logged in via `oc login` before starting the dev server, or all `/api/*` routes will return `ECONNREFUSED`.

Ask the user to log in to an available OpenShift cluster using **interactive** login — do not pass username, password, or token as command-line arguments, since they'd be exposed in shell history and process listings:

```bash
oc login <YOUR_CLUSTER_API_URL>
# oc will prompt securely for credentials, or use --web for browser-based SSO login
```

Check your team's shared OpenShift cluster access channel to find which cluster to target — but enter credentials only at the interactive prompt, never on the command line.

Verify login succeeded:
```bash
oc whoami
```

If the user has already logged in, skip this phase.

---

## Phase 1: Parse version map and confirm

### 1.1 Parse the provided versions

Extract each `@patternfly/PACKAGE: VERSION` pair from the arguments.

### 1.2 Identify which packages are used by this project

Read `frontend/package.json` dependencies. Only update packages that are already listed as dependencies. Show the user:

- Packages that will be updated (exist in deps)
- Packages from the version map that are NOT in our deps (skip these)
- Any deps that weren't in the version map (keep current version)

### 1.3 Confirm with the user before proceeding

---

## Phase 2: Create branch and update versions

### 2.1 Create testing branch

```bash
git checkout main
git pull origin main
git checkout -b chore/pf-MINOR-rc-testing
```

Infer the minor version from the provided versions (e.g. `6.6` from `6.6.0-prerelease.9`).

### 2.2 Update `frontend/package.json`

Update these three sections — all must be consistent:

**A. Dependencies (~line 70-85)**

Update each `@patternfly/*` version in the `dependencies` block to the provided prerelease version.

**B. Nested overrides under `@openshift/dynamic-plugin-sdk-utils`**

Update PF versions inside `overrides["@openshift/dynamic-plugin-sdk-utils"]`. These packages must match the provided versions:
- `@patternfly/react-core`
- `@patternfly/react-icons`
- `@patternfly/react-styles`
- `@patternfly/react-table`

**C. Top-level overrides**

**CRITICAL:** Add top-level overrides for PF packages that other dependencies pull transitively. This is required because `^6.0.0` does NOT match `6.7.0-prerelease.x` per semver prerelease rules. Without these, npm installs duplicate stable copies.

Add at the end of the `overrides` block:
```json
"@patternfly/react-core": "VERSION",
"@patternfly/react-icons": "VERSION",
"@patternfly/react-styles": "VERSION",
"@patternfly/react-table": "VERSION",
"@patternfly/react-tokens": "VERSION",
"@patternfly/react-code-editor": "VERSION"
```

### 2.3 Update root `package.json`

Mirror the same override changes in root `package.json` overrides block:
- Nested overrides under `@openshift/dynamic-plugin-sdk-utils`
- Top-level PF overrides

Do NOT update `dependencies` or `devDependencies` in root `package.json`.

### 2.4 Check for monaco-editor peer dep changes

`@patternfly/chatbot` may require a newer `monaco-editor`:
```bash
npm view @patternfly/chatbot@CHATBOT_VERSION peerDependencies --json 2>/dev/null | grep monaco
```

If it requires a version newer than what's in `frontend/package.json`, bump `monaco-editor` too. Note: `monaco-editor` uses `0.x` versioning, so `^0.50.0` means `>=0.50.0 <0.51.0`, NOT `<1.0.0`.

---

## Phase 3: Clean install

**CRITICAL:** Must do a clean install when overrides change. Incremental `npm install` will NOT resolve the new dependency tree — it leaves stale nested copies in place instead of re-evaluating hoisting from scratch.

```bash
rm -rf node_modules frontend/node_modules packages/*/node_modules package-lock.json
npm install
```

### 3.1 Verify install integrity

```bash
PF_COUNT=$(ls node_modules/@patternfly/ 2>/dev/null | wc -l)
echo "PF packages installed: $PF_COUNT"
if [ "$PF_COUNT" -lt 15 ]; then
  echo "INTEGRITY FAILURE — expected 15+, found $PF_COUNT. Likely a partial/ENOTEMPTY install — see 3.2."
fi

# Check for duplicate/nested PF copies (the hoisting trap). Scan all @patternfly/*
# packages, not just react-core — the bumped package set varies per run based on
# the user-provided version map, and a nested copy of any one of them can cause
# CSS/webpack errors that look like PF breaking changes but aren't.
# NOTE: evaluate the captured text, not the exit code — `grep -v` exits 1 (looks
# like "failure") on the CLEAN/good case where nothing survives the filter.
NESTED=$(find . -path "*/node_modules/@patternfly/*" -maxdepth 5 -type d | \
  grep -v "^./node_modules/" | grep -v ".cache")
if [ -n "$NESTED" ]; then
  echo "HOISTING TRAP DETECTED — nested PF copies found, see Phase 4:"
  echo "$NESTED"
else
  echo "Hoisting check passed — no nested PF copies of any @patternfly/* package found."
fi
```

If the hoisting trap is detected (nested copies under `frontend/node_modules/@patternfly/`), go to Phase 4.

### 3.2 Handle npm ENOTEMPTY errors

npm can silently fail with ENOTEMPTY race conditions. If install output shows warnings or the package count is wrong, delete and reinstall:
```bash
rm -rf node_modules package-lock.json
npm install
```

---

## Phase 4: Fix webpack CSS hoisting issues

### 4.1 Check for nested PF copies

```bash
# Evaluate the captured text, not the exit code — chained `grep -v` filters exit
# 1 (looks like "failure") on the clean case where nothing survives the filter.
NESTED=$(find . -path "*/node_modules/@patternfly/*" -maxdepth 5 -type d | \
  grep -v "^./node_modules/" | grep -v ".cache" | sort)
if [ -n "$NESTED" ]; then
  echo "Nested PF copies found — dev webpack CSS rule won't find them:"
  echo "$NESTED"
else
  echo "No nested PF copies found."
fi
```

If any packages appear under `frontend/node_modules/@patternfly/`, the dev webpack CSS rule won't find them.

### 4.2 Apply webpack workaround if needed

The dev webpack config (`frontend/config/webpack.dev.js`) has a CSS include that only points to root `node_modules/@patternfly`. Nested copies won't be processed.

In `frontend/config/webpack.dev.js`, find the CSS rule's `include` array and add:
```js
path.resolve(RELATIVE_DIRNAME, 'node_modules/@patternfly'),
```
after the existing:
```js
path.resolve(RELATIVE_DIRNAME, '../node_modules/@patternfly'),
```

**Why this happens:** npm does not hoist prerelease versions the same way as stable versions. When version constraints create ambiguity, npm installs a second copy under `frontend/node_modules/`. Webpack resolves the closer copy, which isn't covered by the CSS loader include path. This produces `Module parse failed: Unexpected token` errors on `.css` files that look exactly like a PF breaking change in CSS distribution. It is NOT a PF change — it is an npm hoisting artifact of prerelease versions.

### 4.3 Handle observability transitive dependencies

PF overrides can change npm hoisting decisions for ALL packages. The `@perses-dev` dependencies in `packages/observability` are fragile — they rely on implicit hoisting for transitive deps.

If you see webpack errors about missing modules from `@perses-dev` packages, add the missing transitive deps to `packages/observability/package.json`.

---

## Phase 5: Build validation

Run each step. Record results for the report.

### 5.1 Dev server build (MUST PASS)

`npm run start:dev:ext` starts a long-running dev server that never exits on its own — running it as a normal foreground command will hang or hit the tool's timeout. Run it in the background, capture the compile output to a log, and poll the log instead of waiting on the command:

```bash
npm run start:dev:ext > /tmp/dev-server.log 2>&1 &
DEV_SERVER_PID=$!
echo "Dev server started, PID $DEV_SERVER_PID"
```

Then poll (re-run every ~10s until you see a compile result or ~2 minutes elapse):

```bash
grep -E "compiled successfully|compiled with|ERROR in|Failed to compile" /tmp/dev-server.log | tail -5
```

- **"compiled successfully" / "compiled with N warnings"** → PASS. Warnings are acceptable.
- **"Failed to compile" / "ERROR in ..."** → FAIL. If the errors are CSS parse errors, go back to Phase 4 — they're likely a hoisting artifact, not a real PF break.

If you don't need the visual smoke test (5.7), stop the server once you have a result:
```bash
kill $DEV_SERVER_PID 2>/dev/null
```
Otherwise leave it running and proceed to the rest of Phase 5 — come back to kill it after 5.7.

### 5.2 Type checking

```bash
npm run type-check
```

### 5.3 Linting

```bash
npm run lint
```

### 5.4 Unit tests

```bash
npm run test-unit
```

### 5.5 Cypress tests

```bash
npm run test:cypress-ci
```

### 5.6 Baseline comparison

For each failing step, compare against `main` to separate pre-existing failures from new PF regressions:

```bash
git stash
npm run type-check 2>&1 | tail -10  # or whichever command
git stash pop
```

### 5.7 Visual smoke test

If `start:dev:ext` is running, open `http://localhost:4010`. Check:
- Dashboard loads without blank screen
- Navigation works
- No obvious layout breaks
- PatternFly components render with expected spacing, colors, and no visual regressions (buttons, tables, modals)

---

## Phase 6: Report results

This skill shares a report data model and both output templates with the other `pf-prerelease-audit-*` skills — see:

- `../_shared/pf-prerelease-report/schema.md` — the data model to fill in from Phases 1–5
- `../_shared/pf-prerelease-report/report-template.md` — markdown output (git-diffable, pastes into PR descriptions)
- `../_shared/pf-prerelease-report/report-template.html` — HTML output (self-contained, for stakeholder sharing)

Fill in the schema from this run's results, then render **both** templates and write:

- `pf-prerelease-report.md` in the odh-dashboard repo root
- `pf-prerelease-report.html` in the odh-dashboard repo root

odh-dashboard-specific notes for filling the schema:

- `checks[]` — dev server build / type-check / lint / unit tests / cypress / visual smoke, each compared against the Phase 5.6 baseline (`git stash` + rerun on `main`) so pre-existing failures aren't mistaken for new regressions.
- `versions[]` — pull from the version map in Phase 1, annotated with which packages required top-level `overrides` (Phase 2.2C) vs which only needed the `dependencies` bump.
- `findings[]` — CSS parse failures that turn out to be npm hoisting artifacts (see "Diagnosing CSS parse failures" below) go under `build-tooling-artifact`, **not** `css-scss-break` — the whole point of that diagnosis procedure is to keep false positives out of the PF-facing findings.
- `installNotes[]` — always include the hoisting-check outcome from Phase 3.1 (nested copies found or not), and whether the Phase 4.2 webpack workaround was needed.
- `fixesApplied[]` — include the webpack.dev.js CSS include change and any `packages/observability/package.json` transitive dep additions, since these are real (if inert-on-main) source changes made to unblock the bump.

---

## Diagnosing CSS parse failures

This is the most common issue during prerelease testing. Do NOT report to PF team without verifying.

**Step 1: Check for nested copies**
```bash
find . -path "*/node_modules/@patternfly/FAILING_PACKAGE" -maxdepth 5
```
If found under `frontend/node_modules/` → hoisting problem, not PF problem. Apply Phase 4.2 fix.

**Step 2: Compare distribution format** (only if not a hoisting issue)
```bash
rm -rf /tmp/pf-diff && mkdir /tmp/pf-diff && cd /tmp/pf-diff
mkdir stable pre

# `npm pack` prints the real tarball filename it created (e.g.
# patternfly-react-core-6.5.0.tgz) — it never contains literal "STABLE"/"PRE".
# Capture that filename directly instead of globbing for it.
STABLE_TGZ=$(npm pack @patternfly/PACKAGE@STABLE_VERSION | tail -1)
PRE_TGZ=$(npm pack @patternfly/PACKAGE@PRERELEASE_VERSION | tail -1)
tar xzf "$STABLE_TGZ" -C stable
tar xzf "$PRE_TGZ" -C pre
DIFF_OUTPUT=$(diff -ruN stable/package/dist/esm/ pre/package/dist/esm/)
DIFF_EXIT=$?
```
`rm -rf` before `mkdir` makes this safe to re-run in the same session. `diff` exits 1 when files differ and 0 when identical — capture that exit code directly rather than piping through `head` (which would always report exit 0 and hide the real result).

**Step 3: Only report if distribution actually changed**

```bash
if [ "$DIFF_EXIT" -eq 0 ]; then
  echo "DISTRIBUTION IDENTICAL — this is a hoisting problem, not a PF change."
elif [ "$DIFF_EXIT" -eq 1 ]; then
  echo "DISTRIBUTION CHANGED — this may be a real PF change worth reporting:"
  echo "$DIFF_OUTPUT" | head -20
else
  echo "DIFF FAILED (exit $DIFF_EXIT) — check both packages extracted correctly."
fi
```

If the distribution files differ between stable and prerelease (new CSS imports, changed module format), THEN it's a PF change worth reporting.

---

## Key rules

- **Three locations must stay consistent:** deps, nested overrides, AND top-level overrides — in BOTH `frontend/package.json` and root `package.json`. Version mismatch causes duplicate copies and CSS parse errors.
- **Always clean install when overrides change.** `rm -rf node_modules package-lock.json && npm install`.
- **Always verify hoisting after install.** Nested PF copies under `frontend/node_modules/` = broken build.
- **CSS parse errors are hoisting problems until proven otherwise.** Fix goes in `webpack.dev.js` include paths, NOT `webpack.common.js` exclude.
- **Sub-packages are deferred.** Only update `frontend/package.json` and root `package.json`.
- **Commit the webpack workaround on the RC branch** — it's inert on main (no nested copies with stable versions).
- **Commit both `pf-prerelease-report.md` and `.html`** on the RC branch alongside the workaround — see Phase 6.
