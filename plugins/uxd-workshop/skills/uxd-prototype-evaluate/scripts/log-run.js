#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const artifactsDir = process.argv[2];
if (!artifactsDir) {
  console.error('Usage: node ${CLAUDE_SKILL_DIR}/scripts/log-run.js <artifacts-dir> [--note="description"]');
  console.error('  e.g. node log-run.js .artifacts/PROJ-298/eval/');
  process.exit(1);
}

const noteArg = process.argv.find(a => a.startsWith('--note='));
const note = noteArg ? noteArg.slice(7).replace(/"/g, '') : '';

const {
  resolveProjectRoot,
  resolveEvalGlobalDir,
  resolveKeyFromArtifactsDir,
} = require('./resolve-root');

const absArtifacts = path.resolve(artifactsDir);
const projectRoot = resolveProjectRoot();
const globalEvalDir = resolveEvalGlobalDir();
const globalRunsDir = path.join(globalEvalDir, 'runs');
const logPath = path.join(globalRunsDir, 'run-log.csv');
const localRunsDir = path.join(absArtifacts, 'runs');

function readJsonOr(filePath, fallback) {
  try { return JSON.parse(fs.readFileSync(filePath, 'utf8')); } catch { return fallback; }
}

function readFileOr(filePath, fallback) {
  try { return fs.readFileSync(filePath, 'utf8'); } catch { return fallback; }
}

function parseCsvRows(raw) {
  if (!raw) return [];
  const lines = raw.trim().split('\n');
  return lines.slice(1);
}

function getGitVersion() {
  try {
    const hash = execSync('git log -1 --format=%h', { cwd: projectRoot, encoding: 'utf8' }).trim();
    const msg = execSync('git log -1 --format=%s', { cwd: projectRoot, encoding: 'utf8' }).trim();
    return { hash, msg: msg.substring(0, 60) };
  } catch {
    return { hash: 'unknown', msg: '' };
  }
}

function archiveRunFiles(archiveDir, filesToArchive) {
  fs.mkdirSync(archiveDir, { recursive: true });
  for (const f of filesToArchive) {
    const src = path.join(absArtifacts, f);
    if (fs.existsSync(src)) {
      fs.copyFileSync(src, path.join(archiveDir, f));
    }
  }
}

function main() {
  const protoId = resolveKeyFromArtifactsDir(absArtifacts);
  const now = new Date();
  const runId = now.toISOString().replace(/[:.]/g, '').substring(0, 15);
  const timestamp = now.toISOString();

  const csvRaw = readFileOr(path.join(absArtifacts, 'evaluation-report.csv'), '');
  const journeyLog = readJsonOr(path.join(absArtifacts, 'journey-log.json'), null);
  const mrDelta = readJsonOr(path.join(absArtifacts, 'mr-delta.json'), null);

  const csvLines = parseCsvRows(csvRaw);
  let passCount = 0, failCount = 0, flaggedCount = 0;
  for (const line of csvLines) {
    if (line.includes(',PASS,')) passCount++;
    else if (line.includes(',FAIL,')) failCount++;
    else if (line.includes(',FLAGGED,')) flaggedCount++;
  }
  const total = passCount + failCount + flaggedCount;

  const journeys = journeyLog ? journeyLog.journeys || [] : [];
  const journeysPass = journeys.filter(j => j.verdict === 'PASS').length;
  const journeysTotal = journeys.length;

  const ud = journeyLog ? journeyLog.usability_dimensions : null;
  const usabilityScore = ud ? (ud.overall_score || '—') : '—';
  const personas = ud ? (ud.personas_evaluated || []).join(';') : '';

  const depth = journeyLog ? (journeyLog.depth || 'quick') : 'quick';

  let navFailures = 0;
  for (const j of journeys) {
    for (const s of (j.steps || [])) {
      if (s.url_fallback) navFailures++;
    }
  }

  const git = getGitVersion();
  const mrAvailable = mrDelta ? 'true' : 'false';
  const usabilityFlag = ud && ud.think_aloud ? 'deep' : (ud ? 'inference' : 'off');

  const headers = 'run_id,timestamp,prototype_id,skill_version,commit,depth,usability_flag,pass,fail,flagged,total,journeys_pass,journeys_total,usability_score,nav_failures,mr_delta_available,personas,notes';

  const escapeCsv = (s) => {
    const str = String(s);
    if (str.includes(',') || str.includes('"') || str.includes('\n')) {
      return '"' + str.replace(/"/g, '""') + '"';
    }
    return str;
  };

  const row = [
    runId, timestamp, protoId, git.hash, escapeCsv(git.msg), depth,
    usabilityFlag, passCount, failCount, flaggedCount, total,
    journeysPass, journeysTotal, usabilityScore, navFailures,
    mrAvailable, escapeCsv(personas), escapeCsv(note)
  ].join(',');

  // Ensure global runs directory exists
  fs.mkdirSync(globalRunsDir, { recursive: true });

  // Append to run log (create with headers if new)
  if (!fs.existsSync(logPath)) {
    fs.writeFileSync(logPath, headers + '\n', 'utf8');
  }
  fs.appendFileSync(logPath, row + '\n', 'utf8');

  const filesToArchive = [
    'evaluation-report.csv',
    'journey-log.json',
    'mr-delta.json',
    'evaluation-report.html',
    'evaluation-report.md'
  ];

  // Archive under per-key eval/ and global .artifacts/eval/runs/
  const localArchiveDir = path.join(localRunsDir, runId);
  const globalArchiveDir = path.join(globalRunsDir, protoId, runId);
  archiveRunFiles(localArchiveDir, filesToArchive);
  archiveRunFiles(globalArchiveDir, filesToArchive);

  console.log(`Run logged: ${runId}`);
  console.log(`  Prototype: ${protoId}`);
  console.log(`  Version:   ${git.hash} (${git.msg})`);
  console.log(`  Results:   ${passCount} PASS, ${failCount} FAIL, ${flaggedCount} FLAGGED (${total} total)`);
  console.log(`  Journeys:  ${journeysPass}/${journeysTotal}`);
  console.log(`  Usability: ${usabilityScore}`);
  console.log(`  Nav fails: ${navFailures}`);
  console.log(`  MR delta:  ${mrAvailable}`);
  if (note) console.log(`  Note:      ${note}`);
  console.log(`  Archived:  ${localArchiveDir}`);
  console.log(`  Global:    ${globalArchiveDir}`);
  console.log(`  Log:       ${logPath}`);

  // Publish report to GitLab Pages (or reports branch)
  const publishScript = path.join(__dirname, 'publish-report.sh');
  if (fs.existsSync(publishScript) && fs.existsSync(path.join(absArtifacts, 'evaluation-report.html'))) {
    try {
      console.log(`\n  Publishing report...`);
      const reportUrl = execSync(`bash "${publishScript}" "${absArtifacts}"`, {
        cwd: projectRoot, encoding: 'utf8', timeout: 60000
      }).trim().split('\n').pop();
      console.log(`  Report URL: ${reportUrl}`);
    } catch (e) {
      const msg = (e.stderr || e.message || '').toString().trim();
      if (msg.includes('Authentication') || msg.includes('could not read') || msg.includes('fatal:')) {
        console.log(`  ⚠ Report publish FAILED — GitLab auth not configured.`);
        console.log(`    Fix: ensure git credentials for your Pages/report host are configured (SSH key or HTTPS token).`);
        console.log(`    Config: ${CLAUDE_SKILL_DIR}/config/publish.yaml → gitlab_pages_repo`);
      } else {
        console.log(`  ⚠ Report publish failed: ${msg || 'unknown error'}`);
      }
    }
  }

  // Auto-sync to Google Sheet if auth is available
  const syncScript = path.join(__dirname, 'sync-sheet.js');
  if (fs.existsSync(syncScript)) {
    try {
      console.log(`\n  Syncing to Google Sheet...`);
      execSync(`node "${syncScript}"`, { cwd: projectRoot, stdio: 'inherit', timeout: 30000 });
    } catch (e) {
      console.log(`  Sheet sync skipped (auth not configured or failed)`);
    }
  }
}

main();
