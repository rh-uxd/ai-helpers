#!/usr/bin/env node
'use strict';

/**
 * Validate canonical evaluation JSON and atomically materialize temporary
 * legacy files for consumers that have not migrated yet.
 */

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');
const { validateDirectory } = require('./validate-canonical-artifacts');
const { materializeTargets } = require('./legacy-artifact-adapter');

const CANONICAL_FILES = ['brief.json', 'evaluation.json', 'evidence.json', 'actions.json', 'state.json'];
const TARGETS = ['csv', 'summary', 'consistency', 'extract', 'evidence', 'journey', 'actions', 'state'];
const MANAGED_FILES = new Set([
  'evaluation-report.csv',
  'evaluation-summary.json',
  'consistency-report.json',
  'extract-state.json',
  'prototype-evidence.json',
  'journey-log.json',
  'refinement-suggestions.json',
  'fix-log.json',
  'iteration-log.json',
  'eval-state.yaml',
]);

function adapterError(code, message, details) {
  const error = new Error(message);
  error.code = code;
  if (details) error.details = details;
  return error;
}

function parseArgs(argv) {
  const options = { json: false, replace: false };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--json') options.json = true;
    else if (arg === '--replace') options.replace = true;
    else if (arg === '--canonical-dir') options.canonicalDir = argv[++index];
    else if (arg === '--output-dir') options.outputDir = argv[++index];
    else if (arg === '--targets') options.targets = (argv[++index] || '').split(',').map(value => value.trim()).filter(Boolean);
    else throw adapterError('unknown_argument', `Unknown argument: ${arg}`);
  }
  if (!options.canonicalDir || !options.outputDir || !options.targets?.length) {
    throw adapterError('usage', 'Usage: scripts/artifacts/materialize-legacy-eval-artifacts.js --canonical-dir <dir> --output-dir <dir> --targets <csv,...> [--replace] [--json]');
  }
  const unknownTargets = options.targets.filter(target => !TARGETS.includes(target));
  if (unknownTargets.length) throw adapterError('unknown_target', `Unknown adapter target(s): ${unknownTargets.join(', ')}`);
  options.targets = [...new Set(options.targets)];
  return options;
}

function loadDocuments(canonicalDir) {
  return Object.fromEntries(CANONICAL_FILES.map(filename => [
    filename,
    JSON.parse(fs.readFileSync(path.join(canonicalDir, filename), 'utf8')),
  ]));
}

function serializeOutputs(outputs) {
  return new Map([...outputs].map(([filename, value]) => [
    filename,
    typeof value === 'string' ? value : `${JSON.stringify(value, null, 2)}\n`,
  ]));
}

function validateOutputDirectory(outputDir, replace) {
  // Replace only files this adapter owns. --replace must not delete unrelated
  // files just because they happen to be in the output folder.
  if (!fs.existsSync(outputDir)) return;
  if (!fs.statSync(outputDir).isDirectory()) throw adapterError('output_not_directory', 'The output path exists and is not a directory.');
  const entries = fs.readdirSync(outputDir, { withFileTypes: true });
  if (entries.length === 0) return;
  if (!replace) throw adapterError('output_collision', 'The output directory is not empty. Use a new directory or explicit --replace.');
  const unsafe = entries.filter(entry => !entry.isFile() || !MANAGED_FILES.has(entry.name));
  if (unsafe.length) {
    throw adapterError('unsafe_replace', `Refusing to replace a directory containing non-adapter files: ${unsafe.map(entry => entry.name).join(', ')}`);
  }
}

function validateDerivedFiles(stageDir, targets) {
  for (const filename of fs.readdirSync(stageDir)) {
    const filePath = path.join(stageDir, filename);
    if (filename.endsWith('.json')) JSON.parse(fs.readFileSync(filePath, 'utf8'));
  }
  if (targets.includes('csv')) {
    const csv = fs.readFileSync(path.join(stageDir, 'evaluation-report.csv'), 'utf8');
    const required = 'criterion_id,source,tier,criterion_text,verdict,rationale,evidence,fix_action,fix_file,human_action';
    if (!csv.includes(required)) throw adapterError('invalid_derived_csv', 'Derived CSV is missing the acceptance-criteria header.');
  }
  if (targets.includes('consistency')) {
    const result = spawnSync(process.execPath, [path.join(__dirname, '../consistency/validate-consistency.js'), stageDir, '--json'], { encoding: 'utf8' });
    if (result.status !== 0) {
      throw adapterError('invalid_derived_consistency', 'Derived consistency report failed the legacy validator.', (result.stdout || result.stderr || '').trim());
    }
  }
}

function atomicInstall(stageDir, outputDir) {
  const parent = path.dirname(outputDir);
  let backupDir = null;
  if (fs.existsSync(outputDir)) {
    backupDir = path.join(parent, `.legacy-adapter-backup-${process.pid}-${Date.now()}`);
    fs.renameSync(outputDir, backupDir);
  }
  try {
    fs.renameSync(stageDir, outputDir);
  } catch (error) {
    if (backupDir && fs.existsSync(backupDir) && !fs.existsSync(outputDir)) fs.renameSync(backupDir, outputDir);
    throw error;
  }
  if (backupDir) fs.rmSync(backupDir, { recursive: true, force: true });
}

function run(options) {
  // Check the JSON results first, then write only the requested old formats
  // into a separate folder. Never add CSV back into the live run as authority.
  const started = process.hrtime.bigint();
  const canonicalDir = path.resolve(options.canonicalDir);
  const outputDir = path.resolve(options.outputDir);
  if (canonicalDir === outputDir) throw adapterError('live_output_forbidden', 'The adapter cannot write into the canonical directory.');
  if (path.basename(outputDir) === 'eval') throw adapterError('live_output_forbidden', 'An output directory named eval is forbidden; use a separate shadow/compatibility directory.');

  const validation = validateDirectory(canonicalDir);
  if (!validation.valid) throw adapterError('invalid_canonical_input', 'Canonical artifacts failed validation.', validation.errors);
  validateOutputDirectory(outputDir, options.replace);

  const documents = loadDocuments(canonicalDir);
  const serialized = serializeOutputs(materializeTargets(documents, options.targets));
  const parent = path.dirname(outputDir);
  fs.mkdirSync(parent, { recursive: true });
  const stageDir = fs.mkdtempSync(path.join(parent, '.legacy-adapter-stage-'));
  try {
    for (const [filename, content] of serialized) fs.writeFileSync(path.join(stageDir, filename), content, 'utf8');
    if (options.targets.includes('consistency') && documents['evaluation.json'].consistency.source_analysis?.evaluator_publication) {
      require('./split-contract').copyTree(path.join(canonicalDir, '.artifacts'), path.join(stageDir, '.artifacts'));
    }
    validateDerivedFiles(stageDir, options.targets);
    atomicInstall(stageDir, outputDir);
  } catch (error) {
    if (fs.existsSync(stageDir)) fs.rmSync(stageDir, { recursive: true, force: true });
    throw error;
  }

  return {
    status: 'completed',
    semantic_parity: true,
    model_invoked: false,
    external_side_effects: false,
    duration_ms: Math.round(Number(process.hrtime.bigint() - started) / 1e6),
    targets: options.targets,
    files: [...serialized].map(([filename, content]) => ({
      filename,
      bytes: Buffer.byteLength(content),
      sha256: `sha256:${crypto.createHash('sha256').update(content).digest('hex')}`,
    })),
  };
}

function main() {
  let options;
  try {
    options = parseArgs(process.argv.slice(2));
    const result = run(options);
    process.stdout.write(options.json ? `${JSON.stringify(result)}\n` : `Materialized ${result.files.length} compatibility file(s).\n`);
  } catch (error) {
    const result = { status: 'failed', code: error.code || 'adapter_error', message: error.message };
    if (error.details) result.details = error.details;
    if (options?.json || process.argv.includes('--json')) process.stdout.write(`${JSON.stringify(result)}\n`);
    else process.stderr.write(`${result.code}: ${result.message}\n`);
    process.exitCode = error.code === 'usage' ? 2 : 1;
  }
}

if (require.main === module) main();

module.exports = { MANAGED_FILES, TARGETS, parseArgs, run };
