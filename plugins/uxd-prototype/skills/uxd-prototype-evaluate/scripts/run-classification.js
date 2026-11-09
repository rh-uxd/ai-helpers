#!/usr/bin/env node
'use strict';

/**
 * Deterministically classify Jira acceptance criteria for prototype evaluation.
 *
 * Usage: node run-classification.js <artifacts-dir> [--json]
 *
 * All implementation imports are resolved from this script's directory. The
 * caller may run it from any working directory.
 */

const fs = require('fs');
const path = require('path');
const { buildOverrides, BACKEND_KEYWORDS, UI_EVIDENCE_KEYWORDS } = require('./classification/classify-ac-tier');
const { escapeCSVField } = require('./shared/csv-utils');

const SUBJECTIVE_KEYWORDS = [
  'user-friendly', 'user friendly', 'intuitive', 'clear hierarchy',
  'appropriate language', 'natural language', 'easy to understand',
  'readable', 'usable', 'discoverable', 'well received',
];
const DESIGN_REVIEW_KEYWORDS = [
  'design exploration', 'iterated on', 'team feedback', 'technical feasibility',
  'figma file', 'annotations and specifications', 'competitive analysis',
  'designer review', 'stakeholder feedback', 'user research',
];
const EXTERNAL_REFERENCE_KEYWORDS = [
  'align with', 'match ', 'consistent with', 'according to', 'conform to',
  'other product', 'other platform', 'other platforms', 'external design',
];

function readJson(filePath) {
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch (error) {
    throw new Error(`Cannot read valid JSON from ${filePath}: ${error.message}`);
  }
}

function includesAny(text, keywords) {
  return keywords.some(keyword => text.includes(keyword));
}

function classifyCriterion(ac, forcedOverride) {
  // Both runners use these same triage rules, in this order. Each caller
  // should not have to guess how UI, backend and judgment-heavy ACs fit together.
  const text = String(ac.text || ac.criterion_text || '').trim();
  const normalized = text.toLowerCase();
  const references = Array.isArray(ac.references) ? ac.references.filter(Boolean) : [];

  if (forcedOverride) {
    return {
      tier: forcedOverride.forced_tier,
      verdict: '',
      rationale: forcedOverride.reason || forcedOverride.reasoning || 'Confirmed UI surface.',
      humanAction: '',
      reasonCode: 'forced-ui-override',
    };
  }

  if (includesAny(normalized, SUBJECTIVE_KEYWORDS)) {
    return {
      tier: 'T4', verdict: '', rationale: '',
      humanAction: `Review this qualitative criterion: ${text}`,
      reasonCode: 'subjective-design-judgment',
    };
  }

  if (includesAny(normalized, DESIGN_REVIEW_KEYWORDS)) {
    return {
      tier: 'T4', verdict: '', rationale: '',
      humanAction: `Confirm the design-process deliverable outside the prototype: ${text}`,
      reasonCode: 'design-process-evidence',
    };
  }

  if (includesAny(normalized, EXTERNAL_REFERENCE_KEYWORDS) && references.length > 0) {
    return {
      tier: 'T2', verdict: '', rationale: '', humanAction: '',
      reasonCode: 'external-reference-required',
    };
  }

  const hasBackendSignal = includesAny(normalized, BACKEND_KEYWORDS);
  const hasUISignal = includesAny(normalized, UI_EVIDENCE_KEYWORDS);
  if (hasBackendSignal && !hasUISignal) {
    // This old PASS means "backend-only, excluded", not "we checked it".
    // Modern Quick runs keep all classification-only AC verdicts as NOT_RUN.
    return {
      tier: 'T3', verdict: 'PASS',
      rationale: 'Backend-only — no UI component to evaluate. Noted for engineering.',
      humanAction: '', reasonCode: 'backend-only',
    };
  }

  return {
    tier: 'T1', verdict: '', rationale: '', humanAction: '',
    reasonCode: 'prototype-verifiable',
  };
}

function main() {
  const args = process.argv.slice(2);
  const jsonMode = args.includes('--json');
  const artifactsArg = args.find(arg => !arg.startsWith('--'));
  if (!artifactsArg) {
    console.error('Usage: node run-classification.js <artifacts-dir> [--json]');
    process.exit(1);
  }

  const artifactsDir = path.resolve(artifactsArg);
  const extractPath = path.join(artifactsDir, 'extract-state.json');
  const componentMapPath = path.join(artifactsDir, 'component-map.json');
  const overridesPath = path.join(artifactsDir, 'tier-overrides.json');
  const reportPath = path.join(artifactsDir, 'evaluation-report.csv');

  if (!fs.existsSync(extractPath)) throw new Error(`Missing required input: ${extractPath}`);
  const extractState = readJson(extractPath);
  if (!Array.isArray(extractState.ac_list) || extractState.ac_list.length === 0) {
    throw new Error('extract-state.json must contain a non-empty ac_list array');
  }
  const componentMap = fs.existsSync(componentMapPath) ? readJson(componentMapPath) : null;
  const overrides = buildOverrides(extractState, componentMap);
  const overrideById = new Map(overrides.map(item => [item.criterion_id, item]));
  const counts = { T1: 0, T2: 0, T3: 0, T4: 0 };
  const classifications = [];

  const rows = extractState.ac_list.map((ac, index) => {
    const criterionId = ac.criterion_id || ac.id || `AC-${index + 1}`;
    const criterionText = String(ac.text || ac.criterion_text || '').trim();
    if (!criterionText) throw new Error(`${criterionId} has no criterion text`);
    const classification = classifyCriterion(ac, overrideById.get(criterionId));
    counts[classification.tier] += 1;
    classifications.push({ criterion_id: criterionId, ...classification });
    return [
      criterionId,
      ac.source || 'jira',
      classification.tier,
      criterionText,
      classification.verdict,
      classification.rationale,
      '', '', '',
      classification.humanAction,
    ].map(escapeCSVField).join(',');
  });

  const csv = [
    // Running the CLI writes the old CSV format. The runners call
    // classifyCriterion directly and build JSON results without reading CSV.
    '# ACCEPTANCE CRITERIA',
    'criterion_id,source,tier,criterion_text,verdict,rationale,evidence,fix_action,fix_file,human_action',
    ...rows,
    '',
  ].join('\n');
  fs.mkdirSync(artifactsDir, { recursive: true });
  fs.writeFileSync(overridesPath, JSON.stringify(overrides, null, 2) + '\n');
  fs.writeFileSync(reportPath, csv, 'utf8');

  const result = {
    status: 'completed',
    implementation: path.basename(__filename),
    model_invoked: false,
    criteria_count: classifications.length,
    tier_counts: counts,
    overrides_count: overrides.length,
    outputs: { evaluation_report: reportPath, tier_overrides: overridesPath },
    classifications,
  };
  console.log(jsonMode ? JSON.stringify(result) : `Classified ${classifications.length} criteria: ${JSON.stringify(counts)}`);
}

if (require.main === module) {
  try {
    main();
  } catch (error) {
    console.error(error.message);
    process.exit(1);
  }
}

module.exports = { classifyCriterion };
