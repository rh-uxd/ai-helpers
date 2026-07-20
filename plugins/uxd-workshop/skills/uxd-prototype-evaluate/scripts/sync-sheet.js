#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

function loadTrackingConfig() {
  const overlayPath = path.join(__dirname, '..', 'config', 'product-overlay.yaml');
  let sheetId = process.env.EVAL_SHEET_ID || '';
  let sheetName = process.env.EVAL_SHEET_NAME || 'Automated Eval';
  if (fs.existsSync(overlayPath)) {
    const text = fs.readFileSync(overlayPath, 'utf8');
    const idMatch = text.match(/^\s*sheet_id:\s*["']?([^"'\n]*)["']?\s*$/m);
    const nameMatch = text.match(/^\s*sheet_name:\s*["']?([^"'\n]*)["']?\s*$/m);
    if (idMatch && idMatch[1].trim()) sheetId = idMatch[1].trim();
    if (nameMatch && nameMatch[1].trim()) sheetName = nameMatch[1].trim();
  }
  return { sheetId, sheetName };
}

const { sheetId: SPREADSHEET_ID, sheetName: EVAL_SHEET } = loadTrackingConfig();
if (!SPREADSHEET_ID) {
  console.error('Google Sheet sync disabled: set tracking.sheet_id in config/product-overlay.yaml or EVAL_SHEET_ID.');
  process.exit(0);
}

const ARTIFACTS_BASE = path.join(require('./resolve-root').resolveProjectRoot(), '.artifacts');
const API_BASE = `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}`;

const C = {
  headerBg:   { red: 0.12, green: 0.12, blue: 0.16 },
  white:      { red: 1,    green: 1,    blue: 1    },
  text:       { red: 0.13, green: 0.13, blue: 0.13 },
  muted:      { red: 0.42, green: 0.45, blue: 0.50 },
  passBg:     { red: 0.87, green: 0.95, blue: 0.87 },
  passText:   { red: 0.09, green: 0.50, blue: 0.09 },
  failBg:     { red: 0.96, green: 0.87, blue: 0.87 },
  failText:   { red: 0.75, green: 0.12, blue: 0.12 },
  flagBg:     { red: 0.99, green: 0.96, blue: 0.87 },
  flagText:   { red: 0.65, green: 0.47, blue: 0.02 },
  border:     { red: 0.82, green: 0.83, blue: 0.85 },
  zebraOdd:   { red: 0.97, green: 0.97, blue: 0.98 },
  agreeBg:    { red: 0.78, green: 0.92, blue: 0.78 },
  disagreeBg: { red: 0.95, green: 0.80, blue: 0.80 },
};

const COLUMNS = [
  { header: 'Key',              width: 130 },
  { header: 'Title',            width: 220 },
  { header: 'Original',         width: 60  },
  { header: 'After Loop',       width: 65  },
  { header: 'P',                width: 30  },
  { header: 'F',                width: 30  },
  { header: 'FL',               width: 30  },
  { header: 'Usability (orig)', width: 85  },
  { header: 'Usability (final)',width: 85  },
  { header: 'Iterations',       width: 65  },
  { header: 'Fixed',            width: 220 },
  { header: 'Designer Lo-fi',   width: 65  },
  { header: 'Designer Hi-fi',   width: 65  },
  { header: 'Agree',            width: 50  },
  { header: 'Report',           width: 50  },
  { header: 'Date',             width: 100 },
];

const COL_COUNT = COLUMNS.length;

function getToken() {
  try { return execSync('gcloud auth print-access-token 2>/dev/null', { encoding: 'utf8' }).trim(); }
  catch { console.error('Run: gcloud auth login --enable-gdrive-access'); process.exit(1); }
}

function sheetsGet(token, range) {
  const url = `${API_BASE}/values/${encodeURIComponent(range)}`;
  const res = execSync(`curl -s -H "Authorization: Bearer ${token}" "${url}"`, { encoding: 'utf8' });
  return JSON.parse(res);
}

function sheetsPut(token, range, values) {
  const body = JSON.stringify({ values, majorDimension: 'ROWS' });
  execSync(`curl -s -X PUT -H "Authorization: Bearer ${token}" -H "Content-Type: application/json" -d '${body.replace(/'/g, "'\\''")}' "${API_BASE}/values/${encodeURIComponent(range)}?valueInputOption=USER_ENTERED"`, { encoding: 'utf8' });
}

function sheetsClear(token, range) {
  execSync(`curl -s -X POST -H "Authorization: Bearer ${token}" -H "Content-Type: application/json" -d '{}' "${API_BASE}/values/${encodeURIComponent(range)}:clear"`, { encoding: 'utf8' });
}

function sheetsPost(token, endpoint, body) {
  const json = JSON.stringify(body).replace(/'/g, "'\\''");
  const res = execSync(`curl -s -X POST -H "Authorization: Bearer ${token}" -H "Content-Type: application/json" -d '${json}' "${API_BASE}${endpoint}"`, { encoding: 'utf8', maxBuffer: 10 * 1024 * 1024 });
  return JSON.parse(res || '{}');
}

function getSheetId(token) {
  const res = JSON.parse(execSync(`curl -s -H "Authorization: Bearer ${token}" "${API_BASE}?fields=sheets.properties"`, { encoding: 'utf8' }));
  const sheet = (res.sheets || []).find(s => s.properties.title === EVAL_SHEET);
  return sheet ? sheet.properties.sheetId : null;
}

function rng(sheetId, r1, r2, c1, c2) { return { sheetId, startRowIndex: r1, endRowIndex: r2, startColumnIndex: c1, endColumnIndex: c2 }; }
function fmt(sheetId, r1, r2, c1, c2, cell, fields) { return { repeatCell: { range: rng(sheetId, r1, r2, c1, c2), cell: { userEnteredFormat: cell }, fields: `userEnteredFormat(${fields})` } }; }

function parseCSVLine(line) {
  const result = []; let current = ''; let inQ = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQ) { if (ch === '"' && line[i+1] === '"') { current += '"'; i++; } else if (ch === '"') inQ = false; else current += ch; }
    else { if (ch === '"') inQ = true; else if (ch === ',') { result.push(current); current = ''; } else current += ch; }
  }
  result.push(current); return result;
}

function readEvalResults(dir) {
  const base = path.join(ARTIFACTS_BASE, dir);
  const csvPath = path.join(base, 'evaluation-report.csv');
  if (!fs.existsSync(csvPath)) return null;

  const csv = fs.readFileSync(csvPath, 'utf8');
  const lines = csv.split('\n').filter(l => l.trim() && !l.startsWith('#'));
  if (lines.length < 2) return null;

  const headers = parseCSVLine(lines[0]);
  let pass = 0, fail = 0, flagged = 0;
  const failItems = [], flaggedItems = [];

  for (let i = 1; i < lines.length; i++) {
    const vals = parseCSVLine(lines[i]);
    const obj = {}; headers.forEach((h, idx) => { obj[h] = vals[idx] || ''; });
    const v = (obj.verdict || '').toUpperCase();
    if (v === 'PASS') pass++;
    else if (v === 'FAIL') { fail++; failItems.push(obj.criterion_id); }
    else if (v === 'FLAGGED') { flagged++; flaggedItems.push(obj.criterion_id); }
  }

  const total = pass + fail + flagged;
  const result = fail === 0 ? 'Pass' : 'Fail';

  // Usability from journey-log
  const jl = path.join(base, 'journey-log.json');
  let usability = '—';
  if (fs.existsSync(jl)) {
    try {
      const jd = JSON.parse(fs.readFileSync(jl, 'utf8'));
      if (jd.usability_dimensions && jd.usability_dimensions.overall_score != null) {
        const raw = String(jd.usability_dimensions.overall_score).replace(/\/21$/, '');
        usability = `${raw}/21`;
      }
    } catch {}
  }

  // Iteration info + original (pre-fix) state
  const iterPath = path.join(base, 'iteration-log.json');
  let iterations = '1', fixSummary = '', origResult = result, origUsability = usability;
  let origPass = pass, origFail = fail, origFlagged = flagged;
  if (fs.existsSync(iterPath)) {
    try {
      const il = JSON.parse(fs.readFileSync(iterPath, 'utf8'));
      iterations = String(il.iterations ? il.iterations.length : 1);
      const allFixes = [];
      for (const iter of (il.iterations || [])) {
        for (const fix of (iter.fixes_applied || iter.changes_applied || [])) {
          allFixes.push(`${fix.criterion || ''}: ${(fix.change || fix.description || '').slice(0, 50)}`);
        }
      }
      fixSummary = allFixes.slice(0, 3).join('\n');
      if (allFixes.length > 3) fixSummary += `\n+${allFixes.length - 3} more`;

      // Get original (first iteration) state
      if (il.iterations && il.iterations.length > 0) {
        const first = il.iterations[0];
        origPass = first.pass_count || 0;
        origFail = first.fail_count || 0;
        origFlagged = first.flagged_count || 0;
        origResult = origFail > 0 ? 'Fail' : 'Pass';
        origUsability = first.usability_score != null ? `${String(first.usability_score).replace(/\/21$/, '')}/21` : usability;
      }
    } catch {}
  }

  // Report URL
  const reportUrlPath = path.join(base, 'report-url.txt');
  const reportUrl = fs.existsSync(reportUrlPath) ? fs.readFileSync(reportUrlPath, 'utf8').trim() : '';

  // Eval date from CSV mtime
  const mtime = fs.statSync(csvPath).mtime;
  const evalDate = mtime.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' });

  // Extract state for title
  const esPath = path.join(base, 'extract-state.json');
  let title = dir;
  if (fs.existsSync(esPath)) {
    try { const es = JSON.parse(fs.readFileSync(esPath, 'utf8')); title = es.ticket_summary || dir; } catch {}
  }

  return { key: dir, title, result, pass, fail, flagged, total, usability, iterations, fixSummary, flaggedItems: flaggedItems.join(', '), reportUrl, evalDate, mtime, origResult, origPass, origFail, origFlagged, origUsability };
}

function computeDelta(orig, final) {
  const parseScore = s => { const m = String(s).match(/^([\d.]+)/); return m ? parseFloat(m[1]) : null; };
  const o = parseScore(orig);
  const f = parseScore(final);
  if (o === null || f === null) return '—';
  const d = f - o;
  if (d === 0) return '0';
  return d > 0 ? `+${d.toFixed(1)}` : d.toFixed(1);
}

function main() {
  const args = process.argv.slice(2);
  const mode = args.includes('--auto') ? 'auto' : 'manual';

  console.log(`\n  Sync Eval Results → Google Sheet (mode: ${mode})\n`);
  if (!fs.existsSync(ARTIFACTS_BASE)) { console.error('  No .artifacts/ found.'); process.exit(1); }

  // Include any artifact dir that has an evaluation report (exclude runs/, etc.)
  const allDirs = fs.readdirSync(ARTIFACTS_BASE).filter(d => {
    const full = path.join(ARTIFACTS_BASE, d);
    return fs.statSync(full).isDirectory()
      && fs.existsSync(path.join(full, 'evaluation-report.csv'));
  });
  const testDirs = allDirs.filter(d => d.includes('-test'));
  const liveDirs = allDirs.filter(d => !d.includes('-test'));

  const results = [];
  for (const dir of liveDirs) {
    const r = readEvalResults(dir);
    if (r) results.push(r);
  }
  results.sort((a, b) => b.mtime.getTime() - a.mtime.getTime());

  const deprecatedResults = [];
  for (const dir of testDirs) {
    const r = readEvalResults(dir);
    if (r) deprecatedResults.push(r);
  }
  deprecatedResults.sort((a, b) => b.mtime.getTime() - a.mtime.getTime());

  console.log(`  Found ${results.length} evaluated prototype(s), ${deprecatedResults.length} deprecated test runs\n`);

  const token = getToken();

  // Optional designer ground truth from config/ground-truth.json (same format as compare-ground-truth.js)
  const groundTruth = {};
  const gtPath = path.join(__dirname, '..', 'config', 'ground-truth.json');
  if (fs.existsSync(gtPath)) {
    try {
      const entries = JSON.parse(fs.readFileSync(gtPath, 'utf8'));
      for (const e of entries) {
        if (e.key) groundTruth[e.key] = { lofi: e.lofi || '—', hifi: e.hifi || '—' };
      }
    } catch (err) {
      console.warn('  Warning: could not parse config/ground-truth.json:', err.message);
    }
  }

  // Ensure tab exists (delete + recreate for clean slate)
  let sheetId = getSheetId(token);
  if (sheetId !== null) {
    sheetsPost(token, ':batchUpdate', { requests: [{ deleteSheet: { sheetId } }] });
  }
  sheetsPost(token, ':batchUpdate', { requests: [{ addSheet: { properties: { title: EVAL_SHEET } } }] });
  sheetId = getSheetId(token);

  // Build TWO tables: Original (top) and After Loop (bottom)
  const ORIG_COLUMNS = [
    { header: 'Key', width: 130 }, { header: 'Title', width: 220 },
    { header: 'Result', width: 60 }, { header: 'Pass', width: 40 },
    { header: 'Fail', width: 40 }, { header: 'Flagged', width: 55 },
    { header: 'Usability', width: 70 }, { header: 'Designer Lo-fi', width: 65 },
    { header: 'Designer Hi-fi', width: 65 }, { header: 'Agree', width: 50 },
    { header: 'Report', width: 50 }, { header: 'Date', width: 100 },
  ];

  const LOOP_COLUMNS = [
    { header: 'Key', width: 130 }, { header: 'Title', width: 220 },
    { header: 'Result', width: 60 }, { header: 'Pass', width: 40 },
    { header: 'Fail', width: 40 }, { header: 'Flagged', width: 55 },
    { header: 'Usability (orig)', width: 85 }, { header: 'Usability (final)', width: 85 },
    { header: 'Delta', width: 55 }, { header: 'Iterations', width: 65 },
    { header: 'Fixed', width: 250 }, { header: 'Report', width: 50 },
  ];

  const origHeaderRow = ORIG_COLUMNS.map(c => c.header);
  const loopHeaderRow = LOOP_COLUMNS.map(c => c.header);

  const origRows = [];
  const loopRows = [];

  for (const r of results) {
    const gt = groundTruth[r.key] || {};
    const designerLofi = gt.lofi || '—';
    const designerHifi = gt.hifi || '—';
    const aOrigPass = r.origResult === 'Pass';
    const dPass = designerLofi.toLowerCase().startsWith('pass');
    const agree = (designerLofi === '—' || designerLofi === 'N/A') ? '—' : (dPass === aOrigPass ? 'Yes' : 'No');
    const reportCell = r.reportUrl ? `=HYPERLINK("${r.reportUrl}","View")` : '';
    const origReportCell = r.reportUrl ? `=HYPERLINK("${r.reportUrl.replace(/\/$/, '')}/original/","Original")` : '';

    origRows.push([
      r.key, r.title, r.origResult,
      String(r.origPass), String(r.origFail), String(r.origFlagged),
      r.origUsability, designerLofi, designerHifi, agree, origReportCell, r.evalDate
    ]);

    loopRows.push([
      r.key, r.title, r.result,
      String(r.pass), String(r.fail), String(r.flagged),
      r.origUsability, r.usability,
      computeDelta(r.origUsability, r.usability),
      r.iterations, r.fixSummary, reportCell
    ]);
  }

  // Write TWO tables with a gap row
  const origTitle = ['ORIGINAL EVAL (MR as-submitted)'];
  const loopTitle = ['AFTER LOOP (post-refinement)'];
  const gapRow = [''];
  const allRows = [origTitle, origHeaderRow, ...origRows, gapRow, loopTitle, loopHeaderRow, ...loopRows];
  sheetsPut(token, `'${EVAL_SHEET}'!A1`, allRows);

  const origDataStart = 2; // row index where orig data starts
  const loopTitleRow = 2 + origRows.length + 1; // gap + title
  const loopHeaderRowIdx = loopTitleRow + 1;
  const loopDataStart = loopHeaderRowIdx + 1;

  // Format
  const requests = [];

  // Column widths (use the wider of the two column sets)
  const maxCols = Math.max(ORIG_COLUMNS.length, LOOP_COLUMNS.length);
  for (let i = 0; i < maxCols; i++) {
    const w = Math.max((ORIG_COLUMNS[i] || {}).width || 80, (LOOP_COLUMNS[i] || {}).width || 80);
    requests.push({ updateDimensionProperties: { range: { sheetId, dimension: 'COLUMNS', startIndex: i, endIndex: i + 1 }, properties: { pixelSize: w }, fields: 'pixelSize' } });
  }

  // Section title rows (dark bg, white text, bold)
  requests.push(fmt(sheetId, 0, 1, 0, maxCols, { backgroundColor: C.headerBg, textFormat: { bold: true, fontSize: 11, foregroundColor: C.white } }, 'backgroundColor,textFormat'));
  requests.push(fmt(sheetId, loopTitleRow, loopTitleRow + 1, 0, maxCols, { backgroundColor: C.headerBg, textFormat: { bold: true, fontSize: 11, foregroundColor: C.white } }, 'backgroundColor,textFormat'));

  // Header rows (light bg, bold)
  const lightHeader = { red: 0.93, green: 0.93, blue: 0.95 };
  requests.push(fmt(sheetId, 1, 2, 0, ORIG_COLUMNS.length, { backgroundColor: lightHeader, textFormat: { bold: true, fontSize: 9, foregroundColor: C.text } }, 'backgroundColor,textFormat'));
  requests.push(fmt(sheetId, loopHeaderRowIdx, loopHeaderRowIdx + 1, 0, LOOP_COLUMNS.length, { backgroundColor: lightHeader, textFormat: { bold: true, fontSize: 9, foregroundColor: C.text } }, 'backgroundColor,textFormat'));

  // Freeze first 2 rows
  requests.push({ updateSheetProperties: { properties: { sheetId, gridProperties: { frozenRowCount: 2 } }, fields: 'gridProperties.frozenRowCount' } });

  // Helper for result cell formatting
  function fmtResultCell(row, col, val) {
    if (val === 'Pass') requests.push(fmt(sheetId, row, row + 1, col, col + 1, { backgroundColor: C.passBg, textFormat: { bold: true, foregroundColor: C.passText }, horizontalAlignment: 'CENTER' }, 'backgroundColor,textFormat,horizontalAlignment'));
    else if (val === 'Fail') requests.push(fmt(sheetId, row, row + 1, col, col + 1, { backgroundColor: C.failBg, textFormat: { bold: true, foregroundColor: C.failText }, horizontalAlignment: 'CENTER' }, 'backgroundColor,textFormat,horizontalAlignment'));
  }

  // ORIGINAL TABLE data formatting
  for (let i = 0; i < origRows.length; i++) {
    const row = origRows[i];
    const r = origDataStart + i;
    if (i % 2 === 1) requests.push(fmt(sheetId, r, r + 1, 0, ORIG_COLUMNS.length, { backgroundColor: C.zebraOdd }, 'backgroundColor'));
    fmtResultCell(r, 2, row[2]);
    // Designer Lo-fi (col 7), Hi-fi (col 8)
    if (row[7] === 'Pass') requests.push(fmt(sheetId, r, r + 1, 7, 8, { textFormat: { bold: true, foregroundColor: C.passText }, horizontalAlignment: 'CENTER' }, 'textFormat,horizontalAlignment'));
    else if (row[7] === 'Fail') requests.push(fmt(sheetId, r, r + 1, 7, 8, { textFormat: { bold: true, foregroundColor: C.failText }, horizontalAlignment: 'CENTER' }, 'textFormat,horizontalAlignment'));
    if (row[8] === 'Pass') requests.push(fmt(sheetId, r, r + 1, 8, 9, { textFormat: { bold: true, foregroundColor: C.passText }, horizontalAlignment: 'CENTER' }, 'textFormat,horizontalAlignment'));
    else if (row[8] === 'Fail') requests.push(fmt(sheetId, r, r + 1, 8, 9, { textFormat: { bold: true, foregroundColor: C.failText }, horizontalAlignment: 'CENTER' }, 'textFormat,horizontalAlignment'));
    else if (row[8] === 'IDK') requests.push(fmt(sheetId, r, r + 1, 8, 9, { textFormat: { foregroundColor: C.flagText }, horizontalAlignment: 'CENTER' }, 'textFormat,horizontalAlignment'));
    // Agree (col 9)
    if (row[9] === 'Yes') requests.push(fmt(sheetId, r, r + 1, 9, 10, { backgroundColor: C.agreeBg, textFormat: { bold: true }, horizontalAlignment: 'CENTER' }, 'backgroundColor,textFormat,horizontalAlignment'));
    else if (row[9] === 'No') requests.push(fmt(sheetId, r, r + 1, 9, 10, { backgroundColor: C.disagreeBg, textFormat: { bold: true }, horizontalAlignment: 'CENTER' }, 'backgroundColor,textFormat,horizontalAlignment'));
    // Center numerics (P, F, FL)
    for (const col of [3, 4, 5]) requests.push(fmt(sheetId, r, r + 1, col, col + 1, { horizontalAlignment: 'CENTER' }, 'horizontalAlignment'));
  }

  // AFTER LOOP TABLE data formatting
  for (let i = 0; i < loopRows.length; i++) {
    const row = loopRows[i];
    const r = loopDataStart + i;
    if (i % 2 === 1) requests.push(fmt(sheetId, r, r + 1, 0, LOOP_COLUMNS.length, { backgroundColor: C.zebraOdd }, 'backgroundColor'));
    fmtResultCell(r, 2, row[2]);
    // Fixed col (10) — wrap
    if (row[10]) requests.push(fmt(sheetId, r, r + 1, 10, 11, { textFormat: { fontSize: 9 }, wrapStrategy: 'WRAP', verticalAlignment: 'TOP' }, 'textFormat,wrapStrategy,verticalAlignment'));
    // Center numerics (P, F, FL, Iterations)
    for (const col of [3, 4, 5, 9]) requests.push(fmt(sheetId, r, r + 1, col, col + 1, { horizontalAlignment: 'CENTER' }, 'horizontalAlignment'));
    // Delta formatting (col 8): green for positive, red for negative
    const delta = row[8];
    if (delta && delta.startsWith('+')) requests.push(fmt(sheetId, r, r + 1, 8, 9, { textFormat: { bold: true, foregroundColor: C.passText }, horizontalAlignment: 'CENTER' }, 'textFormat,horizontalAlignment'));
    else if (delta && delta.startsWith('-')) requests.push(fmt(sheetId, r, r + 1, 8, 9, { textFormat: { bold: true, foregroundColor: C.failText }, horizontalAlignment: 'CENTER' }, 'textFormat,horizontalAlignment'));
    else requests.push(fmt(sheetId, r, r + 1, 8, 9, { horizontalAlignment: 'CENTER' }, 'horizontalAlignment'));
  }

  if (requests.length) {
    sheetsPost(token, ':batchUpdate', { requests });
  }

  // Create or recreate "Deprecated" tab for test runs
  if (deprecatedResults.length > 0) {
    const DEPRECATED_SHEET = 'Deprecated';
    let depSheetId = null;
    const allSheets = JSON.parse(execSync(`curl -s -H "Authorization: Bearer ${token}" "${API_BASE}?fields=sheets.properties"`, { encoding: 'utf8' }));
    const depSheet = (allSheets.sheets || []).find(s => s.properties.title === DEPRECATED_SHEET);
    if (depSheet) {
      depSheetId = depSheet.properties.sheetId;
      sheetsPost(token, ':batchUpdate', { requests: [{ deleteSheet: { sheetId: depSheetId } }] });
    }
    sheetsPost(token, ':batchUpdate', { requests: [{ addSheet: { properties: { title: DEPRECATED_SHEET } } }] });
    const depSheets = JSON.parse(execSync(`curl -s -H "Authorization: Bearer ${token}" "${API_BASE}?fields=sheets.properties"`, { encoding: 'utf8' }));
    depSheetId = (depSheets.sheets || []).find(s => s.properties.title === DEPRECATED_SHEET).properties.sheetId;

    const depHeader = ['Key', 'Title', 'Result', 'Pass', 'Fail', 'Flagged', 'Usability', 'Date'];
    const depRows = deprecatedResults.map(r => [
      r.key, r.title, r.result, String(r.pass), String(r.fail), String(r.flagged), r.usability, r.evalDate
    ]);
    sheetsPut(token, `'${DEPRECATED_SHEET}'!A1`, [['DEPRECATED TEST RUNS'], depHeader, ...depRows]);

    const depFmtRequests = [
      fmt(depSheetId, 0, 1, 0, depHeader.length, { backgroundColor: C.headerBg, textFormat: { bold: true, fontSize: 11, foregroundColor: C.white } }, 'backgroundColor,textFormat'),
      fmt(depSheetId, 1, 2, 0, depHeader.length, { backgroundColor: { red: 0.93, green: 0.93, blue: 0.95 }, textFormat: { bold: true, fontSize: 9, foregroundColor: C.text } }, 'backgroundColor,textFormat'),
    ];
    sheetsPost(token, ':batchUpdate', { requests: depFmtRequests });
    console.log(`  Wrote ${deprecatedResults.length} deprecated test runs to "${DEPRECATED_SHEET}" tab`);
  }

  console.log(`  Wrote ${origRows.length} + ${loopRows.length} rows to "${EVAL_SHEET}" (2 tables)`);
  console.log(`  Applied ${requests.length} format operations`);
  console.log(`\n  Sheet: https://docs.google.com/spreadsheets/d/${SPREADSHEET_ID}\n`);

  for (const r of results) {
    const icon = r.result === 'Pass' ? '✓' : '✗';
    console.log(`  ${icon} ${r.key}: ${r.origResult}→${r.result} (${r.origPass}→${r.pass}P) ${r.usability} — ${r.iterations} iter`);
  }
  console.log();
}

main();
