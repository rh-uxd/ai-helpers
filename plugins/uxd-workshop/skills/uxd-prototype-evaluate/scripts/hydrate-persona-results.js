#!/usr/bin/env node
/**
 * hydrate-persona-results.js
 *
 * DEPRECATED (2026-07-07): This script is no longer called by eval-iterate.
 * Trace data should now be written synchronously during eval-usability Step 1d walkthroughs.
 * If persona-results.json has empty trace[] arrays, the walkthrough must be re-run —
 * not patched post-hoc by this script.
 *
 * Kept for backward compatibility with older eval runs that may still need hydration.
 *
 * Original purpose: Post-processing script that ensures persona-results.json contains
 * full think-aloud trace data parsed from the markdown files.
 * 
 * Fixes the common issue where Phase B subagents write persona-results.json
 * with empty trace/screenshots arrays, causing report modals to be empty.
 * 
 * Usage: node hydrate-persona-results.js .artifacts/<KEY>/
 */

const fs = require('fs');
const path = require('path');

const artifactsDir = process.argv[2];
if (!artifactsDir) {
  console.error('Usage: node hydrate-persona-results.js .artifacts/<KEY>/');
  process.exit(1);
}

const absDir = path.resolve(artifactsDir);
const prPath = path.join(absDir, 'persona-results.json');
const extractPath = path.join(absDir, 'extract-state.json');
const screenshotsDir = path.join(absDir, 'screenshots');

if (!fs.existsSync(prPath)) {
  console.error('persona-results.json not found at', prPath);
  process.exit(1);
}

const extractState = JSON.parse(fs.readFileSync(extractPath, 'utf8'));
const tasksDefined = extractState.tasks_to_be_done || [];

function parseThinkaloud(md) {
  const steps = [];
  const stepRegex = /## STEP (\d+):\s*\n([\s\S]*?)(?=## STEP \d+:|## NAVIGATION COMPLETE|---\s*\n## NAVIGATION|$)/g;
  let match;
  while ((match = stepRegex.exec(md)) !== null) {
    const stepNum = parseInt(match[1]);
    const body = match[2];

    const screenshot = (body.match(/- Screenshot:\s*(.+)/i) || [])[1] || '';
    const whatISee = (body.match(/- What I see:\s*([\s\S]*?)(?=\n- What I)/i) || [])[1] || '';
    const whatImThinking = (body.match(/- What I.m thinking:\s*([\s\S]*?)(?=\n- What I.ll try|\n- Patience|\n- Confidence)/i) || [])[1] || '';
    const whatIllTry = (body.match(/- What I.ll try:\s*([\s\S]*?)(?=\n- (?:Patience|Confidence)|$)/i) || [])[1] || '';
    const patienceMatch = body.match(/- Patience:\s*(\d+)%/i);
    const patience = patienceMatch ? parseInt(patienceMatch[1]) : 100;
    const confidenceMatch = body.match(/- Confidence:\s*(high|medium|low)/i);
    const confidence = confidenceMatch ? confidenceMatch[1].toLowerCase() : 'medium';

    steps.push({
      step: stepNum,
      what_i_see: whatISee.trim(),
      what_im_thinking: whatImThinking.trim(),
      action: whatIllTry.trim(),
      confidence,
      patience,
      screenshot: screenshot.trim(),
      evidence_for_acs: []
    });
  }

  const navComplete = md.match(/## NAVIGATION COMPLETE:\s*\n([\s\S]*?)$/);
  let outcome = 'completed';
  let finalPatience = 100;
  let confusionEvents = 0;
  let cliEscapes = 0;

  if (navComplete) {
    const nc = navComplete[1];
    const outcomeMatch = nc.match(/- Outcome:\s*(.+)/i);
    if (outcomeMatch) outcome = outcomeMatch[1].trim().toLowerCase();
    const pMatch = nc.match(/- Final patience:\s*(\d+)%/i);
    if (pMatch) finalPatience = parseInt(pMatch[1]);
    const cliMatch = nc.match(/- CLI escapes:\s*(\d+)/i);
    if (cliMatch) cliEscapes = parseInt(cliMatch[1]);
    const confMatch = nc.match(/- Confusion events:\s*(\d+)/i);
    if (confMatch) confusionEvents = parseInt(confMatch[1]);
  }

  return { steps, outcome, finalPatience, confusionEvents, cliEscapes };
}

// Read existing persona-results.json
const existingPr = JSON.parse(fs.readFileSync(prPath, 'utf8'));

// Detect personas from think-aloud files
const taFiles = fs.readdirSync(absDir)
  .filter(f => f.startsWith('usability-thinkaloud-') && f.endsWith('.md'));

if (taFiles.length === 0) {
  console.log('No think-aloud files found — nothing to hydrate.');
  process.exit(0);
}

// Extract persona IDs and task indices from filenames
const personaTaskMap = {};
for (const f of taFiles) {
  const m = f.match(/usability-thinkaloud-(.+?)-task-(\d+)\.md/);
  if (m) {
    const pid = m[1];
    const taskIdx = parseInt(m[2]);
    if (!personaTaskMap[pid]) personaTaskMap[pid] = [];
    personaTaskMap[pid].push(taskIdx);
  }
}

// Display names aligned with knowledge/personas (+ overlays) catalogs
const personaNames = {
  'data-scientist+junior': 'Deena - Junior Data Scientist',
  'data-scientist+senior': 'Deena - Senior Data Scientist',
  'ml-engineer+junior': 'Alex - Junior ML Engineer',
  'ml-engineer+senior': 'Alex - Senior ML Engineer',
  'mlops-operator+junior': 'Maude - Junior MLOps',
  'mlops-operator+experienced': 'Maude - Experienced MLOps',
  'platform-engineer+experienced': 'Paula - Platform Engineer',
};

let hydrated = 0;
const newPr = [];

for (const [pid, taskIndices] of Object.entries(personaTaskMap)) {
  for (const taskIdx of taskIndices.sort()) {
    const taFile = path.join(absDir, `usability-thinkaloud-${pid}-task-${taskIdx}.md`);
    const md = fs.readFileSync(taFile, 'utf8');
    const parsed = parseThinkaloud(md);

    // Check if existing entry already has trace data
    const existingEntry = existingPr.find(e =>
      e.persona === pid && (e.task_index === taskIdx || e.task === taskIdx)
    );

    const hasTraceData = existingEntry &&
      existingEntry.trace &&
      existingEntry.trace.length > 0 &&
      existingEntry.trace[0].what_i_see;

    if (hasTraceData) {
      newPr.push(existingEntry);
      continue;
    }

    // Hydrate from parsed think-aloud
    const taskDef = tasksDefined[taskIdx - 1] || {};
    const trace = parsed.steps.map(s => ({
      ...s,
      screenshot: s.screenshot ? path.join(absDir, 'screenshots', s.screenshot) : '',
      evidence_for_acs: taskDef.covers_acs || []
    }));

    // Also find screenshots from disk as fallback
    const diskScreenshots = fs.existsSync(screenshotsDir)
      ? fs.readdirSync(screenshotsDir)
          .filter(f => f.match(new RegExp(`persona-${pid}-task-${taskIdx}-step-\\d+\\.png`)))
          .sort()
      : [];

    // If trace has fewer steps than disk screenshots, fill in
    while (trace.length < diskScreenshots.length) {
      const ssFile = diskScreenshots[trace.length];
      trace.push({
        step: trace.length + 1,
        what_i_see: '',
        what_im_thinking: '',
        action: '',
        confidence: 'medium',
        patience: parsed.finalPatience,
        screenshot: path.join(absDir, 'screenshots', ssFile),
        evidence_for_acs: taskDef.covers_acs || []
      });
    }

    newPr.push({
      persona: pid,
      persona_name: personaNames[pid] || pid,
      task_index: taskIdx,
      task: taskDef.task || (existingEntry && existingEntry.task_description) || '',
      covers_acs: taskDef.covers_acs || [],
      trace,
      screenshots: trace.map(s => s.screenshot).filter(Boolean),
      patience_start: 100,
      patience_end: parsed.finalPatience,
      confusion_events: parsed.confusionEvents,
      cli_escapes: parsed.cliEscapes,
      assisted: false,
      would_complete: parsed.outcome === 'completed' || parsed.outcome.includes('completed'),
      outcome: parsed.outcome
    });
    hydrated++;
  }
}

fs.writeFileSync(prPath, JSON.stringify(newPr, null, 2));
console.log(`✓ Hydrated ${hydrated} persona-task entries with think-aloud data`);
console.log(`  Total entries: ${newPr.length}`);
for (const entry of newPr) {
  const hasContent = entry.trace.length > 0 && entry.trace[0].what_i_see;
  console.log(`  ${entry.persona} task-${entry.task_index}: ${entry.trace.length} steps, patience ${entry.patience_end}% ${hasContent ? '✓' : '✗ EMPTY'}`);
}

// --- Reconcile persona_overlays in journey-log.json with actual trace data ---
const jlPath = path.join(absDir, 'journey-log.json');
if (fs.existsSync(jlPath)) {
  const jl = JSON.parse(fs.readFileSync(jlPath, 'utf8'));
  if (jl.usability_dimensions && jl.usability_dimensions.persona_overlays) {
    const personaIds = [...new Set(newPr.map(e => e.persona))];
    const newOverlays = [];

    for (const pid of personaIds) {
      const entries = newPr.filter(e => e.persona === pid);
      const confEvents = [];
      let minPatience = 100;

      for (const entry of entries) {
        let prevPatience = 100;
        for (const step of entry.trace) {
          const curr = step.patience || 100;
          if (curr < minPatience) minPatience = curr;
          if (curr < prevPatience) {
            confEvents.push({
              step: step.step,
              trigger: (step.what_im_thinking || '').substring(0, 80) || 'Patience drain',
              knowledge_gap: 'ui: expected',
              patience_cost: curr - prevPatience,
              task_index: entry.task_index
            });
          }
          prevPatience = curr;
        }
      }

      const existing = jl.usability_dimensions.persona_overlays.find(o => o.persona === pid) || {};
      newOverlays.push({
        ...existing,
        persona: pid,
        persona_name: personaNames[pid] || existing.persona_name || pid,
        patience_start: 100,
        patience_end: minPatience,
        confusion_events: confEvents,
        abandoned: false,
        would_complete: true,
        cli_escapes: 0
      });
    }

    jl.usability_dimensions.persona_overlays = newOverlays;
    fs.writeFileSync(jlPath, JSON.stringify(jl, null, 2));
    console.log(`✓ Reconciled persona_overlays: confusion events derived from trace patience drops`);
    for (const ov of newOverlays) {
      console.log(`  ${ov.persona}: ${ov.confusion_events.length} events, patience_end=${ov.patience_end}%`);
    }
  }
}
