#!/usr/bin/env node
/**
 * validate-consistency.js
 *
 * Validates consistency-report.json schema, summary math, and violation
 * field structure for the eval-consistency subskill.
 *
 * Usage:
 *   node validate-consistency.js <artifacts-dir> [--json]
 *
 * Exit codes:
 *   0 = all checks pass
 *   1 = one or more checks failed
 */

const { readFileSync, existsSync } = require('fs');
const { join, resolve } = require('path');

const jsonMode = process.argv.includes('--json');
const artifactsDir = process.argv.filter(a => a !== '--json')[2];
if (!artifactsDir) {
  console.error('Usage: node validate-consistency.js <artifacts-dir> [--json]');
  process.exit(1);
}

const abs = resolve(artifactsDir);
const results = [];

function log(...args) { if (!jsonMode) console.log(...args); }

function check(name, pass, msg) {
  results.push({ name, pass, msg });
  if (!jsonMode) {
    const prefix = pass ? 'PASS' : 'FAIL';
    console.log(`  [${prefix}] ${name}: ${msg}`);
  }
}

function readJson(filename) {
  const p = join(abs, filename);
  if (!existsSync(p)) return null;
  try { return JSON.parse(readFileSync(p, 'utf8')); } catch { return null; }
}

log('\nconsistency-report.json:');

const report = readJson('consistency-report.json');

if (!report) {
  check('consistency-report exists', false, 'file not found or invalid JSON');
} else {
  check('consistency-report exists', true, 'file found');

  // Legacy names come from the upstream fixture and eval-consistency producer docs.
  const isLegacy = ['pf-css-token-check', 'pf-css-token-check-fallback', 'consistency-checker'].includes(report.source);
  const hasSource = report.source === 'uxd-consistency-check' || isLegacy;
  const hasModernFields = ['schema_version', 'coverage', 'guideline_context', 'internal_consistency', 'guideline_consistency', 'guideline_manifest', 'evaluator_publication'].some(key => Object.hasOwn(report, key));
  if (hasModernFields || report.source_analysis) {
    try {
      const publicationRoot = require('path').basename(abs) === 'checks' ? resolve(abs, '..') : abs;
      if (hasModernFields) require('./consistency-contract').validatePublication(report, publicationRoot);
      if (report.source_analysis) require('./consistency-contract').validatePublication(report.source_analysis, publicationRoot);
      check('frozen source report contract and durable references', true, 'coverage, membership, candidates, manifest provenance and readback verified');
    } catch (error) { check('frozen source report contract and durable references', false, error.message); }
  }
  check('source field present', hasSource,
    hasSource ? `source = "${report.source}"` : `unrecognized consistency producer: "${report.source}"`);

  if (!isLegacy) {
    const hasVersion = typeof report.guidelines_version === 'string' && report.guidelines_version.length > 0;
    check('guidelines_version present', hasVersion,
      hasVersion ? report.guidelines_version : 'missing or empty guidelines_version');
  }

  const hasDegraded = typeof report.degraded === 'boolean';
  check('degraded is boolean', hasDegraded,
    hasDegraded ? `degraded = ${report.degraded}` : `got ${typeof report.degraded}`);

  if (report.checked_at) {
    const d = new Date(report.checked_at);
    const validDate = !isNaN(d.getTime());
    check('checked_at is valid ISO 8601', validDate,
      validDate ? report.checked_at : `invalid: "${report.checked_at}"`);
  } else {
    check('checked_at present', false, 'missing');
  }

  if (report.source_mode) {
    const ranBool = typeof report.source_mode.ran === 'boolean';
    check('source_mode.ran is boolean', ranBool,
      ranBool ? `ran = ${report.source_mode.ran}` : `got ${typeof report.source_mode.ran}`);

    const violations = report.source_mode.violations;
    const violationsArray = Array.isArray(violations);
    check('source_mode.violations is an array', violationsArray,
      violationsArray ? `${violations.length} finding(s)` : `got ${typeof violations}`);
    if (violationsArray && violations.length > 0) {
      const violationFields = isLegacy ? ['file', 'line', 'property', 'value', 'suggestion'] : [
        'guideline_id', 'guideline_title', 'category', 'severity', 'verdict',
        'confidence', 'review_candidate', 'file', 'line', 'property', 'value',
        'description', 'suggestion', 'check_method',
      ];
      let allFieldsOk = true;
      for (const v of violations) {
        for (const f of violationFields) {
          if (!(f in v)) allFieldsOk = false;
        }
      }
      check('violation entries have required fields', allFieldsOk,
        allFieldsOk
          ? `all ${violations.length} satisfy the checker finding contract`
          : 'missing violation fields');

      if (!isLegacy) {
        const allowedValuesOk = violations.every(v =>
          ['error', 'warning'].includes(v.severity)
          && ['VIOLATION', 'FLAGGED'].includes(v.verdict)
          && ['high', 'medium', 'low'].includes(v.confidence)
          && typeof v.review_candidate === 'boolean'
          && (Number.isInteger(v.line) || v.line === null)
        );
        check('violation values use supported enums and types', allowedValuesOk,
          allowedValuesOk ? 'severity, verdict, confidence, review_candidate, and line are valid' : 'unsupported enum or field type');

        const candidateSemanticsOk = violations.every(v => !v.review_candidate || (
          v.verdict === 'FLAGGED'
          && v.severity === 'warning'
          && v.confidence === 'low'
          && v.check_method === 'automated_candidate'
        ));
        check('review candidates cannot enter automatic fixes', candidateSemanticsOk,
          candidateSemanticsOk ? 'all review candidates are low-confidence FLAGGED warnings' : 'candidate has blocking or high-confidence semantics');
      }
    }
  } else {
    check('source_mode present', false, 'missing source_mode block');
  }

  if (report.visual_mode) {
    const ranBool = typeof report.visual_mode.ran === 'boolean';
    check('visual_mode.ran is boolean', ranBool,
      ranBool ? `ran = ${report.visual_mode.ran}` : `got ${typeof report.visual_mode.ran}`);
    if (report.visual_mode.input_metrics) {
      const m = report.visual_mode.input_metrics;
      const fields = ['screenshots_considered', 'screenshots_analyzed', 'guidelines_analyzed', 'input_bytes'];
      const validMetrics = fields.every(f => Number.isInteger(m[f]) && m[f] >= 0)
        && m.screenshots_analyzed <= m.screenshots_considered
        && report.visual_mode.screenshots_checked === m.screenshots_analyzed;
      check('visual input metrics are bounded and consistent', validMetrics,
        validMetrics
          ? `${m.screenshots_analyzed}/${m.screenshots_considered} screenshots, ${m.guidelines_analyzed} guidelines, ${m.input_bytes} bytes`
          : 'metrics must be non-negative integers and match screenshots_checked');
    }
  } else {
    check('visual_mode present', false, 'missing visual_mode block');
  }

  if (report.summary) {
    const s = report.summary;
    const fields = ['total_guidelines_checked', 'violations', 'warnings', 'passes'];
    const allInts = fields.every(f => Number.isInteger(s[f]));
    check('summary fields are integers', allInts,
      allInts ? fields.map(f => `${f}=${s[f]}`).join(', ')
        : `non-integer values in: ${fields.filter(f => !Number.isInteger(s[f])).join(', ')}`);

    if (allInts) {
      const sum = s.violations + s.warnings + s.passes;
      const matches = sum === s.total_guidelines_checked;
      check('summary math correct', matches,
        matches
          ? `${s.violations} + ${s.warnings} + ${s.passes} = ${s.total_guidelines_checked}`
          : `${s.violations} + ${s.warnings} + ${s.passes} = ${sum}, expected ${s.total_guidelines_checked}`);

      const sourceFindings = Array.isArray(report.source_mode?.violations)
        ? report.source_mode.violations : [];
      const visualFindings = Array.isArray(report.visual_mode?.findings)
        ? report.visual_mode.findings : [];
      // Only the bundled producer defines summary counts as unique guideline groups.
      if (!isLegacy && visualFindings.length === 0 && sourceFindings.every(v => v.guideline_id && v.severity)) {
        const errorGroups = new Set(sourceFindings.filter(v => v.severity === 'error').map(v => v.guideline_id)).size;
        const errorIds = new Set(sourceFindings.filter(v => v.severity === 'error').map(v => v.guideline_id));
        const warningGroups = new Set(sourceFindings.filter(v => v.severity === 'warning' && !errorIds.has(v.guideline_id)).map(v => v.guideline_id)).size;
        const groupMath = errorGroups === s.violations && warningGroups === s.warnings;
        check('summary finding groups correct', groupMath,
          groupMath
            ? `${errorGroups} violation group(s), ${warningGroups} warning group(s)`
            : `findings imply ${errorGroups} violation and ${warningGroups} warning groups`);
      }
    }
  } else {
    check('summary present', false, 'missing summary block');
  }
}

const passCount = results.filter(r => r.pass).length;
const failCount = results.filter(r => !r.pass).length;

if (jsonMode) {
  console.log(JSON.stringify({
    results: results.map(r => ({ scorer: r.name, pass: r.pass, detail: r.msg })),
    pass_count: passCount,
    fail_count: failCount,
    all_pass: failCount === 0,
  }, null, 2));
} else {
  log(`\n${'─'.repeat(50)}`);
  log(`Consistency validation: ${passCount} passed, ${failCount} failed`);
  if (failCount > 0) {
    log('\nFailing checks:');
    for (const r of results.filter(r => !r.pass)) {
      log(`  - ${r.name}: ${r.msg}`);
    }
  }
}

if (failCount > 0) process.exit(1);
