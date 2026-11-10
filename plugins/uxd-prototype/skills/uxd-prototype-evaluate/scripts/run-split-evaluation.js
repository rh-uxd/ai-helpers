#!/usr/bin/env node
'use strict';

/** Local composition only. The host supplies authorized browser/model outputs. */
const fs = require('fs');
const path = require('path');
const { parseArgs } = require('util');
const { spawnSync } = require('child_process');
const C = require('./artifacts/split-contract');
const { buildDocuments } = require('./artifacts/assemble-phase-a-canonical');
const { classifyCriterion } = require('./classification/run-classification');
const { buildOverrides } = require('./classification/classify-ac-tier');

function seed(input, stage) {
  // Set up a standalone walkthrough from reviewed inputs without running
  // Quick checks. Use classification for tiers, not proof that an AC passed.
  const bytes = fs.readFileSync(input);
  const packet = JSON.parse(bytes);
  if (!packet.source?.id || !packet.source.revision || !['jira', 'ux-spec'].includes(packet.source.kind) || !packet.prototype?.revision || !packet.prototype.url || !packet.extract?.key || !Array.isArray(packet.extract.ac_list)) throw new Error('A reviewed source/prototype/extract packet is required');
  const snapshot = fs.readFileSync(path.resolve(path.dirname(input), packet.source.snapshot_path));
  fs.mkdirSync(path.join(stage, 'inputs'));
  C.write(stage, 'inputs/packet.json', packet);
  // Preserve exact bytes: bundle hashes refer to the approved packet, not serialization.
  fs.writeFileSync(path.join(stage, 'inputs/packet.json'), bytes);
  fs.writeFileSync(path.join(stage, 'inputs/source.snapshot'), snapshot);
  const sourceIds = new Set();
  for (const ac of packet.extract.ac_list) {
    if (!ac.criterion_id || typeof ac.text !== 'string' || !ac.text.trim() || typeof ac.source_id !== 'string' || !ac.source_id || sourceIds.has(ac.source_id)) throw new Error('Reviewed criteria need unique source IDs and nonempty criterion IDs/text');
    sourceIds.add(ac.source_id);
  }
  const overrides = new Map(buildOverrides(packet.extract).map(item => [item.criterion_id, item]));
  const rows = packet.extract.ac_list.map(ac => ({ criterion_id: ac.criterion_id, criterion_text: ac.text, source: packet.source.kind === 'jira' ? 'jira' : 'user', tier: classifyCriterion(ac, overrides.get(ac.criterion_id)).tier, verdict: '', rationale: 'Not verified.' }));
  const { documents } = buildDocuments(stage, { decision: 'bypass', invalidated_by: ['cache_bypassed'] }, { extract: packet.extract, delta: { changed_files: [] }, rows, consistency: { source_mode: { ran: false, violations: [] }, degraded: false, guidelines_version: 'not-run' }, evidence: { prototype_url: packet.prototype.url, captured_at: new Date().toISOString() } });
  const intent = documents['pe-context.json'].intent;
  intent.stage = 'walkthroughs'; intent.tasks = packet.tasks || []; intent.personas = packet.personas || [];
  intent.environment = packet.environment;
  intent.scope.source_ref = packet.prototype.revision;
  intent.scope.source_mode = 'remote-only';
  intent.source_input = { kind: packet.source.kind, id: packet.source.id, revision: packet.source.revision, snapshot_path: 'inputs/source.snapshot', sha256: C.hash(snapshot) };
  intent.acceptance_criteria.forEach((ac, index) => { ac.source_id = packet.extract.ac_list[index].source_id; });
  documents['pe-evaluation-snapshot.json'].consistency.status = 'not-run';
  documents['pe-state.json'].permissions = packet.permissions;
  documents['pe-state.json'].phases = [];
  return documents;
}

function run(options) {
  options = { ...options };
  const route = options.route;
  if (!['quick', 'walkthroughs', 'full'].includes(route) || !options.output) throw new Error('Select --route quick|walkthroughs|full and --output <fresh-run-dir>');
  if (['continue-from', 'verify-from', 'adapt-from'].filter(k => options[k]).length > 1) throw new Error('Choose continuation, verification or adaptation, not multiple parents');
  let parent;
  let approval;
  const parentRoot = options['continue-from'] || options['verify-from'] || options['adapt-from'];
  if (parentRoot) {
    parent = C.loadRun(parentRoot);
    if (!options['adapt-from'] && route !== 'full') throw new Error('Continuation/verification requires the Full route');
    if ((options['continue-from'] || options['verify-from']) && !options.approval) throw new Error('Full continuation/verification requires a separate --approval decision');
    // The host records the human decision; a receipt cannot grant authority.
    // Bind it to the reviewed bytes so edits invalidate that decision's snapshot.
    if (!options['adapt-from'] || options.approval) {
      approval = C.read(options.approval);
      if (approval.run_id !== parent['pe-context.json'].run_id || approval.artifact_sha256 !== C.digest(parentRoot) || approval.approved !== true || !approval.recorded_at) throw new Error('Review approval must identify the exact reviewed canonical snapshot');
      if (!Number.isFinite(Date.parse(approval.recorded_at)) || !approval.recorded_at.endsWith('Z')) throw new Error('Review approval needs a UTC timestamp');
    }
    if (options['continue-from'] && parent['pe-state.json'].workflow?.status !== 'awaiting-review') throw new Error('Only an awaiting-review checkpoint can continue');
    if (options['verify-from'] && (parent['pe-state.json'].workflow?.pass !== 1 || parent['pe-state.json'].workflow?.status !== 'completed')) throw new Error('Only one post-fix verification pass is allowed');
  }
  let quickRoot;
  let quickTemp;
  try {
    const planning = require('./workflow/evaluation-plan').preflight(options, parent, approval);
    const startsQuickChecks = route === 'quick' || (route === 'full' && !options['continue-from']);
    if (startsQuickChecks && (typeof options.checks !== 'string' || !options.checks.trim())) throw new Error('Select Quick checks explicitly with --checks, or provide a reviewed --plan that selects them');
    // Validate the prepared cohort before selected Quick/browser/provider work.
    // Full without a cohort can finish after review, but cannot run walkthroughs.
    if (options.input && (route === 'walkthroughs' || route === 'full')) {
      const preflight = fs.mkdtempSync(path.join(path.dirname(path.resolve(options.output)), '.walkthrough-readiness-'));
      try {
        const prepared = seed(path.resolve(options.input), preflight);
        if (route === 'walkthroughs' || prepared['pe-context.json'].intent.tasks.length || prepared['pe-context.json'].intent.personas.length) require('./task-verification/walkthrough-contract').readiness(prepared);
      } finally { fs.rmSync(preflight, { recursive: true, force: true }); }
    }
    if (route === 'quick' || (route === 'full' && !options['continue-from'])) {
      // Reuse Quick for Full's first pass instead of building another runner.
      // After review, the walkthrough step copies this saved checkpoint.
      if (!options.input) throw new Error('A reviewed --input packet is required');
      quickTemp = fs.mkdtempSync(path.join(path.dirname(path.resolve(options.output)), '.quick-input-'));
      quickRoot = path.join(quickTemp, 'run');
      const args = [path.join(__dirname, 'run-quick-checks.js'), '--input', options.input, '--output', quickRoot, '--checks', options.checks];
      for (const key of ['workspace', 'base-ref', 'judgment-bundle', 'design-system', 'design-system-version', 'guideline-manifest']) if (options[key]) args.push(`--${key}`, options[key]);
      for (const value of options.guidelines || []) args.push('--guidelines', value);
      const result = spawnSync(process.execPath, args, { encoding: 'utf8', timeout: 180000 });
      if (result.status !== 0) throw new Error(result.stderr || 'Quick Checks failed');
    }
    const docs = C.publish(options.output, stage => {
      const origin = options['continue-from'] || quickRoot;
      let docs;
      if (origin) {
        docs = C.loadRun(origin);
        for (const name of ['inputs', 'checks', 'evidence', '.artifacts']) if (fs.existsSync(path.join(origin, name))) C.copyTree(path.join(origin, name), path.join(stage, name));
        // The immutable source run retains its workflow receipt; replace it only in staging.
        fs.rmSync(path.join(stage, 'checks/workflow.json'), { force: true });
      } else docs = seed(path.resolve(options.input), stage);
      fs.mkdirSync(path.join(stage, 'checks'), { recursive: true });
      if (parent && options['continue-from'] && options.input && C.hash(fs.readFileSync(options.input)) !== C.hash(fs.readFileSync(path.join(stage, 'inputs/packet.json')))) throw new Error('Continuation cannot change the reviewed packet');
      if (options['verify-from']) {
        const fix = C.read(options['fix-receipt']);
        const oldIntent = parent['pe-context.json'].intent;
        const newIntent = docs['pe-context.json'].intent;
        // Verification changes the build, not the requirements/cohort. Fresh
        // checks supply outcomes; the edit receipt only records approved lineage.
        if (approval.purpose !== 'prototype-edits' || !Array.isArray(approval.action_ids) || !approval.action_ids.length || new Set(approval.action_ids).size !== approval.action_ids.length || approval.action_ids.some(id => !parent['pe-actions.json'].actions.some(a => a.id === id && a.kind !== 'publish' && a.status === 'proposed' && a.source.evidence_ids.length))) throw new Error('Fix approval must select existing evidence-backed actions');
        if (!C.isDeepStrictEqual(fix.action_ids, approval.action_ids) || fix.before_revision !== oldIntent.scope.source_ref || fix.after_revision !== newIntent.scope.source_ref || fix.before_revision === fix.after_revision || !Array.isArray(fix.changed_files) || !fix.changed_files.length || !fix.applied_at) throw new Error('Fix receipt must identify selected actions and a changed prototype revision');
        for (const key of ['source_input', 'tasks', 'personas', 'environment', 'acceptance_criteria', 'check_scope']) if (!C.isDeepStrictEqual(oldIntent[key], newIntent[key])) throw new Error('Post-fix verification cannot silently change intent/scope');
        if (!C.isDeepStrictEqual(parent['pe-state.json'].quick_checks?.selected, docs['pe-state.json'].quick_checks?.selected)) throw new Error('Verification must repeat the selected Quick checks');
        const targets = approval.action_ids.map(id => {
          const original = parent['pe-actions.json'].actions.find(a => a.id === id);
          const proposal = approval.fix_proposals?.find(p => p.action_id === id);
          const target = original.target || proposal?.target;
          if (!target?.file || !fix.changed_files.includes(target.file)) throw new Error('Every selected edit needs a reviewed target in changed_files');
          return target.file;
        });
        const allowedFiles = approval.changed_files || targets;
        if (fix.changed_files.some(file => !allowedFiles.includes(file)) || allowedFiles.some(file => !fix.changed_files.includes(file))) throw new Error('Fix changed files exceed the reviewed action targets');
        C.write(stage, 'checks/fix-receipt.json', fix);
      }
      if (options['continue-from'] && !['continue-walkthroughs', 'complete-without-walkthroughs'].includes(approval.purpose)) throw new Error('Continuation needs an explicit review decision');
      if (options['continue-from'] && approval.permissions) docs['pe-state.json'].permissions = approval.permissions;
      let pairs = [];
      let inheritedPhaseCount = options['continue-from'] ? docs['pe-state.json'].phases.length : 0;
      const executeWalkthroughs = route === 'walkthroughs' || Boolean(options['continue-from'] && approval.purpose === 'continue-walkthroughs') || Boolean(options['verify-from'] && parent['pe-state.json'].workflow.selected_pairs.length);
      // Having a results bundle does not let us skip Full's review pause.
      // Accept walkthrough results only when this route selected walkthroughs.
      if (executeWalkthroughs) {
        if (!options['walkthrough-bundle']) throw new Error('Selected walkthroughs require --walkthrough-bundle');
        if (options['continue-from'] && C.read(options['walkthrough-bundle']).phases?.some(p => Date.parse(p.measurement?.started_at) < Date.parse(approval.recorded_at))) throw new Error('Full walkthrough execution must follow its explicit review decision; do not splice prior standalone work');
        docs['pe-state.json'].phases = docs['pe-state.json'].phases.filter(p => !['journey', 'usability'].includes(p.name));
        if (options['continue-from']) inheritedPhaseCount = docs['pe-state.json'].phases.length;
        pairs = require('./task-verification/walkthrough-contract').merge(docs, options['walkthrough-bundle'], stage);
      } else if (options['walkthrough-bundle']) throw new Error('Full Evaluation pauses after Quick Checks; continue from the reviewed checkpoint');
      const status = route === 'full' && !options['continue-from'] && !options['verify-from'] ? 'awaiting-review' : 'completed';
      const pass = options['verify-from'] ? 2 : 1;
      if (options['verify-from']) {
        const fix = C.read(options['fix-receipt']);
        for (const actionId of fix.action_ids) {
          const action = structuredClone(parent['pe-actions.json'].actions.find(a => a.id === actionId));
          const result = docs['pe-evaluation-snapshot.json'].ac_results.find(r => r.ac_id === action.source.ac_id);
          action.id = `applied-${action.id}`;
          action.kind = 'fix';
          action.status = 'applied';
          action.target ||= approval.fix_proposals?.find(p => p.action_id === actionId)?.target;
          // Old screenshots/findings stay with their original revision. Link the
          // parent action instead; applied is not a claim that the fix now passes.
          action.source = { ac_id: null, finding_id: null, evidence_ids: [], origin_run_id: parent['pe-context.json'].run_id, origin_action_id: actionId };
          action.result = { changed_files: fix.changed_files, validated_at: new Date(fix.applied_at).toISOString(), applied_in_iteration: 2 };
          docs['pe-actions.json'].actions.push(action);
          if (result) result.action_ids.push(action.id);
        }
      }
      const fileReceipt = name => ({ path: name, sha256: C.hash(fs.readFileSync(path.join(stage, name))) });
      const receipt = { route, status, pass, report_requested: Boolean(options.report), parent_run_id: parent?.['pe-context.json'].run_id || null, parent_artifact_sha256: parent ? C.digest(parentRoot) : null, approval: approval || null, packet_sha256: C.hash(fs.readFileSync(path.join(stage, 'inputs/packet.json'))), selected_pairs: pairs, walkthrough_bundle: executeWalkthroughs ? fileReceipt('checks/walkthrough-bundle.json') : null, fix_receipt: options['verify-from'] ? fileReceipt('checks/fix-receipt.json') : null };
      receipt.plan_sha256 = planning ? C.hash(planning.bytes) : null;
      receipt.plan_change = planning?.change || null;
      C.write(stage, 'checks/workflow.json', receipt);
      const state = docs['pe-state.json'];
      if (options['verify-from']) {
        state.phases = state.phases.filter(p => p.name !== 'fix');
        state.permissions = { ...state.permissions, prototype_edits: { status: 'approved', scope: `Selected actions: ${approval.action_ids.join(', ')}`, recorded_at: approval.recorded_at } };
      }
      state.workflow = { route, status, pass, parent_run_id: receipt.parent_run_id, selected_pairs: pairs, receipt_path: 'checks/workflow.json', receipt_sha256: C.hash(fs.readFileSync(path.join(stage, 'checks/workflow.json'))) };
      const history = options['adapt-from'] ? [] : parent?.['pe-state.json'].lifecycle.iterations || [];
      const current = { iteration: pass, phase: executeWalkthroughs ? 'b' : 'a', timestamp: new Date().toISOString(), ac_results: docs['pe-evaluation-snapshot.json'].ac_results.map(r => ({ ac_id: r.ac_id, verdict: r.verdict })) };
      state.lifecycle = { status: status === 'awaiting-review' ? 'running' : 'completed', current_phase: executeWalkthroughs ? 'journey' : 'classify', iteration: pass, max_iterations: 2, exit_reason: status === 'awaiting-review' ? 'pending' : pass === 2 ? 'max-iterations' : 'no-fix', iterations: [...history.filter(i => i.iteration !== pass || i.phase !== current.phase), current] };
      require('./workflow/evaluation-plan').attach(planning, docs, stage, inheritedPhaseCount, parent?.['pe-state.json']);
      // Identification includes the persisted plan, not just executed selection.
      C.identify(docs, route, receipt);
      return docs;
    });
    // Reporting is derived local rendering of the published canonical run:
    // it launches no model work and never mutates the canonical files.
    let report = null;
    if (options.report) {
      const rendered = require('./reporting/canonical-report').render(options.output);
      report = { evaluation_report: rendered.outputs.evaluation_report, integrity: 'report-integrity.json', model_invoked: false };
    }
    return { run_id: docs['pe-context.json'].run_id, artifacts_dir: path.resolve(options.output), artifact_sha256: C.digest(options.output), ...docs['pe-state.json'].workflow, ...(report ? { report } : {}), model_invoked: false };
  } finally { if (quickTemp) fs.rmSync(quickTemp, { recursive: true, force: true }); }
}

function main() {
  const { values } = parseArgs({ options: Object.fromEntries(['route', 'input', 'output', 'checks', 'workspace', 'base-ref', 'judgment-bundle', 'walkthrough-bundle', 'continue-from', 'verify-from', 'adapt-from', 'plan', 'plan-change', 'approval', 'fix-receipt', 'design-system', 'design-system-version', 'guideline-manifest'].map(k => [k, { type: 'string' }]).concat([['guidelines', { type: 'string', multiple: true }], ['report', { type: 'boolean', default: false }]])) });
  process.stdout.write(`${JSON.stringify(run(values))}\n`);
}
if (require.main === module) { try { main(); } catch (error) { process.stderr.write(`${error.message}\n`); process.exitCode = 1; } }
module.exports = { run };
