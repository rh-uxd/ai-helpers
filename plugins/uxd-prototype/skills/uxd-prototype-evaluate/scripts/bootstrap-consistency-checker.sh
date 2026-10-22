#!/bin/bash
# Compatibility entry point: discover the installed sibling checker only.
# No project context, remote repository, or guideline bundle is required.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CHECKER_DIR="$(dirname "$(dirname "$SCRIPT_DIR")")/uxd-consistency-check"

if [ -f "$CHECKER_DIR/SKILL.md" ] && [ -f "$CHECKER_DIR/scripts/analyze.py" ]; then
  echo "CONSISTENCY_AVAILABLE=true"
  echo "Consistency checker available: $CHECKER_DIR"
else
  echo "CONSISTENCY_AVAILABLE=false"
  echo "Consistency checker unavailable: $CHECKER_DIR (requires SKILL.md and scripts/analyze.py)"
  echo "Use the pf-css-token-check fallback when available; otherwise record a skipped report."
fi
