---
name: uxd-jira-ticket-plan
version: 0.1.0
description: >-
  Generate a codebase-mapped implementation plan from a Jira ticket, then ask
  whether to show the plan only, implement the whole plan, or go step by step.
  Use when the user shares a Jira ticket link, issue key (e.g. PROJ-123), or
  asks to plan, break down, or implement a Jira ticket.
---

# Jira Ticket Plan

Turn a Jira ticket into a concrete, codebase-mapped plan. **Stop after the plan** and ask how to proceed. Implement only after the user chooses whole plan or step by step.

## Requirements

The fallback fetch script needs Python 3 (stdlib only). Check before running it:

```bash
command -v python3 >/dev/null 2>&1 || { echo "Error: This skill requires Python 3." >&2; exit 1; }
```

If Atlassian / Jira MCP is available, prefer it. The script is the no-MCP fallback. It needs `JIRA_TOKEN` or `JIRA_API_TOKEN`, plus `JIRA_SERVER` when the user did not pass a full ticket URL. `JIRA_USER` is the Atlassian account email (Basic auth). Create a token at https://id.atlassian.com/manage-profile/security/api-tokens.

## Hard gate

1. Produce the analysis first. The user-facing message must include the **complete numbered plan** before any question.
2. Only after that plan is written, ask how to proceed. Do not ask in a turn that only did research; the plan must already be visible.
3. Wait for the answer. Do not edit files, create branches, or start coding in the same turn as the analysis.
4. If the user says **show plan only**, stop. Offer to refine the plan only if they ask.
5. If the user says **implement whole plan** or **implement plan step by step**, ask about the git branch next (see Branch). Do not start coding until they answer.
6. If the user says **implement whole plan**, implement all remaining steps in order.
7. If the user says **implement plan step by step**, implement only the next unfinished plan step, then stop and ask before the following step.

Use an interactive question when available:

- Prompt: **How should we proceed?**
- Options (use this wording):
  - show plan only
  - implement whole plan
  - implement plan step by step

Otherwise ask in chat and wait.

If the user later switches mode (for example “just finish the rest”), follow that.

### Branch

After they choose whole plan or step by step, and **before any file edits**, ask whether to create a branch or stay on the current one. Ask this once per ticket, not before every step.

Use an interactive question when available:

- Prompt: **Create a new branch, or develop on the current one?**
- Options (use this wording):
  - create a new branch
  - develop on the current branch

If **create a new branch**: create a branch named from the ticket key and a short slug (for example `PROJ-123-short-slug`). Then implement on that branch.

If **develop on the current branch**: stay on HEAD and implement there.

Do not commit unless the user asks.

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

### 5. Ask how to proceed

End the analysis turn with the full plan and then the question. Do not start work.

### 6. Implementation (only after whole plan or step by step)

Resolve the branch question first. Before any file edits, **show the whole numbered plan again**. Then implement. Do not start coding in a turn that has not yet displayed that plan.

Follow existing project conventions (commit style, tests, i18n, lint). Keep scope to the ticket. Do not drive-by refactor. Do not commit unless the user asks. If a step is blocked by an open question, stop and ask — do not guess product behavior.

**Every implementation turn** must open with the current step, then say what you will change, then edit:

```markdown
Implementing step N of M: **[step title from the plan]**
```

After the step lands, briefly confirm what changed. If more steps remain in whole-plan mode, announce the next step the same way before touching files.

#### Whole plan

Re-show the full plan, then work remaining numbered steps in order. Before each step, print `Implementing step N of M: **…**`. After each step, say what landed. Do not wait for approval between steps unless blocked.

#### Step by step

1. Re-show the full plan (or the remaining steps) if it is not already in this turn.
2. Print `Implementing step N of M: **…**` for the next unfinished step.
3. Implement **only that step**. Stop. Do not start the following step.
4. Ask: **Continue to step N?** (next unfinished number). Also allow skip this step, switch to whole plan, or stop.
5. Wait for the answer before any further edits.
6. Repeat until the plan is done or the user stops.

If the user later says to continue, resume from the next unfinished step and announce it with `Implementing step N of M` before editing.

### 7. Checks (when implementation is done)

After all plan steps are finished, **do not run tests or lint on your own**. Detect what this repo actually has, then ask.

Look in the repo you changed (plugin vs core when both exist):

- `package.json` scripts: `test`, `lint`, or similarly named scripts
- Other manifests the project already uses for tests and lint

List the commands you found in the message. Then ask. Use an interactive multi-select question when available.

- Prompt: **Which checks should I run? You can select more than one.**
- Options (include only those that exist in this repo; always include skip):
  - run unit tests
  - run lint
  - skip checks

If they pick **run unit tests** and/or **run lint**, run the matching commands (scoped to the files you changed when the tool allows). Report pass/fail. If they pick **skip checks**, skip.

Then write the PR description (section 8).

### 8. PR description (when implementation is done)

When all plan steps are finished (or the user says the work is done), write a **summary of changes in markdown**. Do this after the checks question (and after any checks they asked to run). Do not open a PR unless the user asks.

**Output format (required):** put the entire description in a fenced markdown code block so the user can copy the raw markdown:

````
```markdown
…filled description here…
```
````

Do not only render it as chat headings. The fenced block is the deliverable.

Look for a template in the repo (first match wins):

- `.github/PULL_REQUEST_TEMPLATE.md`
- `.github/pull_request_template.md`
- `.github/PULL_REQUEST_TEMPLATE/*.md`
- `docs/pull_request_template.md`
- `PULL_REQUEST_TEMPLATE.md`

**If a template exists:** fill every section from what was implemented. Keep the heading text. Do not delete template headings. Leave a section empty only if it truly does not apply, and say so.

**If there is no template:**

```markdown
## Summary
- What changed and why (ticket key + link)

## Test plan
- How to verify
```

Base the text on the actual diff, not the original plan if they diverged. Include the Jira key and link.
