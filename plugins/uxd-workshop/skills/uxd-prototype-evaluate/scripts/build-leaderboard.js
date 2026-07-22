#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');

const { resolveEvalGlobalDir } = require('./resolve-root');
const EVAL_GLOBAL_DIR = resolveEvalGlobalDir();
const RUNS_DIR = path.join(EVAL_GLOBAL_DIR, 'runs');
const OUTPUT_PATH = path.join(EVAL_GLOBAL_DIR, 'pain-leaderboard.html');

function readJsonOr(filePath, fallback) {
  try { return JSON.parse(fs.readFileSync(filePath, 'utf8')); } catch { return fallback; }
}

function getLatestRunPerPrototype() {
  if (!fs.existsSync(RUNS_DIR)) return [];

  const protoDirs = fs.readdirSync(RUNS_DIR)
    .filter(d => !d.includes('-test') && d !== '.' && d !== '..')
    .filter(d => fs.statSync(path.join(RUNS_DIR, d)).isDirectory());

  const results = [];

  for (const key of protoDirs) {
    const keyDir = path.join(RUNS_DIR, key);
    const runs = fs.readdirSync(keyDir)
      .filter(d => fs.statSync(path.join(keyDir, d)).isDirectory())
      .sort();

    if (!runs.length) continue;
    const latestRun = runs[runs.length - 1];
    const jlPath = path.join(keyDir, latestRun, 'journey-log.json');
    const jl = readJsonOr(jlPath, null);
    if (!jl) continue;

    results.push({ key, run: latestRun, journeyLog: jl });
  }

  return results;
}

function extractPainPoints(prototypes) {
  const confusionMap = {};
  const dimensionMap = {};
  let totalConfusion = 0;

  for (const { key, journeyLog } of prototypes) {
    const ud = journeyLog.usability_dimensions;
    if (!ud) continue;

    for (const overlay of (ud.persona_overlays || [])) {
      for (const ce of (overlay.confusion_events || [])) {
        totalConfusion++;
        const trigger = (ce.trigger || '').trim();
        if (!trigger) continue;

        if (!confusionMap[trigger]) {
          confusionMap[trigger] = { trigger, prototypes: new Set(), personas: new Set(), count: 0 };
        }
        confusionMap[trigger].prototypes.add(key);
        confusionMap[trigger].personas.add(overlay.persona || overlay.persona_name || '?');
        confusionMap[trigger].count++;
      }
    }

    for (const dim of (ud.dimensions || [])) {
      const score = parseFloat(dim.composite_score || dim.score || 3);
      if (isNaN(score) || score > 1.5) continue;

      const name = dim.name || dim.id || '?';
      if (!dimensionMap[name]) {
        dimensionMap[name] = { name, prototypes: new Set(), scores: [], avgScore: 0 };
      }
      dimensionMap[name].prototypes.add(key);
      dimensionMap[name].scores.push(score);
    }
  }

  for (const dim of Object.values(dimensionMap)) {
    dim.avgScore = (dim.scores.reduce((a, b) => a + b, 0) / dim.scores.length).toFixed(1);
  }

  const painPoints = Object.values(confusionMap)
    .map(p => ({ ...p, prototypes: [...p.prototypes], personas: [...p.personas] }))
    .sort((a, b) => b.prototypes.length - a.prototypes.length || b.count - a.count);

  const lowDimensions = Object.values(dimensionMap)
    .map(d => ({ ...d, prototypes: [...d.prototypes] }))
    .sort((a, b) => b.prototypes.length - a.prototypes.length);

  return { painPoints, lowDimensions, totalConfusion, totalPrototypes: prototypes.length };
}

function escapeHtml(str) {
  return String(str || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function renderHtml({ painPoints, lowDimensions, totalConfusion, totalPrototypes }) {
  const now = new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' });

  let painRows = '';
  for (let i = 0; i < painPoints.length; i++) {
    const p = painPoints[i];
    painRows += `<tr>
      <td class="rank">${i + 1}</td>
      <td class="trigger">${escapeHtml(p.trigger)}</td>
      <td class="center mono">${p.prototypes.length}</td>
      <td class="protos">${p.prototypes.map(k => `<span class="proto-tag">${escapeHtml(k.replace(/^[A-Z]+-/, ''))}</span>`).join(' ')}</td>
      <td class="personas">${p.personas.map(pe => `<span class="persona-tag">${escapeHtml(pe)}</span>`).join(' ')}</td>
    </tr>`;
  }

  let dimRows = '';
  for (const d of lowDimensions) {
    dimRows += `<tr>
      <td>${escapeHtml(d.name)}</td>
      <td class="center score-low">${d.avgScore}/3</td>
      <td class="center mono">${d.prototypes.length}</td>
      <td class="protos">${d.prototypes.map(k => `<span class="proto-tag">${escapeHtml(k.replace(/^[A-Z]+-/, ''))}</span>`).join(' ')}</td>
    </tr>`;
  }

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Eval Leaderboard</title>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;700&display=swap">
<style>
:root {
  --bg: #fafbfc;
  --card-bg: #ffffff;
  --card-border: #e2e8f0;
  --radius: 8px;
  --text: #1a1a2e;
  --muted: #64748b;
  --primary: #ff6b35;
  --secondary: #00b4d8;
  --success: #16a34a;
  --danger: #dc2626;
  --font-heading: 'Inter', -apple-system, sans-serif;
  --font-mono: 'JetBrains Mono', monospace;
}

* { box-sizing: border-box; margin: 0; padding: 0; }

body {
  font-family: 'Inter', -apple-system, sans-serif;
  background: var(--bg);
  color: var(--text);
  line-height: 1.6;
  min-height: 100vh;
}

@keyframes float {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-3px); }
}

.brand-mascot { animation: float 2s ease-in-out infinite; }

.nav-bar {
  display: flex;
  align-items: center;
  gap: 0;
  background: #ffffff;
  padding: 0 2rem;
  border-bottom: 3px solid transparent;
  border-image: linear-gradient(90deg, var(--primary), var(--secondary)) 1;
  position: sticky;
  top: 0;
  z-index: 100;
}

.nav-brand {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem 1.25rem 0.75rem 0;
  margin-right: 1rem;
  border-right: 1px solid var(--card-border);
  text-decoration: none;
  color: var(--text);
}

.nav-brand-text {
  font-family: var(--font-mono);
  font-weight: 700;
  font-size: 1.3rem;
  letter-spacing: 0.05em;
}

.nav-brand-full {
  font-size: 0.7rem;
  font-weight: 500;
  color: var(--muted);
  max-width: 0;
  overflow: hidden;
  white-space: nowrap;
  transition: max-width 0.3s ease, opacity 0.3s ease, margin 0.3s ease;
  opacity: 0;
  margin-left: 0;
}

.nav-brand:hover .nav-brand-full {
  max-width: 280px;
  opacity: 1;
  margin-left: 0.5rem;
}

.nav-tab {
  padding: 0.875rem 1.25rem;
  font-size: 0.85rem;
  font-weight: 500;
  color: var(--muted);
  text-decoration: none;
  border-bottom: 2px solid transparent;
  margin-bottom: -3px;
  transition: color 0.15s, border-color 0.15s;
}

.nav-tab:hover { color: var(--text); text-decoration: none; }
.nav-tab.active { color: var(--primary); border-bottom-color: var(--primary); font-weight: 600; }

.container { max-width: 1100px; margin: 0 auto; padding: 2rem 1.5rem; }

h1 {
  font-family: var(--font-heading);
  font-size: 1.5rem;
  font-weight: 700;
  letter-spacing: -0.01em;
  margin-bottom: 0.25rem;
}

.subtitle { color: var(--muted); font-size: 0.875rem; margin-bottom: 1.5rem; }

.stats-row {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: 1rem;
  margin-bottom: 2rem;
}

.stat-card {
  background: var(--card-bg);
  border: 1px solid var(--card-border);
  border-radius: var(--radius);
  padding: 1.25rem 1rem;
  text-align: center;
  box-shadow: 0 1px 3px rgba(0,0,0,0.04);
}

.stat-card .stat-value {
  font-family: var(--font-mono);
  font-size: 1.6rem;
  font-weight: 700;
  color: var(--text);
}

.stat-card .stat-label {
  font-size: 0.65rem;
  font-variant: small-caps;
  letter-spacing: 0.06em;
  color: var(--muted);
  margin-top: 0.25rem;
}

h2 {
  font-family: var(--font-heading);
  font-size: 1.15rem;
  font-weight: 600;
  margin: 2rem 0 0.75rem;
  padding-left: 0.75rem;
  border-left: 3px solid var(--primary);
}

table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.85rem;
  margin-bottom: 2rem;
  background: var(--card-bg);
  border: 1px solid var(--card-border);
  border-radius: var(--radius);
  overflow: hidden;
}

thead { background: var(--bg); }

th {
  text-align: left;
  font-size: 0.7rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: var(--muted);
  padding: 0.65rem 0.75rem;
  border-bottom: 1px solid var(--card-border);
  white-space: nowrap;
}

td {
  padding: 0.6rem 0.75rem;
  border-bottom: 1px solid var(--card-border);
  vertical-align: top;
}

tbody tr:nth-child(even) td { background: rgba(250,251,252,0.6); }
tbody tr:hover td { background: rgba(0,180,216,0.03); border-left-color: var(--primary); }
tbody tr { border-left: 3px solid transparent; transition: border-left-color 0.15s; }
tbody tr:hover { border-left-color: var(--primary); }

.rank { font-family: var(--font-mono); font-weight: 700; color: var(--muted); width: 2.5rem; }
.center { text-align: center; }
.mono { font-family: var(--font-mono); }
.trigger { max-width: 350px; }
.score-low { color: var(--danger); font-weight: 600; font-family: var(--font-mono); }

.proto-tag {
  display: inline-block;
  padding: 0.15rem 0.45rem;
  background: rgba(0,180,216,0.1);
  color: var(--secondary);
  border-radius: 4px;
  font-size: 0.7rem;
  font-family: var(--font-mono);
  font-weight: 500;
  margin: 0.1rem 0.15rem;
}

.persona-tag {
  display: inline-block;
  padding: 0.15rem 0.45rem;
  background: rgba(255,107,53,0.1);
  color: var(--primary);
  border-radius: 4px;
  font-size: 0.7rem;
  font-family: var(--font-mono);
  font-weight: 500;
  margin: 0.1rem 0.15rem;
}

.protos, .personas { max-width: 250px; }
.empty-msg { color: var(--muted); padding: 1rem 0; }

footer {
  margin-top: 2.5rem;
  padding-top: 1rem;
  border-top: 1px solid var(--card-border);
  font-size: 0.75rem;
  color: var(--muted);
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.footer-powered {
  font-family: var(--font-mono);
  font-size: 0.7rem;
  letter-spacing: 0.04em;
}
</style>
</head>
<body>

<nav class="nav-bar">
  <a href="index.html" class="nav-brand">
    <svg class="brand-mascot" width="28" height="44" viewBox="0 0 12 22" fill="none" xmlns="http://www.w3.org/2000/svg" style="image-rendering:pixelated">
      <rect x="7" y="0" width="1" height="1" fill="#ff6b35"/><rect x="8" y="0" width="1" height="1" fill="#ffaa00"/>
      <rect x="6" y="1" width="1" height="1" fill="#ff6b35"/><rect x="7" y="1" width="1" height="1" fill="#ff6b35"/><rect x="8" y="1" width="1" height="1" fill="#ffaa00"/><rect x="9" y="1" width="1" height="1" fill="#ffaa00"/>
      <rect x="3" y="2" width="1" height="1" fill="#f5f5f5"/><rect x="4" y="2" width="1" height="1" fill="#ffffff"/><rect x="5" y="2" width="1" height="1" fill="#ff6b35"/><rect x="6" y="2" width="1" height="1" fill="#ff6b35"/><rect x="7" y="2" width="1" height="1" fill="#ff6b35"/><rect x="8" y="2" width="1" height="1" fill="#ffaa00"/><rect x="9" y="2" width="1" height="1" fill="#ffaa00"/>
      <rect x="2" y="3" width="1" height="1" fill="#f5f5f5"/><rect x="3" y="3" width="1" height="1" fill="#ff6b35"/><rect x="4" y="3" width="1" height="1" fill="#ff6b35"/><rect x="5" y="3" width="1" height="1" fill="#1a1a2e"/><rect x="6" y="3" width="1" height="1" fill="#ff6b35"/><rect x="7" y="3" width="1" height="1" fill="#ff6b35"/><rect x="8" y="3" width="1" height="1" fill="#ff6b35"/><rect x="9" y="3" width="1" height="1" fill="#ffaa00"/>
      <rect x="1" y="4" width="1" height="1" fill="#ff6b35"/><rect x="2" y="4" width="1" height="1" fill="#ff6b35"/><rect x="3" y="4" width="1" height="1" fill="#ff6b35"/><rect x="4" y="4" width="1" height="1" fill="#ff6b35"/><rect x="5" y="4" width="1" height="1" fill="#ff6b35"/><rect x="6" y="4" width="1" height="1" fill="#ff6b35"/><rect x="7" y="4" width="1" height="1" fill="#ff6b35"/><rect x="8" y="4" width="1" height="1" fill="#ffaa00"/>
      <rect x="2" y="5" width="1" height="1" fill="#ffaa00"/><rect x="3" y="5" width="1" height="1" fill="#ff6b35"/><rect x="4" y="5" width="1" height="1" fill="#ff6b35"/><rect x="5" y="5" width="1" height="1" fill="#ff6b35"/><rect x="6" y="5" width="1" height="1" fill="#ff6b35"/><rect x="7" y="5" width="1" height="1" fill="#ff6b35"/><rect x="8" y="5" width="1" height="1" fill="#ffaa00"/>
      <rect x="4" y="6" width="1" height="1" fill="#ff6b35"/><rect x="5" y="6" width="1" height="1" fill="#ff6b35"/><rect x="6" y="6" width="1" height="1" fill="#ff6b35"/><rect x="7" y="6" width="1" height="1" fill="#ff6b35"/><rect x="8" y="6" width="1" height="1" fill="#ff6b35"/>
      <rect x="4" y="7" width="1" height="1" fill="#ff6b35"/><rect x="5" y="7" width="1" height="1" fill="#ff6b35"/><rect x="6" y="7" width="1" height="1" fill="#ff6b35"/><rect x="7" y="7" width="1" height="1" fill="#ff6b35"/><rect x="8" y="7" width="1" height="1" fill="#ff6b35"/>
      <rect x="4" y="8" width="1" height="1" fill="#ff6b35"/><rect x="5" y="8" width="1" height="1" fill="#ffaa00"/><rect x="6" y="8" width="1" height="1" fill="#ff6b35"/><rect x="7" y="8" width="1" height="1" fill="#ff6b35"/>
      <rect x="3" y="9" width="1" height="1" fill="#ffaa00"/><rect x="4" y="9" width="1" height="1" fill="#ffaa00"/><rect x="5" y="9" width="1" height="1" fill="#ff6b35"/><rect x="6" y="9" width="1" height="1" fill="#ff6b35"/><rect x="7" y="9" width="1" height="1" fill="#ff6b35"/>
      <rect x="4" y="10" width="1" height="1" fill="#ff6b35"/><rect x="5" y="10" width="1" height="1" fill="#ff6b35"/><rect x="6" y="10" width="1" height="1" fill="#ff6b35"/><rect x="7" y="10" width="1" height="1" fill="#ff6b35"/>
      <rect x="4" y="11" width="1" height="1" fill="#ff6b35"/><rect x="5" y="11" width="1" height="1" fill="#ff6b35"/><rect x="6" y="11" width="1" height="1" fill="#ff6b35"/>
      <rect x="4" y="12" width="1" height="1" fill="#ff6b35"/><rect x="5" y="12" width="1" height="1" fill="#ff6b35"/><rect x="6" y="12" width="1" height="1" fill="#ff6b35"/>
      <rect x="4" y="13" width="1" height="1" fill="#ff6b35"/><rect x="5" y="13" width="1" height="1" fill="#ff6b35"/>
      <rect x="3" y="14" width="1" height="1" fill="#ff6b35"/><rect x="4" y="14" width="1" height="1" fill="#ff6b35"/><rect x="5" y="14" width="1" height="1" fill="#ff6b35"/>
      <rect x="3" y="15" width="1" height="1" fill="#ff6b35"/><rect x="4" y="15" width="1" height="1" fill="#ffaa00"/>
      <rect x="3" y="16" width="1" height="1" fill="#ff6b35"/><rect x="4" y="16" width="1" height="1" fill="#ff6b35"/>
      <rect x="2" y="17" width="1" height="1" fill="#ff6b35"/><rect x="3" y="17" width="1" height="1" fill="#ff6b35"/>
      <rect x="1" y="18" width="1" height="1" fill="#ffaa00"/><rect x="2" y="18" width="1" height="1" fill="#ff6b35"/><rect x="3" y="18" width="1" height="1" fill="#ff6b35"/>
      <rect x="1" y="19" width="1" height="1" fill="#ff6b35"/><rect x="2" y="19" width="1" height="1" fill="#ff6b35"/><rect x="3" y="19" width="1" height="1" fill="#ffcc00"/>
      <rect x="2" y="20" width="1" height="1" fill="#ff6b35"/><rect x="3" y="20" width="1" height="1" fill="#ff6b35"/><rect x="4" y="20" width="1" height="1" fill="#ffcc00"/>
      <rect x="3" y="21" width="1" height="1" fill="#ff6b35"/><rect x="4" y="21" width="1" height="1" fill="#ff6b35"/>
    </svg>
    <span class="nav-brand-text">Eval</span>
    <span class="nav-brand-full">Structured Criteria, Outcome &amp; Usability Testing</span>
  </a>
  <a href="index.html" class="nav-tab">Eval Reports</a>
  <a href="pain-leaderboard.html" class="nav-tab active">Leaderboard of Pain</a>
</nav>

<div class="container">
<h1>Leaderboard of Pain</h1>
<p class="subtitle">Top user pain points from the latest evaluation run per prototype. Updated automatically after each eval.</p>

<div class="stats-row">
  <div class="stat-card"><div class="stat-value">${painPoints.length}</div><div class="stat-label">Pain Points</div></div>
  <div class="stat-card"><div class="stat-value">${totalPrototypes}</div><div class="stat-label">Prototypes Analyzed</div></div>
  <div class="stat-card"><div class="stat-value">${totalConfusion}</div><div class="stat-label">Confusion Events</div></div>
  <div class="stat-card"><div class="stat-value">${lowDimensions.length}</div><div class="stat-label">Low Dimensions</div></div>
</div>

<h2>Confusion Events (ranked by cross-prototype frequency)</h2>
${painPoints.length ? `<table>
<thead><tr><th>#</th><th>Trigger</th><th>Prototypes</th><th>Affected</th><th>Personas</th></tr></thead>
<tbody>${painRows}</tbody>
</table>` : '<p class="empty-msg">No confusion events found in latest runs.</p>'}

<h2>Consistently Low Usability Dimensions</h2>
${lowDimensions.length ? `<table>
<thead><tr><th>Dimension</th><th>Avg Score</th><th>Prototypes</th><th>Affected</th></tr></thead>
<tbody>${dimRows}</tbody>
</table>` : '<p class="empty-msg">No dimensions scoring below 1.5 in latest runs.</p>'}

<footer>
  <span>Last updated: ${now} &middot; ${totalPrototypes} prototypes, latest run per prototype</span>
  <span class="footer-powered">uxd-prototype-evaluate</span>
</footer>
</div>
</body>
</html>`;
}

function main() {
  console.log('\n  Building Leaderboard of Pain\n');

  const prototypes = getLatestRunPerPrototype();
  console.log(`  Found ${prototypes.length} prototypes (latest run only, no -test dirs)\n`);

  if (!prototypes.length) {
    console.log('  No data found in .artifacts/eval/runs/');
    return;
  }

  const data = extractPainPoints(prototypes);
  console.log(`  Pain points: ${data.painPoints.length}`);
  console.log(`  Confusion events: ${data.totalConfusion}`);
  console.log(`  Low dimensions: ${data.lowDimensions.length}\n`);

  const html = renderHtml(data);
  fs.writeFileSync(OUTPUT_PATH, html, 'utf8');
  console.log(`  Written to: ${OUTPUT_PATH}`);
  console.log(`  Size: ${(Buffer.byteLength(html) / 1024).toFixed(0)} KB\n`);
}

main();
