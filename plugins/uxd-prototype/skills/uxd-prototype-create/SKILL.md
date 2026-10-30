---
name: uxd-prototype-create
version: "2.0.0"
description: >-
  Create or refine a UX prototype from a Jira ticket, Figma design, feature
  description, or rough idea. Enumerates user journeys and page states
  (empty/error/alternate conditions), wires mock data via ?state=, writes a
  design spec for
  QE test-plan ingest, and supports export of each step × state. Use when
  starting a new prototype, integrating into an existing codebase, generating
  standalone HTML, or applying evaluation feedback.
---

# Create Prototype

Builds a prototype from a Jira ticket, Figma file, feature description, or rough idea. Asks clarifying questions for anything missing, then writes a runnable prototype plus structured artifacts that `uxd-prototype-evaluate`, `uxd-prototype-export`, and `uxd-prototype-publish` consume.

Family: **create → evaluate → publish** (optional export along the way). Pipeline mode: [references/pipeline-mode.md](references/pipeline-mode.md).

**Workspace vs target:** `--workspace` is the codebase you build in (clone, generate, verify). `--target` is only where the MR/PR lands. Never clone or generate against the target repo.

**Create and hand off:** use code-level checks during creation and ordinary refinement. Start the prototype server and open its entry page only at the final handoff for the user to review; do not browse routes, exercise journeys/states, or run interaction/keyboard tests as part of Create. Opening the design-choice report for user input is separate from testing the prototype. Browser evaluation belongs to `uxd-prototype-evaluate` when explicitly requested, including an explicit pipeline or headless run; `--export` may also use the browser for requested captures.

## Inputs

| Input | Required | Source |
|-------|----------|--------|
| What to prototype (Jira URL/key, Figma link, description, or idea) | **Yes** | User; skill asks if omitted |
| Workspace (`--workspace`) | No | Local path, git URL, or `standalone` (default) |
| Push destination (`--target`) | No | `none` unless publishing |
| Prior eval feedback | No | `artifacts/{ID}/eval/` when refining |

If the user has not said what to prototype, **stop and ask** before writing files.

## Outputs

Written under `artifacts/{ID}/` in the consumer project (never `${CLAUDE_SKILL_DIR}`):

| Output | Location |
|--------|----------|
| Prototype | `prototype/` (standalone HTML) or `code/` (workspace clone) |
| RFE snapshot, metadata, changeset, summary | `rfe-snapshot.md`, `metadata.json`, `changeset.md`, `prototype-summary.yaml` |
| Journeys + states | `journeys.json`, `states.json` |
| Design spec | `{ID}-design-spec.md` (QE companion; template [references/templates/design-spec.md](references/templates/design-spec.md), rules [references/design-spec.md](references/design-spec.md)) |
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
| `--decisions` | `skip`, `auto`, `human` | `skip` | Build with defaults / review AI suggestions / choose together (internal values retained for compatibility) |
| `--depth` | `under`, `normal`, `over` | `normal` | Optional exploration effort: key tradeoffs / relevant tradeoffs / broader alternatives. Never a decision quota |
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

Start with a brief welcome. Substitute `{version}` with the `version` value from this file's frontmatter:

> Welcome to Create Prototype, version {version}. This skill turns context from Jira and elsewhere into a visual prototype. I'll help you choose a starting point, work through any meaningful design choices, and build something you can try.

Ask only for missing information; honor answers and flags already supplied. Ask one approachable question at a time, without re-running setup when refining an existing prototype. Reading source material and checking possible starting points can happen during onboarding; wait for the agreed plan before generating or cloning.

### What would you like to prototype?

> Share a Jira ticket, a Figma link, a feature description, or a rough idea.

Use follow-ups only when a missing detail would change the experience. Do not demand a full requirements template from someone with a rough idea.

### Where should we start?

> Would you like to build on an existing prototype, or start from scratch?
> - **Use an existing prototype** — share a link, folder, or repository if you have one.
> - **Start from scratch** — I'll create a standalone prototype you can open in your browser.
> - **Help me choose** — I'll look for a starting point that fits your feature.

Before asking for a repository, check explicit workspace input and available project context. A Jira project can suggest a codebase when a matching mapping exists; never infer one from the project key alone. See [references/workspace-suggestions.md](references/workspace-suggestions.md). Explain the evidence for a suggestion and let the user choose it or start fresh. A running-site link is context, not necessarily a code repository; resolve the source or offer a standalone recreation.

Default to standalone if the user is unsure and no supported match exists. Explain technical details only when useful: an existing project will be used in a separate working copy; a standalone prototype needs no build tools. Publishing is optional and separate from the starting point.

### How would you like to handle design choices?

> - **Build with sensible defaults** — I'll follow the product's established patterns and note assumptions as I build.
> - **Review AI suggestions** — I'll show the meaningful tradeoffs with visual comparisons and suggested choices for you to review together.
> - **Choose together** — you'll choose the options on a review page, or we can talk through them in chat.

Map these to `skip`, `auto`, and `human` internally. Default to **Build with sensible defaults**. Do not ask users to choose a decision count or exploration depth. The feature's complexity and unresolved tradeoffs determine the questions; zero questions is a valid outcome. An explicit `--depth` adjusts exploration effort only.

### Describe the experience and proceed

Give a short plan in everyday language, for example:

> I'll create a standalone settings prototype where people can edit their profile, save changes, and see validation feedback. I'll follow established form patterns and note any assumptions. I'll also add a prototype bar: a small toolbar for switching sample states, viewing sources, and opening evaluation results when available. The prototype will stay local unless you ask to publish it.

Describe the actual feature, starting point, design-choice approach, and relevant next steps. Explain “prototype bar” once if enabled; omit disabled or irrelevant extras. Do not echo a flag/configuration dump (`Workspace: standalone`, `Target: none`, etc.). Ask for confirmation if the plan still needs agreement; if the user already authorized this concrete plan, proceed without another permission loop.

---

## Step 1: Fetch RFE Source

1. **Local artifacts** — `artifacts/*/rfe-snapshot.md` with valid frontmatter (may have been edited).
2. **Jira MCP** (preferred): `getJiraIssue` with the issue key. Resolve `cloudId` from a full Jira URL hostname, or via `getAccessibleAtlassianResources` when only a key is given. Prefer `responseContentFormat: "markdown"`.
3. **Fetch script** (fallback): `python3 "${CLAUDE_SKILL_DIR}/scripts/fetch_jira.py" PROJ-298 --json` (needs `JIRA_SERVER`, `JIRA_USER`, `JIRA_TOKEN`).
4. **User-provided description or idea** — use what the user supplied. Ask only for missing details that would change the experience; record routine assumptions instead of requiring a full requirements template.

If both local artifacts and Jira exist, ask which to use. Local may be edited; Jira is canonical.

## Step 2: Select RFEs

If RFE IDs were given in the prompt, process all of them. Otherwise, if multiple related issues exist, present them and let the user select.

## Step 3: Save RFE Snapshots

```bash
python3 "${CLAUDE_SKILL_DIR}/scripts/frontmatter.py" set "artifacts/{ID}/rfe-snapshot.md" \
  prototype_id="{ID}" source_rfe="{KEY}" \
  mode="{DECISIONS}" status="draft" iteration="0" \
  created_at="$(date -u +%Y-%m-%dT%H:%M:%SZ)"
```

`{DECISIONS}` is `skip`, `auto`, or `human` (field name stays `mode`). `{ID}` comes from the Jira key or a generated slug.

## Step 4: Extract User Stories and Journeys

Parse from the RFE: user stories, acceptance criteria, personas/roles, key entities, flows, and page states.

- Personas: prefer IDs from `${CLAUDE_PLUGIN_ROOT}/knowledge/personas/catalog.yaml`; apply overlays from `${CLAUDE_PLUGIN_ROOT}/knowledge/personas/overlays/`. If internal-ai-helpers is available, read `plugins/uxd-eval-config/knowledge/personas/<id>.md` for Sources; skip if missing.
- **Page states:** run [references/state-brainstorm.md](references/state-brainstorm.md) before writing `states.json`. Prefer 3–7 distinct on-load end-states per page.
- Write `artifacts/{ID}/user-stories.json`, `journeys.json`, and `states.json`. If the RFE is thin, record assumptions in `metadata.json`.
- Keep journey ids as `journey-N` and `ac_ids` as source criterion ids (`AC-1`). Record each journey `persona`. Step 9 maps these into the design spec; do not invent a second numbering.

Journey and state rules (canonical schemas in `uxd-prototype-export`):

- One journey per primary flow; mark key screens `"export": true`. Interactions that are not distinct URLs keep the same `route` and add `actions`. Schema: [journeys-schema.md](../uxd-prototype-export/references/journeys-schema.md).
- One `pages[]` entry per distinct journey `route`, with at least a `default` state. Each `description` names the **on-load end-state**. State ids are filename-safe (`[a-z0-9-]+`). The page collection key is `states`. Field rules: [states-schema.md](../uxd-prototype-export/references/states-schema.md). Mock wiring: [references/state-mocks.md](references/state-mocks.md).

## Step 5: Resolve Workspace

**Standalone:** create `artifacts/{ID}/prototype/` and continue with **PatternFly preparation** below (skip workspace analysis).

**Workspace:** clone into `artifacts/{ID}/code/`. A separate `--target` only affects later push — do not clone the target. Needs elevated git permissions (`required_permissions: ["all"]` in Cursor):

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

Detect tech stack, conventions, navigation, design system, and verification commands (`AGENTS.md`, package scripts). Save to `artifacts/{ID}/workspace-analysis.json` with `clone_url`, `branch`, `workspace_path`, and when publishing: `upstream_url` / `target_branch`.

### PatternFly preparation (both modes, before Step 7)

Follow [references/patternfly-compliance.md](references/patternfly-compliance.md): load `pf-catalog-interaction-patterns` and its interaction catalog, map journey interactions to components, then verify APIs/examples for the target PatternFly version. Read the relevant `pf-component-check` hierarchy references before composing those components. Apply this preparation even when `--decisions=skip`; no separate compliance artifact is needed.

## Step 7: Design Decisions

**If `--decisions=skip`:** make design calls while building. Do not generate decision pages. Set `decision_mode: skip` in `prototype-summary.yaml` / `metadata.json`. Skip the rest of this step.

Otherwise, identify unresolved choices that change the user's experience and have at least two defensible options. Apply source requirements, accessibility basics, established UX practices, and codebase conventions as defaults; do not offer violations as alternatives. Do not manufacture decisions or options to fill a quota. Use [references/decision-points.yaml](references/decision-points.yaml) as examples, not a checklist.

- **`auto`:** record AI suggestions with rationales, then offer one batch review with overrides.
- **`human`:** let users select independent choices together on a review page and paste one response; offer a chat walk-through if preferred.
- **No genuine tradeoffs:** explain briefly, record zero decisions, and continue with established patterns.

Follow [references/decision-workflow.md](references/decision-workflow.md). Reuse the bundled renderer and template for one `decisions/index.html` report with every choice; keep accepted choices in `decisions.json`. The copy button produces a readable list of questions and option names for the user to send back to the agent. Generate visual comparisons once, update JSON as answers arrive, and refresh visuals after the independent batch is resolved. Resolve dependencies before presenting affected choices. Store artifacts in `artifacts/{ID}/decisions/`.

## Step 8: Generate the Prototype

**Workspace:** generate in `artifacts/{ID}/code/` following project conventions. Wire mocks from `states.json` via `window.UxdScenario.get()` / `useUxdScenario` so `?state=<id>` lands on the intended UI with no extra clicks. See [references/state-mocks.md](references/state-mocks.md).

**Standalone:** generate HTML in `artifacts/{ID}/prototype/` with PatternFly 6 CDN:

```html
<link rel="stylesheet" href="https://unpkg.com/@patternfly/patternfly@6/patternfly.min.css" />
<link rel="stylesheet" href="https://unpkg.com/@patternfly/patternfly@6/patternfly-addons.min.css" />
```

Implement the component mapping from PatternFly preparation. Use documented PatternFly components and wrappers; prefer supported props, layout utilities, and tokens before custom CSS. Standalone HTML must follow documented PatternFly HTML markup and implement its interactions — CDN styles alone do not supply behavior. Same state wiring as above.

**Source consistency check:** review route registrations, navigation links, journey action selectors, and state/mock mappings in the changed code. Keep `journeys.json` and `states.json` aligned with the implementation. This is a code review; leave runtime walkthroughs and visual confirmation to the user at handoff.

## Step 9: Write Prototype Artifacts

- `changeset.md` — files created/modified
- `metadata.json` — id, title, `decision_mode`, screens, paths, timestamps
- `prototype-summary.yaml` — machine-readable summary for downstream skills
- `{ID}-design-spec.md` — QE companion projected from the built UI, `journeys.json`, and `states.json`. Fill [references/templates/design-spec.md](references/templates/design-spec.md). Rules: [references/design-spec.md](references/design-spec.md). Set `design_spec_path` in metadata and the summary.
- Keep `journeys.json` / `states.json` in sync with what was actually built

## Step 10: Install Prototype Bar

*Skip if `--no-prototype-bar`. Otherwise mandatory.*

```bash
EXPORT_SKILL="${CLAUDE_SKILL_DIR}/../uxd-prototype-export"
bash "${EXPORT_SKILL}/scripts/install-prototype-bar.sh" \
  --artifacts "artifacts/{ID}" \
  --source "<prototype-dir-or-workspace>" \
  --mode standalone|workspace
```

`--source` is `artifacts/{ID}/prototype/` (standalone) or the workspace root from `workspace-analysis.json`. If auto-mount fails for React, import `<PrototypeBar />` in the app shell.

Re-run after evaluate so the Eval tab gets the report (`public/evals/{ID}/`). Pass `--no-eval-copy` if the report is not needed.

## Step 11: Code-Level Checks

*Apply in both modes before handoff.*

1. Follow the compliance reference's **Post-generation code checks**: run `pf-component-check` and `pf-component-reuse-check` on scoped React changes, plus the CSS review. For standalone HTML, inspect the documented HTML structure and event wiring in source. Fix issues within the authorized scope and recheck changed code.
2. **Workspace:** install deps if needed and run applicable lint/build/type checks. Fix failures introduced by the prototype, update `changeset.md`, and record results in `artifacts/{ID}/verification.json`.
3. **Standalone:** review the generated HTML/CSS/JavaScript for syntax, documented component structure, and state wiring. No server or browser is needed for this step.

Keep these checks scoped to the changed code. Do not start the dev server, open the prototype, or run browser/E2E tests for verification. Report the code checks actually performed; runtime review is deferred to handoff rather than treated as a blocked check.

## Step 12: Journey export (when `--export`)

*Skip unless `--export`.*

1. Confirm `journeys.json` (prefer `"export": true`; else `--export-all-if-unset`) and `states.json`
2. Resolve `--url` — ask if missing. For standalone, serve `prototype/` and use that origin
3. `cd "${CLAUDE_SKILL_DIR}/../uxd-prototype-export" && npm install`
4. Run:

```bash
EXPORT_SKILL="${CLAUDE_SKILL_DIR}/../uxd-prototype-export"
node "${EXPORT_SKILL}/scripts/export-journey.mjs" \
  --base-url "{URL}" \
  --journeys "artifacts/{ID}/journeys.json" \
  --scenarios "artifacts/{ID}/states.json" \
  --out "artifacts/{ID}/exports" \
  --formats "{html,pf-spec|html,tree,pf-spec}" \
  --export-all-if-unset
```

5. Record export paths in `metadata.json` and `prototype-summary.yaml`

Optional local helper so the bar can write captures and open Eval at `http://127.0.0.1:9417/evals/{ID}/`:

```bash
node "${EXPORT_SKILL}/scripts/export-helper.mjs" \
  --out "artifacts/{ID}/exports" \
  --artifacts "artifacts"
```

## Step 13: Summary and Next Steps

At this final handoff, start the prototype with its documented launch command if needed, or reuse its existing server. Open the prototype's entry page once for the user to review and confirm. Do not click through routes, test states, or begin an evaluation. If launching is unavailable, provide the entry file or launch command and explain the specific limitation.

Lead with what people can try and the prototype link. Briefly describe what was built, assumptions, and the code checks performed, including relevant PatternFly structure/reuse/CSS findings or exceptions. Make clear that the user will review the running experience; do not imply that browser behavior or acceptance criteria have been evaluated. Keep artifact links and next steps relevant:

1. Invite the user to try the prototype and share changes they want
2. Offer `uxd-prototype-evaluate {ID} <URL> [--workspace=…]` for a separate evaluation
3. Point to `artifacts/{ID}/{ID}-design-spec.md` as the file QE can attach to the strategy as `{ID}-design-spec.md`, or pass as a local path when creating a test plan
4. Offer export or publishing when useful

If `--pipeline` / `--speedrun`, continue with [references/pipeline-mode.md](references/pipeline-mode.md).

---

## Refinement

Apply targeted changes from user feedback or existing evaluation findings — do not rewrite the prototype. Full procedure: [references/refinement-procedure.md](references/refinement-procedure.md).

Reads `artifacts/{ID}/eval/evaluation-report.csv` + `refinement-suggestions.json`. For explicitly requested evaluation loops, pass = zero FAIL and default max = 3 cycles. Ordinary refinement applies feedback, runs code-level checks, and hands back the prototype without re-evaluating.

```
/uxd-prototype-create refine {ID} [--decisions skip|auto|human] [--headless] [--max-cycles 3]
```

`--headless` loops refine → evaluate until zero FAIL, max cycles, or plateau.

## Guardrails

- **Agree on the experience before building.** Resolve missing onboarding information and describe the plan; reuse explicit agreement already given.
- **Do not clone the target.** Build only in `--workspace`.
- **Do not invent journeys or states** that the source does not support — record assumptions instead.
- **States must be visually distinct** on load. Modal and drawer interactions belong in journey `actions`.
- **Workspace code checks are mandatory** — lint/build failures introduced by the prototype must be fixed. Prototype launch is for the final user handoff; browser walkthroughs require a separate evaluation request.
- **PatternFly selection and checks are mandatory** for PatternFly prototypes in both modes, including refinement and `--decisions=skip`. Follow the compliance reference for missing helpers or a workspace using another design system.

## Reference Docs

| Doc | When to load |
|-----|-------------|
| [output-formats.md](references/output-formats.md) | Writing create artifact files |
| [design-spec.md](references/design-spec.md) | Rules for `{ID}-design-spec.md` |
| [templates/design-spec.md](references/templates/design-spec.md) | Design spec template to fill |
| [patternfly-compliance.md](references/patternfly-compliance.md) | Before component selection and during code-level checks |
| [journeys-schema.md](../uxd-prototype-export/references/journeys-schema.md) | `journeys.json` shape (owned by export) |
| [states-schema.md](../uxd-prototype-export/references/states-schema.md) | State field rules (`id`, `name`, `description`, `default`) |
| [state-brainstorm.md](references/state-brainstorm.md) | Planning page states |
| [state-mocks.md](references/state-mocks.md) | Wiring `?state=` mocks |
| [workspace-suggestions.md](references/workspace-suggestions.md) | Suggesting an existing prototype from Jira/project context |
| [decision-workflow.md](references/decision-workflow.md) | `--decisions=auto` or `human` |
| [refinement-procedure.md](references/refinement-procedure.md) | Applying eval feedback |
| [pipeline-mode.md](references/pipeline-mode.md) | `--pipeline` / `--speedrun` |
| [edge-cases.md](references/edge-cases.md) | Thin RFEs, clone failures, Jira down, API-only tickets |
