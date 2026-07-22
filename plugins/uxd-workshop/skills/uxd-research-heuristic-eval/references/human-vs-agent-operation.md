# Human vs agent operation — heuristic evaluation skill

This note explains how `uxd-research-heuristic-eval` is meant to be
used today, where autonomous agents struggle, and what would need to
change if we want a reliable agent-operated path alongside the
researcher-in-the-loop path.

It is a design/ops brief — not a change to skill behavior until the
proposals below are accepted and edited into `SKILL.md`.

---

## Current design intent: human-operated

The skill is a **researcher-in-the-loop** workflow. The agent (Claude)
does the heavy inspection and drafting; a human researcher owns the
decisions that change outcomes.

| Gate | Who decides | Why |
|------|-------------|-----|
| Heuristic framework | Researcher (or `--framework`) | Changes which principles findings map to |
| Interface input completeness | Researcher (screens, flows, task) | Bad input → invented or thin findings |
| Specialists (`--specialists`) | Researcher (opt-in) | Extra lenses beyond A/B/C generalists |
| Review format (spreadsheet vs chat) | Researcher | Required before final reports |
| Confirm / dismiss / severity | Researcher | AI suggests; human owns ratings |
| Final `.md` / `.html` | After researcher review | Avoid shipping unreviewed AI output |

Core evaluation (three independent generalist passes, reconciliation,
violations-only guardrails) is already agent-executable **once** those
gates are satisfied.

---

## What goes wrong when an agent runs it alone

Observed in local eval dry-runs (headless Claude Code):

1. **Framework gate skipped** — With no `--framework`, the skill says
   *ask*. Agents often skip the ask and proceed with Nielsen’s 10.
2. **“Declined question → continue”** — If `AskUserQuestion` is declined
   or unanswered in headless mode, agents treat that like “Not sure”
   and default to Nielsen, then run the full eval.
3. **Review gate skipped or short-circuited** — Agents may jump to chat
   review language, or ask a different “accept all / skip to reports”
   question, then write final files without a real researcher pass.
4. **Specialists never offered** — `--specialists` is opt-in only. Agents
   do not ask “do you want accessibility / IA / …” unless prompted.
   That is fine for human mode; easy to miss in agent mode.

None of that means A/B/C or the templates are broken. It means the
**interactive contract** assumes a human answer that automation does
not provide.

---

## Two operating modes

### Mode A — Human-operated (keep as default)

**Caller:** Researcher in Claude Code (or similar), interactive session.

**Expected behavior:**

1. Researcher provides interface input (exports, URL, text, etc.).
2. If no `--framework`, agent **asks and waits** (does not evaluate yet).
3. Optional: researcher passes `--specialists …` or declines extras.
4. Agent runs Evaluator A/B/C (+ specialists if requested), reconciles.
5. Agent asks spreadsheet vs chat; **waits** for confirm/dismiss/severity.
6. Only then writes `heuristic-eval-[date].md` and `.html`.

**Skill changes needed for Mode A (hardening only):**

| Change | Purpose |
|--------|---------|
| Hard stop language | If framework or review format is unanswered, **stop**. Do not default. Do not write reports. |
| Decline ≠ “Not sure” | A declined/cancelled question is not permission to use Nielsen and continue. |
| Prefer structured ask | Use `AskUserQuestion` (or equivalent) for framework + review format when available. |
| Optional specialist prompt | Once after framework: “Add specialist lenses? None / accessibility / IA / …” |

Mode A should remain the documented default for researchers.

### Mode B — Agent-operated (explicit, non-blocking)

**Caller:** Another agent, eval harness, or automation that cannot wait
for a human mid-run.

**Expected behavior:**

1. Caller **must** supply enough args to skip interactive gates, or opt
   into documented defaults.
2. Agent evaluates and returns consolidated findings (and optionally
   draft reports) without hanging on unanswered questions.
3. Researcher review may be deferred or marked “unreviewed / suggested
   severity only.”

**Skill changes needed for Mode B:**

| Change | Purpose |
|--------|---------|
| Document agent contract | e.g. require `--framework <name>` for non-interactive runs |
| `--review chat\|none` (or similar) | `chat` = present findings and stop for later human review; `none` = emit draft report with clear “researcher review not completed” banner |
| `--assume-defaults` (optional, explicit) | Only if we want a single flag: framework=Nielsen, review=`none` or `chat`, no specialists — **never** silent default without the flag |
| Stronger “do not invent gate answers” | Even in Mode B, do not pretend a human confirmed severities |
| Eval / harness notes | Offline runs deny Google Workspace MCP; prefer `--review chat` or `none` |

Specialists stay opt-in via `--specialists` in both modes unless we
later add an interactive ask (Mode A) or a caller-supplied list (Mode B).

---

## Recommended product stance

1. **Keep Mode A as the primary researcher experience.** Heuristic eval
   quality and organizational trust depend on human severity ownership.
2. **Add Mode B as an explicit secondary path** for agents and evals —
   driven by flags, not by silent Nielsen after a skipped ask.
3. **Do not** make “always Nielsen, always write reports” the unnamed
   default. That trains agents to skip the researcher and mislabels
   AI-suggested severity as reviewed output.

---

## Mapping to today’s arguments

| Arg / step | Mode A (human) | Mode B (agent) |
|------------|----------------|----------------|
| Interface input | Required; ask if incomplete | Required up front |
| `--framework` | Optional → ask | **Required** (or `--assume-defaults`) |
| `--heuristics` | Optional override | Optional override |
| `--specialists` | Optional; optionally ask | Optional; caller supplies or omit |
| `--project` | Optional | Optional |
| Review format ask | Required | Replaced by `--review` |
| Confirm/dismiss/severity | Required before final files | Deferred, or draft-only with banner |
| Final `.md`/`.html` | After review | Only if `--review none` (draft) or after a later human pass |

---

## What does *not* need to change for agent use

- Three generalist evaluator lenses (A/B/C) and independence guidance
- Violation format, reconciliation, agreement labels
- “Violations only / no design recommendations” guardrails
- Review subject record fields
- Report templates (aside from an optional “unreviewed draft” banner)
- Figma-export requirement (agents still cannot inspect Figma URLs)

---

## Implications for evals

The offline eval suite should test **both** contracts:

| Case intent | Mode |
|-------------|------|
| Ask framework; do not evaluate until answered | A (with `AskUserQuestion` interceptor or stop-on-decline) |
| With `--framework nielsen`, run A/B/C | B-compatible |
| Researcher review gate before report files | A |
| Draft/unreviewed path when `--review none` | B (once implemented) |
| Figma needs exports; no invented findings | Both |

Until Mode B flags exist, agent-only runs should pass `--framework`
explicitly and treat skipped review as a **skill bug**, not as success.

---

## Suggested implementation order

1. Harden Mode A stop rules in `SKILL.md` (framework + review; decline ≠ default).
2. Add Mode B flags (`--review`, document required `--framework` / `--assume-defaults`).
3. Add a short “Unreviewed draft” banner to report templates when review was skipped under Mode B.
4. Extend eval cases for Mode B; keep Mode A cases for interactive gates.
5. Optionally prompt for specialists in Mode A only.

---

## Open decisions

- Should Mode B be allowed to write final filenames, or only
  `*-draft.*` until a human confirms?
- Is Nielsen the only allowed `--assume-defaults` framework, or should
  that flag be forbidden in favor of always requiring `--framework`?
- Should specialists be part of the Mode A ask, or stay documentation-only
  via `--specialists`?

---

## Related docs

- [`SKILL.md`](../SKILL.md) — current procedure and guardrails
- [`researcher-review.md`](researcher-review.md) — spreadsheet vs chat gate
- [`report-templates.md`](report-templates.md) — output shape
- [`../eval/`](../eval/) — offline behavior/contract eval suite
