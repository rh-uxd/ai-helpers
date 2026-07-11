# Decision Workflow

Full procedure for Step 8 design decision generation. Load this when the prototype reaches the design decision phase.

## Decision Page Generation

Generate a self-contained HTML page for each decision. Each page should include:

Each option card should include:
- Option letter label (A, B, C, D) with distinct colors
- Name and description
- Visual preview area (ASCII or simple HTML mockup showing the layout concept)
- Pros and cons list (2-3 each)
- "When to use" guidance
- "Recommended" badge on the AI's suggested option
- "Selected" badge on the chosen option (after decision)

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

## Auto Mode — Batch Review

After auto-resolving all decisions:

1. Generate all HTML decision pages with the chosen option highlighted
2. Present a batch summary table:

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

3. If the user overrides any: update `decisions.json`, regenerate the corresponding HTML page
4. Once confirmed, transition all decisions to final status

## Decide Mode — Interactive Walk-Through

1. Generate ALL decision pages upfront (before asking any questions)
2. Present decisions sequentially:

```
Decision 1/5: Layout Pattern

  What overall page structure best serves these user stories?

  Open the visual comparison:
  .artifacts/{ID}/decisions/01-layout-pattern.html

  My recommendation: List + Detail (Option B)
  — The RFE describes browsing and inspecting items.

  Which option do you prefer? (A/B/C/D, "recommended", or describe your own)
```

3. Wait for the user's choice before proceeding to the next decision
4. If the user provides a custom answer, generate a card for it and record with `chosenOption: "custom"`
5. After all decisions, generate the strategy brief

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

## Navigation Tabs (Decide Mode)

When generating decision pages for decide mode, add a navigation tab bar at the top of each page linking to all other decision pages:

```html
<nav style="display:flex; gap:2px; margin-bottom:2rem; border-bottom:2px solid #2a2a3a; padding-bottom:0;">
  <a href="01-layout-pattern.html" style="padding:0.5rem 1rem; text-decoration:none; color:#e07c3e; border-bottom:3px solid #e07c3e; font-weight:600;">1. Layout</a>
  <a href="02-interaction-model.html" style="padding:0.5rem 1rem; text-decoration:none; color:#8888a0;">2. Interaction</a>
  <a href="03-density.html" style="padding:0.5rem 1rem; text-decoration:none; color:#8888a0;">3. Density</a>
</nav>
```

Highlight the current page's tab. Use short labels (decision title, truncated if needed).
