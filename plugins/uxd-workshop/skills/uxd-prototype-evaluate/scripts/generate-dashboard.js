#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');

const SCRIPT_DIR = __dirname;
const SKILL_ROOT = path.resolve(SCRIPT_DIR, '..');
const TEMPLATE_PATH = path.join(SKILL_ROOT, 'templates', 'report-index.html');

const evalsDir = process.argv[2];
if (!evalsDir) {
  console.error('Usage: node generate-dashboard.js <evals-directory>');
  console.error('  e.g. node generate-dashboard.js /path/to/pages-repo/public/evals');
  process.exit(1);
}

const absEvalsDir = path.resolve(evalsDir);

function readJsonOr(filePath, fallback) {
  try { return JSON.parse(fs.readFileSync(filePath, 'utf8')); } catch { return fallback; }
}

function escapeHtml(str) {
  return String(str || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function parseCSVLine(line) {
  const result = []; let current = ''; let inQ = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQ) { if (ch === '"' && line[i+1] === '"') { current += '"'; i++; } else if (ch === '"') inQ = false; else current += ch; }
    else { if (ch === '"') inQ = true; else if (ch === ',') { result.push(current); current = ''; } else current += ch; }
  }
  result.push(current); return result;
}

function main() {
  if (!fs.existsSync(absEvalsDir)) {
    console.error(`Directory not found: ${absEvalsDir}`);
    process.exit(1);
  }

  const reportDirs = fs.readdirSync(absEvalsDir)
    .filter(d => {
      const full = path.join(absEvalsDir, d);
      return fs.statSync(full).isDirectory() &&
        (fs.existsSync(path.join(full, 'index.html')) || fs.existsSync(path.join(full, 'evaluation-report.html')));
    })
    .sort();

  let totalEvals = 0, totalPass = 0, usabilitySum = 0, usabilityCount = 0;
  const rows = [];

  for (const key of reportDirs) {
    const dir = path.join(absEvalsDir, key);
    totalEvals++;

    const reportFile = fs.existsSync(path.join(dir, 'index.html')) ? 'index.html' : 'evaluation-report.html';
    const mtime = fs.statSync(path.join(dir, reportFile)).mtime;
    const evalDate = mtime.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

    let title = key;
    // Prefer extract-state.json for the real Jira story title
    const extractStatePath = path.join(dir, 'extract-state.json');
    if (fs.existsSync(extractStatePath)) {
      const es = readJsonOr(extractStatePath, null);
      if (es && (es.ticket_summary || es.story_title || es.title)) {
        title = es.ticket_summary || es.story_title || es.title;
      }
    }
    if (title === key) {
      const htmlContent = fs.readFileSync(path.join(dir, reportFile), 'utf8').slice(0, 2000);
      const titleMatch = htmlContent.match(/<title>([^<]*)<\/title>/);
      if (titleMatch) title = titleMatch[1].replace(/^Evaluation:\s*/, '');
    }

    let passCount = 0, failCount = 0, flaggedCount = 0;
    const csvPath = path.join(dir, 'evaluation-report.csv');
    if (fs.existsSync(csvPath)) {
      const csv = fs.readFileSync(csvPath, 'utf8');
      const lines = csv.split('\n').filter(l => l.trim() && !l.startsWith('#'));
      if (lines.length > 1) {
        const headers = parseCSVLine(lines[0]);
        const vIdx = headers.indexOf('verdict');
        for (let i = 1; i < lines.length; i++) {
          const vals = parseCSVLine(lines[i]);
          const v = (vals[vIdx] || '').toUpperCase();
          if (v === 'PASS') passCount++;
          else if (v === 'FAIL') failCount++;
          else if (v === 'FLAGGED') flaggedCount++;
        }
      }
    }
    const totalAc = passCount + failCount + flaggedCount;
    if (failCount === 0 && totalAc > 0) totalPass++;

    let usability = null;
    const jlPath = path.join(dir, 'journey-log.json');
    if (fs.existsSync(jlPath)) {
      const jl = readJsonOr(jlPath, null);
      if (jl && jl.usability_dimensions && jl.usability_dimensions.overall_score != null) {
        const raw = String(jl.usability_dimensions.overall_score).replace(/\/21$/, '');
        usability = parseFloat(raw);
        if (!isNaN(usability)) { usabilitySum += usability; usabilityCount++; }
      }
    }

    let resultBadge, acDisplay;
    if (totalAc === 0) {
      resultBadge = ''; acDisplay = '—';
    } else if (failCount === 0 && flaggedCount === 0) {
      resultBadge = '<span class="badge badge-pass">Pass</span>';
      acDisplay = `${passCount}/${totalAc}`;
    } else if (failCount > 0) {
      resultBadge = '<span class="badge badge-fail">Fail</span>';
      acDisplay = `${passCount}/${totalAc}`;
    } else {
      resultBadge = '<span class="badge badge-mixed">Review</span>';
      acDisplay = `${passCount}/${totalAc}`;
    }

    let usabilityDisplay = '—';
    let usabilityClass = '';
    if (usability !== null) {
      usabilityDisplay = `${usability}/21`;
      if (usability >= 15) usabilityClass = 'score-good';
      else if (usability >= 10) usabilityClass = 'score-ok';
      else usabilityClass = 'score-low';
    }

    const reportLink = reportFile === 'index.html' ? `${key}/` : `${key}/${reportFile}`;
    rows.push({ key, title, reportLink, resultBadge, acDisplay, usabilityDisplay, usabilityClass, evalDate, mtime });
  }

  // Sort by last report date (most recent first)
  rows.sort((a, b) => b.mtime.getTime() - a.mtime.getTime());

  const rowsHtml = rows.map(r => `<tr>
      <td class="mono"><a href="${escapeHtml(r.reportLink)}">${escapeHtml(r.key)}</a></td>
      <td>${escapeHtml(r.title.length > 55 ? r.title.slice(0, 52) + '...' : r.title)}</td>
      <td>${r.resultBadge} ${r.acDisplay}</td>
      <td><span class="score ${r.usabilityClass}">${r.usabilityDisplay}</span></td>
      <td class="date-cell">${r.evalDate}</td>
      <td><a href="https://issues.example.com/browse/${escapeHtml(r.key)}" target="_blank">Jira</a></td>
    </tr>`).join('\n');

  const avgUsability = usabilityCount > 0 ? (usabilitySum / usabilityCount).toFixed(1) : '—';
  const passRate = totalEvals > 0 ? Math.round((totalPass / totalEvals) * 100) + '%' : '—';

  const statsHtml = `
    <div class="stat-card"><div class="stat-value">${totalEvals}</div><div class="stat-label">Total Evals</div></div>
    <div class="stat-card stat-pass"><div class="stat-value">${passRate}</div><div class="stat-label">Pass Rate</div></div>
    <div class="stat-card"><div class="stat-value">${avgUsability}/21</div><div class="stat-label">Avg Usability</div></div>
    <div class="stat-card"><div class="stat-value">${totalPass}/${totalEvals}</div><div class="stat-label">All AC Pass</div></div>
  `;

  let template = fs.readFileSync(TEMPLATE_PATH, 'utf8');
  template = template.replace('{{STATS_CARDS}}', statsHtml);
  template = template.replace('{{REPORT_ROWS}}', rowsHtml);

  const indexPath = path.join(absEvalsDir, 'index.html');
  fs.writeFileSync(indexPath, template, 'utf8');
  console.log(`  Dashboard written: ${indexPath} (${reportDirs.length} reports, ${(Buffer.byteLength(template) / 1024).toFixed(0)} KB)`);
}

main();
