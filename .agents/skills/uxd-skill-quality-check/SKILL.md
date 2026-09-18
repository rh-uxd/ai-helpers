---
name: uxd-skill-quality-check
description: Check a UXD AI Helpers skill against repository contribution standards and explain or fix Skillsaw findings before a pull request. Use when creating, editing, or preparing a skill for contribution to this repository.
disable-model-invocation: true
---

# Skill Quality Check

Run this check from the repository root before opening a pull request that adds
or changes a skill.

## Workflow

1. Identify the changed or newly created `SKILL.md` files with `git diff` and
   `git ls-files --others --exclude-standard`.
2. Read each changed skill and check its frontmatter, description, examples,
   metadata, and eval structure before running the command.
3. Build a list of changed or untracked marketplace skill paths and run
   `uvx skillsaw lint --config .skillsaw.yaml` with those paths. This uses the
   repository's Skillsaw configuration, custom UXD rule, and baseline without
   scanning unrelated skills.
4. If the check reports findings, explain each one in plain language and point
   to the file and line. Distinguish existing baselined findings from new
   findings introduced by the current change.
5. Offer or apply focused fixes to the contributor's skill when requested.
6. Run the targeted Skillsaw command again after fixes and report the final
   result.

If no `plugins/**/SKILL.md` files changed, report that there is nothing to
audit. Do not run repository-wide lint as a substitute; it can surface findings
from unrelated work.

Do not run `skillsaw baseline` to hide a new finding. Update the baseline only
when a maintainer explicitly asks for a repository-wide baseline update.

## Requirements

New or modified skills should have:

- A `name` matching the skill directory and starting with `uxd-` or `pf-`.
- A description that starts with an action verb and includes `Use when` context.
- `audience`, `inputs`, and `outputs` frontmatter.
- An example or output section with a fenced output example.
- Fewer than 500 lines.
- An eval with `dataset:` and at least one case when the skill is consumer-facing.

Skillsaw also checks structure, content quality, context budgets, eval formats,
secrets, and repository integrity. CI runs the same check on the pull request.

## Output

Report:

1. The skill files checked.
2. New findings that need attention.
3. Existing findings suppressed by the baseline, if relevant.
4. Whether the targeted Skillsaw check passed after the final check.

Do not commit or push changes as part of this check.
