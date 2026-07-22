# uxd-prototype-create

Creates UX prototypes from various inputs and delivers them in multiple formats. Guides users conversationally through what to build and where to put it. Also handles refinement after Playwright evaluation and optional end-to-end pipeline mode.

## Inputs

The skill accepts any combination of these — it asks clarifying questions to fill gaps:

| Input type | Examples |
|------------|----------|
| Jira ticket | URL, issue key (`PROJ-298`), or JQL query via Atlassian MCP |
| Figma design | Figma file URL — extracts frame structure and screenshots via Figma MCP |
| Feature description | Plain text describing what to prototype |
| Existing codebase | Local path or git URL to build on top of (workspace mode) |
| Research context | Personas, JTBD, user stories in `.context/research-context/` |
| Prior decisions | Existing `.artifacts/{ID}/decisions/` from an earlier run |
| Eval feedback | `evaluation-report.csv` + `refinement-suggestions.json` for refine |

## Outputs

| Output | Format | Location |
|--------|--------|----------|
| Prototype | HTML (standalone) or framework code (workspace mode) | `.artifacts/{ID}/prototype/` or target workspace |
| Design decisions | PatternFly HTML comparison pages (cross-linked + `index.html`) + JSON record | `.artifacts/{ID}/decisions/` |
| RFE snapshot | Markdown with YAML frontmatter | `.artifacts/{ID}/rfe-snapshot.md` |
| Changeset manifest | Markdown listing all created/modified files | `.artifacts/{ID}/changeset.md` |
| Workspace analysis | JSON with tech stack, conventions, verification commands | `.artifacts/{ID}/workspace-analysis.json` |
| Metadata | JSON with `decision_mode`, source, assumptions | `.artifacts/{ID}/metadata.json` |
| Prototype Bar config | Sources + Prototype\|Eval + scenarios | `.artifacts/{ID}/prototype-bar.json` |
| Journeys | Structured steps / interaction states for build + export | `.artifacts/{ID}/journeys.json` |
| Scenarios | Data/condition variants per page (empty, error, …) | `.artifacts/{ID}/scenarios.json` |
| Exports (optional) | Static HTML / trees per step × scenario when `--export` | `.artifacts/{ID}/exports/` |

Prototype Bar (default on): sticky Sources, Prototype\|Eval, Scenario switcher, and Export on the running prototype. Disable with `--no-prototype-bar`.

## Decision levels (`--decisions`)

| Value | Behavior |
|-------|----------|
| **skip** (default) | Make design calls while building. No decision kit, pages, or strategy brief. |
| **auto** | Generate PatternFly HTML comparison pages, AI-pick recommendations, present a batch summary to override. |
| **human** | Same decision pages, walked one at a time so you pick each direction. |

Decision depth (`--depth`): `under` (2–3), `normal` (4–7), `over` (8–12). Only applies when `--decisions` is `auto` or `human`. Values map 1:1 to `decision_mode` in `prototype-summary.yaml`.

## Pipeline mode

Pass `--pipeline` / `--speedrun` or ask for a full run. Sequence: create → serve → `uxd-prototype-evaluate` → optional refine → `uxd-prototype-publish`. See `references/pipeline-mode.md`.

`--target` accepts `repo` / `github` / `gitlab` / `vercel` / `none`, **or a git URL** (MR/PR against that repo). Pair with `--workspace` (often a fork):

```
/uxd-prototype-create --speedrun PROJ-298 \
  --workspace https://gitlab.example.com/user/fork.git \
  --target https://gitlab.example.com/org/canonical.git \
  --decisions skip --headless
```

## Quick Start

- "Prototype PROJ-298"
- "Create a prototype from this Figma design: https://figma.com/design/..."
- "I have an idea for a settings page — let's prototype it"
- "Build on top of my existing repo at /path/to/project"
- "Run the full pipeline for PROJ-298 and open an MR"

## Related

- **uxd-prototype-export** — Static HTML / component-tree export; Prototype Bar install
- **uxd-prototype-evaluate** — Playwright AC validation + persona usability + HTML report
- **uxd-prototype-publish** — MR, GitHub/GitLab Pages, or Vercel
