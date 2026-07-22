# Output Formats

Schema definitions for artifacts produced by the prototype creation pipeline. Load this when writing artifact files to ensure correct structure.

## .artifacts/{ID}/workspace-analysis.json

Written during Step 6 (codebase analysis). Critical for workspace mode — `submit_to_repo.py` reads `branch`, `clone_url`, and optional `upstream_url` from this file.

```json
{
  "rfe_key": "PROJ-298",
  "workspace_path": ".artifacts/PROJ-298/workspace",
  "branch": "3.5",
  "clone_url": "https://gitlab.example.com/user/fork.git",
  "upstream_url": "https://gitlab.example.com/org/canonical.git",
  "tech_stack": {
    "framework": "react",
    "language": "typescript",
    "design_system": "patternfly-6",
    "bundler": "webpack",
    "test_framework": "jest"
  },
  "conventions": {
    "component_pattern": "functional components with hooks",
    "file_structure": "src/pages/ for routes, src/components/ for shared",
    "routing": "react-router v6",
    "state_management": "react context + hooks"
  },
  "relevant_areas": ["src/pages/pipelines/", "src/components/shared/DataTable.tsx"],
  "agent_instructions": "Found AGENTS.md — follow PatternFly conventions",
  "post_change_verification": {
    "lint_command": "npx eslint {files} --no-warn",
    "build_command": "npm run build",
    "rules": ["Remove unused imports", "0 ESLint errors required", "Build must pass"]
  }
}
```

`upstream_url` (alias `target_repo_url`) is set when `--target` was a git URL — the MR/PR base repo. Omit when publishing to the same project as `clone_url` / `origin`.

## .artifacts/{ID}/metadata.json

Written during Step 9. Tracks prototype state across creation and refinement. Uses the same terminology as `prototype-summary.yaml` for consistency.

```json
{
  "prototype_id": "PROJ-298",
  "title": "API Key Management",
  "source": {
    "type": "jira",
    "reference": "PROJ-298",
    "rfe_count": 1
  },
  "source_rfes": ["PROJ-298"],
  "sources": [
    {
      "kind": "rfe",
      "key": "PROJ-298",
      "label": "RFE",
      "url": "https://issues.redhat.com/browse/PROJ-298"
    }
  ],
  "build_mode": "existing-codebase",
  "decision_mode": "skip",
  "status": "draft",
  "iteration": 0,
  "workspace_path": ".artifacts/PROJ-298/workspace",
  "screens": ["ApiKeyList", "ApiKeyDetail", "CreateApiKeyWizard"],
  "journeys_path": ".artifacts/PROJ-298/journeys.json",
  "scenarios_path": ".artifacts/PROJ-298/scenarios.json",
  "prototype_bar": true,
  "exports": {
    "path": ".artifacts/PROJ-298/exports",
    "count": 0
  },
  "assumptions": [],
  "created_at": "2025-01-15T10:30:00Z",
  "updated_at": null,
  "refinement_history": []
}
```

Status values: `"draft"`, `"refined"`, `"reviewed"`, `"submitted"`.

Optional fields: `journeys_path`, `scenarios_path`, `prototype_bar`, `exports` (populated when `--export` runs), `source_rfes` (multi-RFE compose), `sources` (normalized provenance for the Prototype Bar), `figma_url`.

## .artifacts/{ID}/prototype-bar.json

Written during Step 9 (and refreshed by evaluate / publish-report). Runtime config for the Prototype Bar Sources dropdown and Prototype ↔ Eval switch. Prefer generating it with:

```bash
EXPORT_SKILL="${CLAUDE_SKILL_DIR}/../uxd-prototype-export"
node "${EXPORT_SKILL}/scripts/sync-prototype-bar-config.mjs" \
  --artifacts ".artifacts/{ID}"
```

Or write it directly from `metadata.json` fields. Schema: see `uxd-prototype-export/references/prototype-bar-config.md`.

```json
{
  "id": "PROJ-298",
  "title": "API Key Management",
  "jiraBaseUrl": "https://issues.redhat.com/browse/",
  "sources": [
    {
      "kind": "rfe",
      "key": "PROJ-298",
      "label": "RFE",
      "url": "https://issues.redhat.com/browse/PROJ-298"
    }
  ],
  "views": {
    "prototype": null,
    "eval": "/evals/PROJ-298/"
  },
  "scenarios": [
    { "route": "/api-keys", "id": "default", "name": "Populated list", "default": true },
    { "route": "/api-keys", "id": "empty", "name": "Empty state" }
  ]
}
```

`sources` is a single list for all provenance (outcome, RFE, strat, Figma, description). Outcome / strat entries are usually added later by evaluate when `outcome-context.json` exists. `views.eval` uses the conventional static path `/evals/{ID}/` so Pages hosting works once the report is copied there. `scenarios` is a slim flatten of `scenarios.json` (synced by `sync-prototype-bar-config.mjs`) for the bar Scenario menu.

## .artifacts/{ID}/changeset.md

Written during Step 10 (workspace mode). Lists all files affected.

```markdown
---
prototype_id: PROJ-298
type: changeset
created_at: 2025-01-15T10:30:00Z
---

# Changeset — PROJ-298

## New Files
- `src/pages/ApiKeys/ApiKeyList.tsx` — List view with table and toolbar
- `src/pages/ApiKeys/ApiKeyDetail.tsx` — Detail drawer component
- `src/pages/ApiKeys/CreateApiKeyWizard.tsx` — Creation wizard (3 steps)

## Modified Files
- `src/routes.tsx` — Added /settings/api-keys routes
- `src/components/Navigation/Sidebar.tsx` — Added "API Keys" nav item
```

Refinements append sections:

```markdown
## Refinement 1 (2025-01-15)

### Modified Files
- `src/pages/ApiKeys/ApiKeyList.tsx` — Added empty state, loading skeleton
```

## .artifacts/{ID}/prototype-summary.yaml

Written during Step 9. Structured summary of the prototype for downstream skill consumption. This is the primary machine-readable output — `uxd-prototype-evaluate`, `uxd-prototype-publish`, and pipeline orchestrators read this file to understand what was built and how.

```yaml
prototype_summary:
  prototype_id: PROJ-298
  title: API Key Management

  # What was built from — the initial source material
  source:
    type: jira               # jira | figma | description | idea
    reference: PROJ-298      # Jira key, Figma URL, or omitted for freeform input
    rfe_count: 1             # number of RFEs incorporated

  # How the prototype was built
  build_mode: existing-codebase  # standalone-html | existing-codebase
  decision_mode: skip            # skip | auto | human (legacy: decide/interactive → human)
  # decision_depth: normal       # under | normal | over — only when decision_mode is auto or human
  # decisions_count: 5           # only when decision_mode is auto or human

  # What was produced
  files_created: 3
  files_modified: 2
  screens:
    - ApiKeyList
    - ApiKeyDetail
    - CreateApiKeyWizard
  journeys_path: .artifacts/PROJ-298/journeys.json
  scenarios_path: .artifacts/PROJ-298/scenarios.json
  prototype_bar: true
  prototype_path: .artifacts/PROJ-298/workspace  # or .artifacts/PROJ-298/prototype/ for standalone

  # Optional — present after create --export
  exports:
    path: .artifacts/PROJ-298/exports
    count: 2
    manifest: .artifacts/PROJ-298/exports/export-manifest.json
    index: .artifacts/PROJ-298/exports/index.html

  # Iteration state
  iteration: 0
  status: draft              # draft | refined | reviewed | submitted

  # Verification results (existing-codebase only; omitted for standalone-html)
  verification:
    status: pass             # pass | fail | skipped
    lint: pass
    build: pass
    typecheck: pass

  # Timestamps
  created_at: "2025-01-15T10:30:00Z"
  updated_at: null
```

### Field reference

| Field | Type | Description |
|---|---|---|
| `source.type` | enum | What the prototype was created from: `jira` (ticket), `figma` (design link), `description` (plain text feature description), `idea` (rough concept synthesized via follow-ups) |
| `source.reference` | string | The Jira key, Figma URL, or omitted when the source was freeform text |
| `source.rfe_count` | int | Number of RFEs merged into this prototype (1 for single-ticket, 2+ for composed features) |
| `build_mode` | enum | `standalone-html` — self-contained HTML/CSS/JS with PatternFly CDN. `existing-codebase` — modifications to a cloned product repo |
| `decision_mode` | enum | `skip` — no decision kit; design calls made while building. `auto` — AI resolved decisions with batch summary override. `human` — user picked from HTML comparison pages one at a time. Maps 1:1 from `--decisions`. |
| `decision_depth` | enum | `under` (2–3), `normal` (4–7), or `over` (8–12). Only present when `decision_mode` is `auto` or `human` |
| `status` | enum | `draft` (initial creation), `refined` (after refinement pass), `reviewed` (after evaluation), `submitted` (pushed to repo) |
| `verification` | object | Post-change verification results. Only present for `existing-codebase` builds. Omit entirely for `standalone-html` |
| `prototype_path` | string | Relative path to the prototype files |

### Refinement updates

When the refinement procedure runs, update `prototype-summary.yaml` in place:

```yaml
  # After refinement, these fields change:
  iteration: 1
  status: refined
  files_modified: 4          # cumulative
  updated_at: "2025-01-16T09:00:00Z"

  # Append refinement history
  refinements:
    - iteration: 1
      findings_addressed: 4
      score_before: "3/6"
      score_after: "5/6"
      applied_at: "2025-01-16T09:00:00Z"
```

## .artifacts/{ID}/journeys.json

Written during Step 4 (and kept in sync if flows change). Drives implementation reachability in Step 8 and batch export via `uxd-prototype-export`. Full action vocabulary: `uxd-prototype-export/references/journeys-schema.md`.

```json
{
  "prototype_id": "PROJ-298",
  "extracted_at": "2025-01-15T10:30:00Z",
  "journeys": [
    {
      "id": "journey-1",
      "title": "Create API key",
      "persona": "app-developer",
      "source": "jira",
      "ac_ids": ["AC-1"],
      "steps": [
        {
          "id": "list",
          "name": "API key list",
          "route": "/api-keys",
          "export": true
        },
        {
          "id": "open-create",
          "name": "Create modal open",
          "route": "/api-keys",
          "export": true,
          "actions": [
            { "type": "click", "selector": "[data-ouia-component-id=\"create-api-key\"]" },
            { "type": "wait_for", "selector": "[role=\"dialog\"]" }
          ]
        }
      ]
    }
  ]
}
```

| Field | Description |
|-------|-------------|
| `steps[].route` | Path relative to the prototype base URL |
| `steps[].export` | When `true`, included in create `--export` / `export-journey.mjs` |
| `steps[].actions` | Optional UI actions before capture (open modal, fill, wait) — not only distinct URLs |

Also keep the flat `screens` list in `metadata.json` / `prototype-summary.yaml` as a convenience index of screen names.

## .artifacts/{ID}/scenarios.json

Written during Step 4 (kept in sync if pages/conditions change). Sibling to `journeys.json`. Catalog of **data/condition variants** per page (empty, load error, validation, alternate selection). Interaction states (modal open) stay in journey `actions` — not scenarios.

Full schema: `uxd-prototype-export/references/scenarios-schema.md`. Mock wiring: [scenario-mocks.md](scenario-mocks.md).

```json
{
  "prototype_id": "PROJ-298",
  "extracted_at": "2025-01-15T10:30:00Z",
  "pages": [
    {
      "route": "/api-keys",
      "screen": "ApiKeyList",
      "scenarios": [
        {
          "id": "default",
          "name": "Populated list",
          "description": "Happy path with several API keys",
          "default": true
        },
        {
          "id": "empty",
          "name": "Empty state",
          "description": "No API keys yet"
        },
        {
          "id": "load-error",
          "name": "Load error",
          "description": "Failed to fetch keys"
        }
      ]
    }
  ]
}
```

| Field | Description |
|-------|-------------|
| `pages[].route` | Must match journey step routes |
| `pages[].scenarios[].id` | Filename-safe (`[a-z0-9-]+`); used in `?scenario=<id>` and export filenames |
| `pages[].scenarios[].default` | Exactly one `true` per page (or imply `id: "default"`) |

Every journey route needs at least a `default` scenario. Export captures each exportable journey step × each scenario for that step’s route.

## .artifacts/{ID}/verification.json

Written during Step 10 (workspace mode post-change verification).

```json
{
  "lint": {"status": "pass", "warnings": 2, "errors": 0},
  "build": {"status": "pass"},
  "typecheck": {"status": "pass"}
}
```

## resolve_workspace.py Output

JSON output from the workspace resolution script:

```json
{
  "type": "git",
  "original_url": "https://gitlab.example.com/org/repo/-/tree/3.5?ref_type=heads",
  "clone_url": "https://gitlab.example.com/org/repo.git",
  "branch": "3.5",
  "branch_source": "url",
  "clone_path": ".artifacts/PROJ-298/workspace",
  "upstream_url": "https://gitlab.example.com/org/canonical.git",
  "upstream_remote": "set",
  "status": "cloned"
}
```

`upstream_url` / `upstream_remote` appear when `--upstream` is passed (from a `--target` git URL).
