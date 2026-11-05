# Publish to Figma Slides

The local deck stays the source. This path creates or updates the shared Figma Slides file from that deck. It does not replace `slides/` or `metadata.json`.

## Plan

```bash
node "${CLAUDE_SKILL_DIR}/scripts/publish-figma.mjs" <deck-dir> --out <plan.json>
```

Read the JSON. `action` is `create` for a new file and `update` when a file key is already known. Each slide has `template`, `heading`, `subheading`, `body`, `notes`, and, for a beat, `story` and `rail`. `imagePath` is an absolute path to a file in `assets/`. The script does not call Figma.

`--file-key` or `--file-url` selects an existing Slides file. When `canonical.target` is already `figma-slides`, the plan uses that URL.

## Create

Load the instructions for creating a new Figma file before creating one. Use the deck title as the file name and the Slides editor type. A new Slides file has an empty grid: create the first slide before reading theme tokens from a slide.

## Update

Use `fileKey` from the plan only after the user confirms that this run should update that file. Edit the existing slides in place. Add slides when the deck has more than the file. Do not delete existing slides to rebuild the file unless the user asked to start over.

## Build

Load the Figma Slides instructions before any Slides write. Build from the plan in `index` order, one idea per slide. Keep the deck's 16:9 frame. Put speaker notes in `speakerNotes`, not on the slide. On a `split` or `beat` slide, place the file at `imagePath` on the slide. Upload that local file into the Slides file. Do not publish the image to a public host.

Do not also create a Google presentation in the same run.

## Record

After the file URL exists:

```bash
node "${CLAUDE_SKILL_DIR}/scripts/mark-published.mjs" <deck-dir> \
  --target figma-slides \
  --url <https://www.figma.com/slides/...>
node "${CLAUDE_SKILL_DIR}/../uxd-slides-export/scripts/export-slides.mjs" <deck-dir>
```

The URL must be an `https://www.figma.com/slides/` link. Leave the plan file outside the deck directory.
