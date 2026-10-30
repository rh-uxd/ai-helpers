# Design choices

Load for Step 7 when `--decisions=auto|human`. With `skip`, build with defaults, record assumptions in metadata, and create no decision kit.

## Choose what needs a decision

Read the source and workspace conventions before framing choices. Surface a question only if the answer changes the experience and at least two viable options satisfy known requirements. Explain the competing benefits in the user's task: “Keep the resource list visible while editing, or give a long form its own page?”

Apply established accessibility, validation, navigation, and design-system practices as defaults. Do not ask whether to hide errors, remove keyboard access, use misleading labels, or break the product's patterns. Avoid cosmetic questions already settled by the codebase. A straightforward form may need no decisions; a larger workflow may need several. Neither decision count nor option count is a quota. Usually two or three alternatives suffice; include more only for a real tradeoff.

`--depth under|normal|over` remains compatible as exploration effort, never a minimum number of questions. Use [decision-points.yaml](decision-points.yaml) for ideas only.

Group independent decisions in one review. When one answer changes the viable options for another, resolve that dependency first, then prepare the affected batch. Never present contradictory choices as independent.

## Data first, one reusable report

Write `artifacts/{ID}/decisions/decisions.json` as the authoritative record. Use Python 3 (standard library only) and the bundled renderer instead of hand-building page chrome:

```bash
python3 "${CLAUDE_SKILL_DIR}/scripts/decision_kit.py" render "artifacts/{ID}/decisions/decisions.json"
```

The renderer reuses [decision-page-template.html](decision-page-template.html) and creates only `index.html`: one report containing every decision, preview, and choice control. Do not create individual comparison pages, a top navigation strip, or cross-page links. No package install, server, JSON fetch, or browser storage is required. Legacy `htmlFile` fields are ignored by the renderer; new records may point to `index.html#<decision-id>` if a downstream artifact needs a link.

Render once before review. Persist incoming answers to JSON without rebuilding HTML. After all independent answers are accepted, render once more to refresh the selected options and write the strategy brief. Only revise a comparison early if new information invalidates its options; retain unaffected answers and explain what changed.

### Record format

Preserve existing fields consumed by evaluate/publish; additional fields supply page content:

```json
{
  "projectName": "PROJ-298 — Resource settings",
  "projectDescription": "Choose how people edit resource settings.",
  "createdAt": "2026-10-15T14:00:00Z",
  "workspace": "standalone",
  "rfeKey": "PROJ-298",
  "decisions": [
    {
      "id": "edit-context",
      "title": "Where should editing happen?",
      "context": "People often compare a setting with other resources before saving.",
      "status": "pending",
      "chosenOption": null,
      "chosenTitle": null,
      "reasoning": "",
      "options": ["A", "B"],
      "recommended": "A",
      "recommendationReason": "Keeps the resource list available during short edits.",
      "htmlFile": "index.html#edit-context",
      "decidedAt": null,
      "summary": "",
      "optionDetails": [
        {
          "id": "A",
          "title": "Side panel",
          "description": "Edit beside the resource list.",
          "previewHtml": "<div class=\"pf-v6-c-drawer\">...generated resource UI...</div>",
          "pros": ["Keeps comparison context"],
          "cons": ["Less room for long forms"],
          "whenToUse": "Short edits alongside a list."
        },
        {
          "id": "B",
          "title": "Dedicated page",
          "description": "Edit on a full page, then return to the list.",
          "previewHtml": "<form class=\"pf-v6-c-form\">...generated resource UI...</form>",
          "pros": ["More room for complex fields"],
          "cons": ["Requires navigation back to compare"],
          "whenToUse": "Longer, focused editing tasks."
        }
      ],
      "comparison": [
        {"dimension": "List context", "values": {"A": "Visible", "B": "Return to list"}},
        {"dimension": "Form space", "values": {"A": "Limited width", "B": "Full page"}}
      ]
    }
  ]
}
```

For older decision kits, keep accepted choices and add `context`, `optionDetails`, `comparison`, and `recommendationReason` before using the renderer; do not re-ask resolved questions. Applying responses still accepts the legacy record fields.

Replace abbreviated preview content with real rendered UI. `previewHtml` is assistant-authored markup, never raw ticket text, fetched HTML, or user input. Escape source content before interpolating into it; keep previews inert (no scripts, event handlers, or external embeds). The renderer removes `script`, `iframe`, `object`, and `embed` tags, event-handler attributes, and `javascript:` URLs.

Status values remain `pending`, `auto-resolved`, `user-decided`. `recommended` is the AI's suggestion, not user approval. Use **AI suggestion** in all visible labels and give a short, evidence-based rationale. Keep recorded choices separate from suggestions; checked radio controls show the recorded options. `chosenOption: custom` is supported with the user's description in `chosenTitle`, `summary`, and `reasoning`; discuss feasibility and requirements before accepting it.

With no genuine tradeoffs, write an empty `decisions` array, set `decisions_count: 0`, explain that established patterns cover the feature, and continue. Do not generate empty review pages or wait for an empty submission.

## Present and collect

Open `index.html` using the available browser/file-opening capability and give a clickable absolute path (or local URL if served). Keep chat brief:

```text
Review the options on [Review design choices](<absolute-path-to-index>), select your choices, then click **Copy response** and send it back to me. You can also describe another approach.
```

The page has keyboard-accessible radio controls, an **AI suggestion** badge and rationale directly in the suggested card, a progress count, a plain-language response preview, and one **Copy response** button. The closing section says “Send your choices back to the agent” and “Copy your response and paste it into your conversation.” Do not add a bulk suggestion button, show JSON to the user, or explain acceptance states and reload behavior in the page copy. If clipboard access is unavailable, highlight the response for manual copying and give a brief instruction.

The copied response uses the prototype reference, question titles, and selected option names, for example:

```text
My design choices for PROJ-298:

1. Where should editing happen?
   Option A — Side panel
```

The agent maps this readable response to the matching prototype and decision IDs, then normalizes it to the internal JSON shape `{"prototypeId":"PROJ-298","choices":{"edit-context":"A"}}`. JSON remains an internal storage and helper format. Check the question and option names against the current kit; if they disagree or the answer is ambiguous, clarify rather than guessing. Existing JSON submissions remain supported.

Partial responses are allowed. Record them and ask only about remaining choices. Validate prototype ID, decision IDs, and option membership; do not turn missing answers into acceptance. For a custom chat answer, normalize it to `{"option":"custom","title":"...","reasoning":"..."}` after resolving any consequential uncertainty.

The assistant saves the pasted or normalized response to a temporary JSON file and applies it:

```bash
python3 "${CLAUDE_SKILL_DIR}/scripts/decision_kit.py" apply "artifacts/{ID}/decisions/decisions.json" --response /path/to/response.json
```

The helper validates the whole response before updating JSON atomically, preserves unanswered records, and does not regenerate pages. Acknowledge recorded choices in a sentence; do not repeat the complete options, links, and instructions after each answer. Show a compact recap after the batch is complete.

### Review AI suggestions (`auto`)

Set each `chosenOption` to `recommended`, populate its title, reasoning, summary and timestamp, and mark `auto-resolved`. Render once and present a short batch summary of **AI suggestions**, each with rationale. Users can accept the batch in chat or override individual choices on the index. Wait for the requested review before building; do not label these as human choices. Overrides become `user-decided`; retain `auto-resolved` on accepted AI picks.

### Choose together (`human`)

Initialize all choices as pending. Show the index once; users can answer independent choices together. Offer one-at-a-time conversation when preferred. After each response, update JSON only; preserve prior answers. Never interpret silence as a selection.

## Visual quality

Use PatternFly 6 for page chrome. Each option shows real UI, with the same task and content across alternatives, plus concise pros, cons, and when it fits. Match workspace components where possible; otherwise use PatternFly mockups showing the same tradeoff. No ASCII, empty gray boxes, or implausible filler alternatives. See [decision-page-example.md](decision-page-example.md).

Comparison tables include only dimensions that distinguish viable alternatives; there is no row quota. Use PatternFly card header/body/footer markup, complete label content markup, consistent token-based spacing, and scoped report styles that do not restyle the option previews. Validate the single report and its previews once before presenting; repeated selections alone do not call for rebuilds or browser checks.

## Strategy brief

After the batch is resolved, write `strategy-brief.md` with a compact table of decision, choice, status, and rationale, followed by a short explanation of how the choices combine into the intended experience. Keep `decision_mode: skip|auto|human` in metadata/summary for downstream compatibility; legacy `decide` / `interactive` normalize to `human`.
