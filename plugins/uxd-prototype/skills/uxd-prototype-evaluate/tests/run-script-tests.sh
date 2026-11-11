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

echo "--- Split evaluator contracts ---"
if node - "$SCRIPTS_DIR" <<'NODE'
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const scripts = process.argv[2];
const skillRoot = path.resolve(scripts, '..');
const C = require(path.join(scripts, 'artifacts', 'split-contract'));
const { buildDocuments, compareLegacyParity } = require(path.join(scripts, 'artifacts', 'assemble-phase-a-canonical'));
const { run: runSplit } = require(path.join(scripts, 'run-split-evaluation'));
const { validateBundle } = require(path.join(scripts, 'task-verification', 'walkthrough-contract'));
const { validatePublishInput } = require(path.join(scripts, 'reporting', 'validate-publish-input'));
const { validateDocuments } = require(path.join(scripts, 'artifacts', 'validate-canonical-artifacts'));
const synthesis = require(path.join(scripts, 'reporting', 'evaluation-synthesis'));
const { importJudgments } = require(path.join(scripts, 'inspection-contracts', 'inspection-bundle'));
const planning = require(path.join(scripts, 'workflow', 'evaluation-plan'));

const writeJson = (file, value) => {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, `${JSON.stringify(value, null, 2)}\n`);
};
const invoke = (script, args = []) => spawnSync(process.execPath, [script, ...args], { cwd: skillRoot, encoding: 'utf8' });
const runReport = (directory, ...args) => {
  const result = invoke(path.join(scripts, 'run-report.js'), [directory, ...args]);
  assert.equal(result.status, 0, result.stderr || result.stdout);
  return result.stdout;
};
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

function testFailedJudgmentUsage(root) {
  const bundleDir = path.join(root, 'failed-judgment-bundle');
  const stage = path.join(root, 'failed-judgment-run');
  fs.mkdirSync(bundleDir, { recursive: true });
  fs.mkdirSync(stage, { recursive: true });
  const packetBytes = Buffer.from('reviewed packet');
  const snapshot = Buffer.from('reviewed source');
  const scope = { screen_ids: ['screen-one'], state_ids: ['state-one'] };
  const packet = {
    extract: { key: 'DEMO-1' },
    prototype: { revision: 'build-one' },
    check_scope: scope,
    permissions: { provider: { status: 'approved' } },
  };
  const reference = (relativePath, text) => {
    const file = path.join(bundleDir, relativePath);
    fs.mkdirSync(path.dirname(file), { recursive: true });
    const bytes = Buffer.from(text);
    fs.writeFileSync(file, bytes);
    return { path: relativePath, sha256: C.hash(bytes) };
  };
  const phases = ['heuristic-content', 'heuristic-hierarchy', 'heuristic-interaction'].map((name, index) => ({
    measurement: {
      name, checks: ['heuristic'], status: index === 0 ? 'failed' : 'completed',
      model_invoked: true, provider: 'openai', model: 'test-model',
      started_at: utc(), ended_at: utc(), duration_ms: 1,
      input_files: 1, input_bytes: 10, output_bytes: 0,
      token_usage: { input: 1, cached_input: 0, output: 0, reasoning_tokens: 0 }, llm_cost_usd: 0.25,
    },
    context_status: 'captured', evidence_ids: ['evidence-one'],
    submitted_context: reference(`checks/model/${name}-input.json`, '{}'),
    returned_result: reference(`checks/model/${name}-result.json`, index === 0 ? '{"error":"provider timeout"}' : '{"findings":[]}'),
  }));
  const bundle = {
    schema_version: 1, prototype_key: 'DEMO-1', prototype_revision: 'build-one',
    packet_sha256: C.hash(packetBytes), source_sha256: C.hash(snapshot), scope,
    producers: { heuristic: { name: 'uxd-research-heuristic-eval', version: 'test' } },
    inspection: { method: 'supplied-captures', revision_verified: true, receipt: reference('checks/model/inspection.json', '{}') },
    evidence: { captures: [{ source_ref: 'build-one', screen_id: 'screen-one', state_id: 'state-one' }], items: [{ id: 'evidence-one' }] },
    phases,
    results: { heuristic: { profile: 'prototype-specialists', framework: 'nielsen', coverage: [], findings: [] } },
  };
  const bundlePath = path.join(bundleDir, 'bundle.json');
  fs.writeFileSync(bundlePath, JSON.stringify(bundle));
  const documents = {
    'pe-evaluation-snapshot.json': {},
    'pe-evidence.json': { captures: [], items: [] },
    'pe-actions.json': { actions: [] },
  };
  const imported = importJudgments({ bundlePath, packet, packetBytes, snapshot, stage, selected: ['heuristic'], documents });
  assert.equal(imported.phases[0].status, 'failed');
  assert.equal(planning.usage(imported.phases).model_invocations, 3);
  assert.equal(planning.usage(imported.phases).llm_cost_usd, 0.75);
}

function makePacket(directory, withCohort) {
  const inputDir = path.join(directory, 'inputs');
  fs.mkdirSync(inputDir, { recursive: true });
  fs.writeFileSync(path.join(inputDir, 'source.snapshot'), 'Synthetic, reviewed source snapshot.\n');
  const packet = {
    source: { kind: 'jira', id: 'DEMO-1', revision: 'ticket-revision-1', snapshot_path: 'source.snapshot' },
    prototype: { url: 'https://demo.invalid/prototype', revision: 'build-revision-1' },
    extract: {
      key: 'DEMO-1', title: 'Draft management',
      ac_list: [{ criterion_id: 'AC-1', source_id: 'DEMO-1#AC-1', text: 'The server validates draft tokens.' }],
    },
    permissions: Object.fromEntries(['browser', 'provider', 'prototype_edits', 'report', 'sharing'].map(name => [name, {
      status: 'not-requested', scope: '', recorded_at: utc(),
    }])),
  };
  if (withCohort) {
    packet.tasks = [{
      id: 'task-save-draft', title: 'Save a draft', ac_ids: ['ac-1'], target_route: '/drafts',
      screen_ids: ['screen-drafts'], state_ids: ['state-empty'], role_ids: ['role-designer'],
      fixture_ids: ['fixture-empty'], source_ids: ['DEMO-1#AC-1'], expected_outcome: 'The saved draft appears in the list.',
    }];
    packet.personas = [{ id: 'persona-junior', label: 'Junior designer', experience: 'junior', task_ids: ['task-save-draft'], role_id: 'role-designer' }];
    packet.environment = {
      source_sections: [{ id: 'DEMO-1#AC-1', title: 'Acceptance criterion 1' }],
      screens: [{ id: 'screen-drafts', title: 'Draft list', route: '/drafts', source_ids: ['DEMO-1#AC-1'] }],
      states: [{ id: 'state-empty', screen_id: 'screen-drafts', description: 'No drafts saved', expected_outcome: 'The draft list is empty.', source_ids: ['DEMO-1#AC-1'] }],
      roles: [{ id: 'role-designer', label: 'Designer', setup_only: false, permissions: [], resource_scope: 'Own drafts' }],
      fixtures: [{ id: 'fixture-empty', description: 'Empty draft list', starting_state: 'No drafts exist.', reset: 'Clear all drafts.', state_ids: ['state-empty'] }],
    };
  }
  const packetPath = path.join(inputDir, 'packet.json');
  fs.writeFileSync(packetPath, `${JSON.stringify(packet, null, 2)}\n`);
  return { packetPath, snapshotPath: path.join(inputDir, 'source.snapshot') };
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

function testExplicitSelection() {
  for (const verdict of ['PASS', 'FAIL', 'FLAGGED', 'NOT_RUN']) assert.ok(synthesis.acVerdictLabel(verdict));
  assert.deepEqual(['PASS', 'FAIL', 'FLAGGED', 'NOT_RUN'].map(synthesis.taskOutcomeLabel), ['completed', 'failed', 'uncertain', 'not tried']);
  const quick = path.join(scripts, 'run-quick-checks.js');
  for (const args of [
    ['--input', 'missing.json', '--output', 'missing-run'],
    ['--input', 'missing.json', '--output', 'missing-run', '--checks', ''],
  ]) {
    const result = invoke(quick, args);
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /Select at least one check|Select only/);
  }
  assert.throws(() => runSplit({ route: 'quick', output: path.join(os.tmpdir(), 'unselected-quick') }), /Select Quick checks explicitly/);
  assert.throws(() => runSplit({ route: 'full', output: path.join(os.tmpdir(), 'unselected-full') }), /Select Quick checks explicitly/);
}

function testCanonicalReportContract(root, runDirectory) {
  runReport(runDirectory);
  const docs = C.loadRun(runDirectory);
  docs['pe-evidence.json'].source_items = [{
    id: 'source-evidence-note', path: 'src/App.tsx', line: 1,
    revision: docs['pe-context.json'].intent.scope.source_ref, sha256: `sha256:${'a'.repeat(64)}`,
    observation: 'Synthetic source context for report-link coverage.', availability: 'present',
  }];
  docs['pe-evaluation-snapshot.json'].ac_results[0].evidence_ids = ['source-evidence-note'];
  for (const name of C.FILES) writeJson(path.join(runDirectory, name), docs[name]);
  assert.throws(() => validatePublishInput(runDirectory), /integrity receipt/);

  const chat = runReport(runDirectory, '--chat');
  assert.match(chat, /NOT_RUN — not tested/);
  assert.match(chat, /The server validates draft tokens/);
  assert.match(chat, /Not verified; classification: backend-only/);
  assert.match(chat, /source-evidence-note/);
  assert.match(runReport(runDirectory), /Rendered canonical report/);
  const report = fs.readFileSync(path.join(runDirectory, 'evaluation-report.html'), 'utf8');
  assert.match(report, /href="#evidence-source-evidence-note"/);
  assert.match(report, /id="evidence-source-evidence-note"/);
  assert.match(report, /Requirement verdict/);
  assert.match(report, /Rationale/);
  assert.doesNotMatch(report, /<td>NOT_RUN<\/td>/);
  assert.equal(validatePublishInput(runDirectory).mode, 'canonical');

  const publishScript = path.join(scripts, 'publish-report.sh');
  const canonicalShell = spawnSync('bash', [publishScript, runDirectory, '--mode=invalid'], { cwd: skillRoot, encoding: 'utf8' });
  assert.notEqual(canonicalShell.status, 0);
  assert.match(canonicalShell.stdout, /"mode":"canonical"/);
  assert.match(canonicalShell.stderr, /Unknown mode/);
  fs.appendFileSync(path.join(runDirectory, 'evaluation-report.html'), '\n<!-- stale -->\n');
  assert.throws(() => validatePublishInput(runDirectory), /integrity receipt/);
  runReport(runDirectory);
  assert.equal(validatePublishInput(runDirectory).mode, 'canonical');

  const csvOnly = path.join(root, 'csv-only');
  fs.mkdirSync(csvOnly);
  fs.writeFileSync(path.join(csvOnly, 'evaluation-report.csv'), 'AC-1,PASS\n');
  assert.throws(() => validatePublishInput(csvOnly), /requires --legacy/);
  assert.throws(() => validatePublishInput(csvOnly, { legacy: true }), /evaluation-report.html is missing/);
  const legacy = path.join(root, 'legacy');
  fs.mkdirSync(legacy);
  fs.writeFileSync(path.join(legacy, 'evaluation-report.csv'), 'AC-1,PASS\n');
  fs.writeFileSync(path.join(legacy, 'evaluation-report.html'), '<p>Legacy report</p>');
  assert.throws(() => validatePublishInput(legacy), /requires --legacy/);
  assert.equal(validatePublishInput(legacy, { legacy: true }).mode, 'legacy');
  const legacyShell = spawnSync('bash', [publishScript, legacy, '--legacy', '--mode=invalid'], { cwd: skillRoot, encoding: 'utf8' });
  assert.notEqual(legacyShell.status, 0);
  assert.match(legacyShell.stdout, /"mode":"legacy"/);
  assert.match(legacyShell.stderr, /Unknown mode/);
}

function makeNotRunBundle(directory, docs, packetBytes, snapshotBytes) {
  const receiptPath = path.join(directory, 'checks', 'inspection.json');
  const receiptBytes = Buffer.from(JSON.stringify({ method: 'browser', result: 'not attempted' }));
  fs.mkdirSync(path.dirname(receiptPath), { recursive: true });
  fs.writeFileSync(receiptPath, receiptBytes);
  return {
    schema_version: 2,
    prototype_key: docs['pe-context.json'].prototype_key,
    prototype_revision: docs['pe-context.json'].intent.scope.source_ref,
    packet_sha256: C.hash(packetBytes), source_sha256: C.hash(snapshotBytes),
    selected_pairs: [{ task_id: 'task-save-draft', persona_id: 'persona-junior' }],
    inspection: { method: 'browser', revision_verified: false, receipt: { path: 'checks/inspection.json', sha256: C.hash(receiptBytes) } },
    evidence: { captures: [], items: [] }, phases: [],
    journeys: [{
      id: 'journey-save-draft-junior', task_id: 'task-save-draft', persona_id: 'persona-junior',
      ac_ids: ['ac-1'], source: 'Reviewed task packet', verdict: 'NOT_RUN', steps: [],
      execution: { status: 'not-run', stop_reason: 'No walkthrough was attempted.', session_id: null, invocation_ids: [] },
    }],
  };
}

function testFullReviewAndWalkthroughBundle(root) {
  const input = makePacket(root, true);
  const parent = path.join(root, 'artifacts', 'DEMO-1', 'evaluation', 'full-review-1');
  fs.mkdirSync(path.dirname(parent), { recursive: true });
  const first = runSplit({ route: 'full', input: input.packetPath, output: parent, checks: 'classify' });
  assert.equal(first.status, 'awaiting-review');
  const parentDocs = C.loadRun(parent);
  assert.equal(parentDocs['pe-state.json'].workflow.status, 'awaiting-review');
  assert.equal(parentDocs['pe-evaluation-snapshot.json'].ac_results[0].verdict, 'NOT_RUN');
  const noApproval = path.join(root, 'artifacts', 'DEMO-1', 'evaluation', 'no-approval');
  assert.throws(() => runSplit({ route: 'full', 'continue-from': parent, output: noApproval }), /separate --approval decision/);
  assert.equal(fs.existsSync(noApproval), false);

  const packetBytes = fs.readFileSync(input.packetPath);
  const snapshotBytes = fs.readFileSync(input.snapshotPath);
  const bundleDirectory = path.join(root, 'producer');
  const bundle = makeNotRunBundle(bundleDirectory, parentDocs, packetBytes, snapshotBytes);
  validateBundle(parentDocs, bundle, C.hash(packetBytes));
  const invalidBundle = structuredClone(bundle);
  invalidBundle.journeys[0].execution.invocation_ids = ['invocation-started'];
  assert.throws(() => validateBundle(parentDocs, invalidBundle, C.hash(packetBytes)), /Invalid walkthrough bundle/);

  const approvalPath = path.join(root, 'approval.json');
  writeJson(approvalPath, {
    run_id: parentDocs['pe-context.json'].run_id, artifact_sha256: C.digest(parent),
    approved: true, recorded_at: utc(), purpose: 'continue-walkthroughs',
  });
  const bundlePath = path.join(bundleDirectory, 'bundle.json');
  writeJson(bundlePath, bundle);
  const child = path.join(root, 'artifacts', 'DEMO-1', 'evaluation', 'full-not-run-1');
  const result = runSplit({ route: 'full', 'continue-from': parent, approval: approvalPath, 'walkthrough-bundle': bundlePath, output: child });
  assert.equal(result.status, 'completed');
  const childDocs = C.loadRun(child);
  assert.equal(childDocs['pe-evaluation-snapshot.json'].journeys[0].execution.session_id, null);
  assert.equal(childDocs['pe-evaluation-snapshot.json'].journeys[0].verdict, 'NOT_RUN');
  const chat = runReport(child, '--chat');
  assert.match(chat, /Task outcome — task-save-draft\/persona-junior: \*\*not tried\*\*/);
  assert.doesNotMatch(chat, /Walkthrough task-save-draft\/persona-junior: (PASS|FAIL|NOT_RUN)/);
  const html = runReport(child);
  assert.match(html, /Rendered canonical report/);
  const report = fs.readFileSync(path.join(child, 'evaluation-report.html'), 'utf8');
  assert.match(report, /Task outcome/);
  assert.match(report, /not tried/);
  assert.doesNotMatch(report, /<td>(PASS|FAIL|NOT_RUN)<\/td>/);
}

const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'uxd-split-evaluation-'));
try {
  testPacketSourcePaths(temp);
  testFailedJudgmentUsage(temp);
  testLegacyCsvDoesNotVerify();
  testExplicitSelection();
  const input = makePacket(temp, true);
  const quickParent = path.join(temp, 'artifacts', 'DEMO-1', 'evaluation', 'quick-parent');
  fs.mkdirSync(path.dirname(quickParent), { recursive: true });
  runSplit({ route: 'quick', input: input.packetPath, output: quickParent, checks: 'classify' });
  assert.throws(() => runSplit({ route: 'full', 'verify-from': quickParent, output: path.join(temp, 'invalid-verification') }), /completed Full parent run/);
  const fullParent = path.join(temp, 'artifacts', 'DEMO-1', 'evaluation', 'full-review-1');
  fs.mkdirSync(path.dirname(fullParent), { recursive: true });
  runSplit({ route: 'full', input: input.packetPath, output: fullParent, checks: 'classify' });
  testCanonicalReportContract(temp, fullParent);
  testFullReviewAndWalkthroughBundle(path.join(temp, 'full-workflow'));
  process.stdout.write('Split evaluator regressions passed.\n');
} finally {
  fs.rmSync(temp, { recursive: true, force: true });
}
NODE
then
  echo "Test split-evaluation-contracts (canonical/split workflows):"
  echo "PASS"
  PASS_COUNT=$((PASS_COUNT + 1))
else
  echo "Test split-evaluation-contracts (canonical/split workflows):"
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
