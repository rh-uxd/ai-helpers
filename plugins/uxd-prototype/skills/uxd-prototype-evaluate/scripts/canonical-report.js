'use strict';

/** Derived, static HTML from the shared structured synthesis. No legacy
 * projections, network resources or model work; chat and HTML render the
 * same synthesis object so they cannot disagree. */
const fs = require('fs');
const path = require('path');
const C = require('./split-contract');
const S = require('./evaluation-synthesis');
const escape = value => String(value ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
function table(headers, rows) {
  if (!rows.length) return '';
  return `<table><thead><tr>${headers.map(h => `<th>${escape(h)}</th>`).join('')}</tr></thead><tbody>${rows.map(row => `<tr>${row.map(cell => `<td>${escape(cell)}</td>`).join('')}</tr>`).join('')}</tbody></table>`;
}
function list(items) {
  if (!items.length) return '';
  return `<ul>${items.map(item => `<li>${escape(item)}</li>`).join('')}</ul>`;
}
function render(directory) {
  const docs = C.loadRun(directory);
  const synthesis = S.build(docs);
  const brief = docs['brief.json'];
  const evaluation = docs['evaluation.json'];
  const state = docs['state.json'];
  const goal = synthesis.goal;
  const coverageLines = [];
  if (goal.planned) {
    coverageLines.push(`Goal: ${goal.goal}`);
    for (const question of goal.questions) coverageLines.push(`${question.id}: ${question.text}`);
    coverageLines.push(`Reviewed envelope: ${goal.allowed_checks.join(', ')} · ${goal.limits.max_model_invocations === null ? 'no invocation cap' : `max ${goal.limits.max_model_invocations} invocations`} · ${goal.limits.max_cost_usd === null ? 'no cost cap' : `max $${goal.limits.max_cost_usd}`}`);
  } else coverageLines.push(goal.note);
  const sections = [
    ['Goal and strategy', list(coverageLines)],
    ['Coverage: planned versus executed', synthesis.coverage.planned_steps
      ? table(['Step', 'Check', 'Status', 'Reason'], synthesis.coverage.planned_steps.map(step => [step.step_id, step.check, step.status, step.reason]))
      : `<p>Selected checks: ${escape(synthesis.coverage.selected_checks.join(', ') || 'none recorded')}${synthesis.coverage.selected_pairs.length ? ` · selected pairs: ${escape(synthesis.coverage.selected_pairs.map(p => `${p.task_id}/${p.persona_id}`).join(', '))}` : ''}</p>`],
    ['Prioritized findings', synthesis.findings.length
      ? table(['#', 'Source', 'Severity', 'ID', 'Finding', 'Location', 'Detail', 'Recommendation', 'Review', 'Evidence'], synthesis.findings.map((finding, index) => [index + 1, finding.source, finding.severity || 'unrated', finding.id, finding.title, finding.location, finding.description, finding.recommendation || '—', finding.review, finding.evidence_ids.join(', ')]))
      : '<p>No consistency or heuristic findings were recorded.</p>'],
    ['Uncertainty', list(synthesis.uncertainty.length ? synthesis.uncertainty : ['No unverified criteria, unreviewed findings or blocked work remain in this run.'])],
    ['Usage', table(['Scope', 'Model invocations', 'Cost USD', 'Budget'], [
      ['Own', synthesis.usage.own.model_invocations, synthesis.usage.own.llm_cost_usd === null ? 'Unknown' : synthesis.usage.own.llm_cost_usd, synthesis.usage.budget_status || 'no reviewed limits'],
      ...(synthesis.usage.prior ? [['Inherited (counted once)', synthesis.usage.prior.model_invocations, synthesis.usage.prior.llm_cost_usd === null ? 'Unknown' : synthesis.usage.prior.llm_cost_usd, '—']] : []),
      ['Lineage total', synthesis.usage.lineage.model_invocations, synthesis.usage.lineage.llm_cost_usd === null ? 'Unknown' : synthesis.usage.lineage.llm_cost_usd, '—'],
    ])],
    ['Recommended next actions', synthesis.next_actions.length
      ? table(['ID', 'Kind', 'Priority', 'Origin', 'Recommendation', 'Handoff'], synthesis.next_actions.map(action => [action.id, action.kind, action.priority, action.origin || '—', action.recommendation, action.handoff || '—']))
      : '<p>No proposed actions; review findings directly.</p>'],
    ['Usability', table(['Status', 'Overall score'], [[evaluation.usability.status, evaluation.usability.status === 'completed' ? `${evaluation.usability.score} / ${evaluation.usability.max_score}` : 'Not evaluated']])],
    ['Usability dimensions', table(['ID', 'Dimension', 'Score', 'Confidence', 'Persona scores', 'Evidence'], evaluation.usability.dimensions.map(d => [d.id, d.label, `${d.score} / ${d.max_score}`, d.confidence, d.persona_scores.map(p => `${p.persona_id}: ${p.score}`).join('\n'), d.evidence_ids.join(', ')]))],
    ['Acceptance criteria', table(['ID', 'Source', 'Criterion', 'Verdict', 'Evaluated by', 'Evidence'], brief.intent.acceptance_criteria.map(ac => { const result = evaluation.ac_results.find(r => r.ac_id === ac.id); return [ac.id, ac.source_id, ac.text, result.verdict, result.evaluated_by, result.evidence_ids.join(', ')]; }))],
    ['Consistency', table(['ID', 'Origin', 'Severity', 'Finding', 'Location', 'Recommendation', 'Review', 'Evidence'], evaluation.consistency.findings.map(f => [f.id, f.origin, f.severity, f.description, f.file ? (f.line ? `${f.file}:${f.line}` : f.file) : f.evidence_ids.join(', '), f.recommendation, f.review_candidate ? 'Unreviewed candidate' : f.verdict, f.evidence_ids.join(', ')]))],
    ['Guideline consistency', evaluation.consistency.source_analysis ? table(['Design system', 'Status', 'Frozen manifest', 'Evaluated rules', 'Unevaluated rules'], [[evaluation.consistency.source_analysis.design_system.id, evaluation.consistency.source_analysis.guideline_consistency.status, evaluation.consistency.source_analysis.guideline_manifest, evaluation.consistency.source_analysis.coverage.evaluated_rules.join('\n'), evaluation.consistency.source_analysis.coverage.unevaluated_rules.join('\n')]]) : ''],
    ['Internal consistency', evaluation.consistency.source_analysis ? table(['Status', 'Coverage note', 'Review candidates (not normative violations)'], [[evaluation.consistency.source_analysis.internal_consistency.status, evaluation.consistency.source_analysis.internal_consistency.reason, evaluation.consistency.source_analysis.internal_consistency.findings.map(f => `${f.file}:${f.line_start} — ${f.description}`).join('\n')]]) : ''],
    ['Heuristics', table(['ID', 'Finding', 'Severity', 'Screen / state', 'Observation', 'Review', 'Evidence'], (evaluation.heuristics?.findings || []).map(f => [f.id, f.title, f.suggested_severity || 'unrated', `${f.screen_id} / ${f.state_id}`, f.observation, f.review_status, f.evidence_ids.join(', ')]))],
    ['Heuristic coverage', table(['Lens', 'Heuristic', 'Status', 'Scope note'], (evaluation.heuristics?.coverage || []).map(c => [c.lens, c.heuristic_id, c.status, c.note]))],
    ['Walkthroughs', table(['Journey', 'Task', 'Persona', 'Outcome', 'Execution', 'Stop reason', 'Steps'], evaluation.journeys.map(j => [j.id, j.task_id, j.persona_id, j.verdict, j.execution?.status || '—', j.execution?.stop_reason || '—', j.steps.map(s => `${s.sequence}. ${s.action}: ${s.target} — ${s.outcome} (${s.evidence_ids.join(', ')})`).join('\n')]))],
    ['Actions', table(['ID', 'Kind', 'Status', 'Origin', 'Recommendation'], docs['actions.json'].actions.map(a => [a.id, a.kind, a.status, a.source.origin_run_id ? `${a.source.origin_run_id} / ${a.source.origin_action_id}` : a.source.ac_id || a.source.finding_id || a.source.evidence_ids.join(', '), a.recommendation]))],
    ['Browser evidence', table(['ID', 'Capture', 'Screen / state', 'Revision', 'Kind', 'Subject'], docs['evidence.json'].items.map(e => { const capture = docs['evidence.json'].captures.find(c => c.id === e.capture_id); return [e.id, e.capture_id, `${capture.screen_id || ''} / ${capture.state_id || ''}`, capture.source_ref || brief.intent.scope.source_ref, e.kind, e.subject.name]; }))],
    ['Source evidence', table(['ID', 'Path', 'Line', 'Availability', 'Revision', 'SHA-256'], (docs['evidence.json'].source_items || []).map(e => [e.id, e.path, e.line, e.availability, e.revision, e.sha256]))],
    ['Phases', table(['Phase', 'Status', 'Model', 'Cost USD'], state.phases.map(p => [p.name, p.status, p.model || 'Local', p.llm_cost_usd === null ? 'Unknown' : p.llm_cost_usd]))],
  ];
  const images = new Map();
  for (const capture of docs['evidence.json'].captures) if (capture.raw_image) images.set(capture.raw_image.path, capture.raw_image);
  for (const item of docs['evidence.json'].items) if (item.image) images.set(item.image.path, item.image);
  let imageBytes = 0;
  const screenshots = [...images].map(([name, reference]) => {
    const bytes = fs.readFileSync(path.join(directory, name));
    imageBytes += bytes.length;
    if (imageBytes > 64 * 1024 * 1024) throw new Error('Report image budget exceeds 64 MiB; narrow the report scope');
    // Treat artifact text and images as untrusted: escape cells and embed only
    // hash-matching raster formats, never active SVG/HTML or remote resources.
    const mime = bytes.subarray(0, 8).equals(Buffer.from('89504e470d0a1a0a', 'hex')) ? 'image/png' : bytes[0] === 255 && bytes[1] === 216 ? 'image/jpeg' : bytes.toString('ascii', 0, 4) === 'RIFF' && bytes.toString('ascii', 8, 12) === 'WEBP' ? 'image/webp' : null;
    if (!mime || C.hash(bytes) !== reference.sha256) throw new Error('Report requires verified PNG, JPEG or WebP images');
    return `<figure><figcaption>${escape(name)}</figcaption><img style="max-width:100%;height:auto" alt="${escape(name)}" src="data:${mime};base64,${bytes.toString('base64')}"></figure>`;
  }).join('');
  const digest = C.digest(directory);
  const identity = synthesis.identity;
  const sourceText = identity.source ? `${identity.source.kind} ${identity.source.id} @ ${identity.source.revision}` : 'no frozen source input';
  const html = `<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width"><meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src data:; style-src 'unsafe-inline'; base-uri 'none'; form-action 'none'"><title>${escape(brief.intent.title)} — evaluation</title><style>body{font:16px system-ui;margin:32px;max-width:1400px}table{border-collapse:collapse;width:100%;margin-bottom:32px}td,th{border:1px solid #aaa;padding:8px;text-align:left;vertical-align:top;white-space:pre-wrap;overflow-wrap:anywhere}h1{font-size:24px}h2{font-size:20px}code{overflow-wrap:anywhere}ul{margin:0 0 24px;padding-left:24px}</style><h1>${escape(brief.intent.title)}</h1><p>Run: ${escape(brief.run_id)} · Revision: ${escape(brief.intent.scope.source_ref)} · Status: ${escape(state.workflow?.status || evaluation.status)}</p><p>Source: ${escape(sourceText)} · Route: ${escape(synthesis.run.route)} · Build mode: ${escape(identity.source_mode)}</p><p>This is a derived view of canonical artifacts, rendered from the same structured synthesis as the chat summary. NOT_RUN means unverified. Persona outcomes do not establish AC compliance. Model findings retain their review status.</p><p>Canonical snapshot: <code>${escape(digest)}</code></p>${sections.filter(([, body]) => body).map(([title, body]) => `<h2>${escape(title)}</h2>${body}`).join('')}${screenshots ? `<h2>Captured images</h2>${screenshots}` : ''}</html>`;
  // Reports are derived and may be regenerated. Canonical files remain immutable.
  const target = path.join(directory, 'evaluation-report.html');
  const integrityTarget = path.join(directory, 'report-integrity.json');
  for (const file of [target, integrityTarget]) {
    const entry = fs.lstatSync(file, { throwIfNoEntry: false });
    if (entry && !entry.isFile()) throw new Error('Report destinations must be regular files');
  }
  for (const [file, bytes] of [[target, html], [integrityTarget, `${JSON.stringify({ run_id: brief.run_id, artifact_sha256: digest, html_sha256: C.hash(html), synthesis_sha256: C.hash(S.chatMarkdown(synthesis)), generated_at: new Date().toISOString() }, null, 2)}\n`]]) {
    const temporary = path.join(directory, `.report-${require('crypto').randomUUID()}`);
    try { fs.writeFileSync(temporary, bytes, { flag: 'wx' }); fs.renameSync(temporary, file); }
    finally { fs.rmSync(temporary, { force: true }); }
  }
  return { status: 'completed', mode: 'canonical', model_invoked: false, outputs: { evaluation_report: target }, artifact_sha256: digest };
}
module.exports = { render };
