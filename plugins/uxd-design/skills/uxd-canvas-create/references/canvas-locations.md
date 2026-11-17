# Canvas locations

JSON Canvas is the working model. It is the stored source of truth only for a local canvas. A Miro board can be the source of truth. Mermaid is a diagram notation, not a place a canvas lives.

Read this before choosing or changing where a canvas lives.

## Locations

| Location | What it is | When it is canonical |
|---|---|---|
| Local | `canvas.json` on disk | The user is working in files, or did not name another home |
| Miro | A Miro board URL | The user says the board is the source, or asks to create or update a board and does not want a local file |

When a new canvas has no location and a board is a real option, ask once:

> Where should this canvas live?
>
> - **Local JSON Canvas** — files on disk
> - **A Miro board** — the board is the source of truth
> - **Both** — the board is canonical, and a local file is a snapshot

Do not ask when the user already asked for local files or gave a Miro URL.

## Miro

Creating or updating a Miro board is authoring (`uxd-canvas-create`). It is not `uxd-canvas-publish`.

Requires the Miro MCP connection. Before any SVG write, load the Miro canvas-composer instructions. Do not invent that SVG dialect.

Confirm immediately before creating a board, writing widgets, or deleting items.

- **New board:** create the board, then create widgets from composer SVG. Keep the returned SVG. It stamps `data-miro-id` on every element.
- **Existing board:** read the board, or one frame if it is large. Edit, then update with those ids. A write that drops ids creates duplicate widgets.
- **Scope:** area reads fail above about 500 widgets. SVG payloads cap at about 200,000 characters. Change one frame or area at a time.
- **Delete:** send `data-deleted="true"` on that element's id, and only after the user confirms those items. Leaving an item out of the SVG does not delete it.
- **Fidelity:** text, stickies, groups (frames), images, and connectors round-trip. Jira cards, reactions, and freehand drawings do not. Say what was dropped.

A local `canvas.json` is optional when Miro is canonical. Offer a snapshot. Do not describe that file as the source of truth, and do not require one before updating the board.

When a snapshot is saved:

- Set metadata `source` to the board URL and sync time.
- Copy each widget id onto `miroId` on the matching node or edge.
- On the next edit, send those ids back.

## Mermaid

Use Mermaid for a flowchart, sequence diagram, ERD, or class diagram. Do not encode a journey map, service blueprint, or affinity map as Mermaid. Those lose lanes, phases, and evidence.

- **Miro, and the content is a real diagram:** pass the Mermaid source through as a Miro diagram widget. Do not explode it into JSON Canvas boxes first.
- **Local canvas:** store the source on a text node with `subtype: "mermaid"`. The HTML viewer shows that source. It does not render the diagram. Expand a simple flowchart into nodes and edges only when the user wants the canvas viewer to draw boxes, and say which Mermaid features that drops. A Miro board renders the diagram itself.
- **Export:** `uxd-canvas-export --mermaid` writes `diagram.mmd` from Mermaid nodes, or from a simple node-and-edge flow. Do not request it for a journey map, blueprint, or affinity map.

## Snapshot metadata

```json
{
  "title": "",
  "description": "",
  "createdAt": "",
  "updatedAt": "",
  "source": {
    "type": "miro",
    "url": "https://miro.com/app/board/...",
    "syncedAt": ""
  }
}
```

Omit `source` for a local-only canvas. Do not put secrets in metadata.
