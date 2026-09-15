---
name: uxd-research-heuristic-eval
slug: uxd-research-heuristic-eval
type: crossover
phase: evaluative
status: experimental
description: "Conduct a heuristic evaluation of a prototype or interface using three independent expert evaluators. Use when running a usability audit, evaluating a UI against Nielsen's heuristics or other frameworks, or preparing for user testing. Do not use for accessibility audits, WCAG checks, or axe scans."
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

## Inputs

| Input | Type | Required | Default |
|---|---|---|---|
| Interface to evaluate | Screenshots, image files, text descriptions, or URLs (URLs inspected in a live browser — Playwright MCP or equivalent) | yes | — |
| Framework | Heuristic framework(s) to use (e.g., `nielsen`, `shneiderman`) | yes | ask researcher |
| Custom heuristics | User-defined heuristics (overrides framework) | no | — |
| Specialist areas | Additional specialist evaluators (e.g., `information-architecture`) | no | — |
| Project slug | Project directory for saving output | no | current working directory |

---

## Outputs

| Output | Format | Location |
|---|---|---|
| Evaluation report | `.md` and `.html` | `[project-dir]/heuristic-eval-[date].[ext]` |

---

## Arguments

$ARGUMENTS

Parse as: `<interface-input> [--framework <name>] [--heuristics <custom>] [--specialists <areas>] [--project <slug>] [--review chat|none] [--assume-defaults]`

- `interface-input` — Screenshots, image files, text descriptions of
  screens, or URLs. URLs must be inspected in a live browser (not
  curl/WebFetch). For Figma prototypes, the user should provide
  exported screenshots (Figma links cannot be inspected directly).
- `--framework <name>[,<name>]` — Which heuristic framework(s) to use
  (see [references/heuristic-frameworks.md](references/heuristic-frameworks.md)).
  Accepts a single framework or a comma-separated list
  (e.g., `--framework nielsen,shneiderman`). If not specified, **ask and
  wait** — do not assume Nielsen or any other default. Required in
  Mode B unless `--assume-defaults` is used.
- `--heuristics <custom>` — User-defined heuristics (overrides framework).
- `--specialists <areas>` — Add specialist evaluators beyond the core
  three (e.g., `information-architecture,content-ux-writing`).
  Accessibility is not a valid specialist — see Guardrails.
- `--project <slug>` — Project directory for saving output. If not
  specified, save to current working directory.
- `--review chat|none` — Controls the researcher review gate.
  `chat` = present consolidated findings and wait for researcher
  confirm/dismiss/severity (current default behavior). `none` = skip
  researcher review, use AI-suggested severities, and emit reports with
  an "Unreviewed Draft" banner. In Mode A, if omitted, ask. In Mode B,
  required (or use `--assume-defaults`).
- `--assume-defaults` — Shorthand for `--framework nielsen --review none`
  with no specialist passes. Explicitly opts into documented defaults
  for non-interactive runs. Does not silently activate — the output will
  state: "Defaults assumed: framework=Nielsen's 10, review=none, no
  specialist passes."

## Operating Modes

This skill supports two operating modes. Mode detection is based on
arguments — if `--review` or `--assume-defaults` is present, the skill
operates in Mode B. Otherwise, Mode A.

### Mode A — Human-operated (default)

**Caller:** Researcher in an interactive session.

1. Researcher provides interface input.
2. If no `--framework`, the skill **asks and waits** (does not evaluate).
3. After framework is confirmed, the skill offers specialist lenses.
4. Agent runs Evaluator A/B/C (+ specialists if requested), reconciles.
5. Agent asks review format (spreadsheet vs chat); **waits** for
   confirm/dismiss/severity before writing reports.

All interactive gates are enforced. The researcher owns severity
ratings and the decision to publish findings.

### Mode B — Agent-operated (explicit opt-in)

**Caller:** Another agent, eval harness, or automation that cannot
answer interactive questions mid-run.

1. Caller **must** supply `--framework` and `--review chat|none` — or
   use `--assume-defaults` (which covers both). If neither path is
   satisfied, the skill stops with an error — it does not default or
   guess.
2. No interactive questions are asked. All decisions come from arguments.
3. If `--review none`: reports are written with an **Unreviewed Draft**
   banner. Severity ratings are labeled "Suggested severity" (not
   confirmed). The researcher can review later.
4. If `--review chat`: findings are presented and the skill stops,
   waiting for a human to resume.

Mode B never simulates researcher decisions. It either defers them
(with clear labeling) or waits for a human to arrive.

### Pipeline integration

Automated callers must pass `--assume-defaults` (equivalent to `--framework nielsen --review none`) or explicit `--framework`/`--review` flags. The skill cannot auto-detect automation context — missing flags produce an error. See [human-vs-agent-operation.md](references/human-vs-agent-operation.md) for setup guidance.

---

## Step 0: Gather Input

### Interface to evaluate

Confirm what you're evaluating. The user may provide:

- **Screenshots or images** — Read each image file. These are your
  primary inspection material.
- **Text descriptions** — Screen-by-screen descriptions of the interface
  layout, elements, and interactions.
- **URLs** — Inspect the live, rendered interface in a browser
  (Playwright MCP or equivalent browser tools). See "Browser
  inspection" below. Do **not** curl, wget, WebFetch, or otherwise
  fetch HTML/markdown as a stand-in. A fetched document is not the
  experience a user has. If no live browser is available, **stop and
  ask for screenshots** — do not evaluate from page source.
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
- If both URL and files are used (e.g., live browser inspection plus
  saved screenshots), include both.

### Browser inspection (when input is a URL)

When the user provides a URL, inspect it as a live page in a browser
**before** evaluation passes. Use Playwright MCP or equivalent browser
tools (navigate, screenshot, click, hover). The goal is the same
experience a user would have — rendered layout, interaction, and
state — not the document behind the page.

1. **Navigate to the URL** in the browser. Wait for full load.
2. **Capture baseline screenshots** at desktop viewport (1440x900):
   full-page and above-the-fold. Navigate to each specified screen.
3. **Inspect page structure** — headings, labels, interactive controls,
   and visible hierarchy — enough to understand what is on screen.
   Do **not** run automated accessibility scanners (axe, pa11y,
   Lighthouse a11y, WAVE, axe-core, or similar). Do not treat a
   Playwright accessibility snapshot as an a11y audit.
4. **Inspect interactive elements** — click/hover expandable sections,
   popovers, drawers, menus, toggles, modals. Capture each state.
5. **Save screenshots** as `heuristic-eval-[date]-screenshot-[N]-[description].png`
6. **Build an inspection summary** listing screenshots, page-structure
   observations, and interactive states.

**If no live browser is available:** Stop. Ask the researcher to provide screenshots. Do **not** fall back to curl, wget, or WebFetch — fetched markup omits layout, rendered UI, and interaction states. Do not invent findings from a URL alone.

### Heuristic framework(s)

**Hard stop.** If the user has not specified `--framework` (or custom
`--heuristics`), you must ask which framework to use and **wait for an
answer before any evaluation passes**. Do not start Evaluator A/B/C,
do not invent a framework choice, and do not silently default to
Nielsen's 10.

Use the environment's interactive question mechanism when available.
Present the options below (multi-select allowed). If that mechanism is
unavailable, ask the same question in chat and stop until the researcher
replies.

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

**Decline / cancel / no answer ≠ "Not sure".** If the interactive
question is declined, cancelled, or unanswered, stop and re-ask (or ask
in chat). Only default to Nielsen's 10 when the researcher explicitly
selects option 6 ("Not sure"). A declined `AskUserQuestion` is not
permission to use Nielsen and continue — it means the question was not
answered.

**Mode B: framework is required.** In Mode B, if neither `--framework`
nor `--assume-defaults` is provided, **stop with an error message:**
"Mode B requires `--framework <name>` or `--assume-defaults`. Cannot
proceed without a framework selection." Do not default to any framework
and do not run evaluation passes.

Load full heuristic definitions from
[references/heuristic-frameworks.md](references/heuristic-frameworks.md).

### When multiple frameworks are selected

Evaluators inspect against the combined set. Each violation maps to
every applicable heuristic across all frameworks. Group findings by
the first-listed framework. Cross-reference secondary framework
heuristics within each violation. Report "no violations" per framework.

### Specialist evaluators (Mode A only)

After the framework is confirmed, offer specialist lenses. Use the
environment's interactive question mechanism when available. If that
mechanism is unavailable, ask in chat.

> **Would you like to add specialist evaluator lenses beyond the three
> generalist passes?**
>
> 1. **None** — Proceed with Evaluators A/B/C only
> 2. **Information architecture** (navigation, labeling, findability)
> 3. **Interaction design** (micro-interactions, state transitions)
> 4. **Content/UX writing** (labels, instructions, error messages)

Multi-select allowed. If declined or no answer, proceed with
generalist evaluators only — specialists are additive, not required.

**Do not offer accessibility as a specialist lens.** If the researcher
asks for accessibility, WCAG, or axe, decline: this skill inspects
usability heuristics, not correctness/conformance. Note that a
dedicated accessibility skill is the right place for that work, then
continue with generalist (and any other requested) passes.

**In Mode B,** do not ask. Specialists are controlled by
`--specialists` only. If `--specialists` is not provided, run
generalist evaluators only. If the list includes `accessibility`,
skip that lens (see Step 2) and continue with any remaining valid
specialists.

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
states, long text, unexpected input, missing data, unlabeled
controls, missing confirmation. Look for what's NOT there.

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
lenses: **Information architecture** (navigation, labeling,
findability), **Interaction design** (micro-interactions, state
transitions), **Content/UX writing** (labels, instructions, error
messages). Same violation format. Number as V-IA1, V-IXD1, V-UXW1,
etc.

If `--specialists` includes `accessibility` (or WCAG/axe/a11y),
**do not run that pass.** Tell the researcher it is out of scope for
this skill, then run any remaining valid specialists.

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

### Mode A and `--review chat`: interactive review (default)

Present consolidated findings to the researcher before generating
output. This is a required human gate. Follow the review format
described in [references/researcher-review.md](references/researcher-review.md),
which supports both spreadsheet (Google Sheets) and chat-based review.

After review: remove dismissed violations, use researcher's severity
ratings, append researcher context, and add any new violations the
researcher identified.

### `--review none`: skip review (Mode B)

When `--review none` is set, skip the researcher review entirely:

1. **Do not ask** for a review format (spreadsheet or chat).
2. **Use AI-suggested severities** from Step 3 reconciliation. Label
   every severity as **"Suggested severity"** — never bare "Severity"
   or "Confirmed."
3. **Do not pretend a human confirmed severities.** The output must
   make clear that no researcher has reviewed or signed off.
4. Proceed directly to Step 5 with the **Unreviewed Draft** banner.

A researcher can review later by running the skill again with the same
input and `--review chat`. See
[references/researcher-review.md](references/researcher-review.md)
for details on deferred review.

## Step 5: Generate Output

Produce both a markdown report and an HTML report following the
templates in [references/report-templates.md](references/report-templates.md).

### Unreviewed draft banner (`--review none`)

When `--review none` was used, **every output** (markdown and HTML)
must include a prominent banner immediately after the report title,
before the review subject block:

> **⚠ Unreviewed Draft**
>
> Severity ratings are AI-suggested and have not been confirmed by a
> researcher. Violations may include false positives. A researcher
> should review all findings before sharing or acting on them.

Additionally, replace all "Severity" field labels with "Suggested
severity" throughout the report. See
[references/report-templates.md](references/report-templates.md)
for the banner format in each template.

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
| C | Edge cases | Empty states, long text, unexpected input, missing data, unlabeled controls — looks for what's NOT there |

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
  severity during Step 4. When review is skipped (`--review none`),
  severities are labeled "Suggested" — never "Confirmed."
- **No design recommendations.** The evaluation surfaces what violates
  principles. Fixes are a design decision.
- **Not a substitute for usability testing.** They complement each other.
- **Evidence for every finding.** Each violation must reference a
  specific screen, element, or interaction.
- **AI transparency.** State that evaluations were conducted by
  AI-simulated evaluators, not human experts.
- **Mode detection is explicit.** Mode B activates only when `--review`
  or `--assume-defaults` is present. Never silently enter Mode B.
  Never silently skip interactive gates.
- **No invented gate answers.** In Mode B, do not simulate researcher
  decisions. Do not treat a skipped or declined question as an answer.
  Severities are "suggested" until a human confirms them.
- **`--assume-defaults` is transparent.** When used, state in the
  output: "Defaults assumed: framework=Nielsen's 10, review=none, no
  specialist passes." The reader must be able to see that defaults were
  used, not chosen.
- **Not an accessibility audit.** Do not run axe, pa11y, Lighthouse
  a11y, WAVE, axe-core, or any other automated accessibility scanner.
  Do not inject scanning scripts. Do not score WCAG conformance. Do
  not offer or run an accessibility specialist pass. Usability
  heuristics are the scope; accessibility is a correctness check
  that belongs in a dedicated skill.
- **Live UI, not fetched documents.** Never curl, wget, WebFetch, or
  raw-HTTP the page source as the inspection method. A fetched
  document is not the user experience. URLs require a live browser;
  if that is unavailable, stop and ask for screenshots.

## Reference Docs

| Doc | When to load |
|-----|-------------|
| [heuristic-frameworks.md](references/heuristic-frameworks.md) | Full definitions for all four built-in heuristic frameworks |
| [report-templates.md](references/report-templates.md) | Markdown and HTML report output format templates |
| [researcher-review.md](references/researcher-review.md) | Spreadsheet and chat review format details |
| [human-vs-agent-operation.md](references/human-vs-agent-operation.md) | Design brief for dual-mode operation (Mode A human / Mode B agent); rationale and open decisions behind the changes in this skill |
| [evaluation-framework.md](references/evaluation-framework.md) | Framework for evaluating AI-assisted heuristic evaluation skills — six dimensions, metrics, benchmarks, and protocol |
