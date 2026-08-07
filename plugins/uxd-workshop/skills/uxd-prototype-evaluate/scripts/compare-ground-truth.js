#!/usr/bin/env node
'use strict';

/**
 * Compare automated eval CSVs against optional designer ground-truth data.
 *
 * Ground truth is NOT bundled. Provide your own JSON file:
 *
 *   config/ground-truth.json  (next to this skill)
 *   or GROUND_TRUTH_PATH=/path/to/ground-truth.json
 *
 * Format:
 * [
 *   {
 *     "key": "PROJ-298",
 *     "lofi": "Pass",
 *     "lofiQualifier": "",
 *     "hifi": "Fail",
 *     "hifiQualifier": "",
 *     "navIssue": false,
 *     "failReason": "design",
 *     "note": "Optional reviewer note"
 *   }
 * ]
 */

const fs = require('fs');
const path = require('path');

const projectRoot = require('./resolve-root').resolveProjectRoot();
const artifactsBase = path.join(projectRoot, '.artifacts');
const skillRoot = path.join(__dirname, '..');

function loadManualEvals() {
  const candidates = [
    process.env.GROUND_TRUTH_PATH,
    path.join(skillRoot, 'config', 'ground-truth.json'),
    path.join(projectRoot, '.context', 'ground-truth.json'),
  ].filter(Boolean);

  for (const p of candidates) {
    if (fs.existsSync(p)) {
      const data = JSON.parse(fs.readFileSync(p, 'utf8'));
      if (!Array.isArray(data)) {
        console.error(`Ground truth at ${p} must be a JSON array.`);
        process.exit(1);
      }
      console.log(`Loaded ${data.length} ground-truth entries from ${p}`);
      return data;
    }
  }

  console.error('No ground-truth file found.');
  console.error('Create config/ground-truth.json (see script header) or set GROUND_TRUTH_PATH.');
  process.exit(0);
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

function readEvalCSV(key) {
  const csvPath = path.join(artifactsBase, key, 'eval', 'evaluation-report.csv');
  if (!fs.existsSync(csvPath)) return null;

  const raw = fs.readFileSync(csvPath, 'utf8').trim();
  const allLines = raw.split('\n').filter(l => !l.startsWith('#'));
  if (allLines.length < 2) return null;

  const headers = parseCSVLine(allLines[0]);
  const rows = [];
  for (let i = 1; i < allLines.length; i++) {
    const line = allLines[i].trim();
    if (!line) continue;
    const vals = parseCSVLine(line);
    // Stop at usability / dimension sections (snake_case ids, not ticket keys)
    if (vals.length >= 2 && /^[a-z_]+$/.test(vals[0]) && vals[0].includes('_') && !/^[A-Z]+-\d+/.test(vals[0])) break;
    const obj = {};
    headers.forEach((h, idx) => { obj[h] = vals[idx] || ''; });
    rows.push(obj);
  }

  const jiraRows = rows.filter(r => (r.source || '').toLowerCase() !== 'inferred');
  const navRows = rows.filter(r => (r.criterion_id || '').startsWith('NAV'));

  const hasJiraFail = jiraRows.some(r => r.verdict === 'FAIL');
  const hasNavFail = navRows.some(r => r.verdict === 'FAIL');
  const allJiraPassOrFlagged = jiraRows.every(r => r.verdict === 'PASS' || r.verdict === 'FLAGGED');

  let ourLofi;
  if (hasNavFail) ourLofi = 'Fail (nav)';
  else if (hasJiraFail) ourLofi = 'Fail';
  else if (allJiraPassOrFlagged) ourLofi = 'Pass';
  else ourLofi = 'Mixed';

  return {
    key,
    totalCriteria: rows.length,
    jiraPass: jiraRows.filter(r => r.verdict === 'PASS').length,
    jiraFail: jiraRows.filter(r => r.verdict === 'FAIL').length,
    jiraFlagged: jiraRows.filter(r => r.verdict === 'FLAGGED').length,
    navFail: hasNavFail,
    ourLofi,
  };
}

function main() {
  const manualEvals = loadManualEvals();

  console.log('\nGround Truth vs Automated Eval — Comparison\n');
  console.log('Ground truth: ' + manualEvals.length + ' entries');
  console.log('Our data: eval CSVs from .artifacts/<KEY>/eval/\n');

  const evaluated = [];
  const notEvaluated = [];
  let agree = 0, disagree = 0, navRecallHits = 0, navRecallTotal = 0;
  let falsePos = 0, falseNeg = 0;

  for (const manual of manualEvals) {
    if (manual.lofi === 'N/A') continue;

    const ours = readEvalCSV(manual.key);

    if (!ours) {
      notEvaluated.push(manual.key);
      continue;
    }

    const manualPass = manual.lofi === 'Pass';
    const ourPass = ours.ourLofi === 'Pass';

    const match = manualPass === ourPass;
    if (match) agree++;
    else {
      disagree++;
      if (ourPass && !manualPass) falseNeg++;
      if (!ourPass && manualPass) falsePos++;
    }

    if (manual.navIssue) {
      navRecallTotal++;
      if (ours.navFail) navRecallHits++;
    }

    evaluated.push({ manual, ours, match });
  }

  const manualTotal = manualEvals.filter(a => a.lofi !== 'N/A').length;
  console.log(`  Key              | Manual Lo-fi          | Our Verdict     | Match | Fail Reason`);
  console.log(`  -----------------+---------------------+-----------------+-------+------------------`);

  for (const { manual, ours, match } of evaluated) {
    const m = match ? '  ✓  ' : '  ✗  ';
    const manualLabel = manual.lofi + (manual.lofiQualifier ? ` (${manual.lofiQualifier})` : '');
    const reason = manual.failReason || '—';
    console.log(`  ${manual.key.padEnd(17)}| ${manualLabel.padEnd(20)}| ${ours.ourLofi.padEnd(16)}| ${m} | ${reason}`);
  }

  if (notEvaluated.length) {
    console.log(`\n  Not yet evaluated (${notEvaluated.length}):`);
    for (const key of notEvaluated) {
      const manual = manualEvals.find(a => a.key === key);
      const manualLabel = manual.lofi + (manual.lofiQualifier ? ` (${manual.lofiQualifier})` : '');
      const hifiLabel = manual.hifi + (manual.hifiQualifier ? ` (${manual.hifiQualifier})` : '');
      console.log(`    ${key} — Lo-fi: ${manualLabel} | Hi-fi: ${hifiLabel}`);
      if (manual.note) console.log(`      ${manual.note}`);
    }
  }

  const total = agree + disagree;
  console.log('\n--- Summary ---\n');
  console.log(`  Manual review totals:   Lo-fi ${manualEvals.filter(a => a.lofi === 'Pass').length}/${manualTotal} pass | Hi-fi ${manualEvals.filter(a => a.hifi === 'Pass').length}/${manualTotal} pass`);
  console.log(`  Evaluated:       ${total}/${manualTotal}`);
  console.log(`  Agreement:       ${agree}/${total} (${total ? Math.round(agree / total * 100) : 0}%)`);
  console.log(`  False negatives: ${falseNeg} (we PASS, manual says Fail)`);
  console.log(`  False positives: ${falsePos} (we FAIL, manual says Pass)`);

  if (navRecallTotal > 0) {
    console.log(`\n  Nav failure recall: ${navRecallHits}/${navRecallTotal}`);
  }

  const outDir = path.join(artifactsBase, 'eval', 'runs');
  fs.mkdirSync(outDir, { recursive: true });
  const outPath = path.join(outDir, 'manual-comparison.md');

  let md = `# Ground Truth vs Automated Eval — Comparison\n\n`;
  md += `**Date:** ${new Date().toISOString().split('T')[0]}\n`;
  md += `**Ground truth:** ${manualTotal} entries from local ground-truth file\n`;
  md += `**Manual review totals:** Lo-fi ${manualEvals.filter(a => a.lofi === 'Pass').length}/${manualTotal} pass, Hi-fi ${manualEvals.filter(a => a.hifi === 'Pass').length}/${manualTotal} pass\n\n`;
  md += `## Evaluated\n\n`;
  md += `| Key | Manual Lo-fi | Fail Reason | Our Verdict | Match | Nav Recall |\n`;
  md += `|-----|-----------|-------------|-------------|-------|------------|\n`;

  for (const { manual, ours, match } of evaluated) {
    const m = match ? 'Yes' : '**No**';
    const nav = manual.navIssue ? (ours.navFail ? 'Caught' : '**Missed**') : '—';
    const manualLabel = manual.lofi + (manual.lofiQualifier ? ` (${manual.lofiQualifier})` : '');
    const reason = manual.failReason || '—';
    md += `| ${manual.key} | ${manualLabel} | ${reason} | ${ours.ourLofi} | ${m} | ${nav} |\n`;
  }

  md += `\n## Summary\n\n`;
  md += `- Evaluated: ${total}/${manualTotal}\n`;
  md += `- Agreement: ${agree}/${total} (${total ? Math.round(agree / total * 100) : 0}%)\n`;
  md += `- False negatives: ${falseNeg} (we PASS, manual says Fail)\n`;
  md += `- False positives: ${falsePos} (we FAIL, manual says Pass)\n`;
  if (navRecallTotal > 0) {
    md += `- Nav failure recall: ${navRecallHits}/${navRecallTotal}\n`;
  }

  md += `\n## Not Yet Evaluated\n\n`;
  md += `| Key | Manual Lo-fi | Manual Hi-fi | Fail Reason | Reviewer Note |\n`;
  md += `|-----|-----------|-----------|-------------|-------------|\n`;
  for (const key of notEvaluated) {
    const manual = manualEvals.find(a => a.key === key);
    const loLabel = manual.lofi + (manual.lofiQualifier ? ` (${manual.lofiQualifier})` : '');
    const hiLabel = manual.hifi + (manual.hifiQualifier ? ` (${manual.hifiQualifier})` : '');
    md += `| ${key} | ${loLabel} | ${hiLabel} | ${manual.failReason || '—'} | ${manual.note || ''} |\n`;
  }

  fs.writeFileSync(outPath, md, 'utf8');
  console.log(`\n  Report written to ${outPath}`);
}

main();
