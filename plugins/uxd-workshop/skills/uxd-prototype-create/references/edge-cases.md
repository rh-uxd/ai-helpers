# Edge Cases

Handle these situations when they arise during prototype creation.

## Thin RFEs

If the RFE description is very short (< 50 words) or has no user stories:

1. Synthesize user stories from the title and whatever context exists
2. Warn the user: "This RFE has limited detail. I'll make reasonable assumptions — review the prototype carefully."
3. Record assumptions in `metadata.json` under `assumptions`

## API-Only Tickets

If the RFE describes backend/API work with no UI component:

1. Ask: "This looks like an API-only ticket. Should I prototype the UI that would consume this API?"
2. If yes, infer the UI from the API shape (CRUD operations → list/detail/create screens)
3. If no, stop gracefully

## Multiple Composing RFEs

When the user selects multiple RFEs that together form one feature:

1. Merge user stories from all RFEs into a single story set
2. Use the first (or parent) RFE's key as the prototype ID
3. Reference all keys in `metadata.json` under `source_rfes`
4. Design decisions should consider the combined scope

## Workspace Issues

| Problem | Resolution |
|---------|-----------|
| Clone fails (auth) | Ask the user to verify git credentials or provide SSH URL |
| Clone fails (SSL) | Script auto-retries with `GIT_SSL_NO_VERIFY=true` |
| Clone fails (not found) | Verify the URL with the user |
| Local path doesn't exist | Ask the user to verify the path |
| No package.json | Treat as unknown stack; ask user what framework they're using |
| Build fails before prototype | Warn user and proceed, noting pre-existing failures |

## Upstream Design Decisions

If the target codebase already uses patterns that conflict with the AI's recommendation:

1. Detect the existing pattern from codebase analysis
2. Default to consistency with the existing codebase
3. In decide mode, present the conflict: "The existing app uses X, but Y might be better for this feature. Which approach?"

## Jira Fallbacks

| Available | Behavior |
|-----------|----------|
| Atlassian MCP | Full Jira integration: fetch, label, link |
| `JIRA_*` env vars + fetch script | Fetch and label via REST API |
| Neither | Accept user description directly, skip labeling |
