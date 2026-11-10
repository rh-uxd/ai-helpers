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
FULL_VALIDATORS="artifacts/validate-artifact-schemas.js reporting/validate-report-rendering.js"

# Subskill validators (run on both golden and their specific minimal fixture)
SUBSKILL_VALIDATORS="classification/validate-classify.js workflow/validate-fix-loop.js consistency/validate-consistency.js"

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
    run_validator "classification/validate-classify.js" "$FIXTURES_DIR/minimal/classify" "minimal/classify"

  [ -d "$FIXTURES_DIR/minimal/fix" ] && \
    run_validator "workflow/validate-fix-loop.js" "$FIXTURES_DIR/minimal/fix" "minimal/fix"

  [ -d "$FIXTURES_DIR/minimal/consistency" ] && \
    run_validator "consistency/validate-consistency.js" "$FIXTURES_DIR/minimal/consistency" "minimal/consistency"

  echo ""
fi

echo "--- Runtime regressions ---"
if node - "$SCRIPTS_DIR" <<'NODE'
const assert = require('assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');

const scriptsDir = process.argv[2];
const { counts } = require(path.join(scriptsDir, 'artifacts', 'split-contract'));
assert.deepEqual(counts([
  { verdict: 'PASS' },
  { verdict: 'FAIL' },
  { verdict: 'FLAGGED' },
  { verdict: 'NOT_RUN' },
  { verdict: 'PASS' },
]), { pass: 2, fail: 1, flagged: 1, not_run: 1, total: 5 });
for (const verdict of ['UNKNOWN', 'toString', undefined]) {
  assert.throws(() => counts([{ verdict }]), /Unsupported verdict/);
}

const synthesis = require(path.join(scriptsDir, 'reporting', 'evaluation-synthesis'));
const priorityDocs = {
  'pe-context.json': { run_id: 'priority-check', prototype_key: 'TEST', intent: {
    title: 'Priority regression', acceptance_criteria: [],
    scope: { source_ref: 'test', source_mode: 'remote-only' },
  } },
  'pe-evaluation-snapshot.json': { status: 'needs-attention', ac_results: [], journeys: [],
    summary: { ac_counts: { pass: 0, fail: 0, flagged: 0, not_run: 0, total: 0 },
      consistency_counts: { error: 0, warning: 0, info: 1, total: 1 } },
    consistency: { status: 'flagged', guidelines_version: 'test', findings: [{
      id: 'info-note', origin: 'source', file: 'example.tsx', severity: 'info',
      verdict: 'FLAGGED', confidence: 'low', guideline_id: 'test',
      guideline_title: 'Informational note', description: 'Synthetic note',
      recommendation: 'Review', review_candidate: false, evidence_ids: [],
    }] },
    heuristics: { profile: 'prototype-specialists', coverage: [], findings:
      [['a-unrated', null], ['b-cosmetic', 'cosmetic'], ['c-major', 'major'],
        ['z-critical', 'critical']].map(([id, suggested_severity]) => ({
        id, title: id, suggested_severity, review_status: 'unreviewed',
        screen_id: 'screen', state_id: 'state', observation: 'Synthetic observation',
        evidence_ids: [],
      })),
    }, usability: { status: 'not-run' },
  },
  'pe-actions.json': { actions: [] },
  'pe-state.json': { phases: [], lifecycle: { status: 'completed' } },
};
const prioritized = synthesis.build(priorityDocs);
assert.deepEqual(prioritized.findings.map(f => f.id),
  ['z-critical', 'c-major', 'info-note', 'b-cosmetic', 'a-unrated']);
assert.equal(prioritized.findings[0].severity, 'critical');
assert.equal(prioritized.findings.at(-1).severity, null);
const chat = synthesis.chatMarkdown(prioritized);
assert.ok(chat.indexOf('z-critical') < chat.indexOf('info-note'));

for (const status of ['blocked', 'incomplete', 'failed', 'completed']) {
  const docs = structuredClone(priorityDocs);
  docs['pe-evaluation-snapshot.json'].journeys = [{
    id: 'journey-test', task_id: 'task-test', persona_id: 'persona-test',
    verdict: status === 'completed' ? 'PASS' : 'NOT_RUN', steps: [],
    execution: { status, stop_reason: 'Synthetic stop' },
  }];
  const result = synthesis.build(docs);
  const expected = `Walkthrough task-test/persona-test ended ${status}: Synthetic stop`;
  assert.equal(result.uncertainty.includes(expected), status !== 'completed');
  assert.equal(synthesis.chatMarkdown(result).includes(expected), status !== 'completed');
}

const classifierPath = path.join(scriptsDir, 'classification', 'run-classification.js');
const originalArgv = process.argv;
try {
  process.argv = new Proxy(originalArgv, {
    get(target, property, receiver) {
      if (property === 'slice') throw new Error('module import read caller argv');
      return Reflect.get(target, property, receiver);
    },
  });
  delete require.cache[require.resolve(classifierPath)];
  const { classifyCriterion } = require(classifierPath);
  assert.equal(typeof classifyCriterion, 'function');
} finally {
  process.argv = originalArgv;
  delete require.cache[require.resolve(classifierPath)];
}

const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'run-classification-'));
try {
  fs.writeFileSync(path.join(tempDir, 'extract-state.json'), JSON.stringify({
    ac_list: [{ id: 'AC-1', text: 'Status column displays ready state', source: 'jira' }],
  }));
  const result = spawnSync(process.execPath, [classifierPath, tempDir, '--json'], { encoding: 'utf8' });
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /"criteria_count":1/);
  assert.equal(fs.existsSync(path.join(tempDir, 'tier-overrides.json')), true);
  assert.equal(fs.existsSync(path.join(tempDir, 'evaluation-report.csv')), true);

  const usage = spawnSync(process.execPath, [classifierPath], { encoding: 'utf8' });
  assert.notEqual(usage.status, 0);
  assert.match(usage.stderr, /Usage: node scripts\/classification\/run-classification\.js/);
} finally {
  fs.rmSync(tempDir, { recursive: true, force: true });
}
NODE
then
  echo "Test runtime-regressions (focused):"
  echo "PASS"
  PASS_COUNT=$((PASS_COUNT + 1))
else
  echo "Test runtime-regressions (focused):"
  echo "FAIL"
  FAIL_COUNT=$((FAIL_COUNT + 1))
fi
echo ""

echo "=== Summary ==="
TOTAL=$((PASS_COUNT + FAIL_COUNT))
echo "$PASS_COUNT/$TOTAL passed"

if [ "$FAIL_COUNT" -gt 0 ]; then
  echo "$FAIL_COUNT test(s) failed"
  exit 1
fi
