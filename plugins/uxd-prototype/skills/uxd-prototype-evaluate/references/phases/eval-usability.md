# eval-usability

Phase B of the eval pipeline. Runs discovery-based per-persona Playwright walkthroughs against a known-good prototype (ACs already validated in Phase A), then scores 7 usability dimensions using persona constraints and think-aloud narration.

Each persona navigates at their own competence level — an experienced user explores differently than a junior one. Navigation behavior is driven by the persona YAML fields: `exploration_tendency`, `experience_level`, `domain_knowledge`, and `constraints[]`.

**Skip entirely only if** the plugin persona catalog is not available AND `.context/usability-testing/` does not exist AND bootstrap cannot clone a configured usability-testing repo. The plugin persona catalog (`${CLAUDE_PLUGIN_ROOT}/knowledge/personas/catalog.yaml` or `${CLAUDE_SKILL_DIR}/../../knowledge/personas/catalog.yaml`) is bundled with the plugin and should always be present; `.context/usability-testing/` is cloned when `USABILITY_TESTING_REPO` or overlay `context_repos.usability_testing` is set. Phase B should never be skipped in normal operation. Prefer the catalog for IDs/names; deep behavioral YAML from `.context/` when present.

## Inputs

| Input | Description | Required |
|-------|-------------|----------|
| `.artifacts/<KEY>/eval/journey-log.json` | Phase A Playwright step log with AC screenshots | Yes |
| `.artifacts/<KEY>/eval/screenshots/` | Phase A journey screenshots (for reference) | Yes |
| `.artifacts/<KEY>/eval/extract-state.json` | Persona selection, journey definitions, goals | Yes |
| `${CLAUDE_PLUGIN_ROOT}/knowledge/personas/catalog.yaml` | Role persona IDs, display names, audience map | Yes |
| `${CLAUDE_PLUGIN_ROOT}/knowledge/personas/<card>.md` | Short persona cards (front matter + body) | Recommended |
| `${CLAUDE_PLUGIN_ROOT}/knowledge/personas/overlays/catalog.yaml` | Experience / accessibility / regulation / team overlays | Recommended |
| `${CLAUDE_PLUGIN_ROOT}/knowledge/personas/overlays/<id>.md` | Overlay cards | When audience needs them |
| Internal `uxd-eval-config/knowledge/personas/<id>.md` | Research citations (study URLs); via `overlay-get.js --knowledge-persona` | No |
| `.context/usability-testing/personas/` | Deep behavioral YAML (auto-cloned) | Yes |
| `.context/usability-testing/prompts/evaluate-flow.md` | 7-dimension rubric | Yes |
| `.artifacts/<KEY>/eval/navigation-hints.json` | Fallback hints for stuck personas | No |
| Prototype URL | Live URL (from eval-state.yaml) | Yes |

## Outputs

| File | Description |
|------|-------------|
| `.artifacts/<KEY>/eval/journey-log.json` | Updated with `usability_dimensions` section |
| `.artifacts/<KEY>/eval/evaluation-report.csv` | Appended Section 2 (USABILITY DIMENSIONS) |
| `.artifacts/<KEY>/eval/usability-thinkaloud-<persona-id>-task-<N>.md` | Per-persona per-task think-aloud trace |
| `.artifacts/<KEY>/eval/screenshots/persona-<persona-id>-task-<N>-step-<M>.png` | Per-persona per-task walkthrough screenshots |
| `.artifacts/<KEY>/eval/persona-results.json` | Structured trace data for all persona+task runs |
| `.artifacts/<KEY>/eval/refinement-suggestions.json` | Appended with usability suggestions for scores 0-1 |

## Procedure

### Step 1: Select and Load Personas

**REQUIRED: Actually read the persona YAML files.** Do not score from memory or inference alone.

**Read and follow [`eval-usability-personas.md`](eval-usability-personas.md)** for the full persona selection, catalog loading, overlay composition, and rubric reading procedure.

### Step 2: Map tasks to distinct navigation targets

Before generating Playwright scripts, plan WHERE each task navigates. This prevents all tasks from converging on the same page and producing identical screenshots.

**First, determine the prototype source type** from `eval-state.yaml > prototype_source_type`:

#### Scenario A: Remote Hosted (GitLab Pages, Vercel, etc.)

When `prototype_source_type: remote` — the prototype is live at a URL. Navigation MUST use heuristic locators (button clicks, text matching). Do NOT use `page.goto(BASE_URL + '/route')` for SPAs served from path prefixes.

**Route discovery for remote prototypes:**
1. Load the prototype URL in Playwright
2. Inspect the rendered DOM to discover navigation structure (sidebar buttons, tab labels, card titles)
3. If an MR link is available: read the MR source to extract route paths and component labels, but still navigate via clicks
4. Generate `navigation-hints.json` mapping task → click sequence (not URL routes)

```json
{
  "tasks": [
    {
      "task_index": 1,
      "click_sequence": ["button:Fraud Detection", "button:Deployments"],
      "wait_for": "tbody tr",
      "interaction": "hover status column"
    }
  ]
}
```

#### Scenario B: Local Project (Source Code Available)

When `prototype_source_type: spa` or `prototype_source_type: static` — the prototype is served locally and source code is available in the workspace.

**Route discovery for local prototypes:**
1. Read `src/routes.tsx`, `app/router.ts`, or similar to extract route table
2. Read the target feature component to find `data-testid` attributes and interactive elements
3. Generate `navigation-hints.json` with direct route paths (safe for local sirv with `--single`)

```json
{
  "source_type": "local",
  "routes_file": "src/routes.tsx",
  "tasks": [
    {
      "task_index": 1,
      "route": "/projects/fraud-detection",
      "tab_selector": "[data-testid='deployments-tab']",
      "wait_for": "tbody tr",
      "interaction": "hover [data-testid='status-cell']"
    }
  ]
}
```

#### Common rules for both scenarios

Read `extract-state.json > tasks_to_be_done` and the navigation hints to determine a unique route + interaction for each task:

For each task:
1. What ACs does it cover? (from `covers_acs` field)
2. What route/page tests those ACs? (from navigation-hints.json or workspace source)
3. What INTERACTION distinguishes this task from others on the same page? (expand row, open modal, filter, click tab, scroll position)

**Rules:**
- No two tasks may share the same route + same interaction
- If tasks must visit the same page, they MUST differ in: scroll position, filter state, expanded element, or tab selection
- If a task describes a state that can't be shown (feature disabled, RBAC restricted), navigate to the closest relevant page and STAY there
- A task about "comparing two things" should show BOTH things side-by-side or in sequence

**Single-page prototype rule:** If ALL tasks resolve to the same route, differentiation MUST come from interactions:
- Task 1: navigate + scan table (default view screenshot)
- Task 2: expand a specific row (expanded content screenshot)
- Task 3: hover over a status label (tooltip visible screenshot)
- Task N: scroll to a specific row, open a modal, click a tab, filter the table

**Write the task route mapping** as a comment block at the top of `${ARTIFACTS_DIR}/scripts/persona-walkthrough.mjs`.

### Step 3: Per-Persona Playwright Walkthroughs

**Read and follow [`references/playwright-rules.md`](../playwright-rules.md)** for browser/viewport setup, project seeding, screenshot timing, and locator strategy.

**Screenshot mode** (passed from eval-iterate):
- `--screenshots=full` (default): Capture a screenshot at every navigation step. Names: `persona-<id>-task-<N>-step-<M>.png`
- `--screenshots=key-only`: Capture ONE screenshot per persona per task — the final interaction state. Names: `persona-<id>-task-<N>-final.png`. Also skip writing `usability-thinkaloud-*.md` files.

Each persona runs their OWN Playwright walkthrough as an independent sub-agent. Navigation behavior is driven by the persona's YAML fields — not a shared script.

**CRITICAL: Do NOT write `persona-walkthrough.mjs` from scratch.** You MUST use the generator output below and only fill `// LLM_FILL` blocks. Hand-written scripts break localStorage seeding (see `playwright-rules.md` "Project and Feature Flag Seeding") and produce blank screenshots.

**Generate the walkthrough script scaffold:**

```bash
node ${CLAUDE_SKILL_DIR}/scripts/generate-journey-script.js ${ARTIFACTS_DIR}/ --mode=discover --screenshots=<full|key-only>
```

**Fill LLM_FILL blocks:** Read the generated script and complete `// LLM_FILL:` comment blocks with task-specific navigation, persona-driven interactions, and step-by-step screenshots.

**Validate the generated script** (BLOCKING — do not proceed if this fails):

```bash
# Verify persona script uses generator output (not hand-written localStorage)
grep -q "localStorage.setItem('selectedProject'" ${ARTIFACTS_DIR}/scripts/persona-walkthrough.mjs && {
  echo "FATAL: persona-walkthrough.mjs sets selectedProject — violates playwright-rules.md."
  echo "Regenerate with: node ${CLAUDE_SKILL_DIR}/scripts/generate-journey-script.js ${ARTIFACTS_DIR}/ --mode=discover"
  exit 1
}
grep -q "localStorage.removeItem('selectedProject')" ${ARTIFACTS_DIR}/scripts/persona-walkthrough.mjs || {
  echo "FATAL: persona-walkthrough.mjs missing selectedProject removal. Regenerate."
  exit 1
}
```

**Required script structure for `${ARTIFACTS_DIR}/scripts/persona-walkthrough.mjs`:**

- One function per task: `runTask1(page, persona)`, `runTask2(page, persona)`, etc.
- Each task function navigates to its MAPPED route from Step 2
- Persona fields influence navigation behavior (see table below)
- The `main()` loop calls task-specific functions, NOT a single shared `runPersonaTask()`
- Variable step counts: each task has as many steps as needed

**How persona fields drive navigation AND interaction:**

| YAML Field | Navigation Effect | Screenshot Impact |
|---|---|---|
| `exploration_tendency: low` | Sticks to obvious path. Won't open Advanced Settings. | Fewer screenshots, all on primary path |
| `exploration_tendency: high` | Proactively checks Advanced Settings, YAML views, logs. | More screenshots, captures side panels |
| `experience_level: junior` | Slower reading, confused by patterns without labels. | Screenshots show reading/scanning states |
| `experience_level: senior` | Efficient navigation, recognizes UI patterns. | Direct path, fewer screenshots |
| `domain_knowledge: {k8s: none}` | Nav items with K8s jargon trigger confusion events. | May screenshot wrong pages first |
| `domain_knowledge: {k8s: expert}` | Understands all terminology, navigates directly. | Direct path |
| `constraints[]` | Hard behavioral rules: "After 3 confusion events, abandon". | May produce incomplete screenshot sequence |
| `behavioral_attributes.patience` | How fast frustration builds. | Low patience may abandon mid-task |

**Prompt for each persona-task sub-agent:** Read [`references/persona-walkthrough-prompt.md`](../persona-walkthrough-prompt.md) for the full prompt template.

**Launch one sub-agent PER PERSONA PER TASK (all in parallel):**

Use the Task tool with `run_in_background: true` for each persona-task pair. Each sub-agent gets its own Playwright browser context. Wait for ALL to complete before proceeding.

If parallel sub-agents are not available, fall back to sequential execution with separate browser contexts per persona. NEVER skip Playwright walkthroughs and score from Phase A evidence alone — Phase B REQUIRES independent persona navigation.

### Step 4: Verify persona screenshots exist and are unique (BLOCKING)

After persona walkthroughs complete, verify that per-persona screenshots were produced:

```bash
ls .artifacts/<KEY>/eval/screenshots/persona-*.png
```

For each selected persona, at least ONE file matching `persona-<persona-id>-task-*-step-*.png` MUST exist.

**Screenshot uniqueness validation:** Different tasks MUST produce visually different screenshots. After capture, compare step-2+ across tasks for each persona. Tasks on the same page may have identical step-1 but MUST differ by step-2+.

**Cross-persona screenshot dedup:** For the same task, different personas MUST also produce different screenshots. Compare the final screenshot of task N across all personas. If `persona-A-task-1-final.png` and `persona-B-task-1-final.png` have the same file hash, the persona parameter was cosmetic — the Playwright script didn't branch on persona traits.

**If ANY two tasks share the same hash for step-2 AND step-3 (within or across personas):**

1. Diagnose: empty table (project filter), homepage stuck (navigation failure), same scroll position (interaction failure), or persona parameter not load-bearing (identical Playwright actions)
2. Re-run ONLY the colliding persona-task pair with explicit persona-specific instructions
3. If still identical after one retry, log as `"screenshot_uniqueness_failed": true` and continue

**If persona screenshots do NOT exist:** Run persona walkthroughs SEQUENTIALLY in the same Playwright session as a fallback.

### Step 5: Hints as Fallback (the "colleague" pattern)

Navigation hints from `navigation-hints.json` are available to persona agents but ONLY as a fallback after they get stuck. This models the real-world situation where a colleague tells you "it's under the Gen AI Studio section."

The persona agent:
1. First attempts navigation using visible UI + their domain expertise
2. If stuck (element not found, timeout): consults hints
3. Logs `navigate-assisted` on the step
4. Usability impact: assisted steps cap dimension scores at 1

### Step 6: Apply Persona Constraints to Journey Evidence

After persona walkthroughs complete, read each persona's output:
- `.artifacts/<KEY>/eval/usability-thinkaloud-<persona-id>-task-<N>.md`
- `.artifacts/<KEY>/eval/screenshots/persona-<persona-id>-task-<N>-step-<M>.png`

For each persona's trace, assess:
1. **Comprehension** — did the persona understand the UI elements? Check against domain_knowledge map.
2. **Patience drain and recovery** — run the deterministic calculator:

   ```bash
   node ${CLAUDE_SKILL_DIR}/scripts/compute-patience-drain.js ${ARTIFACTS_DIR}/
   ```

   This reads `persona-results.json` trace events and each persona's patience attribute, then recalculates `patience_end` using the exact rubric formula. Do NOT manually compute patience drain — the script enforces the formula mechanically.

   **Patience resets to 100% at the start of each task** (each task runs in an independent browser context/sub-agent). Per-task patience values in `persona-results.json` are independent.

   **Drain rates (per persona patience attribute from YAML):**
   - High patience: -5% per confusion event, -10% per dead end
   - Medium patience: -10% per confusion event, -20% per dead end
   - Low patience: -15% per confusion event, -30% per dead end
   - At 0%: persona abandons the task

   **Recovery (on successful sub-task completion):**
   - High patience: +10% per success (cap at 100%)
   - Medium/Low patience: +5% per success (cap at 100%)

3. **Knowledge gaps** — moments where persona constraints caused confusion
4. **Assisted navigation** — steps marked `navigate-assisted` are FAIL evidence for usability

Produce per-persona journey overlay with `patience_start`, `patience_end`, `confusion_events`, `cli_escapes`, `would_complete`.

### Step 7: Score, Append CSV, and Write Schemas

**Read and follow [`eval-usability-score.md`](eval-usability-score.md)** for the full scoring procedure:

1. Score 7 usability dimensions (0-3 scale, per persona, composite average)
2. Append Section 2 to `evaluation-report.csv`
3. Stage 2 Evaluator append to think-aloud markdown files
4. Write `usability_dimensions` to `journey-log.json` with all required schema fields

### Step 8: Write persona-results.json

**ALWAYS produce this file**, regardless of single-task or multi-task runs. This structured JSON is the canonical source for persona walkthrough data consumed by the report renderer.

Write to: `.artifacts/<KEY>/eval/persona-results.json`

**Post-write validation** — after writing, verify every entry has a non-null `persona` field and a valid `task_index`.

Format: array of persona-task results, one entry per persona per task:

```json
[
  {
    "persona": "<persona-id>",
    "persona_name": "<Full Display Name>",
    "task_index": 1,
    "task": "<task description from tasks_to_be_done>",
    "trace": [
      {
        "step": 1,
        "what_i_see": "...",
        "what_im_thinking": "...",
        "action": "...",
        "confidence": "high|medium|low",
        "patience": 100,
        "screenshot": ".artifacts/<KEY>/eval/screenshots/persona-<id>-task-1-step-1.png",
        "evidence_for_acs": ["AC-1"]
      }
    ],
    "screenshots": ["<paths>"],
    "patience_start": 100,
    "patience_end": 85,
    "confusion_events": 1,
    "assisted": false,
    "would_complete": true,
    "outcome": "completed"
  }
]
```

Even for single-task runs, wrap with `task_index: 1`.

**VALIDATION GATE (BLOCKING):** After writing persona-results.json, verify that EVERY entry has a non-empty `trace[]` array. If any entry has `trace: []`, re-run Step 3 for that persona-task pair.

### Step 9: Generate refinement suggestions

For dimensions scoring 0-1, generate suggestions:

```json
{
  "type": "usability",
  "dimension": "workflow_continuity",
  "score": 1,
  "persona": "data-scientist+junior",
  "problem": "...",
  "suggested_fix": "...",
  "affected_files": [],
  "evidence_steps": [],
  "confidence": "high|medium|low"
}
```

Rules:
- Only for scores 0-1 (2-3 are acceptable)
- Must include specific persona and evidence steps
- Do NOT suggest fixes for FLAGGED criteria
- `confidence: "low"` items are logged but NOT auto-applied by eval-fix

### Step 10: Capture final-state screenshot (skip if no fix loop ran)

**Skip this step if no fix loop ran** (check: `fix-log.json` does not exist OR `iteration-log.json` shows `iteration: 1` with `fail_count: 0`).

If the fix loop DID run, capture a screenshot of the primary page being tested (the same page eval-verify captured for `baseline-before.png`). See [`references/playwright-rules.md`](../playwright-rules.md) for browser setup and project seeding boilerplate.

This pairs with `baseline-before.png` to show how the prototype changed during evaluation.
