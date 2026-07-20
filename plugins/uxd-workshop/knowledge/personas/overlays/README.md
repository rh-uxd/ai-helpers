# Persona overlays

Cross-cutting lenses applied **on top of** role personas. Not distinct users.

Composition rules live in the parent [`../README.md`](../README.md) — every overlay uses the same `+` segments. Do not restate composition inside individual overlay cards.

| Overlay | File | Kind | What it changes |
|---------|------|------|-----------------|
| Experience | [`experience.md`](experience.md) | slider | Junior / senior / experienced depth |
| Accessibility | [`accessibility.md`](accessibility.md) | context | Keyboard, AT, structure constraints |
| Regulation | [`regulation.md`](regulation.md) | context | Compliance, air-gap, audit constraints |
| Team size | [`team.md`](team.md) | slider | Small / medium / large team constraints |

## Source of truth

1. **[`catalog.yaml`](catalog.yaml)** — overlay IDs, levels, audience tags
2. **Overlay cards** — markdown matching [`TEMPLATE.md`](TEMPLATE.md)

## Card format

Copy [`TEMPLATE.md`](TEMPLATE.md). Required shape:

1. YAML front matter (`id`, `display_name`, `kind`, optional `levels` / `audiences`)
2. `#` title
3. One short intro paragraph
4. `## Lens`
5. `## Levels` — **only** when `kind: slider`; omit for `kind: context`
6. `## When to apply`

| Field | Purpose |
|-------|---------|
| `id` | Stable overlay ID (matches filename stem) |
| `display_name` | Human label |
| `kind` | `slider` (leveled) or `context` (on/off lens) |
| `levels` | Level ids/labels for sliders (composed as `+{level-id}`) |
| `audiences` | Free-text match tags (optional) |

## Adding an overlay

1. Copy [`TEMPLATE.md`](TEMPLATE.md) to `{id}.md` and fill it in
2. Add an entry to `catalog.yaml`
3. Update `audience_map` if free-text matching should select it
4. Keep composition docs in the parent personas README only
