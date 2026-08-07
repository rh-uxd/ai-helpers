#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');

const artifactsDir = process.argv[2];
const iterationArg = process.argv[3];
const phaseArg = process.argv[4] || 'a';

if (!artifactsDir || !iterationArg) {
  console.error('Usage: node append-iteration-log.js <artifacts-dir> <iteration> [phase]');
  console.error('  phase: "a" (AC validation) or "b" (usability)');
  console.error('  e.g. node append-iteration-log.js .artifacts/PROJ-298/eval/ 1 a');
  process.exit(1);
}

const { resolveKeyFromArtifactsDir } = require('./resolve-root');
const absArtifacts = path.resolve(artifactsDir);
const iteration = parseInt(iterationArg, 10);
const phase = phaseArg.toLowerCase();

function readJsonOr(filePath, fallback) {
  try { return JSON.parse(fs.readFileSync(filePath, 'utf8')); } catch { return fallback; }
}

function readFileOr(filePath, fallback) {
  try { return fs.readFileSync(filePath, 'utf8'); } catch { return fallback; }
}

function parseVerdicts(csvContent) {
  const lines = csvContent.split('\n').filter(l => l.trim() && !l.startsWith('#') && !l.startsWith('criterion_id') && !l.startsWith('dimension_id'));
  const verdicts = {};
  let pass = 0, fail = 0, flagged = 0;

  for (const line of lines) {
    const match = line.match(/^([A-Z]+-\d+),([^,]*),([^,]*),("(?:[^"]|"")*"|[^,]*),(PASS|FAIL|FLAGGED)(?:\s*\(.*?\))?/i);
    if (match) {
      const [, acId, , tier, , rawVerdict] = match;
      const v = rawVerdict.toUpperCase();
      verdicts[acId] = { verdict: v, tier };
      if (v === 'PASS') pass++;
      else if (v === 'FAIL') fail++;
      else if (v === 'FLAGGED') flagged++;
    }
  }
  return { verdicts, pass, fail, flagged, total: pass + fail + flagged };
}

function buildPhaseAEntry() {
  const csvPath = path.join(absArtifacts, 'evaluation-report.csv');
  const csvContent = readFileOr(csvPath, '');
  const { verdicts, pass, fail, flagged, total } = parseVerdicts(csvContent);

  const journeyLog = readJsonOr(path.join(absArtifacts, 'journey-log.json'), null);
  const fixLog = readJsonOr(path.join(absArtifacts, 'fix-log.json'), null);
  const suggestions = readJsonOr(path.join(absArtifacts, 'refinement-suggestions.json'), []);
  const consistencyReport = readJsonOr(path.join(absArtifacts, 'consistency-report.json'), null);

  const entry = {
    iteration,
    phase: 'a',
    timestamp: new Date().toISOString(),
    pass_count: pass,
    fail_count: fail,
    flagged_count: flagged,
    total_criteria: total,
    suggestions_generated: suggestions.length,
    consistency_fixes: suggestions.filter(s => s.type === 'consistency').length,
    details: verdicts
  };

  if (journeyLog && journeyLog.journeys) {
    entry.journey_coverage = {};
    for (const j of journeyLog.journeys) {
      for (const acId of (j.ac_ids || [])) {
        entry.journey_coverage[acId] = {
          journey_id: j.id,
          journey_title: j.title,
          verdict: j.verdict,
          steps_completed: j.steps_completed || (j.steps || []).length
        };
      }
    }

    // Flag discrepancies between journey verdicts and CSV verdicts
    const discrepancies = [];
    for (const [acId, coverage] of Object.entries(entry.journey_coverage)) {
      const csvVerdict = entry.details[acId]?.verdict;
      const journeyVerdict = coverage.verdict;
      if (journeyVerdict === 'FAIL' && csvVerdict === 'PASS') {
        discrepancies.push({ ac: acId, csv: 'PASS', journey: 'FAIL', issue: 'CSV PASS overrides journey FAIL' });
      }
    }
    if (discrepancies.length) {
      entry.verdict_discrepancies = discrepancies;
      console.warn(`  ⚠ VERDICT DISCREPANCY: ${discrepancies.length} ACs have PASS in CSV but FAIL in journey:`);
      for (const d of discrepancies) {
        console.warn(`    ${d.ac}: CSV=${d.csv}, Journey=${d.journey}`);
      }
    }
  }

  if (fixLog && fixLog.applied && fixLog.applied.length) {
    entry.changes_applied = fixLog.applied.map(fix => ({
      criterion: fix.criterion_id || fix.guideline_id || '',
      type: fix.type || 'unknown',
      file: fix.file || '',
      change: fix.change || fix.description || ''
    }));
    entry.files_modified = [...new Set(fixLog.applied.map(f => f.file).filter(Boolean))];
  }

  if (fixLog && fixLog.skipped && fixLog.skipped.length) {
    entry.flagged_resolution = {};
    for (const s of fixLog.skipped) {
      const id = s.criterion_id || s.guideline_id || 'unknown';
      entry.flagged_resolution[id] = s.reason || 'Out of prototype scope';
    }
  }

  if (fail > 0 && entry.changes_applied) {
    const failedAcs = Object.entries(verdicts)
      .filter(([, v]) => v.verdict === 'FAIL')
      .map(([id]) => id);
    entry.root_cause = `${fail} criteria failed: ${failedAcs.join(', ')}`;
  }

  if (consistencyReport && consistencyReport.summary) {
    entry.consistency_summary = {
      violations: consistencyReport.summary.violations || 0,
      warnings: consistencyReport.summary.warnings || 0,
      passes: consistencyReport.summary.passes || 0
    };
  }

  return entry;
}

function buildPhaseBEntry() {
  const journeyLog = readJsonOr(path.join(absArtifacts, 'journey-log.json'), null);
  if (!journeyLog || !journeyLog.usability_dimensions) {
    console.error('  No usability_dimensions in journey-log.json — cannot append Phase B');
    process.exit(1);
  }

  const ud = journeyLog.usability_dimensions;
  const entry = {
    phase: 'b',
    timestamp: new Date().toISOString(),
    usability_score: ud.overall_score || '',
    personas_evaluated: ud.personas_evaluated || []
  };

  if (ud.dimensions) {
    entry.dimension_scores = {};
    for (const dim of ud.dimensions) {
      entry.dimension_scores[dim.id] = dim.composite_score;
    }
  }

  if (ud.persona_overlays) {
    entry.persona_summary = ud.persona_overlays.map(o => ({
      persona: o.persona,
      patience_end: o.patience_end,
      confusion_events: (o.confusion_events || []).length,
      abandoned: o.abandoned || false
    }));
  }

  return entry;
}

// Read or initialize the iteration log
const logPath = path.join(absArtifacts, 'iteration-log.json');
const log = readJsonOr(logPath, null) || {
  key: resolveKeyFromArtifactsDir(absArtifacts),
  max_iterations: parseInt(process.env.MAX_ITERATIONS || '3', 10),
  iterations: [],
  exit_reason: 'pending',
  total_criteria_fixed: 0,
  total_regressions: 0
};

if (phase === 'a') {
  const entry = buildPhaseAEntry();
  log.iterations.push(entry);

  if (log.iterations.length > 1) {
    const first = log.iterations[0];
    log.total_criteria_fixed = entry.pass_count - first.pass_count;
    if (entry.pass_count < first.pass_count) {
      log.total_regressions = first.pass_count - entry.pass_count;
    }
  }

  // Do NOT set exit_reason here — orchestrator/eval_state.py owns that decision.
  // The script only computes counts; the orchestrator decides flagged_unfixable vs all_pass.

  if (entry.files_modified && entry.files_modified.length) {
    log.files_modified = [...new Set([
      ...(log.files_modified || []),
      ...entry.files_modified
    ])];
  }

  console.log(`  Phase A iter ${iteration}: ${entry.pass_count}P / ${entry.fail_count}F / ${entry.flagged_count}FL`);
  if (entry.changes_applied) console.log(`  Applied ${entry.changes_applied.length} fixes`);

} else if (phase === 'b') {
  const entry = buildPhaseBEntry();
  log.phase_b = entry;
  console.log(`  Phase B: ${entry.usability_score} (${entry.personas_evaluated.join(', ')})`);

} else if (phase === 'fix') {
  const fixLog = readJsonOr(path.join(absArtifacts, 'fix-log.json'), null);
  if (!fixLog) {
    console.log('  No fix-log.json found — skipping fix phase append');
  } else {
    const applied = Array.isArray(fixLog) ? fixLog : fixLog.applied || [];
    const skipped = fixLog.skipped || [];

    if (log.iterations.length === 0) {
      console.error('  No iterations in log — cannot append fix data');
      process.exit(1);
    }

    const lastEntry = log.iterations[log.iterations.length - 1];
    lastEntry.changes_applied = applied.map(fix => ({
      criterion: fix.criterion_id || fix.guideline_id || '',
      type: fix.type || 'unknown',
      file: fix.file || '',
      change: fix.change || fix.description || ''
    }));

    lastEntry.files_modified = [...new Set(applied.map(f => f.file).filter(Boolean))];

    if (skipped.length) {
      lastEntry.flagged_resolution = {};
      for (const s of skipped) {
        const id = s.criterion_id || s.guideline_id || 'unknown';
        lastEntry.flagged_resolution[id] = s.reason || 'Out of prototype scope';
      }
    }

    log.files_modified = [...new Set([
      ...(log.files_modified || []),
      ...lastEntry.files_modified
    ])];

    console.log(`  Fix phase: ${applied.length} applied, ${skipped.length} skipped`);
    if (lastEntry.files_modified.length) {
      console.log(`  Files modified: ${lastEntry.files_modified.join(', ')}`);
    }
  }

} else {
  console.error(`  Unknown phase: ${phase}. Use "a", "b", or "fix".`);
  process.exit(1);
}

fs.writeFileSync(logPath, JSON.stringify(log, null, 2));
console.log(`  → ${logPath} updated`);
