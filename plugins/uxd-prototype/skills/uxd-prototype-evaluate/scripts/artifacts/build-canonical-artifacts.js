'use strict';

// Build the five JSON documents from explicit reviewed inputs. Browser/model
// evidence is imported separately; classification alone never verifies an AC.

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const { counts } = require('./split-contract');

const SCHEMA = 'https://json-schema.org/draft/2020-12/schema';
const VERSION = '1.0.0';
const PRODUCER_VERSION = '1';
const PORTABLE_PATH = /^(?!\/)(?![A-Za-z]:[\\/])(?!.*(?:^|\/)\.\.(?:\/|$))[A-Za-z0-9._+@=-]+(?:\/[A-Za-z0-9._+@=-]+)*$/;

function sha256(value) {
  const data = Buffer.isBuffer(value) ? value : Buffer.from(String(value));
  return `sha256:${crypto.createHash('sha256').update(data).digest('hex')}`;
}

function stableJson(value) {
  if (Array.isArray(value)) return `[${value.map(stableJson).join(',')}]`;
  if (value && typeof value === 'object') return `{${Object.keys(value).sort().map(key => `${JSON.stringify(key)}:${stableJson(value[key])}`).join(',')}}`;
  return JSON.stringify(value);
}

function jsonHash(value) { return sha256(stableJson(value)); }

function timestamp(value = null) {
  const parsed = value ? new Date(value) : new Date();
  if (Number.isNaN(parsed.getTime())) return new Date().toISOString();
  return parsed.toISOString();
}

function bounded(value, maximum, fallback) {
  return (String(value || '').trim() || fallback).slice(0, maximum);
}

function identifier(value, prefix) {
  let slug = String(value || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
  if (!slug.includes('-')) slug = `${prefix}-${slug || sha256(String(value)).slice(7, 15)}`;
  if (!/^[a-z]/.test(slug)) slug = `${prefix}-${slug}`;
  return slug.slice(0, 160).replace(/-+$/g, '');
}

function portablePath(value, fallback = 'unknown-source') {
  const normalized = String(value || '').replace(/^\.\//, '').replace(/\\/g, '/');
  return PORTABLE_PATH.test(normalized) ? normalized : fallback;
}

function filesUnder(directory) {
  const files = [];
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const target = path.join(directory, entry.name);
    if (entry.isDirectory()) files.push(...filesUnder(target));
    else if (entry.isFile() && entry.name !== '.DS_Store') files.push(target);
  }
  return files;
}

function canonicalFinding(finding) {
  // Source observation IDs do not depend on their display order.
  const digest = jsonHash({
    guideline_id: finding.guideline_id, file: finding.file, line: finding.line,
    property: finding.property, value: finding.value,
  }).slice(7, 31);
  const candidate = Boolean(finding.review_candidate);
  return {
    id: `finding-${digest}`,
    origin: 'source',
    guideline_id: finding.guideline_id || 'unknown-guideline',
    guideline_title: bounded(finding.guideline_title, 280, 'Selected guideline'),
    category: bounded(finding.category, 80, 'foundations'),
    severity: candidate ? 'warning' : ['error', 'warning'].includes(finding.severity) ? finding.severity : 'warning',
    verdict: candidate ? 'FLAGGED' : finding.verdict === 'VIOLATION' ? 'VIOLATION' : 'FLAGGED',
    confidence: candidate ? 'low' : ['high', 'medium', 'low'].includes(finding.confidence) ? finding.confidence : 'low',
    property: bounded(finding.property, 280, 'source'),
    value: bounded(finding.value, 1000, 'source match'),
    check_method: candidate ? 'automated_candidate' : finding.check_method === 'automated' ? 'automated' : 'automated_candidate',
    file: portablePath(finding.file),
    line: Number.isInteger(finding.line) && finding.line > 0 ? finding.line : null,
    evidence_ids: [],
    description: bounded(finding.description, 280, 'Selected guideline source finding'),
    recommendation: bounded(finding.suggestion, 500, 'Review against the selected guideline.'),
    pf_doc_url: /^https?:\/\//.test(String(finding.pf_doc_url || '')) ? finding.pf_doc_url : null,
    review_candidate: candidate,
  };
}

function buildDocuments({ extract, delta, consistency: consistencyReport, evidence: prototypeEvidence, rows }) {
  if (rows.length !== extract.ac_list.length) throw new Error('Classified AC count does not match reviewed criteria');

  const createdAt = timestamp(prototypeEvidence.captured_at || extract.extracted_at);
  // Normalize reviewed criterion IDs and tiers without inventing observations.
  const acIdBySource = new Map();
  const acceptanceCriteria = rows.map(row => {
    const id = identifier(row.criterion_id, 'ac');
    if (acIdBySource.has(row.criterion_id)) throw new Error(`Duplicate criterion_id: ${row.criterion_id}`);
    acIdBySource.set(row.criterion_id, id);
    const mode = { T1: 'ui', T2: 'external', T3: 'source', T4: 'design-process' }[row.tier];
    if (!mode) throw new Error(`Unsupported classification tier: ${row.tier}`);
    return {
      id, source_id: row.criterion_id,
      source: row.source === 'jira' ? 'jira' : row.source === 'user' ? 'user' : 'derived',
      text: row.criterion_text, verification_mode: mode, tier: row.tier,
      requires_human_followup: row.tier === 'T4',
    };
  });

  const changedFiles = (delta.changed_files || []).map(file => portablePath(file, '')).filter(Boolean);
  const intent = {
    stage: 'complete', title: bounded(extract.title, 500, extract.key), acceptance_criteria: acceptanceCriteria,
    tasks: [], personas: [],
    ...(extract.feature_context ? { feature_context: {
      background: extract.feature_context.background ? bounded(extract.feature_context.background, 4000, '') : null,
      problem_statement: extract.feature_context.problem_statement ? bounded(extract.feature_context.problem_statement, 4000, '') : null,
      user_stories: (extract.feature_context.user_stories || []).map(item => bounded(item, 280, 'User story')).slice(0, 40),
      ui_enhancements: extract.feature_context.ui_enhancements ? bounded(extract.feature_context.ui_enhancements, 8000, '') : null,
      source_ticket: extract.feature_context.source_ticket ? bounded(extract.feature_context.source_ticket, 120, '') : null,
    } } : {}),
    scope: {
      prototype_url: prototypeEvidence.prototype_url,
      source_mode: 'workspace', source_ref: 'pending-build-key', changed_files: changedFiles,
    },
  };
  const intentKey = jsonHash({ ...intent, scope: { ...intent.scope, source_ref: undefined }, ...(consistencyReport.guideline_context ? { consistency_selection: { design_system: consistencyReport.design_system, manifest_version: consistencyReport.guidelines_version, context: consistencyReport.guideline_context } } : {}) });
  const buildKey = jsonHash({
    changed_files: changedFiles,
    consistency: consistencyReport.source_mode || {},
    evidence: {
      page: prototypeEvidence.page || {},
      capture: prototypeEvidence.capture || {},
      crops: prototypeEvidence.crops || [],
    },
  });
  const skillRoot = path.resolve(__dirname, '../..');
  // Retain an implementation fingerprint independently of source/build identity.
  const consistencyRoot = path.resolve(
    skillRoot, '..', 'uxd-consistency-check'
  );
  const evaluatorFiles = [
    ...filesUnder(path.join(skillRoot, 'schemas', 'v1')),
    ...filesUnder(path.join(skillRoot, 'config')),
    ...[
      'artifacts/build-canonical-artifacts.js', 'artifacts/linked-artifact-contract.js',
      'artifacts/split-contract.js', 'artifacts/validate-canonical-artifacts.js', 'task-verification/walkthrough-contract.js', 'workflow/evaluation-plan.js',
      'consistency/consistency-compat.js', 'consistency/consistency-contract.js', 'consistency/validate-consistency.js',
      'run-quick-checks.js', 'inspection-contracts/inspection-bundle.js', 'classification/run-classification.js', 'classification/classify-ac-tier.js',
    ].map(name => path.join(skillRoot, 'scripts', name)),
  ];
  const evaluatorInputs = [...new Set(evaluatorFiles)].sort().map(file => [
    path.relative(path.resolve(skillRoot, '..'), file), sha256(fs.readFileSync(file)),
  ]);
  // Only companion resources are optional. Required evaluator inputs above
  // must still fail loudly; an absent companion is not an empty rule corpus.
  for (const name of ['guidelines', 'scripts', 'schemas', 'VERSION']) {
    const resource = path.join(consistencyRoot, name);
    const relative = path.relative(path.resolve(skillRoot, '..'), resource);
    try { fs.statSync(resource); } catch (error) {
      if (error.code !== 'ENOENT') throw error;
      evaluatorInputs.push([relative, null]);
      continue;
    }
    if (name !== 'VERSION') {
      evaluatorInputs.push([relative, 'directory']);
      for (const file of filesUnder(resource).filter(file => name === 'guidelines' || (name === 'scripts' ? file.endsWith('.py') : file.endsWith('.json'))).sort()) evaluatorInputs.push([
        path.relative(path.resolve(skillRoot, '..'), file), sha256(fs.readFileSync(file)),
      ]);
    } else evaluatorInputs.push([relative, sha256(fs.readFileSync(resource))]);
  }
  evaluatorInputs.sort(([a], [b]) => a.localeCompare(b));
  evaluatorInputs.push(['producer-version', PRODUCER_VERSION]);
  const evaluatorKey = jsonHash(evaluatorInputs);
  const identity = { intent_key: intentKey, build_key: buildKey, evaluator_key: evaluatorKey };
  identity.compound_key = sha256(JSON.stringify(identity));
  intent.scope.source_ref = buildKey;
  const runId = `eval-${extract.key}-${identity.compound_key.slice(7, 23)}`;
  const producer = { name: 'uxd-prototype-evaluate', version: PRODUCER_VERSION };
  const envelope = { created_at: createdAt, updated_at: createdAt, $schema: SCHEMA, schema_version: VERSION, run_id: runId, prototype_key: extract.key, producer };
  const brief = { ...envelope, artifact_type: 'brief', intent };
  const evidence = { ...envelope, artifact_type: 'evidence', captures: [], items: [] };

  const actions = [];
  // All classification-only results stay NOT_RUN, regardless of input labels.
  // The runners import evidence-backed observations separately.
  const acResults = rows.map(row => {
    const actionIds = [];
    if (row.human_action) {
      const actionId = identifier(`action-human-${row.criterion_id}`, 'action');
      actionIds.push(actionId);
      actions.push({
        id: actionId, kind: 'human-followup', status: 'proposed', priority: 'normal', confidence: 'high',
        source: { ac_id: acIdBySource.get(row.criterion_id), finding_id: null, evidence_ids: [] },
        recommendation: bounded(row.human_action, 500, 'Review this criterion outside the prototype.'),
        result: { changed_files: [] },
        handoff: { requires_user_invocation: true, skill: 'uxd-prototype-evaluate', payload: {} },
      });
    }
    return {
      ac_id: acIdBySource.get(row.criterion_id), verdict: 'NOT_RUN',
      rationale: bounded(row.rationale, 280, 'Not verified.'),
      evidence_ids: [], action_ids: actionIds, evaluated_by: null, updated_at: createdAt,
    };
  });

  const journeys = [];
  const findings = (consistencyReport.source_mode?.violations || []).map(canonicalFinding);
  const consistencyCounts = { error: 0, warning: 0, info: 0, total: findings.length };
  findings.forEach(finding => { consistencyCounts[finding.severity] += 1; });
  const consistency = {
    status: consistencyReport.degraded ? 'degraded' : consistencyCounts.error ? 'failed' : findings.length ? 'flagged' : 'passed',
    guidelines_version: bounded(consistencyReport.guidelines_version, 160, 'unknown'),
    guidelines_checked: Number(consistencyReport.summary?.total_guidelines_checked || 0), screenshots_checked: 0,
    source_checked: consistencyReport.source_mode?.ran === true, visual_checked: false, findings,
  };
  if (consistencyReport.schema_version === '1.0.0' && consistencyReport.source === 'uxd-consistency-check') {
    consistency.source_analysis = JSON.parse(JSON.stringify(consistencyReport));
    consistency.status = require('../consistency/consistency-compat').status(consistencyReport);
  }
  const evaluation = {
    ...envelope, artifact_type: 'evaluation', status: 'running', ac_results: acResults, journeys,
    usability: { status: 'not-run', score: 0, max_score: 0, dimensions: [] }, consistency,
    summary: { ac_counts: counts(acResults), consistency_counts: consistencyCounts, journey_counts: counts(journeys) },
  };
  const actionsDocument = { ...envelope, artifact_type: 'actions', actions };
  const state = {
    ...envelope, artifact_type: 'state',
    lifecycle: { status: 'running', current_phase: 'journey', iteration: 0, max_iterations: 1, exit_reason: 'pending', iterations: [] },
    identity,
    phases: [],
  };
  return { documents: { 'pe-context.json': brief, 'pe-evaluation-snapshot.json': evaluation, 'pe-evidence.json': evidence, 'pe-actions.json': actionsDocument, 'pe-state.json': state }, identity };
}

module.exports = { buildDocuments };
