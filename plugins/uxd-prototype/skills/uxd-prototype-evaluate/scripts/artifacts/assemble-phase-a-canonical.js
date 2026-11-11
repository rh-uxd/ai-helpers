#!/usr/bin/env node
'use strict';

// Build the five JSON files used by Quick and split evaluation. Running this
// file directly uses the older Phase A conversion/cache path, not Full.

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const { parseCSVLine } = require('../shared/csv-utils');
const { materializeTargets } = require('./legacy-artifact-adapter');
const { validateDirectory } = require('./validate-canonical-artifacts');
const { lookup, restore, store } = require('./xray-cache');

const CANONICAL_FILES = ['pe-context.json', 'pe-evaluation-snapshot.json', 'pe-evidence.json', 'pe-actions.json', 'pe-state.json'];
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

function readJson(file) { return JSON.parse(fs.readFileSync(file, 'utf8')); }

function filesUnder(directory) {
  const files = [];
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const target = path.join(directory, entry.name);
    if (entry.isDirectory()) files.push(...filesUnder(target));
    else if (entry.isFile() && entry.name !== '.DS_Store') files.push(target);
  }
  return files;
}

function parseAcceptanceRows(file) {
  const lines = fs.readFileSync(file, 'utf8').split(/\r?\n/);
  const headerIndex = lines.findIndex(line => line.startsWith('criterion_id,source,tier,criterion_text,'));
  if (headerIndex < 0) throw new Error('evaluation-report.csv has no acceptance-criteria header');
  const headers = parseCSVLine(lines[headerIndex]);
  const rows = [];
  for (const line of lines.slice(headerIndex + 1)) {
    if (!line || line.startsWith('# ')) break;
    const values = parseCSVLine(line);
    rows.push(Object.fromEntries(headers.map((header, index) => [header, values[index] || ''])));
  }
  return rows;
}

function counts(records) {
  const result = { pass: 0, fail: 0, flagged: 0, not_run: 0, total: records.length };
  for (const record of records) {
    if (record.verdict === 'PASS') result.pass += 1;
    if (record.verdict === 'FAIL') result.fail += 1;
    if (record.verdict === 'FLAGGED') result.flagged += 1;
    if (record.verdict === 'NOT_RUN') result.not_run += 1;
  }
  return result;
}

function localPhase(name, createdAt, inputFiles, inputBytes, outputBytes = 0) {
  return {
    name, status: 'completed', model_invoked: false, provider: 'none', model: '',
    started_at: createdAt, ended_at: createdAt, duration_ms: 0,
    input_files: inputFiles, input_bytes: inputBytes, output_bytes: outputBytes,
    token_usage: { input: 0, cached_input: 0, output: 0, reasoning_tokens: 0 },
    llm_cost_usd: 0,
  };
}

function canonicalFinding(finding, index, stableIdentity = false) {
  // Split runs identify source observations, not their display order. Keep the
  // legacy index-based identity for compatibility with existing run consumers.
  const digest = jsonHash({
    guideline_id: finding.guideline_id, file: finding.file, line: finding.line,
    property: finding.property, value: finding.value,
    ...(!stableIdentity ? { source_index: index } : {}),
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

function buildEvidence(legacy, envelope) {
  const capturedAt = timestamp(legacy.captured_at);
  const rawCapture = legacy.capture || {};
  const captureId = identifier(rawCapture.id || 'capture-phase-a', 'capture');
  const cropSubjects = new Map((legacy.crops || []).map(item => [`${item.subject?.role || ''}|${item.subject?.name || ''}`, item.subject]));
  const controls = (legacy.page?.controls || []).slice(0, 100).map((control, index) => {
    const role = control.role || ({ button: 'button', a: 'link', input: 'textbox', select: 'combobox', textarea: 'textbox' }[control.tag] || 'control');
    const name = bounded(control.name, 280, '');
    const matched = cropSubjects.get(`${role}|${name}`);
    return { role: bounded(role, 80, 'control'), name, locator: bounded(matched?.locator, 500, `${control.tag || role}:nth-of-type(${index + 1})`) };
  });
  const page = {
    title: bounded(legacy.page?.title, 500, ''),
    headings: (legacy.page?.headings || []).slice(0, 40).map(item => ({ level: Math.max(1, Math.min(6, Number(item.level) || 1)), text: bounded(item.text, 280, 'Heading') })),
    controls,
  };
  const rawImage = rawCapture.raw_image ? {
    path: portablePath(rawCapture.raw_image.path, 'screenshots/journey-baseline.png'),
    width: Number(rawCapture.raw_image.width), height: Number(rawCapture.raw_image.height),
    sha256: rawCapture.raw_image.sha256,
  } : undefined;
  const capture = {
    id: captureId,
    url: legacy.prototype_url,
    viewport: {
      width: Number(rawCapture.viewport?.width || legacy.viewport?.width || 1440),
      height: Number(rawCapture.viewport?.height || legacy.viewport?.height || 900),
      device_scale_factor: Number(rawCapture.viewport?.device_scale_factor || 1),
    },
    captured_at: capturedAt,
    dom_digest: jsonHash(page),
    ...(rawImage ? { raw_image: rawImage } : {}),
    page,
  };
  const items = (legacy.crops || []).map((item, index) => ({
    id: identifier(item.id || `evidence-phase-a-${index + 1}`, 'evidence'),
    capture_id: captureId,
    kind: item.kind === 'region' ? 'region' : 'component',
    purpose: ['ac', 'journey', 'usability', 'consistency'].includes(item.purpose) ? item.purpose : 'journey',
    subject: {
      role: bounded(item.subject?.role, 80, 'region'),
      name: bounded(item.subject?.name, 280, ''),
      locator: bounded(item.subject?.locator, 500, 'main'),
    },
    crop: {
      x: Number(item.crop.x), y: Number(item.crop.y), width: Number(item.crop.width),
      height: Number(item.crop.height), padding: Number(item.crop.padding),
    },
    image: {
      path: portablePath(item.image.path), width: Number(item.image.width),
      height: Number(item.image.height), sha256: item.image.sha256,
    },
    ...(item.dom ? { dom: { text: bounded(item.dom.text, 1000, ''), attributes: item.dom.attributes || {} } } : {}),
  }));
  return { ...envelope, artifact_type: 'evidence', captures: [capture], items };
}

function buildDocuments(artifactsDir, cacheDecision, inputs = null) {
  // Explicit inputs are the split route's in-memory boundary: never fall back
  // to stale CSV/legacy files when a selected check has no ACs or captures.
  const extract = inputs ? inputs.extract : readJson(path.join(artifactsDir, 'extract-state.json'));
  const delta = inputs ? inputs.delta : readJson(path.join(artifactsDir, 'mr-delta.json'));
  const consistencyReport = inputs ? inputs.consistency : readJson(path.join(artifactsDir, 'consistency-report.json'));
  const prototypeEvidence = inputs ? inputs.evidence : readJson(path.join(artifactsDir, 'prototype-evidence.json'));
  const rows = inputs ? inputs.rows : parseAcceptanceRows(path.join(artifactsDir, 'evaluation-report.csv'));
  if ((!inputs && !rows.length) || rows.length !== extract.ac_list.length) throw new Error('Classified AC count does not match extract-state.json');

  const createdAt = timestamp(prototypeEvidence.captured_at || extract.extracted_at);
  // Turn old AC IDs and tiers into the IDs used by the five JSON files. The
  // runners replace old defaults with the inputs the user actually reviewed.
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
  const tasks = (extract.tasks_to_be_done || []).map((task, index) => ({
    id: `task-${index + 1}`,
    title: bounded(task.task, 500, `Evaluate workflow ${index + 1}`),
    ac_ids: (task.covers_acs || []).map(id => acIdBySource.get(id)).filter(Boolean),
    target_route: bounded(task.source, 500, ''),
  }));
  if (!tasks.length) tasks.push({ id: 'task-1', title: 'Evaluate the primary workflow', ac_ids: [...acIdBySource.values()], target_route: '' });
  const selectedPersonas = extract.persona_selection?.selected || [];
  const personas = selectedPersonas.map((selection, index) => {
    const parts = String(selection).split('+');
    const experience = ['junior', 'senior', 'experienced'].includes(parts.at(-1)) ? parts.pop() : 'mixed';
    const role = parts.join('+') || `persona-${index + 1}`;
    return { id: identifier(`persona-${selection}`, 'persona'), label: bounded(role.replace(/[-+]/g, ' '), 160, 'Prototype user'), experience, task_ids: tasks.map(task => task.id) };
  });
  if (!personas.length) personas.push({ id: 'persona-prototype-user', label: 'Prototype user', experience: 'mixed', task_ids: tasks.map(task => task.id) });

  const changedFiles = (delta.changed_files || []).map(file => portablePath(file, '')).filter(Boolean);
  const intent = {
    stage: 'complete', title: bounded(extract.title, 500, extract.key), acceptance_criteria: acceptanceCriteria,
    tasks, personas,
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
  // Hash the schemas, rules and available companion files so cached results
  // do not get reused after the code or rules that made them have changed.
  const consistencyRoot = path.resolve(
    skillRoot, '..', 'uxd-consistency-check'
  );
  const evaluatorFiles = [
    ...filesUnder(path.join(skillRoot, 'schemas', 'v1')),
    ...filesUnder(path.join(skillRoot, 'config')),
    ...[
      'artifacts/assemble-phase-a-canonical.js', 'artifacts/legacy-artifact-adapter.js', 'shared/csv-utils.js', 'artifacts/linked-artifact-contract.js',
      'artifacts/xray-cache.js', 'artifacts/split-contract.js', 'artifacts/validate-canonical-artifacts.js', 'task-verification/walkthrough-contract.js', 'workflow/evaluation-plan.js',
      'consistency/consistency-compat.js', 'consistency/consistency-contract.js', 'consistency/validate-consistency.js',
      ...(inputs
        ? ['run-quick-checks.js', 'inspection-contracts/inspection-bundle.js', 'classification/run-classification.js', 'classification/classify-ac-tier.js']
        : []),
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
  const producer = { name: 'uxd-prototype-evaluate-phase-a', version: PRODUCER_VERSION };
  const envelope = { created_at: createdAt, updated_at: createdAt, $schema: SCHEMA, schema_version: VERSION, run_id: runId, prototype_key: extract.key, producer };
  const brief = { ...envelope, artifact_type: 'brief', intent };
  const evidence = inputs && !prototypeEvidence.capture
    ? { ...envelope, artifact_type: 'evidence', captures: [], items: [] }
    : buildEvidence(prototypeEvidence, envelope);

  const actions = [];
  // A blank classification result becomes NOT_RUN. Writing these files does
  // not check the prototype in a browser; the runners add that evidence later.
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
    // CSV rows carry legacy classification labels, not evidence-backed
    // verification receipts. Preserve the legacy CSV file as-is, but never
    // promote its PASS/FAIL/FLAGGED value into the canonical result.
    const hasUnverifiedLegacyVerdict = ['PASS', 'FAIL', 'FLAGGED'].includes(row.verdict);
    return {
      ac_id: acIdBySource.get(row.criterion_id), verdict: 'NOT_RUN',
      rationale: hasUnverifiedLegacyVerdict
        ? 'Legacy CSV outcome has no canonical evidence-backed verification receipt; treated as not tested.'
        : bounded(row.rationale, 280, 'Pending evaluation.'),
      evidence_ids: [], action_ids: actionIds, evaluated_by: null, updated_at: createdAt,
    };
  });

  const taskBySourceAc = sourceIds => tasks.find(task => sourceIds.some(id => task.ac_ids.includes(acIdBySource.get(id)))) || tasks[0];
  const personaBySelection = selection => personas.find(persona => persona.id === identifier(`persona-${selection}`, 'persona')) || personas[0];
  const journeys = (extract.journey_definitions || []).map((journey, index) => ({
    id: identifier(journey.id || `journey-${index + 1}`, 'journey'),
    task_id: taskBySourceAc(journey.ac_ids || []).id,
    persona_id: personaBySelection(journey.persona).id,
    ac_ids: (journey.ac_ids || []).map(id => acIdBySource.get(id)).filter(Boolean),
    source: bounded(journey.source, 280, 'Jira acceptance criteria'), verdict: 'NOT_RUN', steps: [],
  })).filter(journey => journey.ac_ids.length);

  const findings = (consistencyReport.source_mode?.violations || []).map((finding, index) => canonicalFinding(finding, index, Boolean(inputs)));
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
  const inputFiles = ['extract-state.json', 'mr-delta.json', 'evaluation-report.csv', 'consistency-report.json', 'prototype-evidence.json'];
  const inputBytes = inputs ? Buffer.byteLength(JSON.stringify(inputs)) : inputFiles.reduce((sum, file) => sum + fs.statSync(path.join(artifactsDir, file)).size, 0);
  const state = {
    ...envelope, artifact_type: 'state',
    lifecycle: { status: 'running', current_phase: 'journey', iteration: 0, max_iterations: 1, exit_reason: 'pending', iterations: [] },
    identity,
    cache: {
      decision: cacheDecision.decision, entry_key: identity.compound_key,
      invalidated_by: cacheDecision.invalidated_by, restored_artifacts: [],
    },
    phases: [
      localPhase('extract', createdAt, 2, inputBytes),
      localPhase('consistency-source', createdAt, changedFiles.length, inputBytes),
      localPhase('classify', createdAt, 1, inputBytes),
    ],
  };
  return { documents: { 'pe-context.json': brief, 'pe-evaluation-snapshot.json': evaluation, 'pe-evidence.json': evidence, 'pe-actions.json': actionsDocument, 'pe-state.json': state }, identity };
}

function writeDocuments(directory, documents) {
  fs.mkdirSync(directory, { recursive: true });
  for (const filename of CANONICAL_FILES) fs.writeFileSync(path.join(directory, filename), `${JSON.stringify(documents[filename], null, 2)}\n`);
}

function loadDocuments(directory) {
  return Object.fromEntries(CANONICAL_FILES.map(filename => [filename, readJson(path.join(directory, filename))]));
}

function compareLegacyParity(artifactsDir, documents) {
  // For the old CLI, convert back and compare key fields with the original
  // files. This checks the conversion; it does not rerun the evaluation.
  const projected = materializeTargets(documents, ['csv', 'consistency', 'evidence']);
  const originalRows = parseAcceptanceRows(path.join(artifactsDir, 'evaluation-report.csv'));
  const projectedTemp = path.join(artifactsDir, `.phase-a-parity-${process.pid}.csv`);
  fs.writeFileSync(projectedTemp, projected.get('evaluation-report.csv'));
  let projectedRows;
  try { projectedRows = parseAcceptanceRows(projectedTemp); } finally { fs.rmSync(projectedTemp, { force: true }); }
  // Classification metadata is round-tripped, but a legacy CSV verdict is not
  // imported into canonical verification. The original CSV remains untouched.
  const rowView = rows => rows.map(row => ({ id: row.criterion_id, tier: row.tier, human_action: row.human_action }));
  if (stableJson(rowView(originalRows)) !== stableJson(rowView(projectedRows))) throw new Error('Canonical AC projection does not match the legacy classification contract');
  const originalConsistency = readJson(path.join(artifactsDir, 'consistency-report.json'));
  const projectedConsistency = projected.get('consistency-report.json');
  if ((originalConsistency.source_mode?.violations || []).length !== (projectedConsistency.source_mode?.violations || []).length) throw new Error('Canonical consistency projection changed the source finding count');
  const originalEvidence = readJson(path.join(artifactsDir, 'prototype-evidence.json'));
  const projectedEvidence = projected.get('prototype-evidence.json');
  if (originalEvidence.capture?.raw_image?.path !== projectedEvidence.captures?.[0]?.raw_image?.path) throw new Error('Canonical evidence projection changed the baseline image');
  return { ac_rows: originalRows.length, source_findings: (originalConsistency.source_mode?.violations || []).length, crop_items: documents['pe-evidence.json'].items.length };
}

function install(stage, artifactsDir) {
  const backups = [];
  const installed = [];
  try {
    for (const filename of CANONICAL_FILES) {
      const destination = path.join(artifactsDir, filename);
      if (fs.existsSync(destination)) {
        const backup = path.join(artifactsDir, `.${filename}.phase-a-backup-${process.pid}`);
        fs.renameSync(destination, backup);
        backups.push([backup, destination]);
      }
      fs.renameSync(path.join(stage, filename), destination);
      installed.push(destination);
    }
    backups.forEach(([backup]) => fs.rmSync(backup, { force: true }));
  } catch (error) {
    installed.forEach(file => fs.rmSync(file, { force: true }));
    backups.forEach(([backup, destination]) => { if (fs.existsSync(backup)) fs.renameSync(backup, destination); });
    throw error;
  }
}

function installLegacyActionArtifacts(artifactsDir, documents) {
  // Refresh the old suggestions and fix log whether or not the cache was used.
  // These are file conversions, not edits to the prototype.
  const projected = materializeTargets(documents, ['actions']);
  for (const [filename, value] of projected) {
    const destination = path.join(artifactsDir, filename);
    const temporary = path.join(artifactsDir, `.${filename}.phase-a-${process.pid}`);
    fs.writeFileSync(temporary, `${JSON.stringify(value, null, 2)}\n`);
    fs.renameSync(temporary, destination);
  }
}

function main() {
  const args = process.argv.slice(2);
  const jsonMode = args.includes('--json');
  let bypassCache = args.includes('--no-cache');
  const artifactsArg = args.find(arg => !arg.startsWith('--'));
  if (!artifactsArg) throw new Error('Usage: assemble-phase-a-canonical.js <artifacts-dir> [--json] [--no-cache]');
  const artifactsDir = path.resolve(artifactsArg);
  const cacheRoot = path.join(path.dirname(artifactsDir), 'cache', 'phase-a-v1');
  const previousState = fs.existsSync(path.join(artifactsDir, 'pe-state.json')) ? readJson(path.join(artifactsDir, 'pe-state.json')) : null;
  const preliminary = buildDocuments(artifactsDir, { decision: 'miss', invalidated_by: ['intent', 'build', 'evaluator'] });
  // Legacy five-file caches cannot preserve the modern frozen-source closure.
  bypassCache ||= Boolean(preliminary.documents['pe-evaluation-snapshot.json'].consistency.source_analysis);
  const fullCacheRoot = path.join(path.dirname(artifactsDir), 'cache', 'full-v1');
  const fullLookup = bypassCache
    ? { decision: 'miss', invalidated_by: ['cache_bypassed'] }
    : lookup(fullCacheRoot, preliminary.identity, previousState?.identity || null);
  if (fullLookup.decision === 'hit') {
    const fullStage = fs.mkdtempSync(path.join(path.dirname(artifactsDir), '.full-cache-stage-'));
    try {
      restore(fullCacheRoot, preliminary.identity, fullStage);
      const documents = loadDocuments(fullStage);
      documents['pe-state.json'].cache = {
        decision: 'hit', entry_key: preliminary.identity.compound_key,
        invalidated_by: ['none'], restored_artifacts: [...CANONICAL_FILES], validated_at: timestamp(),
      };
      documents['pe-state.json'].phases = documents['pe-state.json'].phases.map(phase => ({ ...phase, status: 'cached' }));
      writeDocuments(fullStage, documents);
      // Full-cache stages intentionally contain only five canonical files.
      const validation = validateDirectory(fullStage, { skipLinkedArtifacts: true });
      if (!validation.valid) throw new Error(`Full cache restore failed validation: ${JSON.stringify(validation.errors)}`);
      install(fullStage, artifactsDir);
      installLegacyActionArtifacts(artifactsDir, documents);
      const result = {
        status: 'completed', model_invoked: false, implementation: path.basename(__filename),
        cache: 'full-hit', skip_paid_phases: true,
        compound_key: preliminary.identity.compound_key, canonical_files: [...CANONICAL_FILES],
      };
      process.stdout.write(jsonMode ? `${JSON.stringify(result)}\n` : 'Restored complete canonical evaluation; paid phases skipped.\n');
      return;
    } finally { fs.rmSync(fullStage, { recursive: true, force: true }); }
  }
  const cacheLookup = bypassCache
    ? { decision: 'miss', invalidated_by: ['cache_bypassed'] }
    : lookup(cacheRoot, preliminary.identity, previousState?.identity || null);
  const stage = fs.mkdtempSync(path.join(path.dirname(artifactsDir), '.phase-a-stage-'));
  try {
    let documents;
    if (cacheLookup.decision === 'hit') {
      restore(cacheRoot, preliminary.identity, stage);
      documents = loadDocuments(stage);
      documents['pe-state.json'].cache = {
        decision: 'hit', entry_key: preliminary.identity.compound_key, invalidated_by: ['none'],
        restored_artifacts: [...CANONICAL_FILES], validated_at: timestamp(),
      };
      documents['pe-state.json'].phases = documents['pe-state.json'].phases.map(phase => ({ ...phase, status: 'cached' }));
      writeDocuments(stage, documents);
    } else {
      documents = buildDocuments(artifactsDir, cacheLookup).documents;
      writeDocuments(stage, documents);
    }
    if (documents['pe-evaluation-snapshot.json'].consistency.source_analysis?.evaluator_publication) require('./split-contract').copyTree(path.join(artifactsDir, '.artifacts'), path.join(stage, '.artifacts'));
    // Legacy Phase-A staging may omit referenced source/image files; consumer validation stays strict.
    const validation = validateDirectory(stage, { skipLinkedArtifacts: true });
    if (!validation.valid) throw new Error(`Phase A canonical validation failed: ${JSON.stringify(validation.errors)}`);
    const parity = compareLegacyParity(artifactsDir, documents);
    if (cacheLookup.decision !== 'hit' && !documents['pe-evaluation-snapshot.json'].consistency.source_analysis) store(cacheRoot, stage);
    install(stage, artifactsDir);
    installLegacyActionArtifacts(artifactsDir, documents);
    const result = {
      status: 'completed', model_invoked: false, implementation: path.basename(__filename),
      cache: bypassCache ? 'bypassed' : cacheLookup.decision,
      cache_bypassed: bypassCache, compound_key: preliminary.identity.compound_key,
      canonical_files: [...CANONICAL_FILES], parity,
    };
    process.stdout.write(jsonMode ? `${JSON.stringify(result)}\n` : `Assembled ${CANONICAL_FILES.length} canonical Phase A files (${cacheLookup.decision}).\n`);
  } finally {
    fs.rmSync(stage, { recursive: true, force: true });
  }
}

if (require.main === module) {
  try { main(); } catch (error) { process.stderr.write(`${error.message}\n`); process.exitCode = 1; }
}

module.exports = { buildDocuments, compareLegacyParity, parseAcceptanceRows };
