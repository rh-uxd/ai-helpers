# Set up Codex for UX prototyping

Start in the Codex app using your organization's approved account and available plugins. Manual skill copying is a fallback for workspaces without the required plugins.

The prototyping skills are created by the **UX RHAI First team**. See the [working document](https://docs.google.com/document/d/14eVN5kyDNWaS1M8cR-p8DQ9BDQOn73fcq8PZvy_WQAo/edit?tab=t.0#heading=h.7bxejv31jp0w) for ongoing guidance.

## 1. Sign in and enable plugins

1. Install the app using the [official Codex quickstart](https://developers.openai.com/codex/quickstart/).
2. Sign in through your organization's approved route, including SSO when offered, and select the intended workspace.
3. Open the plugin directory and enable or install the UXD plugins available to you. For prototyping, look for **uxd-prototype**; **uxd-assist** helps find workflows and **uxd-design** provides related design tools.
4. Review the included skills and complete any app-connection prompts. If the prototype skill is absent, ask for help in `#forum-rhai-uxd-ai-enablement` on Slack. You can also use the [manual fallback](#manual-installation-fallback).

**Sign-in, plugin access, and updates are separate.** SSO authenticates your account. Workspace policy controls which plugins you can use. An administrator-managed GitHub marketplace can keep plugin packages synced, so users do not need to pull the repository manually. Connected apps still need their own authorization. Availability and controls vary by workspace and rollout; see [OpenAI's plugin guidance](https://help.openai.com/en/articles/20001256-plugins-in-codex).

## 2. Check connections before a run

Enable only the services the task needs:

| Service | When needed |
|---------|-------------|
| Atlassian/Jira | Live issue lookup. If unavailable, provide the issue details and acceptance criteria yourself. |
| Figma | Reading a design directly. Screenshots and supplied design requirements are an alternative. |
| PatternFly MCP | Looking up component documentation, properties, and design guidance; see [PatternFly MCP setup](../FAQ.md#how-do-i-test-a-skill-without-the-patternfly-mcp-server). |
| GitHub or GitLab | Publishing to the chosen destination; see [publish setup](../plugins/uxd-prototype/skills/uxd-prototype-publish/README.md#setup). |

Check required connections in the plugin/app settings before each session and after an authentication error. A plugin can remain installed while an app connection has expired. For Jira work, first ask Codex to retrieve the issue title and acceptance criteria; verify the result before starting a build or evaluation.

If a lookup fails, pause the workflow, reconnect or re-authenticate the affected app, and retry the small lookup. Repeated authentication failures are a reason to fix the connection rather than retry the full workflow. Never paste access tokens into prompts or repository files.

## 3. Run a prototype skill

Open the project where you want to save the prototype. Select the skill from the picker, or type `$` and its name when supported:

```text
$uxd-prototype-create Prototype PROJ-298 --workspace standalone
```

The creator asks about your source, workspace, and design decisions, then presents a Prototype Plan for confirmation. `--workspace` selects the codebase to build in; `--target` selects a later publishing destination.

| Next step | Skill-specific guide |
|-----------|----------------------|
| Create or refine a prototype | [Create README](../plugins/uxd-prototype/skills/uxd-prototype-create/README.md) |
| Evaluate acceptance criteria and usability | [Evaluate README](../plugins/uxd-prototype/skills/uxd-prototype-evaluate/README.md) |
| Capture pages or export journey steps | [Export README](../plugins/uxd-prototype/skills/uxd-prototype-export/README.md) |
| Share a reviewed prototype | [Publish README](../plugins/uxd-prototype/skills/uxd-prototype-publish/README.md) |

The skill READMEs list their requirements and options. Evaluation and browser export need dependencies and Playwright Chromium installed in the corresponding skill directory; plugin installation does not perform that setup for you.

## 4. Watch and steer the work

Keep the localhost preview beside Codex while the prototype is running. Watch the page updates, activity messages, tool results, and build logs as work progresses. Interrupt or send a steering message as soon as the implementation drifts from your requirements.

For example:

```text
Use PatternFly components and design tokens for this screen. Check the available PatternFly guidance before continuing, then update the preview so I can review it.
```

For larger work, agree on a plan and checkpoints before execution. Review the first working page before expanding to the rest of the journey.

## 5. Track context and spend

Codex's context indicator helps you see how much conversation context is in use; it does not establish the billed cost of a workflow. Check the approved team Slack spend-tracking bot or usage dashboard before a large run and after substantial work. Follow your organization's access and budget policy.

ChatGPT-linked access and API-key authentication have different billing paths. Some bundled scripts need separately approved API credentials; signing into Codex does not supply those credentials or authorize paid API execution.

Keep each chat focused on one goal. Use specific acceptance criteria and bounded evaluator iterations, and stop repeated failed work early. See [Cost Savings & Best Practices](prototype-cost-best-practices.md) for examples and screenshots.

## Manual installation fallback

Use this only when the needed skills are unavailable through your workspace's plugins. From an updated ai-helpers checkout, copy complete skill folders so bundled scripts and references come with them:

```bash
mkdir -p ~/.agents/skills
cp -R plugins/uxd-prototype/skills/uxd-prototype-create ~/.agents/skills/
cp -R plugins/uxd-prototype/skills/uxd-prototype-evaluate ~/.agents/skills/
cp -R plugins/uxd-prototype/skills/uxd-prototype-export ~/.agents/skills/
cp -R plugins/uxd-prototype/skills/uxd-prototype-publish ~/.agents/skills/
```

For a project-local install, use `.agents/skills/` instead. See the [Codex skills guide](https://developers.openai.com/codex/skills/) for supported locations and invocation. Review local customizations before recopying; manually copied skills require manual updates. Avoid keeping a manual copy alongside an installed plugin that provides the same skill.

Copying skills from Cursor or Claude Code transfers the skill files and bundled resources. Configure app connections, credentials, permissions, and assistant-specific settings separately in Codex.
