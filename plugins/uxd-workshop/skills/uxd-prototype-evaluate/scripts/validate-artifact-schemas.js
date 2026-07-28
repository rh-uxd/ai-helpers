#!/usr/bin/env node
/**
 * Validate pipeline artifact schemas before report generation.
 * Catches schema drift between skill outputs and downstream consumers
 * (render-report.js, MLflow scorers, validate-pipeline-output.js).
 *
 * Usage: node validate-artifact-schemas.js .artifacts/<KEY>/
 * Exit code 0 = all pass, 1 = failures found.
 */

const { readFileSync, existsSync } = require('fs');
const { join } = require('path');

const artifactsDir = process.argv[2];
if (!artifactsDir) {
  console.error('Usage: node validate-artifact-schemas.js .artifacts/<KEY>/');
  process.exit(1);
}

function readJson(filename) {
  const p = join(artifactsDir, filename);
  if (!existsSync(p)) return null;
  try { return JSON.parse(readFileSync(p, 'utf8')); } catch { return null; }
}

const results = [];

function check(name, pass, msg) {
  results.push({ name, pass, msg });
  const prefix = pass ? 'PASS' : 'FAIL';
  console.log(`  [${prefix}] ${name}: ${msg}`);
}

// ─── journey-log.json ──────────────────────────────────────────────

const journeyLog = readJson('journey-log.json');

if (journeyLog) {
  console.log('\njourney-log.json:');

  check(
    'persona_selection present',
    !!journeyLog.persona_selection,
    journeyLog.persona_selection ? 'exists' : 'MISSING — eval-discover Step 1c must write this'
  );

  const ud = journeyLog.usability_dimensions;
  if (ud) {
    const dims = ud.dimensions || [];
    for (let i = 0; i < dims.length; i++) {
      const d = dims[i];
      if ('dimension_id' in d && !('id' in d)) {
        check(`dimensions[${i}] uses "id"`, false, `uses "dimension_id" instead of "id"`);
      }
      if (!('name' in d)) {
        check(`dimensions[${i}] has "name"`, false, 'missing "name" field');
      }
      if (!('composite_score' in d)) {
        check(`dimensions[${i}] has "composite_score"`, false, 'missing "composite_score"');
      }
    }
    if (dims.length > 0 && dims.every(d => 'id' in d && 'name' in d && 'composite_score' in d)) {
      check('dimensions schema valid', true, `${dims.length} dimensions with id/name/composite_score`);
    }

    check(
      'overall_score is numeric',
      typeof ud.overall_score === 'number',
      typeof ud.overall_score === 'number'
        ? `overall_score = ${ud.overall_score}`
        : `overall_score is ${typeof ud.overall_score} ("${ud.overall_score}") — should be a number`
    );

    if (ud.max_score) {
      check(
        'max_score is numeric',
        typeof ud.max_score === 'number',
        `max_score = ${ud.max_score}`
      );
    }

    const overlays = ud.persona_overlays || [];
    const missingTaskIndex = overlays.filter(o => !('task_index' in o));
    check(
      'persona_overlays have task_index',
      missingTaskIndex.length === 0,
      missingTaskIndex.length === 0
        ? `${overlays.length} overlays all have task_index`
        : `${missingTaskIndex.length}/${overlays.length} overlays missing task_index`
    );
  }
}

// ─── persona-results.json ──────────────────────────────────────────

const personaResults = readJson('persona-results.json');

if (personaResults && Array.isArray(personaResults)) {
  console.log('\npersona-results.json:');

  const reqKeys = ['persona_id', 'persona_name', 'task_index', 'task', 'trace', 'patience_end', 'abandoned'];
  if (personaResults.length > 0) {
    const pr0 = personaResults[0];
    const missing = reqKeys.filter(k => !(k in pr0));
    check(
      'persona result schema',
      missing.length === 0,
      missing.length === 0 ? 'all required keys present' : `MISSING: ${missing.join(', ')}`
    );

    if ('persona' in pr0 && !('persona_id' in pr0)) {
      check('uses persona_id (not persona)', false, 'has "persona" but not "persona_id"');
    }
  }

  const emptyTraces = personaResults.filter(pr => !Array.isArray(pr.trace) || pr.trace.length === 0);
  check(
    'persona traces non-empty',
    emptyTraces.length === 0,
    emptyTraces.length === 0 ? 'all entries have non-empty trace[]' : `${emptyTraces.length} entries have empty trace[]`
  );
}

// ─── fix-log.json ──────────────────────────────────────────────────

const fixLog = readJson('fix-log.json');

if (fixLog) {
  console.log('\nfix-log.json:');

  check(
    'fix-log is array',
    Array.isArray(fixLog),
    Array.isArray(fixLog) ? `${fixLog.length} entries` : 'not an array — should be flat array of entries'
  );

  if (Array.isArray(fixLog) && fixLog.length > 0) {
    const reqKeys = ['description', 'applied', 'timestamp'];
    const f0 = fixLog[0];
    const missing = reqKeys.filter(k => !(k in f0));
    check(
      'fix-log entry schema',
      missing.length === 0,
      missing.length === 0 ? 'has description/applied/timestamp' : `MISSING: ${missing.join(', ')}`
    );
  }
}

// ─── iteration-log.json ────────────────────────────────────────────

const iterLog = readJson('iteration-log.json');

if (iterLog) {
  console.log('\niteration-log.json:');

  check(
    'exit_reason not pending',
    iterLog.exit_reason && iterLog.exit_reason !== 'pending',
    iterLog.exit_reason ? `exit_reason = ${iterLog.exit_reason}` : 'exit_reason is pending or missing'
  );

  const iterations = iterLog.iterations || [];
  const maxIter = iterLog.max_iterations || 3;

  if (iterLog.exit_reason === 'max_iterations' && iterations.length < maxIter) {
    check(
      'loop integrity',
      false,
      `exit_reason=max_iterations but only ${iterations.length}/${maxIter} iterations ran — loop may have short-circuited`
    );
  } else {
    check('loop integrity', true, `${iterations.length} iterations ran, exit_reason=${iterLog.exit_reason}`);
  }

  if (fixLog && Array.isArray(fixLog)) {
    const appliedFixes = fixLog.filter(f => f.applied === true || f.action === 'applied');
    if (appliedFixes.length > 0 && iterations.length === 1) {
      check(
        'fixes re-verified',
        false,
        `${appliedFixes.length} fixes applied but only 1 iteration — fixes were never re-verified`
      );
    } else if (appliedFixes.length > 0) {
      check('fixes re-verified', true, `${appliedFixes.length} fixes applied, ${iterations.length} iterations ran`);
    }
  }
}

// ─── Summary ───────────────────────────────────────────────────────

const passCount = results.filter(r => r.pass).length;
const failCount = results.filter(r => !r.pass).length;

console.log(`\n${'─'.repeat(50)}`);
console.log(`Schema validation: ${passCount} passed, ${failCount} failed`);

if (failCount > 0) {
  console.log('\nFailing checks:');
  for (const r of results.filter(r => !r.pass)) {
    console.log(`  - ${r.name}: ${r.msg}`);
  }
  process.exit(1);
}
