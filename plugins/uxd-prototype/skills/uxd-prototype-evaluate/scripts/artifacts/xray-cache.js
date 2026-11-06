'use strict';

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const { validateDirectory } = require('../validate-canonical-artifacts');

const CANONICAL_FILES = ['brief.json', 'evaluation.json', 'evidence.json', 'actions.json', 'state.json'];

function digest(buffer) {
  return `sha256:${crypto.createHash('sha256').update(buffer).digest('hex')}`;
}

function compoundKey(identity) {
  return digest(Buffer.from(JSON.stringify({
    intent_key: identity.intent_key,
    build_key: identity.build_key,
    evaluator_key: identity.evaluator_key,
  })));
}

function assertIdentity(identity) {
  for (const key of ['intent_key', 'build_key', 'evaluator_key']) {
    if (!/^sha256:[a-f0-9]{64}$/.test(identity && identity[key] || '')) throw new Error(`Invalid cache identity: ${key}`);
  }
  const expected = compoundKey(identity);
  if (identity.compound_key && identity.compound_key !== expected) throw new Error('Invalid cache identity: compound_key mismatch');
  return { ...identity, compound_key: expected };
}

function entryDirectory(cacheRoot, identity) {
  return path.join(path.resolve(cacheRoot), assertIdentity(identity).compound_key.slice('sha256:'.length));
}

function validateEntry(entryDir, expectedIdentity) {
  const manifestPath = path.join(entryDir, 'manifest.json');
  if (!fs.existsSync(manifestPath)) return { valid: false, reason: 'missing_manifest' };
  let manifest;
  try { manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8')); } catch { return { valid: false, reason: 'invalid_manifest' }; }
  const identity = assertIdentity(expectedIdentity);
  if (manifest.compound_key !== identity.compound_key) return { valid: false, reason: 'identity_mismatch' };
  for (const filename of CANONICAL_FILES) {
    const record = (manifest.files || []).find(item => item.name === filename);
    const target = path.join(entryDir, filename);
    if (!record || !fs.existsSync(target)) return { valid: false, reason: `missing_${filename}` };
    const data = fs.readFileSync(target);
    if (record.bytes !== data.length || record.sha256 !== digest(data)) return { valid: false, reason: `checksum_${filename}` };
  }
  // Cache entries intentionally retain only the five canonical files.
  const validation = validateDirectory(entryDir, { skipLinkedArtifacts: true });
  if (!validation.valid) return { valid: false, reason: 'schema_invalid', errors: validation.errors };
  const state = JSON.parse(fs.readFileSync(path.join(entryDir, 'state.json'), 'utf8'));
  if (state.quick_checks || state.workflow) return { valid: false, reason: 'unsupported_receipt_closure' };
  return { valid: true, manifest };
}

function lookup(cacheRoot, expectedIdentity, previousIdentity = null) {
  const identity = assertIdentity(expectedIdentity);
  const directory = entryDirectory(cacheRoot, identity);
  if (!fs.existsSync(directory)) {
    const invalidatedBy = previousIdentity
      ? [
        previousIdentity.intent_key !== identity.intent_key && 'intent',
        previousIdentity.build_key !== identity.build_key && 'build',
        previousIdentity.evaluator_key !== identity.evaluator_key && 'evaluator',
      ].filter(Boolean)
      : ['intent', 'build', 'evaluator'];
    return { decision: 'miss', directory, compound_key: identity.compound_key, invalidated_by: invalidatedBy.length ? invalidatedBy : ['schema'] };
  }
  const validation = validateEntry(directory, identity);
  if (!validation.valid) return { decision: 'invalid', directory, compound_key: identity.compound_key, invalidated_by: ['schema'], reason: validation.reason };
  return { decision: 'hit', directory, compound_key: identity.compound_key, invalidated_by: ['none'], manifest: validation.manifest };
}

function store(cacheRoot, canonicalDir) {
  const source = path.resolve(canonicalDir);
  // This compatibility cache intentionally omits legacy linked-file closures.
  const validation = validateDirectory(source, { skipLinkedArtifacts: true });
  if (!validation.valid) throw new Error(`Cannot cache invalid canonical artifacts: ${JSON.stringify(validation.errors)}`);
  const state = JSON.parse(fs.readFileSync(path.join(source, 'state.json'), 'utf8'));
  if (state.quick_checks || state.workflow) throw new Error('Five-file compatibility caches cannot preserve Quick/split evidence and receipt closures');
  const identity = assertIdentity(state.identity);
  const root = path.resolve(cacheRoot);
  const target = entryDirectory(root, identity);
  fs.mkdirSync(root, { recursive: true });
  if (fs.existsSync(target)) {
    const existing = validateEntry(target, identity);
    if (!existing.valid) throw new Error(`Existing cache entry is invalid: ${existing.reason}`);
    return { status: 'exists', directory: target, compound_key: identity.compound_key };
  }
  const stage = fs.mkdtempSync(path.join(root, '.xray-cache-stage-'));
  try {
    const files = [];
    for (const filename of CANONICAL_FILES) {
      const data = fs.readFileSync(path.join(source, filename));
      fs.writeFileSync(path.join(stage, filename), data);
      files.push({ name: filename, bytes: data.length, sha256: digest(data) });
    }
    fs.writeFileSync(path.join(stage, 'manifest.json'), `${JSON.stringify({
      schema_version: '1.0.0',
      compound_key: identity.compound_key,
      identity: {
        intent_key: identity.intent_key,
        build_key: identity.build_key,
        evaluator_key: identity.evaluator_key,
      },
      files,
    }, null, 2)}\n`);
    const staged = validateEntry(stage, identity);
    if (!staged.valid) throw new Error(`Staged cache entry is invalid: ${staged.reason}`);
    fs.renameSync(stage, target);
  } catch (error) {
    fs.rmSync(stage, { recursive: true, force: true });
    throw error;
  }
  return { status: 'stored', directory: target, compound_key: identity.compound_key };
}

function restore(cacheRoot, expectedIdentity, destination) {
  const hit = lookup(cacheRoot, expectedIdentity);
  if (hit.decision !== 'hit') return hit;
  const target = path.resolve(destination);
  const collisions = CANONICAL_FILES.filter(filename => fs.existsSync(path.join(target, filename)));
  if (collisions.length) throw new Error(`Canonical restore destination is not empty: ${collisions.join(', ')}`);
  fs.mkdirSync(target, { recursive: true });
  const staged = [];
  try {
    for (const filename of CANONICAL_FILES) {
      const temp = path.join(target, `.${filename}.cache-${process.pid}`);
      fs.copyFileSync(path.join(hit.directory, filename), temp);
      staged.push([temp, path.join(target, filename)]);
    }
    for (const [temp, finalPath] of staged) fs.renameSync(temp, finalPath);
  } catch (error) {
    for (const [temp, finalPath] of staged) {
      if (fs.existsSync(temp)) fs.rmSync(temp);
      if (fs.existsSync(finalPath)) fs.rmSync(finalPath);
    }
    throw error;
  }
  // Restores contain only canonical files; linked closures stay with the source run.
  const validation = validateDirectory(target, { skipLinkedArtifacts: true });
  if (!validation.valid) throw new Error(`Restored canonical artifacts failed validation: ${JSON.stringify(validation.errors)}`);
  return { ...hit, restored_artifacts: [...CANONICAL_FILES] };
}

module.exports = { CANONICAL_FILES, assertIdentity, compoundKey, lookup, restore, store, validateEntry };
