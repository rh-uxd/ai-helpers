# UXD AI Helpers

[![License](https://img.shields.io/github/license/rh-uxd/ai-helpers)](./LICENSE)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](./CONTRIBUTING.md)
[![Plugins](https://img.shields.io/badge/plugins-9-blueviolet)](./PLUGINS.md)
[![Skills](https://img.shields.io/badge/skills-32-blue)](./PLUGINS.md)

AI skills for PatternFly and UXD teams — component development, design, accessibility, and migration. Plugins work in both **Claude Code** and **Cursor**.

## Quick Start

### Claude Code

```bash
# Add the marketplace
/plugin marketplace add rh-uxd/ai-helpers

# Install a plugin
/plugin install react@ai-helpers
```

After installation, the plugin's skills and agents are available in any project:

```
/react:pf-test-gen          # Generate unit tests for a React component
/design-guide:pf-ai-guide   # Get AI experience design guidance
/design-audit:pf-color-scan # Scan for hardcoded colors that should be tokens
```

Enable auto-update to receive new skills as they're merged:

`/plugin` → Marketplaces → enable auto-update

### Cursor

Add this repo as a third-party plugin source in Cursor's settings.

## Plugins

<!-- BEGIN PLUGIN TABLE -->
| Plugin | Description |
|--------|-------------|
| **uxd-workshop** | UXD team tools and skill incubator — prototyping, research, design review, team workflows |
| **a11y** | Accessibility auditing, reporting, and documentation |
| **code-review** | Code review and quality \u2014 adversarial review, security patterns |
| **design-audit** | Design audit \u2014 validate existing code and designs against PatternFly standards |
| **design-guide** | Design guide \u2014 component selection, interaction patterns, AI experience patterns, Figma design creation |
| **migration** | PF version migration \u2014 breaking change detection, class scanning, upgrade planning |
| **patternfly-mcp** | PatternFly MCP server \u2014 provides component documentation, design token lookup, and accessibility guidance via the Model Context Protocol |
| **pf-workshop** | PatternFly team tools and skill incubation — issue triage, release management, codebase auditing, new skill development |
| **react** | React component development \u2014 coding standards, testing, and structure |
<!-- END PLUGIN TABLE -->

See [PLUGINS.md](PLUGINS.md) for the full list of skills, agents, and usage details.

## How It Works

```
AI Tool (Claude Code / Cursor)
    │
    ▼
.<tool>-plugin/marketplace.json    ← tool discovers this
    │
    ├── plugins/patternfly/react/          ← PF plugins
    ├── plugins/patternfly/design-guide/
    ├── plugins/patternfly/design-audit/
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
│   └── patternfly/         # PatternFly plugins
│       ├── react/          # React development — testing, structure, coding standards
│       │   └── skills/
│       │       └── pf-test-gen/
│       │           ├── SKILL.md
│       │           └── eval/   # Evals colocated with their skill
│       ├── design-guide/   # Design guidance — component selection, AI patterns
│       ├── design-audit/   # Design auditing — token checks, color scanning
│       ├── a11y/           # Accessibility auditing and documentation
│       ├── migration/      # PF version migration tools
│       ├── code-review/    # Code review and quality
│       ├── pf-workshop/    # PF team tools and skill incubation
│       └── patternfly-mcp/ # MCP server integration
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

[Apache-2.0](./LICENSE)
