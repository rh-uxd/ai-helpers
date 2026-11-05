# User journey

People expect a scenario, then story beats: what happens on the left, and who it serves, which need it meets, and what we deliver on the right. Keep this order unless the user wants a different one.

## How to fill it

- **Title** names the journey. The subheading is the story in one line.
- **Scenario** names the people and the constraint that starts the story. One content slide.
- **Part** is a section slide. Use one each time the journey changes chapter. Copy `templates/slides/section/` into the next numbered folder.
- **Beat** is one moment. `kicker` in that slide's `metadata.json` is the part label drawn in red. The heading names the beat for the slide list and is not drawn. The paragraphs are the story. Bold the words the room should hear. Set `image` to `assets/file.png` when a concept sketch exists. The frame stays even when the sketch is missing.
- **Users this serves** lists people as `**Name** — Role`. Only people the story actually includes.
- **Unmet needs this addresses** and **Solutions we deliver** are the other two headings. Keep those three labels. A bullet indented by two spaces belongs under the bullet above it.
- Link a bullet when the source has a research note, ticket, or doc: `[label](https://...)`. Leave the link off when you would have to invent the URL.
- Label assumptions. Replace every "Replace with" placeholder.
