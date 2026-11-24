---
name: uxd-slides-export
version: 0.1.0
description: >-
  Build a local HTML, CSS, and JavaScript slide viewer inside a slide deck
  folder. Use when presenting a deck locally or preparing it for publish.
  Does not publish to Google Slides or Figma Slides.
audience: UXD practitioners
inputs: A deck directory with metadata.json, slides, and assets
outputs: index.html, viewer.css, viewer.js, and deck.json in that deck
---

# Export Slides

Turn a deck folder into a local presentation. The viewer is HTML, CSS, and JavaScript next to the slides. Do not inline the CSS or JavaScript into `index.html`. Do not publish. Google Slides and Figma Slides are `uxd-slides-publish`. Editing the deck is `uxd-slides-create`.

The viewer chrome lives next to the export script:

```text
viewer/
├── index.html
├── viewer.css
└── viewer.js
```

`scripts/export-slides.mjs` copies that chrome into the deck and embeds the compiled slide list in `index.html`. Slide layout CSS stays in `assets/default.css`. Deck-wide theme rules stay in `assets/custom.css` when that file exists. Per-slide overrides are compiled to `slide-overrides.css` only when a slide folder has `custom.css`. The stage is 1920×1080 and scales to the window. Arrow keys, Space, and the two halves of the slide move between slides. `S` toggles speaker notes. `F` hides the toolbar. Escape leaves present mode.

Family: `uxd-slides-create` → **export** → `uxd-slides-publish`.

## Requirements

- Node.js 18 or later.
- Python 3, or another static server, to check the viewer in a browser.

## Inputs and output

Accept a deck directory that contains `metadata.json`, `slides/`, and `assets/default.css`. Images live in `assets/`.

The viewer is written into that same directory. Pass `--output` only when a second copy is needed.

```text
.artifacts/slides-name/
├── index.html
├── viewer.css
├── viewer.js
├── deck.json
├── export-manifest.json
├── slide-overrides.css
├── metadata.json
├── assets/
└── slides/
```

`deck.json` is the compiled slide list the page embeds. `export-manifest.json` records the title, template, slide count, status, and written files. Edit `slides/` and `assets/`, then export again.

## Flags

$ARGUMENTS

Parse as: `<deck-dir> [--output <dir>] [--title <text>]`.

| Flag | Default | Meaning |
|---|---|---|
| `--output` | the deck directory | Where the viewer files are written |
| `--title` | `metadata.json` title | Viewer title |

## Build

1. Confirm `metadata.json`, `slides/`, `assets/default.css`, and every local image path.
2. Review slide text and images for confidential or personal data before suggesting publish.
3. Export:

```bash
node "${CLAUDE_SKILL_DIR}/scripts/export-slides.mjs" <deck-dir>
```

4. Serve the deck and open `index.html`. Check the first slide, a content slide, a split slide when the deck has one, notes, and present mode.

```bash
python3 -m http.server --directory <deck-dir> 8000
```

5. Report the deck path, template, and slide count. When `canonical` is set, say whether the banner shows a current shared copy or a stale one. Suggest `uxd-slides-publish` only when the user wants Google Slides or Figma Slides.

## Completion check

- The deck opens through a local static server and needs no application server.
- CSS and JavaScript stay in `assets/default.css`, `assets/custom.css` when present, `viewer.css`, and `viewer.js`.
- Local images stay under `assets/`. Remote and absolute paths were not added.
- `export-manifest.json` lists the written files, including itself.
- Speaker notes are off the slide until Notes is opened.
- The deck folder was not described as the shared copy.
