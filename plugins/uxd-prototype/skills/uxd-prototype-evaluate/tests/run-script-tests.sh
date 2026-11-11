#!/usr/bin/env bash
# run-script-tests.sh
#
# Canonical evaluator and source-companion contract regressions. No providers,
# browsers or prototype edits; generated runs stay in temporary directories.
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

run_validator "consistency/validate-consistency.js" "$FIXTURES_DIR/minimal/consistency" "minimal/consistency"

echo "--- Runtime regressions ---"
if node - "$SCRIPTS_DIR" <<'NODE'
const assert = require('assert/strict');
const path = require('path');

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

const { classifyCriterion } = require(classifierPath);
for (const [text, tier] of [
  ['The server validates tokens.', 'T3'],
  ['Status column displays ready state', 'T1'],
  ['The workflow is intuitive.', 'T4'],
]) {
  const result = classifyCriterion({ text });
  assert.equal(result.tier, tier);
  assert.equal(result.verdict, 'NOT_RUN');
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
const { buildDocuments } = require(path.join(scripts, 'artifacts', 'build-canonical-artifacts'));
const { run: runSplit } = require(path.join(scripts, 'run-split-evaluation'));
const { validateBundle } = require(path.join(scripts, 'task-verification', 'walkthrough-contract'));
const { validatePublishInput } = require(path.join(scripts, 'reporting', 'validate-publish-input'));
const { validateDocuments, validateDirectory } = require(path.join(scripts, 'artifacts', 'validate-canonical-artifacts'));
const synthesis = require(path.join(scripts, 'reporting', 'evaluation-synthesis'));

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

function testClassificationDoesNotVerify() {
    const { documents } = buildDocuments({
      extract: {
      key: 'DEMO-1', title: 'Classification test', extracted_at: utc(),
      ac_list: [{ criterion_id: 'AC-1', text: 'The server validates tokens.', source: 'jira' }],
      }, delta: { changed_files: [] }, consistency: {
      source_mode: { ran: false, violations: [] }, degraded: false, guidelines_version: 'not-run', summary: {},
      }, evidence: { prototype_url: 'https://demo.invalid/prototype', captured_at: utc() },
      rows: [{ criterion_id: 'AC-1', criterion_text: 'The server validates tokens.', source: 'jira', tier: 'T3', verdict: 'PASS' }],
    });
    const result = documents['pe-evaluation-snapshot.json'].ac_results[0];
    assert.equal(result.verdict, 'NOT_RUN');
    assert.equal(result.evaluated_by, null);
    assert.deepEqual(result.evidence_ids, []);
    assert.deepEqual(documents['pe-evidence.json'].captures, []);
    assert.deepEqual(documents['pe-context.json'].intent.personas, []);
    assert.deepEqual(documents['pe-context.json'].intent.tasks, []);
    assert.equal(Object.hasOwn(documents['pe-state.json'], 'cache'), false);
    assert.deepEqual(validateDocuments(documents), []);

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
    explicit['pe-context.json'].intent.tasks = [{ id: 'task-1', title: 'Check draft', ac_ids: ['ac-1'], target_route: '/drafts' }];
    explicit['pe-context.json'].intent.personas = [{ id: 'persona-prototype-user', label: 'Selected user', experience: 'mixed', task_ids: ['task-1'] }];
    const explicitEvidence = explicit['pe-evidence.json'];
    explicitEvidence.captures.push({ id: 'capture-explicit', url: 'https://demo.invalid/prototype',
      viewport: { width: 1440, height: 900, device_scale_factor: 1 }, captured_at: utc(),
      dom_digest: C.hash('Draft title absent'), page: { title: 'Drafts', headings: [], controls: [] } });
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

function testCanonicalReportAndPublisher(root, runDirectory) {
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
  assert.throws(() => validatePublishInput(csvOnly), /requires all five canonical JSON/);
  assert.notEqual(invoke(path.join(scripts, 'run-report.js'), [csvOnly]).status, 0);
  assert.equal(fs.existsSync(path.join(csvOnly, 'evaluation-report.html')), false);
  const legacy = path.join(root, 'legacy');
  fs.mkdirSync(legacy);
  fs.writeFileSync(path.join(legacy, 'evaluation-report.csv'), 'AC-1,PASS\n');
  fs.writeFileSync(path.join(legacy, 'evaluation-report.html'), '<p>Legacy report</p>');
  assert.throws(() => validatePublishInput(legacy), /requires all five canonical JSON/);
  assert.throws(() => validatePublishInput(legacy, { legacy: true }), /requires all five canonical JSON/);
  const legacyShell = spawnSync('bash', [publishScript, legacy, '--legacy', '--mode=invalid'], { cwd: skillRoot, encoding: 'utf8' });
  assert.notEqual(legacyShell.status, 0);
  assert.match(legacyShell.stderr, /Unknown flag: --legacy/);

  const index = invoke(path.join(scripts, 'reporting/generate-dashboard.js'), [root]);
  assert.equal(index.status, 0, index.stderr);
  const indexHtml = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
  assert.match(indexHtml, /legacy\//);
  assert.doesNotMatch(indexHtml, /<span class="badge badge-pass"|Pass Rate|All AC Pass/);
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

function testNoFixAndIntegrity(root) {
  const input = makePacket(root, false);
  const bytes = fs.readFileSync(input.packetPath);
  for (const [name, extra] of [['default', []], ['explicit', ['--no-fix']]]) {
    for (const runner of ['run-quick-checks.js', 'run-split-evaluation.js']) {
      const output = path.join(root, `${name}-${runner}`);
      const result = invoke(path.join(scripts, runner), [
        ...(runner === 'run-split-evaluation.js' ? ['--route', 'quick'] : []),
        '--input', input.packetPath, '--output', output, '--checks', 'classify', ...extra,
      ]);
      assert.equal(result.status, 0, result.stderr);
      const docs = C.loadRun(output);
      assert.equal(docs['pe-state.json'].lifecycle.exit_reason, 'no-fix');
      assert.equal(docs['pe-state.json'].permissions.prototype_edits.status, 'not-requested');
      assert.equal(Object.hasOwn(docs['pe-state.json'], 'cache'), false);
      assert.ok(docs['pe-state.json'].phases.every(p => !p.model_invoked));
      assert.ok(docs['pe-actions.json'].actions.every(a => a.status === 'proposed'));
      assert.equal(fs.existsSync(path.join(output, 'evaluation-report.csv')), false);
      assert.equal(fs.existsSync(path.join(output, 'evaluation-report.html')), false);
      assert.equal(fs.existsSync(path.join(output, 'refinement-suggestions.json')), false);
      assert.equal(fs.existsSync(path.join(root, 'cache')), false);
      for (const name of C.FILES) assert.ok(fs.existsSync(path.join(output, name)));
      assert.deepEqual(fs.readFileSync(input.packetPath), bytes);
      assert.throws(() => runSplit({ route: 'quick', input: input.packetPath, output, checks: 'classify' }), /fresh run directory/);
    }
  }
  const run = path.join(root, 'default-run-split-evaluation.js');
  const docs = C.loadRun(run);
  const altered = structuredClone(docs);
  altered['pe-state.json'].identity.compound_key = C.hash('wrong identity');
  assert.ok(validateDocuments(altered).some(e => e.code === 'compound_key_mismatch'));
  const source = path.join(run, 'inputs/source.snapshot');
  const sourceBytes = fs.readFileSync(source);
  fs.appendFileSync(source, 'tampered');
  assert.equal(validateDirectory(run).valid, false);
  // The removed legacy staging option must not weaken consumer validation.
  assert.equal(validateDirectory(run, { skipLinkedArtifacts: true }).valid, false);
  assert.throws(() => C.loadRun(run), /hash mismatch/);
  fs.writeFileSync(source, sourceBytes);
  const packet = path.join(run, 'inputs/packet.json');
  const packetBytes = fs.readFileSync(packet);
  fs.unlinkSync(packet);
  fs.symlinkSync(input.packetPath, packet);
  assert.throws(() => C.loadRun(run), /escapes|outside/);
  fs.unlinkSync(packet);
  fs.writeFileSync(packet, packetBytes);
  assert.equal(validateDirectory(run).valid, true);
  const statePath = path.join(run, 'pe-state.json');
  fs.unlinkSync(statePath);
  fs.writeFileSync(path.join(run, 'evaluation-report.csv'), 'AC-1,PASS\n');
  assert.notEqual(invoke(path.join(scripts, 'run-report.js'), [run, '--chat']).status, 0);
  writeJson(statePath, docs['pe-state.json']);
}

function testReviewedPlan(root) {
  const input = makePacket(root, true);
  const planPath = path.join(root, 'plan.json');
  const plan = {
    schema_version: 1, goal: 'Review draft creation', packet_sha256: C.hash(fs.readFileSync(input.packetPath)), reviewed_at: utc(),
    questions: [{ id: 'question-draft', text: 'Can the selected user save a draft?' }],
    allowed_checks: ['classify', 'walkthroughs'],
    limits: { max_model_invocations: 4, max_cost_usd: 1, stop_conditions: ['Stop at the review checkpoint.'] },
    steps: ['classify', 'walkthroughs'].map((check, i) => ({
      id: `step-${check}`, check, question_ids: ['question-draft'], rationale: 'Check only reviewed scope.',
      expected_evidence: ['Retained producer receipts.'], depends_on: i ? ['step-classify'] : [],
    })),
  };
  writeJson(planPath, plan);
  const parent = path.join(root, 'parent');
  const first = runSplit({ route: 'full', input: input.packetPath, output: parent, plan: planPath });
  assert.equal(first.status, 'awaiting-review');
  const parentDocs = C.loadRun(parent);
  const approval = path.join(root, 'approval.json');
  writeJson(approval, { run_id: first.run_id, artifact_sha256: first.artifact_sha256, approved: true, recorded_at: utc(), purpose: 'complete-without-walkthroughs' });
  const reserialized = path.join(root, 'reserialized.json');
  fs.writeFileSync(reserialized, JSON.stringify(plan));
  assert.throws(() => runSplit({ route: 'full', 'continue-from': parent, output: path.join(root, 'changed-plan'), approval, plan: reserialized }), /cannot replace the frozen plan/);
  const child = path.join(root, 'child');
  runSplit({ route: 'full', 'continue-from': parent, output: child, approval });
  const childDocs = C.loadRun(child);
  assert.deepEqual(fs.readFileSync(path.join(child, 'inputs/evaluation-plan.json')), fs.readFileSync(planPath));
  assert.deepEqual(childDocs['pe-state.json'].planning.own_usage, { model_invocations: 0, llm_cost_usd: 0, known_cost_usd: 0 });
  assert.deepEqual(childDocs['pe-state.json'].planning.prior_usage, parentDocs['pe-state.json'].planning.lineage_usage);
  assert.equal(childDocs['pe-state.json'].planning.execution[1].status, 'not-run');
}

function observedBundle(directory, docs, packetBytes, snapshotBytes) {
  const bundle = makeNotRunBundle(directory, docs, packetBytes, snapshotBytes);
  bundle.inspection.revision_verified = true;
  const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jB5kAAAAASUVORK5CYII=', 'base64');
  const image = { path: 'evidence/observed.png', width: 1, height: 1, sha256: C.hash(png) };
  fs.mkdirSync(path.join(directory, 'evidence'), { recursive: true });
  fs.writeFileSync(path.join(directory, image.path), png);
  bundle.evidence.captures = [{ id: 'capture-observed', url: 'https://demo.invalid/prototype',
    source_ref: bundle.prototype_revision, screen_id: 'screen-drafts', state_id: 'state-empty',
    viewport: { width: 1, height: 1, device_scale_factor: 1 }, captured_at: utc(),
    dom_digest: C.hash('Synthetic observation'), raw_image: image,
    page: { title: 'Drafts', headings: [], controls: [] } }];
  bundle.evidence.items = [{ id: 'evidence-observed', capture_id: 'capture-observed', kind: 'full-page', purpose: 'ac',
    subject: { role: 'main', name: 'Draft list', locator: 'main' }, image }];
  const start = Date.now();
  bundle.phases = [1, 2].map(sequence => {
    const context = `checks/context-${sequence}.json`, result = `checks/result-${sequence}.json`;
    writeJson(path.join(directory, context), { supplied_context: 'Synthetic test context' });
    writeJson(path.join(directory, result), { result: sequence === 1 ? 'provider error' : 'Draft title absent' });
    return { invocation_id: `invocation-${sequence}`, task_id: 'task-save-draft', persona_id: 'persona-junior',
      sequence, session_id: 'session-junior', context_status: 'captured', evidence_ids: sequence === 2 ? ['evidence-observed'] : [],
      submitted_context: { path: context, sha256: C.hash(fs.readFileSync(path.join(directory, context))) },
      returned_result: { path: result, sha256: C.hash(fs.readFileSync(path.join(directory, result))) },
      measurement: { name: 'journey', status: sequence === 1 ? 'failed' : 'completed', model_invoked: true,
        provider: 'openai', provider_id: 'openai', model: 'synthetic-test-model',
        started_at: new Date(start + sequence * 10).toISOString(), ended_at: new Date(start + sequence * 10 + 5).toISOString(),
        duration_ms: null, input_files: 1, input_bytes: 10, output_bytes: 10,
        token_usage: { input: null, cached_input: null, output: null, reasoning_tokens: null }, llm_cost_usd: sequence === 1 ? 0.1 : null } };
  });
  const journey = bundle.journeys[0];
  journey.verdict = 'FAIL';
  journey.execution = { status: 'failed', stop_reason: 'Explicit check found the draft title absent.', session_id: 'session-junior', invocation_ids: ['invocation-1', 'invocation-2'] };
  journey.steps = [{ id: 'step-verify-title', sequence: 1, invocation_id: 'invocation-2', action: 'verify', target: 'draft title', outcome: 'failure', evidence_ids: ['evidence-observed'], note: 'Synthetic failure observation.' }];
  bundle.ac_results = [{ ac_id: 'ac-1', verdict: 'FAIL', rationale: 'Draft title absent.', evidence_ids: ['evidence-observed'],
    action_ids: ['action-title'], evaluated_by: 'journey', updated_at: utc() }];
  bundle.proposed_actions = [{ id: 'action-title', kind: 'fix', status: 'proposed', priority: 'high', confidence: 'high',
    source: { ac_id: 'ac-1', finding_id: null, evidence_ids: ['evidence-observed'] }, target: { file: 'src/App.tsx', line: 1 },
    recommendation: 'Show the saved draft title.', result: { changed_files: [] }, handoff: { requires_user_invocation: true, skill: 'uxd-prototype-create', payload: {} } }];
  return bundle;
}

function testApprovedVerificationAndUsage(root) {
  const input = makePacket(root, true);
  const packet = JSON.parse(fs.readFileSync(input.packetPath));
  packet.extract.ac_list[0].text = 'The saved draft title is visible.';
  for (const key of ['browser', 'provider']) packet.permissions[key] = { status: 'approved', scope: 'Synthetic test only', recorded_at: utc() };
  writeJson(input.packetPath, packet);
  const parent = path.join(root, 'parent');
  const first = runSplit({ route: 'full', input: input.packetPath, output: parent, checks: 'classify' });
  const parentHash = C.digest(parent);
  const approval = path.join(root, 'approval.json');
  writeJson(approval, { run_id: first.run_id, artifact_sha256: C.hash('wrong snapshot'), approved: true, recorded_at: utc(), purpose: 'continue-walkthroughs' });
  assert.throws(() => runSplit({ route: 'full', 'continue-from': parent, output: path.join(root, 'bad-approval'), approval }), /exact reviewed canonical snapshot/);
  writeJson(approval, { run_id: first.run_id, artifact_sha256: parentHash, approved: true, recorded_at: utc(), purpose: 'continue-walkthroughs' });
  const producer = path.join(root, 'producer');
  const bundle = observedBundle(producer, C.loadRun(parent), fs.readFileSync(input.packetPath), fs.readFileSync(input.snapshotPath));
  const bundlePath = path.join(producer, 'bundle.json');
  writeJson(bundlePath, bundle);
  const denied = C.loadRun(parent);
  denied['pe-state.json'].permissions.provider.status = 'denied';
  assert.throws(() => require(path.join(scripts, 'task-verification/walkthrough-contract')).merge(denied, bundlePath, producer), /recorded browser and provider approval/);
  const completed = path.join(root, 'completed');
  runSplit({ route: 'full', 'continue-from': parent, output: completed, approval, 'walkthrough-bundle': bundlePath });
  assert.equal(C.digest(parent), parentHash);
  const docs = C.loadRun(completed);
  assert.equal(docs['pe-state.json'].lifecycle.exit_reason, 'no-fix');
  assert.equal(docs['pe-actions.json'].actions[0].status, 'proposed');
  assert.deepEqual(docs['pe-state.json'].usage_attribution.own_usage, { model_invocations: 2, llm_cost_usd: null, known_cost_usd: 0.1 });
  assert.deepEqual(docs['pe-state.json'].usage_attribution.lineage_usage, docs['pe-state.json'].usage_attribution.own_usage);
  const imagePath = path.join(completed, 'evidence/observed.png'), image = fs.readFileSync(imagePath);
  fs.appendFileSync(imagePath, 'tampered');
  assert.equal(validateDirectory(completed).valid, false);
  assert.notEqual(invoke(path.join(scripts, 'run-report.js'), [completed]).status, 0);
  fs.writeFileSync(imagePath, image);
  const escaped = structuredClone(bundle);
  escaped.phases[0].returned_result.path = '../escape.json';
  assert.throws(() => validateBundle(docs, escaped, bundle.packet_sha256), /Invalid walkthrough bundle/);
  const failedCall = structuredClone(bundle);
  failedCall.journeys[0].steps[0].invocation_id = 'invocation-1';
  assert.throws(() => validateBundle(docs, failedCall, bundle.packet_sha256), /failed provider call/);
  assert.match(runReport(completed, '--chat'), /Unknown|unknown/);
  runReport(completed);

  const fixApproval = path.join(root, 'fix-approval.json');
  writeJson(fixApproval, { run_id: docs['pe-context.json'].run_id, artifact_sha256: C.digest(completed), approved: true,
    recorded_at: utc(), purpose: 'prototype-edits', action_ids: ['action-title'] });
  packet.prototype.revision = 'build-revision-2';
  writeJson(input.packetPath, packet);
  const receipt = path.join(root, 'fix-receipt.json');
  writeJson(receipt, { action_ids: ['action-title'], before_revision: 'build-revision-1', after_revision: packet.prototype.revision, changed_files: ['src/App.tsx'], applied_at: utc() });
  const verificationProducer = path.join(root, 'verification-producer');
  const seed = structuredClone(docs);
  seed['pe-context.json'].intent.scope.source_ref = packet.prototype.revision;
  const verificationBundle = observedBundle(verificationProducer, seed, fs.readFileSync(input.packetPath), fs.readFileSync(input.snapshotPath));
  const verificationBundlePath = path.join(verificationProducer, 'bundle.json');
  writeJson(verificationBundlePath, verificationBundle);
  const verified = path.join(root, 'verified');
  assert.throws(() => runSplit({ route: 'full', 'verify-from': completed, input: input.packetPath, output: verified, checks: 'classify' }), /separate --approval decision/);
  runSplit({ route: 'full', 'verify-from': completed, input: input.packetPath, output: verified, checks: 'classify', approval: fixApproval, 'fix-receipt': receipt, 'walkthrough-bundle': verificationBundlePath });
  const verifiedDocs = C.loadRun(verified);
  assert.equal(verifiedDocs['pe-state.json'].workflow.pass, 2);
  assert.equal(verifiedDocs['pe-state.json'].usage_attribution.own_usage.model_invocations, 2);
  assert.equal(verifiedDocs['pe-state.json'].usage_attribution.prior_usage.model_invocations, 2);
  assert.equal(verifiedDocs['pe-state.json'].usage_attribution.lineage_usage.model_invocations, 4);
  assert.equal(verifiedDocs['pe-state.json'].usage_attribution.lineage_usage.llm_cost_usd, null);
  assert.equal(verifiedDocs['pe-actions.json'].actions.find(a => a.id === 'applied-action-title').status, 'applied');
  assert.match(runReport(verified, '--chat'), /Inherited|inherited/);
  writeJson(fixApproval, { run_id: verifiedDocs['pe-context.json'].run_id, artifact_sha256: C.digest(verified), approved: true, recorded_at: utc(), purpose: 'prototype-edits' });
  assert.throws(() => runSplit({ route: 'full', 'verify-from': verified, output: path.join(root, 'third-pass'), approval: fixApproval }), /Only one post-fix verification/);
}

function testQuickModelImport(root) {
  const input = makePacket(root, false);
  const packet = JSON.parse(fs.readFileSync(input.packetPath));
  packet.check_scope = { task: 'Inspect draft list', screen_ids: ['screen-drafts'], state_ids: ['state-empty'], source_ids: ['DEMO-1#AC-1'] };
  for (const key of ['browser', 'provider']) packet.permissions[key] = { status: 'approved', scope: 'Synthetic test only', recorded_at: utc() };
  writeJson(input.packetPath, packet);
  const producer = path.join(root, 'producer');
  const seed = { 'pe-context.json': { prototype_key: 'DEMO-1', intent: { scope: { source_ref: packet.prototype.revision } } } };
  const sample = observedBundle(producer, seed, fs.readFileSync(input.packetPath), fs.readFileSync(input.snapshotPath));
  const reference = (name, data) => {
    writeJson(path.join(producer, name), data);
    return { path: name, sha256: C.hash(fs.readFileSync(path.join(producer, name))) };
  };
  const phases = ['content', 'hierarchy', 'interaction'].map(lens => ({
    measurement: { ...sample.phases[1].measurement, name: `heuristic-${lens}`, checks: lens === 'hierarchy' ? ['heuristic', 'consistency-visual'] : ['heuristic'] },
    submitted_context: reference(`checks/model/${lens}-input.json`, { synthetic: 'Scoped input' }),
    returned_result: reference(`checks/model/${lens}-result.json`, { synthetic: 'Unreviewed findings' }),
    context_status: 'captured', evidence_ids: ['evidence-observed'],
  }));
  const bundle = {
    schema_version: 1, prototype_key: 'DEMO-1', prototype_revision: packet.prototype.revision,
    packet_sha256: C.hash(fs.readFileSync(input.packetPath)), source_sha256: C.hash(fs.readFileSync(input.snapshotPath)),
    scope: packet.check_scope,
    inspection: { method: 'browser', revision_verified: true, receipt: reference('checks/model/inspection.json', { synthetic: 'Verified test build' }) },
    evidence: sample.evidence, phases,
    results: {
      heuristic: { profile: 'prototype-specialists', framework: 'nielsen',
        coverage: Object.entries({ content: [2, 4, 5, 9, 10], hierarchy: [2, 4, 6, 8], interaction: [1, 3, 5, 9, 7] }).flatMap(([lens, ids]) => ids.map(heuristic_id => ({ lens, heuristic_id, status: 'assessed', evidence_ids: ['evidence-observed'], note: 'Synthetic bounded coverage.' }))),
        findings: [{ id: 'candidate-hierarchy', title: 'Synthetic hierarchy finding', screen_id: 'screen-drafts', state_id: 'state-empty',
          observation: 'Synthetic observation for contract testing.', heuristic_ids: [8], identified_by: ['hierarchy'], source_ids: ['DEMO-1#AC-1'],
          evidence_ids: ['evidence-observed'], review_status: 'unreviewed', suggested_severity: null, dissent: '' }],
      },
      'consistency-visual': { guidelines_version: 'synthetic-v1', guidelines_checked: 1, screenshots_checked: 1, findings: [] },
    },
    producers: { heuristic: { name: 'synthetic-heuristic', version: 'test' }, 'consistency-visual': { name: 'synthetic-visual', version: 'test' } },
  };
  const bundlePath = path.join(producer, 'judgment-bundle.json');
  writeJson(bundlePath, bundle);
  const output = path.join(root, 'quick');
  runSplit({ route: 'quick', input: input.packetPath, output, checks: 'heuristic,consistency-visual', 'judgment-bundle': bundlePath });
  const docs = C.loadRun(output);
  assert.equal(docs['pe-state.json'].usage_attribution.own_usage.model_invocations, 3);
  assert.equal(docs['pe-state.json'].usage_attribution.own_usage.llm_cost_usd, null);
  assert.equal(docs['pe-evaluation-snapshot.json'].heuristics.findings[0].review_status, 'unreviewed');
  assert.equal(docs['pe-evaluation-snapshot.json'].ac_results[0].verdict, 'NOT_RUN');
  assert.equal(docs['pe-evaluation-snapshot.json'].consistency.visual_checked, true);
  assert.ok(docs['pe-actions.json'].actions.every(a => a.status === 'proposed'));
  runReport(output);
  const receipt = path.join(output, 'checks/model/hierarchy-result.json');
  fs.appendFileSync(receipt, 'tampered');
  assert.equal(validateDirectory(output).valid, false);
}

const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'uxd-split-evaluation-'));
try {
  testClassificationDoesNotVerify();
  testExplicitSelection();
  const input = makePacket(temp, true);
  const fullParent = path.join(temp, 'artifacts', 'DEMO-1', 'evaluation', 'full-review-1');
  fs.mkdirSync(path.dirname(fullParent), { recursive: true });
  runSplit({ route: 'full', input: input.packetPath, output: fullParent, checks: 'classify' });
  testCanonicalReportAndPublisher(temp, fullParent);
  testFullReviewAndWalkthroughBundle(path.join(temp, 'full-workflow'));
  testNoFixAndIntegrity(path.join(temp, 'no-fix-integrity'));
  testReviewedPlan(path.join(temp, 'planning'));
  testApprovedVerificationAndUsage(path.join(temp, 'verification'));
  testQuickModelImport(path.join(temp, 'quick-model'));
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
