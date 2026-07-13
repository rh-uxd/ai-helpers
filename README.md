# UXD AI Helpers

[![License](https://img.shields.io/github/license/rh-uxd/ai-helpers)](./LICENSE)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](./CONTRIBUTING.md)
[![Plugins](https://img.shields.io/badge/plugins-8-blueviolet)](./PLUGINS.md)
[![Skills](https://img.shields.io/badge/skills-38-blue)](./PLUGINS.md)

AI skills for PatternFly and UXD teams — component development, design, accessibility, and migration. Plugins work in both **Claude Code** and **Cursor**.

## Quick Start

### Claude Code

```bash
# Add the marketplace (one time)
claude plugins marketplace add rh-uxd/ai-helpers

# Install everything PatternFly (React, design guide, audit, migration, and MCP)
claude plugins install patternfly@uxd-ai-helpers
```

That's it. All PatternFly skills are now available:

```
/pf-react:pf-test-gen          # Generate unit tests for a React component
/pf-design-guide:pf-ai-guide   # Get AI experience design guidance
/pf-design-audit:pf-color-scan # Scan for hardcoded colors that should be tokens
```

**Power users:** Install individual plugins for granular control (e.g., `claude plugins install pf-react@uxd-ai-helpers`).

Enable auto-update to receive new skills as they're merged:

`/plugin` → Marketplaces → enable auto-update

### Cursor

Add this repo as a third-party plugin source in Cursor's settings.

## Plugins

<!-- BEGIN PLUGIN TABLE -->
| Plugin | Description |
|--------|-------------|
| <nobr>**patternfly**</nobr> | Everything you need for PatternFly development — React components, design guidance, migration, and MCP docs |
| <nobr>**uxd-workshop**</nobr> | UXD team tools and skill incubator — prototyping, research, design review, team workflows |
| <nobr>**pf-design-audit**</nobr> | Design audit — validate existing code and designs against PatternFly standards |
| <nobr>**pf-design-guide**</nobr> | Design guide — component selection, interaction patterns, AI experience patterns, Figma design creation |
| <nobr>**pf-mcp**</nobr> | PatternFly MCP server — provides component documentation, design token lookup, and accessibility guidance via the Model Context Protocol |
| <nobr>**pf-migration**</nobr> | PF version migration — breaking change detection, class scanning, upgrade planning |
| <nobr>**pf-react**</nobr> | React component development — coding standards, testing, and structure |
| <nobr>**pf-workshop**</nobr> | PatternFly team tools and skill incubation — issue triage, release management, codebase auditing, new skill development |
<!-- END PLUGIN TABLE -->

See [PLUGINS.md](PLUGINS.md) for the full list of skills, agents, and usage details.

## How It Works

```
AI Tool (Claude Code / Cursor)
    │
    ▼
.<tool>-plugin/marketplace.json    ← tool discovers this
    │
    ├── plugins/patternfly/pf-react/          ← PF plugins
    ├── plugins/patternfly/pf-design-guide/
    ├── plugins/patternfly/pf-design-audit/
    └── ...
```

1. Each AI tool looks for its own directory (`.claude-plugin/`, `.cursor-plugin/`) containing a `marketplace.json`
2. The marketplace lists plugins with relative paths to their `plugin.json` manifests
3. Each plugin has identical manifests in both `.claude-plugin/` and `.cursor-plugin/` directories
4. Skills become available as `/<plugin>:<skill>` slash commands

## Repository Structure

```
├── .claude-plugin/         # Claude Code marketplace config
├── .cursor-plugin/         # Cursor marketplace config
├── plugins/
│   ├── uxd-workshop/       # UXD team tools (skills + uxd-assist agent)
│   └── patternfly/         # PatternFly meta-plugin + sub-plugins
│       ├── agents/            # pf-assist routing agent
│       ├── pf-react/          # React development — testing, structure, coding standards
│       ├── pf-design-guide/   # Design guidance — component selection, AI patterns
│       ├── pf-design-audit/   # Design auditing — token checks, color scanning
│       ├── pf-migration/      # PF version migration tools
│       ├── pf-workshop/       # PF team tools and skill incubation
│       └── pf-mcp/            # MCP server integration
├── scripts/                # Automation (doc generation, scaffolding, validation)
├── CONTRIBUTING.md         # How to contribute
└── CONTRIBUTING-SKILLS.md  # Step-by-step skill creation guide
```

## PatternFly MCP Server

PatternFly plugins automatically include the [PatternFly MCP server](https://github.com/patternfly/patternfly-mcp), which gives AI tools access to component documentation, prop schemas, and design guidelines — no extra setup required.

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for the contribution workflow and [CONTRIBUTING-SKILLS.md](CONTRIBUTING-SKILLS.md) for a step-by-step guide to creating skills.

## CI/CD

Every pull request runs through automated quality gates:

| Gate | What it checks |
|------|---------------|
| **Validate** | Manifest consistency, generated docs freshness, skill frontmatter integrity |
| **Secret scan** | Internal URLs and potential credentials in tracked files |
| **Link check** | Broken internal markdown links |
| **Boundary check** | PF skills don't reference UXD internals and vice versa |
| **CodeRabbit** | Automated review — structure, security patterns, best practices |

## License

[MIT](./LICENSE)
