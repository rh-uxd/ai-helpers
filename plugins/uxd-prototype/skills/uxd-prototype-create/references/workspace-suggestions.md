# Suggest a starting point

Use explicit `--workspace` or an already selected prototype first. Otherwise inspect project guidance and prior `workspace-analysis.json` / `metadata.json` artifacts relevant to the feature. Reuse established project-to-codebase mappings when available; do not scan unrelated folders or guess repository names from Jira keys.

Projects may optionally keep `.uxd/prototype-workspaces.json` in the consumer project:

```json
{
  "mappings": [
    {
      "jiraHost": "jira.example.com",
      "projectKey": "PROJ",
      "label": "Product console prototype",
      "workspace": "https://git.example.com/design/console-prototype.git",
      "workspaceBranch": "main"
    }
  ]
}
```

Match both the exact Jira hostname and project key. If only a ticket key is known, resolve the Jira instance before using a mapping. Multiple matches are alternatives to offer, not a reason to pick silently. A local workspace path is also supported; resolve relative paths against the consumer project. Check that local paths exist; remote candidates can be checked without cloning. A missing or inaccessible match should not prevent starting fresh.

Example: “This project's mapping points to Product console prototype. It already has the navigation and components for this area. We can build on that, use another prototype, or start fresh.” Cite the mapping or prior artifact as the source of the suggestion.

Do not require a mapping file or ask first-time users to configure one. Only save a new mapping when the user asks to remember their choice. Keep private hosts and paths in local configuration according to the project's conventions. A mapping suggests where to build; it never sets a publishing target or authorizes publishing.
