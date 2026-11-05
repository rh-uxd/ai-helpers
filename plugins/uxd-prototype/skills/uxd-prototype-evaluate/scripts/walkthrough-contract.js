'use strict';

// One producer/import contract for independent and evaluator-prepared work.
// Receipt validation establishes attribution, not proof that a host told the truth.
const fs = require('fs');
const path = require('path');
const Ajv2020 = require('ajv/dist/2020');
const addFormats = require('ajv-formats');
const C = require('./split-contract');
const pairKey = p => JSON.stringify([p.task_id, p.persona_id]);
const pairsFor = intent => intent.personas.flatMap(p => p.task_ids.map(task_id => ({ task_id, persona_id: p.id })));
const samePairs = (a, b) => C.isDeepStrictEqual(a.map(pairKey).sort(), b.map(pairKey).sort());
const requireThat = (ok, message) => { if (!ok) throw new Error(message); };
let schema;
function validateShape(bundle) {
  if (!schema) {
    const ajv = new Ajv2020({ allErrors: true, strict: true });
    addFormats(ajv);
    const root = path.resolve(__dirname, '../schemas/v1');
    for (const name of fs.readdirSync(root).filter(n => n.endsWith('.schema.json'))) ajv.addSchema(C.read(path.join(root, name)));
    schema = ajv.getSchema('https://ai-helpers.uxd/schemas/v1/walkthrough-bundle.schema.json');
  }
  requireThat(schema(bundle), `Invalid walkthrough bundle: ${JSON.stringify(schema.errors)}`);
}

function readiness(docs) {
  const intent = docs['brief.json'].intent;
  requireThat(intent.environment && intent.tasks.length && intent.personas.length && pairsFor(intent).length, 'Walkthroughs need explicit environment, tasks and selected personas');
  for (const task of intent.tasks) {
    for (const field of ['screen_ids', 'state_ids', 'role_ids', 'fixture_ids', 'source_ids', 'expected_outcome']) requireThat(task[field] !== undefined, `Walkthrough task needs ${field}`);
    for (const field of ['screen_ids', 'state_ids', 'role_ids']) requireThat(task[field].length, `Walkthrough task needs nonempty ${field}`);
  }
  for (const persona of intent.personas) requireThat(persona.role_id && persona.task_ids.length, 'Walkthrough persona needs an explicit role and selected tasks');
  const errors = require('./validate-canonical-artifacts').validateDocuments(docs);
  requireThat(!errors.length, `Walkthrough readiness failed: ${JSON.stringify(errors)}`);
}

function validateBundle(docs, bundle, packetHash) {
  validateShape(bundle);
  const brief = docs['brief.json'];
  const intent = brief.intent;
  const v2 = bundle.schema_version === 2;
  const pairs = pairsFor(intent);
  requireThat(bundle.prototype_key === brief.prototype_key && bundle.prototype_revision === intent.scope.source_ref && bundle.packet_sha256 === packetHash && bundle.source_sha256 === intent.source_input.sha256, 'Walkthrough bundle input identity mismatch');
  requireThat(samePairs(bundle.selected_pairs, pairs), 'Walkthrough selection differs from the frozen task/persona cohort');
  requireThat(samePairs(bundle.journeys, pairs), 'Each selected task/persona pair requires exactly one journey, including blocked results');
  const evidence = new Map(bundle.evidence.items.map(i => [i.id, i]));
  const captures = new Map(bundle.evidence.captures.map(c => [c.id, c]));
  requireThat(evidence.size === bundle.evidence.items.length && captures.size === bundle.evidence.captures.length, 'Duplicate walkthrough evidence/capture ID');
  for (const capture of captures.values()) requireThat(capture.source_ref === intent.scope.source_ref && capture.screen_id && capture.state_id, 'Capture revision/screen/state is missing or stale');
  for (const item of evidence.values()) requireThat(captures.has(item.capture_id), 'Evidence needs a known capture');
  const phaseIds = new Set(); const resultPaths = new Set(); const sessions = new Map(); const owners = new Map();
  const phasesByPair = new Map(pairs.map(p => [pairKey(p), []]));
  const phaseEvidence = (ids, task, owner) => {
    for (const id of ids) {
      const capture = captures.get(evidence.get(id)?.capture_id);
      requireThat(capture && task.screen_ids.includes(capture.screen_id) && task.state_ids.includes(capture.state_id), 'Submitted phase evidence is outside task scope');
      // A capture cannot stand in for observations from two isolated pairs.
      const key = capture.id;
      requireThat(!owners.has(key) || owners.get(key) === owner, 'Evidence capture belongs to another task/persona pair');
      owners.set(key, owner);
    }
  };
  for (const entry of bundle.phases) {
    const owner = pairKey(entry); const calls = phasesByPair.get(owner); const m = entry.measurement;
    requireThat(calls, 'Phase receipts do not match selected pairs');
    requireThat(['journey', 'usability'].includes(m.name) && m.model_invoked && m.provider !== 'none' && m.model.trim() && (v2 ? ['completed', 'failed'].includes(m.status) : m.status === 'completed'), 'Walkthrough phase requires actual model identity and captured context');
    requireThat(Date.parse(m.ended_at) >= Date.parse(m.started_at), 'Walkthrough phase timestamps are reversed');
    requireThat(!resultPaths.has(entry.returned_result.path), 'Duplicate returned-result receipt across invocations'); resultPaths.add(entry.returned_result.path);
    // Canonical attribution is derived from the entry, never silently overwritten.
    for (const field of ['task_id', 'persona_id', 'invocation_id']) requireThat(m[field] === undefined || m[field] === entry[field], 'Conflicting measurement attribution');
    if (v2) {
      requireThat(entry.invocation_id && entry.session_id && entry.sequence === calls.length + 1 && m.provider_id?.trim(), 'v2 invocation needs unique ID, ordered sequence, isolated session and exact provider_id');
      requireThat(!phaseIds.has(entry.invocation_id), 'Duplicate invocation ID'); phaseIds.add(entry.invocation_id);
      requireThat(!calls.length || Date.parse(m.started_at) >= Date.parse(calls.at(-1).measurement.ended_at), 'Invocation order overlaps or reverses within a pair');
      requireThat(!sessions.has(entry.session_id) || sessions.get(entry.session_id) === entry.persona_id, 'Browser/model session is shared across personas'); sessions.set(entry.session_id, entry.persona_id);
    } else requireThat(!entry.invocation_id && !entry.sequence && !entry.session_id && !m.invocation_id, 'v2 invocation fields require bundle schema_version 2');
    const task = intent.tasks.find(t => t.id === entry.task_id);
    phaseEvidence(entry.evidence_ids, task, owner);
    calls.push(entry);
  }
  for (const journey of bundle.journeys) {
    const calls = phasesByPair.get(pairKey(journey)); const task = intent.tasks.find(t => t.id === journey.task_id);
    requireThat(journey.ac_ids.every(id => task.ac_ids.includes(id)), 'Journey ACs are outside task scope');
    if (v2) {
      const x = journey.execution;
      requireThat(x && C.isDeepStrictEqual(x.invocation_ids, calls.map(c => c.invocation_id)), 'Journey must link every actual invocation in order');
      requireThat(calls.every(c => c.session_id === x.session_id), 'Journey invocation session mismatch');
      requireThat(!sessions.has(x.session_id) || sessions.get(x.session_id) === journey.persona_id, 'Browser/model session is shared across personas'); sessions.set(x.session_id, journey.persona_id);
      const verdicts = { completed: 'PASS', failed: 'FAIL', blocked: 'FLAGGED', incomplete: 'FLAGGED', 'not-run': 'NOT_RUN' };
      requireThat(journey.verdict === verdicts[x.status], 'Journey verdict does not match execution outcome');
      requireThat(x.status !== 'not-run' || (!calls.length && !journey.steps.length), 'NOT_RUN cannot contain executed work');
      requireThat(!['completed', 'failed'].includes(x.status) || calls.some(c => c.measurement.status === 'completed'), 'Completed/failed task requires a completed invocation receipt');
      requireThat(x.status !== 'completed' || journey.steps.length, 'Completed task needs observed steps');
    } else requireThat(calls.length === 1 && journey.steps.length && !journey.execution && journey.steps.every(s => !s.invocation_id), 'Legacy v1 requires one completed invocation per pair; use v2 for multi-call or unexecuted results');
    let lastSequence = 0; let lastCall = 0;
    for (const step of journey.steps) {
      requireThat(step.sequence > lastSequence, 'Journey observations must be ordered'); lastSequence = step.sequence;
      const entry = v2 ? calls.find(c => c.invocation_id === step.invocation_id) : calls[0];
      requireThat(entry && (!v2 || entry.sequence >= lastCall), 'Observation needs an ordered invocation from its own pair'); lastCall = entry.sequence || 0;
      requireThat(entry.measurement.status === 'completed', 'A failed provider call cannot supply observed task steps');
      requireThat(step.evidence_ids.length && step.evidence_ids.every(id => entry.evidence_ids.includes(id)), 'Journey step needs evidence from its own invocation');
    }
    requireThat(journey.verdict !== 'PASS' || journey.steps.every(s => s.outcome === 'success'), 'A blocked, partial or failed journey cannot PASS');
    requireThat(journey.verdict !== 'FAIL' || journey.steps.some(s => s.outcome === 'failure'), 'A failed journey needs an observed failing step');
    const observed = journey.steps.length > 0;
    requireThat(!observed || journey.steps.some(s => s.evidence_ids.some(id => evidence.get(id)?.image)), 'Every observed walkthrough needs screenshot evidence');
    requireThat(bundle.inspection.revision_verified || (!observed && !['PASS', 'FAIL'].includes(journey.verdict)), 'Observed walkthrough evidence needs browser revision verification');
  }
  requireThat(v2 || bundle.inspection.revision_verified, 'Legacy walkthrough evidence needs browser revision verification');
  requireThat([...captures.keys()].every(id => owners.has(id)) && [...evidence.keys()].every(id => bundle.phases.some(p => p.evidence_ids.includes(id))), 'Unattributed walkthrough evidence');
  const seen = new Set();
  for (const result of bundle.ac_results || []) {
    const current = docs['evaluation.json'].ac_results.find(r => r.ac_id === result.ac_id);
    const criterion = intent.acceptance_criteria.find(ac => ac.id === result.ac_id);
    requireThat(current && !seen.has(result.ac_id) && result.evaluated_by === 'journey' && result.evidence_ids.length, 'Explicit AC check is invalid or duplicated'); seen.add(result.ac_id);
    requireThat(!['PASS', 'FAIL'].includes(result.verdict) || criterion.verification_mode === 'ui', 'Browser evidence cannot verify non-UI criteria');
    requireThat(bundle.journeys.some(j => j.ac_ids.includes(result.ac_id) && result.evidence_ids.every(id => j.steps.some(s => s.evidence_ids.includes(id) && s.action === 'verify'))), 'AC verdict lacks task-linked explicit verification evidence');
  }
  for (const action of bundle.proposed_actions || []) requireThat(action.kind === 'fix' && action.status === 'proposed' && action.handoff?.requires_user_invocation === true && action.source.evidence_ids.length && bundle.ac_results?.some(r => r.ac_id === action.source.ac_id && r.verdict === 'FAIL' && r.action_ids.includes(action.id) && action.source.evidence_ids.every(id => r.evidence_ids.includes(id))), 'Proposed fix must link an explicitly failed AC and its observed evidence');
  return pairs;
}

function measurements(bundle) {
  return bundle.phases.map(p => ({ ...p.measurement, ...(bundle.schema_version === 2 ? { invocation_id: p.invocation_id, task_id: p.task_id, persona_id: p.persona_id } : {}), started_at: new Date(p.measurement.started_at).toISOString(), ended_at: new Date(p.measurement.ended_at).toISOString() }));
}

function merge(docs, bundleFile, stage) {
  readiness(docs);
  const bundle = C.read(bundleFile);
  const permissions = docs['state.json'].permissions;
  // Recording an unexecuted outcome does not require granting denied activity.
  if (bundle.phases?.length || bundle.evidence?.captures?.length || bundle.inspection?.revision_verified) requireThat(permissions?.browser.status === 'approved' && permissions?.provider.status === 'approved', 'Walkthroughs require recorded browser and provider approval');
  const pairs = validateBundle(docs, bundle, C.hash(fs.readFileSync(path.join(stage, 'inputs/packet.json'))));
  const root = path.dirname(path.resolve(bundleFile));
  // A walkthrough call cannot borrow an inherited Quick result receipt even if
  // the bytes match. Shared input context is allowed; returned calls are distinct.
  requireThat(bundle.phases.every(p => !fs.existsSync(path.join(stage, p.returned_result.path))), 'Returned-result receipt collides with inherited work');
  C.copyReference(root, stage, bundle.inspection.receipt);
  for (const entry of bundle.phases) { C.copyReference(root, stage, entry.submitted_context); C.copyReference(root, stage, entry.returned_result); }
  for (const capture of bundle.evidence.captures) if (capture.raw_image) C.copyReference(root, stage, capture.raw_image);
  for (const item of bundle.evidence.items) if (item.image) C.copyReference(root, stage, item.image);
  for (const collection of ['captures', 'items']) {
    const existing = new Set(docs['evidence.json'][collection].map(i => i.id));
    requireThat(!bundle.evidence[collection].some(i => existing.has(i.id)), 'Evidence ID collision across checks');
    docs['evidence.json'][collection].push(...bundle.evidence[collection]);
  }
  docs['state.json'].phases.push(...measurements(bundle));
  const evaluation = docs['evaluation.json'];
  evaluation.journeys = bundle.journeys;
  for (const result of bundle.ac_results || []) Object.assign(evaluation.ac_results.find(r => r.ac_id === result.ac_id), result);
  docs['actions.json'].actions.push(...(bundle.proposed_actions || []));
  evaluation.summary.ac_counts = C.counts(evaluation.ac_results);
  evaluation.summary.journey_counts = C.counts(evaluation.journeys);
  evaluation.status = 'needs-attention';
  C.write(stage, 'checks/walkthrough-bundle.json', bundle);
  return pairs;
}

function validatePublished(docs, root) {
  const workflow = docs['state.json'].workflow;
  if (!workflow) return;
  const readReference = ref => JSON.parse(C.referenceBytes(root, ref));
  const receipt = readReference({ path: workflow.receipt_path, sha256: workflow.receipt_sha256 });
  const packet = readReference({ path: 'inputs/packet.json', sha256: receipt.packet_sha256 });
  const intent = docs['brief.json'].intent;
  for (const key of ['tasks', 'personas', 'environment']) requireThat(C.isDeepStrictEqual(intent[key], packet[key] || (key === 'environment' ? undefined : [])), 'Canonical walkthrough context differs from frozen packet');
  requireThat(intent.scope.source_ref === packet.prototype.revision && intent.scope.prototype_url === packet.prototype.url, 'Canonical build differs from frozen packet');
  for (const key of ['route', 'status', 'pass', 'parent_run_id', 'selected_pairs']) requireThat(C.isDeepStrictEqual(receipt[key], workflow[key]), 'Workflow receipt disagrees with canonical state');
  if (!receipt.walkthrough_bundle) { requireThat(!workflow.selected_pairs.length && !docs['evaluation.json'].journeys.length, 'Executed pairs need a walkthrough bundle'); return; }
  const bundle = readReference(receipt.walkthrough_bundle);
  validateBundle(docs, bundle, receipt.packet_sha256);
  if (bundle.phases.length || bundle.evidence.captures.length || bundle.inspection.revision_verified) requireThat(docs['state.json'].permissions?.browser.status === 'approved' && docs['state.json'].permissions?.provider.status === 'approved', 'Executed walkthrough work needs browser/provider approval');
  if (workflow.route === 'full') {
    const approval = receipt.approval;
    requireThat(workflow.parent_run_id && approval?.approved === true && approval.run_id === workflow.parent_run_id && ['continue-walkthroughs', 'prototype-edits'].includes(approval.purpose), 'Full walkthroughs require a separate parent-bound review decision');
    requireThat(bundle.phases.every(p => Date.parse(p.measurement.started_at) >= Date.parse(approval.recorded_at)), 'Full walkthrough execution predates its review decision');
  }
  C.referenceBytes(root, bundle.inspection.receipt);
  for (const entry of bundle.phases) { C.referenceBytes(root, entry.submitted_context); C.referenceBytes(root, entry.returned_result); }
  for (const capture of bundle.evidence.captures) if (capture.raw_image) C.referenceBytes(root, capture.raw_image);
  for (const item of bundle.evidence.items) if (item.image) C.referenceBytes(root, item.image);
  requireThat(samePairs(workflow.selected_pairs, bundle.selected_pairs) && C.isDeepStrictEqual(docs['evaluation.json'].journeys, bundle.journeys), 'Canonical journeys disagree with producer bundle');
  requireThat(C.isDeepStrictEqual(docs['state.json'].phases.filter(p => ['journey', 'usability'].includes(p.name) && p.model_invoked), measurements(bundle)), 'Canonical invocations disagree with producer receipts');
  for (const result of bundle.ac_results || []) {
    const current = docs['evaluation.json'].ac_results.find(r => r.ac_id === result.ac_id);
    // The existing post-fix composer adds applied-action lineage, not verdicts.
    const extras = current.action_ids.filter(id => !result.action_ids.includes(id));
    requireThat(extras.every(id => docs['actions.json'].actions.some(a => a.id === id && a.kind === 'fix' && a.status === 'applied' && a.source.origin_run_id === workflow.parent_run_id)), 'AC check has unsupported extra actions');
    requireThat(C.isDeepStrictEqual({ ...current, action_ids: result.action_ids }, result) && result.action_ids.every(id => current.action_ids.includes(id)), 'Canonical AC check disagrees with producer bundle');
  }
  for (const result of docs['evaluation.json'].ac_results) if (result.evaluated_by === 'journey' && result.verdict !== 'NOT_RUN') requireThat(bundle.ac_results?.some(r => r.ac_id === result.ac_id), 'AC verdict has no explicit producer verification');
  for (const collection of ['captures', 'items']) for (const item of bundle.evidence[collection]) requireThat(C.isDeepStrictEqual(docs['evidence.json'][collection].find(i => i.id === item.id), item), 'Canonical evidence disagrees with producer bundle');
}

module.exports = { readiness, validateBundle, validatePublished, merge };
