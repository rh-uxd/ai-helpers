---
name: uxd-prototype-publish
version: 0.1.0
description: >-
  Publish a prototype to a git merge request, GitHub Pages, GitLab Pages, or
  Vercel. Use when sharing a finished prototype for review, deploying a
  sanitized public copy, or updating Jira with submission links.
---

# Publish Prototype

Shares a completed prototype: merge request for team review, or a sanitized Pages/Vercel deploy for stakeholders. Updates the source Jira ticket with the link, eval summary, and labels when Jira is available.

Family: `uxd-prototype-create` → `uxd-prototype-evaluate` → **publish**.

## Inputs

| Input | Source | Required |
|-------|--------|----------|
| Prototype files | `.artifacts/{ID}/prototype/` or workspace files | **Yes** |
| `metadata.json` | `.artifacts/{ID}/metadata.json` | **Yes** |
| Changeset | `.artifacts/{ID}/changeset.md` | Yes (workspace mode) |
| Workspace analysis | `.artifacts/{ID}/workspace-analysis.json` | Yes (repo target, workspace mode) |
| Eval report | `.artifacts/{ID}/eval/evaluation-report.csv` | Recommended |
| Pages base URL | `--pages-base-url` or product config | Optional (repo target) |

If `{ID}` is missing or artifacts are incomplete, **stop** and list what is missing.

## Outputs

| Output | Description |
|--------|-------------|
| Published prototype | GitLab MR, GitHub Pages, GitLab Pages, or Vercel URL |
| Updated `metadata.json` | `status: submitted` plus submission target/date/url |
| Jira comment + labels | Preview/MR links and eval summary (unless `--skip-jira`) |

## Flags

$ARGUMENTS

Parse as: `<ID> [--target repo|github|gitlab|vercel|<git-url>] …`

| Flag | Values | Default | Description |
|------|--------|---------|-------------|
| `--target` | `repo`, `github`, `gitlab`, `vercel`, or a git URL | `github` | Where to publish. A git URL means open an MR/PR against that repo (implies `repo`) |
| `--target-branch` | branch name | from `workspace-analysis.json` | MR/PR base (repo target) |
| `--remote` | Git URL | workspace origin | Push remote override only — not the MR base |
| `--repo` | `owner/repo` or GitHub URL | — | GitHub repo for `github` target |
| `--pages-base-url` | URL | — | GitLab Pages base for MR preview polling |
| `--pages-timeout` | seconds | `600` | Pages poll timeout |
| `--dry-run` | flag | Off | Preview without external writes |
| `--skip-jira` | flag | Off | Skip Jira comment and labels |
| `--force` | flag | Off | Submit even if eval has FAIL verdicts |
| `--no-ssl-verify` | flag | Off | Skip SSL for git push (self-signed certs) |

## Conversational Guidance

If the user says "share", "publish", "deploy", "submit", or "I'm done" without a target, ask:

> Your prototype is ready to share. Where should it go?
>
> - **Create a merge request** — I'll push to the repo so your team can review and comment. You can also paste a git URL to open the MR/PR against that repo.
> - **Publish to GitHub** — I'll deploy a sanitized version to GitHub Pages with a shareable URL.
> - **Deploy to GitLab** — I'll deploy a sanitized version to GitLab Pages (self-hosted or gitlab.com).
> - **Deploy to Vercel** — I'll deploy a sanitized version to Vercel with a preview URL.

---

## Step 1: Validate the Prototype

**Workspace mode** (`workspace-analysis.json` present): workspace path accessible, `changeset.md` lists at least one file, `metadata.json` has required fields.

**Standalone mode** (`.artifacts/{ID}/prototype/` present): `index.html` (or at least one HTML file) and `metadata.json`.

If validation fails: "Prototype `{ID}` is incomplete. Missing: [list]. Fix before publishing."

## Step 2: Check Eval Results

Read `.artifacts/{ID}/eval/evaluation-report.csv` if it exists.

- **Pass** — zero `FAIL` in Section 1 → label `rubric-pass` (or `eval-pass`)
- **Needs attention** — one or more `FAIL` → label `needs-attention`
- **FLAGGED only** — warn; do not block unless the user wants a clean report
- **No eval** — warn; recommend `uxd-prototype-evaluate {ID} <URL>`. Proceed in `--dry-run` or `--force`.

Unless `--force`, **block submission when any AC verdict is FAIL**.

Legacy fallback: `.artifacts/{ID}/reviews/summary.md` if no CSV; prefer a fresh Playwright eval.

## Step 2a: Static Eval path for Prototype Bar

**Required** for `repo`, `github`, `gitlab`, and `vercel` when an eval report exists. Copy the report into `public/` so **Eval** works on the hosted preview (no export-helper):

```bash
EXPORT_SKILL="${CLAUDE_SKILL_DIR}/../uxd-prototype-export"
WORKSPACE=".artifacts/{ID}/code"   # or workspace path from workspace-analysis.json

bash "${EXPORT_SKILL}/scripts/install-prototype-bar.sh" \
  --artifacts ".artifacts/{ID}" \
  --source "$WORKSPACE" \
  --mode workspace
```

Copy-only alternative: `copy-eval-for-pages.sh --artifacts .artifacts/{ID} --pages-root "$WORKSPACE/public"`.

```
public/
  evals/{ID}/index.html      ← copy of .artifacts/{ID}/eval/evaluation-report.html
  uxd-prototype-bar/         ← bar runtime
```

`submit_to_repo.py` auto-stages `public/evals/{ID}/` and `public/uxd-prototype-bar/` even if they are missing from `changeset.md`. Still run this step so the files exist on disk.

**Do not delete `public/` during sanitize** — only strip internal metadata. See [references/sensitive-files.md](references/sensitive-files.md).

## Step 2b: Audit CI/CD Configs for Secrets

Scan `.gitlab-ci.yml`, `.github/workflows/*`, `Jenkinsfile`, `.circleci/config.yml`, `Dockerfile`, `docker-compose*.yml` for hardcoded tokens, internal registries, inline keys, and secret-like `variables:` (vs `$CI_*` / `${{ secrets.* }}`).

- **`github` / `gitlab` / `vercel`:** publish scripts replace CI with clean templates. Still warn — secrets may exist elsewhere in the repo.
- **`repo`:** CI is pushed as-is. Flag hardcoded secrets; do not block the MR.

---

## Step 3: Publish to Target

### Target: repo (or a git URL)

Push and create a GitLab merge request. A git-URL `--target` normalizes to `repo` and is the MR/PR base (`upstream`). Read `target_repo_url` / `upstream_url` from `pipeline-config.yaml` or `workspace-analysis.json` when present.

**Workspace mode** — `submit_to_repo.py` (fork-aware `glab mr create`):

```bash
python3 "${CLAUDE_SKILL_DIR}/scripts/submit_to_repo.py" \
  --rfe-key {ID} --title "{title}" \
  [--upstream "{TARGET_REPO_URL}"] \
  [--target-branch "{TARGET_BRANCH}"] \
  [--pages-base-url {url}] [--pages-timeout 600] \
  [--jira-comment-id {id}] \
  [--no-ssl-verify] [--dry-run]
```

Requires authenticated `glab`. Details: [references/repo-submit-details.md](references/repo-submit-details.md). Git push needs `required_permissions: ["all"]` in Cursor.

**Standalone mode:** `git init` in `.artifacts/{ID}/prototype`, commit, add remote, push.

### Targets: github, gitlab, vercel (sanitized deploys)

These three share the same flow: stage a copy, **strip sensitive files** ([references/sensitive-files.md](references/sensitive-files.md)), replace CI with a clean template, deploy.

**GitHub**

1. Confirm or create a repo: `gh repo create <repo-name> --public --description "UX Prototype — {title}"`
2. Run:

```bash
bash "${CLAUDE_SKILL_DIR}/scripts/publish-github-pages.sh" \
  --repo "<owner/repo>" \
  --source "<path-to-prototype>"
```

3. Enable Pages: `gh api repos/<owner>/<repo>/pages -X POST -f build_type=workflow`
4. URL: `https://<owner>.github.io/<repo-name>/`

**GitLab** (gitlab.com or self-hosted; same sanitization)

1. Ask for `namespace/project` or a full self-hosted URL. The script can create the project (`GITLAB_TOKEN` with `api` scope).
2. Run:

```bash
bash "${CLAUDE_SKILL_DIR}/scripts/publish-gitlab-pages.sh" \
  --project "<namespace/project>" \
  --source "<path-to-prototype>" \
  [--gitlab-url "<https://gitlab.example.com>"] \
  [--no-ssl-verify]
```

3. gitlab.com URL: `https://<namespace>.gitlab.io/<project>/`. Self-hosted: instance Pages domain (or `pages_url` from the GitLab API).

**Vercel**

1. Confirm existing project name or a fresh deploy.
2. Run:

```bash
bash "${CLAUDE_SKILL_DIR}/scripts/publish-vercel.sh" \
  --source "<path-to-prototype>" \
  [--project-name "<vercel-project-name>"]
```

3. URL: `https://<project-name>.vercel.app`

---

## Step 4: Update Jira (Optional)

If Jira is available and `--skip-jira` is not set:

1. Comment with published location, AC summary (`PASS`/`FAIL`/`FLAGGED` from the CSV), and refinement count. Prefer wiki-markup: `[Preview|https://…]`, `[Merge request|https://…]`.
2. Include `pages_url` from `submit_to_repo.py` when present (`--jira-comment-id` to update).
3. Labels: `uxd-prototype-created` plus `rubric-pass` / `needs-attention` from Step 2.

Uses Atlassian MCP if available; otherwise skip silently.

## Step 5: Update Metadata

Set `.artifacts/{ID}/metadata.json` `status` to `submitted` with `submission.target`, `date`, and `url`. A git-URL `--target` stores `submission.target` as `"repo"`; the MR base lives in `workspace-analysis.json` as `upstream_url`.

```bash
python3 "${CLAUDE_SKILL_DIR}/../uxd-prototype-create/scripts/frontmatter.py" set ".artifacts/{ID}/rfe-snapshot.md" \
  status="submitted" updated_at="$(date -u +%Y-%m-%dT%H:%M:%SZ)"
```

## Step 6: Report

Print ID, target, eval FAIL count, labels, Jira status, MR/Pages URL, and warnings. `--dry-run`: show what would happen without external writes.

## Re-Publishing

Same workflow again. `github` / `gitlab` force-push; `vercel` redeploys; `repo` creates a new branch/MR.

## Guardrails

- **Do not publish an incomplete prototype.** List missing files and stop.
- **Do not publish AC FAILs** unless `--force`.
- **Strip sensitive files** on `github` / `gitlab` / `vercel` (AGENTS.md, `.env`, agent configs, credentials). See [references/sensitive-files.md](references/sensitive-files.md).
- **Keep `public/`** when sanitizing — Eval and the Prototype Bar live there.
- **Do not send data to remotes in `--dry-run`.**

## Edge Cases

| Scenario | Handling |
|----------|----------|
| No eval exists | Warn; recommend evaluate. Proceed with `--force`. |
| Eval has FAIL | Block unless `--force`. |
| Empty MR after push | `submit_to_repo.py` auto-recovers; report `verification.verified: false` if still failing. |
| No Jira key in metadata | Skip Jira; log a warning. |
| Already submitted | Proceed (new submission record). |
| `--dry-run` with missing deps | Succeeds — validates local state only. |
| Large prototype (5+ MB) | Warn before push. |

## Reference Docs

| Doc | When to load |
|-----|-------------|
| [sensitive-files.md](references/sensitive-files.md) | Sanitized github/gitlab/vercel deploys |
| [repo-submit-details.md](references/repo-submit-details.md) | Fork-aware GitLab MR submit |
