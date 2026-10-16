# Slide and deck templates

A **slide template** is one slide: `content.md`, `speaker-notes.md`, and `metadata.json`. A **deck template** is a starter sequence of those slides, plus theme rules that are copied into the deck.

Create a deck by copying a deck template. That writes `.artifacts/slides-{name}/` with `metadata.json` (`specVersion` `0.1.0`), `slides/1`, `slides/2`, … and `assets/default.css`. The spec is `specifications/slides/`.

```bash
node "${CLAUDE_SKILL_DIR}/scripts/instantiate-deck.mjs" briefing .artifacts/slides-name
```

Add a later slide by copying `templates/slides/{template}/` to the next numbered folder.

## Decks

| Request | Folder |
|---|---|
| Briefing, stakeholder update, or a general talk | `decks/briefing` |
| Research readout or findings share-out | `decks/research-readout` |
| Design review or critique readout | `decks/design-review` |
| User journey or story-beat walkthrough | `decks/user-journey` |
| Vision brief or connected-experience narrative | `decks/vision` |

Read that folder's `context.md` before filling the slides. A deck that is none of these still starts from `briefing`.

## Slides

| Layout | Folder |
|---|---|
| Opening cover | `slides/title` |
| Section divider | `slides/section` |
| Heading plus short copy or bullets | `slides/content` |
| Copy beside one local image | `slides/split` |
| Quotation | `slides/quote` |
| Journey beat | `slides/beat` |
| Closing cover | `slides/closing` |
| Cover with a numbered side rail | `slides/agenda` |
| Person, goal, count, and team lanes | `slides/persona` |
| Four stages, current or proposed | `slides/stages` |
| Callout beside a console frame | `slides/scene` |
| Today and proposed columns | `slides/compare` |

Layout CSS for every slide template lives in `theme/default.css` and is snapshotted into the deck as `assets/default.css`. A deck template's `theme.css` is appended to that snapshot. It is not a separate file in the deck.
