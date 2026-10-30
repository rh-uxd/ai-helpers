---
name: uxd-canvas-create
version: 0.1.0
description: >-
  Create or refine a canvas as local JSON Canvas, a Miro board, or both.
  Covers journey maps, paired as-is/to-be vision maps, service blueprints,
  architecture diagrams, user flows, affinity maps, mind maps, and Mermaid
  diagrams. Use when turning a brief, research, an existing canvas, or a Miro
  board into a spatial artifact.
---

# Create Canvas

Author or revise a canvas. JSON Canvas is the working model. It is the stored source of truth only for a local canvas. A Miro board can be the source of truth instead. Mermaid is a diagram notation, not another location.

Family: **create** → `uxd-canvas-export` → `uxd-canvas-publish`. Publish ships a static copy. It does not create or update Miro.

## Requirements

- Node.js 18 or later to validate a local `canvas.json`.
- The Miro connection, when the canvas lives on a board. Load the Miro canvas-composer instructions before any SVG write.

## Where it lives

Read [canvas locations](references/canvas-locations.md) before choosing or changing the location.

- **Local** (default when the user does not name a board): write `.artifacts/{ID}/canvas/`, or a path they supply.
- **Miro:** create or update the board. A local `canvas.json` is optional. When the board is canonical, call that file a snapshot, not the source of truth.
- **Both:** the board is canonical and the local file is a snapshot with `source.url` and `miroId` on each node and edge.

## Inputs and outputs

Accept a brief, document, ticket, research, Mermaid source, an existing canvas, a Miro URL, or a direct description. If the purpose, audience, or source content is materially unclear, ask only for the missing information.

Local output:

```text
canvas/
├── canvas.json
├── metadata.json
└── assets/          # only when the canvas uses local files
```

`metadata.json` contains `title`, `description`, `createdAt`, and `updatedAt`. A Miro snapshot also contains `source` as defined in the locations reference. Do not put presentation state or secrets there.

## Templates

If the user names a type below, read that folder's `context.md` and start from its `canvas.json`. See [templates/README.md](templates/README.md). For vision work after a problem brief, use the paired vision journey map. For other journey maps, use the general journey-map template. Keep the selected template's columns, rows, and reading order. Replace the placeholder text. Add or remove a whole phase column when the evidence needs a different number of stages. When revising a canvas that already exists, keep its structure unless the user asks to restart from the template.

| Request | Template |
|---|---|
| Vision journey map, paired as-is and to-be map | `templates/vision-journey-map` |
| Journey map, customer journey, or experience map | `templates/journey-map` |
| Service blueprint | `templates/service-blueprint` |
| User flow or task flow | `templates/user-flow` |
| Affinity map | `templates/affinity-map` |
| Mind map | `templates/mind-map` |

A flowchart, sequence diagram, ERD, or class diagram stays Mermaid. A freeform canvas has no template: choose the structure that fits the source.

## Mermaid

Follow the locations reference. Journey maps, blueprints, and affinity maps stay spatial JSON Canvas. A flowchart, sequence diagram, ERD, or class diagram stays Mermaid: a Miro diagram widget when the board is the destination, or a text node with `subtype: "mermaid"` when the destination is local.

## Authoring workflow

1. Resolve location, communication goal, audience, canvas type, source evidence, and reading order. For a vision journey map, check whether the brief has a separate **Journey starter**.
2. If the type has a template, read its `context.md` and copy `canvas.json` as the base before writing anything else.
3. For a new vision map, use the brief's Journey starter as provisional seed content. If it is missing, draft a concise paired outline from the supplied brief now; preserve evidence tags, label assumptions, and leave missing capability or horizon context open instead of inventing it. Share the outline before creating or writing to a Miro board.
4. If the source is a Miro URL, read that board or one frame and preserve every widget id before editing. Confirm before creating a board, writing widgets, or deleting items. Fit the board's content into the template when the user asked for one of those types.
5. Read [JSON Canvas fields and extensions](references/canvas-schema.md) before authoring unfamiliar node types or presentation extensions.
6. Write the working model with stable ids such as `phase-discover-actions`. Copy widget ids onto `miroId` in any snapshot. After a new board write, store the ids the create call returns.
7. Copy local files into `assets/` and use relative paths. Do not embed credentials, authenticated URLs, or inaccessible local absolute paths.
8. Validate any `canvas.json` you write:

```bash
node "${CLAUDE_SKILL_DIR}/scripts/validate-canvas.mjs" <path-to-canvas.json>
```

Fix every error. Review warnings for overlaps, dense text, and edge routing rather than dismissing them automatically.

## Craft rules

- Keep nodes scannable. A title plus one short supporting line is usually enough; split paragraphs and long lists across nodes.
- Size nodes to fit their content. Starting points: title `200×80`; title plus a line `250×100–120`; 3–4 short lines `250×160–200`; dense content `320–400×240–400` or multiple nodes. Size a Mermaid node for its source text. The HTML viewer shows that source.
- Use a 20-unit grid and leave at least 30–40 units between neighboring nodes. Avoid overlaps and edges crossing unrelated nodes.
- Use color semantically and consistently. Do not rely on color alone to communicate status or meaning.
- Put groups behind their children. The bundled viewer reserves the top 24 units of a group for its label.
- Use `fromSide` and `toSide` to reinforce reading order; add arrow endpoints when direction matters.
- Keep primary content visible without scrolling at the initial fit-to-content view.

## Completion check

- The structure answers the stated communication goal. A requested journey map, blueprint, flow, affinity map, or mind map still follows its template.
- A vision journey map keeps matching As-Is and To-Be phases, actor, and scenario; evidence and assumptions remain distinguishable.
- A vision map uses the brief's Journey starter as a draft, not a decision. Preserve its stable step labels and evidence trail while the team edits and confirms the Miro frames.
- Placeholder template copy is gone. Research-derived claims trace to the supplied sources, and assumptions are labeled.
- Local canvases pass the validator: unique ids, positive dimensions, resolved edges, readable labels, no unintended overlap, and local assets resolve.
- A Miro write names the board URL. Updates reuse existing widget ids. Deletions were confirmed item by item.
- A snapshot records `source.url` and `miroId` values, and is not described as the source of truth when the board is canonical.
- Jira cards, reactions, and drawings that could not round-trip to Miro are called out.
