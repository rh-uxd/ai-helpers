---
name: uxd-prototype-publish
description: >-
  Publish a prototype to a git merge request, GitHub Pages, GitLab Pages, or
  Vercel. Use when sharing a finished prototype for review, deploying a
  sanitized public copy, or updating Jira with submission links.
---

# Publish Prototype

Publishes a completed prototype so others can see it. Supports four publishing targets:

- **Repo** — Push prototype code to a git branch and create a GitLab merge request. Best for team review.
- **GitHub** — Deploy a sanitized copy to a GitHub repo with GitHub Pages. Strips all internal/sensitive files. Best for stakeholder or external sharing.
- **GitLab** — Deploy a sanitized copy to a GitLab instance with GitLab Pages. Supports both self-hosted (behind VPN) and gitlab.com. Same sanitization as github.
- **Vercel** — Deploy a sanitized copy to Vercel. Same sensitive-file stripping as github. Best for preview deployments and projects using Vercel.

Also updates the source Jira ticket with a link, eval summary (AC FAIL count / Pages preview), and status labels.

## Conversational Guidance

If the user says "share", "publish", "deploy", "submit", or "I'm done" without specifying a target, ask:

> Your prototype is ready to share. Where should it go?
>
> - **Create a merge request** — I'll push to the repo so your team can review and comment. You can also paste a git URL to open the MR/PR against that repo.
> - **Publish to GitHub** — I'll deploy a sanitized version to GitHub Pages with a shareable URL.
> - **Deploy to GitLab** — I'll deploy a sanitized version to GitLab Pages (self-hosted or gitlab.com).
> - **Deploy to Vercel** — I'll deploy a sanitized version to Vercel with a preview URL.

## Inputs

| Input | Source | Required |
|-------|--------|----------|
| Prototype files | `.artifacts/{ID}/prototype/` or workspace files | Yes |
| `metadata.json` | `.artifacts/{ID}/metadata.json` | Yes |
| Changeset manifest | `.artifacts/{ID}/changeset.md` | Yes (workspace mode) |
| Workspace analysis | `.artifacts/{ID}/workspace-analysis.json` | Yes (repo target, workspace mode) |
| Eval report | `.artifacts/{ID}/evaluation-report.csv` | Recommended |
| Pages base URL | `--pages-base-url` or product config | Optional (repo target) |

## Flags

| Flag | Values | Default | Description |
|------|--------|---------|-------------|
| `--target` | `repo`, `github`, `gitlab`, `vercel`, or a git URL | `github` | Where to publish. A git URL means open an MR/PR **against** that repo (implies `repo`) |
| `--remote` | Git URL | workspace origin | **Push** remote override only (not the MR base). For MR destination, use `--target <url>` |
| `--repo` | `owner/repo` or GitHub URL | — | GitHub repo for github target |
| `--pages-base-url` | URL | — | GitLab Pages base for MR preview polling (repo) |
| `--pages-timeout` | seconds | `600` | Pages poll timeout |
| `--dry-run` | flag | Off | Preview without external writes |
| `--skip-jira` | flag | Off | Skip Jira comment and label update |
| `--force` | flag | Off | Submit even if eval has FAIL verdicts |
| `--no-ssl-verify` | flag | Off | Skip SSL for git push (self-signed certs) |

---

## Step 1: Validate the Prototype

Detect mode and verify required files:

**Workspace mode** (if `workspace-analysis.json` exists):
- Workspace path is accessible
- `changeset.md` lists at least one file
- `metadata.json` exists with required fields

**Standalone mode** (if `.artifacts/{ID}/prototype/` exists):
- `index.html` exists (or at least one HTML file)
- `metadata.json` exists

If validation fails: "Prototype `{ID}` is incomplete. Missing: [list]. Fix before publishing."

## Step 2: Check Eval Results

Read `.artifacts/{ID}/evaluation-report.csv` from `uxd-prototype-evaluate` if it exists.

- **Pass** — zero `FAIL` verdicts in Section 1 (AC rows) → label: `rubric-pass` (or `eval-pass`)
- **Needs attention** — one or more `FAIL` → label: `needs-attention`
- **FLAGGED only** — warn for human review; do not block unless the user wants a clean report
- **No eval exists** — warn; recommend serving the prototype and running `uxd-prototype-evaluate {ID} <URL>` first. In `--dry-run` or `--force` mode, proceed anyway.

Unless `--force` is set, **block submission when any AC verdict is FAIL**.

Legacy fallback: if only `.artifacts/{ID}/reviews/summary.md` exists, use its verdict but prefer a fresh Playwright eval.

## Step 2a: Static Eval path for Prototype Bar (Pages targets)

When publishing to **GitHub**, **GitLab**, or any static host, copy the evaluation report next to the prototype so the Prototype Bar **Eval** control works without a backend:

```bash
EXPORT_SKILL="${CLAUDE_SKILL_DIR}/../uxd-prototype-export"
bash "${EXPORT_SKILL}/scripts/copy-eval-for-pages.sh" \
  --artifacts ".artifacts/{ID}" \
  --pages-root "<staging-or-public-dir>"
```

Convention (same-origin, no server):

```
public/
  …                          ← prototype files
  evals/{ID}/index.html      ← copy of evaluation-report.html
```

Keep `.artifacts/{ID}/` as the working store. Ensure `.artifacts/{ID}/prototype-bar.json` has `views.eval: "/evals/{ID}/"` (sync script sets this). Re-install or refresh the bar config in the published tree if Sources/Eval were injected at create time.

CI tip: add a Pages job step that copies `.artifacts/{ID}/evaluation-report.html` → `public/evals/{ID}/index.html` after evaluate; do not rely on a dynamic helper in production.

## Step 2b: Audit CI/CD Configs for Secrets

Before publishing to any target, scan existing CI/CD configuration files in the workspace for sensitive content. This is especially important for workspace mode where the prototype lives inside an existing codebase with its own CI setup.

**Files to scan:** `.gitlab-ci.yml`, `.github/workflows/*.yml`, `.github/workflows/*.yaml`, `Jenkinsfile`, `.circleci/config.yml`, `Dockerfile`, `docker-compose*.yml`

**Patterns to flag:**

- Hardcoded tokens or credentials (e.g., `PRIVATE-TOKEN:`, `Bearer `, `password:`, `secret:`)
- Internal registry URLs (e.g., `registry.internal.example.com`, `quay.io/internal-org`)
- Internal artifact or package repository URLs
- Deploy keys or SSH keys referenced inline
- Hardcoded internal hostnames or IPs in environment variables
- `variables:` blocks with values that look like secrets rather than CI variable references (`$CI_*`, `${{ secrets.* }}`)

**Handling by target:**

- **`github` / `gitlab` / `vercel`**: The publish scripts replace CI files entirely with clean templates, so existing CI content is never carried forward. This audit still runs as a precaution — if secrets are found in CI files, warn the user since those secrets may also be leaked elsewhere in the codebase.
- **`repo`**: CI files are pushed as-is (internal MR). Flag any hardcoded secrets found and recommend using CI variables instead, but do not block the MR.

---

## Step 3: Publish to Target

### Target: repo (or a git URL)

Push prototype changes to a git repo and create a GitLab merge request.

If `--target` is a git URL (`https://`, `http://`, `git@`, `ssh://`, or ends with `.git`), normalize publish type to `repo` and treat that URL as the MR/PR base (`upstream`). Pass it through as `--upstream` below. Read `target_repo_url` / `upstream_url` from `pipeline-config.yaml` or `workspace-analysis.json` when present.

**Workspace mode:** Use `submit_to_repo.py` from `uxd-prototype-create` (fork-aware `glab mr create`):

```bash
python3 "${CLAUDE_SKILL_DIR}/../uxd-prototype-create/scripts/submit_to_repo.py" \
  --rfe-key {ID} --title "{title}" \
  [--upstream "{TARGET_REPO_URL}"] \
  [--pages-base-url {url}] [--pages-timeout 600] \
  [--jira-comment-id {id}] \
  [--no-ssl-verify] [--dry-run]
```

Requires `glab` authenticated to the GitLab host. Read [references/repo-submit-details.md](references/repo-submit-details.md) for fork detection, MR verification, Pages polling, and JSON output.

**Standalone mode:** Initialize and push as a standalone git repo:

```bash
cd .artifacts/{ID}/prototype
git init && git add . && git commit -m "feat: prototype for {ID}"
git remote add origin {remote-url} && git push -u origin main
```

> **Sandbox note**: Requires `required_permissions: ["all"]` for git push.

### Target: github

Deploy a sanitized copy to a GitHub repo with GitHub Pages. This is the workflow for sharing prototypes externally — it strips all internal/sensitive files before pushing.

**Step 3a: GitHub Repository**

Ask the user if they have a repo or should one be created:

```bash
gh repo create <repo-name> --public --description "UX Prototype — {title}"
```

**Step 3b: Run the Publish Script**

```bash
bash "${CLAUDE_SKILL_DIR}/scripts/publish-github-pages.sh" \
  --repo "<owner/repo>" \
  --source "<path-to-prototype>"
```

The script handles: temp staging, file copy, sensitive file removal, GitHub Pages workflow, git init + force push, cleanup.

Read [references/sensitive-files.md](references/sensitive-files.md) for the full list of files and directories that are stripped before publishing.

**Step 3c: Enable GitHub Pages**

After push completes:

```bash
gh api repos/<owner>/<repo>/pages -X POST -f build_type=workflow
```

**Step 3d: Confirm Deployment**

Wait for the GitHub Actions workflow, then provide the URL:

```
https://<owner>.github.io/<repo-name>/
```

### Target: gitlab

Deploy a sanitized copy to a GitLab instance with GitLab Pages. Works with both self-hosted GitLab (behind VPN) and gitlab.com. Uses the same sensitive-file stripping as the `github` target.

**Sensitivity note:** Self-hosted GitLab instances behind a VPN are less exposed than public GitHub/gitlab.com deployments, but the same sanitization is applied regardless — internal agent configs, credentials, and design history should never be in a deployed prototype.

**Step 3a: GitLab Project**

Ask the user for the GitLab project path and instance URL:

- **gitlab.com** — provide `namespace/project` (e.g., `my-org/ux-prototype-demo`)
- **Self-hosted** — provide the full URL (e.g., `https://gitlab.internal.example.com/team/prototype`)

If the project doesn't exist yet, the script can create it via the GitLab API (requires a `GITLAB_TOKEN` with `api` scope).

**Step 3b: Run the Publish Script**

```bash
bash "${CLAUDE_SKILL_DIR}/scripts/publish-gitlab-pages.sh" \
  --project "<namespace/project>" \
  --source "<path-to-prototype>" \
  [--gitlab-url "<https://gitlab.example.com>"] \
  [--no-ssl-verify]
```

The script handles: temp staging, file copy, sensitive file removal (same list as `publish-github-pages.sh`), `.gitlab-ci.yml` for GitLab Pages, git init + force push, cleanup. Defaults to `https://gitlab.com` if `--gitlab-url` is not provided.

Read [references/sensitive-files.md](references/sensitive-files.md) for the full list of files and directories that are stripped before publishing.

**Step 3c: Confirm Deployment**

After push completes, GitLab CI runs the pages pipeline. Provide the URL:

- **gitlab.com:** `https://<namespace>.gitlab.io/<project>/`
- **Self-hosted:** depends on the instance's Pages domain configuration — check with `curl "${GITLAB_URL}/api/v4/projects/${PROJECT_ID}" --header "PRIVATE-TOKEN: ${GITLAB_TOKEN}" | jq .pages_url`

### Target: vercel

Deploy a sanitized copy to Vercel. Uses the same sensitive-file stripping as the `github` target.

**Step 3a: Vercel Project**

Ask the user if they have an existing Vercel project or should deploy fresh:

- **Existing project** — provide the Vercel project name or link
- **New deployment** — the script initializes a new Vercel project

**Step 3b: Run the Publish Script**

```bash
bash "${CLAUDE_SKILL_DIR}/scripts/publish-vercel.sh" \
  --source "<path-to-prototype>" \
  [--project-name "<vercel-project-name>"]
```

The script handles: temp staging, file copy, sensitive file removal (same list as `publish-github-pages.sh`), Vercel deployment via `vercel --prod`, cleanup.

Read [references/sensitive-files.md](references/sensitive-files.md) for the full list of files and directories that are stripped before publishing.

**Step 3c: Confirm Deployment**

After deploy completes, the script outputs the production URL:

```
https://<project-name>.vercel.app
```

---

## Step 4: Update Jira (Optional)

If Jira integration is available and `--skip-jira` is not set:

1. Add a comment with the published location (MR and/or Pages preview), AC summary (`PASS`/`FAIL`/`FLAGGED` counts from `evaluation-report.csv`), and refinement count. Prefer wiki-markup hyperlinks: `[Preview|https://…]`, `[Merge request|https://…]`.
2. If `submit_to_repo.py` returned `pages_url` after polling, include it (or update an existing comment via `--jira-comment-id`).
3. Add labels: `prototype-created` plus `rubric-pass` / `needs-attention` from Step 2.

Uses the Atlassian MCP if available, otherwise skips silently.

## Step 5: Update Metadata

Update `.artifacts/{ID}/metadata.json` with submission record:

```json
{
  "status": "submitted",
  "submission": {
    "target": "repo",
    "date": "{ISO-8601}",
    "url": "https://gitlab.example.com/org/repo/-/merge_requests/42"
  }
}
```

When `--target` was a git URL, store `submission.target` as `"repo"` (enum) and put the MR URL in `submission.url`. The MR base repo itself lives in `workspace-analysis.json` as `upstream_url` / pipeline `target_repo_url`.

Update frontmatter:

```bash
python3 "${CLAUDE_SKILL_DIR}/scripts/frontmatter.py" set ".artifacts/{ID}/rfe-snapshot.md" \
  status="submitted" updated_at="$(date -u +%Y-%m-%dT%H:%M:%SZ)"
```

## Step 6: Report

Print a submission summary showing ID, target, eval FAIL count (or legacy rubric), labels applied, Jira status, MR/Pages URL, and any warnings.

If `--dry-run`: Show what would happen without executing external writes.

---

## Re-Publishing

To update a previously published prototype, run the same workflow again. The github and gitlab targets force-push (replaces entirely). The vercel target redeploys (replaces the previous deployment). The repo target creates a new branch/MR.

## Edge Cases

| Scenario | Handling |
|----------|----------|
| No eval exists | Warn and recommend `uxd-prototype-evaluate {ID} <URL>`. Proceed with `--force`. |
| Eval has FAIL | Block unless `--force`. |
| Empty MR after push | `submit_to_repo.py` auto-recovers; if still failing, report `verification.verified: false`. |
| Rubric score has zeros | Block unless `--force`. Label as `needs-attention`. |
| No Jira key in metadata | Skip Jira update. Log warning. |
| Prototype already submitted | Proceed (creates new submission record, doesn't overwrite). |
| `--dry-run` with missing deps | Succeeds — only validates local state and previews. |
| Large prototype (5+ MB) | Warn before push. Suggest trimming assets. |
