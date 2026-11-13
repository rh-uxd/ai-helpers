'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const test = require('node:test');

const C = require('../scripts/artifacts/split-contract');
const { buildDocuments } = require('../scripts/artifacts/build-canonical-artifacts');
const { validateDocuments, validateDirectory } = require('../scripts/artifacts/validate-canonical-artifacts');
const { run: runSplit } = require('../scripts/run-split-evaluation');
const { validateBundle } = require('../scripts/task-verification/walkthrough-contract');
const synthesis = require('../scripts/reporting/evaluation-synthesis');
const { validatePublishInput } = require('../scripts/reporting/validate-publish-input');
const {
  createCompletedFullRun,
  createFullCheckpoint,
  createQuickRun,
  makeNotRunBundle,
  makeObservedBundle,
  tempDirectory,
  utc,
  writeJson,
} = require('./helpers/canonical-fixtures');

const skillRoot = path.resolve(__dirname, '..');
const reportRunner = path.join(skillRoot, 'scripts', 'run-report.js');
const publisherPath = path.resolve(skillRoot, '../uxd-prototype-publish/scripts/submit_to_repo.py');
const canonicalFiles = [
  'pe-context.json',
  'pe-evaluation-snapshot.json',
  'pe-evidence.json',
  'pe-actions.json',
  'pe-state.json',
];

function runReport(runDirectory, ...args) {
  return spawnSync(process.execPath, [reportRunner, runDirectory, ...args], {
    cwd: skillRoot,
    encoding: 'utf8',
  });
}

function runPublisher(root, force = false, evalRun = '') {
  const python = `
import importlib.util, json, sys
spec = importlib.util.spec_from_file_location('prototype_publisher', sys.argv[1])
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)
try:
    summary, verdict = module.read_review_score('DEMO-1', eval_run=sys.argv[3] or None, force=sys.argv[2] == 'true')
except Exception as error:
    print(json.dumps({'error': str(error)}))
    sys.exit(2)
description = module.build_mr_description('DEMO-1', 'Synthetic prototype', summary, verdict, [])
print(json.dumps({'summary': summary, 'verdict': verdict, 'description': description}))
`;
  return spawnSync('python3', ['-c', python, publisherPath, String(force), evalRun], {
    cwd: root,
    encoding: 'utf8',
    env: { ...process.env, PYTHONDONTWRITEBYTECODE: '1' },
  });
}

function makePriorityDocs() {
  return {
    'pe-context.json': {
      run_id: 'priority-check', prototype_key: 'DEMO-1',
      intent: {
        title: 'Priority regression', acceptance_criteria: [],
        scope: { source_ref: 'synthetic-revision', source_mode: 'remote-only' },
      },
    },
    'pe-evaluation-snapshot.json': {
      status: 'needs-attention', ac_results: [], journeys: [],
      summary: {
        ac_counts: { pass: 0, fail: 0, flagged: 0, not_run: 0, total: 0 },
        consistency_counts: { error: 0, warning: 0, info: 1, total: 1 },
      },
      consistency: {
        status: 'flagged', guidelines_version: 'synthetic-v1',
        findings: [{
          id: 'info-note', origin: 'source', file: 'example.tsx', line: 1,
          severity: 'info', verdict: 'FLAGGED', confidence: 'low', guideline_id: 'test',
          guideline_title: 'Informational note', description: 'Synthetic note',
          recommendation: 'Review', review_candidate: false, evidence_ids: [],
        }],
      },
      heuristics: {
        profile: 'prototype-specialists', coverage: [],
        findings: [
          ['a-unrated', null], ['b-cosmetic', 'cosmetic'], ['c-major', 'major'], ['z-critical', 'critical'],
        ].map(([id, suggested_severity]) => ({
          id, title: id, suggested_severity, review_status: 'unreviewed',
          screen_id: 'screen-drafts', state_id: 'state-empty',
          observation: 'Synthetic observation', evidence_ids: [],
        })),
      },
      usability: { status: 'not-run' },
    },
    'pe-actions.json': { actions: [] },
    'pe-state.json': { phases: [], lifecycle: { status: 'completed' } },
  };
}

test('counts supported verdicts and rejects unknown, inherited, and missing values', () => {
  assert.deepEqual(C.counts([
    { verdict: 'PASS' }, { verdict: 'FAIL' }, { verdict: 'FLAGGED' }, { verdict: 'NOT_RUN' }, { verdict: 'PASS' },
  ]), { pass: 2, fail: 1, flagged: 1, not_run: 1, total: 5 });

  for (const verdict of ['UNKNOWN', 'toString', undefined]) {
    assert.throws(() => C.counts([{ verdict }]), /Unsupported verdict/);
  }
});

test('classification stays NOT_RUN and source-only PASS is rejected as verification', () => {
  const { documents } = buildDocuments({
    extract: {
      key: 'DEMO-1', title: 'Classification test', extracted_at: utc(),
      ac_list: [{ criterion_id: 'AC-1', text: 'The server validates tokens.', source: 'jira' }],
    },
    delta: { changed_files: [] },
    consistency: { source_mode: { ran: false, violations: [] }, degraded: false, guidelines_version: 'not-run', summary: {} },
    evidence: { prototype_url: 'https://demo.invalid/prototype', captured_at: utc() },
    rows: [{ criterion_id: 'AC-1', criterion_text: 'The server validates tokens.', source: 'jira', tier: 'T3', verdict: 'PASS' }],
  });

  const result = documents['pe-evaluation-snapshot.json'].ac_results[0];
  assert.equal(result.verdict, 'NOT_RUN');
  assert.equal(result.evaluated_by, null);
  assert.deepEqual(result.evidence_ids, []);
  assert.deepEqual(documents['pe-evidence.json'].captures, []);
  assert.deepEqual(validateDocuments(documents), []);

  const unverifiedPass = structuredClone(documents);
  unverifiedPass['pe-evaluation-snapshot.json'].ac_results[0] = {
    ...unverifiedPass['pe-evaluation-snapshot.json'].ac_results[0],
    verdict: 'PASS', evaluated_by: 'source',
  };
  unverifiedPass['pe-evaluation-snapshot.json'].summary.ac_counts = C.counts(
    unverifiedPass['pe-evaluation-snapshot.json'].ac_results,
  );
  const errors = validateDocuments(unverifiedPass);
  assert.ok(errors.some(error => error.code === 'source_classification_not_verification'));
  assert.ok(errors.some(error => error.code === 'missing_verification_evidence'));
});

test('canonical runs reject tampered linked hashes and symlink escapes', t => {
  const root = tempDirectory(t);
  const { input, output } = createQuickRun(root);
  assert.deepEqual(Object.keys(C.loadRun(output)).sort(), [...C.FILES].sort());

  const sourcePath = path.join(output, 'inputs', 'source.snapshot');
  const sourceBytes = fs.readFileSync(sourcePath);
  fs.appendFileSync(sourcePath, 'tampered');
  assert.equal(validateDirectory(output).valid, false);
  assert.throws(() => C.loadRun(output), /hash mismatch/i);
  fs.writeFileSync(sourcePath, sourceBytes);
  assert.equal(validateDirectory(output).valid, true);

  const packetPath = path.join(output, 'inputs', 'packet.json');
  fs.unlinkSync(packetPath);
  fs.symlinkSync(input.packetPath, packetPath);
  assert.throws(() => C.loadRun(output), /escapes? (?:the )?run|outside|symlink/i);
});

test('full continuation requires approval bound to the exact parent run and digest', t => {
  const root = tempDirectory(t);
  const checkpoint = createFullCheckpoint(root);
  const expectedRunId = checkpoint.docs['pe-context.json'].run_id;
  const expectedDigest = C.digest(checkpoint.output);

  const noApprovalOutput = path.join(root, 'no-approval');
  assert.throws(() => runSplit({
    route: 'full', 'continue-from': checkpoint.output, output: noApprovalOutput,
  }), /separate --approval decision/);
  assert.equal(fs.existsSync(noApprovalOutput), false);

  const writeApproval = (name, changes = {}) => {
    const approvalPath = path.join(root, `${name}.json`);
    writeJson(approvalPath, {
      run_id: expectedRunId, artifact_sha256: expectedDigest, approved: true,
      recorded_at: utc(), purpose: 'complete-without-walkthroughs', ...changes,
    });
    return approvalPath;
  };
  for (const [name, changes] of [
    ['wrong-run', { run_id: 'eval-other-run' }],
    ['wrong-digest', { artifact_sha256: C.hash('different reviewed bytes') }],
  ]) {
    const output = path.join(root, `${name}-output`);
    assert.throws(() => runSplit({
      route: 'full', 'continue-from': checkpoint.output,
      approval: writeApproval(name, changes), output,
    }), /exact reviewed canonical snapshot/);
    assert.equal(fs.existsSync(output), false);
  }

  const output = path.join(root, 'approved-continuation');
  runSplit({
    route: 'full', 'continue-from': checkpoint.output,
    approval: writeApproval('correct-approval'), output,
  });
  const continued = C.loadRun(output);
  assert.equal(continued['pe-state.json'].workflow.parent_run_id, expectedRunId);
  assert.equal(continued['pe-state.json'].workflow.status, 'completed');
});

test('walkthrough bundles reject identity mismatch, traversal, and observations from failed calls', t => {
  const root = tempDirectory(t);
  const checkpoint = createFullCheckpoint(root);
  const producer = path.join(root, 'producer');
  fs.mkdirSync(producer, { recursive: true });
  const packetHash = C.hash(checkpoint.input.packetBytes);
  const valid = makeNotRunBundle(producer, checkpoint.docs, checkpoint.input);

  assert.equal(validateBundle(checkpoint.docs, valid, packetHash).length, 1);

  const wrongIdentity = structuredClone(valid);
  wrongIdentity.prototype_revision = 'different-build';
  assert.throws(() => validateBundle(checkpoint.docs, wrongIdentity, packetHash), /input identity mismatch/);

  const traversal = structuredClone(valid);
  traversal.inspection.receipt.path = '../outside.json';
  assert.throws(() => validateBundle(checkpoint.docs, traversal, packetHash), /Invalid walkthrough bundle/);

  const observed = makeObservedBundle(path.join(root, 'observed-producer'), checkpoint.docs, checkpoint.input);
  observed.journeys[0].steps[0].invocation_id = 'invocation-1';
  assert.throws(() => validateBundle(checkpoint.docs, observed, packetHash), /failed provider call/);
});

test('synthesis ranks critical heuristics and renders stopped journey statuses', () => {
  const prioritized = synthesis.build(makePriorityDocs());
  assert.deepEqual(prioritized.findings.map(finding => finding.id), [
    'z-critical', 'c-major', 'info-note', 'b-cosmetic', 'a-unrated',
  ]);

  for (const status of ['blocked', 'incomplete', 'failed', 'completed']) {
    const docs = makePriorityDocs();
    docs['pe-evaluation-snapshot.json'].journeys = [{
      id: 'journey-test', task_id: 'task-test', persona_id: 'persona-test',
      verdict: status === 'completed' ? 'PASS' : 'NOT_RUN', steps: [],
      execution: { status, stop_reason: 'Synthetic stop' },
    }];
    const summary = synthesis.build(docs);
    const message = `Walkthrough task-test/persona-test ended ${status}: Synthetic stop`;
    assert.equal(summary.uncertainty.includes(message), status !== 'completed');
    assert.equal(synthesis.chatMarkdown(summary).includes(message), status !== 'completed');
  }
});

test('classifier module import does not inspect the caller CLI arguments', () => {
  const classifierPath = require.resolve('../scripts/classification/run-classification');
  const originalArgv = process.argv;
  try {
    process.argv = new Proxy(originalArgv, {
      get(target, property, receiver) {
        if (property === 'slice') throw new Error('module import read caller argv');
        return Reflect.get(target, property, receiver);
      },
    });
    delete require.cache[classifierPath];
    const { classifyCriterion } = require(classifierPath);
    assert.equal(typeof classifyCriterion, 'function');
  } finally {
    process.argv = originalArgv;
    delete require.cache[classifierPath];
  }
});

test('canonical producer, validator, and report agree on filenames and NOT_RUN output', t => {
  const root = tempDirectory(t);
  const { output } = createQuickRun(root);

  assert.deepEqual(C.FILES, canonicalFiles);
  assert.deepEqual(Object.keys(C.loadRun(output)).sort(), [...canonicalFiles].sort());
  assert.equal(validateDirectory(output).valid, true);

  const chat = runReport(output, '--chat');
  assert.equal(chat.status, 0, chat.stderr || chat.stdout);
  assert.match(chat.stdout, /NOT_RUN — not tested/);
  assert.match(chat.stdout, /Not verified; classification: backend-only/);

  const rendered = runReport(output);
  assert.equal(rendered.status, 0, rendered.stderr || rendered.stdout);
  assert.match(rendered.stdout, /Rendered canonical report/);
  const html = fs.readFileSync(path.join(output, 'evaluation-report.html'), 'utf8');
  assert.match(html, /Requirement verdict/);
  assert.match(html, /NOT_RUN — not tested/);
  assert.equal(validatePublishInput(output).mode, 'canonical');

  fs.appendFileSync(path.join(output, 'evaluation-report.html'), '\n<!-- tampered -->\n');
  assert.throws(() => validatePublishInput(output), /integrity receipt/);
  runReport(output);
  assert.equal(validatePublishInput(output).mode, 'canonical');
});

test('publisher recognizes evidence-linked PASS using canonical filenames', t => {
  const root = tempDirectory(t);
  const run = createCompletedFullRun(root, { verdict: 'PASS' });
  assert.deepEqual(fs.readdirSync(run.output).filter(name => C.FILES.includes(name)).sort(), [...canonicalFiles].sort());

  const result = runPublisher(root);
  assert.equal(result.status, 0, result.stderr || result.stdout);
  const publication = JSON.parse(result.stdout);
  assert.equal(publication.verdict, 'eval-pass');
  assert.match(publication.summary, /1\/1 PASS, 0 FAIL, 0 FLAGGED, 0 NOT_RUN/);
  assert.match(publication.description, /verified selected ACs/);
});

test('checked-in publish fixture reaches canonical AC FAIL gating, not missing-input handling', () => {
  const fixture = path.resolve(skillRoot, '../uxd-prototype-publish/eval/cases/blocks-ac-fail');
  const selectedRun = '.artifacts/DEMO-1/eval';
  const docs = C.loadRun(path.join(fixture, selectedRun));
  assert.equal(docs['pe-state.json'].workflow.status, 'completed');
  assert.equal(docs['pe-evaluation-snapshot.json'].ac_results[0].verdict, 'FAIL');
  const prototype = path.join(fixture, '.artifacts/DEMO-1');
  assert.match(JSON.parse(fs.readFileSync(path.join(prototype, 'metadata.json'), 'utf8')).title, /Draft/);
  assert.match(fs.readFileSync(path.join(prototype, 'prototype/index.html'), 'utf8'), /<h1>Drafts<\/h1>/);

  const blocked = runPublisher(fixture, false, selectedRun);
  assert.equal(blocked.status, 2);
  assert.match(JSON.parse(blocked.stdout).error, /failed ACs/);
});

test('publisher blocks FAIL as success, allows explicit attention, and ignores CSV-only runs', t => {
  const failedRoot = tempDirectory(t, 'uxd-canonical-fail-');
  createCompletedFullRun(failedRoot, { verdict: 'FAIL' });

  const blocked = runPublisher(failedRoot);
  assert.equal(blocked.status, 2);
  assert.match(JSON.parse(blocked.stdout).error, /failed ACs/);

  const forced = runPublisher(failedRoot, true);
  assert.equal(forced.status, 0, forced.stderr || forced.stdout);
  const failedPublication = JSON.parse(forced.stdout);
  assert.equal(failedPublication.verdict, 'needs-attention');
  assert.match(failedPublication.summary, /0\/1 PASS, 1 FAIL/);
  assert.match(failedPublication.description, /needs attention \/ unverified/);

  const legacyRoot = tempDirectory(t, 'uxd-canonical-csv-only-');
  const legacyRun = path.join(legacyRoot, '.artifacts', 'DEMO-1', 'eval');
  fs.mkdirSync(legacyRun, { recursive: true });
  fs.writeFileSync(path.join(legacyRun, 'evaluation-report.csv'), 'AC-1,PASS\n');
  fs.writeFileSync(path.join(legacyRun, 'evaluation-report.html'), '<p>Legacy report</p>');

  const legacy = runPublisher(legacyRoot);
  assert.equal(legacy.status, 0, legacy.stderr || legacy.stdout);
  const legacyPublication = JSON.parse(legacy.stdout);
  assert.equal(legacyPublication.summary, null);
  assert.equal(legacyPublication.verdict, null);
  assert.match(legacyPublication.description, /Not evaluated — no verified AC claim/);
});
