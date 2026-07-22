# uxd-prototype-publish

Publish a completed prototype to a target destination — push as a merge request, or deploy via GitHub Pages, GitLab Pages, or Vercel.

## When to Use

After creating and evaluating a prototype with `uxd-prototype-create` and `uxd-prototype-evaluate`, use this skill to share the result.

## Publish Targets

| Target | What happens | Best for |
|--------|-------------|----------|
| `repo` | Push to git branch, create GitLab MR (fork-aware `glab`) | Team review, design feedback |
| git URL | Same as `repo`, MR/PR opened **against** that repo (sets `upstream`) | Fork → canonical MR demos |
| `github` | Sanitize + deploy to GitHub Pages | Stakeholder demos, external sharing |
| `gitlab` | Sanitize + deploy to GitLab Pages | Self-hosted or gitlab.com sharing |
| `vercel` | Sanitize + deploy to Vercel | Preview deployments, Vercel-based projects |

## Eval gate

Reads `.artifacts/{ID}/eval/evaluation-report.csv`. Blocks publish when any AC verdict is `FAIL` unless `--force`. `FLAGGED` items warn but do not block by default.

## Inputs

| Input | Description | Required |
|-------|-------------|----------|
| Prototype ID | `.artifacts/{ID}/` directory with prototype output | Yes |
| `metadata.json` | Prototype state and configuration | Yes |
| Eval report | `.artifacts/{ID}/eval/evaluation-report.csv` from `uxd-prototype-evaluate` | Recommended |
| Workspace analysis | Clone path and branch info (workspace mode, repo target) | Conditional |
| Changeset manifest | Modified files list (workspace mode) | Conditional |

## Outputs

| Output | Description |
|--------|-------------|
| Published prototype | MR in GitLab, GitHub Pages site, GitLab Pages site, or Vercel deployment |
| Updated `metadata.json` | Submission record with target, date, URL |
| Jira comment + labels | Link to prototype / Pages preview, eval summary (optional) |

## Scripts

| Script | Purpose |
|--------|---------|
| `scripts/publish-github-pages.sh` | Sanitize and deploy to GitHub Pages |
| `scripts/publish-gitlab-pages.sh` | Sanitize and deploy to GitLab Pages |
| `scripts/publish-vercel.sh` | Sanitize and deploy to Vercel |
| `scripts/frontmatter.py` | YAML frontmatter read/write utility |

Repo MR creation: `uxd-prototype-create/scripts/submit_to_repo.py` (fork detection, `glab mr create`, MR verification, optional Pages polling). See `references/repo-submit-details.md`.

## Sensitive File Handling

The `github`, `gitlab`, and `vercel` targets strip internal files before publishing — agent configs, design history, credentials, CI pipelines, and MCP configurations. See `references/sensitive-files.md`.
