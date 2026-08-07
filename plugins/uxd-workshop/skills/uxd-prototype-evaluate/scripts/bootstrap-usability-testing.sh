#!/bin/bash
# Bootstrap usability-testing personas and rubric into .context/ for evaluation.
# Set USABILITY_TESTING_REPO to a git URL that contains personas/ and prompts/.
# Sparse-clones only personas/, prompts/, and tools/.
#
# Writes into the consumer project (UXD_PROJECT_ROOT), never into the skill install.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="${UXD_PROJECT_ROOT:-}"
if [ -z "$PROJECT_ROOT" ]; then
  PROJECT_ROOT="$(node -e "console.log(require('${SCRIPT_DIR}/resolve-root').resolveProjectRoot())" 2>/dev/null || pwd)"
fi

CONTEXT_DIR="${PROJECT_ROOT}/.context/usability-testing"
USABILITY_REPO="${USABILITY_TESTING_REPO:-}"

echo "Bootstrapping usability-testing context into ${CONTEXT_DIR}..."

if [ -z "$USABILITY_REPO" ]; then
    echo "Skipping: set USABILITY_TESTING_REPO to a git URL with personas/ and prompts/,"
    echo "  then re-run this script. Phase B persona scoring needs that context."
    exit 0
fi

mkdir -p "$CONTEXT_DIR"

if [ ! -d "$CONTEXT_DIR/.git" ]; then
    git clone --depth 1 --filter=blob:none --no-checkout "$USABILITY_REPO" "$CONTEXT_DIR" 2>/dev/null || {
        echo "Warning: Could not clone usability-testing repo. Usability dimension scoring will be unavailable."
        exit 0
    }
fi

cd "$CONTEXT_DIR"
git sparse-checkout init --cone 2>/dev/null || true
git sparse-checkout set personas prompts tools 2>/dev/null || true
git checkout 2>/dev/null || true

echo "Usability-testing bootstrapped to $CONTEXT_DIR"
