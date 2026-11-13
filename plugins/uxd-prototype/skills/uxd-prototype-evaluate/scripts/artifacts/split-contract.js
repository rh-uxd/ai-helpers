'use strict';

// Read, check and save evaluation runs in one place. "publish" below just
// saves a checked run locally; it does not push to Git or share a prototype.
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const { isDeepStrictEqual } = require('util');
const { canonicalRoot, verifyLinkedArtifacts } = require('./linked-artifact-contract');
const FILES = ['pe-context.json', 'pe-evaluation-snapshot.json', 'pe-evidence.json', 'pe-actions.json', 'pe-state.json'];
const hash = value => `sha256:${crypto.createHash('sha256').update(value).digest('hex')}`;
const read = file => {
  if (fs.statSync(file).size > 16 * 1024 * 1024) throw new Error('JSON artifact exceeds 16 MiB');
  return JSON.parse(fs.readFileSync(file, 'utf8'));
};
const write = (root, name, data) => fs.writeFileSync(path.join(root, name), `${JSON.stringify(data, null, 2)}\n`, { flag: 'wx' });
// Review identity covers exact canonical bytes, not a reserialized equivalent.
// Linked receipts/images are checked separately by loadRun before consumption.
const digest = root => {
  const base = canonicalRoot(root);
  return hash(JSON.stringify(FILES.map(name => [name, hash(fs.readFileSync(path.join(base, name)))])));
};

function referenceBytes(root, reference) {
  if (!reference || typeof reference.path !== 'string' || !/^[A-Za-z0-9._+@=/-]+$/.test(reference.path) || reference.path.split('/').some(p => !p || p === '.' || p === '..')) throw new Error('Invalid portable artifact reference');
  const base = fs.realpathSync(root);
  const file = fs.realpathSync(path.join(base, reference.path));
  if (!file.startsWith(`${base}${path.sep}`) || !fs.statSync(file).isFile() || fs.statSync(file).size > 32 * 1024 * 1024) throw new Error('Artifact reference escapes run or exceeds size bound');
  const bytes = fs.readFileSync(file);
  if (hash(bytes) !== reference.sha256) throw new Error(`Artifact file/hash mismatch: ${reference.path}`);
  return bytes;
}

function copyTree(source, target) {
  if (fs.lstatSync(source).isSymbolicLink()) throw new Error('Run artifacts cannot contain symlinks');
  fs.mkdirSync(target);
  for (const entry of fs.readdirSync(source, { withFileTypes: true })) {
    if (entry.isSymbolicLink()) throw new Error('Run artifacts cannot contain symlinks');
    const from = path.join(source, entry.name); const to = path.join(target, entry.name);
    if (entry.isDirectory()) copyTree(from, to);
    else if (entry.isFile()) fs.copyFileSync(from, to, fs.constants.COPYFILE_EXCL);
    else throw new Error('Run artifact is not a regular file');
  }
}

function copyReference(root, stage, reference) {
  // Validate both the portable name and its resolved location: lexical checks
  // alone would allow a symlink to import bytes from outside the producer bundle.
  if (!reference || !/^(?:evidence|checks)\/[A-Za-z0-9._+@=/-]+$/.test(reference.path || '') || reference.path.split('/').some(p => !p || p === '.' || p === '..')) throw new Error('Receipt path must be a portable evidence/ or checks/ path');
  const base = fs.realpathSync(root);
  const file = fs.realpathSync(path.join(base, reference.path));
  if (!file.startsWith(`${base}${path.sep}`) || !fs.statSync(file).isFile() || fs.statSync(file).size > 32 * 1024 * 1024) throw new Error('Receipt escapes bundle or exceeds size bound');
  const bytes = fs.readFileSync(file);
  if (hash(bytes) !== reference.sha256) throw new Error(`Receipt hash mismatch: ${reference.path}`);
  const target = path.join(stage, reference.path);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  if (fs.existsSync(target)) {
    if (hash(fs.readFileSync(target)) !== reference.sha256) throw new Error(`Receipt collision: ${reference.path}`);
  } else fs.writeFileSync(target, bytes, { flag: 'wx' });
}

function loadRun(root) {
  // Check the JSON records and their linked files. Both must agree before a
  // caller can trust this run or use its hash to record a review decision.
  root = canonicalRoot(root);
  const check = require('./validate-canonical-artifacts').validateDirectoryCore(root);
  if (check.errors.length) throw new Error(`Invalid canonical run: ${JSON.stringify(check.errors)}`);
  const docs = check.documents;
  const linkedErrors = verifyLinkedArtifacts(root, docs);
  if (linkedErrors.length) throw new Error(`Invalid linked artifacts: ${JSON.stringify(linkedErrors)}`);
  return docs;
}

function publish(output, build, finalize) {
  output = path.resolve(output);
  if (fs.existsSync(output)) throw new Error('Output must be a fresh run directory');
  const stage = fs.mkdtempSync(path.join(path.dirname(output), '.split-'));
  try {
    const docs = build(stage);
    for (const name of FILES) write(stage, name, docs[name]);
    // Validate the copied receipts as well as schemas before making this run visible.
    loadRun(stage);
    if (finalize) finalize(stage);
    // Exclusive reservation prevents a second publisher overwriting a completed run.
    fs.mkdirSync(output);
    for (const name of fs.readdirSync(stage)) fs.renameSync(path.join(stage, name), path.join(output, name));
    loadRun(output);
    return docs;
  } finally { fs.rmSync(stage, { recursive: true, force: true }); }
}

function identify(docs, route, inputs) {
  // Give the requested work, prototype inputs and evaluator code their own
  // hashes so a changed build cannot pass itself off as the same evidence.
  const id = `eval-${route}-${crypto.randomUUID()}`;
  const updatedAt = new Date().toISOString();
  for (const doc of Object.values(docs)) {
    doc.run_id = id;
    doc.updated_at = updatedAt;
    doc.producer = { name: 'uxd-prototype-evaluate-split', version: '0.1.0' };
  }
  const state = docs['pe-state.json'];
  const intent = structuredClone(docs['pe-context.json'].intent);
  delete intent.scope.source_ref; delete intent.scope.changed_files; delete intent.scope.prototype_url;
  if (intent.evaluation_plan) { delete intent.evaluation_plan.packet_sha256; delete intent.evaluation_plan.reviewed_at; }
  const sourceAnalysis = docs['pe-evaluation-snapshot.json']?.consistency.source_analysis;
  state.identity.intent_key = hash(JSON.stringify({ ...intent, ...(sourceAnalysis ? { consistency_selection: { design_system: sourceAnalysis.design_system, manifest_version: sourceAnalysis.guidelines_version, context: sourceAnalysis.guideline_context } } : {}) }));
  state.identity.build_key = hash(JSON.stringify(inputs));
  // Include transitive local rules/validators, not just the entry-point scripts.
  // This is a conservative implementation fingerprint, not proof of host/model
  // context or permission to reuse prior evidence. Model receipts remain separate.
  // Exact script bytes include comments; comment-only edits also change this key.
  const skillRoot = path.resolve(__dirname, '../..');
  const skillsRoot = path.dirname(skillRoot);
  const dependencies = [];
  function collect(file) {
    const name = path.relative(skillsRoot, file).split(path.sep).join('/');
    if (!fs.existsSync(file)) { dependencies.push([name, null]); return; }
    const stat = fs.lstatSync(file);
    if (stat.isSymbolicLink()) throw new Error('Evaluator dependencies cannot be symlinks');
    if (stat.isDirectory()) {
      for (const entry of fs.readdirSync(file).sort()) collect(path.join(file, entry));
    } else if (stat.isFile() && (name.endsWith('/VERSION') || /\.(?:js|py|sh|json|md)$/.test(name))) {
      dependencies.push([name, hash(fs.readFileSync(file))]);
    }
  }
  for (const name of ['scripts', 'schemas/v1', 'config', 'references', 'SKILL.md', 'package.json', 'package-lock.json']) collect(path.join(skillRoot, name));
  for (const name of ['scripts', 'schemas', 'guidelines', 'VERSION']) collect(path.join(skillsRoot, 'uxd-consistency-check', name));
  state.identity.evaluator_key = hash(JSON.stringify(dependencies));
  const { intent_key, build_key, evaluator_key } = state.identity;
  state.identity.compound_key = hash(JSON.stringify({ intent_key, build_key, evaluator_key }));
}

function counts(rows) {
  const result = { pass: 0, fail: 0, flagged: 0, not_run: 0, total: rows.length };
  const verdictKeys = { PASS: 'pass', FAIL: 'fail', FLAGGED: 'flagged', NOT_RUN: 'not_run' };
  for (const row of rows) {
    const verdict = row?.verdict;
    if (typeof verdict !== 'string' || !Object.prototype.hasOwnProperty.call(verdictKeys, verdict)) {
      throw new Error(`Unsupported verdict: ${String(verdict)}`);
    }
    result[verdictKeys[verdict]] += 1;
  }
  return result;
}

function validateSplit(docs) {
  // Check cross-file references as well as each document's shape.
  const errors = [];
  const add = message => errors.push({ path: 'pe-context.json/intent/environment', code: 'split_contract', message });
  const brief = docs['pe-context.json'].intent;
  const env = brief.environment;
  if (env) {
    const maps = {};
    for (const [name, rows] of Object.entries(env)) {
      maps[name] = new Map(rows.map(row => [row.id, row]));
      if (maps[name].size !== rows.length) add(`Duplicate ${name} ID`);
    }
    const refs = (values, name) => { for (const id of values || []) if (!maps[name].has(id)) add(`Unknown ${name} reference ${id}`); };
    for (const screen of env.screens) refs(screen.source_ids, 'source_sections');
    for (const state of env.states) { refs([state.screen_id], 'screens'); refs(state.source_ids, 'source_sections'); }
    for (const fixture of env.fixtures) refs(fixture.state_ids, 'states');
    refs(brief.acceptance_criteria.map(ac => ac.source_id), 'source_sections');
    for (const task of brief.tasks) {
      for (const [key, collection] of [['screen_ids', 'screens'], ['state_ids', 'states'], ['role_ids', 'roles'], ['fixture_ids', 'fixtures'], ['source_ids', 'source_sections']]) refs(task[key], collection);
      for (const stateId of task.state_ids || []) if (!task.screen_ids?.includes(maps.states.get(stateId)?.screen_id)) add('Task state must belong to a selected screen');
    }
    for (const persona of brief.personas) {
      if (persona.role_id) {
        refs([persona.role_id], 'roles');
        if (maps.roles.get(persona.role_id)?.setup_only) add('Setup-only role cannot be a walkthrough persona');
        for (const taskId of persona.task_ids) {
          const task = brief.tasks.find(t => t.id === taskId);
          if (task?.role_ids && !task.role_ids.includes(persona.role_id)) add('Persona role is outside task scope');
        }
      }
    }
    for (const capture of docs['pe-evidence.json'].captures) {
      if (capture.screen_id) refs([capture.screen_id], 'screens');
      if (capture.state_id) {
        refs([capture.state_id], 'states');
        if (maps.states.get(capture.state_id)?.screen_id !== capture.screen_id) add('Capture screen/state mismatch');
      }
    }
  }
  for (const item of docs['pe-evidence.json'].source_items || []) {
    if (item.revision !== brief.scope.source_ref) add('Source evidence revision mismatch');
    if ((item.availability === 'present') !== (item.sha256 !== null)) add('Source evidence hash must distinguish present and absent files');
  }
  const workflow = docs['pe-state.json'].workflow;
  if (workflow) {
    for (const action of docs['pe-actions.json'].actions) {
      if (action.source.origin_run_id && (action.source.origin_run_id !== workflow.parent_run_id || !action.source.origin_action_id)) add('Applied action origin must identify the parent run and action');
    }
    const unique = new Set();
    for (const pair of workflow.selected_pairs) {
      const key = `${pair.task_id}:${pair.persona_id}`;
      if (unique.has(key)) add('Duplicate selected task/persona pair'); unique.add(key);
      if (!brief.personas.some(p => p.id === pair.persona_id && p.task_ids.includes(pair.task_id))) add('Selected pair outside frozen brief');
    }
    if (workflow.route !== 'quick' && docs['pe-evaluation-snapshot.json'].journeys.some(j => !unique.has(`${j.task_id}:${j.persona_id}`))) add('Journey outside selected pairs');
    if (workflow.route !== 'quick') for (const result of docs['pe-evaluation-snapshot.json'].ac_results) {
      if (['PASS', 'FAIL'].includes(result.verdict) && !result.evidence_ids.length) add('Verified AC requires evidence');
    }
    if (workflow.selected_pairs.length) {
      if (!env) add('Walkthroughs require a typed environment');
      for (const task of brief.tasks) for (const field of ['screen_ids', 'state_ids', 'role_ids', 'fixture_ids', 'source_ids', 'expected_outcome']) if (task[field] === undefined) add(`Walkthrough task needs ${field}`);
      for (const persona of brief.personas) if (!persona.role_id) add('Walkthrough persona needs an explicit role');
    }
  }
  return errors;
}

module.exports = { FILES, hash, read, write, digest, referenceBytes, copyReference, copyTree, loadRun, publish, identify, counts, validateSplit, isDeepStrictEqual };
