#!/usr/bin/env node
/**
 * validate-classify.js
 *
 * Validates tier-overrides.json schema and cross-references against
 * extract-state.json AC list for the eval-classify subskill.
 *
 * Usage:
 *   node validate-classify.js <artifacts-dir> [--json]
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
  console.error('Usage: node validate-classify.js <artifacts-dir> [--json]');
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

log('\ntier-overrides.json:');

const overrides = readJson('tier-overrides.json');

if (!overrides) {
  check('tier-overrides exists', false, 'file not found or invalid JSON');
} else {
  check('tier-overrides exists', true, 'file found');

  const entries = overrides.overrides || overrides;
  const isArray = Array.isArray(entries);
  check('overrides is array', isArray, isArray ? `${entries.length} entries` : `got ${typeof entries}`);

  if (isArray && entries.length > 0) {
    const VALID_TIERS = new Set(['T1', 'T2', 'T3']);
    let allFieldsOk = true;
    let allTiersOk = true;
    const seenIds = new Set();
    let hasDupes = false;

    const getId = (e) => e.ac_id || e.criterion_id;
    const getReason = (e) => e.reasoning || e.reason;

    for (const entry of entries) {
      if (!getId(entry)) allFieldsOk = false;
      if (!('forced_tier' in entry)) allFieldsOk = false;
      if (!getReason(entry)) allFieldsOk = false;
      if (entry.forced_tier && !VALID_TIERS.has(entry.forced_tier)) allTiersOk = false;
      const id = getId(entry);
      if (id) {
        if (seenIds.has(id)) hasDupes = true;
        seenIds.add(id);
      }
    }

    check('override entries have required fields', allFieldsOk,
      allFieldsOk ? `all ${entries.length} have id, forced_tier, reasoning`
        : 'missing fields detected');

    check('forced_tier values valid', allTiersOk,
      allTiersOk ? 'all T1/T2/T3' : 'invalid tier value found');

    check('no duplicate ac_id entries', !hasDupes,
      hasDupes ? 'duplicate ac_id found' : `${seenIds.size} unique IDs`);

    const extractState = readJson('extract-state.json');
    if (extractState && extractState.ac_list) {
      const acIds = new Set(extractState.ac_list.map(ac => ac.id || ac.criterion_id));
      const orphans = entries.filter(e => {
        const id = getId(e);
        return id && !acIds.has(id);
      });
      check('overrides reference valid ACs', orphans.length === 0,
        orphans.length === 0
          ? `all ${entries.length} override ACs exist in ac_list`
          : `${orphans.length} orphan(s): ${orphans.map(o => getId(o)).join(', ')}`);

      check('override count within bounds', entries.length <= acIds.size,
        entries.length <= acIds.size
          ? `${entries.length} overrides for ${acIds.size} ACs`
          : `${entries.length} overrides exceeds ${acIds.size} total ACs`);
    } else {
      log('  [SKIP] extract-state.json not found — skipping cross-reference checks');
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
  log(`Classify validation: ${passCount} passed, ${failCount} failed`);
  if (failCount > 0) {
    log('\nFailing checks:');
    for (const r of results.filter(r => !r.pass)) {
      log(`  - ${r.name}: ${r.msg}`);
    }
  }
}

if (failCount > 0) process.exit(1);
