# Skill Overlays: Product-Specific Context

## What It Is

A skill overlay is a set of project-specific context that sits on top of the general-purpose `prototype-evaluate` skill. Instead of hard-coding product knowledge (Jira URLs, repo conventions, design system paths, MLflow, context git remotes) into the SKILL.md, we externalize it into a YAML config file.

## Why

The evaluator should work for any product team — not just one product. By extracting product-specific assumptions into `config/product-overlay.yaml`, a new team can adopt the skill by creating their own overlay file.

The checked-in overlay is a **template**. Filled-in URLs for a particular org (internal GitLab remotes, MLflow clusters, Pages destinations) belong in a gitignored local overlay or an internal config repo — not in this marketplace plugin.

## How to supply team-specific values

1. **Local overlay (gitignored):** copy `config/product-overlay.yaml` to `config/product-overlay.local.yaml` and fill in remotes / MLflow / Pages / Jira.
2. **Internal config repo:** keep the filled overlay there and point at it:
   ```bash
   export EVAL_OVERLAY_PATH=/path/to/internal-ai-helpers/overlays/product-overlay.yaml
   ```
   (`UXD_OVERLAY_PATH` is an alias.) See [CONTRIBUTING-SKILLS.md](../../../../../CONTRIBUTING-SKILLS.md) for where internal-only config belongs.
3. **Environment variables** still win when set:
   - `MLFLOW_TRACKING_URI`
   - `CONSISTENCY_CHECKER_REPO`
   - `USABILITY_TESTING_REPO`
   - `EVAL_PAGES_REPO` / `EVAL_PAGES_URL`
   - `JIRA_BASE_URL`

Load order for the YAML overlay: checked-in template → `product-overlay.local.yaml` → `EVAL_OVERLAY_PATH`.

Scripts read overlay values via `scripts/overlay-get.js`.

## What the Overlay Controls

| Section | What It Configures |
|---------|-------------------|
| `jira.instances` | Which Jira instance to use for each project key prefix |
| `jira.outcome_project` | Where to look for parent Outcomes |
| `jira.ticket_label` | Breadcrumb label for the evaluated issue (default `Ticket`) |
| `git.base_branch` | What branch to diff against for MR delta |
| `git.remote_url` | Prototype repo URL used when building MR/PR links |
| `git.mr_url_style` | `gitlab` (`/-/merge_requests/N`) or `github` (`/pull/N`) |
| `context_repos.consistency_checker` | Git URL for design-guideline bootstrap (empty = skip) |
| `context_repos.usability_testing` | Git URL for deep persona YAML bootstrap (empty = skip) |
| `mlflow.tracking_uri` | Optional tracking server (empty = skip unless env is set) |
| `publish.*` | Pages repo, Pages base URL, Jira base, hosted dashboard URL |
| `design_system` | PatternFly/consistency checker paths |
| `personas` | Persona + overlay catalog paths for usability scoring |
| `navigation` | Which files define sidebar nav and routes |
| `known_mrs` | Manual MR number mapping (until forge API is available) |

## Dynamic vs. Static

Currently overlays are static YAML files. This is fast (no generation latency) but can drift if conventions change.

Future options:
- Generate overlays via MCP server connected to product metadata
- Auto-detect conventions from the target codebase at eval time
- Periodically regenerate and commit (CI job)

For now: edit the YAML manually when conventions change. The file is small and changes rarely.

## Origin

Pattern from Carl Trieloff's data products ADLC team (Apr 2026). Their MCP server generates skill files from Snowflake metadata, providing product-specific context that eliminated inference errors and improved implementation quality. Our approach is simpler (static YAML) but follows the same principle: give the agent pre-computed context so it doesn't have to re-infer product structure every run.
