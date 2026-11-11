#!/usr/bin/env node
'use strict';

/** Merge selected local checks and host judgments into a fresh validated run. */
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const { parseArgs } = require('util');
const { spawnSync } = require('child_process');
const { classifyCriterion } = require('./classification/run-classification');
const { buildOverrides } = require('./classification/classify-ac-tier');
const { buildDocuments } = require('./artifacts/build-canonical-artifacts');
const { validateDirectory } = require('./artifacts/validate-canonical-artifacts');
const { importJudgments } = require('./inspection-contracts/inspection-bundle');
const compatibility = require('./consistency/consistency-compat');
const { loadRun } = require('./artifacts/split-contract');

const FILES = ['pe-context.json', 'pe-evaluation-snapshot.json', 'pe-evidence.json', 'pe-actions.json', 'pe-state.json'];
const CHECKS = ['classify', 'consistency-source', 'heuristic', 'consistency-visual'];
const hash = value => `sha256:${crypto.createHash('sha256').update(value).digest('hex')}`;
const readJson = file => JSON.parse(fs.readFileSync(file, 'utf8'));
const writeJson = (directory, name, value) => fs.writeFileSync(path.join(directory, name), `${JSON.stringify(value, null, 2)}\n`);

function command(program, args, cwd, allowed = [0], requiredOutput = null) {
  const result = spawnSync(program, args, { cwd, encoding: 'utf8', timeout: 120000, maxBuffer: 16 * 1024 * 1024 });
  if (result.error) throw result.error;
  if (!allowed.includes(result.status) || (requiredOutput && !fs.existsSync(requiredOutput))) throw new Error(`${path.basename(program)} failed to produce valid execution output: ${(result.stderr || result.stdout).slice(-2000)}`);
  return result.stdout.trim();
}

function phase(name, status, start, duration = 0) {
  return {
    name, status, model_invoked: false, provider: 'none', model: '',
    started_at: start, ended_at: new Date(Date.parse(start) + duration).toISOString(), duration_ms: duration,
    input_files: 0, input_bytes: 0, output_bytes: 0,
    token_usage: { input: 0, cached_input: 0, output: 0, reasoning_tokens: 0 }, llm_cost_usd: 0,
  };
}

function main() {
  const { values } = parseArgs({ options: {
    input: { type: 'string' }, output: { type: 'string' }, checks: { type: 'string' },
    workspace: { type: 'string' }, 'base-ref': { type: 'string' }, report: { type: 'boolean', default: false },
    'no-report': { type: 'boolean', default: false },
    'no-fix': { type: 'boolean', default: true },
    'judgment-bundle': { type: 'string' },
    'design-system': { type: 'string' }, 'design-system-version': { type: 'string' },
    guidelines: { type: 'string', multiple: true }, 'guideline-manifest': { type: 'string' },
  } });
  const reportRequested = values.report && !values['no-report'];
  if (typeof values.checks !== 'string' || !values.checks.trim()) throw new Error(`Select at least one check with --checks: ${CHECKS.join(', ')}`);
  const selected = values.checks.split(',').map(check => check.trim());
  if (!selected.length || selected.some(check => !check) || new Set(selected).size !== selected.length || selected.some(check => !CHECKS.includes(check))) throw new Error(`Select only: ${CHECKS.join(', ')}`);
  if (!values.input || !values.output) throw new Error('Usage: run-quick-checks.js --input packet.json --output <new-run-dir> --checks classify,consistency-source,heuristic,consistency-visual [--judgment-bundle <file>] [--workspace <repo> --base-ref <commit>] [--report]');
  // Run only the checks the caller selected. Classification, source analysis
  // and host-supplied judgments are not an automatic run-everything pipeline.
  const input = path.resolve(values.input);
  const packetBytes = fs.readFileSync(input);
  const packet = JSON.parse(packetBytes);
  if (!selected.includes('consistency-source') && (packet.consistency || ['design-system', 'design-system-version', 'guidelines', 'guideline-manifest'].some(key => values[key] !== undefined))) throw new Error('Consistency selection requires the selected consistency-source check');
  const { source, prototype, extract } = packet;
  if (!source || !['jira', 'ux-spec'].includes(source.kind) || !source.id || !source.revision || !source.snapshot_path) throw new Error('Packet needs source kind, id, revision, and snapshot_path');
  if (!prototype?.url || !prototype.revision || !extract?.key || !extract.title) throw new Error('Packet needs prototype url/revision and extract key/title');
  if (!Array.isArray(extract.ac_list)) throw new Error('Packet needs extract.ac_list (may be empty for consistency-only)');
  if (selected.includes('classify') && !extract.ac_list.length) throw new Error('Classification requires reviewed criteria');
  const ids = new Set();
  const sourceIds = new Set();
  for (const ac of extract.ac_list) {
    if (typeof ac.criterion_id !== 'string' || !ac.criterion_id || typeof ac.text !== 'string' || !ac.text.trim()) throw new Error('Every criterion needs a stable criterion_id and text');
    if (typeof ac.source_id !== 'string' || !ac.source_id) throw new Error(`${ac.criterion_id} needs a source_id, e.g. TICKET-123#1 or SPEC-1#AC-1`);
    if (ids.has(ac.criterion_id) || sourceIds.has(ac.source_id)) throw new Error('Duplicate criterion or source ID');
    ids.add(ac.criterion_id); sourceIds.add(ac.source_id);
  }
  const snapshot = fs.readFileSync(path.resolve(path.dirname(input), source.snapshot_path));
  const output = path.resolve(values.output);
  if (fs.existsSync(output)) throw new Error('Output must be a new run directory; existing runs are never overwritten');
  if (!fs.statSync(path.dirname(output)).isDirectory()) throw new Error('Output parent must already exist');
  let workspace;
  let baseRef = '';
  let changedFiles = [];
  let consistencySelection;
  function workspaceHead() {
    return command('git', ['rev-parse', 'HEAD'], workspace);
  }
  function assertWorkspace() {
    // Check before and after analysis so ordinary workspace edits cannot be
    // silently attributed to the packet's immutable commit. Never reset it.
    if (workspaceHead() !== prototype.revision || command('git', ['status', '--porcelain', '--untracked-files=all'], workspace)) throw new Error('Source checks require a clean workspace at the packet prototype revision');
  }
  if (selected.includes('consistency-source')) {
    const companion = path.resolve(__dirname, '../../uxd-consistency-check');
    for (const name of ['scripts/analyze.py', 'guidelines', 'VERSION']) {
      const resource = path.join(companion, name);
      const missing = () => new Error(`Selected consistency-source requires the optional uxd-consistency-check companion/plugin. Install it as a sibling skill at ${companion} (missing or invalid ${name}), or omit consistency-source.`);
      let stat;
      try { stat = fs.statSync(resource); } catch (error) {
        if (error.code !== 'ENOENT') throw error;
        throw missing();
      }
      if (name === 'guidelines' ? !stat.isDirectory() : !stat.isFile()) throw missing();
    }
    if (!values.workspace || !values['base-ref']) throw new Error('Source consistency requires --workspace and a pinned --base-ref');
    workspace = fs.realpathSync(path.resolve(values.workspace));
    if (fs.realpathSync(command('git', ['rev-parse', '--show-toplevel'], workspace)) !== workspace) throw new Error('Workspace must be the repository root');
    assertWorkspace();
    const analyzer = path.join(companion, 'scripts/analyze.py');
    const capabilities = command('python3', [analyzer, '--help'], workspace);
    if (['--design-system', '--design-system-version', '--guidelines', '--guideline-manifest'].some(flag => !capabilities.includes(flag))) throw new Error('Incompatible uxd-consistency-check companion: source checks require the explicit policy and frozen-manifest contract. Install a compatible companion, or omit consistency-source.');
    baseRef = command('git', ['rev-parse', '--verify', `${values['base-ref']}^{commit}`], workspace);
    changedFiles = command('git', ['diff', '--name-only', baseRef, 'HEAD', '--'], workspace).split('\n').filter(Boolean);
    consistencySelection = compatibility.selection(packet, values, workspace);
  }
  const stage = fs.mkdtempSync(path.join(path.dirname(output), '.quick-checks-'));
  // Save the exact inputs and each check's receipts in a temporary folder.
  // Install the finished run only after the combined results pass validation.
  const start = new Date().toISOString();
  try {
    fs.mkdirSync(path.join(stage, 'inputs'));
    fs.mkdirSync(path.join(stage, 'checks'));
    fs.writeFileSync(path.join(stage, 'inputs/packet.json'), packetBytes);
    fs.writeFileSync(path.join(stage, 'inputs/source.snapshot'), snapshot);
    const context = {
      route: 'quick-checks', source: { kind: source.kind, id: source.id, revision: source.revision, snapshot_path: 'inputs/source.snapshot', sha256: hash(snapshot) },
      packet: { path: 'inputs/packet.json', sha256: hash(packetBytes) },
      prototype, base_ref: baseRef, selected_checks: selected,
      model_context: { model_invoked: false, provider: 'none', model: '', submitted: false },
      normalization: 'Reviewed packet criteria; classification is not verification. No automatic spec updates.',
      checks: [],
    };
    const phases = [];
    let rows = [];
    if (selected.includes('classify')) {
      const checkStart = new Date().toISOString();
      const started = Date.now();
      const overrides = new Map(buildOverrides(extract).map(item => [item.criterion_id, item]));
      const classifications = extract.ac_list.map(ac => ({ criterion_id: ac.criterion_id, ...classifyCriterion(ac, overrides.get(ac.criterion_id)) }));
      writeJson(stage, 'checks/classify.json', classifications);
      // Preserve triage separately; classification is never verification.
      rows = classifications.map((result, index) => ({
        criterion_id: result.criterion_id, source: source.kind === 'jira' ? 'jira' : 'user',
        tier: result.tier, criterion_text: extract.ac_list[index].text,
        rationale: `Not verified; classification: ${result.reasonCode}.`,
        human_action: result.humanAction,
      }));
      phases.push(phase('classify', 'completed', checkStart, Date.now() - started));
      context.checks.push({ check: 'classify', producer: 'classification/run-classification.js/classifyCriterion', output: 'checks/classify.json', input: 'inputs/packet.json', normalization: 'All AC verdicts remain NOT_RUN, including backend-only exclusions.' });
    } else {
      rows = extract.ac_list.map(ac => ({ criterion_id: ac.criterion_id, source: source.kind === 'jira' ? 'jira' : 'user', tier: ac.tier || 'T1', criterion_text: ac.text, rationale: 'Not verified; classification was not selected.' }));
    }
    let consistency = { source_mode: { ran: false, violations: [] }, degraded: false, guidelines_version: 'not-run', summary: {} };
    if (workspace) {
      const checkStart = new Date().toISOString();
      const started = Date.now();
      const analyzer = path.resolve(__dirname, '../../uxd-consistency-check/scripts/analyze.py');
      const analyzed = compatibility.analyze({ workspace, stage, analyzer, baseRef, selected: consistencySelection, command });
      context.consistency_selection = analyzed.selected;
      command(process.execPath, [path.join(__dirname, 'consistency/validate-consistency.js'), path.join(stage, 'checks'), '--json'], stage);
      assertWorkspace();
      consistency = readJson(path.join(stage, 'checks/consistency-report.json'));
      phases.push(phase('consistency-source', 'completed', checkStart, Date.now() - started));
      context.checks.push({ check: 'consistency-source', producer: 'uxd-consistency-check/scripts/analyze.py', output: 'checks/consistency-report.json', input: 'clean workspace at prototype.revision', base_ref: baseRef, changed_files: changedFiles });
    }
    for (const receipt of context.checks) receipt.output_sha256 = hash(fs.readFileSync(path.join(stage, receipt.output)));
    const { documents } = buildDocuments({
      extract: { key: extract.key, title: extract.title, ac_list: extract.ac_list, extracted_at: start },
      delta: { changed_files: changedFiles }, consistency,
      evidence: { prototype_url: prototype.url, captured_at: start }, rows,
    });
    const brief = documents['pe-context.json'];
    brief.intent.tasks = packet.tasks || []; brief.intent.personas = packet.personas || [];
    if (packet.environment) brief.intent.environment = packet.environment;
    brief.intent.stage = rows.length ? 'complete' : brief.intent.tasks.length || brief.intent.personas.length || selected.some(check => ['heuristic', 'consistency-visual'].includes(check)) ? 'quick-checks' : 'consistency-source';
    if (packet.check_scope) brief.intent.check_scope = packet.check_scope;
    brief.intent.source_input = context.source;
    brief.intent.scope.source_mode = workspace ? 'workspace' : 'remote-only';
    brief.intent.scope.source_ref = prototype.revision;
    brief.intent.acceptance_criteria.forEach((ac, index) => { ac.source_id = extract.ac_list[index].source_id; });
    const evaluation = documents['pe-evaluation-snapshot.json'];
    if (workspace) {
      documents['pe-evidence.json'].source_items = [];
      for (const finding of evaluation.consistency.findings.filter(f => f.origin === 'source')) {
        const file = path.resolve(workspace, finding.file);
        if (!file.startsWith(`${workspace}${path.sep}`)) throw new Error('Source evidence path escapes workspace');
        const present = fs.existsSync(file);
        const real = present ? fs.realpathSync(file) : null;
        if (real && !real.startsWith(`${workspace}${path.sep}`)) throw new Error('Source evidence symlink escapes workspace');
        const id = `source-${hash(JSON.stringify([finding.file, finding.line, finding.id])).slice(7, 31)}`;
        // Missing-file findings are evidence of absence at this revision; null
        // is not the hash of an invented empty file or a browser observation.
        documents['pe-evidence.json'].source_items.push({ id, path: finding.file, line: finding.line, revision: prototype.revision, availability: present ? 'present' : 'absent', sha256: present ? hash(fs.readFileSync(real)) : null, observation: finding.description });
        finding.evidence_ids.push(id);
      }
    }
    evaluation.status = 'needs-attention';
    if (!workspace) evaluation.consistency.status = 'not-run';
    else if (!evaluation.consistency.source_checked || !evaluation.consistency.guidelines_checked) evaluation.consistency.status = 'degraded';
    else if (!rows.length && evaluation.consistency.status === 'passed') evaluation.status = 'passed';
    for (const finding of evaluation.consistency.findings.filter(item => !item.review_candidate)) {
      documents['pe-actions.json'].actions.push({
        id: `action-${finding.id}`, kind: 'human-followup', status: 'proposed', priority: 'normal', confidence: finding.confidence,
        source: { ac_id: null, finding_id: finding.id, evidence_ids: finding.evidence_ids }, recommendation: finding.recommendation,
        result: { changed_files: [] }, handoff: { requires_user_invocation: true, skill: 'uxd-prototype-evaluate', payload: {} },
      });
    }
    const judgments = importJudgments({ bundlePath: values['judgment-bundle'], packet, packetBytes, snapshot, stage, selected, documents });
    // Keep the host's model receipts and usage. This script combines those
    // results locally; it does not make the model calls itself.
    if (evaluation.consistency.source_analysis) evaluation.consistency.status = compatibility.status(evaluation.consistency.source_analysis, evaluation.consistency.findings);
    context.checks.push(...judgments.receipts);
    if (judgments.phases.length) {
      context.model_context = { model_invoked: true, phases: judgments.phases.map(item => ({ name: item.name, checks: item.checks, provider: item.provider, model: item.model })) };
      context.judgments = judgments.context;
    }
    context.canonical_links = {
      criteria: brief.intent.acceptance_criteria.map((ac, index) => ({
        check_output: selected.includes('classify') ? 'checks/classify.json' : 'inputs/packet.json', criterion_id: rows[index].criterion_id,
        source_id: ac.source_id, ac_id: ac.id, action_ids: evaluation.ac_results[index].action_ids,
      })),
      findings: evaluation.consistency.findings.filter(finding => finding.origin === 'source').map((finding, index) => ({
        check_output: 'checks/consistency-report.json', output_index: index, finding_id: finding.id,
        action_ids: documents['pe-actions.json'].actions.filter(action => action.source.finding_id === finding.id).map(action => action.id),
        evidence_ids: finding.evidence_ids,
      })),
    };
    writeJson(stage, 'checks/context.json', context);
    const state = documents['pe-state.json'];
    state.permissions = packet.permissions || Object.fromEntries(['browser', 'provider', 'prototype_edits', 'report', 'sharing'].map(name => [name, { status: 'not-requested', scope: '', recorded_at: start }]));
    state.identity.intent_key = hash(JSON.stringify({ source: context.source, extract, selected, tasks: brief.intent.tasks, personas: brief.intent.personas, environment: packet.environment, ...(context.consistency_selection ? { consistency_selection: context.consistency_selection } : {}), ...(packet.check_scope ? { check_scope: packet.check_scope } : {}) }));
    // Hash the inputs and code, not just the prototype URL. The same URL could
    // serve different content next time.
    state.identity.build_key = hash(JSON.stringify({ revision: prototype.revision, base_ref: baseRef, changed_files: changedFiles, ...(judgments.evidenceHash ? { evidence: judgments.evidenceHash } : {}) }));
    state.identity.evaluator_key = hash(JSON.stringify({ assembler: state.identity.evaluator_key, runner: hash(fs.readFileSync(__filename)), judgments: hash(fs.readFileSync(path.join(__dirname, 'inspection-contracts/inspection-bundle.js'))), judgment_producers: judgments.receipts.map(receipt => receipt.producer), classifier: hash(fs.readFileSync(path.join(__dirname, 'classification/run-classification.js'))), overrides: hash(fs.readFileSync(path.join(__dirname, 'classification/classify-ac-tier.js'))), ...(workspace ? { analyzer: hash(fs.readFileSync(path.resolve(__dirname, '../../uxd-consistency-check/scripts/analyze.py'))) } : {}) }));
    state.identity.compound_key = hash(JSON.stringify({ intent_key: state.identity.intent_key, build_key: state.identity.build_key, evaluator_key: state.identity.evaluator_key }));
    const runId = `eval-quick-${crypto.randomUUID()}`;
    const updatedAt = new Date().toISOString();
    for (const document of Object.values(documents)) {
      document.run_id = runId; document.producer = { name: 'uxd-prototype-evaluate-quick-checks', version: '1' };
      document.updated_at = updatedAt;
    }
    state.lifecycle = { status: 'completed', current_phase: selected.includes('heuristic') ? 'heuristic' : selected.includes('classify') ? 'classify' : 'consistency', iteration: 0, max_iterations: 1, exit_reason: 'no-fix', iterations: [] };
    state.quick_checks = { selected, context_path: 'checks/context.json', context_sha256: hash(fs.readFileSync(path.join(stage, 'checks/context.json'))), report_requested: reportRequested };
    state.phases = [...phases, ...judgments.phases, ...['extract', ...CHECKS, 'enrichment', 'hint', 'fix', 'journey', 'usability', 'report'].filter(name => !selected.includes(name) && !phases.some(item => item.name === name)).map(name => phase(name, 'skipped', start))];
    for (const item of phases) {
      const receipt = context.checks.find(check => check.check === item.name);
      item.input_files = 1; item.input_bytes = packetBytes.length;
      item.output_bytes = fs.statSync(path.join(stage, receipt.output)).size;
      if (item.name === 'consistency-source') { item.input_files = changedFiles.length; item.input_bytes = null; }
    }
    for (const filename of FILES) writeJson(stage, filename, documents[filename]);
    const validationStart = new Date().toISOString();
    const validation = validateDirectory(stage);
    if (!validation.valid) throw new Error(`Canonical merge rejected: ${JSON.stringify(validation.errors)}`);
    if (reportRequested) {
      // An integrity receipt, not the legacy full-evaluation HTML report.
      state.phases.push(phase('integrity-report', 'completed', validationStart, Date.now() - Date.parse(validationStart)));
      state.updated_at = new Date().toISOString();
      writeJson(stage, 'pe-state.json', state);
      const finalValidation = validateDirectory(stage);
      if (!finalValidation.valid) throw new Error(`Integrity state rejected: ${JSON.stringify(finalValidation.errors)}`);
      writeJson(stage, 'integrity-report.json', { run_id: runId, valid: true, checked_at: new Date().toISOString(), artifacts: FILES.map(filename => ({ path: filename, sha256: hash(fs.readFileSync(path.join(stage, filename))) })), summary: evaluation.summary, heuristic_findings: evaluation.heuristics?.findings.length || 0 });
    }
    // Validate linked context/result receipts as well as document schemas.
    loadRun(stage);
    // mkdir is exclusive: two callers targeting the same output cannot overwrite a run.
    fs.mkdirSync(output);
    for (const name of fs.readdirSync(stage)) fs.renameSync(path.join(stage, name), path.join(output, name));
    const publishedValidation = validateDirectory(output);
    if (!publishedValidation.valid) throw new Error(`Published run failed readback: ${JSON.stringify(publishedValidation.errors)}`);
    loadRun(output);
    process.stdout.write(`${JSON.stringify({ route: 'quick-checks', run_id: runId, artifacts_dir: output, selected, model_invoked: false, host_model_invoked: judgments.phases.length > 0, heuristic_findings: evaluation.heuristics?.findings.length || 0, report: reportRequested ? 'integrity-report.json' : null, summary: evaluation.summary })}\n`);
  } finally {
    fs.rmSync(stage, { recursive: true, force: true });
  }
}

if (require.main === module) {
  try { main(); } catch (error) { process.stderr.write(`${error.message}\n`); process.exitCode = 1; }
}
