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

  const hasSource = typeof report.source === 'string' && report.source.length > 0;
  check('source field present', hasSource,
    hasSource ? `source = "${report.source}"` : 'missing or empty source');

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
    if (Array.isArray(violations) && violations.length > 0) {
      const violationFields = ['file', 'line', 'property', 'value', 'suggestion'];
      let allFieldsOk = true;
      for (const v of violations) {
        for (const f of violationFields) {
          if (!(f in v)) allFieldsOk = false;
        }
      }
      check('violation entries have required fields', allFieldsOk,
        allFieldsOk
          ? `all ${violations.length} have file, line, property, value, suggestion`
          : 'missing violation fields');
    }
  } else {
    check('source_mode present', false, 'missing source_mode block');
  }

  if (report.visual_mode) {
    const ranBool = typeof report.visual_mode.ran === 'boolean';
    check('visual_mode.ran is boolean', ranBool,
      ranBool ? `ran = ${report.visual_mode.ran}` : `got ${typeof report.visual_mode.ran}`);
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
