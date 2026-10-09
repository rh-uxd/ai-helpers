The prototyping skills are created by the **UX RHAI First team**. See the [working document](https://docs.google.com/document/d/14eVN5kyDNWaS1M8cR-p8DQ9BDQOn73fcq8PZvy_WQAo/edit?tab=t.0#heading=h.7bxejv31jp0w) for ongoing guidance.

## Codex

Sign into the Codex app through your organization's approved route, including SSO when offered. Enable the available UXD prototype plugin and check its app connections before starting. A workspace-managed marketplace can keep plugins synced; manual copying is a fallback when the skills are unavailable.

See [Codex setup](../../docs/codex-setup.md) for plugin access, connection checks, manual installation, and spend tracking. Each skill's README below covers its own requirements and setup.

## Workflow and documentation

Use **create → evaluate → publish**, with **export** when you need captures or implementation-ready output. Select a skill in Codex or type its `$skill-name` when supported.

| Skill | Use it to | Start here | Full reference |
|-------|-----------|------------|----------------|
| `$uxd-prototype-create` | Build or refine a runnable prototype | [Create quick start](skills/uxd-prototype-create/README.md) | [Usage and full options](skills/uxd-prototype-create/SKILL.md#flags) |
| `$uxd-prototype-evaluate` | Check acceptance criteria, fix failures, and review usability | [Evaluate quick start](skills/uxd-prototype-evaluate/README.md) | [Usage and full options](skills/uxd-prototype-evaluate/SKILL.md#flags) |
| `$uxd-prototype-export` | Capture pages, export journeys, or install the Prototype Bar | [Export quick start](skills/uxd-prototype-export/README.md) | [Usage and full options](skills/uxd-prototype-export/SKILL.md#flags) |
| `$uxd-prototype-publish` | Submit for review or deploy a sanitized copy | [Publish quick start](skills/uxd-prototype-publish/README.md) | [Usage and full options](skills/uxd-prototype-publish/SKILL.md#flags) |

The creator confirms a plan before building. During creation, keep the localhost preview beside Codex and steer early when implementation needs PatternFly guidance. After evaluation, review failures and flagged findings before publishing.

These skills also work in other supported assistants; invocation and connection settings differ by tool.

## Prepare for a run

- Review the source requirements and make acceptance criteria specific and observable.
- Check that the services you need, such as Jira or Figma, are connected and authenticated. Reconnect and verify a small lookup after an authentication failure.
- Install each skill's required dependencies before running it; plugin installation alone does not install browser tooling.
- Keep scope focused and agree on checkpoints. Use the approved team Slack spend-tracking bot or usage dashboard to monitor spend.

See [Cost Savings & Best Practices](../../docs/prototype-cost-best-practices.md) for criteria examples, model choices, context controls, and live steering.
