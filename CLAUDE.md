# CLAUDE.md

@AGENTS.md
## Meta-plugin Architecture

The `patternfly` plugin at `plugins/patternfly/` is a **meta-plugin** — it uses a `dependencies` array to auto-install all PF sub-plugins (`pf-react`, `pf-design-guide`, `pf-design-audit`, `pf-migration`, `pf-mcp`). It has no skills of its own, only the `pf-assist` routing agent. **Claude Code only** — Cursor does not support `dependencies`, so Cursor users install sub-plugins individually.

## Versioning

No `version` field in plugin.json — Claude Code falls back to git commit SHA, so every merge to main automatically invalidates the cache. No manual bumping needed.
