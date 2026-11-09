#!/usr/bin/env node
'use strict';

/** Discover validated runs below an explicitly supplied local artifact root. */
const fs = require('fs');
const path = require('path');
const { parseArgs } = require('util');
const C = require('./artifacts/split-contract');

function discover(root, filters = {}) {
  // List saved runs without picking the newest or running anything again.
  // Include rejected folders so broken evidence does not quietly disappear.
  const matches = []; const rejected = [];
  let visited = 0;
  function visit(directory, depth) {
    // ponytail: search a bounded local folder tree, not a background index;
    // choose a smaller root if limits are reached rather than adding a service.
    if (depth > 8 || ++visited > 10000) throw new Error('Discovery bound exceeded; select a narrower artifact root');
    if (fs.existsSync(path.join(directory, 'brief.json'))) {
      try {
        const docs = C.loadRun(directory);
        const brief = docs['brief.json']; const evaluation = docs['evaluation.json'];
        if (filters.key && filters.key !== brief.prototype_key || filters.source && filters.source !== brief.intent.source_input?.id || filters.revision && filters.revision !== brief.intent.scope.source_ref) return;
        const state = docs['state.json'];
        // loadRun validates the referenced bytes before any receipt is exposed.
        // Preserve per-check attribution (including shared model phases), rather
        // than implying that every selected check verified every frozen task.
        const workflowReceipt = state.workflow ? C.read(path.join(directory, state.workflow.receipt_path)) : null;
        const quickContext = state.quick_checks ? C.read(path.join(directory, state.quick_checks.context_path)) : null;
        const walkthrough = workflowReceipt?.walkthrough_bundle ? C.read(path.join(directory, workflowReceipt.walkthrough_bundle.path)) : null;
        const findings = [...evaluation.consistency.findings, ...(evaluation.heuristics?.findings || [])];
        matches.push({
          directory, run_id: brief.run_id, prototype_key: brief.prototype_key,
          source: brief.intent.source_input || null, revision: brief.intent.scope.source_ref,
          route: state.workflow?.route || 'quick', selected_checks: state.quick_checks?.selected || [],
          // These are recorded artifact/phase times, not a computed execution
          // window: continuations can retain their parent's creation and phases.
          created_at: brief.created_at,
          record_timestamps: Object.fromEntries(C.FILES.map(name => [name, docs[name].created_at])),
          lifecycle: state.lifecycle, workflow: state.workflow || null,
          workflow_receipt: workflowReceipt, workflow_recorded_at: workflowReceipt?.recorded_at ?? null,
          identity: state.identity, phases: state.phases, evaluation_status: evaluation.status,
          scope: brief.intent.scope, check_scope: brief.intent.check_scope ?? null,
          environment: brief.intent.environment ?? null,
          tasks: brief.intent.tasks, personas: brief.intent.personas,
          acceptance_criteria: brief.intent.acceptance_criteria,
          selected_pairs: state.workflow?.selected_pairs ?? null,
          quick_check_context: quickContext,
          check_results: (state.quick_checks?.selected || []).map(check => ({
            check, phases: state.phases.filter(p => p.name === check || p.checks?.includes(check)),
          })),
          walkthrough_phases: walkthrough?.phases ?? [],
          journeys: evaluation.journeys, actions: docs['actions.json'].actions,
          // Exact canonical bytes identify this reviewed snapshot, not permission
          // to restore cached checks or reuse evidence on another revision.
          artifact_sha256: C.digest(directory),
          findings: findings.map(f => ({ id: f.id, evidence_ids: f.evidence_ids, action_ids: docs['actions.json'].actions.filter(a => a.source.finding_id === f.id).map(a => a.id) })),
          ac_results: evaluation.ac_results,
        });
      } catch (error) { rejected.push({ directory, error: error.message }); }
      return;
    }
    for (const entry of fs.readdirSync(directory, { withFileTypes: true })) if (entry.isDirectory() && !entry.name.startsWith('.') && entry.name !== 'node_modules') visit(path.join(directory, entry.name), depth + 1);
  }
  const directory = path.resolve(root);
  // readdir's Dirents already skip nested links; apply the same invariant to
  // an explicit root before existsSync/loadRun can follow it (even if dangling).
  if (fs.lstatSync(directory).isSymbolicLink()) throw new Error('Discovery root cannot be a symlink');
  visit(directory, 0);
  return { matches, rejected };
}
if (require.main === module) {
  try {
    const { values } = parseArgs({ options: Object.fromEntries(['root', 'key', 'source', 'revision'].map(k => [k, { type: 'string' }])) });
    if (!values.root) throw new Error('Usage: find-evaluation-runs.js --root <artifact-root> [--key KEY --source SPEC --revision build]');
    process.stdout.write(`${JSON.stringify(discover(values.root, values))}\n`);
  } catch (error) { process.stderr.write(`${error.message}\n`); process.exitCode = 1; }
}
module.exports = { discover };
