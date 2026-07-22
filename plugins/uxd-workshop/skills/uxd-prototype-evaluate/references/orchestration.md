# Orchestration Logic

Read and follow this file when running the full evaluate pipeline. Phase procedures live in `references/phases/` — execute each when the orchestrator reaches that step.

```
iteration = 0
max_iterations = parse --max-iterations (default: 3)
no_fix = parse --no-fix (default: false)

# ── Fresh flag handling ────────────────────────────────────────────
# --fresh deletes all prior artifacts for this KEY before starting.
if --fresh:
  rm -rf .artifacts/<KEY>/
  echo "Cleared .artifacts/<KEY>/ (--fresh)"

# ── Staleness detection (content-based) ────────────────────────────
# eval-extract Step 0 handles cache validation using a content hash of the
# ticket description. The orchestrator no longer compares timestamps, which
# avoids false invalidation when eval-iterate itself adds comments to the ticket.
# If --fresh is set, artifacts are already cleared above. Otherwise, let
# eval-extract's own cache check (content hash) decide whether to re-fetch.

# Initialize persistent state (survives context compression)
python3 ${CLAUDE_SKILL_DIR}/scripts/eval_state.py init .artifacts/<KEY>/eval-state.yaml \
  iteration=0 max_iterations=$max_iterations exit_reason=pending \
  phase=a ac_pass=false key=<KEY> url=<URL> workspace=<workspace> \
  pipeline_start=$(python3 ${CLAUDE_SKILL_DIR}/scripts/eval_state.py timestamp)

# ═══════════════════════════════════════════════════════════════════
# PHASE A: X-Ray AC Validation Loop
# Question: "Did the code produce what the acceptance criteria specify?"
# Method: X-ray evaluator with full source + hint access
# ═══════════════════════════════════════════════════════════════════

# ── Workspace state capture ───────────────────────────────────────
# The eval ALWAYS tests the current workspace state.
# Designers iterate: make changes → run eval → see results → fix → re-run.
# We never reset their work unless explicitly asked via --reset.

if workspace provided:
  cd <workspace>

  # Capture current state for the report (what exactly are we evaluating?)
  WORKSPACE_COMMIT=$(git log -1 --format="%h" 2>/dev/null || echo "unknown")
  WORKSPACE_MSG=$(git log -1 --format="%s" 2>/dev/null || echo "")
  WORKSPACE_DIRTY=$(git status --short 2>/dev/null | wc -l | tr -d ' ')

  # Optional: --reset flag for CI or reproducible testing (NOT default)
  if --reset:
    git fetch origin 2>/dev/null
    BRANCH=$(git branch --show-current)
    git reset --hard origin/$BRANCH
    echo "⚠ Workspace reset to origin/$BRANCH"
    # Re-capture state after reset
    WORKSPACE_COMMIT=$(git log -1 --format="%h")
    WORKSPACE_DIRTY=0

  # Log workspace state to eval-state.yaml for the report
  python3 ${CLAUDE_SKILL_DIR}/scripts/eval_state.py set .artifacts/<KEY>/eval-state.yaml \
    workspace_commit=$WORKSPACE_COMMIT workspace_dirty=$WORKSPACE_DIRTY

  # ── Detect server type (static vs dev/HMR) ──────────────────────
  # Static servers (sirv, serve, http-server) don't rebuild on source changes.
  # Dev servers (webpack serve, vite, next dev) auto-rebuild via HMR.
  # This determines whether we need explicit `npm run build` after eval-fix.
  SERVER_PID=$(lsof -ti:<PORT> 2>/dev/null | head -1)
  SERVER_CMD=$(ps -p $SERVER_PID -o command= 2>/dev/null || echo "")

  if SERVER_CMD contains "sirv" or "serve" or "http-server" or SERVER_CMD is empty:
    NEEDS_REBUILD=true
    echo "⚠ Static server detected (or server type unknown). Will rebuild after each fix iteration."
    echo "  For faster iteration: use 'npm run start:dev' (webpack dev server with HMR) instead."
  else:
    NEEDS_REBUILD=false
    echo "Dev server detected. HMR will handle rebuilds automatically."

# ── Setup (runs once) ──────────────────────────────────────────────

# ── Per-skill timing ──────────────────────────────────────────────
# Record start/end timestamps for each skill to measure optimization impact.

python3 ${CLAUDE_SKILL_DIR}/scripts/eval_state.py set .artifacts/<KEY>/eval-state.yaml \
  extract_core_start=$(python3 ${CLAUDE_SKILL_DIR}/scripts/eval_state.py timestamp)

Read ${CLAUDE_SKILL_DIR}/references/phases/eval-extract.md and execute it with --phase=core
# Produces: extract-state.json, mr-delta.json
# Defers: outcome-context.json, tasks_to_be_done, breadcrumb (run before Phase B)

python3 ${CLAUDE_SKILL_DIR}/scripts/eval_state.py set .artifacts/<KEY>/eval-state.yaml \
  extract_core_end=$(python3 ${CLAUDE_SKILL_DIR}/scripts/eval_state.py timestamp) \
  consistency_source_start=$(python3 ${CLAUDE_SKILL_DIR}/scripts/eval_state.py timestamp)

Read ${CLAUDE_SKILL_DIR}/references/phases/eval-consistency.md and execute it with --mode=source
# Runs ONCE (source-mode only). Produces: consistency-report.json, appends to refinement-suggestions.json
# Visual-mode deferred to after eval-journey when screenshots exist.
# Uses analyze.py bash commands for deterministic checks (no report generation).

python3 ${CLAUDE_SKILL_DIR}/scripts/eval_state.py set .artifacts/<KEY>/eval-state.yaml \
  consistency_source_end=$(python3 ${CLAUDE_SKILL_DIR}/scripts/eval_state.py timestamp)

# ── AC Fix Loop ────────────────────────────────────────────────────

LOOP:
  iteration += 1
  python3 ${CLAUDE_SKILL_DIR}/scripts/eval_state.py set .artifacts/<KEY>/eval-state.yaml iteration=$iteration

  # ── Classify ───────────────────────────────────────────────────
  if iteration == 1:
    Read ${CLAUDE_SKILL_DIR}/references/phases/eval-classify.md and execute it
    # Produces: evaluation-report.csv (Section 1, tiers only)
  # Iteration 2+: skip classify entirely. Tiers are structural and don't change.
  # The CSV already has tier assignments from iteration 1. Only verdicts need updating.

  # ── Journey (x-ray mode) ────────────────────────────────────
  # The x-ray evaluator uses workspace source directly for navigation.
  # No discovery-first pretense — goal is fast AC verification.
  if iteration == 1:
    Read ${CLAUDE_SKILL_DIR}/references/phases/eval-journey.md and execute it with:
      --mode=informed
    # Uses workspace source for selectors/routes. Verifies ACs quickly.
  else:
    Read ${CLAUDE_SKILL_DIR}/references/phases/eval-journey.md and execute it with:
      --mode=informed --rerun-only=<FAIL+FLAGGED AC IDs from previous CSV>
    # Only runs Playwright for journeys testing failing criteria
    # Carries forward PASS verdicts from previous iteration

  # ── Verdict cross-check (automated) ─────────────────────────────
  node ${CLAUDE_SKILL_DIR}/scripts/validate-verdicts.js .artifacts/<KEY>/
  # If violations found (exit 1): fix CSV verdicts to FLAGGED for contradicted ACs before continuing.
  # A journey FAIL + CSV PASS is never acceptable unless journey-log is corrected with visual evidence.

  # ── Archive this iteration ─────────────────────────────────────
  cp .artifacts/<KEY>/evaluation-report.csv → .artifacts/<KEY>/evaluation-report-iter-<iteration>.csv
  cp -r .artifacts/<KEY>/screenshots/ → .artifacts/<KEY>/screenshots-iter-<iteration>/

  # ── Compute counts FROM the CSV (source of truth) ──────────────
  Read .artifacts/<KEY>/evaluation-report.csv Section 1 (ACCEPTANCE CRITERIA)
  Parse using proper CSV quoting (fields may contain commas):
    pass_count = count rows where verdict column == "PASS"
    fail_count = count rows where verdict column == "FAIL"
    flagged_count = count rows where verdict column == "FLAGGED"

  NEVER manually estimate these counts. Always compute from the CSV file.

  # ── Write iteration entry to iteration-log.json ────────────────
  # Use the append-iteration-log.js script for rich, consistent entries:
  node ${CLAUDE_SKILL_DIR}/scripts/append-iteration-log.js .artifacts/<KEY>/ <iteration> a

  # This script reads CSV, journey-log, fix-log, refinement-suggestions, and
  # consistency-report to produce a complete iteration entry including:
  #   - pass/fail/flagged counts (from CSV)
  #   - per-AC verdict details (from CSV)
  #   - journey coverage mapping (from journey-log)
  #   - changes_applied (from fix-log.json, if fix loop ran)
  #   - root_cause (if any FAILs)
  #   - consistency_summary (from consistency-report)
  #   - timestamp for timing analysis

  # Read the updated log to get computed counts for exit checks:
  Read .artifacts/<KEY>/iteration-log.json for pass_count, fail_count from the last entry

  # ── Exit condition checks ──────────────────────────────────────
  if fail_count == 0 AND flagged_count == 0:
    Set exit_reason = "all_pass"
    python3 ${CLAUDE_SKILL_DIR}/scripts/eval_state.py set .artifacts/<KEY>/eval-state.yaml \
      exit_reason=all_pass ac_pass=true
    BREAK → proceed to Phase B

  if fail_count == 0 AND flagged_count > 0:
    # FLAGGED items may be fixable (e.g., wrong interaction pattern, missing mock state)
    # Attempt fix loop on FLAGGED suggestions. If eval-fix produces no changes, exit.
    if iteration > 1:
      # Check if fix-log.json from last iteration had zero applied fixes for FLAGGED items
      Read .artifacts/<KEY>/fix-log.json
      if fix-log shows 0 applied fixes (all skipped/deferred):
        Set exit_reason = "flagged_unfixable"
        python3 ${CLAUDE_SKILL_DIR}/scripts/eval_state.py set .artifacts/<KEY>/eval-state.yaml \
          exit_reason=flagged_unfixable ac_pass=true
        BREAK → proceed to Phase B (FLAGGED items need human review)
    # Otherwise continue to fix loop — eval-fix will attempt FLAGGED suggestions

  if iteration > 1:
    Compare current CSV verdicts against previous iteration's archived CSV
    if any criterion flipped PASS → FAIL:
      Set exit_reason = "regression"
      python3 ${CLAUDE_SKILL_DIR}/scripts/eval_state.py set .artifacts/<KEY>/eval-state.yaml \
        exit_reason=regression ac_pass=false
      BREAK → proceed to Phase B (on current prototype state)

  if iteration >= max_iterations:
    Set exit_reason = "max_iterations"
    python3 ${CLAUDE_SKILL_DIR}/scripts/eval_state.py set .artifacts/<KEY>/eval-state.yaml \
      exit_reason=max_iterations ac_pass=false
    BREAK → proceed to Phase B (even with remaining FAILs)

  if --no-iterate:
    Set exit_reason = "no_iterate"
    python3 ${CLAUDE_SKILL_DIR}/scripts/eval_state.py set .artifacts/<KEY>/eval-state.yaml \
      exit_reason=no_iterate ac_pass=false
    BREAK → proceed to Phase B

  # ── Fix ────────────────────────────────────────────────────────
  if no_fix:
    Set exit_reason = "no_fix"
    python3 ${CLAUDE_SKILL_DIR}/scripts/eval_state.py set .artifacts/<KEY>/eval-state.yaml \
      exit_reason=no_fix ac_pass=false
    BREAK → proceed to Phase B
    # Findings remain in refinement-suggestions.json for human/agent review

  Read ${CLAUDE_SKILL_DIR}/references/phases/eval-fix.md and execute it
  # Applies fixes from refinement-suggestions.json (AC failures + consistency + flagged)

  # Record what was fixed into the iteration log (reads fix-log.json)
  node ${CLAUDE_SKILL_DIR}/scripts/append-iteration-log.js .artifacts/<KEY>/ <iteration> fix

  # ── Rebuild so changes are visible to Playwright ─────────────────
  if NEEDS_REBUILD:
    cd <workspace>
    npm run build
    # Wait for build to complete (webpack production ~15-30s)
    echo "Rebuilt dist after fixes — screenshots will reflect new code"
  else:
    # Dev server with HMR — changes visible after recompile
    sleep 5

  GOTO LOOP

# ═══════════════════════════════════════════════════════════════════
# FINAL-STATE CAPTURE (N+1 pass — only when fix loop actually ran)
# Ensures the report shows post-fix screenshots, not pre-fix evidence
# ═══════════════════════════════════════════════════════════════════

# Only run if the fix loop applied changes (iterations > 1)
if iteration > 1:
  # Archive the current screenshots as the last iteration's evidence
  # (they may be from a selective rerun, not a full re-capture)

  # Re-run eval-journey in screenshot-only mode: full journey set, no verdict changes
  # This captures final-state screenshots that reflect all applied fixes
  Read ${CLAUDE_SKILL_DIR}/references/phases/eval-journey.md and execute in capture-only mode:
    --mode=informed --capture-only --all-journeys
  # This re-walks ALL journeys (not just the re-run set) and captures fresh screenshots
  # to .artifacts/<KEY>/screenshots/ — overwriting the partial captures from fix iterations.
  # Verdict CSV is NOT modified. journey-log.json step screenshots are updated in-place.

  # Ensure the rebuild completed before capturing (static server needs explicit build)
  if NEEDS_REBUILD:
    cd <workspace>
    npm run build
    echo "Final rebuild complete — N+1 screenshots will show post-fix state"
  else:
    sleep 5

# ═══════════════════════════════════════════════════════════════════
# POST-JOURNEY: Visual Consistency Check (deferred from setup)
# Now that screenshots exist, run visual-mode consistency checks.
# ═══════════════════════════════════════════════════════════════════

python3 ${CLAUDE_SKILL_DIR}/scripts/eval_state.py set .artifacts/<KEY>/eval-state.yaml \
  consistency_visual_start=$(python3 ${CLAUDE_SKILL_DIR}/scripts/eval_state.py timestamp)

Read ${CLAUDE_SKILL_DIR}/references/phases/eval-consistency.md and execute it with --mode=visual
# Uses journey screenshots + DOM for visual guideline checks.
# Appends visual findings to consistency-report.json and refinement-suggestions.json.
# These findings are informational for the report — they do NOT re-trigger the fix loop.

python3 ${CLAUDE_SKILL_DIR}/scripts/eval_state.py set .artifacts/<KEY>/eval-state.yaml \
  consistency_visual_end=$(python3 ${CLAUDE_SKILL_DIR}/scripts/eval_state.py timestamp)

# ═══════════════════════════════════════════════════════════════════
# PRE-PHASE-B: Deferred Context Enrichment
# Gather data needed only by Phase B (Outcome, tasks, hints).
# This was deferred from setup to keep Phase A fast.
# ═══════════════════════════════════════════════════════════════════

python3 ${CLAUDE_SKILL_DIR}/scripts/eval_state.py set .artifacts/<KEY>/eval-state.yaml \
  extract_enrichment_start=$(python3 ${CLAUDE_SKILL_DIR}/scripts/eval_state.py timestamp)

Read ${CLAUDE_SKILL_DIR}/references/phases/eval-extract.md and execute it with --phase=enrichment
# Produces: outcome-context.json, tasks_to_be_done, breadcrumb
# Uses Outcome ticket for better persona task generation.
# Falls back to journey titles if Outcome is not discoverable.

python3 ${CLAUDE_SKILL_DIR}/scripts/eval_state.py set .artifacts/<KEY>/eval-state.yaml \
  extract_enrichment_end=$(python3 ${CLAUDE_SKILL_DIR}/scripts/eval_state.py timestamp)

if workspace provided:
  python3 ${CLAUDE_SKILL_DIR}/scripts/eval_state.py set .artifacts/<KEY>/eval-state.yaml \
    hint_start=$(python3 ${CLAUDE_SKILL_DIR}/scripts/eval_state.py timestamp)

  Read ${CLAUDE_SKILL_DIR}/references/phases/eval-hint.md and execute it
  # Reads mr-delta.json, scans workspace source for routes and nav hierarchy.
  # Produces: navigation-hints.json (nav_sections + routes only).
  # Consumed by eval-usability as fallback for stuck-persona navigation.
  # Runs here (post-fix) so hints reflect the final workspace state.

  python3 ${CLAUDE_SKILL_DIR}/scripts/eval_state.py set .artifacts/<KEY>/eval-state.yaml \
    hint_end=$(python3 ${CLAUDE_SKILL_DIR}/scripts/eval_state.py timestamp)

# ═══════════════════════════════════════════════════════════════════
# PHASE B: Discovery Persona Walkthroughs
# Question: "Can real users actually use this?"
# Method: Per-persona Playwright, discovery navigation, think-aloud scoring
# ═══════════════════════════════════════════════════════════════════

python3 ${CLAUDE_SKILL_DIR}/scripts/eval_state.py set .artifacts/<KEY>/eval-state.yaml phase=b

# Phase B always runs at full depth — the prototype is known-good (or best-effort).
# No degraded/inference-only mode. Personas run their own Playwright walkthroughs.
#
# CRITICAL: Phase B REQUIRES separate Playwright browser sessions for each persona.
# The prototype URL must be navigated by each persona independently.
# Phase B is NOT inference-only scoring — it MUST produce new screenshots.
# Do NOT skip the Playwright walkthroughs and score from Phase A evidence alone.

Read ${CLAUDE_SKILL_DIR}/references/phases/eval-usability.md and execute it
# Use Task tool with run_in_background=true for each persona-task pair when possible.
# Produces: per-persona screenshots, think-aloud traces, 7-dimension scores,
#           usability suggestions for human review

# VERIFY: Per-persona screenshots must exist after eval-usability completes.
# Check: ls .artifacts/<KEY>/screenshots/persona-*.png
# If no persona screenshots exist, Phase B did not run correctly.
# Go back and re-run eval-usability — ensure Step 1d actually launches Playwright.

# VALIDATE: Verify persona-results.json has non-empty trace[] arrays.
# If any persona-task entry has empty trace[], the walkthrough failed to write live data.
# In that case, re-run eval-usability for the affected persona (do NOT hydrate post-hoc).
# The hydrate-persona-results.js script is DEPRECATED — trace data must be written during Step 1d.
Read .artifacts/<KEY>/persona-results.json
if any entry has trace == [] (empty array):
  echo "WARNING: persona-results.json has empty trace[] — re-running eval-usability"
  Read ${CLAUDE_SKILL_DIR}/references/phases/eval-usability.md and execute it
  # This should not happen if Step 1d synchronous writing is followed correctly

# Update iteration log with usability results
node ${CLAUDE_SKILL_DIR}/scripts/append-iteration-log.js .artifacts/<KEY>/ <iteration> b

# ═══════════════════════════════════════════════════════════════════
# REPORT (always runs)
# ═══════════════════════════════════════════════════════════════════

REPORT:
Read ${CLAUDE_SKILL_DIR}/references/phases/eval-report.md and execute it with:
  --note="Phase A: <exit_reason> (<iteration> iterations). Phase B: <usability status>"

# ═══════════════════════════════════════════════════════════════════
# NOTIFY (open report + present summary)
# ═══════════════════════════════════════════════════════════════════

python3 ${CLAUDE_SKILL_DIR}/scripts/eval_state.py set .artifacts/<KEY>/eval-state.yaml \
  pipeline_end=$(python3 ${CLAUDE_SKILL_DIR}/scripts/eval_state.py timestamp)

# Open the report for the designer
open .artifacts/<KEY>/evaluation-report.html

# Prototype Bar: ensure Sources (outcome/strat) + views.eval are current
# (also performed inside eval-report.md Step 5)
EXPORT_SKILL="${CLAUDE_SKILL_DIR}/../uxd-prototype-export"
node "${EXPORT_SKILL}/scripts/sync-prototype-bar-config.mjs" --artifacts .artifacts/<KEY>

# Present narrative summary in chat (same model as eval-review)
Read .artifacts/<KEY>/evaluation-report.csv and .artifacts/<KEY>/extract-state.json
Compute pass/fail/flagged counts from CSV
Present:

  Eval complete for <KEY>: <story title>

  **What passed:** <pass>/<total> acceptance criteria. [Usability: <score>/21]
  **What needs attention:** <list failed/flagged items, 1 line each>
  **What to do:** <prioritized actions from refinement-suggestions.json>

  ---
  How can I help?
  • "Fix [issue]" — I'll apply the fix
  • "Tell me more about [finding]"
  • "Re-run eval"
  • "Looks good"

# Rebuild leaderboard with latest data
node ${CLAUDE_SKILL_DIR}/scripts/build-leaderboard.js
```

## Selective Rerun (Phase A Iterations 2+)

On re-iterations, only re-evaluate criteria that FAILED or were FLAGGED:

1. Parse previous `evaluation-report.csv` for FAIL/FLAGGED IDs
2. Pass `--rerun-only=AC-3,AC-5` to eval-journey
3. eval-journey carries forward PASS verdicts and only re-runs the failures
4. Screenshots from PASS journeys are preserved
5. eval-classify is NOT re-run (tiers are structural and don't change between iterations)

This reduces Playwright execution proportionally to passing criteria count.

## Regression Detection

After each Phase A iteration (2+), compare verdicts against the previous CSV:
- If a criterion that was PASS becomes FAIL → **regression**
- Stop immediately, report which criterion regressed and which fix caused it
- The archived CSVs (`evaluation-report-iter-N.csv`) provide the comparison baseline
- Phase B still runs after regression (captures usability of current state)

## iteration-log.json format

```json
{
  "key": "<KEY>",
  "max_iterations": 3,
  "iterations": [
    {
      "iteration": 1,
      "phase": "a",
      "timestamp": "2026-07-01T15:00:00.000Z",
      "pass_count": 4,
      "fail_count": 3,
      "flagged_count": 2,
      "total_criteria": 9,
      "suggestions_generated": 5,
      "consistency_fixes": 2,
      "details": {
        "AC-1": { "verdict": "PASS", "tier": "T1" },
        "AC-2": { "verdict": "FAIL", "tier": "T1" },
        "AC-3": { "verdict": "FLAGGED", "tier": "T3" }
      },
      "journey_coverage": {
        "AC-1": { "journey_id": "journey-1", "journey_title": "...", "verdict": "PASS", "steps_completed": 3 }
      },
      "root_cause": "3 criteria failed: AC-2, AC-4, AC-5",
      "changes_applied": [
        { "criterion": "AC-2", "type": "ac_failure", "file": "src/Component.tsx", "change": "Added missing button" }
      ],
      "files_modified": ["src/Component.tsx"],
      "consistency_summary": { "violations": 0, "warnings": 3, "passes": 5 }
    }
  ],
  "phase_b": {
    "phase": "b",
    "timestamp": "2026-07-01T15:10:00.000Z",
    "usability_score": "15.5/21",
    "personas_evaluated": ["data-scientist+junior", "data-scientist+senior"],
    "dimension_scores": {
      "workflow_continuity": 2.5,
      "system_status": 3
    },
    "persona_summary": [
      { "persona": "data-scientist+junior", "patience_end": 70, "confusion_events": 2, "abandoned": false }
    ]
  },
  "exit_reason": "all_pass",
  "total_criteria_fixed": 3,
  "total_regressions": 0,
  "files_modified": ["src/Component.tsx"]
}
```

## Summary Output

After pipeline completes, print:

```
────────────────────────────────────────
Eval Pipeline: <KEY>
────────────────────────────────────────
Story:       <title>
URL:         <url>

PHASE A — AC Validation:
  Iterations:  <N>
  Exit reason: <reason>
  Iteration 1: <pass>/<total> PASS, <fail> FAIL, <flagged> FLAGGED
  Iteration 2: ...
  Criteria:  <total>
    PASS:    <n>
    FAIL:    <n>
    FLAGGED: <n> (needs human review)

PHASE B — Usability:
  Personas:  <list>
  Score:     <score>/21
  Key finding: <one-liner from highest-impact dimension>

Report: .artifacts/<KEY>/evaluation-report.html
────────────────────────────────────────
```

## Future: Phase B Feedback Loop (NOT YET IMPLEMENTED)

Phase B currently produces usability findings that go into the report but do not trigger fixes. This section documents the planned architecture for a feedback loop.

### Design

After Phase B completes, check whether usability findings are severe enough to warrant another Phase A iteration:

```
Phase B complete → Score check:
  - overall_score >= 14/21 AND no dimension = 0 → REPORT (no feedback)
  - overall_score < 14/21 OR any dimension = 0 → Feed usability suggestions to eval-fix → one more Phase A crank → REPORT
```

### Trigger Conditions

The feedback loop fires when ANY of:
- `overall_score` < 14/21 (below "functional" threshold)
- Any single dimension scores 0 (broken)
- 3+ confusion events across ALL personas combined

### What Gets Fed Back

Only `refinement-suggestions.json` entries of `type: "usability"` with `confidence: "high"` or `"medium"`. Low-confidence usability suggestions remain report-only (human judgment required).

### Constraints

- Max 1 feedback loop (prevents infinite cycling between Phase A and Phase B)
- The feedback Phase A crank does NOT re-run Phase B afterward (would create recursion)
- `--no-outer-loop` flag skips this entirely (for when designers just want the report)
- Feedback fixes are logged separately in fix-log.json as `"source": "phase_b_feedback"`

### What This Enables

Phase B persona walkthroughs currently identify issues like "junior user couldn't find the scheduling column because it requires scrolling right." With the feedback loop, this finding would generate a suggestion like "Add horizontal scroll indicator or move scheduling status column left" that eval-fix can apply, then Phase A re-verifies the fix works.
