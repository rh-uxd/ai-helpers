# Repo Submit Details

Full procedure for submitting workspace-mode prototypes as GitLab merge requests. Load this when `--target=repo` and the prototype is in workspace mode.

## submit_to_repo.py

The script lives at the create skill (shared):

`${CLAUDE_SKILL_DIR}/../uxd-prototype-create/scripts/submit_to_repo.py`

(Or resolve via the create skill path when `CLAUDE_SKILL_DIR` is the publish skill.)

### Invocation

```bash
python3 ../uxd-prototype-create/scripts/submit_to_repo.py \
  --rfe-key {ID} \
  --title "{title from metadata}" \
  [--pages-base-url https://example.pages.example.com] \
  [--pages-timeout 600] \
  [--jira-comment-id 12345] \
  [--no-ssl-verify] \
  [--dry-run]
```

Run with `required_permissions: ["all"]` in Cursor (git + `glab` + network).

### What the Script Does

1. Reads `.artifacts/{ID}/workspace-analysis.json` for clone URL, original branch, and workspace path
2. Reads `.artifacts/{ID}/changeset.md` for changed files
3. **Detects workflow** — fork (`origin` ≠ `upstream`) vs same-repo
4. Creates branch `prototype/{ID}`
5. Stages only changeset files
6. Commits: `Prototype: {ID} - {title}`
7. Unshallows if needed (GitLab rejects shallow pushes)
8. **Pushes to origin** (fork in fork workflows)
9. **Creates MR via `glab mr create`** (not git push options — those cannot contain newlines)
10. For forks: `-H source_project -R target_project`
11. **Verifies MR** — `sha` non-null, `changes_count >= 1`; auto-recovery on failure
12. **Polls GitLab Pages** when `--pages-base-url` is set (default timeout 600s)
13. Outputs JSON with MR URL, verification, Pages URL

### Fork vs Same-Repo

| Signal | Workflow | Push | MR |
|--------|----------|------|-----|
| `origin` and `upstream` differ | **Fork** | Push to `origin` | `glab mr create -H fork -R upstream` |
| Only `origin`, or same project | **Same-repo** | Push to `origin` | `glab mr create` |

Pushing to upstream in a fork workflow produces empty MRs (`sha: null`). Always push to the fork.

### Pages Preview Polling

When `--pages-base-url` is provided:

- Poll every ~20s up to `--pages-timeout` (default 600)
- URL convention: `<pages_base_url>/mr-<iid>/`
- On timeout: `pages_status: "pending"` with expected URL

Use `pages_url` in the Jira comment (wiki markup: `[Preview|https://…]`).

### MR Description Content

- **What this adds** — from RFE snapshot
- **Pipeline details** — mode, eval summary if present
- **Key design decisions** — from `decisions.json`
- **How to review** — checkout + run locally
- **Assumptions** — from `metadata.json`
- Provenance note that this came from the prototype pipeline

### Script Output

```json
{
  "status": "pushed",
  "branch": "prototype/PROJ-298",
  "target_branch": "main",
  "push_remote": "origin",
  "workflow": "fork",
  "source_project": "user/fork",
  "target_project": "org/repo",
  "merge_request_url": "https://gitlab.example.com/org/repo/-/merge_requests/42",
  "merge_request_iid": 42,
  "commit": "abc1234",
  "files_committed": 6,
  "verification": {"sha": "abc1234def", "changes_count": 6, "verified": true},
  "pages_url": "https://example.pages.example.com/mr-42/",
  "pages_status": "live"
}
```

### Prerequisites

- `workspace-analysis.json` must include `branch`, `clone_url`, and `workspace_path`
- `glab` CLI authenticated for the GitLab host
- Git credentials configured for push

### Flags

| Flag | Description |
|------|-------------|
| `--rfe-key` | Prototype ID (required) |
| `--title` | MR title |
| `--pages-base-url` | Base URL for Pages preview polling |
| `--pages-timeout` | Seconds to wait for Pages (default 600) |
| `--jira-comment-id` | Existing Jira comment to update with Pages URL |
| `--no-ssl-verify` | Skip SSL verification |
| `--dry-run` | Show commands without executing |

### Standalone Mode Alternative

For standalone HTML without a workspace:

```bash
cd .artifacts/{ID}/prototype
git init && git add . && git commit -m "feat: prototype for {ID}"
git remote add origin {remote-url} && git push -u origin main
```

This does not create a GitLab MR — simple push only.
