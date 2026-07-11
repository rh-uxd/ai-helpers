---
name: uxd-prototype-create
description: >-
  Create or refine a UX prototype from various input sources — a Jira ticket,
  Figma design, feature description, or just an idea. Guides the user
  conversationally through workspace and decision mode choices.
  Can target an existing codebase or generate standalone HTML. Also handles
  iterative refinement based on evaluation feedback.
---

# Prototype Creator

Creates a prototype based on various input sources and delivers output in multiple formats. Accepts Jira tickets, Figma design links, feature descriptions, existing codebases, or just a rough idea — the skill asks clarifying questions to fill in whatever context is missing.

Supports two workspace modes (integrate into an existing codebase or generate standalone HTML) and two decision modes (AI auto-resolves or presents interactive HTML decision pages for human selection).

Also handles iterative refinement: after a prototype has been scored by `uxd-prototype-evaluate`, re-invoke this skill to apply targeted improvements based on the review feedback.

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
> - **Normal** (4–5) — Most prototypes
> - **Over** (6–8) — Complex features, lots of creative latitude

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
| `--depth` | `under`, `normal`, `over` | `normal` | Decision count (decide mode) |
| `--branch` | branch name | auto-detected | Git branch to clone |
| `--dry-run` | flag | off | Skip external writes |

**Dry run:** Fetches RFEs and creates all local artifacts under `.artifacts/` but skips git operations, Jira label updates, and any external writes.

---

## Step 1: Fetch RFE Source

Try these in order:

1. **Jira MCP** (preferred): `mcp__atlassian__getJiraIssue` with the issue key.
2. **Fetch script** (fallback): `python3 "${SKILL_DIR}/scripts/fetch_jira.py" PROJ-298 --json` (requires `JIRA_SERVER`, `JIRA_USER`, `JIRA_TOKEN` env vars).
3. **User-provided description** (final fallback): Ask the user for title, user stories, acceptance criteria, and product context.

## Step 2: Select RFEs

If multiple related issues exist, present them and let the user select which to include. For a single RFE (common case), proceed directly.

## Step 3: Save RFE Snapshots

Save each RFE with YAML frontmatter using the frontmatter utility:

```bash
python3 "${SKILL_DIR}/scripts/frontmatter.py" set ".artifacts/{ID}/rfe-snapshot.md" \
  prototype_id="{ID}" source_rfe="{KEY}" \
  mode="{MODE}" status="draft" iteration="0" \
  created_at="$(date -u +%Y-%m-%dT%H:%M:%SZ)"
```

Where `{ID}` is derived from the Jira key (e.g., `PROJ-298`) or a generated slug.

## Step 4: Extract User Stories

Parse user stories from the RFE. For each, identify actor, action, goal, and acceptance criteria. If no structured stories exist, synthesize from the description. Store in `.artifacts/{ID}/user-stories.json`.

---

## Step 5: Resolve Workspace

**Standalone mode:** Create `.artifacts/{ID}/prototype/`. Skip to Step 6.

**Workspace mode:** Use the resolve script:

```bash
python3 "${SKILL_DIR}/scripts/resolve_workspace.py" "<path-or-url>" \
  --rfe-key "{KEY}" [--branch "{BRANCH}"]
```

Handles local paths, GitHub/GitLab URLs (extracts branch from URL patterns), SSL auto-retry, and shallow clones. Output JSON includes `type`, `clone_url`, `branch`, `clone_path`, `status`.

## Step 6: Analyze Target Codebase

*Workspace mode only.*

Analyze the workspace for: tech stack (framework, bundler, UI library, TypeScript), conventions (file naming, component patterns, routing), navigation structure, design system usage, and existing agent instructions (`.cursor/rules/`, `AGENTS.md`).

Save to `.artifacts/{ID}/workspace-analysis.json`.

## Step 7: Design Decisions

Design decisions are planned dynamically based on the RFE and codebase context. See `${SKILL_DIR}/references/decision-points.yaml` for reference categories.

**Plan decisions:** Analyze user stories and codebase to identify decisions with real tradeoffs. Count is determined by `--depth` (under: 2-3, normal: 4-5, over: 6-8).

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

*Workspace mode only.*

Run lint, build, and type-check against the target workspace. Fix any errors introduced by the prototype. Record pass/fail in `.artifacts/{ID}/verification.json`.

## Step 11: Apply Labels in Jira (Optional)

If Jira is available (MCP or REST credentials), add label `prototype-creator-draft` to the source issue. If unavailable, skip silently.

## Step 12: Summary and Next Steps

Print a summary showing ID, title, mode, screens, workspace, status, and artifact paths.

Suggest: run `uxd-prototype-evaluate` to score, re-invoke this skill for refinement, or use `${SKILL_DIR}/scripts/submit_to_repo.py` to push as a merge request.

---

## Refinement

After a prototype has been evaluated, this section handles iterative improvement based on the review feedback.

Read [references/refinement-procedure.md](references/refinement-procedure.md) when the user asks to refine a prototype or when running the automated refine-review loop.

**Quick summary:** Refinement reads `.artifacts/{ID}/reviews/summary.md`, plans targeted fixes by dimension (completeness, usability, feasibility), applies changes without full rewrite, and increments the iteration counter. Default max: 3 cycles.

**Invocation:**

```
/uxd-prototype-create refine {ID} [--mode auto|decide] [--headless] [--max-cycles 3]
```

**Headless auto-loop:** With `--headless`, runs refine→review→check scores→refine again until scores pass (5+/6 with no zeros), max cycles reached, or score plateaus.

---

## Edge Cases

Read [references/edge-cases.md](references/edge-cases.md) when encountering:
- Thin/vague RFEs with insufficient detail
- API-only tickets with no UI surface
- Multiple RFEs composing a single feature
- Workspace clone failures (auth, SSL, not found)
- Upstream decisions conflicting with AI recommendations
- Jira unavailability (graceful degradation)
