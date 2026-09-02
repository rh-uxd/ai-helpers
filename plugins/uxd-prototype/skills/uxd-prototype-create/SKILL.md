---
name: uxd-prototype-create
version: 1.0.0
description: >-
  Create or refine a UX prototype from a Jira ticket, Figma design, feature
  description, or rough idea. Enumerates user journeys and page scenarios
  (empty/error/alternate conditions), wires mock data via ?scenario=, and
  supports export of each step × scenario. Use when starting a new prototype,
  integrating into an existing codebase, generating standalone HTML, or applying
  evaluation feedback.
---

# Create Prototype

Builds a prototype from a Jira ticket, Figma file, feature description, or rough idea. Asks clarifying questions for anything missing, then writes a runnable prototype plus structured artifacts that `uxd-prototype-evaluate`, `uxd-prototype-export`, and `uxd-prototype-publish` consume.

Family: **create → evaluate → publish** (optional export along the way). Pipeline mode: [references/pipeline-mode.md](references/pipeline-mode.md).

**Workspace vs target:** `--workspace` is the codebase you build in (clone, generate, verify). `--target` is only where the MR/PR lands. Never clone or generate against the target repo.

## Inputs

| Input | Required | Source |
|-------|----------|--------|
| What to prototype (Jira URL/key, Figma link, description, or idea) | **Yes** | User; skill asks if omitted |
| Workspace (`--workspace`) | No | Local path, git URL, or `standalone` (default) |
| Push destination (`--target`) | No | `none` unless publishing |
| Prior eval feedback | No | `.artifacts/{ID}/eval/` when refining |

If the user has not said what to prototype, **stop and ask** before writing files.

## Outputs

Written under `.artifacts/{ID}/` in the consumer project (never `${CLAUDE_SKILL_DIR}`):

| Output | Location |
|--------|----------|
| Prototype | `prototype/` (standalone HTML) or `code/` (workspace clone) |
| RFE snapshot, metadata, changeset, summary | `rfe-snapshot.md`, `metadata.json`, `changeset.md`, `prototype-summary.yaml` |
| Journeys + scenarios | `journeys.json`, `scenarios.json` |
| Prototype Bar config | `prototype-bar.json` |
| Design decisions | `decisions/` (only when `--decisions` is `auto` or `human`) |
| Optional exports | `exports/` when `--export` |

Schemas: [references/output-formats.md](references/output-formats.md).

## Flags

$ARGUMENTS

Parse as: `<source> [--workspace <path-or-url-or-standalone>] [--target <dest>] [--decisions skip|auto|human] …`

| Flag | Values | Default | Description |
|------|--------|---------|-------------|
| `--workspace` | path, git URL, or `standalone` | `standalone` | Codebase to build in |
| `--workspace-branch` | branch name | from URL / default branch | Clone branch |
| `--target` | `repo`, `github`, `gitlab`, `vercel`, `none`, or a git URL | `none` (pipeline) | Publish destination only. A git URL means open an MR/PR against that repo (implies `repo`) |
| `--target-branch` | branch name | `--workspace-branch` | MR/PR base on `--target` |
| `--decisions` | `skip`, `auto`, `human` | `skip` | Decision kit: none / AI picks / walk through with the user |
| `--depth` | `under`, `normal`, `over` | `normal` | Decision count when not `skip`: 2–3 / 4–7 / 8–12 |
| `--branch` | branch name | — | **Deprecated** alias for `--workspace-branch` |
| `--dry-run` | flag | off | Skip git and external writes; local artifacts still written |
| `--pipeline` / `--speedrun` | flag | off | Create → evaluate → refine → publish |
| `--prototype-bar` / `--no-prototype-bar` | flag | on | Sticky Prototype Bar after generate |
| `--export` | flag | off | Batch-export journey steps via `uxd-prototype-export` |
| `--url` | URL | asked if `--export` | Live base URL for export (and pipeline evaluate) |
| `--export-formats` | `html`, `tree`, `pf-spec` | `html,pf-spec` | Formats for `--export` |

A `--target` value that looks like a git URL (`https://`, `git@`, `ssh://`, or `.git`) is the MR/PR base. Pass it to `resolve_workspace.py --upstream`. `--workspace-branch` and `--target-branch` are independent (clone a fork at `main`, open the MR against upstream `release-2.22`).

---

## Conversational Onboarding

Before doing any work, ask these one at a time, wait for a response, and confirm the full picture.

### Question 1: What are we prototyping?

> What would you like to prototype? You can share:
> - A Jira ticket URL or key (e.g., `PROJ-298`)
> - A Figma design link
> - A plain-text description of the feature
> - Just a rough idea — I'll ask follow-ups

### Question 2: Building on an existing codebase?

> Should I integrate this into an existing codebase, or create a standalone HTML prototype?
> - **Existing codebase** — give me a local path or git URL. I'll clone it and build the prototype inside that codebase, matching its conventions.
> - **Standalone** — I'll generate self-contained HTML using PatternFly CDN. No build tools needed.

Default to standalone if the user isn't sure. A separate push target only affects where the MR lands.

### Question 3: How should design decisions be handled?

> How do you want to handle design decisions?
> - **Skip** — I'll make design calls as I build. No decision kit or recorded decision pages.
> - **Auto** — I'll generate visual HTML comparison pages, pick recommendations, and show a batch summary you can override.
> - **Human** — I'll generate visual HTML comparison pages for each decision, then ask you to pick one at a time.

Default to **skip**.

### Question 4: How deep should decision exploration go?

*Only ask if the user chose **auto** or **human**.*

> How many design decisions should I surface?
> - **Under** (2–3) — Quick exploration, simple features
> - **Normal** (4–7) — Most prototypes
> - **Over** (8–12) — Complex features, lots of creative latitude

Default to normal.

### Confirm and Proceed

Print a summary and ask for confirmation before starting. Omit `Depth` when decisions are `skip`:

```
Prototype Plan:
  Source:         PROJ-298 (Jira)
  Workspace:      standalone
  Target:         none
  Decisions:      skip
  Prototype bar:  on
  Export:         off
```

---

## Step 1: Fetch RFE Source

1. **Local artifacts** — `.artifacts/*/rfe-snapshot.md` with valid frontmatter (may have been edited).
2. **Jira MCP** (preferred): `getJiraIssue` with the issue key. Resolve `cloudId` from a full Jira URL hostname, or via `getAccessibleAtlassianResources` when only a key is given. Prefer `responseContentFormat: "markdown"`.
3. **Fetch script** (fallback): `python3 "${CLAUDE_SKILL_DIR}/scripts/fetch_jira.py" PROJ-298 --json` (needs `JIRA_SERVER`, `JIRA_USER`, `JIRA_TOKEN`).
4. **User-provided description** — ask for title, user stories, acceptance criteria, and product context.

If both local artifacts and Jira exist, ask which to use. Local may be edited; Jira is canonical.

## Step 2: Select RFEs

If RFE IDs were given in the prompt, process all of them. Otherwise, if multiple related issues exist, present them and let the user select.

## Step 3: Save RFE Snapshots

```bash
python3 "${CLAUDE_SKILL_DIR}/scripts/frontmatter.py" set ".artifacts/{ID}/rfe-snapshot.md" \
  prototype_id="{ID}" source_rfe="{KEY}" \
  mode="{DECISIONS}" status="draft" iteration="0" \
  created_at="$(date -u +%Y-%m-%dT%H:%M:%SZ)"
```

`{DECISIONS}` is `skip`, `auto`, or `human` (field name stays `mode`). `{ID}` comes from the Jira key or a generated slug.

## Step 4: Extract User Stories and Journeys

Parse from the RFE: user stories, acceptance criteria, personas/roles, key entities, flows, and page scenarios.

- Personas: prefer IDs from `${CLAUDE_PLUGIN_ROOT}/knowledge/personas/catalog.yaml`; apply overlays from `${CLAUDE_PLUGIN_ROOT}/knowledge/personas/overlays/`. If internal-ai-helpers is available, read `plugins/uxd-eval-config/knowledge/personas/<id>.md` for Sources; skip if missing.
- **Page scenarios:** run [references/scenario-brainstorm.md](references/scenario-brainstorm.md) before writing `scenarios.json`. Prefer 3–7 distinct on-load end-states per page.
- Write `.artifacts/{ID}/user-stories.json`, `journeys.json`, and `scenarios.json`. If the RFE is thin, record assumptions in `metadata.json`.

Journey and scenario rules (canonical schemas in `uxd-prototype-export`):

- One journey per primary flow; mark key screens `"export": true`. Interaction states that are not distinct URLs keep the same `route` and add `actions`. Schema: [journeys-schema.md](../../../uxd-workshop/skills/uxd-prototype-export/references/journeys-schema.md).
- One `pages[]` entry per distinct journey `route`, with at least a `default` scenario. Each `description` names the **on-load end-state**. Scenario ids are filename-safe (`[a-z0-9-]+`). Schema: [scenarios-schema.md](../../../uxd-workshop/skills/uxd-prototype-export/references/scenarios-schema.md). Mock wiring: [references/scenario-mocks.md](references/scenario-mocks.md).

## Step 5: Resolve Workspace

**Standalone:** create `.artifacts/{ID}/prototype/` and skip to Step 6.

**Workspace:** clone into `.artifacts/{ID}/code/`. A separate `--target` only affects later push — do not clone the target. Needs elevated git permissions (`required_permissions: ["all"]` in Cursor):

```bash
python3 "${CLAUDE_SKILL_DIR}/scripts/resolve_workspace.py" "<path-or-url>" \
  --rfe-key "{KEY}" \
  [--workspace-branch "{WORKSPACE_BRANCH}"] \
  [--upstream "{TARGET_REPO_URL}"] \
  [--target-branch "{TARGET_BRANCH}"]
```

Preserve `branch`, `target_branch`, `clone_url`, and `upstream_url` from the JSON output for Step 6 and publish. Set `workspace_path` to the clone path.

## Step 6: Analyze Target Codebase

*Workspace mode only. Run inline — Steps 7–10 depend on it.*

Detect tech stack, conventions, navigation, design system, and verification commands (`AGENTS.md`, package scripts). Save to `.artifacts/{ID}/workspace-analysis.json` with `clone_url`, `branch`, `workspace_path`, and when publishing: `upstream_url` / `target_branch`.

## Step 7: Design Decisions

**If `--decisions=skip`:** make design calls while building. Do not generate decision pages. Set `decision_mode: skip` in `prototype-summary.yaml` / `metadata.json`. Skip the rest of this step.

Otherwise, plan `--depth` decisions with real tradeoffs ([references/decision-points.yaml](references/decision-points.yaml)):

- **`auto`:** generate HTML pages, pick recommendations, show a batch summary to override.
- **`human`:** generate all pages, then walk through one at a time.

Decision pages use [references/decision-page-template.html](references/decision-page-template.html) — real rendered UI, not ASCII. Full procedure: [references/decision-workflow.md](references/decision-workflow.md). Store artifacts in `.artifacts/{ID}/decisions/`.

## Step 8: Generate the Prototype

**Workspace:** generate in `.artifacts/{ID}/code/` following project conventions. Wire mocks from `scenarios.json` via `window.UxdScenario.get()` / `useUxdScenario` so `?scenario=<id>` lands on the intended UI with no extra clicks. See [references/scenario-mocks.md](references/scenario-mocks.md).

**Standalone:** generate HTML in `.artifacts/{ID}/prototype/` with PatternFly 6 CDN:

```html
<link rel="stylesheet" href="https://unpkg.com/@patternfly/patternfly@6/patternfly.min.css" />
<link rel="stylesheet" href="https://unpkg.com/@patternfly/patternfly@6/patternfly-addons.min.css" />
```

Use PatternFly docs MCP if available. Same scenario wiring as above.

**Reachability self-check** (a minute or two, then move on):

- Every new route is registered and linked from nav/CTAs — no orphan screens
- Every `journeys.json` route is reachable; steps with `actions` have matching stable selectors
- Every non-default scenario is selectable via `?scenario=<id>` and visually distinct from `default`

## Step 9: Write Prototype Artifacts

- `changeset.md` — files created/modified
- `metadata.json` — id, title, `decision_mode`, screens, paths, timestamps
- `prototype-summary.yaml` — machine-readable summary for downstream skills
- Keep `journeys.json` / `scenarios.json` in sync with what was actually built

## Step 10: Install Prototype Bar

*Skip if `--no-prototype-bar`. Otherwise mandatory.*

```bash
EXPORT_SKILL="${CLAUDE_SKILL_DIR}/../uxd-prototype-export"
bash "${EXPORT_SKILL}/scripts/install-prototype-bar.sh" \
  --artifacts ".artifacts/{ID}" \
  --source "<prototype-dir-or-workspace>" \
  --mode standalone|workspace
```

`--source` is `.artifacts/{ID}/prototype/` (standalone) or the workspace root from `workspace-analysis.json`. If auto-mount fails for React, import `<PrototypeBar />` in the app shell.

Re-run after evaluate so the Eval tab gets the report (`public/evals/{ID}/`). Pass `--no-eval-copy` if the report is not needed.

## Step 11: Post-Change Verification

*Workspace mode only. Mandatory.*

Install deps if needed, lint/build/type-check changed files, fix failures introduced by the prototype, update `changeset.md`, record pass/fail in `.artifacts/{ID}/verification.json`.

## Step 12: Journey export (when `--export`)

*Skip unless `--export`.*

1. Confirm `journeys.json` (prefer `"export": true`; else `--export-all-if-unset`) and `scenarios.json`
2. Resolve `--url` — ask if missing. For standalone, serve `prototype/` and use that origin
3. `cd "${CLAUDE_SKILL_DIR}/../uxd-prototype-export" && npm install`
4. Run:

```bash
EXPORT_SKILL="${CLAUDE_SKILL_DIR}/../uxd-prototype-export"
node "${EXPORT_SKILL}/scripts/export-journey.mjs" \
  --base-url "{URL}" \
  --journeys ".artifacts/{ID}/journeys.json" \
  --scenarios ".artifacts/{ID}/scenarios.json" \
  --out ".artifacts/{ID}/exports" \
  --formats "{html,pf-spec|html,tree,pf-spec}" \
  --export-all-if-unset
```

5. Record export paths in `metadata.json` and `prototype-summary.yaml`

Optional local helper so the bar can write captures and open Eval at `http://127.0.0.1:9417/evals/{ID}/`:

```bash
node "${EXPORT_SKILL}/scripts/export-helper.mjs" \
  --out ".artifacts/{ID}/exports" \
  --artifacts ".artifacts"
```

## Step 13: Summary and Next Steps

Print ID, title, decisions, screens, journeys, bar, exports, workspace, status, and artifact paths. Suggest:

1. Serve the prototype — Prototype Bar **Export**, or `uxd-prototype-export`
2. `uxd-prototype-evaluate {ID} <URL> [--workspace=…]`
3. Re-invoke this skill to refine from FAIL / refinement-suggestions
4. `uxd-prototype-publish`

If `--pipeline` / `--speedrun`, continue with [references/pipeline-mode.md](references/pipeline-mode.md).

---

## Refinement

After evaluate, apply targeted fixes from failed ACs — do not rewrite the prototype. Full procedure: [references/refinement-procedure.md](references/refinement-procedure.md).

Reads `.artifacts/{ID}/eval/evaluation-report.csv` + `refinement-suggestions.json`. Pass = zero FAIL. Default max: 3 cycles.

```
/uxd-prototype-create refine {ID} [--decisions skip|auto|human] [--headless] [--max-cycles 3]
```

`--headless` loops refine → evaluate until zero FAIL, max cycles, or plateau.

## Guardrails

- **Do not build before confirmation.** Finish onboarding and print the Prototype Plan first.
- **Do not clone the target.** Build only in `--workspace`.
- **Do not invent journeys or scenarios** that the source does not support — record assumptions instead.
- **Scenarios must be visually distinct** on load; interaction states belong in journey `actions`, not scenarios.
- **Workspace verification is mandatory** — lint/build failures introduced by the prototype must be fixed.

## Reference Docs

| Doc | When to load |
|-----|-------------|
| [output-formats.md](references/output-formats.md) | Writing create artifact files |
| [journeys-schema.md](../../../uxd-workshop/skills/uxd-prototype-export/references/journeys-schema.md) | `journeys.json` shape (owned by export) |
| [scenarios-schema.md](../../../uxd-workshop/skills/uxd-prototype-export/references/scenarios-schema.md) | `scenarios.json` shape (owned by export) |
| [scenario-brainstorm.md](references/scenario-brainstorm.md) | Planning page scenarios |
| [scenario-mocks.md](references/scenario-mocks.md) | Wiring `?scenario=` mocks |
| [decision-workflow.md](references/decision-workflow.md) | `--decisions=auto` or `human` |
| [refinement-procedure.md](references/refinement-procedure.md) | Applying eval feedback |
| [pipeline-mode.md](references/pipeline-mode.md) | `--pipeline` / `--speedrun` |
| [edge-cases.md](references/edge-cases.md) | Thin RFEs, clone failures, Jira down, API-only tickets |
