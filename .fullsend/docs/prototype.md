# Prototype Agent

Generates PatternFly-based UX prototypes from feature descriptions in GitHub
issues or Jira tickets. Produces a standalone HTML prototype, user journey
definitions, page state coverage, and a QE-companion design spec.

## When to use

Label an issue `ready-to-prototype` or comment `/fs-prototype` on an issue
that describes a feature you want to visualize. The agent generates a
prototype and opens a draft PR with the result.

## Prerequisites

- Fullsend must be installed in the repository (`.fullsend/config.yaml` +
  GitHub App)
- The prototype agent must be registered in the repository's
  `.fullsend/config.yaml`:

```yaml
agents:
  - name: prototype
    source: harness/prototype.yaml
    model: google-vertex/gemini-3.8-flash  # or sonnet/opus
```

- For Jira-triggered runs, the Jira poller workflow must be configured

## Issue requirements

The preflight check classifies the issue into a tier based on **extractable
content** — not text formatting. It checks for what `uxd-prototype-create`
Step 4 actually consumes: user needs, flows, and entities.

### Core signals (need at least 2 of 3 to proceed)

| Signal | What the pre-script looks for | Without it, the agent... |
|--------|------------------------------|--------------------------|
| **User need** | Description with 50+ words describing who needs what | Invents a use case from the title alone |
| **Flows** | Action verbs suggesting user workflows ("create," "manage," "configure") | Guesses at journeys with no grounding |
| **Entities** | Concrete nouns the user works with ("projects," "API keys," "pipelines") | Generates generic placeholders |

If the issue has fewer than 2 core signals, the agent comments with a
fillable checklist of what's missing and removes the label. No AI tokens
are used (~$0.00).

**API-only tickets** (no UI component) are always rejected — the prototype
agent generates UI prototypes and cannot prototype backend-only features.

### Tiers

| Tier | Signals | What happens |
|------|---------|-------------|
| **Reject** | <2 core signals | Comment with checklist. Stop. $0.00. |
| **Basic** | 2+ core signals, no enrichments | Prototype with explicit assumption markers in PR body |
| **Full** | 3 core signals + enrichments | Full prototype with grounded journeys and states |

### Enrichments (improve quality, never block)

- **State triggers** — mentions of empty, error, loading, or permission states
- **Figma link or screenshot** — design reference for layout and components
- **Acceptance criteria** — testable conditions for "done"
- **Target codebase** — builds within an existing repo instead of standalone
- **Persona** — which user role the prototype targets (defaults to "application user")

## Triggers

| Trigger | Source | How it works |
|---------|--------|-------------|
| `ready-to-prototype` label | GitHub issue | Fullsend dispatch workflow detects the label |
| `/fs-prototype` comment | GitHub issue | Fullsend dispatch workflow detects the slash command |
| `ready-to-prototype` label | Jira issue | Jira poller dispatches via GitHub |
| `/fs-prototype` comment | Jira issue | Jira poller dispatches via GitHub |

## What you get

When the agent completes, you receive:

1. **A draft PR** with the prototype code and artifacts
2. **A comment on your issue** (GitHub or Jira) with a link to the PR

The PR contains:

| Artifact | Path | Description |
|----------|------|-------------|
| Prototype | `artifacts/{ID}/prototype/` | Standalone HTML with PatternFly |
| Journeys | `artifacts/{ID}/journeys.json` | User journey definitions |
| States | `artifacts/{ID}/states.json` | Page state definitions |
| Design spec | `artifacts/{ID}/{ID}-design-spec.md` | QE companion document |
| Metadata | `artifacts/{ID}/metadata.json` | Provenance and configuration |

## How to preview

After the PR is created, clone the branch and serve the prototype locally:

```bash
git fetch origin prototype/ISSUE-123
git checkout prototype/ISSUE-123
npx serve artifacts/ISSUE-123/prototype/
```

Open `http://localhost:3000` in your browser. Use URL parameters to switch
states: `?state=empty`, `?state=loading`, `?state=error`.

## Configuration

### Model selection

The agent defaults to the model specified in `config.yaml`. Override per-run
with `fullsend agent set prototype --model sonnet`.

| Model | Use case | Cost |
|-------|----------|------|
| Haiku | Not recommended — prototype quality too low | Lowest |
| Sonnet | Good for testing and iteration | Moderate |
| Opus | Production quality prototypes | Highest |

### Environment variables

| Variable | Scope | Description |
|----------|-------|-------------|
| `ISSUE_URL` | Sandbox | Canonical work item URL |
| `ISSUE_NUMBER` | Sandbox | Issue number or Jira key |
| `REPO_FULL_NAME` | Sandbox | Repository slug |
| `FULLSEND_TRACKER` | Sandbox | `jira` when source is Jira |

## Architecture

The prototype agent is a **custom agent** — same architecture pattern as
`fullsend-ai/rfe-creator`. It has its own harness, pre-script, validation
schema, and docs with no `base:` chain to the upstream code agent.

### Skills loaded

- `prototype-context` — Fullsend sandbox adapter (env var mapping, output contract, PF component guidance)

The `prototype-context` skill provides the autonomous prototyping
instructions. The interactive `uxd-prototype-create` skill in
`plugins/uxd-prototype/` is the Claude Code counterpart for human-in-the-loop
prototyping.

## Limitations

- **No live preview URL** — the prototype must be served locally. GitHub
  Pages or Vercel preview deployment is a planned follow-up.
- **Standalone only** — workspace integration (building within an existing
  codebase) is not yet supported in autonomous mode.
- **No interactive design decisions** — the agent uses sensible defaults.
  Human-in-the-loop design choices require the interactive
  `uxd-prototype-create` skill in Claude Code or Cursor.
- **No Figma rendering** — the agent reads Figma metadata but cannot
  screenshot or render Figma designs without the Figma MCP.
