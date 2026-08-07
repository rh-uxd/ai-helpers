#!/bin/bash
# Bootstrap usability-testing personas and rubric into .context/ for evaluation.
# Sparse-clones personas/, prompts/, and tools/ from the Red Hat GitLab repo.
# Override with USABILITY_TESTING_REPO env var if needed.
#
# Writes into the consumer project (UXD_PROJECT_ROOT), never into the skill install.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="${UXD_PROJECT_ROOT:-}"
if [ -z "$PROJECT_ROOT" ]; then
  PROJECT_ROOT="$(node -e "console.log(require('${SCRIPT_DIR}/resolve-root').resolveProjectRoot())" 2>/dev/null || pwd)"
fi

CONTEXT_DIR="${PROJECT_ROOT}/.context/usability-testing"
USABILITY_REPO="${USABILITY_TESTING_REPO:-git@gitlab.cee.redhat.com:zbodnar/automated-usability-testing.git}"

echo "Bootstrapping usability-testing context into ${CONTEXT_DIR}..."

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
