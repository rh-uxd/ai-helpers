#!/usr/bin/env node
'use strict';

// Hosted report links only. Do not derive current verdicts or scores from old
// CSV/journey projections; the linked canonical report owns those results.
const fs = require('fs');
const path = require('path');
const escape = value => String(value).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

function main() {
  if (!process.argv[2]) throw new Error('Usage: generate-dashboard.js <reports-directory>');
  const root = path.resolve(process.argv[2]);
  const reports = fs.readdirSync(root, { withFileTypes: true }).filter(entry => entry.isDirectory()).flatMap(entry => {
    const name = ['index.html', 'evaluation-report.html'].find(file => {
      const stat = fs.lstatSync(path.join(root, entry.name, file), { throwIfNoEntry: false });
      return stat?.isFile();
    });
    if (!name) return [];
    return [{ key: entry.name, name, mtime: fs.statSync(path.join(root, entry.name, name)).mtime }];
  }).sort((a, b) => b.mtime - a.mtime);
  const rows = reports.map(report => {
    const link = `${encodeURIComponent(report.key)}/${report.name === 'index.html' ? '' : report.name}`;
    return `<tr><td><a href="${escape(link)}">${escape(report.key)}</a></td><td>See linked report</td><td>—</td><td>—</td><td>${escape(report.mtime.toISOString().slice(0, 10))}</td><td>—</td></tr>`;
  }).join('\n');
  const template = fs.readFileSync(path.resolve(__dirname, '../../templates/report-index.html'), 'utf8');
  const html = template.replace('{{STATS_CARDS}}', `<div class="stat-card"><div class="stat-value">${reports.length}</div><div class="stat-label">Reports</div></div>`).replace('{{REPORT_ROWS}}', rows);
  const output = path.join(root, 'index.html');
  const existing = fs.lstatSync(output, { throwIfNoEntry: false });
  if (existing && !existing.isFile()) throw new Error('Report index must be a regular file');
  fs.writeFileSync(output, html);
  console.log(`Report index written: ${output} (${reports.length} reports)`);
}

try { main(); } catch (error) { console.error(error.message); process.exitCode = 1; }
