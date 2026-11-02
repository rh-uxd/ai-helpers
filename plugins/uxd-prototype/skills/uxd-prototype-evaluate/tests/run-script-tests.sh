#!/usr/bin/env bash
# run-script-tests.sh
#
# Unified test runner for all eval subskill validators.
# Discovers fixture directories and runs each validator against them.
#
# Output protocol: "Test <name> (<fixture>):\n{PASS|FAIL}"
# This matches what mlflow-trace-eval.py's run_script_tests() parser expects.
#
# Exit codes:
#   0 = all tests pass
#   1 = one or more tests failed

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
SKILL_DIR="$(dirname "$SCRIPT_DIR")"
FIXTURES_DIR="$SCRIPT_DIR/fixtures"
SCRIPTS_DIR="$SKILL_DIR/scripts"

FAIL_COUNT=0
PASS_COUNT=0

run_validator() {
  local validator="$1"
  local fixture_dir="$2"
  local label="$3"

  local script_path="$SCRIPTS_DIR/$validator"
  if [ ! -f "$script_path" ]; then
    echo "Test $validator ($label): "
    echo "FAIL"
    FAIL_COUNT=$((FAIL_COUNT + 1))
    return
  fi

  if node "$script_path" "$fixture_dir" --json >/dev/null 2>&1; then
    echo "Test $validator ($label): "
    echo "PASS"
    PASS_COUNT=$((PASS_COUNT + 1))
  else
    echo "Test $validator ($label): "
    echo "FAIL"
    FAIL_COUNT=$((FAIL_COUNT + 1))
  fi
}

echo "=== Subskill Validation Tests ==="
echo ""

# Full validators (require a complete artifact set)
FULL_VALIDATORS="validate-artifact-schemas.js validate-report-rendering.js"

# Subskill validators (run on both golden and their specific minimal fixture)
SUBSKILL_VALIDATORS="validate-classify.js validate-fix-loop.js validate-consistency.js"

# Run against golden fixture directories (.golden-* and golden-*)
for golden_dir in "$FIXTURES_DIR"/.golden-* "$FIXTURES_DIR"/golden-*; do
  [ -d "$golden_dir" ] || continue
  label="$(basename "$golden_dir")"
  echo "--- Fixture: $label ---"

  for validator in $FULL_VALIDATORS $SUBSKILL_VALIDATORS; do
    run_validator "$validator" "$golden_dir" "$label"
  done
  echo ""
done

# Run subskill validators against their specific minimal fixtures
if [ -d "$FIXTURES_DIR/minimal" ]; then
  echo "--- Minimal fixtures ---"

  [ -d "$FIXTURES_DIR/minimal/classify" ] && \
    run_validator "validate-classify.js" "$FIXTURES_DIR/minimal/classify" "minimal/classify"

  [ -d "$FIXTURES_DIR/minimal/fix" ] && \
    run_validator "validate-fix-loop.js" "$FIXTURES_DIR/minimal/fix" "minimal/fix"

  [ -d "$FIXTURES_DIR/minimal/consistency" ] && \
    run_validator "validate-consistency.js" "$FIXTURES_DIR/minimal/consistency" "minimal/consistency"

  echo ""
fi

echo "=== Summary ==="
TOTAL=$((PASS_COUNT + FAIL_COUNT))
echo "$PASS_COUNT/$TOTAL passed"

if [ "$FAIL_COUNT" -gt 0 ]; then
  echo "$FAIL_COUNT test(s) failed"
  exit 1
fi
