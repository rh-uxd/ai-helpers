# eval-usability-score

Scoring and schema procedure for Phase B usability dimensions. Called from `eval-usability.md` after persona walkthroughs complete.

## Step 1: Score 7 Usability Dimensions

Read rubric from `.context/usability-testing/prompts/evaluate-flow.md`. Score 0-3 per dimension:

| # | Dimension | Measures |
|---|-----------|----------|
| 1 | Workflow Continuity & Integrity | Complete flow without infrastructure cliffs? |
| 2 | Cross-Persona Context & Handoffs | Context preserved across roles? |
| 3 | Scalability & Progressive Complexity | Serves both novices and experts? |
| 4 | System Status, Observability & Trust | UI explains waits and failures? |
| 5 | Technical Abstraction & Signal-to-Noise | Relevant info or infrastructure leaks? |
| 6 | Mental Model Fidelity | UI speaks user's language? |
| 7 | Accessibility & Inclusion | Keyboard nav, screen readers? |

Scale: 0=Broken, 1=Fragmented, 2=Functional, 3=Seamless.

**Score stabilization rules:**
- Assisted navigation caps score at 1 for affected dimension
- Use strictest interpretation (expected path, not alternate paths)
- Journey count must be deterministic (from extract-state.json)

### Dimension 2 Context Rule (Cross-Persona Handoffs)

If ALL of the following are true:
  - extract-state.json has only 1 persona type in journey_definitions (e.g., only "data scientist" variants)
  - No AC mentions "handoff", "collaboration", "share", "another user", or "another role"
  - The feature is inherently single-user (creation, viewing, configuration — not admin->user workflows)

Then: Score Dimension 2 as **N/A**. Compute overall_score from 6 dimensions (out of 18 max).
Write `"score": "N/A"` in the CSV usability section and note "single-user feature" in evidence.

If the feature involves ANY cross-role interaction (e.g., admin creates policy, user consumes it): score normally using the full rubric criteria.

### N/A Scoring Rules (general)

Any dimension may be scored N/A when the prototype context makes it inapplicable. When `composite_score` is null or `"N/A"`, you MUST populate `note` with a brief reason.

Common N/A scenarios beyond Dimension 2:
- **Dimension 3 (Scalability & Progressive Complexity):** Feature has no error states to test (pure read-only view)
- **Dimension 4 (System Status, Observability & Trust):** Feature is a first-time wizard with no repeat-use path
- **Dimension 7 (Accessibility & Inclusion):** Feature has no help content and none is expected

When scoring N/A, set `composite_score: null` and `note: "<reason>"` in the dimension object. Compute overall_score from only the scored dimensions (e.g., 6 scored dims -> max 18).

BAD scoring example:
> "Workflow Continuity: 2/3 — the flow seems mostly complete." (No evidence cited, no persona-specific observation, no step reference.)

Each score MUST cite specific trace step numbers and persona observations as evidence.

## Step 2: Append Section 2 to CSV

APPEND to existing `evaluation-report.csv` (do NOT overwrite Section 1):

```
# USABILITY DIMENSIONS
dimension_id,dimension_name,score,confidence,evidence,persona_scores
workflow_continuity,Workflow Continuity,2.5,high,"journey-1 steps 1-4","{""data-scientist+junior"":2,""data-scientist+senior"":3}"
```

**The `score` column is the composite (average of per-persona scores). Preserve decimal values — if one persona scores 2 and another scores 3, write `2.5` not `2`. Do NOT floor or round.**

The `persona_scores` column stores individual scores as a JSON object for attribution.

## Step 3: Stage 2 Evaluator Append

This step ONLY appends the Stage 2 Evaluator section to existing think-aloud markdown files. It NEVER rewrites or replaces Stage 1 Actor steps (those were written synchronously during walkthroughs).

**If the think-aloud markdown file does NOT already contain Stage 1 steps:** Stop. The walkthrough did not produce trace data. Go back and re-run the walkthrough for this persona — do NOT generate retrospective narration from screenshots alone.

For each persona-task markdown file that already has Stage 1 Actor content, APPEND the Stage 2 Evaluator section:

**Stage 2 — The Evaluator:** Switch to Senior UX Researcher. Score all 7 dimensions using the Stage 1 trace (already written above) as evidence. Map findings to JTBD.

**Write a standalone .md file for EACH evaluated persona PER TASK:**

File: `.artifacts/<KEY>/eval/usability-thinkaloud-<persona-id>-task-<N>.md`

Always use per-task naming even when there is only one task. The file MUST contain (minimum 3000 characters):

```markdown
# Think-Aloud Trace: <Persona Name>
## Feature: <ticket title>
## Task: <primary goal from journey definition>

---

### Stage 1: The Actor

STEP 1:
- What I see: [describe from screenshot/journey evidence — what the persona sees on screen]
- What I'm thinking: [first person, in-character internal monologue]
- What I'll try: [action and why]
- Confidence: [high/low/none]
- Patience: [X% — track as depleting resource]

STEP 2:
...

NAVIGATION COMPLETE:
- Outcome: [Completed / Completed with low confidence / Abandoned]
- Final patience: [X%]
- CLI escapes: [count]
- Confusion events: [count]

---

### Stage 2: The Evaluator

Target Audience Alignment: [is this persona a plausible user?]

Dimension 1: Workflow Continuity — Score: X/3
  Confidence: [High/Medium/Low]
  Evidence: [cite STEP numbers]
  Finding: [one sentence]

Dimension 2: Cross-Persona Handoffs — Score: X/3
  ...

[all 7 dimensions]

Overall: X/21
Key insight: [most actionable finding]
```

**After scoring all 7 dimensions**, the evaluator must annotate each trace step with AC attribution:

For each step in the persona's trace, add `evidence_for_acs: string[]` — the AC IDs for which that step provides observable evidence (positive or negative). Steps with no AC relevance get an empty array `[]`.

> **REQUIRED:** The `evidence_for_acs` field is REQUIRED on every trace step. This enables the discoverability matrix.

### Discoverability Summary (optional)

After all persona-task traces are complete, optionally produce `.artifacts/<KEY>/eval/discoverability-matrix.json`:

```json
{
  "generated_at": "<ISO timestamp>",
  "acs": [
    { "criterion_id": "AC-1", "phase_a_verdict": "PASS", "persona_discovered": true, "discovery_method": "independent" },
    { "criterion_id": "AC-4", "phase_a_verdict": "PASS", "persona_discovered": true, "discovery_method": "assisted" },
    { "criterion_id": "AC-6", "phase_a_verdict": "PASS", "persona_discovered": false, "discovery_method": "not_reached" }
  ],
  "discoverability_rate": 0.67,
  "summary": "4/6 passed ACs were independently discoverable by personas"
}
```

## Step 4: Write usability_dimensions to journey-log.json

**FORMAT REQUIREMENTS — render-report.js will produce broken output without these exact fields:**

Required top-level fields inside `usability_dimensions`:
- `personas_evaluated` — array of composed IDs. NOT inside persona_selection — at the TOP level.
- `dimensions[].composite_score` — number, the average of persona scores for that dimension. NOT just `score`.
- `think_aloud.traces` — array with one entry **per persona per task** containing `narration_summary`, `confusion_events` count, `dimension_scores`, `task_index`, and per-task `patience_end`

**Per-task patience tracking:**
- Patience resets to 100% at the start of each task (each task runs in an independent browser context/sub-agent)
- `persona_overlays` entries MUST include `task_index` and pull `patience_start`, `patience_end`, `confusion_events` from the matching `persona-results.json` entry — NOT collapsed across tasks
- `think_aloud.traces` entries MUST include `task_index` and use per-task values from `persona-results.json`

Also: `persona-results.json` output MUST be an **array** of objects, NOT a dict keyed by persona ID.

```json
{
  "usability_dimensions": {
    "source": "automated-usability-testing",
    "personas_evaluated": ["mlops-operator+experienced", "mlops-operator+junior"],
    "persona_selection": { "method": "automatic", "selected": ["..."], "reasoning": "..." },
    "dimensions": [
      {
        "id": "workflow_continuity",
        "name": "Workflow Continuity & Integrity",
        "scores": {
          "mlops-operator+experienced": { "score": 3, "confidence": "High", "finding": "Full flow works" },
          "mlops-operator+junior": { "score": 2, "confidence": "Medium", "finding": "Gets confused by..." }
        },
        "composite_score": 2.5
      }
    ],
    "overall_score": 15.5,
    "persona_overlays": [
      {
        "persona": "mlops-operator+experienced",
        "persona_name": "Maude - Experienced MLOps Engineer",
        "task_index": 1,
        "patience_start": 100,
        "patience_end": 100,
        "abandoned": false,
        "confusion_events": [
          { "step": 3, "trigger": "Column headers truncated", "knowledge_gap": "ui: expected", "patience_cost": -5 }
        ],
        "cli_escapes": 0,
        "would_complete": true
      }
    ],
    "think_aloud": {
      "personas_evaluated": ["mlops-operator+experienced"],
      "traces": [
        {
          "persona": "mlops-operator+experienced",
          "task_index": 1,
          "outcome": "completed",
          "patience_end": 100,
          "confusion_events": 1,
          "cli_escapes": 0,
          "response_strategies": { "help_seeking": 0, "guess_and_continue": 0, "abandon": 0 },
          "expected_vs_actual": [
            { "step": 3, "expected": "Hover tooltip", "actual": "Expandable row", "impact": "Better than expected" }
          ],
          "missing_feedback": [],
          "dimension_scores": { "workflow_continuity": { "score": 3, "confidence": "High" } },
          "narration_summary": "1-2 sentence summary of this persona's experience on this specific task."
        }
      ]
    }
  }
}
```

### Format Rules for render-report.js

- `persona_overlays` MUST always be populated (one entry per persona **per task**)
- `confusion_events[].step` MUST be a NUMBER matching `journey.steps[].step`
- `dimensions[].id` MUST use the 7 standard IDs (workflow_continuity, cross_persona_handoffs, etc.)
- `dimensions[].name` MUST be present
- `dimensions[].scores` MUST be keyed by persona ID with `{score, confidence, finding}`
- `think_aloud.traces` MUST be populated when `--usability=deep`
- `think_aloud.traces[].task_index` MUST be present — one trace entry per persona per task
- `think_aloud.traces[].patience_end` MUST be the per-task value from `persona-results.json`
- `think_aloud.traces[].confusion_events` scalar MUST equal the count for THAT SPECIFIC TASK
- `overall_score` MUST be a number — the denominator is derived from scored dimensions

### Post-Write Validation (BLOCKING)

After writing `usability_dimensions` to `journey-log.json`, run this validation immediately:

```python
import json
jl = json.loads(open('.artifacts/<KEY>/eval/journey-log.json').read())
ud = jl.get('usability_dimensions', {})
errors = []

if 'persona_selection' not in jl:
    errors.append('MISSING: persona_selection not in journey-log.json top level')

for i, d in enumerate(ud.get('dimensions', [])):
    if 'dimension_id' in d and 'id' not in d:
        errors.append(f'dimensions[{i}]: uses "dimension_id" instead of "id"')
    if 'id' not in d:
        errors.append(f'dimensions[{i}]: missing "id"')
    if 'name' not in d:
        errors.append(f'dimensions[{i}]: missing "name"')
    if 'composite_score' not in d:
        errors.append(f'dimensions[{i}]: missing "composite_score"')
    if d.get('composite_score') is None and not d.get('note'):
        errors.append(f'dimensions[{i}]: composite_score is null but "note" is missing')

for i, o in enumerate(ud.get('persona_overlays', [])):
    if 'task_index' not in o:
        errors.append(f'persona_overlays[{i}]: missing "task_index"')

for i, t in enumerate(ud.get('think_aloud', {}).get('traces', [])):
    if 'task_index' not in t:
        errors.append(f'think_aloud.traces[{i}]: missing "task_index"')

if errors:
    print('SCHEMA ERRORS (fix before continuing):')
    for e in errors:
        print(f'  - {e}')
else:
    print('Schema validation passed')
```

If errors are found, fix the journey-log.json in place before continuing.
