#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const C = require('../artifacts/split-contract');
const S = require('./evaluation-synthesis');

const CANONICAL_FILES = [
  'pe-context.json',
  'pe-evaluation-snapshot.json',
  'pe-evidence.json',
  'pe-actions.json',
  'pe-state.json',
];

function isRegularFile(file) {
  try {
    const stat = fs.lstatSync(file);
    return stat.isFile() && !stat.isSymbolicLink();
  } catch (error) {
    if (error.code === 'ENOENT') return false;
    throw error;
  }
}

function isUtcTimestamp(value) {
  if (typeof value !== 'string' || !value.endsWith('Z') || !Number.isFinite(Date.parse(value))) return false;
  try { return new Date(value).toISOString() === value; }
  catch { return false; }
}

function validatePublishInput(directory) {
  directory = path.resolve(directory);
  if (!fs.existsSync(directory) || !fs.statSync(directory).isDirectory()) throw new Error(`Evaluation directory does not exist: ${directory}`);
  const present = CANONICAL_FILES.map(name => fs.existsSync(path.join(directory, name)));
  const hasCanonicalFiles = present.some(Boolean);
  const report = path.join(directory, 'evaluation-report.html');
  const integrityPath = path.join(directory, 'report-integrity.json');

  if (hasCanonicalFiles) {
    if (!present.every(Boolean)) throw new Error('Canonical evaluation is partial; all five canonical files are required.');
    const documents = C.loadRun(directory);
    if (!isRegularFile(report)) throw new Error('Canonical evaluation report is missing or is not a regular file.');
    if (!isRegularFile(integrityPath)) throw new Error('Canonical report-integrity.json is missing or is not a regular file.');
    const integrity = JSON.parse(fs.readFileSync(integrityPath, 'utf8'));
    const snapshotHash = C.digest(directory);
    const htmlHash = C.hash(fs.readFileSync(report));
    const synthesisHash = C.hash(S.chatMarkdown(S.build(documents)));
    const generatedAt = integrity.generated_at;
    if (integrity.run_id !== documents['pe-context.json'].run_id
      || integrity.artifact_sha256 !== snapshotHash
      || integrity.html_sha256 !== htmlHash
      || integrity.synthesis_sha256 !== synthesisHash
      || !isUtcTimestamp(generatedAt)) {
      throw new Error('Canonical report does not match its run-bound integrity receipt.');
    }
    return { mode: 'canonical', run_id: integrity.run_id, artifact_sha256: snapshotHash, html_sha256: htmlHash };
  }

  throw new Error('Report publication requires all five canonical JSON files; CSV/HTML alone are not evaluation results.');
}

function main() {
  const args = process.argv.slice(2);
  const directory = args.find(arg => !arg.startsWith('--'));
  if (!directory || args.length !== 1) throw new Error('Usage: validate-publish-input.js <run-directory>');
  const result = validatePublishInput(directory);
  process.stdout.write(`${JSON.stringify(result)}\n`);
}

if (require.main === module) {
  try { main(); } catch (error) {
    process.stderr.write(`${error.message}\n`);
    process.exitCode = 1;
  }
}

module.exports = { validatePublishInput };
