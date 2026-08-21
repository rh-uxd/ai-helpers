#!/usr/bin/env bash
# Unified Prototype Bar install: sync config + install assets + deploy eval report.
#
# Combines sync-prototype-bar-config.mjs (generates prototype-bar.json from
# metadata/scenarios) with install-prototype-bar.sh (copies assets, mounts
# component or injects into HTML). Also copies the eval report into the
# workspace's public/ directory so GitLab Pages can serve it at /evals/{ID}/.
#
# Usage:
#   bash install-and-sync-prototype-bar.sh \
#     --artifacts ".artifacts/{ID}" \
#     --source "<workspace-or-prototype-dir>" \
#     [--mode standalone|workspace] \
#     [--prototype-url URL] \
#     [--jira-base URL] \
#     [--no-eval-copy]
#
# The script:
#   1. Runs sync-prototype-bar-config.mjs to generate/refresh prototype-bar.json
#   2. Runs install-prototype-bar.sh to copy assets and mount the bar
#   3. Copies eval report to public/evals/{ID}/ for Pages (if report exists)
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

ARTIFACTS=""
SOURCE=""
MODE=""
PROTOTYPE_URL=""
JIRA_BASE=""
NO_EVAL_COPY=false

while [[ $# -gt 0 ]]; do
  case "$1" in
    --artifacts) ARTIFACTS="${2:-}"; shift 2 ;;
    --source) SOURCE="${2:-}"; shift 2 ;;
    --mode) MODE="${2:-}"; shift 2 ;;
    --prototype-url) PROTOTYPE_URL="${2:-}"; shift 2 ;;
    --jira-base) JIRA_BASE="${2:-}"; shift 2 ;;
    --no-eval-copy) NO_EVAL_COPY=true; shift ;;
    -h|--help)
      echo "Usage: bash install-and-sync-prototype-bar.sh --artifacts <dir> --source <dir> [--mode standalone|workspace] [--prototype-url URL] [--jira-base URL] [--no-eval-copy]"
      exit 0
      ;;
    *)
      echo "Unknown arg: $1" >&2
      exit 1
      ;;
  esac
done

if [[ -z "$ARTIFACTS" ]]; then
  echo "Error: --artifacts is required (e.g. .artifacts/PROJ-298)" >&2
  exit 1
fi

if [[ -z "$SOURCE" ]]; then
  echo "Error: --source is required (workspace root or prototype dir)" >&2
  exit 1
fi

# ── Step 1: Sync config ──────────────────────────────────────────────────────
echo "── Step 1: Syncing prototype-bar.json from metadata..."

SYNC_ARGS=("--artifacts" "$ARTIFACTS")
if [[ -n "$PROTOTYPE_URL" ]]; then
  SYNC_ARGS+=("--prototype-url" "$PROTOTYPE_URL")
fi
if [[ -n "$JIRA_BASE" ]]; then
  SYNC_ARGS+=("--jira-base" "$JIRA_BASE")
fi

node "$SCRIPT_DIR/sync-prototype-bar-config.mjs" "${SYNC_ARGS[@]}"

CONFIG="$ARTIFACTS/prototype-bar.json"
if [[ ! -f "$CONFIG" ]]; then
  echo "Error: sync did not produce $CONFIG" >&2
  exit 1
fi

# ── Step 2: Install assets ───────────────────────────────────────────────────
echo ""
echo "── Step 2: Installing Prototype Bar assets..."

INSTALL_ARGS=("--source" "$SOURCE" "--config" "$CONFIG")
if [[ -n "$MODE" ]]; then
  INSTALL_ARGS+=("--mode" "$MODE")
fi

bash "$SCRIPT_DIR/install-prototype-bar.sh" "${INSTALL_ARGS[@]}"

# ── Step 3: Copy eval report for Pages ───────────────────────────────────────
if [[ "$NO_EVAL_COPY" == "true" ]]; then
  echo ""
  echo "── Step 3: Eval copy skipped (--no-eval-copy)."
else
  # Resolve pages-root: prefer public/ in workspace, fall back to dist/
  PAGES_ROOT=""
  if [[ -d "$SOURCE/public" ]]; then
    PAGES_ROOT="$SOURCE/public"
  elif [[ -d "$SOURCE/dist" ]]; then
    PAGES_ROOT="$SOURCE/dist"
  fi

  # Check if an eval report exists
  EVAL_REPORT=""
  if [[ -f "$ARTIFACTS/eval/evaluation-report.html" ]]; then
    EVAL_REPORT="$ARTIFACTS/eval/evaluation-report.html"
  elif [[ -f "$ARTIFACTS/evaluation-report.html" ]]; then
    EVAL_REPORT="$ARTIFACTS/evaluation-report.html"
  fi

  if [[ -n "$EVAL_REPORT" && -n "$PAGES_ROOT" ]]; then
    echo ""
    echo "── Step 3: Copying eval report for Pages..."
    bash "$SCRIPT_DIR/copy-eval-for-pages.sh" \
      --artifacts "$ARTIFACTS" \
      --pages-root "$PAGES_ROOT" \
      --evals-dir evals
  elif [[ -n "$EVAL_REPORT" && -z "$PAGES_ROOT" ]]; then
    echo ""
    echo "── Step 3: Eval report found but no public/ or dist/ in source — skipping Pages copy."
    echo "   Run copy-eval-for-pages.sh manually after build if needed."
  else
    echo ""
    echo "── Step 3: No eval report found yet — skipping. Re-run after evaluate to deploy."
  fi
fi

echo ""
echo "── Done. Prototype Bar synced and installed."
