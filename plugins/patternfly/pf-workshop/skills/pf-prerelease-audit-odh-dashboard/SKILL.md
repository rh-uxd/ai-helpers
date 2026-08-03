---
name: pf-prerelease-audit-odh-dashboard
description: Audit PatternFly prerelease compatibility against odh-dashboard — npm overrides, webpack CSS hoisting fixes, full validation suite, and compatibility report. Use when testing a PF RC or prerelease build against odh-dashboard (opendatahub-io/odh-dashboard).
allowed-tools: Bash, Read, Edit, Write, AskUserQuestion
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

This happens quarterly before each PF minor release. The goal is to catch breaking changes early by running the dashboard against PF prerelease builds. The process touches only `frontend/package.json` and root `package.json` — sub-packages are NOT updated (they inherit via overrides).

---

## Phase 0: Connect to an OpenShift cluster

The dashboard dev server proxies API requests to a live OpenShift cluster. You must be logged in via `oc login` before starting the dev server, or all `/api/*` routes will return `ECONNREFUSED`.

Ask the user to log in to an available OpenShift cluster:

```bash
oc login <YOUR_CLUSTER_API_URL> --username <username> --password <password>
# Or use a token:
oc login <YOUR_CLUSTER_API_URL> --token <token>
```

Check your team's shared OpenShift cluster access channel for available cluster credentials.

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

**CRITICAL:** Must do a clean install when overrides change. Incremental `npm install` will NOT correctly resolve the new dependency tree.

```bash
rm -rf node_modules frontend/node_modules packages/*/node_modules package-lock.json
npm install
```

### 3.1 Verify install integrity

```bash
# Verify PF packages are installed (should show 15+ packages)
ls node_modules/@patternfly/ | wc -l

# Check for duplicate/nested PF copies (the hoisting trap)
find . -path "*/node_modules/@patternfly/react-core" -maxdepth 5 | grep -v ".cache"
```

If you see PF packages under `frontend/node_modules/@patternfly/`, that's the npm hoisting trap — see Phase 4.

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
find . -path "*/node_modules/@patternfly/*" -maxdepth 5 -type d | \
  grep -v "^./node_modules/" | grep -v ".cache" | sort
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

```bash
npm run start:dev:ext
```

Wait for webpack to compile. Must show 0 errors. Warnings are acceptable. If CSS parse errors appear, go back to Phase 4.

Stop the dev server after confirming 0 errors (or leave running for visual smoke test).

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
- PatternFly components render correctly (buttons, tables, modals)

---

## Phase 6: Report results

Produce a summary:

```markdown
## PF X.Y Prerelease RC Testing Results

Branch: `chore/pf-X-Y-rc-testing`
Date: YYYY-MM-DD

### Version map

| Package | Version |
|---------|---------|
| ... | ... |

### Test results

| Test | Result | Notes |
|------|--------|-------|
| webpack build | PASS/FAIL | Error count |
| type-check | X errors | Pre-existing vs new |
| lint | X errors | Pre-existing vs new |
| unit tests | X pass, Y fail | Pre-existing vs new |
| cypress | X pass, Y fail | Pre-existing vs new |
| visual smoke | PASS/FAIL | Notable issues |

### New issues (caused by PF bump)
- ...

### Pre-existing issues (same on main)
- ...

### Webpack workarounds applied
- [ ] Added `frontend/node_modules/@patternfly` to webpack.dev.js CSS include (hoisting fix)
- [ ] Added observability transitive deps
```

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
cd /tmp && mkdir pf-diff && cd pf-diff
npm pack @patternfly/PACKAGE@STABLE_VERSION
npm pack @patternfly/PACKAGE@PRERELEASE_VERSION
mkdir stable pre && tar xzf *STABLE*.tgz -C stable && tar xzf *PRE*.tgz -C pre
diff stable/package/dist/esm/ pre/package/dist/esm/ | head -20
```
If `.mjs`/`.js` files are identical → not a PF change, it's a hoisting issue.

**Step 3: Only report if distribution actually changed**

If the distribution files differ between stable and prerelease (new CSS imports, changed module format), THEN it's a PF change worth reporting.

---

## Key rules

- **Three locations must stay consistent:** deps, nested overrides, AND top-level overrides — in BOTH `frontend/package.json` and root `package.json`. Version mismatch causes duplicate copies and CSS parse errors.
- **Always clean install when overrides change.** `rm -rf node_modules package-lock.json && npm install`.
- **Always verify hoisting after install.** Nested PF copies under `frontend/node_modules/` = broken build.
- **CSS parse errors are hoisting problems until proven otherwise.** Fix goes in `webpack.dev.js` include paths, NOT `webpack.common.js` exclude.
- **Sub-packages are deferred.** Only update `frontend/package.json` and root `package.json`.
- **Commit the webpack workaround on the RC branch** — it's inert on main (no nested copies with stable versions).
