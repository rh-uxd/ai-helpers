'use strict';

/**
 * Deterministic structured synthesis shared by chat and HTML reporting.
 *
 * build(docs) derives a decision-focused view from validated canonical
 * documents: goal and strategy, planned versus executed coverage,
 * prioritized findings with severity, location and recommendation,
 * separated AC/consistency/heuristic/task outcomes, uncertainty (unknowns
 * and NOT_RUN), usage without inherited-work double counting, and
 * recommended next actions.
 *
 * The synthesis launches no model work and never upgrades a verdict:
 * classification stays triage, persona completion stays separate from AC
 * verification, review candidates stay unreviewed, and unknown
 * measurements stay unknown. chatMarkdown() and the HTML report render
 * this same object, so chat and HTML cannot disagree.
 */

const PRIORITY_RANK = { blocking: 0, high: 1, normal: 2, low: 3 };
const REVIEW_RANK = { confirmed: 0, unreviewed: 1, dismissed: 2 };

const LIMITATIONS = [
  'Classification is triage, not verification; NOT_RUN means unverified.',
  'Persona or task completion does not establish acceptance-criteria compliance.',
  'Review candidates and unreviewed findings are not normative violations or automatic fixes.',
  'Recorded usage covers producer model phases only; host-session and invoice costs are excluded.',
];

function location(finding) {
  if (finding.origin === 'source') return finding.line ? `${finding.file}:${finding.line}` : `${finding.file}`;
  return finding.evidence_ids.length ? finding.evidence_ids.join(', ') : 'no linked evidence';
}

function usageFromPhases(phases) {
  const model = phases.filter(p => p.model_invoked);
  const costs = model.map(p => p.llm_cost_usd);
  return {
    model_invocations: model.length,
    llm_cost_usd: costs.some(c => c === null || c === undefined) ? null : costs.reduce((a, b) => a + b, 0),
    known_cost_usd: costs.filter(c => c !== null && c !== undefined).reduce((a, b) => a + b, 0),
  };
}
const unknownUsage = () => ({ model_invocations: null, llm_cost_usd: null, known_cost_usd: null });

function coverage(docs) {
  const state = docs['pe-state.json'];
  const plan = docs['pe-context.json'].intent.evaluation_plan || null;
  const planning = state.planning || null;
  const workflow = state.workflow || null;
  const steps = planning
    ? planning.execution.map(row => {
      const step = plan.steps.find(s => s.id === row.step_id) || {};
      return {
        step_id: row.step_id,
        check: step.check || null,
        status: row.status,
        reason: row.reason,
        question_ids: step.question_ids || [],
        rationale: step.rationale || null,
      };
    })
    : null;
  return {
    route: workflow?.route || 'quick-checks',
    status: workflow?.status || state.lifecycle?.status || 'unknown',
    selected_checks: state.quick_checks?.selected || [],
    selected_pairs: workflow?.selected_pairs || [],
    planned_steps: steps,
    plan_change: planning ? planning.change : null,
    phase_counts: state.phases.reduce((counts, p) => { counts[p.status] = (counts[p.status] || 0) + 1; return counts; }, {}),
  };
}

function outcomes(docs) {
  // Keep AC checks, inspection findings and persona task results separate.
  // A green result in one does not make the others pass.
  const evaluation = docs['pe-evaluation-snapshot.json'];
  const brief = docs['pe-context.json'];
  const actions = docs['pe-actions.json'];
  const acById = new Map(brief.intent.acceptance_criteria.map(ac => [ac.id, ac]));
  return {
    status: evaluation.status,
    ac: {
      counts: evaluation.summary.ac_counts,
      results: evaluation.ac_results.map(r => ({
        ac_id: r.ac_id,
        verdict: r.verdict,
        source_id: acById.get(r.ac_id)?.source_id || null,
        evaluated_by: r.evaluated_by || null,
        evidence_ids: r.evidence_ids,
        action_ids: r.action_ids,
      })),
    },
    consistency: {
      status: evaluation.consistency.status,
      counts: evaluation.summary.consistency_counts,
      guidelines_version: evaluation.consistency.guidelines_version,
      findings: evaluation.consistency.findings.map(f => ({
        id: f.id,
        origin: f.origin,
        guideline_id: f.guideline_id,
        guideline_title: f.guideline_title,
        severity: f.severity,
        verdict: f.verdict,
        confidence: f.confidence,
        location: location(f),
        description: f.description,
        recommendation: f.recommendation,
        review_candidate: f.review_candidate,
        evidence_ids: f.evidence_ids,
        action_ids: actions.actions.filter(a => a.source.finding_id === f.id).map(a => a.id),
      })),
      source_analysis: evaluation.consistency.source_analysis
        ? {
          design_system: evaluation.consistency.source_analysis.design_system.id,
          guideline_consistency: evaluation.consistency.source_analysis.guideline_consistency.status,
          unevaluated_rules: evaluation.consistency.source_analysis.coverage.unevaluated_rules.length,
          internal_consistency: evaluation.consistency.source_analysis.internal_consistency.status,
        }
        : null,
    },
    heuristics: evaluation.heuristics
      ? {
        profile: evaluation.heuristics.profile,
        findings: evaluation.heuristics.findings.map(f => ({
          id: f.id,
          title: f.title,
          suggested_severity: f.suggested_severity,
          review_status: f.review_status,
          location: `${f.screen_id}/${f.state_id}`,
          observation: f.observation,
          evidence_ids: f.evidence_ids,
        })),
        coverage: evaluation.heuristics.coverage.map(c => ({ lens: c.lens, heuristic_id: c.heuristic_id, status: c.status })),
        assessed: evaluation.heuristics.coverage.filter(c => c.status === 'assessed').length,
        coverage_total: evaluation.heuristics.coverage.length,
      }
      : null,
    journeys: evaluation.journeys.map(j => ({
      id: j.id,
      task_id: j.task_id,
      persona_id: j.persona_id,
      verdict: j.verdict,
      execution_status: j.execution?.status || null,
      stop_reason: j.execution?.stop_reason || null,
      steps: j.steps.length,
      evidence_ids: [...new Set(j.steps.flatMap(s => s.evidence_ids))],
    })),
    usability: {
      status: evaluation.usability.status,
      score: evaluation.usability.status === 'completed' ? evaluation.usability.score : null,
      max_score: evaluation.usability.status === 'completed' ? evaluation.usability.max_score : null,
    },
  };
}

// One severity ladder across check families so a critical heuristic can
// outrank an informational consistency note. Unrated findings rank last.
const UNIFIED_SEVERITY = { error: 0, critical: 0, warning: 1, major: 1, info: 2, minor: 2, cosmetic: 3 };

function prioritizedFindings(result) {
  const consistency = result.consistency.findings.map(f => ({
    source: 'consistency',
    id: f.id,
    severity: f.severity,
    title: f.guideline_title,
    location: f.location,
    description: f.description,
    recommendation: f.recommendation,
    review: f.review_candidate ? 'unreviewed candidate' : f.verdict,
    evidence_ids: f.evidence_ids,
    rank: (UNIFIED_SEVERITY[f.severity] ?? 4) * 4 + (f.review_candidate ? 2 : 0),
  }));
  const heuristics = (result.heuristics?.findings || []).map(f => ({
    source: 'heuristic',
    id: f.id,
    severity: f.suggested_severity,
    title: f.title,
    location: f.location,
    description: f.observation,
    // Specialist observations intentionally carry no fix recommendation.
    recommendation: null,
    review: f.review_status,
    evidence_ids: f.evidence_ids,
    rank: (UNIFIED_SEVERITY[f.suggested_severity] ?? 4) * 4 + (REVIEW_RANK[f.review_status] ?? 3),
  }));
  return [...consistency, ...heuristics].sort((a, b) => a.rank - b.rank || a.id.localeCompare(b.id))
    .map(({ rank, ...finding }) => finding);
}

function uncertainty(docs, result, coverageView) {
  // Show skipped checks and stopped work alongside findings. Finishing a run
  // does not mean we checked everything or found no problems.
  const items = [];
  for (const ac of result.ac.results.filter(r => r.verdict === 'NOT_RUN')) items.push(`Acceptance criterion ${ac.ac_id} is NOT_RUN (unverified).`);
  for (const ac of result.ac.results.filter(r => r.verdict === 'FLAGGED')) items.push(`Acceptance criterion ${ac.ac_id} is FLAGGED and needs human review.`);
  for (const finding of result.consistency.findings.filter(f => f.review_candidate)) items.push(`Consistency finding ${finding.id} is an unreviewed candidate, not a normative violation.`);
  for (const finding of result.heuristics?.findings.filter(f => f.review_status === 'unreviewed') || []) items.push(`Heuristic finding ${finding.id} is unreviewed.`);
  for (const finding of result.heuristics?.findings.filter(f => f.review_status === 'dismissed') || []) items.push(`Heuristic finding ${finding.id} was dismissed by review; it is retained, not deleted.`);
  for (const journey of result.journeys.filter(j => j.verdict === 'NOT_RUN')) items.push(`Walkthrough ${journey.task_id}/${journey.persona_id} is NOT_RUN.`);
  for (const journey of result.journeys.filter(j => ['blocked', 'incomplete', 'failed'].includes(j.execution_status))) items.push(`Walkthrough ${journey.task_id}/${journey.persona_id} ended ${journey.execution_status}: ${journey.stop_reason}`);
  for (const step of coverageView.planned_steps?.filter(s => s.status === 'not-run') || []) items.push(`Planned step ${step.step_id} (${step.check}) did not run.`);
  for (const step of coverageView.planned_steps?.filter(s => s.status === 'failed') || []) items.push(`Planned step ${step.step_id} (${step.check}) failed.`);
  if (result.consistency.status === 'degraded') items.push('Source consistency ran degraded: partial coverage does not establish compliance.');
  if (result.consistency.source_analysis?.unevaluated_rules) items.push(`${result.consistency.source_analysis.unevaluated_rules} selected guideline rules were not evaluated.`);
  if (result.usability.status !== 'completed') items.push('Usability scoring did not run; no usability score is claimed.');
  const usage = usageView(docs);
  if (usage.lineage.llm_cost_usd === null) items.push('Total model cost is unknown (at least one invocation reports no cost).');
  return items;
}

function usageView(docs) {
  // Use saved parent/new-call totals when available. Older child runs can
  // include their parent's calls, so adding them again would double-count.
  const state = docs['pe-state.json'];
  const planning = state.planning;
  if (planning) {
    return {
      reviewed_limits: true,
      limits: docs['pe-context.json'].intent.evaluation_plan.limits,
      own: planning.own_usage,
      prior: planning.prior_usage,
      lineage: planning.lineage_usage,
      budget_status: planning.budget_status,
    };
  }
  if (state.usage_attribution) {
    const { own_usage, prior_usage, lineage_usage } = state.usage_attribution;
    return { reviewed_limits: false, limits: null, own: own_usage, prior: state.usage_attribution.parent_run_id ? prior_usage : null, lineage: lineage_usage, budget_status: null };
  }
  if (state.workflow?.parent_run_id) {
    // Older child artifacts retained phases without ownership metadata. Do
    // not present inherited calls as the child's own or count them again.
    const unknown = unknownUsage();
    return { reviewed_limits: false, limits: null, own: unknown, prior: unknown, lineage: unknown, budget_status: null };
  }
  const own = usageFromPhases(state.phases);
  return { reviewed_limits: false, limits: null, own, prior: null, lineage: own, budget_status: null };
}

function nextActions(docs) {
  return docs['pe-actions.json'].actions
    .filter(a => a.status === 'proposed')
    .map(a => ({
      id: a.id,
      kind: a.kind,
      priority: a.priority,
      recommendation: a.recommendation,
      origin: a.source.ac_id || a.source.finding_id || (a.source.evidence_ids.length ? a.source.evidence_ids.join(', ') : a.source.origin_run_id ? `${a.source.origin_run_id}/${a.source.origin_action_id}` : null),
      handoff: a.handoff.requires_user_invocation ? a.handoff.skill : null,
    }))
    .sort((a, b) => (PRIORITY_RANK[a.priority] ?? 4) - (PRIORITY_RANK[b.priority] ?? 4) || a.id.localeCompare(b.id));
}

function build(docs) {
  const brief = docs['pe-context.json'];
  const state = docs['pe-state.json'];
  const intent = brief.intent;
  const plan = intent.evaluation_plan || null;
  const workflow = state.workflow || null;
  const result = outcomes(docs);
  const coverageView = coverage(docs);
  return {
    run: {
      run_id: brief.run_id,
      prototype_key: brief.prototype_key,
      title: intent.title,
      route: coverageView.route,
      status: coverageView.status,
      pass: workflow?.pass ?? null,
      parent_run_id: workflow?.parent_run_id || null,
      created_at: brief.created_at,
    },
    identity: {
      source: intent.source_input ? { kind: intent.source_input.kind, id: intent.source_input.id, revision: intent.source_input.revision } : null,
      prototype_revision: intent.scope.source_ref,
      prototype_url: intent.scope.prototype_url || null,
      source_mode: intent.scope.source_mode,
    },
    goal: plan
      ? { planned: true, goal: plan.goal, questions: plan.questions, allowed_checks: plan.allowed_checks, limits: plan.limits, reviewed_at: plan.reviewed_at }
      : { planned: false, note: 'No persisted evaluation plan; this run predates or omits reviewed planning.' },
    coverage: coverageView,
    outcomes: result,
    findings: prioritizedFindings(result),
    uncertainty: uncertainty(docs, result, coverageView),
    usage: usageView(docs),
    next_actions: nextActions(docs),
    limitations: LIMITATIONS,
  };
}

function costText(usage) {
  return usage.llm_cost_usd === null ? 'unknown' : `$${usage.llm_cost_usd.toFixed(2)}`;
}
function invocationText(usage) {
  return usage.model_invocations === null ? 'unknown' : usage.model_invocations;
}

function chatMarkdown(synthesis) {
  // Format the same summary used by HTML. Keep decisions in build() so chat
  // and the report do not grow separate rules for what passed.
  const lines = [];
  const s = synthesis;
  lines.push(`# Evaluation summary — ${s.run.title}`);
  lines.push('');
  lines.push(`Run \`${s.run.run_id}\` · route \`${s.run.route}\` · status \`${s.run.status}\`${s.run.parent_run_id ? ` · continues \`${s.run.parent_run_id}\`` : ''}`);
  const source = s.identity.source ? `${s.identity.source.kind} ${s.identity.source.id} @ ${s.identity.source.revision}` : 'no frozen source input';
  lines.push(`Source: ${source} · Build: \`${s.identity.prototype_revision}\` · mode ${s.identity.source_mode}`);
  lines.push('');
  lines.push('## Goal and strategy');
  if (s.goal.planned) {
    lines.push(`Goal: ${s.goal.goal}`);
    for (const question of s.goal.questions) lines.push(`- ${question.id}: ${question.text}`);
    const caps = [s.goal.limits.max_model_invocations === null ? 'no invocation cap' : `max ${s.goal.limits.max_model_invocations} invocations`, s.goal.limits.max_cost_usd === null ? 'no cost cap' : `max $${s.goal.limits.max_cost_usd} cost`].join(', ');
    lines.push(`Reviewed envelope: ${s.goal.allowed_checks.join(', ')} · ${caps}`);
  } else {
    lines.push(s.goal.note);
  }
  lines.push('');
  lines.push('## Coverage: planned versus executed');
  if (s.coverage.planned_steps) {
    for (const step of s.coverage.planned_steps) lines.push(`- \`${step.step_id}\` ${step.check || ''} — **${step.status}** — ${step.reason}`);
  } else {
    lines.push(`- Selected checks: ${s.coverage.selected_checks.length ? s.coverage.selected_checks.join(', ') : 'none recorded'}`);
  }
  if (s.coverage.selected_pairs.length) lines.push(`- Selected task/persona pairs: ${s.coverage.selected_pairs.map(p => `${p.task_id}/${p.persona_id}`).join(', ')}`);
  lines.push('');
  lines.push('## Prioritized findings');
  if (s.findings.length) {
    s.findings.forEach((finding, index) => {
      lines.push(`${index + 1}. **[${finding.severity || 'unrated'}]** ${finding.id} — ${finding.title} — \`${finding.location}\`${finding.review !== 'confirmed' && finding.review !== 'VIOLATION' ? ` (${finding.review})` : ''}`);
      lines.push(`   ${finding.description}`);
      if (finding.recommendation) lines.push(`   → ${finding.recommendation}`);
      if (finding.evidence_ids.length) lines.push(`   evidence: ${finding.evidence_ids.join(', ')}`);
    });
  } else lines.push('No consistency or heuristic findings were recorded.');
  lines.push('');
  lines.push('## Outcomes');
  const ac = s.outcomes.ac.counts;
  lines.push(`- Acceptance criteria: ${ac.pass} pass / ${ac.fail} fail / ${ac.flagged} flagged / ${ac.not_run} NOT_RUN (${ac.total} total)`);
  const cc = s.outcomes.consistency.counts;
  lines.push(`- Consistency: ${s.outcomes.consistency.status} — ${cc.error} error / ${cc.warning} warning / ${cc.info} info`);
  if (s.outcomes.heuristics) lines.push(`- Heuristics: ${s.outcomes.heuristics.findings.length} findings (${s.outcomes.heuristics.findings.filter(f => f.review_status === 'unreviewed').length} unreviewed); coverage ${s.outcomes.heuristics.assessed}/${s.outcomes.heuristics.coverage_total} assessed`);
  else lines.push('- Heuristics: not selected');
  if (s.outcomes.journeys.length) for (const journey of s.outcomes.journeys) lines.push(`- Walkthrough ${journey.task_id}/${journey.persona_id}: ${journey.verdict}${journey.execution_status ? ` (execution ${journey.execution_status})` : ''}`);
  else lines.push('- Walkthroughs: none selected');
  lines.push(`- Usability: ${s.outcomes.usability.status === 'completed' ? `${s.outcomes.usability.score} / ${s.outcomes.usability.max_score}` : 'not evaluated'}`);
  lines.push('');
  lines.push('## Uncertainty');
  if (s.uncertainty.length) for (const item of s.uncertainty) lines.push(`- ${item}`);
  else lines.push('- No unverified criteria, unreviewed findings or blocked work remain in this run.');
  lines.push('');
  lines.push('## Usage');
  lines.push(`- Own: ${invocationText(s.usage.own)} model invocations, cost ${costText(s.usage.own)}`);
  if (s.usage.prior) lines.push(`- Inherited: ${invocationText(s.usage.prior)} invocations, cost ${costText(s.usage.prior)} (counted once, not re-billed here)`);
  lines.push(`- Lineage total: ${invocationText(s.usage.lineage)} invocations, cost ${costText(s.usage.lineage)}${s.usage.budget_status ? ` · budget ${s.usage.budget_status}` : ''}`);
  lines.push('');
  lines.push('## Recommended next actions');
  if (s.next_actions.length) {
    for (const action of s.next_actions) lines.push(`- \`${action.id}\` [${action.kind}, ${action.priority}]${action.origin ? ` (${action.origin})` : ''}: ${action.recommendation}${action.handoff ? ` — handoff: ${action.handoff}` : ''}`);
  } else lines.push('- No proposed actions; review findings directly.');
  lines.push('');
  lines.push('## Notes');
  for (const limitation of s.limitations) lines.push(`- ${limitation}`);
  lines.push('');
  return lines.join('\n');
}

module.exports = { build, chatMarkdown };
