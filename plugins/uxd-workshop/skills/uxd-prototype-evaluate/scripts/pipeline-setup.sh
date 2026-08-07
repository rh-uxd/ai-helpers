#!/usr/bin/env bash
# pipeline-setup.sh — Consolidates ~40 individual setup tool calls into one script.
# Handles workspace state capture, prototype URL resolution, Playwright check,
# server type detection, eval-state init, and screenshots dir creation.
#
# Usage: bash ${CLAUDE_SKILL_DIR}/scripts/pipeline-setup.sh <KEY> <URL> <WORKSPACE> <MAX_ITERATIONS> [--reset] [<MR_URL>]
#
# When MR_URL is provided and the prototype is remote, clones the MR source
# into .artifacts/<KEY>/code/ for route/component discovery (hybrid mode).
# The remote URL is still used for Playwright — the clone is read-only context.
#
# Outputs: sets up eval-state.yaml and prints env vars for the orchestrator to capture.

set -euo pipefail

KEY="${1:?Usage: pipeline-setup.sh <KEY> <URL> <WORKSPACE> <MAX_ITERATIONS> [--reset] [<MR_URL>]}"
URL="${2:?}"
WORKSPACE="${3:-}"
MAX_ITERATIONS="${4:-3}"
RESET="${5:-}"
MR_URL="${6:-}"

EVAL_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
PROJECT_ROOT="$(git rev-parse --show-toplevel 2>/dev/null || pwd)"
export UXD_PROJECT_ROOT="${PROJECT_ROOT}"
ARTIFACTS="${PROJECT_ROOT}/.artifacts/${KEY}/eval"

# ── Artifacts directory ────────────────────────────────────────────────
mkdir -p "${ARTIFACTS}/screenshots" "${ARTIFACTS}/scripts"

# ── Eval state init ────────────────────────────────────────────────────
TIMESTAMP=$(python3 "${EVAL_ROOT}/scripts/eval_state.py" timestamp)
python3 "${EVAL_ROOT}/scripts/eval_state.py" init "${ARTIFACTS}/eval-state.yaml" \
  iteration=0 max_iterations="${MAX_ITERATIONS}" exit_reason=pending \
  phase=a ac_pass=false key="${KEY}" url="${URL}" workspace="${WORKSPACE}" \
  artifacts_dir="${ARTIFACTS}" project_root="${PROJECT_ROOT}" \
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
  cd - > /dev/null
fi

# ── Prototype URL resolution ──────────────────────────────────────────
# Probes the provided URL; falls back to local serving if unreachable.
# Detects SPA vs static and uses --single for client-side routing.
RESOLVE_OUTPUT=$("${EVAL_ROOT}/scripts/resolve-prototype-url.sh" \
  "${URL}" "${WORKSPACE}" "${ARTIFACTS}" 9000 2>&1) || {
  echo "$RESOLVE_OUTPUT" >&2
  exit 1
}

RESOLVED_URL=$(echo "$RESOLVE_OUTPUT" | grep "^RESOLVED_URL=" | cut -d= -f2-)
RESOLVED_PID=$(echo "$RESOLVE_OUTPUT" | grep "^SERVER_PID=" | cut -d= -f2-)
RESOLVED_TYPE=$(echo "$RESOLVE_OUTPUT" | grep "^SERVER_TYPE=" | cut -d= -f2-)

python3 "${EVAL_ROOT}/scripts/eval_state.py" set "${ARTIFACTS}/eval-state.yaml" \
  prototype_url="${RESOLVED_URL}" \
  prototype_source_type="${RESOLVED_TYPE}" \
  original_url="${URL}"

if [ -n "${RESOLVED_PID}" ]; then
  python3 "${EVAL_ROOT}/scripts/eval_state.py" set "${ARTIFACTS}/eval-state.yaml" \
    server_pid="${RESOLVED_PID}"
fi

echo "PROTOTYPE_URL=${RESOLVED_URL}"
echo "PROTOTYPE_SOURCE_TYPE=${RESOLVED_TYPE}"

# ── Server type detection (for rebuild logic) ─────────────────────────
if [ "${RESOLVED_TYPE}" = "remote" ]; then
  echo "NEEDS_REBUILD=false"
else
  PORT=$(echo "${RESOLVED_URL}" | grep -oE ':[0-9]+' | head -1 | tr -d ':')
  if [ -n "${PORT}" ]; then
    SERVER_PID_CHECK=$(lsof -ti:"${PORT}" 2>/dev/null | head -1 || echo "")
    SERVER_CMD=$([ -n "${SERVER_PID_CHECK}" ] && ps -p "${SERVER_PID_CHECK}" -o command= 2>/dev/null || echo "")

    if echo "${SERVER_CMD}" | grep -qE "sirv|serve|http-server" || [ -z "${SERVER_CMD}" ]; then
      echo "NEEDS_REBUILD=true"
    else
      echo "NEEDS_REBUILD=false"
    fi
  else
    echo "NEEDS_REBUILD=true"
  fi
fi

# ── Hybrid source clone (remote prototype + MR available) ─────────────
# When the prototype is hosted remotely but an MR URL is provided,
# clone the source for route/component discovery without building or serving.
KEY_DIR="${PROJECT_ROOT}/.artifacts/${KEY}"
SOURCE_DIR="${KEY_DIR}/code"
SOURCE_AVAILABLE="false"

if [ "${RESOLVED_TYPE}" = "remote" ] && [ -n "${MR_URL}" ]; then
  # Parse GitLab MR URL: https://host/group/project/-/merge_requests/N
  REPO_URL=$(echo "${MR_URL}" | sed -E 's|/-/merge_requests/[0-9]+.*||').git
  MR_NUMBER=$(echo "${MR_URL}" | grep -oE '[0-9]+$')

  if [ -d "${SOURCE_DIR}/.git" ]; then
    cd "${SOURCE_DIR}"
    git fetch origin 2>/dev/null || true
    echo "Source clone already exists at ${SOURCE_DIR}, fetched latest"
  else
    mkdir -p "${SOURCE_DIR}"
    git clone --depth=50 "${REPO_URL}" "${SOURCE_DIR}" 2>/dev/null && {
      cd "${SOURCE_DIR}"
      echo "Cloned ${REPO_URL} to ${SOURCE_DIR}"
    } || {
      echo "WARNING: Could not clone ${REPO_URL} — continuing without source access"
      MR_URL=""
    }
  fi

  if [ -n "${MR_URL}" ] && [ -d "${SOURCE_DIR}/.git" ]; then
    cd "${SOURCE_DIR}"
    # Fetch the MR ref and checkout
    git fetch origin "merge-requests/${MR_NUMBER}/head:mr-${MR_NUMBER}" 2>/dev/null || true
    git checkout "mr-${MR_NUMBER}" 2>/dev/null || {
      echo "WARNING: Could not checkout MR branch — using default branch"
    }
    SOURCE_AVAILABLE="true"
    cd "${PROJECT_ROOT}"
  fi
elif [ -n "${WORKSPACE}" ] && [ -d "${WORKSPACE}" ]; then
  SOURCE_DIR="${WORKSPACE}"
  SOURCE_AVAILABLE="true"
fi

python3 "${EVAL_ROOT}/scripts/eval_state.py" set "${ARTIFACTS}/eval-state.yaml" \
  source_available="${SOURCE_AVAILABLE}" source_dir="${SOURCE_DIR}"
echo "SOURCE_AVAILABLE=${SOURCE_AVAILABLE}"
echo "SOURCE_DIR=${SOURCE_DIR}"

# ── Context repos (consistency-checker + usability-testing) ───────────
CONSISTENCY_AVAILABLE="false"
if [ -d "${PROJECT_ROOT}/.context/consistency-checker/guidelines" ] && \
   [ -n "$(ls "${PROJECT_ROOT}/.context/consistency-checker/guidelines/"*.md 2>/dev/null)" ]; then
  CONSISTENCY_AVAILABLE="true"
else
  bash "${EVAL_ROOT}/scripts/bootstrap-consistency-checker.sh" && \
    CONSISTENCY_AVAILABLE="true" || \
    echo "WARNING: consistency-checker bootstrap failed"
fi

python3 "${EVAL_ROOT}/scripts/eval_state.py" set "${ARTIFACTS}/eval-state.yaml" \
  consistency_available="${CONSISTENCY_AVAILABLE}"
echo "CONSISTENCY_AVAILABLE=${CONSISTENCY_AVAILABLE}"

if [ ! -d "${PROJECT_ROOT}/.context/usability-testing/.git" ]; then
  bash "${EVAL_ROOT}/scripts/bootstrap-usability-testing.sh"
fi

# ── Node_modules — export NODE_PATH instead of persistent symlink ─────
if [ -d "${CLAUDE_SKILL_DIR:-${EVAL_ROOT}}/node_modules" ]; then
  export NODE_PATH="${CLAUDE_SKILL_DIR:-${EVAL_ROOT}}/node_modules"
  echo "NODE_PATH=${NODE_PATH}"
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
