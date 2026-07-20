---
name: uxd-prototype-create
description: >-
  Create or refine a UX prototype from a Jira ticket, Figma design, feature
  description, or rough idea. Use when starting a new prototype, integrating
  into an existing codebase, generating standalone HTML, or applying evaluation
  feedback.
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
  Source:     PROJ-298 (Jira)
  Workspace:  standalone
  Mode:       auto
  Depth:      normal
```

---

## Flags Reference

| Flag | Values | Default | Description |
|------|--------|---------|-------------|
| `--workspace` | local path, git URL, or `standalone` | `standalone` | Where to build |
| `--mode` | `auto`, `decide` | `auto` | Who makes design decisions |
| `--depth` | `under`, `normal`, `over` | `normal` | Decision count: under 2–3, normal 4–7, over 8–12 |
| `--branch` | branch name | auto-detected | Git branch to clone |
| `--dry-run` | flag | off | Skip external writes |
| `--pipeline` / `--speedrun` | flag | off | Run create → evaluate → refine → publish (see pipeline-mode.md) |

**Dry run:** Fetches RFEs and creates all local artifacts under `.artifacts/` but skips git operations, Jira label updates, and any external writes.

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

## Step 4: Extract User Stories

Parse from the RFE:

1. **User stories** — actor, action, goal (normalize bullet requirements if needed)
2. **Acceptance criteria** — Given/When/Then, checkboxes, or AC sections
3. **Personas / roles** — prefer IDs from `${CLAUDE_PLUGIN_ROOT}/knowledge/personas/catalog.yaml` (e.g. `data-scientist`, `ml-engineer`, `mlops-operator`) when mapping audiences; apply overlays from `${CLAUDE_PLUGIN_ROOT}/knowledge/personas/overlays/` for experience, accessibility, regulation, or team size
4. **Key entities** — nouns the UI manipulates (cluster, pipeline, key, …)
5. **Flows** — verb phrases → screen sequence (create → configure → deploy)

If the RFE is thin, document assumptions in `metadata.json`. Store structured stories in `.artifacts/{ID}/user-stories.json`.

---

## Step 5: Resolve Workspace

**Standalone mode:** Create `.artifacts/{ID}/prototype/`. Skip to Step 6.

**Workspace mode:** Use the resolve script (needs elevated permissions for git clone — `required_permissions: ["all"]` in Cursor):

```bash
python3 "${CLAUDE_SKILL_DIR}/scripts/resolve_workspace.py" "<path-or-url>" \
  --rfe-key "{KEY}" [--branch "{BRANCH}"]
```

Handles local paths, GitHub/GitLab URLs (extracts branch from URL patterns), SSL auto-retry, and shallow clones. Output JSON includes `type`, `clone_url`, `branch`, `clone_path`, `status`.

**Preserve `branch` and `clone_url`** from this output in workspace analysis (Step 6) — `submit_to_repo.py` needs them for the MR target branch and push remote.

## Step 6: Analyze Target Codebase

*Workspace mode only. Run inline — do not background; Steps 7–10 depend on results.*

Detect and record:

1. Tech stack (framework, bundler, UI library, TypeScript)
2. Conventions (file naming, component patterns, routing, tests)
3. Navigation structure and design system usage
4. Agent instructions (`.cursor/rules/`, `AGENTS.md`) — extract **verification commands** (lint, build, typecheck) for Step 10

Save to `.artifacts/{ID}/workspace-analysis.json` including `clone_url`, `branch`, and `workspace_path`.

## Step 7: Design Decisions

Design decisions are planned dynamically based on the RFE and codebase context. See `${CLAUDE_SKILL_DIR}/references/decision-points.yaml` for reference categories.

**Plan decisions:** Analyze user stories and codebase to identify decisions with real tradeoffs. Count is determined by `--depth` (under: 2–3, normal: 4–7, over: 8–12).

**Decision workflow depends on mode:**

- **`--mode=auto`:** Generate HTML decision pages, auto-pick recommendations, present a batch summary table for the user to override any choices.
- **`--mode=decide`:** Generate all decision pages upfront, then walk through one at a time asking the user to choose.

Read [references/decision-workflow.md](references/decision-workflow.md) for the full decision page generation procedure and recording format.

Store all decision artifacts in `.artifacts/{ID}/decisions/` (decision pages, `decisions.json`, `strategy-brief.md`).

---

## Step 8: Generate the Prototype

### Workspace Mode

1. Plan file changes based on codebase analysis and design decisions
2. Generate components following the project's conventions (imports, TypeScript, CSS approach)
3. Register routes and update navigation
4. Implement each design decision from Step 7

### Standalone Mode

Generate HTML files in `.artifacts/{ID}/prototype/` using PatternFly CDN:

```html
<link rel="stylesheet" href="https://unpkg.com/@patternfly/patternfly@6/patternfly.min.css" />
<link rel="stylesheet" href="https://unpkg.com/@patternfly/patternfly@6/patternfly-addons.min.css" />
```

If the PatternFly docs MCP is available, use it for component reference.

---

## Step 9: Write Prototype Artifacts

Write these artifacts after generation:

- `.artifacts/{ID}/changeset.md` — lists all files created/modified with one-line descriptions
- `.artifacts/{ID}/metadata.json` — prototype ID, title, mode, status, iteration, screens list, timestamps
- `.artifacts/{ID}/prototype-summary.yaml` — structured machine-readable summary for downstream skills and pipeline consumption

The `prototype-summary.yaml` captures what was built (build mode), what it was built from (source), how decisions were made, and what was produced. Downstream skills like `uxd-prototype-evaluate` and `uxd-prototype-publish` can consume this directly without parsing human-readable output.

Read [references/output-formats.md](references/output-formats.md) for full schema definitions and examples of each artifact file.

## Step 10: Post-Change Verification

*Workspace mode only. Mandatory — do not skip.*

1. Read verification commands from `AGENTS.md` / package scripts discovered in Step 6
2. Install dependencies if needed
3. Lint changed files; fix errors introduced by the prototype
4. Run build / type-check; fix failures
5. If verification changes more files, update `changeset.md`
6. Record pass/fail in `.artifacts/{ID}/verification.json`

## Step 11: Apply Labels in Jira (Optional)

If Jira is available (MCP or REST credentials), add label `prototype-creator-draft` to the source issue. If unavailable, skip silently.

## Step 12: Summary and Next Steps

Print a summary showing ID, title, mode, screens, workspace, status, and artifact paths.

Suggest next steps:

1. Serve the prototype and run `uxd-prototype-evaluate {ID} <URL> [--workspace=…]` (Playwright AC + usability)
2. Re-invoke this skill to refine from FAIL / refinement-suggestions
3. Publish via `uxd-prototype-publish` (or `${CLAUDE_SKILL_DIR}/scripts/submit_to_repo.py` for repo MR)

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
