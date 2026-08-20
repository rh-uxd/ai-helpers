# eval-usability-personas

Persona selection and loading procedure for Phase B usability walkthroughs. Called from `eval-usability.md` Step 1.

## Prerequisites

- `extract-state.json` with `persona_selection.target_audience_text`
- Plugin persona catalog at `${CLAUDE_PLUGIN_ROOT}/knowledge/personas/catalog.yaml`
- Plugin overlays catalog at `${CLAUDE_PLUGIN_ROOT}/knowledge/personas/overlays/catalog.yaml`

## Step 1: Select personas based on target audience

**Load the canonical catalogs first:**

```
${CLAUDE_PLUGIN_ROOT}/knowledge/personas/catalog.yaml
${CLAUDE_PLUGIN_ROOT}/knowledge/personas/overlays/catalog.yaml
```

(Fallback: `${CLAUDE_SKILL_DIR}/../../knowledge/...`)

1. Read `extract-state.json > persona_selection.target_audience_text`
2. Match against each persona's `id`, `role`, and `aliases` in the personas catalog (case-insensitive substring). Aliases are singular; substring matching covers plurals. Prefer longer / more specific matches when several apply.
3. Use `defaults.pair` when no alias match
4. Compose with experience overlays from each persona's `default_experience` (prefer one junior + one senior/experienced)
5. If language matches overlay `aliases` (or slider level `aliases`) in the overlays catalog — e.g. accessibility, regulation, team size — attach those overlays onto the selected role personas; do **not** treat overlays as standalone personas
6. Read matching persona cards under `knowledge/personas/<card>` and any overlay cards under `knowledge/personas/overlays/<id>.md`

Do **not** invent new persona names when a catalog entry fits. If you must add a temporary persona, note it in `persona_selection.considered_but_rejected` / reasoning and prefer proposing a catalog update.

**Minimum persona floor:** Always select at least 2 personas (one junior, one senior/experienced). Even for read-only or single-page prototypes, 2 personas with different experience levels provide meaningful usability signal. If `defaults.pair` resolves to a single persona, compose with both `+junior` and `+senior` overlays.

## Step 2: Load persona detail (card + optional deep YAML)

For each selected variant ID:

1. Parse the composed run ID as `{persona-id}+{overlay}+…` (e.g. `data-scientist+junior`, `ml-engineer+senior+accessibility`). First segment is the persona; every later `+` segment is an overlay.
2. Resolve the persona card from `personas/catalog.yaml` -> `card` (e.g. `data-scientist.md`)
3. Read `${CLAUDE_PLUGIN_ROOT}/knowledge/personas/<card>` (use front matter for `id`, `display_name`)
4. For each overlay segment, read `${CLAUDE_PLUGIN_ROOT}/knowledge/personas/overlays/<id>.md` (experience levels: `junior` / `senior` / `experienced`; team levels: `small-team` / `medium-team` / `large-team`; context overlays: `accessibility`, `regulation`)
5. If present, read deep behavioral YAML:

```
.context/usability-testing/personas/<composed-id>.yaml
```

When deep YAML is missing (usability-testing context repo not cloned), proceed with catalog + cards only. Re-run `bootstrap-usability-testing.sh` after setting `USABILITY_TESTING_REPO` (or overlay `context_repos.usability_testing`) to restore full scoring fidelity.

From deep YAML (when available), extract and use:
- **`domain_knowledge`** — map of topics to skill levels (none/minimal/basic/intermediate/competent/strong/expert). Use in patience assessment to determine what the persona would understand vs. find confusing.
- **`behavioral_attributes.patience`** — High/Medium/Low. Determines patience drain rates.
- **`behavioral_attributes.exploration_tendency`** — Low/Medium/High. Determines how aggressively the persona explores the UI during their walkthrough.
- **`constraints[]`** — specific limitations and behavioral rules (e.g., "Cannot interpret Kubernetes terminology", "After 3 confusion events, abandon"). Each constraint is injected into the persona sub-agent's prompt.
- **`primary_jobs[]`** — what the persona is trying to accomplish (JTBD). Use to evaluate whether the UI supports their actual goals.
- **`experience_level`** — junior/senior/experienced. Combined with `exploration_tendency` and `domain_knowledge`, this drives how the persona navigates.

## Step 3: Read the scoring rubric

Read the 7-dimension rubric:

```
.context/usability-testing/prompts/evaluate-flow.md
```

This file defines the specific scoring criteria for each dimension (0-3 scale). Use these criteria — not generic inference — to assign scores. The rubric defines what "Broken" (0), "Fragmented" (1), "Functional" (2), and "Seamless" (3) mean for each specific dimension.

## Step 4: Write persona_selection to journey-log.json

**IMMEDIATELY write `persona_selection` to journey-log.json** before any scoring:

```json
{
  "persona_selection": {
    "method": "automatic",
    "target_audience_text": "...",
    "target_audience_source": "...",
    "reasoning": "...",
    "selected": ["data-scientist+junior", "data-scientist+senior"],
    "catalog": "${CLAUDE_PLUGIN_ROOT}/knowledge/personas/catalog.yaml",
    "overlays_catalog": "${CLAUDE_PLUGIN_ROOT}/knowledge/personas/overlays/catalog.yaml",
    "considered_but_rejected": []
  }
}
```
