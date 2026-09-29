# uxd-prototype-publish

Publish a completed prototype as a merge request, or a sanitized GitHub Pages / GitLab Pages / Vercel deploy.

**Contract (inputs, outputs, flags, steps):** [SKILL.md](SKILL.md)

## Scripts

| Script | Purpose |
|--------|---------|
| `scripts/submit_to_repo.py` | Fork-aware GitLab MR submit |
| `scripts/publish-github-pages.sh` | Sanitize and deploy to GitHub Pages |
| `scripts/publish-gitlab-pages.sh` | Sanitize and deploy to GitLab Pages |
| `scripts/publish-vercel.sh` | Sanitize and deploy to Vercel |

Frontmatter updates use `uxd-prototype-create/scripts/frontmatter.py`. Sensitive-file list: `references/sensitive-files.md`.

## Related

- `uxd-prototype-create` — produces the prototype and artifacts
- `uxd-prototype-evaluate` — AC FAIL blocks publish unless `--force`
- `uxd-prototype-export` — copies eval report into `public/evals/` for hosted Eval
