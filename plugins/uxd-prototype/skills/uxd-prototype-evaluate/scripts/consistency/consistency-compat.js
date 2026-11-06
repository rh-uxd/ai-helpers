'use strict';

/** Evaluator publication boundary for the optional, offline PR80 companion. */
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const hash = bytes => `sha256:${crypto.createHash('sha256').update(bytes).digest('hex')}`;
const stable = value => Array.isArray(value) ? `[${value.map(stable).join(',')}]` : value && typeof value === 'object' ? `{${Object.keys(value).sort().map(k => `${JSON.stringify(k)}:${stable(value[k])}`).join(',')}}` : JSON.stringify(value);
const read = file => JSON.parse(fs.readFileSync(file, 'utf8'));
const write = (file, value) => fs.writeFileSync(file, `${JSON.stringify(value, null, 2)}\n`, { flag: 'wx' });

function selection(packet, options, workspace) {
  const supplied = packet.consistency || {};
  const fields = { design_system: 'design-system', design_system_version: 'design-system-version', guidelines: 'guidelines', guideline_manifest: 'guideline-manifest' };
  for (const key of Object.keys(supplied)) if (!(key in fields)) throw new Error(`Unknown consistency selection: ${key}`);
  const result = {};
  for (const [key, flag] of Object.entries(fields)) {
    if (supplied[key] !== undefined && options[flag] !== undefined && stable(supplied[key]) !== stable(options[flag])) throw new Error(`Contradictory packet/CLI ${flag}`);
    result[key] = options[flag] ?? supplied[key];
  }
  if (result.guidelines !== undefined && (!Array.isArray(result.guidelines) || result.guidelines.some(s => typeof s !== 'string' || !s))) throw new Error('guidelines must be an array of local [NAMESPACE=]PATH strings');
  result.guidelines ||= [];
  for (const key of ['design_system', 'design_system_version', 'guideline_manifest']) if (result[key] !== undefined && (typeof result[key] !== 'string' || !result[key].trim())) throw new Error(`Invalid ${key}`);
  if (result.guideline_manifest && result.guidelines.length) throw new Error('Frozen manifest cannot be combined with live guidelines');
  const local = value => {
    if (/^[A-Za-z][A-Za-z0-9+.-]*:\/\//.test(value) || value.split(/[\\/]/).includes('..')) throw new Error('Only explicit local guideline inputs are supported');
    const file = path.resolve(workspace, value);
    for (let p = file; ; p = path.dirname(p)) { if (fs.lstatSync(p).isSymbolicLink()) throw new Error('Guideline symlinks are not allowed'); if (p === path.dirname(p)) break; }
    return file;
  };
  result.guidelines = result.guidelines.map(value => {
    const index = value.indexOf('=');
    const namespace = index < 0 ? 'local' : value.slice(0, index);
    if (!/^[A-Za-z0-9][A-Za-z0-9._-]*$/.test(namespace)) throw new Error('Invalid guideline namespace');
    return `${namespace}=${local(index < 0 ? value : value.slice(index + 1))}`;
  });
  if (result.guideline_manifest) result.guideline_manifest = local(result.guideline_manifest);
  return result;
}

function analyze({ workspace, stage, analyzer, baseRef, selected, command }) {
  const root = path.join(workspace, '.artifacts');
  const existed = fs.existsSync(root);
  if (existed && (fs.lstatSync(root).isSymbolicLink() || !fs.statSync(root).isDirectory())) throw new Error('Workspace .artifacts must be a real directory');
  if (!existed) fs.mkdirSync(root);
  const producer = fs.mkdtempSync(path.join(root, 'evaluator-consistency-'));
  try {
    const source = path.join(producer, 'consistency-report.json');
    const args = [analyzer, '--src', workspace, '--changed', '--tracked-only', '--base-ref', baseRef, '--json-file', source];
    for (const [key, flag] of [['design_system', 'design-system'], ['design_system_version', 'design-system-version'], ['guideline_manifest', 'guideline-manifest']]) if (selected[key]) args.push(`--${flag}`, selected[key]);
    for (const value of selected.guidelines) args.push('--guidelines', value);
    command('python3', args, workspace, [0, 1], source);
    const report = read(source);
    if (report?.schema_version !== '1.0.0' || report.source !== 'uxd-consistency-check' || typeof report.guideline_manifest !== 'string' || !report.guideline_manifest) throw new Error('Incompatible uxd-consistency-check report: expected the explicit policy contract with a frozen guideline_manifest. Install a compatible companion, or omit consistency-source.');
    require('./consistency-contract').validateReport(report);
    if (report.workspace !== workspace || path.resolve(workspace, report.artifact || '') !== source || report.inputs?.base !== baseRef || report.inputs.head !== command('git', ['rev-parse', 'HEAD'], workspace)) throw new Error('Source report workspace, revision, comparison base or artifact does not match the executed check');
    const manifestPath = path.resolve(workspace, report.guideline_manifest);
    if (path.dirname(manifestPath) !== producer || fs.lstatSync(manifestPath).isSymbolicLink()) throw new Error('Analyzer manifest escaped its private producer directory');
    const manifest = read(manifestPath);
    const relative = '.artifacts/consistency';
    fs.mkdirSync(path.join(stage, relative), { recursive: true });
    report.evaluator_publication = { format: 'run-relative-v1', source_workspace: report.workspace, source_artifact: report.artifact, source_guideline_manifest: report.guideline_manifest };
    report.workspace = '.';
    report.artifact = `${relative}/consistency-report.json`;
    report.guideline_manifest = `${relative}/guidelines.json`;
    write(path.join(stage, report.guideline_manifest), manifest);
    write(path.join(stage, report.artifact), report);
    write(path.join(stage, 'checks/consistency-report.json'), report);
    return { report, manifest, selected: { ...selected, design_system: report.design_system.id, design_system_version: report.design_system.version, manifest_version: manifest.version } };
  } finally {
    fs.rmSync(producer, { recursive: true, force: true });
    if (!existed && fs.readdirSync(root).length === 0) fs.rmdirSync(root);
  }
}
function status(report, findings = report.source_mode?.violations || []) {
  if (findings.some(f => f.severity === 'error')) return 'failed';
  if (report.degraded || !report.source_mode?.ran || !report.coverage?.evaluated_rules.length || report.coverage.unevaluated_rules.length || report.internal_consistency?.status !== 'evaluated') return 'degraded';
  if (findings.length || report.internal_consistency.findings.length) return 'flagged';
  return 'passed';
}
module.exports = { hash, stable, selection, analyze, status };
