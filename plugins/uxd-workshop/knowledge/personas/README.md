# Personas

Canonical UXD **role** persona registry for this plugin.

Context lenses (experience, accessibility, regulation, team size, …) are **persona overlays** — see [`overlays/`](overlays/).

## A note on personas

Personas are useful, and they come with risks. In UX practice they are often treated like “average” or “median” users — a bucket of jobs-to-be-done for a role. That is handy for conversation and for skills that need a stable role lens, but nobody is exactly average. Real people diverge from the bucket; talking as if a persona were a specific person can flatten nuance and hide edge cases.

Prefer grounding in specific people and research when you have it. Treat these cards as **general job / role hats** you can wear for walkthroughs and evals — not as stand-ins for individuals. Hats change with situation: experience, accessibility needs, regulated environments, team size, and other context can reshape how the same role behaves.

## Source of truth

1. **[`catalog.yaml`](catalog.yaml)** — IDs, display names, roles, aliases, default experience
2. **Persona cards** — role-named markdown matching [`TEMPLATE.md`](TEMPLATE.md)
3. **[`overlays/`](overlays/)** — persona overlays (same `+` composition rules below)

Skills that need personas should **read the catalog first**, then load the card from `card:` (and optional deep behavioral YAML under `.context/` if present). Load overlays from `overlays/` when alias language or eval goals call for them.

## Card format

Copy [`TEMPLATE.md`](TEMPLATE.md). Required shape:

1. YAML front matter (`id`, `display_name`, `role`, `aliases`, `default_experience`)
2. `#` title matching the role
3. `## Who`
4. `## When to use`

| Field | Purpose |
|-------|---------|
| `id` | Stable role ID (matches filename stem) |
| `display_name` | Human label for reports / conversation |
| `role` | Short role title |
| `aliases` | Also-known-as phrases for the same role (matching + human labels); singular only |
| `default_experience` | Which experience overlay levels to pair for eval |

## Aliases (matching)

`aliases` are near-synonyms for the same role hat — not distinct personas. Skills match free-text target-audience language against each persona’s `id`, `role`, and `aliases` (case-insensitive substring). Prefer longer / more specific matches when several apply. Overlay matching uses aliases on overlays (and on slider levels) in [`overlays/catalog.yaml`](overlays/catalog.yaml).

**Write aliases in the singular.** Do not add plural variants (`data scientist`, not `data scientists`). Substring matching already covers common plurals.

## File naming

Cards and IDs are named by **role**:

| Card file | ID | Display name |
|-----------|-----|--------------|
| `data-scientist.md` | `data-scientist` | Deena |
| `ml-engineer.md` | `ml-engineer` | Alex |
| `mlops-operator.md` | `mlops-operator` | Maude |
| `platform-engineer.md` | `platform-engineer` | Paula |
| `system-admin.md` | `system-admin` | Sam |
| `security-compliance.md` | `security-compliance` | Priya |
| `infrastructure-architect.md` | `infrastructure-architect` | Ira |
| `automation-developer.md` | `automation-developer` | Avery |
| `automation-admin.md` | `automation-admin` | Adrian |
| `app-developer.md` | `app-developer` | Dana |

## Composition with overlays

All overlays compose the same way. Do **not** repeat composition rules inside individual overlay cards — document them here only.

| Form | Example |
|------|---------|
| Persona only | `data-scientist` |
| + experience level | `data-scientist+junior` |
| + context overlay | `data-scientist+senior+accessibility` |
| + team size level | `ml-engineer+junior+small-team` |
| + several | `platform-engineer+experienced+large-team+regulation` |

Rules:

1. First segment is always the role persona `id`
2. Every later segment is an overlay, joined with `+`
3. For **slider** overlays (`experience`, `team`), the segment is a **level** id (`junior`, `small-team`, …)
4. For **context** overlays (`accessibility`, `regulation`), the segment is the overlay `id`
5. Order after the persona is flexible; prefer `experience`, then other overlays, for readability

## Optional deep profiles

If `.context/usability-testing/personas/<composed-id>.yaml` exists (from bootstrap), use it for patience, constraints, and domain_knowledge. The catalog still owns IDs, display names, and aliases.

## Adding a persona

1. Copy [`TEMPLATE.md`](TEMPLATE.md) to `{id}.md` and fill it in
2. Add an entry to `catalog.yaml` with matching `id`, `aliases`, and `card:`
3. Optionally add matching deep YAML under your local `.context/` for evaluate Phase B
