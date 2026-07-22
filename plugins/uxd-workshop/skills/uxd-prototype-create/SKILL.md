---
name: uxd-prototype-create
description: >-
  Create or refine a UX prototype from a Jira ticket, Figma design, feature
  description, or rough idea. Enumerates user journeys and page scenarios
  (empty/error/alternate conditions), wires mock data via ?scenario=, and
  supports export of each step × scenario. Use when starting a new prototype,
  integrating into an existing codebase, generating standalone HTML, or applying
  evaluation feedback.
---

# Prototype Creator

Creates a prototype based on various input sources and delivers output in multiple formats. Accepts Jira tickets, Figma design links, feature descriptions, existing codebases, or just a rough idea — the skill asks clarifying questions to fill in whatever context is missing.

Supports two workspace modes (integrate into an existing codebase or generate standalone HTML) and two decision modes (AI auto-resolves or presents interactive HTML decision pages for human selection).

Also handles iterative refinement: after `uxd-prototype-evaluate` (Playwright AC validation + usability), re-invoke this skill to apply targeted improvements from failed criteria and refinement suggestions.

Supports **pipeline mode** (create → evaluate → optional refine → publish). See [references/pipeline-mode.md](references/pipeline-mode.md).

---

## Conversational Onboarding

Before doing any work, walk through these questions with the user. Ask them one at a time, wait for a response, and confirm the full picture before proceeding.

### Question 1: What are we prototyping?

> What would you like to prototype? You can share:
> - A Jira ticket URL or key (e.g., `PROJ-298`)
> - A Figma design link
> - A plain-text description of the feature
> - Just a rough idea — I'll ask follow-ups

### Question 2: Building on an existing codebase?

> Should I integrate this into an existing codebase, or create a standalone HTML prototype?
> - **Existing codebase** — give me a local path or git URL. I'll match the existing conventions.
> - **Standalone** — I'll generate self-contained HTML using PatternFly CDN. No build tools needed.

Default to standalone if the user isn't sure.

### Question 3: How should design decisions be handled?

> How do you want to handle design decisions?
> - **Auto** — I'll make all design calls based on context and best practices.
> - **Decide** — I'll generate visual HTML comparison pages for each decision, then ask you to pick.

Default to auto.

### Question 4: How deep should decision exploration go?

*Only ask this if the user chose **decide** mode.*

> How many design decisions should I surface?
> - **Under** (2–3) — Quick exploration, simple features
> - **Normal** (4–7) — Most prototypes
> - **Over** (8–12) — Complex features, lots of creative latitude

Default to normal.

### Confirm and Proceed

Print a summary and ask for confirmation before starting:

```
Prototype Plan:
  Source:         PROJ-298 (Jira)
  Workspace:      standalone
  Target:         none
  Mode:           auto
  Depth:          normal
  Prototype bar:  on
  Export:         off
```

---

## Flags Reference

| Flag | Values | Default | Description |
|------|--------|---------|-------------|
| `--workspace` | local path, git URL, or `standalone` | `standalone` | Where to build (often a fork) |
| `--target` | `repo`, `github`, `gitlab`, `vercel`, `none`, or a git URL | `none` (pipeline) | Where to publish; a git URL means open an MR/PR **against** that repo (implies `repo`) |
| `--mode` | `auto`, `decide` | `auto` | Who makes design decisions |
| `--depth` | `under`, `normal`, `over` | `normal` | Decision count: under 2–3, normal 4–7, over 8–12 |
| `--branch` | branch name | auto-detected | Git branch to clone |
| `--dry-run` | flag | off | Skip external writes |
| `--pipeline` / `--speedrun` | flag | off | Run create → evaluate → refine → publish (see pipeline-mode.md) |
| `--prototype-bar` / `--no-prototype-bar` | flag | on | Install sticky Prototype Bar (Sources, Prototype\|Eval, Export) after generate |
| `--export` | flag | off | After artifacts, batch-export journey steps with `export: true` via `uxd-prototype-export` |
| `--url` | URL | asked if `--export` | Live base URL for Playwright export (and pipeline evaluate) |
| `--export-formats` | `html`, `tree`, or both | `html` | Formats for `--export` |

**`--target` URL detection:** If the value looks like a git URL (`https://`, `http://`, `git@`, `ssh://`, or ends with `.git`), treat it as the MR/PR base repo. That implies publish type `repo`. Pass the URL to `resolve_workspace.py --upstream` so the clone gets an `upstream` remote; persist as `target_repo_url` / `upstream_url` in pipeline config and workspace analysis.

**Dry run:** Fetches RFEs and creates all local artifacts under `.artifacts/` but skips git operations and any external writes. Local `--export` files are still written when a URL is available.

---

## Step 1: Fetch RFE Source

Check for available sources:

1. **Local artifacts** — `.artifacts/*/rfe-snapshot.md` with valid frontmatter (may have been edited after a prior run).
2. **Jira MCP** (preferred for live tickets): `getJiraIssue` with the issue key. Resolve `cloudId` from a full Jira URL hostname, or via `getAccessibleAtlassianResources` when only a key is given. Prefer `responseContentFormat: "markdown"`.
3. **Fetch script** (fallback): `python3 "${CLAUDE_SKILL_DIR}/scripts/fetch_jira.py" PROJ-298 --json` (requires `JIRA_SERVER`, `JIRA_USER`, `JIRA_TOKEN` env vars).
4. **User-provided description** (final fallback): Ask for title, user stories, acceptance criteria, and product context.

**If both local artifacts and Jira are available:** Ask which to use. Local may be edited; Jira is canonical.

## Step 2: Select RFEs

If RFE IDs were provided explicitly in the prompt, process all of them — do not re-ask. Otherwise, if multiple related issues exist, present them and let the user select.

## Step 3: Save RFE Snapshots

Save each RFE with YAML frontmatter using the frontmatter utility:

```bash
python3 "${CLAUDE_SKILL_DIR}/scripts/frontmatter.py" set ".artifacts/{ID}/rfe-snapshot.md" \
  prototype_id="{ID}" source_rfe="{KEY}" \
  mode="{MODE}" status="draft" iteration="0" \
  created_at="$(date -u +%Y-%m-%dT%H:%M:%SZ)"
```

Where `{ID}` is derived from the Jira key (e.g., `PROJ-298`) or a generated slug.

## Step 4: Extract User Stories and Journeys

Parse from the RFE:

1. **User stories** — actor, action, goal (normalize bullet requirements if needed)
2. **Acceptance criteria** — Given/When/Then, checkboxes, or AC sections
3. **Personas / roles** — prefer IDs from `${CLAUDE_PLUGIN_ROOT}/knowledge/personas/catalog.yaml` when mapping roles via `aliases`; apply overlays from `${CLAUDE_PLUGIN_ROOT}/knowledge/personas/overlays/` for experience, accessibility, regulation, or team size
4. **Key entities** — nouns the UI manipulates (cluster, pipeline, key, …)
5. **Flows / user journeys** — ordered steps the user takes (screens **and** interaction UI states such as “modal open”). Prefer an explicit “User journey” section when present; otherwise infer from stories and ACs.
6. **Page scenarios** — data/condition variants per page (empty, load error, validation error, alternate selection). Derive from ACs and stories; do not only list the happy path.

If the RFE is thin, document assumptions in `metadata.json`. Store structured stories in `.artifacts/{ID}/user-stories.json`.

**Also write** `.artifacts/{ID}/journeys.json` (schema in [references/output-formats.md](references/output-formats.md) and `uxd-prototype-export/references/journeys-schema.md`):

- One journey per primary flow; `steps` with `id`, `name`, `route`, and `"export": true` for key screens/states
- For interaction states that are not distinct URLs (e.g. modal open), keep the same `route` and add `actions` (`click`, `wait_for`, `fill`, …)
- Use stable selectors (`data-ouia-component-id`, roles, labels)
- Align loosely with evaluate `journey_definitions` field names (`id`, `title`, `persona`, `source`, `ac_ids`)

**Also write** `.artifacts/{ID}/scenarios.json` (schema in [references/output-formats.md](references/output-formats.md) and `uxd-prototype-export/references/scenarios-schema.md`):

- One `pages[]` entry per distinct journey `route`, with at least a `default` scenario
- Add empty / error / validation / alternate-branch scenarios when ACs or stories imply them
- Scenario `id`s must be filename-safe (`[a-z0-9-]+`); keep modal/drawer open in journey `actions`, not scenarios
- Mock wiring convention: [references/scenario-mocks.md](references/scenario-mocks.md)

Use journeys + scenarios for implementation in Step 8 and for `--export` later (export = each exportable step × each scenario for that step’s route).

---

## Step 5: Resolve Workspace

**Standalone mode:** Create `.artifacts/{ID}/prototype/`. Skip to Step 6.

**Workspace mode:** Use the resolve script (needs elevated permissions for git clone — `required_permissions: ["all"]` in Cursor):

```bash
python3 "${CLAUDE_SKILL_DIR}/scripts/resolve_workspace.py" "<path-or-url>" \
  --rfe-key "{KEY}" [--branch "{BRANCH}"] [--upstream "{TARGET_REPO_URL}"]
```

Handles local paths, GitHub/GitLab URLs (extracts branch from URL patterns), SSL auto-retry, and shallow clones. When `--upstream` is set (from a `--target` git URL), adds/sets an `upstream` remote on the clone for fork-style MR submission. Output JSON includes `type`, `clone_url`, `branch`, `clone_path`, `upstream_url` (if set), `status`.

**Preserve `branch`, `clone_url`, and `upstream_url`** from this output in workspace analysis (Step 6) — `submit_to_repo.py` needs them for the MR target branch, push remote, and fork detection.

## Step 6: Analyze Target Codebase

*Workspace mode only. Run inline — do not background; Steps 7–10 depend on results.*

Detect and record:

1. Tech stack (framework, bundler, UI library, TypeScript)
2. Conventions (file naming, component patterns, routing, tests)
3. Navigation structure and design system usage
4. Agent instructions (`.cursor/rules/`, `AGENTS.md`) — extract **verification commands** (lint, build, typecheck) for Step 10

Save to `.artifacts/{ID}/workspace-analysis.json` including `clone_url`, `branch`, `workspace_path`, and `upstream_url` when `--target` was a git URL.

## Step 7: Design Decisions

Design decisions are planned dynamically based on the RFE and codebase context. See `${CLAUDE_SKILL_DIR}/references/decision-points.yaml` for reference categories.

**Plan decisions:** Analyze user stories and codebase to identify decisions with real tradeoffs. Count is determined by `--depth` (under: 2–3, normal: 4–7, over: 8–12).

**Decision workflow depends on mode:**

- **`--mode=auto`:** Generate HTML decision pages, auto-pick recommendations, present a batch summary table for the user to override any choices.
- **`--mode=decide`:** Generate all decision pages upfront, then walk through one at a time asking the user to choose.

**Quality bar:** Decision pages use PatternFly CDN chrome (copy [references/decision-page-template.html](references/decision-page-template.html)). Option previews are real rendered UI — no ASCII or empty wireframes. Previews match the build target (standalone → PF components; workspace → target-app components when possible). Every page cross-links to the others plus `index.html`. After generation, print absolute `file://` URLs and open the index in the browser.

Read [references/decision-workflow.md](references/decision-workflow.md) for the full procedure. See [references/decision-page-example.md](references/decision-page-example.md) for preview recipes by decision type.

Store all decision artifacts in `.artifacts/{ID}/decisions/` (decision pages, `index.html`, `decisions.json`, `strategy-brief.md`). Chat flag `--mode=decide` maps to `decision_mode: interactive` in `prototype-summary.yaml`.

---

## Step 8: Generate the Prototype

### Workspace Mode

1. Plan file changes based on codebase analysis and design decisions
2. Generate components following the project's conventions (imports, TypeScript, CSS approach)
3. Register routes and update navigation
4. Implement each design decision from Step 7
5. Wire mock data per scenario in `.artifacts/{ID}/scenarios.json` — pages choose data via `window.UxdScenario.get()` or `useUxdScenario` (see [references/scenario-mocks.md](references/scenario-mocks.md)); active scenario is `?scenario=<id>`

### Standalone Mode

Generate HTML files in `.artifacts/{ID}/prototype/` using PatternFly CDN:

```html
<link rel="stylesheet" href="https://unpkg.com/@patternfly/patternfly@6/patternfly.min.css" />
<link rel="stylesheet" href="https://unpkg.com/@patternfly/patternfly@6/patternfly-addons.min.css" />
```

If the PatternFly docs MCP is available, use it for component reference.

Branch each page’s mock data on `UxdScenario.get()` (installed with the Prototype Bar). See [references/scenario-mocks.md](references/scenario-mocks.md).

### Reachability self-check

After implementing, do a quick pass to confirm every new screen or flow is actually reachable. Fix any gaps before continuing:

- **Routes** — each new page/view is registered in the app's router (or linked as a real HTML file in standalone)
- **Nav / entry points** — left nav, tabs, or menus include the new destinations where users would expect them
- **Inbound links** — CTAs, table row actions, breadcrumbs, and other hyperlinks that should lead to the new UI are wired to the correct paths
- **Dead ends** — no orphan screens that can only be opened by typing a URL
- **Journey coverage** — every `route` in `.artifacts/{ID}/journeys.json` is reachable; steps with `actions` have matching interactive elements (stable selectors) so those states can be opened
- **Scenario coverage** — every non-default scenario in `.artifacts/{ID}/scenarios.json` is selectable via `?scenario=<id>` (or the bar Scenario menu) and shows the intended empty/error/alternate UI

This is a cursory wiring check, not a full UX review. Spend a minute or two; fix obvious misses, then move on.

### Prototype Bar (default on)

Unless `--no-prototype-bar` was set, install the sticky Prototype Bar after Step 9 writes `prototype-bar.json` (Sources, Prototype|Eval, Scenario, Export). See Step 9 for the install command with `--config`.

If you install earlier for a quick preview, re-run install after syncing the config so Sources are injected.

- **Standalone:** `--source` = `.artifacts/{ID}/prototype/`
- **Workspace:** `--source` = workspace root from `workspace-analysis.json`

If auto-mount fails for React, copy templates and mount `<PrototypeBar />` manually (same pattern as pf-prototype-mode).

---

## Step 9: Write Prototype Artifacts

Write these artifacts after generation:

- `.artifacts/{ID}/changeset.md` — lists all files created/modified with one-line descriptions
- `.artifacts/{ID}/metadata.json` — prototype ID, title, mode, status, iteration, screens list, `journeys_path`, `scenarios_path`, `prototype_bar`, `source` / `source_rfes` / `sources`, timestamps
- `.artifacts/{ID}/prototype-summary.yaml` — structured machine-readable summary for downstream skills and pipeline consumption
- `.artifacts/{ID}/prototype-bar.json` — Prototype Bar config (Sources + Eval + slim `scenarios` list)
- Ensure `.artifacts/{ID}/journeys.json` is present (from Step 4; update routes/selectors if implementation diverged)
- Ensure `.artifacts/{ID}/scenarios.json` is present (from Step 4; update routes/scenario ids if implementation diverged)

The `prototype-summary.yaml` captures what was built (build mode), what it was built from (source), how decisions were made, and what was produced. Downstream skills like `uxd-prototype-evaluate`, `uxd-prototype-export`, and `uxd-prototype-publish` can consume this directly without parsing human-readable output.

After writing `metadata.json`, sync the Prototype Bar config (maps Jira/Figma/description sources into one Sources list) and install/refresh the bar:

```bash
EXPORT_SKILL="${CLAUDE_SKILL_DIR}/../uxd-prototype-export"
node "${EXPORT_SKILL}/scripts/sync-prototype-bar-config.mjs" \
  --artifacts ".artifacts/{ID}"

# Unless --no-prototype-bar
bash "${EXPORT_SKILL}/scripts/install-prototype-bar.sh" \
  --source "<prototype-dir-or-workspace>" \
  --mode standalone|workspace \
  --config ".artifacts/{ID}/prototype-bar.json"
```

Read [references/output-formats.md](references/output-formats.md) for full schema definitions and examples of each artifact file.

## Step 10: Post-Change Verification

*Workspace mode only. Mandatory — do not skip.*

1. Read verification commands from `AGENTS.md` / package scripts discovered in Step 6
2. Install dependencies if needed
3. Lint changed files; fix errors introduced by the prototype
4. Run build / type-check; fix failures
5. If verification changes more files, update `changeset.md`
6. Record pass/fail in `.artifacts/{ID}/verification.json`

## Step 11: Journey export (when `--export`)

*Skip unless `--export` was set.*

Export captures each exportable journey step × each scenario for that step’s route (`?scenario=<id>`), writing `{journeyId}/{stepId}--{scenarioId}.html` plus `exports/index.html`.

1. Confirm `.artifacts/{ID}/journeys.json` has at least one step (prefer steps with `"export": true`; if none are marked, pass `--export-all-if-unset`)
2. Confirm `.artifacts/{ID}/scenarios.json` exists (fallback: export uses `default` only per route)
3. Resolve `--url` — ask if missing. For standalone HTML, serve `.artifacts/{ID}/prototype/` (e.g. `npx serve`) and use that origin
4. Ensure export skill deps: `cd "${CLAUDE_SKILL_DIR}/../uxd-prototype-export" && npm install`
5. Run:

```bash
EXPORT_SKILL="${CLAUDE_SKILL_DIR}/../uxd-prototype-export"
node "${EXPORT_SKILL}/scripts/export-journey.mjs" \
  --base-url "{URL}" \
  --journeys ".artifacts/{ID}/journeys.json" \
  --scenarios ".artifacts/{ID}/scenarios.json" \
  --out ".artifacts/{ID}/exports" \
  --formats "{html|html,tree}" \
  --export-all-if-unset
```

6. Record `exports.path`, `exports.count`, `exports.manifest`, and `exports.index` in `metadata.json` and `prototype-summary.yaml`

Optional: keep `node "${EXPORT_SKILL}/scripts/export-helper.mjs" --out ".artifacts/{ID}/exports"` running so the Prototype Bar can write into the same folder.

## Step 12: Summary and Next Steps

Print a summary showing ID, title, mode, screens, journeys, prototype bar, exports (if any), workspace, status, and artifact paths.

Suggest next steps:

1. Serve the prototype — use the Prototype Bar **Export** menu for ad-hoc static HTML / component tree, or run `uxd-prototype-export`
2. Run `uxd-prototype-evaluate {ID} <URL> [--workspace=…]` (Playwright AC + usability)
3. Re-invoke this skill to refine from FAIL / refinement-suggestions
4. Publish via `uxd-prototype-publish` (or `${CLAUDE_SKILL_DIR}/scripts/submit_to_repo.py` for repo MR)

If `--pipeline` / `--speedrun` was set, continue with [references/pipeline-mode.md](references/pipeline-mode.md).

---

## Refinement

After Playwright evaluation, apply targeted improvements from failed ACs and suggestions.

Read [references/refinement-procedure.md](references/refinement-procedure.md) when the user asks to refine or when running the automated refine→eval loop.

**Quick summary:** Reads `evaluation-report.csv` + `refinement-suggestions.json`, plans fixes for FAIL criteria, applies without full rewrite, increments iteration. Pass = zero FAIL. Default max: 3 cycles.

**Invocation:**

```
/uxd-prototype-create refine {ID} [--mode auto|decide] [--headless] [--max-cycles 3]
```

**Headless auto-loop:** With `--headless`, runs refine → `uxd-prototype-evaluate` → check FAIL count → refine again until zero FAIL, max cycles, or plateau.

---

## Pipeline Mode

When the user wants the full create → evaluate → publish flow, read [references/pipeline-mode.md](references/pipeline-mode.md) and orchestrate those skills.

---

## Edge Cases

Read [references/edge-cases.md](references/edge-cases.md) when encountering:
- Thin/vague RFEs with insufficient detail
- API-only tickets with no UI surface
- Multiple RFEs composing a single feature
- Workspace clone failures (auth, SSL, not found)
- Upstream decisions conflicting with AI recommendations
- Jira unavailability (graceful degradation)
