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

echo "--- Artifact foundation contracts ---"
if node - "$SCRIPTS_DIR" <<'NODE'
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const scripts = process.argv[2];
const C = require(path.join(scripts, 'artifacts', 'split-contract'));
const { buildDocuments, compareLegacyParity } = require(path.join(scripts, 'artifacts', 'assemble-phase-a-canonical'));
const { validateDocuments } = require(path.join(scripts, 'artifacts', 'validate-canonical-artifacts'));
const utc = () => new Date().toISOString();

function testPacketSourcePaths(root) {
  const directory = path.join(root, 'snapshot-paths');
  fs.mkdirSync(directory, { recursive: true });
  const packetPath = path.join(directory, 'packet.json');
  const snapshotPath = path.join(directory, 'source.snapshot');
  const outsidePath = path.join(root, 'outside.snapshot');
  fs.writeFileSync(packetPath, '{}\n');
  fs.writeFileSync(snapshotPath, 'approved source\n');
  fs.writeFileSync(outsidePath, 'outside source\n');
  assert.equal(C.readPacketSourceSnapshot(packetPath, 'source.snapshot').toString(), 'approved source\n');
  assert.throws(() => C.readPacketSourceSnapshot(packetPath, '../outside.snapshot'), /relative file inside the packet directory/);
  assert.throws(() => C.readPacketSourceSnapshot(packetPath, outsidePath), /relative file inside the packet directory/);
  const linkPath = path.join(directory, 'linked.snapshot');
  fs.symlinkSync(snapshotPath, linkPath);
  assert.throws(() => C.readPacketSourceSnapshot(packetPath, 'linked.snapshot'), /cannot contain symlinks/);
}

function testLegacyCsvDoesNotVerify() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'legacy-classification-'));
  try {
    fs.writeFileSync(path.join(root, 'extract-state.json'), JSON.stringify({
      key: 'DEMO-1', title: 'Legacy test', extracted_at: utc(),
      ac_list: [{ criterion_id: 'AC-1', text: 'The server validates tokens.', source: 'jira' }], tasks_to_be_done: [],
    }));
    fs.writeFileSync(path.join(root, 'mr-delta.json'), JSON.stringify({ changed_files: [] }));
    fs.writeFileSync(path.join(root, 'consistency-report.json'), JSON.stringify({
      source_mode: { ran: false, violations: [] }, degraded: false, guidelines_version: 'not-run', summary: {},
    }));
    fs.writeFileSync(path.join(root, 'prototype-evidence.json'), JSON.stringify({
      prototype_url: 'https://demo.invalid/prototype', captured_at: utc(), capture: {}, crops: [],
    }));
    const csv = [
      '# ACCEPTANCE CRITERIA',
      'criterion_id,source,tier,criterion_text,verdict,rationale,evidence,fix_action,fix_file,human_action',
      'AC-1,jira,T3,"The server validates tokens",PASS,"Backend-only classification",,,,,', '',
    ].join('\n');
    fs.writeFileSync(path.join(root, 'evaluation-report.csv'), csv);
    const { documents } = buildDocuments(root, { decision: 'bypass', invalidated_by: ['cache_bypassed'] });
    const result = documents['pe-evaluation-snapshot.json'].ac_results[0];
    assert.equal(result.verdict, 'NOT_RUN');
    assert.equal(result.evaluated_by, null);
    assert.deepEqual(result.evidence_ids, []);
    assert.match(result.rationale, /no canonical evidence-backed verification receipt/);
    compareLegacyParity(root, documents);
    assert.match(fs.readFileSync(path.join(root, 'evaluation-report.csv'), 'utf8'), /,PASS,/);

    const unverifiedPass = structuredClone(documents);
    unverifiedPass['pe-evaluation-snapshot.json'].ac_results[0] = {
      ...unverifiedPass['pe-evaluation-snapshot.json'].ac_results[0], verdict: 'PASS', evaluated_by: 'source',
    };
    unverifiedPass['pe-evaluation-snapshot.json'].summary.ac_counts = C.counts(unverifiedPass['pe-evaluation-snapshot.json'].ac_results);
    const verificationErrors = validateDocuments(unverifiedPass);
    assert.ok(verificationErrors.some(error => error.code === 'source_classification_not_verification'));
    assert.ok(verificationErrors.some(error => error.code === 'missing_verification_evidence'));
    const missingVerifier = structuredClone(unverifiedPass);
    missingVerifier['pe-evaluation-snapshot.json'].ac_results[0].evaluated_by = null;
    assert.ok(validateDocuments(missingVerifier).some(error => error.code === 'missing_verifier'));

    const explicit = structuredClone(documents);
    const explicitEvidence = explicit['pe-evidence.json'];
    explicitEvidence.items.push({
      id: 'evidence-explicit-check', capture_id: explicitEvidence.captures[0].id,
      kind: 'dom', purpose: 'ac', subject: { role: 'text', name: 'Draft title', locator: 'main' },
      dom: { text: 'The draft title is absent.', attributes: {} },
    });
    explicit['pe-context.json'].intent.acceptance_criteria[0].verification_mode = 'ui';
    explicit['pe-context.json'].intent.acceptance_criteria[0].tier = 'T1';
    explicit['pe-evaluation-snapshot.json'].ac_results[0] = {
      ...explicit['pe-evaluation-snapshot.json'].ac_results[0], verdict: 'FAIL',
      rationale: 'The explicit check observed the draft title was absent.',
      evidence_ids: ['evidence-explicit-check'], evaluated_by: 'journey',
    };
    explicit['pe-evaluation-snapshot.json'].journeys = [{
      id: 'journey-primary-user', task_id: 'task-1', persona_id: 'persona-prototype-user',
      ac_ids: ['ac-1'], source: 'Synthetic explicit verification', verdict: 'FAIL',
      steps: [{ id: 'step-explicit-check', sequence: 1, action: 'verify', target: 'draft title visible',
        outcome: 'failure', evidence_ids: ['evidence-explicit-check'], note: 'Title absent.' }],
    }];
    explicit['pe-evaluation-snapshot.json'].summary.ac_counts = C.counts(explicit['pe-evaluation-snapshot.json'].ac_results);
    explicit['pe-evaluation-snapshot.json'].summary.journey_counts = C.counts(explicit['pe-evaluation-snapshot.json'].journeys);
    assert.deepEqual(validateDocuments(explicit), []);
    const contradictory = structuredClone(explicit);
    contradictory['pe-evaluation-snapshot.json'].ac_results[0].verdict = 'PASS';
    contradictory['pe-evaluation-snapshot.json'].summary.ac_counts = C.counts(contradictory['pe-evaluation-snapshot.json'].ac_results);
    assert.ok(validateDocuments(contradictory).some(error => error.code === 'missing_explicit_verification'));
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
}

const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'uxd-artifact-foundation-'));
try {
  testPacketSourcePaths(temp);
  testLegacyCsvDoesNotVerify();
} finally {
  fs.rmSync(temp, { recursive: true, force: true });
}
NODE
then
  echo "Test artifact-foundation-contracts (canonical):"
  echo "PASS"
  PASS_COUNT=$((PASS_COUNT + 1))
else
  echo "Test artifact-foundation-contracts (canonical):"
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
