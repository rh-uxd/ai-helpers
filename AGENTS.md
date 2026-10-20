# Agent Instructions

This repository is an AI marketplace for UXD teams and the products they support. It contains plugin definitions (skills and agents) published to multiple agent tools.

## Working in this repo

- Do **not** edit or regenerate auto-generated content in a contribution PR — see [Generated files](#generated-files). Do not run `make docs` or `scripts/generate-plugins-md.sh`; CI updates those files after merge to main.
- Run `make validate` to check manifests, skills, and agents without regenerating docs.
- Plugin manifests (`plugin.json`) must be identical in `.claude-plugin/` and `.cursor-plugin/`. Marketplace configs may differ between platforms.
- Do not add `mcpServers` to plugin manifests. The PatternFly MCP is a separate user install.
- PatternFly plugins, skills, and agents use the `pf-` prefix.
- UXD plugins, skills, and agents use the `uxd-` prefix.

## Repository structure

```text
plugins/uxd-workshop/              — UXD tools and skill incubator
plugins/patternfly/                — PatternFly meta-plugin and sub-plugins
  ├── .claude-plugin/plugin.json   — Meta-plugin manifest
  └── pf-*/                        — PatternFly sub-plugins
specifications/                    — Versioned formats for artifacts skills produce
.claude-plugin/marketplace.json   — Claude marketplace config
.cursor-plugin/marketplace.json   — Cursor marketplace config
scripts/                           — Automation and validation
```

The `patternfly` directory is a meta-plugin for Claude Code. It installs the PatternFly sub-plugins through dependencies; Cursor users install the sub-plugins individually.

## Meta-plugin Architecture

The `patternfly` plugin at `plugins/patternfly/` is a **meta-plugin** — it uses a `dependencies` array to auto-install all PF sub-plugins (`pf-react`, `pf-design-guide`, `pf-design-audit`, `pf-migration`, `pf-mcp`). It has no skills of its own, only the `pf-assist` routing agent. **Claude Code only** — Cursor does not support `dependencies`, so Cursor users install sub-plugins individually.

## Versioning

No `version` field in plugin.json — Claude Code falls back to git commit SHA, so every merge to main automatically invalidates the cache. No manual bumping needed.

A skill's frontmatter `version` is maturity (`CONTRIBUTING-SKILLS.md`). It is separate from an artifact's `specVersion`.

## Artifact specifications

`specifications/` is the contract for artifacts skills create and read (slide decks, and later prototypes, canvases, and docs). Each artifact type has its own directory: the current version in `current.json`, one document per version, and `upgrades/` for migration scripts. The artifact records the version it was built against as `specVersion`.

Before changing a skill, template, validator, or viewer that reads or writes an artifact, read that type's specification. If the change alters the artifact contract — folders, files, required or optional fields, allowed values, or ordering rules — the current specification document cannot be edited to describe the new shape. Tell the user which artifact structure will change and which version bump that requires, then land the spec update in the same change as the skill.

Bump `specVersion` with semantic versioning:

- **Major** — a file or field is removed or renamed, a required field's meaning changes, or an existing artifact is no longer valid without a rewrite.
- **Minor** — an optional file, field, or allowed value is added that an older reader can ignore.
- **Patch** — the specification text is clarified and a valid artifact's files and fields stay the same.

Every bump needs an upgrade script in the same change. Add `specifications/<type>/<version>.md`, set `current.json`, update that type's README, and add `specifications/<type>/upgrades/{from}-to-{to}.mjs`. The script rewrites one artifact directory from the previous version in place and sets `specVersion` to the new version. A major or minor script also applies the structural change. A patch script updates `specVersion` only. Chain one step at a time (`0.1.0-to-0.2.0`, then `0.2.0-to-0.3.0`). Do not hand-edit an artifact to skip a version. Update every skill, template, and validator that writes or checks `specVersion`. Copy, theme, and instruction edits that leave the contract alone stay on the current spec and do not get a new version or a script. A new shared artifact type gets a `specifications/<type>/` directory before skills start writing that layout.

## Code style

- Skills must be tool-agnostic and work across supported agent tools.
- Avoid references to a specific agent tool in skill instructions. Use `Assistant:` in examples when needed.
- Prefer bash for bundled scripts unless another runtime is required and documented.
- Every skill and agent needs frontmatter with matching `name` and `description`.
- Keep skills concise. Avoid unnecessary file reads, redundant instructions, and verbose output formats.

## Context routing

- When contributing a new skill or agent, read `CONTRIBUTING-SKILLS.md`.
- When creating a plugin, graduating a skill, or editing manifests, read `CONTRIBUTING.md` and its plugin creation and graduation guidance.

## Generated files

The following content is generated by `scripts/generate-plugins-md.sh`. Leave it out of contribution PRs; CI regenerates it after merge to main. Hand-written sections outside these generated regions can be updated as needed.

| File | Generated content |
|------|-------------------|
| `PLUGINS.md` | Entire file, including the table of contents |
| `README.md` | Plugin table (`BEGIN PLUGIN TABLE`) and badge counts |
| `CONTRIBUTING-SKILLS.md` | Plugin table (`BEGIN PLUGIN TABLE`) and good-names list (`BEGIN GOOD NAMES`) |
| Per-plugin `README.md` | Entire files at `plugins/*/README.md` and `plugins/*/*/README.md` |
