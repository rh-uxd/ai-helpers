---
name: uxd-research-heuristic-eval
slug: uxd-research-heuristic-eval
type: crossover
phase: evaluative
status: experimental
description: "Conduct a heuristic evaluation of a prototype or interface using three independent expert evaluators. Use when running a usability audit, evaluating a UI against Nielsen's heuristics or other frameworks, or preparing for user testing."
---

# Heuristic Evaluation — Multi-Evaluator Usability Inspection

You are conducting a structured heuristic evaluation using three
independent expert evaluators. Each evaluator inspects the interface
separately against a shared set of usability heuristics, then the
evaluators convene to reconcile their findings into a consolidated
report.

The goal is to **surface usability violations** — observable mismatches
between the interface and established heuristic principles. You do not
interpret impact, assign severity ratings, or recommend fixes. Those
are researcher activities that happen after the evaluation.

## Purpose

Surface usability violations in an interface through structured
multi-evaluator heuristic inspection against established frameworks.

---

## Inputs

| Input | Type | Required | Default |
|---|---|---|---|
| Interface to evaluate | Screenshots, image files, text descriptions, or URLs (URLs inspected via Playwright MCP when available) | yes | — |
| Framework | Heuristic framework(s) to use (e.g., `nielsen`, `shneiderman`) | yes | ask researcher |
| Custom heuristics | User-defined heuristics (overrides framework) | no | — |
| Specialist areas | Additional specialist evaluators (e.g., `accessibility`) | no | — |
| Project slug | Project directory for saving output | no | current working directory |

---

## Outputs

| Output | Format | Location |
|---|---|---|
| Evaluation report | `.md` and `.html` | `[project-dir]/heuristic-eval-[date].[ext]` |

---

## Arguments

$ARGUMENTS

Parse as: `<interface-input> [--framework <name>] [--heuristics <custom>] [--specialists <areas>] [--project <slug>]`

- `interface-input` — Screenshots, image files, text descriptions of
  screens, or URLs. For Figma prototypes, the user should provide
  exported screenshots (Figma links cannot be inspected directly).
- `--framework <name>[,<name>]` — Which heuristic framework(s) to use
  (see [references/heuristic-frameworks.md](references/heuristic-frameworks.md)).
  Accepts a single framework or a comma-separated list
  (e.g., `--framework nielsen,shneiderman`). If not specified, **ask and
  wait** — do not assume Nielsen or any other default.
- `--heuristics <custom>` — User-defined heuristics (overrides framework).
- `--specialists <areas>` — Add specialist evaluators beyond the core
  three (e.g., `accessibility,information-architecture`).
- `--project <slug>` — Project directory for saving output. If not
  specified, save to current working directory.

## Step 0: Gather Input

### Interface to evaluate

Confirm what you're evaluating. The user may provide:

- **Screenshots or images** — Read each image file. These are your
  primary inspection material.
- **Text descriptions** — Screen-by-screen descriptions of the interface
  layout, elements, and interactions.
- **URLs** — Use the Playwright MCP browser tools to inspect the live
  interface (see "Browser inspection" below). If Playwright MCP is not
  available, fall back to WebFetch for static content and ask the user
  for screenshots of client-side rendered apps.
- **Figma exports** — Exported PNG/JPG files from Figma. Note to the
  user: "I can't access Figma directly, but exported screenshots work
  well. Export each key screen or flow step as an image."

If the input is ambiguous or incomplete, ask:
- Which screens or flows should be evaluated?
- Is this a complete flow or isolated screens?
- What is the user trying to accomplish in this interface?

### Review subject record

Before evaluation passes, capture a **review subject record** and
carry it through every output (chat, spreadsheet, markdown, HTML):

```
Review subject: [short title — page name, flow name, or project]
Source URL: [full URL, or "N/A"]
Source files: [file paths, or "N/A"]
Input type: [URL | screenshots | text description | mixed]
Task context: [what the user is trying to accomplish, if provided]
Evaluation date: [YYYY-MM-DD]
```

- If the researcher provides a **URL**, copy the full URL exactly
  into `Source URL`. Do not omit it from later outputs.
- If input is **screenshots or files**, list every file path in
  `Source files`.
- If both URL and files are used (e.g., URL fetch plus saved
  screenshots), include both.

### Browser inspection (when input is a URL)

When the user provides a URL and Playwright MCP tools are available,
conduct a live browser inspection before the evaluation passes:

1. **Navigate to the URL** using Playwright. Wait for full load.
2. **Capture baseline screenshots** at desktop viewport (1440x900):
   full-page and above-the-fold. Navigate to each specified screen.
3. **Read the accessibility tree** for roles, names, states, hierarchy.
4. **Inspect interactive elements** — click/hover expandable sections,
   popovers, drawers, menus, toggles, modals. Capture each state.
5. **Save screenshots** as `heuristic-eval-[date]-screenshot-[N]-[description].png`
6. **Build an inspection summary** listing screenshots, accessibility
   tree observations, and interactive states.

**If Playwright MCP is not available:** Fall back to WebFetch for static
content. Note in Coverage Notes that the evaluation was conducted
without visual inspection.

### Heuristic framework(s)

**Hard stop.** If the user has not specified `--framework` (or custom
`--heuristics`), you must ask which framework to use and **wait for an
answer before any evaluation passes**. Do not start Evaluator A/B/C,
do not invent a framework choice, and do not silently default to
Nielsen's 10.

Prefer `AskUserQuestion` when that tool is available. Present the
options below (multi-select allowed). If the tool is unavailable, ask
the same question in chat and stop until the researcher replies.

> **Which heuristic framework(s) should the evaluators use?**
> You can select more than one (e.g., "1 and 2").
>
> 1. **Nielsen's 10 Usability Heuristics** — visibility, feedback,
>    consistency, error prevention, recognition, flexibility, aesthetics,
>    error recovery, help/documentation, user control.
> 2. **Shneiderman's 8 Golden Rules** — consistency, shortcuts,
>    feedback, dialog closure, error handling, easy reversal, user
>    control, reduced memory load.
> 3. **ISO 9241-110 Interaction Principles** — task suitability,
>    self-descriptiveness, conformity, learnability, controllability,
>    error tolerance, user engagement.
> 4. **Gerhardt-Powals' Cognitive Engineering Principles** — cognitive
>    load focused: automate workload, reduce uncertainty, fuse data,
>    meaningful aids, related names, consistent grouping, limit
>    data-driven tasks, judicious redundancy.
> 5. **Custom** — Provide your own heuristics.
> 6. **Not sure** — I'll default to Nielsen's 10.

**Decline / cancel / no answer ≠ "Not sure".** If `AskUserQuestion` is
declined, cancelled, or unanswered, stop and re-ask (or ask in chat).
Only default to Nielsen's 10 when the researcher explicitly selects
option 6 ("Not sure").

Load full heuristic definitions from
[references/heuristic-frameworks.md](references/heuristic-frameworks.md).

### When multiple frameworks are selected

Evaluators inspect against the combined set. Each violation maps to
every applicable heuristic across all frameworks. Group findings by
the first-listed framework. Cross-reference secondary framework
heuristics within each violation. Report "no violations" per framework.

## Step 1: Independent Evaluation — Three Passes

Conduct three separate evaluation passes. Each evaluator is a
generalist usability expert who inspects the interface independently.

### How to simulate independence

The three passes must produce genuinely different observations:

**Evaluator A** — Screen by screen, element by element. Focus on
labels, layout, visual hierarchy, affordances, feedback indicators.
Work top-left to bottom-right. Assess visual prominence, spacing,
color, contrast, icon discoverability from screenshots.

**Evaluator B** — Task flow perspective. Walk through the user's
likely workflow. Focus on transitions, feedback after actions, where
users might lose context. Assess interaction feedback and state changes.

**Evaluator C** — Skeptical eye. Edge cases and error states: empty
states, long text, unexpected input, missing data. Look for what's
NOT there. Use accessibility tree data to identify missing or
misleading accessible names, roles, or states.

Each evaluator produces **candidate violations**:

```
### Evaluator [A/B/C] — Candidate Violations

**V-[N]. [Short violation title]**
- Screen/location: [where in the interface]
- Heuristic: [which heuristic(s), by framework name and number]
- Observation: [mismatch between interface and heuristic, factually]
- Evidence: [specific element, label, or interaction]
```

Number violations per evaluator: V-A1, V-A2..., V-B1, V-B2..., V-C1...

### What counts as a violation

An observable mismatch between the interface and a heuristic principle.
NOT a personal preference, feature request, severity judgment, or
recommendation. If borderline, include as candidate and flag it.

## Step 2: Specialist Evaluation (Optional)

If requested via `--specialists`, run additional passes. Available
lenses: **Accessibility** (WCAG), **Information architecture**
(navigation, labeling, findability), **Interaction design**
(micro-interactions, state transitions), **Content/UX writing**
(labels, instructions, error messages). Same violation format.
Number as V-ACC1, V-IA1, etc.

## Step 3: Reconciliation

After all passes, produce a consolidated report:

1. **Group** candidate violations by screen/location and heuristic.
2. **Determine agreement:** Unanimous (3/3), Majority (2/3), or
   Single evaluator (1/3). Single-evaluator findings are still valid.
3. **Flag disagreements explicitly.** Present both perspectives.
4. **Remove duplicates.** Merge and note which evaluators identified it.
5. **Tag borderline items** with `[BORDERLINE]`.
6. **Suggest severity:** Critical (task failure/data loss), Major
   (significant difficulty), Minor (noticeable, not impairing),
   Cosmetic (aesthetic inconsistency). Researcher confirms in Step 4.
7. **Flag violations where user testing would add signal** — when the
   finding rests on a prediction about user behavior (discoverability,
   learned-behavior assumptions, cognitive load claims, disagreements,
   borderline items).

### Consolidated violation format

```
**V-[N]. [Short violation title]**
- Screen/location: [where]
- Heuristic: [which heuristic(s), by framework name and number]
- Observation: [merged description]
- Suggested severity: [Critical / Major / Minor / Cosmetic]
- Severity: [confirmed or overridden by researcher in Step 4]
- Agreement: [Unanimous / Majority / Single evaluator]
- Identified by: [Evaluator A, B, C, Specialists, and/or Researcher]
- [If disagreement:] Dissent: [details]
- [If borderline:] [BORDERLINE]
- [If testing would add signal:] User testing signal: [testable question]
```

Number consolidated violations sequentially: V-01, V-02, V-03...

## Step 4: Researcher Review

Present consolidated findings to the researcher before generating
output. This is a required human gate. Follow the review format
described in [references/researcher-review.md](references/researcher-review.md),
which supports both spreadsheet (Google Sheets) and chat-based review.

After review: remove dismissed violations, use researcher's severity
ratings, append researcher context, and add any new violations the
researcher identified.

## Step 5: Generate Output

Produce both a markdown report and an HTML report following the
templates in [references/report-templates.md](references/report-templates.md).

**Review subject is required in every output.** Prominently display
the review subject record near the top of each report — including the
full **Source URL** when one was provided and the **Evaluation date**.
Researchers running multiple evaluations rely on this block to tell
reports apart at a glance.

**Evaluator legend is required in every output.** Include the following
legend in all outputs (chat, spreadsheet, markdown, HTML) so readers
understand what each evaluator was focused on:

| Evaluator | Lens | Focus |
|-----------|------|-------|
| A | Visual inspection | Labels, layout, visual hierarchy, affordances, feedback indicators — screen by screen, element by element |
| B | Task flow | Transitions, feedback after actions, where users might lose context — follows the user's likely workflow |
| C | Edge cases | Empty states, long text, unexpected input, missing data, accessibility gaps — looks for what's NOT there |

Place this legend alongside the severity legend so researchers have a
complete key for interpreting the findings.

All outputs include a traceability line at the bottom. Read the version
from the plugin's `plugin.json` manifest and populate `[version]`.

## Guardrails

- **Framework before evaluation.** No Evaluator A/B/C (and no
  consolidated findings) until `--framework`, `--heuristics`, or an
  explicit researcher framework choice is on record.
- **Violations only, not interpretations.** Report observable mismatches.
  Do not infer user intent or claim impact without evidence.
- **No severity ratings from evaluators.** The researcher assigns
  severity during Step 4.
- **No design recommendations.** The evaluation surfaces what violates
  principles. Fixes are a design decision.
- **Not a substitute for usability testing.** They complement each other.
- **Evidence for every finding.** Each violation must reference a
  specific screen, element, or interaction.
- **AI transparency.** State that evaluations were conducted by
  AI-simulated evaluators, not human experts.

---

## What This Skill Does NOT Do

- **Assign severity ratings.** The researcher assigns these in Step 4.
- **Recommend design changes.** Surfaces violations only.
- **Replace usability testing.** Complements it.
- **Guarantee completeness.** Three evaluators won't catch everything.

## Reference Docs

| Doc | When to load |
|-----|-------------|
| [heuristic-frameworks.md](references/heuristic-frameworks.md) | Full definitions for all four built-in heuristic frameworks |
| [report-templates.md](references/report-templates.md) | Markdown and HTML report output format templates |
| [researcher-review.md](references/researcher-review.md) | Spreadsheet and chat review format details |
| [human-vs-agent-operation.md](references/human-vs-agent-operation.md) | Human vs agent operating modes; what to change for reliable agent runs (design brief, not runtime procedure) |
