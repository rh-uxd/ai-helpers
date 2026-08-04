#!/usr/bin/env node
/**
 * Validate pipeline artifact schemas before report generation.
 * Catches schema drift between skill outputs and downstream consumers
 * (render-report.js, MLflow scorers, validate-pipeline-output.js).
 *
 * Usage: node validate-artifact-schemas.js .artifacts/<KEY>/
 * Exit code 0 = all pass, 1 = failures found.
 */

const { readFileSync, existsSync, readdirSync } = require('fs');
const { join, resolve } = require('path');

const artifactsDir = process.argv[2];
if (!artifactsDir) {
  console.error('Usage: node validate-artifact-schemas.js .artifacts/<KEY>/');
  process.exit(1);
}

const abs = resolve(artifactsDir);

function readJson(filename) {
  const p = join(abs, filename);
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

  check('depth present', !!journeyLog.depth, journeyLog.depth ? `depth = ${journeyLog.depth}` : 'MISSING — add "depth": "deep"');
  check('prototype_url present', !!journeyLog.prototype_url, journeyLog.prototype_url ? 'exists' : 'MISSING');
  check('evaluated_at present', !!journeyLog.evaluated_at, journeyLog.evaluated_at ? 'exists' : 'MISSING');
  check('persona_selection present', !!journeyLog.persona_selection,
    journeyLog.persona_selection ? 'exists' : 'MISSING — eval-usability Step 1c must write this');

  if (Array.isArray(journeyLog.journeys)) {
    for (const j of journeyLog.journeys) {
      const jid = j.id || '?';
      check(`journey "${jid}" id format`, j.id && /^journey-\d+$/.test(j.id), j.id || 'missing');
      check(`journey "${jid}" fields`, !!(j.persona && j.source && j.steps_expected != null && j.steps_completed != null),
        [!j.persona && 'persona', !j.source && 'source', j.steps_expected == null && 'steps_expected', j.steps_completed == null && 'steps_completed'].filter(Boolean).join(', ') || 'all present');

      if (Array.isArray(j.steps)) {
        for (const s of j.steps) {
          if (s.result !== 'success' && s.result !== 'fail') {
            check(`journey "${jid}" step ${s.step} result`, false, `"result" must be "success" or "fail", got "${s.result}"`);
          }
          if (!s.narration) {
            check(`journey "${jid}" step ${s.step} narration`, false, 'missing "narration"');
          }
          if (s.screenshot && s.screenshot.startsWith('/')) {
            check(`journey "${jid}" step ${s.step} screenshot path`, false, 'path is absolute — use relative');
          }
        }
      }
    }
  }

  const ud = journeyLog.usability_dimensions;
  if (ud) {
    const dims = ud.dimensions || [];
    for (let i = 0; i < dims.length; i++) {
      const d = dims[i];
      if ('dimension_id' in d && !('id' in d)) {
        check(`dimensions[${i}] uses "id"`, false, 'uses "dimension_id" instead of "id"');
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

    check('overall_score is numeric', typeof ud.overall_score === 'number',
      typeof ud.overall_score === 'number'
        ? `overall_score = ${ud.overall_score}`
        : `overall_score is ${typeof ud.overall_score} ("${ud.overall_score}") — should be a number`);

    if (ud.max_score != null) {
      check('max_score is numeric', typeof ud.max_score === 'number', `max_score = ${ud.max_score}`);
    }

    check('personas_evaluated present',
      Array.isArray(ud.personas_evaluated) && ud.personas_evaluated.length > 0,
      Array.isArray(ud.personas_evaluated) ? `${ud.personas_evaluated.length} personas` : 'MISSING or empty');

    check('persona_overlays is array', Array.isArray(ud.persona_overlays),
      Array.isArray(ud.persona_overlays) ? `${ud.persona_overlays.length} overlays` : 'MISSING or not an array');

    const overlays = ud.persona_overlays || [];
    const missingTaskIndex = overlays.filter(o => !('task_index' in o));
    if (overlays.length > 0) {
      check('persona_overlays have task_index', missingTaskIndex.length === 0,
        missingTaskIndex.length === 0
          ? `${overlays.length} overlays all have task_index`
          : `${missingTaskIndex.length}/${overlays.length} overlays missing task_index`);
    }

    if (ud.think_aloud && Array.isArray(ud.think_aloud.traces)) {
      for (const t of ud.think_aloud.traces) {
        if (t.dimension_scores) {
          for (const [key, val] of Object.entries(t.dimension_scores)) {
            if (typeof val !== 'object' || val === null || val.score == null) {
              check(`trace ${t.persona} dimension_scores.${key}`, false,
                `must be {score, confidence}, got ${typeof val}`);
            }
          }
        }
      }
    }
  }
} else {
  console.log('journey-log.json: not found (skipping)');
}

// ─── persona-results.json ──────────────────────────────────────────

const personaResults = readJson('persona-results.json');

if (personaResults) {
  console.log('\npersona-results.json:');

  check('is array', Array.isArray(personaResults),
    Array.isArray(personaResults) ? `${personaResults.length} entries` : 'not an array — wrap as [{ persona_id, task_index, trace, ... }]');

  if (Array.isArray(personaResults) && personaResults.length > 0) {
    const pr0 = personaResults[0];
    const reqKeys = ['persona_id', 'persona_name', 'task_index', 'task', 'trace', 'patience_end', 'abandoned'];
    const missing = reqKeys.filter(k => !(k in pr0));
    check('persona result schema', missing.length === 0,
      missing.length === 0 ? 'all required keys present' : `MISSING: ${missing.join(', ')}`);

    if ('persona' in pr0 && !('persona_id' in pr0)) {
      check('uses persona_id (not persona)', false, 'has "persona" but not "persona_id"');
    }

    const emptyTraces = personaResults.filter(pr => !Array.isArray(pr.trace) || pr.trace.length === 0);
    check('persona traces non-empty', emptyTraces.length === 0,
      emptyTraces.length === 0 ? 'all entries have non-empty trace[]' : `${emptyTraces.length} entries have empty trace[]`);

    check('screenshots arrays present',
      personaResults.every(pr => Array.isArray(pr.screenshots)),
      personaResults.every(pr => Array.isArray(pr.screenshots)) ? 'all entries have screenshots[]' : 'some entries missing screenshots[]');

    const firstTrace = personaResults[0].trace || [];
    if (firstTrace.length > 0) {
      const t = firstTrace[0];
      const traceFields = ['what_i_see', 'what_im_thinking'].filter(k => !(k in t));
      if (traceFields.length > 0) {
        check('trace step fields', false, `MISSING: ${traceFields.join(', ')}`);
      }
    }
  }
} else {
  console.log('persona-results.json: not found (skipping)');
}

// ─── fix-log.json ──────────────────────────────────────────────────

const fixLog = readJson('fix-log.json');

if (fixLog) {
  console.log('\nfix-log.json:');

  check('fix-log is array', Array.isArray(fixLog),
    Array.isArray(fixLog) ? `${fixLog.length} entries` : 'not an array — should be flat array of entries');

  if (Array.isArray(fixLog) && fixLog.length > 0) {
    const reqKeys = ['description', 'applied', 'timestamp'];
    const f0 = fixLog[0];
    const missing = reqKeys.filter(k => !(k in f0));
    check('fix-log entry schema', missing.length === 0,
      missing.length === 0 ? 'has description/applied/timestamp' : `MISSING: ${missing.join(', ')}`);
  }
}

// ─── iteration-log.json ────────────────────────────────────────────

const iterLog = readJson('iteration-log.json');

if (iterLog) {
  console.log('\niteration-log.json:');

  check('exit_reason not pending', iterLog.exit_reason && iterLog.exit_reason !== 'pending',
    iterLog.exit_reason ? `exit_reason = ${iterLog.exit_reason}` : 'exit_reason is pending or missing');

  const iterations = iterLog.iterations || [];
  const maxIter = iterLog.max_iterations || 3;

  if (iterLog.exit_reason === 'max_iterations' && iterations.length < maxIter) {
    check('loop integrity', false,
      `exit_reason=max_iterations but only ${iterations.length}/${maxIter} iterations ran — loop may have short-circuited`);
  } else {
    check('loop integrity', true, `${iterations.length} iterations ran, exit_reason=${iterLog.exit_reason}`);
  }

  if (fixLog && Array.isArray(fixLog)) {
    const appliedFixes = fixLog.filter(f => f.applied === true || f.action === 'applied');
    if (appliedFixes.length > 0 && iterations.length === 1) {
      check('fixes re-verified', false,
        `${appliedFixes.length} fixes applied but only 1 iteration — fixes were never re-verified`);
    } else if (appliedFixes.length > 0) {
      check('fixes re-verified', true, `${appliedFixes.length} fixes applied, ${iterations.length} iterations ran`);
    }
  }
}

// ─── consistency-report.json ───────────────────────────────────────

const consistencyReport = readJson('consistency-report.json');

if (consistencyReport) {
  console.log('\nconsistency-report.json:');
  if (!consistencyReport.skipped) {
    check('source_mode present', consistencyReport.source_mode != null, consistencyReport.source_mode ? 'exists' : 'MISSING');
    check('visual_mode present', consistencyReport.visual_mode != null, consistencyReport.visual_mode ? 'exists' : 'MISSING');
    check('summary present', consistencyReport.summary != null, consistencyReport.summary ? 'exists' : 'MISSING');
  } else {
    check('skipped (ok)', true, 'consistency was skipped');
  }
}

// ─── extract-state.json ───────────────────────────────────────────

const extractState = readJson('extract-state.json');

if (extractState) {
  console.log('\nextract-state.json:');
  check('key present', !!extractState.key, extractState.key || 'MISSING');
  check('title present', !!extractState.title, extractState.title ? 'exists' : 'MISSING');
  check('ac_list non-empty', Array.isArray(extractState.ac_list) && extractState.ac_list.length > 0,
    Array.isArray(extractState.ac_list) ? `${extractState.ac_list.length} ACs` : 'MISSING or empty');
  if (!extractState.feature_context) {
    console.log('  [WARN] feature_context missing (non-fatal)');
  }
}

// ─── component-map.json ───────────────────────────────────────────

const componentMap = readJson('component-map.json');

if (componentMap) {
  console.log('\ncomponent-map.json:');
  check('target_page present', !!componentMap.target_page, componentMap.target_page || 'MISSING');
  check('table_columns present', !!componentMap.table_columns, componentMap.table_columns ? 'exists' : 'MISSING');
  check('ac_column_mapping present', !!componentMap.ac_column_mapping, componentMap.ac_column_mapping ? 'exists' : 'MISSING');
}

// ─── navigation-hints.json ────────────────────────────────────────

const navHints = readJson('navigation-hints.json');

if (navHints) {
  console.log('\nnavigation-hints.json:');
  check('routes present', !!(navHints.routes && (Array.isArray(navHints.routes) || typeof navHints.routes === 'object')),
    navHints.routes ? 'exists' : 'MISSING');
  check('nav_sections present', !!(navHints.nav_sections && (Array.isArray(navHints.nav_sections) || typeof navHints.nav_sections === 'object')),
    navHints.nav_sections ? 'exists' : 'MISSING');
}

// ─── screenshots/ directory ───────────────────────────────────────

const ssDir = join(abs, 'screenshots');
if (existsSync(ssDir)) {
  console.log('\nscreenshots/:');
  const files = readdirSync(ssDir).filter(f => f.endsWith('.png'));
  check('screenshots exist', files.length > 0, files.length > 0 ? `${files.length} .png files` : 'directory is empty');
  const journeyShots = files.filter(f => f.startsWith('journey-'));
  const personaShots = files.filter(f => f.startsWith('persona-'));
  console.log(`  ${journeyShots.length} journey + ${personaShots.length} persona screenshots`);
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
