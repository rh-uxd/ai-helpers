'use strict';

/** Consumer-side invariants. No execution of guidance or access to live sources. */
const fs = require('fs');
const path = require('path');
const { hash, stable, status } = require('./consistency-compat');
const equal = (a, b) => stable(a) === stable(b);
const requireThat = (value, message) => { if (!value) throw new Error(message); };
const idPattern = /^[A-Za-z0-9][A-Za-z0-9._-]*(?::[A-Za-z0-9][A-Za-z0-9._-]*)?$/;
function ids(value, label) {
  requireThat(Array.isArray(value) && value.every(v => typeof v === 'string' && idPattern.test(v)) && new Set(value).size === value.length, `${label} must contain unique guideline IDs`);
  return value;
}
const sameSet = (a, b) => equal([...a].sort(), [...b].sort());
function coverageStatus(selected, evaluated) { return evaluated.length ? evaluated.length === selected.length ? 'evaluated' : 'partially_evaluated' : 'not_evaluated'; }
function metadata(text) {
  text = text.replace(/^\uFEFF/, '').replace(/\r\n/g, '\n');
  const result = {};
  if (text.startsWith('---\n')) {
    const end = text.indexOf('\n---\n', 4);
    requireThat(end >= 0, 'Unterminated frozen guideline metadata');
    for (const line of text.slice(4, end).split('\n')) {
      if (!line.trim() || line.trimStart().startsWith('#')) continue;
      const m = /^([a-z_]+):\s*(.*)$/.exec(line);
      requireThat(m && !Object.hasOwn(result, m[1]), 'Invalid/duplicate frozen scalar metadata');
      result[m[1]] = m[2].trim().replace(/^["']+|["']+$/g, '');
    }
  }
  return result;
}
function sourceUrl(value) {
  if (!value) return null;
  let url;
  try { url = new URL(value); } catch { throw new Error('Invalid guideline source URL'); }
  requireThat(['http:', 'https:'].includes(url.protocol) && !url.username && !url.password, 'Invalid guideline source URL');
  // Python's producer preserves spelling rather than normalizing host/trailing slash.
  return value.split(/[?#]/)[0];
}
function provenancePath(value) {
  requireThat(typeof value === 'string' && path.isAbsolute(value) && !value.split('/').includes('..'), 'Invalid frozen absolute provenance path');
  return value;
}
function validateManifest(manifest) {
  requireThat(manifest && ['1.0.0', '1.1.0'].includes(manifest.schema_version), 'Unsupported frozen manifest');
  requireThat(typeof manifest.design_system === 'string' && manifest.design_system.trim() && typeof manifest.workspace === 'string' && manifest.workspace.trim(), 'Missing frozen manifest provenance');
  requireThat(Array.isArray(manifest.documents) && Array.isArray(manifest.sources), 'Missing frozen documents/sources');
  const namespaced = manifest.schema_version === '1.1.0';
  const documents = manifest.documents;
  ids(documents.map(d => d.id), 'Frozen documents');
  for (const doc of documents) {
    requireThat(typeof doc.text === 'string' && hash(doc.text).slice(7) === doc.sha256, 'Frozen guideline content hash mismatch');
    requireThat(Array.isArray(doc.sources) && doc.sources.length && doc.sources.every(s => provenancePath(s)), 'Invalid frozen document sources');
    const info = metadata(doc.text);
    const original = info.id || path.basename(doc.sources[0], path.extname(doc.sources[0]));
    if (namespaced) requireThat(typeof doc.namespace === 'string' && /^[A-Za-z0-9][A-Za-z0-9._-]*$/.test(doc.namespace), 'Invalid frozen namespace');
    const expected = { id: namespaced ? `${doc.namespace}:${original}` : original, title: info.title || original, category: info.category || 'provided', severity: info.severity || 'warning', check: info.check ?? null, parameters: { required_class: info.required_class ?? null }, source_url: sourceUrl(info.source_url), design_system: info.design_system || manifest.design_system, version: info.version || 'unspecified', retrieved_at: info.retrieved_at ?? null, ...(namespaced ? { original_id: original } : {}) };
    for (const [key, value] of Object.entries(expected)) requireThat(equal(doc[key], value), `Frozen metadata differs from text: ${key}`);
    requireThat(['baseline', 'workspace', 'explicit'].includes(doc.kind) && ['warning', 'error'].includes(doc.severity), 'Invalid frozen document kind/severity');
  }
  const attributed = new Map(documents.map(d => [d.id, new Set()]));
  for (const source of manifest.sources) {
    requireThat(['baseline', 'workspace', 'explicit'].includes(source.kind), 'Invalid source kind');
    const location = provenancePath(source.location);
    ids(source.document_ids, 'Source membership');
    if (namespaced) requireThat(typeof source.namespace === 'string' && /^[A-Za-z0-9][A-Za-z0-9._-]*$/.test(source.namespace), 'Invalid source namespace');
    if (source.kind === 'workspace') requireThat(location === path.join(manifest.workspace, '.design/product-design/guidelines'), 'Workspace provenance contradiction');
    const members = [];
    for (const doc of documents) for (const file of doc.sources) {
      if ((!namespaced || doc.namespace === source.namespace) && (file === location || file.endsWith('.md') && file.startsWith(`${location}/`))) { members.push(doc.id); attributed.get(doc.id).add(file); }
    }
    requireThat(sameSet(source.document_ids, new Set(members)), 'Frozen source membership contradicts provenance');
  }
  for (const doc of documents) {
    requireThat(sameSet(attributed.get(doc.id), new Set(doc.sources)), 'Incomplete frozen source attribution');
    requireThat(manifest.sources.find(s => s.document_ids.includes(doc.id))?.kind === doc.kind, 'Frozen source/document kind contradiction');
  }
  const withoutVersion = Object.fromEntries(Object.entries(manifest).filter(([k]) => k !== 'version'));
  // Legacy manifest v1 hashes Python json.dumps' space-separated pair list.
  const legacy = JSON.stringify(documents.map(d => [d.id, d.sha256]).sort(([a], [b]) => a < b ? -1 : a > b ? 1 : 0)).replace(/,/g, ', ').replace(/[^\x00-\x7f]/g, c => `\\u${c.charCodeAt(0).toString(16).padStart(4, '0')}`);
  requireThat(manifest.version === hash(namespaced ? stable(withoutVersion) : legacy), 'Frozen manifest content/provenance hash mismatch');
  return manifest;
}
function validateReport(report) {
  requireThat(report.schema_version === '1.0.0' && report.source === 'uxd-consistency-check', 'Unsupported source report contract');
  const evaluated = ids(report.coverage?.evaluated_rules, 'Evaluated coverage');
  const unevaluated = ids(report.coverage?.unevaluated_rules, 'Unevaluated coverage');
  requireThat(!evaluated.some(id => unevaluated.includes(id)), 'Coverage sets overlap');
  const docs = report.guideline_context?.documents;
  requireThat(Array.isArray(docs) && Array.isArray(report.guideline_context.sources), 'Missing source context');
  ids(docs.map(d => d.id), 'Selected documents');
  requireThat(sameSet([...evaluated, ...unevaluated], docs.map(d => d.id)), 'Coverage does not partition selected guidelines');
  const summary = report.summary;
  requireThat(summary && ['total_guidelines_checked', 'violations', 'warnings', 'passes'].every(k => Number.isInteger(summary[k]) && summary[k] >= 0), 'Invalid summary counts');
  requireThat(evaluated.length === summary.total_guidelines_checked && summary.total_guidelines_checked === summary.violations + summary.warnings + summary.passes, 'Evaluated coverage/summary mismatch');
  requireThat(Array.isArray(report.source_mode?.violations) && typeof report.source_mode.ran === 'boolean', 'Invalid source mode');
  const findings = report.source_mode.violations;
  for (const f of findings) {
    requireThat(evaluated.includes(f.guideline_id), 'Finding outside evaluated membership');
    requireThat(['error', 'warning'].includes(f.severity) && ['VIOLATION', 'FLAGGED'].includes(f.verdict) && ['high', 'medium', 'low'].includes(f.confidence) && typeof f.review_candidate === 'boolean', 'Invalid guideline finding semantics');
    if (f.review_candidate) requireThat(f.severity === 'warning' && f.verdict === 'FLAGGED' && f.confidence === 'low' && f.check_method === 'automated_candidate', 'Candidate cannot be a normative error');
  }
  const errors = new Set(findings.filter(f => f.severity === 'error').map(f => f.guideline_id));
  const warnings = new Set(findings.filter(f => !errors.has(f.guideline_id)).map(f => f.guideline_id));
  requireThat(errors.size === summary.violations && warnings.size === summary.warnings, 'Grouped summary mismatch');
  const axis = report.guideline_consistency;
  requireThat(axis?.status === coverageStatus(docs, evaluated), 'Guideline axis coverage status mismatch');
  for (const [group, kinds] of [['baseline', ['baseline']], ['workspace', ['workspace', 'explicit']]]) {
    const members = new Set(report.guideline_context.sources.filter(s => kinds.includes(s.kind)).flatMap(s => s.document_ids));
    const selected = docs.filter(d => members.has(d.id)).map(d => d.id);
    const checked = selected.filter(id => evaluated.includes(id));
    requireThat(axis[group] && sameSet(ids(axis[group].selected_rules, 'Axis selection'), selected) && sameSet(ids(axis[group].evaluated_rules, 'Axis evaluated coverage'), checked) && axis[group].status === coverageStatus(selected, checked), 'Guideline subgroup membership/status mismatch');
  }
  const internal = report.internal_consistency;
  requireThat(internal && Array.isArray(internal.findings) && Array.isArray(internal.comparisons) && Array.isArray(internal.uncompared_targets) && typeof internal.reason === 'string', 'Missing internal comparison evidence');
  const internalStatus = internal.comparisons.length ? internal.uncompared_targets.length ? 'partially_evaluated' : 'evaluated' : 'insufficient_comparators';
  requireThat(internal.status === internalStatus, 'Internal comparison coverage/status mismatch');
  for (const f of internal.findings) {
    requireThat(f.review_candidate === true && f.confidence === 'low' && f.severity === 'warning' && f.verdict === 'FLAGGED' && f.check_method === 'internal_comparison' && f.different === true && Array.isArray(f.peers) && f.peers.length > 0, 'Internal differences must remain review candidates');
    requireThat(internal.comparisons.some(c => Object.entries(c).every(([k, v]) => equal(f[k], v))), 'Internal finding lacks its comparison evidence');
  }
  return report;
}
function confined(root, relative) {
  requireThat(typeof relative === 'string' && /^\.artifacts\/[A-Za-z0-9._/-]+\.json$/.test(relative) && !relative.split('/').includes('..'), 'Invalid published artifact reference');
  const file = path.resolve(root, relative);
  for (let p = file; ; p = path.dirname(p)) { requireThat(!fs.lstatSync(p).isSymbolicLink(), 'Published reference contains a symlink'); if (p === path.dirname(p)) break; }
  requireThat(fs.statSync(file).isFile(), 'Published reference is not a file');
  return file;
}
function validatePublication(report, root) {
  validateReport(report);
  const published = report.evaluator_publication;
  const base = published ? root : report.workspace;
  if (published) requireThat(published.format === 'run-relative-v1' && report.workspace === '.' && path.isAbsolute(published.source_workspace), 'Invalid evaluator publication mapping');
  const artifact = confined(base, report.artifact);
  requireThat(equal(JSON.parse(fs.readFileSync(artifact, 'utf8')), report), 'Published report readback mismatch');
  const manifest = validateManifest(JSON.parse(fs.readFileSync(confined(base, report.guideline_manifest), 'utf8')));
  requireThat(manifest.version === report.guidelines_version && manifest.design_system === report.design_system?.id, 'Manifest/report identity mismatch');
  requireThat(equal(manifest.sources, report.guideline_context.sources) && equal(manifest.documents.map(({ text, ...d }) => d), report.guideline_context.documents), 'Frozen provenance does not match report context');
  requireThat(manifest.workspace === (published ? published.source_workspace : report.workspace), 'Frozen workspace provenance mismatch');
  return manifest;
}
function validateCanonical(consistency, root = null) {
  const report = consistency.source_analysis;
  if (!report) return;
  validateReport(report);
  const requiredStatus = status(report, consistency.findings);
  requireThat(consistency.status === requiredStatus && (consistency.status !== 'passed' || !report.internal_consistency.findings.length), 'Canonical consistency status overstates source/internal coverage');
  requireThat(consistency.guidelines_version === report.guidelines_version && consistency.guidelines_checked >= report.summary.total_guidelines_checked && consistency.source_checked === report.source_mode.ran, 'Canonical source analysis summary mismatch');
  const source = consistency.findings.filter(f => f.origin === 'source');
  requireThat(source.length === report.source_mode.violations.length && source.every((f, i) => {
    const raw = report.source_mode.violations[i];
    return f.guideline_id === raw.guideline_id && f.review_candidate === raw.review_candidate && f.severity === raw.severity && f.pf_doc_url === (raw.pf_doc_url || null);
  }), 'Canonical guideline findings differ from producer evidence');
  if (root) validatePublication(report, root);
}
module.exports = { validateManifest, validateReport, validatePublication, validateCanonical };
