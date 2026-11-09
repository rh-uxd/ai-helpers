#!/bin/bash
# Compatibility entry point: inspect an explicit checker path or the sibling default.
# No project context, remote repository, or guideline bundle is required.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CHECKER_DIR="${UXD_CONSISTENCY_CHECKER_DIR:-$(dirname "$(dirname "$SCRIPT_DIR")")/uxd-consistency-check}"
if [[ "$CHECKER_DIR" != /* ]]; then
  echo "UXD_CONSISTENCY_CHECKER_DIR must be an absolute skill-directory path" >&2
  exit 2
fi

if [ -f "$CHECKER_DIR/SKILL.md" ] && [ -f "$CHECKER_DIR/scripts/analyze.py" ]; then
  echo "CONSISTENCY_AVAILABLE=true"
  echo "Consistency checker available: $CHECKER_DIR"
else
  echo "CONSISTENCY_AVAILABLE=false"
  echo "Consistency checker unavailable: $CHECKER_DIR (requires SKILL.md and scripts/analyze.py)"
  echo "This evaluator distribution includes the sibling uxd-consistency-check skill. Restore or update the combined plugin if it is missing; for a deliberately separate installation, set UXD_CONSISTENCY_CHECKER_DIR to its absolute skill-directory path. Record checks as unavailable; do not run a substitute audit."
fi
