#!/bin/bash
# Bootstrap design consistency guidelines into .context/.
# Sparse-clones guidelines/, scripts/, and requirements files from the Red Hat GitLab repo.
# Override with CONSISTENCY_CHECKER_REPO env var if needed.
#
# Writes into the consumer project (UXD_PROJECT_ROOT), never into the skill install.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="${UXD_PROJECT_ROOT:-}"
if [ -z "$PROJECT_ROOT" ]; then
  PROJECT_ROOT="$(node -e "console.log(require('${SCRIPT_DIR}/resolve-root').resolveProjectRoot())" 2>/dev/null || pwd)"
fi

CONTEXT_DIR="${PROJECT_ROOT}/.context/consistency-checker"
CHECKER_REPO="${CONSISTENCY_CHECKER_REPO:-git@gitlab.cee.redhat.com:bmorley/consistency-checker.git}"

echo "Bootstrapping consistency-checker into ${CONTEXT_DIR}..."

mkdir -p "$CONTEXT_DIR"

if [ ! -d "$CONTEXT_DIR/.git" ]; then
    git clone --depth 1 --filter=blob:none --no-checkout "$CHECKER_REPO" "$CONTEXT_DIR" || {
        echo "ERROR: Could not clone consistency-checker. Design consistency checks will be unavailable."
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
