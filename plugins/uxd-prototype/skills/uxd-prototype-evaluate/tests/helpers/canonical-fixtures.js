'use strict';

const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const C = require('../../scripts/artifacts/split-contract');
const { run } = require('../../scripts/run-split-evaluation');

const utc = () => new Date().toISOString();

function tempDirectory(t, prefix = 'uxd-canonical-contract-') {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), prefix));
  t.after(() => fs.rmSync(directory, { recursive: true, force: true }));
  return directory;
}

function writeJson(file, value) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, `${JSON.stringify(value, null, 2)}\n`);
}

function makePacket(root, { withCohort = false, approved = false } = {}) {
  const inputDir = path.join(root, 'inputs');
  fs.mkdirSync(inputDir, { recursive: true });
  const snapshotPath = path.join(inputDir, 'source.snapshot');
  fs.writeFileSync(snapshotPath, 'Synthetic, reviewed source snapshot.\n');

  const packet = {
    source: { kind: 'jira', id: 'DEMO-1', revision: 'ticket-revision-1', snapshot_path: 'source.snapshot' },
    prototype: { url: 'https://demo.invalid/prototype', revision: 'build-revision-1' },
    extract: {
      key: 'DEMO-1',
      title: 'Draft management',
      ac_list: [{
        criterion_id: 'AC-1',
        source_id: 'DEMO-1#AC-1',
        text: withCohort ? 'The saved draft title is visible.' : 'The server validates draft tokens.',
      }],
    },
    permissions: Object.fromEntries(['browser', 'provider', 'prototype_edits', 'report', 'sharing'].map(name => {
      const grant = approved && ['browser', 'provider'].includes(name);
      return [name, {
        status: grant ? 'approved' : 'not-requested',
        scope: grant ? 'Synthetic offline contract test only' : '',
        recorded_at: utc(),
      }];
    })),
  };

  if (withCohort) {
    packet.tasks = [{
      id: 'task-save-draft', title: 'Save a draft', ac_ids: ['ac-1'], target_route: '/drafts',
      screen_ids: ['screen-drafts'], state_ids: ['state-empty'], role_ids: ['role-designer'],
      fixture_ids: ['fixture-empty'], source_ids: ['DEMO-1#AC-1'],
      expected_outcome: 'The saved draft appears in the list.',
    }];
    packet.personas = [{
      id: 'persona-junior', label: 'Junior designer', experience: 'junior',
      task_ids: ['task-save-draft'], role_id: 'role-designer',
    }];
    packet.environment = {
      source_sections: [{ id: 'DEMO-1#AC-1', title: 'Acceptance criterion 1' }],
      screens: [{ id: 'screen-drafts', title: 'Draft list', route: '/drafts', source_ids: ['DEMO-1#AC-1'] }],
      states: [{
        id: 'state-empty', screen_id: 'screen-drafts', description: 'No drafts saved',
        expected_outcome: 'The draft list is empty.', source_ids: ['DEMO-1#AC-1'],
      }],
      roles: [{ id: 'role-designer', label: 'Designer', setup_only: false, permissions: [], resource_scope: 'Own drafts' }],
      fixtures: [{
        id: 'fixture-empty', description: 'Empty draft list', starting_state: 'No drafts exist.',
        reset: 'Clear all drafts.', state_ids: ['state-empty'],
      }],
    };
  }

  const packetPath = path.join(inputDir, 'packet.json');
  writeJson(packetPath, packet);
  return {
    packet,
    packetPath,
    snapshotPath,
    packetBytes: fs.readFileSync(packetPath),
    snapshotBytes: fs.readFileSync(snapshotPath),
  };
}

function createQuickRun(root) {
  const input = makePacket(root);
  const output = path.join(root, 'quick-run');
  const result = run({ route: 'quick', input: input.packetPath, output, checks: 'classify' });
  return { input, output, result };
}

function createFullCheckpoint(root) {
  const input = makePacket(root, { withCohort: true, approved: true });
  const output = path.join(root, 'full-checkpoint');
  const result = run({ route: 'full', input: input.packetPath, output, checks: 'classify' });
  return { input, output, result, docs: C.loadRun(output) };
}

function makeNotRunBundle(directory, docs, input) {
  const receiptPath = path.join(directory, 'checks', 'inspection.json');
  const receiptBytes = Buffer.from(JSON.stringify({ method: 'browser', result: 'not attempted' }));
  fs.mkdirSync(path.dirname(receiptPath), { recursive: true });
  fs.writeFileSync(receiptPath, receiptBytes);

  return {
    schema_version: 2,
    prototype_key: docs['pe-context.json'].prototype_key,
    prototype_revision: docs['pe-context.json'].intent.scope.source_ref,
    packet_sha256: C.hash(input.packetBytes),
    source_sha256: C.hash(input.snapshotBytes),
    selected_pairs: [{ task_id: 'task-save-draft', persona_id: 'persona-junior' }],
    inspection: {
      method: 'browser', revision_verified: false,
      receipt: { path: 'checks/inspection.json', sha256: C.hash(receiptBytes) },
    },
    evidence: { captures: [], items: [] },
    phases: [],
    journeys: [{
      id: 'journey-save-draft-junior', task_id: 'task-save-draft', persona_id: 'persona-junior',
      ac_ids: ['ac-1'], source: 'Reviewed task packet', verdict: 'NOT_RUN', steps: [],
      execution: {
        status: 'not-run', stop_reason: 'No walkthrough was attempted.',
        session_id: null, invocation_ids: [],
      },
    }],
  };
}

function makeObservedBundle(directory, docs, input, { verdict = 'FAIL', startsAfter = utc() } = {}) {
  const bundle = makeNotRunBundle(directory, docs, input);
  bundle.inspection.revision_verified = true;

  const png = Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jB5kAAAAASUVORK5CYII=',
    'base64',
  );
  const image = { path: 'evidence/observed.png', width: 1, height: 1, sha256: C.hash(png) };
  fs.mkdirSync(path.join(directory, 'evidence'), { recursive: true });
  fs.writeFileSync(path.join(directory, image.path), png);
  bundle.evidence.captures = [{
    id: 'capture-observed', url: 'https://demo.invalid/prototype',
    source_ref: bundle.prototype_revision, screen_id: 'screen-drafts', state_id: 'state-empty',
    viewport: { width: 1, height: 1, device_scale_factor: 1 }, captured_at: utc(),
    dom_digest: C.hash('Synthetic observation'), raw_image: image,
    page: { title: 'Drafts', headings: [], controls: [] },
  }];
  bundle.evidence.items = [{
    id: 'evidence-observed', capture_id: 'capture-observed', kind: 'full-page', purpose: 'ac',
    subject: { role: 'main', name: 'Draft list', locator: 'main' }, image,
  }];

  const firstStart = Date.parse(startsAfter) + 1000;
  const reference = (name, value) => {
    const file = path.join(directory, name);
    writeJson(file, value);
    return { path: name, sha256: C.hash(fs.readFileSync(file)) };
  };
  bundle.phases = [1, 2].map(sequence => {
    const context = `checks/context-${sequence}.json`;
    const result = `checks/result-${sequence}.json`;
    const started = new Date(firstStart + sequence * 10);
    const ended = new Date(started.getTime() + 5);
    return {
      task_id: 'task-save-draft', persona_id: 'persona-junior',
      invocation_id: `invocation-${sequence}`, sequence, session_id: 'session-junior',
      measurement: {
        name: 'journey', status: sequence === 1 ? 'failed' : 'completed', model_invoked: true,
        provider: 'openai', provider_id: 'openai', model: 'synthetic-test-model',
        started_at: started.toISOString(), ended_at: ended.toISOString(), duration_ms: null,
        input_files: 1, input_bytes: 10, output_bytes: 10,
        token_usage: { input: null, cached_input: null, output: null, reasoning_tokens: null },
        llm_cost_usd: sequence === 1 ? 0.1 : null,
      },
      context_status: 'captured', evidence_ids: sequence === 2 ? ['evidence-observed'] : [],
      submitted_context: reference(context, { synthetic: `Context ${sequence}` }),
      returned_result: reference(result, { result: sequence === 1 ? 'synthetic provider error' : 'Draft title observation' }),
    };
  });

  const passed = verdict === 'PASS';
  const journey = bundle.journeys[0];
  journey.verdict = passed ? 'PASS' : 'FAIL';
  journey.execution = {
    status: passed ? 'completed' : 'failed',
    stop_reason: passed ? 'Explicit check observed the draft title.' : 'Explicit check found the draft title absent.',
    session_id: 'session-junior', invocation_ids: ['invocation-1', 'invocation-2'],
  };
  journey.steps = [{
    id: 'step-verify-title', sequence: 1, invocation_id: 'invocation-2', action: 'verify',
    target: 'draft title', outcome: passed ? 'success' : 'failure',
    evidence_ids: ['evidence-observed'],
    note: passed ? 'Synthetic success observation.' : 'Synthetic failure observation.',
  }];
  bundle.ac_results = [{
    ac_id: 'ac-1', verdict: passed ? 'PASS' : 'FAIL',
    rationale: passed ? 'Draft title is visible.' : 'Draft title is absent.',
    evidence_ids: ['evidence-observed'], action_ids: [], evaluated_by: 'journey', updated_at: utc(),
  }];
  return bundle;
}

function createCompletedFullRun(root, { verdict = 'PASS' } = {}) {
  const checkpoint = createFullCheckpoint(root);
  const approval = {
    run_id: checkpoint.docs['pe-context.json'].run_id,
    artifact_sha256: C.digest(checkpoint.output),
    approved: true,
    recorded_at: utc(),
    purpose: 'continue-walkthroughs',
  };
  const approvalPath = path.join(root, 'approval.json');
  writeJson(approvalPath, approval);

  const producer = path.join(root, 'producer');
  fs.mkdirSync(producer, { recursive: true });
  const bundle = makeObservedBundle(producer, checkpoint.docs, checkpoint.input, {
    verdict, startsAfter: approval.recorded_at,
  });
  const bundlePath = path.join(producer, 'bundle.json');
  writeJson(bundlePath, bundle);

  const output = path.join(root, '.artifacts', 'DEMO-1', 'eval');
  fs.mkdirSync(path.dirname(output), { recursive: true });
  const result = run({
    route: 'full', 'continue-from': checkpoint.output, approval: approvalPath,
    'walkthrough-bundle': bundlePath, output,
  });
  return { ...checkpoint, approval, approvalPath, bundle, bundlePath, output, result, docs: C.loadRun(output) };
}

module.exports = {
  C,
  createCompletedFullRun,
  createFullCheckpoint,
  createQuickRun,
  makeNotRunBundle,
  makeObservedBundle,
  makePacket,
  tempDirectory,
  utc,
  writeJson,
};
