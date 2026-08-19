---
name: pf-prerelease-audit-odh-dashboard
description: Audit PatternFly prerelease compatibility against odh-dashboard — version bumps across ~25-30 workspace packages, shared-module-config verification (Module Federation), full validation suite, and compatibility report. Use when testing a PF RC or prerelease build against odh-dashboard (opendatahub-io/odh-dashboard).
argument-hint: "[JSON map of @patternfly/PACKAGE: VERSION pairs, or omit to paste the version map interactively]"
disable-model-invocation: true
---

# PatternFly Prerelease Audit — ODH Dashboard (RHOAI)

Bump `@patternfly/*` packages to prerelease versions across every workspace package that declares them, validate the build, and produce a compatibility report.

## Architecture (read this first)

odh-dashboard is a Module Federation monorepo: one host (`frontend/`) plus ~15 independently buildable remotes (`packages/*/frontend` or `packages/*`), each with its **own** `package.json` declaring its own `@patternfly/*` versions — there is no single master version file. As of [PF-6.5 rework (odh-dashboard#8660)](https://github.com/opendatahub-io/odh-dashboard/pull/8660), PF sharing across host and remotes is governed by `packages/app-config/src/webpack/shared-modules-meta.ts`, which declares a **policy** (not a version) per module:

- `singleton: true` (all PF modules) — Module Federation resolves to one running instance across host + every remote that shares it, not one instance per bundle.
- `allowFallback` — if `false` (only `react`, `react-dom`, `react-router*`, the SDK packages, `@patternfly/react-core`, `@patternfly/react-styles`), the remote sets `import: false` and bundles **no copy of its own** — it depends entirely on the host providing a compatible version, with no fallback if versions mismatch. Every other PF package defaults to `allowFallback: true`: a remote whose declared range the negotiated shared version doesn't satisfy just falls back to its own bundled copy instead of erroring.
- `eager` (host only) — whether the module loads synchronously in the host's initial bundle (`react`, `react-dom`, `react-core`, `react-styles`) vs. Module Federation's default async shared-module loading.

**Why this matters for prerelease testing:** the two `allowFallback: false` PF packages (`react-core`, `react-styles`) have no safety net — a version mismatch between the host and any remote for these specifically produces **silent runtime breakage**, not a build error (this is exactly what caused PF 6.5 to be reverted once already, per odh-dashboard#8213, before #8660's rework). Every other PF package tolerates mismatch via fallback (worst case: bundle bloat from a duplicated copy, not breakage). This skill must verify `react-core`/`react-styles` alignment across every package as a hard check, and can treat mismatches in fallback-tolerant packages as a lower-severity finding.

**Dependabot already handles patch-level PF bumps** (it only ignores `minor`/`major` `@patternfly/*` updates now) — this skill exists for **minor/major prerelease validation**, not patch-level churn Dependabot's CI already covers.

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

This happens quarterly before each PF minor/major release. The goal is to catch breaking changes early by running the dashboard against PF prerelease builds. **Version bumps apply to every workspace `package.json` that declares `@patternfly/*` deps — commonly 25-30 files** (host, root, every remote's `frontend/package.json` or `package.json`, and `distributions/*`), not just `frontend/package.json` and root. Phase 1 discovers the current list; don't assume it matches a prior run's count.

Requires Node `>=22.18.0` (the monorepo's `engines` floor).

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

### 1.2 Discover every package.json that declares PF deps

Don't assume the scope is just `frontend/package.json` and root — the monorepo has ~15 independently versioned remotes plus distributions. Discover the full list every run, since it changes as packages are added:

```bash
git grep -l '"@patternfly/' -- '*/package.json' 'package.json' 'frontend/package.json'
```

Cross-reference the version map against `packages/app-config/src/webpack/shared-modules-meta.ts`'s `sharedPluginModules` keys — that file is the authoritative list of PF packages the federation layer actually knows how to share. A package that's bumped everywhere but **not** in `shared-modules-meta.ts` won't get correct singleton/fallback behavior regardless of version alignment; flag this to the user rather than silently bumping it.

Show the user:

- Packages that will be updated, and in how many files each appears
- Packages from the version map that are NOT declared anywhere (skip these)
- Any `@patternfly/*` deps found in the repo that weren't in the version map (keep current version, but call out if they're in `shared-modules-meta.ts`'s no-fallback list — see Architecture section — since those need special attention if left un-bumped while others move)

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

### 2.2 Update every discovered `package.json`

There is no top-level `@patternfly/*` `overrides` block anymore (removed by odh-dashboard#8660's rework) — do not add one; it wouldn't be consumed by anything. Update two things instead, per file:

**A. Dependencies**

For every file discovered in Phase 1.2, update each `@patternfly/*` version in its `dependencies` block to the provided prerelease version — root, host `frontend/package.json`, every remote's `frontend/package.json` or `package.json`, and `distributions/*`.

**B. Nested overrides under `@openshift/dynamic-plugin-sdk-utils`**

This override block still exists in root `package.json` and `frontend/package.json` (it pins a third-party package's internal PF sub-deps, unrelated to Module Federation sharing). Update PF versions inside `overrides["@openshift/dynamic-plugin-sdk-utils"]` in both files to match the provided versions:
- `@patternfly/react-core`
- `@patternfly/react-icons`
- `@patternfly/react-styles`
- `@patternfly/react-table`

Do NOT add any other top-level PF override — that mechanism was removed in favor of the explicit `shared-modules-meta.ts` sharing policy (see Architecture section). If `npm install` produces duplicate PF copies, that's a real finding to investigate (Phase 4), not something to route around with an override.

### 2.3 Verify every bumped entry is an exact pin

Prerelease semver strings (`6.6.0-prerelease.9`) are excluded from `^`/`~` ranges by design — a range only matches a prerelease if the range itself is pinned to the identical `[major.minor.patch]` with a prerelease tag. This matters twice over: it breaks plain npm install resolution (Phase 3), and it breaks Module Federation's `shared` config, which reads each package's dependency string **verbatim** into `requiredVersion` (see `BaseOdhFederationPlugin.apply()`) — a stray `^`/`~` silently turns an intended exact-match requirement into a range that structurally can't match any prerelease build at all.

Check every file touched in 2.2A for a leftover range operator on a bumped package:

```bash
git grep -nE '"@patternfly/[a-z-]+": "[~^]' -- '*/package.json' 'package.json' 'frontend/package.json'
```

Any bumped package appearing in this output has a range prefix that needs to be stripped to the bare version string. This is an easy copy-paste mistake (e.g. carrying over the original `~6.5.1` formatting instead of replacing it wholesale) — verify it explicitly rather than assuming the edit was clean.

### 2.4 Verify version alignment across every bumped package

Module Federation's `shared` config matches on the **exact literal dependency string** (see 2.3) — for prerelease testing, "aligned" means every file declares the identical prerelease build string for a given package, not just "the same minor version" (unlike a stable bump, where compatible ranges tolerate more drift). Diff the resolved version of every bumped package across every file that declares it:

```bash
for pkg in $(python3 -c "import json,sys; print('\n'.join(json.load(sys.stdin).keys()))" <<< "$VERSION_MAP_JSON"); do
  echo "=== $pkg ==="
  git grep -h "\"$pkg\":" -- '*/package.json' 'package.json' 'frontend/package.json' | sort -u
done
```

(Substitute the actual version-map parsing for however Phase 1.1 captured `$ARGUMENTS` — the point is to iterate every bumped package, not just react-core/react-styles.)

Treat a mismatch differently depending on the module's `allowFallback` policy in `shared-modules-meta.ts`:
- **`allowFallback: false`** (`react-core`, `react-styles`) — a mismatch here is a hard blocker. Fix it before installing; don't defer to the build/test phase, since MF has no `strictVersion` set and won't fail loudly — it'll silently negotiate an incompatible version and produce the exact class of runtime breakage that got PF 6.5 reverted once already (see Architecture section).
- **`allowFallback: true`** (everything else) — a mismatch degrades gracefully to bundle duplication (a remote falls back to its own copy) rather than breakage. Still worth fixing for consistency and bundle size, but it's a lower-severity finding, not a blocker.

### 2.5 Check for monaco-editor peer dep changes

`@patternfly/chatbot` may require a newer `monaco-editor`:
```bash
npm view @patternfly/chatbot@CHATBOT_VERSION peerDependencies --json 2>/dev/null | grep monaco
```

If it requires a version newer than what's in `frontend/package.json`, bump `monaco-editor` too. Note: `monaco-editor` uses `0.x` versioning, so `^0.50.0` means `>=0.50.0 <0.51.0`, NOT `<1.0.0`.

---

## Phase 3: Clean install

**CRITICAL:** Must do a clean install after bumping versions across ~25-30 files. Incremental `npm install` will NOT reliably resolve the new dependency tree.

```bash
rm -rf node_modules frontend/node_modules packages/*/node_modules package-lock.json
npm install
```

### 3.1 Verify install integrity

```bash
PF_COUNT=$(ls node_modules/@patternfly/ 2>/dev/null | wc -l)
echo "PF packages installed: $PF_COUNT"
if [ "$PF_COUNT" -lt 15 ]; then
  echo "INTEGRITY FAILURE — expected 15+, found $PF_COUNT. Likely a partial/ENOTEMPTY install — see 3.3."
fi

# Check for duplicate/nested PF copies. Scan all @patternfly/* packages, not just
# react-core — the bumped package set varies per run based on the user-provided
# version map. A nested copy of a fallback-tolerant package (see Architecture
# section) is expected/benign; a nested copy of react-core or react-styles
# (allowFallback: false) is not and needs investigation.
# NOTE: evaluate the captured text, not the exit code — `grep -v` exits 1 (looks
# like "failure") on the CLEAN/good case where nothing survives the filter.
NESTED=$(find . -path "*/node_modules/@patternfly/*" -maxdepth 5 -type d | \
  grep -v "^./node_modules/" | grep -v ".cache")
if [ -n "$NESTED" ]; then
  echo "Nested PF copies found — check against shared-modules-meta.ts (Phase 4):"
  echo "$NESTED"
else
  echo "No nested PF copies of any @patternfly/* package found."
fi
```

If nested copies of `react-core` or `react-styles` are detected, go to Phase 4 before proceeding — this is the failure mode with no fallback safety net.

### 3.2 Check for third-party npm resolution conflicts

Removing the old top-level `overrides` block (Phase 2.2) fixed the Module Federation *sharing* problem, but it also removed the blanket workaround that used to force **any** npm dependency with a `^`/`~` range on a PF package onto the prerelease version regardless of what it asked for. The only remaining override (`@openshift/dynamic-plugin-sdk-utils`, Phase 2.2B) covers just that one third-party consumer — if some *other* dependency in the tree also ranges on a bumped PF package, npm has no override to fall back on anymore, and a prerelease version (excluded from `^`/`~` ranges by design) can't satisfy it.

Check the install output and the resolved tree for this:

```bash
npm install 2>&1 | grep -iE "ERESOLVE|could not resolve|conflicting" | grep -i patternfly
```

If nothing is flagged there, it's still worth spot-checking the resolved tree directly for any bumped package, since npm can install a duplicate silently rather than erroring depending on the conflict:

```bash
npm ls @patternfly/react-core 2>&1 | head -20
```

More than one distinct resolved version in this output (beyond an expected `deduped` pointer) means some other package is pinning a range the prerelease version can't satisfy. If you find one, that's an open question, not something to route around by reintroducing the old top-level override — note it in the report and flag whether the PF team needs to coordinate with that dependency's maintainer, or whether the dependency's range needs a documented exception here.

### 3.3 Handle npm ENOTEMPTY errors

npm can silently fail with ENOTEMPTY race conditions. If install output shows warnings or the package count is wrong, delete and reinstall:
```bash
rm -rf node_modules package-lock.json
npm install
```

---

## Phase 4: Verify shared-module config resolves as expected

odh-dashboard#8660 replaced implicit npm-hoisting-dependent PF sharing with explicit Module Federation `shared` config (see Architecture section) specifically to eliminate the class of bug this phase used to patch reactively (nested `node_modules/@patternfly` copies confusing webpack's CSS include path). That old failure mode should no longer occur for packages covered by `shared-modules-meta.ts` — if it does, treat it as a sign the shared-module policy itself needs attention, not as routine hoisting noise to patch around.

### 4.1 Check for nested PF copies (diagnostic, not an expected outcome)

```bash
# Evaluate the captured text, not the exit code — chained `grep -v` filters exit
# 1 (looks like "failure") on the clean case where nothing survives the filter.
NESTED=$(find . -path "*/node_modules/@patternfly/*" -maxdepth 5 -type d | \
  grep -v "^./node_modules/" | grep -v ".cache" | sort)
if [ -n "$NESTED" ]; then
  echo "Nested PF copies found — investigate before assuming this is benign:"
  echo "$NESTED"
else
  echo "No nested PF copies found (expected under the current architecture)."
fi
```

If nested copies appear for a module marked `allowFallback: true` in `shared-modules-meta.ts`, that's expected — it's the fallback copy working as designed, not a bug. If nested copies appear for `react-core` or `react-styles` (`allowFallback: false`), that's unexpected and worth investigating: either the version genuinely can't be shared (a real prerelease compatibility break) or `shared-modules-meta.ts` / `getRuntimeOdhPackages.ts` isn't picking up the package correctly.

### 4.2 If CSS parse errors occur

Some distributions (e.g. `distributions/core-bff/frontend/config/stylePaths.js`) maintain their own explicit PF CSS include paths, including nested-copy paths, independent of the shared-modules-meta.ts mechanism — check whether the failing package's distribution has a `stylePaths.js` and whether it needs a new path added for the prerelease version's actual resolved location. The main host (`frontend/`) does not use this pattern; a CSS parse error there is more likely a real distribution-format change in the prerelease package (see "Diagnosing CSS parse failures" below) than a path-include gap.

### 4.3 Handle observability transitive dependencies

The `@perses-dev` dependencies in `packages/observability` are fragile — they rely on implicit hoisting for transitive deps unrelated to `@patternfly/*` sharing.

If you see webpack errors about missing modules from `@perses-dev` packages, add the missing transitive deps to `packages/observability/package.json`.

---

## Phase 5: Build validation

Run each step. Record results for the report.

**Coverage warning — read before trusting any root-level command in this phase:** root `type-check`/`test-unit`/`test:cypress-ci`/`start:dev:ext` do **not** uniformly cover the monorepo. This is a pre-existing quirk of the repo's script naming, not something introduced by a PF bump, but it directly affects whether a "PASS" from these commands means anything for a given package:

- `type-check`/`test-unit` run via `turbo run type-check` / `turbo run test-unit`. Turborepo only invokes a task for a package that defines a script with that **exact literal name** — it does not alias `test:type-check` → `type-check`. Every "-frontend"-suffixed package (the host `frontend/` plus ~11 remotes: `agent-ops`, `automl`, `autorag`, `data-registry`, `eval-hub`, `gen-ai`, `maas`, `mlflow`, `model-registry/upstream/frontend`, `notebooks/upstream/workspaces/frontend`, `distributions/core-bff/frontend`) names these scripts `test:type-check` and `test:unit` instead — **turbo silently skips all of them.** The root command only actually exercises the non-"-frontend" backend/library-style packages (`feature-store`, `kserve`, `model-serving`, `observability`, `plugin-core`, `ui-core`, etc.).
- `test:cypress-ci` at root is **hardcoded** to `cd ./frontend && npm run test:cypress-ci` — it's not a turbo task at all, so it only ever tests the host, never the ~10 remotes that have their own `test:cypress-ci` script.
- `start:dev:ext` is only defined by 3 packages (`frontend/`, root, `model-registry`) — the other ~27 don't build via this command at all.

**This means the packages most likely to actually break from a PatternFly bump — the host UI and every UI remote — get zero type-check/unit-test/Cypress/dev-build coverage from the plain root commands.** Phases 5.2, 5.4, and 5.5 below are restructured to close this gap by supplementing the root command with direct per-package invocation. Don't skip the supplemental step to save time — it's the only thing actually validating PF-consuming UI code.

### 5.0 Determine actual coverage before trusting results

For each task, get Turborepo's own authoritative list of what it will run, and diff that against the Phase 1.2 discovery list (packages that actually declare `@patternfly/*` deps):

```bash
npx turbo run type-check --dry=json > /tmp/turbo-type-check.json
npx turbo run test-unit --dry=json > /tmp/turbo-test-unit.json
python3 -c "
import json
for f, label in [('/tmp/turbo-type-check.json','type-check'), ('/tmp/turbo-test-unit.json','test-unit')]:
    d = json.load(open(f))
    covered = {t['package'] for t in d.get('tasks', [])}
    print(f'{label} covers {len(covered)} packages:', sorted(covered))
"
```

(Field names in turbo's `--dry=json` output can shift between versions — if `t['package']` doesn't exist, inspect the JSON structure directly and adjust.) Cross-reference the covered set against the 30-ish PF-bump file list from Phase 1.2 — any PF-consuming package NOT in the covered set needs the Phase 5.2/5.4 supplemental step below, not just the root command.

### 5.1 Dev server build (MUST PASS for host; supplement for remotes)

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
- **"Failed to compile" / "ERROR in ..."** → FAIL. If the errors are CSS parse errors, go back to Phase 4 — check `shared-modules-meta.ts` alignment and any distribution-specific `stylePaths.js` before assuming it's a real PF break.

If you don't need the visual smoke test (5.7), stop the server once you have a result:
```bash
kill $DEV_SERVER_PID 2>/dev/null
```
Otherwise leave it running and proceed to the rest of Phase 5 — come back to kill it after 5.7.

**This only builds the host (+ `model-registry`).** The other ~27 remotes are never compiled by `start:dev:ext`. Supplement by running each "-frontend" remote's own `build` script (all 11 consistently define it as `run-s build:prod` → webpack/rspack production build):

```bash
for pkg in packages/agent-ops/frontend packages/automl/frontend packages/autorag/frontend \
           packages/data-registry/frontend packages/eval-hub/frontend packages/gen-ai/frontend \
           packages/maas/frontend packages/mlflow/frontend packages/model-registry/upstream/frontend \
           packages/notebooks/upstream/workspaces/frontend distributions/core-bff/frontend; do
  echo "=== $pkg ==="
  (cd "$pkg" && npm run build 2>&1 | tail -10; echo "EXIT:${PIPESTATUS[0]}")
done
```

This validates each remote's bundle actually compiles with the prerelease versions — it doesn't exercise the full federated runtime (that needs 5.7 or a real cluster), but it catches build-time breaks (missing exports, type errors surfacing at build) that a federation-level smoke test alone would miss.

### 5.2 Type checking

```bash
npm run type-check
```

**Per Phase 5.0, this skips every "-frontend" package.** Supplement:

```bash
for pkg in frontend packages/agent-ops/frontend packages/automl/frontend packages/autorag/frontend \
           packages/data-registry/frontend packages/eval-hub/frontend packages/gen-ai/frontend \
           packages/maas/frontend packages/mlflow/frontend packages/model-registry/upstream/frontend \
           packages/notebooks/upstream/workspaces/frontend distributions/core-bff/frontend; do
  echo "=== $pkg ==="
  (cd "$pkg" && npm run test:type-check 2>&1 | tail -10; echo "EXIT:${PIPESTATUS[0]}")
done
```

### 5.3 Linting

```bash
npm run lint
```

`lint` is the one script name that's actually consistent across every package (per Phase 5.0's coverage check) — no supplemental step needed here, except `packages/agent-ops/frontend` which has no `lint` script at all and is never linted by anything.

### 5.4 Unit tests

```bash
npm run test-unit
```

**Per Phase 5.0, this skips every "-frontend" package.** Supplement:

```bash
for pkg in frontend packages/agent-ops/frontend packages/automl/frontend packages/autorag/frontend \
           packages/data-registry/frontend packages/eval-hub/frontend packages/gen-ai/frontend \
           packages/maas/frontend packages/mlflow/frontend packages/model-registry/upstream/frontend \
           packages/notebooks/upstream/workspaces/frontend distributions/core-bff/frontend; do
  echo "=== $pkg ==="
  (cd "$pkg" && npm run test:unit 2>&1 | tail -10; echo "EXIT:${PIPESTATUS[0]}")
done
```

### 5.5 Cypress tests

```bash
npm run test:cypress-ci
```

**This root command is hardcoded to the host only** (`cd ./frontend && npm run test:cypress-ci` — not a turbo task, so Phase 5.0's turbo dry-run won't even show it). It never runs the ~10 remotes' own Cypress suites. Supplement, expecting these to be slower (each spins up its own mock Cypress server):

```bash
for pkg in packages/agent-ops/frontend packages/automl/frontend packages/autorag/frontend \
           packages/data-registry/frontend packages/eval-hub/frontend packages/gen-ai/frontend \
           packages/maas/frontend packages/mlflow/frontend packages/model-registry/upstream/frontend \
           packages/notebooks/upstream/workspaces/frontend distributions/core-bff/frontend; do
  echo "=== $pkg ==="
  (cd "$pkg" && npm run test:cypress-ci 2>&1 | tail -15; echo "EXIT:${PIPESTATUS[0]}")
done
```

If time-constrained, prioritize the remotes whose PF-consuming code is most affected by this prerelease's changes over running all 11 exhaustively — but note in the report which remotes were skipped rather than silently omitting them (per the shared schema's "no silent caps" principle).

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

- `checks[]` — dev server build / type-check / lint / unit tests / cypress / visual smoke, each compared against the Phase 5.6 baseline (`git stash` + rerun on `main`) so pre-existing failures aren't mistaken for new regressions. **Report root-command and per-package-supplement results separately** (e.g. "type-check (root, 15 backend packages): pass" and "type-check (11 -frontend packages, supplemental): pass/fail per package") — collapsing them into one aggregate result hides exactly the coverage gap Phase 5.0 exists to catch. If any "-frontend" supplement was skipped for time, list it as `skip` with a reason, not silently omitted.
- `versions[]` — pull from the version map in Phase 1, annotated with the number of files each package was bumped in (see Phase 1.2 discovery) and whether it's a no-fallback module (`react-core`/`react-styles`) requiring the Phase 2.4 alignment check.
- `findings[]` — CSS parse failures that turn out to be npm hoisting/distribution-path artifacts (see "Diagnosing CSS parse failures" below) go under `build-tooling-artifact`, **not** `css-scss-break` — the whole point of that diagnosis procedure is to keep false positives out of the PF-facing findings. A genuine `react-core`/`react-styles` version misalignment across packages (Phase 2.4) is a real finding — category `runtime-failure` if it caused silent breakage, or a note under Recommendations if caught before install.
- `installNotes[]` — always include the Phase 3.1 nested-copy check outcome, the Phase 2.4 alignment check outcome (all bumped packages, not just the no-fallback ones), the Phase 2.3 exact-pin check outcome, and the Phase 3.2 third-party resolution-conflict check outcome, even when all are clean — these are the checks this architecture depends on, and a silent clean pass is meaningful signal, not a non-event to omit.
- `fixesApplied[]` — include any `distributions/*/frontend/config/stylePaths.js` changes and any `packages/observability/package.json` transitive dep additions, since these are real (if inert-on-main) source changes made to unblock the bump.

---

## Diagnosing CSS parse failures

This is the most common issue during prerelease testing. Do NOT report to PF team without verifying.

**Step 1: Check whether this is a version-alignment problem first**

If the failing package is `react-core` or `react-styles`, re-run the Phase 2.4 alignment check — a mismatch there is the most likely cause and has no fallback to mask it.

**Step 2: Check for nested copies**
```bash
find . -path "*/node_modules/@patternfly/FAILING_PACKAGE" -maxdepth 5
```
If found under a remote's `node_modules/`, check whether that package is `allowFallback: true` in `shared-modules-meta.ts` — if so, this nested copy is the fallback working as designed, not a bug, and the CSS parse error likely has a different cause (check the distribution's `stylePaths.js` per Phase 4.2). If the package is `allowFallback: false`, this nested copy IS the problem — it means the shared singleton negotiation failed, which points back to Step 1.

**Step 3: Compare distribution format** (only if Steps 1-2 didn't explain it)
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

**Step 4: Only report if distribution actually changed**

```bash
if [ "$DIFF_EXIT" -eq 0 ]; then
  echo "DISTRIBUTION IDENTICAL — this is a build-tooling artifact, not a PF change."
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

- **There is no top-level PF `overrides` block anymore.** Don't add one — it was removed by odh-dashboard#8660 in favor of `shared-modules-meta.ts`'s explicit sharing policy. Only the nested `@openshift/dynamic-plugin-sdk-utils` override still needs manual updates.
- **Version bumps apply to every discovered `package.json`, not just `frontend/` and root.** Re-discover the file list each run (Phase 1.2) — it changes as remotes are added.
- **`react-core` and `react-styles` have no fallback.** A version mismatch between the host and any single remote for these two packages specifically causes silent runtime breakage, not a build error. Verify alignment across every file (Phase 2.4) before installing, not after something looks broken.
- **Every other PF package tolerates mismatch via fallback.** Don't chase nested-copy "hoisting" findings for these as if they were bugs — that's the architecture working as intended.
- **Always clean install after version bumps.** `rm -rf node_modules package-lock.json && npm install`.
- **CSS parse errors: check version alignment and `shared-modules-meta.ts` coverage before assuming a build-tooling artifact.** Some distributions have their own `stylePaths.js`; the main host does not.
- **Commit any `stylePaths.js` or `packages/observability/package.json` changes on the RC branch** if they were needed to unblock the bump — they're inert on main.
- **Commit both `pf-prerelease-report.md` and `.html`** on the RC branch alongside any fixes — see Phase 6.
- **Root-level `type-check`/`test-unit`/`test:cypress-ci`/`start:dev:ext` do not cover the whole monorepo.** They skip every "-frontend"-suffixed package (host + ~11 remotes) due to script-naming inconsistency (`test:type-check`/`test:unit` vs. the bare names turbo's root task expects) or, for Cypress, because the root script is hardcoded to the host only. Always run the Phase 5.1/5.2/5.4/5.5 per-package supplements — skipping them means the packages most likely to break from a PF bump were never actually tested.
- **Every bumped `package.json` entry must be an exact pin — no `^`/`~`.** Prerelease semver strings are excluded from ranges by design; a stray range operator silently breaks both npm resolution and Module Federation's `requiredVersion` matching (Phase 2.3).
- **Alignment for prerelease testing means exact string equality, not "same minor."** `6.6.0-prerelease.9` and `6.6.0-prerelease.10` are non-overlapping versions to semver — check every bumped package, not just react-core/react-styles, even though only the latter two are hard blockers (Phase 2.4).
- **Removing the top-level PF override reopened a class of npm ERESOLVE risk** for any third-party dependency (beyond `@openshift/dynamic-plugin-sdk-utils`) that ranges on a bumped PF package. Check for this after install (Phase 3.2) — don't assume the nested override is the only consumer that needed handling.
