#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');

const artifactsDir = process.argv[2];
if (!artifactsDir) {
  console.error('Usage: node validate-verdicts.js <artifacts-dir>');
  process.exit(1);
}

const absDir = path.resolve(artifactsDir);
const journeyPath = path.join(absDir, 'journey-log.json');
const csvPath = path.join(absDir, 'evaluation-report.csv');

if (!fs.existsSync(journeyPath)) {
  console.error(`journey-log.json not found at ${journeyPath}`);
  process.exit(1);
}
if (!fs.existsSync(csvPath)) {
  console.error(`evaluation-report.csv not found at ${csvPath}`);
  process.exit(1);
}

function parseCSVLine(line) {
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

const journeyLog = JSON.parse(fs.readFileSync(journeyPath, 'utf8'));
const csvRaw = fs.readFileSync(csvPath, 'utf8');

const csvLines = csvRaw.split('\n').filter(l => l && !l.startsWith('#'));
if (csvLines.length < 2) {
  console.error('CSV has no data rows');
  process.exit(1);
}

const headers = parseCSVLine(csvLines[0]);
const idIdx = headers.indexOf('criterion_id');
const verdictIdx = headers.indexOf('verdict');

if (idIdx < 0 || verdictIdx < 0) {
  console.error('CSV missing criterion_id or verdict columns');
  process.exit(1);
}

const csvVerdicts = {};
for (let i = 1; i < csvLines.length; i++) {
  const vals = parseCSVLine(csvLines[i]);
  if (vals[idIdx]) {
    csvVerdicts[vals[idIdx]] = vals[verdictIdx] || '';
  }
}

const journeys = journeyLog.journeys || [];
const violations = [];

for (const journey of journeys) {
  if (journey.verdict !== 'FAIL') continue;

  const acIds = journey.ac_ids || [];
  for (const acId of acIds) {
    const csvVerdict = csvVerdicts[acId];
    if (csvVerdict === 'PASS') {
      violations.push({
        ac_id: acId,
        journey_id: journey.id,
        journey_title: journey.title || '',
        journey_verdict: 'FAIL',
        csv_verdict: 'PASS',
        issue: 'Journey FAIL contradicts CSV PASS — CSV must be FAIL or FLAGGED'
      });
    }
  }
}

if (violations.length === 0) {
  console.log('Verdict cross-check: 0 violations. Journey verdicts align with CSV.');
  process.exit(0);
} else {
  console.error(`Verdict cross-check: ${violations.length} violation(s) found:`);
  for (const v of violations) {
    console.error(`  ${v.ac_id}: journey "${v.journey_id}" = FAIL, but CSV = PASS`);
  }
  console.log(JSON.stringify(violations, null, 2));
  process.exit(1);
}
