# Release procedure reference

## Discover the implementation first

Read `lerna.json`, root/package manifests, the package-manager lockfile, repository instructions, `.github/promote.sh`, `.github/release.sh`, their workflows, and setup actions in the target checkout. Honor the installed Lerna version and its command semantics. If uncertain, consult documentation/source for that version before executing.

Known PatternFly React workflow shape (verify each time):

- Independent Lerna versions; charts and docs have different version lines from React core.
- `Promote` is manually dispatched and runs `.github/promote.sh` after installation/build.
- The normal `Release` workflow responds to branch pushes and publishes prereleases.
- `.github/promote.sh` is toggled between stable publishing and next-cycle versioning.
- `scripts/promote.sh` may only print npm dist-tag commands. Moving a dist-tag does not turn a prerelease version into a stable version.

Check concurrency and build ordering. Promotion may build without invoking the full CI suite. A workflow input can exist while the script block consuming it is commented out. A script without fail-fast handling can appear successful despite a failed command; inspect logs and registry evidence.

## Version policy and scope

An illustrative independent manifest:

| Package | Current | Intended stable | Next cycle, if preminor is approved |
| --- | --- | --- | --- |
| `@patternfly/react-core` | `6.7.0-prerelease.7` | `6.7.0` | `6.8.0-prerelease.0` |
| `@patternfly/react-charts` | `8.7.0-prerelease.4` | `8.7.0` | `8.8.0-prerelease.0` |
| `@patternfly/react-docs` | `7.7.0-prerelease.8` | `7.7.0` | `7.8.0-prerelease.0` |
| `eslint-plugin-patternfly-react` | `6.6.0-prerelease.0` | Confirm inclusion; potentially `6.6.0` | Potentially `6.7.0-prerelease.0` |

This table is an example, never a current release manifest. Inspect every workspace, including nested workspaces, and distinguish private packages. Ask about unexpected public packages instead of silently publishing or omitting them.

Bare `--conventional-graduate` includes eligible prerelease packages even without changes. A scoped graduation list is not a general publishing allowlist; changed stable packages and dependent packages can still enter the version/publish set. Preview and approve the entire set. If inclusion cannot be enforced with the existing machinery, stop and propose a reviewed tooling change.

## Stable CSS before building

Identify all consumers of `@patternfly/patternfly`, including docs dependencies and component generation/build devDependencies. Verify the desired stable CSS version exists in the registry; do not infer it from the React release number.

Update those manifests using the repository's range policy and regenerate its lockfile with the declared package manager. Review unrelated lockfile churn. This belongs before immutable installation and the build, not in a post-build promotion step. Passing a workflow input is not a substitute for checking that it is effective.

## Stable promotion and local preview

For the known Lerna workflow, the stable publishing command is:

```bash
yarn run lerna publish --conventional-commits --conventional-graduate --no-private --dist-tag=latest --yes
```

Keep next-cycle versioning disabled during stable promotion. The explicit dist-tag is important when package manifests default to a prerelease tag; confirm precedence with the installed Lerna version. The noninteractive `--yes` flag is appropriate only after approval of the reviewed manifest, not as a replacement for approval.

In a fresh disposable clone containing the preparation changes, preview using:

```bash
yarn run lerna version --conventional-commits --conventional-graduate --no-private --yes --no-git-tag-version --no-push
```

This command modifies local versions and changelogs. It is not a read-only dry run, and it does not validate npm authentication or publication. Do not reuse the mutated checkout to execute the stable workflow. Keep scratch files outside the user's working tree, explain why the separate directory is needed, and only remove scratch files created for this task.

Before dispatch, verify upstream, credentials availability without reading secrets, branch/SHA, script contents, CI results, registry/tag collisions, and absence of competing workflows. Do not trigger a known unsafe or unvalidated workflow and rely on cancellation as a safety mechanism.

## Publication evidence and recovery

Query registry version and dist-tag metadata for every approved package. An example for one package:

```bash
npm view @patternfly/react-core@6.7.0 version gitHead --json
npm view @patternfly/react-core dist-tags --json
```

Use verified package tag targets to locate the stable versioning commit:

```bash
git rev-parse '@patternfly/react-core@6.7.0^{commit}'
git show --no-patch --format=fuller '@patternfly/react-core@6.7.0^{commit}'
```

These are example identifiers; substitute only values from the approved manifest. Inspect remote tags in a fresh clone and corroborate package tags against the versioning commit and registry metadata. `gitHead` may be absent; report missing evidence and require sufficient alternative provenance before releasing.

If all versions, dist-tags, and provenance already match, publishing is a no-op. If only some versions exist, stop: rerunning graduation can calculate unintended versions or attempt to republish immutable versions. Prepare a missing/published inventory and investigate the failure. A separately approved recovery may use Lerna `publish from-package` from the verified, correctly built stable source; first confirm its exact publish scope and dist-tag behavior for the installed version. Do not automatically run it, retag packages, or change existing versions.

## GitHub release

Follow the repository's existing aggregate tag convention (for example, lowercase `v6.7.0`). The tag must target the stable versioning commit, not the pre-promotion SHA or a later next-cycle commit. Compare an existing tag/release first; never move it silently.

Select the prior aggregate release deliberately for generated notes. Include independently versioned packages and review the notes before approval to publish. Creating a GitHub release does not publish npm packages. Inspect workflows triggered by tags/releases before creating one.

## Next development cycle

After stable verification, the known version-only command is:

```bash
yarn run lerna version preminor --force-publish --conventional-commits --no-private --yes --preid prerelease
```

This forces selection of public packages, not synchronization of independent versions. Confirm that all selected packages should advance, including any not published during the stable phase. Disable the stable publishing command before enabling this command.

The command can commit, tag, and push; it does not itself publish npm packages. A resulting push may trigger the normal prerelease workflow, depending on commit skip markers and workflow configuration. Do not assume either outcome. Coordinate those workflows, preview next versions in isolation, check all remote and registry collisions, and obtain approval for this phase separately.
