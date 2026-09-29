#!/bin/bash
# Bootstrap usability-testing personas and rubric into .context/ for evaluation.
# Sparse-clones personas/, prompts/, and tools/.
#
# Repo URL resolution (first non-empty wins):
#   USABILITY_TESTING_REPO env
#   overlay context_repos.usability_testing
#
# Writes into the consumer project (UXD_PROJECT_ROOT), never into the skill install.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="${UXD_PROJECT_ROOT:-}"
if [ -z "$PROJECT_ROOT" ]; then
  PROJECT_ROOT="$(node -e "console.log(require('${SCRIPT_DIR}/resolve-root').resolveProjectRoot())" 2>/dev/null || pwd)"
fi

OVERLAY_REPO="$(node "${SCRIPT_DIR}/overlay-get.js" context_repos.usability_testing 2>/dev/null || true)"
USABILITY_REPO="${USABILITY_TESTING_REPO:-${OVERLAY_REPO:-}}"

CONTEXT_DIR="${PROJECT_ROOT}/.context/usability-testing"

echo "Bootstrapping usability-testing context into ${CONTEXT_DIR}..."

if [ -z "$USABILITY_REPO" ]; then
    echo "Skipping: set USABILITY_TESTING_REPO or overlay context_repos.usability_testing"
    echo "  to a git URL with personas/ and prompts/. Phase B still uses the bundled persona catalog."
    exit 0
fi

mkdir -p "$CONTEXT_DIR"

if [ ! -d "$CONTEXT_DIR/.git" ]; then
    git clone --depth 1 --filter=blob:none --no-checkout "$USABILITY_REPO" "$CONTEXT_DIR" || {
        echo "Warning: Could not clone usability-testing repo. Usability dimension scoring will be unavailable."
        exit 0
    }
fi

cd "$CONTEXT_DIR"
git sparse-checkout init --cone || true
git sparse-checkout set personas prompts tools || true
git checkout || true

echo "Usability-testing bootstrapped to $CONTEXT_DIR"
