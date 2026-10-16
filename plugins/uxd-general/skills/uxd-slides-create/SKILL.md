---
name: uxd-slides-create
version: 0.1.0
description: >-
  Create or refine a local slide deck from a deck template. Use when turning a
  brief, research readout, design review, or user journey into slides. When the
  user wants Google Slides or Figma Slides, author the local deck and continue
  into uxd-slides-publish.
audience: UXD practitioners
inputs: A brief, notes, ticket, research, or an existing slide deck directory
outputs: A deck folder with metadata.json, assets, and numbered slide folders
---

# Create Slides

Author or revise a slide deck. Each slide is a numbered folder. A deck template supplies the starting sequence. Slide templates supply a single slide when you add one. The local viewer is `uxd-slides-export`. A Google Slides or Figma Slides copy is `uxd-slides-publish`.

Family: **create** → `uxd-slides-export` → `uxd-slides-publish`.

## Requirements

- Node.js 18 or later to create and validate a deck.

## Where it lives

Default location is `.artifacts/slides-{name}/`. `{name}` is a kebab-case slug from the title. Use a path the user supplies when they give one.

```text
.artifacts/slides-name/
├── metadata.json
├── assets/
│   └── default.css
└── slides/
    ├── 1/
    │   ├── content.md
    │   ├── speaker-notes.md
    │   └── metadata.json
    └── 2/
        └── …
```

Deck `metadata.json` contains `specVersion` (`0.1.0`), `title`, `description`, `template` (the deck template name), `aspectRatio` (`16:9`), `status`, `createdAt`, and `updatedAt`. `specVersion` is the slides artifact spec in `specifications/slides/`. `status` is `draft` until publish. Optional `models` and `agents` record who made the deck: each entry is `{ "id", "description" }`. `id` is the model, agent, or skill identifier this session reports. `description` is one line on what it did. Omit a list when the identifier is unknown. Do not invent names. Do not put secrets in metadata. Do not change `specVersion` by hand.

`assets/default.css` is the layout snapshot. Deck-wide theme changes, such as a new highlight color, go in `assets/custom.css`. A slide that must diverge from its slide template gets `slides/{n}/custom.css`. Omit both files until there is a real override.

After publish, `canonical` records the shared URL. Editing the deck sets `status` back to `draft` and leaves `canonical` in place. The viewer then says the shared copy is stale.

## Templates

Read [templates/README.md](templates/README.md). If the user names a type, read that deck's `context.md`. Keep its slide order. Replace every placeholder. When revising a deck that already exists, keep its folders unless the user asks to restart from the template.

| Request | Deck template |
|---|---|
| Briefing, stakeholder update, or a general talk | `briefing` |
| Research readout or findings share-out | `research-readout` |
| Design review or critique readout | `design-review` |
| User journey or story-beat walkthrough | `user-journey` |
| Vision brief or connected-experience narrative | `vision` |

Any other deck starts from `briefing`. To add a slide, copy `templates/slides/{template}/` into `slides/{next-number}/`. Read [slides format](references/slides-format.md) before adding a slide template.

## Starting with nothing

When a person opens this skill with no brief, no source, and no flags, greet them and ask for three decisions in one message. Do not create a folder yet.

> Hello! This is version <x> of the Slides Creator skill.
>
> This skill turns context you provide into a slide deck either locally as HTML, in Google Slides, or in Figma Slides. It can also create slide decks based on preconfigured templates.
>
> A few questions to start:
>
> 1. What should the deck be about? Do you have any links to relevant context sources?
> 2. What type of deck should this be (e.g. a briefing, research readout, design review, user journey, vision, etc.)
> 3. Where should it live? Locally, in Google Slides, or in Figma Slides?

Accept a messy answer. Pull the goal, audience, template, source, and destination out of it. A doc, ticket, or notes link is source material. A Google Slides or Figma Slides link is the shared copy to create or update. Ask once more only for a gap that blocks the deck. If they already answered one of the three, do not ask for that one again.

## Authoring workflow

1. If the invocation has no brief, no source, and no flags, use [Starting with nothing](#starting-with-nothing) and wait. Otherwise resolve the deck name, communication goal, audience, deck template, source evidence, and destination. The destination is the local viewer unless the user asks for Google Slides or Figma Slides. If the goal, audience, or source is materially unclear, ask only for the missing information. A named destination still starts as a local deck.
2. Read the deck `context.md`, then create the folder:

```bash
node "${CLAUDE_SKILL_DIR}/scripts/instantiate-deck.mjs" <deck-template> .artifacts/slides-{name}
```

3. Write one idea per slide in that folder's `content.md`. Use a heading plus at most five bullets, or two short sentences. Put speaker notes in `speaker-notes.md`, not on the slide.
4. Copy local images into `assets/` and set a split or beat slide's `image` to `assets/file.png`. Do not embed credentials, authenticated URLs, or absolute local paths.
5. Reorder by renaming the numbered folders. Do not edit slide content just to change order.
6. Label assumptions. Do not present invented observations as research. Remove every "Replace with" placeholder.
7. Fill deck `metadata.json`. New decks use `"status": "draft"`. Add a `models` entry for each model that authored or revised the deck, and an `agents` entry for each agent or skill, using the identifier this session reports and a one-line `description` of what it did. Keep earlier entries when a later model revises the deck. A revision of a published deck returns `status` to `draft` and keeps `canonical`.
8. Validate, then build the viewer into the same folder:

```bash
node "${CLAUDE_SKILL_DIR}/scripts/validate-slides.mjs" .artifacts/slides-{name}
node "${CLAUDE_SKILL_DIR}/../uxd-slides-export/scripts/export-slides.mjs" .artifacts/slides-{name}
```

Fix every error. Review warnings for dense slides and missing assets. Serve the deck and check the sequence, template, and images.
9. When the destination is Google Slides or Figma Slides, continue in this session with `uxd-slides-publish` and that target. The local deck is the source the shared copy is built from. Publish confirms before it writes the external file and records the URL on this deck. When the destination is the local viewer, suggest `uxd-slides-publish` only if the user later wants a Google Slides or Figma Slides copy.

## Completion check

- The sequence still follows the requested deck template.
- Placeholder copy is gone. Claims trace to the supplied sources, and assumptions are labeled.
- `models` lists each model that did the work, with what it did. Earlier models remain after a revision. `agents` does the same when an agent or skill identifier is known.
- Validation passes: known slide templates, headings, relative asset paths, and required metadata.
- The viewer was built in the deck folder and checked locally.
- A request for Google Slides or Figma Slides continued into `uxd-slides-publish` after the local deck validated. The local `slides/` folders are still the source.
- A published deck that was edited is `draft` again, with the previous shared URL still in `canonical`.
