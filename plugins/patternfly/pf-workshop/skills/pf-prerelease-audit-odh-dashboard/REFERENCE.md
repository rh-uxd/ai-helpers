# ODH Dashboard Prerelease Audit — Reference Material

Read this file when diagnosing Phase 5 failures or filling the Phase 6 report schema.

---

## Schema-filling notes (odh-dashboard-specific)

- `checks[]` — dev server build / type-check / lint / unit tests / cypress / visual smoke, each compared against the Phase 5.6 baseline (`git stash` + rerun on `main`) so pre-existing failures aren't mistaken for new regressions. **Report root-command and per-package-supplement results separately** (e.g. "type-check (root, 15 backend packages): pass" and "type-check (11 -frontend packages, supplemental): pass/fail per package") — collapsing them into one aggregate result hides exactly the coverage gap Phase 5.0 exists to catch. If any "-frontend" supplement was skipped for time, list it as `skip` with a reason, not silently omitted.
- `versions[]` — pull from the version map in Phase 1, annotated with the number of files each package was bumped in (see Phase 1.2 discovery) and whether it's a no-fallback module (`react-core`/`react-styles`) requiring the Phase 2.4 alignment check.
- `findings[]` — CSS parse failures that turn out to be npm hoisting/distribution-path artifacts (see "Diagnosing CSS parse failures" below) go under `build-tooling-artifact`, **not** `css-scss-break` — the whole point of that diagnosis procedure is to keep false positives out of the PF-facing findings. A genuine `react-core`/`react-styles` version misalignment across packages (Phase 2.4) is a real finding — category `runtime-failure` if it caused silent breakage, or a note under Recommendations if caught before install.
- `installNotes[]` — always include the Phase 3.1 nested-copy check outcome, the Phase 2.4 alignment check outcome (all bumped packages, not just the no-fallback ones), the Phase 2.3 exact-pin check outcome, and the Phase 3.3 third-party resolution-conflict check outcome, even when all are clean — these are the checks this architecture depends on, and a silent clean pass is meaningful signal, not a non-event to omit.
- `fixesApplied[]` — include the Phase 2.2C explicit root dependency additions, any third-party peer-dependency installs (Known Gotchas), any webpack CSS `include` array changes, and any `packages/observability/package.json` transitive dep additions — all are real (if inert-on-main) source changes made to unblock the bump.

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

## Known Gotchas (accumulated from prior runs)

These are patterns, not fixed checklist items — the specific third-party packages named below will change over time. Recognize the *shape* of the problem, not the specific package name.

### `--legacy-peer-deps` can silently drop a THIRD-PARTY package's own peer dependencies, not just PF's

Phase 2.2C addresses PF packages specifically, but `--legacy-peer-deps` disables peer-dep auto-install for **every** package in the tree, not just PatternFly ones. If a build or test fails with `Cannot find module 'X'` where `X` isn't a PF package, check whether `X` is a `peerDependency` of something already installed:

```bash
grep -rl "\"X\"" node_modules/*/package.json | xargs -I{} python3 -c "
import json,sys
d = json.load(open('{}'))
if 'X' in d.get('peerDependencies', {}):
    print('{}', 'peer-deps on X')
"
```

If confirmed, install it explicitly in the affected package (`npm install X@VERSION --legacy-peer-deps`), the same way Phase 2.2C does for PF packages. **Worked example (2026-08-19):** `mod-arch-shared` (used by `gen-ai`, `automl`, `autorag`) peer-deps on `mod-arch-kubeflow`, which silently failed to install and broke both unit tests (`Cannot find module 'mod-arch-kubeflow'` inside `ThemeAwareFormGroupWrapper.js`) and production builds identically. Fixed by installing `mod-arch-kubeflow` explicitly in all three affected apps. This specific package may not recur — the pattern will.

### Before editing a CSS include-path file, verify it's actually imported by anything

CSS parse/loader errors for a nested third-party package's bundled PF copy (e.g. `Module parse failed` or `no loaders configured` for a `.css` file inside `node_modules/some-package/node_modules/@patternfly/...`) look like they belong in a `stylePaths.js`-style file — several apps have one, listing exactly this kind of nested path. **Check first whether that file is actually imported by any webpack config before editing it:**

```bash
grep -rln "stylePaths" config/*.js
```

**Worked example (2026-08-19):** `packages/automl/frontend/config/stylePaths.js` and `packages/autorag/frontend/config/stylePaths.js` both exist and list nested PF paths, but neither is imported by `webpack.common.js`, `webpack.prod.js`, or `webpack.dev.js` in either project — dead code. The actual control point was the CSS rule's `include` array directly inside `webpack.prod.js`. Editing the unused file costs a full rebuild cycle to discover it did nothing; grep for the real usage first.

---

## Key rules

- **There is no top-level PF `overrides` block anymore.** Don't add one — it was removed by odh-dashboard#8660 in favor of `shared-modules-meta.ts`'s explicit sharing policy. Only the nested `@openshift/dynamic-plugin-sdk-utils` override still needs manual updates.
- **Version bumps apply to every discovered `package.json`, not just `frontend/` and root.** Re-discover the file list each run (Phase 1.2) — it changes as remotes are added.
- **`react-core` and `react-styles` have no fallback.** A version mismatch between the host and any single remote for these two packages specifically causes silent runtime breakage, not a build error. Verify alignment across every file (Phase 2.4) before installing, not after something looks broken.
- **Every other PF package tolerates mismatch via fallback.** Don't chase nested-copy "hoisting" findings for these as if they were bugs — that's the architecture working as intended.
- **Always clean install after version bumps, with `--legacy-peer-deps` from the start.** `rm -rf node_modules package-lock.json && npm install --legacy-peer-deps`. This is a default, not a fallback for one bad ERESOLVE — confirmed to affect multiple unrelated PF packages in the same run (Phase 3).
- **Add every bumped PF package as an explicit root `dependencies` entry, proactively, before installing (Phase 2.2C).** `--legacy-peer-deps` disables peer-dep auto-install, which 13+ packages rely on to get PF packages hoisted to the workspace root. Do this up front — discovering the gap via a Phase 5 build failure costs a full cycle.
- **Install every "-frontend" app's independent sub-project separately (Phase 3.2), every run, unconditionally.** Only the host lives in the root npm workspace; 10 remotes have their own lockfiles the root install never touches.
- **`--legacy-peer-deps` can drop non-PF peer dependencies too.** If something fails with `Cannot find module` for a package that isn't PatternFly, see Known Gotchas — the fix pattern (install it explicitly) is the same as for PF packages, just not automated since the specific package varies.
- **CSS parse errors: check version alignment and `shared-modules-meta.ts` coverage before assuming a build-tooling artifact.** Some apps have a `stylePaths.js`-style file, but verify it's actually imported by a webpack config before editing it — see Known Gotchas; it's sometimes dead code, and the real CSS `include` array lives directly in `webpack.prod.js`.
- **Commit any webpack config changes, explicit dependency additions, or `packages/observability/package.json` changes on the RC branch** if they were needed to unblock the bump — they're inert on main.
- **Commit both `pf-prerelease-report.md` and `.html`** on the RC branch alongside any fixes — see Phase 6.
- **Root-level `type-check`/`test-unit`/`test:cypress-ci`/`start:dev:ext` do not cover the whole monorepo.** They skip every "-frontend"-suffixed package (host + ~11 remotes) due to script-naming inconsistency (`test:type-check`/`test:unit` vs. the bare names turbo's root task expects) or, for Cypress, because the root script is hardcoded to the host only. Always run the Phase 5.1/5.2/5.4/5.5 per-package supplements — skipping them means the packages most likely to break from a PF bump were never actually tested.
- **Every bumped `package.json` entry must be an exact pin — no `^`/`~`.** Prerelease semver strings are excluded from ranges by design; a stray range operator silently breaks both npm resolution and Module Federation's `requiredVersion` matching (Phase 2.3).
- **Alignment for prerelease testing means exact string equality, not "same minor."** `6.6.0-prerelease.9` and `6.6.0-prerelease.10` are non-overlapping versions to semver — check every bumped package, not just react-core/react-styles, even though only the latter two are hard blockers (Phase 2.4).
- **Removing the top-level PF override reopened a class of npm ERESOLVE risk** for any third-party dependency (beyond `@openshift/dynamic-plugin-sdk-utils`) that ranges on a bumped PF package. Check for this after install (Phase 3.3) — don't assume the nested override is the only consumer that needed handling.
