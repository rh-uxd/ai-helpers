# Frequently Asked Questions

## For PatternFly contributors

### Where do PatternFly skills live?

Under `plugins/patternfly/<plugin-name>/skills/`. For example, a React testing skill goes in `plugins/patternfly/pf-react/skills/pf-my-skill/SKILL.md`.

### I have a fork of the old `patternfly/ai-helpers` repo. What do I do?

1. Fork this repo (`ai-helpers`) instead
2. Your PF skills now live under `plugins/patternfly/` — the internal structure is the same
3. If you had an open PR on the old repo, re-target it here. See [MIGRATION.md](MIGRATION.md) for the full timeline.

### Do I need to understand UXD tooling to contribute?

No. The [PatternFly contributions](CONTRIBUTING.md#patternfly-contributions) section is self-contained. PF PRs are reviewed by PF maintainers — you don't interact with UXD tooling at all.

### Why is this repo called `ai-helpers` if I'm contributing PatternFly skills?

PatternFly is part of the UXD organization. The repo hosts skills for all UXD teams — PatternFly is the largest and most visible, but not the only one. Your PF skills are clearly separated under `plugins/patternfly/` with their own maintainers, labels, and review process.

### How do I test a skill without the PatternFly MCP server?

Most PF skills don't require the MCP server — they work with local files and project context. Skills that reference PF documentation will still work but may produce less specific output. To install the MCP server for full functionality:

```bash
claude mcp add pf-mcp -- npx -y @anthropic/patternfly-mcp@latest
```

### What labels should I use on my issue or PR?

You don't need to add labels manually. The [auto-label workflow](.github/workflows/auto-label.yml) applies labels based on which files you changed. Issue templates also auto-apply routing labels.

## For all contributors

### How do I create a new skill?

```bash
make scaffold PLUGIN=<plugin-name> SKILL=<skill-name>
```

This creates the directory and a starter SKILL.md with correct frontmatter. See [CONTRIBUTING-SKILLS.md](CONTRIBUTING-SKILLS.md) for the full guide.

### How do I create a new plugin?

```bash
make scaffold-plugin PLUGIN=<name> DESC="what it helps people do"
```

Then add the plugin to both marketplace configs and open a PR. See [CONTRIBUTING.md](CONTRIBUTING.md#creating-a-new-plugin) for details.

### How do I validate my changes before opening a PR?

```bash
make check
```

This runs manifest validation (plugin-level `plugin.json` parity between `.claude-plugin/` and `.cursor-plugin/`, JSON validity, name consistency) and regenerates docs. Marketplace configs (`marketplace.json`) are validated independently — they can differ between platforms. If `make check` passes, your PR will pass CI.

### My skill works in Claude Code but not in Cursor (or vice versa). Why?

Your skill likely contains tool-specific references. Skills must be tool-agnostic — avoid mentioning "Claude," "Cursor," or tool-specific APIs. Use "Assistant:" instead of "Claude:" in examples. See the [security rules](CONTRIBUTING-SKILLS.md#security-rules) and quality checklist.

### What's the difference between a skill and an agent?

- **Skill** — a task that produces a result ("generate tests," "audit accessibility"). Invoked explicitly.
- **Agent** — domain knowledge the AI follows automatically ("always use these coding standards"). Loaded by context.

See [CONTRIBUTING-SKILLS.md](CONTRIBUTING-SKILLS.md#skill-vs-agent) for the full explanation.
