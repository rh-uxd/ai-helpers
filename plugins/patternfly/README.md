# PatternFly AI Skills

AI skills for PatternFly development — component guidance, accessibility auditing, design review, migration tooling, and more. 8 plugins with 32 skills and 6 agents.

## Plugins

| Plugin | What it does | Skills |
|--------|-------------|--------|
| **[react](react/)** | React component development — coding standards, testing, and structure | 6 skills, 3 agents |
| **[design-guide](design-guide/)** | Component selection, interaction patterns, AI experience patterns, Figma design creation | 2 skills, 1 agent |
| **[design-audit](design-audit/)** | Validate existing code and designs against PatternFly standards | 5 skills |
| **[a11y](a11y/)** | Accessibility auditing, reporting, and documentation | — |
| **[migration](migration/)** | PF version migration — breaking change detection, class scanning, upgrade planning | 2 skills |
| **[code-review](code-review/)** | Code review and quality — adversarial review, security patterns | 1 agent |
| **[pf-workshop](pf-workshop/)** | PatternFly team tools and skill incubation | 17 skills, 1 agent |
| **[patternfly-mcp](patternfly-mcp/)** | MCP server for component documentation, design tokens, and accessibility guidance | — |

## Quick Install

```bash
# Claude Code
/plugin marketplace add rh-uxd/ai-helpers
/plugin install react@ai-helpers
/plugin install design-guide@ai-helpers

# Install all PF plugins at once
/plugin install design-audit@ai-helpers
/plugin install migration@ai-helpers
/plugin install a11y@ai-helpers
/plugin install code-review@ai-helpers
```

## Contributing

PatternFly skills use the `pf-` prefix (e.g., `pf-ai-guide`, `pf-test-gen`). See the [contribution guide](../../CONTRIBUTING-SKILLS.md) for full details on adding or modifying skills.

### Ownership

PatternFly plugins are maintained by `@rh-uxd/ai-helpers-maintainers`. See [CODEOWNERS](../../.github/CODEOWNERS) for review routing.

## PatternFly Resources

- [PatternFly.org](https://www.patternfly.org/)
- [PatternFly React](https://github.com/patternfly/patternfly-react)
- [PatternFly MCP Server](https://github.com/patternfly/patternfly-mcp)
