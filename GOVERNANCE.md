# Governance

Every contribution passes through three layers before it can affect a user's system.

## Layer 1: Automated Review (CodeRabbit)

CodeRabbit reviews every pull request automatically. For this repo, it checks:

- Skill structure against [CONTRIBUTING-SKILLS.md](CONTRIBUTING-SKILLS.md)
- Script files for security red flags (hardcoded secrets, unsafe commands, injection risks)
- Manifest consistency between `.claude-plugin/` and `.cursor-plugin/`

Configuration: [.coderabbit.yaml](.coderabbit.yaml)

## Layer 2: Human Review

A maintainer reviews every PR for intent-level issues that automated tools miss:

- Does the skill do what it claims?
- Are the instructions safe and appropriate?
- Could the instructions lead an AI to take harmful actions?

### Ownership

All plugins are maintained by `@rh-uxd/ai-helpers-maintainers`. This single team owns the full plugin surface — PatternFly and UXD alike.

PRs require at least 1 approval from a CODEOWNERS-designated reviewer. Review routing is defined in [CODEOWNERS](.github/CODEOWNERS).

## Layer 3: Runtime Permission Boundary

Skills are markdown instruction files — they cannot execute on their own. When a user invokes a skill, the AI tool's permission system governs what actually happens:

- **Claude Code** prompts the user before running shell commands, writing files, or accessing external services
- **Cursor** applies its own permission model

A skill can *ask* the AI to do something dangerous, but it cannot bypass the tool's approval prompts. The user always has final say.

## What This Means in Practice

- No skill can execute code on install
- No skill can access the network without user approval
- No skill can write files without user approval
- Every contribution is reviewed by both an automated tool and a human
- The blast radius of a bad skill is one developer's session, and they approved every action in it

## Branch Protection

The `main` branch is protected with these requirements:

- **Required reviews**: At least 1 approval from a CODEOWNERS-designated reviewer
- **Status checks**: `validate` workflow must pass (manifest parity, generated docs up to date)
- **No direct pushes**: All changes go through pull requests (org admins can bypass for maintenance)

## Decision Authority

Maintainers (`@rh-uxd/ai-helpers-maintainers`) have authority over all plugin content, shared infrastructure, and governance docs. Decisions are made by consensus among active maintainers.

### Plugin taxonomy disputes

If maintainers disagree on where a skill belongs:

- The decision test in [CONTRIBUTING-SKILLS.md](CONTRIBUTING-SKILLS.md) is authoritative
- If the test is ambiguous, the skill goes to the relevant workshop plugin until the team agrees
