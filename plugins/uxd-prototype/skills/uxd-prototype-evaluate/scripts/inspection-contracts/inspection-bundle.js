'use strict';

/** Import host-produced judgments. This module never invokes a model or browser. */
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const { isDeepStrictEqual } = require('util');
const hash = bytes => `sha256:${crypto.createHash('sha256').update(bytes).digest('hex')}`;
const JUDGMENTS = ['heuristic', 'consistency-visual'];
const SPECIALIST_PHASES = ['heuristic-content', 'heuristic-hierarchy', 'heuristic-interaction'];
const PORTABLE = /^(?!.*(?:^|\/)\.\.(?:\/|$))[A-Za-z0-9._+@=-]+(?:\/[A-Za-z0-9._+@=-]+)*$/;

function importJudgments({ bundlePath, packet, packetBytes, snapshot, stage, selected, documents }) {
  const wanted = selected.filter(name => JUDGMENTS.includes(name));
  if (!wanted.length) {
    if (bundlePath) throw new Error('Judgment bundle supplied without a selected heuristic/visual check');
    return { phases: [], receipts: [], evidenceHash: null };
  }
  if (!bundlePath || !packet.check_scope) throw new Error('Selected model checks require --judgment-bundle and packet.check_scope');
  const file = path.resolve(bundlePath);
  const root = fs.realpathSync(path.dirname(file));
  if (fs.statSync(file).size > 16 * 1024 * 1024) throw new Error('Judgment manifest exceeds 16 MiB');
  const bytes = fs.readFileSync(file);
  const bundle = JSON.parse(bytes);
  // Hashes bind the host's assertions to these exact inputs; they do not prove
  // user consent, a served build's identity, or truthful model measurements.
  if (bundle.schema_version !== 1 || bundle.prototype_key !== packet.extract.key || bundle.prototype_revision !== packet.prototype.revision || bundle.packet_sha256 !== hash(packetBytes) || bundle.source_sha256 !== hash(snapshot)) throw new Error('Judgment bundle input/key/revision hashes do not match this run');
  if (!isDeepStrictEqual(bundle.scope, packet.check_scope)) throw new Error('Judgment scope differs from the approved packet');
  if (!bundle.results || !isDeepStrictEqual(Object.keys(bundle.results).sort(), [...wanted].sort())) throw new Error('Bundle must contain exactly the selected judgment results');
  if (!bundle.producers || wanted.some(check => typeof bundle.producers[check]?.name !== 'string' || !bundle.producers[check].name || typeof bundle.producers[check]?.version !== 'string' || !bundle.producers[check].version)) throw new Error('Each judgment needs its actual skill producer/version');
  if (!bundle.inspection || !['browser', 'supplied-captures'].includes(bundle.inspection.method) || bundle.inspection.revision_verified !== true) throw new Error('Evidence needs a host receipt verifying its prototype revision');
  // Validate recorded authorization for host activity, not consent itself. This
  // local import neither invokes providers nor grants permission to invoke them.
  if (packet.permissions?.provider?.status !== 'approved') throw new Error('Model judgments require recorded provider approval');
  // Reusing verified supplied captures does not claim a new browser activity.
  if (bundle.inspection.method === 'browser' && packet.permissions?.browser?.status !== 'approved') throw new Error('Browser judgments require recorded browser approval');
  const copied = new Map();
  function copyReference(reference) {
    if (!reference || !PORTABLE.test(reference.path || '') || !/^(evidence\/|checks\/model\/)/.test(reference.path)) throw new Error('Judgment files must be portable evidence/ or checks/model/ paths');
    const absolute = fs.realpathSync(path.join(root, reference.path));
    if (!absolute.startsWith(`${root}${path.sep}`) || !fs.statSync(absolute).isFile()) throw new Error('Judgment file escapes its bundle directory');
    if (fs.statSync(absolute).size > 32 * 1024 * 1024) throw new Error('Judgment file exceeds 32 MiB');
    const content = fs.readFileSync(absolute);
    if (hash(content) !== reference.sha256) throw new Error(`Judgment file hash mismatch: ${reference.path}`);
    if (copied.has(reference.path)) {
      if (copied.get(reference.path) !== reference.sha256) throw new Error(`Conflicting file reference: ${reference.path}`);
      return;
    }
    const destination = path.join(stage, reference.path);
    fs.mkdirSync(path.dirname(destination), { recursive: true });
    fs.writeFileSync(destination, content, { flag: 'wx' });
    copied.set(reference.path, reference.sha256);
  }
  copyReference(bundle.inspection.receipt);
  if (!Array.isArray(bundle.evidence?.captures) || !bundle.evidence.captures.length || bundle.evidence.captures.length > 100 || !Array.isArray(bundle.evidence.items) || !bundle.evidence.items.length || bundle.evidence.items.length > 500) throw new Error('Model judgments require bounded capture/evidence records');
  for (const capture of bundle.evidence.captures) {
    if (capture.source_ref !== packet.prototype.revision || !bundle.scope.screen_ids.includes(capture.screen_id) || !bundle.scope.state_ids.includes(capture.state_id)) throw new Error('Capture revision/screen/state is outside the approved scope');
    if (capture.raw_image) copyReference(capture.raw_image);
  }
  for (const item of bundle.evidence.items) if (item.image) copyReference(item.image);
  documents['evidence.json'].captures = bundle.evidence.captures;
  documents['evidence.json'].items = bundle.evidence.items;
  const evidenceIds = new Set(bundle.evidence.items.map(item => item.id));
  const images = new Set(bundle.evidence.items.filter(item => item.image).map(item => item.id));
  const phases = [];
  // A shared hierarchy/visual call owns both checks but remains one invocation
  // for telemetry. Findings may cite only evidence declared for their producer.
  const submittedByCheck = new Map(wanted.map(check => [check, new Set()]));
  const names = new Set();
  const invocationResults = new Set();
  if (!Array.isArray(bundle.phases) || !bundle.phases.length || bundle.phases.length > 5) throw new Error('Judgment bundle needs bounded actual phase measurements');
  for (const entry of bundle.phases) {
    const measurement = entry.measurement;
    if (!measurement || ![...SPECIALIST_PHASES, 'heuristic-synthesis', 'consistency-visual'].includes(measurement.name) || names.has(measurement.name)) throw new Error('Unexpected or duplicate model phase');
    if (measurement.status !== 'completed' || !measurement.model_invoked || !measurement.model || measurement.provider === 'none') throw new Error('Judgment phases need an actual completed model invocation');
    if (!Array.isArray(measurement.checks) || !measurement.checks.length || measurement.checks.some(name => !wanted.includes(name))) throw new Error('Phase ownership must name only selected checks');
    if (!Array.isArray(entry.evidence_ids) || !entry.evidence_ids.length || entry.evidence_ids.some(id => !evidenceIds.has(id))) throw new Error('Model phase has missing or unknown submitted evidence');
    if (!['captured', 'unverified'].includes(entry.context_status)) throw new Error('Model context boundary must be marked captured or unverified');
    if (measurement.checks.includes('consistency-visual') && !entry.evidence_ids.some(id => images.has(id))) throw new Error('Visual inspection requires submitted image evidence');
    copyReference(entry.submitted_context);
    copyReference(entry.returned_result);
    if (invocationResults.has(entry.returned_result.path)) throw new Error('Model invocation result receipts must be unique; shared work belongs in one phase with multiple check owners');
    invocationResults.add(entry.returned_result.path);
    for (const check of measurement.checks) entry.evidence_ids.forEach(id => submittedByCheck.get(check).add(id));
    phases.push({ ...measurement, started_at: new Date(measurement.started_at).toISOString(), ended_at: new Date(measurement.ended_at).toISOString() }); names.add(measurement.name);
  }
  if (wanted.includes('heuristic')) {
    if (SPECIALIST_PHASES.some(name => !names.has(name))) throw new Error('Heuristic Quick Checks requires exactly the three specialist inspection phases');
    if (phases.some(phase => SPECIALIST_PHASES.includes(phase.name) && !phase.checks.includes('heuristic'))) throw new Error('Specialist phase must own heuristic results');
  } else if ([...names].some(name => name.startsWith('heuristic-'))) throw new Error('Unselected heuristic phases are not allowed');
  if (wanted.some(check => !phases.some(phase => phase.checks.includes(check)))) throw new Error('Selected judgment has no producing model phase');
  const evaluation = documents['evaluation.json'];
  const actions = documents['actions.json'].actions;
  const receipts = [];
  for (const check of wanted) {
    const result = bundle.results[check];
    if (!Array.isArray(result.findings) || result.findings.some(finding => typeof finding.id !== 'string' || !finding.id) || new Set(result.findings.map(finding => finding.id)).size !== result.findings.length) throw new Error('Judgment candidate IDs must be present and unique');
    if (result.findings.some(finding => !Array.isArray(finding.evidence_ids) || finding.evidence_ids.some(id => !submittedByCheck.get(check).has(id)))) throw new Error('Finding cites evidence not submitted to its producing check');
    const output = `checks/${check}.json`;
    fs.writeFileSync(path.join(stage, output), `${JSON.stringify(result, null, 2)}\n`);
    const links = [];
    if (check === 'heuristic') {
      if (result.profile !== 'prototype-specialists' || result.framework !== 'nielsen' || !Array.isArray(result.findings)) throw new Error('Expected prototype-specialists Nielsen findings');
      evaluation.heuristics = structuredClone(result);
      const lensEvidence = lens => bundle.phases.find(entry => entry.measurement.name === `heuristic-${lens}`)?.evidence_ids || [];
      if (!Array.isArray(result.coverage) || result.coverage.some(row => !Array.isArray(row.evidence_ids) || row.evidence_ids.some(id => !lensEvidence(row.lens).includes(id)))) throw new Error('Coverage cites evidence not submitted to its lens');
      for (const finding of evaluation.heuristics.findings) {
        if (finding.review_status !== 'unreviewed') throw new Error('Imported model findings must remain unreviewed');
        if (!Array.isArray(finding.identified_by) || finding.identified_by.some(lens => !finding.evidence_ids.some(id => lensEvidence(lens).includes(id))) || finding.evidence_ids.some(id => !finding.identified_by.some(lens => lensEvidence(lens).includes(id)))) throw new Error('Finding evidence does not resolve to the identifying lens submissions');
        const originalId = finding.id;
        // Stable across display order; a changed observation/state gets a new ID.
        finding.id = `heuristic-${hash(JSON.stringify([finding.screen_id, finding.state_id, finding.observation, [...finding.heuristic_ids].sort((a, b) => a - b), [...finding.source_ids].sort()])).slice(7, 31)}`;
        const actionId = `action-${finding.id}`;
        actions.push({ id: actionId, kind: 'human-followup', status: 'proposed', priority: 'normal', confidence: 'low', source: { ac_id: null, finding_id: finding.id, evidence_ids: finding.evidence_ids }, recommendation: `Review heuristic finding: ${finding.title}`.slice(0, 500), result: { changed_files: [] }, handoff: { requires_user_invocation: true, skill: 'uxd-prototype-evaluate', payload: {} } });
        links.push({ result_id: originalId, finding_id: finding.id, evidence_ids: finding.evidence_ids, action_ids: [actionId] });
      }
    } else {
      if (!Number.isInteger(result.guidelines_checked) || result.guidelines_checked < 0 || !Number.isInteger(result.screenshots_checked) || result.screenshots_checked < 1 || result.screenshots_checked > bundle.evidence.captures.length) throw new Error('Visual coverage counts must match bounded supplied captures');
      if (!Array.isArray(result.findings) || result.findings.some(finding => finding.origin !== 'visual' || !finding.evidence_ids?.some(id => images.has(id)))) throw new Error('Visual findings require explicit image evidence');
      const consistency = evaluation.consistency;
      if (consistency.source_checked && consistency.guidelines_version !== result.guidelines_version) throw new Error('Source and visual guideline versions differ');
      consistency.guidelines_version = result.guidelines_version;
      consistency.visual_checked = true;
      consistency.screenshots_checked = result.screenshots_checked;
      // The two checks can overlap; use the larger coverage count, not a false sum.
      consistency.coverage_count_method = 'max-per-mode';
      consistency.coverage_by_mode = { source: consistency.guidelines_checked, visual: result.guidelines_checked };
      consistency.guidelines_checked = Math.max(consistency.guidelines_checked, result.guidelines_checked);
      for (const finding of structuredClone(result.findings)) {
        const originalId = finding.id;
        finding.id = `visual-${hash(JSON.stringify([finding.guideline_id, finding.description, [...finding.evidence_ids].sort()])).slice(7, 31)}`;
        consistency.findings.push(finding);
        links.push({ result_id: originalId, finding_id: finding.id, evidence_ids: finding.evidence_ids, action_ids: [] });
      }
      consistency.status = consistency.findings.some(finding => finding.severity === 'error') ? 'failed' : consistency.findings.length ? 'flagged' : result.guidelines_checked > 0 ? 'passed' : 'degraded';
      evaluation.summary.consistency_counts = { error: 0, warning: 0, info: 0, total: consistency.findings.length };
      for (const finding of consistency.findings) evaluation.summary.consistency_counts[finding.severity] += 1;
    }
    receipts.push({ check, producer: bundle.producers[check], output, output_sha256: hash(fs.readFileSync(path.join(stage, output))), phase_names: phases.filter(phase => phase.checks.includes(check)).map(phase => phase.name), canonical_links: links });
  }
  fs.writeFileSync(path.join(stage, 'checks/judgment-bundle.json'), bytes);
  evaluation.status = 'needs-attention'; // An inspection is not AC verification or a publish gate.
  return { phases, receipts, evidenceHash: hash(JSON.stringify(bundle.evidence)), context: { bundle_path: 'checks/judgment-bundle.json', bundle_sha256: hash(bytes), inspection: bundle.inspection, phases: bundle.phases, files: [...copied].map(([filePath, sha256]) => ({ path: filePath, sha256 })) } };
}

module.exports = { importJudgments };
