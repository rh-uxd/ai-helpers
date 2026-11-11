#!/usr/bin/env node
'use strict';

/**
 * Pure canonical-to-legacy projections for temporary consumer compatibility.
 * This module performs no filesystem, process, network, browser, or model work.
 */

const { escapeCSVField } = require('../shared/csv-utils');

function indexBy(records, key = 'id') {
  return new Map((records || []).map(record => [record[key], record]));
}

function csvRow(values) {
  return values.map(escapeCSVField).join(',');
}

function legacySource(source) {
  return source === 'jira' ? 'jira' : 'inferred';
}

function legacyExitReason(reason) {
  return String(reason || 'pending').replace(/-/g, '_');
}

function buildContext(documents) {
  // Look up each ID once and translate it to the fields older tools expect.
  // Keeping that translation here saves every caller from doing it again.
  const brief = documents['pe-context.json'];
  const evaluation = documents['pe-evaluation-snapshot.json'];
  const evidence = documents['pe-evidence.json'];
  const actions = documents['pe-actions.json'];
  const state = documents['pe-state.json'];
  const acById = indexBy(brief.intent.acceptance_criteria);
  const resultByAc = indexBy(evaluation.ac_results, 'ac_id');
  const taskById = indexBy(brief.intent.tasks);
  const personaById = indexBy(brief.intent.personas);
  const captureById = indexBy(evidence.captures);
  const evidenceById = indexBy(evidence.items);
  const actionById = indexBy(actions.actions);
  const findingById = indexBy(evaluation.consistency.findings);

  function evidencePath(evidenceId) {
    const item = evidenceById.get(evidenceId);
    if (!item) return '';
    if (item.image && item.image.path) return item.image.path;
    const capture = captureById.get(item.capture_id);
    return capture && capture.raw_image ? capture.raw_image.path : '';
  }

  function evidencePaths(evidenceIds) {
    return [...new Set((evidenceIds || []).map(evidencePath).filter(Boolean))];
  }

  return {
    brief,
    evaluation,
    evidence,
    actions,
    state,
    acById,
    resultByAc,
    taskById,
    personaById,
    captureById,
    evidenceById,
    actionById,
    findingById,
    evidencePath,
    evidencePaths,
  };
}

function toLegacyCsv(documents) {
  // Old CSV shows NOT_RUN as a blank cell, so it loses some meaning. Keep the
  // JSON verdicts as the source of truth, especially when deciding to publish.
  const context = buildContext(documents);
  const { brief, evaluation, actionById, evidencePaths } = context;
  const lines = [
    '# ACCEPTANCE CRITERIA',
    'criterion_id,source,tier,criterion_text,verdict,rationale,evidence,fix_action,fix_file,human_action',
  ];

  for (const criterion of brief.intent.acceptance_criteria) {
    const result = context.resultByAc.get(criterion.id);
    const linkedActions = (result.action_ids || []).map(id => actionById.get(id)).filter(Boolean);
    const fix = linkedActions.find(action => action.kind === 'fix');
    const human = linkedActions.find(action => action.kind === 'human-followup');
    lines.push(csvRow([
      criterion.source_id,
      legacySource(criterion.source),
      criterion.tier,
      criterion.text,
      result.verdict === 'NOT_RUN' ? '' : result.verdict,
      result.rationale,
      evidencePaths(result.evidence_ids)[0] || '',
      fix ? fix.recommendation : '',
      fix && fix.target ? fix.target.file || '' : '',
      human ? human.recommendation : '',
    ]));
  }

  lines.push('', '# USABILITY DIMENSIONS', 'dimension_id,dimension_name,score,confidence,evidence,persona_scores');
  for (const dimension of evaluation.usability.dimensions) {
    lines.push(csvRow([
      dimension.id,
      dimension.label,
      dimension.score,
      dimension.confidence,
      evidencePaths(dimension.evidence_ids).join(';'),
      dimension.persona_scores.map(score => `${score.persona_id}:${score.score}`).join(';'),
    ]));
  }

  const counts = evaluation.summary.ac_counts;
  const scoredJourneys = evaluation.journeys.filter(journey => journey.verdict !== 'NOT_RUN');
  const journeyPasses = scoredJourneys.filter(journey => journey.verdict === 'PASS').length;
  const passRate = counts.total ? `${Math.round((counts.pass / counts.total) * 100)}%` : '0%';
  const journeyPassRate = scoredJourneys.length ? `${Math.round((journeyPasses / scoredJourneys.length) * 100)}%` : '0%';
  let conclusion = `${counts.pass}/${counts.total} criteria passed (${passRate})`;
  if (counts.fail) conclusion += `. ${counts.fail} failed`;
  if (counts.flagged) conclusion += `. ${counts.flagged} need human review`;

  lines.push(
    '',
    '# BASELINE',
    'metric,value,source',
    csvRow(['total_criteria', counts.total, 'pe-evaluation-snapshot.json']),
    csvRow(['pass_count', counts.pass, 'pe-evaluation-snapshot.json']),
    csvRow(['fail_count', counts.fail, 'pe-evaluation-snapshot.json']),
    csvRow(['flagged_count', counts.flagged, 'pe-evaluation-snapshot.json']),
    csvRow(['pass_rate', passRate, 'computed']),
    csvRow(['usability_composite', evaluation.usability.score, 'pe-evaluation-snapshot.json']),
    csvRow(['journey_pass_rate', journeyPassRate, 'pe-evaluation-snapshot.json']),
    csvRow(['conclusion', conclusion, 'computed']),
  );

  return `${lines.join('\n')}\n`;
}

function toLegacySummary(documents) {
  const context = buildContext(documents);
  const { brief, evaluation, state } = context;
  const status = evaluation.summary.ac_counts.fail > 0
    ? 'fail'
    : evaluation.status === 'passed' ? 'pass' : evaluation.status;
  return {
    key: brief.prototype_key,
    timestamp: evaluation.created_at,
    status,
    ac_verdicts: evaluation.ac_results.map(result => {
      const criterion = context.acById.get(result.ac_id);
      return {
        id: criterion.source_id,
        text: criterion.text,
        verdict: result.verdict,
        tier: criterion.tier,
        rationale: result.rationale,
      };
    }),
    counts: {
      pass: evaluation.summary.ac_counts.pass,
      fail: evaluation.summary.ac_counts.fail,
      flagged: evaluation.summary.ac_counts.flagged,
      total: evaluation.summary.ac_counts.total,
    },
    usability: evaluation.usability.status === 'completed' ? {
      overall_score: evaluation.usability.score,
      max_score: evaluation.usability.max_score,
      personas_evaluated: [...new Set(evaluation.usability.dimensions.flatMap(dimension => dimension.persona_scores.map(score => score.persona_id)))],
      dimensions: evaluation.usability.dimensions.map(dimension => ({
        id: dimension.id,
        name: dimension.label,
        composite_score: dimension.score,
        persona_scores: Object.fromEntries(dimension.persona_scores.map(score => [score.persona_id, score.score])),
      })),
    } : null,
    suggestions_pending: context.actions.actions.filter(action => action.status === 'proposed').length,
    iteration: {
      current: state.lifecycle.iteration,
      max: state.lifecycle.max_iterations,
      exit_reason: legacyExitReason(state.lifecycle.exit_reason),
    },
  };
}

function toLegacyConsistencyFinding(finding) {
  return {
    guideline_id: finding.guideline_id,
    guideline_title: finding.guideline_title,
    category: finding.category,
    severity: finding.severity,
    verdict: finding.verdict,
    confidence: finding.confidence,
    review_candidate: finding.review_candidate,
    file: finding.file || null,
    line: finding.line || null,
    property: finding.property,
    value: finding.value,
    description: finding.description,
    suggestion: finding.recommendation,
    pf_doc_url: finding.pf_doc_url,
    check_method: finding.check_method,
  };
}

function toLegacyConsistency(documents) {
  const { evaluation } = buildContext(documents);
  const consistency = evaluation.consistency;
  const sourceFindings = consistency.findings.filter(finding => finding.origin === 'source');
  const visualFindings = consistency.findings.filter(finding => finding.origin === 'visual');
  const errorGroups = new Set(consistency.findings.filter(finding => finding.severity === 'error').map(finding => finding.guideline_id));
  const warningGroups = new Set(consistency.findings.filter(finding => finding.severity !== 'error' && !errorGroups.has(finding.guideline_id)).map(finding => finding.guideline_id));
  return {
    ...(consistency.source_analysis ? { source_analysis: JSON.parse(JSON.stringify(consistency.source_analysis)) } : {}),
    source: 'uxd-consistency-check',
    guidelines_version: consistency.guidelines_version,
    checked_at: evaluation.created_at,
    degraded: consistency.status === 'degraded',
    source_mode: {
      ran: consistency.source_checked,
      violations: sourceFindings.map(toLegacyConsistencyFinding),
    },
    visual_mode: {
      ran: consistency.visual_checked,
      screenshots_checked: consistency.screenshots_checked,
      findings: visualFindings.map(toLegacyConsistencyFinding),
    },
    summary: {
      total_guidelines_checked: consistency.guidelines_checked,
      violations: errorGroups.size,
      warnings: warningGroups.size,
      passes: Math.max(0, consistency.guidelines_checked - errorGroups.size - warningGroups.size),
    },
  };
}

function toLegacyExtract(documents) {
  const context = buildContext(documents);
  const { brief, evaluation } = context;
  return {
    key: brief.prototype_key,
    title: brief.intent.title,
    extracted_at: brief.created_at,
    ac_list: brief.intent.acceptance_criteria.map(criterion => ({
      id: criterion.source_id,
      criterion_id: criterion.source_id,
      source: legacySource(criterion.source),
      source_ticket: brief.intent.feature_context?.source_ticket || null,
      text: criterion.text,
      references: [],
    })),
    feature_context: brief.intent.feature_context || null,
    tasks_to_be_done: brief.intent.tasks.map(task => ({
      task: task.title,
      source: task.target_route,
      covers_acs: task.ac_ids.map(id => context.acById.get(id).source_id),
    })),
    journey_definitions: evaluation.journeys.map(journey => ({
      id: journey.id,
      title: context.taskById.get(journey.task_id).title,
      persona: journey.persona_id,
      source: journey.source,
      ac_ids: journey.ac_ids.map(id => context.acById.get(id).source_id),
      expected_path: journey.steps.map(step => step.target),
    })),
    breadcrumb: brief.intent.breadcrumb || null,
    persona_selection: {
      method: 'canonical-brief',
      selected: brief.intent.personas.map(persona => persona.id),
      target_audience_text: '',
      target_audience_source: brief.intent.feature_context?.source_ticket || null,
    },
    rfe_key: brief.intent.breadcrumb?.rfe?.key || null,
  };
}

function toLegacyEvidence(documents) {
  const { brief, evidence } = buildContext(documents);
  const firstCapture = evidence.captures[0] || null;
  const screenshots = [...new Set([
    ...evidence.captures.map(capture => capture.raw_image?.path).filter(Boolean),
    ...evidence.items.map(item => item.image?.path).filter(Boolean),
  ])];
  return {
    schema_version: 1,
    capture_method: 'canonical-compatibility-adapter',
    prototype_url: firstCapture?.url || brief.intent.scope.prototype_url,
    captured_at: firstCapture?.captured_at || evidence.created_at,
    viewport: firstCapture?.viewport || null,
    screenshots,
    page: firstCapture?.page || { title: '', headings: [], controls: [] },
    captures: evidence.captures,
    evidence_items: evidence.items,
  };
}

function toLegacyJourney(documents) {
  const context = buildContext(documents);
  const { brief, evaluation, evidencePaths } = context;
  return {
    depth: 'canonical',
    prototype_url: brief.intent.scope.prototype_url,
    evaluated_at: evaluation.created_at,
    persona_selection: {
      method: 'canonical-brief',
      personas: brief.intent.personas.map(persona => persona.id),
    },
    journeys: evaluation.journeys.map(journey => {
      const task = context.taskById.get(journey.task_id);
      const relatedResults = journey.ac_ids.map(id => context.resultByAc.get(id));
      return {
        id: journey.id,
        title: task.title,
        persona: journey.persona_id,
        source: journey.source,
        steps_expected: journey.steps.length,
        steps_completed: journey.steps.filter(step => step.outcome === 'success').length,
        verdict: journey.verdict,
        verdict_detail: relatedResults.map(result => result.rationale).filter(Boolean).join(' '),
        ac_ids: journey.ac_ids.map(id => context.acById.get(id).source_id),
        steps: journey.steps.map(step => ({
          step: step.sequence,
          action: step.action,
          target: step.target,
          result: step.outcome,
          screenshot: evidencePaths(step.evidence_ids)[0] || '',
          narration: step.note,
        })),
      };
    }),
    usability_dimensions: evaluation.usability.status === 'completed' ? {
      dimensions: evaluation.usability.dimensions.map(dimension => ({
        id: dimension.id,
        name: dimension.label,
        composite_score: dimension.score,
        confidence: dimension.confidence,
        evidence: evidencePaths(dimension.evidence_ids),
        persona_scores: Object.fromEntries(dimension.persona_scores.map(score => [score.persona_id, score.score])),
      })),
      overall_score: evaluation.usability.score,
      max_score: evaluation.usability.max_score,
      personas_evaluated: [...new Set(evaluation.usability.dimensions.flatMap(dimension => dimension.persona_scores.map(score => score.persona_id)))],
      persona_overlays: [],
    } : null,
  };
}

function toLegacySuggestions(documents) {
  // Keep suggested fixes separate from fixes already made. Converting these
  // records does not apply a fix or give anyone permission to do so.
  const context = buildContext(documents);
  return context.actions.actions
    .filter(action => action.kind === 'fix' && !['applied', 'validated'].includes(action.status))
    .map(action => {
      const criterion = action.source.ac_id ? context.acById.get(action.source.ac_id) : null;
      const result = action.source.ac_id ? context.resultByAc.get(action.source.ac_id) : null;
      const finding = action.source.finding_id ? context.findingById.get(action.source.finding_id) : null;
      if (finding) {
        return {
          type: 'consistency',
          guideline_id: finding.guideline_id,
          severity: finding.severity,
          file: action.target?.file || finding.file || '',
          line: action.target?.line || finding.line || null,
          current: finding.value,
          fix: action.recommendation,
          pf_doc_url: finding.pf_doc_url,
          source: `${finding.origin}_mode`,
          confidence: action.confidence,
          applied: false,
        };
      }
      return {
        type: 'ac_failure',
        criterion_id: criterion.source_id,
        criterion_text: criterion.text,
        verdict: result.verdict,
        rationale: result.rationale,
        fix_action: action.recommendation,
        fix_file: action.target?.file || '',
        confidence: action.confidence,
        applied: false,
      };
    });
}

function toLegacyFixLog(documents) {
  const context = buildContext(documents);
  return context.actions.actions
    .filter(action => action.kind === 'fix' && ['applied', 'validated'].includes(action.status))
    .map(action => {
      const criterion = action.source.ac_id ? context.acById.get(action.source.ac_id) : null;
      const finding = action.source.finding_id ? context.findingById.get(action.source.finding_id) : null;
      return {
        iteration: action.result.applied_in_iteration,
        type: finding ? 'consistency' : 'ac_failure',
        ac_id: criterion?.source_id || finding?.guideline_id || '',
        criterion_id: criterion?.source_id || finding?.guideline_id || '',
        action: 'fix',
        file: action.target?.file || '',
        result: 'applied',
        detail: action.recommendation,
        change: action.recommendation,
        confidence: action.confidence,
        description: action.recommendation,
        applied: true,
        timestamp: action.result.validated_at,
      };
    });
}

function toLegacyIterationLog(documents) {
  const context = buildContext(documents);
  const { brief, evaluation, state } = context;
  const phaseA = state.lifecycle.iterations.filter(iteration => iteration.phase === 'a');
  return {
    key: brief.prototype_key,
    max_iterations: state.lifecycle.max_iterations,
    iterations: phaseA.map(iteration => {
      const counts = { pass: 0, fail: 0, flagged: 0 };
      const details = {};
      for (const result of iteration.ac_results) {
        const criterion = context.acById.get(result.ac_id);
        if (result.verdict === 'PASS') counts.pass += 1;
        if (result.verdict === 'FAIL') counts.fail += 1;
        if (result.verdict === 'FLAGGED') counts.flagged += 1;
        details[criterion.source_id] = { verdict: result.verdict, tier: criterion.tier };
      }
      return {
        iteration: iteration.iteration,
        phase: 'a',
        timestamp: iteration.timestamp,
        pass_count: counts.pass,
        fail_count: counts.fail,
        flagged_count: counts.flagged,
        total_criteria: iteration.ac_results.length,
        details,
        consistency_summary: {
          violations: new Set(evaluation.consistency.findings.filter(finding => finding.severity === 'error').map(finding => finding.guideline_id)).size,
          warnings: new Set(evaluation.consistency.findings.filter(finding => finding.severity !== 'error').map(finding => finding.guideline_id)).size,
          passes: toLegacyConsistency(documents).summary.passes,
        },
      };
    }),
    exit_reason: legacyExitReason(state.lifecycle.exit_reason),
    total_criteria_fixed: context.actions.actions.filter(action => action.kind === 'fix' && ['applied', 'validated'].includes(action.status)).length,
    total_regressions: 0,
    phase_b: state.lifecycle.iterations.filter(iteration => iteration.phase === 'b').map(iteration => ({
      phase: 'b',
      timestamp: iteration.timestamp,
      usability_score: iteration.usability_score ?? evaluation.usability.score,
      personas_evaluated: iteration.persona_ids || [],
    })).at(-1) || undefined,
  };
}

function toLegacyEvalState(documents) {
  const { brief, evaluation, state } = buildContext(documents);
  const phase = ['usability', 'report'].includes(state.lifecycle.current_phase) ? 'b' : 'a';
  const counts = evaluation.summary.ac_counts;
  return [
    `phase: ${phase}`,
    `iteration: ${state.lifecycle.iteration}`,
    `max_iterations: ${state.lifecycle.max_iterations}`,
    `ac_pass: ${counts.total > 0 && counts.pass === counts.total}`,
    `exit_reason: ${legacyExitReason(state.lifecycle.exit_reason)}`,
    `key: ${brief.prototype_key}`,
    `url: ${brief.intent.scope.prototype_url}`,
    '',
  ].join('\n');
}

function materializeTargets(documents, targets) {
  // Return only the formats the caller asked for. The CLI writes them to disk;
  // the old report reader can use the same results without writing files.
  const outputs = new Map();
  for (const target of targets) {
    if (target === 'csv') outputs.set('evaluation-report.csv', toLegacyCsv(documents));
    else if (target === 'summary') outputs.set('evaluation-summary.json', toLegacySummary(documents));
    else if (target === 'consistency') outputs.set('consistency-report.json', toLegacyConsistency(documents));
    else if (target === 'extract') outputs.set('extract-state.json', toLegacyExtract(documents));
    else if (target === 'evidence') outputs.set('prototype-evidence.json', toLegacyEvidence(documents));
    else if (target === 'journey') outputs.set('journey-log.json', toLegacyJourney(documents));
    else if (target === 'actions') {
      outputs.set('refinement-suggestions.json', toLegacySuggestions(documents));
      outputs.set('fix-log.json', toLegacyFixLog(documents));
    } else if (target === 'state') {
      outputs.set('iteration-log.json', toLegacyIterationLog(documents));
      outputs.set('eval-state.yaml', toLegacyEvalState(documents));
    } else {
      const error = new Error(`Unknown adapter target: ${target}`);
      error.code = 'unknown_target';
      throw error;
    }
  }
  return outputs;
}

module.exports = {
  buildContext,
  materializeTargets,
  toLegacyConsistency,
  toLegacyCsv,
  toLegacyEvalState,
  toLegacyEvidence,
  toLegacyExtract,
  toLegacyFixLog,
  toLegacyIterationLog,
  toLegacyJourney,
  toLegacySuggestions,
  toLegacySummary,
};
