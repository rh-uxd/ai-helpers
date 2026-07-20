#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const { resolveProjectRoot } = require('./resolve-root');

const projectRoot = resolveProjectRoot();
const logPath = path.join(projectRoot, '.artifacts', 'runs', 'run-log.csv');

if (!fs.existsSync(logPath)) {
  console.error('No run log found at', logPath);
  console.error('Run an eval first with: node ${CLAUDE_SKILL_DIR}/scripts/log-run.js .artifacts/<KEY>/');
  process.exit(1);
}

const args = process.argv.slice(2);
let protoFilter = null;
let run1Id = null, run2Id = null;

for (const arg of args) {
  if (arg.startsWith('--run1=')) run1Id = arg.slice(7);
  else if (arg.startsWith('--run2=')) run2Id = arg.slice(7);
  else if (!arg.startsWith('--')) protoFilter = arg;
}

function parseCsvLine(line) {
  const result = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"' && i + 1 < line.length && line[i + 1] === '"') { current += '"'; i++; }
      else if (ch === '"') inQuotes = false;
      else current += ch;
    } else {
      if (ch === '"') inQuotes = true;
      else if (ch === ',') { result.push(current); current = ''; }
      else current += ch;
    }
  }
  result.push(current);
  return result;
}

const raw = fs.readFileSync(logPath, 'utf8').trim();
const lines = raw.split('\n');
if (lines.length < 2) {
  console.error('Run log has no data rows yet.');
  process.exit(1);
}

const headers = parseCsvLine(lines[0]);
const rows = lines.slice(1).map(line => {
  const vals = parseCsvLine(line);
  const obj = {};
  headers.forEach((h, i) => { obj[h] = vals[i] || ''; });
  return obj;
});

// Filter by prototype if specified
let filtered = protoFilter ? rows.filter(r => r.prototype_id === protoFilter) : rows;

if (filtered.length === 0) {
  console.error(`No runs found${protoFilter ? ` for ${protoFilter}` : ''}.`);
  if (!protoFilter) {
    const protos = [...new Set(rows.map(r => r.prototype_id))];
    console.error('Available prototypes:', protos.join(', '));
  }
  process.exit(1);
}

// Select runs to compare
let r1, r2;
if (run1Id && run2Id) {
  r1 = filtered.find(r => r.run_id.startsWith(run1Id));
  r2 = filtered.find(r => r.run_id.startsWith(run2Id));
  if (!r1 || !r2) {
    console.error('Could not find specified run IDs.');
    process.exit(1);
  }
} else {
  if (filtered.length < 2) {
    console.log('Only one run found — nothing to compare yet.\n');
    printRun(filtered[0]);
    process.exit(0);
  }
  r1 = filtered[filtered.length - 2];
  r2 = filtered[filtered.length - 1];
}

function printRun(r) {
  console.log(`  ${r.run_id} (v: ${r.skill_version})`);
  console.log(`    ${r.pass} PASS, ${r.fail} FAIL, ${r.flagged} FLAGGED | ${r.journeys_pass}/${r.journeys_total} journeys | ${r.usability_score} usability`);
  console.log(`    Depth: ${r.depth} | Usability: ${r.usability_flag} | Nav fails: ${r.nav_failures} | MR delta: ${r.mr_delta_available}`);
  if (r.notes) console.log(`    Note: ${r.notes}`);
}

function delta(a, b) {
  const d = parseInt(b) - parseInt(a);
  if (isNaN(d)) return '—';
  if (d > 0) return `+${d}`;
  if (d < 0) return `${d}`;
  return '0';
}

console.log(`\nComparing ${r1.prototype_id || 'runs'}:`);
console.log(`\n  Run 1 (older):`);
printRun(r1);
console.log(`\n  Run 2 (newer):`);
printRun(r2);

console.log(`\nDelta:`);
console.log(`  PASS:      ${r1.pass} → ${r2.pass} (${delta(r1.pass, r2.pass)})`);
console.log(`  FAIL:      ${r1.fail} → ${r2.fail} (${delta(r1.fail, r2.fail)})`);
console.log(`  FLAGGED:   ${r1.flagged} → ${r2.flagged} (${delta(r1.flagged, r2.flagged)})`);
console.log(`  Journeys:  ${r1.journeys_pass}/${r1.journeys_total} → ${r2.journeys_pass}/${r2.journeys_total}`);
console.log(`  Usability: ${r1.usability_score} → ${r2.usability_score}`);
console.log(`  Nav fails: ${r1.nav_failures} → ${r2.nav_failures} (${delta(r1.nav_failures, r2.nav_failures)})`);

if (r1.skill_version !== r2.skill_version) {
  console.log(`\n  Skill version changed: ${r1.skill_version} → ${r2.skill_version}`);
  console.log(`    ${r1.skill_version}: ${r1.commit}`);
  console.log(`    ${r2.skill_version}: ${r2.commit}`);
}

if (r1.mr_delta_available !== r2.mr_delta_available) {
  console.log(`\n  MR delta: ${r1.mr_delta_available} → ${r2.mr_delta_available}`);
}

// Try to do per-AC comparison if archived CSVs exist
const runsBase = path.join(projectRoot, '.artifacts', 'runs');
const csv1Path = path.join(runsBase, r1.prototype_id, r1.run_id, 'evaluation-report.csv');
const csv2Path = path.join(runsBase, r2.prototype_id, r2.run_id, 'evaluation-report.csv');

if (fs.existsSync(csv1Path) && fs.existsSync(csv2Path)) {
  const csv1 = fs.readFileSync(csv1Path, 'utf8').trim().split('\n').slice(1);
  const csv2 = fs.readFileSync(csv2Path, 'utf8').trim().split('\n').slice(1);

  const verdicts1 = {};
  const verdicts2 = {};

  for (const line of csv1) {
    const parts = parseCsvLine(line);
    const id = parts[3]; // criterion_id
    const verdict = parts[6]; // verdict
    if (id) verdicts1[id] = verdict;
  }
  for (const line of csv2) {
    const parts = parseCsvLine(line);
    const id = parts[3];
    const verdict = parts[6];
    if (id) verdicts2[id] = verdict;
  }

  const allIds = [...new Set([...Object.keys(verdicts1), ...Object.keys(verdicts2)])].sort();
  const changes = [];
  for (const id of allIds) {
    const v1 = verdicts1[id] || '(absent)';
    const v2 = verdicts2[id] || '(absent)';
    if (v1 !== v2) changes.push({ id, from: v1, to: v2 });
  }

  if (changes.length > 0) {
    console.log('\nVerdict changes:');
    for (const c of changes) {
      console.log(`  ${c.id}: ${c.from} → ${c.to}`);
    }
  } else {
    console.log('\nNo per-criterion verdict changes between runs.');
  }
} else {
  console.log('\n(Archived CSVs not available for per-criterion comparison)');
}

console.log('');
