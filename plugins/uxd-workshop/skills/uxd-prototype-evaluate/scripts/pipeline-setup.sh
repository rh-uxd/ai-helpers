#!/usr/bin/env bash
# pipeline-setup.sh — Consolidates ~40 individual setup tool calls into one script.
# Handles workspace state capture, node_modules symlink, Playwright check,
# server type detection, eval-state init, and screenshots dir creation.
#
# Usage: bash ${CLAUDE_SKILL_DIR}/scripts/pipeline-setup.sh <KEY> <URL> <WORKSPACE> <MAX_ITERATIONS> [--reset]
#
# Outputs: sets up eval-state.yaml and prints env vars for the orchestrator to capture.

set -euo pipefail

KEY="${1:?Usage: pipeline-setup.sh <KEY> <URL> <WORKSPACE> <MAX_ITERATIONS> [--reset]}"
URL="${2:?}"
WORKSPACE="${3:-}"
MAX_ITERATIONS="${4:-3}"
RESET="${5:-}"

EVAL_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
ARTIFACTS=".artifacts/${KEY}"

# ── Artifacts directory ────────────────────────────────────────────────
mkdir -p "${ARTIFACTS}/screenshots"

# ── Eval state init ────────────────────────────────────────────────────
TIMESTAMP=$(python3 "${EVAL_ROOT}/scripts/eval_state.py" timestamp)
python3 "${EVAL_ROOT}/scripts/eval_state.py" init "${ARTIFACTS}/eval-state.yaml" \
  iteration=0 max_iterations="${MAX_ITERATIONS}" exit_reason=pending \
  phase=a ac_pass=false key="${KEY}" url="${URL}" workspace="${WORKSPACE}" \
  pipeline_start="${TIMESTAMP}"

# ── Workspace state capture ───────────────────────────────────────────
if [ -n "${WORKSPACE}" ] && [ -d "${WORKSPACE}" ]; then
  cd "${WORKSPACE}"

  WORKSPACE_COMMIT=$(git log -1 --format="%h" 2>/dev/null || echo "unknown")
  WORKSPACE_MSG=$(git log -1 --format="%s" 2>/dev/null || echo "")
  WORKSPACE_DIRTY=$(git status --short 2>/dev/null | wc -l | tr -d ' ')

  if [ "${RESET}" = "--reset" ]; then
    git fetch origin 2>/dev/null || true
    BRANCH=$(git branch --show-current)
    git reset --hard "origin/${BRANCH}"
    echo "Workspace reset to origin/${BRANCH}"
    WORKSPACE_COMMIT=$(git log -1 --format="%h")
    WORKSPACE_DIRTY=0
  fi

  python3 "${EVAL_ROOT}/scripts/eval_state.py" set "${ARTIFACTS}/eval-state.yaml" \
    workspace_commit="${WORKSPACE_COMMIT}" workspace_dirty="${WORKSPACE_DIRTY}"

  echo "Workspace: ${WORKSPACE_COMMIT} (${WORKSPACE_MSG}) dirty=${WORKSPACE_DIRTY}"

  # ── Server type detection ────────────────────────────────────────────
  PORT=$(echo "${URL}" | grep -oE ':[0-9]+' | head -1 | tr -d ':')
  if [ -n "${PORT}" ]; then
    SERVER_PID=$(lsof -ti:"${PORT}" 2>/dev/null | head -1 || echo "")
    SERVER_CMD=$([ -n "${SERVER_PID}" ] && ps -p "${SERVER_PID}" -o command= 2>/dev/null || echo "")

    if echo "${SERVER_CMD}" | grep -qE "sirv|serve|http-server" || [ -z "${SERVER_CMD}" ]; then
      echo "NEEDS_REBUILD=true"
    else
      echo "NEEDS_REBUILD=false"
    fi
  fi

  cd - > /dev/null
fi

# ── Node_modules symlink ──────────────────────────────────────────────
PROJECT_ROOT="$(git rev-parse --show-toplevel 2>/dev/null || pwd)"
if [ ! -e "${PROJECT_ROOT}/node_modules" ]; then
  ln -s "${CLAUDE_SKILL_DIR}/node_modules" "${PROJECT_ROOT}/node_modules"
  echo "Recreated node_modules symlink"
fi

# ── Playwright check ──────────────────────────────────────────────────
if ! npx playwright --version > /dev/null 2>&1; then
  cd "${EVAL_ROOT}"
  npm install
  npx playwright install chromium
  cd - > /dev/null
  echo "Playwright installed"
else
  echo "Playwright ready"
fi

echo "Setup complete for ${KEY}"
