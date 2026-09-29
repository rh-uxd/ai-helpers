# Skill Overlays: Product-Specific Context

## What It Is

A skill overlay is a set of project-specific context that sits on top of the general-purpose `prototype-evaluate` skill. Instead of hard-coding product knowledge (Jira URLs, repo conventions, design system paths, MLflow, context git remotes) into the SKILL.md, we externalize it into a YAML config file.

## Why

The evaluator should work for any product team — not just one product. The checked-in overlay is a **template** (`example.com` / empty). Filled-in org URLs belong elsewhere.

## Where UXD/RHOAI values live

Red Hat internal remotes, MLflow, Jira, Pages URLs, and persona research citations ship in the VPN-only repo:

[gitlab.cee.redhat.com/uxd/internal-ai-helpers](https://gitlab.cee.redhat.com/uxd/internal-ai-helpers) → plugin `uxd-eval-config` → `overlays/uxd-prototype-evaluate.yaml` and `knowledge/personas/`

The public skill loads that file automatically when it can see the clone or plugin install. You do not copy it into this repo.

Persona **research citations** (Google Docs / study URLs) live in the same plugin at `knowledge/personas/<id>.md`. Resolve them with:

```bash
node scripts/overlay-get.js --knowledge-personas-dir
node scripts/overlay-get.js --knowledge-persona ml-engineer
```

Public persona cards stay product-agnostic (Who / When to use only). Skip silently if those commands print nothing.

## How values are resolved

Load order (later wins):

1. `config/product-overlay.yaml` — generic template in this skill
2. `config/product-overlay.local.yaml` — gitignored, optional personal override
3. Auto-discovered `internal-ai-helpers` overlay (see below)
4. `EVAL_OVERLAY_PATH` or `UXD_OVERLAY_PATH` — explicit path, always wins

Auto-discovery checks:

- `UXD_INTERNAL_HELPERS` (path to the internal-ai-helpers clone)
- Parent dirs named `internal-ai-helpers` or `uxd/internal-ai-helpers`
- Claude / Cursor plugin caches for `overlays/uxd-prototype-evaluate.yaml`

Environment variables still override individual keys when the scripts read them first:

- `MLFLOW_TRACKING_URI`
- `CONSISTENCY_CHECKER_REPO`
- `USABILITY_TESTING_REPO`
- `EVAL_PAGES_REPO` / `EVAL_PAGES_URL`
- `JIRA_BASE_URL`

Scripts read overlay YAML via `scripts/overlay-get.js`.

## Forced path (if discovery misses)

```bash
export UXD_INTERNAL_HELPERS="$HOME/code/uxd/internal-ai-helpers"
# or
export EVAL_OVERLAY_PATH="$UXD_INTERNAL_HELPERS/plugins/uxd-eval-config/overlays/uxd-prototype-evaluate.yaml"
```

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

Persona **Sources** are not overlay YAML. They are markdown files next to the overlay, discovered via `--knowledge-personas-dir`.

## Origin

Pattern from Carl Trieloff's data products ADLC team (Apr 2026). Their MCP server generates skill files from Snowflake metadata. Ours is static YAML with the same idea: give the agent pre-computed product context so it does not re-infer it every run.
