#!/usr/bin/env node
// compute-patience-drain.js — Deterministic patience drain calculator.
// Reads persona-results.json + persona YAML files, recalculates patience_end
// using the exact rubric formula, and writes results back.
//
// Usage: node compute-patience-drain.js .artifacts/<KEY>/
//
// The formula (from evaluate-flow.md):
//   patience_end = 100 - SUM(drain per event) + SUM(recovery per success)
//   Clamped [0, 100]. Resets to 100 at the start of each task.

const { readFileSync, writeFileSync, existsSync } = require('fs');
const { join } = require('path');

const artifactsDir = process.argv[2];
if (!artifactsDir) {
  console.error('Usage: node compute-patience-drain.js .artifacts/<KEY>/');
  process.exit(1);
}

// ── Drain/recovery rates from the rubric ──────────────────────────────
const DRAIN_RATES = {
  High:   { confusion: -5,  dead_end: -10 },
  Medium: { confusion: -10, dead_end: -20 },
  Low:    { confusion: -15, dead_end: -30 }
};
const RECOVERY_RATES = { High: 10, Medium: 5, Low: 5 };

// ── Load persona patience attribute from YAML ─────────────────────────
function getPersonaPatience(personaId) {
  const yamlPaths = [
    join('.context', 'usability-testing', 'personas', `${personaId}.yaml`),
    join(process.cwd(), '.context', 'usability-testing', 'personas', `${personaId}.yaml`)
  ];
  for (const p of yamlPaths) {
    if (!existsSync(p)) continue;
    const content = readFileSync(p, 'utf8');
    // ponytail: simple regex over YAML instead of adding a yaml parser dependency
    const match = content.match(/patience:\s*(High|Medium|Low)/i);
    if (match) return match[1].charAt(0).toUpperCase() + match[1].slice(1).toLowerCase();
  }
  return 'Medium'; // safe default
}

// ── Count events from a trace array ───────────────────────────────────
function classifyEvent(step) {
  const action = (step.action || '').toLowerCase();
  const confidence = (step.confidence || '').toLowerCase();
  const thinking = (step.what_im_thinking || '').toLowerCase();

  // Dead end: explicit dead_end event, or action indicates backtrack/abandon
  if (step.event === 'dead_end' || action.includes('back') || action.includes('abandon')) {
    return 'dead_end';
  }
  // Confusion: explicit confusion event, low confidence, or thinking mentions confusion
  if (step.event === 'confusion' || confidence === 'low' ||
      confidence === 'none' || thinking.includes('confus') || thinking.includes('lost')) {
    return 'confusion';
  }
  // Success: explicit success, or high confidence completion
  if (step.event === 'success' || action.includes('complete') ||
      (confidence === 'high' && action.includes('found'))) {
    return 'success';
  }
  return null; // neutral step, no drain or recovery
}

function computePatience(trace, patienceLevel) {
  const rates = DRAIN_RATES[patienceLevel] || DRAIN_RATES.Medium;
  const recovery = RECOVERY_RATES[patienceLevel] || RECOVERY_RATES.Medium;
  let patience = 100;

  for (const step of trace) {
    const event = classifyEvent(step);
    if (event === 'confusion') patience += rates.confusion;
    else if (event === 'dead_end') patience += rates.dead_end;
    else if (event === 'success' && patience < 100) patience += recovery;
    patience = Math.max(0, Math.min(100, patience));
  }
  return patience;
}

// ── Main ──────────────────────────────────────────────────────────────
const resultsPath = join(artifactsDir, 'persona-results.json');
if (!existsSync(resultsPath)) {
  console.error(`persona-results.json not found at ${resultsPath}`);
  process.exit(1);
}

const results = JSON.parse(readFileSync(resultsPath, 'utf8'));
let corrections = 0;

for (const entry of results) {
  const personaId = entry.persona;
  if (!personaId) continue;

  const patienceLevel = getPersonaPatience(personaId);
  const trace = entry.trace || [];
  const computed = computePatience(trace, patienceLevel);

  if (entry.patience_end !== computed) {
    const was = entry.patience_end;
    entry.patience_end = computed;
    entry.patience_start = 100; // per-task reset
    corrections++;
    console.log(`${personaId} task-${entry.task_index}: patience_end ${was} → ${computed} (${patienceLevel} patience)`);
  }

  // Count events for the entry-level fields
  let confusionCount = 0;
  for (const step of trace) {
    if (classifyEvent(step) === 'confusion') confusionCount++;
  }
  entry.confusion_events = confusionCount;
}

writeFileSync(resultsPath, JSON.stringify(results, null, 2));
console.log(`Recalculated ${results.length} entries, corrected ${corrections}`);
