# Orchestration Logic

Read and follow this file when running the full evaluate pipeline. Phase procedures live in `references/phases/` — execute each when the orchestrator reaches that step.

## Model Defaults Per Phase

Each phase delegates to `--model` when launched via Task tool. These defaults
are derived from MLflow comparison runs (2026-07-22, 24 traces).
See `references/mlflow-conventions.md` for experiment naming and tagging standards.

| Phase | Default model | Rationale |
|-------|--------------|-----------|
| eval-extract | `claude-sonnet-5` | Mechanical Jira parsing. No quality difference vs Opus. 3× faster. |
| eval-classify | `claude-sonnet-5` | Mechanical tier assignment. 34s vs 93s. No quality difference. |
| eval-journey | `claude-opus-4-6` | Playwright script generation + verdict assignment require careful reasoning. |
| eval-fix | `claude-opus-4-6` | Code changes require careful reasoning. Shares journey's context window. |
| eval-usability | `claude-opus-4-6` | Fewer turns = fewer Playwright flakes. Persona simulation needs nuance. |
| eval-consistency | `claude-opus-4-6` | Focused execution (7 turns vs 23). Precision matters for design audits. |
| eval-report | `claude-sonnet-5` | Template rendering. No quality-sensitive judgment. |

When `--model` is set, ALL phases use that model (useful for comparison runs).

**Artifact paths:** Pin `UXD_PROJECT_ROOT`, `KEY_DIR`, and absolute `ARTIFACTS_DIR` first (see SKILL.md "Artifact location"). All eval writes use `${ARTIFACTS_DIR}` (absolute = `.artifacts/<KEY>/eval`). Never write under `${CLAUDE_SKILL_DIR}`. After any `cd` (skill install or `.artifacts/<KEY>/code` clone), keep using the absolute `ARTIFACTS_DIR`.

**Source access (hybrid mode):** When a remote prototype has an MR link, `pipeline-setup.sh` clones the source into `.artifacts/<KEY>/code/` and sets `source_available=true` + `source_dir` in eval-state.yaml. This gives Phase A and Phase B access to router configs and component files without building or serving the clone locally. The remote URL is still used for Playwright navigation.

```
iteration = 0
max_iterations = parse --max-iterations (default: 3)
no_fix = parse --no-fix (default: false)
no_report = parse --no-report (default: false)

# ── Preflight check (fail-fast before any work) ───────────────────────
bash ${CLAUDE_SKILL_DIR}/scripts/preflight-check.sh
# Exits non-zero if required prerequisites are missing.

# ── Pipeline setup (path pinning, eval-state init, workspace capture) ──
bash ${CLAUDE_SKILL_DIR}/scripts/pipeline-setup.sh <KEY> <URL> <workspace> $max_iterations "" <MR_URL>
# Sets UXD_PROJECT_ROOT, KEY_DIR, ARTIFACTS_DIR, inits eval-state.yaml
# Also resolves the prototype URL (probes remote, falls back to local sirv with SPA detection).
# Writes resolved URL to eval-state.yaml as `prototype_url`.
# When MR_URL is provided and prototype is remote: clones source into .artifacts/<KEY>/code/
# and sets source_available=true, source_dir in eval-state.yaml (hybrid mode).
export UXD_PROJECT_ROOT="$(node -e "console.log(require('${CLAUDE_SKILL_DIR}/scripts/resolve-root').resolveProjectRoot())" 2>/dev/null || git rev-parse --show-toplevel 2>/dev/null || pwd)"
KEY_DIR="${UXD_PROJECT_ROOT}/.artifacts/<KEY>"
ARTIFACTS_DIR="${KEY_DIR}/eval"

# ── Read source access state (hybrid mode) ───────────────────────────
SOURCE_AVAILABLE=$(python3 ${CLAUDE_SKILL_DIR}/scripts/eval_state.py get ${ARTIFACTS_DIR}/eval-state.yaml source_available)
SOURCE_DIR=$(python3 ${CLAUDE_SKILL_DIR}/scripts/eval_state.py get ${ARTIFACTS_DIR}/eval-state.yaml source_dir)

# ── Remote-only advisory (BLOCKING) ──────────────────────────────────
# If no source access at all (no workspace, no MR clone), warn the user
# and wait for confirmation before proceeding with degraded evaluation.
if SOURCE_AVAILABLE == "false":
  if no MR_URL was provided:
    WARN the user:
      "No source code path or MR link provided. Without source access:
       - No fix loop (can't patch code)
       - No source-mode consistency checks
       - No component-map for data-testid selectors
       - Heuristic click-through navigation only
       Provide --workspace or an MR URL for the full evaluation.
       Proceed with remote-only? [y/N]"
    WAIT for user confirmation before continuing.

# ── Read resolved prototype URL from eval-state ──────────────────────
# pipeline-setup.sh called resolve-prototype-url.sh which:
#   1. Probes the user-provided URL (curl --max-time 10)
#   2. If reachable: uses it directly (prototype_source_type=remote)
#   3. If unreachable + workspace has dist/: serves locally with sirv
#      - SPA detected (React/Angular): sirv --single (routes fall back to index.html)
#      - Static site: sirv without --single
#   4. Writes server PID to ${ARTIFACTS_DIR}/server.pid for cleanup
#
# PROTOTYPE_URL may differ from the user-provided URL when fallback activates.
# Generated Playwright scripts use this resolved URL (via process.env.PROTOTYPE_URL).
PROTOTYPE_URL=$(python3 ${CLAUDE_SKILL_DIR}/scripts/eval_state.py get ${ARTIFACTS_DIR}/eval-state.yaml prototype_url)
export PROTOTYPE_URL

# ── Fresh flag handling (not covered by pipeline-setup.sh) ─────────
# --fresh deletes ONLY this KEY's eval/ dir (absolute path).
# Never: rm -rf .artifacts/<KEY>/  (wipes create artifacts)
# Never: rm -rf .artifacts/eval/   (wipes cross-key run log / leaderboard)
if --fresh:
  rm -rf "${ARTIFACTS_DIR}"
  mkdir -p "${ARTIFACTS_DIR}/scripts" "${ARTIFACTS_DIR}/screenshots"
  echo "Cleared ${ARTIFACTS_DIR} (--fresh)"

# ── Auto-clear iteration-specific artifacts on non-fresh re-runs ──────
if ! --fresh:
  rm -f "${ARTIFACTS_DIR}/component-map.json" \
       "${ARTIFACTS_DIR}/fix-log.json" \
       "${ARTIFACTS_DIR}/refinement-suggestions.json" \
       "${ARTIFACTS_DIR}/tier-overrides.json" \
       "${ARTIFACTS_DIR}/navigation-hints.json" \
       "${ARTIFACTS_DIR}/iteration-log.json"
  echo "Cleared iteration-specific artifacts for clean re-run"

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
  # Use absolute paths — nested clone has its own .git and must not become PROJECT_ROOT
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

  # Return to project root before any artifact writes (nested git must not confuse tools)
  cd "${UXD_PROJECT_ROOT}"

  # Log workspace state to eval-state.yaml for the report
  python3 ${CLAUDE_SKILL_DIR}/scripts/eval_state.py set ${ARTIFACTS_DIR}/eval-state.yaml \
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

python3 ${CLAUDE_SKILL_DIR}/scripts/eval_state.py set ${ARTIFACTS_DIR}/eval-state.yaml \
  extract_core_start=$(python3 ${CLAUDE_SKILL_DIR}/scripts/eval_state.py timestamp)

Read ${CLAUDE_SKILL_DIR}/references/phases/eval-extract.md and execute it with --phase=core
# Produces: extract-state.json, mr-delta.json
# Defers: outcome-context.json, tasks_to_be_done, breadcrumb (run before Phase B)

python3 ${CLAUDE_SKILL_DIR}/scripts/eval_state.py set ${ARTIFACTS_DIR}/eval-state.yaml \
  extract_core_end=$(python3 ${CLAUDE_SKILL_DIR}/scripts/eval_state.py timestamp) \
  consistency_source_start=$(python3 ${CLAUDE_SKILL_DIR}/scripts/eval_state.py timestamp)

# ── Pre-flight: verify consistency guidelines exist ────────────────
GUIDELINE_COUNT=$(ls "${UXD_PROJECT_ROOT}/.context/consistency-checker/guidelines/"*.md 2>/dev/null | wc -l)
if [ "$GUIDELINE_COUNT" -eq 0 ]; then
  echo "WARNING: No consistency guidelines found. Attempting re-bootstrap..."
  bash "${CLAUDE_SKILL_DIR}/scripts/bootstrap-consistency-checker.sh"
  GUIDELINE_COUNT=$(ls "${UXD_PROJECT_ROOT}/.context/consistency-checker/guidelines/"*.md 2>/dev/null | wc -l)
fi
echo "Consistency guidelines available: ${GUIDELINE_COUNT} files"

Read ${CLAUDE_SKILL_DIR}/references/phases/eval-consistency.md and execute it with --mode=source
# Runs ONCE (source-mode only). Produces: consistency-report.json, appends to refinement-suggestions.json
# Visual-mode deferred to after eval-journey when screenshots exist.
# Uses analyze.py bash commands for deterministic checks (no report generation).

python3 ${CLAUDE_SKILL_DIR}/scripts/eval_state.py set ${ARTIFACTS_DIR}/eval-state.yaml \
  consistency_source_end=$(python3 ${CLAUDE_SKILL_DIR}/scripts/eval_state.py timestamp)

# ── AC Fix Loop ────────────────────────────────────────────────────

LOOP:
  iteration += 1
  python3 ${CLAUDE_SKILL_DIR}/scripts/eval_state.py set ${ARTIFACTS_DIR}/eval-state.yaml iteration=$iteration

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
  node ${CLAUDE_SKILL_DIR}/scripts/validate-verdicts.js ${ARTIFACTS_DIR}/
  # If violations found (exit 1): fix CSV verdicts to FLAGGED for contradicted ACs before continuing.
  # A journey FAIL + CSV PASS is never acceptable unless journey-log is corrected with visual evidence.

  # ── Compute counts FROM the CSV (source of truth) ──────────────
  Read ${ARTIFACTS_DIR}/evaluation-report.csv Section 1 (ACCEPTANCE CRITERIA)
  Parse using proper CSV quoting (fields may contain commas):
    pass_count = count rows where verdict column == "PASS"
    fail_count = count rows where verdict column == "FAIL"
    flagged_count = count rows where verdict column == "FLAGGED"

  NEVER manually estimate these counts. Always compute from the CSV file.

  # ── Write iteration entry to iteration-log.json ────────────────
  # Use the append-iteration-log.js script for rich, consistent entries:
  node ${CLAUDE_SKILL_DIR}/scripts/append-iteration-log.js ${ARTIFACTS_DIR}/ <iteration> a

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
  Read ${ARTIFACTS_DIR}/iteration-log.json for pass_count, fail_count from the last entry

  # ── Exit condition checks ──────────────────────────────────────
  if fail_count == 0 AND flagged_count == 0:
    Set exit_reason = "all_pass"
    python3 ${CLAUDE_SKILL_DIR}/scripts/eval_state.py set ${ARTIFACTS_DIR}/eval-state.yaml \
      exit_reason=all_pass ac_pass=true
    BREAK → proceed to Phase B

  if fail_count == 0 AND flagged_count > 0:
    # FLAGGED items may be fixable (e.g., wrong interaction pattern, missing mock state)
    # Attempt fix loop on FLAGGED suggestions. If eval-fix produces no changes, exit.
    if iteration > 1:
      # Check if fix-log.json from last iteration had zero applied fixes for FLAGGED items
      Read ${ARTIFACTS_DIR}/fix-log.json
      if fix-log shows 0 applied fixes (all skipped/deferred):
        Set exit_reason = "flagged_unfixable"
        python3 ${CLAUDE_SKILL_DIR}/scripts/eval_state.py set ${ARTIFACTS_DIR}/eval-state.yaml \
          exit_reason=flagged_unfixable ac_pass=true
        BREAK → proceed to Phase B (FLAGGED items need human review)
    # Otherwise continue to fix loop — eval-fix will attempt FLAGGED suggestions

  if iteration > 1:
    Compare current CSV verdicts against previous iteration in iteration-log.json
    if any criterion flipped PASS → FAIL:
      Set exit_reason = "regression"
      python3 ${CLAUDE_SKILL_DIR}/scripts/eval_state.py set ${ARTIFACTS_DIR}/eval-state.yaml \
        exit_reason=regression ac_pass=false
      BREAK → proceed to Phase B (on current prototype state)

  if iteration >= max_iterations:
    Set exit_reason = "max_iterations"
    python3 ${CLAUDE_SKILL_DIR}/scripts/eval_state.py set ${ARTIFACTS_DIR}/eval-state.yaml \
      exit_reason=max_iterations ac_pass=false
    BREAK → proceed to Phase B (even with remaining FAILs)

  if --no-iterate:
    Set exit_reason = "no_iterate"
    python3 ${CLAUDE_SKILL_DIR}/scripts/eval_state.py set ${ARTIFACTS_DIR}/eval-state.yaml \
      exit_reason=no_iterate ac_pass=false
    BREAK → proceed to Phase B

  # ── Fix ────────────────────────────────────────────────────────
  if no_fix:
    Set exit_reason = "no_fix"
    python3 ${CLAUDE_SKILL_DIR}/scripts/eval_state.py set ${ARTIFACTS_DIR}/eval-state.yaml \
      exit_reason=no_fix ac_pass=false
    BREAK → proceed to Phase B
    # Findings remain in refinement-suggestions.json for human/agent review

  Read ${CLAUDE_SKILL_DIR}/references/phases/eval-fix.md and execute it
  # Applies fixes from refinement-suggestions.json (AC failures + consistency + flagged)

  # Record what was fixed into the iteration log (reads fix-log.json)
  node ${CLAUDE_SKILL_DIR}/scripts/append-iteration-log.js ${ARTIFACTS_DIR}/ <iteration> fix

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

# ── Loop integrity check ──────────────────────────────────────────
# Catches the case where fixes were applied but never re-verified
if iteration == 1:
  Read ${ARTIFACTS_DIR}/fix-log.json
  if fix-log has applied entries (applied == true):
    echo "WARNING: Fixes were applied in iteration 1 but never re-verified."
    echo "Setting exit_reason to 'fix_not_reverified' for accurate reporting."
    python3 ${CLAUDE_SKILL_DIR}/scripts/eval_state.py set ${ARTIFACTS_DIR}/eval-state.yaml \
      exit_reason=fix_not_reverified

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
  # to ${ARTIFACTS_DIR}/screenshots/ — overwriting the partial captures from fix iterations.
  # Verdict CSV is NOT modified. journey-log.json step screenshots are updated in-place.

  # Ensure the rebuild completed before capturing (static server needs explicit build)
  if NEEDS_REBUILD:
    cd <workspace>
    npm run build
    echo "Final rebuild complete — N+1 screenshots will show post-fix state"
  else:
    sleep 5

# ═══════════════════════════════════════════════════════════════════
# PRE-PHASE-B: Deferred Context (PARALLEL)
# Three independent skills run in parallel — none depends on
# another's output. All three feed Phase B or the report.
# ═══════════════════════════════════════════════════════════════════

python3 ${CLAUDE_SKILL_DIR}/scripts/eval_state.py set ${ARTIFACTS_DIR}/eval-state.yaml \
  bridge_start=$(python3 ${CLAUDE_SKILL_DIR}/scripts/eval_state.py timestamp)

# Launch all three in parallel using Task tool with run_in_background=true:
#
# TASK 1: eval-consistency --mode=visual
#   Uses journey screenshots for visual guideline checks.
#   Appends visual findings to consistency-report.json.
#   Informational for report — does NOT re-trigger fix loop.
#   ERROR HANDLING: If fails, consistency-report.json keeps visual_mode.ran=false. Non-blocking.
#
# TASK 2: eval-extract --phase=enrichment
#   Produces: outcome-context.json, tasks_to_be_done, breadcrumb.
#   Uses cached raw_parent and raw_issuelinks from extract-state.json (saved during core phase).
#   ERROR HANDLING: If Outcome not found, falls back to deriving tasks from journey titles.
#
# TASK 3: eval-hint (if workspace provided OR source_available=true)
#   Produces: navigation-hints.json (nav_sections + routes only).
#   Consumed by eval-usability as fallback for stuck-persona navigation.
#   Runs post-fix so hints reflect final workspace/source state.
#   In hybrid mode (remote + MR clone), reads routes from the clone in source_dir.
#   ERROR HANDLING: If fails, eval-usability runs without hints (discovery only, no fallback).

# Wait for all three to complete before proceeding to Phase B.

python3 ${CLAUDE_SKILL_DIR}/scripts/eval_state.py set ${ARTIFACTS_DIR}/eval-state.yaml \
  bridge_end=$(python3 ${CLAUDE_SKILL_DIR}/scripts/eval_state.py timestamp)

# ═══════════════════════════════════════════════════════════════════
# PHASE B: Discovery Persona Walkthroughs
# Question: "Can real users actually use this?"
# Method: Per-persona Playwright, discovery navigation, think-aloud scoring
# ═══════════════════════════════════════════════════════════════════

python3 ${CLAUDE_SKILL_DIR}/scripts/eval_state.py set ${ARTIFACTS_DIR}/eval-state.yaml phase=b

# Phase B always runs at full depth — the prototype is known-good (or best-effort).
# No degraded/inference-only mode. Personas run their own Playwright walkthroughs.
#
# CRITICAL: Phase B REQUIRES separate Playwright browser sessions for each persona.
# The prototype URL must be navigated by each persona independently.
# Phase B is NOT inference-only scoring — it MUST produce new screenshots.
# Do NOT skip the Playwright walkthroughs and score from Phase A evidence alone.
#
# Excuse: "Phase A already proved features work"
# Rebuttal: Phase A proves features EXIST. Phase B proves users can FIND them.
#           A passing AC with 0% discoverability is a shipped feature nobody uses.

# When --no-report is set, pass --screenshots=key-only to eval-usability.
# This captures 1 screenshot per persona-task (final state) instead of per-step,
# reducing from ~30 to 6 screenshots and cutting Playwright time + tokens.
if --no-report:
  Read ${CLAUDE_SKILL_DIR}/references/phases/eval-usability.md and execute it with --screenshots=key-only
else:
  Read ${CLAUDE_SKILL_DIR}/references/phases/eval-usability.md and execute it
# Use Task tool with run_in_background=true for each persona-task pair when possible.
# Produces: per-persona screenshots, think-aloud traces, 7-dimension scores,
#           usability suggestions for human review

# VERIFY: At least 2 personas must have been evaluated.
# Check: node -e "const pr=require('${ARTIFACTS_DIR}/persona-results.json'); const ids=new Set(pr.map(r=>r.persona)); if(ids.size<2) { console.error('FATAL: Only '+ids.size+' persona(s) evaluated — minimum is 2'); process.exit(1); }"
#
# VERIFY: Per-persona screenshots must exist after eval-usability completes.
# Check: ls ${ARTIFACTS_DIR}/screenshots/persona-*.png
# If no persona screenshots exist, Phase B did not run correctly.
# Go back and re-run eval-usability — ensure Step 1d actually launches Playwright.

# VALIDATE: Verify persona-results.json has non-empty trace[] arrays.
# If any persona-task entry has empty trace[], the walkthrough failed to write live data.
# In that case, re-run eval-usability for the affected persona (do NOT hydrate post-hoc).
# The hydrate-persona-results.js script is DEPRECATED — trace data must be written during Step 1d.
Read ${ARTIFACTS_DIR}/persona-results.json
if any entry has trace == [] (empty array):
  echo "WARNING: persona-results.json has empty trace[] — re-running eval-usability"
  Read ${CLAUDE_SKILL_DIR}/references/phases/eval-usability.md and execute it

# ── Verify Step 8 completion (usability_dimensions in journey-log) ──
# persona-results.json existing WITHOUT usability_dimensions in journey-log
# means Step 8 was skipped. This breaks the report, MLflow scorers
# (see references/mlflow-conventions.md), and leaderboard.
Read ${ARTIFACTS_DIR}/journey-log.json
if "usability_dimensions" not in journey-log.json AND ${ARTIFACTS_DIR}/persona-results.json exists:
  echo "Step 8 missing — consolidating persona results into journey-log.json"
  Read ${CLAUDE_SKILL_DIR}/references/phases/eval-usability.md Step 8 and execute ONLY Step 8

python3 ${CLAUDE_SKILL_DIR}/scripts/eval_state.py set ${ARTIFACTS_DIR}/eval-state.yaml \
  discover_end=$(python3 ${CLAUDE_SKILL_DIR}/scripts/eval_state.py timestamp)

# ── SCHEMA VALIDATION (self-healing) ──────────────────────────────────────────
# Validates usability_dimensions uses the correct nested schema (not flat dict).
# If the schema is wrong, it auto-fixes from persona-results.json.
node ${CLAUDE_SKILL_DIR}/scripts/validate-phase-b-output.js ${ARTIFACTS_DIR}/

# Update iteration log with usability results
node ${CLAUDE_SKILL_DIR}/scripts/append-iteration-log.js ${ARTIFACTS_DIR}/ <iteration> b

# ── Propagate exit_reason to iteration-log.json ────────────────────
python3 ${CLAUDE_SKILL_DIR}/scripts/propagate-exit-reason.py ${ARTIFACTS_DIR}/

# ═══════════════════════════════════════════════════════════════════
# ARTIFACT READINESS GATE (prevents race condition with report)
# ═══════════════════════════════════════════════════════════════════

python3 ${CLAUDE_SKILL_DIR}/scripts/artifact-readiness-gate.py ${ARTIFACTS_DIR}/

# ═══════════════════════════════════════════════════════════════════
# SCHEMA VALIDATION (catches drift before report renders broken output)
# ═══════════════════════════════════════════════════════════════════

node ${CLAUDE_SKILL_DIR}/scripts/validate-artifact-schemas.js ${ARTIFACTS_DIR}/
# If failures: fix the artifacts in-place then re-run the validator to confirm.

# ═══════════════════════════════════════════════════════════════════
# REPORT (runs unless --no-report is set)
# ═══════════════════════════════════════════════════════════════════

REPORT:
if --no-report:
  # Skip heavy report generation — print brief chat summary instead.
  # Use eval-report later to create the full report from cached artifacts.
  echo "Pipeline complete. Artifacts saved to ${ARTIFACTS_DIR}/"
  echo "Run eval-report to generate the full HTML report."

  # Mini-report (compact chat summary):
  node ${CLAUDE_SKILL_DIR}/scripts/render-mini-report.js ${ARTIFACTS_DIR}/

else:
  Read ${CLAUDE_SKILL_DIR}/references/phases/eval-report.md and execute it with:
    --note="Phase A: <exit_reason> (<iteration> iterations). Phase B: <usability status>"

# ═══════════════════════════════════════════════════════════════════
# MLFLOW LOGGING (opt-in)
# ═══════════════════════════════════════════════════════════════════
# Read and follow references/mlflow-logging.md for the full procedure.
# Skipped automatically when no tracking URI is configured.

# ═══════════════════════════════════════════════════════════════════
# NOTIFY (open report + present summary)
# ═══════════════════════════════════════════════════════════════════

python3 ${CLAUDE_SKILL_DIR}/scripts/eval_state.py set ${ARTIFACTS_DIR}/eval-state.yaml \
  pipeline_end=$(python3 ${CLAUDE_SKILL_DIR}/scripts/eval_state.py timestamp)

# ── Server cleanup (kill local sirv if we started one) ────────────────
if [ -f "${ARTIFACTS_DIR}/server.pid" ]; then
  SERVER_PID=$(cat "${ARTIFACTS_DIR}/server.pid")
  if [ -n "${SERVER_PID}" ] && kill -0 "${SERVER_PID}" 2>/dev/null; then
    kill "${SERVER_PID}" 2>/dev/null || true
    echo "Stopped local prototype server (PID ${SERVER_PID})"
  fi
  rm -f "${ARTIFACTS_DIR}/server.pid"
fi

# Open the report for the designer
open ${ARTIFACTS_DIR}/evaluation-report.html

# Prototype Bar: ensure Sources (outcome/strat) + views.eval are current
# (also performed inside eval-report.md Step 5)
# Sync against KEY_DIR (prototype-bar.json lives at key root, not under eval/)
EXPORT_SKILL="${CLAUDE_SKILL_DIR}/../uxd-prototype-export"
node "${EXPORT_SKILL}/scripts/sync-prototype-bar-config.mjs" --artifacts ${KEY_DIR}

# Present narrative summary in chat (same model as eval-review)
Read ${ARTIFACTS_DIR}/evaluation-report.csv and ${ARTIFACTS_DIR}/extract-state.json
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

  📄 Report: `${ARTIFACTS_DIR}/evaluation-report.html`

  **Next steps:**
  • Ready to submit? → `/uxd-prototype-publish`
  • Need major changes? → `/uxd-prototype-create` with this eval as input
  • Re-run after changes? → `/uxd-prototype-evaluate <KEY> <URL>`

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

After each Phase A iteration (2+), compare verdicts against the previous iteration:
- If a criterion that was PASS becomes FAIL → **regression**
- Stop immediately, report which criterion regressed and which fix caused it
- The `iteration-log.json` provides the comparison baseline
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

Report: ${ARTIFACTS_DIR}/evaluation-report.html
────────────────────────────────────────
```

<!-- DRAFT — not implemented. Do not execute.

## Future: Phase B Feedback Loop

Phase B currently produces usability findings that go into the report but do not trigger fixes.
This section documents the planned architecture for a feedback loop where severe usability
findings (overall_score < 14/21 or any dimension = 0) would feed back into eval-fix for
one additional Phase A crank. See the git history for full design details.

-->

## Error Handling

- **Prototype URL unreachable:** Wait 10s, retry once. If still down, stop with error.
- **eval-fix produces no changes:** Stop Phase A — more iterations won't help. Proceed to Phase B.
- **Dev server crashes after fix:** Stop Phase A, note which files may have caused it. Proceed to Phase B.
- **Missing .context/ directories (VPN unreachable at bootstrap):** Phase A runs in degraded mode (pf-css-token-check fallback if available). Phase B runs using the bundled plugin persona catalog with reduced behavioral fidelity. Re-run bootstrap scripts when VPN reconnects.
