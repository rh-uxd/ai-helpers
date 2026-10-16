---
name: uxd-slides-publish
version: 0.1.0
disable-model-invocation: true
description: >-
  Publish a markdown slide deck to Google Slides or Figma Slides. Use when
  sharing a finished deck, updating the shared copy, or when uxd-slides-create
  was asked to land the deck in Google Slides or Figma Slides. Local HTML stays
  in uxd-slides-export.
audience: UXD practitioners
inputs: A deck directory with metadata.json and a slides directory
outputs: A Google Slides or Figma Slides URL recorded on the local deck
---

# Publish Slides

Create or replace the shared copy of a finished deck. This skill does not author slide folders and does not build the viewer. Run `uxd-slides-create` when the deck does not exist. When create was asked for Google Slides or Figma Slides, it authors the local deck and then continues here. Run `uxd-slides-export` when the user has not looked at the local viewer yet.

Family: `uxd-slides-create` → `uxd-slides-export` → **publish**.

The local markdown stays the authoring source. After a successful publish, `status` becomes `published` and `canonical` points at the shared URL. That is the copy other people should open. Do not delete the local deck.

## Requirements

- A deck directory with `metadata.json` and `slides/` that passes validation.
- `gws` signed in with the Google Slides scope, for a Google target.
- The Figma connection, the instructions for creating a new Figma file, and the Figma slides instructions, for a Figma target. See [Figma publish](references/figma-publish.md).
- Confirmation immediately before any create or replace.

## Inputs and output

| Input | Source | Required |
|---|---|---|
| Deck directory | `.artifacts/slides-{name}/` or `--source` | **Yes** |
| `metadata.json` | deck root | **Yes** |
| `slides/` | numbered folders inside the deck | **Yes** |

If `metadata.json` or `slides/` is missing, **stop** and tell the user to run `uxd-slides-create`. Do not invent a deck here.

The result is a Google Slides URL or a Figma Slides URL, then an updated `metadata.json`.

## Flags

$ARGUMENTS

Parse as: `<deck-dir> [--target google|figma] [--source <dir>] [--dry-run] [--presentation-id <id>]`.

| Flag | Default | Meaning |
|---|---|---|
| `--source` | `.artifacts/slides-{name}/` | Deck to publish |
| `--target` | asked if omitted | `google` or `figma` |
| `--dry-run` | off | Describe the external write and do not send it |
| `--presentation-id` | new deck, or the existing Google id after confirmation | Google presentation to replace |

There is no `--target local`. Local HTML is `uxd-slides-export`.

## Conversational guidance

If the user says "share", "publish", or "I'm done" without a target, ask:

> The deck is ready to share. Where should the shared copy live?
>
> - **Google Slides** — create or replace a presentation with `gws`.
> - **Figma Slides** — create or update a Slides file.

Do not offer a git host, Pages, or Vercel for the deck itself.

## Publish

1. Resolve the deck directory. Prefer `--source`, then `.artifacts/slides-{name}/`.
2. Validate. If validation fails, stop and send the user back to `uxd-slides-create`.
3. Review the text and images for confidential or personal data. Ask before creating a file other people can open.
4. Honor `--dry-run`. Print the plan and stop. Do not call `gws` with `--apply`, do not write a Figma file, and do not change `metadata.json`.
5. Confirm immediately before a real write. If `canonical` already has a URL, ask whether to replace that shared copy or create a new one.

### Target: google

Google receives the words. Local images stay in `assets/` and are named on the matching slide. The Google deck uses Arial. The local viewer keeps the template's Red Hat layout. Say that before applying.

`--dry-run` is the default check:

```bash
node "${CLAUDE_SKILL_DIR}/scripts/publish-google.mjs" <deck-dir> --dry-run
```

After confirmation, send it:

```bash
node "${CLAUDE_SKILL_DIR}/scripts/publish-google.mjs" <deck-dir> --apply
```

To replace an existing presentation, pass `--presentation-id` with the id or the full `canonical.url`. The script accepts either. Say that this replaces the slides in that file. A new presentation omits the flag.

If `gws` reports an auth error, ask the user to run `gws auth login` for Google Slides. Do not invent credentials. Do not upload images to a public Drive link.

### Target: figma

Follow [Figma publish](references/figma-publish.md). Build the plan first. It does not write a Figma file:

```bash
node "${CLAUDE_SKILL_DIR}/scripts/publish-figma.mjs" <deck-dir> --out <plan.json>
```

Load the instructions for creating a new Figma file before creating a Slides file. Load the Figma slides instructions before any Slides write. Create one Slides file, or edit the existing `canonical` file in place when the user chose to update it. Build the slides from the plan, which comes from the numbered folders. Do not delete existing slides to rebuild a file unless the user asked to start over. Do not also create a Google deck in the same run.

Place each `imagePath` from the plan on its split or beat slide by uploading that local file into the Slides file. Keep speaker notes as speaker notes. Write the plan outside the deck directory.

## After the URL exists

Record the shared copy, then rebuild the viewer so the banner matches:

```bash
node "${CLAUDE_SKILL_DIR}/scripts/mark-published.mjs" <deck-dir> \
  --target google-slides|figma-slides \
  --url <https-url>
node "${CLAUDE_SKILL_DIR}/../uxd-slides-export/scripts/export-slides.mjs" <deck-dir>
```

`mark-published` sets `status` to `published` and writes `canonical.target`, `canonical.url`, and `canonical.publishedAt`. It rejects a URL that does not match the target.

## Completion check

- `--dry-run` did not create a remote deck and did not change metadata.
- The Figma plan did not create a remote file. The Slides file was created or updated only after confirmation.
- A real publish returned an `https://docs.google.com/presentation/` or `https://www.figma.com/slides/` URL.
- `metadata.json` in the deck directory says `published` and `canonical` matches that URL.
- The viewer banner names that shared copy.
- The local `slides/` folders still exist and were not described as deleted or deprecated.
- Images that did not transfer to Google were named in the result.
- The final response identifies the target and the URL.
