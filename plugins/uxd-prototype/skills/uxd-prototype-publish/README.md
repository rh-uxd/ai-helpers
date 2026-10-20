# uxd-prototype-publish

Publish a completed prototype as a merge request, or deploy a sanitized copy to GitHub Pages or GitLab Pages.

[Usage and full options](SKILL.md#flags)

## Prerequisites

| Requirement | When it is needed |
|-------------|-------------------|
| Git | All targets need Git access to push or deploy the published copy |
| Python 3 | `--target repo` (merge-request submission) |
| `glab` authenticated to GitLab plus Git push access | `--target repo` (merge request) |
| `gh` authenticated to GitHub | `--target github` (GitHub Pages) |
| Git push access and optionally `GITLAB_TOKEN` with `api` scope | GitLab Pages; token is needed when the script must create a project |

A prototype ID must have the artifacts required by `SKILL.md`. Publishing can be blocked when evaluation has AC failures; `--force` overrides that safeguard.

## Codex quick start

Enable the available UXD prototype plugin and open your prototype project in Codex. See [Codex setup](../../../../docs/codex-setup.md) if the skill is missing.

Open a merge request for a workspace prototype:

```text
$uxd-prototype-publish PROJ-298 --target repo
```

Publish a sanitized GitHub Pages site:

```text
$uxd-prototype-publish PROJ-298 --target github --repo owner/repo
```

## Setup

Authenticate only for the destination you plan to use:

| Target | Setup |
|--------|-------|
| Merge request (`repo`) | Install `glab`, run `glab auth login`, and make sure Git can push to the workspace remote. |
| GitHub Pages (`github`) | Install `gh`, run `gh auth login`, and confirm access to the target repository. |
| GitLab Pages (`gitlab`) | Ensure Git can push to the project. Set `GITLAB_TOKEN` with `api` scope only if the publishing flow needs to create a project. For a self-hosted instance, provide its URL. |

Keep access tokens out of source files and chat transcripts. For a dry run that previews changes without external writes, add `--dry-run`.

## Scripts

| Script | Purpose |
|--------|---------|
| `scripts/submit_to_repo.py` | Submit a workspace prototype as a fork-aware GitLab merge request using `glab` |
| `scripts/publish-github-pages.sh` | Sanitize and deploy a copy to GitHub Pages |
| `scripts/publish-gitlab-pages.sh` | Sanitize and deploy a copy to GitLab Pages |

Frontmatter updates use `uxd-prototype-create/scripts/frontmatter.py`. The publish sanitizer's sensitive-file list is in `references/sensitive-files.md`.

## Related

- **uxd-prototype-create** — produces the prototype and artifacts
- **uxd-prototype-evaluate** — reports AC results; FAIL blocks publishing unless `--force`
- **uxd-prototype-export** — copies eval reports into `public/evals/` for hosted Eval
