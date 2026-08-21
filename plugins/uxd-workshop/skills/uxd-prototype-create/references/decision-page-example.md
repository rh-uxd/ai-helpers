# Decision page — what good looks like

Use [decision-page-template.html](decision-page-template.html) as the skeleton for every decision page. Fill the slots; do not invent a new page aesthetic.

Full procedure: [decision-workflow.md](decision-workflow.md).

---

## Chrome vs preview

| Layer | What to use |
|-------|-------------|
| **Page chrome** (header, nav, cards, table, badges, footer) | PatternFly 6 CDN classes from the template |
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

Example distinction: card grid of “API keys” vs split list+detail of the same keys vs dashboard widgets vs a create wizard.

### Interaction

Show the **same primary action** resolved three/four different ways — e.g. “Edit API key” as:

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

Always include 5–8 dimensions that matter for **this** decision (not generic filler). Prefer dimensions a designer can disagree with: browse speed, context preservation, mobile collapse, alignment with existing app nav, implementation cost in this codebase, etc.

---

## Cross-links and browser entry

- Every page’s tab nav links to **all** decision HTML files plus `index.html`.
- After generation, print absolute `file://` URLs and `open` / `xdg-open` the index (see decision-workflow.md).
- Relative `href`s only — pages must work when opened from disk.

---

## Anti-patterns (reject before showing the user)

- Option cards that are prose-only with no `.visual-preview` content
- Four options that differ only by accent color
- “Item 1 / Item 2” or lorem placeholder copy
- Custom dark CSS theme replacing PatternFly page chrome
- Relative path mentioned in chat with no `file://` URL and no browser open
