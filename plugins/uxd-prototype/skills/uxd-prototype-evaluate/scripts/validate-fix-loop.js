#!/usr/bin/env node
/**
 * validate-fix-loop.js
 *
 * Validates fix-log.json schema, iteration sequencing, and cross-references
 * against iteration-log.json for the eval-fix subskill.
 *
 * Usage:
 *   node validate-fix-loop.js <artifacts-dir> [--json]
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
  console.error('Usage: node validate-fix-loop.js <artifacts-dir> [--json]');
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

log('\nfix-log.json:');

const iterLog = readJson('iteration-log.json');
const fixLog = readJson('fix-log.json');
const iterCount = iterLog?.iterations?.length || 0;

if (iterCount > 1 && !fixLog) {
  check('fix-log exists when iterations > 1', false,
    `iteration-log has ${iterCount} iterations but fix-log.json missing`);
} else if (!fixLog) {
  check('fix-log not required', true,
    iterCount <= 1 ? 'single iteration — fix-log not expected' : 'no iteration-log found');
} else {
  check('fix-log exists', true, 'file found');

  const isArray = Array.isArray(fixLog);
  check('fix-log is array', isArray, isArray ? `${fixLog.length} entries` : `got ${typeof fixLog}`);

  if (isArray && fixLog.length > 0) {
    const VALID_ACTIONS = new Set(['fix', 'skip', 'flag']);
    const VALID_RESULTS = new Set(['applied', 'failed', 'skipped', 'regression']);
    const requiredFields = ['iteration', 'ac_id', 'action', 'result'];

    let allFieldsOk = true;
    let allActionsOk = true;
    let allResultsOk = true;

    for (const entry of fixLog) {
      for (const field of requiredFields) {
        if (!(field in entry)) allFieldsOk = false;
      }
      if (entry.action && !VALID_ACTIONS.has(entry.action)) allActionsOk = false;
      if (entry.result && !VALID_RESULTS.has(entry.result)) allResultsOk = false;
    }

    check('fix entries have required fields', allFieldsOk,
      allFieldsOk ? `all ${fixLog.length} have iteration, ac_id, action, result`
        : 'missing required fields');

    check('action values valid', allActionsOk,
      allActionsOk ? 'all fix/skip/flag' : 'invalid action value found');

    check('result values valid', allResultsOk,
      allResultsOk ? 'all applied/failed/skipped/regression' : 'invalid result value found');

    const iterations = fixLog.map(e => e.iteration).filter(Boolean);
    const sorted = [...new Set(iterations)].sort((a, b) => a - b);
    const startsAt1 = sorted.length > 0 && sorted[0] === 1;
    const isSequential = sorted.every((v, i) => i === 0 || v === sorted[i - 1] + 1);

    check('iterations start at 1', startsAt1,
      startsAt1 ? `starts at ${sorted[0]}` : `starts at ${sorted[0] || 'none'}`);

    check('iterations are sequential', isSequential,
      isSequential ? `sequence: ${sorted.join(', ')}` : `gaps in: ${sorted.join(', ')}`);

    if (iterLog && iterLog.iterations) {
      const passAcs = new Set();
      const firstIter = iterLog.iterations[0];
      if (firstIter?.details) {
        for (const [acId, d] of Object.entries(firstIter.details)) {
          if (d.verdict === 'PASS') passAcs.add(acId);
        }
      }
      const fixesOnPass = fixLog.filter(e =>
        e.iteration === 1 && e.action === 'fix' && passAcs.has(e.ac_id));
      check('no fixes target passing ACs', fixesOnPass.length === 0,
        fixesOnPass.length === 0
          ? 'no fix actions on already-passing ACs'
          : `${fixesOnPass.length} fix(es) target passing ACs: ${fixesOnPass.map(f => f.ac_id).join(', ')}`);
    }

    const regressions = fixLog.filter(e => e.result === 'regression');
    if (regressions.length > 0 && iterLog) {
      const hasRegression = iterLog.exit_reason === 'regression' || iterLog.total_regressions > 0;
      check('regression reflected in iteration-log', hasRegression,
        hasRegression
          ? `${regressions.length} regression(s), exit_reason=${iterLog.exit_reason}`
          : `${regressions.length} regression(s) in fix-log but iteration-log doesn't reflect it`);
    }
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
  log(`Fix-loop validation: ${passCount} passed, ${failCount} failed`);
  if (failCount > 0) {
    log('\nFailing checks:');
    for (const r of results.filter(r => !r.pass)) {
      log(`  - ${r.name}: ${r.msg}`);
    }
  }
}

if (failCount > 0) process.exit(1);
