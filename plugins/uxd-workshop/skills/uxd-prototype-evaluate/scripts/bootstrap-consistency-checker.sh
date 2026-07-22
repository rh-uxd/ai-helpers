#!/bin/bash
# Bootstrap design consistency guidelines into .context/.
# Set CONSISTENCY_CHECKER_REPO to a git URL that contains guidelines/ and scripts/.
#
# Writes into the consumer project (UXD_PROJECT_ROOT), never into the skill install.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="${UXD_PROJECT_ROOT:-}"
if [ -z "$PROJECT_ROOT" ]; then
  PROJECT_ROOT="$(node -e "console.log(require('${SCRIPT_DIR}/resolve-root').resolveProjectRoot())" 2>/dev/null || pwd)"
fi

CONTEXT_DIR="${PROJECT_ROOT}/.context/consistency-checker"
CHECKER_REPO="${CONSISTENCY_CHECKER_REPO:-}"

echo "Bootstrapping consistency-checker into ${CONTEXT_DIR}..."

if [ -z "$CHECKER_REPO" ]; then
    echo "Skipping: set CONSISTENCY_CHECKER_REPO to a git URL with guidelines/ and scripts/,"
    echo "  then re-run this script. Design consistency checks need that context."
    exit 0
fi

mkdir -p "$CONTEXT_DIR"

if [ ! -d "$CONTEXT_DIR/.git" ]; then
    git clone --depth 1 --filter=blob:none --no-checkout "$CHECKER_REPO" "$CONTEXT_DIR" 2>/dev/null || {
        echo "Warning: Could not clone consistency-checker. Design consistency checks will be unavailable."
        exit 0
    }
fi

cd "$CONTEXT_DIR"
git sparse-checkout init --cone 2>/dev/null || true
git sparse-checkout set guidelines scripts requirements.txt requirements-visual.txt 2>/dev/null || true
git checkout 2>/dev/null || true

echo "Consistency-checker bootstrapped to $CONTEXT_DIR"
echo "  Guidelines: $CONTEXT_DIR/guidelines/"
echo "  Scripts:    $CONTEXT_DIR/scripts/"
