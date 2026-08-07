# Skill Overlays: Product-Specific Context

## What It Is

A skill overlay is a set of project-specific context that sits on top of the general-purpose `prototype-evaluate` skill. Instead of hard-coding product knowledge (Jira URLs, repo conventions, design system paths) into the SKILL.md, we externalize it into a YAML config file.

## Why

The evaluator should work for any product team — not just one product. By extracting product-specific assumptions into `config/product-overlay.yaml`, a new team can adopt the skill by creating their own overlay file.

98% of the skill is generic. The overlay provides the 2% that's different:
- Jira project key prefixes and instance URLs
- Git repo conventions (base branch, remote, MR patterns)
- Design system (PatternFly version, guideline paths)
- Persona selection defaults
- Navigation file conventions (where sidebar/routes/flags live)

## How to Create Your Own Overlay

1. Copy `config/product-overlay.yaml` to `config/product-overlay-<yourproduct>.yaml`
2. Update all values to match your product's conventions
3. Pass `--overlay=config/product-overlay-<yourproduct>.yaml` when running the eval (path relative to the eval skill root)

## What the Overlay Controls

| Section | What It Configures |
|---------|-------------------|
| `jira.instances` | Which Jira instance to use for each project key prefix |
| `jira.outcome_project` | Where to look for parent Outcomes |
| `git.base_branch` | What branch to diff against for MR delta |
| `git.remote_url` | Where to clone the prototype workspace from |
| `design_system` | PatternFly/consistency checker paths |
| `personas` | Persona + overlay catalog paths for usability scoring |
| `navigation` | Which files define sidebar nav and routes |
| `known_mrs` | Manual MR number mapping (until GitLab API is available) |

## Dynamic vs. Static

Currently overlays are static YAML files checked into the repo. This is fast (no generation latency) but can drift if conventions change.

Future options:
- Generate overlays via MCP server connected to product metadata
- Auto-detect conventions from the target codebase at eval time
- Periodically regenerate and commit (CI job)

For now: edit the YAML manually when conventions change. The file is small and changes rarely.

## Origin

Pattern from Carl Trieloff's data products ADLC team (Apr 2026). Their MCP server generates skill files from Snowflake metadata, providing product-specific context that eliminated inference errors and improved implementation quality. Our approach is simpler (static YAML) but follows the same principle: give the agent pre-computed context so it doesn't have to re-infer product structure every run.
