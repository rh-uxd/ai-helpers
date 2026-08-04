#!/usr/bin/env node
'use strict';

/**
 * Render a lightweight mini-report from eval pipeline artifacts.
 *
 * Produces a single self-contained HTML file with:
 * - Verdict badge (PASS/FAIL)
 * - AC summary stats
 * - Screenshot gallery (base64-embedded)
 * - Prototype link
 *
 * Usage: node render-mini-report.js <artifacts-dir>
 */

const fs = require('fs');
const path = require('path');

const artifactsDir = process.argv[2];
if (!artifactsDir) {
  console.error('Usage: node render-mini-report.js <artifacts-dir>');
  process.exit(1);
}

const abs = path.resolve(artifactsDir);
if (!fs.existsSync(abs)) {
  console.error(`Artifacts directory not found: ${abs}`);
  process.exit(1);
}

function readJSON(name) {
  const p = path.join(abs, name);
  if (!fs.existsSync(p)) return null;
  try { return JSON.parse(fs.readFileSync(p, 'utf8')); } catch { return null; }
}

function readYAML(name) {
  const p = path.join(abs, name);
  if (!fs.existsSync(p)) return {};
  const lines = fs.readFileSync(p, 'utf8').split('\n');
  const result = {};
  for (const line of lines) {
    const m = line.match(/^(\w[\w_]*)\s*:\s*(.+)/);
    if (m) result[m[1].trim()] = m[2].trim().replace(/^["']|["']$/g, '');
  }
  return result;
}

// ── Read artifacts ──────────────────────────────────────────────────

const extractState = readJSON('extract-state.json') || {};
const personaResults = readJSON('persona-results.json') || [];
const journeyLog = readJSON('journey-log.json') || {};
const componentMap = readJSON('component-map.json') || {};
const navHints = readJSON('navigation-hints.json') || {};
const evalState = readYAML('eval-state.yaml');

// ── Parse CSV verdicts ──────────────────────────────────────────────

let acPass = 0, acFail = 0, acFlagged = 0, acTotal = 0;
const csvPath = path.join(abs, 'evaluation-report.csv');
if (fs.existsSync(csvPath)) {
  const raw = fs.readFileSync(csvPath, 'utf8');
  const section1 = raw.includes('# USABILITY') ? raw.split('# USABILITY')[0] : raw;
  const lines = section1.split('\n').filter(l => l.trim() && !l.startsWith('#'));
  if (lines.length >= 2) {
    // Parse CSV properly handling quoted fields with commas
    function parseCSVLine(line) {
      const fields = [];
      let current = '';
      let inQuotes = false;
      for (let i = 0; i < line.length; i++) {
        const ch = line[i];
        if (ch === '"') { inQuotes = !inQuotes; }
        else if (ch === ',' && !inQuotes) { fields.push(current.trim()); current = ''; }
        else { current += ch; }
      }
      fields.push(current.trim());
      return fields;
    }
    const header = parseCSVLine(lines[0]);
    const vIdx = header.findIndex(h => h.toLowerCase() === 'verdict');
    for (let i = 1; i < lines.length; i++) {
      if (!lines[i].trim()) continue;
      const cols = parseCSVLine(lines[i]);
      const v = (cols[vIdx] || '').toUpperCase();
      if (v === 'PASS') acPass++;
      else if (v === 'FAIL') acFail++;
      else if (v === 'FLAGGED') acFlagged++;
      acTotal++;
    }
  }
}

// ── Determine verdict ───────────────────────────────────────────────

const ud = journeyLog.usability_dimensions || {};
const usabilityScore = ud.overall_score || '—';
const hasFailures = acFail > 0;
const verdict = hasFailures ? `${acFail} Failing` : acFlagged > 0 ? `${acFlagged} Flagged` : 'All Passing';
const verdictColor = hasFailures ? '#c62828' : acFlagged > 0 ? '#e65100' : '#2e7d32';

// ── Build screenshot cards ──────────────────────────────────────────

const screenshotsDir = path.join(abs, 'screenshots');
const pr = Array.isArray(personaResults) ? personaResults : personaResults.personas || [];

let cards = '';
for (const entry of pr) {
  const persona = entry.persona || entry.persona_id || 'unknown';
  const personaName = entry.persona_name || persona;
  const taskIdx = entry.task_index || 1;
  const task = entry.task || `Task ${taskIdx}`;

  // Find the screenshot — try final, then last step, then first available
  let imgPath = null;
  const candidates = [
    path.join(screenshotsDir, `persona-${persona}-task-${taskIdx}-final.png`),
    ...Array.from({length: 10}, (_, i) =>
      path.join(screenshotsDir, `persona-${persona}-task-${taskIdx}-step-${10 - i}.png`)
    ),
  ];
  for (const c of candidates) {
    if (fs.existsSync(c)) { imgPath = c; break; }
  }

  let imgTag = '<div class="no-screenshot">No screenshot captured</div>';
  if (imgPath) {
    const b64 = fs.readFileSync(imgPath).toString('base64');
    imgTag = `<img src="data:image/png;base64,${b64}" alt="${personaName} - ${task}">`;
  }

  const outcomeIcon = entry.would_complete === false ? 'Abandoned' :
                       entry.would_complete === true ? 'Completed' : '';
  const patience = entry.patience_end != null ? `Patience: ${entry.patience_end}%` : '';
  const confusion = entry.confusion_events ? `${entry.confusion_events} confusion event(s)` : '';
  const details = [outcomeIcon, patience, confusion].filter(Boolean).join(' · ');

  cards += `
    <div class="screenshot-card">
      ${imgTag}
      <div class="screenshot-label">
        <div class="persona">${personaName}</div>
        <div class="task">Task ${taskIdx}: ${task.substring(0, 120)}</div>
        <div class="outcome">${details}</div>
      </div>
    </div>`;
}

// ── Prototype URL ───────────────────────────────────────────────────

let prototypeUrl = evalState.url || 'http://localhost:8080';
const target = componentMap.target || navHints.primary_route || '';
if (target && !target.startsWith('http')) {
  prototypeUrl = prototypeUrl.replace(/\/$/, '') + target;
}

// ── Metadata ────────────────────────────────────────────────────────

const key = evalState.key || path.basename(abs);
const title = extractState.title || extractState.story_title || key;
const model = evalState.model || 'unknown';
const timestamp = new Date().toISOString().replace('T', ' ').substring(0, 19);

let duration = '';
if (evalState.pipeline_start && evalState.pipeline_end) {
  try {
    const s = new Date(evalState.pipeline_start);
    const e = new Date(evalState.pipeline_end);
    duration = `${Math.round((e - s) / 60000)} min`;
  } catch {}
}

const cost = evalState.cost_usd ? `$${evalState.cost_usd}` : '';

// ── Render template ─────────────────────────────────────────────────

const templatePath = path.join(__dirname, '..', 'templates', 'mini-report.html');
let html = fs.readFileSync(templatePath, 'utf8');

const replacements = {
  '{{TITLE}}': title,
  '{{KEY}}': key,
  '{{VERDICT}}': verdict,
  '{{VERDICT_COLOR}}': verdictColor,
  '{{AC_PASS}}': String(acPass),
  '{{AC_FAIL}}': String(acFail),
  '{{AC_FLAGGED}}': String(acFlagged),
  '{{USABILITY}}': usabilityScore,
  '{{PROTOTYPE_URL}}': prototypeUrl,
  '{{SCREENSHOT_CARDS}}': cards,
  '{{TIMESTAMP}}': timestamp,
  '{{MODEL}}': model,
  '{{DURATION}}': duration,
  '{{COST}}': cost,
};

for (const [placeholder, value] of Object.entries(replacements)) {
  html = html.split(placeholder).join(value);
}

const outPath = path.join(abs, 'mini-report.html');
fs.writeFileSync(outPath, html, 'utf8');
console.log(`Mini-report: ${outPath}`);
console.log(`  ${verdict} | ${acPass}P/${acFail}F/${acFlagged}FL | Usability: ${usabilityScore}`);
