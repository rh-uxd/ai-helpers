#!/usr/bin/env node
'use strict';

/**
 * Validate the five canonical UXD evaluation artifacts.
 *
 * Usage:
 *   node scripts/artifacts/validate-canonical-artifacts.js <eval-dir> [--json]
 *
 * This validator is intentionally model-free. JSON Schema validates each
 * document while the cross-artifact checks validate references, summaries,
 * crop bounds, execution identity, and safety invariants that JSON Schema cannot
 * compare across sibling files.
 */

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const Ajv2020 = require('ajv/dist/2020');
const addFormats = require('ajv-formats');

const ARTIFACT_FILES = [
  'pe-context.json',
  'pe-evaluation-snapshot.json',
  'pe-evidence.json',
  'pe-actions.json',
  'pe-state.json',
];
const SCHEMA_FILES = {
  'pe-context.json': 'brief.schema.json',
  'pe-evaluation-snapshot.json': 'evaluation.schema.json',
  'pe-evidence.json': 'evidence.schema.json',
  'pe-actions.json': 'actions.schema.json',
  'pe-state.json': 'state.schema.json',
};
const PROHIBITED_KEYS = new Set([
  'reasoning',
  'thought',
  'chain_of_thought',
  'analysis',
  'transcript',
  'think_aloud',
]);
const SCHEMAS_DIR = path.resolve(__dirname, '../..', 'schemas', 'v1');

function issue(errors, artifact, pathSuffix, code, message) {
  errors.push({
    path: `${artifact}${pathSuffix || ''}`,
    code,
    message,
  });
}

function loadJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function loadDocuments(artifactsDir, errors) {
  const documents = {};
  for (const filename of ARTIFACT_FILES) {
    const filePath = path.join(artifactsDir, filename);
    if (!fs.existsSync(filePath)) {
      issue(errors, filename, '', 'missing_artifact', 'Required canonical artifact is missing.');
      continue;
    }
    try {
      documents[filename] = loadJson(filePath);
    } catch (error) {
      issue(errors, filename, '', 'invalid_json', error.message);
    }
  }
  return documents;
}

function createSchemaValidators() {
  const ajv = new Ajv2020({ allErrors: true, strict: true, validateFormats: true });
  addFormats(ajv);
  ajv.addSchema(loadJson(path.join(SCHEMAS_DIR, 'shared.schema.json')));
  ajv.addSchema(loadJson(path.join(SCHEMAS_DIR, 'heuristics.schema.json')));
  ajv.addSchema(loadJson(path.join(SCHEMAS_DIR, 'split.schema.json')));
  ajv.addSchema(loadJson(path.join(SCHEMAS_DIR, 'evaluation-plan.schema.json')));
  ajv.addSchema(loadJson(path.join(SCHEMAS_DIR, 'consistency-source.schema.json')));
  const validators = {};
  for (const [artifact, filename] of Object.entries(SCHEMA_FILES)) {
    validators[artifact] = ajv.compile(loadJson(path.join(SCHEMAS_DIR, filename)));
  }
  return validators;
}

function validateSchemas(documents, errors) {
  const validators = createSchemaValidators();
  for (const [filename, document] of Object.entries(documents)) {
    const validate = validators[filename];
    if (validate(document)) continue;
    for (const error of validate.errors || []) {
      issue(errors, filename, error.instancePath || '', `schema_${error.keyword}`, error.message || 'Schema validation failed.');
    }
  }
}

function idsFrom(records, filename, pathPrefix, errors) {
  const ids = new Set();
  for (let index = 0; index < records.length; index += 1) {
    const id = records[index] && records[index].id;
    if (ids.has(id)) {
      issue(errors, filename, `${pathPrefix}/${index}/id`, 'duplicate_id', `Duplicate ID: ${id}.`);
    }
    ids.add(id);
  }
  return ids;
}

function assertResolved(errors, filename, pathSuffix, id, knownIds, label) {
  if (id && !knownIds.has(id)) {
    issue(errors, filename, pathSuffix, 'dangling_reference', `${label} does not resolve: ${id}.`);
  }
}

function assertResolvedAll(errors, filename, pathSuffix, ids, knownIds, label) {
  for (let index = 0; index < (ids || []).length; index += 1) {
    assertResolved(errors, filename, `${pathSuffix}/${index}`, ids[index], knownIds, label);
  }
}

function countVerdicts(records) {
  const counts = { pass: 0, fail: 0, flagged: 0, not_run: 0, total: records.length };
  for (const record of records) {
    if (record.verdict === 'PASS') counts.pass += 1;
    if (record.verdict === 'FAIL') counts.fail += 1;
    if (record.verdict === 'FLAGGED') counts.flagged += 1;
    if (record.verdict === 'NOT_RUN') counts.not_run += 1;
  }
  return counts;
}

function sameCounts(left, right) {
  return Object.keys(left).every(key => left[key] === right[key]);
}

function validateProhibitedKeys(value, filename, pointer, errors) {
  if (Array.isArray(value)) {
    value.forEach((item, index) => validateProhibitedKeys(item, filename, `${pointer}/${index}`, errors));
    return;
  }
  if (!value || typeof value !== 'object') return;
  for (const [key, child] of Object.entries(value)) {
    const childPointer = `${pointer}/${key}`;
    if (PROHIBITED_KEYS.has(key.toLowerCase())) {
      issue(errors, filename, childPointer, 'prohibited_reasoning_field', `The ${key} field is not allowed in canonical artifacts.`);
    }
    validateProhibitedKeys(child, filename, childPointer, errors);
  }
}

function validateIdentity(documents, errors) {
  const baseline = documents['pe-context.json'];
  if (!baseline) return;
  for (const [filename, document] of Object.entries(documents)) {
    for (const field of ['schema_version', 'run_id', 'prototype_key']) {
      if (document[field] !== baseline[field]) {
        issue(errors, filename, `/${field}`, 'identity_mismatch', `${field} must match pe-context.json.`);
      }
    }
    validateProhibitedKeys(document, filename, '', errors);
  }
}

function validateReferences(documents, errors) {
  // Schemas check field shapes; these joins check that IDs refer to the same
  // criteria, tasks, evidence and actions across all five documents.
  const brief = documents['pe-context.json'];
  const evaluation = documents['pe-evaluation-snapshot.json'];
  const evidence = documents['pe-evidence.json'];
  const actions = documents['pe-actions.json'];
  if (!brief || !evaluation || !evidence || !actions) return;

  const acIds = idsFrom(brief.intent.acceptance_criteria, 'pe-context.json', '/intent/acceptance_criteria', errors);
  const taskIds = idsFrom(brief.intent.tasks, 'pe-context.json', '/intent/tasks', errors);
  const personaIds = idsFrom(brief.intent.personas, 'pe-context.json', '/intent/personas', errors);
  for (let index = 0; index < brief.intent.tasks.length; index += 1) {
    assertResolvedAll(errors, 'pe-context.json', `/intent/tasks/${index}/ac_ids`, brief.intent.tasks[index].ac_ids, acIds, 'Task acceptance criterion');
  }
  for (let index = 0; index < brief.intent.personas.length; index += 1) {
    assertResolvedAll(errors, 'pe-context.json', `/intent/personas/${index}/task_ids`, brief.intent.personas[index].task_ids, taskIds, 'Persona task');
  }

  const captureIds = idsFrom(evidence.captures, 'pe-evidence.json', '/captures', errors);
  const evidenceIds = idsFrom([...evidence.items, ...(evidence.source_items || [])], 'pe-evidence.json', '/items', errors);
  const evidenceById = new Map(evidence.items.map(item => [item.id, item]));
  const captureById = new Map(evidence.captures.map(capture => [capture.id, capture]));
  for (let index = 0; index < evidence.items.length; index += 1) {
    assertResolved(errors, 'pe-evidence.json', `/items/${index}/capture_id`, evidence.items[index].capture_id, captureIds, 'Evidence capture');
  }

  const actionIds = idsFrom(actions.actions, 'pe-actions.json', '/actions', errors);
  const findingIds = idsFrom(evaluation.consistency.findings, 'pe-evaluation-snapshot.json', '/consistency/findings', errors);
  for (const id of idsFrom(evaluation.heuristics?.findings || [], 'pe-evaluation-snapshot.json', '/heuristics/findings', errors)) {
    if (findingIds.has(id)) issue(errors, 'pe-evaluation-snapshot.json', '/heuristics/findings', 'duplicate_id', `Finding ID collides with consistency: ${id}.`);
    findingIds.add(id);
  }
  const candidateFindingIds = new Set(evaluation.consistency.findings.filter(finding => finding.review_candidate).map(finding => finding.id));

  const resultAcIds = new Set();
  for (let index = 0; index < evaluation.ac_results.length; index += 1) {
    const result = evaluation.ac_results[index];
    if (resultAcIds.has(result.ac_id)) {
      issue(errors, 'pe-evaluation-snapshot.json', `/ac_results/${index}/ac_id`, 'duplicate_ac_result', `Duplicate result for ${result.ac_id}.`);
    }
    resultAcIds.add(result.ac_id);
    assertResolved(errors, 'pe-evaluation-snapshot.json', `/ac_results/${index}/ac_id`, result.ac_id, acIds, 'Acceptance criterion');
    assertResolvedAll(errors, 'pe-evaluation-snapshot.json', `/ac_results/${index}/evidence_ids`, result.evidence_ids, evidenceIds, 'Evidence item');
    assertResolvedAll(errors, 'pe-evaluation-snapshot.json', `/ac_results/${index}/action_ids`, result.action_ids, actionIds, 'Action');
    if (['PASS', 'FAIL'].includes(result.verdict)) {
      if (result.evaluated_by === 'source') {
        issue(errors, 'pe-evaluation-snapshot.json', `/ac_results/${index}/evaluated_by`, 'source_classification_not_verification', 'Source classification cannot establish a verified AC verdict.');
      } else if (!['journey', 'human'].includes(result.evaluated_by)) {
        issue(errors, 'pe-evaluation-snapshot.json', `/ac_results/${index}/evaluated_by`, 'missing_verifier', 'PASS/FAIL requires an explicit verifier; classification and planned work are not verification.');
      }
      if (!result.evidence_ids.length) {
        issue(errors, 'pe-evaluation-snapshot.json', `/ac_results/${index}/evidence_ids`, 'missing_verification_evidence', 'PASS/FAIL requires evidence linked to the explicit verification.');
      }
    }
    if (result.evaluated_by === 'journey' && result.verdict !== 'NOT_RUN') {
      const criterion = brief.intent.acceptance_criteria.find(ac => ac.id === result.ac_id);
      const expectedOutcome = result.verdict === 'PASS' ? 'success' : result.verdict === 'FAIL' ? 'failure' : null;
      const verifySteps = evaluation.journeys
        .filter(journey => journey.ac_ids.includes(result.ac_id))
        .flatMap(journey => journey.steps)
        .filter(step => step.action === 'verify');
      const linked = result.evidence_ids.length > 0 && result.evidence_ids.every(id => (
        evidenceById.has(id) && verifySteps.some(step => step.evidence_ids.includes(id)
          && (!expectedOutcome || step.outcome === expectedOutcome))
      ));
      if (!linked) issue(errors, 'pe-evaluation-snapshot.json', `/ac_results/${index}`, 'missing_explicit_verification', 'Journey AC results need task-linked browser evidence from an explicit verification step whose observed outcome supports the verdict.');
      if (['PASS', 'FAIL'].includes(result.verdict) && criterion?.verification_mode !== 'ui') {
        issue(errors, 'pe-evaluation-snapshot.json', `/ac_results/${index}`, 'browser_non_ui_verification', 'Browser walkthroughs cannot verify non-UI acceptance criteria.');
      }
    }
  }
  for (const acId of acIds) {
    if (!resultAcIds.has(acId)) {
      issue(errors, 'pe-evaluation-snapshot.json', '/ac_results', 'missing_ac_result', `No result exists for ${acId}.`);
    }
  }

  const journeyIds = idsFrom(evaluation.journeys, 'pe-evaluation-snapshot.json', '/journeys', errors);
  void journeyIds;
  const globalStepIds = new Set();
  for (let journeyIndex = 0; journeyIndex < evaluation.journeys.length; journeyIndex += 1) {
    const journey = evaluation.journeys[journeyIndex];
    assertResolved(errors, 'pe-evaluation-snapshot.json', `/journeys/${journeyIndex}/task_id`, journey.task_id, taskIds, 'Journey task');
    assertResolved(errors, 'pe-evaluation-snapshot.json', `/journeys/${journeyIndex}/persona_id`, journey.persona_id, personaIds, 'Journey persona');
    assertResolvedAll(errors, 'pe-evaluation-snapshot.json', `/journeys/${journeyIndex}/ac_ids`, journey.ac_ids, acIds, 'Journey acceptance criterion');
    const sequences = new Set();
    for (let stepIndex = 0; stepIndex < journey.steps.length; stepIndex += 1) {
      const step = journey.steps[stepIndex];
      if (globalStepIds.has(step.id)) {
        issue(errors, 'pe-evaluation-snapshot.json', `/journeys/${journeyIndex}/steps/${stepIndex}/id`, 'duplicate_id', `Duplicate step ID: ${step.id}.`);
      }
      globalStepIds.add(step.id);
      if (sequences.has(step.sequence)) {
        issue(errors, 'pe-evaluation-snapshot.json', `/journeys/${journeyIndex}/steps/${stepIndex}/sequence`, 'duplicate_sequence', `Duplicate journey step sequence: ${step.sequence}.`);
      }
      sequences.add(step.sequence);
      assertResolvedAll(errors, 'pe-evaluation-snapshot.json', `/journeys/${journeyIndex}/steps/${stepIndex}/evidence_ids`, step.evidence_ids, evidenceIds, 'Evidence item');
    }
  }

  for (let dimensionIndex = 0; dimensionIndex < evaluation.usability.dimensions.length; dimensionIndex += 1) {
    const dimension = evaluation.usability.dimensions[dimensionIndex];
    if (dimension.score > dimension.max_score) {
      issue(errors, 'pe-evaluation-snapshot.json', `/usability/dimensions/${dimensionIndex}/score`, 'score_exceeds_maximum', 'Dimension score exceeds max_score.');
    }
    for (let scoreIndex = 0; scoreIndex < dimension.persona_scores.length; scoreIndex += 1) {
      const score = dimension.persona_scores[scoreIndex];
      assertResolved(errors, 'pe-evaluation-snapshot.json', `/usability/dimensions/${dimensionIndex}/persona_scores/${scoreIndex}/persona_id`, score.persona_id, personaIds, 'Usability persona');
    }
    assertResolvedAll(errors, 'pe-evaluation-snapshot.json', `/usability/dimensions/${dimensionIndex}/evidence_ids`, dimension.evidence_ids, evidenceIds, 'Evidence item');
  }

  for (let findingIndex = 0; findingIndex < evaluation.consistency.findings.length; findingIndex += 1) {
    const finding = evaluation.consistency.findings[findingIndex];
    assertResolvedAll(errors, 'pe-evaluation-snapshot.json', `/consistency/findings/${findingIndex}/evidence_ids`, finding.evidence_ids, evidenceIds, 'Evidence item');
  }

  for (let actionIndex = 0; actionIndex < actions.actions.length; actionIndex += 1) {
    const action = actions.actions[actionIndex];
    const source = action.source;
    if (!source.ac_id && !source.finding_id && source.evidence_ids.length === 0 && !(action.kind === 'fix' && ['applied', 'validated'].includes(action.status) && source.origin_run_id && source.origin_action_id)) {
      issue(errors, 'pe-actions.json', `/actions/${actionIndex}/source`, 'empty_action_source', 'An action must reference an AC, finding, or evidence item.');
    }
    assertResolved(errors, 'pe-actions.json', `/actions/${actionIndex}/source/ac_id`, source.ac_id, acIds, 'Action acceptance criterion');
    assertResolved(errors, 'pe-actions.json', `/actions/${actionIndex}/source/finding_id`, source.finding_id, findingIds, 'Action finding');
    assertResolvedAll(errors, 'pe-actions.json', `/actions/${actionIndex}/source/evidence_ids`, source.evidence_ids, evidenceIds, 'Evidence item');
    if (source.finding_id && candidateFindingIds.has(source.finding_id)) {
      issue(errors, 'pe-actions.json', `/actions/${actionIndex}/source/finding_id`, 'review_candidate_action', 'Review-candidate findings cannot create actions.');
    }
    if (action.kind === 'fix' && action.status === 'applied') {
      if (!action.target || !action.target.file || !action.result.changed_files.length || !action.result.validated_at) {
        issue(errors, 'pe-actions.json', `/actions/${actionIndex}`, 'incomplete_applied_fix', 'Applied fixes require a target file, changed files, and validated_at.');
      }
    }
  }

  if (evaluation.heuristics) {
    const scope = brief.intent.check_scope;
    if (!scope) issue(errors, 'pe-context.json', '/intent/check_scope', 'missing_heuristic_scope', 'Heuristics require approved screen/state/source scope.');
    const expected = new Set(['content:2', 'content:4', 'content:5', 'content:9', 'content:10', 'hierarchy:2', 'hierarchy:4', 'hierarchy:6', 'hierarchy:8', 'interaction:1', 'interaction:3', 'interaction:5', 'interaction:9', 'interaction:7']);
    const assessed = new Set();
    for (const [index, row] of evaluation.heuristics.coverage.entries()) {
      const key = `${row.lens}:${row.heuristic_id}`;
      if (!expected.delete(key)) issue(errors, 'pe-evaluation-snapshot.json', `/heuristics/coverage/${index}`, 'invalid_coverage', `Unexpected or duplicate lens coverage: ${key}.`);
      if (row.status === 'assessed') {
        assessed.add(key);
        if (!row.evidence_ids.length) issue(errors, 'pe-evaluation-snapshot.json', `/heuristics/coverage/${index}`, 'missing_coverage_evidence', 'Assessed heuristics require evidence.');
      }
      assertResolvedAll(errors, 'pe-evaluation-snapshot.json', `/heuristics/coverage/${index}/evidence_ids`, row.evidence_ids, evidenceIds, 'Coverage evidence');
    }
    if (expected.size) issue(errors, 'pe-evaluation-snapshot.json', '/heuristics/coverage', 'missing_coverage', `Missing coverage: ${[...expected].join(', ')}.`);
    for (const [index, finding] of evaluation.heuristics.findings.entries()) {
      assertResolvedAll(errors, 'pe-evaluation-snapshot.json', `/heuristics/findings/${index}/evidence_ids`, finding.evidence_ids, evidenceIds, 'Heuristic evidence');
      if (!finding.evidence_ids.some(id => {
        const capture = captureById.get(evidenceById.get(id)?.capture_id);
        return capture && capture.screen_id === finding.screen_id && capture.state_id === finding.state_id;
      })) issue(errors, 'pe-evaluation-snapshot.json', `/heuristics/findings/${index}`, 'wrong_state_evidence', 'Finding needs evidence from its named screen/state.');
      if (scope && (!scope.screen_ids.includes(finding.screen_id) || !scope.state_ids.includes(finding.state_id) || finding.source_ids.some(id => !scope.source_ids.includes(id)))) issue(errors, 'pe-evaluation-snapshot.json', `/heuristics/findings/${index}`, 'out_of_scope_finding', 'Finding screen/state/source must resolve to the approved scope.');
      for (const heuristicId of finding.heuristic_ids) {
        if (!finding.identified_by.some(lens => assessed.has(`${lens}:${heuristicId}`))) issue(errors, 'pe-evaluation-snapshot.json', `/heuristics/findings/${index}`, 'unassessed_finding', 'Finding heuristic must have assessed coverage from an identifying lens.');
      }
    }
  }

  const state = documents['pe-state.json'];
  if (state) {
    const iterationKeys = new Set();
    for (let iterationIndex = 0; iterationIndex < state.lifecycle.iterations.length; iterationIndex += 1) {
      const iteration = state.lifecycle.iterations[iterationIndex];
      const key = `${iteration.iteration}:${iteration.phase}`;
      if (iterationKeys.has(key)) {
        issue(errors, 'pe-state.json', `/lifecycle/iterations/${iterationIndex}`, 'duplicate_iteration', `Duplicate iteration phase: ${key}.`);
      }
      iterationKeys.add(key);
      const iterationAcIds = new Set();
      for (let resultIndex = 0; resultIndex < iteration.ac_results.length; resultIndex += 1) {
        const result = iteration.ac_results[resultIndex];
        if (iterationAcIds.has(result.ac_id)) {
          issue(errors, 'pe-state.json', `/lifecycle/iterations/${iterationIndex}/ac_results/${resultIndex}/ac_id`, 'duplicate_ac_result', `Duplicate iteration result for ${result.ac_id}.`);
        }
        iterationAcIds.add(result.ac_id);
        assertResolved(errors, 'pe-state.json', `/lifecycle/iterations/${iterationIndex}/ac_results/${resultIndex}/ac_id`, result.ac_id, acIds, 'Iteration acceptance criterion');
      }
      assertResolvedAll(errors, 'pe-state.json', `/lifecycle/iterations/${iterationIndex}/persona_ids`, iteration.persona_ids || [], personaIds, 'Iteration persona');
    }
    if (state.lifecycle.iteration > 0 && !state.lifecycle.iterations.some(item => item.iteration === state.lifecycle.iteration)) {
      issue(errors, 'pe-state.json', '/lifecycle/iteration', 'missing_current_iteration', 'The current iteration must exist in lifecycle.iterations.');
    }
  }
}

function validateSummaries(documents, errors) {
  const evaluation = documents['pe-evaluation-snapshot.json'];
  if (!evaluation) return;
  const expectedAc = countVerdicts(evaluation.ac_results);
  const expectedJourney = countVerdicts(evaluation.journeys);
  const expectedConsistency = { error: 0, warning: 0, info: 0, total: evaluation.consistency.findings.length };
  for (const finding of evaluation.consistency.findings) expectedConsistency[finding.severity] += 1;

  if (!sameCounts(expectedAc, evaluation.summary.ac_counts)) {
    issue(errors, 'pe-evaluation-snapshot.json', '/summary/ac_counts', 'derived_summary_mismatch', 'ac_counts must be derived from ac_results.');
  }
  if (!sameCounts(expectedJourney, evaluation.summary.journey_counts)) {
    issue(errors, 'pe-evaluation-snapshot.json', '/summary/journey_counts', 'derived_summary_mismatch', 'journey_counts must be derived from journeys.');
  }
  if (!sameCounts(expectedConsistency, evaluation.summary.consistency_counts)) {
    issue(errors, 'pe-evaluation-snapshot.json', '/summary/consistency_counts', 'derived_summary_mismatch', 'consistency_counts must be derived from consistency.findings.');
  }
  if (evaluation.consistency.coverage_by_mode && (evaluation.consistency.coverage_count_method !== 'max-per-mode' || evaluation.consistency.guidelines_checked !== Math.max(evaluation.consistency.coverage_by_mode.source, evaluation.consistency.coverage_by_mode.visual))) issue(errors, 'pe-evaluation-snapshot.json', '/consistency', 'coverage_count_mismatch', 'Coverage scalar must match its explicitly recorded max-per-mode policy.');
  const usability = evaluation.usability;
  const dimensionScore = usability.dimensions.reduce((sum, dimension) => sum + dimension.score, 0);
  const dimensionMax = usability.dimensions.reduce((sum, dimension) => sum + dimension.max_score, 0);
  if (usability.score !== dimensionScore || usability.max_score !== dimensionMax) {
    issue(errors, 'pe-evaluation-snapshot.json', '/usability', 'derived_usability_mismatch', 'Usability score and max_score must equal the dimension totals.');
  }
}

function validateEvidenceBounds(documents, errors) {
  const evidence = documents['pe-evidence.json'];
  if (!evidence) return;
  const captures = new Map(evidence.captures.map(capture => [capture.id, capture]));
  for (let index = 0; index < evidence.items.length; index += 1) {
    const item = evidence.items[index];
    if (item.kind !== 'region' && item.kind !== 'component') continue;
    const capture = captures.get(item.capture_id);
    if (!capture || !capture.raw_image || !item.crop || !item.image) {
      issue(errors, 'pe-evidence.json', `/items/${index}`, 'crop_without_image_source', 'Cropped evidence requires a capture raw_image, crop, and output image.');
      continue;
    }
    const { crop } = item;
    if (crop.x + crop.width > capture.raw_image.width || crop.y + crop.height > capture.raw_image.height) {
      issue(errors, 'pe-evidence.json', `/items/${index}/crop`, 'crop_out_of_bounds', 'Crop extends outside the source image bounds.');
      continue;
    }
    const left = Math.max(0, crop.x - crop.padding);
    const top = Math.max(0, crop.y - crop.padding);
    const right = Math.min(capture.raw_image.width, crop.x + crop.width + crop.padding);
    const bottom = Math.min(capture.raw_image.height, crop.y + crop.height + crop.padding);
    if (item.image.width !== right - left || item.image.height !== bottom - top) {
      issue(errors, 'pe-evidence.json', `/items/${index}/image`, 'crop_image_dimensions', 'Crop image dimensions must exactly match the padded, viewport-clamped source rectangle.');
    }
  }
}

function validateExecutionIdentity(documents, errors) {
  const state = documents['pe-state.json'];
  if (!state) return;
  const identity = state.identity;
  const expected = `sha256:${crypto.createHash('sha256').update(JSON.stringify({
    intent_key: identity.intent_key,
    build_key: identity.build_key,
    evaluator_key: identity.evaluator_key,
  })).digest('hex')}`;
  if (identity.compound_key !== expected) {
    issue(errors, 'pe-state.json', '/identity/compound_key', 'compound_key_mismatch', 'compound_key must hash intent_key, build_key, and evaluator_key in canonical key order.');
  }
  for (let index = 0; index < state.phases.length; index += 1) {
    const phase = state.phases[index];
    if (Date.parse(phase.ended_at) < Date.parse(phase.started_at)) issue(errors, 'pe-state.json', `/phases/${index}`, 'phase_time_order', 'A phase cannot end before it starts.');
    // Unknown model usage remains null. Only genuinely local phases assert
    // zero tokens/cost; unknown telemetry must never masquerade as free work.
    if (phase.provider === 'none' && (phase.model_invoked || phase.model !== '' || phase.llm_cost_usd !== 0 || phase.token_usage.input !== 0 || phase.token_usage.cached_input !== 0 || phase.token_usage.output !== 0 || phase.token_usage.reasoning_tokens !== 0)) {
      issue(errors, 'pe-state.json', `/phases/${index}`, 'invalid_local_phase_telemetry', 'A local phase must have no model, token use, or LLM cost.');
    }
    if (phase.model_invoked && (phase.provider === 'none' || !phase.model)) issue(errors, 'pe-state.json', `/phases/${index}`, 'missing_model_identity', 'An invoked model requires its actual provider/model.');
  }
}

function validateDocuments(documents) {
  // Stop on schema errors before semantic checks dereference nested fields.
  // Keep summary/evidence/identity checks separate so failures stay attributable.
  const errors = [];
  validateSchemas(documents, errors);
  if (errors.length > 0) return errors;
  validateIdentity(documents, errors);
  validateReferences(documents, errors);
  validateSummaries(documents, errors);
  validateEvidenceBounds(documents, errors);
  validateExecutionIdentity(documents, errors);
  try { require('../consistency/consistency-contract').validateCanonical(documents['pe-evaluation-snapshot.json'].consistency); }
  catch (error) { issue(errors, 'pe-evaluation-snapshot.json', '/consistency/source_analysis', 'source_contract', error.message); }
  errors.push(...require('./split-contract').validateSplit(documents));
  return errors;
}

function validateDirectoryCore(artifactsDir) {
  // Validate persisted workflow/plan/source receipts without recursing through
  // loadRun. The public directory wrapper adds generic linked-file integrity.
  const errors = [];
  let root;
  try { root = require('./linked-artifact-contract').canonicalRoot(artifactsDir); }
  catch (error) {
    issue(errors, '', '', 'unsafe_run_directory', error.message);
    return { root: null, documents: null, errors };
  }
  const documents = loadDocuments(root, errors);
  if (errors.length > 0) return { root, documents: null, errors };
  const validationErrors = validateDocuments(documents);
  if (!validationErrors.length) {
    try { require('../consistency/consistency-contract').validateCanonical(documents['pe-evaluation-snapshot.json'].consistency, root); }
    catch (error) { issue(validationErrors, 'pe-evaluation-snapshot.json', '/consistency/source_analysis', 'source_publication', error.message); }
    try { require('../task-verification/walkthrough-contract').validatePublished(documents, root); }
    catch (error) { issue(validationErrors, 'pe-state.json', '/workflow', 'walkthrough_publication', error.message); }
    try { require('../workflow/evaluation-plan').validatePublished(documents, root); }
    catch (error) { issue(validationErrors, 'pe-state.json', '/planning', 'evaluation_plan', error.message); }
  }
  return { root, documents, errors: validationErrors };
}

function validateDirectory(artifactsDir) {
  const result = validateDirectoryCore(artifactsDir);
  const schemaInvalid = result.errors.some(error => error.code.startsWith('schema_'));
  if (result.documents && !schemaInvalid) {
    result.errors.push(...require('./linked-artifact-contract').verifyLinkedArtifacts(result.root, result.documents));
  }
  return { valid: result.errors.length === 0, errors: result.errors };
}

function main() {
  const args = process.argv.slice(2);
  const jsonMode = args.includes('--json');
  const artifactsDir = args.find(arg => !arg.startsWith('--'));
  if (!artifactsDir) {
    const message = 'Usage: node scripts/artifacts/validate-canonical-artifacts.js <eval-dir> [--json]';
    if (jsonMode) process.stdout.write(`${JSON.stringify({ valid: false, errors: [{ path: '', code: 'usage', message }] })}\n`);
    else process.stderr.write(`${message}\n`);
    process.exitCode = 2;
    return;
  }
  let result;
  try {
    result = validateDirectory(artifactsDir);
  } catch (error) {
    result = { valid: false, errors: [{ path: '', code: 'validator_error', message: error.message }] };
  }
  if (jsonMode) process.stdout.write(`${JSON.stringify(result)}\n`);
  else if (result.valid) process.stdout.write('Canonical artifacts valid.\n');
  else {
    process.stderr.write(`Canonical artifact validation failed (${result.errors.length} error(s)):\n`);
    for (const error of result.errors) process.stderr.write(`- ${error.path} [${error.code}] ${error.message}\n`);
  }
  process.exitCode = result.valid ? 0 : 1;
}

if (require.main === module) main();

module.exports = { validateDirectory, validateDirectoryCore, validateDocuments };
