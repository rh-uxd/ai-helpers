---
name: prototype-context
description: Fullsend sandbox adapter for the prototype agent — maps environment variables to skill inputs and defines the output contract.
---

# Prototype Context

Adapter between the Fullsend sandbox environment and the
`uxd-prototype-create` skill. The prototype skill defines the full workflow;
this skill maps sandbox inputs to skill arguments and defines the
Fullsend-specific output contract.

## Environment → Skill Input Mapping

| Sandbox variable | Skill input | Notes |
|------------------|-------------|-------|
| `$ISSUE_URL` | What to prototype | Parse the issue body for the feature description |
| `$ISSUE_NUMBER` | Prototype ID | Used as `{ID}` in artifact paths |
| `$REPO_FULL_NAME` | Context | Repository the prototype targets |
| `$FULLSEND_OUTPUT_DIR` | Result location | Write `agent-result.json` here |
| `$FULLSEND_FORGE` | Forge type | `github` or `gitlab` |

## Autonomous Execution Defaults

The `uxd-prototype-create` skill is designed for interactive use. In the
Fullsend sandbox, apply these defaults:

- `--decisions skip` — build with sensible defaults, no human interaction
- `--workspace standalone` — self-contained HTML unless issue specifies otherwise
- `--prototype-bar` — enable state switching toolbar
- `--dry-run` off — write artifacts normally

Do not run the conversational onboarding flow. Extract the feature
description from the issue body and proceed directly to prototype generation.

## Output Contract

The agent writes `$FULLSEND_OUTPUT_DIR/agent-result.json` validated against
`prototype-result.schema.json`:

| Field | Required | Type | Description |
|-------|----------|------|-------------|
| `target_branch` | Yes | string | PR target branch |
| `prototype_id` | Yes | string | Artifact ID (issue key) |
| `prototype_type` | Yes | enum | `standalone` or `workspace` |
| `journeys_count` | Yes | integer | Number of user journeys |
| `pr_body` | No | string | PR description with "How to Preview" instructions and artifact listing |
| `closes_issue` | No | boolean | Always `false` for prototypes |
