---
name: uxd-jira-ticket-plan
version: 0.1.0
description: >-
  Generate a codebase-mapped implementation plan from a Jira ticket, then ask
  whether to start guided implementation. Use when the user shares a Jira
  ticket link, issue key (e.g. PROJ-123), or asks to plan, break down, or
  implement a Jira ticket.
---

# Jira Ticket Plan

Turn a Jira ticket into a concrete, codebase-mapped plan. **Stop after the plan** and ask whether to start guided implementation. Implement only after the user says yes.

## Requirements

The fallback fetch script needs Python 3 (stdlib only). Check before running it:

```bash
command -v python3 >/dev/null 2>&1 || { echo "Error: This skill requires Python 3." >&2; exit 1; }
```

If Atlassian / Jira MCP is available, prefer it. The script is the no-MCP fallback. It needs `JIRA_TOKEN` or `JIRA_API_TOKEN`, plus `JIRA_SERVER` when the user did not pass a full ticket URL. `JIRA_USER` is the Atlassian account email (Basic auth). Create a token at https://id.atlassian.com/manage-profile/security/api-tokens.

## Hard gate

1. Produce the analysis first.
2. Ask: **Do you want guidance implementing these changes?**
3. Wait for the answer. Do not edit files, create branches, or start coding in the same turn as the analysis.
4. If the user says yes (or equivalent: "go", "implement", "start"), begin guided implementation immediately.
5. If the user says no, stop. Offer to refine the plan only if they ask.

Use an interactive question when available, with options **Yes, start implementing** and **No, plan only**. Otherwise ask in chat and wait.

## Workflow

### 1. Parse the ticket

Extract an issue key (`[A-Z][A-Z0-9]+-\d+`) from the user message. Accept:

- Browse URLs: `https://issues.example.com/browse/PROJ-123`
- Jira/issue URLs: `.../jira/browse/PROJ-123`, `.../issues/PROJ-123`
- Bare keys: `PROJ-123`

If no key is present, ask for a Jira URL or key. Do not guess.

### 2. Fetch the ticket

Try in this order. Stop at the first complete result (summary + description, or enough text to plan):

1. **Atlassian / Jira MCP** (if available) — fetch the issue by key. Authenticate only if the MCP server reports that it needs auth or a call fails with an auth error.
2. **Fetch script** — run:

   ```bash
   python3 "${CLAUDE_SKILL_DIR}/scripts/fetch_jira.py" "<URL-or-key>" --markdown
   ```

   The script infers the Jira host from a full URL. Otherwise it needs `JIRA_SERVER`. Auth: `JIRA_USER` + `JIRA_TOKEN` (or `JIRA_API_TOKEN`). If stdin is a TTY and those are missing, the script prompts for them.
3. **Fetch the browse URL** if the user provided one and it is publicly readable.
4. **Ask for API credentials** if MCP is missing and the script failed because `JIRA_TOKEN` is unset (this is the normal no-MCP path). Do not skip this and jump straight to a paste.

   Tell the user to create a token at https://id.atlassian.com/manage-profile/security/api-tokens (Create API token → copy it once). Ask for:

   - Atlassian account email → `JIRA_USER`
   - The API token → `JIRA_TOKEN`

   Then retry **once** with inline env (do not echo the token in the plan, commit it, or write it to the repo):

   ```bash
   JIRA_USER="<email>" JIRA_TOKEN="<token>" python3 "${CLAUDE_SKILL_DIR}/scripts/fetch_jira.py" "<URL-or-key>" --markdown
   ```

   Do not write credentials to `~/.zshrc`, `.env`, or any file unless the user explicitly asks to persist them.
5. **Ask the user** to paste the title, description, and acceptance criteria only if they decline to provide a token, or if the authenticated fetch still fails.

Never invent ticket contents. If fetch fails after the credential retry, say so and ask for a paste.

Read comments, linked issues, and acceptance criteria when they are present. Prefer the latest description and AC over stale comments.

### 3. Map to the current workspace

Search the open workspace before writing the plan:

- Keywords from the summary, description, error messages, and component/label names
- Likely files: models, controllers, APIs, UI, tests, docs
- Existing patterns for similar behavior
- Tests that already cover the area

If the workspace is unrelated to the ticket, say so and plan at a product/architecture level instead of inventing file paths.

### 4. Write the analysis

Use this structure. Keep steps ordered and specific. Cite real files with the project's code-citation format when you found them.

```markdown
# [KEY]: [Summary]

**Type:** … | **Status:** … | **Priority:** …
**Link:** [ticket URL]

## Goal
One or two sentences: what done looks like.

## Acceptance criteria
- Bullet the ticket AC. If none are written, infer them and label them **Inferred**.

## Current behavior vs desired
- What the code/product does now
- What must change

## Affected areas
- `path/to/file` — why it matters
- Tests: `path/to/test`

## Step-by-step plan
1. **…** — concrete action, files, and why
2. **…**
3. **…**

## Risks and open questions
- Ambiguities that would change the implementation
- Out-of-scope items from the ticket

## Test plan
- Unit / integration / UI checks that would prove the AC
```

Rules for the plan:

- Steps are implementation actions, not a restatement of the ticket.
- Each step should be small enough to do in one focused change.
- Call out migrations, API/UI contract changes, i18n, permissions, and tests when relevant.
- Do not skip tests if the repo has them.
- Flag product decisions; do not silently pick them.

### 5. Ask to implement

End the analysis turn with the question. Do not start work.

### 6. Guided implementation (only after yes)

Start immediately. Work the plan in order:

- Say which step you are on and what you will change before editing.
- Follow existing project conventions (commit style, tests, i18n, lint).
- Keep scope to the ticket. Do not drive-by refactor.
- After each meaningful chunk, briefly confirm what landed and what is next.
- If a step is blocked by an open question, stop and ask — do not guess product behavior.
- Do not commit unless the user asks.

If the user later says to continue, resume from the next unfinished step.
