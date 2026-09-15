#!/bin/bash
# Bootstrap design consistency guidelines into .context/.
# Sparse-clones guidelines/, scripts/, and requirements files from the
# consistency-checker git remote.
#
# Repo URL resolution (first non-empty wins):
#   CONSISTENCY_CHECKER_REPO env
#   overlay context_repos.consistency_checker
#
# Writes into the consumer project (UXD_PROJECT_ROOT), never into the skill install.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="${UXD_PROJECT_ROOT:-}"
if [ -z "$PROJECT_ROOT" ]; then
  PROJECT_ROOT="$(node -e "console.log(require('${SCRIPT_DIR}/resolve-root').resolveProjectRoot())" 2>/dev/null || pwd)"
fi

OVERLAY_REPO="$(node "${SCRIPT_DIR}/overlay-get.js" context_repos.consistency_checker 2>/dev/null || true)"
CHECKER_REPO="${CONSISTENCY_CHECKER_REPO:-${OVERLAY_REPO:-}}"

CONTEXT_DIR="${PROJECT_ROOT}/.context/consistency-checker"

echo "Bootstrapping consistency-checker into ${CONTEXT_DIR}..."

if [ -z "$CHECKER_REPO" ]; then
    echo "Skipping: set CONSISTENCY_CHECKER_REPO or overlay context_repos.consistency_checker"
    echo "  to a git URL with guidelines/ and scripts/. Design consistency checks will be unavailable."
    exit 0
fi

mkdir -p "$CONTEXT_DIR"

if [ ! -d "$CONTEXT_DIR/.git" ]; then
    git clone --depth 1 --filter=blob:none --no-checkout "$CHECKER_REPO" "$CONTEXT_DIR" || {
        echo "ERROR: Could not clone consistency-checker from ${CHECKER_REPO}."
        echo "  Design consistency checks will be unavailable."
        exit 1
    }
fi

cd "$CONTEXT_DIR"
git sparse-checkout init --cone || true
git sparse-checkout set guidelines scripts requirements.txt requirements-visual.txt || true
git checkout || true

if [ ! -d "$CONTEXT_DIR/guidelines" ] || [ -z "$(ls "$CONTEXT_DIR/guidelines/"*.md 2>/dev/null)" ]; then
  echo "ERROR: consistency-checker bootstrapped but guidelines/ is empty"
  exit 1
fi

echo "Consistency-checker bootstrapped to $CONTEXT_DIR"
echo "  Guidelines: $CONTEXT_DIR/guidelines/"
echo "  Scripts:    $CONTEXT_DIR/scripts/"
