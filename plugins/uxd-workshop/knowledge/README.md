# UXD workshop knowledge

Shared, versioned reference material for skills and agents in this plugin.

Unlike **agents** (always-on behavioral guidance) or **skills** (task procedures), **knowledge** is opt-in data that skills explicitly load when they need a shared source of truth.

| Path | Purpose |
|------|---------|
| [`personas/`](personas/) | Role personas — IDs, display names, audience mapping |
| [`personas/overlays/`](personas/overlays/) | Persona overlays (experience, accessibility, regulation, team size) |

## Path resolution

From any skill in this plugin:

```text
${CLAUDE_PLUGIN_ROOT}/knowledge/...
```

If `CLAUDE_PLUGIN_ROOT` is unavailable (some Cursor installs), resolve from the skill directory:

```text
${CLAUDE_SKILL_DIR}/../../knowledge/...
```

## What belongs here

- Stable identifiers and names teams should reuse across skills
- Short reference cards (who / when to use) with YAML front matter
- Shared mappings (e.g. audience → persona or overlay)

## What does not belong here

- Product-specific Jira keys, repo URLs, or MR maps → skill `config/product-overlay.yaml`
- Deep behavioral scoring rubrics / full usability YAML dumps → optional `.context/` bootstrap (or future knowledge expansions)
- Task procedures → `skills/`
