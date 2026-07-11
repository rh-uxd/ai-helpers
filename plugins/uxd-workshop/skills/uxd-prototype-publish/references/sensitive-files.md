# Sensitive Files Reference

Files and directories that must be stripped before publishing a prototype. Load this when running the `public`, `gitlab`, or `vercel` target to verify the sanitization checklist.

## Directories Removed

| Path | Why |
|------|-----|
| `.agents/` | Agent rules, skills, and potentially sensitive context |
| `.cursor/` | Cursor IDE rules and configuration |
| `.claude/` | Claude AI local settings and skills |
| `.design/` | Design history, team context, internal documentation |
| `scripts/` | Internal fork management or CI scripts |
| `node_modules/` | Dependencies (rebuilt from `package.json` during CI) |
| `dist/` | Build output (rebuilt during CI) |
| `.git/` | Source history (fresh repo initialized for public push) |
| `.artifacts/` | Pipeline artifacts, reviews, decision pages, metadata |

## Files Removed

| Path | Why |
|------|-----|
| `AGENTS.md` | Internal agent instructions |
| `.gitlab-ci.yml` | Internal GitLab CI pipeline configuration |
| `.env` | API tokens and secrets (replaced with clean version) |
| `.env.local` | Local environment overrides with possible secrets |
| `.env.server` | Server-side secrets |
| `.cursormcp` | MCP server configuration with credentials |
| `.cursormcp.local` | Local MCP overrides |
| `.cursorignore` | Cursor IDE ignore rules |
| `.cursorindexingignore` | Cursor indexing ignore rules |
| `.cursor-mcp-config.json` | MCP configuration with potential credentials |
| `public/fork-descriptions.json` | Internal fork data (product-specific) |

## Verification

All three publish scripts (`publish-github-pages.sh`, `publish-gitlab-pages.sh`, `publish-vercel.sh`) perform a post-removal verification step — if any of `.agents/`, `.cursor/`, `.design/`, or `AGENTS.md` still exist after removal, the script aborts with a fatal error to prevent data leaks. CI/CD config files (`.gitlab-ci.yml`, `.github/`) are replaced with clean deployment templates rather than carried forward.

## Additional Checks Before Publishing

Beyond what the script handles, manually verify:

1. **CI/CD configuration files** — Existing `.gitlab-ci.yml`, `.github/workflows/*.yaml`, `Jenkinsfile`, `Dockerfile`, and `docker-compose*.yml` files commonly contain hardcoded secrets, internal registry URLs, deploy tokens, and internal hostnames in environment variable blocks. The publish scripts replace CI files with clean templates, but finding secrets in CI configs suggests they may be leaked elsewhere in the codebase too.
2. **Hardcoded internal URLs** — Search prototype HTML for internal hostnames (e.g., `gitlab.internal.example.com`, `jira.example.com`). Replace with placeholder URLs or remove.
3. **API keys in source** — Search for patterns like `Bearer `, `token=`, `apiKey=`, `PRIVATE-TOKEN:` in HTML/JS/YAML files.
4. **Internal team names** — Check for team names, employee emails, or internal project codenames in UI copy or comments.
5. **Realistic but sensitive data** — Sample data in prototypes should not contain real customer data, even if anonymized. Use clearly synthetic data.
6. **Comments with internal context** — HTML/JS comments may reference internal tickets, architecture decisions, or team discussions.

## .gitignore Cleanup

The publish script also cleans up `.gitignore` entries that reference internal tooling:

- Removes `.env`, `.env.local`, `.env.server` entries (clean `.env` is committed)
- Removes `.cursor-mcp-config`, `.claude`, `.playwright-mcp`, `.cursormcp` entries
