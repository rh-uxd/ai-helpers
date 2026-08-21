# Decision Workflow

Full procedure for Step 7 design decision generation. Load this when the prototype reaches the design decision phase and `--decisions` is `auto` or `human`. When `--decisions=skip`, do not run this workflow.

Copy the page skeleton from [decision-page-template.html](decision-page-template.html). Read [decision-page-example.md](decision-page-example.md) for preview quality rules by decision type.

---

## Quality bar (non-negotiable)

Decision pages must feel like decision-kit artifacts: rich, browsable HTML with **real rendered UI** in every option preview — not chat summaries with ASCII art.

| Rule | Requirement |
|------|-------------|
| Chrome | PatternFly 6 CDN for page chrome (`patternfly.min.css` + `patternfly-addons.min.css`). Do **not** invent a dark custom theme. |
| Options | Exactly 4 options (A–D) unless the user asks for more |
| Previews | Real HTML UI in each `.visual-preview` slot. **Ban ASCII art and empty gray-box wireframes** as the primary preview. |
| Preview source | Match the build target (see below) |
| Comparison | Mandatory comparison table (5–8 dimensions) rating all options |
| Cross-links | Every page links to all other decisions + `index.html` |
| Surface | Always print absolute `file://` URLs and open the index in the browser |

### Preview source by workspace

- **Standalone** — Compose option previews from PatternFly CDN components (same stack as the eventual prototype).
- **Workspace** — Prefer the target codebase’s real components, patterns, and class names when available. If that is impractical for a static HTML decision page, fall back to PatternFly CDN mockups that still represent the same choice (same layout/interaction/component tradeoff).

### Quality checklist (before presenting any page)

- [ ] Four options are visually distinct at a glance (not four accent-color variants of the same layout)
- [ ] Product-real copy in previews (domain nouns from the RFE — no lorem ipsum / “Item 1”)
- [ ] Comparison table present with 5–8 meaningful dimensions
- [ ] Recommended badge on the AI pick; Selected badge only after a choice is locked
- [ ] Nav links to every decision page + `index.html` work
- [ ] Page loads PatternFly CDN and uses PF layout/card/table classes for chrome

---

## Decision Page Generation

Generate one self-contained HTML file per decision under `.artifacts/{ID}/decisions/`, named `01-{slug}.html`, `02-{slug}.html`, etc.

**Start from** [decision-page-template.html](decision-page-template.html). Fill in content; do not redesign the chrome.

### Required page sections

1. **Header** — decision number, title, short context (why this decision matters for these user stories)
2. **Cross-decision nav** — PatternFly tabs or nav strip linking every decision page + `index.html`; highlight the current page (required for **both** `auto` and `human`)
3. **Options grid (2×2)** — one card per option; each card includes:
   - Letter label (A / B / C / D)
   - Name and one-sentence description
   - `.visual-preview` with **rendered** UI (see preview source rules)
   - Pros and cons (2–3 each)
   - “When to use” guidance
   - “Recommended” badge on the AI suggestion
   - “Selected” badge on the chosen option (after decision)
4. **Comparison table** — rows = dimensions that matter for this decision; columns = A–D
5. **Recommendation** — which option and why (plain English, grounded in RFE / codebase)
6. **Footer** — “Respond with: Option A / B / C / D (or describe your own)”

### Preview type by decision category

| Category | Preview must show |
|----------|-------------------|
| Layout / IA | Mini app frame: masthead/nav + content region illustrating the structure |
| Interaction | Vertical flow or in-context UI showing how the action unfolds (drawer vs modal vs page) |
| Density / tone | Same content rendered at different densities or visual emphasis using real components |
| Key components | Actual components (PF or target-app) composing the critical UI element — not labeled boxes |

---

## Index page

Always write `.artifacts/{ID}/decisions/index.html` whenever decision pages exist.

- List every decision with title, status badge (`pending` / `auto-resolved` / `user-decided`), chosen option (if any), and link to its HTML file
- Link back from every decision page’s nav to this index
- Style with the same PatternFly CDN chrome as decision pages

---

## Surface to the user (browser)

After generating (or regenerating) decision pages and `index.html`:

1. Resolve the **absolute** path to the decisions directory.
2. Print clickable `file://` URLs in chat — at minimum the index, plus the first or current decision page:

```
Decision pages (open in your browser):
  Index:    file:///absolute/path/.artifacts/{ID}/decisions/index.html
  Current:  file:///absolute/path/.artifacts/{ID}/decisions/01-layout-pattern.html
```

3. Open the index in the default browser:
   - macOS: `open ".artifacts/{ID}/decisions/index.html"`
   - Linux: `xdg-open ".artifacts/{ID}/decisions/index.html"`
   - Windows: `start "" ".artifacts/{ID}/decisions/index.html"`

Do **not** only mention a relative `.artifacts/...` path. Users must get a URL they can click or a file that opens in the browser.

---

## Decision Storage Format

Initialize `.artifacts/{ID}/decisions/decisions.json`:

```json
{
  "projectName": "{ID} — {Title}",
  "projectDescription": "Prototype decisions for {Title}",
  "createdAt": "2025-01-15T10:30:00Z",
  "workspace": "/path/to/workspace",
  "rfeKey": "{ID}",
  "decisions": []
}
```

Each decision record:

```json
{
  "id": "layout-pattern",
  "title": "Layout Pattern",
  "status": "auto-resolved",
  "chosenOption": "B",
  "chosenTitle": "List + Detail",
  "reasoning": "The RFE describes browsing and inspecting items, which maps to a list+detail pattern.",
  "options": ["A", "B", "C", "D"],
  "recommended": "B",
  "htmlFile": "01-layout-pattern.html",
  "decidedAt": "2025-01-15T10:30:00Z",
  "summary": "Master list on left, detail panel on right for item inspection"
}
```

Status values: `"auto-resolved"`, `"user-decided"`, `"pending"`.

Preserve these field names — downstream skills (`uxd-prototype-evaluate`, `uxd-prototype-publish`) read them.

**Vocabulary:** Chat / CLI `--decisions=skip|auto|human` maps 1:1 to `decision_mode` in `prototype-summary.yaml` and `metadata.json`. Legacy values `decide` / `interactive` mean `human`.

---

## Skip — No Decision Kit

When `--decisions=skip`:

1. Do **not** create `.artifacts/{ID}/decisions/` pages, `decisions.json`, or `strategy-brief.md`
2. Make design calls inline during prototype generation
3. Record `decision_mode: skip` and omit `decision_depth` / `decisions_count`

---

## Auto — Batch Review

After auto-resolving all decisions:

1. Generate all HTML decision pages with the chosen option highlighted (Selected badge)
2. Write / update `index.html`
3. Surface `file://` URLs and open the index in the browser
4. Present a batch summary table in chat:

```
Auto-Resolved Design Decisions:

  #  Decision              Chosen            Reasoning
  ─  ────────              ──────            ─────────
  1  Layout Pattern        List + Detail     Browse/inspect pattern matches RFE
  2  Interaction Model     Drawer Panels     Context preserved during inspection
  3  Information Density   Progressive       Mixed audience (admin + end user)
  4  Visual Tone           Utilitarian       Enterprise platform consistency
  5  Key Components        Table + Drawer    Standard PF6 pattern for this layout

Want to override any of these? (Enter numbers to change, or "ok" to proceed)
```

5. If the user overrides any: update `decisions.json`, regenerate the corresponding HTML page and index
6. Once confirmed, ensure all decisions are in final status (`auto-resolved` or `user-decided`)

---

## Human — Interactive Walk-Through

1. Generate ALL decision pages + `index.html` upfront (before asking any questions)
2. Surface `file://` URLs and open the index (or the first decision page) in the browser
3. Present decisions sequentially in chat:

```
Decision 1/5: Layout Pattern

  What overall page structure best serves these user stories?

  Open the visual comparison:
  file:///absolute/path/.artifacts/{ID}/decisions/01-layout-pattern.html

  All decisions: file:///absolute/path/.artifacts/{ID}/decisions/index.html

  My recommendation: List + Detail (Option B)
  — The RFE describes browsing and inspecting items.

  Which option do you prefer? (A/B/C/D, "recommended", or describe your own)
```

4. Wait for the user's choice before proceeding to the next decision
5. After each choice: update `decisions.json`, regenerate that page (Selected badge) and `index.html`
6. If the user provides a custom answer, generate a card for it and record with `chosenOption: "custom"`
7. After all decisions, generate the strategy brief

---

## Strategy Brief

Write `.artifacts/{ID}/decisions/strategy-brief.md`:

```markdown
# Design Strategy — {ID}

## Decisions Made

| # | Decision | Choice | Mode |
|---|----------|--------|------|
| 1 | Layout Pattern | List + Detail | auto-resolved |
| 2 | Interaction Model | Drawer Panels | auto-resolved |

### 1. Layout Pattern → List + Detail
[Reasoning and context]

### 2. Interaction Model → Drawer Panels
[Reasoning and context]

## Design Direction
[1-2 paragraph synthesis of how decisions combine into a coherent approach]
```

---

## Cross-decision navigation

Include on **every** decision page (`auto` and `human`). Prefer PatternFly tab markup from the template; keep relative `href`s so pages work when opened via `file://`:

```html
<nav class="pf-v6-c-tabs pf-m-box" aria-label="Design decisions">
  <ul class="pf-v6-c-tabs__list">
    <li class="pf-v6-c-tabs__item">
      <a href="index.html" class="pf-v6-c-tabs__link">All</a>
    </li>
    <li class="pf-v6-c-tabs__item pf-m-current">
      <a href="01-layout-pattern.html" class="pf-v6-c-tabs__link" aria-current="page">1. Layout</a>
    </li>
    <li class="pf-v6-c-tabs__item">
      <a href="02-interaction-model.html" class="pf-v6-c-tabs__link">2. Interaction</a>
    </li>
  </ul>
</nav>
```

Highlight the current page. Use short labels (decision title, truncated if needed).
