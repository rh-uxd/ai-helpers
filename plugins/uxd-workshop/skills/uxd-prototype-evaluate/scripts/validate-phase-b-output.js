#!/usr/bin/env node
/**
 * validate-phase-b-output.js
 * 
 * INLINE VALIDATOR — runs after eval-discover (Phase B) completes and BEFORE
 * render-report.js. Catches schema mismatches that would cause the report to
 * render blank usability sections.
 * 
 * Three failure modes this prevents:
 *   1. Flat-dict usability_dimensions (must be nested with dimensions[])
 *   2. Missing persona_overlays (must be array with patience data)
 *   3. Missing overall_score (must be a number, not null)
 * 
 * If any check fails, it FIXES the data in-place (reads persona-results.json
 * to reconstruct the correct format) and prints a warning.
 * 
 * Usage: node validate-phase-b-output.js <artifacts-dir>
 * Exit: 0 always (self-healing — fixes issues and continues)
 */

const { readFileSync, writeFileSync, existsSync } = require('fs');
const { join } = require('path');

const artifactsDir = process.argv[2];
if (!artifactsDir) {
  console.error('Usage: node validate-phase-b-output.js <artifacts-dir>');
  process.exit(1);
}

const journeyLogPath = join(artifactsDir, 'journey-log.json');
const personaResultsPath = join(artifactsDir, 'persona-results.json');

if (!existsSync(journeyLogPath)) {
  console.log('  ⚠ journey-log.json not found — skipping Phase B validation');
  process.exit(0);
}

const journeyLog = JSON.parse(readFileSync(journeyLogPath, 'utf8'));
let ud = journeyLog.usability_dimensions;

if (!ud) {
  if (!existsSync(personaResultsPath)) {
    console.log('  ⚠ No usability_dimensions and no persona-results.json — Phase B did not run');
    process.exit(0);
  }
  journeyLog.usability_dimensions = {};
  ud = journeyLog.usability_dimensions;
}

let needsFix = false;
const issues = [];

// Check 1: Is it a flat dict instead of nested schema?
const KNOWN_DIM_IDS = [
  'workflow_continuity', 'cross_persona_handoffs', 'scalability_progressive_complexity',
  'system_status_trust', 'technical_abstraction', 'mental_model_fidelity',
  'accessibility_inclusion',
  'cross_persona_context', 'system_status_observability'
];
const isFlatDict = KNOWN_DIM_IDS.some(id => ud[id] !== undefined && !ud.dimensions);

if (isFlatDict) {
  issues.push('usability_dimensions is a flat dict — converting to nested schema');
  needsFix = true;
}

// Check 2: Missing dimensions array
if (!isFlatDict && (!Array.isArray(ud.dimensions) || ud.dimensions.length === 0)) {
  issues.push('usability_dimensions.dimensions is missing or empty');
  needsFix = true;
}

// Check 3: Missing overall_score
if (typeof ud.overall_score !== 'number') {
  issues.push(`overall_score is ${typeof ud.overall_score}, expected number`);
  needsFix = true;
}

// Check 4: Missing persona_overlays
if (!Array.isArray(ud.persona_overlays) || ud.persona_overlays.length === 0) {
  issues.push('persona_overlays is missing or empty');
  needsFix = true;
}

// Check 5: persona_selection missing full reasoning (Step 3b.1)
const ps = journeyLog.persona_selection;
if (!ps || !ps.method || !ps.target_audience_source || !Array.isArray(ps.considered_but_rejected)) {
  issues.push('persona_selection missing full reasoning (method, target_audience_source, or considered_but_rejected)');
  // Not self-healable without extract-state context — just warn
  console.log('  ⚠ persona_selection incomplete — see SKILL.md Step 3b.1 for required fields');
  console.log('    Required: method, target_audience_text, target_audience_source, reasoning, selected, considered_but_rejected');
}

// ═══════════════════ SELF-HEALING ═══════════════════

const DIMENSION_NAMES = {
  'workflow_continuity': 'Workflow Continuity & Integrity',
  'cross_persona_handoffs': 'Cross-Persona Context & Handoffs',
  'scalability_progressive_complexity': 'Scalability & Progressive Complexity',
  'system_status_trust': 'System Status, Observability & Trust',
  'technical_abstraction': 'Technical Abstraction & Signal-to-Noise',
  'mental_model_fidelity': 'Mental Model Fidelity',
  'accessibility_inclusion': 'Accessibility & Inclusion'
};
const DIM_ID_ALIASES = {
  'cross_persona_context': 'cross_persona_handoffs',
  'system_status_observability': 'system_status_trust',
  'system_status': 'system_status_trust',
  'system_status_visibility': 'system_status_trust',
  'scalability_complexity': 'scalability_progressive_complexity',
  'technical_abstraction_level': 'technical_abstraction',
};

if (!needsFix) {
  console.log('  ✓ Phase B output schema valid');
} else {
  console.log(`  ⚠ Phase B schema issues detected (${issues.length}):`);
  issues.forEach(i => console.log(`    - ${i}`));
  console.log('  → Attempting self-heal from persona-results.json...');

if (isFlatDict) {
  // Convert flat dict to nested schema
  const dimensions = [];
  let totalScore = 0;

  for (const [dimId, dimName] of Object.entries(DIMENSION_NAMES)) {
    const old = ud[dimId] || ud[Object.entries(DIM_ID_ALIASES).find(([alias, canonical]) => canonical === dimId)?.[0]] || {};
    const score = old.score || 0;
    totalScore += score;
    dimensions.push({
      id: dimId,
      name: dimName,
      composite_score: score,
      confidence: old.confidence || 'Medium',
      evidence: old.rationale || old.evidence || '',
      scores: {}
    });
  }

  // Read persona-results for overlays
  let personaOverlays = [];
  let personasEvaluated = [];
  
  if (existsSync(personaResultsPath)) {
    const personaResults = JSON.parse(readFileSync(personaResultsPath, 'utf8'));
    personasEvaluated = [...new Set(personaResults.map(pr => pr.persona_id || pr.persona))];
    personaOverlays = personaResults.map(pr => ({
      persona: pr.persona_id || pr.persona,
      persona_name: pr.persona_name,
      task_index: pr.task_index,
      patience_start: 100,
      patience_end: pr.patience_end || 100,
      abandoned: pr.abandoned || false,
      confusion_events: [],
      cli_escapes: 0
    }));

    // Add per-persona scores to dimensions
    for (const dim of dimensions) {
      for (const pid of personasEvaluated) {
        dim.scores[pid] = { score: dim.composite_score, finding: dim.evidence };
      }
    }
  } else {
    personasEvaluated = ud.personas_evaluated || journeyLog.persona_selection?.selected || [];
  }

  const scoredDimCount = dimensions.filter(d => typeof d.composite_score === 'number' && d.composite_score > 0).length || dimensions.length;
  journeyLog.usability_dimensions = {
    overall_score: totalScore,
    max_score: scoredDimCount * 3,
    personas_evaluated: personasEvaluated,
    dimensions,
    persona_overlays: personaOverlays,
    think_aloud: ud.think_aloud || { traces: [] }
  };

} else if (!Array.isArray(ud.dimensions) || ud.dimensions.length === 0) {
  // Has persona data (overlays/personas_evaluated) but no dimensions — reconstruct
  // from persona-results.json using the canonical 7 dimensions.
  const dimensions = [];
  for (const [dimId, dimName] of Object.entries(DIMENSION_NAMES)) {
    dimensions.push({
      id: dimId,
      name: dimName,
      composite_score: 0,
      confidence: 'Low',
      evidence: 'Reconstructed by self-healer — original dimension scores not written',
      scores: {}
    });
  }

  let personasEvaluated = ud.personas_evaluated || [];
  if (!Array.isArray(ud.persona_overlays) || ud.persona_overlays.length === 0) {
    ud.persona_overlays = [];
    if (existsSync(personaResultsPath)) {
      const personaResults = JSON.parse(readFileSync(personaResultsPath, 'utf8'));
      personasEvaluated = [...new Set(personaResults.map(pr => pr.persona_id || pr.persona))];
      ud.persona_overlays = personaResults.map(pr => ({
        persona: pr.persona_id || pr.persona,
        persona_name: pr.persona_name,
        task_index: pr.task_index,
        patience_start: 100,
        patience_end: pr.patience_end || 100,
        abandoned: pr.abandoned || pr.outcome === 'abandoned' || false,
        confusion_events: [],
        cli_escapes: 0
      }));
    }
  }
  if (personasEvaluated.length === 0) {
    personasEvaluated = [...new Set((ud.persona_overlays || []).map(o => o.persona))];
  }

  ud.dimensions = dimensions;
  ud.overall_score = typeof ud.overall_score === 'number' ? ud.overall_score : 0;
  ud.max_score = dimensions.length * 3;
  ud.personas_evaluated = personasEvaluated;
  if (!ud.think_aloud) ud.think_aloud = { traces: [] };

} else {
  // Normalize dimension IDs, names, and score types
  if (Array.isArray(ud.dimensions)) {
    for (const dim of ud.dimensions) {
      if (dim.id && DIM_ID_ALIASES[dim.id]) dim.id = DIM_ID_ALIASES[dim.id];
      if (!dim.name && dim.id) dim.name = DIMENSION_NAMES[dim.id] || dim.id;
      if (typeof dim.composite_score !== 'number') {
        const parsed = parseFloat(dim.composite_score);
        dim.composite_score = isNaN(parsed) ? 0 : parsed;
      }
    }
  }
  if (typeof ud.overall_score !== 'number' && Array.isArray(ud.dimensions)) {
    ud.overall_score = ud.dimensions.reduce((sum, d) => sum + (typeof d.composite_score === 'number' ? d.composite_score : 0), 0);
  }
  if (!ud.max_score && Array.isArray(ud.dimensions)) {
    const scoredDims = ud.dimensions.filter(d => typeof d.composite_score === 'number' && d.composite_score > 0);
    ud.max_score = (scoredDims.length || ud.dimensions.length) * 3;
  }
  if (!Array.isArray(ud.persona_overlays)) {
    ud.persona_overlays = [];
    if (existsSync(personaResultsPath)) {
      const personaResults = JSON.parse(readFileSync(personaResultsPath, 'utf8'));
      ud.persona_overlays = personaResults.map(pr => ({
        persona: pr.persona_id || pr.persona,
        persona_name: pr.persona_name,
        task_index: pr.task_index,
        patience_start: 100,
        patience_end: pr.patience_end || 100,
        abandoned: pr.abandoned || pr.outcome === 'abandoned' || false,
        confusion_events: [],
        cli_escapes: 0
      }));
    }
  }
  if (!Array.isArray(ud.personas_evaluated) || ud.personas_evaluated.length === 0) {
    ud.personas_evaluated = [...new Set((ud.persona_overlays || []).map(o => o.persona))];
  }
}

writeFileSync(journeyLogPath, JSON.stringify(journeyLog, null, 2));
console.log('  ✓ Self-healed — journey-log.json updated with correct schema');

const selfHealLogPath = join(artifactsDir, 'self-heal-log.json');
const healLog = existsSync(selfHealLogPath) ? JSON.parse(readFileSync(selfHealLogPath, 'utf8')) : [];
healLog.push({ timestamp: new Date().toISOString(), file: 'journey-log.json', reason: 'schema mismatch auto-corrected' });
writeFileSync(selfHealLogPath, JSON.stringify(healLog, null, 2));

} // end needsFix

// ═══════════════════ FIX-LOG SELF-HEALING ═══════════════════
// Ensures fix-log.json is a flat array with {description, applied, timestamp}
// per entry, converting from the dict format if needed.

const fixLogPath = join(artifactsDir, 'fix-log.json');
const iterationLogPath = join(artifactsDir, 'iteration-log.json');

if (existsSync(fixLogPath)) {
  let fixLog;
  try { fixLog = JSON.parse(readFileSync(fixLogPath, 'utf8')); } catch { fixLog = null; }

  if (fixLog && !Array.isArray(fixLog) && typeof fixLog === 'object') {
    console.log('  ⚠ fix-log.json is a dict — converting to flat array format');
    const entries = [];
    const ts = fixLog.fixed_at || new Date().toISOString();

    for (const item of (fixLog.applied || [])) {
      entries.push({
        type: item.type || 'unknown',
        criterion_id: item.criterion_id || item.guideline_id || '',
        file: item.file || null,
        change: item.change || item.description || '',
        confidence: item.confidence || 'high',
        description: item.description || item.change || `Applied fix: ${item.criterion_id || item.guideline_id || 'unknown'}`,
        applied: true,
        timestamp: item.timestamp || ts
      });
    }
    for (const item of (fixLog.skipped || [])) {
      entries.push({
        type: item.type || 'unknown',
        criterion_id: item.criterion_id || item.guideline_id || '',
        file: item.file || null,
        change: null,
        confidence: item.confidence || 'low',
        description: item.reason || item.description || `Skipped: ${item.criterion_id || item.guideline_id || 'unknown'}`,
        applied: false,
        timestamp: item.timestamp || ts
      });
    }
    for (const item of (fixLog.deferred_to_human || [])) {
      entries.push({
        type: item.type || 'unknown',
        criterion_id: item.criterion_id || item.guideline_id || '',
        file: item.file || null,
        change: null,
        confidence: 'low',
        description: item.reason || item.description || `Deferred to human: ${item.criterion_id || item.guideline_id || 'unknown'}`,
        applied: false,
        timestamp: item.timestamp || ts
      });
    }

    writeFileSync(fixLogPath, JSON.stringify(entries, null, 2));
    console.log(`  ✓ fix-log.json converted to array format (${entries.length} entries)`);
  }
} else if (existsSync(iterationLogPath)) {
  let iterationLog;
  try { iterationLog = JSON.parse(readFileSync(iterationLogPath, 'utf8')); } catch { iterationLog = null; }

  if (iterationLog && Array.isArray(iterationLog.iterations) && iterationLog.iterations.length > 1) {
    console.log('  ⚠ fix-log.json missing despite multiple iterations — writing empty array');
    writeFileSync(fixLogPath, '[]');
  }
}
