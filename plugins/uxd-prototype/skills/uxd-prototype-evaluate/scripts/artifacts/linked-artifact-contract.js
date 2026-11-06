'use strict';

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const CANONICAL_FILES = ['brief.json', 'evaluation.json', 'evidence.json', 'actions.json', 'state.json'];
const hash = value => `sha256:${crypto.createHash('sha256').update(value).digest('hex')}`;

// Resolve the selected run once, rejecting links/non-regular canonical leaves
// before any document or linked artifact is read.
function canonicalRoot(root) {
  root = path.resolve(root);
  const entry = fs.lstatSync(root);
  if (entry.isSymbolicLink() || !entry.isDirectory()) throw new Error('Canonical run root must be a directory, not a symlink');
  const base = fs.realpathSync(root);
  for (const name of CANONICAL_FILES) {
    const file = path.join(base, name);
    const stat = fs.lstatSync(file);
    if (stat.isSymbolicLink() || !stat.isFile()) throw new Error(`Canonical artifact must be a regular file, not a symlink: ${name}`);
    if (!fs.realpathSync(file).startsWith(`${base}${path.sep}`)) throw new Error(`Canonical artifact escapes run root: ${name}`);
    if (stat.size > 16 * 1024 * 1024) throw new Error(`Canonical artifact exceeds 16 MiB: ${name}`);
  }
  return base;
}

function verifyLinkedArtifacts(root, docs) {
  const errors = [];
  let base;
  try { base = canonicalRoot(root); }
  catch (error) {
    return [{ path: '', code: 'unsafe_run_directory', message: error.message }];
  }

  function add(source, code, message) {
    errors.push({ path: source || '', code, message });
  }

  function bytes(reference, source) {
    const relative = reference && reference.path;
    if (typeof relative !== 'string' || !/^[A-Za-z0-9._+@=/-]+$/.test(relative) || relative.split('/').some(part => !part || part === '.' || part === '..')) {
      add(source, 'invalid_linked_path', 'Linked artifact path must be a portable, run-relative path.');
      return null;
    }
    try {
      const file = fs.realpathSync(path.join(base, relative));
      const stat = fs.statSync(file);
      if (!file.startsWith(`${base}${path.sep}`) || !stat.isFile()) throw new Error('path escapes the run or is not a regular file');
      if (stat.size > 32 * 1024 * 1024) throw new Error('linked artifact exceeds 32 MiB');
      const content = fs.readFileSync(file);
      if (hash(content) !== reference.sha256) throw new Error('Artifact file/hash mismatch (SHA-256 differs from the recorded digest)');
      return content;
    } catch (error) {
      add(source, 'linked_artifact_invalid', `${relative}: ${error.message}`);
      return null;
    }
  }

  function verify(reference, source) {
    if (!bytes(reference, source)) return false;
    return true;
  }

  function json(reference, source) {
    const content = bytes(reference, source);
    if (!content) return null;
    if (content.length > 16 * 1024 * 1024) {
      add(source, 'linked_json_too_large', `${reference.path}: linked JSON exceeds 16 MiB.`);
      return null;
    }
    let parsed;
    try { parsed = JSON.parse(content.toString('utf8')); }
    catch (error) {
      add(source, 'invalid_linked_json', `${reference.path}: ${error.message}`);
      return null;
    }
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      add(source, 'invalid_linked_json_shape', `${reference.path}: linked JSON must be an object.`);
      return null;
    }
    return parsed;
  }

  function verifyBundle(bundle, source) {
    if (!bundle || typeof bundle !== 'object' || Array.isArray(bundle)) {
      add(source, 'invalid_linked_bundle', 'Linked bundle must contain a JSON object.');
      return;
    }
    if (!bundle.inspection?.receipt) add(`${source}/inspection/receipt`, 'missing_linked_reference', 'Bundle inspection receipt is required.');
    else verify(bundle.inspection.receipt, `${source}/inspection/receipt`);
    if (!Array.isArray(bundle.phases)) add(`${source}/phases`, 'invalid_linked_bundle', 'Bundle phases must be an array.');
    for (const [index, phase] of (Array.isArray(bundle.phases) ? bundle.phases : []).entries()) {
      verify(phase?.submitted_context, `${source}/phases/${index}/submitted_context`);
      verify(phase?.returned_result, `${source}/phases/${index}/returned_result`);
    }
    if (!Array.isArray(bundle.evidence?.captures) || !Array.isArray(bundle.evidence?.items)) add(`${source}/evidence`, 'invalid_linked_bundle', 'Bundle evidence must contain capture and item arrays.');
    for (const [index, capture] of (Array.isArray(bundle.evidence?.captures) ? bundle.evidence.captures : []).entries()) {
      if (capture.raw_image) verify(capture.raw_image, `${source}/evidence/captures/${index}/raw_image`);
    }
    for (const [index, item] of (Array.isArray(bundle.evidence?.items) ? bundle.evidence.items : []).entries()) {
      if (item.image) verify(item.image, `${source}/evidence/items/${index}/image`);
    }
  }

  const state = docs['state.json'];
  const workflow = state?.workflow;
  if (workflow) {
    const receiptRef = { path: workflow.receipt_path, sha256: workflow.receipt_sha256 };
    const receipt = json(receiptRef, 'state.json/workflow/receipt');
    if (receipt) {
      verify({ path: 'inputs/packet.json', sha256: receipt.packet_sha256 }, 'state.json/workflow/packet');
      if (receipt.walkthrough_bundle) {
        const bundle = json(receipt.walkthrough_bundle, 'state.json/workflow/walkthrough_bundle');
        if (bundle) verifyBundle(bundle, 'state.json/workflow/walkthrough_bundle');
      }
      if (receipt.fix_receipt) verify(receipt.fix_receipt, 'state.json/workflow/receipt/fix_receipt');
    }
  }

  const quick = state?.quick_checks;
  if (quick) {
    const context = json({ path: quick.context_path, sha256: quick.context_sha256 }, 'state.json/quick_checks/context');
    if (context) {
      if (!context.packet) add('state.json/quick_checks/context/packet', 'missing_linked_reference', 'Quick context packet reference is required.');
      verify(context.packet, 'state.json/quick_checks/context/packet');
      if (!Array.isArray(context.checks)) add('state.json/quick_checks/context/checks', 'invalid_linked_context', 'Quick context checks must be an array.');
      for (const [index, check] of (Array.isArray(context.checks) ? context.checks : []).entries()) {
        verify({ path: check?.output, sha256: check?.output_sha256 }, `state.json/quick_checks/context/checks/${index}/output`);
      }
      const judgments = context.judgments;
      if (judgments) {
        const bundleRef = { path: judgments.bundle_path, sha256: judgments.bundle_sha256 };
        const bundle = json(bundleRef, 'state.json/quick_checks/context/judgments/bundle');
        if (bundle) verifyBundle(bundle, 'state.json/quick_checks/context/judgments/bundle');
        if (!Array.isArray(judgments.files)) add('state.json/quick_checks/context/judgments/files', 'invalid_linked_context', 'Quick judgment file references must be an array.');
        for (const [index, file] of (Array.isArray(judgments.files) ? judgments.files : []).entries()) {
          verify(file, `state.json/quick_checks/context/judgments/files/${index}`);
        }
        for (const [index, phase] of (Array.isArray(judgments.phases) ? judgments.phases : []).entries()) {
          verify(phase?.submitted_context, `state.json/quick_checks/context/judgments/phases/${index}/submitted_context`);
          verify(phase?.returned_result, `state.json/quick_checks/context/judgments/phases/${index}/returned_result`);
        }
      }
    }
  }

  const source = docs['brief.json']?.intent?.source_input;
  if (source) verify({ path: source.snapshot_path, sha256: source.sha256 }, 'brief.json/intent/source_input/snapshot');
  for (const [index, capture] of (docs['evidence.json']?.captures || []).entries()) {
    if (capture.raw_image) verify(capture.raw_image, `evidence.json/captures/${index}/raw_image`);
  }
  for (const [index, item] of (docs['evidence.json']?.items || []).entries()) {
    if (item.image) verify(item.image, `evidence.json/items/${index}/image`);
  }
  return errors;
}

module.exports = { canonicalRoot, verifyLinkedArtifacts };
