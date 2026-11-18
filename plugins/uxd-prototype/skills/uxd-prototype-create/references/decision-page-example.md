# Decision page — what good looks like

Use `scripts/decision_kit.py render` with [decision-page-template.html](decision-page-template.html). Put option content in `decisions.json`; reuse the renderer and page chrome.

Full procedure: [decision-workflow.md](decision-workflow.md).

---

## Chrome vs preview

| Layer | What to use |
|-------|-------------|
| **Page chrome** (header, cards, table, badges, footer) | PatternFly 6 CDN classes from the template |
| **Option previews** (inside `.visual-preview`) | Real UI matching the **build target** |

### Preview source

- **Standalone prototype** → PatternFly CDN components inside each preview (masthead, table, drawer, wizard, etc.).
- **Workspace / existing codebase** → Prefer that project’s components and patterns. If you cannot embed them in a static HTML decision page, fall back to PF CDN mockups that still show the **same tradeoff** (e.g. drawer vs modal vs full page).

**Never** ship ASCII diagrams or empty gray rectangles as the primary preview.

---

## Preview recipes by decision type

### Layout / IA

Show a mini app frame (~full width of the card, scaled via `.preview-frame`):

- Masthead or page title
- Nav or list region vs detail region
- Enough product-domain rows/labels that the structure reads at a glance

Compare alternatives serving the same task, such as a side panel versus a dedicated page for editing an API key. Do not compare an unrelated dashboard or creation wizard merely to add options.

### Interaction

Show the **same primary action** resolved through the viable alternatives — e.g. “Edit API key” as:

- Inline edit on the row
- Modal dialog
- Side drawer
- Full page form

Use real controls (buttons, form fields, drawer panel chrome), not numbered stick figures.

### Density / visual tone

Reuse one content set; change spacing, columns, and chrome density so the difference is visible without reading the pros/cons.

### Key components

Compose the critical UI from actual components (PF `Table` + `Drawer`, or the target app’s equivalents). Label the option by the component choice, and make that choice obvious in the preview.

---

## Comparison table

Include only dimensions that distinguish alternatives for **this** decision; there is no row quota. Prefer dimensions a designer can disagree with: browse speed, context preservation, mobile collapse, alignment with existing app nav, implementation cost in this codebase, etc.

---

## One report and a simple handoff

- Generate only `index.html`, with all decisions in one report. Omit navigation links and separate decision pages.
- Use PatternFly card header/body/footer and label content markup. Keep the **AI suggestion** badge beside the option title and its short rationale inside that card.
- Keep report CSS scoped so card, table, and typography adjustments do not change the rendered option previews. Use consistent spacing tokens and stack options on narrow screens.
- The final section has one **Copy response** button and a readable preview of question titles and selected option names. Keep JSON internal and omit the bulk suggestion action and technical acceptance/reload explanations.
- Open the report and provide one clickable absolute file path or served URL. The instruction is simply to copy the response and send it back to the agent.

---

## Anti-patterns (reject before showing the user)

- Option cards that are prose-only with no `.visual-preview` content
- Filler alternatives, including options that break established UX or accessibility practices
- Options that differ only by accent color
- An unexplained “Recommended” badge instead of “AI suggestion” with rationale
- Rebuilding every comparison after each independent answer
- “Item 1 / Item 2” or lorem placeholder copy
- Custom dark CSS theme replacing PatternFly page chrome
- A relative path with no usable link or browser entry point
