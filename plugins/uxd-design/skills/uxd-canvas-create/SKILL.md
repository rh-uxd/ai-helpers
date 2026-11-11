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

1. Resolve location, communication goal, audience, canvas type, source evidence, and reading order. For a vision journey map, check whether the brief has separate **As-Is and To-Be map starters**.
2. If the type has a template, read its `context.md` and copy `canvas.json` as the base before writing anything else.
3. For a new vision map, use the brief's separate As-Is and To-Be map-shaped Journey starters as provisional seed content. Carry the playbook's map lanes and matching `S#` stage columns into both frames. If the starter is missing, draft a concise paired outline from the supplied brief now; preserve evidence tags, label assumptions, and leave missing capability or horizon context open instead of inventing it. Share the outline before creating or writing to a Miro board.
4. If the source is a Miro URL, read that board or one frame and preserve every widget id before editing. Confirm before creating a board, writing widgets, or deleting items. Fit the board's content into the template when the user asked for one of those types.
5. Read [JSON Canvas fields and extensions](references/canvas-schema.md) before authoring unfamiliar node types or presentation extensions.
6. Write the working model with stable ids such as `phase-discover-actions`. Copy widget ids onto `miroId` in any snapshot. After a new board write, store the ids the create call returns.
7. For a completed paired vision map, run the research coverage check below before handing it to the narrative stage.
8. Copy local files into `assets/` and use relative paths. Do not embed credentials, authenticated URLs, or inaccessible local absolute paths.
9. Validate any `canvas.json` you write:

```bash
node "${CLAUDE_SKILL_DIR}/scripts/validate-canvas.mjs" <path-to-canvas.json>
```

Fix every error. Review warnings for overlaps, dense text, and edge routing rather than dismissing them automatically.

### Vision map research coverage check

After the team confirms both journey-map frames, compare the mapped As-Is pains and needs, and the To-Be assumptions and support opportunities, with existing findings from `uxd-research-insights`.

- Start from the preliminary, stage-by-stage coverage and `Research gap:` notes in the brief's map starters. Revisit those notes against the completed map, correcting statuses and adding gaps raised by team edits; avoid repeating the same lookup or duplicating unchanged notes.
- Use findings already gathered for the brief when available. If none were gathered and the skill is installed and authorized, search for relevant findings. Do not treat missing search results as proof that no research exists.
- Judge only whether the available findings are relevant to and cover the mapped claims. Mark coverage as supported, partial, or not found; keep citations and `[E#]` links traceable.
- Identify unsupported pains, needs, and future-state claims. Keep future claims labeled `[A#]` and list focused research questions that could address material gaps.
- Do not launch new research or block the workflow. The team may proceed with gaps visible as assumptions.
- Add a distinct **Research Coverage & Gaps** lane (row) to both journey-map frames, aligned to the same `S#` stages. This row is the primary map record; a separate summary area may supplement it but must not replace it. For each stage, state a coverage status, cite the relevant `[E#]` findings, and add a concise `Research gap:` question when coverage is partial or not found. In To-Be, distinguish evidence for the underlying need from evidence for the proposed future capability or behavior. Preserve existing map content and keep unsupported future claims labeled `[A#]`.
- Save the written handoff as `.artifacts/journey-map-research-check.md` beside the brief, or `.artifacts/{ID}/journey-map-research-check.md` when an ID is known. Include the Miro URL, coverage judgments, linked findings, assumptions, and suggested research questions. On Miro, make every `[E#]` citation a clickable link to its source. Add a bottom reference strip that defines each `[A#]` used in the map.

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
- A vision map uses the brief's separate As-Is and To-Be map-shaped Journey starters as a draft, not a decision. Preserve the playbook's lanes, matching stage columns, stable step labels, and evidence trail while the team edits and confirms the Miro frames.
- At vision map completion, research coverage and gaps appear as a dedicated, stage-aligned row in both map frames and in the written handoff; unknowns remain labeled as assumptions and do not block progress.
- In Miro, link each evidence citation directly to its source, preserve the source reference cards, and add an assumption reference strip at the bottom with a concise definition for each `[A#]` used. Do not create a generic `Evidence limits` row or emit placeholder text such as `undefined`; put useful limitations in the stage coverage notes or handoff.
- Placeholder template copy is gone. Research-derived claims trace to the supplied sources, and assumptions are labeled.
- Local canvases pass the validator: unique ids, positive dimensions, resolved edges, readable labels, no unintended overlap, and local assets resolve.
- A Miro write names the board URL. Updates reuse existing widget ids. Deletions were confirmed item by item.
- A snapshot records `source.url` and `miroId` values, and is not described as the source of truth when the board is canonical.
- Jira cards, reactions, and drawings that could not round-trip to Miro are called out.
