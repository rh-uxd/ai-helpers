## Skill Contribution

**Skill name:** <!-- e.g., uxd-my-skill or pf-my-skill -->
**Target plugin:** <!-- e.g., uxd-workshop, pf-workshop, react, design-audit -->
**What it does:** <!-- One sentence -->

## How I tested it

<!-- Describe the scenario you tested against and what the output looked like -->

## Checklist

- [ ] Ran `make check` (validates manifests + regenerates docs)
- [ ] Skill name uses the correct prefix (`uxd-` for UXD skills, `pf-` for PF skills)
- [ ] Frontmatter has `name` and `description` (`name` matches directory name)
- [ ] Description follows the [formula](CONTRIBUTING-SKILLS.md#writing-descriptions)
- [ ] Tool-agnostic — works in both Claude Code and Cursor
- [ ] Under 500 lines
- [ ] Tested locally on a real scenario
- [ ] If new plugin: `.claude-plugin/` and `.cursor-plugin/` manifests are identical
- [ ] Consumer-facing skills have an eval in `eval/<skill-name>/`
