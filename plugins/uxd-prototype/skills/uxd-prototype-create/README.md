# uxd-prototype-create

Create or refine a runnable prototype from a Jira issue, Figma design, feature description, or idea. Build standalone HTML or work in an existing codebase, with journeys and scenarios for later evaluation.

## Codex quick start

Enable the available UXD prototype plugin in Codex, then open the project where you want to save the prototype. See [Codex setup](../../../../docs/codex-setup.md) if the skill is missing.

Select `$uxd-prototype-create` and describe what you need:

```text
$uxd-prototype-create Prototype PROJ-298 --workspace standalone
$uxd-prototype-create Build from this Figma design: https://figma.com/design/...
$uxd-prototype-create Prototype PROJ-298 --workspace /path/to/project --decisions human
```

The skill asks about the source, workspace, and design decisions, then presents a Prototype Plan for confirmation. While it builds, watch the local preview and Codex activity; steer it early if a page or component needs to follow PatternFly guidance.

## Common options

| Option | What it controls |
|--------|------------------|
| `--workspace <path-or-git-url-or-standalone>` | Codebase to build in; defaults to `standalone`. |
| `--workspace-branch <branch>` | Branch to clone for the workspace. |
| `--decisions skip\|auto\|human` | Skip a decision kit, let the agent recommend choices, or choose them yourself; defaults to `skip`. |
| `--depth under\|normal\|over` | Number of decisions when using `auto` or `human`; defaults to `normal`. |
| `--target <destination>` | Where a later PR/MR or deployment goes; does not select the build workspace. |
| `--pipeline` | Continue through evaluation, refinement, and publishing. |
| `--export` | Export journey steps; supply the running prototype with `--url <URL>`. |
| `--no-prototype-bar` | Omit the Prototype Bar, which is installed by default. |
| `--dry-run` | Skip Git and external writes; local artifacts are still written. |

[Usage and full options](SKILL.md#flags)

## Requirements and setup

| Requirement | When needed |
|-------------|-------------|
| Git | Building in an existing workspace or using a Git source/target. |
| Node.js ≥ 18 and npm | Running a Node-based prototype's dev server. |
| Python 3 | Bundled metadata and workspace helpers. |
| Authenticated Atlassian or Figma connection | Reading live Jira issues or Figma designs. You can provide requirements and screenshots instead. |

Standalone HTML generation needs no Node build tools. For an existing workspace, ask Codex to install its dependencies and start its documented dev server. Live Jira lookup needs an authenticated connection; the [Jira REST fallback](SKILL.md#step-1-fetch-rfe-source) is optional.

## Expected output

The prototype and supporting files are saved under `.artifacts/{ID}/` in your project. Standalone HTML goes in `prototype/`; workspace code goes in `code/`. The skill also writes journeys, scenarios, source snapshots, and a summary. Design-decision pages and exports are included when requested.

Open the prototype and review the planned journeys and alternate states before evaluation. See [output formats](references/output-formats.md) for the artifact contract.

## Related guides

- [Scenario planning](references/scenario-brainstorm.md) — define empty, error, and alternate states.
- [Pipeline mode](references/pipeline-mode.md) — orchestrate create → evaluate → refine → publish.
- [Prototype evaluation](../uxd-prototype-evaluate/README.md) — check acceptance criteria and usability.
- [Prototype export](../uxd-prototype-export/README.md) — capture pages and journey steps.
- [Prototype publishing](../uxd-prototype-publish/README.md) — share the finished prototype.
