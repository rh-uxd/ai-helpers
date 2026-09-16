---
name: uxd-patternfly-ux-decisions
version: 0.1.0
description: >-
  Recommend a PatternFly UI direction by mapping user intent to the right host
  pattern, comparing implementation evidence to the PatternFly target, and
  scoring local drift. Use when choosing between drawers, modals, tabs, or
  inline sections, reviewing an existing UI against PatternFly, or drafting a
  first-pass ticket UI recommendation.
---

# PatternFly UX Decisions

Orchestrator skill. Do not jump straight to components. Inspect the current
implementation when evidence exists, walk the decision tree, then compare the
implementation to the PatternFly target.

## Scope

This skill decides **what users should see** for UXD and PatternFly-adjacent
product work:

- UI direction for a ticket, brief, or design review
- PatternFly fit for a current implementation
- Whether repeated local divergence is strong enough to stage as a
  project-scoped preference
- What a first-pass screenshot mock should show

This skill does **not** decide file structure, naming conventions, runtime
architecture, or implementation workflow.

This workshop copy keeps the design engine self-contained:

- [references/decision-tree.md](references/decision-tree.md) chooses the
  PatternFly target
- [references/preferences.md](references/preferences.md) and
  [references/patternfly-preferences.json](references/patternfly-preferences.json)
  score drift and local overrides
- [references/examples.md](references/examples.md) shows recommendation shape
- [references/intent-profiles.json](references/intent-profiles.json) maps tree
  leaves to reusable intent profiles

Project conventions should begin as **project-scoped evidence**. Do not treat a
repeated local pattern as an org-wide default unless another project confirms
the same divergence.

| This skill answers | This skill does not answer |
|--------------------|----------------------------|
| Should this be tabs, an accordion, or one flat section? | Where should section files live? |
| Drawer vs modal vs inline vs page? | One drawer runtime architecture |
| Which PatternFly component serves the intent? | Production code structure |
| How far is the implementation from the PatternFly target? | CSS token usage or framework-specific naming |
| When is repeated local divergence worth staging? | Silent ticket writes or implementation commits |

## Quick start

1. Restate the job in one sentence: who, what, and risk level.
2. Determine evidence mode:
   - Full: repo plus running UI
   - Partial: repo only, or UI / screenshots only
   - None: no implementation evidence
3. Inspect the current implementation when evidence exists. Count only
   comparable surfaces with the same user goal, risk, and page context.
4. Walk [references/decision-tree.md](references/decision-tree.md) from top to
   bottom. Follow the routing and inline defaults.
5. Resolve the leaf with
   [references/intent-profiles.json](references/intent-profiles.json).
6. Classify **PatternFly fit** first, then record `drift_weight` from `1` to
   `5`.
7. Detect local overrides. Repeated divergence raises `override_weight` from
   `1` to `5`.
8. Check staged overrides in
   [references/preferences.md](references/preferences.md) and
   [references/patternfly-preferences.json](references/patternfly-preferences.json).
   Prefer exact project matches before cross-project entries. The tree still
   wins on the PatternFly target.
9. Search the target repo for reusable components, primitives, or surrounding
   UI shells. Prefer reuse over inventing a new kit.
10. If `@patternfly/patternfly-mcp` is available, use it for current PatternFly
    docs, component APIs, and a11y notes. If it is not available, continue with
    the decision tree plus public PatternFly guidance.
11. Deliver the short Recommendation block below. If the request is for UI
    direction, a mock, or a review of a runnable surface, still produce the
    local screenshot mock.

## Output format

Default to a **short user-facing report**. Do **not** dump the full field list
unless the user asks for detail.

Every recommendation must include:

```markdown
## Recommendation
- **PatternFly check:** … (`No divergence found` | short description of the divergence)
- **Why it matters:** … (only when there is divergence or meaningful uncertainty)
- **Recommended delta:** … (what should change, keep, or defer)
- **Next step:** … (`Mock -> ticket (first pass)` | `Stage or update override candidate` | `User starts implementation separately`)

## You can also ask about
- **Intent profile(s)**
- **Current implementation**
- **PatternFly target**
- **PatternFly fit**
- **drift_weight**
- **override_weight**
- **Evidence**
- **Local override status**
- **Override scope**
- **Pattern**
- **Ticket UI**
- **Components**
- **Build spec**
- **Rejected**
```

Use the detailed fields above as an internal checklist and as a follow-up menu,
not as the default response body.

When a screenshot mock is part of the task, keep the report short and deliver
the screenshot alongside it. Do not stop after the text summary.

When the deliverable is a ticket or design-note description, put **Ticket UI**
in the draft body. Keep **Components** and **Build spec** in chat unless the
handoff needs them in writing.

## PatternFly fit classification

Classify the relationship between the current implementation and the PatternFly
target before scoring drift.

- `aligned` — the current surface already matches the PF target closely
- `extension` — the PF host pattern is still correct, but the product adds
  domain-specific behavior PatternFly does not define
- `drift` — the current implementation is using the wrong host, interaction
  model, or surface for the job
- `unknown` — PF guidance is thin, or evidence is too limited to call the
  current implementation aligned or drifting

Use `extension` for net-new product behavior that lives cleanly inside the
correct PF shell. If a CTA is standing in for a richer workflow surface,
classify it as `drift` instead.

## Drift and override scoring

Keep the PatternFly target and the local override signal separate.

Start with `PatternFly fit`:

- `aligned` usually maps to `drift_weight` `1` or `2`
- `extension` can still be low drift if the PF shell is correct
- `drift` means the current implementation is diverging from the PF target
- `unknown` should stay conservative and produce an open design question rather
  than a strong correction

- `drift_weight`
  - `1` = close match, minor cleanup only
  - `2` = small pattern drift
  - `3` = moderate structural or interaction drift
  - `4` = major mismatch
  - `5` = wrong surface or interaction model, likely redesign candidate
- `override_weight`
  - `1` = one-off exception
  - `2` = weak signal or manual stage only
  - `3` = candidate local preference
  - `4` = strong local default
  - `5` = explicit site standard

Count only comparable examples. Use the same user goal, risk profile, and page
context.

- `1` comparable example -> exception only
- `2` comparable examples -> candidate local preference
- `3+` comparable examples -> strong local default candidate

If no implementation evidence exists, do **not** infer an override above `2`.
Fallback to the tree, PatternFly docs, and a short preference question when
needed.

High `override_weight` never erases the PatternFly target. It explains why a
team may choose a consistency-first recommendation while still showing the PF
target.

## Initial evaluation and staging

On the first relevant run, auto-run the evaluation when implementation evidence
exists.

- Full or partial evidence -> compare implementation to the PF target and draft
  a staged override candidate when repeated divergence appears
- If the result is `unknown`, keep the PF recommendation conservative and log
  the unresolved fit as an open question instead of calling it wrong
- Evidence from one product only -> stage it as `project`, even when the weight
  is high
- Do not promote to `org-candidate` until at least one other project shows the
  same divergence for a comparable scenario
- No evidence -> do not invent local conventions. Use the tree and ask a short
  setup question only if the recommendation would materially benefit from it
- Before writing any new staged entry or project-board update, ask the user to
  approve the draft and rationale

## Strategy source

This skill does **not** invent product strategy when a ticket, brief, or design
note already states it.

### Source of truth

1. Existing ticket, brief, or design note
2. User correction in chat
3. A short drafted problem statement only when the strategic framing is missing

### Do

- Treat the existing problem statement as the strategy
- Match UI recommendations to the stated problem and outcome
- Ask whether to draft a short Why / Problem Statement when the strategy is too
  thin for a confident recommendation

### Do not

- Reframe the product goal just because the PatternFly target is different
- Let the decision tree invent strategy text that should come from the product
  team
- Use pattern guidance alone to justify shipping work the ticket does not ask
  for

## Mock -> ticket (first pass)

Primary visual deliverable: a **screenshot on the real product surface**, saved
locally and shown back in chat. Do **not** replace this with a standalone HTML
prototype unless the user asks for an interactive prototype.

When the user wants a screenshot mock after a tree recommendation:

1. Use the real screen when the product surface exists.
2. Apply a minimal mock only long enough to capture the screenshot.
3. Capture a current shot first, then the result shot, so you can compare them.
4. Make the result frame match the same drawer, tab, page, or table named in
   **Ticket UI**.
5. Treat the first pass as directional, not final sign-off.
6. Show the result screenshot in chat.
7. Report the exact saved filename and full path if the screenshot is written to
   disk.
8. When inspiration comes from an external reference rather than the live
   product, mark it as **Sample** and note that the reference chrome is
   directional.
9. Search the target repo before recommending custom charts, cards, or other
   rich visuals. If nothing fits, record an open design question rather than
   inventing bespoke UI during intake.
10. Build an interactive prototype only when the user asks for one explicitly.

When a ticket already exists, draft board-friendly scoring details with the
recommendation:

- labels like `pf-drift-3` and `pf-override-4`
- a one-paragraph rationale for the weight
- the recommended delta to move closer to PF or intentionally keep the local
  override

## Where scored overrides are recorded

1. Recommendation output
2. Staging registry in
   [references/patternfly-preferences.json](references/patternfly-preferences.json)
3. Optional project-board draft using labels like `pf-drift-N` and
   `pf-override-N`

## Delegation rules

| Need | Action |
|------|--------|
| Component API, a11y, variants | Use `@patternfly/patternfly-mcp` if available; otherwise rely on the tree and public PF docs |
| Visual comparison of 2+ options | Summarize tradeoffs in the short PF check, then offer **Rejected** if the user wants alternatives |
| Initial eval of current UI vs PF target | Inspect repo, running UI, or screenshots first, then score `drift_weight` and `override_weight` |
| Existing ticket UI direction, mock, or comment | Use the ticket or brief as strategy source; this skill supplies Ticket UI and mock guidance |
| Thin strategy, need framing | Ask whether to draft a short problem statement before finalizing the UI recommendation |

## Where rules live

- **Always-on defaults and rules** -> [references/decision-tree.md](references/decision-tree.md)
- **Pending overrides (staging)** ->
  [references/patternfly-preferences.json](references/patternfly-preferences.json)
  via [references/preferences.md](references/preferences.md)
- **Do not** invent PF components -> prefer PatternFly docs when available

## Do not

- Skip the tree and name a component from habit
- Treat repeated local divergence as a silent PF rule change
- Contradict `decision-tree.md`; flag conflicts instead of guessing
- Write to registry files or issue trackers unless the user explicitly asks
